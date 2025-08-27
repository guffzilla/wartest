/**
 * MatchDetailsModal.js - Professional Match Details Modal
 * 
 * Handles the display of detailed match information in a professional modal
 * with enhanced UX and comprehensive match data visualization.
 */

export class MatchDetailsModal {
  constructor() {
    this.currentMatch = null;
    this.modalElement = null;
  }

  /**
   * Show match details modal with professional styling
   */
  async showMatchDetails(matchId) {
    console.log('🎯 Opening professional match details modal for:', matchId);

    try {
      // Show loading state
      this.showLoadingModal();

      // Fetch match data
      const matchData = await this.fetchMatchData(matchId);
      
      // Hide loading modal
      this.hideLoadingModal();

      // Create and show match details modal
      this.createMatchDetailsModal(matchData);
      
      console.log('✅ Match details modal opened successfully');
    } catch (error) {
      console.error('❌ Failed to show match details modal:', error);
      this.hideLoadingModal();
      this.showErrorModal(`Failed to load match details: ${error.message}`);
    }
  }

  /**
   * Fetch match data from API
   */
  async fetchMatchData(matchId) {
    const response = await fetch(`/api/matches/${matchId}`);
    if (!response.ok) {
      throw new Error(`Failed to load match data: ${response.status}`);
    }
    return await response.json();}

  /**
   * Show loading modal
   */
  showLoadingModal() {
    const loadingModal = document.createElement('div');
    loadingModal.id = 'match-loading-modal';
    loadingModal.className = 'modal-overlay active loading-modal';
    loadingModal.innerHTML = `
      <div class="modal-content loading-content">
        <div class="loading-animation">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <div class="loading-pulse"></div>
        </div>
        <div class="loading-message">Loading match details...</div>
      </div>
    `;
    document.body.appendChild(loadingModal);
  }

  /**
   * Hide loading modal
   */
  hideLoadingModal() {
    const loadingModal = document.getElementById('match-loading-modal');
    if (loadingModal) {
      loadingModal.remove();
    }
  }

  /**
   * Show error modal
   */
  showErrorModal(message) {
    const errorModal = document.createElement('div');
    errorModal.className = 'modal-overlay active error-modal';
    errorModal.innerHTML = `
      <div class="modal-content error-content">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Error Loading Match</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
          Close
        </button>
      </div>
    `;
    document.body.appendChild(errorModal);
  }

