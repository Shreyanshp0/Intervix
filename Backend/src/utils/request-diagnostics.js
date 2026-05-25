/**
 * API Request Diagnostics Logger
 *
 * Tracks:
 * - 404 errors with closest route matches
 * - Duplicate/repeated requests
 * - Slow endpoints
 * - Failed API calls with recovery suggestions
 * - Route mismatches and path normalization hints
 */

const logger = require('../config/logger');
const { getClosestRoute } = require('./route-diagnostics');

class APIRequestDiagnosticsLogger {
  constructor() {
    this.requestMap = new Map();
    this.notFoundLog = [];
    this.slowEndpoints = [];
    this.failurePatterns = new Map();
    this.maxTrackedRequests = 1000;
    this.slowThreshold = 5000;
  }

  trackRequest(req, startTime) {
    const key = `${req.method}:${req.path}`;
    const duration = Date.now() - startTime;

    if (!this.requestMap.has(key)) {
      this.requestMap.set(key, {
        path: req.path,
        method: req.method,
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastCalled: new Date().toISOString()
      });
    }

    const entry = this.requestMap.get(key);
    entry.count += 1;
    entry.totalDuration += duration;
    entry.avgDuration = entry.totalDuration / entry.count;
    entry.lastCalled = new Date().toISOString();

    if (this.requestMap.size > this.maxTrackedRequests) {
      const oldestKey = Array.from(this.requestMap.entries())
        .sort(([, a], [, b]) => new Date(a.lastCalled) - new Date(b.lastCalled))[0][0];
      this.requestMap.delete(oldestKey);
    }

    if (duration > this.slowThreshold) {
      this.slowEndpoints.push({
        path: req.path,
        method: req.method,
        duration,
        timestamp: new Date().toISOString(),
        role: req.user?.role || 'anonymous'
      });

      logger.warn({
        tag: 'SLOW_ENDPOINT',
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        threshold: `${this.slowThreshold}ms`
      });
    }

    return entry;
  }

  logNotFound(req) {
    const closestRoute = getClosestRoute(req.originalUrl);
    const payload = {
      timestamp: new Date().toISOString(),
      tag: '404_ROUTE_MISMATCH',
      method: req.method,
      requestedPath: req.path,
      originalUrl: req.originalUrl,
      origin: req.get('origin') || req.get('referer') || 'unknown',
      authenticatedRole: req.user?.role || 'anonymous',
      userAgent: req.get('user-agent'),
      closestMatch: closestRoute?.path || null,
      suggestion: this.generateSuggestion(req.path, closestRoute)
    };

    this.notFoundLog.push(payload);
    logger.warn(payload);

    return payload;
  }

  generateSuggestion(requestedPath, closestRoute) {
    if (!requestedPath.startsWith('/api/')) {
      return {
        issue: 'Request missing /api prefix',
        correction: `/api${requestedPath}`,
        documentation: 'All API routes must start with /api/'
      };
    }

    if (closestRoute) {
      return {
        issue: 'Route not found',
        closestMatch: closestRoute.path,
        documentation: `Did you mean ${closestRoute.method} ${closestRoute.path}?`
      };
    }

    return {
      issue: 'Route not found and no suggestions available',
      documentation: 'Check /health/routes for available endpoints'
    };
  }

  trackFailure(req, error, statusCode) {
    const key = `${req.method}:${req.path}`;

    if (!this.failurePatterns.has(key)) {
      this.failurePatterns.set(key, {
        path: req.path,
        method: req.method,
        failureCount: 0,
        lastFailure: null,
        errors: [],
        role: req.user?.role || 'anonymous'
      });
    }

    const pattern = this.failurePatterns.get(key);
    pattern.failureCount += 1;
    pattern.lastFailure = new Date().toISOString();
    pattern.errors.push({
      statusCode,
      message: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });

    if (pattern.errors.length > 10) {
      pattern.errors.shift();
    }

    if (pattern.failureCount >= 5) {
      logger.error({
        tag: 'REPEATED_ROUTE_FAILURES',
        method: req.method,
        path: req.path,
        failureCount: pattern.failureCount,
        statusCode,
        role: req.user?.role || 'anonymous',
        lastError: error?.message || 'Unknown'
      });
    }

    return pattern;
  }

  getReport() {
    const topRequests = Array.from(this.requestMap.values())
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    const topSlowEndpoints = this.slowEndpoints
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const topFailingEndpoints = Array.from(this.failurePatterns.values())
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 10);

    const recentNotFound = this.notFoundLog
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalTrackedRoutes: this.requestMap.size,
        totalNotFoundErrors: this.notFoundLog.length,
        totalFailures: Array.from(this.failurePatterns.values()).reduce((sum, p) => sum + p.failureCount, 0),
        slowEndpointsCount: this.slowEndpoints.length,
        criticalFailures: Array.from(this.failurePatterns.values()).filter((p) => p.failureCount >= 5).length
      },
      topRequests,
      topSlowEndpoints,
      topFailingEndpoints,
      recentNotFoundErrors: recentNotFound.slice(0, 5),
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.slowEndpoints.length > 5) {
      const slowestEndpoint = this.slowEndpoints.sort((a, b) => b.duration - a.duration)[0];
      recommendations.push({
        severity: 'warning',
        issue: `Slow endpoint detected: ${slowestEndpoint.method} ${slowestEndpoint.path} (${slowestEndpoint.duration}ms)`,
        action: 'Profile and optimize database queries or external API calls',
        affectedEndpoint: slowestEndpoint.path
      });
    }

    const repeatedFailures = Array.from(this.failurePatterns.values()).filter((p) => p.failureCount >= 5);
    if (repeatedFailures.length > 0) {
      recommendations.push({
        severity: 'critical',
        issue: `${repeatedFailures.length} endpoints have repeated failures (5+ errors)`,
        action: 'Check endpoint implementation, database connectivity, or external service availability',
        affectedEndpoints: repeatedFailures.slice(0, 3).map((p) => `${p.method} ${p.path}`)
      });
    }

    return recommendations;
  }

  reset() {
    this.requestMap.clear();
    this.notFoundLog = [];
    this.slowEndpoints = [];
    this.failurePatterns.clear();
  }
}

let instance;

const getDiagnosticsLogger = () => {
  if (!instance) {
    instance = new APIRequestDiagnosticsLogger();
  }
  return instance;
};

module.exports = {
  APIRequestDiagnosticsLogger,
  getDiagnosticsLogger
};
