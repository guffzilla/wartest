const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * War3Map Schema
 * 
 * Represents a Warcraft 3 map with comprehensive metadata, strategic data, and rating system.
 * Based on the populated data structure from war3_map_processor.py
 */
const War3MapSchema = new Schema({
  // Basic map information
  filename: {
    type: String,
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  author: {
    type: String,
    default: 'Unknown'
  },
  
  description: {
    type: String,
    default: ''
  },
  
  // Map specifications
  players: {
    type: Number,
    min: 1,
    max: 12,
    default: 2
  },
  
  mapSize: {
    type: String,
    enum: ['32x32', '64x64', '96x96', '128x128', '160x160', '192x192', '224x224', '256x256', 'other'],
    default: 'other'
  },
  
  tileset: {
    type: String,
    enum: ['ashenvale', 'barrens', 'blackcitadel', 'cityscape', 'dalaran', 'dungeon', 'felwood', 'icecrown', 'lordaeron', 'northrend', 'outland', 'ruins', 'sunken', 'underground', 'village', 'other'],
    default: 'other'
  },
  
  // Strategic information
  goldmines: {
    type: Number,
    default: 0
  },
  
  neutralStructures: {
    type: Number,
    default: 0
  },
  
  creepUnits: {
    type: Number,
    default: 0
  },
  
  startingLocations: {
    type: Number,
    default: 0
  },
  
  dropTables: {
    type: Number,
    default: 0
  },
  
  inferredDropTables: {
    type: Number,
    default: 0
  },
  
  shopInventories: {
    type: Number,
    default: 0
  },
  
  // File paths
  thumbnailPath: {
    type: String,
    default: '/uploads/thumbnails/default-wc3-map.png'
  },
  
  hasThumbnail: {
    type: Boolean,
    default: false
  },
  
  overlayPath: {
    type: String,
    default: null
  },
  
  // Parsing quality
  accuracyScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  parsingMethod: {
    type: String,
    enum: ['jass', 'doo', 'combined', 'manual'],
    default: 'manual'
  },
  
  // Data completeness tracking
  dataCompleteness: {
    hasJass: {
      type: Boolean,
      default: false
    },
    hasDoo: {
      type: Boolean,
      default: false
    },
    hasDropTables: {
      type: Boolean,
      default: false
    },
    hasInferredDropTables: {
      type: Boolean,
      default: false
    },
    hasShopInventories: {
      type: Boolean,
      default: false
    },
    hasStartingPositions: {
      type: Boolean,
      default: false
    }
  },
  
  // Detailed strategic data
  strategicData: {
    jassGoldmines: [{
      type: Schema.Types.Mixed
    }],
    dooGoldmines: [{
      type: Schema.Types.Mixed
    }],
    jassNeutralStructures: [{
      type: Schema.Types.Mixed
    }],
    dooNeutralStructures: [{
      type: Schema.Types.Mixed
    }],
    jassCreepUnits: [{
      type: Schema.Types.Mixed
    }],
    dooCreepUnits: [{
      type: Schema.Types.Mixed
    }],
    jassStartingPositions: [{
      type: Schema.Types.Mixed
    }],
    dooStartingPositions: [{
      type: Schema.Types.Mixed
    }],
    starting_positions: [{
      type: Schema.Types.Mixed
    }],
    dropTables: [{
      type: Schema.Types.Mixed
    }],
    inferredDropTables: [{
      type: Schema.Types.Mixed
    }],
    shopInventories: [{
      type: Schema.Types.Mixed
    }],
    hasJassData: {
      type: Boolean,
      default: false
    },
    hasDooData: {
      type: Boolean,
      default: false
    },
    parsingMethod: {
      type: String,
      default: 'manual'
    }
  },
  
  // Rating system
  ratings: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Calculated rating statistics
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  ratingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Usage statistics
  downloadCount: {
    type: Number,
    default: 0
  },
  
  viewCount: {
    type: Number,
    default: 0
  },
  
  // Upload information
  uploadDate: {
    type: Date,
    default: Date.now
  },
  
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
War3MapSchema.index({ name: 1 });
War3MapSchema.index({ players: 1 });
War3MapSchema.index({ tileset: 1 });
War3MapSchema.index({ averageRating: -1, ratingCount: -1 });
War3MapSchema.index({ uploadDate: -1 });
War3MapSchema.index({ filename: 1 }, { unique: true });

// Virtual for display name
War3MapSchema.virtual('displayName').get(function() {
  return this.name || this.filename;
});

// Rating methods
War3MapSchema.methods.addRating = async function(userId, rating, comment = '') {
  // Remove existing rating from this user if it exists
  this.ratings = this.ratings.filter(r => !r.userId.equals(userId));
  
  // Add new rating
  this.ratings.push({
    userId,
    rating,
    comment,
    date: new Date()
  });
  
  // Recalculate average
  this.averageRating = this.ratings.reduce((sum, r) => sum + r.rating, 0) / this.ratings.length;
  this.ratingCount = this.ratings.length;
  
  return this.save();
};

War3MapSchema.methods.incrementView = async function() {
  this.viewCount += 1;
  return this.save();
};

War3MapSchema.methods.incrementDownload = async function() {
  this.downloadCount += 1;
  return this.save();
};

// Static methods
War3MapSchema.statics.findByPlayers = function(playerCount) {
  return this.find({ players: playerCount }).sort({ averageRating: -1, name: 1 });
};

War3MapSchema.statics.findByTileset = function(tileset) {
  return this.find({ tileset }).sort({ averageRating: -1, name: 1 });
};

War3MapSchema.statics.searchMaps = function(query, limit = 10) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { name: searchRegex },
      { filename: searchRegex },
      { author: searchRegex },
      { description: searchRegex }
    ]
  }).limit(limit).sort({ averageRating: -1, name: 1 });
};

module.exports = mongoose.model('War3Map', War3MapSchema);
