/**
 * Maps.js - Modular Maps System
 * 
 * This is the new, clean replacement for the original 72KB maps.js monster.
 * Instead of one massive file, we now have a focused orchestrator that coordinates
 * specialized modules for maximum maintainability and performance.
 * 
 * Architecture:
 * - MapsCore: Core initialization, authentication, state management
 * - MapsGrid: Grid display, pagination, search, statistics
 * - MapDetails: Modal details, strategic analysis, ratings, terrain charts
 * - MapManagement: Upload, edit, import operations
 * 
 * Original: 72.7KB, 2,059 lines of tangled code
 * New: 4 focused modules + clean orchestrator = Better organization & maintainability
 */
import logger from '/js/utils/logger.js';
import { mapsCore } from './modules/MapsCore.js';
import { mapsGrid } from './modules/MapsGrid.js';
import { MapDetails } from './modules/MapDetails.js';
import { mapManagement } from './modules/MapManagement.js';


// WC3Manager removed - using War3Net system instead

/**
 * Maps System Orchestrator
 * Coordinates all maps modules and provides unified initialization
 */
class MapsSystem {
  constructor() {
    this.initialized = false;
    
    // Create MapDetails instance and set it globally
    this.mapDetailsInstance = new MapDetails();
    window.mapDetails = this.mapDetailsInstance;
    
    // Debug: Check if modules are available
    
    
    // Verify all modules are properly loaded
    if (!mapsCore || !mapsGrid || !MapDetails || !mapManagement) {
      throw new Error('One or more required modules failed to load. Please refresh the page.');
    }
    
    this.modules = {
      core: mapsCore,
      grid: mapsGrid,
      details: this.mapDetailsInstance, // Use the instance instead of the class
      management: mapManagement

      // wc3: removed - using War3Net system instead
    };
    
    // Verify all modules have required methods
    this.verifyModuleMethods();
  }
  
  /**
   * Verify that all modules have required methods
   */
  verifyModuleMethods() {
    const requiredMethods = {
      core: ['init'],
      grid: ['init'],
      details: ['init'],
      management: ['init', 'setupModalCloseButtons']
    };
    
    for (const [moduleName, methods] of Object.entries(requiredMethods)) {
      const module = this.modules[moduleName];
      for (const method of methods) {
        if (!module || typeof module[method] !== 'function') {
          throw new Error(`Module ${moduleName} missing required method: ${method}`);
        }
      }
    }
    

  }

  /**
   * Initialize the complete maps system
   */
  async init() {
    if (this.initialized) {
      
      return;}

    

    try {
      // Debug: Check each module before initialization
      
      
      // Initialize modules in dependency order
      if (this.modules.core && typeof this.modules.core.init === 'function') {
        await this.modules.core.init();
      } else {
        throw new Error('MapsCore module not available or missing init method');
      }
      
      if (this.modules.grid && typeof this.modules.grid.init === 'function') {
        this.modules.grid.init();
      } else {
        throw new Error('MapsGrid module not available or missing init method');
      }
      
      if (this.modules.details && typeof this.modules.details.init === 'function') {
        this.modules.details.init();
      } else {
        throw new Error('MapDetails module not available or missing init method');
      }
      
      if (this.modules.management && typeof this.modules.management.init === 'function') {

        this.modules.management.init();
      } else {
        throw new Error('MapManagement module not available or missing init method');
      }
      

      
      // Initialize ranks modal manager

      
      // WC3 manager removed - using War3Net system instead

      // Initialize game tabs functionality
      this.modules.core.initializeGameTabs();

      // Load initial data
      await this.loadInitialData();

      this.initialized = true;
      
      // Maps System fully initialized
      // All modules loaded and coordinated
      
      // Setup global cleanup
      this.setupGlobalCleanup();

    } catch (error) {
      logger.error('Failed to initialize Maps System', error);
      this.showError(`Failed to initialize maps: ${error.message}`);
    }
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    try {
      
      // Load maps for current tab
      await this.modules.grid.loadMaps();
      
      
    } catch (error) {
      logger.error('Failed to load initial data', error);
      // Don't throw - allow system to continue with empty state
    }
  }

