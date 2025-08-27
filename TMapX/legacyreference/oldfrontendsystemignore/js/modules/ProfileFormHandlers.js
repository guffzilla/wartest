/**
 * ProfileFormHandlers.js - Centralized Form Management for Profile
 * 
 * Consolidates all scattered form handling functions from the 126KB monster.
 * 
 * Handles:
 * - Inline editing (username, bio, social links)
 * - Form validation and submission
 * - Player name management (add/remove)
 * - Content creator settings
 * - Bio and social link editing
 * - Form state management and error handling
 */

import { profileDataLoader } from './ProfileDataLoader.js';
import { profileUIManager } from './ProfileUIManager.js';

export class ProfileFormHandlers {
  constructor() {
    this.activeEditors = new Map();
    this.formStates = new Map();
    this.validationRules = new Map();
    this.autosaveTimers = new Map();
    this.originalValues = new Map();
  }

  /**
   * Initialize form handlers and event listeners
   */
  init() {
    console.log('📝 Initializing Profile Form Handlers...');
    this.setupValidationRules();
    this.setupGlobalEventListeners();
    this.setupInlineEditButtons();
    this.setupUsernameChangeForm();
    this.setupUsernameChangeButton();
    this.setupBioEditForm();
    this.setupContentCreatorEditButtons();
    this.setupAddPlayerButton();
    this.setupAddPlayerForm();
    this.setupFormAutoSave();
    console.log('✅ Profile Form Handlers initialized');
  }

  /**
   * Refresh username change button state (call after user data updates)
   */
  refreshUsernameChangeButton() {
    this.updateUsernameChangeButton();
  }

  /**
   * Setup validation rules for different form fields
   */
  setupValidationRules() {
    this.validationRules.set('username', {
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_-]+$/,
      errorMessages: {
        minLength: 'Username must be at least 3 characters',
        maxLength: 'Username cannot exceed 20 characters',
        pattern: 'Username can only contain letters, numbers, hyphens, and underscores'
      }
    });

    this.validationRules.set('bio', {
      maxLength: 500,
      errorMessages: {
        maxLength: 'Bio cannot exceed 500 characters'
      }
    });

    this.validationRules.set('playerName', {
      minLength: 1,
      maxLength: 15,
      pattern: /^[a-zA-Z0-9_\[\]]+$/,
      errorMessages: {
        minLength: 'Player name is required',
        maxLength: 'Player name cannot exceed 15 characters',
        pattern: 'Player name contains invalid characters'
      }
    });

