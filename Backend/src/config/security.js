import logger from './logger.js';

const splitCsv = (value = '') => String(value)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const uniq = (items) => [...new Set(items.filter(Boolean))];

const getTrustedOrigins = () => {
  const configured = splitCsv(process.env.TRUSTED_ORIGINS || process.env.CORS_ORIGINS || '');
  const appDomain = process.env.APP_DOMAIN || process.env.DOMAIN || '';
  const isProduction = process.env.NODE_ENV === 'production';
  const domainOrigins = appDomain && appDomain !== 'localhost'
    ? isProduction ? [`https://${appDomain}`] : [`https://${appDomain}`, `http://${appDomain}`]
    : [];

  const localDevOrigins = isProduction ? [] : [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  ];

  const baseOrigins = uniq([
    process.env.FRONTEND_URL,
    process.env.PUBLIC_APP_URL,
    process.env.APP_PUBLIC_URL,
    process.env.VITE_APP_URL,
    ...domainOrigins,
    ...localDevOrigins,
    ...configured
  ]);

  if (!isProduction) {
    return baseOrigins;
  }

  return baseOrigins
    .filter((origin) => origin.startsWith('https://'))
    .filter((origin) => !origin.includes('localhost') && !origin.includes('127.0.0.1'));
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
        connectSrc: isProduction
          ? ["'self'", 'https:', 'wss:', 'blob:', ...trustedOrigins]
          : ["'self'", 'http:', 'https:', 'ws:', 'wss:', 'blob:', ...trustedOrigins],
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

export {
  getTrustedOrigins,
  getHelmetOptions,
  corsOptions
};
