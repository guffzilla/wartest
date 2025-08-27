/**
 * AchievementManager.js - Enhanced Achievement System
 * 
 * Handles achievement display with categorization, completion status filtering,
 * and detailed achievement information including rewards and objectives.
 */
import logger from '/js/utils/logger.js';
import { apiClient } from './ApiClient.js';

export class AchievementManager {
  constructor() {
    this.achievements = [];
    this.userAchievements = {};
    this.currentTab = 'arena-achievements';
    this.currentStatus = 'all';
    this.currentGameTab = 'wc1'; // For war table
    this.isInitialized = false;
    
    // AchievementManager initialized
  }

  /**
   * Initialize the achievement manager
   */
  async init() {
    if (this.isInitialized) return;try {
        // Initializing AchievementManager...
        
        // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      // Load achievement data
      await this.loadAchievements();
      
      // Wait a bit for the DOM to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Set initial state to arena achievements
      this.currentTab = 'arena-achievements';
      this.currentStatus = 'all';
      this.currentGameTab = 'wc1';
      
      // Ensure proper initial tab state
      this.switchMainTab('arena-achievements');
      
      // Update summary stats
      this.updateSummaryStats();
      
              this.isInitialized = true;
        // AchievementManager initialized successfully
        
      } catch (error) {
      logger.error('❌ Failed to initialize AchievementManager:', error);
      this.showError('Failed to load achievements. Please refresh to try again.');
    }
  }

  /**
   * Load achievements from the API
   */
      async loadAchievements() {
      try {
        // Loading achievements data...
        
        // Use existing ProfileDataLoader if available
      if (window.profileDataLoader && typeof window.profileDataLoader.loadAchievementData === 'function') {
        const achievementData = await window.profileDataLoader.loadAchievementData();
        this.achievements = achievementData.achievements || [];
                  this.userAchievements = {
            totalUnlocked: achievementData.totalUnlocked || 0,
            totalPointsEarned: achievementData.totalPointsEarned || 0,
            completed: this.achievements.filter(a => a.completed)
          };
          // Loaded achievements via ProfileDataLoader
          return;}
      
      // Fallback to direct API calls
      const user = await this.getCurrentUser();
      const allAchievements = await apiClient.getAchievements();
      let userAchievementData = { completed: [], totalUnlocked: 0, totalPointsEarned: 0 };
      
      if (user) {
        try {
          userAchievementData = await apiClient.getUserAchievements(user.id);
        } catch (error) {
          logger.warn('Failed to load user achievements:', error);
        }
      }

      // Merge user completion data with achievement definitions
      this.achievements = allAchievements.map(achievement => {
        const userAchievement = userAchievementData.completed?.find(ua => ua.achievementId === achievement.id);
        return {
          ...achievement,
          completed: !!userAchievement,
          earnedAt: userAchievement?.earnedAt,
          tier: userAchievement?.tier
        };});

              this.userAchievements = userAchievementData;
        // Loaded achievements via API
        
      } catch (error) {
      logger.error('❌ Failed to load achievements:', error);
      throw error;
    }
  }

  /**
   * Get current user data
   */
  async getCurrentUser() {
    try {
      return await apiClient.getCurrentUser();
    } catch (error) {
      logger.warn('Could not fetch current user:', error);
    }
    return null;
  }

