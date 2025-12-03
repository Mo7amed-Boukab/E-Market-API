const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const now = new Date().toLocaleString();
  res.on("finish", () => {
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${now}`;
    res.statusCode >= 400 ? logger.warn(message) : logger.info(message);
  });
  next();
};

module.exports = requestLogger;
