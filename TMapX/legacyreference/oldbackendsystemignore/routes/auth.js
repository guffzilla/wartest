const express = require('express');
const passport = require('passport');
const { availableStrategies } = require('../config/passport');
const router = express.Router();
const authController = require('../controllers/authController');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
      if (err) {
        console.error('JWT verification failed:', err.message);
        return res.status(403).json({ success: false, error: 'Invalid token' });
      }
      
      // Add user info to request
      req.user = decoded;
      next();
    });
  } else {
    console.error('No authorization header provided');
    res.status(401).json({ success: false, error: 'No token provided' });
  }
};

// Debug middleware for auth routes
router.use((req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  
  console.log('Auth Route Debug:', {
    path: req.path,
    method: req.method,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated && req.isAuthenticated(),
    user: req.user ? {
      id: req.user._id,
      username: req.user.username
    } : null,
    userAgent: userAgent.substring(0, 100)
  });
  next();
});

// OAuth configuration endpoint
router.get('/config', (req, res) => {
  console.log('⚙️ OAuth config request received');
  
  try {
    const config = {
      availableStrategies: availableStrategies,
      serverOnline: true,
      endpoints: {
        google: availableStrategies.google ? '/auth/google' : null,
        discord: availableStrategies.discord ? '/auth/discord' : null,
        twitch: availableStrategies.twitch ? '/auth/twitch' : null
      }
    };
    
    console.log('✅ Sending OAuth config:', config);
    res.json(config);
  } catch (error) {
    console.error('❌ Error getting OAuth config:', error);
    res.status(500).json({ 
      error: 'Failed to get OAuth configuration',
      availableStrategies: {},
      serverOnline: false
    });
  }
});

