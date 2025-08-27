/**
 * Cartography Manager - CLEAN VERSION v2024-01-28
 * Loads user maps from database and renders them in HTML
 * Updated for Rust backend compatibility
 */

import { apiClient } from './ApiClient.js';

class CartographyManager {
  constructor() {
    console.log('CartographyManager: CLEAN VERSION v2024-01-28 loaded');
    this.userMaps = [];
    this.isLoading = false;
    this.container = null;
    this.countElement = null;
  }

  /**
   * Initialize when container is available
   */
  async initialize() {
    // Find the container elements - look in modal first, then fallback to main page
    this.container = document.querySelector('.modal .modal-content #user-maps-container') || 
                    document.getElementById('user-maps-container');
    this.countElement = document.querySelector('.modal .modal-content #user-maps-count') || 
                       document.getElementById('user-maps-count');
    
    if (!this.container) {
      return false;}
    
    await this.loadUserMaps();
    return true;}

  /**
   * Load user maps from database via API
   */
  async loadUserMaps() {
    if (this.isLoading) {
      console.log('🔄 Maps already loading, skipping...');
      return;}
    
    console.log('🗺️ Starting to load user maps...');
    
    // First, try to get cached data from ProfileDataLoader BEFORE showing loading state
    if (window.profileDataLoader) {
      const cachedData = window.profileDataLoader.getCached('user-maps');
      if (cachedData) {
        console.log('🗺️ Found cached maps data:', cachedData.length, 'maps');
        this.userMaps = cachedData;
        this.renderMaps();
        return;} else {
        console.log('🗺️ No cached maps data found in ProfileDataLoader');
      }
    } else {
      console.log('⚠️ ProfileDataLoader not available');
    }

    // Only show loading state if we don't have cached data
    this.isLoading = true;
    this.showLoadingState();

    try {
      // Get user ID
      const userId = this.getUserId();
      console.log('🗺️ User ID for maps request:', userId);
      
      if (!userId) {
        throw new Error('Could not determine user ID');
      }

      // Fetch maps from database via API using new client
      console.log('🗺️ Fetching maps from API...');
      
      const maps = await apiClient.getMaps({
        author: userId
      });
      console.log('🗺️ Raw API response:', maps);
      
      this.userMaps = Array.isArray(maps) ? maps : [];
      console.log('🗺️ Processed maps data:', this.userMaps.length, 'maps');
      
      // Cache the data if ProfileDataLoader is available
      if (window.profileDataLoader) {
        console.log('🗺️ Caching maps data in ProfileDataLoader');
        window.profileDataLoader.cache.set('user-maps', this.userMaps);
      }
      
      // Render the data into HTML
      this.renderMaps();
      
    } catch (error) {
      console.error('❌ CartographyManager: Failed to load maps:', error);
      this.showError('Failed to load your maps. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get current user ID
   */
  getUserId() {
    if (window.profileManager?.currentUser?.id) {
      return window.profileManager.currentUser.id;}
    if (window.currentUser?.id) {
      return window.currentUser.id;}
    return null;}

  /**
   * Show loading state in HTML
   */
  showLoadingState() {
    if (!this.container || !this.countElement) return;this.container.innerHTML = '<div class="loading">Loading your maps...</div>';
    this.countElement.textContent = 'Loading...';
  }

  /**
   * Ensure all parent containers are visible
   */
  ensureContainerVisibility() {
    if (!this.container) return;let currentElement = this.container;
    let depth = 0;
    const maxDepth = 10; // Prevent infinite loops
    
    while (currentElement && depth < maxDepth) {
      // Ensure current element is visible
      currentElement.style.visibility = 'visible';
      currentElement.style.display = 'block';
      currentElement.style.opacity = '1';
      
      // Move to parent
      currentElement = currentElement.parentElement;
      depth++;
    }
  }

  /**
   * Render maps data into HTML elements
   */
  renderMaps() {
    console.log(`🗺️ renderMaps called with ${this.userMaps.length} maps`);
    console.log(`🗺️ Container exists: ${!!this.container}`);
    console.log(`🗺️ Count element exists: ${!!this.countElement}`);
    
    if (!this.container || !this.countElement) {
      console.log(`❌ Missing container or count element, aborting render`);
      return;}
    
    // Clear any existing loading state first
    
    // Ensure container and all parents are visible
    this.ensureContainerVisibility();
    
    // Update count
    this.countElement.textContent = `${this.userMaps.length} maps`;

    if (this.userMaps.length === 0) {
      console.log(`📭 No maps to display, showing empty state`);
      const noMapsHTML = `
        <div class="no-maps-message">
          <i class="fas fa-map"></i>
          <h4>No Maps Yet</h4>
          <p>You haven't uploaded any maps yet. Create your first map and share it with the community!</p>
        </div>
      `;
      this.container.innerHTML = noMapsHTML;
      return;}

    // Create HTML for each map from database
    const mapsHTML = this.userMaps.map(map => this.createMapCardHTML(map)).join('');
    
    // Insert the HTML into the container
    const finalHTML = `
      <div class="user-maps-grid">
        ${mapsHTML}
      </div>
    `;
    this.container.innerHTML = finalHTML;
    console.log(`🗺️ Rendered ${this.userMaps.length} maps to container`);
    
    // Add event listeners as backup for the buttons
    const buttons = this.container.querySelectorAll('.user-map-action-btn');
    console.log(`🔘 Found ${buttons.length} View Details buttons`);
    
    buttons.forEach((button) => {
      // Remove any existing event listeners first
      button.removeEventListener('click', button._clickHandler);
      
      // Create a new handler function
      button._clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const mapId = button.getAttribute('data-map-id');
        const gameType = button.getAttribute('data-game-type');
        console.log(`🔍 View Details clicked - Map ID: ${mapId}, Game Type: ${gameType}`);
        if (window.viewMapOnAtlas) {
          console.log(`🚀 Calling viewMapOnAtlas with mapId: ${mapId}, gameType: ${gameType}`);
          window.viewMapOnAtlas(mapId, gameType);
        } else {
          console.error('❌ window.viewMapOnAtlas not available');
        }
      };
      
      // Add the event listener
      button.addEventListener('click', button._clickHandler);
    });
    
    // FIX: Add click delegation to parent cards to handle intercepted clicks
    const mapCards = this.container.querySelectorAll('.user-map-card');
    console.log(`🔗 Adding click delegation to ${mapCards.length} map cards`);
    
    mapCards.forEach((card) => {
      // Remove any existing card listeners first
      card.removeEventListener('click', card._cardClickHandler);
      
      // Create a card click handler that delegates to the button
      card._cardClickHandler = (e) => {
        // Only handle clicks that didn't directly hit the button
        if (!e.target.closest('.user-map-action-btn')) {
          const button = card.querySelector('.user-map-action-btn');
          if (button) {
            console.log(`🔄 Delegating card click to button`);
            const mapId = button.getAttribute('data-map-id');
            const gameType = button.getAttribute('data-game-type');
            if (window.viewMapOnAtlas && mapId && gameType) {
              console.log(`🚀 Card delegation calling viewMapOnAtlas(${mapId}, ${gameType})`);
              window.viewMapOnAtlas(mapId, gameType);
            }
          }
        }
      };
      
      // Add the card click listener
      card.addEventListener('click', card._cardClickHandler);
    });
  }

  /**
   * Create HTML for a single map card
   */
  createMapCardHTML(map) {
    const gameType = this.getGameType(map);
    const gameBadgeClass = gameType.toLowerCase().replace(/[^a-z0-9]/g, '');
    const mapId = map._id || map.id;
    
    // Convert game type for display
    let displayGameType = 'WC2'; // default
    if (gameType === 'wc1') displayGameType = 'WC1';
    else if (gameType === 'wc2') displayGameType = 'WC2';
    else if (gameType === 'wc3') displayGameType = 'WC3';
    
    const cardHTML = `
      <div class="user-map-card">
        <div class="user-map-header">
          <h4 class="user-map-title">${this.escapeHtml(map.name || 'Unnamed Map')}</h4>
          <span class="user-map-game-badge ${gameBadgeClass}">${displayGameType}</span>
        </div>
        
        <div class="user-map-stats">
          <div class="user-map-stat">
            <i class="fas fa-download"></i>
            <span>${map.downloads || 0}</span>
          </div>
          <div class="user-map-stat">
            <i class="fas fa-star"></i>
            <span>${map.rating || 0}</span>
          </div>
          <div class="user-map-stat">
            <i class="fas fa-users"></i>
            <span>${map.maxPlayers || 'N/A'}</span>
          </div>
        </div>
        
        ${map.description ? `
          <div class="user-map-description">
            ${this.escapeHtml(map.description)}
          </div>
        ` : ''}
        
        <div class="user-map-actions">
          <button class="user-map-action-btn" data-map-id="${mapId}" data-game-type="${gameType}" onclick="viewMapOnAtlas('${mapId}', '${gameType}')">
            <i class="fas fa-eye"></i>
            View Details
          </button>
        </div>
      </div>
    `;
    
    return cardHTML;}

  /**
   * Show error state in HTML
   */
  showError(message) {
    if (!this.container) return;this.container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Navigate to atlas page
   */
  viewMapOnAtlas(mapId, gameType = 'war2') {
    console.log(`📍 CartographyManager.viewMapOnAtlas called with mapId: ${mapId}, gameType: ${gameType}`);
    
    // Convert game type to match maps page format
    let mapsPageGameType = 'wc2'; // default
    if (gameType === 'wc1') {
      mapsPageGameType = 'wc1';
    } else if (gameType === 'wc2') {
      mapsPageGameType = 'wc2';
    } else if (gameType === 'wc3') {
      mapsPageGameType = 'wc3';
    }
    
    // Navigate to maps page with map ID and game type parameters
    const atlasUrl = `/views/atlas.html?id=${mapId}&gameType=${mapsPageGameType}&showModal=true`;
    console.log(`🌐 Navigating to: ${atlasUrl}`);
    
    try {
      window.location.href = atlasUrl;
      console.log(`✅ Navigation initiated to ${atlasUrl}`);
    } catch (error) {
      console.error(`❌ Navigation failed:`, error);
    }
  }

  /**
   * Determine game type from map data
   */
  getGameType(map) {
    if (map.gameType) {
      // Handle the gameType field from the unified API
      return map.gameType.toLowerCase();}
    if (map.game) {
      // Handle legacy game field
      return map.game.toLowerCase();}
    if (map.tileset) return 'wc2';if (map.scenario) return 'wc1';return 'wc2';}

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  /**
   * Refresh maps from database
   */
  async refresh() {
    await this.loadUserMaps();
  }

  /**
   * Initialize specifically for modal context
   */
  async initializeForModal() {
    console.log(`🗺️ CartographyManager.initializeForModal() starting...`);
    
    // Reset container references to ensure clean state
    this.resetContainers();
    
    // Wait a bit for modal content to be fully rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to find containers with retry mechanism
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔍 Attempt ${attempts}: Looking for modal containers...`);
      
      // Find containers in modal context with multiple selectors
      // First try Town Hall modal structure
      this.container = document.querySelector('.townhall-modal-container #user-maps-container') ||
                      document.querySelector('.universal-modal #user-maps-container') ||
                      document.querySelector('.modal .modal-content #user-maps-container') ||
                      document.querySelector('.modal #user-maps-container') ||
                      document.querySelector('.profile-section-modal-container #user-maps-container') ||
                      document.querySelector('[id*="section-modal"] #user-maps-container') ||
                      document.querySelector('.modal-body #user-maps-container');
      this.countElement = document.querySelector('.townhall-modal-container #user-maps-count') ||
                         document.querySelector('.universal-modal #user-maps-count') ||
                         document.querySelector('.modal .modal-content #user-maps-count') ||
                         document.querySelector('.modal #user-maps-count') ||
                         document.querySelector('.profile-section-modal-container #user-maps-count') ||
                         document.querySelector('[id*="section-modal"] #user-maps-count') ||
                         document.querySelector('.modal-body #user-maps-count');
      
      console.log(`🔍 Attempt ${attempts}: Container found: ${!!this.container}, Count element found: ${!!this.countElement}`);
      
      if (this.container && this.countElement) {
        console.log(`✅ Found containers on attempt ${attempts}`);
        // Ensure containers are visible immediately when found
        this.ensureContainerVisibility();
        break;
      }
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (!this.container) {
      console.log(`⚠️ Modal containers not found, trying fallback...`);
      // Fallback to main page containers
      this.container = document.getElementById('user-maps-container');
      this.countElement = document.getElementById('user-maps-count');
      console.log(`🔍 Fallback: Container found: ${!!this.container}, Count element found: ${!!this.countElement}`);
    }
    
    if (!this.container) {
      console.log(`❌ No containers found - initialization failed`);
      return false;}
    
    console.log(`✅ Containers initialized successfully`);
    console.log(`🗺️ Available maps in memory: ${this.userMaps ? this.userMaps.length : 0}`);
    console.log(`🗺️ ProfileDataLoader cached maps: ${window.profileDataLoader && window.profileDataLoader.getCached('user-maps') ? window.profileDataLoader.getCached('user-maps').length : 0}`);
    
    
    // Check for cached data from ProfileDataLoader FIRST
    if (window.profileDataLoader && window.profileDataLoader.getCached('user-maps')) {
      const cachedMaps = window.profileDataLoader.getCached('user-maps');
      this.userMaps = cachedMaps;
      this.renderMaps();
      return true;}
    
    // If we already have data in memory, render it immediately
    if (this.userMaps && this.userMaps.length > 0) {
      this.renderMaps();
      return true;}
    
    // Otherwise, load maps from database
    await this.loadUserMaps();
    return true;}

  /**
   * Reset state for modal reopen scenarios
   */
  resetState() {
    this.container = null;
    this.countElement = null;
    this.isLoading = false;
  }

  /**
   * Set maps data from external source (e.g., ProfileDataLoader)
   */
  setMapsData(maps) {
    this.userMaps = Array.isArray(maps) ? maps : [];
    
    // If containers are available, render immediately
    if (this.container && this.countElement) {
      this.renderMaps();
    }
  }

  /**
   * Reset container references for modal reopens
   */
  resetContainers() {
    this.container = null;
    this.countElement = null;
  }

  /**
   * Cleanup when modal is closed
   */
  cleanup() {
    // Don't clear userMaps data as it might be useful for next modal open
    // Just reset container references to avoid stale references
    this.container = null;
    this.countElement = null;
    this.isLoading = false;
    // Keep userMaps data for faster reopening
  }
}

// Global instance
let cartographyManager = null;

/**
 * Initialize CartographyManager when container is ready
 */
async function initializeCartographyManager() {
  if (cartographyManager) {
    return cartographyManager;}
  
  cartographyManager = new CartographyManager();
  window.cartographyManager = cartographyManager;
  
  return cartographyManager;}

// Immediately execute global function definitions when script loads
(function() {
  // Always expose CartographyManager to window object
  window.CartographyManager = CartographyManager;

  // Make viewMapOnAtlas function globally accessible
  window.viewMapOnAtlas = function(mapId, gameType) {
    console.log(`🌍 Global viewMapOnAtlas called with mapId: ${mapId}, gameType: ${gameType}`);
    console.log(`🔍 CartographyManager available: ${!!window.cartographyManager}`);
    console.log(`🔍 CartographyManager.viewMapOnAtlas available: ${!!(window.cartographyManager && window.cartographyManager.viewMapOnAtlas)}`);
    
    if (window.cartographyManager && window.cartographyManager.viewMapOnAtlas) {
      console.log(`✅ Using CartographyManager.viewMapOnAtlas`);
      window.cartographyManager.viewMapOnAtlas(mapId, gameType);
    } else {
      console.log(`⚠️ Using fallback navigation`);
      // Fallback: direct navigation
      let mapsPageGameType = 'war2'; // default
      if (gameType === 'wc1' || gameType === 'warcraft1') {
        mapsPageGameType = 'war1';
      } else if (gameType === 'wc2' || gameType === 'warcraft2') {
        mapsPageGameType = 'war2';
      } else if (gameType === 'wc3' || gameType === 'warcraft3') {
        mapsPageGameType = 'war3';
      }
      const atlasUrl = `/views/atlas.html?id=${mapId}&gameType=${mapsPageGameType}&showModal=true`;
      console.log(`🌐 Fallback navigating to: ${atlasUrl}`);
      window.location.href = atlasUrl;
    }
  };
})();

