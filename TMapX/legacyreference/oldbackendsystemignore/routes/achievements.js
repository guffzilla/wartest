const express = require('express');
const router = express.Router();
const AchievementService = require('../services/achievementService');
const achievementsConfig = require('../config/achievements');
const { ensureAuthenticated } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication Middleware for achievements routes
router.use(async (req, res, next) => {
  // Skip if already authenticated via session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check for JWT token in multiple places: Authorization header, cookie, or query param
  let authToken = req.cookies?.authToken || 
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.query.authToken;
                  
  if (authToken) {
    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded.type === 'web') {
        // Get fresh user data from database
        const user = await User.findById(decoded.userId).select('-password');
        if (user) {
          // Set user on request object (similar to passport)
          req.user = user;
          console.log(`🔐 Achievements route JWT authenticated user: ${user.username}`);
        }
      }
    } catch (error) {
      console.log(`🔐 Achievements route JWT auth failed: ${error.message}`);
      // Clear invalid cookie
      res.clearCookie('authToken');
    }
  }
  
  next();
});


// Destructure the functions we need
const { 
  getAllAchievements, 
  getAchievementById, 
  getAchievementsByType 
} = achievementsConfig;

/**
 * @route   GET /api/achievements
 * @desc    Get all available achievements
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    const { excludeCampaign } = req.query;
    let achievements = getAllAchievements();
    
    // Filter out campaign achievements if requested
    if (excludeCampaign === 'true') {
      achievements = achievements.filter(achievement => {
        const id = achievement.id.toLowerCase();
        // Exclude campaign-related achievements
        return !id.includes('campaign') && 
               !id.includes('wc1_human') && 
               !id.includes('wc1_orc') && 
               !id.includes('wc2_human') && 
               !id.includes('wc2_orc') && 
               !id.includes('wc3_roc') && 
               !id.includes('wc3_tft') && 
               !id.includes('wc2_btdp') &&
               !id.includes('completionist') &&
               !id.includes('warcraft_master') &&
               achievement.category !== 'campaign';
      });
    }
    
    res.json(achievements);
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/achievements/campaign
 * @desc    Get only campaign-related achievements
 * @access  Public
 */
router.get('/campaign', (req, res) => {
  try {
    const allAchievements = getAllAchievements();
    const campaignAchievements = allAchievements.filter(achievement => {
      const id = achievement.id.toLowerCase();
      // Include only campaign-related achievements
      return id.includes('campaign') || 
             id.includes('wc1_human') || 
             id.includes('wc1_orc') || 
             id.includes('wc2_human') || 
             id.includes('wc2_orc') || 
             id.includes('wc3_roc') || 
             id.includes('wc3_tft') || 
             id.includes('wc2_btdp') ||
             id.includes('completionist') ||
             id.includes('warcraft_master') ||
             achievement.category === 'campaign';
    });
    
    res.json(campaignAchievements);
  } catch (error) {
    console.error('Error getting campaign achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get all achievement definitions
 * Used by frontend to load achievement metadata
 */
router.get('/definitions', (req, res) => {
  try {
    const achievements = getAllAchievements();
    res.json(achievements);
  } catch (error) {
    console.error('❌ Error fetching achievement definitions:', error);
    res.status(500).json({ error: 'Failed to fetch achievement definitions' });
  }
});

/**
 * @route   GET /api/achievements/me
 * @desc    Get current user's achievements
 * @access  Private
 */
router.get('/me', ensureAuthenticated, async (req, res) => {
  try {
    const achievements = await AchievementService.getUserAchievements(req.user.id);
    res.json(achievements);
  } catch (error) {
    console.error('Error getting user achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/achievements/user/:userId
 * @desc    Get specific user's achievements
 * @access  Private
 */
router.get('/user/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const achievements = await AchievementService.getUserAchievements(userId);
    res.json(achievements);
  } catch (error) {
    console.error('Error getting user achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/achievements/:id/award
 * @desc    Award an achievement to the current user (for testing purposes)
 * @access  Private
 */
router.post('/:id/award', ensureAuthenticated, async (req, res) => {
  try {
    const { user, newAchievements } = await AchievementService.awardAchievement(
      req.user.id,
      req.params.id
    );
    
    res.json({ 
      success: true, 
      newAchievements,
      arenaGold: user.arenaGold
    });
  } catch (error) {
    console.error('Error awarding achievement:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @route   POST /api/achievements/seen
 * @desc    Mark achievements as seen by the user
 * @access  Private
 */
router.post('/seen', ensureAuthenticated, async (req, res) => {
  try {
    const { achievementIds } = req.body;
    
    if (!Array.isArray(achievementIds)) {
      return res.status(400).json({ message: 'achievementIds must be an array' });
    }
    
    await AchievementService.markAsSeen(req.user.id, achievementIds);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking achievements as seen:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/achievements/:id/progress
 * @desc    Update progress for an incremental achievement
 * @access  Private
 */
router.post('/:id/progress', ensureAuthenticated, async (req, res) => {
  try {
    const { amount = 1 } = req.body;
    
    const { user, newAchievements } = await AchievementService.updateAchievementProgress(
      req.user.id,
      req.params.id,
      amount
    );
    
    res.json({ 
      success: true, 
      newAchievements,
      arenaGold: user.arenaGold
    });
  } catch (error) {
    console.error('Error updating achievement progress:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;
