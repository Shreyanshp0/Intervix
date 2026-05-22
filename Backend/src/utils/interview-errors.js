const ApiError = require('./api-error');

class InterviewError extends ApiError {
  constructor(statusCode, message, details = {}) {
    super(statusCode, message, true);
    this.details = details;
  }
}

class SessionExpiredError extends InterviewError {
  constructor(details = {}) {
    super(410, 'Interview session has expired', details);
  }
}

class SessionLockedError extends InterviewError {
  constructor(details = {}) {
    super(409, 'Interview session is locked', details);
  }
}

class DuplicateSubmissionError extends InterviewError {
  constructor(details = {}) {
    super(409, 'Duplicate answer submission detected', details);
  }
}

class OwnershipError extends InterviewError {
  constructor(details = {}) {
    super(403, 'You do not have access to this interview session', details);
  }
}

module.exports = {
  InterviewError,
  SessionExpiredError,
  SessionLockedError,
  DuplicateSubmissionError,
  OwnershipError,
};
