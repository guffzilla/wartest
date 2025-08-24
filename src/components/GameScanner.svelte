<script lang="ts">
  import { 
    wc1Games, wc2Games, wc3Games, 
    wc1RunningGames, wc2RunningGames, wc3RunningGames,
    wc1DefaultGame, wc2DefaultGame, wc3DefaultGame,
    scanResult, isLoading, scanGames, launchGame
  } from '../stores/gameStore';
  
  export let gameType: 'wc1' | 'wc2' | 'wc3';
  
  $: gamesOfType = gameType === 'wc1' ? $wc1Games : 
                   gameType === 'wc2' ? $wc2Games : 
                   $wc3Games;
  
  $: runningGamesOfType = gameType === 'wc1' ? $wc1RunningGames : 
                          gameType === 'wc2' ? $wc2RunningGames : 
                          $wc3RunningGames;
  
  $: defaultGame = gameType === 'wc1' ? $wc1DefaultGame : 
                   gameType === 'wc2' ? $wc2DefaultGame : 
                   $wc3DefaultGame;
  
  function getGameTypeTitle() {
    switch (gameType) {
      case 'wc1': return 'Warcraft I';
      case 'wc2': return 'Warcraft II';
      case 'wc3': return 'Warcraft III';
      default: return 'Warcraft';
    }
  }
  
  function getGameTypeIcon() {
    switch (gameType) {
      case 'wc1': return '⚔️';
      case 'wc2': return '🛡️';
      case 'wc3': return '⚡';
      default: return '🎮';
    }
  }
  
  function getInstallationTypeIcon(type: string) {
    switch (type) {
      case 'Remastered': return '✨';
      case 'BattleNet': return '🌐';
      case 'Combat': return '⚔️';
      case 'DOS': return '💾';
      case 'Reforged': return '🔥';
      case 'FrozenThrone': return '❄️';
      case 'ReignOfChaos': return '👑';
      case 'Original': return '📀';
      default: return '🎯';
    }
  }
  
  function getDriveColor(drive: string) {
    const colors = {
      'C:': '#4CAF50',
      'D:': '#2196F3',
      'E:': '#FF9800',
      'F:': '#9C27B0',
      'G:': '#F44336',
      'H:': '#00BCD4'
    };
    return colors[drive as keyof typeof colors] || '#607D8B';
  }
  
  async function handleLaunchGame(game: any) {
    try {
      await launchGame(game);
    } catch (error) {
      console.error('Failed to launch game:', error);
    }
  }
  
  async function handleScanGames() {
    try {
      await scanGames();
    } catch (error) {
      console.error('Failed to scan games:', error);
    }
  }
</script>

