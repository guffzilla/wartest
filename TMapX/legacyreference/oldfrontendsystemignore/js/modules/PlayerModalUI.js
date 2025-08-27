/**
 * PlayerModalUI.js - Main Modal Structure and UI Components
 * 
 * Extracted from the 72KB playerDetails.js monster.
 * Handles the main player details modal creation, tab system, and UI management.
 * 
 * Responsibilities:
 * - Main modal structure and layout
 * - Tab system and navigation
 * - UI component rendering and updates
 * - Integration with other player modal modules
 * - Modal lifecycle management
 */

import { playerModalCore } from './PlayerModalCore.js';
import { playerStatsCharts } from './PlayerStatsCharts.js';
import { playerMatchHistory } from './PlayerMatchHistory.js';

export class PlayerModalUI {
  constructor() {
    this.currentPlayer = null;
    this.activeTab = 'overview';
    this.tabData = new Map();
    this.modalElement = null;
  }

  /**
   * Initialize the player modal UI system
   */
  init() {
    console.log('🎨 Initializing Player Modal UI...');
    this.setupGlobalFunctions();
    this.setupModalStyles();
    console.log('✅ Player Modal UI initialized');
  }

  /**
   * Setup global functions for backward compatibility
   */
  setupGlobalFunctions() {
    window.playerModalUI = this;
    window.showPlayerDetailsModal = (playerId) => this.showPlayerDetailsModal(playerId);
    window.switchPlayerTab = (tabName) => this.switchTab(tabName);
    
    console.log('📋 Global player modal UI functions registered');
  }

  /**
   * Show player details modal for a specific player
   */
  async showPlayerDetailsModal(playerId) {
    if (!playerId) {
      console.error('❌ No player ID provided');
      return;}

    try {
      console.log(`🎭 Opening player details modal for ${playerId}`);
      
      // Show loading modal
      playerModalCore.showLoadingModal('Loading player details...');
      
      // Load player data
      const playerData = await this.loadPlayerData(playerId);
      if (!playerData) {
        throw new Error('Failed to load player data');
      }

      this.currentPlayer = playerData;
      
      // Create and show modal
      this.createPlayerModal(playerData);
      
      // Hide loading modal
      playerModalCore.hideLoadingModal();
      
      // Initialize charts and other components
      this.initializeModalComponents(playerData);
      
      console.log('✅ Player details modal opened successfully');

    } catch (error) {
      console.error('❌ Failed to show player details modal:', error);
      playerModalCore.hideLoadingModal();
      playerModalCore.showErrorModal(`Failed to load player details: ${error.message}`);
    }
  }

  /**
   * Load player data from API
   */
  async loadPlayerData(playerId) {
    try {
      // Use the correct API endpoint that exists
      const response = await fetch(`/api/matches/player/${encodeURIComponent(playerId)}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // The existing API returns { player: {...}, stats: {...} }
      if (result.player) {
        return {
          ...result.player,
          stats: result.stats || {}
        };} else {
        throw new Error('No player data found');
      }

    } catch (error) {
      console.error('❌ Failed to load player data:', error);
      throw error;
    }
  }

  /**
   * Create the main player modal structure with professional design
   */
  createPlayerModal(playerData) {
    // Remove any existing modal
    const existingModal = document.getElementById('player-details-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'player-details-modal';
    modal.className = 'modal-overlay player-details-modal';

    modal.innerHTML = `
      <div class="modal-backdrop" onclick="playerModalUI.closeModal()"></div>
      <div class="modal-container">
        <div class="modal-content player-modal-content">
          ${this.generateModalHeader(playerData)}
          ${this.generateTabNavigation()}
          <div class="modal-body">
            ${this.generateTabContent(playerData)}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalElement = modal;

    // Setup event listeners
    this.setupModalEventListeners(modal);

    // Trigger show animation
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });

    console.log('🏗️ Professional player modal structure created');
  }

