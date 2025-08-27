/**
 * ForumCore.js - Next-Generation Forum Core System
 * 
 * Features:
 * - Game-specific forum sections (WC1, WC2, WC3)
 * - Modern post composer with rich features
 * - Real-time post management
 * - User authentication and profiles
 * - Post reactions and interactions
 * - Media upload handling
 * - SEO-friendly URLs and navigation
 * - Poll creation and voting
 */

// Import PollCreator for poll functionality
import { PollCreator } from './PollCreator.js';
// Import EmojiPicker for emoji functionality
import { EmojiPicker } from './EmojiPicker.js';
// Import the new apiClient
import { apiClient } from './ApiClient.js';

class ForumCore {
  constructor() {
    // Singleton pattern to prevent multiple instances
    if (window.forumCore) {
      return window.forumCore;}
    
    this.currentGame = 'wc2'; // Default to WC2
    this.currentUser = null;
    this.posts = [];
    this.isAuthenticated = false;
    this.currentCategoryFilter = 'all';
    this.apiBaseUrl = '/api/forum';
    this.pollCreator = new PollCreator();
    this.pendingPollData = null; // Store poll data for post creation
    
    // Clan-specific properties
    this.clanId = null;
    this.clanName = null;
    
    // Use the new apiClient
    this.apiClient = apiClient;
    
    // Game configurations
    this.gameConfigs = {
      wc1: {
        name: 'Warcraft I',
        theme: 'wc1-theme',
        color: '#daa520',
        icon: 'fas fa-dragon',
        description: 'Classic RTS gameplay and strategic discussions'
      },
      wc2: {
        name: 'Warcraft II',
        theme: 'wc2-theme',
        color: '#D4AF37',
        icon: 'fas fa-shield-alt',
        description: 'Advanced tactics and competitive strategies'
      },
      wc3: {
        name: 'Warcraft III',
        theme: 'wc3-theme',
        color: '#2563EB',
        icon: 'fas fa-chess-king',
        description: 'Hero strategies and diverse gameplay modes'
      },
      tournaments: {
        name: 'Tournaments',
        theme: 'wc2-theme',
        color: '#FFD700',
        icon: 'fas fa-trophy',
        description: 'Announcements and Results (automated)'
      },
      clan: {
        name: 'Clan',
        theme: 'wc2-theme', // Use WC2 theme for now
        color: '#D4AF37',
        icon: 'fas fa-scroll',
        description: 'Your clan\'s private stone tablet'
      }
    };

    // Don't call init() immediately - wait for proper initialization
    
    // Store as global instance
    window.forumCore = this;
  }

  /**
   * Ensure clan data is available from API or chat manager if possible
   */
  async ensureClanFromAnySource() {
    // Prefer API
    try {
      const clan = await this.apiClient.getUserClan();
      if (clan && clan._id) {
        this.hasClan = true;
        this.clanId = clan._id;
        this.clanName = clan.name || 'Clan';
        return;}
    } catch (_) {}
    // Fallback: check chatManager (if it tracks clan)
    try {
      if (window.chatManager && window.chatManager.currentUser?.clanId) {
        this.hasClan = true;
        this.clanId = window.chatManager.currentUser.clanId;
        this.clanName = window.chatManager.currentUser.clanName || 'Clan';
      }
    } catch (_) {}
  }

  /**
   * Ensure composer is always hidden until user clicks create post button
   */
  ensureComposerHidden() {
    const composer = document.getElementById('post-composer');
    if (composer) {
      composer.classList.add('hidden');
      composer.classList.remove('show');
      composer.style.display = 'none'; // NUCLEAR OPTION: Force hide with inline style
    }
  }

  /**
   * Initialize the forum system
   */
  async init() {
    try {
      // Wait for API client to be available
      await this.waitForApiClient();
      
      // Initialize API client and emoji picker for forum use
      this.apiClient = apiClient;
      this.emojiPicker = new EmojiPicker(this);
      
      // IMMEDIATELY hide composer on init - it should never be visible on page load
      this.ensureComposerHidden();
      
      // Wait for JWT token to be available if in URL
      if (window.location.search.includes('authToken=')) {
        await this.waitForAuthToken();
      }
      
      // Check authentication status
      await this.checkAuthentication();

      // Try to load user clan regardless of authentication race; handle 401 gracefully
      await this.ensureClanFromAnySource();
      
      // Show clan tab if user has clan OR URL parameter requests clan
      const urlParams = new URLSearchParams(window.location.search);
      const shouldShowClanTab = !!this.hasClan || urlParams.get('game') === 'clan';
      
      const clanTab = document.getElementById('clan-forum-tab');
      const clanTabText = document.getElementById('clan-tab-text');
      
      if (clanTab) {
        // Use visibility to avoid layout thrash from flex reflow; toggle clickability via aria-hidden
        clanTab.style.visibility = shouldShowClanTab ? 'visible' : 'hidden';
        clanTab.setAttribute('aria-hidden', shouldShowClanTab ? 'false' : 'true');
        if (clanTabText && shouldShowClanTab) {
          clanTabText.textContent = this.hasClan ? this.clanName : 'Clan';
        }
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize game tabs
      this.initializeGameTabs();
      
      // Load initial posts
      await this.loadPosts();
      // Ensure correct CTA on first render
      this.updateCreateCTAForContext();
      
      // Update forum stats
      await this.updateForumStats();
    } catch (error) {
      console.error('ForumCore: Initialization failed:', error);
      this.showError('Failed to initialize forum. Please refresh the page.');
    }
  }

  /**
   * Wait for API client to be available
   */
  async waitForApiClient() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      if (apiClient) {
        return;}
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('API client not available after maximum attempts');
  }

