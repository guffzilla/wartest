<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  let selectedFilePath: string | null = null;
  let isUploading = false;
  let uploadProgress = 0;
  let errorMessage = '';
  let mapData: any = null;
  let analysisComplete = false;
  let testResult: string = '';

  async function selectFile() {
    try {
      const result = await invoke('select_map_file');
      if (result) {
        selectedFilePath = result as string;
        errorMessage = '';
        console.log('Selected file:', selectedFilePath);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      errorMessage = 'Failed to select file';
    }
  }

  async function testPudParser() {
    if (!selectedFilePath) {
      errorMessage = 'Please select a map file first';
      return;
    }

    try {
      errorMessage = '';
      testResult = '';
      
      const result = await invoke('test_pud_parser', { filePath: selectedFilePath });
      testResult = result as string;
      
      console.log('PUD test result:', testResult);

    } catch (error) {
      console.error('PUD test error:', error);
      errorMessage = `Failed to test PUD parser: ${error}`;
    }
  }

  async function analyzeMap() {
    if (!selectedFilePath) {
      errorMessage = 'Please select a map file first';
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
    <h1>🗺️ Map Extraction Tool</h1>
    
    <div class="upload-section">
      <h2>Upload Warcraft II Map</h2>
      
      <div class="upload-area">
        <button 
          class="upload-btn" 
          on:click={selectFile}
          disabled={isUploading}
        >
          📁 Select Map File
        </button>
        
        {#if selectedFilePath}
          <button 
            class="test-btn" 
            on:click={testPudParser}
            disabled={isUploading}
          >
            🔍 Test PUD Parser
          </button>
        {/if}
        
        {#if selectedFilePath}
          <div class="file-info">
            <p>Selected: {selectedFilePath.split('\\').pop() || selectedFilePath.split('/').pop()}</p>
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
        
        {#if testResult}
          <div class="test-result">
            <h3>PUD Parser Test Result:</h3>
            <pre>{testResult}</pre>
          </div>
        {/if}
        
        <button 
          class="analyze-btn" 
          on:click={analyzeMap}
          disabled={!selectedFilePath || isUploading}
        >
          🔍 Analyze Map
        </button>
      </div>
    </div>
    
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
    
    <div class="info-section">
      <h3>Supported Formats</h3>
      <ul>
        <li>Warcraft II Maps (.w2m)</li>
        <li>Warcraft II Campaign Maps (.w2x)</li>
      </ul>
      
      <h3>Features</h3>
      <ul>
        <li>🗺️ Interactive map visualization</li>
        <li>💰 Goldmine and resource location analysis</li>
        <li>🏗️ Strategic position identification</li>
        <li>📊 Terrain and elevation mapping</li>
        <li>💾 Export analysis reports</li>
      </ul>
    </div>
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

  .upload-section {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    border: 2px dashed #dee2e6;
  }

  .upload-area {
    text-align: center;
  }

  .upload-btn, .analyze-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    margin: 0.5rem;
    transition: background-color 0.2s;
  }

  .upload-btn:hover, .analyze-btn:hover {
    background: #0056b3;
  }

  .upload-btn:disabled, .analyze-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
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

  .info-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid #dee2e6;
  }

  .info-section h3 {
    color: #495057;
    margin-bottom: 0.5rem;
  }

  .info-section ul {
    list-style: none;
    padding: 0;
  }

  .info-section li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #f8f9fa;
  }

  .info-section li:last-child {
    border-bottom: none;
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
</style>
