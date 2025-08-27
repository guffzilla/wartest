/**
 * Enhanced MMR Calculator Utility - WC3 Champions Style
 *
 * Features:
 * - Compressed MMR ranges for tighter competition  
 * - Placement match system with high volatility
 * - MMR decay for inactive players
 * - Activity-based rank protection
 */

// NEW COMPRESSED RANK DEFINITIONS (WC3 Champions Style)
const RANKS = [
  { name: 'Bronze 3', image: '/assets/img/ranks/b3.png', threshold: 1000 },
  { name: 'Bronze 2', image: '/assets/img/ranks/b2.png', threshold: 1050 },
  { name: 'Bronze 1', image: '/assets/img/ranks/b1.png', threshold: 1100 },
  { name: 'Gold 3', image: '/assets/img/ranks/g3.png', threshold: 1150 },
  { name: 'Gold 2', image: '/assets/img/ranks/g2.png', threshold: 1200 },
  { name: 'Gold 1', image: '/assets/img/ranks/g1.png', threshold: 1250 },
  { name: 'Amber 3', image: '/assets/img/ranks/a3.png', threshold: 1300 },
  { name: 'Amber 2', image: '/assets/img/ranks/a2.png', threshold: 1350 },
  { name: 'Amber 1', image: '/assets/img/ranks/a1.png', threshold: 1400 },
  { name: 'Sapphire 3', image: '/assets/img/ranks/s3.png', threshold: 1450 },
  { name: 'Sapphire 2', image: '/assets/img/ranks/s2.png', threshold: 1500 },
  { name: 'Sapphire 1', image: '/assets/img/ranks/s1.png', threshold: 1550 },
  { name: 'Champion', image: '/assets/img/ranks/champion.png', threshold: 1650 },
  // Extended high tiers (reuse champion image as placeholder)
  { name: 'Diamond 3', image: '/assets/img/ranks/champion.png', threshold: 1700 },
  { name: 'Diamond 2', image: '/assets/img/ranks/champion.png', threshold: 1750 },
  { name: 'Diamond 1', image: '/assets/img/ranks/champion.png', threshold: 1800 },
  { name: 'Master',    image: '/assets/img/ranks/champion.png', threshold: 1850 },
  { name: 'Grandmaster', image: '/assets/img/ranks/champion.png', threshold: 1900 }
];

// MMR SYSTEM CONFIGURATION
const MMR_CONFIG = {
  // New player starting MMR (middle of scale)
  STARTING_MMR: 1175,
  
  // Placement match system
  PLACEMENT: {
    GAMES_COUNT: 5,           // First 5 games are placement
    HIGH_K_FACTOR: 65,        // High volatility for placement
    NORMAL_K_FACTOR: 32       // Normal K-factor after placement
  },
  
  // MMR Decay system
  DECAY: {
    // Weekly game requirements by rank tier
    REQUIREMENTS: {
      'Champion': 3,          // Champion needs 3 games/week
      'Sapphire': 3,          // Sapphire needs 3 games/week  
      'Amber': 2,             // Amber needs 2 games/week
      'Gold': 1,              // Gold needs 1 game/week
      'Bronze': 1             // Bronze needs 1 game/week
    },
    
    // Decay settings
    DECAY_AMOUNT: 10,         // -10 MMR per missed week
    GRACE_PERIOD_DAYS: 14,    // 2 weeks protection after rank-up
    CHECK_INTERVAL_DAYS: 7,   // Check weekly
    
    // Minimum MMR (can't decay below Bronze 3)
    MIN_MMR: 1000
  },
  
  // MMR boundaries
  MIN_MMR: 1000,
  MAX_MMR: 2000
};

// AI MMR settings (updated for new scale)
const AI_MMR_SETTINGS = {
  MAX_GAIN_PER_MATCH: 10,   // Cap per vsAI match gain
  THRESHOLD: 1300,          // Keep AI impact below human median
  REDUCTION_RATE: 5,
  DIFFICULTY_MMR: {
    'easy': 1100,
    'normal': 1175,
    'hard': 1250,
    'insane': 1400
  }
};

