const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Dark Portal Link Schema
 * 
 * Represents community links for the Dark Portal page
 * Includes Reddit, Discord, Battle.net groups, Maps/Mods, and Community Sites
 */
const DarkPortalLinkSchema = new Schema({
  // Link title/name
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // URL of the link
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },

  // Description of the link
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },

  // Optional image/icon for the link
  image: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },

  // Category of the link
  category: {
    type: String,
    required: true,
    enum: ['reddit', 'discord', 'battlenet', 'maps-mods', 'community-sites'],
    index: true
  },

  // Game type this link is related to
  gameType: {
    type: String,
    required: true,
    enum: ['wc1', 'wc2', 'wc3', 'wc12'],
    index: true
  },

  // Approval status
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending',
    index: true
  },

  // User who submitted the link
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Admin who approved/denied the link
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Review date
  reviewedAt: {
    type: Date,
    default: null
  },

  // Review notes (for admin use)
  reviewNotes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },

  // Display order for sorting
  displayOrder: {
    type: Number,
    default: 0
  },

  // Whether this link is featured/pinned
  featured: {
    type: Boolean,
    default: false
  },

  // Click count for analytics
  clickCount: {
    type: Number,
    default: 0
  },

  // Last clicked date
  lastClicked: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
DarkPortalLinkSchema.index({ category: 1, gameType: 1, status: 1 });
DarkPortalLinkSchema.index({ status: 1, createdAt: -1 });
DarkPortalLinkSchema.index({ submittedBy: 1 });
DarkPortalLinkSchema.index({ reviewedBy: 1 });
DarkPortalLinkSchema.index({ featured: -1, displayOrder: 1 });

// Virtual for category display name
DarkPortalLinkSchema.virtual('categoryDisplayName').get(function() {
  const categoryNames = {
    'reddit': 'WC Reddit',
    'discord': 'WC Discord',
    'battlenet': 'Battle.net Groups',
    'maps-mods': 'Maps and Mods',
    'community-sites': 'Community Sites'
  };
  return categoryNames[this.category] || this.category;
});

// Virtual for game type display name
DarkPortalLinkSchema.virtual('gameTypeDisplayName').get(function() {
  const gameTypeNames = {
    'wc1': 'Warcraft I',
    'wc2': 'Warcraft II',
    'wc3': 'Warcraft III',
    'wc12': 'Warcraft I/II'
  };
  return gameTypeNames[this.gameType] || this.gameType;
});

// Method to increment click count
DarkPortalLinkSchema.methods.incrementClickCount = function() {
  this.clickCount += 1;
  this.lastClicked = new Date();
  return this.save();
};

// Static method to get approved links by category and game type
DarkPortalLinkSchema.statics.getApprovedLinks = function(category, gameType) {
  const query = { 
    status: 'approved',
    category: category
  };
  
  // If gameType is specified and not 'all', filter by it
  if (gameType && gameType !== 'all') {
    query.gameType = gameType;
  }
  
  return this.find(query)
    .sort({ featured: -1, displayOrder: 1, createdAt: -1 })
    .populate('submittedBy', 'username')
    .populate('reviewedBy', 'username');
};

// Static method to get pending submissions for admin
DarkPortalLinkSchema.statics.getPendingSubmissions = function() {
  return this.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .populate('submittedBy', 'username email');
};

module.exports = mongoose.model('DarkPortalLink', DarkPortalLinkSchema);
