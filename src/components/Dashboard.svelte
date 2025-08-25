<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    games, 
    wc1Games, 
    wc2Games, 
    wc3Games, 
    scanResult, 
    isLoading,
    userPreferences,
    type GameInfo,
    type InstallationType
  } from '../stores/gameStore';
  import { scanGames, refreshGames, launchGame } from '../stores/gameStore';
  import { 
    getInstallationTypeIcon, 
    getInstallationTypeColor,
    getGameTypeIcon,
    getGameTypeColor
  } from '../utils/gameUtils';
  import { 
    getDriveIcon, 
    getDriveColor,
    formatFileSize,
    formatDate
  } from '../utils/systemUtils';

  // Local state for managing active game selection
  let activeGames = {
    wc1: null as GameInfo | null,
    wc2: null as GameInfo | null,
    wc3: null as GameInfo | null
  };

  // Local state for scanning
  let isScanning = false;

  // Local state for showing/hiding paths
  let showPaths = false;

  // Local state for manual game addition
  let showAddGameForm = false;
  let selectedDirectory = '';
  let detectedGames = [] as any[];
  let isDetecting = false;

  // Function to open directory picker
  async function openDirectoryPicker() {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('select_directory');
      if (result) {
        selectedDirectory = result as string;
        await detectGamesInDirectory(selectedDirectory);
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error);
      alert('Failed to open directory picker: ' + error.message);
    }
  }

  // Function to detect games in selected directory
  async function detectGamesInDirectory(directoryPath: string) {
    if (!directoryPath) return;
    
    isDetecting = true;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('detect_games_in_directory', { directoryPath });
      detectedGames = result as any[];
      console.log('Detected games:', detectedGames);
    } catch (error) {
      console.error('Failed to detect games:', error);
      detectedGames = [];
    } finally {
      isDetecting = false;
    }
  }

  // Function to add detected game
  async function addDetectedGame(game: any) {
    try {
      // Add to the appropriate store (this would need to be implemented in the store)
      console.log('Adding detected game:', game);
      
      alert(`✅ Game added successfully!\n\n${game.name}\nType: ${game.game_type}\nVersion: ${game.installation_type}`);
      
      // Close the form
      toggleAddGameForm();
    } catch (error) {
      console.error('Failed to add detected game:', error);
      alert('Failed to add game: ' + error.message);
    }
  }

  // Function to toggle add game form
  function toggleAddGameForm() {
    showAddGameForm = !showAddGameForm;
    if (!showAddGameForm) {
      // Reset form when closing
      selectedDirectory = '';
      detectedGames = [];
    }
  }

  // Initialize active games when component mounts
  $: if ($wc1Games.length > 0 && !activeGames.wc1) {
    activeGames.wc1 = $wc1Games[0];
  }
  $: if ($wc2Games.length > 0 && !activeGames.wc2) {
    activeGames.wc2 = $wc2Games[0];
  }
  $: if ($wc3Games.length > 0 && !activeGames.wc3) {
    activeGames.wc3 = $wc3Games[0];
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

  // Function to get available installation types
  function getAvailableInstallationTypes(games: any[]) {
    return [...new Set(games.map(g => g.installation_type))];
  }

  // Function to toggle paths visibility
  function togglePaths() {
    showPaths = !showPaths;
  }

  // Function to switch active game
  function switchActiveGame(gameType: 'wc1' | 'wc2' | 'wc3', game: GameInfo) {
    activeGames[gameType] = game;
    activeGames = { ...activeGames };
  }

  // Handle game scanning
  async function handleScanGames() {
    isScanning = true;
    try {
      await scanGames();
    } catch (error) {
      console.error('Failed to scan for games:', error);
    } finally {
      isScanning = false;
    }
  }

  // Handle game status refresh
  async function handleRefreshGames() {
    try {
      await refreshGames();
    } catch (error) {
      console.error('Failed to refresh game status:', error);
    }
  }

  // Handle game launch
  async function handleLaunchGame(game: GameInfo) {
    try {
      await launchGame(game);
    } catch (error) {
      console.error('Failed to launch game:', error);
    }
  }

  // Handle opening maps folder
  async function handleOpenMaps(game: GameInfo) {
    if (game.maps_folder) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_folder', { folderPath: game.maps_folder });
      } catch (error) {
        console.error('Failed to open maps folder:', error);
      }
    }
  }

  // Debug function to check current state
  function debugCurrentState() {
    console.log('=== DEBUG: Current State ===');
    console.log('WC1 Games:', $wc1Games);
    console.log('WC2 Games:', $wc2Games);
    console.log('WC3 Games:', $wc3Games);
    console.log('Active Games:', activeGames);
    console.log('Scan Result:', $scanResult);
    console.log('===========================');
  }

  // Scan for games on component mount
  onMount(() => {
    handleScanGames();
  });
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
    <button class="btn btn-info" on:click={toggleAddGameForm}>
      ➕ Add Game Manually
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

  <!-- Manual Game Addition Form -->
  {#if showAddGameForm}
    <div class="add-game-form-inline">
      <div class="form-header">
        <h3>➕ Add Game from Directory</h3>
        <button class="btn-close" on:click={toggleAddGameForm}>✕</button>
      </div>
      
      <div class="form-content">
        <!-- Directory Selection -->
        <div class="directory-selection">
          <label for="directory-picker">Select Game Directory:</label>
          <div class="directory-input-group">
            <input 
              id="directory-picker" 
              type="text" 
              value={selectedDirectory}
              placeholder="Click 'Browse' to select a folder containing Warcraft games"
              readonly
            />
            <button class="btn btn-secondary" on:click={openDirectoryPicker}>
              📁 Browse
            </button>
          </div>
        </div>

        <!-- Detection Status -->
        {#if isDetecting}
          <div class="detection-status">
            <div class="spinner"></div>
            <span>🔍 Scanning directory for games...</span>
          </div>
        {/if}

        <!-- Detected Games -->
        {#if detectedGames.length > 0}
          <div class="detected-games">
            <h4>🎮 Games Found in Directory</h4>
            <div class="games-list">
              {#each detectedGames as game}
                <div class="detected-game-item">
                  <div class="game-details">
                    <div class="game-name">{game.name}</div>
                    <div class="game-type">
                      {getInstallationTypeIcon(game.installation_type)} {game.installation_type}
                    </div>
                    <div class="game-path">{game.path}</div>
                    <div class="game-executable">📁 {game.executable}</div>
                  </div>
                  <div class="game-actions">
                    <button class="btn btn-primary" on:click={() => addDetectedGame(game)}>
                      ➕ Add This Game
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if selectedDirectory && !isDetecting}
          <div class="no-games-found">
            <p>❌ No Warcraft games detected in the selected directory.</p>
            <p class="hint">Make sure the directory contains game executables (war.exe, war2.exe, etc.)</p>
          </div>
        {/if}

        <!-- Instructions -->
        <div class="instructions">
          <h4>💡 How it works:</h4>
          <ul>
            <li>Select a folder that contains Warcraft game files</li>
            <li>We'll automatically detect the game type and version</li>
            <li>Choose which games to add to your collection</li>
          </ul>
        </div>
        
        <div class="form-actions">
          <button class="btn btn-secondary" on:click={toggleAddGameForm}>
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Game Overview Cards -->
  <div class="game-overview">
    <!-- Warcraft I Card -->
    <div class="game-card wc1">
      <div class="game-header">
        <div class="game-icon">⚔️</div>
        <div class="game-title">Warcraft I</div>
        <div class="game-count">{$wc1Games.length} installation{$wc1Games.length !== 1 ? 's' : ''}</div>
        <button class="btn-add-game" on:click={toggleAddGameForm} title="Add Warcraft I game manually">
          ➕
        </button>
      </div>
      
      {#if $wc1Games.length > 0}
        <!-- Featured Game Display -->
        {#if activeGames.wc1}
          <div class="featured-game">
            <div class="game-info">
              <div class="game-name">{activeGames.wc1.name}</div>
              <div class="game-version">
                {getInstallationTypeIcon(activeGames.wc1.installation_type)} {activeGames.wc1.installation_type}
              </div>
              <div class="game-drive" style="color: {getDriveColor(activeGames.wc1.drive)}">
                📁 {activeGames.wc1.drive}
              </div>
              <div class="game-path">
                <strong>Installation:</strong> {activeGames.wc1.path}
              </div>
              <div class="game-executable">
                <strong>Executable:</strong> {activeGames.wc1.executable}
              </div>
            </div>
            <div class="game-actions">
              <button class="btn btn-launch" on:click={() => handleLaunchGame(activeGames.wc1)}>
                🚀 Launch
              </button>
              {#if activeGames.wc1.maps_folder}
                <button class="btn btn-maps" on:click={() => handleOpenMaps(activeGames.wc1)}>
                  🗺️ Maps
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Featured Game Selector -->
        <div class="featured-selector">
          <label for="wc1-featured">Switch to Installation:</label>
          <select 
            id="wc1-featured" 
            value={activeGames.wc1?.path || ''}
            on:change={(e) => {
              const selectedGame = $wc1Games.find(g => g.path === e.target.value);
              if (selectedGame) switchActiveGame('wc1', selectedGame);
            }}
          >
            {#each $wc1Games as game}
              <option value={game.path}>
                {getInstallationTypeIcon(game.installation_type)} {game.installation_type} - {game.drive}
              </option>
            {/each}
          </select>
        </div>

        <!-- Other Installations (Collapsible) -->
        {#if $wc1Games.length > 1}
          <div class="other-installations">
            <details>
              <summary>Other Installations ({$wc1Games.length - 1})</summary>
              <div class="installation-list">
                {#each $wc1Games.filter(g => g.path !== activeGames.wc1?.path) as game}
                  <div class="other-installation">
                    <div class="other-info">
                      <div class="game-type">{getInstallationTypeIcon(game.installation_type)} {game.installation_type}</div>
                      <div class="game-drive" style="color: {getDriveColor(game.drive)}">📁 {game.drive}</div>
                      <div class="game-path-small">{game.path}</div>
                    </div>
                    <div class="other-actions">
                      <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>
                        🚀 Launch
                      </button>
                      <button class="btn btn-small" on:click={() => switchActiveGame('wc1', game)}>
                        Make Featured
                      </button>
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
        <button class="btn-add-game" on:click={toggleAddGameForm} title="Add Warcraft II game manually">
          ➕
        </button>
      </div>
      
      {#if $wc2Games.length > 0}
        <!-- Featured Game Display -->
        {#if activeGames.wc2}
          <div class="featured-game">
            <div class="game-info">
              <div class="game-name">{activeGames.wc2.name}</div>
              <div class="game-version">
                {getInstallationTypeIcon(activeGames.wc2.installation_type)} {activeGames.wc2.installation_type}
              </div>
              <div class="game-drive" style="color: {getDriveColor(activeGames.wc2.drive)}">
                📁 {activeGames.wc2.drive}
              </div>
              <div class="game-path">
                <strong>Installation:</strong> {activeGames.wc2.path}
              </div>
              <div class="game-executable">
                <strong>Executable:</strong> {activeGames.wc2.executable}
              </div>
            </div>
            <div class="game-actions">
              <button class="btn btn-launch" on:click={() => handleLaunchGame(activeGames.wc2)}>
                🚀 Launch
              </button>
              {#if activeGames.wc2.maps_folder}
                <button class="btn btn-maps" on:click={() => handleOpenMaps(activeGames.wc2)}>
                  🗺️ Maps
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Featured Game Selector -->
        <div class="featured-selector">
          <label for="wc2-featured">Switch to Installation:</label>
          <select 
            id="wc2-featured" 
            value={activeGames.wc2?.path || ''}
            on:change={(e) => {
              const selectedGame = $wc2Games.find(g => g.path === e.target.value);
              if (selectedGame) switchActiveGame('wc2', selectedGame);
            }}
          >
            {#each $wc2Games as game}
              <option value={game.path}>
                {getInstallationTypeIcon(game.installation_type)} {game.installation_type} - {game.drive}
              </option>
            {/each}
          </select>
        </div>

        <!-- Other Installations (Collapsible) -->
        {#if $wc2Games.length > 1}
          <div class="other-installations">
            <details>
              <summary>Other Installations ({$wc2Games.length - 1})</summary>
              <div class="installation-list">
                {#each $wc2Games.filter(g => g.path !== activeGames.wc2?.path) as game}
                  <div class="other-installation">
                    <div class="other-info">
                      <div class="game-type">{getInstallationTypeIcon(game.installation_type)} {game.installation_type}</div>
                      <div class="game-drive" style="color: {getDriveColor(game.drive)}">📁 {game.drive}</div>
                      <div class="game-path-small">{game.path}</div>
                    </div>
                    <div class="other-actions">
                      <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>
                        🚀 Launch
                      </button>
                      <button class="btn btn-small" on:click={() => switchActiveGame('wc2', game)}>
                        Make Featured
                      </button>
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
        <button class="btn-add-game" on:click={toggleAddGameForm} title="Add Warcraft III game manually">
          ➕
        </button>
      </div>
      
      {#if $wc3Games.length > 0}
        <!-- Featured Game Display -->
        {#if activeGames.wc3}
          <div class="featured-game">
            <div class="game-info">
              <div class="game-name">{activeGames.wc3.name}</div>
              <div class="game-version">
                {getInstallationTypeIcon(activeGames.wc3.installation_type)} {activeGames.wc3.installation_type}
              </div>
              <div class="game-drive" style="color: {getDriveColor(activeGames.wc3.drive)}">
                📁 {activeGames.wc3.drive}
              </div>
              <div class="game-path">
                <strong>Installation:</strong> {activeGames.wc3.path}
              </div>
              <div class="game-executable">
                <strong>Executable:</strong> {activeGames.wc3.executable}
              </div>
            </div>
            <div class="game-actions">
              <button class="btn btn-launch" on:click={() => handleLaunchGame(activeGames.wc3)}>
                🚀 Launch
              </button>
              {#if activeGames.wc3.maps_folder}
                <button class="btn btn-maps" on:click={() => handleOpenMaps(activeGames.wc3)}>
                  🗺️ Maps
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Featured Game Selector -->
        <div class="featured-selector">
          <label for="wc3-featured">Switch to Installation:</label>
          <select 
            id="wc3-featured" 
            value={activeGames.wc3?.path || ''}
            on:change={(e) => {
              const selectedGame = $wc3Games.find(g => g.path === e.target.value);
              if (selectedGame) switchActiveGame('wc3', selectedGame);
            }}
          >
            {#each $wc3Games as game}
              <option value={game.path}>
                {getInstallationTypeIcon(game.installation_type)} {game.installation_type} - {game.drive}
              </option>
            {/each}
          </select>
        </div>

        <!-- Other Installations (Collapsible) -->
        {#if $wc3Games.length > 1}
          <div class="other-installations">
            <details>
              <summary>Other Installations ({$wc3Games.length - 1})</summary>
              <div class="installation-list">
                {#each $wc3Games.filter(g => g.path !== activeGames.wc3?.path) as game}
                  <div class="other-installation">
                    <div class="other-info">
                      <div class="game-type">{getInstallationTypeIcon(game.installation_type)} {game.installation_type}</div>
                      <div class="game-drive" style="color: {getDriveColor(game.drive)}">📁 {game.drive}</div>
                      <div class="game-path-small">{game.path}</div>
                    </div>
                    <div class="other-actions">
                      <button class="btn btn-small" on:click={() => handleLaunchGame(game)}>
                        🚀 Launch
                      </button>
                      <button class="btn btn-small" on:click={() => switchActiveGame('wc3', game)}>
                        Make Featured
                      </button>
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

  .btn-add-game {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #9aa0a6;
    padding: 6px 10px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    margin-left: 10px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-add-game:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
    transform: scale(1.1);
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

  /* New Grouped Interface Styles */
  .game-group {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 15px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .group-icon {
    font-size: 1.5rem;
    color: #ffd700;
  }

  .group-type {
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffffff;
    flex: 1;
  }

  .toggle-duplicates {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #9aa0a6;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    margin-left: auto;
  }

  .toggle-duplicates:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
  }

  .game-details {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }

  .duplicate-games-list {
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding: 15px 20px;
  }

  .duplicate-game-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .duplicate-game-item:last-child {
    border-bottom: none;
  }

  .duplicate-game-info {
    flex: 1;
  }

  .duplicate-game-name {
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 4px;
  }

  .duplicate-game-details {
    font-size: 0.85rem;
    color: #9aa0a6;
  }

  .duplicate-game-actions {
    display: flex;
    gap: 8px;
  }

  .btn-select {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #9aa0a6;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .btn-select:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
  }

  .btn-select.active {
    background: #4caf50;
    border-color: #4caf50;
    color: #ffffff;
  }

  .btn-select.active:hover {
    background: #45a049;
    border-color: #45a049;
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

  /* Manual Game Addition Form Styles */
  .add-game-form-inline {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 15px;
    padding: 25px;
    margin-bottom: 30px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .add-game-form-inline .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .add-game-form-inline .form-header h3 {
    font-size: 1.5rem;
    color: #ffffff;
    margin: 0;
  }

  .add-game-form-inline .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #9aa0a6;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .add-game-form-inline .btn-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .add-game-form-inline .form-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Directory Selection Styles */
  .directory-selection {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .directory-selection label {
    font-size: 1rem;
    color: #ffffff;
    font-weight: 500;
  }

  .directory-input-group {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .directory-input-group input {
    flex: 1;
    padding: 12px 15px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .directory-input-group input:focus {
    outline: none;
    border-color: #ffd700;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
  }

  .directory-input-group input:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .directory-input-group .btn {
    padding: 12px 20px;
    white-space: nowrap;
  }

  /* Detection Status Styles */
  .detection-status {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #9aa0a6;
    font-size: 1rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top: 2px solid #ffd700;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Detected Games Styles */
  .detected-games h4 {
    color: #ffffff;
    margin-bottom: 15px;
    font-size: 1.2rem;
  }

  .games-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .detected-game-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
  }

  .detected-game-item:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }

  .game-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .game-details .game-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffffff;
  }

  .game-details .game-type {
    font-size: 0.9rem;
    color: #ffd700;
    font-weight: 500;
  }

  .game-details .game-path,
  .game-details .game-executable {
    font-size: 0.8rem;
    color: #9aa0a6;
    word-break: break-all;
    line-height: 1.4;
  }

  .game-actions {
    margin-left: 20px;
  }

  /* No Games Found Styles */
  .no-games-found {
    text-align: center;
    padding: 30px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .no-games-found p {
    color: #9aa0a6;
    margin-bottom: 10px;
  }

  .no-games-found .hint {
    font-size: 0.9rem;
    color: #666;
    font-style: italic;
  }

  /* Instructions Styles */
  .instructions {
    background: rgba(255, 215, 0, 0.05);
    border: 1px solid rgba(255, 215, 0, 0.2);
    border-radius: 8px;
    padding: 20px;
  }

  .instructions h4 {
    color: #ffd700;
    margin-bottom: 15px;
    font-size: 1rem;
  }

  .instructions ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .instructions li {
    color: #9aa0a6;
    margin-bottom: 8px;
    padding-left: 20px;
    position: relative;
  }

  .instructions li:before {
    content: "•";
    color: #ffd700;
    position: absolute;
    left: 0;
  }

  .instructions li:last-child {
    margin-bottom: 0;
  }

  .add-game-form-inline .form-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 10px;
  }

  .add-game-form-inline .validation-results {
    margin-top: 15px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .add-game-form-inline .confidence-meter {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .add-game-form-inline .confidence-label {
    font-size: 0.9rem;
    color: #9aa0a6;
    font-weight: 500;
  }

  .add-game-form-inline .confidence-bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .add-game-form-inline .confidence-fill {
    height: 100%;
    border-radius: 4px;
  }

  .add-game-form-inline .confidence-value {
    font-size: 1rem;
    font-weight: 700;
    color: #ffd700;
  }

  .add-game-form-inline .capabilities {
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .add-game-form-inline .capabilities strong {
    color: #ffd700;
    font-weight: 500;
  }

  .add-game-form-inline .capabilities ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .add-game-form-inline .capabilities li {
    font-size: 0.85rem;
    color: #9aa0a6;
    margin-bottom: 5px;
  }

  .add-game-form-inline .capabilities li:last-child {
    margin-bottom: 0;
  }

  .add-game-form-inline .warnings {
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .add-game-form-inline .warnings strong {
    color: #ff9800;
    font-weight: 500;
  }

  .add-game-form-inline .warnings ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .add-game-form-inline .warnings li {
    font-size: 0.85rem;
    color: #9aa0a6;
    margin-bottom: 5px;
  }

  .add-game-form-inline .warnings li:last-child {
    margin-bottom: 0;
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

    .add-game-form-inline .form-row {
      flex-direction: column;
      gap: 10px;
    }

    .add-game-form-inline .form-field {
      width: 100%;
    }
  }
</style>
