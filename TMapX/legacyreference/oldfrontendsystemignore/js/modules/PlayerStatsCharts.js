/**
 * PlayerStatsCharts.js - Chart Rendering and Visualization for Player Details
 * 
 * Extracted from the 72KB playerDetails.js monster.
 * Handles all chart creation, management, and cleanup for player statistics.
 * 
 * Responsibilities:
 * - Chart.js integration and configuration
 * - Race distribution and win rate charts
 * - Map distribution and resource charts
 * - Chart lifecycle management and cleanup
 * - Warcraft-themed chart styling
 */

export class PlayerStatsCharts {
  constructor() {
    this.activeCharts = new Map();
    this.warcraftColors = this.initializeWarcraftColors();
    this.defaultChartOptions = this.getDefaultChartOptions();
  }

  /**
   * Initialize the chart system
   */
  init() {
    console.log('📊 Initializing Player Stats Charts...');
    this.setupChartDefaults();
    this.setupGlobalFunctions();
    console.log('✅ Player Stats Charts initialized');
  }

  /**
   * Initialize Warcraft-themed color palette
   */
  initializeWarcraftColors() {
    return {
      human: {
        bg: '#4a90e2',
        border: '#357abd'
      },
      orc: {
        bg: '#e24a4a',
        border: '#bd3535'
      },
      random: {
        bg: '#a0a0a0',
        border: '#757575'
      },
      maps: [
        { bg: '#9b59b6', border: '#8e44ad' },
        { bg: '#27ae60', border: '#229954' },
        { bg: '#e74c3c', border: '#c0392b' },
        { bg: '#f39c12', border: '#e67e22' },
        { bg: '#3498db', border: '#2980b9' },
        { bg: '#1abc9c', border: '#16a085' },
        { bg: '#f1c40f', border: '#f39c12' },
        { bg: '#95a5a6', border: '#7f8c8d' }
      ],
      resources: {
        high: { bg: '#f1c40f', border: '#d4ac0d' },
        medium: { bg: '#95a5a6', border: '#7f8c8d' },
        low: { bg: '#e67e22', border: '#d35400' }
      },
      primary: '#D4AF37',
      secondary: '#64748b',
      background: 'rgba(15, 23, 42, 0.9)',
      text: '#f1f5f9',
      textSecondary: '#e2e8f0'
    };}

