/**
 * Enhanced Wizard's Tower - Wiki Management with Images
 * Handles game tab switching, content display, and image loading for the Warcraft wiki
 */

// Import centralized logger utility
import logger from '/js/utils/logger.js';

class EnhancedWizardsTowerManager {
  constructor() {
    this.currentGame = 'wc1';
    this.currentRace = 'human';
    this.currentCategory = 'units';
    this.imageManifest = null;
    this.gameTabs = document.querySelectorAll('.game-tab');
    this.subTabs = document.querySelectorAll('.sub-tab');
    this.wikiContents = document.querySelectorAll('.wiki-content');
    
    this.init();
  }

  async init() {
    // Initializing Enhanced Wizard's Tower...
    
    // Load image manifest
    await this.loadImageManifest();
    
    // Set up event listeners
    this.setupGameTabs();
    this.setupSubTabs();
    
    // Initialize with WC1 content
    this.switchGame('wc1');
    
    // Enhanced Wizard's Tower initialized
  }

  async loadImageManifest() {
    try {
      const response = await fetch('/assets/img/wizards-tower/image-manifest.json');
      this.imageManifest = await response.json();
      // Image manifest loaded
    } catch (error) {
      logger.warn('Could not load image manifest, using fallback mode');
      this.imageManifest = {};
    }
  }

