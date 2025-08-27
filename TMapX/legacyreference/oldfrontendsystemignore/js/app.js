/**
 * Optimized Application Core
 * Single source of truth for application state and initialization
 */
import logger from '/js/utils/logger.js';

// Application class - loaded as regular script

class Application {
  constructor() {
    if (window._appInstance) {
  
      return window._appInstance;
    }
    window._appInstance = this;

    // Use WeakMap for private state
    this._state = new WeakMap();
    this._state.set(this, {
      isInitialized: false,
  
      loadStartTime: performance.now(),
      components: new Map(),
      initQueue: new Set(),
      deferredModules: new Set()
    });

    // Performance monitoring
    this._metrics = {
      initTime: 0,
      componentLoadTimes: new Map(),
      resourceLoadTimes: new Map()
    };
  }

  async init() {
    const state = this._state.get(this);
    if (state.isInitialized) {
          return;
    }


    performance.mark('app-init-start');

    try {
      // Load ApiClient first and make it globally available
      await this._loadApiClientFirst();
      
      // Initialize core features in parallel
      await Promise.all([
        this._initCriticalFeatures(),
        this._initDeferredFeatures()
      ]);

      // Mark initialization complete
      state.isInitialized = true;
      performance.mark('app-init-end');
      performance.measure('app-initialization', 'app-init-start', 'app-init-end');
      
      this._metrics.initTime = performance.now() - state.loadStartTime;


      // Emit ready event
      window.dispatchEvent(new CustomEvent('app:ready', { 
        detail: { metrics: this._metrics } 
      }));

    } catch (error) {
      logger.error('❌ Application initialization failed:', error);
      this._handleInitError(error);
    }
  }

  async _loadApiClientFirst() {

    const startTime = performance.now();
    
    try {
      const module = await import('./modules/ApiClient.js');
      
      // ApiClient exports a singleton instance as default
      const apiClient = module.default;
      
      // Make it globally available immediately
      window.apiClient = apiClient;
      window.ApiClient = module.ApiClient; // Export the class too
      
      const loadTime = performance.now() - startTime;

      
      // Store in components map
      this._state.get(this).components.set('api', apiClient);
      
    } catch (error) {
      logger.error('❌ Failed to load ApiClient:', error);
      throw error;
    }
  }

  async _initCriticalFeatures() {
    const state = this._state.get(this);
    
    // Critical features that must load first (ApiClient is already loaded)
    const criticalModules = [
      ['auth', () => import('./modules/AuthManager.js')],
      ['ui', () => import('./modules/UIManager.js')]
    ];

    // Load critical modules in parallel
    const moduleLoads = criticalModules.map(async ([name, importFn]) => {
      const startTime = performance.now();
      try {
        const module = await importFn();
        
        // Handle different module export patterns
        let instance;
        if (module.default && typeof module.default === 'function') {
          // Module exports a class constructor
          instance = new module.default();
        } else if (module.default && typeof module.default === 'object' && !module.default.prototype) {
          // Module exports a singleton instance
          instance = module.default;
        } else if (module[name] && typeof module[name] === 'object') {
          // Module exports a named singleton (e.g., module.authManager)
          instance = module[name];
        } else {
          // Try to find any exported class or instance
          const exportedKeys = Object.keys(module);
          const classKey = exportedKeys.find(key => 
            typeof module[key] === 'function' && 
            module[key].prototype && 
            module[key].prototype.constructor
          );
          
          if (classKey) {
            instance = new module[classKey]();
          } else {
            throw new Error(`No suitable export found in ${name} module`);
          }
        }
        
        state.components.set(name, instance);
        
        const loadTime = performance.now() - startTime;
        this._metrics.componentLoadTimes.set(name, loadTime);
        
  
      } catch (error) {
        logger.error(`❌ Failed to load ${name}:`, error);
        throw error;
      }
    });

    await Promise.all(moduleLoads);
  }

