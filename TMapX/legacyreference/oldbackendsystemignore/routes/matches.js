const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Match = require('../models/Match');
const Player = require('../models/Player');

// Cache for frequently accessed data
const matchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/matches - Unified matches endpoint with filtering and pagination
 * Supports: gameType, matchType, playerId, mapId, mapType, verification status
 * Standardized structure for WC1, WC2, and WC3 games
 */
router.get('/', async (req, res) => {
  try {
    const {
      gameType,
      matchType,
      playerId,
      mapId,
      mapType,
      verificationStatus = 'verified',
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 Unified matches query:', { gameType, matchType, playerId, mapId, mapType, page, limit });

    // Build query
    const query = {};

    if (gameType) query.gameType = gameType;
    if (matchType) query.matchType = matchType;
    if (verificationStatus) query['verification.status'] = verificationStatus;

    if (playerId) {
      query['players.playerId'] = playerId;
    }

    if (mapId && mapType) {
      query['map.mapId'] = mapId;
      query['map.mapType'] = mapType;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Check cache for this query
    const cacheKey = JSON.stringify({ query, page, limit, sortBy, sortOrder });
    const cached = matchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Returning cached matches result');
      return res.json(cached.data);
    }

    // Execute query with optimized population
    const [matches, totalMatches] = await Promise.all([
      Match.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('players.playerId', 'name mmr rank gameType')
        .populate('report.reportedBy', 'username displayName avatar')
        .lean(),
      Match.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalMatches / parseInt(limit));
    const hasMore = parseInt(page) < totalPages;

    const result = {
      success: true,
      data: {
        matches: matches.map(match => ({
          _id: match._id,
          gameType: match.gameType,
          matchType: match.matchType,
          date: match.date,
          duration: match.duration,
          resourceLevel: match.resourceLevel,
          map: {
            name: match.map.name,
            mapId: match.map.mapId,
            mapType: match.map.mapType
          },
          players: match.players.map(p => ({
            playerId: p.playerId?._id || p.playerId,
            name: p.playerId?.name || 'Unknown Player',
            race: p.race || 'random',
            team: p.team || 0,
            placement: p.placement || null,
            mmrBefore: p.mmrBefore,
            mmrAfter: p.mmrAfter,
            mmrChange: p.mmrChange,
            rankBefore: p.rankBefore,
            rankAfter: p.rankAfter
          })),
          winner: match.winner,
          verification: match.verification,
          report: match.report
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMatches,
          hasMore,
          pageSize: parseInt(limit)
        }
      }
    };

    // Cache the result
    matchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    const now = Date.now();
    for (const [key, value] of matchCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        matchCache.delete(key);
      }
    }

    console.log(`✅ Found ${matches.length} matches (${totalMatches} total)`);
    res.json(result);

  } catch (error) {
    console.error('❌ Error in unified matches endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches'
    });
  }
});

/**
 * GET /api/matches/stats - Get aggregated match statistics
 * Supports filtering by gameType, matchType, verification status
 */
router.get('/stats', async (req, res) => {
  try {
    const { gameType, matchType, verificationStatus = 'verified' } = req.query;

    console.log('📊 Getting match statistics:', { gameType, matchType, verificationStatus });

    // Build match filter
    const matchFilter = {};
    if (gameType) matchFilter.gameType = gameType;
    if (matchType) matchFilter.matchType = matchType;
    if (verificationStatus) matchFilter['verification.status'] = verificationStatus;

    // Build aggregation pipeline for statistics
    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalMatches: { $sum: 1 },
          totalPlayers: { $addToSet: '$players.playerId' },
          gameTypes: { $addToSet: '$gameType' },
          matchTypes: { $addToSet: '$matchType' },
          averageDuration: { $avg: '$duration' },
          totalWins: {
            $sum: {
              $cond: [
                { $eq: ['$winner', 'player1'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalMatches: 1,
          uniquePlayers: { $size: '$totalPlayers' },
          gameTypes: 1,
          matchTypes: 1,
          averageDuration: { $round: ['$averageDuration', 2] },
          totalWins: 1
        }
      }
    ];

    const stats = await Match.aggregate(pipeline);
    const result = stats[0] || {
      totalMatches: 0,
      uniquePlayers: 0,
      gameTypes: [],
      matchTypes: [],
      averageDuration: 0,
      totalWins: 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting match statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch match statistics'
    });
  }
});

/**
 * GET /api/matches/map/:mapType/:mapId - Get matches for a specific map
 * Replaces the old game-specific map match endpoints
 */
router.get('/map/:mapType/:mapId', async (req, res) => {
  try {
    const { mapType, mapId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    console.log(`🏆 Loading match history for ${mapType} map ${mapId}, page ${page}`);

    // Validate map type
    if (!['wc1', 'wc2', 'wc3'].includes(mapType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid map type. Must be wc1, wc2, or wc3'
      });
    }

    // Use the new getMapMatches static method
    const matches = await Match.getMapMatches(mapId, mapType, parseInt(limit), parseInt(page));
    
    // Get total count for pagination
    const totalMatches = await Match.countDocuments({
      'map.mapId': mapId,
      'map.mapType': mapType,
      'verification.status': 'verified'
    });

    const totalPages = Math.ceil(totalMatches / parseInt(limit));
    const hasMore = parseInt(page) < totalPages;

    // Format matches for frontend
    const formattedMatches = matches.map(match => ({
      _id: match._id,
      matchType: match.matchType,
      date: match.date,
      duration: match.duration,
      resourceLevel: match.resourceLevel,
      players: match.players.map(p => ({
        name: p.playerId?.name || 'Unknown Player',
        race: p.race || 'random',
        isAI: p.isAI || false,
        isWinner: p.isWinner || false,
        placement: p.placement || null
      })),
      winner: match.winner,
      verification: match.verification
    }));

    res.json({
      success: true,
      data: {
        matches: formattedMatches,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          hasMore,
          totalMatches
        }
      }
    });

  } catch (error) {
    console.error('❌ Error loading map match history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load match history'
    });
  }
});

/**
 * GET /api/matches/player/:playerName - Get matches for a specific player by name
 * First looks up the player by name, then gets their matches
 */
router.get('/player/:playerName', async (req, res) => {
  try {
    const { playerName } = req.params;
    const { page = 1, limit = 20, gameType } = req.query;

    console.log(`👤 Loading matches for player ${playerName}, page ${page}`);

    // First, find the player by name
    const Player = require('../models/Player');
    const player = await Player.findOne({ name: playerName }).select('_id name mmr rank gameType');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Now get matches for this player using their ObjectId
    const matches = await Match.getPlayerMatches(player._id, parseInt(limit), gameType);
    
    // Get total count for pagination
    const totalMatches = await Match.countDocuments({
      'players.playerId': player._id,
      'verification.status': 'verified',
      ...(gameType && { gameType })
    });

    const totalPages = Math.ceil(totalMatches / parseInt(limit));
    const hasMore = parseInt(page) < totalPages;

    // Format matches for frontend
    const formattedMatches = matches.map(match => ({
      _id: match._id,
      gameType: match.gameType,
      matchType: match.matchType,
      date: match.date,
      duration: match.duration,
      resourceLevel: match.resourceLevel,
      map: match.map,
      players: match.players.map(p => ({
        name: p.playerId?.name || 'Unknown Player',
        race: p.race || 'random',
        isAI: p.isAI || false,
        isWinner: p.isWinner || false,
        placement: p.placement || null,
        mmrBefore: p.mmrBefore,
        mmrAfter: p.mmrAfter,
        mmrChange: p.mmrChange,
        rankBefore: p.rankBefore,
        rankAfter: p.rankAfter
      })),
      winner: match.winner,
      verification: match.verification
    }));

    res.json({
      success: true,
      data: {
        player: {
          _id: player._id,
          name: player.name,
          mmr: player.mmr,
          rank: player.rank,
          gameType: player.gameType
        },
        matches: formattedMatches,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          hasMore,
          totalMatches
        }
      }
    });

  } catch (error) {
    console.error('❌ Error loading player matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load player matches'
    });
  }
});

