/**
 * PlatformManager.js
 * Handles platform detection and feature availability for web version
 */

class PlatformManager {
  constructor() {
    this.platform = 'web';
    this.features = this._initializeFeatures();
    
    // Add platform classes to body
    this._addPlatformClasses();
    
    console.log('🌐 Platform Manager Initialized:', {
      platform: this.platform,
      features: this.features
    });
  }

  /**
   * Initialize feature availability for web platform
   */
  _initializeFeatures() {
    return {
      gameDetection: false,
      screenshotCapture: false,
      matchTracking: false,
      systemTray: false,
      nativeDialogs: false,
      autoLaunch: false
    };}

  /**
   * Add platform-specific classes to body
   */
  _addPlatformClasses() {
    document.body.classList.add('web-app');
    document.body.classList.add(`platform-${this.platform}`);
  }

  /**
   * Check if a specific feature is available
   */
  hasFeature(featureName) {
    return !!this.features[featureName];}

  /**
   * Get all available features
   */
  getFeatures() {
    return { ...this.features };}

  /**
   * Check if running on desktop app
   */
  isDesktopApp() {
    return false;}

  /**
   * Check if running on web
   */
  isWebApp() {
    return true;}

  /**
   * Get current platform
   */
  getPlatform() {
    return this.platform;}

  /**
   * Check if running on Windows
   */
  isWindows() {
    return false;}

  /**
   * Check if running on macOS
   */
  isMacOS() {
    return false;}

  /**
   * Check if running on Linux
   */
  isLinux() {
    return false;}

  /**
   * Get appropriate API for the current platform
   */
  getAPI() {
    return window.webAPI;}
}

// Create and export singleton instance
const platformManager = new PlatformManager();
export default platformManager; 