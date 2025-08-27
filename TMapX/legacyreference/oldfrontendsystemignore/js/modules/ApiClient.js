/**
 * Modern API Client
 * Handles all API communications with consistent error handling
 * Updated for Rust backend compatibility
 */

import logger from '/js/utils/logger.js';

class ApiClient {
  constructor() {
    // Use the same port as the current page (BrowserSync proxy)
    this.baseUrl = window.location.origin;
    this.authToken = null;
    this.authRequested = false; // Flag to prevent multiple auth requests
    this.initializeAuth();
  }

  initializeAuth() {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('authToken');
    
    if (urlToken) {
      this.authToken = urlToken;
      localStorage.setItem('authToken', urlToken);
      return;
    }

    // Check localStorage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      this.authToken = storedToken;
    }
  }

  setAuthToken(token) {
    this.authToken = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getAuthToken() {
    if (!this.authToken) {
      this.authToken = localStorage.getItem('authToken');
    }
    return this.authToken;
  }

  /**
   * Check if we have valid authentication
   */
  hasValidAuth() {
    return !!this.getAuthToken();
  }

  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('authToken');
  }
  
  refreshAuthToken() {
    // Don't re-initialize auth if we already have a token
    if (this.authToken) {
      logger.info('🔐 ApiClient: Already have auth token, skipping refresh');
      return;
    }
    
    // Reset the request flag and re-initialize auth
    this.authRequested = false;
    this.initializeAuth();
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    // Use session authentication (cookies) instead of JWT headers for consistency
    options.credentials = 'include';
    
    // Add auth headers if we have a JWT token
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (this.authToken) {
      options.headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, options);
      
      // Handle 401 by clearing auth and redirecting to login
      if (response.status === 401) {
        this.setAuthToken(null);
        // Only redirect to login if we're not already there
        if (window.location.pathname !== '/views/login.html') {
          window.location.href = '/views/login.html';
        }
        return null;
      }

      return response;
    } catch (error) {
      logger.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    return this.request(url.pathname + url.search);
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * Upload file with FormData
   */
  async uploadFile(endpoint, formData) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {},
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const jsonResponse = await response.json();
      
      // If the response already has a success field, return it directly
      if (typeof jsonResponse === 'object' && 'success' in jsonResponse) {
        return jsonResponse;
      }
      
      // Otherwise wrap it for consistency
      return {
        success: true,
        data: jsonResponse
      };
    } catch (error) {
      logger.error('File upload failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // === AUTHENTICATION ENDPOINTS ===

  /**
   * Get OAuth URL for provider
   */
  async getOAuthUrl(provider) {
    try {
      const response = await this.get(`/api/auth/${provider}`);
      if (!response.ok) {
        throw new Error(`Failed to get OAuth URL for ${provider}`);
      }
      const data = await response.json();
      return data.auth_url;
    } catch (error) {
      logger.error(`Failed to get OAuth URL for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(provider, code, state = null) {
    try {
      const response = await this.post(`/api/auth/${provider}/callback`, {
        code,
        state
      });
      
      if (!response.ok) {
        throw new Error(`OAuth callback failed for ${provider}`);
      }
      
      const data = await response.json();
      
      // Store the JWT token
      if (data.token) {
        this.setAuthToken(data.token);
      }
      
      return data;
    } catch (error) {
      logger.error(`OAuth callback failed for ${provider}:`, error);
      throw error;
    }
  }

  // === USER ENDPOINTS ===

  /**
   * Get current user data
   * Note: This endpoint doesn't exist in Rust backend yet, so we'll use a placeholder
   */
  async getCurrentUser() {
    try {
      // For now, we'll try to get user data from the JWT token
      // This is a temporary solution until we implement the /api/me endpoint
      if (!this.authToken) {
        throw new Error('No authentication token available');
      }
      
      // TODO: Implement proper /api/me endpoint in Rust backend
      // For now, return a placeholder response
      return {
        id: 'placeholder',
        username: 'placeholder',
        email: 'placeholder@example.com',
        role: 'user',
        isAuthenticated: true
      };
    } catch (error) {
      logger.error('getCurrentUser failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async registerUser(userData) {
    try {
      const response = await this.post('/api/users/register', userData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      const data = await response.json();
      
      // If registration includes a token, store it
      if (data.token) {
        this.setAuthToken(data.token);
      }
      
      return data;
    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async loginUser(credentials) {
    try {
      const response = await this.post('/api/users/login', credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store the JWT token
      if (data.token) {
        this.setAuthToken(data.token);
      }
      
      return data;
    } catch (error) {
      logger.error('User login failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const response = await this.get(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get user');
      }
      return await response.json();
    } catch (error) {
      logger.error('getUserById failed:', error);
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username) {
    try {
      const response = await this.get(`/api/users/username/${username}`);
      if (!response.ok) {
        throw new Error('Failed to get user by username');
      }
      return await response.json();
    } catch (error) {
      logger.error('getUserByUsername failed:', error);
      throw error;
    }
  }

  /**
   * Get current user (placeholder - not implemented in Rust backend yet)
   */
  async getCurrentUser() {
    logger.warn('getCurrentUser not yet implemented in Rust backend');
    // Return mock data for now
    return {
      id: 'mock-user-id',
      username: 'MockUser',
      email: 'mock@example.com'
    };
  }

  /**
   * Update user profile
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async updateProfile(profileData) {
    // TODO: Implement user profile update endpoint in Rust backend
    logger.warn('updateProfile not yet implemented in Rust backend');
    throw new Error('Profile update not yet implemented');
  }

  /**
   * Update username
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async updateUsername(newUsername) {
    // TODO: Implement username update endpoint in Rust backend
    logger.warn('updateUsername not yet implemented in Rust backend');
    throw new Error('Username update not yet implemented');
  }

  /**
   * Update social links
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async updateSocialLinks(socialLinks) {
    // TODO: Implement social links update endpoint in Rust backend
    logger.warn('updateSocialLinks not yet implemented in Rust backend');
    throw new Error('Social links update not yet implemented');
  }

  /**
   * Update game preference
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async updateGamePreference(platform, gameType, isEnabled) {
    // TODO: Implement game preference update endpoint in Rust backend
    logger.warn('updateGamePreference not yet implemented in Rust backend');
    throw new Error('Game preference update not yet implemented');
  }

  // === ADMIN ENDPOINTS ===

  /**
   * Promote user to admin
   */
  async promoteUser(userId, newRole) {
    try {
      const response = await this.post('/api/admin/promote', {
        user_id: userId,
        new_role: newRole
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to promote user');
      }
      
      return await response.json();
    } catch (error) {
      logger.error('promoteUser failed:', error);
      throw error;
    }
  }

  // === PLAYER ENDPOINTS ===
  // Note: These endpoints don't exist in Rust backend yet

  /**
   * Get user's players
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getUserPlayers() {
    // TODO: Implement player endpoints in Rust backend
    logger.warn('getUserPlayers not yet implemented in Rust backend');
    throw new Error('Player endpoints not yet implemented');
  }

  /**
   * Add new player
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async addPlayer(playerData) {
    // TODO: Implement player endpoints in Rust backend
    logger.warn('addPlayer not yet implemented in Rust backend');
    throw new Error('Player endpoints not yet implemented');
  }

  /**
   * Update player
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async updatePlayer(playerId, playerData) {
    // TODO: Implement player endpoints in Rust backend
    logger.warn('updatePlayer not yet implemented in Rust backend');
    throw new Error('Player endpoints not yet implemented');
  }

  /**
   * Remove player
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async removePlayer(playerId) {
    // TODO: Implement player endpoints in Rust backend
    logger.warn('removePlayer not yet implemented in Rust backend');
    throw new Error('Player endpoints not yet implemented');
  }

  /**
   * Get player stats
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getPlayerStats(playerId) {
    // TODO: Implement player endpoints in Rust backend
    logger.warn('getPlayerStats not yet implemented in Rust backend');
    throw new Error('Player endpoints not yet implemented');
  }

  // === TOURNAMENT ENDPOINTS ===

  /**
   * Get tournaments
   * GET /api/tournaments
   */
  async getTournaments(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.game_type) queryParams.append('game_type', params.game_type);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `/api/tournaments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get user's tournaments (alias for getTournaments with user filter)
   */
  async getUserTournaments() {
    // For now, return all tournaments - can be filtered by user later
    return this.getTournaments();
  }

  /**
   * Get tournament details
   * GET /api/tournaments/{tournamentId}
   */
  async getTournament(tournamentId) {
    const response = await this.makeRequest(`/api/tournaments/${tournamentId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Create tournament
   * POST /api/tournaments
   */
  async createTournament(tournamentData) {
    const response = await this.makeRequest('/api/tournaments', {
      method: 'POST',
      requiresAuth: true,
      body: tournamentData
    });

    return response;
  }

  /**
   * Join tournament
   * POST /api/tournaments/{tournamentId}/join
   */
  async joinTournament(tournamentId, playerData) {
    const response = await this.makeRequest(`/api/tournaments/${tournamentId}/join`, {
      method: 'POST',
      requiresAuth: true,
      body: playerData
    });

    return response;
  }

  /**
   * Get tournament participants
   * GET /api/tournaments/{tournamentId}/participants
   */
  async getTournamentParticipants(tournamentId) {
    const response = await this.makeRequest(`/api/tournaments/${tournamentId}/participants`, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Update tournament (placeholder - not implemented in Rust backend yet)
   */
  async updateTournament(tournamentId, tournamentData) {
    logger.warn('updateTournament not yet implemented in Rust backend');
    throw new Error('Update tournament endpoint not yet implemented');
  }

  /**
   * Leave tournament (placeholder - not implemented in Rust backend yet)
   */
  async leaveTournament(tournamentId) {
    logger.warn('leaveTournament not yet implemented in Rust backend');
    throw new Error('Leave tournament endpoint not yet implemented');
  }

  // === LADDER ENDPOINTS ===

  /**
   * Get ladder rankings
   * GET /api/ladder/rankings
   */
  async getLadderRankings(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);
    if (params.match_type) queryParams.append('match_type', params.match_type);
    if (params.game_type) queryParams.append('game_type', params.game_type);
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/ladder/rankings${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get user's players
   * GET /api/ladder/my-players
   */
  async getMyPlayers() {
    const response = await this.makeRequest('/api/ladder/my-players', {
      method: 'GET',
      requiresAuth: true
    });

    return response;
  }

  /**
   * Create a new player
   * POST /api/ladder/players
   */
  async createPlayer(playerData) {
    const response = await this.makeRequest('/api/ladder/players', {
      method: 'POST',
      requiresAuth: true,
      body: playerData
    });

    return response;
  }
  async getLadderRanks() {
    // TODO: Implement ladder endpoints in Rust backend
    logger.warn('getLadderRanks not yet implemented in Rust backend');
    throw new Error('Ladder endpoints not yet implemented');
  }

  /**
   * Submit match report
   * POST /api/matches
   */
  async submitMatchReport(matchData) {
    const response = await this.makeRequest('/api/matches', {
      method: 'POST',
      requiresAuth: true,
      body: matchData
    });

    return response;
  }

  /**
   * Get recent matches
   * GET /api/matches/recent
   */
  async getRecentMatches(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);
    if (params.game_type) queryParams.append('game_type', params.game_type);

    const url = `/api/matches/recent${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get match statistics
   * GET /api/matches/stats
   */
  async getMatchStats(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.game_type) queryParams.append('game_type', params.game_type);

    const url = `/api/matches/stats${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get player matches
   * GET /api/matches/player/{playerName}
   */
  async getPlayerMatches(playerName, params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);

    const url = `/api/matches/player/${encodeURIComponent(playerName)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Dispute match (placeholder - not implemented in Rust backend yet)
   */
  async disputeMatch(matchId, disputeData) {
    logger.warn('disputeMatch not yet implemented in Rust backend');
    throw new Error('Dispute match endpoint not yet implemented');
  }

  /**
   * Get global stats (placeholder - not implemented in Rust backend yet)
   */
  async getGlobalStats() {
    logger.warn('getGlobalStats not yet implemented in Rust backend');
    throw new Error('Global stats endpoint not yet implemented');
  }

  // === MAP ENDPOINTS ===

  /**
   * Get maps
   * GET /api/maps
   */
  async getMaps(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);
    if (params.game_type) queryParams.append('game_type', params.game_type);
    if (params.author) queryParams.append('author', params.author);

    const url = `/api/maps${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get specific map
   * GET /api/maps/{mapId}
   */
  async getMap(mapId) {
    const response = await this.makeRequest(`/api/maps/${mapId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Create new map
   * POST /api/maps
   */
  async createMap(mapData) {
    const response = await this.makeRequest('/api/maps', {
      method: 'POST',
      requiresAuth: true,
      body: mapData
    });

    return response;
  }

  /**
   * Download map
   * POST /api/maps/{mapId}/download
   */
  async downloadMap(mapId) {
    const response = await this.makeRequest(`/api/maps/${mapId}/download`, {
      method: 'POST',
      requiresAuth: true
    });

    return response;
  }

  /**
   * Rate map
   * POST /api/maps/{mapId}/rate
   */
  async rateMap(mapId, rating) {
    const response = await this.makeRequest(`/api/maps/${mapId}/rate`, {
      method: 'POST',
      requiresAuth: true,
      body: { rating }
    });

    return response;
  }

  /**
   * Get user's maps
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getUserMaps() {
    // TODO: Implement map endpoints in Rust backend
    logger.warn('getUserMaps not yet implemented in Rust backend');
    throw new Error('Map endpoints not yet implemented');
  }

  /**
   * Upload map
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async uploadMap(mapData) {
    // TODO: Implement map endpoints in Rust backend
    logger.warn('uploadMap not yet implemented in Rust backend');
    throw new Error('Map endpoints not yet implemented');
  }

  // === CAMPAIGN ENDPOINTS ===

  /**
   * Get campaigns
   * GET /api/campaigns
   */
  async getCampaigns(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.game_type) queryParams.append('game_type', params.game_type);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `/api/campaigns${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get campaign details
   * GET /api/campaigns/{campaignId}
   */
  async getCampaign(campaignId) {
    const response = await this.makeRequest(`/api/campaigns/${campaignId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Create campaign
   * POST /api/campaigns
   */
  async createCampaign(campaignData) {
    const response = await this.makeRequest('/api/campaigns', {
      method: 'POST',
      requiresAuth: true,
      body: campaignData
    });

    return response;
  }

  // === FORUM ENDPOINTS ===

  /**
   * Get forum categories
   * GET /api/forum/categories
   */
  async getForumCategories() {
    const response = await this.makeRequest('/api/forum/categories', {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get forum threads
   * GET /api/forum/threads
   */
  async getForumThreads(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/forum/threads${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get forum thread
   * GET /api/forum/threads/{threadId}
   */
  async getForumThread(threadId) {
    const response = await this.makeRequest(`/api/forum/threads/${threadId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Create forum thread
   * POST /api/forum/threads
   */
  async createForumThread(threadData) {
    const response = await this.makeRequest('/api/forum/threads', {
      method: 'POST',
      requiresAuth: true,
      body: threadData
    });

    return response;
  }

  /**
   * Get forum posts
   * GET /api/forum/threads/{threadId}/posts
   */
  async getForumPosts(threadId, params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `/api/forum/threads/${threadId}/posts${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Create forum post
   * POST /api/forum/threads/{threadId}/posts
   */
  async createForumPost(threadId, postData) {
    const response = await this.makeRequest(`/api/forum/threads/${threadId}/posts`, {
      method: 'POST',
      requiresAuth: true,
      body: postData
    });

    return response;
  }

  /**
   * Get forum stats (placeholder - not implemented in Rust backend yet)
   */
  async getForumStats(params = {}) {
    // TODO: Implement forum stats endpoint in Rust backend
    logger.warn('getForumStats not yet implemented in Rust backend');
    throw new Error('Forum stats endpoint not yet implemented');
  }

  /**
   * Vote on a poll
   */
  async voteOnPoll(postId, voteData) {
    const response = await this.makeRequest(`/api/forum/topic/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify(voteData)
    });
    return response;
  }

  /**
   * Delete forum thread
   */
  async deleteForumThread(threadId) {
    const response = await this.makeRequest(`/api/forum/threads/${threadId}`, {
      method: 'DELETE'
    });
    return response;
  }

  /**
   * Delete forum post
   */
  async deleteForumPost(postId) {
    const response = await this.makeRequest(`/api/forum/posts/${postId}`, {
      method: 'DELETE'
    });
    return response;
  }

  // === MAP ENDPOINTS ===

  /**
   * Get random WC2 map
   */
  async getRandomWC2Map() {
    const response = await this.makeRequest('/api/wc2maps/random', {
      method: 'GET'
    });
    return response;
  }

  /**
   * Get WC3 maps
   */
  async getWC3Maps(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.gameType) queryParams.append('gameType', params.gameType);
    
    const url = `/api/wc3maps${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.makeRequest(url, {
      method: 'GET'
    });
    return response;
  }

  /**
   * Upload WC3 map
   */
  async uploadWC3Map(formData) {
    const response = await this.makeRequest('/api/wc3maps/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });
    return response;
  }

  /**
   * Upload WC2 map
   */
  async uploadWC2Map(formData) {
    const response = await this.makeRequest('/api/war2maps/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });
    return response;
  }

  /**
   * Update WC2 map
   */
  async updateWC2Map(mapId, formData) {
    const response = await this.makeRequest(`/api/war2maps/${mapId}`, {
      method: 'PUT',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });
    return response;
  }

  /**
   * Delete WC2 map
   */
  async deleteWC2Map(mapId) {
    const response = await this.makeRequest(`/api/war2maps/${mapId}`, {
      method: 'DELETE'
    });
    return response;
  }

  // === ACTIVITY ENDPOINTS ===
  // Note: These endpoints don't exist in Rust backend yet

  /**
   * Get user activity
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getUserActivity() {
    // TODO: Implement activity endpoints in Rust backend
    logger.warn('getUserActivity not yet implemented in Rust backend');
    throw new Error('Activity endpoints not yet implemented');
  }

  /**
   * Get user reports
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getUserReports() {
    // TODO: Implement activity endpoints in Rust backend
    logger.warn('getUserReports not yet implemented in Rust backend');
    throw new Error('Activity endpoints not yet implemented');
  }

  // === NOTIFICATION ENDPOINTS ===
  // Note: These endpoints don't exist in Rust backend yet

  /**
   * Get notifications
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getNotifications() {
    // TODO: Implement notification endpoints in Rust backend
    logger.warn('getNotifications not yet implemented in Rust backend');
    throw new Error('Notification endpoints not yet implemented');
  }

  /**
   * Mark notification as read
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async markNotificationRead(notificationId) {
    // TODO: Implement notification endpoints in Rust backend
    logger.warn('markNotificationRead not yet implemented in Rust backend');
    throw new Error('Notification endpoints not yet implemented');
  }

  /**
   * Mark all notifications as read
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async markAllNotificationsRead() {
    // TODO: Implement notification endpoints in Rust backend
    logger.warn('markAllNotificationsRead not yet implemented in Rust backend');
    throw new Error('Notification endpoints not yet implemented');
  }

  // === CHAT ENDPOINTS ===

  /**
   * Get chat rooms
   * GET /api/chat/rooms
   */
  async getChatRooms(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.room_type) queryParams.append('room_type', params.room_type);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `/api/chat/rooms${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Get chat room details
   * GET /api/chat/rooms/{roomId}
   */
  async getChatRoom(roomId) {
    const response = await this.makeRequest(`/api/chat/rooms/${roomId}`, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Create chat room
   * POST /api/chat/rooms
   */
  async createChatRoom(roomData) {
    const response = await this.makeRequest('/api/chat/rooms', {
      method: 'POST',
      requiresAuth: true,
      body: roomData
    });

    return response;
  }

  /**
   * Get chat messages
   * GET /api/chat/rooms/{roomId}/messages
   */
  async getChatMessages(roomId, params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `/api/chat/rooms/${roomId}/messages${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      requiresAuth: false
    });

    return response;
  }

  /**
   * Send chat message
   * POST /api/chat/rooms/{roomId}/messages
   */
  async sendChatMessage(roomId, messageData) {
    const response = await this.makeRequest(`/api/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      requiresAuth: true,
      body: messageData
    });

    return response;
  }

  /**
   * Join chat room
   * POST /api/chat/rooms/{roomId}/join
   */
  async joinChatRoom(roomId) {
    const response = await this.makeRequest(`/api/chat/rooms/${roomId}/join`, {
      method: 'POST',
      requiresAuth: true
    });

    return response;
  }

  /**
   * Leave chat room
   * POST /api/chat/rooms/{roomId}/leave
   */
  async leaveChatRoom(roomId) {
    const response = await this.makeRequest(`/api/chat/rooms/${roomId}/leave`, {
      method: 'POST',
      requiresAuth: true
    });

    return response;
  }

  // === ACHIEVEMENT ENDPOINTS ===
  // Note: These endpoints don't exist in Rust backend yet

  /**
   * Get all achievements
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getAchievements() {
    // TODO: Implement achievement endpoints in Rust backend
    logger.warn('getAchievements not yet implemented in Rust backend');
    throw new Error('Achievement endpoints not yet implemented');
  }

  /**
   * Get user achievements
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getUserAchievements(userId) {
    // TODO: Implement achievement endpoints in Rust backend
    logger.warn('getUserAchievements not yet implemented in Rust backend');
    throw new Error('Achievement endpoints not yet implemented');
  }

  // === USER TOURNAMENT ENDPOINTS ===
  // Note: These endpoints don't exist in Rust backend yet

  /**
   * Get user tournaments
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getUserTournaments(userId) {
    // TODO: Implement user tournament endpoints in Rust backend
    logger.warn('getUserTournaments not yet implemented in Rust backend');
    throw new Error('User tournament endpoints not yet implemented');
  }

  // === ADMIN ENDPOINTS ===
  // Note: These endpoints don't exist in Rust backend yet

  /**
   * Get admin stats
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getAdminStats() {
    // TODO: Implement admin endpoints in Rust backend
    logger.warn('getAdminStats not yet implemented in Rust backend');
    throw new Error('Admin endpoints not yet implemented');
  }

  /**
   * Get admin users
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getAdminUsers(params = {}) {
    // TODO: Implement admin endpoints in Rust backend
    logger.warn('getAdminUsers not yet implemented in Rust backend');
    throw new Error('Admin endpoints not yet implemented');
  }

  /**
   * Update user admin
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async updateUserAdmin(userId, userData) {
    // TODO: Implement admin endpoints in Rust backend
    logger.warn('updateUserAdmin not yet implemented in Rust backend');
    throw new Error('Admin endpoints not yet implemented');
  }

  // Legacy methods for backward compatibility
  async getMyPlayers() {
    return this.getUserPlayers();
  }

  async selectGameType(gameType) {
    // TODO: Implement game type selection in Rust backend
    logger.warn('selectGameType not yet implemented in Rust backend');
    throw new Error('Game type selection not yet implemented');
  }

  async createPlayer(playerData) {
    return this.addPlayer(playerData);
  }

  async getMapsByType(gameType) {
    // TODO: Implement map filtering by type in Rust backend
    logger.warn('getMapsByType not yet implemented in Rust backend');
    throw new Error('Map filtering not yet implemented');
  }

  async reportMatch(matchData) {
    return this.submitMatchReport(matchData);
  }

  async getPlayerDetails(playerName) {
    // TODO: Implement player details endpoint in Rust backend
    logger.warn('getPlayerDetails not yet implemented in Rust backend');
    throw new Error('Player details not yet implemented');
  }

  /**
   * Get the user's active clan (returns the first clan if multiple, or null if none)
   * Note: This endpoint doesn't exist in Rust backend yet
   */
  async getUserClan() {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('getUserClan not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  // === CLAN ENDPOINTS ===
  // Note: These endpoints don't exist in Rust backend yet

  /**
   * Get clans with filtering and pagination
   */
  async getClans(params = {}) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('getClans not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Search clans
   */
  async searchClans(params = {}) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('searchClans not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Create a new clan
   */
  async createClan(clanData) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('createClan not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Get clan members
   */
  async getClanMembers(clanId) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('getClanMembers not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Get clan applications
   */
  async getClanApplications(clanId) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('getClanApplications not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Apply to join a clan
   */
  async applyToClan(clanId, applicationData) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('applyToClan not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Invite player to clan
   */
  async inviteToClan(clanId, inviteData) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('inviteToClan not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Review clan application
   */
  async reviewClanApplication(clanId, applicationId, reviewData) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('reviewClanApplication not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Update clan settings
   */
  async updateClan(clanId, updateData) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('updateClan not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Leave clan
   */
  async leaveClan(clanId) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('leaveClan not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Transfer clan leadership
   */
  async transferClanLeadership(clanId, transferData) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('transferClanLeadership not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }

  /**
   * Delete clan (disband)
   */
  async deleteClan(clanId) {
    // TODO: Implement clan endpoints in Rust backend
    logger.warn('deleteClan not yet implemented in Rust backend');
    throw new Error('Clan endpoints not yet implemented');
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export both named and default
export { ApiClient, apiClient };
export default apiClient; 