  /**
   * Setup global cleanup handlers
   */
  setupGlobalCleanup() {
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Global error handling
    window.addEventListener('error', (event) => {
      logger.error('Global error in Maps System', event.error);
    });

    // Setup global functions for backward compatibility
    window.mapsSystem = this;
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      modules: {
        core: this.modules.core.getState?.() || { initialized: true },
        grid: { initialized: true },
        details: { initialized: true },
        management: { initialized: true }
      },
      performance: {
        moduleCount: Object.keys(this.modules).length,
        memoryUsage: this.getMemoryUsage()
      }
    };}

  /**
   * Get approximate memory usage
   */
  getMemoryUsage() {
    if (window.performance && window.performance.memory) {
      return {
        used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
      };}
    return { used: 'Unknown', total: 'Unknown' };}

  /**
   * Refresh all data
   */
  async refresh() {
    
    
    try {
      // Re-check authentication
      await this.modules.core.checkAuthStatus();
      
      // Reload maps
      await this.modules.grid.loadMaps();
      

    } catch (error) {
      logger.error('Failed to refresh Maps System', error);
      this.showError(`Failed to refresh: ${error.message}`);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (typeof window.NotificationUtils !== 'undefined') {
      window.NotificationUtils.error(message, 5000);
    } else {
      alert(`Error: ${message}`);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    if (typeof window.NotificationUtils !== 'undefined') {
      window.NotificationUtils.success(message, 3000);
    } else {
      // Success message logged
    }
  }

  /**
   * Cleanup all modules
   */
  cleanup() {
    if (!this.initialized) return;try {
      // Cleanup modules in reverse order
      Object.values(this.modules).reverse().forEach(module => {
        if (module.cleanup && typeof module.cleanup === 'function') {
          module.cleanup();
        }
      });

      

      this.initialized = false;

      
    } catch (error) {
      logger.error('Error during Maps System cleanup', error);
    }
  }
}

// Create singleton instance
const mapsSystem = new MapsSystem();

// Initialize when DOM is ready - SINGLE INITIALIZATION POINT
function initializeMapsSystem() {
  // Prevent double initialization
  if (window.mapsSystemInitialized) {
    
    return;}
  
  try {
    window.mapsSystemInitialized = true;

    mapsSystem.init().catch(error => {
      logger.error('Maps System initialization failed', error);
      // Show user-friendly error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger';
      errorDiv.innerHTML = `
        <strong>Maps System Error:</strong> ${error.message}<br>
        <small>Please refresh the page or contact support if the problem persists.</small>
      `;
      document.body.insertBefore(errorDiv, document.body.firstChild);
    });
  } catch (error) {
    logger.error('Failed to start Maps System', error);
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.innerHTML = `
      <strong>Critical Error:</strong> Failed to start Maps System<br>
      <small>Error: ${error.message}</small><br>
      <small>Please refresh the page or contact support if the problem persists.</small>
    `;
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMapsSystem);
} else {
  // DOM already loaded
  initializeMapsSystem();
}

// Global function for game tab changes
function loadMapsData(gameId) {
  // Loading maps data for game
  
  if (mapsSystem.initialized && mapsSystem.modules.core && mapsSystem.modules.grid) {
    // Update the current game in the core module
    mapsSystem.modules.core.currentGame = gameId;
    
    // Update localStorage to persist the selection
    localStorage.setItem('selectedGame', gameId);
    
    // For War2, ensure we trigger the reload properly
    if (gameId === 'war2') {
      // Force reload for War2 to ensure maps show
      mapsSystem.modules.grid.loadMaps();
    } else if (gameId === 'war3') {
      // Trigger War3 maps reload
      mapsSystem.modules.grid.loadMaps();
    }
    // War1 is handled by WC1Manager, no action needed
    
  } else {
    logger.warn('Maps system not fully initialized yet');
    // If system not ready, try again after a short delay
    setTimeout(() => {
      if (mapsSystem.initialized) {
        loadMapsData(gameId);
      }
    }, 500);
  }
}

// Export for external access
window.mapsSystem = mapsSystem;
window.initializeMapsSystem = initializeMapsSystem;
window.loadMapsData = loadMapsData;

// Maps System loaded - Ready for initialization
// Performance: Modular architecture with focused responsibilities
// Maintainability: 4 clean modules vs 1 monster file

export default mapsSystem; 