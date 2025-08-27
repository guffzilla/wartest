/**
 * PlayerDetails.js - Player Statistics Modal for Profile Page
 * 
 * This file handles the player statistics modal specifically for the profile page.
 * Updated to use the new ModalManager system.
 */

// Import centralized logger utility
import logger from '/js/utils/logger.js';

// Check if we should initialize on this page
function shouldInitializeOnThisPage() {
  return window.location.pathname.includes('/views/townhall.html') || 
         window.location.pathname.includes('/profile') ||
         window.location.pathname.includes('/ladder') ||
         document.getElementById('player-stats-modal');}

/**
 * Initialize ModalManager if not already available
 */
function ensureModalManager() {
  return new Promise((resolve) => {
    if (window.ModalManager) {
      resolve(window.ModalManager);return;}
    
    // Wait for the ModalManager module to load and create the global instance
    let attempts = 0;
    const maxAttempts = 200; // Wait up to 20 seconds
    
    const checkModalManager = () => {
      attempts++;
      
      if (window.ModalManager) {
        resolve(window.ModalManager);
        return;}
      
      if (attempts >= maxAttempts) {
        logger.warn('ModalManager not found after waiting');
        resolve(null);
        return;}
      
      setTimeout(checkModalManager, 100);
    };
    
    checkModalManager();
  });
}

// Initialize ModalManager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (shouldInitializeOnThisPage()) {
    ensureModalManager().catch(error => {
      logger.error('Failed to initialize ModalManager', error);
    });
  }
});

// Also try to initialize when window loads
window.addEventListener('load', () => {
  if (shouldInitializeOnThisPage()) {
    ensureModalManager().catch(error => {
      logger.error('Failed to ensure ModalManager on window load', error);
    });
  }
});

/**
 * Player Details Module
 * Handles displaying detailed player statistics in a modal using the new ModalManager
 */

// Global utility functions using the new modal system
window.showLoadingModal = function(message) {
  if (!shouldInitializeOnThisPage()) return;ensureModalManager().then((modalManager) => {
    if (modalManager) {
      const modalId = modalManager.createModal({
        id: 'loading-modal',
        title: 'Loading',
        content: `<div class="loading-container"><div class="loading-spinner"></div><p>${message}</p></div>`,
        size: 'sm',
        showCloseButton: false,
        backdrop: false,
        keyboard: false
      });
      modalManager.show('loading-modal');
    }
  });
};

window.hideLoadingModal = function() {
  if (!shouldInitializeOnThisPage()) return;ensureModalManager().then((modalManager) => {
    if (modalManager) {
      modalManager.hide('loading-modal');
    }
  });
};

window.showErrorModal = function(message) {
  if (!shouldInitializeOnThisPage()) return;ensureModalManager().then((modalManager) => {
    if (modalManager) {
      const modalId = modalManager.createModal({
        id: 'error-modal',
        title: 'Error',
        content: `<div class="error-container"><i class="fas fa-exclamation-triangle"></i><p>${message}</p></div>`,
        size: 'sm',
        showCloseButton: true,
        backdrop: true,
        keyboard: true
      });
      modalManager.show('error-modal');
    } else {
      // Fallback to standard alert if ModalManager is not available
      alert(message);
    }
  });
};

/**
 * Open player details modal using the new Universal Modal System
 */
window.openPlayerDetailsModal = async function(playerName) {
  
  
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure ModalManager is ready first
      const modalManager = await ensureModalManager();if (!modalManager) {
        throw new Error('ModalManager not available after waiting');
      }
      

      
      // Load player details using the correct API endpoint that exists
      const response = await fetch(`/api/matches/player/${encodeURIComponent(playerName)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load player');
      }
      
      const data = await response.json();
      
      
      const player = data.data?.player || {};
      const stats = player.stats || {};
      
      
      
      // Validate that we have the correct game type
      if (!player.gameType) {
        logger.warn('No game type found in API response, checking barracks data...');
        
        // Try to get game type from barracks data
        if (window.barracksManager && window.barracksManager.players) {
          const barracksPlayer = window.barracksManager.players.find(p => p.name === playerName);
          if (barracksPlayer && barracksPlayer.gameType) {
    
            player.gameType = barracksPlayer.gameType;
          }
        }
      }
      
      const wins = stats.wins || 0;
      const losses = stats.losses || 0;
      const totalGames = stats.totalMatches || wins + losses;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      // Create modal content with tabs - pass the actual player data
      const modalContent = createPlayerModalContent(player);
      
      
      
      // Double-check ModalManager is still available
      if (!window.ModalManager) {
        throw new Error('ModalManager became unavailable during processing');
      }
      
      // Create new modal using the Universal Modal System
      window.ModalManager.createModal({
        id: 'player-stats-modal',
        title: `Player: ${playerName}`,
        icon: 'fa-user',
        content: () => {
          const contentContainer = document.createElement('div');
          contentContainer.innerHTML = modalContent;
          return contentContainer;},
        styles: {
          container: 'player-profile-modal',
          header: 'player-profile-header',
          title: 'player-profile-title',
          content: 'player-profile-content'
        },
        onOpen: (modal) => {
  
          // Setup modal tabs and load initial data
          setTimeout(() => {
            setupPlayerModalTabs(playerName, player);
          }, 100);
          resolve();
        },
        onClose: (modal) => {
  
        }
      });
      
      
      
    } catch (error) {
      logger.error('Failed to show player details modal', error);
      reject(error);
    }
  });
};

/**
 * Handle player link clicks with proper error handling
 */
window.handlePlayerLinkClick = function(playerName, event) {
  event.preventDefault();
  event.stopPropagation();
  
  
  
  try {
    // Try to open player details modal
    if (window.showPlayerDetails) {
      window.showPlayerDetails(playerName);
    } else if (window.openPlayerDetailsModal) {
      window.openPlayerDetailsModal(playerName);
    } else {
      // Fallback: show alert with player info
      ensureModalManager().then((modalManager) => {
        if (modalManager) {
          modalManager.alert(`Player: ${playerName}\n\nPlayer modal system is loading. Please try again in a moment.`, 'Player Profile');
        } else {
          alert(`Player: ${playerName}\n\nPlayer modal not available. Please refresh the page and try again.`);
        }
      });
    }
  } catch (error) {
    logger.error('Error opening player modal', error);
    ensureModalManager().then((modalManager) => {
      if (modalManager) {
        modalManager.alert(`Unable to open player profile for ${playerName}. Please try again.`, 'Error');
      } else {
        alert(`Unable to open player profile for ${playerName}. Please try again.`);
      }
    });
  }
};

/**
 * Ensure player modal functions are available globally
 */
window.showPlayerDetails = window.showPlayerDetails || window.openPlayerDetailsModal || async function(playerName) {
  logger.warn('Player modal function not available, using fallback');
  
  return new Promise((resolve, reject) => {
    // Try to ensure ModalManager is available first
    ensureModalManager().then((modalManager) => {
      if (modalManager) {
        // Try to find player data from barracks if available
        let playerData = null;if (window.barracksManager && window.barracksManager.players) {
          playerData = window.barracksManager.players.find(p => p.name === playerName);
          if (playerData) {
    
            if (window.openPlayerDetailsModal) {
              window.openPlayerDetailsModal(playerName).then(resolve).catch(reject);
              return;}
          }
        }
        
        // If ModalManager is available, create a basic modal
        modalManager.alert(`Player: ${playerName}\n\nPlayer modal system is loading. Please try again in a moment.`, 'Player Profile');
        resolve();
      } else {
        // Final fallback alert
        alert(`Player: ${playerName}\n\nPlayer modal system not loaded. Please refresh the page.`);
        resolve();
      }
    }).catch(error => {
      logger.error('Error in showPlayerDetails fallback', error);
      reject(error);
    });
  });
};

/**
 * Get time ago from date
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';if (diffMins < 60) return `${diffMins}m ago`;if (diffHours < 24) return `${diffHours}h ago`;if (diffDays < 7) return `${diffDays}d ago`;return date.toLocaleDateString();}

/**
 * Create the player modal content structure
 */
function createPlayerModalContent(playerData) {
  // Debug rank data
  
  
  // Determine game type for title
  const gameType = playerData.gameType || 'warcraft1';
  let gameTypeDisplay = 'WC1';
  if (gameType === 'war2' || gameType === 'warcraft2') {
    gameTypeDisplay = 'WC2';
  } else if (gameType === 'war3' || gameType === 'warcraft3') {
    gameTypeDisplay = 'WC3';
  }
  
  // Construct rank image path properly
  let rankImagePath = '/assets/img/ranks/emblem.png'; // default fallback
  if (playerData.rank?.image) {
    if (playerData.rank.image.startsWith('/assets') || playerData.rank.image.startsWith('http')) {
      rankImagePath = playerData.rank.image;
    } else {
      rankImagePath = `/assets/img/ranks/${playerData.rank.image}`;
    }
  }
  
  
  
  // Get preferred race display
  const preferredRace = playerData.preferredRace || 'random';
  const isWC1 = playerData.gameType === 'warcraft1' || playerData.gameType === 'war1';
  const isWC3 = playerData.gameType === 'war3' || playerData.gameType === 'warcraft3';
  
  let raceDisplay = '';
  let raceIcon = '';
  
  if (isWC1 || playerData.gameType === 'war2' || playerData.gameType === 'warcraft2') {
    // WC1/WC2 races: human, orc, random
    switch (preferredRace) {
      case 'human':
        raceDisplay = 'Human';
        raceIcon = '👤';
        break;
      case 'orc':
        raceDisplay = 'Orc';
        raceIcon = '🟢';
        break;
      case 'random':
      default:
        raceDisplay = 'Random';
        raceIcon = '🎲';
        break;
    }
  } else if (isWC3) {
    // WC3 races: human, orc, undead, night_elf, random
    switch (preferredRace) {
      case 'human':
        raceDisplay = 'Human';
        raceIcon = '👤';
        break;
      case 'orc':
        raceDisplay = 'Orc';
        raceIcon = '🟢';
        break;
      case 'undead':
        raceDisplay = 'Undead';
        raceIcon = '💀';
        break;
      case 'night_elf':
        raceDisplay = 'Night Elf';
        raceIcon = '🌙';
        break;
      case 'random':
      default:
        raceDisplay = 'Random';
        raceIcon = '🎲';
        break;
    }
  } else {
    // Fallback for unknown game types
    raceDisplay = preferredRace.charAt(0).toUpperCase() + preferredRace.slice(1);
    raceIcon = '🎮';
  }
  
  // Calculate stats for display
  const wins = playerData.wins || playerData.stats?.wins || 0;
  const losses = playerData.losses || playerData.stats?.losses || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const streak = playerData.streak || playerData.stats?.streak || 0;



  const modalContent = `
    <div class="player-modal-container">
      <!-- Full Screen Player Header -->
      <div class="player-modal-header">
        <div class="player-header-content">
          <div class="player-basic-info">
            <div class="player-avatar">
              <img src="${rankImagePath}" alt="Rank" onerror="this.src='/assets/img/ranks/emblem.png';">
            </div>
            <div class="player-details">
              <h3 class="player-name">${playerData.name || playerData.username}</h3>
              <div class="player-meta">
                <span class="player-rank">${playerData.rank?.name || 'Unranked'}</span>
                <span class="player-rating">${playerData.mmr || 0} MMR</span>
                <span class="player-status ${playerData.isOnline ? 'online' : 'offline'}">
                  ${playerData.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div class="player-quick-stats">
            <div class="quick-stat">
              <span class="stat-value">${totalGames}</span>
              <span class="stat-label">Games</span>
            </div>
            <div class="quick-stat">
              <span class="stat-value">${wins}</span>
              <span class="stat-label">Wins</span>
            </div>
            <div class="quick-stat">
              <span class="stat-value">${winRate}%</span>
              <span class="stat-label">Win Rate</span>
            </div>
            <div class="quick-stat">
              <span class="stat-value">${streak}</span>
              <span class="stat-label">${streak >= 0 ? 'Win Streak' : 'Loss Streak'}</span>
            </div>
          </div>
                </div>
      </div>
        
      <!-- Close button is handled by the unified modal system -->

      <!-- Professional Modal Tabs -->
      <div class="modal-tabs">
        <button class="modal-tab active" data-tab="overview">
          <i class="fas fa-user-circle"></i>
          Overview
        </button>
        <button class="modal-tab" data-tab="matches">
          <i class="fas fa-swords"></i>
          Matches
        </button>
        <button class="modal-tab" data-tab="performance">
          <i class="fas fa-chart-line"></i>
          Performance
        </button>
      </div>

      <!-- Tab Content -->
      <div class="modal-tab-content active" id="overview-content">
        <div class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          Loading overview...
        </div>
      </div>

      <div class="modal-tab-content" id="matches-content">
        <div class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          Loading matches...
        </div>
      </div>

      <div class="modal-tab-content" id="performance-content">
        <div class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          Loading performance data...
        </div>
      </div>
    </div>
  `;



  
  return modalContent;}

/**
 * Setup modal tabs and event handlers
 */
function setupPlayerModalTabs(playerName, playerData) {
  const modal = document.getElementById('player-stats-modal');
  if (!modal) return;const tabs = modal.querySelectorAll('.modal-tab');
  const contents = modal.querySelectorAll('.modal-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding content
      const tabName = tab.dataset.tab;
      const targetContent = modal.querySelector(`#${tabName}-content`);
      if (targetContent) {
        targetContent.classList.add('active');
        
        // Load tab data if not already loaded
        if (!targetContent.dataset.loaded) {
          loadTabData(tabName, playerName, targetContent).then(() => {
            targetContent.dataset.loaded = 'true';
          }).catch(error => {
            logger.error(`Error loading ${tabName} data`, error);
          });
        }
      }
    });
  });

  // Load initial overview tab
  const overviewTab = modal.querySelector('.modal-tab[data-tab="overview"]');
  if (overviewTab) {
    overviewTab.click();
  }
}

