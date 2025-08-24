<script lang="ts">
  import { games, runningGames, getGamesByType, getRunningGamesByType } from '../stores/gameStore';
  
  export let gameType: 'wc1' | 'wc2' | 'wc3';
  
  $: gamesOfType = getGamesByType(gameType)($games);
  $: runningGamesOfType = getRunningGamesByType(gameType)($runningGames);
  
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
</script>

<div class="game-scanner">
  <div class="game-header">
    <div class="game-icon">{getGameTypeIcon()}</div>
    <div class="game-title">{getGameTypeTitle()} Management</div>
  </div>

  <div class="game-grid">
    {#each gamesOfType as game}
      <div class="game-card">
        <div class="game-info">
          <div class="game-name">{game.name}</div>
          <div class="game-version">{game.version}</div>
          <div class="game-path">
            {game.path || 'Not found'}
          </div>
        </div>
        <div class="game-status">
          <div class="status-indicator {game.found ? 'status-found' : 'status-not-found'}"></div>
          <div class="status-text">
            {game.found ? 'Found' : 'Not Found'}
          </div>
        </div>
        <div class="game-actions">
          <button class="btn btn-primary btn-small" disabled={!game.found}>
            Launch
          </button>
          <button class="btn btn-secondary btn-small" disabled={!game.found}>
            Assets
          </button>
        </div>
      </div>
    {/each}
  </div>

  <!-- Running Games Section -->
  {#if runningGamesOfType.length > 0}
    <div class="status-section">
      <h2>Currently Running {getGameTypeTitle()} Games</h2>
      <div class="running-games">
        {#each runningGamesOfType as game}
          <div class="running-game">
            <h3>{game.name}</h3>
            <div class="process-id">PID: {game.process_id}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Game Type Specific Features -->
  <div class="game-features">
    <h2>{getGameTypeTitle()} Features</h2>
    <div class="features-grid">
      {#if gameType === 'wc1'}
        <div class="feature-item">
          <h3>Campaign Management</h3>
          <p>Manage original and custom campaigns</p>
        </div>
        <div class="feature-item">
          <h3>Asset Extraction</h3>
          <p>Extract sprites, sounds, and maps</p>
        </div>
      {:else if gameType === 'wc2'}
        <div class="feature-item">
          <h3>Multiplayer Support</h3>
          <p>LAN and online multiplayer management</p>
        </div>
        <div class="feature-item">
          <h3>Replay Analysis</h3>
          <p>Advanced replay viewing and analysis</p>
        </div>
        <div class="feature-item">
          <h3>Map Editor</h3>
          <p>Create and edit custom maps</p>
        </div>
      {:else if gameType === 'wc3'}
        <div class="feature-item">
          <h3>Custom Maps</h3>
          <p>Manage custom maps and mods</p>
        </div>
        <div class="feature-item">
          <h3>Battle.net Integration</h3>
          <p>Online multiplayer and ladder support</p>
        </div>
        <div class="feature-item">
          <h3>World Editor</h3>
          <p>Advanced map and campaign creation</p>
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

  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .game-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .game-card:hover {
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

  .status-found {
    background: #34a853;
    box-shadow: 0 0 10px rgba(52, 168, 83, 0.5);
  }

  .status-not-found {
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

  .btn-small {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .status-section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 25px;
  }

  .status-section h2 {
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

  .running-game h3 {
    color: #34a853;
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .process-id {
    color: #9aa0a6;
    font-size: 0.9rem;
    font-family: 'Consolas', monospace;
  }

  .game-features {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
  }

  .game-features h2 {
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

  .feature-item h3 {
    color: #ffd700;
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .feature-item p {
    color: #9aa0a6;
    font-size: 0.9rem;
    margin: 0;
  }

  @media (max-width: 768px) {
    .game-grid {
      grid-template-columns: 1fr;
    }
    
    .game-card {
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

