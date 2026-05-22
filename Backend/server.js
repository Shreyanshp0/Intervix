require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/sockets');
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5000;

logger.info(`Gemini Key Exists: ${Boolean(process.env.GEMINI_API_KEY)}`);
if (process.env.GEMINI_MODEL) {
  logger.info(`Gemini Model Configured: ${process.env.GEMINI_MODEL}`);
}

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Connect to Database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  logger.error(`Database connection failed: ${err.message}`);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
