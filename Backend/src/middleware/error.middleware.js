import ApiError from '../utils/api-error.js';
import logger from '../config/logger.js';

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (error instanceof ApiError) {
    return next(error);
  }

  const isCorsError = Boolean(error?.message && /CORS origin|Not allowed by CORS/i.test(error.message));
  const statusCode = error?.statusCode
    || (error?.name === 'ValidationError' ? 400 : null)
    || (error?.name === 'CastError' ? 404 : null)
    || (isCorsError ? 403 : null)
    || (error instanceof Error ? 500 : 400);
  const message = error?.message || (statusCode === 403 ? 'Forbidden origin' : 'Internal Server Error');

  error = new ApiError(statusCode, message, statusCode < 500, err.stack);
  error.details = err.details;
  error.name = err?.name || error.name;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (!statusCode || Number.isNaN(Number(statusCode))) {
    statusCode = 500;
  }

  if (process.env.NODE_ENV === 'production' && !err.isOperational && statusCode >= 500) {
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  logger.error({
    tag: 'HTTP_ERROR',
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    origin: req.get('origin') || req.get('referer') || 'unknown',
    forwardedProto: req.get('x-forwarded-proto') || req.protocol,
    userId: req.user?._id || 'anonymous',
    stack: err.stack || null,
    details: err.details || null
  });
  if (err.details) {
    logger.error(`Error details: ${JSON.stringify(err.details)}`);
  }
  if (err.stack) {
    logger.error(err.stack);
  }
  if (process.env.NODE_ENV === 'development') {
    logger.error(err);
  }

  res.status(statusCode).json(response);
};

export {
  errorConverter,
  errorHandler,
};
