/**
 * LadderStats Module
 * Handles ladder statistics loading, display, and charts creation
 */

class LadderStats {
  constructor() {
    this.ladderAPI = null;
    this.chartInstances = {};
    this.currentGameType = 'warcraft2';
  }

  /**
   * Initialize the ladder stats system
   */
  init() {
    // Get the API instance from window (set by ModernLadderPage)
    this.ladderAPI = window.ladderAPI || new LadderAPI();
    console.log('📊 LadderStats module initialized');
  }

  /**
   * Set current game type
   */
  setGameType(gameType) {
    this.currentGameType = gameType;
  }

  /**
   * Load and display global ladder statistics
   */
  async loadGlobalStats(gameType = null) {
    const targetGameType = gameType || this.currentGameType;
    const statsContainer = document.getElementById('stats-container');

    if (!statsContainer) {
      console.warn('Stats container not found');
      return;}

    try {
      console.log('📈 Loading global stats for game type:', targetGameType);
      
      // Show loading indicator
      statsContainer.innerHTML = '<div class="loading">Loading statistics...</div>';

      // Fetch global stats from API
      let stats;
      if (this.ladderAPI && typeof this.ladderAPI.loadGlobalStats === 'function') {
        stats = await this.ladderAPI.loadGlobalStats(targetGameType);
      } else {
        // Fallback to direct API call
        const response = await fetch(`/api/matches/stats?gameType=${targetGameType}`);
        if (!response.ok) {
          throw new Error('Failed to fetch global statistics');
        }
        stats = await response.json();
      }

      console.log('📊 Received stats data:', stats);

      // Clear loading message
      statsContainer.innerHTML = '';

      // Create statistics cards
      this.createStatisticsCards(stats, statsContainer);

      // Create charts
      this.createCharts(stats);

      console.log('✅ Global stats loaded successfully');
    } catch (error) {
      console.error('❌ Error loading global stats:', error);
      statsContainer.innerHTML = `
        <div class="error">
          Failed to load statistics. Please try again later.
          <br>
          <small>Error details: ${error.message}</small>
        </div>
      `;
    }
  }

  /**
   * Create statistics cards
   */
  createStatisticsCards(stats, container) {
    console.log('📊 Creating statistics cards with data:', stats);
    
    // Instead of creating new cards, update existing ones
    this.updateMatchTypesStats(stats);
    this.updateMapsStats(stats);
    this.updateRacesStats(stats);
    this.updateResourcesStats(stats);
  }

  /**
   * Update match types statistics
   */
  updateMatchTypesStats(stats) {
    const modesList = document.getElementById('modes-stats-list');
    if (!modesList) return;const matchTypes = Array.isArray(stats.matchTypes) ? stats.matchTypes : [];
    console.log('📊 Updating match types:', matchTypes);

    // Create mapping for display names
    const typeDisplayNames = {
      '1v1': '1v1',
      '2v2': '2v2', 
      '3v3': '3v3',
      '4v4': '4v4',
      'ffa': 'FFA'
    };

    // Update existing list items
    const listItems = modesList.querySelectorAll('li');
    listItems.forEach((item, index) => {
      const nameSpan = item.querySelector('.stats-item-name');
      const valueSpan = item.querySelector('.stats-item-value');
      
      if (nameSpan && valueSpan) {
        const modeName = nameSpan.textContent;
        const matchingType = matchTypes.find(type => 
          type.type === modeName || 
          type.type === modeName.toLowerCase() ||
          typeDisplayNames[type.type] === modeName
        );
        
        if (matchingType) {
          valueSpan.textContent = matchingType.count || 0;
        }
      }
    });
  }

  /**
   * Update maps statistics
   */
  updateMapsStats(stats) {
    const mapsList = document.getElementById('maps-stats-list');
    if (!mapsList) return;let mapItems = [];
    if (Array.isArray(stats.maps)) {
      mapItems = stats.maps.slice(0, 5); // Top 5 maps
    }

    console.log('📊 Updating maps:', mapItems);

    if (mapItems.length > 0) {
      mapsList.innerHTML = mapItems.map(item => `
        <li>
          <span class="stats-item-name">${item.name || 'Unknown'}</span>
          <span class="stats-item-value">${item.count || 0}</span>
        </li>
      `).join('');
    }
  }

