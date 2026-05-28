import interviewEngine from '../ai/interview.engine.js';
import interviewSessionService from '../services/interview-session.service.js';
import timerService from '../services/timer.service.js';
import realtimeService from '../services/realtime.service.js';
import liveInterviewService from '../services/live-interview.service.js';
import { verifyJoinToken } from '../services/live-interview-session.service.js';
import { SessionExpiredError } from '../utils/interview-errors.js';
import handleControllerError from '../utils/controller-error.js';
import { acquireLock, releaseLock } from '../utils/processing-lock.js';
import { normalizeInterviewSession } from '../models/InterviewSession.js';
import logger from '../config/logger.js';

const logControllerError = (scope, error, extras = {}) => {
  const details = {
    scope,
    name: error.name,
    message: error.message,
    details: error.details,
    ...extras,
  };

  console.error(`[InterviewController] ${scope}:`, details);
};

const startSession = async (req, res, next) => {
  const lockKey = String(req.user._id);
  logger.info({
    tag: 'INTERVIEW_START_REQUEST',
    message: 'POST /api/interviews/start request received',
    userId: req.user._id,
    body: req.body
  });

  if (!acquireLock(lockKey, 'start-interview')) {
    logger.warn({
      tag: 'INTERVIEW_START_LOCK_BLOCKED',
      message: 'Blocked double interview start attempt',
      userId: req.user._id
    });
    return res.status(409).json({
      success: false,
      message: 'An interview session initialization is already in progress.',
    });
  }

  try {
    logger.info({
      tag: 'INTERVIEW_START_CONTROLLER',
      message: 'Acquired startup lock; commencing session database creation...',
      userId: req.user._id
    });

    const session = await interviewSessionService.createSession(req.user._id, req.body);
    logger.info({
      tag: 'INTERVIEW_START_SESSION_CREATED',
      message: 'Session record successfully created in MongoDB',
      sessionId: session._id,
      userId: req.user._id
    });

    logger.info({
      tag: 'INTERVIEW_START_AI_GENERATION',
      message: 'Requesting Groq LLM engine to synthesize the initial question...',
      sessionId: session._id
    });
    const initialAiResponse = await interviewEngine.startInterview(session._id);
    logger.info({
      tag: 'INTERVIEW_START_AI_COMPLETED',
      message: 'Initial AI question successfully generated',
      sessionId: session._id,
      question: initialAiResponse.question
    });

    const freshSession = await interviewSessionService.getOwnedSession(session._id, req.user._id);

    const payload = interviewSessionService.buildRecoveryPayload(freshSession);
    logger.info({
      tag: 'INTERVIEW_START_SOCKET_JOIN',
      message: 'Emitting initial state payload via realtime Socket.IO channel...',
      sessionId: session._id
    });
    realtimeService.emitToSession(freshSession._id, 'interview:state', payload);

    logger.info({
      tag: 'INTERVIEW_START_RESPONSE_COMPLETED',
      message: 'Realtime session initialization complete. Returning payload.',
      sessionId: session._id
    });

    res.status(201).json({
      ...payload,
      firstQuestion: initialAiResponse.question,
      fallback: Boolean(initialAiResponse.fallback),
    });
  } catch (error) {
    logger.error({
      tag: 'INTERVIEW_START_CRITICAL_FAILURE',
      message: 'Realtime interview start failed in request pipeline',
      error: error.message,
      stack: error.stack
    });
    logControllerError('startSession', error);
    return handleControllerError('interview.controller.startSession', res, next, error);
  } finally {
    releaseLock(lockKey);
  }
};

const getActiveSession = async (req, res, next) => {
  try {
    const session = await interviewSessionService.getActiveSessionForUser(req.user._id);
    if (!session) {
      return res.status(200).json({ session: null, recoverable: false });
    }

    // Auto-repair malformed fields on load
    normalizeInterviewSession(session);
    if (session.isModified()) {
      await session.save();
    }

    if (timerService.hasExpired(session) && !session.reportGeneratedAt) {
      await interviewSessionService.endInterview(session, { autoEnded: true });
      const finalized = await interviewSessionService.getOwnedSession(session._id, req.user._id);
      return res.status(200).json(interviewSessionService.buildRecoveryPayload(finalized));
    }

    return res.status(200).json(interviewSessionService.buildRecoveryPayload(session));
  } catch (error) {
    logControllerError('getActiveSession', error, { userId: req.user._id });
    return handleControllerError('interview.controller.getActiveSession', res, next, error);
  }
};

const getSessionStatus = async (req, res, next) => {
  try {
    const session = await interviewSessionService.getOwnedSession(req.params.sessionId, req.user._id);

    if (timerService.hasExpired(session) && !session.reportGeneratedAt) {
      await interviewSessionService.endInterview(session, { autoEnded: true });
    }

    const refreshed = await interviewSessionService.getOwnedSession(req.params.sessionId, req.user._id);
    res.status(200).json({
      ...interviewSessionService.buildRecoveryPayload(refreshed),
      reportReady: Boolean(refreshed.reportGeneratedAt),
    });
  } catch (error) {
    logControllerError('getSessionStatus', error, { sessionId: req.params.sessionId });
    return handleControllerError('interview.controller.getSessionStatus', res, next, error);
  }
};

