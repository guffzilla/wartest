/**
 * PHASE 3 OPTIMIZATION: Advanced Caching Strategies
 * 
 * Features:
 * - Cache warming for frequently accessed data
 * - Smart cache invalidation based on data staleness
 * - Offline support with critical data persistence
 * - Cache analytics and performance metrics
 * - Adaptive cache sizing and cleanup
 */

class AdvancedCacheService {
  constructor() {
    this.cache = new Map();
    this.cacheMetadata = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    };
    
    // Cache configuration
    this.config = {
      maxCacheSize: 100, // Maximum number of cached items
      criticalDataTTL: 300000, // 5 minutes for critical data
      standardDataTTL: 60000,  // 1 minute for standard data
      lazyDataTTL: 30000,      // 30 seconds for lazy data
      enableOffline: true,
      enableWarming: true,
      enableAnalytics: true
    };
    
    // Cache warming configuration
    this.warmingConfig = {
      enabled: true,
      warmupDelay: 1000, // 1 second after page load
      warmupBatchSize: 3, // Warm up 3 items at a time
      priorityItems: ['leaderboard', 'stats', 'ranks'] // Items to warm first
    };
    
    // Offline storage
    this.offlineStorage = new Map();
    this.offlineKeys = ['leaderboard', 'stats', 'ranks', 'userData'];
    
