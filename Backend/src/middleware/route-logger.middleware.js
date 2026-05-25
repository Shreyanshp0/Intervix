const logger = require('../config/logger');
const { getClosestRoute, normalizePath } = require('../utils/route-diagnostics');

const routeNotFoundHandler = (req, res) => {
  const closestRoute = getClosestRoute(req.originalUrl);
  const payload = {
    tag: '404_ROUTE',
    method: req.method,
    path: normalizePath(req.originalUrl),
    origin: req.get('origin') || req.get('referer') || 'unknown',
    authenticatedRole: req.user?.role || 'anonymous',
    closestMatch: closestRoute?.fullPath || null
  };

  logger.warn(payload);

  res.status(404).json({
    code: 404,
    message: 'Resource not found',
    requestedPath: payload.path,
    closestMatch: payload.closestMatch
  });
};

module.exports = {
  routeNotFoundHandler
};
