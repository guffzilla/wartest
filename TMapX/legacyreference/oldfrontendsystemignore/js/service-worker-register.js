// Service Worker Registration and Management
// Handles Service Worker installation, updates, and communication

class ServiceWorkerManager {
  constructor() {
    this.swRegistration = null;
    this.isSupported = 'serviceWorker' in navigator;
    this.swPath = '/sw.js';
    this.updateFound = false;
  }

  // Initialize Service Worker
  async init() {
    if (!this.isSupported) {
      console.log('⚠️ Service Worker not supported in this browser');
      return false;}

    try {
      console.log('🔧 Registering Service Worker...');
      
      this.swRegistration = await navigator.serviceWorker.register(this.swPath, {
        scope: '/'
      });

      console.log('✅ Service Worker registered successfully:', this.swRegistration);

      // Set up event listeners
      this.setupEventListeners();
      
      // Check for updates
      this.checkForUpdates();

      return true;} catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;}
  }

  // Set up event listeners for Service Worker
  setupEventListeners() {
    // Handle Service Worker updates
    this.swRegistration.addEventListener('updatefound', () => {
      console.log('🔄 Service Worker update found');
      this.updateFound = true;
      
      const newWorker = this.swRegistration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available
            this.showUpdateNotification();
          } else {
            // Content is cached for offline use
            console.log('✅ Content is cached for offline use');
          }
        }
      });
    });

    // Handle Service Worker controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      
      if (this.updateFound) {
        // Reload the page to use the new Service Worker
        window.location.reload();
      }
    });

    // Handle Service Worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('💬 Received message from Service Worker:', event.data);
      this.handleServiceWorkerMessage(event.data);
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored');
      this.updateConnectionStatus(true);
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost');
      this.updateConnectionStatus(false);
    });
  }

  // Check for Service Worker updates
  checkForUpdates() {
    if (this.swRegistration) {
      this.swRegistration.update();
    }
  }

  // Show update notification
  showUpdateNotification() {
    // Create a notification banner
    const notification = document.createElement('div');
    notification.className = 'sw-update-notification';
    notification.innerHTML = `
      <div class="sw-update-content">
        <span>🔄 New version available</span>
        <button onclick="serviceWorkerManager.applyUpdate()">Update Now</button>
        <button onclick="this.parentElement.parentElement.remove()">Later</button>
      </div>
    `;

    // Add styles
    const styles = `
      .sw-update-notification {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #D4AF37, #E8C547);
        color: #000;
        padding: 1rem;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      }
      .sw-update-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        max-width: 600px;
        margin: 0 auto;
      }
      .sw-update-content button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
      }
      .sw-update-content button:first-of-type {
        background: #000;
        color: #D4AF37;
      }
      .sw-update-content button:last-of-type {
        background: transparent;
        color: #000;
        border: 1px solid #000;
      }
      .sw-update-content button:hover {
        transform: translateY(-1px);
      }
    `;

    if (!document.getElementById('sw-update-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'sw-update-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    document.body.appendChild(notification);
  }

  // Apply Service Worker update
  applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  // Handle messages from Service Worker
  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('📦 Cache updated:', data.payload);
        break;
      case 'OFFLINE_DATA_SYNC':
        console.log('🔄 Offline data sync:', data.payload);
        this.syncOfflineData(data.payload);
        break;
      case 'PUSH_NOTIFICATION':
        console.log('📱 Push notification:', data.payload);
        this.showPushNotification(data.payload);
        break;
      default:
        console.log('📨 Unknown message type:', data.type);
    }
  }

  // Update connection status in UI
  updateConnectionStatus(isOnline) {
    // Update any connection status indicators in the UI
    const statusElements = document.querySelectorAll('.connection-status');
    statusElements.forEach(element => {
      element.textContent = isOnline ? '🌐 Online' : '📴 Offline';
      element.className = `connection-status ${isOnline ? 'online' : 'offline'}`;
    });

    // Dispatch custom event for other components
    const event = new CustomEvent('connectionStatusChanged', {
      detail: { isOnline }
    });
    window.dispatchEvent(event);
  }

  // Sync offline data
  async syncOfflineData(data) {
    try {
      // Implement offline data synchronization
      console.log('🔄 Syncing offline data:', data);
      
      // Example: Sync form submissions, API calls, etc.
      if (data.type === 'FORM_SUBMISSION') {
        await this.syncFormSubmission(data.payload);
      } else if (data.type === 'API_CALL') {
        await this.syncAPICall(data.payload);
      }
      
      console.log('✅ Offline data synced successfully');
    } catch (error) {
      console.error('❌ Offline data sync failed:', error);
    }
  }

  // Sync form submission
  async syncFormSubmission(formData) {
    // Implement form submission sync
    console.log('📝 Syncing form submission:', formData);
  }

  // Sync API call
  async syncAPICall(apiData) {
    // Implement API call sync
    console.log('🌐 Syncing API call:', apiData);
  }

  // Show push notification
  showPushNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/images/icon-192x192.png',
        badge: notification.badge || '/images/badge-72x72.png'
      });
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('📱 Notification permission:', permission);
      return permission === 'granted';}
    return false;}

  // Get cache information
  async getCacheInfo() {
    if (!this.isSupported) return null;try {
      const cacheNames = await caches.keys();
      const cacheInfo = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheInfo[cacheName] = {
          size: keys.length,
          urls: keys.map(request => request.url)
        };
      }

      return cacheInfo;} catch (error) {
      console.error('❌ Failed to get cache info:', error);
      return null;}
  }

  // Clear all caches
  async clearAllCaches() {
    if (!this.isSupported) return false;try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      console.log('🗑️ All caches cleared');
      return true;} catch (error) {
      console.error('❌ Failed to clear caches:', error);
      return false;}
  }

  // Unregister Service Worker
  async unregister() {
    if (this.swRegistration) {
      await this.swRegistration.unregister();
      console.log('🗑️ Service Worker unregistered');
      return true;}
    return false;}
}

// Create global instance
const serviceWorkerManager = new ServiceWorkerManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    serviceWorkerManager.init();
  });
} else {
  serviceWorkerManager.init();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServiceWorkerManager;
}
