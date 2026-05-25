const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { errorConverter, errorHandler } = require('./middleware/error.middleware');
const apiLimiter = require('./middleware/rate-limiter');
const { routeNotFoundHandler } = require('./middleware/route-logger.middleware');
const { API_PREFIXES } = require('./constants/api-routes');

const routes = require('./routes');
const logger = require('./config/logger');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());

// Logging Middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all requests
app.use(apiLimiter);

// Serve generated audio assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global root-level health check (for load balancers & container orchestration)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use(API_PREFIXES.unversioned, routes);
app.use(API_PREFIXES.versioned, routes);

// 404 handler
app.use(routeNotFoundHandler);

// Error handling middleware
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
