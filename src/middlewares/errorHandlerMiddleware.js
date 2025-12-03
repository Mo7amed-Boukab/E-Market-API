const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`, { stack: err.stack });

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    statusCode,
    message: err.message || "Internal Server Error",
    ...(err.errors && { errors: err.errors }),
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
};

module.exports = errorHandler;
