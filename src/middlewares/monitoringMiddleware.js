const client = require('prom-client');

// Histogramme pour mesurer le temps de réponse des requêtes
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000], // en ms
});

const monitoringMiddleware = (req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer(); 

  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode });
  });

  next();
};

module.exports = { monitoringMiddleware, client };
