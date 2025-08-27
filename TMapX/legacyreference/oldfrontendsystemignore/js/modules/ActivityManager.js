/**
 * ActivityManager.js - Activity & Content Management Module
 * Handles tournaments, forum posts, maps, reports, and activity tabs
 */
import logger from '/js/utils/logger.js';
import { apiClient } from './ApiClient.js';

export class ActivityManager {
  constructor() {
    this.tournaments = [];
    this.reports = [];
    this.forumPosts = [];
    this.userMaps = [];
    this.currentTab = 'tournaments';
  }

  /**
   * Initialize activity management functionality
   */
  async initialize() {
    try {
  
      
      this.setupActivityTabs();
      
      // Load initial data for the default tab
      await this.loadTabContent(this.currentTab);
      
      
    } catch (error) {
      logger.error('❌ Activity manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup activity tab functionality
   */
  setupActivityTabs() {
    const tabs = document.querySelectorAll('.activity-tab');
    const contents = document.querySelectorAll('.activity-content');

    // Debug info
    // tabsFound: tabs.length,
    // contentsFound: contents.length

    tabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update content visibility
        contents.forEach(content => {
          content.style.display = content.id === `${tabName}-tab` ? 'block' : 'none';
        });
        
        // Load content for the selected tab
        this.currentTab = tabName;
        await this.loadTabContent(tabName);
      });
    });

