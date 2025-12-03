const express = require('express');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandlerMiddleware');
const notFound = require('./middlewares/notFoundMiddleware');
const requestLogger = require('./middlewares/loggerMiddleware');
const { monitoringMiddleware, client } = require('./middlewares/monitoringMiddleware');

// routes
const usersRouter = require("./routes/users");
const categoryRouter = require("./routes/category");
const productRouter = require("./routes/product");

const app = express();

// Lire JSON
app.use(express.json());

// Log des requêtes
app.use(requestLogger);

// Monitoring 
app.use((req, res, next) => {
  if (req.path === '/metrics') return next();
  monitoringMiddleware(req, res, next);
});

app.use("/api/v1/users", usersRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Endpoint Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// 404 — Not found
app.use(notFound);

// Global error handler 
app.use(errorHandler);

module.exports = app;
