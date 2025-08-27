/**
 * Centralized Application Initialization Coordinator
 * Replaces scattered DOMContentLoaded listeners with a single, prioritized system
 */

import logger from '/js/utils/logger.js';
import authService from '/js/services/AuthenticationService.js';

class InitCoordinator {
  constructor() {
    if (window._initCoordinator) {
      return window._initCoordinator;
    }
    window._initCoordinator = this;

    this.initialized = false;
    this.phase = 'pre-init';
    this.metrics = {
      startTime: performance.now(),
      phaseTimes: new Map(),
      errors: []
    };

    // Loading phases with priorities
    this.phases = {
      critical: {
        name: 'Critical',
        priority: 1,
        tasks: [
          { name: 'console-interception', fn: () => this.setupConsoleInterception() },
          { name: 'jwt-extraction', fn: () => this.extractJWTFromURL() },
          { name: 'navbar-loading', fn: () => this.loadNavbar() },
          { name: 'auth-init', fn: () => this.initializeAuth() }
        ]
      },
      deferred: {
        name: 'Deferred',
        priority: 2,
        tasks: [
          { name: 'moth-system', fn: () => this.initializeMothSystem() },
          { name: 'music-system', fn: () => this.initializeMusicSystem() },
          { name: 'app-core', fn: () => this.initializeAppCore() }
        ]
      },
      pageSpecific: {
        name: 'Page Specific',
        priority: 3,
        tasks: []
      }
    };

    // User data management
    this.userDataPromise = null;
    this.userData = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    performance.mark('coordinator-init-start');
    logger.info('🚀 Initializing Application Coordinator');

    try {
      // Phase 1: Critical (must complete first)
      await this.executePhase('critical');
      
      // Phase 2: Deferred (can load in background)
      this.executePhase('deferred').catch(error => {
        logger.error('Deferred phase error (non-blocking):', error);
        this.metrics.errors.push({ phase: 'deferred', error });
      });

      // Phase 3: Page Specific (lazy loaded)
      this.executePhase('pageSpecific').catch(error => {
        logger.error('Page specific phase error (non-blocking):', error);
        this.metrics.errors.push({ phase: 'pageSpecific', error });
      });

      this.initialized = true;
      performance.mark('coordinator-init-end');
      performance.measure('coordinator-initialization', 'coordinator-init-start', 'coordinator-init-end');

      // Dispatch app ready event
      window.dispatchEvent(new CustomEvent('appReady', { 
        detail: { 
          coordinator: this,
          metrics: this.metrics 
        } 
      }));

      logger.info('✅ Application Coordinator initialized successfully');

    } catch (error) {
      logger.error('❌ Coordinator initialization failed:', error);
      this.metrics.errors.push({ phase: 'critical', error });
      throw error;
    }
  }

