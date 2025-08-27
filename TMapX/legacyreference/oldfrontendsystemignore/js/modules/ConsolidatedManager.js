/**
 * Consolidated Manager System
 * 
 * Replaces multiple overlapping managers with a unified system:
 * - ProfileManager -> UnifiedProfileManager (already created)
 * - PlayerManager -> Integrated into UnifiedProfileManager
 * - GameManager -> Simplified GameStateManager
 * - LadderManager -> Optimized LadderCore
 * 
 * This eliminates redundant API calls, duplicate state management,
 * and overlapping functionality across managers.
 */
import { ApiClient } from './ApiClient.js';
/**
 * Game State Manager - Simplified game switching and state
 */
export class GameStateManager {
  constructor() {
    this.currentGame = 'war2'; // Default
    this.gameConfigs = {
      'war1': { 
        title: 'WC1', 
        fullTitle: 'Warcraft I', 
        races: ['human', 'orc'],
        api: 'war1maps'
      },
      'war2': { 
        title: 'WC2', 
        fullTitle: 'Warcraft II', 
        races: ['human', 'orc'],
        api: 'war2maps'
      },
      'war3': { 
        title: 'WC3', 
        fullTitle: 'Warcraft III', 
        races: ['human', 'orc', 'undead', 'night_elf'],
        api: 'war3maps'
      }
    };
    // Load saved preference
    this.currentGame = localStorage.getItem('selectedGame') || 'war2';
  }
  /**
   * Switch game type
   */
  switchGame(gameType) {
    if (this.currentGame === gameType) return false;const oldGame = this.currentGame;
    this.currentGame = gameType;
    // Save preference
    localStorage.setItem('selectedGame', gameType);
    // Emit change event
    window.dispatchEvent(new CustomEvent('gameChanged', {
      detail: { 
        from: oldGame, 
        to: gameType, 
        config: this.getGameConfig(gameType) 
      }
    }));
    return true;}
  /**
   * Get current game type
   */
  getCurrentGame() {
    return this.currentGame;}
  /**
   * Get game configuration
   */
  getGameConfig(gameType = null) {
    return this.gameConfigs[gameType || this.currentGame];}
  /**
   * Get all game configurations
   */
  getAllGameConfigs() {
    return this.gameConfigs;}
  /**
   * Check if game type is valid
   */
  isValidGame(gameType) {
    return gameType in this.gameConfigs;}
}
/**
 * Data Cache Manager - Centralized caching for all managers
 */
export class DataCacheManager {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }
  /**
   * Set cached data with TTL
   */
  set(key, data, ttl = null) {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now() + (ttl || this.defaultTTL));
  }
  /**
   * Get cached data if not expired
   */
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;}
    return this.cache.get(key);}
  /**
   * Check if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null;}
  /**
   * Clear specific cache entry
   */
  clear(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }
  /**
   * Clear all cache
   */
  clearAll() {
    this.cache.clear();
    this.timestamps.clear();
  }
  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now > timestamp) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }
  }
}
/**
 * API Manager - Centralized API calls with caching
 */
export class APIManager {
  constructor() {
    this.apiClient = new ApiClient();
    this.cache = new DataCacheManager();
    this.pendingRequests = new Map(); // Prevent duplicate requests
  }
  /**
   * Make cached API request
   */
  async request(endpoint, options = {}) {
    const { 
      method = 'GET', 
      cache = true, 
      cacheTTL = null,
      params = {},
      body = null
    } = options;
    // Build cache key
    const cacheKey = this.buildCacheKey(endpoint, method, params, body);
    // Return cached data if available and caching is enabled
    if (cache && method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;}
    }
    // Prevent duplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);}
    // Make the request
    const requestPromise = this.makeRequest(endpoint, method, params, body);
    this.pendingRequests.set(cacheKey, requestPromise);
    try {
      const result = await requestPromise;
      // Cache successful GET requests
      if (cache && method === 'GET' && result) {
        this.cache.set(cacheKey, result, cacheTTL);
      }
      return result;} finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  /**
   * Make the actual API request
   */
  async makeRequest(endpoint, method, params, body) {
    try {
      let response;
      if (method === 'GET') {
        response = await this.apiClient.get(endpoint, params);
      } else if (method === 'POST') {
        response = await this.apiClient.post(endpoint, body);
      } else if (method === 'PUT') {
        response = await this.apiClient.put(endpoint, body);
      } else if (method === 'DELETE') {
        response = await this.apiClient.delete(endpoint);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return await response.json();} catch (error) {
      throw error;
    }
  }
  /**
   * Build cache key from request parameters
   */
  buildCacheKey(endpoint, method, params, body) {
    const paramStr = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${endpoint}:${paramStr}:${bodyStr}`;}
  /**
   * Clear cache for specific endpoint pattern
   */
  clearCache(pattern) {
    for (const key of this.cache.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.clear(key);
      }
    }
  }
  /**
   * Preload common data
   */
  async preloadCommonData() {
    try {
      await Promise.all([
        this.request('/api/me', { cache: true, cacheTTL: 10 * 60 * 1000 }), // 10 min
        this.request('/api/ladder/ranks', { cache: true, cacheTTL: 30 * 60 * 1000 }), // 30 min
        this.request('/api/achievements/definitions', { cache: true, cacheTTL: 60 * 60 * 1000 }) // 1 hour
      ]);
    } catch (error) {
    }
  }
}
/**
 * Event Manager - Centralized event handling
 */
export class EventManager {
  constructor() {
    this.listeners = new Map();
  }
  /**
   * Add event listener
   */
  on(event, callback, context = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push({ callback, context });
  }
  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;const listeners = this.listeners.get(event);
    const index = listeners.findIndex(l => l.callback === callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  /**
   * Emit event
   */
  emit(event, data = null) {
    if (!this.listeners.has(event)) return;const listeners = this.listeners.get(event);
    listeners.forEach(({ callback, context }) => {
      try {
        if (context) {
          callback.call(context, data);
        } else {
          callback(data);
        }
      } catch (error) {
      }
    });
  }
  /**
   * Clear all listeners for an event
   */
  clear(event) {
    this.listeners.delete(event);
  }
  /**
   * Clear all listeners
   */
  clearAll() {
    this.listeners.clear();
  }
}
/**
 * Master Consolidated Manager
 */
export class ConsolidatedManager {
  constructor() {
    this.gameState = new GameStateManager();
    this.api = new APIManager();
    this.events = new EventManager();
    this.isInitialized = false;
  }
  /**
   * Initialize the consolidated manager system
   */
  async init() {
    if (this.isInitialized) return;try {
      // Preload common data
      await this.api.preloadCommonData();
      // Setup global event listeners
      this.setupGlobalEvents();
      // Make managers globally available
      window.gameState = this.gameState;
      window.apiManager = this.api;
      window.eventManager = this.events;
      this.isInitialized = true;
      // Emit ready event
      this.events.emit('system:ready');
    } catch (error) {
      throw error;
    }
  }
  /**
   * Setup global event listeners
   */
  setupGlobalEvents() {
    // Game change events
    window.addEventListener('gameChanged', (event) => {
      this.events.emit('game:changed', event.detail);
    });
    // Profile data events
    window.addEventListener('profileDataUpdated', (event) => {
      this.events.emit('profile:updated', event.detail);
    });
    // Cleanup cache periodically
    setInterval(() => {
      this.api.cache.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  /**
   * Get manager instance
   */
  getGameState() {
    return this.gameState;}
  getAPI() {
    return this.api;}
  getEvents() {
    return this.events;}
}
// Create singleton instance
export const consolidatedManager = new ConsolidatedManager();
export default consolidatedManager;
