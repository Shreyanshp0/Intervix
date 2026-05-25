const logger = require('../config/logger');
const { getClosestRoute, normalizePath } = require('../utils/route-diagnostics');
const { getDiagnosticsLogger } = require('../utils/request-diagnostics');

/**
 * Global 404 Route Handler with comprehensive diagnostics
 * 
 * Logs:
 * - Missing routes
 * - Closest possible matches
 * - Common route pattern mismatches (/api/v1 vs /api)
 * - Suggestions for correction
 */
const routeNotFoundHandler = (req, res) => {
  const diagnosticsLogger = getDiagnosticsLogger();
  const closestRoute = getClosestRoute(req.originalUrl);

  // Log the 404 with full diagnostics
  diagnosticsLogger.logNotFound(req);

  // Check for common issues
  const pathLower = req.path.toLowerCase();
  let errorDetails = {
    code: 404,
    message: 'Resource not found',
    requestedPath: req.path,
    originalUrl: req.originalUrl,
    method: req.method,
    closestMatch: closestRoute?.fullPath || null,
    suggestion: null
  };

  // Check for /api/v1 deprecation issue
  if (pathLower.includes('/api/v1')) {
    errorDetails.suggestion = {
      issue: 'Deprecated API version prefix detected',
      correction: req.path.replace('/api/v1', '/api'),
      note: 'The /api/v1 prefix has been deprecated. Use /api/* instead.'
    };
  }

  // Check for missing /api prefix
  if (!pathLower.startsWith('/api/')) {
    errorDetails.suggestion = {
      issue: 'Missing /api prefix',
      correction: `/api${req.path}`,
      note: 'All API routes must be prefixed with /api/'
    };
  }

  // Provide helpful endpoint suggestion if available
  if (closestRoute && !errorDetails.suggestion) {
    errorDetails.suggestion = {
      issue: 'Route not found but similar endpoint exists',
      closestMatch: `${closestRoute.method} ${closestRoute.fullPath}`,
      note: 'Check the /api/health/routes endpoint for all available routes'
    };
  }

  // Log structured error payload
  const payload = {
    tag: '404_ROUTE_NOT_FOUND',
    method: req.method,
    path: normalizePath(req.originalUrl),
    origin: req.get('origin') || req.get('referer') || 'unknown',
    userAgent: req.get('user-agent'),
    authenticatedRole: req.user?.role || 'anonymous',
    closestMatch: closestRoute?.fullPath || null,
    timestamp: new Date().toISOString(),
    suggestion: errorDetails.suggestion
  };

  logger.warn(payload);

  res.status(404).json(errorDetails);
};

/**
 * Request timing middleware for diagnostics
 * Tracks response times and logs slow endpoints
 */
const requestTimingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const diagnosticsLogger = getDiagnosticsLogger();

  // Track request start
  res.on('finish', () => {
    if (res.statusCode !== 404) { // Don't double-log 404s
      diagnosticsLogger.trackRequest(req, startTime);
    }

    // Log request completion
    const duration = Date.now() - startTime;
    if (duration > 3000) { // Log anything over 3 seconds
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
