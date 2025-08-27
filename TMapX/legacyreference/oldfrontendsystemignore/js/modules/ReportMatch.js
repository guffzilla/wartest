/**
 * ReportMatch Module
 * Handles all match reporting functionality including modal management,
 * form handling, validation, and submission
 */

class ReportMatch {
  constructor() {
    this.ladderAPI = null;
    this.savedFormData = {};
    this.currentGameType = 'wc2';
  }

  /**
   * Initialize the report match system
   */
  init() {
    this.ladderAPI = window.ladderAPI;
    this.setupReportMatch();
    console.log('✅ ReportMatch module initialized');
  }

  /**
   * Open the report match modal (public method)
   */
  async openReportModal() {
    console.log('🎮 Opening report match modal via public method...');
    
    const modal = document.getElementById('report-match-modal');
    if (!modal) {
      console.error('❌ Report match modal not found');
      return;}

    // Use modal class toggling to match unified full-screen styling
    modal.classList.add('show');
    modal.classList.add('modal');
    modal.classList.remove('minimized');
    document.body.style.overflow = 'hidden';

    // Sync current game type from ladder bridge
    if (window.ladderBridge?.getCurrentGameType) {
      const gt = window.ladderBridge.getCurrentGameType();
      const normalized = gt?.startsWith('warcraft') ? `wc${gt.replace('warcraft','')}` : gt;
      if (['wc1','wc2','wc3'].includes(normalized)) this.currentGameType = normalized;
    }

    // Update header badge and indicator
    this.updateGameDisplays();

    // Load recent settings and auto-populate
    this.loadRecentSettings().then(() => {
      const matchTypeSelect = document.getElementById('match-type');
      if (matchTypeSelect) {
        this.updatePlayerInputs(matchTypeSelect.value);
      }
      this.autoFillCurrentUser();
      this.setupMapSelection();
    });

    console.log('✅ Report match modal opened successfully');
  }

