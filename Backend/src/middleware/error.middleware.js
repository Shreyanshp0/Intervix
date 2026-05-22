const ApiError = require('../utils/api-error');
const logger = require('../config/logger');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error instanceof Error ? 500 : 400);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
    error.details = err.details;
  }
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  logger.error(`${req.method} ${req.originalUrl} -> ${statusCode} ${message}`);
  if (err.details) {
    logger.error(`Error details: ${JSON.stringify(err.details)}`);
  }
  if (process.env.NODE_ENV === 'development') {
    logger.error(err);
  }

  res.status(statusCode).json(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
