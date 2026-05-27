import logger from '../config/logger.js';
import { getClosestRoute, normalizePath } from '../utils/route-diagnostics.js';
import { getDiagnosticsLogger } from '../utils/request-diagnostics.js';

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
  const shouldTrace = req.originalUrl.startsWith('/api/recruiter/applications') || req.originalUrl.startsWith('/api/code/room');

  if (shouldTrace) {
    logger.info({
      tag: 'REQUEST_TRACE',
      method: req.method,
      path: req.originalUrl,
      origin: req.get('origin') || req.get('referer') || 'unknown',
      forwardedProto: req.get('x-forwarded-proto') || req.protocol,
      host: req.get('host') || 'unknown',
      authenticatedRole: req.user?.role || 'anonymous'
    });
  }

  res.on('finish', () => {
    if (res.statusCode !== 404) {
      diagnosticsLogger.trackRequest(req, startTime);
    }

    const duration = Date.now() - startTime;
    if (duration > 3000 || (shouldTrace && res.statusCode >= 400)) {
      logger.info({
        tag: 'REQUEST_COMPLETED',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        authenticatedRole: req.user?.role || 'anonymous',
        origin: req.get('origin') || req.get('referer') || 'unknown',
        forwardedProto: req.get('x-forwarded-proto') || req.protocol
      });
    }
  });

  next();
};

export {
  routeNotFoundHandler,
  requestTimingMiddleware
};
