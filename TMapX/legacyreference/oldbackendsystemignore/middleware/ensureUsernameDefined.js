// middleware/ensureUsernameDefined.js

/**
 * Middleware to ensure a user has defined a username
 * For API routes, returns a 403 status
 * For page routes, redirects to the username setup page
 */
function ensureUsernameDefined(req, res, next) {
  // First check if user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    // For API routes, return 401
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // For page routes, redirect to login
    return res.redirect('/views/login.html');
  }

  // Then check if username is defined
  if (!req.user.isUsernameDefined) {
    // For API routes, return 403
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({
        error: 'Username setup required',
        redirectTo: '/setup-username'
      });
    }
    // For page routes, redirect to username setup
    return res.redirect('/setup-username');
  }

  // If all checks pass, proceed
  next();
}

module.exports = ensureUsernameDefined;
