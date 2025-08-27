/**
 * LadderMatchReporting.js - Match Reporting System
 * 
 * Handles:
 * - Match report modal
 * - File upload and validation
 * - Player selection
 * - Match submission
 * - Result confirmation
 */

import { ladderCore } from './LadderCore.js';

export class LadderMatchReporting {
  constructor() {
    this.modal = null;
    this.uploadedFiles = [];
    this.selectedPlayers = [];
    this.initialized = false;
  }

  /**
   * Initialize match reporting system
   */
  init() {
    if (this.initialized) return;console.log('📋 Initializing Match Reporting...');
    
    this.modal = document.getElementById('report-match-modal');
    if (!this.modal) {
      console.warn('Report match modal not found');
      return;}
    
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.setupPlayerSelection();
    
    this.initialized = true;
    console.log('✅ Match Reporting initialized');
  }

  /**
   * Open the report match modal
   */
  openModal() {
    if (!this.modal) return;this.resetForm();
    this.modal.style.display = 'flex';
    this.modal.classList.add('show');
    
    // Focus on first input
    const firstInput = this.modal.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }

  /**
   * Close the report match modal
   */
  closeModal() {
    if (!this.modal) return;this.modal.style.display = 'none';
    this.modal.classList.remove('show');
    this.resetForm();
  }

  /**
   * Reset the form to initial state
   */
  resetForm() {
    this.uploadedFiles = [];
    this.selectedPlayers = [];
    
    // Clear form inputs
    const form = this.modal.querySelector('#report-match-form');
    if (form) form.reset();
    
    // Clear file display
    this.updateFileDisplay();
    
    // Clear player selection
    this.updatePlayerDisplay();
    
    // Reset validation state
    this.clearValidationErrors();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Modal close buttons
    this.modal.querySelectorAll('[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });
    
    // Submit form
    const form = this.modal.querySelector('#report-match-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitMatch();
      });
    }
    
