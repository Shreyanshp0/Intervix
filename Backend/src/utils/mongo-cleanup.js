import InterviewSession, { normalizeInterviewSession } from '../models/InterviewSession.js';
import logger from '../config/logger.js';

/**
 * Scans, repairs and cleans up mock interview sessions in the database.
 * Completely unrecoverable sessions (e.g. without userId) are removed.
 * Partially corrupted sessions are normalized and saved.
 */
export const cleanupDatabaseSessions = async () => {
  logger.info('[Mongo Cleanup] Starting self-healing session database scan...');
  try {
    const sessions = await InterviewSession.find({});
    let removedCount = 0;
    let fixedCount = 0;

    for (const session of sessions) {
      try {
        if (!session.userId) {
          logger.warn(`[Mongo Cleanup] Deleting unrecoverable session ${session._id} (missing userId)`);
          await InterviewSession.deleteOne({ _id: session._id });
          removedCount++;
          continue;
        }

        const initialObj = session.toObject();
        normalizeInterviewSession(session);
        
        // Check if normalization updated fields (like default arrays or dates)
        const isDiff = !session.expiresAt || 
                       !session.transcript || 
                       !session.messages || 
                       !session.status || 
                       !session.startedAt || 
                       String(initialObj.expiresAt) !== String(session.expiresAt);

        if (isDiff || session.isModified()) {
          await session.save();
          fixedCount++;
          logger.info(`[Mongo Cleanup] Normalized and saved session ${session._id}`);
        }
      } catch (err) {
        logger.error(`[Mongo Cleanup] Malformed session ${session._id} failed validation: ${err.message}. Deleting.`);
        await InterviewSession.deleteOne({ _id: session._id });
        removedCount++;
      }
    }

    logger.info(`[Mongo Cleanup] Scan complete. Auto-repaired: ${fixedCount}, Pruned: ${removedCount}`);
  } catch (error) {
    logger.error(`[Mongo Cleanup] Critical failure during database cleanup: ${error.message}`);
  }
};
