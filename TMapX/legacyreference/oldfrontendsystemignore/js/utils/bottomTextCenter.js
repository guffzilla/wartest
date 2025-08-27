/**
 * Bottom Text Center Utility
 * Helps center text at the bottom of the screen
 */

class BottomTextCenter {
  constructor() {
    this.init();
  }

  init() {
    // Load the CSS if not already loaded
    this.loadCSS();
  }

  loadCSS() {
    // Check if CSS is already loaded
    if (!document.querySelector('link[href*="bottom-text-center.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/bottom-text-center.css';
      document.head.appendChild(link);
    }
  }

  /**
   * Center text at the bottom of the screen
   * @param {string} text - The text to display
   * @param {string} id - Optional ID for the element
   * @returns {HTMLElement} The created element
   */
  centerText(text, id = null) {
    // Remove any existing bottom text
    this.removeText();const element = document.createElement('div');
    element.className = 'bottom-text-center';
    element.textContent = text;
    
    if (id) {
      element.id = id;
    }

    // Add to body
    document.body.appendChild(element);

    return element;}

  /**
   * Remove the bottom text
   */
  removeText() {
    const existing = document.querySelector('.bottom-text-center');
    if (existing) {
      existing.remove();
    }
  }

  /**
   * Update existing bottom text
   * @param {string} text - New text to display
   */
  updateText(text) {
    const existing = document.querySelector('.bottom-text-center');
    if (existing) {
      existing.textContent = text;
    } else {
      this.centerText(text);
    }
  }

  /**
   * Show text temporarily
   * @param {string} text - Text to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  showTemporary(text, duration = 3000) {
    const element = this.centerText(text);
    
    setTimeout(() => {
      this.removeText();
    }, duration);

    return element;}
}

// Create global instance
window.bottomTextCenter = new BottomTextCenter();

// Example usage:
// window.bottomTextCenter.centerText("Log Cabin Trading Post");
// window.bottomTextCenter.showTemporary("Log Cabin Trading Post", 5000);
// window.bottomTextCenter.removeText(); 