/**
 * PlayerModalCore.js - Core Modal Management for Player Details
 * 
 * Extracted from the 72KB playerDetails.js monster.
 * Handles the core modal creation, management, and basic functionality.
 * 
 * Responsibilities:
 * - Modal creation and lifecycle management
 * - Global utility functions (loading, error, screenshot modals)
 * - Modal event handling and cleanup
 * - Integration with other player modal modules
 */

export class PlayerModalCore {
  constructor() {
    this.activeModals = new Map();
    this.modalEventListeners = new Map();
    this.loadingStates = new Set();
  }

  /**
   * Initialize the player modal core system
   */
  init() {
    console.log('🏗️ Initializing Player Modal Core...');
    this.setupGlobalFunctions();
    this.setupModalStyles();
    console.log('✅ Player Modal Core initialized');
  }

  /**
   * Setup global functions for backward compatibility
   */
  setupGlobalFunctions() {
    // Global modal utility functions
    window.showLoadingModal = (message) => this.showLoadingModal(message);
    window.hideLoadingModal = () => this.hideLoadingModal();
    window.showErrorModal = (message) => this.showErrorModal(message);
    window.viewScreenshots = (screenshots) => this.viewScreenshots(screenshots);
    window.disputeMatch = (matchId) => this.disputeMatch(matchId);
    window.flagScreenshot = (screenshotUrl, screenshotId) => this.flagScreenshot(screenshotUrl, screenshotId);
    window.closePlayerDetailsModal = () => this.closePlayerDetailsModal();

    console.log('📋 Global modal functions registered');
  }

  /**
   * Show loading modal with message
   */
  showLoadingModal(message) {
    // Check if LoadingManager exists, fallback to our own implementation
    if (typeof window.LoadingManager !== 'undefined') {
      window.LoadingManager.showOverlay(message);
    } else {
      this.createLoadingModal(message);
    }
    this.loadingStates.add('global');
  }

  /**
   * Hide loading modal
   */
  hideLoadingModal() {
    if (typeof window.LoadingManager !== 'undefined') {
      window.LoadingManager.hideOverlay();
    } else {
      this.removeLoadingModal();
    }
    this.loadingStates.delete('global');
  }

  /**
   * Show error modal with message
   */
  showErrorModal(message) {
    if (typeof window.NotificationUtils !== 'undefined') {
      window.NotificationUtils.error(message, 8000);
    } else {
      this.createErrorModal(message);
    }
  }

  /**
   * Create our own loading modal implementation
   */
  createLoadingModal(message) {
    const existingModal = document.getElementById('player-loading-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'player-loading-modal';
    modal.className = 'modal-overlay active loading-modal';
    modal.innerHTML = `
      <div class="modal-content loading-content">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <div class="loading-message">${message || 'Loading...'}</div>
      </div>
    `;

    document.body.appendChild(modal);
    this.activeModals.set('loading', modal);
  }

  /**
   * Remove loading modal
   */
  removeLoadingModal() {
    const modal = document.getElementById('player-loading-modal');
    if (modal) {
      modal.remove();
      this.activeModals.delete('loading');
    }
  }

  /**
   * Create error modal
   */
  createErrorModal(message) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active error-modal';
    modal.innerHTML = `
      <div class="modal-content error-content">
        <span class="close-modal">&times;</span>
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="error-message">${message}</div>
        <button class="btn btn-primary close-error-btn">OK</button>
      </div>
    `;

    // Setup close handlers
    const closeBtn = modal.querySelector('.close-modal');
    const okBtn = modal.querySelector('.close-error-btn');
    
    const closeHandler = () => {
      modal.remove();
      this.activeModals.delete('error');
    };

    closeBtn.addEventListener('click', closeHandler);
    okBtn.addEventListener('click', closeHandler);

    document.body.appendChild(modal);
    this.activeModals.set('error', modal);
  }

  /**
   * View screenshots modal
   */
  viewScreenshots(screenshots) {
    // Remove any existing screenshot modal
    const existingModal = document.getElementById('screenshot-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'screenshot-modal';
    modal.className = 'modal-overlay active';

    let modalContent = `
      <div class="modal-content screenshot-modal-content">
        <span class="close-modal">&times;</span>
        <h2>Match Screenshots</h2>
        <div class="screenshot-container">
    `;

    // Add screenshots
    if (screenshots && screenshots.length > 0) {
      screenshots.forEach((screenshot, index) => {
        modalContent += `
          <div class="screenshot-item" id="screenshot-${index}">
            <img src="${screenshot.url}" alt="Match Screenshot" loading="lazy">
            <div class="screenshot-actions">
              <button class="btn btn-danger flag-screenshot" 
                      data-screenshot-url="${screenshot.url}" 
                      data-screenshot-id="${screenshot._id || ''}">
                <i class="fas fa-flag"></i> Flag Inappropriate Content
              </button>
            </div>
          </div>
        `;
      });
    } else {
      modalContent += '<div class="no-data">No screenshots available for this match.</div>';
    }

    modalContent += `
        </div>
      </div>
    `;

    modal.innerHTML = modalContent;
    document.body.appendChild(modal);

    // Setup event listeners
    this.setupScreenshotModalEvents(modal);
    this.activeModals.set('screenshots', modal);
  }

  /**
   * Setup screenshot modal event listeners
   */
  setupScreenshotModalEvents(modal) {
    // Close button
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
      this.closeModal('screenshots');
    });

