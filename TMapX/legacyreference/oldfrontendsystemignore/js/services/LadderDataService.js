/**
 * LadderDataService - Unified service for managing ladder data loading
 * Reduces redundant API calls and implements intelligent caching
 * Enhanced with AdvancedCacheService for superior performance
 */
class LadderDataService {
  constructor() {
    // Initialize advanced caching if available
    this.advancedCache = window.AdvancedCacheService || null;
    
    // Initialize advanced prefetching if available
    this.advancedPrefetch = window.AdvancedPrefetchService || null;
    
    // Initialize performance monitoring if available
    this.performanceMonitor = window.PerformanceMonitorService || null;
    
    // Fallback to basic caching if advanced cache not available
    if (!this.advancedCache) {
      console.log('⚠️ AdvancedCacheService not available, using basic caching');
      this.cache = new Map();
      this.cacheExpiry = 30000; // 30 seconds
    }
    
    this.pendingRequests = new Map();
    this.batchQueue = [];
    this.batchTimeout = null;
    this.batchDelay = 100; // 100ms batch window
    
    // Initialize advanced services if available
    if (this.advancedCache) {
      this.initializeAdvancedCache();
    }
    
    if (this.advancedPrefetch) {
      this.initializeAdvancedPrefetch();
    }
    
    if (this.performanceMonitor) {
      this.initializePerformanceMonitoring();
    }
  }

  /**
   * Initialize advanced cache with ladder-specific configurations
   */
  initializeAdvancedCache() {
    if (!this.advancedCache) return;this.advancedCache.updateConfig({
      criticalDataTTL: 60000, // 1 minute for critical data
      standardDataTTL: 30000, // 30 seconds for standard data
      lazyDataTTL: 15000,     // 15 seconds for lazy data
      maxCacheSize: 200,      // Larger cache for ladder data
      enableWarming: true,
      enableOffline: true
    });

    // Warm up cache with common ladder endpoints
    this.advancedCache.warmupCache([
      '/api/ladder/rankings',
      '/api/ladder/stats',
      '/api/ladder/recent-matches',
      '/api/ladder/ranks'
    ]);
    
    console.log('🔥 Advanced cache initialized for ladder data');
  }

  /**
   * Initialize advanced prefetching with ladder-specific configurations
   */
  initializeAdvancedPrefetch() {
    if (!this.advancedPrefetch) return;this.advancedPrefetch.updateConfig({
      maxConcurrentPrefetch: 3,
      prefetchDelay: 500,
      confidenceThreshold: 0.6,
      learningRate: 0.15
    });
    
    // Set up intelligent prefetching for common user flows
    this.setupIntelligentPrefetching();
    
    console.log('🧠 Advanced prefetching initialized for ladder data');
  }

  /**
   * Initialize performance monitoring for ladder data
   */
  initializePerformanceMonitoring() {
    if (!this.performanceMonitor) return;this.performanceMonitor.registerCustomMetric('ladder_data_load_time', {
      description: 'Time to load ladder data',
      unit: 'ms',
      category: 'data_loading'
    });
    
    this.performanceMonitor.registerCustomMetric('ladder_cache_hit_rate', {
      description: 'Cache hit rate for ladder data',
      unit: 'percentage',
      category: 'caching'
    });
    
    console.log('📊 Performance monitoring initialized for ladder data');
  }

  /**
   * Set up intelligent prefetching based on user behavior patterns
   */
  setupIntelligentPrefetching() {
    if (!this.advancedPrefetch) return;this.advancedPrefetch.registerPrefetchPattern('leaderboard_loaded', {
      trigger: 'after_data_load',
      endpoints: [
        '/api/ladder/stats',
        '/api/ladder/recent-matches'
      ],
      priority: 'medium',
      delay: 1000
    });
    
    // Prefetch next page data when user is near end of current page
    this.advancedPrefetch.registerPrefetchPattern('near_page_end', {
      trigger: 'scroll_position',
      endpoints: ['/api/ladder/rankings'],
      priority: 'low',
      delay: 2000
    });
    
    // Prefetch related game type data when switching game types
    this.advancedPrefetch.registerPrefetchPattern('game_type_switch', {
      trigger: 'user_interaction',
      endpoints: [
        '/api/ladder/rankings',
        '/api/ladder/stats'
      ],
      priority: 'high',
      delay: 0
    });
  }