const autosaveSession = async (req, res, next) => {
  try {
    const session = await interviewSessionService.persistDraft(req.params.sessionId, req.user._id, req.body);
    res.status(200).json({
      session: interviewSessionService.buildSessionSnapshot(session),
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    logControllerError('autosaveSession', error, { sessionId: req.params.sessionId });
    return handleControllerError('interview.controller.autosaveSession', res, next, error);
  }
};

const recoverSession = async (req, res, next) => {
  try {
    const session = await interviewSessionService.markRecovered(req.params.sessionId, {
      socketId: req.body.socketId,
      userId: req.user._id,
      tabId: req.body.tabId,
    });

    const payload = interviewSessionService.buildRecoveryPayload(session);
    realtimeService.emitToSession(session._id, 'interview:recovered', payload);
    res.status(200).json(payload);
  } catch (error) {
    logControllerError('recoverSession', error, { sessionId: req.params.sessionId });
    return handleControllerError('interview.controller.recoverSession', res, next, error);
  }
};

const respondToQuestion = async (req, res, next) => {
  const { sessionId } = req.params;
  if (!acquireLock(sessionId, 'text-respond')) {
    return res.status(409).json({
      success: false,
      message: 'AI is already processing a response for this session.',
    });
  }

  try {
    const session = await interviewSessionService.getOwnedSession(sessionId, req.user._id);

    try {
      await timerService.assertSessionWritable(session);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        const finalized = await interviewSessionService.endInterview(session, { autoEnded: true });
        return res.status(410).json({
          code: 410,
          message: 'Interview time is over. Assessment generated automatically.',
          session: interviewSessionService.buildSessionSnapshot(finalized),
          reportReady: Boolean(finalized.reportGeneratedAt),
          reportUrl: `/candidate/interview/report/${finalized._id}`,
        });
      }
      throw error;
    }

    const result = await interviewEngine.processResponse(sessionId, req.body.answer);
    const refreshedSession = await interviewSessionService.getOwnedSession(sessionId, req.user._id);

    if (
      timerService.getRemainingSeconds(refreshedSession) <= 0
      || refreshedSession.answeredQuestions >= refreshedSession.targetQuestionRange.max
    ) {
      const finalized = await interviewSessionService.endInterview(refreshedSession, {
        autoEnded: timerService.getRemainingSeconds(refreshedSession) <= 0,
      });

      const payload = interviewSessionService.buildRecoveryPayload(finalized);
      realtimeService.emitToSession(sessionId, 'interview:state', payload);

      return res.status(200).json({
        question: null,
        evaluation: result.evaluation,
        session: payload.session,
        completed: true,
        reportReady: Boolean(finalized.reportGeneratedAt),
        reportUrl: `/candidate/interview/report/${finalized._id}`,
      });
    }

    const payload = interviewSessionService.buildRecoveryPayload(refreshedSession);
    realtimeService.emitToSession(sessionId, 'interview:state', payload);

    res.status(200).json({
      question: result.question,
      evaluation: result.evaluation,
      session: payload.session,
      completed: false,
    });
  } catch (error) {
    logControllerError('respondToQuestion', error, { sessionId: req.params.sessionId });
    return handleControllerError('interview.controller.respondToQuestion', res, next, error);
  } finally {
    releaseLock(sessionId);
  }
};

const endSession = async (req, res, next) => {
  try {
    const session = await interviewSessionService.getOwnedSession(req.params.sessionId, req.user._id);
    normalizeInterviewSession(session);
    const finalized = await interviewSessionService.endInterview(session, { autoEnded: false });
    const payload = interviewSessionService.buildRecoveryPayload(finalized);
    realtimeService.emitToSession(finalized._id, 'interview:state', payload);

    res.status(200).json({
      session: payload.session,
      report: finalized,
    });
  } catch (error) {
    logControllerError('endSession', error, { sessionId: req.params.sessionId });
    return handleControllerError('interview.controller.endSession', res, next, error);
  }
};

const getFinalReport = async (req, res, next) => {
  try {
    const session = await interviewSessionService.getSessionReport(req.params.sessionId, req.user._id);
    res.status(200).json({ report: session });
  } catch (error) {
    logControllerError('getFinalReport', error, { sessionId: req.params.sessionId });
    return handleControllerError('interview.controller.getFinalReport', res, next, error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await interviewSessionService.getDashboard(req.user._id);
    res.status(200).json(dashboard);
  } catch (error) {
    logControllerError('getDashboard', error, { userId: req.user._id });
    return handleControllerError('interview.controller.getDashboard', res, next, error);
  }
};

const resolveLiveSession = async (req, res, next) => {
  try {
    const sessionToken = req.params.token;
    const tokenPayload = verifyJoinToken(sessionToken, req.user);
    const room = await liveInterviewService.findRoomById(tokenPayload.roomId);

    if (tokenPayload.role !== 'admin' && tokenPayload.role !== req.user.role) {
      return res.status(403).json({ message: 'This session token is not valid for your role.' });
    }

    const access = await liveInterviewService.assertRoomAccess(room.roomId, req.user, 'open');
    const payload = liveInterviewService.buildRoomPayload(access.room, access.role);

    res.status(200).json({
      ...payload,
      token: sessionToken,
      tokenExpiresAt: tokenPayload.exp ? new Date(tokenPayload.exp * 1000).toISOString() : null,
      sessionRole: tokenPayload.role
    });
  } catch (error) {
    logControllerError('resolveLiveSession', error, { token: req.params.token });
    return handleControllerError('interview.controller.resolveLiveSession', res, next, error);
  }
};

export {
  startSession,
  getActiveSession,
  getSessionStatus,
  autosaveSession,
  recoverSession,
  respondToQuestion,
  endSession,
  getFinalReport,
  getDashboard,
  resolveLiveSession,
};
