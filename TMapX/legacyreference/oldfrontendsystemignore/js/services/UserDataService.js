/**
 * UserDataService - Handles conditional user data loading
 * Only fetches user data when authenticated and actually needed
 */

import logger from '/js/utils/logger.js';

class UserDataService {
  constructor() {
    this.userData = null;
    this.lastFetch = 0;
    this.cacheExpiry = 300000; // 5 minutes cache
    this.pendingRequest = null;
    this.isAuthenticated = false;
    this.userId = null;
  }
  
  /**
   * Initialize the service and check authentication status
   */
  async init() {
    try {
      // Check if user is authenticated by looking for auth cookies/tokens
      this.isAuthenticated = this.checkAuthenticationStatus();
      
      if (this.isAuthenticated) {
        logger.info('✅ User is authenticated, UserDataService ready');
      } else {
        logger.info('ℹ️ User not authenticated, UserDataService in limited mode');
      }
      
      return this.isAuthenticated;} catch (error) {
      logger.error('❌ Error initializing UserDataService:', error);
      this.isAuthenticated = false;
      return false;}
  }
  
  /**
   * Check if user is authenticated
   */
  checkAuthenticationStatus() {
    // Check for common authentication indicators
    const hasAuthCookie = document.cookie.includes('connect.sid') || 
                         document.cookie.includes('auth') ||
                         document.cookie.includes('session');
    
    const hasLocalStorage = localStorage.getItem('user') || 
                           localStorage.getItem('authToken') ||
                           sessionStorage.getItem('user');
    
    return hasAuthCookie || hasLocalStorage;}
  
  /**
   * Get user data with intelligent caching
   */
  async getUserData(forceRefresh = false) {
    // Don't fetch if not authenticated
    if (!this.isAuthenticated) {
      logger.info('ℹ️ User not authenticated, skipping user data fetch');
      return null;}
    
    // Check cache first
    if (!forceRefresh && this.userData && (Date.now() - this.lastFetch) < this.cacheExpiry) {
      logger.info('📋 Using cached user data');
      return this.userData;}
    
    // Check if request is already pending
    if (this.pendingRequest) {
      logger.info('⏳ User data request already pending, waiting...');
      return this.pendingRequest;}
    
    // Create new request
    this.pendingRequest = this.fetchUserData();
    
    try {
      const result = await this.pendingRequest;
      return result;} finally {
      this.pendingRequest = null;
    }
  }
  
  /**
   * Fetch user data from API
   */
  async fetchUserData() {
    try {
      logger.info('👤 Fetching user data...');
      
      const response = await fetch('/api/me', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // User is not authenticated
          this.isAuthenticated = false;
          this.userData = null;
          logger.info('ℹ️ User authentication expired');
          return null;}
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      
      const data = await response.json();
      logger.info('👤 User data received:', data);
      
      // Update cache and state
      this.userData = data;
      this.lastFetch = Date.now();
      this.userId = data.id || data._id;
      
      return data;} catch (error) {
      logger.error('❌ Error fetching user data:', error);
      throw error;
    }
  }
  
  /**
   * Get user's players for a specific game type
   */
  async getUserPlayers(gameType, forceRefresh = false) {
    if (!this.isAuthenticated) {
      return [];}
    
    try {
      logger.info(`👤 Fetching user players for ${gameType}...`);
      
      const response = await fetch(`/api/ladder/my-players?gameType=${gameType}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user players: ${response.status}`);
      }
      
      const data = await response.json();
      logger.info(`👤 User players for ${gameType}:`, data);
      
      return data;} catch (error) {
      logger.error(`❌ Error fetching user players for ${gameType}:`, error);
      return [];}
  }
  
  /**
   * Check if user has specific permissions
   */
  hasPermission(permission) {
    if (!this.userData || !this.userData.permissions) {
      return false;}
    
    return this.userData.permissions.includes(permission);}
  
  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.hasPermission('admin') || 
           (this.userData && this.userData.role === 'admin');}
  
  /**
   * Check if user is moderator
   */
  isModerator() {
    return this.hasPermission('moderator') || 
           this.hasPermission('admin') ||
           (this.userData && ['moderator', 'admin'].includes(this.userData.role));}
  
  /**
   * Get user preference
   */
  getUserPreference(key, defaultValue = null) {
    if (!this.userData || !this.userData.preferences) {
      return defaultValue;}
    
    return this.userData.preferences[key] !== undefined 
      ? this.userData.preferences[key] 
      : defaultValue;}
  
  /**
   * Clear user data cache
   */
  clearCache() {
    this.userData = null;
    this.lastFetch = 0;
    this.userId = null;
    logger.info('🧹 User data cache cleared');
  }
  
  /**
   * Logout user (clear all data)
   */
  logout() {
    this.clearCache();
    this.isAuthenticated = false;
    logger.info('👋 User logged out, UserDataService reset');
  }
  
  /**
   * Get service status
   */
  getStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      hasUserData: !!this.userData,
      lastFetch: this.lastFetch,
      cacheAge: this.lastFetch ? Date.now() - this.lastFetch : null,
      userId: this.userId
    };}
}

// Export the service
window.UserDataService = UserDataService;