// Debug endpoint to check OAuth status
router.get('/debug/oauth-status', (req, res) => {
  console.log('🔍 OAuth Debug Request');
  
  try {
    const envVars = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
      TWITCH_CLIENT_ID: !!process.env.TWITCH_CLIENT_ID,
      TWITCH_CLIENT_SECRET: !!process.env.TWITCH_CLIENT_SECRET
    };
    
    console.log('🔍 Environment variables status:', envVars);
    console.log('🔍 Available strategies:', availableStrategies);
    
    res.json({
      environment: envVars,
      availableStrategies: availableStrategies,
      passportStrategies: Object.keys(require('passport')._strategies || {}),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in OAuth debug:', error);
    res.status(500).json({ 
      error: 'Failed to get OAuth debug info',
      message: error.message
    });
  }
});

// Helper middleware to check if strategy is available
function checkStrategy(strategyName) {
  return (req, res, next) => {
    console.log(`🔍 Checking strategy: ${strategyName}`, {
      available: !!availableStrategies[strategyName],
      allStrategies: availableStrategies
    });
    
    if (!availableStrategies[strategyName]) {
      console.error(`❌ Strategy ${strategyName} not available. Available strategies:`, Object.keys(availableStrategies).filter(key => availableStrategies[key]));
      

      
      return res.status(503).json({
        error: `${strategyName.charAt(0).toUpperCase() + strategyName.slice(1)} OAuth is not configured`,
        message: `Please configure ${strategyName.toUpperCase()}_CLIENT_ID and ${strategyName.toUpperCase()}_CLIENT_SECRET environment variables to enable ${strategyName} authentication.`,
        availableStrategies: Object.keys(availableStrategies).filter(key => availableStrategies[key]),
        provider: strategyName
      });
    }
    
    console.log(`✅ Strategy ${strategyName} is available, proceeding with OAuth`);
    next();
  };
}

// OAuth login redirects
router.get('/google', checkStrategy('google'), (req, res, next) => {
  const clientState = req.query.state || '';
  
  console.log('🔵 === GOOGLE OAUTH START ===');
  console.log('🔍 Query params:', req.query);
  console.log('🔍 Client state parameter:', clientState);
  console.log('🔍 Session ID:', req.sessionID);
  console.log('=================================');
  
  // Create OAuth state that includes client state and any redirect information
  const oauthState = JSON.stringify({
    clientState: clientState,
    redirectAfterLogin: req.query.redirect || ''
  });
  
  console.log('🔍 OAuth state being sent:', oauthState);
  console.log('🚀 Redirecting to Google OAuth...');
  
  // Use passport.authenticate as middleware (correct for OAuth providers)
  passport.authenticate('google', { 
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
    state: oauthState
  })(req, res, next);
});

router.get('/discord', checkStrategy('discord'), (req, res, next) => {
  const clientState = req.query.state || '';
  
  console.log('🟣 === DISCORD OAUTH START ===');
  console.log('🔍 Query params:', req.query);
  console.log('🔍 Client state parameter:', clientState);
  console.log('🔍 Session ID:', req.sessionID);
  console.log('=================================');
  
  // Create OAuth state that includes client state and any redirect information
  const oauthState = JSON.stringify({
    clientState: clientState,
    redirectAfterLogin: req.query.redirect || ''
  });
  
  console.log('🔍 OAuth state being sent:', oauthState);
  console.log('🚀 Redirecting to Discord OAuth...');
  
  passport.authenticate('discord', { 
    scope: ['identify', 'email'],
    state: oauthState
  })(req, res, next);
});

router.get('/twitch', checkStrategy('twitch'), (req, res, next) => {
  const clientState = req.query.state || '';
  
  console.log('🟡 === TWITCH OAUTH START ===');
  console.log('🔍 Query params:', req.query);
  console.log('🔍 Client state parameter:', clientState);
  console.log('🔍 Session ID:', req.sessionID);
  console.log('=================================');
  
  // Create OAuth state that includes client state and any redirect information
  const oauthState = JSON.stringify({
    clientState: clientState,
    redirectAfterLogin: req.query.redirect || ''
  });
  
  console.log('🔍 OAuth state being sent:', oauthState);
  console.log('🚀 Redirecting to Twitch OAuth...');
  
  passport.authenticate('twitch', { 
    scope: ['user:read:email'],
    state: oauthState
  })(req, res, next);
});

// OAuth callbacks
router.get('/google/callback',
  checkStrategy('google'),
  passport.authenticate('google', { 
    failureRedirect: '/login?error=google_auth_failed',
    failureMessage: true
  }),
  authController.handleOAuthCallback
);

router.get('/discord/callback',
  checkStrategy('discord'),
  passport.authenticate('discord', { 
    failureRedirect: '/login?error=discord_auth_failed',
    failureMessage: true
  }),
  authController.handleOAuthCallback
);

router.get('/twitch/callback',
  checkStrategy('twitch'),
  passport.authenticate('twitch', { 
    failureRedirect: '/login?error=twitch_auth_failed',
    failureMessage: true
  }),
  authController.handleOAuthCallback
);





// Clear browser sessions
router.post('/logout/clear-sessions', (req, res) => {
  try {
    console.log('🧹 Session clearing request received:', {
      userAgent: req.get('User-Agent'),
      sessionID: req.sessionID
    });
    
    // Destroy all sessions
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.log('⚠️ Session destroy error (non-critical):', err);
        } else {
          console.log('✅ Session destroyed during clear-sessions');
        }
      });
    }
    
    // Clear all authentication-related cookies with comprehensive options
    const cookiesToClear = [
      'connect.sid', 'sessionId', 'authToken', 'token', 'jwt', 'session',
      'oauth_token', 'oauth_state', 'passport_session', 'express.sid'
    ];
    
    cookiesToClear.forEach(cookieName => {
      // Clear with various possible configurations
      res.clearCookie(cookieName);
      res.clearCookie(cookieName, { path: '/' });
      res.clearCookie(cookieName, { path: '/', domain: 'localhost' });
      res.clearCookie(cookieName, { path: '/', domain: '127.0.0.1' });
      res.clearCookie(cookieName, { path: '/', httpOnly: true });
      res.clearCookie(cookieName, { path: '/', secure: false });
      res.clearCookie(cookieName, { path: '/', sameSite: 'lax' });
    });

    // Set cookies to expired explicitly with all domain variations
    const domains = ['', 'localhost', '127.0.0.1'];
    domains.forEach(domain => {
      const options = { expires: new Date(0), path: '/' };
      if (domain) options.domain = domain;
      
      cookiesToClear.forEach(cookieName => {
        res.cookie(cookieName, '', options);
      });
    });

    console.log('🧹 Comprehensive cookie and session cleanup completed');
    
    // Add cache control headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({ 
      success: true, 
      message: 'Browser sessions and cookies cleared successfully',
      cleared: cookiesToClear.length + ' cookie types cleared'
    });
    
  } catch (error) {
    console.error('❌ Session clearing error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear sessions' });
  }
});

