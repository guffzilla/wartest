/**
 * Enhanced Match Report Manager
 * Handles match reporting with multiple screenshots, dispute functionality, and maps integration
 * Updated for Rust backend compatibility
 */

import { UIManager } from './UIManager.js';
import { apiClient } from './ApiClient.js';



export class MatchReportManager {
  constructor() {
    this.ui = new UIManager();
    this.gameManager = window.gameManager;
    this.imageCompressor = window.imageCompressor;
    this.currentReport = null;
    this.uploadedScreenshots = [];
    this.selectedMap = null;
    this.state = {
      isSubmitting: false,
      currentStep: 1,
      totalSteps: 4
    };
  }

  /**
   * Initialize match report system
   */
  async init() {
    try {
      this.setupEventListeners();
      console.log('Match report manager initialized');
    } catch (error) {
      console.error('Failed to initialize match report manager:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Report match button
    this.ui.onClick('report-match-btn', () => this.showReportModal());
    this.ui.onClick('report-match-btn-top', () => this.showReportModal());
    
    // Screenshot upload handling
    this.ui.onChange('match-screenshots', (e) => this.handleScreenshotUpload(e));
    
    // Map selection
    this.ui.onClick('browse-maps-btn', () => this.showMapSelectionModal());
    
    // Form submission
    this.ui.onSubmit('match-report-form', (e) => this.handleReportSubmission(e));
  }

  /**
   * Show enhanced match report modal
   */
  showReportModal() {
    const gameType = this.gameManager?.getCurrentGame() || 'warcraft2';
    const gameData = this.gameManager?.getCurrentGameData() || {};
    const matchTypes = this.gameManager?.getMatchTypes() || ['1v1', '2v2', '3v3', '4v4', 'ffa'];

    const modal = this.ui.createModal('match-report-modal', 'Report Match', `
      <div class="match-report-wizard">
        <!-- Progress Steps -->
        <div class="wizard-steps">
          <div class="step active" data-step="1">
            <div class="step-number">1</div>
            <div class="step-label">Match Details</div>
          </div>
          <div class="step" data-step="2">
            <div class="step-number">2</div>
            <div class="step-label">Players & Results</div>
          </div>
          <div class="step" data-step="3">
            <div class="step-number">3</div>
            <div class="step-label">Screenshots</div>
          </div>
          <div class="step" data-step="4">
            <div class="step-number">4</div>
            <div class="step-label">Review & Submit</div>
          </div>
        </div>

        <form id="match-report-form" class="form">
          <!-- Step 1: Match Details -->
          <div class="wizard-step active" data-step="1">
            <h3>Match Details</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="match-type">Match Type:</label>
                <select id="match-type" name="matchType" required>
                  ${matchTypes.map(type => `<option value="${type}">${type.toUpperCase()}</option>`).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label for="match-date">Match Date:</label>
                <input type="datetime-local" id="match-date" name="matchDate" required>
              </div>
            </div>

            <div class="form-group">
              <label for="map-selection">Map:</label>
              <div class="map-selection-container">
                <input type="text" id="map-name" name="mapName" placeholder="Enter map name or browse..." required readonly>
                <button type="button" id="browse-maps-btn" class="btn btn-secondary">
                  <i class="fas fa-search"></i> Browse Maps
                </button>
              </div>
              <div id="selected-map-preview" class="selected-map-preview"></div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="resource-level">Resource Level:</label>
                <select id="resource-level" name="resourceLevel" required>
                  <option value="high">High Resources</option>
                  <option value="medium">Medium Resources</option>
                  <option value="low">Low Resources</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="match-duration">Duration (minutes):</label>
                <input type="number" id="match-duration" name="duration" min="1" max="300" placeholder="Optional">
              </div>
            </div>

            <div class="form-group">
              <label for="match-battle-report">Battle Report:</label>
              <textarea id="match-battle-report" name="battleReport" rows="3" placeholder="Describe the battle, strategy, key moments, etc..."></textarea>
            </div>

            <div class="form-group">
              <label for="match-youtube-link">YouTube Commentary (Optional):</label>
              <input type="url" id="match-youtube-link" name="youtubeLink" placeholder="https://youtube.com/watch?v=... or https://youtu.be/...">
              <small class="help-text">
                Link to a YouTube video commentary of this match
              </small>
            </div>
          </div>

          <!-- Step 2: Players & Results -->
          <div class="wizard-step" data-step="2">
            <h3>Players & Results</h3>
            <div id="players-container">
              <!-- Players will be dynamically generated based on match type -->
            </div>
            
            <div class="form-group">
              <label for="match-winner">Winner:</label>
              <select id="match-winner" name="winner" required>
                <option value="">Select winner...</option>
              </select>
            </div>
          </div>

          <!-- Step 3: Screenshots -->
          <div class="wizard-step" data-step="3">
            <h3>Match Screenshots</h3>
            <p class="step-description">Upload screenshots as evidence of the match result. At least one screenshot is required.</p>
            
            <div class="screenshot-upload-area">
              <div class="upload-dropzone" id="screenshot-dropzone">
                <i class="fas fa-cloud-upload-alt"></i>
                <h4>Drop screenshots here or click to browse</h4>
                <p>Supports PNG, JPG, PCX files. Maximum 6 screenshots, 10MB each.</p>
                <input type="file" id="match-screenshots" name="screenshots" multiple accept="image/*,.pcx" style="display: none;">
                <button type="button" class="btn btn-primary" onclick="document.getElementById('match-screenshots').click()">
                  <i class="fas fa-plus"></i> Add Screenshots
                </button>
              </div>
            </div>

            <div id="screenshot-previews" class="screenshot-previews">
              <!-- Screenshot previews will appear here -->
            </div>

            <div class="screenshot-requirements">
              <h4>Screenshot Requirements:</h4>
              <ul>
                <li>Must show the final game result screen</li>
                <li>Player names must be clearly visible</li>
                <li>Screenshots should be recent (within 48 hours)</li>
                <li>No edited or manipulated images</li>
              </ul>
            </div>
          </div>

          <!-- Step 4: Review & Submit -->
          <div class="wizard-step" data-step="4">
            <h3>Review & Submit</h3>
            <div id="report-summary" class="report-summary">
              <!-- Summary will be generated here -->
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="wizard-navigation">
            <button type="button" id="prev-step" class="btn btn-secondary" style="display: none;">
              <i class="fas fa-arrow-left"></i> Previous
            </button>
            <button type="button" id="next-step" class="btn btn-primary">
              Next <i class="fas fa-arrow-right"></i>
            </button>
            <button type="submit" id="submit-report" class="btn btn-success" style="display: none;">
              <i class="fas fa-check"></i> Submit Report
            </button>
          </div>
        </form>
      </div>
    `);

    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('match-date').value = now.toISOString().slice(0, 16);

    this.setupWizardNavigation();
    this.setupScreenshotUpload();
    this.updatePlayersContainer();
  }

  /**
   * Setup wizard navigation
   */
  setupWizardNavigation() {
    const nextBtn = document.getElementById('next-step');
    const prevBtn = document.getElementById('prev-step');
    const submitBtn = document.getElementById('submit-report');

    nextBtn.addEventListener('click', () => this.nextStep());
    prevBtn.addEventListener('click', () => this.prevStep());

    // Match type change handler
    document.getElementById('match-type').addEventListener('change', () => {
      this.updatePlayersContainer();
    });
  }

  /**
   * Setup screenshot upload functionality
   */
  setupScreenshotUpload() {
    const dropzone = document.getElementById('screenshot-dropzone');
    const fileInput = document.getElementById('match-screenshots');

    // Drag and drop handlers
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      this.handleScreenshotUpload({ target: { files: e.dataTransfer.files } });
    });

    // File input change handler
    fileInput.addEventListener('change', (e) => this.handleScreenshotUpload(e));
  }

