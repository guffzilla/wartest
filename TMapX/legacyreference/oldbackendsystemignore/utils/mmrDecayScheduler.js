const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
const { calculateDecayForPlayer, getRankByMmr, MMR_CONFIG } = require('./mmrCalculator');

/**
 * MMR Decay Scheduler
 * 
 * This system:
 * 1. Runs weekly to check player activity
 * 2. Applies MMR decay to inactive players
 * 3. Sends notifications about activity requirements
 * 4. Maintains competitive integrity
 */

/**
 * Count games played by a player in the last week
 * @param {String} playerId - Player's ID
 * @param {String} gameType - Game type filter
 * @returns {Number} - Number of games played this week
 */
async function getGamesPlayedThisWeek(playerId, gameType = null) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const query = {
    'players.playerId': playerId,
    'verification.status': 'verified',
    date: { $gte: oneWeekAgo }
  };
  
  if (gameType) {
    query.gameType = gameType;
  }
  
  return await Match.countDocuments(query);
}

/**
 * Get required games per week for a player's rank
 * @param {String} rankName - Player's rank name
 * @returns {Number} - Required games per week
 */
function getRequiredGamesForRank(rankName) {
  if (!rankName) return 1;
  
  if (rankName.includes('Champion')) return 3;
  if (rankName.includes('Sapphire')) return 3;
  if (rankName.includes('Amber')) return 2;
  if (rankName.includes('Gold')) return 1;
  if (rankName.includes('Bronze')) return 1;
  
  return 1; // Default
}

/**
 * Check if player is in grace period (recently promoted)
 * @param {Object} player - Player object
 * @returns {Boolean} - Whether player is in grace period
 */
function isInGracePeriod(player) {
  if (!player.lastRankChange) return false;
  
  const gracePeriodEnd = new Date(player.lastRankChange);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + MMR_CONFIG.DECAY.GRACE_PERIOD_DAYS);
  
  return new Date() < gracePeriodEnd;
}

/**
 * Apply decay to a single player
 * @param {Object} player - Player to apply decay to
 * @param {Number} decayAmount - Amount of MMR to decay
 * @returns {Object} - Decay result
 */
async function applyDecayToPlayer(player, decayAmount) {
  const oldMmr = player.mmr;
  const newMmr = Math.max(oldMmr - decayAmount, MMR_CONFIG.DECAY.MIN_MMR);
  const oldRank = getRankByMmr(oldMmr);
  const newRank = getRankByMmr(newMmr);
  
  // Update player
  await Player.findByIdAndUpdate(player._id, {
    mmr: newMmr,
    rank: {
      name: newRank.name,
      image: newRank.image,
      threshold: newRank.threshold
    },
    lastDecayCheck: new Date()
  });
  
  return {
    playerId: player._id,
    playerName: player.name,
    oldMmr,
    newMmr,
    decayAmount: oldMmr - newMmr,
    oldRank: oldRank.name,
    newRank: newRank.name,
    rankChanged: oldRank.name !== newRank.name
  };
}

/**
 * Process MMR decay for all eligible players
 * @param {String} gameType - Game type to process (optional)
 * @returns {Object} - Decay processing results
 */
async function processMMRDecay(gameType = null) {
  console.log('🔄 Starting MMR decay processing...');
  
  const query = { isActive: true };
  if (gameType) {
    query.gameType = gameType;
  }
  
  const players = await Player.find(query).lean();
  console.log(`📊 Found ${players.length} active players to check`);
  
  const results = {
    playersChecked: 0,
    playersDecayed: 0,
    playersInGrace: 0,
    playersActive: 0,
    totalDecayApplied: 0,
    decayDetails: [],
    warnings: []
  };
  
  for (const player of players) {
    results.playersChecked++;
    
    // Skip if no rank set
    if (!player.rank?.name) {
      continue;
    }
    
    // Check if in grace period
    if (isInGracePeriod(player)) {
      results.playersInGrace++;
      console.log(`  🛡️ ${player.name}: In grace period (recently promoted)`);
      continue;
    }
    
    // Get required games for their rank
    const requiredGames = getRequiredGamesForRank(player.rank.name);
    
    // Count games played this week
    const gamesThisWeek = await getGamesPlayedThisWeek(player._id.toString(), player.gameType);
    
    // Check if they met the requirement
    if (gamesThisWeek >= requiredGames) {
      results.playersActive++;
      console.log(`  ✅ ${player.name}: Active (${gamesThisWeek}/${requiredGames} games)`);
      
      // Update last activity check
      await Player.findByIdAndUpdate(player._id, {
        lastDecayCheck: new Date(),
        lastActive: new Date()
      });
      
      continue;
    }
    
    // Calculate how long they've been inactive
    const lastActive = new Date(player.lastActive || new Date());
    const daysSinceActive = Math.floor((new Date() - lastActive) / (24 * 60 * 60 * 1000));
    
    // Apply decay if they've been inactive for more than the grace period
    if (daysSinceActive > MMR_CONFIG.DECAY.GRACE_PERIOD_DAYS) {
      const weeksInactive = Math.floor(daysSinceActive / 7);
      const decayAmount = Math.min(weeksInactive * MMR_CONFIG.DECAY.DECAY_AMOUNT, 50); // Cap at 50 MMR
      
      if (decayAmount > 0) {
        const decayResult = await applyDecayToPlayer(player, decayAmount);
        results.playersDecayed++;
        results.totalDecayApplied += decayResult.decayAmount;
        results.decayDetails.push(decayResult);
        
        console.log(`  📉 ${player.name}: Decayed ${decayResult.decayAmount} MMR (${decayResult.oldMmr} → ${decayResult.newMmr}) | ${decayResult.oldRank} → ${decayResult.newRank}`);
      }
    } else {
      // Player is inactive but still in grace period
      results.warnings.push({
        playerId: player._id,
        playerName: player.name,
        rank: player.rank.name,
        requiredGames,
        gamesThisWeek,
        daysSinceActive
      });
      
      console.log(`  ⚠️ ${player.name}: Warning (${gamesThisWeek}/${requiredGames} games, ${daysSinceActive} days inactive)`);
    }
  }
  
  return results;
}

