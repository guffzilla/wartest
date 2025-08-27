/**
 * Match Achievement Service
 * 
 * This service handles updating achievement progress when matches are reported.
 * It connects the match reporting system to the achievements system.
 */

const AchievementService = require('./achievementService');
const Player = require('../models/Player');
const User = require('../models/User');

class MatchAchievementService {
  /**
   * Process achievements for a match
   * @param {Object} match - The match object
   * @param {Array} players - Array of player objects with user IDs
   */
  static async processMatchAchievements(match) {
    try {
      // Process achievements for each player in the match
      for (const playerData of match.players) {
        // Skip AI players
        if (playerData.isAI) continue;

        // Get the player
        const player = await Player.findById(playerData.playerId).populate('user');
        
        // Skip if player has no user account
        if (!player || !player.user) continue;
        
        // Process achievements for this player
        await this.processPlayerAchievements(player.user._id, match, playerData);
      }
    } catch (error) {
      console.error('Error processing match achievements:', error);
    }
  }

  /**
   * Process achievements for a specific player
   * @param {String} userId - The user ID
   * @param {Object} match - The match object
   * @param {Object} playerData - The player's data in the match
   */
  static async processPlayerAchievements(userId, match, playerData) {
    try {
      // Get match type and outcome
      const matchType = match.matchType;
      const outcome = playerData.result;
      const isWin = outcome === 'win';
      
      // 1. Update total games played achievement
      await AchievementService.updateAchievementProgress(userId, 'veteran', 1);
      
      // 2. Update match type specific achievements
      if (isWin) {
        switch (matchType) {
          case '1v1':
            await AchievementService.updateAchievementProgress(userId, 'wins_1v1', 1);
            break;
          case '2v2':
            await AchievementService.updateAchievementProgress(userId, 'wins_2v2', 1);
            break;
          case '3v3':
            await AchievementService.updateAchievementProgress(userId, 'wins_3v3', 1);
            break;
          case '4v4':
            await AchievementService.updateAchievementProgress(userId, 'wins_4v4', 1);
            break;
          case 'ffa':
            await AchievementService.updateAchievementProgress(userId, 'wins_ffa', 1);
            break;
          case 'vsai':
            await AchievementService.updateAchievementProgress(userId, 'wins_vsai', 1);
            
            // Check for AI game options
            if (match.aiGameOptions) {
              // Process campaign achievements if this is a campaign match
              if (match.aiGameOptions.gameType === 'campaign') {
                await this.processCampaignAchievements(userId, match.aiGameOptions);
              }
            }
            break;
        }
      }
      
      // 3. Update race-specific achievements
      if (playerData.race && isWin) {
        switch (playerData.race.toLowerCase()) {
          case 'human':
            await AchievementService.updateAchievementProgress(userId, 'human_wins', 1);
            break;
          case 'orc':
            await AchievementService.updateAchievementProgress(userId, 'orc_wins', 1);
            break;
        }
      }
      
      // 4. Update map-specific achievements
      if (match.map && match.map.name) {
        await AchievementService.updateAchievementProgress(userId, 'map_variety', 1);
      }
      
      // 5. Update resource level achievements
      if (match.resourceLevel && isWin) {
        switch (match.resourceLevel) {
          case 'low':
            await AchievementService.updateAchievementProgress(userId, 'low_resource_wins', 1);
            break;
        }
      }
      
      // 6. Check for win streak achievements
      await this.checkWinStreakAchievements(userId);
      
    } catch (error) {
      console.error(`Error processing achievements for user ${userId}:`, error);
    }
  }
  
  /**
   * Process campaign-specific achievements
   * @param {String} userId - The user ID
   * @param {Object} aiGameOptions - The AI game options
   */
  static async processCampaignAchievements(userId, aiGameOptions) {
    try {
      const { gameVersion, campaignMission } = aiGameOptions;
      
      // Update campaign mission completion
      if (gameVersion && campaignMission) {
        const achievementId = `campaign_${gameVersion}_${campaignMission.replace(/\s+/g, '_').toLowerCase()}`;
        await AchievementService.awardAchievement(userId, achievementId);
        
        // Check if all missions in this campaign are completed
        await this.checkCampaignCompletion(userId, gameVersion);
      }
    } catch (error) {
      console.error(`Error processing campaign achievements for user ${userId}:`, error);
    }
  }
  
  /**
   * Check if a user has completed all missions in a campaign
   * @param {String} userId - The user ID
   * @param {String} gameVersion - The game version (wc1, wc2, wc3)
   */
  static async checkCampaignCompletion(userId, gameVersion) {
    // This would check if all campaign missions for a specific game version are completed
    // and award a campaign completion achievement
    // Implementation depends on how campaign missions are tracked
  }
  
  /**
   * Check for win streak achievements
   * @param {String} userId - The user ID
   */
  static async checkWinStreakAchievements(userId) {
    // This would check the user's recent matches to determine win streaks
    // Implementation depends on how match history is tracked
  }
}

module.exports = MatchAchievementService;
