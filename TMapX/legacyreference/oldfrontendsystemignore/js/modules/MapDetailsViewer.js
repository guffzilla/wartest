/**
 * MapDetailsViewer.js - Interactive Map Details Viewer
 * 
 * Displays maps with hover functionality over goldmines and starting positions.
 * Uses strategic thumbnails and shows detailed information on hover.
 */

export class MapDetailsViewer {
  constructor() {
    this.currentMap = null;
    this.tooltip = null;
    this.initTooltip();
  }

  /**
   * Initialize tooltip element
   */
  initTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'map-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    document.body.appendChild(this.tooltip);
  }

  /**
   * Display map with interactive overlays
   */
  displayMap(mapData, containerSelector) {
    this.currentMap = mapData;
    const container = document.querySelector(containerSelector);
    
    if (!container) {
      console.error('Map container not found:', containerSelector);
      return;}

    // Use the strategic thumbnail path from the database, with fallback
    let strategicThumbnailUrl = mapData.strategicThumbnailPath || mapData.thumbnailPath;
    
    // If neither path is available, construct fallback URL
    if (!strategicThumbnailUrl) {
      const strategicThumbnailName = `${mapData.name.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase()}_strategic.png`;
      strategicThumbnailUrl = `/uploads/thumbnails/${strategicThumbnailName}`;
    }
    
    container.innerHTML = `
      <div class="interactive-map-container">
        <div class="map-image-wrapper" style="position: relative; display: inline-block;">
          <img src="${strategicThumbnailUrl}" 
               alt="${mapData.name}" 
               class="strategic-map-image"
               style="display: block; max-width: 100%; height: auto; border-radius: 8px;">
          <div class="interactive-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
        </div>
        <div class="map-legend">
          <h4>Interactive Elements:</h4>
          <div class="legend-items">
            <div class="legend-item">
              <span class="legend-icon goldmine-icon" style="background: #FFD700;"></span>
              <span>Goldmines (hover for details)</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon player-icon" style="background: #FF0000;"></span>
              <span>Starting Positions (hover for info)</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wait for image to load before setting up overlays
    const mapImage = container.querySelector('.strategic-map-image');
    mapImage.onload = () => {
      this.setupInteractiveOverlays(container, mapData);
    };

    // If image is already loaded
    if (mapImage.complete) {
      this.setupInteractiveOverlays(container, mapData);
    }
  }

  /**
   * Setup interactive overlay elements
   */
  setupInteractiveOverlays(container, mapData) {
    const mapImage = container.querySelector('.strategic-map-image');
    const overlay = container.querySelector('.interactive-overlay');
    
    if (!mapImage || !overlay) return;overlay.innerHTML = '';

    // Get image dimensions and scaling
    const imageRect = mapImage.getBoundingClientRect();
    const imageWidth = mapImage.naturalWidth || mapImage.width;
    const imageHeight = mapImage.naturalHeight || mapImage.height;
    const displayWidth = mapImage.offsetWidth;
    const displayHeight = mapImage.offsetHeight;
    
    const scaleX = displayWidth / imageWidth;
    const scaleY = displayHeight / imageHeight;

    console.log('Map dimensions:', { imageWidth, imageHeight, displayWidth, displayHeight, scaleX, scaleY });

    // Add goldmine hover areas
    if (mapData.strategicAnalysis?.goldmines) {
      mapData.strategicAnalysis.goldmines.forEach((goldmine, index) => {
        this.createGoldmineHoverArea(overlay, goldmine, scaleX, scaleY, index);
      });
    }

    // Add starting position hover areas
    if (mapData.strategicAnalysis?.startingPositions) {
      mapData.strategicAnalysis.startingPositions.forEach((position, index) => {
        this.createStartingPositionHoverArea(overlay, position, scaleX, scaleY, index);
      });
    }

    console.log(`✅ Interactive overlays created: ${mapData.strategicAnalysis?.goldmines?.length || 0} goldmines, ${mapData.strategicAnalysis?.startingPositions?.length || 0} starting positions`);
  }

  /**
   * Create hover area for goldmine
   */
  createGoldmineHoverArea(overlay, goldmine, scaleX, scaleY, index) {
    const hoverArea = document.createElement('div');
    const x = goldmine.x * scaleX;
    const y = goldmine.y * scaleY;
    const size = 20; // Hover area size

    hoverArea.style.cssText = `
      position: absolute;
      left: ${x - size/2}px;
      top: ${y - size/2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      cursor: pointer;
      background: rgba(255, 215, 0, 0.3);
      border: 2px solid rgba(255, 215, 0, 0.8);
      z-index: 10;
      transition: all 0.2s ease;
    `;

    hoverArea.addEventListener('mouseenter', (e) => {
      hoverArea.style.background = 'rgba(255, 215, 0, 0.6)';
      hoverArea.style.transform = 'scale(1.2)';
      this.showTooltip(e, this.getGoldmineTooltipContent(goldmine, index));
    });

    hoverArea.addEventListener('mouseleave', () => {
      hoverArea.style.background = 'rgba(255, 215, 0, 0.3)';
      hoverArea.style.transform = 'scale(1)';
      this.hideTooltip();
    });

    hoverArea.addEventListener('mousemove', (e) => {
      this.updateTooltipPosition(e);
    });

    overlay.appendChild(hoverArea);
  }

  /**
   * Create hover area for starting position
   */
  createStartingPositionHoverArea(overlay, position, scaleX, scaleY, index) {
    const hoverArea = document.createElement('div');
    const x = position.x * scaleX;
    const y = position.y * scaleY;
    const size = 24; // Slightly larger for starting positions

    // Player colors
    const playerColors = [
      '#FF0000', '#0080FF', '#00FF80', '#FF8000', 
      '#8000FF', '#FFFF00', '#FF0080', '#00FFFF'
    ];
    const color = playerColors[position.playerId % playerColors.length];

    hoverArea.style.cssText = `
      position: absolute;
      left: ${x - size/2}px;
      top: ${y - size/2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      cursor: pointer;
      background: rgba(${this.hexToRgb(color)}, 0.3);
      border: 2px solid rgba(${this.hexToRgb(color)}, 0.8);
      z-index: 10;
      transition: all 0.2s ease;
    `;

    hoverArea.addEventListener('mouseenter', (e) => {
      hoverArea.style.background = `rgba(${this.hexToRgb(color)}, 0.6)`;
      hoverArea.style.transform = 'scale(1.2)';
      this.showTooltip(e, this.getStartingPositionTooltipContent(position, index));
    });

    hoverArea.addEventListener('mouseleave', () => {
      hoverArea.style.background = `rgba(${this.hexToRgb(color)}, 0.3)`;
      hoverArea.style.transform = 'scale(1)';
      this.hideTooltip();
    });

    hoverArea.addEventListener('mousemove', (e) => {
      this.updateTooltipPosition(e);
    });

    overlay.appendChild(hoverArea);
  }

  /**
   * Generate goldmine tooltip content
   */
  getGoldmineTooltipContent(goldmine, index) {
    const category = goldmine.category || 'Unknown';
    const amount = goldmine.goldAmount || 0;
    const amountK = goldmine.goldAmountK || Math.round(amount / 1000) + 'k';
    
    return `
      <div style="font-weight: bold;color: #FFD700;">💰 Goldmine #${index + 1}</div>
      <div>Gold Amount: ${amountK} (${amount.toLocaleString()})</div>
      <div>Category: ${category}</div>
      <div style="font-size: 10px; opacity: 0.8; margin-top: 4px;">
        Position: (${goldmine.x}, ${goldmine.y})
      </div>
    `;
  }

  /**
   * Generate starting position tooltip content
   */
  getStartingPositionTooltipContent(position, index) {
    const playerId = position.playerId + 1; // Display as 1-indexed
    const race = position.race || 'Unknown';
    
    return `
      <div style="font-weight: bold;color: #87CEEB;">🏰 Player ${playerId} Start</div>
      <div>Race: ${race.charAt(0).toUpperCase() + race.slice(1)}</div>
      <div style="font-size: 10px; opacity: 0.8; margin-top: 4px;">
        Position: (${position.x}, ${position.y})
      </div>
    `;
  }

  /**
   * Show tooltip
   */
  showTooltip(event, content) {
    this.tooltip.innerHTML = content;
    this.tooltip.style.opacity = '1';
    this.updateTooltipPosition(event);
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltip.style.opacity = '0';
  }

  /**
   * Update tooltip position
   */
  updateTooltipPosition(event) {
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = event.clientX + 10;
    let y = event.clientY - 10;
    
    // Keep tooltip within viewport
    if (x + tooltipRect.width > viewportWidth) {
      x = event.clientX - tooltipRect.width - 10;
    }
    
    if (y < 0) {
      y = event.clientY + 10;
    }
    
    this.tooltip.style.left = x + 'px';
    this.tooltip.style.top = y + 'px';
  }

  /**
   * Helper function to convert hex color to RGB values
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
      '255, 255, 255';}

  /**
   * Update display when window is resized
   */
  handleResize() {
    if (this.currentMap) {
      // Find the container and re-setup overlays
      const container = document.querySelector('.interactive-map-container');
      if (container) {
        setTimeout(() => {
          this.setupInteractiveOverlays(container.parentElement, this.currentMap);
        }, 100); // Small delay to allow for layout changes
      }
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
      this.tooltip = null;
    }
    this.currentMap = null;
  }
}

// Create and export singleton instance
export const mapDetailsViewer = new MapDetailsViewer();

// Handle window resize
window.addEventListener('resize', () => {
  mapDetailsViewer.handleResize();
});

// Add some CSS styles for the legend
const legendStyles = document.createElement('style');
legendStyles.textContent = `
  .interactive-map-container {
    margin: 20px 0;
  }
  
  .map-legend {
    margin-top: 15px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .map-legend h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #333;
  }
  
  .legend-items {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #666;
  }
  
  .legend-icon {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.3);
  }
  
  .strategic-map-image {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;
document.head.appendChild(legendStyles); 