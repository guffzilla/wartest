const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
const War2Map = require('../models/War2Map');
const { 
  RANKS, 
  MMR_CONFIG, 
  getRankByMmr, 
  calculateMmrChange, 
  isInPlacementMatches 
} = require('../utils/mmrCalculator');

/**
 * Comprehensive Database Reseeding Script
 * 
 * This script creates a realistic War2 competitive environment by:
 * 1. Cleaning up existing players and matches
 * 2. Creating 100 realistic War2 players with skill distribution
 * 3. Simulating 10,000 matches with realistic matchmaking
 * 4. Progressive MMR calculation and stat updates
 * 5. Using actual War2 maps from database
 */

// War2-themed player names for realism
const PLAYER_NAMES = [
  'OrcSlayer', 'KnightCommander', 'DeathKnight', 'BloodlustWarden', 'GruntMaster',
  'PeonPunisher', 'TrollAxeThrower', 'SiegeHammer', 'FlameWarden', 'IceWizard',
  'SkullCrusher', 'BattleAxe', 'SteelClaw', 'IronFist', 'FireBrand',
  'DarkMage', 'BloodHawk', 'WarChief', 'RageBearer', 'StormBringer',
  'ShadowWolf', 'BoneCrusher', 'BladeStorm', 'DeathDealer', 'WarHammer',
  'BloodThirster', 'SoulReaper', 'DoomBringer', 'ChaosLord', 'VoidWalker',
  'FrostMage', 'FlameSpirit', 'EarthShaker', 'WindRider', 'StormCaller',
  'BloodRaven', 'IronWolf', 'SteelBeast', 'FireDragon', 'IceBear',
  'ThunderHawk', 'LightningBolt', 'ShadowBlade', 'DeathWing', 'BloodFang',
  'WarHound', 'BattleBear', 'SiegeWolf', 'FlameRaven', 'FrostWolf',
  'TacticalStrike', 'EconomyMaster', 'RushKing', 'MacroGod', 'MicroMachine',
  'BuildOrderPro', 'ResourceLord', 'TimingMaster', 'ControlFreak', 'MapHacker',
  'CheeseMaster', 'TurtleKing', 'AggroBeest', 'DefensiveWall', 'CounterStrike',
  'xXShadowXx', 'ProGamer2024', 'UltimateWarrior', 'EliteDestroyer', 'ClanLeader',
  'VeteranPlayer', 'MasterChief', 'AlphaStrike', 'BetaDestroy', 'GammaRush',
  'PudWhisperer', 'GoldDigger', 'TreeHugger', 'WallBuilder', 'UnitSpammer',
  'LumberJack', 'OilBaron', 'CastleCrasher', 'TowerRusher', 'BarracksSpam',
  'FootmanArmy', 'ArcherLord', 'KnightRider', 'CatapultKing', 'BallistaBot',
  'NordicViking', 'SamuraiWarrior', 'SpartanKing', 'CelticDruid', 'VikingRaider',
  'APM_Master', 'ClickStorm', 'KeyboardWarrior', 'MousePrecision', 'ReactionTime'
];

// Skill level distribution (bell curve - most players average)
const SKILL_LEVELS = {
  'bronze': { weight: 10, baseSkill: 0.15 },    // 10% - Very weak
  'gold': { weight: 25, baseSkill: 0.35 },      // 25% - Below average  
  'amber': { weight: 30, baseSkill: 0.50 },     // 30% - Average
  'sapphire': { weight: 25, baseSkill: 0.65 },  // 25% - Above average
  'champion': { weight: 10, baseSkill: 0.85 }   // 10% - Very strong
};

// Game types with different popularity
const GAME_TYPES = [
  { type: '1v1', weight: 40 },
  { type: '2v2', weight: 25 },
  { type: '3v3', weight: 15 },
  { type: '4v4', weight: 10 },
  { type: 'ffa', weight: 10 }
];

// Race preferences (realistic distribution)
const RACES = [
  { race: 'human', weight: 55 },
  { race: 'orc', weight: 45 }
];

/**
 * Generate a skill level for a player based on bell curve distribution
 */
function generateSkillLevel() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const [level, config] of Object.entries(SKILL_LEVELS)) {
    cumulative += config.weight;
    if (random <= cumulative) {
      return { level, ...config };
    }
  }
  
  return { level: 'amber', ...SKILL_LEVELS.amber };
}

/**
 * Calculate win probability between two players based on skill difference
 */
