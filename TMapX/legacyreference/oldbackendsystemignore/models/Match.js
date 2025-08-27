const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Match Schema - Optimized for Performance & Standardized Structure
 *
 * Represents a match between players, including match details, results, and verification status.
 * Optimized to reduce redundancy and improve query performance.
 * Standardized structure for WC1, WC2, and WC3 games.
 */
const MatchSchema = new Schema({
  // Game type (wc1, wc2, or wc3) - standardized naming
  gameType: {
    type: String,
    enum: ['wc1', 'wc2', 'wc3'],
    required: true,
    index: true
  },

  // Match type (1v1, 2v2, 3v3, 4v4, ffa, vsai)
  matchType: {
    type: String,
    required: true,
    enum: ['1v1', '2v2', '3v3', '4v4', 'ffa', 'vsai'],
    index: true
  },

  // Map information - unified structure for all game types
  map: {
    // Map name for quick display (denormalized for performance)
    name: {
      type: String,
      required: true,
      index: true
    },
    // Unified map reference - single field for all game types
    mapId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    // Map type to determine which collection to reference
    mapType: {
      type: String,
      enum: ['wc1', 'wc2', 'wc3'],
      required: true,
      index: true
    }
  },

  // Resource level (high, medium, low)
  resourceLevel: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low', 'na'],
    index: true
  },

  // Players involved in the match - optimized structure
  players: [{
    // Reference to Player model (required for all players)
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true
    },
    // Team assignment for team games
    team: {
      type: Number,
      default: 0, // 0 for FFA, 1 or 2 for team matches
      index: true
    },
    // Placement for FFA matches
    placement: {
      type: Number,
      default: null
    },
    // Race played in this match
    race: {
      type: String,
      enum: ['human', 'orc', 'undead', 'night_elf', 'random'],
      default: 'random'
    },
    // MMR tracking for this specific match
    mmrBefore: Number,
    mmrAfter: Number,
    mmrChange: Number,
    // Rank tracking
    rankBefore: String,
    rankAfter: String,
    rankChanged: Boolean
  }],

  // Winner information - simplified
  winner: {
    // For team matches: team number (1 or 2)
    // For 1v1/FFA: player ID
    // For VS AI: player ID if player wins, null if AI wins
    type: Schema.Types.Mixed,
    required: false
  },

  // Match date and time
  date: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Match duration in minutes
  duration: {
    type: Number,
    default: 0,
    index: true
  },

  // Screenshots for verification
  screenshots: [{
    url: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // Match verification status
  verification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'disputed'],
      default: 'pending',
      index: true
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    }
  },

  // Match report information
  report: {
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    battleReport: {
      type: String,
      default: ''
    },
    youtubeLink: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty strings
          return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(v);
        },
        message: 'Invalid YouTube URL format'
      }
    }
  },

  // Disputes
  disputes: [{
    disputedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    playerName: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'rejected'],
      default: 'open'
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolution: {
      type: String,
      default: null
    },
    evidence: {
      type: String,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  }],

  // Edit proposals for match modification
  editProposals: [{
    proposedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    proposedChanges: {
      map: String,
      resourceLevel: String,
      opponent: String,
      outcome: String,
      matchType: String,
      race: String,
      notes: String
    },
    editReason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewNotes: {
      type: String,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Whether MMR has been calculated and applied for this match
  mmrCalculated: {
    type: Boolean,
    default: false,
    index: true
  },

  // Whether this match counts towards ladder rankings
  countsForLadder: {
    type: Boolean,
    default: true,
    index: true
  },

  // Season information
  season: {
    type: Number,
    default: 1,
    index: true
  },

  // Uneven teams flag (for MMR adjustment)
  unevenTeams: {
    type: Boolean,
    default: false
  },

  // AI game options (for vsai matches)
  aiGameOptions: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

// Optimized indexes for better query performance
MatchSchema.index({ 'verification.status': 1, date: -1 });
MatchSchema.index({ 'players.playerId': 1, date: -1 });
MatchSchema.index({ 'map.mapId': 1, 'verification.status': 1 });
MatchSchema.index({ gameType: 1, 'verification.status': 1, date: -1 });
MatchSchema.index({ matchType: 1, 'verification.status': 1, date: -1 });
MatchSchema.index({ 'verification.status': 1, season: 1, date: -1 });

// Compound index for map queries
MatchSchema.index({ 'map.name': 1, 'verification.status': 1, date: -1 });

// Static method to get recent matches with optimized population
MatchSchema.statics.getRecentMatches = function(limit = 20, gameType = null) {
  const query = { 'verification.status': 'verified' };
  if (gameType) query.gameType = gameType;
  
  return this.find(query)
    .sort({ date: -1 })
    .limit(limit)
    .populate('players.playerId', 'name mmr rank gameType')
    .populate('report.reportedBy', 'username displayName avatar')
    .lean();
};

// Static method to get matches for a player with optimized population
MatchSchema.statics.getPlayerMatches = function(playerId, limit = 20, gameType = null) {
  const query = {
    'players.playerId': playerId,
    'verification.status': 'verified'
  };
  if (gameType) query.gameType = gameType;
  
  return this.find(query)
    .sort({ date: -1 })
    .limit(limit)
    .populate('players.playerId', 'name mmr rank gameType')
    .populate('report.reportedBy', 'username displayName avatar')
    .lean();
};

// Static method to get matches for a specific map
MatchSchema.statics.getMapMatches = function(mapId, mapType, limit = 20, page = 1) {
  const skip = (page - 1) * limit;
  
  return this.find({
    'map.mapId': mapId,
    'map.mapType': mapType,
    'verification.status': 'verified'
  })
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .populate('players.playerId', 'name mmr rank')
    .populate('report.reportedBy', 'username displayName')
    .lean();
};

// Static method to get match statistics for a map
MatchSchema.statics.getMapStats = function(mapId, mapType) {
  return this.aggregate([
    {
      $match: {
        'map.mapId': new mongoose.Types.ObjectId(mapId),
        'map.mapType': mapType,
        'verification.status': 'verified'
      }
    },
    {
      $group: {
        _id: null,
        totalMatches: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' },
        matchTypes: { $addToSet: '$matchType' },
        resourceLevels: { $addToSet: '$resourceLevel' },
        totalPlayers: { $sum: { $size: '$players' } }
      }
    }
  ]);
};

// Static method to get disputed matches
MatchSchema.statics.getDisputedMatches = function(limit = 20) {
  return this.find({ 'verification.status': 'disputed' })
    .sort({ date: -1 })
    .limit(limit)
    .populate('players.playerId', 'name mmr rank')
    .populate('report.reportedBy', 'username displayName avatar')
    .populate('disputes.disputedBy', 'username displayName avatar')
    .lean();
};

module.exports = mongoose.model('Match', MatchSchema);
