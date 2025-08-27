/**
 * Validation Utilities
 * Centralized validation functions for consistent input validation
 */

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class Validators {
  /**
   * Validate clan data
   */
  static validateClanData(data) {
    const errors = [];

    // Name validation
    if (!data.name || typeof data.name !== 'string') {
      errors.push({ field: 'name', message: 'Clan name is required' });
    } else if (data.name.trim().length < 3) {
      errors.push({ field: 'name', message: 'Clan name must be at least 3 characters long' });
    } else if (data.name.trim().length > 50) {
      errors.push({ field: 'name', message: 'Clan name must be 50 characters or less' });
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(data.name.trim())) {
      errors.push({ field: 'name', message: 'Clan name contains invalid characters' });
    }

    // Tag validation
    if (!data.tag || typeof data.tag !== 'string') {
      errors.push({ field: 'tag', message: 'Clan tag is required' });
    } else if (data.tag.trim().length < 2) {
      errors.push({ field: 'tag', message: 'Clan tag must be at least 2 characters long' });
    } else if (data.tag.trim().length > 6) {
      errors.push({ field: 'tag', message: 'Clan tag must be 6 characters or less' });
    } else if (!/^[A-Z0-9]+$/.test(data.tag.trim().toUpperCase())) {
      errors.push({ field: 'tag', message: 'Clan tag can only contain letters and numbers' });
    }

    // Description validation
    if (data.description && data.description.length > 1000) {
      errors.push({ field: 'description', message: 'Description must be 1000 characters or less' });
    }

    // Game type validation
    const validGameTypes = ['wc1', 'wc2', 'wc3', 'wc12'];
    if (!data.gameType || !validGameTypes.includes(data.gameType)) {
      errors.push({ field: 'gameType', message: 'Invalid game type' });
    }

    // Recruitment type validation
    const validRecruitmentTypes = ['open', 'application', 'invite'];
    if (data.recruitmentType && !validRecruitmentTypes.includes(data.recruitmentType)) {
      errors.push({ field: 'recruitmentType', message: 'Invalid recruitment type' });
    }

    // Player ID validation
    if (!data.playerId) {
      errors.push({ field: 'playerId', message: 'Player selection is required' });
    } else if (!this.isValidObjectId(data.playerId)) {
      errors.push({ field: 'playerId', message: 'Invalid player ID format' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user input for potential security issues
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  /**
   * Validate MongoDB ObjectId
   */
  static isValidObjectId(id) {
    const mongoose = require('mongoose');
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate username format
   */
  static isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    
    const trimmed = username.trim();
    return (
      trimmed.length >= 3 &&
      trimmed.length <= 20 &&
      /^[a-zA-Z0-9_-]+$/.test(trimmed)
    );
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password) {
    if (!password || typeof password !== 'string') return false;
    
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    );
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file, allowedTypes = [], maxSize = null) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (maxSize && file.size > maxSize) {
      errors.push(`File size too large. Maximum size: ${this.formatFileSize(maxSize)}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Rate limiting validation
   */
  static checkRateLimit(requests, timeWindow, maxRequests) {
    const now = Date.now();
    const validRequests = requests.filter(time => now - time < timeWindow);
    return validRequests.length < maxRequests;
  }
}

module.exports = { Validators, ValidationError }; 