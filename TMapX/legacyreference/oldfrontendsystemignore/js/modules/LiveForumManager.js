/**
 * LiveForumManager.js - Real-Time Forum Features
 * 
 * Features:
 * - Live post updates via Socket.IO
 * - Real-time typing indicators
 * - Live activity feed
 * - Trending topics tracking
 * - Online users display
 * - Real-time notifications
 * - Live post reactions
 * - Auto-refresh content
 * Updated for Rust backend compatibility
 */

import { apiClient } from './ApiClient.js';

class LiveForumManager {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.typingUsers = new Map();
    this.typingTimeout = null;
    this.isTyping = false;
    this.liveActivities = [];
    this.trendingTopics = [];
    this.onlineUsers = [];
    this.lastActivity = Date.now();
    this.activityUpdateInterval = null;
    this.currentUser = null;
    
    // Configuration
    this.config = {
      typingTimeout: 3000, // 3 seconds
      activityRefreshRate: 30000, // 30 seconds
      trendingRefreshRate: 60000, // 1 minute
      onlineUsersRefreshRate: 15000, // 15 seconds
      maxActivities: 10,
      maxTrendingTopics: 5
    };

    this.init();
  }

  /**
   * Initialize live forum features
   */
  async init() {
    console.log('🚀 LiveForumManager: Initializing real-time features...');
    
    try {
      // Get current user info
      await this.getCurrentUser();
      
      // Initialize Socket.IO connection
      this.initializeSocket();
      
      // Set up activity tracking
      this.setupActivityTracking();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      // Populate sidebar with real data
      await this.populateSidebar();
      
      // console.log('✅ LiveForumManager: Real-time features initialized'); // Reduced logging
    } catch (error) {
      console.error('❌ LiveForumManager: Initialization failed:', error);
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser() {
    try {
      this.currentUser = await apiClient.getCurrentUser();
      console.log('✅ LiveForumManager: User authenticated:', this.currentUser.username);
      return this.currentUser;
    } catch (error) {
      console.log('❌ LiveForumManager: User not authenticated');
      return null;
    }
  }

  /**
   * Initialize Socket.IO connection
   */
  initializeSocket() {
    if (!window.io) {
      console.warn('Socket.IO not available, live features disabled');
      return;}

    this.socket = window.io();
    
    this.socket.on('connect', () => {
      console.log('✅ Socket connected for live forum features');
      this.joinForumRoom();
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.handleDisconnection();
    });

    // Forum-specific events
    this.socket.on('forum:newPost', (data) => this.handleNewPost(data));
    this.socket.on('forum:postReaction', (data) => this.handlePostReaction(data));
    this.socket.on('forum:typing', (data) => this.handleTyping(data));
    this.socket.on('forum:stopTyping', (data) => this.handleStopTyping(data));
    this.socket.on('forum:userOnline', (data) => this.handleUserOnline(data));
    this.socket.on('forum:userOffline', (data) => this.handleUserOffline(data));
    this.socket.on('forum:activity', (data) => this.handleLiveActivity(data));
    this.socket.on('forum:trending', (data) => this.handleTrendingUpdate(data));

    console.log('✅ Socket event listeners set up');
  }

  /**
   * Join forum room for real-time updates
   */
  joinForumRoom() {
    if (!this.socket) return;const gameType = window.forumCore?.currentGame || 'wc2';
    const roomName = `forum_${gameType}`;
    
    if (this.currentRoom) {
      this.socket.emit('forum:leaveRoom', { room: this.currentRoom });
    }
    
    this.currentRoom = roomName;
    this.socket.emit('forum:joinRoom', { 
      room: roomName, 
      user: this.currentUser 
    });
    
    console.log(`🎮 Joined forum room: ${roomName}`);
  }

  /**
   * Handle typing indicators
   */
  handleTyping(isTyping) {
    if (!this.socket || !this.currentUser) return;if (isTyping && !this.isTyping) {
      this.isTyping = true;
      this.socket.emit('forum:typing', {
        room: this.currentRoom,
        user: this.currentUser
      });
    } else if (!isTyping && this.isTyping) {
      this.isTyping = false;
      this.socket.emit('forum:stopTyping', {
        room: this.currentRoom,
        user: this.currentUser
      });
    }
    
    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Set new timeout to stop typing indicator
    if (isTyping) {
      this.typingTimeout = setTimeout(() => {
        this.handleTyping(false);
      }, this.config.typingTimeout);
    }
  }

  /**
   * Handle incoming typing events from other users
   */
  handleTypingEvent(data) {
    if (!data.user || data.user.id === this.currentUser?.id) return;this.typingUsers.set(data.user.id, {
      username: data.user.username,
      timestamp: Date.now()
    });
    
    this.updateTypingIndicator();
  }

  /**
   * Handle stop typing events
   */
  handleStopTyping(data) {
    if (!data.user) return;this.typingUsers.delete(data.user.id);
    this.updateTypingIndicator();
  }

  /**
   * Update typing indicator display
   */
  updateTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    const usersText = document.getElementById('typing-users');
    
    if (!indicator || !usersText) return;const now = Date.now();
    for (const [userId, data] of this.typingUsers) {
      if (now - data.timestamp > this.config.typingTimeout) {
        this.typingUsers.delete(userId);
      }
    }
    
    const typingUsersList = Array.from(this.typingUsers.values());
    
    if (typingUsersList.length === 0) {
      indicator.style.display = 'none';
      return;}
    
    // Show typing indicator
    indicator.style.display = 'flex';
    
    if (typingUsersList.length === 1) {
      usersText.textContent = `${typingUsersList[0].username} is crafting a legendary post...`;
    } else if (typingUsersList.length === 2) {
      usersText.textContent = `${typingUsersList[0].username} and ${typingUsersList[1].username} are writing posts...`;
    } else {
      usersText.textContent = `${typingUsersList.length} warriors are crafting epic posts...`;
    }
  }

  /**
   * Handle new post from socket
   */
  handleNewPost(data) {
    if (window.forumCore && data.gameType === window.forumCore.currentGame) {
      window.forumCore.addPostToFeed(data.post, true);
      
      // Add to live activity
      this.addLiveActivity({
        type: 'newPost',
        user: data.post.author,
        content: `Posted in ${data.gameType.toUpperCase()} forum`,
        timestamp: Date.now()
      });
      
      // Update stats
      this.updateLiveStats();
    }
  }

  /**
   * Handle post reactions from socket
   */
  handlePostReaction(data) {
    if (window.forumCore) {
      window.forumCore.updatePostReactions(data.postId, data.reactions, data.userReaction);
      
      // Add to live activity if it's a celebration
      if (data.reaction === 'celebrate') {
        this.addLiveActivity({
          type: 'celebration',
          user: data.user,
          content: 'Celebrated an epic post! 🏆',
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Handle user coming online
   */
  handleUserOnline(data) {
    const existingUser = this.onlineUsers.find(u => u.id === data.user.id);
    if (!existingUser) {
      this.onlineUsers.push(data.user);
      this.updateOnlineUsers();
      
      // Add to live activity
      this.addLiveActivity({
        type: 'userOnline',
        user: data.user,
        content: 'Joined the battlefield',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle user going offline
   */
  handleUserOffline(data) {
    this.onlineUsers = this.onlineUsers.filter(u => u.id !== data.user.id);
    this.updateOnlineUsers();
  }

  /**
   * Handle live activity updates
   */
  handleLiveActivity(data) {
    this.addLiveActivity(data);
  }

  /**
   * Handle trending topics updates
   */
  handleTrendingUpdate(data) {
    this.trendingTopics = data.topics;
    this.updateTrendingTopics();
  }

  /**
   * Add new live activity
   */
  addLiveActivity(activity) {
    this.liveActivities.unshift(activity);
    
    // Keep only the latest activities
    if (this.liveActivities.length > this.config.maxActivities) {
      this.liveActivities = this.liveActivities.slice(0, this.config.maxActivities);
    }
    
    this.updateLiveActivityDisplay();
  }

  /**
   * Update live activity display
   */
  updateLiveActivityDisplay() {
    const container = document.getElementById('live-activity');
    if (!container) return;if (this.liveActivities.length === 0) {
      container.innerHTML = `
        <div class="no-activity">
          <i class="fas fa-clock"></i>
          <span>No recent activity</span>
        </div>
      `;
      return;}
    
    container.innerHTML = this.liveActivities.map(activity => `
      <div class="live-activity-item">
        <img src="${activity.user.avatar || '/assets/img/default-avatar.svg'}" 
             alt="${activity.user.username}" 
             class="activity-avatar">
        <div class="activity-text">
          <strong>${activity.user.displayName || activity.user.username}</strong> ${activity.content}
        </div>
        <div class="activity-time">${this.getTimeAgo(activity.timestamp)}</div>
      </div>
    `).join('');
  }

  /**
   * Update trending topics display
   */
  updateTrendingTopics() {
    const container = document.getElementById('trending-topics');
    if (!container) return;if (this.trendingTopics.length === 0) {
      container.innerHTML = `
        <div class="no-trending">
          <i class="fas fa-fire"></i>
          <span>No trending topics yet</span>
        </div>
      `;
      return;}
    
    container.innerHTML = this.trendingTopics.map(topic => `
      <div class="trending-topic" onclick="window.forumCore?.searchTopic('${topic.title}')">
        <div class="trending-title">${topic.title}</div>
        <div class="trending-meta">${topic.posts} posts • ${topic.interactions} interactions</div>
      </div>
    `).join('');
  }

  /**
   * Update online users display
   */
  updateOnlineUsers() {
    const container = document.getElementById('online-users');
    const countElement = document.getElementById('online-users-count');
    
    if (countElement && window.forumCore) {
      window.forumCore.animateCounterUpdate(countElement, this.onlineUsers.length);
    }
    
    if (!container) return;if (this.onlineUsers.length === 0) {
      container.innerHTML = `
        <div class="no-users">
          <i class="fas fa-users"></i>
          <span>No one online</span>
        </div>
      `;
      return;}
    
    container.innerHTML = this.onlineUsers.slice(0, 20).map(user => `
      <div class="online-user" title="${user.displayName || user.username}">
        <img src="${user.avatar || '/assets/img/default-avatar.svg'}" 
             alt="${user.username}">
        <div class="online-indicator"></div>
      </div>
    `).join('');
  }

  /**
   * Set up activity tracking
   */
  setupActivityTracking() {
    // Track user interactions
    document.addEventListener('click', () => {
      this.lastActivity = Date.now();
    });
    
    document.addEventListener('keypress', () => {
      this.lastActivity = Date.now();
    });
    
    document.addEventListener('scroll', () => {
      this.lastActivity = Date.now();
    });
  }

  /**
   * Start periodic updates
   */
  startPeriodicUpdates() {
    
    // Update forum statistics periodically
    setInterval(async () => {
      await this.updateLiveStats();
    }, this.config.activityRefreshRate);
    
    // Update trending topics periodically  
    setInterval(async () => {
      await this.updateTrendingTopics();
    }, this.config.trendingRefreshRate);
    
    // Update online users periodically
    setInterval(async () => {
      await this.updateOnlineUsers();
    }, this.config.onlineUsersRefreshRate);
  }

  /**
   * Populate sidebar with real data
   */
  async populateSidebar() {
    try {
      // Update live stats with real data
      await this.updateLiveStats();
      
      // Load real online users (or reasonable defaults)
      await this.updateOnlineUsers();
      
      // Load real trending topics from recent forum activity
      await this.updateTrendingTopics();
      
      // console.log('✅ Sidebar populated with real data'); // Reduced logging
    } catch (error) {
      console.error('❌ Failed to populate sidebar:', error);
      // Show minimal sidebar on error
      this.showMinimalSidebar();
    }
  }

  /**
   * Update live statistics with real data
   */
  async updateLiveStats() {
    try {
      // Get current game type from ForumCore if available
      const currentGame = window.forumCore ? window.forumCore.currentGame : 'wc2';
      
      // Get forum stats for current game using new API client
      const stats = await apiClient.getForumStats({
        game_type: currentGame
      });
        
        // console.log(`✅ Live stats updated:`, stats); // Reduced logging
        
        // Update the sidebar elements
        const activePostsElement = document.getElementById('active-posts-count');
        const onlineUsersElement = document.getElementById('online-users-count');
        
        if (activePostsElement && window.forumCore) {
          window.forumCore.animateCounterUpdate(activePostsElement, stats.activePosts);
        }
        
        if (onlineUsersElement && window.forumCore) {
          window.forumCore.animateCounterUpdate(onlineUsersElement, stats.onlineUsers);
        }
        
        this.stats = stats;
        
        // Update sidebar with real data
        // Sidebar elements are already updated above with real data
      } else {
        console.warn('❌ Failed to fetch forum stats, using fallback');
        this.updateFallbackStats();
      }
      
    } catch (error) {
      console.error('❌ Error updating live stats:', error);
      this.updateFallbackStats();
    }
  }

  /**
   * Update fallback stats when API fails
   */
  updateFallbackStats() {
    // Fallback to showing current loaded posts count
    const activePostsElement = document.getElementById('active-posts-count');
    const onlineUsersElement = document.getElementById('online-users-count');
    
    if (activePostsElement && window.forumCore && window.forumCore.posts) {
      window.forumCore.animateCounterUpdate(activePostsElement, window.forumCore.posts.length);
    }
    
    if (onlineUsersElement && window.forumCore) {
      // Show number of online users from socket connection
      const onlineCount = this.onlineUsers ? this.onlineUsers.length : 1;
      window.forumCore.animateCounterUpdate(onlineUsersElement, onlineCount);
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection() {
    // Show offline indicator
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.innerHTML = `
      <i class="fas fa-wifi"></i>
      <span>Connection lost. Attempting to reconnect...</span>
    `;
    
    document.body.appendChild(indicator);
    
    // Remove indicator when reconnected
    this.socket?.on('connect', () => {
      if (indicator.parentElement) {
        indicator.remove();
      }
    });
  }

  /**
   * Get time ago string
   */
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'now';if (minutes < 60) return `${minutes}m`;const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;const days = Math.floor(hours / 24);
    return `${days}d`;}

  /**
   * Clean up resources
   */
  destroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    if (this.activityUpdateInterval) {
      clearInterval(this.activityUpdateInterval);
    }
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    console.log('✅ LiveForumManager: Cleaned up resources');
  }

  /**
   * Show minimal sidebar on error
   */
  showMinimalSidebar() {
    this.updateFallbackStats();
    
    // Clear activity feed
    const activityFeed = document.querySelector('.activity-item');
    if (activityFeed?.parentElement) {
      activityFeed.parentElement.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="activity-content">
            <div class="activity-text">Forum statistics loading...</div>
            <div class="activity-time">just now</div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Animate counter to new value
   */
  animateCounter(element, newValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const increment = newValue > currentValue ? 1 : -1;
    const steps = Math.abs(newValue - currentValue);
    const stepDuration = Math.min(1000 / steps, 50);
    
    let current = currentValue;
    const timer = setInterval(() => {
      current += increment;
      element.textContent = current;
      
      if (current === newValue) {
        clearInterval(timer);
      }
    }, stepDuration);
  }
}

// Export for ES6 modules
export { LiveForumManager };

// Initialize global instance
window.LiveForumManager = LiveForumManager; 