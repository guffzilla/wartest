/**
 * ProfileTabManager.js - Centralized Tab and Activity Management
 * 
 * Consolidates all scattered tab switching and activity management
 * functions from the 126KB monster.
 * 
 * Handles:
 * - Activity tab switching (Tournaments, War Table, Achievements, etc.)
 * - Tab state management and history
 * - Dynamic content loading for tabs
 * - Search and filtering within tabs
 * - Pagination for tab content
 * - Tab performance optimization
 */


import { profileUIManager } from './ProfileUIManager.js';

export class ProfileTabManager {
  constructor() {
    this.activeTab = 'campaign-progress';
    this.tabHistory = [];
    this.tabContent = new Map();
    this.tabLoaders = new Map();
    this.searchFilters = new Map();
    this.paginationStates = new Map();
    this.tabUpdateTimers = new Map();
  }

  /**
   * Initialize tab manager and setup event listeners
   */
  init() {
    console.log('📑 Initializing Profile Tab Manager...');
    this.setupTabLoaders();
    this.setupTabEventListeners();
    this.setupSearchAndFilters();
    this.setupKeyboardNavigation();
    this.loadInitialTab();
    console.log('✅ Profile Tab Manager initialized');
  }

  /**
   * Initialize tab manager with pre-loaded data
   * Called by ProfileManager after all data is loaded
   */
  initializeWithData(profileData) {
    console.log('📑 Initializing Profile Tab Manager with data...');
    
    try {
      // No longer loading activity data since we removed the activity section
      console.log('✅ Profile Tab Manager initialized with data');
    } catch (error) {
      console.error('❌ Failed to initialize tab manager with data:', error);
    }
  }

  /**
   * Setup tab loading functions
   */
  setupTabLoaders() {
    // Note: War Table (campaign) section no longer uses tabs
    // Campaign progress is loaded directly in the ProfileUIManager
    // Achievements are handled in the main achievements section with Arena/Social/War Table tabs
  }

