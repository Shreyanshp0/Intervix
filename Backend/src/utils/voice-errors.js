import ApiError from './api-error.js';

class VoicePipelineError extends ApiError {
  constructor(stage, message, details = {}, statusCode = 500) {
    super(statusCode, message, true);
    this.stage = stage;
    this.details = details;
  }
}

class ExternalProviderError extends VoicePipelineError {
  constructor(stage, message, provider, details = {}, statusCode = 502) {
    super(stage, message, { provider, ...details }, statusCode);
    this.provider = provider;
  }
}

export {
  VoicePipelineError,
  ExternalProviderError,
};
