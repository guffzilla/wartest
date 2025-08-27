const mongoose = require('mongoose');

/**
 * Channel Schema
 * Stores data about user-added channels/streams for the live page
 */
const channelSchema = new mongoose.Schema({
  // User who added this channel
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Channel name
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Channel URL (Twitch, YouTube, etc.)
  url: {
    type: String,
    required: true,
    trim: true
  },

  // Platform (twitch, youtube, etc.)
  platform: {
    type: String,
    required: true,
    enum: ['twitch', 'youtube', 'other'],
    default: 'twitch'
  },

  // Channel description
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  // Channel avatar/icon URL
  avatar: {
    type: String,
    default: '/assets/img/ranks/emblem.png'
  },

  // Channel banner URL
  banner: {
    type: String,
    default: '/assets/img/ranks/emblem.png'
  },

  // Games this channel focuses on
  games: [{
    type: String,
    enum: ['wc1', 'wc2', 'wc3', 'wc12'],
    required: true
  }],

  // Featured videos (YouTube video IDs)
  videoIds: [{
    type: String,
    trim: true
  }],

  // Is this channel featured?
  featured: {
    type: Boolean,
    default: false
  },

  // Is this channel approved by admin?
  approved: {
    type: Boolean,
    default: false
  },

  // Approval/rejection reason
  adminNote: {
    type: String,
    trim: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
channelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for efficient querying
channelSchema.index({ approved: 1, featured: 1 });
channelSchema.index({ games: 1 });
channelSchema.index({ user: 1 });
channelSchema.index({ platform: 1 });

// Static method to get approved channels
channelSchema.statics.getApprovedChannels = async function(game = null) {
  const query = { approved: true };

  if (game && game !== 'all') {
    if (game === 'wc12') {
      // Handle the combined Warcraft 1/2 category
      query.$or = [
        { games: 'wc1' },
        { games: 'wc2' },
        { games: 'wc12' }
      ];
    } else {
      query.games = game;
    }
  }

  return this.find(query)
    .sort({ featured: -1, createdAt: -1 });
};

// Static method to get featured channels
channelSchema.statics.getFeaturedChannels = async function(game = null) {
  const query = { approved: true, featured: true };

  if (game && game !== 'all') {
    if (game === 'wc12') {
      // Handle the combined Warcraft 1/2 category
      query.$or = [
        { games: 'wc1' },
        { games: 'wc2' },
        { games: 'wc12' }
      ];
    } else {
      query.games = game;
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 });
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;
