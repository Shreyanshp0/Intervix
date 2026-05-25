require('dotenv').config();
const dns = require('dns');
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/sockets');
const { connectDB, closeDB, mongoose } = require('./src/config/db');
const logger = require('./src/config/logger');
const env = require('./src/config/env');

const PORT = process.env.PORT || 5000;

// Prefer IPv4 globally to avoid Windows DNS issues
if (typeof dns.setDefaultResultOrder === 'function') {
  try { dns.setDefaultResultOrder('ipv4first'); } catch (e) { /* best-effort */ }
}

logger.info(`Gemini Key Exists: ${Boolean(process.env.GEMINI_API_KEY)}`);
if (process.env.GEMINI_MODEL) {
  logger.info(`Gemini Model Configured: ${process.env.GEMINI_MODEL}`);
}

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

const { printRegisteredRoutes } = require('./src/utils/routes-printer');

// Connect to Database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    try {
      printRegisteredRoutes(app);
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
