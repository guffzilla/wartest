<script lang="ts">
  import { 
    wc1Games, wc2Games, wc3Games, 
    wc1DefaultGame, wc2DefaultGame, wc3DefaultGame,
    scanResult, isLoading, scanGames, launchGame, refreshGames,
    userPreferences, updateUserPreference
  } from '../stores/gameStore';
  
  let isScanning = false;
  let showPaths = false;
  
  async function handleScanGames() {
    isScanning = true;
    try {
      await scanGames();
    } finally {
      isScanning = false;
    }
  }
  
  async function handleRefreshGames() {
    await refreshGames();
  }
  
  async function handleLaunchGame(game: any) {
    try {
      await launchGame(game);
    } catch (error) {
      console.error('Failed to launch game:', error);
    }
  }
  
  async function handleOpenMaps(game: any) {
    if (game.maps_folder) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_folder', { folderPath: game.maps_folder });
      } catch (error) {
        console.error('Failed to open maps folder:', error);
      }
    }
  }
  
  function getInstallationTypeIcon(type: string) {
    switch (type) {
      case 'Remastered (Windows)': return '✨';
      case 'BattleNet': return '🌐';
      case 'Combat': return '⚔️';
      case 'Original (DOS)': return '💾';
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
  
  function getGameTypeIcon(gameType: string) {
    switch (gameType) {
      case 'WC1': return '⚔️';
      case 'WC2': return '🛡️';
      case 'WC3': return '⚡';
      default: return '🎮';
    }
  }
  
  function getAvailableInstallationTypes(games: any[]) {
    return [...new Set(games.map(g => g.installation_type))];
  }
  
  function handlePreferenceChange(gameType: 'WC1' | 'WC2' | 'WC3', newPreference: string) {
    updateUserPreference(gameType, newPreference);
  }
  
  function togglePaths() {
    showPaths = !showPaths;
  }
</script>

<div class="dashboard">
  <!-- Quick Actions Bar -->
  <div class="quick-actions">
    <button class="btn btn-primary" on:click={handleScanGames} disabled={isScanning}>
      {#if isScanning}🔍 Scanning...{:else}🔍 Scan for Games{/if}
    </button>
    <button class="btn btn-secondary" on:click={handleRefreshGames}>
      🔄 Refresh Status
    </button>
    <button class="btn btn-info" on:click={togglePaths}>
      {showPaths ? '📁 Hide Paths' : '📁 Show Paths'}
    </button>
    <div class="scan-summary">
      {#if $scanResult}
        <span class="summary-item">📊 {$scanResult.total_found} games found</span>
        <span class="summary-item">💾 {$scanResult.drives_scanned.join(', ')}</span>
      {/if}
    </div>
  </div>

  <!-- Game Overview Cards -->
  <div class="game-overview">
    <!-- Warcraft I Card -->
    <div class="game-card wc1">
      <div class="game-header">
        <div class="game-icon">⚔️</div>
        <div class="game-title">Warcraft I</div>
        <div class="game-count">{$wc1Games.length} installation{$wc1Games.length !== 1 ? 's' : ''}</div>
      </div>
      
      <!-- Default Game Preference Selector -->
      {#if $wc1Games.length > 1}
        <div class="preference-selector">
          <label for="wc1-preference">Default Version:</label>
          <select 
            id="wc1-preference" 
            value={$userPreferences.wc1Default}
            on:change={(e) => handlePreferenceChange('WC1', e.target.value)}
          >
            {#each getAvailableInstallationTypes($wc1Games) as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>
      {/if}
      
      {#if $wc1DefaultGame}
        <div class="primary-game">
          <div class="game-info">
            <div class="game-name">{$wc1DefaultGame.name}</div>
            <div class="game-version">
              {getInstallationTypeIcon($wc1DefaultGame.installation_type)} {$wc1DefaultGame.installation_type}
            </div>
            <div class="game-drive" style="color: {getDriveColor($wc1DefaultGame.drive)}">
              📁 {$wc1DefaultGame.drive}
            </div>
            {#if showPaths}
              <div class="game-path">
                <strong>Installation:</strong> {$wc1DefaultGame.path}
              </div>
              <div class="game-executable">
                <strong>Executable:</strong> {$wc1DefaultGame.executable}
              </div>
            {/if}
          </div>
          <div class="game-actions">
            <button class="btn btn-launch" on:click={() => handleLaunchGame($wc1DefaultGame)}>
              🚀 Launch
            </button>
            {#if $wc1DefaultGame.maps_folder}
              <button class="btn btn-maps" on:click={() => handleOpenMaps($wc1DefaultGame)}>
                🗺️ Maps
              </button>
            {/if}
          </div>
        </div>
        
        {#if $wc1Games.length > 1}
          <div class="secondary-games">
            <details>
              <summary>+{$wc1Games.length - 1} more installation{$wc1Games.length !== 2 ? 's' : ''}</summary>
              <div class="secondary-list">
                {#each $wc1Games.filter(g => g !== $wc1DefaultGame) as game}
                  <div class="secondary-game">
                    <div class="secondary-game-info">
                      <span class="game-type">{getInstallationTypeIcon(game.installation_type)} {game.installation_type}</span>
                      <span class="game-drive" style="color: {getDriveColor(game.drive)}">{game.drive}</span>
                      {#if showPaths}
                        <div class="game-path-small">{game.path}</div>
                      {/if}
                    </div>
                    <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>Launch</button>
                  </div>
                {/each}
              </div>
            </details>
          </div>
        {/if}
      {:else}
        <div class="no-game">
          <p>No Warcraft I installations found</p>
          <button class="btn btn-scan" on:click={handleScanGames}>Scan for Games</button>
        </div>
      {/if}
    </div>

    <!-- Warcraft II Card -->
    <div class="game-card wc2">
      <div class="game-header">
        <div class="game-icon">🛡️</div>
        <div class="game-title">Warcraft II</div>
        <div class="game-count">{$wc2Games.length} installation{$wc2Games.length !== 1 ? 's' : ''}</div>
      </div>
      
      <!-- Default Game Preference Selector -->
      {#if $wc2Games.length > 1}
        <div class="preference-selector">
          <label for="wc2-preference">Default Version:</label>
          <select 
            id="wc2-preference" 
            value={$userPreferences.wc2Default}
            on:change={(e) => handlePreferenceChange('WC2', e.target.value)}
          >
            {#each getAvailableInstallationTypes($wc2Games) as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>
      {/if}
      
      {#if $wc2DefaultGame}
        <div class="primary-game">
          <div class="game-info">
            <div class="game-name">{$wc2DefaultGame.name}</div>
            <div class="game-version">
              {getInstallationTypeIcon($wc2DefaultGame.installation_type)} {$wc2DefaultGame.installation_type}
            </div>
            <div class="game-drive" style="color: {getDriveColor($wc2DefaultGame.drive)}">
              📁 {$wc2DefaultGame.drive}
            </div>
            {#if showPaths}
              <div class="game-path">
                <strong>Installation:</strong> {$wc2DefaultGame.path}
              </div>
              <div class="game-executable">
                <strong>Executable:</strong> {$wc2DefaultGame.executable}
              </div>
            {/if}
          </div>
          <div class="game-actions">
            <button class="btn btn-launch" on:click={() => handleLaunchGame($wc2DefaultGame)}>
              🚀 Launch
            </button>
            {#if $wc2DefaultGame.maps_folder}
              <button class="btn btn-maps" on:click={() => handleOpenMaps($wc2DefaultGame)}>
                🗺️ Maps
              </button>
            {/if}
          </div>
        </div>
        
        {#if $wc2Games.length > 1}
          <div class="secondary-games">
            <details>
              <summary>+{$wc2Games.length - 1} more installation{$wc2Games.length !== 2 ? 's' : ''}</summary>
              <div class="secondary-list">
                {#each $wc2Games.filter(g => g !== $wc2DefaultGame) as game}
                  <div class="secondary-game">
                    <div class="secondary-game-info">
                      <span class="game-type">{getInstallationTypeIcon(game.installation_type)} {game.installation_type}</span>
                      <span class="game-drive" style="color: {getDriveColor(game.drive)}">{game.drive}</span>
                      {#if showPaths}
                        <div class="game-path-small">{game.path}</div>
                      {/if}
                    </div>
                    <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>Launch</button>
                  </div>
                {/each}
              </div>
            </details>
          </div>
        {/if}
      {:else}
        <div class="no-game">
          <p>No Warcraft II installations found</p>
          <button class="btn btn-scan" on:click={handleScanGames}>Scan for Games</button>
        </div>
      {/if}
    </div>

    <!-- Warcraft III Card -->
    <div class="game-card wc3">
      <div class="game-header">
        <div class="game-icon">⚡</div>
        <div class="game-title">Warcraft III</div>
        <div class="game-count">{$wc3Games.length} installation{$wc3Games.length !== 1 ? 's' : ''}</div>
      </div>
      
      <!-- Default Game Preference Selector -->
      {#if $wc3Games.length > 1}
        <div class="preference-selector">
          <label for="wc3-preference">Default Version:</label>
          <select 
            id="wc3-preference" 
            value={$userPreferences.wc3Default}
            on:change={(e) => handlePreferenceChange('WC3', e.target.value)}
          >
            {#each getAvailableInstallationTypes($wc3Games) as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>
      {/if}
      
      {#if $wc3DefaultGame}
        <div class="primary-game">
          <div class="game-info">
            <div class="game-name">{$wc3DefaultGame.name}</div>
            <div class="game-version">
              {getInstallationTypeIcon($wc3DefaultGame.installation_type)} {$wc3DefaultGame.installation_type}
            </div>
            <div class="game-drive" style="color: {getDriveColor($wc3DefaultGame.drive)}">
              📁 {$wc3DefaultGame.drive}
            </div>
            {#if showPaths}
              <div class="game-path">
                <strong>Installation:</strong> {$wc3DefaultGame.path}
              </div>
              <div class="game-executable">
                <strong>Executable:</strong> {$wc3DefaultGame.executable}
              </div>
            {/if}
          </div>
          <div class="game-actions">
            <button class="btn btn-launch" on:click={() => handleLaunchGame($wc3DefaultGame)}>
              🚀 Launch
            </button>
            {#if $wc3DefaultGame.maps_folder}
              <button class="btn btn-maps" on:click={() => handleOpenMaps($wc3DefaultGame)}>
                🗺️ Maps
              </button>
            {/if}
          </div>
        </div>
        
        {#if $wc3Games.length > 1}
          <div class="secondary-games">
            <details>
              <summary>+{$wc3Games.length - 1} more installation{$wc3Games.length !== 2 ? 's' : ''}</summary>
              <div class="secondary-list">
                {#each $wc3Games.filter(g => g !== $wc3DefaultGame) as game}
                  <div class="secondary-game">
                    <div class="secondary-game-info">
                      <span class="game-type">{getInstallationTypeIcon(game.installation_type)} {game.installation_type}</span>
                      <span class="game-drive" style="color: {getDriveColor(game.drive)}">{game.drive}</span>
                      {#if showPaths}
                        <div class="game-path-small">{game.path}</div>
                      {/if}
                    </div>
                    <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>Launch</button>
                  </div>
                {/each}
              </div>
            </details>
          </div>
        {/if}
      {:else}
        <div class="no-game">
          <p>No Warcraft III installations found</p>
          <button class="btn btn-scan" on:click={handleScanGames}>Scan for Games</button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Recent Activity Section -->
  <div class="recent-activity">
    <h3>📊 System Overview</h3>
    <div class="activity-grid">
      <div class="activity-item">
        <div class="activity-icon">🎮</div>
        <div class="activity-content">
          <div class="activity-title">Total Games</div>
          <div class="activity-value">{$scanResult?.total_found || 0}</div>
        </div>
      </div>
      <div class="activity-item">
        <div class="activity-icon">💾</div>
        <div class="activity-content">
          <div class="activity-title">Drives Scanned</div>
          <div class="activity-value">{$scanResult?.drives_scanned?.length || 0}</div>
        </div>
      </div>
      <div class="activity-item">
        <div class="activity-icon">⚔️</div>
        <div class="activity-content">
          <div class="activity-title">WC1 Games</div>
          <div class="activity-value">{$wc1Games.length}</div>
        </div>
      </div>
      <div class="activity-item">
        <div class="activity-icon">🛡️</div>
        <div class="activity-content">
          <div class="activity-title">WC2 Games</div>
          <div class="activity-value">{$wc2Games.length}</div>
        </div>
      </div>
      <div class="activity-item">
        <div class="activity-icon">⚡</div>
        <div class="activity-content">
          <div class="activity-title">WC3 Games</div>
          <div class="activity-value">{$wc3Games.length}</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .quick-actions {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 30px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  .btn-secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(240, 147, 251, 0.4);
  }

  .btn-info {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }

  .btn-info:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
  }

  .scan-summary {
    margin-left: auto;
    display: flex;
    gap: 20px;
  }

  .summary-item {
    font-size: 0.9rem;
    color: #9aa0a6;
    font-weight: 500;
  }

  .game-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 25px;
    margin-bottom: 30px;
  }

  .game-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    padding: 25px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  .game-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .game-card.wc1 {
    border-left: 4px solid #ffd700;
  }

  .game-card.wc2 {
    border-left: 4px solid #2196F3;
  }

  .game-card.wc3 {
    border-left: 4px solid #9C27B0;
  }

  .game-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .game-icon {
    font-size: 2rem;
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
  }

  .game-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #ffffff;
  }

  .game-count {
    margin-left: auto;
    font-size: 0.9rem;
    color: #9aa0a6;
    background: rgba(255, 255, 255, 0.1);
    padding: 4px 12px;
    border-radius: 20px;
  }

  .preference-selector {
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .preference-selector label {
    display: block;
    margin-bottom: 8px;
    color: #9aa0a6;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .preference-selector select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    font-size: 0.9rem;
  }

  .preference-selector select:focus {
    outline: none;
    border-color: #ffd700;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
  }

  .primary-game {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 15px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .game-info {
    margin-bottom: 15px;
  }

  .game-name {
    font-size: 1.2rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 8px;
  }

  .game-version {
    font-size: 1rem;
    color: #ffd700;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .game-drive {
    font-size: 0.9rem;
    color: #9aa0a6;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .game-path, .game-executable {
    font-size: 0.8rem;
    color: #9aa0a6;
    margin-bottom: 6px;
    word-break: break-all;
    line-height: 1.4;
  }

  .game-actions {
    display: flex;
    gap: 10px;
  }

  .btn-launch {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #1a2332;
    flex: 2;
  }

  .btn-launch:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
  }

  .btn-maps {
    background: rgba(255, 255, 255, 0.1);
    color: #e8eaed;
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex: 1;
  }

  .btn-maps:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .secondary-games {
    margin-top: 15px;
  }

  .secondary-games summary {
    cursor: pointer;
    color: #9aa0a6;
    font-size: 0.9rem;
    padding: 8px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .secondary-games summary:hover {
    color: #ffffff;
  }

  .secondary-list {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .secondary-game {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .secondary-game-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .game-type {
    color: #ffd700;
    font-weight: 500;
  }

  .game-drive {
    color: #9aa0a6;
    font-weight: 500;
    min-width: 40px;
  }

  .game-path-small {
    font-size: 0.75rem;
    color: #9aa0a6;
    word-break: break-all;
    line-height: 1.3;
  }

  .btn-small {
    padding: 4px 12px;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.1);
    color: #e8eaed;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-small:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .no-game {
    text-align: center;
    padding: 20px;
    color: #9aa0a6;
  }

  .btn-scan {
    background: rgba(255, 255, 255, 0.1);
    color: #e8eaed;
    border: 1px solid rgba(255, 255, 255, 0.2);
    margin-top: 10px;
  }

  .btn-scan:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .recent-activity {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 15px;
    padding: 25px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .recent-activity h3 {
    font-size: 1.5rem;
    margin-bottom: 20px;
    color: #ffffff;
    text-align: center;
  }

  .activity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }

  .activity-item:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }

  .activity-icon {
    font-size: 2rem;
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.4));
  }

  .activity-content {
    flex: 1;
  }

  .activity-title {
    font-size: 0.9rem;
    color: #9aa0a6;
    margin-bottom: 5px;
  }

  .activity-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #ffd700;
  }

  @media (max-width: 768px) {
    .quick-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .scan-summary {
      margin-left: 0;
      justify-content: center;
    }

    .game-overview {
      grid-template-columns: 1fr;
    }

    .game-actions {
      flex-direction: column;
    }

    .activity-grid {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
  }
</style>
