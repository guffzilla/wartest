const express = require('express');
const router = express.Router();
const { getMapRankingsRealTime, getAllMapRankings, getAvailableMaps } = require('../utils/mapRankings');
const Player = require('../models/Player');

/**
 * GET /api/map-rankings/:gameType/:mapName
 * Get rankings for a specific map and game type
 */
router.get('/:gameType/:mapName', async (req, res) => {
  try {
    const { gameType, mapName } = req.params;
    
    // Validate game type
    if (!['war1', 'war2', 'war3'].includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type. Must be war1, war2, or war3' });
    }
    
    console.log(`🗺️ Getting map rankings for ${mapName} in ${gameType}`);
    
    const rankings = await getMapRankingsRealTime(mapName, gameType);
    
    res.json(rankings);
  } catch (error) {
    console.error('Error getting map rankings:', error);
    res.status(500).json({ error: 'Failed to get map rankings' });
  }
});

/**
 * GET /api/map-rankings/:gameType
 * Get rankings for all maps of a specific game type
 */
router.get('/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    
    // Validate game type
    if (!['war1', 'war2', 'war3'].includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type. Must be war1, war2, or war3' });
    }
    
    console.log(`🗺️ Getting all map rankings for ${gameType}`);
    
    const rankings = await getAllMapRankings(gameType);
    
    res.json(rankings);
  } catch (error) {
    console.error('Error getting all map rankings:', error);
    res.status(500).json({ error: 'Failed to get map rankings' });
  }
});

/**
 * GET /api/map-rankings/maps/:gameType
 * Get available maps for a game type
 */
router.get('/maps/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    
    // Validate game type
    if (!['war1', 'war2', 'war3'].includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type. Must be war1, war2, or war3' });
    }
    
    const maps = getAvailableMaps(gameType);
    
    res.json({ gameType, maps });
  } catch (error) {
    console.error('Error getting available maps:', error);
    res.status(500).json({ error: 'Failed to get available maps' });
  }
});

/**
 * GET /api/map-rankings/player/:gameType/:playerName
 * Get a player's performance across all maps for a specific game type
 */
router.get('/player/:gameType/:playerName', async (req, res) => {
  try {
    const { gameType, playerName } = req.params;
    
    // Validate game type
    if (!['war1', 'war2', 'war3'].includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type. Must be war1, war2, or war3' });
    }
    
    // Find the player
    const player = await Player.findOne({ name: playerName, gameType });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    console.log(`👤 Getting map performance for ${playerName} in ${gameType}`);
    
    // Get all map rankings for this game type
    const allMapRankings = await getAllMapRankings(gameType);
    
    // Extract this player's performance on each map
    const playerMapPerformance = {};
    
    Object.entries(allMapRankings).forEach(([mapName, mapData]) => {
      const playerRanking = mapData.rankings.find(r => r.name === playerName);
      if (playerRanking) {
        playerMapPerformance[mapName] = {
          rank: playerRanking.rank,
          mapMMR: playerRanking.mapMMR,
          matches: playerRanking.matches,
          wins: playerRanking.wins,
          losses: playerRanking.losses,
          draws: playerRanking.draws,
          winRate: playerRanking.winRate,
          totalPlayers: mapData.totalPlayers
        };
      }
    });
    
    res.json({
      player: {
        name: playerName,
        gameType,
        overallMMR: player.mmr,
        overallRank: player.rank
      },
      mapPerformance: playerMapPerformance
    });
  } catch (error) {
    console.error('Error getting player map performance:', error);
    res.status(500).json({ error: 'Failed to get player map performance' });
  }
});

/**
 * GET /api/map-rankings/leaderboard/:gameType
 * Get overall leaderboard for a game type with map performance summary
 */
router.get('/leaderboard/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    // Validate game type
    if (!['war1', 'war2', 'war3'].includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type. Must be war1, war2, or war3' });
    }
    
    console.log(`🏆 Getting leaderboard for ${gameType}`);
    
    // Get top players for this game type
    const players = await Player.find({ gameType, isActive: true })
      .sort({ mmr: -1 })
      .limit(limit)
      .lean();
    
    // Get all map rankings to add map performance summary
    const allMapRankings = await getAllMapRankings(gameType);
    const availableMaps = getAvailableMaps(gameType);
    
    // Enhance player data with map performance summary
    const enhancedPlayers = players.map((player, index) => {
      let totalMapMatches = 0;
      let totalMapWins = 0;
      let mapRankings = [];
      
      // Calculate map performance summary
      Object.entries(allMapRankings).forEach(([mapName, mapData]) => {
        const playerRanking = mapData.rankings.find(r => r.name === player.name);
        if (playerRanking) {
          totalMapMatches += playerRanking.matches;
          totalMapWins += playerRanking.wins;
          mapRankings.push({
            map: mapName,
            rank: playerRanking.rank,
            totalPlayers: mapData.totalPlayers
          });
        }
      });
      
      return {
        ...player,
        leaderboardRank: index + 1,
        mapSummary: {
          mapsPlayed: mapRankings.length,
          totalMaps: availableMaps.length,
          totalMapMatches,
          totalMapWins,
          mapWinRate: totalMapMatches > 0 ? Math.round((totalMapWins / totalMapMatches) * 100) : 0,
          bestMapRank: mapRankings.length > 0 ? Math.min(...mapRankings.map(r => r.rank)) : null,
          averageMapRank: mapRankings.length > 0 ? 
            Math.round(mapRankings.reduce((sum, r) => sum + r.rank, 0) / mapRankings.length) : null
        }
      };
    });
    
    res.json({
      gameType,
      totalPlayers: enhancedPlayers.length,
      availableMaps,
      leaderboard: enhancedPlayers
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router; 