  /**
   * Set up report match functionality
   */
  setupReportMatch() {
    const reportBtnTop = document.getElementById('report-match-btn-top');
    const reportBtn = document.getElementById('report-match-btn');

    // Check if any report button exists
    const trigger = reportBtn || reportBtnTop;
    if (!trigger) {
      console.warn('Report match button not found. Skipping report match setup.');
      return;}

    console.log('🎮 Setting up report match functionality...');

    const modal = document.getElementById('report-match-modal');
    const closeModal = document.querySelector('.close-modal');
    const minimizeModal = document.getElementById('minimize-report-modal');
    const matchTypeSelect = document.getElementById('match-type');
    const playersContainer = document.getElementById('players-container');
    const winnerSelect = document.getElementById('winner');
    const reportForm = document.getElementById('report-match-form');

    // Open modal when report button is clicked (dedupe handler)
    if (!trigger.dataset.reportHandlerAttached) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎮 Report match button clicked');
        this.openReportModal();
      });
      trigger.dataset.reportHandlerAttached = '1';
    }

    // Setup basic close handlers
    if (modal) {
      const scopedClose = modal.querySelector('.close-modal');
      (scopedClose || closeModal)?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
      });
    }

    // Update player inputs when match type changes
    if (matchTypeSelect) {
      matchTypeSelect.addEventListener('change', () => {
        const matchType = matchTypeSelect.value;
        console.log('🔄 Match type changed to:', matchType);
        this.updatePlayerInputs(matchType);
      });
    }

    // Handle form submission
    if (reportForm) {
      reportForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.submitMatchReport(reportForm);
      });
    }
  }

  /**
   * Submit match report
   */
  async submitMatchReport(form) {
    try {
      // Show loading state
      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';

      // Ensure gameType is sent
      this.ensureHiddenGameTypeField();
      this.toggleResourceGroup();
      const formData = new FormData(form);
      const matchType = formData.get('matchType');

      // Collect player data
      const players = [];
      const playerInputs = document.querySelectorAll('.player-input');

      playerInputs.forEach((input) => {
        const playerIndex = input.getAttribute('data-player-index');
        const playerName = formData.get(`player-name-${playerIndex}`);
        const isAI = formData.get(`player-is-ai-${playerIndex}`) === 'on';

        const playerData = {
          name: playerName,
          race: formData.get(`player-race-${playerIndex}`) || 'random',
          isAI: isAI
        };

        // Add team for team games
        if (matchType !== '1v1' && matchType !== 'ffa') {
          playerData.team = parseInt(formData.get(`player-team-${playerIndex}`));
        }

        players.push(playerData);
      });

      // Determine winner value based on match type
      let winner;
      const winnerValue = formData.get('winner');

      if (matchType === '1v1' || matchType === 'ffa') {
        // For 1v1 and FFA, winner is a player name
        const winnerIndex = winnerValue.split('-')[1];
        winner = formData.get(`player-name-${winnerIndex}`);
      } else {
        // For team games, winner is a team number
        winner = parseInt(winnerValue);
      }

      // Create final form data for submission
      const submitFormData = new FormData();
      submitFormData.append('matchType', matchType);

      // Get map name and ID
      const mapInput = document.getElementById('map');
      const mapName = formData.get('map');
      const mapId = mapInput.getAttribute('data-map-id');

      submitFormData.append('map', mapName);
      if (mapId) {
        submitFormData.append('mapId', mapId);
      }

      // Resource level (WC1 -> 'na')
      const resourceValue = this.currentGameType === 'wc1' ? 'na' : formData.get('resourceLevel');
      if (resourceValue) submitFormData.append('resourceLevel', resourceValue);

      submitFormData.append('players', JSON.stringify(players));
      submitFormData.append('winner', winner);
      submitFormData.append('battleReport', formData.get('battleReport') || formData.get('notes') || '');
      submitFormData.append('youtubeLink', formData.get('youtubeLink') || '');

      // Add AI game options if this is a vsai match
      if (matchType === 'vsai') {
        const aiGameOptions = {
          gameVersion: document.getElementById('ai-game-version')?.value || 'warcraft2',
          gameType: document.getElementById('ai-game-type')?.value || 'skirmish'
        };

        // Add campaign mission if applicable
        if (aiGameOptions.gameType === 'campaign') {
          aiGameOptions.campaignMission = document.getElementById('ai-campaign-mission')?.value || '';
        }

        submitFormData.append('aiGameOptions', JSON.stringify(aiGameOptions));
      }

      // Add uneven teams flag if checked
      const unevenTeams = formData.get('unevenTeams') === 'on';
      submitFormData.append('unevenTeams', unevenTeams);

      // Add screenshots
      const screenshotInputs = form.querySelectorAll('input[type="file"]');
      screenshotInputs.forEach(input => {
        if (input.files.length > 0) {
          // Add all selected files, not just the first one
          for (let i = 0; i < input.files.length; i++) {
            submitFormData.append('screenshots', input.files[i]);
          }
        }
      });

      // Include gameType explicitly
      submitFormData.append('gameType', this.currentGameType || 'wc2');

      const response = await fetch('/api/ladder/report', {
        method: 'POST',
        body: submitFormData
      });

      console.log('📡 Received response from server:', response.status, response.statusText);
      const data = await response.json();
      console.log('📊 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Error submitting match report');
      }

      console.log('✅ Match report submitted successfully, about to close modal');
      // Close the modal
      ModalManager.hide('report-match-modal');

      // Show match summary screen instead of just a notification
      console.log('📊 About to show match summary with data:', data);
      try {
        if (window.showMatchSummary) {
          window.showMatchSummary(data);
          console.log('📊 Match summary function called successfully');
        } else {
          console.warn('⚠️ showMatchSummary function not available');
          
          // Trigger epic victory animation
          const customEvent = new CustomEvent('matchSubmitted', {
            detail: {
              success: true,
              result: {
                matchId: data.matchId || 'match_' + Date.now(),
                gameType: data.gameType || this.currentGameType,
                matchType: data.matchType || matchType,
                mmrChange: data.mmrChange || 0,
                rankChange: data.rankChange || false,
                rewards: {
                  arenaGold: data.rewards?.arenaGold || 15,
                  honor: data.rewards?.honor || 10,
                  experience: data.rewards?.experience || 25
                }
              }
            }
          });
          document.dispatchEvent(customEvent);
        }
      } catch (summaryError) {
        console.error('❌ Error showing match summary:', summaryError);
        
        // Still trigger animation on success
        const customEvent = new CustomEvent('matchSubmitted', {
          detail: {
            success: true,
            result: {
              matchId: 'match_' + Date.now(),
              gameType: this.currentGameType,
              rewards: { arenaGold: 15, honor: 10, experience: 25 }
            }
          }
        });
        document.dispatchEvent(customEvent);
        window.location.reload();
      }

    } catch (err) {
      console.error('❌ Error submitting match report:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      this.showNotification(err.message, 'error');
    } finally {
      // Reset button state
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Report';
    }
  }

  /**
   * Show notification
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
      // Fallback to themed notification
      if (window.showError && type === 'error') {
        window.showError(message);
      } else if (window.showSuccess && type === 'success') {
        window.showSuccess(message);
      } else if (window.showWarning && type === 'warning') {
        window.showWarning(message);
      } else if (window.showInfo) {
        window.showInfo(message);
      } else {
        // Final fallback
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    }
  }

  /**
   * Load recent settings and populate auto-completion UI
   */
  async loadRecentSettings() {
    try {
      console.log('🔄 Loading recent settings for auto-population...');
      
      const response = await fetch('/api/ladder/recent-settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Recent settings loaded:', data);

      // Auto-populate last settings
      if (data.lastSettings) {
        const mapInput = document.getElementById('map');
        const resourceRadios = document.querySelectorAll('input[name="resourceLevel"]');
        
        if (mapInput && data.lastSettings.map) {
          mapInput.value = data.lastSettings.map;
        }
        
        if (data.lastSettings.resources) {
          resourceRadios.forEach(radio => {
            radio.checked = radio.value === data.lastSettings.resources;
          });
        }
        
        console.log('🎯 Auto-populated last settings:', data.lastSettings);
      }

    } catch (error) {
      console.error('❌ Error loading recent settings:', error);
    }
  }

  /**
   * Update player inputs based on match type
   */
  updatePlayerInputs(matchType) {
    console.log('🎯 updatePlayerInputs called with matchType:', matchType);
    
    const playersContainer = document.getElementById('players-container');
    if (!playersContainer) {
      console.error('❌ Players container not found');
      return;}

    // Clear existing players
    playersContainer.innerHTML = '';

    // Determine number of players based on match type
    let numPlayers = 2;
    switch (matchType) {
      case '1v1': numPlayers = 2; break;
      case '2v2': numPlayers = 4; break;
      case '3v3': numPlayers = 6; break;
      case '4v4': numPlayers = 8; break;
      case 'ffa': numPlayers = 4; break;
      default: numPlayers = 2; break;
    }

    // Create player inputs
    for (let i = 0; i < numPlayers; i++) {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-input';
      playerDiv.dataset.playerIndex = i;
      const allowed = this.getAllowedRaces();
      const raceOptions = allowed.map(r => `<option value="${r}">${r.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>`).join('');
      playerDiv.innerHTML = `
        <h4>Player ${i + 1}</h4>
        <div class="player-name-container">
          <label for="player-name-${i}">Name:</label>
          <input type="text" name="player-name-${i}" placeholder="Player name" required class="player-name-drop-zone">
          <div class="player-type-toggle">
            <label class="toggle-label">
              <input type="checkbox" name="player-is-ai-${i}" class="player-is-ai-checkbox">
              <span>AI</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label for="player-race-${i}">Race:</label>
          <select name="player-race-${i}" required>
            ${raceOptions}
          </select>
        </div>
      `;
      playersContainer.appendChild(playerDiv);
    }

    // Update displays to current game and ensure hidden field is present
    this.updateGameDisplays();
  }

  /**
   * Auto-fill current user as Player 1
   */
  async autoFillCurrentUser() {
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      if (response.ok) {
        const user = await response.json();
        const player1Input = document.querySelector('input[name="player-name-0"]');
        if (player1Input && user.username) {
          player1Input.value = user.username;
          console.log('🎯 Auto-filled current user:', user.username);
        }
      }
    } catch (error) {
      console.log('🎯 Could not auto-fill current user:', error);
    }
  }

  /**
   * Setup map selection functionality
   */
  setupMapSelection() {
    const mapInput = document.getElementById('map');
    if (!mapInput) return;console.log('🗺️ Setting up map selection');
    
    // Basic map validation
    mapInput.addEventListener('input', () => {
      const mapName = mapInput.value.trim();
      if (mapName.length > 0) {
        console.log('🗺️ Map selected:', mapName);
      }
    });
  }

  ensureHiddenGameTypeField() {
    const form = document.getElementById('report-match-form');
    if (!form) return;let input = form.querySelector('input[name="gameType"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'gameType';
      form.appendChild(input);
    }
    input.value = this.currentGameType || 'wc2';
  }

  updateGameDisplays() {
    const badge = document.getElementById('report-game-badge');
    const indicator = document.getElementById('report-game-indicator');
    const title = document.getElementById('report-modal-title');

    const nameMap = { wc1: 'WC I', wc2: 'WC II', wc3: 'WC III' };
    const label = nameMap[this.currentGameType] || 'WC II';

    if (badge) badge.textContent = label;
    if (indicator) indicator.textContent = label;
    if (title) title.textContent = `Report ${label} Match`;

    this.ensureHiddenGameTypeField();
    this.refreshRaceOptions();
    this.toggleResourceGroup();
  }

  toggleResourceGroup() {
    const resourceInputs = document.querySelectorAll('input[name="resourceLevel"]');
    const resourceGroup = resourceInputs.length > 0 ? resourceInputs[0].closest('.form-group') : null;
    if (this.currentGameType === 'wc1') {
      resourceInputs.forEach(inp => { inp.required = false; inp.checked = false; });
      if (resourceGroup) resourceGroup.style.display = 'none';
    } else {
      resourceInputs.forEach(inp => { inp.required = true; });
      if (resourceGroup) resourceGroup.style.display = '';
    }
  }

  getAllowedRaces() {
    return this.currentGameType === 'wc3'
      ? ['human','orc','undead','night_elf','random']
      : ['human','orc','random'];}

  refreshRaceOptions() {
    const selects = document.querySelectorAll('select[name^="player-race-"]');
    const allowed = this.getAllowedRaces();
    selects.forEach(select => {
      const current = select.value;
      select.innerHTML = '';
      allowed.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase());
        select.appendChild(opt);
      });
      // Restore current if still allowed, else default to 'random'
      if (allowed.includes(current)) select.value = current; else select.value = 'random';
    });
  }
}

// Export for use in other modules
window.ReportMatch = ReportMatch;

// Robust auto-init: initialize immediately if DOM is already ready, otherwise on DOMContentLoaded
(function initReportMatchAuto() {
  const doInit = () => {
    if (!window.reportMatch) {
      window.reportMatch = new ReportMatch();
      try { window.reportMatch.init(); } catch (e) { console.error('ReportMatch init error:', e); }
    }
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    doInit();
  } else {
    document.addEventListener('DOMContentLoaded', doInit);
  }
})();