/**
 * User Deletion Service
 * 
 * Handles complete user account deletion and cleanup of all related data.
 * Preserves uploaded maps, added players, and tournaments (just unlinks them).
 * Handles clan leadership transfer or deletion.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const CampaignCompletion = require('../models/CampaignCompletion');

class UserDeletionService {
  /**
   * Delete user and cleanup all related data
   * @param {string} userId - The ID of the user to delete
   * @returns {Object} Summary of cleanup operations
   */
  static async deleteUserAndCleanup(userId) {
    console.log(`🗑️ Starting comprehensive deletion for user: ${userId}`);
    
    const cleanup = {
      user: false,
      campaignCompletions: 0,
      forumPosts: 0,
      forumComments: 0,
      chatMessages: 0,
      privateMessages: 0,
      friendConnections: 0,
      clanHandling: null,
      mapsUnlinked: 0,
      playersUnlinked: 0,
      tournamentsUnlinked: 0,
      errors: []
    };

    // Use sequential operations for maximum compatibility with all MongoDB deployments
    console.log('📊 Using sequential operations (no transactions) for maximum compatibility');
    
    try {
      // Run operations sequentially without transaction
      await this.performDeletionOperations(userId, cleanup, null);

    } catch (error) {
      console.error(`❌ Error during user deletion:`, error);
      cleanup.errors.push(error.message);
      throw error;
    }

    return cleanup;
  }

  /**
   * Perform all deletion operations without transactions
   */
  static async performDeletionOperations(userId, cleanup, session) {
    // Get user data before deletion for clan handling
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    console.log(`👤 Found user: ${user.username} (${user.email})`);

    // 1. Handle clan membership and leadership
    cleanup.clanHandling = await this.handleClanCleanup(userId);

    // 2. Delete campaign completion records
    cleanup.campaignCompletions = await this.deleteCampaignCompletions(userId);

    // 3. Handle forum posts and comments
    cleanup.forumPosts = await this.deleteForumPosts(userId);
    cleanup.forumComments = await this.deleteForumComments(userId);

    // 4. Handle chat and private messages
    cleanup.chatMessages = await this.deleteChatMessages(userId);
    cleanup.privateMessages = await this.deletePrivateMessages(userId);

    // 5. Remove friend connections
    cleanup.friendConnections = await this.removeFriendConnections(userId);

    // 6. Unlink maps (preserve the maps, just remove user reference)
    cleanup.mapsUnlinked = await this.unlinkMaps(userId);

    // 7. Unlink players (preserve the players, just remove user reference)
    cleanup.playersUnlinked = await this.unlinkPlayers(userId);

    // 8. Unlink tournaments (preserve tournaments and ALL participation data)
    // Tournaments created by user remain intact with all match history
    // Players added by user keep their tournament participation records
    cleanup.tournamentsUnlinked = await this.unlinkTournaments(userId);

    // 9. Handle any other user-specific collections
    await this.cleanupOtherCollections(userId);

    // 10. Finally, delete the user account itself
    await User.findByIdAndDelete(userId);
    cleanup.user = true;

    console.log(`✅ User deletion operations completed successfully`);
  }

  /**
   * Handle clan membership and leadership transfer
   */
  static async handleClanCleanup(userId) {
    try {
      // Check if Clan model exists
      let Clan;
      try {
        Clan = require('../models/Clan');
      } catch (error) {
        console.log('📝 Clan model not found, skipping clan cleanup');
        return { status: 'no_clan_model' };
      }

      // Find user's clan membership
      const userClan = await Clan.findOne({
        $or: [
          { leader: userId },
          { members: userId }
        ]
      });

      if (!userClan) {
        return { status: 'no_clan_membership' };
      }

      console.log(`🏰 User is in clan: ${userClan.name}`);

      // If user is the leader
      if (userClan.leader.toString() === userId.toString()) {
        // Find other members to transfer leadership to
        const otherMembers = userClan.members.filter(
          memberId => memberId.toString() !== userId.toString()
        );

        if (otherMembers.length > 0) {
          // Transfer leadership to the first other member
          const newLeader = otherMembers[0];
          userClan.leader = newLeader;
          userClan.members = userClan.members.filter(
            memberId => memberId.toString() !== userId.toString()
          );
          await userClan.save();
          
          console.log(`👑 Leadership transferred to user: ${newLeader}`);
          return { 
            status: 'leadership_transferred', 
            newLeader: newLeader.toString(),
            clanName: userClan.name 
          };
        } else {
          // No other members, delete the clan
          await Clan.findByIdAndDelete(userClan._id);
          console.log(`🏰 Clan deleted (no other members): ${userClan.name}`);
          return { 
            status: 'clan_deleted', 
            clanName: userClan.name 
          };
        }
      } else {
        // User is just a member, remove them
        userClan.members = userClan.members.filter(
          memberId => memberId.toString() !== userId.toString()
        );
        await userClan.save();
        
        console.log(`👥 User removed from clan: ${userClan.name}`);
        return { 
          status: 'removed_from_clan', 
          clanName: userClan.name 
        };
      }

    } catch (error) {
      console.error('Error handling clan cleanup:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Delete campaign completion records
   */
  static async deleteCampaignCompletions(userId) {
    try {
      const result = await CampaignCompletion.deleteMany({ userId });
      console.log(`📚 Deleted ${result.deletedCount} campaign completion records`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting campaign completions:', error);
      return 0;
    }
  }

  /**
   * Delete forum posts
   */
  static async deleteForumPosts(userId) {
    try {
      let ForumPost;
      try {
        ForumPost = require('../models/ForumPost');
      } catch (error) {
        console.log('📝 ForumPost model not found, skipping');
        return 0;
      }

      const result = await ForumPost.deleteMany({ author: userId });
      console.log(`📝 Deleted ${result.deletedCount} forum posts`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting forum posts:', error);
      return 0;
    }
  }

  /**
   * Delete forum comments
   */
  static async deleteForumComments(userId) {
    try {
      let ForumComment;
      try {
        ForumComment = require('../models/ForumComment');
      } catch (error) {
        console.log('📝 ForumComment model not found, skipping');
        return 0;
      }

      const result = await ForumComment.deleteMany({ author: userId });
      console.log(`💬 Deleted ${result.deletedCount} forum comments`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting forum comments:', error);
      return 0;
    }
  }

  /**
   * Delete chat messages
   */
  static async deleteChatMessages(userId) {
    try {
      let ChatMessage;
      try {
        ChatMessage = require('../models/ChatMessage');
      } catch (error) {
        console.log('💬 ChatMessage model not found, skipping');
        return 0;
      }

      const result = await ChatMessage.deleteMany({ user: userId });
      console.log(`💬 Deleted ${result.deletedCount} chat messages`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting chat messages:', error);
      return 0;
    }
  }

  /**
   * Delete private messages
   */
  static async deletePrivateMessages(userId) {
    try {
      let PrivateMessage;
      try {
        PrivateMessage = require('../models/PrivateMessage');
      } catch (error) {
        console.log('✉️ PrivateMessage model not found, skipping');
        return 0;
      }

      const result = await PrivateMessage.deleteMany({
        $or: [{ sender: userId }, { recipient: userId }]
      });
      console.log(`✉️ Deleted ${result.deletedCount} private messages`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting private messages:', error);
      return 0;
    }
  }

  /**
   * Remove friend connections (followers/following and Friend collection)
   */
  static async removeFriendConnections(userId) {
    try {
      let totalConnections = 0;

      // 1. Remove user from others' following lists (if using User model arrays)
      const followingResult = await User.updateMany(
        { following: userId },
        { $pull: { following: userId } }
      );

      // 2. Remove user from others' followers lists (if using User model arrays)
      const followersResult = await User.updateMany(
        { followers: userId },
        { $pull: { followers: userId } }
      );

      totalConnections += followingResult.modifiedCount + followersResult.modifiedCount;

      // 3. Remove all Friend collection entries involving this user
      let Friend;
      try {
        Friend = require('../models/Friend');

        // Delete all friend relationships where this user is involved
        const friendResult = await Friend.deleteMany({
          $or: [
            { user: userId },
            { friend: userId }
          ]
        });

        totalConnections += friendResult.deletedCount;
        console.log(`👥 Removed ${friendResult.deletedCount} friend relationships from Friend collection`);

      } catch (error) {
        console.log('📝 Friend model not found, skipping Friend collection cleanup');
      }

      console.log(`👥 Removed ${totalConnections} total friend connections`);
      return totalConnections;
    } catch (error) {
      console.error('Error removing friend connections:', error);
      return 0;
    }
  }

  /**
   * Unlink maps (preserve maps, remove user reference)
   */
  static async unlinkMaps(userId) {
    try {
      let Map;
      try {
        Map = require('../models/Map');
      } catch (error) {
        console.log('🗺️ Map model not found, skipping');
        return 0;
      }

      // Update maps to remove user reference (set uploadedBy to null or a system user)
      const result = await Map.updateMany(
        { uploadedBy: userId },
        { $unset: { uploadedBy: 1 } }
      );

      console.log(`🗺️ Unlinked ${result.modifiedCount} maps from user`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error unlinking maps:', error);
      return 0;
    }
  }

  /**
   * Unlink players (preserve players, remove user reference)
   */
  static async unlinkPlayers(userId) {
    try {
      let Player;
      try {
        Player = require('../models/Player');
      } catch (error) {
        console.log('🎮 Player model not found, skipping');
        return 0;
      }

      // Update players to remove user reference
      const result = await Player.updateMany(
        { addedBy: userId },
        { $unset: { addedBy: 1 } }
      );

      console.log(`🎮 Unlinked ${result.modifiedCount} players from user`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error unlinking players:', error);
      return 0;
    }
  }

  /**
   * Unlink tournaments (preserve tournaments and all participation data)
   */
  static async unlinkTournaments(userId) {
    try {
      let Tournament;
      try {
        Tournament = require('../models/Tournament');
      } catch (error) {
        console.log('🏆 Tournament model not found, skipping');
        return 0;
      }

      // Only unlink user as creator/organizer, preserve all tournament data and player participation
      const organizerResult = await Tournament.updateMany(
        { createdBy: userId },
        { $unset: { createdBy: 1 } }
      );

      const organizerResult2 = await Tournament.updateMany(
        { organizer: userId },
        { $unset: { organizer: 1 } }
      );

      // DO NOT remove player participation - tournaments should preserve all match history
      // Player participation is linked to Player documents, not User documents
      // The players will remain linked to tournaments with their match history intact

      const totalUnlinked = organizerResult.modifiedCount + organizerResult2.modifiedCount;
      console.log(`🏆 Unlinked user as organizer from ${totalUnlinked} tournaments (preserved all player participation and tournament data)`);
      return totalUnlinked;
    } catch (error) {
      console.error('Error unlinking tournaments:', error);
      return 0;
    }
  }

  /**
   * Clean up any other collections that might reference the user
   */
  static async cleanupOtherCollections(userId) {
    try {
      // Add cleanup for any other models that might reference users
      // This is a placeholder for future collections

      // Example: Notifications
      try {
        const Notification = require('../models/Notification');
        await Notification.deleteMany({
          $or: [{ userId }, { fromUserId: userId }]
        });
        console.log('🔔 Cleaned up notifications');
      } catch (error) {
        // Model doesn't exist, skip
      }

      // Example: Reports/Reviews
      try {
        const Review = require('../models/Review');
        await Review.deleteMany({ userId });
        console.log('⭐ Cleaned up reviews');
      } catch (error) {
        // Model doesn't exist, skip
      }

    } catch (error) {
      console.error('Error in cleanup of other collections:', error);
    }
  }

  /**
   * Clean up orphaned friend records (utility method for maintenance)
   * This can be called periodically to clean up friend records pointing to deleted users
   */
  static async cleanupOrphanedFriendRecords() {
    try {
      let Friend;
      try {
        Friend = require('../models/Friend');
      } catch (error) {
        console.log('📝 Friend model not found, skipping orphaned friend cleanup');
        return 0;
      }

      // Find all friend records
      const allFriends = await Friend.find({}).lean();
      let deletedCount = 0;

      for (const friendship of allFriends) {
        // Check if both users still exist
        const userExists = await User.findById(friendship.user);
        const friendExists = await User.findById(friendship.friend);

        if (!userExists || !friendExists) {
          await Friend.findByIdAndDelete(friendship._id);
          deletedCount++;
          console.log(`🧹 Deleted orphaned friend record: ${friendship._id}`);
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} orphaned friend records`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up orphaned friend records:', error);
      return 0;
    }
  }
}

module.exports = UserDeletionService; 