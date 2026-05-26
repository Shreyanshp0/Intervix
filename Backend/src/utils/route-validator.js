/**
 * Route Validator - Comprehensive route validation and conflict detection
 * 
 * Purpose:
 * - Validate all registered routes for conflicts
 * - Check for duplicate route definitions
 * - Verify middleware chains
 * - Detect misconfigured endpoints
 */

import { buildQualifiedRoutes, ROUTE_DEFINITIONS } from '../constants/api-routes.js';

const normalizeRoute = (route) => {
  // Normalize route to compare correctly
  const normalized = route.toLowerCase().trim();
  return normalized.replace(/\/+$/, ''); // Remove trailing slashes
};

const detectRouteConflicts = () => {
  const routes = buildQualifiedRoutes();
  const routeMap = new Map();
  const conflicts = [];

  routes.forEach((route) => {
    const key = `${route.method.toUpperCase()} ${normalizeRoute(route.fullPath)}`;
    
    if (routeMap.has(key)) {
      conflicts.push({
        method: route.method,
        path: route.fullPath,
        existingRoute: routeMap.get(key),
        roles: route.roles || []
      });
    } else {
      routeMap.set(key, route);
    }
  });

  return conflicts;
};

const validateRouteProtection = () => {
  const routes = buildQualifiedRoutes();
  const protectionIssues = [];

  // Routes that should be protected
  const protectedPatterns = [
    '/candidate/',
    '/recruiter/',
    '/interviews/',
    '/resume/upload',
    '/voice/'
  ];

  routes.forEach((route) => {
    const shouldBeProtected = protectedPatterns.some(pattern => 
      route.fullPath.includes(pattern)
    );

    if (shouldBeProtected && !route.protected) {
      protectionIssues.push({
        method: route.method,
        path: route.fullPath,
        issue: 'Route should be protected but is not'
      });
    }

    if (!shouldBeProtected && route.protected) {
      // This might be okay but log it for review
      if (!route.fullPath.includes('/health')) {
        protectionIssues.push({
          method: route.method,
          path: route.fullPath,
          issue: 'Route is protected but may not need to be',
          severity: 'low'
        });
      }
    }
  });

  return protectionIssues;
};

const validateMissingRoutes = () => {
  const defined = ROUTE_DEFINITIONS.length;
  const routes = buildQualifiedRoutes();
  const registered = routes.length;

  if (defined !== registered) {
    return {
      defined,
      registered,
      issue: `Route count mismatch: ${defined} definitions but ${registered} registered routes`,
      warning: true
    };
  }

  return {
    defined,
    registered,
    validated: true
  };
};

const validateRouteConsistency = () => {
  const issues = [];
  const routes = buildQualifiedRoutes();

  // Check for common misconfigurations
  routes.forEach((route) => {
    // Check for routes without methods
    if (!route.method || !route.method.trim()) {
      issues.push({
        path: route.fullPath,
        issue: 'Route missing HTTP method'
      });
    }

    // Check for routes without roles when protected
    if (route.protected && (!route.roles || route.roles.length === 0)) {
      issues.push({
        method: route.method,
        path: route.fullPath,
        issue: 'Protected route missing role definitions'
      });
    }

    // Check for routes with invalid methods
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(route.method.toUpperCase())) {
      issues.push({
        method: route.method,
        path: route.fullPath,
        issue: `Invalid HTTP method: ${route.method}`
      });
    }
  });

  return issues;
};

const buildValidationReport = () => {
  const conflicts = detectRouteConflicts();
  const protectionIssues = validateRouteProtection();
  const missingRoutes = validateMissingRoutes();
  const consistencyIssues = validateRouteConsistency();

  const hasErrors = conflicts.length > 0 || 
                    consistencyIssues.length > 0 || 
                    missingRoutes.issue;

  const hasCriticalIssues = protectionIssues.some(i => i.severity !== 'low');

  return {
    timestamp: new Date().toISOString(),
    status: hasErrors ? 'INVALID' : (hasCriticalIssues ? 'WARNING' : 'VALID'),
    validation: {
      conflicts: {
        count: conflicts.length,
        items: conflicts
      },
      protectionIssues: {
        count: protectionIssues.length,
        items: protectionIssues
      },
      consistencyIssues: {
        count: consistencyIssues.length,
        items: consistencyIssues
      },
      routeCount: missingRoutes
    },
    summary: {
      totalErrors: conflicts.length + consistencyIssues.length,
      totalWarnings: protectionIssues.filter(i => i.severity === 'low').length,
      isProduction: process.env.NODE_ENV === 'production'
    }
  };
};

export {
  detectRouteConflicts,
  validateRouteProtection,
  validateMissingRoutes,
  validateRouteConsistency,
  buildValidationReport,
  normalizeRoute
};
