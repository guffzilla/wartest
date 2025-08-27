/**
 * Barracks Manager Module
 * Handles game type filtering and player display in the Barracks section
 */

export class BarracksManager {
  constructor() {
    this.currentFilter = 'all';
    this.players = [];
    this.filteredPlayers = [];
    this.initialized = false;
  }

  /**
   * Initialize the Barracks manager
   */
  async init() {
    console.log('🏰 Initializing Barracks Manager...');
    
    try {
      this.setupGameTypeFilters();
      this.initialized = true;
      console.log('✅ Barracks Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Barracks Manager:', error);
      throw error;
    }
  }

  /**
   * Setup game type filter tabs
   */
  setupGameTypeFilters() {
    const gameTypeTabs = document.querySelectorAll('.game-type-tab');
    
    gameTypeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const gameType = tab.dataset.gameType;
        this.filterByGameType(gameType);
      });
    });

    console.log('🎮 Game type filters setup complete');
  }

  /**
   * Filter players by game type
   * @param {string} gameType - The game type to filter by ('all', 'war1', 'war2', 'war3')
   */
  filterByGameType(gameType) {
    // Update active tab
    document.querySelectorAll('.game-type-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.gameType === gameType) {
        tab.classList.add('active');
      }
    });

    this.currentFilter = gameType;
    this.updatePlayerDisplay();
    this.updateFilterCounts();
  }

  /**
   * Set filter (alias for filterByGameType for compatibility)
   * @param {string} gameType - The game type to filter by ('all', 'war1', 'war2', 'war3')
   */
  setFilter(gameType) {
    console.log(`🎯 setFilter called with gameType: ${gameType}`);
    console.log(`🎯 Previous filter: ${this.currentFilter}`);
    console.log(`🎯 Total players before filter: ${this.players.length}`);
    
    this.currentFilter = gameType;
    
    console.log(`🎯 New filter set to: ${this.currentFilter}`);
    this.updatePlayerDisplay();
    this.updateFilterCounts();
    
    console.log(`🎯 Filter update complete`);
  }

  /**
   * Update player display based on current filter
   */
  updatePlayerDisplay() {
    // Try to find container in modal first, then fallback to global
    let container = document.querySelector('.modal.show #player-names-container');
    if (!container) {
      container = document.getElementById('player-names-container');
    }
    
    if (!container) {
      console.error('❌ No player-names-container found');
      return;}

    console.log(`🔄 updatePlayerDisplay called with filter: ${this.currentFilter}`);
    console.log(`📊 Total players: ${this.players.length}`);

    // Filter players based on current filter
    if (this.currentFilter === 'all') {
      this.filteredPlayers = [...this.players];
    } else {
      // Handle both old and new naming conventions
      this.filteredPlayers = this.players.filter(player => {
        console.log(`🔍 Checking player ${player.name} with gameType: ${player.gameType} against filter: ${this.currentFilter}`);
        
        if (this.currentFilter === 'wc1') {
          const matches = player.gameType === 'wc1';
          console.log(`  WC1 check: ${matches} (gameType: ${player.gameType})`);
          return matches;} else if (this.currentFilter === 'wc2') {
          const matches = player.gameType === 'wc2';
          console.log(`  WC2 check: ${matches} (gameType: ${player.gameType})`);
          return matches;} else if (this.currentFilter === 'wc3') {
          const matches = player.gameType === 'wc3';
          console.log(`  WC3 check: ${matches} (gameType: ${player.gameType})`);
          return matches;}
        return false;});
    }

    console.log(`📊 Filtered players: ${this.filteredPlayers.length}`, this.filteredPlayers.map(p => p.name));

    // Clear container
    container.innerHTML = '';

    // Show welcome message if no players at all
    if (this.players.length === 0) {
      const gameTypeNames = {
        'wc1': 'WC1',
        'wc2': 'WC2',
        'wc3': 'WC3'
      };
      
      container.innerHTML = `
        <div class="no-players-welcome">
          <div class="welcome-icon">
            <i class="fas fa-fort-awesome"></i>
          </div>
          <h3>Welcome to Your Barracks!</h3>
          <p>Your barracks is currently empty. Get started by linking your player names to track your competitive journey across all Warcraft games.</p>
          <div class="welcome-benefits">
            <div class="benefit-item">
              <i class="fas fa-chart-line"></i>
              <span>Track your MMR and rank progression</span>
            </div>
            <div class="benefit-item">
              <i class="fas fa-trophy"></i>
              <span>View detailed match statistics</span>
            </div>
            <div class="benefit-item">
              <i class="fas fa-users"></i>
              <span>Compare performance across game types</span>
            </div>
          </div>
          <div class="welcome-actions">
            <button class="epic-btn primary" onclick="window.addPlayer()">
              <i class="fas fa-plus"></i>
              <span>Add Your First Player</span>
            </button>
          </div>
        </div>
      `;
      return;}

    // Show filtered players
    if (this.filteredPlayers.length === 0) {
      const gameTypeNames = {
        'wc1': 'WC1',
        'wc2': 'WC2',
        'wc3': 'WC3'
      };
      
      const gameTypeName = gameTypeNames[this.currentFilter] || 'this game type';
      
      container.innerHTML = `
        <div class="no-players-message">
          <i class="fas fa-user-plus"></i>
          <p>No players found for ${gameTypeName}</p>
          <p>Use the "Add/Link Player" button below to get started!</p>
        </div>
      `;
      return;}

    // Create player cards
    this.filteredPlayers.forEach(player => {
      const playerCard = this.createPlayerCard(player);
      container.appendChild(playerCard);
    });

    console.log(`📊 Displaying ${this.filteredPlayers.length} players (filtered from ${this.players.length})`);
  }

  /**
   * Create a player card element
   * @param {Object} player - Player data
   * @returns {HTMLElement} Player card element
   */
  createPlayerCard(player) {
    const playerCard = document.createElement('div');playerCard.className = 'player-card';
    
    // Game type display names
    const gameTypeNames = {
      'wc1': 'WC1',
      'wc2': 'WC2',
      'wc3': 'WC3'
    };
    
    const gameTypeName = gameTypeNames[player.gameType] || player.gameType;
    const isWC1 = player.gameType === 'wc1';
    
    playerCard.innerHTML = `
      <div class="player-header">
        <div class="player-name">${player.name}</div>
        <div class="player-game-type">${gameTypeName}${isWC1 ? ' vs AI' : ''}</div>
      </div>
      <div class="player-stats">
        <div class="stat-item">
          <span class="stat-label">MMR</span>
          <span class="stat-value">${player.mmr || 1200}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Wins</span>
          <span class="stat-value">${player.stats?.wins || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Losses</span>
          <span class="stat-value">${player.stats?.losses || 0}</span>
        </div>
      </div>
      <div class="player-actions">
        <button class="epic-btn secondary" onclick="window.barracksManager.showPlayerStats('${player.name}')">
          <i class="fas fa-chart-line"></i>
          <span>Stats</span>
        </button>
        <button class="epic-btn danger" onclick="window.barracksManager.unlinkPlayer('${player._id}', '${player.name}')" title="Unlink this player from your account" style="background: linear-gradient(135deg, #dc2626, #b91c1c); border-color: #dc2626; color: white;">
          <i class="fas fa-unlink"></i>
          <span>Unlink</span>
        </button>
      </div>
    `;
    
    // Add event listener for player name click
    const playerNameElement = playerCard.querySelector('.player-name');
    playerNameElement.addEventListener('click', () => {
      this.handlePlayerClick(player.name);
    });
    
    return playerCard;}

  /**
   * Handle player name click with fallbacks
   * @param {string} playerName - Player name
   */
  async handlePlayerClick(playerName) {
    console.log(`🎯 Player name clicked: ${playerName}`);
    
    // Find the player data first
    const player = this.players.find(p => p.name === playerName);
    if (!player) {
      console.error('❌ Player not found in barracks data:', playerName);
      return;}
    
    console.log('🎯 Found player data:', player);
    
    // Try to open player modal with available functions
    try {
      if (window.showPlayerDetails) {
        console.log('🎯 Using window.showPlayerDetails...');
        await window.showPlayerDetails(playerName);
      } else if (window.openPlayerDetailsModal) {
        console.log('🎯 Using window.openPlayerDetailsModal...');
        await window.openPlayerDetailsModal(playerName);
      } else {
        console.warn('⚠️ No player modal functions available, redirecting to ladder...');
        // Fallback: redirect to ladder page with player search
        window.location.href = `/views/arena.html?search=${encodeURIComponent(playerName)}`;
      }
    } catch (error) {
      console.error('❌ Error opening player modal:', error);
      // Fallback: redirect to ladder page with player search
      window.location.href = `/views/arena.html?search=${encodeURIComponent(playerName)}`;
    }
  }

  /**
   * Show player statistics modal (same as leaderboard)
   * @param {string} playerName - Player name
   */
  async showPlayerStats(playerName) {
    try {
      console.log(`🎯 BarracksManager.showPlayerStats called with: "${playerName}"`);
      
      // Find player data
      const player = this.players.find(p => p.name === playerName);
      if (!player) {
        console.error('❌ Player not found:', playerName);
        console.log('🔍 Available players:', this.players.map(p => p.name));
        return;}

      console.log('✅ Player found:', player);

      // Use the same modal function as the leaderboard for consistency
      if (window.openPlayerDetailsModal) {
        console.log('🎯 Calling openPlayerDetailsModal (same as leaderboard)...');
        await window.openPlayerDetailsModal(playerName);
      } else if (window.showPlayerDetails) {
        console.log('🎯 Calling showPlayerDetails...');
        await window.showPlayerDetails(playerName);
      } else {
        // Fallback: Direct API call to match leaderboard behavior
        console.log('🎯 Using fallback modal (matching leaderboard)...');
        if (window.modalManager) {
          window.showLoadingModal('Loading player details...');
          try {
            const response = await fetch(`/api/matches/player/${encodeURIComponent(playerName)}`);
            if (response.ok) {
              const data = await response.json();
              // Use the same modal content as playerDetails.js
              const modalContent = window.createPlayerModalContent ? 
                window.createPlayerModalContent(data.player || data) :
                `<div>Player stats for ${playerName} loaded successfully</div>`;
              
              window.modalManager.createModal({
                id: 'player-stats-modal',
                title: `${playerName} - Player Statistics`,
                content: modalContent,
                size: 'xl'
              });
              window.modalManager.show('player-stats-modal');
            } else {
              throw new Error('Failed to load player data');
            }
          } catch (error) {
            console.error('Error loading player data:', error);
            if (window.showErrorToast) {
              window.showErrorToast(`Failed to load player details: ${error.message}`);
            }
          } finally {
            window.hideLoadingModal();
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in showPlayerStats:', error);
    }
  }

  /**
   * Show confirmation dialog for unlinking a player
   * @param {string} playerName - Player name
   * @returns {Promise<boolean>} - True if confirmed, false otherwise
   */
  async showUnlinkConfirmation(playerName) {
    return new Promise((resolve) => {
      if (!window.modalManager) {
        // Fallback to standard confirm if modal manager not available
        resolve(confirm(`Are you sure you want to unlink "${playerName}" from your account?\n\nThis player will no longer be associated with your profile, but their stats will remain on the leaderboard.`));return;}

      // Create confirmation modal
      const modalContent = `
        <div style="text-align: center; padding: 1rem;">
          <div style="margin-bottom: 1.5rem;">
            <i class="fas fa-unlink" style="font-size: 3rem; color: #f39c12; margin-bottom: 1rem;"></i>
            <h3 style="color: #f39c12; margin-bottom: 1rem;">Unlink Player</h3>
            <p style="margin-bottom: 1rem;">
              Are you sure you want to unlink <strong>"${playerName}"</strong> from your account?
            </p>
            <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">
              This player will no longer be associated with your profile, but their stats will remain on the leaderboard.
            </p>
          </div>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button class="epic-btn danger" onclick="window.confirmUnlink(true)">
              <i class="fas fa-unlink"></i>
              <span>Yes, Unlink</span>
            </button>
            <button class="epic-btn secondary" onclick="window.confirmUnlink(false)">
              <i class="fas fa-times"></i>
              <span>Cancel</span>
            </button>
          </div>
        </div>
      `;

      // Temporary global function for confirmation
      window.confirmUnlink = (confirmed) => {
        delete window.confirmUnlink; // Clean up
        window.modalManager.hide('unlink-confirmation-modal');
        resolve(confirmed);
      };

      window.modalManager.createModal({
        id: 'unlink-confirmation-modal',
        title: 'Confirm Player Unlink',
        content: modalContent,
        size: 'md',
        showCloseButton: true,
        onClose: () => {
          delete window.confirmUnlink; // Clean up if closed
          resolve(false);
        }
      });

      window.modalManager.show('unlink-confirmation-modal');
    });
  }

  /**
   * Unlink a player from the current user account
   * @param {string} playerId - Player ID
   * @param {string} playerName - Player name for confirmation
   */
  async unlinkPlayer(playerId, playerName) {
    console.log(`🔓 Attempting to unlink player: ${playerName} (ID: ${playerId})`);
    
    // Show confirmation dialog
    const confirmed = await this.showUnlinkConfirmation(playerName);
    
    if (!confirmed) {
      console.log('❌ Player unlink cancelled by user');
      return;}
    
    try {
      console.log('🔄 Sending unlink request...');
      
      const response = await fetch('/api/ladder/unlink-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          playerId: playerId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Player unlinked successfully:', result);
        
        // Show success notification
        if (window.showSuccessToast) {
          window.showSuccessToast(`Player "${playerName}" unlinked successfully!`);
        } else {
          alert(`Player "${playerName}" unlinked successfully!`);
        }
        
        // Refresh player data
        if (window.refreshPlayerData) {
          console.log('🔄 Refreshing player data after unlink...');
          const refreshedPlayers = await window.refreshPlayerData();
          this.updatePlayers(refreshedPlayers);
        } else {
          // Fallback: remove from local array and update display
          this.players = this.players.filter(p => p._id !== playerId);
          this.updatePlayerDisplay();
          this.updateFilterCounts();
        }
        
      } else {
        let errorMessage = 'Failed to unlink player';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error unlinking player:', error);
      
      // Show error notification
      if (window.showErrorToast) {
        window.showErrorToast(`Failed to unlink player: ${error.message}`);
      } else {
        alert(`Failed to unlink player: ${error.message}`);
      }
    }
  }

  /**
   * Update players data
   * @param {Array} players - Array of player objects
   */
  updatePlayers(players) {
    console.log(`🔄 Updating players data: ${players.length} players`);
    console.log('📊 Player data details:', players.map(p => ({ name: p.name, gameType: p.gameType })));
    
    this.players = players || [];
    
    // Check for WC1 username synchronization needs
    this.checkWC1UsernamSync();
    
    this.updatePlayerDisplay();
    this.updateFilterCounts();
  }

  /**
   * Check if WC1 players need username synchronization
   */
  async checkWC1UsernamSync() {
    // Check if user has WC1 players
    const wc1Players = this.players.filter(p => p.gameType === 'wc1');
    
    if (wc1Players.length === 0) {
      console.log('📊 No WC1 players found, showing sync option');
      return false;}
    
    console.log('📊 Found WC1 players:', wc1Players.map(p => p.name));
    return true;}

  /**
   * Sync WC1 player name with current username
   */
  async syncWC1Username() {
    try {
      console.log('🔄 Syncing WC1 username...');
      const response = await fetch('/api/ladder/wc1/sync-username', {
        method: 'PUT',
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ WC1 username synced:', data);
        
        // Reload players data to reflect changes
        if (window.profileUIManager && window.profileUIManager.loadPlayerNames) {
          window.profileUIManager.loadPlayerNames();
        }
      } else {
        const error = await response.json();
        console.error('❌ Failed to sync WC1 username:', error);
      }
    } catch (error) {
      console.error('❌ Error syncing WC1 username:', error);
    }
  }

  /**
   * Update filter tab counts
   */
  updateFilterCounts() {
    const counts = {
      all: this.players.length,
      wc1: this.players.filter(p => p.gameType === 'wc1').length,
      wc2: this.players.filter(p => p.gameType === 'wc2').length,
      wc3: this.players.filter(p => p.gameType === 'wc3').length
    };

    console.log('📊 Filter counts updated:', counts);

    // Update filter button counts - look for both modal and global containers
    const containers = [
      document.querySelector('.modal.show .game-type-tabs'),
      document.querySelector('.game-type-tabs')
    ].filter(Boolean);

    containers.forEach(container => {
      Object.keys(counts).forEach(filter => {
        const button = container.querySelector(`[data-game-type="${filter}"]`);
        if (button) {
          const countElement = button.querySelector('.player-count');
          if (countElement) {
            countElement.textContent = `(${counts[filter]})`;
          }
        }
      });
    });
  }

  /**
   * Get current filter status
   */
  getFilterStatus() {
    return {
      currentFilter: this.currentFilter,
      totalPlayers: this.players.length,
      filteredPlayers: this.filteredPlayers.length,
      initialized: this.initialized
    };}

  /**
   * Reset filters to show all players
   */
  resetFilters() {
    this.filterByGameType('all');
  }
} 