// Auth status check - always fetch fresh data from database
router.get('/me', async (req, res) => {
  console.log('Auth /me Debug:', {
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated && req.isAuthenticated(),
    user: req.user ? {
      id: req.user._id,
      username: req.user.username,
      sessionRole: req.user.role
    } : null
  });

  if (req.isAuthenticated && req.isAuthenticated()) {
    try {
      // Always fetch fresh user data from database to avoid stale session data
      const User = require('../models/User');
      const freshUser = await User.findById(req.user._id).select('-password').lean();

      if (!freshUser) {
        console.log('User not found in database');
        return res.status(404).json({ error: 'User not found' });
      }

      // Return complete fresh user data
      const userData = {
        _id: freshUser._id,
        id: freshUser._id, // Include both _id and id for compatibility
        username: freshUser.username,
        displayName: freshUser.displayName,
        email: freshUser.email,
        avatar: freshUser.avatar,
        isUsernameDefined: freshUser.isUsernameDefined,
        role: freshUser.role || 'user', // Fresh role from database
        // Include any other fields that might be needed
        ...(freshUser.socialLinks && { socialLinks: freshUser.socialLinks }),
        ...(freshUser.bio && { bio: freshUser.bio }),
        ...(freshUser.createdAt && { createdAt: freshUser.createdAt }),
        ...(freshUser.profile && { profile: freshUser.profile }),
        ...(freshUser.avatarPreferences && { avatarPreferences: freshUser.avatarPreferences })
      };

      console.log('🔍 Fresh user data from database:', {
        username: userData.username,
        sessionRole: req.user.role,
        databaseRole: freshUser.role,
        finalRole: userData.role
      });

      // SPECIAL DEBUG FOR TURTLEMAN
      if (userData.username === 'turtleman') {
        console.log('🐢 TURTLEMAN DEBUG - Full user data:', JSON.stringify(userData, null, 2));
      }

      // Add caching headers for better performance
      res.set({
        'Cache-Control': 'private, max-age=300', // 5 minutes cache
        'ETag': `"${freshUser._id}-${freshUser.updatedAt || Date.now()}"`,
        'Last-Modified': freshUser.updatedAt || new Date().toUTCString()
      });

      res.json(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    console.log('User not authenticated');
    res.status(401).json({ error: 'Authentication required' });
  }
});

// Debug endpoint to make current user admin (temporary for debugging)
router.post('/make-admin', async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('🔍 Current user before update:', {
      username: user.username,
      role: user.role,
      id: user._id
    });

    // Make the current user an admin
    user.role = 'admin';
    await user.save();

    // Update the session user object
    req.user.role = 'admin';

    console.log('✅ User updated to admin:', {
      username: user.username,
      role: user.role,
      id: user._id
    });

    res.json({
      message: 'User role updated to admin',
      user: {
        username: user.username,
        role: user.role,
        id: user._id
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST username setup
router.post('/setup-username', authController.setupUsername);

// Logout route
router.get('/logout', (req, res) => {
  console.log('🚪 LOGOUT REQUEST RECEIVED');
  console.log('🔍 LOGOUT DEBUG: Request details:', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : 'N/A',
    user: req.user ? req.user.username : null,
    headers: {

      'Accept': req.get('Accept'),
      'Referer': req.get('Referer')
    },
    cookies: req.cookies
  });



  // Store session info before destruction
  const sessionInfoBeforeLogout = {
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user ? req.user.username : null
  };

  console.log('🔍 LOGOUT DEBUG: Session before logout:', sessionInfoBeforeLogout);

  // Perform logout
  req.logout((err) => {
    if (err) {
      console.error('❌ LOGOUT ERROR during req.logout():', err);
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }

    console.log('✅ LOGOUT: req.logout() completed successfully');

    // Destroy session
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('❌ LOGOUT ERROR during session.destroy():', sessionErr);
        // Continue anyway
      } else {
        console.log('✅ LOGOUT: Session destroyed successfully');
      }

             // Clear ALL authentication-related cookies with comprehensive options
       const cookiesToClear = ['connect.sid', 'sessionId', 'authToken', 'token', 'jwt', 'session'];
       cookiesToClear.forEach(cookieName => {
         // Clear with various possible configurations
         res.clearCookie(cookieName);
         res.clearCookie(cookieName, { path: '/' });
         res.clearCookie(cookieName, { path: '/', domain: 'localhost' });
         res.clearCookie(cookieName, { path: '/', httpOnly: true });
         res.clearCookie(cookieName, { path: '/', secure: false });
       });

       // Also set cookies to expired explicitly
       res.cookie('authToken', '', { expires: new Date(0), path: '/' });
       res.cookie('sessionId', '', { expires: new Date(0), path: '/' });
       res.cookie('connect.sid', '', { expires: new Date(0), path: '/' });

       console.log('🧹 LOGOUT: All authentication cookies cleared with multiple configurations');

      // Check session state after logout
      const sessionInfoAfterLogout = {
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        user: req.user ? req.user.username : null
      };

      console.log('🔍 LOGOUT DEBUG: Session after logout:', sessionInfoAfterLogout);

      console.log('🌐 LOGOUT: Redirecting web browser to login page');
      res.redirect('/views/login.html');
    });
  });
});







module.exports = router;
