/**
 * Ladder Bridge Module
 * Provides global functions and initialization for the ladder system
 */

class LadderBridge {
  constructor() {
    this.ladderAPI = null;
    this.ladderDisplay = null;
    this.ladderFilters = null;
    this.mapDetailsModal = null;
    this.ladderStats = null;
    this.playerManagement = null;
    this.recentMatches = null;
    this.reportMatch = null;
    this.currentGameType = 'warcraft2';
    this.modules = {};
    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the ladder bridge
   */
  async init() {
    if (this.initialized) {
      console.log('🌉 Ladder Bridge already initialized, skipping...');
      return;}

    if (this.initializationPromise) {
      console.log('🌉 Ladder Bridge initialization in progress, waiting...');
      return await this.initializationPromise;}

    this.initializationPromise = this._doInit();
    
    try {
      await this.initializationPromise;
      this.initialized = true;
      console.log('✅ Ladder Bridge initialized successfully');
    } catch (error) {
      console.error('❌ Ladder Bridge initialization failed:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Actual initialization logic
   */
  async _doInit() {
    console.log('🌉 Initializing Ladder Bridge...');

    await this.waitForDependencies();

    await this.initializeModules();

    this.createGlobalFunctions();
  }

  /**
   * Initialize all ladder modules
   */
  async initializeModules() {
    this.ladderAPI = window.ladderAPI;

    const modules = [
      { name: 'LadderDisplay', class: window.LadderDisplay, property: 'ladderDisplay' },
      { name: 'LadderFilters', class: window.LadderFilters, property: 'ladderFilters' },
      { name: 'MapDetailsModal', class: window.MapDetailsModal, property: 'mapDetailsModal' },
      { name: 'LadderStats', class: window.LadderStats, property: 'ladderStats' },
      { name: 'PlayerManagement', class: window.PlayerManagement, property: 'playerManagement' },
      { name: 'RecentMatches', class: window.RecentMatches, property: 'recentMatches' },
      { name: 'ReportMatch', class: window.ReportMatch, property: 'reportMatch' }
    ];

    for (const { name, class: ModuleClass, property } of modules) {
      try {
        if (ModuleClass) {
          this.modules[property] = new ModuleClass();
          if (typeof this.modules[property].init === 'function') {
            await this.modules[property].init();
          }
          console.log(`✅ ${name} initialized`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${name}:`, error);
      }
    }
  }

  /**
   * Wait for required dependencies to load
   */
  async waitForDependencies() {
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (window.ladderAPI && window.LadderDisplay && window.LadderFilters && 
          window.LadderStats && window.PlayerManagement && window.RecentMatches && 
          window.ReportMatch) {
        console.log('✅ All ladder dependencies loaded');
        return;}

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Timed out waiting for ladder dependencies');
  }

  /**
   * Create global functions for backward compatibility
   */
  createGlobalFunctions() {
    window.loadLeaderboard = this.createLeaderboardFunction();
    
    window.loadRanks = this.createRanksFunction();
    window.loadRecentMatches = this.createRecentMatchesFunction();
    window.loadGlobalStats = this.createGlobalStatsFunction();
    window.refreshStats = this.createRefreshStatsFunction();
    
    window.setLadderGameType = this.createGameTypeFunction();
    
    window.refreshLadderData = this.createRefreshFunction();

    console.log('✅ Global ladder functions created');
  }

  /**
   * Create the main loadLeaderboard function
   */
  createLeaderboardFunction() {
    return async (matchType = 'all', page = 1, search = '', gameType = null) => {
      try {
        console.log('🔍 Loading leaderboard:', { matchType, page, search, gameType });const targetGameType = gameType || this.currentGameType;

        if (this.modules.ladderDisplay?.updatePaginationState) {
          this.modules.ladderDisplay.updatePaginationState({
            currentPage: page,
            matchType: matchType,
            searchQuery: search
          });
        }

        this.modules.ladderDisplay?.showLoading();

        const data = await this.ladderAPI.loadLeaderboard(matchType, page, search, targetGameType);

        this.modules.ladderDisplay?.displayLeaderboard(data);

        console.log('✅ Leaderboard loaded successfully');
        return data;} catch (error) {
        console.error('❌ Error in loadLeaderboard:', error);
        this.modules.ladderDisplay?.showErrorMessage('Failed to load leaderboard data');
        throw error;
      }
    };
  }

  /**
   * Create the loadRanks function
   */
  createRanksFunction() {
    return async (gameType = null) => {
      try {
        const targetGameType = gameType || this.currentGameType;const data = await this.ladderAPI.loadRanks(targetGameType);
        
        this.modules.ladderDisplay?.displayRanks(data);
        
        return data;} catch (error) {
        console.error('❌ Error loading ranks:', error);
        throw error;
      }
    };
  }

  /**
   * Create the loadRecentMatches function
   */
  createRecentMatchesFunction() {
    return async (matchType = 'all', showLoading = true, gameType = null) => {
      try {
        const targetGameType = gameType || this.currentGameType;const data = await this.ladderAPI.loadRecentMatches(matchType, 1, targetGameType);
        
        console.log('📊 Recent matches loaded:', data);
        return data;} catch (error) {
        console.error('❌ Error loading recent matches:', error);
        throw error;
      }
    };
  }

  /**
   * Create global stats functions
   */
  createGlobalStatsFunction() {
    return async (gameType = null) => {
      if (this.modules.ladderStats?.loadGlobalStats) {
        return await this.modules.ladderStats.loadGlobalStats(gameType);}
      console.warn('⚠️ LadderStats module not available');
    };
  }

  createRefreshStatsFunction() {
    return async (gameType = null) => {
      if (this.modules.ladderStats?.refreshStats) {
        return await this.modules.ladderStats.refreshStats(gameType);}
      console.warn('⚠️ LadderStats module not available');
    };
  }

  /**
   * Create game type management function
   */
  createGameTypeFunction() {
    return (gameType) => {
      this.currentGameType = gameType;const modules = ['ladderStats', 'playerManagement'];
      modules.forEach(module => {
        if (this.modules[module]?.setGameType) {
          this.modules[module].setGameType(gameType);
        }
      });
      
      console.log('🎮 Ladder game type set to:', gameType);
    };
  }

  /**
   * Create refresh function for game switching
   */
  createRefreshFunction() {
    return async (gameType) => {
      console.log('🔄 Refreshing ladder data for game type:', gameType);try {
        if (!window.paginationState) {
          window.paginationState = {
            currentPage: 1,
            totalPages: 1,
            matchType: 'all',
            searchQuery: ''
          };
        }
        
        await window.loadLeaderboard('all', window.paginationState.currentPage, window.paginationState.searchQuery, gameType);
        
        if (window.loadRecentMatches) {
          await window.loadRecentMatches('all', false, gameType);
        }
        
        console.log(`✅ Refreshed ladder data for ${gameType}`);
      } catch (error) {
        console.error('❌ Error refreshing ladder data:', error);
      }
    };
  }

  /**
   * Get current game type
   */
  getCurrentGameType() {
    return this.currentGameType;}

  /**
   * Set current game type
   */
  setCurrentGameType(gameType) {
    this.currentGameType = gameType;
  }
}

window.LadderBridge = LadderBridge;

document.addEventListener('DOMContentLoaded', async () => {
  setTimeout(async () => {
    try {
      window.ladderBridge = new LadderBridge();
      await window.ladderBridge.init();
    } catch (error) {
      console.error('❌ Failed to initialize ladder bridge:', error);
    }
  }, 150);
}); 