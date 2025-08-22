let games = [];

// DOM elements
const scanGamesBtn = document.getElementById('scanGames');
const refreshGamesBtn = document.getElementById('refreshGames');
const gamesList = document.getElementById('gamesList');
const runningGames = document.getElementById('runningGames');
const notification = document.getElementById('notification');

// Event listeners
scanGamesBtn.addEventListener('click', scanForGames);
refreshGamesBtn.addEventListener('click', refreshGameStatus);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, Tauri available:', !!window.__TAURI__);
    scanForGames();
});

async function scanForGames() {
    try {
        showNotification('Scanning for games...', 'info');
        games = await window.__TAURI__.core.invoke('scan_games');
        displayGames();
        showNotification(`Found ${games.length} games`, 'success');
    } catch (error) {
        console.error('Error scanning for games:', error);
        showNotification('Error scanning for games', 'error');
    }
}

async function refreshGameStatus() {
    try {
        const runningGamesList = await window.__TAURI__.core.invoke('get_running_games');
        displayRunningGames(runningGamesList);
        showNotification('Game status refreshed', 'success');
    } catch (error) {
        console.error('Error refreshing game status:', error);
        showNotification('Error refreshing game status', 'error');
    }
}

function displayGames() {
    if (games.length === 0) {
        gamesList.innerHTML = `
            <div class="empty-state">
                <h3>No Games Found</h3>
                <p>No Warcraft games were detected on your system.</p>
            </div>
        `;
        return;
    }

    gamesList.innerHTML = games.map(game => `
        <div class="game-card" onclick="launchGame('${game.name}')">
            <h3>${game.name}</h3>
            <p class="path">${game.path}</p>
            <p>Status: <span class="status ${game.is_running ? 'running' : 'stopped'}">
                ${game.is_running ? 'Running' : 'Stopped'}
            </span></p>
            ${game.process_id ? `<p>Process ID: ${game.process_id}</p>` : ''}
            ${game.version ? `<p>Version: ${game.version}</p>` : ''}
        </div>
    `).join('');
}

function displayRunningGames(runningGamesList) {
    if (runningGamesList.length === 0) {
        runningGames.innerHTML = `
            <div class="empty-state">
                <h3>No Running Games</h3>
                <p>No games are currently running.</p>
            </div>
        `;
        return;
    }

    runningGames.innerHTML = runningGamesList.map(game => `
        <div class="running-game">
            <h3>${game.name}</h3>
            <div class="process-id">PID: ${game.process_id}</div>
        </div>
    `).join('');
}

async function launchGame(gameName) {
    try {
        showNotification(`Launching ${gameName}...`, 'info');
        await window.__TAURI__.core.invoke('launch_game', { gameName });
        showNotification(`${gameName} launched successfully!`, 'success');
        
        // Refresh the game status after a short delay
        setTimeout(() => {
            refreshGameStatus();
            scanForGames(); // Refresh the main games list
        }, 2000);
    } catch (error) {
        console.error('Error launching game:', error);
        showNotification(`Error launching ${gameName}: ${error}`, 'error');
    }
}

function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type} visible`;
    
    setTimeout(() => {
        notification.classList.remove('visible');
        notification.classList.add('hidden');
    }, 3000);
}

// Make launchGame available globally for onclick handlers
window.launchGame = launchGame;
