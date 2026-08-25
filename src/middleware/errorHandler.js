function errorHandler(err, req, res, next) {
  console.error(err);
  const isJwtError = err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError';
  const status = err.status || (isJwtError ? 401 : 500);
  const message = isJwtError ? 'Session expired or invalid. Please log in again.' : (err.message || 'Internal Server Error');
  res.status(status).json({
    success: false,
    message
  });
}

module.exports = errorHandler;

