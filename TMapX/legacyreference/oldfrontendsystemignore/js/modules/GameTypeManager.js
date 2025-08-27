class GameTypeManager {
    constructor() {
        this.apiClient = new ApiClient();
        this.currentUser = null;
        this.currentGameType = 'wc2'; // Default to WC2
        this.isInitialized = false;
        this.init();
    }

    async init() {
        console.log('🎮 Initializing GameTypeManager...');
        await this.loadCurrentUser();
        this.setupGameTypeSwitcher();
        this.bindEvents();
        this.isInitialized = true;
        console.log('✅ GameTypeManager initialized');
    }

    async loadCurrentUser() {
        try {
            const response = await this.apiClient.getCurrentUser();
            if (response.success) {
                this.currentUser = response.data;
                console.log('👤 Current user loaded:', this.currentUser);
            } else {
                console.warn('⚠️ Failed to load current user');
            }
        } catch (error) {
            console.error('❌ Error loading current user:', error);
        }
    }

    setupGameTypeSwitcher() {
        // Always show the game type switcher for all users
        this.createGameTypeSwitcher();
        this.updateUIForGameType();
        console.log('🎮 Game type switcher setup complete');
    }

    bindEvents() {
        // Bind click events for game type buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.game-type-btn[data-game-type]')) {
                e.preventDefault();
                const gameType = e.target.getAttribute('data-game-type');
                console.log('🎮 Game type button clicked:', gameType);
                this.selectGameType(gameType);
            }
        });

        // Bind tab switching events
        document.addEventListener('click', (e) => {
            if (e.target.matches('.game-tab[data-game]')) {
                e.preventDefault();
                const gameType = e.target.getAttribute('data-game') === 'war2' ? 'wc2' : 'wc3';
                console.log('🎮 Game tab clicked:', gameType);
                this.selectGameType(gameType);
            }
        });
    }

    selectGameType(gameType) {
        console.log('🎮 Selecting game type:', gameType);
        this.currentGameType = gameType;
        this.updateUIForGameType();
        this.updatePageBranding();
        this.updateNavigation();
        this.filterByGameType(gameType);
        
        // Trigger custom event for other components
        const event = new CustomEvent('gameTypeChanged', { 
            detail: { gameType } 
        });
        document.dispatchEvent(event);
    }

    createGameTypeSwitcher() {
        // Create or update the game type switcher in the header
        let switcherContainer = document.querySelector('.game-type-switcher');
        
        if (!switcherContainer) {
            // Find a suitable container (try header first, then create one)
            const header = document.querySelector('.ladder-header') || 
                          document.querySelector('h1') || 
                          document.querySelector('main');
            
            if (header) {
                switcherContainer = document.createElement('div');
                switcherContainer.className = 'game-type-switcher';
                header.parentNode.insertBefore(switcherContainer, header.nextSibling);
            }
        }

        if (switcherContainer) {
            switcherContainer.innerHTML = `
                <div class="game-type-tabs">
                    <button class="game-type-btn ${this.currentGameType === 'warcraft2' ? 'active' : ''}" 
                            data-game-type="warcraft2">
                        <i class="fas fa-sword"></i>
                        <span>Warcraft II</span>
                    </button>
                    <button class="game-type-btn ${this.currentGameType === 'warcraft3' ? 'active' : ''}" 
                            data-game-type="warcraft3">
                        <i class="fas fa-magic"></i>
                        <span>Warcraft III</span>
                    </button>
                </div>
            `;
        }
    }

    updateUIForGameType() {
        console.log('🎮 Updating UI for game type:', this.currentGameType);
        
        // Update active tab
        document.querySelectorAll('.game-type-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-game-type') === this.currentGameType) {
                btn.classList.add('active');
            }
        });

        // Update any existing game tabs
        document.querySelectorAll('.game-tab').forEach(tab => {
            tab.classList.remove('active');
            const tabGame = tab.getAttribute('data-game');
                if ((tabGame === 'war2' && this.currentGameType === 'wc2') ||
        (tabGame === 'war3' && this.currentGameType === 'wc3')) {
                tab.classList.add('active');
            }
        });

        // Update forms and other UI elements
        this.updatePlayerCreationForm();
        this.updateMatchReportingForm();
    }

    updatePageBranding() {
        const isWar3 = this.currentGameType === 'wc3';
        
        // Update body class for theming
        document.body.classList.remove('war2-theme', 'war3-theme');
        document.body.classList.add(isWar3 ? 'war3-theme' : 'war2-theme');

        // Update page title
        const title = document.querySelector('title');
        if (title) {
            const baseTitle = 'Warcraft Arena - Ladder';
            const gameTitle = isWar3 ? 'Warcraft III' : 'Warcraft II';
            title.textContent = `${gameTitle} ${baseTitle}`;
        }

        // Update main heading
        const heading = document.querySelector('h1');
        if (heading && heading.textContent.includes('Ladder')) {
            const gameTitle = isWar3 ? 'Warcraft III' : 'Warcraft II';
            heading.textContent = `${gameTitle} Ladder`;
        }
    }

    updatePlayerCreationForm() {
        const forms = document.querySelectorAll('.create-player-form, #createPlayerForm');
        forms.forEach(form => {
            this.updateRaceOptions(form);
        });
    }

    updateRaceOptions(container) {
        const raceSelects = container.querySelectorAll('select[name="race"], select[name="preferredRace"]');
        
        raceSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '';
            
            if (this.currentGameType === 'warcraft2') {
                // War2 races
                const races = [
                    { value: 'human', label: 'Human' },
                    { value: 'orc', label: 'Orc' },
                    { value: 'random', label: 'Random' }
                ];
                
                races.forEach(race => {
                    const option = document.createElement('option');
                    option.value = race.value;
                    option.textContent = race.label;
                    if (race.value === currentValue) option.selected = true;
                    select.appendChild(option);
                });
            } else {
                // War3 races
                const races = [
                    { value: 'human', label: 'Human' },
                    { value: 'orc', label: 'Orc' },
                    { value: 'undead', label: 'Undead' },
                    { value: 'night_elf', label: 'Night Elf' },
                    { value: 'random', label: 'Random' }
                ];
                
                races.forEach(race => {
                    const option = document.createElement('option');
                    option.value = race.value;
                    option.textContent = race.label;
                    if (race.value === currentValue) option.selected = true;
                    select.appendChild(option);
                });
            }
        });
    }

    updateMatchReportingForm() {
        const forms = document.querySelectorAll('.match-report-form, #reportMatchForm');
        forms.forEach(form => {
            this.updateRaceOptions(form);
            this.updateMapSelection(form);
        });
    }

    updateMapSelection(form) {
        const mapContainers = form.querySelectorAll('.map-selection-container');
        mapContainers.forEach(container => {
            if (this.currentGameType === 'warcraft2') {
                this.showWar2MapSelection(container);
            } else {
                this.showWar3MapSelection(container);
            }
        });
    }

    showWar2MapSelection(container) {
        container.innerHTML = `
            <label for="mapName">Map Name:</label>
            <input type="text" id="mapName" name="mapName" required>
            <label for="resourceLevel">Resource Level:</label>
            <select id="resourceLevel" name="resourceLevel" required>
                <option value="low">Low Resources</option>
                <option value="medium">Medium Resources</option>
                <option value="high">High Resources</option>
            </select>
        `;
    }

    showWar3MapSelection(container) {
        container.innerHTML = `
            <label for="mapId">Map:</label>
            <select id="mapId" name="mapId" required>
                <option value="">Loading maps...</option>
            </select>
        `;
        this.loadWar3Maps();
    }

    async loadWar3Maps() {
        try {
            const response = await this.apiClient.getWar3Maps();
            if (response.success) {
                const mapSelect = document.querySelector('select[name="mapId"]');
                if (mapSelect) {
                    mapSelect.innerHTML = '<option value="">Select a map</option>';
                    response.data.forEach(map => {
                        const option = document.createElement('option');
                        option.value = map._id;
                        option.textContent = map.name;
                        mapSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error loading War3 maps:', error);
        }
    }

    updateNavigation() {
        // Update any navigation elements that need to reflect current game type
        const gameTypeParam = new URLSearchParams(window.location.search).get('gameType');
        if (gameTypeParam !== this.currentGameType) {
            const url = new URL(window.location);
            url.searchParams.set('gameType', this.currentGameType);
            window.history.replaceState(null, '', url.toString());
        }
    }

    filterByGameType(gameType) {
        console.log('🎮 Filtering ladder by game type:', gameType);
        
        // Filter player rows
        const playerRows = document.querySelectorAll('.player-row');
        playerRows.forEach(row => {
            const playerGameType = row.getAttribute('data-game-type') || 
                                 row.querySelector('[data-game-type]')?.getAttribute('data-game-type');
            
            if (playerGameType) {
                if (playerGameType === gameType) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });

        // Filter match history
        const matchRows = document.querySelectorAll('.match-row');
        matchRows.forEach(row => {
            const matchGameType = row.getAttribute('data-game-type') || 
                                row.querySelector('[data-game-type]')?.getAttribute('data-game-type');
            
            if (matchGameType) {
                if (matchGameType === gameType) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });

        // Update statistics and other game-specific elements
        this.updateGameSpecificStats();
    }

    updateGameSpecificStats() {
        // Update any statistics or other elements that should reflect the current game type
        const event = new CustomEvent('statsUpdateNeeded', { 
            detail: { gameType: this.currentGameType } 
        });
        document.dispatchEvent(event);
    }

    getCurrentGameType() {
        return this.currentGameType;}

    isGameTypeSelected() {
        return !!this.currentGameType;}
}

// Make it globally available
window.GameTypeManager = GameTypeManager; 