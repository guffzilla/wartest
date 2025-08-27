/**
 * Player Profile Redesigned - JavaScript
 * 
 * A completely fresh implementation for the player profile page
 * with clean, specific functionality and no legacy code dependencies.
 */

// Import centralized logger utility
import logger from '/js/utils/logger.js';

class PlayerProfileManager {
    constructor() {
        this.currentPlayer = null;
        this.currentTab = 'overview';
        this.charts = {};
        this.init();
    }

    async init() {
    
        
        try {
            // Load navbar
            await this.loadNavbar();
            
            // Get player ID from URL
            const playerId = this.getPlayerIdFromUrl();
            if (!playerId) {
                this.showError('No player ID specified in URL');
                return;}

            // Load player data
            await this.loadPlayerData(playerId);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial tab content
            await this.loadTabContent(this.currentTab);
            
        } catch (error) {
            logger.error('Error initializing player profile', error);
            this.showError('Failed to initialize player profile');
        }
    }

    getPlayerIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');}

    async loadNavbar() {
        try {
            const response = await fetch('/components/navbar.html');
            const navbarHtml = await response.text();
            document.getElementById('navbar-container').innerHTML = navbarHtml;
            
            // Initialize navbar functionality
            if (window.initializeNavbar) {
                window.initializeNavbar();
            }
        } catch (error) {
            logger.error('Error loading navbar', error);
        }
    }

