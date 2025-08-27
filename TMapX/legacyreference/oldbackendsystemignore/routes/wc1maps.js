const express = require('express');
const router = express.Router();
const War1Map = require('../models/War1Map');
const { ensureAuthenticated } = require('../middleware/auth');

/**
 * GET /api/wc1maps - Get all War1 maps with ratings
 */
router.get('/', async (req, res) => {
  try {
    console.log('🗡️ API Request: GET /wc1maps');
    
    const { category } = req.query;
    
    // Build filter
    let filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    // Get scenarios with rating data
    const scenarios = await War1Map.find(filter)
      .sort({ displayOrder: 1 })
      .populate({
        path: 'ratings.userId',
        select: 'username displayName'
      })
      .lean();

    console.log(`✅ Found ${scenarios.length} War1 scenarios`);
    
    res.json({
      success: true,
      data: scenarios,
      total: scenarios.length
    });
  } catch (error) {
    console.error('❌ Error fetching War1 scenarios:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch War1 scenarios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/wc1maps/stats - Get War1 scenario statistics
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 API Request: GET /wc1maps/stats');
    
    // Get total scenario count
    const totalScenarios = await War1Map.countDocuments();
    
    // Get scenarios with ratings (for recent activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Count scenarios rated in the last 30 days
    const recentActivity = await War1Map.countDocuments({
      'ratings.date': { $gte: thirtyDaysAgo }
    });
    
    console.log(`📊 War1 Stats: ${totalScenarios} total scenarios, ${recentActivity} recent activity`);
    
    res.json({
      totalMaps: totalScenarios,
      currentGameMaps: totalScenarios,
      recentUploads: recentActivity,
      scenarioCount: totalScenarios
    });
    
  } catch (error) {
    console.error('❌ Error getting War1 scenario stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/wc1maps/:id - Get specific scenario with ratings
 */
router.get('/:id', async (req, res) => {
  try {
    const scenario = await War1Map.findById(req.params.id)
      .populate({
        path: 'ratings.userId',
        select: 'username displayName'
      })
      .lean();

    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'War1 scenario not found'
      });
    }

    res.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('❌ Error fetching War1 scenario:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch War1 scenario'
    });
  }
});

/**
 * GET /api/wc1maps/:id/ratings - Get ratings for a specific scenario
 */
router.get('/:id/ratings', async (req, res) => {
  try {
    const scenario = await War1Map.findById(req.params.id)
      .populate({
        path: 'ratings.userId',
        select: 'username displayName'
      })
      .lean();

    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'War1 scenario not found'
      });
    }

    // Sort ratings by date (newest first)
    const sortedRatings = scenario.ratings.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        scenarioId: scenario._id,
        ratings: sortedRatings,
        averageRating: scenario.averageRating,
        ratingCount: scenario.ratingCount
      }
    });
  } catch (error) {
    console.error('❌ Error fetching War1 scenario ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scenario ratings'
    });
  }
});

/**
 * POST /api/wc1maps/:id/rate - Rate a War1 scenario
 */
router.post('/:id/rate', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id; // Use actual authenticated user
    const { rating, comment = '' } = req.body;
    
    console.log(`⭐ User ${req.user.username} rating War1 scenario ${req.params.id}: ${rating}/5`);

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const scenarioId = req.params.id;
    const scenario = await War1Map.findById(scenarioId);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'War1 scenario not found'
      });
    }

    // Add or update rating
    await scenario.addRating({
      userId,
      rating: Number(rating),
      comment
    });

    // Return updated scenario with populated ratings
    const updatedScenario = await War1Map.findById(scenarioId)
      .populate({
        path: 'ratings.userId',
        select: 'username displayName'
      })
      .lean();

    console.log(`✅ War1 scenario rated: ${scenario.name} - ${rating}/5 stars`);

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: updatedScenario
    });
  } catch (error) {
    console.error('❌ Error rating War1 scenario:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating'
    });
  }
});

/**
 * DELETE /api/wc1maps/:id/rate - Remove rating from War1 scenario
 */
router.delete('/:id/rate', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id; // Use actual authenticated user

    const scenarioId = req.params.id;
    const scenario = await War1Map.findById(scenarioId);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'War1 scenario not found'
      });
    }

    // Remove rating
    await scenario.removeRating(userId);

    // Return updated scenario with populated ratings
    const updatedScenario = await War1Map.findById(scenarioId)
      .populate({
        path: 'ratings.userId',
        select: 'username displayName'
      })
      .lean();

    console.log(`✅ Rating removed from War1 scenario: ${scenario.name}`);

    res.json({
      success: true,
      message: 'Rating removed successfully',
      data: updatedScenario
    });
  } catch (error) {
    console.error('❌ Error removing War1 scenario rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove rating'
    });
  }
});

/**
 * POST /api/wc1maps/init - Initialize War1 scenarios in database
 */
router.post('/init', async (req, res) => {
  try {
    // Import scenarios data
    const { scenarios } = require('../scripts/seedWar1Maps');
    
    console.log('🔄 Initializing War1 scenarios...');
    
    // Check if scenarios already exist
    const existingCount = await War1Map.countDocuments();
    
    if (existingCount > 0) {
      return res.json({
        success: true,
        message: `War1 scenarios already initialized (${existingCount} scenarios exist)`,
        data: { count: existingCount, action: 'skipped' }
      });
    }
    
    // Clear any existing data and insert fresh scenarios
    await War1Map.deleteMany({});
    const result = await War1Map.insertMany(scenarios);
    
    console.log(`✅ Successfully initialized ${result.length} War1 scenarios`);
    
    res.json({
      success: true,
      message: `Successfully initialized ${result.length} War1 scenarios`,
      data: { count: result.length, action: 'created' }
    });
  } catch (error) {
    console.error('❌ Error initializing War1 scenarios:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize War1 scenarios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



module.exports = router; 