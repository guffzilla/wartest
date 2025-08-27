import logger from '/js/utils/logger.js';
import { apiClient } from './ApiClient.js';

export class ArenaTournamentManager {
  constructor() {
    logger.info('🏆 ArenaTournamentManager constructor called');
    this.tournaments = [];
    this.currentUser = null;
    this.userReadyPromise = null;
    this.currentManagedTournament = null; // Store current tournament being managed
    this.boundShowRanksModal = null; // Store bound function reference
    this.boundShowCreateTournamentModal = null;
    this.boundHandleCreateTournament = null;
    this.boundCancelTournament = null;
    this.boundParticipantsSliderHandler = null;
    this.boundUpdatePreview = null;
    this.isSubmitting = false; // Prevent duplicate submissions
    this.currentGameType = 'war2'; // Default game type, will be updated based on selected tab
    this.tournamentsLoaded = false; // Track if tournaments have been loaded
    this.tournamentsLoading = false; // Track if tournaments are currently loading
    this.init();
  }

  static getInstance() {
    if (!window.arenaTournamentManager) {
      window.arenaTournamentManager = new ArenaTournamentManager();
    }
    return window.arenaTournamentManager;}

  async init() {
    logger.info('🏆 Initializing ArenaTournamentManager...');
    
    try {
      // Small delay to ensure AuthManager has time to initialize
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Load current user and keep promise for later awaits
      this.userReadyPromise = this.loadCurrentUser();
      await this.userReadyPromise;
      
      // Small delay to ensure DOM is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Setup event listeners
      this.setupEventListeners();
      
      // PHASE 2 OPTIMIZATION: Don't load tournaments immediately
      // Only load when tournaments tab is actually clicked
      logger.info('🏆 Tournaments will be loaded on-demand (lazy loading)');
      
      logger.info('✅ ArenaTournamentManager initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize ArenaTournamentManager:', error);
    }
  }

  // Update game type based on selected game tab
  updateGameType(gameType) {
    this.currentGameType = gameType;
    logger.info(`🎮 ArenaTournamentManager game type updated to: ${gameType}`);
    // Reload tournaments to filter by new game type, but ensure user is ready first
    Promise.resolve(this.userReadyPromise).catch(() => {}).finally(() => this.loadTournaments());
  }

