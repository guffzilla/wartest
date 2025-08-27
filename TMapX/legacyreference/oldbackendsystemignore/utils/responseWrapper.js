/**
 * Standardized API Response Wrapper
 * Ensures consistent response format across all endpoints
 */

class ApiResponse {
  /**
   * Send successful response
   * @param {Response} res - Express response object
   * @param {any} data - Data to send
   * @param {string} message - Optional success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data = null, message = null, statusCode = 200) {
    const response = {
      success: true,
      data
    };
    
    if (message) {
      response.message = message;
    }
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {Response} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 400)
   * @param {any} details - Optional error details
   */
  static error(res, message = 'An error occurred', statusCode = 400, details = null) {
    const response = {
      success: false,
      error: message
    };
    
    if (details && process.env.NODE_ENV === 'development') {
      response.details = details;
    }
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   * @param {Response} res - Express response object
   * @param {Array} data - Data array
   * @param {Object} pagination - Pagination info
   * @param {string} message - Optional message
   */
  static paginated(res, data, pagination, message = null) {
    const response = {
      success: true,
      data,
      pagination: {
        page: pagination.page || 1,
        pages: pagination.pages || 1,
        total: pagination.total || data.length,
        limit: pagination.limit || data.length
      }
    };
    
    if (message) {
      response.message = message;
    }
    
    return res.status(200).json(response);
  }

  /**
   * Send created response (201)
   * @param {Response} res - Express response object
   * @param {any} data - Created resource data
   * @param {string} message - Optional success message
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Send no content response (204)
   * @param {Response} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Common error responses
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, message, 403);
  }

  static validationError(res, message = 'Validation failed', details = null) {
    return this.error(res, message, 422, details);
  }

  static serverError(res, message = 'Internal server error', details = null) {
    return this.error(res, message, 500, details);
  }
}

module.exports = ApiResponse; 