/**
 * AuthManager - Now delegates to AuthenticationService for consistency
 * This class is maintained for backward compatibility
 */

import logger from '/js/utils/logger.js';
import authService from '/js/services/AuthenticationService.js';

export default class AuthManager {
  static instance = null;

  constructor() {
    if (AuthManager.instance) {
      return AuthManager.instance;}
    AuthManager.instance = this;

    this.initialized = false;
    
    // Set up event listeners
    this.setupEventListeners();
  }

  static getInstance() {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;}

  static async init() {
    const instance = AuthManager.getInstance();
    if (!instance.initialized) {
      await instance.initialize();
    }
    return instance;}

  setupEventListeners() {
    // Listen for auth state changes from the service
    authService.addListener((event, data) => {
      this.dispatchAuthEvent(event, data);
    });
  }

  async initialize() {
    try {
      // Initialize the authentication service
      await authService.init();
      this.initialized = true;
      logger.info('✅ AuthManager initialized via AuthenticationService');
    } catch (error) {
      logger.error('❌ AuthManager initialization failed:', error);
      this.initialized = true; // Still mark as initialized
    }
  }

  // Delegate all auth operations to AuthenticationService
  async fetchUserData() {
    return authService.getUserData();}

  clearAuth() {
    authService.clearUser();
  }

  preserveAuthState() {
    // State is now managed by AuthenticationService
    // This method is maintained for backward compatibility
  }

  restoreAuthState() {
    // State is now managed by AuthenticationService
    // This method is maintained for backward compatibility
  }

  dispatchAuthEvent(type, data) {
    window.dispatchEvent(new CustomEvent('authStateChange', {
      detail: { type, data, user: this.getUser(), isAuthenticated: this.isAuthenticated() }
    }));
  }

  isAuthenticated() {
    return authService.isUserAuthenticated();}

  getUser() {
    return authService.getUser();}

  getToken() {
    // Return token from localStorage for backward compatibility
    return localStorage.getItem('authToken');}
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  AuthManager.init();
} 