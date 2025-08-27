/**
 * CLAN MANAGEMENT SYSTEM
 * Handles clan operations, rendering, and interactions
 * Extracted from townhall.html for better maintainability
 */
import logger from '/js/utils/logger.js';

class ClanManager {
  constructor() {
    this.currentClan = null;
    this.availableClans = [];
    this.init();
  }

  init() {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    try {
      await this.loadUserClan();

    } catch (error) {
      logger.error('Error initializing clan management:', error);
    }
  }

  /**
   * Load user's current clan
   */
  async loadUserClan() {
    try {
      const response = await fetch('/api/clans/user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const clans = await response.json();
        this.currentClan = clans && clans.length > 0 ? clans[0] : null;
        this.renderClanSection(this.currentClan);
      } else if (response.status === 404 || response.status === 401) {
        // User not in any clan or not authenticated
        this.currentClan = null;
        this.renderClanSection(null);
      } else {
        logger.error('Failed to load user clan:', response.status);
        this.renderClanSection(null);
      }
    } catch (error) {
      logger.error('Error loading user clan:', error);
      this.renderClanSection(null);
    }
  }

  /**
   * Render the clan section based on user's clan status
   */
  renderClanSection(clan, containerOverride = null) {
    const container = containerOverride || document.getElementById('clan-container');
    if (!container) return;if (clan) {
      // User is in a clan - New improved design
      container.innerHTML = `
        <div class="clan-encampment-container">
          <!-- Clan Header - Compact and Clean -->
          <div class="clan-header-compact">
            <div class="clan-logo-section">
              <div class="clan-logo">
                <i class="fas fa-shield-alt"></i>
              </div>
              <div class="clan-badge">[${clan.tag}]</div>
            </div>
            
            <div class="clan-info-section">
              <h2 class="clan-name">${clan.name}</h2>
              <div class="clan-meta">
                <span class="clan-role">
                  <i class="fas fa-crown"></i>
                  ${this.getUserRoleInClan(clan)}
                </span>
                <span class="clan-game">
                <i class="fas fa-gamepad"></i>
                ${this.getGameDisplayName(clan.gameType)}
                </span>
            </div>
          </div>
          
            <div class="clan-stats-compact">
              <div class="stat-item">
                <span class="stat-number">${clan.members ? clan.members.length : 0}</span>
                <span class="stat-label">Members</span>
            </div>
              <div class="stat-item">
                <span class="stat-number">${clan.level || 1}</span>
                <span class="stat-label">Level</span>
            </div>
              <div class="stat-item">
                <span class="stat-number">${clan.rating || 1500}</span>
                <span class="stat-label">Rating</span>
            </div>
            </div>
            </div>

          <!-- Clan Description -->
          ${clan.description ? `
            <div class="clan-description-section">
              <p class="clan-description-text">${clan.description}</p>
          </div>
          ` : ''}

          <!-- Main Action Buttons -->
          <div class="clan-main-actions">
            <button class="clan-action-btn primary" onclick="window.clanManager.openClanGarrison()">
              <i class="fas fa-comments"></i>
              <span>Clan Garrison Chat</span>
            </button>
            
            <button class="clan-action-btn secondary" onclick="window.clanManager.openStoneTabletClan()">
              <i class="fas fa-scroll"></i>
              <span>Stone Tablet</span>
            </button>
            
            ${this.isUserClanLeader(clan) ? `
              <button class="clan-action-btn secondary" onclick="window.clanManager.manageClan('${clan._id}')">
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
                <span>Members (${clan.members ? clan.members.length : 0})</span>
              </button>
              ${this.isUserClanLeader(clan) ? `
                <button class="clan-tab" data-tab="applications">
                  <i class="fas fa-inbox"></i>
                  <span>Applications</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Tab Content -->
          <div class="clan-tab-content active" id="overview-tab">
            <div class="clan-overview">
              <div class="overview-section">
                <h3>Clan Statistics</h3>
                <div class="stats-grid">
                  <div class="stat-card">
                    <h4>Win Rate</h4>
                    <span class="stat-number">${this.calculateWinRate(clan)}%</span>
                  </div>
                  <div class="stat-card">
                    <h4>Average MMR</h4>
                    <span class="stat-number">${this.calculateAverageMMR(clan)}</span>
                  </div>
                  <div class="stat-card">
                    <h4>Founded</h4>
                    <span class="stat-number">${this.formatDate(clan.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div class="overview-section">
                <h3>Recent Members</h3>
                <div class="recent-members">
                  ${this.renderRecentMembers(clan)}
                </div>
              </div>
            </div>
          </div>

          <div class="clan-tab-content" id="members-tab">
            <div class="members-container">
              <div class="members-header">
                <h3>Clan Members</h3>
                ${this.isUserClanLeader(clan) ? `
                  <button class="invite-btn" onclick="window.clanManager.showInvitePlayerModal()">
                    <i class="fas fa-plus"></i>
                    Invite Player
                  </button>
                ` : ''}
              </div>
              <div class="members-grid">
                ${this.renderClanMembers(clan)}
              </div>
            </div>
          </div>

          ${this.isUserClanLeader(clan) ? `
            <div class="clan-tab-content" id="applications-tab">
              <div class="applications-container">
                <div class="applications-header">
                  <h3>Pending Applications</h3>
                </div>
                <div class="applications-list">
                  ${this.renderPendingApplications(clan)}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Bottom Actions -->
          <div class="clan-bottom-actions">
            <button class="clan-action-btn danger" onclick="window.clanManager.leaveClan('${clan._id}')">
              <i class="fas fa-sign-out-alt"></i>
              <span>Leave Clan</span>
            </button>
          </div>
        </div>
      `;

      // Add custom styles and setup tab navigation
      this.addClanEncampmentStyles();
      this.setupClanTabNavigation(container);
    } else {
      // User is not in a clan
      container.innerHTML = `
        <div class="no-clan-message">
          <i class="fas fa-shield-alt"></i>
          <h4>No Clan</h4>
          <p>You're not currently a member of any clan. Join or create one to connect with other players!</p>
          
          <div class="clan-actions">
            <button class="epic-btn" onclick="window.clanManager.showCreateClanModal()">
              <i class="fas fa-plus"></i>
              Create Clan
            </button>
            <button class="epic-btn" onclick="window.clanManager.showFindClansModal()">
              <i class="fas fa-search"></i>
              Find Clans
            </button>
            <button class="epic-btn" onclick="window.clanManager.openStoneTabletClan()">
              <i class="fas fa-tablet-alt"></i>
              Stone Tablet
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Get user's role in the clan
   */
  getUserRoleInClan(clan) {
    if (!clan || !clan.members) return 'Member';const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return 'Member';const member = clan.members.find(m => m.user === currentUserId || m.user._id === currentUserId);
    if (!member) return 'Member';return member.role.charAt(0).toUpperCase() + member.role.slice(1);}

  /**
   * Check if user is clan leader
   */
  isUserClanLeader(clan) {
    if (!clan) return false;const currentUserId = this.getCurrentUserId();
    return clan.leader === currentUserId || clan.leader._id === currentUserId;}

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    return window.currentUser?.id || window.currentUser?._id;}

  /**
   * Get display name for game type
   */
  getGameDisplayName(gameType) {
    const gameNames = {
          'wc1': 'Warcraft: Orcs & Humans',
    'wc2': 'Warcraft II',
    'wc3': 'Warcraft III',
      'wc12': 'Warcraft 1 & 2',
      'wc3': 'Warcraft 3'
    };
    return gameNames[gameType] || gameType;}

  /**
   * Show create clan modal
   */
  async showCreateClanModal() {
    const modal = document.getElementById('create-clan-modal');
    if (modal) {
      modal.style.display = 'block';
      
      // Load user's players for the clan creation
      try {
        const players = await this.getUserPlayers();
        
  } catch (error) {
    logger.error('Error loading players:', error);
  }
    }
  }

  /**
   * Show find clans modal
   */
  async showFindClansModal() {
    const modal = document.getElementById('find-clans-modal');
    if (modal) {
      modal.style.display = 'block';
      await this.loadAvailableClans();
    }
  }

  /**
   * Load available clans to join
   */
  async loadAvailableClans() {
    try {
      const response = await fetch('/api/clans?status=active&limit=20', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const clans = await response.json();
        this.availableClans = clans;
        this.renderAvailableClans(clans);
      } else {
        logger.error('Failed to load clans:', response.status);
      }
    } catch (error) {
      logger.error('Error loading clans:', error);
    }
  }

  /**
   * Render available clans list
   */
  renderAvailableClans(clans) {
    const container = document.getElementById('clans-list');
    if (!container) return;if (clans.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h4>No Clans Found</h4>
          <p>No clans match your search criteria.</p>
        </div>
      `;
      return;}

    container.innerHTML = clans.map(clan => `
      <div class="clan-search-result">
        <div class="clan-result-header">
          <div class="clan-result-tag">[${clan.tag}]</div>
          <div class="clan-result-game">
            <i class="fas fa-gamepad"></i>
            ${this.getGameDisplayName(clan.gameType)}
          </div>
        </div>
        <div class="clan-result-content">
          <h4 class="clan-result-name">${clan.name}</h4>
          <p class="clan-result-description">${clan.description || 'No description provided'}</p>
          <div class="clan-result-stats">
            <span><i class="fas fa-users"></i> ${clan.memberCount || 0} members</span>
            <span><i class="fas fa-star"></i> Level ${clan.level || 1}</span>
            <span><i class="fas fa-trophy"></i> ${clan.rating || 1500} rating</span>
          </div>
        </div>
        <div class="clan-result-actions">
          <button class="epic-btn" onclick="window.clanManager.showJoinClanModal('${clan._id}')">
            <i class="fas fa-handshake"></i>
            Apply to Join
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Show join clan modal with clan details
   */
  async showJoinClanModal(clanId) {
    try {
      // Get clan details
      const clanResponse = await fetch(`/api/clans/${clanId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!clanResponse.ok) {
        throw new Error('Failed to load clan details');
      }

      const clan = await clanResponse.json();
      
      // Get user's players
      const players = await this.getUserPlayers();
      
      if (players.length === 0) {
        this.showFeedback('You need to add a player to your profile before joining a clan.');
        return;}

      // Show the join clan modal
      const modal = document.getElementById('join-clan-modal');
      if (modal) {
        // Update clan details
        const detailsContainer = document.getElementById('join-clan-details');
        if (detailsContainer) {
          detailsContainer.innerHTML = `
            <div class="join-clan-info">
              <h3>[${clan.tag}] ${clan.name}</h3>
              <p>${clan.description || 'No description provided'}</p>
              <div class="join-clan-stats">
                <span><i class="fas fa-users"></i> ${clan.memberCount || 0} members</span>
                <span><i class="fas fa-gamepad"></i> ${this.getGameDisplayName(clan.gameType)}</span>
              </div>
            </div>
          `;
        }
        
        modal.style.display = 'block';
        modal.dataset.clanId = clanId;
      }
    } catch (error) {
      logger.error('Error showing join clan modal:', error);
      this.showFeedback('Failed to load clan information.');
    }
  }

  /**
   * Get user's players
   */
  async getUserPlayers() {
    try {
      const response = await fetch('/api/players/user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        return await response.json();} else {
        logger.error('Failed to load user players:', response.status);
        return [];}
    } catch (error) {
      logger.error('Error loading user players:', error);
      return [];}
  }

  /**
   * View clan details (redirect to clan page)
   */
  async viewClanDetails(clanId) {
    window.location.href = `/clans/${clanId}`;
  }

  /**
   * Manage clan (redirect to management page)
   */
  async manageClan(clanId) {
    window.location.href = `/clans/${clanId}/manage`;
  }

  /**
   * Open clan garrison (clan chat room)
   */
  async openClanGarrison() {
    if (!this.currentClan) {
      this.showFeedback('You must be in a clan to access the garrison.');
      return;}
    

    
    // Simple modal close - target the profile modal that contains the clan encampment
    const profileModal = document.querySelector('.profile-section-modal-overlay.show');
    if (profileModal) {
      profileModal.classList.remove('show');
      document.body.classList.remove('modal-open');
      
    }
    
    // Simple chat open - use the existing chat manager
    if (window.chatManager) {
      window.chatManager.showFloatingWindow();
      window.chatManager.switchContext('clan');
      
    } else {
      
      // Fallback: redirect to stone tablet
      window.location.href = '/views/stone-tablet.html?game=clan&context=garrison';
    }
  }

  /**
   * Open stone tablet clan tab
   */
  async openStoneTabletClan() {
    window.location.href = '/views/stone-tablet.html?game=clan';
  }

  /**
   * Leave current clan
   */
  async leaveClan(clanId) {
    if (!confirm('Are you sure you want to leave this clan?')) {
      return;}

    try {
      const response = await fetch(`/api/clans/${clanId}/leave`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        this.showFeedback('Successfully left the clan.');
        await this.loadUserClan(); // Refresh the clan section
      } else {
        const error = await response.json();
        this.showFeedback(`Failed to leave clan: ${error.message}`);
      }
    } catch (error) {
      logger.error('Error leaving clan:', error);
      this.showFeedback('Failed to leave clan. Please try again.');
    }
  }

  /**
   * Join a clan
   */
  async joinClan(clanId, playerId) {
    try {
      const response = await fetch(`/api/clans/${clanId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId })
      });

      if (response.ok) {
        this.showFeedback('Application submitted successfully!');
        await this.loadUserClan(); // Refresh the clan section
        
        // Close the join modal
        const modal = document.getElementById('join-clan-modal');
        if (modal) {
          modal.style.display = 'none';
        }
      } else {
        const error = await response.json();
        this.showFeedback(`Failed to join clan: ${error.message}`);
      }
    } catch (error) {
      logger.error('Error joining clan:', error);
      this.showFeedback('Failed to join clan. Please try again.');
    }
  }

  /**
   * Create a new clan
   */
  async createClan(clanData) {
    try {
      const response = await fetch('/api/clans', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clanData)
      });

      if (response.ok) {
        const newClan = await response.json();
        this.showFeedback('Clan created successfully!');
        await this.loadUserClan(); // Refresh the clan section
        
        // Close the create modal
        const modal = document.getElementById('create-clan-modal');
        if (modal) {
          modal.style.display = 'none';
        }
        
        return newClan;} else {
        const error = await response.json();
        this.showFeedback(`Failed to create clan: ${error.message}`);
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Error creating clan:', error);
      this.showFeedback('Failed to create clan. Please try again.');
      throw error;
    }
  }

  /**
   * Show feedback message to user
   */
  showFeedback(message) {
    // Simple feedback display
    const feedback = document.createElement('div');
    feedback.className = 'feedback-message';
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.remove();
    }, 3000);
  }

  // Helper methods for the new clan encampment design
  calculateWinRate(clan) {
    const wins = clan.wins || 0;
    const losses = clan.losses || 0;
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;}

  calculateAverageMMR(clan) {
    if (!clan.members || clan.members.length === 0) return 1500;const totalMMR = clan.members.reduce((sum, member) => sum + (member.mmr || 1500), 0);
    return Math.round(totalMMR / clan.members.length);}

  formatDate(dateString) {
    if (!dateString) return 'Unknown';const date = new Date(dateString);
    return date.toLocaleDateString();}

  getMemberDisplayName(member) {
    return (
      member?.username ||
      member?.user?.username ||
      member?.user?.name ||
      member?.user?.displayName ||
      'Unknown'
    );}

  renderRecentMembers(clan) {
    if (!clan.members || clan.members.length === 0) {
      return '<p class="no-members">No members yet</p>';}
    
    const recentMembers = clan.members.slice(0, 3);
    return recentMembers.map(member => `
      <div class="member-card">
        <div class="member-header">
          <div class="member-avatar">${this.getMemberDisplayName(member).charAt(0).toUpperCase()}</div>
          <div class="member-info">
            <h4>${this.getMemberDisplayName(member)}</h4>
            <span class="member-role">${member.role || 'Member'}</span>
          </div>
        </div>
        <div class="member-stats">
          <div class="member-stat">
            <span class="member-stat-value">${member.mmr || 1500}</span>
            <span class="member-stat-label">MMR</span>
          </div>
          <div class="member-stat">
            <span class="member-stat-value">${member.wins || 0}</span>
            <span class="member-stat-label">Wins</span>
          </div>
        </div>
      </div>
    `).join('');}

  renderClanMembers(clan) {
    if (!clan.members || clan.members.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h3>No Members</h3>
          <p>This clan has no members yet.</p>
        </div>
      `;}
    
    return clan.members.map(member => `
      <div class="member-card">
        <div class="member-header">
          <div class="member-avatar">${this.getMemberDisplayName(member).charAt(0).toUpperCase()}</div>
          <div class="member-info">
            <h4>${this.getMemberDisplayName(member)}</h4>
            <span class="member-role">${member.role || 'Member'}</span>
          </div>
        </div>
        <div class="member-stats">
          <div class="member-stat">
            <span class="member-stat-value">${member.mmr || 1500}</span>
            <span class="member-stat-label">MMR</span>
          </div>
          <div class="member-stat">
            <span class="member-stat-value">${member.wins || 0}</span>
            <span class="member-stat-label">Wins</span>
          </div>
          <div class="member-stat">
            <span class="member-stat-value">${member.losses || 0}</span>
            <span class="member-stat-label">Losses</span>
          </div>
        </div>
      </div>
    `).join('');}

  renderPendingApplications(clan) {
    // This would be populated with actual application data
    return `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Pending Applications</h3>
        <p>All applications have been reviewed.</p>
      </div>
    `;}

  addClanEncampmentStyles() {
    const styleId = 'clan-encampment-styles';
    if (document.getElementById(styleId)) {
      document.getElementById(styleId).remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Clan Encampment Styles */
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

      .clan-overview {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .overview-section {
        margin-bottom: 24px;
      }

      .overview-section:last-child {
        margin-bottom: 0;
      }

      .overview-section h3 {
        color: #ffd700;
        margin-bottom: 16px;
        font-size: 18px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 16px;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }

      .stat-card h4 {
        margin: 0 0 8px 0;
        color: #b8c5d6;
        font-size: 14px;
        font-weight: 500;
      }

      .stat-card .stat-number {
        font-size: 24px;
        font-weight: 700;
        color: #4ecdc4;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .recent-members {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
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

  setupClanTabNavigation() {
    // Scope to the current container to avoid selecting elements outside the modal
    const root = document.querySelector('.clan-encampment-container')?.parentElement || document;
    const tabs = root.querySelectorAll('.clan-tab');
    const tabContents = root.querySelectorAll('.clan-tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }
}

// Global instance and exports
window.ClanManager = ClanManager;
const clanManager = new ClanManager();
window.clanManager = clanManager;

// Ensure clan manager is properly available


// Verify methods are available
const requiredMethods = ['viewClanDetails', 'manageClan', 'leaveClan', 'openClanGarrison', 'openStoneTabletClan', 'showCreateClanModal', 'showFindClansModal'];
requiredMethods.forEach(method => {
  if (typeof clanManager[method] !== 'function') {
    logger.error(`❌ Clan manager method missing: ${method}`);
  } else {
    
  }
});

// Export functions for backward compatibility
window.initClanManagement = () => {
  if (clanManager && typeof clanManager.initialize === 'function') {
    return clanManager.initialize();} else {
    logger.error('❌ Clan manager not available for initialization');
  }
};

window.loadUserClan = () => {
  if (clanManager && typeof clanManager.loadUserClan === 'function') {
    return clanManager.loadUserClan();} else {
    logger.error('❌ Clan manager not available for loading user clan');
  }
};

window.showCreateClanModal = () => {
  if (clanManager && typeof clanManager.showCreateClanModal === 'function') {
    return clanManager.showCreateClanModal();} else {
    logger.error('❌ Clan manager not available for showing create clan modal');
  }
};

window.showFindClansModal = () => {
  if (clanManager && typeof clanManager.showFindClansModal === 'function') {
    return clanManager.showFindClansModal();} else {
    logger.error('❌ Clan manager not available for showing find clans modal');
  }
};

window.showJoinClanModal = (clanId) => {
  if (clanManager && typeof clanManager.showJoinClanModal === 'function') {
    return clanManager.showJoinClanModal(clanId);} else {
    logger.error('❌ Clan manager not available for showing join clan modal');
  }
};

window.viewClanDetails = (clanId) => {
  if (clanManager && typeof clanManager.viewClanDetails === 'function') {
    return clanManager.viewClanDetails(clanId);} else {
    logger.error('❌ Clan manager not available for viewing clan details');
  }
};

window.manageClan = (clanId) => {
  if (clanManager && typeof clanManager.manageClan === 'function') {
    return clanManager.manageClan(clanId);} else {
    logger.error('❌ Clan manager not available for managing clan');
  }
};

window.leaveClan = (clanId) => {
  if (clanManager && typeof clanManager.leaveClan === 'function') {
    return clanManager.leaveClan(clanId);} else {
    logger.error('❌ Clan manager not available for leaving clan');
  }
};

window.openClanGarrison = () => {
  if (clanManager && typeof clanManager.openClanGarrison === 'function') {
    return clanManager.openClanGarrison();} else {
    logger.error('❌ Clan manager not available for opening clan garrison');
  }
};

window.openStoneTabletClan = () => {
  if (clanManager && typeof clanManager.openStoneTabletClan === 'function') {
    return clanManager.openStoneTabletClan();} else {
    logger.error('❌ Clan manager not available for opening stone tablet clan');
  }
};

 