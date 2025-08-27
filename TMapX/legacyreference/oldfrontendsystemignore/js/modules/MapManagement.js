/**
 * MapManagement.js - Map Upload, Edit, and Management Operations
 * 
 * Extracted from the 72KB maps.js monster.
 * Handles map upload, editing, import operations, and form management.
 * 
 * Responsibilities:
 * - Map upload functionality and form handling
 * - Map editing and update operations
 * - Import operations and bulk management
 * - Form validation and file processing
 * - Progress tracking and error handling
 */

import { apiClient } from './ApiClient.js';

export class MapManagement {
  constructor() {
    this.uploadInProgress = false;
    this.importInProgress = false;
    this.currentEditingMap = null;
  }

  /**
   * Initialize the map management system
   */
  init() {
    console.log('🚀 Initializing Map Management...');
    
    // Cache DOM elements
    this.uploadModal = document.getElementById('upload-map-modal');
    this.mapDetailsModal = document.getElementById('map-details-modal');
    
    this.setupUploadForm();
    this.setupModalCloseButtons();
    
    console.log('✅ Map Management initialized');
  }

  /**
   * Setup modal close button functionality
   */
  setupModalCloseButtons() {
    // Setup upload modal close functionality
    const uploadModal = document.getElementById('upload-map-modal');
    if (uploadModal) {
      // Close button inside modal
      const closeBtn = uploadModal.querySelector('.close-modal');
      if (closeBtn && !closeBtn.hasAttribute('data-listener-added')) {
        closeBtn.addEventListener('click', () => {
          this.hideUploadModal();
        });
        closeBtn.setAttribute('data-listener-added', 'true');
      }
      
      // Click outside modal to close
      if (!uploadModal.hasAttribute('data-listener-added')) {
        uploadModal.addEventListener('click', (e) => {
          if (e.target === uploadModal) {
            this.hideUploadModal();
          }
        });
        uploadModal.setAttribute('data-listener-added', 'true');
      }
    }
    
    // ESC key to close modal
    if (!this.escListenerAdded) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          // Check if upload modal is open
          const modal = document.getElementById('upload-map-modal');
          if (modal && modal.classList.contains('show')) {
            this.hideUploadModal();
          }
        }
      });
      this.escListenerAdded = true;
    }
    
    console.log('🔧 Modal close functionality setup');
  }

  /**
   * Setup global functions for backward compatibility
   */
  setupGlobalFunctions() {
    window.mapManagement = this;
    window.uploadMap = () => this.uploadMap();
    window.showEditMapForm = (mapId) => this.showEditMapForm(mapId);
    window.updateMap = (mapId, formData) => this.updateMap(mapId, formData);

    
    console.log('🌐 Map management functions registered');
  }

  /**
   * Setup upload form
   */
  setupUploadForm() {
    const uploadForm = document.getElementById('upload-map-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.uploadMap();
      });
    }

    console.log('📝 Upload form setup complete');
  }

  /**
   * Setup form event handlers
   */
  setupFormHandlers() {
    const uploadForm = document.getElementById('upload-map-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.uploadMap();
      });
    }

    console.log('📝 Form handlers setup complete');
  }

  /**
   * Show upload modal
   */
  showUploadModal() {
    const modal = document.getElementById('upload-map-modal');
    if (!modal) {
      console.error('❌ Upload modal not found');
      return;}
    
    modal.classList.add('show');
    
    // Setup form handlers if not already done
    this.setupUploadForm();
  }

  /**
   * Hide upload modal
   */
  hideUploadModal() {
    const modal = document.getElementById('upload-map-modal');
    if (modal) {
      modal.classList.remove('show', 'active', 'opening');
      modal.classList.add('closing');
      
      // Remove closing class after animation
      setTimeout(() => {
        modal.classList.remove('closing');
      }, 300);
      
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
  }

  /**
   * Upload map functionality
   */
  async uploadMap() {
    console.log('🚀 uploadMap function called');
    const form = document.getElementById('upload-map-form');
    const formData = new FormData();
    
    // Get form data
    const fileInput = document.getElementById('map-file');
    const mapNameText = document.getElementById('map-name-text');
    const descriptionInput = document.getElementById('map-description');
    
    if (!fileInput.files[0]) {
      this.showError('Please select a map file');
      return;}
    
    const file = fileInput.files[0];
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pud')) {
      this.showError('Only .pud files are allowed for maps');
      return;}
    
    // Get the map name from the display text
    const mapName = mapNameText ? mapNameText.textContent.trim() : file.name.replace(/\.pud$/i, '');
    
    if (!mapName) {
      this.showError('Map name could not be determined');
      return;}
    
    // Build form data
    formData.append('mapFile', file);
    formData.append('name', mapName);
    if (descriptionInput.value.trim()) {
      formData.append('description', descriptionInput.value.trim());
    }
    
    console.log('📤 Uploading map:', {
      filename: file.name,
      name: mapName,
      size: file.size,
      description: descriptionInput.value.trim() || 'None provided'
    });
    
    try {
      this.showUploadProgress(0);
      
      const result = await apiClient.uploadWC2Map(formData);
      
      if (!result.success) {
        throw new Error(`Upload failed: ${result.error || result.details || 'Unknown error'}`);
      }
      
      this.hideUploadProgress();
      this.hideUploadModal();
      
      let successMessage = '✅ Map uploaded successfully! Generating thumbnails...';
      
      // Check if achievements were awarded and update UI immediately
      if (result.achievementsAwarded && result.achievementsAwarded > 0) {
        successMessage = `🏆 Map uploaded successfully! ${result.achievementsAwarded} achievement${result.achievementsAwarded > 1 ? 's' : ''} unlocked!`;
        
        // Use new unified achievement system
        if (window.achievementEngine && window.achievementUI && result.userUpdates) {
          // Update progress through achievement engine
          window.achievementEngine.updateUserProgress(result.userUpdates);
        } else if (result.userUpdates && window.profileUIManager) {
          // Fallback to old system
          window.profileUIManager.updateExperienceBar(result.userUpdates);
        } else {
          console.warn('⚠️ No achievement system available');
        }
      }
      this.showSuccess(successMessage);
      
      // Reload the maps grid to show the new map
      if (typeof window.mapsGrid !== 'undefined' && window.mapsGrid.loadMaps) {
        setTimeout(() => {
          window.mapsGrid.loadMaps();
        }, 1000);
      }
      
      // Reset form
      form.reset();
      const mapNameDisplay = document.getElementById('map-name-display');
      if (mapNameDisplay) mapNameDisplay.style.display = 'none';
      
      const submitBtn = document.getElementById('upload-map-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Select a PUD file first</span>';
      }
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('❌ Error stack:', error.stack);
      this.hideUploadProgress();
      this.showError(`❌ Failed to upload map: ${error.message}`);
    }
  }

  /**
   * Show edit map form
   */
  async showEditMapForm(mapId) {
    try {
      console.log(`✏️ Showing edit form for map: ${mapId}`);
      
      // Get map data
      let mapData = window.mapsGrid?.getCachedMap(mapId);
      
      if (!mapData) {
        // Load from API
        mapData = await apiClient.getMap(mapId);
      }

      this.currentEditingMap = mapData;
      this.renderEditForm(mapData);
      
    } catch (error) {
      console.error('❌ Failed to load map for editing:', error);
      this.showError(`Failed to load map: ${error.message}`);
    }
  }

  /**
   * Render edit form
   */
  renderEditForm(map) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-map-form-overlay';
    editForm.innerHTML = `
      <div class="edit-map-modal">
        <div class="edit-map-content">
          <h3>Edit Map: ${this.escapeHtml(map.name)}</h3>
          <form id="edit-map-form" class="edit-form">
            <div class="form-group">
              <label for="edit-map-name">Map Name:</label>
              <input type="text" id="edit-map-name" name="name" value="${this.escapeHtml(map.name)}" required>
            </div>
            
            <div class="form-group">
              <label for="edit-map-description">Description:</label>
              <textarea id="edit-map-description" name="description" rows="4" placeholder="Enter map description...">${this.escapeHtml(map.description || '')}</textarea>
            </div>
            
            <div class="form-group">
              <label for="edit-map-creator">Creator:</label>
              <input type="text" id="edit-map-creator" name="creator" value="${this.escapeHtml(map.creator || '')}" placeholder="Enter creator name">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="edit-map-type">Map Type:</label>
                <select id="edit-map-type" name="type">
                  <option value="melee" ${map.type === 'melee' ? 'selected' : ''}>Melee</option>
                  <option value="custom" ${map.type === 'custom' ? 'selected' : ''}>Custom</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="edit-map-size">Map Size:</label>
                <select id="edit-map-size" name="size">
                  <option value="32x32" ${map.size === '32x32' ? 'selected' : ''}>32x32</option>
                  <option value="64x64" ${map.size === '64x64' ? 'selected' : ''}>64x64</option>
                  <option value="96x96" ${map.size === '96x96' ? 'selected' : ''}>96x96</option>
                  <option value="128x128" ${map.size === '128x128' ? 'selected' : ''}>128x128</option>
                  <option value="other" ${!['32x32', '64x64', '96x96', '128x128'].includes(map.size) ? 'selected' : ''}>Other</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Player Count:</label>
              <div class="player-count-inputs">
                <input type="number" id="edit-map-players-min" name="playerCountMin" 
                       value="${map.playerCount?.min || 2}" min="1" max="8" placeholder="Min">
                <span>to</span>
                <input type="number" id="edit-map-players-max" name="playerCountMax" 
                       value="${map.playerCount?.max || 8}" min="1" max="8" placeholder="Max">
              </div>
            </div>
            
            <div class="form-group">
              <label for="edit-map-tags">Tags (comma-separated):</label>
              <input type="text" id="edit-map-tags" name="tags" 
                     value="${map.tags?.join(', ') || ''}" 
                     placeholder="e.g., naval, 1v1, resource-rich">
            </div>
            
            <div class="info-note">
              <i class="fas fa-info-circle"></i>
              <strong>Note:</strong> Map thumbnails are automatically generated from the original PUD file. 
              To update the thumbnail, you would need to re-upload the map.
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Save Changes
              </button>
              <button type="button" class="btn btn-secondary cancel-edit-btn">
                <i class="fas fa-times"></i> Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Add to body
    document.body.appendChild(editForm);
    document.body.style.overflow = 'hidden';

    // Setup event listeners
    const form = editForm.querySelector('#edit-map-form');
    const cancelBtn = editForm.querySelector('.cancel-edit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.updateMap(map._id, new FormData(form));
    });

    cancelBtn.addEventListener('click', () => {
      this.closeEditForm();
    });

    // Close on overlay click
    editForm.addEventListener('click', (e) => {
      if (e.target === editForm) {
        this.closeEditForm();
      }
    });
  }

  /**
   * Close edit form
   */
  closeEditForm() {
    const editForm = document.querySelector('.edit-map-form-overlay');
    if (editForm) {
      editForm.remove();
      document.body.style.overflow = '';
    }
    this.currentEditingMap = null;
  }

  /**
   * Update map details
   */
  async updateMap(mapId, formData) {
    try {
      console.log(`💾 Updating map: ${mapId}`);
      
      // Show loading state
      const submitBtn = document.querySelector('#edit-map-form button[type="submit"]');
      const originalHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      // Prepare map data
      const mapData = {
        name: formData.get('name'),
        description: formData.get('description'),
        creator: formData.get('creator'),
        type: formData.get('type'),
        size: formData.get('size'),
        playerCount: {
          min: parseInt(formData.get('playerCountMin')) || 2,
          max: parseInt(formData.get('playerCountMax')) || 8
        },
        tags: formData.get('tags')
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      };

      // Validate data
      if (!this.validateMapData(mapData)) {
        return;}

      const result = await apiClient.updateWC2Map(mapId, mapData);
      
      if (result.success) {
        this.showSuccess('Map updated successfully!');
        
        // Close edit form
        this.closeEditForm();
        
        // Refresh maps list
        if (window.mapsGrid && typeof window.mapsGrid.loadMaps === 'function') {
          await window.mapsGrid.loadMaps();
        }
        
        // Refresh map details if open
        if (window.mapDetails && window.mapDetails.currentMapId === mapId) {
          await window.mapDetails.viewMapDetails(mapId);
        }
        
        console.log('✅ Map updated successfully');
      } else {
        throw new Error(result.error || 'Unknown update error');
      }

    } catch (error) {
      console.error('❌ Failed to update map:', error);
      this.showError(`Update failed: ${error.message}`);
    } finally {
      // Reset button state
      const submitBtn = document.querySelector('#edit-map-form button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      }
    }
  }

  /**
   * Validate map data
   */
  validateMapData(mapData) {
    if (!mapData.name || mapData.name.trim().length === 0) {
      this.showError('Map name is required');
      return false;}

    if (mapData.name.trim().length > 100) {
      this.showError('Map name must be less than 100 characters');
      return false;}

    if (mapData.description && mapData.description.length > 1000) {
      this.showError('Description must be less than 1000 characters');
      return false;}

    if (mapData.playerCount.min > mapData.playerCount.max) {
      this.showError('Minimum player count cannot be greater than maximum');
      return false;}

    if (mapData.playerCount.min < 1 || mapData.playerCount.max > 8) {
      this.showError('Player count must be between 1 and 8');
      return false;}

    if (mapData.tags.length > 10) {
      this.showError('Maximum 10 tags allowed');
      return false;}

    return true;}



  /**
   * Utility methods
   */
  escapeHtml(text) {
    if (!text) return '';const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;}

  /**
   * Show error message
   */
  showError(message) {
    if (typeof window.NotificationUtils !== 'undefined') {
      window.NotificationUtils.error(message, 5000);
    } else {
      alert(`Error: ${message}`);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    if (typeof window.NotificationUtils !== 'undefined') {
      window.NotificationUtils.success(message, 3000);
    } else {
      console.log(`Success: ${message}`);
    }
  }

  /**
   * Show upload progress
   */
  showUploadProgress(percentage) {
    const progressContainer = document.querySelector('.upload-progress');
    const progressBar = document.querySelector('.upload-progress-bar');
    const progressText = document.querySelector('.upload-progress-text');
    
    if (progressContainer) {
      progressContainer.style.display = 'block';
    }
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `Uploading... ${percentage}%`;
    }
    
    console.log(`📊 Upload progress: ${percentage}%`);
  }

  /**
   * Hide upload progress
   */
  hideUploadProgress() {
    const progressContainer = document.querySelector('.upload-progress');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
    console.log('📊 Upload progress hidden');
  }

  /**
   * Hide modal (generic method)
   */
  hideModal() {
    this.hideUploadModal();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('🧹 Cleaning up Map Management...');
    
    this.uploadInProgress = false;
    this.importInProgress = false;
    this.currentEditingMap = null;
    
    // Close any open modals
    this.hideUploadModal();
    this.closeEditForm();

    console.log('✅ Map Management cleanup complete');
  }
}

// Create and export singleton instance
export const mapManagement = new MapManagement(); 