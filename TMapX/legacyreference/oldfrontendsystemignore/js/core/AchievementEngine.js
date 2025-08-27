/**
 * AchievementEngine.js - Unified Achievement System
 * 
 * Single source of truth for all achievement functionality.
 * Handles state management, API communication, and event coordination.
 */
import logger from '/js/utils/logger.js';

export class AchievementEngine {
  constructor() {
    this.achievements = new Map();
    this.userProgress = {
      experience: 0,
      level: 1,
      arenaGold: 0,
      honor: 0,
      completedAchievements: [],
      pendingNotifications: []
    };
    this.eventListeners = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the achievement system
   */
  async init() {
    if (this.isInitialized) return;try {
      // Initializing Achievement Engine...
      
      // Load achievement definitions and user progress
      await Promise.all([
        this.loadAchievementDefinitions(),
        this.loadUserProgress()
      ]);

      // Setup global achievement detection
      this.setupAchievementDetection();
      
      this.isInitialized = true;
      this.emit('engine:initialized');
      // Achievement Engine initialized
      
    } catch (error) {
      logger.error('Failed to initialize Achievement Engine', error);
      throw error;
    }
  }

  /**
   * Load achievement definitions from backend
   */
  async loadAchievementDefinitions() {
    try {
      const response = await fetch('/api/achievements/definitions', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load achievements: ${response.status}`);
      }
      
      const definitions = await response.json();
      
      // Store in Map for fast lookup
      definitions.forEach(achievement => {
        this.achievements.set(achievement.id, achievement);
      });
      
      // Loaded achievement definitions
      
    } catch (error) {
      logger.error('Failed to load achievement definitions', error);
      // Fallback to empty state
      this.achievements.clear();
    }
  }

  /**
   * Load user progress from API
   */
  async loadUserProgress() {
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error(`Failed to load user progress: ${response.status}`);
      }
      
      const userData = await response.json();
      
      // Update user progress
      this.userProgress = {
        experience: userData.experience || 0,
        level: Math.floor((userData.experience || 0) / 100) + 1,
        arenaGold: userData.arenaGold || 0,
        honor: userData.honor || 0,
        completedAchievements: userData.achievements?.completed || [],
        achievementsAwarded: userData.achievementsAwarded || 0
      };
      
      // User progress loaded:
      
      // Check for newly awarded achievements
      if (this.userProgress.achievementsAwarded > 0) {
        // Detected new achievement(s)!
        this.handleNewlyAwardedAchievements();
      }
      
    } catch (error) {
      logger.error('Failed to load user progress', error);
    }
  }

  /**
   * Setup automatic achievement detection for various events
   */
  setupAchievementDetection() {
    // Intercept fetch requests to detect achievement awards
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Clone response to read it without consuming the original
      const clonedResponse = response.clone();
      
      try {
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const data = await clonedResponse.json();
          
          // Check for achievement awards in response
          if (data.achievementsAwarded && data.achievementsAwarded > 0) {
            // Auto-detected achievement(s) awarded
            
            // Update user progress if provided
            if (data.userUpdates) {
              this.updateUserProgress(data.userUpdates);
            }
            
            // Trigger achievement celebration
            this.emit('achievements:awarded', {
              count: data.achievementsAwarded,
              userUpdates: data.userUpdates
            });
          }
        }
      } catch (error) {
        // Ignore JSON parsing errors for non-JSON responses
      }
      
      return response;};
  }

  /**
   * Handle newly awarded achievements
   */
  async handleNewlyAwardedAchievements() {
    // Refresh user progress to get latest data
    await this.loadUserProgress();
    
    // Trigger UI updates
    this.emit('achievements:awarded', {
      count: this.userProgress.achievementsAwarded
    });
  }

  /**
   * Update user progress data
   */
  updateUserProgress(updates) {
    const oldProgress = { ...this.userProgress };
    
    // Update progress
    Object.assign(this.userProgress, updates);
    
    // Recalculate level
    this.userProgress.level = Math.floor(this.userProgress.experience / 100) + 1;
    
    // Emit progress update event
    this.emit('progress:updated', {
      oldProgress,
      newProgress: this.userProgress,
      changes: this.getProgressChanges(oldProgress, this.userProgress)
    });
    
    // User progress updated:
  }

  /**
   * Get changes between old and new progress
   */
  getProgressChanges(oldProgress, newProgress) {
    const changes = {};
    
    if (oldProgress.experience !== newProgress.experience) {
      changes.experience = {
        old: oldProgress.experience,
        new: newProgress.experience,
        delta: newProgress.experience - oldProgress.experience
      };
    }
    
    if (oldProgress.level !== newProgress.level) {
      changes.level = {
        old: oldProgress.level,
        new: newProgress.level,
        leveledUp: true
      };
    }
    
    if (oldProgress.arenaGold !== newProgress.arenaGold) {
      changes.arenaGold = {
        old: oldProgress.arenaGold,
        new: newProgress.arenaGold,
        delta: newProgress.arenaGold - oldProgress.arenaGold
      };
    }
    
    if (oldProgress.honor !== newProgress.honor) {
      changes.honor = {
        old: oldProgress.honor,
        new: newProgress.honor,
        delta: newProgress.honor - oldProgress.honor
      };
    }
    
    return changes;}

  /**
   * Get achievement by ID
   */
  getAchievement(achievementId) {
    return this.achievements.get(achievementId);}

  /**
   * Get all achievements
   */
  getAllAchievements() {
    return Array.from(this.achievements.values());}

  /**
   * Get user's achievement completion status
   */
  isAchievementCompleted(achievementId) {
    return this.userProgress.completedAchievements.some(
      a => a.achievementId === achievementId
    );}

  /**
   * Get user progress for display
   */
  getUserProgress() {
    return { ...this.userProgress };}

  /**
   * Event system - Add listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Event system - Remove listener
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Event system - Emit event
   */
  emit(event, data = null) {
    if (!this.eventListeners.has(event)) return;const listeners = this.eventListeners.get(event);
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Error in achievement event listener for ${event}`, error);
      }
    });
  }

  /**
   * Force refresh all achievement data
   */
  async refresh() {
    // Refreshing achievement data...
    
    await Promise.all([
      this.loadAchievementDefinitions(),
      this.loadUserProgress()
    ]);
    
    this.emit('engine:refreshed');
  }

  /**
   * Cleanup
   */
  destroy() {
    this.eventListeners.clear();
    this.achievements.clear();
    this.isInitialized = false;
    
    // Restore original fetch
    if (window.fetch._original) {
      window.fetch = window.fetch._original;
    }
  }
}

// Global singleton instance
export const achievementEngine = new AchievementEngine(); 