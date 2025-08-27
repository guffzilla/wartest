/**
 * RankService - Shared service for managing rank data
 * Eliminates duplicate rank loading between managers
 */
class RankService {
  static ranks = null;
  static lastFetch = 0;
  static cacheExpiry = 30000; // 30 seconds
  static pendingRequest = null;
  
  /**
   * Get ranks with intelligent caching and request deduplication
   */
  static async getRanks(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh && this.ranks && (Date.now() - this.lastFetch) < this.cacheExpiry) {
      console.log('📋 Using cached ranks data');
      return this.ranks;}
    
    // Check if request is already pending
    if (this.pendingRequest) {
      console.log('⏳ Ranks request already pending, waiting...');
      return this.pendingRequest;}
    
    // Create new request
    this.pendingRequest = this.fetchRanks();
    
    try {
      const result = await this.pendingRequest;
      return result;} finally {
      this.pendingRequest = null;
    }
  }
  
  /**
   * Fetch ranks from API
   */
  static async fetchRanks() {
    try {
      console.log('🏆 Fetching ranks data...');
      
      const response = await fetch('/api/ladder/ranks', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ranks: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🏆 Ranks data received:', data);
      
      // Update cache
      this.ranks = data;
      this.lastFetch = Date.now();
      
      return data;} catch (error) {
      console.error('❌ Error fetching ranks:', error);
      throw error;
    }
  }
  
  /**
   * Clear ranks cache
   */
  static clearCache() {
    this.ranks = null;
    this.lastFetch = 0;
    console.log('🧹 Ranks cache cleared');
  }
  
  /**
   * Get cache status
   */
  static getCacheStatus() {
    if (!this.ranks) {
      return { cached: false, age: null };}
    
    const age = Date.now() - this.lastFetch;
    return {
      cached: true,
      age: age,
      expired: age >= this.cacheExpiry
    };}
}

// Export the service
window.RankService = RankService;
