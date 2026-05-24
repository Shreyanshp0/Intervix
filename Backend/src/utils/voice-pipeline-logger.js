const logger = require('../config/logger');

const logVoiceStage = (stage, payload = {}) => {
  const serialized = Object.keys(payload).length ? ` ${JSON.stringify(payload)}` : '';
  logger.info(`[VoicePipeline] ${stage}${serialized}`);
};

const logVoiceWarning = (message, payload = {}) => {
  const serialized = Object.keys(payload).length ? ` ${JSON.stringify(payload)}` : '';
  logger.warn(`[VoicePipeline] ${message}${serialized}`);
};

const logVoiceError = (stage, error, payload = {}) => {
  const base = {
    error: error?.message,
    code: error?.code,
    statusCode: error?.statusCode,
    details: error?.details,
    ...payload,
  };
  logger.error(`[VoicePipeline] ${stage} failed ${JSON.stringify(base)}`);
};

module.exports = {
  logVoiceStage,
  logVoiceWarning,
  logVoiceError,
};
