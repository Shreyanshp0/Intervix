const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const timerService = require('./timer.service');
const assessmentService = require('./assessment.service');
const progressTrackingService = require('./progress-tracking.service');
const { OwnershipError, DuplicateSubmissionError, SessionLockedError } = require('../utils/interview-errors');

class InterviewSessionService {
  sanitizeText(value = '', fallback = '') {
    const source = typeof value === 'string' ? value : fallback;
    return source.replace(/\s+/g, ' ').trim();
  }

  async createSession(userId, payload) {
    const startedAt = new Date();
    const duration = payload.duration || 15;
    const targetQuestionRange = timerService.getQuestionPlan(duration);

    return InterviewSession.create({
      userId,
      mode: payload.mode,
      topic: this.sanitizeText(payload.topic),
      difficulty: payload.difficulty || 'medium',
      experienceLevel: payload.experienceLevel || 'Intermediate',
      interviewType: payload.interviewType || 'technical',
      duration,
      startedAt,
      expiresAt: timerService.computeExpiry(startedAt, duration),
      targetQuestionRange,
      meta: {
        interviewerStyle: payload.style || 'Friendly',
        questionStrategy: 'adaptive',
      },
    });
  }

  async getOwnedSession(sessionId, userId) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      throw new SessionLockedError({ reason: 'missing-session' });
    }

    if (String(session.userId) !== String(userId)) {
      throw new OwnershipError({ sessionId });
    }

    return session;
  }

  addQuestionToTranscript(session, question, difficulty) {
    session.transcript.push({
      question: this.sanitizeText(question),
      difficultyAtTime: difficulty || session.difficulty || 'medium',
      askedAt: new Date(),
    });
    session.totalQuestions = session.transcript.length;
  }

  addAnswerToTranscript(session, answer, evaluation = {}) {
    const latestEntry = session.transcript[session.transcript.length - 1];
    if (!latestEntry) {
      throw new SessionLockedError({ reason: 'missing-question' });
    }

    if (latestEntry.answer) {
      throw new DuplicateSubmissionError({ sessionId: session._id });
    }

    latestEntry.answer = this.sanitizeText(answer);
    latestEntry.feedback = this.sanitizeText(evaluation.feedback || '');
    latestEntry.score = Math.max(0, Math.min(100, Math.round(evaluation.answerScore || evaluation.technicalScore || 0)));
    latestEntry.technicalScore = Math.max(0, Math.min(100, Math.round(evaluation.technicalScore || latestEntry.score || 0)));
    latestEntry.communicationScore = Math.max(0, Math.min(100, Math.round(evaluation.communicationScore || 0)));
    latestEntry.confidenceScore = Math.max(0, Math.min(100, Math.round(evaluation.confidenceScore || 0)));
    latestEntry.answeredAt = new Date();

    session.answeredQuestions = session.transcript.filter((entry) => entry.answer).length;
    session.progress.recentAverageScore = this.computeRecentAverage(session.transcript);
  }

  computeRecentAverage(transcript = []) {
    const recent = transcript.slice(-3).map((entry) => entry.score || 0);
    if (!recent.length) {
      return 0;
    }
    return Number((recent.reduce((sum, value) => sum + value, 0) / recent.length).toFixed(2));
  }

  buildSessionSnapshot(session) {
    const remainingSeconds = timerService.getRemainingSeconds(session);

    return {
      _id: session._id,
      topic: session.topic,
      difficulty: session.difficulty,
      duration: session.duration,
      status: session.status,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      endedAt: session.endedAt,
      totalQuestions: session.totalQuestions,
      answeredQuestions: session.answeredQuestions,
      remainingSeconds,
      progress: session.progress,
      meta: session.meta,
    };
  }

  async endInterview(session, { autoEnded = false } = {}) {
    if (session.reportGeneratedAt) {
      return session;
    }

    session.status = timerService.hasExpired(session) ? 'expired' : 'completed';
    session.endedAt = session.endedAt || new Date();
    session.meta = {
      ...session.meta,
      autoEnded,
      finalizationInProgress: true,
      finalizationAttemptedAt: new Date(),
    };
    await session.save();

    const assessment = await assessmentService.finalizeAssessment(session, session.transcript);

    session.score = assessment.overallScore;
    session.technicalScore = assessment.technicalScore;
    session.communicationScore = assessment.communicationScore;
    session.confidenceScore = assessment.confidenceScore;
    session.problemSolvingScore = assessment.problemSolvingScore;
    session.depthScore = assessment.depthScore;
    session.strengths = assessment.strengths;
    session.weaknesses = assessment.weaknesses;
    session.suggestions = assessment.suggestions;
    session.recommendedStudyTopics = assessment.recommendedStudyTopics;
    session.hiringReadiness = assessment.hiringReadiness;
    session.finalSummary = assessment.finalSummary;
    session.reportGeneratedAt = new Date();
    session.meta = {
      ...session.meta,
      finalizationInProgress: false,
    };

    if (assessment.transcriptFeedback.length) {
      session.transcript = session.transcript.map((entry, index) => ({
        ...entry.toObject?.() || entry,
        feedback: assessment.transcriptFeedback[index]?.feedback || entry.feedback,
        score: assessment.transcriptFeedback[index]?.score ?? entry.score,
      }));
    }

    await session.save();
    await progressTrackingService.updateAfterInterview(session);
    return session;
  }

  async getSessionReport(sessionId, userId) {
    const session = await this.getOwnedSession(sessionId, userId);
    return session;
  }

  async getDashboard(userId) {
    return progressTrackingService.getDashboardData(userId);
  }

  async appendSystemMessage(sessionId, content, metadata = {}) {
    await InterviewMessage.create({
      sessionId,
      role: 'system',
      content,
      metadata,
    });
  }
}

module.exports = new InterviewSessionService();
