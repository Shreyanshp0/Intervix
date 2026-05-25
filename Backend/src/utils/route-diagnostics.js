const { buildQualifiedRoutes, ROUTE_DEFINITIONS } = require('../constants/api-routes');

const normalizePath = (value = '') => {
  if (!value) return '/';
  return value.endsWith('/') && value.length > 1 ? value.slice(0, -1) : value;
};

const segmentize = (value = '') => normalizePath(value).split('/').filter(Boolean);

const scoreRouteMatch = (requestedPath, candidatePath) => {
  const requested = segmentize(requestedPath);
  const candidate = segmentize(candidatePath);
  const maxLength = Math.max(requested.length, candidate.length, 1);

  let score = 0;
  for (let index = 0; index < Math.min(requested.length, candidate.length); index += 1) {
    const left = requested[index];
    const right = candidate[index];

    if (left === right) {
      score += 3;
      continue;
    }

    if (right.startsWith(':')) {
      score += 2;
      continue;
    }

    if (left.includes(right) || right.includes(left)) {
      score += 1;
    }
  }

  return score / maxLength;
};

const getClosestRoute = (requestedPath) => {
  const routes = buildQualifiedRoutes();
  const normalizedRequestedPath = normalizePath(requestedPath);

  return routes
    .map((route) => ({
      ...route,
      score: scoreRouteMatch(normalizedRequestedPath, route.fullPath)
    }))
    .sort((left, right) => right.score - left.score)[0] || null;
};

const buildRouteHealthReport = () => {
  const qualifiedRoutes = buildQualifiedRoutes();
  const collisionMap = qualifiedRoutes.reduce((acc, route) => {
    const key = `${route.method} ${route.fullPath}`;
    acc[key] = acc[key] || [];
    acc[key].push(route);
    return acc;
  }, {});

  const collisions = Object.entries(collisionMap)
    .filter(([, entries]) => entries.length > 1)
    .map(([signature, entries]) => ({
      signature,
      count: entries.length,
      roles: [...new Set(entries.flatMap((entry) => entry.roles))]
    }));

  return {
    summary: {
      canonicalRouteCount: ROUTE_DEFINITIONS.length,
      registeredRouteCount: qualifiedRoutes.length,
      protectedRouteCount: qualifiedRoutes.filter((route) => route.protected).length,
      collisionCount: collisions.length
    },
    collisions,
    routes: qualifiedRoutes
  };
};

module.exports = {
  buildRouteHealthReport,
  getClosestRoute,
  normalizePath
};
