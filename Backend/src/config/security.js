const logger = require('./logger');

const splitCsv = (value = '') => String(value)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const uniq = (items) => [...new Set(items.filter(Boolean))];

const getTrustedOrigins = () => {
  const configured = splitCsv(process.env.TRUSTED_ORIGINS || process.env.CORS_ORIGINS || '');
  return uniq([
    process.env.FRONTEND_URL,
    process.env.PUBLIC_APP_URL,
    process.env.APP_PUBLIC_URL,
    process.env.VITE_APP_URL,
    'http://13.127.10.169',
    'http://13.127.10.169:5000',
    'https://13.127.10.169',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    ...configured
  ]);
};

const getHelmetOptions = () => {
  const trustedOrigins = getTrustedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';
  const enableIsolation = String(process.env.ENABLE_CROSS_ORIGIN_ISOLATION || 'false').toLowerCase() === 'true';

  logger.info({
    tag: 'HELMET',
    trustedOrigins,
    crossOriginIsolation: enableIsolation,
    production: isProduction
  });

  return {
    frameguard: false,
    crossOriginEmbedderPolicy: enableIsolation ? { policy: 'credentialless' } : false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'", ...trustedOrigins],
        frameSrc: ["'self'", ...trustedOrigins, 'blob:'],
        childSrc: ["'self'", 'blob:'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:'],
        scriptSrcElem: ["'self'", "'unsafe-inline'", 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', ...trustedOrigins],
        connectSrc: [
          "'self'",
          'http:',
          'https:',
          'ws:',
          'wss:',
          'blob:',
          ...trustedOrigins
        ],
        mediaSrc: ["'self'", 'blob:', 'data:', 'mediastream:', ...trustedOrigins],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null
      }
    }
  };
};

const corsOptions = {
  origin(origin, callback) {
    const trustedOrigins = getTrustedOrigins();
    if (!origin || trustedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn({ tag: 'CSP', message: 'Blocked untrusted CORS origin', origin });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = {
  getTrustedOrigins,
  getHelmetOptions,
  corsOptions
};
