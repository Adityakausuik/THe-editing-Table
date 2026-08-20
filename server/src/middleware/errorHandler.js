export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = Number(error.statusCode || error.status || 500);
  if (error.name === "MulterError" && error.code === "LIMIT_FILE_SIZE") statusCode = 413;
  if (error.name === "ValidationError" || error.name === "CastError") statusCode = 400;
  const isProduction = process.env.NODE_ENV === "production";
  const message = error.message || "Internal server error";

  if (statusCode >= 500) {
    console.error({
      level: "error",
      method: req.method,
      path: req.originalUrl,
      statusCode,
      message
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && isProduction ? "Internal server error" : message,
    data: null,
    ...(isProduction ? {} : { stack: error.stack })
  });
}