/**
 * Determine if player is in placement matches
 * @param {Number} playerMatchCount - Total matches played in this match type
 * @returns {Boolean} - Whether player is in placement
 */
function isInPlacementMatches(playerMatchCount = 0) {
  return playerMatchCount < MMR_CONFIG.PLACEMENT.GAMES_COUNT;
}

/**
 * Get appropriate K-factor based on placement status and MMR
 * @param {Number} playerMmr - Player's current MMR
 * @param {Number} playerMatchCount - Matches played in this match type
 * @param {String} matchType - Type of match
 * @returns {Number} - K-factor to use
 */
function getKFactor(playerMmr, playerMatchCount = 0, matchType = '1v1') {
  // High volatility during placement matches
  if (isInPlacementMatches(playerMatchCount)) {
    return MMR_CONFIG.PLACEMENT.HIGH_K_FACTOR;
  }
  
  // Normal K-factor based on match type
  let baseKFactor = MMR_CONFIG.PLACEMENT.NORMAL_K_FACTOR;
  
  switch (matchType) {
    case '1v1':
      baseKFactor = 32;
      break;
    case '2v2':
      baseKFactor = 22; // slightly reduced team volatility
      break;
    case '3v3':
      baseKFactor = 18;
      break;
    case '4v4':
      baseKFactor = 14;
      break;
    case 'ffa':
      baseKFactor = 26;
      break;
    case 'vsai':
      baseKFactor = 10; // much lower for AI matches
      break;
  }

  // Top-end tapering: reduce K for high MMR to slow churn at the top
  if (playerMmr >= 1750) {
    baseKFactor = Math.max(12, Math.round(baseKFactor * 0.5));
  } else if (playerMmr >= 1650) {
    baseKFactor = Math.max(16, Math.round(baseKFactor * 0.75));
  }

  return baseKFactor;
}

/**
 * Calculate MMR change for a player based on match result
 * Enhanced with placement match volatility
 */
function calculateMmrChange(playerMmr, opponentMmr, outcome, matchType, playerMatchCount = 0) {
  // Get appropriate K-factor (higher during placement)
  const kFactor = getKFactor(playerMmr, playerMatchCount, matchType);

  // Calculate expected outcome using ELO formula
  const expectedOutcome = 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));

  // Determine actual outcome value
  let actualOutcome;
  switch (outcome) {
    case 'win':
      actualOutcome = 1;
      break;
    case 'loss':
      actualOutcome = 0;
      break;
    case 'draw':
      actualOutcome = 0.5;
      break;
    default:
      actualOutcome = 0;
  }

  // Calculate base MMR change
  let mmrChange = Math.round(kFactor * (actualOutcome - expectedOutcome));

  // Apply AI-specific rules: cap gain, modest loss multiplier
  if (matchType === 'vsai') {
    if (outcome === 'win') {
      mmrChange = Math.min(mmrChange, AI_MMR_SETTINGS.MAX_GAIN_PER_MATCH);
    } else if (outcome === 'loss') {
      mmrChange = Math.round(mmrChange * 1.25);
    }
  }

  // Ensure MMR stays within boundaries
  const newMmr = playerMmr + mmrChange;
  if (newMmr < MMR_CONFIG.MIN_MMR) {
    mmrChange = MMR_CONFIG.MIN_MMR - playerMmr;
  } else if (newMmr > MMR_CONFIG.MAX_MMR) {
    mmrChange = MMR_CONFIG.MAX_MMR - playerMmr;
  }

  return mmrChange;
}

/**
 * Get rank information based on MMR
 */
function getRankByMmr(mmr) {
  // Find the highest rank the player qualifies for
  let playerRank = RANKS[0]; // Default to lowest rank

  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (mmr >= RANKS[i].threshold) {
      playerRank = RANKS[i];
      break;
    }
  }

  return playerRank;
}

/**
 * Get rank tier for decay calculations
 * @param {String} rankName - Name of the rank
 * @returns {String} - Rank tier (Champion, Sapphire, Amber, Gold, Bronze)
 */
