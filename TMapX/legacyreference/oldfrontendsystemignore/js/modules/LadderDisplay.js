/**
 * Ladder Display Module
 * Handles leaderboard rendering, player rows, and pagination
 */

class LadderDisplay {
  constructor() {
    this.leaderboardBody = null;
    this.paginationState = {
      currentPage: 1,
      totalPages: 1,
      matchType: 'all',
      searchQuery: ''
    };
    this.ranksContainer = null;
  }

  /**
   * Initialize the display system
   */
  init() {
    this.leaderboardBody = document.getElementById('leaderboard-body');
    this.ranksContainer = document.getElementById('ranks-container');
    this.setupPagination();
    
    // Make pagination state globally available
    window.paginationState = this.paginationState;
    
    console.log('✅ Ladder display initialized');
  }

  /**
   * Display leaderboard data
   * @param {Object} data - Leaderboard data from API
   */
  displayLeaderboard(data) {
    try {
      console.log('📊 Displaying leaderboard data:', data);

      if (!this.leaderboardBody) {
        console.error('❌ Leaderboard body element not found');
        return;}

      // Update pagination state
      this.paginationState.currentPage = data.currentPage || 1;
      this.paginationState.totalPages = data.totalPages || 1;

      // Clear existing content
      this.leaderboardBody.innerHTML = '';

      // Check if we have players data
      if (!data.players || data.players.length === 0) {
        this.showNoPlayersMessage();
        this.updatePaginationControls();
        return;}

      // Create player rows
      data.players.forEach((player, index) => {
        const row = this.createPlayerRow(player, index, data.currentPage);
        this.leaderboardBody.appendChild(row);
      });

      // Update pagination controls
      this.updatePaginationControls();

      console.log(`✅ Displayed ${data.players.length} players`);
    } catch (error) {
      console.error('❌ Error displaying leaderboard:', error);
      this.showErrorMessage('Failed to display leaderboard data');
    }
  }

  /**
   * Create a player row element
   * @param {Object} player - Player data
   * @param {number} index - Row index
   * @param {number} currentPage - Current page number
   * @returns {HTMLElement} Player row element
   */
  createPlayerRow(player, index, currentPage = 1) {
    const row = document.createElement('tr');const globalRank = (currentPage - 1) * 10 + index + 1;
    
    // Get rank information
    const rankInfo = this.getRankInfo(player.rank || 'unranked');
    
    // Calculate win rate
    const wins = player.wins || 0;
    const losses = player.losses || 0;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';

    // Create rank change indicator
    const rankChangeIndicator = this.createRankChangeIndicator(player.rankChange);

    row.innerHTML = `
      <td class="rank-cell">
        <div class="rank-display">
          <span class="rank-number">${globalRank}</span>
          ${rankChangeIndicator}
        </div>
      </td>
      <td class="player-cell">
        <div class="player-info" onclick="handlePlayerClick('${player.name}')">
          <div class="player-avatar-section">
            <img src="${rankInfo.image}" 
                 alt="${rankInfo.name}" 
                 class="rank-icon"
                 onerror="this.src='/assets/img/ranks/b3.png'">
          </div>
          <div class="player-details">
            <div class="player-name-row">
              <span class="player-name">${player.name}</span>
              <button class="copy-player-btn" 
                      onclick="copyPlayerName('${player.name}', event)" 
                      title="Copy player name">
                <i class="fas fa-copy"></i>
              </button>
            </div>
            <div class="player-rank">${rankInfo.name}</div>
          </div>
        </div>
      </td>
      <td class="mmr-cell">
        <div class="mmr-display">
          <span class="mmr-value">${player.mmr || 0}</span>
          ${player.mmrChange ? `<span class="mmr-change ${player.mmrChange >= 0 ? 'positive' : 'negative'}">${player.mmrChange >= 0 ? '+' : ''}${player.mmrChange}</span>` : ''}
        </div>
      </td>
      <td class="wins-cell">
        <span class="wins-value">${player.wins || 0}</span>
      </td>
      <td class="losses-cell">
        <span class="losses-value">${player.losses || 0}</span>
      </td>
      <td class="ratio-cell">
        <div class="win-rate-display">
          <span class="win-rate-value">${winRate}%</span>
          <div class="win-rate-bar">
            <div class="win-rate-fill" style="width: ${winRate}%"></div>
          </div>
        </div>
      </td>
    `;

    // Add click handler for player details
    row.addEventListener('click', async (e) => {
      // Don't trigger if clicking on copy button
      if (!e.target.closest('.copy-player-btn')) {
        const playerName = player.name;
        console.log(`🎯 Player row clicked: ${playerName}`);
        
        // Try multiple player modal functions
        try {
          if (window.showPlayerDetails) {
            console.log('🎯 Using window.showPlayerDetails...');
            await window.showPlayerDetails(playerName);
          } else if (window.openPlayerDetailsModal) {
            console.log('🎯 Using window.openPlayerDetailsModal...');
            await window.openPlayerDetailsModal(playerName);
          } else if (window.handlePlayerClick) {
            console.log('🎯 Using window.handlePlayerClick...');
            await window.handlePlayerClick(playerName);
          } else {
            console.warn('⚠️ No player modal functions available');
            // Fallback: show simple alert
            alert(`Player: ${player.name}\n\nPlayer modal not available. Please refresh the page.`);
          }
        } catch (error) {
          console.error('❌ Error opening player modal:', error);
          alert(`Unable to open player profile for ${playerName}. Please try again.`);
        }
      }
    });

    return row;}

