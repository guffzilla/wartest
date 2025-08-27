const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Player Schema
 *
 * Represents a player in the game, which may or may not be linked to a user account.
 * Players can exist before users claim them, as they're created when match reports are submitted.
 */
const PlayerSchema = new Schema({
  // Player's in-game name (required and unique)
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: [2, 'Player name must be at least 2 characters long'],
    maxlength: [20, 'Player name must be no more than 20 characters long']
  },

  // Reference to user who has claimed this player (optional)
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Whether this player has been claimed by a user
  claimed: {
    type: Boolean,
    default: false
  },

  // Whether this player is an AI opponent
  isAI: {
    type: Boolean,
    default: false
  },

  // MMR (Matchmaking Rating)
  mmr: {
    type: Number,
    default: 1500
  },

  // Game type preference (wc1, wc2, or wc3)
  gameType: {
    type: String,
    enum: ['wc1', 'wc2', 'wc3'],
    required: true,
    index: true
  },

  // Preferred race
  preferredRace: {
    type: String,
    enum: ['human', 'orc', 'undead', 'night_elf', 'random'],
    default: 'random'
  },

  // Current rank information
  rank: {
    name: {
      type: String,
      default: 'Bronze 1'
    },
    image: {
      type: String,
      default: '/assets/img/ranks/b1.png'
    },
    threshold: {
      type: Number,
      default: 0
    }
  },

  // Match history
  matches: [{
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'Match'
    },
    date: {
      type: Date,
      default: Date.now
    },
    mmrBefore: Number,
    mmrAfter: Number,
    mmrChange: Number,
    outcome: {
      type: String,
      enum: ['win', 'loss', 'draw'],
      required: true
    },
    rankBefore: String,
    rankAfter: String,
    rankChanged: Boolean
  }],

  // Player statistics
  stats: {
    totalMatches: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    highestMmr: {
      type: Number,
      default: 1500
    },
    highestRank: {
      type: String,
      default: 'Bronze 1'
    },
    // Match type specific stats
    matchTypes: {
      '1v1': {
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        mmr: { type: Number, default: 1500 }
      },
      '2v2': {
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        mmr: { type: Number, default: 1500 }
      },
      '3v3': {
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        mmr: { type: Number, default: 1500 }
      },
      '4v4': {
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        mmr: { type: Number, default: 1500 }
      },
      'ffa': {
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        mmr: { type: Number, default: 1500 }
      },
      'vsai': {
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        mmr: { type: Number, default: 1500 } // Standalone MMR, doesn't affect overall
      }
    },
    // Race statistics
    races: {
      human: { type: Number, default: 0 },
      orc: { type: Number, default: 0 },
      undead: { type: Number, default: 0 },
      night_elf: { type: Number, default: 0 },
      random: { type: Number, default: 0 }
    },
    // Race win statistics
    raceWins: {
      human: { type: Number, default: 0 },
      orc: { type: Number, default: 0 },
      undead: { type: Number, default: 0 },
      night_elf: { type: Number, default: 0 },
      random: { type: Number, default: 0 }
    },
    // Map statistics (most played maps)
    maps: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Map win statistics
    mapWins: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Map win rates
    mapWinRates: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Resource level statistics
    resources: {
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 }
    },
    // Combined map and resource statistics
    mapResources: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Map and resource win statistics
    mapResourceWins: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },

  // Last activity timestamp
  lastActive: {
    type: Date,
    default: Date.now
  },

  // Whether this player is active in the current season
  isActive: {
    type: Boolean,
    default: true
  },

  // Additional metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for faster lookups
PlayerSchema.index({ name: 1, gameType: 1 }); // Unique player per game type
PlayerSchema.index({ gameType: 1, mmr: -1 }); // Leaderboards per game type
PlayerSchema.index({ mmr: -1 });
PlayerSchema.index({ user: 1 });
PlayerSchema.index({ 'stats.totalMatches': -1 });

// Static method to find player by name (case insensitive)
PlayerSchema.statics.findByName = function(name) {
  return this.findOne({ name: new RegExp('^' + name + '$', 'i') });
};

