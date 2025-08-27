/**
 * Centralized Admin Control Panel
 * Complete administrative control system for all project features
 */
import logger from '/js/utils/logger.js';

// import { ApiClient } from './ApiClient.js';
// Use window.apiClient (already globally available)
import { UIManager } from './UIManager.js';
import { GameManager } from './GameManager.js';
import { ClanManager } from './ClanManager.js';
import { TournamentManager } from './TournamentManager.js';
import { AchievementEngine } from '../core/AchievementEngine.js';

export class AdminControlPanel {
  constructor() {
    // this.api = new ApiClient();
    this.ui = new UIManager();
    this.gameManager = new GameManager();
    this.clanManager = new ClanManager();
    this.tournamentManager = new TournamentManager(window.apiClient);
    this.achievementEngine = new AchievementEngine();
    
    this.state = {
      currentSection: 'dashboard',
      isLoading: false,
      stats: null,
      selectedItems: new Set()
    };
    
    this.sections = {
      dashboard: 'Dashboard',
      users: 'User Management',
      matches: 'Match Management',
      tournaments: 'Tournament Management',
      clans: 'Clan Management',
      maps: 'Map Management',
      achievements: 'Achievement System',
      disputes: 'Dispute Resolution',
      content: 'Content Management',
      'dark-portal': 'Dark Portal Management',
      system: 'System Settings',
      'audit-logs': 'Audit Logs',
  
      analytics: 'Analytics & Reports',
      moderation: 'Moderation Tools',
      feedback: 'Feedback Management'
    };
  }