  /**
   * Update races statistics
   */
  updateRacesStats(stats) {
    const racesList = document.getElementById('race-stats-list');
    if (!racesList) return;const races = Array.isArray(stats.races) ? stats.races : [];
    console.log('📊 Updating races:', races);

    // Create mapping for display names
    const raceDisplayNames = {
      'human': 'Human',
      'orc': 'Orc',
      'random': 'Random'
    };

    // Update existing list items
    const listItems = racesList.querySelectorAll('li');
    listItems.forEach((item) => {
      const nameSpan = item.querySelector('.stats-item-name');
      const valueSpan = item.querySelector('.stats-item-value');
      
      if (nameSpan && valueSpan) {
        const raceName = nameSpan.textContent.toLowerCase();
        const matchingRace = races.find(race => 
          race.race === raceName || 
          raceDisplayNames[race.race] === nameSpan.textContent
        );
        
        if (matchingRace) {
          valueSpan.textContent = matchingRace.count || 0;
        }
      }
    });
  }

  /**
   * Update resources statistics  
   */
  updateResourcesStats(stats) {
    const resourcesList = document.getElementById('resources-stats-list');
    if (!resourcesList) return;const resources = Array.isArray(stats.resources) ? stats.resources : [];
    console.log('📊 Updating resources:', resources);

    // Update existing list items
    const listItems = resourcesList.querySelectorAll('li');
    listItems.forEach((item) => {
      const nameSpan = item.querySelector('.stats-item-name');
      const valueSpan = item.querySelector('.stats-item-value');
      
      if (nameSpan && valueSpan) {
        const resourceName = nameSpan.textContent.toLowerCase();
        const matchingResource = resources.find(resource => 
          resource.level === resourceName || 
          resource.level === nameSpan.textContent.toLowerCase()
        );
        
        if (matchingResource) {
          valueSpan.textContent = matchingResource.count || 0;
        }
      }
    });
  }

