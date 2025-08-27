const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');

/**
 * MMR calculation constants (same as frontend)
 */
const MMR_CONFIG = {
  K_FACTOR: 32,          // Sensitivity factor
  DEFAULT_MMR: 1200,     // Starting MMR (updated for new system)
  PROVISIONAL_GAMES: 10, // Number of games before rating stabilizes
  MIN_MMR: 500,          // Minimum possible MMR
  MAX_MMR: 3000          // Maximum possible MMR
};

// Import rank definitions from main MMR calculator
const { RANKS } = require('../utils/mmrCalculator');

/**
 * Calculate expected score based on MMR difference
 * @param {number} playerMMR - Player's MMR
 * @param {number} opponentMMR - Opponent's MMR
 * @returns {number} Expected score (0-1)
 */
function calculateExpectedScore(playerMMR, opponentMMR) {
  const mmrDifference = opponentMMR - playerMMR;
  return 1 / (1 + Math.pow(10, mmrDifference / 400));
}

/**
 * Calculate MMR change based on match result
 * @param {number} playerMMR - Player's current MMR
 * @param {number} opponentMMR - Opponent's MMR
 * @param {number} actualScore - Actual match result (1 for win, 0 for loss)
 * @param {string} matchType - Type of match for K-factor adjustment
 * @returns {number} MMR change
 */
function calculateMMRChange(playerMMR, opponentMMR, actualScore, matchType = '1v1') {
  // Adjust K-factor based on match type
  let kFactor = MMR_CONFIG.K_FACTOR;
  switch (matchType) {
    case '1v1': kFactor = 32; break;
    case '2v2': kFactor = 24; break;
    case '3v3': kFactor = 20; break;
    case '4v4': kFactor = 16; break;
    case 'ffa': kFactor = 28; break;
    default: kFactor = 32;
  }
  
  const expectedScore = calculateExpectedScore(playerMMR, opponentMMR);
  return Math.round(kFactor * (actualScore - expectedScore));
}

/**
 * Calculate new MMR with bounds checking
 * @param {number} currentMMR - Current MMR
 * @param {number} mmrChange - MMR change
 * @returns {number} New MMR
 */
function calculateNewMMR(currentMMR, mmrChange) {
  const newMMR = currentMMR + mmrChange;
  return Math.max(MMR_CONFIG.MIN_MMR, Math.min(MMR_CONFIG.MAX_MMR, newMMR));
}

/**
 * Get rank information based on MMR
 * @param {number} mmr - Player's MMR
 * @returns {Object} Rank information
 */
function getRankByMMR(mmr) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (mmr >= RANKS[i].threshold) {
      return RANKS[i];
    }
  }
  return RANKS[0]; // Return lowest rank if MMR is below all thresholds
}

/**
 * Determine if a player won a match
 * @param {Object} match - Match object
 * @param {string} playerId - Player ID to check
 * @returns {boolean} Whether the player won
 */
function didPlayerWin(match, playerId) {
  const playerData = match.players.find(p => 
    p.playerId.toString() === playerId.toString()
  );
  
  if (!playerData) return false;
  
  // Primary check: Compare player ID with winner (works for all match types in current data)
  if (match.winner && match.winner.toString() === playerId.toString()) {
    return true;
  }

  // Secondary checks for different match types
  if (match.matchType === '1v1') {
    // For 1v1, the primary check above should have worked
    return false;
  } else if (match.matchType.includes('v')) {
    // For team matches, check if player's team won
    // Note: Current data has all players in team 0, so we rely on player ID matching
    if (match.winner === playerData.team) {
      return true;
    }
    
    // Fallback: In the broken data structure, the winner field contains a player ID
    // So if any teammate (same team) has their ID as winner, this player wins too
    const teammates = match.players.filter(p => p.team === playerData.team);
    const teammateWon = teammates.some(teammate => 
      match.winner && match.winner.toString() === teammate.playerId.toString()
    );
  
    // For team matches, if a teammate won, everyone on that team wins
    // But since all players are on team 0, we need special logic
    if (teammateWon) {
      // Calculate how many players should be on the winning team
      const totalPlayers = match.players.length;
      let playersPerTeam = 0;
      
      switch(match.matchType) {
        case '2v2': playersPerTeam = 2; break;
        case '3v3': playersPerTeam = 3; break;
        case '4v4': playersPerTeam = 4; break;
        default: playersPerTeam = Math.floor(totalPlayers / 2);
      }
      
      // Find the winner player's position
      const winnerIndex = match.players.findIndex(p => 
        match.winner && match.winner.toString() === p.playerId.toString()
      );
      
      const currentPlayerIndex = match.players.findIndex(p => 
        p.playerId.toString() === playerId.toString()
    );
    
      // Determine if players are on the same "virtual" team based on position
      // Assume first half of players are team 0, second half are team 1
      const winnerTeam = Math.floor(winnerIndex / playersPerTeam);
      const currentPlayerTeam = Math.floor(currentPlayerIndex / playersPerTeam);
      
      return winnerTeam === currentPlayerTeam;
    }
    
    return false;
  } else if (match.matchType === 'ffa') {
    // For FFA, check placement (1st place = winner) or fall back to ID
    if (playerData.placement === 1) {
      return true;
    }
    
    // Fallback: check if player ID matches winner
    return match.winner && match.winner.toString() === playerId.toString();
  }
  
  // Final fallbacks
  return playerData.isWinner === true || playerData.outcome === 'win';
}

