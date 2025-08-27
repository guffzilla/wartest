/**
 * Unified Authentication Middleware
 * 
 * Consolidates all authentication patterns into a single, consistent system
 * Supports: Session auth, JWT auth, and hybrid modes
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
/**
 * Universal authentication middleware that supports multiple auth methods
 * @param {Object} options - Configuration options
 * @param {boolean} options.required - Whether authentication is required (default: true)
 * @param {boolean} options.allowJWT - Whether to allow JWT authentication (default: true)
 * @param {boolean} options.allowSession - Whether to allow session authentication (default: true)
 * @param {string[]} options.roles - Required user roles (default: [])
 */
function createAuthMiddleware(options = {}) {
  const {
    required = true,
    allowJWT = true,
    allowSession = true,
    roles = []
  } = options;
  return async (req, res, next) => {
    try {
      let user = null;
      let authMethod = 'none';
      // 1. Check session authentication first (most common for web)
      if (allowSession && req.isAuthenticated && req.isAuthenticated() && req.user) {
        user = req.user;
        authMethod = 'session';
      }
      // 2. Check JWT authentication (for API calls)
      if (!user && allowJWT) {
        const token = extractJWTToken(req);
        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            // The token might contain full user data
            if (decoded.id || decoded._id) {
              user = await User.findById(decoded.id || decoded._id).select('-password');
              if (user) {
                authMethod = 'jwt';
              }
            } else if (decoded.username) {
              // Legacy token format
              user = decoded;
              authMethod = 'jwt-legacy';
            }
          } catch (jwtError) {
          }
        }
      }

      // 4. Set user in request object
      if (user) {
        req.user = user;
        req.authMethod = authMethod;
        // Ensure session consistency
        if (req.session && !req.session.isAuthenticated) {
          req.session.isAuthenticated = true;
        }
        // 5. Check role requirements
        if (roles.length > 0) {
          const userRole = user.role || 'user';
          if (!roles.includes(userRole)) {
            return res.status(403).json({ 
              error: 'Insufficient permissions',
              required: roles,
              current: userRole
            });
          }
        }
        return next();
      }
      // 6. Handle unauthenticated requests
      if (required) {
        // Return appropriate error based on request type
        if (req.headers['accept']?.includes('application/json') || req.path.startsWith('/api/')) {
          return res.status(401).json({ error: 'Authentication required' });
        } else {
          return res.redirect('/views/login.html');
        }
      }
      // Authentication not required, continue
      next();
    } catch (error) {
      res.status(500).json({ error: 'Authentication system error' });
    }
  };
}
/**
 * Extract JWT token from various sources
 */
function extractJWTToken(req) {
  // Check Authorization header (Bearer token)
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }
  // Check cookies
  if (req.cookies?.authToken) {
    return req.cookies.authToken;
  }
  // Check query parameters (for special cases)
  if (req.query.authToken) {
    return req.query.authToken;
  }
  return null;
}
/**
 * Pre-configured middleware functions for common use cases
 */
// Standardized middleware functions for routes
const ensureAuthenticated = createAuthMiddleware({
  required: true,
  allowJWT: true,
  allowSession: true
});

// Admin only
const ensureAdmin = createAuthMiddleware({
  required: true,
  allowJWT: true,
  allowSession: true,
  roles: ['admin']
});

// Admin or Moderator
const ensureAdminOrModerator = createAuthMiddleware({
  required: true,
  allowJWT: true,
  allowSession: true,
  roles: ['admin', 'moderator']
});

// JWT only (for API endpoints)
const ensureJWTAuth = createAuthMiddleware({
  required: true,
  allowJWT: true,
  allowSession: false
});

// Session only (for web pages)
const ensureSessionAuth = createAuthMiddleware({
  required: true,
  allowJWT: false,
  allowSession: true
});

// Optional authentication (user data if available)
const optionalAuth = createAuthMiddleware({
  required: false,
  allowJWT: true,
  allowSession: true
});

// Legacy compatibility functions
function isAuthenticated(req, res, next) {
  return ensureAuthenticated(req, res, next);
}

function isAdmin(req, res, next) {
  return ensureAdmin(req, res, next);
}

function isAdminOrModerator(req, res, next) {
  return ensureAdminOrModerator(req, res, next);
}

/**
 * Debug middleware for authentication troubleshooting
 */
function debugAuth(req, res, next) {
  console.log('🔍 Auth Debug:', {
    path: req.path,
    method: req.method,
    sessionAuth: req.isAuthenticated && req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user?._id,
    username: req.user?.username,
    role: req.user?.role,
    authMethod: req.authMethod,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing'
    },
    cookies: {
      authToken: req.cookies?.authToken ? 'present' : 'missing'
    }
  });
  next();
}

// Export all middleware functions
module.exports = {
  createAuthMiddleware,
  ensureAuthenticated,
  ensureAdmin,
  ensureAdminOrModerator,
  ensureJWTAuth,
  ensureSessionAuth,
  optionalAuth,
  isAuthenticated,
  isAdmin,
  isAdminOrModerator,
  extractJWTToken,
  debugAuth
};
