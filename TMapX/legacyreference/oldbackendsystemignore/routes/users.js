const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const AchievementService = require('../services/achievementService');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ForumTopic = require('../models/ForumTopic');
const ForumPost = require('../models/ForumPost');
const Tournament = require('../models/Tournament');
const War1Map = require('../models/War1Map');
const War2Map = require('../models/War2Map');
// Use existing War3Map model (defined in war3maps.js)
const War3Map = mongoose.model('War3Map');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user._id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Import UserService for optimized user operations
const UserService = require('../services/userService');

/**
 * Get current user profile
 * GET /api/users/me
 */
router.get('/me', ensureAuthenticated, async (req, res) => {
  try {
    const user = await UserService.getCurrentUser(req);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Award test achievement for visiting profile
    try {
      await AchievementService.awardAchievement(user._id, 'test_visit_profile');
    } catch (error) {
      console.log('Could not award test achievement (may already be awarded):', error.message);
    }

    // Ensure role is included for permission checks
    if (!user.role) {
      user.role = 'user'; // Default role if not set
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

/**
 * Get current user profile (alternative route)
 * GET /api/users/profile
 */
router.get('/profile', ensureAuthenticated, async (req, res) => {
  console.log('🔍 /users/profile route called');
  try {
    const user = await UserService.getCurrentUser(req);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName || user.username || 'User',
      avatar: user.avatar || '/assets/img/ranks/emblem.png',
      bio: user.bio || '',
      role: user.role || 'user',
      socialLinks: user.socialLinks || { youtube: '', twitch: '' },
      profile: user.profile || {},
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } catch (err) {
    console.error('Error getting user profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get current user status (alternative route)
 * GET /api/users/status
 */
router.get('/status', ensureAuthenticated, async (req, res) => {
  console.log('🔍 /users/status route called');
  try {
    const user = await UserService.getCurrentUser(req, {
      select: 'username email role avatar lastLogin'
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      avatar: user.avatar || '/assets/img/ranks/emblem.png',
      lastLogin: user.lastLogin,
      isAuthenticated: true
    });
  } catch (err) {
    console.error('Error getting user status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update user profile
 * PUT /api/users/me
 */
router.put('/me', ensureAuthenticated, async (req, res) => {
  try {
    let { 
      username, 
      email, 
      avatar, 
      bio,
      age,
      gender,
      country,
      favorite_game,
      favorite_race,
      favorite_strategy,
      first_played
    } = req.body;
    
    const user = await User.findById(req.user._id);

    // Update basic fields
    if (username) {
      username = username.toUpperCase(); // Convert to uppercase
      user.username = username;
    }
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    // Initialize profile object if it doesn't exist
    if (!user.profile) {
      user.profile = {};
    }
    if (!user.profile.warcraftPreferences) {
      user.profile.warcraftPreferences = {};
    }

    // Update profile fields
    if (age !== undefined) user.profile.age = age;
    if (gender !== undefined) user.profile.gender = gender;
    if (country !== undefined) user.profile.country = country;
    
    // Update Warcraft preferences
    if (favorite_game !== undefined) user.profile.warcraftPreferences.favoriteGame = favorite_game;
    if (favorite_race !== undefined) user.profile.warcraftPreferences.favoriteRace = favorite_race;
    if (favorite_strategy !== undefined) user.profile.warcraftPreferences.favoriteStrategy = favorite_strategy;
    if (first_played !== undefined) {
      user.profile.warcraftPreferences.firstPlayed = first_played ? new Date(first_played) : null;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});



/**
 * Upload user avatar
 * POST /api/users/me/avatar
 */
router.post('/me/avatar', ensureAuthenticated, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user's avatar path
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarPath;
    await user.save();

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarPath,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

/**
 * Delete user account and all related data
 * DELETE /api/users/delete-account
 */
router.delete('/delete-account', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const UserDeletionService = require('../services/userDeletionService');
    
    console.log(`🗑️ Starting deletion process for user: ${userId}`);
    
    // Use the deletion service to handle all cleanup
    const result = await UserDeletionService.deleteUserAndCleanup(userId);
    
    console.log(`✅ User deletion completed successfully: ${userId}`);
    
    // Log out the user by destroying the session
    req.logout((err) => {
      if (err) {
        console.error('Error during logout:', err);
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Account deleted successfully',
      cleanup: result
    });
    
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete account: ' + error.message 
    });
  }
});

/**
 * Save user profile layout
 * POST /api/users/profile/layout
 */
router.post('/profile/layout', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const layoutData = req.body;
    
    console.log(`💾 Saving profile layout for user: ${userId}`);
    console.log(`📊 Layout data received:`, JSON.stringify(layoutData, null, 2));
    
    // Validate layout data
    if (!layoutData || !layoutData.sections || !Array.isArray(layoutData.sections)) {
      console.log('❌ Invalid layout data received');
      return res.status(400).json({ error: 'Invalid layout data' });
    }
    
    // Find and update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize profile object if it doesn't exist
    if (!user.profile) {
      user.profile = {};
    }
    
    // Save layout data
    user.profile.layout = {
      sections: layoutData.sections,
      timestamp: new Date(),
      version: '1.0'
    };
    
    console.log(`💾 About to save user with layout:`, {
      userId,
      hasProfile: !!user.profile,
      hasLayout: !!user.profile.layout,
      layoutSectionCount: user.profile.layout ? user.profile.layout.sections.length : 0
    });
    
    const saveResult = await user.save();
    
    console.log(`💾 Save result:`, {
      acknowledged: !!saveResult,
      modifiedCount: saveResult.modifiedCount || 'N/A',
      upsertedCount: saveResult.upsertedCount || 'N/A'
    });
    
    // Verify the save worked by re-fetching the user
    const verifyUser = await User.findById(userId);
    console.log(`🔍 Verification check - user profile after save:`, {
      hasProfile: !!verifyUser.profile,
      hasLayout: !!(verifyUser.profile && verifyUser.profile.layout),
      profileKeys: verifyUser.profile ? Object.keys(verifyUser.profile) : 'no profile'
    });
    
    console.log(`✅ Profile layout saved successfully for user: ${userId}`);
    res.json({ success: true, message: 'Layout saved successfully' });
    
  } catch (error) {
    console.error('Error saving profile layout:', error);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

/**
 * Get user profile layout
 * GET /api/users/profile/layout
 */
router.get('/profile/layout', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`📖 Loading profile layout for user: ${userId}`);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`🔍 User profile structure:`, {
      hasProfile: !!user.profile,
      hasLayout: !!(user.profile && user.profile.layout),
      profileKeys: user.profile ? Object.keys(user.profile) : 'no profile'
    });
    
    // Show the entire user profile for debugging
    console.log(`🔍 Full user profile:`, user.profile);
    
    // Return layout data if it exists
    if (user.profile && user.profile.layout) {
      console.log(`✅ Profile layout found for user: ${userId}`);
      console.log(`📊 Layout data:`, JSON.stringify(user.profile.layout, null, 2));
      res.json(user.profile.layout);
    } else {
      console.log(`ℹ️ No profile layout found for user: ${userId}`);
      res.json(null); // No layout saved yet
    }
    
  } catch (error) {
    console.error('Error loading profile layout:', error);
    res.status(500).json({ error: 'Failed to load layout' });
  }
});

/**
 * Get user forum activity
 * GET /api/users/:userId/forum-activity
 */
router.get('/:userId/forum-activity', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate that the userId is a valid ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'The user ID provided is not in a valid format.'
      });
    }

    // Get topics created by the user
    const topics = await ForumTopic.find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get posts created by the user
    const posts = await ForumPost.find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('topic', 'title')
      .lean();

    res.json({
      topics,
      posts
    });
  } catch (err) {
    console.error('Error getting user forum activity:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user maps
 * GET /api/users/:userId/maps
 */
router.get('/:userId/maps', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate that the userId is a valid ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'The user ID provided is not in a valid format.'
      });
    }

    // Get maps from all game types
    const [war1Maps, war2Maps, war3Maps] = await Promise.all([
      War1Map.find({ uploadedBy: userId }).sort({ uploadedAt: -1 }).limit(50).lean(),
      War2Map.find({ uploadedBy: userId }).sort({ uploadedAt: -1 }).limit(50).lean(),
      War3Map.find({ uploadedBy: userId }).sort({ uploadedAt: -1 }).limit(50).lean()
    ]);

    // Combine and format maps
    const allMaps = [
      ...war1Maps.map(map => ({ ...map, gameType: 'wc1' })),
      ...war2Maps.map(map => ({ ...map, gameType: 'wc2' })),
      ...war3Maps.map(map => ({ ...map, gameType: 'wc3' }))
    ].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json(allMaps);
  } catch (err) {
    console.error('Error getting user maps:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user tournaments
 * GET /api/users/:userId/tournaments
 */
router.get('/:userId/tournaments', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate that the userId is a valid ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'The user ID provided is not in a valid format.'
      });
    }

    // Get tournaments where user is a participant
    const tournaments = await Tournament.find({
      'participants.userId': userId
    })
    .sort({ startDate: -1 })
    .limit(50)
    .lean();

    res.json(tournaments);
  } catch (err) {
    console.error('Error getting user tournaments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user achievements
 * GET /api/users/:userId/achievements
 */
router.get('/:userId/achievements', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate that the userId is a valid ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'The user ID provided is not in a valid format.'
      });
    }

    // Get user with achievements
    const user = await User.findById(userId).select('achievements');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all available achievements from config
    const { getAllAchievements, getAchievementById } = require('../config/achievements');
    const allAchievements = getAllAchievements();

    // Map user achievements with full achievement data
    const userAchievements = user.achievements.completed.map(completed => {
      const achievement = getAchievementById(completed.achievementId);
      return {
        ...achievement,
        earnedAt: completed.earnedAt
      };
    }).filter(achievement => achievement && achievement.id); // Filter out any achievements that weren't found

    res.json({
      completed: userAchievements,
      progress: user.achievements.progress,
      totalUnlocked: user.achievements.totalUnlocked,
      totalPointsEarned: user.achievements.totalPointsEarned
    });
  } catch (err) {
    console.error('Error getting user achievements:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user forum activity
 * GET /api/users/:userId/forum-activity
 */
router.get('/:userId/forum-activity', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate that the userId is a valid ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'The user ID provided is not in a valid format.'
      });
    }

    // Get topics created by the user
    const topics = await ForumTopic.find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get posts created by the user
    const posts = await ForumPost.find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('topic', 'title')
      .lean();

    res.json({
      topics,
      posts
    });
  } catch (err) {
    console.error('Error getting user forum activity:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



/**
 * Get user tournaments
 * GET /api/users/:userId/tournaments
 */
router.get('/:userId/tournaments', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate that the userId is a valid ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'The user ID provided is not in a valid format.'
      });
    }

    // Get tournaments where user is a participant
    const tournaments = await Tournament.find({
      'participants.userId': userId
    })
    .sort({ startDate: -1 })
    .limit(50)
    .lean();

    res.json(tournaments);
  } catch (err) {
    console.error('Error getting user tournaments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user achievements
 * GET /api/users/:userId/achievements
 */
router.get('/:userId/achievements', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate that the userId is a valid ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'The user ID provided is not in a valid format.'
      });
    }

    // Get user with achievements
    const user = await User.findById(userId).select('achievements');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all available achievements from config
    const { getAllAchievements, getAchievementById } = require('../config/achievements');
    const allAchievements = getAllAchievements();

    // Map user achievements with full achievement data
    const userAchievements = user.achievements.completed.map(completed => {
      const achievement = getAchievementById(completed.achievementId);
      return {
        ...achievement,
        earnedAt: completed.earnedAt
      };
    }).filter(achievement => achievement && achievement.id); // Filter out any achievements that weren't found

    res.json({
      completed: userAchievements,
      progress: user.achievements.progress,
      totalUnlocked: user.achievements.totalUnlocked,
      totalPointsEarned: user.achievements.totalPointsEarned
    });
  } catch (err) {
    console.error('Error getting user achievements:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user by ID
 * GET /api/users/:id
 */
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;