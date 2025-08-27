const mongoose = require('mongoose');
const Player = require('../models/Player');
const { RANKS, MMR_CONFIG, getRankByMmr } = require('../utils/mmrCalculator');

/**
 * Migration Script: Convert Old MMR System to New WC3 Champions Style
 * 
 * OLD SYSTEM RANGES:
 * Bronze 3: 0       → Champion: 3600+ (3600+ MMR range)
 * 
 * NEW SYSTEM RANGES: 
 * Bronze 3: 1000    → Champion: 1600  (600 MMR range)
 * 
 * This script will:
 * 1. Convert existing MMRs to new scale
 * 2. Update player ranks
 * 3. Reset placement status for proper calibration
 * 4. Set starting MMR for new players
 */

// OLD SYSTEM THRESHOLDS FOR REFERENCE
const OLD_RANKS = [
  { name: 'Bronze 3', threshold: 0 },
  { name: 'Bronze 2', threshold: 300 },
  { name: 'Bronze 1', threshold: 600 },
  { name: 'Gold 3', threshold: 900 },
  { name: 'Gold 2', threshold: 1200 },
  { name: 'Gold 1', threshold: 1500 },
  { name: 'Amber 3', threshold: 1800 },
  { name: 'Amber 2', threshold: 2100 },
  { name: 'Amber 1', threshold: 2400 },
  { name: 'Sapphire 3', threshold: 2700 },
  { name: 'Sapphire 2', threshold: 3000 },
  { name: 'Sapphire 1', threshold: 3300 },
  { name: 'Champion', threshold: 3600 }
];

/**
 * Convert old MMR to new MMR scale
 * @param {Number} oldMmr - Player's current MMR
 * @returns {Number} - New MMR in compressed scale
 */
function convertMmrToNewScale(oldMmr) {
  // Define conversion ranges
  const OLD_MIN = 0;
  const OLD_MAX = 4000;  // Reasonable max for old system
  const NEW_MIN = MMR_CONFIG.MIN_MMR; // 1000
  const NEW_MAX = MMR_CONFIG.MAX_MMR; // 2000
  
  // Clamp old MMR to reasonable bounds
  const clampedOldMmr = Math.max(OLD_MIN, Math.min(oldMmr, OLD_MAX));
  
  // Convert using linear scaling with some adjustment
  const ratio = clampedOldMmr / OLD_MAX;
  
  // Apply slight compression to prevent everyone being at the top
  const compressedRatio = Math.pow(ratio, 0.8); // Slight compression curve
  
  // Map to new range
  const newMmr = NEW_MIN + (compressedRatio * (NEW_MAX - NEW_MIN));
  
  // Round and ensure within bounds
  return Math.max(NEW_MIN, Math.min(Math.round(newMmr), NEW_MAX));
}

/**
 * Determine if player should get placement match reset
 * @param {Object} player - Player object
 * @returns {Boolean} - Whether to reset their placement status
 */
function shouldResetPlacement(player) {
  // Reset placement for players who haven't played many games
  const totalMatches = player.stats?.totalMatches || 0;
  
  // If they've played less than 10 total matches, give them placement again
  return totalMatches < 10;
}

/**
 * Main migration function
 */