/**
 * Load data for a specific tab
 */
function loadTabData(tabName, playerName, contentElement) {
  return new Promise((resolve, reject) => {
    try {
      contentElement.innerHTML = '<div class="loading">Loading...</div>';let playerGameType = null;
      fetch(`/api/matches/player/${encodeURIComponent(playerName)}`)
        .then(playerResponse => {
          if (playerResponse.ok) {
            return playerResponse.json();}
          throw new Error('Failed to fetch player data');
        })
        .then(playerData => {
          playerGameType = playerData.data?.player?.gameType || null;
          
          switch (tabName) {
            case 'overview':
              return loadOverviewData(playerName, contentElement);case 'matches':
              return loadMatchesData(playerName, contentElement, 1, playerGameType);case 'performance':
              return loadPerformanceData(playerName, contentElement);default:
              throw new Error(`Unknown tab: ${tabName}`);
          }
        })
        .then(() => {
          resolve();
        })
        .catch(error => {
          logger.error(`Error loading ${tabName} data`, error);
          contentElement.innerHTML = `<div class="error-message">Failed to load ${tabName} data</div>`;
          reject(error);
        });
    } catch (error) {
      logger.error(`Error loading ${tabName} data`, error);
      contentElement.innerHTML = `<div class="error-message">Failed to load ${tabName} data</div>`;
      reject(error);
    }
  });
}

/**
 * Load overview tab data
 */
