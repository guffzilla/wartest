/**
 * Enhanced Match Dispute Manager
 * Handles match disputes, match history editing, and dispute resolution
 */

import { UIManager } from './UIManager.js';



export class MatchDisputeManager {
  constructor() {
    this.api = window.apiClient;
    this.ui = new UIManager();
    this.gameManager = window.gameManager;
    this.imageCompressor = window.imageCompressor;
    this.currentMatch = null;
    this.uploadedEvidence = [];
    this.state = {
      isSubmitting: false,
      currentView: 'list'
    };
  }

  /**
   * Initialize dispute system
   */
  async init() {
    try {
      this.setupEventListeners();
      console.log('Match dispute manager initialized');
    } catch (error) {
      console.error('Failed to initialize match dispute manager:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Dispute match buttons (dynamically added)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('dispute-match-btn') || 
          e.target.closest('.dispute-match-btn')) {
        const matchId = e.target.dataset.matchId || e.target.closest('.dispute-match-btn').dataset.matchId;
        this.showDisputeModal(matchId);
      }
      
      if (e.target.classList.contains('edit-match-btn') || 
          e.target.closest('.edit-match-btn')) {
        const matchId = e.target.dataset.matchId || e.target.closest('.edit-match-btn').dataset.matchId;
        this.showEditMatchModal(matchId);
      }
    });
  }

  /**
   * Show dispute modal for a specific match
   */
  async showDisputeModal(matchId) {
    try {
      // Load match details
      const match = await window.apiClient.get(`/ladder/match/${matchId}`);
      this.currentMatch = match;

      const modal = this.ui.createModal('dispute-match-modal', 'Dispute Match', `
        <div class="dispute-modal-content">
          <!-- Match Information -->
          <div class="match-info-section">
            <h3>Match Information</h3>
            <div class="match-details-grid">
              <div class="detail-item">
                <label>Match Type:</label>
                <span>${match.matchType}</span>
              </div>
              <div class="detail-item">
                <label>Map:</label>
                <span>${match.map?.name || 'Unknown'}</span>
              </div>
              <div class="detail-item">
                <label>Date:</label>
                <span>${this.ui.formatDate(match.date)}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge ${match.verification?.status || 'pending'}">${this.formatStatus(match.verification?.status || 'pending')}</span>
              </div>
            </div>

            <div class="players-info">
              <h4>Players</h4>
              <div class="players-grid">
                ${match.players.map(player => `
                  <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <span class="player-race">${player.race}</span>
                    ${player.team ? `<span class="player-team">Team ${player.team}</span>` : ''}
                    ${match.winner === player.name ? '<span class="winner-badge">Winner</span>' : ''}
                  </div>
                `).join('')}
              </div>
            </div>

            ${match.screenshots && match.screenshots.length > 0 ? `
              <div class="match-screenshots">
                <h4>Match Screenshots</h4>
                <div class="screenshot-thumbnails">
                  ${match.screenshots.map((screenshot, index) => `
                    <img src="${screenshot.url}" alt="Screenshot ${index + 1}" 
                         onclick="matchDisputeManager.viewScreenshot('${screenshot.url}')"
                         class="screenshot-thumbnail">
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Dispute Form -->
          <form id="dispute-form" class="dispute-form">
            <div class="form-section">
              <h3>Dispute Details</h3>
              
              <div class="form-group">
                <label for="dispute-type">Dispute Type:</label>
                <select id="dispute-type" name="disputeType" required>
                  <option value="">Select dispute type...</option>
                  <option value="incorrect_result">Incorrect Match Result</option>
                  <option value="incorrect_players">Incorrect Player Information</option>
                  <option value="incorrect_map">Incorrect Map</option>
                  <option value="incorrect_date">Incorrect Date/Time</option>
                  <option value="fake_match">Fake/Fabricated Match</option>
                  <option value="duplicate_match">Duplicate Match Entry</option>
                  <option value="technical_issue">Technical Issue During Match</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div class="form-group">
                <label for="player-name">Your Player Name in this Match:</label>
                <select id="player-name" name="playerName" required>
                  <option value="">Select your player...</option>
                  ${match.players.map(player => `
                    <option value="${player.name}">${player.name}</option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="dispute-reason">Detailed Explanation:</label>
                <textarea id="dispute-reason" name="reason" rows="4" required 
                          placeholder="Please provide a detailed explanation of why you are disputing this match..."></textarea>
              </div>

              <div class="form-group">
                <label for="correct-information">Correct Information (if applicable):</label>
                <textarea id="correct-information" name="correctInfo" rows="3" 
                          placeholder="If disputing incorrect information, please provide the correct details..."></textarea>
              </div>
            </div>

            <!-- Evidence Upload -->
            <div class="form-section">
              <h3>Evidence</h3>
              <p class="section-description">Upload screenshots or other evidence to support your dispute.</p>
              
              <div class="evidence-upload-area">
                <div class="upload-dropzone" id="evidence-dropzone">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <h4>Drop evidence files here or click to browse</h4>
                  <p>Supports PNG, JPG, PCX files. Maximum 5 files, 10MB each.</p>
                  <input type="file" id="evidence-files" name="evidence" multiple accept="image/*,.pcx" style="display: none;">
                  <button type="button" class="btn btn-primary" onclick="document.getElementById('evidence-files').click()">
                    <i class="fas fa-plus"></i> Add Evidence
                  </button>
                </div>
              </div>

              <div id="evidence-previews" class="evidence-previews">
                <!-- Evidence previews will appear here -->
              </div>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-flag"></i> Submit Dispute
              </button>
            </div>
          </form>
        </div>
      `);

      this.setupDisputeForm();

    } catch (error) {
      console.error('Failed to load match for dispute:', error);
      this.ui.showError('Failed to load match details.');
    }
  }

  /**
   * Show edit match modal (for authorized users)
   */
  async showEditMatchModal(matchId) {
    try {
      // Load match details
      const match = await window.apiClient.get(`/ladder/match/${matchId}`);
      this.currentMatch = match;

      // Check if user has permission to edit
      const canEdit = await this.checkEditPermission(match);
      if (!canEdit) {
        this.ui.showError('You do not have permission to edit this match.');
        return;}

      const modal = this.ui.createModal('edit-match-modal', 'Edit Match', `
        <div class="edit-match-content">
          <form id="edit-match-form" class="form">
            <!-- Basic Match Information -->
            <div class="form-section">
              <h3>Match Information</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-match-type">Match Type:</label>
                  <select id="edit-match-type" name="matchType" required>
                    <option value="1v1" ${match.matchType === '1v1' ? 'selected' : ''}>1v1</option>
                    <option value="2v2" ${match.matchType === '2v2' ? 'selected' : ''}>2v2</option>
                    <option value="3v3" ${match.matchType === '3v3' ? 'selected' : ''}>3v3</option>
                    <option value="4v4" ${match.matchType === '4v4' ? 'selected' : ''}>4v4</option>
                    <option value="ffa" ${match.matchType === 'ffa' ? 'selected' : ''}>FFA</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="edit-match-date">Match Date:</label>
                  <input type="datetime-local" id="edit-match-date" name="matchDate" 
                         value="${new Date(match.date).toISOString().slice(0, 16)}" required>
                </div>
              </div>

              <div class="form-group">
                <label for="edit-map-name">Map:</label>
                <div class="map-selection-container">
                  <input type="text" id="edit-map-name" name="mapName" 
                         value="${match.map?.name || ''}" required readonly>
                  <button type="button" id="edit-browse-maps-btn" class="btn btn-secondary">
                    <i class="fas fa-search"></i> Browse Maps
                  </button>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="edit-resource-level">Resource Level:</label>
                  <select id="edit-resource-level" name="resourceLevel" required>
                    <option value="high" ${match.resourceLevel === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${match.resourceLevel === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="low" ${match.resourceLevel === 'low' ? 'selected' : ''}>Low</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="edit-duration">Duration (minutes):</label>
                  <input type="number" id="edit-duration" name="duration" 
                         value="${match.duration || ''}" min="1" max="300">
                </div>
              </div>
            </div>

            <!-- Players Section -->
            <div class="form-section">
              <h3>Players</h3>
              <div id="edit-players-container">
                ${this.renderEditPlayersForm(match)}
              </div>
            </div>

            <!-- Winner Selection -->
            <div class="form-section">
              <h3>Match Result</h3>
              <div class="form-group">
                <label for="edit-winner">Winner:</label>
                <select id="edit-winner" name="winner" required>
                  ${this.renderWinnerOptions(match)}
                </select>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="form-section">
              <h3>Additional Information</h3>
              <div class="form-group">
                <label for="edit-notes">Notes:</label>
                <textarea id="edit-notes" name="notes" rows="3">${match.notes || ''}</textarea>
              </div>
              
              <div class="form-group">
                <label for="edit-reason">Reason for Edit:</label>
                <textarea id="edit-reason" name="editReason" rows="2" required 
                          placeholder="Please explain why you are editing this match..."></textarea>
              </div>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Save Changes
              </button>
            </div>
          </form>
        </div>
      `);

      this.setupEditForm();

    } catch (error) {
      console.error('Failed to load match for editing:', error);
      this.ui.showError('Failed to load match details.');
    }
  }

  /**
   * Setup dispute form functionality
   */
  setupDisputeForm() {
    // Evidence upload
    this.setupEvidenceUpload();
    
    // Form submission
    const form = document.getElementById('dispute-form');
    form.addEventListener('submit', (e) => this.handleDisputeSubmission(e));
  }

  /**
   * Setup evidence upload functionality
   */
  setupEvidenceUpload() {
    const dropzone = document.getElementById('evidence-dropzone');
    const fileInput = document.getElementById('evidence-files');

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
      this.handleEvidenceUpload({ target: { files: e.dataTransfer.files } });
    });

    // File input change handler
    fileInput.addEventListener('change', (e) => this.handleEvidenceUpload(e));
  }

  /**
   * Handle evidence upload
   */
  async handleEvidenceUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;if (this.uploadedEvidence.length + files.length > 5) {
      this.ui.showError('Maximum 5 evidence files allowed per dispute.');
      return;}

    try {
      this.ui.showLoading('Processing evidence files...');

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
        const preview = await this.createEvidencePreview(compressedFile, file.name);
        this.uploadedEvidence.push({
          file: compressedFile,
          originalName: file.name,
          preview: preview
        });
      }

      this.renderEvidencePreviews();
      
    } catch (error) {
      console.error('Error processing evidence files:', error);
      this.ui.showError('Failed to process evidence files. Please try again.');
    } finally {
      this.ui.hideLoading();
    }
  }

  /**
   * Create evidence preview
   */
  async createEvidencePreview(file, originalName) {
    return new Promise((resolve) => {
      const reader = new FileReader();reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Render evidence previews
   */
  renderEvidencePreviews() {
    const container = document.getElementById('evidence-previews');
    
    container.innerHTML = this.uploadedEvidence.map((evidence, index) => `
      <div class="evidence-preview" data-index="${index}">
        <img src="${evidence.preview}" alt="Evidence ${index + 1}">
        <div class="evidence-info">
          <div class="evidence-name">${evidence.originalName}</div>
          <div class="evidence-size">${this.formatFileSize(evidence.file.size)}</div>
        </div>
        <button type="button" class="remove-evidence" onclick="matchDisputeManager.removeEvidence(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  /**
   * Remove evidence file
   */
  removeEvidence(index) {
    this.uploadedEvidence.splice(index, 1);
    this.renderEvidencePreviews();
  }

  /**
   * Setup edit form functionality
   */
  setupEditForm() {
    // Map selection
    document.getElementById('edit-browse-maps-btn').addEventListener('click', () => {
      this.showMapSelectionForEdit();
    });

    // Match type change handler
    document.getElementById('edit-match-type').addEventListener('change', () => {
      this.updateEditPlayersContainer();
    });

    // Form submission
    const form = document.getElementById('edit-match-form');
    form.addEventListener('submit', (e) => this.handleEditSubmission(e));
  }

  /**
   * Render edit players form
   */
  renderEditPlayersForm(match) {
    return match.players.map((player, index) => `
      <div class="player-edit-group">
        <h4>Player ${index + 1}</h4>
        <div class="player-edit-row">
          <div class="form-group">
            <label>Player Name:</label>
            <input type="text" name="player-${index}-name" value="${player.name}" required>
          </div>
          <div class="form-group">
            <label>Race:</label>
            <select name="player-${index}-race" required>
              <option value="human" ${player.race === 'human' ? 'selected' : ''}>Human</option>
              <option value="orc" ${player.race === 'orc' ? 'selected' : ''}>Orc</option>
              <option value="random" ${player.race === 'random' ? 'selected' : ''}>Random</option>
            </select>
          </div>
          ${player.team ? `
            <div class="form-group">
              <label>Team:</label>
              <select name="player-${index}-team">
                <option value="1" ${player.team === 1 ? 'selected' : ''}>Team 1</option>
                <option value="2" ${player.team === 2 ? 'selected' : ''}>Team 2</option>
              </select>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');}

  /**
   * Render winner options for edit form
   */
  renderWinnerOptions(match) {
    let options = '<option value="">Select winner...</option>';
    
    if (match.matchType === '1v1' || match.matchType === 'ffa') {
      // Individual winners
      match.players.forEach((player, index) => {
        const selected = match.winner === player.name ? 'selected' : '';
        options += `<option value="${player.name}" ${selected}>${player.name}</option>`;
      });
    } else {
      // Team winners
      options += `<option value="team-1" ${match.winner === 'team-1' || match.winner === 1 ? 'selected' : ''}>Team 1</option>`;
      options += `<option value="team-2" ${match.winner === 'team-2' || match.winner === 2 ? 'selected' : ''}>Team 2</option>`;
    }
    
    return options;}

  /**
   * Handle dispute submission
   */
  async handleDisputeSubmission(event) {
    event.preventDefault();
    
    if (this.state.isSubmitting) return;try {
      this.state.isSubmitting = true;
      this.ui.showLoading('Submitting dispute...');

      const formData = new FormData(event.target);
      
      // Add evidence files
      this.uploadedEvidence.forEach((evidence, index) => {
        formData.append('evidence', evidence.file);
      });

      // Add match ID
      formData.append('matchId', this.currentMatch._id);

      const response = await window.apiClient.post('/ladder/dispute-match', formData);

      this.ui.showSuccess('Dispute submitted successfully. An administrator will review your dispute.');
      document.querySelector('.modal').remove();
      
      // Refresh the page or update the UI
      this.refreshMatchList();

    } catch (error) {
      console.error('Failed to submit dispute:', error);
      this.ui.showError(`Failed to submit dispute: ${error.message}`);
    } finally {
      this.state.isSubmitting = false;
      this.ui.hideLoading();
    }
  }

  /**
   * Handle edit submission
   */
  async handleEditSubmission(event) {
    event.preventDefault();
    
    if (this.state.isSubmitting) return;try {
      this.state.isSubmitting = true;
      this.ui.showLoading('Saving changes...');

      const formData = new FormData(event.target);
      
      // Collect player data
      const players = this.collectEditPlayerData(formData);
      
      const updateData = {
        matchType: formData.get('matchType'),
        matchDate: formData.get('matchDate'),
        mapName: formData.get('mapName'),
        resourceLevel: formData.get('resourceLevel'),
        duration: formData.get('duration') ? parseInt(formData.get('duration')) : null,
        winner: formData.get('winner'),
        notes: formData.get('notes'),
        editReason: formData.get('editReason'),
        players: players
      };

      const response = await window.apiClient.put(`/ladder/match/${this.currentMatch._id}`, updateData);

      this.ui.showSuccess('Match updated successfully.');
      document.querySelector('.modal').remove();
      
      // Refresh the page or update the UI
      this.refreshMatchList();

    } catch (error) {
      console.error('Failed to update match:', error);
      this.ui.showError(`Failed to update match: ${error.message}`);
    } finally {
      this.state.isSubmitting = false;
      this.ui.hideLoading();
    }
  }

  /**
   * Collect player data from edit form
   */
  collectEditPlayerData(formData) {
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
   * Check if user has permission to edit match
   */
  async checkEditPermission(match) {
    try {
      // Check if user is admin/moderator
      const user = await window.apiClient.getCurrentUser();
      if (user.role === 'admin' || user.role === 'moderator') {
        return true;}

      // Check if user was involved in the match (within time limit)
      const matchDate = new Date(match.date);
      const now = new Date();
      const hoursSinceMatch = (now - matchDate) / (1000 * 60 * 60);
      
      // Allow editing within 24 hours if user was in the match
      if (hoursSinceMatch <= 24) {
        const userPlayers = await window.apiClient.getUserPlayers();
        const userPlayerNames = userPlayers.map(p => p.name);
        const wasInMatch = match.players.some(p => userPlayerNames.includes(p.name));
        return wasInMatch;}

      return false;} catch (error) {
      console.error('Error checking edit permission:', error);
      return false;}
  }

  /**
   * View screenshot in modal
   */
  viewScreenshot(url) {
    const modal = this.ui.createModal('screenshot-view-modal', 'Screenshot', `
      <div class="screenshot-view-content">
        <img src="${url}" alt="Match Screenshot" class="full-screenshot">
        <div class="screenshot-actions">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Close
          </button>
          <button type="button" class="btn btn-danger" onclick="matchDisputeManager.flagScreenshot('${url}')">
            <i class="fas fa-flag"></i> Flag as Inappropriate
          </button>
        </div>
      </div>
    `);
  }

  /**
   * Flag screenshot as inappropriate
   */
  async flagScreenshot(url) {
    try {
      const confirmed = await this.ui.confirm(
        'Flag Screenshot',
        'Are you sure you want to flag this screenshot as inappropriate? This action cannot be undone.'
      );

      if (!confirmed) return;await window.apiClient.post('/ladder/flag-screenshot', { screenshotUrl: url });
      this.ui.showSuccess('Screenshot has been flagged for review.');
      
    } catch (error) {
      console.error('Failed to flag screenshot:', error);
      this.ui.showError('Failed to flag screenshot.');
    }
  }

  /**
   * Show match history with dispute/edit options
   */
  async showMatchHistory(playerId = null) {
    try {
      const endpoint = playerId ? `/ladder/player/${playerId}/matches` : '/ladder/matches/user';
      const matches = await window.apiClient.get(endpoint);

      const modal = this.ui.createModal('match-history-modal', 'Match History', `
        <div class="match-history-content">
          <div class="match-history-header">
            <h3>Your Match History</h3>
            <div class="history-filters">
              <select id="history-status-filter">
                <option value="all">All Matches</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="disputed">Disputed</option>
              </select>
              <select id="history-type-filter">
                <option value="all">All Types</option>
                <option value="1v1">1v1</option>
                <option value="2v2">2v2</option>
                <option value="3v3">3v3</option>
                <option value="4v4">4v4</option>
                <option value="ffa">FFA</option>
              </select>
            </div>
          </div>

          <div id="match-history-list" class="match-history-list">
            ${this.renderMatchHistoryList(matches)}
          </div>
        </div>
      `);

      this.setupHistoryFilters(matches);

    } catch (error) {
      console.error('Failed to load match history:', error);
      this.ui.showError('Failed to load match history.');
    }
  }

  /**
   * Render match history list
   */
  renderMatchHistoryList(matches) {
    if (matches.length === 0) {
      return this.ui.createEmptyState('No Matches Found', 'No matches found in your history.');}

    return matches.map(match => `
      <div class="match-history-item">
        <div class="match-basic-info">
          <div class="match-type-date">
            <span class="match-type">${match.matchType}</span>
            <span class="match-date">${this.ui.formatDate(match.date)}</span>
          </div>
          <div class="match-map">${match.map?.name || 'Unknown Map'}</div>
          <div class="match-status">
            <span class="status-badge ${match.verification?.status || 'pending'}">
              ${this.formatStatus(match.verification?.status || 'pending')}
            </span>
          </div>
        </div>

        <div class="match-players">
          ${match.players.map(player => `
            <span class="player ${match.winner === player.name ? 'winner' : ''}">${player.name}</span>
          `).join(' vs ')}
        </div>

        <div class="match-actions">
          <button class="btn btn-sm btn-secondary" onclick="matchDisputeManager.viewMatchDetails('${match._id}')">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="btn btn-sm btn-warning dispute-match-btn" data-match-id="${match._id}">
            <i class="fas fa-flag"></i> Dispute
          </button>
          <button class="btn btn-sm btn-primary edit-match-btn" data-match-id="${match._id}">
            <i class="fas fa-edit"></i> Edit
          </button>
        </div>
      </div>
    `).join('');}

  /**
   * Setup history filters
   */
  setupHistoryFilters(allMatches) {
    const statusFilter = document.getElementById('history-status-filter');
    const typeFilter = document.getElementById('history-type-filter');

    const applyFilters = () => {
      const statusValue = statusFilter.value;
      const typeValue = typeFilter.value;

      let filteredMatches = allMatches;

      if (statusValue !== 'all') {
        filteredMatches = filteredMatches.filter(match => 
          (match.verification?.status || 'pending') === statusValue
        );
      }

      if (typeValue !== 'all') {
        filteredMatches = filteredMatches.filter(match => match.matchType === typeValue);
      }

      document.getElementById('match-history-list').innerHTML = this.renderMatchHistoryList(filteredMatches);
    };

    statusFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
  }

  /**
   * View match details
   */
  async viewMatchDetails(matchId) {
    try {
      const match = await window.apiClient.get(`/ladder/match/${matchId}`);
      
      const modal = this.ui.createModal('match-details-modal', 'Match Details', `
        <div class="match-details-content">
          <div class="match-info-grid">
            <div class="info-section">
              <h4>Match Information</h4>
              <div class="info-items">
                <div class="info-item">
                  <label>Type:</label>
                  <span>${match.matchType}</span>
                </div>
                <div class="info-item">
                  <label>Map:</label>
                  <span>${match.map?.name || 'Unknown'}</span>
                </div>
                <div class="info-item">
                  <label>Date:</label>
                  <span>${this.ui.formatDateTime(match.date)}</span>
                </div>
                <div class="info-item">
                  <label>Duration:</label>
                  <span>${match.duration ? `${match.duration} minutes` : 'Not recorded'}</span>
                </div>
                <div class="info-item">
                  <label>Resources:</label>
                  <span>${match.resourceLevel}</span>
                </div>
                <div class="info-item">
                  <label>Status:</label>
                  <span class="status-badge ${match.verification?.status || 'pending'}">
                    ${this.formatStatus(match.verification?.status || 'pending')}
                  </span>
                </div>
              </div>
            </div>

            <div class="players-section">
              <h4>Players</h4>
              <div class="players-detailed">
                ${match.players.map(player => `
                  <div class="player-detailed ${match.winner === player.name ? 'winner' : ''}">
                    <div class="player-name">${player.name}</div>
                    <div class="player-race">${player.race}</div>
                    ${player.team ? `<div class="player-team">Team ${player.team}</div>` : ''}
                    ${match.winner === player.name ? '<div class="winner-indicator">Winner</div>' : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          ${match.screenshots && match.screenshots.length > 0 ? `
            <div class="screenshots-section">
              <h4>Screenshots</h4>
              <div class="screenshot-gallery">
                ${match.screenshots.map((screenshot, index) => `
                  <img src="${screenshot.url}" alt="Screenshot ${index + 1}" 
                       onclick="matchDisputeManager.viewScreenshot('${screenshot.url}')"
                       class="screenshot-thumbnail">
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${match.notes ? `
            <div class="notes-section">
              <h4>Notes</h4>
              <p>${match.notes}</p>
            </div>
          ` : ''}

          ${match.disputes && match.disputes.length > 0 ? `
            <div class="disputes-section">
              <h4>Disputes</h4>
              <div class="disputes-list">
                ${match.disputes.map(dispute => `
                  <div class="dispute-item">
                    <div class="dispute-header">
                      <span class="dispute-status ${dispute.status}">${dispute.status}</span>
                      <span class="dispute-date">${this.ui.formatDate(dispute.createdAt)}</span>
                    </div>
                    <div class="dispute-reason">${dispute.reason}</div>
                    ${dispute.resolution ? `<div class="dispute-resolution">${dispute.resolution}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `);

    } catch (error) {
      console.error('Failed to load match details:', error);
      this.ui.showError('Failed to load match details.');
    }
  }

  /**
   * Refresh match list
   */
  refreshMatchList() {
    // Trigger a refresh of the current page or match list
    if (window.location.pathname.includes('ladder')) {
      window.location.reload();
    }
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    const statusMap = {
      'pending': 'Pending Review',
      'verified': 'Verified',
      'disputed': 'Disputed',
      'rejected': 'Rejected'
    };
    return statusMap[status] || status;}

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
window.matchDisputeManager = new MatchDisputeManager(); 