  /**
   * Create charts for global statistics
   * @param {Object} stats - Global statistics data
   */
  createCharts(stats) {
    try {
      console.log('📈 Creating charts for statistics');

      // Check if Chart.js is available
      if (typeof Chart === 'undefined') {
        console.warn('Chart.js not available, skipping chart creation');
        return;}

      // Destroy existing charts to prevent canvas reuse errors
      this.destroyExistingCharts();

      // Define Warcraft-style colors
      const chartColors = {
        blue: '#4a90e2',
        red: '#e24a4a',
        green: '#4ae24a',
        purple: '#9a4ae2',
        orange: '#e2a44a',
        teal: '#4ae2e2',
        pink: '#e24a9a',
        gray: '#a0a0a0'
      };

      // Common chart options
      const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#d8dee9',
              font: {
                size: 12
              }
            }
          }
        }
      };

      // Create individual charts
      this.createMatchTypesChart(stats, chartColors, commonOptions);
      this.createRacesChart(stats, chartColors, commonOptions);
      this.createMapsChart(stats, chartColors, commonOptions);
      this.createResourcesChart(stats, chartColors, commonOptions);

      console.log('✅ Charts created successfully');
    } catch (error) {
      console.error('❌ Error creating charts:', error);
    }
  }

  /**
   * Destroy existing chart instances
   */
  destroyExistingCharts() {
    Object.keys(this.chartInstances).forEach(key => {
      if (this.chartInstances[key]) {
        this.chartInstances[key].destroy();
        this.chartInstances[key] = null;
      }
    });
  }

  /**
   * Create match types chart
   */
  createMatchTypesChart(stats, chartColors, commonOptions) {
    const matchTypesCtx = document.getElementById('match-types-chart')?.getContext('2d');
    if (!matchTypesCtx) return;const matchTypesData = Array.isArray(stats.matchTypes) ? stats.matchTypes : [];

    // Prepare data for chart
    const matchTypeLabels = matchTypesData.map(item => item.type || 'Unknown');
    const matchTypeCounts = matchTypesData.map(item => item.count || 0);
    const matchTypeColors = [
      chartColors.blue,
      chartColors.red,
      chartColors.green,
      chartColors.purple,
      chartColors.orange,
      chartColors.teal
    ];

    this.chartInstances.matchTypes = new Chart(matchTypesCtx, {
      type: 'pie',
      data: {
        labels: matchTypeLabels,
        datasets: [{
          data: matchTypeCounts,
          backgroundColor: matchTypeColors,
          borderColor: 'rgba(30, 30, 30, 0.8)',
          borderWidth: 1
        }]
      },
      options: commonOptions
    });

    console.log('📊 Match types chart created');
  }

  /**
   * Create races chart
   */
  createRacesChart(stats, chartColors, commonOptions) {
    const racesCtx = document.getElementById('races-chart')?.getContext('2d');
    if (!racesCtx) return;const raceItems = Array.isArray(stats.races) ? stats.races : [];

    // Format race names
    const raceNames = {
      'human': 'Human',
      'orc': 'Orc',
      'random': 'Random'
    };

    // Prepare data for chart
    const raceLabels = raceItems.map(item => raceNames[item.race] || item.race || 'Unknown');
    const raceCounts = raceItems.map(item => item.count || 0);
    const raceColors = {
      'Human': chartColors.blue,
      'Orc': chartColors.red,
      'Random': chartColors.gray
    };

    this.chartInstances.races = new Chart(racesCtx, {
      type: 'doughnut',
      data: {
        labels: raceLabels,
        datasets: [{
          data: raceCounts,
          backgroundColor: raceLabels.map(label => raceColors[label] || chartColors.gray),
          borderColor: 'rgba(30, 30, 30, 0.8)',
          borderWidth: 1
        }]
      },
      options: commonOptions
    });

    console.log('📊 Races chart created');
  }

  /**
   * Create maps chart
   */
  createMapsChart(stats, chartColors, commonOptions) {
    const mapsCtx = document.getElementById('maps-chart')?.getContext('2d');
    if (!mapsCtx) return;const mapItems = Array.isArray(stats.maps) ? stats.maps : [];

    // Prepare data for chart
    const mapLabels = mapItems.slice(0, 5).map(item => item.name || 'Unknown');
    const mapCounts = mapItems.slice(0, 5).map(item => item.count || 0);

    this.chartInstances.maps = new Chart(mapsCtx, {
      type: 'bar',
      data: {
        labels: mapLabels,
        datasets: [{
          label: 'Games Played',
          data: mapCounts,
          backgroundColor: chartColors.blue,
          borderColor: 'rgba(30, 30, 30, 0.8)',
          borderWidth: 1
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#d8dee9'
            },
            grid: {
              color: 'rgba(80, 80, 80, 0.2)'
            }
          },
          x: {
            ticks: {
              color: '#d8dee9'
            },
            grid: {
              color: 'rgba(80, 80, 80, 0.2)'
            }
          }
        }
      }
    });

    console.log('📊 Maps chart created');
  }

  /**
   * Create resources chart
   */
  createResourcesChart(stats, chartColors, commonOptions) {
    const resourcesCtx = document.getElementById('resources-chart')?.getContext('2d');
    if (!resourcesCtx) return;const resourceItems = Array.isArray(stats.resources) ? stats.resources : [];

    // Format resource level names
    const resourceNames = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };

    // Prepare data for chart
    const resourceLabels = resourceItems.map(item => resourceNames[item.level] || item.level || 'Unknown');
    const resourceCounts = resourceItems.map(item => item.count || 0);
    const resourceColors = {
      'High': chartColors.green,
      'Medium': chartColors.orange,
      'Low': chartColors.red
    };

    this.chartInstances.resources = new Chart(resourcesCtx, {
      type: 'pie',
      data: {
        labels: resourceLabels,
        datasets: [{
          data: resourceCounts,
          backgroundColor: resourceLabels.map(label => resourceColors[label] || chartColors.gray),
          borderColor: 'rgba(30, 30, 30, 0.8)',
          borderWidth: 1
        }]
      },
      options: commonOptions
    });

    console.log('📊 Resources chart created');
  }

  /**
   * Refresh stats for current or specified game type
   */
  async refreshStats(gameType = null) {
    const targetGameType = gameType || this.currentGameType;
    await this.loadGlobalStats(targetGameType);
  }

  /**
   * Get chart instances for external access
   */
  getChartInstances() {
    return this.chartInstances;}
}

// Export for use in other modules
window.LadderStats = LadderStats;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (!window.ladderStats) {
    window.ladderStats = new LadderStats();
  }
}); 