/**
 * Get average opponent MMR for a match
 * @param {Object} match - Match object
 * @param {string} playerId - Player ID
 * @param {Map} playerMMRs - Map of player IDs to current MMRs
 * @returns {number} Average opponent MMR
 */
function getOpponentMMR(match, playerId, playerMMRs) {
    const opponents = match.players.filter(p => 
    p.playerId.toString() !== playerId.toString()
    );
    
  if (opponents.length === 0) return MMR_CONFIG.DEFAULT_MMR;
  
  const opponentMMRs = opponents.map(opponent => {
    const opponentId = opponent.playerId.toString();
    return playerMMRs.get(opponentId) || MMR_CONFIG.DEFAULT_MMR;
  });
  
  return opponentMMRs.reduce((sum, mmr) => sum + mmr, 0) / opponentMMRs.length;
}

/**
 * Recalculate MMR for all players based on their match history
 */
async function recalculateAllPlayerMMRs() {
  try {
    console.log('🔄 Starting MMR recalculation for all players (both Warcraft 2 & 3)...');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/newsite');
    console.log('✅ Connected to MongoDB');
    
    // Get players by game type
    const wc2Players = await Player.find({ gameType: 'warcraft2' }).lean();
    const wc3Players = await Player.find({ gameType: 'warcraft3' }).lean();
    const allPlayers = [...wc2Players, ...wc3Players];
    
    console.log(`📊 Found ${wc2Players.length} Warcraft 2 players and ${wc3Players.length} Warcraft 3 players (${allPlayers.length} total)`);
    
    // Get all verified matches (only Warcraft 2 has matches)
    const matches = await Match.find({
      'verification.status': 'verified',
      gameType: 'warcraft2'
    }).sort({ date: 1 }).lean();
    console.log(`⚔️ Found ${matches.length} verified Warcraft 2 matches`);
    
    // Initialize MMR tracking
    const playerMMRs = new Map();
    const playerStats = new Map();
    
    // Initialize Warcraft 2 players with default MMR
    wc2Players.forEach(player => {
      playerMMRs.set(player._id.toString(), MMR_CONFIG.DEFAULT_MMR);
      playerStats.set(player._id.toString(), {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        mmrHistory: []
      });
    });
    
    // Initialize Warcraft 3 players with varied MMRs for realistic rank distribution
    const wc3StartingMMRs = [
      // Champion tier (1 player) - 3100+
      3200,
      // Sapphire tier (3 players) - 2500-2900
      2950, 2750, 2550,
      // Amber tier (4 players) - 1900-2300
      2250, 2100, 2000, 1950,
      // Gold tier (6 players) - 1300-1700
      1700, 1600, 1500, 1450, 1400, 1350,
      // Bronze tier (12 players) - 0-1100
      1250, 1150, 1050, 950, 850, 750, 650, 550, 450, 350, 250, 150
    ];
    
    wc3Players.forEach((player, index) => {
      const startingMMR = wc3StartingMMRs[index] || 1500; // Default if we run out
      playerMMRs.set(player._id.toString(), startingMMR);
      playerStats.set(player._id.toString(), {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        mmrHistory: []
      });
    });
    
    console.log('🎯 Processing Warcraft 2 matches chronologically...');
    
    // Process each match chronologically to simulate MMR changes over time (only for WC2)
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      
      if (i % 100 === 0) {
        console.log(`  📈 Processing match ${i + 1}/${matches.length}...`);
      }
      
      // Process each player in the match
      for (const playerData of match.players) {
        const playerId = playerData.playerId.toString();
        const currentMMR = playerMMRs.get(playerId);
        
        if (!currentMMR) continue; // Skip if player not found
        
        // Determine if player won
        const playerWon = didPlayerWin(match, playerId);
        
        // Get opponent MMR
        const opponentMMR = getOpponentMMR(match, playerId, playerMMRs);
        
        // Calculate MMR change
        const actualScore = playerWon ? 1 : 0;
        const mmrChange = calculateMMRChange(currentMMR, opponentMMR, actualScore, match.matchType);
        const newMMR = calculateNewMMR(currentMMR, mmrChange);
        
        // Update player MMR
        playerMMRs.set(playerId, newMMR);
        
        // Update player stats
        const stats = playerStats.get(playerId);
        stats.gamesPlayed++;
        if (playerWon) {
          stats.wins++;
        } else {
          stats.losses++;
        }
        stats.mmrHistory.push({
          matchId: match._id,
          date: match.date,
          oldMMR: currentMMR,
          newMMR: newMMR,
          change: mmrChange,
          won: playerWon,
          matchType: match.matchType
        });
      }
    }
    
    console.log('💾 Updating player records in database...');
    
    // Update all players in the database
    let updatedCount = 0;
    for (const player of allPlayers) {
      const playerId = player._id.toString();
      const finalMMR = playerMMRs.get(playerId);
      const stats = playerStats.get(playerId);
      const finalRank = getRankByMMR(finalMMR);
      
      if (!finalMMR || !stats) continue;
      
      const winRate = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0;
        
        // Update player in database
        await Player.findByIdAndUpdate(player._id, {
        mmr: finalMMR,
        rank: {
          name: finalRank.name,
          image: finalRank.image,
          threshold: finalRank.threshold
        },
        'stats.gamesPlayed': stats.gamesPlayed,
        'stats.wins': stats.wins,
        'stats.losses': stats.losses,
        'stats.winRate': parseFloat(winRate.toFixed(1)),
        'stats.totalMatches': stats.gamesPlayed
        });
        
      updatedCount++;
      
      // Log changes
      if (player.gameType === 'warcraft2' && (Math.abs(finalMMR - player.mmr) > 100 || stats.gamesPlayed > 0)) {
        console.log(`  ✅ [WC2] ${player.name}: ${player.mmr} → ${finalMMR} MMR (${stats.gamesPlayed} games, ${stats.wins}W-${stats.losses}L, ${winRate.toFixed(1)}% WR) [${finalRank.name}]`);
      } else if (player.gameType === 'warcraft3') {
        console.log(`  ✅ [WC3] ${player.name}: ${player.mmr} → ${finalMMR} MMR (0 games, placement rank) [${finalRank.name}]`);
      }
    }
    
    console.log(`🎉 MMR recalculation completed!`);
    console.log(`📊 Summary:`);
    console.log(`  • Updated ${updatedCount} players`);
    console.log(`  • Processed ${matches.length} Warcraft 2 matches`);
    console.log(`  • Assigned placement ranks to ${wc3Players.length} Warcraft 3 players`);
    
    // Show top 10 players by MMR (combined leaderboard)
    const topPlayers = await Player.find({})
      .sort({ mmr: -1 })
      .limit(10)
      .select('name gameType mmr rank stats.gamesPlayed stats.wins stats.losses stats.winRate');
    
    console.log(`\n🏆 Top 10 Players by MMR (Combined Leaderboard):`);
    topPlayers.forEach((player, index) => {
      const gameLabel = player.gameType === 'warcraft2' ? 'WC2' : 'WC3';
      console.log(`  ${index + 1}. [${gameLabel}] ${player.name} - ${player.mmr} MMR [${player.rank?.name || 'Unranked'}] (${player.stats?.gamesPlayed || 0} games)`);
    });
    
    // Show rank distribution
    const rankDistribution = await Player.aggregate([
      { $group: { _id: { rank: '$rank.name', gameType: '$gameType' }, count: { $sum: 1 } } },
      { $sort: { '_id.rank': 1 } }
    ]);
    
    console.log(`\n📊 Rank Distribution:`);
    const rankCounts = {};
    rankDistribution.forEach(item => {
      const rankName = item._id.rank || 'Unranked';
      if (!rankCounts[rankName]) rankCounts[rankName] = { wc2: 0, wc3: 0, total: 0 };
      rankCounts[rankName][item._id.gameType === 'warcraft2' ? 'wc2' : 'wc3'] = item.count;
      rankCounts[rankName].total += item.count;
    });
    
    Object.entries(rankCounts).forEach(([rank, counts]) => {
      console.log(`  ${rank}: ${counts.total} total (WC2: ${counts.wc2}, WC3: ${counts.wc3})`);
    });
    
  } catch (error) {
    console.error('❌ Error during MMR recalculation:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  recalculateAllPlayerMMRs()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { recalculateAllPlayerMMRs }; 