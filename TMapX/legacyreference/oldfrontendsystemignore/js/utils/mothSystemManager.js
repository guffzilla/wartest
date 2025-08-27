/**
 * Moth System Manager
 * 
 * Central manager for the unified moth and flashlight system.
 * Handles initialization, cleanup, and provides a clean API.
 */

import MothFlashlightSystem from './mothFlashlightSystem.js';

class MothSystemManager {
  constructor() {
    this.mothSystem = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the moth system on the current page
   */
  init(options = {}) {
    if (this.isInitialized) {
      console.warn('Moth system already initialized');
      return;}

    try {
      // Default options for all pages
      const defaultOptions = {
        canvasId: 'moth-flashlight-canvas',
        mothCount: 3,
        mothSpeed: 1.2,
        mothSize: { min: 18, max: 25 },
        flashlightRadius: 100,
        flashlightColor: 'rgba(255, 140, 0, 0.4)',
        enableDebug: false,
        zIndex: 1,
        ...options
      };

      this.mothSystem = new MothFlashlightSystem(defaultOptions);
      this.isInitialized = true;
      
      console.log('🦋 Moth system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize moth system:', error);
    }
  }

  /**
   * Cleanup the moth system
   */
  cleanup() {
    if (this.mothSystem) {
      this.mothSystem.cleanup();
      this.mothSystem = null;
      this.isInitialized = false;
      console.log('🦋 Moth system cleaned up');
    }
  }

  /**
   * Toggle flashlight on/off
   */
  toggleFlashlight() {
    if (this.mothSystem) {
      return this.mothSystem.toggleFlashlight();}
    return false;}

  /**
   * Toggle moths on/off
   */
  toggleMoths() {
    if (this.mothSystem) {
      return this.mothSystem.toggleMoths();}
    return false;}

  /**
   * Set flashlight active state
   */
  setFlashlightActive(active) {
    if (this.mothSystem) {
      this.mothSystem.setFlashlightActive(active);
    }
  }

  /**
   * Set moths active state
   */
  setMothsActive(active) {
    if (this.mothSystem) {
      this.mothSystem.setMothsActive(active);
    }
  }

  /**
   * Add moths to the system
   */
  addMoths(count = 1) {
    if (this.mothSystem) {
      this.mothSystem.addMoths(count);
    }
  }

  /**
   * Remove moths from the system
   */
  removeMoths(count = 1) {
    if (this.mothSystem) {
      this.mothSystem.removeMoths(count);
    }
  }

  /**
   * Get the moth system instance
   */
  getMothSystem() {
    return this.mothSystem;}

  /**
   * Check if system is initialized
   */
  isSystemInitialized() {
    return this.isInitialized;}
}

// Create global instance
const mothSystemManager = new MothSystemManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mothSystemManager.init();
  });
} else {
  mothSystemManager.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  mothSystemManager.cleanup();
});

// Export for ES6 modules
export default mothSystemManager;

// Also make available globally
if (typeof window !== 'undefined') {
  window.mothSystemManager = mothSystemManager;
}
