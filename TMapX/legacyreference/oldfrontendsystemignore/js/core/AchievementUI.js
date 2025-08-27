/**
 * AchievementUI.js - Unified Achievement UI Controller
 * 
 * Handles all achievement-related UI updates, animations, and displays.
 * Single source of truth for all achievement visual elements.
 */
import logger from '/js/utils/logger.js';
import { achievementEngine } from './AchievementEngine.js';

export class AchievementUI {
  constructor() {
    this.isInitialized = false;
    this.activeNotifications = new Set();
    this.celebrationQueue = [];
  }

  /**
   * Initialize the achievement UI system
   */
  async init() {
    if (this.isInitialized) return;try {
      // Initializing Achievement UI...
      
      // Setup event listeners from achievement engine
      this.setupEventListeners();
      
      // Initialize UI state
      this.updateAllUIElements();
      
      // Setup CSS if needed
      this.injectRequiredStyles();
      
      this.isInitialized = true;
      // Achievement UI initialized
      
    } catch (error) {
      logger.error('Failed to initialize Achievement UI', error);
      throw error;
    }
  }

  /**
   * Setup event listeners from achievement engine
   */
  setupEventListeners() {
    // Listen for achievement awards
    achievementEngine.on('achievements:awarded', (data) => {
      this.handleAchievementAward(data);
    });

    // Listen for progress updates
    achievementEngine.on('progress:updated', (data) => {
      this.handleProgressUpdate(data);
    });

    // Listen for engine initialization
    achievementEngine.on('engine:initialized', () => {
      this.updateAllUIElements();
    });

    // Listen for engine refresh
    achievementEngine.on('engine:refreshed', () => {
      this.updateAllUIElements();
    });
  }

  /**
   * Handle achievement award event
   */
  async handleAchievementAward(data) {
    // Handling achievement award:
    
    // Update progress displays immediately
    this.updateProgressDisplays();
    
    // Show celebration if count provided
    if (data.count && data.count > 0) {
      this.showAchievementCelebration(data.count);
    }
    
    // Immediately refresh notifications with achievement data
    await this.refreshNotifications();
    
    // If we have specific achievement data, send it directly to notifications
    if (data.achievements && Array.isArray(data.achievements)) {
      data.achievements.forEach(achievement => {
        if (window.notificationsManager && typeof window.notificationsManager.handleAchievementNotification === 'function') {
          window.notificationsManager.handleAchievementNotification(achievement);
        }
      });
    }
    
    // Add to celebration queue
    this.celebrationQueue.push({
      count: data.count || 1,
      timestamp: Date.now()
    });
  }

  /**
   * Handle progress update event
   */
  handleProgressUpdate(data) {
    //📈 Handling progress update:
    
    // Update all progress displays
    this.updateProgressDisplays();
    
    // Show level up if level changed
    if (data.changes.level && data.changes.level.leveledUp) {
      this.showLevelUpCelebration(data.changes.level.new);
    }
    
    // Animate value changes
    this.animateProgressChanges(data.changes);
  }

  /**
   * Update all achievement-related UI elements
   */
  updateAllUIElements() {
    const progress = achievementEngine.getUserProgress();
    
    //🎨 Updating all UI elements with progress:
    
    // Update experience bars
    this.updateExperienceBars(progress);
    
    // Update level displays
    this.updateLevelDisplays(progress);
    
    // Update currency displays
    this.updateCurrencyDisplays(progress);
    
    // Update achievement counts
    this.updateAchievementCounts(progress);
  }

  /**
   * Update all experience bars on the page
   */
  updateExperienceBars(progress) {
    const currentLevelExp = progress.experience % 100;
    const progressPercentage = (currentLevelExp / 100) * 100;
    
    // Find ALL experience bars (handle duplicate IDs)
    const experienceBars = document.querySelectorAll('#experience-fill, [id="experience-fill"], .experience-fill');
    
          experienceBars.forEach((bar, index) => {
        bar.style.width = `${progressPercentage}%`;
        // Updated experience bar
      });
    
    // Update experience text displays
    const experienceTexts = document.querySelectorAll('#experience-text, [id="experience-text"], .experience-text');
    experienceTexts.forEach(element => {
      element.textContent = `${currentLevelExp} / 100 EXP`;
    });
  }

