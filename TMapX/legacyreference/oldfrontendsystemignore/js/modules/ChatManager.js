/**
 * Universal Chat Manager
 * Handles all chat contexts: global rooms, clan chat, private messages, notifications
 */

import { apiClient } from './ApiClient.js';
import { EmojiPicker } from './EmojiPicker.js';
import { globalLogger } from '../utils/logger.js';

export class ChatManager {
  constructor() {
    // Prevent multiple instances
    if (window._chatManagerInstance) {

      return window._chatManagerInstance;}
    
    // Mark this as the global instance
    window._chatManagerInstance = this;
    
                // Initialize logger - use globalLogger directly
            this.logger = globalLogger;
    
    // Initialize API client
    this.api = apiClient;
    this.socket = null;
    this.currentUser = null;
    this.socketAuthenticated = false;
    this.activeContext = 'global'; // global, clan, private, group
    this.currentGameType = 'wc2'; // Default to WC2
    this.contextHistory = [];
    this.unreadCounts = {
      global: 0,
      clan: 0,
      private: 0,
      group: 0
    };
    this.messageCache = {
      global: {
        wc1: [],
        wc2: [],
        wc3: []
      },
      clan: [],
      private: [],
      group: []
    };
    this.isMinimized = false;
    this.isInitialized = false;
    this.isActive = false; // Track if chat is active/connected
    this.isIconOnly = true; // Start in icon-only mode (closed by default)
    
    // Chat contexts management
    this.contexts = new Map();
    this.notifications = [];
    
    // UI elements
    this.floatingWindow = null;
    this.floatingChatIcon = null;
    this.mainChatPage = null;
    this.notificationBadge = null;
    
    // Performance optimizations
    this.domCache = new Map(); // Cache DOM elements
    this.eventListeners = new Map(); // Track event listeners for cleanup
    this.debounceTimers = new Map(); // Debounce timers - using global debounce utility
    this.batchUpdateQueue = []; // Batch DOM updates

    
    // Initialize emoji picker
    this.emojiPicker = new EmojiPicker(this);
    
    // Store friends data for context menu logic
    this.friendsList = [];
    

    
    // Initialize in closed state - only create icon, don't connect or make API calls
    this.initClosedSync();
    

  }