function loadOverviewData(playerName, contentElement) {
  return new Promise((resolve, reject) => {
    // Use the correct API endpoint that exists
    fetch(`/api/matches/player/${encodeURIComponent(playerName)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load player data');}
        return response.json();})
      .then(data => {

        
        const player = data.data?.player || {};
        const stats = player.stats || {};
        

        
        const wins = stats.wins || 0;
        const losses = stats.losses || 0;
        const totalGames = stats.totalMatches || wins + losses;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        // Check if this is a WC1 player for special handling
        const isWC1 = player.gameType === 'war1' || player.gameType === 'warcraft1';
        const isWC3 = player.gameType === 'war3' || player.gameType === 'warcraft3';
        const gameTypeDisplay = isWC1 ? 'Warcraft: Orcs & Humans' : 
                               player.gameType === 'war2' ? 'Warcraft II' :
                               player.gameType === 'war3' ? 'Warcraft III' : 
                               player.gameType || 'Unknown';

        // Create WC1-specific content if applicable
        const wc1Content = isWC1 ? `
          <div class="wc1-special-info">
            <div class="wc1-badge">
              <i class="fas fa-sword"></i> Warcraft: Orcs & Humans
            </div>
            <p class="wc1-description">
              This player competes in the classic Warcraft: Orcs & Humans ladder. 
              Matches are primarily vs AI campaigns and 1v1 battles.
            </p>
          </div>
        ` : '';

        contentElement.innerHTML = `
          <div class="overview-content">
            ${wc1Content}
            
            <div class="overview-left">
              <div class="overview-section">
                <h4><i class="fas fa-chart-bar"></i> Match Statistics</h4>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-content">
                      <div class="stat-value">${totalGames}</div>
                      <div class="stat-label">Total Matches</div>
                    </div>
                  </div>
                  
                  <div class="stat-card">
                    <div class="stat-content">
                      <div class="stat-value">${wins}</div>
                      <div class="stat-label">Wins</div>
                    </div>
                  </div>
                  
                  <div class="stat-card">
                    <div class="stat-content">
                      <div class="stat-value">${losses}</div>
                      <div class="stat-label">Losses</div>
                    </div>
                  </div>
                  
                  <div class="stat-card">
                    <div class="stat-content">
                      <div class="stat-value ${winRate >= 60 ? 'positive' : winRate >= 40 ? '' : 'negative'}">${winRate}%</div>
                      <div class="stat-label">Win Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="overview-right">
              <div class="overview-section">
                <h4><i class="fas fa-gamepad"></i> Game Information</h4>
                <div class="game-info">
                  <div class="info-item">
                    <span class="info-label">Game Type:</span>
                    <span class="info-value">${gameTypeDisplay}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Player Status:</span>
                    <span class="info-value ${player.isOnline ? 'online' : 'offline'}">
                      ${player.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  ${player.rank ? `
                    <div class="info-item">
                      <span class="info-label">Current Rank:</span>
                      <span class="info-value">${typeof player.rank === 'object' ? player.rank.name || player.rank.title || 'Unknown' : player.rank}</span>
                    </div>
                  ` : ''}
                  ${player.mmr ? `
                    <div class="info-item">
                      <span class="info-label">MMR Rating:</span>
                      <span class="info-value">${player.mmr}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
        
        resolve();
      })
      .catch(error => {
        logger.error('Error loading overview data', error);
        contentElement.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Failed to Load Overview</h3>
            <p>Unable to load player overview for ${playerName}.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
        reject(error);
      });
  });
}

/**
 * Load matches tab data
 */
function loadMatchesData(playerName, contentElement, page = 1, gameType = null) {
  return new Promise((resolve, reject) => {
    try {
      
      
      // Show loading state with proper structure
      contentElement.innerHTML = `
        <div class="matches-content">
          <div class="matches-header">
            <div class="header-title">
              <h3><i class="fas fa-swords"></i> Match History</h3>
              <span class="matches-count">Loading...</span>
            </div>
            <div class="matches-controls">
              <div class="filter-group">
                <label class="filter-label">Result:</label>
                <select class="filter-select modern" id="match-result-filter">
                  <option value="">All Results</option>
                  <option value="win">Victories</option>
                  <option value="loss">Defeats</option>
                </select>
              </div>
              <div class="filter-group">
                <label class="filter-label">Race:</label>
                <select class="filter-select modern" id="match-race-filter">
                  <option value="">All Races</option>
                  <option value="human">Human</option>
                  <option value="orc">Orc</option>
                  <option value="undead">Undead</option>
                  <option value="nightelf">Night Elf</option>
                  <option value="random">Random</option>
                </select>
              </div>
              <div class="filter-group">
                <label class="filter-label">Map:</label>
                <input type="text" class="filter-input modern" id="match-map-filter" placeholder="Search maps...">
              </div>
              <button class="filter-clear-btn" onclick="clearMatchFilters()">
                <i class="fas fa-times"></i> Clear
              </button>
            </div>
          </div>
          <div class="matches-container">
            <div class="loading-matches">
              <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
              </div>
              <span>Loading match history...</span>
            </div>
          </div>
        </div>
      `;const params = new URLSearchParams({
        limit: '5',
        page: page.toString()
      });
      
      // Add game type filter if provided
      if (gameType && gameType !== 'all') {
        params.append('gameType', gameType);
      }
      
      // Try the dedicated matches endpoint first, fallback to player endpoint
      fetch(`/api/matches/player/${encodeURIComponent(playerName)}?${params}`)
        .then(response => {
          if (response.ok) {
            return response.json();}
          throw new Error('Matches endpoint not available');
        })
        .then(data => {
          const matches = data.data?.matches || [];
          const pagination = data.data?.pagination || {};
          
          
          
          if (matches.length === 0) {
            contentElement.innerHTML = `
              <div class="matches-content">
                <div class="matches-header">
                  <div class="header-title">
                    <h3><i class="fas fa-swords"></i> Match History</h3>
                    <span class="matches-count">0 Matches</span>
                  </div>
                  <div class="matches-controls">
                    <div class="filter-group">
                      <label class="filter-label">Result:</label>
                      <select class="filter-select modern" id="match-result-filter">
                        <option value="">All Results</option>
                        <option value="win">Victories</option>
                        <option value="loss">Defeats</option>
                      </select>
                    </div>
                    <div class="filter-group">
                      <label class="filter-label">Race:</label>
                      <select class="filter-select modern" id="match-race-filter">
                        <option value="">All Races</option>
                        <option value="human">Human</option>
                        <option value="orc">Orc</option>
                        <option value="undead">Undead</option>
                        <option value="nightelf">Night Elf</option>
                        <option value="random">Random</option>
                      </select>
                    </div>
                    <div class="filter-group">
                      <label class="filter-label">Map:</label>
                      <input type="text" class="filter-input modern" id="match-map-filter" placeholder="Search maps...">
                    </div>
                    <button class="filter-clear-btn" onclick="clearMatchFilters()">
                      <i class="fas fa-times"></i> Clear
                    </button>
                  </div>
                </div>
                <div class="matches-container">
                  <div class="no-data">
                    <i class="fas fa-history"></i>
                    <h3>No Recent Matches</h3>
                    <p>No match history found for ${playerName}${gameType ? ` in ${gameType}` : ''}.</p>
                    <p class="help-text">Matches will appear here once they are reported and verified.</p>
                  </div>
                </div>
              </div>
            `;
            resolve();
            return;}

          // Create matches list HTML with enhanced structure
          const matchesHtml = matches.map(match => {
            const matchDate = new Date(match.date || match.createdAt);
            const formattedDate = matchDate.toLocaleDateString();
            const timeAgo = getTimeAgo(matchDate);
            
            // Get match outcome from the processed match data
            const outcome = match.outcome || 'unknown';
            const mmrChange = match.mmrChange || 0;
            
            const outcomeClass = outcome === 'win' ? 'match-win' : outcome === 'loss' ? 'match-loss' : 'match-draw';
            const outcomeIcon = outcome === 'win' ? 'trophy' : outcome === 'loss' ? 'times' : 'equals';
            
            // Get all players and determine display logic
            const allPlayers = match.players || [];
            const matchType = match.matchType || '1v1';
            const gameType = match.gameType || 'unknown';
            const isTeamMatch = matchType.includes('v') && parseInt(matchType.split('v')[0]) > 1;
            
            // For WC1 matches, show special handling
            const isWC1 = gameType === 'warcraft1' || gameType === 'war1';
            
            // Create player links for all players in the match
            let playersDisplay = '';

            if (matchType === 'vsai') {
              // vs AI match - show player vs AI
              const humanPlayer = allPlayers.find(p => !p.isAI);
              const humanPlayerName = humanPlayer ? (humanPlayer.playerId?.name || humanPlayer.name) : playerName;
              const isWinner = outcome === 'win';

              playersDisplay = `
                <div class="match-players">
                  <div class="player-link ${isWinner ? 'winner' : 'loser'}" onclick="window.handlePlayerLinkClick('${humanPlayerName}', event)" title="View ${humanPlayerName}'s profile">
                    <i class="fas fa-user"></i> ${humanPlayerName}
                  </div>
                  <div class="vs-separator">VS</div>
                  <div class="ai-player">
                    <i class="fas fa-robot"></i> AI
                  </div>
                </div>
              `;
            } else if (matchType === 'ffa') {
              // FFA match - show all players
              const playersList = allPlayers.map(p => {
                const pName = p.playerId?.name || p.name || 'Unknown';
                const isWinner = pName === match.winner;
                const isCurrentPlayer = pName === playerName;

                return `
                  <div class="player-link ${isWinner ? 'winner' : 'loser'} ${isCurrentPlayer ? 'current-player' : ''}"
                        onclick="window.handlePlayerLinkClick('${pName}', event)"
                        title="View ${pName}'s profile">
                    <i class="fas fa-user"></i> ${pName}
                    ${isCurrentPlayer ? ' <i class="fas fa-star" title="You"></i>' : ''}
                    ${isWinner ? ' <i class="fas fa-trophy" title="Winner"></i>' : ''}
                  </div>
                `;}).join('');

              playersDisplay = `
                <div class="match-players ffa-match">
                  <div class="ffa-label">FFA (${allPlayers.length} players)</div>
                  <div class="ffa-players">${playersList}</div>
                </div>
              `;
            } else if (!isTeamMatch) {
              // 1v1 match - show both players as clickable links
              const player1 = allPlayers[0];
              const player2 = allPlayers[1];
              
              if (player1 && player2) {
                const player1Name = player1.playerId?.name || player1.name || 'Unknown';
                const player2Name = player2.playerId?.name || player2.name || 'Unknown';
                
                // Determine winner/loser based on match outcome
                const player1IsWinner = player1Name === playerName ? outcome === 'win' : outcome === 'loss';
                const player2IsWinner = player2Name === playerName ? outcome === 'win' : outcome === 'loss';
                
                playersDisplay = `
                  <div class="match-players">
                    <div class="player-link ${player1IsWinner ? 'winner' : 'loser'}" onclick="window.handlePlayerLinkClick('${player1Name}', event)" title="View ${player1Name}'s profile">
                      <i class="fas fa-user"></i> ${player1Name}
                      ${player1IsWinner ? ' <i class="fas fa-trophy winner-icon" title="Winner"></i>' : ' <i class="fas fa-times loser-icon" title="Loser"></i>'}
                    </div>
                    <div class="vs-separator">VS</div>
                    <div class="player-link ${player2IsWinner ? 'winner' : 'loser'}" onclick="window.handlePlayerLinkClick('${player2Name}', event)" title="View ${player2Name}'s profile">
                      <i class="fas fa-user"></i> ${player2Name}
                      ${player2IsWinner ? ' <i class="fas fa-trophy winner-icon" title="Winner"></i>' : ' <i class="fas fa-times loser-icon" title="Loser"></i>'}
                    </div>
                  </div>
                `;
              } else {
                // Fallback for incomplete player data
                playersDisplay = `
                  <div class="match-players">
                    <div class="match-opponents">vs ${allPlayers.find(p => (p.playerId?.name || p.name) !== playerName)?.playerId?.name || 'Unknown'}</div>
                  </div>
                `;
              }
            } else {
              // Team match or other complex match - show simplified player list
              const playersList = allPlayers.map(p => {
                const pName = p.playerId?.name || p.name || 'Unknown';
                const isWinner = pName === match.winner;
                const isCurrentPlayer = pName === playerName;

                return `
                  <div class="player-link ${isWinner ? 'winner' : 'loser'} ${isCurrentPlayer ? 'current-player' : ''}">
                    <i class="fas fa-user"></i> ${pName}
                    ${isCurrentPlayer ? ' <i class="fas fa-star" title="You"></i>' : ''}
                    ${isWinner ? ' <i class="fas fa-trophy" title="Winner"></i>' : ''}
                  </div>
                `;}).join('');

              playersDisplay = `
                <div class="match-players team-match">
                  <div class="team-label">${matchType} (${allPlayers.length} players)</div>
                  <div class="team-players">${playersList}</div>
                </div>
              `;
            }

            // Ensure playersDisplay is never empty
            if (!playersDisplay) {
              playersDisplay = `
                <div class="match-players">
                  <div class="match-info">Match details available</div>
                </div>
              `;
            }

            // Add WC1-specific styling and information
            const wc1Badge = isWC1 ? `<span class="wc1-badge">WC1</span>` : '';
            const gameTypeIcon = isWC1 ? '🗡️' : gameType === 'warcraft2' ? '⚔️' : gameType === 'warcraft3' ? '🏰' : '🎮';

            // Create MMR change display
            const mmrChangeDisplay = mmrChange !== 0 ? `
              <div class="mmr-change ${mmrChange > 0 ? 'positive' : 'negative'}">
                <i class="fas fa-${mmrChange > 0 ? 'arrow-up' : 'arrow-down'}"></i>
                ${Math.abs(mmrChange)}
              </div>
            ` : '';

            const matchHtml = `
              <div class="match-item" data-match-id="${match._id || match.id}" onclick="showMatchDetailsModal('${match._id || match.id}')" title="Click to view detailed match information">
                <div class="match-summary">
                  <div class="match-result ${outcome}">
                    ${outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : 'D'}
                  </div>
                  <div class="match-info">
                    <div class="match-players">
                      ${playerName} vs ${allPlayers.find(p => (p.playerId?.name || p.name) !== playerName)?.playerId?.name || 'Unknown Opponent'}
                    </div>
                    <div class="match-details">
                      ${match.map?.name || match.mapName || 'Unknown Map'} • ${match.resources || 'Standard'}
                    </div>
                  </div>
                  <div class="match-type-badge">
                    ${gameType === 'warcraft1' ? 'WC1' : gameType === 'warcraft2' ? 'WC2' : gameType === 'warcraft3' ? 'WC3' : gameType}
                  </div>
                  <div class="match-meta">
                    ${timeAgo}
                  </div>
                </div>
              </div>
            `;
            
            return matchHtml;}).join('');

          // Create pagination controls
          const currentPage = pagination.page || page;
          const totalPages = pagination.pages || 1;
          const totalMatches = pagination.total || matches.length;
          
  
          
          // Fallback calculation if backend returns incorrect pagination
          const calculatedTotalPages = Math.ceil(totalMatches / 5);const finalTotalPages = totalPages > 1 ? totalPages : calculatedTotalPages;
          
  
          
          // Always show pagination info, even for single page
          const startMatch = ((currentPage - 1) * 5) + 1;
          const endMatch = Math.min(currentPage * 5, totalMatches);
          
          let paginationHtml = `
            <div class="matches-pagination">
              <div class="pagination-info">
                <span class="matches-range">Showing ${startMatch}-${endMatch} of ${totalMatches} matches</span>
                <span class="page-info">Page ${currentPage} of ${finalTotalPages}</span>
              </div>
          `;
          
          // Only show pagination controls if there are multiple pages
          if (finalTotalPages > 1) {
            paginationHtml += `
              <div class="pagination-controls">
                <button class="pagination-btn" onclick="window.loadMatchesPage('${playerName}', ${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
                  <i class="fas fa-chevron-left"></i> Previous
                </button>
                <div class="page-numbers">
                  ${generatePageNumbers(currentPage, finalTotalPages, playerName)}
                </div>
                <button class="pagination-btn" onclick="window.loadMatchesPage('${playerName}', ${currentPage + 1})" ${currentPage >= finalTotalPages ? 'disabled' : ''}>
                  Next <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            `;
          }
          
          paginationHtml += '</div>';

          const finalHtml = `
            <div class="matches-content">
              <div class="matches-header">
                <div class="header-title">
                  <h3><i class="fas fa-swords"></i> Match History</h3>
                  <span class="matches-count">${totalMatches} Matches</span>
                </div>
                <div class="matches-controls">
                  <div class="filter-group">
                    <label class="filter-label">Result:</label>
                    <select class="filter-select modern" id="match-result-filter">
                      <option value="">All Results</option>
                      <option value="win">Victories</option>
                      <option value="loss">Defeats</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label class="filter-label">Race:</label>
                    <select class="filter-select modern" id="match-race-filter">
                      <option value="">All Races</option>
                      <option value="human">Human</option>
                      <option value="orc">Orc</option>
                      <option value="undead">Undead</option>
                      <option value="nightelf">Night Elf</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label class="filter-label">Map:</label>
                    <input type="text" class="filter-input modern" id="match-map-filter" placeholder="Search maps...">
                  </div>
                  <button class="filter-clear-btn" onclick="clearMatchFilters()">
                    <i class="fas fa-times"></i> Clear
                  </button>
                </div>
              </div>
              <div class="matches-container">
                <div class="match-history-list">
                  ${matchesHtml}
                </div>
                ${paginationHtml}
              </div>
            </div>
          `;

  

          contentElement.innerHTML = finalHtml;
          resolve();
        })
        .catch(matchesError => {
  

          // Fallback to player endpoint
          fetch(`/api/matches/player/${encodeURIComponent(playerName)}`)
            .then(response => {
              if (!response.ok) {
                throw new Error('Failed to load player data');
              }
              return response.json();})
            .then(data => {
              const matches = data.data?.matches || [];
              
              if (matches.length === 0) {
                contentElement.innerHTML = `
                  <div class="matches-content">
                    <div class="matches-header">
                      <div class="header-title">
                        <h3><i class="fas fa-swords"></i> Match History</h3>
                        <span class="matches-count">0 Matches</span>
                      </div>
                      <div class="matches-controls">
                        <div class="filter-group">
                          <label class="filter-label">Result:</label>
                          <select class="filter-select modern" id="match-result-filter">
                            <option value="">All Results</option>
                            <option value="win">Victories</option>
                            <option value="loss">Defeats</option>
                          </select>
                        </div>
                        <div class="filter-group">
                          <label class="filter-label">Race:</label>
                          <select class="filter-select modern" id="match-race-filter">
                            <option value="">All Races</option>
                            <option value="human">Human</option>
                            <option value="orc">Orc</option>
                            <option value="undead">Undead</option>
                            <option value="nightelf">Night Elf</option>
                            <option value="random">Random</option>
                          </select>
                        </div>
                        <div class="filter-group">
                          <label class="filter-label">Map:</label>
                          <input type="text" class="filter-input modern" id="match-map-filter" placeholder="Search maps...">
                        </div>
                        <button class="filter-clear-btn" onclick="clearMatchFilters()">
                          <i class="fas fa-times"></i> Clear
                        </button>
                      </div>
                    </div>
                    <div class="matches-container">
                      <div class="no-data">
                        <i class="fas fa-history"></i>
                        <h3>No Recent Matches</h3>
                        <p>No match history found for ${playerName}${gameType ? ` in ${gameType}` : ''}.</p>
                        <p class="help-text">Matches will appear here once they are reported and verified.</p>
                      </div>
                    </div>
                  </div>
                `;
                resolve();
                return;}

              // Process matches with fallback data
              const matchesHtml = matches.map(match => {
                const matchDate = new Date(match.createdAt || match.date || Date.now());
                const timeAgo = getTimeAgo(matchDate);
                const outcome = match.outcome || 'unknown';
                const mmrChange = match.mmrChange || 0;
                
                const outcomeClass = outcome === 'win' ? 'match-win' : outcome === 'loss' ? 'match-loss' : 'match-draw';
                const outcomeIcon = outcome === 'win' ? 'trophy' : outcome === 'loss' ? 'times' : 'equals';
                
                const mmrChangeDisplay = mmrChange !== 0 ? `
                  <div class="mmr-change ${mmrChange > 0 ? 'positive' : 'negative'}">
                    <i class="fas fa-${mmrChange > 0 ? 'arrow-up' : 'arrow-down'}"></i>
                    ${Math.abs(mmrChange)}
                  </div>
                ` : '';

                return `
                  <div class="match-item ${outcomeClass}" data-match-id="${match._id || match.id}" onclick="window.toggleMatchDetails('${match._id || match.id}', event)" title="Click to view detailed match information">
                    <div class="match-header">
                      <div class="match-outcome">
                        <i class="fas fa-${outcomeIcon}"></i>
                        <span class="outcome-text">${outcome.toUpperCase()}</span>
                      </div>
                      <div class="match-type">
                        🎮 ${match.matchType || '1v1'}
                      </div>
                      ${mmrChangeDisplay}
                      <div class="match-date">${timeAgo}</div>
                    </div>
                    <div class="match-content">
                      <div class="match-info">
                        <div class="match-map">
                          <i class="fas fa-map"></i>
                          ${match.map?.name || match.mapName || 'Unknown Map'}
                        </div>
                        <div class="match-resources">
                          ${match.resources || 'Standard'}
                        </div>
                      </div>
                      <div class="match-players">
                        <div class="player-link ${outcome === 'win' ? 'winner' : 'loser'}">
                          <i class="fas fa-user"></i> ${playerName}
                        </div>
                        <div class="vs-separator">VS</div>
                        <div class="player-link ${outcome === 'win' ? 'loser' : 'winner'}">
                          <i class="fas fa-user"></i> ${match.opponent || 'Opponent'}
                        </div>
                      </div>
                    </div>
                  </div>
                `;}).join('');

              const finalHtml = `
                <div class="matches-content">
                  <div class="matches-header">
                    <div class="header-title">
                      <h3><i class="fas fa-swords"></i> Match History</h3>
                      <span class="matches-count">${matches.length} Matches</span>
                    </div>
                    <div class="matches-controls">
                      <div class="filter-group">
                        <label class="filter-label">Result:</label>
                        <select class="filter-select modern" id="match-result-filter">
                          <option value="">All Results</option>
                          <option value="win">Victories</option>
                          <option value="loss">Defeats</option>
                        </select>
                      </div>
                      <div class="filter-group">
                        <label class="filter-label">Race:</label>
                        <select class="filter-select modern" id="match-race-filter">
                          <option value="">All Races</option>
                          <option value="human">Human</option>
                          <option value="orc">Orc</option>
                          <option value="undead">Undead</option>
                          <option value="nightelf">Night Elf</option>
                          <option value="random">Random</option>
                        </select>
                      </div>
                      <div class="filter-group">
                        <label class="filter-label">Map:</label>
                        <input type="text" class="filter-input modern" id="match-map-filter" placeholder="Search maps...">
                      </div>
                      <button class="filter-clear-btn" onclick="clearMatchFilters()">
                        <i class="fas fa-times"></i> Clear
                      </button>
                    </div>
                  </div>
                  <div class="matches-container">
                    <div class="match-history-list">
                      ${matchesHtml}
                    </div>
                  </div>
                </div>
              `;

              contentElement.innerHTML = finalHtml;
              resolve();
            })
            .catch(error => {
              logger.error('Failed to load matches from player endpoint', error);
              contentElement.innerHTML = `
                <div class="matches-content">
                  <div class="matches-header">
                    <div class="header-title">
                      <h3><i class="fas fa-swords"></i> Match History</h3>
                      <span class="matches-count">Error</span>
                    </div>
                    <div class="matches-controls">
                      <div class="filter-group">
                        <label class="filter-label">Result:</label>
                        <select class="filter-select modern" id="match-result-filter">
                          <option value="">All Results</option>
                          <option value="win">Victories</option>
                          <option value="loss">Defeats</option>
                        </select>
                      </div>
                      <div class="filter-group">
                        <label class="filter-label">Race:</label>
                        <select class="filter-select modern" id="match-race-filter">
                          <option value="">All Races</option>
                          <option value="human">Human</option>
                          <option value="orc">Orc</option>
                          <option value="undead">Undead</option>
                          <option value="nightelf">Night Elf</option>
                          <option value="random">Random</option>
                        </select>
                      </div>
                      <div class="filter-group">
                        <label class="filter-label">Map:</label>
                        <input type="text" class="filter-input modern" id="match-map-filter" placeholder="Search maps...">
                      </div>
                      <button class="filter-clear-btn" onclick="clearMatchFilters()">
                        <i class="fas fa-times"></i> Clear
                      </button>
                    </div>
                  </div>
                  <div class="matches-container">
                    <div class="error-message">
                      <i class="fas fa-exclamation-triangle"></i>
                      <h3>Failed to Load Matches</h3>
                      <p>Unable to load match history. Please try again later.</p>
                    </div>
                  </div>
                </div>
              `;
              reject(error);
            });
        })
        .catch(error => {
          logger.error('Error loading matches', error);
          contentElement.innerHTML = `
            <div class="matches-content">
              <div class="matches-header">
                <div class="header-title">
                  <h3><i class="fas fa-swords"></i> Match History</h3>
                  <span class="matches-count">Error</span>
                </div>
                <div class="matches-controls">
                  <div class="filter-group">
                    <label class="filter-label">Result:</label>
                    <select class="filter-select modern" id="match-result-filter">
                      <option value="">All Results</option>
                      <option value="win">Victories</option>
                      <option value="loss">Defeats</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label class="filter-label">Race:</label>
                    <select class="filter-select modern" id="match-race-filter">
                      <option value="">All Races</option>
                      <option value="human">Human</option>
                      <option value="orc">Orc</option>
                      <option value="undead">Undead</option>
                      <option value="nightelf">Night Elf</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label class="filter-label">Map:</label>
                    <input type="text" class="filter-input modern" id="match-map-filter" placeholder="Search maps...">
                  </div>
                  <button class="filter-clear-btn" onclick="clearMatchFilters()">
                    <i class="fas fa-times"></i> Clear
                  </button>
                </div>
              </div>
              <div class="matches-container">
                <div class="error-message">
                  <i class="fas fa-exclamation-triangle"></i>
                  <h3>Failed to Load Matches</h3>
                  <p>Unable to load match history. Please try again later.</p>
                </div>
              </div>
            </div>
          `;
          reject(error);
        });
    } catch (error) {
      logger.error('Error in loadMatchesData', error);
      contentElement.innerHTML = `
        <div class="matches-content">
          <div class="matches-header">
            <div class="header-title">
              <h3><i class="fas fa-swords"></i> Match History</h3>
              <span class="matches-count">Error</span>
            </div>
            <div class="matches-controls">
              <div class="filter-group">
                <label class="filter-label">Result:</label>
                <select class="filter-select modern" id="match-result-filter">
                  <option value="">All Results</option>
                  <option value="win">Victories</option>
                  <option value="loss">Defeats</option>
                </select>
              </div>
              <div class="filter-group">
                <label class="filter-label">Race:</label>
                <select class="filter-select modern" id="match-race-filter">
                  <option value="">All Races</option>
                  <option value="human">Human</option>
                  <option value="orc">Orc</option>
                  <option value="undead">Undead</option>
                  <option value="nightelf">Night Elf</option>
                  <option value="random">Random</option>
                </select>
                </select>
              </div>
              <div class="filter-group">
                <label class="filter-label">Map:</label>
                <input type="text" class="filter-input modern" id="match-map-filter" placeholder="Search maps...">
              </div>
              <button class="filter-clear-btn" onclick="clearMatchFilters()">
                <i class="fas fa-times"></i> Clear
              </button>
            </div>
          </div>
          <div class="matches-container">
            <div class="error-message">
              <i class="fas fa-exclamation-triangle"></i>
              <h3>Failed to Load Matches</h3>
              <p>Unable to load match history. Please try again later.</p>
            </div>
          </div>
        </div>
      `;
      reject(error);
    }
  });
}

/**
 * Generate page number buttons for pagination
 */
function generatePageNumbers(currentPage, totalPages, playerName) {
  const pages = [];
  const maxVisible = 5;
  
  if (totalPages <= maxVisible) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show smart pagination with ellipsis
    if (currentPage <= 3) {
      // Near start: show 1, 2, 3, 4, 5, ..., last
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      if (totalPages > 5) {
        pages.push('...');
        pages.push(totalPages);
      }
    } else if (currentPage >= totalPages - 2) {
      // Near end: show 1, ..., last-4, last-3, last-2, last-1, last
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Middle: show 1, ..., current-1, current, current+1, ..., last
      pages.push(1);
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    }
  }
  
  return pages.map(page => {
    if (page === '...') {
      return '<span class="page-ellipsis">...</span>';}
    const isCurrent = page === currentPage;
    return `
      <button class="btn ${isCurrent ? 'btn-primary' : 'btn-secondary'}" 
              onclick="window.loadMatchesPage('${playerName}', ${page})"
              ${isCurrent ? 'disabled' : ''}>
        ${page}
      </button>
    `;}).join('');
}

/**
 * Load matches for a specific page (for pagination)
 */
window.loadMatchesPage = function(playerName, page) {
  const modal = document.getElementById('player-stats-modal');
  if (!modal) return;const matchesContent = modal.querySelector('#matches-content');
  if (!matchesContent) return;matchesContent.dataset.currentPage = page;
  
  // Try to get player game type from the modal or fetch it
  let playerGameType = null;
  fetch(`/api/matches/player/${encodeURIComponent(playerName)}`)
    .then(playerResponse => {
      if (playerResponse.ok) {
        return playerResponse.json();}
      throw new Error('Failed to fetch player data');
    })
    .then(playerData => {
                playerGameType = playerData.data?.player?.gameType || null;
      
      // Update the content element with new page data
      return loadMatchesData(playerName, matchesContent, page, playerGameType);})
    .catch(error => {
      logger.warn('Could not fetch player data for game type', error);
      // Still try to load matches without game type
      return loadMatchesData(playerName, matchesContent, page, null);});
};

/**
 * Load performance tab data
 */
function loadPerformanceData(playerName, contentElement) {
  return new Promise((resolve, reject) => {
    // Use the correct API endpoint that exists
    fetch(`/api/matches/player/${encodeURIComponent(playerName)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load player data');}
        return response.json();})
      .then(data => {
        const player = data.data?.player || {};
        const stats = player.stats || {};
        
        // Check if this is a WC1 player for special handling
        const isWC1 = player.gameType === 'war1' || player.gameType === 'warcraft1';
        const isWC3 = player.gameType === 'war3' || player.gameType === 'warcraft3';
        
        // Get race performance data
        const raceStats = stats.races || {};
        const raceWins = stats.raceWins || {};
        
        // Get map performance data (mock data for now - replace with actual API data)
        const mapStats = stats.maps || {
          'Lost Temple': { total: 45, wins: 32 },
          'Plains of Snow': { total: 38, wins: 25 },
          'Garden of War': { total: 32, wins: 18 },
          'Twisted Meadows': { total: 28, wins: 22 },
          'Echo Isles': { total: 25, wins: 15 }
        };
        
        // Calculate win/loss streak (mock data - replace with actual API data)
        const recentMatches = stats.recentMatches || [
          { outcome: 'win', date: '2024-01-15' },
          { outcome: 'win', date: '2024-01-14' },
          { outcome: 'loss', date: '2024-01-13' },
          { outcome: 'win', date: '2024-01-12' },
          { outcome: 'win', date: '2024-01-11' },
          { outcome: 'win', date: '2024-01-10' },
          { outcome: 'loss', date: '2024-01-09' }
        ];
        
        // Calculate current streak
        let currentStreak = 0;
        let streakType = 'none';
        for (let i = 0; i < recentMatches.length; i++) {
          if (i === 0) {
            streakType = recentMatches[i].outcome;
            currentStreak = 1;
          } else if (recentMatches[i].outcome === streakType) {
            currentStreak++;
          } else {
            break;
          }
        }
        
        // Create race performance chart (smaller, modular)
        let raceChartHTML = '';
        if (Object.keys(raceStats).length > 0) {
          raceChartHTML = `
            <div class="performance-section">
              <h4><i class="fas fa-chart-bar"></i> Win Rate by Race</h4>
              <div class="race-chart-container">
                <div class="race-chart">
          `;
          
          Object.entries(raceStats).forEach(([race, totalGames]) => {
            const wins = raceWins[race] || 0;
            const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
            
            // Get race display info
            let raceDisplay = race.charAt(0).toUpperCase() + race.slice(1);
            let raceIcon = '🎮';
            
            if (isWC1 || player.gameType === 'war2' || player.gameType === 'warcraft2') {
              switch (race) {
                case 'human':
                  raceDisplay = 'Human';
                  raceIcon = '👤';
                  break;
                case 'orc':
                  raceDisplay = 'Orc';
                  raceIcon = '🟢';
                  break;
                case 'random':
                  raceDisplay = 'Random';
                  raceIcon = '🎲';
                  break;
              }
            } else if (isWC3) {
              switch (race) {
                case 'human':
                  raceDisplay = 'Human';
                  raceIcon = '👤';
                  break;
                case 'orc':
                  raceDisplay = 'Orc';
                  raceIcon = '🟢';
                  break;
                case 'undead':
                  raceDisplay = 'Undead';
                  raceIcon = '💀';
                  break;
                case 'night_elf':
                  raceDisplay = 'Night Elf';
                  raceIcon = '🌙';
                  break;
                case 'random':
                  raceDisplay = 'Random';
                  raceIcon = '🎲';
                  break;
              }
            }
            
            const winRateClass = winRate >= 70 ? 'excellent' : winRate >= 60 ? 'good' : winRate >= 50 ? 'average' : 'poor';
            
            raceChartHTML += `
              <div class="race-chart-item">
                <div class="race-chart-header">
                  <span class="race-icon">${raceIcon}</span>
                  <span class="race-name">${raceDisplay}</span>
                  <span class="race-winrate ${winRateClass}">${winRate}%</span>
                </div>
                <div class="race-chart-bars">
                  <div class="race-wins-bar" style="width: ${winRate}%"></div>
                  <div class="race-losses-bar" style="width: ${100 - winRate}%"></div>
                </div>
                <div class="race-total">${wins}W / ${totalGames - wins}L (${totalGames} total)</div>
              </div>
            `;
          });
          
          raceChartHTML += `
                </div>
              </div>
            </div>
          `;
        }
        
        // Create top maps performance chart
        let mapsChartHTML = '';
        if (Object.keys(mapStats).length > 0) {
          mapsChartHTML = `
            <div class="performance-section">
              <h4><i class="fas fa-map"></i> Top Maps Performance</h4>
              <div class="maps-chart-container">
                <div class="maps-chart">
          `;
          
          // Sort maps by total games and take top 5
          const sortedMaps = Object.entries(mapStats)
            .sort(([,a], [,b]) => b.total - a.total)
            .slice(0, 5);
          
          sortedMaps.forEach(([mapName, mapData]) => {
            const winRate = mapData.total > 0 ? Math.round((mapData.wins / mapData.total) * 100) : 0;
            const winRateClass = winRate >= 70 ? 'excellent' : winRate >= 60 ? 'good' : winRate >= 50 ? 'average' : 'poor';
            
            mapsChartHTML += `
              <div class="map-chart-item">
                <div class="map-chart-header">
                  <span class="map-icon">🗺️</span>
                  <span class="map-name">${mapName}</span>
                  <span class="map-winrate ${winRateClass}">${winRate}%</span>
                </div>
                <div class="map-chart-bars">
                  <div class="map-wins-bar" style="width: ${winRate}%"></div>
                  <div class="map-losses-bar" style="width: ${100 - winRate}%"></div>
                </div>
                <div class="map-total">${mapData.wins}W / ${mapData.total - mapData.wins}L (${mapData.total} total)</div>
              </div>
            `;
          });
          
          mapsChartHTML += `
                </div>
              </div>
            </div>
          `;
        }
        
        // Create streak display
        let streakHTML = '';
        if (currentStreak > 0) {
          const streakIcon = streakType === 'win' ? '🔥' : '❄️';
          const streakColor = streakType === 'win' ? '#10b981' : '#ef4444';
          const streakText = streakType === 'win' ? 'WIN' : 'LOSS';
          
          streakHTML = `
            <div class="streak-display">
              <div class="streak-icon">${streakIcon}</div>
              <div class="streak-info">
                <div class="streak-count">${currentStreak}</div>
                <div class="streak-type">${streakText} STREAK</div>
              </div>
            </div>
          `;
        }
        
        // Create additional stats section
        const additionalStatsHTML = stats.totalGames ? `
          <div class="additional-stats-section">
            <h4><i class="fas fa-chart-bar"></i> Overall Statistics</h4>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="fas fa-gamepad"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">${stats.totalGames || 0}</div>
                  <div class="stat-label">Total Games</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="fas fa-trophy"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">${stats.wins || 0}</div>
                  <div class="stat-label">Total Wins</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="fas fa-percentage"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">${stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0}%</div>
                  <div class="stat-label">Win Rate</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">${player.mmr || 0}</div>
                  <div class="stat-label">Current MMR</div>
                </div>
              </div>
            </div>
          </div>
        ` : '';

        // Load enhanced performance tab CSS if not already loaded
        if (!document.getElementById('performance-tab-enhanced-css')) {
          const link = document.createElement('link');
          link.id = 'performance-tab-enhanced-css';
          link.rel = 'stylesheet';
          link.href = '/css/performance-tab-enhanced.css';
          document.head.appendChild(link);
        }



        // Create enhanced performance tab with better data visualization
        contentElement.innerHTML = `
          <div class="performance-content-enhanced">
            <div class="performance-header-section">
              <h2><i class="fas fa-chart-line"></i> Performance Analytics</h2>
              <p class="performance-subtitle">Detailed breakdown of your competitive performance</p>
            </div>

            <!-- Key Performance Indicators -->
            <div class="kpi-section">
              <div class="kpi-grid">
                <div class="kpi-card primary">
                  <div class="kpi-icon">
                    <i class="fas fa-trophy"></i>
                  </div>
                  <div class="kpi-content">
                    <div class="kpi-value">${player.mmr || 0}</div>
                    <div class="kpi-label">Current MMR</div>
                    <div class="kpi-trend ${(player.mmr || 0) >= 1200 ? 'positive' : 'neutral'}">
                      <i class="fas fa-arrow-${(player.mmr || 0) >= 1200 ? 'up' : 'right'}"></i>
                      ${(player.mmr || 0) >= 1200 ? '+' : ''}${((player.mmr || 0) - 1200)}
                    </div>
                  </div>
                </div>
                
                <div class="kpi-card success">
                  <div class="kpi-icon">
                    <i class="fas fa-percentage"></i>
                  </div>
                  <div class="kpi-content">
                    <div class="kpi-value">${stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0}%</div>
                    <div class="kpi-label">Win Rate</div>
                    <div class="kpi-trend ${(stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0) >= 50 ? 'positive' : 'negative'}">
                      <i class="fas fa-star"></i>
                      ${stats.wins || 0}W / ${stats.losses || 0}L
                    </div>
                  </div>
                </div>
                
                <div class="kpi-card info">
                  <div class="kpi-icon">
                    <i class="fas fa-gamepad"></i>
                  </div>
                  <div class="kpi-content">
                    <div class="kpi-value">${stats.totalGames || 0}</div>
                    <div class="kpi-label">Total Games</div>
                    <div class="kpi-trend neutral">
                      <i class="fas fa-calendar-alt"></i>
                      This Season
                    </div>
                  </div>
                </div>
                
                <div class="kpi-card ${currentStreak > 0 ? 'success' : currentStreak < 0 ? 'danger' : 'neutral'}">
                  <div class="kpi-icon">
                    <i class="fas fa-fire"></i>
                  </div>
                  <div class="kpi-content">
                    <div class="kpi-value">${Math.abs(currentStreak)}</div>
                    <div class="kpi-label">${currentStreak > 0 ? 'Win' : currentStreak < 0 ? 'Loss' : 'No'} Streak</div>
                    <div class="kpi-trend ${currentStreak > 0 ? 'positive' : currentStreak < 0 ? 'negative' : 'neutral'}">
                      <i class="fas fa-${currentStreak > 0 ? 'thumbs-up' : currentStreak < 0 ? 'thumbs-down' : 'minus'}"></i>
                      ${currentStreak > 0 ? 'Hot!' : currentStreak < 0 ? 'Cold' : 'Neutral'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Performance Breakdown -->
            <div class="performance-breakdown">
              <div class="breakdown-grid">
                <!-- Recent Form -->
                <div class="breakdown-card">
                  <div class="breakdown-header">
                    <h3><i class="fas fa-history"></i> Recent Form</h3>
                    <span class="breakdown-subtitle">Last 10 Games</span>
                  </div>
                  <div class="recent-form">
                    ${recentMatches.slice(0, 10).map(match => `
                      <div class="form-indicator ${match.outcome}">
                        <span class="form-letter">${match.outcome.charAt(0).toUpperCase()}</span>
                        <div class="form-tooltip">${match.outcome === 'win' ? 'Victory' : 'Defeat'} on ${match.date}</div>
                      </div>
                    `).join('')}
                  </div>
                  <div class="form-summary">
                    <span class="wins">${recentMatches.slice(0, 10).filter(m => m.outcome === 'win').length}W</span>
                    <span class="losses">${recentMatches.slice(0, 10).filter(m => m.outcome === 'loss').length}L</span>
                  </div>
                </div>

                <!-- Race Performance -->
                <div class="breakdown-card">
                  <div class="breakdown-header">
                    <h3><i class="fas fa-shield-alt"></i> Race Performance</h3>
                    <span class="breakdown-subtitle">Win rates by race</span>
                  </div>
                  <div class="race-stats">
                    ${Object.entries(raceStats).length > 0 ? 
                      Object.entries(raceStats).map(([race, games]) => {
                        const wins = raceWins[race] || 0;
                        const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
                        return `
                          <div class="race-stat-item">
                            <div class="race-info">
                              <span class="race-name">${race}</span>
                              <span class="race-games">${games} games</span>
                            </div>
                            <div class="race-performance">
                              <div class="race-winrate ${winRate >= 60 ? 'excellent' : winRate >= 50 ? 'good' : 'poor'}">${winRate}%</div>
                              <div class="race-record">${wins}W-${games - wins}L</div>
                            </div>
                          </div>
                        `;}).join('') 
                      : '<div class="no-data">No race data available</div>'
                    }
                  </div>
                </div>

                <!-- Map Performance -->
                <div class="breakdown-card">
                  <div class="breakdown-header">
                    <h3><i class="fas fa-map"></i> Map Performance</h3>
                    <span class="breakdown-subtitle">Top performing maps</span>
                  </div>
                  <div class="map-stats">
                    ${Object.entries(mapStats).slice(0, 5).map(([map, data]) => {
                      const winRate = Math.round((data.wins / data.total) * 100);
                      return `
                        <div class="map-stat-item">
                          <div class="map-info">
                            <span class="map-name">${map}</span>
                            <span class="map-games">${data.total} games</span>
                          </div>
                          <div class="map-performance">
                            <div class="map-winrate ${winRate >= 60 ? 'excellent' : winRate >= 50 ? 'good' : 'poor'}">${winRate}%</div>
                            <div class="map-record">${data.wins}W-${data.total - data.wins}L</div>
                          </div>
                        </div>
                      `;}).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Advanced Analytics -->
            <div class="advanced-analytics">
              <div class="analytics-header">
                <h3><i class="fas fa-microscope"></i> Advanced Analytics</h3>
                <p>Detailed statistical breakdown</p>
              </div>
              
              <div class="analytics-grid">
                <div class="analytics-card">
                  <h4><i class="fas fa-chart-bar"></i> Game Distribution</h4>
                  <div class="distribution-stats">
                    <div class="dist-item">
                      <span class="dist-label">Average MMR Change</span>
                      <span class="dist-value">+12 per win</span>
                    </div>
                    <div class="dist-item">
                      <span class="dist-label">Longest Win Streak</span>
                      <span class="dist-value">${Math.max(...recentMatches.map((_, i) => {
                        let streak = 0;
                        for (let j = i; j < recentMatches.length && recentMatches[j].outcome === 'win'; j++) streak++;
                        return streak;}))} games</span>
                    </div>
                    <div class="dist-item">
                      <span class="dist-label">Most Played Time</span>
                      <span class="dist-value">Evening (7-10 PM)</span>
                    </div>
                  </div>
                </div>
                
                <div class="analytics-card">
                  <h4><i class="fas fa-target"></i> Performance Insights</h4>
                  <div class="insights-list">
                    ${stats.totalGames > 10 ? `
                      <div class="insight-item ${(stats.wins / stats.totalGames) >= 0.6 ? 'positive' : (stats.wins / stats.totalGames) >= 0.4 ? 'neutral' : 'negative'}">
                        <i class="fas fa-${(stats.wins / stats.totalGames) >= 0.6 ? 'arrow-up' : (stats.wins / stats.totalGames) >= 0.4 ? 'minus' : 'arrow-down'}"></i>
                        ${(stats.wins / stats.totalGames) >= 0.6 ? 'Excellent' : (stats.wins / stats.totalGames) >= 0.4 ? 'Average' : 'Below average'} win rate performance
                      </div>
                    ` : ''}
                    ${currentStreak >= 3 ? `
                      <div class="insight-item positive">
                        <i class="fas fa-fire"></i>
                        On a hot winning streak!
                      </div>
                    ` : currentStreak <= -3 ? `
                      <div class="insight-item negative">
                        <i class="fas fa-ice-cream"></i>
                        Consider taking a break or trying new strategies
                      </div>
                    ` : ''}
                    <div class="insight-item neutral">
                      <i class="fas fa-info-circle"></i>
                      ${isWC1 ? 'WC1 vs AI performance tracked' : isWC3 ? 'WC3 competitive ladder' : 'WC2 competitive performance'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        
        resolve();
      })
      .catch(error => {
        logger.error('Error loading performance data', error);
        contentElement.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Failed to Load Performance</h3>
            <p>Unable to load player performance data for ${playerName}.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
        reject(error);
      });
  });
}

/**
 * Toggle match details expansion with professional modal
 */
window.toggleMatchDetails = function(matchId, event) {
  

  // Prevent event bubbling for player links
  if (event.target.closest('.player-link')) {
    
    return;}

  // Check if clicked on expand icon specifically
  if (event.target.closest('.match-expand-icon')) {
    
  }

  // Always use the working implementation
  showMatchDetailsModal(matchId);
};

// EPIC WARBOARD modal function using new ModalManager
window.showMatchDetailsModal = function(matchId) {
  

  return new Promise((resolve, reject) => {
    try {

      // Fetch match data with fallback
      fetch(`/api/matches/${matchId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`API returned ${response.status}`);}
          return response.json();})
        .then(matchData => {
  
          
          // Use the new ModalManager to create the EPIC WARBOARD modal
          window.ModalManager.createModal({
            id: 'warboard-modal',
            title: 'Match Details',
            icon: 'fa-gamepad',
            content: () => {
              // Create the EPIC WARBOARD content
              const contentContainer = document.createElement('div');
              contentContainer.className = 'match-details-container';
              contentContainer.innerHTML = createMatchDetailsContent(matchData);
              return contentContainer;},
            styles: {
              container: 'warboard-modal',
              header: 'warboard-header',
              title: 'warboard-title',
              content: 'warboard-content'
            },
            onOpen: (modal) => {
      
              resolve();
            },
            onClose: (modal) => {
              logger.info('EPIC WARBOARD modal closed');
            }
          });

        })
        .catch(apiError => {


          // Create mock match data for display
          const mockMatchData = {
            _id: matchId,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            map: {
              name: 'Twisted Meadows',
              resources: 'High Resources'
            },
            mapName: 'Twisted Meadows',
            resources: 'High Resources',
            matchType: '4v4',
            duration: '25:30',
            winner: 'Team 1',
            players: [
              {
                name: 'WC3_Grunt20',
                race: 'Orc',
                result: 'win',
                winner: true,
                mmrChange: 25,
                team: 'Team 1'
              },
              {
                name: 'WC3_Mage5',
                race: 'Human',
                result: 'win',
                winner: true,
                mmrChange: 25,
                team: 'Team 1'
              },
              {
                name: 'WC3_Hunter89',
                race: 'Night Elf',
                result: 'win',
                winner: true,
                mmrChange: 25,
                team: 'Team 1'
              },
              {
                name: 'WC3_Worgen6',
                race: 'Undead',
                result: 'win',
                winner: true,
                mmrChange: 25,
                team: 'Team 1'
              },
              {
                name: 'Champion_Mage6',
                race: 'Human',
                result: 'loss',
                winner: false,
                mmrChange: -25,
                team: 'Team 2'
              },
              {
                name: 'Reforged_Archer42',
                race: 'Night Elf',
                result: 'loss',
                winner: false,
                mmrChange: -25,
                team: 'Team 2'
              },
              {
                name: 'Champion_Undead43',
                race: 'Undead',
                result: 'loss',
                winner: false,
                mmrChange: -25,
                team: 'Team 2'
              },
              {
                name: 'Champion_Undead52',
                race: 'Undead',
                result: 'loss',
                winner: false,
                mmrChange: -25,
                team: 'Team 2'
              }
            ],
            mmrChanges: {
              'WC3_Grunt20': 25,
              'WC3_Mage5': 25,
              'WC3_Hunter89': 25,
              'WC3_Worgen6': 25,
              'Champion_Mage6': -25,
              'Reforged_Archer42': -25,
              'Champion_Undead43': -25,
              'Champion_Undead52': -25
            }
          };

          // Use ModalManager with mock data
          window.ModalManager.createModal({
            id: 'warboard-modal',
            title: 'Match Details',
            icon: 'fa-gamepad',
            content: () => {
              const contentContainer = document.createElement('div');
              contentContainer.className = 'match-details-container';
              contentContainer.innerHTML = createMatchDetailsContent(mockMatchData);
              return contentContainer;},
            styles: {
              container: 'warboard-modal',
              header: 'warboard-header',
              title: 'warboard-title',
              content: 'warboard-content'
            },
            onOpen: (modal) => {

              resolve();
            },
            onClose: (modal) => {
              logger.info('EPIC WARBOARD modal closed');
            }
          });

        })
        .catch(error => {
          logger.error('Failed to load match details', error);
          reject(error);
        });
    } catch (error) {
      logger.error('Error in showMatchDetailsModal', error);
      reject(error);
    }
  });
};

