const express = require('express');
const router = express.Router();
const WC1Scenario = require('../models/WC1Scenario');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

/**
 * GET /api/wc1scenarios - Get all WC1 scenarios with ratings
 */
router.get('/', async (req, res) => {
  try {
    console.log('🗡️ API Request: GET /wc1scenarios');
    
    const { category, sort } = req.query;
    
    // Build query filter
    const filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    // Build sort options
    let sortOptions = { displayOrder: 1 }; // Default sort by display order
    if (sort === 'highest-rated') {
      sortOptions = { averageRating: -1, ratingCount: -1 };
    } else if (sort === 'most-reviewed') {
      sortOptions = { ratingCount: -1, averageRating: -1 };
    }
    
    const scenarios = await WC1Scenario.find(filter)
      .sort(sortOptions)
      .lean();
    
    console.log(`📊 Found ${scenarios.length} WC1 scenarios`);
    res.json(scenarios);
    
  } catch (error) {
    console.error('❌ Error fetching WC1 scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

/**
 * GET /api/wc1scenarios/:id - Get specific scenario with ratings
 */
router.get('/:id', async (req, res) => {
  try {
    const scenario = await WC1Scenario.findById(req.params.id)
      .populate('ratings.userId', 'username')
      .lean();
    
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    res.json(scenario);
    
  } catch (error) {
    console.error('❌ Error fetching scenario:', error);
    res.status(500).json({ error: 'Failed to fetch scenario' });
  }
});

/**
 * GET /api/wc1scenarios/:id/ratings - Get ratings for a specific scenario
 */
router.get('/:id/ratings', async (req, res) => {
  try {
    const scenario = await WC1Scenario.findById(req.params.id)
      .populate('ratings.userId', 'username')
      .lean();
    
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    // Sort ratings by date (newest first)
    const sortedRatings = scenario.ratings.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    res.json({
      ratings: sortedRatings,
      averageRating: scenario.averageRating,
      ratingCount: scenario.ratingCount
    });
    
  } catch (error) {
    console.error('❌ Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

/**
 * POST /api/wc1scenarios/:id/rate - Rate a WC1 scenario
 */
router.post('/:id/rate', ensureAuthenticated, async (req, res) => {
  try {
    const { rating, comment = '' } = req.body;
    const scenarioId = req.params.id;
    const userId = req.user._id;
    
    console.log(`⭐ User ${req.user.username} rating scenario ${scenarioId}: ${rating}/5`);
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Find the scenario
    const scenario = await WC1Scenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    // Add/update rating with correct parameter format
    await scenario.addRating({ userId, rating, comment });
    
    console.log(`✅ Rating saved: ${scenario.averageRating.toFixed(1)}/5 (${scenario.ratingCount} reviews)`);
    
    res.json({
      success: true,
      averageRating: scenario.averageRating,
      ratingCount: scenario.ratingCount,
      message: 'Rating saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving rating:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

/**
 * DELETE /api/wc1scenarios/:id/rate - Remove rating from WC1 scenario
 */
router.delete('/:id/rate', ensureAuthenticated, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const userId = req.user._id;
    
    console.log(`🗑️ User ${req.user.username} removing rating from scenario ${scenarioId}`);
    
    // Find the scenario
    const scenario = await WC1Scenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    // Remove rating
    await scenario.removeRating(userId);
    
    console.log(`✅ Rating removed: ${scenario.averageRating.toFixed(1)}/5 (${scenario.ratingCount} reviews)`);
    
    res.json({
      success: true,
      averageRating: scenario.averageRating,
      ratingCount: scenario.ratingCount,
      message: 'Rating removed successfully'
    });
    
  } catch (error) {
    console.error('❌ Error removing rating:', error);
    res.status(500).json({ error: 'Failed to remove rating' });
  }
});

/**
 * GET /api/wc1scenarios/stats - Get WC1 scenario statistics
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 API Request: GET /wc1scenarios/stats');
    
    // Get total scenario count
    const totalScenarios = await WC1Scenario.countDocuments();
    
    // Get scenarios with ratings (for recent activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Count scenarios rated in the last 30 days
    const recentActivity = await WC1Scenario.countDocuments({
      'ratings.date': { $gte: thirtyDaysAgo }
    });
    
    console.log(`📊 WC1 Stats: ${totalScenarios} total scenarios, ${recentActivity} recent activity`);
    
    res.json({
      totalMaps: totalScenarios,
      currentGameMaps: totalScenarios,
      recentUploads: recentActivity,
      scenarioCount: totalScenarios
    });
    
  } catch (error) {
    console.error('❌ Error getting WC1 scenario stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * POST /api/wc1scenarios/init - Initialize WC1 scenarios in database
 * This endpoint populates the database with the 21 classic scenarios
 */
router.post('/init', ensureAuthenticated, async (req, res) => {
  try {
    // Check if user has admin privileges (optional security measure)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    console.log('🔧 Initializing WC1 scenarios database...');
    
    const scenarios = [
      // Forest scenarios (1-7)
      { name: 'Forest 1', category: 'forest', displayOrder: 1, imagePath: '/uploads/war1/Forest_1.webp', description: 'The first forest scenario of the human campaign.' },
      { name: 'Forest 2', category: 'forest', displayOrder: 2, imagePath: '/uploads/war1/Forest_2.webp', description: 'The second forest scenario of the human campaign.' },
      { name: 'Forest 3', category: 'forest', displayOrder: 3, imagePath: '/uploads/war1/Forest_3.webp', description: 'The third forest scenario of the human campaign.' },
      { name: 'Forest 4', category: 'forest', displayOrder: 4, imagePath: '/uploads/war1/Forest_4.webp', description: 'The fourth forest scenario of the human campaign.' },
      { name: 'Forest 5', category: 'forest', displayOrder: 5, imagePath: '/uploads/war1/Forest_5.webp', description: 'The fifth forest scenario of the human campaign.' },
      { name: 'Forest 6', category: 'forest', displayOrder: 6, imagePath: '/uploads/war1/Forest_6.webp', description: 'The sixth forest scenario of the human campaign.' },
      { name: 'Forest 7', category: 'forest', displayOrder: 7, imagePath: '/uploads/war1/Forest_7.webp', description: 'The seventh forest scenario of the human campaign.' },
      
      // Swamp scenarios (8-14)
      { name: 'Swamp 1', category: 'swamp', displayOrder: 8, imagePath: '/uploads/war1/Swamp_1.webp', description: 'The first swamp scenario of the orc campaign.' },
      { name: 'Swamp 2', category: 'swamp', displayOrder: 9, imagePath: '/uploads/war1/Swamp_2.webp', description: 'The second swamp scenario of the orc campaign.' },
      { name: 'Swamp 3', category: 'swamp', displayOrder: 10, imagePath: '/uploads/war1/Swamp_3.webp', description: 'The third swamp scenario of the orc campaign.' },
      { name: 'Swamp 4', category: 'swamp', displayOrder: 11, imagePath: '/uploads/war1/Swamp_4.webp', description: 'The fourth swamp scenario of the orc campaign.' },
      { name: 'Swamp 5', category: 'swamp', displayOrder: 12, imagePath: '/uploads/war1/Swamp_5.webp', description: 'The fifth swamp scenario of the orc campaign.' },
      { name: 'Swamp 6', category: 'swamp', displayOrder: 13, imagePath: '/uploads/war1/Swamp_6.webp', description: 'The sixth swamp scenario of the orc campaign.' },
      { name: 'Swamp 7', category: 'swamp', displayOrder: 14, imagePath: '/uploads/war1/Swamp_7.webp', description: 'The seventh swamp scenario of the orc campaign.' },
      
      // Dungeon scenarios (15-21)
      { name: 'Dungeon 1', category: 'dungeon', displayOrder: 15, imagePath: '/uploads/war1/Dungeon_1.webp', description: 'The first dungeon scenario - underground battles.' },
      { name: 'Dungeon 2', category: 'dungeon', displayOrder: 16, imagePath: '/uploads/war1/Dungeon_2.webp', description: 'The second dungeon scenario - underground battles.' },
      { name: 'Dungeon 3', category: 'dungeon', displayOrder: 17, imagePath: '/uploads/war1/Dungeon_3.webp', description: 'The third dungeon scenario - underground battles.' },
      { name: 'Dungeon 4', category: 'dungeon', displayOrder: 18, imagePath: '/uploads/war1/Dungeon_4.webp', description: 'The fourth dungeon scenario - underground battles.' },
      { name: 'Dungeon 5', category: 'dungeon', displayOrder: 19, imagePath: '/uploads/war1/Dungeon_5.webp', description: 'The fifth dungeon scenario - underground battles.' },
      { name: 'Dungeon 6', category: 'dungeon', displayOrder: 20, imagePath: '/uploads/war1/Dungeon_6.webp', description: 'The sixth dungeon scenario - underground battles.' },
      { name: 'Dungeon 7', category: 'dungeon', displayOrder: 21, imagePath: '/uploads/war1/Dungeon_7.webp', description: 'The seventh and final dungeon scenario - underground battles.' }
    ];
    
    // Clear existing scenarios and insert new ones
    await WC1Scenario.deleteMany({});
    const result = await WC1Scenario.insertMany(scenarios);
    
    console.log(`✅ Initialized ${result.length} WC1 scenarios`);
    
    res.json({
      success: true,
      message: `Initialized ${result.length} WC1 scenarios`,
      scenarios: result.length
    });
    
  } catch (error) {
    console.error('❌ Error initializing scenarios:', error);
    res.status(500).json({ error: 'Failed to initialize scenarios' });
  }
});

module.exports = router; 