  openCurrencyEditor(userId, currentGold = 0, currentHonor = 0) {
    const modal = this.ui.createModal('edit-currency-modal', 'Edit Currency', `
      <form id="edit-currency-form" class="form">
        <div class="form-group">
          <label for="edit-gold">Arena Gold:</label>
          <input type="number" id="edit-gold" name="arenaGold" value="${currentGold}" min="0">
        </div>
        <div class="form-group">
          <label for="edit-honor">Honor:</label>
          <input type="number" id="edit-honor" name="honor" value="${currentHonor}" min="0">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);

    document.getElementById('edit-currency-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());
        await window.apiClient.put(`/api/admin/users/${userId}`, payload);
        this.ui.showSuccess('Currency updated');
        modal.remove();
        await this.loadUserManagement();
      } catch (error) {
        this.ui.showError(`Failed to update currency: ${error.message}`);
      }
    });
  }

  async openMembershipEditor(userId) {
    try {
      const resp = await window.apiClient.get(`/api/membership/admin/${userId}`);
      const data = resp.json ? await resp.json() : resp;
      if (!data.success) throw new Error('Failed to fetch membership');
      const m = data.membership;
      const modal = this.ui.createModal('edit-membership-modal', 'Edit Membership', `
        <form id="edit-membership-form" class="form">
          <div class="form-group">
            <label>Tier</label>
            <select name="tier">
              <option value="0" ${m.tier===0?'selected':''}>None</option>
              <option value="1" ${m.tier===1?'selected':''}>1 - Forest Guardian</option>
              <option value="2" ${m.tier===2?'selected':''}>2 - Mountain Warrior</option>
              <option value="3" ${m.tier===3?'selected':''}>3 - Arcane Master</option>
              <option value="4" ${m.tier===4?'selected':''}>4 - Dragon Lord</option>
              <option value="5" ${m.tier===5?'selected':''}>5 - Holy Paladin</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="subscriptionStatus">
              ${['active','cancelled','expired','pending','failed'].map(s=>`<option value="${s}" ${m.subscriptionStatus===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Active</label>
            <select name="isActive">
              <option value="true" ${m.isActive?'selected':''}>true</option>
              <option value="false" ${!m.isActive?'selected':''}>false</option>
            </select>
          </div>
          <div class="form-group">
            <label>Next Billing Date</label>
            <input type="datetime-local" name="nextBillingDate" value="${m.nextBillingDate ? new Date(m.nextBillingDate).toISOString().slice(0,16) : ''}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
          <div class="form-actions" style="margin-top:.5rem;">
            <button type="button" class="btn btn-danger" id="btn-cancel-sub">Cancel Subscription</button>
          </div>
        </form>
      `);

      document.getElementById('edit-membership-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const fd = new FormData(e.target);
          const payload = Object.fromEntries(fd.entries());
          // normalize isActive to boolean
          if (payload.isActive !== undefined) payload.isActive = payload.isActive === 'true';
          const resp2 = await window.apiClient.put(`/api/membership/admin/${userId}`, payload);
          const d2 = resp2.json ? await resp2.json() : resp2;
          if (d2.success) {
            this.ui.showSuccess('Membership updated');
            modal.remove();
            await this.loadUserManagement();
          } else {
            this.ui.showError(d2.message || 'Failed to update membership');
          }
        } catch (err) {
          this.ui.showError(`Failed to update membership: ${err.message}`);
        }
      });

      document.getElementById('btn-cancel-sub').addEventListener('click', async () => {
        try {
          const r = await window.apiClient.post(`/api/membership/admin/cancel/${userId}`, {});
          const d = r.json ? await r.json() : r;
          if (d.success) {
            this.ui.showSuccess('Subscription cancelled');
            modal.remove();
            await this.loadUserManagement();
          } else {
            this.ui.showError(d.message || 'Failed to cancel subscription');
          }
        } catch (e) {
          this.ui.showError(`Failed to cancel subscription: ${e.message}`);
        }
      });
    } catch (e) {
      this.ui.showError(`Failed to load membership: ${e.message}`);
    }
  }
  /**
   * Initialize the admin control panel
   */
  async init() {
    try {
      // Starting admin control panel initialization...
      
      // Check admin permissions first
      // Checking admin permissions...
      const user = await this.checkAdminPermissions();
      // Admin permissions verified for user
      
      // Initialize UI components
      // Initializing UI components...
      this.setupEventListeners();
      
      // Check impersonation status
      // Checking impersonation status...
      await this.checkImpersonationStatus();
      
      // Load navigation counts
      // Loading navigation counts...
      await this.loadNavigationCounts();

      // Load initial dashboard
      // Loading dashboard...
      await this.navigateToSection('dashboard');

      // Admin control panel initialization complete!
      
    } catch (error) {
      logger.error('Admin control panel initialization failed', error);
      
      // Show detailed error information
      const contentContainer = document.getElementById('admin-content');
      if (contentContainer) {
        contentContainer.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Initialization Failed</h2>
            <p><strong>Error:</strong> ${error.message}</p>
            <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; font-family: monospace; font-size: 0.875rem; color: #666;">
              <strong>Debug Info:</strong><br>
              Current URL: ${window.location.href}<br>
              User Agent: ${navigator.userAgent.substring(0, 100)}...<br>
              Timestamp: ${new Date().toISOString()}
            </div>
            <div style="margin-top: 1rem;">
              <button class="btn btn-primary" onclick="window.location.reload()">
                <i class="fas fa-sync"></i> Retry
              </button>
              <a href="/index.html" class="btn btn-secondary" style="margin-left: 0.5rem;">
                <i class="fas fa-home"></i> Return to Home
              </a>
            </div>
          </div>
        `;
      }
      
      throw error;
    }
  }

  /**
   * Check admin permissions
   */
  async checkAdminPermissions() {
    try {
      // Calling getCurrentUser()...
      const user = await window.apiClient.getCurrentUser();
      // Raw user response
      // User type
      // User keys

      if (!user) {
        throw new Error('No user found - please log in');
      }

      // Check if user has admin or moderator role
      // Checking role
      if (user.role !== 'admin' && user.role !== 'moderator') {
        throw new Error(`Access denied. Admin or moderator privileges required. Current role: ${user.role}`);
      }

      // User has admin access
      return user;} catch (error) {
      logger.error('Admin permission check failed', error);
      
      // Show more specific error messages
      if (error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your connection.');
      } else if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Access denied. Please log in with admin privileges.');
      } else {
        throw new Error(error.message || 'Authentication failed. Please try logging in again.');
      }
    }
  }

  /**
   * Load navigation counts from API
   */
  async loadNavigationCounts() {
    try {
      // Loading navigation counts...

      // First test if we can access the API at all
      try {
        const testResponse = await window.apiClient.get('/api/admin/dashboard-stats');
        // ApiClient test response
      } catch (testError) {
        logger.error('ApiClient test failed', testError);
      }

      // Get dashboard stats which includes all the counts we need
      const response = await window.apiClient.get('/api/admin/dashboard-stats');
              // Dashboard stats response

      // Check if response is a Response object and extract JSON
      let stats;
      if (response && response.json) {
        stats = await response.json();
      } else if (response && response.data) {
        stats = response.data;
      } else {
        stats = response;
      }
              // Processed stats

      if (!stats || !stats.users) {
        logger.warn('Invalid stats structure', stats);
        this.removeAllNavigationBadges();
        return;}

      // Update navigation badges with real data
      this.updateNavigationBadge('users', stats.users.total);
      this.updateNavigationBadge('matches', stats.matches.pending);
      this.updateNavigationBadge('disputes', stats.disputes.pending);
      this.updateNavigationBadge('moderation', stats.reports.pending);

      // Update sidebar quick stats
      this.updateSidebarStats({
        onlineUsers: stats.users.total, // Use total users as "online" for now
        activeMatches: stats.matches.pending,
        serverLoad: Math.round(stats.system.storage.usage)
      });

              // Navigation counts updated successfully

    } catch (error) {
      logger.warn('Failed to load navigation counts', error.message);
      logger.error('Full error', error);
      // Remove all badges if we can't load real data
      this.removeAllNavigationBadges();
    }
  }

  /**
   * Update a specific navigation badge
   */
  updateNavigationBadge(section, count) {
    const navItem = document.querySelector(`[data-section="${section}"]`);
    if (navItem) {
      let badge = navItem.querySelector('.nav-badge');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nav-badge';
          navItem.appendChild(badge);
        }
        badge.textContent = count;

        // Add appropriate badge styling based on section
        badge.className = 'nav-badge';
        if (section === 'disputes' || section === 'moderation') {
          badge.classList.add(count > 0 ? 'danger' : 'info');
        } else if (section === 'matches') {
          badge.classList.add(count > 0 ? 'warning' : 'info');
        }
      } else if (badge) {
        // Remove badge if count is 0
        badge.remove();
      }
    }
  }

  /**
   * Update sidebar quick stats
   */
  updateSidebarStats(stats) {
    const sidebarStats = document.querySelector('.sidebar-stats');
    if (sidebarStats) {
      const statItems = sidebarStats.querySelectorAll('.stat-item');

      statItems.forEach(item => {
        const label = item.querySelector('.stat-label').textContent;
        const valueElement = item.querySelector('.stat-value');

        if (label.includes('Online Users') && stats.onlineUsers !== undefined) {
          valueElement.textContent = stats.onlineUsers;
        } else if (label.includes('Active Matches') && stats.activeMatches !== undefined) {
          valueElement.textContent = stats.activeMatches;
        } else if (label.includes('Server Load') && stats.serverLoad !== undefined) {
          valueElement.textContent = `${stats.serverLoad}%`;
        }
      });
    }
  }

  /**
   * Remove all navigation badges (fallback when API fails)
   */
  removeAllNavigationBadges() {
    document.querySelectorAll('.nav-badge').forEach(badge => {
      // Only remove badges that show counts, keep warning/danger badges for static items
      if (!badge.classList.contains('warning') && !badge.classList.contains('danger')) {
        badge.remove();
      }
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Navigation - Use event delegation for better reliability
    document.addEventListener('click', (e) => {
      // Handle admin navigation
      const navItem = e.target.closest('.admin-nav-item');
      if (navItem) {
        e.preventDefault();
        const section = navItem.dataset.section;
        if (section) {
          // Navigating to section
          this.navigateToSection(section);
        }
      }
    });

    // Bulk actions
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('bulk-select-all')) {
        this.handleBulkSelectAll(e.target.checked);
      } else if (e.target.classList.contains('bulk-select-item')) {
        this.handleBulkSelectItem(e.target.value, e.target.checked);
      }
    });

    // Initialize navigation items as active/inactive
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        if (section) {
          // Direct nav click
          this.navigateToSection(section);
        }
      });
    });

          // Admin event listeners setup completed
  }

  /**
   * Navigate to admin section
   */
  async navigateToSection(section) {
    if (this.state.isLoading) {
      // Navigation blocked - already loading
      return;}

    try {
      // Navigating to section
      this.state.isLoading = true;
      this.state.currentSection = section;
      
      // Show loading in content area
      const contentContainer = document.getElementById('admin-content');
      if (contentContainer) {
        contentContainer.innerHTML = `
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading ${this.sections[section] || section}...</p>
          </div>
        `;
      }
      
      // Update navigation - make sure we update all nav items
      document.querySelectorAll('.admin-nav-item').forEach(item => {
        const isActive = item.dataset.section === section;
        item.classList.toggle('active', isActive);
        // Nav item status
      });

      // Load section content
      await this.loadSectionContent(section);
              // Successfully loaded section

    } catch (error) {
      logger.error(`Failed to load section ${section}`, error);
      const contentContainer = document.getElementById('admin-content');
      if (contentContainer) {
        contentContainer.innerHTML = this.ui.createErrorState(
          'Loading Error', 
          `Failed to load ${this.sections[section]}: ${error.message}`
        );
      }
      this.ui.showError(`Failed to load ${this.sections[section]}`);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Load section content
   */
  async loadSectionContent(section) {
    const contentContainer = document.getElementById('admin-content');
    
    switch (section) {
      case 'dashboard':
        await this.loadDashboard();
        break;
      case 'users':
        await this.loadUserManagement();
        break;
      case 'matches':
        await this.loadMatchManagement();
        break;
      case 'tournaments':
        await this.loadTournamentManagement();
        break;
      case 'clans':
        await this.loadClanManagement();
        break;
      case 'maps':
        await this.loadMapManagement();
        break;
      case 'achievements':
        await this.loadAchievementManagement();
        break;
      case 'disputes':
        await this.loadDisputeManagement();
        break;
      case 'content':
        await this.loadContentManagement();
        break;
      case 'dark-portal':
        await this.loadDarkPortalManagement();
        break;
      case 'system':
        await this.loadSystemSettings();
        break;
      case 'audit-logs':
        await this.loadAuditLogs();
        break;

      case 'console-logs':
        await this.loadConsoleLogs();
        break;

      case 'analytics':
        await this.loadAnalytics();
        break;
      case 'moderation':
        await this.loadModerationTools();
        break;
      case 'feedback':
        await this.loadFeedbackManagement();
        break;
      default:
        contentContainer.innerHTML = this.ui.createErrorState('Section Not Found', 'The requested section could not be found.');
    }
  }

  /**
   * Load Console Logs (connected to backend with real-time updates)
   * 
   * OPTIMIZATION: Instead of updating the UI on every single log entry,
   * this system now batches updates and only refreshes the display every 5 seconds
   * (configurable). This significantly improves performance by reducing DOM manipulation
   * and preventing the UI from freezing during high-volume logging.
   * 
   * Features:
   * - Batched updates every 5 seconds (default, configurable)
   * - Visual indicator showing queued updates and countdown
   * - Manual refresh button for immediate updates
   * - Configurable update intervals (1s, 5s, 10s, 30s)
   * - Memory management (keeps only latest 1000 logs)
   */
  async loadConsoleLogs() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `
      <div class="admin-section">
        <div class="section-header">
          <h1>Console Logs</h1>
                      <div class="section-actions">
              <span id="conn-status" class="badge badge-secondary">Connecting…</span>
              <span id="update-status" class="badge badge-info" style="display: none;">Updates Queued</span>
              <span id="interval-display" class="badge badge-secondary">Update: 5s</span>
              <select id="update-interval" style="padding: 0.25rem; border-radius: 4px; border: 1px solid #374151; background: #111827; color: #e2e8f0; margin-right: 0.5rem;">
                <option value="1000">1s</option>
                <option value="5000" selected>5s</option>
                <option value="10000">10s</option>
                <option value="30000">30s</option>
              </select>
              <button class="btn btn-secondary" id="btn-refresh">Refresh</button>
              <button class="btn btn-secondary" id="btn-clear">Clear</button>
              <button class="btn btn-secondary" id="btn-pause">Pause</button>
            </div>
        </div>
        
        <!-- Main Layout Container -->
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
          <!-- Stats Cards Column -->
          <div style="flex: 0 0 200px;">
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div class="metric-card" id="stat-total" style="margin: 0;">
                <div class="metric-content">
                  <h3 id="count-total">0</h3>
                  <p>Total Logs</p>
                </div>
              </div>
              <div class="metric-card" id="stat-errors" style="margin: 0;">
                <div class="metric-content">
                  <h3 id="count-errors">0</h3>
                  <p>Errors</p>
                </div>
              </div>
              <div class="metric-card" id="stat-warnings" style="margin: 0;">
                <div class="metric-content">
                  <h3 id="count-warns">0</h3>
                  <p>Warnings</p>
                </div>
              </div>
              <div class="metric-card" id="stat-logs" style="margin: 0;">
                <div class="metric-content">
                  <h3 id="count-logs">0</h3>
                  <p>Logs</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Filters and Content -->
          <div style="flex: 1;">
            <!-- Filters -->
            <div class="filters-bar" style="margin-bottom: 1rem; padding: 1rem; background: #1f2937; border-radius: 8px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 1rem; align-items: end;">
                <div class="filter-group">
                  <label style="display: block; margin-bottom: 0.5rem; color: #e2e8f0;">Search:</label>
                  <input type="text" id="log-search" placeholder="Search in messages, page, user..." style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #374151; background: #111827; color: #e2e8f0;" />
                </div>
                <div class="filter-group">
                  <label style="display: block; margin-bottom: 0.5rem; color: #e2e8f0;">Level:</label>
                  <select id="level-filter" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #374151; background: #111827; color: #e2e8f0;">
                    <option value="">All Levels</option>
                    <option value="error">Errors</option>
                    <option value="warn">Warnings</option>
                    <option value="log">Logs</option>
                  </select>
                </div>
                <div class="filter-group">
                  <label style="display: block; margin-bottom: 0.5rem; color: #e2e8f0;">Source:</label>
                  <select id="source-filter" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #374151; background: #111827; color: #e2e8f0;">
                    <option value="">All Sources</option>
                    <option value="frontend" selected>Frontend</option>
                    <option value="backend">Backend</option>
                  </select>
                </div>
                <div class="filter-group">
                  <label style="display: block; margin-bottom: 0.5rem; color: #e2e8f0;">Sort By:</label>
                  <select id="sort-by" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #374151; background: #111827; color: #e2e8f0;">
                    <option value="lastSeen">Last Seen</option>
                    <option value="firstSeen">First Seen</option>
                    <option value="count">Count</option>
                    <option value="level">Level</option>
                    <option value="page">Page</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div class="filter-group">
                  <label style="display: block; margin-bottom: 0.5rem; color: #e2e8f0;">Limit:</label>
                  <select id="limit-filter" style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #374151; background: #111827; color: #e2e8f0;">
                    <option value="50">50 logs</option>
                    <option value="100">100 logs</option>
                    <option value="200" selected>200 logs</option>
                    <option value="500">500 logs</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Loading State -->
            <div id="loading-state" style="text-align: center; padding: 2rem; color: #9ca3af;">
              <div>Loading console logs...</div>
            </div>

            <!-- Error State -->
            <div id="error-state" style="display: none; text-align: center; padding: 2rem; color: #ef4444;">
              <div>Error loading logs. Check connection and try again.</div>
            </div>

            <!-- Logs Table -->
            <div id="logs-container" style="display: none;">
              <div class="data-table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th data-sort="level" style="cursor: pointer;">Level ↕</th>
                      <th data-sort="firstSeen" style="cursor: pointer;">First Seen ↕</th>
                      <th data-sort="lastSeen" style="cursor: pointer;">Last Seen ↕</th>
                      <th data-sort="count" style="cursor: pointer;">Count ↕</th>
                      <th>Message</th>
                      <th data-sort="page" style="cursor: pointer;">Page ↕</th>
                      <th data-sort="user" style="cursor: pointer;">User ↕</th>
                    </tr>
                  </thead>
                  <tbody id="log-rows"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Get DOM elements
    const rows = container.querySelector('#log-rows');
    const search = container.querySelector('#log-search');
    const conn = container.querySelector('#conn-status');
    const pauseBtn = container.querySelector('#btn-pause');
    const clearBtn = container.querySelector('#btn-clear');
    const refreshBtn = container.querySelector('#btn-refresh');
    const levelFilter = container.querySelector('#level-filter');
    const sourceFilter = container.querySelector('#source-filter');
    const sortBy = container.querySelector('#sort-by');
    const limitFilter = container.querySelector('#limit-filter');
    const updateIntervalSelect = container.querySelector('#update-interval');
    const loadingState = container.querySelector('#loading-state');
    const errorState = container.querySelector('#error-state');
    const logsContainer = container.querySelector('#logs-container');

    let paused = false;
    let currentLogs = [];
    let sortOrder = 'desc';
    let updateQueue = [];
    let updateTimer = null;
    let lastUpdateTime = 0;
    let updateInterval = 5000; // 5 seconds

    // Update stats
    function updateStats(logs) {
      const stats = {
        total: logs.length,
        error: logs.filter(l => l.level === 'error').length,
        warn: logs.filter(l => l.level === 'warn').length,
        log: logs.filter(l => l.level === 'log').length
      };

      container.querySelector('#count-total').textContent = stats.total;
      container.querySelector('#count-errors').textContent = stats.error;
      container.querySelector('#count-warns').textContent = stats.warn;
      container.querySelector('#count-logs').textContent = stats.log;
    }

    // Batched update function - only updates every 5 seconds
    function scheduleUpdate() {
      if (updateTimer) return;const updateStatus = container.querySelector('#update-status');
      if (updateStatus) {
        updateStatus.style.display = 'inline-block';
        updateStatus.textContent = `Updates Queued (${updateQueue.length})`;
      }
      
      updateTimer = setTimeout(() => {
        if (updateQueue.length > 0) {
          // Process all queued updates
          updateQueue.forEach(log => {
            currentLogs.unshift(log);
          });
          
          // Keep only the latest 1000 logs to prevent memory issues
          if (currentLogs.length > 1000) {
            currentLogs = currentLogs.slice(0, 1000);
          }
          
          // Clear the queue
          updateQueue = [];
          
          // Hide update status indicator
          if (updateStatus) {
            updateStatus.style.display = 'none';
          }
          
          // Actually render the logs
          renderLogs();
          
          // Reset timer
          updateTimer = null;
          lastUpdateTime = Date.now();
        }
      }, updateInterval);
    }

    // Render logs table
    function renderLogs() {
      if (paused) return;const searchTerm = search.value.toLowerCase();
      const levelFilterValue = levelFilter.value;
      const sourceFilterValue = sourceFilter.value;
      const sortByValue = sortBy.value;
      const limit = parseInt(limitFilter.value);

      // Filter logs
      let filteredLogs = currentLogs.filter(log => {
        const matchesSearch = !searchTerm || 
          log.msgs?.some(msg => msg.toLowerCase().includes(searchTerm)) ||
          (log.page || '').toLowerCase().includes(searchTerm) ||
          (log.user?.username || '').toLowerCase().includes(searchTerm);
        
        const matchesLevel = !levelFilterValue || log.level === levelFilterValue;
        
        // Source filter: frontend has a page that's not 'backend', backend has page='backend' or no page
        const isFrontend = log.page && log.page !== 'backend';
        const isBackend = !log.page || log.page === 'backend';
        const matchesSource = !sourceFilterValue || 
          (sourceFilterValue === 'frontend' && isFrontend) ||
          (sourceFilterValue === 'backend' && isBackend);
        
        return matchesSearch && matchesLevel && matchesSource;});

      // Sort logs
      filteredLogs.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortByValue) {
          case 'level':
            aValue = a.level;
            bValue = b.level;
            break;
          case 'firstSeen':
            aValue = new Date(a.firstSeen || a.ts);
            bValue = new Date(b.firstSeen || b.ts);
            break;
          case 'lastSeen':
            aValue = new Date(a.lastSeen || a.ts);
            bValue = new Date(b.lastSeen || b.ts);
            break;
          case 'count':
            aValue = a.count || 1;
            bValue = b.count || 1;
            break;
          case 'page':
            aValue = a.page || '';
            bValue = b.page || '';
            break;
          case 'user':
            aValue = a.user?.username || '';
            bValue = b.user?.username || '';
            break;
          default:
            aValue = new Date(a.lastSeen || a.ts);
            bValue = new Date(b.lastSeen || b.ts);
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;} else {
          return aValue < bValue ? 1 : -1;}
      });

      // Apply limit
      filteredLogs = filteredLogs.slice(0, limit);

      // Update stats
      updateStats(filteredLogs);

      // Render table
      rows.innerHTML = filteredLogs.map(log => {
        const levelClass = log.level === 'error' ? 'text-red-500' : 
                          log.level === 'warn' ? 'text-yellow-500' : 'text-green-500';
        
        const message = Array.isArray(log.msgs) ? log.msgs.join(' ') : String(log.msgs || '');
        const truncatedMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;
        
        return `
          <tr>
            <td><span class="${levelClass}" style="text-transform: uppercase;font-weight: bold;">${log.level}</span></td>
            <td>${new Date(log.firstSeen || log.ts).toLocaleString()}</td>
            <td>${new Date(log.lastSeen || log.ts).toLocaleString()}</td>
            <td><span class="badge badge-secondary">${log.count || 1}</span></td>
            <td title="${message.replace(/"/g, '&quot;')}">${truncatedMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td>${log.page || 'backend'}</td>
            <td>${log.user?.username || (log.page && log.page !== 'backend' ? 'anonymous' : 'backend')}</td>
          </tr>
        `;
      }).join('');

      // Show/hide containers
      if (filteredLogs.length > 0) {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        logsContainer.style.display = 'block';
      } else {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        logsContainer.style.display = 'block';
        rows.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #9ca3af;">No logs found</td></tr>';
      }
    }

    // Load logs from backend
    async function loadLogs() {
      try {
        loadingState.style.display = 'block';
        errorState.style.display = 'none';
        logsContainer.style.display = 'none';

        let response;
        if (window.apiClient && window.apiClient.isAuthenticated && window.apiClient.isAuthenticated()) {
          response = await window.apiClient.get('/api/dev/client-logs');
        } else {
          response = await fetch('/api/dev/client-logs');
          response = await response.json();
        }

        const data = response.data || response;
        currentLogs = data.logs || [];
        
        // Loaded logs from backend
        renderLogs();
        
      } catch (error) {
        logger.error('Error loading logs', error);
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        logsContainer.style.display = 'none';
      }
    }

    // Socket.io connection for real-time updates
    function setupSocketConnection() {
      try {
        const socket = window.io ? window.io() : null;
        if (socket) {
          conn.textContent = 'Connecting...';
          conn.className = 'badge badge-warning';
          
          // Join admin room
          socket.emit('joinAdminRoom');
          
          socket.on('connect', () => {
            conn.textContent = 'Connected';
            conn.className = 'badge badge-success';
            socket.emit('joinAdminRoom');
          });
          
          socket.on('client-log', (log) => {
            // Add new log to update queue instead of immediately processing
            updateQueue.push(log);
            
            // Schedule a batched update (only if not already scheduled)
            scheduleUpdate();
          });
          
          socket.on('client-log-history', (logs) => {
            // Load historical logs
            currentLogs = logs || [];
            renderLogs();
          });
          
          socket.on('disconnect', () => {
            conn.textContent = 'Disconnected';
            conn.className = 'badge badge-error';
          });
          
          socket.on('connect_error', () => {
            conn.textContent = 'Connection Error';
            conn.className = 'badge badge-error';
          });
        } else {
          conn.textContent = 'No Socket';
          conn.className = 'badge badge-error';
        }
      } catch (error) {
        logger.error('Socket connection error', error);
        conn.textContent = 'Socket Error';
        conn.className = 'badge badge-error';
      }
    }

    // Event listeners
    search.addEventListener('input', renderLogs);
    levelFilter.addEventListener('change', renderLogs);
    sourceFilter.addEventListener('change', renderLogs);
    limitFilter.addEventListener('change', renderLogs);
    
    // Update interval selector
    updateIntervalSelect.addEventListener('change', () => {
      const newInterval = parseInt(updateIntervalSelect.value);
      if (newInterval !== updateInterval) {
        // Clear current timer and restart with new interval
        if (updateTimer) {
          clearTimeout(updateTimer);
          updateTimer = null;
        }
        
        // Update the interval variable
        updateInterval = newInterval;
        
        // Update the display
        const intervalDisplay = container.querySelector('#interval-display');
        if (intervalDisplay) {
          intervalDisplay.textContent = `Update: ${newInterval / 1000}s`;
        }
        
        // If there are queued updates, schedule a new update with the new interval
        if (updateQueue.length > 0) {
          scheduleUpdate();
        }
      }
    });
    
    sortBy.addEventListener('change', () => {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      renderLogs();
    });

    // Sortable headers
    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const sortField = th.dataset.sort;
        if (sortBy.value === sortField) {
          sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          sortBy.value = sortField;
          sortOrder = 'desc';
        }
        renderLogs();
      });
    });

    clearBtn.addEventListener('click', () => {
      currentLogs = [];
      renderLogs();
    });
    
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      if (!paused) renderLogs();
    });
    
    refreshBtn.addEventListener('click', () => {
      // Force immediate refresh and clear any queued updates
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }
      
      // Process any queued updates immediately
      if (updateQueue.length > 0) {
        updateQueue.forEach(log => {
          currentLogs.unshift(log);
        });
        
        // Keep only the latest 1000 logs to prevent memory issues
        if (currentLogs.length > 1000) {
          currentLogs = currentLogs.slice(0, 1000);
        }
        
        // Clear the queue
        updateQueue = [];
        
        // Hide update status indicator
        const updateStatus = container.querySelector('#update-status');
        if (updateStatus) {
          updateStatus.style.display = 'none';
        }
      }
      
      // Load fresh logs from backend
      loadLogs();
    });

    // Add a timer display to show when next update will occur
    function updateTimerDisplay() {
      if (updateTimer && updateQueue.length > 0) {
        const timeSinceLastUpdate = Date.now() - lastUpdateTime;
        const timeUntilNextUpdate = Math.max(0, updateInterval - timeSinceLastUpdate);
        const secondsRemaining = Math.ceil(timeUntilNextUpdate / 1000);
        
        const updateStatus = container.querySelector('#update-status');
        if (updateStatus) {
          updateStatus.textContent = `Updates Queued (${updateQueue.length}) - Next update in ${secondsRemaining}s`;
        }
      }
    }

    // Update timer display every second
    const timerInterval = setInterval(updateTimerDisplay, 1000);

    // Initialize
    setupSocketConnection();
    loadLogs();
    
    // Cleanup function to clear timers when section is unloaded
    return () => {
      if (updateTimer) {
        clearTimeout(updateTimer);updateTimer = null;
      }
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }

  /**
   * Load dashboard
   */
  async loadDashboard() {
    try {
      // Loading admin dashboard...
      
      // Try to get real stats, fallback to mock data if API doesn't exist
      let stats;
      try {
        // Attempting to load real dashboard stats...
        const response = await window.apiClient.get('/api/admin/dashboard-stats');
        console.log('📊 Raw API response:', response);
        
        // Check if response is a Response object and extract JSON
        if (response && response.json) {
          stats = await response.json();
        } else if (response && response.data) {
          stats = response.data;
        } else {
          stats = response;
        }
        
        console.log('✅ Loaded real dashboard stats:', stats);
      } catch (error) {
        logger.warn('Admin stats API not available, using mock data', error.message);
        console.log('🔍 Error details:', error);
        stats = this.getMockDashboardStats();
        console.log('📊 Using mock dashboard stats:', stats);
      }
      this.state.stats = stats;

      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-dashboard">
          <div class="dashboard-header">
            <h1>Admin Dashboard</h1>
            <div class="dashboard-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.refreshDashboard()">
                <i class="fas fa-sync"></i> Refresh
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportSystemReport()">
                <i class="fas fa-download"></i> Export Report
              </button>
            </div>
          </div>

          <!-- Key Metrics -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon">
                <i class="fas fa-users"></i>
              </div>
              <div class="metric-content">
                <h3>${stats.users.total}</h3>
                <p>Total Users</p>
                <span class="metric-change ${stats.users.change >= 0 ? 'positive' : 'negative'}">
                  ${stats.users.change >= 0 ? '+' : ''}${stats.users.change}% this month
                </span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">
                <i class="fas fa-gamepad"></i>
              </div>
              <div class="metric-content">
                <h3>${stats.matches.total}</h3>
                <p>Total Matches</p>
                <span class="metric-change ${stats.matches.change >= 0 ? 'positive' : 'negative'}">
                  ${stats.matches.change >= 0 ? '+' : ''}${stats.matches.change}% this month
                </span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">
                <i class="fas fa-trophy"></i>
              </div>
              <div class="metric-content">
                <h3>${stats.tournaments.active}</h3>
                <p>Active Tournaments</p>
                <span class="metric-detail">${stats.tournaments.total} total</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">
                <i class="fas fa-shield-alt"></i>
              </div>
              <div class="metric-content">
                <h3>${stats.clans.total}</h3>
                <p>Active Clans</p>
                <span class="metric-detail">${stats.clans.members} total members</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="dashboard-section">
            <h2>Quick Actions</h2>
            <div class="quick-actions-grid">
              <button class="quick-action-btn" onclick="adminControlPanel.navigateToSection('disputes')">
                <i class="fas fa-flag"></i>
                <span>Pending Disputes</span>
                <span class="badge">${stats.disputes.pending}</span>
              </button>
              
              <button class="quick-action-btn" onclick="adminControlPanel.navigateToSection('matches')">
                <i class="fas fa-clock"></i>
                <span>Pending Matches</span>
                <span class="badge">${stats.matches.pending}</span>
              </button>
              
              <button class="quick-action-btn" onclick="adminControlPanel.navigateToSection('users')">
                <i class="fas fa-user-plus"></i>
                <span>New Users</span>
                <span class="badge">${stats.users.newToday}</span>
              </button>
              
              <button class="quick-action-btn" onclick="adminControlPanel.navigateToSection('moderation')">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Reports</span>
                <span class="badge">${stats.reports.pending}</span>
              </button>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="dashboard-section">
            <h2>Recent Activity</h2>
            <div class="activity-feed">
              ${this.renderActivityFeed(stats.recentActivity)}
            </div>
          </div>

          <!-- System Status -->
          <div class="dashboard-section">
            <h2>System Status</h2>
            <div class="system-status-grid">
              <div class="status-item">
                <div class="status-indicator ${stats.system.database.status}"></div>
                <span>Database</span>
                <span class="status-value">${stats.system.database.responseTime}ms</span>
              </div>
              <div class="status-item">
                <div class="status-indicator ${stats.system.storage.status}"></div>
                <span>Storage</span>
                <span class="status-value">${stats.system.storage.usage}% used</span>
              </div>
              <div class="status-item">
                <div class="status-indicator ${stats.system.api.status}"></div>
                <span>API</span>
                <span class="status-value">${stats.system.api.uptime}% uptime</span>
              </div>
            </div>
          </div>
        </div>
      `;

    } catch (error) {
      logger.error('Failed to load dashboard', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Dashboard Error', 'Failed to load dashboard data.');
    }
  }

  /**
   * Load user management
   */
  async loadUserManagement() {
    try {
      // Try to get real users, fallback to mock data if API doesn't exist
      let users;
      let pagination = null;
      try {
        const response = await window.apiClient.get('/api/admin/users');

        // Handle both wrapped and direct responses
        const data = response.data || response;
        users = data.users || data; // Handle both paginated and direct array responses
        pagination = data.pagination;

        if (!Array.isArray(users)) {
          logger.warn('Users is not an array', users);
          users = [];
        }
      } catch (error) {
        logger.warn('Admin users API not available, using mock data', error.message);
        users = this.getMockUsers();
      }



      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>User Management</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.createUser()">
                <i class="fas fa-plus"></i> Create User
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportUsers()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Role:</label>
              <select id="user-role-filter">
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="user">User</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status:</label>
              <select id="user-status-filter">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Search:</label>
              <input type="text" id="user-search" placeholder="Search users...">
            </div>
          </div>

          <!-- Bulk Actions -->
          <div class="bulk-actions">
            <label>
              <input type="checkbox" class="bulk-select-all"> Select All
            </label>
            <button class="btn btn-sm btn-warning" onclick="adminControlPanel.bulkSuspendUsers()">
              <i class="fas fa-pause"></i> Suspend
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminControlPanel.bulkBanUsers()">
              <i class="fas fa-ban"></i> Ban
            </button>
            <button class="btn btn-sm btn-success" onclick="adminControlPanel.bulkActivateUsers()">
              <i class="fas fa-check"></i> Activate
            </button>
          </div>

          <!-- Users Table -->
          <div class="data-table-container">
            ${users && users.length > 0 ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" class="bulk-select-all"></th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Arena Gold</th>
                    <th>Honor</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(user => `
                    <tr>
                      <td><input type="checkbox" class="bulk-select-item" value="${user._id}"></td>
                      <td>
                        <div class="user-info">
                          <img src="${user.avatar || '/assets/img/default-avatar.svg'}" alt="${user.username}" class="user-avatar">
                          <div>
                            <div class="user-name">${user.username}</div>
                            <div class="user-id">#${user._id.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      <td>${user.email}</td>
                       <td><span class="role-badge ${user.role}">${user.role}</span></td>
                       <td>${user.arenaGold ?? 0}</td>
                       <td>${user.honor ?? 0}</td>
                      <td><span class="status-badge ${user.accountStatus || user.status || 'active'}">${user.accountStatus || user.status || 'active'}</span></td>
                      <td>${this.ui.formatDate(user.createdAt)}</td>
                      <td>${user.lastActive ? this.ui.formatDate(user.lastActive) : 'Never'}</td>
                      <td>
                        <div class="action-buttons">
                           <button class="btn btn-sm" onclick="adminControlPanel.openCurrencyEditor('${user._id}', ${user.arenaGold ?? 0}, ${user.honor ?? 0})" title="Edit Currency">
                             <i class="fas fa-coins"></i>
                           </button>
                           <button class="btn btn-sm" onclick="adminControlPanel.openMembershipEditor('${user._id}')" title="Edit Membership">
                             <i class="fas fa-id-card"></i>
                           </button>
                           <button class="btn btn-sm btn-primary" onclick="adminControlPanel.editUser('${user._id}')" title="Edit User">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-sm btn-info" onclick="adminControlPanel.manageUserPermissions('${user._id}')" title="Manage Permissions">
                            <i class="fas fa-key"></i>
                          </button>
                          ${((user.accountStatus||user.status)==='banned') ? `
                            <button class="btn btn-sm btn-success" onclick="adminControlPanel.unbanUser('${user._id}')" title="Unban User">
                              <i class=\"fas fa-unlock\"></i>
                            </button>
                          ` : `
                            <button class=\"btn btn-sm btn-warning\" onclick=\"adminControlPanel.banUser('${user._id}')\" title=\"Ban User\"> 
                              <i class=\"fas fa-ban\"></i>
                            </button>
                          `}
                          <button class="btn btn-sm btn-success" onclick="adminControlPanel.viewUserDetails('${user._id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteUser('${user._id}')" title="Delete User Account">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="no-records-found">
                <div class="no-records-icon">
                  <i class="fas fa-users"></i>
                </div>
                <h3>No Users Found</h3>
                <p>There are currently no users in the system. Create the first user to get started.</p>
                <button class="btn btn-primary" onclick="adminControlPanel.createUser()">
                  <i class="fas fa-plus"></i> Create First User
                </button>
              </div>
            `}
          </div>
        </div>
      `;

      this.setupUserFilters(users);

    } catch (error) {
      logger.error('Failed to load user management', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('User Management Error', 'Failed to load user data.');
    }
  }

  /**
   * Load match management
   */
  async loadMatchManagement() {
    try {
      const matches = await window.apiClient.get('/api/admin/matches');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Match Management</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.createMatch()">
                <i class="fas fa-plus"></i> Create Match
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportMatches()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <!-- Match Filters -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Status:</label>
              <select id="match-status-filter">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="disputed">Disputed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Type:</label>
              <select id="match-type-filter">
                <option value="all">All Types</option>
                <option value="1v1">1v1</option>
                <option value="2v2">2v2</option>
                <option value="3v3">3v3</option>
                <option value="4v4">4v4</option>
                <option value="ffa">FFA</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Game:</label>
              <select id="match-game-filter">
                <option value="all">All Games</option>
                <option value="wc2">Warcraft 2</option>
                <option value="wc3">Warcraft 3</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Date Range:</label>
              <input type="date" id="match-date-from">
              <input type="date" id="match-date-to">
            </div>
          </div>

          <!-- Bulk Actions -->
          <div class="bulk-actions">
            <label>
              <input type="checkbox" class="bulk-select-all"> Select All
            </label>
            <button class="btn btn-sm btn-success" onclick="adminControlPanel.bulkVerifyMatches()">
              <i class="fas fa-check"></i> Verify
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminControlPanel.bulkRejectMatches()">
              <i class="fas fa-times"></i> Reject
            </button>
            <button class="btn btn-sm btn-warning" onclick="adminControlPanel.bulkDeleteMatches()">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>

          <!-- Matches Table -->
          <div class="data-table-container">
            ${matches && matches.length > 0 ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" class="bulk-select-all"></th>
                    <th>Match</th>
                    <th>Players</th>
                    <th>Map</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Screenshots</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${matches.map(match => `
                    <tr>
                      <td><input type="checkbox" class="bulk-select-item" value="${match._id}"></td>
                      <td>
                        <div class="match-info">
                          <div class="match-type">${match.matchType}</div>
                          <div class="match-id">#${match._id.slice(-6)}</div>
                        </div>
                      </td>
                      <td>
                        <div class="match-players">
                          ${match.players.map(player => `
                            <span class="player ${match.winner === player.name ? 'winner' : ''}">${player.name}</span>
                          `).join(' vs ')}
                        </div>
                      </td>
                      <td>${match.map?.name || 'Unknown'}</td>
                      <td>${this.ui.formatDate(match.date)}</td>
                      <td><span class="status-badge ${match.verification?.status || 'pending'}">${match.verification?.status || 'pending'}</span></td>
                      <td>
                        <span class="screenshot-count">${match.screenshots?.length || 0}</span>
                        ${match.screenshots?.length > 0 ? `<button class="btn btn-sm btn-link" onclick="adminControlPanel.viewMatchScreenshots('${match._id}')">View</button>` : ''}
                      </td>
                      <td>
                        <div class="action-buttons">
                          <button class="btn btn-sm btn-primary" onclick="adminControlPanel.editMatch('${match._id}')">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-sm btn-success" onclick="adminControlPanel.verifyMatch('${match._id}')">
                            <i class="fas fa-check"></i>
                          </button>
                          <button class="btn btn-sm btn-danger" onclick="adminControlPanel.rejectMatch('${match._id}')">
                            <i class="fas fa-times"></i>
                          </button>
                          <button class="btn btn-sm btn-warning" onclick="adminControlPanel.deleteMatch('${match._id}')">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="no-records-found">
                <div class="no-records-icon">
                  <i class="fas fa-gamepad"></i>
                </div>
                <h3>No Matches Found</h3>
                <p>There are currently no matches in the system. Matches will appear here once users start reporting them.</p>
                <button class="btn btn-primary" onclick="adminControlPanel.createMatch()">
                  <i class="fas fa-plus"></i> Report First Match
                </button>
              </div>
            `}
          </div>
        </div>
      `;

      this.setupMatchFilters(matches);

    } catch (error) {
      logger.error('Failed to load match management', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Match Management Error', 'Failed to load match data.');
    }
  }

  /**
   * Load dispute management
   */
  async loadDisputeManagement() {
    try {
      const response = await window.apiClient.get('/api/admin/disputes');
      const disputes = response.disputes || [];
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Dispute Resolution</h1>
            <div class="section-actions">
              <button class="btn btn-secondary" onclick="adminControlPanel.exportDisputes()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <!-- Dispute Filters -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Status:</label>
              <select id="dispute-status-filter">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Type:</label>
              <select id="dispute-type-filter">
                <option value="all">All Types</option>
                <option value="incorrect_result">Incorrect Result</option>
                <option value="incorrect_players">Incorrect Players</option>
                <option value="fake_match">Fake Match</option>
                <option value="technical_issue">Technical Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Priority:</label>
              <select id="dispute-priority-filter">
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <!-- Disputes Table -->
          <div class="data-table-container">
            ${disputes.length === 0 ? 
              `<div class="empty-state">
                <i class="fas fa-balance-scale"></i>
                <h3>No Disputes Found</h3>
                <p>There are no disputes to review at the moment.</p>
              </div>` : 
              `<table class="data-table">
                <thead>
                  <tr>
                    <th>Dispute</th>
                    <th>Match</th>
                    <th>Reporter</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${disputes.map(dispute => `
                    <tr>
                      <td>
                        <div class="dispute-info">
                          <div class="dispute-id">#${dispute._id.slice(-6)}</div>
                          <div class="dispute-summary">${(dispute.reason || 'No reason provided').substring(0, 50)}...</div>
                        </div>
                      </td>
                      <td>
                        <div class="match-link">
                          <span>${dispute.match?.matchType || 'Unknown'}</span>
                          <button class="btn btn-sm btn-link" onclick="adminControlPanel.viewMatch('${dispute.matchId}')">
                            View Match
                          </button>
                        </div>
                      </td>
                      <td>${dispute.reportedBy?.username || 'Unknown'}</td>
                      <td><span class="type-badge ${dispute.disputeType || 'other'}">${(dispute.disputeType || 'other').replace('_', ' ')}</span></td>
                      <td><span class="status-badge ${dispute.status || 'pending'}">${dispute.status || 'pending'}</span></td>
                      <td><span class="priority-badge ${dispute.priority || 'medium'}">${dispute.priority || 'medium'}</span></td>
                      <td>${this.ui.formatDate(dispute.createdAt)}</td>
                      <td>
                        <div class="action-buttons">
                          <button class="btn btn-sm btn-primary" onclick="adminControlPanel.reviewDispute('${dispute._id}')">
                            <i class="fas fa-gavel"></i> Review
                          </button>
                          <button class="btn btn-sm btn-success" onclick="adminControlPanel.resolveDispute('${dispute._id}')">
                            <i class="fas fa-check"></i> Resolve
                          </button>
                          <button class="btn btn-sm btn-danger" onclick="adminControlPanel.rejectDispute('${dispute._id}')">
                            <i class="fas fa-times"></i> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>`
            }
          </div>
        </div>
      `;

      this.setupDisputeFilters(disputes);

    } catch (error) {
      logger.error('Failed to load dispute management', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Dispute Management Error', 'Failed to load dispute data.');
    }
  }

  /**
   * Load map management
   */
  async loadMapManagement() {
    try {
      const maps = await window.apiClient.get('/api/admin/maps');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Map Management</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.uploadMap()">
                <i class="fas fa-upload"></i> Upload Map
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportMaps()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <!-- Map Filters -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Type:</label>
              <select id="map-type-filter">
                <option value="all">All Types</option>
                <option value="melee">Melee</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Size:</label>
              <select id="map-size-filter">
                <option value="all">All Sizes</option>
                <option value="32x32">32x32</option>
                <option value="64x64">64x64</option>
                <option value="96x96">96x96</option>
                <option value="128x128">128x128</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status:</label>
              <select id="map-status-filter">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="pending">Pending Review</option>
              </select>
            </div>
          </div>

          <!-- Bulk Actions -->
          <div class="bulk-actions">
            <label>
              <input type="checkbox" class="bulk-select-all"> Select All
            </label>
            <button class="btn btn-sm btn-success" onclick="adminControlPanel.bulkActivateMaps()">
              <i class="fas fa-check"></i> Activate
            </button>
            <button class="btn btn-sm btn-warning" onclick="adminControlPanel.bulkDisableMaps()">
              <i class="fas fa-pause"></i> Disable
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminControlPanel.bulkDeleteMaps()">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>

          <!-- Maps Grid -->
          <div class="maps-admin-grid">
            ${maps.map(map => `
              <div class="map-admin-card">
                <div class="map-selection">
                  <input type="checkbox" class="bulk-select-item" value="${map._id}">
                </div>
                <div class="map-thumbnail">
                  ${map.thumbnailPath ? 
                    `<img src="${map.thumbnailPath}" alt="${map.name}">` : 
                    `<div class="map-placeholder"><i class="fas fa-map"></i></div>`
                  }
                </div>
                <div class="map-info">
                  <h4>${map.name}</h4>
                  <div class="map-details">
                    <span class="map-type">${map.type}</span>
                    <span class="map-size">${map.size}</span>
                  </div>
                  <div class="map-stats">
                    <span><i class="fas fa-play"></i> ${map.playCount || 0}</span>
                    <span><i class="fas fa-download"></i> ${map.downloadCount || 0}</span>
                    <span><i class="fas fa-star"></i> ${map.averageRating ? map.averageRating.toFixed(1) : 'N/A'}</span>
                  </div>
                  <div class="map-status">
                    <span class="status-badge ${map.status || 'active'}">${map.status || 'active'}</span>
                  </div>
                </div>
                <div class="map-actions">
                  <button class="btn btn-sm btn-primary" onclick="adminControlPanel.editMap('${map._id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-info" onclick="adminControlPanel.viewMapDetails('${map._id}')">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-warning" onclick="adminControlPanel.toggleMapStatus('${map._id}')">
                    <i class="fas fa-toggle-on"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteMap('${map._id}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      this.setupMapFilters(maps);

    } catch (error) {
      logger.error('Failed to load map management', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Map Management Error', 'Failed to load map data.');
    }
  }

  /**
   * Load system settings
   */
  async loadSystemSettings() {
    try {
      const settings = await window.apiClient.get('/api/admin/settings');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>System Settings</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.saveSettings()">
                <i class="fas fa-save"></i> Save Settings
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.resetSettings()">
                <i class="fas fa-undo"></i> Reset to Defaults
              </button>
            </div>
          </div>

          <div class="settings-container">
            <!-- General Settings -->
            <div class="settings-section">
              <h3>General Settings</h3>
              <div class="settings-grid">
                <div class="setting-item">
                  <label for="site-name">Site Name:</label>
                  <input type="text" id="site-name" name="siteName" value="${settings.general.siteName}" class="form-control">
                </div>
                <div class="setting-item">
                  <label for="site-description">Site Description:</label>
                  <textarea id="site-description" name="siteDescription" class="form-control">${settings.general.siteDescription}</textarea>
                </div>
                <div class="setting-item">
                  <label for="maintenance-mode">Maintenance Mode:</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="maintenance-mode" name="maintenanceMode" ${settings.general.maintenanceMode ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-item">
                  <label for="registration-enabled">User Registration:</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="registration-enabled" name="registrationEnabled" ${settings.general.registrationEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Match Settings -->
            <div class="settings-section">
              <h3>Match Settings</h3>
              <div class="settings-grid">
                <div class="setting-item">
                  <label for="auto-verify-matches">Auto-verify Matches:</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="auto-verify-matches" name="autoVerifyMatches" ${settings.matches.autoVerify ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-item">
                  <label for="match-edit-window">Edit Window (hours):</label>
                  <input type="number" id="match-edit-window" name="matchEditWindow" value="${settings.matches.editWindow}" min="1" max="168" class="form-control">
                </div>
                <div class="setting-item">
                  <label for="required-screenshots">Required Screenshots:</label>
                  <input type="number" id="required-screenshots" name="requiredScreenshots" value="${settings.matches.requiredScreenshots}" min="1" max="10" class="form-control">
                </div>
                <div class="setting-item">
                  <label for="max-file-size">Max File Size (MB):</label>
                  <input type="number" id="max-file-size" name="maxFileSize" value="${settings.matches.maxFileSize}" min="1" max="50" class="form-control">
                </div>
              </div>
            </div>

            <!-- Tournament Settings -->
            <div class="settings-section">
              <h3>Tournament Settings</h3>
              <div class="settings-grid">
                <div class="setting-item">
                  <label for="max-tournaments-per-user">Max Tournaments per User:</label>
                  <input type="number" id="max-tournaments-per-user" name="maxTournamentsPerUser" value="${settings.tournaments.maxPerUser}" min="1" max="10" class="form-control">
                </div>
                <div class="setting-item">
                  <label for="tournament-creation-cost">Creation Cost (Arena Gold):</label>
                  <input type="number" id="tournament-creation-cost" name="tournamentCreationCost" value="${settings.tournaments.creationCost}" min="0" class="form-control">
                </div>
                <div class="setting-item">
                  <label for="auto-start-tournaments">Auto-start when Full:</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="auto-start-tournaments" name="autoStartTournaments" ${settings.tournaments.autoStart ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Clan Settings -->
            <div class="settings-section">
              <h3>Clan Settings</h3>
              <div class="settings-grid">
                <div class="setting-item">
                  <label for="clan-creation-cost">Creation Cost (Arena Gold):</label>
                  <input type="number" id="clan-creation-cost" name="clanCreationCost" value="${settings.clans.creationCost}" min="0" class="form-control">
                </div>
                <div class="setting-item">
                  <label for="max-clan-members">Max Members per Clan:</label>
                  <input type="number" id="max-clan-members" name="maxClanMembers" value="${settings.clans.maxMembers}" min="5" max="100" class="form-control">
                </div>
                <div class="setting-item">
                  <label for="clan-tag-length">Max Tag Length:</label>
                  <input type="number" id="clan-tag-length" name="clanTagLength" value="${settings.clans.maxTagLength}" min="2" max="8" class="form-control">
                </div>
              </div>
            </div>

            <!-- Achievement Settings -->
            <div class="settings-section">
              <h3>Achievement Settings</h3>
              <div class="settings-grid">
                <div class="setting-item">
                  <label for="achievement-notifications">Enable Notifications:</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="achievement-notifications" name="achievementNotifications" ${settings.achievements.notifications ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-item">
                  <label for="retroactive-achievements">Retroactive Processing:</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="retroactive-achievements" name="retroactiveAchievements" ${settings.achievements.retroactive ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-item">
                  <label for="base-experience-reward">Base Experience Reward:</label>
                  <input type="number" id="base-experience-reward" name="baseExperienceReward" value="${settings.achievements.baseExperience}" min="1" class="form-control">
                </div>
              </div>
            </div>

            <!-- Database Backup -->
            <div class="settings-section">
              <h3>Database Backup</h3>
              <div class="backup-section">
                <div class="backup-actions">
                  <button class="btn btn-primary" onclick="adminControlPanel.createDatabaseBackup()">
                    <i class="fas fa-database"></i> Create Backup
                  </button>
                  <p class="backup-info">
                    <i class="fas fa-info-circle"></i>
                    Regular backups help protect your data. Backups are created using mongodump and stored locally.
                  </p>
                </div>
                <div id="backup-list" class="backup-list">
                  <!-- Backup list will be loaded here -->
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Load the backup list
      await this.refreshBackupList();

    } catch (error) {
      logger.error('Failed to load system settings', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('System Settings Error', 'Failed to load settings.');
    }
  }

  /**
   * Render activity feed
   */
  renderActivityFeed(activities) {
    if (!activities || activities.length === 0) {
      return '<div class="no-activity">No recent activity</div>';}

    return activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="fas ${this.getActivityIcon(activity.type)}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${this.ui.formatRelativeTime(activity.timestamp)}</div>
        </div>
      </div>
    `).join('');}

  /**
   * Get activity icon
   */
  getActivityIcon(type) {
    const icons = {
      'user_registered': 'fa-user-plus',
      'match_reported': 'fa-gamepad',
      'tournament_created': 'fa-trophy',
      'clan_created': 'fa-shield-alt',
      'dispute_filed': 'fa-flag',
      'map_uploaded': 'fa-map',
      'achievement_unlocked': 'fa-medal'
    };
    return icons[type] || 'fa-info-circle';}

  /**
   * Setup user filters
   */
  setupUserFilters(allUsers) {
    const roleFilter = document.getElementById('user-role-filter');
    const statusFilter = document.getElementById('user-status-filter');
    const searchInput = document.getElementById('user-search');

    const applyFilters = () => {
      // Implementation for filtering users
      console.log('Applying user filters');
    };

    roleFilter?.addEventListener('change', applyFilters);
    statusFilter?.addEventListener('change', applyFilters);
    searchInput?.addEventListener('input', applyFilters);
  }

  /**
   * Setup match filters
   */
  setupMatchFilters(allMatches) {
    // Implementation for match filters
    console.log('Setting up match filters');
  }

  /**
   * Setup dispute filters
   */
  setupDisputeFilters(allDisputes) {
    // Implementation for dispute filters
    console.log('Setting up dispute filters');
  }

  /**
   * Setup map filters
   */
  setupMapFilters(allMaps) {
    // Implementation for map filters
    console.log('Setting up map filters');
  }

  /**
   * Handle bulk select all
   */
  handleBulkSelectAll(checked) {
    document.querySelectorAll('.bulk-select-item').forEach(checkbox => {
      checkbox.checked = checked;
      if (checked) {
        this.state.selectedItems.add(checkbox.value);
      } else {
        this.state.selectedItems.delete(checkbox.value);
      }
    });
  }

  /**
   * Handle bulk select item
   */
  handleBulkSelectItem(value, checked) {
    if (checked) {
      this.state.selectedItems.add(value);
    } else {
      this.state.selectedItems.delete(value);
    }
  }

  /**
   * Refresh dashboard
   */
  async refreshDashboard() {
    await this.loadDashboard();
  }

  /**
   * Export system report
   */
  async exportSystemReport() {
    try {
      const response = await window.apiClient.get('/api/admin/export/system-report');
      // Handle file download
      this.ui.showSuccess('System report exported successfully.');
    } catch (error) {
      logger.error('Failed to export system report', error);
      this.ui.showError('Failed to export system report.');
    }
  }

  // User Management Methods
  async createUser() {
    const modal = this.ui.createModal('create-user-modal', 'Create New User', `
      <form id="create-user-form" class="form">
        <div class="form-group">
          <label for="new-username">Username:</label>
          <input type="text" id="new-username" name="username" required>
        </div>
        <div class="form-group">
          <label for="new-email">Email:</label>
          <input type="email" id="new-email" name="email" required>
        </div>
        <div class="form-group">
          <label for="new-password">Password:</label>
          <input type="password" id="new-password" name="password" required>
        </div>
        <div class="form-group">
          <label for="new-role">Role:</label>
          <select id="new-role" name="role" required>
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create User</button>
        </div>
      </form>
    `);

    document.getElementById('create-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const formData = new FormData(e.target);
        await window.apiClient.post('/admin/users', Object.fromEntries(formData));
        this.ui.showSuccess('User created successfully');
        modal.remove();
        await this.loadUserManagement();
      } catch (error) {
        this.ui.showError(`Failed to create user: ${error.message}`);
      }
    });
  }

  async editUser(userId) {
    try {
      const user = await window.apiClient.get(`/api/admin/users/${userId}`);
      const modal = this.ui.createModal('edit-user-modal', 'Edit User', `
        <form id="edit-user-form" class="form">
          <div class="form-group">
            <label for="edit-username">Username:</label>
            <input type="text" id="edit-username" name="username" value="${user.username}" required>
          </div>
          <div class="form-group">
            <label for="edit-email">Email:</label>
            <input type="email" id="edit-email" name="email" value="${user.email}" required>
          </div>
          <div class="form-group">
            <label for="edit-role">Role:</label>
            <select id="edit-role" name="role" required>
              <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
              <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Moderator</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit-status">Status:</label>
            <select id="edit-status" name="status" required>
              <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
              <option value="banned" ${user.status === 'banned' ? 'selected' : ''}>Banned</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Update User</button>
          </div>
        </form>
      `);

      document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const formData = new FormData(e.target);
          await window.apiClient.put(`/api/admin/users/${userId}`, Object.fromEntries(formData));
          this.ui.showSuccess('User updated successfully');
          modal.remove();
          await this.loadUserManagement();
        } catch (error) {
          this.ui.showError(`Failed to update user: ${error.message}`);
        }
      });
    } catch (error) {
      this.ui.showError(`Failed to load user details: ${error.message}`);
    }
  }

  async manageUserPermissions(userId) {
    try {
      const user = await window.apiClient.get(`/api/admin/users/${userId}`);
      const permissions = user.permissions || {
        canReportMatches: true,
        canCreateTournaments: false,
        canUploadMaps: true,
        canUseChat: true,
        canCreateClans: true
      };

      const modal = this.ui.createModal('manage-permissions-modal', `Manage Permissions - ${user.username}`, `
        <form id="permissions-form" class="form">
          <div class="permissions-grid">
            <div class="permission-item">
              <label class="permission-label">
                <input type="checkbox" name="canReportMatches" ${permissions.canReportMatches ? 'checked' : ''}>
                <span class="permission-title">Can Report Matches</span>
                <small class="permission-desc">Allow user to report match results</small>
              </label>
            </div>

            <div class="permission-item">
              <label class="permission-label">
                <input type="checkbox" name="canCreateTournaments" ${permissions.canCreateTournaments ? 'checked' : ''}>
                <span class="permission-title">Can Create Tournaments</span>
                <small class="permission-desc">Allow user to create and manage tournaments</small>
              </label>
            </div>

            <div class="permission-item">
              <label class="permission-label">
                <input type="checkbox" name="canUploadMaps" ${permissions.canUploadMaps ? 'checked' : ''}>
                <span class="permission-title">Can Upload Maps</span>
                <small class="permission-desc">Allow user to upload new maps</small>
              </label>
            </div>

            <div class="permission-item">
              <label class="permission-label">
                <input type="checkbox" name="canUseChat" ${permissions.canUseChat ? 'checked' : ''}>
                <span class="permission-title">Can Use Chat</span>
                <small class="permission-desc">Allow user to participate in chat</small>
              </label>
            </div>

            <div class="permission-item">
              <label class="permission-label">
                <input type="checkbox" name="canCreateClans" ${permissions.canCreateClans ? 'checked' : ''}>
                <span class="permission-title">Can Create Clans</span>
                <small class="permission-desc">Allow user to create and manage clans</small>
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Permissions</button>
          </div>
        </form>
      `);

      document.getElementById('permissions-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const formData = new FormData(e.target);
          const updatedPermissions = {
            canReportMatches: formData.has('canReportMatches'),
            canCreateTournaments: formData.has('canCreateTournaments'),
            canUploadMaps: formData.has('canUploadMaps'),
            canUseChat: formData.has('canUseChat'),
            canCreateClans: formData.has('canCreateClans')
          };

          await window.apiClient.put(`/api/admin/users/${userId}/permissions`, { permissions: updatedPermissions });
          this.ui.showSuccess('User permissions updated successfully');
          modal.remove();
          await this.loadUserManagement();
        } catch (error) {
          this.ui.showError(`Failed to update permissions: ${error.message}`);
        }
      });
    } catch (error) {
      this.ui.showError(`Failed to load user permissions: ${error.message}`);
    }
  }

  async banUser(userId) {
    try {
      const user = await window.apiClient.get(`/admin/users/${userId}`);
      const modal = this.ui.createModal('ban-user-modal', `Ban User - ${user.username}`, `
        <form id="ban-user-form" class="form">
          <div class="form-group">
            <label for="ban-reason">Reason for Ban:</label>
            <textarea id="ban-reason" name="reason" rows="3" placeholder="Enter reason for banning this user..." required></textarea>
          </div>

          <div class="form-group">
            <label for="ban-type">Ban Type:</label>
            <select id="ban-type" name="type">
              <option value="temporary" selected>Temporary</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>

          <div class="form-group" id="ban-duration-group">
            <label>Duration</label>
            <div style="display:flex; gap:.5rem; align-items:center;">
              <input type="number" name="durationHours" min="1" placeholder="Hours" style="width:120px;">
              <span>or until</span>
              <input type="datetime-local" name="until" style="width:220px;">
            </div>
          </div>

          <div class="form-group">
            <label>Scope</label>
            <div style="display:flex; gap:1rem;">
              <label><input type="checkbox" name="scope_chat" checked> Chat</label>
              <label><input type="checkbox" name="scope_reportMatches" checked> Report Matches</label>
              <label><input type="checkbox" name="scope_postContent" checked> Post Content</label>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-danger">Ban User</button>
          </div>
        </form>
      `);

      document.getElementById('ban-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const formData = new FormData(e.target);
          const banData = {
            reason: formData.get('reason'),
            type: formData.get('type') || 'temporary',
            durationHours: formData.get('durationHours') ? parseInt(formData.get('durationHours')) : undefined,
            until: formData.get('until') || undefined,
            scope: {
              chat: formData.get('scope_chat') !== null,
              reportMatches: formData.get('scope_reportMatches') !== null,
              postContent: formData.get('scope_postContent') !== null
            }
          };

          await window.apiClient.put(`/api/admin/users/${userId}/ban`, banData);
          this.ui.showSuccess('User banned successfully');
          modal.remove();
          await this.loadUserManagement();
        } catch (error) {
          this.ui.showError(`Failed to ban user: ${error.message}`);
        }
      });
      // Toggle duration visibility
      const typeSel = document.getElementById('ban-type');
      const durationGroup = document.getElementById('ban-duration-group');
      typeSel.addEventListener('change', () => {
        durationGroup.style.display = typeSel.value === 'temporary' ? '' : 'none';
      });
    } catch (error) {
      this.ui.showError(`Failed to load user details: ${error.message}`);
    }
  }

  async viewUserDetails(userId) {
    try {
      const user = await window.apiClient.get(`/api/admin/users/${userId}/details`);
      this.ui.createModal('user-details-modal', 'User Details', `
        <div class="user-details-content">
          <div class="user-profile">
            <img src="${user.avatar || '/images/default-avatar.png'}" alt="${user.username}" class="user-avatar-large">
            <h3>${user.username}</h3>
            <p>${user.email}</p>
            <span class="role-badge ${user.role}">${user.role}</span>
            <span class="status-badge ${user.status}">${user.status}</span>
          </div>
          <div class="user-stats">
            <h4>Statistics</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <label>Matches Played:</label>
                <span>${user.stats.matchesPlayed}</span>
              </div>
              <div class="stat-item">
                <label>Wins:</label>
                <span>${user.stats.wins}</span>
              </div>
              <div class="stat-item">
                <label>Win Rate:</label>
                <span>${user.stats.winRate}%</span>
              </div>
              <div class="stat-item">
                <label>Current Rank:</label>
                <span>${user.stats.currentRank}</span>
              </div>
              <div class="stat-item">
                <label>Joined:</label>
                <span>${this.ui.formatDate(user.createdAt)}</span>
              </div>
              <div class="stat-item">
                <label>Last Active:</label>
                <span>${user.lastActive ? this.ui.formatDate(user.lastActive) : 'Never'}</span>
              </div>
            </div>
          </div>
        </div>
      `);
    } catch (error) {
      this.ui.showError(`Failed to load user details: ${error.message}`);
    }
  }

  async suspendUser(userId) {
    const confirmed = await this.ui.confirm('Suspend User', 'Are you sure you want to suspend this user?');
    if (!confirmed) return;try {
      await window.apiClient.put(`/admin/users/${userId}/suspend`);
      this.ui.showSuccess('User suspended successfully');
      await this.loadUserManagement();
    } catch (error) {
      this.ui.showError(`Failed to suspend user: ${error.message}`);
    }
  }

  async unbanUser(userId) {
    const confirmed = await this.ui.confirm('Unban User', 'Are you sure you want to unban this user?');
    if (!confirmed) return;try {
      const resp = await window.apiClient.put(`/api/admin/users/${userId}/unban`, {});
      const data = resp.json ? await resp.json() : resp;
      if (data && (data.success === false || data.error)) {
        this.ui.showError(data.error || 'Failed to unban user');
      } else {
        this.ui.showSuccess('User unbanned successfully');
        await this.loadUserManagement();
      }
    } catch (e) {
      this.ui.showError(`Failed to unban user: ${e.message}`);
    }
  }

  async deleteUser(userId) {
    const confirmed = await this.ui.confirm(
      'Delete User Account',
      'Are you sure you want to delete this user account? This will permanently remove the user and clean up all their related data (posts, messages, etc.) but preserve maps, players, and tournaments they created. This action cannot be undone.'
    );
    if (!confirmed) return;try {
      // Use the same endpoint as self-deletion but for admin
      await window.apiClient.delete(`/api/admin/users/${userId}/delete-account`);
      this.ui.showSuccess('User account deleted successfully');
      await this.loadUserManagement();
    } catch (error) {
      this.ui.showError(`Failed to delete user account: ${error.message}`);
    }
  }

  async bulkSuspendUsers() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select users to suspend');
      return;}

    const confirmed = await this.ui.confirm('Bulk Suspend', `Suspend ${this.state.selectedItems.size} selected users?`);
    if (!confirmed) return;try {
      await window.apiClient.post('/admin/users/bulk-suspend', { userIds: Array.from(this.state.selectedItems) });
      this.ui.showSuccess(`${this.state.selectedItems.size} users suspended successfully`);
      this.state.selectedItems.clear();
      await this.loadUserManagement();
    } catch (error) {
      this.ui.showError(`Failed to suspend users: ${error.message}`);
    }
  }

  async bulkBanUsers() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select users to ban');
      return;}

    const confirmed = await this.ui.confirm('Bulk Ban', `Ban ${this.state.selectedItems.size} selected users?`);
    if (!confirmed) return;try {
      await window.apiClient.post('/admin/users/bulk-ban', { userIds: Array.from(this.state.selectedItems) });
      this.ui.showSuccess(`${this.state.selectedItems.size} users banned successfully`);
      this.state.selectedItems.clear();
      await this.loadUserManagement();
    } catch (error) {
      this.ui.showError(`Failed to ban users: ${error.message}`);
    }
  }

  async bulkActivateUsers() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select users to activate');
      return;}

    const confirmed = await this.ui.confirm('Bulk Activate', `Activate ${this.state.selectedItems.size} selected users?`);
    if (!confirmed) return;try {
      await window.apiClient.post('/admin/users/bulk-activate', { userIds: Array.from(this.state.selectedItems) });
      this.ui.showSuccess(`${this.state.selectedItems.size} users activated successfully`);
      this.state.selectedItems.clear();
      await this.loadUserManagement();
    } catch (error) {
      this.ui.showError(`Failed to activate users: ${error.message}`);
    }
  }

  // Match Management Methods
  async createMatch() {
    window.matchReportManager.showReportModal();
  }

  async editMatch(matchId) {
    window.matchDisputeManager.showEditMatchModal(matchId);
  }

  async verifyMatch(matchId) {
    const confirmed = await this.ui.confirm('Verify Match', 'Are you sure you want to verify this match?');
    if (!confirmed) return;try {
      await window.apiClient.put(`/admin/matches/${matchId}/verify`);
      this.ui.showSuccess('Match verified successfully');
      await this.loadMatchManagement();
    } catch (error) {
      this.ui.showError(`Failed to verify match: ${error.message}`);
    }
  }

  async rejectMatch(matchId) {
    const reason = await this.ui.prompt('Reject Match', 'Please provide a reason for rejecting this match:');
    if (!reason) return;try {
      await window.apiClient.put(`/admin/matches/${matchId}/reject`, { reason });
      this.ui.showSuccess('Match rejected successfully');
      await this.loadMatchManagement();
    } catch (error) {
      this.ui.showError(`Failed to reject match: ${error.message}`);
    }
  }

  async deleteMatch(matchId) {
    const confirmed = await this.ui.confirm('Delete Match', 'Are you sure you want to delete this match? This action cannot be undone.');
    if (!confirmed) return;try {
      await window.apiClient.delete(`/admin/matches/${matchId}`);
      this.ui.showSuccess('Match deleted successfully');
      await this.loadMatchManagement();
    } catch (error) {
      this.ui.showError(`Failed to delete match: ${error.message}`);
    }
  }

  /**
   * Load Audit Logs viewer
   */
  async loadAuditLogs() {
    try {
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Audit Logs</h1>
            <div class="section-actions">
              <button class="btn btn-secondary" id="audit-refresh"><i class="fas fa-sync"></i> Refresh</button>
            </div>
          </div>
          <div class="filters-bar">
            <div class="filter-group"><label>Actor</label><input type="text" id="flt-actor" placeholder="Username"></div>
            <div class="filter-group"><label>Action</label><input type="text" id="flt-action" placeholder="action key"></div>
            <div class="filter-group"><label>Target</label><input type="text" id="flt-target" placeholder="target type"></div>
            <div class="filter-group"><label>Status</label><select id="flt-status"><option value="">Any</option><option>success</option><option>failure</option></select></div>
            <div class="filter-group"><label>From</label><input type="date" id="flt-from"></div>
            <div class="filter-group"><label>To</label><input type="date" id="flt-to"></div>
            <button class="btn btn-primary" id="audit-apply">Apply</button>
          </div>
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th><th>Status</th><th>Details</th>
                </tr>
              </thead>
              <tbody id="audit-rows"><tr><td colspan="7">Loading...</td></tr></tbody>
            </table>
            <div class="pagination" id="audit-pager"></div>
          </div>
        </div>`;

      const load = async (page=1) => {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', 50);
        const actor = document.getElementById('flt-actor').value.trim();
        const action = document.getElementById('flt-action').value.trim();
        const target = document.getElementById('flt-target').value.trim();
        const status = document.getElementById('flt-status').value;
        const from = document.getElementById('flt-from').value;
        const to = document.getElementById('flt-to').value;
        if (actor) params.set('actorUsername', actor);
        if (action) params.set('action', action);
        if (target) params.set('targetType', target);
        if (status) params.set('status', status);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const resp = await window.apiClient.get(`/api/admin/audit-logs?${params.toString()}`);
        const data = resp.json ? await resp.json() : resp;
        const rows = document.getElementById('audit-rows');
        if (!data.success) {
          rows.innerHTML = `<tr><td colspan="7">Failed to load logs</td></tr>`;
          return;}
        rows.innerHTML = data.logs.map(l => `
          <tr>
            <td>${new Date(l.createdAt).toLocaleString()}</td>
            <td>${l.actorUsername}</td>
            <td>${l.actorRole}</td>
            <td>${l.action}</td>
            <td>${l.targetType} (${l.targetId||''})</td>
            <td>${l.status}</td>
            <td><pre style="white-space:pre-wrap;max-width:520px;overflow:auto;">${this.escapeHtml(JSON.stringify(l.details||{}, null, 2))}</pre></td>
          </tr>`).join('');
        const pager = document.getElementById('audit-pager');
        pager.innerHTML = `Page ${data.pagination.page} / ${data.pagination.pages}`;
      };

      document.getElementById('audit-apply').addEventListener('click', () => load(1));
      document.getElementById('audit-refresh').addEventListener('click', () => load(1));
      await load(1);
    } catch (e) {
      logger.error('Audit logs load failed', e);
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = this.ui.createErrorState('Audit Logs Error', 'Failed to load logs.');
    }
  }

  async viewMatchScreenshots(matchId) {
    try {
      const match = await window.apiClient.get(`/admin/matches/${matchId}/screenshots`);
      this.ui.createModal('match-screenshots-modal', 'Match Screenshots', `
        <div class="screenshots-gallery">
          ${match.screenshots.map((screenshot, index) => `
            <div class="screenshot-item">
              <img src="${screenshot.url}" alt="Screenshot ${index + 1}" onclick="window.open('${screenshot.url}', '_blank')">
              <div class="screenshot-actions">
                <button class="btn btn-sm btn-danger" onclick="adminControlPanel.flagScreenshot('${screenshot.url}')">
                  <i class="fas fa-flag"></i> Flag
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `);
    } catch (error) {
      this.ui.showError(`Failed to load screenshots: ${error.message}`);
    }
  }

  async bulkVerifyMatches() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select matches to verify');
      return;}

    const confirmed = await this.ui.confirm('Bulk Verify', `Verify ${this.state.selectedItems.size} selected matches?`);
    if (!confirmed) return;try {
      await window.apiClient.post('/admin/matches/bulk-verify', { matchIds: Array.from(this.state.selectedItems) });
      this.ui.showSuccess(`${this.state.selectedItems.size} matches verified successfully`);
      this.state.selectedItems.clear();
      await this.loadMatchManagement();
    } catch (error) {
      this.ui.showError(`Failed to verify matches: ${error.message}`);
    }
  }

  async bulkRejectMatches() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select matches to reject');
      return;}

    const reason = await this.ui.prompt('Bulk Reject', 'Please provide a reason for rejecting these matches:');
    if (!reason) return;try {
      await window.apiClient.post('/admin/matches/bulk-reject', { 
        matchIds: Array.from(this.state.selectedItems),
        reason 
      });
      this.ui.showSuccess(`${this.state.selectedItems.size} matches rejected successfully`);
      this.state.selectedItems.clear();
      await this.loadMatchManagement();
    } catch (error) {
      this.ui.showError(`Failed to reject matches: ${error.message}`);
    }
  }

  async bulkDeleteMatches() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select matches to delete');
      return;}

    const confirmed = await this.ui.confirm('Bulk Delete', `Delete ${this.state.selectedItems.size} selected matches? This action cannot be undone.`);
    if (!confirmed) return;try {
      await window.apiClient.post('/admin/matches/bulk-delete', { matchIds: Array.from(this.state.selectedItems) });
      this.ui.showSuccess(`${this.state.selectedItems.size} matches deleted successfully`);
      this.state.selectedItems.clear();
      await this.loadMatchManagement();
    } catch (error) {
      this.ui.showError(`Failed to delete matches: ${error.message}`);
    }
  }

  // Dispute Management Methods
  async reviewDispute(disputeId) {
    try {
      const dispute = await window.apiClient.get(`/admin/disputes/${disputeId}`);
      this.ui.createModal('review-dispute-modal', 'Review Dispute', `
        <div class="dispute-review-content">
          <div class="dispute-info">
            <h3>Dispute #${dispute._id.slice(-6)}</h3>
            <div class="dispute-details">
              <div class="detail-item">
                <label>Type:</label>
                <span>${dispute.disputeType.replace('_', ' ')}</span>
              </div>
              <div class="detail-item">
                <label>Reporter:</label>
                <span>${dispute.reportedBy.username}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge ${dispute.status}">${dispute.status}</span>
              </div>
              <div class="detail-item">
                <label>Created:</label>
                <span>${this.ui.formatDate(dispute.createdAt)}</span>
              </div>
            </div>
          </div>
          
          <div class="dispute-reason">
            <h4>Reason</h4>
            <p>${dispute.reason}</p>
          </div>
          
          ${dispute.correctInfo ? `
            <div class="correct-info">
              <h4>Correct Information</h4>
              <p>${dispute.correctInfo}</p>
            </div>
          ` : ''}
          
          ${dispute.evidence && dispute.evidence.length > 0 ? `
            <div class="dispute-evidence">
              <h4>Evidence</h4>
              <div class="evidence-gallery">
                ${dispute.evidence.map((evidence, index) => `
                  <img src="${evidence.url}" alt="Evidence ${index + 1}" onclick="window.open('${evidence.url}', '_blank')">
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="review-actions">
            <button class="btn btn-success" onclick="adminControlPanel.resolveDispute('${disputeId}')">
              <i class="fas fa-check"></i> Resolve
            </button>
            <button class="btn btn-danger" onclick="adminControlPanel.rejectDispute('${disputeId}')">
              <i class="fas fa-times"></i> Reject
            </button>
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
              Close
            </button>
          </div>
        </div>
      `);
    } catch (error) {
      this.ui.showError(`Failed to load dispute: ${error.message}`);
    }
  }

  async resolveDispute(disputeId) {
    const resolution = await this.ui.prompt('Resolve Dispute', 'Please provide a resolution summary:');
    if (!resolution) return;try {
      await window.apiClient.put(`/admin/disputes/${disputeId}/resolve`, { resolution });
      this.ui.showSuccess('Dispute resolved successfully');
      document.querySelector('.modal')?.remove();
      await this.loadDisputeManagement();
    } catch (error) {
      this.ui.showError(`Failed to resolve dispute: ${error.message}`);
    }
  }

  async rejectDispute(disputeId) {
    const reason = await this.ui.prompt('Reject Dispute', 'Please provide a reason for rejecting this dispute:');
    if (!reason) return;try {
      await window.apiClient.put(`/admin/disputes/${disputeId}/reject`, { reason });
      this.ui.showSuccess('Dispute rejected successfully');
      document.querySelector('.modal')?.remove();
      await this.loadDisputeManagement();
    } catch (error) {
      this.ui.showError(`Failed to reject dispute: ${error.message}`);
    }
  }

  // Map Management Methods
  async uploadMap() {
    const modal = this.ui.createModal('upload-map-modal', 'Upload Map', `
      <form id="upload-map-form" class="form" enctype="multipart/form-data">
        <div class="form-group">
          <label for="map-name">Map Name:</label>
          <input type="text" id="map-name" name="name" required>
        </div>
        <div class="form-group">
          <label for="map-type">Type:</label>
          <select id="map-type" name="type" required>
            <option value="melee">Melee</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label for="map-size">Size:</label>
          <select id="map-size" name="size" required>
            <option value="32x32">32x32</option>
            <option value="64x64">64x64</option>
            <option value="96x96">96x96</option>
            <option value="128x128">128x128</option>
          </select>
        </div>
        <div class="form-group">
          <label for="map-game-type">Game Type:</label>
          <select id="map-game-type" name="gameType" required>
            <option value="wc2">Warcraft 2</option>
            <option value="wc3">Warcraft 3</option>
          </select>
        </div>
        <div class="form-group">
          <label for="map-file">Map File:</label>
          <input type="file" id="map-file" name="mapFile" accept=".pud,.w3x,.w3m" required>
        </div>
        <div class="info-box" style="background: rgba(0,123,255,0.1); border: 1px solid rgba(0,123,255,0.3); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
          <strong>✨ Auto-Generated Features:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #666;">
            <li>Map thumbnail - Generated from actual tileset graphics</li>
            <li>Map dimensions and player count</li>
            <li>Tileset type detection</li>
            <li>Water analysis and terrain features</li>
          </ul>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Upload Map</button>
        </div>
      </form>
    `);

    document.getElementById('upload-map-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const formData = new FormData(e.target);
        await window.apiClient.post('/admin/maps', formData);
        this.ui.showSuccess('Map uploaded successfully');
        modal.remove();
        await this.loadMapManagement();
      } catch (error) {
        this.ui.showError(`Failed to upload map: ${error.message}`);
      }
    });
  }

  async editMap(mapId) {
    try {
      const map = await window.apiClient.get(`/admin/maps/${mapId}`);
      const modal = this.ui.createModal('edit-map-modal', 'Edit Map', `
        <form id="edit-map-form" class="form">
          <div class="form-group">
            <label for="edit-map-name">Map Name:</label>
            <input type="text" id="edit-map-name" name="name" value="${map.name}" required>
          </div>
          <div class="form-group">
            <label for="edit-map-type">Type:</label>
            <select id="edit-map-type" name="type" required>
              <option value="melee" ${map.type === 'melee' ? 'selected' : ''}>Melee</option>
              <option value="custom" ${map.type === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit-map-status">Status:</label>
            <select id="edit-map-status" name="status" required>
              <option value="active" ${map.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="disabled" ${map.status === 'disabled' ? 'selected' : ''}>Disabled</option>
              <option value="pending" ${map.status === 'pending' ? 'selected' : ''}>Pending</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Map</button>
          </div>
        </form>
      `);

      document.getElementById('edit-map-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const formData = new FormData(e.target);
          await window.apiClient.put(`/admin/maps/${mapId}`, Object.fromEntries(formData));
          this.ui.showSuccess('Map updated successfully');
          modal.remove();
          await this.loadMapManagement();
        } catch (error) {
          this.ui.showError(`Failed to update map: ${error.message}`);
        }
      });
    } catch (error) {
      this.ui.showError(`Failed to load map details: ${error.message}`);
    }
  }

  async viewMapDetails(mapId) {
    try {
      const map = await window.apiClient.get(`/admin/maps/${mapId}/details`);
      this.ui.createModal('map-details-modal', 'Map Details', `
        <div class="map-details-content">
          <div class="map-preview">
            ${map.thumbnailPath ? 
              `<img src="${map.thumbnailPath}" alt="${map.name}" class="map-image-large">` : 
              `<div class="map-placeholder-large"><i class="fas fa-map"></i></div>`
            }
          </div>
          <div class="map-info-detailed">
            <h3>${map.name}</h3>
            <div class="map-stats-detailed">
              <div class="stat-item">
                <label>Type:</label>
                <span>${map.type}</span>
              </div>
              <div class="stat-item">
                <label>Size:</label>
                <span>${map.size}</span>
              </div>
              <div class="stat-item">
                <label>Game Type:</label>
                <span>${map.gameType}</span>
              </div>
              <div class="stat-item">
                <label>Status:</label>
                <span class="status-badge ${map.status}">${map.status}</span>
              </div>
              <div class="stat-item">
                <label>Play Count:</label>
                <span>${map.playCount}</span>
              </div>
              <div class="stat-item">
                <label>Download Count:</label>
                <span>${map.downloadCount}</span>
              </div>
              <div class="stat-item">
                <label>Average Rating:</label>
                <span>${map.averageRating ? map.averageRating.toFixed(1) : 'N/A'}</span>
              </div>
              <div class="stat-item">
                <label>Uploaded:</label>
                <span>${this.ui.formatDate(map.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      `);
    } catch (error) {
      this.ui.showError(`Failed to load map details: ${error.message}`);
    }
  }

  async toggleMapStatus(mapId) {
    try {
      await window.apiClient.put(`/admin/maps/${mapId}/toggle-status`);
      this.ui.showSuccess('Map status updated successfully');
      await this.loadMapManagement();
    } catch (error) {
      this.ui.showError(`Failed to update map status: ${error.message}`);
    }
  }

  async deleteMap(mapId) {
    const confirmed = await this.ui.confirm('Delete Map', 'Are you sure you want to delete this map? This action cannot be undone.');
    if (!confirmed) return;try {
      await window.apiClient.delete(`/admin/maps/${mapId}`);
      this.ui.showSuccess('Map deleted successfully');
      await this.loadMapManagement();
    } catch (error) {
      this.ui.showError(`Failed to delete map: ${error.message}`);
    }
  }

  async bulkActivateMaps() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select maps to activate');
      return;}

    try {
      await window.apiClient.post('/admin/maps/bulk-activate', { mapIds: Array.from(this.state.selectedItems) });
      this.ui.showSuccess(`${this.state.selectedItems.size} maps activated successfully`);
      this.state.selectedItems.clear();
      await this.loadMapManagement();
    } catch (error) {
      this.ui.showError(`Failed to activate maps: ${error.message}`);
    }
  }

  async bulkDisableMaps() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select maps to disable');
      return;}

    try {
      await window.apiClient.post('/admin/maps/bulk-disable', { mapIds: Array.from(this.state.selectedItems) });
      this.ui.showSuccess(`${this.state.selectedItems.size} maps disabled successfully`);
      this.state.selectedItems.clear();
      await this.loadMapManagement();
    } catch (error) {
      this.ui.showError(`Failed to disable maps: ${error.message}`);
    }
  }

  async bulkDeleteMaps() {
    if (this.state.selectedItems.size === 0) {
      this.ui.showError('Please select maps to delete');
      return;}

    const confirmed = await this.ui.confirm('Bulk Delete', `Delete ${this.state.selectedItems.size} selected maps? This action cannot be undone.`);
    if (!confirmed) return;try {
      await window.apiClient.post('/admin/maps/bulk-delete', { mapIds: Array.from(this.state.selectedItems) });
      this.ui.showSuccess(`${this.state.selectedItems.size} maps deleted successfully`);
      this.state.selectedItems.clear();
      await this.loadMapManagement();
    } catch (error) {
      this.ui.showError(`Failed to delete maps: ${error.message}`);
    }
  }

  // Settings Management Methods
  async saveSettings() {
    try {
      const settings = {};
      
      // Collect all form inputs
      document.querySelectorAll('.settings-container input, .settings-container select, .settings-container textarea').forEach(input => {
        if (input.type === 'checkbox') {
          settings[input.name] = input.checked;
        } else if (input.type === 'number') {
          settings[input.name] = parseInt(input.value);
        } else {
          settings[input.name] = input.value;
        }
      });

      await window.apiClient.put('/admin/settings', settings);
      this.ui.showSuccess('Settings saved successfully');
    } catch (error) {
      this.ui.showError(`Failed to save settings: ${error.message}`);
    }
  }

  async resetSettings() {
    const confirmed = await this.ui.confirm('Reset Settings', 'Are you sure you want to reset all settings to their default values?');
    if (!confirmed) return;try {
      await window.apiClient.post('/admin/settings/reset');
      this.ui.showSuccess('Settings reset to defaults');
      await this.loadSystemSettings();
    } catch (error) {
      this.ui.showError(`Failed to reset settings: ${error.message}`);
    }
  }

  // Helper method for flagging screenshots
  async flagScreenshot(url) {
    const confirmed = await this.ui.confirm('Flag Screenshot', 'Are you sure you want to flag this screenshot as inappropriate?');
    if (!confirmed) return;try {
      await window.apiClient.post('/admin/screenshots/flag', { url });
      this.ui.showSuccess('Screenshot flagged successfully');
    } catch (error) {
      this.ui.showError(`Failed to flag screenshot: ${error.message}`);
    }
  }

  /**
   * Load tournament management
   */
  async loadTournamentManagement() {
    try {
      const tournaments = await window.apiClient.get('/api/admin/tournaments');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Tournament Management</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.createTournament()">
                <i class="fas fa-plus"></i> Create Tournament
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportTournaments()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <!-- Tournament Filters -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Status:</label>
              <select id="tournament-status-filter">
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Type:</label>
              <select id="tournament-type-filter">
                <option value="all">All Types</option>
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Game:</label>
              <select id="tournament-game-filter">
                <option value="all">All Games</option>
                <option value="wc2">Warcraft 2</option>
                <option value="wc3">Warcraft 3</option>
              </select>
            </div>
          </div>

          <!-- Tournaments Table -->
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Organizer</th>
                  <th>Type</th>
                  <th>Participants</th>
                  <th>Prize Pool</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${tournaments.map(tournament => `
                  <tr>
                    <td>
                      <div class="tournament-info">
                        <div class="tournament-name">${tournament.name}</div>
                        <div class="tournament-id">#${tournament._id.slice(-6)}</div>
                      </div>
                    </td>
                    <td>${tournament.organizer?.username || 'Unknown'}</td>
                    <td><span class="type-badge ${tournament.type}">${tournament.type.replace('_', ' ')}</span></td>
                    <td>${tournament.participants?.length || 0}/${tournament.maxParticipants}</td>
                    <td>${tournament.prizePool ? '$' + tournament.prizePool : 'None'}</td>
                    <td><span class="status-badge ${tournament.status}">${tournament.status}</span></td>
                    <td>${this.ui.formatDate(tournament.startDate)}</td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="adminControlPanel.editTournament('${tournament._id}')">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="adminControlPanel.viewTournamentDetails('${tournament._id}')">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="adminControlPanel.cancelTournament('${tournament._id}')">
                          <i class="fas fa-ban"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteTournament('${tournament._id}')">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } catch (error) {
      logger.error('Failed to load tournament management', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Tournament Management Error', 'Failed to load tournament data.');
    }
  }

  /**
   * Load clan management
   */
  async loadClanManagement() {
    try {
      const clans = await window.apiClient.get('/api/admin/clans');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Clan Management</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.createClan()">
                <i class="fas fa-plus"></i> Create Clan
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportClans()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <!-- Clan Filters -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Status:</label>
              <select id="clan-status-filter">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="disbanded">Disbanded</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Size:</label>
              <select id="clan-size-filter">
                <option value="all">All Sizes</option>
                <option value="small">Small (1-10)</option>
                <option value="medium">Medium (11-25)</option>
                <option value="large">Large (26+)</option>
              </select>
            </div>
          </div>

          <!-- Clans Table -->
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Clan</th>
                  <th>Leader</th>
                  <th>Members</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${clans.map(clan => `
                  <tr>
                    <td>
                      <div class="clan-info">
                        <div class="clan-name">[${clan.tag}] ${clan.name}</div>
                        <div class="clan-id">#${clan._id.slice(-6)}</div>
                      </div>
                    </td>
                    <td>${clan.leader?.username || 'Unknown'}</td>
                    <td>${clan.members?.length || 0}/${clan.maxMembers || 50}</td>
                    <td>${this.ui.formatDate(clan.createdAt)}</td>
                    <td><span class="status-badge ${clan.status || 'active'}">${clan.status || 'active'}</span></td>
                    <td>${clan.rating || 'Unrated'}</td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="adminControlPanel.editClan('${clan._id}')">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="adminControlPanel.viewClanDetails('${clan._id}')">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="adminControlPanel.disbandClan('${clan._id}')">
                          <i class="fas fa-ban"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteClan('${clan._id}')">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } catch (error) {
      logger.error('Failed to load clan management', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Clan Management Error', 'Failed to load clan data.');
    }
  }

  /**
   * Load achievement management
   */
  async loadAchievementManagement() {
    try {
      const achievements = await window.apiClient.get('/api/admin/achievements');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Achievement Management</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.createAchievement()">
                <i class="fas fa-plus"></i> Create Achievement
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportAchievements()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <!-- Achievement Filters -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Category:</label>
              <select id="achievement-category-filter">
                <option value="all">All Categories</option>
                <option value="matches">Matches</option>
                <option value="tournaments">Tournaments</option>
                <option value="social">Social</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Difficulty:</label>
              <select id="achievement-difficulty-filter">
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
          </div>

          <!-- Achievements Table -->
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Achievement</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Points</th>
                  <th>Unlocked By</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${achievements.map(achievement => `
                  <tr>
                    <td>
                      <div class="achievement-info">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                      </div>
                    </td>
                    <td><span class="category-badge ${achievement.category}">${achievement.category}</span></td>
                    <td><span class="difficulty-badge ${achievement.difficulty}">${achievement.difficulty}</span></td>
                    <td>${achievement.points}</td>
                    <td>${achievement.unlockedBy?.length || 0} users</td>
                    <td>${this.ui.formatDate(achievement.createdAt)}</td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="adminControlPanel.editAchievement('${achievement._id}')">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="adminControlPanel.viewAchievementDetails('${achievement._id}')">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteAchievement('${achievement._id}')">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } catch (error) {
      logger.error('Failed to load achievement management', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Achievement Management Error', 'Failed to load achievement data.');
    }
  }

  /**
   * Load content management
   */
  async loadContentManagement() {
    try {
      const content = await window.apiClient.get('/api/admin/content');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Content Management</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.createContent()">
                <i class="fas fa-plus"></i> Create Content
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportContent()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <!-- Content Filters -->
          <div class="filters-bar">
            <div class="filter-group">
              <label>Type:</label>
              <select id="content-type-filter">
                <option value="all">All Types</option>
                <option value="news">News</option>
                <option value="announcements">Announcements</option>
                <option value="guides">Guides</option>
                <option value="pages">Pages</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status:</label>
              <select id="content-status-filter">
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <!-- Content Table -->
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${content.map(item => `
                  <tr>
                    <td>
                      <div class="content-info">
                        <div class="content-title">${item.title}</div>
                        <div class="content-excerpt">${item.excerpt || 'No excerpt'}</div>
                      </div>
                    </td>
                    <td><span class="type-badge ${item.type}">${item.type}</span></td>
                    <td>${item.author?.username || 'Unknown'}</td>
                    <td><span class="status-badge ${item.status}">${item.status}</span></td>
                    <td>${item.views || 0}</td>
                    <td>${this.ui.formatDate(item.createdAt)}</td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="adminControlPanel.editContent('${item._id}')">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="adminControlPanel.viewContent('${item._id}')">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-success" onclick="adminControlPanel.publishContent('${item._id}')">
                          <i class="fas fa-globe"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteContent('${item._id}')">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } catch (error) {
      logger.error('Failed to load content management', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Content Management Error', 'Failed to load content data.');
    }
  }

  /**
   * Load analytics
   */
  async loadAnalytics() {
    try {
      const analytics = await window.apiClient.get('/api/admin/analytics');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Analytics & Reports</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.generateReport()">
                <i class="fas fa-chart-line"></i> Generate Report
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportAnalytics()">
                <i class="fas fa-download"></i> Export Data
              </button>
            </div>
          </div>

          <!-- Analytics Dashboard -->
          <div class="analytics-dashboard">
            <div class="analytics-cards">
              <div class="analytics-card">
                <div class="card-header">
                  <h3>User Growth</h3>
                  <i class="fas fa-users"></i>
                </div>
                <div class="card-content">
                  <div class="metric-value">${analytics.userGrowth?.current || 0}</div>
                  <div class="metric-change ${analytics.userGrowth?.change >= 0 ? 'positive' : 'negative'}">
                    ${analytics.userGrowth?.change >= 0 ? '+' : ''}${analytics.userGrowth?.change || 0}%
                  </div>
                </div>
              </div>

              <div class="analytics-card">
                <div class="card-header">
                  <h3>Match Activity</h3>
                  <i class="fas fa-gamepad"></i>
                </div>
                <div class="card-content">
                  <div class="metric-value">${analytics.matchActivity?.current || 0}</div>
                  <div class="metric-change ${analytics.matchActivity?.change >= 0 ? 'positive' : 'negative'}">
                    ${analytics.matchActivity?.change >= 0 ? '+' : ''}${analytics.matchActivity?.change || 0}%
                  </div>
                </div>
              </div>

              <div class="analytics-card">
                <div class="card-header">
                  <h3>Revenue</h3>
                  <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="card-content">
                  <div class="metric-value">$${analytics.revenue?.current || 0}</div>
                  <div class="metric-change ${analytics.revenue?.change >= 0 ? 'positive' : 'negative'}">
                    ${analytics.revenue?.change >= 0 ? '+' : ''}${analytics.revenue?.change || 0}%
                  </div>
                </div>
              </div>

              <div class="analytics-card">
                <div class="card-header">
                  <h3>Engagement</h3>
                  <i class="fas fa-heart"></i>
                </div>
                <div class="card-content">
                  <div class="metric-value">${analytics.engagement?.current || 0}%</div>
                  <div class="metric-change ${analytics.engagement?.change >= 0 ? 'positive' : 'negative'}">
                    ${analytics.engagement?.change >= 0 ? '+' : ''}${analytics.engagement?.change || 0}%
                  </div>
                </div>
              </div>
            </div>

            <!-- Charts Section -->
            <div class="charts-section">
              <div class="chart-container">
                <h3>User Activity Over Time</h3>
                <div id="user-activity-chart" class="chart-placeholder">
                  <p>Chart will be rendered here</p>
                </div>
              </div>

              <div class="chart-container">
                <h3>Match Types Distribution</h3>
                <div id="match-types-chart" class="chart-placeholder">
                  <p>Chart will be rendered here</p>
                </div>
              </div>
            </div>

            <!-- Reports Section -->
            <div class="reports-section">
              <h3>Recent Reports</h3>
              <div class="reports-list">
                ${analytics.recentReports?.map(report => `
                  <div class="report-item">
                    <div class="report-info">
                      <div class="report-name">${report.name}</div>
                      <div class="report-date">${this.ui.formatDate(report.createdAt)}</div>
                    </div>
                    <div class="report-actions">
                      <button class="btn btn-sm btn-primary" onclick="adminControlPanel.viewReport('${report._id}')">
                        <i class="fas fa-eye"></i> View
                      </button>
                      <button class="btn btn-sm btn-secondary" onclick="adminControlPanel.downloadReport('${report._id}')">
                        <i class="fas fa-download"></i> Download
                      </button>
                    </div>
                  </div>
                `).join('') || '<p>No recent reports</p>'}
              </div>
            </div>
          </div>
        </div>
      `;

    } catch (error) {
      logger.error('Failed to load analytics', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Analytics Error', 'Failed to load analytics data.');
    }
  }

  /**
   * Load moderation tools
   */
  async loadModerationTools() {
    try {
      const moderation = await window.apiClient.get('/api/admin/moderation');
      
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Moderation Tools</h1>
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.createModerationRule()">
                <i class="fas fa-plus"></i> Add Rule
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.exportModerationLogs()">
                <i class="fas fa-download"></i> Export Logs
              </button>
            </div>
          </div>

          <!-- Moderation Queue -->
          <div class="moderation-queue">
            <h3>Pending Moderation</h3>
            <div class="queue-stats">
              <div class="queue-stat">
                <span class="stat-label">Reports</span>
                <span class="stat-value">${moderation.pendingReports || 0}</span>
              </div>
              <div class="queue-stat">
                <span class="stat-label">Flagged Content</span>
                <span class="stat-value">${moderation.flaggedContent || 0}</span>
              </div>
              <div class="queue-stat">
                <span class="stat-label">Appeals</span>
                <span class="stat-value">${moderation.appeals || 0}</span>
              </div>
            </div>
          </div>

          <!-- Moderation Actions -->
          <div class="moderation-actions">
            <h3>Quick Actions</h3>
            <div class="action-grid">
              <button class="action-card" onclick="adminControlPanel.reviewReports()">
                <i class="fas fa-flag"></i>
                <span>Review Reports</span>
                <span class="action-count">${moderation.pendingReports || 0}</span>
              </button>

              <button class="action-card" onclick="adminControlPanel.reviewFlaggedContent()">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Flagged Content</span>
                <span class="action-count">${moderation.flaggedContent || 0}</span>
              </button>

              <button class="action-card" onclick="adminControlPanel.reviewAppeals()">
                <i class="fas fa-gavel"></i>
                <span>Appeals</span>
                <span class="action-count">${moderation.appeals || 0}</span>
              </button>

              <button class="action-card" onclick="adminControlPanel.viewBannedUsers()">
                <i class="fas fa-ban"></i>
                <span>Banned Users</span>
                <span class="action-count">${moderation.bannedUsers || 0}</span>
              </button>
            </div>
          </div>

          <!-- Moderation Rules -->
          <div class="moderation-rules">
            <h3>Moderation Rules</h3>
            <div class="rules-list">
              ${moderation.rules?.map(rule => `
                <div class="rule-item">
                  <div class="rule-info">
                    <div class="rule-name">${rule.name}</div>
                    <div class="rule-description">${rule.description}</div>
                  </div>
                  <div class="rule-status">
                    <span class="status-badge ${rule.active ? 'active' : 'inactive'}">
                      ${rule.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div class="rule-actions">
                    <button class="btn btn-sm btn-primary" onclick="adminControlPanel.editRule('${rule._id}')">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="adminControlPanel.toggleRule('${rule._id}')">
                      <i class="fas fa-toggle-on"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteRule('${rule._id}')">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              `).join('') || '<p>No moderation rules configured</p>'}
            </div>
          </div>

          <!-- Recent Moderation Activity -->
          <div class="moderation-activity">
            <h3>Recent Activity</h3>
            <div class="activity-list">
              ${moderation.recentActivity?.map(activity => `
                <div class="activity-item">
                  <div class="activity-icon">
                    <i class="fas ${this.getModerationIcon(activity.type)}"></i>
                  </div>
                  <div class="activity-content">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-meta">
                      <span class="activity-user">${activity.moderator}</span>
                      <span class="activity-time">${this.ui.formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              `).join('') || '<p>No recent moderation activity</p>'}
            </div>
          </div>
        </div>
      `;

    } catch (error) {
      logger.error('Failed to load moderation tools', error);
      document.getElementById('admin-content').innerHTML = 
        this.ui.createErrorState('Moderation Tools Error', 'Failed to load moderation data.');
    }
  }

  /**
   * Get moderation icon
   */
  getModerationIcon(type) {
    const icons = {
      'user_banned': 'fa-ban',
      'content_removed': 'fa-trash',
      'report_resolved': 'fa-check',
      'appeal_approved': 'fa-gavel',
      'rule_created': 'fa-plus'
    };
    return icons[type] || 'fa-info-circle';}

  // Placeholder methods for the new sections
  async createTournament() { this.ui.showInfo('Tournament creation feature coming soon'); }
  async editTournament(id) { this.ui.showInfo('Tournament editing feature coming soon'); }
  async viewTournamentDetails(id) { this.ui.showInfo('Tournament details feature coming soon'); }
  async cancelTournament(id) { this.ui.showInfo('Tournament cancellation feature coming soon'); }
  async deleteTournament(id) { this.ui.showInfo('Tournament deletion feature coming soon'); }
  async exportTournaments() { this.ui.showInfo('Tournament export feature coming soon'); }

  async createClan() { this.ui.showInfo('Clan creation feature coming soon'); }
  async editClan(id) { this.ui.showInfo('Clan editing feature coming soon'); }
  async viewClanDetails(id) { this.ui.showInfo('Clan details feature coming soon'); }
  async disbandClan(id) { this.ui.showInfo('Clan disbanding feature coming soon'); }
  async deleteClan(id) { this.ui.showInfo('Clan deletion feature coming soon'); }
  async exportClans() { this.ui.showInfo('Clan export feature coming soon'); }

  async createAchievement() { this.ui.showInfo('Achievement creation feature coming soon'); }
  async editAchievement(id) { this.ui.showInfo('Achievement editing feature coming soon'); }
  async viewAchievementDetails(id) { this.ui.showInfo('Achievement details feature coming soon'); }
  async deleteAchievement(id) { this.ui.showInfo('Achievement deletion feature coming soon'); }
  async exportAchievements() { this.ui.showInfo('Achievement export feature coming soon'); }

  async createContent() { this.ui.showInfo('Content creation feature coming soon'); }
  async editContent(id) { this.ui.showInfo('Content editing feature coming soon'); }
  async viewContent(id) { this.ui.showInfo('Content viewing feature coming soon'); }
  async publishContent(id) { this.ui.showInfo('Content publishing feature coming soon'); }
  async deleteContent(id) { this.ui.showInfo('Content deletion feature coming soon'); }
  async exportContent() { this.ui.showInfo('Content export feature coming soon'); }

  async generateReport() { this.ui.showInfo('Report generation feature coming soon'); }
  async exportAnalytics() { this.ui.showInfo('Analytics export feature coming soon'); }
  async viewReport(id) { this.ui.showInfo('Report viewing feature coming soon'); }
  async downloadReport(id) { this.ui.showInfo('Report download feature coming soon'); }

  async createModerationRule() { this.ui.showInfo('Moderation rule creation feature coming soon'); }
  async reviewReports() { this.ui.showInfo('Report review feature coming soon'); }
  async reviewFlaggedContent() { this.ui.showInfo('Flagged content review feature coming soon'); }
  async reviewAppeals() { this.ui.showInfo('Appeals review feature coming soon'); }
  async viewBannedUsers() { this.ui.showInfo('Banned users view feature coming soon'); }
  async editRule(id) { this.ui.showInfo('Rule editing feature coming soon'); }
  async toggleRule(id) { this.ui.showInfo('Rule toggle feature coming soon'); }
  async deleteRule(id) { this.ui.showInfo('Rule deletion feature coming soon'); }
  async exportModerationLogs() { this.ui.showInfo('Moderation logs export feature coming soon'); }

  /**
   * Get mock dashboard stats when API is not available
   */
  getMockDashboardStats() {
    return {
      users: {
        total: 1247,
        change: 12,
        active: 89,
        new: 23
      },
      matches: {
        total: 3456,
        change: 8,
        pending: 12,
        disputed: 3
      },
      tournaments: {
        total: 45,
        change: 5,
        active: 3,
        upcoming: 7
      },
      clans: {
        total: 89,
        change: -2,
        active: 67,
        recruiting: 23
      },
      system: {
        uptime: '99.8%',
        load: '23%',
        storage: '67%',
        memory: '45%'
      },
      recentActivity: [
        {
          type: 'user_registered',
          message: 'New user "PlayerX" registered',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          severity: 'info'
        },
        {
          type: 'match_disputed',
          message: 'Match #1234 disputed by PlayerY',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          severity: 'warning'
        },
        {
          type: 'tournament_created',
          message: 'Tournament "Weekly Cup #45" created',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          severity: 'success'
        },
        {
          type: 'system_alert',
          message: 'High server load detected',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          severity: 'error'
        }
      ]
    };}

  /**
   * Get mock users when API is not available
   */
  getMockUsers() {
    return [
      {
        _id: '507f1f77bcf86cd799439011',
        username: 'AdminUser',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        avatar: '/assets/img/default-avatar.svg',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        lastActive: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        _id: '507f1f77bcf86cd799439012',
        username: 'ModeratorUser',
        email: 'mod@example.com',
        role: 'moderator',
        status: 'active',
        avatar: '/assets/img/default-avatar.svg',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
        lastActive: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        _id: '507f1f77bcf86cd799439013',
        username: 'PlayerOne',
        email: 'player1@example.com',
        role: 'user',
        status: 'active',
        avatar: '/assets/img/default-avatar.svg',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        _id: '507f1f77bcf86cd799439014',
        username: 'PlayerTwo',
        email: 'player2@example.com',
        role: 'user',
        status: 'suspended',
        avatar: '/assets/img/default-avatar.svg',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        _id: '507f1f77bcf86cd799439015',
        username: 'BannedPlayer',
        email: 'banned@example.com',
        role: 'user',
        status: 'banned',
        avatar: '/assets/img/default-avatar.svg',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
        lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      }
    ];}

  /**
   * Create database backup
   */
  async createDatabaseBackup() {
    try {
      this.ui.showLoading('Creating database backup...');
      
      const response = await window.apiClient.post('/admin/backup/create');
      
      if (response.success) {
        this.ui.showSuccess('Database backup created successfully!');
        await this.refreshBackupList();
      } else {
        throw new Error(response.error || 'Backup creation failed');
      }
      
    } catch (error) {
      logger.error('Error creating backup', error);
      this.ui.showError(`Failed to create backup: ${error.message}`);
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Refresh backup list
   */
  async refreshBackupList() {
    try {
      const backupsData = await window.apiClient.get('/api/admin/backup/list');
      const backupListContainer = document.getElementById('backup-list');
      
      if (backupListContainer) {
        backupListContainer.innerHTML = `
          <h4>Existing Backups</h4>
          ${this.renderBackupList(backupsData.backups)}
        `;
      }
      
    } catch (error) {
      logger.error('Error refreshing backup list', error);
      this.ui.showError('Failed to refresh backup list');
    }
  }

  /**
   * Render backup list
   */
  renderBackupList(backups) {
    if (!backups || backups.length === 0) {
      return `
        <div class="no-backups">
          <i class="fas fa-database"></i>
          <p>No backups found</p>
          <small>Create your first backup to get started</small>
        </div>
      `;}

    return `
      <div class="backup-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>Backup Name</th>
              <th>Created</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${backups.map(backup => `
              <tr>
                <td>
                  <div class="backup-info">
                    <i class="fas fa-database"></i>
                    <span>${backup.name}</span>
                  </div>
                </td>
                <td>${new Date(backup.created).toLocaleDateString()} ${new Date(backup.created).toLocaleTimeString()}</td>
                <td>${backup.size}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteBackup('${backup.name}')" title="Delete Backup">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;}

  /**
   * Delete backup
   */
  async deleteBackup(backupName) {
    try {
      const confirmDelete = await this.ui.confirm(
        'Delete Backup',
        `Are you sure you want to delete the backup "${backupName}"? This action cannot be undone.`
      );
      
      if (!confirmDelete) return;this.ui.showLoading('Deleting backup...');
      
      const response = await window.apiClient.delete(`/admin/backup/${backupName}`);
      
      if (response.success) {
        this.ui.showSuccess('Backup deleted successfully!');
        await this.refreshBackupList();
      } else {
        throw new Error(response.error || 'Backup deletion failed');
      }
      
    } catch (error) {
      logger.error('Error deleting backup', error);
      this.ui.showError(`Failed to delete backup: ${error.message}`);
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Get mock settings for fallback
   */
  getMockSettings() {
    return {
      general: {
        siteName: 'Warcraft Arena',
        siteDescription: 'The premier Warcraft gaming platform',
        maintenanceMode: false,
        registrationEnabled: true
      },
      matches: {
        autoVerify: false,
        editWindow: 24,
        requiredScreenshots: 1,
        maxFileSize: 10
      },
      tournaments: {
        maxPerUser: 3,
        creationCost: 1000,
        autoStart: false
      },
      clans: {
        creationCost: 500,
        maxMembers: 50,
        maxTagLength: 4
      },
      achievements: {
        notifications: true,
        retroactive: false,
        baseExperience: 100
      }
    };}

  /**
   * Check if admin is currently impersonating a user
   */
  async checkImpersonationStatus() {
    try {
      const response = await window.apiClient.get('/api/admin/impersonation-status');
      if (response && response.isImpersonating) {
        this.showImpersonationBanner(response.impersonatedUser, response.originalAdmin);
      }
    } catch (error) {
      // Silently fail if endpoint doesn't exist - this is optional functionality
      console.log('Impersonation status check skipped (endpoint not available)');
    }
  }

  /**
   * Show impersonation banner
   */
  showImpersonationBanner(impersonatedUser, originalAdmin) {
    // Remove existing banner
    const existingBanner = document.querySelector('.impersonation-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    // Create impersonation banner
    const banner = document.createElement('div');
    banner.className = 'impersonation-banner';
    banner.innerHTML = `
      <div class="impersonation-content">
        <div class="impersonation-info">
          <i class="fas fa-user-secret"></i>
          <span>Impersonating: <strong>${impersonatedUser.username}</strong></span>
          <span class="original-admin">Admin: ${originalAdmin.username}</span>
        </div>
        <div class="impersonation-actions">
          <button class="btn btn-sm btn-warning" onclick="adminControlPanel.stopImpersonation()">
            <i class="fas fa-sign-out-alt"></i> Stop Impersonation
          </button>
          <button class="btn btn-sm btn-primary" onclick="adminControlPanel.showUserSwitcher()">
            <i class="fas fa-exchange-alt"></i> Switch User
          </button>
        </div>
      </div>
    `;

    // Insert banner at top of page
    document.body.insertBefore(banner, document.body.firstChild);
  }

  /**
   * Show user switcher modal
   */
  async showUserSwitcher() {
    try {
      const response = await window.apiClient.get('/api/admin/users-for-impersonation');
      const users = response.users;

      const modal = this.ui.createModal('user-switcher-modal', 'Switch User Account', `
        <div class="user-switcher-content">
          <div class="switcher-header">
            <h3>Select User to Impersonate</h3>
            <p>Choose a user account to impersonate. You can switch back to your admin account at any time.</p>
          </div>
          
          <div class="user-search">
            <input type="text" id="user-search-input" placeholder="Search users..." class="form-control">
          </div>
          
          <div class="users-list" id="users-list">
            ${users.map(user => `
              <div class="user-item" data-user-id="${user._id}">
                <div class="user-info">
                  <div class="user-name">${user.username}</div>
                  <div class="user-email">${user.email}</div>
                  <div class="user-meta">
                    Joined: ${new Date(user.createdAt).toLocaleDateString()}
                    ${user.lastActive ? ` | Last active: ${new Date(user.lastActive).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div class="user-actions">
                  <button class="btn btn-primary btn-sm" onclick="adminControlPanel.impersonateUser('${user._id}', '${user.username}')">
                    <i class="fas fa-user-secret"></i> Impersonate
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          </div>
        </div>
      `);

      // Add search functionality
      const searchInput = document.getElementById('user-search-input');
      const usersList = document.getElementById('users-list');
      const allUserItems = usersList.querySelectorAll('.user-item');

      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        allUserItems.forEach(item => {
          const userName = item.querySelector('.user-name').textContent.toLowerCase();
          const userEmail = item.querySelector('.user-email').textContent.toLowerCase();
          const matches = userName.includes(query) || userEmail.includes(query);
          item.style.display = matches ? 'flex' : 'none';
        });
      });

    } catch (error) {
      logger.error('Error loading user switcher', error);
      this.ui.showError('Failed to load user list');
    }
  }

  /**
   * Impersonate a user
   */
  async impersonateUser(userId, username) {
    try {
      this.ui.showLoading(`Switching to ${username}...`);
      
      const response = await window.apiClient.post(`/admin/impersonate/${userId}`);
      
      if (response.success) {
        // Close modal
        document.querySelector('.modal')?.remove();
        
        // Show success message
        this.ui.showSuccess(`Now impersonating ${username}`);
        
        // Show impersonation banner
        this.showImpersonationBanner(response.impersonatedUser, response.originalAdmin);
        
        // Reload page to reflect new user context
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } else {
        throw new Error(response.error || 'Failed to impersonate user');
      }
      
    } catch (error) {
      logger.error('Error impersonating user', error);
      this.ui.showError(`Failed to impersonate user: ${error.message}`);
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Stop impersonation and return to admin account
   */
  async stopImpersonation() {
    try {
      this.ui.showLoading('Returning to admin account...');const response = await window.apiClient.post('/admin/stop-impersonation');
      
      if (response.success) {
        // Remove impersonation banner
        const banner = document.querySelector('.impersonation-banner');
        if (banner) {
          banner.remove();
        }
        
        // Show success message
        this.ui.showSuccess('Returned to admin account');
        
        // Reload page to reflect admin context
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } else {
        throw new Error(response.error || 'Failed to stop impersonation');
      }
      
    } catch (error) {
      logger.error('Error stopping impersonation', error);
      this.ui.showError(`Failed to stop impersonation: ${error.message}`);
    } finally {
      this.ui.hideLoading();
    }
  }



  /**
   * Load feedback management
   */
  async loadFeedbackManagement() {
    try {
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = '<div class="loading-spinner"></div>';

      // Fetch feedback data
      const response = await window.apiClient.get('/api/feedback/all');
      const feedbackList = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);

      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Feedback Management</h1>
            <div class="section-stats">
              <span class="stat-badge">Total: ${feedbackList.length}</span>
              <span class="stat-badge stat-badge-open">Open: ${feedbackList.filter(f => f.status === 'open').length}</span>
              <span class="stat-badge stat-badge-resolved">Resolved: ${feedbackList.filter(f => f.status === 'resolved').length}</span>
            </div>
          </div>

          <div class="feedback-filters">
            <div class="filter-group">
              <label>Filter by Type:</label>
              <select id="feedback-type-filter" onchange="adminControlPanel.filterFeedback()">
                <option value="">All Types</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="feedback">💭 General Feedback</option>
                <option value="suggestion">💡 Suggestion</option>
                <option value="complaint">😤 Complaint</option>
                <option value="other">📝 Other</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Filter by Status:</label>
              <select id="feedback-status-filter" onchange="adminControlPanel.filterFeedback()">
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div class="feedback-list" id="feedback-list">
            ${feedbackList.map(feedback => `
              <div class="feedback-item" data-type="${feedback.type}" data-status="${feedback.status}">
                <div class="feedback-header">
                  <div class="feedback-meta">
                    <span class="feedback-type type-${feedback.type}">${this.getFeedbackTypeIcon(feedback.type)} ${feedback.type}</span>
                    <span class="feedback-status status-${feedback.status}">${feedback.status}</span>
                    <span class="feedback-priority priority-${feedback.priority}">${feedback.priority}</span>
                  </div>
                  <div class="feedback-date">${this.ui.formatDate(feedback.createdAt)}</div>
                </div>
                <div class="feedback-content">
                  <h3 class="feedback-subject">${feedback.subject}</h3>
                  <p class="feedback-description">${feedback.description}</p>
                  <div class="feedback-submitter">
                    <strong>Submitted by:</strong> ${feedback.submittedBy ? feedback.submittedBy.username : 'Anonymous'}
                    ${feedback.contact && feedback.contact.preferredMethod !== 'none' ? `
                      <span class="contact-info">
                        📞 ${feedback.contact.preferredMethod}: ${feedback.contact.email || feedback.contact.discord || 'Not provided'}
                      </span>
                    ` : ''}
                  </div>
                </div>
                <div class="feedback-actions">
                  <button class="btn btn-sm btn-primary" onclick="adminControlPanel.respondToFeedback('${feedback._id}')">
                    <i class="fas fa-reply"></i> Respond
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="adminControlPanel.updateFeedbackStatus('${feedback._id}', 'in-progress')">
                    <i class="fas fa-play"></i> In Progress
                  </button>
                  <button class="btn btn-sm btn-success" onclick="adminControlPanel.updateFeedbackStatus('${feedback._id}', 'resolved')">
                    <i class="fas fa-check"></i> Resolve
                  </button>
                  <button class="btn btn-sm btn-warning" onclick="adminControlPanel.updateFeedbackStatus('${feedback._id}', 'closed')">
                    <i class="fas fa-times"></i> Close
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // Store feedback data for filtering
      this.feedbackData = feedbackList;

    } catch (error) {
      logger.error('Error loading feedback', error);
      const contentContainer = document.getElementById('admin-content');
      contentContainer.innerHTML = this.ui.createErrorState('Error', 'Failed to load feedback data.');
    }
  }

  /**
   * Get icon for feedback type
   */
  getFeedbackTypeIcon(type) {
    const icons = {
      bug: '🐛',
      feedback: '💭',
      suggestion: '💡',
      complaint: '😤',
      other: '📝'
    };
    return icons[type] || '📝';}

  /**
   * Filter feedback based on type and status
   */
  filterFeedback() {
    const typeFilter = document.getElementById('feedback-type-filter').value;
    const statusFilter = document.getElementById('feedback-status-filter').value;
    const feedbackItems = document.querySelectorAll('.feedback-item');

    feedbackItems.forEach(item => {
      const itemType = item.dataset.type;
      const itemStatus = item.dataset.status;
      
      const typeMatch = !typeFilter || itemType === typeFilter;
      const statusMatch = !statusFilter || itemStatus === statusFilter;
      
      if (typeMatch && statusMatch) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(feedbackId, newStatus) {
    try {
      await window.apiClient.put(`/api/feedback/${feedbackId}/status`, { status: newStatus });
      this.ui.showSuccess(`Feedback status updated to ${newStatus}`);
      
      // Refresh the feedback list
      await this.loadFeedbackManagement();
      
    } catch (error) {
      logger.error('Error updating feedback status', error);
      this.ui.showError('Failed to update feedback status');
    }
  }

  /**
   * Respond to feedback
   */
  async respondToFeedback(feedbackId) {
    const response = prompt('Enter your response to this feedback:');
    if (!response) return;try {
      await window.apiClient.put(`/api/feedback/${feedbackId}/respond`, { 
        message: response,
        status: 'in-progress'
      });
      
      this.ui.showSuccess('Response sent successfully');
      
      // Refresh the feedback list
      await this.loadFeedbackManagement();
      
    } catch (error) {
      logger.error('Error responding to feedback', error);
      this.ui.showError('Failed to send response');
    }
  }

  /**
   * Load Dark Portal management
   */
  async loadDarkPortalManagement() {
    const contentContainer = document.getElementById('admin-content');

    try {
      // Load pending submissions
      const pendingResponse = await window.apiClient.get('/api/dark-portal/admin/pending');
      const pendingData = await pendingResponse.json();
      const pendingLinks = pendingData.success ? pendingData.links : [];

      contentContainer.innerHTML = `
        <div class="admin-section">
          <div class="section-header">
            <h1>Dark Portal Management</h1>
            <p>Manage community link submissions and approvals</p>
          </div>

          <div class="dark-portal-management">
            <!-- Stats Cards -->
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Pending Submissions</h3>
                <span class="stat-number">${pendingLinks.length}</span>
              </div>
              <div class="stat-card">
                <h3>Total Approved</h3>
                <span class="stat-number" id="approved-count">-</span>
              </div>
              <div class="stat-card">
                <h3>Categories</h3>
                <span class="stat-number">5</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="section-actions">
              <button class="btn btn-primary" onclick="adminControlPanel.showAddLinkModal()">
                <i class="fas fa-plus"></i>
                Add Link Directly
              </button>
              <button class="btn btn-secondary" onclick="adminControlPanel.refreshDarkPortal()">
                <i class="fas fa-sync"></i>
                Refresh
              </button>
            </div>

            <!-- Pending Submissions -->
            <div class="content-section">
              <h2>Pending Submissions</h2>
              <div class="pending-submissions" id="pending-submissions">
                ${pendingLinks.length > 0 ? this.renderPendingSubmissions(pendingLinks) : '<p class="no-data">No pending submissions</p>'}
              </div>
            </div>

            <!-- Approved Links Management -->
            <div class="content-section">
              <h2>Approved Links</h2>
              <div class="approved-links" id="approved-links">
                <p>Loading approved links...</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Load approved links count and list
      await this.loadApprovedLinksCount();
      await this.loadApprovedLinksList();

    } catch (error) {
      logger.error('Error loading Dark Portal management', error);
      contentContainer.innerHTML = this.ui.createErrorState(
        'Loading Error',
        'Failed to load Dark Portal management interface'
      );
    }
  }

  renderPendingSubmissions(submissions) {
    return submissions.map(link => `
      <div class="submission-card" data-id="${link._id}">
        <div class="submission-header">
          <h3>${this.escapeHtml(link.title)}</h3>
          <div class="submission-meta">
            <span class="category-badge category-${link.category}">${link.categoryDisplayName}</span>
            <span class="game-badge game-${link.gameType}">${link.gameTypeDisplayName}</span>
          </div>
        </div>

        <div class="submission-content">
          <div class="submission-url">
            <strong>URL:</strong>
            <a href="${link.url}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(link.url)}</a>
          </div>
          ${link.description ? `<div class="submission-description"><strong>Description:</strong> ${this.escapeHtml(link.description)}</div>` : ''}
          <div class="submission-submitter">
            <strong>Submitted by:</strong> ${link.submittedBy ? link.submittedBy.username : 'Unknown'}
            <span class="submission-date">${new Date(link.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div class="submission-actions">
          <button class="btn btn-success btn-sm" onclick="adminControlPanel.approveSubmission('${link._id}')">
            <i class="fas fa-check"></i>
            Approve
          </button>
          <button class="btn btn-danger btn-sm" onclick="adminControlPanel.denySubmission('${link._id}')">
            <i class="fas fa-times"></i>
            Deny
          </button>
          <button class="btn btn-info btn-sm" onclick="adminControlPanel.showSubmissionDetails('${link._id}')">
            <i class="fas fa-eye"></i>
            Details
          </button>
        </div>
      </div>
    `).join('');}

  async loadApprovedLinksCount() {
    try {
      const response = await window.apiClient.get('/api/dark-portal/all-links');
      const data = await response.json();

      if (data.success) {
        let totalCount = 0;
        Object.values(data.linksByCategory).forEach(links => {
          totalCount += links.length;
        });

        const countElement = document.getElementById('approved-count');
        if (countElement) {
          countElement.textContent = totalCount;
        }
      }
    } catch (error) {
      logger.warn('Could not load approved links count', error);
    }
  }

  async loadApprovedLinksList() {
    try {
      const response = await window.apiClient.get('/api/dark-portal/all-links');
      const data = await response.json();

      if (data.success) {
        const container = document.getElementById('approved-links');
        if (container) {
          container.innerHTML = this.renderApprovedLinks(data.linksByCategory);
        }
      }
    } catch (error) {
      logger.error('Error loading approved links', error);
      const container = document.getElementById('approved-links');
      if (container) {
        container.innerHTML = '<p class="error">Failed to load approved links</p>';
      }
    }
  }

  renderApprovedLinks(linksByCategory) {
    const categories = [
      { id: 'reddit', title: 'Reddit' },
      // { id: 'discord', title: 'Discord' }, // hidden for now
      { id: 'battlenet', title: 'Battle.net Groups' },
      { id: 'maps-mods', title: 'Maps and Mods' },
      { id: 'community-sites', title: 'Community Sites' }
    ];

    return categories.map(category => {
      const links = linksByCategory[category.id] || [];return `
        <div class="approved-category">
          <h3>${category.title} (${links.length})</h3>
          <div class="approved-links-list">
            ${links.length > 0 ? links.map(link => `
              <div class="approved-link-item">
                <div class="link-info">
                  <strong>${this.escapeHtml(link.title)}</strong>
                  <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-url">${this.escapeHtml(link.url)}</a>
                  ${link.description ? `<p class="link-desc">${this.escapeHtml(link.description)}</p>` : ''}
                </div>
                <div class="link-actions">
                  <button class="btn btn-sm btn-secondary" onclick="adminControlPanel.editLink('${link._id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="adminControlPanel.deleteLink('${link._id}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('') : '<p class="no-links">No approved links in this category</p>'}
          </div>
        </div>
      `;}).join('');
  }

  async approveSubmission(linkId) {
    try {
      const response = await window.apiClient.post(`/api/dark-portal/admin/review/${linkId}`, {
        action: 'approve',
        reviewNotes: '',
        displayOrder: 0,
        featured: false
      });

      const data = await response.json();
      if (data.success) {
        this.ui.showSuccess('Link approved successfully');
        await this.refreshDarkPortal();
      } else {
        this.ui.showError(data.error || 'Failed to approve link');
      }
    } catch (error) {
      logger.error('Error approving submission', error);
      this.ui.showError('Failed to approve link');
    }
  }

  async denySubmission(linkId) {
    try {
      const response = await window.apiClient.post(`/api/dark-portal/admin/review/${linkId}`, {
        action: 'deny',
        reviewNotes: 'Denied by admin'
      });

      const data = await response.json();
      if (data.success) {
        this.ui.showSuccess('Link denied and removed');
        await this.refreshDarkPortal();
      } else {
        this.ui.showError(data.error || 'Failed to deny link');
      }
    } catch (error) {
      logger.error('Error denying submission', error);
      this.ui.showError('Failed to deny link');
    }
  }

  async refreshDarkPortal() {
    await this.loadDarkPortalManagement();
  }

  showAddLinkModal() {
    // Create modal for admin link addition
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    `;

    modal.innerHTML = `
      <div class="admin-modal" style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 2rem;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="color: #fff; margin: 0; font-size: 1.5rem;">Add Community Link</h3>
          <button onclick="this.closest('.modal-overlay').remove()" style="
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">×</button>
        </div>

        <form id="admin-add-link-form">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Title *</label>
            <input type="text" name="title" required style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
              font-size: 1rem;
            " placeholder="Enter link title">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">URL *</label>
            <input type="url" name="url" required style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
              font-size: 1rem;
            " placeholder="https://example.com">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Image URL</label>
            <input type="url" name="image" style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
              font-size: 1rem;
            " placeholder="Optional image (favicon/logo)">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Category *</label>
            <select name="category" required style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
              font-size: 1rem;
            ">
              <option value="">Select category</option>
              <option value="reddit">Reddit</option>
              <!-- <option value="discord">Discord</option> -->
              <option value="battlenet">Battle.net Groups</option>
              <option value="maps-mods">Maps and Mods</option>
              <option value="community-sites">Community Sites</option>
            </select>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Game Type *</label>
            <select name="gameType" required style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
              font-size: 1rem;
            ">
              <option value="">Select game type</option>
              <option value="wc12">Warcraft I/II</option>
              <option value="wc3">Warcraft III</option>
            </select>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Description</label>
            <textarea name="description" rows="3" style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
              font-size: 1rem;
              resize: vertical;
            " placeholder="Optional description of the link"></textarea>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Display Order</label>
            <input type="number" name="displayOrder" min="0" value="0" style="
              width: 100%;
              padding: 0.75rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.1);
              color: #fff;
              font-size: 1rem;
            " placeholder="0">
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display: flex; align-items: center; color: #fff; cursor: pointer;">
              <input type="checkbox" name="featured" style="margin-right: 0.5rem;">
              Featured Link
            </label>
          </div>

          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button type="button" onclick="this.closest('.modal-overlay').remove()" style="
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: #fff;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-size: 1rem;
            ">Cancel</button>
            <button type="submit" style="
              background: linear-gradient(135deg, var(--primary-gold), #E5C158);
              border: none;
              color: #000;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 1rem;
            ">Add Link</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    document.getElementById('admin-add-link-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitAdminLink(new FormData(e.target));
      modal.remove();
    });
  }

  showSubmissionDetails(linkId) {
    this.ui.showInfo('Submission details modal coming soon');
  }

  editLink(linkId) {
    this.showEditLinkModal(linkId);
  }

  async showEditLinkModal(linkId) {
    try {
      const resp = await window.apiClient.get(`/api/dark-portal/admin/link/${linkId}`);
      const data = await resp.json();
      if (!data.success) throw new Error('Failed to load link');
      const link = data.link;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,.8); display:flex; align-items:center; justify-content:center; z-index:10000; padding:1rem;`;
      modal.innerHTML = `
        <div class="admin-modal" style="background: linear-gradient(135deg, #1a1a2e, #16213e); border: 1px solid rgba(255,255,255,.2); border-radius: 12px; padding: 2rem; max-width: 520px; width: 100%; max-height: 90vh; overflow: auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="color:#fff; margin:0; font-size:1.5rem;">Edit Link</h3>
            <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; color:rgba(255,255,255,.6); font-size:1.5rem; cursor:pointer;">×</button>
          </div>
          <form id="admin-edit-link-form">
            <div style="margin-bottom:1rem;">
              <label style="display:block; color:#fff; margin-bottom:.5rem; font-weight:600;">Title *</label>
              <input type="text" name="title" value="${this.escapeHtml(link.title)}" required style="width:100%; padding:.75rem; border:1px solid rgba(255,255,255,.2); border-radius:6px; background:rgba(255,255,255,.1); color:#fff;">
            </div>
            <div style="margin-bottom:1rem;">
              <label style="display:block; color:#fff; margin-bottom:.5rem; font-weight:600;">URL *</label>
              <input type="url" name="url" value="${this.escapeHtml(link.url)}" required style="width:100%; padding:.75rem; border:1px solid rgba(255,255,255,.2); border-radius:6px; background:rgba(255,255,255,.1); color:#fff;">
            </div>
            <div style="margin-bottom:1rem;">
              <label style="display:block; color:#fff; margin-bottom:.5rem; font-weight:600;">Image URL</label>
              <input type="url" name="image" value="${this.escapeHtml(link.image || '')}" style="width:100%; padding:.75rem; border:1px solid rgba(255,255,255,.2); border-radius:6px; background:rgba(255,255,255,.1); color:#fff;">
            </div>
            <div style="margin-bottom:1rem;">
              <label style="display:block; color:#fff; margin-bottom:.5rem; font-weight:600;">Category *</label>
              <select name="category" required style="width:100%; padding:.75rem; border:1px solid rgba(255,255,255,.2); border-radius:6px; background:rgba(255,255,255,.1); color:#fff;">
                ${['reddit','battlenet','maps-mods','community-sites'].map(c => `<option value="${c}" ${link.category===c?'selected':''}>${c==='battlenet'?'Battle.net Groups':c.replace('-', ' ')}</option>`).join('')}
              </select>
            </div>
            <div style="margin-bottom:1rem;">
              <label style="display:block; color:#fff; margin-bottom:.5rem; font-weight:600;">Game Type *</label>
              <select name="gameType" required style="width:100%; padding:.75rem; border:1px solid rgba(255,255,255,.2); border-radius:6px; background:rgba(255,255,255,.1); color:#fff;">
                <option value="wc12" ${link.gameType==='wc12'?'selected':''}>Warcraft I/II</option>
                <option value="wc3" ${link.gameType==='wc3'?'selected':''}>Warcraft III</option>
              </select>
            </div>
            <div style="margin-bottom:1rem;">
              <label style="display:block; color:#fff; margin-bottom:.5rem; font-weight:600;">Description</label>
              <textarea name="description" rows="3" style="width:100%; padding:.75rem; border:1px solid rgba(255,255,255,.2); border-radius:6px; background:rgba(255,255,255,.1); color:#fff;">${this.escapeHtml(link.description||'')}</textarea>
            </div>
            <div style="margin-bottom:1rem; display:flex; gap:.75rem;">
              <div style="flex:1;">
                <label style="display:block; color:#fff; margin-bottom:.5rem; font-weight:600;">Display Order</label>
                <input type="number" name="displayOrder" min="0" value="${link.displayOrder||0}" style="width:100%; padding:.75rem; border:1px solid rgba(255,255,255,.2); border-radius:6px; background:rgba(255,255,255,.1); color:#fff;">
              </div>
              <div style="display:flex; align-items:flex-end;">
                <label style="display:flex; align-items:center; color:#fff; cursor:pointer; gap:.5rem;">
                  <input type="checkbox" name="featured" ${link.featured?'checked':''}>
                  Featured
                </label>
              </div>
            </div>
            <div style="display:flex; gap:1rem; justify-content:flex-end;">
              <button type="button" onclick="this.closest('.modal-overlay').remove()" style="background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); color:#fff; padding:.75rem 1.5rem; border-radius:6px; cursor:pointer; font-size:1rem;">Cancel</button>
              <button type="submit" style="background: linear-gradient(135deg, var(--primary-gold), #E5C158); border:none; color:#000; padding:.75rem 1.5rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:1rem;">Save</button>
            </div>
          </form>
        </div>`;

      document.body.appendChild(modal);
      document.getElementById('admin-edit-link-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const fd = new FormData(e.target);
          const resp2 = await window.apiClient.put(`/api/dark-portal/admin/update/${linkId}`, {
            title: fd.get('title'),
            url: fd.get('url'),
            image: fd.get('image'),
            description: fd.get('description'),
            category: fd.get('category'),
            gameType: fd.get('gameType'),
            displayOrder: parseInt(fd.get('displayOrder')) || 0,
            featured: fd.get('featured') === 'on'
          });
          const d2 = await resp2.json();
          if (d2.success) {
            this.ui.showSuccess('Link updated');
            modal.remove();
            await this.refreshDarkPortal();
          } else {
            this.ui.showError(d2.error || 'Failed to update link');
          }
        } catch (err) {
          logger.error('Update failed', err);
          this.ui.showError('Failed to update link');
        }
      });
    } catch (err) {
      logger.error('Failed to open edit modal', err);
      this.ui.showError('Failed to load link for editing');
    }
  }

  async deleteLink(linkId) {
    if (confirm('Are you sure you want to delete this link?')) {
      try {
        const response = await window.apiClient.delete(`/api/dark-portal/admin/delete/${linkId}`);
        const data = await response.json();

        if (data.success) {
          this.ui.showSuccess('Link deleted successfully');
          await this.refreshDarkPortal();
        } else {
          this.ui.showError(data.error || 'Failed to delete link');
        }
      } catch (error) {
        logger.error('Error deleting link', error);
        this.ui.showError('Failed to delete link');
      }
    }
  }

  async submitAdminLink(formData) {
    try {
      const response = await window.apiClient.post('/api/dark-portal/admin/add', {
        title: formData.get('title'),
        url: formData.get('url'),
        image: formData.get('image'),
        description: formData.get('description'),
        category: formData.get('category'),
        gameType: formData.get('gameType'),
        displayOrder: parseInt(formData.get('displayOrder')) || 0,
        featured: formData.get('featured') === 'on'
      });

      const data = await response.json();

      if (data.success) {
        this.ui.showSuccess('Link added successfully!');
        await this.refreshDarkPortal();
      } else {
        this.ui.showError(data.error || 'Failed to add link');
      }
    } catch (error) {
      logger.error('Error adding admin link', error);
      this.ui.showError('Failed to add link. Please try again.');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}
}

// Create global instance
window.adminControlPanel = new AdminControlPanel();