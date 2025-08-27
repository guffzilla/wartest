/**
 * Universal authentication check middleware
 * This ensures user authentication state is properly maintained across requests
 */
module.exports = function(req, res, next) {
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
};
