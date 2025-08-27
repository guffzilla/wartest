/**
 * MapDetails.js - Map Details and Strategic Analysis
 * 
 * Extracted from the 72KB maps.js monster.
 * Handles map details modal, strategic analysis, ratings, overlays, and terrain visualization.
 * 
 * Responsibilities:
 * - Map details modal display and management
 * - Strategic analysis rendering and overlays
 * - Rating system and comments
 * - Terrain chart visualization
 * - Interactive map overlays and tooltips
 */



export class MapDetails {
  constructor() {
    this.currentMapId = null;
    this.currentMapData = null;
    this.overlayInteractions = null;
    this.terrainChartInstance = null;
    this.escListenerAdded = false;
    this.currentRating = null;
  }

  /**
   * Initialize the map details system
   */
  init() {
    console.log('🗺️ Initializing Map Details...');
    
    // Cache DOM elements
    this.mapDetailsModal = document.getElementById('map-details-modal');
    this.mapDetailsContainer = document.getElementById('map-details-container');
    
    if (!this.mapDetailsModal) {
      console.error('❌ Map details modal not found in DOM');
      return;}
    
    console.log('✅ Map details modal found and cached');
    
    this.setupGlobalFunctions();
    this.setupModalCloseButtons();
    
    // Setup page unload handler to clear URL parameters
    this.setupPageUnloadHandler();
    
    console.log('✅ Map Details initialized');
  }

  /**
   * Setup global functions for backward compatibility
   */
  setupGlobalFunctions() {
    window.mapDetails = this;
    window.viewMapDetails = (mapId) => this.viewMapDetails(mapId);
    window.rateMap = (mapId, rating, comment) => this.rateMap(mapId, rating, comment);
    window.highlightStars = (stars, rating) => this.highlightStars(stars, rating);
    
    console.log('🌐 Map details functions registered');
  }

