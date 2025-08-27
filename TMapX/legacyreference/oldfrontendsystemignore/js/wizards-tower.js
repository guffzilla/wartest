/**
 * Wizard's Tower - Wiki Management
 * Handles game tab switching and content display for the Warcraft wiki
 */

class WizardsTowerManager {
  constructor() {
    this.currentGame = 'wc1';
    this.gameTabs = document.querySelectorAll('.game-tab');
    this.wikiContents = document.querySelectorAll('.wiki-content');
    
    this.init();
  }

  init() {

    
    // Set up game tab event listeners
    this.setupGameTabs();
    
    // Initialize with WC1 content
    this.switchGame('wc1');
    

  }

  setupGameTabs() {
    this.gameTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        
        const gameType = tab.getAttribute('data-game');

        
        this.switchGame(gameType);
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

    // Update active content
    this.wikiContents.forEach(content => {
      content.classList.remove('active');
      if (content.getAttribute('data-game') === gameType) {
        content.classList.add('active');
      }
    });

    this.currentGame = gameType;
    
    // Add animation effect
    this.animateContentSwitch();
    
    // Update URL hash for bookmarking
    window.location.hash = `game=${gameType}`;
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

  // Method to load additional content dynamically
  async loadGameContent(gameType) {
    
    
    // This could be expanded to load content from an API
    // For now, we'll just show a loading state
    const contentElement = document.querySelector(`.wiki-content[data-game="${gameType}"]`);
    
    if (contentElement) {
      contentElement.classList.add('loading');
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      contentElement.classList.remove('loading');
    }
  }

  // Method to search wiki content
  searchWiki(query) {
    
    
    // This could be expanded to implement search functionality
    // For now, we'll just log the search query
    const searchResults = [];
    
    // Search through all wiki cards
    const wikiCards = document.querySelectorAll('.wiki-card');
    
    wikiCards.forEach(card => {
      const title = card.querySelector('h4').textContent.toLowerCase();
      const description = card.querySelector('p').textContent.toLowerCase();
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

  // Method to get current game type
  getCurrentGame() {
    return this.currentGame;}

  // Method to get game display name
  getGameDisplayName(gameType) {
    const gameNames = {
      'wc1': 'Warcraft I',
      'wc2': 'Warcraft II', 
      'wc3': 'Warcraft III'
    };
    
    return gameNames[gameType] || gameType;}
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the Wizard's Tower page
  if (document.querySelector('.wiki-container')) {
    window.wizardsTowerManager = new WizardsTowerManager();
    
    // Handle URL hash for direct navigation
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const gameType = hashParams.get('game');
      
      if (gameType && ['wc1', 'wc2', 'wc3'].includes(gameType)) {
        window.wizardsTowerManager.switchGame(gameType);
      }
    }
  }
});

// Export for module usage
// WizardsTowerManager is available globally as window.wizardsTowerManager 