const User = require('../models/User');
const Notification = require('../models/Notification');
const { getAchievementById, ACHIEVEMENT_TYPES, getAllAchievements } = require('../config/achievements');

class AchievementService {
  /**
   * Award an achievement to a user
   * @param {string} userId - The ID of the user
   * @param {string} achievementId - The ID of the achievement to award
   * @returns {Promise<Object>} The updated user and any new achievements
   */
  static async awardAchievement(userId, achievementId) {
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if achievement is already completed
    const isAlreadyCompleted = user.achievements.completed.some(
      a => a.achievementId === achievementId
    );

    if (isAlreadyCompleted) {
      return { user, newAchievements: [] };
    }

    // Add to completed achievements
    user.achievements.completed.push({
      achievementId,
      earnedAt: new Date()
    });

    // Update total points and count
    user.achievements.totalPointsEarned += achievement.rewards.experience;
    user.achievements.totalUnlocked += 1;

    // Apply all rewards
    // Experience points
    if (achievement.rewards.experience) {
      user.experience += achievement.rewards.experience;
      // Calculate new achievement level (every 100 exp = 1 level)
      user.achievementLevel = Math.floor(user.experience / 100) + 1;
    }
    
    // Honor points
    if (achievement.rewards.honorPoints) {
      user.honor += achievement.rewards.honorPoints;
    }
    
    // Arena gold
    if (achievement.rewards.arenaGold) {
      user.arenaGold += achievement.rewards.arenaGold;
    }

    await user.save();

    // Create achievement notification for the townhall dropdown
    try {
      await Notification.create({
        userId: userId,
        type: 'achievement',
        content: `🏆 Achievement Completed! "${achievement.name}" - ${achievement.description}`,
        data: {
          achievementId: achievement.id,
          achievementName: achievement.name,
          rewards: achievement.rewards
        }
      });
      console.log(`🏆 Achievement notification created for ${achievement.name} (${achievementId})`);
    } catch (notificationError) {
      console.error('❌ Error creating achievement notification:', notificationError);
      // Don't fail the achievement award if notification creation fails
    }

    return {
      user,
      newAchievements: [{
        ...achievement,
        earnedAt: new Date()
      }]
    };
  }

