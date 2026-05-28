import 'dotenv/config';
import dns from 'dns';
import http from 'http';
import app from './src/app.js';
import { initSocket } from './src/sockets/index.js';
import { connectDB, closeDB, mongoose } from './src/config/db.js';
import logger from './src/config/logger.js';
import { API_ROUTES, getAllApiRoutes } from './src/constants/api-routes.js';
import { buildValidationReport } from './src/utils/route-validator.js';
import { generateDeploymentHealthReport } from './src/utils/deployment-health.js';
import { buildModuleHealthReport } from './src/utils/module-health.js';
import { printRegisteredRoutes } from './src/utils/routes-printer.js';
import liveInterviewService from './src/services/live-interview.service.js';
import { cleanupDatabaseSessions } from './src/utils/mongo-cleanup.js';

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
let roomLifecycleSweepTimer = null;

server.on('error', (error) => {
  logger.error(`HTTP server failed to start: ${error.message}`);
  process.exit(1);
});

// Initialize Socket.IO
initSocket(server);

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully.`);
  try {
    if (roomLifecycleSweepTimer) {
      clearInterval(roomLifecycleSweepTimer);
      roomLifecycleSweepTimer = null;
    }
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
connectDB().then(async () => {
  // Run self-healing database session cleanup on startup
  await cleanupDatabaseSessions().catch((err) => {
    logger.error(`[Startup Cleanup] Failed: ${err.message}`);
  });

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

    roomLifecycleSweepTimer = setInterval(() => {
      liveInterviewService.expireStaleRooms().catch((error) => {
        logger.warn(`Live interview lifecycle sweep failed: ${error.message}`);
      });
    }, 5 * 60 * 1000);
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
