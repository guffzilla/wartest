/**
 * ProfileDataLoader.js - Centralized Data Loading for Profile
 * 
 * This module consolidates all the scattered data loading functions
 * from the 126KB myprofile.js monster into a clean, organized system.
 * 
 * Handles:
 * - User profile data
 * - Player statistics and names
 * - Tournament activity
 * - Campaign data and achievements
 * - Forum activity and reports
 * - Map data and speedruns
 */

export class ProfileDataLoader {
  constructor() {
    this.cache = new Map();
    this.loadingStates = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  /**
   * Load current user profile data
   */
  async loadUserProfile() {
    const cacheKey = 'user-profile';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);}

    if (this.loadingStates.get(cacheKey)) {
      // Already loading, wait for it
      while (this.loadingStates.get(cacheKey)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.cache.get(cacheKey);}

    this.loadingStates.set(cacheKey, true);

    try {
      const response = await fetch('/api/me', { 
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include' 
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle authentication error gracefully
          console.warn('❌ User not authenticated (401)');
          if (window.location.pathname !== '/views/login.html') {
            window.location.href = '/views/login.html';
          }
          return null;}
        throw new Error(`HTTP ${response.status}: Failed to fetch user data`);
      }

      const userData = await response.json();
      
      // Validate that we have a username or displayName
      if (!userData.username && !userData.displayName) {
        console.error('❌ CRITICAL: No username or displayName in user data!');
        
        // Create a fallback user object with a default username
        const fallbackUserData = {
          ...userData,
          username: 'UnknownUser',
          displayName: 'Unknown User',
          isUsernameDefined: false
        };
        this.cache.set(cacheKey, fallbackUserData);
        window.currentUser = fallbackUserData;
        return fallbackUserData;}
      
      this.cache.set(cacheKey, userData);
      
      // Store globally for backward compatibility
      window.currentUser = userData;
      
      return userData;} catch (error) {
      console.error('❌ Failed to load user profile:', error);
      
      // Create emergency fallback user data
      const emergencyUserData = {
        id: 'emergency-user',
        username: 'EmergencyUser',
        displayName: 'Emergency User',
        isUsernameDefined: false,
        email: 'emergency@example.com',
        avatar: '/assets/img/ranks/emblem.png'
      };
      
      this.cache.set(cacheKey, emergencyUserData);
      window.currentUser = emergencyUserData;
      
      throw error;
    } finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load player names linked to user
   */
  async loadPlayerNames() {
    const cacheKey = 'player-names';

    try {
      this.loadingStates.set(cacheKey, true);
      
      const response = await fetch('/api/ladder/my-players', { 
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include' 
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch player names`);
      }

      const players = await response.json();
      this.cache.set(cacheKey, players);
      
      return players;} catch (error) {
      console.error('❌ Failed to load player names:', error);
      return [];} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load player statistics
   */
  async loadPlayerStats() {
    const cacheKey = 'player-stats';

    try {
      this.loadingStates.set(cacheKey, true);
      
      const players = await this.loadPlayerNames();
      const statsPromises = players.map(async (player) => {
        try {
          const response = await fetch(`/api/ladder/player/${player._id}/stats`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const stats = await response.json();
            return { ...player, stats };} else {
            console.warn(`Failed to load stats for player: ${player.name}`);
            return player;}
        } catch (error) {
          console.warn(`Error loading stats for player ${player.name}:`, error);
          return player;}
      });

      const playersWithStats = await Promise.all(statsPromises);
      this.cache.set(cacheKey, playersWithStats);
      
      return playersWithStats;} catch (error) {
      console.error('❌ Failed to load player stats:', error);
      return [];} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load user tournaments with pagination
   */
  async loadUserTournaments(page = 1, perPage = 5) {
    const cacheKey = `tournaments-${page}-${perPage}`;

    try {
      this.loadingStates.set(cacheKey, true);
      
      const user = await this.loadUserProfile();
      const userId = user.id || user._id;

      const response = await fetch(`/api/tournaments/user/${userId}`, { 
        credentials: 'include' 
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Server error loading tournaments');
        }
        return { tournaments: [], totalPages: 0, currentPage: page };}

      const allTournaments = await response.json();
      
      // Calculate pagination
      const totalItems = allTournaments.length;
      const totalPages = Math.ceil(totalItems / perPage);
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const tournaments = allTournaments.slice(startIndex, endIndex);

      const result = {
        tournaments,
        totalPages,
        currentPage: page,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };

      this.cache.set(cacheKey, result);
      return result;} catch (error) {
      console.error('❌ Failed to load tournaments:', error);
      return { tournaments: [], totalPages: 0, currentPage: page, error: error.message };} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
        * Load War Table data and progress
     */
    async loadCampaignData() {
        const cacheKey = 'campaign-data';

    try {
      this.loadingStates.set(cacheKey, true);
      
      const authHeaders = window.getAuthHeaders ? window.getAuthHeaders() : {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      const [statsResponse, progressResponse] = await Promise.all([
        fetch('/api/campaigns/user/stats', { 
          headers: authHeaders,
          credentials: 'include' 
        }),
        fetch('/api/campaigns/user/progress', { 
          headers: authHeaders,
          credentials: 'include' 
        })
      ]);

      const campaignData = {
        stats: null,
        progress: [],
        speedruns: []
      };

      if (statsResponse.ok) {
        campaignData.stats = await statsResponse.json();
      } else {
        console.error('❌ Campaign stats request failed:', statsResponse.status, statsResponse.statusText);
      }

      if (progressResponse.ok) {
        campaignData.progress = await progressResponse.json();
      }

      // Load speedrun data if available
      try {
        const speedrunResponse = await fetch('/api/campaigns/user/speedruns', { 
          headers: authHeaders,
          credentials: 'include' 
        });
        if (speedrunResponse.ok) {
          campaignData.speedruns = await speedrunResponse.json();
        }
      } catch (speedrunError) {
        console.warn('Speedrun data not available:', speedrunError);
      }

      this.cache.set(cacheKey, campaignData);
            return campaignData;} catch (error) {
            console.error('❌ Failed to load War Table data:', error);
      return { stats: null, progress: [], speedruns: [] };} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load achievement data (ALL achievements for Arena/Social/War Table tabs)
   */
  async loadAchievementData() {
    const cacheKey = 'achievement-data';

    try {
      this.loadingStates.set(cacheKey, true);
      
      const user = await this.loadUserProfile();
      
      // Get ALL achievements (including campaign ones for War Table tab)
      const [allResponse, userResponse] = await Promise.all([
        fetch('/api/achievements', { credentials: 'include' }),
        fetch(`/api/achievements/user/${user.id || user._id}`, { credentials: 'include' })
      ]);

      if (!allResponse.ok || !userResponse.ok) {
        console.warn('Achievement data not available');
        return { achievements: [], stats: null };}

      const allAchievements = await allResponse.json();
      const userAchievements = await userResponse.json();
      
      // Merge data - mark which achievements the user has completed
      const achievements = allAchievements.map(achievement => {
        const userAchievement = userAchievements.completed?.find(ua => ua.achievementId === achievement.id);
        return {
          ...achievement,
          completed: !!userAchievement,
          earnedAt: userAchievement?.earnedAt
        };});

      const achievementData = {
        achievements,
        totalUnlocked: userAchievements.totalUnlocked || 0,
        totalPointsEarned: userAchievements.totalPointsEarned || 0,
        stats: userAchievements.stats
      };

      this.cache.set(cacheKey, achievementData);
      
      return achievementData;} catch (error) {
      console.error('❌ Failed to load achievement data:', error);
      return { achievements: [], stats: null };} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
        * Load War Table achievement data
     */


  /**
   * Load forum activity
   */
  async loadForumActivity() {
    const cacheKey = 'forum-activity';

    try {
      this.loadingStates.set(cacheKey, true);
      
      const user = await this.loadUserProfile();
      const response = await fetch(`/api/forum/user/${user.id || user._id}/activity`, {
        credentials: 'include'
      });

      if (!response.ok) {
        return { posts: [], topics: [] };}

      const forumActivity = await response.json();
      this.cache.set(cacheKey, forumActivity);
      
      return forumActivity;} catch (error) {
      console.error('❌ Failed to load forum activity:', error);
      return { posts: [], topics: [] };} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load user reports
   */
  async loadReports() {
    const cacheKey = 'user-reports';

    try {
      this.loadingStates.set(cacheKey, true);
      
      const response = await fetch('/api/reports/user', { credentials: 'include' });
      
      if (!response.ok) {
        return [];}

      const reports = await response.json();
      this.cache.set(cacheKey, reports);
      
      return reports;} catch (error) {
      console.error('❌ Failed to load reports:', error);
      return [];} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load user maps
   */
  async loadUserMaps() {
    const cacheKey = 'user-maps';

    try {
      this.loadingStates.set(cacheKey, true);
      
      const user = await this.loadUserProfile();
      const response = await fetch(`/api/users/${user.id || user._id}/maps`, {
        credentials: 'include'
      });

      if (!response.ok) {
        return [];}

      const data = await response.json();
      
      // Handle different response formats
      let maps = [];
      if (data.success && data.data) {
        maps = data.data;
      } else if (data.maps) {
        maps = data.maps;
      } else if (Array.isArray(data)) {
        maps = data;
      }
      
      this.cache.set(cacheKey, maps);
      
      return maps;} catch (error) {
      console.error('❌ Failed to load user maps:', error);
      return [];} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load top allies and opponents (CONSOLIDATED - no more duplication!)
   */
  async loadTopAlliesAndOpponents() {
    const cacheKey = 'allies-opponents';

    try {
      this.loadingStates.set(cacheKey, true);
      
      const players = await this.loadPlayerNames();
      if (!players.length) {
        return { allies: [], opponents: [] };}

      // Find the highest MMR player to get their allies/opponents
      const highestRankedPlayer = players.reduce((highest, current) => {
        return (current.mmr > (highest.mmr || 0)) ? current : highest;}, players[0]);

      const response = await fetch(`/api/ladder/player/${encodeURIComponent(highestRankedPlayer.name)}/allies-enemies?limit=3`, {
        credentials: 'include'
      });

      if (!response.ok) {
        return { allies: [], enemies: [] };}

      const data = await response.json();
      this.cache.set(cacheKey, data);
      
      return data;} catch (error) {
      console.error('❌ Failed to load allies and opponents:', error);
      return { allies: [], enemies: [] };} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load user's clan data
   */
  async loadClanData() {
    const cacheKey = 'clan-data';

    try {
      this.loadingStates.set(cacheKey, true);
      console.log('🏕️ Loading clan data from API...');
      
      const response = await fetch('/api/clans/user', { 
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include' 
      });
      
      console.log('🏕️ Clan API response status:', response.status);
      
      if (!response.ok) {
        // User doesn't have a clan - this is normal
        console.log('🏕️ User has no clans (status:', response.status, ')');
        return null;}

      const clanData = await response.json();
      console.log('🏕️ Clan data received:', clanData);
      
      this.cache.set(cacheKey, clanData);
      
      return clanData;} catch (error) {
      console.error('❌ Failed to load clan data:', error);
      return null;} finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  /**
   * Load all profile data at once
   */
  async loadAllProfileData() {
    console.log('🔄 Loading all profile data...');
    this.loadingState = true;

    try {
      const [user, playerStats, campaignData, clanData, forumActivity, userMaps, achievementData] = await Promise.all([
        this.loadUserProfile(),
        this.loadPlayerStats(),
        this.loadCampaignData(),
        this.loadClanData(),
        this.loadForumActivity(),
        this.loadUserMaps(),
        this.loadAchievementData()
      ]);

      const profileData = {
        user,
        playerStats,
        playerNames: this.cache.get('player-names') || [],
        campaignData,
        clanData,
        forumActivity,
        userMaps,
        achievementData,
        tournaments: this.cache.get('tournaments-1-5') || { tournaments: [], totalPages: 0 } // Initial load
      };

      console.log('✅ All profile data loaded successfully', profileData);
      
      // Initialize CartographyManager if available and maps are loaded
      if (window.cartographyManager && userMaps.length > 0) {
        console.log('🗺️ Refreshing CartographyManager with loaded data');
        window.cartographyManager.setMapsData(userMaps);
      }
      
      return profileData;} catch (error) {
      console.error('❌ Failed to load profile data:', error);
      throw error;
    }
  }

  /**
   * Clear cache for specific data or all data
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
      console.log(`🗑️ Cache cleared for: ${key}`);
    } else {
      this.cache.clear();
      console.log('🗑️ All cache cleared');
    }
  }

  /**
   * Get loading state for a specific operation
   */
  isLoading(key) {
    return this.loadingStates.get(key) || false;}

  /**
   * Get cached data
   */
  getCached(key) {
    return this.cache.get(key);}
}

// Create and export singleton instance
export const profileDataLoader = new ProfileDataLoader(); 