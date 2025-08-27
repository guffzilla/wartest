/**
 * Centralized Error Handling Middleware
 * Standardizes error responses across all API routes
 */

// Standard error response format
const createErrorResponse = (statusCode, message, details = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.details = details;
  }
  
  return response;
};

// Common error messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  RATE_LIMIT: 'Too many requests',
  MAINTENANCE: 'Service temporarily unavailable'
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error Handler:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack?.split('\n')[0]
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(createErrorResponse(400, ERROR_MESSAGES.VALIDATION_ERROR, err.errors));
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json(createErrorResponse(400, 'Invalid ID format'));
  }
  
  if (err.code === 11000) {
    return res.status(409).json(createErrorResponse(409, 'Resource already exists'));
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(createErrorResponse(401, 'Invalid token'));
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(createErrorResponse(401, 'Token expired'));
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.message || ERROR_MESSAGES.SERVER_ERROR;
  
  res.status(statusCode).json(createErrorResponse(statusCode, message));
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Success response helper
const createSuccessResponse = (data, message = 'Success') => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString()
});

module.exports = {
  errorHandler,
  asyncHandler,
  createErrorResponse,
  createSuccessResponse,
  ERROR_MESSAGES
};
