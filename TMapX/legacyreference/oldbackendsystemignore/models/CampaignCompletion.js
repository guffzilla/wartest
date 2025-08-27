const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Campaign Completion Schema
 * 
 * Tracks user completion of campaign missions with support for:
 * - Multiple difficulty modes (story, normal, hard)
 * - Speedrun times and proof
 * - Multiple playthroughs
 * - YouTube video links as proof
 */
const CampaignCompletionSchema = new Schema({
  // User who completed the mission
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Campaign mission that was completed
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },

  // Difficulty mode (for Warcraft 3 campaigns)
  difficulty: {
    type: String,
    enum: ['story', 'normal', 'hard'],
    default: 'normal'
  },

  // Speedrun information
  speedrun: {
    isSpeedrun: {
      type: Boolean,
      default: false
    },
    completionTime: {
      type: Number, // Time in seconds
      default: null
    },
    videoProof: {
      type: String, // YouTube URL
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow null/empty
          // Validate YouTube URL format
          return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(v);
        },
        message: 'Please provide a valid YouTube URL'
      }
    }
  },

  // Playthrough number (allows multiple completions)
  playthroughNumber: {
    type: Number,
    default: 1
  },

  // Screenshots as proof of completion
  screenshots: [{
    url: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    metadata: {
      creationTime: Date,
      modifiedTime: Date,
      size: Number,
      mimetype: String
    }
  }],

  // Completion date
  completedAt: {
    type: Date,
    default: Date.now
  },

  // Verification status
  verification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'verified' // Auto-verify for now, can add manual verification later
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



  experienceAwarded: {
    type: Number,
    default: 0
  },

  arenaGoldAwarded: {
    type: Number,
    default: 0
  },

  // Additional notes
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Updated compound index to allow multiple completions with different difficulties/playthroughs
CampaignCompletionSchema.index({ userId: 1, campaignId: 1, difficulty: 1, playthroughNumber: 1 }, { unique: true });

// Index for efficient queries
CampaignCompletionSchema.index({ userId: 1, completedAt: -1 });
CampaignCompletionSchema.index({ campaignId: 1, completedAt: -1 });
CampaignCompletionSchema.index({ userId: 1, difficulty: 1 });
CampaignCompletionSchema.index({ 'speedrun.isSpeedrun': 1, 'speedrun.completionTime': 1 });

// Static method to get user's campaign progress with difficulty breakdown
CampaignCompletionSchema.statics.getUserProgress = async function(userId) {
  return this.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId) }
    },
    {
      $lookup: {
        from: 'campaigns',
        localField: 'campaignId',
        foreignField: '_id',
        as: 'campaign'
      }
    },
    {
      $unwind: '$campaign'
    },
    {
      $group: {
        _id: {
          game: '$campaign.game',
          expansion: '$campaign.expansion',
          campaignName: '$campaign.campaignName',
          race: '$campaign.race'
        },
        completedMissions: { $sum: 1 },
        uniqueMissions: { $addToSet: '$campaignId' },
        totalExperienceFromMissions: { $sum: '$experienceAwarded' },
        totalExperience: { $sum: '$experienceAwarded' },
        totalArenaGold: { $sum: '$arenaGoldAwarded' },
        difficultyBreakdown: {
          $push: {
            difficulty: '$difficulty',
            missionId: '$campaignId',
            completedAt: '$completedAt'
          }
        },
        missions: {
          $push: {
            missionId: '$campaignId',
            missionNumber: '$campaign.missionNumber',
            missionName: '$campaign.missionName',
            difficulty: '$difficulty',
            playthroughNumber: '$playthroughNumber',
            completedAt: '$completedAt',
            experienceAwarded: '$experienceAwarded',
            arenaGoldAwarded: '$arenaGoldAwarded',
            isSpeedrun: '$speedrun.isSpeedrun',
            completionTime: '$speedrun.completionTime',
            videoProof: '$speedrun.videoProof'
          }
        }
      }
    },
    {
      $addFields: {
        uniqueMissionCount: { $size: '$uniqueMissions' }
      }
    },
    {
      $sort: { '_id.game': 1, '_id.expansion': 1, '_id.race': 1 }
    }
  ]);
};