  /**
   * Generate professional modal header with enhanced player info
   */
  generateModalHeader(playerData) {
    // Handle the data structure from the API - fix the data extraction
    const player = playerData.player || playerData;
    const stats = playerData.stats || playerData;
    
    // Extract stats with better fallback handling
    const wins = stats.wins || player.wins || 0;
    const losses = stats.losses || player.losses || 0;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    
    // Debug logging to help identify data structure issues
    console.log('🔍 Player data structure:', {
      playerData,
      player,
      stats,
      wins,
      losses,
      totalGames,
      winRate
    });

    return `
      <div class="player-modal-header">
        <div class="header-background"></div>
        <div class="header-content">
          <div class="player-avatar-section">
            <div class="avatar-container">
              <img src="/assets/img/ranks/${this.getRankImage(player.currentRank || player.rank || stats.rank)}"
                   alt="${player.currentRank?.name || player.rank?.name || stats.rank || 'Unranked'}"
                   class="player-rank-avatar"
                   onerror="this.src='/assets/img/ranks/emblem.png'">
              <div class="avatar-glow"></div>
              <div class="status-indicator ${player.isOnline ? 'online' : 'offline'}"
                   title="${player.isOnline ? 'Online' : 'Offline'}"></div>
            </div>
          </div>

          <div class="player-info-section">
            <div class="player-title-area">
              <h1 class="player-name">${player.name || player.username || 'Unknown Player'}</h1>
              <div class="player-subtitle">
                <span class="rank-badge ${this.getRankClass(player.currentRank || player.rank || stats.rank)}">
                  <i class="fas fa-crown"></i>
                  ${player.currentRank?.name || player.rank?.name || stats.rank || 'Unranked'}
                </span>
                <span class="mmr-display">
                  <i class="fas fa-chart-line"></i>
                  ${player.mmr || player.rating || stats.rating || 0} MMR
                </span>
              </div>
            </div>

            <div class="stats-overview">
              <div class="stat-card wins">
                <div class="stat-icon">
                  <i class="fas fa-trophy"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">${wins}</div>
                  <div class="stat-label">Wins</div>
                </div>
              </div>

              <div class="stat-card losses">
                <div class="stat-icon">
                  <i class="fas fa-skull"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">${losses}</div>
                  <div class="stat-label">Losses</div>
                </div>
              </div>

              <div class="stat-card winrate">
                <div class="stat-icon">
                  <i class="fas fa-percentage"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">${winRate}%</div>
                  <div class="stat-label">Win Rate</div>
                </div>
              </div>

              <div class="stat-card games">
                <div class="stat-icon">
                  <i class="fas fa-gamepad"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">${totalGames}</div>
                  <div class="stat-label">Games</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button class="modal-close-btn" onclick="playerModalUI.closeModal()" aria-label="Close modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;}

  /**
   * Generate professional tab navigation
   */
  generateTabNavigation() {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: 'fas fa-user-circle', description: 'Player summary and quick stats' },
      { id: 'matches', label: 'Matches', icon: 'fas fa-swords', description: 'Match history and results' },
      { id: 'performance', label: 'Performance', icon: 'fas fa-chart-line', description: 'Statistics and analytics' }
    ];

    return `
      <div class="player-modal-tabs">
        <div class="tabs-container">
          ${tabs.map(tab => `
            <button class="tab-button ${tab.id === this.activeTab ? 'active' : ''}"
                    data-tab="${tab.id}"
                    onclick="switchPlayerTab('${tab.id}')"
                    title="${tab.description}">
              <div class="tab-icon">
                <i class="${tab.icon}"></i>
              </div>
              <div class="tab-content">
                <span class="tab-label">${tab.label}</span>
                <span class="tab-description">${tab.description}</span>
              </div>
              <div class="tab-indicator"></div>
            </button>
          `).join('')}
        </div>
      </div>
    `;}

  /**
   * Generate professional tab content area
   */
  generateTabContent(playerData) {
    return `
      <div class="tab-content-container">
        ${this.generateOverviewTab(playerData)}
        ${this.generateMatchesTab(playerData)}
        ${this.generatePerformanceTab(playerData)}
      </div>
    `;}

  /**
   * Generate professional overview tab content
   */
  generateOverviewTab(playerData) {
    // Handle the data structure from the API
    const player = playerData.player || playerData;
    const stats = playerData.stats || {};
    const recentMatches = playerData.recentMatches || [];
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const totalGames = wins + losses;

    return `
      <div class="tab-content overview-content ${this.activeTab === 'overview' ? 'active' : ''}">
        <div class="overview-layout">

          <!-- Player Profile Card -->
          <div class="profile-card">
            <div class="profile-header">
              <h3><i class="fas fa-user-shield"></i> Player Profile</h3>
            </div>
            <div class="profile-content">
              <div class="profile-stats">
                <div class="profile-stat">
                  <div class="stat-icon">
                    <i class="fas fa-calendar-alt"></i>
                  </div>
                  <div class="stat-info">
                    <span class="stat-label">Member Since</span>
                    <span class="stat-value">${new Date(player.joinDate || player.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div class="profile-stat">
                  <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                  </div>
                  <div class="stat-info">
                    <span class="stat-label">Last Active</span>
                    <span class="stat-value">${this.formatLastSeen(player.lastSeen)}</span>
                  </div>
                </div>

                <div class="profile-stat">
                  <div class="stat-icon">
                    <i class="fas fa-shield-alt"></i>
                  </div>
                  <div class="stat-info">
                    <span class="stat-label">Preferred Race</span>
                    <span class="stat-value race-${stats.preferredRace || 'random'}">
                      ${this.capitalizeRace(stats.preferredRace)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="activity-card">
            <div class="activity-header">
              <h3><i class="fas fa-activity"></i> Recent Activity</h3>
            </div>
            <div class="activity-content">
              <div class="recent-matches">
                <div class="matches-streak">
                  <span class="streak-label">Last 10 Games:</span>
                  <div class="match-indicators">
                    ${this.generateRecentResults(recentMatches)}
                  </div>
                </div>

                <div class="activity-stats">
                  <div class="activity-stat">
                    <span class="activity-label">This Month</span>
                    <span class="activity-value">${stats.monthlyWins || 0}W - ${stats.monthlyLosses || 0}L</span>
                  </div>

                  <div class="activity-stat">
                    <span class="activity-label">Rating Trend</span>
                    <span class="activity-value rating-change ${(stats.ratingChange || 0) >= 0 ? 'positive' : 'negative'}">
                      ${(stats.ratingChange || 0) >= 0 ? '+' : ''}${stats.ratingChange || 0} MMR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Stats Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3><i class="fas fa-chart-pie"></i> Race Distribution</h3>
            </div>
            <div class="chart-content">
              <div class="mini-chart-container">
                <canvas id="overviewRaceChart" width="200" height="200"></canvas>
              </div>
            </div>
          </div>

          <!-- Player Actions -->
          <div class="actions-card">
            <div class="actions-header">
              <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
            </div>
            <div class="actions-content">
              <div class="action-grid">
                <button class="action-btn primary" onclick="challengePlayer('${player.id || player.name}')">
                  <i class="fas fa-swords"></i>
                  <span>Challenge</span>
                </button>
                <button class="action-btn secondary" onclick="messagePlayer('${player.id || player.name}')">
                  <i class="fas fa-envelope"></i>
                  <span>Message</span>
                </button>
                <button class="action-btn tertiary" onclick="viewFullProfile('${player.id || player.name}')">
                  <i class="fas fa-user-circle"></i>
                  <span>Full Profile</span>
                </button>
                <button class="action-btn quaternary" onclick="addFriend('${player.id || player.name}')">
                  <i class="fas fa-user-plus"></i>
                  <span>Add Friend</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;}

  /**
   * Generate professional matches tab content
   */
  generateMatchesTab(playerData) {
    return `
      <div class="tab-content matches-content ${this.activeTab === 'matches' ? 'active' : ''}">
        <div class="matches-section">
          <div class="matches-header">
            <div class="header-title">
              <h3><i class="fas fa-swords"></i> Match History</h3>
              <span class="matches-count" id="matches-count">Loading...</span>
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

              <button class="filter-clear-btn" onclick="playerModalUI.clearMatchFilters()">
                <i class="fas fa-times"></i>
                Clear
              </button>
            </div>
          </div>

          <div class="matches-container">
            <div id="match-history-container" class="match-history-list">
              <div class="loading-matches">
                <div class="loading-spinner">
                  <i class="fas fa-spinner fa-spin"></i>
                </div>
                <span>Loading match history...</span>
              </div>
            </div>

            <div class="matches-pagination" id="matches-pagination" style="display: none;">
              <div class="pagination-info">
                <span class="matches-range" id="matches-range"></span>
                <span class="total-matches" id="total-matches"></span>
              </div>
              <div class="pagination-controls">
                <button class="pagination-btn" id="prev-matches-btn" onclick="playerModalUI.loadPreviousMatches()">
                  <i class="fas fa-chevron-left"></i>
                  Previous
                </button>
                <span class="page-info" id="matches-page-info"></span>
                <button class="pagination-btn" id="next-matches-btn" onclick="playerModalUI.loadNextMatches()">
                  Next
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate professional performance tab content
   */
  generatePerformanceTab(playerData) {
    return `
      <div class="tab-content performance-content ${this.activeTab === 'performance' ? 'active' : ''}">
        <div class="performance-section">
          <div class="performance-header">
            <h3><i class="fas fa-chart-line"></i> Performance Analytics</h3>
            <div class="time-range-selector">
              <button class="time-btn active" data-range="all">All Time</button>
              <button class="time-btn" data-range="month">This Month</button>
              <button class="time-btn" data-range="week">This Week</button>
            </div>
          </div>

          <div class="performance-grid">
            <!-- Race Performance Chart -->
            <div class="chart-card large">
              <div class="chart-header">
                <h4><i class="fas fa-shield-alt"></i> Race Performance</h4>
                <div class="chart-legend" id="race-legend"></div>
              </div>
              <div class="chart-container">
                <canvas id="raceDistributionChart" width="400" height="300"></canvas>
              </div>
            </div>

            <!-- Win Rate by Race -->
            <div class="chart-card large">
              <div class="chart-header">
                <h4><i class="fas fa-trophy"></i> Win Rate by Race</h4>
                <div class="chart-legend" id="winrate-legend"></div>
              </div>
              <div class="chart-container">
                <canvas id="raceWinRateChart" width="400" height="300"></canvas>
              </div>
            </div>

            <!-- Map Performance -->
            <div class="chart-card medium">
              <div class="chart-header">
                <h4><i class="fas fa-map"></i> Favorite Maps</h4>
              </div>
              <div class="chart-container">
                <canvas id="mapDistributionChart" width="300" height="250"></canvas>
              </div>
            </div>

            <!-- Resource Preferences -->
            <div class="chart-card medium">
              <div class="chart-header">
                <h4><i class="fas fa-coins"></i> Resource Settings</h4>
              </div>
              <div class="chart-container">
                <canvas id="resourceDistributionChart" width="300" height="250"></canvas>
              </div>
            </div>
          </div>

          <!-- Performance Tables -->
          <div class="performance-tables">
            <div class="table-card">
              <div class="table-header">
                <h4><i class="fas fa-table"></i> Race Statistics</h4>
                <button class="export-btn" onclick="playerModalUI.exportRaceStats()">
                  <i class="fas fa-download"></i>
                  Export
                </button>
              </div>
              <div class="table-container">
                <div class="stats-table" id="race-stats-table">
                  <div class="loading-table">
                    <i class="fas fa-spinner fa-spin"></i>
                    Loading race statistics...
                  </div>
                </div>
              </div>
            </div>

            <div class="table-card">
              <div class="table-header">
                <h4><i class="fas fa-map-marked-alt"></i> Map Performance</h4>
                <button class="export-btn" onclick="playerModalUI.exportMapStats()">
                  <i class="fas fa-download"></i>
                  Export
                </button>
              </div>
              <div class="table-container">
                <div class="stats-table" id="map-stats-table">
                  <div class="loading-table">
                    <i class="fas fa-spinner fa-spin"></i>
                    Loading map statistics...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;}

  /**
   * Generate achievements tab content
   */
  generateAchievementsTab(playerData) {
    const achievements = playerData.achievements || [];
    
    return `
      <div class="tab-content achievements-content ${this.activeTab === 'achievements' ? 'active' : ''}">
        <div class="achievements-header">
          <h3><i class="fas fa-trophy"></i> Achievements</h3>
          <div class="achievement-summary">
            <span class="achievement-count">${achievements.length} Achievements Unlocked</span>
          </div>
        </div>
        
        <div class="achievements-grid">
          ${achievements.length > 0 
            ? achievements.map(achievement => this.generateAchievementCard(achievement)).join('')
            : this.getNoAchievementsHTML()
          }
        </div>
      </div>
    `;}

  /**
   * Generate achievement card
   */
  generateAchievementCard(achievement) {
    return `
      <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">
          <i class="${achievement.icon || 'fas fa-trophy'}"></i>
        </div>
        <div class="achievement-info">
          <h4 class="achievement-title">${achievement.title}</h4>
          <p class="achievement-description">${achievement.description}</p>
          ${achievement.unlocked 
            ? `<span class="achievement-date">Unlocked: ${new Date(achievement.unlockedAt).toLocaleDateString()}</span>`
            : `<span class="achievement-progress">${achievement.progress || 0}% Complete</span>`
          }
        </div>
      </div>
    `;}

  /**
   * Get no achievements HTML
   */
  getNoAchievementsHTML() {
    return `
      <div class="no-achievements">
        <i class="fas fa-trophy"></i>
        <h4>No Achievements Yet</h4>
        <p>This player hasn't unlocked any achievements yet. Keep playing to earn your first achievement!</p>
      </div>
    `;}

  /**
   * Switch to a different tab
   */
  switchTab(tabName) {
    if (this.activeTab === tabName) {
      return;}

    console.log(`🔄 Switching to tab: ${tabName}`);
    this.activeTab = tabName;

    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      if (button.dataset.tab === tabName) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.remove('active');
    });

    const activeContent = document.querySelector(`.${tabName}-content`);
    if (activeContent) {
      activeContent.classList.add('active');
      
      // Load tab-specific data if needed
      this.loadTabData(tabName);
    }

    console.log(`✅ Switched to tab: ${tabName}`);
  }

  /**
   * Load data for specific tab
   */
  async loadTabData(tabName) {
    if (!this.currentPlayer) return;switch (tabName) {
      case 'matches':
        await this.loadMatchHistoryData();
        break;
      case 'statistics':
        this.initializeStatisticsCharts();
        break;
    }
  }

  /**
   * Load match history data for matches tab
   */
  async loadMatchHistoryData() {
    const data = await playerMatchHistory.loadMatchHistory(this.currentPlayer.player.id);
    if (data && data.matches) {
      playerMatchHistory.renderMatchHistory(data.matches);
    }
  }

  /**
   * Initialize statistics charts
   */
  initializeStatisticsCharts() {
    if (this.currentPlayer && this.currentPlayer.stats) {
      playerStatsCharts.initializeAllCharts(this.currentPlayer.stats);
    }
  }

  /**
   * Setup modal event listeners
   */
  setupModalEventListeners(modal) {
    // Close modal when clicking outside
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        this.closeModal();
      }
    });

    // Setup keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

    console.log('✅ Modal event listeners setup');
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    if (!this.modalElement) return;switch (event.key) {
      case 'Escape':
        this.closeModal();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const tabs = ['overview', 'matches', 'statistics', 'achievements'];
          const tabIndex = parseInt(event.key) - 1;
          if (tabs[tabIndex]) {
            this.switchTab(tabs[tabIndex]);
          }
        }
        break;
    }
  }

  /**
   * Initialize modal components after creation
   */
  initializeModalComponents(playerData) {
    // Initialize charts for overview tab
    setTimeout(() => {
      this.createOverviewChart(playerData.stats);
    }, 100);

    // Store player ID for match history loading
    playerMatchHistory.currentPlayerId = playerData.player.id;
  }

  /**
   * Create overview mini chart
   */
  createOverviewChart(stats) {
    if (!stats.races) return;const canvas = document.getElementById('overviewRaceChart');
    if (!canvas) return;playerStatsCharts.createRaceDistributionChart(stats);
  }

  /**
   * Close the modal
   */
  closeModal() {
    playerModalCore.closePlayerDetailsModal();
    this.currentPlayer = null;
    this.modalElement = null;
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyboardShortcuts);
  }

  /**
   * Utility methods
   */
  formatRank(rank) {
    if (!rank) return 'Unranked';return `#${rank}`;}

  calculateWinRate(stats) {
    if (!stats.totalGames || stats.totalGames === 0) return 0;return Math.round((stats.wins / stats.totalGames) * 100);}

  formatLastSeen(lastSeen) {
    if (!lastSeen) return 'Unknown';const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';if (diffDays === 1) return 'Yesterday';if (diffDays < 7) return `${diffDays} days ago`;return date.toLocaleDateString();}

  formatPlaytime(playtime) {
    if (!playtime) return '0 hours';const hours = Math.floor(playtime / 3600);
    if (hours < 1) return '< 1 hour';return `${hours} hours`;}

  capitalizeRace(race) {
    if (!race) return 'Unknown';return race.charAt(0).toUpperCase() + race.slice(1);}

  generateRecentResults(recentMatches) {
    if (!recentMatches || recentMatches.length === 0) {
      return '<span class="no-recent">No recent matches</span>';}

    return recentMatches.slice(0, 10).map(match => {
      const result = match.result || 'unknown';return `<span class="result-dot result-${result}" title="${result}"></span>`;}).join('');
  }

  /**
   * Setup modal styles
   */
  setupModalStyles() {
    if (document.getElementById('player-modal-ui-styles')) return;const styles = document.createElement('style');
    styles.id = 'player-modal-ui-styles';
    styles.textContent = `
      .player-details-modal .modal-content {
        max-width: 1200px;
        width: 95vw;
        max-height: 90vh;
        padding: 0;
        overflow: hidden;
      }

      .player-modal-header {
        background: linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(51, 65, 85, 0.2));
        border-bottom: 2px solid rgba(212, 175, 55, 0.3);
        padding: 20px 30px;
        position: relative;
      }

      .player-header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 30px;
      }

      .player-basic-info {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .player-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid #D4AF37;
      }

      .player-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .player-name {
        font-size: 28px;
        font-weight: 700;
        color: #D4AF37;
        margin: 0 0 10px 0;
      }

      .player-meta {
        display: flex;
        gap: 15px;
        align-items: center;
      }

      .player-rank,
      .player-rating {
        background: rgba(212, 175, 55, 0.2);
        color: #D4AF37;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
      }

      .player-status {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .player-status.online {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .player-status.offline {
        background: rgba(107, 114, 128, 0.2);
        color: #6b7280;
      }

      .player-quick-stats {
        display: flex;
        gap: 25px;
      }

      .quick-stat {
        text-align: center;
      }

      .stat-value {
        display: block;
        font-size: 24px;
        font-weight: 700;
        color: #f1f5f9;
        line-height: 1;
      }

      .stat-label {
        display: block;
        font-size: 12px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 4px;
      }

      .player-modal-tabs {
        display: flex;
        background: rgba(51, 65, 85, 0.3);
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }

      .tab-button {
        flex: 1;
        padding: 15px 20px;
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        border-bottom: 3px solid transparent;
      }

      .tab-button:hover {
        color: #e2e8f0;
        background: rgba(212, 175, 55, 0.1);
      }

      .tab-button.active {
        color: #D4AF37;
        background: rgba(212, 175, 55, 0.1);
        border-bottom-color: #D4AF37;
      }

      .player-modal-body {
        height: 60vh;
        overflow-y: auto;
        padding: 0;
      }

      .tab-content {
        display: none;
        padding: 30px;
        height: 100%;
      }

      .tab-content.active {
        display: block;
      }

      .overview-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        height: 100%;
      }

      .overview-section {
        background: rgba(51, 65, 85, 0.3);
        border-radius: 8px;
        padding: 20px;
        border: 1px solid rgba(148, 163, 184, 0.2);
      }

      .overview-section h3 {
        color: #D4AF37;
        margin: 0 0 20px 0;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .info-grid {
        display: grid;
        gap: 15px;
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      }

      .info-label {
        color: #94a3b8;
        font-size: 14px;
      }

      .info-value {
        color: #f1f5f9;
        font-weight: 500;
      }

      .performance-stats {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .performance-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .perf-label {
        color: #94a3b8;
        font-size: 14px;
      }

      .perf-value {
        color: #f1f5f9;
        font-weight: 500;
      }

      .rating-change.positive {
        color: #10b981;
      }

      .rating-change.negative {
        color: #ef4444;
      }

      .match-results {
        display: flex;
        gap: 4px;
      }

      .result-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
      }

      .result-dot.result-win {
        background: #10b981;
      }

      .result-dot.result-loss {
        background: #ef4444;
      }

      .result-dot.result-draw {
        background: #f97316;
      }

      .mini-chart-container {
        height: 200px;
        position: relative;
      }

      .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .btn {
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
      }

      .btn-primary {
        background: #D4AF37;
        color: #0f172a;
      }

      .btn-primary:hover {
        background: #E8C547;
      }

      .btn-secondary {
        background: #475569;
        color: #f1f5f9;
      }

      .btn-secondary:hover {
        background: #64748b;
      }

      .btn-info {
        background: #0ea5e9;
        color: white;
      }

      .btn-info:hover {
        background: #0284c7;
      }

      .matches-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid rgba(212, 175, 55, 0.3);
      }

      .matches-filters {
        display: flex;
        gap: 10px;
      }

      .filter-select,
      .filter-input {
        padding: 8px 12px;
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 4px;
        background: rgba(51, 65, 85, 0.8);
        color: #f1f5f9;
        font-size: 14px;
      }

      .statistics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-bottom: 30px;
      }

      .stat-section {
        background: rgba(51, 65, 85, 0.3);
        border-radius: 8px;
        padding: 20px;
        border: 1px solid rgba(148, 163, 184, 0.2);
      }

      .stat-section h4 {
        color: #D4AF37;
        margin: 0 0 15px 0;
        font-size: 16px;
      }

      .achievements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
      }

      .achievement-card {
        background: rgba(51, 65, 85, 0.3);
        border-radius: 8px;
        padding: 20px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        display: flex;
        gap: 15px;
        transition: all 0.3s ease;
      }

      .achievement-card.unlocked {
        border-color: #D4AF37;
        background: rgba(212, 175, 55, 0.1);
      }

      .achievement-card.locked {
        opacity: 0.6;
      }

      .achievement-icon {
        font-size: 24px;
        color: #D4AF37;
        width: 40px;
        text-align: center;
      }

      .achievement-title {
        color: #f1f5f9;
        margin: 0 0 8px 0;
        font-size: 16px;
      }

      .achievement-description {
        color: #94a3b8;
        margin: 0 0 8px 0;
        font-size: 14px;
        line-height: 1.4;
      }

      .achievement-date,
      .achievement-progress {
        font-size: 12px;
        color: #D4AF37;
        font-weight: 500;
      }

      .no-achievements {
        text-align: center;
        padding: 60px 20px;
        color: #94a3b8;
        grid-column: 1 / -1;
      }

      .no-achievements i {
        font-size: 48px;
        margin-bottom: 20px;
        opacity: 0.5;
      }

      .no-recent {
        color: #94a3b8;
        font-style: italic;
        font-size: 12px;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Close the modal with animation
   */
  closeModal() {
    if (this.modalElement) {
      // Add closing animation
      this.modalElement.classList.remove('show');

      // Remove after animation completes
      setTimeout(() => {
        if (this.modalElement) {
          this.modalElement.remove();
          this.modalElement = null;
          this.currentPlayer = null;
          this.activeTab = 'overview';

          // Clean up any event listeners
          document.removeEventListener('keydown', this.handleKeyboardShortcuts);

          console.log('🚪 Player modal closed');
        }
      }, 300);
    }
  }

  /**
   * Helper function to get rank image
   */
  getRankImage(rank) {
    if (!rank) return 'emblem.png';if (typeof rank === 'string') return `${rank.toLowerCase()}.png`;if (rank.image) return rank.image;if (rank.name) return `${rank.name.toLowerCase()}.png`;return 'emblem.png';}

  /**
   * Helper function to get rank class
   */
  getRankClass(rank) {
    if (!rank) return 'unranked';if (typeof rank === 'string') return rank.toLowerCase();if (rank.name) return rank.name.toLowerCase().replace(/\s+/g, '-');return 'unranked';}

  /**
   * Format last seen time
   */
  formatLastSeen(lastSeen) {
    if (!lastSeen) return 'Unknown';const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';if (diffMins < 60) return `${diffMins}m ago`;if (diffHours < 24) return `${diffHours}h ago`;if (diffDays < 7) return `${diffDays}d ago`;return date.toLocaleDateString();}

  /**
   * Format playtime
   */
  formatPlaytime(playtime) {
    if (!playtime) return '0h';const hours = Math.floor(playtime / 3600);
    const minutes = Math.floor((playtime % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;return `${minutes}m`;}

  /**
   * Capitalize race name
   */
  capitalizeRace(race) {
    if (!race) return 'Random';return race.charAt(0).toUpperCase() + race.slice(1);}

  /**
   * Generate recent match results indicators
   */
  generateRecentResults(recentMatches) {
    if (!recentMatches || recentMatches.length === 0) {
      return '<span class="no-matches">No recent matches</span>';}

    return recentMatches.slice(0, 10).map(match => {
      const result = match.result || (match.winner ? 'win' : 'loss');return `<div class="match-indicator ${result}" title="${match.map || 'Unknown Map'} - ${result}"></div>`;}).join('');
  }

  /**
   * Clear match filters
   */
  clearMatchFilters() {
    const resultFilter = document.getElementById('match-result-filter');
    const raceFilter = document.getElementById('match-race-filter');
    const mapFilter = document.getElementById('match-map-filter');

    if (resultFilter) resultFilter.value = '';
    if (raceFilter) raceFilter.value = '';
    if (mapFilter) mapFilter.value = '';

    // Reload matches with cleared filters
    this.loadMatchHistoryData();
  }

  /**
   * Export race statistics
   */
  exportRaceStats() {
    if (!this.currentPlayer) return;console.log('📊 Exporting race statistics...');
    // This would generate and download a CSV/JSON file
  }

  /**
   * Export map statistics
   */
  exportMapStats() {
    if (!this.currentPlayer) return;console.log('🗺️ Exporting map statistics...');
    // This would generate and download a CSV/JSON file
  }

  /**
   * Load previous matches page
   */
  loadPreviousMatches() {
    // Implementation for pagination
    console.log('⬅️ Loading previous matches...');
  }

  /**
   * Load next matches page
   */
  loadNextMatches() {
    // Implementation for pagination
    console.log('➡️ Loading next matches...');
  }

  /**
   * Cleanup modal UI
   */
  cleanup() {
    console.log('🧹 Cleaning up Player Modal UI...');

    this.currentPlayer = null;
    this.activeTab = 'overview';
    this.tabData.clear();
    this.modalElement = null;

    console.log('✅ Player Modal UI cleanup complete');
  }
}

// Create and export singleton instance
export const playerModalUI = new PlayerModalUI(); 