  /**
   * Wait for JWT token to be processed
   */
  async waitForAuthToken() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const token = localStorage.getItem('authToken');
      if (token) {
        return;}
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  /**
   * Check user authentication status
   */
  async checkAuthentication() {
    try {
      const response = await (window.authenticatedFetch || fetch)('/api/me');
      
      if (response.ok) {
        this.currentUser = await response.json();
        this.isAuthenticated = true;
        this.updateUserInterface();
      } else {
        this.isAuthenticated = false;
        this.handleUnauthenticatedUser();
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      this.isAuthenticated = false;
      this.handleUnauthenticatedUser();
    }
  }

  /**
   * Update UI based on authentication status
   */
  updateUserInterface() {
    if (this.isAuthenticated && this.currentUser) {
      // Update composer avatar
      const composerAvatar = document.getElementById('composer-avatar');
      if (composerAvatar) {
        composerAvatar.src = this.currentUser.avatar || '/assets/img/default-avatar.svg';
        composerAvatar.alt = `${this.currentUser.username}'s Avatar`;
      }
      
      // ENSURE composer stays hidden - only show create post button
      const composer = document.getElementById('post-composer');
      if (composer) {
        composer.classList.remove('show');
        composer.classList.add('hidden');
        composer.style.display = 'none'; // NUCLEAR OPTION: Force hide with inline style
      }
      this.showCreatePostButton();
    } else {
      this.handleUnauthenticatedUser();
    }
  }

  /**
   * Show Create Post button instead of composer
   */
  showCreatePostButton() {
    // Remove existing create post button if any
    const existingButton = document.getElementById('create-post-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    // Create the button
    const createPostButton = document.createElement('button');
    createPostButton.id = 'create-post-button';
    createPostButton.className = 'create-post-button';
    createPostButton.innerHTML = `
      <i class="fas fa-hammer chisel-icon" aria-hidden="true"></i>
      <span>Create Post</span>
    `;
    
    // Add click handler
    createPostButton.addEventListener('click', () => {
      this.showPostComposer();
    });
    
    // Insert before the posts feed (unless tournaments tab is active)
    const forumFeed = document.querySelector('.forum-feed');
    const composer = document.getElementById('post-composer');
    if (forumFeed && composer) {
      if (this.currentGame === 'tournaments') {
        // Hide composer and show Create Tournament CTA instead
        composer.classList.add('hidden');
        composer.style.display = 'none';
        const existingCTA = document.getElementById('create-tournament-cta');
        if (!existingCTA) {
          const cta = document.createElement('button');
          cta.id = 'create-tournament-cta';
          cta.className = 'create-post-button';
          cta.innerHTML = `
            <i class="fas fa-trophy chisel-icon" aria-hidden="true"></i>
            <span>Create Tournament</span>
          `;
          cta.addEventListener('click', () => {
            // Navigate to Arena and open create tournament modal
            try {
              localStorage.setItem('openCreateTournamentModal', '1');
            } catch (_) {}
            window.location.href = '/views/arena.html#tournaments';
          });
          forumFeed.insertBefore(cta, composer);
          try { this._initCreatePostChiselFX(cta); } catch (_) {}
        }
        return;}
      // Default: show Create Post button
      forumFeed.insertBefore(createPostButton, composer);
      try { this._initCreatePostChiselFX(createPostButton); } catch (_) {}
    } else {
      console.error('Missing forum elements:', { forumFeed: !!forumFeed, composer: !!composer });
    }
  }

  // Create Post button chip burst FX using an overlay canvas within the button
  _initCreatePostChiselFX(buttonEl) {
    if (!buttonEl || buttonEl.dataset.fxReady) return;buttonEl.dataset.fxReady = 'true';
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '5';
    buttonEl.style.position = 'relative';
    buttonEl.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const r = buttonEl.getBoundingClientRect();
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(buttonEl);

    let particles = [];
    let raf = 0;
    const chipRGB = '235,232,224';
    let hoverAnimating = false;
    const spawnBurst = () => {
      // Find chisel icon center
      const icon = buttonEl.querySelector('.chisel-icon');
      const rBtn = buttonEl.getBoundingClientRect();
      let cx = rBtn.width * 0.2, cy = rBtn.height * 0.5; // fallback
      if (icon) {
        const ri = icon.getBoundingClientRect();
        cx = (ri.left - rBtn.left) + ri.width / 2;
        cy = (ri.top - rBtn.top) + ri.height / 2;
      }
      // Spawn within button bounds (tight spread)
      for (let i = 0; i < 16; i++) {
        const ang = (Math.random() * Math.PI) - Math.PI * 0.7;
        const spd = 0.8 + Math.random() * 1.6;
        particles.push({
          x: cx + 4,
          y: cy + 2,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.4,
          r: 1 + Math.random() * 1.6,
          life: 360 + Math.random() * 240,
          age: 0
        });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = (ts => {
      let last = performance.now();
      return function loop(now) {
        const dt = now - last;last = now;
        // clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // physics & draw
        const gravity = 0.28, drag = 0.985;
        let write = 0;
        for (let read = 0; read < particles.length; read++) {
          const p = particles[read];
          p.age += dt;
          if (p.age >= p.life) continue;
          p.vy += gravity * (dt / 16.67);
          p.vx *= drag; p.vy *= drag;
          p.x += p.vx * (dt / 16.67) * 1.8;
          p.y += p.vy * (dt / 16.67) * 1.8;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 0.95 * (1 - p.age / p.life));
          ctx.fillStyle = `rgba(${chipRGB},1)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          particles[write++] = p;
        }
        particles.length = write;
        if (particles.length) raf = requestAnimationFrame(loop);
        else { cancelAnimationFrame(raf); raf = 0; }
      }
    })();

    // Burst on hover enter
    buttonEl.addEventListener('mouseenter', () => {
      hoverAnimating = true;
      try { spawnBurst(); } catch (_) {}
    }, { passive: true });
    // Periodic small bursts while hover animation is active
    const hoverInterval = setInterval(() => {
      if (!hoverAnimating) return;try { spawnBurst(); } catch (_) {}
    }, 500);
    buttonEl.addEventListener('mouseleave', () => { hoverAnimating = false; }, { passive: true });
    // Do not intercept clicks or pointer events; canvas is pointer-events:none
    // Clean up on removal
    const mo = new MutationObserver(() => {
      if (!document.body.contains(buttonEl)) {
        cancelAnimationFrame(raf);
        ro.disconnect();
        mo.disconnect();
        clearInterval(hoverInterval);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Show the post composer (don't hide create button)
   */
  showPostComposer() {
    const composer = document.getElementById('post-composer');
    const createButton = document.getElementById('create-post-button');
    
    if (composer && createButton) {
      // HIDE the create post button completely
      createButton.style.display = 'none';
      
      // Show composer
      composer.classList.remove('hidden');
      composer.classList.add('show');
      composer.style.display = 'block'; // Override inline style
      
      // Focus on the textarea
      const textarea = document.getElementById('composer-textarea');
      if (textarea) {
        textarea.focus();
      }
    } else {
      console.error('Missing elements:', { composer: !!composer, createButton: !!createButton });
    }
  }

  /**
   * Hide the post composer (restore create button)
   */
  hidePostComposer() {
    const composer = document.getElementById('post-composer');
    const createButton = document.getElementById('create-post-button');
    
    if (composer && createButton) {
      // Hide composer
      composer.classList.add('hidden');
      composer.classList.remove('show');
      composer.style.display = 'none'; // Force hide with inline style
      
      // SHOW the create post button again
      createButton.style.display = 'flex'; // Restore button display
      
      // Clear textarea
      const textarea = document.getElementById('composer-textarea');
      if (textarea) {
        textarea.value = '';
      }
    }
  }

  /**
   * Handle unauthenticated user state
   */
  handleUnauthenticatedUser() {
    const composer = document.getElementById('post-composer');
    if (composer) {
      // KEEP THE COMPOSER HIDDEN - don't show auth prompt in composer
      composer.classList.add('hidden');
      composer.classList.remove('show');
      composer.style.display = 'none'; // NUCLEAR OPTION: Force hide with inline style
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Game tab switching (scope to top game tabs only)
    document.querySelectorAll('.game-tabs .game-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.handleGameTabClick(e));
    });

    // Post composer events
    const composerTextarea = document.getElementById('composer-textarea');
    const publishBtn = document.getElementById('publish-post-btn');
    const composerTitle = document.getElementById('composer-title');
    const composerCategory = document.getElementById('composer-category');
    
    if (composerTextarea) {
      composerTextarea.addEventListener('input', (e) => this.handleComposerInput(e));
      composerTextarea.addEventListener('keydown', (e) => this.handleComposerKeydown(e));
      composerTextarea.addEventListener('input', () => {
        composerTextarea.style.borderColor = '';
        composerTextarea.style.boxShadow = '';
      });
    }
    if (composerTitle) {
      composerTitle.addEventListener('input', () => {
        composerTitle.style.borderColor = '';
        composerTitle.style.boxShadow = '';
      });
    }
    if (composerCategory) {
      composerCategory.addEventListener('change', () => {
        composerCategory.style.borderColor = '';
        composerCategory.style.boxShadow = '';
      });
    }

    // Global escape key handler to close composer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const composer = document.getElementById('post-composer');
        if (composer && !composer.classList.contains('hidden')) {
          this.hidePostComposer();
        }
      }
    });
    
    if (publishBtn) {
      publishBtn.addEventListener('click', (e) => this.handlePublishPost(e));
    }

    // Composer tools
    document.getElementById('attach-image-btn')?.addEventListener('click', () => this.handleImageUpload());
    document.getElementById('attach-video-btn')?.addEventListener('click', () => this.handleVideoEmbed());
    document.getElementById('add-poll-btn')?.addEventListener('click', () => this.handleCreatePoll());
    document.getElementById('add-emoji-btn')?.addEventListener('click', () => this.handleEmojiPicker());

    // Cancel button
    document.getElementById('cancel-post-btn')?.addEventListener('click', () => {
      this.hidePostComposer();
    });

    // File upload inputs
    document.getElementById('image-upload')?.addEventListener('change', (e) => this.handleFileSelected(e, 'image'));
  }

  /**
   * Initialize game tabs functionality
   */
  initializeGameTabs() {
    const urlParams = new URLSearchParams(window.location.search);
    let defaultGame = 'wc2';
    if (urlParams.get('game') === 'clan') {
      defaultGame = 'clan';
    } else if (this.hasClan) {
      defaultGame = 'clan';
    }
    this.switchGame(defaultGame);
    document.querySelectorAll('.game-tabs .game-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.game === defaultGame);
      tab.addEventListener('click', (e) => {
        const gameType = e.currentTarget.dataset.game;
        if (gameType && gameType !== this.currentGame) {
          // Update visuals for game tabs
          document.querySelectorAll('.game-tabs .game-tab').forEach(t => t.classList.remove('active'));
          e.currentTarget.classList.add('active');
          // Switch game
          this.switchGame(gameType);
        }
      });
    });

    // Category filters events
    const container = document.querySelector('.category-filters');
    if (container) {
      container.querySelectorAll('.game-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
          container.querySelectorAll('.game-tab').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.currentCategoryFilter = e.currentTarget.dataset.category || 'all';
          // Reload from server with category when supported
          this.loadPosts().catch(() => this.applyCategoryFilter());
          // Update CTA based on tournaments filter state
          this.updateCreateCTAForContext();
        });
      });
    }
  }

  // Update Create Post/Tournament CTA depending on current context
  updateCreateCTAForContext() {
    const forumFeed = document.querySelector('.forum-feed');
    const composer = document.getElementById('post-composer');
    if (!forumFeed || !composer) return;const existingPostBtn = document.getElementById('create-post-button');
    const existingTournamentCTA = document.getElementById('create-tournament-cta');
    existingPostBtn && existingPostBtn.remove();
    existingTournamentCTA && existingTournamentCTA.remove();

    const tournamentsFilterActive = document.getElementById('tab-tournaments')?.classList.contains('active');
    const isTournamentsContext = this.currentGame === 'tournaments' || !!tournamentsFilterActive;

    if (isTournamentsContext) {
      // Hide composer and show Create Tournament CTA
      composer.classList.add('hidden');
      composer.style.display = 'none';

      const cta = document.createElement('button');
      cta.id = 'create-tournament-cta';
      cta.className = 'create-post-button';
      cta.innerHTML = `
        <i class="fas fa-trophy chisel-icon" aria-hidden="true"></i>
        <span>Create Tournament</span>
      `;
      cta.addEventListener('click', () => {
        try { localStorage.setItem('openCreateTournamentModal', '1'); } catch (_) {}
        window.location.href = '/views/arena.html#tournaments';
      });
      forumFeed.insertBefore(cta, composer);
      try { this._initCreatePostChiselFX(cta); } catch (_) {}
    } else {
      // Default: show Create Post button
      this.showCreatePostButton();
    }
  }

  /**
   * Handle game tab clicks
   */
  async handleGameTabClick(event) {
    const gameType = event.currentTarget.dataset.game;
    
    if (gameType === this.currentGame) return;document.querySelectorAll('.game-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.game === gameType);
    });
    
    // Switch game and reload content
    await this.switchGame(gameType);
  }

  /**
   * Switch to a different game forum
   */
  async switchGame(gameType) {
    if (!this.gameConfigs[gameType]) {
      console.error('Invalid game type:', gameType);
      return;}
    
    this.currentGame = gameType;
    const config = this.gameConfigs[gameType];
    
    // Load clan data if switching to clan tab
    if (gameType === 'clan') {
      await this.loadUserClan();
    }
    
    // Update page theme
    const container = document.getElementById('forum-container');
    if (container) {
      // Remove existing theme classes
      Object.values(this.gameConfigs).forEach(cfg => {
        container.classList.remove(cfg.theme);
      });
      // Add new theme class
      container.classList.add(config.theme);
    }
    
    // Update page title
    document.title = `WC Arena - ${config.name} Forum`;
    
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('game', gameType);
    window.history.pushState({ game: gameType }, '', url);

    // Show/hide category filters (hidden for tournaments) and reset to All when switching games
    const categoryFilters = document.querySelector('.category-filters');
    if (categoryFilters) {
      // Keep category filters visible even in tournaments view
      const isTournaments = (gameType === 'tournaments');
      categoryFilters.style.display = 'flex';
      // Reset active filter state to All whenever switching game
      const filterButtons = categoryFilters.querySelectorAll('.game-tab');
      filterButtons.forEach(b => b.classList.remove('active'));
      const filterAll = categoryFilters.querySelector('#filter-all');
      if (filterAll) {
        filterAll.classList.add('active');
      }
      this.currentCategoryFilter = 'all';
    }
    
    // Clear current posts and load new ones
    this.posts = [];
    await this.loadPosts();

    // Update CTA after posts load
    this.updateCreateCTAForContext();
    
    // Update stats for new game
    await this.updateForumStats();
  }

  /**
   * Set up post composer functionality
   */
  setupPostComposer() {
    const textarea = document.getElementById('composer-textarea');
    const publishBtn = document.getElementById('publish-post-btn');
    
    if (!textarea || !publishBtn) return;textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
    });
    
    // Enable/disable publish button based on content
    textarea.addEventListener('input', () => {
      const hasContent = textarea.value.trim().length > 0;
      publishBtn.disabled = !hasContent || !this.isAuthenticated;
    });
  }

  /**
   * Handle composer input events
   */
  handleComposerInput(event) {
    const content = event.target.value;
    const publishBtn = document.getElementById('publish-post-btn');
    
    // Enable publish button if there's content
    if (publishBtn) {
      publishBtn.disabled = content.trim().length === 0 || !this.isAuthenticated;
    }
    
    // Emit typing indicator (handled by LiveForumManager)
    if (window.liveForumManager) {
      window.liveForumManager.handleTyping(content.length > 0);
    }
  }

  /**
   * Handle composer keydown events
   */
  handleComposerKeydown(event) {
    // Submit with Ctrl/Cmd + Enter
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.handlePublishPost();
    }
  }

  /**
   * Handle publish post button click
   */
  async handlePublishPost(event) {
    if (!this.isAuthenticated) {
      this.showError('Please sign in to post');
      return;}
    
    event.preventDefault();
    
    const textarea = document.getElementById('composer-textarea');
    const titleInput = document.getElementById('composer-title');
    const categorySelect = document.getElementById('composer-category');
    const publishBtn = document.getElementById('publish-post-btn');
    
    if (!textarea || !publishBtn || !titleInput || !categorySelect) return;const content = textarea.value.trim();
    const title = (titleInput.value || '').trim();
    const category = categorySelect.value;
    // Reset field styles
    const clearError = (el) => { el.style.borderColor = ''; el.style.boxShadow = ''; };
    [titleInput, categorySelect, textarea].forEach(clearError);

    // Validate required fields with friendly reminder
    const missing = [];
    if (!title) { missing.push('Title'); titleInput.style.borderColor = '#dc3545'; titleInput.style.boxShadow = '0 0 0 3px rgba(220,53,69,0.2)'; }
    if (!category) { missing.push('Category'); categorySelect.style.borderColor = '#dc3545'; categorySelect.style.boxShadow = '0 0 0 3px rgba(220,53,69,0.2)'; }
    if (!content && !this.pendingPollData) { missing.push('Content or Poll'); textarea.style.borderColor = '#dc3545'; textarea.style.boxShadow = '0 0 0 3px rgba(220,53,69,0.2)'; }
    if (missing.length) {
      this.showError(`Please double-check: ${missing.join(', ')}`);
      // Focus the first missing field
      if (!title) titleInput.focus();
      else if (!category) categorySelect.focus();
      else textarea.focus();
      return;}
    
    // Disable button and show loading
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
    
    try {
      // Create new forum topic with current game type
      
      const postData = {
        title,
        category, // 'content' | 'strategy'
        content: content || '',
        gameType: this.currentGame,
      };
      
      // Add poll data if available
      if (this.pendingPollData) {
        postData.poll = this.pendingPollData;
      }
      
      // Create new forum topic
      const newPost = await this.apiClient.createForumThread(postData);
      
      // Ensure poll data is included in the new post
      if (this.pendingPollData && !newPost.poll) {
        newPost.poll = this.pendingPollData;
      }
      
      // Convert server response to frontend format if needed
      const formattedPost = {
        _id: newPost._id,
        title: newPost.title,
        content: newPost.content,
        author: {
          username: newPost.author?.username || this.currentUser.username,
          displayName: newPost.author?.username || this.currentUser.username,
          avatar: newPost.author?.avatar || this.currentUser.avatar || '/assets/img/default-avatar.svg'
        },
        gameType: newPost.gameType || this.currentGame,
        createdAt: newPost.createdAt,
        reactions: { like: 0, celebrate: 0 }, // New post starts with no reactions
        userReaction: null,
        commentsCount: 0, // New post starts with no comments
        isLive: false,
        viewCount: 0,
        poll: newPost.poll || null
      };
      
      // Add to posts list and refresh
      this.addPostToFeed(formattedPost, true);
      
      // Clear textarea
      textarea.value = '';
      
      // Clear pending poll data
      this.pendingPollData = null;
      this.showPollIndicator();
      
      // Re-enable button
      publishBtn.disabled = false;
      publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish';
      
      // Update composer state
      const charCount = document.getElementById('char-count');
      if (charCount) charCount.textContent = '0/500';
      titleInput.value = '';
      categorySelect.value = '';
      
      // Update forum stats
      this.updateForumStats();
      
      // Hide composer and show create button again
      this.hidePostComposer();
      
      this.showSuccess('Post published successfully!');
      
    } catch (error) {
      console.error('Failed to publish post:', error);
      this.showError('Failed to publish post. Please try again.');
      
      // Re-enable button
      publishBtn.disabled = false;
      publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish';
    }
  }

  /**
   * Load posts from the API
   */
  async loadPosts(limit = 20, offset = 0) {
    try {
      const loadingElement = document.getElementById('loading-posts');
      const postsFeed = document.getElementById('posts-feed');
      
      if (loadingElement) loadingElement.classList.remove('hidden');
      
      let posts = [];
      
      if (this.currentGame === 'clan') {
        // Clan-specific posts
        if (!this.clanId) {
          const emptyStateHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">
                <i class="fas fa-users"></i>
              </div>
              <h3 class="empty-state-title">No Clan Found</h3>
              <p class="empty-state-message">You need to be in a clan to view clan posts.</p>
              <div class="empty-state-actions">
                <button class="btn btn-primary" onclick="window.location.href='/views/townhall.html'">
                  <i class="fas fa-users"></i> Visit Clan Encampment
                </button>
                <button class="btn btn-secondary" onclick="window.location.href='/views/stone-tablet.html'">
                  <i class="fas fa-comments"></i> Browse Community Forum
                </button>
              </div>
            </div>
          `;
          postsFeed.innerHTML = emptyStateHTML;
          return;}
        
        // Load clan-specific posts
        const topics = await this.apiClient.getForumThreads({ 
          clanId: this.clanId, 
          limit: limit, 
          offset: offset 
        });
        posts = topics.map(topic => ({
          ...topic,
          game: 'clan',
          clanId: this.clanId
        }));
        
        // Removed clan header banner per user request
      } else if (this.currentGame === 'tournaments') {
        // Automated feed: announcements and results (no manual posts)
        const topics = await this.apiClient.getForumThreads({ 
          gameType: 'tournaments', 
          limit: limit, 
          offset: offset 
        });
        posts = topics;
        // Ensure posts are marked read-only and categorized (announcement/result)
        posts = posts.map(p => ({ ...p, readOnly: true, category: p.category || 'announcement', gameType: 'tournaments' }));
      } else {
        // Load regular game posts with game and category filters
        const params = { 
          game: this.currentGame, 
          limit: limit, 
          offset: offset 
        };
        if (this.currentCategoryFilter && this.currentCategoryFilter !== 'all') {
          params.category = this.currentCategoryFilter;
        }
        posts = await this.apiClient.getForumThreads(params);
        
        // No-op: clan header removed
      }
      
      // Use server-filtered posts as-is
      this.posts = posts;
      this.renderAllPosts();
      // Apply category filter if set
      this.applyCategoryFilter();
      
    } catch (error) {
      console.error('Failed to load posts:', error);
      this.showError('Failed to load posts. Please try again.');
    } finally {
      const loadingElement = document.getElementById('loading-posts');
      if (loadingElement) loadingElement.classList.add('hidden');
    }
  }

  /**
   * Apply category filter to currently loaded posts (client-side)
   */
  applyCategoryFilter() {
    // Allow filtering in tournaments view as well
    const active = document.querySelector('.category-filters .game-tab.active');
    const filter = active ? active.dataset.category : 'all';
    const postsFeed = document.getElementById('posts-feed');
    if (!postsFeed) return;postsFeed.querySelectorAll('[data-post-id]')?.forEach((el) => {
      const cat = el.getAttribute('data-category') || 'content';
      el.style.display = (filter === 'all' || filter === cat) ? '' : 'none';
    });
  }

  /**
   * Render all posts in the feed
   */
  renderAllPosts() {
    const postsContainer = document.getElementById('posts-feed');
    if (!postsContainer) return;postsContainer.innerHTML = '';
    
    // Hide loading indicator
    const loadingElement = document.getElementById('loading-posts');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }

    if (this.posts.length === 0) {
      postsContainer.innerHTML = this.getEmptyStateHTML();
      return;}

    // Add all posts and set up their event listeners
    this.posts.forEach(post => {
      const postElement = this.createPostElement(post);
      // Ensure replies are hidden by default on render
      const repliesSection = postElement.querySelector('.post-replies-section');
      if (repliesSection) {
        repliesSection.style.display = 'none';
        repliesSection.dataset.loaded = '';
      }
      postsContainer.appendChild(postElement);
      // Set up event listeners for each post
      this.setupPostEventListeners(postElement);
    });
  }

  /**
   * Add a single post to the feed
   */
  addPostToFeed(post, isNew = false) {
    const postsContainer = document.getElementById('posts-feed');
    if (!postsContainer) return;const emptyState = postsContainer.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    const postElement = this.createPostElement(post);
    // Ensure replies are hidden by default on insertion
    const repliesSection = postElement.querySelector('.post-replies-section');
    if (repliesSection) {
      repliesSection.style.display = 'none';
      repliesSection.dataset.loaded = '';
    }
    
    if (isNew) {
      postElement.classList.add('new-post');
      // Add to the beginning of posts array
      this.posts.unshift(post);
      postsContainer.insertBefore(postElement, postsContainer.firstChild);
    } else {
      // Add to the end of posts array
      this.posts.push(post);
      postsContainer.appendChild(postElement);
    }

    // CRITICAL FIX: Always set up event listeners for new posts
    this.setupPostEventListeners(postElement);
  }

  /**
   * Create HTML element for a post
   */
  createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-card';
    postDiv.dataset.postId = post._id;
    if (post.category) postDiv.dataset.category = post.category;
    if (post.gameType) postDiv.dataset.gameType = post.gameType;
    
    const timeAgo = this.getTimeAgo(post.createdAt);
    const gameConfig = this.gameConfigs[post.gameType] || this.gameConfigs[this.currentGame] || this.gameConfigs.wc2;
    const categoryBadge = post.gameType === 'tournaments'
      ? `<span class="post-category-badge ${post.category || 'announcement'}"><i class="fas ${post.category === 'result' ? 'fa-flag-checkered' : 'fa-bullhorn'}"></i> ${post.category === 'result' ? 'Results' : 'Announcement'}</span>`
      : (post.category ? `<span class="post-category-badge ${post.category}"><i class="fas ${post.category === 'strategy' ? 'fa-chess-knight' : 'fa-photo-video'}"></i> ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</span>` : '');
    
    postDiv.innerHTML = `
      ${post.title ? `<div class="post-title-prominent">${post.title}</div>` : ''}
      
      <div class="post-header">
        <img src="${post.author.avatar || '/assets/img/default-avatar.svg'}" 
             alt="${post.author.username}'s Avatar" 
             class="post-avatar">
        <div class="post-author-info">
          <div class="post-author-name">${post.author.displayName || post.author.username}</div>
          <div class="post-meta">
            <span class="post-game-tag">${gameConfig.name}</span>
            ${categoryBadge}
            <span class="post-time" title="${new Date(post.createdAt).toLocaleString()}">
              ${timeAgo}
            </span>
            ${post.isLive ? '<span class="post-live-indicator"><span class="post-live-dot"></span>Live</span>' : ''}
          </div>
        </div>
        ${(this.isAuthenticated && this.currentUser && post.author.username === this.currentUser.username && post.gameType !== 'tournaments' && !post.readOnly) ? `
          <div class="post-actions-header">
            <button class="delete-post-btn" data-post-id="${post._id}" title="Delete Post">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        ` : ''}
      </div>
      
      <div class="post-content">
        ${this.formatPostContent(post.content)}
      </div>
      
      ${post.poll && post.poll.question ? this.renderPollElement(post.poll, post._id) : ''}
      
      <div class="post-actions">
        <div class="post-reactions">
          <button class="reaction-btn like ${post.userReaction === 'like' ? 'active' : ''}" 
                  data-reaction="like" data-post-id="${post._id}">
            <i class="fas fa-thumbs-up"></i>
            <span>${post.reactions?.like || 0}</span>
          </button>
          <button class="reaction-btn celebrate ${post.userReaction === 'celebrate' ? 'active' : ''}" 
                  data-reaction="celebrate" data-post-id="${post._id}">
            <i class="fas fa-trophy"></i>
            <span>${post.reactions?.celebrate || 0}</span>
          </button>
          <button class="reaction-btn comment view-replies-btn" data-post-id="${post._id}">
            <i class="fas fa-comment"></i>
            <span class="replies-count">${post.commentsCount || 0}</span>
            <span class="view-replies-text">View Replies</span>
          </button>
          ${this.isAuthenticated ? `
            <button class="reaction-btn reply-btn" data-post-id="${post._id}">
              <i class="fas fa-reply"></i>
              <span>Reply</span>
            </button>
          ` : ''}
        </div>
        
        <div class="post-share">
          <button class="share-btn" data-post-id="${post._id}" title="Share Post">
            <i class="fas fa-share"></i>
          </button>
          <button class="share-btn" data-post-id="${post._id}" title="Bookmark">
            <i class="fas fa-bookmark"></i>
          </button>
        </div>
      </div>
      
      <!-- Inline Replies Section -->
      <div class="post-replies-section" data-post-id="${post._id}" style="display: none;">
        <div class="replies-container">
          <div class="replies-header">
            <h4>
              <i class="fas fa-reply"></i>
              <span class="replies-header-count">${post.commentsCount || 0}</span> Replies
            </h4>
          </div>
          
          <div class="replies-list"></div>
          
          ${this.isAuthenticated ? `
            <div class="inline-reply-composer">
              <div class="composer-header">
                <img src="${this.currentUser?.avatar || '/assets/img/default-avatar.svg'}" 
                     alt="Your Avatar" 
                     class="composer-avatar">
                <span class="composer-label">Add a Reply</span>
              </div>
              <div class="composer-body">
                <textarea class="reply-input" rows="10" placeholder="Share your thoughts on this post..." data-post-id="${post._id}"></textarea>
                <div class="composer-actions">
                  <button class="btn btn-primary submit-reply" data-post-id="${post._id}">
                    <i class="fas fa-paper-plane"></i>
                    Post Reply
                  </button>
                  <button class="btn btn-secondary cancel-reply" data-post-id="${post._id}">
                    <i class="fas fa-times"></i>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <div class="auth-prompt-inline">
              <p>
                <i class="fas fa-sign-in-alt"></i>
                <a href="/views/login.html">Sign in</a> to join the discussion
              </p>
            </div>
          `}
        </div>
      </div>
    `;
    
    return postDiv;}

  /**
   * Set up event listeners for post interactions
   */
  setupPostEventListeners(postElement) {
    // Reaction buttons
    postElement.querySelectorAll('.reaction-btn[data-reaction]').forEach(btn => {
      // Remove existing listeners to avoid duplicates
      btn.replaceWith(btn.cloneNode(true));
    });
    
    postElement.querySelectorAll('.reaction-btn[data-reaction]').forEach(btn => {
      btn.addEventListener('click', (e) => this.handlePostReaction(e));
    });
    
    // Share buttons
    postElement.querySelectorAll('.share-btn').forEach(btn => {
      // Remove existing listeners to avoid duplicates
      btn.replaceWith(btn.cloneNode(true));
    });
    
    postElement.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handlePostShare(e));
    });
    
