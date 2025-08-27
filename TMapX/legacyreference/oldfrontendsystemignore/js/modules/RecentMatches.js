/**
 * RecentMatches Module
 * Handles recent matches display, pagination, and filtering
 */

class RecentMatches {
  constructor() {
    this.ladderAPI = null;
    this.currentGameType = 'warcraft2';
    this.currentMatchType = 'all';
    this.currentPage = 1;
    this.totalPages = 1;
    this.matches = [];
    this.itemsPerPage = 10;
  }

  /**
   * Initialize the recent matches system
   */
  init() {
    this.ladderAPI = window.ladderAPI;
    this.setupGlobalFunctions();
    console.log('📊 RecentMatches module initialized');
  }

  /**
   * Set current game type
   */
  setGameType(gameType) {
    this.currentGameType = gameType;
  }

  /**
   * Set up global functions for external access
   */
  setupGlobalFunctions() {
    window.loadRecentMatches = (matchType = 'all', showLoading = true, gameType = null) => 
      this.loadRecentMatches(matchType, showLoading, gameType);
    window.refreshRecentMatches = () => this.refreshMatches();
  }

  /**
   * Load recent matches
   * @param {string} matchType - Match type filter ('all', '1v1', '2v2', etc.)
   * @param {boolean} showLoading - Whether to show loading indicator
   * @param {string} gameType - Game type filter
   */
  async loadRecentMatches(matchType = 'all', showLoading = true, gameType = null) {
    try {
      console.log('📊 Loading recent matches:', { matchType, showLoading, gameType });

      const targetGameType = gameType || this.currentGameType;
      this.currentMatchType = matchType;
      this.currentPage = 1; // Reset to first page when changing filters

      // Show loading state
      if (showLoading) {
        this.showLoading();
      }

      // Load data from API
      let data;
      if (this.ladderAPI && typeof this.ladderAPI.loadRecentMatches === 'function') {
        data = await this.ladderAPI.loadRecentMatches(matchType, this.currentPage, targetGameType);
      } else {
        // Fallback to direct API call
        data = await this.fetchRecentMatchesDirect(matchType, this.currentPage, targetGameType);
      }

      // Store matches data
      this.matches = Array.isArray(data) ? data : (data.matches || []);
      this.totalPages = data.pagination?.totalPages || 1;

      // Display the matches
      this.displayRecentMatches();

      // Update pagination if container exists
      this.updatePagination();

      console.log('✅ Recent matches loaded successfully:', this.matches.length, 'matches');
      return data;} catch (error) {
      console.error('❌ Error loading recent matches:', error);
      this.showErrorMessage('Failed to load recent matches. Please try again later.');
      throw error;
    }
  }