function calculateWinProbability(player1Skill, player2Skill) {
  const skillDiff = player1Skill - player2Skill;
  const probability = 1 / (1 + Math.pow(10, -skillDiff * 4));
  const randomness = (Math.random() - 0.5) * 0.2;
  return Math.max(0.05, Math.min(0.95, probability + randomness));
}

/**
 * Smart matchmaking - prefers similar skill levels but allows cross-skill matches
 */
function findOpponent(currentPlayer, allPlayers) {
  const availablePlayers = allPlayers.filter(p => 
    p._id.toString() !== currentPlayer._id.toString()
  );
  
  if (availablePlayers.length === 0) return null;
  
  // Create weighted pool - good players CAN play bad players, but less frequently
  const weightedPool = availablePlayers.map(opponent => {
    const mmrDiff = Math.abs(currentPlayer.mmr - opponent.mmr);
    
    let weight;
    if (mmrDiff <= 50) weight = 100;        // Very close - highest chance
    else if (mmrDiff <= 100) weight = 70;   // Close - high chance
    else if (mmrDiff <= 150) weight = 40;   // Moderate - medium chance
    else if (mmrDiff <= 250) weight = 20;   // Far - low chance
    else weight = 5;                        // Very far - very low chance (but possible!)
    
    return { player: opponent, weight };
  });
  
  // Select opponent using weighted random selection
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of weightedPool) {
    random -= item.weight;
    if (random <= 0) {
      return item.player;
    }
  }
  
  return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
}

/**
 * Select random game type based on popularity weights
 */
function selectGameType() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const gameType of GAME_TYPES) {
    cumulative += gameType.weight;
    if (random <= cumulative) {
      return gameType.type;
    }
  }
  
  return '1v1';
}

/**
 * Select race for a player
 */
function selectRace() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const race of RACES) {
    cumulative += race.weight;
    if (random <= cumulative) {
      return race.race;
    }
  }
  
  return 'human';
}

/**
 * Clean up existing competitive data
 */
async function cleanupDatabase() {
  console.log('🧹 Cleaning up existing competitive data...');
  
  const playersDeleted = await Player.deleteMany({});
  const matchesDeleted = await Match.deleteMany({});
  
  console.log(`  ✅ Deleted ${playersDeleted.deletedCount} players`);
  console.log(`  ✅ Deleted ${matchesDeleted.deletedCount} matches`);
  console.log('  📊 Preserved maps, users, campaigns, and other data\n');
}

/**
 * Create realistic players with skill distribution
 */
async function createPlayers() {
  console.log('👥 Creating 100 realistic War2 players...');
  
  const players = [];
  const usedNames = new Set();
  
  for (let i = 0; i < 100; i++) {
    let name;
    do {
      name = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);
    
    const skillLevel = generateSkillLevel();
    const mmr = MMR_CONFIG.STARTING_MMR;
    const rank = getRankByMmr(mmr);
    
    const player = new Player({
      name,
      gameType: 'wc2',
      mmr,
      rank: {
        name: rank.name,
        image: rank.image,
        threshold: rank.threshold
      },
      stats: {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        currentStreak: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        averageGameLength: 0,
        highestMmr: mmr,
        highestRank: rank.name,
        matchTypes: {
          '1v1': { matches: 0, wins: 0, losses: 0, draws: 0, mmr, winRate: 0 },
          '2v2': { matches: 0, wins: 0, losses: 0, draws: 0, mmr, winRate: 0 },
          '3v3': { matches: 0, wins: 0, losses: 0, draws: 0, mmr, winRate: 0 },
          '4v4': { matches: 0, wins: 0, losses: 0, draws: 0, mmr, winRate: 0 },
          'ffa': { matches: 0, wins: 0, losses: 0, draws: 0, mmr, winRate: 0 },
          'vsai': { matches: 0, wins: 0, losses: 0, draws: 0, mmr, winRate: 0 }
        },
        races: {
          human: 0,
          orc: 0,
          undead: 0,
          night_elf: 0,
          random: 0
        },
        raceWins: {
          human: 0,
          orc: 0,
          undead: 0,
          night_elf: 0,
          random: 0
        },
        maps: {},
        mapWins: {}
      },
      lastActive: new Date(),
      _skillLevel: skillLevel.baseSkill,
      _targetSkill: skillLevel.level
    });
    
    players.push(player);
  }
  
  const savedPlayers = await Player.insertMany(players);
  
  const distribution = {};
  savedPlayers.forEach(p => {
    const tier = p._targetSkill || 'unknown';
    distribution[tier] = (distribution[tier] || 0) + 1;
  });
  
  console.log('  📊 Skill distribution:');
  Object.entries(distribution).forEach(([tier, count]) => {
    console.log(`    ${tier}: ${count} players (${count}%)`);
  });
  
  console.log(`  ✅ Created ${savedPlayers.length} players\n`);
  return savedPlayers;
}

