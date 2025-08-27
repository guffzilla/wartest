const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const TwitchStrategy = require('passport-twitch-new').Strategy;
const { findOrCreateUser } = require('../utils/oauthHelper');

// Track which strategies are available
const availableStrategies = {
  google: false,
  discord: false,
  twitch: false
};

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await require('../models/User').findById(id).select('-password');
    if (!user) return done(null, false, { message: 'User not found' });
    user.lastLogin = new Date();
    await user.save();
    done(null, user);
  } catch (err) {
    console.error('Deserialization error:', err);
    done(err);
  }
});

// Helper function to check if OAuth credentials are valid
function hasValidOAuthCredentials(clientId, clientSecret, provider) {
  if (!clientId || !clientSecret) {
    return false;
  }
  
  // Check for common placeholder values
  const placeholders = [
    'your_google_client_id',
    'your_discord_client_id', 
    'your_twitch_client_id',
    'placeholder_google_client_id',
    'placeholder_discord_client_id',
    'placeholder_twitch_client_id',
    'your_actual_google_client_id',
    'your_actual_discord_client_id',
    'your_actual_twitch_client_id'
  ];
  
  return !placeholders.includes(clientId.toLowerCase()) && clientId.length > 10;
}

// Google Strategy - only configure if credentials are provided
if (hasValidOAuthCredentials(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'google')) {
  console.log('✅ Configuring Google OAuth strategy');
  availableStrategies.google = true;
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
    accessType: 'offline',
    includeGrantedScopes: true
  }, async (req, accessToken, refreshToken, params, profile, done) => {
    try {
      if (!profile || !profile.id || !profile.emails || !profile.emails[0].value) {
        return done(new Error('Invalid Google profile'), null);
      }

      const user = await findOrCreateUser({
        id: profile.id,
        email: profile.emails[0].value,
        displayName: profile.displayName,
        photos: profile.photos
      }, 'google');

      if (!user.isUsernameDefined) {
        return done(null, user, { needsUsernameSetup: true });
      }

      return done(null, user);
    } catch (err) {
      console.error('Google auth error:', err);
      done(err);
    }
  }));
} else {
  console.log('⚠️  Google OAuth not configured - skipping Google strategy');
}

// Discord Strategy - only configure if credentials are provided
if (hasValidOAuthCredentials(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_CLIENT_SECRET, 'discord')) {
  console.log('✅ Configuring Discord OAuth strategy');
  availableStrategies.discord = true;
  
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: '/auth/discord/callback',
    scope: ['identify', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUser({
        id: profile.id,
        email: profile.email,
        username: profile.username,
        avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null
      }, 'discord');

      if (!user.isUsernameDefined) {
        return done(null, user, { needsUsernameSetup: true });
      }

      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
} else {
  console.log('⚠️  Discord OAuth not configured - skipping Discord strategy');
}

// Twitch Strategy - only configure if credentials are provided
if (hasValidOAuthCredentials(process.env.TWITCH_CLIENT_ID, process.env.TWITCH_CLIENT_SECRET, 'twitch')) {
  console.log('✅ Configuring Twitch OAuth strategy');
  availableStrategies.twitch = true;
  
  passport.use(new TwitchStrategy({
    clientID: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    callbackURL: '/auth/twitch/callback',
    scope: ['user:read:email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUser({
        id: profile.id,
        email: profile.email,
        username: profile.login,
        displayName: profile.display_name,
        avatar: profile.profile_image_url
      }, 'twitch');

      if (!user.isUsernameDefined) {
        return done(null, user, { needsUsernameSetup: true });
      }

      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
} else {
  console.log('⚠️  Twitch OAuth not configured - skipping Twitch strategy');
}

// Export passport and available strategies
module.exports = passport;
module.exports.availableStrategies = availableStrategies;
