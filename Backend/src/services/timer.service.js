import InterviewSession from '../models/InterviewSession.js';
import { SessionExpiredError, SessionLockedError } from '../utils/interview-errors.js';

const DURATION_QUESTION_MAP = {
  10: { min: 5, max: 7 },
  15: { min: 8, max: 12 },
  30: { min: 15, max: 20 },
};

class TimerService {
  getQuestionPlan(duration = 15) {
    return DURATION_QUESTION_MAP[duration] || DURATION_QUESTION_MAP[15];
  }

  computeExpiry(startedAt = new Date(), duration = 15) {
    return new Date(new Date(startedAt).getTime() + duration * 60 * 1000);
  }

  getRemainingSeconds(session) {
    if (!session?.expiresAt) {
      return 0;
    }

    const diffMs = new Date(session.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  hasExpired(session) {
    return this.getRemainingSeconds(session) <= 0;
  }

  async touchSession(sessionId) {
    await InterviewSession.findByIdAndUpdate(sessionId, {
      lastActivityAt: new Date(),
    });
  }

  async assertSessionWritable(session) {
    if (!session) {
      throw new SessionLockedError({ reason: 'missing-session' });
    }

    if (!session.expiresAt) {
      session.expiresAt = this.computeExpiry(session.startedAt || new Date(), session.duration || 15);
      await session.save();
    }

    if (session.status !== 'active') {
      throw new SessionLockedError({ status: session.status });
    }

    if (this.hasExpired(session)) {
      session.status = 'expired';
      session.endedAt = session.endedAt || new Date();
      session.meta = {
        ...session.meta,
        autoEnded: true,
      };
      await session.save();
      throw new SessionExpiredError({
        sessionId: session._id,
        expiresAt: session.expiresAt,
      });
    }
  }
}

export default new TimerService();
