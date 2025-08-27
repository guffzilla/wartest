const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Dispute Schema
 * 
 * Represents a dispute filed by a user against a match result.
 * This allows for better organization and management of disputes.
 */
const DisputeSchema = new Schema({
  // Match being disputed
  match: {
    type: Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  
  // User who filed the dispute
  disputedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Player name associated with the dispute
  playerName: {
    type: String,
    required: true
  },
  
  // Reason for the dispute
  reason: {
    type: String,
    required: true
  },
  
  // Status of the dispute
  status: {
    type: String,
    enum: ['open', 'resolved', 'rejected'],
    default: 'open'
  },
  
  // Admin who resolved the dispute
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Resolution details
  resolution: {
    type: String,
    default: null
  },
  
  // Evidence screenshots
  evidence: [{
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
  
  // Creation date
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Resolution date
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster lookups
DisputeSchema.index({ match: 1 });
DisputeSchema.index({ disputedBy: 1 });
DisputeSchema.index({ status: 1 });
DisputeSchema.index({ createdAt: -1 });

// Static method to get all open disputes
DisputeSchema.statics.getOpenDisputes = function(limit = 20) {
  return this.find({ status: 'open' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('match')
    .populate('disputedBy', 'username displayName avatar');
};

// Static method to get disputes by user
DisputeSchema.statics.getUserDisputes = function(userId, limit = 20) {
  return this.find({ disputedBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('match')
    .populate('resolvedBy', 'username displayName avatar');
};

// Static method to get disputes by match
DisputeSchema.statics.getMatchDisputes = function(matchId) {
  return this.find({ match: matchId })
    .sort({ createdAt: -1 })
    .populate('disputedBy', 'username displayName avatar')
    .populate('resolvedBy', 'username displayName avatar');
};

module.exports = mongoose.model('Dispute', DisputeSchema);
