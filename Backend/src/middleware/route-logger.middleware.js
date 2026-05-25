const logger = require('../config/logger');
const { getClosestRoute, normalizePath } = require('../utils/route-diagnostics');
const { getDiagnosticsLogger } = require('../utils/request-diagnostics');

const routeNotFoundHandler = (req, res) => {
  try {
    const diagnosticsLogger = getDiagnosticsLogger();
    const closestRoute = getClosestRoute(req.originalUrl);
    diagnosticsLogger.logNotFound(req);

    logger.warn({
      tag: '404_ROUTE_NOT_FOUND',
      method: req.method,
      path: normalizePath(req.originalUrl),
      origin: req.get('origin') || req.get('referer') || 'unknown',
      userAgent: req.get('user-agent'),
      authenticatedRole: req.user?.role || 'anonymous',
      closestMatch: closestRoute?.path || null,
      timestamp: new Date().toISOString()
    });

    res.status(404).json({
      code: 404,
      message: 'Resource not found',
      requestedPath: normalizePath(req.originalUrl),
      closestMatch: closestRoute?.path || null
    });
  } catch (error) {
    logger.error({
      tag: '404_ROUTE_HANDLER_FAILED',
      method: req.method,
      path: req.originalUrl,
      error: error.message
    });

    res.status(404).json({ code: 404, message: 'Resource not found' });
  }
};

const requestTimingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const diagnosticsLogger = getDiagnosticsLogger();

  res.on('finish', () => {
    if (res.statusCode !== 404) {
      diagnosticsLogger.trackRequest(req, startTime);
    }

    const duration = Date.now() - startTime;
    if (duration > 3000) {
      logger.info({
        tag: 'REQUEST_COMPLETED',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        authenticatedRole: req.user?.role || 'anonymous'
      });
    }
  });

  next();
};

module.exports = {
  routeNotFoundHandler,
  requestTimingMiddleware
};
