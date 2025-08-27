/**
 * Enhanced Ladder Manager for WC1/WC2/WC3 System
 * Handles game type switching, map search, and comprehensive ladder functionality
 * Updated for Rust backend compatibility
 */

import { apiClient } from './ApiClient.js';

export class LadderManager {
  constructor() {
    this.currentGameType = 'wc3';
    this.currentMatchType = 'all';
    this.currentPage = 1;
    this.searchQuery = '';
    this.leaderboardData = null;
    this.statsData = null;
    this.recentMatchesData = null;
    this.ranksData = null;
    this.isLoading = false;
    this.lastFetchTime = {};
    this.cacheExpiry = 30000; // 30 seconds cache
    this.mapSearch = '';
    this.chartInstances = {};
    this.totalPages = 1;
    this.isActive = true;
    this.isInitialized = false;
    this.players = [];
    
    // Phase 3 optimization services (will be initialized later)
    this.advancedCache = null;
    this.advancedPrefetch = null;
    this.performanceMonitor = null;
    
    // Game configurations for different game types
    this.gameConfigs = {
      wc1: {
        title: 'WC1',
        fullTitle: 'Warcraft I',
        races: ['human', 'orc']
      },
      wc2: {
        title: 'WC2',
        fullTitle: 'Warcraft II',
        races: ['human', 'orc']
      },
      wc3: {
        title: 'WC3',
        fullTitle: 'Warcraft III',
        races: ['human', 'orc', 'undead', 'night_elf']
      }
    };
    
    // Initialize basic functionality first
    // Note: setupEventListeners() will be called from init() method after DOM is ready
    
    // PHASE 3 OPTIMIZATION: Initialize advanced services after DOM is ready
    // This will be called from the init() method
  }

