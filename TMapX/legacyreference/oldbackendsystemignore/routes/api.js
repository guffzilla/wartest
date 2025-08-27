const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const OnlineUser = require('../models/OnlineUser');
const { authenticate } = require('../middleware/auth');

// Add request logging for all API routes
router.use((req, res, next) => {
  console.log(`🌐 API Request: ${req.method} ${req.path} from ${req.ip}`);
  if (req.user) {
    console.log(`👤 Authenticated user: ${req.user.username}`);
  } else {
    console.log(`🔒 Unauthenticated request`);
  }
  next();
});



// Use consolidated authentication middleware
const isAuthenticated = authenticate;

// GET /api/health - simple health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// POST /api/game-results - report game result from AI analysis
router.post('/game-results', isAuthenticated, async (req, res) => {
  try {
    const { 
      game, 
      gameType, 
      result, 
      confidence, 
      screenshot, 
      timestamp, 
      analysis,
      source,
      players,
      matchData
    } = req.body;
    const user = req.user;
    
    console.log(`🎯 Game result reported by ${user.username}: ${result} in ${game} (${confidence}% confidence) via ${source || 'unknown'}`);
    
    // Validate input
    if (!game || !gameType || !result || confidence === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: game, gameType, result, confidence' 
      });
    }
    
    if (!['victory', 'defeat', 'unknown'].includes(result)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Result must be victory, defeat, or unknown' 
      });
    }
    
    // Only process results with reasonable confidence
    if (confidence < 40) {
      console.log(`⚠️ Low confidence result (${confidence}%) ignored for ${user.username}`);
      return res.json({
        success: true,
        message: 'Result received but confidence too low to process'
      });
    }
    
    // Store comprehensive game result
    const gameResult = {
      userId: user._id,
      username: user.username,
      game,
      gameType,
      result,
      confidence,
      screenshot,
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'unknown',
      analysis: analysis || {},
      players: players || [],
      matchData: matchData || {},
      reportedAt: new Date()
    };
    
    // Log to console (you can save to database later)
    console.log('📊 Enhanced Game Result Data:', JSON.stringify(gameResult, null, 2));
    
    // Enhanced result processing based on source
    const processingResult = await processEnhancedGameResult(gameResult, user);
    
    // Award achievements and rewards
    try {
      const AchievementService = require('../services/achievementService');
      
      if (result === 'victory') {
        // Award victory-related achievements
        await AchievementService.awardAchievement(user._id, 'first_victory');
        
        // Game-specific victory achievements
        if (gameType === 'wc1') {
          await AchievementService.awardAchievement(user._id, 'wc1_victor');
        } else if (gameType === 'wc2') {
          await AchievementService.awardAchievement(user._id, 'wc2_victor');
        } else if (gameType === 'wc3') {
          await AchievementService.awardAchievement(user._id, 'wc3_victor');
        }
        
        // Enhanced rewards based on detection method
        let expReward = 50;
        let goldReward = 25;
        let honorReward = 10;
        
        // Bonus rewards for comprehensive detection
        if (source === 'log_file' || source === 'replay_file') {
          expReward += 25; // Bonus for automatic detection
          goldReward += 15;
          honorReward += 5;
        }
        
        // Bonus for multiple confirmation sources
        if (analysis.sources && analysis.sources.length > 1) {
          expReward += 10;
          goldReward += 5;
          goldReward += 3;
        }
        
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            experience: expReward,
            arenaGold: goldReward,
            honor: honorReward
          }
        });
        
        console.log(`🏆 Victory rewards awarded to ${user.username}: +${expReward} EXP, +${goldReward} Gold, +${honorReward} Honor`);
      }
      
      // Source-specific achievements
      if (source === 'log_file') {
        await AchievementService.awardAchievement(user._id, 'log_detective');
      } else if (source === 'replay_file') {
        await AchievementService.awardAchievement(user._id, 'replay_analyst');
      } else if (source === 'screenshot_analysis') {
        await AchievementService.awardAchievement(user._id, 'ai_analyst');
      }
      
      // Achievement for using comprehensive detection
      if (analysis.sources && analysis.sources.length > 1) {
        await AchievementService.awardAchievement(user._id, 'comprehensive_tracker');
      }
      
    } catch (achError) {
      console.error('Error awarding achievements for game result:', achError);
    }
    
    res.json({
      success: true,
      message: 'Enhanced game result processed successfully',
      data: {
        result,
        confidence,
        source,
        rewardsAwarded: result === 'victory',
        processingResult
      }
    });
    
  } catch (error) {
    console.error('Error processing enhanced game result:', error);
    res.status(500).json({
      success: false,
      error: 'Server error processing game result'
    });
  }
});

