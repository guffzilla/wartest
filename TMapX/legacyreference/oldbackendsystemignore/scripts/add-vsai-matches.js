const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');

/**
 * Add VS AI Matches Script
 * 
 * This script specifically creates VS AI matches for all three game types:
 * - WC1: vs AI matches
 * - WC2: vs AI matches  
 * - WC3: vs AI matches
 * 
 * This ensures the VS AI filter functionality works properly.
 */

// WC1 Maps
const WC1_MAPS = [
  'Forest 1', 'Forest 2', 'Forest 3', 'Forest 4', 'Forest 5', 'Forest 6', 'Forest 7',
  'Swamp 1', 'Swamp 2', 'Swamp 3', 'Swamp 4', 'Swamp 5', 'Swamp 6', 'Swamp 7',
  'Dungeon 1', 'Dungeon 2', 'Dungeon 3', 'Dungeon 4', 'Dungeon 5', 'Dungeon 6', 'Dungeon 7'
];

// WC2 Maps
const WC2_MAPS = [
  'Northshire', 'Goldshire', 'Elwynn Forest', 'Westfall', 'Redridge Mountains',
  'Duskwood', 'Wetlands', 'Arathi Highlands', 'Hillsbrad Foothills', 'Alterac Mountains',
  'Stranglethorn Vale', 'Swamp of Sorrows', 'Blasted Lands', 'Badlands', 'Searing Gorge',
  'Burning Steppes', 'Deadwind Pass', 'Karazhan', 'Stormwind City', 'Ironforge'
];

// WC3 Maps
const WC3_MAPS = [
  'Twisted Meadows', 'Echo Isles', 'Turtle Rock', 'Lost Temple', 'Gnoll Wood',
  'Plunder Isle', 'Tidehunters', 'Secret Valley', 'Tranquil Paths', 'Mystic Isles',
  'Ancient Isles', 'Melting Valley', 'Frostsabre', 'Deadlock', 'Last Refuge',
  'Terenas Stand', 'Avalanche', 'Maelstrom', 'Concealed Hill', 'Emerald Gardens'
];

// Races for each game
const RACES = {
  wc1: ['human', 'orc'],
  wc2: ['human', 'orc'],
  wc3: ['human', 'orc', 'undead', 'night_elf']
};

/**
 * Get random map for game type
 */
function getRandomMap(gameType) {
  switch (gameType) {
    case 'wc1': return WC1_MAPS[Math.floor(Math.random() * WC1_MAPS.length)];
    case 'wc2': return WC2_MAPS[Math.floor(Math.random() * WC2_MAPS.length)];
    case 'wc3': return WC3_MAPS[Math.floor(Math.random() * WC3_MAPS.length)];
    default: return 'Unknown Map';
  }
}

/**
 * Get random race for game type
 */
function getRandomRace(gameType) {
  const races = RACES[gameType];
  return races[Math.floor(Math.random() * races.length)];
}

/**
 * Create a VS AI match
 */
async function createVSAIMatch(gameType, player, matchNumber) {
  const mapName = getRandomMap(gameType);
  const duration = Math.floor(Math.random() * 20) + 5; // 5-25 minutes
  const resourceLevel = ['high', 'medium', 'low'][Math.floor(Math.random() * 3)];
  const playerRace = getRandomRace(gameType);
  const aiRace = getRandomRace(gameType);
  
  // Player has 60% chance to win vs AI
  const playerWins = Math.random() > 0.4;
  const mmrChange = playerWins ? 15 : -10;
  
  // Create match data - handle AI player properly
  const matchData = {
    gameType: gameType,
    matchType: 'vsai',
    map: {
      name: mapName
    },
    resourceLevel: resourceLevel,
    winner: playerWins ? player._id : null, // null for AI win
    duration: duration,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
    players: [
      {
        playerId: player._id,
        name: player.name,
        race: playerRace,
        team: 1,
        isAI: false,
        mmrBefore: player.mmr,
        mmrAfter: player.mmr + mmrChange,
        mmrChange: mmrChange
      },
      {
        playerId: null, // AI doesn't have a player ID
        name: 'AI',
        race: aiRace,
        team: 2,
        isAI: true,
        mmrBefore: 1200,
        mmrAfter: 1200,
        mmrChange: 0
      }
    ],
    verification: {
      status: 'verified',
      verifiedAt: new Date()
    }
  };
  
  const match = new Match(matchData);
  await match.save();
  
  // Update player stats
  if (!player.stats) player.stats = {};
  if (!player.stats.matchTypes) player.stats.matchTypes = {};
  if (!player.stats.matchTypes.vsai) {
    player.stats.matchTypes.vsai = {
      matches: 0,
      wins: 0,
      losses: 0,
      mmr: player.mmr,
      winRate: 0
    };
  }
  
  const vsaiStats = player.stats.matchTypes.vsai;
  vsaiStats.matches++;
  
  if (playerWins) {
    vsaiStats.wins++;
  } else {
    vsaiStats.losses++;
  }
  
  // Update MMR
  player.mmr = Math.max(1000, Math.min(3000, player.mmr + mmrChange));
  vsaiStats.mmr = player.mmr;
  vsaiStats.winRate = Math.round((vsaiStats.wins / vsaiStats.matches) * 100);
  
  await player.save();
  
  return {
    matchNumber,
    gameType,
    mapName,
    winner: playerWins ? player.name : 'AI',
    mmrChange
  };
}