    this.validationRules.set('socialLink', {
      pattern: /^https?:\/\/.+/,
      errorMessages: {
        pattern: 'Please enter a valid URL starting with http:// or https://'
      }
    });
  }

  /**
   * Setup global event listeners for form interactions
   */
  setupGlobalEventListeners() {
    // ESC key to cancel inline editing
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelAllInlineEditing();
      }
    });

    // Click outside to save inline edits
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.inline-edit-container')) {
        this.saveActiveInlineEdits();
      }
    });

    // Form submission prevention for AJAX forms
    document.addEventListener('submit', (e) => {
      if (e.target.classList.contains('ajax-form')) {
        e.preventDefault();
        this.handleFormSubmission(e.target);
      }
    });
  }

  /**
   * Setup inline edit buttons for profile fields
   */
  setupInlineEditButtons() {
    const editableFields = [
      { selector: '#username-display', field: 'username', type: 'text' },
      // { selector: '#bio-text', field: 'bio', type: 'textarea' }, // REMOVED - bio has dedicated edit button
      { selector: '#twitch-link-display', field: 'twitchLink', type: 'url' },
      { selector: '#youtube-link-display', field: 'youtubeLink', type: 'url' },
      { selector: '#discord-link-display', field: 'discordLink', type: 'url' }
    ];

    editableFields.forEach(({ selector, field, type }) => {
      const element = document.querySelector(selector);
      if (element) {
        this.makeElementEditable(element, field, type);
      }
    });
  }

  /**
   * Make an element inline editable
   */
  makeElementEditable(element, fieldName, inputType = 'text') {
    // Add edit button
    const editButton = document.createElement('button');
    editButton.className = 'inline-edit-btn';
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.title = `Edit ${fieldName}`;
    
    element.parentNode.insertBefore(editButton, element.nextSibling);

    editButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startInlineEdit(element, fieldName, inputType);
    });
  }

  /**
   * Start inline editing for an element
   */
  startInlineEdit(element, fieldName, inputType) {
    // Cancel other active edits first
    this.saveActiveInlineEdits();

    const originalValue = element.textContent.trim();
    this.originalValues.set(fieldName, originalValue);

    // Create input element
    const input = this.createInputElement(inputType, originalValue);
    input.className = 'inline-edit-input';
    input.dataset.field = fieldName;

    // Create container with save/cancel buttons
    const container = document.createElement('div');
    container.className = 'inline-edit-container';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'inline-edit-save';
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
    saveBtn.title = 'Save';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'inline-edit-cancel';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
    cancelBtn.title = 'Cancel';

    container.appendChild(input);
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);

    // Replace element with input
    element.style.display = 'none';
    element.parentNode.insertBefore(container, element.nextSibling);

    // Focus input and select text
    input.focus();
    input.select();

    // Setup event listeners
    saveBtn.addEventListener('click', () => this.saveInlineEdit(fieldName));
    cancelBtn.addEventListener('click', () => this.cancelInlineEdit(fieldName));
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.saveInlineEdit(fieldName);
      } else if (e.key === 'Escape') {
        this.cancelInlineEdit(fieldName);
      }
    });

    // Add to active editors
    this.activeEditors.set(fieldName, {
      element,
      container,
      input,
      originalValue
    });
  }

  /**
   * Save inline edit changes
   */
  async saveInlineEdit(fieldName) {
    const editor = this.activeEditors.get(fieldName);
    if (!editor) return;const newValue = editor.input.value.trim();
    
    // Validate the new value
    const validation = this.validateField(fieldName, newValue);
    if (!validation.isValid) {
      this.showFieldError(editor.input, validation.error);
      return;}

    try {
      // Show loading state
      editor.input.disabled = true;
      editor.container.classList.add('saving');

      // Save to server
      const success = await this.saveFieldToServer(fieldName, newValue);
      
      if (success) {
        // Update display
        editor.element.textContent = newValue;
        this.cleanupInlineEdit(fieldName);
        
        // Show success feedback
        this.showSaveSuccess(editor.element);
      } else {
        throw new Error('Failed to save changes');
      }
    } catch (error) {
      console.error(`Failed to save ${fieldName}:`, error);
      this.showFieldError(editor.input, 'Failed to save changes. Please try again.');
      editor.input.disabled = false;
      editor.container.classList.remove('saving');
    }
  }

  /**
   * Cancel inline edit and restore original value
   */
  cancelInlineEdit(fieldName) {
    const editor = this.activeEditors.get(fieldName);
    if (!editor) return;this.cleanupInlineEdit(fieldName);
  }

  /**
   * Cleanup inline edit UI
   */
  cleanupInlineEdit(fieldName) {
    const editor = this.activeEditors.get(fieldName);
    if (!editor) return;editor.container.remove();
    editor.element.style.display = '';
    
    // Clear from active editors
    this.activeEditors.delete(fieldName);
    this.originalValues.delete(fieldName);
  }

  /**
   * Save all active inline edits
   */
  async saveActiveInlineEdits() {
    const savePromises = Array.from(this.activeEditors.keys()).map(fieldName => 
      this.saveInlineEdit(fieldName)
    );
    
    await Promise.all(savePromises);
  }

  /**
   * Cancel all active inline edits
   */
  cancelAllInlineEditing() {
    Array.from(this.activeEditors.keys()).forEach(fieldName => {
      this.cancelInlineEdit(fieldName);
    });
  }

  /**
   * Setup username change button to show/hide the form
   */
  setupUsernameChangeButton() {
    const button = document.getElementById('change-username-btn');
    const container = document.getElementById('username-change-container');
    const cancelBtn = document.getElementById('cancel-username-change');
    
    if (!button || !container) {
      console.warn('⚠️ Username change button or container not found');
      return;}

    // Check username change eligibility and update button accordingly
    this.updateUsernameChangeButton();

    // Show form when button is clicked
    button.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Check if user can change username
      if (!this.canUserChangeUsername()) {
        this.showUsernameRestrictionMessage();
        return;}
      
      console.log('🎯 Username change button clicked - showing form');
      
      container.style.display = 'block';
      
      // Focus on the input field
      const inputField = document.getElementById('new-username');
      if (inputField) {
        setTimeout(() => inputField.focus(), 100);
      }
    });

    // Hide form when cancel is clicked
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('❌ Username change cancelled - hiding form');
        
        container.style.display = 'none';
        
        // Clear the form
        const form = document.getElementById('username-change-form');
        if (form) {
          form.reset();
          this.clearFormFeedback(form);
        }
      });
    }

    console.log('✅ Username change button events set up');
  }

  /**
   * Setup username change form
   */
  setupUsernameChangeForm() {
    const form = document.getElementById('username-change-form');
    if (!form) return;form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newUsername = form.querySelector('#new-username').value.trim();
      const validation = this.validateField('username', newUsername);
      
      if (!validation.isValid) {
        this.showUsernameFeedback(validation.error, 'error');
        return;}

      try {
        this.setFormLoading(form, true);
        
        const response = await fetch('/api/me/change-username', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: newUsername })
        });

        if (response.ok) {
          // Update UI elements immediately
          const usernameElements = document.querySelectorAll('#profile-username, .profile-username');
          usernameElements.forEach(el => {
            if (el) el.textContent = newUsername;
          });
          
          this.showUsernameFeedback('Username updated successfully!', 'success');
          
          // Clear form and hide it after a short delay
          setTimeout(() => {
            form.reset();
            const container = document.getElementById('username-change-container');
            if (container) container.style.display = 'none';
          }, 2000);
          
          // Update global user data if available
          if (window.currentUser) {
            window.currentUser.username = newUsername;
          }
          
          // Reload user data
          if (profileDataLoader) {
            profileDataLoader.clearCache('user-profile');
          }
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update username');
        }
      } catch (error) {
        this.showUsernameFeedback(error.message, 'error');
      } finally {
        this.setFormLoading(form, false);
      }
    });
  }

  /**
   * Setup add player button
   */
  setupAddPlayerButton() {
    const addPlayerBtn = document.getElementById('add-player-btn');
    const addPlayerModal = document.getElementById('add-player-modal');
    const closeModalBtn = document.getElementById('close-add-player-modal');
    const cancelAddPlayerBtn = document.getElementById('cancel-add-player');

    if (!addPlayerBtn || !addPlayerModal) {
      console.warn('Add player button or modal not found');
      return;}

    // Show modal when add player button is clicked
    addPlayerBtn.addEventListener('click', () => {
      console.log('Add player button clicked - showing modal');
      addPlayerModal.style.display = 'flex';
      addPlayerModal.classList.add('show');
    });

    // Close modal functions
    const closeModal = () => {
      console.log('Closing add player modal');
      addPlayerModal.style.display = 'none';
      addPlayerModal.classList.remove('show');
      
      // Reset the form
      const formElement = document.getElementById('add-player-form');
      if (formElement) {
        formElement.reset();
      }
    };

    // Close modal when X button is clicked
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeModal);
    }

    // Close modal when cancel button is clicked
    if (cancelAddPlayerBtn) {
      cancelAddPlayerBtn.addEventListener('click', closeModal);
    }

    // Close modal when clicking outside of it
    addPlayerModal.addEventListener('click', (e) => {
      if (e.target === addPlayerModal) {
        closeModal();
      }
    });
  }

  /**
   * Setup add player form
   */
  setupAddPlayerForm() {
    const form = document.getElementById('add-player-form');
    if (!form) return;form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const playerName = form.querySelector('#player-name').value.trim();
      const validation = this.validateField('playerName', playerName);
      
      if (!validation.isValid) {
        this.showFormError(form, validation.error);
        return;}

      try {
        this.setFormLoading(form, true);
        
        const response = await fetch('/api/ladder/add-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: playerName })
        });

        if (response.ok) {
          // Clear all relevant caches to ensure full refresh
          profileDataLoader.clearCache('player-names');
          profileDataLoader.clearCache('player-stats');
          profileDataLoader.clearCache('allies-opponents');
          
          // Reload both player names and stats
          const [players, playerStats] = await Promise.all([
            profileDataLoader.loadPlayerNames(),
            profileDataLoader.loadPlayerStats()
          ]);
          
          // Update UI with fresh data
          await profileUIManager.updatePlayerStats(playerStats);
          
          form.reset();
          this.showFormSuccess(form, 'Player added successfully!');
          
          // Close the modal if it exists
          const modal = document.getElementById('add-player-modal');
          if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
          }
          
          // Force a small delay then refresh the entire profile display
          setTimeout(() => {
            const profileManager = window.profileManager;
            if (profileManager && profileManager.refreshProfileDisplay) {
              profileManager.refreshProfileDisplay();
            }
          }, 1000);
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add player');
        }
      } catch (error) {
        this.showFormError(form, error.message);
      } finally {
        this.setFormLoading(form, false);
      }
    });
  }

  /**
   * Setup content creator edit buttons
   */
  setupContentCreatorEditButtons(container = document) {
    // Setup refresh streaming button first
    this.setupRefreshStreamingButton();
    
    // Get form elements for both platforms
    const youtubeEditBtn = container.querySelector('#youtube-edit-btn');
    const youtubeEditActions = container.querySelector('#youtube-edit-actions');
    const youtubeSaveBtn = container.querySelector('#youtube-save-btn');
    const youtubeCancelBtn = container.querySelector('#youtube-cancel-btn');
    const youtubeUsernameInput = container.querySelector('#youtube-username-input');
    const youtubeDescInput = container.querySelector('#youtube-description-input');
    const youtubeWc12Checkbox = container.querySelector('#youtube-wc12');
    const youtubeWc3Checkbox = container.querySelector('#youtube-wc3');
    const youtubeStatusText = container.querySelector('#youtube-status');
    const youtubeDescText = container.querySelector('#youtube-description-text');

    const twitchEditBtn = container.querySelector('#twitch-edit-btn');
    const twitchEditActions = container.querySelector('#twitch-edit-actions');
    const twitchSaveBtn = container.querySelector('#twitch-save-btn');
    const twitchCancelBtn = container.querySelector('#twitch-cancel-btn');
    const twitchUsernameInput = container.querySelector('#twitch-username-input');
    const twitchDescInput = container.querySelector('#twitch-description-input');
    const twitchWc12Checkbox = container.querySelector('#twitch-wc12');
    const twitchWc3Checkbox = container.querySelector('#twitch-wc3');
    const twitchStatusText = container.querySelector('#twitch-status');
    const twitchDescText = container.querySelector('#twitch-description-text');

    if (youtubeEditBtn && youtubeEditActions) {
      // Remove any existing event listeners by cloning the button
      const newYoutubeEditBtn = youtubeEditBtn.cloneNode(true);
      youtubeEditBtn.parentNode.replaceChild(newYoutubeEditBtn, youtubeEditBtn);
      
      newYoutubeEditBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎬 YouTube edit button clicked');
        
        // Check if editing is currently active
        const isEditing = !youtubeEditActions.classList.contains('d-none');
        
        if (isEditing) {
          // Exit edit mode
          this.exitYoutubeEditMode(container);
          console.log('YouTube edit mode exited');
        } else {
          // Enter edit mode
          this.enterYoutubeEditMode(container);
          console.log('YouTube edit mode entered');
        }
      });
    }

    if (youtubeSaveBtn && youtubeEditActions) {
      youtubeSaveBtn.addEventListener('click', async () => {
        try {
          const currentUser = window.currentUser;
          if (!currentUser) {
            throw new Error('User data not found');
          }

          const username = youtubeUsernameInput?.value.trim() || '';
          const description = youtubeDescInput?.value.trim() || '';
          
          // Generate full YouTube URL from username
          let youtubeUrl = '';
          if (username) {
            youtubeUrl = `https://youtube.com/@${username}`;
          }
          
          // Collect selected games
          const games = [];
          if (youtubeWc12Checkbox?.checked) {
            games.push('wc12');
          }
          if (youtubeWc3Checkbox?.checked) {
            games.push('wc3');
          }

          // Prepare update data
          const updateData = {
            ...currentUser,
            socialLinks: {
              ...currentUser.socialLinks,
              youtube: youtubeUrl
            },
            streaming: {
              ...currentUser.streaming,
              youtubeDescription: description,
              youtubeGames: games
            }
          };

          const response = await fetch('/api/me', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData),
            credentials: 'include'
          });

          if (!response.ok) throw new Error('Failed to update YouTube settings');

          const updatedUser = await response.json();
          window.currentUser = updatedUser;
          
          // Update UI with the new content creator status and info
          this.updateContentCreatorDisplay(updatedUser, container);

          // Exit edit mode
          this.exitYoutubeEditMode(container);
          
          console.log('YouTube settings saved successfully');
          this.showNotification('YouTube Updated', 'YouTube channel updated successfully!', 'success');
        } catch (error) {
          console.error('Error saving YouTube settings:', error);
          this.showNotification('Save Failed', 'Failed to save YouTube settings. Please try again.', 'error');
        }
      });
    }

    if (youtubeCancelBtn && youtubeEditActions) {
      youtubeCancelBtn.addEventListener('click', () => {
        // Exit edit mode (this will reset to current data)
        this.exitYoutubeEditMode(container);
      });
    }

    if (twitchEditBtn && twitchEditActions) {
      // Remove any existing event listeners by cloning the button
      const newTwitchEditBtn = twitchEditBtn.cloneNode(true);
      twitchEditBtn.parentNode.replaceChild(newTwitchEditBtn, twitchEditBtn);
      
      newTwitchEditBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎬 Twitch edit button clicked');
        
        // Check if editing is currently active
        const isEditing = !twitchEditActions.classList.contains('d-none');
        
        if (isEditing) {
          // Exit edit mode
          this.exitTwitchEditMode(container);
          console.log('Twitch edit mode exited');
        } else {
          // Enter edit mode
          this.enterTwitchEditMode(container);
          console.log('Twitch edit mode entered');
        }
      });
    }

    if (twitchSaveBtn && twitchEditActions) {
      twitchSaveBtn.addEventListener('click', async () => {
        try {
          const currentUser = window.currentUser;
          if (!currentUser) {
            throw new Error('User data not found');
          }

          const username = twitchUsernameInput?.value.trim() || '';
          const description = twitchDescInput?.value.trim() || '';
          
          // Generate full Twitch URL from username
          let twitchUrl = '';
          if (username) {
            twitchUrl = `https://twitch.tv/${username}`;
          }
          
          // Collect selected games
          const games = [];
          if (twitchWc12Checkbox?.checked) {
            games.push('wc12');
          }
          if (twitchWc3Checkbox?.checked) {
            games.push('wc3');
          }

          // Prepare update data
          const updateData = {
            ...currentUser,
            socialLinks: {
              ...currentUser.socialLinks,
              twitch: twitchUrl
            },
            streaming: {
              ...currentUser.streaming,
              twitchDescription: description,
              twitchGames: games
            }
          };

          const response = await fetch('/api/me', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData),
            credentials: 'include'
          });

          if (!response.ok) throw new Error('Failed to update Twitch settings');

          const updatedUser = await response.json();
          window.currentUser = updatedUser;
          
          // Update UI with the new content creator status and info
          this.updateContentCreatorDisplay(updatedUser, container);

          // Exit edit mode
          this.exitTwitchEditMode(container);
          
          console.log('Twitch settings saved successfully');
          this.showNotification('Twitch Updated', 'Twitch channel updated successfully!', 'success');
        } catch (error) {
          console.error('Error saving Twitch settings:', error);
          this.showNotification('Save Failed', 'Failed to save Twitch settings. Please try again.', 'error');
        }
      });
    }

    if (twitchCancelBtn && twitchEditActions) {
      twitchCancelBtn.addEventListener('click', () => {
        // Exit edit mode (this will reset to current data)
        this.exitTwitchEditMode(container);
      });
    }
    
    console.log('✅ Content creator edit buttons setup complete');
  }

  /**
   * Update content creator display with user data
   */
  updateContentCreatorDisplay(userData, container = document) {
    const platforms = ['youtube', 'twitch'];
    
    platforms.forEach(platform => {
      const statusElement = container.querySelector(`#${platform}-status`);
      const descriptionDisplay = container.querySelector(`#${platform}-description-display`);
      const descriptionText = container.querySelector(`#${platform}-description-text`);
      const contentTypes = container.querySelector(`#${platform}-content-types`);
      
      if (userData.socialLinks?.[platform]) {
        // Extract username for display
        let username = '';
        const url = userData.socialLinks[platform];
        if (platform === 'youtube' && url.includes('youtube.com/@')) {
          username = url.split('@').pop().split('/')[0];
        } else if (platform === 'twitch' && url.includes('twitch.tv/')) {
          username = url.split('twitch.tv/').pop().split('/')[0];
        }
        
        // Update status to show connected with clickable link
        if (statusElement && username) {
          statusElement.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #ffd700; text-decoration: none;">@${username}</a>`;
        }
        
        // Show description and content types if they exist
        const description = userData.streaming?.[`${platform}Description`];
        const games = userData.streaming?.[`${platform}Games`] || [];
        
        if (description || games.length > 0) {
          if (descriptionDisplay) {
            descriptionDisplay.classList.remove('d-none');
          }
          
          if (descriptionText && description) {
            descriptionText.textContent = description;
          }
          
          if (contentTypes) {
            contentTypes.innerHTML = '';
            games.forEach(game => {
              const badge = document.createElement('span');
              badge.className = 'content-type-badge';
              badge.textContent = game === 'wc12' ? 'WC 1 & 2' : 'WC 3';
              contentTypes.appendChild(badge);
            });
          }
        }
              } else {
          // Not connected
          if (statusElement) {
            statusElement.textContent = 'Not connected';
          }
          if (descriptionDisplay) {
            descriptionDisplay.classList.add('d-none');
          }
        }
      });
      
      // Update Watch Tower status indicators
      this.updateWatchTowerStatusIndicators(userData);
    }

    /**
     * Update Watch Tower status indicators based on user data
     */
    updateWatchTowerStatusIndicators(userData) {
      const youtubeIndicator = document.getElementById('youtube-status-indicator');
      const twitchIndicator = document.getElementById('twitch-status-indicator');
      
      if (youtubeIndicator) {
        const hasYoutubeUrl = userData.socialLinks?.youtube && userData.socialLinks.youtube.trim() !== '';
        const hasYoutubeGames = userData.streaming?.youtubeGames && userData.streaming.youtubeGames.length > 0;
        const isYoutubeSetup = hasYoutubeUrl && hasYoutubeGames;
        
        if (isYoutubeSetup) {
          youtubeIndicator.classList.add('setup');
          youtubeIndicator.title = 'YouTube Channel: Connected with content types';
        } else {
          youtubeIndicator.classList.remove('setup');
          if (hasYoutubeUrl) {
            youtubeIndicator.title = 'YouTube Channel: Connected but missing content types';
          } else {
            youtubeIndicator.title = 'YouTube Channel: Not connected';
          }
        }
      }
      
      if (twitchIndicator) {
        const hasTwitchUrl = userData.socialLinks?.twitch && userData.socialLinks.twitch.trim() !== '';
        const hasTwitchGames = userData.streaming?.twitchGames && userData.streaming.twitchGames.length > 0;
        const isTwitchSetup = hasTwitchUrl && hasTwitchGames;
        
        if (isTwitchSetup) {
          twitchIndicator.classList.add('setup');
          twitchIndicator.title = 'Twitch Channel: Connected with content types';
        } else {
          twitchIndicator.classList.remove('setup');
          if (hasTwitchUrl) {
            twitchIndicator.title = 'Twitch Channel: Connected but missing content types';
          } else {
            twitchIndicator.title = 'Twitch Channel: Not connected';
          }
        }
      }
    }

  /**
   * Enter YouTube edit mode
   */
  enterYoutubeEditMode(container) {
    const youtubeEditActions = container.querySelector('#youtube-edit-actions');
    const youtubeUsernameInput = container.querySelector('#youtube-username-input');
    const youtubeDescInput = container.querySelector('#youtube-description-input');
    const youtubeStatusText = container.querySelector('#youtube-status');
    const youtubeDescText = container.querySelector('#youtube-description-text');
    const youtubeWc12Checkbox = container.querySelector('#youtube-wc12');
    const youtubeWc3Checkbox = container.querySelector('#youtube-wc3');
    const youtubeContentTypes = container.querySelector('#youtube-content-types');

    // Show edit actions
    youtubeEditActions.classList.remove('d-none');

    // Hide content type badges when editing
    if (youtubeContentTypes) {
      youtubeContentTypes.classList.add('d-none');
    }

    // Extract username from URL if it exists
    let username = '';
    if (window.currentUser?.socialLinks?.youtube) {
      const url = window.currentUser.socialLinks.youtube;
      if (url.includes('youtube.com/@')) {
        username = url.split('@').pop().split('/')[0];
      }
    }

    // Populate inputs with current data
    if (youtubeUsernameInput) {
      youtubeUsernameInput.value = username || '';
      youtubeUsernameInput.classList.remove('d-none');
    }
    if (youtubeDescInput) {
      youtubeDescInput.value = window.currentUser?.streaming?.youtubeDescription || '';
      youtubeDescInput.classList.remove('d-none');
    }

    // Hide text elements
    if (youtubeStatusText) {
      youtubeStatusText.classList.add('editing');
    }
    if (youtubeDescText) {
      youtubeDescText.classList.add('editing');
    }

    // Update game checkboxes
    const games = window.currentUser?.streaming?.youtubeGames || [];
    if (youtubeWc12Checkbox) {
      youtubeWc12Checkbox.checked = games.includes('wc12');
    }
    if (youtubeWc3Checkbox) {
      youtubeWc3Checkbox.checked = games.includes('wc3');
    }

    // Focus on username input
    setTimeout(() => {
      if (youtubeUsernameInput) {
        youtubeUsernameInput.focus();
      }
    }, 100);
  }

  /**
   * Exit YouTube edit mode
   */
  exitYoutubeEditMode(container) {
    const youtubeEditActions = container.querySelector('#youtube-edit-actions');
    const youtubeUsernameInput = container.querySelector('#youtube-username-input');
    const youtubeDescInput = container.querySelector('#youtube-description-input');
    const youtubeStatusText = container.querySelector('#youtube-status');
    const youtubeDescText = container.querySelector('#youtube-description-text');
    const youtubeContentTypes = container.querySelector('#youtube-content-types');

    // Hide edit actions
    youtubeEditActions.classList.add('d-none');

    // Show content type badges when not editing
    if (youtubeContentTypes) {
      youtubeContentTypes.classList.remove('d-none');
    }

    // Hide inputs
    if (youtubeUsernameInput) {
      youtubeUsernameInput.classList.add('d-none');
    }
    if (youtubeDescInput) {
      youtubeDescInput.classList.add('d-none');
    }

    // Show text elements
    if (youtubeStatusText) {
      youtubeStatusText.classList.remove('editing');
    }
    if (youtubeDescText) {
      youtubeDescText.classList.remove('editing');
    }
  }

  /**
   * Enter Twitch edit mode
   */
  enterTwitchEditMode(container) {
    const twitchEditActions = container.querySelector('#twitch-edit-actions');
    const twitchUsernameInput = container.querySelector('#twitch-username-input');
    const twitchDescInput = container.querySelector('#twitch-description-input');
    const twitchStatusText = container.querySelector('#twitch-status');
    const twitchDescText = container.querySelector('#twitch-description-text');
    const twitchWc12Checkbox = container.querySelector('#twitch-wc12');
    const twitchWc3Checkbox = container.querySelector('#twitch-wc3');
    const twitchContentTypes = container.querySelector('#twitch-content-types');

    // Show edit actions
    twitchEditActions.classList.remove('d-none');

    // Hide content type badges when editing
    if (twitchContentTypes) {
      twitchContentTypes.classList.add('d-none');
    }

    // Extract username from URL if it exists
    let username = '';
    if (window.currentUser?.socialLinks?.twitch) {
      const url = window.currentUser.socialLinks.twitch;
      if (url.includes('twitch.tv/')) {
        username = url.split('twitch.tv/').pop().split('/')[0];
      }
    }

    // Populate inputs with current data
    if (twitchUsernameInput) {
      twitchUsernameInput.value = username || '';
      twitchUsernameInput.classList.remove('d-none');
    }
    if (twitchDescInput) {
      twitchDescInput.value = window.currentUser?.streaming?.twitchDescription || '';
      twitchDescInput.classList.remove('d-none');
    }

    // Hide text elements
    if (twitchStatusText) {
      twitchStatusText.classList.add('editing');
    }
    if (twitchDescText) {
      twitchDescText.classList.add('editing');
    }

    // Update game checkboxes
    const games = window.currentUser?.streaming?.twitchGames || [];
    if (twitchWc12Checkbox) {
      twitchWc12Checkbox.checked = games.includes('wc12');
    }
    if (twitchWc3Checkbox) {
      twitchWc3Checkbox.checked = games.includes('wc3');
    }

    // Focus on username input
    setTimeout(() => {
      if (twitchUsernameInput) {
        twitchUsernameInput.focus();
      }
    }, 100);
  }

  /**
   * Exit Twitch edit mode
   */
  exitTwitchEditMode(container) {
    const twitchEditActions = container.querySelector('#twitch-edit-actions');
    const twitchUsernameInput = container.querySelector('#twitch-username-input');
    const twitchDescInput = container.querySelector('#twitch-description-input');
    const twitchStatusText = container.querySelector('#twitch-status');
    const twitchDescText = container.querySelector('#twitch-description-text');
    const twitchContentTypes = container.querySelector('#twitch-content-types');

    // Hide edit actions
    twitchEditActions.classList.add('d-none');

    // Show content type badges when not editing
    if (twitchContentTypes) {
      twitchContentTypes.classList.remove('d-none');
    }

    // Hide inputs
    if (twitchUsernameInput) {
      twitchUsernameInput.classList.add('d-none');
    }
    if (twitchDescInput) {
      twitchDescInput.classList.add('d-none');
    }

    // Show text elements
    if (twitchStatusText) {
      twitchStatusText.classList.remove('editing');
    }
    if (twitchDescText) {
      twitchDescText.classList.remove('editing');
    }
  }

  /**
   * Hide content creator descriptions when editing
   */
  hideContentCreatorDescriptions(platform) {
    const descriptionDisplay = document.getElementById(`${platform}-description-display`);
    if (descriptionDisplay) {
      descriptionDisplay.classList.add('d-none');
    }
  }

  /**
   * Setup form auto-save functionality
   */
  setupFormAutoSave() {
    const autoSaveForms = document.querySelectorAll('.auto-save-form');
    
    autoSaveForms.forEach(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          this.scheduleAutoSave(form, input);
        });
      });
    });
  }

  /**
   * Schedule auto-save for form changes
   */
  scheduleAutoSave(form, input) {
    const formId = form.id || 'unknown';
    
    // Clear existing timer
    if (this.autosaveTimers.has(formId)) {
      clearTimeout(this.autosaveTimers.get(formId));
    }
    
    // Schedule new save
    const timer = setTimeout(() => {
      this.performAutoSave(form, input);
    }, 2000); // 2 second delay
    
    this.autosaveTimers.set(formId, timer);
  }

  /**
   * Perform auto-save operation
   */
  async performAutoSave(form, input) {
    const fieldName = input.name || input.id;
    const value = input.value;
    
    try {
      // Show auto-save indicator
      this.showAutoSaveIndicator(input, 'saving');
      
      const success = await this.saveFieldToServer(fieldName, value);
      
      if (success) {
        this.showAutoSaveIndicator(input, 'saved');
      } else {
        this.showAutoSaveIndicator(input, 'error');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      this.showAutoSaveIndicator(input, 'error');
    }
  }

  /**
   * Save field data to server
   */
  async saveFieldToServer(fieldName, value) {
    const endpoint = this.getEndpointForField(fieldName);
    if (!endpoint) return false;try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [fieldName]: value })
      });

      return response.ok;} catch (error) {
      console.error(`Failed to save ${fieldName}:`, error);
      return false;}
  }

  /**
   * Get appropriate API endpoint for field
   */
  getEndpointForField(fieldName) {
    const endpointMap = {
      'username': '/api/me/change-username',
      'bio': '/api/user/update-bio',
      'twitchLink': '/api/user/social-links',
      'youtubeLink': '/api/user/social-links',
      'discordLink': '/api/user/social-links'
    };

    return endpointMap[fieldName] || '/api/user/update-field';}

  /**
   * Clear form feedback messages
   */
  clearFormFeedback(form) {
    const feedbackElement = form.parentNode.querySelector('.username-feedback');
    if (feedbackElement) {
      feedbackElement.textContent = '';
      feedbackElement.className = 'username-feedback';
    }
  }

  /**
   * Show username feedback messages
   */
  showUsernameFeedback(message, type = 'info') {
    const feedbackElement = document.getElementById('username-change-feedback');
    if (feedbackElement) {
      feedbackElement.textContent = message;
      feedbackElement.className = `username-feedback ${type}`;
    }
  }

  /**
   * Check if user can change username based on current user data
   */
  canUserChangeUsername() {
    if (!window.currentUser) return false;return window.currentUser.canChangeUsername !== false;}

  /**
   * Update username change button state and text
   */
  updateUsernameChangeButton() {
    const button = document.getElementById('change-username-btn');
    if (!button || !window.currentUser) return;const canChange = this.canUserChangeUsername();
    const nextChangeDate = window.currentUser.nextUsernameChangeDate;

    if (!canChange) {
      button.classList.add('disabled');
      button.style.opacity = '0.6';
      button.style.cursor = 'not-allowed';
      
      if (nextChangeDate) {
        const date = new Date(nextChangeDate);
        const formattedDate = date.toLocaleDateString();
        button.title = `Username change available on ${formattedDate}`;
      } else {
        button.title = 'Username change not currently available';
      }
    } else {
      button.classList.remove('disabled');
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      button.title = 'Change Username';
    }
  }

  /**
   * Show username restriction message
   */
  showUsernameRestrictionMessage() {
    if (!window.currentUser) return;const nextChangeDate = window.currentUser.nextUsernameChangeDate;
    const lastChangeDate = window.currentUser.lastUsernameChange;
    
    let message = '';
    
    if (nextChangeDate) {
      const date = new Date(nextChangeDate);
      const formattedDate = date.toLocaleDateString();
      const daysUntil = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil > 0) {
        message = `You can change your username again on ${formattedDate} (${daysUntil} day${daysUntil === 1 ? '' : 's'}).`;
      } else {
        message = 'You can change your username now. Please refresh the page.';
      }
    } else if (lastChangeDate) {
      // User is in first 30 days and already changed once
      message = 'You can only change your username once within the first 30 days of account creation.';
    } else {
      message = 'Username changes are limited to once every 30 days.';
    }

    // Show the message in a temporary notification
    this.showTemporaryNotification(message, 'info');
  }

  /**
   * Show temporary notification
   */
  showTemporaryNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `username-restriction-notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(33, 37, 41, 0.95);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 1rem;
      max-width: 300px;
      z-index: 10000;
      font-size: 0.875rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    if (type === 'info') {
      notification.style.borderLeftColor = '#007bff';
    } else if (type === 'error') {
      notification.style.borderLeftColor = '#dc3545';
    }
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
        <i class="fas fa-info-circle" style="color: #007bff; margin-top: 2px;"></i>
        <div>${message}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  /**
   * Validate field value according to rules
   */
  validateField(fieldName, value) {
    const rules = this.validationRules.get(fieldName);
    if (!rules) return { isValid: true };if (rules.minLength && value.length < rules.minLength) {
      return {
        isValid: false,
        error: rules.errorMessages.minLength
      };}

    // Check maximum length
    if (rules.maxLength && value.length > rules.maxLength) {
      return {
        isValid: false,
        error: rules.errorMessages.maxLength
      };}

    // Check pattern
    if (rules.pattern && value && !rules.pattern.test(value)) {
      return {
        isValid: false,
        error: rules.errorMessages.pattern
      };}

    return { isValid: true };}

  /**
   * Create appropriate input element
   */
  createInputElement(type, value) {
    if (type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.rows = 3;
      return textarea;} else {
      const input = document.createElement('input');
      input.type = type;
      input.value = value;
      return input;}
  }

  /**
   * Show field validation error
   */
  showFieldError(input, message) {
    // Remove existing error
    const existingError = input.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    // Create error element
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    input.parentNode.appendChild(errorElement);

    // Add error styling
    input.classList.add('error');

    // Remove error after 5 seconds
    setTimeout(() => {
      errorElement.remove();
      input.classList.remove('error');
    }, 5000);
  }

  /**
   * Show form-wide error message
   */
  showFormError(form, message) {
    this.showFormMessage(form, message, 'error');
  }

  /**
   * Show form success message
   */
  showFormSuccess(form, message) {
    this.showFormMessage(form, message, 'success');
  }

  /**
   * Show form message (error or success)
   */
  showFormMessage(form, message, type) {
    // Remove existing message
    const existingMessage = form.querySelector('.form-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `form-message ${type}`;
    messageElement.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i> ${message}`;
    
    form.insertBefore(messageElement, form.firstChild);

    // Remove message after 5 seconds
    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }

  /**
   * Set form loading state
   */
  setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, textarea, select, button');

    if (isLoading) {
      form.classList.add('loading');
      inputs.forEach(input => input.disabled = true);
      
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      }
    } else {
      form.classList.remove('loading');
      inputs.forEach(input => input.disabled = false);
      
      if (submitBtn) {
        submitBtn.innerHTML = submitBtn.dataset.originalText || 'Save';
      }
    }
  }

  /**
   * Show auto-save indicator
   */
  showAutoSaveIndicator(input, status) {
    // Remove existing indicator
    const existingIndicator = input.parentNode.querySelector('.auto-save-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = `auto-save-indicator ${status}`;
    
    const icons = {
      saving: 'fa-spinner fa-spin',
      saved: 'fa-check',
      error: 'fa-exclamation-triangle'
    };
    
    const messages = {
      saving: 'Saving...',
      saved: 'Saved',
      error: 'Error'
    };

    indicator.innerHTML = `<i class="fas ${icons[status]}"></i> ${messages[status]}`;
    input.parentNode.appendChild(indicator);

    // Remove after delay
    setTimeout(() => {
      indicator.remove();
    }, status === 'saved' ? 2000 : 3000);
  }

  /**
   * Show save success animation
   */
  showSaveSuccess(element) {
    element.classList.add('save-success');
    setTimeout(() => {
      element.classList.remove('save-success');
    }, 1000);
  }

  /**
   * Handle generic form submission
   */
  async handleFormSubmission(form) {
    const formData = new FormData(form);
    const action = form.action || form.dataset.action;
    const method = form.method || 'POST';

    try {
      this.setFormLoading(form, true);
      
      const response = await fetch(action, {
        method: method,
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        this.showFormSuccess(form, result.message || 'Changes saved successfully!');
        
        // Trigger form-specific success handler if exists
        const onSuccess = form.dataset.onSuccess;
        if (onSuccess && window[onSuccess]) {
          window[onSuccess](result);
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save changes');
      }
    } catch (error) {
      this.showFormError(form, error.message);
    } finally {
      this.setFormLoading(form, false);
    }
  }

  /**
   * Setup bio edit form functionality
   * @param {HTMLElement} container - Optional container to search within (for modal contexts)
   */
  setupBioEditForm(container = document) {
    console.log('🔧 Setting up bio edit form functionality...', { container: container === document ? 'document' : 'modal' });
    
    const bioEditBtn = container.querySelector('#bio-edit-btn');
    const bioEditForm = container.querySelector('#bio-edit-form');
    const bioDisplay = container.querySelector('#bio-display-content');
    const bioSaveBtn = container.querySelector('#bio-save-btn');
    const bioCancelBtn = container.querySelector('#bio-cancel-btn');

    console.log('🔍 Bio edit elements found:', { 
      bioEditBtn: !!bioEditBtn, 
      bioEditForm: !!bioEditForm, 
      bioDisplay: !!bioDisplay,
      bioSaveBtn: !!bioSaveBtn,
      bioCancelBtn: !!bioCancelBtn
    });

    if (!bioEditBtn || !bioEditForm || !bioDisplay) {
      console.warn('❌ Bio edit elements not found in container:', container);
      return;}

    let originalValues = {};

    // Remove any existing event listeners by cloning the button
    const newBioEditBtn = bioEditBtn.cloneNode(true);
    bioEditBtn.parentNode.replaceChild(newBioEditBtn, bioEditBtn);

    // Edit button - show form
    newBioEditBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🎯 Bio edit button clicked!');
      
      // Populate form with current user data
      this.populateBioForm(container);
      
      // Show form, hide display
      bioEditForm.classList.remove('d-none');
      bioDisplay.classList.add('editing');
      
      console.log('✅ Form shown, display hidden');
      setTimeout(() => {
        const bioTextarea = container.querySelector('#bio-textarea');
        if (bioTextarea) bioTextarea.focus();
      }, 100);
    });

    // Save button
    if (bioSaveBtn) {
      bioSaveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('💾 Save button clicked');
        await this.saveBioForm(container);
      });
    }

    // Cancel button
    if (bioCancelBtn) {
      bioCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('❌ Cancel button clicked');
        this.cancelBioEdit(container);
      });
    }
  }

  /**
   * Populate bio form with current values
   */
  populateBioForm(container = document) {
    console.log('📋 Populating bio form...');
    console.log('📋 Container:', container === document ? 'document' : 'modal');
    
    // Debug: Check what elements are in the container
    console.log('📋 Container HTML:', container.innerHTML ? container.innerHTML.substring(0, 500) + '...' : 'No innerHTML');
    console.log('📋 All form elements in container:', container.querySelectorAll('input, select, textarea'));
    
    // Get current user data from UnifiedProfileManager first, then fallback to window.currentUser
    let userData = {};
    
    if (window.profileManager && window.profileManager.currentUser) {
      userData = window.profileManager.currentUser;
      console.log('📋 Got user data from UnifiedProfileManager:', userData);
    } else if (window.currentUser) {
      userData = window.currentUser;
      console.log('📋 Got user data from window.currentUser:', userData);
    } else {
      console.warn('❌ No user data available from any source, retrying in 500ms...');
      // Retry after a short delay to allow data to load
      setTimeout(() => {
        this.populateBioForm(container);
      }, 500);
      return;}
    
    console.log('📋 User data source:', window.profileManager && window.profileManager.currentUser ? 'UnifiedProfileManager' : 'window.currentUser');
    console.log('📋 User data keys:', Object.keys(userData));
    
    const profile = userData.profile || {};
    const warcraftPrefs = profile.warcraftPreferences || {};
    
    console.log('📋 User data structure:', {
      userData: userData,
      profile: profile,
      warcraftPrefs: warcraftPrefs
    });
    
    // Bio
    const bioTextarea = container.querySelector('#bio-textarea');
    console.log('🔍 Looking for bio-textarea, found:', !!bioTextarea);
    if (bioTextarea) {
      bioTextarea.value = userData.bio || '';
      console.log('📋 Set bio textarea value:', bioTextarea.value);
    } else {
      console.log('❌ Bio textarea not found');
      // Try to find any textarea in the container
      const allTextareas = container.querySelectorAll('textarea');
      console.log('🔍 All textareas in container:', allTextareas.length, Array.from(allTextareas).map(t => ({ id: t.id, name: t.name })));
    }

    // Date of birth
    const dobInput = container.querySelector('#bio-dob');
    if (dobInput) {
      const dobValue = userData.dateOfBirth || profile.dateOfBirth;
      console.log('📋 Date of birth value from data:', dobValue);
      if (dobValue) {
        const dobDate = new Date(dobValue);
        if (!isNaN(dobDate.getTime())) {
          dobInput.value = dobDate.toISOString().split('T')[0];
        }
      } else {
        // Set default to July 1982 when no date is set
        dobInput.value = '1982-07-01';
      }
      console.log('📋 Set date of birth value:', dobInput.value);
      
      // Add event listener to set default when date picker is opened
      dobInput.addEventListener('focus', function() {
        if (!this.value) {
          this.value = '1982-07-01';
        }
      });
    } else {
      console.log('❌ Date of birth input not found');
    }

    // Country
    const countryInput = container.querySelector('#bio-country');
    console.log('🔍 Looking for bio-country, found:', !!countryInput);
    if (countryInput) {
      const countryValue = profile.country || userData.country || '';
      console.log('📋 Country value from data:', countryValue);
      countryInput.value = countryValue;
      console.log('📋 Set country input value:', countryInput.value);
    } else {
      console.log('❌ Country input not found');
      // Try to find any input with name="country" in the container
      const allCountryInputs = container.querySelectorAll('input[name="country"]');
      console.log('🔍 All country inputs in container:', allCountryInputs.length, Array.from(allCountryInputs).map(i => ({ id: i.id, name: i.name, value: i.value })));
    }

    // Game preference
    const gameSelect = container.querySelector('#bio-game');
    if (gameSelect) {
      const gameValue = warcraftPrefs.favoriteGame || userData.favoriteGame || '';
      console.log('📋 Game value from data:', gameValue);
      gameSelect.value = gameValue;
      console.log('📋 Set game select value:', gameSelect.value);
    } else {
      console.log('❌ Game select not found');
    }

    // Race preference
    const raceSelect = container.querySelector('#bio-race');
    if (raceSelect) {
      const raceValue = warcraftPrefs.favoriteRace || userData.favoriteRace || '';
      console.log('📋 Race value from data:', raceValue);
      raceSelect.value = raceValue;
      console.log('📋 Set race select value:', raceSelect.value);
    } else {
      console.log('❌ Race select not found');
    }

    // Tactics preference
    const tacticsSelect = container.querySelector('#bio-tactics');
    if (tacticsSelect) {
      const tacticsValue = warcraftPrefs.favoriteStrategy || userData.favoriteStrategy || userData.favoriteTactics || '';
      console.log('📋 Tactics value from data:', tacticsValue);
      tacticsSelect.value = tacticsValue;
      console.log('📋 Set tactics select value:', tacticsSelect.value);
    } else {
      console.log('❌ Tactics select not found');
    }
    
    console.log('✅ Bio form populated');
  }

  /**
   * Save bio form data
   */
  async saveBioForm(container = document) {
    const bioSaveBtn = container.querySelector('#bio-save-btn');
    const bioEditForm = container.querySelector('#bio-edit-form');
    const bioDisplay = container.querySelector('#bio-display-content');
    
    try {
      bioSaveBtn.disabled = true;
      bioSaveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      // Structure data according to backend API expectations
      const formData = {
        bio: container.querySelector('#bio-textarea')?.value?.trim() || '',
        profile: {
          country: container.querySelector('#bio-country')?.value?.trim() || '',
          warcraftPreferences: {
            favoriteGame: container.querySelector('#bio-game')?.value || '',
            favoriteRace: container.querySelector('#bio-race')?.value || '',
            favoriteStrategy: container.querySelector('#bio-tactics')?.value || ''
          }
        }
      };

      // Add date of birth if provided
      const dobValue = container.querySelector('#bio-dob')?.value;
      if (dobValue) {
        formData.profile.dateOfBirth = dobValue;
        // Also add at root level for compatibility with ProfileUIManager
        formData.dateOfBirth = dobValue;
      }

      console.log('📤 Sending data to API:', formData);

      const response = await fetch('/api/me', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        console.log('✅ Profile updated successfully:', updatedUser);
        
        // Update global user data for immediate consistency
        window.currentUser = updatedUser;
        
        // Clear profile data cache to force fresh load
        if (window.profileManager && window.profileManager.modules && window.profileManager.modules.dataLoader) {
          window.profileManager.modules.dataLoader.clearCache('user-profile');
        }
        
        // Update the display immediately in the modal
        this.updateBioDisplayInModal(container, updatedUser);
        
        // If ProfileUIManager is available, update it with the fresh data
        if (window.profileManager && window.profileManager.modules && window.profileManager.modules.uiManager) {
          window.profileManager.modules.uiManager.updateBioAndSocial(updatedUser);
        }
        
        // Hide form and show updated content
        bioEditForm.classList.add('d-none');
        bioDisplay.classList.remove('editing');
        
        this.showNotification('Profile Updated', 'Your profile has been saved successfully!', 'success');
      } else {
        const error = await response.json();
        console.error('❌ API Error:', error);
        this.showNotification('Save Failed', error.error || 'Failed to save profile.', 'error');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showNotification('Save Error', 'An error occurred while saving.', 'error');
    } finally {
      bioSaveBtn.disabled = false;
      bioSaveBtn.innerHTML = 'Save Changes';
    }
  }

  /**
   * Update bio display with new data
   */
  updateBioDisplay(data) {
    const bioText = document.getElementById('bio-text');
    const profileDob = document.getElementById('profile-dob');
    const profileCountry = document.getElementById('profile-country');
    const profileGame = document.getElementById('profile-game');
    const profileRace = document.getElementById('profile-race');
    const profileTactics = document.getElementById('profile-tactics');

    // Update bio text
    if (bioText) bioText.textContent = data.bio || 'No bio available';
    
    // Update date of birth
    if (profileDob) {
      const dobValue = data.dateOfBirth || data.profile?.dateOfBirth;
      if (dobValue) {
        const dobDate = new Date(dobValue);
        if (!isNaN(dobDate.getTime())) {
          profileDob.textContent = dobDate.toLocaleDateString();
        } else {
          profileDob.textContent = 'Not specified';
        }
      } else {
        profileDob.textContent = 'Not specified';
      }
    }
    
    // Update country
    if (profileCountry) {
      profileCountry.textContent = data.profile?.country || 'Not specified';
    }
    
    // Update game preference
    const gameMap = {
      'wc1': 'WC: Orcs & Humans', 
      'wc2': 'WC II: Tides of Darkness', 
      'wc3': 'WC III: Reign of Chaos'
    };
    if (profileGame) {
      const gameValue = data.profile?.warcraftPreferences?.favoriteGame;
      profileGame.textContent = gameMap[gameValue] || 'Not specified';
    }
    
    // Update race preference
    const raceMap = {
      'human': 'Human', 
      'orc': 'Orc', 
      'night_elf': 'Night Elf', 
      'undead': 'Undead'
    };
    if (profileRace) {
      const raceValue = data.profile?.warcraftPreferences?.favoriteRace;
      profileRace.textContent = raceMap[raceValue] || 'Not specified';
    }
    
    // Update tactics preference
    const tacticsMap = {
      'rush': 'Rush', 'boom': 'Boom (Economic Focus)', 'turtle': 'Turtle (Defensive)',
      'all-in': 'All-in Attack', 'harassment': 'Harassment', 'map-control': 'Map Control',
      'tech-rush': 'Tech Rush', 'mass-units': 'Mass Units', 'mixed-army': 'Mixed Army',
      'tower-rush': 'Tower Rush', 'fast-expansion': 'Fast Expansion', 'stealth-ambush': 'Stealth/Ambush'
    };
    if (profileTactics) {
      const tacticsValue = data.profile?.warcraftPreferences?.favoriteStrategy;
      profileTactics.textContent = tacticsMap[tacticsValue] || 'Not specified';
    }
  }

  /**
   * Update bio display in a modal after successful save
   */
  updateBioDisplayInModal(container, updatedUser) {
    // Update bio text display
    const bioTextDisplay = container.querySelector('#bio-text');
    if (bioTextDisplay) {
      bioTextDisplay.textContent = updatedUser.bio || 'No bio yet. Click edit to add one!';
    }
    
    // Update display fields (not form fields)
    const profileDob = container.querySelector('#profile-dob');
    const profileCountry = container.querySelector('#profile-country');
    const profileGame = container.querySelector('#profile-game');
    const profileRace = container.querySelector('#profile-race');
    const profileTactics = container.querySelector('#profile-tactics');

    // Date of birth
    if (profileDob) {
      const dobValue = updatedUser.dateOfBirth || updatedUser.profile?.dateOfBirth;
      if (dobValue) {
        const dobDate = new Date(dobValue);
        if (!isNaN(dobDate.getTime())) {
          profileDob.textContent = dobDate.toLocaleDateString();
        } else {
          profileDob.textContent = 'Not specified';
        }
      } else {
        profileDob.textContent = 'Not specified';
      }
    }
    
    // Country
    if (profileCountry) {
      const country = updatedUser.profile?.country || updatedUser.country;
      profileCountry.textContent = country || 'Not specified';
    }
    
    // Game preference
    if (profileGame) {
      const gameMap = {
        'wc1': 'WC: Orcs & Humans',
        'wc2': 'WC II: Tides of Darkness', 
        'wc3': 'WC III: Reign of Chaos'
      };
      const gameValue = updatedUser.profile?.warcraftPreferences?.favoriteGame || updatedUser.favoriteGame;
      profileGame.textContent = gameMap[gameValue] || gameValue || 'Not specified';
    }
    
    // Race preference
    if (profileRace) {
      const raceMap = {
        'human': 'Human',
        'orc': 'Orc', 
        'night_elf': 'Night Elf',
        'undead': 'Undead'
      };
      const raceValue = updatedUser.profile?.warcraftPreferences?.favoriteRace || updatedUser.favoriteRace;
      profileRace.textContent = raceMap[raceValue] || raceValue || 'Not specified';
    }
    
    // Tactics preference
    if (profileTactics) {
      const tacticsMap = {
        'rush': 'Rush',
        'boom': 'Boom (Economic Focus)',
        'turtle': 'Turtle (Defensive)',
        'all-in': 'All-in Attack',
        'harassment': 'Harassment', 
        'map-control': 'Map Control',
        'tech-rush': 'Tech Rush',
        'mass-units': 'Mass Units',
        'mixed-army': 'Mixed Army',
        'tower-rush': 'Tower Rush',
        'fast-expansion': 'Fast Expansion',
        'stealth-ambush': 'Stealth/Ambush'
      };
      const tacticsValue = updatedUser.profile?.warcraftPreferences?.favoriteStrategy || updatedUser.favoriteStrategy || updatedUser.favoriteTactics;
      profileTactics.textContent = tacticsMap[tacticsValue] || tacticsValue || 'Not specified';
    }
    
    // Top Allies (set to N/A for now - would need match history data)
    const alliesElement = container.querySelector('#profile-allies');
    if (alliesElement) {
      alliesElement.textContent = 'N/A';
    }
    
    // Top Opponents (set to N/A for now - would need match history data)
    const enemiesElement = container.querySelector('#profile-enemies');
    if (enemiesElement) {
      enemiesElement.textContent = 'N/A';
    }
  }

  /**
   * Cancel bio editing
   */
  cancelBioEdit(container = document) {
    const bioEditForm = container.querySelector('#bio-edit-form');
    const bioDisplay = container.querySelector('#bio-display-content');
    
    if (bioEditForm) bioEditForm.classList.add('d-none');
    if (bioDisplay) bioDisplay.classList.remove('editing');
  }

  /**
   * Show notification message
   */
  showNotification(title, message, type = 'success') {
    // Use the global showEpicNotification if available
    if (typeof window.showEpicNotification === 'function') {
      window.showEpicNotification(title, message, type);
    } else if (typeof window.NotificationUtils !== 'undefined') {
      // Fallback to NotificationUtils
      switch(type) {
        case 'success':
          window.NotificationUtils.success(`${title}: ${message}`);
          break;
        case 'error':
          window.NotificationUtils.error(`${title}: ${message}`);
          break;
        case 'warning':
          window.NotificationUtils.warning(`${title}: ${message}`);
          break;
        default:
          window.NotificationUtils.info(`${title}: ${message}`);
      }
    } else {
      // Create our own soft notification system
      this.createSoftNotification(title, message, type);
    }
  }

  /**
   * Create a soft notification when other systems aren't available
   */
  createSoftNotification(title, message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `profile-notification profile-notification-${type}`;
    
    const iconClass = type === 'success' ? 'fas fa-check-circle' : 
                     type === 'error' ? 'fas fa-exclamation-triangle' : 
                     'fas fa-info-circle';
    
    notification.innerHTML = `
      <div class="notification-icon">
        <i class="${iconClass}"></i>
      </div>
      <div class="notification-content">
        <h4 class="notification-title">${title}</h4>
        <p class="notification-message">${message}</p>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Add styles if not already present
    if (!document.getElementById('profile-notification-styles')) {
      this.addNotificationStyles();
    }

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);

    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    });
  }

  /**
   * Add notification styles to the page
   */
  addNotificationStyles() {
    const styles = document.createElement('style');
    styles.id = 'profile-notification-styles';
    styles.textContent = `
      .profile-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(30, 41, 59, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.75rem;
        padding: 1rem;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .profile-notification.show {
        transform: translateX(0);
        opacity: 1;
      }
      
      .profile-notification-success {
        border-left: 4px solid #10B981;
      }
      
      .profile-notification-error {
        border-left: 4px solid #EF4444;
      }
      
      .profile-notification-warning {
        border-left: 4px solid #F59E0B;
      }
      
      .profile-notification-info {
        border-left: 4px solid #3B82F6;
      }
      
      .notification-icon {
        color: var(--primary-gold);
        font-size: 1.25rem;
        flex-shrink: 0;
        margin-top: 0.125rem;
      }
      
      .profile-notification-success .notification-icon {
        color: #10B981;
      }
      
      .profile-notification-error .notification-icon {
        color: #EF4444;
      }
      
      .notification-content {
        flex: 1;
        color: white;
      }
      
      .notification-title {
        margin: 0 0 0.25rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--primary-gold);
      }
      
      .notification-message {
        margin: 0;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.4;
      }
      
      .notification-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 0;
        font-size: 0.875rem;
        flex-shrink: 0;
        transition: color 0.2s ease;
      }
      
      .notification-close:hover {
        color: white;
      }
      
      @media (max-width: 768px) {
        .profile-notification {
          right: 10px;
          left: 10px;
          max-width: none;
          transform: translateY(-100%);
        }
        
        .profile-notification.show {
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Setup refresh streaming button
   */
  setupRefreshStreamingButton() {
    const refreshStreamingBtn = document.getElementById('refresh-streaming-btn');
    if (refreshStreamingBtn) {
      refreshStreamingBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('🔄 Refreshing streaming status...');
        await this.refreshStreamingStatus();
      });
    }
  }

     /**
    * Refresh streaming status and profile images
    */
   async refreshStreamingStatus() {
     const refreshButton = document.getElementById('refresh-streaming-btn');
     const originalContent = refreshButton.innerHTML;
     
     try {
       // Update button to show loading state
       refreshButton.disabled = true;
       refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span class="btn-text">Refreshing...</span>';
       
       const response = await fetch('/api/refresh-streaming', {
         method: 'POST',
         credentials: 'include'
       });

       if (response.ok) {
         const result = await response.json();
         console.log('🎉 Streaming data refreshed successfully:', result);
         
         // Show success state
         refreshButton.innerHTML = '<i class="fas fa-check"></i> <span class="btn-text">Updated!</span>';
         
         // Show notification with details
         let message = 'Live status and profile images refreshed successfully!';
         if (result.results?.liveStatus?.success) {
           message += ' Live status updated.';
         }
         if (result.results?.profileImages?.note) {
           message += ` ${result.results.profileImages.note}`;
         }
         
         this.showNotification('Streaming Status', message, 'success');
         
         // Reload user data to update the UI with any changes
         if (window.profileManager?.modules?.dataLoader?.loadUserProfile) {
           setTimeout(async () => {
             try {
               const updatedUserData = await window.profileManager.modules.dataLoader.loadUserProfile();
               if (updatedUserData && window.profileManager?.modules?.uiManager?.updateContentCreatorStatus) {
                 window.profileManager.modules.uiManager.updateContentCreatorStatus(updatedUserData);
               }
             } catch (error) {
               console.error('Failed to refresh user data after streaming refresh:', error);
             }
           }, 1000);
         }
       } else {
         const error = await response.json();
         throw new Error(error.details || error.message || 'Failed to refresh streaming status');
       }
     } catch (error) {
       console.error('Error refreshing streaming status:', error);
       refreshButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span class="btn-text">Error</span>';
       this.showNotification('Refresh Error', error.message || 'An error occurred while refreshing streaming status.', 'error');
     } finally {
       // Reset button after 2 seconds
       setTimeout(() => {
         refreshButton.disabled = false;
         refreshButton.innerHTML = originalContent;
       }, 2000);
     }
   }
}

// Create and export singleton instance
export const profileFormHandlers = new ProfileFormHandlers(); 