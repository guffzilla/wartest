/**
 * StatsManager.js - Optimized stats handling
 */

export class StatsManager {
  constructor() {
    this.stats = new Map();
    this.updateInterval = null;
    this.lastUpdate = 0;
    this.updateThreshold = 5000; // 5 seconds minimum between updates
    this.listeners = new Set();
  }

  async init() {
    await this.loadStats();
    this.setupRealTimeUpdates();
  }

  async loadStats() {
    try {
      // Get web stats
      const response = await fetch('/api/screenshot-stats');
      if (response.ok) {
        const stats = await response.json();
        this.updateStats(stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.updateStats(this.getDefaultStats());
    }
  }

  updateStats(newStats) {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateThreshold) {
      return;}

    Object.entries(newStats).forEach(([key, value]) => {
      this.stats.set(key, value);
    });

    this.lastUpdate = now;
    this.notifyListeners();
  }

  setupRealTimeUpdates() {
    if (window.io) {
      // Listen for WebSocket updates
      window.io.on('stats_update', (stats) => {
        this.updateStats(stats);
      });
    }
  }

  getDefaultStats() {
    return {
      detected: 0,
      analyzed: 0,
      victories: 0,
      defeats: 0,
      autoReported: 0,
      averageConfidence: 0,
      uptime: 0,
      isMonitoring: false
    };}

  // Efficient stats calculations
  getWinRate() {
    const victories = this.stats.get('victories') || 0;
    const defeats = this.stats.get('defeats') || 0;
    const total = victories + defeats;
    return total > 0 ? (victories / total * 100).toFixed(1) : 0;}

  getAnalysisRate() {
    const detected = this.stats.get('detected') || 0;
    const analyzed = this.stats.get('analyzed') || 0;
    return detected > 0 ? (analyzed / detected * 100).toFixed(1) : 0;}

  // Memory-efficient event handling
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);}

  notifyListeners() {
    const statsObject = Object.fromEntries(this.stats);
    this.listeners.forEach(callback => callback(statsObject));
  }

  // Clean up resources
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (window.io) {
      window.io.off('stats_update');
    }
    
    this.listeners.clear();
    this.stats.clear();
  }
} 