  /**
   * Setup event listeners for tabs and interactions
   */
  setupEventListeners() {
          // Main achievement tabs (Arena/Social/War Table)
      const mainTabs = document.querySelectorAll('.achievement-main-tab');
      // Found main achievement tabs
      
      mainTabs.forEach((tab, index) => {
        // Setting up listener for main tab
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          const tabId = e.currentTarget.dataset.tab;
          // Main tab clicked
          this.switchMainTab(tabId);
        });
      });

          // Completion status filters (All/Completed/In Progress)
      const filters = document.querySelectorAll('.achievement-filter');
      // Found achievement filters
      
      filters.forEach((filter, index) => {
        // Setting up listener for filter
        filter.addEventListener('click', (e) => {
          e.preventDefault();
          const status = e.currentTarget.dataset.status;
          const category = e.currentTarget.dataset.category;
          // Filter clicked
          this.switchStatusTab(status, category);
        });
      });

          // War Table game tabs (WC1/WC2/WC3)
      const gameTabs = document.querySelectorAll('.wartable-game-tab');
      // Found war table game tabs
      
      gameTabs.forEach((tab, index) => {
        // Setting up listener for game tab
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          const gameTab = e.currentTarget.dataset.game;
          // Game tab clicked
          this.switchGameTab(gameTab);
        });
      });

      // Achievement event listeners setup complete
  }

  /**
   * Switch main achievement tab (Arena/Social/War Table)
   */
      switchMainTab(tabId) {
      // Switching to main tab
      
      // Update button states
    document.querySelectorAll('.achievement-main-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`.achievement-main-tab[data-tab="${tabId}"]`).classList.add('active');

    // Update content visibility
    document.querySelectorAll('.achievement-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(`${tabId}-tab`);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    this.currentTab = tabId;
    this.currentStatus = 'all'; // Reset status filter
    
    // Reset filter states for the new tab
    this.resetFilterStates(tabId);
    
    // Render achievements for new tab
    this.renderAchievements();
  }

  /**
   * Switch completion status filter (All/Completed/In Progress)
   */
      switchStatusTab(status, category) {
      // Switching status filter
      
      // Update button states for this category only
    document.querySelectorAll(`.achievement-filter[data-category="${category}"]`).forEach(filter => {
      filter.classList.remove('active');
    });
    document.querySelector(`.achievement-filter[data-status="${status}"][data-category="${category}"]`).classList.add('active');

    this.currentStatus = status;
    
    // Render achievements with new filter
    this.renderAchievements();
  }

  /**
   * Switch War Table game tab (WC1/WC2/WC3)
   */
      switchGameTab(gameTab) {
      // Switching to game tab
      
      // Update button states
    document.querySelectorAll('.wartable-game-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`.wartable-game-tab[data-game="${gameTab}"]`).classList.add('active');

    // Update content visibility
    document.querySelectorAll('.wartable-game-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(`${gameTab}-achievements-content`);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    this.currentGameTab = gameTab;
    this.currentStatus = 'all'; // Reset status filter
    
    // Reset filter states for the new game tab
    this.resetFilterStates(`wartable-achievements`, gameTab);
    
    // Render achievements for new game tab
    this.renderAchievements();
  }

  /**
   * Reset filter states to "All"
   */
  resetFilterStates(tabId, gameTab = null) {
    const category = gameTab || this.getCategoryFromTabId(tabId);
    
    // Reset all filters for this category
    document.querySelectorAll(`.achievement-filter[data-category="${category}"]`).forEach(filter => {
      filter.classList.remove('active');
    });
    
    // Activate "All" filter
    const allFilter = document.querySelector(`.achievement-filter[data-status="all"][data-category="${category}"]`);
    if (allFilter) {
      allFilter.classList.add('active');
    }
  }

  /**
   * Get category from tab ID
   */
  getCategoryFromTabId(tabId) {
    if (tabId.includes('arena')) return 'arena';if (tabId.includes('social')) return 'social';if (tabId.includes('wartable')) return this.currentGameTab;return 'arena';}

  /**
   * Render achievements based on current filters
   */
  renderAchievements() {
    // Rendering achievements for tab
    
    // Get container based on current tab
    const container = this.getContainerForCurrentTab();
    if (!container) {
      logger.error('Could not find container for current tab');
      return;}

    // Filter achievements based on current selections
    const filteredAchievements = this.filterAchievements();
    
    // Debug logging
    // Total achievements loaded
    // Filtered achievements for current tab
    if (filteredAchievements.length > 0) {
      // Sample achievements logged
    }
    
    // Render achievements
    container.innerHTML = this.createAchievementsHTML(filteredAchievements);
    
    // Rendered achievements
  }

  /**
   * Get the appropriate container for the current tab
   */
  getContainerForCurrentTab() {
    if (this.currentTab === 'wartable-achievements') {
      return document.getElementById(`${this.currentGameTab}-achievements-container`);} else {
      const category = this.getCategoryFromTabId(this.currentTab);
      return document.getElementById(`${category}-achievements-container`);}
  }

  /**
   * Filter achievements based on current selections
   */
  filterAchievements() {
    let filtered = [...this.achievements];
    
    // Filter by category/tab
    if (this.currentTab === 'arena-achievements') {
      filtered = filtered.filter(achievement => this.isArenaAchievement(achievement));
    } else if (this.currentTab === 'social-achievements') {
      filtered = filtered.filter(achievement => this.isSocialAchievement(achievement));
    } else if (this.currentTab === 'wartable-achievements') {
      filtered = filtered.filter(achievement => this.isWarTableAchievement(achievement, this.currentGameTab));
    }
    
    // Filter by completion status (show all by default)
    if (this.currentStatus === 'completed') {
      filtered = filtered.filter(achievement => achievement.completed);
    } else if (this.currentStatus === 'incomplete') {
      filtered = filtered.filter(achievement => !achievement.completed);
    }
    // 'all' status shows everything - no additional filtering needed
    
    return filtered;}

  /**
   * Check if achievement belongs to Arena category
   */
  isArenaAchievement(achievement) {
    // Based on achievement categories and tags
    const arenaCategories = ['match', 'ladder', 'pvp', 'barracks', 'test'];
    const arenaTags = ['match', 'ladder', 'pvp', 'wins', 'games', 'barracks', 'player', 'test'];
    const arenaKeywords = ['match', 'ladder', 'barracks', 'test', 'win', 'game', 'arena', 'player'];
    
    // Check category
    if (arenaCategories.includes(achievement.category)) return true;if (achievement.tags && achievement.tags.some(tag => arenaTags.includes(tag))) return true;if (arenaKeywords.some(keyword => achievement.id.toLowerCase().includes(keyword))) return true;if (arenaKeywords.some(keyword => achievement.name.toLowerCase().includes(keyword))) return true;if (!achievement.category || achievement.category === 'general') return true;return false;}

  /**
   * Check if achievement belongs to Social category
   */
  isSocialAchievement(achievement) {
    const socialCategories = ['social', 'clan', 'forum', 'community'];
    const socialTags = ['social', 'clan', 'forum', 'friend', 'community', 'chat'];
    const socialKeywords = ['friend', 'clan', 'forum', 'social', 'community', 'chat', 'message'];
    
    // Check category
    if (socialCategories.includes(achievement.category)) return true;if (achievement.tags && achievement.tags.some(tag => socialTags.includes(tag))) return true;if (socialKeywords.some(keyword => achievement.id.toLowerCase().includes(keyword))) return true;if (socialKeywords.some(keyword => achievement.name.toLowerCase().includes(keyword))) return true;return false;}

  /**
   * Check if achievement belongs to War Table category (campaigns)
   */
  isWarTableAchievement(achievement, gameType) {
    const warTableCategories = ['campaign', 'mission', 'speedrun'];
    const warTableTags = ['campaign', 'mission', 'speedrun', 'pve'];
    const warTableKeywords = ['campaign', 'mission', 'speedrun', 'pve', 'quest', 'story'];
    
    // Check category
    if (warTableCategories.includes(achievement.category)) {
      // Filter by specific game if specified
      if (gameType) {
        return achievement.id.includes(gameType) || 
               achievement.name.toLowerCase().includes(gameType) ||
               (achievement.tags && achievement.tags.includes(gameType));}
      return true;}
    
    // Check tags
    if (achievement.tags && achievement.tags.some(tag => warTableTags.includes(tag))) {
      if (gameType) {
        return achievement.id.includes(gameType) || 
               achievement.name.toLowerCase().includes(gameType) ||
               (achievement.tags && achievement.tags.includes(gameType));}
      return true;}
    
    // Check keywords
    if (warTableKeywords.some(keyword => achievement.id.toLowerCase().includes(keyword)) ||
        warTableKeywords.some(keyword => achievement.name.toLowerCase().includes(keyword))) {
      if (gameType) {
        return achievement.id.includes(gameType) || 
               achievement.name.toLowerCase().includes(gameType) ||
               (achievement.tags && achievement.tags.includes(gameType));}
      return true;}
    
    return false;}

  /**
   * Create HTML for achievements list
   */
  createAchievementsHTML(achievements) {
    if (achievements.length === 0) {
      return this.createEmptyStateHTML();}

    const achievementsHTML = achievements.map(achievement => this.createAchievementCardHTML(achievement)).join('');
    
    return `
      <div class="achievements-grid">
        ${achievementsHTML}
      </div>
    `;}

  /**
   * Create HTML for a single achievement card
   */
  createAchievementCardHTML(achievement) {
    const isCompleted = achievement.completed;
    const icon = isCompleted ? achievement.icon : 'fa-lock';
    const statusClass = isCompleted ? 'completed' : 'incomplete';
    const rarityClass = achievement.rarity ? `rarity-${achievement.rarity.toLowerCase()}` : 'rarity-common';
    
    // Format rewards
    const rewards = achievement.rewards || {};
    const rewardsList = [];
    if (rewards.experience) rewardsList.push(`<span class="reward-exp"><i class="fas fa-star"></i> ${rewards.experience} EXP</span>`);
    if (rewards.arenaGold) rewardsList.push(`<span class="reward-gold"><i class="fas fa-coins"></i> ${rewards.arenaGold} Gold</span>`);
    if (rewards.honorPoints) rewardsList.push(`<span class="reward-honor"><i class="fas fa-medal"></i> ${rewards.honorPoints} Honor</span>`);
    
    return `
      <div class="achievement-card ${statusClass} ${rarityClass}" data-achievement-id="${achievement.id}">
        <div class="achievement-header">
          <div class="achievement-icon">
            <i class="fas ${icon}"></i>
          </div>
          <div class="achievement-status-indicator">
            ${isCompleted ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-clock"></i>'}
          </div>
        </div>
        
        <div class="achievement-content">
          <h4 class="achievement-name">${this.escapeHtml(achievement.name)}</h4>
          <p class="achievement-description">${this.escapeHtml(achievement.description)}</p>
          
          ${achievement.target ? `
            <div class="achievement-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${isCompleted ? 100 : 0}%"></div>
              </div>
              <span class="progress-text">${isCompleted ? achievement.target : 0} / ${achievement.target}</span>
            </div>
          ` : ''}
          
          <div class="achievement-rewards">
            <div class="rewards-label">Rewards:</div>
            <div class="rewards-list">
              ${rewardsList.length > 0 ? rewardsList.join('') : '<span class="no-rewards">No rewards specified</span>'}
            </div>
          </div>
          
          ${isCompleted ? `
            <div class="achievement-completed">
              <i class="fas fa-trophy"></i>
              <span>Completed ${this.formatDate(achievement.earnedAt)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;}

  /**
   * Create empty state HTML
   */
  createEmptyStateHTML() {
    const category = this.getCategoryFromTabId(this.currentTab);
    const statusText = this.currentStatus === 'completed' ? 'completed' : 
                      this.currentStatus === 'incomplete' ? 'in progress' : '';
    
          // If showing "all" and still no achievements, show all achievements as fallback
      if (this.currentStatus === 'all' && this.achievements.length > 0) {
        logger.warn(`No achievements found for ${category}, showing all as fallback`);
        return this.createAchievementsHTML(this.achievements.slice(0, 10));}
    
    return `
      <div class="achievements-empty-state">
        <div class="empty-icon">
          <i class="fas fa-trophy"></i>
        </div>
        <h3>No ${statusText} achievements found</h3>
        <p>Keep playing and completing challenges to unlock more achievements!</p>
        ${this.currentStatus === 'all' ? '<p><small>If you expect to see achievements here, try refreshing the page.</small></p>' : ''}
      </div>
    `;}

  /**
   * Update summary statistics
   */
  updateSummaryStats() {
    const totalAchievements = this.achievements.length;
    const completedAchievements = this.achievements.filter(a => a.completed).length;
    const completionPercentage = totalAchievements > 0 ? Math.round((completedAchievements / totalAchievements) * 100) : 0;

    // Update DOM elements
    const totalElement = document.getElementById('total-achievements');
    const completedElement = document.getElementById('completed-achievements');
    const percentageElement = document.getElementById('completion-percentage');

    if (totalElement) totalElement.textContent = totalAchievements;
    if (completedElement) completedElement.textContent = completedAchievements;
          if (percentageElement) percentageElement.textContent = `${completionPercentage}%`;

      // Updated stats
  }

  /**
   * Show error message
   */
      showError(message) {
      logger.error('AchievementManager Error:', message);
      
      // Try to show in current container
    const container = this.getContainerForCurrentTab();
    if (container) {
      container.innerHTML = `
        <div class="achievement-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error Loading Achievements</h3>
          <p>${this.escapeHtml(message)}</p>
          <button onclick="window.achievementManager.init()" class="retry-btn">
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Utility: Escape HTML
   */
  escapeHtml(text) {
    if (!text) return '';const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  /**
   * Utility: Format date
   */
  formatDate(dateString) {
    if (!dateString) return 'Unknown';try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });} catch (error) {
      return 'Unknown';}
  }

  /**
   * Force refresh achievements
   */
      async refresh() {
      // Refreshing achievements...
      await this.loadAchievements();
      this.renderAchievements();
    this.updateSummaryStats();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.achievements = [];
          this.userAchievements = {};
      this.isInitialized = false;
      // AchievementManager destroyed
  }
}

  // Create global instance
  window.AchievementManager = AchievementManager;
  // AchievementManager class available globally