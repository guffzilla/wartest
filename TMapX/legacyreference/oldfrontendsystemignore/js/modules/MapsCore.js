/**
 * MapsCore.js - Core Maps System Initialization and State Management
 * 
 * Extracted from the 72KB maps.js monster.
 * Handles core functionality, state management, authentication, and initialization.
 * 
 * Responsibilities:
 * - Core initialization and state management
 * - Authentication checking and user management
 * - Global event listeners and UI setup
 * - Tab switching and navigation logic
 * - Integration with other maps modules
 */

import { apiClient } from './ApiClient.js';

export class MapsCore {
  constructor() {
    this.currentTab = 'all';
    this.currentPage = 1;
    this.totalPages = 1;
    this.currentUser = null;
    this.elements = {};
    this.initialized = false;
    this.currentGame = 'wc2'; // Add game state tracking
  }

  /**
   * Initialize the maps core system
   */
  async init() {
    console.log('🗺️ Initializing Maps Core...');
    
    this.setupElements();
    await this.checkAuthStatus();
    
    // TEMPORARY: Simulate logged-in user for testing rating functionality
    if (!this.currentUser) {
      this.currentUser = {
        id: '6847c3181a69eb49ffa3e775',
        username: 'TURTLEMAN',
        displayName: 'TURTLEMAN',
        role: 'user'
      };
  
    }
    
    this.setupEventListeners();
    this.setupGlobalFunctions();
    
    // Check for URL parameters (e.g., ?id=mapId for direct map linking)
    this.handleUrlParameters();
    
    // Initialize stats for the currently active game
    setTimeout(() => {
      if (window.mapsGrid && typeof window.mapsGrid.updateGameStats === 'function') {
        console.log(`🎮 Initializing stats for current game (${this.currentGame})`);
        window.mapsGrid.updateGameStats(this.currentGame).catch(error => {
          console.error('❌ Error initializing game stats:', error);
        });
      }
    }, 100);
    
    this.initialized = true;
    console.log('✅ Maps Core initialized');
  }

  /**
   * Setup DOM element references
   */
  setupElements() {
    this.elements = {
      mapsGrid: document.getElementById('maps-grid'),
      pagination: document.getElementById('pagination'),
      searchInput: document.getElementById('search-input'),
      searchBtn: document.getElementById('search-btn'),
      wc3SearchInput: document.getElementById('wc3-search-input'),
      wc3SearchBtn: document.getElementById('wc3-search-btn'),
      tabButtons: document.querySelectorAll('.tab-btn'),
      uploadMapBtn: document.getElementById('upload-map-btn'),
      uploadMapModal: document.getElementById('upload-map-modal'),
      uploadMapForm: document.getElementById('upload-map-form'),
      mapDetailsModal: document.getElementById('map-details-modal'),
      mapDetailsContainer: document.getElementById('map-details-container'),
      closeModalButtons: document.querySelectorAll('.close-modal'),

      showRandomMapBtn: document.getElementById('show-random-map-btn')
    };

    console.log('📋 DOM elements setup complete');
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    this.setupSearchListeners();
    this.setupTabListeners();
    this.setupModalListeners();
    this.setupButtonListeners();
    
    console.log('🔗 Event listeners setup complete');
  }

