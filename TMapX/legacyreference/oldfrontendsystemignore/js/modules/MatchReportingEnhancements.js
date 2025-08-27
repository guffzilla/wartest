/**
 * Match Reporting Enhancements
 * 
 * Enhances the existing match reporting system with:
 * - Epic player suggestions (recent opponents, similar rank, autocomplete)
 * - Map atlas integration with thumbnails and filters
 * - Victory animations with canvas rewards
 * - Improved UX elements
 */

export class MatchReportingEnhancements {
  constructor() {
    this.playerCache = new Map();
    this.mapCache = new Map();
    this.recentOpponents = [];
    this.searchTimeout = null;
    this.currentGameType = 'wc2';
    this.isInitialized = false;
  }

  /**
   * Initialize the enhancement system
   */
  async initialize() {
    if (this.isInitialized) return;console.log('🚀 Initializing Match Reporting Enhancements...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEnhancements());
    } else {
      this.setupEnhancements();
    }
    
    this.isInitialized = true;
  }

  /**
   * Setup all enhancements
   */
  setupEnhancements() {
    console.log('🚀 Setting up match reporting enhancements...');
    
    this.enhancePlayerSelection();
    this.enhanceMapSelection();
    this.setupVictoryAnimations();
    this.enhanceFormUX();
    
    // Listen for game type changes
    document.addEventListener('gameTypeChanged', (e) => {
      this.currentGameType = e.detail.gameType;
      this.clearCaches();
    });
    
    // Also listen for report button clicks to setup suggestions
    if (!document.body.dataset.mreReportHook) {
      document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'report-match-btn' || e.target.closest('#report-match-btn'))) {
          console.log('🎯 Report button clicked, setting up suggestions...');
          setTimeout(() => this.setupSuggestionsIfNeeded(), 100);
        }
      });
      document.body.dataset.mreReportHook = '1';
    }
    
    console.log('✨ Match Reporting Enhancements initialized');
  }

  /**
   * Enhance player selection with suggestions and autocomplete
   */
  enhancePlayerSelection() {
    console.log('🎯 Enhancing player selection...');
    
    // Enhance existing report match modal
    const reportModal = document.getElementById('report-match-modal');
    if (reportModal) {
      console.log('✅ Found report-match-modal, setting up suggestions');
      this.setupPlayerSuggestionsInModal(reportModal);
    } else {
      console.log('❌ report-match-modal not found');
    }

    // Enhance WC1 modal
    const wc1Modal = document.getElementById('wc1-report-match-modal');
    if (wc1Modal) {
      console.log('✅ Found wc1-report-match-modal, setting up suggestions');
      this.setupPlayerSuggestionsInModal(wc1Modal);
    } else {
      console.log('❌ wc1-report-match-modal not found');
    }
  }

  /**
   * Setup suggestions if needed (called after modal opens)
   */
  setupSuggestionsIfNeeded() {
    console.log('🔍 Checking for visible modals to setup suggestions...');
    
    // Check for visible report modal
    const reportModal = document.getElementById('report-match-modal');
    if (reportModal && (reportModal.classList.contains('show') || reportModal.style.display !== 'none')) {
      console.log('👁️ Report modal is visible, checking for suggestions panel...');
      const existingPanel = reportModal.querySelector('.player-suggestions-panel');
      if (!existingPanel) {
        console.log('🔧 No suggestions panel found, setting up...');
        this.setupPlayerSuggestionsInModal(reportModal);
      } else {
        console.log('✅ Suggestions panel already exists');
        this.loadPlayerSuggestions();
      }
    }

    // Check for visible WC1 modal
    const wc1Modal = document.getElementById('wc1-report-match-modal');
    if (wc1Modal && (wc1Modal.classList.contains('show') || wc1Modal.style.display !== 'none')) {
      console.log('👁️ WC1 modal is visible, checking for suggestions panel...');
      const existingPanel = wc1Modal.querySelector('.player-suggestions-panel');
      if (!existingPanel) {
        console.log('🔧 No suggestions panel found, setting up...');
        this.setupPlayerSuggestionsInModal(wc1Modal);
      } else {
        console.log('✅ Suggestions panel already exists');
        this.loadPlayerSuggestions();
      }
    }
  }

  /**
   * Setup player suggestions in a specific modal
   */
  async setupPlayerSuggestionsInModal(modal) {
    console.log('🔧 Setting up player suggestions in modal:', modal.id);
    
    // Skip WC1 modal - it has its own integrated player suggestions system
    if (modal.id === 'wc1-report-match-modal') {
      console.log('⏭️ Skipping WC1 modal - has dedicated player suggestions');
      return;}
    
    const playersContainer = modal.querySelector('#players-container');
    if (!playersContainer) {
      console.log('❌ No #players-container found in modal:', modal.id);
      
      // Try to find alternative containers or create one
      const formSection = modal.querySelector('.form-section');
      const modalBody = modal.querySelector('.modal-content') || modal.querySelector('.modal-body');
      
      if (formSection) {
        console.log('📦 Found form-section, inserting suggestions panel there');
        const suggestionsPanel = this.createPlayerSuggestionsPanel();
        formSection.appendChild(suggestionsPanel);
        this.loadPlayerSuggestions();
        return;} else if (modalBody) {
        console.log('📦 Found modal-body, inserting suggestions panel there');
        const suggestionsPanel = this.createPlayerSuggestionsPanel();
        modalBody.insertBefore(suggestionsPanel, modalBody.firstChild);
        this.loadPlayerSuggestions();
        return;} else {
        console.log('❌ No suitable container found for suggestions panel');
        return;}
    }

    console.log('✅ Found players-container, setting up suggestions panel');

    // Check if panel already exists
    const existingPanel = modal.querySelector('.player-suggestions-panel');
    if (existingPanel) {
      console.log('ℹ️ Suggestions panel already exists, skipping creation');
      this.loadPlayerSuggestions();
      return;}

    // Create suggestions panel
    const suggestionsPanel = this.createPlayerSuggestionsPanel();
    playersContainer.parentNode.insertBefore(suggestionsPanel, playersContainer);

    // Load suggestions immediately
    this.loadPlayerSuggestions();
    
    // Monitor for dynamically created player inputs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.matches('.player-input')) {
            this.enhancePlayerInput(node);
          }
        });
      });
    });
    
    observer.observe(playersContainer, { childList: true, subtree: true });
  }

  /**
   * Create player suggestions panel
   */
  createPlayerSuggestionsPanel() {
    const panel = document.createElement('div');
    panel.className = 'player-suggestions-panel';
    panel.innerHTML = `
      <div class="suggestions-header">
        <h4><i class="fas fa-users"></i> Player Suggestions</h4>
        <button type="button" class="btn-toggle-suggestions" title="Toggle suggestions">
          <i class="fas fa-chevron-up"></i>
        </button>
      </div>
      <div class="suggestions-content">
        <div class="suggestions-tabs">
          <button class="suggestion-tab active" data-tab="recent">
            <i class="fas fa-clock"></i> Recent Opponents
          </button>
          <button class="suggestion-tab" data-tab="similar">
            <i class="fas fa-balance-scale"></i> Similar Rank
          </button>
          <button class="suggestion-tab" data-tab="search">
            <i class="fas fa-search"></i> Search Players
          </button>
        </div>
        
        <div class="suggestions-body">
          <!-- Recent Opponents -->
          <div class="suggestion-section active" data-section="recent">
            <div class="suggested-players" id="recent-players">
              <div class="loading-suggestions">
                <i class="fas fa-spinner fa-spin"></i> Loading recent opponents...
              </div>
            </div>
          </div>
          
          <!-- Similar Rank -->
          <div class="suggestion-section" data-section="similar">
            <div class="suggested-players" id="similar-players">
              <div class="loading-suggestions">
                <i class="fas fa-spinner fa-spin"></i> Finding similarly ranked players...
              </div>
            </div>
          </div>
          
          <!-- Search -->
          <div class="suggestion-section" data-section="search">
            <div class="player-search-container">
              <input type="text" id="player-search" placeholder="Type player name..." autocomplete="off">
              <div class="search-results" id="search-results"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Setup tab switching
    panel.querySelectorAll('.suggestion-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchSuggestionTab(panel, tab.dataset.tab));
    });

    // Setup toggle
    const toggleBtn = panel.querySelector('.btn-toggle-suggestions');
    toggleBtn.addEventListener('click', () => this.toggleSuggestionsPanel(panel));

    // Setup search
    const searchInput = panel.querySelector('#player-search');
    searchInput.addEventListener('input', (e) => this.handlePlayerSearch(e.target.value));

    return panel;}

  /**
   * Load player suggestions
   */
  async loadPlayerSuggestions() {
    console.log('📡 Loading player suggestions for gameType:', this.currentGameType);
    
    try {
      // Load recent opponents
      console.log('🔍 Fetching recent opponents...');
      const recentResponse = await fetch('/api/ladder/recent-opponents', {
        credentials: 'include'
      });
      
      console.log('📡 Recent opponents response status:', recentResponse.status);
      
      if (recentResponse.ok) {
        this.recentOpponents = await recentResponse.json();
        console.log('✅ Recent opponents loaded:', this.recentOpponents.length, 'players');
        this.renderRecentOpponents();
      } else {
        const error = await recentResponse.text();
        console.error('❌ Failed to load recent opponents:', recentResponse.status, error);
      }

      // Load similar rank players
      console.log('🔍 Fetching similar rank players...');
      const similarResponse = await fetch(`/api/ladder/similar-rank?gameType=${this.currentGameType}`, {
        credentials: 'include'
      });
      
      console.log('📡 Similar rank response status:', similarResponse.status);
      
      if (similarResponse.ok) {
        const similarPlayers = await similarResponse.json();
        console.log('✅ Similar rank players loaded:', similarPlayers.length, 'players');
        this.renderSimilarPlayers(similarPlayers);
      } else {
        const error = await similarResponse.text();
        console.error('❌ Failed to load similar rank players:', similarResponse.status, error);
      }
    } catch (error) {
      console.error('❌ Error loading player suggestions:', error);
    }
  }

  /**
   * Render recent opponents
   */
  renderRecentOpponents() {
    console.log('🎨 Rendering recent opponents...');
    const container = document.getElementById('recent-players');
    if (!container) {
      console.log('❌ recent-players container not found');
      return;}

    if (this.recentOpponents.length === 0) {
      console.log('ℹ️ No recent opponents to display');
      container.innerHTML = '<div class="no-suggestions">No recent opponents found</div>';
      return;}

    console.log('✅ Rendering', this.recentOpponents.length, 'recent opponents');

    container.innerHTML = this.recentOpponents.map(player => `
      <div class="suggested-player" data-player-name="${player.name}">
        <div class="player-avatar">
          <img src="${player.avatar || '/assets/img/default-avatar.svg'}" alt="${player.name}">
        </div>
        <div class="player-info">
          <div class="player-name">${player.name}</div>
          <div class="player-details">
            <span class="player-rank">${player.rank || 'Unranked'}</span>
            <span class="player-mmr">${player.mmr || 0} MMR</span>
          </div>
          <div class="last-played">Last played: ${this.formatLastSeen(player.lastSeen)}</div>
        </div>
        <button class="btn-add-player" title="Add to match">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.suggested-player').forEach(el => {
      el.querySelector('.btn-add-player').addEventListener('click', () => {
        this.addSuggestedPlayer(el.dataset.playerName);
      });
    });
  }

  /**
   * Render similar rank players
   */
  renderSimilarPlayers(players) {
    console.log('🎨 Rendering similar rank players...');
    const container = document.getElementById('similar-players');
    if (!container) {
      console.log('❌ similar-players container not found');
      return;}

    if (players.length === 0) {
      console.log('ℹ️ No similar rank players to display');
      container.innerHTML = '<div class="no-suggestions">No similarly ranked players found</div>';
      return;}

    console.log('✅ Rendering', players.length, 'similar rank players');

    container.innerHTML = players.map(player => {
      // Handle potential object values safely
      const playerName = typeof player.name === 'string' ? player.name : 'Unknown Player';
      const playerRank = typeof player.rank === 'string' ? player.rank : 'Unranked';
      const playerMMR = typeof player.mmr === 'number' ? player.mmr : 0;
      const playerRace = typeof player.preferredRace === 'string' ? player.preferredRace : 'Random';
      const playerAvatar = typeof player.avatar === 'string' ? player.avatar : '/assets/img/default-avatar.svg';
      
      return `
        <div class="suggested-player" data-player-name="${playerName}">
          <div class="player-avatar">
            <img src="${playerAvatar}" alt="${playerName}">
          </div>
          <div class="player-info">
            <div class="player-name">${playerName}</div>
            <div class="player-details">
              <span class="player-rank">${playerRank}</span>
              <span class="player-mmr">${playerMMR} MMR</span>
            </div>
            <div class="player-race">${playerRace}</div>
          </div>
          <button class="btn-add-player" title="Add to match">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      `;}).join('');

    // Add click handlers
    container.querySelectorAll('.suggested-player').forEach(el => {
      el.querySelector('.btn-add-player').addEventListener('click', (e) => {
        e.stopPropagation();
        this.addSuggestedPlayer(el.dataset.playerName);
      });
      
      // Also make the whole card clickable
      el.addEventListener('click', () => {
        this.addSuggestedPlayer(el.dataset.playerName);
      });
    });
  }

  /**
   * Handle player search
   */
  async handlePlayerSearch(query) {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;if (query.length < 2) {
      resultsContainer.innerHTML = '';
      return;}

    resultsContainer.innerHTML = '<div class="loading-search"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';

    this.searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ladder/search-players?q=${encodeURIComponent(query)}&gameType=${this.currentGameType}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const players = await response.json();
          this.renderSearchResults(players);
        }
      } catch (error) {
        console.error('Player search error:', error);
        resultsContainer.innerHTML = '<div class="search-error">Search failed</div>';
      }
    }, 300);
  }

  /**
   * Render search results
   */
  renderSearchResults(players) {
    console.log('🔍 Rendering search results...');
    const container = document.getElementById('search-results');
    if (!container) {
      console.log('❌ search-results container not found');
      return;}

    if (players.length === 0) {
      console.log('ℹ️ No search results to display');
      container.innerHTML = '<div class="no-search-results">No players found</div>';
      return;}

    console.log('✅ Rendering', players.length, 'search results');

    // Use the same format as suggested players for consistency
    container.innerHTML = players.map(player => {
      // Handle potential object values safely
      const playerName = typeof player.name === 'string' ? player.name : 'Unknown Player';
      const playerRank = typeof player.rank === 'string' ? player.rank : 'Unranked';
      const playerMMR = typeof player.mmr === 'number' ? player.mmr : 0;
      const playerRace = typeof player.preferredRace === 'string' ? player.preferredRace : 'Random';
      const playerAvatar = typeof player.avatar === 'string' ? player.avatar : '/assets/img/default-avatar.svg';
      
      return `
        <div class="suggested-player search-result-item" data-player-name="${playerName}">
          <div class="player-avatar">
            <img src="${playerAvatar}" alt="${playerName}">
          </div>
          <div class="player-info">
            <div class="player-name">${playerName}</div>
            <div class="player-details">
              <span class="player-rank">${playerRank}</span>
              <span class="player-mmr">${playerMMR} MMR</span>
            </div>
            <div class="player-race">${playerRace}</div>
          </div>
          <button class="btn-add-player" title="Add to match">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      `;}).join('');

    // Add click handlers
    container.querySelectorAll('.suggested-player').forEach(el => {
      el.querySelector('.btn-add-player').addEventListener('click', (e) => {
        e.stopPropagation();
        this.addSuggestedPlayer(el.dataset.playerName);
      });
      
      // Also make the whole card clickable
      el.addEventListener('click', () => {
        this.addSuggestedPlayer(el.dataset.playerName);
      });
    });
  }

  /**
   * Enhance map selection with atlas integration
   */
  enhanceMapSelection() {
    // Find map input in both modals
    const mapInputs = document.querySelectorAll('#map');
    mapInputs.forEach(input => this.enhanceMapInput(input));
  }

  /**
   * Enhance a specific map input
   */
  enhanceMapInput(input) {
    if (!input || input.dataset.enhanced) return;input.dataset.enhanced = 'true';

    // Create map browser button if it doesn't exist
    let browserBtn = input.parentNode.querySelector('.btn-browse-maps');
    if (!browserBtn) {
      browserBtn = document.createElement('button');
      browserBtn.type = 'button';
      browserBtn.className = 'btn btn-secondary btn-browse-maps';
      browserBtn.innerHTML = '<i class="fas fa-atlas"></i> Browse Maps';
      input.parentNode.appendChild(browserBtn);
    }

    // Setup map atlas modal
    browserBtn.addEventListener('click', () => this.openMapAtlas(input));

    // Add autocomplete
    input.addEventListener('input', (e) => this.handleMapAutocomplete(e.target));
  }

  /**
   * Open map atlas modal
   */
  async openMapAtlas(targetInput) {
    // Create atlas modal if it doesn't exist
    let atlasModal = document.getElementById('map-atlas-modal');
    if (!atlasModal) {
      atlasModal = this.createMapAtlasModal();
      document.body.appendChild(atlasModal);
    }

    // Store reference to target input
    atlasModal.dataset.targetInput = targetInput.id;

    // Load maps for current game type
    await this.loadMapsForAtlas();

    // Show modal
    atlasModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Create map atlas modal
   */
  createMapAtlasModal() {
    const modal = document.createElement('div');
    modal.id = 'map-atlas-modal';
    modal.className = 'modal map-atlas-modal';
    modal.innerHTML = `
      <div class="modal-content map-atlas-content">
        <div class="modal-header">
          <h3><i class="fas fa-atlas"></i> Map Atlas</h3>
          <button class="close-modal" type="button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="atlas-filters">
            <div class="filter-group">
              <label>Game Type:</label>
              <select id="atlas-game-filter">
                <option value="wc1">Warcraft I</option>
                <option value="wc2" selected>Warcraft II</option>
                <option value="wc3">Warcraft III</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Players:</label>
              <select id="atlas-players-filter">
                <option value="">All</option>
                <option value="2">1v1 (2 players)</option>
                <option value="4">2v2 (4 players)</option>
                <option value="6">3v3 (6 players)</option>
                <option value="8">4v4 (8 players)</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Search:</label>
              <input type="text" id="atlas-search" placeholder="Search maps...">
            </div>
          </div>
          <div class="maps-grid" id="atlas-maps-grid">
            <div class="loading-maps">
              <i class="fas fa-spinner fa-spin"></i> Loading maps...
            </div>
          </div>
        </div>
      </div>
    `;

    // Setup event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => this.closeMapAtlas());
    modal.querySelector('#atlas-game-filter').addEventListener('change', () => this.loadMapsForAtlas());
    modal.querySelector('#atlas-players-filter').addEventListener('change', () => this.filterMaps());
    modal.querySelector('#atlas-search').addEventListener('input', (e) => this.searchMaps(e.target.value));

    return modal;}

  /**
   * Setup victory animations
   */
  setupVictoryAnimations() {
    // Listen for successful match submissions
    document.addEventListener('matchSubmitted', (e) => {
      if (e.detail.success) {
        this.playVictoryAnimation(e.detail.result);
      }
    });
  }

  /**
   * Play victory animation
   */
  async playVictoryAnimation(result) {
    console.log('🎉 Playing enhanced victory animation with result:', result);
    
    // Create victory overlay container
    const container = document.createElement('div');
    container.id = 'victory-summary-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 99999;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    `;

    // Create canvas for particle animation
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create summary modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, rgba(20, 25, 40, 0.95), rgba(35, 45, 65, 0.9));
      border: 3px solid #ffd700;
      border-radius: 20px;
      padding: 3rem;
      max-width: 600px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7);
      position: relative;
      z-index: 1;
    `;

    // Get match summary data
    const gameType = result.gameType || 'WC1';
    const matchType = result.matchType || 'vs AI';
    const mmrChange = result.mmrChange || 0;
    const rewards = result.rewards || {};
    const arenaGold = rewards.arenaGold || 0;
    const honor = rewards.honor || 0;
    const experience = rewards.experience || 0;
    
    // Get rank progression data
    const rankProgression = result.rankProgression || {};
    const currentMmr = rankProgression.currentMmr || 1200;
    const currentRank = rankProgression.currentRank || { name: 'Bronze 3', image: '/assets/img/ranks/b3.png' };
    const nextRank = rankProgression.nextRank;
    const progressToNext = rankProgression.progressToNext || 0;
    const mmrToNext = rankProgression.mmrToNext || 0;

    modal.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">
          ${mmrChange >= 0 ? '🏆' : '💀'}
        </div>
        <h1 style="color: #ffd700; margin: 0 0 0.5rem 0; font-size: 2.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
          ${mmrChange >= 0 ? 'VICTORY!' : 'DEFEAT'}
        </h1>
        <p style="color: #94a3b8; font-size: 1.2rem; margin: 0;">
          ${gameType.toUpperCase()} ${matchType} Match Complete
        </p>
      </div>

      <!-- MMR Progression Section -->
      <div style="background: rgba(255, 215, 0, 0.08); border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 16px; padding: 2rem; margin: 2rem 0;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
          <img src="${currentRank.image}" alt="${currentRank.name}" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid #ffd700;">
          <div style="flex: 1;">
            <h3 style="color: #ffd700; margin: 0 0 0.5rem 0; font-size: 1.4rem;">${currentRank.name}</h3>
            <p style="color: #94a3b8; margin: 0; font-size: 1.1rem; font-weight: 600;">${currentMmr} MMR</p>
          </div>
          ${nextRank ? `
            <div style="text-align: center; color: #64748b; font-size: 0.9rem;">
              <div style="margin-bottom: 0.25rem;">→</div>
              <div>${mmrToNext} to go</div>
            </div>
            <img src="${nextRank.image}" alt="${nextRank.name}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid rgba(255, 215, 0, 0.5); opacity: 0.7;">
          ` : `
            <div style="text-align: center; color: #ffd700; font-size: 0.9rem; font-weight: bold;">
              <div style="font-size: 2rem; margin-bottom: 0.25rem;">👑</div>
              <div>MAX RANK</div>
            </div>
          `}
        </div>
        
        ${nextRank ? `
          <div style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: #e2e8f0; font-size: 0.9rem; font-weight: 500;">Progress to ${nextRank.name}</span>
              <span style="color: #ffd700; font-size: 0.9rem; font-weight: 600;">${progressToNext}%</span>
            </div>
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 50px; height: 12px; overflow: hidden; border: 1px solid rgba(255, 215, 0, 0.3);">
              <div style="
                background: linear-gradient(90deg, #ffd700, #ffed4e);
                height: 100%;
                width: ${progressToNext}%;
                border-radius: 50px;
                transition: width 1s ease-out;
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                ${progressToNext > 0 ? 'animation: progressGlow 2s ease-in-out infinite alternate;' : ''}
              "></div>
            </div>
          </div>
        ` : ''}
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
        <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 1.5rem;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">${mmrChange >= 0 ? '📈' : '📉'}</div>
          <div style="color: ${mmrChange >= 0 ? '#10b981' : '#ef4444'}; font-size: 1.8rem; font-weight: bold; margin-bottom: 0.25rem;">
            ${mmrChange >= 0 ? '+' : ''}${mmrChange}
          </div>
          <div style="color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">MMR Change</div>
        </div>

        <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 1.5rem;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🪙</div>
          <div style="color: #ffd700; font-size: 1.8rem; font-weight: bold; margin-bottom: 0.25rem;">
            +${arenaGold}
          </div>
          <div style="color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Arena Gold</div>
        </div>

        <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 1.5rem;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⭐</div>
          <div style="color: #8b5cf6; font-size: 1.8rem; font-weight: bold; margin-bottom: 0.25rem;">
            +${honor}
          </div>
          <div style="color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Honor</div>
        </div>

        <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 1.5rem;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎯</div>
          <div style="color: #06b6d4; font-size: 1.8rem; font-weight: bold; margin-bottom: 0.25rem;">
            +${experience}
          </div>
          <div style="color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Experience</div>
        </div>
      </div>

      <div style="margin: 2rem 0;">
        <button id="victory-continue-btn" style="
          background: linear-gradient(135deg, #ffd700, #ffed4e);
          border: none;
          color: #1a1a1a;
          padding: 1rem 3rem;
          border-radius: 50px;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
        ">
          <i class="fas fa-arrow-right" style="margin-right: 0.5rem;"></i>
          Continue
        </button>
      </div>

      <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <p style="color: #64748b; font-size: 0.85rem; margin: 0; line-height: 1.4;">
          Match ID: ${result.matchId || 'N/A'} • 
          Reported: ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    // Add progress glow animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes progressGlow {
        from {
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }
        to {
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.4);
        }
      }
    `;
    document.head.appendChild(style);

    // Add canvas and modal to container
    container.appendChild(canvas);
    container.appendChild(modal);
    document.body.appendChild(container);

    // Start particle animation
    this.startParticleAnimation(canvas);

    // Handle continue button
    const continueBtn = modal.querySelector('#victory-continue-btn');
    continueBtn.addEventListener('click', () => {
      container.remove();
      // Clean up injected styles
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    });

    // Add button hover effect
    continueBtn.addEventListener('mouseover', () => {
      continueBtn.style.background = 'linear-gradient(135deg, #ffed4e, #ffd700)';
      continueBtn.style.transform = 'translateY(-3px) scale(1.05)';
      continueBtn.style.boxShadow = '0 8px 30px rgba(255, 215, 0, 0.6)';
    });

    continueBtn.addEventListener('mouseout', () => {
      continueBtn.style.background = 'linear-gradient(135deg, #ffd700, #ffed4e)';
      continueBtn.style.transform = 'translateY(0) scale(1)';
      continueBtn.style.boxShadow = '0 4px 20px rgba(255, 215, 0, 0.4)';
    });
  }

  /**
   * Start particle animation on canvas
   */
  startParticleAnimation(canvas) {
    const ctx = canvas.getContext('2d');
    const particles = [];

    // Create particles
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 4 + 1,
        color: `hsl(${Math.random() * 60 + 30}, 100%, ${Math.random() * 30 + 60}%)`,
        alpha: Math.random() * 0.8 + 0.2,
        life: Math.random() * 100 + 50
      });
    }

    const animate = () => {
      // Check if canvas still exists
      if (!canvas.parentNode) return;ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;

        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Reset particle if life is over
        if (particle.life <= 0) {
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
          particle.life = Math.random() * 100 + 50;
        }
      });

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Utility methods
   */
  switchSuggestionTab(panel, tabName) {
    // Update tab buttons
    panel.querySelectorAll('.suggestion-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update sections
    panel.querySelectorAll('.suggestion-section').forEach(section => {
      section.classList.toggle('active', section.dataset.section === tabName);
    });
  }

  toggleSuggestionsPanel(panel) {
    const content = panel.querySelector('.suggestions-content');
    const icon = panel.querySelector('.btn-toggle-suggestions i');
    
    content.classList.toggle('collapsed');
    icon.classList.toggle('fa-chevron-up');
    icon.classList.toggle('fa-chevron-down');
  }

  addSuggestedPlayer(playerName) {
    console.log('➕ Adding suggested player:', playerName);
    
    // Try multiple selectors to find player inputs
    const selectors = [
      'input[name*="player"]',
      'input[placeholder*="Player"]',
      'input[placeholder*="player"]',
      'input[id*="player"]',
      'input[class*="player"]',
      '.player-input input',
      '#players-container input[type="text"]',
      'input[type="text"][name*="name"]'
    ];
    
    let playerInputs = [];
    for (const selector of selectors) {
      playerInputs = document.querySelectorAll(selector);
      if (playerInputs.length > 0) {
        console.log(`✅ Found ${playerInputs.length} player inputs using selector: ${selector}`);
        break;
      }
    }
    
    if (playerInputs.length === 0) {
      console.log('❌ No player inputs found, trying to generate player fields...');
      
      // Try to trigger player field generation for 1v1
      const matchTypeSelect = document.querySelector('#match-type, select[name="matchType"]');
      if (matchTypeSelect) {
        console.log('🔧 Found match type selector, setting to 1v1 and triggering change...');
        matchTypeSelect.value = '1v1';
        matchTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Wait a moment for fields to generate
        setTimeout(() => {
          const newInputs = document.querySelectorAll('input[name*="player"], input[placeholder*="Player"]');
          if (newInputs.length > 0) {
            console.log('✅ Generated player fields, adding player...');
            this.fillPlayerInput(newInputs, playerName);
          } else {
            console.log('❌ Still no player inputs after field generation');
            this.showPlayerAddedNotification(playerName, false);
          }
        }, 100);
        return;} else {
        console.log('❌ No match type selector found');
        this.showPlayerAddedNotification(playerName, false);
        return;}
    }
    
    this.fillPlayerInput(playerInputs, playerName);
  }
  
  fillPlayerInput(playerInputs, playerName) {
    // Find the first empty input
    let filled = false;
    for (const input of playerInputs) {
      if (!input.value.trim()) {
        console.log('✅ Filling input:', input.name || input.id || input.placeholder);
        input.value = playerName;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Add visual feedback
        input.style.border = '2px solid #10b981';
        setTimeout(() => {
          input.style.border = '';
        }, 1000);
        
        filled = true;
        break;
      }
    }
    
    if (filled) {
      this.showPlayerAddedNotification(playerName, true);
    } else {
      console.log('❌ All player inputs are already filled');
      this.showPlayerAddedNotification(playerName, false, 'All player slots are filled');
    }
  }
  
  showPlayerAddedNotification(playerName, success, reason = '') {
    const message = success 
      ? `✅ Added ${playerName} to match`
      : `❌ Could not add ${playerName}${reason ? ': ' + reason : ''}`;
    
    console.log(message);
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${success ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #dc2626, #b91c1c)'};
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      font-weight: 500;
      animation: slideInRight 0.3s ease-out;
    `;
    toast.innerHTML = `<i class="fas fa-${success ? 'check' : 'exclamation-triangle'}"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  formatLastSeen(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';if (days === 1) return 'Yesterday';if (days < 7) return `${days} days ago`;return date.toLocaleDateString();}

  clearCaches() {
    this.playerCache.clear();
    this.mapCache.clear();
    this.recentOpponents = [];
  }

  /**
   * Load maps for atlas based on current filters
   */
  async loadMapsForAtlas() {
    const modal = document.getElementById('map-atlas-modal');
    if (!modal) return;const gameFilter = modal.querySelector('#atlas-game-filter').value || 'wc2';
    const playersFilter = modal.querySelector('#atlas-players-filter').value || '';
    const searchQuery = modal.querySelector('#atlas-search').value || '';
    
    const mapsGrid = modal.querySelector('#atlas-maps-grid');
    mapsGrid.innerHTML = '<div class="loading-maps"><i class="fas fa-spinner fa-spin"></i> Loading maps...</div>';

    try {
      let url = `/api/${gameFilter}maps`;
      const params = new URLSearchParams();
      
      if (playersFilter) params.append('players', playersFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      console.log('🗺️ Loading maps from:', url);
      
      const response = await fetch(url, { credentials: 'include' });
      
      if (response.ok) {
        const data = await response.json();
        const maps = data.data || data.maps || data;
        console.log('✅ Maps loaded:', maps.length);
        this.renderMapsInAtlas(maps, gameFilter);
      } else {
        console.error('❌ Failed to load maps:', response.status);
        mapsGrid.innerHTML = '<div class="loading-maps">Failed to load maps</div>';
      }
    } catch (error) {
      console.error('❌ Error loading maps:', error);
      mapsGrid.innerHTML = '<div class="loading-maps">Error loading maps</div>';
    }
  }

  /**
   * Render maps in atlas grid
   */
  renderMapsInAtlas(maps, gameType) {
    const mapsGrid = document.getElementById('atlas-maps-grid');
    if (!mapsGrid) return;if (!maps || maps.length === 0) {
      mapsGrid.innerHTML = '<div class="loading-maps">No maps found</div>';
      return;}

    // Sort by popularity (downloadCount) and rating, then take top 20
    const sortedMaps = maps
      .sort((a, b) => {
        const aPopularity = (a.downloadCount || 0) + (a.viewCount || 0);
        const bPopularity = (b.downloadCount || 0) + (b.viewCount || 0);
        const aRating = a.averageRating || 0;
        const bRating = b.averageRating || 0;
        
        // Sort by popularity first, then rating
        if (bPopularity !== aPopularity) return bPopularity - aPopularity;return bRating - aRating;})
      .slice(0, 20);

    mapsGrid.innerHTML = sortedMaps.map(map => {
      const mapName = map.name || map.filename || 'Unknown Map';
      const mapImage = map.thumbnailPath || map.imagePath || '/assets/img/default-map.png';
      const players = map.players || '2';
      const size = map.size || map.mapSize || 'Unknown';
      const downloads = map.downloadCount || 0;
      const rating = map.averageRating || 0;
      
      return `
        <div class="map-card" data-map-name="${mapName}" data-map-id="${map._id || ''}">
          <div class="map-thumbnail">
            <img src="${mapImage}" alt="${mapName}" onerror="this.src='/assets/img/default-map.png'">
          </div>
          <div class="map-info">
            <h4 title="${mapName}">${mapName}</h4>
            <div class="map-details">
              <span class="map-players">${players} players</span>
              <span class="map-size">${size}</span>
            </div>
            <div class="map-stats">
              <span class="map-downloads">📥 ${downloads}</span>
              <span class="map-rating">⭐ ${rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      `;}).join('');

    // Add click handlers
    mapsGrid.querySelectorAll('.map-card').forEach(card => {
      card.addEventListener('click', () => {
        const mapName = card.dataset.mapName;
        this.selectMapFromAtlas(mapName);
      });
    });
  }

  /**
   * Select map from atlas
   */
  selectMapFromAtlas(mapName) {
    const modal = document.getElementById('map-atlas-modal');
    const targetInputId = modal.dataset.targetInput;
    const targetInput = document.getElementById(targetInputId);
    
    if (targetInput) {
      targetInput.value = mapName;
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Close atlas modal
    this.closeMapAtlas();
  }

  filterMaps() {
    this.loadMapsForAtlas();
  }

  searchMaps(query) {
    clearTimeout(this.mapSearchTimeout);
    this.mapSearchTimeout = setTimeout(() => {
      this.loadMapsForAtlas();
    }, 300);
  }

  closeMapAtlas() {
    const modal = document.getElementById('map-atlas-modal');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  enhanceFormUX() {
    // Additional UX enhancements
  }
}

// Export singleton instance
export const matchReportingEnhancements = new MatchReportingEnhancements();
