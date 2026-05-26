import winston from 'winston';

const isDev = process.env.NODE_ENV === 'development';

const consoleFormat = isDev
  ? winston.format.combine(winston.format.colorize(), winston.format.simple())
  : winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: consoleFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

export default logger;
