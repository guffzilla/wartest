const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new mongoose.Schema({
username: {
  type: String,
  unique: true,
  sparse: true, // Allow multiple documents with null/undefined values
  required: function() {
    // Only require username if isUsernameDefined is true
    return this.isUsernameDefined === true;
  },
  trim: true,
  uppercase: true, // Automatically convert to uppercase
  validate: [
    {
      // Length validator - only apply if username is defined
      validator: function(v) {
        // Skip validation if username is empty for new users
        if (!v && !this.isUsernameDefined) return true;
        return v.length >= 3 && v.length <= 20;
      },
      message: props => {
        if (props.value.length < 3) return 'Username must be at least 3 characters long';
        if (props.value.length > 20) return 'Username must be no more than 20 characters long';
        return 'Invalid username length';
      }
    },
    {
      // Format validator - only apply if username is defined
      validator: function(v) {
        // Skip validation if username is empty for new users
        if (!v && !this.isUsernameDefined) return true;
        return /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'Username can only contain letters, numbers, underscores, and hyphens'
    }
  ]
},

playerIDs: [
{
  id: { type: String, required: true },
  rank: { type: Number, default: 0 },
  records: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
}
],

email: { type: String, unique: true, required: true },

// USER-CONTROLLED PROFILE DATA ONLY
displayName: String, // User sets this manually if they want
avatar: { 
  type: String, 
  default: '/assets/img/ranks/emblem.png' 
}, // User sets this manually if they want

// Avatar preferences - controls how avatar is determined
avatarPreferences: {
  type: {
    type: String,
    enum: ['default', 'highest_rank', 'custom'],
    default: 'default'
  },
  customImage: {
    type: String,
    validate: {
      validator: function(v) {
        // Allow null/undefined or valid image names
        return v === null || v === undefined || ['mage.png', 'dragon.png', 'dwarf.png', 'elf.png'].includes(v);
      },
      message: 'customImage must be one of: mage.png, dragon.png, dwarf.png, elf.png, or null'
    },
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
},

// AUTHENTICATION PROVIDER IDs - ONLY FOR AUTH
googleId: { type: String, unique: true, sparse: true },
discordId: { type: String, unique: true, sparse: true },
twitchId: { type: String, unique: true, sparse: true },

// Additional User Details
registeredAt: { type: Date, default: Date.now },
lastLogin: Date,

// Profile Images (cached from social links APIs only) - SEPARATE FROM OAUTH
youtubeAvatar: String,
youtubeBanner: String,
twitchAvatar: String,
twitchBanner: String,

// Account Creation Status
isUsernameDefined: {
  type: Boolean,
  default: false
},

// Username change tracking
lastUsernameChange: {
  type: Date,
  default: null
},

// Suggested username (for new social login users)
suggestedUsername: {
  type: String,
  default: ''
},

// Optional Profile Information
bio: String,
dateOfBirth: Date,
location: String,
profile: {
  age: Number,
  gender: String,
  country: String,
  warcraftPreferences: {
    favoriteGame: String,
    favoriteRace: String,
    favoriteStrategy: String,
    firstPlayed: Date
  },
  layout: {
    sections: [{
      id: String,
      sectionType: String,
      position: Number,
      gridColumn: String,
      gridRow: String
    }],
    timestamp: Date,
    version: String
  }
},
socialLinks: {
  youtube: String,
  twitch: String
},

// Streaming information
streaming: {
  isLive: {
    type: Boolean,
    default: false
  },
  lastChecked: {
    type: Date,
    default: null
  },
  platform: {
    type: String,
    enum: ['twitch', 'youtube', null],
    default: null
  },
  // YouTube specific settings
  youtubeDescription: {
    type: String,
    default: ''
  },
  youtubeGames: {
    type: [{
      type: String,
      enum: ['wc12', 'wc3']
    }],
    default: []
  },
  youtubeIsLive: {
    type: Boolean,
    default: false
  },
  // Twitch specific settings
  twitchDescription: {
    type: String,
    default: ''
  },
  twitchGames: {
    type: [{
      type: String,
      enum: ['wc12', 'wc3']
    }],
    default: []
  },
  twitchIsLive: {
    type: Boolean,
    default: false
  }
},

// User Roles and Permissions
role: {
  type: String,
  enum: ['user', 'admin', 'moderator'],
  default: 'user'
},

// Moderation and Account Status
accountStatus: {
  type: String,
  enum: ['active', 'suspended', 'banned'],
  default: 'active'
},

// Specific permissions for moderation
permissions: {
  canReportMatches: {
    type: Boolean,
    default: true
  },
  canCreateTournaments: {
    type: Boolean,
    default: false
  },
  canUploadMaps: {
    type: Boolean,
    default: true
  },
  canUseChat: {
    type: Boolean,
    default: true
  },
  canCreateClans: {
    type: Boolean,
    default: true
  }
},

// Ban controls
banInfo: {
  isBanned: { type: Boolean, default: false },
  type: { type: String, enum: ['temporary', 'permanent'], default: 'temporary' },
  reason: { type: String, default: '' },
  bannedAt: { type: Date },
  bannedUntil: { type: Date },
  scope: {
    chat: { type: Boolean, default: true },
    reportMatches: { type: Boolean, default: true },
    postContent: { type: Boolean, default: true }
  }
},

// Moderation history
moderationHistory: [{
  action: {
    type: String,
    enum: ['warning', 'suspension', 'ban', 'permission_revoked', 'permission_granted', 'role_changed'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  moderatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderatorUsername: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // Duration in hours for temporary actions
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}],

// Ban information
banInfo: {
  isBanned: {
    type: Boolean,
    default: false
  },
  bannedAt: {
    type: Date,
    default: null
  },
  bannedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  banReason: {
    type: String,
    default: ''
  },
  banExpiresAt: {
    type: Date,
    default: null // null means permanent ban
  },
  ipAddresses: [{
    ip: String,
    bannedAt: { type: Date, default: Date.now }
  }]
},

// Enhanced profile image caching and metadata
youtubeProfileTitle: {
  type: String,
  default: ''
},
youtubeProfileDescription: {
  type: String,
  default: ''
},
youtubeProfileLastUpdated: {
  type: Date,
  default: null
},
twitchProfileTitle: {
  type: String,
  default: ''
},
twitchProfileDescription: {
  type: String,
  default: ''
},
twitchProfileLastUpdated: {
  type: Date,
  default: null
},
profileImagesLastUpdated: {
  type: Date,
  default: null
},
profileImageErrors: [{
  type: String
}],
profileImageLastErrorAt: {
  type: Date,
  default: null
},

// Image cache for persistent storage
imageCache: [{
  key: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true
  },
  identifier: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['avatar', 'banner', 'profile'],
    default: 'avatar'
  },
  url: {
    type: String,
    required: true
  },
  isError: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}],

// API quota tracking
quotaStatus: [{
  platform: {
    type: String,
    required: true
  },
  exhaustedAt: {
    type: Date,
    required: true
  }
}],

// General cache for various data
cache: [{
  key: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}],

// Arena Gold (currency for emojis and other features)
arenaGold: {
  type: Number,
  default: 100,
  min: 0
},

// Honor Points (earned from achievements and good behavior)
honor: {
  type: Number,
  default: 50,
  min: 0
},

// Experience Points (earned from achievements and activities)
experience: {
  type: Number,
  default: 0,
  min: 0
},

// Campaign and activity statistics
stats: {
  totalExperience: {
    type: Number,
    default: 0,
    min: 0
  },
  arenaGold: {
    type: Number,
    default: 100,
    min: 0
  },
  campaignMissionsCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  totalHonorPoints: {
    type: Number,
    default: 50,
    min: 0
  }
},

// Achievement Level (calculated from experience)
achievementLevel: {
  type: Number,
  default: 1,
  min: 1
},

// Achievement System
achievements: {
  completed: [{
    achievementId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now }
  }],
  progress: {
    type: Map,
    of: Number,
    default: {}
  },
  seen: [{
    type: String // Achievement IDs that user has seen
  }],
  totalPointsEarned: {
    type: Number,
    default: 0 // Legacy field name - now stores total experience points from achievements
  },
  totalUnlocked: {
    type: Number,
    default: 0
  }
},

// Owned Emojis (array of emoji IDs that user has purchased)
ownedEmojis: [{
  type: String,
  default: []
}],

// List of users this user has muted
mutedUsers: [{
  type: Schema.Types.ObjectId,
  ref: 'User'
}],

// Connections and relationships
following: [{
  type: Schema.Types.ObjectId,
  ref: 'User'
}],

followers: [{
  type: Schema.Types.ObjectId,
  ref: 'User'
}],

blockedUsers: [{
  type: Schema.Types.ObjectId,
  ref: 'User'
}],

// Privacy settings
privacySettings: {
  showEmail: { type: Boolean, default: false },
  showLastLogin: { type: Boolean, default: true },
  allowDirectMessages: { type: Boolean, default: true },
  showOnlineStatus: { type: Boolean, default: true }
},

// Platform-specific ratings for content creators
youtubeRatings: [{
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}],

twitchRatings: [{
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}],

// Calculated rating averages and counts
youtubeAverageRating: { type: Number, default: 0 },
twitchAverageRating: { type: Number, default: 0 },
youtubeRatingsCount: { type: Number, default: 0 },
twitchRatingsCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ discordId: 1 });
UserSchema.index({ twitchId: 1 });

// Static method to check if username is taken
UserSchema.statics.isUsernameTaken = async function(username) {
  const user = await this.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
  return !!user;
};

// Rating methods
UserSchema.methods.addRating = async function(userId, rating, comment = '', platform) {
  try {
    console.log(`📊 Adding ${platform} rating:`, { userId, rating, comment, platform });
    
    // Validate platform
    if (!['youtube', 'twitch'].includes(platform)) {
      throw new Error('Platform must be either "youtube" or "twitch"');
    }
    
    const ratingsField = platform === 'youtube' ? 'youtubeRatings' : 'twitchRatings';
    const averageField = platform === 'youtube' ? 'youtubeAverageRating' : 'twitchAverageRating';
    const countField = platform === 'youtube' ? 'youtubeRatingsCount' : 'twitchRatingsCount';
    
    // Check if user has already rated this creator on this platform
    const existingRatingIndex = this[ratingsField].findIndex(r => r.userId.toString() === userId.toString());
    
    if (existingRatingIndex !== -1) {
      // Update existing rating
      this[ratingsField][existingRatingIndex].rating = rating;
      this[ratingsField][existingRatingIndex].comment = comment;
      this[ratingsField][existingRatingIndex].createdAt = new Date();
      console.log(`🔄 Updated existing ${platform} rating`);
    } else {
      // Add new rating
      this[ratingsField].push({
        userId: userId,
        rating: rating,
        comment: comment,
        createdAt: new Date()
      });
      console.log(`➕ Added new ${platform} rating`);
    }
    
    // Recalculate average and count
    const ratingsArray = this[ratingsField];
    const totalRatings = ratingsArray.length;
    const averageRating = totalRatings > 0 ? 
      ratingsArray.reduce((sum, r) => sum + r.rating, 0) / totalRatings : 0;
    
    this[averageField] = Math.round(averageRating * 100) / 100; // Round to 2 decimal places
    this[countField] = totalRatings;
    
    // Save the document
    await this.save();
    
    console.log(`✅ ${platform} rating saved. New average: ${this[averageField]}, Count: ${this[countField]}`);
    return this[averageField];
    
  } catch (error) {
    console.error(`❌ Error adding ${platform} rating:`, error);
    throw error;
  }
};

UserSchema.methods.removeRating = async function(userId, platform) {
  try {
    console.log(`🗑️ Removing ${platform} rating for user:`, userId);
    
    // Validate platform
    if (!['youtube', 'twitch'].includes(platform)) {
      throw new Error('Platform must be either "youtube" or "twitch"');
    }
    
    const ratingsField = platform === 'youtube' ? 'youtubeRatings' : 'twitchRatings';
    const averageField = platform === 'youtube' ? 'youtubeAverageRating' : 'twitchAverageRating';
    const countField = platform === 'youtube' ? 'youtubeRatingsCount' : 'twitchRatingsCount';
    
    // Find and remove the rating
    const ratingsArray = this[ratingsField];
    const initialLength = ratingsArray.length;
    this[ratingsField] = ratingsArray.filter(r => r.userId.toString() !== userId.toString());
    
    if (this[ratingsField].length === initialLength) {
      // No rating was found to remove
      console.log(`⚠️ No ${platform} rating found to remove for user:`, userId);
      return false;
    }
    
    // Recalculate average and count
    const totalRatings = this[ratingsField].length;
    const averageRating = totalRatings > 0 ? 
      this[ratingsField].reduce((sum, r) => sum + r.rating, 0) / totalRatings : 0;
    
    this[averageField] = Math.round(averageRating * 100) / 100; // Round to 2 decimal places
    this[countField] = totalRatings;
    
    // Save the document
    await this.save();
    
    console.log(`✅ ${platform} rating removed. New average: ${this[averageField]}, Count: ${this[countField]}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error removing ${platform} rating:`, error);
    throw error;
  }
};

module.exports = mongoose.model('User', UserSchema);
