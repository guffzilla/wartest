<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';

  let selectedFilePath: string | null = null;
  let testResult: string = '';
  let errorMessage: string = '';
  let isUploading: boolean = false;
  let uploadProgress: number = 0;
  let analysisComplete: boolean = false;
  let mapData: any = null;
  let notificationMessage: string = '';
  let showNotification: boolean = false;
  let mapVisualizationHtml: string = '';
  let showMapVisualization: boolean = false;

  async function loadTestFile() {
    try {
      errorMessage = '';
      testResult = '';
      
      // Use the test file directly
      const result = await invoke('test_pud_parser', { filePath: 'MapTests/Garden of War.pud' });
      testResult = result as string;
      
      console.log('Test file loaded:', testResult);

    } catch (error) {
      console.error('Test file error:', error);
      errorMessage = `Failed to load test file: ${error}`;
      testResult = '';
    }
  }

  async function uploadMap() {
    console.log('uploadMap function called');
    try {
      console.log('About to open file dialog...');
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Warcraft II Maps',
          extensions: ['pud']
        }],
        title: 'Select PUD Map File'
      });
      
      console.log('Dialog returned:', selected);
      console.log('Selected type:', typeof selected);
      console.log('Selected value:', selected);
      
      if (selected) {
        // In Tauri 2.x, when multiple: false, selected is a string
        // When multiple: true, selected is an array
        if (Array.isArray(selected)) {
          if (selected.length > 0) {
            selectedFilePath = selected[0];
          }
        } else {
          // Single file selected (string)
          selectedFilePath = selected;
        }
        
        if (selectedFilePath) {
          errorMessage = '';
          console.log('Selected file:', selectedFilePath);
        } else {
          console.log('No file selected or dialog cancelled');
        }
      } else {
        console.log('No file selected or dialog cancelled');
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      errorMessage = `Failed to select file: ${error}`;
    }
  }

  async function testPudParser() {
    if (!selectedFilePath) {
      errorMessage = 'Please select a map file first using the Upload Map button';
      return;
    }

    try {
      errorMessage = '';
      testResult = '';
      
      const result = await invoke('test_pud_parser', { filePath: selectedFilePath });
      testResult = result as string;
      
      console.log('PUD test result:', result);

    } catch (error) {
      console.error('PUD test error:', error);
      errorMessage = `Failed to test PUD parser: ${error}`;
      testResult = '';
    }
  }

  async function generateMapVisualization() {
    if (!selectedFilePath) {
      errorMessage = 'Please select a map file first using the Upload Map button';
      return;
    }

    try {
      errorMessage = '';
      isUploading = true;
      
      const result = await invoke('generate_map_visualization', { filePath: selectedFilePath });
      console.log('Map visualization generated:', result);
      
      // Store the HTML content and show the visualization
      mapVisualizationHtml = result as string;
      showMapVisualization = true;
      
      // Show success notification
      notificationMessage = `🎨 Map Visualization Generated Successfully!

The interactive map is now displayed below.
You can also find the saved file as "map_visualization.html" in your TMapX folder.`;

      showNotification = true;
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        showNotification = false;
      }, 5000);
      
      isUploading = false;
    } catch (error) {
      console.error('Map visualization error:', error);
      errorMessage = `Failed to generate map visualization: ${error}`;
      isUploading = false;
    }
  }

  async function analyzeMap() {
    if (!selectedFilePath) {
      errorMessage = 'Please select a map file first using the Upload Map button';
      return;
    }
    
    isUploading = true;
    uploadProgress = 0;
    errorMessage = '';
    analysisComplete = false;

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        uploadProgress += 5;
        if (uploadProgress >= 90) {
          clearInterval(progressInterval);
        }
      }, 100);

      // Parse the map file
      const result = await invoke('parse_map_file', { filePath: selectedFilePath });
      mapData = result;
      
      // Generate map image
      const imageResult = await invoke('generate_map_image', { mapData: result });
      
      clearInterval(progressInterval);
      uploadProgress = 100;
      
      setTimeout(() => {
        isUploading = false;
        analysisComplete = true;
      }, 500);

      console.log('Map analysis complete:', mapData);
      console.log('Map image generated:', imageResult);

    } catch (error) {
      console.error('Analysis error:', error);
      errorMessage = `Failed to analyze map: ${error}`;
      isUploading = false;
    }
  }

  async function exportReport() {
    if (!mapData) {
      errorMessage = 'No map data to export';
      return;
    }

    try {
      const result = await invoke('export_map_report', { mapData });
      console.log('Report exported:', result);
      errorMessage = '';
      // Show success message
      alert(`Report exported successfully: ${result}`);
    } catch (error) {
      console.error('Export error:', error);
      errorMessage = `Failed to export report: ${error}`;
    }
  }