  /**
   * Update all level displays
   */
  updateLevelDisplays(progress) {
    const levelElements = document.querySelectorAll('#user-level, [id="user-level"], .user-level');
    
    levelElements.forEach(element => {
      if (element.tagName === 'SPAN') {
        element.textContent = progress.level;
      } else {
        element.textContent = `Level ${progress.level}`;
      }
    });
  }

  /**
   * Update currency displays (gold, honor)
   */
  updateCurrencyDisplays(progress) {
    // Arena Gold
    const goldElements = document.querySelectorAll('#arena-gold, #arena-points-small, .arena-gold');
    goldElements.forEach(element => {
      element.textContent = this.formatNumber(progress.arenaGold);
    });
    
    // Honor Points
    const honorElements = document.querySelectorAll('#honor-points, #honor-points-small, .honor-points');
    honorElements.forEach(element => {
      element.textContent = this.formatNumber(progress.honor);
    });
    
    // Total Points
    const total = progress.honor + progress.arenaGold;
    const totalElements = document.querySelectorAll('#total-points, .total-points');
    totalElements.forEach(element => {
      element.textContent = this.formatNumber(total);
    });
  }

  /**
   * Update achievement count displays
   */
  updateAchievementCounts(progress) {
    const completedCount = progress.completedAchievements.length;
    const totalCount = achievementEngine.getAllAchievements().length;
    
    // Total achievements
    const totalElements = document.querySelectorAll('#total-achievements, .total-achievements');
    totalElements.forEach(element => {
      element.textContent = completedCount;
    });
    
    // Completion percentage
    const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const percentElements = document.querySelectorAll('#completion-percentage, .completion-percentage');
    percentElements.forEach(element => {
      element.textContent = `${completionPercent}%`;
    });
  }

  /**
   * Update only progress displays (faster than full update)
   */
  updateProgressDisplays() {
    const progress = achievementEngine.getUserProgress();
    
    this.updateExperienceBars(progress);
    this.updateLevelDisplays(progress);
    this.updateCurrencyDisplays(progress);
  }

  /**
   * Show achievement celebration overlay
   */
  showAchievementCelebration(count = 1) {
    // Prevent duplicate celebrations
    const celebrationId = `achievement-${Date.now()}`;
    if (this.activeNotifications.has(celebrationId)) return;this.activeNotifications.add(celebrationId);
    
    // Create celebration overlay
    const celebration = document.createElement('div');
    celebration.className = 'achievement-celebration-overlay';
    celebration.id = celebrationId;
    celebration.innerHTML = `
      <div class="celebration-content">
        <div class="trophy-icon">🏆</div>
        <div class="celebration-text">
          <h3>Achievement${count > 1 ? 's' : ''} Unlocked!</h3>
          <p>${count} new achievement${count > 1 ? 's' : ''} earned</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(celebration);
    
    // Animate in
    setTimeout(() => celebration.classList.add('show'), 100);
    
    // Remove after delay
    setTimeout(() => {
      celebration.classList.remove('show');
      setTimeout(() => {
        if (celebration.parentNode) {
          celebration.parentNode.removeChild(celebration);
        }
        this.activeNotifications.delete(celebrationId);
      }, 300);
    }, 3000);
    
          // Showed achievement celebration
  }

  /**
   * Show level up celebration
   */
  showLevelUpCelebration(newLevel) {
    const celebration = document.createElement('div');
    celebration.className = 'level-up-celebration-overlay';
    celebration.innerHTML = `
      <div class="level-up-content">
        <h2>LEVEL UP!</h2>
        <div class="level-display">
          <span class="level-number">${newLevel}</span>
        </div>
        <p>Congratulations! You've reached level ${newLevel}!</p>
      </div>
    `;
    
    document.body.appendChild(celebration);
    
    // Animate in
    setTimeout(() => celebration.classList.add('show'), 100);
    
    // Remove after delay
    setTimeout(() => {
      celebration.classList.remove('show');
      setTimeout(() => {
        if (celebration.parentNode) {
          celebration.parentNode.removeChild(celebration);
        }
      }, 300);
    }, 3000);
    
          // Showed level up celebration
  }

  /**
   * Animate progress changes
   */
  animateProgressChanges(changes) {
    Object.keys(changes).forEach(type => {
      const change = changes[type];
      if (change.delta && change.delta > 0) {
        this.showFloatingText(`+${change.delta}`, type);
      }
    });
  }

  /**
   * Show floating text for progress changes
   */
  showFloatingText(text, type) {
    const floatingText = document.createElement('div');
    floatingText.className = `floating-text floating-${type}`;
    floatingText.textContent = text;
    
    // Position near relevant UI element
    const targetElement = document.querySelector(`#${type}-points, .${type}-points, #arena-gold, .arena-gold`);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      floatingText.style.position = 'fixed';
      floatingText.style.left = `${rect.right + 10}px`;
      floatingText.style.top = `${rect.top}px`;
      floatingText.style.zIndex = '10000';
      floatingText.style.pointerEvents = 'none';
    }
    
