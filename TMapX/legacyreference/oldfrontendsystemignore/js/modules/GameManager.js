/**
 * Game Management System
 * Handles separation between Warcraft 2 and Warcraft 3 systems
 */

// import { ApiClient } from './ApiClient.js';
// Use window.apiClient (already globally available)
import { UIManager } from './UIManager.js';

export class GameManager {
  constructor() {
    this.api = window.apiClient;
    this.ui = new UIManager();
    this.currentGame = 'warcraft2'; // Default to WC2
    this.gameData = {
      warcraft2: {
        name: 'Warcraft 2',
        shortName: 'WC2',
        icon: 'fas fa-shield-alt',
        color: '#8B4513',
        ranks: [],
        maps: [],
        achievements: []
      },
      warcraft3: {
        name: 'Warcraft 3',
        shortName: 'WC3', 
        icon: 'fas fa-sword',
        color: '#4169E1',
        ranks: [],
        maps: [],
        achievements: []
      }
    };

    
    console.log('🎮 Game Manager initialized');
  }

  /**
   * Initialize game management system
   */
  async init() {
    try {
      // Load game-specific data
      await Promise.all([
        this.loadGameData('warcraft2'),
        this.loadGameData('warcraft3'),
        this.setupGameSwitcher(),
        this.detectCurrentGame()
      ]);

      console.log('Game management system initialized');
    } catch (error) {
      console.error('Failed to initialize game manager:', error);
    }
  }

  /**
   * Load game-specific data
   */
  async loadGameData(gameType) {
    try {
      const [ranks, maps, achievements] = await Promise.all([
        this.api.get(`/games/${gameType}/ranks`),
        this.api.get(`/games/${gameType}/maps`),
        this.api.get(`/games/${gameType}/achievements`)
      ]);

      this.gameData[gameType] = {
        ...this.gameData[gameType],
        ranks,
        maps,
        achievements
      };
    } catch (error) {
      console.error(`Failed to load ${gameType} data:`, error);
    }
  }

