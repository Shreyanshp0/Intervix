const interviewEngine = require('../ai/interview.engine');
const interviewSessionService = require('../services/interview-session.service');
const timerService = require('../services/timer.service');
const realtimeService = require('../services/realtime.service');
const { SessionExpiredError } = require('../utils/interview-errors');

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
  try {
    const session = await interviewSessionService.createSession(req.user._id, req.body);
    const initialAiResponse = await interviewEngine.startInterview(session._id);
    const freshSession = await interviewSessionService.getOwnedSession(session._id, req.user._id);

    const payload = interviewSessionService.buildRecoveryPayload(freshSession);
    realtimeService.emitToSession(freshSession._id, 'interview:state', payload);

    res.status(201).json({
      ...payload,
      firstQuestion: initialAiResponse.question,
      fallback: Boolean(initialAiResponse.fallback),
    });
  } catch (error) {
    logControllerError('startSession', error);
    next(error);
  }
};

const getActiveSession = async (req, res, next) => {
  try {
    const session = await interviewSessionService.getActiveSessionForUser(req.user._id);
    if (!session) {
      return res.status(200).json({ session: null, recoverable: false });
    }

    if (timerService.hasExpired(session) && !session.reportGeneratedAt) {
      await interviewSessionService.endInterview(session, { autoEnded: true });
      const finalized = await interviewSessionService.getOwnedSession(session._id, req.user._id);
      return res.status(200).json(interviewSessionService.buildRecoveryPayload(finalized));
    }

    return res.status(200).json(interviewSessionService.buildRecoveryPayload(session));
  } catch (error) {
    logControllerError('getActiveSession', error, { userId: req.user._id });
    next(error);
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
    next(error);
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
    next(error);
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
    next(error);
  }
};

const respondToQuestion = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
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
    next(error);
  }
};

const endSession = async (req, res, next) => {
  try {
    const session = await interviewSessionService.getOwnedSession(req.params.sessionId, req.user._id);
    const finalized = await interviewSessionService.endInterview(session, { autoEnded: false });
    const payload = interviewSessionService.buildRecoveryPayload(finalized);
    realtimeService.emitToSession(finalized._id, 'interview:state', payload);

    res.status(200).json({
      session: payload.session,
      report: finalized,
    });
  } catch (error) {
    logControllerError('endSession', error, { sessionId: req.params.sessionId });
    next(error);
  }
};

const getFinalReport = async (req, res, next) => {
  try {
    const session = await interviewSessionService.getSessionReport(req.params.sessionId, req.user._id);
    res.status(200).json({ report: session });
  } catch (error) {
    logControllerError('getFinalReport', error, { sessionId: req.params.sessionId });
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await interviewSessionService.getDashboard(req.user._id);
    res.status(200).json(dashboard);
  } catch (error) {
    logControllerError('getDashboard', error, { userId: req.user._id });
    next(error);
  }
};

module.exports = {
  startSession,
  getActiveSession,
  getSessionStatus,
  autosaveSession,
  recoverSession,
  respondToQuestion,
  endSession,
  getFinalReport,
  getDashboard,
};