    // FIXED: Set first tab as active by default if no tab is already active
    const activeTab = document.querySelector('.activity-tab.active');
    if (!activeTab && tabs.length > 0) {

      const firstTab = tabs[0];
      const tabName = firstTab.dataset.tab;
      
      // Set first tab as active
      firstTab.classList.add('active');
      
      // Show corresponding content and hide others
      contents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
          content.style.display = 'block';
        } else {
          content.style.display = 'none';
        }
      });
      
      // Update current tab
      this.currentTab = tabName;
      
    } else if (activeTab) {
      // If there's already an active tab, make sure its content is visible
      const tabName = activeTab.dataset.tab;
      this.currentTab = tabName;
      contents.forEach(content => {
        content.style.display = content.id === `${tabName}-tab` ? 'block' : 'none';
      });
      
    }
  }

  /**
   * Load activity content for specific tab
   */
  async loadTabContent(tabName) {
    try {

      
      switch(tabName) {
        case 'tournaments':
          await this.loadUserTournaments();
          break;
        case 'forum':
          await this.loadForumActivity();
          break;
        case 'maps':
          await this.loadUserMapsTab();
          break;
        case 'reports':
          await this.loadReports();
          break;
        default:
          logger.warn('Unknown tab:', tabName);
      }
    } catch (error) {
      logger.error(`Error loading ${tabName} content:`, error);
      this.showTabError(tabName, 'Failed to load content');
    }
  }

  /**
   * Load user tournaments with pagination
   */
  async loadUserTournaments(page = 1) {
    const container = document.getElementById('tournaments-container');
    if (!container) return;try {
      // Show loading state
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tournaments...</div>';

      const user = await apiClient.getCurrentUser();
      if (!user) throw new Error('Failed to get user data');
      
      const response = await apiClient.getUserTournaments(user.id || user._id);

      if (!response || !response.tournaments) {
        container.innerHTML = this.createStyledEmptyState(
          'fas fa-trophy',
          'No Tournament Activity Yet',
          'You haven\'t participated in any tournaments yet.',
          'Browse Tournaments',
          '/views/tournaments.html'
        );
        return;
      }

      this.tournaments = response.tournaments;

      if (this.tournaments.length === 0) {
        container.innerHTML = this.createStyledEmptyState(
          'fas fa-trophy',
          'No Tournament Activity Yet',
          'You haven\'t participated in any tournaments yet.',
          'Browse Tournaments',
          '/views/tournaments.html'
        );
        return;}

      // Display tournaments with pagination
      this.displayTournaments(container, page);

    } catch (error) {
      logger.error('Error loading tournaments:', error);
      container.innerHTML = this.createErrorMessage('Failed to load tournaments');
    }
  }

  /**
   * Display tournaments with pagination
   */
  displayTournaments(container, page = 1) {
    const itemsPerPage = 5;
    const totalPages = Math.ceil(this.tournaments.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageTournaments = this.tournaments.slice(startIndex, endIndex);

    const tournamentsHTML = currentPageTournaments.map(tournament => `
      <div class="tournament-card">
        <div class="tournament-info">
          <h3 class="tournament-name">${tournament.name}</h3>
          <div class="tournament-meta">
            <span class="tournament-date">
              <i class="fas fa-calendar"></i>
              ${new Date(tournament.startDate).toLocaleDateString()}
            </span>
            <span class="tournament-status status-${tournament.status.toLowerCase()}">
              ${tournament.status}
            </span>
          </div>
          <div class="tournament-description">${tournament.description || 'No description available'}</div>
        </div>
        <div class="tournament-actions">
          <a href="/views/tournaments.html?id=${tournament._id}" class="btn btn-primary">
            <i class="fas fa-external-link-alt"></i> View Details
          </a>
        </div>
      </div>
    `).join('');

    let paginationHTML = '';
    if (totalPages > 1) {
      paginationHTML = this.createPagination(page, totalPages, (newPage) => {
        this.loadUserTournaments(newPage);
      });
    }

    container.innerHTML = tournamentsHTML + paginationHTML;
  }

  /**
   * Load forum activity
   */
  async loadForumActivity() {
    const container = document.getElementById('forum-activity-container');
    if (!container) return;try {
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading forum activity...</div>';

      const response = await apiClient.getForumStats();
      
      if (!response || !response.userPosts) {
        container.innerHTML = this.createStyledEmptyState(
          'fas fa-comments',
          'No Forum Activity Yet',
          'You haven\'t posted in the forums yet.',
          'Visit Forums',
          '/views/forums.html'
        );
        return;
      }

      this.forumPosts = response.userPosts;

      if (this.forumPosts.length === 0) {
        container.innerHTML = this.createStyledEmptyState(
          'fas fa-comments',
          'No Forum Activity Yet',
          'You haven\'t posted in the forums yet.',
          'Visit Forums',
          '/views/forums.html'
        );
        return;}

      // Display forum posts
      const postsHTML = this.forumPosts.map(post => `
        <div class="forum-post-card">
          <div class="post-info">
            <h3 class="post-title">${post.title}</h3>
            <div class="post-meta">
              <span class="post-category">${post.category}</span>
              <span class="post-date">
                <i class="fas fa-clock"></i>
                ${new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div class="post-excerpt">${this.truncateText(post.content, 150)}</div>
          </div>
          <div class="post-stats">
            <span class="stat">
              <i class="fas fa-thumbs-up"></i>
              ${post.likes || 0}
            </span>
            <span class="stat">
              <i class="fas fa-comment"></i>
              ${post.replies || 0}
            </span>
          </div>
        </div>
      `).join('');

      container.innerHTML = postsHTML;

    } catch (error) {
      logger.error('Error loading forum activity:', error);
      container.innerHTML = this.createErrorMessage('Failed to load forum activity');
    }
  }

  /**
   * Load user maps
   */
  async loadUserMapsTab() {
    const container = document.getElementById('maps-activity-container');
    if (!container) return;try {
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading maps...</div>';

      const response = await apiClient.getMaps({ author: 'current' });

      if (!response || !response.maps) {
        container.innerHTML = this.createStyledEmptyState(
          'fas fa-map',
          'No Maps Created Yet',
          'You haven\'t created any custom maps yet.',
          'Create Map',
          '/views/map-editor.html'
        );
        return;
      }

      const data = response;
      
      // Handle different response formats
      if (data.success && data.data) {
        this.userMaps = data.data;
      } else if (data.maps) {
        this.userMaps = data.maps;
      } else if (Array.isArray(data)) {
        this.userMaps = data;
      } else {
        this.userMaps = [];
      }

      if (this.userMaps.length === 0) {
        container.innerHTML = this.createStyledEmptyState(
          'fas fa-map',
          'No Maps Created Yet',
          'You haven\'t created any custom maps yet.',
          'Create Map',
          '/views/map-editor.html'
        );
        return;}

      // Display user maps
      const mapsHTML = this.userMaps.map(map => `
        <div class="map-card">
          <div class="map-info">
            <h3 class="map-name">${map.name}</h3>
            <div class="map-meta">
              <span class="map-game">${this.formatGameName(map.game)}</span>
              <span class="map-date">
                <i class="fas fa-calendar"></i>
                ${new Date(map.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div class="map-description">${map.description || 'No description available'}</div>
          </div>
          <div class="map-stats">
            <span class="stat">
              <i class="fas fa-download"></i>
              ${map.downloads || 0}
            </span>
            <span class="stat">
              <i class="fas fa-star"></i>
              ${map.rating || 'N/A'}
            </span>
          </div>
        </div>
      `).join('');

      container.innerHTML = mapsHTML;

    } catch (error) {
      logger.error('Error loading user maps:', error);
      container.innerHTML = this.createErrorMessage('Failed to load maps');
    }
  }

  /**
   * Load reports submitted by user
   */
  async loadReports() {
    const container = document.getElementById('reports-container');
    if (!container) return;try {
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading reports...</div>';

      const response = await apiClient.getPlayerMatches();
      
      if (!response || !response.matches) {
        container.innerHTML = this.createNoActivityMessage(
          'fas fa-flag',
          'No Reports Submitted',
          'You haven\'t submitted any reports yet.',
          'Quick Report',
          '/views/quick-report.html'
        );
        return;
      }

      this.reports = response.matches;

      if (this.reports.length === 0) {
        container.innerHTML = this.createNoActivityMessage(
          'fas fa-flag',
          'No Reports Submitted',
          'You haven\'t submitted any reports yet.',
          'Quick Report',
          '/views/quick-report.html'
        );
        return;}

      // Display reports
      const reportsHTML = this.reports.map(report => `
        <div class="report-card">
          <div class="report-info">
            <h3 class="report-title">${report.title || 'Report #' + report.id}</h3>
            <div class="report-meta">
              <span class="report-type">${report.type}</span>
              <span class="report-status status-${report.status.toLowerCase()}">
                ${report.status}
              </span>
              <span class="report-date">
                <i class="fas fa-clock"></i>
                ${new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div class="report-description">${this.truncateText(report.description, 100)}</div>
          </div>
          <div class="report-actions">
            <button class="btn btn-sm" onclick="activityManager.viewReport('${report.id}')">
              <i class="fas fa-eye"></i> View
            </button>
          </div>
        </div>
      `).join('');

      container.innerHTML = reportsHTML;

    } catch (error) {
      logger.error('Error loading reports:', error);
      container.innerHTML = this.createErrorMessage('Failed to load reports');
    }
  }

  /**
   * Create styled empty state with proper CSS classes
   */
  createStyledEmptyState(icon, title, description, actionText, actionUrl) {
    return `
      <div class="activity-empty-state">
        <div class="empty-state-icon">
          <i class="${icon}"></i>
        </div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-description">${description}</p>
        ${actionText && actionUrl ? `
          <a href="${actionUrl}" class="epic-btn empty-state-action">
            <i class="fas fa-plus"></i>
            ${actionText}
          </a>
        ` : ''}
      </div>
    `;}

  /**
   * Create no activity message (legacy support)
   */
  createNoActivityMessage(icon, title, description, actionText, actionUrl) {
    return this.createStyledEmptyState(icon, title, description, actionText, actionUrl);}

  /**
   * Create an error message
   */
  createErrorMessage(message) {
    return `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error</h3>
        <p>${message}</p>
        <button class="btn btn-secondary" onclick="location.reload()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>`;}

  /**
   * Create pagination controls
   */
  createPagination(currentPage, totalPages, onPageChange) {
    let paginationHTML = '<div class="pagination-controls">';
    
    // Previous button
    paginationHTML += `
      <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
              ${currentPage > 1 ? `onclick="(${onPageChange})(${currentPage - 1})"` : ''}>
        « Previous
      </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `
        <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                onclick="(${onPageChange})(${i})">
          ${i}
        </button>`;
    }
    
    // Next button
    paginationHTML += `
      <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
              ${currentPage < totalPages ? `onclick="(${onPageChange})(${currentPage + 1})"` : ''}>
        Next »
      </button>`;
    
    paginationHTML += '</div>';
    return paginationHTML;}

  /**
   * Show error for a specific tab
   */
  showTabError(tabName, message) {
    const container = document.getElementById(`${tabName}-container`);
    if (container) {
      container.innerHTML = this.createErrorMessage(message);
    }
  }

  /**
   * Truncate text to specified length
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;return text.substring(0, maxLength) + '...';}

  /**
   * View report details (placeholder)
   */
  viewReport(reportId) {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) return;logger.log('Viewing report:', report);
    alert(`Report: ${report.title}\nStatus: ${report.status}\nDescription: ${report.description}`);
  }

  /**
   * Refresh current tab
   */
  async refreshCurrentTab() {
    await this.loadTabContent(this.currentTab);
  }
}

// Global instance for backward compatibility
window.activityManager = new ActivityManager(); 