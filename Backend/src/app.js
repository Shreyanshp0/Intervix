import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { errorConverter, errorHandler } from './middleware/error.middleware.js';
import apiLimiter from './middleware/rate-limiter.js';
import { routeNotFoundHandler, requestTimingMiddleware } from './middleware/route-logger.middleware.js';
import { API_BASE } from './constants/api-routes.js';
import { buildRouteHealthReport } from './utils/route-diagnostics.js';
import { generateDeploymentHealthReport } from './utils/deployment-health.js';
import { buildValidationReport } from './utils/route-validator.js';
import { buildModuleHealthReport } from './utils/module-health.js';
import { getHelmetOptions, corsOptions } from './config/security.js';
import routes from './routes/index.js';
import logger from './config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet(getHelmetOptions()));
app.use(cors(corsOptions));

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

// Request timing middleware for diagnostics
app.use(requestTimingMiddleware);

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

app.get('/health/api', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api',
    apiBase: API_BASE,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/socket', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'socket.io',
    path: '/socket.io',
    jwtRequired: true,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/webrtc', (req, res) => {
  const turnConfigured = Boolean(process.env.TURN_URL || process.env.VITE_TURN_URL);
  res.status(200).json({
    status: turnConfigured ? 'healthy' : 'degraded',
    service: 'webrtc',
    secureContextRequired: true,
    stunServers: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'],
    turnConfigured,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/nginx', (req, res) => {
  const forwardedProto = req.headers['x-forwarded-proto'] || req.protocol;
  res.status(200).json({
    status: forwardedProto === 'https' || process.env.NODE_ENV !== 'production' ? 'healthy' : 'degraded',
    service: 'nginx',
    forwardedProto,
    websocketPath: '/socket.io',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/routes', (req, res) => {
  try {
    const routeReport = buildRouteHealthReport();
    const deploymentReport = generateDeploymentHealthReport();
    const validationReport = buildValidationReport();

    res.status(200).json({
      status: 'ok',
      apiBase: API_BASE,
      deploymentVersion: deploymentReport.buildVersion,
      diagnosticsStatus: validationReport.status,
      routes: routeReport.routes.map((route) => ({
        method: route.method,
        path: route.path,
        protected: route.protected,
        roles: route.roles
      }))
    });
  } catch (error) {
    res.status(200).json({
      status: 'degraded',
      apiBase: API_BASE,
      deploymentVersion: 'unknown',
      diagnosticsStatus: 'error',
      error: error.message
    });
  }
});

app.get('/health/modules', (req, res) => {
  try {
    const moduleReport = buildModuleHealthReport();
    res.status(moduleReport.status === 'HEALTHY' ? 200 : 503).json(moduleReport);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

app.use(API_BASE, routes);

// 404 handler
app.use(routeNotFoundHandler);

// Error handling middleware
app.use(errorConverter);
app.use(errorHandler);

export default app;
