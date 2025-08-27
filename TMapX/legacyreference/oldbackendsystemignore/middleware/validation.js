/**
 * Centralized Validation Middleware
 * Standardizes input validation across all API endpoints
 */

const ResponseHelper = require('../utils/responseHelper');

class ValidationMiddleware {
  /**
   * Validate required fields
   */
  static requireFields(fields) {
    return (req, res, next) => {
      const missing = [];
      
      for (const field of fields) {
        if (!req.body[field] && req.body[field] !== 0) {
          missing.push(field);
        }
      }
      
      if (missing.length > 0) {
        return ResponseHelper.validationError(res, `Missing required fields: ${missing.join(', ')}`);
      }
      
      next();
    };
  }

  /**
   * Validate field types
   */
  static validateTypes(typeMap) {
    return (req, res, next) => {
      const errors = [];
      
      for (const [field, expectedType] of Object.entries(typeMap)) {
        if (req.body[field] !== undefined) {
          const actualType = typeof req.body[field];
          
          if (actualType !== expectedType) {
            errors.push(`${field} must be of type ${expectedType}, got ${actualType}`);
          }
        }
      }
      
      if (errors.length > 0) {
        return ResponseHelper.validationError(res, 'Type validation failed', errors);
      }
      
      next();
    };
  }

  /**
   * Validate string length
   */
  static validateStringLength(field, minLength = 1, maxLength = 1000) {
    return (req, res, next) => {
      const value = req.body[field];
      
      if (value !== undefined && typeof value === 'string') {
        if (value.length < minLength) {
          return ResponseHelper.validationError(res, `${field} must be at least ${minLength} characters long`);
        }
        
        if (value.length > maxLength) {
          return ResponseHelper.validationError(res, `${field} must be no more than ${maxLength} characters long`);
        }
      }
      
      next();
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(field = 'email') {
    return (req, res, next) => {
      const email = req.body[field];
      
      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
          return ResponseHelper.validationError(res, `Invalid email format for ${field}`);
        }
      }
      
      next();
    };
  }

  /**
   * Validate URL format
   */
  static validateUrl(field) {
    return (req, res, next) => {
      const url = req.body[field];
      
      if (url !== undefined) {
        try {
          new URL(url);
        } catch (error) {
          return ResponseHelper.validationError(res, `Invalid URL format for ${field}`);
        }
      }
      
      next();
    };
  }

  /**
   * Validate numeric range
   */
  static validateNumericRange(field, min = null, max = null) {
    return (req, res, next) => {
      const value = req.body[field];
      
      if (value !== undefined) {
        const num = Number(value);
        
        if (isNaN(num)) {
          return ResponseHelper.validationError(res, `${field} must be a valid number`);
        }
        
        if (min !== null && num < min) {
          return ResponseHelper.validationError(res, `${field} must be at least ${min}`);
        }
        
        if (max !== null && num > max) {
          return ResponseHelper.validationError(res, `${field} must be no more than ${max}`);
        }
      }
      
      next();
    };
  }

  /**
   * Validate enum values
   */
  static validateEnum(field, allowedValues) {
    return (req, res, next) => {
      const value = req.body[field];
      
      if (value !== undefined && !allowedValues.includes(value)) {
        return ResponseHelper.validationError(res, `${field} must be one of: ${allowedValues.join(', ')}`);
      }
      
      next();
    };
  }

  /**
   * Validate array length
   */
  static validateArrayLength(field, minLength = 0, maxLength = 100) {
    return (req, res, next) => {
      const value = req.body[field];
      
      if (value !== undefined && Array.isArray(value)) {
        if (value.length < minLength) {
          return ResponseHelper.validationError(res, `${field} must have at least ${minLength} items`);
        }
        
        if (value.length > maxLength) {
          return ResponseHelper.validationError(res, `${field} must have no more than ${maxLength} items`);
        }
      }
      
      next();
    };
  }

  /**
   * Validate file upload
   */
  static validateFile(field, allowedTypes = [], maxSize = 5 * 1024 * 1024) { // 5MB default
    return (req, res, next) => {
      const file = req.files?.[field] || req.file;
      
      if (file) {
        // Check file size
        if (file.size > maxSize) {
          return ResponseHelper.validationError(res, `${field} file size must be less than ${maxSize / (1024 * 1024)}MB`);
        }
        
        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
          return ResponseHelper.validationError(res, `${field} must be one of: ${allowedTypes.join(', ')}`);
        }
      }
      
      next();
    };
  }

  /**
   * Validate MongoDB ObjectId
   */
  static validateObjectId(field) {
    return (req, res, next) => {
      const value = req.params[field] || req.body[field];
      
      if (value !== undefined) {
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        
        if (!objectIdRegex.test(value)) {
          return ResponseHelper.validationError(res, `${field} must be a valid ObjectId`);
        }
      }
      
      next();
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination() {
    return (req, res, next) => {
      const { page, limit } = req.query;
      
      if (page !== undefined) {
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
          return ResponseHelper.validationError(res, 'Page must be a positive integer');
        }
      }
      
      if (limit !== undefined) {
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
          return ResponseHelper.validationError(res, 'Limit must be between 1 and 1000');
        }
      }
      
      next();
    };
  }

  /**
   * Validate date range
   */
  static validateDateRange(startField, endField) {
    return (req, res, next) => {
      const startDate = req.body[startField];
      const endDate = req.body[endField];
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return ResponseHelper.validationError(res, 'Invalid date format');
        }
        
        if (start >= end) {
          return ResponseHelper.validationError(res, `${startField} must be before ${endField}`);
        }
      }
      
      next();
    };
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(fields) {
    return (req, res, next) => {
      for (const field of fields) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          // Basic HTML sanitization - remove script tags and dangerous attributes
          req.body[field] = req.body[field]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/javascript:/gi, '');
        }
      }
      
      next();
    };
  }

  /**
   * Trim whitespace from string fields
   */
  static trimFields(fields) {
    return (req, res, next) => {
      for (const field of fields) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          req.body[field] = req.body[field].trim();
        }
      }
      
      next();
    };
  }

  /**
   * Convert fields to lowercase
   */
  static toLowerCase(fields) {
    return (req, res, next) => {
      for (const field of fields) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          req.body[field] = req.body[field].toLowerCase();
        }
      }
      
      next();
    };
  }

  /**
   * Convert fields to uppercase
   */
  static toUpperCase(fields) {
    return (req, res, next) => {
      for (const field of fields) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          req.body[field] = req.body[field].toUpperCase();
        }
      }
      
      next();
    };
  }
}

module.exports = ValidationMiddleware;