    // View replies button - NEW INLINE FUNCTIONALITY
    const viewRepliesBtn = postElement.querySelector('.view-replies-btn');
    if (viewRepliesBtn) {
      // Remove existing listener to avoid duplicates
      const newViewRepliesBtn = viewRepliesBtn.cloneNode(true);
      viewRepliesBtn.parentNode.replaceChild(newViewRepliesBtn, viewRepliesBtn);
      
      // Add fresh event listener for inline replies
      newViewRepliesBtn.addEventListener('click', (e) => {
        console.log('🔥 View replies button clicked for post:', e.currentTarget.dataset.postId);
        this.toggleInlineReplies(e);
      });
    }
    
    // Submit reply button
    const submitReplyBtn = postElement.querySelector('.submit-reply');
    if (submitReplyBtn) {
      submitReplyBtn.replaceWith(submitReplyBtn.cloneNode(true));
      postElement.querySelector('.submit-reply')?.addEventListener('click', (e) => this.submitInlineReply(e));
    }
    
    // Cancel reply button
    const cancelReplyBtn = postElement.querySelector('.cancel-reply');
    if (cancelReplyBtn) {
      cancelReplyBtn.replaceWith(cancelReplyBtn.cloneNode(true));
      postElement.querySelector('.cancel-reply')?.addEventListener('click', (e) => this.cancelInlineReply(e));
    }
    
