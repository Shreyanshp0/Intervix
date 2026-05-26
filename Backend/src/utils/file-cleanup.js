import fs from 'fs';
import logger from '../config/logger.js';

const safeRemoveFile = async (filePath, metadata = {}) => {
  if (!filePath) {
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`[VoicePipeline] cleanup_completed ${JSON.stringify({ filePath, ...metadata })}`);
    }
  } catch (error) {
    logger.warn(`[VoicePipeline] cleanup_failed ${JSON.stringify({ filePath, error: error.message, ...metadata })}`);
  }
};

export {
  safeRemoveFile,
};
