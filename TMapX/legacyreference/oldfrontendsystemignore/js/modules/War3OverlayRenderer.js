/**
 * War3 Dynamic Overlay Renderer
 * Renders strategic overlays on-the-fly using canvas and database coordinates
 */
class War3OverlayRenderer {
  constructor() {
    this.iconCache = new Map();
    this.coordinateBoundsCache = new Map(); // Cache bounds per canvas
    this.loadIcons();
  }

  /**
   * Load War3 icons into cache
   */
  async loadIcons() {
    console.log('🎯 War3OverlayRenderer: Starting icon loading process...');
    const iconPaths = {
      goldmine: '/uploads/war3images/overlay_icons/goldmine.png',
      creep_easy: '/uploads/war3images/overlay_icons/creep_easy.png',
      creep_medium: '/uploads/war3images/overlay_icons/creep_medium.png',
      creep_hard: '/uploads/war3images/overlay_icons/creep_hard.png',
      starting_position: '/uploads/war3images/overlay_icons/player_start.png',
      npc_structure: '/uploads/war3images/overlay_icons/structure.png',
      shop: '/uploads/war3images/overlay_icons/shop.png',
      drop_table: '/uploads/war3images/overlay_icons/tavern.png' // Using tavern as fallback for drop_table
    };

    console.log('📋 Icon paths to load:', iconPaths);
    console.log('📋 Expected icon types:', Object.keys(iconPaths));

    for (const [key, path] of Object.entries(iconPaths)) {
      try {
        console.log(`🔄 Loading icon: ${key} from ${path}`);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log(`✅ Successfully loaded: ${key} (${img.width}x${img.height})`);
            resolve();
          };
          img.onerror = (error) => {
            console.error(`❌ Failed to load ${key} from ${path}:`, error);
            reject(error);
          };
          img.src = path;
        });
        this.iconCache.set(key, img);
        console.log(`✅ Loaded War3 icon: ${key} into cache`);
        console.log(`📊 Current cache size: ${this.iconCache.size}`);
      } catch (error) {
        console.error(`❌ Failed to load War3 icon: ${key}`, error);
      }
    }
    
    console.log('🎯 Icon loading complete. Final cache contents:', Array.from(this.iconCache.keys()));
    console.log('📊 Final cache size:', this.iconCache.size);
    console.log('🔍 Cache verification:');
    for (const [key, img] of this.iconCache.entries()) {
      console.log(`   ${key}: ${img.width}x${img.height} (loaded: ${img.complete})`);
    }
  }



  /**
   * Render overlay on canvas
   */
  async renderOverlay(canvasId, mapData, showOverlay = true) {
    console.log(`🎯 War3OverlayRenderer.renderOverlay called with:`, {
      canvasId,
      showOverlay,
      mapDataKeys: Object.keys(mapData || {}),
      strategicDataKeys: Object.keys(mapData?.strategicData || {}),
      hasStrategicData: !!mapData?.strategicData
    });
    
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error('Canvas not found:', canvasId);
      return;}

    const ctx = canvas.getContext('2d');
    
    // Clean up any existing tooltips before re-rendering
    this.cleanupTooltips(canvasId);
    
    // Set proper cursor style for the canvas
    canvas.style.cursor = 'default';
    
    // Load base thumbnail
    const thumbnailPath = mapData.thumbnailPath || `/uploads/war3images/${mapData.filename?.replace('.w3x', '.png')}`;
    console.log('🖼️ Loading thumbnail from path:', thumbnailPath);
    console.log('📊 MapData for thumbnail loading:', {
      thumbnailPath: mapData.thumbnailPath,
      filename: mapData.filename,
      strategicThumbnailPath: mapData.strategicThumbnailPath
    });
    
    const baseImage = new Image();
    baseImage.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      baseImage.onload = () => {
        console.log('✅ Thumbnail loaded successfully:', {
          width: baseImage.naturalWidth,
          height: baseImage.naturalHeight,
          src: baseImage.src
        });
        resolve();
      };
      baseImage.onerror = (error) => {
        console.error('❌ Failed to load thumbnail:', {
          path: thumbnailPath,
          error: error
        });
        reject(error);
      };
      baseImage.src = thumbnailPath;
    });

    // Determine if this is fullscreen mode and check if canvas dimensions are already set
    const isFullscreen = canvasId.includes('fullscreen') || canvas.closest('.war3-fullscreen-modal');
    let canvasSize;
    
    if (isFullscreen && canvas.width > 0 && canvas.height > 0) {
      // Canvas dimensions already set by the caller (like in fullscreen mode)
      canvasSize = Math.max(canvas.width, canvas.height);
      console.log('🖼️ Fullscreen mode detected, using existing canvas size:', canvasSize);
      console.log('🖼️ Canvas was already set to:', canvas.width, 'x', canvas.height);
    } else if (isFullscreen && (canvas.width === 0 || canvas.height === 0)) {
      // Canvas dimensions not ready yet, wait for them
      console.log('⏳ Canvas dimensions not ready, waiting...');
      await new Promise((resolve) => {
        const checkDimensions = () => {
          if (canvas.width > 0 && canvas.height > 0) {
            canvasSize = Math.max(canvas.width, canvas.height);
            console.log('✅ Canvas dimensions ready:', canvas.width, 'x', canvas.height);
            resolve();
          } else {
            setTimeout(checkDimensions, 50);
          }
        };
        checkDimensions();
      });
    } else if (isFullscreen) {
      // For fullscreen without pre-set dimensions, calculate size based on the actual displayed image size
      const imgElement = canvas.parentElement?.querySelector('img');
      if (imgElement) {
        const imgRect = imgElement.getBoundingClientRect();
        canvasSize = Math.max(imgRect.width, imgRect.height);
        console.log('🖼️ Fullscreen mode detected, using image display size:', canvasSize);
      } else {
        // Fallback to viewport-based calculation
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxWidth = viewportWidth * 0.9; // 90vw
        const maxHeight = viewportHeight * 0.9; // 90vh
        canvasSize = Math.min(maxWidth, maxHeight);
        console.log('🖼️ Fullscreen mode detected, calculating dynamic canvas size:', canvasSize);
      }
      
      // Set canvas size
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      
      // Also set CSS dimensions for proper display
      canvas.style.width = `${canvasSize}px`;
      canvas.style.height = `${canvasSize}px`;
      
      console.log('🖼️ Set canvas dimensions to:', canvasSize, 'x', canvasSize);
    } else {
      // For regular view (like in map details), use fixed size
      canvasSize = 512;
      console.log('🖼️ Regular view mode, using fixed canvas size:', canvasSize);
      
      // Set canvas size
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      
      // Also set CSS dimensions for proper display
      canvas.style.width = `${canvasSize}px`;
      canvas.style.height = `${canvasSize}px`;
      
      console.log('🖼️ Set canvas dimensions to:', canvasSize, 'x', canvasSize);
    }

    // Clear canvas
    console.log('🧹 Clearing canvas with dimensions:', canvasSize, 'x', canvasSize);
    console.log('🎯 Proceeding with overlay rendering...');
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw base thumbnail FIRST (so it's underneath everything)
    if (baseImage.complete && baseImage.naturalWidth > 0) {
      ctx.drawImage(baseImage, 0, 0, canvasSize, canvasSize);
      console.log('🖼️ Base thumbnail drawn first (underneath strategic elements)');
    }
    
    // DEBUG: Draw a test rectangle to verify canvas drawing is working
    if (isFullscreen) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(10, 10, 50, 50);
      console.log('🧪 DEBUG: Drew test red rectangle on fullscreen canvas');
      
      // Additional debug: Draw a test circle to verify context is working
      ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(100, 100, 25, 0, 2 * Math.PI);
      ctx.fill();
      console.log('🧪 DEBUG: Drew test green circle on fullscreen canvas');
      
      // Test text rendering
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText('TEST TEXT', 150, 150);
      console.log('🧪 DEBUG: Drew test text on fullscreen canvas');
    }

    // Don't draw overlay if disabled
    if (!showOverlay) {
      console.log('🎯 Overlay disabled, but adding tooltips for thumbnail');
      // Still set up tooltips even if overlay is disabled (for thumbnail info)
      setTimeout(() => {
        this.addHoverTooltips(canvasId, mapData);
      }, 100);
      return;}

    // Get strategic data
    const strategicData = mapData.strategicData || {};
    console.log('📊 Strategic data extracted:', {
      strategicDataKeys: Object.keys(strategicData),
      strategicDataSize: JSON.stringify(strategicData).length,
      hasGoldmines: !!strategicData.dooGoldmines || !!strategicData.jassGoldmines,
      hasCreepUnits: !!strategicData.dooCreepUnits || !!strategicData.jassCreepUnits,
      hasStartingPositions: !!strategicData.dooStartingPositions || !!strategicData.jassStartingPositions || !!strategicData.starting_positions,
      hasNeutralStructures: !!strategicData.dooNeutralStructures || !!strategicData.jassNeutralStructures
    });
    
    // Get map dimensions for coordinate transformation
    const mapWidth = this.parseMapSize(mapData.mapSize)?.width || 256;
    const mapHeight = this.parseMapSize(mapData.mapSize)?.height || 256;

    // Ensure icons are loaded before drawing
    if (this.iconCache.size === 0) {
      console.log('🔄 No icons loaded yet, loading icons now...');
      await this.loadIcons();
    } else {
      console.log(`✅ Icons already loaded (${this.iconCache.size} icons in cache)`);
    }

    // Draw strategic elements ON TOP of the base thumbnail
    console.log(`🎨 Drawing strategic elements ON TOP with canvasSize: ${canvasSize}, mapSize: ${mapWidth}x${mapHeight}`);
    console.log(`🎯 Final canvas dimensions for drawing: ${canvas.width} x ${canvas.height}`);
    await this.drawStrategicElements(ctx, strategicData, canvasSize, mapWidth, mapHeight, canvasId);
    
    console.log('🎯 Overlay rendered, adding tooltips...');
    // Add hover tooltips after rendering overlay (with small delay to ensure DOM is ready)
    setTimeout(() => {
      this.addHoverTooltips(canvasId, mapData);
    }, 100);
  }

  /**
   * Draw strategic elements on canvas
   */
  async drawStrategicElements(ctx, strategicData, canvasSize, mapWidth, mapHeight, canvasId) {
    console.log(`🎨 drawStrategicElements called with:`, {
      isFullscreen: canvasId.includes('fullscreen'),
      canvasId,
      iconSize: this.iconSize,
      canvasSize,
      mapWidth,
      mapHeight,
      strategicDataKeys: Object.keys(strategicData || {}),
      ctxType: ctx?.constructor?.name,
      ctxCanvas: ctx?.canvas?.id,
      ctxCanvasWidth: ctx?.canvas?.width,
      ctxCanvasHeight: ctx?.canvas?.height
    });
    
    // Calculate dynamic icon size based on canvas size
    const iconSize = Math.max(16, Math.min(48, canvasSize * 0.05)); // Scale between 16-48px based on canvas size

    // Calculate coordinate bounds from actual data
    const coordinateBounds = this.calculateCoordinateBounds(strategicData);
    console.log('🗺️ Calculated coordinate bounds for drawing:', coordinateBounds);
    
    // Cache the coordinate bounds for this canvas to use in tooltips
    this.coordinateBoundsCache.set(canvasId, coordinateBounds);

    // Combine DOO and JASS data (both arrays may contain data)
    const combinedGoldmines = [
      ...(strategicData.dooGoldmines || []),
      ...(strategicData.jassGoldmines || [])
    ];
    const combinedCreepUnits = [
      ...(strategicData.dooCreepUnits || []),
      ...(strategicData.jassCreepUnits || [])
    ];
    const combinedNeutralStructures = [
      ...(strategicData.dooNeutralStructures || []),
      ...(strategicData.jassNeutralStructures || [])
    ];
    const combinedStartingPositions = [
      ...(strategicData.dooStartingPositions || []),
      ...(strategicData.jassStartingPositions || []),
      ...(strategicData.starting_positions || [])
    ];

    // Deduplicate all data sources
    const goldmines = this.deduplicateElements(combinedGoldmines, 'goldmine');
    const creepUnits = combinedCreepUnits; // Will be deduplicated in groupCreepsIntoCamps
    const neutralStructures = this.deduplicateElements(combinedNeutralStructures, 'structure');
    const startingPositions = this.deduplicateElements(combinedStartingPositions, 'start_position');

    // Enhanced debugging for fullscreen mode
    const isFullscreen = canvasId.includes('fullscreen');
    console.log(`🎯 War3 Overlay Debug [${isFullscreen ? 'FULLSCREEN' : 'MODAL'}]:`, {
      goldmines: goldmines.length,
      creepUnits: creepUnits.length,
      neutralStructures: neutralStructures.length,
      startingPositions: startingPositions.length,
      mapSize: `${mapWidth}x${mapHeight}`,
      canvasSize,
      iconSize,
      canvasId
    });

    // Enhanced debugging for missing data
    console.log('📊 Raw strategic data structure:', strategicData);
    console.log('🔍 Combined data arrays:', {
      dooGoldmines: strategicData.dooGoldmines?.length || 0,
      jassGoldmines: strategicData.jassGoldmines?.length || 0,
      dooCreepUnits: strategicData.dooCreepUnits?.length || 0,
      jassCreepUnits: strategicData.jassCreepUnits?.length || 0,
      dooNeutralStructures: strategicData.dooNeutralStructures?.length || 0,
      jassNeutralStructures: strategicData.jassNeutralStructures?.length || 0,
      dooStartingPositions: strategicData.dooStartingPositions?.length || 0,
      jassStartingPositions: strategicData.jassStartingPositions?.length || 0,
      starting_positions: strategicData.starting_positions?.length || 0
    });
    
    if (goldmines.length === 0) {
      console.warn('⚠️ NO GOLDMINES FOUND! Checking raw data...');
      console.log('   dooGoldmines:', strategicData.dooGoldmines);
      console.log('   jassGoldmines:', strategicData.jassGoldmines);
    }
    if (startingPositions.length === 0) {
      console.warn('⚠️ NO STARTING POSITIONS FOUND! Checking raw data...');
      console.log('   dooStartingPositions:', strategicData.dooStartingPositions);
      console.log('   jassStartingPositions:', strategicData.jassStartingPositions);
      console.log('   starting_positions:', strategicData.starting_positions);
    }
    if (creepUnits.length === 0) {
      console.warn('⚠️ NO CREEP UNITS FOUND! Checking raw data...');
      console.log('   dooCreepUnits:', strategicData.dooCreepUnits);
      console.log('   jassCreepUnits:', strategicData.jassCreepUnits);
    }

    // Draw goldmines
    console.log(`💰 Drawing ${goldmines.length} goldmines with canvasSize: ${canvasSize}, iconSize: ${iconSize}`);
    console.log(`🎯 Coordinate bounds for transformation:`, coordinateBounds);
    for (const [index, goldmine] of goldmines.entries()) {
      const screenPos = this.transformCoordinates(goldmine.x, goldmine.y, mapWidth, mapHeight, canvasSize, coordinateBounds);
      console.log(`🎨 Drawing goldmine ${index + 1}: world(${goldmine.x}, ${goldmine.y}) → screen(${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)}) on ${canvasSize}x${canvasSize} canvas`);
      await this.drawIcon(ctx, 'goldmine', screenPos.x, screenPos.y, iconSize);
    }

    // Group and draw creep camps
    const creepCamps = this.groupCreepsIntoCamps(creepUnits);
    console.log(`👹 Drawing ${creepCamps.length} creep camps from ${creepUnits.length} creep units`);
    console.log('🔍 Creep unit sample data:', creepUnits.slice(0, 3)); // Show first 3 creep units
    
    for (const [index, camp] of creepCamps.entries()) {
      const difficulty = this.calculateCampDifficulty(camp.creeps);
      const iconType = `creep_${difficulty}`;
      const avgLevel = camp.creeps.reduce((sum, creep) => sum + (creep.level || 1), 0) / camp.creeps.length;
      console.log(`🏕️ Camp ${index + 1}: ${camp.creeps.length} creeps, avg level ${avgLevel.toFixed(1)}, difficulty: ${difficulty}`);
      console.log('   Creeps in camp:', camp.creeps.map(c => ({ id: c.unit_id, level: c.level, name: c.name })));
      
      const screenPos = this.transformCoordinates(camp.x, camp.y, mapWidth, mapHeight, canvasSize, coordinateBounds);
      console.log(`🎨 Drawing creep camp ${index + 1}: world(${camp.x}, ${camp.y}) → screen(${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)}) with icon type: ${iconType}`);
      await this.drawIcon(ctx, iconType, screenPos.x, screenPos.y, iconSize);
    }

    // Draw starting positions
    console.log(`🎯 Drawing ${startingPositions.length} starting positions`);
    for (const [index, startPos] of startingPositions.entries()) {
      const screenPos = this.transformCoordinates(startPos.x, startPos.y, mapWidth, mapHeight, canvasSize, coordinateBounds);
      console.log(`🎨 Drawing starting position ${index + 1}: world(${startPos.x}, ${startPos.y}) → screen(${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)})`);
      await this.drawIcon(ctx, 'starting_position', screenPos.x, screenPos.y, iconSize);
    }

    // Draw neutral structures (shops)
    console.log(`🏪 Drawing ${neutralStructures.length} neutral structures`);
    for (const [index, structure] of neutralStructures.entries()) {
      const screenPos = this.transformCoordinates(structure.x, structure.y, mapWidth, mapHeight, canvasSize, coordinateBounds);
      if (this.isShop(structure.unit_id)) {
        console.log(`🎨 Drawing shop ${index + 1}: world(${structure.x}, ${structure.y}) → screen(${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)})`);
        await this.drawIcon(ctx, 'shop', screenPos.x, screenPos.y, iconSize);
      } else {
        console.log(`🎨 Drawing NPC structure ${index + 1}: world(${structure.x}, ${structure.y}) → screen(${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)})`);
        await this.drawIcon(ctx, 'npc_structure', screenPos.x, screenPos.y, iconSize);
      }
    }
    
    // Final summary
    console.log(`✅ War3 Overlay rendering complete for ${canvasId}:`, {
      goldmines: goldmines.length,
      creepCamps: creepCamps.length,
      startingPositions: startingPositions.length,
      neutralStructures: neutralStructures.length,
      totalElements: goldmines.length + creepCamps.length + startingPositions.length + neutralStructures.length
    });
  }

  /**
   * Draw icon on canvas
   */
  async drawIcon(ctx, iconType, x, y, size) {
    console.log(`🎨 drawIcon called: type=${iconType}, x=${x.toFixed(1)}, y=${y.toFixed(1)}, size=${size}`);
    console.log(`🔍 Icon cache contents:`, Array.from(this.iconCache.keys()));
    
    const icon = this.iconCache.get(iconType);
    if (icon) {
      console.log(`✅ Icon found for ${iconType}, drawing at (${x.toFixed(1)}, ${y.toFixed(1)}) with size ${size}`);
      ctx.drawImage(icon, x - size/2, y - size/2, size, size);
    } else {
      console.error(`❌ No icon found for type: ${iconType}. Available icons:`, Array.from(this.iconCache.keys()));
      console.error(`❌ Icon cache size: ${this.iconCache.size}`);
      console.error(`❌ Requested icon type: ${iconType}`);
      
      // Try to find similar icon types
      const availableIcons = Array.from(this.iconCache.keys());
      const similarIcons = availableIcons.filter(available => 
        available.includes(iconType.split('_')[0]) || 
        iconType.includes(available.split('_')[0])
      );
      if (similarIcons.length > 0) {
        console.warn(`⚠️ Similar icons found: ${similarIcons.join(', ')}`);
      }
    }
  }

  /**
   * Calculate coordinate bounds from actual data
   */
  calculateCoordinateBounds(strategicData) {
    const allCoordinates = [];

    // Collect all coordinates from all sources
    const sources = [
      strategicData.dooGoldmines || [],
      strategicData.jassGoldmines || [],
      strategicData.dooCreepUnits || [],
      strategicData.jassCreepUnits || [],
      strategicData.dooNeutralStructures || [],
      strategicData.jassNeutralStructures || [],
      strategicData.dooStartingPositions || [],
      strategicData.jassStartingPositions || [],
      strategicData.starting_positions || []
    ];

    sources.forEach(source => {
      source.forEach(item => {
        if (item.x !== undefined && item.y !== undefined) {
          allCoordinates.push({ x: item.x, y: item.y });
        }
      });
    });

    if (allCoordinates.length === 0) {
      // Fallback to map size if no coordinates found
      const mapSize = 96; // Default reasonable size
      const halfSize = mapSize * 32;
      return {
        minX: -halfSize,
        maxX: halfSize,
        minY: -halfSize,
        maxY: halfSize
      };}

    const xs = allCoordinates.map(c => c.x);
    const ys = allCoordinates.map(c => c.y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };}

  /**
   * Transform War3 coordinates to screen coordinates
   */
  transformCoordinates(worldX, worldY, mapWidth, mapHeight, canvasSize, coordinateBounds = null) {
    // Use provided bounds or calculate default bounds
    let bounds;
    if (coordinateBounds) {
      bounds = coordinateBounds;
    } else {
      // Fallback to traditional calculation
      const halfMapWidth = mapWidth * 32;
      const halfMapHeight = mapHeight * 32;
      bounds = {
        minX: -halfMapWidth,
        maxX: halfMapWidth,
        minY: -halfMapHeight,
        maxY: halfMapHeight
      };
    }

    // Add 10% padding to bounds to ensure everything fits
    const xRange = bounds.maxX - bounds.minX;
    const yRange = bounds.maxY - bounds.minY;
    const xPadding = xRange * 0.1;
    const yPadding = yRange * 0.1;
    
    const paddedBounds = {
      minX: bounds.minX - xPadding,
      maxX: bounds.maxX + xPadding,
      minY: bounds.minY - yPadding,
      maxY: bounds.maxY + yPadding
    };

    // Convert to 0-1 range using actual coordinate bounds
    const normalizedX = (worldX - paddedBounds.minX) / (paddedBounds.maxX - paddedBounds.minX);
    const normalizedY = 1 - (worldY - paddedBounds.minY) / (paddedBounds.maxY - paddedBounds.minY); // Flip Y axis
    
    const result = {
      x: normalizedX * canvasSize,
      y: normalizedY * canvasSize
    };
    
    // Only warn if coordinates are significantly outside canvas (allow small margin)
    const margin = 50;
    if (result.x < -margin || result.x > canvasSize + margin || result.y < -margin || result.y > canvasSize + margin) {
      console.warn(`⚠️ Coordinates significantly outside canvas! World: (${worldX}, ${worldY}) → Screen: (${result.x.toFixed(1)}, ${result.y.toFixed(1)}) | Bounds: X(${paddedBounds.minX.toFixed(1)}, ${paddedBounds.maxX.toFixed(1)}) Y(${paddedBounds.minY.toFixed(1)}, ${paddedBounds.maxY.toFixed(1)})`);
    }
    
    return result;}

  /**
   * Get comprehensive unit level database
   */
  getUnitLevels() {
    return {
      // Basic creeps (Level 1-2)
      'ngnw': 1, 'nkob': 1, 'nfsh': 1, 'nska': 1, 'nmg0': 1,
      'ngnb': 2, 'nkog': 2, 'nwlf': 2, 'ncrb': 2, 'nmur': 2, 'nskm': 2, 'nzom': 2, 'nspd': 2, 'ndog': 2, 'nmg1': 2, 'nsko': 2,
      
      // Medium creeps (Level 3-4)
      'nrog': 3, 'ndir': 3, 'nlob': 3, 'nfgu': 3, 'ngho': 3, 'nwsp': 3, 'nele': 3, 'nvdg': 3, 'ntrg': 3, 'nfro': 3, 'nfra': 3, 'nsnp': 3, 'nggr': 3, 'nfor': 3, 'nfpe': 3, 'ngna': 3, 'nlpd': 3, 'nltc': 3, 'nmcf': 3, 'nmit': 3, 'nmrv': 3, 'nnws': 3, 'nplb': 3, 'nskf': 3,
      'nass': 2, 'nftr': 4, 'nban': 4, 'nubr': 4, 'nrel': 4, 'nvdw': 4, 'ners': 4, 'ntrt': 4, 'nwwd': 4, 'nfrb': 3, 'ndrn': 4, 'nggb': 4, 'nmks': 4, 'nhar': 4, 'nstb': 4, 'nfur': 4, 'nfpl': 4, 'nfpt': 3, 'ngnv': 4, 'nlds': 4, 'nlpr': 4, 'nmtw': 4, 'nogr': 4, 'nplg': 4, 'nsgn': 4,
      
      // Strong creeps (Level 5-6)
      'nwzr': 5, 'nnec': 5, 'nfov': 5, 'nerw': 5, 'nitt': 5, 'nice': 5, 'nstl': 5, 'nfrl': 5, 'nhaw': 5, 'nmsn': 5, 'nrdk': 5, 'nomg': 5, 'ndrg': 6, 'nrvs': 6, 'nsat': 6, 'nfrs': 6, 'nmkd': 6, 'nerd': 6, 'nsln': 6, 'nitw': 4, 'nits': 6, 'nrvi': 4, 'ncer': 7, 'nchp': 5, 'nhaq': 7, 'nmkg': 5, 'ngrk': 6, 'nhyd': 5, 'nith': 6, 'nlkl': 6, 'nogl': 6, 'nsgh': 7,
      
      // Elite creeps (Level 7+)
      'nfbr': 7, 'ngrw': 7, 'ndrh': 7, 'nsth': 7, 'nrde': 7, 'nlich': 8, 'nrdr': 8, 'ndrw': 8, 'nmdm': 8, 'ngre': 8, 'nahy': 8, 'nbdr': 9, 'nwrg': 9, 'ncea': 8, 'ncen': 6, 'nnec': 5, 'nbdm': 11, 'nbwm': 12, 'nrdm': 11, 'ngrm': 12, 'ngdr': 10,
      
      // Special units
      'nadk': 7, 'nadr': 5, 'nadw': 6, 'nano': 4, 'nanw': 3, 'nbda': 6, 'nbds': 5, 'ndru': 3,
      
      // Additional missing units found in maps
      'nltl': 4, 'nenp': 5, 'ngdk': 3, 'ngrw': 7, 'nsbm': 3, 'nsgt': 6, 'nssp': 2,
      'nfsp': 4, 'nftr': 4, 'nftt': 3, 'nthl': 7, 'nstw': 6, 'nftk': 4, 'njg1': 5,
      'nfsh': 4, 'nftb': 3, 'nspr': 4, 'ndtr': 5, 'nsat': 6, 'nfrb': 3, 'nsty': 6,
      'nsrv': 5, 'nstl': 5, 'nrvf': 4, 'nfrs': 5, 'ndtt': 4, 'nsts': 7, 'nfrl': 5,
      
      // More comprehensive list
      'ncks': 6, 'ncim': 5, 'ncea': 4, 'nqbh': 3, 'nrzm': 4, 'nrzg': 3, 'ncer': 6,
      'nrzs': 5, 'nspp': 5, 'nskk': 2, 'nhmc': 7, 'nehy': 8, 'ncrb': 2, 'nenf': 4,
      'nowk': 5, 'nnht': 4, 'ncen': 6, 'narg': 5, 'nowb': 7, 'nina': 4, 'ndrh': 7,
      'nfgu': 3, 'nowe': 6, 'nban': 4, 'nrog': 3, 'nmpg': 3, 'ndr3': 9, 'nwlt': 2,
      'nmrr': 2, 'nepl': 4, 'nspg': 1, 'nspb': 3, 'nfr1': 3, 'nfr2': 5, 'ngst': 2,
      'nwld': 6, 'nwlg': 4, 'necr': 5, 'nskm': 3, 'nsel': 2, 'nsth': 7, 'ndtw': 8,
      'nfra': 4, 'nmr8': 4, 'nass': 2, 'nwrg': 9, 'nwzd': 5, 'nwzg': 4, 'nsgg': 8,
      'nbld': 4, 'nshw': 3, 'ngno': 2, 'nogo': 4, 'ndqn': 12, 'nlv1': 3, 'nlv2': 5,
      'nlv3': 8, 'nmr2': 3, 'nrwm': 2, 'nrdr': 9, 'nfro': 3, 'nech': 1, 'nten': 2,
      'nsc2': 3, 'ntkw': 4, 'ntkt': 3, 'ntkf': 4, 'ntkc': 7, 'ntkh': 4, 'ntks': 5,
      'nbdw': 8, 'ndrw': 8, 'ndrp': 6, 'ndrm': 7, 'ndrd': 9, 'nfpu': 6, 'nsno': 1,
      'nsea': 4, 'nwns': 6, 'rwat': 1, 'rreb': 1
    };}

  /**
   * Get non-aggressive critter units that should be filtered out
   */
  getNonAggressiveUnits() {
    return new Set([
      'nshe', // Sheep
      'npig', // Pig
      'nder', // Deer
      'nrac', // Raccoon
      'npng', // Penguin
      'nsno', // Snow Owl (typically decorative)
      'ncrb', // Crab (usually non-aggressive)
      'nech', // Echo (usually decorative)
      'rwat', // Water (not a unit)
      'rreb', // Rebirth (not a unit)
      'nspg', // Spider (small, usually decorative)
      'ndog', // Dog (usually non-aggressive)
      'nwsp', // Wisp (usually non-aggressive)
      'nten'  // Tentacle (usually decorative if level 2)
    ]);}

  /**
   * Deduplicate elements based on coordinates and unit type
   */
  deduplicateElements(elements, elementType) {
    if (!elements || elements.length === 0) return [];const seen = new Map();
    const deduplicated = [];

    for (const element of elements) {
      // Create a unique key based on coordinates and unit type
      const unitId = element.unit_id || element.type || 'unknown';
      const key = `${unitId}_${Math.round(element.x)}_${Math.round(element.y)}`;
      
      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(element);
      } else {
        console.log(`🔄 Deduplicated ${elementType}: ${unitId} at (${element.x}, ${element.y})`);
      }
    }

    const duplicatesRemoved = elements.length - deduplicated.length;
    if (duplicatesRemoved > 0) {
      console.log(`🧹 Removed ${duplicatesRemoved} duplicate ${elementType}s (${elements.length} → ${deduplicated.length})`);
    }

    return deduplicated;}

  /**
   * Deduplicate creeps based on coordinates and unit type
   */
  deduplicateCreeps(creepUnits) {
    return this.deduplicateElements(creepUnits, 'creep');}

  /**
   * Filter out non-aggressive creeps
   */
  filterAggressiveCreeps(creepUnits) {
    if (!creepUnits || creepUnits.length === 0) return [];const nonAggressiveUnits = this.getNonAggressiveUnits();
    const unitLevels = this.getUnitLevels();
    
    return creepUnits.filter(creep => {
      const unitId = creep.unit_id;if (nonAggressiveUnits.has(unitId)) {
        console.log(`🚫 Filtering out non-aggressive unit: ${unitId} (${creep.name || 'Unknown'})`);
        return false;}
      
      // Filter out unknown units with very low levels (likely critters)
      const level = unitLevels[unitId];
      if (!level && (!creep.level || creep.level <= 1)) {
        console.log(`🚫 Filtering out unknown low-level unit: ${unitId} (${creep.name || 'Unknown'})`);
        return false;}
      
      return true;});
  }

  /**
   * Get unit level with proper database lookup
   */
  getUnitLevel(unitId, creepData = null) {
    const unitLevels = this.getUnitLevels();
    
    // First try the database
    if (unitLevels[unitId]) {
      return unitLevels[unitId];}
    
    // Then try the creep data itself
    if (creepData && creepData.level) {
      return creepData.level;}
    
    // Default to level 2 for unknown aggressive units
    return 2;}

  /**
   * Group creeps into camps using distance clustering
   */
  groupCreepsIntoCamps(creepUnits) {
    if (!creepUnits || creepUnits.length === 0) return [];const deduplicatedCreeps = this.deduplicateCreeps(creepUnits);
    
    // Then filter out non-aggressive creeps
    const aggressiveCreeps = this.filterAggressiveCreeps(deduplicatedCreeps);
    console.log(`🎯 Processed creeps: ${creepUnits.length} → ${deduplicatedCreeps.length} (deduplicated) → ${aggressiveCreeps.length} (filtered)`);

    const camps = [];
    const processed = new Set();
    const CAMP_DISTANCE = 1024; // Back to original distance - it was more accurate

    for (let i = 0; i < aggressiveCreeps.length; i++) {
      if (processed.has(i)) continue;

      const camp = {
        creeps: [aggressiveCreeps[i]],
        x: aggressiveCreeps[i].x,
        y: aggressiveCreeps[i].y
      };

      // Find nearby creeps - but check distance to ANY creep in camp, not just the first
      for (let j = i + 1; j < aggressiveCreeps.length; j++) {
        if (processed.has(j)) continue;

        // Check distance to the closest creep already in the camp
        const minDistanceTocamp = Math.min(
          ...camp.creeps.map(campCreep => {
            return Math.sqrt(
              Math.pow(aggressiveCreeps[j].x - campCreep.x, 2) +
              Math.pow(aggressiveCreeps[j].y - campCreep.y, 2)
            );})
        );

        if (minDistanceTocamp <= CAMP_DISTANCE) {
          camp.creeps.push(aggressiveCreeps[j]);
          processed.add(j);
        }
      }

      // Calculate camp center
      if (camp.creeps.length > 1) {
        camp.x = camp.creeps.reduce((sum, creep) => sum + creep.x, 0) / camp.creeps.length;
        camp.y = camp.creeps.reduce((sum, creep) => sum + creep.y, 0) / camp.creeps.length;
      }

      camps.push(camp);
      processed.add(i);
    }

    return camps;}

  /**
   * Calculate camp difficulty based on creep levels
   */
  calculateCampDifficulty(creeps) {
    if (!creeps || creeps.length === 0) return 'easy';const totalLevel = creeps.reduce((sum, creep) => {
      const level = this.getUnitLevel(creep.unit_id, creep);
      return sum + level;}, 0);
    const avgLevel = totalLevel / creeps.length;

    if (avgLevel <= 2.5) return 'easy';if (avgLevel <= 4.0) return 'medium';return 'hard';}

  /**
   * Check if unit is a shop
   */
  isShop(unitId) {
    const shopUnits = ['ntav', 'nmrc', 'nmrd', 'ngad', 'nshp', 'nshf', 'ngme', 'nmrk'];
    return shopUnits.includes(unitId);}

  /**
   * Check if unit is a mercenary camp (sells units, not items)
   */
  isMercenaryCamp(unitId) {
    const mercenaryUnits = ['nmrc', 'nmrd', 'nmer'];
    return mercenaryUnits.includes(unitId);}

  /**
   * Check if unit is an item shop (sells consumables/items)
   */
  isItemShop(unitId) {
    const itemShopUnits = ['ntav', 'ngad', 'nshp', 'nshf', 'ngme', 'nmrk'];
    return itemShopUnits.includes(unitId);}

  /**
   * Get default items for shop types when specific data isn't available
   */
  getDefaultShopItems(unitId) {
    const defaultItems = {
      'ntav': [  // Tavern - Standard War3 tavern items
        'Potion of Healing (2) - 125g',
        'Potion of Mana (2) - 75g',
        'Potion of Greater Healing (1) - 250g',
        'Potion of Greater Mana (1) - 150g',
        'Scroll of Town Portal (2) - 300g',
        'Tome of Knowledge (1) - 400g',
        'Dust of Appearance (2) - 75g',
        'Scroll of Speed (1) - 150g',
        'Potion of Restoration (1) - 200g'
      ],
      'ngad': [  // Goblin Alchemist
        'Goblin Zeppelin (1) - 200g',
        'Healing Potion (3) - 100g',
        'Goblin Sappers (2) - 200g',
        'Pocket Factory (1) - 300g',
        'Demolish (1) - 150g'
      ],
      'nshp': [  // Goblin Shipyard
        'Goblin Destroyer (1) - 400g',
        'Transport Ship (1) - 200g',
        'Frigate (1) - 350g'
      ],
      'nshf': [  // Shredder
        'Goblin Shredder (1) - 300g',
        'Lumber upgrades',
        'Mechanical repairs'
      ],
      'ngme': [  // Goblin Merchant - General consumables
        'Healing Salve (3) - 125g',
        'Clarity Potion (3) - 75g',
        'Scroll of Protection (2) - 200g',
        'Ivory Tower (1) - 125g',
        'Rod of Necromancy (1) - 175g',
        'Wand of Lightning Shield (1) - 150g',
        'Scroll of Animate Dead (1) - 200g'
      ],
      'nmrk': [  // Marketplace - Mixed goods
        'Circlet of Nobility (1) - 200g',
        'Gauntlets of Ogre Strength +3 (1) - 150g',
        'Slippers of Agility +3 (1) - 150g',
        'Mantle of Intelligence +3 (1) - 150g',
        'Ring of Protection +2 (1) - 175g',
        'Cloak of Shadows (1) - 175g',
        'Boots of Speed (1) - 100g'
      ],
      'nmrc': [  // Mercenary Camp
        'Dark Ranger (1) - 425g',
        'Pandaren Brewmaster (1) - 425g',
        'Beastmaster (1) - 425g',
        'Pit Lord (1) - 425g',
        'Naga Sea Witch (1) - 425g'
      ],
      'nmrd': [  // Mercenary Camp (variant)
        'Goblin Tinker (1) - 425g',
        'Fire Lord (1) - 425g',
        'Alchemist (1) - 425g',
        'Shadow Hunter (1) - 425g'
      ]
    };
    
    return defaultItems[unitId] || [];}

  /**
   * Parse map size string
   */
  parseMapSize(mapSize) {
    if (!mapSize) return null;const match = mapSize.match(/(\d+)x(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1]),
        height: parseInt(match[2])
      };}
    return null;}



  /**
   * Clean up existing tooltips for a canvas
   */
  cleanupTooltips(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;const existingTooltip = document.querySelector(`[data-canvas-id="${canvasId}"]`);
    if (existingTooltip) {
      existingTooltip.remove();
    }

    // Remove event handlers if they exist
    if (canvas._tooltipHandlers) {
      canvas.removeEventListener('mousemove', canvas._tooltipHandlers.mousemove);
      canvas.removeEventListener('mouseleave', canvas._tooltipHandlers.mouseleave);
      delete canvas._tooltipHandlers;
    }

    // Remove tooltip initialization flag
    canvas.removeAttribute('data-tooltips-initialized');
  }

  /**
   * Add hover tooltips to canvas
   */
  addHoverTooltips(canvasId, mapData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn('War3OverlayRenderer: Canvas not found for tooltips:', canvasId);
      return;}

    console.log('🎯 Setting up tooltips for canvas:', canvasId, 'Canvas element:', canvas);

    // Remove any existing tooltip for this canvas to prevent duplicates
    const existingTooltip = document.querySelector(`[data-canvas-id="${canvasId}"]`);
    if (existingTooltip) {
      console.log('🧹 Removing existing tooltip for:', canvasId);
      existingTooltip.remove();
    }

    // Remove existing event handlers if they exist
    if (canvas._tooltipHandlers) {
      console.log('🧹 Removing existing event handlers for:', canvasId);
      canvas.removeEventListener('mousemove', canvas._tooltipHandlers.mousemove);
      canvas.removeEventListener('mouseleave', canvas._tooltipHandlers.mouseleave);
      delete canvas._tooltipHandlers;
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'war3-overlay-tooltip';
    tooltip.setAttribute('data-canvas-id', canvasId);
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 99999;
      display: none;
      max-width: 200px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(tooltip);

    console.log('🎯 Tooltip element created and added to DOM for canvas:', canvasId);

    const mouseMoveHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      
      // Account for canvas scaling - convert from element coordinates to canvas coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = rawX * scaleX;
      const y = rawY * scaleY;
      
      console.log(`🖱️ Mouse: raw(${rawX.toFixed(1)}, ${rawY.toFixed(1)}) → scaled(${x.toFixed(1)}, ${y.toFixed(1)}) | canvas: ${canvas.width}x${canvas.height} | element: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)} | scale: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);
      
      const tooltipData = this.getTooltipData(x, y, mapData, canvas.width, canvas.height, canvasId);
      
      if (tooltipData) {
        tooltip.innerHTML = tooltipData.text;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY - 40) + 'px';
        canvas.style.cursor = 'pointer';
        console.log('🎯 Tooltip displayed:', tooltipData.text.replace(/<[^>]*>/g, '').trim());
      } else {
        tooltip.style.display = 'none';
        canvas.style.cursor = 'default';
      }
    };

    const mouseLeaveHandler = () => {
      tooltip.style.display = 'none';
      canvas.style.cursor = 'default';
    };

    console.log('🎯 Adding event listeners to canvas:', canvasId);
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mouseleave', mouseLeaveHandler);

    // Store handlers for potential cleanup
    canvas._tooltipHandlers = {
      mousemove: mouseMoveHandler,
      mouseleave: mouseLeaveHandler,
      tooltip: tooltip
    };

    console.log('✅ Tooltips fully initialized for canvas:', canvasId);

    // Clean up tooltip when canvas is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === canvas) {
            tooltip.remove();
            observer.disconnect();
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Get tooltip data for position
   */
  getTooltipData(screenX, screenY, mapData, canvasWidth, canvasHeight, canvasId) {
    const strategicData = mapData.strategicData || {};
    const mapSize = this.parseMapSize(mapData.mapSize);
    const mapWidth = mapSize?.width || 256;
    const mapHeight = mapSize?.height || 256;
    
    // Use the same coordinate bounds that were used for drawing
    const coordinateBounds = this.coordinateBoundsCache.get(canvasId);
    if (!coordinateBounds) {
      console.warn('⚠️ No cached coordinate bounds found for canvas:', canvasId, 'Calculating fresh bounds...');
      // Fallback to calculating fresh bounds if cache miss
      const fallbackBounds = this.calculateCoordinateBounds(strategicData);
      this.coordinateBoundsCache.set(canvasId, fallbackBounds);
      console.log('🗺️ Calculated fallback coordinate bounds for tooltips:', fallbackBounds);
    } else {
      console.log('✅ Using cached coordinate bounds for tooltips:', coordinateBounds);
    }

    const finalBounds = coordinateBounds || this.coordinateBoundsCache.get(canvasId);
    const HOVER_RADIUS = 30; // Increased radius for easier hovering

    // Declare all data arrays at the top to avoid temporal dead zone issues
    const combinedGoldmines = [
      ...(strategicData.dooGoldmines || []),
      ...(strategicData.jassGoldmines || [])
    ];
    
    const combinedCreepUnits = [
      ...(strategicData.dooCreepUnits || []),
      ...(strategicData.jassCreepUnits || [])
    ];
    
    const combinedNeutralStructures = [
      ...(strategicData.dooNeutralStructures || []),
      ...(strategicData.jassNeutralStructures || [])
    ];
    
    const combinedStartingPositions = [
      ...(strategicData.dooStartingPositions || []),
      ...(strategicData.jassStartingPositions || []),
      ...(strategicData.starting_positions || [])
    ];

    // Deduplicate all data sources (same as in drawStrategicElements)
    const goldmines = this.deduplicateElements(combinedGoldmines, 'goldmine');
    const creepUnits = this.deduplicateCreeps(combinedCreepUnits); // Use same deduplication as camps
    const neutralStructures = this.deduplicateElements(combinedNeutralStructures, 'structure');
    const startingPositions = this.deduplicateElements(combinedStartingPositions, 'start_position');
    
    console.log(`🔍 Tooltip check: Found ${goldmines.length} goldmines to check for hover at (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
    console.log(`📏 Tooltip canvas dimensions: ${canvasWidth}x${canvasHeight}, map dimensions: ${mapWidth}x${mapHeight}`);
    if (goldmines.length > 0) {
      console.log('💰 First goldmine sample:', goldmines[0]);
    }
    
    // Debug: Show available data structure
    console.log('📊 Available strategic data keys:', Object.keys(strategicData));
    if (neutralStructures.length > 0) {
      console.log('🏢 First neutral structure sample:', neutralStructures[0]);
    }
    if (creepUnits.length > 0) {
      console.log('👹 First creep unit sample:', creepUnits[0]);
    }
    
    for (const [index, goldmine] of goldmines.entries()) {
      const screenPos = this.transformCoordinates(goldmine.x, goldmine.y, mapWidth, mapHeight, canvasWidth, finalBounds);
      const distance = Math.sqrt(Math.pow(screenX - screenPos.x, 2) + Math.pow(screenY - screenPos.y, 2));
      
      console.log(`💰 Goldmine ${index + 1}: world(${goldmine.x}, ${goldmine.y}) → screen(${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)}) | mouse(${screenX.toFixed(1)}, ${screenY.toFixed(1)}) | distance: ${distance.toFixed(1)}/${HOVER_RADIUS}`);
      
      if (distance <= HOVER_RADIUS) {
        const goldAmount = goldmine.gold || goldmine.amount || 12500; // Default War3 goldmine amount
        console.log(`✅ Goldmine ${index + 1} hovered! Showing tooltip with ${goldAmount} gold.`);
        
        let tooltipText = `<strong>Goldmine</strong><br/>Gold: ${goldAmount.toLocaleString()}`;
        
        // Add additional goldmine info if available
        if (goldmine.unit_id && goldmine.unit_id !== 'ngol') {
          tooltipText += `<br/>Type: ${goldmine.unit_id}`;
        }
        if (goldmine.hitPoints) {
          tooltipText += `<br/>HP: ${goldmine.hitPoints}`;
        }
        if (goldmine.owningPlayer !== undefined) {
          tooltipText += `<br/>Owner: Player ${goldmine.owningPlayer + 1}`;
        }
        
        return {
          text: tooltipText
        };}
    }

    // Check creep camps (using data already declared at top)
    const creepCamps = this.groupCreepsIntoCamps(creepUnits);
    
    for (const camp of creepCamps) {
      const screenPos = this.transformCoordinates(camp.x, camp.y, mapWidth, mapHeight, canvasWidth, finalBounds);
      const distance = Math.sqrt(Math.pow(screenX - screenPos.x, 2) + Math.pow(screenY - screenPos.y, 2));
      
      if (distance <= HOVER_RADIUS) {
        const difficulty = this.calculateCampDifficulty(camp.creeps);
        const creepCount = camp.creeps.length;
        const avgLevel = camp.creeps.reduce((sum, creep) => {
          const level = this.getUnitLevel(creep.unit_id, creep);
          return sum + level;}, 0) / creepCount;
        
        // Build detailed creep list
        const creepList = camp.creeps.map(creep => {
          const name = creep.name || creep.unit_id || 'Unknown';
          const level = this.getUnitLevel(creep.unit_id, creep);
          return `• Lv${level} ${name}`;}).join('<br/>');
        
        return {
          text: `<strong>Creep Camp (${difficulty.toUpperCase()})</strong><br/>Units: ${creepCount} | Avg Level: ${avgLevel.toFixed(1)}<br/><br/>${creepList}`
        };}
    }

    // Check starting positions (using data already declared at top)
    for (let i = 0; i < startingPositions.length; i++) {
      const startPos = startingPositions[i];
      const screenPos = this.transformCoordinates(startPos.x, startPos.y, mapWidth, mapHeight, canvasWidth, finalBounds);
      const distance = Math.sqrt(Math.pow(screenX - screenPos.x, 2) + Math.pow(screenY - screenPos.y, 2));
      
      if (distance <= HOVER_RADIUS) {
        return {
          text: `<strong>Starting Position</strong><br/>Player ${startPos.player !== undefined ? startPos.player + 1 : i + 1}`
        };}
    }

    // Check neutral structures (using data already declared at top)
    for (const structure of neutralStructures) {
      const screenPos = this.transformCoordinates(structure.x, structure.y, mapWidth, mapHeight, canvasWidth, finalBounds);
      const distance = Math.sqrt(Math.pow(screenX - screenPos.x, 2) + Math.pow(screenY - screenPos.y, 2));
      
      if (distance <= HOVER_RADIUS) {
        const isShopUnit = this.isShop(structure.unit_id);
        const isMercenary = this.isMercenaryCamp(structure.unit_id);
        const isItemShop = this.isItemShop(structure.unit_id);
        const structureName = structure.name || structure.unit_id || 'Unknown Structure';
        
        console.log('🏪 Shop structure debug:', {
          unit_id: structure.unit_id,
          isShop: isShopUnit,
          isMercenary: isMercenary,
          isItemShop: isItemShop,
          name: structureName,
          mapDataShopInventories: mapData.strategicData?.shopInventories,
          fullStructure: structure
        });
        
        // Determine shop type for display
        let shopType = 'Neutral Structure';
        if (isMercenary) {
          shopType = 'Mercenary Camp';
        } else if (isItemShop) {
          shopType = 'Item Shop';
        } else if (isShopUnit) {
          shopType = 'Shop';
        }
        
        let tooltipText = `<strong>${shopType}</strong><br/>${structureName}`;
        
        // Handle mercenary camps differently
        if (isMercenary) {
          tooltipText += `<br/><br/><strong>Services:</strong><br/>• Hire neutral heroes<br/>• Recruit mercenary units<br/>• Access unique abilities`;
          
          // Check if there's specific mercenary data
          const mercenaryData = mapData.strategicData?.mercenaryInventories;
          if (mercenaryData) {
            const matchingMerc = mercenaryData.find(merc => {
              const distance = Math.sqrt(
                Math.pow(merc.x - structure.x, 2) + 
                Math.pow(merc.y - structure.y, 2)
              );
              return distance < 100;});
            
            if (matchingMerc && matchingMerc.units && matchingMerc.units.length > 0) {
              const units = matchingMerc.units.map(unit => {
                const unitName = unit.name || unit.unit_id || 'Unknown Unit';
                const cost = unit.cost ? ` - ${unit.cost}g` : '';
                return `• ${unitName}${cost}`;}).join('<br/>');
              tooltipText += `<br/><br/><strong>Available Units:</strong><br/>${units}`;
            }
          }
        } else if (isItemShop) {
          // Handle item shops
          const shopItems = structure.inventory || structure.items || structure.shop_items || structure.stock;
          if (shopItems && shopItems.length > 0) {
            console.log('🛍️ Found shop items:', shopItems);
            const items = shopItems.map(item => {
              const itemName = item.name || item.item_id || item.id || 'Unknown Item';
              const stock = item.stock || item.current_stock || item.max_stock;
              const stockText = stock ? ` (${stock})` : '';
              const cost = item.cost || item.price;
              const costText = cost ? ` - ${cost}g` : '';
              return `• ${itemName}${stockText}${costText}`;}).join('<br/>');
            tooltipText += `<br/><br/><strong>Items:</strong><br/>${items}`;
          } else {
            console.log('⚠️ Item shop detected but no items found. Checking for shop data in strategicData...');
            // Check if there's shop data in the strategic data
            const shopData = mapData.strategicData?.shopInventories;
            if (shopData) {
              console.log('🔍 Strategic shop data found:', shopData);
              // Find matching shop by coordinates
              const matchingShop = shopData.find(shop => {
                const distance = Math.sqrt(
                  Math.pow(shop.x - structure.x, 2) + 
                  Math.pow(shop.y - structure.y, 2)
                );
                return distance < 100;});
              
              if (matchingShop && matchingShop.items && matchingShop.items.length > 0) {
                console.log('✅ Found matching shop with items:', matchingShop);
                const items = matchingShop.items.map(item => {
                  const itemName = item.name || item.item_id || 'Unknown Item';
                  const stock = item.current_stock || item.max_stock;
                  const stockText = stock ? ` (${stock})` : '';
                  const cost = item.cost || item.price;
                  const costText = cost ? ` - ${cost}g` : '';
                  return `• ${itemName}${stockText}${costText}`;}).join('<br/>');
                tooltipText += `<br/><br/><strong>Items:</strong><br/>${items}`;
              } else {
                // Add default items based on shop type
                const defaultItems = this.getDefaultShopItems(structure.unit_id);
                if (defaultItems.length > 0) {
                  const items = defaultItems.map(item => `• ${item}`).join('<br/>');
                  tooltipText += `<br/><br/><strong>Typical Items:</strong><br/>${items}`;
                } else {
                  tooltipText += `<br/><br/><em>Shop inventory not available</em>`;
                }
              }
            } else {
              // Add default items based on shop type
              const defaultItems = this.getDefaultShopItems(structure.unit_id);
              if (defaultItems.length > 0) {
                const items = defaultItems.map(item => `• ${item}`).join('<br/>');
                tooltipText += `<br/><br/><strong>Typical Items:</strong><br/>${items}`;
              } else {
                tooltipText += `<br/><br/><em>Shop inventory not available</em>`;
              }
            }
          }
        }
        
        // Add drop table info if available
        if (structure.dropTable && structure.dropTable.length > 0) {
          const drops = structure.dropTable.map(drop => {
            const itemName = drop.name || drop.item_id || 'Unknown Item';
            const chance = drop.chance ? ` (${(drop.chance * 100).toFixed(1)}%)` : '';
            return `• ${itemName}${chance}`;}).join('<br/>');
          tooltipText += `<br/><br/><strong>Drops:</strong><br/>${drops}`;
        }
        
        // Add additional info if available
        if (structure.level) {
          tooltipText += `<br/>Level: ${structure.level}`;
        }
        if (structure.hitPoints) {
          tooltipText += `<br/>HP: ${structure.hitPoints}`;
        }
        
        return {
          text: tooltipText
        };}
    }

    return null;}
}

// Export for use in other modules
window.War3OverlayRenderer = War3OverlayRenderer; 