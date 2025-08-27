/**
 * Consolidated Authentication Middleware
 * 
 * This single file replaces all existing authentication middleware:
 * - backend/middleware/auth.js
 * - backend/middleware/unified-auth.js  
 * - backend/middleware/authCheck.js
 * - backend/middleware/ensureUsernameDefined.js
 * - backend/middleware/admin.js (auth parts)
 * 
 * Provides consistent authentication, role-based access control, and
 * username validation across the entire application.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthMiddleware {
  /**
   * Main authentication middleware
   * Checks if user is authenticated via session or JWT
   */
  static authenticate(req, res, next) {
    // Check session authentication first (most common for web)
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      // Ensure session consistency
      if (req.session && !req.session.isAuthenticated) {
        req.session.isAuthenticated = true;
        req.session.userId = req.user._id.toString();
      }
      return next();
    }
    
    // Check JWT authentication if enabled
    if (process.env.ENABLE_JWT === 'true') {
      const token = this.extractJWT(req);
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          
          // Validate token format and get user data
          if (decoded.id || decoded._id) {
            // Token contains user ID, fetch from database
            User.findById(decoded.id || decoded._id)
              .select('-password')
              .then(user => {
                if (user) {
                  req.user = user;
                  req.authMethod = 'jwt';
                  return next();
                } else {
                  return res.status(401).json({ error: 'User not found' });
                }
              })
              .catch(err => {
                console.error('JWT user lookup error:', err);
                return res.status(401).json({ error: 'Authentication failed' });
              });
            return; // Don't continue execution
          } else if (decoded.username) {
            // Legacy token format - use decoded data directly
            req.user = decoded;
            req.authMethod = 'jwt-legacy';
            return next();
          } else {
            return res.status(401).json({ error: 'Invalid token format' });
          }
        } catch (error) {
          // JWT verification failed, continue to session check
          console.log('JWT verification failed:', error.message);
        }
      }
    }
    
    // No valid authentication found
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  /**
   * Role-based access control middleware
   * @param {string|string[]} roles - Required role(s)
   */
  static requireRole(roles) {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
      // First ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Check if user has required role
      const userRole = req.user.role || 'user';
      if (!requiredRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: requiredRoles,
          current: userRole
        });
      }
      
      next();
    };
  }
  
  /**
   * Admin-only access middleware
   */
  static requireAdmin(req, res, next) {
    return this.requireRole('admin')(req, res, next);
  }
  
  /**
   * Admin or moderator access middleware
   */
  static requireAdminOrModerator(req, res, next) {
    return this.requireRole(['admin', 'moderator'])(req, res, next);
  }
  
  /**
   * Username setup requirement middleware
   * For API routes, returns 403 status
   * For page routes, redirects to username setup
   */
  static requireUsername(req, res, next) {
    // First ensure user is authenticated
    if (!req.user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      return res.redirect('/views/login.html');
    }
    
    // Check if username is defined
    if (!req.user.isUsernameDefined) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({
          error: 'Username setup required',
          redirectTo: '/setup-username'
        });
      }
      return res.redirect('/setup-username');
    }
    
    next();
  }
  
  /**
   * Optional authentication middleware
   * Always proceeds, but marks authentication status
   */
  static optional(req, res, next) {
    req.isAuth = req.isAuthenticated && req.isAuthenticated();
    req.authMethod = req.user ? 'session' : 'none';
    next();
  }
  
  /**
   * Session consistency middleware
   * Ensures session state is consistent with authentication state
   */
  static ensureSessionConsistency(req, res, next) {
    // Check if the request is already authenticated by Passport
    const isPassportAuthenticated = req.isAuthenticated && req.isAuthenticated();
    
    // Check if we have a user object from Passport
    const hasUser = !!req.user;
    
    // Check if the session thinks we're authenticated
    const isSessionAuthenticated = !!req.session && !!req.session.isAuthenticated;
    
    // If any authentication method says we're authenticated, ensure all are consistent
    if (isPassportAuthenticated || hasUser || isSessionAuthenticated) {
      // Ensure the session is marked as authenticated
      req.session.isAuthenticated = true;
      
      // If we have a user from Passport, ensure it's in the session
      if (hasUser && req.user._id) {
        req.session.userId = req.user._id.toString();
        req.session.username = req.user.username;
        req.session.userRole = req.user.role || 'user';
        
        // Ensure passport data is set
        req.session.passport = req.session.passport || {};
        req.session.passport.user = req.user._id;
      }
      
      // If we have a userId in session but no user object, try to set user
      if (!hasUser && req.session.userId && req.session.passport) {
        // This will be picked up by Passport's session deserializer
        req.session.passport.user = req.session.userId;
      }
      
      // Explicitly save the session to ensure changes persist
      // But don't block the request
      req.session.save(err => {
        if (err) console.error('Error saving auth session:', err);
      });
    }
    
    // Log auth state but only for API calls and only occasionally (1% of requests)
    if (req.path.startsWith('/api/') && Math.random() < 0.01) {
      console.log(`🔒 Auth check: ${req.path} - Authenticated: ${isPassportAuthenticated || hasUser || isSessionAuthenticated}`);
    }
    
    next();
  }
  
  /**
   * Extract JWT token from various sources
   * @param {Object} req - Express request object
   * @returns {string|null} JWT token or null
   */
  static extractJWT(req) {
    // Check Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      return req.headers.authorization.substring(7);
    }
    
    // Check cookies
    if (req.cookies && req.cookies.authToken) {
      return req.cookies.authToken;
    }
    
    // Check query parameters
    if (req.query && req.query.authToken) {
      return req.query.authToken;
    }
    
    return null;
  }
}

// Export pre-configured middleware functions for common use cases
module.exports = {
  // Main authentication middleware
  authenticate: AuthMiddleware.authenticate,
  
  // Role-based access control
  requireRole: AuthMiddleware.requireRole,
  requireAdmin: AuthMiddleware.requireAdmin,
  requireAdminOrModerator: AuthMiddleware.requireAdminOrModerator,
  
  // Username validation
  requireUsername: AuthMiddleware.requireUsername,
  
  // Optional authentication
  optional: AuthMiddleware.optional,
  
  // Session consistency
  ensureSessionConsistency: AuthMiddleware.ensureSessionConsistency,
  
  // Legacy compatibility functions (for existing code)
  ensureAuthenticated: AuthMiddleware.authenticate,
  isAuthenticated: AuthMiddleware.authenticate,
  isAdmin: AuthMiddleware.requireAdmin,
  isAdminOrModerator: AuthMiddleware.requireAdminOrModerator,
  
  // Class export for advanced usage
  AuthMiddleware
};