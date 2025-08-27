/**
 * MapsGrid.js - Maps Grid Display and Data Management
 * 
 * Extracted from the 72KB maps.js monster.
 * Handles maps grid rendering, pagination, search, filtering, and hero stats display.
 * 
 * Responsibilities:
 * - Maps data loading and caching
 * - Grid rendering and display
 * - Pagination system
 * - Search and filtering functionality
 * - Hero stats and game statistics
 */

export class MapsGrid {
  constructor() {
    this.mapsCache = new Map();
    this.currentMaps = [];
    this.isLoading = false;
    this.loadingStates = new Set();
    this.statsLoaded = false;
    this.debugMode = true; // Enable debug mode for overlay positioning
  }

  /**
   * Initialize the maps grid system
   */
  init() {
    console.log('🗃️ Initializing Maps Grid...');
    this.setupGlobalFunctions();
    this.initLazyLoading();
    console.log('✅ Maps Grid initialized');
  }

  /**
   * Setup global functions for backward compatibility
   */
  setupGlobalFunctions() {
    window.mapsGrid = this;
    window.viewMapDetails = (mapId) => this.viewMapDetails(mapId);
    window.downloadMap = (mapId) => this.downloadMap(mapId);
    window.deleteMap = (mapId) => this.deleteMap(mapId);
    
    console.log('🌐 Maps grid functions registered');
  }

  /**
   * Load maps data from API
   */
  async loadMaps(apiUrl = null) {
    // Handle all game types including WC1
    const currentGame = this.getCurrentGame();
    console.log(`🗺️ Loading maps for game: ${currentGame}`);
    console.log(`🔍 Debug: gameTabsManager available: ${!!window.gameTabsManager}`);
    console.log(`🔍 Debug: localStorage mapsPageGame: ${localStorage.getItem('mapsPageGame')}`);
    
    if (this.isLoading) {
      console.log('⏳ Already loading maps, skipping...');
      return;}

    this.isLoading = true;
    this.showLoading();

    try {
      console.log('🔄 Loading maps...');

      // Use provided API URL or build default
      let url;
      if (apiUrl) {
        url = apiUrl;
        console.log(`🌐 Using provided API URL: ${url}`);
      } else {
        // Fallback to default behavior
        const coreState = window.mapsCore?.getState() || {};
        const currentPage = coreState.currentPage || 1;
        const currentTab = coreState.currentTab || 'all';

        const params = new URLSearchParams({
          page: currentPage.toString(),
          sortBy: 'name',  // Default alphabetical sort (numbers first, then letters)
          lean: 'true'  // Request minimal data for grid view
        });

        // Add search term if present
        const searchInput = document.getElementById('search-input');
        if (searchInput?.value.trim()) {
          params.append('search', searchInput.value.trim());
        }

        // Determine API endpoint based on current game
        let apiEndpoint = '/api/wc2maps'; // default
        
        if (currentGame === 'wc3') {
          apiEndpoint = '/api/wc3maps';
        } else if (currentGame === 'wc1') {
          apiEndpoint = '/api/wc1maps';
        }
        
        url = `${apiEndpoint}?${params}`;
        console.log(`🔍 DEBUG: Loading maps from: ${url} for game: ${currentGame}`);
      }

      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Maps API Response:', {
        mapsCount: data.maps?.length || 0,
        totalPages: data.pagination?.totalPages || 0,
        currentPage: data.pagination?.currentPage || 1,
        total: data.pagination?.totalMaps || 0
      });
      
      // Handle pagination response format
      let maps = [];
      let paginationInfo = { page: 1, pages: 1, total: 0 };
      
      if (data.success && data.maps && data.pagination) {
        // War3 API response format: {success: true, maps: [...], pagination: {...}}
        maps = data.maps;
        paginationInfo = {
          page: data.pagination.currentPage || 1,
          pages: data.pagination.totalPages || 1,
          total: data.pagination.totalMaps || 0
        };
      } else if (data.success && data.data && data.pagination) {
        // Alternative API response format: {success: true, data: [...], pagination: {...}}
        maps = data.data;
        paginationInfo = {
          page: data.pagination.currentPage || 1,
          pages: data.pagination.totalPages || 1,
          total: data.pagination.totalMaps || 0
        };
      } else if (data.maps && data.pagination) {
        // Legacy pagination format
        maps = data.maps;
        paginationInfo = data.pagination;
      } else if (Array.isArray(data)) {
        // Direct array format (legacy)
        maps = data;
        paginationInfo = { page: 1, pages: 1, total: data.length };
      } else if (data.maps) {
        // Maps array without pagination
        maps = data.maps;
        paginationInfo = { page: 1, pages: 1, total: data.maps.length };
      } else if (data.data && Array.isArray(data.data)) {
        // Just data array without pagination
        maps = data.data;
        paginationInfo = { page: 1, pages: 1, total: data.data.length };
      } else {
        console.warn('⚠️ Unexpected API response format:', data);
        throw new Error(data.error || 'Invalid response format');
      }
      
      this.currentMaps = maps;
      
      // Update core state with pagination info
      if (window.mapsCore) {
        window.mapsCore.updateState({
          totalPages: paginationInfo.pages,
          currentPage: paginationInfo.page
        });
      }

      // Cache the maps
      this.currentMaps.forEach(map => {
        this.mapsCache.set(map._id, map);
      });

      this.renderMaps(this.currentMaps);
      this.renderPagination(paginationInfo.pages, paginationInfo.page, paginationInfo.total);