</script>

<main>
  <div class="container">
    <h1>🗺️ TMapX - Warcraft II Map Analyzer</h1>
    
    <div class="button-section">
      <button 
        class="action-btn test-btn" 
        on:click={loadTestFile}
        disabled={isUploading}
      >
        🧪 Load Test File
      </button>
      
      <button 
        class="action-btn upload-btn" 
        on:click={uploadMap}
        disabled={isUploading}
      >
        📁 Upload Map
      </button>
      
      <button 
        class="action-btn analyze-btn" 
        on:click={testPudParser}
        disabled={!selectedFilePath || isUploading}
      >
        🔍 Test PUD Parser
      </button>
      
      <button 
        class="action-btn visualize-btn" 
        on:click={generateMapVisualization}
        disabled={!selectedFilePath || isUploading}
      >
        🎨 Generate Map Visualization
      </button>
    </div>
    
    {#if selectedFilePath}
      <div class="file-info">
        <p>Selected: {selectedFilePath.split(/[\\\/]/).pop()}</p>
      </div>
    {/if}
    
    {#if isUploading}
      <div class="progress">
        <div class="progress-bar" style="width: {uploadProgress}%"></div>
        <span>{uploadProgress}%</span>
      </div>
    {/if}
    
    {#if errorMessage}
      <div class="error">
        {errorMessage}
      </div>
    {/if}
    
    {#if showNotification}
      <div class="notification success">
        <div class="notification-header">
          <span class="notification-icon">🎉</span>
          <span class="notification-title">Success!</span>
          <button class="notification-close" on:click={() => showNotification = false}>×</button>
        </div>
        <div class="notification-content">
          <pre>{notificationMessage}</pre>
        </div>
      </div>
    {/if}
    
    {#if testResult}
      <div class="test-result">
        <h3>PUD Parser Test Result:</h3>
        <pre>{testResult}</pre>
      </div>
    {/if}
    
    {#if showMapVisualization && mapVisualizationHtml}
      <div class="map-visualization-section">
        <div class="section-header">
          <h3>🗺️ Interactive Map Visualization</h3>
          <button class="close-btn" on:click={() => showMapVisualization = false}>×</button>
        </div>
        <div class="map-container">
          <iframe 
            srcdoc={mapVisualizationHtml}
            title="Warcraft II Map Visualization"
            class="map-iframe"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        </div>
        <div class="map-controls">
          <button class="action-btn" on:click={() => showMapVisualization = false}>
            Close Map View
          </button>
          <button class="action-btn" on:click={() => window.open('map_visualization.html', '_blank')}>
            Open in New Tab
          </button>
        </div>
      </div>
    {/if}
    
    {#if analysisComplete && mapData}
      <div class="results-section">
        <div class="results-header">
          <h2>Map Analysis Results</h2>
          <button 
            class="export-btn" 
            on:click={exportReport}
            title="Export analysis report"
          >
            📄 Export Report
          </button>
        </div>
     
    <div class="map-info">
      <h3>Map Information</h3>
      <div class="info-grid">
        <div class="info-item">
          <strong>Name:</strong> {mapData.name}
        </div>
        <div class="info-item">
          <strong>Size:</strong> {mapData.width} x {mapData.height}
        </div>
        <div class="info-item">
          <strong>Players:</strong> {mapData.player_count}
        </div>
        <div class="info-item">
          <strong>Total Tiles:</strong> {mapData.terrain_analysis?.total_tiles || 0}
        </div>
      </div>
    </div>
    
    <!-- Terrain Analysis -->
    <div class="terrain-section">
      <h3>🌍 Terrain Analysis</h3>
      <div class="terrain-overview">
        <div class="terrain-chart">
          <div class="terrain-bar">
            <div class="terrain-fill grass" style="width: {mapData.terrain_analysis?.grass_percentage || 0}%"></div>
            <span class="terrain-label">Grass: {mapData.terrain_analysis?.grass_percentage?.toFixed(1) || 0}%</span>
          </div>
          <div class="terrain-bar">
            <div class="terrain-fill water" style="width: {mapData.terrain_analysis?.water_percentage || 0}%"></div>
            <span class="terrain-label">Water: {mapData.terrain_analysis?.water_percentage?.toFixed(1) || 0}%</span>
          </div>
          <div class="terrain-bar">
            <div class="terrain-fill forest" style="width: {mapData.terrain_analysis?.tree_percentage || 0}%"></div>
            <span class="terrain-label">Forest: {mapData.terrain_analysis?.tree_percentage?.toFixed(1) || 0}%</span>
          </div>
          <div class="terrain-bar">
            <div class="terrain-fill mountain" style="width: {mapData.terrain_analysis?.mountain_percentage || 0}%"></div>
            <span class="terrain-label">Mountains: {mapData.terrain_analysis?.mountain_percentage?.toFixed(1) || 0}%</span>
          </div>
        </div>
        
        <div class="terrain-breakdown">
          <h4>Detailed Terrain Breakdown</h4>
          <div class="terrain-list">
                         {#each mapData.terrain_analysis?.terrain_breakdown || [] as terrain}
              <div class="terrain-item">
                <span class="terrain-name">{terrain.name}</span>
                <span class="terrain-count">{terrain.count} tiles</span>
                <span class="terrain-percentage">{terrain.percentage.toFixed(1)}%</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Visual Map Preview -->
    <div class="map-preview-section">
      <h3>🗺️ Map Preview</h3>
      <div class="map-preview-container">
        <div class="map-grid" style="grid-template-columns: repeat({Math.min(mapData.width, 50)}, 1fr); grid-template-rows: repeat({Math.min(mapData.height, 50)}, 1fr);">
          {#each Array(Math.min(mapData.width * mapData.height, 2500)) as _, i}
            <div class="map-tile"></div>
          {/each}
        </div>
        
        <!-- Overlay elements -->
        {#each mapData.resources as resource}
          <div 
            class="resource-marker goldmine" 
            style="left: {(resource.x / mapData.width) * 100}%; top: {(resource.y / mapData.height) * 100}%;"
            title="Goldmine at ({resource.x}, {resource.y})"
          >💰</div>
        {/each}
        
        {#each mapData.buildings as building}
          <div 
            class="building-marker townhall" 
            style="left: {(building.x / mapData.width) * 100}%; top: {(building.y / mapData.height) * 100}%;"
            title="{building.building_type} (Player {building.owner}) at ({building.x}, {building.y})"
          >🏰</div>
        {/each}
        
        {#each mapData.units as unit}
          <div 
            class="unit-marker peasant" 
            style="left: {(unit.x / mapData.width) * 100}%; top: {(unit.y / mapData.height) * 100}%;"
            title="{unit.unit_type} (Player {unit.owner}) at ({unit.x}, {unit.y})"
          >👤</div>
        {/each}
      </div>
      
      <div class="map-legend">
        <div class="legend-item">
          <span class="legend-icon">💰</span>
          <span>Goldmine</span>
        </div>
        <div class="legend-item">
          <span class="legend-icon">🏰</span>
          <span>Town Hall</span>
        </div>
        <div class="legend-item">
          <span class="legend-icon">👤</span>
          <span>Unit</span>
        </div>
      </div>
    </div>
    
    <div class="resources-section">
      <h3>💰 Resource Locations</h3>
      <div class="resource-list">
        {#each mapData.resources as resource}
          <div class="resource-item">
            <span class="resource-type">{resource.resource_type}</span>
            <span class="resource-location">({resource.x}, {resource.y})</span>
            <span class="resource-amount">{resource.amount}</span>
            {#if resource.is_goldmine}
              <span class="goldmine-badge">🏆 Goldmine</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <div class="units-section">
      <h3>⚔️ Units</h3>
      <div class="unit-list">
        {#each mapData.units as unit}
          <div class="unit-item">
            <span class="unit-type">{unit.unit_type}</span>
            <span class="unit-location">({unit.x}, {unit.y})</span>
            <span class="unit-owner">Player {unit.owner}</span>
          </div>
        {/each}
      </div>
    </div>
    
    <div class="buildings-section">
      <h3>🏗️ Buildings</h3>
      <div class="building-list">
        {#each mapData.buildings as building}
          <div class="building-item">
            <span class="building-type">{building.building_type}</span>
            <span class="building-location">({building.x}, {building.y})</span>
            <span class="building-owner">Player {building.owner}</span>
            {#if building.is_completed}
              <span class="completed-badge">✅ Complete</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
   
   </div>
</main>

<style>
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h1 {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 2rem;
    font-size: 2.5rem;
  }

  h2 {
    color: #34495e;
    margin-bottom: 1rem;
  }

  .button-section {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .action-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 150px;
  }

  .action-btn:hover {
    background: #0056b3;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }

  .action-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .test-btn {
    background: #28a745;
  }

  .test-btn:hover {
    background: #218838;
  }

  .upload-btn {
    background: #17a2b8;
  }

  .upload-btn:hover {
    background: #138496;
  }

  .analyze-btn {
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }

  .visualize-btn {
    background: linear-gradient(135deg, #a29bfe, #6c5ce7);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(162, 155, 254, 0.3);
  }

  .analyze-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
  }

  .visualize-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(162, 155, 254, 0.4);
  }

  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 500px;
    max-width: 90vw;
    background: #2c3e50;
    border: 2px solid #27ae60;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  }

  .notification.success {
    border-color: #27ae60;
  }

  .notification-header {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    background: #27ae60;
    color: white;
    border-radius: 8px 8px 0 0;
    font-weight: bold;
  }

  .notification-icon {
    font-size: 20px;
    margin-right: 10px;
  }

  .notification-title {
    flex: 1;
    font-size: 16px;
  }

  .notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .notification-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .notification-content {
    padding: 20px;
    color: white;
    max-height: 400px;
    overflow-y: auto;
  }

  .notification-content pre {
    margin: 0;
    white-space: pre-wrap;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .file-info {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    border: 1px solid #dee2e6;
  }

  .progress {
    background: #e9ecef;
    border-radius: 8px;
    height: 20px;
    margin: 1rem 0;
    position: relative;
    overflow: hidden;
  }

  .progress-bar {
    background: #28a745;
    height: 100%;
    transition: width 0.3s ease;
  }

  .progress span {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #495057;
    font-weight: bold;
  }

  .error {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 8px;
    margin: 1rem 0;
    border: 1px solid #f5c6cb;
  }

  .results-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    border: 1px solid #dee2e6;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .export-btn {
    background: #28a745;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }
  
  .export-btn:hover {
    background: #218838;
  }

  .map-info {
    margin-bottom: 2rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .info-item {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #dee2e6;
  }

  .resources-section, .units-section, .buildings-section {
    margin-bottom: 2rem;
  }

  .resource-list, .unit-list, .building-list {
    display: grid;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .resource-item, .unit-item, .building-item {
    background: #f8f9fa;
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .resource-type, .unit-type, .building-type {
    font-weight: bold;
    color: #495057;
  }

  .resource-location, .unit-location, .building-location {
    color: #6c757d;
    font-family: monospace;
  }

  .resource-amount {
    background: #28a745;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .goldmine-badge {
    background: #ffc107;
    color: #212529;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: bold;
  }

  .unit-owner, .building-owner {
    background: #007bff;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .completed-badge {
    background: #28a745;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }


  
  /* Map Preview Styles */
  .map-preview-section {
    margin: 2rem 0;
    background: white;
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid #dee2e6;
  }
  
  .map-preview-container {
    position: relative;
    width: 100%;
    max-width: 600px;
    height: 400px;
    border: 2px solid #495057;
    border-radius: 8px;
    overflow: hidden;
    background: #8B4513;
    margin: 1rem 0;
  }
  
  .map-grid {
    display: grid;
    width: 100%;
    height: 100%;
    gap: 1px;
  }
  
  .map-tile {
    background: #A0522D;
    border: 1px solid #654321;
    min-height: 4px;
    min-width: 4px;
  }
  
  .resource-marker, .building-marker, .unit-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 1.2rem;
    filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.8));
    z-index: 10;
    cursor: pointer;
  }
  
  .resource-marker.goldmine {
    font-size: 1.5rem;
  }
  
  .building-marker.townhall {
    font-size: 1.3rem;
  }
  
  .unit-marker.peasant {
    font-size: 1rem;
  }
  
  .map-legend {
    display: flex;
    gap: 2rem;
    justify-content: center;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f8f9fa;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid #dee2e6;
  }
  
  .legend-icon {
    font-size: 1.2rem;
  }
  
  /* Terrain Analysis Styles */
  .terrain-section {
    margin: 2rem 0;
    background: white;
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid #dee2e6;
  }
  
  .terrain-overview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 1rem;
  }
  
  .terrain-chart {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .terrain-bar {
    position: relative;
    height: 30px;
    background: #f8f9fa;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #dee2e6;
  }
  
  .terrain-fill {
    height: 100%;
    transition: width 0.3s ease;
    position: relative;
  }
  
  .terrain-fill.grass {
    background: linear-gradient(90deg, #90EE90, #228B22);
  }
  
  .terrain-fill.water {
    background: linear-gradient(90deg, #87CEEB, #0000CD);
  }
  
  .terrain-fill.forest {
    background: linear-gradient(90deg, #228B22, #006400);
  }
  
  .terrain-fill.mountain {
    background: linear-gradient(90deg, #8B7355, #696969);
  }
  
  .terrain-label {
    position: absolute;
    top: 50%;
    left: 10px;
    transform: translateY(-50%);
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    z-index: 1;
  }
  
  .terrain-breakdown {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .terrain-breakdown h4 {
    margin: 0 0 1rem 0;
    color: #495057;
  }
  
  .terrain-list {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .terrain-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }
  
  .terrain-name {
    font-weight: bold;
    color: #495057;
    flex: 1;
  }
  
  .terrain-count {
    color: #6c757d;
    font-family: monospace;
    margin: 0 1rem;
  }
  
  .terrain-percentage {
    background: #007bff;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: bold;
  }

  .map-visualization-section {
    margin: 2rem 0;
    background: white;
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid #dee2e6;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .close-btn {
    background: none;
    border: none;
    color: #6c757d;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background: #f8f9fa;
  }

  .map-container {
    width: 100%;
    height: 400px;
    border: 2px solid #495057;
    border-radius: 8px;
    overflow: hidden;
    background: #8B4513;
    position: relative;
  }

  .map-iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: white;
  }

  .map-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
    flex-wrap: wrap;
  }

  .map-controls .action-btn {
    background: linear-gradient(135deg, #6c757d, #495057);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .map-controls .action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .map-container {
      height: 300px;
    }
    
    .map-visualization-section {
      padding: 1rem;
      margin: 1rem 0;
    }
    
    .section-header h3 {
      font-size: 1.2rem;
    }
  }
</style>
