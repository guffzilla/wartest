<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import TabManager from './components/TabManager.svelte';
  import GameScanner from './components/GameScanner.svelte';
  import { games, runningGames, scanGames, refreshGames } from './stores/gameStore';
  
  let currentTab = 'wc2';
  let isLoading = false;
  
  onMount(async () => {
    await scanGames();
  });
  
  async function handleScanGames() {
    isLoading = true;
    try {
      await scanGames();
    } finally {
      isLoading = false;
    }
  }
  
  async function handleRefreshGames() {
    await refreshGames();
  }
</script>

<main>
  <div class="header">
    <div class="title-container">
      <div class="gear left-gear">⚙️</div>
                    <h1 class="robotic-title">WC2 Desktop Manager</h1>
      <div class="gear right-gear">⚙️</div>
    </div>
                <div class="title-subtitle">Advanced Warcraft II Desktop Management Center</div>
  </div>

  <div class="control-panel">
    <button class="btn btn-primary" on:click={handleScanGames} disabled={isLoading}>
      {isLoading ? 'Scanning...' : '🔍 Scan for Games'}
    </button>
    <button class="btn btn-secondary" on:click={handleRefreshGames}>
      🔄 Refresh Status
    </button>
  </div>

  <TabManager bind:currentTab />
  
  <div class="main-content">
    {#if currentTab === 'wc2'}
      <GameScanner />
    {:else if currentTab === 'wc1'}
      <div class="tab-content">
        <h2>Warcraft I Management</h2>
        <p>Coming soon...</p>
      </div>
    {:else if currentTab === 'wc3'}
      <div class="tab-content">
        <h2>Warcraft III Management</h2>
        <p>Coming soon...</p>
      </div>
    {:else if currentTab === 'wc-arena'}
      <div class="tab-content">
        <h2>WCArena Integration</h2>
        <p>Coming soon...</p>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
    color: #e8eaed;
    min-height: 100vh;
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .header {
    text-align: center;
    margin-bottom: 30px;
    color: white;
  }
  
  .title-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 10px;
  }
  
  .gear {
    font-size: 2.5rem;
    animation: spin 4s linear infinite;
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
  }
  
  .left-gear {
    animation-direction: reverse;
    animation-duration: 6s;
  }
  
  .right-gear {
    animation-duration: 4s;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .robotic-title {
    font-size: 3.5rem;
    font-weight: 900;
    color: #ffd700;
    margin: 0;
    text-shadow: 
      0 0 20px rgba(255, 215, 0, 0.8),
      0 0 40px rgba(255, 215, 0, 0.4),
      0 0 60px rgba(255, 215, 0, 0.2);
    font-family: 'Orbitron', 'Courier New', monospace;
    letter-spacing: 3px;
    text-transform: uppercase;
    background: linear-gradient(45deg, #ffd700, #ffb347, #ffd700);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-shift 3s ease-in-out infinite;
  }
  
  @keyframes gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  
  .title-subtitle {
    font-size: 1.1rem;
    color: #9aa0a6;
    font-weight: 500;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
    opacity: 0.8;
  }

  .control-panel {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-bottom: 20px;
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

  .main-content {
    margin-top: 20px;
  }

  .tab-content {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    padding: 25px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .tab-content h2 {
    font-size: 1.8rem;
    margin-bottom: 20px;
    color: #ffffff;
    text-align: center;
  }

  .tab-content p {
    font-size: 1.1rem;
    color: #e8eaed;
    text-align: center;
    opacity: 0.8;
  }
</style>
