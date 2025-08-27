// Simple auth utility for War3 routes
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    
    // Check for session auth as fallback
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    
    return res.status(401).json({ error: 'Authentication required' });
}

function optionalAuth(req, res, next) {
    // Always proceed, but mark auth status
    req.isAuth = req.isAuthenticated && req.isAuthenticated();
    next();
}

module.exports = {
    isAuthenticated,
    optionalAuth
}; 