const fs = require('fs');
const logger = require('../config/logger');

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

module.exports = {
  safeRemoveFile,
};