    // File input change
    const fileInput = this.modal.querySelector('#match-screenshot');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelection(e.target.files);
      });
    }
    
    // Remove file buttons
    this.modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="remove-file"]')) {
        const index = parseInt(e.target.dataset.index);
        this.removeFile(index);
      }
    });
  }

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    const dropZone = this.modal.querySelector('.file-drop-zone');
    if (!dropZone) return;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    // Visual feedback
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      });
    });
    
    // Handle file drop
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      this.handleFileSelection(files);
    });
  }

  /**
   * Setup player selection functionality
   */
  setupPlayerSelection() {
    const playerInputs = this.modal.querySelectorAll('.player-input');
    
    playerInputs.forEach((input, index) => {
      // Auto-complete functionality
      input.addEventListener('input', (e) => {
        this.handlePlayerSearch(e.target.value, index);
      });
      
      // Player validation
      input.addEventListener('blur', (e) => {
        this.validatePlayer(e.target.value, index);
      });
    });
    
    // Add/remove player buttons
    this.modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="add-player"]')) {
        this.addPlayerInput();
      } else if (e.target.matches('[data-action="remove-player"]')) {
        const index = parseInt(e.target.dataset.index);
        this.removePlayerInput(index);
      }
    });
  }

  /**
   * Handle file selection (drag/drop or input)
   */
  handleFileSelection(files) {
    Array.from(files).forEach(file => {
      if (this.validateFile(file)) {
        this.uploadedFiles.push({
          file: file,
          name: file.name,
          size: file.size,
          preview: this.createFilePreview(file)
        });
      }
    });
    
    this.updateFileDisplay();
  }

  /**
   * Validate uploaded file
   */
  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      this.showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
      return false;}
    
    if (!allowedTypes.includes(file.type)) {
      this.showError(`File "${file.name}" is not a supported image format.`);
      return false;}
    
    return true;}

  /**
   * Create file preview
   */
  createFilePreview(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Update file display
   */
  async updateFileDisplay() {
    const container = this.modal.querySelector('.uploaded-files');
    if (!container) return;if (this.uploadedFiles.length === 0) {
      container.innerHTML = '';
      return;}
    
    const filesHTML = await Promise.all(
      this.uploadedFiles.map(async (fileData, index) => {
        const preview = await fileData.preview;
        return `
          <div class="uploaded-file">
            <img src="${preview}" alt="Preview" class="file-preview">
            <div class="file-info">
              <div class="file-name">${fileData.name}</div>
              <div class="file-size">${this.formatFileSize(fileData.size)}</div>
            </div>
            <button type="button" class="remove-file-btn" 
                    data-action="remove-file" data-index="${index}">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;})
    );
    
    container.innerHTML = filesHTML.join('');
  }

  /**
   * Remove uploaded file
   */
  removeFile(index) {
    this.uploadedFiles.splice(index, 1);
    this.updateFileDisplay();
  }

  /**
   * Handle player name search/autocomplete
   */
  async handlePlayerSearch(query, playerIndex) {
    if (query.length < 2) return;try {
      const gameType = ladderCore.getCurrentGameType();
      const response = await fetch(`/api/ladder/players/search?q=${encodeURIComponent(query)}&game=${gameType}`);
      
      if (response.ok) {
        const players = await response.json();
        this.showPlayerSuggestions(players, playerIndex);
      }
    } catch (error) {
      console.error('Player search failed:', error);
    }
  }

  /**
   * Show player suggestions dropdown
   */
  showPlayerSuggestions(players, playerIndex) {
    // Remove existing suggestions
    const existingSuggestions = this.modal.querySelector('.player-suggestions');
    if (existingSuggestions) existingSuggestions.remove();
    
    if (players.length === 0) return;const playerInput = this.modal.querySelectorAll('.player-input')[playerIndex];
    if (!playerInput) return;const suggestions = document.createElement('div');
    suggestions.className = 'player-suggestions';
    suggestions.innerHTML = players.slice(0, 5).map(player => `
      <div class="suggestion-item" data-player-name="${player.name}" data-player-id="${player._id}">
        <img src="/assets/img/ranks/${player.currentRank?.image || 'emblem.png'}" 
             alt="${player.currentRank?.name || 'Unranked'}" class="rank-icon">
        <span class="player-name">${player.name}</span>
        <span class="player-rank">${player.currentRank?.name || 'Unranked'}</span>
      </div>
    `).join('');
    
    // Position suggestions
    const rect = playerInput.getBoundingClientRect();
    suggestions.style.position = 'absolute';
    suggestions.style.top = (rect.bottom + window.scrollY) + 'px';
    suggestions.style.left = rect.left + 'px';
    suggestions.style.width = rect.width + 'px';
    
    // Handle suggestion clicks
    suggestions.addEventListener('click', (e) => {
      const item = e.target.closest('.suggestion-item');
      if (item) {
        playerInput.value = item.dataset.playerName;
        suggestions.remove();
        this.validatePlayer(item.dataset.playerName, playerIndex);
      }
    });
    
    document.body.appendChild(suggestions);
    
    // Remove suggestions when clicking elsewhere
    const removeSuggestions = (e) => {
      if (!suggestions.contains(e.target) && e.target !== playerInput) {
        suggestions.remove();
        document.removeEventListener('click', removeSuggestions);
      }
    };
    setTimeout(() => document.addEventListener('click', removeSuggestions), 100);
  }

  /**
   * Validate player name
   */
  async validatePlayer(playerName, playerIndex) {
    if (!playerName) return;try {
      const gameType = ladderCore.getCurrentGameType();
      const response = await fetch(`/api/ladder/players/validate?name=${encodeURIComponent(playerName)}&game=${gameType}`);
      
      const playerInput = this.modal.querySelectorAll('.player-input')[playerIndex];
      const feedback = playerInput.parentElement.querySelector('.validation-feedback');
      
      if (response.ok) {
        const player = await response.json();
        this.selectedPlayers[playerIndex] = player;
        
        if (feedback) {
          feedback.textContent = '✓ Player found';
          feedback.className = 'validation-feedback valid';
        }
        playerInput.classList.add('valid');
        playerInput.classList.remove('invalid');
      } else {
        this.selectedPlayers[playerIndex] = null;
        
        if (feedback) {
          feedback.textContent = '✗ Player not found';
          feedback.className = 'validation-feedback invalid';
        }
        playerInput.classList.add('invalid');
        playerInput.classList.remove('valid');
      }
    } catch (error) {
      console.error('Player validation failed:', error);
    }
  }

  /**
   * Submit match report
   */
  async submitMatch() {
    if (!this.validateForm()) return;const submitBtn = this.modal.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      const formData = new FormData();
      
      // Add form fields
      const form = this.modal.querySelector('#report-match-form');
      const formFields = new FormData(form);
      for (const [key, value] of formFields.entries()) {
        formData.append(key, value);
      }
      
      // Add game type
      formData.append('gameType', ladderCore.getCurrentGameType());
      
      // Add player data
      formData.append('players', JSON.stringify(this.selectedPlayers.filter(p => p)));
      
      // Add uploaded files
      this.uploadedFiles.forEach((fileData, index) => {
        formData.append(`screenshots`, fileData.file);
      });
      
      const response = await fetch('/api/ladder/matches/report', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Trigger epic victory animation
        const customEvent = new CustomEvent('matchSubmitted', {
          detail: {
            success: true,
            result: {
              matchId: result.matchId || 'match_' + Date.now(),
              gameType: result.gameType || 'wc2',
              matchType: result.matchType || '1v1',
              mmrChange: result.mmrChange || 0,
              rankChange: result.rankChange || false,
              rewards: {
                arenaGold: result.rewards?.arenaGold || 15,
                honor: result.rewards?.honor || 10,
                experience: result.rewards?.experience || 25
              }
            }
          }
        });
        document.dispatchEvent(customEvent);
        
        this.closeModal();
        
        // Refresh data
        ladderCore.notifyModules('matchReported', result);
      } else {
        const error = await response.json();
        this.showValidationError(error.message || 'Failed to submit match report');
      }
      
    } catch (error) {
      console.error('Match submission failed:', error);
      this.showValidationError('Failed to submit match report. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  /**
   * Validate the entire form
   */
  validateForm() {
    let isValid = true;
    const errors = [];
    
    // Check required fields
    const requiredFields = this.modal.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        errors.push(`${field.labels[0]?.textContent || field.name} is required`);
        field.classList.add('invalid');
        isValid = false;
      } else {
        field.classList.remove('invalid');
      }
    });
    
    // Check player validation
    const validPlayers = this.selectedPlayers.filter(p => p);
    if (validPlayers.length < 2) {
      errors.push('At least 2 valid players are required');
      isValid = false;
    }
    
    // Check for screenshot
    if (this.uploadedFiles.length === 0) {
      errors.push('At least one screenshot is required');
      isValid = false;
    }
    
    if (errors.length > 0) {
      this.showValidationErrors(errors);
    } else {
      this.clearValidationErrors();
    }
    
    return isValid;}

  /**
   * Show validation errors
   */
  showValidationErrors(errors) {
    const errorContainer = this.modal.querySelector('.form-errors');
    if (errorContainer) {
      errorContainer.innerHTML = errors.map(error => `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          ${error}
        </div>
      `).join('');
      errorContainer.style.display = 'block';
    }
  }

  /**
   * Clear validation errors
   */
  clearValidationErrors() {
    const errorContainer = this.modal.querySelector('.form-errors');
    if (errorContainer) {
      errorContainer.style.display = 'none';
      errorContainer.innerHTML = '';
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    ladderCore.showNotification(message, 'success');
  }

  /**
   * Show themed validation error message
   */
  showValidationError(message) {
    // Use global notification system if available
    if (window.showError) {
      window.showError(message);
    } else {
      // Fallback to creating toast directly
      this.createValidationToast(message);
    }
  }

  /**
   * Create validation toast notification
   */
  createValidationToast(message) {
    // Remove any existing validation toasts
    const existing = document.querySelector('.ladder-validation-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'ladder-validation-toast';
    toast.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: rgba(220, 38, 38, 0.95);
      border: 2px solid #dc2626;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      min-width: 300px;
      max-width: 500px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.95rem;
      font-weight: 500;
      line-height: 1.4;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      z-index: 99999;
      cursor: pointer;
      transition: all 0.3s ease;
      animation: slideInRight 0.3s ease forwards;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
        <i class="fas fa-exclamation-circle" style="font-size: 1.2rem; margin-top: 0.1rem; flex-shrink: 0;"></i>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">Match Submission Error</div>
          <div>${message}</div>
        </div>
        <button style="
          background: none;
          border: none;
          color: #ffffff;
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

    // Add animation styles if not present
    if (!document.querySelector('#ladder-toast-styles')) {
      const styles = document.createElement('style');
      styles.id = 'ladder-toast-styles';
      styles.textContent = `
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
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .ladder-validation-toast:hover {
          transform: translateX(-5px) scale(1.02);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4);
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    const autoRemove = setTimeout(() => {
      this.removeValidationToast(toast);
    }, 5000);

    // Click to close
    const closeBtn = toast.querySelector('button');
    const clickToClose = () => {
      clearTimeout(autoRemove);
      this.removeValidationToast(toast);
    };

    closeBtn.addEventListener('click', clickToClose);
    toast.addEventListener('click', clickToClose);
  }

  /**
   * Remove validation toast
   */
  removeValidationToast(toast) {
    if (!toast || !toast.parentNode) return;toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Show error message
   */
  showError(message) {
    ladderCore.showNotification(message, 'error');
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];}

  /**
   * Handle events from other modules
   */
  handleEvent(eventType, data) {
    switch (eventType) {
      case 'gameTypeChanged':
        // Clear form when game type changes
        if (this.modal && this.modal.style.display !== 'none') {
          this.resetForm();
        }
        break;
    }
  }
}

// Create and export instance
export const ladderMatchReporting = new LadderMatchReporting();

// Register with core
ladderCore.registerModule('matchReporting', ladderMatchReporting);

// Global function for opening modal
window.openReportModal = () => ladderMatchReporting.openModal(); 