  async _initDeferredFeatures() {
    const state = this._state.get(this);
    
    // Features that can load after critical ones
    const deferredModules = [
      ['achievements', './core/AchievementEngine.js'],
      ['chat', './modules/ChatManager.js'],
      ['maps', './modules/MapsCore.js']
      // Temporarily disabled UnifiedProfileManager to fix navbar
      // ['profile', './modules/UnifiedProfileManager.js']
    ];

    // Queue deferred modules for lazy loading
    deferredModules.forEach(([name, path]) => {
      state.deferredModules.add({ name, path });
    });

    // Start loading first deferred module
    this._loadNextDeferredModule();
  }

  async _loadNextDeferredModule() {
    const state = this._state.get(this);
    const nextModule = state.deferredModules.values().next().value;
    
    if (!nextModule) return;

    const startTime = performance.now();
    try {
      const module = await import(nextModule.path);
      
      // Handle different module export patterns
      let instance;
      if (nextModule.name === 'achievements') {
        // AchievementEngine exports a singleton instance
        instance = module.achievementEngine;
      } else if (nextModule.name === 'chat') {
        // ChatManager exports a singleton instance
        instance = module.chatManager;
      } else if (nextModule.name === 'maps') {
        // MapsCore exports a singleton instance
        instance = module.mapsCore;
      } else if (nextModule.name === 'profile') {
        // ProfileManager exports a singleton instance
        try {
          instance = module.unifiedProfileManager || module.profileManager || module.default;
        } catch (error) {
          console.error('Failed to get profile manager instance:', error);
          // Create a minimal fallback
          instance = {
            currentUser: null,
            currentPlayers: new Map(),
            getUserPlayers: () => []
          };
        }
      } else if (module.default && typeof module.default === 'function') {
        // Module exports a class constructor
        instance = new module.default();
      } else if (module.default && typeof module.default === 'object' && !module.default.prototype) {
        // Module exports a singleton instance
        instance = module.default;
      } else {
        // Try to find any exported class or instance
        const exportedKeys = Object.keys(module);
        const classKey = exportedKeys.find(key => 
          typeof module[key] === 'function' && 
          module[key].prototype && 
          module[key].prototype.constructor
        );
        
        if (classKey) {
          instance = new module[classKey]();
        } else {
          // Try to find a named export that matches the module name
          const namedKey = exportedKeys.find(key => 
            key.toLowerCase().includes(nextModule.name.toLowerCase())
          );
          
          if (namedKey && typeof module[namedKey] === 'object') {
            instance = module[namedKey];
          } else {
            throw new Error(`No suitable export found in ${nextModule.name} module`);
          }
        }
      }
      
      state.components.set(nextModule.name, instance);
      
      const loadTime = performance.now() - startTime;
      this._metrics.componentLoadTimes.set(nextModule.name, loadTime);
      
      state.deferredModules.delete(nextModule);

      
      // Load next module
      if (state.deferredModules.size > 0) {
        setTimeout(() => this._loadNextDeferredModule(), 100);
      }
    } catch (error) {
      logger.error(`❌ Failed to load ${nextModule.name}:`, error);
      state.deferredModules.delete(nextModule);
      
      // Continue with next module even if this one fails
      if (state.deferredModules.size > 0) {
        setTimeout(() => this._loadNextDeferredModule(), 100);
      }
    }
  }



  _handleInitError(error) {
    // Log error details
    logger.error('Application initialization failed:', {
      error,
      metrics: this._metrics,
      state: this._state.get(this)
    });

    // Show user-friendly error
    const errorContainer = document.createElement('div');
    errorContainer.className = 'app-error';
    errorContainer.innerHTML = `
      <h2>Application Error</h2>
      <p>Failed to initialize the application. Please try refreshing the page.</p>
      ${error.message ? `<pre>${error.message}</pre>` : ''}
    `;
    document.body.appendChild(errorContainer);
  }

  // Public API for accessing components
  getComponent(name) {
    return this._state.get(this).components.get(name);
  }

