/**
 * Wiki Editor Module
 * Handles editing functionality for Wizard's Tower wiki content
 */

class WikiEditor {
  constructor() {
    this.isEditing = false;
    this.currentEdit = null;
    this.originalData = null;
    this.currentGameUnit = null;
    this.apiBaseUrl = '/api/wiki';
    
    this.init();
  }

  init() {
    console.log('🔧 Initializing Wiki Editor...');
    this.setupEventListeners();
    this.loadUserContributions();
  }

  setupEventListeners() {
    // Edit button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('.wiki-edit-btn')) {
        const gameUnitId = e.target.dataset.gameUnitId;
        this.startEdit(gameUnitId);
      }
      
      if (e.target.matches('.wiki-save-btn')) {
        this.saveEdit();
      }
      
      if (e.target.matches('.wiki-cancel-btn')) {
        this.cancelEdit();
      }
      
      if (e.target.matches('.wiki-history-btn')) {
        const gameUnitId = e.target.dataset.gameUnitId;
        this.showEditHistory(gameUnitId);
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.matches('.wiki-edit-form')) {
        e.preventDefault();
        this.handleFormSubmit(e.target);
      }
    });
  }

  async startEdit(gameUnitId) {
    try {
      if (this.isEditing) {
        if (!confirm('You have unsaved changes. Do you want to discard them and start a new edit?')) {
          return;}
        this.cancelEdit();
      }

      // Get game unit data
      const response = await fetch(`${this.apiBaseUrl}/unit/${gameUnitId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      this.currentGameUnit = result.data.unit;
      this.originalData = JSON.parse(JSON.stringify(this.currentGameUnit));
      this.isEditing = true;

      this.showEditInterface();
      this.populateEditForm();

    } catch (error) {
      console.error('Error starting edit:', error);
      this.showNotification('Failed to start edit: ' + error.message, 'error');
    }
  }

  showEditInterface() {
    // Find the game unit card
    const unitCard = document.querySelector(`[data-unit-id="${this.currentGameUnit._id}"]`);
    if (!unitCard) {
      console.error('Could not find unit card for editing');
      return;}

    // Create edit overlay
    const editOverlay = this.createEditOverlay();
    unitCard.appendChild(editOverlay);

    // Add editing class
    unitCard.classList.add('editing');
  }

  createEditOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'wiki-edit-overlay';
    overlay.innerHTML = `
      <div class="wiki-edit-container">
        <div class="wiki-edit-header">
          <h3><i class="fas fa-edit"></i> Edit ${this.currentGameUnit.name}</h3>
          <button class="wiki-cancel-btn btn-secondary">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
        
        <form class="wiki-edit-form">
          <div class="edit-tabs">
            <button type="button" class="edit-tab active" data-tab="basic">Basic Info</button>
            <button type="button" class="edit-tab" data-tab="stats">Stats</button>
            <button type="button" class="edit-tab" data-tab="costs">Costs</button>
            <button type="button" class="edit-tab" data-tab="abilities">Abilities</button>
            <button type="button" class="edit-tab" data-tab="advanced">Advanced</button>
          </div>

          <div class="edit-content">
            <!-- Basic Info Tab -->
            <div class="edit-tab-content active" data-tab="basic">
              <div class="form-group">
                <label for="edit-name">Name</label>
                <input type="text" id="edit-name" name="name" required>
              </div>
              
              <div class="form-group">
                <label for="edit-description">Description</label>
                <textarea id="edit-description" name="description" rows="4" required></textarea>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-type">Type</label>
                  <select id="edit-type" name="type">
                    <option value="unit">Unit</option>
                    <option value="building">Building</option>
                    <option value="hero">Hero</option>
                    <option value="item">Item</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="edit-category">Category</label>
                  <select id="edit-category" name="category">
                    <option value="">Select category</option>
                    <option value="creep">Creep</option>
                    <option value="mercenary">Mercenary</option>
                    <option value="hero">Hero</option>
                    <option value="building">Building</option>
                    <option value="consumable">Consumable</option>
                    <option value="permanent">Permanent</option>
                    <option value="artifact">Artifact</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Stats Tab -->
            <div class="edit-tab-content" data-tab="stats">
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-hp">Hit Points</label>
                  <input type="number" id="edit-hp" name="stats.hp" min="0">
                </div>
                
                <div class="form-group">
                  <label for="edit-mana">Mana</label>
                  <input type="number" id="edit-mana" name="stats.mana" min="0">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-attack">Attack</label>
                  <input type="text" id="edit-attack" name="stats.attack" placeholder="e.g., 6-8">
                </div>
                
                <div class="form-group">
                  <label for="edit-armor">Armor</label>
                  <input type="number" id="edit-armor" name="stats.armor" min="0">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-range">Range</label>
                  <input type="number" id="edit-range" name="stats.range" min="0">
                </div>
                
                <div class="form-group">
                  <label for="edit-sight">Sight</label>
                  <input type="number" id="edit-sight" name="stats.sight" min="0">
                </div>
                
                <div class="form-group">
                  <label for="edit-speed">Speed</label>
                  <input type="number" id="edit-speed" name="stats.speed" min="0" step="0.1">
                </div>
              </div>
            </div>

            <!-- Costs Tab -->
            <div class="edit-tab-content" data-tab="costs">
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-gold">Gold</label>
                  <input type="number" id="edit-gold" name="costs.gold" min="0">
                </div>
                
                <div class="form-group">
                  <label for="edit-wood">Wood</label>
                  <input type="number" id="edit-wood" name="costs.wood" min="0">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-food">Food</label>
                  <input type="number" id="edit-food" name="costs.food" min="0">
                </div>
                
                <div class="form-group">
                  <label for="edit-oil">Oil</label>
                  <input type="number" id="edit-oil" name="costs.oil" min="0">
                </div>
              </div>
              
              <div class="form-group">
                <label for="edit-production-time">Production Time (seconds)</label>
                <input type="number" id="edit-production-time" name="production.time" min="0">
              </div>
            </div>

            <!-- Abilities Tab -->
            <div class="edit-tab-content" data-tab="abilities">
              <div class="abilities-container">
                <div class="abilities-header">
                  <h4>Abilities</h4>
                  <button type="button" class="add-ability-btn">
                    <i class="fas fa-plus"></i> Add Ability
                  </button>
                </div>
                <div id="abilities-list"></div>
              </div>
            </div>

            <!-- Advanced Tab -->
            <div class="edit-tab-content" data-tab="advanced">
              <div class="form-group">
                <label for="edit-requirements">Requirements (comma-separated)</label>
                <input type="text" id="edit-requirements" name="requirements" 
                       placeholder="e.g., Barracks, Upgrade Name">
              </div>
              
              <div class="form-group">
                <label for="edit-sources">Sources</label>
                <div id="sources-container">
                  <button type="button" class="add-source-btn">
                    <i class="fas fa-plus"></i> Add Source
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Edit Summary -->
          <div class="edit-summary-section">
            <div class="form-group">
              <label for="edit-summary">Edit Summary *</label>
              <input type="text" id="edit-summary" name="summary" required 
                     placeholder="Briefly describe what you changed">
            </div>
            
            <div class="form-group">
              <label for="edit-description-long">Detailed Description (optional)</label>
              <textarea id="edit-description-long" name="description" rows="3" 
                        placeholder="Provide more details about your changes"></textarea>
            </div>
          </div>

          <div class="edit-actions">
            <button type="submit" class="wiki-save-btn btn-primary">
              <i class="fas fa-save"></i> Submit Edit
            </button>
            <button type="button" class="wiki-cancel-btn btn-secondary">
              <i class="fas fa-times"></i> Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    // Set up tab switching
    overlay.addEventListener('click', (e) => {
      if (e.target.matches('.edit-tab')) {
        this.switchEditTab(e.target.dataset.tab);
      }
    });

    return overlay;}

  switchEditTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.edit-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.edit-tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });
  }

  populateEditForm() {
    const form = document.querySelector('.wiki-edit-form');
    if (!form) return;this.setFormValue(form, 'name', this.currentGameUnit.name);
    this.setFormValue(form, 'description', this.currentGameUnit.description);
    this.setFormValue(form, 'type', this.currentGameUnit.type);
    this.setFormValue(form, 'category', this.currentGameUnit.category);

    // Stats
    if (this.currentGameUnit.stats) {
      this.setFormValue(form, 'stats.hp', this.currentGameUnit.stats.hp);
      this.setFormValue(form, 'stats.mana', this.currentGameUnit.stats.mana);
      this.setFormValue(form, 'stats.attack', this.currentGameUnit.stats.attack);
      this.setFormValue(form, 'stats.armor', this.currentGameUnit.stats.armor);
      this.setFormValue(form, 'stats.range', this.currentGameUnit.stats.range);
      this.setFormValue(form, 'stats.sight', this.currentGameUnit.stats.sight);
      this.setFormValue(form, 'stats.speed', this.currentGameUnit.stats.speed);
    }

    // Costs
    if (this.currentGameUnit.costs) {
      this.setFormValue(form, 'costs.gold', this.currentGameUnit.costs.gold);
      this.setFormValue(form, 'costs.wood', this.currentGameUnit.costs.wood);
      this.setFormValue(form, 'costs.food', this.currentGameUnit.costs.food);
      this.setFormValue(form, 'costs.oil', this.currentGameUnit.costs.oil);
    }

    // Production
    if (this.currentGameUnit.production) {
      this.setFormValue(form, 'production.time', this.currentGameUnit.production.time);
    }

    // Requirements
    if (this.currentGameUnit.requirements && this.currentGameUnit.requirements.buildings) {
      this.setFormValue(form, 'requirements', this.currentGameUnit.requirements.buildings.join(', '));
    }
  }

  setFormValue(form, name, value) {
    const field = form.querySelector(`[name="${name}"]`);
    if (field && value !== undefined && value !== null) {
      field.value = value;
    }
  }

  async handleFormSubmit(form) {
    try {
      const formData = new FormData(form);
      const changes = this.extractChanges(formData);
      
      if (Object.keys(changes.newData).length === 0) {
        this.showNotification('No changes detected.', 'warning');
        return;}

      const summary = formData.get('summary');
      if (!summary || summary.trim().length === 0) {
        this.showNotification('Edit summary is required.', 'error');
        return;}

      const editData = {
        modifiedFields: changes.modifiedFields,
        newData: changes.newData,
        summary: summary.trim(),
        description: formData.get('description') || '',
        sources: this.extractSources(form)
      };

      await this.submitEdit(editData);

    } catch (error) {
      console.error('Error submitting edit:', error);
      this.showNotification('Failed to submit edit: ' + error.message, 'error');
    }
  }

  extractChanges(formData) {
    const changes = {
      modifiedFields: [],
      newData: {}
    };

    // Convert form data to object
    const newData = {};
    for (let [key, value] of formData.entries()) {
      if (key === 'summary' || key === 'description') continue;
      
      // Handle nested properties
      if (key.includes('.')) {
        this.setNestedProperty(newData, key, value);
      } else {
        newData[key] = value;
      }
    }

    // Compare with original data
    this.compareObjects(this.originalData, newData, '', changes);

    return changes;}

  compareObjects(original, updated, prefix, changes) {
    for (let key in updated) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const originalValue = this.getNestedProperty(original, fullKey);
      const updatedValue = updated[key];

      if (originalValue !== updatedValue) {
        changes.modifiedFields.push(fullKey);
        changes.newData[fullKey] = updatedValue;
      }
    }
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);}

  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];}, obj);
    
    // Convert numeric strings to numbers for stats/costs
    if (['hp', 'mana', 'armor', 'range', 'sight', 'speed', 'gold', 'wood', 'food', 'oil', 'time'].includes(lastKey)) {
      value = value === '' ? null : Number(value);
    }
    
    target[lastKey] = value;
  }

  extractSources(form) {
    // TODO: Implement source extraction
    return [];}

  async submitEdit(editData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameUnitId: this.currentGameUnit._id,
          editData
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      this.showNotification(result.message, 'success');
      this.cancelEdit();

      // Show achievement notification if this was their first edit
      if (result.edit && result.edit.achievements && result.edit.achievements.firstEdit) {
        this.showAchievementNotification('Knowledge Seeker', 'First wiki contribution completed!');
      }

      // Refresh the page data if auto-approved
      if (result.autoApproved) {
        this.refreshGameUnitDisplay();
      }

    } catch (error) {
      console.error('Error submitting edit:', error);
      throw error;
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.currentEdit = null;
    this.originalData = null;
    this.currentGameUnit = null;

    // Remove edit overlay
    const overlay = document.querySelector('.wiki-edit-overlay');
    if (overlay) {
      overlay.remove();
    }

    // Remove editing class
    document.querySelectorAll('.editing').forEach(el => {
      el.classList.remove('editing');
    });
  }

  async showEditHistory(gameUnitId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/history/${gameUnitId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      this.displayEditHistoryModal(result.data);

    } catch (error) {
      console.error('Error loading edit history:', error);
      this.showNotification('Failed to load edit history: ' + error.message, 'error');
    }
  }

  displayEditHistoryModal(historyData) {
    const modal = document.createElement('div');
    modal.className = 'wiki-history-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-history"></i> Edit History</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="history-list">
            ${historyData.edits.map(edit => `
              <div class="history-item ${edit.status}">
                <div class="history-header">
                  <span class="editor">${edit.editor.username}</span>
                  <span class="timestamp">${new Date(edit.createdAt).toLocaleDateString()}</span>
                  <span class="status status-${edit.status}">${edit.status}</span>
                </div>
                <div class="history-summary">${edit.changes.summary}</div>
                ${edit.changes.description ? `<div class="history-description">${edit.changes.description}</div>` : ''}
                <div class="history-votes">
                  <span class="helpful"><i class="fas fa-thumbs-up"></i> ${edit.votes.helpful}</span>
                  <span class="unhelpful"><i class="fas fa-thumbs-down"></i> ${edit.votes.unhelpful}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal events
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.matches('.modal-close')) {
        modal.remove();
      }
    });
  }

  async loadUserContributions() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contributions`);
      if (!response.ok) return;const result = await response.json();
      if (result.success) {
        this.userContributions = result.data;
        this.updateContributionUI();
      }
    } catch (error) {
      console.log('User contributions not available (likely not logged in)');
    }
  }

  updateContributionUI() {
    if (!this.userContributions) return;const statsContainer = document.querySelector('.wiki-user-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="wiki-stats">
          <div class="stat-item">
            <span class="stat-label">Edits:</span>
            <span class="stat-value">${this.userContributions.stats.totalEdits}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Approved:</span>
            <span class="stat-value">${this.userContributions.stats.approvedEdits}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Reputation:</span>
            <span class="stat-value">${this.userContributions.reputation.score}</span>
          </div>
        </div>
      `;
    }
  }

  refreshGameUnitDisplay() {
    // Reload the current page data
    window.location.reload();
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `wiki-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);

    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
  }

  showAchievementNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-content">
        <div class="achievement-icon">
          <i class="fas fa-trophy"></i>
        </div>
        <div class="achievement-text">
          <div class="achievement-title">${title}</div>
          <div class="achievement-message">${message}</div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 7000);
  }

  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'fa-check-circle';case 'error': return 'fa-exclamation-circle';case 'warning': return 'fa-exclamation-triangle';default: return 'fa-info-circle';}
  }
}

// Export for use in other modules
window.WikiEditor = WikiEditor;