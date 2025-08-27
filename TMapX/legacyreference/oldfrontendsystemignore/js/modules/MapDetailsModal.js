/**
 * Map Details Modal Module
 * Handles displaying detailed information about maps in a modal
 */

class MapDetailsModal {
  constructor() {
    this.modalId = 'custom-map-details-modal';
  }

  /**
   * Show map details in a custom modal
   * @param {string} mapName - Name of the map to show details for
   */
  async show(mapName) {
    try {
      console.log('🔍 Fetching map details for:', mapName);
      
      // Remove any existing modal
      this.remove();
      
      // Create and show loading modal
      this.createLoadingModal(mapName);
      
      // Wait a moment for loading to be visible
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Fetch map data
      const mapData = await this.fetchMapData(mapName);
      
      // Update modal with actual content
      this.updateModalContent(mapData);
      
      console.log('✅ Map details rendered successfully');
      
    } catch (error) {
      console.error('❌ Error loading map details:', error);
      this.showErrorModal(mapName, error);
    }
  }

  /**
   * Create the loading state modal
   * @param {string} mapName - Name of the map being loaded
   */
  createLoadingModal(mapName) {
    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.innerHTML = this.getLoadingModalHTML(mapName);
    document.body.appendChild(modal);
    console.log('✅ Custom modal created and displayed');
  }

  /**
   * Fetch map data from API
   * @param {string} mapName - Name of the map to fetch
   * @returns {Object} Map data
   */
  async fetchMapData(mapName) {
    // Use War2 maps API only (consolidated system)
    const war2SearchUrl = `/api/war2maps?search=${encodeURIComponent(mapName)}&limit=50`;console.log('🔍 War2 API URL:', war2SearchUrl);
    
    const response = await fetch(war2SearchUrl);
    console.log('🔍 War2 API Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Map not found - HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🔍 War2 API Response data:', data);
    
    let maps = [];
    if (data.success && data.data) {
      maps = data.data;
    } else if (data.maps) {
      maps = data.maps;
    } else if (Array.isArray(data)) {
      maps = data;
    }
    
    const map = maps.find(m => m.name.toLowerCase() === mapName.toLowerCase()) || maps[0];
    console.log('🔍 War2 map selected:', map);
    
    if (!map) {
      throw new Error('Map not found in results');
    }
    
    return map;}

  /**
   * Update modal content with map data
   * @param {Object} map - Map data object
   */
  updateModalContent(map) {
    const contentDiv = document.getElementById('custom-modal-content');
    if (contentDiv) {
      contentDiv.innerHTML = this.getMapDetailsHTML(map);
    }
  }