// Static method to check if user completed a specific mission on a specific difficulty
CampaignCompletionSchema.statics.isCompleted = async function(userId, campaignId, difficulty = 'normal') {
  const completion = await this.findOne({ userId, campaignId, difficulty });
  return !!completion;
};

// Static method to get user's best speedrun times
CampaignCompletionSchema.statics.getUserSpeedruns = async function(userId) {
  return this.aggregate([
    {
      $match: { 
        userId: new mongoose.Types.ObjectId(userId),
        'speedrun.isSpeedrun': true,
        'speedrun.completionTime': { $exists: true, $ne: null }
      }
    },
    {
      $lookup: {
        from: 'campaigns',
        localField: 'campaignId',
        foreignField: '_id',
        as: 'campaign'
      }
    },
    {
      $unwind: '$campaign'
    },
    {
      $group: {
        _id: {
          campaignId: '$campaignId',
          difficulty: '$difficulty'
        },
        bestTime: { $min: '$speedrun.completionTime' },
        bestRun: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$bestRun' }
    },
    {
      $sort: { 'speedrun.completionTime': 1 }
    }
  ]);
};

// Static method to get leaderboard for a specific mission
CampaignCompletionSchema.statics.getMissionLeaderboard = async function(campaignId, difficulty = 'normal', limit = 10) {
  return this.aggregate([
    {
      $match: { 
        campaignId: new mongoose.Types.ObjectId(campaignId),
        difficulty: difficulty,
        'speedrun.isSpeedrun': true,
        'speedrun.completionTime': { $exists: true, $ne: null }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $group: {
        _id: '$userId',
        bestTime: { $min: '$speedrun.completionTime' },
        bestRun: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$bestRun' }
    },
    {
      $sort: { 'speedrun.completionTime': 1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        userId: 1,
        'user.username': 1,
        'user.displayName': 1,
        'speedrun.completionTime': 1,
        'speedrun.videoProof': 1,
        completedAt: 1,
        difficulty: 1
      }
    }
  ]);
};

// Static method to get completion statistics with difficulty breakdown
CampaignCompletionSchema.statics.getCompletionStats = async function(campaignId) {
  const stats = await this.aggregate([
    {
      $match: { campaignId: new mongoose.Types.ObjectId(campaignId) }
    },
    {
      $group: {
        _id: '$difficulty',
        totalCompletions: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        averageCompletionTime: { $avg: '$speedrun.completionTime' },
        bestTime: { $min: '$speedrun.completionTime' },
        firstCompletion: { $min: '$completedAt' },
        latestCompletion: { $max: '$completedAt' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    }
  ]);

  const overall = await this.aggregate([
    {
      $match: { campaignId: new mongoose.Types.ObjectId(campaignId) }
    },
    {
      $group: {
        _id: null,
        totalCompletions: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        speedruns: { $sum: { $cond: ['$speedrun.isSpeedrun', 1, 0] } }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    }
  ]);

  return {
    byDifficulty: stats,
    overall: overall[0] || {
      totalCompletions: 0,
      uniqueUserCount: 0,
      speedruns: 0
    }
  };
};

// Method to calculate difficulty multiplier for rewards
CampaignCompletionSchema.statics.getDifficultyMultiplier = function(difficulty) {
  const multipliers = {
    'story': 0.8,
    'normal': 1.0,
    'hard': 1.5
  };
  return multipliers[difficulty] || 1.0;
};

// Method to get next playthrough number for a user/mission/difficulty
CampaignCompletionSchema.statics.getNextPlaythroughNumber = async function(userId, campaignId, difficulty) {
  const lastCompletion = await this.findOne(
    { userId, campaignId, difficulty },
    { playthroughNumber: 1 },
    { sort: { playthroughNumber: -1 } }
  );
  
  return lastCompletion ? lastCompletion.playthroughNumber + 1 : 1;
};

module.exports = mongoose.model('CampaignCompletion', CampaignCompletionSchema); 