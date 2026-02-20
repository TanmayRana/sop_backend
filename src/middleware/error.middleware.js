const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map(val => val.message)
      .join(', ');
    error = {
      statusCode: 400,
      message,
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = {
      statusCode: 400,
      message,
    };
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      statusCode: 404,
      message,
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      statusCode: 401,
      message,
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      statusCode: 401,
      message,
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
  });
};

export default errorHandler;