  /**
   * Show error modal
   * @param {string} mapName - Name of the map that failed to load
   * @param {Error} error - Error object
   */
  showErrorModal(mapName, error) {
    let modal = document.getElementById(this.modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = this.modalId;
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = this.getErrorModalHTML(mapName, error);
  }

  /**
   * Remove the modal from DOM
   */
  remove() {
    const existingModal = document.getElementById(this.modalId);
    if (existingModal) {
      existingModal.remove();
    }
  }

  /**
   * Generate loading modal HTML
   * @param {string} mapName - Name of the map being loaded
   * @returns {string} HTML string
   */
  getLoadingModalHTML(mapName) {
    return `
      <div style="
        position: fixed;top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #000;
          padding: 30px;
          border-radius: 15px;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          border: 5px solid #8B4513;
          box-shadow: 0 0 50px rgba(255, 215, 0, 0.8);
          position: relative;
        ">
          <button style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: #8B4513;
            color: #FFD700;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
          " onclick="document.getElementById('${this.modalId}').remove();">×</button>
          
          <div id="custom-modal-content" style="
            color: #000;
            font-size: 16px;
            line-height: 1.5;
            text-align: center;
            padding: 20px;
          ">
            <h2 style="color: #8B4513; margin: 0 0 20px 0; font-size: 24px;">🗺️ Loading Map Details...</h2>
            <div style="font-size: 18px;">📍 Fetching data for: ${mapName}</div>
            <div style="margin-top: 15px; font-size: 14px;">⏳ Please wait...</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate map details HTML
   * @param {Object} map - Map data object
   * @returns {string} HTML string
   */
  getMapDetailsHTML(map) {
    const rating = map.averageRating || 0;const starsHtml = this.generateStarsHTML(rating);
    const createdDate = map.createdAt ? new Date(map.createdAt).toLocaleDateString() : 'Unknown';

    return `
      <h2 style="color: #8B4513;margin: 0 0 25px 0; font-size: 28px; text-align: center;">🗺️ ${map.name}</h2>
      
      <div style="display: flex; gap: 20px; margin-bottom: 25px; align-items: flex-start; flex-wrap: wrap; justify-content: center;">
        <img src="${map.thumbnailPath || map.image || '/uploads/thumbnails/default-map.png'}" 
             alt="${map.name}" 
             style="width: 150px; height: 150px; object-fit: cover; border-radius: 10px; border: 3px solid #8B4513; flex-shrink: 0;"
             >
        
        <div style="flex: 1; min-width: 250px; text-align: left;">
          <div style="margin-bottom: 15px;">
            <strong style="color: #8B4513;">Creator:</strong> ${map.creator || 'Unknown'}
          </div>
          <div style="margin-bottom: 15px;">
            <strong style="color: #8B4513;">Rating:</strong> ${starsHtml} ${rating.toFixed(1)}/5.0 (${map.ratingCount || 0} votes)
          </div>
          <div style="margin-bottom: 15px;">
            <strong style="color: #8B4513;">Downloads:</strong> 📥 ${map.downloadCount || 0}
          </div>
          <div style="margin-bottom: 15px;">
            <strong style="color: #8B4513;">Matches Played:</strong> 🎮 ${map.playCount || 0}
          </div>
          <div style="margin-bottom: 15px;">
            <strong style="color: #8B4513;">Upload Date:</strong> 📅 ${createdDate}
          </div>
          ${map.description ? `<div style="margin-top: 20px; font-style: italic; color: #5A3A1A; padding: 15px; background: rgba(139, 69, 19, 0.1); border-radius: 8px; border-left: 4px solid #8B4513;">"${map.description}"</div>` : ''}
        </div>
      </div>
      
      <div style="margin-top: 30px;">
        <h3 style="color: #8B4513; margin-bottom: 20px; font-size: 20px; text-align: center;">📊 Map Statistics</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; max-width: 600px; margin: 0 auto;">
          ${this.generateStatsCardsHTML(map, rating)}
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <button style="
          background: linear-gradient(135deg, #8B4513, #A0522D);
          color: #FFD700;
          border: none;
          padding: 12px 30px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 25px;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="document.getElementById('${this.modalId}').remove();">
          ✅ Close Map Details
        </button>
      </div>
    `;
  }

  /**
   * Generate stars HTML for rating
   * @param {number} rating - Rating value (0-5)
   * @returns {string} Stars HTML
   */
  generateStarsHTML(rating) {
    const fullStars = Math.floor(rating);const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) {
      starsHtml += '⭐';
    }
    if (halfStar) {
      starsHtml += '🌟';
    }
    for (let i = 0; i < emptyStars; i++) {
      starsHtml += '☆';
    }
    return starsHtml;}

  /**
   * Generate statistics cards HTML
   * @param {Object} map - Map data object
   * @param {number} rating - Map rating
   * @returns {string} Stats cards HTML
   */
  generateStatsCardsHTML(map, rating) {
    const stats = [
      {
        label: 'Map Size',
        value: map.size || 'Unknown'
      },
      {
        label: 'Map Type',
        value: map.type === 'melee' ? 'Melee' : 'Custom'
      },
      {
        label: 'Players',
        value: `${map.playerCount?.min || map.players || 2}-${map.playerCount?.max || map.players || 8}`
      },
      {
        label: 'Popularity',
        value: `${map.downloadCount || 0} DL`
      },
      {
        label: 'Battle Tested',
        value: `${map.playCount || 0} matches`
      },
      {
        label: 'Rating',
        value: `${rating.toFixed(1)}/5.0`
      }
    ];return stats.map(stat => `
      <div style="background: rgba(139, 69, 19, 0.15);padding: 15px; border-radius: 8px; border: 2px solid #8B4513; text-align: center;">
        <div style="font-weight: bold; color: #8B4513; margin-bottom: 5px;">${stat.label}</div>
        <div style="font-size: 18px; color: #000;">${stat.value}</div>
      </div>
    `).join('');
  }

  /**
   * Generate error modal HTML
   * @param {string} mapName - Name of the map that failed to load
   * @param {Error} error - Error object
   * @returns {string} HTML string
   */
  getErrorModalHTML(mapName, error) {
    return `
      <div style="
        position: fixed;top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #000;
          padding: 40px;
          border-radius: 15px;
          max-width: 500px;
          text-align: center;
          border: 5px solid #8B4513;
          box-shadow: 0 0 50px rgba(255, 215, 0, 0.8);
          position: relative;
        ">
          <button style="
            position: absolute;
            top: 10px;
            right: 15px;
            background: #8B4513;
            color: #FFD700;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
          " onclick="document.getElementById('${this.modalId}').remove();">×</button>
          
          <h2 style="color: #8B4513; margin: 0 0 20px 0; font-size: 24px;">🗺️ Map Details</h2>
          <h3 style="color: #8B4513; margin-bottom: 15px;">❌ Map Not Found</h3>
          <p style="margin-bottom: 15px; font-size: 16px;">Could not find details for "${mapName}".</p>
          <p style="margin-bottom: 15px; font-size: 14px;">The map might not be in our database yet.</p>
          <p style="color: #8B0000; font-size: 12px; margin-bottom: 25px;">Error: ${error.message}</p>
          
          <button style="
            background: linear-gradient(135deg, #8B4513, #A0522D);
            color: #FFD700;
            border: none;
            padding: 12px 30px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 25px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          " onclick="document.getElementById('${this.modalId}').remove();">
            Close
          </button>
        </div>
      </div>
    `;
  }
}

// Export for use in other modules
window.MapDetailsModal = MapDetailsModal; 