/**
 * SettingsManager - Handles application settings and preferences
 */
export class SettingsManager {
  constructor() {
    this.settings = {};
    this.initialized = false;
    this.storageKey = 'warcraftArenaSettings';
  }

  async init() {
    try {
      await this.loadSettings();
      this.initialized = true;
      console.log('✅ SettingsManager initialized');
    } catch (error) {
      console.error('❌ SettingsManager initialization failed:', error);
      this.initialized = true; // Still mark as initialized
    }
  }

  async loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.settings = JSON.parse(stored);
      } else {
        // Set default settings
        this.settings = {
          gameDetection: {
            autoStart: true,
            detectClassicGames: true,
            detectRemasteredGames: true
          },
          screenshots: {
            autoCapture: true,
            quality: 'high',
            format: 'png'
          },
          notifications: {
            matchResults: true,
            achievements: true,
            chat: true
          },
          privacy: {
            shareStats: true,
            publicProfile: true
          }
        };
        await this.saveSettings();
      }
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
      this.settings = {};
    }
  }

  async saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      this.dispatchSettingsEvent('settingsChanged', this.settings);
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
    }
  }

  getSetting(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.settings;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;}
    }
    
    return value;}

  async setSetting(key, value) {
    const keys = key.split('.');
    let current = this.settings;
    
    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    // Set the final value
    current[keys[keys.length - 1]] = value;
    
    await this.saveSettings();
  }

  getAll() {
    return { ...this.settings };}

  async reset() {
    this.settings = {};
    localStorage.removeItem(this.storageKey);
    await this.loadSettings(); // This will load defaults
  }

  dispatchSettingsEvent(type, data) {
    window.dispatchEvent(new CustomEvent('settingsChange', {
      detail: { type, data, settings: this.settings }
    }));
  }

  isInitialized() {
    return this.initialized;}
}

export default SettingsManager; 