  // Clean up resources
  destroy() {

    this._state.delete(this);
    window._appInstance = null;
  }
}

// Initialize the application
const app = new Application();

// Make it globally available
window.app = app;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for module systems
export default Application;

// Global ladder initialization function
window.initializeLadder = async function() {
  
  
  try {
    // Wait for the application to be ready
    if (!window._appInstance || !window._appInstance._state.get(window._appInstance).isInitialized) {
  
      await new Promise(resolve => {
        const checkReady = () => {
          if (window._appInstance && window._appInstance._state.get(window._appInstance).isInitialized) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
    }
    
    // Initialize ladder managers
    if (!window.ladderManager) {
      try {
        const { LadderManager } = await import('./modules/LadderManager.js');
        window.ladderManager = new LadderManager();
  
      } catch (error) {
        logger.error('❌ Failed to initialize LadderManager:', error);
      }
    }
    

    
    // Initialize Match Reporting Enhancements (canvas victory overlay, suggestions, etc.)
    try {
      const { matchReportingEnhancements } = await import('./modules/MatchReportingEnhancements.js');
      if (matchReportingEnhancements && typeof matchReportingEnhancements.initialize === 'function') {
        await matchReportingEnhancements.initialize();
  
      }
    } catch (error) {
      logger.error('❌ Failed to initialize MatchReportingEnhancements:', error);
    }

    // Ensure player modal functions are available
    if (!window.showPlayerDetails && !window.openPlayerDetailsModal) {
      try {
        // Load playerDetails.js if not already loaded
        if (typeof window.openPlayerDetailsModal === 'undefined') {
      
          // The playerDetails.js script should already be loaded, but let's ensure the functions are available
          if (typeof window.openPlayerDetailsModal === 'undefined') {
            // Create a fallback function
            window.openPlayerDetailsModal = async function(playerName) {
        
              if (window.modalManager) {
                window.showLoadingModal('Loading player details...');
                try {
                  const response = await fetch(`/api/matches/player/${encodeURIComponent(playerName)}`);
                  if (response.ok) {
                    const data = await response.json();
                    // Create a simple modal for now
                    window.modalManager.createModal({
                      id: 'player-stats-modal',
                      title: `Player: ${playerName}`,
                      content: `<div>Loading player details for ${playerName}...</div>`,
                      size: 'lg'
                    });
                    window.modalManager.show('player-stats-modal');
                  } else {
                    throw new Error('Failed to load player data');
                  }
                } catch (error) {
                  logger.error('Error loading player data:', error);
                  window.showErrorModal(`Failed to load player details: ${error.message}`);
                } finally {
                  window.hideLoadingModal();
                }
              } else {
                alert(`Player: ${playerName}\n\nPlayer modal system not available.`);
              }
            };
          }
        }
        
        // Ensure showPlayerDetails is available
        window.showPlayerDetails = window.showPlayerDetails || window.openPlayerDetailsModal;
        
  
      } catch (error) {
        logger.error('❌ Failed to load player modal functions:', error);
      }
    }
    
    // Add global handlePlayerClick function for consistency
    window.handlePlayerClick = async function(playerName) {
  
      
      // Try to open player modal with available functions
      try {
        if (window.showPlayerDetails) {
  
          await window.showPlayerDetails(playerName);
        } else if (window.openPlayerDetailsModal) {
  
          await window.openPlayerDetailsModal(playerName);
        } else {
          logger.warn('⚠️ No player modal functions available, redirecting to arena...');
          // Fallback: redirect to arena page with player search
          window.location.href = `/views/arena.html?search=${encodeURIComponent(playerName)}`;
        }
      } catch (error) {
        logger.error('❌ Error opening player modal:', error);
        // Fallback: redirect to arena page with player search
          window.location.href = `/views/arena.html?search=${encodeURIComponent(playerName)}`;
        }
      };
      
      
      
    } catch (error) {
      logger.error('❌ Ladder initialization failed:', error);
    }
  }; 