/**
 * SearchManager - Handles debounced search with request deduplication
 * Prevents API calls on every keystroke and eliminates duplicate requests
 */
class SearchManager {
  constructor() {
    this.pendingSearches = new Map();
    this.debounceTimers = new Map();
    this.debounceDelay = 300; // 300ms delay
    this.cache = new Map();
    this.cacheExpiry = 60000; // 1 minute cache
  }
  
  /**
   * Search with debouncing and request deduplication
   */
  async search(query, gameType, endpoint = '/api/ladder/search-players') {
    if (!query || query.trim().length < 2) {
      return [];}
    
    const trimmedQuery = query.trim();
    const cacheKey = `search_${trimmedQuery}_${gameType}`;
    
    // Check cache first
    if (this.isCached(cacheKey)) {
      console.log(`📋 Using cached search results for "${trimmedQuery}"`);
      return this.getCached(cacheKey);}
    
    // Check if search is already pending
    if (this.pendingSearches.has(cacheKey)) {
      console.log(`⏳ Search already pending for "${trimmedQuery}", waiting...`);
      return this.pendingSearches.get(cacheKey);}
    
    // Clear previous debounce timer
    if (this.debounceTimers.has(cacheKey)) {
      clearTimeout(this.debounceTimers.get(cacheKey));
    }
    
    // Create new search promise with debouncing
    const searchPromise = new Promise(resolve => {
      const timer = setTimeout(async () => {
        try {
          console.log(`🔍 Executing debounced search for "${trimmedQuery}"`);
          
          const response = await fetch(`${endpoint}?q=${encodeURIComponent(trimmedQuery)}&gameType=${gameType}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }
          
          const results = await response.json();
          console.log(`🔍 Search results for "${trimmedQuery}":`, results);
          
          // Cache the results
          this.setCached(cacheKey, results);
          
          resolve(results);
          
        } catch (error) {
          console.error(`❌ Search error for "${trimmedQuery}":`, error);
          resolve([]);
        }
      }, this.debounceDelay);
      
      this.debounceTimers.set(cacheKey, timer);
    });
    
    // Store the pending search
    this.pendingSearches.set(cacheKey, searchPromise);
    
    try {
      const result = await searchPromise;
      return result;} finally {
      this.pendingSearches.delete(cacheKey);
      this.debounceTimers.delete(cacheKey);
    }
  }
  
  /**
   * Search for recent opponents
   */
  async searchRecentOpponents(playerName, gameType) {
    return this.search(playerName, gameType, '/api/ladder/recent-opponents');}
  
  /**
   * Search for similar ranked players
   */
  async searchSimilarRank(playerName, gameType) {
    return this.search(playerName, gameType, '/api/ladder/similar-rank');}
  
  /**
   * Cancel pending searches for a specific query
   */
  cancelSearch(query, gameType) {
    const cacheKey = `search_${query.trim()}_${gameType}`;
    
    if (this.debounceTimers.has(cacheKey)) {
      clearTimeout(this.debounceTimers.get(cacheKey));
      this.debounceTimers.delete(cacheKey);
    }
    
    if (this.pendingSearches.has(cacheKey)) {
      this.pendingSearches.delete(cacheKey);
    }
    
    console.log(`🚫 Search cancelled for "${query}"`);
  }
  
  /**
   * Cancel all pending searches
   */
  cancelAllSearches() {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // Clear all pending searches
    this.pendingSearches.clear();
    
    console.log('🚫 All searches cancelled');
  }
  
  /**
   * Cache management methods
   */
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
   * Clear search cache
   */
  clearCache(query = null, gameType = null) {
    if (query && gameType) {
      // Clear specific search
      const cacheKey = `search_${query.trim()}_${gameType}`;
      this.cache.delete(cacheKey);
      console.log(`🧹 Search cache cleared for "${query}"`);
    } else if (gameType) {
      // Clear all searches for game type
      for (const key of this.cache.keys()) {
        if (key.includes(`_${gameType}`)) {
          this.cache.delete(key);
        }
      }
      console.log(`🧹 Search cache cleared for ${gameType}`);
    } else {
      // Clear all cache
      this.cache.clear();
      console.log('🧹 All search cache cleared');
    }
  }
  
  /**
   * Get search statistics
   */
  getStats() {
    const totalSearches = this.pendingSearches.size;
    const totalTimers = this.debounceTimers.size;
    const totalCache = this.cache.size;
    
    return {
      pendingSearches: totalSearches,
      activeTimers: totalTimers,
      cachedResults: totalCache
    };}
}

// Export the service
window.SearchManager = SearchManager;
