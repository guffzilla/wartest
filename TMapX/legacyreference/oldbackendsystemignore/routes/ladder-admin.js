const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Player = require('../models/Player');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireAdminOrModerator } = require('../middleware/auth');

/**
 * Get all matches with pagination and filtering
 * GET /api/ladder-admin/matches
 */
router.get('/matches', requireAdminOrModerator, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    // Filter by match type
    if (req.query.matchType && req.query.matchType !== 'all') {
      filter.matchType = req.query.matchType;
    }
    
    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.createdAt = { $lte: new Date(req.query.endDate) };
    }
    
    // Search by player name
    if (req.query.search) {
      // Find players matching the search term
      const players = await Player.find({
        name: { $regex: req.query.search, $options: 'i' }
      }).select('_id');
      
      const playerIds = players.map(player => player._id);
      
      // Add player IDs to filter
      filter['players.playerId'] = { $in: playerIds };
    }
    
    // Get total count
    const total = await Match.countDocuments(filter);
    
    // Get matches
    const matches = await Match.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('players.playerId', 'name')
      .populate('winner', 'name');
    
    res.json({
      matches,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

/**
 * Get all players with pagination and filtering
 * GET /api/ladder-admin/players
 */
router.get('/players', requireAdminOrModerator, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    // Search by player name
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    
    // Get total count
    const total = await Player.countDocuments(filter);
    
    // Get players
    const players = await Player.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username');
    
    res.json({
      players,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting players:', error);
    res.status(500).json({ error: 'Failed to get players' });
  }
});

/**
 * Delete a match
 * DELETE /api/ladder-admin/matches/:id
 */
router.delete('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Delete match
    await match.remove();
    
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

/**
 * Update a match
 * PUT /api/ladder-admin/matches/:id
 */
router.put('/matches/:id', requireAdminOrModerator, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Update match fields
    const { status, winner, matchType, mapId, resourceLevel } = req.body;
    
    if (status) match.status = status;
    if (winner) match.winner = winner;
    if (matchType) match.matchType = matchType;
    if (mapId) match.mapId = mapId;
    if (resourceLevel) match.resourceLevel = resourceLevel;
    
    // Save match
    await match.save();
    
    res.json({ message: 'Match updated successfully', match });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

/**
 * Update a player
 * PUT /api/ladder-admin/players/:id
 */
router.put('/players/:id', requireAdmin, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Update player fields
    const { name, mmr, rank } = req.body;
    
    if (name) player.name = name;
    if (mmr !== undefined) player.mmr = mmr;
    if (rank) player.rank = rank;
    
    // Save player
    await player.save();
    
    res.json({ message: 'Player updated successfully', player });
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

/**
 * Get MMR calculator settings
 * GET /api/ladder-admin/mmr-settings
 */
router.get('/mmr-settings', requireAdminOrModerator, async (req, res) => {
  try {
    // Get MMR settings from config
    const mmrSettings = {
      baseMMRGain: 25,
      baseMMRLoss: 25,
      kFactor: 32,
      uncertaintyFactor: 0.5
    };
    
    res.json(mmrSettings);
  } catch (error) {
    console.error('Error getting MMR settings:', error);
    res.status(500).json({ error: 'Failed to get MMR settings' });
  }
});

/**
 * Update MMR calculator settings
 * PUT /api/ladder-admin/mmr-settings
 */
router.put('/mmr-settings', requireAdmin, async (req, res) => {
  try {
    // Update MMR settings in config
    const { baseMMRGain, baseMMRLoss, kFactor, uncertaintyFactor } = req.body;
    
    // Validate settings
    if (baseMMRGain < 1 || baseMMRGain > 100) {
      return res.status(400).json({ error: 'Base MMR gain must be between 1 and 100' });
    }
    
    if (baseMMRLoss < 1 || baseMMRLoss > 100) {
      return res.status(400).json({ error: 'Base MMR loss must be between 1 and 100' });
    }
    
    if (kFactor < 1 || kFactor > 100) {
      return res.status(400).json({ error: 'K-factor must be between 1 and 100' });
    }
    
    if (uncertaintyFactor < 0 || uncertaintyFactor > 1) {
      return res.status(400).json({ error: 'Uncertainty factor must be between 0 and 1' });
    }
    
    // Save settings to config (placeholder for now)
    const mmrSettings = {
      baseMMRGain,
      baseMMRLoss,
      kFactor,
      uncertaintyFactor
    };
    
    res.json({ message: 'MMR settings updated successfully', settings: mmrSettings });
  } catch (error) {
    console.error('Error updating MMR settings:', error);
    res.status(500).json({ error: 'Failed to update MMR settings' });
  }
});

/**
 * Get system logs
 * GET /api/ladder-admin/logs
 */
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    // Placeholder for system logs
    const logs = [
      { level: 'info', message: 'System started', timestamp: new Date() },
      { level: 'warning', message: 'High server load detected', timestamp: new Date() },
      { level: 'error', message: 'Database connection error', timestamp: new Date() }
    ];
    
    res.json(logs);
  } catch (error) {
    console.error('Error getting system logs:', error);
    res.status(500).json({ error: 'Failed to get system logs' });
  }
});

/**
 * Check for orphaned players
 * GET /api/ladder-admin/orphaned-players
 */
router.get('/orphaned-players', requireAdminOrModerator, async (req, res) => {
  try {
    const PlayerService = require('../services/playerService');
    
    const orphanedPlayers = await PlayerService.findOrphanedPlayers();
    
    res.json({
      count: orphanedPlayers.length,
      players: orphanedPlayers.map(player => ({
        id: player._id,
        name: player.name,
        mmr: player.mmr,
        deletedUserId: player.user,
        claimedAt: player.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error finding orphaned players:', error);
    res.status(500).json({ error: 'Failed to find orphaned players' });
  }
});

/**
 * Clean up orphaned players
 * POST /api/ladder-admin/cleanup-orphaned-players
 */
router.post('/cleanup-orphaned-players', requireAdmin, async (req, res) => {
  try {
    const PlayerService = require('../services/playerService');
    
    const result = await PlayerService.cleanupOrphanedPlayers();
    
    res.json({
      message: 'Orphaned players cleanup completed',
      result: {
        found: result.found,
        cleaned: result.cleaned,
        cleanedPlayers: result.orphanedPlayers
      }
    });
  } catch (error) {
    console.error('Error cleaning up orphaned players:', error);
    res.status(500).json({ error: 'Failed to cleanup orphaned players' });
  }
});

module.exports = router;
