const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');

/**
 * Generate Match Data Script
 * 
 * This script creates simulated match data for all three game types:
 * - WC1: vs AI and 1v1 matches
 * - WC2: 1v1, 2v2, 3v3, 4v4, FFA, vs AI matches
 * - WC3: 1v1, 2v2, 3v3, 4v4, FFA, vs AI matches
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

// Match types for each game
const MATCH_TYPES = {
  wc1: ['vsai', '1v1'],
  wc2: ['1v1', '2v2', '3v3', '4v4', 'ffa', 'vsai'],
  wc3: ['1v1', '2v2', '3v3', '4v4', 'ffa', 'vsai']
};

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
 * Get random match type for game type
 */
function getRandomMatchType(gameType) {
  const matchTypes = MATCH_TYPES[gameType];
  return matchTypes[Math.floor(Math.random() * matchTypes.length)];
}

/**
 * Calculate MMR change
 */
function calculateMmrChange(winner, loser, isWin) {
  const baseChange = 25;
  const mmrDiff = Math.abs(winner - loser);
  const factor = mmrDiff / 400;
  
  if (isWin) {
    return Math.round(baseChange * (1 + factor));
  } else {
    return Math.round(-baseChange * (1 - factor));
  }
}

/**
 * Create a simulated match
 */
async function createSimulatedMatch(gameType, matchType, players, matchNumber) {
  const mapName = getRandomMap(gameType);
  const duration = Math.floor(Math.random() * 20) + 5; // 5-25 minutes
  const resourceLevel = ['high', 'medium', 'low'][Math.floor(Math.random() * 3)];
  
  // Select players based on match type
  let selectedPlayers = [];
  let winner = null;
  
  if (matchType === 'vsai') {
    // VS AI match - single player vs AI
    const player = players[Math.floor(Math.random() * players.length)];
    const playerWins = Math.random() > 0.4; // 60% win rate vs AI
    
    selectedPlayers = [
      {
        playerId: player._id,
        name: player.name,
        race: getRandomRace(gameType),
        team: 1,
        isAI: false,
        mmrBefore: player.mmr,
        mmrAfter: player.mmr + (playerWins ? 15 : -10),
        mmrChange: playerWins ? 15 : -10
      },
      {
        playerId: null,
        name: 'AI',
        race: getRandomRace(gameType),
        team: 2,
        isAI: true,
        mmrBefore: 1200,
        mmrAfter: 1200,
        mmrChange: 0
      }
    ];
    
    winner = playerWins ? player._id : null;
    
  } else if (matchType === 'ffa') {
    // FFA match - 4-6 players
    const numPlayers = Math.floor(Math.random() * 3) + 4; // 4-6 players
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const ffaPlayers = shuffledPlayers.slice(0, numPlayers);
    
    selectedPlayers = ffaPlayers.map((player, index) => ({
      playerId: player._id,
      name: player.name,
      race: getRandomRace(gameType),
      team: 0,
      placement: index + 1,
      isAI: false,
      mmrBefore: player.mmr,
      mmrAfter: player.mmr + (index === 0 ? 30 : index === 1 ? 15 : index === 2 ? 5 : -10),
      mmrChange: index === 0 ? 30 : index === 1 ? 15 : index === 2 ? 5 : -10
    }));
    
    winner = ffaPlayers[0]._id; // First place wins
    
  } else {
    // Team match (1v1, 2v2, 3v3, 4v4)
    const teamSize = parseInt(matchType.split('v')[0]);
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const team1Players = shuffledPlayers.slice(0, teamSize);
    const team2Players = shuffledPlayers.slice(teamSize, teamSize * 2);
    
    if (team1Players.length < teamSize || team2Players.length < teamSize) {
      return null; // Not enough players for this match type
    }
    
    const team1Wins = Math.random() > 0.5;
    
    selectedPlayers = [
      ...team1Players.map(player => ({
        playerId: player._id,
        name: player.name,
        race: getRandomRace(gameType),
        team: 1,
        isAI: false,
        mmrBefore: player.mmr,
        mmrAfter: player.mmr + (team1Wins ? 20 : -15),
        mmrChange: team1Wins ? 20 : -15
      })),
      ...team2Players.map(player => ({
        playerId: player._id,
        name: player.name,
        race: getRandomRace(gameType),
        team: 2,
        isAI: false,
        mmrBefore: player.mmr,
        mmrAfter: player.mmr + (team1Wins ? -15 : 20),
        mmrChange: team1Wins ? -15 : 20
      }))
    ];
    
    winner = team1Wins ? team1Players[0]._id : team2Players[0]._id;
  }
  
  // Create match data
  const matchData = {
    gameType: gameType,
    matchType: matchType,
    map: {
      name: mapName
    },
    resourceLevel: resourceLevel,
    winner: winner,
    duration: duration,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
    players: selectedPlayers,
    verification: {
      status: 'verified',
      verifiedAt: new Date()
    }
  };
  
  const match = new Match(matchData);
  await match.save();
  
  // Update player stats
  for (const playerData of selectedPlayers) {
    if (playerData.playerId && !playerData.isAI) {
      const player = await Player.findById(playerData.playerId);
      if (player) {
        // Update MMR
        player.mmr = Math.max(1000, Math.min(3000, player.mmr + playerData.mmrChange));
        
        // Update stats
        if (!player.stats) player.stats = {};
        if (!player.stats.matchTypes) player.stats.matchTypes = {};
        if (!player.stats.matchTypes[matchType]) {
          player.stats.matchTypes[matchType] = {
            matches: 0,
            wins: 0,
            losses: 0,
            mmr: player.mmr,
            winRate: 0
          };
        }
        
        const matchTypeStats = player.stats.matchTypes[matchType];
        matchTypeStats.matches++;
        
        if (playerData.mmrChange > 0) {
          matchTypeStats.wins++;
        } else {
          matchTypeStats.losses++;
        }
        
        matchTypeStats.mmr = player.mmr;
        matchTypeStats.winRate = Math.round((matchTypeStats.wins / matchTypeStats.matches) * 100);
        
        await player.save();
      }
    }
  }
  
  return {
    matchNumber,
    gameType,
    matchType,
    mapName,
    winner: winner ? selectedPlayers.find(p => p.playerId?.toString() === winner.toString())?.name : 'AI'
  };
}