  /**
   * Setup tab click event listeners
   */
  setupTabEventListeners() {
    const tabButtons = document.querySelectorAll('.activity-tab');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = button.dataset.tab || button.id.replace('-tab', '');
        this.switchToTab(tabName);
      });
    });

    // Setup refresh buttons
    const refreshButtons = document.querySelectorAll('.tab-refresh-btn');
    refreshButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.refreshActiveTab();
      });
    });
  }

  /**
   * Setup search and filter functionality
   */
  setupSearchAndFilters() {
    // Search input for filtering tab content
    const searchInput = document.getElementById('activity-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.handleTabSearch(e.target.value);
        }, 300);
      });
    }

    // Filter dropdowns
    const filterSelects = document.querySelectorAll('.tab-filter-select');
    filterSelects.forEach(select => {
      select.addEventListener('change', () => {
        this.handleTabFilter(select.name, select.value);
      });
    });

    // Date range filters
    const dateFilters = document.querySelectorAll('.date-filter');
    dateFilters.forEach(filter => {
      filter.addEventListener('change', () => {
        this.handleDateFilter();
      });
    });
  }

  /**
   * Setup keyboard navigation for tabs
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Ctrl + Number keys to switch tabs quickly
      if (e.ctrlKey && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        const tabNames = []; // No longer using War Table tabs
        if (tabNames[tabIndex]) {
          this.switchToTab(tabNames[tabIndex]);
        }
      }
      
      // Arrow keys for pagination when in tab content
      if (e.target.closest('.tab-content')) {
        if (e.key === 'ArrowLeft' && e.ctrlKey) {
          this.navigatePage('prev');
        } else if (e.key === 'ArrowRight' && e.ctrlKey) {
          this.navigatePage('next');
        }
      }
    });
  }

  /**
   * Load initial tab based on URL hash or default
   */
  loadInitialTab() {
    // No longer using War Table tabs - this method is now deprecated
    console.log('📑 TabManager: No longer using War Table tabs');
  }

  /**
   * Switch to specified tab
   */
  async switchToTab(tabName) {
    if (this.activeTab === tabName) return;console.log(`📑 Switching to tab: ${tabName}`);

    try {
      // Update tab history
      this.tabHistory.push(this.activeTab);
      if (this.tabHistory.length > 10) {
        this.tabHistory.shift();
      }

      // Update active tab
      this.activeTab = tabName;
      
      // Update URL hash without page reload
      window.location.hash = tabName;
      
      // Update tab button states
      this.updateTabButtonStates(tabName);
      
      // Show loading state
      this.showTabLoading(tabName);
      
      // Load tab content
      console.log(`🔄 Loading content for tab: ${tabName}`);
      const data = await this.loadTabContent(tabName);
      console.log(`📦 Data loaded for tab ${tabName}:`, data);
      
      // Update UI with loaded data
      console.log(`🎨 Updating UI for tab: ${tabName}`);
      this.updateTabUIWithData(tabName, data);
      
      // Update tab container
      this.updateTabContainer(tabName);
      
      // Initialize tab-specific features
      this.initializeTabFeatures(tabName);
      
      console.log(`✅ Tab switched to: ${tabName}`);
    } catch (error) {
      console.error(`❌ Failed to switch to tab ${tabName}:`, error);
      this.showTabError(tabName, error.message);
    }
  }

  /**
   * Load content for specified tab
   */
  async loadTabContent(tabName) {
    // Check if content is already cached and recent
    const cachedContent = this.tabContent.get(tabName);
    const cacheAge = cachedContent ? Date.now() - cachedContent.timestamp : Infinity;
    
    // Use cache if less than 5 minutes old
    if (cachedContent && cacheAge < 5 * 60 * 1000) {
      console.log(`📦 Using cached content for tab: ${tabName}`);
      return cachedContent.data;}

    // Load fresh content
    const loader = this.tabLoaders.get(tabName);
    if (!loader) {
      throw new Error(`No loader found for tab: ${tabName}`);
    }

    const currentPage = this.paginationStates.get(tabName)?.currentPage || 1;
    const data = await loader(currentPage);
    
    // Cache the result
    this.tabContent.set(tabName, {
      data,
      timestamp: Date.now()
    });

    return data;}

  /**
   * Update tab button visual states
   */
  updateTabButtonStates(activeTabName) {
    const tabButtons = document.querySelectorAll('.activity-tab');
    
    tabButtons.forEach(button => {
      const tabName = button.dataset.tab || button.id.replace('-tab', '');
      
      if (tabName === activeTabName) {
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
      } else {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      }
    });
  }

  /**
   * Update tab content container
   */
  updateTabContainer(tabName) {
    const tabContainers = document.querySelectorAll('.activity-content');
    
    tabContainers.forEach(container => {
      if (container.id === `${tabName}-tab`) {
        container.classList.add('active');
        container.style.display = 'block';
      } else {
        container.classList.remove('active');
        container.style.display = 'none';
      }
    });
  }

  /**
   * Initialize tab-specific features
   */
  initializeTabFeatures(tabName) {
    switch (tabName) {
      case 'campaign':
        this.initializeCampaignTab();
        break;
      case 'campaign-progress':
        this.initializeCampaignTab(); // Same features as campaign tab
        break;
              // Note: campaign-achievements tab no longer exists
    }
  }

  /**
   * Initialize War Table tab features
   */
  initializeCampaignTab() {
    // Setup War Table difficulty filters
    const difficultyFilter = document.getElementById('campaign-difficulty-filter');
    if (difficultyFilter) {
      difficultyFilter.addEventListener('change', () => {
        this.filterCampaignsByDifficulty(difficultyFilter.value);
      });
    }

    // Setup speedrun sorting
    const speedrunSort = document.getElementById('speedrun-sort');
    if (speedrunSort) {
      speedrunSort.addEventListener('change', () => {
        this.sortSpeedruns(speedrunSort.value);
      });
    }
  }

  /**
   * Initialize forum tab features
   */
  initializeForumTab() {
    // Setup forum activity type filters
    const typeFilter = document.getElementById('forum-type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        this.filterForumActivity(typeFilter.value);
      });
    }
  }

  /**
   * Initialize reports tab features
   */
  initializeReportsTab() {
    // Setup report status filters
    const statusFilter = document.getElementById('report-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.filterReportsByStatus(statusFilter.value);
      });
    }
  }

  /**
   * Initialize maps tab features
   */
  initializeMapsTab() {
    // Setup map type filters
    const typeFilter = document.getElementById('map-type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        this.filterMapsByType(typeFilter.value);
      });
    }

    // Setup map rating sorting
    const ratingSort = document.getElementById('map-rating-sort');
    if (ratingSort) {
      ratingSort.addEventListener('change', () => {
        this.sortMapsByRating(ratingSort.value);
      });
    }
  }

  /**
   * Show loading state for tab
   */
  showTabLoading(tabName) {
    const container = document.getElementById(`${tabName}-tab`);
    if (container) {
      container.classList.add('loading');
      
      // Check if there's a specific inner container for this tab type
      const innerContainer = container.querySelector(`#${tabName}-activity-container`);
      
      if (innerContainer) {
        // If there's an inner container, just update its content
        innerContainer.innerHTML = `
          <div class="tab-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading ${tabName}...</span>
          </div>
        `;
      } else {
        // Otherwise, update the entire tab container
        container.innerHTML = `
          <div class="tab-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading ${tabName}...</span>
          </div>
        `;
      }
    }
  }

  /**
   * Show error state for tab
   */
  showTabError(tabName, message) {
    const container = document.getElementById(`${tabName}-tab`);
    if (container) {
      container.classList.remove('loading');
      container.classList.add('error');
      container.innerHTML = `
        <div class="tab-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to load ${tabName}</h3>
          <p>${message}</p>
          <button class="btn btn-primary" onclick="profileTabManager.refreshActiveTab()">
            <i class="fas fa-refresh"></i> Try Again
          </button>
        </div>
      `;
    }
  }

  /**
   * Refresh active tab content
   */
  async refreshActiveTab() {
    console.log(`🔄 Refreshing tab: ${this.activeTab}`);
    
    // Clear cached content
    this.tabContent.delete(this.activeTab);
    
    // Clear any search/filter states
    this.searchFilters.delete(this.activeTab);
    
    // Reload tab
    await this.switchToTab(this.activeTab);
  }

  /**
   * Handle tab search functionality
   */
  handleTabSearch(searchTerm) {
    this.searchFilters.set('search', searchTerm.toLowerCase());
    this.applyFiltersToActiveTab();
  }

  /**
   * Handle tab filter changes
   */
  handleTabFilter(filterName, filterValue) {
    this.searchFilters.set(filterName, filterValue);
    this.applyFiltersToActiveTab();
  }

  /**
   * Handle date filter changes
   */
  handleDateFilter() {
    const startDate = document.getElementById('date-start')?.value;
    const endDate = document.getElementById('date-end')?.value;
    
    if (startDate || endDate) {
      this.searchFilters.set('dateRange', { startDate, endDate });
    } else {
      this.searchFilters.delete('dateRange');
    }
    
    this.applyFiltersToActiveTab();
  }

  /**
   * Apply all active filters to current tab
   */
  applyFiltersToActiveTab() {
    // Debounce filter application
    const tabName = this.activeTab;
    
    if (this.tabUpdateTimers.has(tabName)) {
      clearTimeout(this.tabUpdateTimers.get(tabName));
    }
    
    const timer = setTimeout(() => {
      this.performFilterUpdate(tabName);
    }, 300);
    
    this.tabUpdateTimers.set(tabName, timer);
  }

  /**
   * Perform actual filter update
   */
  async performFilterUpdate(tabName) {
    const cachedContent = this.tabContent.get(tabName);
    if (!cachedContent) return;let filteredData = cachedContent.data;
    
    // Apply search filter
    const searchTerm = this.searchFilters.get('search');
    if (searchTerm) {
      filteredData = this.applySearchFilter(filteredData, searchTerm, tabName);
    }
    
    // Apply other filters
    for (const [filterName, filterValue] of this.searchFilters) {
      if (filterName !== 'search' && filterValue) {
        filteredData = this.applySpecificFilter(filteredData, filterName, filterValue, tabName);
      }
    }
    
    // Update UI with filtered data
    this.updateTabUIWithData(tabName, filteredData);
  }

  /**
   * Apply search filter to data
   */
  applySearchFilter(data, searchTerm, tabName) {
    // Only campaign tabs remain, no search functionality needed for now
    return data;}

  /**
   * Apply specific filter to data
   */
  applySpecificFilter(data, filterName, filterValue, tabName) {
    switch (filterName) {
      case 'difficulty':
        if (tabName === 'campaign') {
          return {
            ...data,
            progress: data.progress?.filter(p => p.difficulty === filterValue) || []
          };}
        break;
    }
    
    return data;}

  /**
   * Update tab UI with filtered/sorted data
   */
  updateTabUIWithData(tabName, data) {
    console.log(`🎨 Updating UI for tab: ${tabName}`);
    
    try {
      switch (tabName) {
        case 'campaign':
          // This case now handles campaign progress, stats are separate
          profileUIManager.updateCampaignStats(data);
          break;
        case 'campaign-progress':
          // Handle campaign progress specifically 
          profileUIManager.updateCampaignProgress(data);
          break;
        // Note: campaign-achievements tab moved to main achievements section
        default:
          console.warn(`No UI update logic for tab: ${tabName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update UI for tab ${tabName}:`, error);
    }
  }

  /**
   * Navigate pagination
   */
  async navigatePage(direction) {
    const currentState = this.paginationStates.get(this.activeTab) || { currentPage: 1 };
    let newPage = currentState.currentPage;
    
    if (direction === 'next' && currentState.hasNext) {
      newPage++;
    } else if (direction === 'prev' && currentState.hasPrev) {
      newPage--;
    } else {
      return;}
    
    // Update pagination state
    this.paginationStates.set(this.activeTab, { ...currentState, currentPage: newPage });
    
    // Reload tab with new page
    this.tabContent.delete(this.activeTab); // Clear cache
    await this.loadTabContent(this.activeTab);
    await this.switchToTab(this.activeTab);
  }

  /**
   * Go to previous tab in history
   */
  goToPreviousTab() {
    if (this.tabHistory.length > 0) {
      const previousTab = this.tabHistory.pop();
      this.switchToTab(previousTab);
    }
  }

  /**
   * Get tab statistics
   */
  getTabStats() {
    const stats = {
      activeTab: this.activeTab,
      tabHistory: [...this.tabHistory],
      cachedTabs: Array.from(this.tabContent.keys()),
      activeFilters: Object.fromEntries(this.searchFilters)
    };
    
    console.log('📊 Tab Manager Stats:', stats);
    return stats;}

  /**
   * Clear all tab caches
   */
  clearAllCaches() {
    this.tabContent.clear();
    this.searchFilters.clear();
    this.paginationStates.clear();
    console.log('🗑️ All tab caches cleared');
  }

  /**
   * Get cached data for a tab
   */
  getCachedData(tabName) {
    const content = this.tabContent.get(tabName);
    return content ? content.data : null;}

  /**
   * Set cached data for a tab
   */
  setCachedData(tabName, data) {
    this.tabContent.set(tabName, {
      data: data,
      timestamp: Date.now(),
      loaded: true
    });
  }

  /**
   * Clear cache for specific tab
   */
  clearCache(tabName) {
    this.tabContent.delete(tabName);
    this.searchFilters.delete(tabName);
    this.paginationStates.delete(tabName);
    console.log(`🗑️ Cache cleared for tab: ${tabName}`);
  }

  /**
   * Update tab badge with count or indicator
   */
  updateTabBadge(tabName, count) {
    try {
      const tabButton = document.querySelector(`[data-tab="${tabName}"]`) || 
                       document.getElementById(`${tabName}-tab`);
      
      if (tabButton) {
        let badge = tabButton.querySelector('.tab-badge');
        
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'tab-badge';
          tabButton.appendChild(badge);
        }
        
        if (count > 0) {
          badge.textContent = count;
          badge.style.display = 'inline';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to update badge for tab ${tabName}:`, error);
    }
  }

  /**
   * Preload adjacent tabs for performance
   */
  async preloadAdjacentTabs() {
    const tabOrder = ['campaign', 'campaign-progress', 'campaign-achievements'];
    const currentIndex = tabOrder.indexOf(this.activeTab);
    
    const preloadTabs = [];
    if (currentIndex > 0) preloadTabs.push(tabOrder[currentIndex - 1]);
    if (currentIndex < tabOrder.length - 1) preloadTabs.push(tabOrder[currentIndex + 1]);
    
    // Preload in background
    preloadTabs.forEach(async (tabName) => {
      if (!this.tabContent.has(tabName)) {
        try {
          await this.loadTabContent(tabName);
          console.log(`📦 Preloaded tab: ${tabName}`);
        } catch (error) {
          console.log(`⚠️ Failed to preload tab ${tabName}:`, error);
        }
      }
    });
  }
}

// Create and export singleton instance
export const profileTabManager = new ProfileTabManager(); 