  /**
   * Initialize Phase 3 optimization services
   */
  async initializePhase3Services() {
    console.log('🚀 Initializing Phase 3 optimization services...');
    
    // Wait for services to be available on window
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      if (window.AdvancedCacheService && window.PerformanceMonitorService && window.AdvancedPrefetchService) {
        break;
      }
      
      console.log(`⏳ Waiting for Phase 3 services to load... (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.warn('⚠️ Phase 3 services not fully loaded, continuing without them');
      return;}
    
    // Initialize Advanced Cache Service
    if (window.AdvancedCacheService) {
      this.advancedCache = new window.AdvancedCacheService();
      console.log('🔥 Advanced Cache Service initialized');
      
      // Configure cache for ladder-specific needs
      this.advancedCache.updateConfig({
        criticalDataTTL: 60000, // 1 minute for critical data
        standardDataTTL: 30000, // 30 seconds for standard data
        lazyDataTTL: 15000,     // 15 seconds for lazy data
        maxCacheSize: 250,      // Larger cache for ladder data
        enableWarming: true,
        enableOffline: true
      });
    }
    
    // Initialize Performance Monitor Service
    if (window.PerformanceMonitorService) {
      this.performanceMonitor = new window.PerformanceMonitorService();
      console.log('📊 Performance Monitor Service initialized');
      
      // Register ladder-specific performance metrics
      this.performanceMonitor.registerCustomMetric('ladder_page_load_time', {
        description: 'Time to load ladder page',
        unit: 'ms',
        category: 'page_performance'
      });
      
      this.performanceMonitor.registerCustomMetric('ladder_data_freshness', {
        description: 'Data freshness score',
        unit: 'score',
        category: 'data_quality'
      });
    }
    
    // Initialize Advanced Prefetch Service
    if (window.AdvancedPrefetchService) {
      this.advancedPrefetch = new window.AdvancedPrefetchService();
      console.log('🧠 Advanced Prefetch Service initialized');
      
      // Configure prefetching for ladder patterns
      this.advancedPrefetch.updateConfig({
        maxConcurrentPrefetch: 3,
        prefetchDelay: 500,
        confidenceThreshold: 0.6,
        learningRate: 0.15
      });
      
      // Set up ladder-specific prefetching patterns
      this.setupLadderPrefetching();
    }
    
    console.log('✅ Phase 3 services initialization completed');
  }

  /**
   * Set up ladder-specific prefetching patterns
   */
  setupLadderPrefetching() {
    if (!this.advancedPrefetch) return;this.advancedPrefetch.registerPrefetchPattern('ladder_leaderboard_loaded', {
      trigger: 'after_data_load',
      endpoints: [
        '/api/ladder/stats',
        '/api/ladder/recent-matches'
      ],
      priority: 'medium',
      delay: 1000
    });
    
    // Prefetch next page data
    this.advancedPrefetch.registerPrefetchPattern('ladder_near_page_end', {
      trigger: 'scroll_position',
      endpoints: ['/api/ladder/rankings'],
      priority: 'low',
      delay: 2000
    });
    
    // Prefetch adjacent game type data
    this.advancedPrefetch.registerPrefetchPattern('ladder_game_type_switch', {
      trigger: 'user_interaction',
      endpoints: [
        '/api/ladder/rankings',
        '/api/ladder/stats'
      ],
      priority: 'high',
      delay: 0
    });
    
    console.log('🧠 Ladder prefetching patterns configured');
  }

  async init() {
    console.log('🎯 Initializing Enhanced Ladder Manager...');
    
    // TEMPORARILY DISABLE PHASE 3 SERVICES TO DEBUG BASIC FUNCTIONALITY
    // await this.initializePhase3Services();
    
    // Align initial game type with saved GameTabs preference (default wc2)
    try {
      const saved = localStorage.getItem('selectedGame');
      if (saved && ['wc1','wc2','wc3'].includes(saved)) {
        this.currentGameType = saved;
      } else {
        this.currentGameType = 'wc2';
      }
      console.log('🎮 LadderManager initial gameType set to:', this.currentGameType);
    } catch (_) {
      this.currentGameType = 'wc2';
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
    
    await this.loadInitialData();
    this.isInitialized = true;
  }

  setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Check if game-tabs.js is already handling the tabs
    if (window.GameTabs) {
      console.log('🎮 Game-tabs.js detected, skipping LadderManager tab event listeners');
      // Don't set up tab event listeners if game-tabs.js is handling them
    } else {
      // Game type tab switching - handle all tabs
      const gameTabs = document.querySelectorAll('.game-tab');
      gameTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const gameType = e.currentTarget.dataset.gameType;
          console.log(`🎮 Tab clicked: ${gameType}`);
          
          // Update visual tab state first
          document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
          e.currentTarget.classList.add('active');
          
          if (gameType === 'wc1') {
            // Handle WC1 - show WC1 controls, hide WC2/WC3 controls
            this.deactivate();
            this.showWC1Controls();
          } else if (gameType === 'wc2' || gameType === 'wc3') {
            // Handle WC2/WC3 - show WC2/WC3 controls, hide WC1 controls
            this.activate();
            this.hideWC1Controls();
            this.switchGameType(gameType);
          }
        });
      });
    }

    // Player search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('player-search');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => this.searchPlayers());
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.searchPlayers();
      });
      
      searchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (clearSearchBtn) {
          clearSearchBtn.style.display = value.length > 0 ? 'flex' : 'none';
        }
        
        if (value === '') {
          this.searchQuery = '';
          this.currentPage = 1;
          this.loadLeaderboard();
        }
      });
      
      if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
        clearSearchBtn.addEventListener('click', () => {
          searchInput.value = '';
          clearSearchBtn.style.display = 'none';
          this.searchQuery = '';
          this.currentPage = 1;
          this.loadLeaderboard();
          searchInput.focus();
        });
      }
    }

    // Map search functionality
    const mapSearchBtn = document.getElementById('map-search-btn');
    const mapSearchInput = document.getElementById('map-search');
    
    if (mapSearchBtn && mapSearchInput) {
      mapSearchBtn.addEventListener('click', () => this.searchByMap());
      mapSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.searchByMap();
      });
      
      mapSearchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        
        if (value === '') {
          this.mapSearch = '';
          this.currentPage = 1;
          this.loadLeaderboard();
        }
      });
    }

    // Match type filter buttons - handle both WC2/WC3 and WC1 controls
    const wc2wc3Controls = document.getElementById('wc2-wc3-controls');
    if (wc2wc3Controls) {
      const filterButtons = wc2wc3Controls.querySelectorAll('.filter-btn');
      filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => this.filterByMatchType(e.target.dataset.matchType));
      });
    }
    
    // Also handle WC1 filter buttons when they're visible
    const wc1Controls = document.getElementById('wc1-controls');
    if (wc1Controls) {
      const wc1FilterButtons = wc1Controls.querySelectorAll('.filter-btn');
      wc1FilterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => this.filterByMatchType(e.target.dataset.matchType));
      });
    }

    // Pagination
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());

    // Report match functionality
    const reportBtn = document.getElementById('report-match-btn');
    if (reportBtn) {
      // Avoid duplicate handlers: if ReportMatch module is present, let it handle the click
      if (!(window.reportMatch && typeof window.reportMatch.openReportModal === 'function')) {
        if (!reportBtn.dataset.reportHandlerAttached) {
          reportBtn.addEventListener('click', () => this.openReportModal());
          reportBtn.dataset.reportHandlerAttached = '1';
        }
      }
    }

    // Modal functionality - be more specific to avoid conflicts
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        // Only handle modals that are not managed by ArenaTournamentManager
        if (modal && modal.id !== 'ranks-modal' && modal.id !== 'create-tournament-modal') {
          this.closeModal(modal);
        }
      });
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        // Only handle modals that are not managed by ArenaTournamentManager
        if (modal.id !== 'ranks-modal' && modal.id !== 'create-tournament-modal') {
          if (e.target === modal || e.target.classList.contains('modal-overlay')) {
            this.closeModal(modal);
          }
        }
      });
    });

    console.log('✅ Enhanced event listeners set up');
  }

  async loadInitialData() {
    try {
      console.log('🚀 Loading initial ladder data with progressive loading...');
      console.log('🎮 Current game type:', this.currentGameType);
      
      // PHASE 2 OPTIMIZATION: Use ProgressiveLoadingService for intelligent loading
      if (window.ProgressiveLoadingService) {
        console.log('🎯 Using ProgressiveLoadingService for optimized data loading');
        
        try {
          // Initialize progressive loading for current game type
          // This already loads the critical data (leaderboard)
          const leaderboardData = await window.ProgressiveLoadingService.initializeGameType(this.currentGameType);
          console.log('📊 Progressive loading init result:', leaderboardData);
          
          if (leaderboardData) {
            this.leaderboardData = leaderboardData;
            // Extract players array from leaderboard data
            const players = leaderboardData.players || leaderboardData;
            console.log('👥 Players to display:', players);
            this.displayLeaderboard(players);
          } else {
            console.warn('⚠️ No leaderboard data received from ProgressiveLoadingService, falling back to direct loading');
            // Fallback to direct loading if ProgressiveLoadingService didn't return data
            await this.loadLeaderboard();}
          
          console.log('✅ Progressive loading initialized successfully');
        } catch (error) {
          console.error('❌ ProgressiveLoadingService failed, falling back to direct loading:', error);
          await this.loadLeaderboard();
        }
      } else {
        console.log('⚠️ ProgressiveLoadingService not available, falling back to parallel loading');
        
        // Fallback to original parallel loading
        const [leaderboardResult, statsResult, ranksResult] = await Promise.allSettled([
          this.loadLeaderboard(),
          this.loadStats(),
          this.loadRanks()
        ]);

        // Handle results
        if (leaderboardResult.status === 'fulfilled') {
          console.log('✅ Leaderboard loaded successfully');
        } else {
          console.error('❌ Failed to load leaderboard:', leaderboardResult.reason);
        }

        if (statsResult.status === 'fulfilled') {
          console.log('✅ Stats loaded successfully');
        } else {
          console.error('❌ Failed to load stats:', statsResult.reason);
        }

        if (ranksResult.status === 'fulfilled') {
          console.log('✅ Ranks loaded successfully');
        } else {
          console.error('❌ Failed to load ranks:', ranksResult.reason);
        }
      }

    } catch (error) {
      console.error('❌ Error loading initial data:', error);
    }
  }

  async switchGameType(gameType) {
    // Ensure we use the correct gameType format for the backend API
    // Use game type directly (no mapping needed)
    const apiGameType = gameType;
    
    console.log(`🎮 LadderManager: Switching from ${this.currentGameType} to ${apiGameType}`);
    
    if (this.currentGameType === apiGameType && this.isActive) {
      console.log('🎮 Already on the same game type and active, skipping switch');
      return;}
    
    this.currentGameType = apiGameType;
    this.currentPage = 1; // Reset to first page
    this.searchQuery = ''; // Clear search
    this.mapSearch = ''; // Clear map filter
    
    // Clear current data
    this.players = [];
    
    // Clear search inputs
    const searchInput = document.getElementById('player-search');
    const mapSearchInput = document.getElementById('map-search');
    if (searchInput) searchInput.value = '';
    if (mapSearchInput) mapSearchInput.value = '';
    
    // Show WC2/WC3 controls and hide any WC1-specific controls
    this.showControls();
    
    // Update UI immediately
    this.updateGameTypeDisplay();
    
    // PHASE 2 OPTIMIZATION: Use progressive loading when switching game types
    if (window.ProgressiveLoadingService) {
      console.log(`🎯 Switching to progressive loading for ${apiGameType}`);
      
      // Clear previous game type data
      window.ProgressiveLoadingService.clearGameType(this.currentGameType);
      
      // Initialize progressive loading for new game type
      await window.ProgressiveLoadingService.initializeGameType(apiGameType);
      
      // Get the leaderboard data that was loaded
      const leaderboardData = await window.ProgressiveLoadingService.loadWithPriority(
        apiGameType, 
        'CRITICAL'
      );
      
      if (leaderboardData) {
        this.leaderboardData = leaderboardData;
        // Extract players array from leaderboard data
        const players = leaderboardData.players || leaderboardData;
        this.displayLeaderboard(players);
      }
    } else {
      // Fallback to original method
      await this.loadInitialData();
    }
  }

  /**
   * Show WC2/WC3 controls with consistent horizontal styling
   */
  showControls() {
    const controls = document.getElementById('wc2-wc3-controls');
    if (controls) {
      controls.style.display = 'flex';
      
      // Ensure consistent styling through GameSwitchManager if available
      if (window.gameSwitchManager) {
        window.gameSwitchManager.applyConsistentControlsStyle(controls);
      }
    }
  }

  async loadLeaderboard(forceRefresh = false) {
    const startTime = performance.now();
    const cacheKey = `leaderboard_${this.currentGameType}_${this.currentMatchType}_${this.currentPage}`;
    
    // TEMPORARILY DISABLE PHASE 3 OPTIMIZATIONS TO DEBUG BASIC FUNCTIONALITY
    // PHASE 3 OPTIMIZATION: Use advanced caching if available
    /*
    if (!forceRefresh && this.advancedCache) {
      const cachedData = this.advancedCache.get(cacheKey);
      if (cachedData) {
        console.log('🔥 Using advanced cached leaderboard data');
        this.leaderboardData = cachedData;
        // Extract players array from cached data
        const cachedPlayers = cachedData.players || cachedData;
        this.displayLeaderboard(cachedPlayers);
        
        // Track cache hit performance
        if (this.performanceMonitor) {
          this.performanceMonitor.trackCustomMetric('ladder_cache_hit_rate', 100);
        }
        
        return;}
    }
    */
    
    // Fallback to basic cache check
    if (!forceRefresh && this.isDataCached(cacheKey)) {
      console.log('📋 Using basic cached leaderboard data');
      // Extract players array from cached data
      const cachedPlayers = this.leaderboardData.players || this.leaderboardData;
      this.displayLeaderboard(cachedPlayers);
      return;}

    if (this.isLoading) {
      console.log('⏳ Leaderboard already loading, skipping duplicate request');
      return;}

    this.isLoading = true;
    
    try {
      console.log('🔄 Loading leaderboard data...');
      
      // PHASE 3 OPTIMIZATION: Track request start
      if (this.performanceMonitor) {
        this.performanceMonitor.trackCustomMetric('ladder_page_load_time', 0);
      }
      
      const params = new URLSearchParams({
        gameType: this.currentGameType,
        matchType: this.currentMatchType,
        limit: 10,
        page: this.currentPage
      });
      
      if (this.searchQuery) params.append('search', this.searchQuery);
      if (this.mapSearch) params.append('map', this.mapSearch);
      
      // Use the new API client for ladder rankings
      const data = await apiClient.getLadderRankings({
        game_type: this.currentGameType,
        match_type: this.currentMatchType,
        limit: 10,
        page: this.currentPage,
        search: this.searchQuery
      });
      console.log('📊 Leaderboard data received:', data);
      
      // TEMPORARILY DISABLE PHASE 3 OPTIMIZATIONS TO DEBUG BASIC FUNCTIONALITY
      /*
      // PHASE 3 OPTIMIZATION: Store in advanced cache with appropriate TTL
      if (this.advancedCache) {
        this.advancedCache.set(cacheKey, data, {
          ttl: 30000, // 30 seconds for rankings
          priority: 'high',
          size: JSON.stringify(data).length
        });
        console.log('🔥 Leaderboard data stored in advanced cache');
      }
      */
      
      // Cache the data (fallback)
      this.leaderboardData = data;
      this.updateCache(cacheKey, data);
      
      // TEMPORARILY DISABLE PHASE 3 OPTIMIZATIONS TO DEBUG BASIC FUNCTIONALITY
      /*
      // PHASE 3 OPTIMIZATION: Trigger intelligent prefetching
      if (this.advancedPrefetch) {
        this.triggerLeaderboardPrefetching(data);
      }
      
      // PHASE 3 OPTIMIZATION: Track successful load performance
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      if (this.performanceMonitor) {
        this.performanceMonitor.trackCustomMetric('ladder_page_load_time', loadTime);
        this.performanceMonitor.trackCustomMetric('ladder_data_freshness', 100);
      }
      
      console.log(`✅ Leaderboard loaded in ${loadTime.toFixed(2)}ms`);
      */
      
      // Extract players array from the API response
      const players = data.players || data;
      this.displayLeaderboard(players);
      console.log('✅ Leaderboard loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading leaderboard:', error);
      this.displayError('Failed to load leaderboard data');
      
      // PHASE 3 OPTIMIZATION: Track error performance
      if (this.performanceMonitor) {
        this.performanceMonitor.trackCustomMetric('ladder_data_freshness', 0);
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * PHASE 3 OPTIMIZATION: Trigger intelligent prefetching after leaderboard load
   */
  triggerLeaderboardPrefetching(data) {
    if (!this.advancedPrefetch) return;console.log('🧠 Triggering intelligent prefetching for leaderboard data');
    
    // Prefetch stats and recent matches
    this.advancedPrefetch.prefetchData('/api/ladder/rankings', {
      gameType: this.currentGameType
    }, {
      priority: 'medium',
      delay: 1000,
      reason: 'leaderboard_loaded'
    });
    
    this.advancedPrefetch.prefetchData('/api/ladder/recent-matches', {
      gameType: this.currentGameType
    }, {
      priority: 'low',
      delay: 2000,
      reason: 'leaderboard_loaded'
    });
    
    // Prefetch next page if available
    if (data && data.totalPages && this.currentPage < data.totalPages) {
      this.advancedPrefetch.prefetchData('/api/ladder/rankings', {
        gameType: this.currentGameType,
        matchType: this.currentMatchType,
        limit: 10,
        page: this.currentPage + 1
      }, {
        priority: 'low',
        delay: 3000,
        reason: 'next_page_prefetch'
      });
    }
    
    // Prefetch adjacent game type data
    this.prefetchAdjacentGameTypes();
  }

  /**
   * PHASE 3 OPTIMIZATION: Prefetch data for adjacent game types
   */
  prefetchAdjacentGameTypes() {
    if (!this.advancedPrefetch) return;const gameTypes = ['wc1', 'wc2', 'wc3'];
    const currentIndex = gameTypes.indexOf(this.currentGameType);
    
    if (currentIndex !== -1) {
      const adjacentTypes = [];
      if (currentIndex > 0) adjacentTypes.push(gameTypes[currentIndex - 1]);
      if (currentIndex < gameTypes.length - 1) adjacentTypes.push(gameTypes[currentIndex + 1]);
      
      adjacentTypes.forEach(gameType => {
        this.advancedPrefetch.prefetchData('/api/ladder/rankings', {
          gameType: gameType,
          matchType: 'all',
          limit: 10,
          page: 1
        }, {
          priority: 'low',
          delay: 5000,
          reason: 'adjacent_game_type_prefetch'
        });
      });
    }
  }

  displayLeaderboard(players) {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;if (!players || players.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="no-results">
            ${this.currentMatchType && this.currentMatchType !== 'all' ? 
              `No players found for ${this.currentMatchType} matches in ${this.gameConfigs[this.currentGameType].title}` :
              this.mapSearch ? 
                `No players found for map "${this.mapSearch}" in ${this.gameConfigs[this.currentGameType].title}` :
                `No players found in ${this.gameConfigs[this.currentGameType].title}`
            }
          </td>
        </tr>
      `;
      return;}

    const startRank = (this.currentPage - 1) * 10 + 1;
    
    tbody.innerHTML = players.map((player, index) => {
      const rank = startRank + index;
      const wins = player.stats?.wins || player.wins || 0;
      const losses = player.stats?.losses || player.losses || 0;
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
      const winRateClass = this.getWinRateClass(parseFloat(winRate));
      
      // Get race display for current game type
      const raceDisplay = this.formatRaceDisplay(player.preferredRace, this.currentGameType);
      
      return `
        <tr class="player-row" data-player-id="${player._id}">
          <td class="rank-cell">
            <div class="rank-info">
              <span class="rank-number">${rank}</span>
              ${player.rank ? `
                <div class="rank-badge">
                  <img src="${(player.rank.image && (player.rank.image.startsWith('/') || player.rank.image.startsWith('http')))
                    ? player.rank.image
                    : `/assets/img/ranks/${(player.rank.image || '').replace(/\s+/g, '').toLowerCase() || 'emblem.png'}`}" 
                       alt="${player.rank.name}" 
                       onerror="this.src='/assets/img/ranks/emblem.png';">
                </div>
              ` : ''}
            </div>
          </td>
          <td class="player-cell">
            <div class="player-info">
              <span class="player-name" onclick="window.ladderManager.showPlayerStats('${player.name}')">${player.name}</span>
            </div>
          </td>
          <td class="race-cell">${raceDisplay}</td>
          <td class="mmr-cell">
            <span class="mmr-value">${this.getDisplayMMR(player)}</span>
          </td>
          <td class="stats-cell">
            <div class="stats-info">
              <span class="wins">${wins}W</span>
              <span class="losses">${losses}L</span>
              <span class="win-rate ${winRateClass}">${winRate}%</span>
            </div>
          </td>
          <td class="games-cell">
            <span class="total-games">${totalGames}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  formatRaceDisplay(race, gameType) {
    const raceMap = {
      human: 'Human',
      orc: 'Orc',
      undead: 'Undead',
      night_elf: 'Night Elf',
      random: 'Random'
    };
    
    return raceMap[race] || race || 'Unknown';}

  getWinRateClass(winRate) {
    if (winRate >= 70) return 'excellent';if (winRate >= 60) return 'good';if (winRate >= 50) return 'average';if (winRate >= 40) return 'below-average';return 'poor';}

  getDisplayMMR(player) {
    // Debug logging
    console.log(`🔍 getDisplayMMR for ${player.name}:`);
    console.log(`  currentMatchType: ${this.currentMatchType}`);
    console.log(`  player.mmr: ${player.mmr}`);
    console.log(`  player.matchTypeStats:`, player.matchTypeStats);
    
    // If we're filtering by a specific match type, show match-type-specific MMR
    if (this.currentMatchType !== 'all' && player.matchTypeStats) {
      const mmr = player.matchTypeStats.mmr || player.mmr || 1500;
      console.log(`  → Using match-type MMR: ${mmr}`);
      return mmr;}
    
    // For 'all' match types or no match type stats, show overall MMR
    const mmr = player.mmr || 1500;
    console.log(`  → Using overall MMR: ${mmr}`);
    return mmr;}

  updateLeaderboardHeader(matchType, filterInfo) {
    // Update any header information based on current filters
    const gameConfig = this.gameConfigs[this.currentGameType];
    document.title = `WC Arena - ${gameConfig.title} Ladder`;
    
    // Update leaderboard title
    const leaderboardTitle = document.getElementById('leaderboard-title');
    if (leaderboardTitle) {
      leaderboardTitle.textContent = `${gameConfig.title} Leaderboard`;
    }
    
    // Update report button text
    const reportBtn = document.getElementById('report-match-text');
    if (reportBtn) {
      reportBtn.textContent = `REPORT ${gameConfig.title.toUpperCase()} MATCH`;
    }
  }

  async loadStats(forceRefresh = false) {
    // Check cache first
    const cacheKey = `stats_${this.currentGameType}`;
    if (!forceRefresh && this.isDataCached(cacheKey)) {
      console.log('📋 Using cached stats data');
      return;}

    try {
      console.log('📈 Loading stats data...');
      
      const data = await apiClient.getMatchStats({
        game_type: this.currentGameType
      });
      console.log('📊 Stats data received:', data);
      
      // Cache the data
      this.statsData = data;
      this.updateCache(cacheKey, data);
      
      // Only update stats display if it exists
      this.updateStatsDisplay(data);
      
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  }

  displayStats(stats) {
    this.updateOverviewStats(stats.overview);
    this.updateRaceStats(stats.races);
    this.updateMatchTypeStats(stats.matchTypes);
    this.createCharts(stats);
  }

  /**
   * Update stats display (alias for displayStats)
   */
  updateStatsDisplay(stats) {
    this.displayStats(stats);
  }

  updateRaceStats(races) {
    const racesList = document.getElementById('race-stats-list');
    if (!racesList || !races) return;const gameConfig = this.gameConfigs[this.currentGameType];
    if (!gameConfig || !gameConfig.races) {
      console.warn(`No race configuration found for game type: ${this.currentGameType}`);
      return;}
    
    const allowedRaces = gameConfig.races;
    
    racesList.innerHTML = allowedRaces.map(race => {
      const raceData = races[race] || { count: 0, percentage: 0 };
      const raceName = this.formatRaceDisplay(race, this.currentGameType);
      
      return `
        <li>
          <span class="stats-name">${raceName}</span>
          <span class="stats-value">${raceData.count}</span>
          <span class="stats-percentage">(${raceData.percentage}%)</span>
        </li>
      `;}).join('');
  }

  updateMatchTypeStats(matchTypes) {
    const modesList = document.getElementById('modes-stats-list');
    if (!modesList || !matchTypes) return;const modes = ['1v1', '2v2', '3v3', '4v4', 'ffa', 'vsai'];
    modesList.innerHTML = modes.map(mode => {
      const modeData = matchTypes[mode] || { count: 0, percentage: 0 };
      const modeName = mode === 'vsai' ? 'vs AI' : mode.toUpperCase();
      
      return `
        <li>
          <span class="stats-name">${modeName}</span>
          <span class="stats-value">${modeData.count}</span>
          <span class="stats-percentage">(${modeData.percentage}%)</span>
        </li>
      `;}).join('');
  }

  updateOverviewStats(overview) {
    if (!overview) return;console.log('📊 Overview stats:', overview);
  }

  async loadRecentMatches(forceRefresh = false) {
    try {
      console.log('🕒 Loading recent matches...');
      
      // Use shared RecentMatchesService instead of direct API call
      const data = await RecentMatchesService.getRecentMatchesSmart(this.currentGameType, 5);
      
      // Store data for display
      this.recentMatchesData = data;
      
      // Only update display if it exists
      if (this.updateRecentMatchesDisplay) {
        this.updateRecentMatchesDisplay(data);
      }
      
    } catch (error) {
      console.error('❌ Error loading recent matches:', error);
    }
  }

  displayRecentMatches(matches) {
    const container = document.getElementById('recent-matches-container');
    if (!container) return;if (!matches || matches.length === 0) {
      container.innerHTML = '<div class="no-matches">No recent matches</div>';
      return;}

    container.innerHTML = matches.map(match => `
      <div class="match-item">
        <div class="match-header">
          <span class="match-type">${match.matchType}</span>
          <span class="map">${match.map}</span>
        </div>
        <div class="match-players">
          ${match.players.map(player => `
            <span class="match-player ${player.result}">${player.name}</span>
          `).join(' vs ')}
        </div>
        <div class="match-time">${this.formatDate(match.createdAt || match.date)}</div>
      </div>
    `).join('');
  }

  /**
   * Update recent matches display (alias for displayRecentMatches)
   */
  updateRecentMatchesDisplay(matches) {
    this.displayRecentMatches(matches);
  }

  async loadRanks(forceRefresh = false) {
    try {
      console.log('🏆 Loading ranks data...');
      
      // Use shared RankService instead of direct API call
      const data = await RankService.getRanks(forceRefresh);
      
      // Store data for display
      this.ranksData = data;
      
      // Display ranks if display method exists
      if (this.displayRanks) {
        this.displayRanks(data);
      }
      
    } catch (error) {
      console.error('❌ Error loading ranks:', error);
    }
  }

  displayRanks(ranks) {
    const container = document.getElementById('ranks-container');
    if (!container || !ranks) return;const reversedRanks = [...ranks].reverse();
    
    container.innerHTML = reversedRanks.map(rank => {
      const rankImagePath = rank.image.startsWith('/') || rank.image.startsWith('http')
        ? rank.image
        : `/assets/img/ranks/${rank.image}`;
      
      return `
        <div class="rank-item">
          <img src="${rankImagePath}" 
               alt="${rank.name}" 
               class="rank-image" 
               onerror="this.style.display='none'">
          <div class="rank-details">
            <h4 class="rank-name">${rank.name}</h4>
            <p class="rank-threshold">${rank.threshold}+ MMR</p>
          </div>
        </div>
      `;}).join('');
  }

  /**
   * Update ranks display (alias for displayRanks)
   */
  updateRanksDisplay(ranks) {
    this.displayRanks(ranks);
  }

  // Search and filter methods
  searchPlayers() {
    const searchInput = document.getElementById('player-search');
    if (!searchInput) return;this.searchQuery = searchInput.value.trim();
    this.currentPage = 1;
    this.loadLeaderboard();
  }

  searchByMap() {
    const mapSearchInput = document.getElementById('map-search');
    if (!mapSearchInput) return;this.mapSearch = mapSearchInput.value.trim();
    this.currentPage = 1;
    this.loadLeaderboard();
  }

  filterByMatchType(matchType) {
    console.log(`🎯 Filtering by match type: ${matchType}, current game: ${this.currentGameType}`);
    
    // Handle WC1 filtering
    if (this.currentGameType === 'wc1') {
      console.log('🗡️ WC1 is active, handling WC1 filtering');
      this.currentMatchType = matchType;
      this.currentPage = 1;
      
      // Update active filter button for WC1 controls
      const wc1Controls = document.getElementById('wc1-controls');
      if (wc1Controls) {
        wc1Controls.querySelectorAll('.filter-btn').forEach(btn => {
          btn.classList.remove('active');
          if (btn.dataset.matchType === matchType) {
            btn.classList.add('active');
          }
        });
      }
      
      // For WC1, we might need to load different data or show different UI
      // For now, just update the state
      return;}
    
    // Handle WC2/WC3 filtering
    this.currentMatchType = matchType;
    this.currentPage = 1;
    
    // Update active filter button - only for WC2/WC3 controls
    const wc2wc3Controls = document.getElementById('wc2-wc3-controls');
    if (wc2wc3Controls) {
      wc2wc3Controls.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.matchType === matchType) {
          btn.classList.add('active');
        }
      });
    }
    
    this.loadLeaderboard();
  }

  // Pagination methods
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLeaderboard();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadLeaderboard();
    }
  }

  updatePagination(currentPage, totalPages) {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (pageInfo) {
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages;
    }
  }

  // Modal and utility methods
  openReportModal() {
    console.log(`🎯 Opening report modal for: ${this.currentGameType}, isActive: ${this.isActive}`);
    
    // WC1LadderManager removed - use default modal
    
    // Handle WC2/WC3 report modal
    console.log('🎮 Opening WC2/WC3 report modal');
    const modal = document.getElementById('report-match-modal');
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      
      // Check and populate tournament dropdown
      if (window.arenaTournamentManager) {
        window.arenaTournamentManager.checkAndPopulateTournamentDropdown(this.currentGameType);
      }
    } else {
      console.warn('Report match modal not found for', this.currentGameType);
    }
  }

  closeModal(modal) {
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = 'auto';
    }
  }

  async showPlayerStats(playerName) {
    console.log('🎯 LadderManager.showPlayerStats called for:', playerName);
    
    // Wait for player modal functions to be available
    let attempts = 0;
    const maxAttempts = 200; // Wait up to 20 seconds
    
    while (attempts < maxAttempts) {
      if (window.showPlayerDetails || window.openPlayerDetailsModal || window.handlePlayerClick) {
        console.log('✅ Player modal functions found, proceeding with initialization');
        break;
      }
      
      if (attempts % 20 === 0) {
        console.log(`⏳ Still waiting for player modal functions... (attempt ${attempts}/${maxAttempts})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.warn('⚠️ Player modal functions not available after waiting, proceeding anyway');
    }
    
    // Also wait for ModalManager to be properly initialized with createModal method
    attempts = 0;
    while (attempts < maxAttempts) {
      if (window.ModalManager && typeof window.ModalManager.createModal === 'function') {
        console.log('✅ ModalManager with createModal method found');
        break;
      }
      
      if (attempts % 20 === 0) {
        console.log(`⏳ Waiting for ModalManager with createModal method... (attempt ${attempts}/${maxAttempts})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.warn('⚠️ ModalManager with createModal method not available after waiting');
    }
    
    // Try to open player modal with available functions
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
        console.error('❌ No player modal functions available');
        // Fallback: show simple alert
        alert(`Player: ${playerName}\n\nPlayer modal not available. Please refresh the page.`);
      }
    } catch (error) {
      console.error('❌ Error opening player modal:', error);
      alert(`Unable to open player profile for ${playerName}. Please try again.`);
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';if (diffMins < 60) return `${diffMins}m ago`;if (diffHours < 24) return `${diffHours}h ago`;if (diffDays < 7) return `${diffDays}d ago`;return date.toLocaleDateString();}

  createCharts(stats) {
    // Destroy existing charts
    Object.values(this.chartInstances).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.chartInstances = {};

    // Create race distribution chart
    if (stats.races) {
      this.createRaceChart(stats.races);
    }

    // Create match type distribution chart
    if (stats.matchTypes) {
      this.createMatchTypeChart(stats.matchTypes);
    }
  }

  createRaceChart(raceData) {
    const canvas = document.getElementById('race-chart');
    if (!canvas || !window.Chart) return;const gameConfig = this.gameConfigs[this.currentGameType];
    const data = gameConfig.races.map(race => raceData[race]?.count || 0);
    const labels = gameConfig.races.map(race => this.formatRaceDisplay(race, this.currentGameType));

    this.chartInstances.raceChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(218, 165, 32, 0.8)',
            'rgba(220, 20, 60, 0.8)',
            'rgba(128, 0, 128, 0.8)',
            'rgba(34, 139, 34, 0.8)'
          ],
          borderColor: [
            'rgba(218, 165, 32, 1)',
            'rgba(220, 20, 60, 1)',
            'rgba(128, 0, 128, 1)',
            'rgba(34, 139, 34, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  createMatchTypeChart(matchTypeData) {
    const canvas = document.getElementById('match-type-chart');
    if (!canvas || !window.Chart) return;const modes = ['1v1', '2v2', '3v3', '4v4', 'ffa', 'vsai'];
    const data = modes.map(mode => matchTypeData[mode]?.count || 0);
    const labels = modes.map(mode => mode === 'vsai' ? 'vs AI' : mode.toUpperCase());

    this.chartInstances.matchTypeChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: 'rgba(218, 165, 32, 0.8)',
          borderColor: 'rgba(218, 165, 32, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#ddd'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#ddd'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
  }

  updateGameTypeDisplay() {
    // Update any UI elements that show the current game type
    const gameConfig = this.gameConfigs[this.currentGameType];
    if (!gameConfig) return;document.title = `WC Arena - ${gameConfig.fullTitle} Ladder`;
    
    // Update leaderboard title
    const leaderboardTitle = document.getElementById('leaderboard-title');
    if (leaderboardTitle) {
      leaderboardTitle.textContent = `${gameConfig.fullTitle} Leaderboard`;
    }
    
    // Update report button text
    const reportBtn = document.getElementById('report-match-text');
    if (reportBtn) {
      reportBtn.textContent = `REPORT ${gameConfig.title.toUpperCase()} MATCH`;
    }
    
    console.log(`✅ Updated display for ${gameConfig.fullTitle}`);
  }

  /**
   * Show error message to user instead of mock data
   */
  showErrorMessage(message) {
    const tbody = document.getElementById('leaderboard-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="error-message">
            <div class="error-content">
              <i class="fas fa-exclamation-triangle"></i>
              <span>${message}</span>
              <button onclick="ladderManager.loadInitialData()" class="retry-btn">
                <i class="fas fa-refresh"></i> Retry
              </button>
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Display error message (alias for showErrorMessage)
   */
  displayError(message) {
    this.showErrorMessage(message);
  }

  /**
   * Show WC1 controls and hide WC2/WC3 controls
   */
  showWC1Controls() {
    console.log('🗡️ Showing WC1 controls...');
    const wc1Controls = document.getElementById('wc1-controls');
    const wc2wc3Controls = document.getElementById('wc2-wc3-controls');
    
    if (wc1Controls) wc1Controls.style.display = 'flex';
    if (wc2wc3Controls) wc2wc3Controls.style.display = 'none';
  }

  /**
   * Hide WC1 controls and show WC2/WC3 controls
   */
  hideWC1Controls() {
    console.log('🎮 Hiding WC1 controls...');
    const wc1Controls = document.getElementById('wc1-controls');
    const wc2wc3Controls = document.getElementById('wc2-wc3-controls');
    
    if (wc1Controls) wc1Controls.style.display = 'none';
    if (wc2wc3Controls) wc2wc3Controls.style.display = 'flex';
  }

  /**
   * Deactivate this manager (used when switching to WC1)
   */
  deactivate() {
    console.log('🔽 LadderManager deactivating for WC1');
    this.isActive = false;
  }

  /**
   * Activate this manager (used when switching back from WC1)
   */
  activate() {
    console.log('🔼 LadderManager activating');
    this.isActive = true;
    
    // Restore filter button states for WC2/WC3
    this.filterByMatchType(this.currentMatchType);
    
    // Reload content when reactivating
    this.loadInitialData();
  }

  // Cache management methods
  isDataCached(cacheKey) {
    const cached = this.lastFetchTime[cacheKey];
    return cached && (Date.now() - cached) < this.cacheExpiry;}

  updateCache(cacheKey, data) {
    this.lastFetchTime[cacheKey] = Date.now();
  }

  // Optimized refresh method
  async refreshData(forceRefresh = false) {
    console.log('🔄 Refreshing ladder data...');
    
    // Only refresh what's actually needed
    if (forceRefresh || !this.leaderboardData) {
      await this.loadLeaderboard(forceRefresh);
    }
    
    // Stats and ranks don't change frequently, so refresh less often
    if (forceRefresh || !this.statsData) {
      await this.loadStats(forceRefresh);
    }
    
    if (forceRefresh || !this.ranksData) {
      await this.loadRanks(forceRefresh);
    }
  }

  /**
   * PHASE 3 OPTIMIZATION: Get comprehensive performance statistics
   */
  getPerformanceStats() {
    const stats = {
      advancedServices: {
        cache: !!this.advancedCache,
        prefetch: !!this.advancedPrefetch,
        monitor: !!this.performanceMonitor
      },
      cache: null,
      prefetch: null,
      performance: null,
      timestamp: new Date().toISOString()
    };
    
    // Get advanced cache statistics
    if (this.advancedCache) {
      stats.cache = {
        type: 'advanced',
        stats: this.advancedCache.getCacheStats(),
        efficiency: this.advancedCache.calculateCacheEfficiency(),
        status: this.advancedCache.getStatus()
      };
    }
    
    // Get advanced prefetch statistics
    if (this.advancedPrefetch) {
      stats.prefetch = {
        status: this.advancedPrefetch.getStatus(),
        metrics: this.advancedPrefetch.getPerformanceMetrics(),
        predictions: this.advancedPrefetch.getMLPredictions()
      };
    }
    
    // Get performance monitoring statistics
    if (this.performanceMonitor) {
      stats.performance = {
        metrics: this.performanceMonitor.getMetrics(),
        alerts: this.performanceMonitor.getAlerts(),
        customMetrics: this.performanceMonitor.getCustomMetrics()
      };
    }
    
    return stats;}

  /**
   * PHASE 3 OPTIMIZATION: Get cache efficiency and recommendations
   */
  getCacheRecommendations() {
    if (!this.advancedCache) return null;const efficiency = this.advancedCache.calculateCacheEfficiency();
    const stats = this.advancedCache.getCacheStats();
    const recommendations = [];
    
    if (efficiency < 0.6) {
      recommendations.push({
        type: 'critical',
        message: 'Cache efficiency is low. Consider increasing cache size or TTL.',
        action: 'increase_cache_size'
      });
    }
    
    if (stats.evictions > stats.hits * 0.3) {
      recommendations.push({
        type: 'warning',
        message: 'High cache eviction rate. Data may be expiring too quickly.',
        action: 'increase_ttl'
      });
    }
    
    if (stats.misses > stats.hits * 0.5) {
      recommendations.push({
        type: 'info',
        message: 'High cache miss rate. Consider prefetching more data.',
        action: 'enable_prefetching'
      });
    }
    
    return {
      efficiency,
      stats,
      recommendations,
      timestamp: new Date().toISOString()
    };}

  /**
   * PHASE 3 OPTIMIZATION: Optimize services based on current performance
   */
  async optimizeServices() {
    console.log('⚡ Optimizing Phase 3 services...');
    
    try {
      // Optimize cache
      if (this.advancedCache) {
        await this.advancedCache.optimizeCache();
      }
      
      // Optimize prefetching
      if (this.advancedPrefetch) {
        this.advancedPrefetch.optimizePrefetching();
      }
      
      // Get optimization results
      const cacheRecs = this.getCacheRecommendations();
      const perfStats = this.getPerformanceStats();
      
      console.log('✅ Services optimization completed');
      
      return {
        cacheRecommendations: cacheRecs,
        performanceStats: perfStats,
        timestamp: new Date().toISOString()
      };} catch (error) {
      console.error('❌ Service optimization failed:', error);
      throw error;
    }
  }

  /**
   * PHASE 3 OPTIMIZATION: Clear all caches and reset services
   */
  async clearAllCaches() {
    console.log('🧹 Clearing all caches...');
    
    try {
      // Clear advanced cache
      if (this.advancedCache) {
        this.advancedCache.clear();
      }
      
      // Clear basic cache
      this.clearCache();
      
      // Clear prefetch cache
      if (this.advancedPrefetch) {
        this.advancedPrefetch.clearPrefetchCache();
      }
      
      console.log('✅ All caches cleared');
      
    } catch (error) {
      console.error('❌ Cache clearing failed:', error);
      throw error;
    }
  }

  /**
   * Clear basic cache
   */
  clearCache() {
    console.log('🧹 Clearing basic cache...');
    this.lastFetchTime = {};
    this.leaderboardData = null;
    this.statsData = null;
    this.recentMatchesData = null;
    this.ranksData = null;
    console.log('✅ Basic cache cleared');
  }

  /**
   * PHASE 3 OPTIMIZATION: Get service health status
   */
  getServiceHealth() {
    const health = {
      status: 'healthy',
      services: {},
      issues: [],
      timestamp: new Date().toISOString()
    };
    
    // Check advanced cache health
    if (this.advancedCache) {
      const cacheStatus = this.advancedCache.getStatus();
      health.services.cache = {
        status: cacheStatus.status,
        uptime: cacheStatus.uptime,
        efficiency: this.advancedCache.calculateCacheEfficiency()
      };
      
      if (cacheStatus.status !== 'active') {
        health.status = 'degraded';
        health.issues.push('Advanced cache service is not active');
      }
    }
    
    // Check advanced prefetch health
    if (this.advancedPrefetch) {
      const prefetchStatus = this.advancedPrefetch.getStatus();
      health.services.prefetch = {
        status: prefetchStatus.status,
        accuracy: prefetchStatus.accuracy,
        predictions: prefetchStatus.totalPredictions
      };
      
      if (prefetchStatus.status !== 'active') {
        health.status = 'degraded';
        health.issues.push('Advanced prefetch service is not active');
      }
    }
    
    // Check performance monitor health
    if (this.performanceMonitor) {
      const monitorStatus = this.performanceMonitor.getStatus();
      health.services.monitor = {
        status: monitorStatus.status,
        metrics: monitorStatus.totalMetrics,
        alerts: monitorStatus.totalAlerts
      };
      
      if (monitorStatus.status !== 'active') {
        health.status = 'degraded';
        health.issues.push('Performance monitor service is not active');
      }
    }
    
    return health;}

  /**
   * Show WC1 controls and hide WC2/WC3 controls
   */
  showWC1Controls() {
    const wc1Controls = document.getElementById('wc1-controls');
    const wc2wc3Controls = document.getElementById('wc2-wc3-controls');
    
    if (wc1Controls) wc1Controls.style.display = 'block';
    if (wc2wc3Controls) wc2wc3Controls.style.display = 'none';
    
    console.log('🎮 WC1 controls activated');
  }

  /**
   * Hide WC1 controls and show WC2/WC3 controls
   */
  hideWC1Controls() {
    const wc1Controls = document.getElementById('wc1-controls');
    const wc2wc3Controls = document.getElementById('wc2-wc3-controls');
    
    if (wc1Controls) wc1Controls.style.display = 'none';
    if (wc2wc3Controls) wc2wc3Controls.style.display = 'block';
    
    console.log('🎮 WC1 controls deactivated');
  }
}

// Initialize ladder manager and player manager when DOM is ready
let ladderManager;
let playerManager;

async function initLadderPage() {
  if (!ladderManager) {
    // Wait for player modal functions to be available before initializing
    console.log('⏳ Waiting for player modal functions to be available...');
    let attempts = 0;
    const maxAttempts = 200; // Wait up to 20 seconds
    
    while (attempts < maxAttempts) {
      if (window.showPlayerDetails || window.openPlayerDetailsModal || window.handlePlayerClick) {
        console.log('✅ Player modal functions found, proceeding with initialization');
        break;
      }
      
      if (attempts % 20 === 0) {
        console.log(`⏳ Still waiting for player modal functions... (attempt ${attempts}/${maxAttempts})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.warn('⚠️ Player modal functions not available after waiting, proceeding anyway');
    }
    
    // Also wait for ModalManager to be properly initialized with createModal method
    attempts = 0;
    while (attempts < maxAttempts) {
      if (window.ModalManager && typeof window.ModalManager.createModal === 'function') {
        console.log('✅ ModalManager with createModal method found, proceeding with initialization');
        break;
      }
      
      if (attempts % 20 === 0) {
        console.log(`⏳ Waiting for ModalManager with createModal method... (attempt ${attempts}/${maxAttempts})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.warn('⚠️ ModalManager with createModal method not available after waiting, proceeding anyway');
    }
    
    // Initialize UnifiedProfileManager instead of PlayerManager
    // Temporarily disabled to fix navbar
    /*
    try {
      const { unifiedProfileManager } = await import('/js/modules/UnifiedProfileManager.js');
      playerManager = unifiedProfileManager;
    } catch (error) {
      console.error('Failed to import UnifiedProfileManager in LadderManager:', error);
      // Use a minimal fallback
      playerManager = {
        currentUser: null,
        currentPlayers: new Map(),
        getUserPlayers: () => []
      };
    }
    */
    // Use a minimal fallback for now
    playerManager = {
      currentUser: null,
      currentPlayers: new Map(),
      getUserPlayers: () => []
    };
    window.playerManager = playerManager;
    
    // Then initialize LadderManager
    ladderManager = new LadderManager();
    window.ladderManager = ladderManager; // Make it globally accessible
    
    // Initialize the LadderManager to load initial data
    await ladderManager.init();
    
    console.log('✅ Ladder page initialized with all managers');
  }
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLadderPage);
} else {
  initLadderPage();
}

// Export for external use
export { initLadderPage }; 