require('dotenv').config();
const dns = require('dns');
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/sockets');
const { connectDB, closeDB, mongoose } = require('./src/config/db');
const logger = require('./src/config/logger');
const { API_ROUTES, getAllApiRoutes } = require('./src/constants/api-routes');
const { buildValidationReport } = require('./src/utils/route-validator');
const { generateDeploymentHealthReport } = require('./src/utils/deployment-health');
const { buildModuleHealthReport } = require('./src/utils/module-health');
const { printRegisteredRoutes } = require('./src/utils/routes-printer');

const PORT = process.env.PORT || 5000;

// Prefer IPv4 globally to avoid Windows DNS issues
if (typeof dns.setDefaultResultOrder === 'function') {
  try { dns.setDefaultResultOrder('ipv4first'); } catch (e) { /* best-effort */ }
}

logger.info(`Gemini Key Exists: ${Boolean(process.env.GEMINI_API_KEY)}`);
if (process.env.GEMINI_MODEL) {
  logger.info(`Gemini Model Configured: ${process.env.GEMINI_MODEL}`);
}

const validateStartupConfiguration = () => {
  const issues = [];

  if (!process.env.JWT_SECRET) {
    issues.push('JWT_SECRET is not configured');
  }

  if (!process.env.MONGODB_URI) {
    issues.push('MONGODB_URI is not configured');
  }

  if (!API_ROUTES?.auth?.login || !API_ROUTES?.candidate?.me || !API_ROUTES?.recruiter?.jobs || !API_ROUTES?.resume?.me) {
    issues.push('API route constants are incomplete');
  }

  return issues;
};

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully.`);
  try {
    server.close(() => {
      logger.info('HTTP server closed');
    });
    await closeDB();
  } catch (e) {
    logger.error(`Error during shutdown: ${e.message}`);
  } finally {
    process.exit(0);
  }
};

// Connect to Database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);

    try {
      const startupIssues = validateStartupConfiguration();
      if (startupIssues.length) {
        logger.warn({ tag: 'STARTUP_VALIDATION', issues: startupIssues });
      }

      printRegisteredRoutes(app);

      const validationReport = buildValidationReport();
      logger.info({
        tag: 'ROUTE_VALIDATION_STARTUP',
        status: validationReport.status,
        totalRoutes: getAllApiRoutes().length,
        conflicts: validationReport.validation.conflicts.count,
        protectionIssues: validationReport.validation.protectionIssues.count,
        consistencyIssues: validationReport.validation.consistencyIssues.count
      });

      const deploymentReport = generateDeploymentHealthReport();
      logger.info({
        tag: 'DEPLOYMENT_HEALTH_STARTUP',
        status: deploymentReport.status,
        buildVersion: deploymentReport.buildVersion,
        environment: deploymentReport.deployment?.environment || process.env.NODE_ENV || 'development',
        containerized: deploymentReport.deployment?.containerized ?? false,
        consistency: deploymentReport.consistency.aligned ? 'ALIGNED' : 'DIVERGED'
      });

      const moduleReport = buildModuleHealthReport();
      logger.info({
        tag: 'MODULE_HEALTH_STARTUP',
        status: moduleReport.status,
        servicesLoaded: moduleReport.services.loaded,
        servicesTotal: moduleReport.services.total,
        circularWarnings: moduleReport.circularWarnings.length
      });

      logger.info('[ROUTES]');
      getAllApiRoutes().forEach((route) => logger.info(route));
    } catch (e) {
      logger.error(`Failed to log endpoints: ${e.message}`);
    }
  });
}).catch((err) => {
  logger.error(`Database connection failed: ${err.message}`);
  process.exit(1);
});

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err && err.message ? err.message : err}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err && err.message ? err.message : err}`);
});

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
