/**
 * UNIVERSAL MODAL MIGRATOR
 * Automatically migrates all existing modals on the site to use the new Universal Modal System
 * This ensures backward compatibility while providing the new full-screen experience
 */

class UniversalModalMigrator {
  constructor() {
    this.isInitialized = false;
    this.migratedModals = new Set();
    this.init();
  }

  /**
   * Initialize the migrator
   */
  init() {
    if (this.isInitialized) return;this.waitForModalManager();
    this.isInitialized = true;
    
    console.log('🎯 UniversalModalMigrator initialized');
  }

  /**
   * Wait for ModalManager to be available
   * @returns {Promise} Promise that resolves when ModalManager is ready
   */
  waitForModalManager() {
    return new Promise((resolve, reject) => {
      const checkModalManager = () => {
        if (window.ModalManager) {
          console.log('🎯 ModalManager found, resolving promise...');resolve();
        } else {
          setTimeout(checkModalManager, 100);
        }
      };
      checkModalManager();
    });
  }

  /**
   * Start the migration process
   */
  startMigration() {
    console.log('🚀 Starting Universal Modal Migration...');
    
    // Wait for page to fully load
    setTimeout(() => {
      this.waitForModalManager().then(() => {
        console.log('✅ ModalManager ready, proceeding with migration...');
        
        // Wait a bit more for all modal functions to be defined
        setTimeout(() => {
          this.migrateExistingModals();
          this.migrateModalFunctions();
          this.setupModalInterceptors();
          this.cleanupOldModals();
          
          this.isInitialized = true;
          console.log('🎉 Universal Modal Migration completed successfully!');
          
          // Log migration status
          const status = this.getMigrationStatus();
          console.log('📊 Migration Status:', status);
        }, 500);
      }).catch(error => {
        console.error('❌ Failed to initialize ModalManager:', error);
        // Still try to migrate modal functions with fallbacks
        setTimeout(() => {
          this.migrateModalFunctions();
          console.log('⚠️ Modal functions migrated with fallbacks');
        }, 1000);
      });
    }, 1000);
  }

  /**
   * Check if migration should be skipped on this page
   */
  shouldSkipMigration() {
    // Skip on pages with many static modals that shouldn't be migrated
    const currentPath = window.location.pathname;
    
    // Pages that should skip migration
    const skipPages = [
      '/views/atlas.html',
      '/atlas.html',
      '/campaigns.html',
      '/views/campaigns.html'
    ];
    
    const shouldSkip = skipPages.some(page => currentPath.includes(page));
    console.log(`🔍 Migration check for path: ${currentPath}, should skip: ${shouldSkip}`);
    
    return shouldSkip;}

