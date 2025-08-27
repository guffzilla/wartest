const GameUnit = require('../models/GameUnit');
const WikiEdit = require('../models/WikiEdit');
const WikiContribution = require('../models/WikiContribution');
const User = require('../models/User');
const AchievementService = require('./achievementService');
const Notification = require('../models/Notification');

class WikiService {
  /**
   * Submit a wiki edit for approval
   * @param {string} userId - User making the edit
   * @param {string} gameUnitId - Game unit being edited
   * @param {Object} editData - Edit data
   * @returns {Promise<Object>} Edit result
   */
  static async submitEdit(userId, gameUnitId, editData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const gameUnit = await GameUnit.findById(gameUnitId);
      if (!gameUnit) {
        throw new Error('Game unit not found');
      }

      // Get or create wiki contribution record
      let contribution = await WikiContribution.findOne({ user: userId });
      if (!contribution) {
        contribution = new WikiContribution({ user: userId });
        await contribution.save();
      }

      // Determine if edit should be auto-approved
      const shouldAutoApprove = this.shouldAutoApprove(contribution, editData);

      // Create edit record
      const wikiEdit = new WikiEdit({
        gameUnit: gameUnitId,
        editor: userId,
        editType: gameUnit.isNew ? 'create' : 'update',
        changes: {
          modifiedFields: editData.modifiedFields || [],
          previousData: this.extractRelevantData(gameUnit, editData.modifiedFields),
          newData: editData.newData || {},
          summary: editData.summary,
          description: editData.description
        },
        status: shouldAutoApprove ? 'auto_approved' : 'pending',
        sources: editData.sources || [],
        quality: this.calculateQualityScore(editData)
      });

      if (shouldAutoApprove) {
        wikiEdit.moderation.autoApproved = true;
        wikiEdit.moderation.autoApprovalReason = `High trust user (level ${contribution.reputation.trustLevel})`;
      }

      await wikiEdit.save();

      // If auto-approved, apply the changes immediately
      if (shouldAutoApprove) {
        await this.applyEdit(wikiEdit);
      }

      // Update contribution stats
      await this.updateContributionStats(userId, wikiEdit);

      // Award achievements
      await this.checkAndAwardAchievements(userId, wikiEdit);

      return {
        success: true,
        edit: wikiEdit,
        autoApproved: shouldAutoApprove,
        message: shouldAutoApprove ? 
          'Edit approved and applied automatically!' : 
          'Edit submitted for review. You will be notified when it is processed.'
      };

    } catch (error) {
      console.error('Error submitting wiki edit:', error);
      throw error;
    }
  }

  /**
   * Apply an approved edit to the game unit
   * @param {Object} wikiEdit - The approved wiki edit
   */
  static async applyEdit(wikiEdit) {
    try {
      const gameUnit = await GameUnit.findById(wikiEdit.gameUnit);
      if (!gameUnit) {
        throw new Error('Game unit not found');
      }

      // Apply changes
      const changes = wikiEdit.changes.newData;
      Object.keys(changes).forEach(field => {
        this.setNestedProperty(gameUnit, field, changes[field]);
      });

      gameUnit.lastUpdated = new Date();
      await gameUnit.save();

      return gameUnit;
    } catch (error) {
      console.error('Error applying wiki edit:', error);
      throw error;
    }
  }

  /**
   * Moderate a wiki edit (approve/reject)
   * @param {string} editId - Edit ID
   * @param {string} moderatorId - Moderator user ID
   * @param {string} action - 'approve' or 'reject'
   * @param {string} reason - Moderation reason
   */
  static async moderateEdit(editId, moderatorId, action, reason = '') {
    try {
      const wikiEdit = await WikiEdit.findById(editId);
      if (!wikiEdit) {
        throw new Error('Wiki edit not found');
      }

      const moderator = await User.findById(moderatorId);
      if (!moderator) {
        throw new Error('Moderator not found');
      }

      if (action === 'approve') {
        await wikiEdit.approve(moderatorId, reason);
        await this.applyEdit(wikiEdit);
        
        // Award rewards to the editor
        await this.awardEditRewards(wikiEdit.editor, wikiEdit);
        
        // Notify the editor
        await this.notifyEditApproved(wikiEdit);
        
      } else if (action === 'reject') {
        await wikiEdit.reject(moderatorId, reason);
        
        // Notify the editor
        await this.notifyEditRejected(wikiEdit, reason);
      }

      // Update contribution stats
      await this.updateContributionStats(wikiEdit.editor, wikiEdit);

      return wikiEdit;
    } catch (error) {
      console.error('Error moderating wiki edit:', error);
      throw error;
    }
  }

  /**
   * Vote on a wiki edit
   * @param {string} editId - Edit ID
   * @param {string} userId - User voting
   * @param {string} voteType - 'helpful' or 'unhelpful'
   */
  static async voteOnEdit(editId, userId, voteType) {
    try {
      const wikiEdit = await WikiEdit.findById(editId);
      if (!wikiEdit) {
        throw new Error('Wiki edit not found');
      }

      await wikiEdit.addVote(userId, voteType);

      // Update editor's contribution stats
      await this.updateContributionStats(wikiEdit.editor);

      // Check for community favorite achievement
      if (voteType === 'helpful') {
        await this.checkCommunityFavoriteAchievement(wikiEdit.editor);
      }

      return wikiEdit;
    } catch (error) {
      console.error('Error voting on wiki edit:', error);
      throw error;
    }
  }

  /**
   * Get edit history for a game unit
   * @param {string} gameUnitId - Game unit ID
   * @param {Object} options - Query options
   */
  static async getEditHistory(gameUnitId, options = {}) {
    try {
      const { page = 1, limit = 20, status = null } = options;
      
      const query = { gameUnit: gameUnitId };
      if (status) {
        query.status = status;
      }

      const edits = await WikiEdit.find(query)
        .populate('editor', 'username avatar')
        .populate('moderation.moderator', 'username')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await WikiEdit.countDocuments(query);

      return {
        edits,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting edit history:', error);
      throw error;
    }
  }

  /**
   * Get pending edits for moderation
   * @param {Object} options - Query options
   */
  static async getPendingEdits(options = {}) {
    try {
      const { page = 1, limit = 20, game = null } = options;
      
      const query = { status: 'pending' };

      const edits = await WikiEdit.find(query)
        .populate('gameUnit')
        .populate('editor', 'username avatar')
        .sort({ createdAt: 1 }) // Oldest first for FIFO processing
        .limit(limit)
        .skip((page - 1) * limit);

      // Filter by game if specified
      let filteredEdits = edits;
      if (game) {
        filteredEdits = edits.filter(edit => edit.gameUnit && edit.gameUnit.game === game);
      }

      return {
        edits: filteredEdits,
        pagination: {
          page,
          limit,
          total: filteredEdits.length
        }
      };
    } catch (error) {
      console.error('Error getting pending edits:', error);
      throw error;
    }
  }

  /**
   * Get user's wiki contribution stats
   * @param {string} userId - User ID
   */
  static async getUserContributionStats(userId) {
    try {
      let contribution = await WikiContribution.findOne({ user: userId });
      if (!contribution) {
        contribution = new WikiContribution({ user: userId });
        await contribution.save();
      }

      // Update stats
      await contribution.updateStats();

      return contribution;
    } catch (error) {
      console.error('Error getting user contribution stats:', error);
      throw error;
    }
  }

  // Helper methods

  static shouldAutoApprove(contribution, editData) {
    // Auto-approve for high trust users with simple edits
    if (contribution.reputation.trustLevel >= 7) {
      return true;
    }
    
    // Auto-approve small edits from trusted users
    if (contribution.reputation.trustLevel >= 5 && 
        editData.modifiedFields && 
        editData.modifiedFields.length <= 2) {
      return true;
    }
    
    // Auto-approve for users with excellent track record
    if (contribution.stats.totalEdits >= 20 && 
        contribution.stats.approvedEdits / contribution.stats.totalEdits >= 0.95) {
      return true;
    }
    
    return false;
  }

  static calculateQualityScore(editData) {
    let score = 50; // Base score
    
    // Points for good summary
    if (editData.summary && editData.summary.length >= 10) {
      score += 10;
    }
    
    // Points for detailed description
    if (editData.description && editData.description.length >= 50) {
      score += 15;
    }
    
    // Points for sources
    if (editData.sources && editData.sources.length > 0) {
      score += 20;
    }
    
    // Points for comprehensive changes
    if (editData.modifiedFields && editData.modifiedFields.length >= 3) {
      score += 10;
    }
    
    return {
      score: Math.min(100, score),
      factors: {
        completeness: editData.modifiedFields ? editData.modifiedFields.length * 10 : 0,
        formatting: editData.summary ? 50 : 20,
        sources: editData.sources ? editData.sources.length * 25 : 0
      }
    };
  }

  static extractRelevantData(gameUnit, modifiedFields) {
    const data = {};
    if (!modifiedFields) return data;
    
    modifiedFields.forEach(field => {
      data[field] = this.getNestedProperty(gameUnit, field);
    });
    
    return data;
  }

  static getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  static setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  static async updateContributionStats(userId, wikiEdit = null) {
    try {
      let contribution = await WikiContribution.findOne({ user: userId });
      if (!contribution) {
        contribution = new WikiContribution({ user: userId });
      }
      
      await contribution.updateStats();
      
      if (wikiEdit) {
        // Add recent activity
        contribution.recentActivity.unshift({
          editId: wikiEdit._id,
          activityType: wikiEdit.status === 'approved' ? 'edit_approved' : 'edit_created',
          details: {
            gameUnit: wikiEdit.gameUnit,
            summary: wikiEdit.changes.summary
          }
        });
        
        // Keep only last 20 activities
        contribution.recentActivity = contribution.recentActivity.slice(0, 20);
        
        await contribution.save();
      }
      
      return contribution;
    } catch (error) {
      console.error('Error updating contribution stats:', error);
      throw error;
    }
  }

  static async checkAndAwardAchievements(userId, wikiEdit) {
    try {
      const contribution = await WikiContribution.findOne({ user: userId });
      if (!contribution) return;

      // First edit achievement
      if (contribution.stats.totalEdits === 1) {
        await AchievementService.awardAchievement(userId, 'wiki_first_edit');
      }

      // Editor tier achievements
      const approvedCount = contribution.stats.approvedEdits;
      const tierThresholds = [5, 15, 50, 100, 250];
      tierThresholds.forEach(async (threshold, index) => {
        if (approvedCount >= threshold) {
          await AchievementService.updateAchievementProgress(userId, 'wiki_editor', approvedCount);
        }
      });

      // Quality contributor achievement
      if (contribution.stats.approvedEdits >= 10 && 
          contribution.stats.approvedEdits / contribution.stats.totalEdits >= 0.9 &&
          contribution.stats.averageQualityScore >= 70) {
        await AchievementService.awardAchievement(userId, 'wiki_quality');
      }

      // Game specialist achievements
      if (wikiEdit.gameUnit) {
        const gameUnit = await GameUnit.findById(wikiEdit.gameUnit);
        if (gameUnit) {
          const game = gameUnit.game;
          const gameEdits = contribution.stats.gamesContributed.filter(g => g === game).length;
          
          if (gameEdits >= 25) {
            await AchievementService.awardAchievement(userId, `wiki_${game}_specialist`);
          }
        }
      }

      // Comprehensive contributor achievement
      if (contribution.stats.gamesContributed.includes('wc1') &&
          contribution.stats.gamesContributed.includes('wc2') &&
          contribution.stats.gamesContributed.includes('wc3') &&
          contribution.stats.categoriesContributed.includes('unit') &&
          contribution.stats.categoriesContributed.includes('building') &&
          contribution.stats.totalEdits >= 75) {
        await AchievementService.awardAchievement(userId, 'wiki_comprehensive');
      }

    } catch (error) {
      console.error('Error checking wiki achievements:', error);
    }
  }

  static async checkCommunityFavoriteAchievement(userId) {
    try {
      const contribution = await WikiContribution.findOne({ user: userId });
      if (contribution && contribution.stats.totalHelpfulVotes >= 100) {
        await AchievementService.awardAchievement(userId, 'wiki_community_favorite');
      }
    } catch (error) {
      console.error('Error checking community favorite achievement:', error);
    }
  }

  static async awardEditRewards(userId, wikiEdit) {
    try {
      // Base rewards for approved edit
      let goldReward = 25;
      let honorReward = 10;
      let experienceReward = 15;

      // Quality bonus
      const qualityScore = wikiEdit.quality.score;
      if (qualityScore >= 80) {
        goldReward += 15;
        honorReward += 5;
        experienceReward += 10;
      } else if (qualityScore >= 60) {
        goldReward += 5;
        honorReward += 2;
        experienceReward += 5;
      }

      // Sources bonus
      if (wikiEdit.sources && wikiEdit.sources.length > 0) {
        goldReward += wikiEdit.sources.length * 5;
        experienceReward += wikiEdit.sources.length * 2;
      }

      // Community vote bonus
      if (wikiEdit.votes.helpful > wikiEdit.votes.unhelpful) {
        const voteDifference = wikiEdit.votes.helpful - wikiEdit.votes.unhelpful;
        goldReward += voteDifference * 2;
        honorReward += voteDifference;
      }

      // Apply rewards
      await User.findByIdAndUpdate(userId, {
        $inc: {
          arenaGold: goldReward,
          honor: honorReward,
          experience: experienceReward
        }
      });

      // Update contribution rewards
      const contribution = await WikiContribution.findOne({ user: userId });
      if (contribution) {
        contribution.addReward('edit_approved', goldReward, honorReward, experienceReward);
      }

      console.log(`🏆 Wiki edit rewards awarded to user ${userId}: +${goldReward} Gold, +${honorReward} Honor, +${experienceReward} EXP`);

    } catch (error) {
      console.error('Error awarding edit rewards:', error);
    }
  }

  static async notifyEditApproved(wikiEdit) {
    try {
      await Notification.create({
        user: wikiEdit.editor,
        type: 'wiki_edit_approved',
        title: 'Wiki Edit Approved',
        message: `Your edit to "${wikiEdit.changes.summary}" has been approved!`,
        data: {
          editId: wikiEdit._id,
          gameUnitId: wikiEdit.gameUnit
        }
      });
    } catch (error) {
      console.error('Error creating approval notification:', error);
    }
  }

  static async notifyEditRejected(wikiEdit, reason) {
    try {
      await Notification.create({
        user: wikiEdit.editor,
        type: 'wiki_edit_rejected',
        title: 'Wiki Edit Rejected',
        message: `Your edit to "${wikiEdit.changes.summary}" was rejected. Reason: ${reason}`,
        data: {
          editId: wikiEdit._id,
          gameUnitId: wikiEdit.gameUnit,
          reason
        }
      });
    } catch (error) {
      console.error('Error creating rejection notification:', error);
    }
  }
}

module.exports = WikiService;