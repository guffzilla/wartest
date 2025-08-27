const User = require('../models/User');
const Player = require('../models/Player');

/**
 * Centralized Avatar Service
 * 
 * This service manages user avatars based on their linked players.
 * Logic:
 * - Default avatar: /assets/img/ranks/emblem.png
 * - If user has linked players: highest rank image among all linked players
 * - Updates automatically when players are linked/unlinked or ranks change
 */
class AvatarService {
  
  /**
   * Calculate the appropriate avatar for a user based on their preferences and linked players
   * @param {string} userId - User ID
   * @returns {string} Avatar path
   */
  async calculateUserAvatar(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        console.log(`❌ User ${userId} not found`);
        return '/assets/img/ranks/emblem.png';
      }

      // Check user's avatar preferences
      let preferences = user.avatarPreferences || { type: 'default' };
      
      // LEGACY USER DETECTION: If user has no preferences but current avatar is not default emblem,
      // they're likely using the old auto-rank system - infer their preference
      if (!user.avatarPreferences && user.avatar && user.avatar !== '/assets/img/ranks/emblem.png') {
        console.log(`🔍 Legacy user ${user.username} detected - inferring preferences from current avatar: ${user.avatar}`);
        
        // If current avatar is a rank image, assume they prefer highest_rank
        if (user.avatar.includes('/assets/img/ranks/') && !user.avatar.includes('emblem.png')) {
          preferences = { type: 'highest_rank' };
          
          // Save the inferred preference
          user.avatarPreferences = {
            type: 'highest_rank',
            customImage: null,
            lastUpdated: new Date()
          };
          await user.save();
          console.log(`✅ Saved inferred preference for user ${user.username}: highest_rank`);
        }
      }
      
      console.log(`🎨 User ${user.username} avatar preference: ${preferences.type}`);