  /**
   * Get data with intelligent caching and request deduplication
   */
  async getData(endpoint, params = {}, forceRefresh = false) {
    const cacheKey = this.generateCacheKey(endpoint, params);
    
    // Use advanced cache if available
    if (this.advancedCache) {
      const result = await this.getDataWithAdvancedCache(endpoint, params, cacheKey, forceRefresh);
      
      // Trigger intelligent prefetching after successful data load
      this.triggerIntelligentPrefetching(endpoint, params, result);
      
      return result;}
    
    // Fallback to basic caching
    const result = await this.getDataWithBasicCache(endpoint, params, cacheKey, forceRefresh);
    
    // Trigger intelligent prefetching after successful data load
    this.triggerIntelligentPrefetching(endpoint, params, result);
    
    return result;}

  /**
   * Trigger intelligent prefetching based on the current data load
   */
  triggerIntelligentPrefetching(endpoint, params, data) {
    if (!this.advancedPrefetch) return;const prefetchTargets = this.determinePrefetchTargets(endpoint, params, data);
    
    if (prefetchTargets.length > 0) {
      console.log(`🧠 Triggering intelligent prefetching for ${prefetchTargets.length} targets`);
      
      prefetchTargets.forEach(target => {
        this.advancedPrefetch.prefetchData(target.endpoint, target.params, {
          priority: target.priority,
          delay: target.delay,
          reason: target.reason
        });
      });
    }
  }

  /**
   * Determine what data should be prefetched based on current load
   */
  determinePrefetchTargets(endpoint, params, data) {
    const targets = [];
    
    // If loading leaderboard, prefetch stats and recent matches
    if (endpoint.includes('/rankings')) {
      targets.push({
        endpoint: '/api/ladder/stats',
        params: { gameType: params.gameType || 'wc3' },
        priority: 'medium',
        delay: 1000,
        reason: 'leaderboard_loaded'
      });
      
      targets.push({
        endpoint: '/api/ladder/recent-matches',
        params: { gameType: params.gameType || 'wc3' },
        priority: 'low',
        delay: 2000,
        reason: 'leaderboard_loaded'
      });
      
      // Prefetch next page if we have pagination data
      if (data && data.totalPages && params.page && params.page < data.totalPages) {
        targets.push({
          endpoint: '/api/ladder/rankings',
          params: { ...params, page: params.page + 1 },
          priority: 'low',
          delay: 3000,
          reason: 'next_page_prefetch'
        });
      }
    }
    
    // If loading stats, prefetch ranks
    if (endpoint.includes('/stats')) {
      targets.push({
        endpoint: '/api/ladder/ranks',
        params: { gameType: params.gameType || 'wc3' },
        priority: 'low',
        delay: 1500,
        reason: 'stats_loaded'
      });
    }
    
    // If switching game types, prefetch related data
    if (endpoint.includes('/rankings') && params.gameType) {
      // Prefetch data for adjacent game types
      const gameTypes = ['wc1', 'wc2', 'wc3'];
      const currentIndex = gameTypes.indexOf(params.gameType);
      
      if (currentIndex !== -1) {
        // Prefetch adjacent game type data
        const adjacentTypes = [];
        if (currentIndex > 0) adjacentTypes.push(gameTypes[currentIndex - 1]);
        if (currentIndex < gameTypes.length - 1) adjacentTypes.push(gameTypes[currentIndex + 1]);
        
        adjacentTypes.forEach(gameType => {
          targets.push({
            endpoint: '/api/ladder/rankings',
            params: { ...params, gameType, page: 1 },
            priority: 'low',
            delay: 5000,
            reason: 'adjacent_game_type_prefetch'
          });
        });
      }
    }
    
    return targets;}

  /**
   * Manually trigger prefetching for specific data
   */
  async prefetchData(endpoint, params = {}) {
    if (!this.advancedPrefetch) return;console.log(`🧠 Manually prefetching ${endpoint}`);
    
    try {
      await this.advancedPrefetch.prefetchData(endpoint, params, {
        priority: 'low',
        delay: 0,
        reason: 'manual_prefetch'
      });
    } catch (error) {
      console.warn(`⚠️ Prefetching failed for ${endpoint}:`, error);
    }
  }

  /**
   * Get prefetching statistics and status
   */
  getPrefetchStats() {
    if (!this.advancedPrefetch) return null;return {
      status: this.advancedPrefetch.getStatus(),
      metrics: this.advancedPrefetch.getPerformanceMetrics(),
      predictions: this.advancedPrefetch.getMLPredictions()
    };}

