/**
 * Unified Profile Manager
 * 
 * Handles both User profiles and Player profiles with proper separation:
 * - User: Account holder with auth, bio, social links, achievements
 * - Player: Game-specific identity with MMR, stats, match history per game type
 * - Relationship: One User can have multiple Players across game types
 */

import { ApiClient } from './ApiClient.js';

export class UnifiedProfileManager {
  constructor() {
    try {
      this.apiClient = new ApiClient();
    } catch (error) {
      console.error('Failed to initialize ApiClient in UnifiedProfileManager:', error);
      // Create a minimal fallback API client
      this.apiClient = {
        get: async (endpoint) => {
          const response = await fetch(`http://127.0.0.1:3000${endpoint}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          return response;},
        refreshAuthToken: () => {}
      };
    }
    this.cache = new Map();
    this.currentUser = null;
    this.currentPlayers = new Map(); // gameType -> Player data
    this.viewMode = 'user'; // 'user', 'player', 'combined'
    this.isOwnProfile = false;
  }
  /**
   * Initialize profile manager
   * @param {string} profileType - 'my', 'other', 'player'
   * @param {string} identifier - userId for user profiles, playerName for player profiles
   */
  async init(profileType = 'my', identifier = null) {
    try {
      this.profileType = profileType;
      this.identifier = identifier;
      this.isOwnProfile = profileType === 'my';
      
      // Show loading overlay for own profile
      if (profileType === 'my') {
        this.showLayoutLoading();
      }
      
      // Re-initialize ApiClient to pick up any authentication that was set up after construction
      this.apiClient.refreshAuthToken();
      
      // Setup layout controls for own profile
      if (profileType === 'my') {
        this.setupLayoutControls();
        this.updateLayoutProgress(20);
      }
      
      // Load appropriate profile data based on type
      switch (profileType) {
        case 'my':
          this.updateLayoutProgress(40);
          await this.loadMyProfile();
          this.updateLayoutProgress(60);
          // Load saved layout after profile data is loaded
          await this.loadSavedLayout();
          this.updateLayoutProgress(80);
          // Hide loading overlay and show sections
          this.hideLayoutLoading();
          break;
        case 'other':
          if (!identifier) throw new Error('User ID required for other profile');
          await this.loadOtherUserProfile(identifier);
          break;
        case 'player':
          if (!identifier) throw new Error('Player name required for player profile');
          await this.loadPlayerProfile(identifier);
          break;
        default:
          throw new Error(`Unknown profile type: ${profileType}`);
      }
      return true;} catch (error) {
      // Hide loading overlay on error
      if (profileType === 'my') {
        this.hideLayoutLoading();
      }
      throw error;
    }
  }
  /**
   * Load current user's profile (my profile)
   */
  async loadMyProfile() {
    // Check if we have authentication by trying to get user data
    try {
      const userResponse = await this.apiClient.get('/api/me');
      if (!userResponse || !userResponse.ok) {
        // Try to refresh auth token
        this.apiClient.refreshAuthToken();
        // Reduced wait time for auth to be established
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Try again
        const retryResponse = await this.apiClient.get('/api/me');
        if (!retryResponse || !retryResponse.ok) {
          throw new Error('Authentication required - please log in');
        }
        
        this.currentUser = await retryResponse.json();
      } else {
        this.currentUser = await userResponse.json();
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw new Error('Authentication required - please log in');
    }
    
    // Update UI immediately with user data (don't wait for players/layout)
    this.viewMode = 'combined';
    console.log('🔍 Profile Manager - About to update UI with user data:', {
      username: this.currentUser?.username,
      email: this.currentUser?.email,
      viewMode: this.viewMode
    });
    this.updateUI();
    // Hide loading overlay as soon as basic UI is ready
    this.hideLayoutLoading();
    
    // Load essential data in background (non-blocking)
    this.loadEssentialDataInBackground(this.currentUser.id);
    
    // Load non-essential data in background (don't block UI)
    this.loadNonEssentialDataInBackground(this.currentUser.id);
  }
  /**
   * Load another user's profile
   */
  async loadOtherUserProfile(userId) {
    // Load user data
    const userResponse = await this.apiClient.get(`/api/users/${userId}`);
    if (!userResponse.ok) throw new Error('Failed to load user profile');
    this.currentUser = await userResponse.json();
    // Load their players
    await this.loadUserPlayers(userId);
    // Load public data only
    await Promise.all([
      this.loadUserTournaments(userId),
      this.loadUserMaps(userId),
      this.loadUserForumActivity(userId)
    ]);
    this.viewMode = 'combined';
    this.updateUI();
  }
  /**
   * Load specific player profile (may or may not be linked to a user)
   */
  async loadPlayerProfile(playerName) {
    // Load player data
    const playerResponse = await this.apiClient.get(`/api/matches/player/${encodeURIComponent(playerName)}`);
    if (!playerResponse.ok) throw new Error('Failed to load player profile');
    const playerData = await playerResponse.json();
    // Store player data by game type
    this.currentPlayers.set(playerData.gameType, playerData);
    // If player is linked to a user, load user data too
    if (playerData.user) {
      try {
        const userResponse = await this.apiClient.get(`/api/users/${playerData.user}`);
        if (userResponse.ok) {
          this.currentUser = await userResponse.json();
          // Load other players of this user
          await this.loadUserPlayers(playerData.user);
        }
      } catch (error) {
      }
    }
    this.viewMode = this.currentUser ? 'combined' : 'player';
    this.updateUI();
  }
  /**
   * Load all players associated with a user
   */
  async loadUserPlayers(userId) {
    try {
      // Use a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      // Use the correct API endpoint for getting user's players
      const playersResponse = await this.apiClient.get('/api/ladder/my-players', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (playersResponse.ok) {
        const players = await playersResponse.json();
        
        // Group players by game type
        this.currentPlayers.clear();
        players.forEach(player => {
          this.currentPlayers.set(player.gameType, player);
        });
        
      } else {
        console.error('❌ Failed to load players:', playersResponse.status, playersResponse.statusText);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('ℹ️ Players loading timed out, using empty state');
      } else {
        console.error('❌ Error loading user players:', error);
      }
    }
  }
  /**
   * Load user achievements
   */
  async loadUserAchievements(userId) {
    try {
      const response = await this.apiClient.get(`/api/users/${userId}/achievements`);
      if (response.ok) {
        const achievements = await response.json();
        this.cache.set('achievements', achievements);
      } else {
        console.warn('⚠️ Failed to load user achievements:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('⚠️ Error loading user achievements:', error);
    }
  }
  /**
   * Load user tournaments
   */
  async loadUserTournaments(userId) {
    try {
      const response = await this.apiClient.get(`/api/users/${userId}/tournaments`);
      if (response.ok) {
        const tournaments = await response.json();
        this.cache.set('tournaments', tournaments);
      } else {
        console.warn('⚠️ Failed to load user tournaments:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('⚠️ Error loading user tournaments:', error);
    }
  }
  /**
   * Load user maps
   */
  async loadUserMaps(userId) {
    try {
      const response = await this.apiClient.get(`/api/users/${userId}/maps`);
      if (response.ok) {
        const maps = await response.json();
        this.cache.set('maps', maps);
      } else {
        console.warn('⚠️ Failed to load user maps:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('⚠️ Error loading user maps:', error);
    }
  }
  /**
   * Load user forum activity
   */
  async loadUserForumActivity(userId) {
    try {
      const response = await this.apiClient.get(`/api/users/${userId}/forum-activity`);
      if (response.ok) {
        const forumActivity = await response.json();
        this.cache.set('forumActivity', forumActivity);
      } else {
        console.warn('⚠️ Failed to load user forum activity:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('⚠️ Error loading user forum activity:', error);
    }
  }
  /**
   * Load non-essential data in background (doesn't block UI)
   */
  async loadNonEssentialDataInBackground(userId) {
    // Load non-essential data in background without blocking the UI
    setTimeout(async () => {
      try {
        await Promise.allSettled([
          this.loadUserAchievements(userId),
          this.loadUserTournaments(userId),
          this.loadUserMaps(userId),
          this.loadUserForumActivity(userId),
          this.loadCampaignData()
        ]);
        console.log('✅ Non-essential profile data loaded in background');
      } catch (error) {
        console.warn('⚠️ Some background profile data failed to load:', error);
      }
    }, 100); // Small delay to ensure UI is rendered first
  }

  /**
   * Load campaign data for the current user
   */
  async loadCampaignData() {
    try {
      const [statsResponse, progressResponse] = await Promise.all([
        this.apiClient.get('/api/campaigns/user/stats'),
        this.apiClient.get('/api/campaigns/user/progress')
      ]);

      const campaignData = {
        stats: null,
        progress: [],
        speedruns: []
      };

      if (statsResponse && statsResponse.ok) {
        campaignData.stats = await statsResponse.json();
      } else {
        console.error('❌ Campaign stats request failed:', statsResponse?.status, statsResponse?.statusText);
      }

      if (progressResponse && progressResponse.ok) {
        campaignData.progress = await progressResponse.json();
      } else {
        console.error('❌ Campaign progress request failed:', progressResponse?.status, progressResponse?.statusText);
      }

      // Load speedrun data if available
      try {
        const speedrunResponse = await this.apiClient.get('/api/campaigns/user/speedruns');
        if (speedrunResponse && speedrunResponse.ok) {
          campaignData.speedruns = await speedrunResponse.json();
        }
      } catch (speedrunError) {
        console.warn('⚠️ Speedrun data not available:', speedrunError);
      }

      // Cache the campaign data
      this.cache.set('campaign-data', campaignData);
      
      return campaignData;} catch (error) {
      console.error('❌ Failed to load campaign data:', error);
      return { stats: null, progress: [], speedruns: [] };}
  }
  /**
   * Switch view mode
   */
  setViewMode(mode) {
    if (['user', 'player', 'combined'].includes(mode)) {
      this.viewMode = mode;
      this.updateUI();
    }
  }
  /**
   * Get player data for specific game type
   */
  getPlayer(gameType) {
    return this.currentPlayers.get(gameType);}
  /**
   * Get all players
   */
  getAllPlayers() {
    return Array.from(this.currentPlayers.values());}
  /**
   * Get user data
   */
  getUser() {
    return this.currentUser;}
  /**
   * Get cached data by key
   */
  getCachedData(key) {
    return this.cache.get(key);}

  /**
   * Get campaign data
   */
  getCampaignData() {
    return this.cache.get('campaign-data') || { stats: null, progress: [], speedruns: [] };}
    /**
   * Update UI based on current data and view mode
   */
  updateUI() {
    // Emit events for UI components to listen to
    const event = new CustomEvent('profileDataUpdated', {
      detail: {
        user: this.currentUser,
        players: this.getAllPlayers(),
        viewMode: this.viewMode,
        isOwnProfile: this.isOwnProfile,
        cache: Object.fromEntries(this.cache)
      }
    });
    
    window.dispatchEvent(event);
  }
  /**
   * Add a new player to current user
   */
  async addPlayer(playerName, gameType) {
    if (!this.isOwnProfile) {
      throw new Error('Can only add players to own profile');
    }
    try {
      const response = await this.apiClient.post('/api/ladder/players', {
        playerName: playerName,
        gameType: gameType
      });
      if (response.ok) {
        const newPlayer = await response.json();
        this.currentPlayers.set(gameType, newPlayer);
        this.updateUI();
        return newPlayer;} else {
        throw new Error('Failed to add player');
      }
    } catch (error) {
      throw error;
    }
  }
  /**
   * Remove player from current user
   */
  async removePlayer(gameType) {
    if (!this.isOwnProfile) {
      throw new Error('Can only remove players from own profile');
    }
    const player = this.currentPlayers.get(gameType);
    if (!player) {
      throw new Error('Player not found');
    }
    try {
      const response = await this.apiClient.delete(`/api/ladder/players/${player.id}`);
      if (response.ok) {
        this.currentPlayers.delete(gameType);
        this.updateUI();
        return true;} else {
        throw new Error('Failed to remove player');
      }
    } catch (error) {
      throw error;
    }
  }
  /**
   * Update user profile data
   */
  async updateUserProfile(profileData) {
    if (!this.isOwnProfile) {
      throw new Error('Can only update own profile');
    }
    try {
      const response = await this.apiClient.put('/api/users/me', profileData);
      if (response.ok) {
        const updatedUser = await response.json();
        this.currentUser = { ...this.currentUser, ...updatedUser };
        this.updateUI();
        return updatedUser;} else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      throw error;
    }
  }
  /**
   * Clean up resources
   */
  destroy() {
    this.cache.clear();
    this.currentPlayers.clear();
    this.currentUser = null;
  }

  // ===== LAYOUT MANAGEMENT FUNCTIONALITY =====
  
  /**
   * Setup layout control handlers
   */
  setupLayoutControls() {
    
    const saveLayoutBtn = document.getElementById('save-layout');
    
    if (saveLayoutBtn) {
      saveLayoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.saveLayout();
      });
    }
  }

  /**
   * Save current layout to database
   */
  async saveLayout() {
    
    try {
      // Collect current layout data
      const layoutData = this.getCurrentLayoutData();
      
      // Save to database via API
      const response = await fetch('/api/users/profile/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(layoutData)
      });
      
      if (response.ok) {
        this.showLayoutMessage('Layout saved successfully!', 'success');
      } else {
        console.error('❌ Failed to save layout:', response.status);
        this.showLayoutMessage('Failed to save layout', 'error');
      }
    } catch (error) {
      console.error('❌ Error saving layout:', error);
      this.showLayoutMessage('Error saving layout', 'error');
    }
  }

  /**
   * Load saved layout from database
   */
  async loadSavedLayout() {
    
    try {
      // Use a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch('/api/users/profile/layout', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const layoutData = await response.json();
        if (layoutData && layoutData.sections) {
          this.applySavedLayout(layoutData);
        } else {
          console.log('ℹ️ No saved layout found, using default');
        }
      } else {
        console.log('ℹ️ No saved layout available');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('ℹ️ Layout loading timed out, using default');
      } else {
        console.error('❌ Error loading layout:', error);
      }
    }
  }

  /**
   * Collect current layout data from the grid
   */
  getCurrentLayoutData() {
    const sections = document.querySelectorAll('.draggable-section');
    const layoutData = {
      sections: [],
      timestamp: new Date().toISOString()
    };
    
    sections.forEach(section => {
      const sectionData = {
        id: section.id,
        sectionType: section.dataset.section,
        position: parseInt(section.dataset.position) || 0,
        gridColumn: section.style.gridColumn || '',
        gridRow: section.style.gridRow || ''
      };
      
      layoutData.sections.push(sectionData);
    });
    
    // Sort by position to maintain order
    layoutData.sections.sort((a, b) => a.position - b.position);
    
    return layoutData;}

  /**
   * Apply saved layout data to the grid
   */
  applySavedLayout(layoutData) {
    
    try {
      layoutData.sections.forEach(sectionData => {
        const section = document.getElementById(sectionData.id);
        if (section) {
          // Apply position
          section.dataset.position = sectionData.position;
          
          // Apply grid positioning if available
          if (sectionData.gridColumn) {
            section.style.gridColumn = sectionData.gridColumn;
          }
          if (sectionData.gridRow) {
            section.style.gridRow = sectionData.gridRow;
          }
          
        } else {
          console.warn(`⚠️ Section not found: ${sectionData.id}`);
        }
      });
      
      // Trigger a reflow to ensure proper positioning
      if (window.draggableGrid && window.draggableGrid.reflowSections) {
        window.draggableGrid.reflowSections();
      }
      
    } catch (error) {
      console.error('❌ Error applying saved layout:', error);
    }
  }

  /**
   * Show sections after layout has been applied
   */
  showSectionsAfterLayout() {
    
    // Add layout-ready class to all draggable sections
    const sections = document.querySelectorAll('.draggable-section');
    sections.forEach(section => {
      section.classList.add('layout-ready');
    });
    
  }

  /**
   * Show the golden loading overlay
   */
  showLayoutLoading() {
    const overlay = document.getElementById('layout-loading-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
    }
  }

  /**
   * Hide the golden loading overlay
   */
  hideLayoutLoading() {
    const overlay = document.getElementById('layout-loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.style.display = 'none';
        // Show sections after overlay is hidden
        this.showSectionsAfterLayout();
      }, 500); // Wait for fade out animation
    }
  }

  /**
   * Update the loading progress bar
   */
  updateLayoutProgress(percentage) {
    const progressBar = document.getElementById('layout-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
  }

  /**
   * Show layout save/load message to user
   */
  showLayoutMessage(message, type = 'info') {
    // Create or update message element
    let messageEl = document.getElementById('layout-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'layout-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 500;
        z-index: 1000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
      `;
      document.body.appendChild(messageEl);
    }
    
    // Set message and style based on type
    messageEl.textContent = message;
    messageEl.style.background = type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 
                                 type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                                 'rgba(59, 130, 246, 0.9)';
    
    // Show message
    requestAnimationFrame(() => {
      messageEl.style.opacity = '1';
      messageEl.style.transform = 'translateX(0)';
    });
    
    // Hide message after 3 seconds
    setTimeout(() => {
      messageEl.style.opacity = '0';
      messageEl.style.transform = 'translateX(100%)';
    }, 3000);
  }
}
// Create singleton instance
export const unifiedProfileManager = new UnifiedProfileManager();
export default unifiedProfileManager;