/**
 * Generate weekly decay report
 * @param {Object} results - Decay processing results
 * @returns {String} - Formatted report
 */
function generateDecayReport(results) {
  let report = '\n🏆 WEEKLY MMR DECAY REPORT\n';
  report += '==========================\n';
  report += `📊 Players checked: ${results.playersChecked}\n`;
  report += `✅ Active players: ${results.playersActive}\n`;
  report += `🛡️ Players in grace period: ${results.playersInGrace}\n`;
  report += `📉 Players decayed: ${results.playersDecayed}\n`;
  report += `⚠️ Players with warnings: ${results.warnings.length}\n`;
  report += `💔 Total MMR decayed: ${results.totalDecayApplied}\n\n`;
  
  if (results.decayDetails.length > 0) {
    report += '📉 DECAY DETAILS:\n';
    report += '=================\n';
    results.decayDetails.forEach(detail => {
      report += `• ${detail.playerName}: -${detail.decayAmount} MMR (${detail.oldMmr} → ${detail.newMmr})`;
      if (detail.rankChanged) {
        report += ` | ${detail.oldRank} → ${detail.newRank}`;
      }
      report += '\n';
    });
    report += '\n';
  }
  
  if (results.warnings.length > 0) {
    report += '⚠️ ACTIVITY WARNINGS:\n';
    report += '=====================\n';
    results.warnings.forEach(warning => {
      report += `• ${warning.playerName} (${warning.rank}): ${warning.gamesThisWeek}/${warning.requiredGames} games this week\n`;
    });
    report += '\n';
  }
  
  report += '📋 ACTIVITY REQUIREMENTS:\n';
  report += '=========================\n';
  report += '• Champion/Sapphire: 3 games per week\n';
  report += '• Amber: 2 games per week\n';
  report += '• Gold/Bronze: 1 game per week\n';
  report += '• Grace period: 14 days after promotion\n';
  report += '• Decay rate: 10 MMR per missed week\n';
  
  return report;
}

/**
 * Run the weekly decay check
 * This function should be called by a scheduler (cron job)
 */
async function runWeeklyDecayCheck() {
  try {
    console.log('🚀 Starting weekly MMR decay check...');
    
    // Connect to database if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect('mongodb://localhost:27017/newsite');
    }
    
    // Process decay for all game types
    const results = await processMMRDecay();
    
    // Generate and log report
    const report = generateDecayReport(results);
    console.log(report);
    
    // TODO: Send email notifications to affected players
    // TODO: Log to admin dashboard
    
    console.log('✅ Weekly decay check completed');
    return results;
    
  } catch (error) {
    console.error('❌ Weekly decay check failed:', error);
    throw error;
  }
}

/**
 * Set up automatic decay scheduling
 * Call this once when server starts
 */
function setupDecayScheduler() {
  // Run every Monday at 3 AM
  const schedule = require('node-schedule');
  
  const job = schedule.scheduleJob('0 3 * * 1', async () => {
    console.log('⏰ Scheduled MMR decay check triggered');
    await runWeeklyDecayCheck();
  });
  
  console.log('📅 MMR decay scheduler active (Mondays at 3 AM)');
  return job;
}

module.exports = {
  processMMRDecay,
  runWeeklyDecayCheck,
  setupDecayScheduler,
  getGamesPlayedThisWeek,
  getRequiredGamesForRank,
  generateDecayReport
}; 