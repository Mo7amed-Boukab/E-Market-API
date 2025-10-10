const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(err.errors && { errors: err.errors }), 
  });
};