  /**
   * Get data using advanced caching strategies
   */
  async getDataWithAdvancedCache(endpoint, params, cacheKey, forceRefresh) {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = this.advancedCache.get(cacheKey);
      if (cachedData) {
        console.log(`🔥 Using advanced cached data for ${endpoint}`);
        return cachedData;}
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Request already pending for ${endpoint}, waiting...`);
      return this.pendingRequests.get(cacheKey);}

    // Create new request
    const requestPromise = this.makeRequest(endpoint, params, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Store in advanced cache with appropriate TTL
      const ttl = this.getTTLForEndpoint(endpoint);
      this.advancedCache.set(cacheKey, result, {
        ttl: ttl,
        priority: this.getPriorityForEndpoint(endpoint),
        size: this.calculateDataSize(result)
      });
      
      return result;} finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Get data using basic caching (fallback)
   */
  async getDataWithBasicCache(endpoint, params, cacheKey, forceRefresh) {
    // Check cache first
    if (!forceRefresh && this.isCached(cacheKey)) {
      console.log(`📋 Using basic cached data for ${endpoint}`);
      return this.getCached(cacheKey);}

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Request already pending for ${endpoint}, waiting...`);
      return this.pendingRequests.get(cacheKey);}

    // Create new request
    const requestPromise = this.makeRequest(endpoint, params, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      this.setCached(cacheKey, result);
      return result;} finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Get appropriate TTL for different endpoint types
   */
  getTTLForEndpoint(endpoint) {
    if (endpoint.includes('/rankings')) return 30000;if (endpoint.includes('/stats')) return 60000;if (endpoint.includes('/recent-matches')) return 15000;if (endpoint.includes('/ranks')) return 45000;return 30000;}

  /**
   * Get priority level for different endpoint types
   */
  getPriorityForEndpoint(endpoint) {
    if (endpoint.includes('/rankings')) return 'high';if (endpoint.includes('/stats')) return 'medium';if (endpoint.includes('/recent-matches')) return 'low';if (endpoint.includes('/ranks')) return 'medium';return 'medium';}

  /**
   * Calculate approximate data size for cache management
   */
  calculateDataSize(data) {
    try {
      return JSON.stringify(data).length;} catch (error) {
      return 1000;}
  }

  /**
   * Batch multiple data requests together
   */
  async getBatchData(requests) {
    return new Promise((resolve) => {
      this.batchQueue.push({ requests, resolve });if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      this.batchTimeout = setTimeout(() => {
        this.processBatchQueue();
      }, this.batchDelay);
    });
  }

  /**
   * Process batched requests
   */
  async processBatchQueue() {
    if (this.batchQueue.length === 0) return;const batch = this.batchQueue.splice(0);
    const allRequests = batch.flatMap(item => item.requests);
    
    console.log(`🔄 Processing batch of ${allRequests.length} requests`);
    
    // Execute all requests in parallel
    const results = await Promise.allSettled(
      allRequests.map(req => this.getData(req.endpoint, req.params, req.forceRefresh))
    );
    
    // Resolve each batch with results
    batch.forEach((item, index) => {
      const startIndex = index * item.requests.length;
      const batchResults = results.slice(startIndex, startIndex + item.requests.length);
      item.resolve(batchResults);
    });
  }

  /**
   * Make the actual HTTP request
   */
  async makeRequest(endpoint, params, cacheKey) {
    const startTime = performance.now();
    const requestId = this.generateRequestId();
    
    try {
      console.log(`🌐 Making request to ${endpoint}`);
      
      // Track request start
      this.trackRequestStart(requestId, endpoint, params);
      
      const url = new URL(endpoint, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Track successful request
      this.trackRequestSuccess(requestId, endpoint, duration, data);
      
      console.log(`✅ Request to ${endpoint} completed in ${duration.toFixed(2)}ms`);
      return data;} catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Track failed request
      this.trackRequestError(requestId, endpoint, duration, error);
      
      console.error(`❌ Request to ${endpoint} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * Track request start for performance monitoring
   */
  trackRequestStart(requestId, endpoint, params) {
    if (window.PerformanceMonitorService) {
      window.PerformanceMonitorService.trackAPIRequestStart(requestId, endpoint, params);
    }
  }

  /**
   * Track successful request for performance monitoring
   */
  trackRequestSuccess(requestId, endpoint, duration, data) {
    if (window.PerformanceMonitorService) {
      window.PerformanceMonitorService.trackAPIRequestSuccess(requestId, endpoint, duration, data);
    }
  }

  /**
   * Track failed request for performance monitoring
   */
  trackRequestError(requestId, endpoint, duration, error) {
    if (window.PerformanceMonitorService) {
      window.PerformanceMonitorService.trackAPIRequestError(requestId, endpoint, duration, error);
    }
  }

  /**
   * Generate unique request ID for tracking
   */
  generateRequestId() {
    return `ladder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;}

  /**
   * Cache management methods
   */
  generateCacheKey(endpoint, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${endpoint}|${sortedParams}`;}

  isCached(cacheKey) {
    const cached = this.cache.get(cacheKey);
    return cached && (Date.now() - cached.timestamp) < this.cacheExpiry;}

  getCached(cacheKey) {
    return this.cache.get(cacheKey)?.data;}

  setCached(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for specific endpoint or all
   */
  clearCache(endpoint = null) {
    if (endpoint) {
      // Clear cache for specific endpoint
      for (const key of this.cache.keys()) {
        if (key.startsWith(endpoint)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
    console.log(`🧹 Cache cleared${endpoint ? ` for ${endpoint}` : ''}`);
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats() {
    if (this.advancedCache) {
      const advancedStats = this.advancedCache.getCacheStats();
      const efficiency = this.advancedCache.calculateCacheEfficiency();
      
      return {
        type: 'advanced',
        ...advancedStats,
        efficiency,
        prefetchStats: this.getPrefetchStats(),
        performanceMetrics: this.getPerformanceMetrics()
      };}
    
    // Basic cache stats
    const basicStats = {
      type: 'basic',
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      batchQueueSize: this.batchQueue.length
    };
    
    return {
      ...basicStats,
      prefetchStats: this.getPrefetchStats(),
      performanceMetrics: this.getPerformanceMetrics()
    };}

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      prefetchAccuracy: 0,
      lastUpdated: new Date().toISOString()
    };
    
    if (this.performanceMonitor) {
      const monitorMetrics = this.performanceMonitor.getMetrics();
      
      // Extract ladder-specific metrics
      if (monitorMetrics.api) {
        metrics.totalRequests = monitorMetrics.api.totalRequests || 0;
        metrics.successfulRequests = monitorMetrics.api.successfulRequests || 0;
        metrics.failedRequests = monitorMetrics.api.failedRequests || 0;
        metrics.averageResponseTime = monitorMetrics.api.averageResponseTime || 0;
      }
      
      if (monitorMetrics.custom && monitorMetrics.custom.ladder_cache_hit_rate) {
        metrics.cacheHitRate = monitorMetrics.custom.ladder_cache_hit_rate.value || 0;
      }
    }
    
    if (this.advancedPrefetch) {
      const prefetchMetrics = this.advancedPrefetch.getPerformanceMetrics();
      metrics.prefetchAccuracy = prefetchMetrics.accuracy || 0;
    }
    
    return metrics;}

  /**
   * Get service status and health information
   */
  getServiceStatus() {
    return {
      advancedCache: !!this.advancedCache,
      advancedPrefetch: !!this.advancedPrefetch,
      performanceMonitor: !!this.performanceMonitor,
      basicCache: !this.advancedCache,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime()
    };}

  /**
   * Get service uptime
   */
  getUptime() {
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    
    const uptime = Date.now() - this.startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return {
      milliseconds: uptime,
      seconds,
      minutes,
      hours,
      formatted: `${hours}h ${minutes % 60}m ${seconds % 60}s`
    };}

  /**
   * Clear all caches and reset service state
   */
  async clearAllCaches() {
    console.log('🧹 Clearing all caches...');
    
    if (this.advancedCache) {
      this.advancedCache.clear();
    }
    
    if (this.cache) {
      this.cache.clear();
    }
    
    this.pendingRequests.clear();
    this.batchQueue = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    console.log('✅ All caches cleared');
  }

  /**
   * Optimize cache based on current usage patterns
   */
  async optimizeCache() {
    if (!this.advancedCache) return;console.log('⚡ Optimizing cache...');
    
    try {
      // Analyze cache efficiency
      const efficiency = this.advancedCache.calculateCacheEfficiency();
      
      // Adjust cache configuration based on efficiency
      if (efficiency < 0.7) {
        this.advancedCache.updateConfig({
          maxCacheSize: Math.min(300, this.advancedCache.config.maxCacheSize + 50),
          criticalDataTTL: Math.min(120000, this.advancedCache.config.criticalDataTTL + 15000)
        });
        console.log('📈 Cache configuration optimized for better efficiency');
      }
      
      // Clean up cache
      this.advancedCache.cleanupCache();
      
      console.log('✅ Cache optimization completed');
    } catch (error) {
      console.warn('⚠️ Cache optimization failed:', error);
    }
  }
}

// Export a singleton instance for global use
try {
  if (
    window.LadderDataService &&
    typeof window.LadderDataService === 'object' &&
    typeof window.LadderDataService.getData === 'function'
  ) {
    // Already an instance with the correct API
  } else {
    window.LadderDataService = new LadderDataService();
  }
} catch (e) {
  window.LadderDataService = new LadderDataService();
}
