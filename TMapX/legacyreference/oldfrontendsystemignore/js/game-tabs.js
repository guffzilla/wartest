/**
 * Game Tabs Functionality
 * Handles switching between different game tabs (WC1, WC2, WC3) across pages
 */
import logger from '/js/utils/logger.js';

// Prevent redeclaration if already loaded
if (typeof window.GameTabsManager !== 'undefined') {
  
} else {

class GameTabsManager {
  constructor() {
    this.currentGame = 'wc2'; // Default to WC2
    this.gameData = {
      'wc1': {
        title: 'Warcraft I Arena',
        subtitle: '',
        icon: 'fas fa-sword',
        className: 'wc1'
      },
      'wc2': {
        title: 'Warcraft II Ladder',
        subtitle: '',
        icon: 'fas fa-shield-alt',
        className: 'wc2'
      },
      'wc3': {
        title: 'Warcraft III Ladder',
        subtitle: '',
        icon: 'fas fa-dragon',
        className: 'wc3'
      }
    };
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.restoreSelectedGame();
  }

  setupEventListeners() {
    // Event delegation for game toggle buttons (corrected ID)
    document.addEventListener('click', (e) => {
      const gameToggleBtn = e.target.closest('#game-toggle-btn');
      if (gameToggleBtn) {
        e.preventDefault();
        this.toggleGame();
      }
    });

    // Listen for click on current game button (legacy support)
    document.addEventListener('click', (e) => {
      if (e.target.closest('#current-game-btn')) {
        e.preventDefault();
    
        this.toggleGame();
      }
    });

    // Listen for legacy game tab clicks (if any exist)
    document.addEventListener('click', (e) => {
      const gameTab = e.target.closest('[data-game]');
      if (gameTab) {
        e.preventDefault();
        const gameId = gameTab.dataset.game;

        this.switchGame(gameId);
      }
    });


  }

  toggleGame() {
    // Cycle through wc1 -> wc2 -> wc3 -> wc1
    let nextGame;
    switch(this.currentGame) {
      case 'wc1':
        nextGame = 'wc2';
        break;
      case 'wc2':
        nextGame = 'wc3';
        break;
      case 'wc3':
        nextGame = 'wc1';
        break;
      default:
        nextGame = 'wc2'; // fallback
    }
    this.switchGame(nextGame);
  }

  switchGame(gameId) {

    
    // Update current game
    this.currentGame = gameId;
    
    // Update UI
    this.updateGameDisplay();
    
    // Store selection
    localStorage.setItem('selectedGame', gameId);
    
    // Dispatch event for other components to listen to
    window.dispatchEvent(new CustomEvent('gameTabChanged', {
      detail: { 
        game: gameId,
        gameDisplay: this.getGameDisplayName(gameId)
      }
    }));
    
    // Trigger page-specific functionality
    this.triggerPageSpecificChanges(gameId);
  }

  updateGameDisplay() {
    const currentGameData = this.gameData[this.currentGame];
    
    // Get next game for toggle button
    let nextGame;
    switch(this.currentGame) {
      case 'wc1': nextGame = 'wc2'; break;
      case 'wc2': nextGame = 'wc3'; break;
      case 'wc3': nextGame = 'wc1'; break;
      default: nextGame = 'wc2';
    }
    const nextGameData = this.gameData[nextGame];

    // Update game toggle button (corrected ID)
    const gameToggleBtn = document.getElementById('game-toggle-btn');
    const currentGameIcon = document.getElementById('current-game-icon');
    const currentGameTitle = document.getElementById('current-game-title');
    const toggleText = document.getElementById('toggle-text');
    const reportMatchText = document.getElementById('report-match-text');

    if (gameToggleBtn && currentGameData) {
      // Update button class for theming
      gameToggleBtn.className = `game-toggle-btn ${currentGameData.className}`;
      
      // Update icon
      if (currentGameIcon) {
        currentGameIcon.className = `fas ${currentGameData.icon}`;
      }
      
      // Update title
      if (currentGameTitle) {
        currentGameTitle.textContent = currentGameData.title;
      }
      
      // Update toggle text
      if (toggleText) {
        toggleText.textContent = `Click to Switch to ${nextGameData.title}`;
      }
      
      // Update report match button text
      if (reportMatchText) {
        let gameAbbrev;
        switch(this.currentGame) {
                case 'wc1': gameAbbrev = 'WC I'; break;
      case 'wc2': gameAbbrev = 'WC II'; break;
      case 'wc3': gameAbbrev = 'WC III'; break;
          default: gameAbbrev = 'WC'; break;
        }
        reportMatchText.textContent = `REPORT ${gameAbbrev} MATCH`;
      }
      
      
    } else {
      
    }

    // Update any game-specific content
    this.updateGameContent();
  }

  updateGameContent() {
    // Update game-specific content based on current game

    
    // This function can be extended to update page-specific content
    // For now, it's a placeholder to prevent the error
  }

  triggerPageSpecificChanges(gameId) {
    const currentPage = window.location.pathname;
    
    // Page-specific functionality based on game selection
    if (currentPage.includes('arena.html')) {
      this.handleLadderGameChange(gameId);
    } else if (currentPage.includes('tournaments.html')) {
      this.handleTournamentGameChange(gameId);
    } else if (currentPage.includes('content.html')) {
      this.handleContentGameChange(gameId);
    } else if (currentPage.includes('atlas.html')) {
      this.handleMapsGameChange(gameId);
    }
  }

  handleLadderGameChange(gameId) {
    
    
    // Handle ladder game switching through the existing ladder managers
    if (gameId === 'wc1') {
      // Handle WC1
      if (window.ladderManager) {
        window.ladderManager.deactivate();
      }
          // WC1LadderManager removed
    } else if (gameId === 'wc2' || gameId === 'wc3') {
      // Handle WC2/WC3
      if (window.ladderManager) {
        window.ladderManager.activate();
        window.ladderManager.switchGameType(gameId);
      }
          // WC1LadderManager removed
    }
    
    // Update report match button text
    if (typeof window.updateReportMatchButton === 'function') {
      window.updateReportMatchButton(gameId);
    }
    
          // Notify ArenaTournamentManager to reload tournaments for the new game type
      if (window.arenaTournamentManager) {
        // Notifying ArenaTournamentManager of game change
        window.arenaTournamentManager.updateGameType(gameId);
      }
  }

  handleTournamentGameChange(gameId) {
    
    // Trigger tournament data reload for specific game
    if (typeof window.loadTournamentData === 'function') {
      window.loadTournamentData(gameId);
    }
  }

  handleContentGameChange(gameId) {
    
    // Update content creator data
    if (typeof window.loadContentCreators === 'function') {
      window.loadContentCreators(gameId);
    }
  }

      handleMapsGameChange(gameId) {
      // Maps game changed
      
      // Save maps page preference
    localStorage.setItem('mapsPageGame', gameId);
    
    
    // Show/hide appropriate content sections
    this.showMapsContent(gameId);
    
    // Update maps data with retry logic
    if (typeof window.loadMapsData === 'function') {

      window.loadMapsData(gameId);
    } else {
      
      // Retry after a short delay if the function isn't available yet
      setTimeout(() => {
        if (typeof window.loadMapsData === 'function') {

                      window.loadMapsData(gameId);
          } else {
            logger.error('loadMapsData function still not available after retry');
          }
      }, 500);
    }
    
    // Also try to trigger maps reload through the maps system if available
    if (window.mapsSystem && window.mapsSystem.initialized) {
      
      if (window.mapsSystem.modules && window.mapsSystem.modules.grid) {
        window.mapsSystem.modules.grid.loadMaps();
      }
    }
  }

  /**
   * Show/hide appropriate content sections for maps page
   */
  showMapsContent(gameId) {
    // Hide all game content sections
    const allContent = document.querySelectorAll('.game-content');
    allContent.forEach(content => {
      content.classList.remove('active');
      content.style.display = 'none';
    });
    
    // Show the selected game content
    const selectedContent = document.getElementById(`${gameId}-content`);
    if (selectedContent) {
      selectedContent.classList.add('active');
      selectedContent.style.display = 'block';
      
    } else {
      
    }
    
    // Update game tab active states
    const allTabs = document.querySelectorAll('.game-tab');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.game === gameId) {
        tab.classList.add('active');
      }
    });
  }

  restoreSelectedGame() {
    const currentPage = window.location.pathname;
    let gameToRestore = this.currentGame; // Default to class default
    
    // Check for page-specific defaults
    if (currentPage.includes('arena.html')) {
      // Ladder page should use saved game preference, but default to wc2
      const savedGame = localStorage.getItem('selectedGame');
      if (savedGame && this.gameData[savedGame]) {
        gameToRestore = savedGame;
      } else {
        gameToRestore = 'wc2'; // Default to Warcraft 2
      }
    } else if (currentPage.includes('atlas.html')) {
      // Maps page should use saved maps preference, but default to wc2
      const savedMapsGame = localStorage.getItem('mapsPageGame');
      if (savedMapsGame && this.gameData[savedMapsGame]) {
        gameToRestore = savedMapsGame;
  
      } else {
        gameToRestore = 'wc2'; // Default to Warcraft 2
      }
    } else {
      // For other pages, use saved game if available
      const savedGame = localStorage.getItem('selectedGame');
      if (savedGame && this.gameData[savedGame]) {
        gameToRestore = savedGame;
      }
    }
    
    
    this.switchGame(gameToRestore);
  }

  getGameDisplayName(gameId) {
    return this.gameData[gameId]?.title || gameId;}

  getCurrentGame() {
    return this.currentGame;}

  // Public API for other components
  getGameTypeForAPI() {
    // Map game tab IDs to API game types
    const gameTypeMapping = {
      'wc1': 'wc1',
      'wc2': 'wc2',
      'wc3': 'wc3'
    };
    return gameTypeMapping[this.currentGame] || 'wc2';}
}

// Make the class globally available
window.GameTabsManager = GameTabsManager;

// Initialize when DOM is ready
let gameTabsManager;

function initGameTabs() {
  
  
  if (!window.gameTabsManager) {
    window.gameTabsManager = new GameTabsManager();
    window.gameTabsManager.init();
  }
  
  // Initialize global updateReportMatchButton function
  window.updateReportMatchButton = function(gameId) {
    
    
    const reportBtn = document.getElementById('report-match-btn');
    const reportText = document.getElementById('report-match-text');
    
    if (reportBtn && reportText) {
      if (gameId === 'wc1') {
        reportText.textContent = 'REPORT WC1 MATCH';
      } else if (gameId === 'wc2') {
        reportText.textContent = 'REPORT WC2 MATCH';
      } else if (gameId === 'wc3') {
        reportText.textContent = 'REPORT WC3 MATCH';
      } else {
        reportText.textContent = 'REPORT MATCH';
      }
      
             
        
      } else {
        
      }
  };
  
  
}

// Export for global access
window.initGameTabs = initGameTabs;

// Auto-initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', initGameTabs);

// Also try to initialize after a short delay in case DOM is already loaded
setTimeout(initGameTabs, 100);



} // End of else block 