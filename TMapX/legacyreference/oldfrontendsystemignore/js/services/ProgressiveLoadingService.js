/**
 * ProgressiveLoadingService - Implements progressive loading for ladder page
 * Loads critical data first, then enhances progressively
 */
class ProgressiveLoadingService {
  constructor() {
    this.loadingStates = new Map();
    this.loadingPriorities = {
      CRITICAL: 1,      // Leaderboard data
      HIGH: 2,          // Stats and ranks
      MEDIUM: 3,        // Recent matches
      LOW: 4,           // Tournament data
      LAZY: 5           // WC1 data (only when needed)
    };
    
    this.loadingQueue = [];
    this.isProcessing = false;
    this.maxConcurrent = 2; // Max concurrent API calls
    this.activeLoads = 0;
    
    // PHASE 2 OPTIMIZATION: Data prefetching configuration
    this.prefetchConfig = {
      enabled: true,
      adjacentGameTypes: true,    // Prefetch data for adjacent game types
      smartPrefetch: true,        // Use smart prefetching based on user behavior
      prefetchDelay: 2000,        // Delay before starting prefetch (2 seconds)
      maxPrefetchConcurrent: 1    // Max concurrent prefetch operations
    };
    
    this.prefetchTimers = new Map();
    this.prefetchStates = new Map();
    this.userBehavior = {
      lastGameType: null,
      gameTypeSwitches: 0,
      averageTimeOnGameType: 0
    };
  }

  /**
   * Initialize progressive loading for a specific game type
   */
  async initializeGameType(gameType) {
    console.log(`🚀 Initializing progressive loading for ${gameType}`);
    
    // Reset loading states for this game type
    this.loadingStates.set(gameType, {
      critical: false,
      high: false,
      medium: false,
      low: false,
      lazy: false
    });

    // Start with critical data (leaderboard)
    console.log(`🎯 Loading critical data for ${gameType}...`);
    const criticalData = await this.loadWithPriority(gameType, 'CRITICAL');
    
    // Queue secondary data loading
    this.queueSecondaryData(gameType);
    
    // PHASE 2 OPTIMIZATION: Start intelligent prefetching
    this.startPrefetching(gameType);
    
    console.log(`✅ Progressive loading initialized for ${gameType}, critical data: ${criticalData ? 'loaded' : 'failed'}`);
    
    return criticalData;}

  /**
   * Load data with specific priority
   */
  async loadWithPriority(gameType, priority, dataType = null) {
    const priorityLevel = this.loadingPriorities[priority];
    if (!priorityLevel) {
      console.error(`❌ Invalid priority: ${priority}`);
      return;}

    const stateKey = this.getStateKey(priority, dataType);
    const currentState = this.loadingStates.get(gameType);
    
    if (currentState && currentState[stateKey]) {
      console.log(`📋 ${priority} data already loaded for ${gameType}`);
      return;}

    console.log(`🎯 Loading ${priority} priority data for ${gameType}...`);
    
    try {
      // Mark as loading
      if (currentState) {
        currentState[stateKey] = 'loading';
      }

      // Execute the load based on priority and data type
      const result = await this.executeLoad(gameType, priority, dataType);
      
      // Mark as loaded
      if (currentState) {
        currentState[stateKey] = true;
      }

      console.log(`✅ ${priority} priority data loaded for ${gameType}`);
      return result;} catch (error) {
      console.error(`❌ Failed to load ${priority} priority data for ${gameType}:`, error);
      
      // Mark as failed
      if (currentState) {
        currentState[stateKey] = 'failed';
      }
      
      throw error;
    }
  }

  /**
   * Execute the actual data loading based on priority
   */
  async executeLoad(gameType, priority, dataType) {
    switch (priority) {
      case 'CRITICAL':
        return this.loadCriticalData(gameType);case 'HIGH':
        return this.loadHighPriorityData(gameType, dataType);case 'MEDIUM':
        return this.loadMediumPriorityData(gameType, dataType);case 'LOW':
        return this.loadLowPriorityData(gameType, dataType);case 'LAZY':
        return this.loadLazyData(gameType, dataType);default:
        throw new Error(`Unknown priority: ${priority}`);
    }
  }