// Helper function to process enhanced game results
async function processEnhancedGameResult(gameResult, user) {
  const processing = {
    autoMatchCreated: false,
    playersProcessed: 0,
    warnings: []
  };
  
  try {
    // If we have detailed player information and match data, try to create a match automatically
    if (gameResult.players && gameResult.players.length > 0 && 
        gameResult.matchData && gameResult.matchData.mapName) {
      
      console.log(`🎯 Attempting to create automatic match for ${user.username}`);
      
      // Check if user has a linked player for this game type
      const linkedPlayer = await Player.findOne({
        linkedUser: user._id,
        gameType: gameResult.gameType
      });
      
      if (linkedPlayer) {
        // Create match data
        const matchData = {
          gameType: gameResult.gameType,
          matchType: gameResult.matchData.matchType || '1v1',
          map: {
            name: gameResult.matchData.mapName
          },
          resourceLevel: gameResult.matchData.resourceLevel || 'medium',
          players: [],
          winner: null,
          date: new Date(gameResult.timestamp),
          duration: gameResult.matchData.duration || 0,
          verification: {
            status: 'verified', // Auto-verify comprehensive results
            verifiedBy: null, // System verification
            verifiedAt: new Date()
          },
          report: {
            reportedBy: user._id,
            reportedAt: new Date(),
            battleReport: `Automatically detected via ${gameResult.source}`
          }
        };
        
        // Add the reporting user as a player
        matchData.players.push({
          playerId: linkedPlayer._id,
          name: linkedPlayer.name,
          team: 1,
          race: 'random',
          isAI: false
        });
        
        // Add other players if detected
        gameResult.players.forEach((detectedPlayer, index) => {
          if (detectedPlayer.name && detectedPlayer.name !== linkedPlayer.name) {
            matchData.players.push({
              playerId: null, // Unknown player
              name: detectedPlayer.name,
              team: detectedPlayer.team || (index + 2),
              race: detectedPlayer.race || 'random',
              isAI: detectedPlayer.isAI || false
            });
          }
        });
        
        // Set winner based on result
        if (gameResult.result === 'victory') {
          matchData.winner = linkedPlayer._id;
        } else if (gameResult.result === 'defeat' && matchData.players.length > 1) {
          // If there's another player, they won
          const otherPlayer = matchData.players.find(p => p.playerId !== linkedPlayer._id);
          if (otherPlayer) {
            matchData.winner = otherPlayer.name;
          }
        }
        
        // Create the match if we have enough information
        if (matchData.winner) {
          const newMatch = new Match(matchData);
          await newMatch.save();
          
          console.log(`✅ Automatic match created for ${user.username}: ${newMatch._id}`);
          processing.autoMatchCreated = true;
          processing.matchId = newMatch._id;
        } else {
          processing.warnings.push('Could not determine match winner');
        }
        
      } else {
        processing.warnings.push('No linked player found for automatic match creation');
      }
      
      processing.playersProcessed = gameResult.players.length;
    }
    
  } catch (error) {
    console.error('Error in enhanced game result processing:', error);
    processing.warnings.push(`Processing error: ${error.message}`);
  }
  
  return processing;
}

/**
 * Sync WC1 player name and update all related match records
 */