      console.log(`✅ Loaded ${this.currentMaps.length} maps (Page ${paginationInfo.page} of ${paginationInfo.pages})`);

    } catch (error) {
      console.error('❌ Failed to load maps:', error);
      this.showError(`Failed to load maps: ${error.message}`);
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }

    // Load hero stats only once per session
    if (!this.statsLoaded) {
      await this.updateHeroStats();
      this.statsLoaded = true;
    }
  }

  /**
   * Initialize intersection observer for lazy loading thumbnails
   */
  initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
              img.src = dataSrc;
              img.removeAttribute('data-src');
              img.classList.remove('lazy-load');
              observer.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01
      });

      // Observe all lazy load images
      document.querySelectorAll('img.lazy-load').forEach(img => {
        imageObserver.observe(img);
      });

      this.imageObserver = imageObserver;
    }
  }

  /**
   * Render maps in grid format
   */
  renderMaps(maps) {
    // Get the correct grid container based on current game
    const currentGame = this.getCurrentGame();
    
    // Render maps for all game types including WC1
    console.log(`🗺️ Rendering maps for game: ${currentGame}`);
    
    // Special handling for WC1 maps (image-based scenarios)
    if (currentGame === 'wc1') {
      this.renderWC1Maps(maps);
      return;}
    
    let gridId = 'maps-grid'; // default for wc2
    
    if (currentGame === 'wc3') {
      gridId = 'wc3-maps-grid';
    }
    
    const mapsGrid = document.getElementById(gridId);
    if (!mapsGrid) {
      console.warn(`Maps grid container not found: ${gridId}`);
      return;}

    if (!maps || maps.length === 0) {
      mapsGrid.innerHTML = this.getNoMapsHTML();
      return;}

    console.log(`🎨 Rendering ${maps.length} maps in ${gridId}`);

    const mapsHTML = maps.map(map => {
      if (currentGame === 'wc3') {
        return this.renderWC3MapCard(map);} else {
        return this.renderMapCard(map);}
    }).join('');
    mapsGrid.innerHTML = mapsHTML;

    // Setup event listeners for each map card individually
    const mapCards = mapsGrid.querySelectorAll('.wc2-map-card, .wc3-map-card');
    mapCards.forEach((mapCard, index) => {
      const map = maps[index];
      if (map) {
        // Add gameType to map object if not present
        if (!map.gameType) {
          map.gameType = currentGame;
        }
        this.setupMapCardListeners(mapCard, map);
      }
    });
    
    // Setup pagination event listeners
    this.setupPaginationListeners();
    
    // Initialize lazy loading for newly rendered images
    setTimeout(() => {
      this.initLazyLoading();
    }, 100);
  }

  /**
   * Render WC1 maps (image-based scenarios)
   */
  renderWC1Maps(maps) {
    console.log(`🗡️ Rendering ${maps.length} WC1 scenarios`);
    
    const wc1Grid = document.getElementById('wc1-scenarios-grid');
    if (!wc1Grid) {
      console.warn('WC1 scenarios grid not found');
      return;}

    if (!maps || maps.length === 0) {
      wc1Grid.innerHTML = '<div class="no-maps-message">No WC1 scenarios found</div>';
      return;}

    // Group scenarios by category
    const categories = {};
    maps.forEach(scenario => {
      const category = scenario.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(scenario);
    });

    let scenariosHTML = '';
    
    // Render each category
    Object.entries(categories).forEach(([category, scenarios]) => {
      scenariosHTML += `
        <div class="wc1-category-section">
          <h3 class="category-title">${category.charAt(0).toUpperCase() + category.slice(1)} Scenarios</h3>
          <div class="wc1-scenarios-row">
            ${scenarios.map(scenario => this.renderWC1ScenarioCard(scenario)).join('')}
          </div>
        </div>
      `;
    });

    wc1Grid.innerHTML = scenariosHTML;
    
    // Setup WC1 scenario card event listeners
    this.setupWC1ScenarioListeners();
  }

  /**
   * Render a single WC1 scenario card
   */
  renderWC1ScenarioCard(scenario) {
    const scenarioId = scenario._id || scenario.id;
    const scenarioName = scenario.name || 'Unknown Scenario';
    const description = scenario.description || 'No description available';
    const imagePath = scenario.imagePath || '/img/default-wc1-scenario.png';
    const category = scenario.category || 'other';
    const rating = scenario.averageRating || 0;
    const ratingCount = scenario.ratingCount || 0;

    return `
      <div class="wc1-scenario-card" data-scenario-id="${scenarioId}" data-category="${category}">
        <div class="scenario-image-container">
          <img src="${imagePath}" alt="${scenarioName}" class="scenario-image" loading="lazy">
          <div class="scenario-overlay">
            <div class="scenario-rating">
              <i class="fas fa-star"></i>
              <span>${rating.toFixed(1)}</span>
              <small>(${ratingCount})</small>
            </div>
          </div>
        </div>
        <div class="scenario-info">
          <h4 class="scenario-name">${scenarioName}</h4>
          <p class="scenario-description">${description}</p>
          <div class="scenario-actions">
            <button class="btn-view-scenario" data-scenario-id="${scenarioId}">
              <i class="fas fa-eye"></i>
              View
            </button>
            <button class="btn-rate-scenario" data-scenario-id="${scenarioId}">
              <i class="fas fa-star"></i>
              Rate
            </button>
          </div>
        </div>
      </div>
    `;}

  /**
   * Setup event listeners for WC1 scenario cards
   */
  setupWC1ScenarioListeners() {
    const scenarioCards = document.querySelectorAll('.wc1-scenario-card');
    
    scenarioCards.forEach(card => {
      const scenarioId = card.dataset.scenarioId;
      
      // View scenario button
      const viewBtn = card.querySelector('.btn-view-scenario');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          this.viewWC1Scenario(scenarioId);
        });
      }
      
      // Rate scenario button
      const rateBtn = card.querySelector('.btn-rate-scenario');
      if (rateBtn) {
        rateBtn.addEventListener('click', () => {
          this.rateWC1Scenario(scenarioId);
        });
      }
    });
  }

  /**
   * View WC1 scenario details
   */
  viewWC1Scenario(scenarioId) {
    console.log(`🗡️ Viewing WC1 scenario: ${scenarioId}`);
    
    // Find the scenario data
    const scenario = this.currentMaps.find(map => map._id === scenarioId);
    if (!scenario) {
      console.error(`❌ Scenario not found: ${scenarioId}`);
      return;}
    
    // Create and show the WC1 scenario modal
    this.showWC1ScenarioModal(scenario);
  }

  /**
   * Show WC1 scenario modal with fullscreen map
   */
  showWC1ScenarioModal(scenario) {
    console.log(`🗡️ Opening WC1 scenario modal for: ${scenario.name}`);
    
    // Remove existing modal if present
    const existingModal = document.getElementById('wc1-scenario-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
      <div id="wc1-scenario-modal" class="wc1-scenario-modal">
        <div class="wc1-modal-overlay"></div>
        <div class="wc1-modal-content">
          <div class="wc1-modal-header">
            <h2 class="wc1-modal-title">${scenario.name}</h2>
            <button class="wc1-modal-close" onclick="this.closest('.wc1-scenario-modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="wc1-modal-body">
            <div class="wc1-scenario-image-container">
              <img src="${scenario.imagePath}" alt="${scenario.name}" class="wc1-scenario-fullscreen-image">
            </div>
            <div class="wc1-scenario-details">
              <div class="scenario-category">
                <i class="fas fa-tag"></i>
                <span>${scenario.category || 'Unknown'}</span>
              </div>
              <div class="scenario-description-full">
                <p>${scenario.description || 'No description available'}</p>
              </div>
              <div class="scenario-rating-section">
                <h4>Rating</h4>
                <div class="scenario-rating-display">
                  <div class="stars">
                    ${this.generateStarRating(scenario.averageRating || 0)}
                  </div>
                  <span class="rating-value">${(scenario.averageRating || 0).toFixed(1)}</span>
                  <span class="rating-count">(${scenario.ratingCount || 0} ratings)</span>
                </div>
              </div>
            </div>
          </div>
          <div class="wc1-modal-footer">
            <button class="btn-rate-scenario-modal" onclick="this.closest('.wc1-scenario-modal').querySelector('.rating-input-section').style.display='block'">
              <i class="fas fa-star"></i>
              Rate This Scenario
            </button>
            <button class="btn-close-modal" onclick="this.closest('.wc1-scenario-modal').remove()">
              Close
            </button>
          </div>
          <div class="rating-input-section" style="display: none;">
            <h4>Rate this scenario:</h4>
            <div class="rating-stars-input">
              ${this.generateClickableStars()}
            </div>
            <button class="btn-submit-rating" onclick="this.closest('.wc1-scenario-modal').querySelector('.rating-input-section').style.display='none'">
              Submit Rating
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add click outside to close functionality
    const modal = document.getElementById('wc1-scenario-modal');
    const overlay = modal.querySelector('.wc1-modal-overlay');
    
    overlay.addEventListener('click', () => {
      modal.remove();
    });
    
    // Prevent modal content clicks from closing
    const modalContent = modal.querySelector('.wc1-modal-content');
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    console.log(`✅ WC1 scenario modal opened for: ${scenario.name}`);
  }

  /**
   * Generate star rating display
   */
  generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
      starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;}

  /**
   * Generate clickable stars for rating input
   */
  generateClickableStars() {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
      starsHTML += `<i class="far fa-star" data-rating="${i}" onclick="this.parentElement.parentElement.parentElement.querySelector('.rating-stars-input').setAttribute('data-selected', '${i}'); this.parentElement.innerHTML = '${this.generateStarRating(i)}';"></i>`;
    }
    return starsHTML;}

  /**
   * Rate WC1 scenario
   */
  rateWC1Scenario(scenarioId) {
    console.log(`🗡️ Rating WC1 scenario: ${scenarioId}`);
    // TODO: Implement WC1 scenario rating
    alert(`Rating WC1 scenario: ${scenarioId}`);
  }

  /**
   * Render a single map card
   */
  renderMapCard(map) {
    const mapId = map._id || map.id;
    const mapName = map.name || 'Unknown Map';
    const creator = map.creator || map.author || 'Unknown Creator';
    const thumbnailPath = this.getThumbnailPath(map);
    const playerCount = this.getPlayerCountDisplay(map);
    const mapSize = map.mapSize || map.size || 'Unknown';
    const userRating = map.userRating || 0;
    const averageRating = map.averageRating || 0;
    const downloadUrl = map.downloadUrl || `/api/war2maps/${mapId}/download`;

    return `
      <div class="wc2-map-card" data-map-id="${mapId}">
        <!-- Top buttons section -->
        <div class="map-top-buttons">
          <button class="btn-view-details-enhanced" data-map-id="${mapId}">
            <i class="fas fa-eye"></i>
            Details
          </button>
          <button class="btn-download-overlay" data-map-id="${mapId}">
            <i class="fas fa-download"></i>
            Download
          </button>
          <button class="btn-fullscreen-overlay" data-map-id="${mapId}">
            <i class="fas fa-expand"></i>
            Fullscreen
          </button>
          <button class="btn-match-history" data-map-id="${mapId}">
            <i class="fas fa-history"></i>
            History
          </button>
        </div>

        <!-- Left and right stats -->
        <div class="map-edge-stats">
          <div class="map-left-stat">
            <i class="fas fa-users"></i>
            ${playerCount}
          </div>
          <div class="map-right-stat">
            <i class="fas fa-expand-arrows-alt"></i>
            ${mapSize}
          </div>
        </div>

        <!-- Rating section positioned below edge stats -->
        <div class="map-rating-section">
          <div class="stars-container" data-rating="${averageRating}">
            ${this.generateStarRating(averageRating, userRating, mapId)}
          </div>
          <span class="rating-text">(${averageRating.toFixed(1)})</span>
          <button class="test-star-rating-btn" onclick="window.mapsGrid.testStarRatingInteraction('${mapId}')" style="
            background: #ff6b6b;color: white;
          border: none;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          cursor: pointer;
          margin-left: 8px;
        ">Test Stars</button>
        </div>

        <div class="wc2-map-thumbnail-container">
          <img
            src="${thumbnailPath}"
            alt="${mapName}"
            class="wc2-map-thumbnail lazy-load"
            loading="lazy"
          />
        </div>

        <div class="wc2-map-info">
          <div class="map-meta-enhanced">
            <div class="map-meta-left">
              <h3 class="map-title">${mapName}</h3>
              <p class="map-creator">by ${creator}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render WC3 map card
   */
  renderWC3MapCard(map) {
    const mapId = map._id || map.id;
    const mapName = map.name || 'Unknown Map';
    const creator = map.creator || map.author || 'Unknown Creator';
    const thumbnailPath = this.getThumbnailPath(map);
    const playerCount = this.getPlayerCountDisplay(map);
    const mapSize = map.mapSize || map.size || 'Unknown';
    
    // Calculate rating
    const ratings = map.ratings || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;
    const ratingCount = ratings.length;

    // Get user's current rating for this map
    const user = window.mapsCore?.currentUser;
    const userRating = user && ratings.length > 0 
      ? ratings.find(r => 
          (r.userId === user.id) || 
          (r.userId?._id === user.id) || 
          (r.userId?.toString() === user.id?.toString())
        )?.rating || 0
      : 0;

    // Generate star rating HTML
    const stars = this.generateStarRating(averageRating, userRating, map._id);

    const ratingText = ratingCount > 0 
      ? `${averageRating.toFixed(1)} (${ratingCount} review${ratingCount !== 1 ? 's' : ''})`
      : 'No ratings yet';

    return `
      <div class="wc3-map-card" data-map-id="${mapId}" data-game-type="wc3">
        <div class="wc3-map-thumbnail-container">
          <img src="${thumbnailPath}" alt="${mapName}" class="wc3-map-thumbnail">
          <div class="map-top-buttons">
            <button class="wc3-btn-view-details-enhanced" data-action="view-details" data-map-id="${mapId}">
              <i class="fas fa-eye"></i>
              Details
            </button>
            <button class="wc3-btn-download-overlay" data-action="download" data-map-id="${mapId}">
              <i class="fas fa-download"></i>
              Download
            </button>
            <button class="btn-fullscreen-overlay" data-action="fullscreen" data-map-id="${mapId}">
              <i class="fas fa-expand"></i>
              Fullscreen
            </button>
            <button class="btn-match-history" data-map-id="${mapId}">
              <i class="fas fa-history"></i>
              History
            </button>
          </div>
          <div class="map-edge-stats">
            <div class="map-left-stat">
              <i class="fas fa-users"></i>
              <span>${playerCount}</span>
            </div>
            <div class="map-right-stat">
              <i class="fas fa-expand-arrows-alt"></i>
              <span>${mapSize}</span>
            </div>
          </div>
        </div>
        
        <div class="wc3-map-info">
          <h3 class="wc3-map-title">${mapName}</h3>
          <p class="wc3-map-description">${map.description || 'No description available'}</p>
          <div class="wc3-map-meta">
            <span class="wc3-map-size">
              <i class="fas fa-map"></i>
              ${mapSize} Size
            </span>
          </div>
          <div class="map-creator">by ${creator}</div>
        </div>
        
        <div class="wc3-map-rating-section">
          <div class="stars-container">
            ${this.generateStarRating(averageRating, userRating, mapId)}
          </div>
          <span class="rating-text">${ratingText}</span>
          <button class="test-star-rating-btn" onclick="window.mapsGrid.testStarRatingInteraction('${mapId}')" style="
            background: #ff6b6b;color: white;
            border: none;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            cursor: pointer;
            margin-left: 8px;
          ">Test Stars</button>
        </div>
      </div>
    `;
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;}

  /**
   * Setup pagination event listeners
   */
  setupPaginationListeners() {
    const paginationButtons = document.querySelectorAll('.pagination-btn[data-page]');
    
    paginationButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(button.dataset.page);
        if (page && !isNaN(page)) {
          this.goToPage(page);
        }
      });
    });
  }

  /**
   * Setup event listeners for map cards
   */
  setupMapCardListeners(mapCard, map) {
    // Prevent event bubbling for functional buttons
    const functionalElements = mapCard.querySelectorAll('.btn-view-details-enhanced, .wc3-btn-view-details-enhanced, .btn-download-overlay, .wc3-btn-download-overlay, .btn-fullscreen-overlay, .btn-match-history');
    functionalElements.forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    // REMOVED: No more fullscreen clickable area - users must use the fullscreen button
    // The entire card is no longer clickable for fullscreen

    // Setup interactive star ratings
    this.setupInteractiveStarRating(mapCard, map);

    // Fullscreen button functionality
    const fullscreenBtn = mapCard.querySelector('.btn-fullscreen-overlay');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (map.gameType === 'wc2') {
          this.showWC2FullscreenImage(map);
        } else if (map.gameType === 'wc3') {
          await this.showWC3FullscreenImage(map);
        }
      });
    }

    // View details button functionality - handle both WC2 and WC3 classes
    const viewDetailsBtn = mapCard.querySelector('.btn-view-details-enhanced, .wc3-btn-view-details-enhanced');
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openMapDetails(map);
      });
    }

    // Download button functionality - handle both WC2 and WC3 classes
    const downloadBtn = mapCard.querySelector('.btn-download-overlay, .wc3-btn-download-overlay');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Use the downloadMap function instead of just opening URL
        this.downloadMap(map._id || map.id);
      });
    }

    // Match history button
    const matchHistoryBtn = mapCard.querySelector('.btn-match-history');
    if (matchHistoryBtn) {
      matchHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.mapDetails && typeof window.mapDetails.showMatchHistory === 'function') {
          window.mapDetails.showMatchHistory(map._id || map.id);
        } else {
          // Fallback if MapDetails is not available
          console.log('📊 Match history feature not available');
          alert('Match history feature coming soon! This will show detailed statistics for this map including recent matches, popular strategies, and race win rates.');
        }
      });
    }
  }

  /**
   * Setup interactive star rating functionality for map cards
   */
  setupInteractiveStarRating(mapCard, map) {
    const starsContainer = mapCard.querySelector('.stars-container');
    if (!starsContainer) return;const mapId = map._id || map.id;
    const currentGame = map.gameType || this.getCurrentGame();

    // Handle star clicks
    starsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('rating-star')) {
        e.stopPropagation();
        const rating = parseInt(e.target.dataset.rating);
        console.log(`⭐ Star clicked: ${rating} for ${currentGame} map ${mapId}`);
        
        // Use MapDetails if available, otherwise show basic rating prompt
        if (window.mapDetails && typeof window.mapDetails.handleStarClick === 'function') {
          window.mapDetails.handleStarClick(rating, mapId, currentGame);
        } else {
          this.showBasicRatingPrompt(rating, mapId, currentGame);
        }
      }
    });

    // Handle star hover effects
    starsContainer.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('rating-star')) {
        const rating = parseInt(e.target.dataset.rating);
        this.highlightStarsOnHover(starsContainer, rating);
      }
    });

    starsContainer.addEventListener('mouseout', () => {
      this.resetStarHighlight(starsContainer);
    });
  }

  /**
   * Show basic rating prompt if MapDetails is not available
   */
  showBasicRatingPrompt(rating, mapId, gameType) {
    const user = window.mapsCore?.currentUser;
    if (!user) {
      alert('You must be logged in to rate maps');
      window.location.href = '/views/login.html';
      return;}

    const comment = prompt(`Rate this map ${rating} stars. Add a comment (optional):`);
    if (comment !== null) { // User didn't cancel
      this.submitBasicRating(mapId, rating, comment, gameType);
    }
  }

  /**
   * Submit basic rating if MapDetails is not available
   */
  async submitBasicRating(mapId, rating, comment, gameType) {
    try {
      const response = await fetch(`/api/${gameType}maps/${mapId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: rating,
          comment: comment || ''
        })
      });

      if (response.ok) {
        alert('Rating submitted successfully!');
        // Refresh the map card to show new rating
        this.refreshMapCard(mapId, gameType);
      } else {
        alert('Failed to submit rating. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Error submitting rating. Please try again.');
    }
  }

  /**
   * Refresh a specific map card after rating update
   */
  async refreshMapCard(mapId, gameType) {
    try {
      // Reload the specific map data
      const apiUrl = `/api/${gameType}maps/${mapId}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const mapData = await response.json();
        
        // Find and update the specific map card
        const mapCard = document.querySelector(`[data-map-id="${mapId}"]`);
        if (mapCard) {
          // Update the rating display
          const starsContainer = mapCard.querySelector('.stars-container');
          if (starsContainer) {
            const averageRating = mapData.averageRating || 0;
            const userRating = mapData.userRating || 0;
            starsContainer.innerHTML = this.generateStarRating(averageRating, userRating, mapId);
            
            // Re-setup the interactive functionality
            this.setupInteractiveStarRating(mapCard, mapData);
          }
          
          // Update rating text
          const ratingText = mapCard.querySelector('.rating-text');
          if (ratingText) {
            const ratings = mapData.ratings || [];
            const ratingCount = ratings.length;
            if (ratingCount > 0) {
              ratingText.textContent = `(${averageRating.toFixed(1)})`;
            } else {
              ratingText.textContent = '(No ratings yet)';
            }
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing map card:', error);
    }
  }

  /**
   * Open map details for a given map object
   */
  openMapDetails(map) {
    const mapId = map._id || map.id;
    if (mapId) {
      this.viewMapDetails(mapId);
    }
  }

  /**
   * Highlight stars on hover for map cards
   */
  highlightStarsOnHover(starsContainer, rating) {
    const stars = starsContainer.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
      const starRating = index + 1;
      if (starRating <= rating) {
        star.className = 'fas fa-star rating-star';
        star.style.color = '#ffd700';
        star.style.transform = 'scale(1.1)';
      } else {
        star.className = 'far fa-star rating-star';
        star.style.color = '#6b7280';
        star.style.transform = 'scale(1)';
      }
    });
  }

  /**
   * Reset star highlighting
   */
  resetStarHighlight(starsContainer) {
    const stars = starsContainer.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
      const averageRating = parseFloat(starsContainer.dataset.rating) || 0;
      const fullStars = Math.floor(averageRating);
      const hasHalfStar = averageRating % 1 >= 0.5;
      
      if (index < fullStars) {
        star.className = 'fas fa-star rating-star';
        star.style.color = '#ffd700';
      } else if (index === fullStars && hasHalfStar) {
        star.className = 'fas fa-star-half-alt rating-star';
        star.style.color = '#ffd700';
      } else {
        star.className = 'far fa-star rating-star';
        star.style.color = '#6b7280';
      }
      star.style.transform = 'scale(1)';
    });
  }
  
  /**
   * Show fullscreen image with enhanced modal (matches MapDetails implementation)
   */
  showFullscreenImage(src, alt, mapData = null) {
    console.log('🖼️ Opening fullscreen image with enhanced modal');
    
    // Remove any existing fullscreen modal
    const existingModal = document.getElementById('fullscreen-modal-enhanced');
    if (existingModal) {
      existingModal.remove();
    }

    // Create fullscreen modal (same as MapDetails)
    const modal = document.createElement('div');
    modal.id = 'fullscreen-modal-enhanced';
    modal.className = 'modal';

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'fullscreen-image-container';

    // Create close button
    const closeButton = document.createElement('span');
    closeButton.className = 'close-modal';
    closeButton.id = 'close-fullscreen-enhanced';
    closeButton.innerHTML = '×';

    // Create image
    const img = document.createElement('img');
    img.className = 'fullscreen-image';
    img.alt = alt;
    img.src = src;

    // Assemble the modal
    imageContainer.appendChild(img);
    modal.appendChild(closeButton);
    modal.appendChild(imageContainer);
    document.body.appendChild(modal);

    // Add overlays if map data is available
    if (mapData) {
      const createOverlays = (attempts = 0) => {
        const maxAttempts = 20; // Max 2 seconds of retries
        
        // Wait for layout to stabilize and ensure image dimensions are available
        setTimeout(() => {
          // Check if modal is still open and image has proper dimensions
          const modalStillOpen = modal.style.display !== 'none' && modal.parentNode;
          if (!modalStillOpen) {
            console.log('🚫 Modal closed, skipping overlay creation');
            return;}
          
          if (img.offsetWidth > 0 && img.offsetHeight > 0 && img.complete) {
            console.log('✅ Creating overlays with dimensions:', img.offsetWidth, 'x', img.offsetHeight);
            
            // Use MapDetails createEnhancedOverlays if available, otherwise fallback to local version
            if (window.mapDetails && typeof window.mapDetails.createEnhancedOverlays === 'function') {
              console.log('✅ Using MapDetails createEnhancedOverlays for consistent overlay logic...');
              window.mapDetails.createEnhancedOverlays(imageContainer, img, mapData);
            } else {
              console.log('⚠️ MapDetails not available, using fallback overlay creation...');
              this.createEnhancedOverlays(imageContainer, img, mapData);
            }
          } else if (attempts < maxAttempts) {
            // Retry if image dimensions aren't ready yet
            console.log(`🔄 Retrying overlay creation (attempt ${attempts + 1}/${maxAttempts})`);
            createOverlays(attempts + 1);
          } else {
            console.warn('❌ Failed to create overlays after max attempts');
          }
        }, attempts === 0 ? 250 : 100); // Longer initial delay, shorter retries
      };
      
      if (img.complete && img.naturalHeight !== 0) {
        createOverlays();
      } else {
        img.onload = createOverlays;
      }
    }

    // Show modal with animation
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Close modal functions
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal && modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    };

    // Event listeners for closing
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Escape key listener
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    console.log('✅ Enhanced fullscreen modal opened with overlays');
  }

  /**
   * Show WC3 fullscreen image with enhanced modal and overlays
   */
  async showWC3FullscreenImage(map) {
    console.log('🖼️ Opening WC3 fullscreen image with proper overlays');
    console.log('Map data:', map);
    
    // Remove any existing WC3 fullscreen modal
    const existingModal = document.querySelector('.wc3-fullscreen-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create WC3 fullscreen modal
    const modal = document.createElement('div');
    modal.className = 'wc3-fullscreen-modal';

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'wc3-fullscreen-container fullscreen-image-container';

    // Create close button
    const closeButton = document.createElement('span');
    closeButton.id = 'close-wc3-fullscreen';
    closeButton.innerHTML = '×';

    // Create image
    const img = document.createElement('img');
    img.className = 'wc3-fullscreen-image';
    img.alt = map.name || 'Unknown Map';
    img.src = map.thumbnailPath || `/uploads/war3images/${map.filename?.replace('.w3x', '.png')}` || '/uploads/thumbnails/default-map.png';

    // Assemble the modal
    imageContainer.appendChild(img);
    modal.appendChild(closeButton);
    modal.appendChild(imageContainer);
    document.body.appendChild(modal);

    // Show modal with animation
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Close modal functions
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal && modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    };

    // Event listeners for closing
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Escape key listener
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Create proper WC3 overlays after image loads
    img.addEventListener('load', async () => {
      console.log('🖼️ WC3 Fullscreen image loaded, creating proper overlays...');
      
      // Try to use War3OverlayRenderer if available
      if (window.War3OverlayRenderer) {
        console.log('🎯 Using War3OverlayRenderer for WC3 fullscreen overlays');
        try {
          // Create a canvas element for the overlay
          const canvas = document.createElement('canvas');
          canvas.id = `wc3-fullscreen-canvas-${map._id}`;
          canvas.className = 'wc3-fullscreen-canvas';
          
          // Position canvas absolutely over the image
          // Since the image has transform: scale(1.2), we need to account for this
          canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: auto;
            z-index: 20010;
            cursor: default;
          `;
          
          // Wait for the image to be fully rendered and positioned, then set canvas dimensions
          // to match the actual displayed size of the image
          const waitForCanvasDimensions = () => {
            return new Promise((resolve) => {
              const updateCanvasDimensions = () => {
                const imgRect = img.getBoundingClientRect();const computedStyle = window.getComputedStyle(img);
                const transform = computedStyle.transform;
                
                // Check if image has proper dimensions and transform is applied
                if (imgRect.width > 0 && imgRect.height > 0 && transform !== 'none') {
                  canvas.width = imgRect.width;
                  canvas.height = imgRect.height;
                  console.log('🧪 DEBUG: Canvas dimensions updated to match displayed image:', canvas.width, 'x', canvas.height);
                  console.log('🧪 DEBUG: Image transform applied:', transform);
                  resolve(); // Resolve the promise when dimensions are set
                } else {
                  console.log('🧪 DEBUG: Image not yet positioned or transform not applied, retrying...');
                  console.log('🧪 DEBUG: Image rect:', imgRect);
                  console.log('🧪 DEBUG: Image transform:', transform);
                  setTimeout(updateCanvasDimensions, 100); // Increased delay for better reliability
                }
              };
              
              // Start the dimension update process
              updateCanvasDimensions();
            });
          };
          
          console.log('🧪 DEBUG: Canvas positioned with 100% dimensions to match container');
          
          // Add canvas to the image container
          imageContainer.appendChild(canvas);
          
          // Wait for image to be fully loaded and positioned
          console.log('⏳ Waiting for image to be fully loaded and positioned...');
          if (!img.complete) {
            console.log('⏳ Image not yet loaded, waiting...');
            await new Promise((resolve) => {
              img.onload = resolve;
            });
            console.log('✅ Image fully loaded');
          }
          
          // Wait for canvas dimensions to be properly set before proceeding
          console.log('⏳ Waiting for canvas dimensions to be set...');
          await waitForCanvasDimensions();
          console.log('✅ Canvas dimensions are now properly set');
          
          // Final verification: ensure canvas is properly positioned and sized
          const finalCanvasRect = canvas.getBoundingClientRect();
          const finalImgRect = img.getBoundingClientRect();
          
          if (finalCanvasRect.width === 0 || finalCanvasRect.height === 0) {
            throw new Error('Canvas dimensions are still 0 after waiting - positioning failed');
          }
          
          console.log('🎯 Final verification - Canvas:', finalCanvasRect);
          console.log('🎯 Final verification - Image:', finalImgRect);
          console.log('🎯 Canvas internal dimensions:', canvas.width, 'x', canvas.height);
          
          // DEBUG: Verify canvas is properly positioned and visible
          console.log('🧪 DEBUG: Canvas added to image container');
          console.log('🧪 DEBUG: Canvas element:', canvas);
          console.log('🧪 DEBUG: Canvas style:', canvas.style.cssText);
          console.log('🧪 DEBUG: Canvas dimensions:', canvas.width, 'x', canvas.height);
          console.log('🧪 DEBUG: Canvas position:', canvas.getBoundingClientRect());
          console.log('🧪 DEBUG: Image container dimensions:', imageContainer.getBoundingClientRect());
          console.log('🧪 DEBUG: Image dimensions:', img.getBoundingClientRect());
          
          // Create renderer and render overlay
          const renderer = new window.War3OverlayRenderer();
          await renderer.renderOverlay(canvas.id, map);
          console.log('✅ War3OverlayRenderer overlays created successfully');
          
          // Add hover tooltips immediately after overlay is rendered
          console.log('🎯 Adding hover tooltips to fullscreen canvas:', canvas.id);
          console.log('🎯 Canvas dimensions:', canvas.width, 'x', canvas.height);
          console.log('🎯 Canvas style:', canvas.style.cssText);
          console.log('🎯 Canvas position:', canvas.getBoundingClientRect());
          
          renderer.addHoverTooltips(canvas.id, map);
          console.log('✅ Hover tooltips added to fullscreen overlay');
          
          // Test tooltip functionality
          setTimeout(() => {
            console.log('🧪 Testing tooltip system...');
            console.log('🧪 Canvas element:', canvas);
            console.log('🧪 Canvas event listeners:', canvas._tooltipHandlers);
            console.log('🧪 Tooltip element:', document.querySelector(`[data-canvas-id="${canvas.id}"]`));
            
            // Add a simple test event listener to verify mouse events work
            canvas.addEventListener('click', (e) => {
              console.log('🧪 Canvas click detected at:', e.clientX, e.clientY);
              console.log('🧪 Canvas bounds:', canvas.getBoundingClientRect());
            });
            
            // Test if the canvas is receiving mouse events
            canvas.addEventListener('mousemove', (e) => {
              console.log('🧪 Canvas mousemove detected at:', e.clientX, e.clientY);
            });
          }, 1000);
        } catch (error) {
          console.error('❌ War3OverlayRenderer failed:', error);
          this.createFallbackWC3Overlays(imageContainer, map);
        }
      } else {
        console.log('⚠️ War3OverlayRenderer not available, using fallback overlays');
        this.createFallbackWC3Overlays(imageContainer, map);
      }
    });

    console.log('✅ WC3 fullscreen modal opened with proper overlay system');
  }

  /**
   * Create fallback WC3 overlays if War3OverlayRenderer is not available
   */
  createFallbackWC3Overlays(container, map) {
    console.log('🔄 Creating fallback WC3 overlays');
    
    // Create overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'strategic-overlays';
    overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 20010;
    `;
    
    // Add goldmine overlays
    if (map.goldmines && map.goldmines.length > 0) {
      console.log(`🎯 Adding ${map.goldmines.length} goldmine overlays`);
      map.goldmines.forEach((goldmine, index) => {
        const goldmineOverlay = document.createElement('div');
        goldmineOverlay.className = 'enhanced-goldmine-overlay';
        goldmineOverlay.style.cssText = `
          position: absolute;
          width: 20px;
          height: 20px;
          background: rgba(255, 215, 0, 0.8);
          border: 2px solid #FFD700;
          border-radius: 50%;
          left: ${(index * 30) % 200}px;
          top: ${(index * 25) % 150}px;
          z-index: 20015;
        `;
        goldmineOverlay.title = `Goldmine ${index + 1}`;
        overlayContainer.appendChild(goldmineOverlay);
      });
    }
    
    // Add starting position overlays
    if (map.startingLocations && map.startingLocations.length > 0) {
      console.log(`🎯 Adding ${map.startingLocations.length} starting position overlays`);
      map.startingLocations.forEach((position, index) => {
        const positionOverlay = document.createElement('div');
        positionOverlay.className = 'enhanced-starting-position-overlay';
        positionOverlay.style.cssText = `
          position: absolute;
          width: 30px;
          height: 20px;
          background: rgba(135, 206, 235, 0.8);
          border: 2px solid #87CEEB;
          border-radius: 4px;
          left: ${(index * 40) % 180}px;
          top: ${(index * 35) % 120}px;
          z-index: 20015;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        `;
        positionOverlay.textContent = `P${index + 1}`;
        positionOverlay.title = `Player ${index + 1} Start`;
        overlayContainer.appendChild(positionOverlay);
      });
    }
    
    // Add debug info
    const debugElement = document.createElement('div');
    debugElement.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 255, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 20030;
      font-size: 12px;
      max-width: 200px;
    `;
    debugElement.innerHTML = `
      <strong>WC3 Fullscreen Fallback</strong><br>
      Goldmines: ${map.goldmines?.length || 0}<br>
      Start Positions: ${map.startingLocations?.length || 0}<br>
      Map: ${map.name || 'Unknown'}<br>
      <small>Using fallback overlay system</small>
    `;
    overlayContainer.appendChild(debugElement);
    
    container.appendChild(overlayContainer);
    console.log('✅ Fallback WC3 overlays created successfully');
  }

  /**
   * Show WC2 fullscreen image with enhanced modal and overlays
   */
  showWC2FullscreenImage(map) {
    console.log('🖼️ Opening WC2 fullscreen image with enhanced modal');
    
    // Extract map information
    const mapId = map._id || map.id;
    const mapName = map.name || 'Unknown Map';
    const thumbnailPath = map.thumbnailPath || `/uploads/war2images/${map.filename?.replace('.pud', '.png')}` || '/uploads/thumbnails/default-map.png';
    
    // Remove any existing WC2 fullscreen modal
    const existingModal = document.querySelector('.wc2-fullscreen-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create WC2 fullscreen modal
    const modal = document.createElement('div');
    modal.className = 'wc2-fullscreen-modal';

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'wc2-fullscreen-container fullscreen-image-container';

    // Create close button
    const closeButton = document.createElement('span');
    closeButton.id = 'close-wc2-fullscreen';
    closeButton.innerHTML = '×';

    // Create image
    const img = document.createElement('img');
    img.className = 'wc2-fullscreen-image';
    img.alt = mapName;
    img.src = thumbnailPath;

    // Assemble the modal
    imageContainer.appendChild(img);
    modal.appendChild(closeButton);
    modal.appendChild(imageContainer);
    document.body.appendChild(modal);

    // Add overlays if map data is available using MapDetails logic
    if (map.strategicData || map.strategicAnalysis) {
      const createOverlays = (attempts = 0) => {
        const maxAttempts = 20; // Max 2 seconds of retries
        
        // Wait for layout to stabilize and ensure image dimensions are available
        setTimeout(() => {
          // Check if modal is still open and image has proper dimensions
          const modalStillOpen = modal.classList.contains('show') && modal.parentNode;
          if (!modalStillOpen) {
            console.log('🚫 Modal closed, skipping overlay creation');
            return;}
          
          if (img.offsetWidth > 0 && img.offsetHeight > 0 && img.complete) {
            console.log('✅ Creating WC2 overlays with dimensions:', img.offsetWidth, 'x', img.offsetHeight);
            
            // Use MapDetails createEnhancedOverlays if available, otherwise fallback to local version
            if (window.mapDetails && typeof window.mapDetails.createEnhancedOverlays === 'function') {
              console.log('✅ Using MapDetails createEnhancedOverlays for consistent overlay logic...');
              window.mapDetails.createEnhancedOverlays(imageContainer, img, map);
            } else {
              console.log('⚠️ MapDetails not available, using fallback overlay creation...');
              this.createEnhancedOverlays(imageContainer, img, map, true); // true for fullscreen
            }
          } else if (attempts < maxAttempts) {
            // Retry if image dimensions aren't ready yet
            console.log(`🔄 Retrying WC2 overlay creation (attempt ${attempts + 1}/${maxAttempts})`);
            createOverlays(attempts + 1);
          } else {
            console.warn('❌ Failed to create WC2 overlays after max attempts');
          }
        }, attempts === 0 ? 250 : 100); // Longer initial delay, shorter retries
      };
      
      if (img.complete && img.naturalHeight !== 0) {
        createOverlays();
      } else {
        img.onload = createOverlays;
      }
    }

    // Show modal with animation
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Close modal functions
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal && modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    };

    // Event listeners for closing
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Escape key listener
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Cleanup on close
    modal.addEventListener('transitionend', () => {
      if (!modal.classList.contains('show')) {
        document.removeEventListener('keydown', handleEscape);
      }
    });
  }

  /**
   * Initialize War3 overlay system for fullscreen
   */
  async initializeWar3FullscreenOverlay(mapData) {
    try {
      console.log('🎨 Initializing War3 fullscreen overlay system...');
      console.log('🎮 Current game in overlay init:', this.getCurrentGame());
      console.log('📊 Map data in overlay init:', mapData);
      
      // Initialize overlay renderer if not already done
      if (!window.war3OverlayRenderer) {
        window.war3OverlayRenderer = new War3OverlayRenderer();
      }
      
      const renderer = window.war3OverlayRenderer;
      const canvasId = 'war3-fullscreen-canvas';
      
      // Wait a bit for DOM to be ready
      setTimeout(async () => {
        try {
          console.log('🎨 Checking if canvas exists:', document.getElementById(canvasId));
          console.log('🎨 Canvas element:', document.getElementById(canvasId));
          
          // Initial render with overlay enabled
          console.log('🎨 Calling renderer.renderOverlay...');
          await renderer.renderOverlay(canvasId, mapData, true);
          console.log('🎨 renderOverlay completed successfully');
          
          // Add hover tooltips
          console.log('🎨 Adding hover tooltips...');
          renderer.addHoverTooltips(canvasId, mapData);
          console.log('🎨 Hover tooltips added');
          
          // Set up overlay toggle
          const overlayToggle = document.getElementById('fullscreen-overlay-toggle');
          if (overlayToggle) {
            overlayToggle.addEventListener('change', async (e) => {
              const showOverlay = e.target.checked;
              console.log(`🎨 Fullscreen overlay toggle: ${showOverlay ? 'ON' : 'OFF'}`);
              await renderer.renderOverlay(canvasId, mapData, showOverlay);
              
              // Re-add tooltips after re-render
              if (showOverlay) {
                renderer.addHoverTooltips(canvasId, mapData);
              }
            });
          }
          
          console.log('✅ War3 fullscreen overlay system initialized');
        } catch (error) {
          console.error('❌ Error in delayed fullscreen overlay initialization:', error);
          console.error('❌ Error details:', error.stack);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error initializing War3 fullscreen overlay:', error);
    }
  }

  /**
   * Create enhanced overlays for fullscreen (same as MapDetails)
   */
  createEnhancedOverlays(container, mapImage, map) {
    if (!container || !mapImage) {
      console.warn('❌ Missing container or image for overlays');
      return;}

    const strategicData = map.strategicData || map.strategicAnalysis || {};
    
    // Remove existing overlays
    const existingOverlays = container.querySelectorAll('.enhanced-strategic-overlays');
    existingOverlays.forEach(overlay => overlay.remove());

    // Create overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'enhanced-strategic-overlays';
    container.appendChild(overlayContainer);

    // Enhanced image dimension calculation for different contexts
    let imageWidth, imageHeight;
    const imageRect = mapImage.getBoundingClientRect();
    
    // Determine display context and calculate proper dimensions
    const isFullscreen = container.classList.contains('fullscreen-image-container') || 
                        container.classList.contains('wc3-fullscreen-container') ||
                        container.classList.contains('wc2-fullscreen-container');
    
    if (isFullscreen) {
      // For fullscreen: use natural dimensions scaled to container
      const naturalAspect = mapImage.naturalWidth / mapImage.naturalHeight;
      const containerWidth = imageRect.width || mapImage.offsetWidth;
      const containerHeight = imageRect.height || mapImage.offsetHeight;
      
      // Calculate effective display dimensions respecting aspect ratio
      if (containerWidth / containerHeight > naturalAspect) {
        // Height is limiting factor
        imageHeight = containerHeight;
        imageWidth = containerHeight * naturalAspect;
      } else {
        // Width is limiting factor  
        imageWidth = containerWidth;
        imageHeight = containerWidth / naturalAspect;
      }
      
      console.log('🖼️ Fullscreen dimensions calculated:', {
        container: { width: containerWidth, height: containerHeight },
        natural: { width: mapImage.naturalWidth, height: mapImage.naturalHeight, aspect: naturalAspect },
        calculated: { width: imageWidth, height: imageHeight }
      });
    } else {
      // For map details or other contexts: use offset dimensions
      imageWidth = mapImage.offsetWidth || imageRect.width;
      imageHeight = mapImage.offsetHeight || imageRect.height;
      
      console.log('📱 Standard dimensions used:', { imageWidth, imageHeight });
    }
    
    // Get actual map dimensions from strategic data, with fallbacks
    // Handle both new object format {width: 64, height: 64} and old string format "64x64"
    let mapWidth, mapHeight;
    
    if (strategicData.mapSize?.width) {
      // New object format
      mapWidth = strategicData.mapSize.width;
      mapHeight = strategicData.mapSize.height;
    } else if (typeof strategicData.mapSize === 'string') {
      // Old string format "64x64"
      const dimensions = strategicData.mapSize.split('x').map(d => parseInt(d));
      mapWidth = dimensions[0] || 128;
      mapHeight = dimensions[1] || 128;
    } else {
      // Fallbacks
      mapWidth = map.dimensions?.width || (strategicData.totalTiles ? Math.sqrt(strategicData.totalTiles) : 128);
      mapHeight = map.dimensions?.height || (strategicData.totalTiles ? Math.sqrt(strategicData.totalTiles) : 128);
    }
    
    console.log('📍 Enhanced overlay positioning Debug:', { 
      imageWidth, 
      imageHeight, 
      mapWidth, 
      mapHeight,
      context: isFullscreen ? 'fullscreen' : 'other',
      mapDimensions: map.dimensions,
      mapSizeFromStrategic: strategicData.mapSize,
      totalTiles: strategicData.totalTiles,
      goldmineCount: strategicData.goldmines?.length || 0,
      startingPositionCount: strategicData.startingPositions?.length || 0,
      containerInfo: {
        containerClass: container.className,
        containerId: container.id,
        hasFullscreenImage: !!container.querySelector('.fullscreen-image'),
        containerRect: container.getBoundingClientRect()
      }
    });
    
    // Calculate actual coordinate bounds from the data (similar to War3 system)
    const coordinateBounds = this.calculateWar2CoordinateBounds(strategicData);
    console.log('🗺️ Calculated coordinate bounds:', coordinateBounds);
    
    // Call comprehensive debugging
    this.debugOverlayPositioning(container, map, isFullscreen);
    
    // Debug coordinate ranges in the strategic data
    if (strategicData.goldmines && strategicData.goldmines.length > 0) {
      const goldmineCoords = strategicData.goldmines.map(gm => ({ x: gm.x, y: gm.y }));
      const xCoords = goldmineCoords.map(c => c.x);
      const yCoords = goldmineCoords.map(c => c.y);
      console.log('🔍 Goldmine coordinate analysis:', {
        count: goldmineCoords.length,
        xRange: { min: Math.min(...xCoords), max: Math.max(...xCoords) },
        yRange: { min: Math.min(...yCoords), max: Math.max(...yCoords) },
        sample: goldmineCoords.slice(0, 3)
      });
    }
    
    if (strategicData.startingPositions && strategicData.startingPositions.length > 0) {
      const positionCoords = strategicData.startingPositions.map(sp => ({ x: sp.x, y: sp.y }));
      const xCoords = positionCoords.map(c => c.x);
      const yCoords = positionCoords.map(c => c.y);
      console.log('🔍 Starting position coordinate analysis:', {
        count: positionCoords.length,
        xRange: { min: Math.min(...xCoords), max: Math.max(...xCoords) },
        yRange: { min: Math.min(...yCoords), max: Math.max(...yCoords) },
        sample: positionCoords.slice(0, 3)
      });
    }

    // Only proceed if we have valid dimensions
    if (!imageWidth || !imageHeight || imageWidth === 0 || imageHeight === 0) {
      console.warn('❌ Invalid image dimensions, skipping overlay creation');
      return;}

    // Create goldmine overlays
    if (strategicData.goldmines && Array.isArray(strategicData.goldmines)) {
      strategicData.goldmines.forEach((goldmine, index) => {
        this.createGoldmineOverlay(overlayContainer, goldmine, index, imageWidth, imageHeight, mapWidth, mapHeight, isFullscreen, coordinateBounds, mapImage);
      });
    }

    // Create starting position overlays  
    if (strategicData.startingPositions && Array.isArray(strategicData.startingPositions)) {
      strategicData.startingPositions.forEach((position, index) => {
        this.createStartingPositionOverlay(overlayContainer, position, index, imageWidth, imageHeight, mapWidth, mapHeight, isFullscreen, coordinateBounds, mapImage);
      });
    }

    // IMPORTANT: For War2 maps, we DON'T create any additional tooltip areas 
    // beyond the overlays themselves, since the new system attaches tooltips directly to overlays.
    // This prevents white circle tooltip areas from appearing.

    console.log(`✅ Created overlays with integrated tooltips: ${strategicData.goldmines?.length || 0} goldmines, ${strategicData.startingPositions?.length || 0} positions`);
  }

  /**
   * Show War2-specific tooltip
   */
  showWar2Tooltip(event, data, type) {
    console.log('🎯 MapsGrid Creating War2 tooltip:', type, data);
    this.hideWar2Tooltip(); // Remove any existing tooltip

    const tooltip = document.createElement('div');
    tooltip.className = 'war2-tooltip';
    
    // Use much higher z-index for fullscreen mode
    const isInFullscreen = document.querySelector('#fullscreen-modal-enhanced.show') !== null || 
                          document.querySelector('.wc2-fullscreen-modal.show') !== null ||
                          document.querySelector('.wc3-fullscreen-modal.show') !== null;
    const zIndex = isInFullscreen ? 100000 : 10000;
    
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: ${zIndex};
      max-width: 200px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      font-family: Arial, sans-serif;
    `;
    
    console.log('🎯 MapsGrid Tooltip z-index set to:', zIndex, 'Fullscreen detected:', isInFullscreen);

    let tooltipContent = '';
    if (type === 'goldmine') {
      const goldFormatted = data.gold ? data.gold.toLocaleString() : '0';
      tooltipContent = `
        <div class="tooltip-title goldmine">${data.name}</div>
        <div class="tooltip-content">Gold: ${goldFormatted}</div>
        <div class="tooltip-content">Category: ${data.category}</div>
        <div class="tooltip-location">Location: ${data.location}</div>
      `;
    } else if (type === 'player') {
      tooltipContent = `
        <div class="tooltip-title player">${data.name}</div>
        <div class="tooltip-content">Race: ${data.race}</div>
        <div class="tooltip-location">Location: ${data.location}</div>
      `;
    }

    tooltip.innerHTML = tooltipContent;
    document.body.appendChild(tooltip);

    // Position tooltip near cursor but avoid screen edges
    const x = event.clientX + 15;
    const y = event.clientY - 40;
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    
    console.log('🎯 MapsGrid Tooltip positioned at:', x, y, 'Content:', tooltipContent.replace(/<[^>]*>/g, '').trim());

    // Store reference for cleanup
    this._war2Tooltip = tooltip;
  }

  /**
   * Hide War2-specific tooltip
   */
  hideWar2Tooltip() {
    if (this._war2Tooltip) {
      this._war2Tooltip.remove();
      this._war2Tooltip = null;
    }
  }

  /**
   * Calculate coordinate bounds from War2 strategic data
   */
  calculateWar2CoordinateBounds(strategicData) {
    const allCoordinates = [];

    // Collect all coordinates from goldmines and starting positions
    if (strategicData.goldmines) {
      strategicData.goldmines.forEach(item => {
        if (item.x !== undefined && item.y !== undefined) {
          allCoordinates.push({ x: item.x, y: item.y });
        }
      });
    }

    if (strategicData.startingPositions) {
      strategicData.startingPositions.forEach(item => {
        if (item.x !== undefined && item.y !== undefined) {
          allCoordinates.push({ x: item.x, y: item.y });
        }
      });
    }

    if (allCoordinates.length === 0) {
      // Fallback to traditional map size if no coordinates found
      return {
        minX: 0,
        maxX: 128,
        minY: 0,
        maxY: 128
      };}

    const xs = allCoordinates.map(c => c.x);
    const ys = allCoordinates.map(c => c.y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };}

  /**
   * Transform War2 coordinates to screen percentages using actual coordinate bounds
   */
  transformWar2Coordinates(worldX, worldY, coordinateBounds) {
    // Add 10% padding to bounds to ensure everything fits
    const xRange = coordinateBounds.maxX - coordinateBounds.minX;
    const yRange = coordinateBounds.maxY - coordinateBounds.minY;
    const xPadding = xRange * 0.1;
    const yPadding = yRange * 0.1;
    
    const paddedBounds = {
      minX: coordinateBounds.minX - xPadding,
      maxX: coordinateBounds.maxX + xPadding,
      minY: coordinateBounds.minY - yPadding,
      maxY: coordinateBounds.maxY + yPadding
    };

    // Convert to 0-1 range using actual coordinate bounds
    const normalizedX = (worldX - paddedBounds.minX) / (paddedBounds.maxX - paddedBounds.minX);
    const normalizedY = (worldY - paddedBounds.minY) / (paddedBounds.maxY - paddedBounds.minY); // War2 Y=0 is TOP, no flip needed!
    
    // Convert to percentages
    const leftPercent = normalizedX * 100;
    const topPercent = normalizedY * 100;
    
    console.log(`🗺️ War2 Transform: world(${worldX}, ${worldY}) → normalized(${normalizedX.toFixed(3)}, ${normalizedY.toFixed(3)}) → percent(${leftPercent.toFixed(1)}%, ${topPercent.toFixed(1)}%)`);
    
    return { leftPercent, topPercent };}

  /**
   * Create goldmine overlay element (same as MapDetails)
   */
  createGoldmineOverlay(container, goldmine, index, imageWidth, imageHeight, mapWidth = 128, mapHeight = 128, isFullscreen = false, coordinateBounds = null, mapImage = null) {
    const overlay = document.createElement('div');
    overlay.className = 'enhanced-goldmine-overlay';
    
    // Debug War2 coordinate system
    console.log(`🔍 War2 Goldmine ${index + 1} Debug:`, {
      coordinates: { x: goldmine.x, y: goldmine.y },
      mapDimensions: { width: mapWidth, height: mapHeight },
      imageDimensions: { width: imageWidth, height: imageHeight },
      isFullscreen: isFullscreen,
      hasCoordinateBounds: !!coordinateBounds,
      coordinateBounds: coordinateBounds
    });
    
    // War2 coordinate transformation - appears to use 0-128 range, not negative coords
    let leftPercent, topPercent;
    
    // Debug the coordinate ranges we're working with
    console.log(`🔍 War2 Goldmine coords: (${goldmine.x}, ${goldmine.y}), bounds: X(${coordinateBounds?.minX}, ${coordinateBounds?.maxX}) Y(${coordinateBounds?.minY}, ${coordinateBounds?.maxY})`);
    
    if (coordinateBounds && (coordinateBounds.maxX > 128 || coordinateBounds.minX < 0)) {
      // Use bounds-based transformation for maps with extended coordinate ranges
      const transformed = this.transformWar2Coordinates(goldmine.x, goldmine.y, coordinateBounds);
      leftPercent = transformed.leftPercent;
      topPercent = transformed.topPercent;
      console.log(`📍 War2 Goldmine bounds-based (${isFullscreen ? 'fullscreen' : 'detail'}): leftPercent=${leftPercent.toFixed(1)}%, topPercent=${topPercent.toFixed(1)}%`);
    } else {
      // Use actual map dimensions instead of assuming 128x128
      leftPercent = (goldmine.x / mapWidth) * 100;
      topPercent = (goldmine.y / mapHeight) * 100; // War2 Y=0 is TOP, no flip needed!
      console.log(`📍 War2 Goldmine standard (${isFullscreen ? 'fullscreen' : 'detail'}): leftPercent=${leftPercent.toFixed(1)}%, topPercent=${topPercent.toFixed(1)}% [using mapSize ${mapWidth}x${mapHeight}] - NO Y-FLIP`);
    }
    
    // FIXED: Improved positioning for fullscreen mode using passed mapImage
    if (isFullscreen && mapImage) {
      // Get the actual displayed image dimensions and position
      const imageRect = mapImage.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate the image's actual display area within the container
      const imageDisplayWidth = imageRect.width;
      const imageDisplayHeight = imageRect.height;
      
      // Calculate the image's offset within the container
      const imageOffsetX = imageRect.left - containerRect.left;
      const imageOffsetY = imageRect.top - containerRect.top;
      
      // Convert map coordinates to pixels within the actual displayed image
      const leftPx = (leftPercent / 100) * imageDisplayWidth;
      const topPx = (topPercent / 100) * imageDisplayHeight;
      
      // Add the image's offset position within the container
      const absoluteLeftPx = leftPx + imageOffsetX;
      const absoluteTopPx = topPx + imageOffsetY;
      
      // Convert to percentage of container size
      leftPercent = (absoluteLeftPx / containerRect.width) * 100;
      topPercent = (absoluteTopPx / containerRect.height) * 100;
      
      console.log('🎯 War2 Fullscreen overlay adjustment (FIXED):', {
        originalCoords: { x: goldmine.x, y: goldmine.y },
        originalPercent: { left: (goldmine.x / mapWidth) * 100, top: (goldmine.y / mapHeight) * 100 },
        imageDisplay: { width: imageDisplayWidth, height: imageDisplayHeight },
        imageOffset: { x: imageOffsetX, y: imageOffsetY },
        containerRect: { width: containerRect.width, height: containerRect.height },
        adjustedPercent: { left: leftPercent, top: topPercent },
        mapDimensions: { width: mapWidth, height: mapHeight }
      });
    }
    
    // Handle different field names for gold amount
    const goldAmount = goldmine.amount || goldmine.gold || goldmine.goldAmount || 0;
    const goldColor = this.getGoldmineColor(goldAmount);
    
    // Calculate size based on image size for better scaling
    const baseSize = isFullscreen ? 
      Math.max(16, Math.min(imageWidth, imageHeight) * 0.02) : 
      Math.max(20, Math.min(imageWidth, imageHeight) * 0.04); // Larger for details view
    
    console.log('🎯 MapsGrid Goldmine overlay size calculated:', { baseSize, isFullscreen, imageWidth, imageHeight });
    
    // Style the overlay with vibrant colors
    overlay.style.cssText = `
      position: absolute;
      left: ${leftPercent}%;
      top: ${topPercent}%;
      width: ${baseSize}px;
      height: ${baseSize}px;
      background-color: ${goldColor} !important;
      border: 3px solid #000000 !important;
      box-shadow: 0 0 15px ${goldColor} !important;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      cursor: pointer;
      z-index: 1000;
      transition: all 0.2s ease;
      
    `;

    // Add hover effects with War2-specific tooltip data
    overlay.addEventListener('mouseenter', (e) => {
      console.log('🏆 MapsGrid Goldmine hover ENTERED:', goldmine.x, goldmine.y, 'fullscreen:', isFullscreen);
      const goldAmount = goldmine.amount || goldmine.gold || goldmine.goldAmount || 0;
      const tooltipData = {
        name: `Goldmine`,
        gold: goldAmount,
        location: `(${goldmine.x}, ${goldmine.y})`,
        category: this.getGoldmineCategory(goldAmount)
      };
      this.showWar2Tooltip(e, tooltipData, 'goldmine');
      overlay.style.transform = 'translate(-50%, -50%) scale(1.6)';
      overlay.style.boxShadow = `0 0 25px ${goldColor}`;
    });

    overlay.addEventListener('mouseleave', () => {
      console.log('🏆 MapsGrid Goldmine hover LEFT:', goldmine.x, goldmine.y, 'fullscreen:', isFullscreen);
      this.hideWar2Tooltip();
      overlay.style.transform = 'translate(-50%, -50%) scale(1)';
      overlay.style.boxShadow = `0 0 15px ${goldColor}`;
    });

    container.appendChild(overlay);
  }

  /**
   * Create starting position overlay element (same as MapDetails)
   */
  createStartingPositionOverlay(container, position, index, imageWidth, imageHeight, mapWidth = 128, mapHeight = 128, isFullscreen = false, coordinateBounds = null, mapImage = null) {
    const overlay = document.createElement('div');
    overlay.className = 'enhanced-starting-position-overlay';
    
    // Debug War2 coordinate system
    console.log(`🔍 War2 Starting Position ${index + 1} Debug:`, {
      coordinates: { x: position.x, y: position.y },
      mapDimensions: { width: mapWidth, height: mapHeight },
      imageDimensions: { width: imageWidth, height: imageHeight },
      isFullscreen: isFullscreen,
      hasCoordinateBounds: !!coordinateBounds,
      coordinateBounds: coordinateBounds
    });
    
    // War2 coordinate transformation - appears to use 0-128 range, not negative coords
    let leftPercent, topPercent;
    
    // Debug the coordinate ranges we're working with
    console.log(`🔍 War2 Position coords: (${position.x}, ${position.y}), bounds: X(${coordinateBounds?.minX}, ${coordinateBounds?.maxX}) Y(${coordinateBounds?.minY}, ${coordinateBounds?.maxY})`);
    
    if (coordinateBounds && (coordinateBounds.maxX > 128 || coordinateBounds.minX < 0)) {
      // Use bounds-based transformation for maps with extended coordinate ranges
      const transformed = this.transformWar2Coordinates(position.x, position.y, coordinateBounds);
      leftPercent = transformed.leftPercent;
      topPercent = transformed.topPercent;
      console.log(`📍 War2 Position bounds-based (${isFullscreen ? 'fullscreen' : 'detail'}): leftPercent=${leftPercent.toFixed(1)}%, topPercent=${topPercent.toFixed(1)}%`);
    } else {
      // Use actual map dimensions instead of assuming 128x128
      leftPercent = (position.x / mapWidth) * 100;
      topPercent = (position.y / mapHeight) * 100; // War2 Y=0 is TOP, no flip needed!
      console.log(`📍 War2 Position standard (${isFullscreen ? 'fullscreen' : 'detail'}): leftPercent=${leftPercent.toFixed(1)}%, topPercent=${topPercent.toFixed(1)}% [using mapSize ${mapWidth}x${mapHeight}] - NO Y-FLIP`);
    }
    
    // FIXED: Improved positioning for fullscreen mode using passed mapImage
    if (isFullscreen && mapImage) {
      // Get the actual displayed image dimensions and position
      const imageRect = mapImage.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate the image's actual display area within the container
      const imageDisplayWidth = imageRect.width;
      const imageDisplayHeight = imageRect.height;
      
      // Calculate the image's offset within the container
      const imageOffsetX = imageRect.left - containerRect.left;
      const imageOffsetY = imageRect.top - containerRect.top;
      
      // Convert map coordinates to pixels within the actual displayed image
      const leftPx = (leftPercent / 100) * imageDisplayWidth;
      const topPx = (topPercent / 100) * imageDisplayHeight;
      
      // Add the image's offset position within the container
      const absoluteLeftPx = leftPx + imageOffsetX;
      const absoluteTopPx = topPx + imageOffsetY;
      
      // Convert to percentage of container size
      leftPercent = (absoluteLeftPx / containerRect.width) * 100;
      topPercent = (absoluteTopPx / containerRect.height) * 100;
      
      console.log('🎯 Fullscreen position overlay adjustment (FIXED):', {
        originalPercent: { left: (position.x / mapWidth) * 100, top: (position.y / mapHeight) * 100 },
        imageDisplay: { width: imageDisplayWidth, height: imageDisplayHeight },
        imageOffset: { x: imageOffsetX, y: imageOffsetY },
        containerRect: { width: containerRect.width, height: containerRect.height },
        adjustedPercent: { left: leftPercent, top: topPercent }
      });
    }
    
    const playerColor = this.getPlayerColor(position.race || 'unknown');
    
    // Calculate size based on image size for better scaling
    const baseSize = isFullscreen ? 
      Math.max(18, Math.min(imageWidth, imageHeight) * 0.025) : 
      Math.max(24, Math.min(imageWidth, imageHeight) * 0.05); // Larger for details view
    const fontSize = Math.max(10, baseSize * 0.6);
    
    console.log('🎯 MapsGrid Player position overlay size calculated:', { baseSize, fontSize, isFullscreen, imageWidth, imageHeight });
    
    // Style the overlay with vibrant colors
    overlay.style.cssText = `
      position: absolute;
      left: ${leftPercent}%;
      top: ${topPercent}%;
      width: ${baseSize}px;
      height: ${baseSize}px;
      background-color: ${playerColor} !important;
      border: 3px solid #000000 !important;
      box-shadow: 0 0 15px ${playerColor} !important;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      cursor: pointer;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${fontSize}px;
      color: #FFFFFF !important;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9) !important;
      transition: all 0.2s ease;
      
    `;
    
    overlay.textContent = (index + 1).toString();
    
    // Add hover effects with War2-specific tooltip data
    overlay.addEventListener('mouseenter', (e) => {
      const tooltipData = {
        name: `Player ${index + 1} Start`,
        race: this.formatRace(position.race || 'unknown'),
        location: `(${position.x}, ${position.y})`,
        player: index + 1
      };
      this.showWar2Tooltip(e, tooltipData, 'player');
      overlay.style.transform = 'translate(-50%, -50%) scale(1.4)';
      overlay.style.boxShadow = `0 0 25px ${playerColor}`;
    });

    overlay.addEventListener('mouseleave', () => {
      this.hideWar2Tooltip();
      overlay.style.transform = 'translate(-50%, -50%) scale(1)';
      overlay.style.boxShadow = `0 0 15px ${playerColor}`;
    });

    container.appendChild(overlay);
  }

  /**
   * Enhanced debugging for overlay positioning issues
   */
  debugOverlayPositioning(container, mapData, isFullscreen = false) {
    console.log('🔍 === OVERLAY POSITIONING DEBUG ===');
    console.log('📊 Map Data:', {
      id: mapData.id,
      name: mapData.name,
      game: mapData.game,
      width: mapData.width,
      height: mapData.height,
      strategicData: mapData.strategicData
    });
    
    console.log('🎯 Container Info:', {
      className: container.className,
      id: container.id,
      isFullscreen: isFullscreen,
      containerRect: container.getBoundingClientRect()
    });
    
    if (isFullscreen) {
      const imageElement = container.querySelector('.fullscreen-image');
      if (imageElement) {
        const imageRect = imageElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        console.log('🖼️ Fullscreen Image Analysis:', {
          imageElement: {
            className: imageElement.className,
            naturalWidth: imageElement.naturalWidth,
            naturalHeight: imageElement.naturalHeight,
            rect: {
              width: imageRect.width,
              height: imageRect.height,
              left: imageRect.left,
              top: imageRect.top
            }
          },
          containerRect: {
            width: containerRect.width,
            height: containerRect.height,
            left: containerRect.left,
            top: containerRect.top
          },
          imageOffset: {
            x: imageRect.left - containerRect.left,
            y: imageRect.top - containerRect.top
          },
          scaling: {
            widthRatio: imageRect.width / imageElement.naturalWidth,
            heightRatio: imageRect.height / imageElement.naturalHeight
          }
        });
      } else {
        console.log('❌ No .fullscreen-image element found in container');
      }
    }
    
    // Check for strategic data
    const strategicData = mapData.strategicData;
    if (strategicData) {
      console.log('🗺️ Strategic Data Analysis:', {
        goldmines: strategicData.goldmines?.map(g => ({ x: g.x, y: g.y, amount: g.amount || g.gold || g.goldAmount })) || [],
        startingPositions: strategicData.startingPositions?.map(p => ({ x: p.x, y: p.y, race: p.race })) || [],
        totalTiles: strategicData.totalTiles,
        coordinateBounds: strategicData.coordinateBounds
      });
    }
    
    console.log('🔍 === END DEBUG ===');
  }

  /**
   * Get goldmine color based on amount (same as MapDetails)
   */
  getGoldmineColor(amount) {
    if (amount >= 300000) return '#FF0080';if (amount >= 200000) return '#FFD700';if (amount >= 100000) return '#FF4500';if (amount >= 50000) return '#00FFFF';if (amount >= 25000) return '#FF69B4';return '#FF0080';}

  /**
   * Get player color based on race (same as MapDetails)
   */
  getPlayerColor(race) {
    const raceColors = {
      'human': '#0080FF',    // Bright blue
      'orc': '#FF0040',      // Bright red  
      'unknown': '#00FF80',  // Bright green
      'neutral': '#00FF80'   // Bright green
    };
    
    return raceColors[race] || '#00FF80';}

  /**
   * Show enhanced tooltip (same as MapDetails)
   */
  showEnhancedTooltip(event, data, type) {
    this.hideEnhancedTooltip(); // Remove any existing tooltip

    const tooltip = document.createElement('div');
    tooltip.id = 'enhanced-tooltip';
    tooltip.className = 'enhanced-tooltip';

    let content = '';
    if (type === 'goldmine') {
      const goldAmount = data.amount || data.gold || data.goldAmount || 0;
      const category = this.getGoldmineCategory(goldAmount);
      const formattedAmount = goldAmount.toLocaleString();
      
      content = `
        <div class="tooltip-header goldmine-header">
          <i class="fas fa-coins"></i> Goldmine #${data.index || '?'}
        </div>
        <div class="tooltip-content">
          <div class="tooltip-stat">
            <span class="stat-label">Gold Amount:</span>
            <span class="stat-value">${formattedAmount}</span>
          </div>
          <div class="tooltip-stat">
            <span class="stat-label">Category:</span>
            <span class="stat-value ${category.toLowerCase()}">${category}</span>
          </div>
          <div class="tooltip-stat">
            <span class="stat-label">Position:</span>
            <span class="stat-value">(${data.x}, ${data.y})</span>
          </div>
        </div>
      `;
    } else if (type === 'player') {
      const race = this.formatRace(data.race || 'Unknown');
      
      content = `
        <div class="tooltip-header player-header">
          <i class="fas fa-flag"></i> Player ${data.player || '?'}
        </div>
        <div class="tooltip-content">
          <div class="tooltip-stat">
            <span class="stat-label">Race:</span>
            <span class="stat-value">${race}</span>
          </div>
          <div class="tooltip-stat">
            <span class="stat-label">Position:</span>
            <span class="stat-value">(${data.x}, ${data.y})</span>
          </div>
        </div>
      `;
    }

    tooltip.innerHTML = content;
    document.body.appendChild(tooltip);

    // Position tooltip near cursor but keep it on screen
    const rect = tooltip.getBoundingClientRect();
    const x = Math.min(event.clientX + 15, window.innerWidth - rect.width - 10);
    const y = Math.max(event.clientY - rect.height - 10, 10);
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;

    // Add show class for animation
    setTimeout(() => tooltip.classList.add('show'), 10);
  }

  /**
   * Hide enhanced tooltip (same as MapDetails)
   */
  hideEnhancedTooltip() {
    const tooltip = document.getElementById('enhanced-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Get goldmine category (same as MapDetails)
   */
  getGoldmineCategory(amount) {
    if (amount >= 300000) return 'Very High';if (amount >= 200000) return 'High';if (amount >= 100000) return 'Medium-High';if (amount >= 50000) return 'Medium';if (amount >= 25000) return 'Low';return 'Very Low';}

  /**
   * Format race name (same as MapDetails)
   */
  formatRace(race) {
    const raceNames = {
      'human': 'Human',
      'orc': 'Orc',
      'unknown': 'Unknown',
      'neutral': 'Neutral'
    };
    return raceNames[race?.toLowerCase()] || 'Unknown';}

  /**
   * Render pagination controls
   */
  renderPagination(totalPages, currentPage, totalMaps = 0) {
    // Get the correct pagination container based on current game
    const currentGame = this.getCurrentGame();
    let paginationId = 'pagination'; // default for wc2
    
    if (currentGame === 'wc3') {
      paginationId = 'wc3-pagination';
    }
    
    const paginationContainer = document.getElementById(paginationId);
    if (!paginationContainer) {
      console.warn(`Pagination container not found: ${paginationId}`);
      return;}

    // Clear existing pagination
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) {
      return;}

    console.log(`📄 Rendering pagination: ${currentPage}/${totalPages} (${totalMaps} total maps) in ${paginationId}`);

    const paginationHTML = this.generatePaginationHTML(totalPages, currentPage, totalMaps);
    paginationContainer.innerHTML = paginationHTML;
  }

  /**
   * Generate pagination HTML
   */
  generatePaginationHTML(totalPages, currentPage, totalMaps) {
    let paginationHTML = `
      <div class="pagination-controls-modern">
        <div class="pagination-info">
          <span class="pagination-text">
            Page ${currentPage} of ${totalPages}
            ${totalMaps > 0 ? ` • ${totalMaps} maps total` : ''}
          </span>
        </div>
        <div class="pagination-buttons">
    `;
    
    // Previous button
    if (currentPage > 1) {
      paginationHTML += `
        <button class="pagination-btn prev-btn" 
                data-page="${currentPage - 1}"
                title="Previous Page">
          <i class="fas fa-chevron-left"></i>
          <span>Previous</span>
        </button>
      `;
    }

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `
        <button class="pagination-btn page-btn" 
                data-page="1">1</button>
      `;
      if (startPage > 2) {
        paginationHTML += '<span class="pagination-ellipsis">...</span>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="pagination-btn page-btn ${i === currentPage ? 'active' : ''}" 
                data-page="${i}"
                ${i === currentPage ? 'disabled' : ''}>${i}</button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += '<span class="pagination-ellipsis">...</span>';
      }
      paginationHTML += `
        <button class="pagination-btn page-btn" 
                data-page="${totalPages}">${totalPages}</button>
      `;
    }

    // Next button
    if (currentPage < totalPages) {
      paginationHTML += `
        <button class="pagination-btn next-btn" 
                data-page="${currentPage + 1}"
                title="Next Page">
          <span>Next</span>
          <i class="fas fa-chevron-right"></i>
        </button>
      `;
    }

    paginationHTML += `
        </div>
      </div>
    `;
    
    return paginationHTML;}

  /**
   * Update hero stats display
   */
  async updateHeroStats() {
    try {
              const response = await fetch('/api/wc2maps/stats', {
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('Failed to load maps stats');
        return;}

      const stats = await response.json();
      
      // Update stats in the UI
      this.updateStatsDisplay(stats);
      
    } catch (error) {
      console.error('❌ Failed to update hero stats:', error);
    }
  }

  /**
   * Update stats display in UI
   */
  updateStatsDisplay(stats) {
    const elements = {
      totalMaps: document.getElementById('current-game-maps'), // Maps Available counter
      currentGameMaps: document.getElementById('current-game-maps'),
      recentUploads: document.getElementById('recent-uploads'),
      topDownloaded: document.getElementById('top-downloaded')
    };

    if (elements.totalMaps) {
      elements.totalMaps.textContent = stats.totalMaps || 0;
      console.log(`📊 Updated Maps Available: ${stats.totalMaps || 0}`);
    } else {
      console.warn('❌ Maps Available counter element not found');
    }

    if (elements.currentGameMaps) {
      elements.currentGameMaps.textContent = stats.currentGameMaps || stats.totalMaps || 0;
    }

    if (elements.recentUploads) {
      elements.recentUploads.textContent = stats.recentUploads || 0;
    }

    if (elements.topDownloaded) {
      elements.topDownloaded.textContent = stats.topDownloaded || 0;
    }

    console.log('📊 Stats display updated:', stats);
  }

  /**
   * Update game stats for specific game
   */
  async updateGameStats(game) {
    console.log(`🎮 Updating stats for game: ${game}`);
    
    const currentGameMapsEl = document.getElementById('current-game-maps');
    const recentUploadsEl = document.getElementById('recent-uploads');

    // Handle all games consistently via API calls
    try {
      // Try to fetch stats from respective API
      const apiUrl = `/api/${game}maps/stats`;
      console.log(`🔍 DEBUG: Fetching stats from: ${apiUrl} for game: ${game}`);
      const response = await fetch(apiUrl, { credentials: 'include' });
      if (response.ok) {
        const stats = await response.json();
        console.log(`📊 ${game.toUpperCase()} stats from API:`, stats);
        if (currentGameMapsEl) {
          // Use currentGameMaps first, then totalMaps as fallback
          currentGameMapsEl.textContent = stats.currentGameMaps || stats.totalMaps || 0;
        }
        if (recentUploadsEl) {
          recentUploadsEl.textContent = stats.recentUploads || 0;
        }
      } else {
        console.log(`📊 API failed for ${game.toUpperCase()}, showing 0`);
        // Show 0 for games with failed APIs
        if (currentGameMapsEl) {
          currentGameMapsEl.textContent = '0';
        }
        if (recentUploadsEl) {
          recentUploadsEl.textContent = '0';
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching ${game.toUpperCase()} stats:`, error);
      // Fallback to 0
      if (currentGameMapsEl) {
        currentGameMapsEl.textContent = '0';
      }
      if (recentUploadsEl) {
        recentUploadsEl.textContent = '0';
      }
    }
    
    console.log(`✅ Stats updated for ${game.toUpperCase()}`);
  }

  /**
   * View map details (delegated to MapDetails module)
   */
  viewMapDetails(mapId) {
    if (window.mapDetails && typeof window.mapDetails.viewMapDetails === 'function') {
      window.mapDetails.viewMapDetails(mapId);
    } else {
      console.warn('Map details module not available');
    }
  }

  /**
   * Download map functionality
   */
  async downloadMap(mapId) {
    try {
      console.log(`📥 Downloading map: ${mapId}`);
      
      // Get current game context to use correct API endpoint
      const currentGame = this.getCurrentGame();
      const apiEndpoint = currentGame === 'wc3' ? 'wc3maps' : 'wc2maps';
      
      const response = await fetch(`/api/${apiEndpoint}/${mapId}/download`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = 'Failed to download map';
        try {
          const data = await response.json();
          errorMessage = data.message || data.error || errorMessage;
          console.error('❌ Download error details:', data);
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = currentGame === 'wc3' ? 'map.w3x' : 'map.pud';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Map downloaded: ${filename}`);
      
    } catch (error) {
      console.error('❌ Failed to download map:', error);
      this.showError(`Failed to download map: ${error.message}`);
    }
  }

  /**
   * Delete map functionality
   */
  async deleteMap(mapId) {
    if (!confirm('Are you sure you want to delete this map? This action cannot be undone.')) {
      return;}

    try {
      console.log(`🗑️ Deleting map: ${mapId}`);
      
      // Get current game context to use correct API endpoint
      const currentGame = this.getCurrentGame();
      const apiEndpoint = currentGame === 'wc3' ? 'wc3maps' : 'wc2maps';
      
      // Debug: Log current user and map info
      const map = this.getCachedMap(mapId);
      const currentUser = window.mapsCore?.currentUser;
      console.log('🔍 Debug info:', {
        mapId,
        currentGame,
        apiEndpoint,
        currentUser: currentUser ? {
          id: currentUser.id,
          _id: currentUser._id,
          username: currentUser.username,
          role: currentUser.role
        } : null,
        map: map ? {
          uploadedBy: map.uploadedBy,
          name: map.name
        } : 'Map not in cache'
      });
      
      const response = await fetch(`/api/${apiEndpoint}/${mapId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete map';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
          console.error('❌ Delete error details:', {
            status: response.status,
            statusText: response.statusText,
            errorData: data
          });
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Remove from cache
      this.mapsCache.delete(mapId);
      
      // Reload maps
      await this.loadMaps();
      
      this.showSuccess('Map deleted successfully');
      console.log(`✅ Map deleted: ${mapId}`);
      
    } catch (error) {
      console.error('❌ Failed to delete map:', error);
      this.showError(`Failed to delete map: ${error.message}`);
    }
  }

  /**
   * Utility methods
   */
  formatPlayerCount(playerCount) {
    if (!playerCount) return 'Unknown';if (playerCount.min === playerCount.max) {
      return playerCount.min.toString();}
    return `${playerCount.min}-${playerCount.max}`;}

  calculateAverageRating(ratings) {
    if (!ratings || ratings.length === 0) return 0;const sum = ratings.reduce((total, rating) => total + rating.rating, 0);
    return sum / ratings.length;}

  generateStarRating(rating, userRating = 0, mapId = null) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let html = '';
    
    // Generate interactive stars with data attributes
    for (let i = 1; i <= 5; i++) {
      let starClass = 'far fa-star rating-star';
      let starColor = '#6b7280';
      
      if (i <= fullStars) {
        starClass = 'fas fa-star rating-star';
        starColor = '#ffd700';
      } else if (i === fullStars + 1 && hasHalfStar) {
        starClass = 'fas fa-star-half-alt rating-star';
        starColor = '#ffd700';
      }
      
      html += `<i class="${starClass}" data-rating="${i}" data-map-id="${mapId || ''}" style="color: ${starColor}; cursor: pointer;" title="Rate ${i} star${i !== 1 ? 's' : ''}"></i>`;
    }

    return html;}

  canDeleteMap(map) {
    const user = window.mapsCore?.currentUser;
    if (!user) return false;let uploadedByStr = '';
    if (map.uploadedBy) {
      if (typeof map.uploadedBy === 'object' && map.uploadedBy._id) {
        // Populated uploadedBy object
        uploadedByStr = map.uploadedBy._id.toString();
      } else {
        // Direct ObjectId or string
        uploadedByStr = map.uploadedBy.toString();
      }
    }
    
    const userIdStr = user.id ? user.id.toString() : '';
    
    return user.role === 'admin' || uploadedByStr === userIdStr;}

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;return text.substring(0, maxLength) + '...';}

  capitalizeFirst(str) {
    if (!str) return '';return str.charAt(0).toUpperCase() + str.slice(1);}

  formatDate(dateString) {
    if (!dateString) return 'Unknown';const date = new Date(dateString);
    return date.toLocaleDateString();}

  /**
   * Get no maps HTML with context-aware messaging
   */
  getNoMapsHTML() {
    const currentGame = this.getCurrentGame();
    const searchTerm = document.getElementById('search-input')?.value.trim();
    const currentTab = window.mapsCore?.state?.currentTab || 'all';
    
    let gameDisplayName = 'Warcraft II';
    if (currentGame === 'wc1') gameDisplayName = 'Warcraft I';
    else if (currentGame === 'wc3') gameDisplayName = 'Warcraft III';
    
    let message = 'No maps found';
    let description = 'No maps match your current criteria.';
    
    if (currentGame !== 'wc2') {
      message = `No ${gameDisplayName} Maps Available`;
      description = `There are currently no ${gameDisplayName} maps in our database. Most of our maps are for Warcraft II. Try switching to WC II for a full selection of maps.`;
    } else if (searchTerm) {
      message = 'No Search Results';
      description = `No maps found matching "${searchTerm}". Try adjusting your search terms or browse all maps.`;
    } else if (currentTab === 'land') {
      message = 'No Land Maps Found';
      description = 'No land maps match your current criteria. Try browsing all maps or check the sea maps filter.';
    } else if (currentTab === 'sea') {
      message = 'No Sea Maps Found';
      description = 'No sea/naval maps match your current criteria. Try browsing all maps or check the land maps filter.';
    }
    
    const suggestions = this.getNoMapsSuggestions(currentGame, searchTerm, currentTab);

    return `
      <div class="no-maps">
        <i class="fas fa-map"></i>
        <h3>${message}</h3>
        <p>${description}</p>
        ${suggestions ? `
          <div class="no-maps-suggestions">
            <h4>Suggestions:</h4>
            ${suggestions}
          </div>
        ` : ''}
      </div>
    `;}

  /**
   * Get suggestions for when no maps are found
   */
  getNoMapsSuggestions(currentGame, searchTerm, currentTab) {
    const suggestions = [];
    
    if (currentGame !== 'wc2') {
      suggestions.push('<button class="btn btn-primary" onclick="window.gameTabsManager?.switchGame(\'wc2\')">Browse Warcraft II Maps</button>');
    }
    
    if (searchTerm) {
      suggestions.push('<button class="btn btn-secondary" onclick="document.getElementById(\'search-input\').value = \'\'; mapsCore.handleSearch()">Clear Search</button>');
    }
    
    if (currentTab !== 'all') {
      suggestions.push('<button class="btn btn-secondary" onclick="mapsCore.switchTab(\'all\')">Show All Maps</button>');
    }
    
    return suggestions.length > 0 ? `
      <div class="suggestions-buttons">
        ${suggestions.join('')}
      </div>
    ` : null;}

  /**
   * Get current game from game tabs or default to wc2
   */
  getCurrentGame() {
    // Try multiple sources for current game
    if (window.gameTabsManager && typeof window.gameTabsManager.getCurrentGame === 'function') {
      const game = window.gameTabsManager.getCurrentGame();
      if (game) return game;}
    if (window.mapsCore && typeof window.mapsCore.getCurrentGame === 'function') {
      const game = window.mapsCore.getCurrentGame();
      if (game) return game;}
    
    // Check localStorage for saved preference
    const savedMapsGame = localStorage.getItem('mapsPageGame');
    if (savedMapsGame && ['wc1', 'wc2', 'wc3'].includes(savedMapsGame)) {
      return savedMapsGame;}
    
    // Fallback to checking URL or default
    const path = window.location.pathname;
    if (path.includes('war1') || path.includes('wc1')) return 'wc1';if (path.includes('war3') || path.includes('wc3')) return 'wc3';return 'wc2';}

  /**
   * Show/hide loading states
   */
  showLoading() {
    // Get the correct grid container based on current game
    const currentGame = this.getCurrentGame();
    console.log(`🗺️ Showing loading for game: ${currentGame}`);
    
    let gridId = 'maps-grid'; // default for wc2
    
    if (currentGame === 'wc3') {
              gridId = 'wc3-maps-grid';
    }
    
    const mapsGrid = document.getElementById(gridId);
    if (mapsGrid) {
      const loadingText = currentGame === 'wc3' ? 'Loading War3Net maps...' : 
                         'Loading epic battlegrounds...';
      
      mapsGrid.innerHTML = `
        <div class="maps-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>${loadingText}</p>
        </div>
      `;
    }
  }

  hideLoading() {
    // Loading state will be replaced by rendered maps
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
   * Get cached map by ID
   */
  getCachedMap(mapId) {
    return this.mapsCache.get(mapId);}

  /**
   * Cleanup function to disconnect observers and clear caches
   */
  cleanup() {
    console.log('🧹 Cleaning up Maps Grid...');
    
    this.mapsCache.clear();
    this.currentMaps = [];
    this.isLoading = false;
    this.loadingStates.clear();

    // Disconnect intersection observer
    if (this.imageObserver) {
      this.imageObserver.disconnect();
      this.imageObserver = null;
    }

    // Clear maps cache periodically to prevent memory leaks
    if (this.mapsCache.size > 100) {
      this.mapsCache.clear();
      console.log('🧹 Cleared maps cache to prevent memory issues');
    }

    // Remove event listeners
    if (this.globalEventHandlers) {
      this.globalEventHandlers.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.globalEventHandlers.clear();
    }

    console.log('✅ Maps Grid cleanup complete');
  }

  /**
   * Go to specific page
   */
  goToPage(page) {
    if (window.mapsCore) {
      window.mapsCore.updateState({ currentPage: page });
      
      // Use appropriate reload method based on current game
      const currentGame = this.getCurrentGame();
      if (currentGame === 'wc3') {
        window.mapsCore.triggerWC3MapsReload();
      } else {
        window.mapsCore.triggerMapsReload();
      }
    } else {
      console.warn('MapsCore not available for pagination');
    }
  }

  /**
   * Get player count display for War2 maps
   */
  getPlayerCountDisplay(map) {
    // Check multiple sources for player count
    
    // 1. Strategic data player count (most accurate - should be a number)
    if (map.strategicData?.playerCount && typeof map.strategicData.playerCount === 'number') {
      return `${map.strategicData.playerCount}`;}
    
    // 2. Direct player count property (can be object with min/max)
    if (map.playerCount) {
      if (typeof map.playerCount === 'number') {
        return `${map.playerCount}`;} else if (typeof map.playerCount === 'object' && map.playerCount.min && map.playerCount.max) {
        if (map.playerCount.min === map.playerCount.max) {
          return `${map.playerCount.min}`;} else {
          return `${map.playerCount.min}-${map.playerCount.max}`;}
      }
    }
    
    // 3. Players property (can be number or object)
    if (map.players) {
      if (typeof map.players === 'number') {
        return `${map.players}`;} else if (typeof map.players === 'object' && map.players.min && map.players.max) {
        if (map.players.min === map.players.max) {
          return `${map.players.min}`;} else {
          return `${map.players.min}-${map.players.max}`;}
      }
    }
    
    // 4. Strategic analysis data
    if (map.strategicAnalysis?.playerCount && typeof map.strategicAnalysis.playerCount === 'number') {
      return `${map.strategicAnalysis.playerCount}`;}
    
    // 5. Count starting positions from strategic data
    if (map.strategicData?.startingPositions?.length) {
      return `${map.strategicData.startingPositions.length}`;}
    
    // 6. Default fallback
    return '2';}

  /**
   * Get thumbnail path for War2 maps
   */
  getThumbnailPath(map) {
    if (map.thumbnailPath) {
      return map.thumbnailPath;}
    
    // Generate thumbnail name from map name
    const thumbnailName = `${map.name.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase()}_strategic.png`;
    return `/uploads/thumbnails/${thumbnailName}`;}

  /**
   * Get strategic data display for War2 maps
   */
  getStrategicData(map) {
    if (!map.strategicAnalysis) {
      return '';}

    const goldmines = map.strategicAnalysis.goldmines?.length || 0;
    const waterPercentage = map.strategicAnalysis.waterPercentage || 0;
    const treePercentage = map.strategicAnalysis.treePercentage || 0;

    return `
      <div class="strategic-items">
        <div class="strategic-item" title="Goldmines">
          <i class="strategic-icon fas fa-coins"></i>
          <span>${goldmines}</span>
        </div>
        <div class="strategic-item" title="Water Coverage">
          <i class="strategic-icon fas fa-water"></i>
          <span>${waterPercentage.toFixed(0)}%</span>
        </div>
        <div class="strategic-item" title="Forest Coverage">
          <i class="strategic-icon fas fa-tree"></i>
          <span>${treePercentage.toFixed(0)}%</span>
        </div>
      </div>
    `;}

  /**
   * Test function to check if star ratings are working
   */
  testStarRatingInteraction(mapId) {
    console.log('🧪 Testing star rating interaction for map:', mapId);
    alert(`Star rating test for map ${mapId} - if you see this alert, the stars are clickable!`);
  }

  
}

// Create and export singleton instance
export const mapsGrid = new MapsGrid(); 