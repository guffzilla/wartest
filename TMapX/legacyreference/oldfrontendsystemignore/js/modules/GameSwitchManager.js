/**
 * GameSwitchManager - Handles consistent styling across all game types
 * Ensures WC1, WC2, and WC3 controls have identical appearance and behavior
 */

export class GameSwitchManager {
  constructor() {
    this.currentGame = 'war2';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeConsistentStyling();
  }

  setupEventListeners() {
    // Listen for game tab changes
    window.addEventListener('gameTabChanged', (e) => {
      this.handleGameSwitch(e.detail.game);
    });

    console.log('🔄 GameSwitchManager initialized');
  }

  /**
   * Ensures all controls sections have identical styling regardless of game type
   */
  initializeConsistentStyling() {
    const allControlsSections = [
      document.getElementById('wc1-controls'),
      document.getElementById('wc2-wc3-controls')
    ].filter(Boolean);

    allControlsSections.forEach(section => {
      this.applyConsistentControlsStyle(section);
    });
  }

  /**
   * Apply consistent styling to a controls section
   */
  applyConsistentControlsStyle(controlsSection) {
    if (!controlsSection) return;const importantStyles = {
      // Use the same styles as defined in CSS
      'background': '',
      'border-radius': '',
      'padding': '',
      'margin-bottom': '',
      'box-shadow': '',
      'border': ''
    };

    Object.keys(importantStyles).forEach(property => {
      controlsSection.style.setProperty(property, '', '');
    });

    // Ensure consistent class application
    if (!controlsSection.classList.contains('controls-section')) {
      controlsSection.classList.add('controls-section');
    }

    console.log(`✅ Applied consistent styling to ${controlsSection.id}`);
  }

  /**
   * Handle game switch while maintaining consistent styling
   */
  handleGameSwitch(gameType) {
    console.log(`🎮 GameSwitchManager handling switch to: ${gameType}`);
    
    this.currentGame = gameType;
    
    // Show/hide appropriate controls
    this.toggleControlsVisibility(gameType);
    
    // Reapply consistent styling after any changes
    setTimeout(() => {
      this.initializeConsistentStyling();
    }, 50);
  }

  /**
   * Show/hide controls with consistent horizontal styling
   */
  toggleControlsVisibility(gameType) {
    const wc1Controls = document.getElementById('wc1-controls');
    const wc2wc3Controls = document.getElementById('wc2-wc3-controls');

    if (gameType === 'war1') {
      // Show WC1 controls with horizontal layout
      if (wc1Controls) {
        wc1Controls.style.display = 'flex';
        this.applyConsistentControlsStyle(wc1Controls);
      }
      // Hide WC2/WC3 controls
      if (wc2wc3Controls) {
        wc2wc3Controls.style.display = 'none';
      }
    } else {
      // Show WC2/WC3 controls for war2 or war3 with horizontal layout
      if (wc2wc3Controls) {
        wc2wc3Controls.style.display = 'flex';
        this.applyConsistentControlsStyle(wc2wc3Controls);
      }
      // Hide WC1 controls
      if (wc1Controls) {
        wc1Controls.style.display = 'none';
      }
    }

    console.log(`✅ Toggled controls visibility with horizontal layout for ${gameType}`);
  }

  /**
   * Force refresh of all control styling (useful for debugging)
   */
  refreshAllControlsStyle() {
    console.log('🔄 Refreshing all controls styling...');
    this.initializeConsistentStyling();
  }

  /**
   * Get current game type
   */
  getCurrentGame() {
    return this.currentGame;}
}

// Initialize when DOM is ready
let gameSwitchManager;

function initGameSwitchManager() {
  if (!gameSwitchManager) {
    gameSwitchManager = new GameSwitchManager();
    window.gameSwitchManager = gameSwitchManager; // Make globally available
    console.log('✅ GameSwitchManager initialized globally');
  }
}

// Export for manual initialization
window.initGameSwitchManager = initGameSwitchManager;

// Auto-initialize
document.addEventListener('DOMContentLoaded', initGameSwitchManager);
setTimeout(initGameSwitchManager, 100);

console.log('✅ GameSwitchManager module loaded'); 