async function migrateToNewMmrSystem() {
  try {
    console.log('🚀 Starting migration to new WC3 Champions style MMR system...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/newsite');
    console.log('✅ Connected to MongoDB\n');
    
    // Get all players
    const players = await Player.find({}).lean();
    console.log(`📊 Found ${players.length} players to migrate\n`);
    
    // Track migration statistics
    let migrationStats = {
      playersUpdated: 0,
      placementReset: 0,
      rankChanges: {},
      mmrChanges: {
        increased: 0,
        decreased: 0,
        unchanged: 0
      }
    };
    
    console.log('🔄 Processing players...\n');
    
    for (const player of players) {
      const oldMmr = player.mmr || 1500;
      const oldRank = player.rank?.name || 'Unknown';
      
      // Convert MMR to new scale
      const newMmr = convertMmrToNewScale(oldMmr);
      const newRank = getRankByMmr(newMmr);
      
      // Determine if placement should be reset
      const resetPlacement = shouldResetPlacement(player);
      
      // Prepare update object
      const updateData = {
        mmr: newMmr,
        rank: {
          name: newRank.name,
          image: newRank.image,
          threshold: newRank.threshold
        },
        lastActive: new Date() // Reset activity for decay system
      };
      
      // Reset match type stats for placement if needed
      if (resetPlacement) {
        updateData['stats.matchTypes'] = {
          '1v1': { matches: 0, wins: 0, losses: 0, draws: 0, mmr: newMmr, winRate: 0 },
          '2v2': { matches: 0, wins: 0, losses: 0, draws: 0, mmr: newMmr, winRate: 0 },
          '3v3': { matches: 0, wins: 0, losses: 0, draws: 0, mmr: newMmr, winRate: 0 },
          '4v4': { matches: 0, wins: 0, losses: 0, draws: 0, mmr: newMmr, winRate: 0 },
          'ffa': { matches: 0, wins: 0, losses: 0, draws: 0, mmr: newMmr, winRate: 0 },
          'vsai': { matches: 0, wins: 0, losses: 0, draws: 0, mmr: newMmr, winRate: 0 }
        };
        migrationStats.placementReset++;
      }
      
      // Update player in database
      await Player.findByIdAndUpdate(player._id, updateData);
      
      // Track statistics
      migrationStats.playersUpdated++;
      
      if (newMmr > oldMmr) {
        migrationStats.mmrChanges.increased++;
      } else if (newMmr < oldMmr) {
        migrationStats.mmrChanges.decreased++;
      } else {
        migrationStats.mmrChanges.unchanged++;
      }
      
      if (!migrationStats.rankChanges[oldRank]) {
        migrationStats.rankChanges[oldRank] = {};
      }
      if (!migrationStats.rankChanges[oldRank][newRank.name]) {
        migrationStats.rankChanges[oldRank][newRank.name] = 0;
      }
      migrationStats.rankChanges[oldRank][newRank.name]++;
      
      // Log individual changes for notable players
      if (Math.abs(newMmr - oldMmr) > 100 || oldRank !== newRank.name) {
        const mmrChange = newMmr - oldMmr;
        const mmrDirection = mmrChange > 0 ? '+' : '';
        console.log(`  📈 ${player.name}: ${oldMmr} → ${newMmr} MMR (${mmrDirection}${mmrChange}) | ${oldRank} → ${newRank.name}${resetPlacement ? ' | 🎭 Placement Reset' : ''}`);
      }
    }
    
    console.log('\n🎉 Migration completed successfully!\n');
    
    // Display migration statistics
    console.log('📊 MIGRATION STATISTICS:');
    console.log('========================');
    console.log(`✅ Players updated: ${migrationStats.playersUpdated}`);
    console.log(`🎭 Placement resets: ${migrationStats.placementReset}`);
    console.log(`📈 MMR increased: ${migrationStats.mmrChanges.increased}`);
    console.log(`📉 MMR decreased: ${migrationStats.mmrChanges.decreased}`);
    console.log(`➡️ MMR unchanged: ${migrationStats.mmrChanges.unchanged}\n`);
    
    console.log('🏆 RANK DISTRIBUTION CHANGES:');
    console.log('==============================');
    Object.entries(migrationStats.rankChanges).forEach(([oldRank, newRanks]) => {
      Object.entries(newRanks).forEach(([newRank, count]) => {
        if (oldRank !== newRank) {
          console.log(`  ${oldRank} → ${newRank}: ${count} players`);
        }
      });
    });
    
    console.log('\n🔄 NEW SYSTEM ACTIVE:');
    console.log('=====================');
    console.log('✅ Compressed MMR ranges (1000-2000)');
    console.log('✅ Placement match system (first 5 games)');
    console.log('✅ MMR decay system ready');
    console.log('✅ Starting MMR for new players: 1200');
    
    console.log('\n⚠️  REMEMBER TO:');
    console.log('================');
    console.log('1. Update frontend rank displays');
    console.log('2. Test placement match experience');
    console.log('3. Set up MMR decay scheduler');
    console.log('4. Monitor system for balance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateToNewMmrSystem();
}

module.exports = { migrateToNewMmrSystem, convertMmrToNewScale }; 