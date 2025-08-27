const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const User = require('../models/User');
const Match = require('../models/Match');
const Report = require('../models/Report');
const Dispute = require('../models/Dispute');
const FlaggedScreenshot = require('../models/FlaggedScreenshot');
const Notification = require('../models/Notification');
const fs = require('fs');
const { uploadScreenshot, uploadEvidence, getScreenshotUrl, getEvidenceUrl } = require('../utils/fileUpload');
const { RANKS, getRankByMmr, calculateMatchMmrChanges } = require('../utils/mmrCalculator');
const mongoose = require('mongoose');
const path = require('path');

// Import centralized helpers
const ResponseHelper = require('../utils/responseHelper');
const ValidationMiddleware = require('../middleware/validation');
const RateLimitMiddleware = require('../middleware/rateLimit');

// Function to get rank index by name
function getRankIndex(rankName) {
  const rankIndex = RANKS.findIndex(rank => rank.name === rankName);
  return rankIndex >= 0 ? rankIndex : 0;
}

// Function to calculate weighted overall MMR based on match type participation
function calculateWeightedOverallMmr(player) {
  const matchTypes = ['1v1', '2v2', '3v3', '4v4', 'ffa'];
  let totalWeightedMmr = 0;
  let totalGames = 0;
  let debugInfo = [];
  
  for (const matchType of matchTypes) {
    const typeStats = player.stats.matchTypes[matchType];
    if (typeStats && typeStats.matches > 0) {
      const games = typeStats.matches;
      const mmr = typeStats.mmr || 1500;
      totalWeightedMmr += (games * mmr);
      totalGames += games;
      debugInfo.push(`${matchType}: ${games} games × ${mmr} MMR = ${games * mmr}`);
    }
  }
  
  // If no games played in any match type, return default MMR
  if (totalGames === 0) {
    console.log(`🎯 No games played yet, returning default MMR: 1500`);
    return 1500;
  }
  
  // Calculate weighted average
  const weightedAverage = Math.round(totalWeightedMmr / totalGames);
  
  console.log(`🎯 Weighted MMR calculation for ${player.name}:`);
  console.log(`   ${debugInfo.join(', ')}`);
  console.log(`   Total: ${totalWeightedMmr} ÷ ${totalGames} games = ${weightedAverage}`);
  
  return weightedAverage;
}

// Use centralized authentication middleware
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/ladder - Get ladder rankings
router.get('/', async (req, res) => {
  try {
    // Get query parameters
    const limit = parseInt(req.query.limit) || 100;
    const matchType = req.query.matchType || '1v1';
    const gameType = req.query.gameType || 'wc2'; // Default to wc2 for new system

    // Get top players for the specified game type
    const query = { 
      isActive: true,
      gameType: gameType
    };

    // We'll sort by MMR regardless of match type
    // This ensures all players are shown even if they haven't played the specific match type
    const players = await Player.find(query)
      .sort({ mmr: -1 })
      .limit(limit)
      .lean();

    ResponseHelper.success(res, players, 'Ladder rankings retrieved successfully');
  } catch (err) {
    console.error('Error getting ladder rankings:', err);
    ResponseHelper.serverError(res, 'Failed to get ladder rankings');
  }
});

