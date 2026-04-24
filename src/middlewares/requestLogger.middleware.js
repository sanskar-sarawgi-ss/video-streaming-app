import logger from '../utils/logger.js';

const requestLogger = (req, res, next) => {
  const { method, url, body } = req;

  // Mask sensitive information
  const maskedBody = maskSensitiveData(body);

  logger.info(`${method} ${url} - Body: ${JSON.stringify(maskedBody)}`);

  next();
};

const maskSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveKeys = ['password', 'token', 'secret', 'refreshToken', 'accessToken'];
  const masked = { ...data };

  for (const key of sensitiveKeys) {
    if (masked[key]) {
      masked[key] = '***';
    }
  }

  return masked;
};

export default requestLogger;