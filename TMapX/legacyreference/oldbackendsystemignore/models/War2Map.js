const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * War2Map Schema
 *
 * Represents a Warcraft 2 map, including metadata, ratings, strategic analysis and download information.
 */
const War2MapSchema = new Schema({
  // Map name (will be in CAPITAL LETTERS)
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
    uppercase: true // Automatically convert to uppercase
  },

  // Original filename (before any modifications)
  originalName: {
    type: String,
    required: true,
    trim: true
  },

  // Map description
  description: {
    type: String,
    default: ''
  },

  // Map file path
  filePath: {
    type: String,
    required: true
  },

  // Map thumbnail image path (basic thumbnail for cards)
  thumbnailPath: {
    type: String,
    default: '/uploads/thumbnails/default-map.png'
  },

  // Strategic thumbnail with overlays (for modal view)
  strategicThumbnailPath: {
    type: String,
    default: null
  },

  // Map size (e.g., 32x32, 64x64, 96x96, 128x128)
  size: {
    type: String,
    enum: ['32x32', '64x64', '96x96', '128x128', 'other'],
    default: 'other'
  },

  // Map dimensions
  dimensions: {
    width: { type: Number, default: 64 },
    height: { type: Number, default: 64 }
  },

  // Game type (wc1, wc2, wc3) - matches API expectations
  gameType: {
    type: String,
    enum: ['wc1', 'wc2', 'wc3'],
    required: true,
    index: true,
    default: 'wc2' // Default to WC2 for existing maps
  },

  // Map type (e.g., melee, custom, ffa, team)
  type: {
    type: String,
    enum: ['melee', 'custom', 'ffa', 'team'],
    default: 'melee'
  },

  // Tileset information - Maps PUD tileset codes to names
  tileset: {
    type: String,
    enum: ['forest', 'winter', 'wasteland', 'swamp', 'unknown'],
    default: 'forest'
  },

  // Version information
  version: {
    type: String,
    default: '1.0'
  },

  // Water features
  isWaterMap: { type: Boolean, default: false },
  hasWaterTiles: { type: Boolean, default: false },
  hasOilPatch: { type: Boolean, default: false },

  // Recommended player count
  playerCount: {
    min: {
      type: Number,
      default: 2
    },
    max: {
      type: Number,
      default: 8
    }
  },

  // STRATEGIC ANALYSIS DATA
  strategicAnalysis: {
    // Terrain distribution
    terrainDistribution: {
      water: { type: Number, default: 0 },
      shore: { type: Number, default: 0 },
      grass: { type: Number, default: 0 },
      trees: { type: Number, default: 0 },
      walls: { type: Number, default: 0 },
      dirt: { type: Number, default: 0 },
      rocks: { type: Number, default: 0 }
    },
    
    // Individual percentage fields for frontend compatibility
    waterPercentage: { type: Number, default: 0 },
    treePercentage: { type: Number, default: 0 },
    grassPercentage: { type: Number, default: 0 },

    // Goldmine analysis
    goldmineAnalysis: {
      totalGoldOnMap: { type: Number, default: 0 },
      averageGoldPerMine: { type: Number, default: 0 },
      goldminesByCategory: {
        veryLow: { type: Number, default: 0 }, // <10k
        low: { type: Number, default: 0 },     // 10k-25k
        medium: { type: Number, default: 0 },  // 25k-40k
        high: { type: Number, default: 0 },    // 40k-90k
        veryHigh: { type: Number, default: 0 } // >90k
      }
    },

    // Individual goldmines with positions and amounts
    goldmines: [{
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      goldAmount: { type: Number, required: true },
      goldAmountK: { type: String, required: true }, // e.g., "65k"
      category: { 
        type: String, 
        enum: ['Very Low', 'Low', 'Medium', 'High', 'Very High'],
        required: true 
      },
      proximityToStartingPositions: [{
        playerId: { type: Number, required: true },
        distance: { type: Number, required: true }
      }]
    }],

    // Player starting positions
    startingPositions: [{
      playerId: { type: Number, required: true },
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      race: { 
        type: String, 
        enum: ['human', 'orc', 'unknown'],
        default: 'unknown'
      }
    }],

    // Strategic balance metrics
    balanceMetrics: {
      resourceBalance: { type: String, default: 'unknown' }, // balanced, favors-expansion, etc.
      mapControl: { type: String, default: 'unknown' },      // open, choke-heavy, etc.
      strategicComplexity: { type: String, default: 'unknown' } // simple, moderate, complex
    }
  },

  // Map creator
  creator: {
    type: String,
    default: 'Unknown'
  },

  // User who uploaded the map
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Reverted back to required after import
    index: true
  },

  // Map ratings
  ratings: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
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

  // Download statistics
  downloadCount: {
    type: Number,
    default: 0
  },

  // View count
  viewCount: {
    type: Number,
    default: 0
  },

  // Featured status
  isFeatured: {
    type: Boolean,
    default: false
  },

  // Approval status
  isApproved: {
    type: Boolean,
    default: true
  },

  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],

  // Map difficulty
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'insane'],
    default: 'medium'
  },

  // Play count statistics
  playCount: {
    type: Number,
    default: 0
  },

  // Win statistics by race
  raceStats: {
    human: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    },
    orc: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 }
    }
  },

  // Victory conditions
  victoryConditions: {
    type: String,
    default: 'Standard'
  },

  // Special features
  features: {
    hasCustomUnits: { type: Boolean, default: false },
    hasCustomTechs: { type: Boolean, default: false },
    hasCustomSpells: { type: Boolean, default: false },
    hasCustomBuildings: { type: Boolean, default: false }
  },

  // File information
  fileInfo: {
    size: { type: Number, default: 0 }, // in bytes
    checksum: { type: String, default: '' },
    lastModified: { type: Date }
  },

  // Compatibility information
  compatibility: {
    version: { type: String, default: '2.0' },
    expansion: { type: Boolean, default: false }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
War2MapSchema.index({ name: 'text', description: 'text' });
War2MapSchema.index({ gameType: 1, averageRating: -1 });
War2MapSchema.index({ gameType: 1, downloadCount: -1 });
War2MapSchema.index({ gameType: 1, createdAt: -1 });
War2MapSchema.index({ uploadedBy: 1 });
War2MapSchema.index({ tags: 1 });
War2MapSchema.index({ tileset: 1 });
War2MapSchema.index({ size: 1 });
War2MapSchema.index({ type: 1 });
War2MapSchema.index({ playCount: -1 });
War2MapSchema.index({ isFeatured: -1, averageRating: -1 });

// Virtual for display name
War2MapSchema.virtual('displayName').get(function() {
  return this.name;
});

// Methods
War2MapSchema.methods.addRating = async function(userId, rating, comment = '') {
  // Remove existing rating from this user if it exists
  this.ratings = this.ratings.filter(r => !r.userId.equals(userId));
  
  // Add new rating
  this.ratings.push({
    userId,
    rating,
    comment,
    date: new Date()
  });
  
  // Recalculate average rating and count
  this.ratingCount = this.ratings.length;
  this.averageRating = this.ratings.length > 0 
    ? this.ratings.reduce((sum, r) => sum + r.rating, 0) / this.ratings.length 
    : 0;
  
  return await this.save();
};

War2MapSchema.methods.removeRating = async function(userId) {
  // Remove the rating
  this.ratings = this.ratings.filter(r => !r.userId.equals(userId));
  
  // Recalculate average rating and count
  this.ratingCount = this.ratings.length;
  this.averageRating = this.ratings.length > 0 
    ? this.ratings.reduce((sum, r) => sum + r.rating, 0) / this.ratings.length 
    : 0;
  
  return await this.save();
};

War2MapSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

War2MapSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

War2MapSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  return this.save();
};

