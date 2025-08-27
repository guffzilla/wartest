const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Report Schema
 *
 * Represents a match report submitted by a user, which may include screenshots
 * and details about the match. This is used to create or update Match records.
 */
const ReportSchema = new Schema({
  // User who submitted the report
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Match type (1v1, 2v2, 3v3, 4v4, ffa, vsai)
  matchType: {
    type: String,
    required: true,
    enum: ['1v1', '2v2', '3v3', '4v4', 'ffa', 'vsai']
  },

  // Map information
  map: {
    name: {
      type: String,
      required: true
    },
    // Reference to Map model (optional, for tracking map usage)
    mapId: {
      type: Schema.Types.ObjectId,
      ref: 'Map',
      default: null
    }
  },

  // Resource level (high, medium, low)
  resourceLevel: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low']
  },

  // Players involved in the match
  players: [{
    name: {
      type: String,
      required: true
    },
    team: {
      type: Number,
      default: 0 // 0 for FFA, 1 or 2 for team matches
    },
    placement: Number // For FFA matches (1st, 2nd, 3rd, etc.)
  }],

  // Winner information
  winner: {
    // For team matches: team number that won (1 or 2)
    // For 1v1 or FFA: player name that won
    type: Schema.Types.Mixed,
    required: true
  },

  // Match date and time
  date: {
    type: Date,
    default: Date.now
  },

  // Match duration in minutes
  duration: {
    type: Number,
    default: 0
  },

  // Screenshots for verification
  screenshots: [{
    url: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // Additional notes
  notes: {
    type: String,
    default: ''
  },

  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processed', 'rejected'],
    default: 'pending'
  },

  // Reference to the created Match (if processed)
  match: {
    type: Schema.Types.ObjectId,
    ref: 'Match',
    default: null
  },

  // Rejection reason (if rejected)
  rejectionReason: {
    type: String,
    default: null
  },

  // Processed by admin
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Processed timestamp
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster lookups
ReportSchema.index({ status: 1 });
ReportSchema.index({ submittedBy: 1 });
ReportSchema.index({ createdAt: -1 });

// Static method to get pending reports
ReportSchema.statics.getPendingReports = function(limit = 20) {
  return this.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('submittedBy', 'username displayName avatar');
};

// Static method to get reports by user
ReportSchema.statics.getUserReports = function(userId, limit = 20) {
  return this.find({ submittedBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('processedBy', 'username displayName avatar')
    .populate('match');
};

module.exports = mongoose.model('Report', ReportSchema);