  /**
   * Update progress for an incremental achievement
   * @param {string} userId - The ID of the user
   * @param {string} achievementId - The ID of the achievement
   * @param {number} [amount=1] - Amount to increment progress by
   * @returns {Promise<Object>} The updated user and any new achievements
   */
  static async updateAchievementProgress(userId, achievementId, amount = 1) {
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    if (achievement.type !== ACHIEVEMENT_TYPES.INCREMENTAL &&
        achievement.type !== ACHIEVEMENT_TYPES.TIERED) {
      throw new Error('Achievement is not incremental or tiered');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if achievement is already completed
    const isCompleted = user.achievements.completed.some(
      a => a.achievementId === achievementId
    );

    if (isCompleted) {
      return { user, newAchievements: [] };
    }

    // Initialize progress if it doesn't exist
    if (!user.achievements.progress) {
      user.achievements.progress = new Map();
    }

    // Get current progress or default to 0
    const currentProgress = user.achievements.progress.get(achievementId) || 0;
    const newProgress = currentProgress + amount;

    // Update progress
    user.achievements.progress.set(achievementId, newProgress);

    let newAchievements = [];

    // Check if achievement target is reached
    if (achievement.type === ACHIEVEMENT_TYPES.INCREMENTAL) {
      if (newProgress >= achievement.target) {
        const result = await AchievementService.awardAchievement(userId, achievementId);
        newAchievements = result.newAchievements;
      }
    } else if (achievement.type === ACHIEVEMENT_TYPES.TIERED) {
      // For tiered achievements, check each tier
      for (const tier of achievement.tiers) {
        if (newProgress >= tier.threshold && currentProgress < tier.threshold) {
          // Award a copy of the achievement with the tier's rewards
          const tieredAchievement = { ...achievement, rewards: tier.rewards };
          const result = await this.awardTieredAchievement(user, tieredAchievement, tier.threshold);
          newAchievements.push(...result.newAchievements);
        }
      }
    }

    await user.save();
    return { user, newAchievements };
  }

  /**
   * Award a tiered achievement
   * @private
   */
  static async awardTieredAchievement(user, achievement, tier) {
    const achievementId = `${achievement.id}_${tier}`;

    // Check if this tier is already completed
    const isAlreadyCompleted = user.achievements.completed.some(
      a => a.achievementId === achievementId
    );

    if (isAlreadyCompleted) {
      return { user, newAchievements: [] };
    }

    // Add to completed achievements
    user.achievements.completed.push({
      achievementId,
      earnedAt: new Date(),
      tier
    });

    // Update total points and count
    user.achievements.totalPointsEarned += achievement.rewards?.experience || 0;
    user.achievements.totalUnlocked += 1;

    // Apply all rewards
    if (achievement.rewards) {
      // Experience points
      if (achievement.rewards.experience) {
        user.experience += achievement.rewards.experience;
        // Calculate new achievement level (every 100 exp = 1 level)
        user.achievementLevel = Math.floor(user.experience / 100) + 1;
      }
      
      // Honor points
      if (achievement.rewards.honorPoints) {
        user.honor += achievement.rewards.honorPoints;
      }
      
      // Arena gold
      if (achievement.rewards.arenaGold) {
        user.arenaGold += achievement.rewards.arenaGold;
      }
    }

    await user.save();

    // Create achievement notification for tiered achievements
    const tierName = `${achievement.name} (Tier ${tier})`;
    try {
      await Notification.create({
        userId: user._id,
        type: 'achievement',
        content: `🏆 Achievement Completed! "${tierName}" - ${achievement.description}`,
        data: {
          achievementId: achievementId,
          achievementName: tierName,
          rewards: achievement.rewards,
          tier: tier
        }
      });
      console.log(`🏆 Tiered achievement notification created for ${tierName} (${achievementId})`);
    } catch (notificationError) {
      console.error('❌ Error creating tiered achievement notification:', notificationError);
      // Don't fail the achievement award if notification creation fails
    }

    return {
      user,
      newAchievements: [{
        ...achievement,
        id: achievementId,
        name: tierName,
        earnedAt: new Date(),
        tier
      }]
    };
  }

  /**
   * Mark achievements as seen by user
   * @param {string} userId - The ID of the user
   * @param {Array<string>} achievementIds - Array of achievement IDs to mark as seen
   * @returns {Promise<Object>} Updated user
   */
  static async markAsSeen(userId, achievementIds) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Add to seen if not already there
    achievementIds.forEach(id => {
      if (!user.achievements.seen.includes(id)) {
        user.achievements.seen.push(id);
      }
    });

    await user.save();
    return user;
  }