  /**
   * Handle screenshot upload
   */
  async handleScreenshotUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;if (this.uploadedScreenshots.length + files.length > 6) {
      this.ui.showError('Maximum 6 screenshots allowed per match report.');
      return;}

    try {
      this.ui.showLoading('Processing screenshots...');

      for (const file of files) {
        // Validate file
        const validation = this.imageCompressor.validateImageFile(file);
        if (!validation.isValid) {
          this.ui.showError(`Invalid file "${file.name}": ${validation.errors.join(', ')}`);
          continue;
        }

        // Compress image
        const compressedFile = await this.imageCompressor.compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
          outputFormat: 'image/jpeg'
        });

        // Create preview
        const preview = await this.createScreenshotPreview(compressedFile, file.name);
        this.uploadedScreenshots.push({
          file: compressedFile,
          originalName: file.name,
          preview: preview
        });
      }

      this.renderScreenshotPreviews();
      
    } catch (error) {
      console.error('Error processing screenshots:', error);
      this.ui.showError('Failed to process screenshots. Please try again.');
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Create screenshot preview
   */
  async createScreenshotPreview(file, originalName) {
    return new Promise((resolve) => {
      const reader = new FileReader();reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Render screenshot previews
   */
  renderScreenshotPreviews() {
    const container = document.getElementById('screenshot-previews');
    
    container.innerHTML = this.uploadedScreenshots.map((screenshot, index) => `
      <div class="screenshot-preview" data-index="${index}">
        <img src="${screenshot.preview}" alt="Screenshot ${index + 1}">
        <div class="screenshot-info">
          <div class="screenshot-name">${screenshot.originalName}</div>
          <div class="screenshot-size">${this.formatFileSize(screenshot.file.size)}</div>
        </div>
        <button type="button" class="remove-screenshot" onclick="matchReportManager.removeScreenshot(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  /**
   * Remove screenshot
   */
  removeScreenshot(index) {
    this.uploadedScreenshots.splice(index, 1);
    this.renderScreenshotPreviews();
  }

  /**
   * Show map selection modal
   */
  async showMapSelectionModal() {
    const modal = this.ui.createModal('map-selection-modal', 'Select Map', `
      <div class="map-selection-content">
        <div class="map-search-bar">
          <input type="text" id="map-search" placeholder="Search maps..." class="form-control">
          <div class="map-filters">
            <select id="map-type-filter">
              <option value="all">All Types</option>
              <option value="melee">Melee</option>
              <option value="custom">Custom</option>
            </select>
            <select id="map-size-filter">
              <option value="all">All Sizes</option>
              <option value="32x32">32x32</option>
              <option value="64x64">64x64</option>
              <option value="96x96">96x96</option>
              <option value="128x128">128x128</option>
            </select>
          </div>
        </div>

        <div class="map-categories">
          <button class="map-category-btn active" data-category="popular">Popular</button>
          <button class="map-category-btn" data-category="recent">Recent</button>
          <button class="map-category-btn" data-category="rated">Top Rated</button>
          <button class="map-category-btn" data-category="all">All Maps</button>
        </div>

        <div id="maps-grid" class="maps-grid">
          <div class="loading">Loading maps...</div>
        </div>

        <div class="map-selection-actions">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Cancel
          </button>
          <button type="button" id="select-map-btn" class="btn btn-primary" disabled>
            Select Map
          </button>
        </div>
      </div>
    `);

    this.setupMapSelection();
    await this.loadMaps('popular');
  }

  /**
   * Setup map selection functionality
   */
  setupMapSelection() {
    // Search functionality
    let searchTimeout;
    document.getElementById('map-search').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchMaps(e.target.value);
      }, 300);
    });

    // Category buttons
    document.querySelectorAll('.map-category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.map-category-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.loadMaps(e.target.dataset.category);
      });
    });

    // Map selection
    document.getElementById('select-map-btn').addEventListener('click', () => {
      if (this.selectedMap) {
        this.selectMap(this.selectedMap);
        document.querySelector('.modal').remove();
      }
    });
  }

  /**
   * Load maps by category
   */
  async loadMaps(category) {
    try {
      const container = document.getElementById('maps-grid');
      container.innerHTML = '<div class="loading">Loading maps...</div>';

      let endpoint = '/maps';
      switch (category) {
        case 'popular':
          endpoint = '/maps/popular';
          break;
        case 'recent':
          endpoint = '/maps/recent';
          break;
        case 'rated':
          endpoint = '/maps/top-rated';
          break;
      }

      const maps = await apiClient.getMaps();
      this.renderMaps(maps);

    } catch (error) {
      console.error('Failed to load maps:', error);
      document.getElementById('maps-grid').innerHTML = 
        this.ui.createErrorState('Failed to Load Maps', 'Please try again.');
    }
  }

  /**
   * Search maps
   */
  async searchMaps(query) {
    if (!query.trim()) {
      await this.loadMaps('popular');
      return;}

    try {
      const maps = await apiClient.getMaps({ search: query });
      this.renderMaps(maps);
    } catch (error) {
      console.error('Failed to search maps:', error);
    }
  }

  /**
   * Render maps grid
   */
  renderMaps(maps) {
    const container = document.getElementById('maps-grid');
    
    if (maps.length === 0) {
      container.innerHTML = this.ui.createEmptyState('No Maps Found', 'No maps match your criteria.');
      return;}

    container.innerHTML = maps.map(map => `
      <div class="map-card" data-map-id="${map._id}" onclick="matchReportManager.selectMapCard(this, ${JSON.stringify(map).replace(/"/g, '&quot;')})">
        <div class="map-image">
          ${map.thumbnailPath ? 
            `<img src="${map.thumbnailPath}" alt="${map.name}">` : 
            `<div class="map-placeholder"><i class="fas fa-map"></i></div>`
          }
        </div>
        <div class="map-info">
          <h4 class="map-name">${map.name}</h4>
          <div class="map-details">
            <span class="map-type">${map.type}</span>
            <span class="map-size">${map.size}</span>
          </div>
          <div class="map-stats">
            <span><i class="fas fa-play"></i> ${map.playCount || 0}</span>
            <span><i class="fas fa-star"></i> ${map.averageRating ? map.averageRating.toFixed(1) : 'N/A'}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Select map card
   */
  selectMapCard(element, mapData) {
    // Remove previous selection
    document.querySelectorAll('.map-card').forEach(card => card.classList.remove('selected'));
    
    // Select current card
    element.classList.add('selected');
    this.selectedMap = mapData;
    
    // Enable select button
    document.getElementById('select-map-btn').disabled = false;
  }

  /**
   * Select map
   */
  selectMap(map) {
    document.getElementById('map-name').value = map.name;
    
    // Show map preview
    const preview = document.getElementById('selected-map-preview');
    preview.innerHTML = `
      <div class="selected-map">
        <div class="map-thumbnail">
          ${map.thumbnailPath ? 
            `<img src="${map.thumbnailPath}" alt="${map.name}">` : 
            `<div class="map-placeholder"><i class="fas fa-map"></i></div>`
          }
        </div>
        <div class="map-details">
          <h4>${map.name}</h4>
          <p>${map.type} • ${map.size} • ${map.playerCount.min}-${map.playerCount.max} players</p>
          <div class="map-stats">
            <span>Played ${map.playCount || 0} times</span>
            ${map.averageRating ? `<span>Rating: ${map.averageRating.toFixed(1)}/5</span>` : ''}
          </div>
        </div>
      </div>
    `;
    
    this.selectedMap = map;
  }

  /**
   * Update players container based on match type
   */
  updatePlayersContainer() {
    const matchType = document.getElementById('match-type').value;
    const container = document.getElementById('players-container');
    const winnerSelect = document.getElementById('match-winner');
    
    if (!matchType) return;container.innerHTML = '';
    winnerSelect.innerHTML = '<option value="">Select winner...</option>';

    const playerCounts = {
      '1v1': 2,
      '2v2': 4,
      '3v3': 6,
      '4v4': 8,
      'ffa': 8
    };

    const playerCount = playerCounts[matchType] || 2;
    const isTeamGame = ['2v2', '3v3', '4v4'].includes(matchType);
    const races = this.gameManager?.getRaces() || ['human', 'orc', 'random'];

    // Generate player inputs
    for (let i = 0; i < playerCount; i++) {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-input-group';
      
      playerDiv.innerHTML = `
        <h4>Player ${i + 1}</h4>
        <div class="player-input-row">
          <div class="form-group">
            <label>Player Name:</label>
            <input type="text" name="player-${i}-name" required placeholder="Enter player name">
          </div>
          <div class="form-group">
            <label>Race:</label>
            <select name="player-${i}-race" required>
              ${races.map(race => `<option value="${race}">${race.charAt(0).toUpperCase() + race.slice(1)}</option>`).join('')}
            </select>
          </div>
          ${isTeamGame ? `
            <div class="form-group">
              <label>Team:</label>
              <select name="player-${i}-team" required>
                <option value="1">Team 1</option>
                <option value="2">Team 2</option>
              </select>
            </div>
          ` : ''}
        </div>
      `;
      
      container.appendChild(playerDiv);

      // Add to winner options
      if (matchType === '1v1' || matchType === 'ffa') {
        const option = document.createElement('option');
        option.value = `player-${i}`;
        option.textContent = `Player ${i + 1}`;
        winnerSelect.appendChild(option);
      }
    }

    // Add team winner options for team games
    if (isTeamGame) {
      const team1Option = document.createElement('option');
      team1Option.value = 'team-1';
      team1Option.textContent = 'Team 1';
      winnerSelect.appendChild(team1Option);

      const team2Option = document.createElement('option');
      team2Option.value = 'team-2';
      team2Option.textContent = 'Team 2';
      winnerSelect.appendChild(team2Option);
    }
  }

  /**
   * Navigate to next step
   */
  nextStep() {
    if (this.state.currentStep < this.state.totalSteps) {
      if (this.validateCurrentStep()) {
        this.state.currentStep++;
        this.updateWizardStep();
      }
    }
  }

  /**
   * Navigate to previous step
   */
  prevStep() {
    if (this.state.currentStep > 1) {
      this.state.currentStep--;
      this.updateWizardStep();
    }
  }

  /**
   * Update wizard step display
   */
  updateWizardStep() {
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 === this.state.currentStep);
      step.classList.toggle('completed', index + 1 < this.state.currentStep);
    });

    // Update step content
    document.querySelectorAll('.wizard-step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 === this.state.currentStep);
    });

    // Update navigation buttons
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const submitBtn = document.getElementById('submit-report');

    prevBtn.style.display = this.state.currentStep > 1 ? 'block' : 'none';
    nextBtn.style.display = this.state.currentStep < this.state.totalSteps ? 'block' : 'none';
    submitBtn.style.display = this.state.currentStep === this.state.totalSteps ? 'block' : 'none';

    // Generate summary for final step
    if (this.state.currentStep === this.state.totalSteps) {
      this.generateReportSummary();
    }
  }

  /**
   * Validate current step
   */
  validateCurrentStep() {
    switch (this.state.currentStep) {
      case 1:
        return this.validateMatchDetails();case 2:
        return this.validatePlayersAndResults();case 3:
        return this.validateScreenshots();default:
        return true;}
  }

  /**
   * Validate match details
   */
  validateMatchDetails() {
    const matchType = document.getElementById('match-type').value;
    const mapName = document.getElementById('map-name').value;
    const resourceLevel = document.getElementById('resource-level').value;

    if (!matchType || !mapName || !resourceLevel) {
      this.ui.showError('Please fill in all required match details.');
      return false;}

    return true;}

  /**
   * Validate players and results
   */
  validatePlayersAndResults() {
    const winner = document.getElementById('match-winner').value;
    
    if (!winner) {
      this.ui.showError('Please select the match winner.');
      return false;}

    // Validate all player names are filled
    const playerInputs = document.querySelectorAll('input[name^="player-"][name$="-name"]');
    for (const input of playerInputs) {
      if (!input.value.trim()) {
        this.ui.showError('Please enter all player names.');
        return false;}
    }

    return true;}

  /**
   * Validate screenshots
   */
  validateScreenshots() {
    if (this.uploadedScreenshots.length === 0) {
      this.ui.showError('At least one screenshot is required.');
      return false;}

    return true;}

  /**
   * Generate report summary
   */
  generateReportSummary() {
    const formData = new FormData(document.getElementById('match-report-form'));
    const matchType = formData.get('matchType');
    const mapName = formData.get('mapName');
    const resourceLevel = formData.get('resourceLevel');
    const winner = formData.get('winner');

    // Collect player data
    const players = [];
    const playerInputs = document.querySelectorAll('input[name^="player-"][name$="-name"]');
    playerInputs.forEach((input, index) => {
      const name = input.value;
      const race = formData.get(`player-${index}-race`);
      const team = formData.get(`player-${index}-team`);
      
      players.push({ name, race, team });
    });

    const summary = document.getElementById('report-summary');
    summary.innerHTML = `
      <div class="summary-section">
        <h4>Match Information</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <label>Type:</label>
            <span>${matchType.toUpperCase()}</span>
          </div>
          <div class="summary-item">
            <label>Map:</label>
            <span>${mapName}</span>
          </div>
          <div class="summary-item">
            <label>Resources:</label>
            <span>${resourceLevel.charAt(0).toUpperCase() + resourceLevel.slice(1)}</span>
          </div>
          <div class="summary-item">
            <label>Winner:</label>
            <span>${this.formatWinner(winner, players)}</span>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <h4>Players</h4>
        <div class="players-summary">
          ${players.map((player, index) => `
            <div class="player-summary">
              <span class="player-name">${player.name}</span>
              <span class="player-race">${player.race}</span>
              ${player.team ? `<span class="player-team">Team ${player.team}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="summary-section">
        <h4>Battle Report & Media</h4>
        <div class="battle-report-summary">
          ${formData.get('battleReport') ? `
            <div class="battle-report-content">
              <strong>Battle Report:</strong>
              <p>${formData.get('battleReport')}</p>
            </div>
          ` : '<p>No battle report provided</p>'}
          
          ${formData.get('youtubeLink') ? `
            <div class="youtube-link-content">
              <strong>YouTube Commentary:</strong>
              <a href="${formData.get('youtubeLink')}" target="_blank" class="youtube-link">
                <i class="fab fa-youtube"></i> Watch Commentary
              </a>
            </div>
          ` : ''}
        </div>
        
        <div class="screenshots-summary">
          <strong>Screenshots: ${this.uploadedScreenshots.length} uploaded</strong>
          <div class="screenshot-thumbnails">
            ${this.uploadedScreenshots.map((screenshot, index) => `
              <img src="${screenshot.preview}" alt="Screenshot ${index + 1}" class="summary-thumbnail">
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format winner display
   */
  formatWinner(winner, players) {
    if (winner.startsWith('player-')) {
      const playerIndex = parseInt(winner.split('-')[1]);
      return players[playerIndex]?.name || 'Unknown';} else if (winner.startsWith('team-')) {
      const teamNumber = winner.split('-')[1];
      return `Team ${teamNumber}`;}
    return winner;}

  /**
   * Handle report submission
   */
  async handleReportSubmission(event) {
    event.preventDefault();
    
    if (this.state.isSubmitting) return;try {
      this.state.isSubmitting = true;
      this.ui.showLoading('Submitting match report...');

      const formData = new FormData(event.target);
      
      // Add screenshots to form data
      this.uploadedScreenshots.forEach((screenshot, index) => {
        formData.append('screenshots', screenshot.file);
      });

      // Add map ID if selected
      if (this.selectedMap) {
        formData.append('mapId', this.selectedMap._id);
      }

      // Collect and add player data
      const players = this.collectPlayerData(formData);
      formData.append('players', JSON.stringify(players));

      const response = await apiClient.submitMatchReport(formData);

      // Close the current modal
      document.querySelector('.modal').remove();
      
      // Show summary screen with match results
      this.showMatchSummary(response);

    } catch (error) {
      console.error('Failed to submit match report:', error);
      this.ui.showError(`Failed to submit report: ${error.message}`);
    } finally {
      this.state.isSubmitting = false;
      this.ui.hideLoading();
    }
  }

  /**
   * Show match summary screen with results
   */
  showMatchSummary(response) {
    const { 
      rankChanges = [], 
      newAchievements = [], 
      matchId, 
      reportId,
      arenaGoldEarned = 0,
      honorPointsEarned = 0 
    } = response || {};
    
    // Safety check to ensure newAchievements is always an array
    const safeNewAchievements = Array.isArray(newAchievements) ? newAchievements : [];
    
    const modal = this.ui.createModal('match-summary-modal', 'Match Report Summary', `
      <div class="match-summary-content">
        <div class="summary-header">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h2>Match Reported Successfully!</h2>
          <p class="summary-subtitle">Here are your match results and rewards</p>
        </div>

        <div class="summary-sections">
          <!-- Rewards Section -->
          ${(arenaGoldEarned > 0 || honorPointsEarned > 0) ? `
            <div class="summary-section rewards-section">
              <h3><i class="fas fa-gift"></i> Rewards Earned</h3>
              <div class="rewards-grid">
                ${arenaGoldEarned > 0 ? `
                  <div class="reward-item arena-gold">
                    <div class="reward-icon">
                      <i class="fas fa-coins"></i>
                    </div>
                    <div class="reward-details">
                      <span class="reward-amount">+${arenaGoldEarned}</span>
                      <span class="reward-label">Arena Gold</span>
                    </div>
                  </div>
                ` : ''}
                ${honorPointsEarned > 0 ? `
                  <div class="reward-item honor-points">
                    <div class="reward-icon">
                      <i class="fas fa-medal"></i>
                    </div>
                    <div class="reward-details">
                      <span class="reward-amount">+${honorPointsEarned}</span>
                      <span class="reward-label">Honor Points</span>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- MMR Changes Section -->
          ${rankChanges.length > 0 ? `
            <div class="summary-section mmr-section">
              <h3><i class="fas fa-chart-line"></i> Rating Changes</h3>
              <div class="mmr-changes">
                ${rankChanges.map(change => `
                  <div class="mmr-change-item">
                    <div class="player-info">
                      <span class="player-name">${change.playerName}</span>
                      <span class="mmr-change ${change.mmrChange >= 0 ? 'positive' : 'negative'}">
                        ${change.mmrChange >= 0 ? '+' : ''}${change.mmrChange} MMR
                      </span>
                    </div>
                    ${change.oldRank !== change.newRank ? `
                      <div class="rank-change">
                        <div class="rank-progression">
                          <div class="old-rank">
                            <img src="/assets/img/ranks/${this.getRankImage(change.oldRank)}" alt="${change.oldRank}">
                            <span>${change.oldRank}</span>
                          </div>
                          <div class="rank-arrow">
                            <i class="fas fa-arrow-right"></i>
                          </div>
                          <div class="new-rank">
                            <img src="/assets/img/ranks/${this.getRankImage(change.newRank)}" alt="${change.newRank}">
                            <span>${change.newRank}</span>
                          </div>
                        </div>
                        <div class="rank-change-label">
                          ${change.newRankIndex > change.oldRankIndex ? 'Promotion!' : 'Demotion'}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Achievements Section -->
          ${safeNewAchievements.length > 0 ? `
            <div class="summary-section achievements-section">
              <h3><i class="fas fa-trophy"></i> New Achievements Unlocked!</h3>
              <div class="achievements-grid">
                ${safeNewAchievements.map(achievement => `
                  <div class="achievement-item">
                    <div class="achievement-icon">
                      <i class="${achievement.icon || 'fas fa-star'}"></i>
                    </div>
                    <div class="achievement-details">
                      <span class="achievement-name">${achievement.name}</span>
                      <span class="achievement-description">${achievement.description}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Match Info Section -->
          <div class="summary-section match-info-section">
            <h3><i class="fas fa-info-circle"></i> Match Information</h3>
            <div class="match-info-grid">
              <div class="info-item">
                <span class="info-label">Match ID:</span>
                <span class="info-value">${matchId}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Report ID:</span>
                <span class="info-value">${reportId}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value status-verified">Verified</span>
              </div>
            </div>
          </div>
        </div>

        <div class="summary-actions">
          <button class="btn btn-primary" onclick="this.closest('.modal').remove(); window.location.reload();">
            <i class="fas fa-home"></i> Continue
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">
            <i class="fas fa-eye"></i> View Ladder
          </button>
        </div>
      </div>
    `);

    // Auto-close after 15 seconds if user doesn't interact
    setTimeout(() => {
      if (document.getElementById('match-summary-modal')) {
        document.querySelector('.modal').remove();
        window.location.reload();
      }
    }, 15000);
  }

  /**
   * Get rank image filename from rank name
   */
  getRankImage(rankName) {
    const rankMap = {
      'Bronze 3': 'b3.png',
      'Bronze 2': 'b2.png',
      'Bronze 1': 'b1.png',
      'Gold 3': 'g3.png',
      'Gold 2': 'g2.png',
      'Gold 1': 'g1.png',
      'Amber 3': 'a3.png',
      'Amber 2': 'a2.png',
      'Amber 1': 'a1.png',
      'Sapphire 3': 's3.png',
      'Sapphire 2': 's2.png',
      'Sapphire 1': 's1.png',
      'Champion': 'champion.png'
    };
    
    return rankMap[rankName] || 'b3.png';}

  /**
   * Collect player data from form
   */
  collectPlayerData(formData) {
    const players = [];
    const playerInputs = document.querySelectorAll('input[name^="player-"][name$="-name"]');
    
    playerInputs.forEach((input, index) => {
      const name = input.value.trim();
      const race = formData.get(`player-${index}-race`);
      const team = formData.get(`player-${index}-team`);
      
      if (name) {
        players.push({
          name,
          race,
          team: team ? parseInt(team) : null
        });
      }
    });

    return players;}

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];}
}

// Create global instance
window.matchReportManager = new MatchReportManager(); 