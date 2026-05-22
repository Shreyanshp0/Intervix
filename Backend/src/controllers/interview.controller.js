const interviewEngine = require('../ai/interview.engine');
const interviewSessionService = require('../services/interview-session.service');
const timerService = require('../services/timer.service');
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

    res.status(201).json({
      session: interviewSessionService.buildSessionSnapshot(freshSession),
      firstQuestion: initialAiResponse.question,
      fallback: Boolean(initialAiResponse.fallback),
    });
  } catch (error) {
    logControllerError('startSession', error);
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
      session: interviewSessionService.buildSessionSnapshot(refreshed),
      reportReady: Boolean(refreshed.reportGeneratedAt),
    });
  } catch (error) {
    logControllerError('getSessionStatus', error, { sessionId: req.params.sessionId });
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
          reportUrl: `/interview/report/${finalized._id}`,
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

      return res.status(200).json({
        question: null,
        evaluation: result.evaluation,
        session: interviewSessionService.buildSessionSnapshot(finalized),
        completed: true,
        reportReady: Boolean(finalized.reportGeneratedAt),
        reportUrl: `/interview/report/${finalized._id}`,
      });
    }

    res.status(200).json({
      question: result.question,
      evaluation: result.evaluation,
      session: interviewSessionService.buildSessionSnapshot(refreshedSession),
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

    res.status(200).json({
      session: interviewSessionService.buildSessionSnapshot(finalized),
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
  getSessionStatus,
  respondToQuestion,
  endSession,
  getFinalReport,
  getDashboard,
};