  /**
   * Get rank information
   * @param {string} rankName - Rank name
   * @returns {Object} Rank info with name and image
   */
  getRankInfo(rankName) {
    const defaultRank = { name: 'Unranked', image: '/assets/img/ranks/unranked.png' };if (!rankName) return defaultRank;const rankMappings = {
      'Bronze 3': { name: 'Bronze III', image: '/assets/img/ranks/b3.png' },
      'Bronze 2': { name: 'Bronze II', image: '/assets/img/ranks/b2.png' },
      'Bronze 1': { name: 'Bronze I', image: '/assets/img/ranks/b1.png' },
      'Gold 3': { name: 'Gold III', image: '/assets/img/ranks/g3.png' },
      'Gold 2': { name: 'Gold II', image: '/assets/img/ranks/g2.png' },
      'Gold 1': { name: 'Gold I', image: '/assets/img/ranks/g1.png' },
      'Amber 3': { name: 'Amber III', image: '/assets/img/ranks/a3.png' },
      'Amber 2': { name: 'Amber II', image: '/assets/img/ranks/a2.png' },
      'Amber 1': { name: 'Amber I', image: '/assets/img/ranks/a1.png' },
      'Sapphire 3': { name: 'Sapphire III', image: '/assets/img/ranks/s3.png' },
      'Sapphire 2': { name: 'Sapphire II', image: '/assets/img/ranks/s2.png' },
      'Sapphire 1': { name: 'Sapphire I', image: '/assets/img/ranks/s1.png' },
      'Champion': { name: 'Champion', image: '/assets/img/ranks/champion.png' }
    };

    return rankMappings[rankName] || defaultRank;}

  /**
   * Calculate win rate percentage
   * @param {number} wins - Number of wins
   * @param {number} losses - Number of losses
   * @returns {number} Win rate percentage
   */
  calculateWinRate(wins = 0, losses = 0) {
    const totalGames = wins + losses;if (totalGames === 0) return 0;return Math.round((wins / totalGames) * 100);}

  /**
   * Create rank change indicator
   * @param {number} rankChange - Rank change value
   * @returns {string} HTML for rank change indicator
   */
  createRankChangeIndicator(rankChange) {
    if (!rankChange || rankChange === 0) return '';const isPositive = rankChange > 0;
    const icon = isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
    const className = isPositive ? 'rank-up' : 'rank-down';
    const sign = isPositive ? '+' : '';

    return `
      <div class="rank-change-indicator ${className}" title="Rank change: ${sign}${rankChange}">
        <i class="${icon}"></i>
        <span>${sign}${rankChange}</span>
      </div>
    `;}

  /**
   * Show no players message
   */
  showNoPlayersMessage() {
    this.leaderboardBody.innerHTML = `
      <tr class="no-players-row">
        <td colspan="6" class="no-players-cell">
          <div class="no-players-message">
            <i class="fas fa-users"></i>
            <h3>No Players Found</h3>
            <p>No players match your current search criteria.</p>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showErrorMessage(message) {
    this.leaderboardBody.innerHTML = `
      <tr class="error-row">
        <td colspan="6" class="error-cell">
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Data</h3>
            <p>${message}</p>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Display ranks data
   * @param {Array} ranks - Ranks data
   */
  displayRanks(ranks) {
    try {
      console.log('🏆 Displaying ranks:', ranks);

      if (!this.ranksContainer) {
        console.warn('⚠️ Ranks container not found');
        return;}

      if (!ranks || ranks.length === 0) {
        this.ranksContainer.innerHTML = `
          <div class="no-ranks-message">
            <p>No rank data available</p>
          </div>
        `;
        return;}

      // Sort ranks by threshold (lowest to highest - Bronze 3 to Champion)
      const sortedRanks = [...ranks].sort((a, b) => {
        const aThreshold = a.threshold || a.minMMR || 0;
        const bThreshold = b.threshold || b.minMMR || 0;
        return aThreshold - bThreshold;});

      console.log('🔄 Ranks sorted from lowest to highest:', sortedRanks.map(r => `${r.name}: ${r.threshold || r.minMMR || 0}`));

      // Create ranks display as items (not grid)
      this.ranksContainer.innerHTML = sortedRanks.map(rank => `
        <div class="rank-item" data-rank="${rank.name}">
          <img src="${this.getRankInfo(rank.name).image}" 
               alt="${rank.name}" 
               class="rank-image"
               onerror="this.src='/assets/img/ranks/unranked.png'">
          <div class="rank-details">
            <h4 class="rank-name">${this.getRankInfo(rank.name).name}</h4>
            <p class="rank-threshold">
              ${rank.threshold || rank.minMMR || 0} MMR
              ${rank.playerCount ? ` • ${rank.playerCount} players` : ''}
            </p>
          </div>
        </div>
      `).join('');

      console.log(`✅ Displayed ${sortedRanks.length} ranks`);
    } catch (error) {
      console.error('❌ Error displaying ranks:', error);
      if (this.ranksContainer) {
        this.ranksContainer.innerHTML = `
          <div class="error-message">
            <p>Failed to load ranks data</p>
          </div>
        `;
      }
    }
  }

  /**
   * Set up pagination controls
   */
  setupPagination() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');

    if (!prevButton || !nextButton) {
      console.warn('⚠️ Pagination buttons not found');
      return;}

    // Previous page button
    prevButton.addEventListener('click', () => {
      if (this.paginationState.currentPage > 1) {
        this.loadPage(this.paginationState.currentPage - 1);
      }
    });

    // Next page button
    nextButton.addEventListener('click', () => {
      if (this.paginationState.currentPage < this.paginationState.totalPages) {
        this.loadPage(this.paginationState.currentPage + 1);
      }
    });

    console.log('✅ Pagination controls setup');
  }

