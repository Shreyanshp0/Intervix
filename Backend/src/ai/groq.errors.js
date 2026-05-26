import ApiError from '../utils/api-error.js';

class GroqOperationalError extends ApiError {
  constructor(message, details = {}, statusCode = 500) {
    super(statusCode, message, true);
    this.name = 'GroqOperationalError';
    this.details = details;
    //hello
  }
}

class TokenLimitError extends GroqOperationalError {
  constructor(message = 'Groq request exceeds token limits', details = {}) {
    super(message, details, 413);
    this.name = 'TokenLimitError';
  }
}

class UnsupportedParameterError extends GroqOperationalError {
  constructor(message = 'Groq request used an unsupported parameter', details = {}) {
    super(message, details, 400);
    this.name = 'UnsupportedParameterError';
  }
}

class ModelUnavailableError extends GroqOperationalError {
  constructor(message = 'Groq model is unavailable', details = {}) {
    super(message, details, 503);
    this.name = 'ModelUnavailableError';
  }
}

export {
  GroqOperationalError,
  TokenLimitError,
  UnsupportedParameterError,
  ModelUnavailableError,
};