// Static method to get top players by MMR
PlayerSchema.statics.getTopPlayers = function(limit = 100) {
  return this.find({ isActive: true })
    .sort({ mmr: -1 })
    .limit(limit);
};

// Static method to update player stats after a match
PlayerSchema.statics.updatePlayerStats = async function(playerId, matchResult) {
  const player = await this.findById(playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  console.log(`📊 Player ${player.name} stats before update:`, {
    totalMatches: player.stats.totalMatches,
    wins: player.stats.wins,
    losses: player.stats.losses,
    matchTypeWins: player.stats.matchTypes[matchResult.matchType]?.wins || 0,
    matchTypeLosses: player.stats.matchTypes[matchResult.matchType]?.losses || 0
  });

  // Update match type specific stats first
  const matchType = matchResult.matchType;
  if (player.stats.matchTypes[matchType]) {
    const oldMatchTypeMatches = player.stats.matchTypes[matchType].matches;
    const oldMatchTypeWins = player.stats.matchTypes[matchType].wins;
    const oldMatchTypeLosses = player.stats.matchTypes[matchType].losses;

    player.stats.matchTypes[matchType].matches += 1;

    if (matchResult.outcome === 'win') {
      player.stats.matchTypes[matchType].wins += 1;
      console.log(`🏆 Incremented ${matchType} wins for ${player.name}: ${oldMatchTypeWins} → ${player.stats.matchTypes[matchType].wins}`);
    } else if (matchResult.outcome === 'loss') {
      player.stats.matchTypes[matchType].losses += 1;
      console.log(`💔 Incremented ${matchType} losses for ${player.name}: ${oldMatchTypeLosses} → ${player.stats.matchTypes[matchType].losses}`);
    }

    console.log(`📈 ${matchType} matches for ${player.name}: ${oldMatchTypeMatches} → ${player.stats.matchTypes[matchType].matches}`);

    // Update win rate for this match type
    if (player.stats.matchTypes[matchType].matches > 0) {
      player.stats.matchTypes[matchType].winRate =
        (player.stats.matchTypes[matchType].wins / player.stats.matchTypes[matchType].matches) * 100;
    }
  } else {
    console.warn(`⚠️ Match type ${matchType} not found in player stats for ${player.name}`);
  }

  // Calculate overall stats from all match types instead of incrementing directly
  let totalMatches = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;

  const matchTypes = ['1v1', '2v2', '3v3', '4v4', 'ffa'];
  matchTypes.forEach(type => {
    if (player.stats.matchTypes[type]) {
      totalMatches += player.stats.matchTypes[type].matches || 0;
      totalWins += player.stats.matchTypes[type].wins || 0;
      totalLosses += player.stats.matchTypes[type].losses || 0;
      // Note: draws are currently always 0 in match types, but keeping for consistency
    }
  });

  console.log(`🧮 Calculated overall stats for ${player.name}:`, {
    before: { matches: player.stats.totalMatches, wins: player.stats.wins, losses: player.stats.losses },
    calculated: { matches: totalMatches, wins: totalWins, losses: totalLosses }
  });

  // Update overall stats with calculated values
  player.stats.totalMatches = totalMatches;
  player.stats.wins = totalWins;
  player.stats.losses = totalLosses;
  player.stats.draws = totalDraws;

  // Update overall win rate
  if (player.stats.totalMatches > 0) {
    player.stats.winRate = (player.stats.wins / player.stats.totalMatches) * 100;
  }

  console.log(`✅ Updated overall stats for ${player.name}:`, {
    totalMatches: player.stats.totalMatches,
    wins: player.stats.wins,
    losses: player.stats.losses,
    winRate: player.stats.winRate.toFixed(2)
  });

  // Update race statistics
  if (matchResult.race && ['human', 'orc', 'random'].includes(matchResult.race)) {
    // Initialize race stats if not present
    if (!player.stats.races) player.stats.races = { human: 0, orc: 0, random: 0 };
    if (!player.stats.raceWins) player.stats.raceWins = { human: 0, orc: 0, random: 0 };

    player.stats.races[matchResult.race] = (player.stats.races[matchResult.race] || 0) + 1;

    // Update race win statistics if this was a win
    if (matchResult.outcome === 'win') {
      player.stats.raceWins[matchResult.race] = (player.stats.raceWins[matchResult.race] || 0) + 1;
    }
  }

  // Process map statistics without debug logging
  if (matchResult && matchResult.map) {
    const mapName = matchResult.map;
    
    // Initialize maps object if it doesn't exist
    if (!player.stats.maps) {
      player.stats.maps = {};
    }
    
    // Initialize mapWins object if it doesn't exist
    if (!player.stats.mapWins) {
      player.stats.mapWins = {};
    }

    // Update map count
    player.stats.maps[mapName] = (player.stats.maps[mapName] || 0) + 1;

    // Update map wins if this player won
    if (matchResult.outcome === 'win') {
      player.stats.mapWins[mapName] = (player.stats.mapWins[mapName] || 0) + 1;
    }
  }

  // Update resource level statistics
  if (matchResult.resourceLevel && ['high', 'medium', 'low'].includes(matchResult.resourceLevel)) {
    // Initialize resource stats if not present
    if (!player.stats.resources) player.stats.resources = { high: 0, medium: 0, low: 0 };
    if (!player.stats.resourceWins) player.stats.resourceWins = { high: 0, medium: 0, low: 0 };

    player.stats.resources[matchResult.resourceLevel] = (player.stats.resources[matchResult.resourceLevel] || 0) + 1;

    // Update resource win statistics if this was a win
    if (matchResult.outcome === 'win') {
      player.stats.resourceWins[matchResult.resourceLevel] = (player.stats.resourceWins[matchResult.resourceLevel] || 0) + 1;
    }
  }

  // Update combined map and resource statistics
  if (matchResult.map && matchResult.map.name && matchResult.resourceLevel) {
    const mapName = matchResult.map.name;
    const resourceLevel = matchResult.resourceLevel;
    const mapResourceKey = `${mapName}|${resourceLevel}`;

    // Initialize mapResources and mapResourceWins if not present
    if (!player.stats.mapResources) player.stats.mapResources = {};
    if (!player.stats.mapResourceWins) player.stats.mapResourceWins = {};

    // Increment the count for this map+resource combination
    player.stats.mapResources[mapResourceKey] = (player.stats.mapResources[mapResourceKey] || 0) + 1;

    // If this was a win, increment the win count for this map+resource combination
    if (matchResult.outcome === 'win') {
      player.stats.mapResourceWins[mapResourceKey] = (player.stats.mapResourceWins[mapResourceKey] || 0) + 1;
    }
  }

  // Update highest MMR and rank if applicable
  if (matchResult.mmrAfter > player.stats.highestMmr) {
    player.stats.highestMmr = matchResult.mmrAfter;
    player.stats.highestRank = matchResult.rankAfter;
  }

  // Check if rank changed and update user avatar if needed
  const oldRank = player.rank?.name;
  if (matchResult.rankAfter && matchResult.rankAfter !== oldRank) {
    console.log(`🎯 Player ${player.name} rank changed: ${oldRank} → ${matchResult.rankAfter}`);
    
    // Update player's rank in database
    player.rank = {
      name: matchResult.rankAfter,
      image: matchResult.rankImage || `/assets/img/ranks/${matchResult.rankAfter.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.png`,
      threshold: matchResult.rankThreshold
    };
    
    // Update user avatar if this player is linked to a user
    if (player.user) {
      try {
        const avatarService = require('../services/avatarService');
        await avatarService.handlePlayerRankChange(player._id);
      } catch (error) {
        console.error('Error updating user avatar after rank change:', error);
      }
    }
  }

  // Update last active timestamp
  player.lastActive = new Date();

  // Save and return updated player
  return player.save();
};

module.exports = mongoose.model('Player', PlayerSchema);
