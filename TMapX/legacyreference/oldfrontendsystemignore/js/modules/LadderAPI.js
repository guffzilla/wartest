/**
 * Ladder API Module
 * Handles all API calls related to ladder functionality
 */

class LadderAPI {
  constructor() {
    this.baseURL = '/api/ladder';
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Generic API request handler with error handling
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} API response data
   */
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();} catch (error) {
      throw error;
    }
  }

  /**
   * Load leaderboard data
   * @param {string} matchType - Match type filter ('all', '1v1', '2v2', etc.)
   * @param {number} page - Page number
   * @param {string} search - Search query
   * @param {string} gameType - Game type ('warcraft2', 'warcraft3')
   * @returns {Promise<Object>} Leaderboard data
   */
  async loadLeaderboard(matchType = 'all', page = 1, search = '', gameType = null) {
    try {
      // Build URL with parameters
      const params = new URLSearchParams({
        limit: '10',
        page: page.toString(),
        search: search || '',
        matchType: matchType || 'all'
      });if (gameType && gameType !== 'all') {
        params.append('gameType', gameType);
      }

      // Use the new unified matches endpoint for leaderboard data
      const url = `/api/matches?${params}`;
      
      const data = await this.request(url);
      
      return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Load global statistics
   * @param {string} gameType - Game type filter
   * @returns {Promise<Object>} Global stats data
   */
  async loadGlobalStats(gameType = null) {
    try {
      const params = new URLSearchParams();if (gameType && gameType !== 'all') {
        params.append('gameType', gameType);
      }

      const url = `${this.baseURL}/global-stats${params.toString() ? '?' + params : ''}`;
      
      const data = await this.request(url);
      
      return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Load recent matches
   * @param {string} matchType - Match type filter
   * @param {number} page - Page number
   * @param {string} gameType - Game type filter
   * @returns {Promise<Object>} Recent matches data
   */
  async loadRecentMatches(matchType = 'all', page = 1, gameType = null) {
    try {
      const params = new URLSearchParams({
        limit: '20',
        page: page.toString()
      });if (matchType && matchType !== 'all') {
        params.append('matchType', matchType);
      }

      if (gameType && gameType !== 'all') {
        params.append('gameType', gameType);
      }

      // Use the new unified matches endpoint
      const url = `/api/matches/recent?${params}`;
      
      const data = await this.request(url);
      
      return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Load player details
   * @param {string} playerName - Player name
   * @param {string} gameType - Game type
   * @returns {Promise<Object>} Player details data
   */
  async loadPlayerDetails(playerName, gameType = 'warcraft2') {
    try {
      const params = new URLSearchParams({
        name: playerName,
        gameType: gameType
      });const url = `/api/player/details?${params}`;
      const data = await this.request(url);
      
      return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Load ranks data
   * @param {string} gameType - Game type filter
   * @returns {Promise<Object>} Ranks data
   */
  async loadRanks(gameType = null) {
    try {
      const params = new URLSearchParams();if (gameType && gameType !== 'all') {
        params.append('gameType', gameType);
      }

      const url = `${this.baseURL}/ranks${params.toString() ? '?' + params : ''}`;
      const data = await this.request(url);
      
      return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Submit match report
   * @param {FormData} formData - Form data containing match details
   * @returns {Promise<Object>} Submit response
   */
  async submitMatchReport(formData) {
    try {
      const response = await fetch(`${this.baseURL}/report`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error submitting match report');
      }

      const data = await response.json();
      
      return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Load recent settings for match reporting
   * @returns {Promise<Object>} Recent settings data
   */
  async loadRecentSettings() {
    try {
      const data = await this.request(`${this.baseURL}/recent-settings`);return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Load recent players for match reporting
   * @returns {Promise<Array>} Recent players data
   */
  async loadRecentPlayers() {
    try {
      const data = await this.request(`${this.baseURL}/recent-players`);return data.recentPlayers || [];} catch (error) {
      return [];}
  }

  /**
   * Dispute a match
   * @param {string} matchId - Match ID
   * @param {string} playerName - Player name disputing
   * @param {string} reason - Dispute reason
   * @param {string} evidence - Evidence (optional)
   * @returns {Promise<Object>} Dispute response
   */
  async disputeMatch(matchId, playerName, reason, evidence = null) {
    try {
      const data = await this.request(`${this.baseURL}/dispute-match`, {
        method: 'POST',
        body: JSON.stringify({
          matchId,
          playerName,
          reason,
          evidence
        })
      });return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Flag a screenshot as inappropriate
   * @param {string} screenshotUrl - Screenshot URL
   * @param {string} screenshotId - Screenshot ID (optional)
   * @returns {Promise<Object>} Flag response
   */
  async flagScreenshot(screenshotUrl, screenshotId = null) {
    try {
      const data = await this.request(`${this.baseURL}/flag-screenshot`, {
        method: 'POST',
        body: JSON.stringify({
          screenshotUrl,
          screenshotId
        })
      });return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Get user's player names
   * @returns {Promise<Array>} User's player names
   */
  async getMyPlayers() {
    try {
      const data = await this.request(`${this.baseURL}/my-players`);return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Search maps
   * @param {string} query - Search query
   * @param {boolean} exact - Exact match
   * @returns {Promise<Array>} Map search results
   */
  async searchMaps(query, exact = false) {
    try {
      const params = new URLSearchParams({
        search: query,
        limit: 100
      });if (exact) {
        params.append('exact', 'true');
      }

      const url = `/api/war2maps?${params}`;
      const response = await this.request(url);
      
      // Handle different response formats
      let data = [];
      if (response.success && response.data) {
        data = response.data;
      } else if (response.maps) {
        data = response.maps;
      } else if (Array.isArray(response)) {
        data = response;
      }
      
      return data;} catch (error) {
      throw error;
    }
  }

  /**
   * Load all maps
   * @returns {Promise<Array>} All maps data
   */
  async loadMaps() {
    try {
      const response = await this.request('/api/war2maps?limit=1000');let data = [];
      if (response.success && response.data) {
        data = response.data;
      } else if (response.maps) {
        data = response.maps;
      } else if (Array.isArray(response)) {
        data = response;
      }
      
      return data;} catch (error) {
      return [];}
  }

  /**
   * Get current user info
   * @returns {Promise<Object>} User info
   */
  async getCurrentUser() {
    try {
      // Try multiple endpoints for user info
      const endpoints = ['/api/auth/me', '/api/me'];for (const endpoint of endpoints) {
        try {
          const data = await this.request(endpoint);
          return data;} catch (error) {
          continue;
        }
      }
      
      throw new Error('Could not fetch user info from any endpoint');
    } catch (error) {
      return null;}
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache key for request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {string} Cache key
   */
  getCacheKey(url, options = {}) {
    return `${url}_${JSON.stringify(options)}`;}

  /**
   * Check if cached data is still valid
   * @param {Object} cacheEntry - Cache entry
   * @returns {boolean} Whether cache is valid
   */
  isCacheValid(cacheEntry) {
    return Date.now() - cacheEntry.timestamp < this.cacheTimeout;}
}

// Create global instance
window.LadderAPI = LadderAPI;
window.ladderAPI = new LadderAPI(); 