async function syncWC1PlayerNameAndMatches(userId, newUsername) {
  try {
    console.log(`🔄 Syncing WC1 player name for user ${newUsername} (ID: ${userId})`);
    
    // Find user's WC1 player
    const player = await Player.findOne({ 
      user: userId, 
      gameType: 'wc1' 
    });
    
    if (!player) {
      console.log(`ℹ️ No WC1 player found for user ${newUsername} - creating one`);
      
      // Create new WC1 player if it doesn't exist
      const wc1Player = new Player({
        name: newUsername,
        user: userId,
        gameType: 'wc1',
        mmr: 1200, // Default MMR for WC1
        wins: 0,
        losses: 0,
        isActive: true,
        autoCreated: true,
        createdAt: new Date()
      });

      await wc1Player.save();
      console.log(`✅ Auto-created WC1 player for user ${newUsername}`);
      return;
    }
    
    // Check if name already matches
    if (player.name === newUsername) {
      console.log(`✅ WC1 player name already matches username: ${newUsername}`);
      return;
    }
    
    const oldName = player.name;
    
    // Update player name
    player.name = newUsername;
    await player.save();
    
    // Update all match records that reference this player
    const matchUpdateResult = await Match.updateMany(
      {
        'players.playerId': player._id,
        gameType: 'wc1'
      },
      {
        $set: {
          'players.$.name': newUsername
        }
      }
    );
    
    console.log(`✅ Synced WC1 player name: "${oldName}" → "${newUsername}"`);
    console.log(`✅ Updated ${matchUpdateResult.modifiedCount} match records`);
    
  } catch (error) {
    console.error(`❌ Error syncing WC1 player name for user ${newUsername}:`, error);
    // Don't throw error - username change should succeed even if sync fails
  }
}

// Track /api/me call timing for debugging
let lastApiMeCall = null;
let apiMeCallCount = 0;