/**
 * Generate matches for a specific game type
 */
async function generateMatchesForGameType(gameType, numMatches = 100) {
  console.log(`🎮 Generating ${numMatches} matches for ${gameType.toUpperCase()}...`);
  
  // Get players for this game type
  const players = await Player.find({ gameType: gameType }).limit(50);
  
  if (players.length === 0) {
    console.log(`⚠️ No players found for ${gameType}, skipping...`);
    return;
  }
  
  console.log(`👥 Found ${players.length} players for ${gameType}`);
  
  const matchTypes = MATCH_TYPES[gameType];
  let createdMatches = 0;
  
  for (let i = 0; i < numMatches; i++) {
    const matchType = matchTypes[Math.floor(Math.random() * matchTypes.length)];
    
    try {
      const result = await createSimulatedMatch(gameType, matchType, players, i + 1);
      if (result) {
        createdMatches++;
        
        if (createdMatches % 20 === 0) {
          console.log(`  ✅ Created ${createdMatches}/${numMatches} ${gameType} matches`);
        }
      }
    } catch (error) {
      console.error(`❌ Error creating ${gameType} match ${i + 1}:`, error.message);
    }
  }
  
  console.log(`✅ Created ${createdMatches} ${gameType} matches successfully!\n`);
  return createdMatches;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🎮 GENERATING SIMULATED MATCH DATA');
    console.log('==================================');
    console.log('🎯 Creating matches for WC1, WC2, and WC3');
    console.log('⚡ Testing all match types and filters\n');
    
    await mongoose.connect('mongodb://localhost:27017/newsite');
    console.log('✅ Connected to database\n');
    
    // Generate matches for each game type
    const gameTypes = ['wc1', 'wc2', 'wc3'];
    const matchesPerGame = 150; // 150 matches per game type
    
    for (const gameType of gameTypes) {
      await generateMatchesForGameType(gameType, matchesPerGame);
    }
    
    // Generate summary
    console.log('📊 MATCH GENERATION SUMMARY');
    console.log('============================');
    
    for (const gameType of gameTypes) {
      const matchCount = await Match.countDocuments({ gameType: gameType });
      console.log(`${gameType.toUpperCase()}: ${matchCount} matches`);
      
      for (const matchType of MATCH_TYPES[gameType]) {
        const typeCount = await Match.countDocuments({ 
          gameType: gameType, 
          matchType: matchType 
        });
        console.log(`  ${matchType}: ${typeCount} matches`);
      }
      console.log('');
    }
    
    console.log('🎉 Match data generation completed!');
    console.log('🔍 You can now test the filter functionality on the arena page.');
    
  } catch (error) {
    console.error('❌ Match generation failed:', error);
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