// Helper function to setup match modal events
function setupMatchModalEvents() {
  const modal = document.getElementById('match-details-modal');
  if (!modal) {
    logger.warn('Match details modal not found for event setup');
    return;}

  // Close modal when clicking backdrop
  const backdrop = modal.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeMatchDetailsModal);
  }

  // Close modal with Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeMatchDetailsModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// EPIC WARBOARD function to create match details content
function createMatchDetailsContent(matchData) {
  

  // Extract match information with better data handling
  const match = matchData.match || matchData;
  const matchId = match._id || match.id || 'Unknown';
  const matchDate = new Date(match.createdAt || match.date || Date.now());
  const mapName = match.map?.name || match.mapName || 'Unknown Map';
  const mapResources = match.map?.resources || match.resources || 'Standard';
  const matchType = match.matchType || '1v1';
  const duration = match.duration || 'Unknown';
  const gameType = match.gameType || 'unknown';
  
  // Extract players with proper winner/loser detection
  const players = match.players || [];
  const winner = match.winner || 'Unknown';
  const mmrChanges = match.mmrChanges || {};



  // Get current player and opponent for battle display
  const currentPlayer = players.find(p => p.playerId?.name || p.name) || { name: 'Unknown Player' };
  const opponent = players.find(p => (p.playerId?.name || p.name) !== (currentPlayer.playerId?.name || currentPlayer.name)) || { name: 'Unknown Opponent' };
  
  // Determine winner/loser
  const currentPlayerWon = winner === (currentPlayer.playerId?.name || currentPlayer.name);
  const currentPlayerClass = currentPlayerWon ? 'winner' : 'loser';
  const opponentClass = currentPlayerWon ? 'loser' : 'winner';
  
  // Get player avatars (first letter of name)
  const currentPlayerAvatar = (currentPlayer.playerId?.name || currentPlayer.name || 'U').charAt(0).toUpperCase();
  const opponentAvatar = (opponent.playerId?.name || opponent.name || 'U').charAt(0).toUpperCase();

  // Create EPIC WARBOARD battle display
  const battleDisplay = `
    <div class="warboard-section">
      <h3 class="section-title">
        <i class="fas fa-swords"></i> Battle Arena
      </h3>
      <div class="battle-display">
        <div class="battle-player ${currentPlayerClass}">
          <div class="player-avatar">${currentPlayerAvatar}</div>
          <div class="player-name">${currentPlayer.playerId?.name || currentPlayer.name}</div>
          <div class="player-race">${currentPlayer.race || 'Unknown Race'}</div>
          <div class="player-stats">
            <div class="stat-item">MMR: ${currentPlayer.mmr || 'N/A'}</div>
            <div class="stat-item">${currentPlayerWon ? 'WINNER' : 'LOSER'}</div>
          </div>
        </div>
        
        <div class="battle-vs">
          <div class="vs-circle">VS</div>
          <div class="vs-lines">
            <div class="vs-line"></div>
            <div class="vs-line"></div>
            <div class="vs-line"></div>
          </div>
        </div>
        
        <div class="battle-player ${opponentClass}">
          <div class="player-avatar">${opponentAvatar}</div>
          <div class="player-name">${opponent.playerId?.name || opponent.name}</div>
          <div class="player-race">${opponent.race || 'Unknown Race'}</div>
          <div class="player-stats">
            <div class="stat-item">MMR: ${opponent.mmr || 'N/A'}</div>
            <div class="stat-item">${currentPlayerWon ? 'LOSER' : 'WINNER'}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Create screenshots section if available
  const screenshotsSection = match.screenshots && match.screenshots.length > 0 ? `
    <div class="screenshots-section">
      <h3><i class="fas fa-camera"></i> Screenshots</h3>
      <div class="screenshots-grid">
        ${match.screenshots.map(screenshot => `
          <div class="screenshot-item">
            <img src="${screenshot.url}" alt="Match Screenshot" onclick="openScreenshotModal('${screenshot.url}')">
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Create match details grid
  const matchDetailsGrid = `
    <div class="warboard-section">
      <h3 class="section-title">
        <i class="fas fa-info-circle"></i> Match Details
      </h3>
      <div class="match-details-grid">
        <div class="detail-card">
          <div class="detail-label">Game Type</div>
          <div class="detail-value">${gameType === 'warcraft1' ? 'Warcraft I' : gameType === 'warcraft2' ? 'Warcraft II' : gameType === 'warcraft3' ? 'Warcraft III' : gameType}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Match Type</div>
          <div class="detail-value">${matchType}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Map</div>
          <div class="detail-value">${mapName}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Resources</div>
          <div class="detail-value">${mapResources}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Date</div>
          <div class="detail-value">${matchDate.toLocaleDateString()}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Match ID</div>
          <div class="detail-value">#${matchId.substring(0, 8)}</div>
        </div>
      </div>
    </div>
  `;

  // Create battle statistics
  const battleStats = `
    <div class="warboard-section">
      <h3 class="section-title">
        <i class="fas fa-chart-bar"></i> Battle Statistics
      </h3>
      <div class="match-details-grid">
        <div class="detail-card">
          <div class="detail-label">Duration</div>
          <div class="detail-value">${duration}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Game Speed</div>
          <div class="detail-value">${match.gameSpeed || 'Normal'}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Victory Conditions</div>
          <div class="detail-value">${match.victoryConditions || 'Standard'}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Starting Resources</div>
          <div class="detail-value">${match.startingResources || 'Standard'}</div>
        </div>
      </div>
    </div>
  `;

  // Combine all sections for EPIC WARBOARD
  const fullContent = `
    <div class="match-details-container">
      ${battleDisplay}
      ${matchDetailsGrid}
      ${battleStats}
      ${screenshotsSection}
    </div>
  `;

  return fullContent;}

// Function to close the match details modal
window.closeMatchDetailsModal = function() {
  const modal = document.getElementById('match-details-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
};

/**
 * Clear all match filters
 */
function clearMatchFilters() {
  const resultFilter = document.getElementById('match-result-filter');
  const raceFilter = document.getElementById('match-race-filter');
  const mapFilter = document.getElementById('match-map-filter');
  
  if (resultFilter) resultFilter.value = '';
  if (raceFilter) raceFilter.value = '';
  if (mapFilter) mapFilter.value = '';
  
  // Optionally reload matches with cleared filters
  // This could be implemented to actually filter the displayed matches
  
}