    document.body.appendChild(floatingText);
    
    // Animate and remove
    setTimeout(() => floatingText.classList.add('animate'), 50);
    setTimeout(() => {
      if (floatingText.parentNode) {
        floatingText.parentNode.removeChild(floatingText);
      }
    }, 2000);
  }

  /**
   * Refresh notifications display
   */
  async refreshNotifications() {
    //🔔 Refreshing notifications for achievement update...
    
    if (window.notificationsManager && typeof window.notificationsManager.loadNotifications === 'function') {
      // Immediate refresh for achievement notifications
      await window.notificationsManager.loadNotifications();
      //✅ Achievement notifications refreshed
          } else {
        logger.warn('NotificationsManager not available for refresh');
      }
    
    // Also trigger any other notification systems
    if (window.modernNavbar && typeof window.modernNavbar.refreshNotifications === 'function') {
      await window.modernNavbar.refreshNotifications();
    }
  }

  /**
   * Inject required CSS styles
   */
  injectRequiredStyles() {
    const styleId = 'achievement-ui-styles';
    if (document.getElementById(styleId)) return;const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      .achievement-celebration-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      
      .achievement-celebration-overlay.show {
        opacity: 1;
      }
      
      .celebration-content {
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        border: 2px solid #ffd700;
        border-radius: 15px;
        padding: 2rem;
        text-align: center;
        animation: bounceIn 0.6s ease-out;
      }
      
      @keyframes bounceIn {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); opacity: 1; }
      }
      
      .trophy-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: pulse 1s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .celebration-content h3 {
        color: #ffd700;
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
      }
      
      .celebration-content p {
        color: #fff;
        margin: 0;
        font-size: 1rem;
      }
      
      .level-up-celebration-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      
      .level-up-celebration-overlay.show {
        opacity: 1;
      }
      
      .level-up-content {
        text-align: center;
        color: white;
        animation: scaleIn 0.8s ease-out;
      }
      
      .level-up-content h2 {
        font-size: 3rem;
        color: #ffd700;
        margin: 0 0 1rem 0;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      }
      
      .level-number {
        font-size: 6rem;
        font-weight: bold;
        color: #ffd700;
        text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
      }
      
      @keyframes scaleIn {
        0% { transform: scale(0.5); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      .floating-text {
        font-weight: bold;
        font-size: 1.2rem;
        transition: all 2s ease;
        color: #ffd700;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      }
      
      .floating-text.animate {
        transform: translateY(-50px);
        opacity: 0;
      }
      
      .floating-experience { color: #4CAF50; }
      .floating-arenaGold { color: #FFC107; }
      .floating-honor { color: #9C27B0; }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Format number for display
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';} else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';}
    return num.toString();}

  /**
   * Force update all displays
   */
  forceUpdate() {
    this.updateAllUIElements();
  }

  /**
   * Cleanup
   */
  destroy() {
    // Remove event listeners
    achievementEngine.off('achievements:awarded', this.handleAchievementAward);
    achievementEngine.off('progress:updated', this.handleProgressUpdate);
    
    // Clear active notifications
    this.activeNotifications.clear();
    this.celebrationQueue = [];
    
    // Remove injected styles
    const styles = document.getElementById('achievement-ui-styles');
    if (styles) {
      styles.remove();
    }
    
    this.isInitialized = false;
  }
}

// Global singleton instance
export const achievementUI = new AchievementUI(); 