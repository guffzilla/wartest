/**
 * Avatar Manager - Handles user avatar selection and preferences
 */
export class AvatarManager {
  constructor() {
    this.currentSelection = null;
    this.avatarOptions = null;
    this.modal = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the Avatar Manager
   */
  async init() {
    if (this.isInitialized) {
          return;}


    
    this.modal = document.getElementById('avatar-selection-modal');
    if (!this.modal) {
      console.error('❌ Avatar selection modal not found');
      return;}

    this.setupEventListeners();
    await this.loadAvatarOptions();
    
    this.isInitialized = true;
    
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const closeModalBtn = document.getElementById('close-avatar-modal');
    const saveBtn = document.getElementById('save-avatar-selection');
    const cancelBtn = document.getElementById('cancel-avatar-selection');

    if (changeAvatarBtn) {
      changeAvatarBtn.addEventListener('click', () => this.showAvatarModal());
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.hideAvatarModal());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveAvatarSelection());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideAvatarModal());
    }

    // Close modal when clicking outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideAvatarModal();
      }
    });

    // Setup avatar option click handlers
    this.setupAvatarOptionHandlers();
  }

  /**
   * Setup click handlers for avatar options
   */
  setupAvatarOptionHandlers() {
    const avatarOptions = this.modal.querySelectorAll('.avatar-option');
    
    avatarOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Don't allow selection of unavailable or locked options
        if (option.classList.contains('unavailable') || option.classList.contains('locked')) {
          return;}

        // Remove selected class from all options
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        
        // Add selected class to clicked option
        option.classList.add('selected');
        
        // Store current selection
        const type = option.dataset.type;
        const customImage = option.dataset.image || null;
        
        this.currentSelection = {
          type: type,
          customImage: customImage
        };
        
    
      });
    });
  }

  /**
   * Load available avatar options from server
   */
  async loadAvatarOptions() {
    try {
  
      
      const response = await fetch('/api/me/avatar-options', {
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.avatarOptions = await response.json();
      
      
      this.updateModalWithOptions();
      
    } catch (error) {
      console.error('❌ Failed to load avatar options:', error);
      this.showError('Failed to load avatar options');
    }
  }

  /**
   * Update modal with current avatar options
   */
  updateModalWithOptions() {
    if (!this.avatarOptions) return;const { currentPreferences, options } = this.avatarOptions;

    // Update highest rank option
    const highestRankOption = document.getElementById('highest-rank-option');
    const rankPreview = document.getElementById('highest-rank-preview');
    const rankDescription = document.getElementById('highest-rank-description');
    const rankUnavailable = document.getElementById('rank-unavailable');

    if (options.highestRank.available) {
      highestRankOption.classList.remove('unavailable');
      rankPreview.src = options.highestRank.path;
      rankDescription.textContent = options.highestRank.description;
      rankUnavailable.style.display = 'none';
    } else {
      highestRankOption.classList.add('unavailable');
      rankPreview.src = '/assets/img/ranks/emblem.png';
      rankDescription.textContent = options.highestRank.description;
      rankUnavailable.style.display = 'block';
    }

    // Set current selection based on user preferences
    this.setCurrentSelection(currentPreferences);
  }

  /**
   * Set current selection in modal
   */
  setCurrentSelection(preferences) {
    const avatarOptions = this.modal.querySelectorAll('.avatar-option');
    
    // Remove all selected classes
    avatarOptions.forEach(opt => opt.classList.remove('selected'));
    
    // Find and select the appropriate option
    let selectedOption = null;
    
    if (preferences.type === 'custom' && preferences.customImage) {
      selectedOption = this.modal.querySelector(`[data-type="custom"][data-image="${preferences.customImage}"]`);
    } else {
      selectedOption = this.modal.querySelector(`[data-type="${preferences.type}"]`);
    }
    
    if (selectedOption && !selectedOption.classList.contains('unavailable')) {
      selectedOption.classList.add('selected');
      this.currentSelection = {
        type: preferences.type,
        customImage: preferences.customImage
      };
    } else {
      // Default to default option if current preference is unavailable
      const defaultOption = this.modal.querySelector('[data-type="default"]');
      if (defaultOption) {
        defaultOption.classList.add('selected');
        this.currentSelection = { type: 'default', customImage: null };
      }
    }
  }

  /**
   * Show avatar selection modal
   */
  async showAvatarModal() {
    
    
    // Reload options to get latest data
    await this.loadAvatarOptions();
    
    this.modal.style.display = 'block';
    setTimeout(() => {
      this.modal.classList.add('show');
    }, 10);
  }

  /**
   * Hide avatar selection modal
   */
  hideAvatarModal() {
    
    
    this.modal.classList.remove('show');
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  /**
   * Save avatar selection
   */
  async saveAvatarSelection() {
    if (!this.currentSelection) {
      this.showError('Please select an avatar');
      return;}

    try {

      
      const response = await fetch('/api/me/avatar-preferences', {
        method: 'PUT',
        headers: window.getAuthHeaders ? {
          ...window.getAuthHeaders(),
          'Content-Type': 'application/json'
        } : {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(this.currentSelection)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      
      // Update the avatar in the UI
      this.updateUIAvatar(result.avatar);
      
      // Show success message
      this.showSuccess('Avatar updated successfully!');
      
      // Close modal
      this.hideAvatarModal();
      
    } catch (error) {
      console.error('❌ Failed to save avatar:', error);
      this.showError(`Failed to save avatar: ${error.message}`);
    }
  }

  /**
   * Update avatar in the UI
   */
  updateUIAvatar(avatarUrl) {
    
    
    // Update profile avatar
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) {
      profileAvatar.innerHTML = `
        <img src="${avatarUrl}" 
             alt="User Avatar" 
             style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
             onerror="this.src='/assets/img/ranks/emblem.png'">
        <div class="profile-status online" aria-label="Online status"></div>
      `;
    }

    // Navbar avatars are updated by updateNavbarProfile() - no need for duplicate calls
    // Removed redundant AvatarUtils.updateAllAvatarInstances() call

    // Update current user data
    if (window.currentUser) {
      window.currentUser.avatar = avatarUrl;
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const existingSuccess = this.modal.querySelector('.avatar-update-success');
    if (existingSuccess) {
      existingSuccess.remove();
    }

    const successDiv = document.createElement('div');
    successDiv.className = 'avatar-update-success';
    successDiv.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;

    const modalBody = this.modal.querySelector('.modal-body');
    modalBody.insertBefore(successDiv, modalBody.firstChild);

    // Remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 3000);
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('🎨 Avatar Manager Error:', message);
    
    // Try to use the notification system if available
    if (window.showNotification) {
      window.showNotification(message, 'error');
    } else if (window.showErrorToast) {
      window.showErrorToast(message);
    } else {
      // Create a temporary error message in the modal instead of using alert()
      const existingError = this.modal.querySelector('.avatar-update-error');
      if (existingError) {
        existingError.remove();
      }

      const errorDiv = document.createElement('div');
      errorDiv.className = 'avatar-update-error';
      errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
      `;
      errorDiv.style.cssText = `
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.3);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        color: #dc3545;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
      `;

      const modalBody = this.modal.querySelector('.modal-body');
      if (modalBody) {
        modalBody.insertBefore(errorDiv, modalBody.firstChild);

        // Remove after 5 seconds
        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.remove();
          }
        }, 5000);
      }
    }
  }

  /**
   * Get current avatar options (for debugging)
   */
  getAvatarOptions() {
    return this.avatarOptions;}

  /**
   * Refresh avatar options
   */
  async refreshAvatarOptions() {
    await this.loadAvatarOptions();
  }
}

// Export singleton instance
export const avatarManager = new AvatarManager(); 