  /**
   * Get a user's achievements with their progress
   * @param {string} userId - The ID of the user
   * @returns {Promise<Object>} The user's achievements and progress
   */
  static async getUserAchievements(userId) {
    try {
      const user = await User.findById(userId).select('achievements');
      if (!user) {
        throw new Error('User not found');
      }

      // Get all available achievements
      const allAchievements = getAllAchievements();

      // Map achievements to include user's progress
      const achievementsWithProgress = allAchievements.map(achievement => {
        const completed = user.achievements.completed.some(
          a => a.achievementId === achievement.id
        );

        let progress = 0;
        if (achievement.type === ACHIEVEMENT_TYPES.INCREMENTAL ||
            achievement.type === ACHIEVEMENT_TYPES.TIERED) {
          progress = user.achievements.progress.get(achievement.id) || 0;
        }

        return {
          ...achievement,
          completed,
          progress,
          earnedAt: completed
            ? user.achievements.completed.find(a => a.achievementId === achievement.id)?.earnedAt
            : null
        };
      });

      return {
        completed: user.achievements.completed,
        progress: user.achievements.progress,
        totalPointsEarned: user.achievements.totalPointsEarned || 0,
        totalUnlocked: user.achievements.totalUnlocked || 0,
        achievements: achievementsWithProgress
      };
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Get recently unlocked achievements for a user
   * @param {string} userId - User ID
   * @param {number} seconds - Number of seconds to look back
   * @returns {Promise<Array>} - Array of recently unlocked achievements
   */
  static async getRecentAchievements(userId, seconds = 60) {
    try {
      const user = await User.findById(userId).select('achievements');
      if (!user) {
        throw new Error('User not found');
      }

      // Get all available achievements
      const allAchievements = getAllAchievements();

      // Filter completed achievements by time
      const cutoffTime = new Date(Date.now() - seconds * 1000);
      const recentCompletions = user.achievements.completed.filter(
        achievement => achievement.earnedAt && achievement.earnedAt >= cutoffTime
      );

      // Combine with achievement details
      return recentCompletions.map(userAchievement => {
        const achievementDetails = allAchievements.find(a => a.id === userAchievement.achievementId);
        if (!achievementDetails) return null;

        return {
          id: achievementDetails.id,
          name: achievementDetails.name,
          description: achievementDetails.description,
          category: achievementDetails.category || 'general',
          rewards: achievementDetails.rewards,
          icon: achievementDetails.icon || 'trophy',
          rarity: achievementDetails.rarity || 'common',
          unlockedAt: userAchievement.earnedAt
        };
      }).filter(Boolean); // Remove null entries
    } catch (error) {
      console.error('Error getting recent achievements:', error);
      return [];
    }
  }

  /**
   * Check and award campaign completion achievements
   */
  async checkCampaignAchievements(userId, campaignCompletion) {
    try {
      const achievements = [];
      const CampaignCompletion = require('../models/CampaignCompletion');
      const Campaign = require('../models/Campaign');
      const User = require('../models/User');
      
      // Get user's campaign completion stats
      const [
        totalCompletions,
        hardCompletions, 
        speedrunCompletions,
        campaign,
        user
      ] = await Promise.all([
        CampaignCompletion.countDocuments({ userId }),
        CampaignCompletion.countDocuments({ userId, difficulty: 'hard' }),
        CampaignCompletion.countDocuments({ userId, 'speedrun.isSpeedrun': true }),
        Campaign.findById(campaignCompletion.campaignId),
        User.findById(userId)
      ]);

      console.log(`🏆 Checking campaign achievements for user ${userId}:`, {
        totalCompletions,
        hardCompletions,
        speedrunCompletions,
        currentMission: campaign?.missionName
      });

      // === MISSION COUNT ACHIEVEMENTS ===
      
      // First mission achievement
      if (totalCompletions === 1) {
        const achievement = await AchievementService.awardAchievement(userId, 'first_campaign_mission');
        if (achievement.newAchievements.length > 0) {
          achievements.push(...achievement.newAchievements);
        }
      }

      // Mission milestone achievements
      const missionMilestones = [5, 10, 25, 50, 100];
      for (const milestone of missionMilestones) {
        if (totalCompletions === milestone) {
          const achievement = await AchievementService.awardAchievement(userId, `campaign_missions_${milestone}`);
          if (achievement.newAchievements.length > 0) {
            achievements.push(...achievement.newAchievements);
          }
        }
      }

      // === DIFFICULTY-BASED ACHIEVEMENTS ===
      
      if (campaignCompletion.difficulty === 'hard') {
        // First hard mission
        if (hardCompletions === 1) {
          const achievement = await AchievementService.awardAchievement(userId, 'first_hard_mission');
          if (achievement.newAchievements.length > 0) {
            achievements.push(...achievement.newAchievements);
          }
        }
        
        // Hard mission milestones
        const hardMilestones = [5, 10];
        for (const milestone of hardMilestones) {
          if (hardCompletions === milestone) {
            const achievement = await AchievementService.awardAchievement(userId, `hard_missions_${milestone}`);
            if (achievement.newAchievements.length > 0) {
              achievements.push(...achievement.newAchievements);
            }
          }
        }
      }

      // === SPEEDRUN ACHIEVEMENTS ===
      
      if (campaignCompletion.speedrun?.isSpeedrun) {
        // First speedrun
        if (speedrunCompletions === 1) {
          const achievement = await AchievementService.awardAchievement(userId, 'first_speedrun');
          if (achievement.newAchievements.length > 0) {
            achievements.push(...achievement.newAchievements);
          }
        }
        
        // Speedrun milestones
        const speedrunMilestones = [5, 10];
        for (const milestone of speedrunMilestones) {
          if (speedrunCompletions === milestone) {
            const achievement = await AchievementService.awardAchievement(userId, `speedrun_${milestone}`);
            if (achievement.newAchievements.length > 0) {
              achievements.push(...achievement.newAchievements);
            }
          }
        }

        // Time-based speedrun achievements
        const completionTime = campaignCompletion.speedrun.completionTime;
        if (completionTime) {
          if (completionTime < 300) { // Under 5 minutes
            const achievement = await AchievementService.awardAchievement(userId, 'speedrun_under_5_minutes');
            if (achievement.newAchievements.length > 0) {
              achievements.push(...achievement.newAchievements);
            }
          } else if (completionTime < 600) { // Under 10 minutes
            const achievement = await AchievementService.awardAchievement(userId, 'speedrun_under_10_minutes');
            if (achievement.newAchievements.length > 0) {
              achievements.push(...achievement.newAchievements);
            }
          }
        }
      }

      // === GAME-SPECIFIC ACHIEVEMENTS ===
      
      if (campaign) {
        // Check first mission for each game
        const gameCompletions = await CampaignCompletion.find({
          userId,
          campaignId: { $in: await Campaign.find({ game: campaign.game }).distinct('_id') }
        });

        if (gameCompletions.length === 1) {
          const gameAchievements = {
            'wc1': 'first_wc1_mission',
            'wc2': 'first_wc2_mission', 
            'wc3': 'first_wc3_mission'
          };
          
          if (gameAchievements[campaign.game]) {
            const achievement = await AchievementService.awardAchievement(userId, gameAchievements[campaign.game]);
            if (achievement.newAchievements.length > 0) {
              achievements.push(...achievement.newAchievements);
            }
          }
        }

        // === MULTIPLE PLAYTHROUGH ACHIEVEMENTS ===
        
        const missionCompletions = await CampaignCompletion.find({
          userId,
          campaignId: campaignCompletion.campaignId
        });

        if (missionCompletions.length === 3) {
          const achievement = await AchievementService.awardAchievement(userId, 'multiple_playthroughs');
          if (achievement.newAchievements.length > 0) {
            achievements.push(...achievement.newAchievements);
          }
        }

        // Mission completionist (all three difficulties for WC3)
        if (campaign.game === 'wc3') {
          const difficulties = [...new Set(missionCompletions.map(c => c.difficulty))];
          
          if (difficulties.length === 3 && 
              difficulties.includes('story') && 
              difficulties.includes('normal') && 
              difficulties.includes('hard')) {
            const achievement = await AchievementService.awardAchievement(userId, 'mission_completionist');
            if (achievement.newAchievements.length > 0) {
              achievements.push(...achievement.newAchievements);
            }
          }
        }

        // === CAMPAIGN COMPLETION ACHIEVEMENTS ===
        
        await this.checkFullCampaignCompletions(userId, campaign, achievements);
      }

      console.log(`🏆 Campaign achievements awarded: ${achievements.length}`);
      achievements.forEach(ach => {
        console.log(`  ✅ ${ach.name} (+${ach.rewards.experience} exp, +${ach.rewards.arenaGold} gold, +${ach.rewards.honorPoints} honor)`);
      });

      return achievements;
    } catch (error) {
      console.error('Error checking campaign achievements:', error);
      return [];
    }
  }

  /**
   * Check for full campaign completion achievements
   */
  async checkFullCampaignCompletions(userId, currentCampaign, achievements) {
    const CampaignCompletion = require('../models/CampaignCompletion');
    const Campaign = require('../models/Campaign');

    try {
      // Get all campaigns for the current game/expansion/race combination
      const campaignsInSeries = await Campaign.find({
        game: currentCampaign.game,
        expansion: currentCampaign.expansion,
        race: currentCampaign.race,
        campaignName: currentCampaign.campaignName
      });

      const totalMissionsInCampaign = campaignsInSeries.length;

      // Get user's completions for this campaign series
      const userCompletionsInCampaign = await CampaignCompletion.find({
        userId,
        campaignId: { $in: campaignsInSeries.map(c => c._id) }
      });

      // Group by unique mission (since users can complete same mission multiple times)
      const uniqueCompletedMissions = [...new Set(userCompletionsInCampaign.map(c => c.campaignId.toString()))];

      console.log(`📊 Campaign progress for ${currentCampaign.game} ${currentCampaign.expansion} ${currentCampaign.race}:`, {
        completed: uniqueCompletedMissions.length,
        total: totalMissionsInCampaign
      });

      // Check if full campaign is completed
      if (uniqueCompletedMissions.length === totalMissionsInCampaign) {
        // Build achievement ID based on campaign
        let achievementId = null;
        
        // WC1 campaigns
        if (currentCampaign.game === 'wc1') {
          if (currentCampaign.race === 'human') {
            achievementId = 'wc1_human_campaign';
          } else if (currentCampaign.race === 'orc') {
            achievementId = 'wc1_orc_campaign';
          }
        }
        
        // WC2 campaigns
        else if (currentCampaign.game === 'wc2') {
          if (currentCampaign.expansion === 'base') {
            if (currentCampaign.race === 'human' || currentCampaign.race === 'alliance') {
              achievementId = 'wc2_human_campaign';
            } else if (currentCampaign.race === 'orc' || currentCampaign.race === 'horde') {
              achievementId = 'wc2_orc_campaign';
            }
          } else if (currentCampaign.expansion === 'btdp') {
            if (currentCampaign.race === 'human' || currentCampaign.race === 'alliance') {
              achievementId = 'wc2_btdp_human';
            } else if (currentCampaign.race === 'orc' || currentCampaign.race === 'horde') {
              achievementId = 'wc2_btdp_orc';
            }
          }
        }
        
        // WC3 campaigns
        else if (currentCampaign.game === 'wc3') {
          if (currentCampaign.expansion === 'roc') {
            if (currentCampaign.race === 'human') {
              achievementId = 'wc3_roc_human';
            } else if (currentCampaign.race === 'undead') {
              achievementId = 'wc3_roc_undead';
            } else if (currentCampaign.race === 'orc') {
              achievementId = 'wc3_roc_orc';
            } else if (currentCampaign.race === 'nightelf') {
              achievementId = 'wc3_roc_night_elf';
            }
          } else if (currentCampaign.expansion === 'tft') {
            if (currentCampaign.race === 'human') {
              achievementId = 'wc3_tft_human';
            } else if (currentCampaign.race === 'undead') {
              achievementId = 'wc3_tft_undead';
            } else if (currentCampaign.race === 'nightelf') {
              achievementId = 'wc3_tft_night_elf';
            }
          }
        }

        if (achievementId) {
          console.log(`🏆 Attempting to award campaign completion achievement: ${achievementId}`);
          const achievement = await AchievementService.awardAchievement(userId, achievementId);
          if (achievement.newAchievements.length > 0) {
            achievements.push(...achievement.newAchievements);
          }
        }

        // Check for completionist achievements
        await this.checkCompletionistAchievements(userId, currentCampaign.game, achievements);
      }

    } catch (error) {
      console.error('Error checking full campaign completions:', error);
    }
  }

  /**
   * Check for completionist achievements (completing all campaigns in a game)
   */
  async checkCompletionistAchievements(userId, game, achievements) {
    const CampaignCompletion = require('../models/CampaignCompletion');
    const Campaign = require('../models/Campaign');

    try {
      // Get all campaigns for this game
      const allCampaignsInGame = await Campaign.find({ game });
      const userCompletions = await CampaignCompletion.find({
        userId,
        campaignId: { $in: allCampaignsInGame.map(c => c._id) }
      });

      // Group campaigns by series to check completion
      const campaignSeries = {};
      allCampaignsInGame.forEach(campaign => {
        const key = `${campaign.game}_${campaign.expansion}_${campaign.race}_${campaign.campaignName}`;
        if (!campaignSeries[key]) {
          campaignSeries[key] = [];
        }
        campaignSeries[key].push(campaign._id.toString());
      });

      // Check which series are completed
      let completedSeries = 0;
      for (const [seriesKey, missionIds] of Object.entries(campaignSeries)) {
        const completedMissions = userCompletions.filter(c => 
          missionIds.includes(c.campaignId.toString())
        );
        const uniqueCompletedMissions = [...new Set(completedMissions.map(c => c.campaignId.toString()))];
        
        if (uniqueCompletedMissions.length === missionIds.length) {
          completedSeries++;
        }
      }

      const totalSeries = Object.keys(campaignSeries).length;
      
      console.log(`🎯 ${game} completionist check:`, { completedSeries, totalSeries });

      if (completedSeries === totalSeries) {
        let achievementId = null;
        
        switch (game) {
          case 'wc1':
            achievementId = 'wc1_completionist';
            break;
          case 'wc2':
            achievementId = 'wc2_completionist';
            break;
          case 'wc3':
            achievementId = 'wc3_completionist';
            break;
        }

        if (achievementId) {
          console.log(`🏆 Attempting to award completionist achievement: ${achievementId}`);
          const achievement = await AchievementService.awardAchievement(userId, achievementId);
          if (achievement.newAchievements.length > 0) {
            achievements.push(...achievement.newAchievements);
          }
        }

        // Check for ultimate Warcraft Master achievement
        await this.checkWarcraftMasterAchievement(userId, achievements);
      }

    } catch (error) {
      console.error('Error checking completionist achievements:', error);
    }
  }

  /**
   * Check for the ultimate Warcraft Master achievement
   */
  async checkWarcraftMasterAchievement(userId, achievements) {
    const User = require('../models/User');

    try {
      const user = await User.findById(userId);
      const completedAchievements = user.achievements.completed.map(a => a.achievementId);

      const hasAllCompletionist = [
        'wc1_completionist',
        'wc2_completionist', 
        'wc3_completionist'
      ].every(achId => completedAchievements.includes(achId));

      if (hasAllCompletionist) {
        console.log('🏆 Attempting to award Warcraft Master achievement');
        const achievement = await AchievementService.awardAchievement(userId, 'warcraft_master');
        if (achievement.newAchievements.length > 0) {
          achievements.push(...achievement.newAchievements);
        }
      }

    } catch (error) {
      console.error('Error checking Warcraft Master achievement:', error);
    }
  }

  /**
   * Check and award map upload achievements
   */
  async checkMapUploadAchievements(userId) {
    console.log(`🗺️ checkMapUploadAchievements called for user: ${userId}`);
    
    try {
      const achievements = [];
      const War2Map = require('../models/War2Map');
      const User = require('../models/User');
      
      console.log('🗺️ Loading user and counting maps...');
      
      // Get user's map upload count
      const mapCount = await War2Map.countDocuments({ uploadedBy: userId });
      const user = await User.findById(userId);

      console.log(`🗺️ Checking map upload achievements for user ${userId}: ${mapCount} maps uploaded`);
      console.log(`🗺️ User found: ${!!user}, user achievements count: ${user?.achievements?.completed?.length || 0}`);

      // === CARTOGRAPHER ACHIEVEMENT ===
      // Award on first map upload
      if (mapCount === 1) {
        console.log('🏆 User has exactly 1 map - checking CARTOGRAPHER achievement...');
        try {
          const achievement = await AchievementService.awardAchievement(userId, 'cartographer');
          console.log('🏆 CARTOGRAPHER achievement object:', achievement);
          console.log('🏆 CARTOGRAPHER award result:', {
            success: true,
            newAchievements: achievement?.newAchievements?.length || 0,
            achievementIds: achievement?.newAchievements?.map(a => a.id) || []
          });
          if (achievement?.newAchievements?.length > 0) {
            achievements.push(...achievement.newAchievements);
          }
        } catch (cartographerError) {
          console.error('❌ Error awarding CARTOGRAPHER achievement:', cartographerError);
        }
      } else {
        console.log(`🏆 User has ${mapCount} maps - CARTOGRAPHER not applicable (requires exactly 1)`);
      }

      // === MAP MASTER ACHIEVEMENT ===
      // Award when user has uploaded 5 maps
      if (mapCount === 5) {
        const achievement = await AchievementService.awardAchievement(userId, 'map_master');
        if (achievement?.newAchievements?.length > 0) {
          achievements.push(...achievement.newAchievements);
        }
      }

      return achievements;

    } catch (error) {
      console.error('Error checking map upload achievements:', error);
      return [];
    }
  }
}

module.exports = AchievementService;
