const express = require('express');
const router = express.Router();
const { RedditRssService } = require('../services/redditRssService');

// Initialize Reddit RSS service
const redditService = new RedditRssService();

/**
 * GET /api/reddit/feeds/:gameType
 * Get Reddit feeds for a specific game type
 */
router.get('/feeds/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    
    // Validate game type
    if (!['wc1', 'wc2', 'wc3', 'clan'].includes(gameType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game type. Must be wc1, wc2, wc3, or clan'
      });
    }

    console.log(`📡 API request for Reddit feeds: ${gameType}`);
    
    const feeds = await redditService.getRedditFeeds(gameType);
    
    res.json({
      success: true,
      data: feeds
    });

  } catch (error) {
    console.error('❌ Error in Reddit feeds API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Reddit feeds',
      details: error.message
    });
  }
});

/**
 * GET /api/reddit/feeds
 * Get Reddit feeds for all game types (defaults to wc2)
 */
router.get('/feeds', async (req, res) => {
  try {
    const gameType = req.query.gameType || 'wc2';
    
    console.log(`📡 API request for Reddit feeds (query): ${gameType}`);
    
    const feeds = await redditService.getRedditFeeds(gameType);
    
    res.json({
      success: true,
      data: feeds
    });

  } catch (error) {
    console.error('❌ Error in Reddit feeds API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Reddit feeds',
      details: error.message
    });
  }
});

/**
 * GET /api/reddit/stats
 * Get aggregated Reddit statistics across all games
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 API request for Reddit stats');
    
    const stats = await redditService.getRedditStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error in Reddit stats API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Reddit stats',
      details: error.message
    });
  }
});

/**
 * POST /api/reddit/refresh
 * Manually refresh Reddit feeds cache
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual Reddit cache refresh requested');
    
    // Clear cache
    redditService.clearCache();
    
    // Pre-fetch all game types to warm cache
    const [wc1, wc2, wc3, clan] = await Promise.all([
      redditService.getRedditFeeds('wc1'),
      redditService.getRedditFeeds('wc2'),
      redditService.getRedditFeeds('wc3'),
      redditService.getRedditFeeds('clan')
    ]);

    res.json({
      success: true,
      message: 'Reddit feeds refreshed successfully',
      data: {
        wc1: wc1.totalPosts,
        wc2: wc2.totalPosts,
        wc3: wc3.totalPosts,
        clan: clan.totalPosts,
        refreshedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error refreshing Reddit feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh Reddit feeds',
      details: error.message
    });
  }
});

module.exports = router;