/**
 * GET /api/matches/recent - Get recent matches
 * Uses the optimized getRecentMatches static method
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10, gameType, matchType } = req.query;

    console.log('🕒 Loading recent matches:', { limit, gameType, matchType });

    // Use the new getRecentMatches static method
    const matches = await Match.getRecentMatches(parseInt(limit), gameType, matchType);

    res.json({
      success: true,
      data: {
        matches,
        totalMatches: matches.length
      }
    });

  } catch (error) {
    console.error('❌ Error loading recent matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load recent matches'
    });
  }
});

/**
 * GET /api/matches/:id - Get match details by ID
 * Handles both regular ObjectIds and temporary match IDs
 */
router.get('/:id', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    console.log(`🔍 Getting match details for ID: ${matchId}`);
    
    // Handle special case where match ID starts with "match_"
    let match;
    if (matchId.startsWith('match_')) {
      // This is a temporary match ID from the frontend, try to find by index
      const index = parseInt(matchId.replace('match_', ''));
      const matches = await Match.find().sort({ date: -1 }).limit(100);
      match = matches[index];
    } else {
      // Regular ObjectId lookup
      match = await Match.findById(matchId)
        .populate('players.playerId', 'name mmr rank gameType')
        .populate('report.reportedBy', 'username displayName avatar')
        .lean();
    }

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Format match data consistently with other endpoints
    const formattedMatch = {
      _id: match._id,
      gameType: match.gameType,
      matchType: match.matchType,
      date: match.date,
      duration: match.duration,
      resourceLevel: match.resourceLevel,
      map: match.map ? {
        name: match.map.name,
        mapId: match.map.mapId,
        mapType: match.map.mapType
      } : null,
      players: match.players.map(p => ({
        playerId: p.playerId?._id || p.playerId,
        name: p.playerId?.name || 'Unknown Player',
        race: p.race || 'random',
        team: p.team || 0,
        placement: p.placement || null,
        isWinner: p.isWinner || false,
        mmrBefore: p.mmrBefore,
        mmrAfter: p.mmrAfter,
        mmrChange: p.mmrChange,
        rankBefore: p.rankBefore,
        rankAfter: p.rankAfter
      })),
      winner: match.winner,
      verification: match.verification,
      report: match.report,
      screenshots: match.screenshots || []
    };

    res.json({
      success: true,
      data: formattedMatch
    });

  } catch (error) {
    console.error('❌ Error getting match details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get match details'
    });
  }
});

/**
 * GET /api/matches/:id/screenshot - Get match screenshot
 * Handles both regular ObjectIds and temporary match IDs
 */
router.get('/:id/screenshot', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    console.log(`📸 Getting screenshot for match ID: ${matchId}`);
    
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
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if match has screenshots
    if (match.screenshots && match.screenshots.length > 0) {
      // Return the first screenshot
      const screenshot = match.screenshots[0];
      if (screenshot.url) {
        // If it's a file path, serve the file
        if (screenshot.url.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '../../uploads/', path.basename(screenshot.url));
          if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
          }
        }
        // If it's a URL, redirect to it
        return res.redirect(screenshot.url);
      }
    }

    // No screenshot found
    res.status(404).json({
      success: false,
      message: 'No screenshot available for this match'
    });
  } catch (error) {
    console.error('❌ Error fetching match screenshot:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
