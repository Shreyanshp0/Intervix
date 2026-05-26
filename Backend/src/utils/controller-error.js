import logger from '../config/logger.js';

const handleControllerError = (controllerName, res, next, error) => {
  const statusCode = error?.statusCode || 500;
  const payload = {
    success: false,
    message: error?.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && error?.stack ? { stack: error.stack } : {})
  };

  logger.error(`[Controller] ${controllerName} failed: ${error?.message || 'Unknown error'}`);
  if (error?.stack) {
    logger.error(error.stack);
  }

  if (typeof next === 'function') {
    return next(error);
  }

  return res.status(statusCode).json(payload);
};

export default handleControllerError;