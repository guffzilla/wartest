<script lang="ts">
  export let currentTab: string;
  
  const tabs = [
    { id: 'wc1', label: 'Warcraft I', icon: '⚔️' },
    { id: 'wc2', label: 'Warcraft II', icon: '🎮' },
    { id: 'wc3', label: 'Warcraft III', icon: '🏆' },
    { id: 'wc-arena', label: 'WCArena', icon: '🌟' }
  ];
  
  function switchTab(tabId: string) {
    currentTab = tabId;
  }
</script>

<div class="tab-manager">
  <div class="tab-buttons">
    {#each tabs as tab}
      <button 
        class="tab-button {currentTab === tab.id ? 'active' : ''}"
        on:click={() => switchTab(tab.id)}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .tab-manager {
    margin-bottom: 20px;
  }
  
  .tab-buttons {
    display: flex;
    gap: 5px;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 5px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .tab-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #9aa0a6;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 140px;
    justify-content: center;
  }
  
  .tab-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e8eaed;
    transform: translateY(-1px);
  }
  
  .tab-button.active {
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    color: #1a2332;
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
  }
  
  .tab-button.active:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(255, 215, 0, 0.4);
  }
  
  .tab-icon {
    font-size: 1.2rem;
  }
  
  .tab-label {
    font-weight: 700;
  }
  
  @media (max-width: 768px) {
    .tab-buttons {
      flex-wrap: wrap;
    }
    
    .tab-button {
      min-width: 120px;
      padding: 10px 16px;
      font-size: 0.9rem;
    }
  }
</style>

