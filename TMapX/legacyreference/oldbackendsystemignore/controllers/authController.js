const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.handleOAuthCallback = async (req, res, next) => {
  console.log('🚀 === OAUTH CALLBACK START ===');
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 Full session object:', JSON.stringify(req.session, null, 2));
  console.log('🔍 Query params:', req.query);
  console.log('🔍 Headers:', {
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer
  });
  console.log('🔍 User object exists:', !!req.user);
  console.log('🔍 User details:', req.user && {
    id: req.user._id,
    username: req.user.username,
    email: req.user.email
  });
  console.log('=================================');

  const user = req.user;

  let clientState = '';

  // Parse the state parameter to extract client state
  try {
    const stateParam = req.query.state;
    if (stateParam) {
      // Handle both encoded and non-encoded state parameters
      let decodedState = stateParam;
      try {
        decodedState = decodeURIComponent(stateParam);
      } catch (decodeError) {
        // If decode fails, use original state param
        console.log('🔍 State parameter not URL encoded, using as-is');
      }
      
      const parsedState = JSON.parse(decodedState);
      clientState = parsedState.clientState || '';
      console.log('🔍 Parsed OAuth state:', {
        clientState: clientState,
        rawState: stateParam,
        decodedState: decodedState
      });
    }
  } catch (error) {
    console.log('⚠️ Failed to parse OAuth state parameter:', error.message);
    console.log('🔍 Raw state param:', req.query.state);
  }
  
  console.log('🔍 Processing OAuth callback:', { hasUser: !!user, clientState });

  if (!user) {
    console.log('❌ OAuth callback: No user found');
    return res.redirect('/views/index.html?error=auth_failed');
  }

  // Set authentication in session
  req.session.isAuthenticated = true;
  req.session.userId = user._id.toString();

  console.log('User authenticated:', {
    id: user._id,
    username: user.username,
    email: user.email,
    provider: user.provider
  });

  // Save session and handle redirect
  req.session.save((err) => {
    if (err) {
      console.log('❌ Session save error:', err);
      return res.redirect('/views/index.html?error=session_error');
    }

    console.log('Session saved successfully:', {
      sessionID: req.sessionID,
      userId: req.session.userId,
      isAuthenticated: req.session.isAuthenticated
    });

    // Determine redirect destination
    let redirectUrl = '/views/hero.html'; // Default redirect
    
    // Check if user needs username setup
    if (!user.isUsernameDefined) {
      redirectUrl = '/setup-username';
    } else {
      // Check if there's a stored redirect destination in the OAuth state
      try {
        const stateParam = req.query.state;
        if (stateParam) {
          let decodedState = stateParam;
          try {
            decodedState = decodeURIComponent(stateParam);
          } catch (decodeError) {
            // If decode fails, use original state param
            console.log('🔍 State parameter not URL encoded, using as-is');
          }
          
          const parsedState = JSON.parse(decodedState);
          const redirectAfterLogin = parsedState.redirectAfterLogin;
          
          if (redirectAfterLogin) {
            // Validate the redirect URL to prevent open redirects
            if (redirectAfterLogin.startsWith('/views/') || redirectAfterLogin.startsWith('/admin') || redirectAfterLogin === '/') {
              redirectUrl = redirectAfterLogin;
              console.log('🔄 Redirecting to stored destination:', redirectUrl);
            } else {
              console.log('⚠️ Invalid redirect URL (security check failed):', redirectAfterLogin);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Failed to parse redirect from OAuth state:', error.message);
      }
    }

    console.log('User login successful, redirecting to:', redirectUrl);
    return res.redirect(redirectUrl);
  });
};

exports.setupUsername = async (req, res, next) => {
  let { username } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!username || !/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  // Convert to uppercase
  username = username.toUpperCase();

  try {
    // Check if username is already taken by another user
    const existingUser = await User.findOne({ username: username });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Set the username and mark as defined
    user.username = username;
    user.isUsernameDefined = true;

    // Save with validation
    try {
      await user.save();

      // Auto-create WC1 player for new user
      await createWC1PlayerForUser(user._id, username);

      // Update session if needed
      if (req.session) {
        req.session.touch();
      }

      res.json({ success: true, message: 'Username set successfully' });
    } catch (validationError) {
      console.error('Username validation error:', validationError);
      return res.status(400).json({
        error: validationError.message || 'Username validation failed',
        details: validationError.errors
      });
    }
  } catch (err) {
    console.error('Username setup error:', err);
    next(err);
  }
};

/**
 * Auto-create WC1 player for user
 */
async function createWC1PlayerForUser(userId, username) {
  try {
    const Player = require('../models/Player');
    
    // Check if WC1 player already exists
    const existingPlayer = await Player.findOne({
      user: userId,
      gameType: 'wc1'
    });

    if (existingPlayer) {
      console.log(`✅ WC1 player already exists for user ${username}`);
      return existingPlayer;
    }

    // Create new WC1 player
    const wc1Player = new Player({
      name: username,
      user: userId,
      gameType: 'wc1',
      mmr: 1200, // Default MMR for WC1
      wins: 0,
      losses: 0,
      isActive: true,
      autoCreated: true,
      createdAt: new Date()
    });

    await wc1Player.save();
    console.log(`✅ Auto-created WC1 player for user ${username}`);
    return wc1Player;
  } catch (error) {
    console.error(`❌ Error creating WC1 player for user ${username}:`, error);
    // Don't throw error - user creation should succeed even if player creation fails
  }
}

exports.logout = (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
};
