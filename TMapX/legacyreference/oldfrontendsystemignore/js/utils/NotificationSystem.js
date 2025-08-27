/**
 * Universal Notification System
 * Provides themed notifications for form validation and user feedback
 */
export class NotificationSystem {
  static showNotification(message, type = 'error', duration = 5000) {
    // Remove any existing notifications of the same type
    const existing = document.querySelector(`.notification-toast.${type}`);
    if (existing) {
      existing.remove();
    }

    // Create notification container
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    
    // Get icon based on type
    const icons = {
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      success: 'fas fa-check-circle',
      info: 'fas fa-info-circle'
    };

    // Get colors based on type
    const colors = {
      error: {
        bg: 'rgba(220, 38, 38, 0.95)',
        border: '#dc2626',
        text: '#ffffff'
      },
      warning: {
        bg: 'rgba(245, 158, 11, 0.95)',
        border: '#f59e0b',
        text: '#1f2937'
      },
      success: {
        bg: 'rgba(16, 185, 129, 0.95)',
        border: '#10b981',
        text: '#ffffff'
      },
      info: {
        bg: 'rgba(59, 130, 246, 0.95)',
        border: '#3b82f6',
        text: '#ffffff'
      }
    };

    const color = colors[type] || colors.error;

    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: ${color.bg};
      border: 2px solid ${color.border};
      border-radius: 12px;
      padding: 1rem 1.5rem;
      min-width: 300px;
      max-width: 500px;
      color: ${color.text};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.95rem;
      font-weight: 500;
      line-height: 1.4;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      z-index: 99999;
      cursor: pointer;
      transition: all 0.3s ease;
      transform: translateX(100%);
      opacity: 0;
      animation: slideIn 0.3s ease forwards;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
        <i class="${icons[type]}" style="font-size: 1.2rem; margin-top: 0.1rem; flex-shrink: 0;"></i>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">${this.getTitle(type)}</div>
          <div>${message}</div>
        </div>
        <button style="
          background: none;
          border: none;
          color: ${color.text};
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          margin-left: 0.5rem;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
          ×
        </button>
      </div>
    `;

    // Add CSS animations
    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .notification-toast:hover {
          transform: translateX(-5px) scale(1.02);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4);
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto-remove after duration
    const autoRemove = setTimeout(() => {
      this.removeNotification(notification);
    }, duration);

    // Click to close
    const closeBtn = notification.querySelector('button');
    const clickToClose = () => {
      clearTimeout(autoRemove);
      this.removeNotification(notification);
    };

    closeBtn.addEventListener('click', clickToClose);
    notification.addEventListener('click', clickToClose);

    return notification;}

  static removeNotification(notification) {
    if (!notification || !notification.parentNode) return;notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  static getTitle(type) {
    const titles = {
      error: 'Validation Error',
      warning: 'Warning',
      success: 'Success',
      info: 'Information'
    };
    return titles[type] || 'Notification';}

  // Convenience methods
  static showError(message, duration = 5000) {
    return this.showNotification(message, 'error', duration);}

  static showWarning(message, duration = 5000) {
    return this.showNotification(message, 'warning', duration);}

  static showSuccess(message, duration = 4000) {
    return this.showNotification(message, 'success', duration);}

  static showInfo(message, duration = 4000) {
    return this.showNotification(message, 'info', duration);}

  // Clear all notifications
  static clearAll() {
    const notifications = document.querySelectorAll('.notification-toast');
    notifications.forEach(notification => {
      this.removeNotification(notification);
    });
  }
}

// Global shorthand functions
window.showError = (message, duration) => NotificationSystem.showError(message, duration);
window.showWarning = (message, duration) => NotificationSystem.showWarning(message, duration);
window.showSuccess = (message, duration) => NotificationSystem.showSuccess(message, duration);
window.showInfo = (message, duration) => NotificationSystem.showInfo(message, duration);
