/**
 * Clan Management System
 * Handles clan creation, member management, applications, and chat
 */

import { apiClient } from './ApiClient.js';
import { UIManager } from './UIManager.js';


export class ClanManager {
  constructor() {
    this.api = apiClient;
    this.ui = new UIManager();
    this.gameManager = window.gameManager;
    this.currentClan = null;
    this.clans = [];
    this.clanMembers = [];
    this.pendingApplications = [];
    this.pageSize = 12; // Add missing pageSize property
    this.state = {
      currentGame: 'warcraft2',
      searchQuery: '',
      currentPage: 1,
      totalPages: 1,
      activeTab: 'overview'
    };
  }

  /**
   * Initialize clan system
   */
  async init() {
    try {
      await this.loadUserClan();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize clan system:', error);
    }
  }

  /**
   * Load user's current clan
   */
  async loadUserClan() {
    try {
      const data = await this.api.getUserClan();
      this.currentClan = Array.isArray(data) ? data[0] : data;
      
      // Load clan members and applications if user has a clan
      if (this.currentClan && this.currentClan._id) {
        await Promise.all([
          this.loadClanMembers(),
          this.loadPendingApplications()
        ]);
      }
      
      this.renderClanUI();
    } catch (error) {
      console.error('ClanManager: Failed to load user clan:', error);
    }
  }

  /**
   * Load clan members
   */
  async loadClanMembers() {
    if (!this.currentClan || !this.currentClan._id) {
      this.clanMembers = [];
      return;}

    try {
      const data = await this.api.getClanMembers(this.currentClan._id);
      this.clanMembers = data;
    } catch (error) {
      console.error('Failed to load clan members:', error);
      this.clanMembers = [];
    }
  }

  /**
   * Load pending applications (for clan leaders)
   */
  async loadPendingApplications() {
    if (!this.currentClan || !this.currentClan._id || !this.isUserClanLeader()) {
      console.log('No clan, clan ID, or user is not leader - skipping applications');
      this.pendingApplications = [];
      return;}

    try {
      const data = await this.api.getClanApplications(this.currentClan._id);
      this.pendingApplications = data;
    } catch (error) {
      console.error('Failed to load pending applications:', error);
      this.pendingApplications = [];
    }
  }

