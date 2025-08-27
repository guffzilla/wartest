/**
 * RedditFeedManager.js
 * Manages Reddit RSS feeds integration in the forum
 */

export class RedditFeedManager {
  constructor() {
    this.currentGameType = 'wc2';
    this.feedsContainer = null;
    this.refreshInterval = null;
    this.isLoading = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    console.log('🔥 RedditFeedManager initialized');
  }

  /**
   * Initialize the Reddit feed manager
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Reddit feeds...');
      
      // Wait for JWT token to be available
      if (window.location.search.includes('authToken=')) {
        console.log('🔄 RedditFeedManager: Waiting for JWT token to be processed...');
        await this.waitForAuthToken();
      }
      
      this.feedsContainer = document.getElementById('reddit-feeds');
      if (!this.feedsContainer) {
        console.error('❌ Reddit feeds container not found');
        return;}

      // Detect initial game type from active tab
      const activeTab = document.querySelector('.game-tab.active[data-game]');
      if (activeTab) {
        this.currentGameType = activeTab.getAttribute('data-game');
        console.log(`🎯 Detected initial game type: ${this.currentGameType}`);
      }

      // Load initial feeds
      await this.loadFeeds();

      // Set up auto-refresh every 10 minutes
      this.setupAutoRefresh();

      // Listen for game type changes
      this.setupGameTypeListener();

      console.log('✅ Reddit feeds initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing Reddit feeds:', error);
      this.showError('Failed to initialize Reddit feeds');
    }
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
        console.log('✅ RedditFeedManager: JWT token found in localStorage');
        return;}
      
      console.log(`⏳ RedditFeedManager: Waiting for JWT token... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.log('⚠️ RedditFeedManager: JWT token not found after waiting');
  }

  /**
   * Load Reddit feeds for current game type
   */
  async loadFeeds(gameType = this.currentGameType) {
    if (this.isLoading) return;this.isLoading = true;
    this.showLoading();

    try {
      console.log(`📡 Loading Reddit feeds for ${gameType}...`);
      
      const response = await (window.authenticatedFetch || fetch)(`/api/reddit/feeds/${gameType}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch Reddit feeds');
      }

      this.renderFeeds(data.data);
      this.retryCount = 0; // Reset retry count on success
      
      console.log(`✅ Loaded ${data.data.totalPosts} Reddit posts`);

    } catch (error) {
      console.error('❌ Error loading Reddit feeds:', error);
      
      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying Reddit feeds (${this.retryCount}/${this.maxRetries})...`);
        setTimeout(() => this.loadFeeds(gameType), 5000 * this.retryCount);
      } else {
        this.showError('Unable to load Reddit feeds. Please try again later.');
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Render Reddit feeds in the container
   */
  renderFeeds(feedData) {
    if (!feedData || !feedData.posts || feedData.posts.length === 0) {
      this.showEmpty();
      return;}

    const posts = feedData.posts.slice(0, 5); // Show top 5 posts
    
    const feedsHtml = posts.map(post => this.renderFeedItem(post)).join('');
    
    const html = `
      <div class="reddit-feeds-list">
        ${feedsHtml}
      </div>
      <div class="reddit-meta" style="margin-top: 12px; text-align: center;">
        <span style="font-size: 0.75rem; color: var(--neutral-500);">
          ${feedData.totalPosts} posts • Updated ${this.formatTime(feedData.lastUpdated)}
        </span>
        <button class="reddit-refresh" onclick="window.redditFeedManager?.manualRefresh()">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
    `;

    this.feedsContainer.innerHTML = html;
  }

  /**
   * Render a single Reddit feed item
   */
  renderFeedItem(post) {
    const timeAgo = this.getTimeAgo(post.date);
    const subredditDisplay = post.subreddit.replace(/^r\//, '');
    
    return `
      <div class="reddit-feed-item" onclick="window.open('${post.link}', '_blank')">
        <div class="reddit-title">${this.escapeHtml(post.title)}</div>
        <div class="reddit-meta">
          <span class="reddit-subreddit">r/${subredditDisplay}</span>
          <span class="reddit-author">by ${this.escapeHtml(post.author)}</span>
          <span class="reddit-time">${timeAgo}</span>
        </div>
        ${post.preview ? `<div class="reddit-preview">${this.escapeHtml(post.preview)}</div>` : ''}
      </div>
    `;}

  /**
   * Show loading state
   */
  showLoading() {
    if (this.feedsContainer) {
      this.feedsContainer.innerHTML = `
        <div class="reddit-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <span style="margin-left: 8px;">Loading Reddit feeds...</span>
        </div>
      `;
    }
  }

  /**
   * Show empty state
   */
  showEmpty() {
    if (this.feedsContainer) {
      this.feedsContainer.innerHTML = `
        <div class="reddit-loading">
          <i class="fab fa-reddit"></i>
          <span style="margin-left: 8px;">No Reddit posts found</span>
        </div>
      `;
    }
  }

  /**
   * Show error state
   */
  showError(message) {
    if (this.feedsContainer) {
      this.feedsContainer.innerHTML = `
        <div class="reddit-error">
          <i class="fas fa-exclamation-triangle"></i>
          <div style="margin-top: 8px;">${message}</div>
          <button class="reddit-refresh" onclick="window.redditFeedManager?.manualRefresh()" style="margin-top: 8px;">
            <i class="fas fa-sync-alt"></i> Try Again
          </button>
        </div>
      `;
    }
  }

  /**
   * Setup auto-refresh interval
   */
  setupAutoRefresh() {

    // Clear existing interval if any
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 10 minutes
    this.refreshInterval = setInterval(() => {
      if (!this.isLoading) {
        console.log('⏰ Auto-refreshing Reddit feeds...');
        this.loadFeeds();
      }
    }, 10 * 60 * 1000);

    console.log('✅ Auto-refresh enabled (10 minutes)');
  }

  /**
   * Setup game type change listener
   */
  setupGameTypeListener() {
    // Listen for game tab changes - more comprehensive selector
    document.addEventListener('click', (e) => {
      // Check if clicked element or its parent has game tab indicators
      const gameTab = e.target.closest('[data-game]') || 
                     e.target.closest('.game-tab') ||
                     e.target.closest('.tab-button') ||
                     e.target.closest('[data-tab]');
      
      if (gameTab) {
        // Try multiple attributes to get game type
        const gameType = gameTab.getAttribute('data-game') ||
                        gameTab.getAttribute('data-tab') ||
                        gameTab.getAttribute('data-type') ||
                        gameTab.textContent.toLowerCase().replace(/[^a-z0-9]/g, '');
                        
        // Map game types to our expected format
        let mappedGameType = gameType;
        if (gameType === 'wc1' || gameType === 'warcraft1' || gameType.includes('wc1')) {
          mappedGameType = 'wc1';
        } else if (gameType === 'wc2' || gameType === 'warcraft2' || gameType.includes('wc2')) {
          mappedGameType = 'wc2';
        } else if (gameType === 'wc3' || gameType === 'warcraft3' || gameType.includes('wc3')) {
          mappedGameType = 'wc3';
        }
        
        if (mappedGameType && mappedGameType !== this.currentGameType && ['wc1', 'wc2', 'wc3'].includes(mappedGameType)) {
          this.currentGameType = mappedGameType;
          console.log(`🎮 Game type changed to ${mappedGameType}, reloading Reddit feeds`);
          this.loadFeeds(mappedGameType);
        }
      }
    });
    
    console.log('✅ Game type listener setup complete');
  }

  /**
   * Manual refresh triggered by user
   */
  async manualRefresh() {
    console.log('👆 Manual refresh triggered');
    this.retryCount = 0; // Reset retry count
    await this.loadFeeds();
  }

  /**
   * Get time ago string
   */
  getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;return date.toLocaleDateString();}

  /**
   * Format time for display
   */
  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });}

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  /**
   * Cleanup when destroying the manager
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    console.log('🗑️ RedditFeedManager destroyed');
  }
} 