    // Reply input - handle keyboard shortcuts
    const replyInput = postElement.querySelector('.reply-input');
    if (replyInput) {
      replyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          this.submitInlineReply(e);
        }
        if (e.key === 'Escape') {
          this.cancelInlineReply(e);
        }
      });
    }
    
    // Delete post button
    const deleteBtn = postElement.querySelector('.delete-post-btn');
    if (deleteBtn) {
      deleteBtn.replaceWith(deleteBtn.cloneNode(true));
      postElement.querySelector('.delete-post-btn')?.addEventListener('click', (e) => this.handleDeletePost(e));
    }
    
    // Reply button
    const replyBtn = postElement.querySelector('.reply-btn');
    if (replyBtn) {
      replyBtn.replaceWith(replyBtn.cloneNode(true));
      postElement.querySelector('.reply-btn')?.addEventListener('click', (e) => this.handleQuickReply(e));
    }
    
    // Delete reply buttons (for replies shown inline)
    postElement.querySelectorAll('.delete-reply-btn').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
    
    postElement.querySelectorAll('.delete-reply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDeleteReply(e));
    });
    
    // Poll vote buttons
    this.setupPollEventListeners(postElement);
  }

  /**
   * Handle post reactions
   */
  async handlePostReaction(event) {
    if (!this.isAuthenticated) {
      this.showError('Please sign in to react to posts');
      return;}
    
    const button = event.currentTarget;
    const postId = button.dataset.postId;
    const reactionType = button.dataset.reaction;
    
    button.disabled = true;
    
    try {
      // Mock reaction update for now
      const post = this.posts.find(p => p._id === postId);
      if (post) {
        // Initialize reactions if undefined
        if (!post.reactions) {
          post.reactions = { like: 0, celebrate: 0 };
        }
        
        const isActive = button.classList.contains('active');
        
        if (isActive) {
          post.reactions[reactionType] = Math.max(0, (post.reactions[reactionType] || 0) - 1);
          post.userReaction = null;
        } else {
          post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
          post.userReaction = reactionType;
        }
        
        this.updatePostReactions(postId, post.reactions, post.userReaction);
      }
    } catch (error) {
      console.error('❌ Failed to react to post:', error);
      this.showError('Failed to react to post');
    } finally {
      button.disabled = false;
    }
  }

  /**
   * Update post reaction counts and states
   */
  updatePostReactions(postId, reactions, userReaction) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) return;postElement.querySelectorAll('.reaction-btn[data-reaction]').forEach(btn => {
      const reactionType = btn.dataset.reaction;
      const countSpan = btn.querySelector('span');
      
      // Update count
      if (countSpan) {
        countSpan.textContent = reactions[reactionType] || 0;
      }
      
      // Update active state
      btn.classList.toggle('active', userReaction === reactionType);
    });
  }

  /**
   * Handle post sharing
   */
  handlePostShare(event) {
    const postId = event.currentTarget.dataset.postId;
    const postUrl = `${window.location.origin}/forum?post=${postId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post on WC Arena',
        url: postUrl
      });
    } else {
      navigator.clipboard.writeText(postUrl).then(() => {
        this.showSuccess('Post URL copied to clipboard!');
      });
    }
  }

  /**
   * Handle quick reply - opens composer without expanding replies
   */
  async handleQuickReply(event) {
    const postId = event.currentTarget.dataset.postId;
    const postElement = event.currentTarget.closest('.post-card');
    const repliesSection = postElement.querySelector('.post-replies-section');
    
    if (!postId || !repliesSection) {
      this.showError('Invalid post ID');
      return;}

    // Show the replies section if not visible
    if (repliesSection.style.display === 'none') {
      repliesSection.style.display = 'block';
      
      // Apply the same smart loading logic as toggleInlineReplies
      if (!repliesSection.dataset.loaded) {
        const repliesCountElement = postElement.querySelector('.replies-count');
        const currentReplyCount = parseInt(repliesCountElement?.textContent || '0');
        const repliesList = repliesSection.querySelector('.replies-list');
        const repliesHeaderCount = repliesSection.querySelector('.replies-header-count');
        
        if (currentReplyCount === 0) {
          repliesList.innerHTML = `
            <div class="no-replies">
              <i class="fas fa-comment-slash"></i>
              <p>No replies yet. Be the first to share your thoughts!</p>
            </div>
          `;
          if (repliesHeaderCount) repliesHeaderCount.textContent = '0';
          repliesSection.dataset.loaded = 'true';
        } else {
          repliesList.innerHTML = `
            <div class="loading-replies">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Loading replies...</span>
            </div>
          `;
          await this.loadInlineReplies(postId, repliesSection);
        }
      }
    }
    
    // Focus on the reply input
    const replyInput = repliesSection.querySelector('.reply-input');
    if (replyInput) {
      replyInput.focus();
      replyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      this.showError('Please sign in to reply');
    }
  }

  /**
   * Handle post deletion
   */
  async handleDeletePost(event) {
    const postId = event.currentTarget.dataset.postId;
    const postElement = event.currentTarget.closest('.post-card');
    
    // Store button reference before async operation
    const deleteBtn = event.currentTarget;
    const originalHTML = deleteBtn ? deleteBtn.innerHTML : '';
    
    // Show custom confirmation modal instead of browser alert
    const confirmed = await this.showDeleteConfirmation();
    if (!confirmed) {
      return;}
    
    // Re-find the delete button after modal (in case DOM changed)
    let currentDeleteBtn = deleteBtn;
    if (!currentDeleteBtn || !currentDeleteBtn.parentNode) {
      // Try to find the button again using postId
      currentDeleteBtn = document.querySelector(`.delete-post-btn[data-post-id="${postId}"]`);
    }
    
    try {
      // Update button state if button still exists
      if (currentDeleteBtn && currentDeleteBtn.parentNode) {
        currentDeleteBtn.disabled = true;
        currentDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      }
      
      // Send delete request
      await this.apiClient.deleteForumThread(postId);
      
      // Remove post from UI with animation
      if (postElement && postElement.parentNode) {
        postElement.style.opacity = '0.5';
        postElement.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
          if (postElement.parentNode) {
            postElement.remove();
          }
          
          // Remove from posts array
          this.posts = this.posts.filter(post => post._id !== postId);
          
          // Update forum stats
          this.updateForumStats();
          
          this.showSuccess('Post deleted successfully');
        }, 300);
      }
      
    } catch (error) {
      console.error('Failed to delete post:', error);
      this.showError('Failed to delete post. Please try again.');
      
      // Restore button state if button still exists
      if (currentDeleteBtn && currentDeleteBtn.parentNode) {
        currentDeleteBtn.disabled = false;
        currentDeleteBtn.innerHTML = originalHTML;
      }
    }
  }

  /**
   * Show modern delete confirmation modal
   */
  showDeleteConfirmation() {
    return new Promise((resolve) => {
      // Create modal HTML
      const modalHTML = `
        <div class="modal modal-sm" id="delete-post-modal">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">
                <i class="fas fa-exclamation-triangle"></i>
                Confirm Deletion
              </h3>
              <button class="close-modal" data-action="cancel">×</button>
            </div>
            <div class="modal-body">
              <div class="delete-confirmation-content">
                <div class="warning-icon">
                  <i class="fas fa-trash-alt"></i>
                </div>
                <p class="warning-text">
                  Are you sure you want to delete this post? 
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-action="cancel">
                <i class="fas fa-times"></i>
                Cancel
              </button>
              <button class="btn btn-danger" data-action="confirm">
                <i class="fas fa-trash-alt"></i>
                Delete Post
              </button>
            </div>
          </div>
        </div>
      `;document.body.insertAdjacentHTML('beforeend', modalHTML);
      const modal = document.getElementById('delete-post-modal');
      
      // Add event listeners
      const handleModalAction = (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        
        if (action === 'confirm') {
          resolve(true);
        } else if (action === 'cancel') {
          resolve(false);
        }
        
        // Close and cleanup modal
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        setTimeout(() => {
          modal.remove();
        }, 300);
      };
      
      // Handle ESC key
      const handleEscKey = (event) => {
        if (event.key === 'Escape') {
          resolve(false);
          modal.classList.remove('show');
          document.body.classList.remove('modal-open');
          setTimeout(() => modal.remove(), 300);
          document.removeEventListener('keydown', handleEscKey);
        }
      };
      
      // Handle backdrop click
      const handleBackdropClick = (event) => {
        if (event.target === modal) {
          resolve(false);
          modal.classList.remove('show');
          document.body.classList.remove('modal-open');
          setTimeout(() => modal.remove(), 300);
        }
      };
      
      modal.addEventListener('click', handleModalAction);
      modal.addEventListener('click', handleBackdropClick);
      document.addEventListener('keydown', handleEscKey);
      
      // Show modal
      document.body.classList.add('modal-open');
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    });
  }

  /**
   * Handle reply deletion
   */
  async handleDeleteReply(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.isAuthenticated) {
      this.showError('Please sign in to delete replies');
      return;}
    
    const deleteBtn = event.currentTarget;
    if (!deleteBtn) {
      console.error('Delete button not found');
      return;}
    
    const replyId = deleteBtn.dataset.replyId;
    if (!replyId) {
      this.showError('Invalid reply ID');
      return;}
    
    // Show confirmation dialog
    const shouldDelete = await this.showDeleteReplyConfirmation();
    if (!shouldDelete) return;if (!deleteBtn || !deleteBtn.parentNode) {
      console.error('Delete button no longer exists in DOM');
      return;}
    
    const originalContent = deleteBtn.innerHTML;
    
    try {
      // Update button state
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      
      // Send delete request
      await this.apiClient.deleteForumPost(replyId);
      
      // Remove reply from DOM
      const replyElement = deleteBtn.closest('.reply-item');
      if (replyElement) {
        // Animate removal
        replyElement.style.opacity = '0';
        replyElement.style.transform = 'translateX(-100%)';
        
        setTimeout(() => {
          replyElement.remove();
          
          // Update reply count
          const postElement = deleteBtn.closest('.post-card');
          if (postElement) {
            const postId = postElement.dataset.postId;
            this.updateReplyCount(postId, -1);
            
            // Update replies header count
            const repliesSection = postElement.querySelector('.post-replies-section');
            if (repliesSection) {
              const repliesHeaderCount = repliesSection.querySelector('.replies-header-count');
              if (repliesHeaderCount) {
                const currentCount = parseInt(repliesHeaderCount.textContent) || 0;
                const newCount = Math.max(0, currentCount - 1);
                repliesHeaderCount.textContent = newCount;
                
                // Show "no replies" message if count reaches 0
                if (newCount === 0) {
                  const repliesList = repliesSection.querySelector('.replies-list');
                  if (repliesList && repliesList.children.length === 0) {
                    repliesList.innerHTML = `
                      <div class="no-replies">
                        <i class="fas fa-comments"></i>
                        <p>No replies yet. Be the first to join the discussion!</p>
                      </div>
                    `;
                  }
                }
              }
            }
          }
        }, 300);
      }
      
      this.showSuccess('Reply deleted successfully');
      
    } catch (error) {
      console.error('Failed to delete reply:', error);
      this.showError('Failed to delete reply. Please try again.');
      
      // Restore button state
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = originalContent;
    }
  }

  /**
   * Show delete reply confirmation dialog
   */
  showDeleteReplyConfirmation() {
    return new Promise((resolve) => {
      // Create modal HTML
      const modalHTML = `
        <div id="delete-reply-modal" class="modal-overlay">
          <div class="modal-content delete-modal">
            <div class="modal-header">
              <div class="warning-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <h3>Delete Reply</h3>
            </div>
            <div class="modal-body">
              <p>Are you sure you want to delete this reply? This action cannot be undone.</p>
            </div>
            <div class="modal-actions">
              <button class="btn btn-danger" data-action="confirm">
                <i class="fas fa-trash-alt"></i>
                Delete Reply
              </button>
              <button class="btn btn-secondary" data-action="cancel">
                <i class="fas fa-times"></i>
                Cancel
              </button>
            </div>
          </div>
        </div>
      `;document.body.insertAdjacentHTML('beforeend', modalHTML);
      const modal = document.getElementById('delete-reply-modal');
      
      // Force reflow and show modal
      modal.offsetHeight;
      modal.classList.add('show');
      
      // Handle modal actions
      const handleModalAction = (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action) {
          cleanup();
          resolve(action === 'confirm');
        }
      };
      
      // Handle ESC key
      const handleEscKey = (event) => {
        if (event.key === 'Escape') {
          cleanup();
          resolve(false);
        }
      };
      
      // Handle backdrop click
      const handleBackdropClick = (event) => {
        if (event.target === modal) {
          cleanup();
          resolve(false);
        }
      };
      
      // Cleanup function
      const cleanup = () => {
        modal.removeEventListener('click', handleModalAction);
        modal.removeEventListener('click', handleBackdropClick);
        document.removeEventListener('keydown', handleEscKey);
        modal.remove();
      };
      
      // Add event listeners
      modal.addEventListener('click', handleModalAction);
      modal.addEventListener('click', handleBackdropClick);
      document.addEventListener('keydown', handleEscKey);
    });
  }

  /**
   * Toggle inline replies section - NEW FUNCTIONALITY
   */
  async toggleInlineReplies(event) {
    const postId = event.currentTarget.dataset.postId;
    const postElement = event.currentTarget.closest('.post-card');
    const repliesSection = postElement.querySelector('.post-replies-section');
    const viewRepliesBtn = event.currentTarget;
    const viewRepliesText = viewRepliesBtn.querySelector('.view-replies-text');
    
    if (!postId || !repliesSection) {
      this.showError('Invalid post ID');
      return;}

    // Toggle visibility
    const isVisible = repliesSection.style.display !== 'none';
    
       if (isVisible) {
      // Hide replies
      repliesSection.style.display = 'none';
      viewRepliesText.textContent = 'View Replies';
      viewRepliesBtn.classList.remove('active');
    } else {
      // Show replies
      repliesSection.style.display = 'block';
      viewRepliesText.textContent = 'Hide Replies';
      viewRepliesBtn.classList.add('active');
      
      // Check if already loaded
      if (repliesSection.dataset.loaded) {
        return;}
      
      // Check current reply count - if 0, skip loading and show no replies immediately
      const repliesCountElement = postElement.querySelector('.replies-count');
      const currentReplyCount = parseInt(repliesCountElement?.textContent || '0');
      
      if (currentReplyCount === 0) {
        // Immediately show no replies state without loading
        const repliesList = repliesSection.querySelector('.replies-list');
        const repliesHeaderCount = repliesSection.querySelector('.replies-header-count');
        
        repliesList.innerHTML = `
          <div class="no-replies">
            <i class="fas fa-comment-slash"></i>
            <p>No replies yet. Be the first to share your thoughts!</p>
          </div>
        `;
        
        if (repliesHeaderCount) {
          repliesHeaderCount.textContent = '0';
        }
        
        // Mark as loaded to prevent future loading
        repliesSection.dataset.loaded = 'true';
      } else {
        // Load replies if there are some and not already loaded
        const repliesList = repliesSection.querySelector('.replies-list');
        
           // Show a lightweight loading indicator on demand
           repliesList.innerHTML = `
             <div class="loading-replies">
               <i class="fas fa-spinner fa-spin"></i>
               <span>Loading replies...</span>
             </div>
           `;
           await this.loadInlineReplies(postId, repliesSection);
      }
    }
  }

  /**
   * Load inline replies for a post
   */
  async loadInlineReplies(postId, repliesSection) {
    try {
      // Load topic and its replies
      const data = await this.apiClient.getForumThread(postId);
      const { topic, posts } = data;
      
      const repliesList = repliesSection.querySelector('.replies-list');
      const repliesHeaderCount = repliesSection.querySelector('.replies-header-count');
      
      // Update replies count in header
      if (repliesHeaderCount) {
        repliesHeaderCount.textContent = posts.length;
      }
      
      // Render replies
      if (posts.length === 0) {
        repliesList.innerHTML = `
          <div class="no-replies">
            <i class="fas fa-comment-slash"></i>
            <p>No replies yet. Be the first to share your thoughts!</p>
          </div>
        `;
      } else {
        const repliesHTML = posts.map(post => this.createReplyElement(post)).join('');
        repliesList.innerHTML = repliesHTML;
        
        // Set up event listeners for delete buttons with error handling
        repliesList.querySelectorAll('.delete-reply-btn').forEach(btn => {
          // Remove any existing listeners to prevent duplicates
          btn.removeEventListener('click', this.handleDeleteReply);
          // Add new listener with proper binding
          btn.addEventListener('click', (e) => {
            try {
              this.handleDeleteReply(e);
            } catch (error) {
              console.error('Error in delete reply handler:', error);
              this.showError('Failed to delete reply. Please try again.');
            }
          });
        });
      }
      
      // Mark as loaded
      repliesSection.dataset.loaded = 'true';
      
    } catch (error) {
      console.error('Failed to load replies:', error);
      
      const repliesList = repliesSection.querySelector('.replies-list');
      repliesList.innerHTML = `
        <div class="error-loading-replies">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load replies. <button onclick="this.closest('.post-replies-section').dataset.loaded=''; location.reload();">Try again</button></p>
        </div>
      `;
    }
  }

  /**
   * Create a reply element for inline display
   */
  createReplyElement(reply) {
    const timeAgo = this.getTimeAgo(reply.createdAt);
    const isOwner = this.isAuthenticated && this.currentUser && (reply.author._id === this.currentUser.id || reply.author.username === this.currentUser.username);
    
    return `
      <div class="reply-item" data-reply-id="${reply._id}">
        <div class="reply-header">
          <img src="${reply.author.avatar || '/assets/img/default-avatar.svg'}" 
               alt="${reply.author.username}" 
               class="reply-avatar">
          <div class="reply-meta">
            <span class="reply-author">${reply.author.displayName || reply.author.username}</span>
            <span class="reply-time" title="${new Date(reply.createdAt).toLocaleString()}">
              ${timeAgo}
            </span>
          </div>
          ${isOwner ? `
            <div class="reply-actions">
              <button class="delete-reply-btn" data-reply-id="${reply._id}" title="Delete reply">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          ` : ''}
        </div>
        <div class="reply-content">${this.formatPostContent(reply.content)}</div>
      </div>
    `;}

  /**
   * Submit inline reply
   */
  async submitInlineReply(event) {
    event.preventDefault();
    
    if (!this.isAuthenticated) {
      this.showError('Please sign in to reply');
      return;}
    
    const postId = event.currentTarget.dataset.postId;
    const postElement = event.currentTarget.closest('.post-card');
    const replyInput = postElement.querySelector('.reply-input');
    const content = replyInput.value.trim();
    
    if (!content) {
      this.showError('Please enter a reply');
      replyInput.focus();
      return;}
    
    const submitBtn = event.currentTarget;
    const originalText = submitBtn.innerHTML;
    
    try {
      // Update button state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
      
      // Submit reply - FIX: Use topicId instead of parentTopicId
      const newReply = await this.apiClient.createForumPost(postId, {
        content: content,
        gameType: this.currentGame
      });
      
      // Add reply to the list
      this.addReplyToPost(postId, newReply);
      
      // Clear the input
      replyInput.value = '';
      
      // Update reply count in the main button
      this.updateReplyCount(postId, 1);
      
      this.showSuccess('Reply posted successfully!');
      
    } catch (error) {
      console.error('❌ Failed to post reply:', error);
      this.showError('Failed to post reply. Please try again.');
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }

  /**
   * Cancel inline reply
   */
  cancelInlineReply(event) {
    const postElement = event.currentTarget.closest('.post-card');
    const replyInput = postElement.querySelector('.reply-input');
    const repliesSection = postElement.querySelector('.post-replies-section');
    const viewRepliesBtn = postElement.querySelector('.view-replies-btn');
    const viewRepliesText = viewRepliesBtn.querySelector('.view-replies-text');
    
    // Clear input
    replyInput.value = '';
    
    // Hide replies section
    repliesSection.style.display = 'none';
    viewRepliesText.textContent = 'View Replies';
    viewRepliesBtn.classList.remove('active');
  }

  /**
   * Add a new reply to the post's inline replies
   */
  addReplyToPost(postId, reply) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) return;const repliesSection = postElement.querySelector('.post-replies-section');
    const repliesList = repliesSection.querySelector('.replies-list');
    
    // Remove "no replies" message if it exists
    const noRepliesElement = repliesList.querySelector('.no-replies');
    if (noRepliesElement) {
      noRepliesElement.remove();
    }
    
    // Add new reply to the top of the list
    const replyHTML = this.createReplyElement(reply);
    repliesList.insertAdjacentHTML('afterbegin', replyHTML);
    
    // Update the replies header count
    const repliesHeaderCount = repliesSection.querySelector('.replies-header-count');
    if (repliesHeaderCount) {
      const currentCount = parseInt(repliesHeaderCount.textContent) || 0;
      repliesHeaderCount.textContent = currentCount + 1;
    }
    
    // Highlight the new reply briefly
    const newReplyElement = repliesList.querySelector('.reply-item');
    if (newReplyElement) {
      newReplyElement.classList.add('new-reply');
      setTimeout(() => {
        newReplyElement.classList.remove('new-reply');
      }, 3000);
      
      // Add event listeners to delete button if present
      const deleteBtn = newReplyElement.querySelector('.delete-reply-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          try {
            this.handleDeleteReply(e);
          } catch (error) {
            console.error('❌ Error in delete reply handler:', error);
            this.showError('Failed to delete reply. Please try again.');
          }
        });
      }
    }
  }

  /**
   * Update reply count in the main post button
   */
  updateReplyCount(postId, increment) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) return;const repliesCountElement = postElement.querySelector('.replies-count');
    if (repliesCountElement) {
      const currentCount = parseInt(repliesCountElement.textContent) || 0;
      repliesCountElement.textContent = currentCount + increment;
    }
  }

  /**
   * Handle image upload
   */
  handleImageUpload() {
    if (!this.isAuthenticated) {
      this.showError('Please sign in to upload images');
      return;}
    
    document.getElementById('image-upload')?.click();
  }

  /**
   * Handle video embed (no uploads)
   */
  handleVideoEmbed() {
    if (!this.isAuthenticated) {
      this.showError('Please sign in to embed videos');
      return;}
    
    // Show video embed dialog instead of upload
    this.showVideoEmbedDialog();
  }

  /**
   * Handle file selection (images only)
   */
  async handleFileSelected(event, type) {
    const file = event.target.files[0];
    if (!file) return;if (type !== 'image') {
      this.showError('Only image uploads are supported. Use the video button to embed videos.');
      return;}
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.showError('File size must be less than 10MB');
      return;}
    
    // TODO: Implement image upload to server
    console.log(`Uploading ${type}:`, file.name);
    this.showSuccess(`${type} upload feature coming soon!`);
  }

          /**
     * Handle create poll
     */
    handleCreatePoll() {
        if (!this.isAuthenticated) {
            this.showError('Please sign in to create polls');
            return;}

        // Show poll creation modal
        this.showPollCreationModal();
    }

    /**
     * Set up poll creator
     */
    setupPollCreator() {
        console.log('🗳️ Setting up poll creator...');
        
        // Initialize poll creator
        this.pollCreator.init();
        
        // Listen for poll creation events
        document.addEventListener('pollCreated', (event) => {
            this.handlePollCreated(event.detail);
        });
        
        console.log('✅ Poll creator set up successfully');
    }

    /**
     * Show poll creation modal
     */
    showPollCreationModal() {
        console.log('🗳️ Showing poll creation modal...');
        this.pollCreator.show();
    }

    /**
     * Handle poll creation
     */
    handlePollCreated(pollData) {
        console.log('📊 Poll created:', pollData);
        
        // Store poll data for the next post
        this.pendingPollData = pollData;
        
        // Show success message
        this.showSuccess('Poll created! Now create your post to attach it.');
        
        // Show post composer with poll indicator
        this.showPostComposer();
        this.showPollIndicator();
    }

    /**
     * Show poll indicator in composer
     */
    showPollIndicator() {
        const composer = document.getElementById('post-composer');
        if (!composer) {
            console.warn('Composer not found when trying to show poll indicator');
            return;}
        
        // Create poll indicator if it doesn't exist
        let pollIndicator = document.getElementById('poll-indicator');
        if (!pollIndicator) {
            pollIndicator = document.createElement('div');
            pollIndicator.id = 'poll-indicator';
            pollIndicator.className = 'poll-indicator';
            
            // Insert after composer-header, before composer-actions
            const composerHeader = composer.querySelector('.composer-header');
            const composerActions = composer.querySelector('.composer-actions');
            
            if (composerHeader && composerActions) {
                composer.insertBefore(pollIndicator, composerActions);
                console.log('✅ Poll indicator created and inserted');
            } else {
                console.warn('Could not find composer structure for poll indicator');
                return;}
        }
        
        if (this.pendingPollData) {
            const optionsHTML = this.pendingPollData.options.map((option, index) => 
                `<div class="poll-preview-option">
                    <i class="fas fa-circle" style="font-size: 0.7rem; opacity: 0.6;"></i>
                    <span>${option}</span>
                </div>`
            ).join('');
            
            const expirationText = this.pendingPollData.expiresIn 
                ? `<div class="poll-preview-expiry">
                     <i class="fas fa-clock"></i>
                     Expires in ${this.pendingPollData.expiresIn} hour${this.pendingPollData.expiresIn !== 1 ? 's' : ''}
                   </div>`
                : '';
            
            pollIndicator.innerHTML = `
                <div class="poll-preview-container">
                    <div class="poll-preview-header">
                        <div class="poll-preview-title">
                            <i class="fas fa-poll"></i>
                            <span>${this.pendingPollData.question}</span>
                        </div>
                        <button class="poll-remove-btn" onclick="window.forumCore.removePendingPoll()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="poll-preview-options">
                        ${optionsHTML}
                    </div>
                    ${expirationText}
                </div>
            `;
            pollIndicator.style.display = 'block';
        } else {
            pollIndicator.style.display = 'none';
        }
    }

    /**
     * Remove pending poll
     */
    removePendingPoll() {
        this.pendingPollData = null;
        this.showPollIndicator();
        this.showSuccess('Poll removed from post');
    }

    /**
     * Render poll element
     */
    renderPollElement(poll, postId) {
        const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
        const hasVoted = poll.hasVoted || false;
        const isExpired = poll.expiresAt && new Date() > new Date(poll.expiresAt);
        
        const optionsHTML = poll.options.map(option => {
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const isUserVote = poll.userVote === option.value;
            
            return `
                <div class="poll-option ${isExpired ? 'expired' : 'clickable'} ${isUserVote ? 'user-vote' : ''}" 
                     data-post-id="${postId}" 
                     data-option="${option.value}"
                     ${!isExpired ? 'style="cursor: pointer;"' : ''}>
                    <div class="poll-option-main">
                        <div class="poll-option-text">${option.value}</div>
                        <div class="poll-option-status">
                            ${isUserVote ? 
                                '<span class="vote-status voted"><i class="fas fa-check-circle"></i> Voted for</span>' : 
                                (!isExpired ? '<span class="vote-status votable"><i class="fas fa-vote-yea"></i> Vote</span>' : '')
                            }
                        </div>
                    </div>
                    <div class="poll-option-stats">
                        <div class="poll-option-votes">
                            ${option.votes} vote${option.votes !== 1 ? 's' : ''}
                            ${hasVoted || isExpired ? ` (${percentage}%)` : ''}
                        </div>
                        ${hasVoted || isExpired ? `
                            <div class="poll-option-bar">
                                <div class="poll-option-fill" style="width: ${percentage}%"></div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        const expirationHTML = poll.expiresAt ? `
            <div class="poll-expiration">
                <i class="fas fa-clock"></i>
                ${isExpired ? 'Poll expired' : `Expires ${this.getTimeAgo(poll.expiresAt)}`}
            </div>
        ` : '';
        
        return `
            <div class="poll-container" data-post-id="${postId}">
                <div class="poll-header">
                    <div class="poll-question">
                        <i class="fas fa-poll"></i>
                        ${poll.question}
                    </div>
                    ${expirationHTML}
                </div>
                <div class="poll-options">
                    ${optionsHTML}
                </div>
                <div class="poll-stats">
                    <span class="poll-total-votes">
                        <i class="fas fa-users"></i>
                        ${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}
                    </span>
                    ${hasVoted ? `
                        <span class="poll-voted-indicator">
                            <i class="fas fa-check-circle"></i>
                            You voted
                        </span>
                    ` : ''}
                </div>
            </div>
        `;}

    /**
     * Handle poll vote
     */
    async handlePollVote(event) {
        if (!this.isAuthenticated) {
            this.showError('Please sign in to vote');
            return;}
        
        const pollOption = event.currentTarget;
        const postId = pollOption.dataset.postId;
        const option = pollOption.dataset.option;
        
        if (!postId || !option) {
            console.error('Missing poll vote data');
            return;}
        
        // Allow users to change their vote by clicking on a different option
        // No need to prevent clicking on the same option - backend will handle this gracefully
        
        try {
            // Show loading state on all poll options
            const pollContainer = pollOption.closest('.poll-container');
            const allOptions = pollContainer.querySelectorAll('.poll-option.clickable');
            allOptions.forEach(opt => {
                opt.style.pointerEvents = 'none';
                const status = opt.querySelector('.vote-status');
                if (status) {
                    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Voting...';
                }
            });
            
            const result = await this.apiClient.voteOnPoll(postId, { option });
            
            // Check if this was a vote change before updating the display
            const hadPreviousVote = pollContainer.querySelector('.poll-option.user-vote') !== null;
            
            // Update the poll display
            this.updatePollDisplay(postId, result.poll);
            
            // Show appropriate success message
            this.showSuccess(hadPreviousVote ? 'Vote changed successfully!' : 'Vote recorded successfully!');
            
        } catch (error) {
            console.error('Failed to vote on poll:', error);
            this.showError(error.message || 'Failed to vote. Please try again.');
            
            // Restore original state on error
            const pollContainer = pollOption.closest('.poll-container');
            const allOptions = pollContainer.querySelectorAll('.poll-option.clickable');
            allOptions.forEach(opt => {
                opt.style.pointerEvents = 'auto';
                const status = opt.querySelector('.vote-status');
                const isUserVote = opt.classList.contains('user-vote');
                if (status) {
                    status.innerHTML = isUserVote ? 
                        '<i class="fas fa-check-circle"></i> Voted for' :
                        '<i class="fas fa-vote-yea"></i> Vote';
                }
            });
        }
    }

    /**
     * Update poll display after voting
     */
    updatePollDisplay(postId, pollData) {
        const pollContainer = document.querySelector(`.poll-container[data-post-id="${postId}"]`);
        if (!pollContainer) return;const postElement = pollContainer.closest('.post-card');
        if (!postElement) return;const post = this.posts.find(p => p._id === postId);
        if (post) {
            post.poll = pollData;
        }
        
        // Re-render the poll
        const newPollHTML = this.renderPollElement(pollData, postId);
        pollContainer.outerHTML = newPollHTML;
        
        // Re-attach event listeners for the new poll
        this.setupPollEventListeners(postElement);
    }

    /**
     * Setup poll event listeners
     */
    setupPollEventListeners(postElement) {
        const pollOptions = postElement.querySelectorAll('.poll-option.clickable');
        pollOptions.forEach(option => {
            option.addEventListener('click', (e) => this.handlePollVote(e));
        });
    }

  /**
   * Handle emoji picker
   */
  async handleEmojiPicker() {
    console.log('🎭 Opening emoji picker for forum...');
    
    if (!this.isAuthenticated) {
      this.showError('Please sign in to use emojis');
      return;}
    
    try {
              // Load owned emojis and shop data if not already loaded
        if (this.emojiPicker.ownedEmojis.length === 0) {
          console.log('🎭 Loading owned emojis...');
          await this.emojiPicker.loadOwnedEmojis();
        }
        
        // Also load shop data to get arena gold balance
        if (this.emojiPicker.userArenaGold === 0) {
          console.log('🎭 Loading shop data for arena gold...');
          await this.emojiPicker.loadShopData();
        }
      
      // Override the emoji picker's chat input element to use composer textarea
      const textarea = document.getElementById('composer-textarea');
      if (textarea) {
        this.emojiPicker.chatInputElement = textarea;
        this.emojiPicker.savedCursorPosition = textarea.selectionStart || textarea.value.length;
        
        // Toggle the emoji picker
        await this.emojiPicker.togglePicker();
        
        // Override the insertEmoji method to trigger input event for composer
        const originalInsertEmoji = this.emojiPicker.insertEmoji.bind(this.emojiPicker);
        this.emojiPicker.insertEmoji = (emojiId) => {
          originalInsertEmoji(emojiId);
          
          // Trigger input event to update button state
          const textarea = document.getElementById('composer-textarea');
          if (textarea) {
            textarea.dispatchEvent(new Event('input'));
          }
        };
      }
    } catch (error) {
      console.error('❌ Error opening emoji picker:', error);
      this.showError('Failed to load emoji picker. Please try again.');
    }
  }

  /**
   * Show notification method for EmojiPicker compatibility
   */
  showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    if (type === 'success') {
      this.showSuccess(message);
    } else if (type === 'error') {
      this.showError(message);
    } else {
      // For info and other types, just log for now - we have a generic notification method at the bottom
      console.log(`ℹ️ ${message}`);
    }
  }

  /**
   * Update forum statistics with real data
   */
  async updateForumStats() {
    try {
      // Get real stats from API for current game type
      const stats = await this.apiClient.getForumStats({ gameType: this.currentGame });
      
      const activePostsElement = document.getElementById('active-posts-count');
      const onlineUsersElement = document.getElementById('online-users-count');
      
      if (activePostsElement) {
        this.animateCounterUpdate(activePostsElement, stats.activePosts);
      }
      
      if (onlineUsersElement) {
        this.animateCounterUpdate(onlineUsersElement, stats.onlineUsers);
      }
      
      console.log(`✅ Forum stats updated for ${this.currentGame.toUpperCase()}:`, stats);
      
    } catch (error) {
      console.error('❌ Failed to update forum stats:', error);
      
      // Fallback to showing current post count
      const activePostsElement = document.getElementById('active-posts-count');
      if (activePostsElement && this.posts) {
        this.animateCounterUpdate(activePostsElement, this.posts.length);
      }
    }
  }

  /**
   * Update counter without animation (direct number display)
   */
  animateCounterUpdate(element, newValue) {
    // Simply set the value directly without animation
    element.textContent = newValue.toLocaleString();
  }

  /**
   * Format post content with YouTube embedding and basic markdown support
   */
  formatPostContent(content) {
    // First, apply basic markdown formatting
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    
    // Store YouTube URLs to process them separately
    const youtubeUrls = [];
    const youtubePattern = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?)/g;
    
    // Extract YouTube URLs first
    let match;
    while ((match = youtubePattern.exec(formatted)) !== null) {
      youtubeUrls.push({ url: match[0], videoId: match[2] });
    }
    
    // Replace YouTube URLs with embeds
    youtubeUrls.forEach(({ url, videoId }) => {
      formatted = formatted.replace(url, this.createYouTubeEmbed(videoId, url));
    });
    
    // Handle other non-YouTube links (but avoid URLs already in HTML attributes)
    // Split by HTML tags to avoid processing URLs inside attributes
    const parts = formatted.split(/(<[^>]*>)/);
    for (let i = 0; i < parts.length; i += 2) {
      // Only process text content (even indices), not HTML tags (odd indices)
      if (parts[i]) {
        parts[i] = parts[i].replace(
          /(https?:\/\/(?!(?:www\.)?(?:youtube\.com|youtu\.be))[^\s]+)/g,
          '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
      }
    }
    formatted = parts.join('');
    
    return formatted;}

  /**
   * Detect and embed YouTube videos
   */
  embedYouTubeVideos(content) {
    // YouTube URL patterns
    const youtubePatterns = [
      // Standard YouTube URLs
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
      // YouTube shortened URLs
      /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/g,
      // YouTube URLs with additional parameters
      /https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/g
    ];

    let processedContent = content;

    youtubePatterns.forEach(pattern => {
      processedContent = processedContent.replace(pattern, (match, videoId) => {
        return this.createYouTubeEmbed(videoId, match);});
    });

    return processedContent;}

  /**
   * Create YouTube embed HTML
   */
  createYouTubeEmbed(videoId, originalUrl) {
    return `<div class="youtube-embed">
        <iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0" frameborder="0" allow="accelerometer;autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" title="YouTube video player"></iframe>
        <a href="${originalUrl}" target="_blank" rel="noopener" class="youtube-link">
          <i class="fab fa-youtube"></i>
          Watch on YouTube
        </a>
      </div>`;
  }

  /**
   * Get time ago string
   */
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';if (minutes < 60) return `${minutes}m ago`;const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;return new Date(timestamp).toLocaleDateString();}

  /**
   * Get empty state HTML when no posts are available
   */
  getEmptyStateHTML() {
    const gameConfig = this.gameConfigs[this.currentGame];
    
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-scroll"></i>
        </div>
        <h3>No Posts Yet</h3>
        <p>Be the first to start a discussion in the ${gameConfig.name} community!</p>
        ${this.isAuthenticated ? `
          <button class="btn btn-primary" onclick="document.getElementById('composer-textarea').focus()">
            <i class="fas fa-edit"></i>
            Create First Post
          </button>
        ` : `
          <button class="btn btn-secondary" onclick="window.location.href='/views/login.html'">
            <i class="fas fa-sign-in-alt"></i>
            Sign In to Post
          </button>
        `}
      </div>
    `;}

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
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Show video embed dialog
   */
  showVideoEmbedDialog() {
    const modal = document.createElement('div');
    modal.className = 'video-embed-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <i class="fas fa-video"></i>
              Embed Video
            </h3>
            <button class="modal-close" onclick="this.closest('.video-embed-modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <p>Embed a video from YouTube, Twitch, or other platforms:</p>
            <input type="url" 
                   class="video-url-input" 
                   placeholder="https://www.youtube.com/watch?v=..." 
                   style="width: 100%; padding: 12px; margin: 16px 0; border: 1px solid #ddd; border-radius: 8px;">
            
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
              <button class="btn btn-secondary" onclick="this.closest('.video-embed-modal').remove()">
                Cancel
              </button>
              <button class="btn btn-primary embed-video-btn">
                <i class="fas fa-plus"></i>
                Embed Video
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const embedBtn = modal.querySelector('.embed-video-btn');
    const urlInput = modal.querySelector('.video-url-input');
    
    embedBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) {
        this.showError('Please enter a video URL');
        return;}
      
      // Add video URL to composer
      const textarea = document.getElementById('composer-textarea');
      if (textarea) {
        textarea.value += `\n\n🎥 ${url}\n\n`;
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
      }
      
      modal.remove();
      this.showSuccess('Video link added to your post!');
    });

    document.body.appendChild(modal);
    urlInput.focus();
  }

  /**
   * Load user's clan data for clan stone tablet
   */
  async loadUserClan() {
    try {
      console.log('🏕️ Loading user clan data for stone tablet...');
      
      const clans = await this.apiClient.getUserClan();
      if (clans && clans.length > 0) {
        const clan = clans[0]; // Get the first clan
        this.clanId = clan._id || clan.id;
        this.clanName = clan.name;
        console.log('✅ User clan loaded:', { clanId: this.clanId, clanName: this.clanName });
        return true;
      } else {
        console.log('⚠️ User has no clans');
        this.clanId = null;
        this.clanName = null;
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading user clan:', error);
      this.clanId = null;
      this.clanName = null;
      return false;
    }
  }
}

// Export for ES6 modules
export { ForumCore };

// Initialize global instance
window.ForumCore = ForumCore; 