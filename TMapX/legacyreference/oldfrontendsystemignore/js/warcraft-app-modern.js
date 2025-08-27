/**
 * WARCRAFT ARENA - MODERN APP JAVASCRIPT
 * Comprehensive JavaScript for the modern Warcraft-themed gaming platform
 */

import logger from '/js/utils/logger.js';

class WarcraftArenaApp {
    constructor() {
        this.currentUser = null;
        this.currentPlayer = null;
        this.players = [];
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        logger.info('Initializing Warcraft Arena App');
        
        try {
            // Setup systems
            this.setupNotificationSystem();
            this.setupModalSystem();
            this.setupTabSystem();
            this.setupChartSystem();
            
            // Load user data first (continue even if it fails)
            try {
                await this.loadCurrentUser();
            } catch (error) {
                logger.warn('Failed to load current user, continuing with public data', error);
            }
            
            try {
                await this.loadUserPlayers();
            } catch (error) {
                logger.warn('Failed to load user players, continuing with public data', error);
            }
            
            // Initialize dashboard content (this includes the leaderboard)
            try {
                await this.loadDashboardData();
            } catch (error) {
                logger.warn('Failed to load dashboard data', error);
            }
            
            // Create charts after user data is loaded (optional)
            try {
                this.createDashboardCharts();
            } catch (error) {
                logger.warn('Failed to create dashboard charts', error);
            }
            
            logger.info('App initialization complete');
        } catch (error) {
            logger.error('App initialization failed', error);
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    async loadCurrentUser() {
        try {
            const response = await fetch('/api/me');
            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUserDisplay();
                logger.info('User authenticated:', this.currentUser.username);
            } else {
                // User not logged in, but continue with public data
                logger.warn('User not authenticated, showing public data only');
                this.currentUser = null;
            }
        } catch (error) {
            logger.error('Error loading current user:', error);
            // Continue without user data
            this.currentUser = null;
        }
    }

    async loadUserPlayers() {
        try {
            // Only load user players if authenticated
            if (!this.currentUser) {
                logger.warn('User not authenticated, skipping user players load');
                this.players = [];
                return;}
            
            const response = await fetch('/api/ladder/my-players');
            if (response.ok) {
                this.players = await response.json();
                this.updatePlayersDisplay();
                
                // Set first player as active if none selected
                if (this.players.length > 0 && !this.currentPlayer) {
                    this.setActivePlayer(this.players[0]);
                }
                logger.info('User players loaded:', this.players.length);
            }
        } catch (error) {
            logger.error('Error loading user players:', error);
            this.players = [];
        }
    }

    updateUserDisplay() {
        // This method is deprecated - navbar updates are now handled by updateNavbarProfile()
        // Keeping method signature for compatibility but removing duplicate logic
        logger.warn('WarcraftArenaApp.updateUserDisplay() is deprecated - use updateNavbarProfile() instead');
    }

    updatePlayersDisplay() {
        const playerList = document.getElementById('player-list');
        const totalPlayersEl = document.getElementById('total-players');
        
        if (totalPlayersEl) {
            totalPlayersEl.textContent = this.players.length;
        }

        if (!playerList) return;if (this.players.length === 0) {
            playerList.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-user-plus text-2xl mb-2 block"></i>
                    <p>No players yet</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="app.openPlayerCreate()">
                        Create Your First Player
                    </button>
                </div>
            `;
            return;}

        playerList.innerHTML = this.players.map(player => `
            <div class="mini-player-card ${player.id === this.currentPlayer?.id ? 'active' : ''}" 
                 onclick="app.setActivePlayer(${JSON.stringify(player).replace(/"/g, '&quot;')})">
                <div class="mini-player-info">
                    <img src="${player.avatar || '/assets/img/default-avatar.svg'}" 
                         alt="${player.name}" class="mini-player-avatar">
                    <div class="mini-player-details">
                        <h4>${player.name}</h4>
                        <div class="mini-player-rank">${player.rank || 'Unranked'} • ${player.mmr || 1200} MMR</div>
                    </div>
                </div>
                <div class="player-faction ${player.faction || 'alliance'}">
                    <i class="fas fa-${player.faction === 'horde' ? 'skull' : 'shield-alt'}"></i>
                </div>
            </div>
        `).join('');
    }

    setActivePlayer(player) {
        this.currentPlayer = player;
        this.updatePlayersDisplay();
        this.updatePlayerStats();
        this.loadPlayerMatches();
        this.showNotification(`Switched to ${player.name}`, 'success');
    }

    updatePlayerStats() {
        if (!this.currentPlayer) return;const stats = {
            mmr: this.currentPlayer.mmr || 1200,
            rank: this.currentPlayer.rank || 'Unranked',
            winRate: this.calculateWinRate(),
            winStreak: this.currentPlayer.winStreak || 0,
            totalGames: this.currentPlayer.gamesPlayed || 0,
            arenaGold: this.currentPlayer.arenaGold || 0
        };

        // Update stat displays
        const statElements = {
            'mmr-display': stats.mmr,
            'highest-rank': stats.rank,
            'win-rate': `${stats.winRate}%`,
            'win-streak': stats.winStreak,
            'total-games': stats.totalGames,
            'arena-gold': stats.arenaGold.toLocaleString()
        };

        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    calculateWinRate() {
        if (!this.currentPlayer || !this.currentPlayer.gamesPlayed) return 0;const wins = this.currentPlayer.wins || 0;
        const games = this.currentPlayer.gamesPlayed;
        return Math.round((wins / games) * 100);}

    async loadDashboardData() {
        await Promise.all([
            this.loadRecentMatches(),
            this.loadRecentActivity(),
            this.loadLeaderboard(),
            this.loadLiveContent()
        ]);
    }
    
    // Cleanup method to prevent memory leaks
    cleanup() {
        logger.info('🧹 Cleaning up Warcraft Arena App...');
        
        // Clear intervals
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        // Destroy charts
        this.destroyCharts();
        
        logger.info('✅ Warcraft Arena App cleanup complete');
    }

    async loadRecentMatches() {
        const matchesContainer = document.getElementById('recent-matches');
        if (!matchesContainer) return;try {
            // Demo data for now - replace with actual API call
            const matches = [
                {
                    id: 1,
                    result: 'win',
                    opponent: 'EnemyPlayer',
                    map: 'Northshire',
                    duration: '12:34',
                    time: '2 hours ago'
                },
                {
                    id: 2,
                    result: 'loss',
                    opponent: 'StrongFoe',
                    map: 'Goldshire',
                    duration: '8:22',
                    time: '5 hours ago'
                },
                {
                    id: 3,
                    result: 'win',
                    opponent: 'WeakEnemy',
                    map: 'Elwynn Forest',
                    duration: '15:17',
                    time: '1 day ago'
                }
            ];

            matchesContainer.innerHTML = matches.map(match => `
                <div class="match-item ${match.result}">
                    <div class="match-header">
                        <span class="match-result ${match.result}">
                            ${match.result.toUpperCase()}
                        </span>
                        <span class="match-time">${match.time}</span>
                    </div>
                    <div class="match-details">
                        vs ${match.opponent} on ${match.map} (${match.duration})
                    </div>
                </div>
            `).join('');
        } catch (error) {
            logger.error('Error loading recent matches:', error);
            matchesContainer.innerHTML = '<p class="text-muted">Unable to load recent matches</p>';
        }
    }

    async loadRecentActivity() {
        const activityContainer = document.getElementById('activity-feed');
        if (!activityContainer) return;try {
            // Demo data for now
            const activities = [
                {
                    icon: 'trophy',
                    title: 'Rank Up!',
                    description: 'Promoted to Gold III',
                    time: '1 hour ago'
                },
                {
                    icon: 'medal',
                    title: 'Tournament Entry',
                    description: 'Joined Weekly Arena Cup',
                    time: '3 hours ago'
                },
                {
                    icon: 'star',
                    title: 'Achievement Completed',
                    description: 'Won 10 consecutive matches',
                    time: '1 day ago'
                }
            ];

            activityContainer.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-description">${activity.description}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            logger.error('Error loading recent activity:', error);
            activityContainer.innerHTML = '<p class="text-muted">Unable to load recent activity</p>';
        }
    }

    async loadLeaderboard() {
        const leaderboardContainer = document.getElementById('leaderboard-preview');
        if (!leaderboardContainer) return;try {
            logger.info('🏆 Loading arena leaderboard...');
            
            // Show loading state
            leaderboardContainer.innerHTML = '<div class="loading">Loading arena leaderboard...</div>';
            
            // Fetch real leaderboard data from the API
            const response = await fetch('/api/ladder/rankings?gameType=wc3&matchType=all&limit=10&page=1');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch leaderboard: ${response.status}`);
            }
            
            const data = await response.json();
            logger.info('🏆 Arena leaderboard data received:', data);
            
            if (!data || !data.players || data.players.length === 0) {
                leaderboardContainer.innerHTML = '<p class="text-muted">No players found in arena leaderboard</p>';
                return;}
            
            // Display the real leaderboard data
            leaderboardContainer.innerHTML = data.players.map((player, index) => `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank">${index + 1}</div>
                    <img src="${player.avatar || '/assets/img/default-avatar.svg'}" alt="${player.name}" class="leaderboard-avatar">
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${player.name}</div>
                        <div class="leaderboard-mmr">${player.mmr || 1500} MMR</div>
                    </div>
                </div>
            `).join('');
            
            logger.info('✅ Arena leaderboard loaded successfully');
            
        } catch (error) {
            logger.error('❌ Error loading arena leaderboard:', error);
            leaderboardContainer.innerHTML = '<p class="text-muted">Unable to load arena leaderboard. Please try again later.</p>';
        }
    }

    async loadLiveContent() {
        const liveContainer = document.getElementById('live-content');
        if (!liveContainer) return;try {
            // Demo data
            const liveItems = [
                {
                    type: 'stream',
                    title: 'Pro Tournament Finals',
                    streamer: 'WarcraftTV',
                    viewers: 1234,
                    thumbnail: '/assets/img/default-avatar.svg'
                },
                {
                    type: 'event',
                    title: 'Weekend Cup Registration',
                    description: 'Sign up now!',
                    status: 'Open'
                },
                {
                    type: 'news',
                    title: 'New Map Released',
                    description: 'Check out Shadowlands Arena',
                    time: '2 hours ago'
                }
            ];

            liveContainer.innerHTML = liveItems.map(item => `
                <div class="glass-card">
                    <h4 class="text-primary mb-2">${item.title}</h4>
                    <p class="text-sm text-muted">${item.description || item.streamer}</p>
                    ${item.viewers ? `<p class="text-xs text-muted">${item.viewers} viewers</p>` : ''}
                </div>
            `).join('');
        } catch (error) {
            logger.error('Error loading live content:', error);
        }
    }

    setupEventListeners() {
        // Player creation form
        const playerForm = document.getElementById('player-create-form');
        if (playerForm) {
            playerForm.addEventListener('submit', (e) => this.handlePlayerCreate(e));
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

                // Auto-refresh data every 5 minutes
        if (this.autoRefreshInterval) {
          clearInterval(this.autoRefreshInterval);
        }
        
    

        
        this.autoRefreshInterval = setInterval(() => {
          if (this.isInitialized) {
            this.loadDashboardData();
          }
        }, 5 * 60 * 1000);
    }

    async handlePlayerCreate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const playerData = {
            name: formData.get('playerName'),
            faction: formData.get('faction'),
            race: formData.get('race')
        };

        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(playerData)
            });

            if (response.ok) {
                const newPlayer = await response.json();
                this.players.push(newPlayer);
                this.updatePlayersDisplay();
                this.setActivePlayer(newPlayer);
                this.closePlayerCreate();
                this.showNotification(`Player ${newPlayer.name} created successfully!`, 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Failed to create player', 'error');
            }
        } catch (error) {
            logger.error('Error creating player:', error);
            this.showNotification('Failed to create player', 'error');
        }
    }

    // Modal Management
    openPlayerCreate() {
        const modal = document.getElementById('player-create-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    closePlayerCreate() {
        const modal = document.getElementById('player-create-modal');
        if (modal) {
            modal.classList.remove('active');
            // Reset form
            const form = document.getElementById('player-create-form');
            if (form) form.reset();
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.classList.remove('active'));
    }

    // Quick Actions
    findMatch() {
        if (!this.currentPlayer) {
            this.showNotification('Please select a player first', 'warning');
            return;}
        this.showNotification('Searching for match...', 'info');
        // Implement matchmaking logic
    }

    joinTournament() {
        window.location.href = '/tournaments.html';
    }

    viewMaps() {
        window.location.href = '/views/atlas.html';
    }

    // Notification System
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} show`;
        
        const icons = {
            success: 'check',
            error: 'times',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Utility Methods
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - new Date(timestamp).getTime();
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;return 'Just now';}

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';}
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';}
        return num.toString();}

    /**
     * Chart Management System
     */
    setupChartSystem() {
        // Store chart instances for cleanup
        this.charts = {};
        
        // Setup Warcraft-themed chart defaults
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = "'Inter', sans-serif";
            Chart.defaults.font.size = 12;
            Chart.defaults.color = '#D1D5DB';
            Chart.defaults.backgroundColor = 'rgba(212, 175, 55, 0.1)';
            Chart.defaults.borderColor = 'rgba(212, 175, 55, 0.3)';
            Chart.defaults.plugins.legend.labels.color = '#D1D5DB';
            Chart.defaults.plugins.legend.labels.font = {
                family: "'Cinzel', serif",
                size: 12
            };
            Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.1)';
            Chart.defaults.scale.ticks.color = '#D1D5DB';
        }
    }

    /**
     * Create Warcraft-themed chart colors
     */
    getWarcraftChartColors() {
        return {
            alliance: '#2563EB',
            horde: '#DC2626',
            neutral: '#6B7280',
            human: '#3B82F6',
            orc: '#EF4444',
            undead: '#8B5CF6',
            nightelf: '#10B981',
            gold: '#D4AF37',
            silver: '#C0C0C0',
            bronze: '#CD7F32',
            gradients: {
                alliance: ['#2563EB', '#1D4ED8'],
                horde: ['#DC2626', '#B91C1C'],
                neutral: ['#6B7280', '#4B5563']
            }
        };}

    /**
     * Create win/loss chart for dashboard
     */
    createWinLossChart(canvasId, stats) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const colors = this.getWarcraftChartColors();
        const ctx = canvas.getContext('2d');

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Wins', 'Losses'],
                datasets: [{
                    data: [stats.wins || 0, stats.losses || 0],
                    backgroundColor: [colors.alliance, colors.horde],
                    borderColor: ['rgba(37, 99, 235, 0.8)', 'rgba(220, 38, 38, 0.8)'],
                    borderWidth: 2,
                    hoverBackgroundColor: ['rgba(37, 99, 235, 0.9)', 'rgba(220, 38, 38, 0.9)']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                family: "'Cinzel', serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.9)',
                        titleColor: '#D4AF37',
                        bodyColor: '#D1D5DB',
                        borderColor: '#D4AF37',
                        borderWidth: 1,
                        titleFont: {
                            family: "'Cinzel', serif",
                            size: 14
                        },
                        bodyFont: {
                            family: "'Inter', sans-serif"
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;}
                        }
                    }
                }
            }
        });
    }

    /**
     * Create race distribution chart
     */
    createRaceChart(canvasId, raceStats) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const colors = this.getWarcraftChartColors();
        const ctx = canvas.getContext('2d');

        const raceData = {
            human: raceStats.human || 0,
            orc: raceStats.orc || 0,
            undead: raceStats.undead || 0,
            nightelf: raceStats.nightelf || 0,
            random: raceStats.random || 0
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Human', 'Orc', 'Undead', 'Night Elf', 'Random'],
                datasets: [{
                    data: Object.values(raceData),
                    backgroundColor: [
                        colors.human,
                        colors.orc,
                        colors.undead,
                        colors.nightelf,
                        colors.neutral
                    ],
                    borderWidth: 2,
                    borderColor: 'rgba(30, 30, 30, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                family: "'Cinzel', serif",
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.9)',
                        titleColor: '#D4AF37',
                        bodyColor: '#D1D5DB',
                        borderColor: '#D4AF37',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    /**
     * Create MMR progression chart
     */
    createMMRChart(canvasId, mmrHistory) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const colors = this.getWarcraftChartColors();
        const ctx = canvas.getContext('2d');

        // Prepare data from MMR history
        const labels = mmrHistory.map((entry, index) => `Game ${index + 1}`);
        const data = mmrHistory.map(entry => entry.mmr);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'MMR',
                    data: data,
                    borderColor: colors.gold,
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: colors.gold,
                    pointBorderColor: '#FFF',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.9)',
                        titleColor: '#D4AF37',
                        bodyColor: '#D1D5DB',
                        borderColor: '#D4AF37',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#D1D5DB',
                            font: {
                                family: "'Inter', sans-serif"
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#D1D5DB',
                            font: {
                                family: "'Inter', sans-serif"
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create match types distribution chart
     */
    createMatchTypesChart(canvasId, matchTypes) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const colors = this.getWarcraftChartColors();
        const ctx = canvas.getContext('2d');

        const labels = matchTypes.map(item => item.type || 'Unknown');
        const data = matchTypes.map(item => item.count || 0);
        const backgroundColors = [
            colors.alliance,
            colors.horde,
            colors.human,
            colors.orc,
            colors.undead,
            colors.nightelf
        ];

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Matches',
                    data: data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderColor: backgroundColors.slice(0, labels.length).map(color => color + 'CC'),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.9)',
                        titleColor: '#D4AF37',
                        bodyColor: '#D1D5DB',
                        borderColor: '#D4AF37',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#D1D5DB'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#D1D5DB'
                        }
                    }
                }
            }
        });
    }

    /**
     * Create dashboard overview charts
     */
    createDashboardCharts() {
        // Only create charts if we have Chart.js and the user is loaded
        if (typeof Chart === 'undefined' || !this.currentUser) return;logger.info('Creating dashboard charts...');

        // Create example charts for demonstration
        // In production, this data would come from your API
        const sampleStats = {
            wins: 45,
            losses: 23,
            races: {
                human: 30,
                orc: 25,
                undead: 10,
                nightelf: 3,
                random: 0
            },
            mmrHistory: [
                { mmr: 1200 }, { mmr: 1215 }, { mmr: 1198 }, { mmr: 1225 },
                { mmr: 1240 }, { mmr: 1235 }, { mmr: 1250 }, { mmr: 1245 }
            ],
            matchTypes: [
                { type: '1v1', count: 45 },
                { type: '2v2', count: 18 },
                { type: '3v3', count: 5 },
                { type: 'FFA', count: 0 }
            ]
        };

        // Create charts if containers exist
        this.createWinLossChart('dashboard-winloss-chart', sampleStats);
        this.createRaceChart('dashboard-race-chart', sampleStats.races);
        this.createMMRChart('dashboard-mmr-chart', sampleStats.mmrHistory);
        this.createMatchTypesChart('dashboard-matchtypes-chart', sampleStats.matchTypes);
    }

    /**
     * Destroy all charts (cleanup)
     */
    destroyCharts() {
        Object.keys(this.charts).forEach(chartId => {
            if (this.charts[chartId]) {
                this.charts[chartId].destroy();
                delete this.charts[chartId];
            }
        });
    }
}

// Global functions for onclick handlers


function openPlayerCreate() {
    if (window.app) {
        window.app.openPlayerCreate();
    }
}

function closePlayerCreate() {
    if (window.app) {
        window.app.closePlayerCreate();
    }
}

function findMatch() {
    if (window.app) {
        window.app.findMatch();
    }
}

function joinTournament() {
    if (window.app) {
        window.app.joinTournament();
    }
}

function viewMaps() {
    if (window.app) {
        window.app.viewMaps();
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Use the proper logout endpoint and let the navbar handler manage it
        if (window.navbar && window.navbar.handleLogout) {
            // Create a fake event object
            const fakeEvent = { target: document.querySelector('.logout-item') || document.body };
            window.navbar.handleLogout(fakeEvent);
        } else {
            // Fallback to direct logout
            window.location.href = '/auth/logout';
        }
    }
}

// Tab System for pages that use it
class TabSystem {
    constructor(container) {
        this.container = container;
        this.init();
    }

    init() {
        const tabButtons = this.container.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
    }

    switchTab(tabName) {
        // Remove active from all buttons and contents
        this.container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        this.container.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active to selected button and content
        const selectedButton = this.container.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = this.container.querySelector(`#${tabName}-tab`);

        if (selectedButton) selectedButton.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize main app
    window.app = new WarcraftArenaApp();

    // Initialize tab systems if present
    const tabContainers = document.querySelectorAll('.tabs-container');
    tabContainers.forEach(container => new TabSystem(container));

    // Initialize mobile menu toggle if present
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.app-sidebar');
    
    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    logger.info('🎮 Warcraft Arena Modern App loaded!');
    
    // Initialize the app
    try {
        await window.app.init();
        logger.info('✅ Warcraft Arena App initialized successfully');
    } catch (error) {
        logger.error('❌ Failed to initialize Warcraft Arena App:', error);
    }
}); 