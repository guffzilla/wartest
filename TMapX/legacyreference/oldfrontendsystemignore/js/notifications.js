// Notifications Manager
import logger from '/js/utils/logger.js';

class NotificationsManager {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isInitialized = false;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.loadNotifications = this.loadNotifications.bind(this);
    this.renderNotifications = this.renderNotifications.bind(this);
    this.markAsRead = this.markAsRead.bind(this);
    this.markAllAsRead = this.markAllAsRead.bind(this);
    this.addNotification = this.addNotification.bind(this);
    this.setupEventListeners = this.setupEventListeners.bind(this);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.init);
    } else {
      this.init();
    }
  }
  
  /**
   * Initialize the notifications manager
   */
  async init() {
    try {
      // Check if notifications container exists
              this.notificationBell = document.getElementById('notifications-indicator');
        if (!this.notificationBell) {
          // No notifications indicator found
          return;}
      
      // Find the notification count element for navbar
      this.notificationCount = document.getElementById('notification-count-badge');
      this.notificationsDropdown = document.getElementById('notifications-dropdown');
      this.notificationsContainer = document.getElementById('notifications-container');
      this.notificationsEmpty = document.getElementById('notifications-empty');
      this.markAllReadBtn = document.getElementById('mark-all-read-btn');
      
      // Initialize empty state display
      if (this.notificationsEmpty) {
        this.notificationsEmpty.innerHTML = `
          <i class="fas fa-inbox"></i>
          <p>No notifications yet</p>
          <small>Achievement notifications will appear here</small>
        `;
      }
      
      // Load notifications from API
      await this.loadNotifications();
      
      // Setup event listeners (always setup, regardless of notification count)
      this.setupEventListeners();
      
              this.isInitialized = true;
        // Initialized and dropdown always available
        
        // Make this instance globally available for ChatManager
        window.notificationsManager = this;
      
    } catch (error) {
      logger.error('[Notifications] Initialization error:', error);
    }
  }
  
  /**
   * Profile notifications were removed to avoid confusion with navbar notifications.
   * Only navbar notifications remain active.
   */

  /**
   * Load notifications from the server
   */
      async loadNotifications() {
      try {
        // Loading notifications...
        
        // Try to load from API first
      const response = await fetch('/api/notifications', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const apiNotifications = await response.json();
        
        // Transform API notifications to our format
        this.notifications = apiNotifications.map(notification => ({
          id: notification._id,
          message: notification.content,
          type: this.mapNotificationType(notification.type),
          timestamp: notification.createdAt,
          isRead: notification.isRead,
          icon: this.getNotificationIcon(notification.type),
          actions: notification.data?.actions || []
                  }));
          
          // Loaded notifications from API
        } else {
        // Fallback to mock data if API fails
        this.notifications = [
          {
            id: 'notif-1',
            message: 'Welcome to WC Arena! Start by playing your first match.',
            type: 'info',
            timestamp: new Date().toISOString(),
            isRead: false,
            icon: 'fa-info-circle'
          },
          {
            id: 'notif-2', 
            message: 'Your rank has been updated to Bronze III.',
            type: 'success',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            isRead: false,
            icon: 'fa-trophy'
          }
        ];
        // Using fallback mock data
      }
      
      this.unreadCount = this.notifications.filter(n => !n.isRead).length;
      
      // Render notifications in the UI
      this.renderNotifications();
      
      // Loaded notifications
      
    } catch (error) {
      logger.error('[Notifications] Error loading notifications:', error);
      this.showError('Failed to load notifications');
      
      // Fallback to empty state
      this.notifications = [];
      this.unreadCount = 0;
      this.renderNotifications();
    }
  }
  
  /**
   * Render notifications in the UI
   */
  renderNotifications() {
    if (!this.notificationsContainer) return;this.notificationsContainer.innerHTML = '';
    
    if (this.notifications.length === 0) {
      // Show empty state
      if (this.notificationsEmpty) {
        this.notificationsEmpty.style.display = 'block';
      }
      // Hide mark all read button when no notifications
      if (this.markAllReadBtn) {
        this.markAllReadBtn.style.display = 'none';
      }
      // Always render the dropdown structure, even when empty
      return;}
    
    // Hide empty state when we have notifications
    if (this.notificationsEmpty) {
      this.notificationsEmpty.style.display = 'none';
    }
    
    // Show mark all read button when there are notifications
    if (this.markAllReadBtn) {
      this.markAllReadBtn.style.display = this.unreadCount > 0 ? 'block' : 'none';
    }
    
    // Add each notification to the container
    this.notifications.forEach(notification => {
      const notificationEl = document.createElement('div');
      notificationEl.className = `notification-item ${notification.isRead ? 'read' : 'unread'} ${notification.type || ''}`;
      notificationEl.dataset.id = notification.id;
      
      // Create action buttons HTML if actions exist
      let actionsHtml = '';
      if (notification.actions && notification.actions.length > 0) {
        actionsHtml = `
          <div class="notification-actions">
            ${notification.actions.map(action => `
              <button class="notification-action-btn ${action.style || 'primary'}" 
                      data-action="${action.action}" 
                      data-notification-id="${notification.id}"
                      data-action-data='${JSON.stringify(action.data || {})}'>
                ${action.label}
              </button>
            `).join('')}
          </div>
        `;
      }
      
      notificationEl.innerHTML = `
        <div class="notification-icon">
          <i class="fas ${notification.icon || 'fa-bell'}"></i>
        </div>
        <div class="notification-content">
          <p class="notification-message">${this.escapeHtml(notification.message)}</p>
          <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
          ${actionsHtml}
        </div>
      `;
      
      // Mark as read when clicked (but not on action buttons)
      notificationEl.addEventListener('click', (e) => {
        // Don't mark as read if clicking on action buttons
        if (e.target.classList.contains('notification-action-btn')) {
          return;}
        e.stopPropagation();
        this.markAsRead(notification.id);
      });

      // Handle action button clicks
      notificationEl.querySelectorAll('.notification-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const notificationId = btn.dataset.notificationId;
          const actionData = JSON.parse(btn.dataset.actionData || '{}');
          this.handleNotificationAction(action, notificationId, actionData);
        });
      });
      
      this.notificationsContainer.appendChild(notificationEl);
    });
    
    // Update notification count
    this.updateNotificationCount();
  }
  
  /**
   * Mark a notification as read
   * @param {string} notificationId - The ID of the notification to mark as read
   */
  async markAsRead(notificationId) {
    try {
      // Find the notification
      const notification = this.notifications.find(n => n.id === notificationId);
      if (!notification || notification.isRead) return;notification.isRead = true;
      this.unreadCount--;
      
      // Update UI
      this.renderNotifications();
      
      // Send to API
      try {
        await fetch(`/api/notifications/${notificationId}/read`, { 
          method: 'PUT',
          credentials: 'include'
        });
      } catch (apiError) {
        logger.error('[Notifications] Error syncing read status to API:', apiError);
        // Revert local change on API failure
        notification.isRead = false;
        this.unreadCount++;
        this.renderNotifications();
      }
      
    } catch (error) {
      logger.error('[Notifications] Error marking notification as read:', error);
    }
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const unreadNotifications = this.notifications.filter(n => !n.isRead);
      if (unreadNotifications.length === 0) return;unreadNotifications.forEach(n => n.isRead = true);
      this.unreadCount = 0;
      
      // Update UI
      this.renderNotifications();
      
      // Send to API
      try {
        await fetch('/api/notifications/read-all', { 
          method: 'PUT',
          credentials: 'include'
        });
      } catch (apiError) {
        logger.error('[Notifications] Error syncing mark all read to API:', apiError);
        // Revert local changes on API failure
        unreadNotifications.forEach(n => n.isRead = false);
        this.unreadCount = unreadNotifications.length;
        this.renderNotifications();
      }
      
    } catch (error) {
      logger.error('[Notifications] Error marking all notifications as read:', error);
    }
  }
  
  /**
   * Add a new notification
   * @param {Object} notification - The notification to add
   */
  addNotification(notification) {
    if (!notification || !notification.message) return;const newNotification = {
      id: notification.id || `notif-${Date.now()}`,
      message: notification.message,
      type: notification.type || 'info',
      timestamp: notification.timestamp || new Date().toISOString(),
      isRead: false,
      icon: notification.icon || 'fa-bell',
      data: notification.data || {},
      actions: notification.actions || []
    };
    
    // Add to beginning of array (newest first)
    this.notifications.unshift(newNotification);
    this.unreadCount++;
    
    // Update UI
    this.renderNotifications();
  }
  
  /**
   * Add a friend request notification
   */
  addFriendRequestNotification(fromUserId, fromUsername, requestId) {
    this.addNotification({
      id: `friend_request_${requestId}`,
      message: `${fromUsername} wants to be your friend`,
      type: 'friend_request',
      icon: 'fa-user-plus',
      data: {
        fromUserId,
        fromUsername,
        requestId
      },
      actions: [
        {
          label: 'Accept',
          action: 'accept_friend_request',
          style: 'success',
          data: { requestId }
        },
        {
          label: 'Decline',
          action: 'decline_friend_request', 
          style: 'danger',
          data: { requestId }
        }
      ]
    });
  }

  /**
   * Add a chat request notification
   */
  addChatRequestNotification(fromUserId, fromUsername, chatRoomId) {
    this.addNotification({
      id: `chat_request_${fromUserId}_${Date.now()}`,
      message: `${fromUsername} wants to chat with you`,
      type: 'chat_request',
      icon: 'fa-comment',
      data: {
        fromUserId,
        fromUsername,
        chatRoomId
      },
      actions: [
        {
          label: 'Join Chat',
          action: 'join_private_chat',
          style: 'primary',
          data: { fromUserId, fromUsername, chatRoomId }
        }
      ]
    });
  }
  
  /**
   * Update notification count
   */
  updateNotificationCount() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
    
    if (this.notificationCount) {
      this.notificationCount.textContent = this.unreadCount;
      
      // Hide the badge if count is 0, show if greater than 0
      if (this.unreadCount > 0) {
        this.notificationCount.style.display = 'flex';
      } else {
        this.notificationCount.style.display = 'none';
      }
    }
    
    logger.info(`[Notifications] Updated count: ${this.unreadCount}`);
  }
  
    /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Toggle notifications dropdown
    if (this.notificationBell && this.notificationsDropdown) {
      this.notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        logger.info('🔔 Notification bell clicked');
        
        const isVisible = this.notificationsDropdown.style.display === 'block';
        
        if (isVisible) {
          this.notificationsDropdown.style.display = 'none';
          this.notificationsDropdown.classList.remove('show');
          logger.info('📋 Notifications dropdown hidden');
        } else {
          this.notificationsDropdown.style.display = 'block';
          this.notificationsDropdown.classList.add('show');
          logger.info('📋 Notifications dropdown shown');
          
          // Auto-mark notifications as read when opening (optional)
          // if (this.unreadCount > 0) {
          //   setTimeout(() => this.markAllAsRead(), 2000);
          // }
        }
      });
    }

    // Mark all as read button
    if (this.markAllReadBtn) {
      this.markAllReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        logger.info('✅ Mark all read clicked');
        this.markAllAsRead();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.notificationBell && this.notificationsDropdown && 
          !this.notificationBell.contains(e.target) && 
          !this.notificationsDropdown.contains(e.target)) {
        this.notificationsDropdown.style.display = 'none';
        this.notificationsDropdown.classList.remove('show');
      }
    });
    
    logger.info('🔗 Notification event listeners setup complete');
  }
  
  /**
   * Handle notification action button clicks
   */
  async handleNotificationAction(action, notificationId, actionData) {
    logger.info(`[Notifications] Handling action: ${action}`, actionData);
    
    try {
      switch (action) {
        case 'accept_friend_request':
          await this.handleAcceptFriendRequest(actionData.requestId, notificationId);
          break;
        case 'decline_friend_request':
          await this.handleDeclineFriendRequest(actionData.requestId, notificationId);
          break;
        case 'join_private_chat':
          await this.handleJoinPrivateChat(actionData, notificationId);
          break;
        default:
          logger.warn(`[Notifications] Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`[Notifications] Error handling action ${action}:`, error);
      this.showError(`Failed to ${action.replace('_', ' ')}`);
    }
  }

  /**
   * Handle accepting a friend request
   */
  async handleAcceptFriendRequest(requestId, notificationId) {
    try {
      const response = await fetch(`/api/friends/accept/${requestId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('Friend request accepted!');
        this.removeNotification(notificationId);
      } else {
        this.showError(result.message || 'Failed to accept friend request');
      }
    } catch (error) {
      logger.error('Error accepting friend request:', error);
      this.showError('Failed to accept friend request');
    }
  }

  /**
   * Handle declining a friend request
   */
  async handleDeclineFriendRequest(requestId, notificationId) {
    try {
      const response = await fetch(`/api/friends/decline/${requestId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('Friend request declined');
        this.removeNotification(notificationId);
      } else {
        this.showError(result.message || 'Failed to decline friend request');
      }
    } catch (error) {
      logger.error('Error declining friend request:', error);
      this.showError('Failed to decline friend request');
    }
  }

  /**
   * Handle joining a private chat
   */
  async handleJoinPrivateChat(actionData, notificationId) {
    try {
      // Open the chat system and navigate to private chat
      if (window.chatManager) {
        await window.chatManager.startPrivateChat(actionData.fromUserId, actionData.fromUsername);
        this.showSuccess(`Joined chat with ${actionData.fromUsername}`);
        this.removeNotification(notificationId);
      } else {
        this.showError('Chat system not available');
      }
    } catch (error) {
      logger.error('Error joining private chat:', error);
      this.showError('Failed to join chat');
    }
  }

  /**
   * Remove a notification by ID
   */
  removeNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
    this.renderNotifications();
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showToast(message, 'error');
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <button class="toast-close">&times;</button>
      </div>
      <div class="toast-body">${message}</div>
    `;

    // Add to page
    document.body.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);

    // Handle close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }
  }
  
  /**
   * Format a timestamp as a relative time string
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Formatted time string
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;return date.toLocaleDateString();}
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} unsafe - The string to escape
   * @returns {string} The escaped string
   */
  escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Methods for real-time integration with ChatManager
   */
  
  /**
   * Mark notification as read (called from ChatManager)
   */
  markNotificationAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.unreadCount--;
      this.renderNotifications();
    }
  }
  
  /**
   * Mark all notifications as read (called from ChatManager)
   */
  markAllNotificationsAsRead() {
    this.notifications.forEach(n => {
      if (!n.isRead) {
        n.isRead = true;
        this.unreadCount--;
      }
    });
    this.unreadCount = 0;
    this.renderNotifications();
  }
  
  /**
   * Map notification types for display
   */
  mapNotificationType(type) {
    const typeMap = {
      'friend_request': 'warning',
      'chat_request': 'info',
      'message': 'info',
      'system': 'info',
      'achievement': 'success',
      'campaign': 'success',
      'privateMessage': 'info',
      'roomMessage': 'info',
      'clanMessage': 'info'
    };
    return typeMap[type] || 'info';}
  
  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type) {
    const iconMap = {
      'friend_request': 'fa-user-plus',
      'chat_request': 'fa-comments',
      'message': 'fa-envelope',
      'system': 'fa-info-circle',
      'achievement': 'fa-trophy',
      'campaign': 'fa-flag',
      'privateMessage': 'fa-envelope',
      'roomMessage': 'fa-comments',
      'clanMessage': 'fa-shield-alt'
    };
    return iconMap[type] || 'fa-bell';}

  /**
   * Handle real-time achievement notification
   * Called directly when achievements are awarded
   */
  async handleAchievementNotification(achievementData) {
    logger.info('🏆 Handling real-time achievement notification:', achievementData);
    
    // Create the notification object
    const notification = {
      id: `achievement-${Date.now()}`,
      message: `🏆 Achievement Completed! "${achievementData.name}" - ${achievementData.description}`,
      type: 'success',
      timestamp: new Date().toISOString(),
      isRead: false,
      icon: 'fa-trophy',
      data: achievementData
    };
    
    // Add to notifications immediately
    this.addNotification(notification);
    
    // Also refresh from server to ensure consistency
    setTimeout(() => {
      this.loadNotifications();
    }, 1000);
    
    logger.info('✅ Achievement notification added to dropdown');
  }
}

// Initialize the notifications manager when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.notificationsManager = new NotificationsManager();
    window.notificationsManager.init();
  });
} else {
  window.notificationsManager = new NotificationsManager();
  window.notificationsManager.init();
}

// Make the class available globally for manual initialization  
window.NotificationsManager = NotificationsManager;

// Export for ES modules
// NotificationsManager is available globally as window.notificationsManager