  /**
   * Migrate existing modals in the DOM
   */
  migrateExistingModals() {
    console.log('🔍 Searching for modals to migrate...');
    
    const modals = document.querySelectorAll('.modal');
    console.log(`🔍 Found ${modals.length} modals in DOM`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    modals.forEach((modal, index) => {
      console.log(`🔍 Checking modal ${index + 1}:`, {
        id: modal.id,
        classes: modal.className,
        hasDataStatic: modal.hasAttribute('data-static'),
        isVisible: modal.style.display !== 'none'
      });
      
      if (this.shouldMigrateModal(modal)) {
        console.log(`✅ Migrating modal: ${modal.id || 'unnamed'}`);
        this.migrateModal(modal);
        migratedCount++;
      } else {
        console.log(`⏭️ Skipping modal: ${modal.id || 'unnamed'} (static or already migrated)`);
        skippedCount++;
      }
    });
    
    console.log(`📊 Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
  }

  /**
   * Check if a modal should be migrated
   */
  shouldMigrateModal(modal) {
    // Skip if it's already a universal modal
    if (modal.classList.contains('universal-modal')) return false;if (modal.classList.contains('loading-modal') || modal.classList.contains('temp-modal')) return false;if (modal.hasAttribute('data-static')) return false;const staticModalIds = [
      'upload-map-modal',
      'map-details-modal',
      'player-stats-modal',
      'match-details-modal',
      'loading-modal',
      'error-modal'
    ];
    
    if (modal.id && staticModalIds.includes(modal.id)) return false;if (modal.classList.contains('static-modal') || modal.classList.contains('html-modal')) return false;return true;}

  /**
   * Migrate a single modal to the universal system
   */
  migrateModal(modal) {
    try {
      const modalId = modal.id || `migrated-modal-${Date.now()}`;
      const title = this.extractModalTitle(modal);
      const content = this.extractModalContent(modal);
      
      // Create new universal modal
      window.ModalManager.createModal({
        id: modalId,
        title: title || 'Modal',
        icon: 'fa-window-maximize',
        content: () => {
          const container = document.createElement('div');
          container.innerHTML = content;
          return container;},
        styles: {
          container: 'migrated-modal',
          header: 'migrated-header',
          title: 'migrated-title',
          content: 'migrated-content'
        },
        onOpen: (newModal) => {
          console.log(`🎯 Migrated modal ${modalId} opened`);
        },
        onClose: (newModal) => {
          console.log(`🎯 Migrated modal ${modalId} closed`);
        }
      });
      
      // Mark as migrated
      this.migratedModals.add(modal);
      
      // Hide the old modal
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      
      console.log(`✅ Modal ${modalId} migrated to universal system`);
      
    } catch (error) {
      console.error(`❌ Failed to migrate modal:`, error);
    }
  }

  /**
   * Extract modal title from existing modal
   */
  extractModalTitle(modal) {
    // Try to find title in various locations
    const titleSelectors = [
      '.modal-title',
      '.modal-header h1',
      '.modal-header h2',
      '.modal-header h3',
      '.modal-title-area h2',
      'h1',
      'h2',
      'h3'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = modal.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();}
    }
    
    return 'Modal';}

  /**
   * Extract modal content from existing modal
   */
  extractModalContent(modal) {
    // Try to find content in various locations
    const contentSelectors = [
      '.modal-body',
      '.modal-content',
      '.modal-body .content',
      '.content'
    ];
    
    for (const selector of contentSelectors) {
      const contentElement = modal.querySelector(selector);
      if (contentElement) {
        return contentElement.innerHTML;}
    }
    
    // Fallback: use the entire modal content
    return modal.innerHTML;}

  /**
   * Set up interceptors for new modals
   */
  setupModalInterceptors() {
    // Intercept document.createElement for modals
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, options) {
      const element = originalCreateElement.call(this, tagName, options);
      
      if (tagName.toLowerCase() === 'div') {
        // Monitor for modal classes being added
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function(name, value) {
          originalSetAttribute.call(this, name, value);
          
          if (name === 'class' && value.includes('modal')) {
            setTimeout(() => {
              if (this.shouldMigrateModal && this.shouldMigrateModal(element)) {
                this.migrateModal(element);
              }
            }, 100);
          }
        };
      }
      
      return element;};
    
    // Intercept innerHTML assignments
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value) {
        originalInnerHTML.set.call(this, value);
        
        // Check if this element is now a modal
        if (value.includes('modal') && this.shouldMigrateModal && this.shouldMigrateModal(this)) {
          setTimeout(() => {
            this.migrateModal(this);
          }, 100);
        }
      },
      get: originalInnerHTML.get
    });
  }

  /**
   * Migrate common modal functions
   */
  migrateModalFunctions() {
    console.log('🔄 Starting modal function migration...');
    
    // Migrate showLoadingModal
    if (!window.showLoadingModal._migrated) {
      const originalShowLoading = window.showLoadingModal;
      window.showLoadingModal = function(message) {
        console.log('📦 showLoadingModal called with:', message);
        
        if (!window.ModalManager) {
          console.warn('⚠️ ModalManager not available, using fallback');
          // Fallback to original function if available
          if (originalShowLoading && originalShowLoading !== window.showLoadingModal) {
            return originalShowLoading(message);}
          // Create simple loading modal
          const modal = document.createElement('div');
          modal.id = 'fallback-loading-modal';
          modal.className = 'modal show';
          modal.innerHTML = `
            <div class="modal-content">
              <div class="modal-body">
                <div style="text-align: center; padding: 2rem;">
                  <div class="spinner" style="margin: 0 auto 1rem; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                  <p>${message}</p>
                </div>
              </div>
            </div>
            <style>
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          `;
          document.body.appendChild(modal);
          return modal;}
        
        try {
          return window.ModalManager.createModal({
            id: 'loading-modal',
            title: 'Loading...',
            icon: 'fa-spinner fa-spin',
            content: () => {
              const container = document.createElement('div');container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                  <i class="fas fa-spinner fa-spin fa-3x" style="color: #D4AF37; margin-bottom: 1rem;"></i>
                  <p style="font-size: 1.2rem; color: #ffffff;">${message}</p>
                </div>
              `;
              return container;},
            styles: {
              container: 'loading-modal',
              header: 'loading-header',
              title: 'loading-title',
              content: 'loading-content'
            }
          });
        } catch (error) {
          console.error('❌ Error creating loading modal with ModalManager:', error);
          // Fallback to original function
          if (originalShowLoading && originalShowLoading !== window.showLoadingModal) {
            return originalShowLoading(message);}
          return null;}
      };
      window.showLoadingModal._migrated = true;
      console.log('✅ showLoadingModal migrated');
    }

    // Migrate hideLoadingModal
    if (!window.hideLoadingModal._migrated) {
      const originalHideLoading = window.hideLoadingModal;
      window.hideLoadingModal = function() {
        console.log('📦 hideLoadingModal called');
        
        if (!window.ModalManager) {
          console.warn('⚠️ ModalManager not available, using fallback');
          // Fallback to original function if available
          if (originalHideLoading && originalHideLoading !== window.hideLoadingModal) {
            return originalHideLoading();}
          // Remove fallback loading modal
          const modal = document.getElementById('fallback-loading-modal');
          if (modal) modal.remove();
          return;}
        
        try {
          window.ModalManager.closeModal('loading-modal');
        } catch (error) {
          console.error('❌ Error closing loading modal with ModalManager:', error);
          // Fallback to original function
          if (originalHideLoading && originalHideLoading !== window.hideLoadingModal) {
            return originalHideLoading();}
        }
      };
      window.hideLoadingModal._migrated = true;
      console.log('✅ hideLoadingModal migrated');
    }

    // Migrate showErrorModal
    if (!window.showErrorModal._migrated) {
      const originalShowError = window.showErrorModal;
      window.showErrorModal = function(message, title = 'Error') {
        console.log('❌ showErrorModal called with:', message, title);
        
        if (!window.ModalManager) {
          console.warn('⚠️ ModalManager not available, using fallback');
          // Fallback to original function if available
          if (originalShowError && originalShowError !== window.showErrorModal) {
            return originalShowError(message, title);}
          // Create simple error modal
          const modal = document.createElement('div');
          modal.id = 'fallback-error-modal';
          modal.className = 'modal show';
          modal.innerHTML = `
            <div class="modal-content">
              <div class="modal-header">
                <h2>${title}</h2>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
              </div>
              <div class="modal-body">
                <p style="color: #e74c3c;">${message}</p>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          return modal;}
        
        try {
          return window.ModalManager.createModal({
            id: 'error-modal',
            title: title,
            icon: 'fa-exclamation-triangle',
            content: () => {
              const container = document.createElement('div');container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                  <i class="fas fa-exclamation-triangle fa-3x" style="color: #ef4444; margin-bottom: 1rem;"></i>
                  <p style="font-size: 1.2rem; color: #ffffff;">${message}</p>
                  <button onclick="window.ModalManager.closeModal('error-modal')" 
                          style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Close
                  </button>
                </div>
              `;
              return container;},
            styles: {
              container: 'error-modal',
              header: 'error-header',
              title: 'error-title',
              content: 'error-content'
            }
          });
        } catch (error) {
          console.error('❌ Error creating error modal with ModalManager:', error);
          // Fallback to original function
          if (originalShowError && originalShowError !== window.showErrorModal) {
            return originalShowError(message, title);}
          return null;}
      };
      window.showErrorModal._migrated = true;
      console.log('✅ showErrorModal migrated');
    }
    
    console.log('🎯 Modal function migration completed');
  }

  /**
   * Get migration status
   */
  getMigrationStatus() {
    return {
      isInitialized: this.isInitialized,
      migratedModals: Array.from(this.migratedModals),
      totalMigrated: this.migratedModals.size
    };}

  /**
   * Force migration of a specific modal
   */
  forceMigrateModal(modalSelector) {
    const modal = document.querySelector(modalSelector);
    if (modal) {
      this.migrateModal(modal);
      return true;}
    return false;}

  /**
   * Clean up old modal elements
   */
  cleanupOldModals() {
    const oldModals = document.querySelectorAll('.modal:not(.universal-modal), .modal-overlay:not(.universal-modal)');
    
    oldModals.forEach(modal => {
      if (this.migratedModals.has(modal)) {
        modal.remove();
      }
    });
    
    console.log(`🧹 Cleaned up ${oldModals.length} old modal elements`);
  }
}

// Create global instance
window.UniversalModalMigrator = new UniversalModalMigrator();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalModalMigrator;
}