  /**
   * Load critical data (leaderboard)
   */
  async loadCriticalData(gameType) {
    console.log(`🎯 Loading critical leaderboard data for ${gameType}`);
    
    // Use LadderDataService for consistency
    if (window.LadderDataService) {
      return await window.LadderDataService.getData('/api/ladder/rankings', {
        gameType,
        limit: 10,
        page: 1
      });} else {
      // Fallback to direct fetch
      const response = await fetch(`/api/ladder/rankings?gameType=${gameType}&limit=10&page=1`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load leaderboard: ${response.status}`);
      }
      
      return await response.json();}
  }

  /**
   * Load high priority data (stats and ranks)
   */
  async loadHighPriorityData(gameType, dataType) {
    if (dataType === 'stats') {
      console.log(`📊 Loading stats for ${gameType}`);
      return await this.loadStats(gameType);} else if (dataType === 'ranks') {
      console.log(`🏆 Loading ranks for ${gameType}`);
      return await this.loadRanks(gameType);} else {
      // Load both if no specific type specified
      const [stats, ranks] = await Promise.allSettled([
        this.loadStats(gameType),
        this.loadRanks(gameType)
      ]);
      
      return {
        stats: stats.status === 'fulfilled' ? stats.value : null,
        ranks: ranks.status === 'fulfilled' ? ranks.value : null
      };}
  }

  /**
   * Load medium priority data (recent matches)
   */
  async loadMediumPriorityData(gameType, dataType) {
    console.log(`🕒 Loading recent matches for ${gameType}`);
    
    if (window.RecentMatchesService) {
      return await window.RecentMatchesService.getRecentMatches(gameType, 5);} else {
      // Fallback to direct fetch
      const response = await fetch(`/api/matches/recent?gameType=${gameType}&limit=5`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load recent matches: ${response.status}`);
      }
      
      return await response.json();}
  }

  /**
   * Load low priority data (tournaments)
   */
  async loadLowPriorityData(gameType, dataType) {
    console.log(`🏆 Loading tournaments for ${gameType}`);
    
    try {
      const response = await fetch('/api/tournaments', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load tournaments: ${response.status}`);
      }
      
      const tournaments = await response.json();
      
      // Ensure tournaments is an array and filter by game type
      if (Array.isArray(tournaments)) {
        return tournaments.filter(t => t.gameType === gameType);} else if (tournaments && Array.isArray(tournaments.tournaments)) {
        // Handle nested response format
        return tournaments.tournaments.filter(t => t.gameType === gameType);} else {
        console.warn('⚠️ Tournaments data is not in expected format:', tournaments);
        return [];}
    } catch (error) {
      console.warn('⚠️ Failed to load tournaments, returning empty array:', error);return [];}
  }

  /**
   * Load lazy data (WC1 specific data)
   */
  async loadLazyData(gameType, dataType) {
    if (gameType !== 'wc1') {
      console.log(`ℹ️ Lazy loading not applicable for ${gameType}`);
      return null;}

    console.log(`🗡️ Loading WC1 lazy data: ${dataType}`);
    
    switch (dataType) {
      case 'scenarios':
        return await this.loadWC1Scenarios();case 'userData':
        if (window.UserDataService) {
          return await window.UserDataService.getUserData();}
        return null;default:
        console.log(`ℹ️ Unknown WC1 data type: ${dataType}`);
        return null;}
  }

  /**
   * Load WC1 scenarios
   */
  async loadWC1Scenarios() {
    try {
      const response = await fetch('/api/wc1scenarios');
      if (response.ok) {
        return await response.json();} else {
        // Return fallback scenarios
        return this.getFallbackWC1Scenarios();}
    } catch (error) {
      console.warn('⚠️ Failed to load WC1 scenarios, using fallback:', error);
      return this.getFallbackWC1Scenarios();}
  }

  /**
   * Get fallback WC1 scenarios
   */
  getFallbackWC1Scenarios() {
    return [
      { name: 'Forest 1', category: 'forest' },
      { name: 'Forest 2', category: 'forest' },
      { name: 'Swamp 1', category: 'swamp' },
      { name: 'Swamp 2', category: 'swamp' },
      { name: 'Dungeon 1', category: 'dungeon' }
    ];}

  /**
   * Load stats data
   */
  async loadStats(gameType) {
    const response = await fetch(`/api/matches/stats?gameType=${gameType}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load stats: ${response.status}`);
    }
    
    return await response.json();}

  /**
   * Load ranks data
   */
  async loadRanks(gameType) {
    if (window.RankService) {
      return await window.RankService.getRanks();} else {
      // Fallback to direct fetch
      const response = await fetch('/api/ladder/ranks', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load ranks: ${response.status}`);
      }
      
      return await response.json();}
  }

  /**
   * Queue secondary data loading
   */
  queueSecondaryData(gameType) {
    // Queue high priority data
    this.addToQueue(gameType, 'HIGH', 'stats');
    this.addToQueue(gameType, 'HIGH', 'ranks');
    
    // Queue medium priority data
    this.addToQueue(gameType, 'MEDIUM', 'recentMatches');
    
    // Queue low priority data
    this.addToQueue(gameType, 'LOW', 'tournaments');
    
    // Process queue
    this.processQueue();
  }

  /**
   * Add item to loading queue
   */
  addToQueue(gameType, priority, dataType) {
    this.loadingQueue.push({
      gameType,
      priority,
      dataType,
      timestamp: Date.now()
    });
    
    // Sort by priority (lower number = higher priority)
    this.loadingQueue.sort((a, b) => {
      const priorityA = this.loadingPriorities[a.priority];
      const priorityB = this.loadingPriorities[b.priority];
      return priorityA - priorityB;});
  }

  /**
   * Process the loading queue
   */
  async processQueue() {
    if (this.isProcessing || this.activeLoads >= this.maxConcurrent) {
      return;}

    this.isProcessing = true;
    
    while (this.loadingQueue.length > 0 && this.activeLoads < this.maxConcurrent) {
      const item = this.loadingQueue.shift();
      this.activeLoads++;
      
      // Process item in background
      this.processQueueItem(item).finally(() => {
        this.activeLoads--;
        this.processQueue(); // Continue processing
      });
    }
    
    this.isProcessing = false;
  }

  /**
   * Process a single queue item
   */
  async processQueueItem(item) {
    try {
      console.log(`🔄 Processing queue item: ${item.priority} priority ${item.dataType} for ${item.gameType}`);
      
      await this.loadWithPriority(item.gameType, item.priority, item.dataType);
      
    } catch (error) {
      console.error(`❌ Failed to process queue item:`, error);
    }
  }

  /**
   * Get loading state for a game type
   */
  getLoadingState(gameType) {
    return this.loadingStates.get(gameType) || {};}

  /**
   * Check if specific data is loaded
   */
  isDataLoaded(gameType, priority, dataType = null) {
    const state = this.getLoadingState(gameType);
    const stateKey = this.getStateKey(priority, dataType);
    return state[stateKey] === true;}

  /**
   * Check if data is currently loading
   */
  isDataLoading(gameType, priority, dataType = null) {
    const state = this.getLoadingState(gameType);
    const stateKey = this.getStateKey(priority, dataType);
    return state[stateKey] === 'loading';}

  /**
   * Get state key for tracking
   */
  getStateKey(priority, dataType) {
    if (dataType) {
      return `${priority.toLowerCase()}_${dataType}`;}
    return priority.toLowerCase();}

  /**
   * Force load specific data (for user interactions)
   */
  async forceLoad(gameType, priority, dataType = null) {
    console.log(`🚀 Force loading ${priority} priority data for ${gameType}`);
    return await this.loadWithPriority(gameType, priority, dataType);}

  /**
   * Clear loading states for a game type
   */
  clearGameType(gameType) {
    this.loadingStates.delete(gameType);
    console.log(`🧹 Cleared loading states for ${gameType}`);
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.loadingQueue.length,
      activeLoads: this.activeLoads,
      maxConcurrent: this.maxConcurrent,
      isProcessing: this.isProcessing
    };}

  /**
   * PHASE 2 OPTIMIZATION: Start intelligent prefetching for a game type
   */
  startPrefetching(gameType) {
    if (!this.prefetchConfig.enabled) {
      console.log(`ℹ️ Prefetching disabled for ${gameType}`);
      return;}

    console.log(`🚀 Starting intelligent prefetching for ${gameType}`);

    // Clear any existing prefetch timer
    if (this.prefetchTimers.has(gameType)) {
      clearTimeout(this.prefetchTimers.get(gameType));
    }

    // Start prefetching after a delay to avoid interfering with critical data loading
    const prefetchTimer = setTimeout(() => {
      this.executePrefetching(gameType);
    }, this.prefetchConfig.prefetchDelay);

    this.prefetchTimers.set(gameType, prefetchTimer);
    console.log(`⏰ Prefetching scheduled for ${gameType} in ${this.prefetchConfig.prefetchDelay}ms`);
  }

  /**
   * Execute the actual prefetching logic
   */
  async executePrefetching(gameType) {
    if (!this.prefetchConfig.enabled) return;console.log(`🎯 Executing prefetching for ${gameType}`);

    try {
      // Mark prefetch as in progress
      this.prefetchStates.set(gameType, 'prefetching');

      // 1. Prefetch adjacent game types (smart navigation)
      if (this.prefetchConfig.adjacentGameTypes) {
        await this.prefetchAdjacentGameTypes(gameType);
      }

      // 2. Smart prefetching based on user behavior
      if (this.prefetchConfig.smartPrefetch) {
        await this.smartPrefetch(gameType);
      }

      // Mark prefetch as completed
      this.prefetchStates.set(gameType, 'completed');
      console.log(`✅ Prefetching completed for ${gameType}`);

    } catch (error) {
      console.warn(`⚠️ Prefetching failed for ${gameType}:`, error);
      this.prefetchStates.set(gameType, 'failed');
    }
  }

  /**
   * Prefetch data for adjacent game types
   */
  async prefetchAdjacentGameTypes(currentGameType) {
    const gameTypeOrder = ['wc1', 'wc2', 'wc3'];
    const currentIndex = gameTypeOrder.indexOf(currentGameType);
    
    if (currentIndex === -1) return;console.log(`🔄 Prefetching adjacent game types for ${currentGameType}`);

    // Prefetch the next game type in sequence
    const nextGameType = gameTypeOrder[currentIndex + 1];
    if (nextGameType && !this.isDataLoaded(nextGameType, 'CRITICAL')) {
      console.log(`⏭️ Prefetching next game type: ${nextGameType}`);
      this.queuePrefetchItem(nextGameType, 'CRITICAL');
    }

    // Prefetch the previous game type in sequence
    const prevGameType = gameTypeOrder[currentIndex - 1];
    if (prevGameType && !this.isDataLoaded(prevGameType, 'CRITICAL')) {
      console.log(`⏮️ Prefetching previous game type: ${prevGameType}`);
      this.queuePrefetchItem(prevGameType, 'CRITICAL');
    }
  }

  /**
   * Smart prefetching based on user behavior patterns
   */
  async smartPrefetch(gameType) {
    console.log(`🧠 Executing smart prefetching for ${gameType}`);

    // Update user behavior tracking
    this.updateUserBehavior(gameType);

    // If user switches game types frequently, prefetch more aggressively
    if (this.userBehavior.gameTypeSwitches > 2) {
      console.log(`🚀 User switches frequently, aggressive prefetching for ${gameType}`);
      await this.aggressivePrefetch(gameType);
    } else {
      console.log(`🐌 User stays on game types, conservative prefetching for ${gameType}`);
      await this.conservativePrefetch(gameType);
    }
  }

  /**
   * Aggressive prefetching for frequent switchers
   */
  async aggressivePrefetch(gameType) {
    // Prefetch all game types with critical data
    const allGameTypes = ['wc1', 'wc2', 'wc3'];
    
    for (const gt of allGameTypes) {
      if (gt !== gameType && !this.isDataLoaded(gt, 'CRITICAL')) {
        console.log(`🚀 Aggressively prefetching ${gt}`);
        this.queuePrefetchItem(gt, 'CRITICAL');
        
        // Also prefetch high priority data for current game type
        if (gt === gameType) {
          this.queuePrefetchItem(gt, 'HIGH', 'stats');
          this.queuePrefetchItem(gt, 'HIGH', 'ranks');
        }
      }
    }
  }

  /**
   * Conservative prefetching for users who stay on game types
   */
  async conservativePrefetch(gameType) {
    // Only prefetch critical data for adjacent game types
    await this.prefetchAdjacentGameTypes(gameType);
    
    // Prefetch some medium priority data for current game type
    if (!this.isDataLoaded(gameType, 'MEDIUM', 'recentMatches')) {
      console.log(`🐌 Conservatively prefetching recent matches for ${gameType}`);
      this.queuePrefetchItem(gameType, 'MEDIUM', 'recentMatches');
    }
  }

  /**
   * Queue a prefetch item with lower priority than regular loading
   */
  queuePrefetchItem(gameType, priority, dataType = null) {
    // Add prefetch items to the end of the queue with lower priority
    this.loadingQueue.push({
      gameType,
      priority,
      dataType,
      timestamp: Date.now(),
      isPrefetch: true
    });

    console.log(`📋 Queued prefetch item: ${priority} priority ${dataType || 'all'} for ${gameType}`);
  }

  /**
   * Update user behavior tracking
   */
  updateUserBehavior(gameType) {
    const now = Date.now();
    
    if (this.userBehavior.lastGameType && this.userBehavior.lastGameType !== gameType) {
      this.userBehavior.gameTypeSwitches++;
      console.log(`🔄 User switched from ${this.userBehavior.lastGameType} to ${gameType} (switch #${this.userBehavior.gameTypeSwitches})`);
    }
    
    this.userBehavior.lastGameType = gameType;
  }

  /**
   * Get prefetch status for a game type
   */
  getPrefetchStatus(gameType) {
    return {
      status: this.prefetchStates.get(gameType) || 'not_started',
      hasTimer: this.prefetchTimers.has(gameType),
      userBehavior: { ...this.userBehavior }
    };}

  /**
   * Cancel prefetching for a game type
   */
  cancelPrefetching(gameType) {
    if (this.prefetchTimers.has(gameType)) {
      clearTimeout(this.prefetchTimers.get(gameType));
      this.prefetchTimers.delete(gameType);
      console.log(`❌ Cancelled prefetching for ${gameType}`);
    }
  }

  /**
   * Enable/disable prefetching
   */
  setPrefetchConfig(config) {
    this.prefetchConfig = { ...this.prefetchConfig, ...config };
    console.log(`⚙️ Updated prefetch config:`, this.prefetchConfig);
  }

  /**
   * Get comprehensive service status including prefetching
   */
  getFullStatus() {
    const baseStatus = this.getQueueStatus();
    const prefetchStatus = {};
    
    // Get prefetch status for all game types
    ['wc1', 'wc2', 'wc3'].forEach(gt => {
      prefetchStatus[gt] = this.getPrefetchStatus(gt);
    });

    return {
      ...baseStatus,
      prefetch: {
        config: this.prefetchConfig,
        status: prefetchStatus,
        userBehavior: this.userBehavior
      }
    };}
}

// Export a singleton instance of the service
// If an instance already exists (hot-reload/duplicate include), reuse it
try {
  if (
    window.ProgressiveLoadingService &&
    typeof window.ProgressiveLoadingService === 'object' &&
    typeof window.ProgressiveLoadingService.initializeGameType === 'function'
  ) {
    // Already an instance with the correct API; keep it
  } else {
    window.ProgressiveLoadingService = new ProgressiveLoadingService();
  }
} catch (e) {
  // In very early load phases window may not be writable; fall back
  window.ProgressiveLoadingService = new ProgressiveLoadingService();
}