  async loadCurrentUser() {
    try {
      logger.info('🔐 Attempting to load current user...');
      
      // First try to get user from AuthManager if available
      if (window.AuthManager && window.AuthManager.getInstance) {
        const authManager = window.AuthManager.getInstance();
        if (authManager && authManager.getUser()) {
          this.currentUser = authManager.getUser();
          logger.info('👤 Current user loaded from AuthManager:', this.currentUser ? this.currentUser.username : 'null');
          if (this.currentUser) {
                      logger.info('👤 User details from AuthManager:', {
            id: this.currentUser.id,
            _id: this.currentUser._id,
            username: this.currentUser.username,
            role: this.currentUser.role
          });
          
          // Ensure we have a valid user ID, try both id and _id fields
          if (!this.currentUser.id && this.currentUser._id) {
            this.currentUser.id = this.currentUser._id;
            logger.info('🔧 Fixed user ID from _id field (AuthManager):', this.currentUser.id);
          }
          }
          return;}
      }
      
      // Fallback to direct API call if AuthManager not available
      logger.info('🔐 AuthManager not available, making direct API call...');
      const response = await apiClient.getCurrentUser();
      logger.info('🔐 Response status:', response ? 'success' : 'failed');
      
      if (response) {
        this.currentUser = response;
        logger.info('👤 Current user loaded from API:', this.currentUser ? this.currentUser.username : 'null');
        logger.info('👤 Full API response:', JSON.stringify(this.currentUser, null, 2));
        if (this.currentUser) {
                  logger.info('👤 User details from API:', {
          id: this.currentUser.id,
          _id: this.currentUser._id,
          username: this.currentUser.username,
          role: this.currentUser.role
        });
        
        // Ensure we have a valid user ID, try both id and _id fields
        if (!this.currentUser.id && this.currentUser._id) {
          this.currentUser.id = this.currentUser._id;
          logger.info('🔧 Fixed user ID from _id field:', this.currentUser.id);
        }
        }
      } else {
        const errorText = await response.text();
        logger.error('Failed to load current user:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      logger.error('Error loading current user:', error);
    }
  }

  setupEventListeners() {
    logger.info('🎯 Setting up ArenaTournamentManager event listeners...');
    
    // Simple, direct event listener for view ranks button
    const viewRanksBtn = document.getElementById('view-ranks-btn');
    if (viewRanksBtn) {
      logger.info('✅ Found view-ranks-btn, adding event listener');
      // Remove any existing listeners first
      viewRanksBtn.removeEventListener('click', this.boundShowRanksModal);
      // Create a bound function to preserve context
      this.boundShowRanksModal = this.showRanksModal.bind(this);
      viewRanksBtn.addEventListener('click', this.boundShowRanksModal);
    } else {
      logger.warn('⚠️ view-ranks-btn not found');
    }

    // Create tournament button
    const createTournamentBtn = document.getElementById('create-tournament-btn');
    if (createTournamentBtn) {
      logger.info('✅ Found create-tournament-btn, adding event listener');
      // Remove any existing listeners first
      createTournamentBtn.removeEventListener('click', this.boundShowCreateTournamentModal);
      this.boundShowCreateTournamentModal = this.showCreateTournamentModal.bind(this);
      createTournamentBtn.addEventListener('click', this.boundShowCreateTournamentModal);
    } else {
      logger.warn('⚠️ create-tournament-btn not found');
    }

    // Create tournament form - with proper cleanup
    const createTournamentForm = document.getElementById('create-tournament-form');
    if (createTournamentForm) {
      logger.info('✅ Found create-tournament-form, adding event listener');
      // Remove any existing listeners first
      createTournamentForm.removeEventListener('submit', this.boundHandleCreateTournament);
      this.boundHandleCreateTournament = this.handleCreateTournament.bind(this);
      createTournamentForm.addEventListener('submit', this.boundHandleCreateTournament);
    } else {
      logger.warn('⚠️ create-tournament-form not found');
    }

    // Cancel tournament button
    const cancelTournamentBtn = document.getElementById('cancel-tournament');
    if (cancelTournamentBtn) {
      logger.info('✅ Found cancel-tournament, adding event listener');
      // Remove any existing listeners first
      cancelTournamentBtn.removeEventListener('click', this.boundCancelTournament);
      this.boundCancelTournament = this.closeModal.bind(this, document.getElementById('create-tournament-modal'));
      cancelTournamentBtn.addEventListener('click', this.boundCancelTournament);
    } else {
      logger.warn('⚠️ cancel-tournament not found');
    }

    // Tournament details modal close button
    const closeDetailsModalBtn = document.querySelector('#tournament-details-modal .tournament-modal-close');
    if (closeDetailsModalBtn) {
      closeDetailsModalBtn.addEventListener('click', () => {
        this.closeModal(document.getElementById('tournament-details-modal'));
      });
    }

    // Tournament details modal close button (in actions)
    const closeDetailsBtn = document.getElementById('close-tournament-details');
    if (closeDetailsBtn) {
      closeDetailsBtn.addEventListener('click', () => {
        this.closeModal(document.getElementById('tournament-details-modal'));
      });
    }

    // Tournament registration modal close button
    const closeRegistrationModalBtn = document.querySelector('#tournament-registration-modal .tournament-modal-close');
    if (closeRegistrationModalBtn) {
      closeRegistrationModalBtn.addEventListener('click', () => {
        this.closeModal(document.getElementById('tournament-registration-modal'));
      });
    }

    // Tournament registration modal cancel button
    const cancelRegistrationBtn = document.getElementById('cancel-registration');
    if (cancelRegistrationBtn) {
      cancelRegistrationBtn.addEventListener('click', () => {
        this.closeModal(document.getElementById('tournament-registration-modal'));
      });
    }

    // Tournament management modal close button
    const closeManagementModalBtn = document.querySelector('#tournament-management-modal .tournament-modal-close');
    if (closeManagementModalBtn) {
      closeManagementModalBtn.addEventListener('click', () => {
        this.closeModal(document.getElementById('tournament-management-modal'));
      });
    }

    // Close modals when clicking outside
    const modals = document.querySelectorAll('.tournament-modal-enhanced');
    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });

    // Setup form field listeners
    this.setupFormFieldListeners();
    
    // Setup game tab listeners
    this.setupGameTabListeners();

    // Enhanced modal close handling with specific targeting
    document.addEventListener('click', (e) => {
      // Close button clicks - specifically for ranks modal and tournament modal
      if (e.target.classList.contains('close-modal') || e.target.classList.contains('tournament-modal-close')) {
        e.preventDefault();
        e.stopPropagation();
        const modal = e.target.closest('.modal') || e.target.closest('.tournament-modal-enhanced');
        if (modal && (modal.id === 'ranks-modal' || modal.id === 'create-tournament-modal' || modal.id === 'tournament-management-modal' || modal.id === 'delete-confirmation-modal')) {
          this.closeModal(modal);
        }
      }
      
      // Background clicks (clicking outside modal content) - specifically for ranks modal and tournament modal
      if ((e.target.classList.contains('modal') || e.target.classList.contains('tournament-modal-enhanced')) && 
          (e.target.id === 'ranks-modal' || e.target.id === 'create-tournament-modal' || e.target.id === 'tournament-management-modal' || e.target.id === 'delete-confirmation-modal')) {
        this.closeModal(e.target);
      }
    });

    // ESC key to close modals - specifically for our modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const ranksModal = document.getElementById('ranks-modal');
        const createTournamentModal = document.getElementById('create-tournament-modal');
        const managementModal = document.getElementById('tournament-management-modal');
        const deleteModal = document.getElementById('delete-confirmation-modal');
        
        if (ranksModal && ranksModal.classList.contains('show')) {
          this.closeModal(ranksModal);
        } else if (createTournamentModal && createTournamentModal.classList.contains('show')) {
          this.closeModal(createTournamentModal);
        } else if (managementModal && managementModal.classList.contains('show')) {
          this.closeTournamentManagementModal();
        } else if (deleteModal && deleteModal.classList.contains('show')) {
          this.closeDeleteConfirmation();
        }
      }
    });

    // Listen for report match modal opening to populate tournament dropdown
    const reportMatchBtn = document.getElementById('report-match-btn');
    if (reportMatchBtn && !reportMatchBtn.dataset.tournamentsHandlerAttached) {
      reportMatchBtn.addEventListener('click', () => this.handleReportMatchClick());
      reportMatchBtn.dataset.tournamentsHandlerAttached = '1';
    }
  }

  setupFormFieldListeners() {
    // Remove existing listeners first
    const participantsSlider = document.getElementById('maxParticipants');
    if (participantsSlider) {
      participantsSlider.removeEventListener('input', this.boundParticipantsSliderHandler);
      this.boundParticipantsSliderHandler = this.updateTournamentPreview.bind(this);
      participantsSlider.addEventListener('input', this.boundParticipantsSliderHandler);
    }

    // Remove existing listeners for form fields
    const formFields = ['name', 'description', 'type'];
    formFields.forEach(fieldName => {
      const field = document.querySelector(`[name="${fieldName}"]`);
      if (field) {
        field.removeEventListener('input', this.boundUpdatePreview);
        this.boundUpdatePreview = this.updateTournamentPreview.bind(this);
        field.addEventListener('input', this.boundUpdatePreview);
      }
    });

    // Remove existing listeners for tournament type radios
    const tournamentTypeRadios = document.querySelectorAll('input[name="type"]');
    tournamentTypeRadios.forEach(radio => {
      radio.removeEventListener('change', this.boundUpdatePreview);
      radio.addEventListener('change', this.boundUpdatePreview);
    });
  }

  setupGameTabListeners() {
    // Listen for game tab changes from the global game tabs system
    window.addEventListener('gameTabChanged', (e) => {
      const gameType = e.detail.game;
      logger.info(`🎮 Game tab changed event received: ${gameType}`);
      this.updateGameType(gameType);
    });

    // Set initial game type based on active tab
    const activeTab = document.querySelector('.game-tab.active[data-game]');
    if (activeTab) {
      const gameType = activeTab.getAttribute('data-game');
      this.currentGameType = gameType;
      logger.info(`🎮 Initial game type set to: ${gameType}`);
    } else {
      // Fallback: try to get from GameTabsManager if available
      if (window.GameTabsManager && window.gameTabsManager) {
        this.currentGameType = window.gameTabsManager.getCurrentGame();
        logger.info(`🎮 Initial game type from GameTabsManager: ${this.currentGameType}`);
      }
    }
  }

  reSetupEventListeners() {
    logger.info('🔄 Re-setting up ArenaTournamentManager event listeners...');
    this.setupEventListeners();
  }

    async loadTournaments() {
    logger.info('🏆 Loading tournaments...');
    // Ensure user data is available for organizer checks
    if (!this.currentUser) {
      try { await Promise.resolve(this.userReadyPromise); } catch (_) {}
    }

    // PHASE 2 OPTIMIZATION: Check if already loaded or loading
    if (this.tournamentsLoaded) {
      logger.info('📋 Tournaments already loaded, using cached data');
      this.renderTournaments();
      return;}

    if (this.tournamentsLoading) {
      logger.info('⏳ Tournaments already loading, waiting...');
      return;}

    this.tournamentsLoading = true;

    // PHASE 2 OPTIMIZATION: Use ProgressiveLoadingService if available
    if (window.ProgressiveLoadingService) {
      try {
        logger.info('🏆 Using ProgressiveLoadingService for tournament loading');
        
        const tournaments = await window.ProgressiveLoadingService.loadWithPriority(
          this.currentGameType,
          'LOW',
          'tournaments'
        );
        
        if (tournaments) {
          this.tournaments = tournaments;
          this.tournamentsLoaded = true;
          this.renderTournaments();
          return;}
      } catch (error) {
        logger.warn('⚠️ ProgressiveLoadingService failed, falling back to direct API call:', error);
      }
    }
    
    try {
      // Fetch all tournaments and filter by current game type on frontend
      const response = await apiClient.getTournaments();
      if (response && response.tournaments) {
        this.tournaments = response.tournaments;
        logger.info(`📊 Loaded ${this.tournaments.length} tournaments`);
        if (this.tournaments.length > 0) {
          logger.info('📊 Tournament game types:', this.tournaments.map(t => ({ id: t._id, name: t.name, gameType: t.gameType })));
          logger.info('📊 Tournament organizers:', this.tournaments.map(t => ({ 
            id: t._id, 
            name: t.name, 
            organizerId: t.organizer?.userId,
            organizerUsername: t.organizer?.username
          })));
        }
        logger.info(`🎮 Current game type: ${this.currentGameType}`);
        
        // Mark as loaded
        this.tournamentsLoaded = true;
        
        this.renderTournaments();
      } else {
        logger.error('Failed to load tournaments: No response data');
        this.tournaments = [];
        this.renderTournaments();
      }
    } catch (error) {
      logger.error('Error loading tournaments:', error);
      this.tournaments = [];
      this.renderTournaments();
    } finally {
      this.tournamentsLoading = false;
    }
  }

  /**
   * PHASE 2 OPTIMIZATION: Load tournaments on-demand when tournaments section is viewed
   */
  async ensureTournamentsLoaded() {
    if (!this.tournamentsLoaded && !this.tournamentsLoading) {
      logger.info('🏆 Tournaments not loaded, loading on-demand...');
      await this.loadTournaments();
    } else if (this.tournamentsLoaded) {
      logger.info('📋 Tournaments already loaded, rendering...');
      this.renderTournaments();
    }
  }

  renderTournaments() {
    const container = document.getElementById('tournaments-container');
    if (!container) {
      logger.error('❌ tournaments-container not found!');
      return;}
    
    // PHASE 2 OPTIMIZATION: Show loading state if tournaments not loaded yet
    if (!this.tournamentsLoaded) {
      container.innerHTML = `
        <div class="tournament-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Tournaments will load when you first view this section</p>
          <button class="btn btn-primary btn-sm" onclick="window.arenaTournamentManager.ensureTournamentsLoaded()">
            Load Tournaments Now
          </button>
        </div>
      `;
      return;}
    
    logger.info('✅ Found tournaments-container, rendering tournaments...');

    // Ensure tournaments is always an array
    if (!Array.isArray(this.tournaments)) {
      logger.warn('⚠️ this.tournaments is not an array, setting to empty array');
      this.tournaments = [];
    }

    // Filter tournaments by current game type
    // Handle tournaments without gameType (created before the field was added)
    const filteredTournaments = this.tournaments.filter(tournament => {
      // If tournament has no gameType, show it in war2 (default)
      if (!tournament.gameType) {
        const shouldShow = this.currentGameType === 'war2';
        logger.info(`🎮 Tournament ${tournament.name} (no gameType): showing in war2 = ${shouldShow}`);
        return shouldShow;}
      const shouldShow = tournament.gameType === this.currentGameType;
      logger.info(`🎮 Tournament ${tournament.name} (gameType: ${tournament.gameType}): showing in ${this.currentGameType} = ${shouldShow}`);
      return shouldShow;});
    
    logger.info(`📊 Filtered tournaments: ${filteredTournaments.length} for game type ${this.currentGameType}`);

    // Categorize tournaments
    const now = new Date();
    const upcoming = filteredTournaments.filter(t => 
      t.status === 'draft' || t.status === 'registration'
    );
    const active = filteredTournaments.filter(t => 
      t.status === 'in_progress'
    );
    const past = filteredTournaments.filter(t => 
      t.status === 'completed' || t.status === 'cancelled'
    );

    logger.info(`📊 Tournament categories: upcoming=${upcoming.length}, active=${active.length}, past=${past.length}`);

    let html = '';

    // Active tournaments
    if (active.length > 0) {
      html += `
        <div class="tournament-section">
          <h3><i class="fas fa-play-circle"></i> Active Tournaments</h3>
          <div class="tournament-grid">
            ${active.map(tournament => this.createTournamentCard(tournament, 'active')).join('')}
          </div>
        </div>
      `;
    }

    // Upcoming tournaments
    if (upcoming.length > 0) {
      html += `
        <div class="tournament-section">
          <h3><i class="fas fa-clock"></i> Upcoming Tournaments</h3>
          <div class="tournament-grid">
            ${upcoming.map(tournament => this.createTournamentCard(tournament, 'upcoming')).join('')}
          </div>
        </div>
      `;
    }

    // Past tournaments
    if (past.length > 0) {
      html += `
        <div class="tournament-section">
          <h3><i class="fas fa-history"></i> Past Tournaments</h3>
          <div class="tournament-grid">
            ${past.map(tournament => this.createTournamentCard(tournament, 'past')).join('')}
          </div>
        </div>
      `;
    }

    // No tournaments message
    if (filteredTournaments.length === 0) {
      html += `
        <div class="tournament-section">
          <div class="no-tournaments">
            <i class="fas fa-trophy"></i>
            <h3>No tournaments found</h3>
            <p>No tournaments are currently available for ${this.getGameDisplayName(this.currentGameType)}.</p>
            <button class="btn-create-tournament" onclick="window.arenaTournamentManager.showCreateTournamentModal()">
              <i class="fas fa-plus"></i> Create Tournament
            </button>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  createTournamentCard(tournament, category) {
    const statusClass = this.getStatusClass(tournament.status);
    const statusText = this.formatStatus(tournament.status);
    const canRegister = this.canRegister(tournament);
    const isOrganizer = this.isOrganizer(tournament);
    const isParticipant = this.isParticipant(tournament);

    logger.info(`🏆 Creating card for tournament: ${tournament.name}`, {
      category,
      canRegister,
      isOrganizer,
      isParticipant,
      currentUser: this.currentUser ? this.currentUser.username : 'null'
    });

    return `
      <div class="tournament-card tournament-card-${category}">
        <div class="tournament-card-header">
          <h4 class="tournament-name">${tournament.name}</h4>
          <span class="tournament-status ${statusClass}">${statusText}</span>
        </div>
        <div class="tournament-meta">
          <span><i class="fas fa-gamepad"></i> ${this.getGameDisplayName(tournament.gameType)}</span>
          <span><i class="fas fa-users"></i> ${tournament.participants?.length || 0}/${tournament.maxParticipants || '∞'}</span>
          <span><i class="fas fa-calendar"></i> ${new Date(tournament.startDate).toLocaleDateString()}</span>
        </div>
        ${tournament.description ? `<div class="tournament-description">${tournament.description}</div>` : ''}
        <div class="tournament-actions">
          ${this.renderTournamentActions(tournament, category, canRegister, isOrganizer, isParticipant)}
        </div>
      </div>
    `;}

  renderTournamentActions(tournament, category, canRegister, isOrganizer, isParticipant) {
    let actions = '';

    logger.info(`🏆 Rendering actions for tournament: ${tournament.name}`, {
      category,
      canRegister,
      isOrganizer,
      isParticipant
    });

    // View details button (always available)
    actions += `
      <button class="btn-view-tournament" onclick="window.arenaTournamentManager.viewTournament('${tournament._id}')">
        <i class="fas fa-eye"></i> View Details
      </button>
    `;

    // Category-specific actions
    if (category === 'upcoming') {
      if (canRegister && !isParticipant) {
        actions += `
          <button class="btn-register" onclick="window.arenaTournamentManager.registerForTournament('${tournament._id}')">
            <i class="fas fa-sign-in-alt"></i> Register
          </button>
        `;
      } else if (isParticipant) {
        actions += `
          <button class="btn-registered" disabled>
            <i class="fas fa-check"></i> Registered
          </button>
        `;
      }
      
      if (isOrganizer) {
        logger.info(`🏆 Adding manage button for tournament: ${tournament.name}`);
        actions += `
          <button class="btn-manage" onclick="window.arenaTournamentManager.manageTournament('${tournament._id}')">
            <i class="fas fa-cog"></i> Manage
          </button>
        `;
      } else {
        logger.info(`🏆 NOT adding manage button for tournament: ${tournament.name} (isOrganizer: ${isOrganizer})`);
      }
    } else if (category === 'active') {
      if (isParticipant) {
        actions += `
          <button class="btn-compete" onclick="window.arenaTournamentManager.viewBrackets('${tournament._id}')">
            <i class="fas fa-trophy"></i> View Brackets
          </button>
        `;
      }
      
      if (isOrganizer) {
        logger.info(`🏆 Adding manage button for active tournament: ${tournament.name}`);
        actions += `
          <button class="btn-manage" onclick="window.arenaTournamentManager.manageTournament('${tournament._id}')">
            <i class="fas fa-cog"></i> Manage
          </button>
        `;
      } else {
        logger.info(`🏆 NOT adding manage button for active tournament: ${tournament.name} (isOrganizer: ${isOrganizer})`);
      }
    } else if (category === 'past') {
      actions += `
        <button class="btn-results" onclick="window.arenaTournamentManager.viewResults('${tournament._id}')">
          <i class="fas fa-medal"></i> View Results
        </button>
      `;
    }

    return actions;}

  getStatusClass(status) {
    const statusClasses = {
      'draft': 'status-draft',
      'registration': 'status-registration',
      'in_progress': 'status-active',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-unknown';}

  formatStatus(status) {
    const statusTexts = {
      'draft': 'Draft',
      'registration': 'Registration Open',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusTexts[status] || status;}

  isOrganizer(tournament) {
    const userId = this.currentUser?.id || this.currentUser?._id || null;
    const isOrg = !!userId && tournament.organizer?.userId === userId;
    logger.info('🏆 isOrganizer check:', {
      tournamentName: tournament.name,
      tournamentOrganizerId: tournament.organizer?.userId,
      currentUserId: userId,
      isOrganizer: isOrg
    });
    return isOrg;}

  isParticipant(tournament) {
    return this.currentUser && tournament.participants?.some(p => p.userId === this.currentUser.id);}

  canRegister(tournament) {
    return tournament.status === 'registration' && 
           tournament.participants?.length < tournament.maxParticipants &&
           !this.isParticipant(tournament);}

  async registerForTournament(tournamentId) {
    try {
      logger.info(`🏆 Registering for tournament: ${tournamentId}`);
      
      const response = await apiClient.joinTournament(tournamentId);

      if (response) {
        this.showSuccess('Successfully registered for tournament!');
        // Reload tournaments to update the display
        await this.loadTournaments();
      }
    } catch (error) {
      logger.error('Error registering for tournament:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('NO_PLAYER_FOR_GAME_TYPE')) {
        // User doesn't have a player for this game type
        const gameTypeMatch = error.message.match(/game type: (\w+)/);
        const gameType = gameTypeMatch ? gameTypeMatch[1] : 'war2';
        const gameTypeName = this.getGameDisplayName(gameType);
        this.showError(`You need a ${gameTypeName} player to register for this tournament. Redirecting to barracks...`);
        
        // Redirect to home page and open barracks modal after a short delay
        setTimeout(() => {
          this.redirectToHomeWithBarracksModal(gameType);
        }, 2000);
      } else if (error.message && error.message.includes('PLAYER_ALREADY_REGISTERED')) {
        this.showError('You already have a player registered in this tournament');
      } else {
        this.showError('Failed to register for tournament');
      }
    }

  redirectToHomeWithBarracksModal(gameType) {
    try {
      logger.info(`🏠 Redirecting to home page with barracks modal for game type: ${gameType}`);
      
      // Store the game type to filter barracks to when modal opens
      localStorage.setItem('openBarracksForGameType', gameType);
      
      // Redirect to home page
      window.location.href = '/views/townhall.html';
      
    } catch (error) {
      logger.error('Error redirecting to home with barracks modal:', error);
      // Fallback: just redirect to home page
      window.location.href = '/views/townhall.html';
    }
  }

  async viewTournament(tournamentId) {
    try {
      const tournament = await apiClient.getTournament(tournamentId);
      if (tournament) {
        this.showTournamentDetails(tournament);
      } else {
        this.showError('Failed to load tournament details');
      }
    } catch (error) {
      logger.error('Error viewing tournament:', error);
      this.showError('Failed to load tournament details');
    }
  }

  showTournamentDetails(tournament) {
    const modal = document.getElementById('tournament-details-modal');
    const title = document.getElementById('tournament-modal-title');
    const subtitle = document.getElementById('tournament-modal-subtitle');
    const content = document.getElementById('tournament-details-content');
    const actions = document.getElementById('tournament-details-actions');

    if (!modal || !title || !content || !actions) return;
    title.innerHTML = `<i class="fas fa-trophy"></i> ${tournament.name}`;
    subtitle.textContent = `Tournament information and participants`;

    content.innerHTML = `
      <div class="tournament-details-info">
        <div class="tournament-description">
          <h4><i class="fas fa-info-circle"></i> Description</h4>
          <p>${tournament.description || 'No description available'}</p>
        </div>
        
        <div class="tournament-info-grid">
          <div class="info-item">
            <label>Status</label>
            <span class="tournament-status ${tournament.status}">${this.formatStatus(tournament.status)}</span>
          </div>
          <div class="info-item">
            <label>Game Type</label>
            <span>${this.getGameDisplayName(tournament.gameType)}</span>
          </div>
          <div class="info-item">
            <label>Format</label>
            <span>${tournament.type?.replace('_', ' ').toUpperCase() || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <label>Participants</label>
            <span>${tournament.participants?.length || 0}/${tournament.maxParticipants || '∞'}</span>
          </div>
          <div class="info-item">
            <label>Start Date</label>
            <span>${new Date(tournament.startDate).toLocaleString()}</span>
          </div>
          <div class="info-item">
            <label>End Date</label>
            <span>${new Date(tournament.endDate).toLocaleString()}</span>
          </div>
          <div class="info-item">
            <label>Organizer</label>
            <span>${tournament.organizer?.username || 'Unknown'}</span>
          </div>
        </div>

        ${tournament.participants && tournament.participants.length > 0 ? `
          <div class="tournament-participants">
            <h4><i class="fas fa-users"></i> Participants (${tournament.participants.length})</h4>
            <div class="participants-list">
              ${tournament.participants.map(p => `
                <div class="participant-item">
                  <span class="participant-name">${p.playerName || p.username}</span>
                  ${p.seed ? `<span class="participant-rank">Seed ${p.seed}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="tournament-participants">
            <h4><i class="fas fa-users"></i> Participants</h4>
            <p style="color: var(--neutral-300); text-align: center; padding: 2rem;">No participants yet</p>
          </div>
        `}
      </div>
    `;

    // Setup action buttons
    this.setupTournamentDetailsActions(tournament, actions);

    modal.classList.add('show');
    document.body.classList.add('modal-open');
  }

  setupTournamentDetailsActions(tournament, actionsContainer) {
    // Clear existing actions except close button
    const closeBtn = actionsContainer.querySelector('#close-tournament-details');
    actionsContainer.innerHTML = '';
    if (closeBtn) {
      actionsContainer.appendChild(closeBtn);
    }

    const isOrganizer = this.isOrganizer(tournament);
    const isParticipant = this.isParticipant(tournament);
    const canRegister = this.canRegister(tournament);

    // Add action buttons based on user's relationship to tournament
    if (isOrganizer) {
      const manageBtn = document.createElement('button');
      manageBtn.className = 'tournament-btn tournament-btn-primary';
      manageBtn.innerHTML = '<i class="fas fa-cog"></i> Manage Tournament';
      manageBtn.onclick = () => {
        this.closeModal(document.getElementById('tournament-details-modal'));
        this.manageTournament(tournament._id);
      };
      actionsContainer.appendChild(manageBtn);
    }

    if (tournament.status === 'registration') {
      if (canRegister && !isParticipant) {
        const registerBtn = document.createElement('button');
        registerBtn.className = 'tournament-btn tournament-btn-primary';
        registerBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Register';
        registerBtn.onclick = () => {
          this.closeModal(document.getElementById('tournament-details-modal'));
          this.showRegistrationModal(tournament);
        };
        actionsContainer.appendChild(registerBtn);
      } else if (isParticipant) {
        const unregisterBtn = document.createElement('button');
        unregisterBtn.className = 'tournament-btn tournament-btn-danger';
        unregisterBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Unregister';
        unregisterBtn.onclick = () => {
          this.unregisterFromTournament(tournament._id);
        };
        actionsContainer.appendChild(unregisterBtn);
      }
    }
  }

  async showRegistrationModal(tournament) {
    const modal = document.getElementById('tournament-registration-modal');
    const tournamentName = document.getElementById('registration-tournament-name');
    const content = document.getElementById('tournament-registration-content');
    const confirmBtn = document.getElementById('confirm-registration');

    if (!modal || !tournamentName || !content || !confirmBtn) return;tournamentName.textContent = `Select your player to register for "${tournament.name}"`;

    try {
      // Fetch user's players for this game type
      const response = await fetch(`/api/players?gameType=${tournament.gameType}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch players');
      }

      const players = await response.json();

      if (players.length === 0) {
        content.innerHTML = `
          <div class="no-players-message">
            <i class="fas fa-user-plus"></i>
            <h4>No Players Available</h4>
            <p>You don't have any ${this.getGameDisplayName(tournament.gameType)} players in your barracks.</p>
            <a href="/views/townhall.html" class="create-player-btn">
              <i class="fas fa-plus"></i> Create Player
            </a>
          </div>
        `;
        confirmBtn.disabled = true;
      } else {
        content.innerHTML = `
          <div class="player-selection-grid">
            ${players.map(player => `
              <div class="player-option" data-player-id="${player._id}" data-player-name="${player.name}">
                <div class="selection-indicator"></div>
                <div class="player-option-header">
                  <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                  <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-details">${this.getGameDisplayName(player.gameType)} • ${player.preferredRace || 'Random'}</div>
                  </div>
                </div>
                <div class="player-stats">
                  <div class="player-stat">
                    <div class="player-stat-value">${player.mmr || 1500}</div>
                    <div class="player-stat-label">MMR</div>
                  </div>
                  <div class="player-stat">
                    <div class="player-stat-value">${player.rank?.name || 'Unranked'}</div>
                    <div class="player-stat-label">Rank</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;

        // Setup player selection
        this.setupPlayerSelection(tournament);
      }

      modal.classList.add('show');
      document.body.classList.add('modal-open');

    } catch (error) {
      logger.error('Error loading players:', error);
      content.innerHTML = `
        <div class="no-players-message">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Error Loading Players</h4>
          <p>Failed to load your players. Please try again.</p>
        </div>
      `;
      confirmBtn.disabled = true;
    }
  }

  setupPlayerSelection(tournament) {
    const playerOptions = document.querySelectorAll('.player-option');
    const confirmBtn = document.getElementById('confirm-registration');
    let selectedPlayer = null;

    playerOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Remove selection from other options
        playerOptions.forEach(opt => opt.classList.remove('selected'));
        
        // Select this option
        option.classList.add('selected');
        selectedPlayer = {
          id: option.dataset.playerId,
          name: option.dataset.playerName
        };
        
        // Enable confirm button
        confirmBtn.disabled = false;
      });
    });

    // Setup confirm registration
    confirmBtn.onclick = async () => {
      if (!selectedPlayer) return;try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

        const response = await fetch(`/api/tournaments/${tournament._id}/register`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            playerId: selectedPlayer.id,
            playerName: selectedPlayer.name
          })
        });

        if (response.ok) {
          this.showSuccess('Successfully registered for tournament!');
          this.closeModal(document.getElementById('tournament-registration-modal'));
          await this.loadTournaments();
        } else {
          const errorData = await response.json();
          
          if (errorData.error === 'NO_PLAYER_FOR_GAME_TYPE') {
            this.showError(`You need a ${this.getGameDisplayName(errorData.gameType)} player to register for this tournament. Redirecting to barracks...`);
            setTimeout(() => {
              this.redirectToHomeWithBarracksModal(errorData.gameType);
            }, 2000);
          } else if (errorData.error === 'PLAYER_ALREADY_REGISTERED') {
            this.showError(errorData.message || 'You already have a player registered in this tournament');
          } else {
            this.showError(errorData.error || 'Failed to register for tournament');
          }
        }
      } catch (error) {
        logger.error('Error registering for tournament:', error);
        this.showError('Failed to register for tournament');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> Register';
      }
    };
  }

  async unregisterFromTournament(tournamentId) {
    // Use ModalManager for a better confirmation dialog
    let confirmed = false;
    
    if (window.modalManager) {
      confirmed = await window.modalManager.confirm(
        'Unregister from Tournament',
        'Are you sure you want to unregister from this tournament? You will lose your spot and need to re-register if you change your mind.'
      );
    } else {
      // Fallback to basic confirm if ModalManager is not available
      confirmed = confirm('Are you sure you want to unregister from this tournament?');
    }

    if (!confirmed) {
      return;}

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/unregister`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.showSuccess('Successfully unregistered from tournament!');
        this.closeModal(document.getElementById('tournament-details-modal'));
        await this.loadTournaments();
      } else {
        const errorData = await response.json();
        this.showError(errorData.error || 'Failed to unregister from tournament');
      }
    } catch (error) {
      logger.error('Error unregistering from tournament:', error);
      this.showError('Failed to unregister from tournament');
    }
  }

  async showRanksModal() {
    logger.info('🏆 showRanksModal called - button clicked!');
    
    const modal = document.getElementById('ranks-modal');
    const ranksGrid = document.getElementById('ranks-grid');

    if (!modal || !ranksGrid) {
      logger.error('❌ Ranks modal elements not found');
      logger.error('Modal element:', modal);
      logger.error('Ranks grid element:', ranksGrid);
      return;}

    logger.info('🔍 Found modal elements, proceeding...');
    logger.info('🔍 Modal initial state:', {
      classes: modal.className,
      display: window.getComputedStyle(modal).display,
      opacity: window.getComputedStyle(modal).opacity,
      visibility: window.getComputedStyle(modal).visibility
    });

    try {
      // Ensure modal is in a clean state before showing
      modal.classList.remove('show');
      modal.style.removeProperty('display');
      modal.style.removeProperty('opacity');
      modal.style.removeProperty('visibility');
      
      logger.info('🔍 Modal after cleanup:', {
        classes: modal.className,
        display: window.getComputedStyle(modal).display,
        opacity: window.getComputedStyle(modal).opacity,
        visibility: window.getComputedStyle(modal).visibility
      });
      
      // Load ranks data from backend
      const ranks = await this.getRanksData();
      
      // Sort ranks in descending order (Champion to Bronze 3)
      const sortedRanks = ranks.sort((a, b) => {
        const aThreshold = parseInt(a.requirements.match(/\d+/)[0]) || 0;
        const bThreshold = parseInt(b.requirements.match(/\d+/)[0]) || 0;
        return bThreshold - aThreshold;});
      
      // Populate the ranks grid
      ranksGrid.innerHTML = sortedRanks.map(rank => `
        <div class="rank-item">
          <div class="rank-icon">
            ${rank.image ? 
              `<img src="${rank.image.startsWith('/') || rank.image.startsWith('http') ? rank.image : `/assets/img/ranks/${rank.image}`}" alt="${rank.name}" class="rank-image" onerror="this.style.display='none'">` :
              `<i class="fas fa-medal"></i>`
            }
          </div>
          <div class="rank-name">${rank.name}</div>
          <div class="rank-requirements">${rank.requirements}</div>
        </div>
      `).join('');

      // Show the modal - let CSS handle the display
      modal.classList.add('show');
      document.body.classList.add('modal-open');
      
      logger.info('✅ Ranks modal opened successfully');
      logger.info('🔍 Modal classes after show:', modal.className);
      logger.info('🔍 Modal display style:', window.getComputedStyle(modal).display);
      logger.info('🔍 Modal final state:', {
        classes: modal.className,
        display: window.getComputedStyle(modal).display,
        opacity: window.getComputedStyle(modal).opacity,
        visibility: window.getComputedStyle(modal).visibility
      });
      
      // Dispatch a custom event to notify other systems
      modal.dispatchEvent(new CustomEvent('modal:opened', { 
        detail: { modalId: modal.id } 
      }));
      
    } catch (error) {
      logger.error('❌ Error loading ranks:', error);
      this.showError('Failed to load ranks');
    }
  }



  async getRanksData() {
    try {
      const response = await fetch('/api/ladder/ranks');
      if (!response.ok) throw new Error('Failed to fetch ranks');
      
      const ranks = await response.json();
      return ranks.map(rank => ({
        name: rank.name,
        requirements: `${rank.threshold}+ MMR`,
        image: rank.image
      }));} catch (error) {
      logger.error('Error loading ranks:', error);
      // Fallback to default ranks
      return [
        { name: 'Bronze', requirements: '0-1000 MMR' },
        { name: 'Silver', requirements: '1001-1500 MMR' },
        { name: 'Gold', requirements: '1501-2000 MMR' },
        { name: 'Platinum', requirements: '2001-2500 MMR' },
        { name: 'Diamond', requirements: '2501-3000 MMR' },
        { name: 'Master', requirements: '3001+ MMR' }
      ];}
  }

  showCreateTournamentModal() {
    const modal = document.getElementById('create-tournament-modal');
    if (modal) {
      modal.classList.add('show');
      document.body.classList.add('modal-open');
      
      // Set default dates
      this.setDefaultDates();
      
      // Initialize form interactions
      this.initializeFormInteractions();
      
      // Update preview
      this.updateTournamentPreview();
    }
  }

  setDefaultDates() {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week
    
    const startDateInput = document.getElementById('tournament-start-date');
    const endDateInput = document.getElementById('tournament-end-date');
    
    if (startDateInput) {
      startDateInput.value = startDate.toISOString().slice(0, 16);
    }
    if (endDateInput) {
      endDateInput.value = endDate.toISOString().slice(0, 16);
    }
  }

  initializeFormInteractions() {
    // Participants slider
    const participantsSlider = document.getElementById('tournament-max-participants');
    const participantsValue = document.getElementById('participants-value');
    
    if (participantsSlider && participantsValue) {
      // Remove existing listener if it exists
      participantsSlider.removeEventListener('input', this.boundParticipantsSliderHandler);
      this.boundParticipantsSliderHandler = (e) => {
        participantsValue.textContent = e.target.value;
        this.updateTournamentPreview();
      };
      participantsSlider.addEventListener('input', this.boundParticipantsSliderHandler);
    }

    // Remove existing listeners for form fields
    const formFields = ['tournament-name', 'tournament-description', 'tournament-start-date', 'tournament-end-date'];
    formFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        // Remove existing listeners if they exist
        field.removeEventListener('input', this.boundUpdatePreview);
        field.removeEventListener('change', this.boundUpdatePreview);
        this.boundUpdatePreview = () => this.updateTournamentPreview();
        field.addEventListener('input', this.boundUpdatePreview);
        field.addEventListener('change', this.boundUpdatePreview);
      }
    });

    // Game type radio buttons
    const gameTypeRadios = document.querySelectorAll('input[name="gameType"]');
    gameTypeRadios.forEach(radio => {
      // Remove existing listener if it exists
      radio.removeEventListener('change', this.boundUpdatePreview);
      radio.addEventListener('change', this.boundUpdatePreview);
    });

    // Tournament type radio buttons
    const tournamentTypeRadios = document.querySelectorAll('input[name="type"]');
    tournamentTypeRadios.forEach(radio => {
      // Remove existing listener if it exists
      radio.removeEventListener('change', this.boundUpdatePreview);
      radio.addEventListener('change', this.boundUpdatePreview);
    });
  }

  updateTournamentPreview() {
    const name = document.getElementById('tournament-name')?.value || '-';
    const gameType = document.querySelector('input[name="gameType"]:checked');
    const tournamentType = document.querySelector('input[name="type"]:checked');
    const participants = document.getElementById('tournament-max-participants')?.value || '16';
    const startDate = document.getElementById('tournament-start-date')?.value;
    const endDate = document.getElementById('tournament-end-date')?.value;

    // Update preview values
    document.getElementById('preview-name').textContent = name || '-';
    document.getElementById('preview-game').textContent = gameType ? this.getGameDisplayName(gameType.value) : '-';
    document.getElementById('preview-format').textContent = tournamentType ? this.getFormatDisplayName(tournamentType.value) : '-';
    document.getElementById('preview-participants').textContent = participants;

    // Calculate duration
    let duration = '-';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      duration = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
    document.getElementById('preview-duration').textContent = duration;
  }

  getGameDisplayName(gameType) {
    const gameNames = {
      'war1': 'WC 1',
      'war2': 'WC 2',
      'war3': 'WC 3'
    };
    return gameNames[gameType] || 'Unknown';}

  getFormatDisplayName(format) {
    const formatNames = {
      'single_elimination': 'Single Elimination',
      'double_elimination': 'Double Elimination',
      'round_robin': 'Round Robin',
      'swiss': 'Swiss System'
    };
    return formatNames[format] || format;}

  async handleCreateTournament(e) {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (this.isSubmitting) {
      logger.info('⚠️ Tournament creation already in progress, ignoring duplicate submission');
      return;}
    
    this.isSubmitting = true;
    
    // Show loading state
    this.showLoadingState();
    
    const formData = new FormData(e.target);
    const tournamentData = {
      name: formData.get('name'),
      description: formData.get('description'),
      gameType: this.currentGameType, // Use current game type
      type: formData.get('type'),
      maxParticipants: parseInt(formData.get('maxParticipants')),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate')
    };

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tournamentData)
      });

      if (!response.ok) {
        throw new Error('Failed to create tournament');
      }

      // Hide loading state
      this.hideLoadingState();

      // Show success animation
      this.showSuccessAnimation();

      // Close modal and reload tournaments after delay
      setTimeout(() => {
        this.closeModal(document.getElementById('create-tournament-modal'));
        this.loadTournaments();
        this.isSubmitting = false; // Reset submission flag
      }, 2000);
      
    } catch (error) {
      logger.error('Error creating tournament:', error);
      this.hideLoadingState();
      this.showError('Failed to create tournament');
      this.isSubmitting = false; // Reset submission flag on error
    }
  }

  showLoadingState() {
    const modal = document.getElementById('create-tournament-modal');
    if (modal) {
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'tournament-form-loading';
      loadingOverlay.innerHTML = '<div class="spinner"></div>';
      modal.appendChild(loadingOverlay);
    }
  }

  hideLoadingState() {
    const loadingOverlay = document.querySelector('.tournament-form-loading');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }

  showSuccessAnimation() {
    const successDiv = document.createElement('div');
    successDiv.className = 'tournament-success';
    successDiv.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <h3>Tournament Created!</h3>
      <p>Your tournament has been successfully created and is now live.</p>
    `;
    document.body.appendChild(successDiv);

    // Remove after animation
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  closeModal(modal) {
    logger.info('🔒 closeModal called for:', modal?.id);
    
    if (modal) {
      // Remove show class from modal - let CSS handle the hiding
      modal.classList.remove('show');
      
      // Remove modal-open class from body if no other modals are open
      const openModals = document.querySelectorAll('.modal.show');
      if (openModals.length === 0) {
        document.body.classList.remove('modal-open');
      }
      
      // Ensure the modal is properly hidden by CSS
      // Don't set display: none directly - let CSS handle it
      modal.style.removeProperty('display');
      
      // Reset any inline styles that might interfere
      modal.style.removeProperty('opacity');
      modal.style.removeProperty('visibility');
      
      logger.info('✅ Modal closed successfully');
      logger.info('🔍 Modal classes after close:', modal.className);
      logger.info('🔍 Modal display style after close:', window.getComputedStyle(modal).display);
      
      // Dispatch a custom event to notify other systems
      modal.dispatchEvent(new CustomEvent('modal:closed', { 
        detail: { modalId: modal.id } 
      }));
    }
  }

  showSuccess(message) {
    // Use NotificationUtils for nice notifications
    if (window.NotificationUtils) {
      window.NotificationUtils.success(message);
    } else {
      // Fallback to a simple notification
      this.showSimpleNotification(message, 'success');
    }
  }

  showError(message) {
    // Use NotificationUtils for nice notifications
    if (window.NotificationUtils) {
      window.NotificationUtils.error(message);
    } else {
      // Fallback to a simple notification
      this.showSimpleNotification(message, 'error');
    }
  }

  showSimpleNotification(message, type = 'info') {
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
      max-width: 400px;
      animation: slideInRight 0.3s ease-out;
    `;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span style="margin-left: 8px;">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer;">&times;</button>
      </div>
    `;

    // Add animation styles if not already present
    if (!document.getElementById('notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // Tournament dropdown functionality for match reporting
  async handleReportMatchClick() {
    // Get current game type from active tab
    const activeTab = document.querySelector('.game-tab.active');
    // Normalize attribute: our tabs use data-game
    const gameType = activeTab ? (activeTab.dataset.game || activeTab.dataset.gameType || 'war2') : 'war2';
    
    // Check if user is in any ongoing tournaments for this game type
    await this.checkAndPopulateTournamentDropdown(gameType);
  }

  async checkAndPopulateTournamentDropdown(gameType) {
    try {
      if (!this.currentUser) return;const ongoingTournaments = this.tournaments.filter(tournament => 
        tournament.gameType === gameType && 
        tournament.status === 'in_progress' &&
        tournament.participants?.some(p => p.userId === this.currentUser.id)
      );

      // Handle WC2/WC3 dropdown
      const dropdownGroup = document.getElementById('tournament-dropdown-group');
      const dropdown = document.getElementById('tournament-select');

      if (dropdownGroup && dropdown) {
        if (ongoingTournaments.length > 0) {
          // Show dropdown and populate with tournaments
          dropdownGroup.style.display = 'block';
          
          // Clear existing options except the first one
          dropdown.innerHTML = '<option value="">Select Tournament (Optional)</option>';
          
          // Add tournament options
          ongoingTournaments.forEach(tournament => {
            const option = document.createElement('option');
            option.value = tournament._id;
            option.textContent = tournament.name;
            dropdown.appendChild(option);
          });
        } else {
          // Hide dropdown if no ongoing tournaments
          dropdownGroup.style.display = 'none';
        }
      }

      // Handle WC1 dropdown
      const wc1DropdownGroup = document.getElementById('wc1-tournament-dropdown-group');
      const wc1Dropdown = document.getElementById('wc1-tournament-select');

      if (wc1DropdownGroup && wc1Dropdown) {
        if (ongoingTournaments.length > 0) {
          // Show dropdown and populate with tournaments
          wc1DropdownGroup.style.display = 'block';
          
          // Clear existing options except the first one
          wc1Dropdown.innerHTML = '<option value="">Select Tournament (Optional)</option>';
          
          // Add tournament options
          ongoingTournaments.forEach(tournament => {
            const option = document.createElement('option');
            option.value = tournament._id;
            option.textContent = tournament.name;
            wc1Dropdown.appendChild(option);
          });
        } else {
          // Hide dropdown if no ongoing tournaments
          wc1DropdownGroup.style.display = 'none';
        }
      }
      
    } catch (error) {
      logger.error('Error checking tournament dropdown:', error);
    }
  }

  // Method to get user's ongoing tournaments for a specific game type
  getUserOngoingTournaments(gameType) {
    if (!this.currentUser) return [];return this.tournaments.filter(tournament => 
      tournament.gameType === gameType && 
      tournament.status === 'in_progress' &&
      tournament.participants?.some(p => p.userId === this.currentUser.id)
    );}

  async viewResults(tournamentId) {
    try {
      logger.info('🏆 Viewing tournament results:', tournamentId);
      
      // For now, just show a message - this can be expanded later
      this.showMessage('Tournament results feature coming soon!');
      
      // TODO: Implement tournament results view
      // - Show final standings
      // - Show match results
      // - Show prize distribution
      
    } catch (error) {
      logger.error('Error viewing tournament results:', error);
      this.showError('Failed to load tournament results');
    }
  }

  async viewBrackets(tournamentId) {
    try {
      logger.info('🏆 Viewing tournament brackets:', tournamentId);
      
      // For now, just show a message - this can be expanded later
      this.showMessage('Tournament brackets feature coming soon!');
      
      // TODO: Implement tournament brackets view
      // - Show tournament bracket structure
      // - Show current matches
      // - Show upcoming matches
      // - Allow navigation through rounds
      
    } catch (error) {
      logger.error('Error viewing tournament brackets:', error);
      this.showError('Failed to load tournament brackets');
    }
  }

  async manageTournament(tournamentId) {
    try {
      logger.info('🏆 Managing tournament:', tournamentId);
      
      // Fetch tournament details
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load tournament details');
      }

      const tournament = await response.json();
      this.showTournamentManagementModal(tournament);
      
    } catch (error) {
      logger.error('Error managing tournament:', error);
      this.showError('Failed to load tournament management');
    }
  }

  showTournamentManagementModal(tournament) {
    const modal = document.getElementById('tournament-management-modal');
    const content = document.getElementById('tournament-management-content');
    
    if (!modal || !content) {
      logger.error('Tournament management modal elements not found');
      return;}

    // Store current tournament for management
    this.currentManagedTournament = tournament;

    // Generate management interface
    content.innerHTML = this.generateTournamentManagementInterface(tournament);

    // Show modal
    modal.classList.add('show');
    document.body.classList.add('modal-open');

    // Setup management event listeners
    this.setupManagementEventListeners();
  }

  generateTournamentManagementInterface(tournament) {
    const participants = tournament.participants || [];
    const stats = this.calculateTournamentStats(tournament);

    return `
      <!-- Tournament Stats -->
      <div class="tournament-stats">
        <div class="stat-item">
          <div class="stat-value">${stats.totalParticipants}</div>
          <div class="stat-label">Participants</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.availableSlots}</div>
          <div class="stat-label">Available</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${this.formatStatus(tournament.status)}</div>
          <div class="stat-label">Status</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${this.getGameDisplayName(tournament.gameType)}</div>
          <div class="stat-label">Game</div>
        </div>
      </div>

      <!-- Basic Information -->
      <div class="tournament-management-section">
        <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
        <div class="tournament-management-grid">
          <div class="tournament-management-field">
            <label for="manage-tournament-name">Tournament Name</label>
            <input type="text" id="manage-tournament-name" value="${tournament.name}" maxlength="100">
          </div>
          <div class="tournament-management-field">
            <label for="manage-tournament-description">Description</label>
            <textarea id="manage-tournament-description" rows="3">${tournament.description || ''}</textarea>
          </div>
          <div class="tournament-management-field">
            <label for="manage-tournament-max-participants">Max Participants</label>
            <input type="number" id="manage-tournament-max-participants" value="${tournament.maxParticipants}" min="2" max="128">
          </div>
        </div>
      </div>

      <!-- Tournament Status -->
      <div class="tournament-management-section">
        <h4><i class="fas fa-flag"></i> Tournament Status</h4>
        <div class="status-management">
          <label>Current Status:</label>
          <div class="status-selector">
            <div class="status-option ${tournament.status === 'draft' ? 'active' : ''}" data-status="draft">Draft</div>
            <div class="status-option ${tournament.status === 'registration' ? 'active' : ''}" data-status="registration">Registration Open</div>
            <div class="status-option ${tournament.status === 'in_progress' ? 'active' : ''}" data-status="in_progress">In Progress</div>
            <div class="status-option ${tournament.status === 'completed' ? 'active' : ''}" data-status="completed">Completed</div>
            <div class="status-option ${tournament.status === 'cancelled' ? 'active' : ''}" data-status="cancelled">Cancelled</div>
          </div>
        </div>
      </div>

      <!-- Schedule -->
      <div class="tournament-management-section">
        <h4><i class="fas fa-calendar"></i> Schedule</h4>
        <div class="tournament-management-grid">
          <div class="tournament-management-field">
            <label for="manage-tournament-start-date">Start Date</label>
            <input type="datetime-local" id="manage-tournament-start-date" value="${this.formatDateTimeForInput(tournament.startDate)}">
          </div>
          <div class="tournament-management-field">
            <label for="manage-tournament-end-date">End Date</label>
            <input type="datetime-local" id="manage-tournament-end-date" value="${this.formatDateTimeForInput(tournament.endDate)}">
          </div>
        </div>
      </div>

      <!-- Participants Management -->
      <div class="tournament-management-section">
        <h4><i class="fas fa-users"></i> Participants (${participants.length}/${tournament.maxParticipants})</h4>
        <div class="participants-list">
          ${participants.length > 0 ? 
            participants.map(participant => this.generateParticipantItem(participant)).join('') :
            '<div style="padding: 1rem;text-align: center; color: #9ca3af;">No participants yet</div>'
          }
        </div>
      </div>
    `;
  }

  generateParticipantItem(participant) {
    const joinDate = participant.joinDate ? new Date(participant.joinDate).toLocaleDateString() : 'Unknown';
    const avatarText = participant.username ? participant.username.charAt(0).toUpperCase() : '?';
    
    return `
      <div class="participant-item" data-participant-id="${participant.userId}">
        <div class="participant-info">
          <div class="participant-avatar">${avatarText}</div>
          <div class="participant-details">
            <div class="participant-name">${participant.username || 'Unknown User'}</div>
            <div class="participant-join-date">Joined: ${joinDate}</div>
          </div>
        </div>
        <div class="participant-actions">
          <button class="btn-remove-participant" onclick="window.arenaTournamentManager.removeParticipant('${participant.userId}')">
            <i class="fas fa-times"></i> Remove
          </button>
        </div>
      </div>
    `
  }

  calculateTournamentStats(tournament) {
    const participants = tournament.participants || [];return {
      totalParticipants: participants.length,
      availableSlots: tournament.maxParticipants - participants.length,
      registrationOpen: tournament.status === 'registration',
      isActive: tournament.status === 'in_progress'
    };}

  formatDateTimeForInput(dateString) {
    if (!dateString) return '';const date = new Date(dateString);
    return date.toISOString().slice(0, 16);}

  setupManagementEventListeners() {
    // Status selector
    const statusOptions = document.querySelectorAll('.status-option');
    statusOptions.forEach(option => {
      option.addEventListener('click', () => {
        statusOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
      });
    });

    // Close management modal
    const closeBtn = document.getElementById('close-management-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeTournamentManagementModal();
      });
    }

    // Save changes
    const saveBtn = document.getElementById('save-tournament-changes');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveTournamentChanges();
      });
    }

    // Delete tournament
    const deleteBtn = document.getElementById('delete-tournament-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.showDeleteConfirmation();
      });
    }

    // Delete confirmation modal
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.deleteTournament();
      });
    }

    const cancelDeleteBtn = document.getElementById('cancel-delete');
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        this.closeDeleteConfirmation();
      });
    }
  }

  async saveTournamentChanges() {
    if (!this.currentManagedTournament) return;const saveBtn = document.getElementById('save-tournament-changes');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      // Collect form data
      const updatedData = {
        name: document.getElementById('manage-tournament-name').value,
        description: document.getElementById('manage-tournament-description').value,
        maxParticipants: parseInt(document.getElementById('manage-tournament-max-participants').value),
        startDate: document.getElementById('manage-tournament-start-date').value,
        endDate: document.getElementById('manage-tournament-end-date').value,
        status: document.querySelector('.status-option.active').dataset.status
      };

      // Validate data
      if (!updatedData.name.trim()) {
        throw new Error('Tournament name is required');
      }

      if (updatedData.maxParticipants < 2) {
        throw new Error('Maximum participants must be at least 2');
      }

      // Send update request
      const response = await fetch(`/api/tournaments/${this.currentManagedTournament._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        throw new Error('Failed to update tournament');
      }

      // Show success message
      this.showSuccess('Tournament updated successfully!');
      
      // Close modal and reload tournaments
      this.closeTournamentManagementModal();
      await this.loadTournaments();

    } catch (error) {
      logger.error('Error saving tournament changes:', error);
      this.showError(error.message || 'Failed to save changes');
    } finally {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  }

  async removeParticipant(userId) {
    if (!this.currentManagedTournament) return;try {
      const response = await fetch(`/api/tournaments/${this.currentManagedTournament._id}/participants/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to remove participant');
      }

      // Remove from UI
      const participantElement = document.querySelector(`[data-participant-id="${userId}"]`);
      if (participantElement) {
        participantElement.remove();
      }

      // Update stats
      this.updateTournamentStats();

      this.showSuccess('Participant removed successfully!');

    } catch (error) {
      logger.error('Error removing participant:', error);
      this.showError('Failed to remove participant');
    }
  }

  updateTournamentStats() {
    const participants = document.querySelectorAll('.participant-item');
    const maxParticipants = parseInt(document.getElementById('manage-tournament-max-participants').value);
    const availableSlots = maxParticipants - participants.length;

    // Update stats display
    const statsElements = document.querySelectorAll('.stat-value');
    if (statsElements.length >= 2) {
      statsElements[0].textContent = participants.length;
      statsElements[1].textContent = availableSlots;
    }

    // Update section header
    const sectionHeader = document.querySelector('.tournament-management-section h4');
    if (sectionHeader && sectionHeader.textContent.includes('Participants')) {
      sectionHeader.innerHTML = `<i class="fas fa-users"></i> Participants (${participants.length}/${maxParticipants})`;
    }
  }

  showDeleteConfirmation() {
    const modal = document.getElementById('delete-confirmation-modal');
    const tournamentName = document.getElementById('delete-tournament-name');
    
    if (modal && tournamentName && this.currentManagedTournament) {
      tournamentName.textContent = this.currentManagedTournament.name;
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    }
  }

  closeDeleteConfirmation() {
    const modal = document.getElementById('delete-confirmation-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  async deleteTournament() {
    if (!this.currentManagedTournament) return;const deleteBtn = document.getElementById('confirm-delete');
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = 'Deleting...';
    deleteBtn.disabled = true;

    try {
      const response = await fetch(`/api/tournaments/${this.currentManagedTournament._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete tournament');
      }

      this.showSuccess('Tournament deleted successfully!');
      
      // Close all modals
      this.closeDeleteConfirmation();
      this.closeTournamentManagementModal();
      
      // Reload tournaments
      await this.loadTournaments();

    } catch (error) {
      logger.error('Error deleting tournament:', error);
      this.showError(error.message || 'Failed to delete tournament');
    } finally {
      deleteBtn.textContent = originalText;
      deleteBtn.disabled = false;
    }
  }

  closeTournamentManagementModal() {
    const modal = document.getElementById('tournament-management-modal');
    if (modal) {
      modal.classList.remove('show');
      this.currentManagedTournament = null;
    }
  }

  showMessage(message) {
    // Use the same notification system as other methods
    this.showSimpleNotification(message, 'info');
  }
}