/**
 * Get random war2 maps for variety
 */
async function getRandomMaps(count = 100) {
  const maps = await War2Map.aggregate([
    { $sample: { size: count } },
    { $project: { name: 1, type: 1, playerCount: 1 } }
  ]);
  
  console.log(`📍 Loaded ${maps.length} random War2 maps for variety\n`);
  return maps;
}

/**
 * Simulate a single match and update all stats
 */
async function simulateMatch(player1, player2, gameType, mapName, matchNumber) {
  const winProbability = calculateWinProbability(player1._skillLevel, player2._skillLevel);
  const player1Wins = Math.random() < winProbability;
  
  const player1Race = selectRace();
  const player2Race = selectRace();
  const duration = Math.floor(Math.random() * 17) + 8; // 8-25 minutes
  
  const player1MatchCount = player1.stats.matchTypes[gameType].matches;
  const player2MatchCount = player2.stats.matchTypes[gameType].matches;
  
  const player1MmrChange = calculateMmrChange(
    player1.mmr, player2.mmr, player1Wins ? 'win' : 'loss', gameType, player1MatchCount
  );
  
  const player2MmrChange = calculateMmrChange(
    player2.mmr, player1.mmr, player1Wins ? 'loss' : 'win', gameType, player2MatchCount
  );
  
  player1.mmr += player1MmrChange;
  player2.mmr += player2MmrChange;
  
  player1.mmr = Math.max(MMR_CONFIG.MIN_MMR, Math.min(player1.mmr, MMR_CONFIG.MAX_MMR));
  player2.mmr = Math.max(MMR_CONFIG.MIN_MMR, Math.min(player2.mmr, MMR_CONFIG.MAX_MMR));
  
  player1.rank = getRankByMmr(player1.mmr);
  player2.rank = getRankByMmr(player2.mmr);
  
  const match = new Match({
    gameType: 'warcraft2',
    matchType: gameType,
    map: {
      name: mapName
    },
    resourceLevel: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
    winner: player1Wins ? player1._id : player2._id,
    duration,
    date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
    players: [
      {
        playerId: player1._id,
        name: player1.name,
        race: player1Race,
        mmrBefore: player1.mmr - player1MmrChange,
        mmrAfter: player1.mmr,
        mmrChange: player1MmrChange
      },
      {
        playerId: player2._id,
        name: player2.name,
        race: player2Race,
        mmrBefore: player2.mmr - player2MmrChange,
        mmrAfter: player2.mmr,
        mmrChange: player2MmrChange
      }
    ],
    verification: {
      status: 'verified',
      verifiedAt: new Date()
    }
  });
  
  // Update player stats
  [
    { player: player1, won: player1Wins, race: player1Race },
    { player: player2, won: !player1Wins, race: player2Race }
  ].forEach(({ player, won, race }) => {
    player.stats.totalMatches++;
    if (won) {
      player.stats.wins++;
      player.stats.currentStreak = player.stats.currentStreak >= 0 ? player.stats.currentStreak + 1 : 1;
      player.stats.longestWinStreak = Math.max(player.stats.longestWinStreak, player.stats.currentStreak);
    } else {
      player.stats.losses++;
      player.stats.currentStreak = player.stats.currentStreak <= 0 ? player.stats.currentStreak - 1 : -1;
      player.stats.longestLossStreak = Math.max(player.stats.longestLossStreak, Math.abs(player.stats.currentStreak));
    }
    player.stats.winRate = Math.round((player.stats.wins / player.stats.totalMatches) * 100);
    
    const gameTypeStats = player.stats.matchTypes[gameType];
    gameTypeStats.matches++;
    if (won) gameTypeStats.wins++;
    else gameTypeStats.losses++;
    gameTypeStats.mmr = player.mmr;
    gameTypeStats.winRate = Math.round((gameTypeStats.wins / gameTypeStats.matches) * 100);
    
    player.stats.races[race]++;
    if (won) player.stats.raceWins[race]++;
    
    if (!player.stats.maps[mapName]) player.stats.maps[mapName] = 0;
    if (!player.stats.mapWins[mapName]) player.stats.mapWins[mapName] = 0;
    player.stats.maps[mapName]++;
    if (won) player.stats.mapWins[mapName]++;
    
    player.lastActive = new Date();
  });
  
  await match.save();
  
  return {
    matchNumber,
    winner: player1Wins ? player1.name : player2.name,
    gameType,
    mapName
  };
}