  /**
   * Direct API call fallback
   */
  async fetchRecentMatchesDirect(matchType, page, gameType) {
    const params = new URLSearchParams({
      limit: this.itemsPerPage.toString(),
      page: page.toString()
    });

    if (matchType && matchType !== 'all') {
      params.append('matchType', matchType);
    }

    if (gameType && gameType !== 'all') {
      params.append('gameType', gameType);
    }

    const response = await fetch(`/api/matches?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();}

  /**
   * Display recent matches in the container
   */
  displayRecentMatches() {
    const container = this.getContainer();
    if (!container) return;if (this.matches.length === 0) {
      this.showEmptyState();
      return;}

    // Clear container
    container.innerHTML = '';

    // Create match cards
    this.matches.forEach(match => {
      const matchCard = this.createMatchCard(match);
      container.appendChild(matchCard);
    });

    console.log('📊 Displayed', this.matches.length, 'recent matches');
  }

  /**
   * Create a match card element
   */
  createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';

    // Format date
    const matchDate = new Date(match.date || match.createdAt);
    const timeAgo = this.formatTimeAgo(matchDate);

    // Determine match result display
    const { winnerDisplay, loserDisplay } = this.formatMatchResult(match);

    // Get map name
    const mapName = match.map?.name || match.map || 'Unknown Map';

    // Create match type badge
    const matchTypeBadge = this.createMatchTypeBadge(match.matchType);

    card.innerHTML = `
      <div class="match-header">
        ${matchTypeBadge}
        <span class="match-date">${timeAgo}</span>
      </div>
      <div class="match-details">
        <div class="match-players">
          <div class="match-result winners">
            <span class="result-label">Winners:</span>
            <span class="player-names">${winnerDisplay}</span>
          </div>
          <div class="match-result losers">
            <span class="result-label">Losers:</span>
            <span class="player-names">${loserDisplay}</span>
          </div>
        </div>
        <div class="match-map">
          <i class="fas fa-map"></i>
          <span>${mapName}</span>
        </div>
      </div>
      <div class="match-actions">
        <button class="btn btn-sm btn-secondary" onclick="viewMatchDetails('${match._id || match.id}')">
          <i class="fas fa-eye"></i> Details
        </button>
        ${match.screenshots && match.screenshots.length > 0 ? `
          <button class="btn btn-sm btn-secondary" onclick="viewScreenshots('${match._id || match.id}')">
            <i class="fas fa-images"></i> Screenshots (${match.screenshots.length})
          </button>
        ` : ''}
        ${match.report?.battleReport ? `
          <button class="btn btn-sm btn-info" onclick="viewBattleReport('${match._id || match.id}')">
            <i class="fas fa-scroll"></i> Battle Report
          </button>
        ` : ''}
        ${match.report?.youtubeLink ? `
          <a href="${match.report.youtubeLink}" target="_blank" class="btn btn-sm btn-danger">
            <i class="fab fa-youtube"></i> Commentary
          </a>
        ` : ''}
      </div>
    `;

    return card;}

  /**
   * Format match result for display
   */
  formatMatchResult(match) {
    const winners = [];
    const losers = [];

    if (match.players && Array.isArray(match.players)) {
      match.players.forEach(player => {
        const playerName = player.name || player.playerId?.name || 'Unknown';
        if (player.result === 'win') {
          winners.push(playerName);
        } else {
          losers.push(playerName);
        }
      });
    }

    const winnerDisplay = winners.length > 0 ? winners.join(', ') : 'Unknown';
    const loserDisplay = losers.length > 0 ? losers.join(', ') : 'Unknown';

    return { winnerDisplay, loserDisplay };}

  /**
   * Create match type badge
   */
  createMatchTypeBadge(matchType) {
    const typeClass = matchType ? matchType.toLowerCase() : 'unknown';
    return `<span class="match-type ${typeClass}">${matchType || 'Unknown'}</span>`;}

  /**
   * Format time ago string
   */
  formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';if (diffMins < 60) return `${diffMins}m ago`;if (diffHours < 24) return `${diffHours}h ago`;if (diffDays < 7) return `${diffDays}d ago`;return date.toLocaleDateString();}

  /**
   * Show loading state
   */
  showLoading() {
    const container = this.getContainer();
    if (!container) return;container.innerHTML = `
      <div class="loading-matches">
        <div class="loading-spinner"></div>
        <span>Loading recent matches...</span>
      </div>
    `;
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    const container = this.getContainer();
    if (!container) return;container.innerHTML = `
      <div class="empty-matches">
        <i class="fas fa-inbox"></i>
        <h3>No Recent Matches</h3>
        <p>No matches found for the selected filters.</p>
        <button class="btn btn-primary" onclick="refreshRecentMatches()">
          <i class="fas fa-refresh"></i> Refresh
        </button>
      </div>
    `;
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    const container = this.getContainer();
    if (!container) return;container.innerHTML = `
      <div class="error-matches">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Matches</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="refreshRecentMatches()">
          <i class="fas fa-retry"></i> Try Again
        </button>
      </div>
    `;
  }

  /**
   * Get the recent matches container
   */
  getContainer() {
    return document.getElementById('recent-matches-container') || 
           document.getElementById('recent-matches');}

  /**
   * Update pagination controls
   */
  updatePagination() {
    const paginationContainer = document.getElementById('recent-matches-pagination');
    if (!paginationContainer || this.totalPages <= 1) {
      if (paginationContainer) paginationContainer.style.display = 'none';
      return;}

    paginationContainer.style.display = 'flex';
    
    const prevDisabled = this.currentPage <= 1 ? 'disabled' : '';
    const nextDisabled = this.currentPage >= this.totalPages ? 'disabled' : '';

    paginationContainer.innerHTML = `
      <button class="btn btn-sm" ${prevDisabled} onclick="recentMatches.loadPage(${this.currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Previous
      </button>
      <span class="pagination-info">
        Page ${this.currentPage} of ${this.totalPages}
      </span>
      <button class="btn btn-sm" ${nextDisabled} onclick="recentMatches.loadPage(${this.currentPage + 1})">
        Next <i class="fas fa-chevron-right"></i>
      </button>
    `;
  }

  /**
   * Load a specific page
   */
  async loadPage(page) {
    if (page < 1 || page > this.totalPages) return;this.currentPage = page;
    await this.loadRecentMatches(this.currentMatchType, true, this.currentGameType);
  }

  /**
   * Refresh current matches
   */
  async refreshMatches() {
    await this.loadRecentMatches(this.currentMatchType, true, this.currentGameType);
  }

  /**
   * Filter matches by type
   */
  async filterByType(matchType) {
    await this.loadRecentMatches(matchType, true, this.currentGameType);
  }

  /**
   * Get current matches data
   */
  getCurrentMatches() {
    return this.matches;}

  /**
   * Get current pagination state
   */
  getPaginationState() {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      matchType: this.currentMatchType,
      gameType: this.currentGameType
    };}

  /**
   * Set up match type filter event listeners
   */
  setupMatchTypeFilters() {
    const filterButtons = document.querySelectorAll('.recent-matches-filters .filter-btn');
    
    filterButtons.forEach(button => {
      button.addEventListener('click', async () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get match type and filter
        const matchType = button.getAttribute('data-match-type') || 'all';
        await this.filterByType(matchType);
      });
    });
  }

  /**
   * Initialize recent matches for a specific container
   */
  async initializeForContainer(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Recent matches container ${containerId} not found`);
      return;}