// GET /api/ladder/rankings - Get ladder rankings (alias)
router.get('/rankings', async (req, res) => {
  try {
    // Get query parameters
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const matchType = req.query.matchType || 'all';
    const gameType = req.query.gameType || 'wc2'; // Updated for new system
    const search = req.query.search || '';
    const mapFilter = req.query.map || '';

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    const dbGameTypes = [gameType];
    
    // Get top players for the specified game type(s)
    const query = { 
      isActive: true,
      gameType: { $in: dbGameTypes }
    };

    // Add search filter if provided
    if (search) {
      query.name = new RegExp(search, 'i');
    }

    // Add map-specific filtering by getting matches played on specific map
    let mapFilteredPlayerIds = [];
    if (mapFilter) {
      try {
        const dbMatchGameType = gameType;
        
        const mapMatches = await Match.find({ 
          'map.name': new RegExp(mapFilter, 'i'),
          gameType: dbMatchGameType
        }).distinct('players.playerId');
        mapFilteredPlayerIds = mapMatches;
        
        if (mapFilteredPlayerIds.length > 0) {
          query._id = { $in: mapFilteredPlayerIds };
        } else {
          // No matches found for this map, return empty result
          return res.json({
            players: [],
            pagination: {
              total: 0,
              page,
              limit,
              pages: 0
            },
            filter: {
              matchType,
              gameType,
              search,
              map: mapFilter
            }
          });
        }
      } catch (mapError) {
        console.error('Error filtering by map:', mapError);
        // Continue without map filtering if there's an error
      }
    }

    let players;
    let totalCount;

    console.log(`🔍 Ladder API Debug: matchType=${matchType}, gameType=${gameType}, query=`, query);
    
    if (matchType === 'all') {
      // For 'all' match type, show all players sorted by global MMR
      console.log(`🔍 Using 'all' match type logic`);
      totalCount = await Player.countDocuments(query);
      console.log(`🔍 Found ${totalCount} total players`);
      players = await Player.find(query)
        .sort({ mmr: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      console.log(`🔍 Retrieved ${players.length} players after pagination`);
    } else {
      // For specific match types, show only players who have played that match type
      // but still use their global MMR for ranking
      
      console.log(`🔍 Using specific match type logic for: ${matchType}`);
      // First get all players that match the query
      const allPlayers = await Player.find(query).lean();
      console.log(`🔍 Found ${allPlayers.length} players matching query`);

      // For WC1, show fake test data for development while maintaining match type structure
      let filteredPlayers = allPlayers;
      if (gameType === 'wc1') {
        console.log(`🔍 WC1 detected - showing test data for match type: ${matchType}`);
        
        // For development/testing, show all WC1 players regardless of match type
        // This allows fake test data to be visible in both vs AI and 1v1 tabs
        filteredPlayers = allPlayers;
        
        console.log(`🔍 WC1 players after filtering: ${filteredPlayers.length} (showing all for testing)`);
      } else {
        // For other game types, filter by match type stats
        filteredPlayers = allPlayers.filter(player => {
          // Check if player has stats and matchTypes data
          if (!player.stats || !player.stats.matchTypes) {
            return false;
          }
          
          // Check if player has data for this specific match type
          const matchTypeData = player.stats.matchTypes[matchType];
          if (!matchTypeData) {
            return false;
          }
          
          // Check if player has actually played matches of this type
          return (matchTypeData.matches > 0 || 
                  matchTypeData.wins > 0 || 
                  matchTypeData.losses > 0);
        });
      }

      console.log(`🔍 After filtering: ${filteredPlayers.length} players remain`);
      
      // Sort by global MMR (not match-type-specific MMR)
      filteredPlayers.sort((a, b) => (b.mmr || 1500) - (a.mmr || 1500));

      // Update total count to reflect filtered players
      totalCount = filteredPlayers.length;

      // Apply pagination manually
      players = filteredPlayers.slice(skip, skip + limit);
      
      // Add match-type-specific stats for display while keeping global MMR
      players = players.map(player => {
        // For WC1 players, use match-type-specific stats when available
        let matchTypeStats;
        if (player.gameType === 'wc1') {
          // Check if player has match-type-specific stats
          if (player.stats && player.stats.matchTypes && player.stats.matchTypes[matchType]) {
            // Use match-type-specific stats
            const mtStats = player.stats.matchTypes[matchType];
            matchTypeStats = {
              matches: mtStats.matches || 0,
              wins: mtStats.wins || 0,
              losses: mtStats.losses || 0,
              winRate: mtStats.winRate || 0,
              mmr: mtStats.mmr || player.mmr || 1500
            };
          } else {
            // Fallback to basic player stats for vs AI (since WC1 is primarily vs AI)
            const totalGames = (player.wins || 0) + (player.losses || 0);
            matchTypeStats = {
              matches: totalGames,
              wins: player.wins || 0,
              losses: player.losses || 0,
              winRate: totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0,
              mmr: player.mmr || 1500
            };
          }
        } else {
          // For other game types, use match-type-specific stats
          const mtStats = player.stats.matchTypes[matchType];
          matchTypeStats = {
            matches: mtStats.matches || 0,
            wins: mtStats.wins || 0,
            losses: mtStats.losses || 0,
            winRate: mtStats.winRate || 0,
            mmr: mtStats.mmr || player.mmr || 1500
          };
        }
        
        return {
          ...player,
          // Keep global MMR and rank
          mmr: player.mmr || 1500,
          rank: player.rank || getRankByMmr(player.mmr || 1500),
          // Add match-type-specific stats for reference
          matchTypeStats: matchTypeStats,
          // Override displayed stats with match-type-specific ones for this view
          stats: {
            ...player.stats,
            wins: matchTypeStats.wins || 0,
            losses: matchTypeStats.losses || 0,
            matches: matchTypeStats.matches || 0,
            totalMatches: matchTypeStats.matches || 0,
            winRate: matchTypeStats.winRate || 0
          }
        };
      });
      
      console.log(`🔍 Returning ${players.length} players for specific match type`);
      // Return with correct pagination info for filtered results
      return res.json({
        players,
        pagination: {
        total: totalCount,
          page,
          limit,
        pages: Math.ceil(totalCount / limit)
      },
      filter: {
        matchType,
        gameType,
        totalPlayersInMatchType: totalCount
      }
    });
    }

    // Ensure all players have proper rank information
    players = players.map(player => {
      if (!player.rank || !player.rank.name) {
        player.rank = getRankByMmr(player.mmr || 1500);
      }
      return player;
    });

    res.json({
      players,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      },
      filter: {
        matchType,
        gameType,
        totalPlayersInMatchType: totalCount
      }
    });
  } catch (err) {
    console.error('Error getting ladder rankings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ladder/player/:name - Get player details
router.get('/player/:name', async (req, res) => {
  try {
    const playerName = req.params.name;
    console.log(`🔍 Looking for player: ${playerName}`);

    // Check if the parameter is a MongoDB ObjectId (must be exactly 24 hex characters)
    const isObjectId = mongoose.Types.ObjectId.isValid(playerName) && 
                      /^[0-9a-fA-F]{24}$/.test(playerName) && 
                      playerName.length === 24;
    console.log(`🔍 Is ObjectId: ${isObjectId}`);

    let player;
    if (isObjectId) {
      // If it's an ObjectId, find by ID
      console.log(`🔍 Searching by ObjectId: ${playerName}`);
      player = await Player.findById(playerName);
    } else {
      // Otherwise find by name
      console.log(`🔍 Searching by name: ${playerName}`);
      player = await Player.findByName(playerName);
    }

    if (!player) {
      console.log(`❌ Player not found: ${playerName}`);
      return res.status(404).json({ error: 'Player not found' });
    }

    console.log(`✅ Found player: ${player.name} (ID: ${player._id})`);

    // Get recent matches for the player
    console.log(`🔍 Loading matches for player: ${player._id}`);
    const matches = await Match.getPlayerMatches(player._id, 10);
    console.log(`✅ Found ${matches.length} matches for player: ${player.name}`);

    // Debug: Check the dates on these matches
    if (matches.length > 0) {
      console.log(`🕐 First match dates:`, {
        date: matches[0].date,
        createdAt: matches[0].createdAt,
        updatedAt: matches[0].updatedAt
      });
    }

    // Calculate most played race from stats
    let mostPlayedRace = 'Unknown';
    if (player.stats && player.stats.races) {
      const races = player.stats.races;
      const raceCounts = Object.entries(races).filter(([race, count]) => count > 0);
      
      if (raceCounts.length > 0) {
        // Sort by count and get the most played race
        raceCounts.sort((a, b) => b[1] - a[1]);
        mostPlayedRace = raceCounts[0][0];
        
        // Capitalize the race name for display
        mostPlayedRace = mostPlayedRace.charAt(0).toUpperCase() + mostPlayedRace.slice(1);
      }
    }

    const response = {
      player: {
        ...player.toObject(),
        race: mostPlayedRace // Add the calculated most played race
      },
      matches
    };
    
    console.log(`✅ Sending player details response for: ${player.name} (Most played race: ${mostPlayedRace})`);
    res.json(response);
  } catch (err) {
    console.error('❌ Error getting player details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ladder/player/:name/maps - Get player map statistics
router.get('/player/:name/maps', async (req, res) => {
  try {
    const playerName = req.params.name;

    // Find player by name
    const player = await Player.findByName(playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Return map statistics from player stats
    if (player.stats && player.stats.maps) {
      res.json(player.stats.maps);
    } else {
      // If no map stats exist, return empty object
      res.json({});
    }
  } catch (err) {
    console.error('Error getting player map statistics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEPRECATED: Player matches endpoint removed - use /api/matches/player/:playerId instead

// DEPRECATED: Matches endpoint removed - use /api/matches/recent instead

// DEPRECATED: Recent matches endpoint removed - use /api/matches/recent instead

// GET /api/ladder/ranks - Get all rank definitions
router.get('/ranks', (req, res) => {
  res.json(RANKS);
});

// GET /api/ladder/stats - Get ladder statistics for specific game type
router.get('/stats', async (req, res) => {
  try {
    const gameType = req.query.gameType || 'wc2';
    
    console.log(`📊 Fetching stats for game type: ${gameType}`);
    
    const dbGameType = gameType;
    const dbPlayerGameTypes = [gameType];
    
    // Get total players and matches for this game type
    const totalPlayers = await Player.countDocuments({ gameType: { $in: dbPlayerGameTypes }, isActive: true });
    
    // For matches, we need to count differently for wc1/wc2 since they share the same dbGameType
    let totalMatches;
    if (gameType === 'wc1') {
      // Count matches by finding those with players of the specific gameType
      const matchesWithPlayers = await Match.find({ 
        gameType: dbGameType,
        'verification.status': 'verified'
      }).populate('players.playerId', 'gameType').lean();
      
      totalMatches = matchesWithPlayers.filter(match => 
        match.players.some(player => 
          player.playerId && player.playerId.gameType === gameType
        )
      ).length;
    } else {
      totalMatches = await Match.countDocuments({ 
        gameType: dbGameType, 
        'verification.status': 'verified' 
      });
    }

    // Get race distribution
    const raceStats = await Player.aggregate([
      { $match: { gameType: { $in: dbPlayerGameTypes }, isActive: true } },
      {
        $group: {
          _id: '$race',
          count: { $sum: 1 }
        }
      }
    ]);

    const races = {};
    raceStats.forEach(stat => {
      races[stat._id] = {
        count: stat.count,
        percentage: totalPlayers > 0 ? Math.round((stat.count / totalPlayers) * 100) : 0
      };
    });

    // Get match type distribution
    let matchTypeStats;
    if (gameType === 'wc1') {
      // For wc1/wc2, we need to filter by player gameType
      const allMatches = await Match.find({ 
        gameType: dbGameType, 
        'verification.status': 'verified' 
      }).populate('players.playerId', 'gameType').lean();
      
      const filteredMatches = allMatches.filter(match => 
        match.players.some(player => 
          player.playerId && player.playerId.gameType === gameType
        )
      );
      
      // Count match types manually
      const matchTypeCounts = {};
      filteredMatches.forEach(match => {
        matchTypeCounts[match.matchType] = (matchTypeCounts[match.matchType] || 0) + 1;
      });
      
      matchTypeStats = Object.entries(matchTypeCounts).map(([matchType, count]) => ({
        _id: matchType,
        count
      }));
    } else {
      matchTypeStats = await Match.aggregate([
        { $match: { gameType: dbGameType, 'verification.status': 'verified' } },
        {
          $group: {
            _id: '$matchType',
            count: { $sum: 1 }
          }
        }
      ]);
    }

    const matchTypes = {};
    matchTypeStats.forEach(stat => {
      matchTypes[stat._id] = {
        count: stat.count,
        percentage: totalMatches > 0 ? Math.round((stat.count / totalMatches) * 100) : 0
      };
    });

    // Get rank distribution
    const rankStats = await Player.aggregate([
      { $match: { gameType: { $in: dbPlayerGameTypes }, isActive: true } },
      {
        $group: {
          _id: '$rank.name',
          count: { $sum: 1 }
        }
      }
    ]);

    const ranks = {};
    rankStats.forEach(stat => {
      ranks[stat._id] = {
        count: stat.count,
        percentage: totalPlayers > 0 ? Math.round((stat.count / totalPlayers) * 100) : 0
      };
    });

    // Get MMR distribution
    const mmrDistribution = await Player.aggregate([
      { $match: { gameType: { $in: dbPlayerGameTypes }, isActive: true } },
      {
        $bucket: {
          groupBy: '$mmr',
          boundaries: [0, 800, 1100, 1400, 1700, 2000, 2300, 2600, 5000],
          default: 'high',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const stats = {
      overview: {
        totalPlayers,
        totalMatches,
        gameType
      },
      races,
      matchTypes,
      ranks,
      mmrDistribution
    };

    console.log(`✅ Stats generated for ${gameType}:`, {
      players: totalPlayers,
      matches: totalMatches,
      raceCount: Object.keys(races).length,
      matchTypeCount: Object.keys(matchTypes).length
    });

    res.json(stats);
  } catch (err) {
    console.error('❌ Error getting ladder stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ladder/global-stats - Get global ladder statistics
router.get('/global-stats', async (req, res) => {
  try {
    const gameType = req.query.gameType || 'wc2';

    // Get total players by game type
    const totalPlayers = await Player.countDocuments({ gameType });
    const activePlayers = await Player.countDocuments({ gameType, isActive: true });

    // Get player rank distribution
    const rankDistribution = await Player.aggregate([
      { $match: { gameType, isActive: true } },
      {
        $group: {
          _id: '$rank.name',
          count: { $sum: 1 },
          avgMmr: { $avg: '$mmr' }
        }
      },
      {
        $project: {
          rank: '$_id',
          count: 1,
          avgMmr: { $round: ['$avgMmr', 0] },
          _id: 0
        }
      },
      { $sort: { avgMmr: 1 } }
    ]);

    // Get MMR distribution (ranges)
    const mmrDistribution = await Player.aggregate([
      { $match: { gameType, isActive: true } },
      {
        $bucket: {
          groupBy: '$mmr',
          boundaries: [0, 500, 800, 1100, 1400, 1700, 2000, 2300, 2600, 2900, 3200, 5000],
          default: 'other',
          output: {
            count: { $sum: 1 },
            avgMmr: { $avg: '$mmr' }
          }
        }
      }
    ]);

    // Get total matches for this game type
    const totalMatches = await Match.countDocuments({ gameType, 'verification.status': 'verified' });

    // Get match type distribution
    const matchTypes = await Match.aggregate([
      { $match: { gameType, 'verification.status': 'verified' } },
      {
        $group: {
          _id: '$matchType',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          percentage: {
            $multiply: [
              { $divide: ['$count', totalMatches || 1] },
              100
            ]
          },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get race statistics with win rates (only for matches with verified data)
    const races = await Match.aggregate([
      { $match: { gameType, 'verification.status': 'verified' } },
      { $unwind: '$players' },
      {
        $group: {
          _id: '$players.race',
          count: { $sum: 1 },
          wins: {
            $sum: {
              $cond: [
                { $eq: ['$players.isWinner', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          race: '$_id',
          count: 1,
          wins: 1,
          winRate: {
            $cond: {
              if: { $gt: ['$count', 0] },
              then: {
            $multiply: [
              { $divide: ['$wins', '$count'] },
              100
            ]
              },
              else: 0
            }
          },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top 10 maps with statistics
    const maps = await Match.aggregate([
      {
        $match: {
          gameType,
          'verification.status': 'verified',
          'map.name': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$map.name',
          count: { $sum: 1 },
          mapId: { $first: '$map.mapId' },
          avgDuration: { $avg: '$duration' },
          totalPlayers: { $sum: { $size: '$players' } }
        }
      },
      {
        $lookup: {
          from: 'maps',
          localField: 'mapId',
          foreignField: '_id',
          as: 'mapDetails'
        }
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          mapId: 1,
          avgDuration: { $round: ['$avgDuration', 0] },
          avgPlayersPerMatch: { 
            $round: [{ $divide: ['$totalPlayers', '$count'] }, 1] 
          },
          mapDetails: { $arrayElemAt: ['$mapDetails', 0] },
          _id: 0
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get resource level statistics with win rates
    const resources = await Match.aggregate([
      { $match: { gameType, 'verification.status': 'verified' } },
      {
        $group: {
          _id: '$resourceLevel',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $project: {
          level: '$_id',
          count: 1,
          avgDuration: { $round: ['$avgDuration', 0] },
          percentage: {
            $multiply: [
              { $divide: ['$count', totalMatches || 1] },
              100
            ]
          },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get activity over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await Match.aggregate([
      {
        $match: {
          gameType,
          'verification.status': 'verified',
          date: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date'
            }
          },
          matches: { $sum: 1 },
          uniquePlayers: { $addToSet: '$players.playerId' }
        }
      },
      {
        $project: {
          date: '$_id',
          matches: 1,
          uniquePlayers: { $size: '$uniquePlayers' },
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Get top players by MMR
    const topPlayers = await Player.find({ gameType, isActive: true })
      .sort({ mmr: -1 })
      .limit(5)
      .select('name mmr rank stats.wins stats.losses stats.winRate')
      .lean();

    // Calculate some interesting insights
    const insights = {
      avgMatchesPerPlayer: activePlayers > 0 ? Math.round(totalMatches / activePlayers * 10) / 10 : 0,
      highestMmr: topPlayers.length > 0 ? topPlayers[0].mmr : 0,
      mostActiveRank: rankDistribution.length > 0 ? 
        rankDistribution.reduce((prev, current) => (prev.count > current.count) ? prev : current).rank : 'None',
      mostPopularMatchType: matchTypes.length > 0 ? matchTypes[0].type : 'None',
      mostPopularMap: maps.length > 0 ? maps[0].name : 'None'
    };

    const response = {
      gameType,
      overview: {
        totalPlayers,
        activePlayers,
        totalMatches,
        insights
      },
      rankDistribution,
      mmrDistribution,
      matchTypes,
      races,
      maps,
      resources,
      recentActivity,
      topPlayers
    };

    // Log the statistics for debugging
    console.log(`📊 Global stats for ${gameType}:`, {
      totalPlayers,
      activePlayers,
      totalMatches,
      rankDistribution: rankDistribution.length,
      matchTypes: matchTypes.length,
      races: races.length,
      maps: maps.length
    });

    res.json(response);
  } catch (err) {
    console.error('Error getting global stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/ladder/match/:id - Update match details
router.put('/match/:id', authenticate, async (req, res) => {
  try {
    const matchId = req.params.id;
    const { matchType, map, resourceLevel, players } = req.body;

    // Find the match
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user has permission to edit this match
    // Only allow players who participated in the match or an admin to edit it
    const isAdmin = req.user.role === 'admin';

    // Check if the user is a player in the match
    const isPlayerInMatch = match.players.some(player => {
      const playerId = player.playerId.toString();
      const userPlayers = req.user.players || [];
      return userPlayers.some(userPlayer => userPlayer.toString() === playerId);
    });

    if (!isAdmin && !isPlayerInMatch) {
      return res.status(403).json({ error: 'Only players who participated in this match can edit it' });
    }

    // Update match details
    if (matchType) match.matchType = matchType;

    // Update map if provided
    if (map) {
      // If map is an object with _id, use that
      if (typeof map === 'object' && map._id) {
        match.map.mapId = map._id;
        match.map.name = map.name || match.map.name;
      } else {
        // Otherwise, just use the map ID
       
        match.map.mapId = map;
      }
    }

    if (resourceLevel) match.resourceLevel = resourceLevel;

    // Update player details if provided
    if (players && Array.isArray(players)) {
      // For each player in the update request
      players.forEach(updatedPlayer => {
        // Find the corresponding player in the match
        const matchPlayerIndex = match.players.findIndex(p =>
          p.playerId.toString() === (updatedPlayer.playerId?._id || updatedPlayer.playerId).toString()
        );

        if (matchPlayerIndex !== -1) {
          // Update race if provided
          if (updatedPlayer.race) {
            match.players[matchPlayerIndex].race = updatedPlayer.race;
          }

          // Update player name if provided
          if (updatedPlayer.playerName) {
            match.players[matchPlayerIndex].playerName = updatedPlayer.playerName;
          }
        }
      });
    }

    // Save the updated match
    await match.save();

    // Update player stats for this match
    for (const player of match.players) {
      await Player.updatePlayerStats(player.playerId, {
        matchType: match.matchType,
        outcome: player.outcome,
        race: player.race,
        map: match.map,
        resourceLevel: match.resourceLevel
      });
    }

    res.json({
      message: 'Match updated successfully',
      match
    });
  } catch (err) {
    console.error('Error updating match:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get the index of a rank for comparison
 * @param {string} rankName - Name of the rank
 * @returns {number} - Index of the rank (higher is better)
 */
function getRankIndex(rankName) {
  if (!rankName) return 0;

  const rankOrder = [
    'Bronze 3', 'Bronze 2', 'Bronze 1',
    'Gold 3', 'Gold 2', 'Gold 1',
    'Amber 3', 'Amber 2', 'Amber 1',
    'Sapphire 3', 'Sapphire 2', 'Sapphire 1',
    'Champion'
  ];

  const index = rankOrder.indexOf(rankName);
  return index >= 0 ? index : 0;
}

/**
 * Get top allies and enemies for a player
 * @route GET /api/ladder/player/:name/allies-enemies
 */
router.get('/player/:name/allies-enemies', async (req, res) => {
  try {
    const playerName = req.params.name;
    const limit = parseInt(req.query.limit) || 5;

    // Find player by name
    const player = await Player.findByName(playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get all matches for the player
    const matches = await Match.find({
      'players.playerId': player._id
    }).populate('players.playerId', 'name');

    // Process matches to find allies and enemies
    const allies = new Map(); // Map to store ally data
    const enemies = new Map(); // Map to store enemy data

    matches.forEach(match => {
      const playerData = match.players.find(p => 
        p.playerId && (p.playerId._id ? p.playerId._id.toString() === player._id.toString() : p.playerId.toString() === player._id.toString())
      );

      if (!playerData) return;

      const playerTeam = playerData.team;

      match.players.forEach(p => {
        if (!p.playerId || p.playerId._id.toString() === player._id.toString()) return;

        const otherPlayerName = p.playerId.name;
        const otherPlayerTeam = p.team;

        if (otherPlayerTeam === playerTeam) {
          // This is an ally
          const allyData = allies.get(otherPlayerName) || { name: otherPlayerName, matches: 0, wins: 0 };
          allyData.matches++;
          if (playerData.outcome === 'win') allyData.wins++;
          allies.set(otherPlayerName, allyData);
        } else {
          // This is an enemy
          const enemyData = enemies.get(otherPlayerName) || { name: otherPlayerName, matches: 0, wins: 0 };
          enemyData.matches++;
          if (playerData.outcome === 'win') enemyData.wins++;
          enemies.set(otherPlayerName, enemyData);
        }
      });
    });

    // Convert maps to arrays and sort by matches played
    const topAllies = Array.from(allies.values())
      .map(ally => ({
        ...ally,
        winRate: ally.matches > 0 ? (ally.wins / ally.matches * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.matches - a.matches)
      .slice(0, limit);

    const topEnemies = Array.from(enemies.values())
      .map(enemy => ({
        ...enemy,
        winRate: enemy.matches > 0 ? (enemy.wins / enemy.matches * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.matches - a.matches)
      .slice(0, limit);

    res.json({
      allies: topAllies,
      enemies: topEnemies
    });
  } catch (err) {
    console.error('Error getting allies and enemies:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ladder/player/:id/stats - Get player stats by ID
router.get('/player/:id/stats', async (req, res) => {
  try {
    const playerId = req.params.id;

    // Check if the parameter is a MongoDB ObjectId
    const isObjectId = mongoose.Types.ObjectId.isValid(playerId);

    let player;
    if (isObjectId) {
      // If it's an ObjectId, find by ID
      player = await Player.findById(playerId);
    } else {
      // Otherwise find by name
      player = await Player.findByName(playerId);
    }

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get detailed stats for the player
    const stats = {
      player: {
        id: player._id,
        name: player.name,
        mmr: player.mmr || 1500,
        rank: player.rank || { name: 'Bronze 1', image: '/assets/img/ranks/b1.png' },
        gameType: player.gameType || 'wc2'
      },
      stats: player.stats || {
        wins: 0,
        losses: 0,
        draws: 0,
        totalMatches: 0,
        winRate: 0,
        matchTypes: {},
        races: {},
        maps: {}
      }
    };

    res.json(stats);
  } catch (err) {
    console.error('Error getting player stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEPRECATED: Match details endpoint removed - use /api/matches/:id instead

// DEPRECATED: Match screenshot endpoint removed - use /api/matches/:id/screenshot instead

// POST /api/ladder/matches/:id/screenshot - Upload match screenshot
router.post('/matches/:id/screenshot', authenticate, uploadScreenshot.single('screenshot'), async (req, res) => {
  try {
    const matchId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No screenshot file uploaded' });
    }

    // Handle special case where match ID starts with "match_"
    let match;
    if (matchId.startsWith('match_')) {
      // This is a temporary match ID from the frontend, try to find by index
      const index = parseInt(matchId.replace('match_', ''));
      const matches = await Match.find().sort({ date: -1 }).limit(100);
      match = matches[index];
    } else {
      // Regular ObjectId lookup
      match = await Match.findById(matchId);
    }

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Initialize screenshots array if it doesn't exist
    if (!match.screenshots) {
      match.screenshots = [];
    }

    // Add the new screenshot
    match.screenshots.push({
      url: `/uploads/screenshots/${req.file.filename}`,
      uploadDate: new Date(),
      uploadedBy: req.user._id
    });

    await match.save();

    res.json({
      message: 'Screenshot uploaded successfully',
      screenshot: {
        url: `/uploads/screenshots/${req.file.filename}`,
        uploadDate: new Date()
      }
    });
  } catch (error) {
    console.error('Error uploading match screenshot:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/ladder/matches/:id - Update match details (requires approval)
router.put('/matches/:id', authenticate, async (req, res) => {
  try {
    const matchId = req.params.id;
    const { map, resourceLevel, opponent, outcome, notes } = req.body;

    // Handle special case where match ID starts with "match_"
    let match;
    if (matchId.startsWith('match_')) {
      // This is a temporary match ID from the frontend, try to find by index
      const index = parseInt(matchId.replace('match_', ''));
      const matches = await Match.find().sort({ date: -1 }).limit(100);
      match = matches[index];
    } else {
      // Regular ObjectId lookup
      match = await Match.findById(matchId);
    }

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Create edit proposal instead of directly editing
    const editProposal = {
      matchId: match._id,
      proposedBy: req.user._id,
      proposedChanges: {
        ...(map && { map }),
        ...(resourceLevel && { resourceLevel }),
        ...(opponent && { opponent }),
        ...(outcome && { outcome }),
        ...(notes && { notes })
      },
      status: 'pending',
      createdAt: new Date()
    };

    // Add to match's edit proposals (if schema supports it) or create separate collection
    if (!match.editProposals) {
      match.editProposals = [];
    }
    match.editProposals.push(editProposal);
    
    // Mark match as having pending edits
    match.verification.status = 'pending_edit';

    await match.save();

    res.json({ 
      message: 'Edit proposal submitted successfully. Changes will be reviewed by administrators.',
      editProposal 
    });
  } catch (error) {
    console.error('Error submitting edit proposal:', error);
    res.status(500).json({ error: 'Failed to submit edit proposal' });
  }
});

// POST /api/ladder/matches/:id/dispute - Dispute a match
router.post('/matches/:id/dispute', authenticate, uploadEvidence.array('evidence', 5), async (req, res) => {
  try {
    const matchId = req.params.id;
    const { reason, description } = req.body;

    if (!reason || !description) {
      return res.status(400).json({ error: 'Reason and description are required' });
    }

    // Handle special case where match ID starts with "match_"
    let match;
    if (matchId.startsWith('match_')) {
      // This is a temporary match ID from the frontend, try to find by index
      const index = parseInt(matchId.replace('match_', ''));
      const matches = await Match.find().sort({ date: -1 }).limit(100);
      match = matches[index];
    } else {
      // Regular ObjectId lookup
      match = await Match.findById(matchId);
    }

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user has already disputed this match
    const existingDispute = await Dispute.findOne({
      match: match._id,
      disputedBy: req.user._id
    });

    if (existingDispute) {
      return res.status(400).json({ error: 'You have already disputed this match' });
    }

    // Process uploaded evidence
    const evidence = req.files ? req.files.map(file => ({
      url: getEvidenceUrl(file.filename),
      uploadedBy: req.user._id,
      uploadDate: new Date()
    })) : [];

    // Create new dispute
    const dispute = new Dispute({
      match: match._id,
      disputedBy: req.user._id,
      playerName: req.user.username, // Use authenticated user's username
      reason: `${reason}: ${description}`,
      evidence,
      status: 'open',
      createdAt: new Date()
    });

    await dispute.save();

    // Update match verification status
    match.verification.status = 'disputed';

    // Add reference to the dispute in the match
    if (!match.disputes) {
      match.disputes = [];
    }

    match.disputes.push({
      disputedBy: req.user._id,
      playerName: req.user.username,
      reason: `${reason}: ${description}`,
      evidence: evidence.length > 0 ? evidence[0].url : null,
      status: 'open',
      createdAt: new Date()
    });

    await match.save();

    res.json({
      message: 'Match dispute submitted successfully',
      dispute,
      match: {
        _id: match._id,
        verification: match.verification
      }
    });
  } catch (error) {
    console.error('Error disputing match:', error);
    res.status(500).json({ error: 'Failed to submit dispute' });
  }
});

// Get recent match settings for auto-population
router.get('/recent-settings', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's recent matches as reporter
    const recentMatches = await Match.find({
      'verification.reportedBy': userId,
      'verification.status': 'verified'
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('map resourceLevel players matchType createdAt')
    .lean();

    if (!recentMatches.length) {
      return res.json({
        lastSettings: null,
        recentSettings: [],
        recentPlayers: []
      });
    }

    // Get last match settings
    const lastMatch = recentMatches[0];
    const lastSettings = {
      map: lastMatch.map?.name || lastMatch.map,
      resources: lastMatch.resourceLevel
    };

    // Get unique recent settings (last 3)
    const settingsMap = new Map();
    const recentSettings = [];
    
    for (const match of recentMatches) {
      const mapName = match.map?.name || match.map;
      const key = `${mapName}-${match.resourceLevel}`;
      if (!settingsMap.has(key) && recentSettings.length < 3) {
        settingsMap.set(key, true);
        recentSettings.push({
          map: mapName,
          resources: match.resourceLevel,
          lastUsed: match.createdAt
        });
      }
    }

    // Get recent players (unique, up to 7)
    const playersSet = new Set();
    const recentPlayers = [];
    
    for (const match of recentMatches) {
      for (const player of match.players) {
        if (!playersSet.has(player.name) && recentPlayers.length < 7) {
          playersSet.add(player.name);
          recentPlayers.push({
            name: player.name,
            race: player.race,
            lastPlayedWith: match.createdAt
          });
        }
      }
    }

    res.json({
      lastSettings,
      recentSettings,
      recentPlayers
    });

  } catch (error) {
    console.error('❌ Error fetching recent settings:', error);
    res.status(500).json({ error: 'Failed to fetch recent settings' });
  }
});

// GET /api/ladder/my-players - Get players linked to current user
router.get('/my-players', authenticate, async (req, res) => {
  try {
    console.log('👤 Fetching players for user:', req.user.username);
    
    // Find all players linked to the current user
    const players = await Player.find({ user: req.user._id })
      .sort({ mmr: -1 }) // Sort by MMR descending
      .lean();
    
    console.log(`✅ Found ${players.length} linked players for user:`, req.user.username);
    
    res.json(players);
  } catch (error) {
    console.error('❌ Error fetching user players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// POST /api/ladder/add-player - Link an existing player to current user by name (case-insensitive)
router.post('/add-player', authenticate, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const playerName = username.trim();
    
    if (playerName.length < 2 || playerName.length > 20) {
      return res.status(400).json({ error: 'Player name must be between 2 and 20 characters' });
    }
    
    console.log(`🔗 Attempting to link player "${playerName}" to user:`, req.user.username);
    
    // Find player by name (case-insensitive)
    const player = await Player.findOne({ 
      name: new RegExp(`^${playerName}$`, 'i') 
    });
    
    if (!player) {
      console.log(`❌ Player "${playerName}" not found in database`);
      return res.status(404).json({ error: 'Player not found. Players are created when match reports are submitted.' });
    }
    
    // Check if player is already linked to current user
    if (player.user && player.user.toString() === req.user._id.toString()) {
      console.log(`⚠️ Player "${playerName}" is already linked to current user`);
      return res.status(400).json({ error: 'This player is already linked to your account' });
    }
    
    // Check if player is linked to another user
    if (player.user && player.user.toString() !== req.user._id.toString()) {
      console.log(`🔍 Player "${playerName}" is linked to another user, checking if that user still exists...`);
      
      // Check if the linked user still exists
      const User = require('../models/User');
      const linkedUser = await User.findById(player.user);
      
      if (linkedUser) {
        // User still exists, player is legitimately taken
        console.log(`❌ Player "${playerName}" is linked to existing user: ${linkedUser.username}`);
        return res.status(400).json({ 
          error: `This player is already linked to user "${linkedUser.username}"` 
        });
      } else {
        // User no longer exists (deleted account), auto-unlink the player
        console.log(`🔧 Linked user no longer exists, automatically unlinking orphaned player "${playerName}"`);
        player.user = null;
        player.claimed = false;
        await player.save();
        console.log(`✅ Player "${playerName}" has been unlinked from deleted user and is now available`);
      }
    }
    
    // Link player to current user
    player.user = req.user._id;
    player.claimed = true;
    await player.save();
    
    console.log(`✅ Successfully linked player "${player.name}" to user:`, req.user.username);
    
    // Update user's avatar based on new player link
    try {
      console.log(`🎨 Calling avatar service for user ${req.user._id} and player ${player._id}`);
      const avatarService = require('../services/avatarService');
      await avatarService.handlePlayerLink(req.user._id, player._id);
      console.log(`✅ Avatar service completed successfully for user ${req.user.username}`);
    } catch (avatarError) {
      console.error(`❌ Avatar service failed for user ${req.user.username}:`, avatarError);
      // Don't fail the entire request if avatar update fails
      console.log(`⚠️ Continuing without avatar update - player still linked successfully`);
    }

    // Award "Into the Fray" achievement for linking first player
    try {
      const AchievementService = require('../services/achievementService');
      await AchievementService.awardAchievement(req.user._id, 'into_the_fray');
      console.log(`🏆 Into the Fray achievement processed for user: ${req.user.username}`);
    } catch (achievementError) {
      console.error(`❌ Achievement service failed for user ${req.user.username}:`, achievementError);
      // Don't fail the entire request if achievement fails
      console.log(`⚠️ Continuing without achievement - player still linked successfully`);
    }
    
    res.json({ 
      message: 'Player linked successfully', 
      player: {
        _id: player._id,
        name: player.name,
        mmr: player.mmr,
        rank: player.rank,
        gameType: player.gameType,
        stats: player.stats
      }
    });
    
  } catch (error) {
    console.error('❌ Error linking player:', error);
    res.status(500).json({ error: 'Failed to link player' });
  }
});

// POST /api/ladder/unlink-player - Unlink a player from current user
router.post('/unlink-player', authenticate, async (req, res) => {
  try {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }
    
    console.log(`🔓 Attempting to unlink player ID "${playerId}" from user:`, req.user.username);
    
    // Find player by ID
    const player = await Player.findById(playerId);
    
    if (!player) {
      console.log(`❌ Player with ID "${playerId}" not found`);
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if player belongs to current user
    if (!player.user || player.user.toString() !== req.user._id.toString()) {
      console.log(`❌ Player "${player.name}" does not belong to current user`);
      return res.status(403).json({ error: 'You can only unlink your own players' });
    }
    
    // Unlink player from user
    player.user = null;
    player.claimed = false;
    await player.save();
    
    console.log(`✅ Successfully unlinked player "${player.name}" from user:`, req.user.username);
    
    // Update user's avatar after player unlink
    try {
      console.log(`🎨 Calling avatar service for user ${req.user._id} after unlinking player ${player._id}`);
      const avatarService = require('../services/avatarService');
      await avatarService.handlePlayerUnlink(req.user._id, player._id);
      console.log(`✅ Avatar service completed successfully for user ${req.user.username}`);
    } catch (avatarError) {
      console.error(`❌ Avatar service failed for user ${req.user.username}:`, avatarError);
      // Don't fail the entire request if avatar update fails
      console.log(`⚠️ Continuing without avatar update - player still unlinked successfully`);
    }
    
    res.json({ 
      message: 'Player unlinked successfully', 
      playerId: player._id 
    });
    
  } catch (error) {
    console.error('❌ Error unlinking player:', error);
    res.status(500).json({ error: 'Failed to unlink player' });
  }
});

// POST /api/ladder/players - Create a new player
router.post('/players', authenticate, async (req, res) => {
  try {
    const { playerName, gameType, preferredRace, autoCreated } = req.body;
    
    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const trimmedName = playerName.trim();
    
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      return res.status(400).json({ error: 'Player name must be between 2 and 20 characters' });
    }
    
    const validGameTypes = ['wc1', 'wc2', 'wc3'];
    if (!validGameTypes.includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type. Must be wc1, wc2, or wc3' });
    }
    
    console.log(`🆕 Creating new player "${trimmedName}" for game type: ${gameType}, user: ${req.user.username}`);
    
    // Check if player with this name already exists for this game type
    const existingPlayer = await Player.findOne({ 
      name: new RegExp(`^${trimmedName}$`, 'i'),
      gameType: gameType
    });
    
    if (existingPlayer) {
      // If player exists and is not linked, link it to current user
      if (!existingPlayer.user) {
        existingPlayer.user = req.user._id;
        existingPlayer.claimed = true;
        await existingPlayer.save();
        
        console.log(`✅ Linked existing player "${existingPlayer.name}" to user: ${req.user.username}`);
        return res.json({
          message: 'Player linked successfully',
          player: existingPlayer
        });
      } else if (existingPlayer.user.toString() === req.user._id.toString()) {
        // Player already belongs to this user
        console.log(`⚠️ Player "${trimmedName}" already belongs to user: ${req.user.username}`);
        return res.json({
          message: 'Player already exists',
          player: existingPlayer
        });
      } else {
        // Player belongs to another user
        console.log(`❌ Player "${trimmedName}" already exists and belongs to another user`);
        return res.status(400).json({ error: 'A player with this name already exists for this game type' });
      }
    }
    
    // Create new player
    const playerData = {
      name: trimmedName,
      gameType: gameType,
      user: req.user._id,
      claimed: true,
      mmr: 1200, // Starting MMR
      rank: { name: 'Bronze 3', image: '/assets/img/ranks/b3.png' },
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        totalMatches: 0,
        winRate: 0,
        matchTypes: {},
        races: {},
        maps: {}
      },
      isActive: true
    };
    
    if (preferredRace) {
      playerData.preferredRace = preferredRace;
    }
    
    if (autoCreated) {
      playerData.autoCreated = true;
    }
    
    const player = new Player(playerData);
    await player.save();
    
    console.log(`✅ Successfully created player "${player.name}" for user: ${req.user.username}`);
    
    // Award "Into the Fray" achievement for creating first player
    try {
      const AchievementService = require('../services/achievementService');
      await AchievementService.awardAchievement(req.user._id, 'into_the_fray');
      console.log(`🏆 Into the Fray achievement processed for user: ${req.user.username}`);
    } catch (achievementError) {
      console.error(`❌ Achievement service failed for user ${req.user.username}:`, achievementError);
    }
    
    res.status(201).json({
      message: 'Player created successfully',
      player: {
        _id: player._id,
        name: player.name,
        gameType: player.gameType,
        mmr: player.mmr,
        rank: player.rank,
        preferredRace: player.preferredRace,
        stats: player.stats
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

const { requireFeature } = require('../middleware/accessControl');

// POST /api/ladder/report - Submit general match report (War2/War3)
router.post('/report', authenticate, requireFeature('reportMatches'), uploadScreenshot.array('screenshots', 6), async (req, res) => {
  try {
    console.log('🏆 Match report submission from user:', req.user.username);
    console.log('📊 Match data:', req.body);
    
    const { matchType, map, mapId, resourceLevel, players, winner, battleReport, youtubeLink, gameType } = req.body;
    
    // Validate required fields
    if (!matchType || !map || !players || !winner) {
      return res.status(400).json({ 
        error: 'Missing required fields: matchType, map, players, and winner are required' 
      });
    }

    // Validate and normalize gameType
    const validGameTypes = ['wc1', 'wc2', 'wc3'];
    const normalizedGameType = validGameTypes.includes(gameType) ? gameType : null;
    if (!normalizedGameType) {
      return res.status(400).json({ error: 'Invalid or missing gameType. Must be one of wc1, wc2, wc3.' });
    }
    
    // Parse players data
    let parsedPlayers;
    try {
      parsedPlayers = typeof players === 'string' ? JSON.parse(players) : players;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid players data format' });
    }

    // Validate races per game type
    const allowedRaces = normalizedGameType === 'wc3' 
      ? ['human', 'orc', 'undead', 'night_elf', 'random'] 
      : ['human', 'orc', 'random'];
    const invalidRace = (parsedPlayers || []).find(p => p.race && !allowedRaces.includes(p.race));
    if (invalidRace) {
      return res.status(400).json({ 
        error: `Invalid race "${invalidRace.race}" for ${normalizedGameType}. Allowed: ${allowedRaces.join(', ')}` 
      });
    }
    
    // Process uploaded screenshots
    const screenshots = req.files ? req.files.map(file => ({
      url: `/uploads/screenshots/${file.filename}`,
      uploadedBy: req.user._id,
      uploadDate: new Date()
    })) : [];
    
    // Validate YouTube link if provided
    if (youtubeLink && !youtubeLink.match(/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/)) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }
    
    // Prepare resource level per game
    const allowedResources = ['high', 'medium', 'low'];
    const safeResourceLevel = normalizedGameType === 'wc1'
      ? 'na'
      : (allowedResources.includes(resourceLevel) ? resourceLevel : 'medium');

    // Create match data
    const matchData = {
      gameType: normalizedGameType,
      matchType,
      map: {
        name: map,
        ...(mapId && { mapId }),
        mapType: normalizedGameType
      },
      resourceLevel: safeResourceLevel,
      players: parsedPlayers.map(player => ({
        playerId: null, // Will be populated when players are found/created
        name: player.name,
        race: (player.race && allowedRaces.includes(player.race)) ? player.race : 'random',
        team: player.team || 0,
        isAI: player.isAI || false
      })),
      winner,
      screenshots,
      verification: {
        status: screenshots.length > 0 ? 'pending' : 'rejected',
        verifiedBy: null,
        verifiedAt: null
      },
      report: {
        reportedBy: req.user._id,
        battleReport: battleReport || '',
        youtubeLink: youtubeLink || ''
      },
      date: new Date()
    };
    
    const match = new Match(matchData);
    const savedMatch = await match.save();
    
    console.log('✅ Match report saved successfully:', savedMatch._id);
    
    res.json({
      success: true,
      matchId: savedMatch._id,
      message: 'Match report submitted successfully',
      match: savedMatch
    });
    
  } catch (error) {
    console.error('❌ Error submitting match report:', error);
    res.status(500).json({ 
      error: 'Internal server error while submitting match report',
      message: error.message 
    });
  }
});

// POST /api/ladder/matches/wc1 - Submit WC1 vs AI match
router.post('/matches/wc1', authenticate, async (req, res) => {
  try {
    console.log('🗡️ WC1 vs AI match submission from user:', req.user.username);
    console.log('📊 Match data:', req.body);
    
    const { map, race, result, duration, notes, units, matchType, opponentName } = req.body;
    
    // Validate required fields
    if (!map || !race || !result) {
      return res.status(400).json({ 
        error: 'Missing required fields: map, race, and result are required' 
      });
    }
    
    // Validate enum values
    if (!['human', 'orc'].includes(race)) {
      return res.status(400).json({ error: 'Invalid race. Must be human or orc.' });
    }
    
    if (!['win', 'loss'].includes(result)) {
      return res.status(400).json({ error: 'Invalid result. Must be win or loss.' });
    }

    // Validate unit composition if provided
    if (units && typeof units === 'object') {
      // Validate unit counts are within allowed range
      for (const [unitType, count] of Object.entries(units)) {
        // Peasants and peons must be at least 1, others 0-6
        const minValue = (unitType === 'peasants' || unitType === 'peons') ? 1 : 0;
        
        if (typeof count !== 'number' || count < minValue || count > 6) {
          return res.status(400).json({ 
            error: `Invalid unit count for ${unitType}. Must be between ${minValue} and 6.` 
          });
        }
      }

      // Validate race-specific units
      if (race === 'human') {
        const allowedHumanUnits = ['peasants', 'footmen', 'archers', 'knights', 'catapults', 'clerics'];
        const invalidUnits = Object.keys(units).filter(unit => !allowedHumanUnits.includes(unit));
        if (invalidUnits.length > 0) {
          return res.status(400).json({ 
            error: `Invalid units for Human race: ${invalidUnits.join(', ')}` 
          });
        }
        
        // Ensure peasants are present and at least 1
        if (!units.peasants || units.peasants < 1) {
          return res.status(400).json({ 
            error: 'Human armies must have at least 1 Peasant.' 
          });
        }
      } else if (race === 'orc') {
        const allowedOrcUnits = ['peons', 'grunts', 'spearmen', 'raiders', 'catapults', 'necrolytes'];
        const invalidUnits = Object.keys(units).filter(unit => !allowedOrcUnits.includes(unit));
        if (invalidUnits.length > 0) {
          return res.status(400).json({ 
            error: `Invalid units for Orc race: ${invalidUnits.join(', ')}` 
          });
        }
        
        // Ensure peons are present and at least 1
        if (!units.peons || units.peons < 1) {
          return res.status(400).json({ 
            error: 'Orc armies must have at least 1 Peon.' 
          });
        }
      }

      // Validate minimum unit requirements (at least 1 worker + 1 additional unit = total >= 2)
      const totalUnits = Object.values(units).reduce((sum, count) => sum + count, 0);
      const workerCount = race === 'human' ? (units.peasants || 0) : (units.peons || 0);
      
      if (workerCount < 1 || totalUnits < 2) {
        return res.status(400).json({ 
          error: 'Invalid army composition. You must have at least 1 worker and 1 additional unit (minimum 2 total units).' 
        });
      }

      console.log('🏰 Valid unit composition:', units);
    }
    
    // Find user's WC1 player
    let player = await Player.findOne({ 
      user: req.user._id, 
      gameType: 'wc1' 
    });
    
    if (!player) {
      return res.status(400).json({ 
        error: 'No WC1 player found. Please ensure you have a WC1 player created.' 
      });
    }

    // Handle opponent player auto-creation for 1v1 matches
    let opponentPlayer = null;
    if (matchType === '1v1' && opponentName) {
      console.log('🔍 Looking for opponent player:', opponentName);
      
      // Try to find existing opponent player
      opponentPlayer = await Player.findOne({
        name: opponentName.trim(),
        gameType: 'wc1'
      });
      
      if (!opponentPlayer) {
        console.log('🆕 Creating new opponent player:', opponentName);
        
        // Auto-create opponent player
        opponentPlayer = new Player({
          name: opponentName.trim(),
          gameType: 'wc1',
          mmr: 1500, // Default MMR
          rank: 'Bronze V',
          preferredRace: 'human', // Default race
          isActive: true,
          isAutoCreated: true, // Mark as auto-created
          stats: {
            wins: 0,
            losses: 0,
            totalMatches: 0,
            winRate: 0,
            matchTypes: {
              '1v1': { matches: 0, wins: 0, losses: 0, winRate: 0, mmr: 1500 }
            },
            races: {
              human: { matches: 0, wins: 0, losses: 0, winRate: 0 },
              orc: { matches: 0, wins: 0, losses: 0, winRate: 0 }
            }
          }
        });
        
        await opponentPlayer.save();
        console.log('✅ Auto-created opponent player:', opponentPlayer._id);
      } else {
        console.log('✅ Found existing opponent player:', opponentPlayer._id);
      }
    }
    
    // Create match record according to Match schema
    const mmrChange = result === 'win' ? 15 : -10; // Simple MMR for vs AI
    const newMmr = Math.max(1000, player.mmr + mmrChange); // Min 1000 MMR
    
    const matchData = {
      gameType: 'wc1',
      matchType: 'vsai',
      map: {
        name: map // Map schema requires a name field
      },
      resourceLevel: 'medium', // Required field - default for AI matches
      winner: result === 'win' ? player._id : null, // Player ID if won, null if AI won
      players: [
        {
          playerId: player._id,
          name: player.name, // For quick reference
          race: race,
          team: 1,
          isAI: false,
          mmrBefore: player.mmr,
          mmrAfter: newMmr,
          mmrChange: mmrChange,
          units: units || {} // Store unit composition
        },
        {
          playerId: null, // AI doesn't have a real player ID
          name: 'AI',
          race: race === 'human' ? 'orc' : 'human', // AI plays opposite race
          team: 2,
          isAI: true,
          mmrBefore: 1200, // Default AI MMR
          mmrAfter: 1200, // AI MMR doesn't change
          mmrChange: 0
        }
      ],
      duration: duration ? parseInt(duration) : 0,
      verification: {
        status: 'verified', // Auto-verify AI matches
        verifiedBy: null, // Must be ObjectId or null, not string
        verifiedAt: new Date()
      },
      report: {
        reportedBy: req.user._id,
        battleReport: notes || '', // WC1 still uses 'notes' field in frontend
        youtubeLink: ''
      },
      mmrCalculated: true, // Mark as MMR already calculated
      countsForLadder: true,
      date: new Date()
    };
    
    const match = new Match(matchData);
    const savedMatch = await match.save();
    
    // Update player stats
    player.mmr = newMmr; // Already calculated above
    player.stats.totalMatches = (player.stats.totalMatches || 0) + 1;
    
    if (result === 'win') {
      player.stats.wins = (player.stats.wins || 0) + 1;
    } else {
      player.stats.losses = (player.stats.losses || 0) + 1;
    }
    
    // Update win rate
    player.stats.winRate = player.stats.totalMatches > 0 ? 
      (player.stats.wins / player.stats.totalMatches) * 100 : 0;
    
    // Update vs AI specific stats
    if (!player.stats.matchTypes.vsai) {
      player.stats.matchTypes.vsai = {
        matches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        mmr: 1500
      };
    }
    
    player.stats.matchTypes.vsai.matches += 1;
    if (result === 'win') {
      player.stats.matchTypes.vsai.wins += 1;
    } else {
      player.stats.matchTypes.vsai.losses += 1;
    }
    player.stats.matchTypes.vsai.winRate = player.stats.matchTypes.vsai.matches > 0 ?
      (player.stats.matchTypes.vsai.wins / player.stats.matchTypes.vsai.matches) * 100 : 0;
    
    await player.save();
    
    console.log('✅ WC1 match saved successfully:', savedMatch._id);
    console.log('📊 Updated player stats:', { 
      mmr: player.mmr, 
      wins: player.stats.wins, 
      losses: player.stats.losses 
    });
    
    // Calculate rank progression info
    const currentRank = getRankByMmr(player.mmr);
    const currentRankIndex = RANKS.findIndex(rank => rank.name === currentRank.name);
    const nextRank = currentRankIndex < RANKS.length - 1 ? RANKS[currentRankIndex + 1] : null;
    
    let progressToNext = 0;
    if (nextRank) {
      const currentThreshold = currentRank.threshold;
      const nextThreshold = nextRank.threshold;
      const mmrInCurrentRank = player.mmr - currentThreshold;
      const mmrNeededForNext = nextThreshold - currentThreshold;
      progressToNext = Math.min(100, Math.max(0, (mmrInCurrentRank / mmrNeededForNext) * 100));
    } else {
      progressToNext = 100; // Champion rank
    }

    res.json({
      success: true,
      matchId: savedMatch._id,
      gameType: 'wc1',
      matchType: matchType || 'vsai',
      message: 'WC1 match recorded successfully',
      mmrChange: mmrChange,
      rankChange: false, // TODO: Implement rank change detection
      rewards: {
        arenaGold: result === 'win' ? 15 : 5,
        honor: result === 'win' ? 10 : 3,
        experience: result === 'win' ? 25 : 10
      },
      playerStats: {
        mmr: player.mmr,
        wins: player.stats.wins,
        losses: player.stats.losses,
        totalMatches: player.stats.totalMatches,
        winRate: player.stats.winRate,
        mmrChange: mmrChange
      },
      rankProgression: {
        currentMmr: player.mmr,
        currentRank: currentRank,
        nextRank: nextRank,
        progressToNext: Math.round(progressToNext),
        mmrToNext: nextRank ? nextRank.threshold - player.mmr : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error submitting WC1 match:', error);
    res.status(500).json({ 
      error: 'Internal server error while submitting match',
      message: error.message 
    });
  }
});

// PUT /api/ladder/wc1/sync-username - Sync WC1 player name with username
router.put('/wc1/sync-username', authenticate, async (req, res) => {
  try {
    console.log('🔄 Syncing WC1 player name for user:', req.user.username);
    
    // Find user's WC1 player
    const player = await Player.findOne({ 
      user: req.user._id, 
      gameType: 'wc1' 
    });
    
    if (!player) {
      return res.status(404).json({ 
        error: 'No WC1 player found for this user.' 
      });
    }
    
    // Check if name already matches
    if (player.name === req.user.username) {
      return res.json({
        message: 'WC1 player name is already synchronized',
        player: {
          _id: player._id,
          name: player.name,
          gameType: player.gameType
        }
      });
    }
    
    // Check if the new username is available for WC1
    const existingPlayer = await Player.findOne({
      name: new RegExp(`^${req.user.username}$`, 'i'),
      gameType: 'wc1',
      _id: { $ne: player._id } // Exclude the current player
    });
    
    if (existingPlayer) {
      return res.status(400).json({ 
        error: 'A WC1 player with this username already exists' 
      });
    }
    
    const oldName = player.name;
    player.name = req.user.username;
    await player.save();
    
    // Update all match records that reference this player
    const matchUpdateResult = await Match.updateMany(
      {
        'players.playerId': player._id,
        gameType: 'wc1'
      },
      {
        $set: {
          'players.$.name': req.user.username
        }
      }
    );
    
    console.log(`✅ Synced WC1 player name: "${oldName}" → "${req.user.username}"`);
    console.log(`✅ Updated ${matchUpdateResult.modifiedCount} match records`);
    
    res.json({
      message: 'WC1 player name synchronized successfully',
      player: {
        _id: player._id,
        name: player.name,
        gameType: player.gameType,
        oldName: oldName
      },
      matchesUpdated: matchUpdateResult.modifiedCount
    });
    
  } catch (error) {
    console.error('❌ Error syncing WC1 player name:', error);
    res.status(500).json({ 
      error: 'Internal server error while syncing player name',
      message: error.message 
    });
  }
});

/**
 * GET /api/ladder/recent-opponents - Get recent opponents for player suggestions
 */
router.get('/recent-opponents', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's players
    const userPlayers = await Player.find({ user: userId });
    const userPlayerIds = userPlayers.map(p => p._id);

    if (userPlayerIds.length === 0) {
      return res.json([]);
    }

    // Find recent matches involving user's players
    const recentMatches = await Match.find({
      'players.playerId': { $in: userPlayerIds },
      'verification.status': 'verified'
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('players.playerId');

    // Extract opponents and track when last seen
    const opponents = new Map();

    recentMatches.forEach(match => {
      const userPlayersInMatch = match.players.filter(p => 
        p.playerId && userPlayerIds.some(id => id.equals(p.playerId._id))
      );
      
      const opponentPlayersInMatch = match.players.filter(p => 
        p.playerId && !userPlayerIds.some(id => id.equals(p.playerId._id))
      );

      opponentPlayersInMatch.forEach(opponent => {
        if (opponent.playerId) {
          const player = opponent.playerId;
          const playerId = player._id.toString();
          
          if (!opponents.has(playerId) || new Date(match.createdAt) > new Date(opponents.get(playerId).lastSeen)) {
            opponents.set(playerId, {
              _id: player._id,
              name: player.name,
              gameType: player.gameType,
              mmr: player.mmr || 1500,
              rank: player.rank || 'Unranked',
              preferredRace: player.preferredRace,
              avatar: player.avatar,
              lastSeen: match.createdAt
            });
          }
        }
      });
    });

    // Convert to array and sort by most recent
    const opponentList = Array.from(opponents.values())
      .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
      .slice(0, 10);

    res.json(opponentList);
  } catch (error) {
    console.error('Error fetching recent opponents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch recent opponents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ladder/similar-rank - Get similarly ranked players for suggestions
 */
router.get('/similar-rank', authenticate, async (req, res) => {
  try {
    const { gameType = 'wc2' } = req.query;
    const userId = req.user._id;

    // Get user's players for this game type
    const userPlayers = await Player.find({ user: userId, gameType });
    
    if (userPlayers.length === 0) {
      return res.json([]);
    }

    // Calculate average MMR of user's players
    const avgUserMMR = userPlayers.reduce((sum, p) => sum + (p.mmr || 1500), 0) / userPlayers.length;

    // Find players within ±200 MMR range
    const similarPlayers = await Player.find({
      gameType,
      user: { $ne: userId }, // Exclude user's own players
      mmr: { 
        $gte: avgUserMMR - 200, 
        $lte: avgUserMMR + 200 
      },
      isActive: true
    })
    .sort({ mmr: -1 })
    .limit(15)
    .select('name gameType mmr rank preferredRace avatar');

    res.json(similarPlayers);
  } catch (error) {
    console.error('Error fetching similar rank players:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch similar rank players',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ladder/search-players - Search for players by name (autocomplete)
 */
router.get('/search-players', authenticate, async (req, res) => {
  try {
    const { q, gameType = 'wc2', limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const players = await Player.find({
      gameType,
      name: { $regex: q, $options: 'i' }, // Case-insensitive search
      isActive: true
    })
    .sort({ mmr: -1 }) // Sort by MMR descending
    .limit(parseInt(limit))
    .select('name gameType mmr rank preferredRace avatar');

    res.json(players);
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search players',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ladder/my-stats - Get current user's match statistics
 */
router.get('/my-stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's players
    const players = await Player.find({ user: userId });
    const playerIds = players.map(p => p._id);

    // Get match statistics
    const stats = await Match.aggregate([
      {
        $match: {
          'players.playerId': { $in: playerIds },
          'verification.status': 'verified'
        }
      },
      {
        $group: {
          _id: null,
          totalMatches: { $sum: 1 },
          wins: {
            $sum: {
              $cond: [
                {
                  $or: [
                    // For team matches, check if user's team won
                    {
                      $and: [
                        { $in: ['$matchType', ['2v2', '3v3', '4v4']] },
                        {
                          $anyElementTrue: {
                            $map: {
                              input: '$players',
                              as: 'player',
                              in: {
                                $and: [
                                  { $in: ['$$player.playerId', playerIds] },
                                  { $eq: ['$$player.team', '$winner'] }
                                ]
                              }
                            }
                          }
                        }
                      ]
                    },
                    // For 1v1 and FFA, check if user's player won
                    {
                      $and: [
                        { $in: ['$matchType', ['1v1', 'ffa']] },
                        {
                          $anyElementTrue: {
                            $map: {
                              input: '$players',
                              as: 'player',
                              in: {
                                $and: [
                                  { $in: ['$$player.playerId', playerIds] },
                                  { $eq: ['$$player.playerId', '$winner'] }
                                ]
                              }
                            }
                          }
                        }
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const userStats = stats[0] || { totalMatches: 0, wins: 0 };

    // Get user currency data
    const user = await User.findById(userId).select('arenaGold honor experience');

    res.json({
      totalMatches: userStats.totalMatches,
      totalWins: userStats.wins,
      arenaGold: user.arenaGold || 0,
      honor: user.honor || 0,
      experience: user.experience || 0
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
