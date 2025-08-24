<script lang="ts">
  import { 
    wc1Games, wc2Games, wc3Games, 
    scanResult, isLoading, scanGames, launchGame, refreshGames
  } from '../stores/gameStore';
  
  let isScanning = false;
  
  // Featured installation management - one per game type
  let featuredInstallations = {
    WC1: null as any,
    WC2: null as any,
    WC3: null as any
  };
  
  // Initialize featured installations when stores change
  $: if ($wc1Games && $wc1Games.length > 0) {
    console.log('WC1 games updated:', $wc1Games);
    if (!featuredInstallations.WC1) {
      // Prefer Remastered over DOS versions
      const remastered = $wc1Games.find(g => g.installation_type === 'Remastered (Windows)');
      featuredInstallations.WC1 = remastered || $wc1Games[0];
      console.log('Initialized WC1 featured installation:', featuredInstallations.WC1);
    }
  }
  
  $: if ($wc2Games && $wc2Games.length > 0) {
    console.log('WC2 games updated:', $wc2Games);
    if (!featuredInstallations.WC2) {
      const remastered = $wc2Games.find(g => g.installation_type === 'Remastered (Windows)');
      featuredInstallations.WC2 = remastered || $wc2Games[0];
      console.log('Initialized WC2 featured installation:', featuredInstallations.WC2);
    }
  }
  
  $: if ($wc3Games && $wc3Games.length > 0) {
    console.log('WC3 games updated:', $wc3Games);
    if (!featuredInstallations.WC3) {
      const reforged = $wc3Games.find(g => g.installation_type === 'Reforged');
      featuredInstallations.WC3 = reforged || $wc3Games[0];
      console.log('Initialized WC3 featured installation:', featuredInstallations.WC3);
    }
  }
  
  // Function to toggle between different installations of the same game type
  function toggleFeaturedInstallation(gameType: 'WC1' | 'WC2' | 'WC3') {
    const games = gameType === 'WC1' ? $wc1Games : gameType === 'WC2' ? $wc2Games : $wc3Games;
    const currentFeatured = featuredInstallations[gameType];
    
    if (games.length > 1) {
      // Find the current featured game index
      const currentIndex = games.findIndex(g => g.path === currentFeatured.path);
      // Move to next game, or back to first if at end
      const nextIndex = (currentIndex + 1) % games.length;
      featuredInstallations[gameType] = games[nextIndex];
      
      console.log(`Switched ${gameType} featured installation to:`, featuredInstallations[gameType]);
    }
  }
  
  // Function to set a specific installation as featured
  function setFeaturedInstallation(gameType: 'WC1' | 'WC2' | 'WC3', game: any) {
    featuredInstallations[gameType] = game;
    console.log(`Set ${gameType} featured installation to:`, game);
  }
  
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
    
    return colors[drive] || '#9aa0a6';
  }
  
  function getGameTypeIcon(gameType: string) {
    switch (gameType) {
      case 'WC1': return '⚔️';
      case 'WC2': return '🛡️';
      case 'WC3': return '⚡';
      default: return '🎮';
    }
  }
  
  // Function to get installation display name
  function getInstallationDisplayName(type: string) {
    switch (type) {
      case 'Remastered (Windows)': return 'Remastered';
      case 'BattleNet': return 'Battle.net';
      case 'Combat': return 'Combat';
      case 'Original (DOS)': return 'DOS';
      case 'DOS': return 'DOS';
      case 'Reforged': return 'Reforged';
      case 'FrozenThrone': return 'Frozen Throne';
      case 'ReignOfChaos': return 'Reign of Chaos';
      case 'Original': return 'Original';
      default: return type;
    }
  }
  
  // Debug function to check current state
  function debugCurrentState() {
    console.log('=== DEBUG: Current State ===');
    console.log('WC1 Games:', $wc1Games);
    console.log('WC2 Games:', $wc2Games);
    console.log('WC3 Games:', $wc3Games);
    console.log('Featured Installations:', featuredInstallations);
    console.log('Scan Result:', $scanResult);
    console.log('===========================');
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
    <button class="btn btn-debug" on:click={debugCurrentState}>
      🐛 Debug State
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
      
             {#if $wc1Games.length > 0 && featuredInstallations.WC1}
         <!-- Featured Game Display -->
        <div class="featured-game">
          <div class="game-info">
            <div class="game-name">{featuredInstallations.WC1.name}</div>
            <div class="game-version">
              {getInstallationTypeIcon(featuredInstallations.WC1.installation_type)} {getInstallationDisplayName(featuredInstallations.WC1)}
            </div>
            <div class="game-drive" style="color: {getDriveColor(featuredInstallations.WC1.drive)}">
              📁 {featuredInstallations.WC1.drive}
            </div>
            <div class="game-path">
              <strong>Installation:</strong> {featuredInstallations.WC1.path}
            </div>
            <div class="game-executable">
              <strong>Executable:</strong> {featuredInstallations.WC1.executable}
            </div>
          </div>
          <div class="game-actions">
            <button class="btn btn-launch" on:click={() => handleLaunchGame(featuredInstallations.WC1)}>
              🚀 Launch
            </button>
            {#if featuredInstallations.WC1.maps_folder}
              <button class="btn btn-maps" on:click={() => handleOpenMaps(featuredInstallations.WC1)}>
                🗺️ Maps
              </button>
            {/if}
          </div>
        </div>
        
        <!-- Featured Installation Selector -->
        <div class="featured-selector">
          <label for="wc1-featured">Switch to different installation:</label>
          <select 
            id="wc1-featured" 
            value={featuredInstallations.WC1.path}
            on:change={(e) => {
              const selectedGame = $wc1Games.find(g => g.path === e.target.value);
              if (selectedGame) setFeaturedInstallation('WC1', selectedGame);
            }}
          >
            {#each $wc1Games as game}
              <option value={game.path}>
                {getInstallationTypeIcon(game.installation_type)} {getInstallationDisplayName(game)} ({game.drive})
              </option>
            {/each}
          </select>
        </div>
        
        <!-- Other Installations (Collapsed by Default) -->
        {#if $wc1Games.length > 1}
          <div class="other-installations">
            <details>
              <summary>📦 {$wc1Games.length - 1} other installation{$wc1Games.length !== 2 ? 's' : ''}</summary>
              <div class="installation-list">
                {#each $wc1Games.filter(g => g !== featuredInstallations.WC1) as game}
                  <div class="other-installation">
                    <div class="other-info">
                      <span class="game-version">{getInstallationTypeIcon(game.installation_type)} {getInstallationDisplayName(game)}</span>
                      <span class="game-drive" style="color: {getDriveColor(game.drive)}">{game.drive}</span>
                    </div>
                    <div class="other-actions">
                      <button class="btn btn-small" on:click={() => setFeaturedInstallation('WC1', game)}>
                        Make Featured
                      </button>
                      <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>Launch</button>
                    </div>
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
      
      {#if $wc2Games.length > 0 && featuredInstallations.WC2}
        <!-- Featured Game Display -->
        <div class="featured-game">
          <div class="game-info">
            <div class="game-name">{featuredInstallations.WC2.name}</div>
            <div class="game-version">
              {getInstallationTypeIcon(featuredInstallations.WC2.installation_type)} {getInstallationDisplayName(featuredInstallations.WC2)}
            </div>
            <div class="game-drive" style="color: {getDriveColor(featuredInstallations.WC2.drive)}">
              📁 {featuredInstallations.WC2.drive}
            </div>
            <div class="game-path">
              <strong>Installation:</strong> {featuredInstallations.WC2.path}
            </div>
            <div class="game-executable">
              <strong>Executable:</strong> {featuredInstallations.WC2.executable}
            </div>
          </div>
          <div class="game-actions">
            <button class="btn btn-launch" on:click={() => handleLaunchGame(featuredInstallations.WC2)}>
              🚀 Launch
            </button>
            {#if featuredInstallations.WC2.maps_folder}
              <button class="btn btn-maps" on:click={() => handleOpenMaps(featuredInstallations.WC2)}>
                🗺️ Maps
              </button>
            {/if}
          </div>
        </div>
        
        <!-- Featured Installation Selector -->
        <div class="featured-selector">
          <label for="wc2-featured">Switch to different installation:</label>
          <select 
            id="wc2-featured" 
            value={featuredInstallations.WC2.path}
            on:change={(e) => {
              const selectedGame = $wc2Games.find(g => g.path === e.target.value);
              if (selectedGame) setFeaturedInstallation('WC2', selectedGame);
            }}
          >
            {#each $wc2Games as game}
              <option value={game.path}>
                {getInstallationTypeIcon(game.installation_type)} {getInstallationDisplayName(game)} ({game.drive})
              </option>
            {/each}
          </select>
        </div>
        
        <!-- Other Installations (Collapsed by Default) -->
        {#if $wc2Games.length > 1}
          <div class="other-installations">
            <details>
              <summary>📦 {$wc2Games.length - 1} other installation{$wc2Games.length !== 2 ? 's' : ''}</summary>
              <div class="installation-list">
                {#each $wc2Games.filter(g => g !== featuredInstallations.WC2) as game}
                  <div class="other-installation">
                    <div class="other-info">
                      <span class="game-version">{getInstallationTypeIcon(game.installation_type)} {getInstallationDisplayName(game)}</span>
                      <span class="game-drive" style="color: {getDriveColor(game.drive)}">{game.drive}</span>
                    </div>
                    <div class="other-actions">
                      <button class="btn btn-small" on:click={() => setFeaturedInstallation('WC2', game)}>
                        Make Featured
                      </button>
                      <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>Launch</button>
                    </div>
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
      
      {#if $wc3Games.length > 0 && featuredInstallations.WC3}
        <!-- Featured Game Display -->
        <div class="featured-game">
          <div class="game-info">
            <div class="game-name">{featuredInstallations.WC3.name}</div>
            <div class="game-version">
              {getInstallationTypeIcon(featuredInstallations.WC3.installation_type)} {getInstallationDisplayName(featuredInstallations.WC3)}
            </div>
            <div class="game-drive" style="color: {getDriveColor(featuredInstallations.WC3.drive)}">
              📁 {featuredInstallations.WC3.drive}
            </div>
            <div class="game-path">
              <strong>Installation:</strong> {featuredInstallations.WC3.path}
            </div>
            <div class="game-executable">
              <strong>Executable:</strong> {featuredInstallations.WC3.executable}
            </div>
          </div>
          <div class="game-actions">
            <button class="btn btn-launch" on:click={() => handleLaunchGame(featuredInstallations.WC3)}>
              🚀 Launch
            </button>
            {#if featuredInstallations.WC3.maps_folder}
              <button class="btn btn-maps" on:click={() => handleOpenMaps(featuredInstallations.WC3)}>
                🗺️ Maps
              </button>
            {/if}
          </div>
        </div>
        
        <!-- Featured Installation Selector -->
        <div class="featured-selector">
          <label for="wc3-featured">Switch to different installation:</label>
          <select 
            id="wc3-featured" 
            value={featuredInstallations.WC3.path}
            on:change={(e) => {
              const selectedGame = $wc3Games.find(g => g.path === e.target.value);
              if (selectedGame) setFeaturedInstallation('WC3', selectedGame);
            }}
          >
            {#each $wc3Games as game}
              <option value={game.path}>
                {getInstallationTypeIcon(game.installation_type)} {getInstallationDisplayName(game)} ({game.drive})
              </option>
            {/each}
          </select>
        </div>
        
        <!-- Other Installations (Collapsed by Default) -->
        {#if $wc3Games.length > 1}
          <div class="other-installations">
            <details>
              <summary>📦 {$wc3Games.length - 1} other installation{$wc3Games.length !== 2 ? 's' : ''}</summary>
              <div class="installation-list">
                {#each $wc3Games.filter(g => g !== featuredInstallations.WC3) as game}
                  <div class="other-installation">
                    <div class="other-info">
                      <span class="game-version">{getInstallationTypeIcon(game.installation_type)} {getInstallationDisplayName(game)}</span>
                      <span class="game-drive" style="color: {getDriveColor(game.drive)}">{game.drive}</span>
                    </div>
                    <div class="other-actions">
                      <button class="btn btn-small" on:click={() => setFeaturedInstallation('WC3', game)}>
                        Make Featured
                      </button>
                      <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>Launch</button>
                    </div>
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
  
  .btn-debug {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    color: white;
  }
  
  .btn-debug:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 152, 0, 0.4);
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
  
  /* Featured Installation Interface Styles */
  .featured-selector {
    margin-bottom: 15px;
    padding: 12px 15px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .featured-selector label {
    display: block;
    margin-bottom: 8px;
    color: #9aa0a6;
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .featured-selector select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .featured-selector select:focus {
    outline: none;
    border-color: #ffd700;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
  }
  
  .featured-selector select:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  
  .featured-game {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 15px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
  
  .other-installations {
    margin-top: 15px;
  }
  
  .other-installations summary {
    cursor: pointer;
    color: #9aa0a6;
    font-size: 0.9rem;
    padding: 12px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    transition: color 0.2s ease;
  }
  
  .other-installations summary:hover {
    color: #ffffff;
  }
  
  .installation-list {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .other-installation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 15px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
  }
  
  .other-installation:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(5px);
  }
  
  .other-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .other-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }



  .primary-game {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 15px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .featured-game {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 15px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
