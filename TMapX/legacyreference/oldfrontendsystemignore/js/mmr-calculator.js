/**
 * Advanced MMR Calculator for Warcraft Arena Ladder System
 *
 * This module provides sophisticated MMR calculations for different match types:
 * - 1v1 matches
 * - Team matches (2v2, 3v3, 4v4)
 * - FFA (Free-For-All) matches
 * - Uneven team matches
 * - Matches against AI opponents
 *
 * The system uses an enhanced Elo rating algorithm with K-factor adjustments
 * based on match type, player count, and team balance.
 */
import logger from '/js/utils/logger.js';

const MMRCalculator = (function() {
  // Base configuration values - Updated for WC3 Champions system
  const MMR_CONFIG = {
    // Base starting MMR for new players
    BASE_MMR: 1200,

    // K-factor ranges (determines how much MMR can change per match)
    K_FACTOR: {
      LOW_MMR: 32,     // For players below 1400 MMR
      MID_MMR: 24,     // For players between 1400-1600 MMR  
      HIGH_MMR: 16     // For players above 1600 MMR
    },

    // Placement match system
    PLACEMENT: {
      GAMES_COUNT: 5,           // First 5 games are placement
      HIGH_K_FACTOR: 65,        // High volatility for placement
      NORMAL_K_FACTOR: 32       // Normal K-factor after placement
    },

    // Team size multipliers (reduces MMR changes in team games)
    TEAM_SIZE_MULTIPLIER: {
      '1v1': 1.0,      // No reduction
      '2v2': 0.85,     // 15% reduction
      '3v3': 0.75,     // 25% reduction
      '4v4': 0.65      // 35% reduction
    },

    // FFA multipliers based on player count
    FFA_MULTIPLIER: {
      '3': 0.9,        // 3 players
      '4': 0.85,       // 4 players
      '5': 0.8,        // 5 players
      '6': 0.75,       // 6 players
      '7': 0.7,        // 7 players
      '8': 0.65        // 8 players
    },

    // AI opponent settings (updated for new scale)
    AI: {
      // AI difficulty MMR equivalents
      DIFFICULTY_MMR: {
        'easy': 1100,
        'normal': 1200,
        'hard': 1350,
        'insane': 1500
      },
      // Maximum MMR gain possible against AI
      MAX_GAIN: 25,
      // MMR threshold after which gains against AI are reduced
      THRESHOLD: 1400,
      // Rate at which gains are reduced after threshold (per 100 MMR)
      REDUCTION_RATE: 5
    },

    // MMR boundaries
    MIN_MMR: 1000,
    MAX_MMR: 2000,

    // Uneven teams modifiers
    UNDERDOG_BONUS: 1.5,    // Multiplier for underdogs winning
    FAVORITE_PENALTY: 0.5,  // Multiplier for favorites losing

    // NEW COMPRESSED RANK DEFINITIONS (WC3 Champions Style)
    RANKS: [
      { name: "Bronze 3", threshold: 1000, image: "/assets/img/ranks/b3.png" },
      { name: "Bronze 2", threshold: 1050, image: "/assets/img/ranks/b2.png" },
      { name: "Bronze 1", threshold: 1100, image: "/assets/img/ranks/b1.png" },
      { name: "Gold 3", threshold: 1150, image: "/assets/img/ranks/g3.png" },
      { name: "Gold 2", threshold: 1200, image: "/assets/img/ranks/g2.png" },
      { name: "Gold 1", threshold: 1250, image: "/assets/img/ranks/g1.png" },
      { name: "Amber 3", threshold: 1300, image: "/assets/img/ranks/a3.png" },
      { name: "Amber 2", threshold: 1350, image: "/assets/img/ranks/a2.png" },
      { name: "Amber 1", threshold: 1400, image: "/assets/img/ranks/a1.png" },
      { name: "Sapphire 3", threshold: 1450, image: "/assets/img/ranks/s3.png" },
      { name: "Sapphire 2", threshold: 1500, image: "/assets/img/ranks/s2.png" },
      { name: "Sapphire 1", threshold: 1550, image: "/assets/img/ranks/s1.png" },
      { name: "Champion", threshold: 1600, image: "/assets/img/ranks/champion.png" }
    ]
  };

  /**
   * Calculate MMR changes for a 1v1 match
   * @param {Object} player1 - Winner player object with mmr property
   * @param {Object} player2 - Loser player object with mmr property
   * @param {Boolean} isPlayerAI - Whether player2 is an AI opponent
   * @param {String} aiDifficulty - AI difficulty if player2 is AI ('easy', 'normal', 'hard', 'insane')
   * @returns {Object} MMR changes for both players
   */
  function calculate1v1MMR(player1, player2, isPlayerAI = false, aiDifficulty = null) {
    // Handle AI opponents
    if (isPlayerAI && aiDifficulty) {
      return calculateAgainstAI(player1, aiDifficulty);}

    // Expected win probabilities based on Elo formula
    const expectedWinP1 = 1 / (1 + Math.pow(10, (player2.mmr - player1.mmr) / 400));
    const expectedWinP2 = 1 - expectedWinP1;

    // Determine K-factors based on MMR ranges
    const kFactorP1 = getKFactor(player1.mmr);
    const kFactorP2 = getKFactor(player2.mmr);

    // Calculate MMR changes (winner gets positive, loser gets negative)
    const mmrChangeP1 = Math.round(kFactorP1 * (1 - expectedWinP1));
    const mmrChangeP2 = Math.round(kFactorP2 * (0 - expectedWinP2));

    // Calculate new ranks based on updated MMR
    const newRankP1 = getRankByMMR(player1.mmr + mmrChangeP1);
    const newRankP2 = getRankByMMR(player2.mmr + mmrChangeP2);

    return {
      winner: {
        id: player1.id,
        oldMMR: player1.mmr,
        newMMR: player1.mmr + mmrChangeP1,
        change: mmrChangeP1,
        oldRank: getRankByMMR(player1.mmr),
        newRank: newRankP1,
        rankChanged: getRankByMMR(player1.mmr).name !== newRankP1.name
      },
      loser: {
        id: player2.id,
        oldMMR: player2.mmr,
        newMMR: player2.mmr + mmrChangeP2,
        change: mmrChangeP2,
        oldRank: getRankByMMR(player2.mmr),
        newRank: newRankP2,
        rankChanged: getRankByMMR(player2.mmr).name !== newRankP2.name
      }
    };}

  /**
   * Calculate MMR changes for team vs team matches
   * @param {Array} winnerTeam - Array of player objects with mmr property
   * @param {Array} loserTeam - Array of player objects with mmr property
   * @returns {Object} MMR changes for all players in both teams
   */
  function calculateTeamMMR(winnerTeam, loserTeam) {
    // Calculate average MMR for each team
    const winnerAvgMMR = winnerTeam.reduce((sum, p) => sum + p.mmr, 0) / winnerTeam.length;const loserAvgMMR = loserTeam.reduce((sum, p) => sum + p.mmr, 0) / loserTeam.length;

    // Expected win probability based on average MMRs
    const expectedWinWinner = 1 / (1 + Math.pow(10, (loserAvgMMR - winnerAvgMMR) / 400));

    // Get team size multiplier to reduce MMR changes in team games
    let teamSizeMultiplier = MMR_CONFIG.TEAM_SIZE_MULTIPLIER['1v1'];
    const teamSize = `${winnerTeam.length}v${loserTeam.length}`;

    if (MMR_CONFIG.TEAM_SIZE_MULTIPLIER[teamSize]) {
      teamSizeMultiplier = MMR_CONFIG.TEAM_SIZE_MULTIPLIER[teamSize];
    } else if (winnerTeam.length === loserTeam.length) {
      // If balanced teams but not a standard size, use the closest standard size
      const closestSize = Math.min(4, Math.max(winnerTeam.length, 1));
      teamSizeMultiplier = MMR_CONFIG.TEAM_SIZE_MULTIPLIER[`${closestSize}v${closestSize}`];
    }

    // Apply team balance modifiers for uneven teams
    let unevenMatchMultiplier = 1;

    if (winnerTeam.length < loserTeam.length) {
      // Underdogs won - apply bonus
      unevenMatchMultiplier = MMR_CONFIG.UNDERDOG_BONUS;
    } else if (winnerTeam.length > loserTeam.length) {
      // Favorites won - apply penalty
      unevenMatchMultiplier = MMR_CONFIG.FAVORITE_PENALTY;
    }

    // Calculate results for all players
    const results = {
      winners: [],
      losers: []
    };

    // Process winners
    for (const player of winnerTeam) {
      const kFactor = getKFactor(player.mmr);
      const mmrChange = Math.round(kFactor * (1 - expectedWinWinner) * teamSizeMultiplier * unevenMatchMultiplier);
      const newMMR = player.mmr + mmrChange;
      const oldRank = getRankByMMR(player.mmr);
      const newRank = getRankByMMR(newMMR);

      results.winners.push({
        id: player.id,
        oldMMR: player.mmr,
        newMMR: newMMR,
        change: mmrChange,
        oldRank: oldRank,
        newRank: newRank,
        rankChanged: oldRank.name !== newRank.name
      });
    }

    // Process losers
    for (const player of loserTeam) {
      const kFactor = getKFactor(player.mmr);
      const mmrChange = Math.round(kFactor * (0 - (1 - expectedWinWinner)) * teamSizeMultiplier * unevenMatchMultiplier);
      const newMMR = player.mmr + mmrChange;
      const oldRank = getRankByMMR(player.mmr);
      const newRank = getRankByMMR(newMMR);

      results.losers.push({
        id: player.id,
        oldMMR: player.mmr,
        newMMR: newMMR,
        change: mmrChange,
        oldRank: oldRank,
        newRank: newRank,
        rankChanged: oldRank.name !== newRank.name
      });
    }

    return results;}

  /**
   * Calculate MMR changes for Free-For-All matches
   * @param {Array} players - Array of player objects with mmr and placement properties
   * @returns {Array} Array of player objects with MMR changes
   */
  function calculateFFAMMR(players) {
    if (!players || players.length < 3) {
      throw new Error('FFA requires at least 3 players');}

    // Sort players by placement (1st, 2nd, 3rd, etc.)
    const sortedPlayers = [...players].sort((a, b) => a.placement - b.placement);

    // Get FFA multiplier based on player count
    const playerCount = String(players.length);
    const ffaMultiplier = MMR_CONFIG.FFA_MULTIPLIER[playerCount] || 0.6; // Default to 0.6 for very large FFAs

    // Array to store results
    const results = [];

    // For each player, compare against all other players
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      let totalMMRChange = 0;

      // Compare against each other player
      for (let j = 0; j < sortedPlayers.length; j++) {
        if (i === j) continue; // Skip self

        const opponent = sortedPlayers[j];

        // Calculate expected outcome (1 = win, 0 = loss)
        const expectedOutcome = 1 / (1 + Math.pow(10, (opponent.mmr - player.mmr) / 400));

        // Determine actual outcome based on placement
        const actualOutcome = player.placement < opponent.placement ? 1 : 0;

        // Get K-factor for player's MMR
        const kFactor = getKFactor(player.mmr);

        // Calculate MMR change for this matchup
        const mmrChange = (actualOutcome - expectedOutcome) * kFactor * ffaMultiplier / (players.length - 1);

        totalMMRChange += mmrChange;
      }

      // Round total MMR change
      const roundedMMRChange = Math.round(totalMMRChange);
      const newMMR = player.mmr + roundedMMRChange;
      const oldRank = getRankByMMR(player.mmr);
      const newRank = getRankByMMR(newMMR);

      results.push({
        id: player.id,
        placement: player.placement,
        oldMMR: player.mmr,
        newMMR: newMMR,
        change: roundedMMRChange,
        oldRank: oldRank,
        newRank: newRank,
        rankChanged: oldRank.name !== newRank.name
      });
    }

    return results;}

  /**
   * Calculate MMR changes for matches against AI opponents
   * @param {Object} player - Player object with mmr property
   * @param {String} aiDifficulty - AI difficulty ('easy', 'normal', 'hard', 'insane')
   * @param {Boolean} playerWon - Whether the player won against the AI
   * @returns {Object} MMR changes for the player
   */
  function calculateAgainstAI(player, aiDifficulty, playerWon = true) {
    if (!MMR_CONFIG.AI.DIFFICULTY_MMR[aiDifficulty]) {
      throw new Error(`Unknown AI difficulty: ${aiDifficulty}`);}

    const aiMMR = MMR_CONFIG.AI.DIFFICULTY_MMR[aiDifficulty];

    // For player losses against AI
    if (!playerWon) {
      const expectedLoss = 1 - (1 / (1 + Math.pow(10, (aiMMR - player.mmr) / 400)));
      const kFactor = getKFactor(player.mmr);
      const mmrChange = Math.round(kFactor * (0 - expectedLoss));
      const newMMR = player.mmr + mmrChange;
      const oldRank = getRankByMMR(player.mmr);
      const newRank = getRankByMMR(newMMR);

      return {
        id: player.id,
        oldMMR: player.mmr,
        newMMR: newMMR,
        change: mmrChange,
        oldRank: oldRank,
        newRank: newRank,
        rankChanged: oldRank.name !== newRank.name
      };}

    // For player wins against AI
    const expectedWin = 1 / (1 + Math.pow(10, (aiMMR - player.mmr) / 400));
    const kFactor = getKFactor(player.mmr);
    let mmrChange = Math.round(kFactor * (1 - expectedWin));

    // NO MMR gain limit against AI - removed cap
    // No reduction for higher MMR players - treat like normal match

    const newMMR = player.mmr + mmrChange;
    const oldRank = getRankByMMR(player.mmr);
    const newRank = getRankByMMR(newMMR);

    return {
      id: player.id,
      oldMMR: player.mmr,
      newMMR: newMMR,
      change: mmrChange,
      oldRank: oldRank,
      newRank: newRank,
      rankChanged: oldRank.name !== newRank.name
    };}

  /**
   * Get the rank object based on player's MMR
   * @param {Number} mmr - Player's MMR
   * @returns {Object} Rank object with name and image properties
   */
  function getRankByMMR(mmr) {
    // Sort ranks from highest to lowest
    const sortedRanks = [...MMR_CONFIG.RANKS].sort((a, b) => b.threshold - a.threshold);for (const rank of sortedRanks) {
      if (mmr >= rank.threshold) {
        return rank;}
    }

    // Fallback to the lowest rank if no match found
    return MMR_CONFIG.RANKS[0];}

  /**
   * Helper function to get appropriate K-factor based on player MMR
   * @param {Number} mmr - Player's current MMR
   * @returns {Number} K-factor to use
   */
  function getKFactor(mmr) {
    if (mmr < 1400) {
      return MMR_CONFIG.K_FACTOR.LOW_MMR;} else if (mmr < 1600) {
      return MMR_CONFIG.K_FACTOR.MID_MMR;} else {
      return MMR_CONFIG.K_FACTOR.HIGH_MMR;}
  }

  /**
   * Calculate MMR changes for any match type
   * @param {Object} matchData - Match data object
   * @returns {Object} MMR changes for all players
   */
  function calculateMMR(matchData) {
    if (!validateMatchData(matchData)) {
      throw new Error('Invalid match data');}

    const { matchType, teams, players, winner, aiOpponents } = matchData;

    // Handle 1v1 matches
    if (matchType === '1v1') {
      const player1 = players.find(p => p.id === winner);
      const player2 = players.find(p => p.id !== winner);

      // Check if opponent is AI
      const isAI = aiOpponents && aiOpponents.includes(player2.id);
      const aiDifficulty = isAI ? player2.aiDifficulty : null;

      return calculate1v1MMR(player1, player2, isAI, aiDifficulty);}

    // Handle FFA matches
    if (matchType === 'ffa') {
      return calculateFFAMMR(players);}

    // Handle team matches (2v2, 3v3, 4v4, or uneven teams)
    const winnerTeam = players.filter(p => teams[p.id] === teams[winner]);
    const loserTeam = players.filter(p => teams[p.id] !== teams[winner]);

    return calculateTeamMMR(winnerTeam, loserTeam);}

  /**
   * Validate match data format
   * @param {Object} matchData - Match data object to validate
   * @returns {Boolean} Whether the data is valid
   */
  function validateMatchData(matchData) {
    // Basic validation of match data structure
    if (!matchData || !matchData.matchType || !matchData.players) {
      logger.error('Invalid match data: Missing required fields');return false;}

    // Validate based on match type
    switch (matchData.matchType) {
      case '1v1':
        if (!matchData.winner || matchData.players.length !== 2) {
          logger.error('Invalid 1v1 match data: Need exactly 2 players and a winner');
          return false;}
        break;

      case 'ffa':
        if (!matchData.players.some(p => p.placement !== undefined)) {
          logger.error('Invalid FFA match data: Players need placement property');
          return false;}
        break;

      case '2v2':
      case '3v3':
      case '4v4':
      case 'team':
        if (!matchData.teams || !matchData.winner) {
          logger.error('Invalid team match data: Missing teams or winner');
          return false;}
        break;

      default:
        logger.error('Invalid match type:', matchData.matchType);
        return false;}

    return true;}

  /**
   * Get all rank definitions
   * @returns {Array} Array of rank objects
   */
  function getAllRanks() {
    return MMR_CONFIG.RANKS;}

  // Export public API
  return {
    calculateMMR,
    calculate1v1MMR,
    calculateTeamMMR,
    calculateFFAMMR,
    calculateAgainstAI,
    getRankByMMR,
    getAllRanks,
    CONFIG: MMR_CONFIG
  };})();

// Make MMRCalculator available globally
window.MMRCalculator = MMRCalculator;
