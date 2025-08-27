/* ==========================================================================
   WARCRAFT ARENA - UTILITY FUNCTIONS
   Centralized utilities to eliminate duplicates across JavaScript files
   ========================================================================== */

// Use console.log instead of logger for this file since it's not a module
const logger = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info
};

/**
 * Modal Management Utilities - SIMPLIFIED
 */
if (!window.ModalManager) {
  class ModalManager {
      static show(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    } else {
      logger.warn('⚠️ Modal not found:', modalId);
    }
  }

    static hide(modalId) {
      logger.log('📋 ModalManager.hide called for:', modalId);
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
        logger.log('✅ Modal hidden:', modalId);
      } else {
        logger.warn('⚠️ Modal not found:', modalId);
      }
    }

    static toggle(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        if (modal.style.display === 'none' || !modal.classList.contains('show')) {
          this.show(modalId);
        } else {
          this.hide(modalId);
        }
      }
    }

    static setupCloseHandlers(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;const closeBtn = modal.querySelector('.close-modal, .modal-close');
      if (closeBtn) {
        closeBtn.onclick = () => this.hide(modalId);
      }

      // Close on backdrop click
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.hide(modalId);
        }
      };

      // Close on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
          this.hide(modalId);
        }
      });
    }
  }
  
  // Export ModalManager to window
  window.ModalManager = ModalManager;
}

/**
 * Element Visibility Utilities
 */
class ElementUtils {
  static show(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'block';
      element.classList.remove('d-none');
    }
  }

  static hide(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'none';
      element.classList.add('d-none');
    }
  }

  static toggle(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      if (element.style.display === 'none' || element.classList.contains('d-none')) {
        this.show(elementId);
      } else {
        this.hide(elementId);
      }
    }
  }

  static showInline(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'inline-block';
      element.classList.remove('d-none');
    }
  }

  static showFlex(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'flex';
      element.classList.remove('d-none');
    }
  }

  static showGrid(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'grid';
      element.classList.remove('d-none');
    }
  }
}

/**
 * Loading State Management
 */
class LoadingManager {
  static show(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>${message}</p>
        </div>
      `;
    }
  }

  static hide(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      const loading = container.querySelector('.loading');
      if (loading) {
        loading.remove();
      }
    }
  }

  static showOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.id = 'global-loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <p>${message}</p>
    `;
    document.body.appendChild(overlay);
  }

  static hideOverlay() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}

/**
 * Form Utilities
 */
class FormUtils {
  static clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
      // Clear any error states
      const errorElements = form.querySelectorAll('.error, .is-invalid');
      errorElements.forEach(el => {
        el.classList.remove('error', 'is-invalid');
      });
    }
  }

  static getFormData(formId) {
    const form = document.getElementById(formId);
    if (form) {
      return new FormData(form);}
    return null;}

  static setFormData(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;Object.keys(data).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = data[key];
        } else {
          input.value = data[key];
        }
      }
    });
  }

  static validateRequired(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('error');
        isValid = false;
      } else {
        field.classList.remove('error');
      }
    });

    return isValid;}
}

/**
 * API Utilities
 */
class ApiUtils {
  static async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();}
      
      return await response.text();} catch (error) {
      logger.error('API request failed:', error);
      throw error;
    }
  }

  static async get(url) {
    return this.request(url, { method: 'GET' });}

  static async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });}

  static async put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });}

  static async delete(url) {
    return this.request(url, { method: 'DELETE' });}
}

/**
 * Notification Utilities
 */
class NotificationUtils {
  static show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);

    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => notification.remove());

    return notification;}

  static success(message, duration) {
    return this.show(message, 'success', duration);}

  static error(message, duration) {
    return this.show(message, 'error', duration);}

  static warning(message, duration) {
    return this.show(message, 'warning', duration);}

  static info(message, duration) {
    return this.show(message, 'info', duration);}
}

/**
 * Local Storage Utilities
 */
class StorageUtils {
  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;} catch (error) {
      logger.error('Failed to save to localStorage:', error);
      return false;}
  }

  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;} catch (error) {
      logger.error('Failed to read from localStorage:', error);
      return defaultValue;}
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;} catch (error) {
      logger.error('Failed to remove from localStorage:', error);
      return false;}
  }

  static clear() {
    try {
      localStorage.clear();
      return true;} catch (error) {
      logger.error('Failed to clear localStorage:', error);
      return false;}
  }
}

/**
 * Date/Time Utilities
 */
class DateUtils {
  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);}

  static timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'just now';if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;return `${Math.floor(diffInSeconds / 31536000)}y ago`;}
}

/**
 * Validation Utilities
 */
class ValidationUtils {
  static isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);}

  static isUrl(url) {
    try {
      new URL(url);
      return true;} catch {
      return false;}
  }

  static isNumber(value) {
    return !isNaN(value) && !isNaN(parseFloat(value));}

  static minLength(value, min) {
    return value && value.length >= min;}

  static maxLength(value, max) {
    return value && value.length <= max;}
}

/**
 * Debounce Utility
 */
function debounce(func, wait, immediate) {
  let timeout;
  return ;
}

/**
 * Throttle Utility
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/* ==========================================================================
   GLOBAL SCRIPT LOADING UTILITY
   ========================================================================== */

/**
 * Load a script dynamically and return a promise
 * @param {string} src - The script source URL
 * @param {string} loadingMessage - Optional loading message for console
 * @param {string} successMessage - Optional success message for console
 * @returns {Promise} - Promise that resolves when script is loaded
 */
function loadScript(src, loadingMessage = '', successMessage = '') {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);if (existingScript) {
      logger.log(`📦 Script already loaded: ${src}`);
      resolve();
      return;}

    if (loadingMessage) {
      logger.log(loadingMessage);
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      if (successMessage) {
        logger.log(successMessage);
      }
      resolve();
    };
    script.onerror = (error) => {
      logger.error(`❌ Failed to load script: ${src}`, error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

// Export utilities for use in other files
window.ElementUtils = ElementUtils;
window.LoadingManager = LoadingManager;
window.FormUtils = FormUtils;
window.ApiUtils = ApiUtils;
window.NotificationUtils = NotificationUtils;
window.StorageUtils = StorageUtils;
window.DateUtils = DateUtils;
window.ValidationUtils = ValidationUtils;
window.debounce = debounce;
window.throttle = throttle;
window.loadScript = loadScript; 