function getRankTier(rankName) {
  if (rankName.includes('Champion')) return 'Champion';
  if (rankName.includes('Sapphire')) return 'Sapphire';
  if (rankName.includes('Amber')) return 'Amber';
  if (rankName.includes('Gold')) return 'Gold';
  if (rankName.includes('Bronze')) return 'Bronze';
  return 'Bronze'; // Default
}

/**
 * Calculate required games per week for a rank
 * @param {String} rankName - Player's rank name
 * @returns {Number} - Games required per week
 */
function getRequiredGamesPerWeek(rankName) {
  const tier = getRankTier(rankName);
  return MMR_CONFIG.DECAY.REQUIREMENTS[tier] || 1;
}

/**
 * Check if player needs MMR decay applied
 * @param {Object} player - Player object with lastActive and rank
 * @returns {Object} - Decay information
 */
async function calculateDecayForPlayer(player) {
  const now = new Date();
  const lastActive = new Date(player.lastActive || now);
  const daysSinceActive = Math.floor((now - lastActive) / (24 * 60 * 60 * 1000));
  
  // No decay if within grace period or recently promoted
  if (daysSinceActive <= MMR_CONFIG.DECAY.GRACE_PERIOD_DAYS) {
    return { needsDecay: false, reason: 'Grace period' };
  }
  
  // Calculate weeks of inactivity
  const weeksInactive = Math.floor(daysSinceActive / MMR_CONFIG.DECAY.CHECK_INTERVAL_DAYS);
  
  if (weeksInactive === 0) {
    return { needsDecay: false, reason: 'Active this week' };
  }
  
  // Get required games for current rank
  const requiredGames = getRequiredGamesPerWeek(player.rank?.name || 'Bronze 3');
  
  // Calculate actual games played this week
  const gamesPlayedThisWeek = await countGamesThisWeek(player._id, player.gameType);
  
  if (gamesPlayedThisWeek >= requiredGames) {
    return { needsDecay: false, reason: 'Met activity requirement' };
  }
  
  // Calculate decay amount
  const decayAmount = weeksInactive * MMR_CONFIG.DECAY.DECAY_AMOUNT;
  const newMmr = Math.max(player.mmr - decayAmount, MMR_CONFIG.DECAY.MIN_MMR);
  
  return {
    needsDecay: true,
    weeksInactive,
    requiredGames,
    gamesPlayedThisWeek,
    decayAmount,
    oldMmr: player.mmr,
    newMmr,
    oldRank: getRankByMmr(player.mmr),
    newRank: getRankByMmr(newMmr)
  };
}

/**
 * Count games played by a player in the current week
 * @param {String} playerId - Player ID
 * @param {String} gameType - Game type (wc1, wc2, wc3)
 * @returns {Number} - Number of games played this week
 */
async function countGamesThisWeek(playerId, gameType) {
  try {
    const Match = require('../models/Match');
    
    // Calculate start of current week (Monday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Count matches for this player in the current week
    const matchCount = await Match.countDocuments({
      'players.playerId': playerId,
      gameType: gameType,
      createdAt: { $gte: startOfWeek }
    });
    
    return matchCount;
  } catch (error) {
    console.error('Error counting games this week:', error);
    return 0; // Return 0 if there's an error, which will trigger decay
  }
}

/**
 * Calculate MMR changes for all players in a match
 *
 * @param {Array} players - Array of player objects with matchTypeMMR, outcome, and matchTypeMatchCount properties
 * @param {String} matchType - '1v1', '2v2', '3v3', '4v4', or 'ffa'
 * @param {Boolean} unevenTeams - Whether the teams are uneven (for MMR adjustment)
 * @returns {Array} - Array of player objects with updated mmr, mmrChange, and rank
 * 
 * NOTE: Each player object should have:
 * - matchTypeMMR: the player's MMR for this specific match type
 * - matchTypeMatchCount: number of matches played in this specific match type (for provisional ratings)
 * - outcome: 'win', 'loss', or 'draw'
 * - Other player properties (playerId, name, team, etc.)
 */