/**
 * Add VS AI matches for a specific game type
 */
async function addVSAIMatchesForGameType(gameType, numMatches = 50) {
  console.log(`🤖 Adding ${numMatches} VS AI matches for ${gameType.toUpperCase()}...`);
  
  // Get players for this game type
  const players = await Player.find({ gameType: gameType }).limit(20);
  
  if (players.length === 0) {
    console.log(`⚠️ No players found for ${gameType}, skipping...`);
    return 0;
  }
  
  console.log(`👥 Found ${players.length} players for ${gameType}`);
  
  let createdMatches = 0;
  
  for (let i = 0; i < numMatches; i++) {
    // Select a random player
    const player = players[Math.floor(Math.random() * players.length)];
    
    try {
      const result = await createVSAIMatch(gameType, player, i + 1);
      createdMatches++;
      
      if (createdMatches % 10 === 0) {
        console.log(`  ✅ Created ${createdMatches}/${numMatches} ${gameType} VS AI matches`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${gameType} VS AI match ${i + 1}:`, error.message);
    }
  }
  
  console.log(`✅ Created ${createdMatches} ${gameType} VS AI matches successfully!\n`);
  return createdMatches;
}

/**
 * Check existing VS AI match counts
 */
async function checkVSAIMatchCounts() {
  console.log('📊 CHECKING EXISTING VS AI MATCH COUNTS');
  console.log('=======================================');
  
  const gameTypes = ['wc1', 'wc2', 'wc3'];
  
  for (const gameType of gameTypes) {
    const vsaiCount = await Match.countDocuments({ 
      gameType: gameType, 
      matchType: 'vsai' 
    });
    
    console.log(`${gameType.toUpperCase()} VS AI matches: ${vsaiCount}`);
  }
  
  console.log('');
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🤖 ADDING VS AI MATCHES');
    console.log('========================');
    console.log('🎯 Creating VS AI matches for WC1, WC2, and WC3');
    console.log('⚡ Ensuring VS AI filter functionality works\n');
    
    await mongoose.connect('mongodb://localhost:27017/newsite');
    console.log('✅ Connected to database\n');
    
    // Check existing counts
    await checkVSAIMatchCounts();
    
    // Add VS AI matches for each game type
    const gameTypes = ['wc1', 'wc2', 'wc3'];
    const matchesPerGame = 30; // 30 VS AI matches per game type
    
    for (const gameType of gameTypes) {
      await addVSAIMatchesForGameType(gameType, matchesPerGame);
    }
    
    // Check final counts
    console.log('📊 FINAL VS AI MATCH COUNTS');
    console.log('============================');
    
    for (const gameType of gameTypes) {
      const vsaiCount = await Match.countDocuments({ 
        gameType: gameType, 
        matchType: 'vsai' 
      });
      
      console.log(`${gameType.toUpperCase()} VS AI matches: ${vsaiCount}`);
    }
    
    console.log('\n🎉 VS AI matches added successfully!');
    console.log('🔍 You can now test the VS AI filter functionality on the arena page.');
    
  } catch (error) {
    console.error('❌ VS AI match creation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
