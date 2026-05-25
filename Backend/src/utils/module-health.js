const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const serviceDir = path.join(__dirname, '../services');

const safeLoadService = (name) => {
  try {
    const servicePath = path.join(serviceDir, `${name}.service.js`);
    const cachedModule = require.cache[require.resolve(servicePath)];
    const moduleRef = cachedModule?.exports;

    return {
      name,
      loaded: !!cachedModule,
      keys: moduleRef && typeof moduleRef === 'object' ? Object.keys(moduleRef).slice(0, 12) : [],
      error: null
    };
  } catch (error) {
    logger.warn({
      tag: 'SERVICE_FAILED',
      service: name,
      message: error.message
    });

    return {
      name,
      loaded: false,
      keys: [],
      error: error.message
    };
  }
};

const getServiceFiles = () => {
  try {
    return fs.readdirSync(serviceDir)
      .filter((file) => file.endsWith('.service.js'))
      .sort();
  } catch (error) {
    return [];
  }
};

const buildDependencyGraph = () => {
  const files = getServiceFiles();
  const graph = {};

  files.forEach((file) => {
    const source = fs.readFileSync(path.join(serviceDir, file), 'utf8');
    const serviceName = file.replace('.service.js', '');
    const requires = Array.from(source.matchAll(/require\(['"]\.\/([a-z-]+)\.service['"]\)/g))
      .map((match) => match[1]);

    graph[serviceName] = requires;
  });

  return graph;
};

const detectCircularDependencies = (graph) => {
  const visited = new Set();
  const stack = new Set();
  const cycles = [];

  const visit = (node, trail = []) => {
    if (stack.has(node)) {
      const cycleStartIndex = trail.indexOf(node);
      cycles.push(trail.slice(cycleStartIndex).concat(node));
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    stack.add(node);

    const neighbors = graph[node] || [];
    neighbors.forEach((neighbor) => visit(neighbor, trail.concat(node)));

    stack.delete(node);
  };

  Object.keys(graph).forEach((node) => visit(node));

  return cycles;
};

const buildModuleHealthReport = () => {
  const serviceFiles = getServiceFiles();
  const serviceLoadStates = serviceFiles.map((file) => safeLoadService(file.replace('.service.js', '')));
  const dependencyGraph = buildDependencyGraph();
  const circularDependencies = detectCircularDependencies(dependencyGraph);

  const loadedCount = serviceLoadStates.filter((service) => service.loaded).length;

  return {
    timestamp: new Date().toISOString(),
    status: circularDependencies.length === 0 ? 'HEALTHY' : 'DEGRADED',
    services: {
      total: serviceFiles.length,
      loaded: loadedCount,
      states: serviceLoadStates
    },
    configs: {
      nodeEnv: process.env.NODE_ENV || 'development',
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasMongoUri: !!process.env.MONGODB_URI
    },
    dependencyGraph: {
      nodes: Object.keys(dependencyGraph).length,
      edges: Object.values(dependencyGraph).reduce((sum, items) => sum + items.length, 0),
      graph: dependencyGraph
    },
    circularWarnings: circularDependencies.map((cycle) => ({
      path: cycle,
      message: `Circular dependency detected: ${cycle.join(' -> ')}`
    }))
  };
};

module.exports = {
  buildModuleHealthReport
};