<div class="game-scanner">
  <div class="game-header">
    <div class="game-icon">{getGameTypeIcon()}</div>
    <div class="game-title">{getGameTypeTitle()} Management</div>
    <div class="scan-controls">
      <button class="btn btn-primary" on:click={handleScanGames} disabled={$isLoading}>
        {#if $isLoading}Scanning...{:else}Scan for Games{/if}
      </button>
    </div>
  </div>

  <!-- Scan Results Summary -->
  {#if $scanResult}
    <div class="scan-summary">
      <div class="summary-item">
        <span class="label">Games Found:</span>
        <span class="value">{$scanResult.total_found}</span>
      </div>
      <div class="summary-item">
        <span class="label">Drives Scanned:</span>
        <span class="value">{$scanResult.drives_scanned.join(', ')}</span>
      </div>
    </div>
  {/if}

  <!-- Default Game Section -->
  {#if defaultGame}
    <div class="default-game-section">
      <h3>🎯 Default {getGameTypeTitle()} Installation</h3>
      <div class="default-game-card">
        <div class="game-info">
          <div class="game-name">{defaultGame.name}</div>
          <div class="game-version">
            {getInstallationTypeIcon(defaultGame.installation_type)} {defaultGame.installation_type}
          </div>
          <div class="game-path">{defaultGame.path}</div>
          <div class="game-drive" style="color: {getDriveColor(defaultGame.drive)}">
            📁 {defaultGame.drive}
          </div>
          {#if defaultGame.maps_folder}
            <div class="maps-folder">🗺️ Maps: {defaultGame.maps_folder}</div>
          {/if}
        </div>
        <div class="game-status">
          <div class="status-indicator {defaultGame.is_running ? 'status-running' : 'status-stopped'}"></div>
          <div class="status-text">
            {defaultGame.is_running ? 'Running' : 'Stopped'}
          </div>
        </div>
        <div class="game-actions">
          <button class="btn btn-primary" on:click={() => handleLaunchGame(defaultGame)}>
            Launch
          </button>
          {#if defaultGame.maps_folder}
            <button class="btn btn-secondary">
              Open Maps
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- All Installations Section -->
  {#if gamesOfType.length > 0}
    <div class="installations-section">
      <h3>📦 All {getGameTypeTitle()} Installations ({gamesOfType.length})</h3>
      <div class="installations-grid">
        {#each gamesOfType as game}
          <div class="installation-card">
            <div class="installation-header">
              <div class="installation-type">
                {getInstallationTypeIcon(game.installation_type)} {game.installation_type}
              </div>
              <div class="drive-badge" style="background-color: {getDriveColor(game.drive)}">
                {game.drive}
              </div>
            </div>
            <div class="installation-info">
              <div class="game-name">{game.name}</div>
              <div class="game-version">{game.version}</div>
              <div class="game-path">{game.path}</div>
              {#if game.maps_folder}
                <div class="maps-folder">🗺️ Maps: {game.maps_folder}</div>
              {/if}
            </div>
            <div class="installation-status">
              <div class="status-indicator {game.is_running ? 'status-running' : 'status-stopped'}"></div>
              <div class="status-text">
                {game.is_running ? 'Running' : 'Stopped'}
              </div>
            </div>
            <div class="installation-actions">
              <button class="btn btn-primary btn-small" on:click={() => handleLaunchGame(game)}>
                Launch
              </button>
              {#if game.maps_folder}
                <button class="btn btn-secondary btn-small">
                  Maps
                </button>
              {/if}
              <button class="btn btn-outline btn-small">
                Set Default
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="no-games-found">
      <p>No {getGameTypeTitle()} installations found.</p>
      <p>Click "Scan for Games" to search your system.</p>
    </div>
  {/if}

  <!-- Running Games Section -->
  {#if runningGamesOfType.length > 0}
    <div class="status-section">
      <h3>🔄 Currently Running {getGameTypeTitle()} Games</h3>
      <div class="running-games">
        {#each runningGamesOfType as game}
          <div class="running-game">
            <h4>{game.name}</h4>
            <div class="process-info">
              <span class="process-id">PID: {game.process_id}</span>
              <span class="executable-path">{game.executable_path}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Game Type Specific Features -->
  <div class="game-features">
    <h3>{getGameTypeTitle()} Features</h3>
    <div class="features-grid">
      {#if gameType === 'wc1'}
        <div class="feature-item">
          <h4>Campaign Management</h4>
          <p>Manage original and custom campaigns</p>
        </div>
        <div class="feature-item">
          <h4>Campaign Management</h4>
          <p>Manage original and custom campaigns</p>
        </div>
      {:else if gameType === 'wc2'}
        <div class="feature-item">
          <h4>Multiplayer Support</h4>
          <p>LAN and online multiplayer management</p>
        </div>
        <div class="feature-item">
          <h4>Replay Analysis</h4>
          <p>Advanced replay viewing and analysis</p>
        </div>
        <div class="feature-item">
          <h4>Map Editor</h4>
          <p>Access to Warcraft II Map Editor</p>
        </div>
      {:else if gameType === 'wc3'}
        <div class="feature-item">
          <h4>Modern Multiplayer</h4>
          <p>Battle.net and custom game support</p>
        </div>
        <div class="feature-item">
          <h4>World Editor</h4>
          <p>Advanced map and mod creation tools</p>
        </div>
        <div class="feature-item">
          <h4>Custom Games</h4>
          <p>Manage custom game types and mods</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .game-scanner {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    padding: 25px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .game-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .game-icon {
    font-size: 2.5rem;
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
  }

  .game-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: #ffd700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }

  .scan-controls {
    margin-left: auto;
  }

  .scan-summary {
    display: flex;
    justify-content: space-around;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 15px;
    margin-bottom: 25px;
    gap: 20px;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .label {
    font-size: 0.9rem;
    color: #9aa0a6;
    font-weight: 500;
  }

  .value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffd700;
  }

  .default-game-section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 25px;
  }

  .default-game-section h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
    color: #ffffff;
    text-align: center;
  }

  .default-game-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .default-game-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .game-info {
    flex: 1;
  }

  .game-name {
    font-weight: 600;
    color: #e8eaed;
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .game-version {
    font-size: 0.9rem;
    color: #ffd700;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .game-path {
    font-size: 0.85rem;
    color: #9aa0a6;
    font-family: 'Consolas', monospace;
    word-break: break-all;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .game-drive {
    font-size: 0.85rem;
    color: #9aa0a6;
    font-family: 'Consolas', monospace;
    word-break: break-all;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .maps-folder {
    font-size: 0.85rem;
    color: #9aa0a6;
    font-family: 'Consolas', monospace;
    word-break: break-all;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .game-status {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .status-running {
    background: #34a853;
    box-shadow: 0 0 10px rgba(52, 168, 83, 0.5);
  }

  .status-stopped {
    background: #ea4335;
  }

  .status-text {
    font-size: 0.9rem;
    color: #9aa0a6;
    font-weight: 500;
  }

  .game-actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex: 1;
  }

  .btn-primary {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a2332;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #e8eaed;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-outline {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e8eaed;
  }

  .btn-outline:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .btn-outline:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-small {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .installations-section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 25px;
  }

  .installations-section h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
    color: #ffffff;
    text-align: center;
  }

  .installations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }

  .installation-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .installation-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .installation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .installation-type {
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffd700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }

  .drive-badge {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 500;
    color: #ffffff;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }

  .installation-info {
    flex: 1;
  }

  .game-name {
    font-weight: 600;
    color: #e8eaed;
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .game-version {
    font-size: 0.9rem;
    color: #ffd700;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .game-path {
    font-size: 0.85rem;
    color: #9aa0a6;
    font-family: 'Consolas', monospace;
    word-break: break-all;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .installation-status {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .status-section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 25px;
  }

  .status-section h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
    color: #ffffff;
    text-align: center;
  }

  .running-games {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
  }

  .running-game {
    background: rgba(52, 168, 83, 0.1);
    border: 1px solid rgba(52, 168, 83, 0.3);
    border-radius: 8px;
    padding: 15px;
    text-align: center;
  }

  .running-game h4 {
    color: #34a853;
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .process-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #9aa0a6;
    font-family: 'Consolas', monospace;
  }

  .process-id {
    color: #34a853;
    font-weight: 500;
  }

  .executable-path {
    color: #9aa0a6;
  }

  .game-features {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
  }

  .game-features h3 {
    font-size: 1.5rem;
    margin-bottom: 20px;
    color: #ffffff;
    text-align: center;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .feature-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 15px;
    text-align: center;
    transition: all 0.3s ease;
  }

  .feature-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 215, 0, 0.3);
    transform: translateY(-1px);
  }

  .feature-item h4 {
    color: #ffd700;
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .feature-item p {
    color: #9aa0a6;
    font-size: 0.9rem;
    margin: 0;
  }

  .no-games-found {
    text-align: center;
    padding: 20px;
    color: #9aa0a6;
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    .game-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .scan-controls {
      width: 100%;
    }

    .scan-summary {
      flex-direction: column;
      gap: 10px;
    }

    .installations-grid {
      grid-template-columns: 1fr;
    }
    
    .installation-card {
      flex-direction: column;
    }
    
    .game-path {
      white-space: normal;
    }
    
    .features-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

