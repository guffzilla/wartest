/**
 * Unified Profile UI Manager
 * 
 * Handles UI updates for the unified profile system
 * Supports different view modes: user, player, combined
 */
export class UnifiedProfileUI {
  constructor() {
    this.currentData = null;
    this.viewMode = 'combined';
    this.isOwnProfile = false;
    this.activeTab = 'overview';
    // Bind to profile data updates
    window.addEventListener('profileDataUpdated', (event) => {
      this.handleProfileDataUpdate(event.detail);
    });
  }
  /**
   * Handle profile data updates from UnifiedProfileManager
   */
  handleProfileDataUpdate(data) {
    this.currentData = data;
    this.viewMode = data.viewMode;
    this.isOwnProfile = data.isOwnProfile;
    this.renderProfile();
  }
  /**
   * Main render function
   */
  renderProfile() {
    if (!this.currentData) return;this.clearProfile();
    // Render based on view mode
    switch (this.viewMode) {
      case 'user':
        this.renderUserProfile();
        break;
      case 'player':
        this.renderPlayerProfile();
        break;
      case 'combined':
        this.renderCombinedProfile();
        break;
    }
    // Setup interactive elements
    this.setupInteractivity();
  }
  /**
   * Render user-only profile
   */
  renderUserProfile() {
    const { user } = this.currentData;
    if (!user) return;this.renderUserHeader(user);
    this.renderUserInfo(user);
    this.renderUserActivity();
  }
  /**
   * Render player-only profile
   */
  renderPlayerProfile() {
    const { players } = this.currentData;
    if (!players || players.length === 0) return;const primaryPlayer = players[0];
    this.renderPlayerHeader(primaryPlayer);
    this.renderPlayerStats(primaryPlayer);
    this.renderPlayerMatchHistory(primaryPlayer);
  }
  /**
   * Render combined user + player profile
   */
  renderCombinedProfile() {
    const { user, players } = this.currentData;
    // Render user header with player info
    this.renderCombinedHeader(user, players);
    // Render tabbed interface
    this.renderTabbedInterface();
  }
  /**
   * Render user header section
   */
  renderUserHeader(user) {
    const headerContainer = document.getElementById('profile-header');
    if (!headerContainer) return;headerContainer.innerHTML = `
      <div class="profile-header-content">
        <div class="profile-avatar">
          <img src="${user.avatar || '/assets/img/ranks/emblem.png'}" alt="${user.username}" />
        </div>
        <div class="profile-info">
          <h1 class="profile-username">${user.username}</h1>
          <p class="profile-display-name">${user.displayName || user.username}</p>
          ${user.bio ? `<p class="profile-bio">${user.bio}</p>` : ''}
          <div class="profile-stats">
            <span class="stat">
              <i class="fas fa-trophy"></i>
              Honor: ${user.honor || 0}
            </span>
            <span class="stat">
              <i class="fas fa-coins"></i>
              Arena Gold: ${user.arenaGold || 0}
            </span>
            <span class="stat">
              <i class="fas fa-star"></i>
              Level: ${user.achievementLevel || 1}
            </span>
          </div>
        </div>
        ${this.isOwnProfile ? this.renderEditButton() : this.renderActionButtons(user)}
      </div>
    `;
  }
  /**
   * Render player header section
   */
  renderPlayerHeader(player) {
    const headerContainer = document.getElementById('profile-header');
    if (!headerContainer) return;headerContainer.innerHTML = `
      <div class="profile-header-content">
        <div class="profile-avatar">
          <img src="${player.rank?.image || '/assets/img/ranks/emblem.png'}" alt="${player.name}" />
        </div>
        <div class="profile-info">
          <h1 class="profile-username">${player.name}</h1>
          <p class="profile-game-type">${this.formatGameType(player.gameType)}</p>
          <div class="profile-stats">
            <span class="stat">
              <i class="fas fa-trophy"></i>
              MMR: ${player.mmr || 1500}
            </span>
            <span class="stat">
              <i class="fas fa-medal"></i>
              Rank: ${player.rank?.name || 'Unranked'}
            </span>
            <span class="stat">
              <i class="fas fa-chart-line"></i>
              Win Rate: ${this.calculateWinRate(player)}%
            </span>
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Render combined header with user + player info
   */
  renderCombinedHeader(user, players) {
    const headerContainer = document.getElementById('profile-header');
    if (!headerContainer) return;const highestMMRPlayer = this.getHighestMMRPlayer(players);
    headerContainer.innerHTML = `
      <div class="profile-header-content">
        <div class="profile-avatar">
          <img src="${user?.avatar || highestMMRPlayer?.rank?.image || '/assets/img/ranks/emblem.png'}" 
               alt="${user?.username || 'Player'}" />
        </div>
        <div class="profile-info">
          <h1 class="profile-username">${user?.username || 'Unknown User'}</h1>
          ${user?.displayName ? `<p class="profile-display-name">${user.displayName}</p>` : ''}
          ${user?.bio ? `<p class="profile-bio">${user.bio}</p>` : ''}
          <div class="profile-stats">
            ${user ? `
              <span class="stat">
                <i class="fas fa-trophy"></i>
                Honor: ${user.honor || 0}
              </span>
            ` : ''}
            ${highestMMRPlayer ? `
              <span class="stat">
                <i class="fas fa-gamepad"></i>
                Highest MMR: ${highestMMRPlayer.mmr}
              </span>
            ` : ''}
            <span class="stat">
              <i class="fas fa-users"></i>
              Players: ${players.length}
            </span>
          </div>
        </div>
        ${this.isOwnProfile ? this.renderEditButton() : this.renderActionButtons(user)}
      </div>
    `;
  }
  /**
   * Render tabbed interface for combined view
   */
  renderTabbedInterface() {
    const contentContainer = document.getElementById('profile-content');
    if (!contentContainer) return;const { user, players } = this.currentData;
    contentContainer.innerHTML = `
      <div class="profile-tabs">
        <nav class="tab-nav">
          <button class="tab-button ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
            <i class="fas fa-home"></i> Overview
          </button>
          ${user ? `
            <button class="tab-button ${this.activeTab === 'profile' ? 'active' : ''}" data-tab="profile">
              <i class="fas fa-user"></i> Profile
            </button>
          ` : ''}
          ${players.length > 0 ? `
            <button class="tab-button ${this.activeTab === 'players' ? 'active' : ''}" data-tab="players">
              <i class="fas fa-gamepad"></i> Players
            </button>
          ` : ''}
          <button class="tab-button ${this.activeTab === 'activity' ? 'active' : ''}" data-tab="activity">
            <i class="fas fa-chart-line"></i> Activity
          </button>
        </nav>
        <div class="tab-content">
          <div id="tab-overview" class="tab-pane ${this.activeTab === 'overview' ? 'active' : ''}">
            ${this.renderOverviewTab()}
          </div>
          ${user ? `
            <div id="tab-profile" class="tab-pane ${this.activeTab === 'profile' ? 'active' : ''}">
              ${this.renderProfileTab(user)}
            </div>
          ` : ''}
          ${players.length > 0 ? `
            <div id="tab-players" class="tab-pane ${this.activeTab === 'players' ? 'active' : ''}">
              ${this.renderPlayersTab(players)}
            </div>
          ` : ''}
          <div id="tab-activity" class="tab-pane ${this.activeTab === 'activity' ? 'active' : ''}">
            ${this.renderActivityTab()}
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Render overview tab content
   */
  renderOverviewTab() {
    const { user, players } = this.currentData;
    return `
      <div class="overview-content">
        ${user ? `
          <div class="overview-section">
            <h3><i class="fas fa-user"></i> User Summary</h3>
            <div class="user-summary">
              <p><strong>Member since:</strong> ${this.formatDate(user.registeredAt)}</p>
              ${user.lastLogin ? `<p><strong>Last seen:</strong> ${this.formatDate(user.lastLogin)}</p>` : ''}
              <p><strong>Achievement Level:</strong> ${user.achievementLevel || 1}</p>
            </div>
          </div>
        ` : ''}
        ${players.length > 0 ? `
          <div class="overview-section">
            <h3><i class="fas fa-gamepad"></i> Player Summary</h3>
            <div class="players-summary">
              ${players.map(player => `
                <div class="player-card">
                  <img src="${player.rank?.image || '/assets/img/ranks/emblem.png'}" alt="${player.rank?.name}" />
                  <div class="player-info">
                    <h4>${player.name}</h4>
                    <p>${this.formatGameType(player.gameType)}</p>
                    <p>MMR: ${player.mmr} | ${player.rank?.name || 'Unranked'}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;}
  /**
   * Render profile tab content
   */
  renderProfileTab(user) {
    return `
      <div class="profile-details">
        <h3><i class="fas fa-info-circle"></i> Profile Information</h3>
        <div class="profile-fields">
          <div class="field">
            <label>Username:</label>
            <span>${user.username}</span>
          </div>
          ${user.displayName ? `
            <div class="field">
              <label>Display Name:</label>
              <span>${user.displayName}</span>
            </div>
          ` : ''}
          ${user.bio ? `
            <div class="field">
              <label>Bio:</label>
              <span>${user.bio}</span>
            </div>
          ` : ''}
          ${user.location ? `
            <div class="field">
              <label>Location:</label>
              <span>${user.location}</span>
            </div>
          ` : ''}
        </div>
        ${user.socialLinks && (user.socialLinks.youtube || user.socialLinks.twitch) ? `
          <h3><i class="fas fa-share-alt"></i> Social Links</h3>
          <div class="social-links">
            ${user.socialLinks.youtube ? `
              <a href="${user.socialLinks.youtube}" target="_blank" class="social-link youtube">
                <i class="fab fa-youtube"></i> YouTube
              </a>
            ` : ''}
            ${user.socialLinks.twitch ? `
              <a href="${user.socialLinks.twitch}" target="_blank" class="social-link twitch">
                <i class="fab fa-twitch"></i> Twitch
              </a>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;}
  /**
   * Render players tab content
   */
  renderPlayersTab(players) {
    return `
      <div class="players-content">
        <h3><i class="fas fa-gamepad"></i> Game Players</h3>
        <div class="players-grid">
          ${players.map(player => `
            <div class="player-detailed-card">
              <div class="player-header">
                <img src="${player.rank?.image || '/assets/img/ranks/emblem.png'}" alt="${player.rank?.name}" />
                <div>
                  <h4>${player.name}</h4>
                  <p>${this.formatGameType(player.gameType)}</p>
                </div>
              </div>
              <div class="player-stats">
                <div class="stat">
                  <label>MMR:</label>
                  <span>${player.mmr || 1500}</span>
                </div>
                <div class="stat">
                  <label>Rank:</label>
                  <span>${player.rank?.name || 'Unranked'}</span>
                </div>
                <div class="stat">
                  <label>Matches:</label>
                  <span>${player.stats?.totalMatches || 0}</span>
                </div>
                <div class="stat">
                  <label>Win Rate:</label>
                  <span>${this.calculateWinRate(player)}%</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;}
  /**
   * Render activity tab content
   */
  renderActivityTab() {
    const { tournaments, maps, forumActivity } = this.currentData.cache || {};
    return `
      <div class="activity-content">
        <h3><i class="fas fa-chart-line"></i> Recent Activity</h3>
        ${tournaments && tournaments.length > 0 ? `
          <div class="activity-section">
            <h4><i class="fas fa-trophy"></i> Tournament Activity</h4>
            <div class="activity-list">
              ${tournaments.slice(0, 5).map(tournament => `
                <div class="activity-item">
                  <span class="activity-title">${tournament.name}</span>
                  <span class="activity-date">${this.formatDate(tournament.date)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${maps && maps.length > 0 ? `
          <div class="activity-section">
            <h4><i class="fas fa-map"></i> Map Contributions</h4>
            <div class="activity-list">
              ${maps.slice(0, 5).map(map => `
                <div class="activity-item">
                  <span class="activity-title">${map.name}</span>
                  <span class="activity-date">${this.formatDate(map.uploadedAt)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${forumActivity && forumActivity.length > 0 ? `
          <div class="activity-section">
            <h4><i class="fas fa-comments"></i> Forum Activity</h4>
            <div class="activity-list">
              ${forumActivity.slice(0, 5).map(post => `
                <div class="activity-item">
                  <span class="activity-title">${post.title}</span>
                  <span class="activity-date">${this.formatDate(post.createdAt)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;}
  /**
   * Setup interactive elements
   */
  setupInteractivity() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });
    // Edit button functionality
    const editButton = document.querySelector('.edit-profile-btn');
    if (editButton) {
      editButton.addEventListener('click', () => {
        this.showEditModal();
      });
    }
  }
  /**
   * Switch active tab
   */
  switchTab(tabName) {
    this.activeTab = tabName;
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });
  }
  /**
   * Utility functions
   */
  formatGameType(gameType) {
    const gameTypeMap = {
      'war1': 'Warcraft 1',
      'warcraft1': 'Warcraft 1',
      'war2': 'Warcraft 2',
      'warcraft2': 'Warcraft 2',
      'war3': 'Warcraft 3',
      'warcraft3': 'Warcraft 3'
    };
    return gameTypeMap[gameType] || gameType;}
  calculateWinRate(player) {
    if (!player.stats || !player.stats.totalMatches || player.stats.totalMatches === 0) {
      return 0;}
    return Math.round((player.stats.wins / player.stats.totalMatches) * 100);}
  getHighestMMRPlayer(players) {
    if (!players || players.length === 0) return null;return players.reduce((highest, current) => 
      (current.mmr || 0) > (highest.mmr || 0) ? current : highest
    );}
  formatDate(dateString) {
    if (!dateString) return 'Unknown';return new Date(dateString).toLocaleDateString();}
  renderEditButton() {
    return `
      <div class="profile-actions">
        <button class="btn btn-primary edit-profile-btn">
          <i class="fas fa-edit"></i> Edit Profile
        </button>
      </div>
    `;}
  renderActionButtons(user) {
    return `
      <div class="profile-actions">
        <button class="btn btn-secondary message-btn" data-user-id="${user.id}">
          <i class="fas fa-envelope"></i> Message
        </button>
        <button class="btn btn-secondary follow-btn" data-user-id="${user.id}">
          <i class="fas fa-user-plus"></i> Follow
        </button>
      </div>
    `;}
  clearProfile() {
    const containers = ['profile-header', 'profile-content'];
    containers.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = '';
      }
    });
  }
  showEditModal() {
    // TODO: Implement edit modal
  }
}
// Create singleton instance
export const unifiedProfileUI = new UnifiedProfileUI();
export default unifiedProfileUI;
