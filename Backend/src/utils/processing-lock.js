import logger from '../config/logger.js';

// Central in-memory registry for active transaction locks
const activeProcessing = new Map();

/**
 * Attempts to acquire an exclusive lock for a given key.
 * @param {string} key Lock identifier (e.g. userId or sessionId)
 * @param {string} type Lock type description (e.g. 'start-interview' or 'voice-respond')
 * @param {number} ttlMs Time to live for the lock in milliseconds (default 30 seconds) to prevent permanent deadlocks
 * @returns {boolean} True if lock acquired, false if already locked
 */
export const acquireLock = (key, type = 'general', ttlMs = 30000) => {
  const normalizedKey = String(key);
  const now = Date.now();

  if (activeProcessing.has(normalizedKey)) {
    const existing = activeProcessing.get(normalizedKey);
    // Auto-release expired lock as a fallback safety
    if (now - existing.timestamp > ttlMs) {
      logger.warn(`[ProcessingLock] Releasing stale lock of type '${existing.type}' for key ${normalizedKey}`);
      activeProcessing.delete(normalizedKey);
    } else {
      logger.warn(`[ProcessingLock] Blocked simultaneous execution for key ${normalizedKey} (type: '${type}', active type: '${existing.type}')`);
      return false;
    }
  }

  activeProcessing.set(normalizedKey, { type, timestamp: now });
  logger.info(`[ProcessingLock] Acquired lock of type '${type}' for key ${normalizedKey}`);
  return true;
};

/**
 * Releases a previously acquired lock for a key.
 * @param {string} key Lock identifier
 */
export const releaseLock = (key) => {
  const normalizedKey = String(key);
  if (activeProcessing.has(normalizedKey)) {
    const lock = activeProcessing.get(normalizedKey);
    activeProcessing.delete(normalizedKey);
    logger.info(`[ProcessingLock] Released lock of type '${lock.type}' for key ${normalizedKey}`);
  }
};