  /**
   * Setup search functionality
   */
  setupSearchListeners() {
    // WC2 Search functionality
    if (this.elements.searchBtn) {
      this.elements.searchBtn.addEventListener('click', () => {
        this.currentPage = 1;
        this.triggerMapsReload();
      });
    }

    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.currentPage = 1;
          this.triggerMapsReload();
        }
      });

      // Clear results when search is emptied
      this.elements.searchInput.addEventListener('input', (e) => {
        if (e.target.value.trim() === '') {
          this.currentPage = 1;
          this.triggerMapsReload();
        }
      });
    }

    // WC3 Search functionality
    if (this.elements.wc3SearchBtn) {
      this.elements.wc3SearchBtn.addEventListener('click', () => {
        this.currentPage = 1;
        this.triggerWC3MapsReload();
      });
    }

    if (this.elements.wc3SearchInput) {
      this.elements.wc3SearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.currentPage = 1;
          this.triggerWC3MapsReload();
        }
      });

      // Clear results when search is emptied
      this.elements.wc3SearchInput.addEventListener('input', (e) => {
        if (e.target.value.trim() === '') {
          this.currentPage = 1;
          this.triggerWC3MapsReload();
        }
      });
    }
  }

  /**
   * Setup tab navigation
   */
  setupTabListeners() {
    this.elements.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.switchTab(button.getAttribute('data-tab'));
      });
    });
  }

  /**
   * Setup modal close listeners
   */
  setupModalListeners() {
    this.elements.closeModalButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.closeModals();
      });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target.classList.contains('modal')) {
        this.closeModals();
      }
    });
  }

  /**
   * Setup action button listeners
   */
  setupButtonListeners() {
    // Random map button
    if (this.elements.showRandomMapBtn) {
      this.elements.showRandomMapBtn.addEventListener('click', async () => {
        await this.showRandomMap();
      });
    }

    // WC3 Random map button
    const wc3RandomBtn = document.getElementById('wc3-random-map-btn');
    if (wc3RandomBtn) {
      wc3RandomBtn.addEventListener('click', async () => {
        await this.showWC3RandomMap();
      });
    }

    // WC3 Upload buttons
    const wc3UploadInput = document.getElementById('wc3-map-upload-input');
    const enhancedUploadBtn = document.getElementById('enhanced-upload-wc3-btn');
    
    if (wc3UploadInput) {
      wc3UploadInput.addEventListener('change', (e) => {
        this.handleWC3Upload(e);
      });
    }
    
    if (enhancedUploadBtn) {
      enhancedUploadBtn.addEventListener('click', () => {
        this.handleEnhancedWC3Upload();
      });
    }

    // Upload map button
    if (this.elements.uploadMapBtn) {
      this.elements.uploadMapBtn.addEventListener('click', () => {
        this.handleUploadMapClick();
      });
    }
  }

  /**
   * Setup global functions for backward compatibility
   */
  setupGlobalFunctions() {
    window.mapsCore = this;
    window.loadMaps = () => this.triggerMapsReload();
    window.switchTab = (tabName) => this.switchTab(tabName);
    window.closeModals = () => this.closeModals();
    
    console.log('🌐 Global functions registered');
  }

  /**
   * Handle URL parameters for deep linking to specific maps
   */
  handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const mapId = urlParams.get('id');
    const showModal = urlParams.get('showModal');
    const gameType = urlParams.get('gameType');
    
    if (mapId) {
      // Set game type if provided
      if (gameType) {
        this.switchGameTab(gameType);
      }
      
      // Wait for modules to be available, then show the map details
      setTimeout(() => {
        if (window.mapDetails && typeof window.mapDetails.viewMapDetails === 'function') {
          window.mapDetails.viewMapDetails(mapId);
        } else if (window.mapsGrid && typeof window.mapsGrid.viewMapDetails === 'function') {
          window.mapsGrid.viewMapDetails(mapId);
        } else {
          console.warn('⚠️ Map details functionality not available');
          // Try a longer wait if modules aren't ready yet
          setTimeout(() => {
            if (window.mapDetails && typeof window.mapDetails.viewMapDetails === 'function') {
              window.mapDetails.viewMapDetails(mapId);
            } else if (window.mapsGrid && typeof window.mapsGrid.viewMapDetails === 'function') {
              window.mapsGrid.viewMapDetails(mapId);
            } else {
              console.error('❌ Map details functionality still not available after retry');
            }
          }, 2000);
        }
      }, 1000); // Give modules more time to initialize
    }
  }

  /**
   * Check user authentication status
   */
  async checkAuthStatus() {
    try {
      this.currentUser = await apiClient.getCurrentUser();
      console.log('👤 User authenticated:', this.currentUser?.username);
    } catch (error) {
      console.log('👤 User not authenticated');
      this.currentUser = null;
    }
  }

  /**
   * Switch to a different tab
   */
  switchTab(tabName) {
    if (this.currentTab === tabName) return;console.log(`🔄 Switching to tab: ${tabName}`);
    
    // Remove active class from all buttons
    this.elements.tabButtons.forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    const targetButton = Array.from(this.elements.tabButtons)
      .find(btn => btn.getAttribute('data-tab') === tabName);
    
    if (targetButton) {
      targetButton.classList.add('active');
    }

    this.currentTab = tabName;
    this.currentPage = 1;

    // Load maps based on the selected tab
    this.triggerMapsReload();
    
    console.log(`✅ Switched to ${tabName} tab`);
  }

  /**
   * Switch game tab programmatically (wc1, wc2, wc3)
   */
  switchGameTab(gameType) {
    console.log(`🎮 Switching to game tab: ${gameType}`);
    
    const gameTabButtons = document.querySelectorAll('.game-tab');
    const gameContents = document.querySelectorAll('.game-content');
    
    // Update current game state
    this.currentGame = gameType;
    
    // Save maps page preference
    localStorage.setItem('mapsPageGame', gameType);
    
    // Remove active class from all tabs and contents
    gameTabButtons.forEach(btn => btn.classList.remove('active'));
    gameContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to target tab and corresponding content
    const targetButton = document.querySelector(`.game-tab[data-game="${gameType}"]`);
    const targetContent = document.getElementById(`${gameType}-content`);
    
    if (targetButton) {
      targetButton.classList.add('active');
    }
    if (targetContent) {
      targetContent.classList.add('active');
    }
    
    // Handle game-specific loading
    if (gameType === 'wc2') {
      // Trigger WC2 maps reload
      this.triggerMapsReload();
    } else if (gameType === 'wc1') {
      // Update game stats counter
      const currentGameMapsEl = document.getElementById('current-game-maps');
      if (currentGameMapsEl) {
        currentGameMapsEl.textContent = '21';
        console.log('✅ WC1 counter updated to 21');
      }
      
      // WC1 is handled by WC1Manager
      if (window.wc1Manager) {
        if (typeof window.wc1Manager.loadScenarios === 'function') {
          window.wc1Manager.loadScenarios().then(() => {
            if (typeof window.wc1Manager.renderScenarios === 'function') {
              window.wc1Manager.renderScenarios();
            }
            if (typeof window.wc1Manager.updateGameStats === 'function') {
              window.wc1Manager.updateGameStats();
            }
          });
        }
      }
    } else if (gameType === 'wc3') {
      // Trigger WC3 maps reload
      this.triggerWC3MapsReload();
    }
    
    // Update game stats using the grid module
    if (window.mapsGrid && typeof window.mapsGrid.updateGameStats === 'function') {
      window.mapsGrid.updateGameStats(gameType).catch(error => {
        console.error('❌ Error updating game stats:', error);
      });
    }
    
    console.log(`✅ Switched to ${gameType.toUpperCase()} game tab`);
  }

  /**
   * Show random map
   */
  async showRandomMap() {
    try {
      console.log('🎲 Fetching random map...');
      
      const result = await apiClient.getRandomWC2Map();
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch random map');
      }
      
      const randomMap = result.data;
      console.log('🎯 Random map fetched:', randomMap.name);

      // Use the map details functionality to show the random map
      if (window.mapDetails && typeof window.mapDetails.viewMapDetails === 'function') {
        await window.mapDetails.viewMapDetails(randomMap._id);
      } else {
        console.error('❌ Map details functionality not available');
        this.showError('Map details functionality not available');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch random map:', error);
      this.showError(`Failed to load random map: ${error.message}`);
    }
  }

  /**
   * Show random WC3 map
   */
  async showWC3RandomMap() {
    try {
      console.log('🎲 Fetching random WC3 map...');
      
      // Get all WC3 maps first
      const result = await apiClient.getWC3Maps({ limit: 1000 });
      const maps = result.maps || [];
      
      if (maps.length === 0) {
        throw new Error('No WC3 maps available');
      }
      
      // Pick a random map
      const randomMap = maps[Math.floor(Math.random() * maps.length)];
      console.log('🎯 Random WC3 map selected:', randomMap.name);

      // Use the map details functionality to show the random map
      if (window.mapDetails && typeof window.mapDetails.viewMapDetails === 'function') {
        await window.mapDetails.viewMapDetails(randomMap._id);
      } else {
        console.error('❌ Map details functionality not available');
        this.showError('Map details functionality not available');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch random WC3 map:', error);
      this.showError(`Failed to load random WC3 map: ${error.message}`);
    }
  }

  /**
   * Handle WC3 map upload
   */
  async handleWC3Upload(event) {
    const file = event.target.files[0];
    if (!file) return;console.log('📤 WC3 map upload initiated:', file.name);
    
    // Validate file type
    const validExtensions = ['.w3m', '.w3x'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      this.showError('Please select a valid Warcraft III map file (.w3m or .w3x)');
      event.target.value = '';
      return;}

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.showError('File size must be less than 50MB');
      event.target.value = '';
      return;}

    try {
      // Show upload progress
      this.showSuccess(`Uploading ${file.name}...`);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('mapFile', file);
      
      // Add optional metadata
      const description = prompt('Enter map description (optional):');
      if (description) {
        formData.append('description', description);
      }
      
      const players = prompt('Number of players (default: 2):');
      if (players && !isNaN(players)) {
        formData.append('players', players);
      }

      // Upload to backend
      const result = await apiClient.uploadWC3Map(formData);

      if (result.success) {
        this.showSuccess(`✅ Map "${result.data.name}" uploaded successfully!`);
        console.log('✅ WC3 map uploaded:', result.data);
        
        // Refresh the maps grid to show the new map
        setTimeout(() => {
          this.triggerWC3MapsReload();
        }, 1000);
      } else {
        this.showError(`Upload failed: ${result.message}`);
        console.error('❌ WC3 upload failed:', result);
      }

    } catch (error) {
      console.error('❌ Error uploading WC3 map:', error);
      this.showError(`Upload failed: ${error.message}`);
    }

    // Clear the file input
    event.target.value = '';
  }

  /**
   * Handle enhanced WC3 upload
   */
  handleEnhancedWC3Upload() {
    console.log('🎯 Enhanced WC3 upload clicked');
    
    // Create enhanced upload modal
    const modal = document.createElement('div');
    modal.className = 'enhanced-upload-modal';
    modal.innerHTML = `
      <div class="enhanced-upload-content">
        <div class="enhanced-upload-header">
          <h3>🎯 Enhanced WC3 Map Upload</h3>
          <button class="close-btn" onclick="this.closest('.enhanced-upload-modal').remove()">&times;</button>
        </div>
        <div class="enhanced-upload-body">
          <div class="upload-section">
            <h4>📁 Map File</h4>
            <input type="file" id="enhanced-wc3-file" accept=".w3m,.w3x" />
            <small>Select your Warcraft III map file (.w3m or .w3x)</small>
          </div>
          
          <div class="metadata-section">
            <h4>📝 Map Information</h4>
            <div class="form-group">
              <label for="map-name">Map Name:</label>
              <input type="text" id="map-name" placeholder="Enter map name" />
            </div>
            <div class="form-group">
              <label for="map-description">Description:</label>
              <textarea id="map-description" placeholder="Describe your map..." rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="map-players">Players:</label>
              <select id="map-players">
                <option value="1">1 Player</option>
                <option value="2" selected>2 Players</option>
                <option value="3">3 Players</option>
                <option value="4">4 Players</option>
                <option value="6">6 Players</option>
                <option value="8">8 Players</option>
                <option value="12">12 Players</option>
              </select>
            </div>
            <div class="form-group">
              <label for="map-tileset">Tileset:</label>
              <select id="map-tileset">
                <option value="Unknown">Unknown</option>
                <option value="Ashenvale">Ashenvale</option>
                <option value="Barrens">Barrens</option>
                <option value="Cityscape">Cityscape</option>
                <option value="Dalaran">Dalaran</option>
                <option value="Dungeon">Dungeon</option>
                <option value="Felwood">Felwood</option>
                <option value="Icecrown">Icecrown</option>
                <option value="Lordaeron">Lordaeron</option>
                <option value="Northrend">Northrend</option>
                <option value="Outland">Outland</option>
                <option value="Sunken Ruins">Sunken Ruins</option>
                <option value="Underground">Underground</option>
                <option value="Village">Village</option>
              </select>
            </div>
          </div>
          
          <div class="features-section">
            <h4>🔧 Enhanced Features</h4>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">🗺️</span>
                <span>Automatic minimap extraction</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>Map metadata parsing</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚔️</span>
                <span>Strategic analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📦</span>
                <span>Batch upload support</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="enhanced-upload-footer">
          <button class="btn btn-secondary" onclick="this.closest('.enhanced-upload-modal').remove()">Cancel</button>
          <button class="btn btn-primary" id="enhanced-upload-btn" disabled>Upload Map</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .enhanced-upload-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .enhanced-upload-content {
        background: #1a1a1a;
        border: 2px solid #4a4a4a;
        border-radius: 8px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        color: #fff;
      }
      
      .enhanced-upload-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #4a4a4a;
      }
      
      .enhanced-upload-header h3 {
        margin: 0;
        color: #ffd700;
      }
      
      .close-btn {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
      }
      
      .enhanced-upload-body {
        padding: 20px;
      }
      
      .upload-section, .metadata-section, .features-section {
        margin-bottom: 20px;
      }
      
      .upload-section h4, .metadata-section h4, .features-section h4 {
        color: #ffd700;
        margin-bottom: 10px;
      }
      
      .form-group {
        margin-bottom: 15px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 5px;
        color: #ccc;
      }
      
      .form-group input, .form-group textarea, .form-group select {
        width: 100%;
        padding: 8px;
        border: 1px solid #4a4a4a;
        border-radius: 4px;
        background: #2a2a2a;
        color: #fff;
      }
      
      .feature-list {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .feature-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: #2a2a2a;
        border-radius: 4px;
      }
      
      .feature-icon {
        font-size: 16px;
      }
      
      .enhanced-upload-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 20px;
        border-top: 1px solid #4a4a4a;
      }
      
      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }
      
      .btn-primary {
        background: #007bff;
        color: white;
      }
      
      .btn-primary:disabled {
        background: #555;
        cursor: not-allowed;
      }
      
      .btn-secondary {
        background: #6c757d;
        color: white;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Add event listeners
    const fileInput = modal.querySelector('#enhanced-wc3-file');
    const uploadBtn = modal.querySelector('#enhanced-upload-btn');
    const nameInput = modal.querySelector('#map-name');

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Auto-fill map name from filename
        const fileName = file.name.replace(/\.(w3m|w3x)$/i, '');
        nameInput.value = fileName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        uploadBtn.disabled = false;
      } else {
        uploadBtn.disabled = true;
      }
    });

    uploadBtn.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) return;uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';

      try {
        const formData = new FormData();
        formData.append('mapFile', file);
        formData.append('description', modal.querySelector('#map-description').value);
        formData.append('players', modal.querySelector('#map-players').value);
        formData.append('tileset', modal.querySelector('#map-tileset').value);

        const result = await apiClient.uploadWC3Map(formData);

        if (result.success) {
          this.showSuccess(`✅ Enhanced upload successful: ${result.data.name}`);
          modal.remove();
          
          // Refresh maps grid
          setTimeout(() => {
            this.triggerWC3MapsReload();
          }, 1000);
        } else {
          this.showError(`Enhanced upload failed: ${result.message}`);
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'Upload Map';
        }
      } catch (error) {
        console.error('❌ Enhanced upload error:', error);
        this.showError(`Enhanced upload failed: ${error.message}`);
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Map';
      }
    });
  }

  /**
   * Handle upload map button click
   */
  handleUploadMapClick() {
    if (!this.currentUser) {
      this.showError('You must be logged in to upload maps');
      window.location.href = '/views/login.html';
      return;}

    // Show upload modal using maps management module
    if (window.mapManagement && typeof window.mapManagement.showUploadModal === 'function') {
      window.mapManagement.showUploadModal();
    } else {
      console.warn('Map management module not available');
    }
  }

  /**
   * Build API URL for maps with current filters and parameters
   */
  buildMapsApiUrl() {
    const params = new URLSearchParams();
    
    // Add pagination
    params.append('page', this.currentPage.toString());
    params.append('limit', '12');
    
    // Add sorting (default alphabetical)
    params.append('sort', 'name');
    params.append('order', 'asc');
    
    // Add search term if present
    const searchInput = document.getElementById('search-input');
    if (searchInput?.value.trim()) {
      params.append('search', searchInput.value.trim());
    }
    
    // Add current tab filter
    if (this.currentTab !== 'all') {
      if (this.currentTab === 'land') {
        params.append('waterType', 'land');
      } else if (this.currentTab === 'sea') {
        params.append('waterType', 'sea');
      }
    }
    
    // Get current game and build appropriate API URL
    const currentGame = this.getCurrentGame();
    let apiEndpoint = '/api/wc2maps'; // default
    
    if (currentGame === 'wc1') {
      apiEndpoint = '/api/wc1maps';
    } else if (currentGame === 'wc3') {
      apiEndpoint = '/api/wc3maps';
    }
    
    return `${apiEndpoint}?${params}`;}

  /**
   * Build WC3 maps API URL with search and pagination
   */
  buildWC3MapsApiUrl() {
    const params = new URLSearchParams();
    
    // Add pagination
    params.append('page', this.currentPage.toString());
    params.append('limit', '12');
    
    // Add sorting (default alphabetical)
    params.append('sort', 'name');
    params.append('order', 'asc');
    
    // Add search term if present
    const wc3SearchInput = document.getElementById('wc3-search-input');
    if (wc3SearchInput?.value.trim()) {
      params.append('search', wc3SearchInput.value.trim());
    }
    
    // Add current tab filter for WC3
    if (this.currentTab !== 'all') {
      // WC3 specific filters can be added here
      params.append('category', this.currentTab);
    }
    
    return `/api/wc3maps?${params}`;}

  /**
   * Get current game from game tabs or default to wc2
   */
  getCurrentGame() {
    // Return the tracked current game
    return this.currentGame;}

  /**
   * Trigger maps reload based on current state
   */
  triggerMapsReload() {
    if (!this.initialized) {
      console.log('⚠️ Core not initialized, skipping reload');
      return;}

    const apiUrl = this.buildMapsApiUrl();
    console.log(`🔄 Triggering maps reload: ${apiUrl}`);
    
    // Notify MapsGrid to reload
    if (window.mapsGrid && typeof window.mapsGrid.loadMaps === 'function') {
      window.mapsGrid.loadMaps(apiUrl);
    } else {
      console.error('❌ MapsGrid not available for reload');
    }
  }

  /**
   * Trigger WC3 maps reload based on current state
   */
  triggerWC3MapsReload() {
    if (!this.initialized) {
      console.log('⚠️ Core not initialized, skipping WC3 reload');
      return;}

    const apiUrl = this.buildWC3MapsApiUrl();
    console.log(`🔄 Triggering WC3 maps reload: ${apiUrl}`);
    
    // Use the existing loadMaps method which already handles WC3
    if (window.mapsGrid && typeof window.mapsGrid.loadMaps === 'function') {
      window.mapsGrid.loadMaps(apiUrl);
    } else {
      console.error('❌ MapsGrid not available for reload');
    }
  }

  /**
   * Close all modals
   */
  closeModals() {
    // Close upload modal
    if (this.elements.uploadMapModal) {
      this.elements.uploadMapModal.classList.remove('show', 'active', 'opening');
      this.elements.uploadMapModal.classList.add('closing');
    }

    // Close map details modal
    if (this.elements.mapDetailsModal) {
      this.elements.mapDetailsModal.classList.remove('show', 'active', 'opening');
      this.elements.mapDetailsModal.classList.add('closing');
    }

    // Close random map modal
    const randomMapModal = document.getElementById('random-map-modal');
    if (randomMapModal) {
      randomMapModal.classList.remove('show', 'active', 'opening');
      randomMapModal.classList.add('closing');
    }

    // Clear map details container
    if (this.elements.mapDetailsContainer) {
      this.elements.mapDetailsContainer.innerHTML = '';
    }

    // Restore body scroll
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Remove closing classes after animation
    setTimeout(() => {
      if (this.elements.uploadMapModal) {
        this.elements.uploadMapModal.classList.remove('closing');
      }
      if (this.elements.mapDetailsModal) {
        this.elements.mapDetailsModal.classList.remove('closing');
      }
      if (randomMapModal) {
        randomMapModal.classList.remove('closing');
      }
    }, 300);
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
      console.log(`Success: ${message}`);
    }
  }

  /**
   * Initialize game tabs functionality
   */
  initializeGameTabs() {
    const gameTabButtons = document.querySelectorAll('.game-tab');
    const gameContents = document.querySelectorAll('.game-content');

    // Restore saved preference or set initial state
    const savedGame = localStorage.getItem('mapsPageGame');
    
    if (savedGame && document.querySelector(`.game-tab[data-game="${savedGame}"]`)) {
      // Restore saved preference
      this.currentGame = savedGame;
      console.log(`🗺️ Restoring saved maps game preference: ${savedGame}`);
      
      // Update UI to match saved preference
      gameTabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.game-content').forEach(content => content.classList.remove('active'));
      
      const savedTab = document.querySelector(`.game-tab[data-game="${savedGame}"]`);
      const savedContent = document.getElementById(`${savedGame}-content`);
      
      if (savedTab) savedTab.classList.add('active');
      if (savedContent) savedContent.classList.add('active');
    } else {
      // Set initial state from HTML
      const activeTab = document.querySelector('.game-tab.active');
      if (activeTab) {
        this.currentGame = activeTab.getAttribute('data-game');
      }
    }

    gameTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetGame = button.getAttribute('data-game');

        // Update current game state
        this.currentGame = targetGame;
        
        // Save maps page preference
        localStorage.setItem('mapsPageGame', targetGame);
        console.log(`💾 Saved maps page preference: ${targetGame}`);

        // Remove active class from all tabs and contents
        gameTabButtons.forEach(btn => btn.classList.remove('active'));
        gameContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        const targetContent = document.getElementById(`${targetGame}-content`);
        if (targetContent) {
          targetContent.classList.add('active');
        }

        // Handle game-specific loading
        if (targetGame === 'wc2') {
          // Trigger WC2 maps reload
          this.triggerMapsReload();
        } else if (targetGame === 'wc1') {
          // SIMPLE FIX: Just update the damn number immediately
          const currentGameMapsEl = document.getElementById('current-game-maps');
          if (currentGameMapsEl) {
            currentGameMapsEl.textContent = '21';
            console.log('✅ WC1 counter DIRECTLY updated to 21');
          } else {
            console.error('❌ current-game-maps element not found!');
          }
          
          // WC1 is handled by WC1Manager - render scenarios and update stats
          if (window.wc1Manager) {
            // Ensure scenarios are loaded first, then render and update stats
            if (typeof window.wc1Manager.loadScenarios === 'function') {
              window.wc1Manager.loadScenarios().then(() => {
                if (typeof window.wc1Manager.renderScenarios === 'function') {
                  window.wc1Manager.renderScenarios();
                }
                if (typeof window.wc1Manager.updateGameStats === 'function') {
                  window.wc1Manager.updateGameStats();
                }
              });
            }
          }
        } else if (targetGame === 'wc3') {
          // Trigger WC3 maps reload
          this.triggerWC3MapsReload();
        }

        // Update game stats using the grid module
        if (window.mapsGrid && typeof window.mapsGrid.updateGameStats === 'function') {
          window.mapsGrid.updateGameStats(targetGame).catch(error => {
            console.error('❌ Error updating game stats:', error);
          });
        }
        
        console.log(`🎮 Switched to ${targetGame.toUpperCase()} tab, currentGame: ${this.currentGame}`);
      });
    });

    console.log('🎮 Game tabs initialized');
  }

  /**
   * Get current state
   */
  getState() {
    return {
      currentTab: this.currentTab,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      currentUser: this.currentUser,
      initialized: this.initialized
    };}

  /**
   * Update state
   */
  updateState(updates) {
    Object.assign(this, updates);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('🧹 Cleaning up Maps Core...');
    
    this.currentTab = 'all';
    this.currentPage = 1;
    this.totalPages = 1;
    this.currentUser = null;
    this.currentGame = 'wc2';
    this.elements = {};
    this.initialized = false;

    console.log('✅ Maps Core cleanup complete');
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    if (!str) return '';return str.charAt(0).toUpperCase() + str.slice(1);}
}

// Create and export singleton instance
export const mapsCore = new MapsCore(); 