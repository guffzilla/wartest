/**
 * Admin middleware for checking admin and moderator permissions
 */

/**
 * Ensure the user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function ensureAdmin(req, res, next) {
  // Check if user is authenticated (session OR JWT)
  if ((!req.isAuthenticated || !req.isAuthenticated()) && !req.user) {
    return res.status(401).json({ error: 'Unauthorized - Please log in' });
  }
  
  // Check if user is an admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  
  // User is an admin, proceed
  next();
}

/**
 * Ensure the user is an admin or moderator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function ensureAdminOrModerator(req, res, next) {
  // Check if user is authenticated (session OR JWT)
  if ((!req.isAuthenticated || !req.isAuthenticated()) && !req.user) {
    return res.status(401).json({ error: 'Unauthorized - Please log in' });
  }
  
  // Check if user is an admin or moderator
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
    return res.status(403).json({ error: 'Forbidden - Admin or moderator access required' });
  }
  
  // User is an admin or moderator, proceed
  next();
}

module.exports = {
  ensureAdmin,
  ensureAdminOrModerator
};
