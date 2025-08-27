/**
 * PlayerMatchHistory.js - Match History Management for Player Details
 * 
 * Extracted from the 72KB playerDetails.js monster.
 * Handles match history display, editing, pagination, and related functionality.
 * 
 * Responsibilities:
 * - Match history data loading and display
 * - Match editing and validation
 * - Pagination and infinite scroll
 * - Match filtering and search
 * - Match result management
 */

export class PlayerMatchHistory {
  constructor() {
    this.matchData = new Map();
    this.currentPage = 1;
    this.matchesPerPage = 20;
    this.isLoading = false;
    this.hasMoreMatches = true;
    this.currentFilters = {};
    this.editingMatches = new Set();
  }

  /**
   * Initialize the match history system
   */
  init() {
    console.log('🏆 Initializing Player Match History...');
    this.setupGlobalFunctions();
    this.setupMatchHistoryStyles();
    console.log('✅ Player Match History initialized');
  }

  /**
   * Setup global functions for backward compatibility
   */
  setupGlobalFunctions() {
    window.playerMatchHistory = this;
    window.editMatch = (matchId) => this.editMatch(matchId);
    window.deleteMatch = (matchId) => this.deleteMatch(matchId);
    window.updateMatchResult = (matchId, result) => this.updateMatchResult(matchId, result);
    window.saveMatchEdit = (matchId) => this.saveMatchEdit(matchId);
    window.cancelMatchEdit = (matchId) => this.cancelMatchEdit(matchId);
    window.loadMoreMatches = () => this.loadMoreMatches();
    
    console.log('📋 Global match history functions registered');
  }

  /**
   * Load match history for a player
   */
  async loadMatchHistory(playerId, page = 1, filters = {}) {
    if (this.isLoading) {
      console.log('⏳ Already loading matches, skipping...');
      return null;}

    this.isLoading = true;
    this.currentFilters = filters;

    try {
      console.log(`🔄 Loading match history for player ${playerId}, page ${page}`);
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: this.matchesPerPage.toString(),
        ...filters
      });

