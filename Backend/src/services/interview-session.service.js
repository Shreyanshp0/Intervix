const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const timerService = require('./timer.service');
const assessmentService = require('./assessment.service');
const progressTrackingService = require('./progress-tracking.service');
const realtimeService = require('./realtime.service');
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
      activePhase: 'pending',
      aiState: payload.mode === 'voice' ? 'thinking' : 'idle',
      meta: {
        interviewerStyle: payload.style || 'Friendly',
        questionStrategy: 'adaptive',
      },
    });
  }

  async getSessionById(sessionId) {
    return InterviewSession.findById(sessionId);
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
    const sanitizedQuestion = this.sanitizeText(question);
    session.transcript.push({
      question: sanitizedQuestion,
      difficultyAtTime: difficulty || session.difficulty || 'medium',
      askedAt: new Date(),
    });
    session.totalQuestions = session.transcript.length;
    session.currentQuestion = sanitizedQuestion;
    session.currentQuestionAskedAt = new Date();
    session.currentAnswerDraft = '';
    session.activePhase = 'question_ready';
    session.aiState = 'idle';
    session.transcriptVersion = (session.transcriptVersion || 0) + 1;
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
    session.currentAnswerDraft = '';
    session.activePhase = 'thinking';
    session.aiState = 'thinking';
    session.transcriptVersion = (session.transcriptVersion || 0) + 1;
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
      currentQuestion: session.currentQuestion,
      currentQuestionAskedAt: session.currentQuestionAskedAt,
      currentAnswerDraft: session.currentAnswerDraft,
      remainingSeconds,
      activePhase: session.activePhase,
      aiState: session.aiState,
      transcriptVersion: session.transcriptVersion || 0,
      transcript: session.transcript || [],
      progress: session.progress,
      meta: session.meta,
      recovery: session.recovery,
    };
  }

  buildRecoveryPayload(session) {
    return {
      session: this.buildSessionSnapshot(session),
      recoverable: session.status === 'active',
      serverTime: new Date().toISOString(),
    };
  }

  async updateRuntimeState(sessionId, updates = {}) {
    const updateDoc = {
      lastActivityAt: new Date(),
    };

    if (typeof updates.aiState === 'string') {
      updateDoc.aiState = updates.aiState;
    }

    if (typeof updates.activePhase === 'string') {
      updateDoc.activePhase = updates.activePhase;
    }

    if (typeof updates.currentQuestion === 'string') {
      updateDoc.currentQuestion = this.sanitizeText(updates.currentQuestion);
      updateDoc.currentQuestionAskedAt = new Date();
    }

    if (typeof updates.currentAnswerDraft === 'string') {
      updateDoc.currentAnswerDraft = updates.currentAnswerDraft.slice(0, 6000);
    }

    if (updates.recovery && typeof updates.recovery === 'object') {
      Object.entries(updates.recovery).forEach(([key, value]) => {
        updateDoc[`recovery.${key}`] = value;
      });
    }

    if (updates.meta && typeof updates.meta === 'object') {
      Object.entries(updates.meta).forEach(([key, value]) => {
        updateDoc[`meta.${key}`] = value;
      });
    }

    await InterviewSession.findByIdAndUpdate(sessionId, { $set: updateDoc });
  }

  async persistDraft(sessionId, userId, payload = {}) {
    const session = await this.getOwnedSession(sessionId, userId);

    const draft = typeof payload.currentAnswerDraft === 'string' ? payload.currentAnswerDraft : session.currentAnswerDraft;
    const updateDoc = {
      currentAnswerDraft: draft.slice(0, 6000),
      aiState: payload.aiState || session.aiState || 'idle',
      activePhase: payload.activePhase || session.activePhase || 'candidate_answering',
      lastActivityAt: new Date(),
      lastRecoveredAt: payload.recovered ? new Date() : session.lastRecoveredAt,
      'meta.autosaveVersion': (session.meta?.autosaveVersion || 0) + 1,
      'recovery.lastClientSyncAt': new Date(),
      'recovery.lastKnownConnectionState': payload.connectionState || 'connected',
    };

    if (payload.tabId) {
      updateDoc['recovery.lastKnownTabId'] = payload.tabId;
    }

    await InterviewSession.findByIdAndUpdate(sessionId, { $set: updateDoc });
    const refreshed = await this.getOwnedSession(sessionId, userId);
    realtimeService.emitToSession(sessionId, 'interview:autosaved', {
      sessionId: String(sessionId),
      autosaveVersion: refreshed.meta?.autosaveVersion || 0,
      savedAt: new Date().toISOString(),
    });
    return refreshed;
  }

  async getActiveSessionForUser(userId) {
    return InterviewSession.findOne({
      userId,
      status: 'active',
    }).sort({ updatedAt: -1 });
  }

  async markRecovered(sessionId, { socketId, userId, tabId }) {
    const session = await this.getOwnedSession(sessionId, userId);
    session.lastRecoveredAt = new Date();
    session.recovery = {
      ...session.recovery,
      lastSocketId: socketId || session.recovery?.lastSocketId || '',
      lastClientSyncAt: new Date(),
      lastKnownConnectionState: 'recovering',
      lastKnownTabId: tabId || session.recovery?.lastKnownTabId || '',
      lastRecoveredBy: String(userId),
    };
    session.meta = {
      ...session.meta,
      reconnectionCount: (session.meta?.reconnectionCount || 0) + 1,
    };
    session.aiState = session.aiState === 'speaking' ? 'speaking' : 'recovering';
    await session.save();
    return session;
  }

  async endInterview(session, { autoEnded = false } = {}) {
    if (session.reportGeneratedAt) {
      return session;
    }

    session.status = timerService.hasExpired(session) ? 'expired' : 'completed';
    session.endedAt = session.endedAt || new Date();
    session.activePhase = 'finalizing';
    session.aiState = 'finalizing';
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
    session.activePhase = 'completed';
    session.aiState = 'idle';
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
    realtimeService.emitToSession(session._id, 'interview:completed', this.buildRecoveryPayload(session));
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