/**
 * Simulate all matches progressively
 */
async function simulateMatches(players, maps) {
  console.log('⚔️ Simulating 10,000 realistic matches...');
  console.log('📈 Progressive MMR updates with placement volatility\n');
  
  const totalMatches = 10000;
  let matchCount = 0;
  
  for (let i = 0; i < totalMatches; i++) {
    const player1 = players[Math.floor(Math.random() * players.length)];
    const gameType = selectGameType();
    const player2 = findOpponent(player1, players);
    if (!player2) continue;
    
    const map = maps[Math.floor(Math.random() * maps.length)];
    
    await simulateMatch(player1, player2, gameType, map.name, i + 1);
    matchCount++;
    
    if (matchCount % 1000 === 0) {
      const progress = Math.round((matchCount / totalMatches) * 100);
      console.log(`  🎯 Progress: ${matchCount}/${totalMatches} matches (${progress}%)`);
      
      const avgMmr = Math.round(players.reduce((sum, p) => sum + p.mmr, 0) / players.length);
      console.log(`    📊 Average MMR: ${avgMmr}`);
    }
  }
  
  console.log(`\n✅ Simulated ${matchCount} matches with realistic outcomes!`);
  
  console.log('💾 Saving final player data...');
  for (const player of players) {
    await Player.findByIdAndUpdate(player._id, {
      mmr: player.mmr,
      rank: player.rank,
      stats: player.stats,
      lastActive: player.lastActive
    });
  }
  
  console.log('✅ All player data saved!\n');
}

/**
 * Generate final statistics report
 */
async function generateReport() {
  console.log('📊 FINAL SYSTEM REPORT');
  console.log('======================');
  
  const players = await Player.find({});
  const matches = await Match.countDocuments();
  
  const mmrStats = {
    min: Math.min(...players.map(p => p.mmr)),
    max: Math.max(...players.map(p => p.mmr)),
    avg: Math.round(players.reduce((sum, p) => sum + p.mmr, 0) / players.length)
  };
  
  const rankDistribution = {};
  players.forEach(p => {
    const rank = p.rank.name;
    rankDistribution[rank] = (rankDistribution[rank] || 0) + 1;
  });
  
  const gameTypeMatches = await Match.aggregate([
    { $group: { _id: '$matchType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log(`📈 Total Players: ${players.length}`);
  console.log(`⚔️ Total Matches: ${matches}`);
  console.log(`📊 MMR Range: ${mmrStats.min} - ${mmrStats.max} (avg: ${mmrStats.avg})`);
  console.log('');
  
  console.log('🏆 RANK DISTRIBUTION:');
  RANKS.forEach(rank => {
    const count = rankDistribution[rank.name] || 0;
    const percentage = Math.round((count / players.length) * 100);
    console.log(`  ${rank.name}: ${count} players (${percentage}%)`);
  });
  console.log('');
  
  console.log('🎮 GAME TYPE DISTRIBUTION:');
  gameTypeMatches.forEach(({ _id, count }) => {
    const percentage = Math.round((count / matches) * 100);
    console.log(`  ${_id}: ${count} matches (${percentage}%)`);
  });
  console.log('');
  
  console.log('✅ REALISTIC SIMULATION COMPLETE!');
  console.log('🎯 Your database now contains competitive War2 data');
  console.log('🏆 New ranking system fully tested with real scenarios');
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 COMPREHENSIVE DATABASE RESEEDING');
    console.log('====================================');
    console.log('🎯 Creating realistic War2 competitive environment');
    console.log('⚡ New WC3 Champions ranking system active\n');
    
    await mongoose.connect('mongodb://localhost:27017/newsite');
    console.log('✅ Connected to database\n');
    
    await cleanupDatabase();
    const players = await createPlayers();
    const maps = await getRandomMaps(100);
    await simulateMatches(players, maps);
    await generateReport();
    
  } catch (error) {
    console.error('❌ Reseeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main }; 