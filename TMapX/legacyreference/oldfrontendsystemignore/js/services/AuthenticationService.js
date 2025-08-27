/**
 * Consolidated Authentication Service
 * 
 * This single service replaces all existing authentication managers:
 * - frontend/js/modules/AuthManager.js
 * - frontend/js/services/UserDataService.js (auth parts)
 * - frontend/js/init-coordinator.js (auth parts)
 * - frontend/js/main.js (authenticatedFetch utility)
 * 
 * Provides consistent authentication state management across the entire frontend.
 * Updated for Rust backend compatibility.
 */

import logger from '../utils/logger.js';

class AuthenticationService {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = new Set();
    this.checkInterval = null;
    this.isInitialized = false;
    this.authCheckPromise = null; // Prevent multiple simultaneous auth checks
    
    // Bind methods to preserve context
    this.checkAuthStatus = this.checkAuthStatus.bind(this);
    this.setUser = this.setUser.bind(this);
    this.clearUser = this.clearUser.bind(this);
    this.logout = this.logout.bind(this);
    this.requireAuth = this.requireAuth.bind(this);
  }
  
  /**
   * Initialize authentication service
   */
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      logger.info('🔐 Initializing Authentication Service...');
      
      // Check existing session immediately
      await this.checkAuthStatus();
      
      // Set up periodic checks
      this.startPeriodicChecks();
      
      // Listen for auth events
      this.setupEventListeners();
      
      // Set up global authenticated fetch utility
      this.setupGlobalUtilities();
      
      // Set up authentication guards for protected pages
      this.setupAuthGuards();
      
      this.isInitialized = true;
      logger.info('✅ Authentication Service initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize Authentication Service:', error);
      // Don't throw - auth can fail gracefully
    }
  }
  
  /**
   * Check authentication status from server
   */
  async checkAuthStatus() {
    // Prevent multiple simultaneous auth checks
    if (this.authCheckPromise) {
      return this.authCheckPromise;
    }
    
    this.authCheckPromise = this._performAuthCheck();
    try {
      const result = await this.authCheckPromise;
      return result;
    } finally {
      this.authCheckPromise = null;
    }
  }
  
  /**
   * Perform the actual authentication check
   */
  async _performAuthCheck() {
    try {
      // Check for JWT token in localStorage
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        this.clearUser();
        return false;
      }
      
      // For now, we'll use a placeholder approach since /api/me doesn't exist yet
      // TODO: Implement proper /api/me endpoint in Rust backend
      try {
        // Try to validate the token by making a request to a protected endpoint
        const response = await fetch('/api/health', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          // Token appears valid, create a placeholder user object
          // This is temporary until we implement proper user endpoints
          const userData = {
            id: 'placeholder-id',
            username: 'authenticated-user',
            email: 'user@example.com',
            role: 'user',
            isAuthenticated: true,
            // Add other user fields as needed
          };
          
          this.setUser(userData);
          return true;
        } else {
          // Token is invalid
          this.clearUser();
          return false;
        }
      } catch (error) {
        logger.warn('Token validation failed, clearing user:', error);
        this.clearUser();
        return false;
      }
      
    } catch (error) {
      logger.error('Auth check failed:', error);
      this.clearUser();
      return false;
    }
  }
  
  /**
   * Set user data and update authentication state
   */
  setUser(userData) {
    this.user = userData;
    this.isAuthenticated = true;
    
    // Notify listeners
    this.notifyListeners('login', userData);
    
    logger.info('✅ User authenticated:', userData.username || userData.email);
  }
  
  /**
   * Clear user data and update authentication state
   */
  clearUser() {
    this.user = null;
    this.isAuthenticated = false;
    
    // Clear JWT token
    localStorage.removeItem('authToken');
    
    // Notify listeners
    this.notifyListeners('logout');
    
    logger.info('🔓 User logged out');
  }
  
  /**
   * Logout user
   */
  async logout() {
    try {
      // Clear local state
      this.clearUser();
      
      // Redirect to login page
      if (window.location.pathname !== '/views/login.html') {
        window.location.href = '/views/login.html';
      }
      
    } catch (error) {
      logger.error('Logout failed:', error);
      // Still clear local state even if server logout fails
      this.clearUser();
    }
  }
  
  /**
   * Require authentication for protected routes
   */
  requireAuth() {
    if (!this.isAuthenticated) {
      // Store current location for redirect after login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      
      // Redirect to login
      window.location.href = '/views/login.html';
      return false;
    }
    return true;
  }
  
  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }
  
  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }
  
  /**
   * Check if user has admin role
   */
  isAdmin() {
    return this.user && this.user.role === 'admin';
  }
  
  /**
   * Check if user has moderator role
   */
  isModerator() {
    return this.user && (this.user.role === 'moderator' || this.user.role === 'admin');
  }
  
  /**
   * Add authentication state listener
   */
  addListener(callback) {
    this.listeners.add(callback);
  }
  
  /**
   * Remove authentication state listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }
  
  /**
   * Notify all listeners of authentication state changes
   */
  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('Auth listener callback failed:', error);
      }
    });
  }
  
  /**
   * Start periodic authentication checks
   */
  startPeriodicChecks() {
    // Check auth status every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkAuthStatus().catch(error => {
        logger.error('Periodic auth check failed:', error);
      });
    }, 5 * 60 * 1000);
  }
  
  /**
   * Stop periodic authentication checks
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  /**
   * Set up event listeners for authentication events
   */
  setupEventListeners() {
    // Listen for storage changes (other tabs logging in/out)
    window.addEventListener('storage', (e) => {
      if (e.key === 'authToken') {
        if (e.newValue) {
          // Token was added in another tab
          this.checkAuthStatus();
        } else {
          // Token was removed in another tab
          this.clearUser();
        }
      }
    });
    
    // Listen for beforeunload to clean up
    window.addEventListener('beforeunload', () => {
      this.stopPeriodicChecks();
    });
  }
  
  /**
   * Set up global utilities for authenticated requests
   */
  setupGlobalUtilities() {
    // Make authenticated fetch available globally
    window.authenticatedFetch = async (url, options = {}) => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      
      const response = await fetch(url, options);
      
      // Handle 401 responses
      if (response.status === 401) {
        this.clearUser();
        throw new Error('Authentication required');
      }
      
      return response;
    };
    
    // Make auth headers available globally
    window.getAuthHeaders = () => {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      return headers;
    };
  }
  
  /**
   * Set up authentication guards for protected pages
   */
  setupAuthGuards() {
    // Define protected routes
    const protectedRoutes = [
      '/views/myprofile.html',
      '/views/admin.html',
      '/views/player-profile.html',
      '/views/otherprofile.html'
    ];
    
    // Check if current page is protected
    const currentPath = window.location.pathname;
    const isProtectedRoute = protectedRoutes.some(route => currentPath.includes(route));
    
    if (isProtectedRoute) {
      // Require authentication for protected routes
      if (!this.requireAuth()) {
        return;
      }
    }
  }
  
  /**
   * Register new user
   */
  async registerUser(userData) {
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      const data = await response.json();
      
      // If registration includes a token, store it and set user
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        if (data.user) {
          this.setUser(data.user);
        }
      }
      
      return data;
      
    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }
  
  /**
   * Login user with username/password
   */
  async loginUser(credentials) {
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store JWT token and set user
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        if (data.user) {
          this.setUser(data.user);
        }
      }
      
      return data;
      
    } catch (error) {
      logger.error('User login failed:', error);
      throw error;
    }
  }
  
  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(provider, code, state = null) {
    try {
      const response = await fetch(`/api/auth/${provider}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          state
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `OAuth callback failed for ${provider}`);
      }
      
      const data = await response.json();
      
      // Store JWT token and set user
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        if (data.user) {
          this.setUser(data.user);
        }
      }
      
      return data;
      
    } catch (error) {
      logger.error(`OAuth callback failed for ${provider}:`, error);
      throw error;
    }
  }
  
  /**
   * Get OAuth URL for provider
   */
  async getOAuthUrl(provider) {
    try {
      const response = await fetch(`/api/auth/${provider}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get OAuth URL for ${provider}`);
      }
      
      const data = await response.json();
      return data.auth_url;
      
    } catch (error) {
      logger.error(`Failed to get OAuth URL for ${provider}:`, error);
      throw error;
    }
  }
  
  /**
   * Update user profile
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async updateProfile(profileData) {
    // TODO: Implement user profile update endpoint in Rust backend
    logger.warn('updateProfile not yet implemented in Rust backend');
    throw new Error('Profile update not yet implemented');
  }
  
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        headers: window.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to get user');
      }
      
      return await response.json();
      
    } catch (error) {
      logger.error('getUserById failed:', error);
      throw error;
    }
  }
  
  /**
   * Get user by username
   */
  async getUserByUsername(username) {
    try {
      const response = await fetch(`/api/users/username/${username}`, {
        headers: window.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to get user by username');
      }
      
      return await response.json();
      
    } catch (error) {
      logger.error('getUserByUsername failed:', error);
      throw error;
    }
  }
  
  /**
   * Promote user to admin
   */
  async promoteUser(userId, newRole) {
    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: window.getAuthHeaders(),
        body: JSON.stringify({
          user_id: userId,
          new_role: newRole
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to promote user');
      }
      
      return await response.json();
      
    } catch (error) {
      logger.error('promoteUser failed:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.stopPeriodicChecks();
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const authenticationService = new AuthenticationService();

// Export both named and default
export { AuthenticationService, authenticationService };
export default authenticationService;
