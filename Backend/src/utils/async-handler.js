/**
 * Express async handler wrapper to catch rejected promises and forward to error handler
 * @param {Function} fn The async request handler
 * @returns {Function} Standard Express middleware
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