  /**
   * Setup modal close button functionality
   */
  setupModalCloseButtons() {
    // Setup map details modal close functionality
    const mapDetailsModal = document.getElementById('map-details-modal');
    if (mapDetailsModal) {
      // Close button inside modal
      const closeBtn = mapDetailsModal.querySelector('.close-modal');
      
      if (closeBtn && !closeBtn.hasAttribute('data-listener-added')) {
        closeBtn.addEventListener('click', () => {
          this.hideModal();
        });
        closeBtn.setAttribute('data-listener-added', 'true');
      }
      
      // Click outside modal to close
      if (!mapDetailsModal.hasAttribute('data-listener-added')) {
        mapDetailsModal.addEventListener('click', (e) => {
          if (e.target === mapDetailsModal) {
            this.hideModal();
          }
        });
        mapDetailsModal.setAttribute('data-listener-added', 'true');
      }
    }
    
    // ESC key to close modal - use a class property to track if added
    if (!this.escListenerAdded) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          // Check if map details modal is open
          const modal = document.getElementById('map-details-modal');
          if (modal && modal.classList.contains('show')) {
            this.hideModal();
          }
        }
      });
      this.escListenerAdded = true;
    }
    
    console.log('🔧 Modal close functionality setup');
  }

  /**
   * View detailed information about a specific map
   */
  async viewMapDetails(mapId) {
    try {
      console.log(`🔍 Loading details for map: ${mapId}`);
      
      if (!this.mapDetailsModal) {
        console.error('❌ Map details modal not found');
        return;}

      this.currentMapId = mapId;
      this.showModal();
      
      // Show loading state
      if (this.mapDetailsContainer) {
        this.mapDetailsContainer.innerHTML = `
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading map details...</p>
          </div>
        `;
      }

      // Fetch map details - determine API endpoint based on current game
      const currentGame = this.getCurrentGame();
      let apiEndpoint;
      
      switch (currentGame) {
        case 'wc3':
          apiEndpoint = `/api/wc3maps/${mapId}`;
          break;
        case 'wc1':
          apiEndpoint = `/api/wc1maps/${mapId}`;
          break;
        default:
          apiEndpoint = `/api/wc2maps/${mapId}`;
          break;
      }
      
      console.log(`🔍 Using API endpoint: ${apiEndpoint} for game: ${currentGame}`);
      
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error(`Failed to load map details: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('📋 Map data loaded:', responseData);

      // Extract map data from API response format
      const mapData = responseData.success ? responseData.data : responseData;

      // Store current map data
      this.currentMapData = mapData;

      // DEBUG: Log received map data structure
      console.log('🔍 DEBUG: Frontend received map data:', {
        name: mapData.name,
        size: mapData.size,
        dimensions: mapData.dimensions,
        tileset: mapData.tileset,
        hasStrategicData: !!mapData.strategicData,
        hasStrategicAnalysis: !!mapData.strategicAnalysis,
        strategicDataKeys: mapData.strategicData ? Object.keys(mapData.strategicData) : 'none',
        strategicAnalysisKeys: mapData.strategicAnalysis ? Object.keys(mapData.strategicAnalysis) : 'none',
        fullMapData: JSON.stringify(mapData, null, 2)
      });

      // Render the map details based on game type
      if (currentGame === 'wc3') {
        this.renderWC3MapDetailsModal(mapData);
      } else {
        this.renderMapDetailsModal(mapData);
      }
      
      // Skip createInteractiveOverlays here as it's handled by createEnhancedOverlays in renderMapDetailsModal
      console.log('✅ Map details loaded, overlays will be created by renderMapDetailsModal');

    } catch (error) {
      console.error('❌ Failed to load map details:', error);
      if (this.mapDetailsContainer) {
        this.mapDetailsContainer.innerHTML = `
          <div class="error-container">
            <h3>Error Loading Map</h3>
            <p>${error.message}</p>
            <button onclick="mapDetails.hideModal()" class="btn btn-primary">Close</button>
          </div>
        `;
      }
    }
  }

  /**
   * Get the correct API endpoint based on current game
   */
  getApiEndpoint(mapId) {
    const currentGame = window.mapsCore?.currentGame || 'wc2';
    
    switch (currentGame) {
      case 'wc3':
        return `/api/wc3maps/${mapId}`;case 'wc1':
        return `/api/wc1maps/${mapId}`;default:
        return `/api/wc2maps/${mapId}`;}
  }

  /**
   * Get the correct download API endpoint based on current game
   */
  getDownloadApiEndpoint(mapId) {
    const currentGame = window.mapsCore?.currentGame || 'wc2';
    
    switch (currentGame) {
      case 'wc3':
        return `/api/wc3maps/${mapId}/download`;case 'wc1':
        return `/api/wc1maps/${mapId}/download`;default:
        return `/api/wc2maps/${mapId}/download`;}
  }

  /**
   * Get the correct rating API endpoint based on current game
   */
  getRatingApiEndpoint(mapId) {
    // Use stored game type if available, otherwise fall back to current game
    const gameType = this.currentGameType || window.mapsCore?.currentGame || 'wc2';
    
    switch (gameType) {
      case 'wc3':
        return `/api/wc3maps/${mapId}/rate`;case 'wc1':
        return `/api/wc1maps/${mapId}/rate`;default:
        return `/api/wc2maps/${mapId}/rate`;}
  }

  /**
   * Get the default thumbnail for the current game
   */
  getDefaultThumbnailForGame() {
    const currentGame = window.mapsCore?.currentGame || 'wc2';
    
    switch (currentGame) {
      case 'wc3':
        return '/uploads/thumbnails/default-wc3-map.svg';case 'wc1':
        return '/uploads/thumbnails/default-war1-map.png';default:
        return '/uploads/thumbnails/default-map.png';}
  }

  /**
   * Render the map details modal with compact design
   */
  renderMapDetailsModal(map) {
    if (!this.mapDetailsContainer) {
      console.error('❌ Map details container not found');
      return;}
    


    // Use the strategic thumbnail path directly from the database, with game-specific fallback
    let thumbnailUrl = map.strategicThumbnailPath || map.thumbnailPath;
    
    // If neither path is available, use the default game-specific thumbnail
    if (!thumbnailUrl) {
      thumbnailUrl = this.getDefaultThumbnailForGame();
    }
    
    console.log('🖼️ Using thumbnail URL:', thumbnailUrl, 'for map:', map.name);

    // Format ratings - make interactive for logged in users
    const user = window.mapsCore?.currentUser;
    const isLoggedIn = !!user;
    let userRating = 0;
    
    if (isLoggedIn && map.ratings) {
      const existingRating = map.ratings.find(r => 
        r.userId === user.id || 
        r.userId?._id === user.id ||
        r.userId?.toString() === user.id
      );
      if (existingRating) {
        userRating = existingRating.rating;
      }
    }

    // Generate interactive or static stars based on login status
    let stars;
    if (isLoggedIn) {
      // Show average rating initially, not user's personal rating
      stars = this.generateInteractiveStarRating(map.averageRating || 0, 'normal', map._id);
    } else {
      stars = this.generateStarRating(map.averageRating || 0);
    }
    
    // Fix rating text calculation - handle both ratingsCount and ratings array
    const totalRatings = map.ratingsCount || (map.ratings ? map.ratings.length : 0);
    const ratingText = totalRatings > 0 ? `${(map.averageRating || 0).toFixed(1)} (${totalRatings} reviews)` : 'No ratings yet';

    // Strategic analysis data
    const strategicData = map.strategicData || map.strategicAnalysis || {};

    // Fix water percentage calculation - use strategicData.waterPercentage directly
    let waterPercentage = 0;
    if (strategicData.waterPercentage !== undefined) {
      waterPercentage = parseFloat(strategicData.waterPercentage);
    } else if (strategicData.terrain && strategicData.terrain.water) {
      waterPercentage = strategicData.terrain.water;
    } else if (strategicData.terrainDistribution && strategicData.terrainDistribution.water) {
      waterPercentage = strategicData.terrainDistribution.water;
    }
    
    // Determine if it's land or water map
    const mapType = waterPercentage > 30 ? 'Water Map' : 'Land Map';

    // Get strategic counts for top display
    const goldmineCount = strategicData.goldmines?.length || 0;
    const playerCount = strategicData.startingPositions?.length || map.playerCount || 'Unknown';

    this.mapDetailsContainer.innerHTML = `
      <div class="map-details-epic">
        <!-- Compact Header Layout -->
        <div class="map-details-header-epic">
          <!-- Strategic Map Image with Overlays -->
          <div class="map-image-container" id="map-image-container">
            <img src="${thumbnailUrl}" 
                 alt="${map.name}"
                 class="map-details-thumbnail-epic"
                 onerror="this.onerror=null; this.src='${this.getDefaultThumbnailForGame()}'; console.warn('Failed to load thumbnail:', this.src);"
                 onload="this.classList.add('loaded'); console.log('✅ Successfully loaded thumbnail:', this.src);">
            <button class="map-details-fullscreen-btn" title="View Fullscreen" data-map-id="${map._id}">
              <i class="fas fa-expand"></i>
            </button>
          </div>
          
          <!-- Enhanced Map Info with Strategic Data -->
          <div class="map-info-epic">
            <h1 class="map-title-epic">${map.name}</h1>
            
            <!-- Enhanced Meta Grid with Strategic Data -->
            <div class="map-meta-epic">
              <div class="meta-item-epic">
                <i class="fas fa-gamepad"></i>
                <span>${map.type || 'Melee'}</span>
              </div>
              <div class="meta-item-epic">
                <i class="fas fa-map"></i>
                <span>${mapType}</span>
              </div>
              <div class="meta-item-epic">
                <i class="fas fa-coins"></i>
                <span>${goldmineCount} Goldmines</span>
              </div>
              <div class="meta-item-epic">
                <i class="fas fa-users"></i>
                <span>${playerCount} Players</span>
              </div>
              <div class="meta-item-epic">
                <i class="fas fa-tint"></i>
                <span>${waterPercentage.toFixed(1)}% Water</span>
              </div>
            </div>

            <!-- Enhanced Rating Display with Buttons -->
            <div class="map-rating-epic">
              <div class="rating-section">
                <div class="stars-epic">${stars}</div>
                <span class="rating-text-epic">${ratingText}</span>
                ${!isLoggedIn ? '<div class="login-hint">Login to rate this map</div>' : ''}
              </div>
              <div class="stats-section">
                <div class="downloads-epic">
                  <i class="fas fa-download"></i>
                  <span>${map.downloadCount || 0}</span>
                </div>
                <div class="matches-epic">
                  <i class="fas fa-trophy"></i>
                  <span>${map.matchCount || 0}</span>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons Under Rating -->
            <div class="map-actions-top-epic">
              <a href="${this.getDownloadApiEndpoint(map._id)}" class="btn-epic btn-primary-epic" target="_blank">
                <i class="fas fa-download"></i>
                <span>Download Map</span>
              </a>
              <button class="btn-epic btn-secondary-epic" onclick="mapDetails.showMatchHistory('${map._id}')">
                <i class="fas fa-history"></i>
                <span>Match History</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Compact Description - Moved to Top -->
        <div class="map-description-section-epic">
          <div class="description-header-epic">
            <h3><i class="fas fa-scroll"></i> Description</h3>
          </div>
          <div class="description-content-epic">
            ${map.description || 'No description available for this map.'}
          </div>
        </div>
        
        <!-- User Comments Section -->
        <div class="map-comments-section-epic">
          <div class="comments-header-epic">
            <h3><i class="fas fa-comments"></i> User Reviews & Comments</h3>
          </div>
          <div class="comments-content-epic" id="map-comments-content">
            ${this.renderUserComments(map)}
          </div>
        </div>
        
        <!-- Terrain Chart and Balance Metrics Section -->
        <div class="terrain-and-balance-section">
          <!-- Compact Terrain Chart Section -->
          ${this.renderCompactTerrainChart(map)}
          
          <!-- Balance Metrics Section -->
          ${this.renderBalanceMetrics(map)}
        </div>
      </div>
    `;



    // Setup fullscreen button with specific targeting and improved functionality
    const fullscreenBtn = this.mapDetailsContainer.querySelector('.map-details-fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Use thumbnail URL for fullscreen to ensure it loads
        this.openFullscreenImageWithOverlays(thumbnailUrl, map.name, map);
      });
    }

    // Setup interactive star rating with proper event delegation
    if (isLoggedIn) {
      this.setupInteractiveStarRating(map._id);
    }

    // Wait for image to load then create overlays (prevent duplicates)
    const mapImage = this.mapDetailsContainer.querySelector('.map-details-thumbnail-epic');
    if (mapImage && (strategicData.goldmines || strategicData.startingPositions) && !mapImage.dataset.overlaysCreated) {
      mapImage.dataset.overlaysCreated = 'pending';
      
      const createOverlaysOnce = () => {
        if (mapImage.dataset.overlaysCreated === 'pending') {
          mapImage.dataset.overlaysCreated = 'true';
          this.createEnhancedOverlays(mapImage.parentElement, mapImage, map);
        }
      };
      
      if (mapImage.complete && mapImage.naturalHeight !== 0) {
        // Image already loaded
        setTimeout(createOverlaysOnce, 100);
      } else {
        // Wait for image to load
        mapImage.addEventListener('load', () => {
          setTimeout(createOverlaysOnce, 100);
        });
      }
    }

    // Initialize terrain chart after DOM is ready with better timing and error handling
    setTimeout(() => {
      console.log('🎯 Initializing terrain chart...');
      this.initializeCompactTerrainChart(map).catch(error => {
        console.error('❌ Failed to initialize terrain chart:', error);
      });
    }, 500);
  }

  /**
   * Render user comments section
   */
  renderUserComments(map) {
    if (!map.ratings || map.ratings.length === 0) {
      return `
        <div class="no-comments-epic">
          <i class="fas fa-comment-slash"></i>
          <p>No reviews or comments yet. Be the first to share your thoughts about this map!</p>
        </div>
      `;}

    // Filter only ratings with comments
    const ratingsWithComments = map.ratings.filter(rating => rating.comment && rating.comment.trim());
    
    if (ratingsWithComments.length === 0) {
      return `
        <div class="no-comments-epic">
          <i class="fas fa-comment-slash"></i>
          <p>No comments yet. Players have rated this map, but haven't left comments. Be the first!</p>
        </div>
      `;}

    const commentsHTML = ratingsWithComments.map(rating => {
      const username = rating.userId?.username || rating.userId?.displayName || 'Anonymous';
      const userRating = rating.rating || 0;
      const comment = rating.comment || '';
      const date = rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : 'Recently';
      
      return `
        <div class="comment-item-epic">
          <div class="comment-header-epic">
            <div class="comment-user-info">
              <span class="comment-username">${username}</span>
              <div class="comment-rating">${this.generateStarRating(userRating)}</div>
            </div>
            <span class="comment-date">${date}</span>
          </div>
          <div class="comment-content">
            ${this.escapeHtml(comment)}
          </div>
        </div>
      `;}).join('');

    return `
      <div class="comments-list-epic">
        ${commentsHTML}
      </div>
    `;}

  /**
   * Initialize compact modal components
   */
  initializeCompactModal(map) {
    // Store current map data
    this.currentMapData = map;
    
    // Initialize tab switching
    this.initializeCompactTabs();
    
    // Initialize header star rating
    this.initializeHeaderStarRating(map);
    
    // Initialize enhanced interactive overlays
    setTimeout(() => {
      this.initializeEnhancedInteractiveMap(map);
    }, 100);
    
    console.log('✅ Compact modal components initialized');
  }

  /**
   * Render WC3-specific map details modal
   */
  renderWC3MapDetailsModal(map) {
    console.log('🎯 Rendering WC3 map details modal for:', map.name);
    

    
    // Get thumbnail URL - WC3 maps use extracted minimaps
    let thumbnailUrl;
    if (map.thumbnailPath) {
      // Use the path from database (War3Net system)
      thumbnailUrl = map.thumbnailPath.startsWith('/') ? map.thumbnailPath : `/${map.thumbnailPath}`;
    } else if (map.strategicThumbnailPath) {
      thumbnailUrl = map.strategicThumbnailPath.startsWith('/') ? map.strategicThumbnailPath : `/${map.strategicThumbnailPath}`;
    } else if (map.filename) {
      // Use the database filename field (from our extraction) 
      const mapBaseName = map.filename.replace('.w3x', '');
      thumbnailUrl = `/uploads/war3images/${mapBaseName}.png`;
    } else if (map.name && map.name.trim() && map.name !== '\u0001') {
      // Fallback to map name - corrected path without /flat/
      thumbnailUrl = `/uploads/war3images/${map.name}.png`;
    } else {
      // Use placeholder for maps without valid names or thumbnails
      thumbnailUrl = '/assets/images/default-wc3-map.png';
    }
    
    // Calculate rating
    const ratings = map.ratings || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;
    const ratingCount = ratings.length;
    
    // Check if user is logged in
    const isLoggedIn = window.mapsCore?.currentUser != null;
    const user = window.mapsCore?.currentUser;
    
    // Get user's current rating for this map
    const userRating = user && ratings.length > 0 
      ? ratings.find(r => 
          (r.userId === user.id) || 
          (r.userId?._id === user.id) || 
          (r.userId?.toString() === user.id?.toString())
        )?.rating || 0
      : 0;
    
    // Generate star rating HTML - interactive for logged in users, static for guests
    const stars = isLoggedIn 
      ? this.generateInteractiveStarRating(averageRating, 'normal', map._id)
      : this.generateStarRating(averageRating);
    
    const ratingText = ratingCount > 0 
      ? `${averageRating.toFixed(1)} (${ratingCount} review${ratingCount !== 1 ? 's' : ''})`
      : 'No ratings yet';
    
    this.mapDetailsContainer.innerHTML = `
      <div class="map-details-epic wc3-details">
        <!-- WC3 Header Layout -->
        <div class="map-details-header-epic">
          <!-- WC3 Map Canvas with Overlay Toggle -->
          <div class="map-image-container" id="map-image-container">
            <div class="wc3-canvas-container">
              <canvas id="wc3-map-canvas" class="wc3-map-canvas"></canvas>
              <div class="overlay-controls-top-left">
                <label class="overlay-toggle">
                  <input type="checkbox" id="overlay-toggle" checked>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">Strategic Overlay</span>
                </label>
              </div>
            </div>
            <button class="map-details-fullscreen-btn" title="View Fullscreen" data-map-id="${map._id}">
              <i class="fas fa-expand"></i>
            </button>
          </div>
          
          <!-- WC3 Map Info -->
          <div class="map-info-epic">
            <h1 class="map-title-epic">${map.name}</h1>
            
            <!-- WC3 Meta Grid -->
            <div class="map-meta-epic">
              <div class="meta-item-epic">
                <i class="fas fa-chess-king"></i>
                <span>Warcraft III</span>
              </div>
              <div class="meta-item-epic">
                <i class="fas fa-users"></i>
                <span>${map.players || map.playerCount || 'Unknown'} Players</span>
              </div>
              <div class="meta-item-epic">
                <i class="fas fa-map"></i>
                <span>${map.mapSize || 'Unknown'} Size</span>
              </div>
              <div class="meta-item-epic">
                <i class="fas fa-layer-group"></i>
                <span>${map.tileset || 'Unknown'} Tileset</span>
              </div>
              <div class="meta-item-epic">
                <i class="fas fa-check-circle"></i>
                <span>${((map.accuracyScore || 0) * 100).toFixed(0)}% Accuracy</span>
              </div>
            </div>
            
            <!-- Strategic Elements Summary -->
            <div class="strategic-summary-epic">
              <h3><i class="fas fa-chess-board"></i> Strategic Elements</h3>
              <div class="strategic-grid-epic">
                <div class="strategic-stat-epic">
                  <i class="fas fa-coins strategic-icon"></i>
                  <div class="stat-info">
                    <span class="stat-number">${map.goldmines || 0}</span>
                    <span class="stat-label">Goldmines</span>
                  </div>
                </div>
                <div class="strategic-stat-epic">
                  <i class="fas fa-skull strategic-icon"></i>
                  <div class="stat-info">
                    <span class="stat-number">${map.creepUnits || 0}</span>
                    <span class="stat-label">Creep Units</span>
                  </div>
                </div>
                <div class="strategic-stat-epic">
                  <i class="fas fa-building strategic-icon"></i>
                  <div class="stat-info">
                    <span class="stat-number">${map.neutralStructures || 0}</span>
                    <span class="stat-label">Structures</span>
                  </div>
                </div>
                <div class="strategic-stat-epic">
                  <i class="fas fa-flag strategic-icon"></i>
                  <div class="stat-info">
                    <span class="stat-number">${map.startingLocations || 0}</span>
                    <span class="stat-label">Start Positions</span>
                  </div>
                </div>
                <div class="strategic-stat-epic">
                  <i class="fas fa-shopping-cart strategic-icon"></i>
                  <div class="stat-info">
                    <span class="stat-number">${map.shopInventories || 0}</span>
                    <span class="stat-label">Shops</span>
                  </div>
                </div>
                <div class="strategic-stat-epic">
                  <i class="fas fa-gift strategic-icon"></i>
                  <div class="stat-info">
                    <span class="stat-number">${map.inferredDropTables || 0}</span>
                    <span class="stat-label">Drop Tables</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rating Display -->
            <div class="map-rating-epic">
              <div class="rating-section">
                <div class="stars-epic">${stars}</div>
                <span class="rating-text-epic">${ratingText}</span>
                ${!isLoggedIn ? '<div class="login-hint">Login to rate this map</div>' : ''}
              </div>
              <div class="stats-section">
                <div class="downloads-epic">
                  <i class="fas fa-trophy"></i>
                  <span>${map.playCount || 0} matches</span>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="map-actions-top-epic">
              <button class="btn-epic btn-primary-epic" onclick="window.downloadMap('${map._id}')">
                <i class="fas fa-download"></i>
                <span>Download Map</span>
              </button>
              <button class="btn-epic btn-secondary-epic" onclick="mapDetails.showWC3MatchHistory('${map._id}')">
                <i class="fas fa-history"></i>
                <span>Match History</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- WC3 Description Section -->
        <div class="map-description-section-epic">
          <div class="description-header-epic">
            <h3><i class="fas fa-scroll"></i> Map Information</h3>
          </div>
          <div class="description-content-epic">
            ${map.description || 'No description available for this Warcraft III map.'}
            
            <!-- WC3 Specific Info -->
            <div class="wc3-info-grid">
              <div class="wc3-info-item">
                <strong>Author:</strong> ${map.author || 'Unknown'}
              </div>
              <div class="wc3-info-item">
                <strong>Recommended Players:</strong> ${map.recommendedPlayers || `${map.playerCount || 2} players`}
              </div>
              <div class="wc3-info-item">
                <strong>Format:</strong> ${map.format || 'W3X'}
              </div>
              <div class="wc3-info-item">
                <strong>Category:</strong> ${map.category || 'Custom'}
              </div>
            </div>
          </div>
        </div>
        
        <!-- WC3 Race Statistics Section -->
        ${this.renderWC3RaceStats(map)}
        
        <!-- User Comments Section -->
        <div class="map-comments-section-epic">
          <div class="comments-header-epic">
            <h3><i class="fas fa-comments"></i> User Reviews & Comments</h3>
          </div>
          <div class="comments-content-epic" id="map-comments-content">
            ${this.renderUserComments(map)}
          </div>
        </div>
      </div>
    `;



    // Setup fullscreen button
    const fullscreenBtn = this.mapDetailsContainer.querySelector('.map-details-fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.openWC3FullscreenImage(thumbnailUrl, map.name, map);
      });
    }

    // Setup interactive star rating
    if (isLoggedIn) {
      this.setupInteractiveStarRating(map._id);
    }
    
    // Initialize War3 overlay system
    this.initializeWar3Overlay(map);
    
    console.log('✅ WC3 map details modal rendered');
  }

  /**
   * Initialize War3 overlay system
   */
  async initializeWar3Overlay(mapData) {
    try {
      console.log('🎨 Initializing War3 overlay system...');
      console.log('📊 Original mapData for WC3 overlay:', {
        name: mapData.name,
        thumbnailPath: mapData.thumbnailPath,
        strategicThumbnailPath: mapData.strategicThumbnailPath,
        filename: mapData.filename,
        goldmines: mapData.goldmines?.length || 0,
        startingLocations: mapData.startingLocations?.length || 0
      });
      
      // Initialize overlay renderer if not already done
      if (!window.war3OverlayRenderer) {
        window.war3OverlayRenderer = new War3OverlayRenderer();
      }
      
      const renderer = window.war3OverlayRenderer;
      const canvasId = 'wc3-map-canvas';
      
      // Transform WC3 data format to match War3OverlayRenderer expectations
      const transformedData = {
        ...mapData,
        // Ensure thumbnailPath is available for the renderer
        thumbnailPath: mapData.thumbnailPath || mapData.strategicThumbnailPath || `/uploads/war3images/${mapData.filename?.replace('.w3x', '.png')}`,
        // Map WC3 strategic data to expected format
        dooGoldmines: mapData.goldmines || [],
        jassGoldmines: [],
        dooStartingPositions: mapData.startingLocations || [],
        jassStartingPositions: [],
        starting_positions: mapData.startingLocations || [],
        dooNeutralStructures: mapData.neutralStructures || [],
        jassNeutralStructures: [],
        dooCreepUnits: mapData.creepUnits || [],
        jassCreepUnits: [],
        // Add shop data from shopInventories
        shopInventories: mapData.shopInventories || [],
        // Add drop table data
        inferredDropTables: mapData.inferredDropTables || []
      };
      
      console.log('🔄 Transformed WC3 data for overlay renderer:', {
        originalGoldmines: mapData.goldmines?.length || 0,
        originalStartingLocations: mapData.startingLocations?.length || 0,
        originalNeutralStructures: mapData.neutralStructures?.length || 0,
        originalCreepUnits: mapData.creepUnits?.length || 0,
        thumbnailPath: transformedData.thumbnailPath,
        transformedData: transformedData
      });
      
      // Wait a bit for DOM to be ready
      setTimeout(async () => {
        try {
          // Initial render with overlay enabled using transformed data
          await renderer.renderOverlay(canvasId, transformedData, true);
          
          // Add hover tooltips
          renderer.addHoverTooltips(canvasId, transformedData);
          
          // Set up overlay toggle
          const overlayToggle = document.getElementById('overlay-toggle');
          if (overlayToggle) {
            overlayToggle.addEventListener('change', async (e) => {
              const showOverlay = e.target.checked;
              console.log(`🎨 Overlay toggle: ${showOverlay ? 'ON' : 'OFF'}`);
              await renderer.renderOverlay(canvasId, transformedData, showOverlay);
              
              // Re-add tooltips after re-render
              if (showOverlay) {
                renderer.addHoverTooltips(canvasId, transformedData);
              }
            });
          }
          
          console.log('✅ War3 overlay system initialized');
        } catch (error) {
          console.error('❌ Error in delayed overlay initialization:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error initializing War3 overlay:', error);
    }
  }

  /**
   * Render WC3 race statistics
   */
  renderWC3RaceStats(map) {
    if (!map.raceStats) {
      return '';}
    
    const races = ['human', 'orc', 'undead', 'night_elf', 'random'];
    const raceNames = {
      human: 'Human',
      orc: 'Orc', 
      undead: 'Undead',
      night_elf: 'Night Elf',
      random: 'Random'
    };
    
    const raceIcons = {
      human: 'fas fa-shield-alt',
      orc: 'fas fa-hammer',
      undead: 'fas fa-skull',
      night_elf: 'fas fa-leaf',
      random: 'fas fa-random'
    };
    
    const statsHTML = races.map(race => {
      const stats = map.raceStats[race] || { wins: 0, losses: 0 };
      const total = stats.wins + stats.losses;
      const winRate = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : '0.0';
      
      return `
        <div class="race-stat-item">
          <div class="race-header">
            <i class="${raceIcons[race]}"></i>
            <span>${raceNames[race]}</span>
          </div>
          <div class="race-stats">
            <div class="stat-value">${stats.wins}W - ${stats.losses}L</div>
            <div class="win-rate">${winRate}% WR</div>
          </div>
        </div>
      `;}).join('');
    
    return `
      <div class="wc3-race-stats-section">
        <div class="section-header-epic">
          <h3><i class="fas fa-chart-bar"></i> Race Statistics</h3>
        </div>
        <div class="race-stats-grid">
          ${statsHTML}
        </div>
      </div>
    `;}

  /**
   * Open WC3 fullscreen image
   */
  openWC3FullscreenImage(imageUrl, mapName, mapData) {
    // Remove any existing fullscreen modal
    const existingModal = document.getElementById('wc3-fullscreen-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create fullscreen modal
    const modal = document.createElement('div');
    modal.id = 'wc3-fullscreen-modal';
    modal.className = 'modal wc3-fullscreen-modal';

    modal.innerHTML = `
      <button id="close-wc3-fullscreen" title="Close Fullscreen">×</button>
      
      <div class="wc3-fullscreen-container">
        <img src="${imageUrl}" 
             alt="${mapName} - Fullscreen"
             class="wc3-fullscreen-image"
             >
        
        <div class="wc3-title-overlay">
          <h2>${mapName}</h2>
          <p>Warcraft III Map - Extracted Minimap</p>
          <div class="wc3-fullscreen-actions">
            <button class="wc3-fs-btn" onclick="window.downloadMap('${mapData._id}')">
              <i class="fas fa-download"></i>
              Download
            </button>
            <button class="wc3-fs-btn" onclick="mapDetails.showWC3MatchHistory('${mapData._id}')">
              <i class="fas fa-history"></i>
              Matches
            </button>
          </div>
        </div>
      </div>
    `;

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
          const closeButton = modal.querySelector('#close-wc3-fullscreen');
    if (closeButton) {
      closeButton.addEventListener('click', closeModal);
    }
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // ESC key support
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Show WC3 match history
   */
  async showWC3MatchHistory(mapId) {
    console.log('📊 Showing WC3 match history for:', mapId);
    alert('WC3 match history feature coming soon! This will show detailed statistics for this map including recent matches, popular strategies, and race win rates.');
  }

  /**
   * Initialize compact tab switching
   */
  initializeCompactTabs() {
    const tabHeaders = document.querySelectorAll('.tab-header');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const targetTab = header.getAttribute('data-tab');
        
        // Remove active class from all headers and contents
        tabHeaders.forEach(h => h.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked header and corresponding content
        header.classList.add('active');
        const targetContent = document.getElementById(`${targetTab}-tab`);
        if (targetContent) {
          targetContent.classList.add('active');
          
          // Initialize terrain chart when strategic tab is activated
          if (targetTab === 'strategic') {
            setTimeout(() => {
              console.log('🔄 Initializing terrain chart for strategic tab...');
              this.initializeCompactTerrainChart(this.currentMapData);
            }, 200);
          }
        }
        
        console.log(`🔄 Switched to ${targetTab} tab`);
      });
    });
    
    console.log('🗂️ Compact tabs initialized');
  }

  /**
   * Generate compact overview tab content
   */
  generateOverviewTabCompact(map) {
    return `
      <div class="overview-compact">
        <div class="map-info-grid">
          <div class="info-row">
            <span class="info-label">Size:</span>
            <span class="info-value">${map.size || 'Unknown'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">${this.capitalizeFirst(map.type || 'melee')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tileset:</span>
            <span class="info-value">${this.capitalizeFirst(map.tileset || 'forest')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Players:</span>
            <span class="info-value">${this.formatPlayerCount(map.playerCount)}</span>
          </div>
        </div>
        
        ${map.description ? `
          <div class="description-section">
            <h4>Description</h4>
            <p class="description-text">${this.escapeHtml(map.description)}</p>
          </div>
        ` : ''}
      </div>
    `;}

  /**
   * Generate compact strategic tab content
   */
  generateStrategicTabCompact(map) {
    if (!map.strategicAnalysis && !map.strategicData) {
      return '<p class="no-analysis">No strategic analysis available for this map.</p>';}

    return this.renderStrategicAnalysisCompact(map);}

  /**
   * Generate compact reviews tab with improved rating functionality
   */
  generateReviewsTabCompact(map, userRating, userComment) {
    const currentUser = window.mapsCore?.currentUser;
    const ratings = map.ratings || [];
    
    return `
      <div class="reviews-compact">
        ${currentUser ? `
          <div class="rate-section">
            <h4>Rate This Map</h4>
            <div class="rating-interface">
              <div class="star-rating-input">
                ${this.generateInteractiveStarRating(userRating, 'large', map._id)}
              </div>
              
              <div class="rating-actions">
                <button class="btn-compact primary" onclick="mapDetails.showRatingCommentPrompt(${userRating || 1}, '${map._id}', '${userComment.replace(/'/g, "\\'")}')">
                  <i class="fas fa-comment"></i>
                  ${userRating > 0 ? 'Update Rating' : 'Add Rating'}
                </button>
                
                ${userRating > 0 ? `
                  <button class="btn-compact danger" onclick="mapDetails.removeRating('${map._id}')">
                    <i class="fas fa-trash"></i>
                    Remove Rating
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        ` : `
          <div class="login-prompt-section">
            <p><i class="fas fa-info-circle"></i> Log in to rate and review this map</p>
          </div>
        `}
        
        <div class="reviews-list">
          <h4>Reviews (${ratings.length})</h4>
          ${ratings.length > 0 ? this.renderRatingsCompact(ratings) : `
            <p class="no-reviews">No reviews yet. Be the first to review this map!</p>
          `}
        </div>
      </div>
    `;}

  /**
   * Render ratings in compact format
   */
  renderRatingsCompact(ratings) {
    if (!ratings || ratings.length === 0) {
      return '<p class="no-ratings">No ratings yet.</p>';}

    return ratings.map(rating => {
      const username = rating.userId?.username || rating.userId?.displayName || 'Anonymous';const userAvatar = window.AvatarUtils ? 
        window.AvatarUtils.getAvatarWithFallback(rating.userId?.avatar) : 
        (rating.userId?.avatar || '/assets/img/ranks/emblem.png');
      
      return `
        <div class="rating-item-compact">
          <div class="rating-header">
            <div class="user-info">
              <img src="${userAvatar}" 
                   alt="${this.escapeHtml(username)}" 
                   class="user-avatar-small"
                   data-user-avatar
                   onerror="this.src='/assets/img/ranks/emblem.png'"
                   loading="lazy">
              <span class="username">${this.escapeHtml(username)}</span>
            </div>
            <div class="rating-stars">
              ${this.generateStarRating(rating.rating)}
            </div>
          </div>
          ${rating.comment ? `
            <div class="rating-comment">
              <p>${this.escapeHtml(rating.comment)}</p>
            </div>
          ` : ''}
          <div class="rating-date">
            ${this.formatDate(rating.createdAt)}
          </div>
        </div>
      `;}).join('');
  }

  /**
   * Improved rating comment prompt with better UX
   */
  showRatingCommentPrompt(rating, mapId, gameType = null) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'rating-prompt-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 15000;
      backdrop-filter: blur(5px);
    `;

    // Create prompt dialog
    const dialog = document.createElement('div');
    dialog.className = 'rating-prompt-dialog';
    dialog.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
      backdrop-filter: blur(20px);
      color: #f1f5f9;
      padding: 2rem;
      border-radius: 20px;
      max-width: 500px;
      width: 90%;
      box-shadow: 
        0 25px 50px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.2);
      transform: scale(0.9);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Create interactive stars
    let selectedRating = rating;
    const interactiveStarsHtml = Array.from({length: 5}, (_, i) => {
      const isActive = i < rating;
      return `<i class="rating-star ${isActive ? 'fas' : 'far'} fa-star" data-rating="${i + 1}" style="cursor: pointer;color: ${isActive ? '#ffd700' : '#6b7280'}; margin-right: 0.25rem; transition: all 0.2s ease;"></i>`;
    }).join('');
    
    dialog.innerHTML = `
      <div class="rating-prompt-header">
        <h3 style="margin: 0 0 1rem 0; color: #ffd700; font-family: 'Cinzel', serif;">
          <i class="fas fa-star"></i>
          Rate This Map
        </h3>
        <div class="rating-display" style="font-size: 1.5rem; margin-bottom: 1rem; color: #ffd700;">
          <div class="interactive-stars-rating" style="margin-bottom: 0.5rem;">
            ${interactiveStarsHtml}
          </div>
          <span class="rating-text" style="margin-left: 0.5rem; font-size: 1rem; color: #cbd5e1;">
            ${rating} out of 5 stars
          </span>
        </div>
      </div>
      
      <div class="rating-prompt-body">
        <label for="rating-comment" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
          Add a comment (optional):
        </label>
        <textarea 
          id="rating-comment" 
          placeholder="Share your thoughts about this map..."
          style="
            width: 100%;
            height: 100px;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 10px;
            color: white;
            resize: vertical;
            font-family: inherit;
            font-size: 0.9rem;
          "
        ></textarea>
      </div>
      
      <div class="rating-prompt-actions" style="
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        margin-top: 1.5rem;
      ">
        <button 
          class="cancel-rating-btn"
          style="
            padding: 0.75rem 1.5rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            color: #cbd5e1;
            cursor: pointer;
            transition: all 0.3s ease;
          "
        >
          Skip Comment
        </button>
        <div style="display: flex; gap: 1rem;">
          <button 
            class="submit-rating-btn"
            style="
              padding: 0.75rem 1.5rem;
              background: linear-gradient(135deg, #ffd700, #ffed4e);
              border: none;
              border-radius: 10px;
              color: #1a1a1a;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
            "
          >
            <i class="fas fa-star"></i>
            Submit Rating
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      dialog.style.transform = 'scale(1)';
      dialog.style.opacity = '1';
    });

    // Setup event listeners
    const cancelBtn = dialog.querySelector('.cancel-rating-btn');
    const submitBtn = dialog.querySelector('.submit-rating-btn');
    const commentTextarea = dialog.querySelector('#rating-comment');
    const stars = dialog.querySelectorAll('.rating-star');
    const ratingText = dialog.querySelector('.rating-text');

    // Setup interactive star rating
    stars.forEach((star, index) => {
      star.addEventListener('click', () => {
        selectedRating = index + 1;
        
        // Update star display
        stars.forEach((s, i) => {
          if (i < selectedRating) {
            s.classList.remove('far');
            s.classList.add('fas');
            s.style.color = '#ffd700';
          } else {
            s.classList.remove('fas');
            s.classList.add('far');
            s.style.color = '#6b7280';
          }
        });
        
        // Update rating text
        ratingText.textContent = `${selectedRating} out of 5 stars`;
      });
      
      // Hover effects
      star.addEventListener('mouseenter', () => {
        stars.forEach((s, i) => {
          if (i <= index) {
            s.style.color = '#ffd700';
            s.style.transform = 'scale(1.1)';
          } else {
            s.style.color = '#6b7280';
            s.style.transform = 'scale(1)';
          }
        });
      });
      
      star.addEventListener('mouseleave', () => {
        stars.forEach((s, i) => {
          s.style.transform = 'scale(1)';
          if (i < selectedRating) {
            s.style.color = '#ffd700';
          } else {
            s.style.color = '#6b7280';
          }
        });
      });
    });

    // Focus on textarea
    setTimeout(() => commentTextarea.focus(), 300);

    // Cancel button submits rating without comment
    cancelBtn.addEventListener('click', async () => {
      cancelBtn.disabled = true;
      cancelBtn.textContent = 'Submitting...';
      
      try {
        const result = await this.rateMap(mapId, selectedRating, '', gameType); // Submit without comment
        this.closeRatingPrompt(overlay);
        
        // Refresh current map details if it's open
        if (this.currentMapId === mapId) {
          await this.viewMapDetails(mapId);
        }
        
        // Refresh maps grid if available (but not for WC1 since it's handled by WC1Manager)
        if (window.mapsGrid && typeof window.mapsGrid.loadMaps === 'function' && gameType !== 'wc1') {
          try {
            window.mapsGrid.loadMaps();
          } catch (gridError) {
            console.warn('⚠️ Could not refresh maps grid:', gridError);
          }
        }
        
      } catch (error) {
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Skip Comment';
        console.error('❌ Failed to submit rating:', error);
      }
    });

    submitBtn.addEventListener('click', async () => {
      const comment = commentTextarea.value.trim();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      try {
        const result = await this.rateMap(mapId, selectedRating, comment, gameType);
        this.closeRatingPrompt(overlay);
        
        // Refresh current map details if it's open
        if (this.currentMapId === mapId) {
          await this.viewMapDetails(mapId);
        }
        
        // Refresh maps grid if available (but not for WC1 since it's handled by WC1Manager)
        if (window.mapsGrid && typeof window.mapsGrid.loadMaps === 'function' && gameType !== 'wc1') {
          try {
            window.mapsGrid.loadMaps();
          } catch (gridError) {
            console.warn('⚠️ Could not refresh maps grid:', gridError);
          }
        }
        
      } catch (error) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-star"></i> Submit Rating';
        console.error('❌ Failed to submit rating:', error);
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeRatingPrompt(overlay);
      }
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeRatingPrompt(overlay);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Close rating prompt
   */
  closeRatingPrompt(overlay) {
    const dialog = overlay.querySelector('.rating-prompt-dialog');
    if (dialog) {
      dialog.style.transform = 'scale(0.9)';
      dialog.style.opacity = '0';
    }
    
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }

  /**
   * Rate map API call
   */
  async rateMap(mapId, rating, comment = '', gameType = null) {
    try {
      console.log('📝 Submitting rating:', { mapId, rating, comment, gameType });
      
      // Store current game type temporarily for API endpoint determination
      const originalGameType = this.currentGameType;
      if (gameType) {
        this.currentGameType = gameType;
      }
      
      const response = await fetch(this.getRatingApiEndpoint(mapId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comment }),
        credentials: 'include'
      });

      // Restore original game type
      this.currentGameType = originalGameType;

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit rating');
      }

      const result = await response.json();
      this.showSuccess(comment ? 'Rating and comment submitted successfully!' : 'Rating submitted successfully!');
      
      // If this is a WC1 map, update the scenario card immediately
      if (gameType === 'wc1') {
        console.log('🔄 Calling WC1 updateScenarioRating for immediate UI update');
        if (window.wc1Manager && typeof window.wc1Manager.updateScenarioRating === 'function') {
          window.wc1Manager.updateScenarioRating(mapId, rating, result);
        } else {
          console.warn('⚠️ WC1Manager not available for immediate update');
        }
      }
      
      return result;} catch (error) {
      console.error('❌ Failed to rate map:', error);
      this.showError(`Failed to submit rating: ${error.message}`);
      throw error;
    }
  }

  /**
   * Highlight stars on hover
   */
  highlightStarsOnHover(rating) {
    const stars = this.mapDetailsContainer.querySelectorAll('.rating-star');
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
   * Reset star highlight to current rating
   */
  resetStarHighlight() {
    const stars = this.mapDetailsContainer.querySelectorAll('.rating-star');
    const currentRating = this.currentRating || 0;
    
    stars.forEach((star, index) => {
      const starRating = index + 1;
      
      if (starRating <= currentRating) {
        star.className = 'fas fa-star rating-star';
        star.style.color = '#ffd700';
      } else {
        star.className = 'far fa-star rating-star';
        star.style.color = '#6b7280';
      }
      star.style.transform = 'scale(1)';
    });
  }

  canEditMap(map) {
    const user = window.mapsCore?.currentUser;
    if (!user) return false;return user.role === 'admin' || map.uploadedBy === user.id;}

  canDeleteMap(map) {
    const user = window.mapsCore?.currentUser;
    if (!user) return false;return user.role === 'admin' || map.uploadedBy === user.id;}

  getGoldmineCategory(gold) {
    if (gold >= 90000) return 'veryHigh';if (gold >= 40000) return 'high';if (gold >= 25000) return 'medium';if (gold >= 10000) return 'low';return 'veryLow';}

  /**
   * Get goldmine color based on amount
   */
  getGoldmineColor(amount) {
    if (amount >= 300000) return '#FF0080';if (amount >= 200000) return '#FFD700';if (amount >= 100000) return '#FF4500';if (amount >= 50000) return '#00FFFF';if (amount >= 25000) return '#FF69B4';return '#FF0080';}

  getDefaultRaceForPlayer(playerId) {
    return (playerId % 2 === 0) ? 'Human' : 'Orc';}

  escapeHtml(text) {
    if (!text) return '';const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  capitalizeFirst(str) {
    if (!str) return '';return str.charAt(0).toUpperCase() + str.slice(1);}

  formatDate(dateString) {
    if (!dateString) return 'Unknown';const date = new Date(dateString);
    return date.toLocaleDateString();}

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
   * Cleanup resources
   */
  cleanup() {
    console.log('🧹 Cleaning up Map Details...');
    
    this.currentMapId = null;
    this.currentMapData = null;
    this.currentUserRating = null;
    
    this.removeOverlayInteractions();
    
    if (this.terrainChartInstance) {
      this.terrainChartInstance.destroy();
      this.terrainChartInstance = null;
    }

    // Remove temporary close buttons that were added for debugging
    const tempCloseButtons = document.querySelectorAll('button[style*="background: red"]');
    tempCloseButtons.forEach(btn => {
      if (btn.innerHTML === '✕ CLOSE') {
        console.log('🧹 Removing temporary close button');
        btn.remove();
      }
    });

    console.log('✅ Map Details cleanup complete');
  }

  /**
   * Remove overlay interactions and cleanup
   */
  removeOverlayInteractions() {
    console.log('🧹 Removing overlay interactions...');
    
    // Remove existing overlays
    if (this.overlayInteractions && this.overlayInteractions.parentNode) {
      this.overlayInteractions.parentNode.removeChild(this.overlayInteractions);
      this.overlayInteractions = null;
    }

    // Hide any existing tooltips
    this.hideEnhancedTooltip();
    
    // Clean up any overlay containers in the DOM
    const existingOverlays = document.querySelectorAll('.enhanced-strategic-overlays, .strategic-overlay');
    existingOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });

    console.log('✅ Overlay interactions removed');
  }

  /**
   * Create interactive strategic overlays on top of the map canvas
   */
  createInteractiveOverlays(mapData, strategicData) {
    if (!mapData || !strategicData) {
      console.log('⚠️ No map data or strategic data for overlays');
      return;}

    // Fix: Use the correct selectors that exist in the DOM
    const mapContainer = document.querySelector('.map-image-container');
    const mapImage = document.querySelector('.map-details-thumbnail-epic');
    
    if (!mapContainer || !mapImage) {
      console.log('⚠️ Map container or image not found for overlays');
      console.log('Container found:', !!mapContainer);
      console.log('Image found:', !!mapImage);
      console.log('Available containers:', document.querySelectorAll('[class*="map"]').length);
      return;}

    console.log('🎯 Creating interactive overlays for map:', mapData.name);

    // Wait for image to load before creating overlays
    if (mapImage.complete && mapImage.naturalWidth > 0) {
      this.createEnhancedOverlays(mapContainer, mapImage, mapData);
    } else {
      mapImage.addEventListener('load', () => {
        this.createEnhancedOverlays(mapContainer, mapImage, mapData);
      });
      
      // Fallback timeout
      setTimeout(() => {
        if (mapImage.complete) {
          this.createEnhancedOverlays(mapContainer, mapImage, mapData);
        }
      }, 1500);
    }
  }

  /**
   * Create enhanced overlays with improved positioning
   */
  createEnhancedOverlays(container, mapImage, map) {
    if (!container || !mapImage) {
      console.warn('❌ Missing container or image for overlays');
      return;}

    // Check both possible data sources for strategic information
    const strategicData = map.strategicData || map.strategicAnalysis || {};
    
    console.log('🔍 MapDetails Strategic data for overlays:', {
      strategicData,
      hasGoldmines: !!(strategicData.goldmines && strategicData.goldmines.length > 0),
      hasStartingPositions: !!(strategicData.startingPositions && strategicData.startingPositions.length > 0),
      goldmineCount: strategicData.goldmines?.length || 0,
      startingPositionCount: strategicData.startingPositions?.length || 0,
      dataSource: map.strategicData ? 'strategicData' : map.strategicAnalysis ? 'strategicAnalysis' : 'none'
    });
    
    // If no strategic data found, try to get it from the map's strategic analysis
    if (!strategicData.goldmines && !strategicData.startingPositions) {
      console.log('🔍 No strategic data found, checking map.strategicAnalysis...');
      if (map.strategicAnalysis) {
        console.log('🔍 Found strategicAnalysis:', map.strategicAnalysis);
        // Use strategicAnalysis data instead
        strategicData.goldmines = map.strategicAnalysis.goldmines || [];
        strategicData.startingPositions = map.strategicAnalysis.startingPositions || [];
        console.log('🔍 Updated strategicData with strategicAnalysis:', strategicData);
      }
    }
    
    // Final check for data availability
    const hasGoldmines = !!(strategicData.goldmines && strategicData.goldmines.length > 0);
    const hasStartingPositions = !!(strategicData.startingPositions && strategicData.startingPositions.length > 0);
    
    console.log('🔍 Final strategic data check:', {
      hasGoldmines,
      hasStartingPositions,
      goldmines: strategicData.goldmines,
      startingPositions: strategicData.startingPositions
    });
    
    // If still no data, log and return early
    if (!hasGoldmines && !hasStartingPositions) {
      console.warn('❌ No strategic data available for overlays');return;}
    
    // Remove existing overlays
    const existingOverlays = container.querySelectorAll('.enhanced-strategic-overlays');
    existingOverlays.forEach(overlay => overlay.remove());

    // Create overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'enhanced-strategic-overlays';
    overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 20010;
      background: rgba(255, 0, 0, 0.1);
      border: 2px solid red;
    `;
    container.appendChild(overlayContainer);
    
    console.log('🔍 MapDetails Overlay container created with styles:', overlayContainer.style.cssText);
    console.log('🔍 MapDetails Overlay container z-index:', getComputedStyle(overlayContainer).zIndex);
    
    // Ensure the container has relative positioning to contain absolute overlays
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
      console.log('🔧 Set container position to relative');
    }
    
    console.log('🔍 MapDetails Overlay container debug:', {
      overlayContainer: overlayContainer,
      containerBounds: overlayContainer.getBoundingClientRect(),
      containerStyle: overlayContainer.style.cssText,
      parentBounds: container.getBoundingClientRect()
    });
    
    console.log('🎯 MapDetails Overlay container created:', {
      container: container,
      overlayContainer: overlayContainer,
      containerPosition: getComputedStyle(container).position,
      containerDimensions: { width: container.offsetWidth, height: container.offsetHeight }
    });

    // Wait for image to be fully loaded and visible
    const setupOverlays = () => {
      // Enhanced image dimension calculation for different contexts
      let imageWidth, imageHeight;
      const imageRect = mapImage.getBoundingClientRect();
      
      // Determine display context and calculate proper dimensions
      const isFullscreen = container.classList.contains('fullscreen-image-container');
      const isMapDetails = container.classList.contains('map-image-container');
      
      console.log('🔍 MapDetails Container detection:', {
        isFullscreen,
        isMapDetails,
        containerClasses: container.className,
        containerElement: container
      });
      
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
        
        console.log('🖼️ MapDetails fullscreen dimensions calculated:', {
          container: { width: containerWidth, height: containerHeight },
          natural: { width: mapImage.naturalWidth, height: mapImage.naturalHeight, aspect: naturalAspect },
          calculated: { width: imageWidth, height: imageHeight }
        });
      } else if (isMapDetails) {
        // For map details modal: use offset dimensions (this is the main details view)
        imageWidth = mapImage.offsetWidth || imageRect.width;
        imageHeight = mapImage.offsetHeight || imageRect.height;
        
        console.log('📱 MapDetails modal dimensions used:', { imageWidth, imageHeight, isMapDetails: true });
      } else {
        // For other contexts (like grid cards): use offset dimensions
        imageWidth = mapImage.offsetWidth || imageRect.width;
        imageHeight = mapImage.offsetHeight || imageRect.height;
        
        console.log('📱 MapDetails other context dimensions used:', { imageWidth, imageHeight, context: 'other' });
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
      
      // Calculate actual coordinate bounds from the data (similar to War3 system)
      const coordinateBounds = this.calculateWar2CoordinateBounds(strategicData);

      // Only proceed if we have valid dimensions
      if (imageWidth === 0 || imageHeight === 0) {
        console.log('⏳ Image not fully loaded yet, waiting for load event...');
        return;}

      // Create goldmine overlays (War2 uses new direct tooltip system - no separate tooltip areas)
      if (strategicData.goldmines && Array.isArray(strategicData.goldmines)) {
        strategicData.goldmines.forEach((goldmine, index) => {
          this.createGoldmineOverlay(overlayContainer, goldmine, index, imageWidth, imageHeight, mapWidth, mapHeight, isFullscreen, coordinateBounds, mapImage);
        });
      }

      // Create starting position overlays (War2 uses new direct tooltip system - no separate tooltip areas)
      if (strategicData.startingPositions && Array.isArray(strategicData.startingPositions)) {
        strategicData.startingPositions.forEach((position, index) => {
          this.createStartingPositionOverlay(overlayContainer, position, index, imageWidth, imageHeight, mapWidth, mapHeight, isFullscreen, coordinateBounds, mapImage);
        });
      }

      // IMPORTANT: For War2 maps, we DON'T create any additional tooltip areas 
      // beyond the overlays themselves, since the new system attaches tooltips directly to overlays.
      // This prevents the old white circle tooltip areas from appearing.


    };

    // Set up overlays when image is ready
    if (mapImage.complete && mapImage.naturalHeight !== 0) {
      // Image already loaded, set up overlays immediately
      setupOverlays();
    } else {
      // Image still loading, wait for the load event
      mapImage.addEventListener('load', setupOverlays);
    }
  }

  /**
   * Show War2-specific tooltip
   */
  showWar2Tooltip(event, data, type) {
    console.log('🎯 Creating War2 tooltip:', type, data);
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
    
    console.log('🎯 Tooltip z-index set to:', zIndex, 'Fullscreen detected:', isInFullscreen);

    let tooltipContent = '';
    if (type === 'goldmine') {
      const goldFormatted = data.gold ? data.gold.toLocaleString() : '0';
      tooltipContent = `
        <div style="font-weight: bold; color: #FFD700;">${data.name}</div>
        <div style="margin-top: 4px;">Gold: ${goldFormatted}</div>
        <div>Category: ${data.category}</div>
        <div style="color: #ccc; font-size: 10px; margin-top: 4px;">Location: ${data.location}</div>
      `;
    } else if (type === 'player') {
      tooltipContent = `
        <div style="font-weight: bold; color: #87CEEB;">${data.name}</div>
        <div style="margin-top: 4px;">Race: ${data.race}</div>
        <div style="color: #ccc; font-size: 10px; margin-top: 4px;">Location: ${data.location}</div>
      `;
    }

    tooltip.innerHTML = tooltipContent;
    document.body.appendChild(tooltip);

    // Position tooltip near cursor but avoid screen edges
    const x = event.clientX + 15;
    const y = event.clientY - 40;
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    
    console.log('🎯 Tooltip positioned at:', x, y, 'Content:', tooltipContent.replace(/<[^>]*>/g, '').trim());

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
    
    console.log(`🗺️ War2 MapDetails Transform: world(${worldX}, ${worldY}) → normalized(${normalizedX.toFixed(3)}, ${normalizedY.toFixed(3)}) → percent(${leftPercent.toFixed(1)}%, ${topPercent.toFixed(1)}%)`);
    
    return { leftPercent, topPercent };}

  /**
   * Create goldmine overlay element
   */
  createGoldmineOverlay(container, goldmine, index, imageWidth, imageHeight, mapWidth = 128, mapHeight = 128, isFullscreen = false, coordinateBounds = null, mapImage = null) {
    const overlay = document.createElement('div');
    overlay.className = 'enhanced-goldmine-overlay';
    
    // War2 coordinate transformation - appears to use 0-128 range, not negative coords
    let leftPercent, topPercent;
    
    // Debug the coordinate ranges we're working with
    console.log(`🔍 War2 Goldmine coords: (${goldmine.x}, ${goldmine.y}), bounds: X(${coordinateBounds?.minX}, ${coordinateBounds?.maxX}) Y(${coordinateBounds?.minY}, ${coordinateBounds?.maxY})`);
    
    if (coordinateBounds && (coordinateBounds.maxX > 128 || coordinateBounds.minX < 0)) {
      // Use bounds-based transformation for maps with extended coordinate ranges
      const transformed = this.transformWar2Coordinates(goldmine.x, goldmine.y, coordinateBounds);
      leftPercent = transformed.leftPercent;
      topPercent = transformed.topPercent;
      console.log(`📍 War2 MapDetails Goldmine bounds-based (${isFullscreen ? 'fullscreen' : 'detail'}): leftPercent=${leftPercent.toFixed(1)}%, topPercent=${topPercent.toFixed(1)}%`);
    } else {
      // Use actual map dimensions instead of assuming 128x128
      leftPercent = (goldmine.x / mapWidth) * 100;
      topPercent = (goldmine.y / mapHeight) * 100; // War2 Y=0 is TOP, no flip needed!
      console.log(`📍 War2 MapDetails Goldmine standard (${isFullscreen ? 'fullscreen' : 'detail'}): leftPercent=${leftPercent.toFixed(1)}%, topPercent=${topPercent.toFixed(1)}% [using mapSize ${mapWidth}x${mapHeight}] - NO Y-FLIP`);
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
       

     }
    
    // Handle different field names for gold amount
    const goldAmount = goldmine.amount || goldmine.gold || goldmine.goldAmount || 0;
    const goldColor = this.getGoldmineColor(goldAmount);
    
    // Calculate size based on image size for better scaling
    const baseSize = isFullscreen ? 
      Math.max(16, Math.min(imageWidth, imageHeight) * 0.02) : 
      Math.max(20, Math.min(imageWidth, imageHeight) * 0.04); // Larger for details view
    

    
    // Style the overlay with much more vibrant colors and better visibility
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
      z-index: 1001;
      pointer-events: auto;
      transition: all 0.2s ease;
      border: 2px solid lime !important;
      background-color: rgba(255, 255, 0, 0.8) !important;
    `;

    // Add hover effects with War2-specific tooltip data
    overlay.addEventListener('mouseenter', (e) => {

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

      this.hideWar2Tooltip();
      overlay.style.transform = 'translate(-50%, -50%) scale(1)';
      overlay.style.boxShadow = `0 0 15px ${goldColor}`;
    });

    container.appendChild(overlay);

  }

  /**
   * Create starting position overlay element
   */
  createStartingPositionOverlay(container, position, index, imageWidth, imageHeight, mapWidth = 128, mapHeight = 128, isFullscreen = false, coordinateBounds = null, mapImage = null) {
    const overlay = document.createElement('div');
    overlay.className = 'enhanced-starting-position-overlay';
    
    // War2 coordinate transformation - appears to use 0-128 range, not negative coords
    let leftPercent, topPercent;
    

    
    if (coordinateBounds && (coordinateBounds.maxX > 128 || coordinateBounds.minX < 0)) {
      // Use bounds-based transformation for maps with extended coordinate ranges
      const transformed = this.transformWar2Coordinates(position.x, position.y, coordinateBounds);
      leftPercent = transformed.leftPercent;
      topPercent = transformed.topPercent;

    } else {
      // Use actual map dimensions instead of assuming 128x128
      leftPercent = (position.x / mapWidth) * 100;
      topPercent = (position.y / mapHeight) * 100; // War2 Y=0 is TOP, no flip needed!
      console.log(`📍 War2 MapDetails Position standard (${isFullscreen ? 'fullscreen' : 'detail'}): leftPercent=${leftPercent.toFixed(1)}%, topPercent=${topPercent.toFixed(1)}% [using mapSize ${mapWidth}x${mapHeight}] - NO Y-FLIP`);
    }
    
         // FIXED: Improved positioning for fullscreen mode
     if (isFullscreen) {
       const imageElement = container.querySelector('.fullscreen-image');
       if (imageElement) {
         // Get the actual displayed image dimensions and position
         const imageRect = imageElement.getBoundingClientRect();
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
         

       }
     }
    
    const playerColor = this.getPlayerColor(position.race || 'unknown');
    
    // Calculate size based on image size for better scaling
    const baseSize = isFullscreen ? 
      Math.max(18, Math.min(imageWidth, imageHeight) * 0.025) : 
      Math.max(24, Math.min(imageWidth, imageHeight) * 0.05); // Larger for details view
    const fontSize = Math.max(10, baseSize * 0.6);
    

    
    // Style the overlay with much more vibrant colors and better visibility
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
      z-index: 1001;
      pointer-events: auto;
      display: flex;
      border: 2px solid blue !important;
      background-color: rgba(0, 255, 255, 0.8) !important;
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
   * Get goldmine color based on amount
   */
  getGoldmineColor(amount) {
    if (amount >= 300000) return '#FF0080';if (amount >= 200000) return '#FFD700';if (amount >= 100000) return '#FF4500';if (amount >= 50000) return '#00FFFF';if (amount >= 25000) return '#FF69B4';return '#FF0080';}

  /**
   * Get player color based on race
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
   * Show enhanced tooltip
   */
  showEnhancedTooltip(event, data, type) {
    this.hideEnhancedTooltip(); // Remove any existing tooltip

    const tooltip = document.createElement('div');
    tooltip.className = 'enhanced-tooltip';
    tooltip.id = 'enhanced-tooltip';

    if (type === 'goldmine') {
      // Handle different field names from database
      const goldAmount = data.amount || data.gold || data.goldAmount || 0;
      const category = this.getGoldmineCategory(goldAmount);
      tooltip.innerHTML = `
        <div class="tooltip-header goldmine-header">
          <i class="fas fa-coins"></i>
          <span>Goldmine</span>
        </div>
        <div class="tooltip-content">
          <div class="tooltip-stat">
            <span class="stat-label">Amount:</span>
            <span class="stat-value gold-value">${goldAmount > 0 ? goldAmount.toLocaleString() : 'Unknown'}</span>
          </div>
          <div class="tooltip-stat">
            <span class="stat-label">Category:</span>
            <span class="stat-value category-${category}">${this.formatCategory(category)}</span>
          </div>
          <div class="tooltip-stat">
            <span class="stat-label">Position:</span>
            <span class="stat-value">(${data.x || 0}, ${data.y || 0})</span>
          </div>
        </div>
      `;
    } else if (type === 'player') {
      // Handle different field names and provide better player identification
      const playerId = data.playerId !== undefined ? data.playerId + 1 : 
                      data.player !== undefined ? data.player + 1 : 
                      data.id !== undefined ? data.id + 1 : 'Unknown';
      
      // Get race from different possible fields or assign default based on player ID
      let race = data.race;
      if (!race && data.playerId !== undefined) {
        race = this.getDefaultRaceForPlayer(data.playerId);
      } else if (!race && data.player !== undefined) {
        race = this.getDefaultRaceForPlayer(data.player);
      } else if (!race) {
        race = 'Human'; // Default fallback
      }
      
      tooltip.innerHTML = `
        <div class="tooltip-header player-header">
          <i class="fas fa-user"></i>
          <span>Player Start</span>
        </div>
        <div class="tooltip-content">
          <div class="tooltip-stat">
            <span class="stat-label">Player:</span>
            <span class="stat-value">${playerId}</span>
          </div>
          <div class="tooltip-stat">
            <span class="stat-label">Race:</span>
            <span class="stat-value race-${(race || 'unknown').toLowerCase()}">${this.formatRace(race)}</span>
          </div>
          <div class="tooltip-stat">
            <span class="stat-label">Position:</span>
            <span class="stat-value">(${data.x || 0}, ${data.y || 0})</span>
          </div>
        </div>
      `;
    }

    document.body.appendChild(tooltip);

    // Position tooltip
    const rect = tooltip.getBoundingClientRect();
    const x = event.clientX + 10;
    const y = event.clientY - rect.height - 10;

    tooltip.style.left = `${Math.min(x, window.innerWidth - rect.width - 10)}px`;
    tooltip.style.top = `${Math.max(y, 10)}px`;
  }

  /**
   * Hide enhanced tooltip
   */
  hideEnhancedTooltip() {
    const tooltip = document.getElementById('enhanced-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Format category name for display
   */
  formatCategory(category) {
    const categoryMap = {
      'very-high': 'Very High',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
      'very-low': 'Very Low',
      'veryHigh': 'Very High',
      'veryLow': 'Very Low'
    };
    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);}

  /**
   * Get goldmine category based on amount - updated thresholds
   */
  getGoldmineCategory(amount) {
    if (amount >= 50000) return 'very-high';if (amount >= 30000) return 'high';if (amount >= 20000) return 'medium';if (amount >= 10000) return 'low';return 'very-low';}

  /**
   * Get default race for player based on ID
   */
  getDefaultRaceForPlayer(playerId) {
    if (typeof playerId === 'number') {
      return (playerId % 2 === 0) ? 'Human' : 'Orc';}
    return 'Human';}

  /**
   * Format race name for display
   */
  formatRace(race) {
    if (!race) return 'Unknown';return race.charAt(0).toUpperCase() + race.slice(1).toLowerCase();}

  /**
   * Render compact strategic analysis section
   */
  renderStrategicAnalysisCompact(map) {
    const strategicData = map.strategicData || map.strategicAnalysis || {};
    
    if (!strategicData || (!strategicData.goldmines && !strategicData.startingPositions && !strategicData.terrain)) {
      return `
        <div class="strategic-analysis-compact">
          <div class="analysis-note">
            <i class="fas fa-info-circle"></i>
            Strategic analysis data not available for this map.
          </div>
        </div>
      `;}

    let analysisHtml = '<div class="strategic-analysis-compact">';
    
    // Strategic stats grid
    const goldmineCount = strategicData.goldmines?.length || 0;
    const playerCount = strategicData.startingPositions?.length || map.playerCount || 0;
    const mapSize = strategicData.dimensions ? `${strategicData.dimensions.width}x${strategicData.dimensions.height}` : map.size || 'Unknown';
    
    analysisHtml += `
      <div class="analysis-stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-coins"></i>
          </div>
          <div class="stat-info">
            <div class="stat-number">${goldmineCount}</div>
            <div class="stat-label">Goldmines</div>
            <div class="stat-detail">Resource points</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="stat-info">
            <div class="stat-number">${playerCount}</div>
            <div class="stat-label">Players</div>
            <div class="stat-detail">Starting positions</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-expand-arrows-alt"></i>
          </div>
          <div class="stat-info">
            <div class="stat-number">${mapSize}</div>
            <div class="stat-label">Map Size</div>
            <div class="stat-detail">Dimensions</div>
          </div>
        </div>
      </div>
    `;

    // Terrain breakdown if available  
    const processedTerrain = this.getProcessedTerrainData(map);
    if (processedTerrain && Object.keys(processedTerrain).length > 0) {
      analysisHtml += this.renderTerrainDetailsCompact(processedTerrain);
      // Add terrain chart to strategic analysis
      analysisHtml += `
        <div class="terrain-analysis-section">
          ${this.renderCompactTerrainChart(map)}
        </div>
      `;
    }

    // Strategic note
    analysisHtml += `
      <div class="analysis-note">
        <i class="fas fa-lightbulb"></i>
        Hover over the map image to see strategic overlays with goldmine locations and player starting positions.
      </div>
    `;

    analysisHtml += '</div>';
    return analysisHtml;}

  /**
   * Get processed terrain data that prioritizes individual percentage fields
   */
  getProcessedTerrainData(map) {
    const strategicData = map.strategicData || map.strategicAnalysis || {};
    
    console.log('🗺️ Debug terrain data for map:', map.name);
    console.log('📊 Strategic data available:', Object.keys(strategicData));
    console.log('🔍 All percentage fields:', Object.keys(strategicData).filter(key => key.includes('Percentage')));
    console.log('🏔️ Terrain distribution object:', strategicData.terrainDistribution);
    console.log('🌍 Raw terrain object:', strategicData.terrain);
    
    // ALWAYS prioritize individual percentage fields if they exist (these are the correct ones)
    let terrain = {};
    
    // Simplified terrain system: Land/Trees/Water/Rocks only
    const terrainFieldMappings = [
      { fields: ['waterPercentage'], type: 'water' },
      { fields: ['treePercentage', 'forestPercentage'], type: 'trees' },
      { fields: ['rockPercentage', 'stonePercentage'], type: 'rocks' },
      // Combine all land-based terrain into "land"
      { fields: ['grassPercentage', 'shorePercentage', 'coastPercentage', 'dirtPercentage', 'mudPercentage', 'groundPercentage', 'snowPercentage', 'icePercentage', 'sandPercentage'], type: 'land' }
    ];
    
    // Process main terrain types first
    terrainFieldMappings.forEach(mapping => {
      for (const field of mapping.fields) {
        if (strategicData[field] !== undefined && parseFloat(strategicData[field]) > 0) {
          if (!terrain[mapping.type]) terrain[mapping.type] = 0;
          terrain[mapping.type] += parseFloat(strategicData[field]);
          console.log(`✅ Added to ${mapping.type}: ${field} = ${parseFloat(strategicData[field]).toFixed(1)}%`);
        }
      }
    });
    
    // Collect any remaining terrain into "land" category
    Object.keys(strategicData).forEach(key => {
      if (key.toLowerCase().includes('percentage') && key !== 'totalPercentage') {
        const value = parseFloat(strategicData[key]);
        if (value > 0) {
          const alreadyProcessed = terrainFieldMappings.some(mapping => 
            mapping.fields.some(field => field.toLowerCase() === key.toLowerCase())
          );
          
          if (!alreadyProcessed) {
            if (!terrain.land) terrain.land = 0;
            terrain.land += value;
            console.log(`✅ Added to land category: ${key} = ${value.toFixed(1)}%`);
          }
        }
      }
    });
    
    // Fallback to raw terrain distribution only if individual percentages are not available
    if (Object.keys(terrain).length === 0) {
      const rawTerrain = strategicData.terrain || strategicData.terrainDistribution || {};
      
      // Convert raw tile counts to percentages if needed
      const mapDimensions = map.dimensions || { width: 128, height: 128 };
      const totalTiles = mapDimensions.width * mapDimensions.height;
      
      Object.entries(rawTerrain).forEach(([key, value]) => {
        let percentage = parseFloat(value);
        // If value seems to be in tile count (>100), convert to percentage
        if (percentage > 100) {
          percentage = (percentage / totalTiles) * 100;
        }
        
        if (percentage > 0 && percentage <= 100) {
          terrain[key] = percentage;
          console.log(`✅ Added terrain type: ${key} = ${percentage.toFixed(1)}%`);
        }
      });
      
      console.log('🎯 Final processed terrain data:', terrain);
    }
    
    // Calculate the total percentage to identify missing terrain
    const totalPercentage = Object.values(terrain).reduce((sum, percent) => sum + percent, 0);
    console.log(`📊 Total terrain percentage: ${totalPercentage.toFixed(1)}%`);
    
    // If we're missing significant terrain (more than 1%), add "Other" category
    if (totalPercentage < 99 && totalPercentage > 0) {
      const missingPercentage = 100 - totalPercentage;
      terrain.other = missingPercentage;
      console.log(`➕ Added missing terrain as "Other": ${missingPercentage.toFixed(1)}%`);
    }
    
    return terrain;}

  /**
   * Render compact terrain details
   */
  renderTerrainDetailsCompact(terrain) {
    if (!terrain || typeof terrain !== 'object') return '';const terrainEntries = Object.entries(terrain).filter(([key, value]) => value > 0);
    if (terrainEntries.length === 0) return '';let terrainHtml = `
      <div class="terrain-details-compact">
        <h4><i class="fas fa-mountain"></i> Terrain Composition</h4>
        <div class="terrain-grid">
    `;

    terrainEntries.forEach(([terrainType, percentage]) => {
      const colorClass = this.getTerrainColorClass(terrainType);
      terrainHtml += `
        <div class="terrain-item-compact">
          <div class="terrain-color-indicator ${colorClass}"></div>
          <div class="terrain-percentage-compact">${percentage.toFixed(1)}%</div>
          <div class="terrain-name-compact">${this.formatTerrainName(terrainType)}</div>
        </div>
      `;
    });

    terrainHtml += `
        </div>
      </div>
    `;

    return terrainHtml;}

  /**
   * Get terrain color class for styling
   */
  getTerrainColorClass(terrainType) {
    const colorMap = {
      'water': 'terrain-color water',
      'land': 'terrain-color land', 
      'trees': 'terrain-color trees',
      'rocks': 'terrain-color rocks',
      'other': 'terrain-color other'
    };
    return colorMap[terrainType.toLowerCase()] || 'terrain-color land';}

  /**
   * Format terrain name for display
   */
  formatTerrainName(terrainType) {
    const nameMap = {
      'water': 'Water',
      'land': 'Land',
      'trees': 'Trees',
      'rocks': 'Rocks',
      'other': 'Other'
    };
    return nameMap[terrainType.toLowerCase()] || this.capitalizeFirst(terrainType);}

  /**
   * Initialize header star rating functionality
   */
  initializeHeaderStarRating(map) {
    console.log('⭐ Initializing header star rating...');
    
    const headerRatingSection = document.getElementById('header-rating-section');
    if (!headerRatingSection) {
      console.log('⚠️ Header rating section not found');
      return;}
    
    // Get current user
    const currentUser = window.mapsCore?.currentUser;
    if (!currentUser) {
      console.log('👤 No user logged in, header rating disabled');
      return;}
    
    // Find user's existing rating
    const ratings = map.ratings || [];
    const existingRating = ratings.find(r => 
      r.userId === currentUser.id || 
      r.userId?._id === currentUser.id ||
      r.userId?.toString() === currentUser.id
    );
    
    if (existingRating) {
      this.currentUserRating = existingRating.rating;
      console.log(`⭐ Found existing user rating: ${existingRating.rating}`);
    }
    
    console.log('✅ Header star rating initialized');
  }

  /**
   * Initialize enhanced interactive map with working fullscreen
   */
  initializeEnhancedInteractiveMap(map) {
    console.log('🗺️ Initializing enhanced interactive map for:', map.name);
    
    // Create enhanced overlays for goldmines and starting positions
    this.createEnhancedOverlays(document.getElementById('map-image-container'), 
                               document.querySelector('.map-details-thumbnail-epic'), map);
    
    // Setup fullscreen functionality for modal image
    const fullscreenBtn = document.querySelector('.map-details-fullscreen-btn');
    const mapImage = document.querySelector('.map-details-thumbnail-epic');
    
    if (fullscreenBtn && mapImage) {
      // Remove any existing event listeners
      fullscreenBtn.replaceWith(fullscreenBtn.cloneNode(true));
      const newFullscreenBtn = document.querySelector('.map-details-fullscreen-btn');
      
      newFullscreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.openFullscreenImageWithOverlays(mapImage.src, map.name, map);
      });
      
      
    }
  }

  /**
   * Open fullscreen image with overlays - Fixed implementation
   */
  openFullscreenImageWithOverlays(imageUrl, mapName, mapData) {
    // Check if this is a WC2 map and use dedicated modal
    if (mapData && mapData.game === 'wc2') {
      this.openWC2FullscreenImageWithOverlays(imageUrl, mapName, mapData);
      return;}
    
    // Remove any existing fullscreen modal
    const existingModal = document.getElementById('fullscreen-modal-enhanced');
    if (existingModal) {
      existingModal.remove();
    }

    // IMPORTANT: For War2 maps, explicitly remove any potential old tooltip areas
    // that might be leftover from other systems before creating fullscreen
    const oldTooltipAreas = document.querySelectorAll('[style*="rgba(255, 215, 0"], .interactive-overlay, .hover-area, .tooltip-area, .goldmine-hover-area, .player-hover-area');
    oldTooltipAreas.forEach(area => {
      area.remove();
    });

    // Create fullscreen modal using CSS classes
    const modal = document.createElement('div');
    modal.id = 'fullscreen-modal-enhanced';
    modal.className = 'modal'; // Will start hidden due to CSS

    // Create container with proper structure
    const container = document.createElement('div');
    container.className = 'fullscreen-image-container';

    // Create close button
    const closeButton = document.createElement('span');
    closeButton.className = 'close-modal';
    closeButton.id = 'close-fullscreen-enhanced';
    closeButton.innerHTML = '×';

    // Create image
    const img = document.createElement('img');
    img.className = 'fullscreen-image';
    img.alt = `${mapName} - Fullscreen`;
    img.src = imageUrl;

    // Assemble the modal
    container.appendChild(img);
    modal.appendChild(closeButton);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // Show modal with animation using CSS class
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Handle image load for overlays with better timing
    const createOverlays = (attempts = 0) => {
      const maxAttempts = 20; // Max 2 seconds of retries
      
      if (mapData) {
        // Wait for CSS transitions and layout to complete, ensure dimensions are available
        setTimeout(() => {
          // Check if modal is still open and image has proper dimensions
          const modalStillOpen = modal.style.display !== 'none' && modal.parentNode;
          if (!modalStillOpen) {
            return;}
          
          if (img.offsetWidth > 0 && img.offsetHeight > 0 && img.complete) {
            // Clear any potential old overlays before creating new ones
            const existingOverlays = container.querySelectorAll('.enhanced-strategic-overlays, .interactive-overlay, .strategic-overlay');
            existingOverlays.forEach(overlay => overlay.remove());
            
            this.createEnhancedOverlays(container, img, mapData);
          } else if (attempts < maxAttempts) {
            // Retry if image dimensions aren't ready yet
            createOverlays(attempts + 1);
          }
        }, attempts === 0 ? 250 : 100); // Longer initial delay, shorter retries
      }
    };

    if (img.complete && img.naturalHeight !== 0) {
      createOverlays();
    } else {
      img.onload = createOverlays;
    }

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


  }

  /**
   * Open WC2 fullscreen image with overlays using dedicated modal
   */
  openWC2FullscreenImageWithOverlays(imageUrl, mapName, mapData) {
    // Remove any existing WC2 fullscreen modal
    const existingModal = document.querySelector('.wc2-fullscreen-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // IMPORTANT: For War2 maps, explicitly remove any potential old tooltip areas
    // that might be leftover from other systems before creating fullscreen
    const oldTooltipAreas = document.querySelectorAll('[style*="rgba(255, 215, 0"], .interactive-overlay, .hover-area, .tooltip-area, .goldmine-hover-area, .player-hover-area');
    oldTooltipAreas.forEach(area => {
      area.remove();
    });

    // Create WC2 fullscreen modal
    const modal = document.createElement('div');
    modal.className = 'wc2-fullscreen-modal';

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'wc2-fullscreen-container';

    // Create close button
    const closeButton = document.createElement('span');
    closeButton.className = 'close-modal';
    closeButton.id = 'close-wc2-fullscreen';
    closeButton.innerHTML = '×';

    // Create image
    const img = document.createElement('img');
    img.className = 'wc2-fullscreen-image';
    img.alt = `${mapName} - Fullscreen`;
    img.src = imageUrl;

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
          const modalStillOpen = modal.classList.contains('show') && modal.parentNode;
          if (!modalStillOpen) {
            return;}

          if (img.offsetWidth > 0 && img.offsetHeight > 0 && img.complete) {
            // Clear any potential old overlays before creating new ones
            const existingOverlays = imageContainer.querySelectorAll('.enhanced-strategic-overlays, .interactive-overlay, .strategic-overlay');
            existingOverlays.forEach(overlay => overlay.remove());
            
            this.createEnhancedOverlays(imageContainer, img, mapData, true); // true for fullscreen
          } else if (attempts < maxAttempts) {
            // Retry if image dimensions aren't ready yet
            createOverlays(attempts + 1);
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
   * Render terrain chart section
   */
  renderTerrainChart(map) {
    const strategicData = map.strategicData || map.strategicAnalysis || {};
    const terrain = strategicData.terrain || strategicData.terrainDistribution || {};
    
    if (!terrain || Object.keys(terrain).length === 0) {
      return '';}

    return `
      <div class="terrain-chart-section">
        <div class="section-header-chart">
          <h3><i class="fas fa-chart-pie"></i> Terrain Distribution</h3>
        </div>
        <div class="chart-container">
          <canvas id="terrain-chart" width="400" height="200"></canvas>
        </div>
      </div>
    `;}

  /**
   * Initialize terrain chart using Chart.js
   */
  initializeTerrainChart(map) {
    const canvas = document.getElementById('terrain-chart');
    if (!canvas) return;const strategicData = map.strategicData || map.strategicAnalysis || {};
    
    // Get terrain data from multiple possible sources
    let terrain = strategicData.terrain || strategicData.terrainDistribution || {};
    
    // If terrain is empty, try to construct from individual percentages
    if (!terrain || Object.keys(terrain).length === 0) {
      terrain = {};
      if (strategicData.waterPercentage && parseFloat(strategicData.waterPercentage) > 0) {
        terrain.water = parseFloat(strategicData.waterPercentage);
      }
      if (strategicData.treePercentage && parseFloat(strategicData.treePercentage) > 0) {
        terrain.trees = parseFloat(strategicData.treePercentage);
      }
      if (strategicData.grassPercentage && parseFloat(strategicData.grassPercentage) > 0) {
        terrain.grass = parseFloat(strategicData.grassPercentage);
      }
    }
    
    if (!terrain || Object.keys(terrain).length === 0) {
      console.log('No terrain data available for chart');
      return;}

    // Destroy existing chart if it exists
    if (this.terrainChartInstance) {
      this.terrainChartInstance.destroy();
    }

    // Prepare data for Chart.js - filter out zero values and combine shore with water
    const labels = [];
    const data = [];
    const colors = [];
    
    const terrainColors = {
      'water': '#4A90E2',
      'grass': '#7ED321',
      'trees': '#228B22', 
      'rocks': '#8B7355',
      'rock': '#8B7355',
      'walls': '#696969',
      'ground': '#D2B48C',
      'dirt': '#D2B48C'
    };

    // Process terrain data and combine shore with water
    const processedTerrain = {};
    Object.entries(terrain).forEach(([terrainType, percentage]) => {
      const value = parseFloat(percentage);
      if (!isNaN(value) && value > 0 && terrainType) {
        const lowerType = terrainType.toLowerCase();
        if (lowerType === 'shore' || lowerType === 'coast') {
          // Combine shore/coast with water
          processedTerrain.water = (processedTerrain.water || 0) + value;
        } else {
          processedTerrain[lowerType] = value;
        }
      }
    });

    // Filter and process final terrain data
    Object.entries(processedTerrain).forEach(([terrainType, percentage]) => {
      if (percentage > 0) {
        labels.push(this.formatTerrainName(terrainType));
        data.push(percentage);
        colors.push(terrainColors[terrainType] || '#BDC3C7');
      }
    });

    // Don't create chart if no valid data
    if (data.length === 0) {
      console.log('No valid terrain data for chart');
      canvas.style.display = 'none';
      return;}

    // Create chart
    const ctx = canvas.getContext('2d');
    this.terrainChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ffffff',
              font: {
                size: 12
              },
              generateLabels: function(chart) {
                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                const labels = original.call(this, chart);
                
                // Ensure we have matching data for each label
                labels.forEach((label, index) => {
                  if (data[index] !== undefined) {
                    label.text = `${label.text}: ${data[index].toFixed(1)}%`;
                  }
                });
                
                return labels.filter(label => label.text && !label.text.includes('undefined'));}
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.parsed.toFixed(1)}%`;}
            }
          }
        }
      }
    });
  }

  /**
   * Show match history for map
   */
  async showMatchHistory(mapId) {
    try {
      console.log('🏆 Loading match history for map:', mapId);
      
      // Determine the game type from the current context
      const currentGame = this.getCurrentGame();
      
      // Use the new unified matches endpoint
      const endpoint = `/api/matches/map/${currentGame}/${mapId}`;
      
      console.log(`📊 Fetching match history from: ${endpoint}`);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Loaded ${result.data.matches.length} matches for map ${mapId}`);
        this.displayMatchHistoryModal(result.data, mapId);
      } else {
        throw new Error(result.message || 'Failed to load match history');
      }
      
    } catch (error) {
      console.error('❌ Failed to load match history:', error);
      
      // Show error message
      this.displayMatchHistoryModal({ 
        matches: [], 
        pagination: { totalMatches: 0 },
        message: `Failed to load match history: ${error.message}` 
      }, mapId);
    }
  }

  /**
   * Display match history modal
   */
  displayMatchHistoryModal(data, mapId) {
    const { matches, pagination } = data;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'match-history-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 15000;
      backdrop-filter: blur(5px);
    `;

    // Create match history dialog
    const dialog = document.createElement('div');
    dialog.className = 'match-history-dialog';
    dialog.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
      backdrop-filter: blur(20px);
      color: #f1f5f9;
      padding: 2rem;
      border-radius: 20px;
      max-width: 800px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 
        0 25px 50px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.2);
    `;

    let matchHistoryHtml = `
      <div class="match-history-header">
        <h3 style="margin: 0 0 1rem 0; color: #ffd700; font-family: 'Cinzel', serif; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fas fa-history"></i>
          Match History
        </h3>
        <button class="close-match-history" style="
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.3s ease;
        ">&times;</button>
      </div>
      
      <div class="match-history-content">
    `;

    if (matches.length === 0) {
      const message = data.message || 'No matches played on this map yet.';
      const isError = data.message && data.message.includes('Failed');
      const subMessage = isError ? 'Please try again later.' : 'Be the first to play and report a match!';
      const iconColor = isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 215, 0, 0.3)';
      const iconClass = isError ? 'fa-exclamation-triangle' : 'fa-trophy';
      
      matchHistoryHtml += `
        <div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.7);">
          <i class="fas ${iconClass}" style="font-size: 3rem; margin-bottom: 1rem; color: ${iconColor};"></i>
          <p style="font-size: 1.1rem; margin: 0;">${message}</p>
          <p style="font-size: 0.9rem; margin: 0.5rem 0 0 0;">${subMessage}</p>
        </div>
      `;
    } else {
      // Display matches
      matchHistoryHtml += `
        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(255, 215, 0, 0.1); border-radius: 8px; border-left: 3px solid #ffd700;">
          <p style="margin: 0; color: #ffd700; font-weight: 600;">
            Total Matches: ${pagination.totalMatches}
          </p>
        </div>
      `;

      matches.forEach((match, index) => {
        const matchDate = new Date(match.date).toLocaleDateString();
        const matchType = match.matchType || '1v1';
        const playerNames = match.players.map(p => p.name || 'Unknown').join(' vs ');
        
        matchHistoryHtml += `
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: #ffd700; font-weight: 600;">${matchType.toUpperCase()}</span>
              <span style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">${matchDate}</span>
            </div>
            <div style="color: #ffffff; margin-bottom: 0.5rem;">
              ${playerNames}
            </div>
            <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: rgba(255, 255, 255, 0.8);">
              <span><i class="fas fa-clock"></i> ${match.duration || 0} min</span>
              <span><i class="fas fa-cog"></i> ${match.resourceLevel || 'medium'} resources</span>
            </div>
          </div>
        `;
      });

      // Pagination if needed
      if (pagination.totalPages > 1) {
        matchHistoryHtml += `
          <div style="text-align: center; margin-top: 1rem; color: rgba(255, 255, 255, 0.7);">
            Page ${pagination.currentPage} of ${pagination.totalPages}
          </div>
        `;
      }
    }

    matchHistoryHtml += `
      </div>
    `;

    dialog.innerHTML = matchHistoryHtml;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Setup close handlers
    const closeBtn = dialog.querySelector('.close-match-history');
    const closeModal = () => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Share map functionality
   */
  shareMap(mapId) {
    const url = `${window.location.origin}/maps/${mapId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out this Warcraft 2 map!',
        url: url
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        alert('Map URL copied to clipboard!');
      });
    }
  }

  /**
   * Render compact terrain chart section
   */
  renderCompactTerrainChart(map) {
    const terrain = this.getProcessedTerrainData(map);

    // Combine shore with water if present (terrain data is already in correct percentage format)
    const validTerrain = { ...terrain };
    if (validTerrain.shore && validTerrain.water) {
      validTerrain.water = validTerrain.water + validTerrain.shore;
      delete validTerrain.shore;
    } else if (validTerrain.shore && !validTerrain.water) {
      validTerrain.water = validTerrain.shore;
      delete validTerrain.shore;
    }

    return `
      <div class="terrain-chart-compact">
        <div class="chart-header-compact">
          <h3><i class="fas fa-chart-pie"></i> Terrain Distribution</h3>
        </div>
        <div class="chart-and-legend-container">
          <div class="chart-container-compact">
            <canvas id="terrain-chart-canvas-compact" width="150" height="150"></canvas>
          </div>
          <div class="terrain-legend-compact" id="terrain-legend-compact">
            ${Object.keys(validTerrain).length === 0 ? '<p class="no-terrain-data">No terrain data available</p>' : ''}
          </div>
        </div>
      </div>
    `;}

  /**
   * Load Chart.js library dynamically
   */
  async loadChartJS() {
    return new Promise((resolve, reject) => {
      if (typeof Chart !== 'undefined') {
        console.log('✅ Chart.js already loaded');resolve();
        return;}

      console.log('📥 Loading Chart.js from CDN...');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
      script.async = true;
      
      script.onload = () => {
        if (typeof Chart !== 'undefined') {
          console.log('✅ Chart.js loaded and available globally');
          resolve();
        } else {
          console.error('❌ Chart.js script loaded but Chart is not defined');
          reject(new Error('Chart.js loaded but not available'));
        }
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load Chart.js from CDN:', error);
        reject(new Error('Failed to load Chart.js from CDN'));
      };
      
      // Set a timeout for loading
      setTimeout(() => {
        if (typeof Chart === 'undefined') {
          console.error('❌ Chart.js loading timeout');
          reject(new Error('Chart.js loading timeout'));
        }
      }, 10000); // 10 second timeout
      
      document.head.appendChild(script);
      console.log('📤 Chart.js script tag added to head');
    });
  }

  /**
   * Initialize compact terrain chart
   */
  async initializeCompactTerrainChart(map) {
    console.log('🔄 Starting terrain chart initialization for map:', map.name);
    
    const chartContainer = document.querySelector('.terrain-chart-compact');
    if (!chartContainer) {
      console.warn('❌ Terrain chart container not found');
      console.log('📋 Available elements with terrain-chart:', document.querySelectorAll('[id*="terrain-chart"], [class*="terrain-chart"]'));
      console.log('📋 All strategic tab elements:', document.querySelectorAll('#strategic-tab *'));
      return;}
    
    console.log('✅ Chart container found:', chartContainer);

    // Load Chart.js if not already loaded
    if (typeof Chart === 'undefined') {
      console.log('📊 Loading Chart.js...');
      try {
        await this.loadChartJS();
        console.log('✅ Chart.js loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load Chart.js:', error);
        return;}
    } else {
      console.log('✅ Chart.js already available');
    }

    // Find or create canvas with unique ID
    let canvas = chartContainer.querySelector('canvas');
    if (!canvas) {
      console.log('⚠️ Canvas not found, creating new one');
      canvas = document.createElement('canvas');
      canvas.id = 'terrain-chart-canvas-compact';
      canvas.width = 150;
      canvas.height = 150;
      chartContainer.appendChild(canvas);
      console.log('✅ Created new canvas element');
    } else {
      console.log('✅ Found existing canvas element');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Failed to get canvas context');
      return;}

    const terrain = this.getProcessedTerrainData(map);
    console.log('🗺️ Processed terrain data:', terrain);

    // Combine shore with water if present (terrain data is already in correct percentage format)
    const validTerrain = { ...terrain };
    if (validTerrain.shore && validTerrain.water) {
      validTerrain.water = validTerrain.water + validTerrain.shore;
      delete validTerrain.shore;
    } else if (validTerrain.shore && !validTerrain.water) {
      validTerrain.water = validTerrain.shore;
      delete validTerrain.shore;
    }
    
    console.log('✅ Valid terrain after processing:', validTerrain);

    // Define colors for different terrain types (simplified)
    const terrainColors = {
      water: '#4A90E2',
      land: '#7ED321', 
      trees: '#228B22',
      rocks: '#8B7355',
      other: '#8E8E93'
    };

    if (Object.keys(validTerrain).length === 0) {
      console.warn('⚠️ No valid terrain data available');
      const legendContainer = document.getElementById('terrain-legend-compact');
      if (legendContainer) {
        legendContainer.innerHTML = '<p class="no-terrain-data">No terrain data available</p>';
      }
      return;}

    // Prepare chart data
    const labels = [];
    const data = [];
    const colors = [];

    Object.entries(validTerrain)
      .sort(([,a], [,b]) => b - a) // Sort by percentage descending
      .forEach(([terrainType, percentage]) => {
        const formattedName = this.formatTerrainName(terrainType);
        labels.push(formattedName);
        data.push(percentage);
        colors.push(terrainColors[terrainType.toLowerCase()] || '#999999');
      });

    console.log('📊 Chart data prepared:', { labels, data, colors });
    console.log('🎨 Creating Chart with context:', ctx);

    // Create the chart
    try {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }]
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed.toFixed(1) + '%';}
            }
          }
        },
        cutout: '50%',
        radius: '85%'
      }
      });

      // Create custom compact terrain legend
      this.createCompactTerrainLegend(labels, data, colors);
      console.log('✅ Terrain chart created successfully');
    } catch (error) {
      console.error('❌ Failed to create terrain chart:', error);
      const legendContainer = document.getElementById('terrain-legend-compact');
      if (legendContainer) {
        legendContainer.innerHTML = '<p class="no-terrain-data">Chart loading failed</p>';
      }
    }
  }

  /**
   * Create custom compact terrain legend
   */
  createCompactTerrainLegend(labels, data, colors) {
    const legendContainer = document.getElementById('terrain-legend-compact');
    if (!legendContainer) return;let legendHtml = '';
    labels.forEach((label, index) => {
      legendHtml += `
        <div class="legend-item-compact">
          <div class="legend-color-compact" style="background-color: ${colors[index]};"></div>
          <span class="legend-label-compact">${label}</span>
          <span class="legend-value-compact">${data[index].toFixed(1)}%</span>
        </div>
      `;
    });

    legendContainer.innerHTML = legendHtml;
  }

  /**
   * Get improved goldmine color based on amount - better visibility
   */
  getGoldmineColor(amount) {
    if (amount >= 300000) return '#FF0080';if (amount >= 200000) return '#FFD700';if (amount >= 100000) return '#FF4500';if (amount >= 50000) return '#00FFFF';if (amount >= 25000) return '#FF69B4';return '#FF0080';}

  /**
   * Get improved player color based on race - better visibility
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
   * Show the modal
   */
  showModal() {
    console.log('🔍 MapDetails showModal called');
    console.log('📋 Modal element:', this.mapDetailsModal);
    
    if (this.mapDetailsModal) {
      console.log('📋 Current modal display:', this.mapDetailsModal.style.display);
      
      // USE CSS CLASSES INSTEAD OF DIRECT STYLE MANIPULATION
      // The CSS has !important rules that override inline styles
      this.mapDetailsModal.classList.add('show', 'active');
      this.mapDetailsModal.classList.remove('closing');
      
      console.log('📋 Modal classes added: show, active');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      console.log('📋 Body overflow set to hidden and modal-open class added');
      
      // Add opening animation class
      this.mapDetailsModal.classList.add('opening');
      
      // Remove opening class after animation
      setTimeout(() => {
        if (this.mapDetailsModal) {
          this.mapDetailsModal.classList.remove('opening');
        }
      }, 300);
      
      // DEBUGGING: Check computed styles
      const computedStyle = window.getComputedStyle(this.mapDetailsModal);
      console.log('💻 Computed styles check:');
      console.log('  - display:', computedStyle.display);
      console.log('  - position:', computedStyle.position);
      console.log('  - z-index:', computedStyle.zIndex);
      console.log('  - opacity:', computedStyle.opacity);
      console.log('  - visibility:', computedStyle.visibility);
      console.log('  - top:', computedStyle.top);
      console.log('  - left:', computedStyle.left);
      console.log('  - width:', computedStyle.width);
      console.log('  - height:', computedStyle.height);
      
      // DEBUGGING: Check close button after modal is shown
      setTimeout(() => {
        const closeBtn = this.mapDetailsModal.querySelector('.close-modal');
        console.log('🔍 DEBUG: Close button after modal shown:', closeBtn);
        if (closeBtn) {
          const closeBtnStyle = window.getComputedStyle(closeBtn);
          console.log('🔍 DEBUG: Close button computed styles after modal shown:');
          console.log('  - display:', closeBtnStyle.display);
          console.log('  - position:', closeBtnStyle.position);
          console.log('  - z-index:', closeBtnStyle.zIndex);
          console.log('  - top:', closeBtnStyle.top);
          console.log('  - right:', closeBtnStyle.right);
          console.log('  - opacity:', closeBtnStyle.opacity);
          console.log('  - visibility:', closeBtnStyle.visibility);
        }
      }, 100);
      
      console.log('✅ Modal should now be visible with CSS classes');
    } else {
      console.error('❌ Map details modal not found');
    }
  }

  hideModal() {
    const modal = document.getElementById('map-details-modal');
    if (modal) {
      // USE CSS CLASSES FOR HIDING
      modal.classList.remove('show', 'active', 'opening');
      modal.classList.add('closing');
      
      // Remove closing class after animation
      setTimeout(() => {
        modal.classList.remove('closing');
      }, 300);
      
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    
    // Clear URL parameters to prevent modal from reopening on refresh
    this.clearUrlParameters();
    
    this.cleanup();
  }

  /**
   * Clear URL parameters to prevent modal from reopening on refresh
   */
  clearUrlParameters() {
    try {
      // Check if we're on atlas.html and have URL parameters
      if (window.location.pathname.includes('/views/atlas.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const hasModalParams = urlParams.get('id') || urlParams.get('showModal');
        
        if (hasModalParams) {
          // Only clear parameters if the modal is actually closed
          const modal = document.getElementById('map-details-modal');
          if (!modal || !modal.classList.contains('show')) {
            // Remove the modal-related parameters
            urlParams.delete('id');
            urlParams.delete('showModal');
            urlParams.delete('gameType');
            
            // Update the URL without the parameters
            const newUrl = window.location.pathname + 
              (urlParams.toString() ? '?' + urlParams.toString() : '') + 
              window.location.hash;
            
            // Use history.replaceState to avoid adding to browser history
            window.history.replaceState({}, '', newUrl);
            
            console.log('🧹 Cleared URL parameters to prevent modal auto-reopening');
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear URL parameters:', error);
    }
  }

  /**
   * Setup page unload handler to clear URL parameters
   */
  setupPageUnloadHandler() {
    // Clear URL parameters when page is unloaded to prevent issues on back/forward
    window.addEventListener('beforeunload', () => {
      this.clearUrlParameters();
    });
  }

  showLoadingModal() {
    const modal = document.getElementById('map-details-modal');
    const container = document.getElementById('map-details-container');
    
    if (modal && container) {
      container.innerHTML = `
        <div class="modal-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading map details...</p>
        </div>
      `;
      modal.style.display = 'flex';
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

  generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let html = '';
    
    for (let i = 0; i < fullStars; i++) {
      html += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
      html += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
      html += '<i class="far fa-star"></i>';
    }

    return html;}

  /**
   * Generate interactive star rating (for rating input)
   */
  generateInteractiveStarRating(currentRating = 0, size = 'normal', mapId = null) {
    console.log(`⭐ generateInteractiveStarRating called with: currentRating=${currentRating}, size=${size}, mapId=${mapId}`);
    const sizeClass = size === 'large' ? 'rating-stars-large' : size === 'small' ? 'rating-stars-small' : 'rating-stars';
    
    let html = `<div class="interactive-stars ${sizeClass}" data-map-id="${mapId || ''}" data-current-rating="${currentRating}">`;
    
    for (let i = 1; i <= 5; i++) {
      const filled = i <= currentRating;
      console.log(`⭐ Star ${i}: filled=${filled} (${i} <= ${currentRating})`);
      html += `
        <i class="${filled ? 'fas' : 'far'} fa-star rating-star" 
           data-rating="${i}" 
           title="${i} Star${i > 1 ? 's' : ''}"
           style="cursor: pointer; color: ${filled ? '#ffd700' : '#6b7280'};">
        </i>
      `;
    }
    
    html += '</div>';
    console.log(`⭐ Generated HTML:`, html);
    return html;}

  /**
   * Setup interactive star rating with proper event delegation
   */
  setupInteractiveStarRating(mapId) {
    // Use event delegation to handle star clicks
    const starsContainer = this.mapDetailsContainer.querySelector('.interactive-stars');
    if (starsContainer) {
      starsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('rating-star')) {
          const rating = parseInt(e.target.dataset.rating);
          console.log(`⭐ Star clicked: ${rating} for map ${mapId}`);
          this.handleStarClick(rating, mapId);
        }
      });

      // Setup hover effects
      starsContainer.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('rating-star')) {
          const rating = parseInt(e.target.dataset.rating);
          this.highlightStarsOnHover(rating);
        }
      });

      starsContainer.addEventListener('mouseout', () => {
        this.resetStarHighlight();
      });
    }
  }

  /**
   * Get current game type
   */
  getCurrentGame() {
    // Try multiple sources for current game
    if (window.gameTabsManager && typeof window.gameTabsManager.getCurrentGame === 'function') {
      return window.gameTabsManager.getCurrentGame();}
    if (window.mapsCore && typeof window.mapsCore.getCurrentGame === 'function') {
      return window.mapsCore.getCurrentGame();}
    // Fallback to checking URL or default
    const path = window.location.pathname;
    if (path.includes('war1') || path.includes('wc1')) return 'wc1';if (path.includes('war3') || path.includes('wc3')) return 'wc3';return 'wc2';}

  /**
   * Handle star click for inline rating
   */
  async handleStarClick(rating, mapId, gameType = null) {
    const user = window.mapsCore?.currentUser;
    if (!user) {
      this.showError('You must be logged in to rate maps');
      window.location.href = '/views/login.html';
      return;}

    if (!mapId) {
      mapId = this.currentMapId;
    }

    if (!mapId) {
      this.showError('Map ID not found');
      return;}

    // Determine game type if not provided
    if (!gameType) {
      gameType = this.getCurrentGame();
    }

    console.log(`⭐ User clicked ${rating} stars for ${gameType} map ${mapId}`);

    // Store the rating temporarily
    this.currentRating = rating;
    this.currentGameType = gameType;
    
    // Update the visual display immediately for better UX
    // Update modal stars if modal is open
    this.updateStarDisplay(rating);
    // Also update the grid card stars
    this.updateGridStarDisplay(mapId, rating, gameType);

    // Show comment prompt
    this.showRatingCommentPrompt(rating, mapId, gameType);
  }

  /**
   * Update star display to show current rating
   */
  updateStarDisplay(rating) {
    const stars = this.mapDetailsContainer.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
      const starRating = index + 1;
      if (starRating <= rating) {
        star.className = 'fas fa-star rating-star';
        star.style.color = '#ffd700';
      } else {
        star.className = 'far fa-star rating-star';
        star.style.color = '#6b7280';
      }
    });
  }

  /**
   * Update star display in grid cards for all games
   */
  updateGridStarDisplay(mapId, rating, gameType) {
    console.log(`🌟 Updating grid star display for ${gameType} map ${mapId} with rating ${rating}`);
    
    // For WC1, cards use data-scenario-id
    // For WC2/WC3, cards use data-map-id
    let card;
    if (gameType === 'wc1') {
      card = document.querySelector(`[data-scenario-id="${mapId}"]`);
    } else {
      card = document.querySelector(`[data-map-id="${mapId}"]`);
    }
    
    if (!card) {
      console.warn(`⚠️ ${gameType} card not found for immediate star update`);
      return;}
    
    // Find the stars container within this card (MapsGrid.js uses .stars-container)
    const starsContainer = card.querySelector('.stars-container');
    if (!starsContainer) {
      console.warn(`⚠️ Stars container not found in ${gameType} card`);
      return;}
    
    // Update the stars to show user's rating
    const stars = starsContainer.querySelectorAll('.rating-star');
    console.log(`🔍 Found ${stars.length} stars to update for ${gameType}`);
    
    stars.forEach((star, index) => {
      const starRating = index + 1;
      if (starRating <= rating) {
        star.className = 'fas fa-star rating-star';
        star.style.color = '#ffd700';
      } else {
        star.className = 'far fa-star rating-star';
        star.style.color = '#6b7280';
      }
    });
    
    // Also add a visual indicator that this is the user's rating
    starsContainer.setAttribute('title', `Your rating: ${rating} star${rating !== 1 ? 's' : ''}`);
    
    console.log(`✅ Updated ${gameType} stars to show ${rating} rating`);
  }

  /**
   * Highlight stars on hover
   */
  highlightStarsOnHover(rating) {
    const stars = this.mapDetailsContainer.querySelectorAll('.rating-star');
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
   * Reset star highlight to current rating
   */
  resetStarHighlight() {
    const stars = this.mapDetailsContainer.querySelectorAll('.rating-star');
    const currentRating = this.currentRating || 0;
    
    stars.forEach((star, index) => {
      const starRating = index + 1;
      
      if (starRating <= currentRating) {
        star.className = 'fas fa-star rating-star';
        star.style.color = '#ffd700';
      } else {
        star.className = 'far fa-star rating-star';
        star.style.color = '#6b7280';
      }
      star.style.transform = 'scale(1)';
    });
  }

  /**
   * Render balance metrics section
   */
  renderBalanceMetrics(map) {
    // Try different possible field locations for balance metrics
    const balanceMetrics = map.balanceMetrics || 
                          map.strategicData?.balanceMetrics || 
                          map.strategicAnalysis?.balanceMetrics ||
                          null;

    console.log('🔍 Balance metrics check:', {
      hasBalanceMetrics: !!balanceMetrics,
      mapId: map._id,
      availableFields: Object.keys(map),
      strategicDataKeys: map.strategicData ? Object.keys(map.strategicData) : null,
      strategicAnalysisKeys: map.strategicAnalysis ? Object.keys(map.strategicAnalysis) : null
    });

    if (!balanceMetrics) {
      return `
        <div class="balance-metrics-section">
          <div class="balance-header">
            <h3><i class="fas fa-balance-scale"></i> Strategic Metrics</h3>
          </div>
          <div class="balance-content">
            <p class="no-balance-data">Balance analysis not available for this map.</p>
          </div>
        </div>
      `;}

    // Extract balance data - these are text values like "good", "fair", "excellent"
    const resourceBalance = balanceMetrics.resourceBalance || 'N/A';
    const positionBalance = balanceMetrics.positionBalance || 'N/A';
    const territorialBalance = balanceMetrics.territorialBalance || 'N/A';
    const overallRating = balanceMetrics.overallRating || 'N/A';

    return `
      <div class="balance-metrics-section">
        <div class="balance-header">
          <h3><i class="fas fa-balance-scale"></i> Strategic Metrics</h3>
        </div>
        <div class="balance-content">
          <div class="balance-grid">
            <div class="balance-metric">
              <div class="metric-icon">
                <i class="fas fa-coins"></i>
              </div>
              <div class="metric-info">
                <div class="metric-value ${this.getBalanceTextClass(resourceBalance)}">${this.capitalizeFirst(resourceBalance)}</div>
                <div class="metric-label">Resource Balance</div>
              </div>
            </div>
            
            <div class="balance-metric">
              <div class="metric-icon">
                <i class="fas fa-map-marker-alt"></i>
              </div>
              <div class="metric-info">
                <div class="metric-value ${this.getBalanceTextClass(positionBalance)}">${this.capitalizeFirst(positionBalance)}</div>
                <div class="metric-label">Position Balance</div>
              </div>
            </div>
            
            <div class="balance-metric">
              <div class="metric-icon">
                <i class="fas fa-globe"></i>
              </div>
              <div class="metric-info">
                <div class="metric-value ${this.getBalanceTextClass(territorialBalance)}">${this.capitalizeFirst(territorialBalance)}</div>
                <div class="metric-label">Territorial Balance</div>
              </div>
            </div>
          </div>
          
          <div class="overall-balance">
            <div class="overall-rating">
              <div class="rating-label">Overall Balance</div>
              <div class="rating-value ${this.getBalanceTextClass(overallRating)}">${this.capitalizeFirst(overallRating)}</div>
            </div>
          </div>
        </div>
      </div>
    `;}

  /**
   * Get balance rating CSS class based on text value
   */
  getBalanceRatingClass(rating) {
    if (typeof rating === 'string') {
      return this.getBalanceTextClass(rating);}
    // Fallback for numerical values
    if (rating >= 8) return 'excellent';if (rating >= 6) return 'good';if (rating >= 4) return 'average';return 'poor';}

  /**
   * Get balance text CSS class based on text value
   */
  getBalanceTextClass(textValue) {
    if (!textValue || textValue === 'N/A') return 'na';const value = textValue.toLowerCase();
    if (value.includes('excellent') || value.includes('perfect')) return 'excellent';if (value.includes('very good') || value.includes('great')) return 'very-good';if (value.includes('good')) return 'good';if (value.includes('fair') || value.includes('average') || value.includes('balanced')) return 'fair';if (value.includes('poor') || value.includes('bad') || value.includes('unbalanced')) return 'poor';if (value.includes('very poor') || value.includes('terrible')) return 'very-poor';return 'neutral';}

  /**
   * Refresh map card after rating submission
   */
  refreshMapCard(mapId, gameType) {
    console.log(`🔄 Refreshing ${gameType} card for map ${mapId}`);
    
    try {
      if (gameType === 'wc1') {
        // Refresh WC1 scenario card
        if (window.wc1Manager && typeof window.wc1Manager.loadScenarios === 'function') {
          console.log('🔄 Refreshing WC1 scenarios after rating submission');
          window.wc1Manager.loadScenarios().then(() => {
            console.log('🔄 Re-rendering WC1 scenarios with updated ratings');
            window.wc1Manager.renderScenarios();
            console.log('✅ WC1 scenarios refreshed successfully');
          }).catch(error => {
            console.error('❌ Failed to refresh WC1 scenarios:', error);
          });
        } else {
          console.warn('⚠️ WC1Manager not available for refresh');
        }
      } else if (gameType === 'wc2') {
        // Refresh WC2 map grid
        if (window.mapsGrid && typeof window.mapsGrid.loadMaps === 'function') {
          console.log('🔄 Refreshing WC2 maps grid');
          window.mapsGrid.loadMaps();
        }
      } else if (gameType === 'wc3') {
        // Refresh WC3 map grid
        if (window.mapsGrid && typeof window.mapsGrid.loadMaps === 'function') {
          console.log('🔄 Refreshing WC3 maps grid');
          window.mapsGrid.loadMaps();
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to refresh map card:', error);
    }
  }

  /**
   * Submit rating with comment and refresh modal
   */
  async submitRatingWithComment(mapId) {
    const comment = document.getElementById('rating-comment')?.value.trim() || '';
    const rating = this.currentRating;

    if (!rating || rating < 1 || rating > 5) {
      this.showError('Please select a rating between 1 and 5 stars');
      return;}

    try {
      console.log('📝 Submitting rating:', { rating, comment, mapId });
      
      const response = await fetch(this.getRatingApiEndpoint(mapId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comment }),
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit rating');
      }

      const result = await response.json();
      this.showSuccess(comment ? 'Rating and comment submitted successfully!' : 'Rating submitted successfully!');
      
      // Ensure the visual feedback persists after successful submission
      console.log('🌟 Maintaining visual star feedback after successful submission');
      this.updateGridStarDisplay(mapId, rating, this.currentGameType);
      
      // Close rating prompt
      const overlay = document.querySelector('.rating-prompt-overlay');
      if (overlay) {
        this.closeRatingPrompt(overlay);
      }
      
      // Refresh the modal to show updated rating (but don't reload the grid immediately)
      console.log('🔄 Refreshing modal after rating submission');
      setTimeout(() => {
        this.viewMapDetails(mapId);
      }, 1000);
      
      // Delay the grid refresh to allow the visual feedback to be seen
      setTimeout(() => {
        console.log('🔄 Delayed grid refresh to maintain visual feedback');
        this.refreshMapCard(mapId, this.currentGameType);
      }, 2000);
      
      return result;} catch (error) {
      console.error('❌ Rating submission failed:', error);
      this.showError(error.message || 'Failed to submit rating');
      throw error;
    }
  }

  /**
   * Render strategic metrics section with dynamic field handling
   */
  renderBalanceMetrics(map) {
    // Try different possible field locations for strategic metrics
    const strategicMetrics = map.balanceMetrics || 
                          map.strategicData?.balanceMetrics || 
                          map.strategicAnalysis?.balanceMetrics ||
                          null;

    console.log('🔍 Strategic metrics check:', {
      hasStrategicMetrics: !!strategicMetrics,
      mapId: map._id,
      strategicMetrics: strategicMetrics,
      availableFields: Object.keys(map)
    });

    if (!strategicMetrics) {
      return `
        <div class="balance-metrics-section">
          <div class="balance-header">
            <h3><i class="fas fa-balance-scale"></i> Strategic Metrics</h3>
          </div>
          <div class="balance-content">
            <div class="no-data-message">
              <i class="fas fa-info-circle"></i>
              Strategic analysis not available for this map
            </div>
          </div>
        </div>
      `;}

    // Handle dynamic field names and values
    const metricEntries = Object.entries(strategicMetrics);
    
    if (metricEntries.length === 0) {
      return `
        <div class="balance-metrics-section">
          <div class="balance-header">
            <h3><i class="fas fa-balance-scale"></i> Strategic Metrics</h3>
          </div>
          <div class="balance-content">
            <div class="no-data-message">
              <i class="fas fa-info-circle"></i>
              No strategic metrics available for this map
            </div>
          </div>
        </div>
      `;}

    // Generate HTML for all available strategic metrics
    const metricsHtml = metricEntries.map(([fieldName, value]) => {
      // Convert field names to readable labels
      const label = this.formatFieldLabel(fieldName);
      const displayValue = this.capitalizeFirst(String(value || 'N/A'));
      const cssClass = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      return `
        <div class="balance-metric">
          <span class="metric-label">${label}</span>
          <span class="metric-value ${cssClass}">${displayValue}</span>
        </div>
      `;}).join('');

    return `
      <div class="balance-metrics-section">
        <div class="balance-header">
          <h3><i class="fas fa-balance-scale"></i> Strategic Metrics</h3>
        </div>
        <div class="balance-content">
          ${metricsHtml}
        </div>
      </div>
    `;}

  /**
   * Format field labels for display
   */
  formatFieldLabel(fieldName) {
    // Handle specific field name mappings first
    const labelMap = {
      'resourceBalance': 'Resource Balance',
      'mapControl': 'Map Control', 
      'strategicComplexity': 'Strategic Complexity',
      'rushDistance': 'Rush Distance',
      'balanceRating': 'Overall Balance',
      'economicBalance': 'Economic Balance',
      'positionalBalance': 'Positional Balance'
    };
    
    if (labelMap[fieldName]) {
      return labelMap[fieldName];}
    
    // Convert camelCase to readable labels as fallback
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase());}

  /**
   * DEBUGGING: Manual coordinate verification for War2 maps
   */
  debugWar2CoordinateSystem(strategicData, coordinateBounds) {
    console.log('\n🔬 === WAR2 COORDINATE SYSTEM ANALYSIS ===');
    
    // Test the coordinate bounds calculation
    if (strategicData.goldmines && strategicData.goldmines.length > 0) {
      console.log('📊 GOLDMINE COORDINATE ANALYSIS:');
      strategicData.goldmines.slice(0, 5).forEach((goldmine, i) => {
        const x = goldmine.x;
        const y = goldmine.y;
        
        // Test different transformation methods
        const standard128 = {
          left: (x / 128) * 100,
          top: (128 - y) / 128 * 100
        };
        
        const standardNoFlip = {
          left: (x / 128) * 100,
          top: (y / 128) * 100
        };
        
        const swapped = {
          left: (y / 128) * 100,
          top: (128 - x) / 128 * 100
        };
        
        let boundsTransform = null;
        if (coordinateBounds) {
          const xRange = coordinateBounds.maxX - coordinateBounds.minX;
          const yRange = coordinateBounds.maxY - coordinateBounds.minY;
          boundsTransform = {
            left: ((x - coordinateBounds.minX) / xRange) * 100,
            top: (1 - (y - coordinateBounds.minY) / yRange) * 100
          };
        }
        
        console.log(`🏆 Goldmine ${i + 1}: coords(${x}, ${y})`);
        console.log(`   Standard 128 (Y-flip): ${standard128.left.toFixed(1)}%, ${standard128.top.toFixed(1)}%`);
        console.log(`   Standard 128 (no flip): ${standardNoFlip.left.toFixed(1)}%, ${standardNoFlip.top.toFixed(1)}%`);
        console.log(`   X/Y Swapped: ${swapped.left.toFixed(1)}%, ${swapped.top.toFixed(1)}%`);
        if (boundsTransform) {
          console.log(`   Bounds transform: ${boundsTransform.left.toFixed(1)}%, ${boundsTransform.top.toFixed(1)}%`);
        }
        console.log('');
      });
    }
    
    if (strategicData.startingPositions && strategicData.startingPositions.length > 0) {
      console.log('👤 STARTING POSITION COORDINATE ANALYSIS:');
      strategicData.startingPositions.slice(0, 4).forEach((position, i) => {
        const x = position.x;
        const y = position.y;
        
        // Test different transformation methods
        const standard128 = {
          left: (x / 128) * 100,
          top: (128 - y) / 128 * 100
        };
        
        const standardNoFlip = {
          left: (x / 128) * 100,
          top: (y / 128) * 100
        };
        
        const swapped = {
          left: (y / 128) * 100,
          top: (128 - x) / 128 * 100
        };
        
        console.log(`👤 Player ${i + 1}: coords(${x}, ${y})`);
        console.log(`   Standard 128 (Y-flip): ${standard128.left.toFixed(1)}%, ${standard128.top.toFixed(1)}%`);
        console.log(`   Standard 128 (no flip): ${standardNoFlip.left.toFixed(1)}%, ${standardNoFlip.top.toFixed(1)}%`);
        console.log(`   X/Y Swapped: ${swapped.left.toFixed(1)}%, ${swapped.top.toFixed(1)}%`);
        console.log('');
      });
    }
    
    // Map size analysis
    console.log('📐 MAP SIZE ANALYSIS:');
    console.log(`   Strategic data mapSize:`, strategicData.mapSize);
    console.log(`   Coordinate bounds:`, coordinateBounds);
    console.log(`   Map uses standard transform? ${!coordinateBounds || (coordinateBounds.maxX <= 128 && coordinateBounds.minX >= 0)}`);
    
    console.log('=== END COORDINATE ANALYSIS ===\n');
  }
}

// Create and export singleton instance
export const mapDetails = new MapDetails();