  /**
   * Create professional match details modal
   */
  createMatchDetailsModal(matchData) {
    // Remove any existing modal
    const existingModal = document.getElementById('match-details-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'match-details-modal';
    modal.className = 'modal-overlay match-details-modal';
    
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="matchDetailsModal.closeModal()"></div>
      <div class="modal-container">
        <div class="modal-content match-details-modal-content">
          ${this.generateModalHeader(matchData)}
          <div class="modal-body">
            <div class="match-details-container">
              ${this.generateMatchDetailsContent(matchData)}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalElement = modal;
    this.currentMatch = matchData;

    // Setup event listeners
    this.setupEventListeners();

    // Trigger show animation
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  /**
   * Generate modal header
   */
  generateModalHeader(matchData) {
    const matchDate = new Date(matchData.date).toLocaleDateString();
    const matchTime = new Date(matchData.date).toLocaleTimeString();
    
    return `
      <div class="modal-header">
        <div class="modal-title-area">
          <h2><i class="fas fa-gamepad"></i> Match Details</h2>
          <div class="match-meta">
            <span class="match-date">${matchDate} at ${matchTime}</span>
            <span class="match-id">#${matchData._id?.substring(0, 8) || 'Unknown'}</span>
          </div>
        </div>
        <button class="modal-close-btn" onclick="matchDetailsModal.closeModal()" aria-label="Close modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;}

  /**
   * Generate comprehensive match details content
   */
  generateMatchDetailsContent(matchData) {
    return `
      ${this.generateMatchOverview(matchData)}
      ${this.generatePlayersSection(matchData)}
      ${this.generateMatchSettings(matchData)}
      ${this.generateMatchStatistics(matchData)}
    `;}

  /**
   * Generate match overview section
   */
  generateMatchOverview(matchData) {
    const result = this.determineMatchResult(matchData);
    const duration = this.formatDuration(matchData.duration);
    
    return `
      <div class="match-details-section">
        <h4><i class="fas fa-info-circle"></i> Match Overview</h4>
        <div class="match-info-grid">
          <div class="match-info-item">
            <span class="info-label">Map</span>
            <span class="info-value">${matchData.map || 'Unknown Map'}</span>
          </div>
          <div class="match-info-item">
            <span class="info-label">Game Type</span>
            <span class="info-value">${matchData.gameType || 'Unknown'}</span>
          </div>
          <div class="match-info-item">
            <span class="info-label">Duration</span>
            <span class="info-value">${duration}</span>
          </div>
          <div class="match-info-item">
            <span class="info-label">Resources</span>
            <span class="info-value">${this.formatResources(matchData.resources)}</span>
          </div>
          <div class="match-info-item">
            <span class="info-label">Result</span>
            <span class="info-value match-result ${result.toLowerCase()}">${result}</span>
          </div>
          <div class="match-info-item">
            <span class="info-label">Server</span>
            <span class="info-value">${matchData.server || 'Unknown'}</span>
          </div>
        </div>
      </div>
    `;}

  /**
   * Generate players section
   */
  generatePlayersSection(matchData) {
    const teams = this.organizePlayersIntoTeams(matchData);
    
    return `
      <div class="match-details-section">
        <h4><i class="fas fa-users"></i> Players & Teams</h4>
        <div class="match-players-detailed">
          ${teams.map(team => this.generateTeamDetails(team)).join('')}
        </div>
      </div>
    `;}

  /**
   * Generate team details
   */
  generateTeamDetails(team) {
    const teamClass = team.isWinner ? 'winning-team' : 'losing-team';
    const resultText = team.isWinner ? 'Winner' : 'Loser';
    
    return `
      <div class="team-detail ${teamClass}">
        <div class="team-header">
          <span class="team-name">
            <i class="fas fa-${team.isWinner ? 'trophy' : 'skull'}"></i>
            Team ${team.teamNumber}
          </span>
          <span class="team-result ${team.isWinner ? 'winner' : 'loser'}">
            ${resultText}
          </span>
        </div>
        <div class="team-players">
          ${team.players.map(player => this.generatePlayerTag(player)).join('')}
        </div>
      </div>
    `;}

  /**
   * Generate player tag
   */
  generatePlayerTag(player) {
    const raceClass = player.race ? `race-${player.race.toLowerCase()}` : '';
    const mmrChange = player.mmrChange || 0;
    const mmrClass = mmrChange >= 0 ? 'positive' : 'negative';
    const mmrSign = mmrChange >= 0 ? '+' : '';
    
    return `
      <div class="player-tag ${player.isCurrentPlayer ? 'current' : ''} ${player.isWinner ? 'winner' : 'loser'}">
        <div class="player-info">
          <span class="player-name" onclick="showPlayerDetails('${player.name}')">${player.name}</span>
          <span class="player-race ${raceClass}">${player.race || 'Unknown'}</span>
        </div>
        <div class="player-stats">
          <span class="mmr-change ${mmrClass}">${mmrSign}${mmrChange} MMR</span>
        </div>
      </div>
    `;}

  /**
   * Generate match settings section
   */
  generateMatchSettings(matchData) {
    return `
      <div class="match-details-section">
        <h4><i class="fas fa-cogs"></i> Match Settings</h4>
        <div class="match-info-grid">
          <div class="match-info-item">
            <span class="info-label">Speed</span>
            <span class="info-value">${matchData.speed || 'Normal'}</span>
          </div>
          <div class="match-info-item">
            <span class="info-label">Visibility</span>
            <span class="info-value">${matchData.visibility || 'Default'}</span>
          </div>
          <div class="match-info-item">
            <span class="info-label">Observers</span>
            <span class="info-value">${matchData.observers || 'Allowed'}</span>
          </div>
          <div class="match-info-item">
            <span class="info-label">Teams</span>
            <span class="info-value">${matchData.teamCount || 'Unknown'}</span>
          </div>
        </div>
      </div>
    `;}

  /**
   * Generate match statistics section
   */
  generateMatchStatistics(matchData) {
    if (!matchData.statistics) {
      return '';}

    return `
      <div class="match-details-section">
        <h4><i class="fas fa-chart-bar"></i> Match Statistics</h4>
        <div class="stats-grid">
          ${Object.entries(matchData.statistics).map(([key, value]) => `
            <div class="stat-item">
              <span class="stat-label">${this.formatStatLabel(key)}</span>
              <span class="stat-value">${value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;}

  /**
   * Helper functions
   */
  determineMatchResult(matchData) {
    // Logic to determine match result
    return matchData.result || 'Unknown';}

  formatDuration(duration) {
    if (!duration) return 'Unknown';const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;}

  formatResources(resources) {
    if (!resources) return 'Standard';return resources.charAt(0).toUpperCase() + resources.slice(1);}

  organizePlayersIntoTeams(matchData) {
    // Logic to organize players into teams
    const teams = [];
    // Implementation would depend on match data structure
    return teams;}

  formatStatLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());}

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Escape key to close modal
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * Handle keyboard events
   */
  handleKeydown(event) {
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  /**
   * Close modal with animation
   */
  closeModal() {
    if (this.modalElement) {
      this.modalElement.classList.remove('show');
      
      setTimeout(() => {
        if (this.modalElement) {
          this.modalElement.remove();
          this.modalElement = null;
          this.currentMatch = null;
          
          // Clean up event listeners
          document.removeEventListener('keydown', this.handleKeydown);
          
          console.log('🚪 Match details modal closed');
        }
      }, 300);
    }
  }
}

// Create and export singleton instance
export const matchDetailsModal = new MatchDetailsModal();

// Make it globally available for onclick handlers
window.matchDetailsModal = matchDetailsModal;
