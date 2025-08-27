/**
 * PlayerManagement Module
 * Handles player drag/drop functionality, team management, and player pool operations
 */

class PlayerManagement {
  constructor() {
    this.winningTeam = [];
    this.losingTeam = [];
    this.currentGameType = 'warcraft2';
  }

  /**
   * Initialize the player management system
   */
  init() {
    // Set up global team arrays
    window.winningTeam = this.winningTeam;
    window.losingTeam = this.losingTeam;
    
    // Set up global functions
    this.setupGlobalFunctions();
    
    console.log('👥 PlayerManagement module initialized');
  }

  /**
   * Set current game type
   */
  setGameType(gameType) {
    this.currentGameType = gameType;
  }

  /**
   * Set up global functions for external access
   */
  setupGlobalFunctions() {
    window.showAddPlayerModal = () => this.showAddPlayerModal();
    window.hideAddPlayerModal = () => this.hideAddPlayerModal();
    window.addPlayerToRecentPlayers = () => this.addPlayerToRecentPlayers();
    window.removePlayerFromPool = (button) => this.removePlayerFromPool(button);
    window.removePlayerFromTeam = (playerName) => this.removePlayerFromTeam(playerName);
    window.updatePlayerRace = (playerName, race) => this.updatePlayerRace(playerName, race);
    window.getRacesForGame = (gameType) => this.getRacesForGame(gameType);
  }

  /**
   * Populate recent players in the player pool
   */
  populateRecentPlayers(players) {
    console.log('👥 Populating recent players with:', players.length, 'players');
    
    const playerPoolList = document.getElementById('player-pool-list');
    if (!playerPoolList) return;playerPoolList.innerHTML = '';

    players.forEach(player => {
      if (player && player.name) {
        this.addRecentPlayerToList(player);
      }
    });
  }

