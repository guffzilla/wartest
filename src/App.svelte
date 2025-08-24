<script lang="ts">
  import { onMount } from 'svelte';
  import Dashboard from './components/Dashboard.svelte';
  import { scanGames } from './stores/gameStore';
  
  onMount(async () => {
    await scanGames();
  });
</script>

<main>
  <div class="header">
    <div class="title-container">
      <div class="gear left-gear">⚔️</div>
      <h1 class="robotic-title">WC Arena Core</h1>
      <div class="gear right-gear">⚔️</div>
    </div>
    <div class="title-subtitle">Unified Warcraft Management Center</div>
  </div>

  <Dashboard />
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
    max-width: 1400px;
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


</style>