  /**
   * Load available clans
   */
  async loadClans(search = '', page = 1) {
    try {
      const gameType = this.gameManager?.getCurrentGame() || 'all';
      const params = { 
        search, 
        page, 
        limit: this.pageSize,
        gameType: gameType === 'all' ? undefined : gameType
      };
      
      const data = await this.api.getClans(params);
      this.clans = data.clans || [];
      this.state.totalPages = data.pagination?.pages || 1;
      this.state.currentPage = page;
      this.state.searchQuery = search;
    } catch (error) {
      console.error('Failed to load clans:', error);
      this.clans = [];
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Create clan modal events
    this.setupCreateClanModal();
    
    // Find clans modal events
    this.setupFindClansModal();
    
    // Join clan modal events
    this.setupJoinClanModal();
    
    // Search clans
    this.setupClanSearch();
    
    // Tab navigation
    this.setupTabNavigation();
    
    console.log('✅ Clan event listeners setup complete');
  }

  /**
   * Setup create clan modal
   */
  setupCreateClanModal() {
    const modal = document.getElementById('create-clan-modal');
    const form = document.getElementById('create-clan-form');
    const closeBtn = document.getElementById('close-create-clan-modal');
    const cancelBtn = document.getElementById('cancel-create-clan');
    
    if (!modal || !form) {
      console.warn('Create clan modal elements not found');
      return;}

    // Close modal events
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
      });
    }

    // Form submission
    form.addEventListener('submit', (e) => this.handleCreateClan(e));

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
      }
    });
  }

  /**
   * Setup find clans modal
   */
  setupFindClansModal() {
    const modal = document.getElementById('find-clans-modal');
    const closeBtn = document.getElementById('close-find-clans-modal');
    const searchBtn = document.getElementById('search-clans-btn');
    const searchInput = document.getElementById('clan-search-name');
    
    if (!modal) {
      console.warn('Find clans modal not found');
      return;}

    // Close modal events
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
      });
    }

    // Search functionality
    if (searchBtn && searchInput) {
      const performSearch = () => {
        const query = searchInput.value.trim();
        const gameType = document.getElementById('clan-search-game')?.value || 'all';
        this.searchClans(query, gameType);
      };

      searchBtn.addEventListener('click', performSearch);
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performSearch();
        }
      });
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
      }
    });
  }

  /**
   * Setup join clan modal
   */
  setupJoinClanModal() {
    const modal = document.getElementById('join-clan-modal');
    const closeBtn = document.getElementById('close-join-clan-modal');
    const cancelBtn = document.getElementById('cancel-join-clan');
    const confirmBtn = document.getElementById('confirm-join-clan');
    
    if (!modal) {
      console.warn('Join clan modal not found');
      return;}

    // Close modal events
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
      });
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
      }
    });
  }

  /**
   * Search clans with filters
   */
  async searchClans(query = '', gameType = 'all') {
    try {
      const params = {
        search: query,
        gameType: gameType === 'all' ? undefined : gameType,
        limit: 20
      };
      
      const data = await this.api.searchClans(params);
      return data;
    } catch (error) {
      console.error('Error searching clans:', error);
      return [];
    }
  }

  /**
   * Render clans in the find clans modal
   */
  renderClansInModal() {
    const container = document.getElementById('clans-list');
    if (!container) return;if (this.clans.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <p>No clans found matching your criteria.</p>
        </div>
      `;
      return;}

    const clansHTML = this.clans.map(clan => this.createClanCardForModal(clan)).join('');
    container.innerHTML = clansHTML;
  }

  /**
   * Create clan card for modal
   */
  createClanCardForModal(clan) {
    const memberCount = clan.members?.length || 0;
    const maxMembers = clan.maxMembers || 50;
    
    return `
      <div class="clan-card modal-clan-card" data-clan-id="${clan._id}">
        <div class="clan-info">
          <div class="clan-header">
            <h4>[${clan.tag}] ${clan.name}</h4>
            <span class="clan-game">${this.formatGameType(clan.gameType)}</span>
          </div>
          <p class="clan-description">${clan.description || 'No description provided.'}</p>
          <div class="clan-stats">
            <span class="stat">
              <i class="fas fa-users"></i>
              ${memberCount}/${maxMembers} members
            </span>
            <span class="stat">
              <i class="fas fa-trophy"></i>
              ${clan.rating || 1500} rating
            </span>
            <span class="stat">
              <i class="fas fa-door-open"></i>
              ${clan.recruitmentType || 'Application'}
            </span>
          </div>
        </div>
        <div class="clan-actions">
          <button class="epic-btn" onclick="window.joinClan?.('${clan._id}')">
            <i class="fas fa-plus"></i>
            ${clan.recruitmentType === 'open' ? 'Join' : 'Apply'}
          </button>
          <button class="clan-action-btn secondary" onclick="window.viewClanDetails?.('${clan._id}')">
            <i class="fas fa-eye"></i>
            View
          </button>
        </div>
      </div>
    `;}

  /**
   * Format game type for display
   */
  formatGameType(gameType) {
    const gameTypes = {
      'warcraft1': 'WC: Orcs & Humans',
      'warcraft2': 'WC II: Tides of Darkness',
      'warcraft3': 'WC III: Reign of Chaos',
      'wc1': 'WC: Orcs & Humans',
      'wc2': 'WC II',
      'wc3': 'WC III',
      'war1': 'WC: Orcs & Humans',
      'war2': 'WC II',
      'war3': 'WC III',
      'wc12': 'WC I & II',
    };
    return gameTypes[gameType] || gameType;}

  /**
   * Setup clan search
   */
  setupClanSearch() {
    const searchInput = document.getElementById('clan-search');
    const searchButton = document.getElementById('clan-search-btn');
    
    if (!searchInput || !searchButton) return;const performSearch = () => {
      const query = searchInput.value.trim();
      this.loadClans(query, 1);
      this.renderClansGrid();
    };

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  /**
   * Setup tab navigation
   */
  setupTabNavigation() {
    const tabs = document.querySelectorAll('.clan-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.setActiveTab(tabName);
      });
    });
  }

  /**
   * Set active tab
   */
  setActiveTab(tabName) {
    this.state.activeTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.clan-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.clan-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    // Load tab-specific content
    this.loadTabContent(tabName);
  }

  /**
   * Load content for specific tab
   */
  async loadTabContent(tabName) {
    switch (tabName) {
      case 'members':
        this.renderClanMembers();
        break;
      case 'stone-tablet':
        this.loadClanStoneTablet();
        break;
      case 'applications':
        if (this.isUserClanLeader()) {
          this.renderPendingApplications();
        }
        break;
      case 'browse':
        await this.loadClans();
        this.renderClansGrid();
        break;
    }
  }

  /**
   * Switch to different game
   */
  async switchGame(gameType) {
    if (this.state.currentGame === gameType) return;this.state.currentGame = gameType;
    
    // Reload clan data for new game
    await Promise.all([
      this.loadUserClan(),
      this.loadClans()
    ]);

    this.renderClanUI();
  }

  /**
   * Render complete clan UI
   */
  renderClanUI() {
    console.log('ClanManager: renderClanUI() called');
    
    // Look for clan container in both main page and modal contexts
    let clanContainer = document.getElementById('clan-container');
    
    // If not found in main page, look in modal
    if (!clanContainer) {
      const modal = document.querySelector('.modal.show');
      if (modal) {
        clanContainer = modal.querySelector('#clan-container');
        console.log('ClanManager: Found clan container in modal');
      }
    }
    
    console.log('ClanManager: clan-container element:', clanContainer);
    
    if (!clanContainer) {
      console.error('ClanManager: clan-container element not found in main page or modal!');
      return;}
    
    console.log('ClanManager: Current clan:', this.currentClan);
    console.log('ClanManager: Current clan _id:', this.currentClan?._id);
    
    if (this.currentClan && this.currentClan._id) {
      console.log('ClanManager: Rendering user clan...');
      this.renderUserClan(clanContainer);
    } else {
      console.log('ClanManager: Rendering no clan...');
      this.renderNoClan(clanContainer);
    }
  }

  /**
   * Render loading state for clan
   */
  renderClanLoading() {
    const container = document.getElementById('clan-container');
    if (!container) return;container.innerHTML = `
      <div class="clan-loading">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading clan information...</p>
      </div>
    `;
  }

  /**
   * Render user's clan interface
   */
  renderUserClan(container) {
    console.log('ClanManager: renderUserClan() called');
    console.log('ClanManager: container element in renderUserClan:', container);
    
    if (!container) {
      console.error('ClanManager: container element not found in renderUserClan!');
      return;}

    const isLeader = this.isUserClanLeader();
    const gameType = this.gameManager?.getCurrentGame() || 'warcraft2';
    const gameData = this.gameManager?.getCurrentGameData() || {};
    
    console.log('ClanManager: isLeader:', isLeader);
    console.log('ClanManager: clanMembers.length:', this.clanMembers.length);
    console.log('ClanManager: pendingApplications.length:', this.pendingApplications.length);

    container.innerHTML = `
      <div class="clan-encampment-container">
        <!-- Clan Header - Compact and Clean -->
        <div class="clan-header-compact">
          <div class="clan-logo-section">
            <div class="clan-logo">
              <i class="fas fa-shield-alt"></i>
            </div>
            <div class="clan-badge">[${this.currentClan.tag}]</div>
          </div>
          
          <div class="clan-info-section">
            <h2 class="clan-name">${this.currentClan.name}</h2>
            <div class="clan-meta">
              <span class="clan-role">
                <i class="fas fa-crown"></i>
                ${isLeader ? 'Leader' : 'Member'}
              </span>
              <span class="clan-game">
                <i class="fas fa-gamepad"></i>
                ${this.formatGameType(this.currentClan.gameType)}
              </span>
            </div>
          </div>
          
          <div class="clan-stats-compact">
            <div class="stat-item">
              <span class="stat-number">${this.clanMembers.length}</span>
              <span class="stat-label">Members</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${this.currentClan.level || 1}</span>
              <span class="stat-label">Level</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${this.currentClan.rating || 1500}</span>
              <span class="stat-label">Rating</span>
            </div>
          </div>
        </div>

        <!-- Clan Description -->
        <div class="clan-description-section">
          <p class="clan-description-text">${this.currentClan.description || 'No description provided'}</p>
        </div>

        <!-- Main Action Buttons -->
        <div class="clan-main-actions">
          <button class="clan-action-btn primary" onclick="clanManager.openClanGarrison()">
            <i class="fas fa-comments"></i>
            <span>Clan Garrison Chat</span>
          </button>
          
          <button class="clan-action-btn secondary" onclick="window.location.href='/views/stone-tablet.html?game=clan'">
            <i class="fas fa-scroll"></i>
            <span>Stone Tablet</span>
          </button>
          
          ${isLeader ? `
            <button class="clan-action-btn secondary" onclick="clanManager.showEditClanModal()">
              <i class="fas fa-cog"></i>
              <span>Manage Clan</span>
            </button>
          ` : ''}
        </div>

        <!-- Tab Navigation -->
        <div class="clan-tabs-container">
          <div class="clan-tabs">
            <button class="clan-tab active" data-tab="overview">
              <i class="fas fa-home"></i>
              <span>Overview</span>
            </button>
            <button class="clan-tab" data-tab="members">
              <i class="fas fa-users"></i>
              <span>Members (${this.clanMembers.length})</span>
            </button>
            ${isLeader ? `
              <button class="clan-tab" data-tab="applications">
                <i class="fas fa-inbox"></i>
                <span>Applications (${this.pendingApplications.length})</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Tab Content -->
        <div class="clan-tab-content active" id="overview-tab">
          ${this.renderClanOverview()}
        </div>

        <div class="clan-tab-content" id="members-tab">
          <div class="members-container">
            <div class="members-header">
              <h3>Clan Members</h3>
              ${isLeader ? `
                <button class="invite-btn" onclick="clanManager.showInvitePlayerModal()">
                  <i class="fas fa-plus"></i>
                  Invite Player
                </button>
              ` : ''}
            </div>
            <div id="clan-members-container" class="members-grid">
              ${this.renderClanMembersList()}
            </div>
          </div>
        </div>

        ${isLeader ? `
          <div class="clan-tab-content" id="applications-tab">
            <div class="applications-container">
              <div class="applications-header">
                <h3>Pending Applications</h3>
              </div>
              <div id="clan-applications-container">
                ${this.renderPendingApplicationsList()}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Bottom Actions -->
        <div class="clan-bottom-actions">
          <button class="clan-action-btn danger" onclick="clanManager.showLeaveClanModal()">
            <i class="fas fa-sign-out-alt"></i>
            <span>Leave Clan</span>
          </button>
        </div>
      </div>
    `;

    // Styles are now provided by static CSS in /css/clan-encampment.css
    
    console.log('ClanManager: HTML content set, calling setupTabNavigation()');
    this.setupTabNavigation();
    
    // Set up click handlers for member cards in overview tab
    this.setupMemberCardClickHandlers();
    console.log('ClanManager: renderUserClan() completed');
  }

  /**
   * Add custom styles for the clan encampment modal
   */
  addClanEncampmentStyles() {
    const styleId = 'clan-encampment-styles';
    if (document.getElementById(styleId)) {
      document.getElementById(styleId).remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .clan-encampment-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .clan-header-compact {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .clan-logo-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .clan-logo {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: #1a1a2e;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
      }

      .clan-badge {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .clan-info-section {
        flex: 1;
      }

      .clan-name {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
        color: #ffd700;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }

      .clan-meta {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .clan-role, .clan-game {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: #b8c5d6;
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 8px;
        border-radius: 4px;
      }

      .clan-role i {
        color: #ffd700;
      }

      .clan-stats-compact {
        display: flex;
        gap: 16px;
      }

      .stat-item {
        text-align: center;
        min-width: 60px;
      }

      .stat-number {
        display: block;
        font-size: 20px;
        font-weight: 700;
        color: #4ecdc4;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .stat-label {
        display: block;
        font-size: 12px;
        color: #b8c5d6;
        margin-top: 2px;
      }

      .clan-description-section {
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 4px solid #4ecdc4;
      }

      .clan-description-text {
        margin: 0;
        color: #e8e8e8;
        line-height: 1.6;
        font-style: italic;
      }

      .clan-main-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .clan-action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        font-size: 14px;
      }

      .clan-action-btn.primary {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
      }

      .clan-action-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
      }

      .clan-action-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #e8e8e8;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .clan-action-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }

      .clan-action-btn.danger {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
      }

      .clan-action-btn.danger:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
      }

      .clan-tabs-container {
        margin-bottom: 20px;
      }

      .clan-tabs {
        display: flex;
        gap: 4px;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .clan-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        background: transparent;
        border: none;
        border-radius: 6px;
        color: #b8c5d6;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        font-size: 14px;
      }

      .clan-tab.active {
        background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(78, 205, 196, 0.3);
      }

      .clan-tab:hover:not(.active) {
        background: rgba(255, 255, 255, 0.1);
        color: #e8e8e8;
      }

      .clan-tab-content {
        display: none;
        animation: fadeIn 0.3s ease;
      }

      .clan-tab-content.active {
        display: block;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .members-container, .applications-container {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .members-header, .applications-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .members-header h3, .applications-header h3 {
        margin: 0;
        color: #ffd700;
        font-size: 18px;
      }

      .invite-btn {
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.3s ease;
      }

      .invite-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
      }

      .members-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #b8c5d6;
      }

      .empty-state i {
        font-size: 48px;
        color: #4ecdc4;
        margin-bottom: 16px;
        opacity: 0.6;
      }

      .empty-state h3 {
        margin: 0 0 8px 0;
        color: #ffd700;
        font-size: 18px;
      }

      .empty-state p {
        margin: 0;
        font-size: 14px;
        opacity: 0.8;
      }

      /* Member Card Styling */
      .member-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .member-card:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .member-card .member-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .member-card .member-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
      }

      .member-card .member-info h4 {
        margin: 0 0 4px 0;
        color: #e8e8e8;
        font-size: 16px;
      }

      .member-card .member-role {
        font-size: 12px;
        color: #ffd700;
        font-weight: 600;
      }

      .member-card .member-stats {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }

      .member-card .member-stat {
        text-align: center;
        flex: 1;
      }

      .member-card .member-stat-value {
        display: block;
        font-size: 16px;
        font-weight: 700;
        color: #4ecdc4;
      }

      .member-card .member-stat-label {
        display: block;
        font-size: 10px;
        color: #b8c5d6;
        margin-top: 2px;
      }

      /* Application Card Styling */
      .application-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        transition: all 0.3s ease;
      }

      .application-card:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .application-card .application-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .application-card .applicant-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .application-card .applicant-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
      }

      .application-card .applicant-name {
        font-weight: 600;
        color: #e8e8e8;
      }

      .application-card .application-date {
        font-size: 12px;
        color: #b8c5d6;
      }

      .application-card .application-message {
        color: #e8e8e8;
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .application-card .application-actions {
        display: flex;
        gap: 8px;
      }

      .application-card .action-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.3s ease;
      }

      .application-card .accept-btn {
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
        color: white;
      }

      .application-card .reject-btn {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
      }

      .application-card .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .clan-bottom-actions {
        display: flex;
        justify-content: center;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .clan-header-compact {
          flex-direction: column;
          text-align: center;
          gap: 16px;
        }

        .clan-stats-compact {
          justify-content: center;
        }

        .clan-main-actions {
          justify-content: center;
        }

        .clan-tabs {
          flex-direction: column;
        }

        .members-grid {
          grid-template-columns: 1fr;
        }

        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Render clan members list for the members tab
   */
  renderClanMembersList() {
    if (!this.clanMembers || this.clanMembers.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h3>No Members</h3>
          <p>This clan has no members yet.</p>
        </div>
      `;}

    return this.clanMembers.map(member => this.createMemberCard(member)).join('');}

  /**
   * Render pending applications list
   */
  renderPendingApplicationsList() {
    if (!this.pendingApplications || this.pendingApplications.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No Pending Applications</h3>
          <p>All applications have been reviewed.</p>
        </div>
      `;}

    return this.pendingApplications.map(application => this.createApplicationCard(application)).join('');}

  /**
   * Render clan overview
   */
  renderClanOverview() {
    const recentMembers = this.clanMembers.slice(0, 5);
    
    const overviewContent = `
      <div class="clan-overview">
        <div class="overview-section">
          <h3>Recent Members</h3>
          <div class="recent-members">
            ${recentMembers.map(member => this.createMemberCard(member)).join('')}
          </div>
        </div>

        <div class="overview-section">
          <h3>Clan Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <h4>Win Rate</h4>
              <span class="stat-number">${this.calculateClanWinRate()}%</span>
            </div>
            <div class="stat-card">
              <h4>Average MMR</h4>
              <span class="stat-number">${this.calculateAverageMMR()}</span>
            </div>
            <div class="stat-card">
              <h4>Founded</h4>
              <span class="stat-number">${this.formatDate(this.currentClan.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    return overviewContent;}

  /**
   * Format date for display
   */
  formatDate(date) {
    if (!date) return 'Unknown';const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;}

  /**
   * Render no clan interface
   */
  renderNoClan(container) {
    container.innerHTML = `
              <div class="clan-encampment-actions">
        <button class="encampment-btn create-clan-btn" onclick="clanManager.showCreateClanModal()">
          CREATE CLAN
        </button>
        
        <button class="encampment-btn browse-clans-btn" onclick="clanManager.showBrowseClansModal()">
          BROWSE CLANS
        </button>
      </div>
    `;
  }

  /**
   * Render clans grid
   */
  renderClansGrid() {
    const container = document.getElementById('clans-grid-container');
    if (!container) return;if (this.clans.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-inbox"></i>
          </div>
          <h3 class="empty-state-title">No Clans Found</h3>
          <p class="empty-state-message">No clans match your search criteria.</p>
          <button class="btn btn-primary empty-state-action" onclick="window.clanManager.showCreateClanModal()">
            Create Clan
          </button>
        </div>
      `;
      return;}

    container.innerHTML = `
      <div class="clans-grid">
        ${this.clans.map(clan => this.createClanCard(clan)).join('')}
      </div>
      ${this.renderPagination()}
    `;
  }

  /**
   * Create clan card HTML
   */
  createClanCard(clan) {
    const gameData = this.gameManager?.getGameData?.(clan.gameType) || {};
    
    return `
      <div class="clan-card">
        <div class="clan-card-header">
          <div class="clan-tag">[${clan.tag}]</div>
          <div class="clan-game">
            <i class="${gameData.icon || 'fas fa-gamepad'}"></i>
            ${gameData.name || clan.gameType}
          </div>
        </div>
        
        <div class="clan-card-content">
          <h3 class="clan-name">${clan.name}</h3>
          <p class="clan-description">${clan.description || 'No description provided'}</p>
          
          <div class="clan-stats-mini">
            <div class="stat-mini">
              <i class="fas fa-users"></i>
              <span>${clan.memberCount || 0} members</span>
            </div>
            <div class="stat-mini">
              <i class="fas fa-trophy"></i>
              <span>Level ${clan.level || 1}</span>
            </div>
          </div>
        </div>
        
        <div class="clan-card-actions">
          <button class="btn btn-primary" onclick="clanManager.showClanDetails('${clan._id}')">
            View Details
          </button>
          <button class="btn btn-secondary" onclick="clanManager.showApplyToClanModal('${clan._id}')">
            Apply to Join
          </button>
        </div>
      </div>
    `;}

  /**
   * Render pagination
   */
  renderPagination() {
    if (this.state.totalPages <= 1) return '';return `
      <div class="pagination">
        <button class="btn btn-secondary" 
                onclick="clanManager.loadClans('${this.state.searchQuery}', ${this.state.currentPage - 1})"
                ${this.state.currentPage <= 1 ? 'disabled' : ''}>
          Previous
        </button>
        <span class="page-info">Page ${this.state.currentPage} of ${this.state.totalPages}</span>
        <button class="btn btn-secondary"
                onclick="clanManager.loadClans('${this.state.searchQuery}', ${this.state.currentPage + 1})"
                ${this.state.currentPage >= this.state.totalPages ? 'disabled' : ''}>
          Next
        </button>
      </div>
    `;}

  /**
   * Show create clan modal
   */
  showCreateClanModal() {
    console.log('Showing create clan modal...');
    
    // First get user's players
    this.getUserPlayers().then(players => {
      console.log('Players loaded for clan creation:', players);
      
      if (players.length === 0) {
        console.log('No players found, showing error');
        this.showError('You need to have at least one player to create a clan. Please add a player in your profile first.');
        return;}

      console.log('Creating clan modal with players:', players);
      const modal = this.createModal('create-clan-modal', 'Create Clan', `
        <form id="create-clan-form" class="clan-form">
          <div class="form-group">
            <label for="clan-name">Clan Name</label>
            <input type="text" id="clan-name" name="name" required 
                   placeholder="Enter clan name" maxlength="50">
            <small class="form-help">2-50 characters</small>
          </div>
          
          <div class="form-group">
            <label for="clan-tag">Clan Tag</label>
            <input type="text" id="clan-tag" name="tag" required 
                   placeholder="Enter clan tag" maxlength="6">
            <small class="form-help">2-6 characters</small>
          </div>
          
          <div class="form-group">
            <label for="clan-description">Description</label>
            <textarea id="clan-description" name="description" rows="3"
                      placeholder="Describe your clan..." maxlength="1000"></textarea>
          </div>
          

          
          <div class="form-group">
            <label for="clan-player">Select Player</label>
            <select id="clan-player" name="playerId" required>
              ${players.map(player => `
                <option value="${player._id}">${player.name} (MMR: ${player.mmr || 1500})</option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="clan-recruitment">Recruitment</label>
            <select id="clan-recruitment" name="recruitmentType" required>
              <option value="open">Open - Anyone can join</option>
              <option value="application">Application Required</option>
              <option value="invite">Invite Only</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Create Clan
            </button>
          </div>
        </form>
      `);

      // Handle form submission
      const form = modal.querySelector('#create-clan-form');
      if (!form) {
        console.error('Create clan form not found in modal!');
        return;}
      
      console.log('Found create clan form:', form);
      
      form.addEventListener('submit', (e) => {
        console.log('Clan form submitted');
        this.handleCreateClan(e);
      });
      
      console.log('Form event listener added to:', form);
    }).catch(error => {
      console.error('Failed to load players:', error);
      this.showError('Failed to load your players.');
    });
  }

  /**
   * Get global user data from cached window object
   */
  getGlobalUserData() {
    // Primary source: window.currentUser set by main.js
    if (window.currentUser) {
      return window.currentUser;}
    
    // Secondary: localStorage user data
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        return JSON.parse(userData);}
    } catch (error) {
      console.warn('Error parsing localStorage user data:', error);
    }
    
    // Try to get user data from profile manager
    if (window.profileManager && window.profileManager.userData) {
      return window.profileManager.userData;}
    
    // Try to get from profile data loader
    if (window.profileDataLoader && window.profileDataLoader.userData) {
      return window.profileDataLoader.userData;}
    
    // Fallback: try to get from navbar cache
    if (window.userDataCache) {
      return window.userDataCache;}
    
    console.warn('No global user data available');
    return null;}

  /**
   * Get user's players for clan operations
   */
  async getUserPlayers() {
    try {
      console.log('Getting user players...');
      
      // Get user data which contains the linked players
      const userData = await this.getGlobalUserData();
      console.log('User data for players:', userData);
      
      // Always try the API call regardless of whether we have user data cached
      console.log('Making direct API call for user players...');
      const data = await this.api.getMyPlayers();
      console.log('Found players:', data);
      return data;
    } catch (error) {
      console.error('Error getting user players:', error);
      return [];
    }
  }

  /**
   * Handle create clan form submission
   */
  async handleCreateClan(event) {
    event.preventDefault();
    
    try {
      const formData = new FormData(event.target);
      
      const clanData = {
        name: formData.get('name').trim(),
        tag: formData.get('tag').trim().toUpperCase(),
        description: formData.get('description').trim(),
        gameType: 'multi',
        recruitmentType: formData.get('recruitmentType'),
        playerId: formData.get('playerId')
      };

      console.log('Creating clan with data:', clanData);

      // Validate clan data
      if (!this.validateClanData(clanData)) {
        console.log('Clan data validation failed');
        return;}

      this.showLoading('Creating clan...');
      
      console.log('Sending clan creation request...');
      const createdClan = await this.api.createClan(clanData);
      console.log('Clan created successfully:', createdClan);
      
      this.showSuccess('Clan created successfully!');
      
      // Close modal properly - find and remove the modal
      const modal = event.target.closest('.modal') || document.querySelector('.modal');
      if (modal) {
        modal.remove();
      }
      
      console.log('Reloading clan data...');
      await this.loadUserClan();
      this.renderClanUI();
      
      // Notify chat system of clan membership change
      if (window.chatManager && typeof window.chatManager.onClanMembershipChanged === 'function') {
        window.chatManager.onClanMembershipChanged();
        console.log('🔄 Notified chat system of clan creation');
      }
      
    } catch (error) {
      console.error('Failed to create clan:', error);
      const errorMessage = error.message || 'Failed to create clan';
      
      if (errorMessage.includes('already in a clan')) {
        this.showError('You are already in a clan for this game type. You must leave your current clan before creating a new one.');
        
        // Close modal and refresh to show existing clan
        const modal = event.target.closest('.modal') || document.querySelector('.modal');
        if (modal) {
          modal.remove();
        }
        
        await this.loadUserClan();
        this.renderClanUI();
      } else {
        this.showError(`Failed to create clan: ${errorMessage}`);
      }
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Validate clan data
   */
  validateClanData(data) {
    const validationRules = this.gameManager?.getValidationRules() || {};
    
    if (!data.name || data.name.length < 3) {
      this.showError('Clan name must be at least 3 characters long');
      return false;}
    
    if (!data.tag || data.tag.length < 2) {
      this.showError('Clan tag must be at least 2 characters long');
      return false;}
    
    if (data.tag.length > 6) {
      this.showError('Clan tag must be 6 characters or less');
      return false;}
    
    return true;}

  /**
   * Show apply to clan modal
   */
  async showApplyToClanModal(clanId) {
    try {
      // Get user's players for the current game
      const players = await this.getUserPlayers();
      
      if (players.length === 0) {
        this.ui.showError('You need to have at least one player to join a clan. Please add a player in your profile first.');
        return;}

      const modal = this.ui.createModal('apply-clan-modal', 'Apply to Clan', `
        <form id="apply-clan-form" class="form">
          <div class="form-group">
            <label for="player-select">Select Player</label>
            <select id="player-select" name="playerId" required>
              ${players.map(player => `
                <option value="${player._id}">${player.name} (MMR: ${player.mmr || 1500})</option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="application-message">Application Message</label>
            <textarea id="application-message" name="message" rows="4" required
                      placeholder="Tell the clan why you want to join..."></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Submit Application
            </button>
          </div>
        </form>
      `);

      // Handle form submission
      const form = modal.querySelector('#apply-clan-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleApplyToClan(e, clanId);
      });

    } catch (error) {
      console.error('Failed to load apply modal:', error);
      this.ui.showError('Failed to load application form.');
    }
  }

  /**
   * Handle apply to clan
   */
  async handleApplyToClan(event, clanId) {
    try {
      const formData = new FormData(event.target);
      
      const applicationData = {
        playerId: formData.get('playerId'),
        message: formData.get('message').trim()
      };

      this.ui.showLoading('Submitting application...');
      
      await this.api.applyToClan(clanId, applicationData);
      
      this.ui.showSuccess('Application submitted successfully!');
      
      // Close modal
      document.querySelector('.modal').remove();
      
    } catch (error) {
      console.error('Failed to apply to clan:', error);
      this.ui.showError(`Failed to submit application: ${error.message}`);
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Render clan members
   */
  renderClanMembers() {
    const container = document.getElementById('clan-members-container');
    if (!container) return;const isLeader = this.isUserClanLeader();

    // Initialize filter if not set
    if (!this.memberGameFilter) {
      this.memberGameFilter = 'all';
    }

    // Filter members by game type and match history
    const filteredMembers = this.memberGameFilter === 'all' 
      ? this.clanMembers 
      : this.clanMembers.filter(member => {
          if (!member.player) return false;const hasMatches = member.player.stats?.totalMatches > 0;
          if (!hasMatches) return false;const gameType = member.player.gameType;
          
          // Filter by game type (handle both long and short formats)
          if (this.memberGameFilter === 'wc1') {
            return gameType === 'wc1';} else if (this.memberGameFilter === 'wc2') {
              return gameType === 'wc2';} else if (this.memberGameFilter === 'wc3') {
              return gameType === 'wc3';}
          return false;});

    // Count members by game type (only those with match history) - handle both long and short formats
    const wc1Count = this.clanMembers.filter(m => {
      const gameType = m.player?.gameType;
                  return gameType === 'wc1' && m.player?.stats?.totalMatches > 0;}).length;
    const wc2Count = this.clanMembers.filter(m => {
      const gameType = m.player?.gameType;
                  return gameType === 'wc2' && m.player?.stats?.totalMatches > 0;}).length;  
    const wc3Count = this.clanMembers.filter(m => {
      const gameType = m.player?.gameType;
                  return gameType === 'wc3' && m.player?.stats?.totalMatches > 0;}).length;

    container.innerHTML = `
      <div class="members-header">
        <h3>Clan Members (${this.clanMembers.length})</h3>
        ${isLeader ? `
          <button class="btn btn-primary" onclick="clanManager.showInvitePlayerModal()">
            <i class="fas fa-user-plus"></i> Invite Player
          </button>
        ` : ''}
      </div>

      <div class="member-game-tabs" style="display: flex; border-bottom: 1px solid rgba(255, 215, 0, 0.2); margin-bottom: 1.5rem;">
        <button class="member-game-tab ${this.memberGameFilter === 'all' ? 'active' : ''}" 
                onclick="clanManager.filterMembersByGame('all')"
                style="flex: 1; padding: 1rem; background: ${this.memberGameFilter === 'all' ? 'rgba(255,215,0,0.1)' : 'transparent'}; border: none; border-bottom: 3px solid ${this.memberGameFilter === 'all' ? '#ffd700' : 'transparent'}; color: ${this.memberGameFilter === 'all' ? '#ffd700' : 'rgba(255,255,255,0.7)'}; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">
          <i class="fas fa-users"></i> All Games (${this.clanMembers.length})
        </button>
        <button class="member-game-tab ${this.memberGameFilter === 'wc1' ? 'active' : ''}" 
                onclick="clanManager.filterMembersByGame('wc1')"
                style="flex: 1; padding: 1rem; background: ${this.memberGameFilter === 'wc1' ? 'rgba(255,215,0,0.1)' : 'transparent'}; border: none; border-bottom: 3px solid ${this.memberGameFilter === 'wc1' ? '#ffd700' : 'transparent'}; color: ${this.memberGameFilter === 'wc1' ? '#ffd700' : 'rgba(255,255,255,0.7)'}; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">
          <i class="fas fa-sword"></i> WC1 (${wc1Count})
        </button>
        <button class="member-game-tab ${this.memberGameFilter === 'wc2' ? 'active' : ''}" 
                onclick="clanManager.filterMembersByGame('wc2')"
                style="flex: 1; padding: 1rem; background: ${this.memberGameFilter === 'wc2' ? 'rgba(255,215,0,0.1)' : 'transparent'}; border: none; border-bottom: 3px solid ${this.memberGameFilter === 'wc2' ? '#ffd700' : 'transparent'}; color: ${this.memberGameFilter === 'wc2' ? '#ffd700' : 'rgba(255,255,255,0.7)'}; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">
          <i class="fas fa-shield-alt"></i> WC2 (${wc2Count})
        </button>
        <button class="member-game-tab ${this.memberGameFilter === 'wc3' ? 'active' : ''}" 
                onclick="clanManager.filterMembersByGame('wc3')"
                style="flex: 1; padding: 1rem; background: ${this.memberGameFilter === 'wc3' ? 'rgba(255,215,0,0.1)' : 'transparent'}; border: none; border-bottom: 3px solid ${this.memberGameFilter === 'wc3' ? '#ffd700' : 'transparent'}; color: ${this.memberGameFilter === 'wc3' ? '#ffd700' : 'rgba(255,255,255,0.7)'}; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">
          <i class="fas fa-crown"></i> WC3 (${wc3Count})
        </button>
      </div>
      
      <div class="members-list">
        ${filteredMembers.length > 0 
          ? filteredMembers.map(member => this.createMemberCard(member)).join('')
          : `<div style="text-align: center; padding: 2rem; color: #94a3b8;">
               <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
               <p>No members found with match history in ${this.memberGameFilter === 'all' ? 'any game' : this.formatGameType(this.memberGameFilter)}</p>
             </div>`
        }
      </div>
    `;

    // Add click event listeners to member cards for player modal
    this.setupMemberCardClickHandlers();
  }

  /**
   * Setup click handlers for member cards to open player modal
   */
  setupMemberCardClickHandlers() {
    const memberCards = document.querySelectorAll('.clickable-member-card');
    
    memberCards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons
        if (e.target.closest('.member-actions')) {
          return;}

        const playerId = card.dataset.playerId;
        const playerName = card.dataset.playerName;

        if (playerId && window.showPlayerDetails) {
          console.log('🎯 Opening player modal for:', playerName, 'ID:', playerId);
          window.showPlayerDetails(playerId);
        } else if (playerName && window.showPlayerDetails) {
          console.log('🎯 Opening player modal for player name:', playerName);
          window.showPlayerDetails(playerName);
        } else {
          console.warn('❌ Player modal not available or missing player data');
        }
      });

      // Add visual feedback for clickable cards
      card.style.cursor = 'pointer';
      card.style.transition = 'all 0.2s ease';
      
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.2)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '';
      });
    });
  }

  /**
   * Filter members by game type
   */
  filterMembersByGame(gameType) {
    this.memberGameFilter = gameType;
    this.renderClanMembers();
  }

  /**
   * Create member card HTML
   */
  createMemberCard(member) {
    const isLeader = this.isUserClanLeader();
    const isCurrentUser = member.userId === this.getCurrentUserId();
    
    // Get member name from player or user data
    const memberName = member.player?.name || member.user?.displayName || member.user?.username || 'Unknown';
    const memberMmr = member.player?.mmr || member.mmr || 1500;
    const gameType = member.player?.gameType || 'Unknown';
    const playerId = member.player?._id || member.playerId;

    // Get game icon and stats
    const gameIcon = this.getGameIcon(gameType);
    const gameDisplay = this.formatGameType(gameType);
    const totalMatches = member.player?.stats?.totalMatches || 0;
    const wins = member.player?.stats?.wins || 0;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return `
      <div class="member-card clickable-member-card" data-player-id="${playerId}" data-player-name="${memberName}">
        <div class="member-info">
          <div class="member-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="member-details">
            <h4 class="member-name">${memberName}</h4>
            <p class="member-role">${member.role}</p>
            <div class="member-stats">
              <div style="display: flex;align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                <span class="game-badge" style="display: inline-flex; align-items: center; gap: 0.25rem; background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">
                  ${gameIcon} ${gameDisplay}
                </span>
                <span style="color: #ffd700; font-weight: 600;">MMR: ${memberMmr}</span>
              </div>
              ${totalMatches > 0 ? `
                <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">
                  ${totalMatches} matches • ${wins}W-${totalMatches - wins}L • ${winRate}% WR
                </div>
              ` : `
                <div style="font-size: 0.85rem; color: rgba(255,255,255,0.5);">
                  No match history
                </div>
              `}
            </div>
          </div>
        </div>
        
        <div class="member-meta">
          <span class="member-joined">Joined ${this.formatRelativeTime(member.joinedAt)}</span>
          <span class="member-activity">Last seen ${this.formatRelativeTime(member.lastActive || member.joinedAt)}</span>
        </div>
        
        ${isLeader && !isCurrentUser ? `
          <div class="member-actions" onclick="event.stopPropagation();">
            <button class="btn btn-sm btn-secondary" onclick="clanManager.promoteMember('${member._id}')">
              Promote
            </button>
            <button class="btn btn-sm btn-danger" onclick="clanManager.removeMember('${member._id}')">
              Remove
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Get game icon for display
   */
  getGameIcon(gameType) {
    switch(gameType) {
      case 'warcraft1':
      case 'wc1':
      case 'war1':
        return '<i class="fas fa-sword"></i>';case 'warcraft2':
      case 'wc2':
      case 'war2':
        return '<i class="fas fa-shield-alt"></i>';case 'warcraft3':
      case 'wc3':
      case 'war3':
        return '<i class="fas fa-crown"></i>';default:
        return '<i class="fas fa-gamepad"></i>';}
  }

  /**
   * Show invite player modal (for clan leaders)
   */
  async showInvitePlayerModal() {
    if (!this.isUserClanLeader()) {
      this.showError('Only clan leaders can invite players.');
      return;}

    if (!this.currentClan) {
      this.showError('No clan data available.');
      return;}

    try {
      // Get user's players for inviting
      const players = await this.getUserPlayers();
      
      if (players.length === 0) {
        this.showError('You need to have at least one player to send invites. Please add a player in your profile first.');
        return;}

      const modal = this.createModal('invite-player-modal', 'Invite Player to Clan', `
        <form id="invite-player-form" class="form">
          <div class="form-group">
            <label for="invite-username">Player Username</label>
            <input type="text" id="invite-username" name="username" required
                   placeholder="Enter player's username..." maxlength="50">
            <div class="input-help">Enter the exact username of the player you want to invite</div>
          </div>
          
          <div class="form-group">
            <label for="invite-player">Your Player (Sender)</label>
            <select id="invite-player" name="playerId" required>
              ${players.map(player => `
                <option value="${player._id}">${player.name} (${this.formatGameType(player.gameType)})</option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="invite-message">Invitation Message</label>
            <textarea id="invite-message" name="message" rows="3"
                      placeholder="Welcome to ${this.currentClan.name}! We'd love to have you join our clan." maxlength="500">${'Welcome to ' + this.currentClan.name + '! We\'d love to have you join our clan.'}</textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Send Invitation
            </button>
          </div>
        </form>
      `);

      // Handle form submission
      const form = modal.querySelector('#invite-player-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleInvitePlayer(e);
      });

    } catch (error) {
      console.error('Failed to load invite modal:', error);
      this.showError('Failed to load invitation form.');
    }
  }

  /**
   * Handle invite player form submission
   */
  async handleInvitePlayer(event) {
    try {
      const formData = new FormData(event.target);
      
      const inviteData = {
        username: formData.get('username').trim(),
        playerId: formData.get('playerId'),
        message: formData.get('message').trim()
      };

      if (!inviteData.username) {
        this.showError('Please enter a username to invite.');
        return;}

      this.showLoading('Sending invitation...');
      
      await this.api.inviteToClan(this.currentClan._id, inviteData);
      
      this.showSuccess(`Invitation sent to ${inviteData.username}!`);
      
      // Close modal
      const modal = event.target.closest('.modal');
      if (modal) {
        modal.remove();
      }
      
    } catch (error) {
      console.error('Failed to send invitation:', error);
      this.showError(`Failed to send invitation: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render pending applications (for Applications tab)
   */
  async renderPendingApplications() {
    const container = document.getElementById('clan-applications-container');
    if (!container) return;const isLeader = this.isUserClanLeader();

    if (!isLeader) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #94a3b8;">
          <i class="fas fa-lock" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <p>Only clan leaders can view applications</p>
        </div>
      `;
      return;}

    try {
      // Load pending applications
      const response = await this.api.getClanApplications(this.currentClan._id);
      
      if (response && response.length > 0) {
        container.innerHTML = `
          <div class="applications-header">
            <h3>Pending Applications (${response.length})</h3>
          </div>
          
          <div class="applications-list">
            ${response.map(app => this.createApplicationCard(app)).join('')}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #94a3b8;">
            <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>No pending applications</p>
            <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
              Players can apply to join your clan if recruitment is set to "Application Required"
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <p>Failed to load applications</p>
        </div>
      `;
    }
  }

  /**
   * Create application card HTML
   */
  createApplicationCard(application) {
    const applicantName = application.player?.name || application.user?.displayName || application.user?.username || 'Unknown';
    const applicantMmr = application.player?.mmr || 1500;
    const gameType = application.player?.gameType || 'Unknown';
    const gameIcon = this.getGameIcon(gameType);
    const gameDisplay = this.formatGameType(gameType);

    return `
      <div class="application-card" style="border: 1px solid rgba(255,255,255,0.1);border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: rgba(0,0,0,0.2);">
        <div class="application-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
          <div class="applicant-info">
            <h4 style="color: #ffd700; margin: 0 0 0.5rem 0;">${applicantName}</h4>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.9rem;">
              <span class="game-badge" style="display: inline-flex; align-items: center; gap: 0.25rem; background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">
                ${gameIcon} ${gameDisplay}
              </span>
              <span>MMR: ${applicantMmr}</span>
            </div>
          </div>
          <div class="application-actions" style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-success" onclick="clanManager.reviewApplication('${application._id}', 'approve')"
                    style="background: #10b981; border-color: #10b981;">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-sm btn-danger" onclick="clanManager.reviewApplication('${application._id}', 'reject')"
                    style="background: #ef4444; border-color: #ef4444;">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </div>
        
        <div class="application-message" style="background: rgba(255,255,255,0.05); border-radius: 4px; padding: 1rem; margin-bottom: 1rem;">
          <strong style="color: #e2e8f0; display: block; margin-bottom: 0.5rem;">Application Message:</strong>
          <p style="margin: 0; color: #94a3b8; line-height: 1.5;">${application.message || 'No message provided'}</p>
        </div>
        
        <div class="application-meta" style="color: #6b7280; font-size: 0.8rem;">
          Applied ${this.formatRelativeTime(application.createdAt)}
        </div>
      </div>
    `;
  }

  /**
   * Review application (approve/reject)
   */
  async reviewApplication(applicationId, decision) {
    const actionText = decision === 'approve' ? 'approve' : 'reject';
    
    const confirmed = await this.ui.confirm(
      `${decision === 'approve' ? 'Approve' : 'Reject'} Application`,
      `Are you sure you want to ${actionText} this application?`
    );

    if (!confirmed) return;try {
      this.showLoading(`${decision === 'approve' ? 'Approving' : 'Rejecting'} application...`);
      
      await this.api.reviewClanApplication(this.currentClan._id, applicationId, {
        decision: decision,
        note: ''
      });
      
      this.showSuccess(`Application ${decision}d successfully!`);
      
      // Reload applications
      await this.renderPendingApplications();
      
      // If approved, reload clan members
      if (decision === 'approve') {
        await this.loadClanMembers();
        if (this.getCurrentTabName() === 'members') {
          this.renderClanMembers();
        }
      }
      
    } catch (error) {
      console.error(`Failed to ${actionText} application:`, error);
      this.showError(`Failed to ${actionText} application: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Get current active tab name
   */
  getCurrentTabName() {
    const activeTab = document.querySelector('.clan-tab.active');
    return activeTab ? activeTab.dataset.tab : 'overview';}

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    if (!date) return 'Unknown';const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;return then.toLocaleDateString();}

  /**
   * Load clan chat using unified chat system with voice chat integration
   */
  async loadClanChat() {
    const container = document.getElementById('clan-chat-container');
    if (!container) return;if (window.voiceChatManager && !window.voiceChatManager.isInitialized) {
      const socket = window.io ? window.io() : null;
      if (socket && this.user) {
        await window.voiceChatManager.initialize(socket, this.user);
      }
    }

    // Create the clan chat interface with voice chat integration
    container.innerHTML = `
      <div class="clan-chat-integration">
        <div class="chat-info">
          <h3>${this.currentClan.name} Garrison</h3>
          <p>Use the main Garrison system to communicate with your clan members. Click the button below to open ${this.currentClan.name} Garrison.</p>
        </div>
        <button class="btn btn-primary open-clan-chat-btn">
          <i class="fas fa-comments"></i> Open Clan Garrison
        </button>
        <div class="chat-tips">
          <h4>Communication Options:</h4>
          <ul>
            <li>Use the chat window in the bottom-right corner for text chat</li>
            <li>Switch to the "Clan" tab for clan-only messages</li>
            <li>Create voice rooms below for real-time voice communication</li>
            <li>Invite clan members to voice rooms for strategy discussions</li>
            <li>Press Ctrl+Shift+C to quickly open text chat</li>
          </ul>
        </div>
      </div>
    `;

    // Add voice chat UI
    if (window.voiceChatManager) {
      window.voiceChatManager.showVoiceChatUI();
    }

    // Setup the open chat button
    const openChatBtn = container.querySelector('.open-clan-chat-btn');
    if (openChatBtn) {
      openChatBtn.addEventListener('click', () => {
        // Open the unified chat system and switch to clan context
        if (window.chatManager) {
          window.chatManager.showFloatingWindow();
          window.chatManager.switchContext('clan');
        } else {
          console.warn('Chat system not available');
          this.showError('Chat system is not yet loaded. Please try again in a moment.');
        }
      });
    }
  }

  /**
   * Open clan garrison chat window
   */
  async openClanGarrison() {
    console.log('ClanManager: Opening clan garrison chat...');
    
    // Close the current modal first (non-blocking)
    try {
      if (typeof window.closeSectionModal === 'function') {
        window.closeSectionModal();
      }
    } catch (e) {
      console.warn('ClanManager: Failed to close section modal', e);
    }

    const tryOpen = async () => {
      if (window.chatManager && typeof window.chatManager.openClanChat === 'function') {
        const clanId = this.currentClan && this.currentClan._id ? this.currentClan._id : undefined;
        await window.chatManager.openClanChat(clanId);
        return true;}
      if (window.chatManager) {
        // Fallback for older chat manager implementations
        window.chatManager.showFloatingWindow?.();
        window.chatManager.switchContext?.('clan');
        return true;}
      return false;};

    // If chat manager already available
    if (await tryOpen()) return;try {
      if (typeof window.loadChatSystem === 'function') {
        console.log('ClanManager: Loading chat system on demand...');
        await window.loadChatSystem();
        if (await tryOpen()) return;}
    } catch (e) {
      console.error('ClanManager: Failed to load chat system', e);
    }

    // Last resort: redirect to clan context page
    console.log('ClanManager: Falling back to stone tablet clan context');
    window.location.href = '/views/stone-tablet.html?game=clan';
  }

  /**
   * Load clan stone tablet - redirects to main stone tablet page
   */
  async loadClanStoneTablet() {
    window.location.href = '/views/stone-tablet.html?game=clan';
  }



  /**
   * Render stone tablet posts
   */
  renderStoneTabletPosts(topics) {
    // Defensive: ensure topics is an array
    if (!Array.isArray(topics)) {
      if (topics && topics.error) {
        return `
          <div class="empty-stone-tablet error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Posts</h3>
            <p>${topics.error}</p>
          </div>
        `;}
      return `
        <div class="empty-stone-tablet">
          <i class="fas fa-scroll"></i>
          <h3>No Posts Yet</h3>
          <p>Be the first to share something on your clan's stone tablet!</p>
        </div>
      `;}
    if (topics.length === 0) {
      return `
        <div class="empty-stone-tablet">
          <i class="fas fa-scroll"></i>
          <h3>No Posts Yet</h3>
          <p>Be the first to share something on your clan's stone tablet!</p>
        </div>
      `;}
    return topics.map(topic => this.createStoneTabletPostCard(topic)).join('');}

  /**
   * Create a stone tablet post card
   */
  createStoneTabletPostCard(topic) {
    const author = topic.author || {};
    const reactions = topic.reactions || { like: 0, celebrate: 0 };
    const gameIcon = this.getGameIcon(topic.gameType || 'wc2');
    
    return `
      <div class="stone-tablet-post" data-topic-id="${topic._id}">
        <div class="post-header">
          <div class="post-author">
            <img src="${author.avatar || '/assets/img/default-avatar.svg'}" alt="${author.username}" class="author-avatar">
            <div class="author-info">
              <span class="author-name">${author.username}</span>
              <span class="post-date">${this.formatRelativeTime(topic.createdAt)}</span>
            </div>
          </div>
          <div class="post-game-type">
            ${gameIcon}
          </div>
        </div>
        
        <div class="post-content">
          <h3 class="post-title">${topic.title}</h3>
          <div class="post-text">${topic.content}</div>
        </div>
        
        <div class="post-actions">
          <button class="action-btn like-btn" data-topic-id="${topic._id}">
            <i class="fas fa-thumbs-up"></i>
            <span>${reactions.like || 0}</span>
          </button>
          <button class="action-btn celebrate-btn" data-topic-id="${topic._id}">
            <i class="fas fa-trophy"></i>
            <span>${reactions.celebrate || 0}</span>
          </button>
          <button class="action-btn reply-btn" data-topic-id="${topic._id}">
            <i class="fas fa-reply"></i>
            <span>Reply</span>
          </button>
        </div>
      </div>
    `;}

  /**
   * Setup stone tablet event listeners
   */
  setupStoneTabletEventListeners(container) {
    // Game tab switching
    const gameTabs = container.querySelectorAll('.game-tab');
    gameTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        gameTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.loadStoneTabletPosts(tab.dataset.game);
      });
    });

    // Publish post
    const publishBtn = container.querySelector('#publish-stone-tablet-post');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => this.publishStoneTabletPost());
    }

    // Post actions
    container.addEventListener('click', (e) => {
      if (e.target.closest('.like-btn')) {
        this.handleStoneTabletReaction(e.target.closest('.like-btn').dataset.topicId, 'like');
      } else if (e.target.closest('.celebrate-btn')) {
        this.handleStoneTabletReaction(e.target.closest('.celebrate-btn').dataset.topicId, 'celebrate');
      } else if (e.target.closest('.reply-btn')) {
        this.handleStoneTabletReply(e.target.closest('.reply-btn').dataset.topicId);
      }
    });
  }

  /**
   * Load stone tablet posts for specific game
   */
  async loadStoneTabletPosts(gameType) {
    try {
      const response = await this.api.get(`/api/forum/clan/${this.currentClan._id}/topics?gameType=${gameType}`);
      console.log('🏰 Stone tablet posts response:', response);

      if (response) {
        const topics = response.data || response;
        const postsContainer = document.getElementById('stone-tablet-posts');
        if (postsContainer) {
          postsContainer.innerHTML = this.renderStoneTabletPosts(topics);
        }
      }
    } catch (error) {
      console.error('Error loading stone tablet posts:', error);
    }
  }

  /**
   * Publish a new stone tablet post
   */
  async publishStoneTabletPost() {
    const titleInput = document.getElementById('stone-tablet-title');
    const contentInput = document.getElementById('stone-tablet-content');

    if (!titleInput || !contentInput) return;const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const gameType = this.currentClan.gameType || 'wc12'; // Use clan's game type

    if (!title || !content) {
      this.showError('Please provide both title and content for your post.');
      return;}

    try {
      const response = await this.api.post(`/api/forum/clan/${this.currentClan._id}/topic`, {
        title,
        content,
        gameType
      });

      console.log('🏰 Publish post response:', response);

      if (response && !response.error) {
        this.showSuccess('Post published successfully!');
        titleInput.value = '';
        contentInput.value = '';
        await this.loadStoneTabletPosts(gameType);
      } else {
        this.showError(response?.error || 'Failed to publish post');
      }
    } catch (error) {
      console.error('Error publishing stone tablet post:', error);
      this.showError('Failed to publish post. Please try again.');
    }
  }

  /**
   * Handle stone tablet post reactions
   */
  async handleStoneTabletReaction(topicId, reactionType) {
    try {
      const response = await this.api.post(`/api/forum/topic/${topicId}/${reactionType}`);
      if (response.ok) {
        // Update the UI to reflect the new reaction count
        const reactionBtn = document.querySelector(`[data-topic-id="${topicId}"] .${reactionType}-btn span`);
        if (reactionBtn) {
          const currentCount = parseInt(reactionBtn.textContent) || 0;
          reactionBtn.textContent = currentCount + 1;
        }
      }
    } catch (error) {
      console.error('Error handling stone tablet reaction:', error);
    }
  }

  /**
   * Handle stone tablet post reply
   */
  handleStoneTabletReply(topicId) {
    // For now, just show a notification
    this.showNotification('Reply functionality coming soon!', 'info');
  }



  /**
   * Get user avatar for composer
   */
  getUserAvatar() {
    const userData = this.getGlobalUserData();
    return userData?.avatar || '/assets/img/default-avatar.svg';}

  // === UTILITY METHODS ===

  /**
   * Check if user is clan leader
   */
  isUserClanLeader() {
    if (!this.currentClan) return false;const currentUserId = this.getCurrentUserId();
    
    // Handle different leader data structures
    const leaderId = this.currentClan.leader?._id || this.currentClan.leader?.id || this.currentClan.leader || this.currentClan.leaderId;
    
    console.log('🔍 Leadership check:', {
      currentUserId,
      leaderId,
      leaderObj: this.currentClan.leader,
      isLeader: leaderId === currentUserId
    });
    
    return leaderId === currentUserId;}

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    // Try to get from global user data
    const userData = this.getGlobalUserData();
    if (userData && (userData.id || userData._id)) {
      return userData.id || userData._id;}
    
    // Fallback to window.currentUser
    if (window.currentUser && (window.currentUser.id || window.currentUser._id)) {
      return window.currentUser.id || window.currentUser._id;}
    
    console.warn('Could not determine current user ID');
    return null;}

  /**
   * Calculate clan win rate
   */
  calculateClanWinRate() {
    if (!this.clanMembers || this.clanMembers.length === 0) return 0;let totalWins = 0;
    let totalMatches = 0;
    
    // Calculate combined wins and matches from all clan members
    this.clanMembers.forEach(member => {
      // Access stats from the Player model structure
      const memberWins = member.player?.stats?.wins || 0;
      const memberLosses = member.player?.stats?.losses || 0;
      const memberMatches = member.player?.stats?.totalMatches || (memberWins + memberLosses) || 0;
      
      totalWins += memberWins;
      totalMatches += memberMatches;
    });
    
    if (totalMatches === 0) return 0;return Math.round((totalWins / totalMatches) * 100);}

  /**
   * Calculate average MMR
   */
  calculateAverageMMR() {
    if (this.clanMembers.length === 0) return 0;const totalMMR = this.clanMembers.reduce((sum, member) => sum + (member.mmr || 1500), 0);
    return Math.round(totalMMR / this.clanMembers.length);}

  /**
   * Show edit clan modal (for clan leaders)
   */
  async showEditClanModal() {
    if (!this.isUserClanLeader()) {
      this.showError('Only clan leaders can edit clan settings.');
      return;}

    if (!this.currentClan) {
      this.showError('No clan data available.');
      return;}

    const modal = this.createModal('edit-clan-modal', 'Edit Clan Settings', `
      <form id="edit-clan-form" class="form">
        <div class="form-group">
          <label for="edit-clan-name">Clan Name</label>
          <input type="text" id="edit-clan-name" name="name" required
                 value="${this.currentClan.name || ''}" maxlength="50">
        </div>
        
        <div class="form-group">
          <label for="edit-clan-tag">Clan Tag</label>
          <input type="text" id="edit-clan-tag" name="tag" required readonly
                 value="${this.currentClan.tag || ''}" maxlength="6"
                 title="Clan tag cannot be changed after creation"
                 style="background: rgba(255,255,255,0.05); cursor: not-allowed;">
        </div>
        
        <div class="form-group">
          <label for="edit-clan-description">Description</label>
          <textarea id="edit-clan-description" name="description" rows="3"
                    placeholder="Describe your clan..." maxlength="1000">${this.currentClan.description || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label for="edit-clan-recruitment">Recruitment</label>
          <select id="edit-clan-recruitment" name="recruitmentType" required>
            <option value="open" ${this.currentClan.recruitmentType === 'open' ? 'selected' : ''}>Open - Anyone can join</option>
            <option value="application" ${this.currentClan.recruitmentType === 'application' ? 'selected' : ''}>Application Required</option>
            <option value="invite" ${this.currentClan.recruitmentType === 'invite' ? 'selected' : ''}>Invite Only</option>
          </select>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    `);

    // Handle form submission
    const form = modal.querySelector('#edit-clan-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleEditClan(e);
    });
  }

  /**
   * Handle edit clan form submission
   */
  async handleEditClan(event) {
    try {
      const formData = new FormData(event.target);
      
      const updateData = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim(),
        recruitmentType: formData.get('recruitmentType')
      };

      console.log('🏕️ Updating clan with data:', updateData);
      this.showLoading('Updating clan...');
      
      const updatedClan = await this.api.updateClan(this.currentClan._id, updateData);
      
      console.log('🏕️ Clan updated successfully:', updatedClan);
      
      this.showSuccess('Clan updated successfully!');
      
      // Close modal
      const modal = event.target.closest('.modal');
      if (modal) {
        modal.remove();
      }
      
      // Update current clan data
      this.currentClan = updatedClan;
      
      // Reload clan data
      await this.loadUserClan();
      this.renderClanUI();
      
    } catch (error) {
      console.error('Failed to update clan:', error);
      this.showError(`Failed to update clan: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Show leave clan confirmation
   */
  async showLeaveClanModal() {
    // Check if user is the clan leader
    if (this.isUserClanLeader()) {
      await this.showLeaderLeaveModal();
      return;}

    // Regular member leaving
    const confirmed = await this.ui.confirm(
      'Leave Clan',
      `Are you sure you want to leave "${this.currentClan.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;try {
      this.ui.showLoading('Leaving clan...');
      
      await this.api.leaveClan(this.currentClan._id);
      
      this.ui.showSuccess('Successfully left clan!');
      
      // Reset clan data
      this.currentClan = null;
      this.clanMembers = [];
      this.pendingApplications = [];
      
      this.renderClanUI();
      
      // Notify chat system of clan membership change
      if (window.chatManager && typeof window.chatManager.onClanMembershipChanged === 'function') {
        window.chatManager.onClanMembershipChanged();
        console.log('🔄 Notified chat system of clan leave');
      }
      
    } catch (error) {
      console.error('Failed to leave clan:', error);
      this.ui.showError(`Failed to leave clan: ${error.message}`);
      // Don't notify chat system if leaving failed
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Show leader leave modal with transfer/disband options
   */
  async showLeaderLeaveModal() {
    // Get other members (excluding current user)
    const otherMembers = this.clanMembers.filter(member => 
      member.user && member.user._id !== this.getCurrentUserId()
    );

    if (otherMembers.length === 0) {
      // Leader is the only member, show disband option
      await this.showDisbandClanModal();
      return;}

    // Show transfer leadership modal
    const modal = this.createModal('leader-leave-modal', 'Transfer Leadership', `
      <div class="leader-leave-content">
        <div class="warning-notice" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
          <i class="fas fa-crown" style="color: #ffc107; margin-right: 8px;"></i>
          <strong>As clan leader, you must transfer leadership before leaving.</strong>
        </div>
        
        <p style="margin-bottom: 1.5rem; color: #e2e8f0;">
          Choose a member to become the new leader of <strong>"${this.currentClan.name}"</strong>:
        </p>
        
        <div class="member-selection" style="margin-bottom: 1.5rem;">
          ${otherMembers.map(member => {
            const memberName = member.player?.name || member.user?.displayName || member.user?.username || 'Unknown';
            const memberMmr = member.player?.mmr || member.mmr || 1500;
            return `
              <div class="member-option" style="border: 1px solid rgba(255,255,255,0.1);border-radius: 8px; padding: 1rem; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.3s ease;" 
                   data-member-id="${member.user._id}" onclick="this.classList.toggle('selected'); document.querySelectorAll('.member-option').forEach(el => { if(el !== this) el.classList.remove('selected'); });">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <strong style="color: #ffd700;">${memberName}</strong>
                    <div style="color: #94a3b8; font-size: 0.9rem;">
                      ${member.role} • MMR: ${memberMmr}
                    </div>
                  </div>
                  <i class="fas fa-crown" style="color: #ffd700; opacity: 0; transition: opacity 0.3s ease;"></i>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" onclick="clanManager.handleTransferLeadership()" disabled id="transfer-btn">
            Transfer Leadership & Leave
          </button>
        </div>
      </div>
      
      <style>
        .member-option:hover {
          background: rgba(255,215,0,0.05) !important;
          border-color: rgba(255,215,0,0.3) !important;
        }
        .member-option.selected {
          background: rgba(255,215,0,0.1) !important;
          border-color: rgba(255,215,0,0.5) !important;
        }
        .member-option.selected .fa-crown {
          opacity: 1 !important;
        }
      </style>
    `);

    // Enable transfer button when a member is selected
    modal.addEventListener('click', (e) => {
      if (e.target.closest('.member-option')) {
        const transferBtn = modal.querySelector('#transfer-btn');
        transferBtn.disabled = false;
      }
    });
  }

  /**
   * Handle leadership transfer
   */
  async handleTransferLeadership() {
    const selectedMember = document.querySelector('.member-option.selected');
    if (!selectedMember) {
      this.ui.showError('Please select a member to transfer leadership to.');
      return;}

    const newLeaderId = selectedMember.dataset.memberId;
    const memberName = selectedMember.querySelector('strong').textContent;

    const confirmed = await this.ui.confirm(
      'Transfer Leadership',
      `Are you sure you want to transfer leadership to ${memberName} and leave the clan?`
    );

    if (!confirmed) return;try {
      this.ui.showLoading('Transferring leadership...');
      
      // Transfer leadership
      await this.api.transferClanLeadership(this.currentClan._id, {
        newLeaderId: newLeaderId
      });
      
      // Now leave the clan
      await this.api.leaveClan(this.currentClan._id);
      
      this.ui.showSuccess(`Leadership transferred to ${memberName}. You have left the clan.`);
      
      // Close modal
      document.querySelector('.modal').remove();
      
      // Reset clan data
      this.currentClan = null;
      this.clanMembers = [];
      this.pendingApplications = [];
      
      this.renderClanUI();
      
      // Notify chat system of clan membership change
      if (window.chatManager && typeof window.chatManager.onClanMembershipChanged === 'function') {
        window.chatManager.onClanMembershipChanged();
        console.log('🔄 Notified chat system of clan leave');
      }
      
    } catch (error) {
      console.error('Failed to transfer leadership:', error);
      this.ui.showError(`Failed to transfer leadership: ${error.message}`);
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Show disband clan modal (for solo leaders)
   */
  async showDisbandClanModal() {
    const confirmed = await this.ui.confirm(
      'Disband Clan',
      `You are the only member of "${this.currentClan.name}". Leaving will permanently disband the clan. This action cannot be undone. Are you sure?`,
      {
        confirmText: 'Disband Clan',
        cancelText: 'Cancel'
      }
    );

    if (!confirmed) return;try {
      this.ui.showLoading('Disbanding clan...');
      
      await this.api.deleteClan(this.currentClan._id);
      
      this.ui.showSuccess('Clan disbanded successfully.');
      
      // Reset clan data
      this.currentClan = null;
      this.clanMembers = [];
      this.pendingApplications = [];
      
      this.renderClanUI();
      
      // Notify chat system of clan membership change
      if (window.chatManager && typeof window.chatManager.onClanMembershipChanged === 'function') {
        window.chatManager.onClanMembershipChanged();
        console.log('🔄 Notified chat system of clan disband');
      }
      
    } catch (error) {
      console.error('Failed to disband clan:', error);
      this.ui.showError(`Failed to disband clan: ${error.message}`);
    } finally {
      this.ui.hideLoading();
    }
  }

  // === ADDITIONAL UTILITY METHODS ===

  /**
   * Create a modal
   */
  createModal(id, title, content) {
    // Remove existing modal if any
    const existingModal = document.getElementById(id);
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;}

  /**
   * Show loading message
   */
  showLoading(message = 'Loading...') {
    const container = document.getElementById('clan-container');
    if (container) {
      container.innerHTML = `<div class="loading">${message}</div>`;
    }
  }

  /**
   * Hide loading
   */
  hideLoading() {
    // Loading will be replaced by content
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span style="margin-left: 8px;">${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Show browse clans modal
   */
  showBrowseClansModal() {
    this.loadClans().then(() => {
      const modal = this.createModal('browse-clans-modal', 'Browse Clans', `
        <div class="clan-search-section">
          <div class="search-bar">
            <input type="text" id="clan-search" placeholder="Search clans..." class="form-control">
            <button id="clan-search-btn" class="btn btn-primary">
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
        <div id="clans-grid-container"></div>
      `);

      this.setupClanSearch();
      this.renderClansGrid();
    });
  }

  /**
   * Setup listener for when user data becomes available
   */
  setupUserDataListener() {
    // Check if user data is already available
    if (window.currentUser) {
      this.onUserDataAvailable();
      return;}



    // Set up a periodic check for user data
    let checkCount = 0;
    const maxChecks = 20; // Max 10 seconds (500ms * 20)
    
    const checkUserData = () => {
      checkCount++;
      
      if (window.currentUser || checkCount >= maxChecks) {
        clearInterval(userDataInterval);
        if (window.currentUser) {
          console.log('🔄 User data now available, refreshing clan system');
          this.onUserDataAvailable();
        }
      }
    };
    
    const userDataInterval = setInterval(checkUserData, 500);
  }

  /**
   * Called when user data becomes available
   */
  async onUserDataAvailable() {
    try {
      // Re-load clan data now that user data is available
      await this.loadUserClan();
      
      // Re-render the clan UI with proper user context
      this.renderClanUI();
      
      console.log('✅ Clan system refreshed with user data');
    } catch (error) {
      console.error('Error refreshing clan system with user data:', error);
    }
  }

  /**
   * Refresh clan system (called externally when user data loads)
   */
  async refreshWithUserData() {
    if (!window.currentUser) {
      console.warn('Cannot refresh clan system - no user data available');
      return;}
    
    console.log('🔄 Refreshing clan system with user data');
    await this.onUserDataAvailable();
  }
} 