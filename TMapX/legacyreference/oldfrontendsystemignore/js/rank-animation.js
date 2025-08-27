/**
 * Rank Animation System
 *
 * This module provides animations for rank changes and achievements
 * to be displayed after match reporting.
 */

import logger from '/js/utils/logger.js';

class RankAnimationManager {
  constructor() {
    this.ranks = [];
    this.initialized = false;

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.loadRanks = this.loadRanks.bind(this);
    this.showRankUpAnimation = this.showRankUpAnimation.bind(this);
    this.showRankDownAnimation = this.showRankDownAnimation.bind(this);
    this.showAchievementUnlock = this.showAchievementUnlock.bind(this);
    this.hideAnimation = this.hideAnimation.bind(this);
  }

  /**
   * Initialize the rank animation system
   */
  async initialize() {
    if (this.initialized) return;try {
      await this.loadRanks();
      this.initialized = true;

      // Create animation container if it doesn't exist
      if (!document.getElementById('rank-animation-container')) {
        const container = document.createElement('div');
        container.id = 'rank-animation-container';
        document.body.appendChild(container);
      }

      // Add styles if not already present
      if (!document.getElementById('rank-animation-styles')) {
        const styles = document.createElement('style');
        styles.id = 'rank-animation-styles';
        styles.textContent = `
          #rank-animation-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            background-color: rgba(0, 0, 0, 0.8);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.5s ease;
          }

          #rank-animation-container.visible {
            opacity: 1;
            pointer-events: auto;
          }

          .rank-animation {
            text-align: center;
            color: white;
            max-width: 80%;
          }

          .rank-animation h2 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }

          .rank-animation-images {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 2rem 0;
          }

          .rank-image {
            width: 150px;
            height: 150px;
            object-fit: contain;
            transition: transform 0.5s ease, opacity 0.5s ease;
          }

          .rank-image.old {
            opacity: 0.5;
            transform: scale(0.8) translateX(-50px);
          }

          .rank-image.new {
            opacity: 1;
            transform: scale(1.2) translateX(50px);
          }

          .rank-arrow {
            font-size: 3rem;
            margin: 0 2rem;
            color: gold;
          }

          .rank-up .rank-arrow {
            color: #4CAF50;
          }

          .rank-down .rank-arrow {
            color: #F44336;
          }

          .rank-animation-message {
            font-size: 1.5rem;
            margin: 1rem 0;
          }

          .rank-animation-button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 1rem 2rem;
            font-size: 1.2rem;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 2rem;
            transition: background-color 0.3s ease;
          }

          .rank-animation-button:hover {
            background-color: #45a049;
          }

          /* Achievement animation styles */
          .achievement-unlock {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 1rem;
            border-radius: 5px;
            max-width: 300px;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
            border: 1px solid gold;
            animation: achievementSlideIn 0.5s ease, achievementGlow 2s infinite alternate;
          }

          @keyframes achievementSlideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }

          @keyframes achievementGlow {
            from { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
            to { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
          }

          /* Sound effects */
          .rank-sound {
            display: none;
          }
        `;
        document.head.appendChild(styles);
      }

      logger.info('[RankAnimation] Initialized successfully');
    } catch (error) {
      logger.error('[RankAnimation] Initialization failed:', error);
    }
  }

  /**
   * Load rank definitions from the server
   */
  async loadRanks() {
    try {
      const response = await fetch('/api/ladder/ranks');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      this.ranks = await response.json();
      logger.info('[RankAnimation] Loaded ranks:', this.ranks.length);
    } catch (error) {
      logger.error('[RankAnimation] Failed to load ranks:', error);
      // Use default ranks if API fails
      this.ranks = [
        { name: 'Bronze 3', image: '/assets/img/ranks/b3.png', threshold: 0 },
        { name: 'Bronze 2', image: '/assets/img/ranks/b2.png', threshold: 300 },
        { name: 'Bronze 1', image: '/assets/img/ranks/b1.png', threshold: 600 },
        { name: 'Gold 3', image: '/assets/img/ranks/g3.png', threshold: 900 },
        { name: 'Gold 2', image: '/assets/img/ranks/g2.png', threshold: 1200 },
        { name: 'Gold 1', image: '/assets/img/ranks/g1.png', threshold: 1500 },
        { name: 'Amber 3', image: '/assets/img/ranks/a3.png', threshold: 1800 },
        { name: 'Amber 2', image: '/assets/img/ranks/a2.png', threshold: 2100 },
        { name: 'Amber 1', image: '/assets/img/ranks/a1.png', threshold: 2400 },
        { name: 'Sapphire 3', image: '/assets/img/ranks/s3.png', threshold: 2700 },
        { name: 'Sapphire 2', image: '/assets/img/ranks/s2.png', threshold: 3000 },
        { name: 'Sapphire 1', image: '/assets/img/ranks/s1.png', threshold: 3300 },
        { name: 'Champion', image: '/assets/img/ranks/champion.png', threshold: 3600 }
      ];
    }
  }