    // Flag buttons
    const flagButtons = modal.querySelectorAll('.flag-screenshot');
    flagButtons.forEach(button => {
      button.addEventListener('click', () => {
        const screenshotUrl = button.dataset.screenshotUrl;
        const screenshotId = button.dataset.screenshotId;
        this.flagScreenshot(screenshotUrl, screenshotId);
      });
    });

    // Click outside to close
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        this.closeModal('screenshots');
      }
    });

    // Store event listeners for cleanup
    this.modalEventListeners.set('screenshots', {
      closeBtn,
      flagButtons: Array.from(flagButtons),
      modal
    });
  }

  /**
   * Flag screenshot functionality
   */
  async flagScreenshot(screenshotUrl, screenshotId) {
    try {
      const response = await fetch('/api/flag-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          screenshotUrl,
          screenshotId,
          reason: 'Inappropriate content flagged by user'
        })
      });

      if (response.ok) {
        this.showSuccessMessage('Screenshot flagged successfully. Thank you for helping maintain community standards.');
      } else {
        throw new Error('Failed to flag screenshot');
      }
    } catch (error) {
      console.error('Error flagging screenshot:', error);
      this.showErrorModal('Failed to flag screenshot. Please try again later.');
    }
  }

  /**
   * Dispute match modal
   */
  async disputeMatch(matchId) {
    try {
      // Remove any existing dispute modal first
      const existingDisputeModal = document.getElementById('dispute-modal');
      if (existingDisputeModal) {
        existingDisputeModal.remove();
      }

      const modal = document.createElement('div');
      modal.className = 'modal-overlay active';
      modal.id = 'dispute-modal';

      modal.innerHTML = `
        <div class="modal-content dispute-modal-content">
          <span class="close-modal">&times;</span>
          <h2>Dispute Match</h2>
          <p>Please provide a reason for disputing this match:</p>
          <form id="dispute-form" enctype="multipart/form-data">
            <div class="form-group">
              <label for="player-name">Your Player Name:</label>
              <input type="text" id="player-name" name="playerName" required 
                     placeholder="Enter your player name">
            </div>
            <div class="form-group">
              <label for="dispute-reason">Reason:</label>
              <textarea id="dispute-reason" name="reason" rows="4" required 
                        placeholder="Explain why this match result is incorrect..."></textarea>
            </div>
            <div class="form-group">
              <label for="dispute-evidence">Evidence Screenshots (optional):</label>
              <input type="file" id="dispute-evidence" name="evidence" 
                     accept="image/*" multiple>
              <small>Upload screenshots as evidence to support your claim</small>
            </div>
            <input type="hidden" name="matchId" value="${matchId}">
            <div class="form-actions">
              <button type="button" class="btn btn-secondary close-dispute-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit Dispute</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);
      this.setupDisputeModalEvents(modal);
      this.activeModals.set('dispute', modal);

    } catch (error) {
      console.error('Error creating dispute modal:', error);
      this.showErrorModal('Error creating dispute form. Please try again later.');
    }
  }

  /**
   * Setup dispute modal event listeners
   */
  setupDisputeModalEvents(modal) {
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('.close-dispute-btn');
    const form = modal.querySelector('#dispute-form');

    const closeHandler = () => {
      this.closeModal('dispute');
    };

    closeBtn.addEventListener('click', closeHandler);
    cancelBtn.addEventListener('click', closeHandler);

    // Form submission
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.handleDisputeSubmission(form);
    });

    this.modalEventListeners.set('dispute', {
      closeBtn,
      cancelBtn,
      form,
      modal
    });
  }

  /**
   * Handle dispute form submission
   */
  async handleDisputeSubmission(form) {
    const formData = new FormData(form);

    if (!formData.get('playerName') || !formData.get('reason')) {
      this.showErrorModal('Please provide your player name and a reason for the dispute.');
      return;}

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      // Submit dispute to API
      const response = await fetch('/api/ladder/dispute-match', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit dispute');
      }

      // Show success and close modal
      this.showSuccessMessage('Dispute submitted successfully. An admin will review your request.');
      this.closeModal('dispute');

    } catch (error) {
      console.error('Error submitting dispute:', error);
      this.showErrorModal(`Error submitting dispute: ${error.message}`);

      // Re-enable submit button
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Dispute';
    }
  }

  /**
   * Close specific modal by key
   */
  closeModal(modalKey) {
    const modal = this.activeModals.get(modalKey);
    if (modal) {
      // Cleanup event listeners
      const listeners = this.modalEventListeners.get(modalKey);
      if (listeners) {
        // Remove event listeners to prevent memory leaks
        this.modalEventListeners.delete(modalKey);
      }

      modal.remove();
      this.activeModals.delete(modalKey);
    }
  }

  /**
   * Close player details modal specifically
   */
  closePlayerDetailsModal() {
    const modal = document.getElementById('player-details-modal');
    if (modal) {
      // Notify chart cleanup if available
      if (window.playerStatsCharts && typeof window.playerStatsCharts.cleanup === 'function') {
        window.playerStatsCharts.cleanup();
      }
      
      modal.remove();
      this.activeModals.delete('player-details');
    }

    // Ensure all loading states are cleared
    this.hideLoadingModal();

    // Clear any remaining loading modals
    const loadingModals = document.querySelectorAll('.modal.loading-modal, .loading-overlay');
    loadingModals.forEach(loadingModal => {
      if (loadingModal.parentNode) {
        loadingModal.parentNode.removeChild(loadingModal);
      }
    });

    console.log('🗑️ Player details modal closed and cleaned up');
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Setup modal styles
   */
  setupModalStyles() {
    if (document.getElementById('player-modal-styles')) return;const styles = document.createElement('style');
    styles.id = 'player-modal-styles';
    styles.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .modal-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      .modal-content {
        background: #1e293b;
        border-radius: 12px;
        padding: 30px;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        color: #f1f5f9;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      }

      .close-modal {
        position: absolute;
        top: 15px;
        right: 20px;
        font-size: 28px;
        cursor: pointer;
        color: #94a3b8;
        transition: color 0.3s ease;
      }

      .close-modal:hover {
        color: #f1f5f9;
      }

      .loading-content {
        text-align: center;
        padding: 40px;
      }

      .loading-spinner i {
        font-size: 48px;
        color: #D4AF37;
        margin-bottom: 20px;
      }

      .loading-message {
        font-size: 18px;
        color: #e2e8f0;
      }

      .error-content {
        text-align: center;
        padding: 40px;
      }

      .error-icon i {
        font-size: 48px;
        color: #ef4444;
        margin-bottom: 20px;
      }

      .error-message {
        font-size: 16px;
        margin-bottom: 30px;
        color: #e2e8f0;
      }

      .screenshot-modal-content {
        max-width: 1200px;
      }

      .screenshot-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }

      .screenshot-item {
        background: #334155;
        border-radius: 8px;
        overflow: hidden;
      }

      .screenshot-item img {
        width: 100%;
        height: 200px;
        object-fit: cover;
      }

      .screenshot-actions {
        padding: 15px;
      }

      .dispute-modal-content {
        max-width: 600px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        margin-bottom: 8px;
        color: #f1f5f9;
        font-weight: 500;
      }

      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #475569;
        border-radius: 6px;
        background: #334155;
        color: #f1f5f9;
        font-size: 14px;
      }

      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #D4AF37;
      }

      .form-group small {
        display: block;
        margin-top: 5px;
        color: #94a3b8;
        font-size: 12px;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 30px;
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
      }

      .btn-primary {
        background: #D4AF37;
        color: #0f172a;
      }

      .btn-primary:hover {
        background: #E8C547;
      }

      .btn-secondary {
        background: #475569;
        color: #f1f5f9;
      }

      .btn-secondary:hover {
        background: #64748b;
      }

      .btn-danger {
        background: #ef4444;
        color: white;
      }

      .btn-danger:hover {
        background: #dc2626;
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .success-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10001;
        animation: slideInRight 0.3s ease;
      }

      .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .no-data {
        text-align: center;
        padding: 40px;
        color: #94a3b8;
        font-style: italic;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Cleanup all modals and event listeners
   */
  cleanup() {
    console.log('🧹 Cleaning up Player Modal Core...');
    
    // Close all active modals
    for (const [key] of this.activeModals) {
      this.closeModal(key);
    }

    // Clear all states
    this.activeModals.clear();
    this.modalEventListeners.clear();
    this.loadingStates.clear();

    console.log('✅ Player Modal Core cleanup complete');
  }
}

// Create and export singleton instance
export const playerModalCore = new PlayerModalCore(); 