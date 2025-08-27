/**
 * LadderCore.js - Core Ladder System Coordination
 * 
 * Handles:
 * - Main initialization 
 * - Game type switching
 * - Module coordination
 * - Global state management
 */

export class LadderCore {
  constructor() {
    this.currentGameType = 'warcraft2';
    this.modules = {};
    this.initialized = false;
  }

  /**
   * Initialize the entire ladder system
   */
  async init() {
    if (this.initialized) return;console.log('🎮 Initializing Ladder System...');
    
    try {
      // Initialize core components
      await this.initializeGameTabs();
      await this.loadInitialData();
      
      // Register event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('✅ Ladder System initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Ladder System:', error);
      this.showNotification('Failed to initialize ladder system', 'error');
    }
  }

  /**
   * Initialize game type tabs and switching
   */
  async initializeGameTabs() {
    const gameTabs = document.querySelectorAll('.game-tab');
    
    gameTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const gameType = tab.dataset.game;
        this.switchGameType(gameType);
      });
    });
    
    // Set initial active tab
    const activeTab = document.querySelector('.game-tab.active');
    if (activeTab) {
      this.currentGameType = activeTab.dataset.game || 'warcraft2';
    }
  }

  /**
   * Switch between game types (WC1, WC2, WC3)
   */
  async switchGameType(gameType) {
    if (gameType === this.currentGameType) return;console.log(`🔄 Switching to ${gameType}`);
    
    // Update active tab
    document.querySelectorAll('.game-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.game === gameType);
    });
    
    this.currentGameType = gameType;
    
    // Notify modules of game type change
    this.notifyModules('gameTypeChanged', { gameType });
    
    // Reload data for new game type
    await this.loadInitialData();
  }

  /**
   * Load initial data for current game type
   */
  async loadInitialData() {
    console.log(`📊 Loading data for ${this.currentGameType}`);
    
    const promises = [
      this.loadRanks(),
      this.loadLeaderboard(),
      this.loadRecentMatches()
    ];
    
    try {
      await Promise.all(promises);
      console.log('✅ Initial data loaded');
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      this.showNotification('Failed to load ladder data', 'error');
    }
  }

  /**
   * Load rank information
   */
  async loadRanks() {
    try {
      const response = await fetch(`/api/ladder/ranks?game=${this.currentGameType}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const ranks = await response.json();
      this.displayRanks(ranks);
      
    } catch (error) {
      console.error('Failed to load ranks:', error);
    }
  }

  /**
   * Load leaderboard data
   */
  async loadLeaderboard(page = 1, search = '') {
    try {
      const params = new URLSearchParams({
        game: this.currentGameType,
        page: page.toString(),
        search
      });
      
      const response = await fetch(`/api/matches?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      this.displayLeaderboard(data);
      
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  }

  /**
   * Load recent matches
   */
  async loadRecentMatches(page = 1) {
    try {
      const params = new URLSearchParams({
        game: this.currentGameType,
        page: page.toString()
      });
      
      const response = await fetch(`/api/matches/recent?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      this.displayRecentMatches(data);
      
    } catch (error) {
      console.error('Failed to load recent matches:', error);
    }
  }

  /**
   * Display ranks in sidebar
   */
  displayRanks(ranks) {
    const container = document.getElementById('ranks-container');
    if (!container) return;container.innerHTML = ranks.map(rank => `
      <div class="rank-item">
        <img src="/assets/img/ranks/${rank.image}" alt="${rank.name}" loading="lazy">
        <div class="rank-info">
          <div class="rank-name">${rank.name}</div>
          <div class="rank-mmr">${rank.minMmr}+ MMR</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Display leaderboard table
   */
  displayLeaderboard(data) {
    const tbody = document.querySelector('#leaderboard-table tbody');
    if (!tbody) return;if (!data.players?.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data">No players found</td></tr>';
      return;}
    
    tbody.innerHTML = data.players.map((player, index) => `
      <tr onclick="window.showPlayerDetails?.('${player._id}')">
        <td>#${data.startRank + index}</td>
        <td>
          <div class="player-info">
            <img src="/assets/img/ranks/${player.currentRank?.image || 'emblem.png'}" 
                 alt="${player.currentRank?.name || 'Unranked'}" class="rank-icon">
            <span class="player-name">${player.name}</span>
          </div>
        </td>
        <td><span class="rank-name">${player.currentRank?.name || 'Unranked'}</span></td>
        <td><span class="mmr-value">${player.mmr || 0}</span></td>
        <td><span class="games-count">${player.gamesPlayed || 0}</span></td>
        <td><span class="winrate">${player.winRate || 0}%</span></td>
      </tr>
    `).join('');
  }

  /**
   * Display recent matches
   */
  displayRecentMatches(data) {
    const container = document.getElementById('recent-matches-container');
    if (!container) return;if (!data.matches?.length) {
      container.innerHTML = '<div class="no-data">No recent matches found</div>';
      return;}
    
    container.innerHTML = data.matches.map(match => `
      <div class="match-card">
        <div class="match-header">
          <span class="match-type">${match.matchType}</span>
          <span class="match-date">${this.formatDate(match.createdAt)}</span>
        </div>
        <div class="match-players">
          ${match.players.map(p => `<span class="player">${p.name}</span>`).join(' vs ')}
        </div>
        <div class="match-map">${match.map || 'Unknown Map'}</div>
      </div>
    `).join('');
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('player-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.loadLeaderboard(1, e.target.value);
        }, 300);
      });
    }
    
    // Pagination
    document.addEventListener('click', (e) => {
      if (e.target.matches('.pagination-btn[data-page]')) {
        e.preventDefault();
        const page = parseInt(e.target.dataset.page);
        this.loadLeaderboard(page);
      }
    });
  }

  /**
   * Register a module
   */
  registerModule(name, module) {
    this.modules[name] = module;
    console.log(`📦 Module registered: ${name}`);
  }

  /**
   * Notify all modules of an event
   */
  notifyModules(event, data) {
    Object.values(this.modules).forEach(module => {
      if (typeof module.handleEvent === 'function') {
        module.handleEvent(event, data);
      }
    });
  }

  /**
   * Get current game type
   */
  getCurrentGameType() {
    return this.currentGameType;}

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Utility: Format date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});}
}

// Create global instance
export const ladderCore = new LadderCore(); 