import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, stack }) => {
      return `[${new Date().toISOString()}] [${level}]: ${message} ${stack || ''}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize()
      )
    }),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

export default logger;