const User = require('../models/User');

// Helper to generate unique usernames
async function generateUniqueUsername(baseUsername) {
  let username = baseUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (username.length < 3) username = username.padEnd(3, 'x'); // minimal length fallback
  
  // Convert to uppercase for consistency
  username = username.toUpperCase();
  
  let uniqueUsername = username;
  let counter = 1;
  while (await User.isUsernameTaken(uniqueUsername)) {
    uniqueUsername = `${username}${counter++}`;
  }
  return uniqueUsername;
}

// Helper to create a user with all necessary default values
function createUserWithDefaults(userData = {}) {
  const defaultUserData = {
    // Required fields
    email: userData.email,
    
    // OAuth provider IDs (if provided)
    googleId: userData.googleId || undefined,
    discordId: userData.discordId || undefined,
    twitchId: userData.twitchId || undefined,
    
    // Username setup
    username: userData.username || undefined,
    isUsernameDefined: userData.isUsernameDefined || false,
    suggestedUsername: userData.suggestedUsername || '',
    
    // Profile data - user controlled
    displayName: userData.displayName || undefined,
    avatar: userData.avatar || '/assets/img/ranks/emblem.png',
    
    // Timestamps
    registeredAt: new Date(),
    lastLogin: new Date(),
    lastUsernameChange: null,
    
    // Profile information
    bio: undefined,
    location: undefined,
    profile: {
      age: undefined,
      gender: undefined,
      country: undefined,
      warcraftPreferences: {
        favoriteGame: undefined,
        favoriteRace: undefined,
        favoriteStrategy: undefined,
        firstPlayed: undefined
      }
    },
    
    // Social links
    socialLinks: {
      youtube: undefined,
      twitch: undefined
    },
    
    // Profile images (cached from APIs - separate from OAuth)
    youtubeAvatar: undefined,
    youtubeBanner: undefined,
    twitchAvatar: undefined,
    twitchBanner: undefined,
    
    // Streaming information
    streaming: {
      isLive: false,
      lastChecked: null,
      platform: null,
      youtubeDescription: '',
      youtubeGames: [],
      youtubeIsLive: false,
      twitchDescription: '',
      twitchGames: [],
      twitchIsLive: false
    },
    
    // User role and permissions
    role: userData.role || 'user',
    
    // Relationships (initialize as empty arrays)
    playerIDs: [],
    mutedUsers: [],
    following: [],
    followers: [],
    blockedUsers: [],
    
    // Privacy settings with defaults
    privacySettings: {
      showEmail: false,
      showLastLogin: true,
      allowDirectMessages: true,
      showOnlineStatus: true
    },
    
    // Platform ratings (initialize as empty arrays)
    youtubeRatings: [],
    twitchRatings: [],
    
    // Rating averages and counts
    youtubeAverageRating: 0,
    twitchAverageRating: 0,
    youtubeRatingsCount: 0,
    twitchRatingsCount: 0,
    
    // Game currency and progression
    arenaGold: 100,
    honor: 50,
    ownedEmojis: ['smile', 'thumbs_up', 'heart', 'fire'], // Grant default free emojis
    
    // Additional fields from userData (allows overrides)
    ...userData
  };
  
  return new User(defaultUserData);
}

async function findOrCreateUser(profile, provider) {
  const oauthIdField = `${provider}Id`;
  const oauthId = profile.id;
  const email = profile.email?.toLowerCase() || '';

  // Find user by oauth id
  let user = await User.findOne({ [oauthIdField]: oauthId });
  if (user) {
    // User exists - just update last login, no profile data storage
    user.lastLogin = new Date();
    await user.save();
    return user;
  }

  // Find user by email (merge accounts)
  if (email) {
    user = await User.findOne({ email });
    if (user) {
      user[oauthIdField] = oauthId;
      user.lastLogin = new Date();
      await user.save();
      return user;
    }
  }

  // NEW USER: Create with comprehensive defaults and minimal required data
  // Generate a suggested username from email only
  const baseSuggestion = email.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  
  const suggestedUsername = (baseSuggestion.length >= 3 ? baseSuggestion : baseSuggestion.padEnd(3, 'x')).toUpperCase();

  // Create user with comprehensive defaults
  const userData = {
    email,
    [oauthIdField]: oauthId,
    isUsernameDefined: false,  // must explicitly set username later
    suggestedUsername: suggestedUsername,
    lastLogin: new Date()
    // NO displayName, avatar, or any OAuth profile data stored
  };

  // Create the user with all defaults properly initialized
  user = createUserWithDefaults(userData);
  await user.save();
  
  console.log(`✅ Created new user via ${provider} OAuth:`, {
    id: user._id,
    email: user.email,
    suggestedUsername: user.suggestedUsername,
    isUsernameDefined: user.isUsernameDefined
  });
  
  // Note: WC1 player will be auto-created when user sets their username
  // via setupUsername endpoint, not during OAuth registration
  
  return user;
}

module.exports = { generateUniqueUsername, findOrCreateUser, createUserWithDefaults };
