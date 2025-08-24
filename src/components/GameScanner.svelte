<script lang="ts">
  import { games, runningGames } from '../stores/gameStore';
  
  $: wc2Games = $games.filter(game => game.key.startsWith('wc2'));
</script>

<div class="game-scanner">
  <div class="game-grid">
    <!-- Battle.net Battle Chest -->
    <div class="game-card battle-chest-card">
      <div class="game-header">
        <div class="game-icon">⚔️</div>
        <div class="game-title">Battle.net Battle Chest</div>
      </div>
      <div class="game-versions">
        <div class="version-item">
          <div class="version-info">
            <div class="version-name">Warcraft II: Remastered</div>
            <div class="version-path">
              {#if wc2Games.find(g => g.key === 'wc2-remastered')}
                {wc2Games.find(g => g.key === 'wc2-remastered')?.path || 'Scanning...'}
              {:else}
                Scanning...
              {/if}
            </div>
          </div>
          <div class="version-status">
            <div class="status-indicator {wc2Games.find(g => g.key === 'wc2-remastered')?.found ? 'status-found' : 'status-not-found'}"></div>
          </div>
          <div class="version-actions">
            <button class="btn btn-secondary btn-small" disabled>Maps</button>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <button class="btn btn-primary btn-small">Locate</button>
        <button class="btn btn-secondary btn-small">Add Manually</button>
      </div>
    </div>

    <!-- Classics & Community Editions -->
    <div class="game-card">
      <div class="game-header">
        <div class="game-icon">🎮</div>
        <div class="game-title">Classics & Community Editions</div>
      </div>
      <div class="game-versions">
        <div class="version-item">
          <div class="version-info">
            <div class="version-name">Warcraft II: Combat Edition</div>
            <div class="version-path">
              {#if wc2Games.find(g => g.key === 'wc2-combat')}
                {wc2Games.find(g => g.key === 'wc2-combat')?.path || 'Scanning...'}
              {:else}
                Scanning...
              {/if}
            </div>
          </div>
          <div class="version-status">
            <div class="status-indicator {wc2Games.find(g => g.key === 'wc2-combat')?.found ? 'status-found' : 'status-not-found'}"></div>
          </div>
          <div class="version-actions">
            <button class="btn btn-secondary btn-small" disabled>Maps</button>
          </div>
        </div>
        <div class="version-item">
          <div class="version-info">
            <div class="version-name">Warcraft II: Battle.net Edition</div>
            <div class="version-path">
              {#if wc2Games.find(g => g.key === 'wc2-bnet')}
                {wc2Games.find(g => g.key === 'wc2-bnet')?.path || 'Scanning...'}
              {:else}
                Scanning...
              {/if}
            </div>
          </div>
          <div class="version-status">
            <div class="status-indicator {wc2Games.find(g => g.key === 'wc2-bnet')?.found ? 'status-found' : 'status-not-found'}"></div>
          </div>
          <div class="version-actions">
            <button class="btn btn-secondary btn-small" disabled>Maps</button>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <button class="btn btn-primary btn-small">Locate</button>
        <button class="btn btn-secondary btn-small">Add Manually</button>
      </div>
    </div>
  </div>

  <!-- Running Games Section -->
  {#if $runningGames.length > 0}
    <div class="status-section">
      <h2>Currently Running Games</h2>
      <div class="running-games">
        {#each $runningGames as game}
          <div class="running-game">
            <h3>{game.name}</h3>
            <div class="process-id">PID: {game.process_id}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .game-scanner {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    padding: 25px;
    border: 1px solid rgba(255, 255, 255, 0.1);
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
  }

  .game-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .battle-chest-card {
    border-color: rgba(255, 215, 0, 0.3);
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 165, 0, 0.02) 100%);
  }

  .game-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
  }

  .game-icon {
    font-size: 2rem;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
  }

  .game-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: #ffd700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }

  .game-versions {
    margin-bottom: 20px;
  }

  .version-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .version-info {
    flex: 1;
  }

  .version-name {
    font-weight: 600;
    color: #e8eaed;
    margin-bottom: 4px;
  }

  .version-path {
    font-size: 0.85rem;
    color: #9aa0a6;
    font-family: 'Consolas', monospace;
    word-break: break-all;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .version-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-found {
    background: #34a853;
    box-shadow: 0 0 10px rgba(52, 168, 83, 0.5);
  }

  .status-not-found {
    background: #ea4335;
  }

  .version-actions {
    display: flex;
    gap: 5px;
    margin-top: 8px;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    margin-top: 15px;
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
  }

  .btn-primary {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a2332;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
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
    padding: 4px 8px;
    font-size: 0.8rem;
  }

  .status-section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-top: 20px;
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

  @media (max-width: 768px) {
    .game-grid {
      grid-template-columns: 1fr;
    }
    
    .version-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    
    .version-path {
      max-width: none;
      white-space: normal;
    }
  }
</style>