// Static methods
War2MapSchema.statics.findByGameType = function(gameType, limit = 20) {
  return this.find({ gameType })
    .sort({ averageRating: -1, downloadCount: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username displayName');
};

War2MapSchema.statics.getFeaturedMaps = function(limit = 5) {
  return this.find({ isFeatured: true, isApproved: true })
    .sort({ averageRating: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username displayName');
};

War2MapSchema.statics.getPopularMaps = function(limit = 10) {
  return this.find({ isApproved: true })
    .sort({ downloadCount: -1, averageRating: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username displayName');
};

War2MapSchema.statics.getRecentMaps = function(limit = 10) {
  return this.find({ isApproved: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username displayName');
};

War2MapSchema.statics.searchMaps = async function(query, options = {}) {
  const {
    gameType,
    tileset,
    size,
    type,
    waterType,
    limit = 20,
    skip = 0,
    sortBy = 'relevance'
  } = options;

  let searchFilter = { isApproved: true };
  let aggregationPipeline = [];
  
  if (gameType) searchFilter.gameType = gameType;
  if (tileset) searchFilter.tileset = tileset;
  if (size) searchFilter.size = size;
  if (type) searchFilter.type = type;
  
  // Add waterType filtering
  if (waterType) {
    if (waterType === 'sea') {
      // Sea maps: either isWaterMap is true OR waterPercentage > 20%
      searchFilter.$or = [
        { isWaterMap: true },
        { 'strategicAnalysis.waterPercentage': { $gt: 20 } }
      ];
    } else if (waterType === 'land') {
      // Land maps: isWaterMap is false AND waterPercentage <= 20%
      searchFilter.isWaterMap = { $ne: true };
      searchFilter['strategicAnalysis.waterPercentage'] = { $lte: 20 };
    }
  }

  // If there's a search query, use smart search with prioritization
  if (query) {
    const queryLower = query.toLowerCase().trim();
    
    aggregationPipeline = [
      { $match: searchFilter },
      {
        $addFields: {
          searchScore: {
            $add: [
              // Exact match gets highest score (100)
              { $cond: [{ $eq: [{ $toLower: "$name" }, queryLower] }, 100, 0] },
              // Starts with query gets high score (50)
              { $cond: [{ $regexMatch: { input: { $toLower: "$name" }, regex: `^${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` } }, 50, 0] },
              // Contains query gets medium score (25)
              { $cond: [{ $regexMatch: { input: { $toLower: "$name" }, regex: queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } }, 25, 0] },
              // Word boundaries get bonus score (10)
              { $cond: [{ $regexMatch: { input: { $toLower: "$name" }, regex: `\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b` } }, 10, 0] },
              // Description matches get lower score (5)
              { $cond: [{ $regexMatch: { input: { $toLower: "$description" }, regex: queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } }, 5, 0] }
            ]
          }
        }
      },
      { $match: { searchScore: { $gt: 0 } } }
    ];
  } else {
    aggregationPipeline = [
      { $match: searchFilter }
    ];
  }

  // Add sorting
  let sort = {};
  switch (sortBy) {
    case 'rating':
      sort = { averageRating: -1, ratingCount: -1 };
      break;
    case 'downloads':
      sort = { downloadCount: -1 };
      break;
    case 'recent':
      sort = { createdAt: -1 };
      break;
    case 'name':
      // Custom alphabetical sort: numbers first, then letters (both ascending)
      aggregationPipeline.push({
        $addFields: {
          nameSort: {
            $concat: [
              // Add prefix "0" for names starting with numbers, "1" for letters
              { $cond: [
                { $regexMatch: { input: "$name", regex: "^[0-9]" } },
                "0",
                "1"
              ]},
              { $toLower: "$name" }
            ]
          }
        }
      });
      sort = { nameSort: 1 };
      break;
    default:
      if (query) {
        sort = { searchScore: -1, averageRating: -1 };
      } else {
        sort = { averageRating: -1 };
      }
  }

  aggregationPipeline.push(
    { $sort: sort },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'uploadedBy',
        foreignField: '_id',
        as: 'uploadedBy',
        pipeline: [{ $project: { username: 1, displayName: 1 } }]
      }
    },
    {
      $addFields: {
        uploadedBy: { $arrayElemAt: ['$uploadedBy', 0] }
      }
    }
  );

  const results = await this.aggregate(aggregationPipeline);
  return results;
};

module.exports = mongoose.model('War2Map', War2MapSchema, 'war2maps'); 