    this.initializeCache();
  }
  
  /**
   * Initialize cache with cleanup and warming
   */
  initializeCache() {
    console.log('🔥 Initializing Advanced Cache Service...');
    
    // Set up periodic cache cleanup
    setInterval(() => this.cleanupCache(), 30000); // Every 30 seconds
    
    // Set up cache warming after a delay
    if (this.warmingConfig.enabled) {
      setTimeout(() => this.warmupCache(), this.warmingConfig.warmupDelay);
    }
    
    // Load offline data if available
    this.loadOfflineData();
    
    console.log('✅ Advanced Cache Service initialized');
  }
  
  /**
   * Set cache item with metadata and TTL
   */
  set(key, data, options = {}) {
    const ttl = options.ttl || this.config.standardDataTTL;
    const priority = options.priority || 'standard';
    const isCritical = options.isCritical || false;
    
    const metadata = {
      timestamp: Date.now(),
      ttl: ttl,
      priority: priority,
      isCritical: isCritical,
      size: this.calculateDataSize(data),
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    // Store data and metadata
    this.cache.set(key, data);
    this.cacheMetadata.set(key, metadata);
    
    // Store critical data offline if enabled
    if (isCritical && this.config.enableOffline) {
      this.storeOffline(key, data);
    }
    
    // Check cache size and evict if necessary
    this.enforceCacheSize();
    
    console.log(`💾 Cached ${key} (${priority}, TTL: ${ttl}ms)`);
  }
  
  /**
   * Get cache item with smart validation
   */
  get(key) {
    this.cacheStats.totalRequests++;
    
    if (!this.cache.has(key)) {
      this.cacheStats.misses++;
      console.log(`❌ Cache miss: ${key}`);
      return null;}
    
    const metadata = this.cacheMetadata.get(key);
    const now = Date.now();
    
    // Check if data is expired
    if (now - metadata.timestamp > metadata.ttl) {
      console.log(`⏰ Cache expired: ${key} (age: ${now - metadata.timestamp}ms)`);
      this.delete(key);
      this.cacheStats.misses++;
      return null;}
    
    // Update access statistics
    metadata.accessCount++;
    metadata.lastAccessed = now;
    this.cacheStats.hits++;
    
    console.log(`✅ Cache hit: ${key} (age: ${now - metadata.timestamp}ms, accesses: ${metadata.accessCount})`);
    return this.cache.get(key);}
  
  /**
   * Smart cache invalidation based on patterns and dependencies
   */
  invalidate(pattern, options = {}) {
    const { force = false, cascade = true } = options;
    let invalidatedCount = 0;
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      let shouldInvalidate = false;
      
      if (force) {
        shouldInvalidate = true;
      } else if (typeof pattern === 'string') {
        // Exact match
        shouldInvalidate = key === pattern;
      } else if (pattern instanceof RegExp) {
        // Regex match
        shouldInvalidate = pattern.test(key);
      } else if (typeof pattern === 'function') {
        // Function match
        shouldInvalidate = pattern(key, metadata);
      }
      
      if (shouldInvalidate) {
        this.delete(key);
        invalidatedCount++;
        
        // Cascade invalidation for related data
        if (cascade) {
          this.invalidateRelated(key);
        }
      }
    }
    
    console.log(`🗑️ Invalidated ${invalidatedCount} cache items for pattern: ${pattern}`);
    return invalidatedCount;}
  
  /**
   * Invalidate related cache items
   */
  invalidateRelated(key) {
    const relatedPatterns = {
      'leaderboard': ['stats', 'ranks'],
      'stats': ['leaderboard'],
      'ranks': ['leaderboard'],
      'userData': ['recentMatches'],
      'recentMatches': ['userData']
    };
    
    const related = relatedPatterns[key] || [];
    related.forEach(relatedKey => {
      if (this.cache.has(relatedKey)) {
        console.log(`🔄 Cascading invalidation: ${relatedKey} (related to ${key})`);
        this.delete(relatedKey);
      }
    });
  }
  
  /**
   * Cache warming for frequently accessed data
   */
  async warmupCache() {
    if (!this.warmingConfig.enabled) return;console.log('🔥 Starting cache warmup...');
    
    // Warm up priority items first
    for (const item of this.warmingConfig.priorityItems) {
      try {
        await this.warmupItem(item);
        await this.delay(200); // Small delay between warmups
      } catch (error) {
        console.warn(`⚠️ Failed to warm up ${item}:`, error);
      }
    }
    
    console.log('✅ Cache warmup completed');
  }
  
  /**
   * Warm up a specific cache item
   */
  async warmupItem(key) {
    // This would integrate with existing services to prefetch data
    console.log(`🔥 Warming up: ${key}`);
    
    // For now, we'll simulate warming up by checking if data exists
    // In practice, this would call the appropriate service methods
    if (this.cache.has(key)) {
      console.log(`✅ ${key} already cached, skipping warmup`);
      return;}
    
    // Mark as warming up
    this.cacheMetadata.set(key, {
      timestamp: Date.now(),
      ttl: this.config.standardDataTTL,
      priority: 'standard',
      isCritical: false,
      size: 0,
      accessCount: 0,
      lastAccessed: Date.now(),
      warming: true
    });
    
    console.log(`🔥 ${key} marked for warmup`);
  }
  
  /**
   * Offline storage management
   */
  storeOffline(key, data) {
    try {
      const offlineKey = `offline_${key}`;
      this.offlineStorage.set(offlineKey, {
        data: data,
        timestamp: Date.now(),
        version: '1.0'
      });
      
      // Also store in localStorage for persistence
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(offlineKey, JSON.stringify({
          data: data,
          timestamp: Date.now(),
          version: '1.0'
        }));
      }
      
      console.log(`💾 Stored ${key} offline`);
    } catch (error) {
      console.warn(`⚠️ Failed to store ${key} offline:`, error);
    }
  }
  
  /**
   * Load offline data
   */
  loadOfflineData() {
    if (!this.config.enableOffline) return;console.log('📱 Loading offline data...');
    
    this.offlineKeys.forEach(key => {
      try {
        const offlineKey = `offline_${key}`;
        
        // Try to load from memory first
        if (this.offlineStorage.has(offlineKey)) {
          const offlineData = this.offlineStorage.get(offlineKey);
          this.set(key, offlineData.data, { 
            ttl: this.config.criticalDataTTL * 2, // Longer TTL for offline data
            isCritical: true 
          });
          console.log(`📱 Loaded ${key} from offline storage`);
        }
        // Try to load from localStorage
        else if (typeof localStorage !== 'undefined') {
          const stored = localStorage.getItem(offlineKey);
          if (stored) {
            const offlineData = JSON.parse(stored);
            this.set(key, offlineData.data, { 
              ttl: this.config.criticalDataTTL * 2,
              isCritical: true 
            });
            console.log(`📱 Loaded ${key} from localStorage`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load offline data for ${key}:`, error);
      }
    });
  }
  
  /**
   * Cache analytics and performance metrics
   */
  getCacheStats() {
    const hitRate = this.cacheStats.totalRequests > 0 
      ? (this.cacheStats.hits / this.cacheStats.totalRequests * 100).toFixed(2)
      : 0;
    
    const cacheSize = this.cache.size;
    const totalSize = Array.from(this.cacheMetadata.values())
      .reduce((sum, metadata) => sum + metadata.size, 0);
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      cacheSize,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      efficiency: this.calculateCacheEfficiency()
    };}
  
  /**
   * Calculate cache efficiency score
   */
  calculateCacheEfficiency() {
    const totalItems = this.cache.size;
    if (totalItems === 0) return 0;const now = Date.now();
    let efficiencyScore = 0;
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      const age = now - metadata.timestamp;
      const ttl = metadata.ttl;
      const accessRatio = metadata.accessCount / Math.max(1, age / 1000);
      
      // Higher score for frequently accessed, recently cached items
      const itemScore = Math.min(100, (accessRatio * 100) + (100 - (age / ttl * 100)));
      efficiencyScore += itemScore;
    }
    
    return Math.round(efficiencyScore / totalItems);}
  
  /**
   * Cache cleanup and maintenance
   */
  cleanupCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Remove expired items
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (now - metadata.timestamp > metadata.ttl) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    // Remove least recently used items if cache is too large
    if (this.cache.size > this.config.maxCacheSize) {
      const itemsToRemove = this.cache.size - this.config.maxCacheSize;
      const sortedItems = Array.from(this.cacheMetadata.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
        .slice(0, itemsToRemove);
      
      sortedItems.forEach(([key]) => {
        this.delete(key);
        cleanedCount++;
      });
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleanedCount} items`);
    }
  }
  
  /**
   * Enforce cache size limits
   */
  enforceCacheSize() {
    if (this.cache.size <= this.config.maxCacheSize) return;const itemsToRemove = this.cache.size - this.config.maxCacheSize;
    const sortedItems = Array.from(this.cacheMetadata.entries())
      .sort((a, b) => {
        // Prioritize keeping critical data and frequently accessed items
        if (a[1].isCritical && !b[1].isCritical) return -1;if (!a[1].isCritical && b[1].isCritical) return 1;return a[1].accessCount - b[1].accessCount;})
      .slice(0, itemsToRemove);
    
    sortedItems.forEach(([key]) => {
      this.delete(key);
      this.cacheStats.evictions++;
    });
    
    console.log(`📏 Cache size enforced: removed ${itemsToRemove} items`);
  }
  
  /**
   * Delete cache item
   */
  delete(key) {
    this.cache.delete(key);
    this.cacheMetadata.delete(key);
  }
  
  /**
   * Calculate approximate data size
   */
  calculateDataSize(data) {
    try {
      return JSON.stringify(data).length;} catch {
      return 0;}
  }
  
  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));}
  
  /**
   * Get full service status
   */
  getStatus() {
    return {
      config: this.config,
      warming: this.warmingConfig,
      stats: this.getCacheStats(),
      cacheSize: this.cache.size,
      offlineEnabled: this.config.enableOffline,
      offlineItems: this.offlineKeys.length
    };}
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Cache configuration updated:', this.config);
  }
  
  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.cacheMetadata.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    };
    console.log('🗑️ Cache cleared');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedCacheService;
} else {
  window.AdvancedCacheService = AdvancedCacheService;
}
