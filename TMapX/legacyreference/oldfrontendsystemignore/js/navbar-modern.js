/**
 * Modern Navbar System
 * Handles navigation, mobile menu, and user interactions
 */

// Import centralized logger utility
import logger from '/js/utils/logger.js';

// Create global instance
window.ModernNavbar = class ModernNavbar {
  constructor() {
    this.initialized = false;
    this.dropdownHandlers = new Map();
    this.documentClickHandler = null;
    this.eventListeners = []; // Initialize event listeners array
    this.domElements = {};
    this.cleanupIntervals = []; // Initialize cleanup intervals array
    this.instanceId = Math.random().toString(36).substr(2, 9); // Unique instance ID
    console.log('🔍 Navbar instance created with ID:', this.instanceId);
  }

  async init() {
    // Track load number using sessionStorage
    const loadCount = parseInt(sessionStorage.getItem('navbar_load_count') || '0') + 1;
    sessionStorage.setItem('navbar_load_count', loadCount.toString());
    
    console.log(`🔍 [${this.instanceId}] === NAVBAR INIT LOAD #${loadCount} ===`);
    console.log(`🔍 [${this.instanceId}] Navbar init() called - starting initialization`);
    console.log(`🔍 [${this.instanceId}] Current page:`, window.location.pathname);
    console.log(`🔍 [${this.instanceId}] DOM ready state:`, document.readyState);
    console.log(`🔍 [${this.instanceId}] Already initialized?`, this.initialized);
    console.log(`🔍 [${this.instanceId}] Window.navbar exists?`, !!window.navbar);
    console.log(`🔍 [${this.instanceId}] Performance navigation type:`, performance.navigation?.type);
    
    if (this.initialized) {
      console.log('⚠️ Already initialized, returning early');
      return;
    }
    
    // Set initializing flag to prevent multiple concurrent initializations
    if (this.initializing) {
      console.log('⚠️ Already initializing, returning early');
      return;
    }
    this.initializing = true;

    try {
      console.log('🔍 Step 1: Starting navbar initialization...');
      // Ensure navbar HTML is loaded if not present
      let navbar = document.querySelector('.navbar-modern');
      if (!navbar) {
        console.log('🔍 Navbar HTML not found, attempting to load...');
        try {
          const navbarContainer = document.getElementById('navbar-container');
          if (navbarContainer && !navbarContainer.innerHTML.trim()) {
            const response = await fetch('/components/navbar.html');
            if (response.ok) {
              const navbarHtml = await response.text();
              navbarContainer.innerHTML = navbarHtml;
              navbar = document.querySelector('.navbar-modern');
              console.log('🔍 Navbar HTML loaded dynamically');
            }
          }
        } catch (error) {
          console.error('❌ Failed to load navbar HTML:', error);
        }
      }
      console.log('✅ Step 1: Navbar HTML check complete');

      // Set page-specific data attribute
      const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
      if (navbar) {
        navbar.setAttribute('data-page', currentPage);
      }
      console.log('✅ Step 2: Page-specific data attribute set');

      // Cache DOM elements with retry
      console.log('🔍 Step 3: Caching DOM elements...');
      let retryCount = 0;
      const maxRetries = 5;
      while (retryCount < maxRetries) {
        this.cacheDOMElements();
        if (this.domElements.dropdowns && this.domElements.dropdowns.length > 0) {
          break;
        }
        console.log(`🔍 Retry ${retryCount + 1}/${maxRetries}: Waiting for navbar elements...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
      }
      console.log('✅ Step 3: DOM elements cached');
      
      // Setup dropdowns first
      console.log('🔍 Step 4: Setting up dropdowns...');
      this.setupDropdowns();
      console.log('✅ Step 4: Dropdowns setup complete');
      
      // Setup document click handler to close dropdowns
      console.log('🔍 Step 5: Setting up document click handler...');
      this.setupDocumentClickHandler();
      console.log('✅ Step 5: Document click handler setup complete');
      
      // Setup navigation after dropdowns
      console.log('🔍 Step 6: Setting up navigation...');
      this.setupNavigation();
      console.log('✅ Step 6: Navigation setup complete');
      
      // Setup keyboard navigation
      console.log('🔍 Step 7: Setting up keyboard navigation...');
      this.setupKeyboardNavigation();
      console.log('✅ Step 7: Keyboard navigation setup complete');

      // Dev: pipe key client logs to backend for immediate monitoring
      // DISABLED: This was causing performance issues and blocking UI interactions
      /*
      try {
        const logLevels = ['log','warn','error'];
        const clientLogUrl = 'http://127.0.0.1:3000/client-log';
        logLevels.forEach((lvl) => {
          const orig = console[lvl];
          console[lvl] = function(...args) {
            try {
              fetch(clientLogUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level: lvl, page: window.location.pathname, ts: Date.now(), msgs: args })
              }).catch(()=>{});
            } catch (_) {}
            return orig.apply(console, args);};
        });
      } catch (_) {}
      */
      
      // Check if user data is already available from AuthManager
      console.log('🔍 Step 8: Checking for existing user data...');
      let existingUserData = null;
      if (window._appInstance) {
        const authManager = window._appInstance.getComponent('auth');
        if (authManager && authManager.getUser()) {
          existingUserData = authManager.getUser();
        }
      }
      
      if (existingUserData) {
        console.log('✅ Step 8: Using existing user data');
        this.updateUserDisplay(existingUserData);
      } else {
        console.log('🔍 Step 8: Loading user data...');
        // Load user data
        await this.loadUserData();
        console.log('✅ Step 8: User data loaded');
      }
      
      // Listen for auth state changes
      console.log('🔍 Step 9: Setting up auth state change listener...');
      window.addEventListener('authStateChanged', (event) => {
        if (event.detail && event.detail.user) {
          this.updateUserDisplay(event.detail.user);
        } else {
          this.showGuestState();
        }
      });
      console.log('✅ Step 9: Auth state change listener setup complete');

      // Listen for app ready event
      console.log('🔍 Step 10: Setting up app ready listener...');
      window.addEventListener('appReady', () => {
        // Check if we have auth data after app is ready
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          this.loadUserData();
        }
      });
      console.log('✅ Step 10: App ready listener setup complete');

      const loadCount = parseInt(sessionStorage.getItem('navbar_load_count') || '0');
      console.log(`🔍 [${this.instanceId}] Step 11: About to check admin status... (Load #${loadCount})`);
      try {
        console.log(`🔍 [${this.instanceId}] Current user data:`, this.currentUser);
        console.log(`🔍 [${this.instanceId}] Admin link element found:`, !!this.domElements.adminLink);
        console.log(`🔍 [${this.instanceId}] Admin link element:`, this.domElements.adminLink);
        // Check admin status independently
        await this.checkAdminStatus();
        console.log(`✅ [${this.instanceId}] Step 11: Admin status check completed (Load #${loadCount})`);
      } catch (adminError) {
        console.error(`❌ [${this.instanceId}] Error in admin status check (Load #${loadCount}):`, adminError);
      }

      console.log('🔍 Step 12: Setting initialized flag...');
      this.initialized = true;
      this.initializing = false;
      console.log('✅ Step 12: Navbar initialization complete!');
    } catch (error) {
      logger.error('Error initializing navbar', error);
      this.initializing = false; // Clear flag on error too
    }
  }

  cleanup() {
    // Clear all event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Clear cleanup intervals
    this.cleanupIntervals.forEach(interval => clearInterval(interval));
    this.cleanupIntervals = [];

    // Remove document click handler
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }

    // Clear dropdown handlers
    this.dropdownHandlers.clear();

    this.initialized = false;
  }

  waitForNavbar() {
    return new Promise((resolve) => {
      const checkNavbar = () => {
        const navbar = document.querySelector('.navbar-modern');if (navbar) {
          resolve();
        } else {
          setTimeout(checkNavbar, 100);
        }
      };
      checkNavbar();
    });
  }

  cacheDOMElements() {
    const navbar = document.querySelector('.navbar-modern');
    if (!navbar) {
      logger.error('Navbar element not found');
      return;}

    console.log(`🔍 [${this.instanceId}] Caching DOM elements...`);
    console.log(`🔍 [${this.instanceId}] Navbar found:`, !!navbar);

    this.domElements = {
      navbar,
      dropdowns: navbar.querySelectorAll('.profile-dropdown'),
      mobileMenu: navbar.querySelector('.mobile-menu'),
      mobileToggle: navbar.querySelector('.mobile-toggle'),
      profileImage: navbar.querySelector('#profile-image'),
      profileImageMobile: navbar.querySelector('#profile-image-mobile'),
      username: navbar.querySelector('#navbar-username'),
      usernameMobile: navbar.querySelector('#navbar-username-mobile'),
      adminLink: document.querySelector('#profile-admin-link'),
      logoutItems: navbar.querySelectorAll('.logout-item'),
      logoutApp: navbar.querySelector('#logout-app'),
      logoutLinks: navbar.querySelectorAll('a[href*="logout"]'),
      logoutButtons: navbar.querySelectorAll('button[onclick*="logout"]')
    };

    console.log('🔍 DOM elements cached:');
    console.log('🔍 - dropdowns:', this.domElements.dropdowns.length);
    console.log('🔍 - profileImage:', !!this.domElements.profileImage);
    console.log('🔍 - username:', !!this.domElements.username);
    console.log('🔍 - adminLink:', !!this.domElements.adminLink);
    
    // Check for the actual Town Hall dropdown
    const townhallDropdown = navbar.querySelector('.profile-dropdown');
    console.log('🔍 - townhallDropdown (.profile-dropdown):', !!townhallDropdown);
    
    if (townhallDropdown) {
      const trigger = townhallDropdown.querySelector('.profile-dropdown-toggle');
      const content = townhallDropdown.querySelector('.nav-dropdown-menu');
      console.log('🔍 - trigger (.profile-dropdown-toggle):', !!trigger);
      console.log('🔍 - content (.nav-dropdown-menu):', !!content);
    }
  }

  setupDropdowns() {
    const dropdowns = this.domElements.dropdowns;
    console.log('🔍 Setting up dropdowns, found:', dropdowns.length);
    
    dropdowns.forEach((dropdown, index) => {
      const trigger = dropdown.querySelector('.profile-dropdown-toggle');
      const content = dropdown.querySelector('.nav-dropdown-menu');
      
      console.log(`🔍 Dropdown ${index + 1}:`, {
        trigger: !!trigger,
        content: !!content,
        dropdownClasses: dropdown.className
      });
      
      if (!trigger || !content) {
        console.log(`❌ Dropdown ${index + 1}: Missing trigger or content`);
        return;}

      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎯 Town Hall dropdown clicked!');
        console.log('🎯 Event target:', e.target);
        console.log('🎯 Event target tagName:', e.target.tagName);
        console.log('🎯 Event target className:', e.target.className);
        console.log('🎯 Dropdown element:', dropdown);
        console.log('🎯 Current classes:', dropdown.className);
        console.log('🎯 Event type:', e.type);
        console.log('🎯 Event bubbles:', e.bubbles);
        console.log('🎯 Event cancelable:', e.cancelable);
        
        const isOpen = dropdown.classList.contains('active');
        console.log('🎯 Was open:', isOpen);
        
        // Close all other dropdowns
        dropdowns.forEach(other => {
          if (other !== dropdown) {
            other.classList.remove('active');
          }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('active', !isOpen);
        console.log('🎯 After toggle, classes:', dropdown.className);
        console.log('🎯 Is now open:', dropdown.classList.contains('active'));
        
        // Check if dropdown is visible
        const dropdownMenu = dropdown.querySelector('.nav-dropdown-menu');
        if (dropdownMenu) {
          console.log('🎯 Dropdown menu display:', window.getComputedStyle(dropdownMenu).display);
          console.log('🎯 Dropdown menu visibility:', window.getComputedStyle(dropdownMenu).visibility);
          console.log('🎯 Dropdown menu opacity:', window.getComputedStyle(dropdownMenu).opacity);
          console.log('🎯 Dropdown menu z-index:', window.getComputedStyle(dropdownMenu).zIndex);
        }
      };

      trigger.addEventListener('click', handler);
      this.dropdownHandlers.set(dropdown, handler);
      console.log(`✅ Dropdown ${index + 1}: Click handler attached`);
    });
  }

  setupDocumentClickHandler() {
    this.documentClickHandler = (e) => {
      const dropdowns = this.domElements.dropdowns;
      
      dropdowns.forEach(dropdown => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    };

    document.addEventListener('click', this.documentClickHandler);
  }

  setupKeyboardNavigation() {
    // Keyboard navigation for dropdowns
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close all dropdowns
        this.domElements.dropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    });
  }

  async loadUserData() {
    try {
      // Use the coordinator's single source of truth for user data
      let userData = null;
      
      if (window.coordinator) {
        // Wait for coordinator to load user data
        userData = await window.coordinator.getUserDataPromise();
      } else {
        // Fallback: check localStorage
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          userData = JSON.parse(storedUserData);
        }
      }

      // Update UI with user data
      this.updateUserDisplay(userData);
    } catch (error) {
      logger.error('Failed to load user data:', error);
      this.showGuestState();
    }
  }

  updateUserDisplay(user) {
    if (!user) {
      this.showGuestState();
      return;}

    // Update usernames
    if (this.domElements.username) {
      this.domElements.username.textContent = user.username || 'User';
    }
    if (this.domElements.usernameMobile) {
      this.domElements.usernameMobile.textContent = user.username || 'User';
    }

    // Update profile images
    const avatarUrl = user.avatar || '/assets/img/ranks/emblem.png';
    
    if (this.domElements.profileImage) {
      this.domElements.profileImage.src = avatarUrl;
    }
    if (this.domElements.profileImageMobile) {
      this.domElements.profileImageMobile.src = avatarUrl;
    }

    // Handle admin link
    if (this.domElements.adminLink) {
      if (user.role === 'admin') {
        this.domElements.adminLink.style.display = 'flex';
        this.domElements.adminLink.href = '/admin.html';
        this.domElements.adminLink.target = '_self';
      } else {
        this.domElements.adminLink.style.display = 'none';
      }
    }
  }

  showGuestState() {
    // Reset to guest state
    if (this.domElements.username) {
      this.domElements.username.textContent = 'Guest';
    }
    if (this.domElements.usernameMobile) {
      this.domElements.usernameMobile.textContent = 'Guest';
    }
    
    if (this.domElements.profileImage) {
      this.domElements.profileImage.src = '/assets/img/ranks/emblem.png';
    }
    if (this.domElements.profileImageMobile) {
      this.domElements.profileImageMobile.src = '/assets/img/ranks/emblem.png';
    }
    
    if (this.domElements.adminLink) {
      this.domElements.adminLink.style.display = 'none';
    }
  }

  setupNotifications() {
    // Initialize notifications system
    if (window.NotificationsManager) {
      window.NotificationsManager.init();
    } else {
      // Wait for NotificationsManager to be available
      const checkNotifications = () => {
        if (window.NotificationsManager) {
          window.NotificationsManager.init();
        } else {
          setTimeout(checkNotifications, 100);
        }
      };
      checkNotifications();
    }
  }

  setupLogoutHandling() {
    const logoutSelectors = [
      '.logout-item',
      '#logout-app',
      'a[href*="logout"]',
      'button[onclick*="logout"]'
    ];

    let logoutElementsFound = 0;

    logoutSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach((element, index) => {
        // Check if handler is already attached
        if (element.dataset.logoutHandlerAttached) {
          return;}

        const handler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Set logout flag
          window.isLoggingOut = true;
          
          // Clear user data
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('userData');
          
          // Redirect to login
          window.location.href = '/views/login.html';
        };

        element.addEventListener('click', handler);
        element.dataset.logoutHandlerAttached = 'true';
        logoutElementsFound++;
      });
    });

    // Global logout detector
    document.addEventListener('click', (e) => {
      const target = e.target;
      const isLogoutElement = target.closest('.logout-item') || 
                             target.closest('#logout-app') ||
                             target.closest('a[href*="logout"]') ||
                             target.closest('button[onclick*="logout"]');
      
      if (isLogoutElement && !target.dataset.logoutHandlerAttached) {
        // Manual logout handling
        window.isLoggingOut = true;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userData');
        window.location.href = '/views/login.html';
      }
    });
  }

  setupNavigation() {
    // Handle navigation links
    const navLinks = this.domElements.navbar.querySelectorAll('a[href]');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      
      // Skip external links and logout links
      if (href.startsWith('http') || href.includes('logout')) {
        return;}

      link.addEventListener('click', (e) => {
        // Handle internal navigation
        if (href.startsWith('/') || href.startsWith('./')) {
          e.preventDefault();
          window.location.href = href;
        }
      });
    });

    // Update current page indicator
    this.updateCurrentPageIndicator();
  }

  async checkAdminStatus() {
    const loadCount = parseInt(sessionStorage.getItem('navbar_load_count') || '0');
    console.log(`🔍 [${this.instanceId}] === checkAdminStatus() called on Load #${loadCount} ===`);
    
    try {
      console.log(`🔍 [${this.instanceId}] Making /api/me request...`);
      const response = await fetch('/api/me', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      console.log(`🔍 [${this.instanceId}] /api/me response status:`, response.status);
      
      if (response.ok) {
        const user = await response.json();
        console.log(`🔍 [${this.instanceId}] User data from /api/me:`, user);
        console.log(`🔍 [${this.instanceId}] User role:`, user.role);
        console.log(`🔍 [${this.instanceId}] Admin link available:`, !!this.domElements.adminLink);
        
        if (user.role === 'admin' && this.domElements.adminLink) {
          console.log(`🔍 [${this.instanceId}] ✅ User is admin, showing admin link`);
          this.domElements.adminLink.style.display = 'flex';
          this.domElements.adminLink.href = '/admin.html';
          this.domElements.adminLink.target = '_self';
          console.log(`🔍 [${this.instanceId}] Admin link display set to:`, this.domElements.adminLink.style.display);
        } else {
          console.log(`🔍 [${this.instanceId}] ❌ User is not admin or admin link not found`);
          console.log(`🔍 [${this.instanceId}] User role:`, user.role);
          console.log(`🔍 [${this.instanceId}] Admin link element:`, this.domElements.adminLink);
          if (this.domElements.adminLink) {
            this.domElements.adminLink.style.display = 'none';
            console.log(`🔍 [${this.instanceId}] Admin link hidden`);
          }
        }
      } else {
        console.log(`🔍 [${this.instanceId}] ❌ /api/me request failed:`, response.status);
      }
    } catch (error) {
      console.error(`🔍 [${this.instanceId}] ❌ Failed to check admin status:`, error);
    }
  }

  updateCurrentPageIndicator() {
    const currentPath = window.location.pathname;
    const navLinks = this.domElements.navbar.querySelectorAll('a[href]');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (currentPath === href || currentPath.endsWith(href))) {
        link.classList.add('current-page');
      } else {
        link.classList.remove('current-page');
      }
    });
  }

  cleanup() {
    // Clear all event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Clear cleanup intervals
    this.cleanupIntervals.forEach(interval => clearInterval(interval));
    this.cleanupIntervals = [];

    // Remove document click handler
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }

    // Clear dropdown handlers
    this.dropdownHandlers.clear();

    // Cleanup moths
    if (this.cleanupMoths) {
      this.cleanupMoths();
    }

    this.initialized = false;
  }

  refreshNotifications() {
    if (window.NotificationsManager && window.NotificationsManager.refresh) {
      window.NotificationsManager.refresh();
    }
  }
};

// Initialize navbar when DOM is ready or immediately if already loaded
function bootNavbar() {
  console.log('🔍 bootNavbar() called - tracking initialization path');
  try {
    if (!window.navbar) {
      console.log('🔍 Creating new navbar instance');
      window.navbar = new window.ModernNavbar();
    } else {
      console.log('🔍 Using existing navbar instance');
    }
    console.log('🔍 Calling navbar.init() from bootNavbar');
    window.navbar.init();
  } catch (e) {
    try { console.error('Navbar boot error:', e); } catch (_) {}
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootNavbar);
} else {
  // DOM already ready
  bootNavbar();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.ModernNavbar;
} 