  setupGameTabs() {
    this.gameTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const gameType = tab.getAttribute('data-game');
        // Game tab clicked
        this.switchGame(gameType);
      });
    });
  }

  setupSubTabs() {
    this.subTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const race = tab.getAttribute('data-subtab');
        // Sub-tab clicked
        this.switchRace(race);
      });
    });
  }

  switchGame(gameType) {
    // Update active tab
    this.gameTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.getAttribute('data-game') === gameType) {
        tab.classList.add('active');
      }
    });

    // Update active wiki-content
    document.querySelectorAll('.wiki-content').forEach(content => {
      content.classList.remove('active');
      if (content.getAttribute('data-game') === gameType) {
        content.classList.add('active');
      }
    });

    // Update active sub-tabs
    document.querySelectorAll('.sub-tabs').forEach(subTabs => {
      subTabs.classList.remove('active');
      if (subTabs.getAttribute('data-game') === gameType) {
        subTabs.classList.add('active');
      }
    });

    // Update active game-content
    document.querySelectorAll('.game-content').forEach(content => {
      content.classList.remove('active');
      if (content.getAttribute('data-game') === gameType) {
        content.classList.add('active');
      }
    });

    this.currentGame = gameType;

    // Default to first sub-tab for this game
    const firstSubTab = document.querySelector(`.sub-tabs[data-game="${gameType}"] .sub-tab`);
    if (firstSubTab) {
      this.switchRace(firstSubTab.getAttribute('data-subtab'));
    }

    // Load content for the new game
    this.loadGameContent(gameType);
    this.animateContentSwitch();
    window.location.hash = `game=${gameType}`;
  }

  switchRace(race) {
    // Update active sub-tab
    const currentSubTabs = document.querySelector(`.sub-tabs[data-game="${this.currentGame}"].active`);
    if (currentSubTabs) {
      currentSubTabs.querySelectorAll('.sub-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-subtab') === race) {
          tab.classList.add('active');
        }
      });
    }

    // Update active sub-content
    const currentWikiContent = document.querySelector(`.wiki-content[data-game="${this.currentGame}"].active`);
    if (currentWikiContent) {
      currentWikiContent.querySelectorAll('.sub-content').forEach(content => {
        content.classList.remove('active');
        if (content.getAttribute('data-subtab') === race) {
          content.classList.add('active');
        }
      });
    }

    this.currentRace = race;
    this.loadRaceContent(race);
  }

  async loadGameContent(gameType) {
    // Loading content for gameType...
    
    // Show loading indicator
    this.showLoadingIndicator();
    
    // Load units and buildings for the current race
    await this.loadRaceContent(this.currentRace);
    
    // Hide loading indicator
    this.hideLoadingIndicator();
  }

  async loadRaceContent(race) {
    // Loading race content for currentGame...
    
    // Load units
    await this.loadCategoryContent('units', race);
    
    // Load buildings
    await this.loadCategoryContent('buildings', race);
  }

  async loadCategoryContent(category, race) {
    const containerId = `${this.currentGame}-${race}-${category}`;
    const container = document.getElementById(containerId);
    if (!container) {
      logger.warn(`Container not found: ${containerId}`);
      return;}
    
    // Fetch from enhanced wiki API that includes edit information
    const type = category.slice(0, -1); // 'units' -> 'unit', 'buildings' -> 'building'
    const url = `/api/wiki/units/${this.currentGame}/${race}?type=${type}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      const items = (data.success && data.data) ? data.data : [];
      
      container.innerHTML = '';
      
      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-scroll"></i>
            <p>No ${category} found for ${race} in ${this.currentGame.toUpperCase()}.</p>
            <small>Be the first to contribute knowledge!</small>
          </div>
        `;
        return;}
      
      for (const item of items) {
        const card = this.createWikiCard(item, category, race);
        container.appendChild(card);
      }
      
      // Loaded items.length category for race in currentGame
    } catch (error) {
      logger.error(`Error loading ${category} for ${race}`, error);
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error loading ${category} from server.</p>
          <button onclick="location.reload()" class="retry-btn">Retry</button>
        </div>
      `;
    }
  }

  createWikiCard(item, category, race) {
    const card = document.createElement('div');
    card.className = 'wiki-card wiki-unit-card';
    card.setAttribute('data-unit-id', item._id);
    card.setAttribute('data-game', this.currentGame);
    card.setAttribute('data-race', race);
    
    // Get image path
    const imagePath = this.getImagePath(item.name, category, race);
    
    // Format costs for display
    const costParts = [];
    if (item.costs) {
      if (item.costs.gold) costParts.push(`${item.costs.gold} Gold`);
      if (item.costs.wood) costParts.push(`${item.costs.wood} Wood`);
      if (item.costs.food) costParts.push(`${item.costs.food} Food`);
      if (item.costs.oil) costParts.push(`${item.costs.oil} Oil`);
    }
    const costDisplay = costParts.length > 0 ? costParts.join(', ') : '';
    
    // Format stats for display
    const statsDisplay = [];
    if (item.stats) {
      if (item.stats.hp) statsDisplay.push(`HP: ${item.stats.hp}`);
      if (item.stats.mana) statsDisplay.push(`Mana: ${item.stats.mana}`);
      if (item.stats.attack) statsDisplay.push(`Attack: ${item.stats.attack}`);
      if (item.stats.armor) statsDisplay.push(`Armor: ${item.stats.armor}`);
      if (item.stats.range) statsDisplay.push(`Range: ${item.stats.range}`);
    }
    
    card.innerHTML = `
      <div class="wiki-card-image">
        <img src="${imagePath}" alt="${item.name}" onerror="this.src='/assets/img/default-unit.png'">
        ${item.editInfo && item.editInfo.pendingEdits > 0 ? 
          `<div class="pending-edits-badge" title="${item.editInfo.pendingEdits} pending edits">
            <i class="fas fa-clock"></i> ${item.editInfo.pendingEdits}
          </div>` : ''
        }
      </div>
      <div class="wiki-card-content">
        <div class="wiki-card-header">
          <h4 class="wiki-card-title">${item.name}</h4>
          <div class="wiki-card-actions">
            <button class="wiki-edit-btn" data-game-unit-id="${item._id}" title="Edit this entry">
              <i class="fas fa-edit"></i>
            </button>
            <button class="wiki-history-btn" data-game-unit-id="${item._id}" title="View edit history">
              <i class="fas fa-history"></i>
            </button>
          </div>
        </div>
        <p class="wiki-card-description">${item.description || 'No description available.'}</p>
        
        ${costDisplay ? `
          <div class="wiki-card-costs">
            <span class="cost-label"><i class="fas fa-coins"></i> Cost:</span>
            <span class="cost-value">${costDisplay}</span>
          </div>
        ` : ''}
        
        ${statsDisplay.length > 0 ? `
          <div class="wiki-card-stats">
            ${statsDisplay.map(stat => `<div class="stat">${stat}</div>`).join('')}
          </div>
        ` : ''}
        
        ${item.abilities && item.abilities.length > 0 ? `
          <div class="wiki-card-abilities">
            <span class="abilities-label"><i class="fas fa-magic"></i> Abilities:</span>
            <div class="abilities-list">
              ${item.abilities.slice(0, 2).map(ability => 
                `<span class="ability" title="${ability.description || ''}">${ability.name}</span>`
              ).join('')}
              ${item.abilities.length > 2 ? `<span class="ability-more">+${item.abilities.length - 2} more</span>` : ''}
            </div>
          </div>
        ` : ''}
        
        ${item.editInfo ? `
          <div class="wiki-card-footer">
            <small class="last-updated">
              <i class="fas fa-clock"></i> 
              Updated ${new Date(item.lastUpdated || item.editInfo.lastUpdated).toLocaleDateString()}
            </small>
            ${item.editInfo.recentEdits > 0 ? 
              `<small class="recent-activity">
                <i class="fas fa-users-edit"></i> ${item.editInfo.recentEdits} recent edits
              </small>` : ''
            }
          </div>
        ` : ''}
      </div>
    `;
    
    return card;}

  getImagePath(itemName, category, race) {
    // Try to get image from manifest
    if (this.imageManifest && 
        this.imageManifest[this.currentGame] && 
        this.imageManifest[this.currentGame][category] && 
        this.imageManifest[this.currentGame][category][race]) {
      
      const items = this.imageManifest[this.currentGame][category][race];
      const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
      
      if (item) {
        return `/assets/img/wizards-tower/${item.path}`;}
    }
    
    // Fallback to default image
    return `/assets/img/default-${category.slice(0, -1)}.png`;}

  showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }
  }

  hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }

  animateContentSwitch() {
    const activeContent = document.querySelector(`.wiki-content[data-game="${this.currentGame}"]`);
    
    if (activeContent) {
      // Add fade-in animation
      activeContent.style.opacity = '0';
      activeContent.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        activeContent.style.transition = 'all 0.3s ease-in-out';
        activeContent.style.opacity = '1';
        activeContent.style.transform = 'translateY(0)';
      }, 50);
    }
  }

  // Method to search wiki content
  searchWiki(query) {
    // Searching for query
    
    const searchResults = [];
    const wikiCards = document.querySelectorAll('.wiki-card');
    
    wikiCards.forEach(card => {
      const title = card.querySelector('.wiki-card-title').textContent.toLowerCase();
      const description = card.querySelector('.wiki-card-description').textContent.toLowerCase();
      const searchTerm = query.toLowerCase();
      
      if (title.includes(searchTerm) || description.includes(searchTerm)) {
        searchResults.push(card);
      }
    });
    
    return searchResults;}

  // Method to highlight search results
  highlightSearchResults(results) {
    // Remove previous highlights
    document.querySelectorAll('.wiki-card').forEach(card => {
      card.style.borderColor = '';
      card.style.backgroundColor = '';
    });
    
    // Highlight search results
    results.forEach(card => {
      card.style.borderColor = 'var(--primary-gold)';
      card.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // DOMContentLoaded fired for Wizards Tower
  // Check if we're on the Wizard's Tower page
  if (document.querySelector('.wizards-tower-container')) {
    // Initializing EnhancedWizardsTowerManager
    window.enhancedWizardsTowerManager = new EnhancedWizardsTowerManager();
    
    // Handle URL hash for direct navigation
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const gameType = hashParams.get('game');
      
      if (gameType && ['wc1', 'wc2', 'wc3'].includes(gameType)) {
        // URL hash detected, switching game
        window.enhancedWizardsTowerManager.switchGame(gameType);
      }
    }
  } else {
    // Not on Wizards Tower page, skipping EnhancedWizardsTowerManager init
  }
});

// Export for module usage
// EnhancedWizardsTowerManager is available globally as window.enhancedWizardsTowerManager 