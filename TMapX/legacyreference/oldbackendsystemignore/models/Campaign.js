const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Campaign Schema
 * 
 * Represents campaign missions from Warcraft 1, 2, and 3
 * Tracks completion status per user
 */
const CampaignSchema = new Schema({
  // Game version (wc1, wc2, wc3)
  game: {
    type: String,
    required: true,
    enum: ['wc1', 'wc2', 'wc3']
  },

  // Expansion (for WC2: btdp, for WC3: roc, tft)
  expansion: {
    type: String,
    enum: ['base', 'btdp', 'roc', 'tft'],
    default: 'base'
  },

  // Campaign name (e.g., "Human Campaign", "Orc Campaign")
  campaignName: {
    type: String,
    required: true
  },

  // Race/faction (human, orc, undead, nightelf, alliance, horde)
  race: {
    type: String,
    required: true,
    enum: ['human', 'orc', 'undead', 'nightelf', 'alliance', 'horde']
  },

  // Mission number within the campaign
  missionNumber: {
    type: Number,
    required: true
  },

  // Mission name
  missionName: {
    type: String,
    required: true
  },

  // Mission description
  description: {
    type: String,
    default: ''
  },

  // Achievement points awarded for completion
  points: {
    type: Number,
    default: 50
  },

  // Experience points awarded for completion
  experience: {
    type: Number,
    default: 100
  },

  // Arena gold awarded for completion
  arenaGold: {
    type: Number,
    default: 50
  },

  // Whether this is a bonus/secret mission
  isBonus: {
    type: Boolean,
    default: false
  },

  // Order for display purposes
  displayOrder: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
CampaignSchema.index({ game: 1, expansion: 1, race: 1, missionNumber: 1 });
CampaignSchema.index({ game: 1, expansion: 1, campaignName: 1 });

// Static method to get all campaigns grouped by game
CampaignSchema.statics.getAllCampaigns = async function() {
  return this.aggregate([
    {
      $sort: { game: 1, expansion: 1, race: 1, missionNumber: 1 }
    },
    {
      $group: {
        _id: {
          game: '$game',
          expansion: '$expansion',
          campaignName: '$campaignName',
          race: '$race'
        },
        missions: {
          $push: {
            _id: '$_id',
            missionNumber: '$missionNumber',
            missionName: '$missionName',
            description: '$description',
            points: '$points',
            experience: '$experience',
            arenaGold: '$arenaGold',
            isBonus: '$isBonus',
            displayOrder: '$displayOrder'
          }
        },
        totalMissions: { $sum: 1 },
        totalPoints: { $sum: '$points' },
        totalExperience: { $sum: '$experience' },
        totalArenaGold: { $sum: '$arenaGold' }
      }
    },
    {
      $group: {
        _id: {
          game: '$_id.game',
          expansion: '$_id.expansion'
        },
        campaigns: {
          $push: {
            campaignName: '$_id.campaignName',
            race: '$_id.race',
            missions: '$missions',
            totalMissions: '$totalMissions',
            totalPoints: '$totalPoints',
            totalExperience: '$totalExperience',
            totalArenaGold: '$totalArenaGold'
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        campaigns: 1,
        game: '$_id.game',
        expansion: '$_id.expansion'
      }
    },
    {
      $sort: { game: 1, expansion: 1 }
    }
  ]);
};

// Static method to get campaign by game and race
CampaignSchema.statics.getCampaignMissions = async function(game, expansion = 'base', race) {
  return this.find({ 
    game, 
    expansion, 
    race 
  }).sort({ missionNumber: 1 });
};

module.exports = mongoose.model('Campaign', CampaignSchema); 