  /**
   * Add recent player to list
   */
  addRecentPlayerToList(player) {
    const playerPoolList = document.getElementById('player-pool-list');
    if (!playerPoolList) return;const playerItem = document.createElement('div');
    playerItem.className = 'pool-player-item';
    playerItem.draggable = true;
    playerItem.dataset.playerName = player.name;
    playerItem.dataset.playerMmr = player.mmr || 1200;
    playerItem.dataset.playerRace = player.preferredRace || 'random';
    
    // Store complete player data for easier access
    playerItem.dataset.playerData = JSON.stringify(player);

    const rankImage = player.rank && player.rank.image 
      ? (player.rank.image.startsWith('/') || player.rank.image.startsWith('http') 
          ? player.rank.image 
          : `/assets/img/ranks/${player.rank.image}`)
      : '/assets/img/ranks/b3.png';

    playerItem.innerHTML = `
      <img src="${rankImage}" alt="Rank" class="pool-player-rank-icon" onerror="this.src='/assets/img/ranks/b3.png'">
      <div class="pool-player-info">
        <div class="pool-player-name">${player.name}</div>
        <div class="pool-player-details">MMR: ${player.mmr || 1200} | ${(player.preferredRace || 'random').charAt(0).toUpperCase() + (player.preferredRace || 'random').slice(1)}</div>
      </div>
      <button class="remove-player-btn" onclick="removePlayerFromPool(this)" title="Remove player">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Add drag event listeners
    playerItem.addEventListener('dragstart', this.handleDragStart.bind(this));
    playerItem.addEventListener('dragend', this.handleDragEnd.bind(this));

    playerPoolList.appendChild(playerItem);
  }

  /**
   * Handle drag start event
   */
  handleDragStart(e) {
    const playerData = {
      name: e.target.dataset.playerName,
      race: e.target.dataset.playerRace,
      mmr: e.target.dataset.playerMmr,
      preferredRace: e.target.dataset.playerRace
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(playerData));
    e.target.classList.add('dragging');
    console.log('👥 Drag started for player:', playerData.name);
  }

  /**
   * Handle drag end event
   */
  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    console.log('👥 Drag ended');
  }

  /**
   * Set up team drop zones
   */
  setupTeamDropZones() {
    const winningTeam = document.getElementById('winning-team');
    const losingTeam = document.getElementById('losing-team');

    [winningTeam, losingTeam].forEach(team => {
      if (team) {
        team.addEventListener('dragover', this.handleTeamDragOver.bind(this));
        team.addEventListener('dragenter', this.handleTeamDragEnter.bind(this));
        team.addEventListener('dragleave', this.handleTeamDragLeave.bind(this));
        team.addEventListener('drop', this.handleTeamDrop.bind(this));
      }
    });

    console.log('👥 Team drop zones set up');
  }

  /**
   * Handle team drag over event
   */
  handleTeamDragOver(e) {
    e.preventDefault();
  }

  /**
   * Handle team drag enter event
   */
  handleTeamDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  /**
   * Handle team drag leave event
   */
  handleTeamDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.classList.remove('drag-over');
    }
  }

  /**
   * Handle team drop event
   */
  handleTeamDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const playerData = e.dataTransfer.getData('text/plain');
    if (!playerData) return;try {
      const player = JSON.parse(playerData);
      const teamType = e.currentTarget.id === 'winning-team' ? 'winning' : 'losing';
      this.addPlayerToTeam(player, teamType);
      console.log('👥 Player dropped on team:', player.name, 'team:', teamType);
    } catch (error) {
      console.error('❌ Error parsing player data:', error);
    }
  }

  /**
   * Add player to team
   */
  addPlayerToTeam(player, teamType) {
    console.log('👥 Adding player to team:', player.name, 'team:', teamType);
    
    // Remove from other team if exists
    this.removePlayerFromTeam(player.name);
    
    // Add to target team
    const team = teamType === 'winning' ? this.winningTeam : this.losingTeam;
    team.push({...player, selectedRace: player.preferredRace || 'random'});
    
    // Update global team references
    window.winningTeam = this.winningTeam;
    window.losingTeam = this.losingTeam;
    
    // Update UI
    this.updateTeamDisplay();
    
    // Remove from pool UI (but keep in pool data for re-adding later)
    const poolItems = document.querySelectorAll('.pool-player-item');
    poolItems.forEach(item => {
      if (item.dataset.playerName === player.name) {
        item.style.display = 'none';
      }
    });
  }

  /**
   * Remove player from team
   */
  removePlayerFromTeam(playerName) {
    console.log('👥 Removing player from teams:', playerName);
    
    // Remove from both teams
    this.winningTeam = this.winningTeam.filter(p => p.name !== playerName);
    this.losingTeam = this.losingTeam.filter(p => p.name !== playerName);
    
    // Update global team references
    window.winningTeam = this.winningTeam;
    window.losingTeam = this.losingTeam;
    
    // Show in pool again
    const poolItems = document.querySelectorAll('.pool-player-item');
    poolItems.forEach(item => {
      if (item.dataset.playerName === playerName) {
        item.style.display = 'flex';
      }
    });
    
    this.updateTeamDisplay();
  }

  /**
   * Update team display
   */
  updateTeamDisplay() {
    this.updateSingleTeamDisplay('winning', this.winningTeam);
    this.updateSingleTeamDisplay('losing', this.losingTeam);
  }

  /**
   * Update single team display
   */
  updateSingleTeamDisplay(teamType, teamPlayers) {
    const teamContainer = document.getElementById(`${teamType}-team-players`);
    const teamCount = document.getElementById(`${teamType}-team-count`);
    
    if (!teamContainer || !teamCount) return;teamCount.textContent = `${teamPlayers.length} player${teamPlayers.length !== 1 ? 's' : ''}`;
    
    // Clear and repopulate
    teamContainer.innerHTML = '';
    
    if (teamPlayers.length === 0) {
      teamContainer.classList.add('empty');
      teamContainer.innerHTML = '<div class="team-drop-zone-text">Drag players here for the ' + teamType + ' team</div>';
      return;}
    
    teamContainer.classList.remove('empty');
    
    teamPlayers.forEach((player, index) => {
      const playerElement = document.createElement('div');
      playerElement.className = 'team-player';
      
      const rankImage = player.rank?.image 
        ? (player.rank.image.startsWith('/') || player.rank.image.startsWith('http') 
            ? player.rank.image 
            : `/assets/img/ranks/${player.rank.image}`)
        : '/assets/img/ranks/unranked.png';
      const races = this.getRacesForGame(this.currentGameType);
      
      playerElement.innerHTML = `
        <div class="team-player-header">
          <div class="team-player-info">
            <img src="${rankImage}" alt="Rank" class="team-player-rank-icon" />
            <div>
              <div class="team-player-name">${player.name}</div>
              <div class="team-player-details">${player.mmr || 0} MMR</div>
            </div>
          </div>
          <button type="button" class="remove-from-team-btn" onclick="removePlayerFromTeam('${player.name}')" title="Remove from team">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="team-player-race-selection">
          <label>Race:</label>
          <div class="team-race-toggle-buttons">
            ${races.map(race => `
              <input type="radio" 
                     id="${teamType}-${index}-${race}" 
                     name="${teamType}-player-${index}-race" 
                     value="${race}" 
                     ${player.selectedRace === race ? 'checked' : ''} 
                     onchange="updatePlayerRace('${player.name}', '${race}')" />
              <label for="${teamType}-${index}-${race}" class="team-race-toggle-btn">${race}</label>
            `).join('')}
          </div>
        </div>
      `;
      
      teamContainer.appendChild(playerElement);
    });

    console.log('👥 Updated', teamType, 'team display with', teamPlayers.length, 'players');
  }

  /**
   * Update player race
   */
  updatePlayerRace(playerName, race) {
    console.log('👥 Updating player race:', playerName, 'to', race);
    
    // Update in both team arrays
    [this.winningTeam, this.losingTeam].forEach(team => {
      const player = team.find(p => p.name === playerName);
      if (player) {
        player.selectedRace = race;
      }
    });

    // Update global team references
    window.winningTeam = this.winningTeam;
    window.losingTeam = this.losingTeam;
  }

  /**
   * Get races for game type
   */
  getRacesForGame(gameType) {
    if (gameType === 'warcraft2') {
      return ['human', 'orc', 'random'];} else if (gameType === 'warcraft3') {
      return ['human', 'orc', 'undead', 'nightelf', 'random'];}
    return ['human', 'orc', 'random'];}

  /**
   * Show add player modal
   */
  showAddPlayerModal() {
    const modal = document.getElementById('add-player-modal');
    if (modal) {
      modal.classList.add('active');
      const input = document.getElementById('new-player-name');
      if (input) {
        input.focus();
        input.value = '';
        
        // Add keyboard support
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.addPlayerToRecentPlayers();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            this.hideAddPlayerModal();
          }
        });
      }
    }
    console.log('👥 Add player modal shown');
  }

  /**
   * Hide add player modal
   */
  hideAddPlayerModal() {
    const modal = document.getElementById('add-player-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    console.log('👥 Add player modal hidden');
  }

  /**
   * Add player to recent players
   */
  addPlayerToRecentPlayers() {
    const input = document.getElementById('new-player-name');
    if (!input) return;const playerName = input.value.trim();
    if (!playerName) return;const playerPoolList = document.getElementById('player-pool-list');
    const existingPlayers = Array.from(playerPoolList.children);
    const existingPlayer = existingPlayers.find(item => 
      item.dataset.playerName.toLowerCase() === playerName.toLowerCase()
    );
    
    if (existingPlayer) {
      this.showNotification('Player already exists in the recent players list!', 'warning');
      return;}
    
    // Create new player object
    const newPlayer = {
      name: playerName,
      mmr: 1200, // Default MMR
      preferredRace: 'random'
    };
    
    // Add to list
    this.addRecentPlayerToList(newPlayer);
    
    // Close modal
    this.hideAddPlayerModal();
    
    console.log('👥 Added new player to pool:', playerName);
  }

  /**
   * Remove player from pool
   */
  removePlayerFromPool(button) {
    const playerItem = button.closest('.pool-player-item');
    if (playerItem) {
      const playerName = playerItem.dataset.playerName;
      playerItem.remove();
      console.log('👥 Removed player from pool:', playerName);
    }
  }

  /**
   * Update winner options based on match type
   */
  updateWinnerOptions(matchType, playerCount) {
    const winnerSelect = document.getElementById('winner');
    if (!winnerSelect) return;winnerSelect.innerHTML = '<option value="">Select winner</option>';

    // Add options based on match type
    if (matchType === '1v1' || matchType === 'ffa' || matchType === 'vsai') {
      // For 1v1 and FFA, winner is a player
      for (let i = 0; i < playerCount; i++) {
        const option = document.createElement('option');
        option.value = `player-${i}`;
        option.textContent = `Player ${i + 1}`;
        winnerSelect.appendChild(option);
      }
    } else {
      // For team games, winner is a team
      const option1 = document.createElement('option');
      option1.value = '1';
      option1.textContent = 'Team 1 (Winning Team)';
      winnerSelect.appendChild(option1);

      const option2 = document.createElement('option');
      option2.value = '2';
      option2.textContent = 'Team 2 (Losing Team)';
      winnerSelect.appendChild(option2);
    }

    console.log('👥 Updated winner options for match type:', matchType);
  }

  /**
   * Validate teams for team games
   */
  validateTeams() {
    const winningTeamCount = this.winningTeam.length;
    const losingTeamCount = this.losingTeam.length;
    
    if (winningTeamCount === 0 || losingTeamCount === 0) {
      return {
        valid: false,
        message: 'Both teams must have at least one player'
      };}
    
    return {
      valid: true,
      winningTeam: this.winningTeam,
      losingTeam: this.losingTeam
    };}

  /**
   * Get team submission data
   */
  getTeamSubmissionData() {
    return {
      winningTeam: this.winningTeam.map(player => ({
        name: player.name,
        race: player.selectedRace || player.preferredRace || 'random',
        team: 1
      })),
      losingTeam: this.losingTeam.map(player => ({
        name: player.name,
        race: player.selectedRace || player.preferredRace || 'random',
        team: 2
      }))
    };}

  /**
   * Clear all teams
   */
  clearAllTeams() {
    this.winningTeam = [];
    this.losingTeam = [];
    window.winningTeam = this.winningTeam;
    window.losingTeam = this.losingTeam;
    
    // Show all players in pool again
    const poolItems = document.querySelectorAll('.pool-player-item');
    poolItems.forEach(item => {
      item.style.display = 'flex';
    });
    
    this.updateTeamDisplay();
    console.log('👥 Cleared all teams');
  }

  /**
   * Get ordinal suffix for a number
   */
  getOrdinalSuffix(n) {
    if (n > 3 && n < 21) return 'th';switch (n % 10) {
      case 1: return 'st';case 2: return 'nd';case 3: return 'rd';default: return 'th';}
  }

  /**
   * Show notification (fallback if NotificationUtils not available)
   */
  showNotification(message, type = 'info') {
    if (window.NotificationUtils) {
      switch(type) {
        case 'success':
          window.NotificationUtils.success(message);
          break;
        case 'error':
          window.NotificationUtils.error(message);
          break;
        case 'warning':
          window.NotificationUtils.warning(message);
          break;
        default:
          window.NotificationUtils.info(message);
      }
    } else {
      // Fallback
      alert(message);
    }
  }
}

// Export for use in other modules
window.PlayerManagement = PlayerManagement;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (!window.playerManagement) {
    window.playerManagement = new PlayerManagement();
  }
}); 