  /**
   * Get rank by name
   * @param {string} rankName - Name of the rank
   * @returns {Object|null} - Rank object or null if not found
   */
  getRankByName(rankName) {
    return this.ranks.find(rank => rank.name === rankName) || null;}

  /**
   * Show rank up animation
   * @param {string} oldRankName - Previous rank name
   * @param {string} newRankName - New rank name
   */
  showRankUpAnimation(oldRankName, newRankName) {
    if (!this.initialized) {
      this.initialize().then(() => this.showRankUpAnimation(oldRankName, newRankName));
      return;}

    const oldRank = this.getRankByName(oldRankName);
    const newRank = this.getRankByName(newRankName);

    if (!oldRank || !newRank) {
      logger.error('[RankAnimation] Invalid rank names:', oldRankName, newRankName);
      return;}

    const container = document.getElementById('rank-animation-container');
    if (!container) return;container.innerHTML = `
      <div class="rank-animation rank-up">
        <h2>RANK UP!</h2>
        <div class="rank-animation-images">
          <img src="${oldRank.image}" alt="${oldRank.name}" class="rank-image old">
          <div class="rank-arrow">→</div>
          <img src="${newRank.image}" alt="${newRank.name}" class="rank-image new">
        </div>
        <div class="rank-animation-message">
          Congratulations! You've been promoted to <strong>${newRank.name}</strong>!
        </div>
        <button class="rank-animation-button">Continue</button>
        <audio class="rank-sound" autoplay>
          <source src="/assets/sounds/rank-up.mp3" type="audio/mpeg">
        </audio>
      </div>
    `;

    // Show animation
    container.classList.add('visible');

    // Add event listener to close button
    const closeButton = container.querySelector('.rank-animation-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideAnimation());
    }

    // Auto-hide after 10 seconds
    setTimeout(() => this.hideAnimation(), 10000);
  }

  /**
   * Show rank down animation
   * @param {string} oldRankName - Previous rank name
   * @param {string} newRankName - New rank name
   */
  showRankDownAnimation(oldRankName, newRankName) {
    if (!this.initialized) {
      this.initialize().then(() => this.showRankDownAnimation(oldRankName, newRankName));
      return;}

    const oldRank = this.getRankByName(oldRankName);
    const newRank = this.getRankByName(newRankName);

    if (!oldRank || !newRank) {
      logger.error('[RankAnimation] Invalid rank names:', oldRankName, newRankName);
      return;}

    const container = document.getElementById('rank-animation-container');
    if (!container) return;container.innerHTML = `
      <div class="rank-animation rank-down">
        <h2>RANK DOWN</h2>
        <div class="rank-animation-images">
          <img src="${oldRank.image}" alt="${oldRank.name}" class="rank-image old">
          <div class="rank-arrow">→</div>
          <img src="${newRank.image}" alt="${newRank.name}" class="rank-image new">
        </div>
        <div class="rank-animation-message">
          You've been demoted to <strong>${newRank.name}</strong>. Keep practicing!
        </div>
        <button class="rank-animation-button">Continue</button>
        <audio class="rank-sound" autoplay>
          <source src="/assets/sounds/rank-down.mp3" type="audio/mpeg">
        </audio>
      </div>
    `;

    // Show animation
    container.classList.add('visible');

    // Add event listener to close button
    const closeButton = container.querySelector('.rank-animation-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideAnimation());
    }

    // Auto-hide after 10 seconds
    setTimeout(() => this.hideAnimation(), 10000);
  }

  /**
   * Show achievement unlock notification
   * @param {Object} achievement - Achievement data
   */
  showAchievementUnlock(achievement) {
    if (!achievement) return;let achievementContainer = document.getElementById('achievement-container');
    if (!achievementContainer) {
      achievementContainer = document.createElement('div');
      achievementContainer.id = 'achievement-container';
      achievementContainer.className = 'achievement-container';
      document.body.appendChild(achievementContainer);
    }

    // Create achievement notification
    const notification = document.createElement('div');
    notification.className = 'achievement-unlock';
    notification.innerHTML = `
              <h3>Achievement Completed!</h3>
      <h4>${achievement.name}</h4>
      <p>${achievement.description}</p>
              <div class="achievement-rewards">+${achievement.rewards.experience} experience, +${achievement.rewards.arenaGold} arena gold</div>
    `;

    // Add to container
    document.body.appendChild(notification);

    // Show background overlay
    achievementContainer.classList.add('visible');

    // Play sound effect if available
    const soundEffect = new Audio('/assets/sounds/achievement-unlock.mp3');
    soundEffect.volume = 0.7;
    soundEffect.play().catch(err => logger.warn('Sound not available:', err));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }

      // Hide background overlay
      achievementContainer.classList.remove('visible');
    }, 5000);
  }

  /**
   * Hide animation
   */
  hideAnimation() {
    const container = document.getElementById('rank-animation-container');
    if (container) {
      container.classList.remove('visible');
      // Clear content after animation
      setTimeout(() => {
        container.innerHTML = '';
      }, 500);
    }
  }
}

// Create singleton instance
const rankAnimationManager = new RankAnimationManager();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  rankAnimationManager.initialize();
});

// Export for use in other modules
export default rankAnimationManager;
