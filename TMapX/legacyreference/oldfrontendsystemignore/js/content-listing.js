/**
 * Content Creators Listing System
 * Handles the display and filtering of content creators
 * Optimized for performance and minimal dependencies
 */
import logger from '/js/utils/logger.js';

class ContentListingManager {
  constructor() {
    this.currentGame = 'wc12';
    this.currentPlatform = 'all';
    this.currentSort = 'default';
    this.channels = [];
    this.isLoaded = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.currentUser = null;
  }

  /**
   * Initialize the content listing system
   */
  async initialize() {
    if (this.isLoaded) {
          return;}


    await this.loadCurrentUser();
    this.setupEventListeners();
    this.setupClickableCards();
    await this.loadChannels();
    this.setupAutoRefresh();
    this.isLoaded = true;

  }

  /**
   * Load current user information
   */
  async loadCurrentUser() {
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      if (response.ok) {
        this.currentUser = await response.json();

      }
    } catch (error) {
      logger.error('Error loading current user:', error);
    }
  }

  /**
   * Set up event listeners for filters
   */
  setupEventListeners() {
    // Game filter buttons
    const gameButtons = document.querySelectorAll('.filter-btn[data-game]');
    gameButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleGameFilter(e.target.closest('.filter-btn'));
      });
    });

    // Platform filter buttons
    const platformButtons = document.querySelectorAll('.filter-btn[data-platform]');
    platformButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handlePlatformFilter(e.target.closest('.filter-btn'));
      });
    });

    // Sort filter buttons
    const sortButtons = document.querySelectorAll('.filter-btn[data-sort]');
    sortButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSortFilter(e.target.closest('.filter-btn'));
      });
    });
  }

  /**
   * Setup clickable behavior for channel cards
   */
  setupClickableCards() {
    // Use event delegation to handle dynamic content
    document.addEventListener('click', (e) => {
      const channelCard = e.target.closest('.channel-card');
      if (!channelCard) return;if (e.target.closest('.channel-rating') || 
          e.target.closest('.channel-actions') ||
          e.target.closest('a') ||
          e.target.closest('button')) {
        return;}
      
      // Find the channel link and open it
      const channelLink = channelCard.querySelector('.channel-link');
      if (channelLink && channelLink.href) {
        window.open(channelLink.href, '_blank', 'noopener,noreferrer');
      }
    });
  }

  /**
   * Handle game filter selection
   */
  async handleGameFilter(button) {
    const game = button.dataset.game;
    if (game === this.currentGame) return;document.querySelectorAll('.filter-btn[data-game]').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');

    this.currentGame = game;
    await this.loadChannels();
  }

  /**
   * Handle platform filter selection
   */
  handlePlatformFilter(button) {
    const platform = button.dataset.platform;
    if (platform === this.currentPlatform) return;document.querySelectorAll('.filter-btn[data-platform]').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');

    this.currentPlatform = platform;
    this.filterAndDisplayChannels();
  }

  /**
   * Handle sort filter selection
   */
  async handleSortFilter(button) {
    const sort = button.dataset.sort;
    if (sort === this.currentSort) return;document.querySelectorAll('.filter-btn[data-sort]').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');

    this.currentSort = sort;
    await this.loadChannels();
  }

  /**
   * Load channels from API
   */
  async loadChannels() {
    try {
  
      
      const params = new URLSearchParams({ game: this.currentGame });
      if (this.currentSort !== 'default') {
        params.set('sort', this.currentSort);
      }
      
      const response = await fetch(`/api/channels/all?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.status} ${response.statusText}`);
      }

      this.channels = await response.json();
      
      
      this.filterAndDisplayChannels();
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      logger.error('Error loading channels:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;

        setTimeout(() => this.loadChannels(), 1000 * this.retryCount);
      } else {
        this.showError('Failed to load content creators. Please refresh the page to try again.');
      }
    }
  }

  /**
   * Filter channels based on current platform selection and display them
   */
  filterAndDisplayChannels() {
    let filteredChannels = this.channels;

    // Filter by platform if not "all"
    if (this.currentPlatform !== 'all') {
      filteredChannels = this.channels.filter(channel => 
        channel.platform === this.currentPlatform
      );
    }

    
    
    this.displayChannels(filteredChannels);
    this.updateContentCount(filteredChannels.length);
  }

  /**
   * Display channels in the grid
   */
  displayChannels(channels) {
    const contentGrid = document.getElementById('content-grid');
    if (!contentGrid) return;if (channels.length === 0) {
      contentGrid.innerHTML = this.getNoChannelsHTML();
      return;}

    const channelsHTML = channels.map(channel => this.createChannelCard(channel)).join('');
    contentGrid.innerHTML = channelsHTML;
  }

  /**
   * Create HTML for a single channel card
   */
  createChannelCard(channel) {
    const platformIcon = channel.platform === 'youtube' ? 'fab fa-youtube' : 'fab fa-twitch';
    const platformColor = channel.platform === 'youtube' ? '#ff0000' : '#9146ff';
    
    // Live status detection - platform-specific only
    const isLive = (
      // For Twitch channels, only check Twitch-specific status
      (channel.platform === 'twitch' && channel.twitchIsLive === true) ||
      // For YouTube channels, only check YouTube-specific status  
      (channel.platform === 'youtube' && channel.youtubeIsLive === true)
    );

    
    const liveIndicator = isLive 
      ? `<div class="live-indicator pulsing">🔴 LIVE</div>` 
      : '';
    
    // Games handling - the backend API provides games array directly
    let games = channel.games || [];
    
    const gamesHTML = games && games.length > 0 ? games.map(game => {
      const label = game === 'wc12' ? 'WC I/II' : 'WC III';
      return `<span class="game-tag">${label}</span>`;}).join('') : `<span class="game-tag no-games">No games specified</span>`;
    
    // Description handling - backend provides description field  
    let description = channel.description || '';
    
    // Image handling - backend provides avatar and banner fields
    // Use platform-specific cached avatars if available, otherwise use main avatar
    let avatarSource = channel.avatar;
    if (channel.platform === 'youtube' && channel.youtubeAvatar) {
      avatarSource = channel.youtubeAvatar;
    } else if (channel.platform === 'twitch' && channel.twitchAvatar) {
      avatarSource = channel.twitchAvatar;
    }
    
    const avatarImage = this.getOptimizedImageUrl(
      avatarSource || channel.profileImage, 
      '/assets/img/ranks/emblem.png',
      '150x150'
    );
    
    const bannerImage = this.getOptimizedImageUrl(
      channel.banner || channel.thumbnailUrl, 
      channel.platform === 'youtube' ? '/assets/img/bgs/portal.png' : '/assets/img/bgs/featured.png',
      '400x120'
    );
    
    // URL generation - backend provides proper URL
    const channelUrl = channel.url || '#';
    
    // Rating handling
    const averageRating = channel.averageRating || 0;
    const ratingsCount = channel.ratingsCount || 0;
    const starsHTML = this.generateStarRating(averageRating);
    const ratingText = ratingsCount > 0 ? `${averageRating.toFixed(1)} (${ratingsCount} review${ratingsCount !== 1 ? 's' : ''})` : 'No ratings yet';
    
    // Check if user can rate (logged in and not own channel)
    const canRate = this.currentUser && this.currentUser.id !== channel.id;
    

    
    return `
      <div class="channel-card" data-platform="${channel.platform}" data-live="${isLive ? 'true' : 'false'}" data-creator-id="${channel.id}">
        ${liveIndicator}
        <div class="channel-banner">
          <img src="${bannerImage}" 
               alt="${this.escapeHtml(channel.name)} banner" 
               loading="lazy" 
               onerror="this.src='${channel.platform === 'youtube' ? '/assets/img/bgs/portal.png' : '/assets/img/bgs/featured.png'}';this.classList.add('error-fallback');">
        </div>
        <div class="channel-info">
          <div class="channel-avatar">
            <img src="${avatarImage}" 
                 alt="${this.escapeHtml(channel.name)}" 
                 loading="lazy" 
                 onerror="this.src='/assets/img/ranks/emblem.png'; this.classList.add('error-fallback');">
            <div class="platform-icon ${channel.platform}">
              <i class="${platformIcon}" style="color: ${platformColor}"></i>
            </div>
          </div>
          <div class="channel-details">
            <h3 class="channel-title">${this.escapeHtml(channel.name)}</h3>
            <p class="channel-description">${this.escapeHtml(description || 'No description available')}</p>
            <div class="channel-games">
              ${gamesHTML}
            </div>
          </div>
        </div>
        <div class="channel-actions">
          <a href="${channelUrl}" target="_blank" rel="noopener noreferrer" class="channel-link">
            <i class="${platformIcon}"></i>
            Visit Channel
          </a>
        </div>
        <div class="channel-rating">
          <div class="rating-display">
            <div class="rating-main">
              <div class="stars">${this.generateStarRating(channel.averageRating || 0)}</div>
              <span class="rating-text">${(channel.averageRating || 0).toFixed(1)}</span>
            </div>
            ${ratingsCount > 0 ? `
              <button class="view-reviews-inline" onclick="contentManager.showRatingsModal('${channel.id}', '${this.escapeHtml(channel.name)}', '${channel.platform}')">
                ${ratingsCount} review${ratingsCount !== 1 ? 's' : ''}
              </button>
            ` : '<span class="no-reviews">No reviews yet</span>'}
          </div>
          ${canRate ? `
            <div class="rating-actions">
              <button class="rate-btn" onclick="contentManager.showRatingModal('${channel.id}', '${this.escapeHtml(channel.name)}', '${channel.platform}')">
                <i class="fas fa-star"></i>
                Rate Creator
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Get optimized image URL with proper dimensions
   */
  getOptimizedImageUrl(imageUrl, fallback, dimensions) {
    if (!imageUrl || imageUrl === fallback) {
      return fallback;}
    
    // If it's already a local asset, return as-is
    if (imageUrl.startsWith('/assets/') || imageUrl.startsWith('/uploads/')) {
      return imageUrl;}
    
    // For external URLs, use proxy if available
    if (imageUrl.startsWith('http')) {
      return `/proxy/image?url=${encodeURIComponent(imageUrl)}&size=${dimensions}`;}
    
    return imageUrl;}

  /**
   * Generate proper platform URLs
   */
  generatePlatformUrl(originalUrl, platform, channelName) {
    if (!originalUrl) {
      return '#';}
    
    // If URL is already complete, return it
    if (originalUrl.startsWith('http')) {
      return originalUrl;}
    
    // Generate URL based on platform
    if (platform === 'youtube') {
      if (originalUrl.startsWith('@')) {
        return `https://www.youtube.com/${originalUrl}`;}
      return `https://www.youtube.com/@${originalUrl}`;} else if (platform === 'twitch') {
      return `https://www.twitch.tv/${originalUrl}`;}
    
    return originalUrl;}

  /**
   * Get HTML for no channels message
   */
  getNoChannelsHTML() {
    const gameLabel = this.currentGame === 'wc12' ? 'Warcraft I/II' : 'Warcraft III';
    const platformLabel = this.currentPlatform === 'all' ? 'any platform' : this.currentPlatform;
    
    return `
      <div class="no-channels-message">
        <i class="fas fa-users"></i>
        <h3>No Content Creators Found</h3>
        <p>No content creators found for ${gameLabel} on ${platformLabel}.</p>
        <p>Check back later as we're always adding new creators!</p>
      </div>
    `;}

  /**
   * Update content count display
   */
  updateContentCount(count) {
    const countElement = document.getElementById('content-count-text');
    if (countElement) {
      const gameLabel = this.currentGame === 'wc12' ? 'Warcraft I/II' : 'Warcraft III';
      const platformLabel = this.currentPlatform === 'all' ? 'all platforms' : this.currentPlatform;
      
      countElement.textContent = `${count} content creator${count !== 1 ? 's' : ''} found for ${gameLabel} on ${platformLabel}`;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const contentGrid = document.getElementById('content-grid');
    if (contentGrid) {
      contentGrid.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error Loading Content</h3>
          <p>${this.escapeHtml(message)}</p>
          <button onclick="contentListing.loadChannels()" class="retry-btn">
            <i class="fas fa-redo"></i> Try Again
          </button>
        </div>
      `;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  /**
   * Setup auto-refresh to check for live status updates
   */
  setupAutoRefresh() {

    
    // Auto-refresh every 2 minutes to catch live status changes quickly
    this.refreshInterval = setInterval(() => {
  
      this.loadChannels();
    }, 2 * 60 * 1000); // 2 minutes
    

    
    // Add manual refresh button functionality
    this.addRefreshButton();
  }

  /**
   * Add manual refresh button to the page
   */
  addRefreshButton() {
    const contentCount = document.querySelector('.content-count');
    if (!contentCount) return;if (document.getElementById('manual-refresh-btn')) return;const refreshButton = document.createElement('button');
    refreshButton.id = 'manual-refresh-btn';
    refreshButton.className = 'refresh-btn';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Live Status';
    refreshButton.title = 'Check for live stream updates';
    
    refreshButton.addEventListener('click', async () => {
      refreshButton.disabled = true;
      refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
      
      try {
        await this.loadChannels();
        
        // Show success feedback
        refreshButton.innerHTML = '<i class="fas fa-check"></i> Updated!';
        setTimeout(() => {
          refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Live Status';
          refreshButton.disabled = false;
        }, 2000);
      } catch (error) {
        refreshButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        setTimeout(() => {
          refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Live Status';
          refreshButton.disabled = false;
        }, 2000);
      }
    });
    
    contentCount.appendChild(refreshButton);
  }

  /**
   * Cleanup when the instance is destroyed
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Generate star rating HTML
   */
  generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fas fa-star"></i>';
    }
    
    if (halfStar) {
      starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;}

  /**
   * Show rating modal for a creator
   */
  async showRatingModal(creatorId, creatorName, platform) {
    try {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'rating-modal-overlay';
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
        z-index: 10000;
        backdrop-filter: blur(8px);
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'rating-modal';
      modal.style.cssText = `
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 2px solid var(--primary-gold);
        border-radius: 1rem;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        position: relative;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      `;

      const platformName = platform === 'youtube' ? 'YouTube' : 'Twitch';
      const platformIcon = platform === 'youtube' ? 'fab fa-youtube' : 'fab fa-twitch';
      const platformColor = platform === 'youtube' ? '#ff0000' : '#9146ff';

      modal.innerHTML = `
        <div class="modal-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <i class="${platformIcon}" style="color: ${platformColor}; font-size: 1.5rem;"></i>
          <h3 style="margin: 0; color: white; flex: 1;">Rate ${creatorName} (${platformName})</h3>
          <button class="close-btn" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s ease;">×</button>
        </div>
        
        <div class="rating-input" style="text-align: center; margin-bottom: 2rem;">
          <div class="star-rating" style="margin-bottom: 1rem;">
            ${[1, 2, 3, 4, 5].map(num => 
              `<i class="rating-star far fa-star" data-rating="${num}" style="font-size: 2rem; color: #ffd700; cursor: pointer; margin: 0 0.25rem; transition: all 0.2s ease;"></i>`
            ).join('')}
          </div>
          <p style="color: rgba(255, 255, 255, 0.7); margin: 0;">Click to rate this ${platformName} channel</p>
        </div>
        
        <div class="comment-section" style="margin-bottom: 2rem;">
          <label style="display: block; color: rgba(255, 255, 255, 0.8); margin-bottom: 0.5rem; font-weight: 500;">Comment (optional):</label>
          <textarea class="rating-comment" placeholder="Share your thoughts about this creator..." style="width: 100%; height: 80px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; padding: 0.75rem; color: white; resize: vertical; font-family: inherit;"></textarea>
        </div>
        
        <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button class="cancel-btn" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s ease;">Cancel</button>
          <button class="submit-btn" style="background: var(--primary-gold); border: none; color: #0f172a; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; opacity: 0.5;" disabled>Submit Rating</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Add event listeners
      let selectedRating = 0;
      
      // Star rating interaction
      const stars = modal.querySelectorAll('.rating-star');
      const submitBtn = modal.querySelector('.submit-btn');
      
      stars.forEach((star, index) => {
        star.addEventListener('mouseenter', () => {
          stars.forEach((s, i) => {
            s.className = i <= index ? 'rating-star fas fa-star' : 'rating-star far fa-star';
          });
        });
        
        star.addEventListener('mouseleave', () => {
          stars.forEach((s, i) => {
            s.className = i < selectedRating ? 'rating-star fas fa-star' : 'rating-star far fa-star';
          });
        });
        
        star.addEventListener('click', () => {
          selectedRating = index + 1;
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        });
      });

      // Close handlers
      const closeModal = () => {
        overlay.remove();
      };

      modal.querySelector('.close-btn').addEventListener('click', closeModal);
      modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });

      // Submit handler
      submitBtn.addEventListener('click', async () => {
        if (selectedRating > 0) {
          const comment = modal.querySelector('.rating-comment').value.trim();
          await this.submitRating(creatorId, selectedRating, comment, platform);
          closeModal();
        }
      });

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);

    } catch (error) {
      logger.error('Error showing rating modal:', error);
      this.showError('Failed to show rating modal');
    }
  }

  /**
   * Submit rating to API
   */
  async submitRating(creatorId, rating, comment, platform) {
    try {
      const response = await fetch(`/api/channels/${creatorId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comment, platform }),
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit rating');
      }

      const result = await response.json();
      this.showSuccess('Rating submitted successfully!');
      return result;} catch (error) {
      logger.error('❌ Failed to submit rating:', error);
      throw error;
    }
  }

  /**
   * Show ratings modal for a creator
   */
  async showRatingsModal(creatorId, creatorName, platform) {
    try {
      const response = await fetch(`/api/channels/${creatorId}/ratings?platform=${platform}`);
      if (!response.ok) throw new Error('Failed to load ratings');
      
      const data = await response.json();
      
      // Create modal to display ratings
      const overlay = document.createElement('div');
      overlay.className = 'ratings-modal-overlay';
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
        z-index: 10000;
        backdrop-filter: blur(8px);
      `;

      const platformName = platform === 'youtube' ? 'YouTube' : 'Twitch';
      const platformIcon = platform === 'youtube' ? 'fab fa-youtube' : 'fab fa-twitch';
      const platformColor = platform === 'youtube' ? '#ff0000' : '#9146ff';

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 2px solid var(--primary-gold);
        border-radius: 1rem;
        padding: 0;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      `;

      const ratingsHTML = data.ratings.length > 0 ? data.ratings.map(rating => {
        const username = rating.userId?.username || rating.userId?.displayName || 'Anonymous';
        
        // Use the user's database avatar directly (managed by AvatarService)
        const userAvatar = window.AvatarUtils ? 
          window.AvatarUtils.getAvatarWithFallback(rating.userId?.avatar) : 
          (rating.userId?.avatar || '/assets/img/ranks/emblem.png');
        
    
        
        return `
          <div class="rating-item" style="padding: 1rem;border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <div class="rating-header" style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
              <div class="user-info" style="display: flex; align-items: center; gap: 8px;">
                <img src="${userAvatar}" alt="${username}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255, 215, 0, 0.3);" onerror="this.src='/assets/img/ranks/emblem.png'">
                <span style="font-weight: 600; color: #f1f5f9;">${username}</span>
              </div>
              <div class="rating-stars" style="color: #ffd700; margin-left: auto;">
                ${this.generateStarRating(rating.rating)}
              </div>
            </div>
            ${rating.comment ? `
              <div class="rating-comment" style="margin-left: 2.5rem; color: rgba(255, 255, 255, 0.8); font-style: italic; line-height: 1.4;">
                "${rating.comment}"
              </div>
            ` : ''}
            <div class="rating-date" style="margin-left: 2.5rem; color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; margin-top: 0.25rem;">
              ${new Date(rating.createdAt).toLocaleDateString()}
            </div>
          </div>
        `;
      }).join('') : `
        <div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.6);">
          <i class="far fa-star" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <p>No ratings yet for this ${platformName} channel</p>
        </div>
      `;

      modal.innerHTML = `
        <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-gold) 0%, #d4ac0d 100%); color: #0f172a; padding: 1.5rem; display: flex; align-items: center; gap: 1rem;">
          <i class="${platformIcon}" style="font-size: 1.5rem;"></i>
          <h3 style="margin: 0; flex: 1; font-weight: 700;">
            ${data.creatorName} Reviews (${platformName})
          </h3>
          <button class="close-reviews-btn" style="background: none; border: none; color: #0f172a; font-size: 1.5rem; cursor: pointer; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s ease;">×</button>
        </div>
        
        <div class="ratings-summary" style="padding: 1.5rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="avg-rating" style="text-align: center;">
              <div style="font-size: 2rem; font-weight: bold; color: var(--primary-gold);">
                ${data.averageRating ? data.averageRating.toFixed(1) : '0.0'}
              </div>
              <div class="stars" style="color: #ffd700; margin: 0.25rem 0;">
                ${this.generateStarRating(data.averageRating || 0)}
              </div>
              <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.85rem;">
                ${data.ratingsCount} review${data.ratingsCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div style="flex: 1; padding-left: 1rem;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.8);">
                Platform-specific rating for ${data.creatorName}'s ${platformName} channel
              </p>
            </div>
          </div>
        </div>
        
        <div class="ratings-list" style="max-height: 400px; overflow-y: auto;">
          ${ratingsHTML}
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Close handlers
      const closeModal = () => overlay.remove();
      
      modal.querySelector('.close-reviews-btn').addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);

    } catch (error) {
      logger.error('Error loading ratings:', error);
      this.showError('Failed to load ratings');
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      animation: slideInRight 0.3s ease-out;
    `;
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize the content listing system when the page loads
let contentManager = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    contentManager = new ContentListingManager();
    await contentManager.initialize();
    
    // Make the manager globally accessible for rating functionality
    window.contentManager = contentManager;
    

  } catch (error) {
    logger.error('❌ Failed to initialize content page:', error);
  }
});

// Cleanup when the page is unloaded
window.addEventListener('beforeunload', () => {
  if (contentManager) {
    contentManager.destroy();
  }
}); 