  /**
   * Load a specific page
   * @param {number} page - Page number to load
   */
  async loadPage(page) {
    try {
      // Use the global loadLeaderboard function if available
      if (typeof window.loadLeaderboard === 'function') {
        await window.loadLeaderboard(
          this.paginationState.matchType,
          page,
          this.paginationState.searchQuery
        );
      } else if (window.ladderAPI) {
        // Fallback to direct API call
        const data = await window.ladderAPI.loadLeaderboard(
          this.paginationState.matchType,
          page,
          this.paginationState.searchQuery
        );
        this.displayLeaderboard(data);
      }
    } catch (error) {
      console.error('❌ Error loading page:', error);
    }
  }

  /**
   * Update pagination controls
   */
  updatePaginationControls() {
    const pageInfo = document.getElementById('page-info');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const paginationControls = document.querySelector('.pagination-controls');

    if (!pageInfo || !prevButton || !nextButton || !paginationControls) {
      console.warn('⚠️ Pagination elements not found');
      return;}

    // Update page info
    pageInfo.textContent = `Page ${this.paginationState.currentPage} of ${this.paginationState.totalPages}`;

    // Enable/disable buttons
    prevButton.disabled = this.paginationState.currentPage <= 1;
    nextButton.disabled = this.paginationState.currentPage >= this.paginationState.totalPages;

    // Remove existing page numbers
    const existingPageNumbers = paginationControls.querySelector('.page-numbers');
    if (existingPageNumbers) {
      existingPageNumbers.remove();
    }

    // Add page numbers if there are multiple pages
    if (this.paginationState.totalPages > 1) {
      const pageNumbers = this.createPageNumbers();
      paginationControls.insertBefore(pageNumbers, nextButton);
    }
  }

  /**
   * Create page number buttons
   * @returns {HTMLElement} Page numbers container
   */
  createPageNumbers() {
    const pageNumbers = document.createElement('div');pageNumbers.className = 'page-numbers';

    const { currentPage, totalPages } = this.paginationState;
    const maxVisiblePages = 7;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust startPage if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pageNumbers.appendChild(this.createPageButton(1));
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
      }
    }

    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.appendChild(this.createPageButton(i));
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
      }
      pageNumbers.appendChild(this.createPageButton(totalPages));
    }

    return pageNumbers;}

  /**
   * Create a page button
   * @param {number} pageNum - Page number
   * @returns {HTMLElement} Page button element
   */
  createPageButton(pageNum) {
    const pageBtn = document.createElement('button');pageBtn.textContent = pageNum;
    pageBtn.className = pageNum === this.paginationState.currentPage ? 'current-page' : '';
    
    if (pageNum !== this.paginationState.currentPage) {
      pageBtn.addEventListener('click', () => {
        this.loadPage(pageNum);
      });
    }
    
    return pageBtn;}

  /**
   * Show loading state
   */
  showLoading() {
    if (this.leaderboardBody) {
      this.leaderboardBody.innerHTML = `
        <tr class="loading-row">
          <td colspan="6" class="loading-cell">
            <div class="loading-message">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Loading leaderboard data...</span>
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Filter content by game type
   * @param {string} gameType - Game type to filter by
   */
  filterByGameType(gameType) {
    const playerRows = document.querySelectorAll('.player-row');
    
    playerRows.forEach(row => {
      const rowGameType = row.dataset.gameType;
      
      if (rowGameType) {
        if (rowGameType === gameType || gameType === 'all') {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      }
    });

    console.log(`🔍 Filtered content by game type: ${gameType}`);
  }

  /**
   * Get current pagination state
   * @returns {Object} Pagination state
   */
  getPaginationState() {
    return { ...this.paginationState };}

  /**
   * Update pagination state
   * @param {Object} newState - New pagination state
   */
  updatePaginationState(newState) {
    this.paginationState = { ...this.paginationState, ...newState };
  }
}

// Export for use in other modules
window.LadderDisplay = LadderDisplay; 