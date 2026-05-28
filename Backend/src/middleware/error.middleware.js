import mongoose from 'mongoose';
import ApiError from '../utils/api-error.js';
import logger from '../config/logger.js';

/**
 * Converts any non-ApiError instances into a normalized ApiError
 */
export const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

/**
 * Production-safe global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Mask internal server error messages in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  };

  // Structured logging
  logger.error({
    tag: 'GLOBAL_ERROR_HANDLER',
    message: err.message || 'Express request pipeline failure',
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  if (!res.headersSent) {
    res.status(statusCode).json(response);
  }
};
