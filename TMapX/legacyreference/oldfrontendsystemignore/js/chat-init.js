/**
 * Universal Chat System Initialization
 * This script initializes the chat system across all pages
 */
import logger from '/js/utils/logger.js';

// Import required modules
import { ApiClient } from './modules/ApiClient.js';
import { ChatManager } from './modules/ChatManager.js';

// Prevent duplicate initialization
if (window.chatManager) {
  // Chat system already initialized
} else {
  // Initializing chat system...

  // Wait for ApiClient to be available (don't create a new one)
  if (!window.apiClient) {
    // Waiting for ApiClient to be loaded...
    // Wait for app:ready event or check periodically
    const waitForApiClient = () => {
      if (window.apiClient) {
        // ApiClient is now available
        initializeChatSystem();
      } else {
        setTimeout(waitForApiClient, 100);
      }
    };
    waitForApiClient();
  } else {
    // ApiClient already available
    initializeChatSystem();
  }

  function initializeChatSystem() {
    // Initialize chat after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeChat);
    } else {
      initializeChat();
    }
  }

  async function initializeChat() {
    try {
      // Verify CSS is loaded
      await verifyChatCSS();
      
      // Check if chat manager already exists and is properly initialized
      if (window.chatManager && window.chatManager.floatingChatIcon && window.chatManager.isInitialized) {
        // Chat manager already exists and is properly initialized
        return;}
      
      // If chat manager exists but icon is missing, try to recreate icon only
      if (window.chatManager && !window.chatManager.floatingChatIcon) {
        // Chat manager exists but missing floating icon, recreating icon only...
        window.chatManager.createFloatingChatIcon();
        return;}
      
      // Create global chat manager instance only if it doesn't exist
      if (!window.chatManager) {
        // Creating new chat manager instance (will start inactive)
        
        try {
          // Try to import ChatManager class
          const { ChatManager } = await import('./modules/ChatManager.js');
          window.chatManager = new ChatManager();
        } catch (importError) {
          logger.error('Failed to import ChatManager', importError);
          // Trying fallback chat manager creation...
          
          // Create a minimal fallback chat manager
          window.chatManager = createFallbackChatManager();
        }
        
        // Chat is now initialized in closed state by default - no socket connections yet
        // Chat manager created in inactive state (icon only)
      }
      
      // Add chat toggle to navbar
      addChatToggleToNavbar();
      
      // Setup page-specific integrations (without activating chat)
      setupPageIntegrations();
      
      // Setup global keyboard shortcuts
      setupKeyboardShortcuts();
      
      // Chat system fully initialized (inactive mode - no server connections)
      
    } catch (error) {
      logger.error('Failed to initialize chat system', error);
      // Creating emergency fallback chat system...
      
      // Emergency fallback
      createEmergencyChatSystem();
    }
  }

  /**
   * Create a minimal fallback chat manager when the main one fails to load
   */
  function createFallbackChatManager() {
    // Creating fallback chat manager...
    
    return {
      isActive: false,
      isInitialized: true,
      floatingChatIcon: null,
      
      createFloatingChatIcon() {
        if (this.floatingChatIcon) return;const chatIcon = document.createElement('div');
        chatIcon.id = 'floating-chat-icon';
        chatIcon.className = 'floating-chat-icon';
        chatIcon.innerHTML = `
          <div class="chat-icon-inner">
            <span class="garrison-icon">⚔️</span>
            <div class="chat-icon-pulse"></div>
          </div>
          <div class="chat-icon-tooltip">Activate Garrison Chat</div>
        `;
        
        chatIcon.addEventListener('click', () => {
          this.showFallbackChat();
        });
        
        document.body.appendChild(chatIcon);
        this.floatingChatIcon = chatIcon;
        // Fallback chat icon created
      },
      
      showFallbackChat() {
        alert('Chat system is currently in fallback mode. Please refresh the page to try again.');
      },
      
      activateChat() {
        // Fallback chat activation requested
        this.createFloatingChatIcon();
        return Promise.resolve();}
    };
  }

  /**
   * Create emergency chat system when everything else fails
   */
  function createEmergencyChatSystem() {
    // Creating emergency chat system...
    
    // Create a simple floating button
    const emergencyButton = document.createElement('button');
    emergencyButton.id = 'emergency-chat-btn';
    emergencyButton.innerHTML = '💬 Chat';
    emergencyButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: #ff4444;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      z-index: 9999;
      font-size: 16px;
    `;
    
    emergencyButton.addEventListener('click', () => {
      alert('Chat system is experiencing issues. Please check the console for errors and refresh the page.');
    });
    
    document.body.appendChild(emergencyButton);
    // Emergency chat button created
  }

  /**
   * Verify that chat CSS is properly loaded and applied
   */
  async function verifyChatCSS() {
    return new Promise((resolve) => {
      // Check if CSS is loaded by testing a specific style
      const testElement = document.createElement('div');testElement.className = 'floating-chat-window';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      document.body.appendChild(testElement);
      
      // Get computed styles
      const computedStyle = window.getComputedStyle(testElement);
      const hasChatStyles = computedStyle.background && computedStyle.background !== 'rgba(0, 0, 0, 0)';
      
      document.body.removeChild(testElement);
      
      if (hasChatStyles) {
        // Chat CSS verified and applied
        resolve();
      } else {
        // Chat CSS not properly applied, loading fallback styles...
        loadFallbackChatStyles();
        resolve();
      }
    });
  }

  /**
   * Load fallback chat styles if main CSS fails
   */
  function loadFallbackChatStyles() {
    if (document.getElementById('fallback-chat-styles')) return;const styles = document.createElement('style');
    styles.id = 'fallback-chat-styles';
    styles.textContent = `
      /* Fallback Chat Styles */
      .floating-chat-window {
        position: fixed;
        width: 50vw;
        max-width: 800px;
        height: 70vh;
        max-height: 600px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%);
        border: 2px solid #ffd700;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        overflow: hidden;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }
      
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
        z-index: 9999;
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
      
      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(90deg, #2d3748 0%, #4a5568 100%);
        border-bottom: 1px solid #ffd700;
        cursor: move;
        user-select: none;
      }
      
      .chat-body {
        display: flex;
        flex-direction: column;
        height: calc(100% - 60px);
        padding: 0;
        overflow: hidden;
        position: relative;
      }
      
      .chat-context-tabs {
        display: flex;
        background: rgba(255, 215, 0, 0.1);
        border-bottom: 1px solid rgba(255, 215, 0, 0.3);
        padding: 0;
        margin: 0;
        overflow-x: auto;
        overflow-y: hidden;
      }
      
      .context-tab {
        flex: 0 0 auto;
        padding: 8px 12px;
        background: none;
        border: none;
        color: #ffd700;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        border-bottom: 3px solid transparent;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        position: relative;
        min-width: fit-content;
        max-width: 120px;
      }
      
      .context-tab:hover {
        background: rgba(255, 215, 0, 0.1);
        color: #fff;
      }
      
      .context-tab.active {
        background: rgba(255, 215, 0, 0.2);
        border-bottom-color: #ffd700;
        color: #fff;
      }
      
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 12px;
        margin-bottom: 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 215, 0, 0.5) transparent;
        background: linear-gradient(135deg, #0f1419 0%, #1a1a2e 100%);
      }
      
      .chat-input-area {
        position: sticky;
        bottom: 0;
        z-index: 100;
        background: rgba(20, 20, 20, 0.95);
        backdrop-filter: blur(10px);
        border-top: 1px solid rgba(255, 215, 0, 0.2);
        padding: 12px;
        display: flex;
        gap: 8px;
        align-items: center;
        min-height: 60px;
        flex-shrink: 0;
      }
      
      .chat-input {
        flex: 1;
        background: #1a202c;
        border: 1px solid #4a5568;
        border-radius: 6px;
        padding: 8px 12px;
        color: #e2e8f0;
        font-size: 13px;
        outline: none;
        transition: all 0.2s;
      }
      
      .chat-input:focus {
        border-color: #ffd700;
        box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
      }
      
      .send-btn {
        background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
        border: none;
        color: #1a1a2e;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      
      .send-btn:hover {
        background: linear-gradient(135deg, #ffed4a 0%, #ffd700 100%);
        transform: translateY(-1px);
      }
    `;
    
    document.head.appendChild(styles);
    // Fallback chat styles loaded
  }
}

/**
 * Setup global chat controls (floating chat button, navbar integration)
 */
function setupGlobalChatControls() {
  // Add chat toggle button to navbar if it doesn't exist
  addChatToggleToNavbar();
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Setup cross-page messaging
  setupCrossPageMessaging();
}

/**
 * Add chat toggle button to navbar
 */
function addChatToggleToNavbar() {
  const navbar = document.querySelector('.navbar') || document.querySelector('nav');
  if (!navbar || document.getElementById('chat-toggle-btn')) return;const chatToggle = document.createElement('button');
  chatToggle.id = 'chat-toggle-btn';
  chatToggle.className = 'chat-toggle-btn';
  chatToggle.innerHTML = `
    <i class="fas fa-comments"></i>
    <span class="chat-notification-dot" style="display: none;"></span>
  `;
  chatToggle.title = 'Toggle Garrison';
  
  chatToggle.addEventListener('click', async () => {
    if (!window.chatManager) {
      logger.error('Chat manager not initialized');
      return;}
    
    if (!window.chatManager.isActive) {
      await window.chatManager.activateChat();
    } else {
      window.chatManager.showFloatingWindow();
    }
  });
  
  // Find a good spot in the navbar (usually near user controls)
  const userControls = navbar.querySelector('.user-controls') || 
                      navbar.querySelector('.navbar-nav') || 
                      navbar;
  
  userControls.appendChild(chatToggle);
  
  // Add styles
  addChatToggleStyles();
}

/**
 * Add styles for chat toggle button
 */
function addChatToggleStyles() {
  if (document.getElementById('chat-toggle-styles')) return;const styles = document.createElement('style');
  styles.id = 'chat-toggle-styles';
  styles.textContent = `
    .chat-toggle-btn {
      position: relative;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
      border: none;
      color: #1a1a2e;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-left: 8px;
      transition: all 0.2s ease;
    }
    
    .chat-toggle-btn:hover {
      background: linear-gradient(135deg, #ffed4a 0%, #ffd700 100%);
      transform: translateY(-1px);
    }
    
    .chat-notification-dot {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      background: #dc3545;
      border-radius: 50%;
      border: 2px solid white;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `;
  
  document.head.appendChild(styles);
}

/**
 * Setup keyboard shortcuts for chat
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', async (e) => {
    // Ctrl/Cmd + Shift + C to toggle chat
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      
      if (!window.chatManager) {
        logger.error('Chat manager not initialized');
        return;}
      
      if (!window.chatManager.isActive) {
        await window.chatManager.activateChat();
      } else {
        window.chatManager.showFloatingWindow();
      }
    }
    
    // Escape to close chat if focused
    if (e.key === 'Escape' && window.chatManager && window.chatManager.floatingWindow) {
      window.chatManager.hideFloatingWindow();
    }
  });
}

/**
 * Setup cross-page messaging functionality
 */
function setupCrossPageMessaging() {
  // Listen for messages from other tabs/windows
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;const { type, data } = event.data;
    
    switch (type) {
      case 'CHAT_MESSAGE':
        chatManager.handleIncomingMessage(data);
        break;
      case 'CHAT_NOTIFICATION':
        chatManager.handleNotification(data);
        break;
    }
  });
  
  // Broadcast messages to other tabs
  chatManager.broadcastToTabs = (type, data) => {
    // Post to all other windows/tabs
    window.postMessage({ type, data }, window.location.origin);
  };
}



/**
 * Setup page-specific integrations
 */
function setupPageIntegrations() {
  const currentPage = window.location.pathname;
  
  switch (true) {
    case currentPage.includes('/chat'):
      setupMainChatPageIntegration();
      break;
    case currentPage.includes('/profile'):
      setupProfilePageIntegration();
      break;
    case currentPage.includes('/clan'):
      setupClanPageIntegration();
      break;
    case currentPage.includes('/ladder'):
      setupLadderPageIntegration();
      break;
    default:
      setupDefaultPageIntegration();
  }
}

/**
 * Main chat page integration
 */
function setupMainChatPageIntegration() {
  // Hide floating window on main chat page
  if (chatManager.floatingWindow) {
    chatManager.hideFloatingWindow();
  }
  
  // Integrate with existing chat page elements
  const mainChatContainer = document.getElementById('chat-container');
  if (mainChatContainer) {
    // Replace or enhance existing chat with our unified system
    enhanceMainChatPage(mainChatContainer);
  }
}

/**
 * Enhance main chat page with unified system
 */
function enhanceMainChatPage(container) {
  // Add context switcher to main chat page
  const contextSwitcher = document.createElement('div');
  contextSwitcher.className = 'main-chat-context-switcher';
  contextSwitcher.innerHTML = `
    <div class="context-tabs-main">
      <button class="context-tab-main active" data-context="global">
        <i class="fas fa-globe"></i> Global Chat
      </button>
      <button class="context-tab-main" data-context="clan">
        <i class="fas fa-shield-alt"></i> Clan Chat
      </button>
      <button class="context-tab-main" data-context="private">
        <i class="fas fa-user"></i> Private Messages
      </button>
    </div>
  `;
  
  container.insertBefore(contextSwitcher, container.firstChild);
  
  // Setup context switching for main page
  contextSwitcher.addEventListener('click', (e) => {
    const tab = e.target.closest('.context-tab-main');
    if (tab) {
      const context = tab.dataset.context;
      switchMainChatContext(context);
    }
  });
}

/**
 * Switch context on main chat page
 */
function switchMainChatContext(context) {
  // Update active tab
  document.querySelectorAll('.context-tab-main').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.context === context);
  });
  
  // Switch content
  chatManager.switchContext(context);
  
  // Update main chat display
  updateMainChatDisplay(context);
}

/**
 * Profile page integration
 */
function setupProfilePageIntegration() {
  // Add quick message button to other user profiles
  addQuickMessageButtons();
  
  // Show notification preferences in profile
  addChatPreferencesToProfile();
}

/**
 * Add quick message buttons to user profiles
 */
function addQuickMessageButtons() {
  // Look for user profile elements
  const userProfiles = document.querySelectorAll('[data-user-id]');
  
  userProfiles.forEach(profile => {
    const userId = profile.dataset.userId;
    if (userId && userId !== chatManager.currentUser?.id) {
      addMessageButton(profile, userId);
    }
  });
}

/**
 * Add message button to profile element
 */
function addMessageButton(profileElement, userId) {
  if (profileElement.querySelector('.quick-message-btn')) return;const messageBtn = document.createElement('button');
  messageBtn.className = 'quick-message-btn btn btn-sm btn-secondary';
  messageBtn.innerHTML = '<i class="fas fa-envelope"></i> Message';
  messageBtn.onclick = () => openPrivateChat(userId);
  
  // Find appropriate place to insert button
  const actionContainer = profileElement.querySelector('.profile-actions') ||
                         profileElement.querySelector('.user-actions') ||
                         profileElement;
  
  actionContainer.appendChild(messageBtn);
}

/**
 * Open private chat with user
 */
function openPrivateChat(userId) {
  chatManager.showFloatingWindow();
  chatManager.switchContext('private');
  chatManager.openPrivateConversation(userId);
}

/**
 * Clan page integration
 */
function setupClanPageIntegration() {
  // Auto-switch to clan chat context when on clan page
  setTimeout(() => {
    chatManager.switchContext('clan');
  }, 1000);
  
  // Add clan chat quick access
  addClanChatQuickAccess();
}

/**
 * Add clan chat quick access
 */
function addClanChatQuickAccess() {
  const clanContainer = document.getElementById('clan-container');
  if (!clanContainer) return;const quickChatBtn = document.createElement('button');
  quickChatBtn.className = 'quick-clan-chat-btn btn btn-primary';
  quickChatBtn.innerHTML = '<i class="fas fa-comments"></i> Open Clan Garrison';
  quickChatBtn.onclick = () => {
    chatManager.showFloatingWindow();
    chatManager.switchContext('clan');
  };
  
  // Add to clan header or actions area
  const clanHeader = clanContainer.querySelector('.clan-header');
  if (clanHeader) {
    clanHeader.appendChild(quickChatBtn);
  }
}

/**
 * Ladder page integration
 */
function setupLadderPageIntegration() {
  // Add message buttons to player entries
  addMessageButtonsToLadder();
  
  // Setup game-specific chat rooms
  setupGameSpecificChatRooms();
}

/**
 * Add message buttons to ladder entries
 */
function addMessageButtonsToLadder() {
  const playerEntries = document.querySelectorAll('.player-entry, .ladder-row');
  
  playerEntries.forEach(entry => {
    const playerId = entry.dataset.playerId || entry.dataset.userId;
    if (playerId && playerId !== chatManager.currentUser?.id) {
      addMessageButtonToLadderEntry(entry, playerId);
    }
  });
}

/**
 * Setup game-specific chat rooms
 */
function setupGameSpecificChatRooms() {
  // Auto-switch to appropriate game room based on current ladder view
  const gameType = getCurrentGameType();
  if (gameType) {
    setTimeout(() => {
      chatManager.switchContext('global');
      chatManager.switchGameRoom(gameType);
    }, 1000);
  }
}

/**
 * Get current game type from page context
 */
function getCurrentGameType() {
  // Try to determine from URL or page elements
  const path = window.location.pathname;
  if (path.includes('wc1') || path.includes('warcraft1')) return 'wc1';if (path.includes('wc2') || path.includes('warcraft2')) return 'wc2';if (path.includes('wc3') || path.includes('warcraft3')) return 'wc3';if (window.gameManager && window.gameManager.getCurrentGame) {
    return window.gameManager.getCurrentGame();}
  
  return 'wc2';}

/**
 * Default page integration
 */
function setupDefaultPageIntegration() {
  // Setup floating window with saved state
  restoreFloatingWindowState();
  
  // Add contextual chat features
  addContextualChatFeatures();
}

/**
 * Restore floating window state from localStorage
 */
function restoreFloatingWindowState() {
  const isMinimized = localStorage.getItem('chatWindowMinimized') === 'true';
  const position = localStorage.getItem('chatWindowPosition');
  
  if (isMinimized && chatManager.floatingWindow) {
    chatManager.floatingWindow.classList.add('minimized');
  }
  
  if (position && chatManager.floatingWindow) {
    const { x, y } = JSON.parse(position);
    chatManager.floatingWindow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
}

/**
 * Add contextual chat features based on page content
 */
function addContextualChatFeatures() {
  // Add message buttons to any user links/mentions on the page
  const userLinks = document.querySelectorAll('a[href*="/profile/"], .user-mention, .player-name[data-user-id]');
  
  userLinks.forEach(link => {
    const userId = extractUserIdFromElement(link);
    if (userId && userId !== chatManager.currentUser?.id) {
      addHoverMessageOption(link, userId);
    }
  });
}

/**
 * Extract user ID from various element types
 */
function extractUserIdFromElement(element) {
  // Try various methods to get user ID
  return element.dataset.userId || 
         element.dataset.playerId ||
         element.href?.match(/\/profile\/(\w+)/)?.[1] ||
         element.getAttribute('data-user');}

/**
 * Add hover message option to user elements
 */
function addHoverMessageOption(element, userId) {
  element.addEventListener('mouseenter', () => {
    showQuickMessageTooltip(element, userId);
  });
  
  element.addEventListener('mouseleave', () => {
    hideQuickMessageTooltip();
  });
}

/**
 * Show quick message tooltip
 */
function showQuickMessageTooltip(element, userId) {
  const tooltip = document.createElement('div');
  tooltip.className = 'quick-message-tooltip';
  tooltip.innerHTML = `
    <button class="tooltip-message-btn" onclick="openPrivateChat('${userId}')">
      <i class="fas fa-envelope"></i> Send Message
    </button>
  `;
  
  document.body.appendChild(tooltip);
  
  // Position tooltip near element
  const rect = element.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.top = (rect.bottom + 5) + 'px';
  tooltip.style.left = rect.left + 'px';
  tooltip.style.zIndex = '10000';
}

/**
 * Hide quick message tooltip
 */
function hideQuickMessageTooltip() {
  const tooltip = document.querySelector('.quick-message-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// Export for global access
window.initializeChat = () => {
  return chatManager.init();};

// Handle page navigation (for SPAs)
window.addEventListener('popstate', () => {
  setupPageIntegrations();
});

// Chat initialization script loaded

 