/**
 * Ladder Filters Module
 * Handles match type filtering, search functionality, and pagination
 */

class LadderFilters {
  constructor() {
    this.filterButtons = null;
    this.searchInput = null;
    this.currentFilters = {
      matchType: 'all',
      search: '',
      gameType: 'warcraft2'
    };
  }

  /**
   * Initialize the filters
   */
  init() {
    this.setupMatchTypeFilters();
    this.setupSearchFilter();
    console.log('✅ Ladder filters initialized');
  }

  /**
   * Set up match type filter buttons
   */
  setupMatchTypeFilters() {
    this.filterButtons = document.querySelectorAll('.filter-btn');

    if (!this.filterButtons || this.filterButtons.length === 0) {
      console.warn('No filter buttons found. Skipping match type filter setup.');
      return;}

    this.filterButtons.forEach(button => {
      button.addEventListener('click', async () => {
        try {
          // Remove active class from all buttons
          this.filterButtons.forEach(btn => btn.classList.remove('active'));

          // Add active class to clicked button
          button.classList.add('active');

          // Get match type from data attribute
          const matchType = button.getAttribute('data-match-type');
          this.currentFilters.matchType = matchType;

          // Apply the filter
          await this.applyFilters();
        } catch (error) {
          console.error('Error in match type filter click handler:', error);
        }
      });
    });
  }

  /**
   * Set up search filter
   */
  setupSearchFilter() {
    this.searchInput = document.getElementById('player-search');
    
    if (!this.searchInput) {
      console.warn('Search input not found. Skipping search filter setup.');
      return;}

    // Debounce search to avoid too many API calls
    let searchTimeout;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.currentFilters.search = e.target.value.trim();
        this.applyFilters();
      }, 300);
    });
  }

  /**
   * Apply current filters to reload data
   */
  async applyFilters() {
    try {
      console.log('🔍 Applying filters:', this.currentFilters);

      // Reset pagination to page 1 when changing filters
      if (window.paginationState) {
        window.paginationState.currentPage = 1;
        window.paginationState.searchQuery = this.currentFilters.search;
      }

      // Load leaderboard with filters
      if (window.loadLeaderboard) {
        await window.loadLeaderboard(
          this.currentFilters.matchType, 
          1, 
          this.currentFilters.search
        );
      }

      // Reload global stats
      if (window.loadGlobalStats) {
        try {
          await window.loadGlobalStats();
        } catch (statsError) {
          console.error('Error loading global stats:', statsError);
        }
      }

      // Load recent matches with current filters
      if (window.loadRecentMatches) {
        try {
          await window.loadRecentMatches(
            this.currentFilters.matchType === 'all' ? 'all' : this.currentFilters.matchType,
            1,
            this.currentFilters.gameType
          );
        } catch (matchesError) {
          console.error('Error loading recent matches:', matchesError);
        }
      }

      console.log('✅ Filters applied successfully');
    } catch (error) {
      console.error('❌ Error applying filters:', error);
    }
  }

  /**
   * Update game type filter
   * @param {string} gameType - The game type to filter by
   */
  setGameType(gameType) {
    this.currentFilters.gameType = gameType;
    console.log('🎮 Game type filter updated to:', gameType);
  }

  /**
   * Get current filters
   * @returns {Object} Current filter state
   */
  getCurrentFilters() {
    return { ...this.currentFilters };}

  /**
   * Set active match type button
   * @param {string} matchType - The match type to activate
   */
  setActiveMatchType(matchType) {
    this.currentFilters.matchType = matchType;
    
    if (this.filterButtons) {
      this.filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-match-type') === matchType) {
          btn.classList.add('active');
        }
      });
    }
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.currentFilters = {
      matchType: 'all',
      search: '',
      gameType: this.currentFilters.gameType // Keep current game type
    };

    // Clear search input
    if (this.searchInput) {
      this.searchInput.value = '';
    }

    // Reset active button
    this.setActiveMatchType('all');

    console.log('🧹 Filters cleared');
  }
}

// Export for use in other modules
window.LadderFilters = LadderFilters; 