  async executePhase(phaseName) {
    const phase = this.phases[phaseName];
    if (!phase) {
      throw new Error(`Unknown phase: ${phaseName}`);
    }

    performance.mark(`${phaseName}-start`);
    logger.info(`🔄 Executing ${phase.name} phase...`);

    const startTime = performance.now();

    try {
      // Execute tasks in parallel for better performance
      const taskPromises = phase.tasks.map(async (task) => {
        const taskStart = performance.now();
        try {
          await task.fn();
          const taskTime = performance.now() - taskStart;
          logger.info(`✅ ${task.name} completed in ${taskTime.toFixed(2)}ms`);
        } catch (error) {
          logger.error(`❌ ${task.name} failed:`, error);
          throw error;
        }
      });

      await Promise.all(taskPromises);

      const phaseTime = performance.now() - startTime;
      this.metrics.phaseTimes.set(phaseName, phaseTime);
      
      performance.mark(`${phaseName}-end`);
      performance.measure(`${phaseName}-phase`, `${phaseName}-start`, `${phaseName}-end`);

      logger.info(`✅ ${phase.name} phase completed in ${phaseTime.toFixed(2)}ms`);

    } catch (error) {
      const phaseTime = performance.now() - startTime;
      this.metrics.phaseTimes.set(phaseName, phaseTime);
      logger.error(`❌ ${phase.name} phase failed after ${phaseTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  // Phase 1: Critical Tasks
  setupConsoleInterception() {
    // Console interception for AI assistant
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };

    function sendLogToAI(level, ...args) {
      try {
        const payload = {
          level: level,
          page: window.location.pathname,
          ts: new Date().toISOString(),
          msgs: args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (arg instanceof Error) return arg.message;
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          })
        };

        fetch('/client-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (e) {
        originalConsole.error('Error in sendLogToAI:', e);
      }
    }

    // Override console methods
    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && (args[0].includes('✅') || args[0].includes('🔍') || args[0].includes('🎯'))) {
        originalConsole.log.apply(console, args);
      }
    };

    console.warn = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('⚠️')) {
        originalConsole.warn.apply(console, args);
      }
    };

    console.error = function(...args) {
      originalConsole.error.apply(console, args);
      try { sendLogToAI('error', ...args); } catch (_) {}
    };

    console.info = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('🎯')) {
        originalConsole.info.apply(console, args);
      }
    };

    // Capture unhandled errors
    window.addEventListener('error', function(event) {
      sendLogToAI('error', `Unhandled error: ${event.message} at ${event.filename}:${event.lineno}`);
    });

    window.addEventListener('unhandledrejection', function(event) {
      sendLogToAI('error', `Unhandled promise rejection: ${event.reason}`);
    });
  }

  extractJWTFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('authToken') || urlParams.get('token');
    
    if (authToken) {
      localStorage.setItem('authToken', authToken);
      document.cookie = `authToken=${authToken}; path=/; max-age=86400; SameSite=Strict`;
      
      // Clean up URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('authToken');
      newUrl.searchParams.delete('token');
      window.history.replaceState({}, '', newUrl);
    }
  }

  async loadNavbar() {
    try {
      const navbarContainer = document.getElementById('navbar-container');
      if (!navbarContainer) {
        logger.warn('Navbar container not found');
        return;
      }
      
      const response = await fetch('/components/navbar.html');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const navbarHtml = await response.text();
      navbarContainer.innerHTML = navbarHtml;
      
      // Execute any script tags that were injected
      const scripts = navbarContainer.querySelectorAll('script');
      
      for (const script of scripts) {
        if (script.src) {
          const newScript = document.createElement('script');
          newScript.type = script.type || 'text/javascript';
          newScript.src = script.src;
          
          if (script.type === 'module') {
            script.remove();
            document.head.appendChild(newScript);
          } else {
            document.head.appendChild(newScript);
          }
        } else if (script.textContent) {
          try {
            eval(script.textContent);
          } catch (error) {
            logger.error('Error executing inline script in navbar', error);
          }
        }
      }

      // Fallback: explicitly import navbar module if not initialized
      if (!window.navbar || !window.navbar.initialized) {
        await import('/js/navbar-modern.js');
        if (window.navbar && !window.navbar.initialized) {
          window.navbar.init();
        }
      }
    } catch (error) {
      logger.error('Failed to load navbar HTML', error);
      throw error;
    }
  }

  async initializeAuth() {
    try {
      // Use the consolidated AuthenticationService
      await authService.init();
      
      // Get user data from the service
      this.userData = authService.getUser();
      this.userDataPromise = Promise.resolve(this.userData);
      
      // Set global access for backward compatibility
      window.userData = this.userData;
      
      // Listen for auth state changes
      authService.addListener((event, data) => {
        if (event === 'login') {
          this.userData = data;
          window.userData = data;
          window.dispatchEvent(new CustomEvent('userDataLoaded', { 
            detail: { userData: data } 
          }));
        } else if (event === 'logout') {
          this.userData = null;
          window.userData = null;
          window.dispatchEvent(new CustomEvent('userDataLoaded', { 
            detail: { userData: null } 
          }));
        }
      });
      
      // Dispatch initial user data loaded event
      window.dispatchEvent(new CustomEvent('userDataLoaded', { 
        detail: { userData: this.userData } 
      }));
      
      logger.info('✅ Authentication initialized via AuthenticationService');
    } catch (error) {
      logger.error('❌ Failed to initialize authentication:', error);
      // Don't throw - auth can fail gracefully
    }
  }

  // User data is now managed by AuthenticationService
  // This method is maintained for backward compatibility
  async fetchUserDataOnce() {
    if (authService.isInitialized) {
      return authService.getUser();
    }
    
    // Wait for service to initialize if needed
    await authService.init();
    return authService.getUser();
  }

  // Phase 2: Deferred Tasks
  async initializeMothSystem() {
    try {
      // Moth system is loaded via import in main.js
      // Just ensure it's initialized
      if (window.mothSystemManager && !window.mothSystemManager.initialized) {
        await window.mothSystemManager.init();
      }
    } catch (error) {
      logger.error('Moth system initialization failed:', error);
    }
  }

  async initializeMusicSystem() {
    try {
      // Music system initialization
      if (window.MusicManager && !window.MusicManager.initialized) {
        window.MusicManager.init();
      }
    } catch (error) {
      logger.error('Music system initialization failed:', error);
    }
  }

  async initializeAppCore() {
    try {
      // Initialize app.js if not already done
      if (window.app && !window.app.initialized) {
        await window.app.init();
      }
    } catch (error) {
      logger.error('App core initialization failed:', error);
    }
  }

  // Public API
  getUserData() {
    return this.userData;
  }

  getUserDataPromise() {
    return this.userDataPromise;
  }

  getMetrics() {
    return this.metrics;
  }

  addPageSpecificTask(task) {
    this.phases.pageSpecific.tasks.push(task);
  }
}

// Initialize coordinator when DOM is ready
function initializeCoordinator() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.coordinator = new InitCoordinator();
      window.coordinator.init();
    });
  } else {
    window.coordinator = new InitCoordinator();
    window.coordinator.init();
  }
}

// Start initialization
initializeCoordinator();

export default InitCoordinator;