// GET /api/me - Get current user profile (consolidated endpoint)
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Award test achievement for visiting profile
    try {
      const AchievementService = require('../services/achievementService');
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

// GET /api/user/profile - get current user profile
router.get('/user/profile', isAuthenticated, async (req, res) => {
  console.log('🔍 /user/profile route called');
  try {
    const user = await User.findById(req.user._id).select('-password');
    
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

// GET /api/user/status - get current user status
router.get('/user/status', isAuthenticated, async (req, res) => {
  console.log('🔍 /user/status route called');
  try {
    const user = await User.findById(req.user._id).select('username email role avatar lastLogin');
    
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

// GET /api/user/:id - get public user data
router.get('/user/:id', async (req, res) => {
  console.log('🔍 /user/:id route called with id:', req.params.id);
  try {
    const userId = req.params.id;

    // Find user by ID
    const user = await User.findById(userId).select('-password -email -role -isUsernameDefined -suggestedUsername');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Award Profile Visitor achievement if logged in and viewing another user's profile
    if (req.user && req.user._id.toString() !== userId) {
      try {
        const AchievementService = require('../services/achievementService');
        await AchievementService.awardAchievement(req.user._id, 'profile_visitor');
        console.log(`🏆 Profile Visitor achievement awarded to ${req.user.username} for viewing ${user.username}'s profile`);
      } catch (error) {
        console.log('Could not award Profile Visitor achievement (may already be awarded):', error.message);
      }
    }

    res.json({
      id: user._id,
      username: user.username,
      // Use user's own displayName or fallback to username
      displayName: user.displayName || user.username || 'User',
      // Use user's own avatar or default
      avatar: user.avatar || '/assets/img/ranks/emblem.png',
      bio: user.bio || '',
      socialLinks: user.socialLinks || { youtube: '', twitch: '' }
    });
  } catch (err) {
    console.error('Error getting user data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/me/username-change-status - check if user can change username
router.get('/me/username-change-status', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const registeredAt = user.registeredAt || user.createdAt;
    const daysSinceRegistration = Math.floor((now - registeredAt) / (1000 * 60 * 60 * 24));
    const daysSinceLastChange = user.lastUsernameChange ?
      Math.floor((now - user.lastUsernameChange) / (1000 * 60 * 60 * 24)) :
      null;

    let canChange = false;
    let message = '';
    let nextChangeDate = null;

    // First 30 days: can change once
    if (daysSinceRegistration <= 30) {
      if (!user.lastUsernameChange) {
        canChange = true;
        message = 'You can change your username once within the first 30 days of registration.';
      } else {
        canChange = false;
        message = 'You can only change your username once within the first 30 days of account creation.';
      }
    } else {
      // After 30 days: can change once every 30 days
      if (daysSinceLastChange === null || daysSinceLastChange >= 30) {
        canChange = true;
        message = 'You can change your username once every 30 days.';
      } else {
        canChange = false;
        const nextChange = new Date(user.lastUsernameChange);
        nextChange.setDate(nextChange.getDate() + 30);
        nextChangeDate = nextChange;
        message = `You can only change your username once every 30 days. Next change available: ${nextChange.toLocaleDateString()}`;
      }
    }

    res.json({
      canChange,
      message,
      nextChangeDate,
      daysSinceRegistration,
      daysSinceLastChange,
      lastUsernameChange: user.lastUsernameChange
    });
  } catch (err) {
    console.error('Error checking username change status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/me/change-username - change username
router.put('/me/change-username', isAuthenticated, async (req, res) => {
  try {
    let { username } = req.body;
    const user = req.user;

    // Validate username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Convert to uppercase
    username = username.toUpperCase();

    // Check if username is different from current
    if (username === user.username) {
      return res.status(400).json({ error: 'New username must be different from current username' });
    }

    // Check if username is available
    const isUsernameTaken = await User.isUsernameTaken(username);
    if (isUsernameTaken) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check if user can change username
    const now = new Date();
    const registeredAt = user.registeredAt || user.createdAt;
    const daysSinceRegistration = Math.floor((now - registeredAt) / (1000 * 60 * 60 * 24));
    const daysSinceLastChange = user.lastUsernameChange ?
      Math.floor((now - user.lastUsernameChange) / (1000 * 60 * 60 * 24)) :
      null;

    // First 30 days: can change once
    // After that: can change once every 30 days
    if (daysSinceRegistration <= 30) {
      if (user.lastUsernameChange) {
        return res.status(400).json({
          error: 'You can only change your username once within the first 30 days of account creation',
          nextChangeDate: null
        });
      }
    } else if (daysSinceLastChange !== null && daysSinceLastChange < 30) {
      const nextChangeDate = new Date(user.lastUsernameChange);
      nextChangeDate.setDate(nextChangeDate.getDate() + 30);

      return res.status(400).json({
        error: 'You can only change your username once every 30 days',
        nextChangeDate: nextChangeDate
      });
    }

    // Update username
    user.username = username;
    user.lastUsernameChange = now;
    await user.save();

    // Auto-update WC1 player name and matches
    await syncWC1PlayerNameAndMatches(user._id, username);

    res.json({
      message: 'Username updated successfully',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        lastUsernameChange: user.lastUsernameChange
      }
    });
  } catch (err) {
    console.error('Error changing username:', err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/me/refresh-avatar - refresh user avatar based on linked players
router.post('/me/refresh-avatar', isAuthenticated, async (req, res) => {
  try {
    const avatarService = require('../services/avatarService');
    const success = await avatarService.updateUserAvatar(req.user._id);
    
    if (success) {
      // Return fresh user data with updated avatar
      const updatedUser = await User.findById(req.user._id);
      res.json({
        message: 'Avatar refreshed successfully',
        avatar: updatedUser.avatar || '/assets/img/ranks/emblem.png'
      });
    } else {
      res.status(500).json({ error: 'Failed to refresh avatar' });
    }
  } catch (error) {
    console.error('Error refreshing avatar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/me/avatar-preferences - update user avatar preferences
router.put('/me/avatar-preferences', isAuthenticated, async (req, res) => {
  try {
    const { type, customImage } = req.body;
    
    // Validate avatar type
    const validTypes = ['default', 'highest_rank', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid avatar type' });
    }
    
    // Validate custom image if type is custom
    const validImages = ['mage.png', 'dragon.png', 'dwarf.png', 'elf.png'];
    if (type === 'custom' && (!customImage || !validImages.includes(customImage))) {
      return res.status(400).json({ error: 'Invalid custom image selection' });
    }
    
    // Update user preferences
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Set avatar preferences
    user.avatarPreferences = {
      type: type,
      customImage: type === 'custom' ? customImage : null,
      lastUpdated: new Date()
    };
    
    await user.save();
    
    // Recalculate avatar based on new preferences
    const avatarService = require('../services/avatarService');
    const newAvatar = await avatarService.calculateUserAvatar(req.user._id);
    
    // Update the avatar field
    user.avatar = newAvatar;
    await user.save();
    
    console.log(`✅ Updated avatar preferences for user ${user.username}: ${type} ${customImage ? `(${customImage})` : ''} → ${newAvatar}`);
    
    res.json({
      message: 'Avatar preferences updated successfully',
      preferences: user.avatarPreferences,
      avatar: newAvatar
    });
    
  } catch (error) {
    console.error('Error updating avatar preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/me/avatar-options - get available avatar options for user
router.get('/me/avatar-options', isAuthenticated, async (req, res) => {
  try {
    // Get user's linked players for rank info
    const linkedPlayers = await Player.find({ user: req.user._id });
    
    // Find highest rank player
    let highestRankPlayer = null;
    if (linkedPlayers && linkedPlayers.length > 0) {
      highestRankPlayer = linkedPlayers.reduce((highest, current) => {
        const currentMMR = current.mmr || 0;
        const highestMMR = highest.mmr || 0;
        return currentMMR > highestMMR ? current : highest;
      });
    }
    
    // Available custom images
    const customImages = [
      { id: 'mage.png', name: 'Mage', path: '/assets/img/profiles/mage.png' },
      { id: 'dragon.png', name: 'Dragon', path: '/assets/img/profiles/dragon.png' },
      { id: 'dwarf.png', name: 'Dwarf', path: '/assets/img/profiles/dwarf.png' },
      { id: 'elf.png', name: 'Elf', path: '/assets/img/profiles/elf.png' },
      { id: 'paladin.png', name: 'Paladin', path: '/assets/img/profiles/paladin.png' }
    ];
    
    res.json({
      currentPreferences: req.user.avatarPreferences || { type: 'default' },
      currentAvatar: req.user.avatar || '/assets/img/ranks/emblem.png',
      options: {
        default: {
          type: 'default',
          name: 'Default Emblem',
          description: 'Classic WC Arena emblem',
          path: '/assets/img/ranks/emblem.png'
        },
        highestRank: {
          type: 'highest_rank',
          name: 'Highest Rank',
          description: highestRankPlayer ? 
            `Your ${highestRankPlayer.rank?.name || 'current'} rank (${highestRankPlayer.name})` :
            'Use your highest rank (no players linked)',
          path: highestRankPlayer?.rank?.image || '/assets/img/ranks/emblem.png',
          available: linkedPlayers.length > 0,
          rankInfo: highestRankPlayer ? {
            name: highestRankPlayer.rank?.name,
            mmr: highestRankPlayer.mmr,
            playerName: highestRankPlayer.name
          } : null
        },
        custom: {
          type: 'custom',
          name: 'Custom Images',
          description: 'Choose from special profile images',
          images: customImages
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting avatar options:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/refresh-streaming - refresh streaming data (profile images + live status)
router.post('/refresh-streaming', async (req, res) => {
  try {
    console.log('🔄 Manual streaming data refresh triggered');
    
    const profileImageService = require('../services/profileImageService');
    const { checkAllLiveStatus } = require('../services/streamChecker');
    
    // Find users with social links
    const users = await User.find({
      $or: [
        { 'socialLinks.youtube': { $exists: true, $ne: '' } },
        { 'socialLinks.twitch': { $exists: true, $ne: '' } }
      ]
    });
    
    console.log(`📦 Found ${users.length} users with social links`);
    
    let profileUpdates = 0;
    let profileErrors = 0;
    
    // REMOVED: Profile image refresh to avoid quota exhaustion
    // Profile images are only refreshed via the 30-minute cron job
    console.log('📸 Profile images are refreshed every 30 minutes via cron job, not on-demand');
    
    // Refresh live status
    let liveStatusSuccess = false;
    try {
      await checkAllLiveStatus();
      liveStatusSuccess = true;
      console.log('✅ Live status check completed');
    } catch (error) {
      console.error('❌ Live status check failed:', error.message);
    }
    
    res.json({
      success: true,
      message: 'Streaming data refresh completed',
      results: {
        profileImages: {
          total: users.length,
          updated: 0, // No longer updating on-demand
          errors: 0,
          note: 'Profile images are refreshed every 30 minutes via cron job'
        },
        liveStatus: {
          success: liveStatusSuccess
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error refreshing streaming data:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
});

// GET /api/me/avatar-debug - debug avatar system for current user
router.get('/me/avatar-debug', isAuthenticated, async (req, res) => {
  try {
    const avatarService = require('../services/avatarService');
    
    // Get user's linked players
    const linkedPlayers = await Player.find({ user: req.user._id });
    
    // Calculate what the avatar should be
    const calculatedAvatar = await avatarService.calculateUserAvatar(req.user._id);
    
    res.json({
      userId: req.user._id,
      username: req.user.username,
      currentAvatar: req.user.avatar,
      calculatedAvatar: calculatedAvatar,
      linkedPlayers: linkedPlayers.map(p => ({
        id: p._id,
        name: p.name,
        mmr: p.mmr,
        rank: p.rank
      })),
      avatarMatches: req.user.avatar === calculatedAvatar
    });
  } catch (error) {
    console.error('Error debugging avatar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/me - update user profile
router.put('/me', isAuthenticated, async (req, res) => {
  try {
    console.log('🔧 PUT /api/me called with body:', JSON.stringify(req.body, null, 2));
    const { bio, profile, socialLinks, streaming, dateOfBirth } = req.body;

    // First find the user to ensure it exists
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('❌ User not found:', req.user._id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User found:', user.username);

    // Update the user document
    user.bio = bio;
    console.log('📝 Bio updated to:', bio);
    
    // Handle dateOfBirth at root level for compatibility
    if (dateOfBirth !== undefined) {
      user.dateOfBirth = dateOfBirth;
      console.log('📅 Date of birth updated to:', dateOfBirth);
    }
    
    // Update profile data if provided
    if (profile) {
      // Helper function to recursively remove undefined values and fix invalid dates
      const removeUndefined = (obj) => {
        if (obj === null || typeof obj !== 'object') {
          return obj;
        }
        
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
              cleaned[key] = removeUndefined(value);
            } else {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      };
      
      // Helper function to fix invalid date fields
      const fixInvalidDates = (obj) => {
        if (obj === null || typeof obj !== 'object') {
          return obj;
        }
        
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'timestamp' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // If timestamp is an empty object or invalid, set it to current date
            cleaned[key] = new Date();
          } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            cleaned[key] = fixInvalidDates(value);
          } else {
            cleaned[key] = value;
          }
        }
        return cleaned;
      };
      
      // Clean both the existing profile and the new profile data
      const cleanExistingProfile = removeUndefined(user.profile || {});
      const cleanProfile = removeUndefined(profile);
      
      // Fix any invalid date fields in BOTH existing and new profile data
      const fixedExistingProfile = fixInvalidDates(cleanExistingProfile);
      const fixedProfile = fixInvalidDates(cleanProfile);
      
      user.profile = {
        ...fixedExistingProfile,
        ...fixedProfile
      };
    }

    // Check if social links are being updated
    const oldSocialLinks = user.socialLinks || {};
    const newSocialLinks = {
      youtube: socialLinks?.youtube || '',
      twitch: socialLinks?.twitch || ''
    };
    
    // Update social links
    user.socialLinks = newSocialLinks;

    // Update streaming data if provided
    if (streaming) {
      // Ensure streaming object exists
      if (!user.streaming) {
        user.streaming = {
          isLive: false,
          lastChecked: null,
          description: '',
          youtubeDescription: '',
          twitchDescription: '',
          youtubeGames: [],
          twitchGames: []
        };
      }

      // Update streaming data while preserving existing values
      user.streaming = {
        ...user.streaming,
        ...streaming
      };

      // Handle platform-specific descriptions
      if (streaming.youtubeDescription !== undefined) {
        user.streaming.youtubeDescription = streaming.youtubeDescription;
      }
      if (streaming.twitchDescription !== undefined) {
        user.streaming.twitchDescription = streaming.twitchDescription;
      }

      // Handle platform-specific games arrays
      if (streaming.youtubeGames !== undefined) {
        user.streaming.youtubeGames = Array.isArray(streaming.youtubeGames) ? 
          streaming.youtubeGames.filter(game => ['wc12', 'wc3'].includes(game)) : [];
      }
      if (streaming.twitchGames !== undefined) {
        user.streaming.twitchGames = Array.isArray(streaming.twitchGames) ? 
          streaming.twitchGames.filter(game => ['wc12', 'wc3'].includes(game)) : [];
      }

      // Remove old contentCreator structure if it exists (backward compatibility cleanup)
      if (user.streaming.contentCreator) {
        delete user.streaming.contentCreator;
      }
      
      // Also remove old games array if it exists
      if (user.streaming.games) {
        delete user.streaming.games;
      }
    }

    console.log('💾 About to save user...');
    await user.save();
    console.log('✅ User saved successfully!');

    // If social links changed, profile images will be updated by the daily cron job
    if (oldSocialLinks.youtube !== newSocialLinks.youtube || 
        oldSocialLinks.twitch !== newSocialLinks.twitch) {
      console.log(`📸 Social links updated for ${user.username}. Profile images will be refreshed in the next daily cron job.`);
    }
    
    // Calculate username change eligibility (same as GET /api/me)
    const lastUsernameChange = user.lastUsernameChange;
    const canChangeUsername = !lastUsernameChange || 
      (Date.now() - lastUsernameChange.getTime()) >= (30 * 24 * 60 * 60 * 1000); // 30 days

    // Calculate next allowed change date
    let nextUsernameChangeDate = null;
    if (!canChangeUsername && lastUsernameChange) {
      nextUsernameChangeDate = new Date(lastUsernameChange.getTime() + (30 * 24 * 60 * 60 * 1000));
    }

    // Parse registeredAt to ensure it's a valid date
    let registeredAt = user.registeredAt;
    if (registeredAt && typeof registeredAt === 'string') {
      registeredAt = new Date(registeredAt);
    }
    if (!registeredAt || isNaN(registeredAt.getTime())) {
      registeredAt = user._id.getTimestamp(); // Fallback to ObjectId timestamp
    }

    // Return cleaned user data (same format as GET /api/me)
    res.json({
      id: user._id,
      username: user.username,
      // Use user's own displayName or fallback to username
      displayName: user.displayName || user.username || 'User',
      email: user.email,
      // Use user's own avatar or default
      avatar: user.avatar || '/assets/img/ranks/emblem.png',
      avatarPreferences: user.avatarPreferences || { type: 'default' },
      isUsernameDefined: user.isUsernameDefined,
      suggestedUsername: user.suggestedUsername || '',
      bio: user.bio || '',
      dateOfBirth: user.dateOfBirth || null,
      profile: user.profile || {
        age: null,
        gender: '',
        country: '',
        warcraftPreferences: {
          favoriteGame: '',
          favoriteRace: '',
          favoriteStrategy: '',
          firstPlayed: null
        }
      },
      socialLinks: user.socialLinks || { youtube: '', twitch: '' },
      streaming: (() => {
        const streaming = user.streaming || {};
        
        // Ensure all required fields exist with defaults
        const cleanStreaming = {
          isLive: streaming.isLive || false,
          lastChecked: streaming.lastChecked || null,
          description: streaming.description || '',
          youtubeDescription: streaming.youtubeDescription || '',
          twitchDescription: streaming.twitchDescription || '',
          youtubeGames: streaming.youtubeGames || [],
          twitchGames: streaming.twitchGames || [],
          platform: streaming.platform || null
        };
        
        return cleanStreaming;
      })(),
      isContentCreator: user.isContentCreator || false,
      role: user.role || 'user',
      honor: user.honor || 0,
      arenaGold: user.arenaGold || 100,
      experience: user.experience || 0,
      lastUsernameChange: user.lastUsernameChange,
      canChangeUsername: canChangeUsername,
      nextUsernameChangeDate: nextUsernameChangeDate,
      registeredAt: registeredAt
    });
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/chat/online-users - Get online users for chat
router.get('/chat/online-users', isAuthenticated, async (req, res) => {
  try {
    // Get all registered users
    const OnlineUser = require('../models/OnlineUser');

    // Get all users with a username defined
    const allUsers = await User.find({ isUsernameDefined: true })
      .select('_id username displayName avatar lastLogin')
      .sort({ username: 1 })
      .lean();

    // Get currently online users
    const onlineUsers = await OnlineUser.getAllOnlineUsers();

    // Create a map of online users by userId for quick lookup
    const onlineUsersMap = new Map();
    onlineUsers.forEach(user => {
      onlineUsersMap.set(user.userId.toString(), user);
    });

    // Calculate the threshold for "recently active" (3 days ago)
    const recentlyActiveThreshold = new Date();
    recentlyActiveThreshold.setDate(recentlyActiveThreshold.getDate() - 3);

    // Combine the data
    const combinedUsers = allUsers.map(user => {
      const onlineUser = onlineUsersMap.get(user._id.toString());
      const isOnline = !!onlineUser;
      const lastActivity = onlineUser ? onlineUser.lastActivity : null;
      const isRecentlyActive = user.lastLogin && new Date(user.lastLogin) >= recentlyActiveThreshold;

      // Fix avatar path - ensure we never send the old path
      let avatarPath = user.avatar;
      if (!avatarPath || avatarPath === '/assets/img/emblem.png' || avatarPath === 'null' || avatarPath === 'undefined') {
        avatarPath = '/assets/img/ranks/emblem.png';
        console.log(`🔧 Fixed avatar path for user ${user.username}: ${user.avatar} -> ${avatarPath}`);
      }

      return {
        userId: user._id,
        username: user.username || user.displayName,
        displayName: user.displayName,
        avatar: avatarPath,
        status: isOnline ? onlineUser.status : 'offline',
        lastActivity: lastActivity,
        isOnline: isOnline,
        isRecentlyActive: isRecentlyActive,
        lastLogin: user.lastLogin
      };
    });

    // Make sure current user is included and marked as online
    const currentUserIndex = combinedUsers.findIndex(u => u.userId.toString() === req.user._id.toString());

    if (currentUserIndex >= 0) {
      combinedUsers[currentUserIndex].status = 'online';
      combinedUsers[currentUserIndex].isOnline = true;
      combinedUsers[currentUserIndex].lastActivity = new Date();
    } else {
      // Add current user if not found
      let currentUserAvatar = req.user.avatar;
      if (!currentUserAvatar || currentUserAvatar === '/assets/img/emblem.png' || currentUserAvatar === 'null' || currentUserAvatar === 'undefined') {
        currentUserAvatar = '/assets/img/ranks/emblem.png';
        console.log(`🔧 Fixed current user avatar path: ${req.user.avatar} -> ${currentUserAvatar}`);
      }
      
      combinedUsers.push({
        userId: req.user._id,
        username: req.user.username || req.user.displayName,
        displayName: req.user.displayName,
        avatar: currentUserAvatar,
        status: 'online',
        lastActivity: new Date(),
        isOnline: true,
        isRecentlyActive: true,
        lastLogin: req.user.lastLogin || new Date()
      });
    }

    // Try to add/update the current user in the online users collection
    try {
      let userAvatar = req.user.avatar;
      if (!userAvatar || userAvatar === '/assets/img/emblem.png' || userAvatar === 'null' || userAvatar === 'undefined') {
        userAvatar = '/assets/img/ranks/emblem.png';
      }
      
      await OnlineUser.findOneAndUpdate(
        { userId: req.user._id },
        {
          userId: req.user._id,
          username: req.user.username || req.user.displayName,
          displayName: req.user.displayName,
          avatar: userAvatar,
          socketId: 'api-request', // Temporary socket ID
          status: 'online',
          lastActivity: Date.now()
        },
        { upsert: true, new: true }
      );
    } catch (updateError) {
      console.error('Error updating online user:', updateError);
    }

    res.json(combinedUsers);
  } catch (err) {
    console.error('Error getting chat users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/notifications - Get user notifications
router.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    // Get unread notifications for the current user
    const notifications = await Notification.getUnreadNotifications(req.user._id);

    res.json(notifications);
  } catch (err) {
    console.error('Error getting notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/notifications/all - Get all user notifications
router.get('/notifications/all', isAuthenticated, async (req, res) => {
  try {
    // Get all notifications for the current user
    const notifications = await Notification.getUserNotifications(req.user._id);

    res.json(notifications);
  } catch (err) {
    console.error('Error getting all notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notifications/:id/read - Mark a notification as read
router.put('/notifications/:id/read', isAuthenticated, async (req, res) => {
  try {
    const notificationId = req.params.id;

    // Mark notification as read
    const notification = await Notification.markAsRead(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', isAuthenticated, async (req, res) => {
  try {
    // Mark all notifications as read for the current user
    await Notification.markAllAsRead(req.user._id);

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user/:id/players - Get players for a user
router.get('/user/:id/players', async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(`🎮 GET /api/user/${userId}/players called`);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`❌ Invalid ObjectId format: ${userId}`);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ User found: ${user.username || user.email}`);

    // Get player IDs linked to this user
    const players = await Player.find({ user: userId }).lean();

    console.log(`🎮 Found ${players.length} players for user ${user.username || user.email}`);
    res.json(players);
  } catch (err) {
    console.error('❌ Error getting user players:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/players - Get user's players
router.get('/players', isAuthenticated, async (req, res) => {
  try {
    const { gameType } = req.query;
    
    let query = { user: req.user._id };
    
    // Filter by game type if specified
    if (gameType) {
      query.gameType = gameType;
    }
    
    const players = await Player.find(query).sort({ name: 1 });
    
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

module.exports = router;