      const response = await fetch(`/api/matches/player/${playerId}?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.currentPage = page;
        this.hasMoreMatches = result.data.hasMore;
        
        // Store match data
        result.data.matches.forEach(match => {
          this.matchData.set(match._id, match);
        });

        console.log(`✅ Loaded ${result.data.matches.length} matches for page ${page}`);
        return result.data;} else {
        throw new Error(result.error || 'Failed to load match history');
      }

    } catch (error) {
      console.error('❌ Failed to load match history:', error);
      this.showError(`Failed to load match history: ${error.message}`);
      return null;} finally {
      this.isLoading = false;
    }
  }

  /**
   * Render match history table
   */
  renderMatchHistory(matches, containerId = 'match-history-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container '${containerId}' not found`);
      return;}

    if (!matches || matches.length === 0) {
      container.innerHTML = this.getNoMatchesHTML();
      return;}

    console.log(`🎨 Rendering ${matches.length} matches`);

    const tableHTML = `
      <div class="match-history-table">
        <div class="table-header">
          <div class="header-cell">Date</div>
          <div class="header-cell">Map</div>
          <div class="header-cell">Opponent</div>
          <div class="header-cell">Race</div>
          <div class="header-cell">Result</div>
          <div class="header-cell">Actions</div>
        </div>
        <div class="table-body">
          ${matches.map(match => this.renderMatchRow(match)).join('')}
        </div>
      </div>
      ${this.hasMoreMatches ? this.getLoadMoreButtonHTML() : ''}
    `;

    container.innerHTML = tableHTML;
    this.setupMatchEventListeners(container);
  }

  /**
   * Render a single match row
   */
  renderMatchRow(match) {
    const isEditing = this.editingMatches.has(match._id);
    const date = new Date(match.date).toLocaleDateString();
    const playerData = this.getPlayerDataFromMatch(match);
    
    if (isEditing) {
      return this.renderEditingMatchRow(match, playerData);}

    return `
      <div class="match-row" data-match-id="${match._id}">
        <div class="match-cell date-cell">
          <span class="match-date">${date}</span>
          <span class="match-time">${new Date(match.date).toLocaleTimeString()}</span>
        </div>
        <div class="match-cell map-cell">
          <span class="map-name">${match.map || 'Unknown Map'}</span>
          <span class="map-resources">${this.getResourceLabel(match.resources)}</span>
        </div>
        <div class="match-cell opponent-cell">
          ${this.renderOpponentsList(match, playerData.playerId)}
        </div>
        <div class="match-cell race-cell">
          <span class="race-badge race-${playerData.race}">
            ${this.capitalizeRace(playerData.race)}
          </span>
        </div>
        <div class="match-cell result-cell">
          <span class="result-badge result-${playerData.result}">
            ${this.capitalizeResult(playerData.result)}
          </span>
        </div>
        <div class="match-cell actions-cell">
          <button class="btn btn-sm btn-secondary edit-match-btn" 
                  onclick="editMatch('${match._id}')" 
                  title="Edit Match">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger delete-match-btn" 
                  onclick="deleteMatch('${match._id}')" 
                  title="Delete Match">
            <i class="fas fa-trash"></i>
          </button>
          ${match.screenshots && match.screenshots.length > 0 ? 
            `<button class="btn btn-sm btn-info view-screenshots-btn" 
                     onclick="viewScreenshots(${JSON.stringify(match.screenshots).replace(/"/g, '&quot;')})" 
                     title="View Screenshots">
               <i class="fas fa-images"></i>
             </button>` : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * Render editing mode for a match row
   */
  renderEditingMatchRow(match, playerData) {
    const date = new Date(match.date).toISOString().slice(0, 16);
    
    return `
      <div class="match-row editing" data-match-id="${match._id}">
        <div class="match-cell date-cell">
          <input type="datetime-local" 
                 class="edit-date" 
                 value="${date}" 
                 name="date">
        </div>
        <div class="match-cell map-cell">
          <input type="text" 
                 class="edit-map" 
                 value="${match.map || ''}" 
                 name="map" 
                 placeholder="Map name">
          <select class="edit-resources" name="resources">
            <option value="high" ${match.resources === 'high' ? 'selected' : ''}>High Resources</option>
            <option value="medium" ${match.resources === 'medium' ? 'selected' : ''}>Medium Resources</option>
            <option value="low" ${match.resources === 'low' ? 'selected' : ''}>Low Resources</option>
          </select>
        </div>
        <div class="match-cell opponent-cell">
          <div class="opponents-edit">
            ${match.players.filter(p => p.playerId !== playerData.playerId)
              .map((opponent, index) => `
                <div class="opponent-edit-row">
                  <input type="text" 
                         class="edit-opponent-name" 
                         value="${opponent.playerName}" 
                         name="opponent-${index}-name" 
                         placeholder="Opponent name">
                  <select class="edit-opponent-race" name="opponent-${index}-race">
                    <option value="human" ${opponent.race === 'human' ? 'selected' : ''}>Human</option>
                    <option value="orc" ${opponent.race === 'orc' ? 'selected' : ''}>Orc</option>
                    <option value="random" ${opponent.race === 'random' ? 'selected' : ''}>Random</option>
                  </select>
                </div>
              `).join('')}
          </div>
        </div>
        <div class="match-cell race-cell">
          <select class="edit-race" name="race">
            <option value="human" ${playerData.race === 'human' ? 'selected' : ''}>Human</option>
            <option value="orc" ${playerData.race === 'orc' ? 'selected' : ''}>Orc</option>
            <option value="random" ${playerData.race === 'random' ? 'selected' : ''}>Random</option>
          </select>
        </div>
        <div class="match-cell result-cell">
          <select class="edit-result" name="result">
            <option value="win" ${playerData.result === 'win' ? 'selected' : ''}>Win</option>
            <option value="loss" ${playerData.result === 'loss' ? 'selected' : ''}>Loss</option>
            <option value="draw" ${playerData.result === 'draw' ? 'selected' : ''}>Draw</option>
          </select>
        </div>
        <div class="match-cell actions-cell">
          <button class="btn btn-sm btn-success save-match-btn" 
                  onclick="saveMatchEdit('${match._id}')" 
                  title="Save Changes">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-sm btn-secondary cancel-edit-btn" 
                  onclick="cancelMatchEdit('${match._id}')" 
                  title="Cancel">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;}

  /**
   * Get player data from match
   */
  getPlayerDataFromMatch(match) {
    // Find the current player in the match
    const currentPlayer = match.players.find(p => p.isCurrentPlayer) || match.players[0];
    return {
      playerId: currentPlayer.playerId,
      playerName: currentPlayer.playerName,
      race: currentPlayer.race || 'random',
      result: currentPlayer.result || 'unknown'
    };}

  /**
   * Render opponents list
   */
  renderOpponentsList(match, currentPlayerId) {
    const opponents = match.players.filter(p => p.playerId !== currentPlayerId);
    
    if (opponents.length === 0) {
      return '<span class="no-opponents">No opponents</span>';}

    return opponents.map(opponent => 
      `<div class="opponent-info">
         <span class="opponent-name">${opponent.playerName}</span>
         <span class="opponent-race race-${opponent.race}">${this.capitalizeRace(opponent.race)}</span>
       </div>`
    ).join('');}

  /**
   * Get resource label
   */
  getResourceLabel(resources) {
    const labels = {
      high: 'High Resources',
      medium: 'Medium Resources', 
      low: 'Low Resources'
    };
    return labels[resources] || 'Unknown Resources';}

  /**
   * Capitalize race name
   */
  capitalizeRace(race) {
    return race ? race.charAt(0).toUpperCase() + race.slice(1) : 'Unknown';}

  /**
   * Capitalize result
   */
  capitalizeResult(result) {
    return result ? result.charAt(0).toUpperCase() + result.slice(1) : 'Unknown';}

  /**
   * Get no matches HTML
   */
  getNoMatchesHTML() {
    return `
      <div class="no-matches">
        <i class="fas fa-trophy"></i>
        <h3>No Matches Found</h3>
        <p>This player hasn't played any matches yet, or no matches match your current filters.</p>
      </div>
    `;}

  /**
   * Get load more button HTML
   */
  getLoadMoreButtonHTML() {
    return `
      <div class="load-more-container">
        <button class="btn btn-secondary load-more-btn" onclick="loadMoreMatches()">
          <i class="fas fa-arrow-down"></i> Load More Matches
        </button>
      </div>
    `;}

  /**
   * Setup event listeners for match interactions
   */
  setupMatchEventListeners(container) {
    // Handle row hover effects
    const matchRows = container.querySelectorAll('.match-row');
    matchRows.forEach(row => {
      row.addEventListener('mouseenter', () => {
        row.classList.add('hovered');
      });
      
      row.addEventListener('mouseleave', () => {
        row.classList.remove('hovered');
      });
    });

    console.log(`✅ Event listeners setup for ${matchRows.length} match rows`);
  }

  /**
   * Edit match functionality
   */
  async editMatch(matchId) {
    if (this.editingMatches.has(matchId)) {
      console.log(`Already editing match ${matchId}`);
      return;}

    console.log(`✏️ Starting edit for match ${matchId}`);
    this.editingMatches.add(matchId);
    
    // Re-render the specific row
    const matchRow = document.querySelector(`[data-match-id="${matchId}"]`);
    if (matchRow) {
      const match = this.matchData.get(matchId);
      if (match) {
        const playerData = this.getPlayerDataFromMatch(match);
        matchRow.outerHTML = this.renderEditingMatchRow(match, playerData);
      }
    }
  }

  /**
   * Save match edit
   */
  async saveMatchEdit(matchId) {
    const matchRow = document.querySelector(`[data-match-id="${matchId}"]`);
    if (!matchRow) return;try {
      console.log(`💾 Saving match edit for ${matchId}`);
      
      // Collect form data
      const formData = this.collectMatchEditData(matchRow);
      
      // Validate data
      if (!this.validateMatchData(formData)) {
        return;}

      // Send update to server
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local data
          this.matchData.set(matchId, result.data);
          this.editingMatches.delete(matchId);
          
          // Re-render the row
          const playerData = this.getPlayerDataFromMatch(result.data);
          matchRow.outerHTML = this.renderMatchRow(result.data);
          
          this.showSuccess('Match updated successfully');
          console.log(`✅ Match ${matchId} updated successfully`);
        } else {
          throw new Error(result.error || 'Failed to update match');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('❌ Failed to save match edit:', error);
      this.showError(`Failed to save match: ${error.message}`);
    }
  }

  /**
   * Cancel match edit
   */
  cancelMatchEdit(matchId) {
    console.log(`❌ Cancelling edit for match ${matchId}`);
    
    this.editingMatches.delete(matchId);
    
    const matchRow = document.querySelector(`[data-match-id="${matchId}"]`);
    if (matchRow) {
      const match = this.matchData.get(matchId);
      if (match) {
        matchRow.outerHTML = this.renderMatchRow(match);
      }
    }
  }

  /**
   * Collect match edit data from form
   */
  collectMatchEditData(matchRow) {
    const data = {};
    
    // Get basic match data
    data.date = matchRow.querySelector('.edit-date')?.value;
    data.map = matchRow.querySelector('.edit-map')?.value;
    data.resources = matchRow.querySelector('.edit-resources')?.value;
    
    // Get player race and result
    data.race = matchRow.querySelector('.edit-race')?.value;
    data.result = matchRow.querySelector('.edit-result')?.value;
    
    // Get opponent data
    data.opponents = [];
    const opponentRows = matchRow.querySelectorAll('.opponent-edit-row');
    opponentRows.forEach((row, index) => {
      const name = row.querySelector('.edit-opponent-name')?.value;
      const race = row.querySelector('.edit-opponent-race')?.value;
      
      if (name) {
        data.opponents.push({ name, race });
      }
    });

    return data;}

  /**
   * Validate match data
   */
  validateMatchData(data) {
    if (!data.date) {
      this.showError('Date is required');
      return false;}

    if (!data.map || data.map.trim().length === 0) {
      this.showError('Map name is required');
      return false;}

    if (!data.race) {
      this.showError('Race is required');
      return false;}

    if (!data.result) {
      this.showError('Result is required');
      return false;}

    return true;}

  /**
   * Delete match
   */
  async deleteMatch(matchId) {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return;}

    try {
      console.log(`🗑️ Deleting match ${matchId}`);
      
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Remove from local data
          this.matchData.delete(matchId);
          this.editingMatches.delete(matchId);
          
          // Remove row from DOM
          const matchRow = document.querySelector(`[data-match-id="${matchId}"]`);
          if (matchRow) {
            matchRow.remove();
          }
          
          this.showSuccess('Match deleted successfully');
          console.log(`✅ Match ${matchId} deleted successfully`);
        } else {
          throw new Error(result.error || 'Failed to delete match');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('❌ Failed to delete match:', error);
      this.showError(`Failed to delete match: ${error.message}`);
    }
  }

  /**
   * Load more matches
   */
  async loadMoreMatches() {
    if (this.isLoading || !this.hasMoreMatches) {
      return;}

    const nextPage = this.currentPage + 1;
    const newData = await this.loadMatchHistory(this.currentPlayerId, nextPage, this.currentFilters);
    
    if (newData && newData.matches.length > 0) {
      // Append new matches to existing container
      const container = document.getElementById('match-history-container');
      const tableBody = container.querySelector('.table-body');
      
      if (tableBody) {
        const newRowsHTML = newData.matches.map(match => this.renderMatchRow(match)).join('');
        tableBody.insertAdjacentHTML('beforeend', newRowsHTML);
        
        // Update load more button
        const loadMoreContainer = container.querySelector('.load-more-container');
        if (loadMoreContainer) {
          if (this.hasMoreMatches) {
            loadMoreContainer.innerHTML = this.getLoadMoreButtonHTML().match(/<button[^>]*>.*?<\/button>/)[0];
          } else {
            loadMoreContainer.remove();
          }
        }
      }
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    // Use global error system if available
    if (typeof window.playerModalCore !== 'undefined') {
      window.playerModalCore.showErrorModal(message);
    } else {
      alert('Error: ' + message);
    }
  }

  /**
   * Show success message  
   */
  showSuccess(message) {
    // Use global success system if available
    if (typeof window.playerModalCore !== 'undefined') {
      window.playerModalCore.showSuccessMessage(message);
    } else {
      console.log('Success:', message);
    }
  }

  /**
   * Setup match history styles
   */
  setupMatchHistoryStyles() {
    if (document.getElementById('match-history-styles')) return;const styles = document.createElement('style');
    styles.id = 'match-history-styles';
    styles.textContent = `
      .match-history-table {
        background: rgba(51, 65, 85, 0.3);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.2);
      }

      .table-header {
        display: grid;
        grid-template-columns: 120px 1fr 1fr 100px 100px 120px;
        background: rgba(212, 175, 55, 0.1);
        border-bottom: 2px solid rgba(212, 175, 55, 0.3);
      }

      .header-cell {
        padding: 15px 10px;
        font-weight: 600;
        color: #D4AF37;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .table-body {
        max-height: 600px;
        overflow-y: auto;
      }

      .match-row {
        display: grid;
        grid-template-columns: 120px 1fr 1fr 100px 100px 120px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        transition: all 0.3s ease;
      }

      .match-row:hover,
      .match-row.hovered {
        background: rgba(212, 175, 55, 0.05);
      }

      .match-row.editing {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .match-cell {
        padding: 12px 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        color: #e2e8f0;
        font-size: 13px;
      }

      .date-cell {
        font-size: 12px;
      }

      .match-date {
        font-weight: 500;
        color: #f1f5f9;
      }

      .match-time {
        color: #94a3b8;
        font-size: 11px;
      }

      .map-name {
        font-weight: 500;
        color: #f1f5f9;
        margin-bottom: 2px;
      }

      .map-resources {
        color: #94a3b8;
        font-size: 11px;
      }

      .opponent-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .opponent-name {
        font-weight: 500;
      }

      .opponent-race {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        text-transform: uppercase;
      }

      .race-badge,
      .result-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        text-align: center;
      }

      .race-human {
        background: rgba(74, 144, 226, 0.2);
        color: #4a90e2;
        border: 1px solid rgba(74, 144, 226, 0.3);
      }

      .race-orc {
        background: rgba(226, 74, 74, 0.2);
        color: #e24a4a;
        border: 1px solid rgba(226, 74, 74, 0.3);
      }

      .race-random {
        background: rgba(160, 160, 160, 0.2);
        color: #a0a0a0;
        border: 1px solid rgba(160, 160, 160, 0.3);
      }

      .result-win {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      .result-loss {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .result-draw {
        background: rgba(249, 115, 22, 0.2);
        color: #f97316;
        border: 1px solid rgba(249, 115, 22, 0.3);
      }

      .actions-cell {
        flex-direction: row;
        gap: 5px;
        align-items: center;
      }

      .btn {
        padding: 6px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-sm {
        padding: 4px 6px;
        font-size: 11px;
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

      .btn-success {
        background: #10b981;
        color: white;
      }

      .btn-success:hover {
        background: #059669;
      }

      .btn-info {
        background: #0ea5e9;
        color: white;
      }

      .btn-info:hover {
        background: #0284c7;
      }

      .edit-date,
      .edit-map,
      .edit-resources,
      .edit-race,
      .edit-result,
      .edit-opponent-name,
      .edit-opponent-race {
        padding: 4px 6px;
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 4px;
        background: rgba(51, 65, 85, 0.8);
        color: #f1f5f9;
        font-size: 12px;
        margin-bottom: 2px;
      }

      .edit-date:focus,
      .edit-map:focus,
      .edit-resources:focus,
      .edit-race:focus,
      .edit-result:focus,
      .edit-opponent-name:focus,
      .edit-opponent-race:focus {
        outline: none;
        border-color: #D4AF37;
      }

      .opponent-edit-row {
        display: flex;
        gap: 5px;
        margin-bottom: 4px;
      }

      .no-matches {
        text-align: center;
        padding: 60px 20px;
        color: #94a3b8;
      }

      .no-matches i {
        font-size: 48px;
        margin-bottom: 20px;
        opacity: 0.5;
      }

      .no-matches h3 {
        margin: 0 0 10px 0;
        color: #e2e8f0;
      }

      .no-opponents {
        color: #94a3b8;
        font-style: italic;
      }

      .load-more-container {
        padding: 20px;
        text-align: center;
        background: rgba(51, 65, 85, 0.2);
        border-top: 1px solid rgba(148, 163, 184, 0.1);
      }

      .load-more-btn {
        background: #475569;
        color: #f1f5f9;
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
      }

      .load-more-btn:hover {
        background: #64748b;
      }

      .load-more-btn i {
        margin-right: 8px;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Cleanup match history data
   */
  cleanup() {
    console.log('🧹 Cleaning up Player Match History...');
    
    this.matchData.clear();
    this.editingMatches.clear();
    this.currentPage = 1;
    this.isLoading = false;
    this.hasMoreMatches = true;
    this.currentFilters = {};

    console.log('✅ Player Match History cleanup complete');
  }
}

// Create and export singleton instance
export const playerMatchHistory = new PlayerMatchHistory(); 