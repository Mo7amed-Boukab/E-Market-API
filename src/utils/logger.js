const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(
      (info) =>
        `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`
    )
  ),
  transports: [
    // Log dans la console
    new transports.Console(),
    // Log dans un fichier (toutes les infos)
    new transports.File({ filename: 'logs/app.log' }),
    // Log les erreurs uniquement
    new transports.File({ filename: 'logs/errors.log', level: 'error' }),
  ],
});

module.exports = logger;
