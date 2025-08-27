/**
 * RecentMatchesService - Shared service for managing recent matches data
 * Eliminates duplicate recent matches loading between managers
 */
class RecentMatchesService {
  static cache = new Map();
  static cacheExpiry = 30000; // 30 seconds
  static pendingRequests = new Map();
  
  /**
   * Get recent matches with intelligent caching and request deduplication
   */
  static async getRecentMatches(gameType, limit = 10, forceRefresh = false) {
    const cacheKey = `recent_${gameType}_${limit}`;
    
    // Check cache first
    if (!forceRefresh && this.isCached(cacheKey)) {
      console.log(`📋 Using cached recent matches for ${gameType} (limit: ${limit})`);
      return this.getCached(cacheKey);}
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Recent matches request already pending for ${gameType} (limit: ${limit}), waiting...`);
      return this.pendingRequests.get(cacheKey);}
    
    // Create new request
    const requestPromise = this.fetchRecentMatches(gameType, limit, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;} finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  /**
   * Fetch recent matches from API
   */
  static async fetchRecentMatches(gameType, limit, cacheKey) {
    try {
      console.log(`🕒 Fetching recent matches for ${gameType} (limit: ${limit})...`);
      
      const response = await fetch(`/api/matches/recent?gameType=${gameType}&limit=${limit}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recent matches: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`🕒 Recent matches data received for ${gameType}:`, data);
      
      // Cache the data
      this.setCached(cacheKey, data);
      
      return data;} catch (error) {
      console.error(`❌ Error fetching recent matches for ${gameType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get recent matches with smart limit handling
   * If requesting limit=5 but we have limit=10 cached, return subset
   */
  static async getRecentMatchesSmart(gameType, requestedLimit = 5) {
    // Try to get from cache with larger limit first
    const largerLimit = Math.max(requestedLimit, 10);const cacheKey = `recent_${gameType}_${largerLimit}`;
    
    if (this.isCached(cacheKey)) {
      const cachedData = this.getCached(cacheKey);
      if (Array.isArray(cachedData) && cachedData.length >= requestedLimit) {
        console.log(`📋 Using cached data and slicing to ${requestedLimit} for ${gameType}`);
        return cachedData.slice(0, requestedLimit);}
    }
    
    // Fall back to direct request
    return this.getRecentMatches(gameType, requestedLimit);}
  
  /**
   * Cache management methods
   */
  static isCached(cacheKey) {
    const cached = this.cache.get(cacheKey);
    return cached && (Date.now() - cached.timestamp) < this.cacheExpiry;}
  
  static getCached(cacheKey) {
    return this.cache.get(cacheKey)?.data;}
  
  static setCached(cacheKey, data) {
    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
  }
  
  static clearCache() {
    this.cache.clear();
    console.log('🧹 RecentMatchesService cache cleared');
  }
  
  static getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };}
}

// Export the service
window.RecentMatchesService = RecentMatchesService;
