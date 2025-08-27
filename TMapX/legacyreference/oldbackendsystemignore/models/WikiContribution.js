const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Wiki Contribution Schema
 * Tracks user contributions and statistics for achievements and rewards
 */
const WikiContributionSchema = new Schema({
  // User who made contributions
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Contribution statistics
  stats: {
    // Edit counts
    totalEdits: {
      type: Number,
      default: 0
    },
    approvedEdits: {
      type: Number,
      default: 0
    },
    rejectedEdits: {
      type: Number,
      default: 0
    },
    pendingEdits: {
      type: Number,
      default: 0
    },

    // Quality metrics
    averageQualityScore: {
      type: Number,
      default: 0
    },
    totalHelpfulVotes: {
      type: Number,
      default: 0
    },
    totalUnhelpfulVotes: {
      type: Number,
      default: 0
    },

    // Content contributions
    gamesContributed: {
      type: [String],
      default: []
    },
    racesContributed: {
      type: [String],
      default: []
    },
    categoriesContributed: {
      type: [String],
      default: []
    },

    // Specializations (based on contribution patterns)
    specializations: [{
      type: {
        type: String,
        enum: ['wc1_expert', 'wc2_expert', 'wc3_expert', 'unit_specialist', 'building_specialist', 'lore_master', 'stat_optimizer']
      },
      earnedAt: {
        type: Date,
        default: Date.now
      },
      contributionCount: {
        type: Number,
        default: 0
      }
    }]
  },

  // Reputation system
  reputation: {
    score: {
      type: Number,
      default: 0
    },
    level: {
      type: String,
      enum: ['newcomer', 'contributor', 'veteran', 'expert', 'master', 'legendary'],
      default: 'newcomer'
    },
    trustLevel: {
      type: Number,
      default: 1, // 1-10, affects auto-approval
      min: 1,
      max: 10
    }
  },

  // Rewards earned
  rewards: {
    totalGoldEarned: {
      type: Number,
      default: 0
    },
    totalHonorEarned: {
      type: Number,
      default: 0
    },
    totalExperienceEarned: {
      type: Number,
      default: 0
    },
    
    // Milestone rewards
    milestones: [{
      type: {
        type: String,
        enum: ['first_edit', 'tenth_edit', 'hundred_edits', 'expert_status', 'master_contributor']
      },
      earnedAt: {
        type: Date,
        default: Date.now
      },
      goldReward: Number,
      honorReward: Number,
      experienceReward: Number
    }]
  },

  // Recent activity
  recentActivity: [{
    editId: {
      type: Schema.Types.ObjectId,
      ref: 'WikiEdit'
    },
    activityType: {
      type: String,
      enum: ['edit_created', 'edit_approved', 'edit_rejected', 'vote_received', 'milestone_reached']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: Schema.Types.Mixed
  }],

  // Preferences
  preferences: {
    autoNotifications: {
      type: Boolean,
      default: true
    },
    emailUpdates: {
      type: Boolean,
      default: false
    },
    preferredGames: {
      type: [String],
      default: []
    },
    expertiseAreas: {
      type: [String],
      default: []
    }
  },

  // Moderation info (if user becomes a moderator)
  moderation: {
    isModerator: {
      type: Boolean,
      default: false
    },
    moderatorLevel: {
      type: String,
      enum: ['junior', 'senior', 'lead'],
      default: 'junior'
    },
    moderationStats: {
      totalReviews: {
        type: Number,
        default: 0
      },
      approvalsGiven: {
        type: Number,
        default: 0
      },
      rejectionsGiven: {
        type: Number,
        default: 0
      }
    }
  }
}, {
  timestamps: true
});

// Indexes
WikiContributionSchema.index({ 'reputation.score': -1 });
WikiContributionSchema.index({ 'stats.totalEdits': -1 });
WikiContributionSchema.index({ 'stats.approvedEdits': -1 });

// Methods
WikiContributionSchema.methods.updateStats = async function() {
  const WikiEdit = require('./WikiEdit');
  
  // Get all edits by this user
  const edits = await WikiEdit.find({ editor: this.user });
  
  // Update basic stats
  this.stats.totalEdits = edits.length;
  this.stats.approvedEdits = edits.filter(e => e.status === 'approved').length;
  this.stats.rejectedEdits = edits.filter(e => e.status === 'rejected').length;
  this.stats.pendingEdits = edits.filter(e => e.status === 'pending').length;
  
  // Update quality metrics
  const approvedEdits = edits.filter(e => e.status === 'approved');
  if (approvedEdits.length > 0) {
    this.stats.averageQualityScore = approvedEdits.reduce((sum, edit) => 
      sum + (edit.quality.score || 0), 0) / approvedEdits.length;
  }
  
  // Update vote counts
  this.stats.totalHelpfulVotes = edits.reduce((sum, edit) => sum + edit.votes.helpful, 0);
  this.stats.totalUnhelpfulVotes = edits.reduce((sum, edit) => sum + edit.votes.unhelpful, 0);
  
  // Update reputation
  this.updateReputation();
  
  return this.save();
};

WikiContributionSchema.methods.updateReputation = function() {
  const approvalRate = this.stats.totalEdits > 0 ? 
    this.stats.approvedEdits / this.stats.totalEdits : 0;
  const voteRatio = this.stats.totalHelpfulVotes + this.stats.totalUnhelpfulVotes > 0 ?
    this.stats.totalHelpfulVotes / (this.stats.totalHelpfulVotes + this.stats.totalUnhelpfulVotes) : 0.5;
  
  // Calculate reputation score
  let score = 0;
  score += this.stats.approvedEdits * 10; // 10 points per approved edit
  score += this.stats.totalHelpfulVotes * 5; // 5 points per helpful vote
  score -= this.stats.rejectedEdits * 5; // -5 points per rejected edit
  score -= this.stats.totalUnhelpfulVotes * 2; // -2 points per unhelpful vote
  score += this.stats.averageQualityScore * 2; // Quality bonus
  
  this.reputation.score = Math.max(0, score);
  
  // Update trust level (affects auto-approval)
  if (approvalRate >= 0.9 && this.stats.totalEdits >= 10) {
    this.reputation.trustLevel = Math.min(10, 5 + Math.floor(this.stats.approvedEdits / 20));
  } else if (approvalRate >= 0.7 && this.stats.totalEdits >= 5) {
    this.reputation.trustLevel = Math.min(5, 3 + Math.floor(this.stats.approvedEdits / 10));
  }
  
  // Update reputation level
  if (this.reputation.score >= 1000) {
    this.reputation.level = 'legendary';
  } else if (this.reputation.score >= 500) {
    this.reputation.level = 'master';
  } else if (this.reputation.score >= 200) {
    this.reputation.level = 'expert';
  } else if (this.reputation.score >= 50) {
    this.reputation.level = 'veteran';
  } else if (this.reputation.score >= 10) {
    this.reputation.level = 'contributor';
  }
};

WikiContributionSchema.methods.addReward = function(type, gold = 0, honor = 0, experience = 0) {
  this.rewards.totalGoldEarned += gold;
  this.rewards.totalHonorEarned += honor;
  this.rewards.totalExperienceEarned += experience;
  
  if (type) {
    this.rewards.milestones.push({
      type,
      goldReward: gold,
      honorReward: honor,
      experienceReward: experience
    });
  }
  
  return this.save();
};

module.exports = mongoose.model('WikiContribution', WikiContributionSchema);