  /**
   * Get default chart options with Warcraft theme
   */
  getDefaultChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: this.warcraftColors.textSecondary,
            font: {
              family: 'Inter, sans-serif',
              size: 12
            },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: this.warcraftColors.background,
          titleColor: this.warcraftColors.text,
          bodyColor: this.warcraftColors.textSecondary,
          borderColor: 'rgba(148, 163, 184, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true
        }
      },
      elements: {
        arc: {
          borderWidth: 2
        },
        bar: {
          borderWidth: 2,
          borderRadius: 4
        }
      }
    };}

  /**
   * Setup Chart.js defaults
   */
  setupChartDefaults() {
    if (typeof Chart !== 'undefined') {
      Chart.defaults.color = this.warcraftColors.textSecondary;
      Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.2)';
      Chart.defaults.backgroundColor = 'rgba(212, 175, 55, 0.1)';
    }
  }

  /**
   * Setup global functions for backward compatibility
   */
  setupGlobalFunctions() {
    window.playerStatsCharts = this;
    window.cleanupCharts = () => this.cleanup();
  }

  /**
   * Create race distribution chart
   */
  createRaceDistributionChart(stats) {
    if (!stats.races) return null;console.log('📊 Creating race distribution chart');

    const raceData = [];
    const raceLabels = [];
    const raceColors = [];
    const raceBorderColors = [];

    Object.entries(stats.races).forEach(([race, count]) => {
      if (count > 0) {
        raceLabels.push(race.charAt(0).toUpperCase() + race.slice(1));
        raceData.push(count);
        
        const colorConfig = this.warcraftColors[race] || this.warcraftColors.random;
        raceColors.push(colorConfig.bg);
        raceBorderColors.push(colorConfig.border);
      }
    });

    if (raceData.length === 0) return null;const canvas = document.getElementById('raceDistributionChart');
    if (!canvas) return null;const chart = this.createChart('raceDistributionChart', {
      type: 'doughnut',
      data: {
        labels: raceLabels,
        datasets: [{
          data: raceData,
          backgroundColor: raceColors,
          borderColor: raceBorderColors,
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultChartOptions,
        plugins: {
          ...this.defaultChartOptions.plugins,
          tooltip: {
            ...this.defaultChartOptions.plugins.tooltip,
            callbacks: {
              label: (context) => {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${value} (${percentage}%)`;}
            }
          }
        }
      }
    });

    this.activeCharts.set('raceDistribution', chart);
    return chart;}

  /**
   * Create race win rate chart
   */
  createRaceWinRateChart(stats) {
    if (!stats.races || !stats.raceWins) return null;console.log('📊 Creating race win rate chart');

    const raceLabels = [];
    const winRateData = [];
    const backgroundColors = [];
    const borderColors = [];

    Object.entries(stats.races).forEach(([race, totalGames]) => {
      if (totalGames > 0) {
        const wins = stats.raceWins[race] || 0;
        const winRate = (wins / totalGames) * 100;
        
        raceLabels.push(race.charAt(0).toUpperCase() + race.slice(1));
        winRateData.push(winRate);
        
        const colorConfig = this.warcraftColors[race] || this.warcraftColors.random;
        backgroundColors.push(colorConfig.bg);
        borderColors.push(colorConfig.border);
      }
    });

    if (winRateData.length === 0) return null;const canvas = document.getElementById('raceWinRateChart');
    if (!canvas) return null;const chart = this.createChart('raceWinRateChart', {
      type: 'bar',
      data: {
        labels: raceLabels,
        datasets: [{
          label: 'Win Rate (%)',
          data: winRateData,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultChartOptions,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: 'rgba(148, 163, 184, 0.1)'
            },
            ticks: {
              color: this.warcraftColors.textSecondary,
              callback: function(value) {
                return value + '%';}
            }
          },
          x: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)'
            },
            ticks: {
              color: this.warcraftColors.textSecondary
            }
          }
        },
        plugins: {
          ...this.defaultChartOptions.plugins,
          tooltip: {
            ...this.defaultChartOptions.plugins.tooltip,
            callbacks: {
              label: (context) => {
                return `Win Rate: ${context.parsed.y.toFixed(1)}%`;}
            }
          }
        }
      }
    });

    this.activeCharts.set('raceWinRate', chart);
    return chart;}

  /**
   * Create map distribution chart
   */
  createMapDistributionChart(stats) {
    if (!stats.maps) return null;console.log('📊 Creating map distribution chart');

    // Convert maps object to array and sort by play count
    const mapArray = Object.entries(stats.maps)
      .map(([map, count]) => ({ map, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 maps

    if (mapArray.length === 0) return null;const mapLabels = mapArray.map(item => item.map);
    const mapData = mapArray.map(item => item.count);
    const mapColors = mapArray.map((_, index) => {
      const colorIndex = index % this.warcraftColors.maps.length;
      return this.warcraftColors.maps[colorIndex].bg;});
    const mapBorderColors = mapArray.map((_, index) => {
      const colorIndex = index % this.warcraftColors.maps.length;
      return this.warcraftColors.maps[colorIndex].border;});

    const canvas = document.getElementById('mapDistributionChart');
    if (!canvas) return null;const chart = this.createChart('mapDistributionChart', {
      type: 'bar',
      data: {
        labels: mapLabels,
        datasets: [{
          label: 'Games Played',
          data: mapData,
          backgroundColor: mapColors,
          borderColor: mapBorderColors,
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultChartOptions,
        indexAxis: 'y', // Horizontal bar chart
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: 'rgba(148, 163, 184, 0.1)'
            },
            ticks: {
              color: this.warcraftColors.textSecondary
            }
          },
          y: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)'
            },
            ticks: {
              color: this.warcraftColors.textSecondary,
              font: {
                size: 10
              }
            }
          }
        },
        plugins: {
          ...this.defaultChartOptions.plugins,
          tooltip: {
            ...this.defaultChartOptions.plugins.tooltip,
            callbacks: {
              label: (context) => {
                return `Played: ${context.parsed.x} times`;}
            }
          }
        }
      }
    });

    this.activeCharts.set('mapDistribution', chart);
    return chart;}

  /**
   * Create resource distribution chart
   */
  createResourceDistributionChart(stats) {
    if (!stats.resources) return null;console.log('📊 Creating resource distribution chart');

    const resourceData = [
      stats.resources.high || 0,
      stats.resources.medium || 0,
      stats.resources.low || 0
    ];

    if (resourceData.every(value => value === 0)) return null;const canvas = document.getElementById('resourceDistributionChart');
    if (!canvas) return null;const chart = this.createChart('resourceDistributionChart', {
      type: 'doughnut',
      data: {
        labels: ['High Resources', 'Medium Resources', 'Low Resources'],
        datasets: [{
          data: resourceData,
          backgroundColor: [
            this.warcraftColors.resources.high.bg,
            this.warcraftColors.resources.medium.bg,
            this.warcraftColors.resources.low.bg
          ],
          borderColor: [
            this.warcraftColors.resources.high.border,
            this.warcraftColors.resources.medium.border,
            this.warcraftColors.resources.low.border
          ],
          borderWidth: 2
        }]
      },
      options: {
        ...this.defaultChartOptions,
        plugins: {
          ...this.defaultChartOptions.plugins,
          tooltip: {
            ...this.defaultChartOptions.plugins.tooltip,
            callbacks: {
              label: (context) => {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${value} (${percentage}%)`;}
            }
          }
        }
      }
    });

    this.activeCharts.set('resourceDistribution', chart);
    return chart;}

  /**
   * Create a chart with proper error handling and fallbacks
   */
  createChart(canvasId, config) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.warn(`Canvas element '${canvasId}' not found`);
        return null;}

      // Destroy existing chart if it exists
      const existingChart = this.activeCharts.get(canvasId);
      if (existingChart) {
        existingChart.destroy();
      }

      // Check if Chart.js is available
      if (typeof Chart === 'undefined') {
        console.warn('Chart.js not available, skipping chart creation');
        this.showChartUnavailableMessage(canvas);
        return null;}

      // Use Warcraft chart utilities if available
      if (typeof window.createWarcraftChart === 'function') {
        console.log(`Using createWarcraftChart for ${canvasId}`);
        return window.createWarcraftChart(canvasId, config);}

      // Fallback to standard Chart.js
      console.log(`Using standard Chart.js for ${canvasId}`);
      return new Chart(canvas, config);} catch (error) {
      console.error(`Error creating chart ${canvasId}:`, error);
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        this.showChartErrorMessage(canvas, error.message);
      }
      return null;}
  }

  /**
   * Initialize all charts for player stats
   */
  initializeAllCharts(stats) {
    console.log('📊 Initializing all player stats charts...');

    // Wait a bit for DOM to be ready
    setTimeout(() => {
      this.createRaceDistributionChart(stats);
      this.createRaceWinRateChart(stats);
      this.createMapDistributionChart(stats);
      this.createResourceDistributionChart(stats);
      
      console.log(`✅ Charts initialized: ${this.activeCharts.size} active charts`);
    }, 100);
  }

  /**
   * Show chart unavailable message
   */
  showChartUnavailableMessage(canvas) {
    const container = canvas.parentElement;
    if (container) {
      container.innerHTML = `
        <div class="chart-unavailable">
          <i class="fas fa-chart-bar"></i>
          <p>Chart.js not available</p>
        </div>
      `;
    }
  }

  /**
   * Show chart error message
   */
  showChartErrorMessage(canvas, errorMessage) {
    const container = canvas.parentElement;
    if (container) {
      container.innerHTML = `
        <div class="chart-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Chart Error</p>
          <small>${errorMessage}</small>
        </div>
      `;
    }
  }

  /**
   * Update chart data
   */
  updateChart(chartKey, newData) {
    const chart = this.activeCharts.get(chartKey);
    if (chart && chart.data) {
      chart.data.datasets[0].data = newData;
      chart.update('none');
    }
  }

  /**
   * Resize all charts
   */
  resizeCharts() {
    this.activeCharts.forEach((chart) => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }

  /**
   * Get chart statistics
   */
  getChartStats() {
    return {
      activeCharts: this.activeCharts.size,
      chartTypes: Array.from(this.activeCharts.keys()),
      memoryUsage: this.activeCharts.size * 50 // Rough estimate in KB
    };}

  /**
   * Clean up all charts and free memory
   */
  cleanup() {
    console.log('🧹 Cleaning up Player Stats Charts...');
    
    // Destroy all active charts
    this.activeCharts.forEach((chart, key) => {
      if (chart && typeof chart.destroy === 'function') {
        console.log(`Destroying chart: ${key}`);
        chart.destroy();
      }
    });

    // Clear the map
    this.activeCharts.clear();

    // Clear global references
    if (window.raceDistributionChart) window.raceDistributionChart = null;
    if (window.raceWinRateChart) window.raceWinRateChart = null;
    if (window.mapDistributionChart) window.mapDistributionChart = null;
    if (window.resourceDistributionChart) window.resourceDistributionChart = null;

    console.log('✅ Player Stats Charts cleanup complete');
  }

  /**
   * Add chart styles to the page
   */
  setupChartStyles() {
    if (document.getElementById('player-charts-styles')) return;const styles = document.createElement('style');
    styles.id = 'player-charts-styles';
    styles.textContent = `
      .chart-container {
        position: relative;
        height: 300px;
        margin: 20px 0;
        background: rgba(51, 65, 85, 0.3);
        border-radius: 8px;
        padding: 20px;
        border: 1px solid rgba(148, 163, 184, 0.2);
      }

      .chart-unavailable,
      .chart-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #94a3b8;
        text-align: center;
      }

      .chart-unavailable i,
      .chart-error i {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.5;
      }

      .chart-unavailable p,
      .chart-error p {
        font-size: 16px;
        margin: 0 0 10px 0;
        font-weight: 500;
      }

      .chart-error small {
        font-size: 12px;
        opacity: 0.7;
      }

      .race-chart-container {
        flex: 1;
        min-height: 250px;
      }

      .stats-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-top: 20px;
      }

      .stats-column h4 {
        color: #D4AF37;
        margin-bottom: 15px;
        font-size: 16px;
      }

      .stats-table table {
        width: 100%;
        border-collapse: collapse;
      }

      .stats-table th,
      .stats-table td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }

      .stats-table th {
        background: rgba(212, 175, 55, 0.1);
        color: #D4AF37;
        font-weight: 600;
        font-size: 14px;
      }

      .stats-table td {
        color: #e2e8f0;
        font-size: 13px;
      }

      .stats-table .no-data {
        text-align: center;
        padding: 20px;
        color: #94a3b8;
        font-style: italic;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Create and export singleton instance
export const playerStatsCharts = new PlayerStatsCharts(); 