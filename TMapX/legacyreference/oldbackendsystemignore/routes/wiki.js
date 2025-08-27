const express = require('express');
const router = express.Router();
const GameUnit = require('../models/GameUnit');
const WikiEdit = require('../models/WikiEdit');
const WikiContribution = require('../models/WikiContribution');
const WikiService = require('../services/wikiService');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ===============================
// WIKI EDITING ROUTES
// ===============================

/**
 * POST /api/wiki/edit
 * Submit a wiki edit
 */
router.post('/edit', authenticate, async (req, res) => {
  try {
    const { gameUnitId, editData } = req.body;
    
    if (!gameUnitId || !editData) {
      return res.status(400).json({
        success: false,
        error: 'Game unit ID and edit data are required'
      });
    }

    if (!editData.summary || editData.summary.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Edit summary is required'
      });
    }

    const result = await WikiService.submitEdit(req.user._id, gameUnitId, editData);
    
    res.json(result);
  } catch (error) {
    console.error('Error submitting wiki edit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit wiki edit'
    });
  }
});

/**
 * GET /api/wiki/edits/pending
 * Get pending edits for moderation (admin only)
 */
router.get('/edits/pending', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, game } = req.query;
    
    const result = await WikiService.getPendingEdits({
      page: parseInt(page),
      limit: parseInt(limit),
      game
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting pending edits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending edits'
    });
  }
});

/**
 * POST /api/wiki/moderate/:editId
 * Moderate a wiki edit (admin only)
 */
router.post('/moderate/:editId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { editId } = req.params;
    const { action, reason } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "approve" or "reject"'
      });
    }

    if (action === 'reject' && !reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required when rejecting an edit'
      });
    }

    const result = await WikiService.moderateEdit(editId, req.user._id, action, reason);
    
    res.json({
      success: true,
      data: result,
      message: `Edit ${action}d successfully`
    });
  } catch (error) {
    console.error('Error moderating wiki edit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to moderate wiki edit'
    });
  }
});

/**
 * POST /api/wiki/vote/:editId
 * Vote on a wiki edit
 */
router.post('/vote/:editId', authenticate, async (req, res) => {
  try {
    const { editId } = req.params;
    const { voteType } = req.body;
    
    if (!['helpful', 'unhelpful'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'Vote type must be either "helpful" or "unhelpful"'
      });
    }

    const result = await WikiService.voteOnEdit(editId, req.user._id, voteType);
    
    res.json({
      success: true,
      data: result,
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    console.error('Error voting on wiki edit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record vote'
    });
  }
});

/**
 * GET /api/wiki/history/:gameUnitId
 * Get edit history for a game unit
 */
router.get('/history/:gameUnitId', async (req, res) => {
  try {
    const { gameUnitId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    
    const result = await WikiService.getEditHistory(gameUnitId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting edit history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get edit history'
    });
  }
});

/**
 * GET /api/wiki/contributions/:userId
 * Get user's wiki contribution stats
 */
router.get('/contributions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await WikiService.getUserContributionStats(userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting contribution stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contribution stats'
    });
  }
});

/**
 * GET /api/wiki/contributions
 * Get current user's wiki contribution stats
 */
router.get('/contributions', authenticate, async (req, res) => {
  try {
    const result = await WikiService.getUserContributionStats(req.user._id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting user contribution stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contribution stats'
    });
  }
});

// ===============================
// GAME UNIT ROUTES (Enhanced)
// ===============================

/**
 * GET /api/wiki/units/:game/:race
 * Get game units with edit information
 */
router.get('/units/:game/:race', async (req, res) => {
  try {
    const { game, race } = req.params;
    const { type = 'unit' } = req.query;

    const units = await GameUnit.find({
      game: game.toLowerCase(),
      race: race.toLowerCase(),
      type: type.toLowerCase()
    }).sort({ name: 1 });

    // Add edit information for each unit
    const unitsWithEditInfo = await Promise.all(
      units.map(async (unit) => {
        const unitObj = unit.toObject();
        
        // Get recent edit count
        const recentEditCount = await WikiEdit.countDocuments({
          gameUnit: unit._id,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        });
        
        // Get pending edit count
        const pendingEditCount = await WikiEdit.countDocuments({
          gameUnit: unit._id,
          status: 'pending'
        });
        
        unitObj.editInfo = {
          recentEdits: recentEditCount,
          pendingEdits: pendingEditCount,
          lastUpdated: unit.lastUpdated
        };
        
        return unitObj;
      })
    );

    res.json({
      success: true,
      data: unitsWithEditInfo,
      count: unitsWithEditInfo.length
    });
  } catch (error) {
    console.error('Error fetching game units with edit info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game units'
    });
  }
});

/**
 * GET /api/wiki/unit/:id
 * Get a specific game unit with edit history
 */
router.get('/unit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const unit = await GameUnit.findById(id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        error: 'Game unit not found'
      });
    }

    // Get recent edit history
    const editHistory = await WikiService.getEditHistory(id, {
      page: 1,
      limit: 10,
      status: 'approved'
    });

    res.json({
      success: true,
      data: {
        unit,
        recentEdits: editHistory.edits,
        editCount: editHistory.pagination.total
      }
    });
  } catch (error) {
    console.error('Error fetching game unit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game unit'
    });
  }
});

// ===============================
// LEADERBOARD ROUTES
// ===============================

/**
 * GET /api/wiki/leaderboard
 * Get wiki contribution leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'total', game, limit = 20 } = req.query;
    
    let sortField = 'stats.totalEdits';
    switch (type) {
      case 'approved':
        sortField = 'stats.approvedEdits';
        break;
      case 'quality':
        sortField = 'stats.averageQualityScore';
        break;
      case 'reputation':
        sortField = 'reputation.score';
        break;
      case 'helpful':
        sortField = 'stats.totalHelpfulVotes';
        break;
    }

    const query = {};
    // TODO: Add game filtering if needed
    
    const leaderboard = await WikiContribution.find(query)
      .populate('user', 'username avatar')
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error getting wiki leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wiki leaderboard'
    });
  }
});

module.exports = router;