      // Handle each preference type
      switch (preferences.type) {
        case 'custom':
          if (preferences.customImage) {
            const customPath = `/assets/img/profiles/${preferences.customImage}`;
            console.log(`🖼️ User ${user.username} using custom avatar: ${customPath}`);
            return customPath;
          }
          // Fall through to default if no custom image selected
          console.log(`⚠️ User ${user.username} has custom preference but no image selected, falling back to default`);
          return '/assets/img/ranks/emblem.png';

        case 'highest_rank':
          // Find all players linked to this user
          const linkedPlayers = await Player.find({ user: userId });
          
          if (!linkedPlayers || linkedPlayers.length === 0) {
            console.log(`👤 User ${user.username} wants highest rank but has no linked players, using default avatar`);
            return '/assets/img/ranks/emblem.png';
          }

          // Find the player with the highest MMR
          const highestRankPlayer = linkedPlayers.reduce((highest, current) => {
            const currentMMR = current.mmr || 0;
            const highestMMR = highest.mmr || 0;
            return currentMMR > highestMMR ? current : highest;
          });

          if (highestRankPlayer && highestRankPlayer.rank && highestRankPlayer.rank.image) {
            console.log(`🏆 User ${user.username} avatar set to highest rank: ${highestRankPlayer.rank.name} (${highestRankPlayer.name})`);
            return highestRankPlayer.rank.image;
          }

          console.log(`👤 User ${user.username} wants highest rank but has no rank images, using default avatar`);
          return '/assets/img/ranks/emblem.png';

        case 'default':
        default:
          console.log(`👤 User ${user.username} using default avatar`);
          return '/assets/img/ranks/emblem.png';
      }
      
    } catch (error) {
      console.error('Error calculating user avatar:', error);
      return '/assets/img/ranks/emblem.png';
    }
  }

  /**
   * Update a user's avatar in the database
   * @param {string} userId - User ID
   * @param {string} avatarPath - Optional avatar path, if not provided it will be calculated
   * @returns {boolean} Success status
   */
  async updateUserAvatar(userId, avatarPath = null) {
    try {
      if (!avatarPath) {
        avatarPath = await this.calculateUserAvatar(userId);
      }
      
      await User.findByIdAndUpdate(userId, { avatar: avatarPath });
      
      console.log(`✅ Updated avatar for user ${userId}: ${avatarPath}`);
      return true;
      
    } catch (error) {
      console.error('Error updating user avatar:', error);
      return false;
    }
  }

  /**
   * Update avatars for multiple users (when a player's rank changes)
   * @param {Array} userIds - Array of user IDs
   */
  async updateMultipleUserAvatars(userIds) {
    if (!userIds || userIds.length === 0) return;
    
    console.log(`🔄 Updating avatars for ${userIds.length} users`);
    
    for (const userId of userIds) {
      await this.updateUserAvatar(userId);
    }
  }

  /**
   * Get all users who have a specific player linked
   * @param {string} playerId - Player ID
   * @returns {Array} Array of user IDs
   */
  async getUsersWithPlayer(playerId) {
    try {
      const player = await Player.findById(playerId);
      if (player && player.user) {
        return [player.user.toString()];
      }
      return [];
    } catch (error) {
      console.error('Error finding users with player:', error);
      return [];
    }
  }

  /**
   * Handle player rank change - only update avatar if user prefers highest rank
   * @param {string} playerId - Player ID that had rank change
   * @returns {boolean} Success status
   */
  async handlePlayerRankChange(playerId) {
    try {
      const Player = require('../models/Player');
      const player = await Player.findById(playerId);
      
      if (!player || !player.user) {
        console.log(`❌ Player ${playerId} not found or not linked to user`);
        return false;
      }

      const user = await User.findById(player.user);
      if (!user) {
        console.log(`❌ User ${player.user} not found for player ${playerId}`);
        return false;
      }

      // Check user's avatar preferences
      const preferences = user.avatarPreferences || { type: 'default' };
      
      // Only update avatar if user prefers highest rank
      if (preferences.type === 'highest_rank') {
        console.log(`🎖️ User ${user.username} prefers highest rank - updating avatar after rank change`);
        await this.updateUserAvatar(user._id);
        return true;
      } else {
        console.log(`👤 User ${user.username} uses ${preferences.type} avatar - skipping rank change update`);
        return false;
      }
      
    } catch (error) {
      console.error('Error handling player rank change:', error);
      return false;
    }
  }

  /**
   * Handle player linking - update user's avatar
   * @param {string} userId - User ID
   * @param {string} playerId - Player ID being linked
   */
  async handlePlayerLink(userId, playerId) {
    try {
      console.log(`🔗 Player ${playerId} linked to user ${userId}, updating avatar`);
      
      // Calculate the new avatar after linking
      const newAvatar = await this.calculateUserAvatar(userId);
      console.log(`🎨 Calculated new avatar after link: ${newAvatar}`);
      
      // Update the user's avatar
      const success = await this.updateUserAvatar(userId, newAvatar);
      if (!success) {
        throw new Error('Failed to update user avatar in database');
      }
      console.log(`✅ Updated user ${userId} avatar after linking player ${playerId}`);
    } catch (error) {
      console.error('❌ Error handling player link:', error);
      console.error('Stack trace:', error.stack);
      throw error; // Re-throw so the endpoint can catch it
    }
  }

  /**
   * Handle player unlinking - update user's avatar
   * @param {string} userId - User ID
   * @param {string} playerId - Player ID being unlinked
   */
  async handlePlayerUnlink(userId, playerId) {
    try {
      console.log(`🔓 Player ${playerId} unlinked from user ${userId}, updating avatar`);
      
      // Calculate the new avatar after unlinking
      const newAvatar = await this.calculateUserAvatar(userId);
      console.log(`🎨 Calculated new avatar after unlink: ${newAvatar}`);
      
      // Update the user's avatar
      const success = await this.updateUserAvatar(userId, newAvatar);
      if (!success) {
        throw new Error('Failed to update user avatar in database');
      }
      console.log(`✅ Updated user ${userId} avatar after unlinking player ${playerId}`);
    } catch (error) {
      console.error('❌ Error handling player unlink:', error);
      console.error('Stack trace:', error.stack);
      throw error; // Re-throw so the endpoint can catch it
    }
  }

  /**
   * Initialize/fix avatars for all users in the system
   * Run this as a migration to set up the avatar system
   */
  async initializeAllUserAvatars() {
    try {
      console.log('🔄 Initializing avatars for all users...');
      
      const users = await User.find({}, '_id username');
      let updatedCount = 0;
      
      for (const user of users) {
        const success = await this.updateUserAvatar(user._id);
        if (success) updatedCount++;
      }
      
      console.log(`✅ Avatar initialization complete: ${updatedCount}/${users.length} users updated`);
      return { total: users.length, updated: updatedCount };
      
    } catch (error) {
      console.error('Error initializing user avatars:', error);
      throw error;
    }
  }
}

module.exports = new AvatarService(); 