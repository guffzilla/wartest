const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Wiki Edit Schema
 * Tracks all edits made to game units with full version control
 */
const WikiEditSchema = new Schema({
  // Reference to the game unit being edited
  gameUnit: {
    type: Schema.Types.ObjectId,
    ref: 'GameUnit',
    required: true,
    index: true
  },

  // User who made the edit
  editor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Edit metadata
  editType: {
    type: String,
    enum: ['create', 'update', 'delete', 'revert'],
    required: true,
    index: true
  },

  // What changed
  changes: {
    // Fields that were modified
    modifiedFields: [String],
    
    // Previous values (for reverting)
    previousData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    
    // New values
    newData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    
    // Human-readable summary
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    
    // Detailed change description
    description: {
      type: String,
      trim: true,
      maxlength: 2000
    }
  },

  // Moderation status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_approved'],
    default: 'pending',
    index: true
  },

  // Moderation info
  moderation: {
    moderator: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    moderationReason: String,
    autoApproved: {
      type: Boolean,
      default: false
    },
    autoApprovalReason: String
  },

  // Community feedback
  votes: {
    helpful: {
      type: Number,
      default: 0
    },
    unhelpful: {
      type: Number,
      default: 0
    },
    voters: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      vote: {
        type: String,
        enum: ['helpful', 'unhelpful']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Quality metrics
  quality: {
    score: {
      type: Number,
      default: 0,
      min: -100,
      max: 100
    },
    factors: {
      completeness: Number,  // How complete is the information
      accuracy: Number,      // How accurate (based on community feedback)
      formatting: Number,    // How well formatted
      sources: Number        // How well sourced
    }
  },

  // Source information
  sources: [{
    type: {
      type: String,
      enum: ['official', 'community', 'testing', 'other']
    },
    url: String,
    description: String,
    reliability: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  }],

  // Achievement tracking
  achievements: {
    contributed: {
      type: Boolean,
      default: false
    },
    firstEdit: {
      type: Boolean,
      default: false
    },
    expertContributor: {
      type: Boolean,
      default: false
    }
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    reviewCount: {
      type: Number,
      default: 0
    },
    approvalTime: Number, // Time taken to approve in seconds
    conflictResolution: String // If this edit resolved conflicts
  }
}, {
  timestamps: true
});

// Indexes for performance
WikiEditSchema.index({ gameUnit: 1, createdAt: -1 });
WikiEditSchema.index({ editor: 1, createdAt: -1 });
WikiEditSchema.index({ status: 1, createdAt: -1 });
WikiEditSchema.index({ 'votes.helpful': -1 });

// Methods
WikiEditSchema.methods.approve = function(moderatorId, reason = '') {
  this.status = 'approved';
  this.moderation.moderator = moderatorId;
  this.moderation.moderatedAt = new Date();
  this.moderation.moderationReason = reason;
  return this.save();
};

WikiEditSchema.methods.reject = function(moderatorId, reason) {
  this.status = 'rejected';
  this.moderation.moderator = moderatorId;
  this.moderation.moderatedAt = new Date();
  this.moderation.moderationReason = reason;
  return this.save();
};

WikiEditSchema.methods.addVote = function(userId, voteType) {
  // Remove existing vote from this user
  this.votes.voters = this.votes.voters.filter(
    voter => !voter.user.equals(userId)
  );
  
  // Add new vote
  this.votes.voters.push({
    user: userId,
    vote: voteType,
    votedAt: new Date()
  });
  
  // Update vote counts
  this.votes.helpful = this.votes.voters.filter(v => v.vote === 'helpful').length;
  this.votes.unhelpful = this.votes.voters.filter(v => v.vote === 'unhelpful').length;
  
  return this.save();
};

module.exports = mongoose.model('WikiEdit', WikiEditSchema);