  setupPerformanceMonitoring() {
    // Clear any existing intervals
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    if (this.domMonitorInterval) {
      clearInterval(this.domMonitorInterval);
    }
    
    // Monitor memory usage
    if (performance.memory) {
      this.memoryMonitorInterval = setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
          this.cleanupMemory();
        }
      }, 30000); // Check every 30 seconds
    }
    
    // Monitor DOM node count
    this.domMonitorInterval = setInterval(() => {
      const nodeCount = document.getElementsByTagName('*').length;
      if (nodeCount > 1000) { // 1000 nodes threshold
        this.cleanupDOM();
      }
    }, 60000); // Check every minute
  }

  /**
   * Cleanup memory when usage is high
   */
  cleanupMemory() {
    // Clear old message cache
    Object.keys(this.messageCache).forEach(context => {
      if (context === 'global') {
        Object.keys(this.messageCache[context]).forEach(game => {
          if (this.messageCache[context][game].length > 25) {
            this.messageCache[context][game] = this.messageCache[context][game].slice(-25);
          }
        });
      } else if (this.messageCache[context].length > 25) {
        this.messageCache[context] = this.messageCache[context].slice(-25);
      }
    });
    
    // Clear localStorage cache
    try {
      const cached = JSON.parse(localStorage.getItem('chatCachedMessages') || '{}');
      Object.keys(cached).forEach(context => {
        if (context === 'global') {
          Object.keys(cached[context]).forEach(game => {
            if (cached[context][game].length > 25) {
              cached[context][game] = cached[context][game].slice(-25);
            }
          });
        } else if (cached[context].length > 25) {
          cached[context] = cached[context].slice(-25);
        }
      });
      localStorage.setItem('chatCachedMessages', JSON.stringify(cached));
    } catch (error) {
      console.error('Failed to cleanup localStorage cache:', error);
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Cleanup DOM when node count is high
   */
  cleanupDOM() {
    // Remove old messages from DOM
    const messageContainers = ['global-messages', 'clan-messages', 'private-messages', 'group-messages'];
    messageContainers.forEach(containerId => {
      const container = this.floatingWindow?.querySelector(`#${containerId}`);
      if (container) {
        const messages = container.querySelectorAll('.message');
        if (messages.length > 50) {
          const messagesToRemove = messages.length - 50;
          for (let i = 0; i < messagesToRemove; i++) {
            if (messages[i] && !messages[i].classList.contains('welcome-message')) {
              messages[i].remove();
            }
          }
        }
      }
    });
  }

  /**
   * Use global debounce utility instead of local implementation
   */
  get debouncedSaveToLocalStorage() {
    // Use global debounce utility if available, fallback to local
    if (window.debounce) {
      return window.debounce(() => this.saveToLocalStorage(), 1000);}
    // Fallback to local debounce implementation
    return this._localDebounce(() => this.saveToLocalStorage(), 1000);}

  /**
   * Get cached DOM element or query and cache it
   */
  getElement(selector, context = this.floatingWindow) {
    const cacheKey = `${context === this.floatingWindow ? 'window' : 'document'}:${selector}`;
    
    if (!this.domCache.has(cacheKey)) {
      const element = context ? context.querySelector(selector) : document.querySelector(selector);
      this.domCache.set(cacheKey, element);
    }
    
    return this.domCache.get(cacheKey);}

  /**
   * Get cached DOM elements or query and cache them
   */
  getElements(selector, context = this.floatingWindow) {
    const cacheKey = `${context === this.floatingWindow ? 'window' : 'document'}:${selector}:all`;
    
    if (!this.domCache.has(cacheKey)) {
      const elements = context ? context.querySelectorAll(selector) : document.querySelectorAll(selector);
      this.domCache.set(cacheKey, elements);
    }
    
    return this.domCache.get(cacheKey);}

  /**
   * Clear DOM cache when elements change
   */
  clearDOMCache() {
    this.domCache.clear();
  }

  /**
   * Centralized error messages to reduce duplication
   */
  get errorMessages() {
    return {
      SEND_MESSAGE_FAILED: 'Failed to send message. Please try again.',
      SEND_PRIVATE_MESSAGE_FAILED: 'Failed to send private message. Please try again.',
      SEND_CLAN_MESSAGE_FAILED: 'Failed to send clan message. Please try again.',
      SEND_GROUP_MESSAGE_FAILED: 'Failed to send group message. Please try again.',
      SEND_ROOM_MESSAGE_FAILED: 'Failed to send room message. Please try again.',
      NOT_CONNECTED: 'Not connected to chat server',
      NOT_CONNECTED_TRY_AGAIN: 'Not connected to chat server. Please try again.',
      LOAD_CONVERSATION_FAILED: 'Failed to load conversation',
      LOAD_FRIENDS_FAILED: 'Failed to load friends data',
      INVALID_USER_ID: 'Invalid user ID. Please refresh and try again.',
      INVALID_CHAT_RECIPIENT: 'Invalid chat recipient',
      SELECT_USER_FIRST: 'Please select a user to chat with first',
      ROOM_NAME_REQUIRED: 'Please enter a room name',
      ROOM_NAME_TOO_SHORT: 'Room name must be at least 3 characters',
      ROOM_NAME_TOO_LONG: 'Room name must be less than 50 characters',
      MUST_BE_LOGGED_IN: 'You must be logged in to create a chat room',
      CLOSE_ROOM_FAILED: 'Failed to close room',
      OPEN_CLAN_CHAT_FAILED: 'Failed to open clan chat. Please try again.'
    };}

  /**
   * Add event listener with automatic cleanup tracking
   */
  addEventListenerWithCleanup(element, event, handler, options = {}) {
    if (!element) return;element.addEventListener(event, handler, options);
    
    // Track for cleanup
    const key = `${element.id || element.className || 'unknown'}:${event}`;
    this.eventListeners.set(key, {
      element,
      type: event,
      handler,
      options
    });
  }

  /**
   * Remove specific event listener
   */
  removeEventListenerWithCleanup(element, event, handler) {
    if (!element) return;element.removeEventListener(event, handler);
    
    // Remove from tracking
    const key = `${element.id || element.className || 'unknown'}:${event}`;
    this.eventListeners.delete(key);
  }

  /**
   * Toggle active state for tabs and content
   */
  toggleActiveState(elements, activeElement, activeClass = 'active') {
    if (!Array.isArray(elements)) {
      elements = [elements];
    }
    
    elements.forEach(element => {
      if (element && element.classList) {
        element.classList.remove(activeClass);
      }
    });
    
    if (activeElement && activeElement.classList) {
      activeElement.classList.add(activeClass);
    }
  }

  /**
   * Update tab states (remove active from all, add to specific)
   */
  updateTabStates(tabs, activeTab, contentElements = null, activeContent = null) {
    // Update tab states
    this.toggleActiveState(tabs, activeTab);
    
    // Update content states if provided
    if (contentElements && activeContent) {
      this.toggleActiveState(contentElements, activeContent);
    }
  }

  /**
   * Add socket event listener with automatic cleanup
   */
  addSocketListener(event, handler, options = {}) {
    if (!this.socket) return;if (options.once) {
      this.socket.once(event, handler);
    } else {
      this.socket.on(event, handler);
    }
    
    // Track for cleanup
    const key = `socket:${event}`;
    this.eventListeners.set(key, {
      element: this.socket,
      type: event,
      handler,
      options
    });
  }

  /**
   * Remove socket event listener
   */
  removeSocketListener(event, handler) {
    if (!this.socket) return;this.socket.off(event, handler);
    
    // Remove from tracking
    const key = `socket:${event}`;
    this.eventListeners.delete(key);
  }

  /**
   * Toggle panel visibility
   */
  togglePanel(panel, button, showClass = 'show') {
    if (!panel || !button) return false;const isVisible = panel.classList.contains(showClass);
    
    if (isVisible) {
      panel.classList.remove(showClass);
      button.classList.remove('active');
      return false;} else {
      panel.classList.add(showClass);
      button.classList.add('active');
      return true;}
  }

  /**
   * Hide all panels
   */
  hideAllPanels(panels, buttons, showClass = 'show') {
    if (!Array.isArray(panels)) panels = [panels];
    if (!Array.isArray(buttons)) buttons = [buttons];
    
    panels.forEach(panel => {
      if (panel && panel.classList) {
        panel.classList.remove(showClass);
      }
    });
    
    buttons.forEach(button => {
      if (button && button.classList) {
        button.classList.remove('active');
      }
    });
  }

  /**
   * HTML Templates to reduce duplication
   */
  get templates() {
    return {
      loadingSpinner: (text = 'Loading...') => `
        <div class="chat-loading">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <p>${text}</p>
        </div>
      `,
      
      noResults: (message = 'No results found') => `
        <div class="no-results">${message}</div>
      `,
      
      errorMessage: (message, showRetry = true) => `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message}</p>
          ${showRetry ? '<button onclick="location.reload()" class="retry-btn">Retry</button>' : ''}
        </div>
      `,
      
      emptyState: (message, icon = 'info-circle') => `
        <div class="empty-state" style="padding: 20px;text-align: center; color: #888; font-style: italic;">
          <i class="fas fa-${icon}"></i>
          <p>${message}</p>
        </div>
      `,
      
      button: (text, icon = null, classes = '', disabled = false) => `
        <button class="${classes}" ${disabled ? 'disabled' : ''}>
          ${icon ? `<i class="fas fa-${icon}"></i> ` : ''}${text}
        </button>
      `,
      
      tab: (text, icon = null, dataAttributes = {}) => {
        const dataAttrs = Object.entries(dataAttributes)
          .map(([key, value]) => `data-${key}="${value}"`)
          .join(' ');
        return `
          <div class="context-tab" ${dataAttrs}>
            ${icon ? `<i class="fas fa-${icon}"></i> ` : ''}${text}
          </div>
        `;}
    };
  }

  /**
   * Validation utilities to reduce duplication
   */
  get validators() {
    return {
      isValidText: (text, minLength = 1) => {
        return text && typeof text === 'string' && text.trim().length >= minLength;},
      
      isValidUsername: (username) => {
        return this.validators.isValidText(username, 3) && /^[a-zA-Z0-9_-]+$/.test(username);},
      
      isValidRoomName: (roomName) => {
        return this.validators.isValidText(roomName, 3) && roomName.length <= 50;},
      
      isConnected: () => {
        return this.socket && this.socket.connected;},
      
      hasUser: () => {
        return this.currentUser && this.currentUser.id;}
    };
  }

  /**
   * Window state management utilities
   */
  get windowState() {
    return {
      minimize: () => {
        if (this.floatingWindow) {
          this.floatingWindow.classList.add('minimized');this.floatingWindow.style.height = '60px';
          this.floatingWindow.style.width = '280px';
          this.isMinimized = true;
        }
      },
      
      expand: () => {
        if (this.floatingWindow) {
          this.floatingWindow.classList.remove('minimized');
          this.floatingWindow.style.height = '';
          this.floatingWindow.style.width = '';
          this.isMinimized = false;
        }
      },
      
      toggle: () => {
        if (this.isMinimized) {
          this.windowState.expand();
        } else {
          this.windowState.minimize();
        }
      },
      
      hide: () => {
        if (this.floatingWindow) {
          this.floatingWindow.style.display = 'none';
        }
      },
      
      show: () => {
        if (this.floatingWindow) {
          this.floatingWindow.style.display = 'flex';
        }
      }
    };
  }

  /**
   * Centralized logging utility
   */
  get logger() {
    return {
      success: (message, data = null) => {
        // Only log critical success messages
        if (message.includes('connected') || message.includes('authenticated')) {
          console.log(`✅ ${message}`, data || '');}
      },
      
      info: (message, data = null) => {
        // Only log important info messages
        if (message.includes('initialized') || message.includes('ready')) {
          console.log(`💬 ${message}`, data || '');
        }
      },
      
      warning: (message, data = null) => {
        // Only log warnings for actual issues
        if (!message.includes('retry') && !message.includes('attempt')) {
          console.warn(`⚠️ ${message}`, data || '');
        }
      },
      
      error: (message, data = null) => {
        // Always log errors
        console.error(`❌ ${message}`, data || '');
      },
      
      debug: (message, data = null) => {
        // Only log debug in development mode
        if (this.debugMode && message.includes('critical')) {
          console.log(`🔍 ${message}`, data || '');
        }
      }
    };
  }

  /**
   * Message loading utilities to reduce duplication
   */
  get messageLoader() {
    return {
      // Common headers for API requests
      getHeaders: () => {
        const authToken = localStorage.getItem('authToken');const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        return headers;},
      
      // Generic message loading with error handling
      loadMessages: async (url, containerId, options = {}) => {
        try {
          const response = await fetch(url, {
            headers: this.messageLoader.getHeaders(),
            credentials: 'include',
            ...options
          });
          
          if (response.ok) {
            const data = await response.json();
            const messages = data.data || data || [];
            this.displayMessages(messages, containerId);
            return { success: true, messages };} else {
            this.logger.warning(`API returned unsuccessful response: ${response.status}`);return { success: false, error: `HTTP ${response.status}` };}
        } catch (error) {
          this.logger.error(`Failed to load messages from ${url}:`, error);
          return { success: false, error: error.message };}
      },
      
      // Show loading state for any container
      showLoadingState: (containerId, message = 'Loading messages...') => {
        const container = this.getElement(`#${containerId}`);
        if (container) {
          container.innerHTML = this.templates.loadingSpinner(message);
        }
      },
      
      // Show error state for any container
      showErrorState: (containerId, message = 'Failed to load messages') => {
        const container = this.getElement(`#${containerId}`);
        if (container) {
          container.innerHTML = this.templates.errorMessage(message);
        }
      }
    };
  }

  /**
   * Local debounce fallback (only used if global utility not available)
   */
  _localDebounce(func, wait) {
    return (...args) => {
      const key = func.name || func.toString();clearTimeout(this.debounceTimers.get(key));
      this.debounceTimers.set(key, setTimeout(() => func.apply(this, args), wait));
    };
  }

  /**
   * Batch DOM updates for better performance
   */
  batchUpdate(callback) {
    this.batchUpdateQueue.push(callback);
    
    if (!this.batchUpdateTimer) {
      this.batchUpdateTimer = requestAnimationFrame(() => {
        const queue = [...this.batchUpdateQueue];
        this.batchUpdateQueue = [];
        this.batchUpdateTimer = null;
        
        queue.forEach(callback => callback());
      });
    }
  }

  /**
   * Initialize in closed state synchronously (icon only, no API calls, no connection)
   */
  initClosedSync() {
    try {
      this.logger.info('Initializing ChatManager in closed state (sync)...');
      
      // Create only the floating icon, not the full window, no API calls
      this.createFloatingChatIcon();
      
      // Set up navigation listeners to close chat
      this.setupNavigationListeners();
      
      this.isInitialized = true;
      this.logger.success('ChatManager initialized in closed state (sync)');
    } catch (error) {
      this.logger.error('Failed to initialize ChatManager in closed state:', error);
    }
  }

  /**
   * Initialize in closed state (icon only, no connection) - used for activation
   */
  async initClosed() {
    try {
      this.logger.info('Initializing ChatManager in closed state...');
      
      // Load current user data (only if not already loaded)
      if (!this.currentUser) {
        await this.loadCurrentUser();
      }
      
      // Create only the floating icon, not the full window
      this.createFloatingChatIcon();
      
      // Set up navigation listeners to close chat
      this.setupNavigationListeners();
      
      this.logger.success('ChatManager initialized in closed state');
    } catch (error) {
      this.logger.error('Failed to initialize ChatManager in closed state:', error);
    }
  }

  /**
   * Activate the chat (connect to server and show window)
   */
  async activateChat() {
    if (this.isActive) {
      this.logger.info('Chat already active');
      return;}

    try {
      this.logger.info('Activating ChatManager...');
      this.isActive = true;
      this.isIconOnly = false;
      
      // Verify CSS is loaded before creating window
      this.verifyChatCSS();
      
      // Load current user data first (if not already loaded)
      if (!this.currentUser) {
        await this.loadCurrentUser();
      }
      
      // Initialize socket connection
      this.initializeSocket();
      
      // Create floating chat window
      this.createFloatingChatWindow();
      
      // Center the window when first activated (with small delay to ensure rendering)
      setTimeout(() => {
        this.centerChatWindow();
      }, 50);
      
      // Set initial channel indicator
      this.updateChannelIndicator('game', 'wc2');
      
      // Check and auto-join clan rooms
      await this.checkUserClans();
      
      // Ensure clan tab is updated after floating window is created
      setTimeout(() => {
        this.checkUserClans();
      }, 1000);
      
      // Load initial context data
      await this.loadContextData('global');
      
      // Set up notification system
      this.setupNotificationSystem();
      
      // Set up service worker for notifications
      this.setupServiceWorker();
      
      // Initialize emoji picker
      await this.emojiPicker.init();
      
      this.logger.success('ChatManager activated successfully');
    } catch (error) {
      this.logger.error('Failed to activate ChatManager:', error);
    }
  }

  /**
   * Deactivate the chat (disconnect from server and show only icon)
   */
  deactivateChat() {
    if (!this.isActive) {
      this.logger.info('Chat already inactive');
      return;}

    this.logger.info('Deactivating ChatManager...');
    this.isActive = false;
    this.isIconOnly = true;
    
    // Clean up socket properly
    this.cleanupSocket();
    
    // Clean up event listeners
    this.cleanupEventListeners();
    
    // Clear debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // Clear batch update queue
    if (this.batchUpdateTimer) {
      cancelAnimationFrame(this.batchUpdateTimer);
      this.batchUpdateTimer = null;
    }
    this.batchUpdateQueue = [];
    
    // Hide floating window
    this.hideFloatingWindow();
    
    // Show only the icon
    this.createFloatingChatIcon();
    
    this.logger.success('ChatManager deactivated');
  }

  /**
   * Clean up event listeners to prevent memory leaks
   */
  cleanupEventListeners() {
    // Remove all stored event listeners
    this.eventListeners.forEach((listener, element) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(listener.type, listener.handler);
      }
    });
    this.eventListeners.clear();
    
    // Clear DOM cache
    this.domCache.clear();
    
    // Clear performance monitoring intervals
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    if (this.domMonitorInterval) {
      clearInterval(this.domMonitorInterval);
      this.domMonitorInterval = null;
    }
  }

  /**
   * Set up navigation listeners to close chat when navigating
   */
  setupNavigationListeners() {
    // Listen for navigation clicks in the main navbar
    document.addEventListener('click', (e) => {
      // Check if clicked element is a navigation link
      const navLink = e.target.closest('nav a, .navbar a, .nav-link, [data-navigate]');
      if (navLink && this.isActive) {
        this.logger.info('Navigation detected, deactivating chat...');
        this.deactivateChat();
      }
    });

    // Listen for browser navigation events
    window.addEventListener('popstate', () => {
      if (this.isActive) {
        this.logger.info('Browser navigation detected, deactivating chat...');
        this.deactivateChat();
      }
    });
  }

  /**
   * Initialize the chat manager (legacy method for when chat needs to be active)
   */
  async init() {
    return this.activateChat();}

  /**
   * Load current user data - optimized to avoid duplicate API calls
   */
  async loadCurrentUser() {
    // Return cached user data if available
    if (this.currentUser && this.currentUser.id) {
      return this.currentUser;}

    try {
      this.logger.info('Loading current user...');
      
      // Get auth token
      const authToken = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch('/api/me', {
        headers: headers,
        credentials: 'include'
      });
      
      this.logger.debug('API response:', response);
      
      if (response.ok) {
        this.currentUser = await response.json();
        this.logger.success(`Current user loaded: ${this.currentUser.username}`);
        return this.currentUser;} else {
        this.logger.error('Failed to load user - response not successful');
        return null;}
    } catch (error) {
      this.logger.error('Failed to load user data:', error);
      return null;}
  }

  /**
   * Initialize socket connection - consolidated socket management
   */
  initializeSocket() {
    if (typeof io === 'undefined') {
      this.logger.error('Socket.IO not loaded');
      return;}

    // Prevent multiple socket connections
    if (this.socket && this.socket.connected) {
      this.logger.info('Socket already connected, skipping initialization');
      return;}

    // Clean up existing socket properly
    if (this.socket) {
      this.logger.info('Disconnecting existing socket');
      this.cleanupSocket();
    }

    try {
      this.socket = io({
    
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: false,
        // Add reconnection settings
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 10
      });
      
      this.setupSocketListeners();
      
      // Join the current game room after socket connection is established
      this.socket.on('connect', async () => {
        this.logger.success('Connected to chat server');
        
        // Reset authentication state on new connection
        this.socketAuthenticated = false;
        
        // Join with user data if available
        if (this.currentUser && this.currentUser.id) {
          this.logger.info('Joining chat with user data:', this.currentUser);
          this.socket.emit('join', {
            userId: this.currentUser.id,
            username: this.currentUser.username
          });
          
          // Wait for authentication to complete before proceeding
          try {
            await this.ensureSocketAuthentication();
            this.logger.success('Socket authentication completed, proceeding with setup...');
            
            // Join current game room
            if (this.currentGameType) {
              await this.joinGameRoom(this.currentGameType);
            }
            
            // Check and join clan rooms
            await this.checkUserClans();
          } catch (error) {
            this.logger.error('Socket authentication failed:', error);
          }
        } else {
          this.logger.warn('No user data available for socket join');
        }
      });

      // Add reconnection event handlers
      this.socket.on('reconnect', async (attemptNumber) => {
        this.logger.info(`Reconnected to chat server after ${attemptNumber} attempts`);
        this.updateConnectionStatus('connected');
        
        // Re-authenticate after reconnection
        if (this.currentUser && this.currentUser.id) {
          this.socket.emit('join', {
            userId: this.currentUser.id,
            username: this.currentUser.username
          });
          
          // Wait for authentication to complete
          try {
            await this.ensureSocketAuthentication();
            this.logger.success('Reconnection authentication completed');
          } catch (error) {
            this.logger.error('Reconnection authentication failed:', error);
          }
        }
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        this.logger.info(`Attempting to reconnect (attempt ${attemptNumber})`);
        this.updateConnectionStatus('connecting');
      });

      this.socket.on('reconnect_error', (error) => {
        this.logger.error('Reconnection error:', error);
        this.updateConnectionStatus('disconnected');
      });

      this.socket.on('reconnect_failed', () => {
        this.logger.error('Reconnection failed after all attempts');
        this.updateConnectionStatus('disconnected');
      });

    } catch (error) {
      this.logger.error('Failed to initialize socket:', error);
    }
  }

  /**
   * Clean up socket connection and listeners - consolidated cleanup
   */
  cleanupSocket() {
    if (this.socket) {
      // Remove all listeners to prevent memory leaks
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Setup socket event listeners - consolidated socket event management
   */
  setupSocketListeners() {
    // Generate a unique connection ID for tracking
    this.connectionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.socket.on('connect', () => {
      this.logger.success(`Connected to chat server (${this.connectionId})`);
      this.updateConnectionStatus('connected');
    });

    this.socket.on('disconnect', () => {
      this.logger.info(`Disconnected from chat server (${this.connectionId})`);
      this.socketAuthenticated = false;
      this.updateConnectionStatus('disconnected');
    });

    // Handle successful join
    this.socket.on('joinedChat', (data) => {
      this.logger.success('Successfully joined chat:', data);
      this.socketAuthenticated = true;
      // Request online users after joining
      this.requestOnlineUsers();
      // Request available chat rooms
      this.requestChatRooms();
    });

    // Handle online users response
    this.socket.on('onlineUsers', (data) => {
      this.logger.debug('Received online users:', data);
      this.updateUsersListWithRealData(data.users);
    });

    // Handle new user coming online
    this.socket.on('userOnline', (user) => {
      this.logger.info('User came online:', user);
      this.requestOnlineUsers(); // Refresh the list
    });

    // Handle user going offline (if implemented)
    this.socket.on('userOffline', (user) => {
      this.logger.info('User went offline:', user);
      this.requestOnlineUsers(); // Refresh the list
    });

    // Handle real-time notifications
    this.socket.on('newNotification', (notification) => {
      this.logger.info('Received real-time notification:', notification);
      this.handleRealtimeNotification(notification);
    });

    this.socket.on('notificationRead', (data) => {
      this.logger.debug('Notification marked as read:', data);
      this.handleNotificationRead(data.notificationId);
    });

    this.socket.on('allNotificationsRead', () => {
      this.logger.debug('All notifications marked as read');
      this.handleAllNotificationsRead();
    });

    this.socket.on('notificationDeleted', (data) => {
      this.logger.debug('Notification deleted:', data);
      this.handleNotificationDeleted(data.notificationId);
    });

    // Handle socket errors
    this.socket.on('error', (error) => {
      this.logger.error('Socket error:', error);
      // Try to provide more specific error information
      if (error.message === 'Failed to send message') {
        this.logger.error('Private message failed - server may not support this format');
      }
    });
    
    // Handle message send success confirmations
    this.socket.on('messageSent', (data) => {
      this.logger.success('Message sent successfully:', data);
    });
    
    // Message handlers
    this.socket.on('message', (message) => this.handleIncomingMessage(message));
    this.socket.on('privateMessage', (message) => this.handlePrivateMessage(message));
    this.socket.on('privateChatRequest', (request) => this.handlePrivateChatRequest(request));
    this.socket.on('notification', (notification) => this.handleNotification(notification));

    // Room handlers
    this.socket.on('chatRoomCreated', (response) => {
      this.logger.info('Chat room created:', response);
      if (response.success && response.room) {
        this.addUserRoomTab(response.room);
        this.switchToUserRoom(response.room._id, response.room.name);
      }
    });

    this.socket.on('newChatRoom', (room) => {
      this.logger.info('New chat room available:', room);
      // Add tab for all public rooms, or private rooms where user is a participant
      if (!room.isPrivate) {
        this.addDiscoverableRoomTab(room);
      } else if (room.participants.some(p => p._id === this.currentUser?.id)) {
        this.addUserRoomTab(room);
      }
    });

    this.socket.on('roomDeleted', ({ roomId }) => {
      this.logger.info('Room deleted:', roomId);
      this.removeUserRoomTab(roomId);
    });

    this.socket.on('roomUpdated', (roomData) => {
      this.logger.debug('Room updated:', roomData);
      this.updateUserRoomTab(roomData.roomId, roomData);
    });

    this.socket.on('roomMessageReceived', (data) => {
      this.logger.debug('Room message received:', data);
      this.handleRoomMessage(data);
    });



    this.socket.on('chatRoomsList', (rooms) => {
      this.logger.debug('Received rooms list:', rooms);
      this.handleRoomsList(rooms);
    });
  }

  /**
   * Request online users from server
   */
  requestOnlineUsers() {
    if (this.socket && this.socket.connected) {
      this.logger.debug('Requesting online users list...');
      this.socket.emit('getOnlineUsers');
    } else {
      this.logger.warn('Socket not connected, cannot request online users');
    }
  }

  /**
   * Request available chat rooms from server
   */
  requestChatRooms() {
    if (this.socket && this.socket.connected) {
      this.logger.debug('Requesting chat rooms list...');
      this.socket.emit('getChatRooms');
    } else {
      this.logger.warn('Socket not connected, cannot request chat rooms');
    }
  }

  /**
   * Handle chat rooms list from server
   */
  handleRoomsList(rooms) {
    this.logger.debug('Processing rooms list:', rooms);
    
    if (!rooms || !Array.isArray(rooms)) {
      this.logger.warn('Invalid rooms list received');
      return;}

    // Process each room
    rooms.forEach(room => {
      // Skip Main Chat room as it's handled differently
      if (room.name === 'Main Chat') {
        return;}

      // Check if user is a participant
      const isParticipant = room.participants && room.participants.some(p => 
        p._id === this.currentUser?.id || p._id === this.currentUser?._id
      );

      if (isParticipant) {
        // Add as user room tab (can chat)
        this.addUserRoomTab(room);
      } else if (!room.isPrivate) {
        // Add as discoverable room tab (can join)
        this.addDiscoverableRoomTab(room);
      }
    });

    this.logger.success(`Processed ${rooms.length} rooms`);
  }

  /**
   * Create floating chat window that follows user around
   */
  createFloatingChatWindow() {
    // Remove any existing floating window first
    const existingWindow = document.getElementById('floating-chat-window');
    if (existingWindow) {
      this.logger.debug('Removing existing floating window');
      existingWindow.remove();
    }

    this.logger.debug('Creating new floating chat window');
    const floatingWindow = document.createElement('div');
    floatingWindow.id = 'floating-chat-window';
    floatingWindow.className = 'floating-chat-window';
    floatingWindow.innerHTML = `
      <div class="chat-header">
        <div class="chat-title">
          <span class="chat-icon">💬</span>
          <span class="chat-title-text">Garrison</span>
          <span class="channel-indicator" id="channel-indicator">#WC2</span>
          <div class="connection-status-indicator" id="connection-status-indicator"></div>
          <div class="notification-badges">
            <span class="badge global-badge" data-context="global">0</span>
            <span class="badge clan-badge" data-context="clan">0</span>
            <span class="badge private-badge" data-context="private" style="display: none;">0</span>
          </div>
        </div>
        <div class="chat-controls">
          <button class="btn-friends" title="Toggle Friends Panel">
            <i class="fas fa-user-friends"></i>
          </button>
          <button class="btn-users" title="Toggle Users Panel">
            <i class="fas fa-users"></i>
          </button>
          <button class="btn-close" title="Close">×</button>
        </div>
      </div>
      
      <div class="chat-body">
        <div class="chat-context-tabs">
          <button class="context-tab active" data-context="global">
            <i class="fas fa-globe"></i> Global
          </button>
          <button class="context-tab" data-context="clan">
            <i class="fas fa-shield-alt"></i> Clan
          </button>
          <button class="btn-create-chat" title="Create New Chat">
            <i class="fas fa-plus"></i>
          </button>
          <!-- Private and Group tabs will be added dynamically when needed -->
        </div>
        
        <div class="chat-content">
          <div class="context-content active" data-context="global">
            <div class="game-room-tabs">
              <button class="game-tab active" data-game="wc1">WC1</button>
              <button class="game-tab" data-game="wc2">WC2</button>
              <button class="game-tab" data-game="wc3">WC3</button>
            </div>
            <div class="chat-messages" id="global-messages">
              <div class="welcome-message">
                <i class="fas fa-gamepad"></i>
                <h4>WC2 Garrison</h4>
                <p>Welcome to WC2 Global Chat! Connect with other WC2 players.</p>
              </div>
            </div>
          </div>
          
          <div class="context-content" data-context="clan">
            <div class="chat-messages" id="clan-messages">
              <div class="welcome-message">
                <i class="fas fa-shield-alt"></i>
                <p>Welcome to Clan Garrison! Connect with your clan members.</p>
              </div>
            </div>
          </div>
          
          <!-- Private and Group content will be added dynamically when needed -->
        </div>
        
        <!-- Allies Panel -->
        <div class="friends-panel" id="friends-panel">
          <div class="friends-panel-header">
            <h4>Friends</h4>
            <span class="friends-count" id="friends-count">0</span>
          </div>
          <div class="friends-tabs">
            <button class="friends-tab active" data-tab="list">
              <i class="fas fa-user-friends"></i> My Friends
            </button>
            <button class="friends-tab" data-tab="requests">
              <i class="fas fa-user-plus"></i> Requests
              <span class="request-badge" id="request-badge">0</span>
            </button>
            <button class="friends-tab" data-tab="add">
              <i class="fas fa-search"></i> Add Friend
            </button>
          </div>
          <div class="friends-content">
            <div class="friends-tab-content active" data-tab="list" id="friends-list">
              <!-- Friends will be populated here -->
            </div>
            <div class="friends-tab-content" data-tab="requests" id="friends-requests">
              <!-- Friend requests will be populated here -->
            </div>
            <div class="friends-tab-content" data-tab="add" id="friends-add">
              <div class="add-friend-form">
                <input type="text" id="friend-search-input" placeholder="Search for users..." autocomplete="off">
                <div class="search-results" id="friend-search-results"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Users Side Panel -->
        <div class="users-panel" id="users-panel">
          <div class="users-panel-header">
            <h4>Online Users</h4>
            <span class="user-count" id="user-count">0</span>
          </div>
          <div class="users-list" id="users-list">
            <!-- Users will be populated here -->
          </div>
        </div>
        
        <div class="chat-input-area">
          <div class="quick-actions">
            <button class="quick-btn" data-action="emoji" title="Emoji">😊</button>
            <button class="quick-btn" data-action="mention" title="Mention">@</button>
            <button class="quick-btn" data-action="attach" title="Attach">📎</button>
          </div>
                          <input type="text" class="chat-input" id="message-input" placeholder="Type a message... (Use /action for roleplay, /roll 1d20 for dice)" />
          <button class="send-btn">Send</button>
        </div>
      </div>
    `;

    document.body.appendChild(floatingWindow);
    this.floatingWindow = floatingWindow;
    
    // Apply critical inline styles to ensure proper display
    this.floatingWindow.style.position = 'fixed';
    this.floatingWindow.style.width = '50vw';
    this.floatingWindow.style.maxWidth = '800px';
    this.floatingWindow.style.height = '70vh';
    this.floatingWindow.style.maxHeight = '600px';
    this.floatingWindow.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)';
    this.floatingWindow.style.border = '2px solid #ffd700';
    this.floatingWindow.style.borderRadius = '12px';
    this.floatingWindow.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    this.floatingWindow.style.zIndex = '1000002';
    this.floatingWindow.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    this.floatingWindow.style.overflow = 'hidden';
    this.floatingWindow.style.transition = 'all 0.3s ease';
    this.floatingWindow.style.backdropFilter = 'blur(10px)';
    this.floatingWindow.style.display = 'block';
    this.floatingWindow.style.visibility = 'visible';
    this.floatingWindow.style.opacity = '1';
    
    this.logger.debug('Floating window created and added to DOM');
    this.logger.debug('Critical inline styles applied');
    this.logger.debug('Window styles applied:', {
      position: this.floatingWindow.style.position,
      width: this.floatingWindow.style.width,
      height: this.floatingWindow.style.height,
      display: this.floatingWindow.style.display,
      visibility: this.floatingWindow.style.visibility,
      opacity: this.floatingWindow.style.opacity
    });
    
    this.setupFloatingWindowEvents();
    this.makeDraggable(floatingWindow);
    
    this.logger.debug('Floating window setup complete');
  }

  /**
   * Setup floating window event handlers
   */
  setupFloatingWindowEvents() {
    const window = this.floatingWindow;
    
    // Header controls
    window.querySelector('.btn-close').addEventListener('click', () => {
      this.hideFloatingWindow();
    });
    
    // Double-click header to toggle expand
    const header = window.querySelector('.chat-header');
    header.addEventListener('dblclick', (e) => {
      // Prevent double-click on control buttons from triggering this
      if (e.target.closest('.chat-controls')) return;this.toggleExpand();
    });
    
        // Context tabs
    window.querySelectorAll('.context-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (tab.dataset.action === 'create-chat') {
          this.showCreateChatModal();
        } else {
          this.switchContext(tab.dataset.context);
        }
      });
      
      // Add right-click context menu for closeable tabs
      tab.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showTabContextMenu(e, tab);
      });
    });

    // Create chat button
    const createChatBtn = window.querySelector('.btn-create-chat');
    if (createChatBtn) {
      this.logger.debug('Found create chat button, adding event listener');
      createChatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logger.debug('Create chat button clicked!');
        this.showCreateChatModal();
      });
    } else {
      this.logger.warn('Create chat button not found in floating window');
    }

    // Game tabs
    window.querySelectorAll('.game-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchGameRoom(tab.dataset.game);
      });
    });
    
    // Chat input
    const chatInput = window.querySelector('.chat-input');
    const sendBtn = window.querySelector('.send-btn');
    
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
    
    sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

            // Setup friends panel toggle
        const friendsBtn = this.floatingWindow.querySelector('.btn-friends');
        if (friendsBtn) {
          friendsBtn.addEventListener('click', () => this.toggleFriendsPanel());
        }

    // Setup users panel toggle
    const usersBtn = this.floatingWindow.querySelector('.btn-users');
    if (usersBtn) {
      usersBtn.addEventListener('click', () => this.toggleUsersPanel());
    }
  }

  /**
   * Cycle through window states on double-click
   */
  cycleWindowState() {
    const isExpanded = this.floatingWindow.classList.contains('expanded');
    
    if (isExpanded) {
      // If expanded, restore to normal size
      this.toggleExpand();
      this.logger.debug('Double-click: Restored to normal from expanded');
    } else {
      // If normal size, expand
      this.toggleExpand();
      this.logger.debug('Double-click: Expanded from normal');
    }
  }

  /**
   * Make floating window draggable
   */
  makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const header = element.querySelector('.chat-header');
    
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        // Get viewport dimensions
        const viewportHeight = window.innerHeight;
        
        // Apply boundary constraints to prevent dragging beyond the top
        // The top of the window cannot go above the top of the viewport (y = 0)
        currentY = Math.max(0, currentY);
        
        // Optional: Also prevent dragging below the bottom of viewport
        // Uncomment the next two lines if you want to constrain bottom as well
        // const elementHeight = element.getBoundingClientRect().height;
        // currentY = Math.min(viewportHeight - elementHeight, currentY);

        xOffset = currentX;
        yOffset = currentY;

        element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
    }

    function dragEnd() {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }
  }

  /**
   * Make floating window resizable by dragging corners and edges
   */
  makeResizable(element) {
    const minWidth = 280;
    const minHeight = 200;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    
    let isResizing = false;
    let currentHandle = null;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    // Get all resize handles
    const resizeHandles = element.querySelectorAll('.resize-handle');
    
    resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', initResize);
    });

    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);

    function initResize(e) {
      isResizing = true;
      currentHandle = e.target.dataset.direction;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = element.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
      
      e.preventDefault();
      document.body.style.userSelect = 'none';
      element.style.pointerEvents = 'none';
      
      this.logger.debug(`Started resizing from ${currentHandle} corner/edge`);
    }

    function doResize(e) {
      if (!isResizing || !currentHandle) return;e.preventDefault();
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;
      
      // Handle different resize directions
      switch (currentHandle) {
        case 'se': // Southeast (bottom-right)
          newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
          break;
          
        case 'sw': // Southwest (bottom-left)
          newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
          if (newWidth > minWidth) newLeft = startLeft + deltaX;
          break;
          
        case 'ne': // Northeast (top-right)
          newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight - deltaY));
          if (newHeight > minHeight) newTop = startTop + deltaY;
          break;
          
        case 'nw': // Northwest (top-left)
          newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight - deltaY));
          if (newWidth > minWidth) newLeft = startLeft + deltaX;
          if (newHeight > minHeight) newTop = startTop + deltaY;
          break;
          
        case 'n': // North (top)
          newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight - deltaY));
          if (newHeight > minHeight) newTop = startTop + deltaY;
          break;
          
        case 's': // South (bottom)
          newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
          break;
          
        case 'e': // East (right)
          newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
          break;
          
        case 'w': // West (left)
          newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));
          if (newWidth > minWidth) newLeft = startLeft + deltaX;
          break;
      }
      
      // Apply new dimensions and position
      element.style.width = newWidth + 'px';
      element.style.height = newHeight + 'px';
      element.style.left = newLeft + 'px';
      element.style.top = newTop + 'px';
      
      // Remove transform to use absolute positioning during resize
      element.style.transform = 'none';
    }

    function stopResize() {
      if (isResizing) {
        isResizing = false;
        currentHandle = null;
        document.body.style.userSelect = '';
        element.style.pointerEvents = '';
        
        // Save custom size to localStorage
        const rect = element.getBoundingClientRect();
        localStorage.setItem('chatWindowCustomSize', JSON.stringify({
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top
        }));
        
        this.logger.debug(`Resize complete: ${rect.width}x${rect.height}`);
      }
    }
  }

  /**
   * Add CSS styles for resize handles
   */
  addResizeStyles() {
    if (document.getElementById('chat-resize-styles')) return;const styles = document.createElement('style');
    styles.id = 'chat-resize-styles';
    styles.textContent = `
      .floating-chat-window {
        position: fixed !important;
        min-width: 280px;
        min-height: 200px;
        max-width: 90vw;
        max-height: 90vh;
        z-index: 1000002 !important;
      }
      
      .resize-handle {
        position: absolute;
        background: rgba(255, 215, 0, 0.1);
        border: 1px solid rgba(255, 215, 0, 0.3);
        z-index: 1000;
        transition: all 0.2s ease;
      }
      
      /* Corner handles - larger and more visible */
      .resize-nw {
        top: -8px;
        left: -8px;
        width: 16px;
        height: 16px;
        cursor: nw-resize;
        border-radius: 4px 0 4px 0;
      }
      
      .resize-ne {
        top: -8px;
        right: -8px;
        width: 16px;
        height: 16px;
        cursor: ne-resize;
        border-radius: 0 4px 0 4px;
      }
      
      .resize-sw {
        bottom: -8px;
        left: -8px;
        width: 16px;
        height: 16px;
        cursor: sw-resize;
        border-radius: 0 4px 0 4px;
      }
      
      .resize-se {
        bottom: -8px;
        right: -8px;
        width: 16px;
        height: 16px;
        cursor: se-resize;
        border-radius: 4px 0 4px 0;
      }
      
      /* Edge handles - wider and more visible */
      .resize-n {
        top: -6px;
        left: 16px;
        right: 16px;
        height: 12px;
        cursor: n-resize;
        border-radius: 4px 4px 0 0;
      }
      
      .resize-s {
        bottom: -6px;
        left: 16px;
        right: 16px;
        height: 12px;
        cursor: s-resize;
        border-radius: 0 0 4px 4px;
      }
      
      .resize-e {
        top: 16px;
        bottom: 16px;
        right: -6px;
        width: 12px;
        cursor: e-resize;
        border-radius: 0 4px 4px 0;
      }
      
      .resize-w {
        top: 16px;
        bottom: 16px;
        left: -6px;
        width: 12px;
        cursor: w-resize;
        border-radius: 4px 0 0 4px;
      }
      
      /* Enhanced visual feedback on hover */
      .resize-handle:hover {
        background: rgba(255, 215, 0, 0.4);
        border-color: rgba(255, 215, 0, 0.6);
        box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
      }
      
      /* Corner indicators - small dots for better visibility */
      .resize-nw::before, .resize-ne::before, .resize-sw::before, .resize-se::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 4px;
        height: 4px;
        background: #ffd700;
        border-radius: 50%;
        opacity: 0.6;
      }
      
      /* Hide resize handles when minimized */
      .floating-chat-window.minimized .resize-handle {
        display: none;
      }
      

    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Switch between chat contexts (global, clan, private, group)
   */
  switchContext(contextType) {
    this.logger.info(`Switching to context: ${contextType}`);
    
    if (!this.floatingWindow) {
      this.logger.error('Cannot switch context: floating window not found');
      return;}

    // Update active tab - handle both context tabs and room tabs
    this.getElements('.context-tab').forEach(tab => {
      tab.classList.remove('active');
      // Check for both data-context and data-room-id attributes
      if (tab.dataset.context === contextType || 
          (contextType === 'global' && !tab.hasAttribute('data-room-id'))) {
        tab.classList.add('active');
      }
    });

    // Update active content - handle both context content and room content
    this.getElements('.context-content').forEach(content => {
      content.classList.remove('active');
      // Check for both data-context and data-room-id attributes
      if (content.dataset.context === contextType || 
          (content.dataset.context === 'global' && !content.hasAttribute('data-room-id'))) {
        content.classList.add('active');
      }
    });

    // Update current context
    this.currentContext = contextType;
    
    // Update channel indicator based on context
    if (contextType === 'global') {
      this.updateChannelIndicator('game', this.currentGameType || 'wc2');
    } else if (contextType === 'clan') {
      // Get clan tag if available
      const clanTab = this.floatingWindow.querySelector('.context-tab[data-context="clan"] span');
      const clanTag = clanTab ? clanTab.textContent : null;
      this.updateChannelIndicator('clan', clanTag);
    } else if (contextType === 'private') {
      this.updateChannelIndicator('private');
    } else if (contextType === 'group') {
      this.updateChannelIndicator('group');
    }

    // Clear unread count for this context
    this.clearUnreadCount(contextType);

    // Load context-specific data
    this.loadContextData(contextType);
    
    this.logger.success(`Switched to ${contextType} context`);
  }

  /**
   * Update channel indicator in chat header
   */
  updateChannelIndicator(channelType, channelName = null) {
    const indicator = this.floatingWindow?.querySelector('#channel-indicator');
    if (!indicator) return;let displayText = '';
    
    switch (channelType) {
      case 'game':
        const gameNames = {
          'wc1': '#WC1',
          'wc2': '#WC2', 
          'wc3': '#WC3'
        };
        displayText = gameNames[channelName] || `#${channelName?.toUpperCase()}`;
        break;
      case 'clan':
        displayText = channelName ? `#${channelName}` : '#CLAN';
        break;
      case 'private':
        displayText = channelName ? `@${channelName}` : '#PRIVATE';
        break;
      case 'room':
        displayText = channelName ? `#${channelName}` : '#ROOM';
        break;
      case 'group':
        displayText = channelName ? `#${channelName}` : '#GROUPS';
        break;
      default:
        displayText = '#GLOBAL';
    }
    
    indicator.textContent = displayText;
    indicator.title = `Current channel: ${displayText}`;
  }

  /**
   * Switch game room (WC1, WC2, WC3)
   */
  switchGameRoom(gameType) {
    if (!this.floatingWindow) {
      this.logger.error('Cannot switch game room: floating window not found');
      return;}

    // Prevent rapid switching
    if (this.currentGameType === gameType) {
      this.logger.info(`Already on ${gameType} game room, skipping switch`);
      return;}

    this.logger.info(`Switching to game room: ${gameType}`);
    
    // Update current game type
    this.currentGameType = gameType;
    
    // Update channel indicator
    this.updateChannelIndicator('game', gameType);

    // Update active game tab
    const gameTabs = this.getElements('.game-tab');
    gameTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.game === gameType) {
        tab.classList.add('active');
      }
    });

    // Ensure the global messages container is visible before any operations
    const globalMessages = this.getElement('#global-messages');
    if (globalMessages) {
      globalMessages.style.display = 'block';
      globalMessages.style.visibility = 'visible';
      globalMessages.style.opacity = '1';
      this.logger.success('Ensured global messages container is visible during tab switch');
    }

    // Update welcome message
    this.updateGameWelcomeMessage(gameType);

    // Join the new game room via socket
    this.joinGameRoom(gameType);

    // Load messages for this game type
    this.loadGameMessages(gameType);
  }

  /**
   * Update the welcome message for the current game
   */
  updateGameWelcomeMessage(gameType) {
    if (!this.floatingWindow) return;const container = this.getElement('#global-messages');
    if (container) {
      const welcomeMessage = container.querySelector('.welcome-message');
      if (welcomeMessage) {
        const gameNames = {
                'wc1': 'WC 1',
      'wc2': 'WC 2',
      'wc3': 'WC 3'
        };
        
        const title = welcomeMessage.querySelector('h4');
        const description = welcomeMessage.querySelector('p');
        
        if (title) {
          title.textContent = `${gameNames[gameType] || gameType.toUpperCase()} Garrison`;
        }
        if (description) {
          description.textContent = `Welcome to ${gameNames[gameType] || gameType.toUpperCase()} Global Chat! Connect with other ${gameType.toUpperCase()} players.`;
        }
      }
    }
  }

  /**
   * Join specific game room
   */
  async joinGameRoom(gameType) {
    if (this.socket && this.socket.connected) {
      try {
        // Ensure socket is authenticated before joining game room
        await this.ensureSocketAuthentication();
        
        this.socket.emit('joinGameRoom', { gameType });
        this.logger.success(`Joined ${gameType.toUpperCase()} game room`);
      } catch (error) {
        this.logger.error('Failed to join game room:', error);
      }
    } else {
      this.logger.warn('Cannot join game room - socket not connected');
    }
  }

  /**
   * Check if user has players in clans and auto-join clan rooms
   */
  async checkUserClans() {
        try {
      this.logger.info('Checking user clan memberships...');
      
      // Check if ApiClient is available
      if (!window.apiClient) {
        this.logger.warn('ApiClient not available yet, skipping clan check');
        return null;}
      
      // Check if user has a clan using ApiClient
      const response = await window.apiClient.get('/api/clans/user');
      
      this.logger.debug('Clan API response status:', response.status);
      
      if (response.ok) {
        const clanData = await response.json();
        this.logger.debug('Clan API response data:', clanData);
        
        // The API returns an array of clans, not a single clan
        if (Array.isArray(clanData) && clanData.length > 0) {
          const clan = clanData[0];this.logger.info(`User is member of clan: [${clan.tag}] ${clan.name}`);
          this.logger.debug('Full clan data:', clan);
          
          // Join clan chat room via socket
          if (this.socket && this.socket.connected) {
            try {
              this.logger.info('Joining clan room via socket...');
              // Ensure socket is authenticated before joining clan room
              await this.ensureSocketAuthentication();
              
              this.socket.emit('joinClanRoom', { 
                clanId: clan._id,
                clanName: clan.name,
                clanTag: clan.tag 
              });
              this.logger.success(`Joined clan room: ${clan.name}`);
            } catch (error) {
              this.logger.error('Failed to join clan room:', error);
            }
          } else {
            this.logger.warn('Socket not connected, cannot join clan room');
          }
          
          // Update clan tab to show clan name
          this.logger.debug('Updating clan tab...');
          this.updateClanTab(clan);
          
          // Load clan messages if currently viewing clan context
          if (this.currentContext === 'clan') {
            this.logger.debug('Loading clan messages...');
            await this.loadClanMessages();
          }
          
          return clan;} else {
          this.logger.info('User is not a member of any clan');
          this.logger.debug('Clan response data:', clanData);
          // Reset clan tab when user has no clan
          this.resetClanTab();
          
          // Leave any clan socket rooms
          if (this.socket && this.socket.connected) {
            this.socket.emit('leaveClanRooms');
          }
          
          return null;}
      } else {
        this.logger.info('Clan API returned error status:', response.status);this.resetClanTab();
        
        // Leave any clan socket rooms
        if (this.socket && this.socket.connected) {
          this.socket.emit('leaveClanRooms');
        }
        
        return null;}
    } catch (error) {
      this.logger.error('Failed to check user clans:', error);
      return null;}
  }

  /**
   * Update clan tab to show clan name instead of generic "Clan Chat"
   */
  updateClanTab(clan) {
    if (!this.floatingWindow) {
      return;}
    
    const clanTab = this.floatingWindow.querySelector('.context-tab[data-context="clan"]');
    
    if (clanTab) {
      clanTab.innerHTML = `
        <i class="fas fa-scroll"></i>
        <span>${clan.name}</span>
      `;
      clanTab.title = `${clan.name} Clan Garrison`;
    }
  }

  /**
   * Reset clan tab to default state when user has no clan
   */
  resetClanTab() {
    if (!this.floatingWindow) {
      return;}
    
    const clanTab = this.floatingWindow.querySelector('.context-tab[data-context="clan"]');
    if (clanTab) {
      clanTab.innerHTML = `
        <i class="fas fa-scroll"></i>
        <span>Clan</span>
      `;
      clanTab.title = 'Clan Chat - Click to view clan encampment';
    }
  }

  /**
   * Refresh clan status (called when clan membership changes)
   */
  async refreshClanStatus() {
    this.logger.info('Refreshing clan status in chat system...');
    try {
      const clan = await this.checkUserClans();
      if (!clan) {
        // User has no clan, reset the tab
        this.resetClanTab();
        
        // Leave any clan socket rooms
        if (this.socket && this.socket.connected) {
          this.socket.emit('leaveClanRooms');
        }
      }
      this.logger.success('Clan status refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh clan status:', error);
    }
  }

  /**
   * Handle clan membership changes (public method for external systems)
   */
  onClanMembershipChanged() {
    this.logger.info('Clan membership changed, updating chat system...');
    this.refreshClanStatus();
  }

  /**
   * Load messages for specific game
   */
  async loadGameMessages(gameType) {
    try {
      this.logger.info(`Loading ${gameType.toUpperCase()} messages...`);
      
      // Check for cached messages first and display them immediately
      const cachedMessages = this.getCachedGameMessages(gameType);
      if (cachedMessages && cachedMessages.length > 0) {
        this.logger.success(`Found ${cachedMessages.length} cached messages for ${gameType.toUpperCase()}`);
        this.displayMessages(cachedMessages, 'global-messages');
        this.updateGameWelcomeMessage(gameType);
      } else {
        // Show loading state with correct game title
        this.logger.info(`No cached messages found, showing loading state for ${gameType.toUpperCase()}`);
        this.showGameLoadingState(gameType);
      }
      
      // Load fresh messages from server using utility
      const result = await this.messageLoader.loadMessages(
        `/api/chat/recent?game=${gameType}`, 
        'global-messages'
      );
      
      if (result.success && this.currentGameType === gameType) {
        this.updateGameWelcomeMessage(gameType);
        this.saveGameMessagesToCache(result.messages, gameType);
      } else if (!result.success && this.currentGameType === gameType) {
        this.showEmptyGameState(gameType, 'Failed to load messages. Please try again.');
      }
    } catch (error) {
      this.logger.error(`Failed to load ${gameType} messages:`, error);
      if (this.currentGameType === gameType) {
        this.showEmptyGameState(gameType, 'Unable to connect to chat server. Please check your connection.');
      }
    }
  }

  /**
   * Get cached messages for a specific game
   */
  getCachedGameMessages(gameType) {
    try {
      const cachedMessages = JSON.parse(localStorage.getItem('chatCachedMessages') || '{}');
      return cachedMessages.global?.[gameType] || null;} catch (error) {
      this.logger.error('Failed to get cached game messages:', error);
      return null;}
  }

  /**
   * Show loading state for specific game
   */
  showGameLoadingState(gameType) {
    const container = this.floatingWindow?.querySelector('#global-messages');
    if (container) {
      const gameNames = {
        'wc1': 'WC 1',
        'wc2': 'WC 2', 
        'wc3': 'WC 3'
      };
      
      container.innerHTML = `
        <div class="welcome-message">
          <i class="fas fa-gamepad"></i>
          <h4>${gameNames[gameType] || gameType.toUpperCase()} Garrison</h4>
          <p>Loading ${gameNames[gameType] || gameType.toUpperCase()} chat messages...</p>
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
        </div>
      `;
    }
  }

  /**
   * Show empty game state message
   */
  showEmptyGameState(gameType, message) {
    const container = this.floatingWindow?.querySelector('#global-messages');
    if (container) {
      container.innerHTML = `
        <div class="welcome-message">
          <i class="fas fa-gamepad"></i>
          <h4>${gameType.toUpperCase()} Garrison</h4>
          <p>${message}</p>
          <button class="retry-btn" onclick="window.chatManager.loadGameMessages('${gameType}')">
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Load context-specific data
   */
  async loadContextData(contextType) {
    switch (contextType) {
      case 'global':
        await this.loadGlobalMessages();
        break;
      case 'clan':
        await this.loadClanMessages();
        break;
      case 'private':
        await this.loadPrivateConversations();
        break;
      case 'group':
        await this.loadGroupChats();
        break;
    }
  }

  /**
   * Load global messages for current game
   */
  async loadGlobalMessages() {
    // Load messages for current game type
    if (this.currentGameType) {
      await this.loadGameMessages(this.currentGameType);
    } else {
      // Fallback to WC2 if no game type set
      this.currentGameType = 'wc2';
      await this.loadGameMessages('wc2');
    }
  }

  /**
   * Show empty global state message
   */
  showEmptyGlobalState(message) {
    const container = this.floatingWindow?.querySelector('#global-messages');
    if (container) {
      container.innerHTML = `
        <div class="welcome-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>${message}</p>
          <button class="retry-btn" onclick="window.chatManager.loadGlobalMessages()">
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Load clan messages
   */
  async loadClanMessages() {
    try {
      this.logger.info('Loading clan messages...');
      
      // Get user's clan first
      const clanResult = await this.messageLoader.loadMessages('/api/clans/user', 'clan-messages');
      
      if (clanResult.success && Array.isArray(clanResult.messages) && clanResult.messages.length > 0) {
        const clan = clanResult.messages[0]; // Get the first clan
        this.logger.success(`User has clan, loading chat for clan ID: ${clan._id}`);
        
        // Load clan chat messages
        const chatResult = await this.messageLoader.loadMessages(
          `/api/clans/${clan._id}/chat`, 
          'clan-messages'
        );
        
        if (!chatResult.success) {
          this.showEmptyClanState('Failed to load clan chat messages.');
        }
      } else {
        this.logger.info('User has no clan, showing empty state');
        this.showEmptyClanState('You are not a member of any clan. Join a clan to participate in clan chat!');
      }
    } catch (error) {
      this.logger.error('Failed to load clan messages:', error);
      this.showEmptyClanState('Unable to load clan chat. Please try again later.');
    }
  }

  /**
   * Show empty clan state message
   */
  showEmptyClanState(message) {
    const container = this.getElement('#clan-messages');
    if (container) {
      // Check if this is a "no clan" situation vs an error
      const isNoClan = message.includes('not a member of any clan');
      
      if (isNoClan) {
        container.innerHTML = `
          <div class="no-clan-message" style="padding: 30px; text-align: center; color: #e2e8f0; background: rgba(255,215,0,0.05); border: 1px solid rgba(255,215,0,0.2); border-radius: 8px; margin: 20px;">
            <div style="margin-bottom: 20px;">
              <i class="fas fa-shield-alt" style="font-size: 3rem; color: #ffd700; margin-bottom: 15px; display: block;"></i>
              <h3 style="color: #ffd700; margin-bottom: 10px; font-family: 'Cinzel', serif;">Clan Encampment</h3>
              <p style="margin-bottom: 20px; line-height: 1.5;">You're not a member of any clan. Visit the Clan Encampment to create or join a clan!</p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button onclick="window.location.href='/views/townhall.html#section-clan-management'" 
                      style="background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%); color: #1a1a2e; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fas fa-castle"></i>
                Clan Encampment
              </button>
              <button onclick="window.chatManager?.hideFloatingWindow(); window.location.href='/views/townhall.html#section-clan-management'" 
                      style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fas fa-users"></i>
                Browse Clans
              </button>
            </div>
          </div>
        `;
      } else {
        // Error message
        container.innerHTML = `
          <div class="no-clan-message" style="padding: 20px; text-align: center; color: #ff6b6b; font-style: italic;">
            <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
            ${message}
          </div>
        `;
      }
    }
  }

  /**
   * Load private conversations
   */
  async loadPrivateConversations() {
    try {
      this.logger.info('Loading private conversations...');
      const response = await this.api.get('/api/chat/private/conversations');
      this.logger.debug('Private conversations response:', response);
      if (response.success) {
        // If there are conversations, ensure the private tab exists
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          this.ensurePrivateTabExists();
        }
        this.displayConversations(response.data);
      }
    } catch (error) {
      this.logger.error('Failed to load private conversations:', error);
    }
  }

  /**
   * Load group chats
   */
  async loadGroupChats() {
    try {
      this.logger.info('Loading group chats...');
      const response = await this.api.get('/api/chat/groups');
      this.logger.debug('Group chats response:', response);
      
      if (response.success && Array.isArray(response.data)) {
        // If there are group chats, ensure the group tab exists
        if (response.data.length > 0) {
          this.ensureGroupTabExists();
        }
        this.displayGroupChats(response.data);
      } else {
        this.logger.warn('Failed to load group chats:', response);
        this.showEmptyGroupState('No group chats available.');
      }
    } catch (error) {
      this.logger.error('Failed to load group chats:', error);
      this.showEmptyGroupState('Unable to load group chats. Please try again later.');
    }
  }

  /**
   * Show empty group state message
   */
  showEmptyGroupState(message) {
    const container = this.getElement('#group-messages');
    if (container) {
              container.innerHTML = this.templates.emptyState(message, 'users');
    }
  }

  /**
   * Display group chats in the UI
   */
  displayGroupChats(groupData) {
    try {
      this.logger.debug('Displaying group chats:', groupData);
      const container = this.floatingWindow.querySelector('#group-messages');
      
      if (!container) {
        this.logger.error('Group messages container not found');
        return;}

      // Clear existing content
      container.innerHTML = '';

      // Show welcome message if no groups
      if (!groupData.groups || groupData.groups.length === 0) {
        container.innerHTML = `
          <div class="welcome-message">
            <i class="fas fa-users"></i>
            <h4>Group Chat</h4>
            <p>No group chats available. Create or join a group to start chatting!</p>
          </div>
        `;
        return;}

      // Display groups
      groupData.groups.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'group-chat-item';
        groupElement.innerHTML = `
          <div class="group-header">
            <h5>${group.name}</h5>
            <span class="member-count">${group.memberCount || 0} members</span>
          </div>
          <div class="group-messages" id="group-${group.id}-messages"></div>
          <div class="group-input">
            <input type="text" placeholder="Type a message..." data-group-id="${group.id}">
            <button onclick="chatManager.sendGroupMessage('${group.id}', this.previousElementSibling.value)">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        `;
        container.appendChild(groupElement);
      });

      // Auto-scroll to bottom
      this.scrollToBottom(container);
      
    } catch (error) {
      this.logger.error('Error displaying group chats:', error);
    }
  }

  /**
   * Display messages in the chat container with performance optimizations
   */
  displayMessages(messages, containerId) {
    try {
      this.logger.debug(`displayMessages called for container: ${containerId} with ${messages?.length || 0} messages`);
      
      // Support both direct container ID and container element
      let container;
      if (typeof containerId === 'string') {
        container = this.floatingWindow?.querySelector(`#${containerId}`);
      } else {
        container = containerId; // Assume it's already a DOM element
      }
      
      if (!container) {
        this.logger.error(`Container ${containerId} not found`);
        return;}

      this.logger.debug(`Found container:`, container);

      // Ensure container is visible (fix for garrison chat issue)
      container.style.display = 'block';
      container.style.visibility = 'visible';
      container.style.opacity = '1';

      // Use DocumentFragment for better performance
      const fragment = document.createDocumentFragment();
      
      // Clear existing messages but keep welcome message
      const welcomeMessage = container.querySelector('.welcome-message');
      const existingMessages = container.querySelectorAll('.message');
      
      // Remove existing messages one by one to avoid clearing the entire container
      existingMessages.forEach(msg => {
        if (!msg.classList.contains('welcome-message')) {
          msg.remove();
        }
      });
      
      // If we have no messages and there's a welcome message, keep it
      if ((!messages || messages.length === 0) && welcomeMessage) {
        this.logger.debug(`Keeping welcome message for empty message list`);
        return;}
      
      // Remove welcome message if we have actual messages to display
      if (welcomeMessage && messages && messages.length > 0) {
        welcomeMessage.remove();
      }

      if (!messages || !Array.isArray(messages)) {
        this.logger.debug(`No messages to display for ${containerId}`);
        return;}

  
      const limitedMessages = messages.slice(-25);
      this.logger.debug(`Displaying ${limitedMessages.length} messages in ${containerId} (limited from ${messages.length})`);

      // Batch DOM operations using DocumentFragment
      limitedMessages.forEach((message, index) => {
        const messageElement = this.createMessageElement(message);
        fragment.appendChild(messageElement);
      });

      // Single DOM operation to add all messages
      container.appendChild(fragment);

      // Auto-scroll to bottom after displaying messages
      this.scrollToBottom(container);
      this.logger.debug(`Messages displayed successfully in ${containerId}`);
      
    } catch (error) {
      this.logger.error('Error displaying messages:', error);
    }
  }

  /**
   * Scroll container to bottom
   */
  scrollToBottom(container) {
    try {
      if (!container) return;container.scrollTop = container.scrollHeight;
      
      // Alternative approach for better compatibility
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
      
    } catch (error) {
      this.logger.error('Error scrolling to bottom:', error);
    }
  }

  /**
   * Create message element
   */
  createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type || 'public'}`;
    
    const isOwnMessage = message.sender?.userId === this.currentUser?.id;
    if (isOwnMessage) {
      messageDiv.classList.add('own-message');
    }

    // Check if this is a roleplay message (starts and ends with *)
    const isRoleplay = message.text.startsWith('*') && message.text.endsWith('*');
    // Check if this is a dice roll message (contains dice emoji and "rolled")
    const isDiceRoll = message.text.includes('🎲') && message.text.includes('rolled');
    
    if (isRoleplay || isDiceRoll) {
      messageDiv.classList.add('roleplay-message');
      if (isDiceRoll) {
        messageDiv.classList.add('dice-roll-message');
      }
    }

    const timestamp = new Date(message.createdAt).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // For roleplay/dice messages, don't show username separately since it's part of the action
    if (isRoleplay || isDiceRoll) {
      messageDiv.innerHTML = `
        <div class="message-header roleplay-header">
          <span class="message-time">${timestamp}</span>
        </div>
        <div class="message-content roleplay-content">${this.formatMessageContent(message.text)}</div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-header">
          <span class="message-author">${message.sender?.username || 'Unknown'}</span>
          <span class="message-time">${timestamp}</span>
        </div>
        <div class="message-content">${this.formatMessageContent(message.text)}</div>
      `;
    }

    return messageDiv;}

  /**
   * Format message content (handle mentions, links, roleplay, dice rolls, etc.)
   */
  formatMessageContent(text) {
    // Escape HTML
    const div = document.createElement('div');
    div.textContent = text;
    let formatted = div.innerHTML;

    // Handle dice roll messages
    if (formatted.includes('🎲') && formatted.includes('rolled')) {
      // Format dice rolls with special styling
      formatted = formatted.replace(/\*\*(\d+)\*\*/g, '<span class="dice-total">$1</span>');
      formatted = formatted.replace(/\[([^\]]+)\]/g, '<span class="dice-individual">[$1]</span>');
      formatted = formatted.replace(/(🎲\s*[\w\s]+\s+rolled\s+[^:]+:)/g, '<span class="dice-action">$1</span>');
    }
    // Handle roleplay messages (text wrapped in *)
    else if (formatted.startsWith('*') && formatted.endsWith('*')) {
      // Remove the outer asterisks and wrap in roleplay styling
      const roleplayText = formatted.slice(1, -1);
      formatted = `<em class="roleplay-action">${roleplayText}</em>`;
    } 
    // Handle @mentions for regular messages
    else {
      formatted = formatted.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    }
    
    // Handle basic URLs (for all message types)
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );

    return formatted;}

  /**
   * Send message based on current context
   */
  /**
   * Roll dice based on standard RPG notation (e.g., "1d20", "2d6+3", "d100")
   */
  rollDice(diceNotation) {
    // Parse dice notation (e.g., "2d6+3", "1d20", "d100")
    const match = diceNotation.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    
    if (!match) {
      // Default to 1d20 if format is invalid
      return this.rollDice('1d20');}
    
    const numDice = parseInt(match[1]) || 1;
    const diceSize = parseInt(match[2]);
    const modifier = parseInt(match[3]) || 0;
    
    // Limit dice for performance and sanity
    const limitedNumDice = Math.min(Math.max(numDice, 1), 20);
    const limitedDiceSize = Math.min(Math.max(diceSize, 2), 1000);
    
    const rolls = [];
    let total = 0;
    
    for (let i = 0; i < limitedNumDice; i++) {
      const roll = Math.floor(Math.random() * limitedDiceSize) + 1;
      rolls.push(roll);
      total += roll;
    }
    
    total += modifier;
    
    return {
      notation: `${limitedNumDice}d${limitedDiceSize}${modifier > 0 ? '+' + modifier : modifier < 0 ? modifier : ''}`,
      rolls: rolls,
      modifier: modifier,
      total: total,
      individual: rolls.length > 1
    };}

  /**
   * Process roleplay commands (e.g., "/smells flower" becomes "Username smelled a flower")
   * Also handles dice rolls (e.g., "/roll 1d20" or "/diceroll 2d6+3")
   */
  processRoleplayCommand(text) {
    // Check if message starts with /
    if (!text.startsWith('/') || !this.currentUser) {
      return { text, isRoleplay: false };}

    // Extract the command and arguments
    const command = text.slice(1).trim();
    const parts = command.split(' ');
    const commandName = parts[0].toLowerCase();
    
    if (!command) {
      return { text, isRoleplay: false };}

    const username = this.currentUser.displayName || this.currentUser.username;

    // Handle dice roll commands
    if (commandName === 'roll' || commandName === 'diceroll' || commandName === 'dice') {
      const diceNotation = parts.slice(1).join(' ').trim() || 'd20'; // Default to d20
      const result = this.rollDice(diceNotation);
      
      let rollText;
      if (result.individual) {
        // Multiple dice - show individual rolls
        const rollsList = result.rolls.join(', ');
        const modifierText = result.modifier ? ` ${result.modifier > 0 ? '+' : ''}${result.modifier}` : '';
        rollText = `🎲 ${username} rolled ${result.notation}: [${rollsList}]${modifierText} = **${result.total}**`;
      } else {
        // Single die
        const modifierText = result.modifier ? ` ${result.modifier > 0 ? '+' : ''}${result.modifier} = **${result.total}**` : ` = **${result.total}**`;
        rollText = `🎲 ${username} rolled ${result.notation}: ${result.rolls[0]}${modifierText}`;
      }
      
      return {
        text: rollText,
        isRoleplay: true,
        isDiceRoll: true,
        diceResult: result,
        originalAction: command
      };}

    // Handle regular roleplay actions
    const roleplayText = `*${username} ${command}*`;
    
    return { 
      text: roleplayText, 
      isRoleplay: true,
      isDiceRoll: false,
      originalAction: command
    };}

  async sendMessage() {
    const input = this.floatingWindow.querySelector('.chat-input');
    const originalText = input.value.trim();
    
    if (!originalText) return;const { text, isRoleplay } = this.processRoleplayCommand(originalText);

    // Check if we're in a private chat with a specific user
    const activePrivateTab = this.floatingWindow?.querySelector('.private-user-tab.active[data-user-id]');
    
    try {
      if (activePrivateTab) {
        // Send private message to the active user
        await this.sendPrivateMessage(text);
      } else {
        // Determine context from active tab
        const activeTab = this.floatingWindow?.querySelector('.context-tab.active');
        const context = activeTab?.dataset.context || 'global';
        const roomId = activeTab?.dataset.roomId;
        
        switch (context) {
          case 'global':
            await this.sendGlobalMessage(text);
            break;
          case 'clan':
            await this.sendClanMessage(text);
            break;
          case 'private':
            await this.sendPrivateMessage(text);
            break;
          case 'group':
            await this.sendGroupMessage(text);
            break;
          case 'room':
            if (roomId) {
              await this.sendRoomMessage(text, roomId);
            } else {
              this.logger.error('No room ID found for room message');
            }
            break;
          default:
            await this.sendGlobalMessage(text);
        }
      }
    } catch (error) {
              this.logger.error('Failed to send message:', error);
        this.showError(this.errorMessages.SEND_MESSAGE_FAILED);
    }

    input.value = '';
    
    // Log roleplay action if it was one
    if (isRoleplay) {
      this.logger.debug(`Roleplay action: "${originalText}" → "${text}"`);
    }
  }

  /**
   * Send global message
   */
  async sendGlobalMessage(text) {
    if (this.socket && this.currentUser) {
      try {
        // Ensure socket is authenticated before sending message
        await this.ensureSocketAuthentication();
        
        // Create a local message object for immediate display
        const localMessage = {
          _id: `temp_${Date.now()}`,
          text: text,
          sender: {
            userId: this.currentUser.id,
            username: this.currentUser.username,
            displayName: this.currentUser.displayName,
            avatar: this.currentUser.avatar
          },
          gameType: this.currentGameType || 'wc2',
          type: 'public',
          timestamp: new Date().toISOString(),
          isLocal: true // Flag to identify local messages
        };
        
        // Immediately add to UI for instant feedback
        this.addMessageToContext(localMessage);
        
        // Send to server
        this.socket.emit('sendMessage', {
          text,
          type: 'public',
          gameType: this.currentGameType || 'wc2'
        });
        this.logger.debug(`Sent message to ${(this.currentGameType || 'wc2').toUpperCase()} chat: "${text}"`);
      } catch (error) {
        this.logger.error('Failed to send global message:', error);
        this.showError(this.errorMessages.SEND_MESSAGE_FAILED);
      }
    }
  }

  /**
   * Send clan message
   */
  async sendClanMessage(text) {
    try {
      // Get user's clan
      const clanResponse = await this.api.get('/api/clans/user');
      this.logger.debug('Sending clan message, clan response:', clanResponse);
      
      // Check if user has a clan and the response is successful
      // The API returns an array of clans, not a single clan
      if (clanResponse.success && Array.isArray(clanResponse.data) && clanResponse.data.length > 0) {
        const clan = clanResponse.data[0];this.logger.debug('Sending message to clan ID:', clan._id);
        
        // Send message via socket instead of API
        if (this.socket && this.socket.connected) {
          try {
            // Ensure socket is authenticated before sending message
            await this.ensureSocketAuthentication();
            
            // Create local message for immediate display
            const localMessage = {
              text,
              sender: {
                userId: this.currentUser.id,
                username: this.currentUser.username,
                avatar: this.currentUser.avatar
              },
              type: 'room',
              room: {
                roomId: clan._id,
                name: `${clan.name} Clan Chat`
              },
              createdAt: new Date(),
              isLocal: true
            };
            
            // Display message immediately
            this.addMessageToContext(localMessage);
            
            // Send to server
            this.socket.emit('sendMessage', {
              text,
              type: 'clan',
              clanId: clan._id
            });
            
            this.logger.success('Clan message sent via socket');
          } catch (error) {
            this.logger.error('Failed to send clan message via socket:', error);
            // Fallback to API if socket authentication fails
            const response = await this.api.post(`/api/clans/${clan._id}/chat`, { content: text });
            
            if (response.success) {
              this.logger.success('Clan message sent successfully via API fallback');
              this.loadClanMessages();
            } else {
              this.logger.warn('Failed to send clan message via API fallback:', response);
              this.showNotification('Failed to send clan message. Please try again.', 'error');
            }
          }
        } else {
          this.logger.warn('Socket not connected, falling back to API');
          // Fallback to API if socket not available
          const response = await this.api.post(`/api/clans/${clan._id}/chat`, { content: text });
          
          if (response.success) {
            this.logger.success('Clan message sent successfully via API');
            this.loadClanMessages();
          } else {
            this.logger.warn('Failed to send clan message via API:', response);
            this.showNotification('Failed to send clan message. Please try again.', 'error');
          }
        }
      } else {
        // User has no clan
        this.logger.info('User has no clan, cannot send message');
        this.showNotification('You must be a member of a clan to send clan messages.', 'warning');
      }
    } catch (error) {
      this.logger.error('Failed to send clan message:', error);
      this.showNotification('Failed to send clan message. Please try again.', 'error');
    }
  }

  /**
   * Handle incoming messages
   */
  handleIncomingMessage(message) {
    // Check if this message is for the current active game room
    const messageGameType = message.gameType || message.game || 'wc2';
    
    // Skip if this is the user's own message (we already showed it locally)
    if (this.currentUser && message.sender?.userId === this.currentUser.id) {
      this.logger.debug('Skipping own message echo from server');
      return;}
    
    // Always add to context for global messages when in global context and correct game
    // For other contexts, always add the message
    if (this.activeContext === 'global') {
      // For global context, only show if it's for the current game type
      if (messageGameType === this.currentGameType) {
        this.addMessageToContext(message);
        this.logger.debug(`Added ${messageGameType.toUpperCase()} message to global context`);
      } else {
        // Save to cache for other game types
        this.saveMessageToCache(message, 'global');
        this.logger.debug(`Received message for ${messageGameType.toUpperCase()} (currently viewing ${this.currentGameType.toUpperCase()})`);
      }
    } else {
      // For non-global contexts (clan, private, group), always add the message
      this.addMessageToContext(message);
      this.updateUnreadCount(message);
    }
    
    // Show notification if window is minimized or not available
    if (!this.floatingWindow || this.floatingWindow.classList.contains('minimized')) {
      this.showMessageNotification(message);
    }
  }

  /**
   * Handle private messages
   */
  handlePrivateMessage(message) {
    this.logger.debug('Handling private message:', message);
    
    // Determine sender information with multiple fallback options
    let senderId = message.sender?.userId || message.fromUserId || message.authorId || message.senderData?.userId;
    let senderUsername = message.sender?.username || message.fromUsername || message.author?.username || message.senderData?.username;
    
    // If standard fields don't work, try extracting from message structure
    if (!senderId && message.from) {
      senderId = message.from.id || message.from.userId;
      senderUsername = message.from.username;
    }
    
    if (!senderId || !senderUsername) {
      this.logger.error('Invalid private message - missing sender info:', message);
      this.logger.error('Available message fields:', Object.keys(message));
      return;}
    
    // Skip if this is the user's own message (we already showed it locally)
    if (this.currentUser && senderId === this.currentUser.id) {
      this.logger.debug('Skipping own private message echo from server');
      return;}
    
    this.logger.debug(`Processing private message from ${senderUsername} (${senderId})`);
    
    // Create or ensure user tab exists for the sender
    this.ensurePrivateChatTabExists(senderId, senderUsername);
    
    // Add message to the appropriate container
    const messageContainer = this.floatingWindow?.querySelector(`#private-messages-${senderId}`);
    if (messageContainer) {
      this.addMessageElement(message, messageContainer);
      this.logger.success(`Added message to container private-messages-${senderId}`);
    } else {
      this.logger.error(`Container private-messages-${senderId} not found`);
      // Try to create the container if it doesn't exist
      this.ensurePrivateChatTabExists(senderId, senderUsername);
      // Try again after creating
      const retryContainer = this.floatingWindow?.querySelector(`#private-messages-${senderId}`);
      if (retryContainer) {
        this.addMessageElement(message, retryContainer);
        this.logger.success(`Added message to newly created container private-messages-${senderId}`);
      }
    }
    
    // Show notification if not currently viewing this chat
    const userTab = this.floatingWindow?.querySelector(`[data-user-id="${senderId}"].context-tab`);
    if (userTab && !userTab.classList.contains('active')) {
      this.showPrivateChatNotification(senderId);
      this.logger.debug(`Showing notification for ${senderUsername}`);
    }
    
    // Update private conversations list if needed
    this.updatePrivateConversationsList(message);
    
    // Show browser notification if window is minimized or not focused
    if (!this.floatingWindow || this.floatingWindow.classList.contains('minimized') || !document.hasFocus()) {
      this.showMessageNotification(message);
    }
    
    this.logger.success(`Private message handled from ${senderUsername}`);
  }

  /**
   * Handle private chat requests from other users
   */
  handlePrivateChatRequest(request) {
    this.logger.debug('Processing private chat request:', request);
    
    const fromUserId = request.fromUserId;
    const fromUsername = request.fromUsername;
    
    if (!fromUserId || !fromUsername) {
      this.logger.error('Invalid private chat request - missing sender info:', request);
      return;}
    
    // Don't process requests from ourselves
    if (this.currentUser && fromUserId === this.currentUser.id) {
      this.logger.debug('Ignoring own private chat request');
      return;}
    
    // Create a tab for the requester if it doesn't exist
    this.ensurePrivateChatTabExists(fromUserId, fromUsername);
    
    // Show notification that someone wants to chat
    this.showNotification(`${fromUsername} wants to chat with you`, 'info');
    
    // Show blinking notification on their tab
    this.showPrivateChatNotification(fromUserId);
    
    this.logger.success(`Private chat request handled from ${fromUsername}`);
  }

  /**
   * Handle incoming notifications
   */
  handleNotification(notification) {
    this.logger.debug('Received notification:', notification);
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title || 'New Notification', {
        body: notification.message || notification.text,
        icon: '/assets/img/chat-icon.png',
        tag: 'chat-notification'
      });
      
      browserNotification.onclick = () => {
        window.focus();
        this.showFloatingWindow();
        browserNotification.close();
      };
    }
    
    // Update UI notification indicator
    this.updateNotificationIndicator();
  }

  /**
   * Update notification indicator in navbar
   */
  updateNotificationIndicator() {
    const notificationDot = document.querySelector('.chat-notification-dot');
    if (notificationDot) {
      notificationDot.style.display = 'block';
    }
  }

  /**
   * Update unread count
   */
  updateUnreadCount(message) {
    let contextType = 'global';
    
    if (message.type === 'private') {
      contextType = 'private';
    } else if (message.type === 'room' && message.room) {
      contextType = 'clan'; // Assuming room messages are clan messages
    }
    
    if (this.activeContext !== contextType) {
      this.unreadCounts[contextType]++;
      this.updateBadge(contextType);
    }
  }

  /**
   * Update notification badge
   */
  updateBadge(contextType) {
    const badge = this.floatingWindow.querySelector(`[data-context="${contextType}"]`);
    if (badge) {
      const count = this.unreadCounts[contextType];
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  }

  /**
   * Clear unread count
   */
  clearUnreadCount(contextType) {
    this.unreadCounts[contextType] = 0;
    this.updateBadge(contextType);
  }

  /**
   * Setup notification system
   */
  setupNotificationSystem() {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Setup service worker for background notifications
    if ('serviceWorker' in navigator) {
      this.setupServiceWorker();
    }
  }

  /**
   * Setup service worker for background notifications
   */
  setupServiceWorker() {
    // Register service worker for background notifications
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      this.logger.success('Service Worker registered:', registration);
    }).catch((error) => {
      this.logger.error('Service Worker registration failed:', error);
    });
  }

  /**
   * Show browser notification
   */
  showMessageNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`New message from ${message.sender?.username}`, {
        body: message.text.substring(0, 100),
        icon: '/assets/img/chat-icon.png',
        tag: 'chat-message'
      });
      
      notification.onclick = () => {
        window.focus();
        this.showFloatingWindow();
        notification.close();
      };
    }
  }

  /**
   * Toggle minimize state
   */
  toggleMinimize() {
    const isCurrentlyMinimized = this.floatingWindow.classList.contains('minimized');
    const minimizeBtn = this.floatingWindow.querySelector('.btn-minimize');
    
    if (isCurrentlyMinimized) {
      // Restore window to full height position
      this.floatingWindow.classList.remove('minimized');
      
      // Center the window instead of using fixed positioning
      this.centerChatWindow();
      
      if (minimizeBtn) {
        minimizeBtn.innerHTML = '−';
        minimizeBtn.title = 'Minimize';
      }
      this.logger.debug('Chat window restored and centered');
    } else {
      // Minimize window and position at bottom right
      this.floatingWindow.classList.add('minimized');
      this.floatingWindow.style.height = '60px'; // Header height only
      this.floatingWindow.style.width = '280px'; // Compact width for header
      
      // Position at bottom right of screen
      this.floatingWindow.style.position = 'fixed';
      this.floatingWindow.style.bottom = '20px';
      this.floatingWindow.style.right = '20px';
      this.floatingWindow.style.left = 'auto';
      this.floatingWindow.style.top = 'auto';
      this.floatingWindow.style.transform = 'none';
      
      if (minimizeBtn) {
        minimizeBtn.innerHTML = '□';
        minimizeBtn.title = 'Restore';
      }
      this.logger.debug('Chat window minimized to bottom right');
    }
    
    // Update stored state
    this.isMinimized = !isCurrentlyMinimized;
    localStorage.setItem('chatWindowMinimized', this.isMinimized.toString());
  }

  /**
   * Toggle expand state
   */
  toggleExpand() {
    const isCurrentlyExpanded = this.floatingWindow.classList.contains('expanded');
    
    if (isCurrentlyExpanded) {
      // Restore to normal size
      this.floatingWindow.classList.remove('expanded');
      this.floatingWindow.style.width = '350px';
      this.floatingWindow.style.height = '500px';
      this.logger.debug('Chat window restored to normal size');
    } else {
      // Expand window
      this.floatingWindow.classList.add('expanded');
      this.floatingWindow.style.width = '500px';
      this.floatingWindow.style.height = '700px';
      this.logger.debug('Chat window expanded');
    }
    
    // Save state
    localStorage.setItem('chatWindowExpanded', 
      this.floatingWindow.classList.contains('expanded'));
  }

  /**
   * Hide floating window and show floating chat icon
   */
  hideFloatingWindow() {
    if (this.floatingWindow) {
      this.floatingWindow.style.display = 'none';
    }
    
    // Show the floating icon when window is hidden
    if (this.isActive && !this.floatingChatIcon) {
      this.createFloatingChatIcon();
    } else {
      this.updateIconVisibility();
    }
    
    // Deactivate chat to reduce server load
    this.deactivateChat();
    
    this.logger.debug('Chat window hidden, chat deactivated');
  }

  /**
   * Show floating window and hide floating chat icon
   */
  showFloatingWindow() {
    if (!this.floatingWindow) {
      this.logger.debug('No floating window exists, creating one...');
      this.createFloatingChatWindow();
    }
    
    this.floatingWindow.style.display = 'block';
    
    // Center the window in the browser when first shown
    this.centerChatWindow();
    
    // Update icon visibility (should hide when window is shown)
    this.updateIconVisibility();
    
    // Clear closed state
    localStorage.setItem('chatWindowClosed', 'false');
    
    // Ensure content is loaded
    this.ensureContentLoaded();
    
    this.logger.debug('Floating window shown and centered');
  }

  /**
   * Check if the chat window is currently visible
   */
  isWindowVisible() {
    if (!this.floatingWindow) return false;if (this.floatingWindow.style.display === 'none') {
      return false;}
    
    // Check if element is actually visible in the DOM (handles CSS defaults)
    const computedStyle = window.getComputedStyle(this.floatingWindow);
    return computedStyle.display !== 'none';}

  /**
   * Update icon visibility based on chat state (for toggle behavior, icon stays visible when chat is active)
   */
  updateIconVisibility() {
    if (this.floatingChatIcon) {
      // For toggle behavior: keep icon visible when chat is active, regardless of window state
      if (this.isActive) {
        this.floatingChatIcon.style.display = 'flex';
      } else {
        this.floatingChatIcon.style.display = 'none';
      }
    }
  }

  /**
   * Toggle chat window visibility (without deactivating chat)
   */
  toggleChatWindow() {
    if (!this.floatingWindow) {
      this.logger.debug('No floating window exists, creating one...');
      this.createFloatingChatWindow();
      this.centerChatWindow();
      return;}
    
    if (this.isWindowVisible()) {
      // Hide window but keep chat active
      this.floatingWindow.style.display = 'none';
      
      // Show the floating icon when window is hidden
      if (!this.floatingChatIcon) {
        this.createFloatingChatIcon();
      } else {
        this.updateIconVisibility();
      }
      
      this.logger.debug('Chat window hidden (toggled)');
    } else {
      // Show window
      this.floatingWindow.style.display = 'block';
      this.centerChatWindow();
      this.updateIconVisibility();
      
      // Ensure content is loaded
      this.ensureContentLoaded();
      
      this.logger.debug('Chat window shown (toggled)');
    }
  }

  /**
   * Center the chat window in the browser viewport
   */
  verifyChatCSS() {
    this.logger.debug('Verifying chat CSS loading...');
    
    // Check if CSS link exists
    const cssLink = document.querySelector('link[href="/css/chat-unified.css"]');
    if (cssLink) {
      this.logger.success('Chat CSS link found in DOM');
    } else {
      this.logger.warn('Chat CSS link not found, attempting to load...');
      this.loadChatCSS();
    }
    
    // Test if CSS is actually applied by checking computed styles
    const testElement = document.createElement('div');
    testElement.className = 'floating-chat-window';
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    const hasChatStyles = computedStyle.background && 
                         computedStyle.background !== 'rgba(0, 0, 0, 0)' &&
                         computedStyle.borderRadius !== '0px';
    
    document.body.removeChild(testElement);
    
    if (hasChatStyles) {
      this.logger.success('Chat CSS styles are applied');
    } else {
      this.logger.warn('Chat CSS styles not applied, using inline styles');
    }
  }
  
  loadChatCSS() {
    this.logger.debug('Loading chat CSS...');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/chat-unified.css';
    link.onload = () => {
      this.logger.success('Chat CSS loaded successfully');
    };
    link.onerror = () => {
      this.logger.error('Failed to load chat CSS');
    };
    document.head.appendChild(link);
  }

  centerChatWindow() {
    if (!this.floatingWindow) return;this.logger.debug('Centering chat window...');
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    this.logger.debug(`Viewport: ${viewportWidth}x${viewportHeight}`);
    
    // Wait for the window to be fully rendered
    const getWindowDimensions = () => {
      const rect = this.floatingWindow.getBoundingClientRect();
      const windowWidth = rect.width || this.floatingWindow.offsetWidth || 800;
      const windowHeight = rect.height || this.floatingWindow.offsetHeight || 600;
      return { windowWidth, windowHeight };};
    
    const { windowWidth, windowHeight } = getWindowDimensions();
    
    this.logger.debug(`Window dimensions: ${windowWidth}x${windowHeight}`);
    
    // Calculate center position
    const centerX = (viewportWidth - windowWidth) / 2;
    const centerY = (viewportHeight - windowHeight) / 2;
    
    // Ensure minimum margins from edges
    const minMargin = 20;
    const finalX = Math.max(minMargin, Math.min(centerX, viewportWidth - windowWidth - minMargin));
    const finalY = Math.max(minMargin, Math.min(centerY, viewportHeight - windowHeight - minMargin));
    
    this.logger.debug(`Calculated position: (${finalX}, ${finalY})`);
    
    // Apply positioning with smooth transition
    this.floatingWindow.style.position = 'fixed';
    this.floatingWindow.style.left = finalX + 'px';
    this.floatingWindow.style.top = finalY + 'px';
    this.floatingWindow.style.right = 'auto';
    this.floatingWindow.style.bottom = 'auto';
    this.floatingWindow.style.transform = 'none';
    this.floatingWindow.style.transition = 'all 0.3s ease';
    
    // Force a reflow to ensure the positioning is applied
    this.floatingWindow.offsetHeight;
    
    // Verify the positioning was applied
    setTimeout(() => {
      const finalRect = this.floatingWindow.getBoundingClientRect();
      this.logger.success(`Final position: (${finalRect.left}, ${finalRect.top})`);
      this.logger.success(`Final dimensions: ${finalRect.width}x${finalRect.height}`);
    }, 100);
    
    this.logger.debug(`Chat window centered at (${finalX}, ${finalY}) with dimensions ${windowWidth}x${windowHeight}`);
  }

  /**
   * Create floating chat icon for reopening chat
   */
  createFloatingChatIcon() {
    // Remove existing icon if any
    this.removeFloatingChatIcon();
    
    const chatIcon = document.createElement('div');
    chatIcon.id = 'floating-chat-icon';
    chatIcon.className = 'floating-chat-icon';
    chatIcon.innerHTML = `
      <div class="chat-icon-inner">
        <span class="garrison-icon">⚔️</span>
        <div class="chat-icon-pulse"></div>
      </div>
      <div class="chat-icon-tooltip">${this.isActive ? 'Open Garrison' : 'Activate Garrison Chat'}</div>
    `;
    
    // Add click event to toggle chat window
    chatIcon.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      this.logger.debug('Chat icon clicked', { isActive: this.isActive, windowVisible: this.isWindowVisible() });
      
      if (!this.isActive) {
        // Chat not active, activate it
        await this.activateChat();
      } else {
        // Chat is active, toggle window visibility
        this.toggleChatWindow();
      }
    });
    
    // Add hover effects
    chatIcon.addEventListener('mouseenter', () => {
      chatIcon.querySelector('.chat-icon-tooltip').style.opacity = '1';
    });
    
    chatIcon.addEventListener('mouseleave', () => {
      chatIcon.querySelector('.chat-icon-tooltip').style.opacity = '0';
    });
    
    document.body.appendChild(chatIcon);
    this.floatingChatIcon = chatIcon;
    
    // Add styles for the floating icon
    this.addFloatingIconStyles();
    
    this.logger.debug('Floating chat icon created');
  }

  /**
   * Remove floating chat icon
   */
  removeFloatingChatIcon() {
    const existingIcon = document.getElementById('floating-chat-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
    this.floatingChatIcon = null;
  }

  /**
   * Add CSS styles for floating chat icon
   */
  addFloatingIconStyles() {
    if (document.getElementById('floating-chat-icon-styles')) return;if (!document.querySelector('link[href*="emoji-picker.css"]')) {
      const emojiCSS = document.createElement('link');
      emojiCSS.rel = 'stylesheet';
      emojiCSS.href = '/css/emoji-picker.css';
      document.head.appendChild(emojiCSS);
    }
    
    const styles = document.createElement('style');
    styles.id = 'floating-chat-icon-styles';
    styles.textContent = `
      .floating-chat-icon {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #CD853F 100%);
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.2);
        cursor: pointer;
        z-index: 1000003;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        border: 3px solid #FFD700;
        user-select: none;
      }
      
      .floating-chat-icon:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 215, 0, 0.4);
        border-color: #FFA500;
      }
      
      .chat-icon-inner {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .garrison-icon {
        font-size: 28px;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
        animation: garrisonPulse 2s ease-in-out infinite;
      }
      
      .chat-icon-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
        border-radius: 50%;
        animation: iconPulse 2s ease-in-out infinite;
      }
      
      .chat-icon-tooltip {
        position: absolute;
        bottom: 70px;
        right: 0;
        background: rgba(0, 0, 0, 0.9);
        color: #FFD700;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        border: 1px solid #FFD700;
      }
      
      .chat-icon-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        right: 20px;
        border: 6px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.9);
      }
      
      @keyframes garrisonPulse {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.1) rotate(-2deg); }
        50% { transform: scale(1) rotate(0deg); }
        75% { transform: scale(1.1) rotate(2deg); }
      }
      
      @keyframes iconPulse {
        0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.2); }
      }
      
      /* Roleplay Message Styles */
      .message.roleplay-message {
        background: rgba(138, 43, 226, 0.1) !important;
        border-left: 3px solid #8a2be2;
        margin: 8px 0;
        border-radius: 8px;
        padding: 8px 12px;
      }
      
      /* Dice Roll Message Styles */
      .message.dice-roll-message {
        background: rgba(255, 165, 0, 0.1) !important;
        border-left: 3px solid #ffa500;
        border-right: 3px solid #ffa500;
        box-shadow: 0 0 15px rgba(255, 165, 0, 0.2);
      }
      
      .roleplay-header {
        justify-content: flex-end !important;
        margin-bottom: 4px;
      }
      
      .roleplay-content {
        text-align: center;
        padding: 4px 8px;
      }
      
      .roleplay-action {
        color: #bb86fc;
        font-style: italic;
        font-weight: 500;
        text-shadow: 0 0 8px rgba(187, 134, 252, 0.3);
        font-size: 1.05em;
      }
      
      /* Dice Roll Specific Styles */
      .dice-action {
        color: #ffa500;
        font-weight: 600;
        text-shadow: 0 0 8px rgba(255, 165, 0, 0.4);
      }
      
      .dice-total {
        color: #32cd32;
        font-weight: bold;
        font-size: 1.2em;
        text-shadow: 0 0 10px rgba(50, 205, 50, 0.5);
        background: rgba(50, 205, 50, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(50, 205, 50, 0.3);
      }
      
      .dice-individual {
        color: #87ceeb;
        font-weight: 500;
        text-shadow: 0 0 6px rgba(135, 206, 235, 0.4);
        background: rgba(135, 206, 235, 0.1);
        padding: 1px 4px;
        border-radius: 3px;
        margin: 0 2px;
      }
      
      /* Roleplay input help */
      .chat-input[placeholder*="roleplay" i] {
        border-color: rgba(138, 43, 226, 0.3);
      }
      
      /* Icon visibility is controlled by JavaScript, not CSS */
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Ensure chat content is properly loaded
   */
  ensureContentLoaded() {
    if (!this.floatingWindow) return;this.floatingWindow.querySelectorAll('.context-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.context === this.activeContext);
    });
    
    // Ensure the correct context content is active
    this.floatingWindow.querySelectorAll('.context-content').forEach(content => {
      content.classList.toggle('active', content.dataset.context === this.activeContext);
    });
    
    // Check if we have welcome messages or actual content
    const globalMessages = this.floatingWindow.querySelector('#global-messages');
    const clanMessages = this.floatingWindow.querySelector('#clan-messages');
    
    if (globalMessages && globalMessages.children.length === 0) {
      globalMessages.innerHTML = `
        <div class="welcome-message">
          <i class="fas fa-gamepad"></i>
          <h4>WC2 Garrison</h4>
          <p>Welcome to WC2 Global Chat! Connect with other WC2 players.</p>
        </div>
      `;
    }
    
    if (clanMessages && clanMessages.children.length === 0) {
      clanMessages.innerHTML = `
        <div class="welcome-message">
          <i class="fas fa-shield-alt"></i>
          <p>Welcome to Clan Garrison! Connect with your clan members.</p>
        </div>
      `;
    }
    
    // Load context data for current active context
    if (this.activeContext) {
      this.loadContextData(this.activeContext);
    }
    
    this.logger.debug('Content loaded for context:', this.activeContext);
  }

  /**
   * Integration with Discord voice
   */
  setupDiscordIntegration() {
    // This would integrate with Discord's API for voice channels
    // Could show Discord voice channel status in the chat window
  }

  /**
   * Cross-site messaging
   */
  async sendCrossSiteMessage(userId, message) {
    try {
      const response = await this.api.post('/api/chat/cross-site', {
        recipientId: userId,
        text: message,
        context: window.location.pathname
      });
      
      if (response.success) {
        this.showSuccessNotification('Message sent successfully');
      }
    } catch (error) {
      this.logger.error('Failed to send cross-site message:', error);
    }
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(status) {
    this.logger.debug(`Connection status: ${status}`);
    
    // Update existing indicator
    const indicator = this.floatingWindow?.querySelector('.connection-status');
    if (indicator) {
      indicator.className = `connection-status ${status}`;
      indicator.title = `Connection: ${status}`;
    }
    
    // Update new indicator in chat header
    const headerIndicator = document.getElementById('connection-status-indicator');
    if (headerIndicator) {
      headerIndicator.className = `connection-status-indicator ${status}`;
      headerIndicator.title = `Connection: ${status}`;
      
      // Add status text if not exists
      let statusText = headerIndicator.querySelector('.connection-status-text');
      if (!statusText) {
        statusText = document.createElement('span');
        statusText.className = 'connection-status-text';
        statusText.style.cssText = `
          font-size: 10px;
          margin-left: 8px;
          opacity: 0.7;
        `;
        headerIndicator.appendChild(statusText);
      }
      
      statusText.textContent = status;
      statusText.style.color = status === 'connected' ? '#10b981' : 
                              status === 'connecting' ? '#f59e0b' : '#ef4444';
    }
  }

  /**
   * Add message to appropriate context container
   */
  addMessageToContext(message) {
    try {
      const context = message.type === 'private' ? 'private' : 
                     message.type === 'group' ? 'group' : 
                     message.type === 'clan' ? 'clan' : 'global';
      
      // Determine container based on context and game type
      let containerId;
      if (context === 'global') {
        containerId = 'global-messages';
      } else if (context === 'clan') {
        containerId = 'clan-messages';
      } else if (context === 'private') {
        containerId = 'private-messages';
      } else if (context === 'group') {
        containerId = 'group-messages';
      }
      
      if (!containerId) {
        this.logger.warn('Unknown message context:', message);
        return;}
      
      const container = this.floatingWindow.querySelector(`#${containerId}`);
      if (!container) {
        this.logger.warn(`Container ${containerId} not found`);
        return;}
      
      // Add the message element
      this.addMessageElement(message, container);
      
      // Auto-scroll to bottom only if user is at or near bottom already
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom || this.activeContext === context) {
        this.scrollToBottom(container);
      }
      
      // Save to cache
      this.saveMessageToCache(message, context);
      
      this.logger.debug(`Added message to ${context} context`);
      
    } catch (error) {
      this.logger.error('Error adding message to context:', error);
    }
  }

  /**
   * Update private conversations list
   */
  updatePrivateConversationsList(message) {
    const conversationList = this.floatingWindow?.querySelector('#private-conversations');
    if (!conversationList) return;const senderId = message.sender?.userId;
    if (!senderId) return;let conversationItem = conversationList.querySelector(`[data-user-id="${senderId}"]`);
    
    if (!conversationItem) {
      conversationItem = document.createElement('div');
      conversationItem.className = 'conversation-item';
      conversationItem.dataset.userId = senderId;
      conversationItem.innerHTML = `
        <div class="conversation-avatar">${message.sender.username?.[0] || '?'}</div>
        <div class="conversation-info">
          <div class="conversation-name">${message.sender.username || 'Unknown'}</div>
          <div class="conversation-preview">${message.text.substring(0, 50)}...</div>
        </div>
        <div class="conversation-unread">1</div>
      `;
      
      conversationItem.addEventListener('click', () => {
        this.openPrivateConversation(senderId);
      });
      
      conversationList.appendChild(conversationItem);
    } else {
      // Update existing conversation
      const preview = conversationItem.querySelector('.conversation-preview');
      const unread = conversationItem.querySelector('.conversation-unread');
      
      if (preview) preview.textContent = message.text.substring(0, 50) + '...';
      if (unread) {
        const count = parseInt(unread.textContent || '0') + 1;
        unread.textContent = count;
        unread.style.display = 'inline';
      }
    }
  }

  /**
   * Open private conversation with specific user
   */
  async openPrivateConversation(userId) {
    try {
      this.logger.info(`Opening private conversation with user: ${userId}`);
      
      // Load conversation history
      const response = await this.api.get(`/api/chat/private/conversation/${userId}`);
      if (response.success) {
        // Get the username from the response or from the tab
        let username = null;
        if (response.data && response.data.length > 0) {
          const firstMessage = response.data[0];
          username = firstMessage.author?.username || firstMessage.recipient?.username;
        }
        
        // Find the user-specific container
        const containerId = `private-messages-${userId}`;
        const container = this.floatingWindow?.querySelector(`#${containerId}`);
        
        if (container) {
          this.displayMessages(response.data || [], containerId);
          this.logger.success(`Loaded ${response.data?.length || 0} messages for user ${userId}`);
        } else {
          this.logger.warn(`Container ${containerId} not found for user ${userId}`);
        }
      } else {
        this.logger.error('Failed to load conversation:', response.message);
        this.showNotification('Failed to load conversation', 'error');
      }
    } catch (error) {
      this.logger.error('Error opening private conversation:', error);
      this.showNotification('Error loading conversation', 'error');
    }
  }

  /**
   * Display private conversation messages
   */
  displayPrivateConversation(userId, messages) {
    const conversationView = this.floatingWindow?.querySelector('#private-conversation-view');
    if (!conversationView) return;conversationView.innerHTML = `
      <div class="conversation-header">
        <h4>Private Chat</h4>
      </div>
      <div class="conversation-messages" id="private-conversation-messages"></div>
    `;
    
    this.displayMessages(messages, 'private-conversation-messages');
  }

  /**
   * Show success notification
   */
  showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'chat-notification show';
    notification.innerHTML = `
      <div class="notification-header">
        <span class="notification-title">Success</span>
        <button class="notification-close">&times;</button>
      </div>
      <div class="notification-content">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Close button
    notification.querySelector('.notification-close')?.addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    });
  }

  /**
   * Send private message
   */
  async sendPrivateMessage(text) {
    // Get the currently active private chat tab
    const activePrivateTab = this.floatingWindow?.querySelector('.private-user-tab.active[data-user-id]');
    
    if (!activePrivateTab) {
      this.showNotification('Please select a user to chat with first', 'warning');
      return;}
    
    const recipientId = activePrivateTab.dataset.userId;
    const recipientUsername = activePrivateTab.querySelector('.tab-username')?.textContent;
    
    if (!recipientId) {
      this.showNotification('Invalid chat recipient', 'error');
      return;}
    
    if (this.socket && this.socket.connected) {
      try {
        // Ensure socket is authenticated before sending message
        await this.ensureSocketAuthentication();
        
        // Create local message for immediate display
        const localMessage = {
          _id: `temp_${Date.now()}`,
          text: text,
          sender: {
            userId: this.currentUser?.id,
            username: this.currentUser?.username,
            displayName: this.currentUser?.displayName,
            avatar: this.currentUser?.avatar
          },
          type: 'private',
          createdAt: new Date().toISOString(),
          isLocal: true,
          recipientId: recipientId
        };
        
        // Add to current chat immediately
        const messageContainer = this.floatingWindow?.querySelector(`#private-messages-${recipientId}`);
        if (messageContainer) {
          this.addMessageElement(localMessage, messageContainer);
        }
        
        // Send to server using the backend's expected format
        this.logger.debug('Sending private message via socket with data:', {
          recipientId,
          text: text,
          type: 'private'
        });
        
        // Use the backend's expected format for sendPrivateMessage
        this.socket.emit('sendPrivateMessage', {
          recipientId,
          text: text
        });
        
        this.logger.debug(`Sent private message to ${recipientUsername} (${recipientId}): "${text}"`);
      } catch (error) {
        this.logger.error('Failed to send private message:', error);
        this.showError(this.errorMessages.SEND_PRIVATE_MESSAGE_FAILED);
      }
    } else {
      this.showNotification('Not connected to chat server', 'error');
    }
  }

  /**
   * Send group message
   */
  async sendGroupMessage(groupId, text) {
    try {
      if (!this.validators.isValidText(text)) {
        this.logger.warn('Cannot send empty group message');
        return;}

      if (this.socket && this.socket.connected) {
        // Ensure socket is authenticated before sending message
        await this.ensureSocketAuthentication();
        
        this.socket.emit('sendMessage', {
          text: text.trim(),
          type: 'group',
          groupId: groupId
        });
        
        // Clear the input field
        const input = this.floatingWindow.querySelector(`input[data-group-id="${groupId}"]`);
        if (input) {
          input.value = '';
        }
        
        this.logger.debug(`Sent group message to ${groupId}: "${text}"`);
      } else {
        this.logger.error('Socket not connected, cannot send group message');
        this.showError(this.errorMessages.NOT_CONNECTED);
      }
    } catch (error) {
      this.logger.error('Error sending group message:', error);
      this.showError(this.errorMessages.SEND_GROUP_MESSAGE_FAILED);
    }
  }

  /**
   * Load saved contexts from localStorage
   */
  loadSavedContexts() {
    try {
      // Restore window state
      const isMinimized = localStorage.getItem('chatWindowMinimized') === 'true';
      const isExpanded = localStorage.getItem('chatWindowExpanded') === 'true';
      const lastContext = localStorage.getItem('chatActiveContext') || 'global';
      const lastGameType = localStorage.getItem('chatActiveGameType') || 'wc1';
      const customSize = localStorage.getItem('chatWindowCustomSize');
      const wasClosed = localStorage.getItem('chatWindowClosed') === 'true';
      
      // Restore game type
      this.currentGameType = lastGameType;
      
      if (this.floatingWindow) {
        const minimizeBtn = this.floatingWindow.querySelector('.btn-minimize');
        
        // Update active game tab
        this.floatingWindow.querySelectorAll('.game-tab').forEach(tab => {
          tab.classList.toggle('active', tab.dataset.game === lastGameType);
        });
        
        // If window was closed, show icon instead
        if (wasClosed) {
          this.floatingWindow.style.display = 'none';
          this.createFloatingChatIcon();
          this.logger.debug('Restored closed state - showing floating icon');
          return;}
        
        // Apply custom size if available
        if (customSize) {
          try {
            const size = JSON.parse(customSize);
            this.floatingWindow.style.width = size.width + 'px';
            this.floatingWindow.style.height = size.height + 'px';
            this.floatingWindow.style.left = size.left + 'px';
            this.floatingWindow.style.top = size.top + 'px';
            this.floatingWindow.style.transform = 'none'; // Use absolute positioning
            this.logger.debug(`Restored custom size: ${size.width}x${size.height}`);
          } catch (e) {
            this.logger.warn('Failed to parse custom size, using defaults');
          }
        }
        
        // Apply minimized state if user previously minimized it
        if (isMinimized) {
          this.floatingWindow.classList.add('minimized');
          this.floatingWindow.style.height = '60px';
          this.floatingWindow.style.width = '280px';
          
          // Position at bottom right when minimized
          this.floatingWindow.style.position = 'fixed';
          this.floatingWindow.style.bottom = '20px';
          this.floatingWindow.style.right = '20px';
          this.floatingWindow.style.left = 'auto';
          this.floatingWindow.style.top = 'auto';
          this.floatingWindow.style.transform = 'none';
          
          if (minimizeBtn) {
            minimizeBtn.innerHTML = '□';
            minimizeBtn.title = 'Restore';
          }
          this.logger.debug('Restored minimized state at bottom right');
        } else {
          // Ensure it's not minimized and visible with content
          this.floatingWindow.classList.remove('minimized');
          this.floatingWindow.style.display = 'block';
          
          // Apply expanded state if user previously expanded it (and no custom size)
          if (isExpanded && !customSize) {
            this.floatingWindow.classList.add('expanded');
            this.floatingWindow.style.width = '500px';
            this.floatingWindow.style.height = '700px';
          } else if (!customSize) {
            // Default size only if no custom size set
            this.floatingWindow.style.width = '350px';
            this.floatingWindow.style.height = '500px';
          }
          
          if (minimizeBtn) {
            minimizeBtn.innerHTML = '−';
            minimizeBtn.title = 'Minimize';
          }
          this.logger.debug('Chat window shown in normal state');
        }
        
        // Update internal state
        this.isMinimized = isMinimized;
      }
      
      // Restore active context
      this.activeContext = lastContext;
      this.switchContext(lastContext);
      
      // Ensure content is loaded for the active context
      this.ensureContentLoaded();
      
      this.logger.success('Saved contexts loaded:', { 
        isMinimized, 
        isExpanded, 
        lastContext, 
        lastGameType,
        wasClosed,
        hasCustomSize: !!customSize 
      });
    } catch (error) {
      this.logger.error('Failed to load saved contexts:', error);
    }
  }

  /**
   * Load cached messages from localStorage
   */
  loadCachedMessages() {
    try {
      const cachedMessages = localStorage.getItem('chatCachedMessages');
      if (cachedMessages) {
        const messages = JSON.parse(cachedMessages);
        
        // Restore messages to appropriate contexts
        Object.keys(messages).forEach(context => {
          if (messages[context] && messages[context].length > 0) {
            const containerId = this.getContainerIdForContext(context);
            if (containerId) {
              this.displayMessages(messages[context], containerId);
            }
          }
        });
        
        this.logger.success('Cached messages loaded');
      }
    } catch (error) {
      this.logger.error('Failed to load cached messages:', error);
    }
  }

  /**
   * Get container ID for context
   */
  getContainerIdForContext(context) {
    const containerMap = {
      'global': 'global-messages',
      'clan': 'clan-messages',
      'private': 'private-conversation-messages',
      'group': 'group-messages'
    };
    return containerMap[context];}

  /**
   * Save message to cache with optimized performance
   */
  saveMessageToCache(message, context) {
    try {
      // Use in-memory cache first for better performance
      if (!this.messageCache[context]) {
        this.messageCache[context] = context === 'global' ? { wc1: [], wc2: [], wc3: [] } : [];
      }
      
      // For global context, save to specific game cache
      if (context === 'global' && this.currentGameType) {
        if (!this.messageCache[context][this.currentGameType]) {
          this.messageCache[context][this.currentGameType] = [];
        }
        this.messageCache[context][this.currentGameType].push(message);
        
        // Keep only last 25 messages per game (reduced for performance)
        if (this.messageCache[context][this.currentGameType].length > 25) {
          this.messageCache[context][this.currentGameType] = 
            this.messageCache[context][this.currentGameType].slice(-25);
        }
      } else {
        // For other contexts (clan, private, group)
        if (Array.isArray(this.messageCache[context])) {
          this.messageCache[context].push(message);
          
          // Keep only last 25 messages (reduced for performance)
          if (this.messageCache[context].length > 25) {
            this.messageCache[context] = this.messageCache[context].slice(-25);
          }
        }
      }
      
      // Debounce localStorage writes to reduce I/O
      this.debouncedSaveToLocalStorage();
      
    } catch (error) {
      console.error('❌ Error saving message to cache:', error);
    }
  }

  /**
   * Save message cache to localStorage
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem('chatCachedMessages', JSON.stringify(this.messageCache));
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  /**
   * Save game-specific messages to cache
   */
  saveGameMessagesToCache(messages, gameType) {
    try {
      const cachedMessages = JSON.parse(localStorage.getItem('chatCachedMessages') || '{}');
      
      if (!cachedMessages.global) {
        cachedMessages.global = { wc1: [], wc2: [], wc3: [] };
      }
      
      if (!cachedMessages.global[gameType]) {
        cachedMessages.global[gameType] = [];
      }
      
      // Handle different response formats
      let messageArray = [];
      if (Array.isArray(messages)) {
        messageArray = messages;
      } else if (messages && typeof messages === 'object' && messages.messages && Array.isArray(messages.messages)) {
        messageArray = messages.messages;
      } else if (messages && typeof messages === 'object' && messages.data && Array.isArray(messages.data)) {
        messageArray = messages.data;
      }
      
      // Replace the cache with new messages (keep last 50)
      cachedMessages.global[gameType] = messageArray.slice(-50);
      
      localStorage.setItem('chatCachedMessages', JSON.stringify(cachedMessages));
      this.logger.debug(`Cached ${messageArray.length} messages for ${gameType.toUpperCase()}`);
    } catch (error) {
      this.logger.error(`Failed to save ${gameType} messages to cache:`, error);
    }
  }





  /**
   * Add a message element to container
   */
  addMessageElement(message, container) {
    try {
      const messageElement = this.createMessageElement(message);
      container.appendChild(messageElement);
      
      // Remove old messages if too many (keep last 50)
      const messages = container.querySelectorAll('.message');
      if (messages.length > 50) {
        const messagesToRemove = messages.length - 50;
        for (let i = 0; i < messagesToRemove; i++) {
          if (messages[i] && !messages[i].classList.contains('welcome-message')) {
            messages[i].remove();
          }
        }
      }
      
    } catch (error) {
      this.logger.error('Error adding message element:', error);
    }
  }

  /**
   * Display conversations in the private chat tab
   */
  displayConversations(conversations) {
    this.logger.debug('Displaying conversations:', conversations);
    
    const container = this.floatingWindow?.querySelector('#private-messages');
    if (!container) {
      this.logger.error('Private messages container not found');
      // Try to create the container if it doesn't exist
      const privateContent = this.floatingWindow?.querySelector('.context-content[data-context="private"]');
      if (privateContent) {
        privateContent.innerHTML = `
          <div id="private-messages" class="messages-container">
            <div class="no-conversations" style="padding: 20px; text-align: center; color: #888; font-style: italic;">
              No conversations yet. Click on a user to start chatting!
            </div>
          </div>
        `;
        return;}
      return;}

    if (!conversations.success || !Array.isArray(conversations.data) || conversations.data.length === 0) {
      container.innerHTML = `
        <div class="no-conversations" style="padding: 20px; text-align: center; color: #888; font-style: italic;">
          No conversations yet. Click on a user to start chatting!
        </div>
      `;
      return;}

    const conversationsHtml = conversations.data.map(conv => `
      <div class="conversation-item" data-user-id="${conv.userId}">
        <div class="conversation-header">
          <div class="conversation-user">
            <div class="user-avatar">
              <img src="${conv.avatar || '/assets/img/default-avatar.svg'}" alt="${conv.username}">
              ${conv.isOnline ? '<div class="online-indicator"></div>' : ''}
            </div>
            <span class="username">${conv.username}</span>
          </div>
          ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : ''}
        </div>
        <div class="last-message">${conv.lastMessage}</div>
        <div class="last-message-time">${this.formatTime(conv.lastMessageTime)}</div>
      </div>
    `).join('');

    container.innerHTML = conversationsHtml;

    // Add click handlers for conversations
    container.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        this.openPrivateConversation(userId);
      });
    });
  }

  /**
   * Show error message in UI
   */
  showError(message, containerId = null) {
    try {
      console.error('❌ Chat Error:', message);
      
      if (containerId) {
        const container = this.floatingWindow.querySelector(`#${containerId}`);
        if (container) {
                  container.innerHTML = this.templates.errorMessage(message);
          return;}
      }
      
      // Show general error notification
      this.showNotification(message, 'error');
      
    } catch (error) {
      console.error('❌ Error showing error message:', error);
    }
  }

  /**
   * Show notification message using global NotificationUtils if available
   */
  showNotification(message, type = 'info') {
    try {
      // Use global NotificationUtils if available
      if (window.NotificationUtils) {
        switch (type) {
          case 'success':
            window.NotificationUtils.success(message);
            break;
          case 'error':
            window.NotificationUtils.error(message);
            break;
          case 'warning':
            window.NotificationUtils.warning(message);
            break;
          case 'info':
          default:
            window.NotificationUtils.info(message);
            break;
        }
        return;}
      
      // Fallback to local notification if NotificationUtils not available
      const notification = document.createElement('div');
      notification.className = `chat-notification ${type}`;
      notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="close-btn">&times;</button>
      `;
      
      // Add to document
      document.body.appendChild(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
      
      // Manual close
      notification.querySelector('.close-btn').addEventListener('click', () => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      });
      
    } catch (error) {
      console.error('❌ Error showing notification:', error);
    }
  }

  /**
   * Toggle users panel visibility
   */
  toggleUsersPanel() {
    const usersPanel = this.getElement('#users-panel');
    const usersBtn = this.getElement('.btn-users');
    
    // Close friends panel if it's open
    const friendsPanel = this.getElement('#friends-panel');
    const friendsBtn = this.getElement('.btn-friends');
    if (friendsPanel && friendsPanel.classList.contains('show')) {
      friendsPanel.classList.remove('show');
      friendsBtn?.classList.remove('active');
    }
    
    if (usersPanel && usersBtn) {
      const isVisible = usersPanel.classList.contains('show');
      
      if (isVisible) {
        usersPanel.classList.remove('show');
        usersBtn.classList.remove('active');
        this.logger.debug('Users panel hidden');
      } else {
        usersPanel.classList.add('show');
        usersBtn.classList.add('active');
        this.updateUsersList();
        this.logger.debug('Users panel shown');
      }
    }
  }

  /**
   * Update users list based on current context
   */
  updateUsersList() {
    const usersList = this.getElement('#users-list');
    if (!usersList) return;const context = this.getCurrentContext();
    const gameType = this.getCurrentGameType();
    
    this.logger.debug(`Updating users list for ${context} context, game: ${gameType}`);
    
    // Show loading state
    usersList.innerHTML = this.templates.loadingSpinner('Loading online users...');
    
    // Request online users from server if connected
    if (this.socket && this.socket.connected) {
      this.logger.debug('Requesting online users from server...');
      this.requestOnlineUsers();
    } else {
      // Show connection issue if not connected
      usersList.innerHTML = `
        <div class="chat-error">
          <i class="fas fa-wifi"></i>
          <p>Not connected to chat server</p>
          <small>Trying to reconnect...</small>
        </div>
      `;
      
      // Try to reconnect
      if (this.socket) {
        this.socket.connect();
      }
    }
  }

  /**
   * Update users list with real data from server
   */
  async updateUsersListWithRealData(onlineUsers) {
    const usersList = this.floatingWindow?.querySelector('#users-list');
    if (!usersList || !Array.isArray(onlineUsers)) {
      this.logger.warn('Invalid users list data:', onlineUsers);
      return;}

    this.logger.debug(`Updating with real users data:`, onlineUsers);

    // Filter out the current user from the list
    const filteredUsers = onlineUsers.filter(user => 
      user.userId && user.userId.toString() !== this.currentUser?.id?.toString()
    );

    if (filteredUsers.length === 0) {
      usersList.innerHTML = `
        <div class="chat-empty">
          <i class="fas fa-users"></i>
          <p>No other users online</p>
          <small>You're the only one here right now</small>
        </div>
      `;
      return;}

    // Use user avatar directly from database (no need to fetch player data)
    const usersWithRankData = filteredUsers.map(user => {
      this.logger.debug(`Using database avatar for ${user.username}: ${user.avatar || '/assets/img/ranks/emblem.png'}`);
      
      return {
        ...user,
        rankImage: user.avatar || '/assets/img/ranks/emblem.png'
      };});

    // Generate HTML for real users with consistent avatar handling
    const usersHTML = usersWithRankData.map(user => {
      // Use arena/player name instead of real name
      const displayName = user.playerName || user.arenaName || user.username || user.displayName;
      
      // Use the user's database avatar directly (managed by AvatarService)
      const avatarUrl = window.AvatarUtils ? 
        window.AvatarUtils.getAvatarWithFallback(user.avatar) : 
        (user.avatar || '/assets/img/ranks/emblem.png');
      
      this.logger.debug(`Avatar for ${user.username}: ${avatarUrl}`);
      
      // Ensure we have a valid user ID
      if (!user.userId || typeof user.userId === 'string' && user.userId.length !== 24) {
        this.logger.warn('Invalid user ID for user:', user);
        return '';}
      
      return `
        <div class="user-item" data-user-id="${user.userId}" data-username="${user.username}">
          <div class="user-avatar">
            <img src="${avatarUrl}" alt="${displayName}" data-user-avatar onerror="this.onerror=null;this.src='/assets/img/ranks/emblem.png';">
            <div class="online-indicator"></div>
          </div>
          <div class="user-info">
            <div class="user-name">${displayName}</div>
            <div class="user-status">Online</div>
          </div>
        </div>
      `;
    }).filter(html => html.length > 0).join('');

    usersList.innerHTML = usersHTML;

    // Add click handlers for real users
    usersList.querySelectorAll('.user-item').forEach(item => {
      const userId = item.dataset.userId;
      const username = item.dataset.username;
      
      if (userId && username) {
        item.addEventListener('click', () => this.handleUserClick(userId));
        
        // Add right-click context menu
        item.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.showUserContextMenu(e, userId, username);
        });
      }
    });

    this.logger.success(`Updated users list with ${filteredUsers.length} real users`);
  }

  /**
   * Get current context
   */
  getCurrentContext() {
    const activeTab = this.floatingWindow?.querySelector('.context-tab.active');
    return activeTab?.dataset.context || 'global';}

  /**
   * Get current game type
   */
  getCurrentGameType() {
    const activeGameTab = this.floatingWindow?.querySelector('.game-tab.active');
    return activeGameTab?.dataset.game || 'wc1';}

  /**
   * Get mock users for testing - replace with real server data
   */
  getMockUsers(context, game) {
    const baseUsers = [
      {
        id: '1',
        name: 'GARETHJOHNSON',
        avatar: 'https://static-cdn.jtvnw.net/user-default-pictures-uv/dbdc9198-def8-11e9-8681-784f43822e80-profile_image-300x300.png',
        status: 'Online'
      },
      {
        id: '2', 
        name: 'TURTLEMAN1',
        avatar: 'https://static-cdn.jtvnw.net/user-default-pictures-uv/dbdc9198-def8-11e9-8681-784f43822e80-profile_image-300x300.png',
        status: 'Playing'
      }
    ];

    // Filter users based on context and game
    if (context === 'global') {
      return baseUsers.map(user => ({
        ...user,
        status: `${user.status} • ${game.toUpperCase()}`
      }));}
    
    return baseUsers;}

  /**
   * Handle user click for private messages or actions
   */
  handleUserClick(userId) {
    this.logger.debug(`User clicked: ${userId}`);
    // Open private conversation or show user menu
    this.openPrivateConversation(userId);
  }

  /**
   * Toggle friends panel visibility
   */
  toggleFriendsPanel() {
    const friendsPanel = this.floatingWindow?.querySelector('#friends-panel');
    const friendsBtn = this.floatingWindow?.querySelector('.btn-friends');
    
    // Close users panel if it's open
    const usersPanel = this.floatingWindow?.querySelector('#users-panel');
    const usersBtn = this.floatingWindow?.querySelector('.btn-users');
    if (usersPanel && usersPanel.classList.contains('show')) {
      usersPanel.classList.remove('show');
      usersBtn?.classList.remove('active');
    }
    
    if (friendsPanel && friendsBtn) {
      const isVisible = friendsPanel.classList.contains('show');
      
      if (isVisible) {
        friendsPanel.classList.remove('show');
        friendsBtn.classList.remove('active');
        this.logger.debug('Friends panel hidden');
      } else {
        friendsPanel.classList.add('show');
        friendsBtn.classList.add('active');
        this.setupFriendsPanel(); // Setup tab switching functionality
        this.loadFriendsData();
        this.logger.debug('Friends panel shown');
      }
    }
  }

    /**
   * Load friends data (friends list, pending requests)
   */
  async loadFriendsData() {
    try {
      // Load friends and requests in parallel
      const [friendsResponse, requestsResponse] = await Promise.all([
              this.api.get('/api/friends'),
      this.api.get('/api/friends/requests')
      ]);

      this.logger.debug('Raw friends response:', friendsResponse);
      this.logger.debug('Raw requests response:', requestsResponse);

      // Handle friends response - extract data from nested structure
      if (friendsResponse.success) {
        const friendsData = friendsResponse.data?.friends || friendsResponse.data || [];
        this.logger.debug('Extracted friends data:', friendsData);
        this.friendsList = Array.isArray(friendsData) ? friendsData : []; // Store friends list
        this.displayFriendsList(this.friendsList);
      } else {
        this.logger.warn('Friends data request failed:', friendsResponse);
        this.friendsList = [];
        this.displayFriendsList([]);
      }
      
      // Handle ally requests response - extract data from nested structure  
      if (requestsResponse.success) {
        const requestsData = requestsResponse.data?.requests || requestsResponse.data || [];
        this.logger.debug('Extracted requests data:', requestsData);
        this.displayFriendRequests(Array.isArray(requestsData) ? requestsData : []);
      } else {
        this.logger.warn('Friend requests request failed:', requestsResponse);
        this.displayFriendRequests([]);
      }
    } catch (error) {
      this.logger.error('Error loading friends data:', error);
      this.showError('Failed to load friends data');
      // Show empty lists on error
      this.displayFriendsList([]);
      this.displayFriendRequests([]);
    }
  }

  /**
   * Display friends list
   */
  displayFriendsList(friends) {
    const container = this.floatingWindow?.querySelector('#friends-list');
    const countElement = this.floatingWindow?.querySelector('#friends-count');
    
    if (!container) return;if (countElement) {
      countElement.textContent = friends.length;
    }
    
    if (friends.length === 0) {
      container.innerHTML = `
        <div class="no-friends">
          <i class="fas fa-user-friends"></i>
          <p>No friends yet</p>
          <small>Add friends to build your network!</small>
        </div>
      `;
      return;}
    
    const friendsHtml = friends.map(friend => {
      const lastSeen = friend.lastLogin ? new Date(friend.lastLogin).toLocaleDateString() : 'Never';
      return `
        <div class="friend-item" data-user-id="${friend.userId}">
          <div class="friend-avatar">
            <img src="${friend.avatar || '/assets/img/default-avatar.svg'}" alt="${friend.username}">
            <div class="status-indicator ${friend.isOnline ? 'online' : 'offline'}"></div>
          </div>
          <div class="friend-info">
            <div class="friend-name">${friend.username}</div>
            <div class="friend-status">${friend.isOnline ? 'Online' : `Last seen: ${lastSeen}`}</div>
          </div>
          <div class="friend-actions">
            <button class="btn-message" title="Send Message" onclick="window.chatManager.startPrivateChat('${friend.userId}', '${friend.username}')">
              <i class="fas fa-comment"></i>
            </button>
            <button class="btn-remove" title="Remove Friend" onclick="window.chatManager.removeFriend('${friend.userId}', '${friend.username}')">
              <i class="fas fa-user-minus"></i>
            </button>
          </div>
        </div>
      `;}).join('');
    
    container.innerHTML = friendsHtml;
  }

  /**
   * Display friend requests
   */
  displayFriendRequests(requests) {
    const container = this.floatingWindow?.querySelector('#friends-requests');
    const countElement = this.floatingWindow?.querySelector('#requests-count');
    
    if (!container) return;if (countElement) {
      countElement.textContent = requests.length;
    }
    
    if (requests.length === 0) {
      container.innerHTML = `
        <div class="no-requests">
          <i class="fas fa-inbox"></i>
          <p>No pending requests</p>
        </div>
      `;
      return;}
    
    const requestsHtml = requests.map(request => {
      this.logger.debug('Processing friend request:', request);
      const requestId = request.requestId || request._id;
      const fromUser = request.user || request.from || request.requestedBy;
      
      return `
        <div class="friend-request-item" data-request-id="${requestId}">
          <div class="request-avatar">
            <img src="${fromUser?.avatar || '/assets/img/default-avatar.svg'}" alt="${fromUser?.username}">
          </div>
          <div class="request-info">
            <div class="request-name">${fromUser?.username || 'Unknown User'}</div>
            <div class="request-message">${request.message || 'Wants to be your friend'}</div>
            <div class="request-date">${this.formatTime(request.createdAt)}</div>
          </div>
          <div class="request-actions">
            <button class="btn btn-sm btn-success accept-request" data-request-id="${requestId}">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-sm btn-danger decline-request" data-request-id="${requestId}">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `;}).join('');

    container.innerHTML = requestsHtml;

    // Add click handlers for accept/decline buttons
    container.querySelectorAll('.accept-request').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const requestId = btn.dataset.requestId;
        this.handleFriendRequest(requestId, 'accept');
      });
    });

    container.querySelectorAll('.decline-request').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const requestId = btn.dataset.requestId;
        this.handleFriendRequest(requestId, 'decline');
      });
    });
  }

  /**
   * Handle friend request (accept/decline)
   */
  async handleFriendRequest(requestId, action) {
    try {
      this.logger.debug(`Handling friend request: ${action} for ID: ${requestId}`);
      let response;
      
      if (action === 'accept') {
        response = await this.api.post(`/api/friends/accept/${requestId}`);
      } else if (action === 'decline') {
        response = await this.api.delete(`/api/friends/decline/${requestId}`);
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
      
      this.logger.debug(`Friend request ${action} response:`, response);
      
      if (response.success) {
        this.showSuccessNotification(`Friend request ${action}ed successfully`);
        // Reload friends data to reflect changes
        this.loadFriendsData();
      } else {
        this.showSuccessNotification(response.message || `Failed to ${action} friend request`);
      }
    } catch (error) {
      this.logger.error(`Error ${action}ing friend request:`, error);
      this.showSuccessNotification(`Failed to ${action} friend request`);
    }
  }

  /**
   * Setup friends panel tabs and search
   */
  setupFriendsPanel() {
    const friendsPanel = this.floatingWindow?.querySelector('#friends-panel');
    if (!friendsPanel) return;if (friendsPanel.hasAttribute('data-setup')) {
      return;}
    friendsPanel.setAttribute('data-setup', 'true');
    
    // Setup tab switching
    const tabs = friendsPanel.querySelectorAll('.friends-tab');
    const tabContents = friendsPanel.querySelectorAll('.friends-tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        this.logger.debug(`Switching to friends tab: ${targetTab}`);
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active content
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.dataset.tab === targetTab) {
            content.classList.add('active');
          }
        });
        
        // Load data for specific tabs
        if (targetTab === 'requests') {
          this.logger.debug('Loading friend requests...');
          this.loadFriendRequests();
        } else if (targetTab === 'add') {
          this.logger.debug('Setting up add friend search...');
          // Focus on search input when Add Friend tab is selected
          setTimeout(() => {
            const searchInput = friendsPanel.querySelector('#friend-search-input');
            if (searchInput) {
              searchInput.focus();
            }
          }, 100);
        }
      });
    });
    
    // Setup search functionality
    const searchInput = friendsPanel.querySelector('#friend-search-input');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchUsers(e.target.value);
        }, 300);
      });
    }
    
    this.logger.success('Friends panel setup completed');
  }

  /**
   * Search users for ally requests
   */
  async searchUsers(query) {
    const resultsContainer = this.floatingWindow?.querySelector('#friend-search-results');
    if (!resultsContainer) return;if (!query || query.length < 2) {
      resultsContainer.innerHTML = '';
      return;}
    
    try {
      const response = await this.api.get(`/api/friends/search?q=${encodeURIComponent(query)}`);
      
      if (response.success && response.data.length > 0) {
        const resultsHtml = response.data.map(user => `
          <div class="search-result" data-user-id="${user.userId}">
            <div class="result-avatar">
              <img src="${user.avatar || '/assets/img/default-avatar.svg'}" alt="${user.username}">
            </div>
            <div class="result-info">
              <div class="result-name">${user.username}</div>
            </div>
            <div class="result-actions">
              <button class="btn-add-friend" onclick="window.chatManager.sendFriendRequest('${user.username}')">
                                  <i class="fas fa-user-plus"></i> Add Friend
              </button>
            </div>
          </div>
        `).join('');
        
        resultsContainer.innerHTML = resultsHtml;
      } else {
        resultsContainer.innerHTML = this.templates.noResults('No users found');
      }
    } catch (error) {
      this.logger.error('Error searching users:', error);
      resultsContainer.innerHTML = '<div class="search-error">Search failed</div>';
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(username) {
    try {
      const response = await this.api.post('/api/friends/request', { username });
      
      if (response.success) {
        this.showNotification(`Friend request sent to ${username}`, 'success');
        // Clear search results
        const searchInput = this.floatingWindow?.querySelector('#friend-search-input');
        const resultsContainer = this.floatingWindow?.querySelector('#friend-search-results');
        if (searchInput) searchInput.value = '';
        if (resultsContainer) resultsContainer.innerHTML = '';
      } else {
        this.showNotification(response.message || 'Failed to send friend request', 'error');
      }
    } catch (error) {
      this.logger.error('Error sending friend request:', error);
      this.showNotification('Failed to send friend request', 'error');
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(requestId) {
    try {
      const response = await this.api.post(`/api/friends/accept/${requestId}`);
      
      if (response.success) {
        this.showNotification('Friend request accepted!', 'success');
        this.loadFriendsData();
      } else {
        this.showNotification(response.message || 'Failed to accept friend request', 'error');
      }
    } catch (error) {
      this.logger.error('Error accepting friend request:', error);
      this.showNotification('Failed to accept friend request', 'error');
    }
  }

  /**
   * Decline friend request
   */
  async declineFriendRequest(requestId) {
    try {
      const response = await this.api.delete(`/api/friends/decline/${requestId}`);
      
      if (response.success) {
        this.showNotification('Friend request declined', 'info');
        this.loadFriendsData();
      } else {
        this.showNotification(response.message || 'Failed to decline friend request', 'error');
      }
    } catch (error) {
      this.logger.error('Error declining friend request:', error);
      this.showNotification('Failed to decline friend request', 'error');
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(userId, username) {
    if (!confirm(`Remove ${username} from your friends?`)) {
      return;}
    
    try {
      const response = await this.api.delete(`/api/friends/${userId}`);
      
      if (response.success) {
        this.showNotification(`${username} removed from friends`, 'info');
        this.loadFriendsData();
      } else {
        this.showNotification(response.message || 'Failed to remove friend', 'error');
      }
    } catch (error) {
      this.logger.error('Error removing friend:', error);
      this.showNotification('Failed to remove friend', 'error');
    }
  }

  /**
   * Remove friend with confirmation (alias for removeFriend)
   */
  async removeFriendWithConfirmation(userId, username) {
    return this.removeFriend(userId, username);}

  /**
   * Start private chat with user
   */


  /**
   * Load friend requests specifically
   */
  async loadFriendRequests() {
    try {
      const response = await this.api.get('/api/friends/requests');
      if (response.success) {
        // Extract data from nested structure, consistent with loadFriendsData
        const requestsData = response.data?.requests || response.data || [];
        this.displayFriendRequests(Array.isArray(requestsData) ? requestsData : []);
      }
    } catch (error) {
      this.logger.error('Error loading friend requests:', error);
      this.displayFriendRequests([]);
    }
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp) {
    if (!timestamp) return '';const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';if (diffMins < 60) return `${diffMins}m ago`;if (diffHours < 24) return `${diffHours}h ago`;if (diffDays < 7) return `${diffDays}d ago`;return date.toLocaleDateString();}

  /**
   * Check if a user is already a friend
   */
  isFriend(userId) {
    return this.friendsList.some(friend => friend.userId === userId);}

  /**
   * Show context menu for user interactions
   */
  showUserContextMenu(event, userId, username) {
    // Remove any existing context menu
    this.removeUserContextMenu();

    // Don't show context menu for current user
    if (userId === this.currentUser?.id) {
      return;}

    // Check if user is already a friend
    const isUserFriend = this.isFriend(userId);

    const contextMenu = document.createElement('div');
    contextMenu.className = 'user-context-menu';
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="message">
        <i class="fas fa-comment"></i>
        <span>Send Message</span>
      </div>
      ${isUserFriend ? 
        `<div class="context-menu-item" data-action="remove-friend">
          <i class="fas fa-user-minus"></i>
          <span>Remove Friend</span>
        </div>` :
        `<div class="context-menu-item" data-action="friend-request">
          <i class="fas fa-user-plus"></i>
          <span>Send Friend Request</span>
        </div>`
      }
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="view-profile">
        <i class="fas fa-user"></i>
        <span>View Profile</span>
      </div>
    `;

    // Position the context menu
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.style.zIndex = '10000';

    // Add to document
    document.body.appendChild(contextMenu);

    // Add click handlers for menu items
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        this.handleContextMenuAction(action, userId, username);
        this.removeUserContextMenu();
      });
    });

    // Close menu when clicking outside
    const closeHandler = (e) => {
      if (!contextMenu.contains(e.target)) {
        this.removeUserContextMenu();
        document.removeEventListener('click', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 10);

    this.logger.debug(`Context menu shown for user: ${username}`);
  }

  /**
   * Remove user context menu
   */
  removeUserContextMenu() {
    const existingMenu = document.querySelector('.user-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
  }

  /**
   * Handle context menu actions
   */
  async handleContextMenuAction(action, userId, username) {
    this.logger.debug(`Context menu action: ${action} for user: ${username}`);

    switch (action) {
      case 'message':
        // Hide the context menu immediately
        this.removeUserContextMenu();
        // Start private chat and bring focus to it
        await this.startPrivateChat(userId, username);
        break;
      case 'friend-request':
        await this.sendFriendRequestWithNotification(userId, username);
        break;
      case 'remove-friend':
        await this.removeFriendWithConfirmation(userId, username);
        break;
      case 'view-profile':
        this.viewUserProfile(userId, username);
        break;
      default:
        this.logger.warn('Unknown context menu action:', action);
    }
  }

  /**
   * Send friend request with notification
   */
  async sendFriendRequestWithNotification(userId, username) {
    try {
      this.logger.debug(`Sending friend request to ${username} (ID: ${userId})`);
      
      // Validate user ID (should be a valid MongoDB ObjectId format)
      if (!userId || userId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userId)) {
        this.logger.error('Invalid user ID format:', userId);
        this.showNotification('Invalid user ID. Please refresh and try again.', 'error');
        return;}
      
      // Send friend request with the corrected API format
      this.logger.debug('Sending friend request with userId...');
      try {
        const response = await this.api.post('/api/friends/request', { 
          targetUserId: userId 
        });
        this.logger.debug('Friend request response:', response);
        
        if (response.success) {
          // Show success notification to sender
          this.showNotification(`Friend request sent to ${username}`, 'success');
          this.logger.success(`Friend request sent to ${username}`);
          return;} else {
          // Handle failed request with specific error message
          const errorMessage = response.message || 'Failed to send friend request';
          this.logger.error('Friend request failed:', errorMessage);
          this.showNotification(errorMessage, 'error');
          return;}
      } catch (error) {
        this.logger.error('Friend request failed:', error);
        this.showNotification('Failed to send friend request - please try again later', 'error');
      }
    } catch (error) {
      this.logger.error('Overall error sending friend request:', error);
      this.showNotification('Failed to send friend request', 'error');
    }
  }

  /**
   * Start private chat with notification
   */
  async startPrivateChat(userId, username) {
    try {
      this.logger.debug(`Starting private chat with ${username} (ID: ${userId})`);
      
      // Validate user ID (should be a valid MongoDB ObjectId format)
      if (!userId || userId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userId)) {
        this.logger.error('Invalid user ID format:', userId);
        this.showNotification('Invalid user ID. Please refresh and try again.', 'error');
        return;}
      
      // Create or switch to user-specific tab
      this.ensurePrivateChatTabExists(userId, username);
      
      // Switch to the user's tab
      this.switchToPrivateChat(userId, username);
      
      // Load conversation history
      try {
        await this.openPrivateConversation(userId);
      } catch (error) {
        this.logger.error('Error opening private conversation:', error);
        // Don't fail the entire operation if conversation loading fails
      }
      
      // Focus on the message input
      const messageInput = this.floatingWindow?.querySelector('#message-input');
      if (messageInput) {
        messageInput.focus();
        messageInput.placeholder = `Type a message to ${username}...`;
      }
      
      // Show notification to user
      this.showNotification(`Started private chat with ${username}`, 'success');
      
      this.logger.success(`Private chat opened with ${username}`);
      
      // Note: Removed privateChatRequest socket emission as server doesn't handle this custom event
      // The enhanced private message handling will create tabs when messages are received
      
      // Send a chat request notification via API as backup
      try {
        await this.api.post('/api/notifications', {
          recipientId: userId,
          type: 'chat_request',
          content: `${this.currentUser?.username || 'Someone'} wants to chat with you`,
          data: {
            fromUserId: this.currentUser?.id,
            fromUsername: this.currentUser?.username,
            chatRoomId: `private_${this.currentUser?.id}_${userId}`
          }
        });
        
        this.logger.success(`Chat request notification sent to ${username}`);
      } catch (notificationError) {
        this.logger.error('Failed to send notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }
      
    } catch (error) {
      this.logger.error('Error starting private chat:', error);
      this.showNotification('Failed to start private chat', 'error');
    }
  }

  /**
   * View user profile
   */
  viewUserProfile(userId, username) {
    // Navigate to user profile page
    window.location.href = `/profile/${username}`;
  }

  /**
   * Handle real-time notifications from socket
   */
  handleRealtimeNotification(notification) {
    this.logger.debug('Processing real-time notification:', notification);
    
    // Show toast notification
    this.showNotification(`New ${notification.type}: ${notification.content}`, 'info');
    
    // Update notification indicator
    this.updateNotificationIndicator();
    
    // Forward to notifications manager if available
    if (window.notificationsManager) {
      window.notificationsManager.addNotification({
        id: notification._id,
        message: notification.content,
        type: this.mapNotificationType(notification.type),
        timestamp: notification.createdAt,
        isRead: false,
        icon: this.getNotificationIcon(notification.type),
        actions: notification.data?.actions || []
      });
    }
    
    // Show browser notification if permissions granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(`New ${notification.type}`, {
        body: notification.content,
        icon: '/assets/img/chat-icon.png',
        tag: 'chat-notification'
      });
      
      browserNotification.onclick = () => {
        window.focus();
        this.showFloatingWindow();
        browserNotification.close();
      };
    }
  }
  
  /**
   * Handle notification marked as read
   */
  handleNotificationRead(notificationId) {
    // Forward to notifications manager if available
    if (window.notificationsManager) {
      window.notificationsManager.markNotificationAsRead(notificationId);
    }
  }
  
  /**
   * Handle all notifications marked as read
   */
  handleAllNotificationsRead() {
    // Forward to notifications manager if available
    if (window.notificationsManager) {
      window.notificationsManager.markAllNotificationsAsRead();
    }
  }
  
  /**
   * Handle notification deleted
   */
  handleNotificationDeleted(notificationId) {
    // Forward to notifications manager if available
    if (window.notificationsManager) {
      window.notificationsManager.removeNotification(notificationId);
    }
  }
  
  /**
   * Map notification types for display
   */
  mapNotificationType(type) {
    const typeMap = {
      'friend_request': 'warning',
      'chat_request': 'info',
      'message': 'info',
      'system': 'info',
      'privateMessage': 'info',
      'roomMessage': 'info',
      'clanMessage': 'info'
    };
    return typeMap[type] || 'info';}
  
  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type) {
    const iconMap = {
      'friend_request': 'fa-user-plus',
      'chat_request': 'fa-comments',
      'message': 'fa-envelope',
      'system': 'fa-info-circle',
      'privateMessage': 'fa-envelope',
      'roomMessage': 'fa-comments',
      'clanMessage': 'fa-shield-alt'
    };
    return iconMap[type] || 'fa-bell';}

  /**
   * Create private chat tab and content if it doesn't exist
   */
  ensurePrivateTabExists() {
    const tabsContainer = this.floatingWindow?.querySelector('.chat-context-tabs');
    const contentContainer = this.floatingWindow?.querySelector('.chat-content');
    
    // Check if private tab already exists
    if (tabsContainer?.querySelector('[data-context="private"]')) {
      return;}
    
    // Create private tab
    const privateTab = document.createElement('button');
    privateTab.className = 'context-tab';
    privateTab.setAttribute('data-context', 'private');
    privateTab.innerHTML = '<i class="fas fa-user"></i> Private';
    
    // Insert after clan tab
    const clanTab = tabsContainer?.querySelector('[data-context="clan"]');
    if (clanTab && tabsContainer) {
      clanTab.insertAdjacentElement('afterend', privateTab);
    }
    
    // Create private content
    const privateContent = document.createElement('div');
    privateContent.className = 'context-content';
    privateContent.setAttribute('data-context', 'private');
    privateContent.innerHTML = `
      <div class="conversation-list" id="private-conversations">
        <!-- Private conversations will be populated here -->
      </div>
      <div class="conversation-view" id="private-conversation-view"></div>
    `;
    
    if (contentContainer) {
      contentContainer.appendChild(privateContent);
    }
    
    // Show private badge
    const privateBadge = this.floatingWindow?.querySelector('.private-badge');
    if (privateBadge) {
      privateBadge.style.display = 'inline';
    }
    
    // Setup event listener for new tab
    privateTab.addEventListener('click', () => {
      this.switchContext('private');
    });
    
    this.logger.success('Private chat tab created');
  }
  
  /**
   * Create or switch to user-specific private chat tab
   */
  ensurePrivateChatTabExists(userId, username) {
    const tabsContainer = this.floatingWindow?.querySelector('.chat-context-tabs');
    const contentContainer = this.floatingWindow?.querySelector('.chat-content');
    
    if (!tabsContainer || !contentContainer) return;const tabId = `private-${userId}`;
    
    // Check if user-specific tab already exists
    if (tabsContainer.querySelector(`[data-user-id="${userId}"]`)) {
      return;}
    
    // Create user-specific private tab
    const userTab = document.createElement('button');
    userTab.className = 'context-tab private-user-tab';
    userTab.setAttribute('data-context', 'private');
    userTab.setAttribute('data-user-id', userId);
    userTab.innerHTML = `
      <i class="fas fa-user"></i> 
      <span class="tab-username">${username}</span>
      <span class="tab-notification" style="display: none;">●</span>
    `;
    
    // Insert after clan tab (or after last private tab)
    const lastPrivateTab = [...tabsContainer.querySelectorAll('.private-user-tab')].pop();
    const clanTab = tabsContainer.querySelector('[data-context="clan"]');
    
    if (lastPrivateTab) {
      lastPrivateTab.insertAdjacentElement('afterend', userTab);
    } else if (clanTab) {
      clanTab.insertAdjacentElement('afterend', userTab);
    } else {
      tabsContainer.appendChild(userTab);
    }
    
    // Create user-specific content
    const userContent = document.createElement('div');
    userContent.className = 'context-content private-user-content';
    userContent.setAttribute('data-context', 'private');
    userContent.setAttribute('data-user-id', userId);
    userContent.innerHTML = `
      <div class="private-chat-header">
        <h4>Private Chat with ${username}</h4>
        <button class="close-private-chat" data-user-id="${userId}" title="Close chat">×</button>
      </div>
      <div class="chat-messages private-chat-messages" id="private-messages-${userId}">
        <div class="welcome-message">
          <i class="fas fa-user"></i>
          <h4>Private Chat</h4>
          <p>Start a conversation with ${username}</p>
        </div>
      </div>
    `;
    
    contentContainer.appendChild(userContent);
    
    // Setup event listeners
    userTab.addEventListener('click', () => {
      this.switchToPrivateChat(userId, username);
    });
    
    // Setup close button
    const closeBtn = userContent.querySelector('.close-private-chat');
    closeBtn?.addEventListener('click', () => {
      this.closePrivateChat(userId);
    });
    
    this.logger.success(`Private chat tab created for ${username}`);
  }

  /**
   * Switch to specific user's private chat
   */
  switchToPrivateChat(userId, username) {
    // Hide all context content
    this.floatingWindow?.querySelectorAll('.context-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    this.floatingWindow?.querySelectorAll('.context-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Show user-specific content
    const userContent = this.floatingWindow?.querySelector(`[data-user-id="${userId}"].context-content`);
    const userTab = this.floatingWindow?.querySelector(`[data-user-id="${userId}"].context-tab`);
    
    if (userContent && userTab) {
      userContent.classList.add('active');
      userTab.classList.add('active');
      
      // Update channel indicator
      this.updateChannelIndicator('private', username);
      
      // Clear notification indicator and blinking animation
      const notification = userTab.querySelector('.tab-notification');
      if (notification) {
        notification.style.display = 'none';
        notification.style.animation = '';
      }
      
      // Remove blinking animation from tab
      userTab.classList.remove('chat-notification-blink', 'blinking');
      
      this.logger.success(`Switched to private chat with ${username}`);
    }
  }

  /**
   * Close private chat with specific user
   */
  closePrivateChat(userId) {
    const userTab = this.floatingWindow?.querySelector(`[data-user-id="${userId}"].context-tab`);
    const userContent = this.floatingWindow?.querySelector(`[data-user-id="${userId}"].context-content`);
    
    if (userTab) userTab.remove();
    if (userContent) userContent.remove();
    
    // Switch back to global chat if this was the active tab
    if (userTab?.classList.contains('active')) {
      this.switchContext('global');
    }
    
    this.logger.success(`Closed private chat with user ${userId}`);
  }

  /**
   * Show notification on private chat tab
   */
  showPrivateChatNotification(userId) {
    const userTab = this.floatingWindow?.querySelector(`[data-user-id="${userId}"].context-tab`);
    if (userTab && !userTab.classList.contains('active')) {
      const notification = userTab.querySelector('.tab-notification');
      if (notification) {
        notification.style.display = 'inline';
        notification.style.animation = 'pulse 1s infinite';
        
        // Add blinking animation to the tab
        userTab.classList.add('chat-notification-blink');
        
        // Remove blinking after 10 seconds
        setTimeout(() => {
          userTab.classList.remove('chat-notification-blink');
          if (notification) {
            notification.style.animation = '';
          }
        }, 10000);
      }
    }
  }

  /**
   * Show tab context menu (right-click menu)
   */
  showTabContextMenu(event, tab) {
    // Remove any existing context menu
    this.removeTabContextMenu();

    const context = tab.dataset.context;
    const userId = tab.dataset.userId;
    
    // Don't show context menu for system tabs (global, clan) or create chat button
    if (['global', 'clan'].includes(context) || tab.dataset.action === 'create-chat') {
      return;}

    const contextMenu = document.createElement('div');
    contextMenu.className = 'tab-context-menu';
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="close-tab">
        <i class="fas fa-times"></i>
        <span>Close Tab</span>
      </div>
    `;

    // Position the context menu
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.style.zIndex = '10001';

    // Add to document
    document.body.appendChild(contextMenu);

    // Add click handlers for menu items
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        this.handleTabContextMenuAction(action, tab);
        this.removeTabContextMenu();
      });
    });

    // Close menu when clicking outside
    const closeHandler = (e) => {
      if (!contextMenu.contains(e.target)) {
        this.removeTabContextMenu();
        document.removeEventListener('click', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 10);

    this.logger.debug(`Tab context menu shown for: ${context || userId}`);
  }

  /**
   * Remove tab context menu
   */
  removeTabContextMenu() {
    const existingMenu = document.querySelector('.tab-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
  }

  /**
   * Handle tab context menu actions
   */
  async handleTabContextMenuAction(action, tab) {
    this.logger.debug(`Tab context menu action: ${action}`);

    switch (action) {
      case 'close-tab':
        await this.closeTab(tab);
        break;
      default:
        this.logger.warn('Unknown tab context menu action:', action);
    }
  }

  /**
   * Close a tab (private chat or user-created room)
   */
  async closeTab(tab) {
    const context = tab.dataset.context;
    const userId = tab.dataset.userId;
    const roomId = tab.dataset.roomId;

    if (userId) {
      // Close private chat tab
      this.closePrivateChat(userId);
    } else if (roomId && context === 'room') {
      // Close user-created room tab
      await this.closeUserRoom(roomId);
    }

    this.logger.success(`Closed tab: ${context || userId || roomId}`);
  }

  /**
   * Close user-created room and leave it
   */
  async closeUserRoom(roomId) {
    try {
      // Emit leave room event to socket
      if (this.socket && this.socket.connected) {
        this.socket.emit('leaveRoom', { 
          roomId: roomId,
          userId: this.currentUser?.id || this.currentUser?._id 
        });
      }

      // Remove the tab and content
      const roomTab = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"]`);
      const roomContent = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-content`);
      
      if (roomTab) roomTab.remove();
      if (roomContent) roomContent.remove();

      // Switch back to global chat if this was the active tab
      if (roomTab?.classList.contains('active')) {
        this.switchContext('global');
      }

      this.logger.success(`Left and closed room ${roomId}`);
    } catch (error) {
      this.logger.error('Error closing user room:', error);
      this.showNotification('Failed to close room', 'error');
    }
  }

  /**
   * Show create chat modal
   */
  showCreateChatModal() {
    this.logger.debug('Showing create chat modal...');
    
    // Check if user is authenticated
    if (!this.currentUser || !this.currentUser.id) {
      this.logger.warn('User not authenticated, cannot create chat room');
      this.showNotification('You must be logged in to create a chat room', 'error');
      return;}
    
    // Check if socket is connected
    if (!this.socket || !this.socket.connected) {
      this.logger.warn('Socket not connected, cannot create chat room');
      this.showNotification('Not connected to chat server. Please try again.', 'error');
      return;}
    
    // Remove any existing modal
    this.removeCreateChatModal();

    const modal = document.createElement('div');
    modal.className = 'create-chat-modal';
    modal.innerHTML = `
      <div class="create-chat-modal-content">
        <div class="create-chat-header">
          <h3>Create New Chat Room</h3>
          <button class="close-modal-btn">&times;</button>
        </div>
        <form class="create-chat-form" id="create-chat-form">
          <div class="form-group">
            <label for="room-name">Room Name:</label>
            <input type="text" id="room-name" name="roomName" placeholder="Enter room name..." required>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="room-private" name="isPrivate">
              Make room private (invite only)
            </label>
          </div>
          <div class="form-info">
            <p><i class="fas fa-info-circle"></i> You can only create one custom chat room per account.</p>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancel-create">Cancel</button>
            <button type="submit" class="btn-primary">Create Room</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Show modal
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);

    // Setup event handlers
    const form = modal.querySelector('#create-chat-form');
    const closeBtn = modal.querySelector('.close-modal-btn');
    const cancelBtn = modal.querySelector('#cancel-create');
    const roomNameInput = modal.querySelector('#room-name');

    // Focus on room name input
    roomNameInput.focus();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.logger.debug('Create chat form submitted');
      this.handleCreateChatSubmit(form);
    });

    closeBtn.addEventListener('click', () => {
      this.logger.debug('Create chat modal closed via X button');
      this.removeCreateChatModal();
    });

    cancelBtn.addEventListener('click', () => {
      this.logger.debug('Create chat modal cancelled');
      this.removeCreateChatModal();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.logger.debug('Create chat modal closed via outside click');
        this.removeCreateChatModal();
      }
    });

    this.logger.success('Create chat modal shown successfully');
  }

  /**
   * Remove create chat modal
   */
  removeCreateChatModal() {
    const modal = document.querySelector('.create-chat-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }

  /**
   * Handle create chat form submission
   */
  async handleCreateChatSubmit(form) {
    const formData = new FormData(form);
    const roomName = formData.get('roomName').trim();
    const isPrivate = formData.get('isPrivate') === 'on';

    if (!roomName) {
      this.showNotification('Please enter a room name', 'error');
      return;}

    if (roomName.length < 3) {
      this.showNotification('Room name must be at least 3 characters', 'error');
      return;}

    if (roomName.length > 50) {
      this.showNotification('Room name must be less than 50 characters', 'error');
      return;}

    // Check if user is authenticated
    if (!this.currentUser || !this.currentUser.id) {
      this.showNotification('You must be logged in to create a chat room', 'error');
      return;}

    // Check if socket is connected and user is authenticated
    if (!this.socket || !this.socket.connected) {
      this.showNotification('Not connected to chat server. Please try again.', 'error');
      return;}

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating...';
      submitBtn.disabled = true;

      this.logger.debug('Creating chat room:', { name: roomName, isPrivate: isPrivate });
      this.logger.debug('Current user:', this.currentUser);

      // Ensure socket authentication is established before creating room
      await this.ensureSocketAuthentication();

      // Create room via socket
      this.socket.emit('createChatRoom', {
        name: roomName,
        isPrivate: isPrivate
      });

      // Listen for response
      this.socket.once('chatRoomCreated', (response) => {
        this.logger.debug('Chat room creation response:', response);
        if (response.success) {
          this.showNotification(response.message, 'success');
          this.removeCreateChatModal();
          // The room tab will be added automatically when we receive the room data
        } else {
          this.showNotification(response.message || 'Failed to create room', 'error');
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });

      this.socket.once('error', (error) => {
        this.logger.error('Chat room creation error:', error);
        this.showNotification(error.message || 'Failed to create room', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });

    } catch (error) {
      this.logger.error('Error creating chat room:', error);
      this.showNotification('Failed to create room', 'error');
      
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Create Room';
      submitBtn.disabled = false;
    }
  }

  /**
   * Ensure socket authentication is properly established
   */
  async ensureSocketAuthentication() {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    if (!this.currentUser || !this.currentUser.id) {
      throw new Error('User not authenticated');
    }

    // Check if we need to re-authenticate
    if (!this.socketAuthenticated) {
      this.logger.debug('Ensuring socket authentication...');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket authentication timeout'));}, 10000);

        // Set up one-time listeners
        this.socket.once('joinedChat', (data) => {
          clearTimeout(timeout);
          this.socketAuthenticated = true;
          this.logger.success('Socket authentication confirmed:', data);
          resolve();
        });

        this.socket.once('error', (error) => {
          clearTimeout(timeout);
          this.logger.error('Socket authentication failed:', error);
          reject(new Error(error.message || 'Socket authentication failed'));
        });

        // Emit join event with user data
        this.logger.debug('Emitting join event for authentication:', {
          userId: this.currentUser.id,
          username: this.currentUser.username
        });
        
        this.socket.emit('join', {
          userId: this.currentUser.id,
          username: this.currentUser.username
        });
      });
    }

    return Promise.resolve();}

  /**
   * Add discoverable public room tab (not yet joined)
   */
  addDiscoverableRoomTab(room) {
    const tabsContainer = this.floatingWindow?.querySelector('.chat-context-tabs');
    const contentContainer = this.floatingWindow?.querySelector('.chat-content');
    
    if (!tabsContainer || !contentContainer) return;const roomId = room._id;
    const roomName = room.name;
    
    // Check if tab already exists
    if (tabsContainer.querySelector(`[data-room-id="${roomId}"]`)) {
      return;}

    // Create discoverable room tab
    const roomTab = document.createElement('button');
    roomTab.className = 'context-tab discoverable-room-tab';
    roomTab.setAttribute('data-context', 'room');
    roomTab.setAttribute('data-room-id', roomId);
    roomTab.innerHTML = `
      <i class="fas fa-door-open"></i>
      <span class="tab-room-name">${roomName}</span>
      <span class="join-indicator">+</span>
    `;

    // Insert before create chat button
    const createChatTab = tabsContainer.querySelector('.create-chat-tab');
    if (createChatTab) {
      createChatTab.insertAdjacentElement('beforebegin', roomTab);
    } else {
      tabsContainer.appendChild(roomTab);
    }

    // Create room content with join prompt
    const roomContent = document.createElement('div');
    roomContent.className = 'context-content discoverable-room-content';
    roomContent.setAttribute('data-context', 'room');
    roomContent.setAttribute('data-room-id', roomId);
    roomContent.innerHTML = `
      <div class="room-join-prompt">
        <div class="room-join-info">
          <i class="fas fa-door-open"></i>
          <h3>${roomName}</h3>
          <p>Public chat room created by ${room.createdBy?.username || 'Unknown'}</p>
          <div class="room-stats">
            <span class="room-participants">${room.participants?.length || 0} members</span>
            <span class="room-public">🌐 Public</span>
          </div>
        </div>
        <div class="room-join-actions">
          <button class="btn-join-room" data-room-id="${roomId}">
            <i class="fas fa-sign-in-alt"></i>
            Join Room
          </button>
        </div>
      </div>
    `;

    contentContainer.appendChild(roomContent);

    // Setup event listeners
    roomTab.addEventListener('click', (e) => {
      this.switchToDiscoverableRoom(roomId, roomName);
    });

    // Setup join button
    const joinBtn = roomContent.querySelector('.btn-join-room');
    joinBtn.addEventListener('click', () => {
      this.joinPublicRoom(roomId, roomName);
    });

    this.logger.success(`Added discoverable room tab: ${roomName}`);
  }

  /**
   * Add user-created room tab
   */
  addUserRoomTab(room) {
    const tabsContainer = this.floatingWindow?.querySelector('.chat-context-tabs');
    const contentContainer = this.floatingWindow?.querySelector('.chat-content');
    
    if (!tabsContainer || !contentContainer) return;const roomId = room._id;
    const roomName = room.name;
    
    // Check if tab already exists
    if (tabsContainer.querySelector(`[data-room-id="${roomId}"]`)) {
      return;}

    // Create room tab
    const roomTab = document.createElement('button');
    roomTab.className = 'context-tab user-room-tab';
    roomTab.setAttribute('data-context', 'room');
    roomTab.setAttribute('data-room-id', roomId);
    roomTab.innerHTML = `
      <i class="fas fa-comments"></i>
      <span class="tab-room-name">${roomName}</span>
      <span class="tab-notification" style="display: none;">●</span>
    `;

    // Insert before create chat button
    const createChatTab = tabsContainer.querySelector('.create-chat-tab');
    if (createChatTab) {
      createChatTab.insertAdjacentElement('beforebegin', roomTab);
    } else {
      tabsContainer.appendChild(roomTab);
    }

    // Create room content
    const roomContent = document.createElement('div');
    roomContent.className = 'context-content user-room-content';
    roomContent.setAttribute('data-context', 'room');
    roomContent.setAttribute('data-room-id', roomId);
    roomContent.innerHTML = `
      <div class="room-chat-header">
        <h4>${roomName}</h4>
        <div class="room-info">
          <span class="room-participants">${room.participants?.length || 0} members</span>
          ${room.isPrivate ? '<span class="room-private">🔒 Private</span>' : '<span class="room-public">🌐 Public</span>'}
        </div>
      </div>
      <div class="chat-messages room-chat-messages" id="room-messages-${roomId}">
        <div class="welcome-message">
          <i class="fas fa-comments"></i>
          <h4>${roomName}</h4>
          <p>Welcome to ${roomName}! Start chatting with other members.</p>
        </div>
      </div>
    `;

    contentContainer.appendChild(roomContent);

    // Setup event listeners
    roomTab.addEventListener('click', (e) => {
      this.switchToUserRoom(roomId, roomName);
    });

    // Add right-click context menu
    roomTab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showTabContextMenu(e, roomTab);
    });

    this.logger.success(`Added room tab: ${roomName}`);
  }

  /**
   * Switch to user-created room
   */
  switchToUserRoom(roomId, roomName) {
    // Update current context to track that we're in a room
    this.currentContext = 'room';
    
    // Hide all context content except room content
    this.floatingWindow?.querySelectorAll('.context-content').forEach(content => {
      if (!content.hasAttribute('data-room-id') || content.getAttribute('data-room-id') !== roomId) {
        content.classList.remove('active');
      }
    });

    // Remove active class from all tabs except room tabs
    this.floatingWindow?.querySelectorAll('.context-tab').forEach(tab => {
      if (!tab.hasAttribute('data-room-id') || tab.getAttribute('data-room-id') !== roomId) {
        tab.classList.remove('active');
      }
    });

    // Show room-specific content
    const roomContent = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-content`);
    const roomTab = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-tab`);

    if (roomContent && roomTab) {
      roomContent.classList.add('active');
      roomTab.classList.add('active');

      // Update channel indicator
      this.updateChannelIndicator('room', roomName);

      // Clear notification indicator
      const notification = roomTab.querySelector('.tab-notification');
      if (notification) {
        notification.style.display = 'none';
        notification.style.animation = '';
      }

      // Remove blinking animation from tab
      roomTab.classList.remove('chat-notification-blink', 'blinking');

      this.logger.success(`Switched to room: ${roomName}`);
    } else {
      this.logger.warn(`Room content or tab not found for room: ${roomId}`);
    }
  }

  /**
   * Switch to discoverable room (not yet joined)
   */
  switchToDiscoverableRoom(roomId, roomName) {
    // Update current context to track that we're viewing a discoverable room
    this.currentContext = 'discoverable';
    
    // Hide all context content except room content
    this.floatingWindow?.querySelectorAll('.context-content').forEach(content => {
      if (!content.hasAttribute('data-room-id') || content.getAttribute('data-room-id') !== roomId) {
        content.classList.remove('active');
      }
    });

    // Remove active class from all tabs except room tabs
    this.floatingWindow?.querySelectorAll('.context-tab').forEach(tab => {
      if (!tab.hasAttribute('data-room-id') || tab.getAttribute('data-room-id') !== roomId) {
        tab.classList.remove('active');
      }
    });

    // Show room-specific content
    const roomContent = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-content`);
    const roomTab = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-tab`);

    if (roomContent && roomTab) {
      roomContent.classList.add('active');
      roomTab.classList.add('active');

      // Update channel indicator
      this.updateChannelIndicator('room', roomName + ' (Join to Chat)');

      this.logger.success(`Switched to discoverable room: ${roomName}`);
    } else {
      this.logger.warn(`Room content or tab not found for discoverable room: ${roomId}`);
    }
  }

  /**
   * Join a public room
   */
  async joinPublicRoom(roomId, roomName) {
    try {
      // Show loading state
      const joinBtn = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"] .btn-join-room`);
      const originalText = joinBtn?.innerHTML || '';
      
      if (joinBtn) {
        joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
        joinBtn.disabled = true;
      }

      // Set up response handlers before sending request
      const handleSuccess = (response) => {
        this.logger.success('Room join success:', response);
        if (response.success) {
          // Convert discoverable tab to user tab
          this.convertToUserRoomTab(roomId, response.room);
          this.showNotification(`Joined ${roomName}!`, 'success');
          
          // Add a small delay to ensure socket room membership is fully established
          // before allowing message sending
          setTimeout(() => {
            this.logger.success('Room membership fully established');
          }, 100);
        } else {
          this.showNotification(response.message || 'Failed to join room', 'error');
          this.resetJoinButton(joinBtn, originalText);
        }
        // Clean up listeners
        this.socket.off('error', handleError);
      };

      const handleError = (error) => {
        this.logger.error('Room join error:', error);
        this.showNotification(error.message || 'Failed to join room', 'error');
        this.resetJoinButton(joinBtn, originalText);
        // Clean up listeners
        this.socket.off('roomJoined', handleSuccess);
      };

      // Join room via socket
      if (this.socket && this.socket.connected) {
        // Set up one-time listeners
        this.socket.once('roomJoined', handleSuccess);
        this.socket.once('error', handleError);
        
        // Send join request
        this.socket.emit('joinRoom', { roomId });
        this.logger.debug(`Sent join request for room: ${roomId}`);

      } else {
        throw new Error('Not connected to chat server');
      }

    } catch (error) {
      this.logger.error('Error joining room:', error);
      this.showNotification('Failed to join room', 'error');
      
      const joinBtn = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"] .btn-join-room`);
      this.resetJoinButton(joinBtn, 'Join Room');
    }
  }

  /**
   * Reset join button to original state
   */
  resetJoinButton(joinBtn, originalText) {
    if (joinBtn) {
      joinBtn.innerHTML = originalText || '<i class="fas fa-sign-in-alt"></i> Join Room';
      joinBtn.disabled = false;
    }
  }

  /**
   * Convert discoverable room tab to user room tab after joining
   */
  convertToUserRoomTab(roomId, roomData) {
    this.logger.debug('Converting discoverable room to user room:', roomId, roomData);
    
    const discoverableTab = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].discoverable-room-tab`);
    const discoverableContent = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].discoverable-room-content`);

    if (discoverableTab && discoverableContent) {
      this.logger.success('Found discoverable tab and content, converting...');
      
      // Store if the discoverable tab was active
      const wasActive = discoverableTab.classList.contains('active');
      
      // Remove discoverable tab and content
      discoverableTab.remove();
      discoverableContent.remove();

      // Add user room tab
      this.addUserRoomTab(roomData);
      
      // Switch to the new room if the discoverable tab was active
      if (wasActive) {
        this.switchToUserRoom(roomId, roomData.name);
      }
      
      this.logger.success('Successfully converted to user room tab');
    } else {
      this.logger.warn('Could not find discoverable tab or content to convert');
      this.logger.debug('Available tabs:', this.floatingWindow?.querySelectorAll(`[data-room-id="${roomId}"]`));
    }
  }

  /**
   * Remove user room tab (handles both user rooms and discoverable rooms)
   */
  removeUserRoomTab(roomId) {
    const roomTab = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-tab`);
    const roomContent = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-content`);

    if (roomTab) roomTab.remove();
    if (roomContent) roomContent.remove();

    // Switch back to global chat if this was the active tab
    if (roomTab?.classList.contains('active')) {
      this.switchContext('global');
    }

    this.logger.success(`Removed room tab: ${roomId}`);
  }

  /**
   * Update user room tab with new data
   */
  updateUserRoomTab(roomId, roomData) {
    const roomTab = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-tab`);
    
    if (roomTab && roomData.totalParticipants !== undefined) {
      const roomInfo = roomTab.closest('.context-content')?.querySelector('.room-participants');
      if (roomInfo) {
        roomInfo.textContent = `${roomData.totalParticipants} members`;
      }
    }
  }

  /**
   * Handle room message
   */
  handleRoomMessage(data) {
    const { roomId, roomName, message } = data;
    
    // Add message to room chat
    const roomMessages = this.floatingWindow?.querySelector(`#room-messages-${roomId}`);
    if (roomMessages) {
      this.addMessageElement(message, roomMessages);
    }

    // Show notification if not in this room
    const roomTab = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-tab`);
    if (roomTab && !roomTab.classList.contains('active')) {
      this.showRoomChatNotification(roomId);
    }

    // Update unread count
    this.updateUnreadCount(message);
  }

  /**
   * Show notification on room chat tab
   */
  showRoomChatNotification(roomId) {
    const roomTab = this.floatingWindow?.querySelector(`[data-room-id="${roomId}"].context-tab`);
    if (roomTab && !roomTab.classList.contains('active')) {
      const notification = roomTab.querySelector('.tab-notification');
      if (notification) {
        notification.style.display = 'inline';
        notification.style.animation = 'pulse 1s infinite';

        // Add blinking animation to the tab
        roomTab.classList.add('chat-notification-blink');

        // Remove blinking after 10 seconds
        setTimeout(() => {
          roomTab.classList.remove('chat-notification-blink');
          if (notification) {
            notification.style.animation = '';
          }
        }, 10000);
      }
    }
  }

  /**
   * Send room message
   */
  async sendRoomMessage(text, roomId) {
    if (!this.socket || !this.socket.connected) {
      this.showNotification('Not connected to chat server', 'error');
      return;}

    if (!this.validators.isValidText(text)) {
      return;}

    try {
      // Ensure socket is authenticated before sending message
      await this.ensureSocketAuthentication();
      
      // Send message via socket
      this.socket.emit('sendMessage', {
        text: text.trim(),
        type: 'room',
        roomId: roomId
      });

      this.logger.debug(`Sent room message to ${roomId}:`, text);
    } catch (error) {
      this.logger.error('Failed to send room message:', error);
      this.showError(this.errorMessages.SEND_ROOM_MESSAGE_FAILED);
    }
  }

  /**
   * Open clan chat for a specific clan
   */
  async openClanChat(clanId) {
    try {
      this.logger.debug('Opening clan chat for clan ID:', clanId);
      
      // Ensure chat is activated
      if (!this.isActive) {
        await this.activateChat();
      }
      
      // Ensure the floating window is visible before switching context
      this.showFloatingWindow();
      // Make sure content is initialized if method exists
      if (typeof this.ensureContentLoaded === 'function') {
        this.ensureContentLoaded();
      }
      
      // Switch to clan context
      this.switchContext('clan');
      
      // Load clan messages
      await this.loadClanMessages();
      
      this.logger.success('Clan chat opened successfully');
      
    } catch (error) {
      this.logger.error('Failed to open clan chat:', error);
      this.showError('Failed to open clan chat. Please try again.');
    }
  }
}

// Create and export singleton instance - but only if it doesn't exist
export const chatManager = window._chatManagerInstance || new ChatManager();

// Make globally available
window.chatManager = chatManager;

// Add global utility functions
window.forceShowChat = () => {
  chatManager.showFloatingWindow();
  chatManager.ensureContentLoaded();
};