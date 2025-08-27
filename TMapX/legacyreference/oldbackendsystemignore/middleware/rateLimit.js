/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and ensures fair usage
 */

const ResponseHelper = require('../utils/responseHelper');

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map();

class RateLimitMiddleware {
  /**
   * Create rate limiter middleware
   * @param {Object} options - Rate limiting options
   * @param {number} options.windowMs - Time window in milliseconds
   * @param {number} options.maxRequests - Maximum requests per window
   * @param {string} options.keyGenerator - Function to generate rate limit key
   * @param {boolean} options.skipSuccessfulRequests - Skip rate limiting for successful requests
   * @param {boolean} options.skipFailedRequests - Skip rate limiting for failed requests
   */
  static createRateLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes default
      maxRequests = 100, // 100 requests per window default
      keyGenerator = (req) => req.ip, // Use IP by default
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return (req, res, next) => {
      const key = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      
      if (!entry) {
        entry = {
          requests: [],
          resetTime: now + windowMs
        };
        rateLimitStore.set(key, entry);
      }
      
      // Clean old requests outside the window
      entry.requests = entry.requests.filter(timestamp => now - timestamp < windowMs);
      
      // Check if rate limit exceeded
      if (entry.requests.length >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
        
        return ResponseHelper.rateLimit(res, `Rate limit exceeded. Try again in ${retryAfter} seconds.`);
      }
      
      // Add current request timestamp
      entry.requests.push(now);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - entry.requests.length);
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      
      // Store response status for conditional rate limiting
      const originalSend = res.send;
      res.send = function(data) {
        const statusCode = res.statusCode;
        
        // Apply conditional rate limiting
        if (skipSuccessfulRequests && statusCode < 400) {
          // Remove the request from rate limiting for successful requests
          const index = entry.requests.indexOf(now);
          if (index > -1) {
            entry.requests.splice(index, 1);
          }
        }
        
        if (skipFailedRequests && statusCode >= 400) {
          // Remove the request from rate limiting for failed requests
          const index = entry.requests.indexOf(now);
          if (index > -1) {
            entry.requests.splice(index, 1);
          }
        }
        
        originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Strict rate limiter for sensitive endpoints
   */
  static strict() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 requests per 15 minutes
      keyGenerator: (req) => `strict:${req.ip}`
    });
  }

  /**
   * Standard rate limiter for general endpoints
   */
  static standard() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 requests per 15 minutes
      keyGenerator: (req) => `standard:${req.ip}`
    });
  }

  /**
   * Generous rate limiter for public endpoints
   */
  static generous() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // 1000 requests per 15 minutes
      keyGenerator: (req) => `generous:${req.ip}`
    });
  }

  /**
   * User-specific rate limiter
   */
  static userSpecific() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 200, // 200 requests per 15 minutes
      keyGenerator: (req) => {
        const userId = req.user?._id || req.user?.id || 'anonymous';
        return `user:${userId}`;
      }
    });
  }

  /**
   * API key rate limiter
   */
  static apiKey() {
    return this.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 1000, // 1000 requests per hour
      keyGenerator: (req) => {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey || 'no-key';
        return `apikey:${apiKey}`;
      }
    });
  }

  /**
   * Authentication endpoint rate limiter
   */
  static auth() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
      keyGenerator: (req) => `auth:${req.ip}`,
      skipSuccessfulRequests: true // Don't count successful logins
    });
  }

  /**
   * File upload rate limiter
   */
  static fileUpload() {
    return this.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 uploads per hour
      keyGenerator: (req) => `upload:${req.user?._id || req.ip}`
    });
  }

  /**
   * Search endpoint rate limiter
   */
  static search() {
    return this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 searches per minute
      keyGenerator: (req) => `search:${req.user?._id || req.ip}`
    });
  }

  /**
   * Admin endpoint rate limiter
   */
  static admin() {
    return this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50, // 50 admin requests per minute
      keyGenerator: (req) => `admin:${req.user?._id || req.ip}`
    });
  }

  /**
   * Clear rate limit for a specific key
   */
  static clearRateLimit(key) {
    rateLimitStore.delete(key);
  }

  /**
   * Clear all rate limits
   */
  static clearAllRateLimits() {
    rateLimitStore.clear();
  }

  /**
   * Get rate limit statistics
   */
  static getStats() {
    const stats = {
      totalKeys: rateLimitStore.size,
      totalRequests: 0,
      activeWindows: 0
    };

    const now = Date.now();
    
    for (const [key, entry] of rateLimitStore) {
      stats.totalRequests += entry.requests.length;
      
      if (entry.resetTime > now) {
        stats.activeWindows++;
      }
    }

    return stats;
  }

  /**
   * Clean up expired rate limit entries
   */
  static cleanup() {
    const now = Date.now();
    
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  RateLimitMiddleware.cleanup();
}, 5 * 60 * 1000);

module.exports = RateLimitMiddleware;
