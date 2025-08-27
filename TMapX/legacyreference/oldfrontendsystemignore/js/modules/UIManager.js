/**
 * Modern UI Manager
 * Handles all UI operations, notifications, modals, and DOM manipulation
 */

export class UIManager {
  constructor() {
    this.notifications = [];
  }

  // === ELEMENT MANIPULATION ===

  /**
   * Update element content safely
   */
  updateElement(elementId, value, fallback = '') {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value || fallback;
    }
  }

  /**
   * Update element HTML safely
   */
  updateHTML(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = html;
    }
  }

  /**
   * Show element
   */
  show(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = '';
      element.classList.remove('d-none');
    }
  }

  /**
   * Hide element
   */
  hide(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'none';
      element.classList.add('d-none');
    }
  }

  /**
   * Toggle element visibility
   */
  toggle(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      if (element.style.display === 'none' || element.classList.contains('d-none')) {
        this.show(elementId);
      } else {
        this.hide(elementId);
      }
    }
  }

  /**
   * Add click event listener
   */
  onClick(elementId, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('click', handler);
    }
  }

  /**
   * Add change event listener
   */
  onChange(elementId, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('change', handler);
    }
  }

  /**
   * Add input event listener
   */
  onInput(elementId, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('input', handler);
    }
  }

  /**
   * Add submit event listener
   */
  onSubmit(elementId, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('submit', handler);
    }
  }

  // === LOADING STATES ===

  /**
   * Show loading indicator
   */
  showLoading(message = 'Loading...') {
    this.createLoadingOverlay(message);
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Create loading overlay
   */
  createLoadingOverlay(message) {
    let overlay = document.getElementById('loading-overlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-family: Arial, sans-serif;
      `;
      
      overlay.innerHTML = `
        <div style="text-align: center;">
          <div style="width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
          <p>${message}</p>
        </div>
      `;
      
      // Add spinner animation if not already present
      if (!document.getElementById('spinner-styles')) {
        const style = document.createElement('style');
        style.id = 'spinner-styles';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
    overlay.querySelector('p').textContent = message;
  }

  /**
   * Show loading on specific element
   */
  showElementLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="loading-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 1rem;">
          <div style="width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin: 0; color: #666;">${message}</p>
        </div>
      `;
    }
  }

  // === NOTIFICATIONS ===

  /**
   * Show success notification
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show error notification
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show warning notification
   */
  showWarning(message) {
    this.showNotification(message, 'warning');
  }

  /**
   * Show info notification
   */
  showInfo(message) {
    this.showNotification(message, 'info');
  }

  /**
   * Show notification with specified type
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas ${this.getNotificationIcon(type)}"></i>
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
      this.addNotificationStyles();
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';}

  /**
   * Add notification styles
   */
  addNotificationStyles() {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        border-left: 4px solid;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      }
      
      .notification-success { border-left-color: #28a745; }
      .notification-error { border-left-color: #dc3545; }
      .notification-warning { border-left-color: #ffc107; }
      .notification-info { border-left-color: #17a2b8; }
      
      .notification-close {
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        font-size: 1rem;
      }
      
      .notification-close:hover {
        color: white;
      }
      
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
    `;
    document.head.appendChild(styles);
  }

  // === MODALS ===

  /**
   * Create and show modal
   */
  createModal(id, title, content, options = {}) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(modal);
    
    // Use window.ModalManager or fallback to our own modal display logic
    if (window.ModalManager && typeof window.ModalManager.show === 'function') {
      window.ModalManager.show(id);
      // Setup close handlers if available
      if (typeof window.ModalManager.setupCloseHandlers === 'function') {
        window.ModalManager.setupCloseHandlers(id);
      }
    } else {
      // Fallback modal display
      modal.style.display = 'flex';
      modal.classList.add('show');
      document.body.classList.add('modal-open');
      
      // Setup close handlers manually
      this.setupModalCloseHandlers(modal);
    }

    return modal;}

  /**
   * Setup modal close handlers (fallback implementation)
   */
  setupModalCloseHandlers(modal) {
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideModal(modal);
      });
    }

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal(modal);
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && modal.style.display !== 'none') {
        this.hideModal(modal);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Hide modal (fallback implementation)
   */
  hideModal(modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    modal.remove();
  }

  /**
   * Show confirmation dialog
   */
  async confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const modalId = 'confirm-modal';const modal = this.createModal(modalId, title, `
        <div class="confirm-content">
          <p>${message}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="confirm-cancel">
              ${options.cancelText || 'Cancel'}
            </button>
            <button class="btn btn-primary" id="confirm-ok">
              ${options.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      `);

      // Handle button clicks
      modal.querySelector('#confirm-cancel').addEventListener('click', () => {
        this.hideModal(modal);
        resolve(false);
      });

      modal.querySelector('#confirm-ok').addEventListener('click', () => {
        this.hideModal(modal);
        resolve(true);
      });
    });
  }

  /**
   * Show prompt dialog
   */
  async prompt(title, message, defaultValue = '', options = {}) {
    return new Promise((resolve) => {
      const modalId = 'prompt-modal';const modal = this.createModal(modalId, title, `
        <div class="prompt-content">
          <p>${message}</p>
          <input type="text" id="prompt-input" value="${defaultValue}" 
                 placeholder="${options.placeholder || ''}" class="form-control">
          <div class="prompt-actions">
            <button class="btn btn-secondary" id="prompt-cancel">
              ${options.cancelText || 'Cancel'}
            </button>
            <button class="btn btn-primary" id="prompt-ok">
              ${options.confirmText || 'OK'}
            </button>
          </div>
        </div>
      `);

      const input = modal.querySelector('#prompt-input');
      input.focus();
      input.select();

      // Handle button clicks
      modal.querySelector('#prompt-cancel').addEventListener('click', () => {
        this.hideModal(modal);
        resolve(null);
      });

      modal.querySelector('#prompt-ok').addEventListener('click', () => {
        const value = input.value.trim();
        this.hideModal(modal);
        resolve(value);
      });

      // Handle Enter key
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const value = input.value.trim();
          this.hideModal(modal);
          resolve(value);
        }
      });
    });
  }

  // === FORM HELPERS ===

  /**
   * Get form data as object
   */
  getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;}

  /**
   * Set form data from object
   */
  setFormData(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;Object.entries(data).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = Boolean(value);
        } else {
          input.value = value || '';
        }
      }
    });
  }

  /**
   * Clear form
   */
  clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
    }
  }

  /**
   * Validate form
   */
  validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;return form.checkValidity();}

  // === CONTENT CREATION ===

  /**
   * Create empty state HTML
   */
  createEmptyState(title, message, buttonText = null, buttonAction = null) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-inbox"></i>
        </div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-message">${message}</p>
        ${buttonText && buttonAction ? `
          <button class="btn btn-primary empty-state-action" onclick="(${buttonAction})()">
            ${buttonText}
          </button>
        ` : ''}
      </div>
    `;}

  /**
   * Create error state HTML
   */
  createErrorState(title, message, retryAction = null) {
    return `
      <div class="error-state">
        <div class="error-state-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 class="error-state-title">${title}</h3>
        <p class="error-state-message">${message}</p>
        ${retryAction ? `
          <button class="btn btn-primary error-state-retry" onclick="(${retryAction})()">
            Try Again
          </button>
        ` : ''}
      </div>
    `;}

  /**
   * Create loading state HTML
   */
  createLoadingState(message = 'Loading...') {
    return `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p class="loading-message">${message}</p>
      </div>
    `;}

  // === ANIMATION HELPERS ===

  /**
   * Fade in element
   */
  fadeIn(elementId, duration = 300) {
    const element = document.getElementById(elementId);
    if (!element) return;element.style.opacity = '0';
    element.style.display = 'block';

    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      element.style.opacity = progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * Fade out element
   */
  fadeOut(elementId, duration = 300) {
    const element = document.getElementById(elementId);
    if (!element) return;let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      element.style.opacity = 1 - progress;
      
      if (progress >= 1) {
        element.style.display = 'none';
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * Slide down element
   */
  slideDown(elementId, duration = 300) {
    const element = document.getElementById(elementId);
    if (!element) return;element.style.height = '0px';
    element.style.overflow = 'hidden';
    element.style.display = 'block';

    const targetHeight = element.scrollHeight;
    let start = null;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      element.style.height = (targetHeight * progress) + 'px';
      
      if (progress >= 1) {
        element.style.height = '';
        element.style.overflow = '';
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * Slide up element
   */
  slideUp(elementId, duration = 300) {
    const element = document.getElementById(elementId);
    if (!element) return;const startHeight = element.offsetHeight;
    element.style.height = startHeight + 'px';
    element.style.overflow = 'hidden';

    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      element.style.height = (startHeight * (1 - progress)) + 'px';
      
      if (progress >= 1) {
        element.style.display = 'none';
        element.style.height = '';
        element.style.overflow = '';
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  // === UTILITY METHODS ===

  /**
   * Debounce function calls
   */
  debounce(func, wait) {
    let timeout;
    return ;}

  /**
   * Throttle function calls
   */
  throttle(func, limit) {
    let inThrottle;
    return ;}

  /**
   * Format date for display
   */
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });}

  /**
   * Format time for display
   */
  formatTime(date, options = {}) {
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(date).toLocaleTimeString('en-US', { ...defaultOptions, ...options });}

  /**
   * Format date and time for display
   */
  formatDateTime(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(date).toLocaleString('en-US', { ...defaultOptions, ...options });}

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;return 'Just now';}

  /**
   * Escape HTML to prevent XSS
   */
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showError('Failed to copy to clipboard');
    }
  }

  /**
   * Download file
   */
  downloadFile(data, filename, type = 'text/plain') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
} 