function calculateMatchMmrChanges(players, matchType, unevenTeams = false) {
  // For Vs AI games, only calculate MMR changes for human players
  if (matchType === 'vsai') {
    // Filter out AI players
    const humanPlayers = players.filter(player => !player.isAI);

    // Calculate average MMR of AI players
    const aiPlayers = players.filter(player => player.isAI);
    const avgAiMmr = aiPlayers.reduce((sum, player) => sum + player.mmr, 0) / aiPlayers.length;

    // Calculate MMR changes for each human player
    return players.map(player => {
      // Skip AI players - they don't get MMR changes
      if (player.isAI) {
        return {
          ...player,
          mmrBefore: player.mmr,
          mmrAfter: player.mmr,
          mmrChange: 0,
          rankBefore: getRankByMmr(player.mmr).name,
          rankAfter: getRankByMmr(player.mmr).name,
          rankChanged: false
        };
      }

      // Calculate MMR change for human player
      const mmrChange = calculateMmrChange(player.mmr, avgAiMmr, player.outcome, matchType, player.matchCount || 0);
      const newMmr = player.mmr + mmrChange;

      // Get rank information
      const oldRank = getRankByMmr(player.mmr);
      const newRank = getRankByMmr(newMmr);

      return {
        ...player,
        mmrBefore: player.mmr,
        mmrAfter: newMmr,
        mmrChange: mmrChange,
        rankBefore: oldRank.name,
        rankAfter: newRank.name,
        rankChanged: oldRank.name !== newRank.name
      };
    });
  }

  // For team games, calculate average MMR for each team
  if (['2v2', '3v3', '4v4'].includes(matchType)) {
    const teamMmrs = {};
    const teamCounts = {};

    // Calculate total MMR and count for each team
    players.forEach(player => {
      if (!teamMmrs[player.team]) {
        teamMmrs[player.team] = 0;
        teamCounts[player.team] = 0;
      }
      teamMmrs[player.team] += player.mmr;
      teamCounts[player.team]++;
    });

    // Calculate average MMR for each team
    Object.keys(teamMmrs).forEach(team => {
      teamMmrs[team] = teamMmrs[team] / teamCounts[team];
    });

    // Calculate MMR changes for each player
    return players.map(player => {
      // Get average MMR of opposing team(s)
      let opponentMmr = 0;
      let opponentCount = 0;

      Object.keys(teamMmrs).forEach(team => {
        if (team != player.team) {
          opponentMmr += teamMmrs[team];
          opponentCount++;
        }
      });

      opponentMmr = opponentMmr / opponentCount;

      // Calculate base MMR change
      let mmrChange = calculateMmrChange(player.mmr, opponentMmr, player.outcome, matchType, player.matchCount || 0);

      // Apply uneven teams adjustment if needed
      if (unevenTeams) {
        // Get count of players on each team
        const teamSizes = {};
        players.forEach(p => {
          if (!teamSizes[p.team]) {
            teamSizes[p.team] = 0;
          }
          teamSizes[p.team]++;
        });

        // Determine if this player's team is smaller or larger
        const playerTeamSize = teamSizes[player.team];
        const otherTeamSizes = Object.entries(teamSizes)
          .filter(([team]) => team != player.team)
          .map(([_, size]) => size);

        // Get the size of the largest opposing team
        const largestOpposingTeamSize = Math.max(...otherTeamSizes);

        // Apply adjustment based on team size difference
        if (playerTeamSize < largestOpposingTeamSize) {
          // Smaller team gets a bonus for winning and reduced penalty for losing
          if (player.outcome === 'win') {
            // 50% bonus for winning as smaller team
            mmrChange = Math.round(mmrChange * 1.5);
          } else if (player.outcome === 'loss') {
            // 50% reduced penalty for losing as smaller team
            mmrChange = Math.round(mmrChange * 0.5);
          }
        } else if (playerTeamSize > Math.min(...otherTeamSizes)) {
          // Larger team gets reduced reward for winning and increased penalty for losing
          if (player.outcome === 'win') {
            // 50% reduced reward for winning as larger team
            mmrChange = Math.round(mmrChange * 0.5);
          } else if (player.outcome === 'loss') {
            // 50% increased penalty for losing as larger team
            mmrChange = Math.round(mmrChange * 1.5);
          }
        }
      }

      const newMmr = player.mmr + mmrChange;

      // Get rank information
      const oldRank = getRankByMmr(player.mmr);
      const newRank = getRankByMmr(newMmr);

      return {
        ...player,
        mmrBefore: player.mmr,
        mmrAfter: newMmr,
        mmrChange: mmrChange,
        rankBefore: oldRank.name,
        rankAfter: newRank.name,
        rankChanged: oldRank.name !== newRank.name
      };
    });
  }
  // For 1v1 matches
  else if (matchType === '1v1') {
    const player1 = players[0];
    const player2 = players[1];

    // Calculate MMR changes
    const player1MmrChange = calculateMmrChange(player1.mmr, player2.mmr, player1.outcome, matchType, player1.matchCount || 0);
    const player2MmrChange = calculateMmrChange(player2.mmr, player1.mmr, player2.outcome, matchType, player2.matchCount || 0);

    // Update player 1
    const player1NewMmr = player1.mmr + player1MmrChange;
    const player1OldRank = getRankByMmr(player1.mmr);
    const player1NewRank = getRankByMmr(player1NewMmr);

    // Update player 2
    const player2NewMmr = player2.mmr + player2MmrChange;
    const player2OldRank = getRankByMmr(player2.mmr);
    const player2NewRank = getRankByMmr(player2NewMmr);

    return [
      {
        ...player1,
        mmrBefore: player1.mmr,
        mmrAfter: player1NewMmr,
        mmrChange: player1MmrChange,
        rankBefore: player1OldRank.name,
        rankAfter: player1NewRank.name,
        rankChanged: player1OldRank.name !== player1NewRank.name
      },
      {
        ...player2,
        mmrBefore: player2.mmr,
        mmrAfter: player2NewMmr,
        mmrChange: player2MmrChange,
        rankBefore: player2OldRank.name,
        rankAfter: player2NewRank.name,
        rankChanged: player2OldRank.name !== player2NewRank.name
      }
    ];
  }
  // For FFA matches
  else if (matchType === 'ffa') {
    // Zero-sum FFA: compute base changes from placement vs avg, then normalize to sum 0
    const sorted = [...players].sort((a, b) => a.placement - b.placement);
    const avgMmr = sorted.reduce((s, p) => s + p.mmr, 0) / sorted.length;

    // Compute base changes: winner as win vs avg, others as loss vs avg
    const base = sorted.map(p => {
      const outcome = p.placement === 1 ? 'win' : 'loss';
      const change = calculateMmrChange(p.mmr, avgMmr, outcome, matchType, p.matchCount || 0);
      return { p, change };
    });

    // Normalize to zero-sum by subtracting mean and rounding
    const sum = base.reduce((s, x) => s + x.change, 0);
    const mean = sum / base.length;
    // Adjusted and ensure integer mmr changes with correction to hit exact zero
    let adjusted = base.map(x => ({ p: x.p, change: Math.round(x.change - mean) }));
    let correctedSum = adjusted.reduce((s, x) => s + x.change, 0);
    // Distribute remainder to top placements if needed
    let idx = 0;
    while (correctedSum !== 0) {
      const sign = correctedSum > 0 ? -1 : 1; // reduce magnitude to zero
      adjusted[idx % adjusted.length].change += sign;
      correctedSum += sign;
      idx++;
    }

    return adjusted.map(({ p, change }) => {
      const newMmr = p.mmr + change;
      const oldRank = getRankByMmr(p.mmr);
      const newRank = getRankByMmr(newMmr);
      return {
        ...p,
        mmrBefore: p.mmr,
        mmrAfter: newMmr,
        mmrChange: change,
        rankBefore: oldRank.name,
        rankAfter: newRank.name,
        rankChanged: oldRank.name !== newRank.name
      };
    });
  }

  return players;
}

module.exports = {
  RANKS,
  MMR_CONFIG,
  AI_MMR_SETTINGS,
  calculateMmrChange,
  getRankByMmr,
  calculateMatchMmrChanges,
  isInPlacementMatches,
  getKFactor,
  getRankTier,
  getRequiredGamesPerWeek,
  calculateDecayForPlayer,
  countGamesThisWeek
};

