const Player = require('../models/Player');
const User = require('../models/User');

/**
 * Player Service
 * Handles player-related operations and maintenance
 */
class PlayerService {
  
  /**
   * Check if a player is orphaned (linked to a deleted user)
   * @param {Object} player - Player document
   * @returns {Promise<boolean>} - True if player is orphaned
   */
  static async isPlayerOrphaned(player) {
    if (!player.user) {
      return false; // Not linked to any user
    }
    
    const user = await User.findById(player.user);
    return !user; // True if user doesn't exist (orphaned)
  }
  
  /**
   * Unlink an orphaned player
   * @param {Object} player - Player document
   * @returns {Promise<Object>} - Updated player document
   */
  static async unlinkOrphanedPlayer(player) {
    player.user = null;
    player.claimed = false;
    return await player.save();
  }
  
  /**
   * Find all orphaned players
   * @returns {Promise<Array>} - Array of orphaned players
   */
  static async findOrphanedPlayers() {
    const linkedPlayers = await Player.find({ 
      user: { $ne: null },
      claimed: true 
    });
    
    const orphanedPlayers = [];
    
    for (const player of linkedPlayers) {
      const isOrphaned = await this.isPlayerOrphaned(player);
      if (isOrphaned) {
        orphanedPlayers.push(player);
      }
    }
    
    return orphanedPlayers;
  }
  
  /**
   * Clean up all orphaned players
   * @returns {Promise<Object>} - Cleanup results
   */
  static async cleanupOrphanedPlayers() {
    const orphanedPlayers = await this.findOrphanedPlayers();
    let cleanedCount = 0;
    
    for (const player of orphanedPlayers) {
      await this.unlinkOrphanedPlayer(player);
      cleanedCount++;
    }
    
    return {
      found: orphanedPlayers.length,
      cleaned: cleanedCount,
      orphanedPlayers: orphanedPlayers.map(p => ({
        id: p._id,
        name: p.name,
        deletedUserId: p.user
      }))
    };
  }
  
  /**
   * Validate player link before allowing operations
   * This checks if a player linked to a user still has a valid user
   * @param {Object} player - Player document
   * @returns {Promise<Object>} - Validation result
   */
  static async validatePlayerLink(player) {
    if (!player.user) {
      return { isValid: true, reason: 'Player not linked to any user' };
    }
    
    const user = await User.findById(player.user);
    if (!user) {
      return { 
        isValid: false, 
        reason: 'Player linked to deleted user',
        isOrphaned: true,
        deletedUserId: player.user
      };
    }
    
    return { 
      isValid: true, 
      reason: 'Player linked to valid user',
      linkedUser: {
        id: user._id,
        username: user.username
      }
    };
  }
}

module.exports = PlayerService; 