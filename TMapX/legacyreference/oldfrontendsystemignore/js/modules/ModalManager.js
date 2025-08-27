/**
 * UNIVERSAL MODAL MANAGER
 * Standardizes modal behavior across the entire site
 * Handles opening, closing, and management of all modals
 */

// Check if existing ModalManager is incomplete (missing createModal method)
if (window.ModalManager && typeof window.ModalManager.createModal !== 'function') {
  console.log('🔄 Replacing incomplete ModalManager with full implementation');
  // Clear the incomplete ModalManager
  delete window.ModalManager;
}

// Prevent duplicate initialization only if we have a complete ModalManager
if (window.ModalManager && typeof window.ModalManager.createModal === 'function') {
  console.warn('⚠️ Complete ModalManager already exists, skipping initialization');
} else {
  class ModalManager {
    constructor() {
      // Prevent multiple instances
      if (window._modalManagerInstance) {
        console.warn('⚠️ ModalManager instance already exists, returning existing instance');
        return window._modalManagerInstance;
      }
      
      this.activeModals = new Set();
      this.modalStack = [];
      this.modalOptions = new Map();
      this.isInitialized = false;
      
      // Store instance globally
      window._modalManagerInstance = this;
      
      this.init();
    }

    /**
     * Initialize the modal manager
     */
    init() {
      if (this.isInitialized) return;
      
      // Set up global event listeners
      this.setupGlobalListeners();
      this.isInitialized = true;
      
      console.log('🎯 ModalManager initialized');
    }

    /**
     * Set up global event listeners for modal management
     */
    setupGlobalListeners() {
      // Close modals on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activeModals.size > 0) {
          this.closeTopModal();
        }
      });

      // Close modals on backdrop click
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('universal-modal')) {
          const topModalId = this.modalStack[this.modalStack.length - 1];
          const options = this.modalOptions.get(topModalId);
          // Default behavior: allow backdrop close unless explicitly disabled
          const allowBackdropClose = !options || options.backdropClose !== false;
          if (allowBackdropClose) {
            this.closeTopModal();
          }
        }
      });

      // Note: preventBodyScroll() is now only called when modals are actually opened
      // to avoid interfering with normal page scrolling
    }

    /**
     * Prevent body scrolling when modals are open
     */
    preventBodyScroll() {
      // Store original overflow value
      this.originalOverflow = document.body.style.overflow;
      
      // Set overflow to hidden to prevent scrolling
      try {
        document.body.style.overflow = 'hidden';
      } catch (error) {
        console.warn('Could not set body overflow to hidden:', error);
      }
    }

    /**
     * Restore body scrolling when modals are closed
     */
    restoreBodyScroll() {
      // Restore original overflow value
      if (this.originalOverflow !== undefined) {
        try {
          document.body.style.overflow = this.originalOverflow;
        } catch (error) {
          console.warn('Could not restore body overflow:', error);
          // Fallback to auto if restoration fails
          document.body.style.overflow = 'auto';
        }
      } else {
        // Fallback to auto if no original value stored
        document.body.style.overflow = 'auto';
      }
    }

    /**
     * Create and open a universal modal
     * @param {Object} options - Modal configuration options
     * @param {string} options.id - Unique modal ID
     * @param {string} options.title - Modal title
     * @param {string} options.icon - FontAwesome icon class (optional)
     * @param {string|HTMLElement} options.content - Modal content
     * @param {Function} options.onOpen - Callback when modal opens
     * @param {Function} options.onClose - Callback when modal closes
     * @param {Object} options.styles - Additional CSS classes for styling
     * @returns {HTMLElement} The created modal element
     */
    createModal(options) {
      const {
        id,
        title,
        icon = 'fa-window-maximize',
        content,
        onOpen,
        onClose,
        styles = {},
        backdropClose = true
      } = options;

      // Check if modal already exists
      if (document.getElementById(id)) {
        console.warn(`Modal with ID '${id}' already exists`);
        return document.getElementById(id);
      }

      // Create modal structure
      const modal = document.createElement('div');
      modal.id = id;
      modal.className = `universal-modal ${styles.container || ''}`;
      
      // Create header
      const header = document.createElement('div');
      header.className = `modal-header ${styles.header || ''}`;
      
      const titleElement = document.createElement('h2');
      titleElement.className = `modal-title ${styles.title || ''}`;
      titleElement.innerHTML = icon ? `<i class="fas ${icon}"></i>${title}` : title;
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'universal-close-btn';
      closeBtn.innerHTML = '×';
      closeBtn.setAttribute('aria-label', 'Close modal');
      closeBtn.onclick = () => this.closeModal(id);
      
      header.appendChild(titleElement);
      header.appendChild(closeBtn);
      
      // Create content area
      const contentArea = document.createElement('div');
      contentArea.className = `modal-content ${styles.content || ''}`;
      
      // Handle different content types
      if (typeof content === 'string') {
        contentArea.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        contentArea.appendChild(content);
      } else if (typeof content === 'function') {
        const renderedContent = content();
        if (renderedContent instanceof HTMLElement) {
          contentArea.appendChild(renderedContent);
        } else {
          contentArea.innerHTML = renderedContent;
        }
      }
      
      // Assemble modal
      modal.appendChild(header);
      modal.appendChild(contentArea);
      
      // Add to DOM
      document.body.appendChild(modal);

      // Ensure visibility for unified town hall modals hidden by default CSS
      // Modals are hidden unless `.show` is present, so add it on create
      try { modal.classList.add('show'); } catch (_) {}
      
      // Store per-modal options
      this.modalOptions.set(id, { backdropClose });

      // Register modal
      this.registerModal(id, modal, onClose);
      
      // Trigger open callback
      if (onOpen && typeof onOpen === 'function') {
        onOpen(modal);
      }
      
      // Add to stack
      this.modalStack.push(id);
      
      console.log(`🎯 Modal '${id}' created and opened`);
      return modal;
    }

    /**
     * Register a modal with the manager
     * @param {string} id - Modal ID
     * @param {HTMLElement} element - Modal element
     * @param {Function} onClose - Close callback
     */
    registerModal(id, element, onClose) {
      this.activeModals.add(id);
      
      // Prevent body scroll when first modal opens
      if (this.activeModals.size === 1) {
        this.preventBodyScroll();
      }
      
      // Store close callback
      element._onClose = onClose;
      
      // Add close method to element
      element.close = () => this.closeModal(id);
    }

    /**
     * Close a specific modal
     * @param {string} id - Modal ID to close
     */
    closeModal(id) {
      const modal = document.getElementById(id);
      if (!modal) {
        console.warn(`Modal with ID '${id}' not found`);
        return;
      }

      // Remove from active modals
      this.activeModals.delete(id);
      
      // Remove from stack
      const stackIndex = this.modalStack.indexOf(id);
      if (stackIndex > -1) {
        this.modalStack.splice(stackIndex, 1);
      }
      // Remove stored options
      this.modalOptions.delete(id);
      
      // Trigger close callback
      if (modal._onClose && typeof modal._onClose === 'function') {
        modal._onClose(modal);
      }
      
      // Add closing animation class
      modal.classList.add('closing');
      
      // Remove modal after animation
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        
        // Restore body scroll if no more modals are open
        if (this.activeModals.size === 0) {
          this.restoreBodyScroll();
        }
      }, 300);
      
      console.log(`🎯 Modal '${id}' closed`);
    }

    /**
     * Close the topmost modal
     */
    closeTopModal() {
      if (this.modalStack.length > 0) {
        const topModalId = this.modalStack[this.modalStack.length - 1];
        this.closeModal(topModalId);
      }
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
      const modalIds = Array.from(this.activeModals);
      modalIds.forEach(id => this.closeModal(id));
    }

    /**
     * Check if a modal is open
     * @param {string} id - Modal ID to check
     * @returns {boolean} True if modal is open
     */
    isModalOpen(id) {
      return this.activeModals.has(id);
    }

    /**
     * Get the number of open modals
     * @returns {number} Number of open modals
     */
    getOpenModalCount() {
      return this.activeModals.size;
    }

    /**
     * Get modal element by ID
     * @param {string} id - Modal ID
     * @returns {HTMLElement|null} Modal element or null
     */
    getModal(id) {
      return document.getElementById(id);
    }

    /**
     * Update modal content
     * @param {string} id - Modal ID
     * @param {string|HTMLElement} content - New content
     */
    updateModalContent(id, content) {
      const modal = this.getModal(id);
      if (!modal) return;
      
      const contentArea = modal.querySelector('.modal-content');
      if (!contentArea) return;
      
      // Clear existing content
      contentArea.innerHTML = '';
      
      // Add new content
      if (typeof content === 'string') {
        contentArea.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        contentArea.appendChild(content);
      }
      
      console.log(`🎯 Modal '${id}' content updated`);
    }

    /**
     * Update modal title
     * @param {string} id - Modal ID
     * @param {string} title - New title
     * @param {string} icon - New icon class (optional)
     */
    updateModalTitle(id, title, icon = null) {
      const modal = this.getModal(id);
      if (!modal) return;
      
      const titleElement = modal.querySelector('.modal-title');
      if (!titleElement) return;
      
      titleElement.innerHTML = icon ? `<i class="fas ${icon}"></i>${title}` : title;
      
      console.log(`🎯 Modal '${id}' title updated to '${title}'`);
    }

    /**
     * Add custom styles to a modal
     * @param {string} id - Modal ID
     * @param {Object} styles - CSS classes to add
     */
    addModalStyles(id, styles) {
      const modal = this.getModal(id);
      if (!modal) return;
      
      Object.entries(styles).forEach(([element, classes]) => {
        const target = modal.querySelector(`.${element}`);
        if (target && classes) {
          target.classList.add(...classes.split(' '));
        }
      });
    }

    /**
     * Destroy the modal manager and clean up
     */
    destroy() {
      this.closeAllModals();
      this.activeModals.clear();
      this.modalStack = [];
      this.isInitialized = false;
      
      console.log('🎯 ModalManager destroyed');
    }
  }

  // Create global instance
  window.ModalManager = new ModalManager();

  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
  }
}