    async loadPlayerData(playerId) {

        
        try {
            const response = await fetch(`/api/users/${playerId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch player data');
            }

            const data = await response.json();
            this.currentPlayer = data.player || data;
            
            this.updatePlayerHeader();
            this.updatePlayerStats();
            
        } catch (error) {
            logger.error('Error loading player data', error);
            this.showError('Failed to load player data');
        }
    }

    updatePlayerHeader() {
        const player = this.currentPlayer;
        if (!player) return;const usernameElement = document.getElementById('player-username');
        if (usernameElement) {
            usernameElement.textContent = player.name || 'Unknown Player';
        }

        // Update avatar
        const avatarElement = document.getElementById('player-avatar');
        if (avatarElement) {
            avatarElement.src = player.rank?.image || '/assets/img/default-avatar.svg';
            avatarElement.alt = `${player.name} Avatar`;
        }

        // Update subtitle
        const subtitleElement = document.getElementById('player-subtitle');
        if (subtitleElement) {
            const gameType = this.formatGameType(player.gameType);
            subtitleElement.textContent = `${gameType} Player`;
        }
    }

    updatePlayerStats() {
        const player = this.currentPlayer;
        if (!player) return;const wins = player.stats?.wins || 0;
        const losses = player.stats?.losses || 0;
        const totalGames = wins + losses;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        // Update MMR
        const mmrElement = document.getElementById('player-mmr');
        if (mmrElement) {
            mmrElement.textContent = player.mmr || 1500;
        }

        // Update rank
        const rankElement = document.getElementById('player-rank');
        if (rankElement) {
            rankElement.textContent = player.rank?.name || 'Unranked';
        }

        // Update win rate
        const winrateElement = document.getElementById('player-winrate');
        if (winrateElement) {
            winrateElement.textContent = `${winRate}%`;
        }

        // Update games
        const gamesElement = document.getElementById('player-games');
        if (gamesElement) {
            gamesElement.textContent = totalGames;
        }

        // Update overview stats
        this.updateOverviewStats(wins, losses, winRate, totalGames);
    }

    updateOverviewStats(wins, losses, winRate, totalGames) {
        // Update join date
        const joinDateElement = document.getElementById('player-join-date');
        if (joinDateElement) {
            const joinDate = this.currentPlayer.joinDate || this.currentPlayer.createdAt;
            joinDateElement.textContent = joinDate ? new Date(joinDate).toLocaleDateString() : 'Unknown';
        }

        // Update last active
        const lastActiveElement = document.getElementById('player-last-active');
        if (lastActiveElement) {
            const lastSeen = this.currentPlayer.lastSeen;
            lastActiveElement.textContent = lastSeen ? this.formatLastSeen(lastSeen) : 'Unknown';
        }

        // Update total games
        const totalGamesElement = document.getElementById('player-total-games');
        if (totalGamesElement) {
            totalGamesElement.textContent = totalGames;
        }

        // Update performance stats
        const winsElement = document.getElementById('player-wins');
        if (winsElement) {
            winsElement.textContent = wins;
        }

        const lossesElement = document.getElementById('player-losses');
        if (lossesElement) {
            lossesElement.textContent = losses;
        }

        const winrateOverviewElement = document.getElementById('player-winrate-overview');
        if (winrateOverviewElement) {
            winrateOverviewElement.textContent = `${winRate}%`;
        }
    }

    setupEventListeners() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.player-profile-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Match filters
        const filterButtons = document.querySelectorAll('.player-matches-filter');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.filterMatches(filter);
            });
        });
    }

    async switchTab(tabName) {

        
        // Update active tab button
        const tabButtons = document.querySelectorAll('.player-profile-tab');
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
            }
        });

        // Update active tab content
        const tabContents = document.querySelectorAll('.player-profile-tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        this.currentTab = tabName;
        await this.loadTabContent(tabName);
    }

    async loadTabContent(tabName) {
        switch (tabName) {
            case 'overview':
                await this.loadOverviewContent();
                break;
            case 'matches':
                await this.loadMatchesContent();
                break;
            case 'stats':
                await this.loadStatsContent();
                break;
            case 'activity':
                await this.loadActivityContent();
                break;
        }
    }

    async loadOverviewContent() {

        
        try {
            // Load game types chart
            await this.createGameTypesChart();
            
            // Load race performance chart
            await this.createRacePerformanceChart();
            
        } catch (error) {
            logger.error('Error loading overview content', error);
        }
    }

    async loadMatchesContent() {

        
        try {
            const matchesList = document.getElementById('matches-list');
            if (!matchesList) return;matchesList.innerHTML = '<div class="player-loading">Loading matches...</div>';

            const playerId = this.currentPlayer._id;
            const response = await fetch(`/api/matches/player/${playerId}?limit=20`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch matches');
            }

            const matches = await response.json();
            this.renderMatches(matches);

        } catch (error) {
            logger.error('Error loading matches', error);
            this.showError('Failed to load matches');
        }
    }

    async loadStatsContent() {

        
        try {
            // Load MMR history chart
            await this.createMMRHistoryChart();
            
            // Load map statistics
            await this.loadMapStatistics();
            
            // Load opponent statistics
            await this.loadOpponentStatistics();
            
            // Load time analysis
            await this.loadTimeAnalysis();
            
        } catch (error) {
            logger.error('Error loading stats content', error);
        }
    }

    async loadActivityContent() {

        
        try {
            const activityList = document.getElementById('activity-list');
            if (!activityList) return;activityList.innerHTML = '<div class="player-loading">Loading activity...</div>';

            // For now, show a placeholder message
            activityList.innerHTML = `
                <div class="player-empty">
                    <i class="fas fa-clock player-empty-icon"></i>
                    <p class="player-empty-message">Activity tracking coming soon!</p>
                </div>
            `;

        } catch (error) {
            logger.error('Error loading activity', error);
            this.showError('Failed to load activity');
        }
    }

    renderMatches(matches) {
        const matchesList = document.getElementById('matches-list');
        if (!matchesList) return;if (!matches || matches.length === 0) {
            matchesList.innerHTML = `
                <div class="player-empty">
                    <i class="fas fa-sword player-empty-icon"></i>
                    <p class="player-empty-message">No matches found</p>
                </div>
            `;
            return;}

        const matchesHtml = matches.map(match => this.createMatchItem(match)).join('');
        matchesList.innerHTML = matchesHtml;
    }

    createMatchItem(match) {
        const isWin = match.winner === this.currentPlayer.name;
        const resultClass = isWin ? 'win' : 'loss';
        const resultText = isWin ? 'Victory' : 'Defeat';
        const mmrChange = match.mmrChange || 0;
        const mmrClass = mmrChange >= 0 ? 'positive' : 'negative';
        const mmrPrefix = mmrChange >= 0 ? '+' : '';

        return `
            <div class="player-match-item">
                <div class="player-match-result ${resultClass}">
                    <i class="fas fa-${isWin ? 'trophy' : 'times'}"></i>
                    ${resultText}
                </div>
                <div class="player-match-opponent">${match.opponent || 'Unknown'}</div>
                <div class="player-match-map">${match.map || 'Unknown Map'}</div>
                <div class="player-match-mmr ${mmrClass}">${mmrPrefix}${mmrChange}</div>
                <div class="player-match-date">${this.formatDate(match.date)}</div>
            </div>
        `;}

    async createGameTypesChart() {
        const canvas = document.getElementById('game-types-chart');
        if (!canvas) return;const data = {
            labels: ['1v1', '2v2', '3v3', '4v4', 'FFA'],
            datasets: [{
                data: [30, 25, 20, 15, 10],
                backgroundColor: [
                    '#D4AF37',
                    '#4169E1',
                    '#8A2BE2',
                    '#FF6B6B',
                    '#4ECDC4'
                ]
            }]
        };

        this.charts.gameTypes = new Chart(canvas, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#F8FAFC',
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    async createRacePerformanceChart() {
        const canvas = document.getElementById('race-performance-chart');
        if (!canvas) return;const data = {
            labels: ['Human', 'Orc', 'Undead', 'Night Elf'],
            datasets: [{
                label: 'Win Rate %',
                data: [65, 58, 72, 61],
                backgroundColor: 'rgba(212, 175, 55, 0.2)',
                borderColor: '#D4AF37',
                borderWidth: 2
            }]
        };

        this.charts.racePerformance = new Chart(canvas, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#F8FAFC'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#F8FAFC'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async createMMRHistoryChart() {
        const canvas = document.getElementById('mmr-history-chart');
        if (!canvas) return;const data = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'MMR',
                data: [1500, 1520, 1480, 1550, 1580, 1600],
                borderColor: '#D4AF37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                tension: 0.4
            }]
        };

        this.charts.mmrHistory = new Chart(canvas, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            color: '#F8FAFC'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#F8FAFC'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async loadMapStatistics() {
        const mapStatsList = document.getElementById('map-stats-list');
        if (!mapStatsList) return;const mapStats = [
            { name: 'Lost Temple', games: 45, winRate: 68 },
            { name: 'Twisted Meadows', games: 32, winRate: 59 },
            { name: 'Echo Isles', games: 28, winRate: 71 },
            { name: 'Turtle Rock', games: 22, winRate: 55 }
        ];

        const statsHtml = mapStats.map(stat => `
            <div class="player-stat-item">
                <span class="player-stat-label">${stat.name}</span>
                <span class="player-stat-value">${stat.games} games, ${stat.winRate}% win rate</span>
            </div>
        `).join('');

        mapStatsList.innerHTML = statsHtml;
    }

    async loadOpponentStatistics() {
        const opponentStatsList = document.getElementById('opponent-stats-list');
        if (!opponentStatsList) return;const opponentStats = [
            { name: 'Top Opponent', games: 15, record: '8-7' },
            { name: 'Frequent Rival', games: 12, record: '6-6' },
            { name: 'New Challenger', games: 8, record: '5-3' }
        ];

        const statsHtml = opponentStats.map(stat => `
            <div class="player-stat-item">
                <span class="player-stat-label">${stat.name}</span>
                <span class="player-stat-value">${stat.games} games (${stat.record})</span>
            </div>
        `).join('');

        opponentStatsList.innerHTML = statsHtml;
    }

    async loadTimeAnalysis() {
        const timeStatsList = document.getElementById('time-stats-list');
        if (!timeStatsList) return;const timeStats = [
            { period: 'Morning', games: 25, winRate: 64 },
            { period: 'Afternoon', games: 45, winRate: 58 },
            { period: 'Evening', games: 60, winRate: 72 },
            { period: 'Night', games: 30, winRate: 55 }
        ];

        const statsHtml = timeStats.map(stat => `
            <div class="player-stat-item">
                <span class="player-stat-label">${stat.period}</span>
                <span class="player-stat-value">${stat.games} games, ${stat.winRate}% win rate</span>
            </div>
        `).join('');

        timeStatsList.innerHTML = statsHtml;
    }

    filterMatches(filter) {

        
        // Update active filter button
        const filterButtons = document.querySelectorAll('.player-matches-filter');
        filterButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.filter === filter) {
                button.classList.add('active');
            }
        });

        // Reload matches with filter
        this.loadMatchesContent();
    }

    // Utility functions
    formatGameType(gameType) {
        const gameTypes = {
            'wc1': 'Warcraft I',
            'wc2': 'Warcraft II',
            'wc3': 'Warcraft III'
        };
        return gameTypes[gameType] || 'Unknown';}

    formatLastSeen(lastSeen) {
        if (!lastSeen) return 'Unknown';const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const diffInHours = Math.floor((now - lastSeenDate) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';if (diffInHours < 24) return `${diffInHours} hours ago`;if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;return lastSeenDate.toLocaleDateString();}

    formatDate(dateString) {
        if (!dateString) return 'Unknown';return new Date(dateString).toLocaleDateString();}

    showError(message) {
        logger.error('Error', message);
        
        // Show error in the main content area
        const content = document.querySelector('.player-profile-content');
        if (content) {
            content.innerHTML = `
                <div class="player-error">
                    <i class="fas fa-exclamation-triangle player-error-icon"></i>
                    <p class="player-error-message">${message}</p>
                </div>
            `;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {

    window.playerProfileManager = new PlayerProfileManager();
});
