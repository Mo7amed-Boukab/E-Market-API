const express = require('express');
const path = require('path');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandlerMiddleware');
const notFound = require('./middlewares/notFoundMiddleware');
const requestLogger = require('./middlewares/loggerMiddleware');
const { monitoringMiddleware, client } = require('./middlewares/monitoringMiddleware');

// routes
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const categoryRouter = require("./routes/category");
const productRouter = require("./routes/product");
const cartRouter = require("./routes/cart");
const orderRouter = require("./routes/order");
const couponRouter = require("./routes/coupon");
const paymentRouter = require("./routes/payment");
const stripeConnectRouter = require("./routes/stripeConnect");
const sellerPayoutRouter = require("./routes/sellerPayout");
const reviewRouter = require("./routes/review");

const app = express();

// Lire JSON
app.use(express.json());

// Servir les fichiers statiques (images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Log des requêtes
app.use(requestLogger);

// Monitoring 
app.use((req, res, next) => {
  if (req.path === '/metrics') return next();
  monitoringMiddleware(req, res, next);
});

// Routes API
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/coupons", couponRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/stripe-connect", stripeConnectRouter);
app.use("/api/v1/seller-payouts", sellerPayoutRouter);
app.use("/api/v1/reviews", reviewRouter);

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