  /**
   * Setup game switcher UI
   */
  setupGameSwitcher() {
    const switcher = document.getElementById('game-switcher');
    if (!switcher) return;switcher.innerHTML = `
      <div class="game-tabs">
        <button class="game-tab ${this.currentGame === 'warcraft2' ? 'active' : ''}" 
                data-game="warcraft2">
          <i class="${this.gameData.warcraft2.icon}"></i>
          ${this.gameData.warcraft2.name}
        </button>
        <button class="game-tab ${this.currentGame === 'warcraft3' ? 'active' : ''}" 
                data-game="warcraft3">
          <i class="${this.gameData.warcraft3.icon}"></i>
          ${this.gameData.warcraft3.name}
        </button>
      </div>
    `;

    // Setup click handlers
    switcher.querySelectorAll('.game-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const gameType = tab.dataset.game;
        this.switchGame(gameType);
      });
    });
  }

  /**
   * Switch between games
   */
  async switchGame(gameType) {
    if (this.currentGame === gameType) return;this.currentGame = gameType;
    
    // Update UI
    this.updateGameSwitcherUI();
    
    // Store preference
    localStorage.setItem('selectedGame', gameType);
    
    // Trigger game change event
    window.dispatchEvent(new CustomEvent('gameChanged', {
      detail: { gameType, gameData: this.gameData[gameType] }
    }));

    // Update page content
    await this.updatePageContent();
  }

  /**
   * Update game switcher UI
   */
  updateGameSwitcherUI() {
    document.querySelectorAll('.game-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.game === this.currentGame);
    });

    // Update page theme
    document.documentElement.style.setProperty(
      '--game-primary-color', 
      this.gameData[this.currentGame].color
    );
  }

  /**
   * Detect current game from URL or storage
   */
  detectCurrentGame() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameFromUrl = urlParams.get('game');
    const gameFromStorage = localStorage.getItem('selectedGame');

    if (gameFromUrl && this.gameData[gameFromUrl]) {
      this.currentGame = gameFromUrl;
    } else if (gameFromStorage && this.gameData[gameFromStorage]) {
      this.currentGame = gameFromStorage;
    }

    this.updateGameSwitcherUI();
  }

  /**
   * Update page content based on current game
   */
  async updatePageContent() {
    // Notify other managers about game change
    if (window.ladderManager) {
      await window.ladderManager.switchGame(this.currentGame);
    }
    if (window.tournamentManager) {
      await window.tournamentManager.switchGame(this.currentGame);
    }
    if (window.profileManager) {
      await window.profileManager.switchGame(this.currentGame);
    }
    if (window.clanManager) {
      await window.clanManager.switchGame(this.currentGame);
    }
  }

  /**
   * Get current game data
   */
  getCurrentGameData() {
    return this.gameData[this.currentGame];}

  /**
   * Get current game type
   */
  getCurrentGame() {
    return this.currentGame;}

  /**
   * Check if current game is Warcraft 2
   */
  isWarcraft2() {
    return this.currentGame === 'warcraft2';}

  /**
   * Check if current game is Warcraft 3
   */
  isWarcraft3() {
    return this.currentGame === 'warcraft3';}

  /**
   * Get game-specific API endpoint
   */
  getGameEndpoint(endpoint) {
    return `/games/${this.currentGame}${endpoint}`;}

  /**
   * Get ranks for current game
   */
  getCurrentGameRanks() {
    return this.gameData[this.currentGame].ranks;}

  /**
   * Get maps for current game
   */
  getCurrentGameMaps() {
    return this.gameData[this.currentGame].maps;}

  /**
   * Get achievements for current game
   */
  getCurrentGameAchievements() {
    return this.gameData[this.currentGame].achievements;}

  /**
   * Format player name with game prefix
   */
  formatPlayerName(playerName) {
    const prefix = this.gameData[this.currentGame].shortName;
    return `[${prefix}] ${playerName}`;}

  /**
   * Get game-specific validation rules
   */
  getValidationRules() {
    const baseRules = {
      playerName: {
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_-]+$/
      },
      clanTag: {
        minLength: 2,
        maxLength: 6,
        pattern: /^[a-zA-Z0-9]+$/
      }
    };

    // Game-specific overrides
    if (this.currentGame === 'warcraft3') {
      baseRules.playerName.maxLength = 15; // WC3 has shorter name limits
    }

    return baseRules;}

  /**
   * Get game-specific match types
   */
  getMatchTypes() {
    const commonTypes = ['1v1', '2v2', '3v3', '4v4', 'ffa'];
    
    if (this.currentGame === 'warcraft2') {
      return [...commonTypes, '5v5', '6v6', '7v7', '8v8'];}
    
    return commonTypes;}

  /**
   * Get game-specific resources
   */
  getResourceTypes() {
    if (this.currentGame === 'warcraft2') {
      return ['low', 'medium', 'high', 'oil_only'];}
    
    return ['low', 'medium', 'high'];}

  /**
   * Get game-specific races
   */
  getRaces() {
    if (this.currentGame === 'warcraft2') {
      return [
        { id: 'human', name: 'Human', icon: '⚔️' },
        { id: 'orc', name: 'Orc', icon: '🔨' },
        { id: 'random', name: 'Random', icon: '🎲' }
      ];}
    
    return [
      { id: 'human', name: 'Human', icon: '⚔️' },
      { id: 'orc', name: 'Orc', icon: '🔨' },
      { id: 'nightelf', name: 'Night Elf', icon: '🌙' },
      { id: 'undead', name: 'Undead', icon: '💀' },
      { id: 'random', name: 'Random', icon: '🎲' }
    ];}


}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.gameManager) {
      window.gameManager = new GameManager();
    }
  });
} else {
  if (!window.gameManager) {
    window.gameManager = new GameManager();
  }
} 