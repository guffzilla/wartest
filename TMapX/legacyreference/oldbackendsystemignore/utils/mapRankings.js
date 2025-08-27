const Player = require('../models/Player');
const Match = require('../models/Match');

// Maps for each war type
const MAPS = {
  war1: ['Forest Trail', 'Gold Rush', 'Nowhere to Run', 'A Good Day to Die'],
  war2: ['Garden of War', 'Nowhere to Run', 'Oil Spill', 'The Four Corners'],
  war3: ['Lost Temple', 'Twisted Meadows', 'Terenas Stand', 'Echo Isles']
};

/**
 * Calculate real-time map rankings for a specific map and game type
 * This queries the database every time but ensures accuracy
 */
async function getMapRankingsRealTime(mapName, gameType) {
  try {
    // Get all players for this game type
    const players = await Player.find({ gameType }).lean();
    
    // Calculate map-specific stats for each player
    const mapStats = [];
    
    for (const player of players) {
      // Get all matches for this player on this map
      const matches = await Match.find({
        'players.name': player.name,
        map: mapName
      }).lean();
      
      let wins = 0;
      let losses = 0;
      let draws = 0;
      let mapMMR = 1500; // Starting MMR for map-specific calculation
      
      for (const match of matches) {
        const playerInMatch = match.players.find(p => p.name === player.name);
        if (!playerInMatch) continue;
        
        // Determine outcome
        if (match.matchType === 'ffa') {
          // In FFA, only the winner gets a win
          if (match.winner === player.name) {
            wins++;
          } else if (match.status === 'completed') {
            losses++;
          } else {
            draws++;
          }
        } else {
          // For team matches, check if player's team won
          const playerTeam = playerInMatch.team;
          const winnerPlayer = match.players.find(p => p.name === match.winner);
          
          if (winnerPlayer && winnerPlayer.team === playerTeam) {
            wins++;
          } else if (match.status === 'completed') {
            losses++;
          } else {
            draws++;
          }
        }
      }
      
      const totalMatches = wins + losses + draws;
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
      
      // Calculate map-specific MMR based on performance
      if (totalMatches > 0) {
        // Simple MMR calculation: base + performance bonus
        const performanceMultiplier = (winRate / 100) * 2; // 0-2 multiplier
        mapMMR = Math.round(1500 + (totalMatches * 10 * performanceMultiplier));
      }
      
      if (totalMatches > 0) { // Only include players who have played on this map
        mapStats.push({
          ...player,
          mapStats: {
            matches: totalMatches,
            wins,
            losses,
            draws,
            winRate,
            mapMMR
          }
        });
      }
    }
    
    // Sort by map MMR descending
    mapStats.sort((a, b) => b.mapStats.mapMMR - a.mapStats.mapMMR);
    
    return {
      mapName,
      gameType,
      totalPlayers: mapStats.length,
      rankings: mapStats.map((player, index) => ({
        rank: index + 1,
        name: player.name,
        gameType: player.gameType,
        preferredRace: player.preferredRace,
        overallMMR: player.mmr,
        mapMMR: player.mapStats.mapMMR,
        matches: player.mapStats.matches,
        wins: player.mapStats.wins,
        losses: player.mapStats.losses,
        draws: player.mapStats.draws,
        winRate: player.mapStats.winRate
      }))
    };
    
  } catch (error) {
    console.error('Error calculating map rankings:', error);
    throw error;
  }
}

/**
 * Get map rankings for all maps of a specific game type
 */
async function getAllMapRankings(gameType) {
  const maps = MAPS[gameType] || [];
  const rankings = {};
  
  for (const map of maps) {
    rankings[map] = await getMapRankingsRealTime(map, gameType);
  }
  
  return rankings;
}

/**
 * Get available maps for a game type
 */
function getAvailableMaps(gameType) {
  return MAPS[gameType] || [];
}

/**
 * Calculate weighted overall MMR based on match type participation
 */
function calculateWeightedMMR(player) {
  const matchTypes = player.stats.matchTypes;
  let totalGames = 0;
  let weightedMMR = 0;
  
  // Calculate total games (excluding vsai and reducing ffa impact)
  Object.entries(matchTypes).forEach(([type, stats]) => {
    if (type === 'vsai') return; // vsai doesn't affect overall MMR
    const weight = type === 'ffa' ? 0.3 : 1; // FFA has reduced impact
    totalGames += stats.matches * weight;
  });
  
  if (totalGames === 0) return 1500;
  
  // Calculate weighted MMR
  Object.entries(matchTypes).forEach(([type, stats]) => {
    if (type === 'vsai' || stats.matches === 0) return;
    const weight = type === 'ffa' ? 0.3 : 1;
    const contribution = (stats.matches * weight) / totalGames;
    weightedMMR += stats.mmr * contribution;
  });
  
  return Math.round(weightedMMR);
}

/**
 * Update player's overall MMR based on weighted system
 */
async function updatePlayerOverallMMR(playerId) {
  try {
    const player = await Player.findById(playerId);
    if (!player) return null;
    
    const newMMR = calculateWeightedMMR(player);
    player.mmr = newMMR;
    
    // Update rank based on new MMR
    const rank = getRankFromMMR(newMMR);
    player.rank = {
      name: rank.name,
      image: rank.image,
      threshold: rank.threshold
    };
    
    await player.save();
    return player;
    
  } catch (error) {
    console.error('Error updating player MMR:', error);
    throw error;
  }
}

// Rank thresholds - Bronze/Gold/Amber/Sapphire/Champion system
const RANKS = {
  'Bronze 3': { threshold: 0, image: '/assets/img/ranks/b3.png' },
  'Bronze 2': { threshold: 300, image: '/assets/img/ranks/b2.png' },
  'Bronze 1': { threshold: 600, image: '/assets/img/ranks/b1.png' },
  'Gold 3': { threshold: 900, image: '/assets/img/ranks/g3.png' },
  'Gold 2': { threshold: 1200, image: '/assets/img/ranks/g2.png' },
  'Gold 1': { threshold: 1500, image: '/assets/img/ranks/g1.png' },
  'Amber 3': { threshold: 1800, image: '/assets/img/ranks/a3.png' },
  'Amber 2': { threshold: 2100, image: '/assets/img/ranks/a2.png' },
  'Amber 1': { threshold: 2400, image: '/assets/img/ranks/a1.png' },
  'Sapphire 3': { threshold: 2700, image: '/assets/img/ranks/s3.png' },
  'Sapphire 2': { threshold: 3000, image: '/assets/img/ranks/s2.png' },
  'Sapphire 1': { threshold: 3300, image: '/assets/img/ranks/s1.png' },
  'Champion': { threshold: 3600, image: '/assets/img/ranks/champion.png' }
};

function getRankFromMMR(mmr) {
  const sortedRanks = Object.entries(RANKS).sort((a, b) => b[1].threshold - a[1].threshold);
  for (const [rankName, rankData] of sortedRanks) {
    if (mmr >= rankData.threshold) {
      return { name: rankName, ...rankData };
    }
  }
  return { name: 'Bronze 1', ...RANKS['Bronze 1'] };
}

module.exports = {
  getMapRankingsRealTime,
  getAllMapRankings,
  getAvailableMaps,
  calculateWeightedMMR,
  updatePlayerOverallMMR,
  getRankFromMMR,
  MAPS
}; 