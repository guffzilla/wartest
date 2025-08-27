const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const CampaignCompletion = require('../models/CampaignCompletion');
const User = require('../models/User');
const AchievementService = require('../services/achievementService');
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// JWT Authentication Middleware for campaigns routes
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
          console.log(`🔐 Campaigns route JWT authenticated user: ${user.username}`);
        }
      }
    } catch (error) {
      console.log(`🔐 Campaigns route JWT auth failed: ${error.message}`);
      // Clear invalid cookie
      res.clearCookie('authToken');
    }
  }
  
  next();
});

// Configure multer for screenshot uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/campaigns');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `campaign-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns grouped by game and expansion
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.getAllCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/:game/:expansion/:race
 * @desc    Get missions for a specific campaign
 * @access  Public
 */
router.get('/:game/:expansion/:race', async (req, res) => {
  try {
    const { game, expansion, race } = req.params;
    const missions = await Campaign.getCampaignMissions(game, expansion, race);
    res.json(missions);
  } catch (error) {
    console.error('Error fetching campaign missions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/user/progress
 * @desc    Get current user's campaign progress
 * @access  Public (returns empty for guests)
 */
router.get('/user/progress', async (req, res) => {
  try {
    // If user is not authenticated, return empty progress
    if (!req.user) {
      return res.json([]);
    }
    
    const progress = await CampaignCompletion.getUserProgress(req.user.id);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/user/stats
 * @desc    Get current user's campaign statistics
 * @access  Public (returns default stats for guests)
 */
router.get('/user/stats', async (req, res) => {
  try {
    // If user is not authenticated, return default stats
    if (!req.user) {
      return res.json({
        totalMissionsCompleted: 0,
        completedCampaigns: 0,
        totalExperienceEarned: 0,
        totalArenaGoldEarned: 0,
        totalHonorPointsEarned: 0,
        achievementExperience: 0,
        achievementsUnlocked: 0
      });
    }
    console.log('🎯 Campaign stats request for user:', req.user.id);
    console.log('🎯 User ID type:', typeof req.user.id);
    console.log('🎯 User ID string:', req.user.id.toString());
    const user = await User.findById(req.user.id).select('achievements');
    const completions = await CampaignCompletion.find({ userId: req.user.id });
    
    console.log('📊 Found user:', user ? 'YES' : 'NO');
    console.log('📊 Found completions:', completions.length);
    console.log('📊 Completion sample:', completions.slice(0, 2).map(c => ({
      campaignId: c.campaignId,
      experience: c.experienceAwarded,
      arenaGold: c.arenaGoldAwarded
    })));
    
    // Count only campaign-specific achievements
    let campaignAchievementsCount = 0;
    if (user.achievements && user.achievements.unlocked) {
      // Filter achievements to only count campaign-related ones
      campaignAchievementsCount = user.achievements.unlocked.filter(achievementId => {
        const id = achievementId.toLowerCase();
        return id.includes('campaign') || 
               id.includes('wc1_human') || 
               id.includes('wc1_orc') || 
               id.includes('wc2_human') || 
               id.includes('wc2_orc') || 
               id.includes('wc3_roc') || 
               id.includes('wc3_tft') || 
               id.includes('wc2_btdp') ||
               id.includes('completionist') ||
               id.includes('warcraft_master');
      }).length;
    }
    
    // Calculate completed campaigns by checking if ALL missions in each campaign are complete
    let completedCampaignsCount = 0;
    
    if (completions.length > 0) {
      // Get campaign info for each completion to group by actual campaigns
      const Campaign = require('../models/Campaign');
      const completedMissionIds = completions.map(c => c.campaignId);
      const campaignMissions = await Campaign.find({ 
        _id: { $in: completedMissionIds } 
      }).select('game expansion campaignName race');
      
      // Create a map of completions with their campaign info
      const completionMap = new Map();
      completions.forEach(completion => {
        const mission = campaignMissions.find(m => m._id.toString() === completion.campaignId.toString());
        if (mission) {
          const campaignKey = `${mission.game}-${mission.expansion}-${mission.campaignName}-${mission.race}`;
          if (!completionMap.has(campaignKey)) {
            completionMap.set(campaignKey, new Set());
          }
          completionMap.get(campaignKey).add(completion.campaignId.toString());
        }
      });
      
      // Get all campaigns and their mission counts
      const allCampaigns = await Campaign.aggregate([
        {
          $group: {
            _id: {
              game: '$game',
              expansion: '$expansion', 
              campaignName: '$campaignName',
              race: '$race'
            },
            missionIds: { $push: '$_id' },
            totalMissions: { $sum: 1 }
          }
        }
      ]);
      
      // Check which campaigns are 100% complete
      console.log('🏁 Checking campaign completions...');
      for (const campaign of allCampaigns) {
        const campaignKey = `${campaign._id.game}-${campaign._id.expansion}-${campaign._id.campaignName}-${campaign._id.race}`;
        const completedMissions = completionMap.get(campaignKey);
        
        console.log(`📋 Campaign: ${campaignKey}`);
        console.log(`  - Total missions: ${campaign.totalMissions}`);
        console.log(`  - Completed missions: ${completedMissions ? completedMissions.size : 0}`);
        
        if (completedMissions && completedMissions.size === campaign.totalMissions) {
          // All missions in this campaign are completed
          console.log(`  ✅ Campaign 100% complete!`);
          completedCampaignsCount++;
        } else {
          console.log(`  ❌ Campaign incomplete (${completedMissions ? completedMissions.size : 0}/${campaign.totalMissions})`);
        }
      }
    }

    const stats = {
      totalMissionsCompleted: completions.length,
      completedCampaigns: completedCampaignsCount,
      totalExperienceEarned: completions.reduce((sum, c) => sum + c.experienceAwarded, 0),
      totalArenaGoldEarned: completions.reduce((sum, c) => sum + c.arenaGoldAwarded, 0),
      totalHonorPointsEarned: user.honor || 0, // Honor points from achievements and good behavior
      achievementExperience: user.achievements.totalPointsEarned || 0, // Total experience from achievements
      achievementsUnlocked: campaignAchievementsCount // Only campaign achievements
    };

    console.log('📊 Campaign completion calculation:');
    console.log(`  - Total missions completed: ${completions.length}`);
    console.log(`  - Total campaigns completed: ${completedCampaignsCount}`);
    console.log('📊 Final stats object:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/campaigns/:campaignId/complete
 * @desc    Submit campaign mission completion with difficulty and speedrun support
 * @access  Private
 */
router.post('/:campaignId/complete', ensureAuthenticated, upload.array('screenshots', 5), async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { 
      notes, 
      difficulty = 'normal',
      isSpeedrun = false,
      completionTime,
      videoProof
    } = req.body;

    // Validate campaign exists
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign mission not found' });
    }

    // Validate difficulty for WC3 campaigns
    if (campaign.game === 'wc3' && !['story', 'normal', 'hard'].includes(difficulty)) {
      return res.status(400).json({ message: 'Invalid difficulty mode for WC3' });
    }

    // For non-WC3 games, force normal difficulty
    const finalDifficulty = campaign.game === 'wc3' ? difficulty : 'normal';

    // Validate speedrun data
    if (isSpeedrun === 'true' || isSpeedrun === true) {
      if (!completionTime || isNaN(completionTime) || completionTime <= 0) {
        return res.status(400).json({ message: 'Valid completion time is required for speedruns' });
      }
      if (videoProof && !/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(videoProof)) {
        return res.status(400).json({ message: 'Please provide a valid YouTube URL for video proof' });
      }
    }

    // Validate screenshots
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one screenshot is required' });
    }

    // Get next playthrough number
    const playthroughNumber = await CampaignCompletion.getNextPlaythroughNumber(
      req.user.id, 
      campaignId, 
      finalDifficulty
    );

    // Base mission rewards (standard for all missions)
    let baseExperience = 5;
    let baseArenaGold = 5;
    
    // Apply difficulty multipliers for WC3 only
    if (campaign.game === 'wc3') {
      const difficultyMultiplier = CampaignCompletion.getDifficultyMultiplier(finalDifficulty);
      baseExperience = Math.round(baseExperience * difficultyMultiplier);
    }
    
    // Speedrun bonus (10% extra experience)
    const speedrunMultiplier = (isSpeedrun === 'true' || isSpeedrun === true) ? 1.1 : 1.0;
    const finalExperience = Math.round(baseExperience * speedrunMultiplier);
    const finalArenaGold = baseArenaGold; // Arena gold not affected by speedrun

    // Prepare screenshot data
    const screenshots = req.files.map(file => ({
      url: `/uploads/campaigns/${file.filename}`,
      metadata: {
        size: file.size,
        mimetype: file.mimetype,
        creationTime: new Date(),
        modifiedTime: new Date()
      }
    }));

    // Create completion record
    const completion = new CampaignCompletion({
      userId: req.user.id,
      campaignId,
      difficulty: finalDifficulty,
      playthroughNumber,
      speedrun: {
        isSpeedrun: isSpeedrun === 'true' || isSpeedrun === true,
        completionTime: (isSpeedrun === 'true' || isSpeedrun === true) ? parseInt(completionTime) : null,
        videoProof: (isSpeedrun === 'true' || isSpeedrun === true) ? videoProof : null
      },
      screenshots,
      notes: notes || '',
      experienceAwarded: finalExperience,
      arenaGoldAwarded: finalArenaGold
    });

    await completion.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        'stats.totalExperience': finalExperience,
        'stats.arenaGold': finalArenaGold,
        'stats.campaignMissionsCompleted': 1
      }
    });

    // Check for campaign-related achievements
    const achievementService = new AchievementService();
    const newAchievements = await achievementService.checkCampaignAchievements(req.user.id, completion);

    // Achievement notifications are now created automatically by AchievementService.awardAchievement()
    // No need to create them manually here

    // Create notification for completion
    const difficultyText = finalDifficulty !== 'normal' ? ` (${finalDifficulty.toUpperCase()})` : '';
    const speedrunText = completion.speedrun.isSpeedrun ? ` [SPEEDRUN: ${Math.floor(completion.speedrun.completionTime / 60)}:${(completion.speedrun.completionTime % 60).toString().padStart(2, '0')}]` : '';
    const playthroughText = playthroughNumber > 1 ? ` (Playthrough #${playthroughNumber})` : '';
    
    await Notification.create({
      userId: req.user.id,
      type: 'campaign',
      content: `Mission completed: ${campaign.missionName}${difficultyText}${speedrunText}${playthroughText}! Earned ${finalExperience} experience and ${finalArenaGold} arena gold.`,
      data: {
        campaignId,
        missionName: campaign.missionName,
        difficulty: finalDifficulty,
        playthroughNumber,
        experienceEarned: finalExperience,
        arenaGoldEarned: finalArenaGold,
        isSpeedrun: completion.speedrun.isSpeedrun,
        completionTime: completion.speedrun.completionTime
      }
    });

    res.status(201).json({
      message: 'Mission completion submitted successfully',
      completion: {
        ...completion.toObject(),
        campaign: {
          missionName: campaign.missionName,
          game: campaign.game,
          expansion: campaign.expansion,
          race: campaign.race
        }
      },
      rewards: {
        experience: finalExperience,
        arenaGold: finalArenaGold,
        speedrunBonus: speedrunMultiplier > 1
      },
      achievementsUnlocked: newAchievements
    });

  } catch (error) {
    console.error('Error submitting campaign completion:', error);
    
    // Handle duplicate completion error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'You have already completed this mission on this difficulty for this playthrough number. Try a different difficulty or start a new playthrough.' 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/:campaignId/completions
 * @desc    Get completion statistics for a specific campaign
 * @access  Public
 */
router.get('/:campaignId/completions', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const stats = await CampaignCompletion.getCompletionStats(campaignId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching completion stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/user/completions
 * @desc    Get current user's campaign completions with difficulty breakdown
 * @access  Private
 */
router.get('/user/completions', ensureAuthenticated, async (req, res) => {
  try {
    const completions = await CampaignCompletion.find({ userId: req.user.id })
      .populate('campaignId', 'missionName missionNumber game expansion race campaignName')
      .sort({ completedAt: -1 });

    // Group by campaign and difficulty
    const groupedCompletions = completions.reduce((acc, completion) => {
      const key = `${completion.campaignId.game}_${completion.campaignId.expansion}_${completion.campaignId.race}`;
      if (!acc[key]) {
        acc[key] = {
          game: completion.campaignId.game,
          expansion: completion.campaignId.expansion,
          race: completion.campaignId.race,
          campaignName: completion.campaignId.campaignName,
          difficulties: {
            story: [],
            normal: [],
            hard: []
          },
          totalCompletions: 0,
          speedruns: 0
        };
      }
      
      acc[key].difficulties[completion.difficulty].push({
        missionId: completion.campaignId._id,
        missionName: completion.campaignId.missionName,
        missionNumber: completion.campaignId.missionNumber,
        playthroughNumber: completion.playthroughNumber,
        completedAt: completion.completedAt,
        experienceAwarded: completion.experienceAwarded,
        isSpeedrun: completion.speedrun.isSpeedrun,
        completionTime: completion.speedrun.completionTime,
        videoProof: completion.speedrun.videoProof,
        screenshots: completion.screenshots
      });
      
      acc[key].totalCompletions++;
      if (completion.speedrun.isSpeedrun) {
        acc[key].speedruns++;
      }
      
      return acc;
    }, {});

    res.json(Object.values(groupedCompletions));
  } catch (error) {
    console.error('Error fetching user completions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/user/speedruns
 * @desc    Get current user's speedrun completions
 * @access  Private
 */
router.get('/user/speedruns', ensureAuthenticated, async (req, res) => {
  try {
    const speedruns = await CampaignCompletion.find({ 
      userId: req.user.id,
      isSpeedrun: true
    })
    .populate('campaignId', 'missionName missionNumber game expansion race campaignName')
    .sort({ 'speedrun.completionTime': 1 }) // Sort by fastest time first
    .lean();

    // Format the response
    const formattedSpeedruns = speedruns.map(completion => ({
      campaign: completion.campaignId,
      difficulty: completion.difficulty,
      speedrun: completion.speedrun,
      completedAt: completion.completedAt,
      points: completion.pointsEarned
    }));

    res.json(formattedSpeedruns);
  } catch (error) {
    console.error('Error fetching user speedruns:', error);
    res.status(500).json({ message: 'Failed to fetch speedrun data' });
  }
});

/**
 * @route   GET /api/campaigns/:campaignId/leaderboard
 * @desc    Get speedrun leaderboard for a specific mission
 * @access  Public
 */
router.get('/:campaignId/leaderboard', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { difficulty = 'normal', limit = 10 } = req.query;

    const leaderboard = await CampaignCompletion.getMissionLeaderboard(
      campaignId, 
      difficulty, 
      parseInt(limit)
    );

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching mission leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/:campaignId/stats
 * @desc    Get completion statistics for a specific mission
 * @access  Public
 */
router.get('/:campaignId/stats', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const stats = await CampaignCompletion.getCompletionStats(campaignId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching mission stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/leaderboards/global
 * @desc    Get global speedrun leaderboards across all missions
 * @access  Public
 */
router.get('/leaderboards/global', async (req, res) => {
  try {
    const { game, difficulty = 'normal', limit = 50 } = req.query;

    const matchStage = {
      'speedrun.isSpeedrun': true,
      'speedrun.completionTime': { $exists: true, $ne: null }
    };

    if (game) {
      matchStage['campaign.game'] = game;
    }

    if (difficulty !== 'all') {
      matchStage.difficulty = difficulty;
    }

    const leaderboard = await CampaignCompletion.aggregate([
      {
        $lookup: {
          from: 'campaigns',
          localField: 'campaignId',
          foreignField: '_id',
          as: 'campaign'
        }
      },
      {
        $unwind: '$campaign'
      },
      {
        $match: matchStage
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $sort: { 'speedrun.completionTime': 1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          userId: 1,
          'user.username': 1,
          'user.displayName': 1,
          'campaign.missionName': 1,
          'campaign.game': 1,
          'campaign.expansion': 1,
          'campaign.race': 1,
          'speedrun.completionTime': 1,
          'speedrun.videoProof': 1,
          difficulty: 1,
          completedAt: 1
        }
      }
    ]);

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching global leaderboards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/campaigns/leaderboards/speedruns
 * @desc    Get speedrun leaderboards for all missions
 * @access  Public
 */
router.get('/leaderboards/speedruns', async (req, res) => {
  try {
    const { game, difficulty, limit = 10 } = req.query;
    
    const matchConditions = { isSpeedrun: true };
    if (game) matchConditions.game = game;
    if (difficulty) matchConditions.difficulty = difficulty;

    const leaderboards = await CampaignCompletion.aggregate([
      {
        $lookup: {
          from: 'campaigns',
          localField: 'campaignId',
          foreignField: '_id',
          as: 'campaign'
        }
      },
      { $unwind: '$campaign' },
      {
        $match: {
          ...matchConditions,
          'campaign.game': game || { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            campaignId: '$campaignId',
            difficulty: '$difficulty'
          },
          bestTime: { $min: '$speedrun.completionTime' },
          bestCompletion: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'bestCompletion.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          campaign: '$bestCompletion.campaign',
          difficulty: '$_id.difficulty',
          completionTime: '$bestTime',
          user: {
            username: '$user.username',
            profileImage: '$user.profileImage'
          },
          videoProof: '$bestCompletion.speedrun.videoProof',
          completedAt: '$bestCompletion.completedAt'
        }
      },
      { $sort: { completionTime: 1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(leaderboards);
  } catch (error) {
    console.error('Error fetching speedrun leaderboards:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard data' });
  }
});

/**
 * Check and award campaign-related achievements
 */
async function checkCampaignAchievements(userId, campaign) {
  try {
    const completions = await CampaignCompletion.find({ userId });
    const totalCompleted = completions.length;

    // First mission completion
    if (totalCompleted === 1) {
      await AchievementService.awardAchievement(userId, 'first_campaign_mission');
    }

    // Mission milestone achievements
    const milestones = [5, 10, 25, 50, 100];
    for (const milestone of milestones) {
      if (totalCompleted === milestone) {
        await AchievementService.awardAchievement(userId, `campaign_missions_${milestone}`);
      }
    }

    // Game-specific achievements
    const gameCompletions = completions.filter(c => c.campaign?.game === campaign.game);
    if (gameCompletions.length === 1) {
      await AchievementService.awardAchievement(userId, `first_${campaign.game}_mission`);
    }

    // Campaign completion achievements
    const campaignCompletions = await CampaignCompletion.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'campaigns',
          localField: 'campaignId',
          foreignField: '_id',
          as: 'campaign'
        }
      },
      { $unwind: '$campaign' },
      {
        $group: {
          _id: {
            game: '$campaign.game',
            expansion: '$campaign.expansion',
            campaignName: '$campaign.campaignName'
          },
          completedMissions: { $sum: 1 }
        }
      }
    ]);

    // Check if any campaign is fully completed
    for (const campaignGroup of campaignCompletions) {
      const totalMissions = await Campaign.countDocuments({
        game: campaignGroup._id.game,
        expansion: campaignGroup._id.expansion,
        campaignName: campaignGroup._id.campaignName
      });

      if (campaignGroup.completedMissions === totalMissions) {
        const achievementId = `${campaignGroup._id.game}_${campaignGroup._id.expansion}_${campaignGroup._id.campaignName.toLowerCase().replace(/\s+/g, '_')}_complete`;
        await AchievementService.awardAchievement(userId, achievementId);
      }
    }

  } catch (error) {
    console.error('Error checking campaign achievements:', error);
  }
}

// GET /api/campaigns/user/achievement-progress - Get user's achievement progress for campaign preview
router.get('/user/achievement-progress', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const CampaignCompletion = require('../models/CampaignCompletion');
    const User = require('../models/User');

    // Get comprehensive campaign stats for achievement calculations
    const [
      totalCompletions,
      hardCompletions,
      speedrunCompletions,
      userCompletions,
      user
    ] = await Promise.all([
      CampaignCompletion.countDocuments({ userId }),
      CampaignCompletion.countDocuments({ userId, difficulty: 'hard' }),
      CampaignCompletion.countDocuments({ userId, 'speedrun.isSpeedrun': true }),
      CampaignCompletion.find({ userId }).populate('campaignId'),
      User.findById(userId)
    ]);

    // Calculate game-specific progress
    const gameProgress = {};
    const games = ['wc1', 'wc2', 'wc3'];
    
    for (const game of games) {
      const gameCompletions = userCompletions.filter(c => 
        c.campaignId && c.campaignId.game === game
      );
      gameProgress[game] = {
        totalMissions: gameCompletions.length,
        uniqueMissions: [...new Set(gameCompletions.map(c => c.campaignId._id.toString()))].length
      };
    }

    // Calculate speedrun time achievements
    const speedrunTimes = userCompletions
      .filter(c => c.speedrun?.isSpeedrun && c.speedrun?.completionTime)
      .map(c => c.speedrun.completionTime);

    const fastestSpeedrunTime = speedrunTimes.length > 0 ? Math.min(...speedrunTimes) : null;
    const under5MinuteRuns = speedrunTimes.filter(time => time < 300).length;
    const under10MinuteRuns = speedrunTimes.filter(time => time < 600).length;

    // Get current achievement status
    const currentAchievements = user.achievements?.completed || [];
    const achievementIds = currentAchievements.map(a => a.achievementId);

    res.json({
      success: true,
      data: {
        totalMissionsCompleted: totalCompletions,
        hardMissionsCompleted: hardCompletions,
        speedrunMissionsCompleted: speedrunCompletions,
        gameProgress,
        speedrunStats: {
          fastestTime: fastestSpeedrunTime,
          under5Minutes: under5MinuteRuns,
          under10Minutes: under10MinuteRuns
        },
        unlockedAchievements: achievementIds,
        nextMilestones: {
          missions: [1, 5, 10, 25, 50, 100].find(m => m > totalCompletions),
          hardMissions: [1, 5, 10].find(m => m > hardCompletions),
          speedruns: [1, 5, 10].find(m => m > speedrunCompletions)
        }
      }
    });

  } catch (error) {
    console.error('Error getting achievement progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load achievement progress' 
    });
  }
});

module.exports = router; 