    // Set options
    if (options.itemsPerPage) this.itemsPerPage = options.itemsPerPage;
    if (options.gameType) this.currentGameType = options.gameType;
    if (options.matchType) this.currentMatchType = options.matchType;

    // Load initial data
    await this.loadRecentMatches(this.currentMatchType, true, this.currentGameType);

    // Set up filters if they exist
    this.setupMatchTypeFilters();

    console.log(`📊 Recent matches initialized for container: ${containerId}`);
  }

  /**
   * View battle report for a match
   */
  async viewBattleReport(matchId) {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      const match = await response.json();
      
      if (!match.report?.battleReport) {
        alert('No battle report available for this match.');
        return;}

      const modal = document.createElement('div');
      modal.className = 'battle-report-modal-overlay';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      `;

      modal.innerHTML = `
        <div style="
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
          border-radius: 15px;
          padding: 2rem;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          color: #f1f5f9;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0; color: #ffd700; font-family: 'Cinzel', serif;">
              <i class="fas fa-scroll"></i> Battle Report
            </h3>
            <button onclick="this.closest('.battle-report-modal-overlay').remove()" style="
              background: none;
              border: none;
              color: #94a3b8;
              font-size: 1.5rem;
              cursor: pointer;
              padding: 0.5rem;
              border-radius: 50%;
              transition: color 0.3s ease;
            " onmouseover="this.style.color='#f1f5f9'" onmouseout="this.style.color='#94a3b8'">
              &times;
            </button>
          </div>
          
          <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(255, 215, 0, 0.1); border-radius: 8px; border-left: 3px solid #ffd700;">
            <div style="font-size: 0.9rem; color: #ffd700; margin-bottom: 0.5rem;">
              <strong>${match.matchType.toUpperCase()}</strong> on <strong>${match.map?.name || 'Unknown Map'}</strong>
            </div>
            <div style="font-size: 0.8rem; color: #94a3b8;">
              ${new Date(match.date).toLocaleDateString()} - Reported by ${match.report.reportedBy?.username || 'Anonymous'}
            </div>
          </div>
          
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 1.5rem;
            line-height: 1.6;
            white-space: pre-wrap;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          ">
            ${match.report.battleReport}
          </div>
          
          ${match.report.youtubeLink ? `
            <div style="margin-top: 1.5rem; text-align: center;">
              <a href="${match.report.youtubeLink}" target="_blank" style="
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: #ff0000;
                color: white;
                text-decoration: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                transition: background-color 0.3s ease;
              " onmouseover="this.style.backgroundColor='#cc0000'" onmouseout="this.style.backgroundColor='#ff0000'">
                <i class="fab fa-youtube"></i>
                Watch Commentary
              </a>
            </div>
          ` : ''}
        </div>
      `;

      document.body.appendChild(modal);
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

    } catch (error) {
      console.error('Error loading battle report:', error);
      alert('Failed to load battle report.');
    }
  }

  /**
   * View screenshots for a match
   */
  async viewScreenshots(matchId) {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      const match = await response.json();
      
      if (!match.screenshots || match.screenshots.length === 0) {
        alert('No screenshots available for this match.');
        return;}

      const modal = document.createElement('div');
      modal.className = 'screenshots-modal-overlay';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      modal.innerHTML = `
        <div style="
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
          border-radius: 15px;
          padding: 2rem;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          color: #f1f5f9;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0; color: #ffd700; font-family: 'Cinzel', serif;">
              <i class="fas fa-images"></i> Match Screenshots (${match.screenshots.length})
            </h3>
            <button onclick="this.closest('.screenshots-modal-overlay').remove()" style="
              background: none;
              border: none;
              color: #94a3b8;
              font-size: 1.5rem;
              cursor: pointer;
              padding: 0.5rem;
              border-radius: 50%;
              transition: color 0.3s ease;
            " onmouseover="this.style.color='#f1f5f9'" onmouseout="this.style.color='#94a3b8'">
              &times;
            </button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
            ${match.screenshots.map((screenshot, index) => `
              <div style="border: 2px solid rgba(212, 175, 55, 0.3); border-radius: 8px; overflow: hidden;">
                <img src="${screenshot.url}" alt="Screenshot ${index + 1}" style="width: 100%; height: auto; display: block; cursor: pointer;" onclick="window.open('${screenshot.url}', '_blank')">
                <div style="padding: 0.5rem; background: rgba(0, 0, 0, 0.3); font-size: 0.8rem; color: #94a3b8;">
                  Screenshot ${index + 1} - ${new Date(screenshot.uploadDate).toLocaleDateString()}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

    } catch (error) {
      console.error('Error loading screenshots:', error);
      alert('Failed to load screenshots.');
    }
  }
}

// Export for use in other modules
window.RecentMatches = RecentMatches;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (!window.recentMatches) {
    window.recentMatches = new RecentMatches();
  }
});

// Global functions for button onclick handlers
window.viewBattleReport = async (matchId) => {
  if (window.recentMatches) {
    await window.recentMatches.viewBattleReport(matchId);
  }
};

window.viewScreenshots = async (matchId) => {
  if (window.recentMatches) {
    await window.recentMatches.viewScreenshots(matchId);
  }
};

window.viewMatchDetails = (matchId) => {
  // This can be implemented or linked to existing match details functionality
  if (window.matchDetailsManager) {
    window.matchDetailsManager.showMatchDetails(matchId);
  } else {
    console.log('Match details:', matchId);
    alert('Match details functionality not yet implemented.');
  }
}; 