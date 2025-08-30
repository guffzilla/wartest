/**
 * TMapX Binary Data Parser
 * Decodes the ultra-compact binary format for maximum performance
 * Also includes PUD file parsing for direct file support
 */

export class BinaryMapParser {
    constructor() {
        // Terrain type mapping (reverse of Rust get_terrain_id)
        this.terrainTypes = [
            'water', 'water-deep', 'coast', 'grass', 'grass-light',
            'rock', 'rock-dark', 'dirt', 'sand', 'snow', 'forest', 'swamp'
        ];
        
        // Marker type mapping (reverse of Rust get_marker_type_id)
        this.markerTypes = ['player', 'goldmine', 'oil', 'resource'];
    }

    /**
     * Parse binary map data into usable map data structure
     * @param {Uint8Array} binaryData - Raw binary data from WASM
     * @returns {Object} Parsed map data with terrain runs and markers
     */
    parseBinaryData(binaryData) {
        let offset = 0;
        
        // Parse header
        const width = this.readUint16(binaryData, offset);
        offset += 2;
        
        const height = this.readUint16(binaryData, offset);
        offset += 2;
        
        const tileset = binaryData[offset];
        offset += 1;
        
        // Parse terrain runs
        const terrainRunsCount = this.readUint16(binaryData, offset);
        offset += 2;
        
        const terrainRuns = [];
        for (let i = 0; i < terrainRunsCount; i++) {
            const terrainTypeId = binaryData[offset];
            offset += 1;
            
            const tileId = this.readUint16(binaryData, offset);
            offset += 2;
            
            const count = this.readUint16(binaryData, offset);
            offset += 2;
            
            const startX = this.readUint16(binaryData, offset);
            offset += 2;
            
            const startY = this.readUint16(binaryData, offset);
            offset += 2;
            
            const terrainType = this.terrainTypes[terrainTypeId] || 'unknown';
            
            terrainRuns.push({
                terrain_type: terrainType,
                tile_id: tileId,
                count: count,
                start_x: startX,
                start_y: startY
            });
        }
        
        // Parse markers
        const markersCount = this.readUint16(binaryData, offset);
        offset += 2;
        
        const markers = [];
        for (let i = 0; i < markersCount; i++) {
            const markerTypeId = binaryData[offset];
            offset += 1;
            
            const x = this.readUint16(binaryData, offset);
            offset += 2;
            
            const y = this.readUint16(binaryData, offset);
            offset += 2;
            
            const amount = this.readUint32(binaryData, offset);
            offset += 4;
            
            const markerType = this.markerTypes[markerTypeId] || 'unknown';
            
            let label = '';
            if (markerType === 'player') {
                label = `Player ${i + 1}`;
            } else if (markerType === 'goldmine') {
                label = `Gold: ${amount.toLocaleString()}`;
            } else if (markerType === 'oil') {
                label = `Oil: ${amount.toLocaleString()}`;
            } else {
                label = `Resource: ${amount.toLocaleString()}`;
            }
            
            markers.push({
                x: x,
                y: y,
                marker_type: markerType,
                label: label,
                amount: amount > 0 ? amount : null
            });
        }
        
        return {
            width: width,
            height: height,
            tileset: tileset,
            terrain_runs: terrainRuns,
            markers: markers,
            terrain_stats: this.calculateTerrainStats(terrainRuns, width, height)
        };
    }

    /**
     * Calculate terrain statistics from terrain runs
     * @param {Array} terrainRuns - Array of terrain run objects
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {Object} Terrain statistics
     */
    calculateTerrainStats(terrainRuns, width, height) {
        const totalTiles = width * height;
        const stats = {
            water_percentage: 0,
            forest_percentage: 0,
            grass_percentage: 0,
            rock_percentage: 0,
            shore_percentage: 0,
            dirt_percentage: 0
        };
        
        let currentTile = 0;
        
        for (const run of terrainRuns) {
            const tilesInRun = run.count;
            
            // Calculate percentage for this run
            const runPercentage = (tilesInRun / totalTiles) * 100;
            
            // Map terrain types to stats
            switch (run.terrain_type) {
                case 'water':
                case 'water-deep':
                    stats.water_percentage += runPercentage;
                    break;
                case 'coast':
                    stats.shore_percentage += runPercentage;
                    break;
                case 'forest':
                    stats.forest_percentage += runPercentage;
                    break;
                case 'grass':
                case 'grass-light':
                    stats.grass_percentage += runPercentage;
                    break;
                case 'rock':
                case 'rock-dark':
                    stats.rock_percentage += runPercentage;
                    break;
                case 'dirt':
                    stats.dirt_percentage += runPercentage;
                    break;
            }
            
            currentTile += tilesInRun;
        }
        
        return stats;
    }

    /**
     * Read 16-bit unsigned integer from binary data
     * @param {Uint8Array} data - Binary data
     * @param {number} offset - Byte offset
     * @returns {number} 16-bit value
     */
    readUint16(data, offset) {
        return data[offset] | (data[offset + 1] << 8);
    }

    /**
     * Read 32-bit unsigned integer from binary data (little-endian)
     * @param {Uint8Array} data - Binary data
     * @param {number} offset - Byte offset
     * @returns {number} 32-bit value
     */
    readUint32(data, offset) {
        return data[offset] | 
               (data[offset + 1] << 8) | 
               (data[offset + 2] << 16) | 
               (data[offset + 3] << 24);
    }
    
    /**
     * Read 32-bit unsigned integer from binary data (big-endian)
     * @param {Uint8Array} data - Binary data
     * @param {number} offset - Byte offset
     * @returns {number} 32-bit value
     */
    readUint32BE(data, offset) {
        return (data[offset] << 24) | 
               (data[offset + 1] << 16) | 
               (data[offset + 2] << 8) | 
               data[offset + 3];
    }

    /**
     * Get terrain type at specific coordinates
     * @param {Array} terrainRuns - Array of terrain runs
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Map width
     * @returns {string} Terrain type
     */
    getTerrainTypeAt(terrainRuns, x, y, width) {
        let currentTile = 0;
        
        for (const run of terrainRuns) {
            if (currentTile + run.count > y * width + x) {
                return run.terrain_type;
            }
            currentTile += run.count;
        }
        
        return 'grass'; // Default fallback
    }

    /**
     * Get marker at specific coordinates
     * @param {Array} markers - Array of markers
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} tolerance - Click tolerance
     * @returns {Object|null} Marker object or null
     */
    getMarkerAt(markers, x, y, tolerance = 2) {
        return markers.find(marker => {
            return Math.abs(marker.x - x) <= tolerance && Math.abs(marker.y - y) <= tolerance;
        }) || null;
    }

    /**
     * Parse PUD file directly from binary data
     * @param {Uint8Array} pudData - Raw PUD file data
     * @returns {Object} Parsed map data
     */
    parsePudFile(pudData) {
        let offset = 0;
        
        console.log(`🔍 PUD file size: ${pudData.length} bytes`);
        console.log(`🔍 First 16 bytes: ${Array.from(pudData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        
        // Parse header
        const magic = String.fromCharCode(...pudData.slice(offset, offset + 4));
        offset += 4;
        
        console.log(`🔍 Magic bytes: "${magic}"`);
        
        if (magic !== 'TYPE') {
            throw new Error('Invalid PUD file: Expected "TYPE" magic bytes');
        }
        
        const fileSize = this.readUint32(pudData, offset);
        offset += 4;
        
        console.log(`🔍 File size from header: ${fileSize}`);
        
        const typeId = String.fromCharCode(...pudData.slice(offset, offset + 4));
        offset += 4;
        
        console.log(`🔍 Type ID: "${typeId}"`);
        
        // Skip TYPE section
        const typeLength = this.readUint32(pudData, offset);
        console.log(`🔍 Type section length (raw): ${typeLength}`);
        
        // Validate the type length to prevent jumping past file end
        if (typeLength > 1000 || typeLength < 0) {
            console.log(`🔍 Invalid type length ${typeLength}, trying big-endian...`);
            const typeLengthBE = this.readUint32BE(pudData, offset);
            console.log(`🔍 Type section length (big-endian): ${typeLengthBE}`);
            
            if (typeLengthBE > 1000 || typeLengthBE < 0) {
                console.log(`🔍 Both byte orders failed, using safe default of 8`);
                offset += 4 + 8; // Skip 8 bytes safely
            } else {
                offset += 4 + typeLengthBE;
            }
        } else {
            offset += 4 + typeLength;
        }
        
        console.log(`🔍 Type section length: ${typeLength}, new offset: ${offset}`);
        
        // Initialize map data
        const mapData = {
            width: 128,
            height: 128,
            tileset: 0,
            terrain_runs: [],
            markers: [],
            terrain_stats: {
                water_percentage: 0,
                forest_percentage: 0,
                grass_percentage: 0,
                rock_percentage: 0,
                shore_percentage: 0,
                dirt_percentage: 0
            }
        };
        
        // Parse chunks
        console.log(`🔍 Starting chunk parsing at offset ${offset}, file length ${pudData.length}`);
        let chunkCount = 0;
        
        while (offset < pudData.length) {
            if (offset + 8 > pudData.length) {
                console.log(`🔍 Not enough bytes for chunk header at offset ${offset}`);
                break;
            }
            
            const chunkName = String.fromCharCode(...pudData.slice(offset, offset + 4));
            const chunkSize = this.readUint32(pudData, offset + 4);
            offset += 8;
            
            chunkCount++;
            console.log(`🔍 Found chunk ${chunkCount}: "${chunkName}" (${chunkSize} bytes) at offset ${offset}`);
            
            if (offset + chunkSize > pudData.length) break;
            
            switch (chunkName) {
                case 'VER ':
                    if (chunkSize >= 2) {
                        mapData.version = this.readUint16(pudData, offset);
                        console.log(`  -> Version: ${mapData.version}`);
                    }
                    break;
                    
                case 'ERA ':
                    if (chunkSize >= 2) {
                        mapData.tileset = this.readUint16(pudData, offset);
                        console.log(`  -> Tileset: ${mapData.tileset}`);
                    }
                    break;
                    
                case 'DIM ':
                    if (chunkSize >= 4) {
                        mapData.width = this.readUint16(pudData, offset);
                        mapData.height = this.readUint16(pudData, offset + 2);
                        console.log(`  -> Dimensions: ${mapData.width}x${mapData.height}`);
                    }
                    break;
                    
                case 'MTXM':
                    console.log(`  -> Parsing terrain chunk...`);
                    this.parseTerrainChunk(pudData, offset, chunkSize, mapData);
                    break;
                    
                case 'UNIT':
                    console.log(`  -> Parsing units chunk...`);
                    this.parseUnitsChunkCorrected(pudData, offset, chunkSize, mapData);
                    break;
                    
                case 'OWNR':
                    if (chunkSize >= 8) {
                        mapData.max_players = this.parsePlayerCount(pudData.slice(offset, offset + chunkSize));
                        console.log(`  -> Max players: ${mapData.max_players}`);
                    }
                    break;
                    
                case 'DESC':
                    if (chunkSize > 0) {
                        mapData.map_description = String.fromCharCode(...pudData.slice(offset, offset + chunkSize))
                            .replace(/\0/g, '').trim();
                        console.log(`  -> Description: ${mapData.map_description.substring(0, 50)}...`);
                    }
                    break;
                    
                case 'NAME':
                    if (chunkSize > 0) {
                        const name = String.fromCharCode(...pudData.slice(offset, offset + chunkSize))
                            .replace(/\0/g, '').trim();
                        if (name) {
                            mapData.map_name = name;
                            console.log(`  -> Map name: ${mapData.map_name}`);
                        }
                    }
                    break;
                    
                case 'SGLD':
                     console.log(`  -> Parsing gold chunk...`);
                     this.parseGoldChunk(pudData, offset, chunkSize, mapData);
                     break;
                     
                 case 'SOIL':
                     console.log(`  -> Parsing oil chunk...`);
                     this.parseOilChunk(pudData, offset, chunkSize, mapData);
                     break;
                     
                 case 'OILM':
                     console.log(`  -> Parsing oil map chunk...`);
                     this.parseOilMapChunk(pudData, offset, chunkSize, mapData);
                     break;
                    
                default:
                    console.log(`  -> Unknown chunk, skipping...`);
                    break;
            }
            
            offset += chunkSize;
        }
        
        // Convert terrain data to runs
        console.log(`🔍 Converting terrain data to runs...`);
        console.log(`🔍 Terrain array length: ${mapData.terrain?.length || 0}`);
        console.log(`🔍 Terrain array type: ${typeof mapData.terrain}`);
        console.log(`🔍 Terrain array content:`, mapData.terrain);
        
        if (mapData.terrain && mapData.terrain.length > 0) {
            this.convertTerrainToRuns(mapData);
            console.log(`🔍 Final terrain runs: ${mapData.terrain_runs?.length || 0}`);
        } else {
            console.log(`❌ ERROR: Cannot convert terrain to runs - terrain array is empty or missing!`);
            mapData.terrain_runs = [];
        }
        
        console.log(`🔍 Final mapData.terrain length before return: ${mapData.terrain?.length || 0}`);
        return mapData;
    }
    
    /**
     * Parse terrain chunk (MTXM)
     */
    parseTerrainChunk(pudData, offset, chunkSize, mapData) {
        const totalTiles = mapData.width * mapData.height;
        const tilesToRead = Math.min(totalTiles, chunkSize / 2);
        
        mapData.terrain = [];
        console.log(`🔍 Parsing terrain chunk: ${tilesToRead} tiles from ${chunkSize} bytes`);
        console.log(`🔍 Map dimensions: ${mapData.width}x${mapData.height} = ${totalTiles} total tiles`);
        console.log(`🔍 Starting terrain array length: ${mapData.terrain.length}`);
        
        // Sample some tile IDs to see what we're working with
        const sampleTiles = [];
        try {
            for (let i = 0; i < tilesToRead; i++) {
                const tileId = this.readUint16(pudData, offset + i * 2);
                mapData.terrain.push(tileId);
                
                // Sample first 20 tiles and some random ones
                if (i < 20 || i % 100 === 0) {
                    sampleTiles.push(tileId);
                }
                
                // Debug: Log progress every 1000 tiles
                if (i % 1000 === 0 && i > 0) {
                    console.log(`🔍 Processed ${i} tiles, current array length: ${mapData.terrain.length}`);
                }
            }
            
            console.log(`🔍 Finished parsing terrain. Final array length: ${mapData.terrain.length}`);
            console.log(`🔍 Sample tile IDs: ${sampleTiles.map(id => `0x${id.toString(16).toUpperCase()}`).join(', ')}`);
            
            if (mapData.terrain.length > 0) {
                console.log(`🔍 Tile ID range: 0x${Math.min(...mapData.terrain).toString(16).toUpperCase()} - 0x${Math.max(...mapData.terrain).toString(16).toUpperCase()}`);
            } else {
                console.log(`❌ ERROR: Terrain array is empty after parsing!`);
            }
        } catch (error) {
            console.error(`❌ ERROR parsing terrain chunk:`, error);
            console.error(`❌ Error details:`, error.message);
            console.error(`❌ Stack trace:`, error.stack);
        }
    }
    
    /**
     * Parse units chunk (UNIT)
     * Based on war2tools specifications for Warcraft II unit types
     */
    parseUnitsChunkCorrected(pudData, offset, chunkSize, mapData) {
        const unitSize = 8;
        const unitsCount = Math.floor(chunkSize / unitSize);
        
        console.log(`🔍 Parsing units chunk: ${unitsCount} units from ${chunkSize} bytes`);
        
        for (let i = 0; i < unitsCount; i++) {
            const unitOffset = offset + i * unitSize;
            const unitType = this.readUint16(pudData, unitOffset);
            const x = this.readUint16(pudData, unitOffset + 2);
            const y = this.readUint16(pudData, unitOffset + 4);
            const owner = pudData[unitOffset + 6];
            const data = pudData[unitOffset + 7];
            
            // Debug: Show raw bytes for first few units to understand coordinate format
            if (i < 5) {
                const rawBytes = Array.from(pudData.slice(unitOffset, unitOffset + 8)).map(b => b.toString(16).padStart(2, '0'));
                console.log(`🔍 Unit ${i} raw bytes: ${rawBytes.join(' ')}`);
                console.log(`  -> Type: 0x${unitType.toString(16).toUpperCase()}, X: ${x}, Y: ${y}, Owner: ${owner}, Data: ${data}`);
                
                // Try different coordinate interpretations
                const xDiv16 = Math.floor(x / 16);
                const yDiv16 = Math.floor(y / 16);
                const xDiv32 = Math.floor(x / 32);
                const yDiv32 = Math.floor(y / 32);
                console.log(`  -> X/16: ${xDiv16}, Y/16: ${yDiv16}, X/32: ${xDiv32}, Y/32: ${yDiv32}`);
            }
            
                        // Get unit type name for debugging
             let unitTypeName = 'Unknown';
             if (unitType === 0x01) unitTypeName = 'Goldmine';
             else if (unitType === 0x02) unitTypeName = 'Oil Platform';
             else if (unitType === 0x03) unitTypeName = 'Human Town Hall';
             else if (unitType === 0x04) unitTypeName = 'Orc Great Hall';
             else if (unitType === 0x05) unitTypeName = 'Human Farm';
             else if (unitType === 0x06) unitTypeName = 'Orc Farm';
             else if (unitType === 0x07) unitTypeName = 'Human Barracks';
             else if (unitType === 0x08) unitTypeName = 'Orc Barracks';
             else if (unitType === 0x09) unitTypeName = 'Church';
             else if (unitType === 0x0A) unitTypeName = 'Human Tower';
             else if (unitType === 0x0B) unitTypeName = 'Orc Tower';
             else if (unitType === 0x0C) unitTypeName = 'Human Lumber Mill';
             else if (unitType === 0x0D) unitTypeName = 'Orc Lumber Mill';
             else if (unitType === 0x0E) unitTypeName = 'Human Blacksmith';
             else if (unitType === 0x0F) unitTypeName = 'Orc Blacksmith';
             else if (unitType === 0x10) unitTypeName = 'Human Keep';
             else if (unitType === 0x11) unitTypeName = 'Orc Stronghold';
             else if (unitType === 0x12) unitTypeName = 'Human Castle';
             else if (unitType === 0x13) unitTypeName = 'Orc Fortress';
             else if (unitType === 0x14) unitTypeName = 'Human Academy';
             else if (unitType === 0x15) unitTypeName = 'Orc Temple';
             else if (unitType === 0x16) unitTypeName = 'Human Workshop';
             else if (unitType === 0x17) unitTypeName = 'Orc Workshop';
             else if (unitType === 0x18) unitTypeName = 'Human Gnomish Inventor';
             else if (unitType === 0x19) unitTypeName = 'Orc Goblin Alchemist';
             else if (unitType === 0x1A) unitTypeName = 'Human Stables';
             else if (unitType === 0x1B) unitTypeName = 'Orc Ogre Mound';
             else if (unitType === 0x1C) unitTypeName = 'Human Gryphon Aviary';
             else if (unitType === 0x1D) unitTypeName = 'Orc Dragon Roost';
             else if (unitType === 0x1E) unitTypeName = 'Human Shipyard';
             else if (unitType === 0x1F) unitTypeName = 'Orc Shipyard';
             else if (unitType === 0x20) unitTypeName = 'Human Guard Tower';
             else if (unitType === 0x21) unitTypeName = 'Orc Cannon Tower';
             else if (unitType === 0x22) unitTypeName = 'Human Cannon Tower';
             else if (unitType === 0x23) unitTypeName = 'Orc Guard Tower';
             else if (unitType >= 0x24 && unitType <= 0xFF) {
                 // Wall types - alternate between Human and Orc walls
                 unitTypeName = (unitType % 2 === 0) ? 'Human Wall' : 'Orc Wall';
             }
             
             // Debug: Log all units to see what we're actually parsing
             console.log(`🔍 Unit ${i}: type=0x${unitType.toString(16).toUpperCase()} (${unitTypeName}), pos=(${x},${y}), owner=${owner}, data=${data}`);
            
                         // Only log units that might be interesting (goldmines, oil, starting positions, or unusual coordinates)
             if (unitType === 0x01 || unitType === 0x02 || unitType === 0x03 || unitType === 0x04 ||
                 x >= mapData.width || y >= mapData.height) {
                 console.log(`🔍 Unit ${i}: type=0x${unitType.toString(16).toUpperCase()} (${unitTypeName}), pos=(${x},${y}), owner=${owner}, data=${data}`);
             }
             
             // Special debug for gold mines - log any unit with type 0x01
             if (unitType === 0x01) {
                 console.log(`🎯 FOUND GOLDMINE UNIT: type=0x01, pos=(${x},${y}), owner=${owner}, data=${data}`);
             }
             
                                       // Convert units to markers
             if (unitType === 0x01) { // Goldmine (ID 1)
                 // Convert data to actual gold amount based on documentation
                 let goldAmount = 0;
                 if (data <= 100) {
                     goldAmount = data * 2500; // Safe range: 1-100 * 2500 = 2,500 - 250,000
                 } else if (data <= 1000) {
                     goldAmount = data * 1000; // Extended range: 101-1000 * 1000 = 101,000 - 1,000,000
                 } else {
                     goldAmount = 1000000; // Cap at 1 million for very large values
                 }
                 
                 // Try to convert coordinates to map-relative positions
                 const mapX = Math.floor(x / 32);
                 const mapY = Math.floor(y / 32);
                 
                 // Only add if coordinates are within map bounds
                 if (mapX >= 0 && mapX < mapData.width && mapY >= 0 && mapY < mapData.height) {
                     mapData.markers.push({
                         x: mapX,
                         y: mapY,
                         marker_type: 'goldmine',
                         amount: goldAmount,
                         label: `Gold: ${goldAmount.toLocaleString()}`,
                         description: `Goldmine containing ${goldAmount.toLocaleString()} gold`
                     });
                     console.log(`  -> Found Goldmine at map position (${mapX}, ${mapY}) [raw: (${x}, ${y})] with ${data} data = ${goldAmount.toLocaleString()} gold`);
                 } else {
                     console.log(`  -> Goldmine at raw position (${x}, ${y}) [map: (${mapX}, ${mapY})] is outside map bounds ${mapData.width}x${mapData.height}`);
                 }
             } else if (unitType === 0x02) { // Oil platform
                 // Try to convert coordinates to map-relative positions
                 const mapX = Math.floor(x / 32);
                 const mapY = Math.floor(y / 32);
                 
                 // Only add if coordinates are within map bounds
                 if (mapX >= 0 && mapX < mapData.width && mapY >= 0 && mapY < mapData.height) {
                     mapData.markers.push({
                         x: mapX,
                         y: mapY,
                         marker_type: 'oil',
                         amount: data,
                         label: `Oil: ${data.toLocaleString()}`,
                         description: `Oil platform with ${data.toLocaleString()} oil`
                     });
                     console.log(`  -> Found Oil Platform at map position (${mapX}, ${mapY}) [raw: (${x}, ${y})] with ${data} oil`);
                 } else {
                     console.log(`  -> Oil Platform at raw position (${x}, ${y}) [map: (${mapX}, ${mapY})] is outside map bounds ${mapData.width}x${mapData.height}`);
                 }
             } else if (owner < 8 && (unitType === 0x03 || unitType === 0x04)) { // Human Town Hall (0x03) or Orc Great Hall (0x04)
                 const race = unitType === 0x03 ? 'Human' : 'Orc';
                 
                 // Try to convert coordinates to map-relative positions
                 const mapX = Math.floor(x / 32);
                 const mapY = Math.floor(y / 32);
                 
                 // Only add if coordinates are within map bounds
                 if (mapX >= 0 && mapX < mapData.width && mapY >= 0 && mapY < mapData.height) {
                     mapData.markers.push({
                         x: mapX,
                         y: mapY,
                         marker_type: 'player',
                         player: owner,
                         race: race,
                         label: `Player ${owner + 1} (${race})`,
                         description: `${race} starting position with 1000 gold, 500 lumber, 200 oil`
                     });
                     console.log(`  -> Found ${race} Player ${owner + 1} starting position at map position (${mapX}, ${mapY}) [raw: (${x}, ${y})]`);
                 } else {
                     console.log(`  -> ${race} Player ${owner + 1} at raw position (${x}, ${y}) [map: (${mapX}, ${mapY})] is outside map bounds ${mapData.width}x${mapData.height}`);
                 }
             }
            
            // Warcraft II unit types (based on war2tools)
            // 0x01 = Goldmine
            // 0x02 = Oil Platform  
            // 0x03 = Human Town Hall
            // 0x04 = Orc Great Hall
            // 0x05 = Human Farm
            // 0x06 = Orc Farm
            // 0x07 = Human Barracks
            // 0x08 = Orc Barracks
            // 0x09 = Church
            // 0x0A = Human Tower
            // 0x0B = Orc Tower
            // 0x0C = Human Lumber Mill
            // 0x0D = Orc Lumber Mill
            // 0x0E = Human Blacksmith
            // 0x0F = Orc Blacksmith
            // 0x10 = Human Keep
            // 0x11 = Orc Stronghold
            // 0x12 = Human Castle
            // 0x13 = Orc Fortress
            // 0x14 = Human Academy
            // 0x15 = Orc Temple
            // 0x16 = Human Workshop
            // 0x17 = Orc Workshop
            // 0x18 = Human Gnomish Inventor
            // 0x19 = Orc Goblin Alchemist
            // 0x1A = Human Stables
            // 0x1B = Orc Ogre Mound
            // 0x1C = Human Gryphon Aviary
            // 0x1D = Orc Dragon Roost
            // 0x1E = Human Shipyard
            // 0x1F = Orc Shipyard
            // 0x20 = Human Guard Tower
            // 0x21 = Orc Cannon Tower
            // 0x22 = Human Cannon Tower
            // 0x23 = Orc Guard Tower
            // 0x24 = Human Wall
            // 0x25 = Orc Wall
            // 0x26 = Human Wall
            // 0x27 = Orc Wall
            // 0x28 = Human Wall
            // 0x29 = Orc Wall
            // 0x2A = Human Wall
            // 0x2B = Orc Wall
            // 0x2C = Human Wall
            // 0x2D = Orc Wall
            // 0x2E = Human Wall
            // 0x2F = Orc Wall
            // 0x30 = Human Wall
            // 0x31 = Orc Wall
            // 0x32 = Human Wall
            // 0x33 = Orc Wall
            // 0x34 = Human Wall
            // 0x35 = Orc Wall
            // 0x36 = Human Wall
            // 0x37 = Orc Wall
            // 0x38 = Human Wall
            // 0x39 = Orc Wall
            // 0x3A = Human Wall
            // 0x3B = Orc Wall
            // 0x3C = Human Wall
            // 0x3D = Orc Wall
            // 0x3E = Human Wall
            // 0x3F = Orc Wall
            // 0x40 = Human Wall
            // 0x41 = Orc Wall
            // 0x42 = Human Wall
            // 0x43 = Orc Wall
            // 0x44 = Human Wall
            // 0x45 = Orc Wall
            // 0x46 = Human Wall
            // 0x47 = Orc Wall
            // 0x48 = Human Wall
            // 0x49 = Orc Wall
            // 0x4A = Human Wall
            // 0x4B = Orc Wall
            // 0x4C = Human Wall
            // 0x4D = Orc Wall
            // 0x4E = Human Wall
            // 0x4F = Orc Wall
            // 0x50 = Human Wall
            // 0x51 = Orc Wall
            // 0x52 = Human Wall
            // 0x53 = Orc Wall
            // 0x54 = Human Wall
            // 0x55 = Orc Wall
            // 0x56 = Human Wall
            // 0x57 = Orc Wall
            // 0x58 = Human Wall
            // 0x59 = Orc Wall
            // 0x5A = Human Wall
            // 0x5B = Orc Wall
            // 0x5C = Human Wall
            // 0x5D = Orc Wall
            // 0x5E = Human Wall
            // 0x5F = Orc Wall
            // 0x60 = Human Wall
            // 0x61 = Orc Wall
            // 0x62 = Human Wall
            // 0x63 = Orc Wall
            // 0x64 = Human Wall
            // 0x65 = Orc Wall
            // 0x66 = Human Wall
            // 0x67 = Orc Wall
            // 0x68 = Human Wall
            // 0x69 = Orc Wall
            // 0x6A = Human Wall
            // 0x6B = Orc Wall
            // 0x6C = Human Wall
            // 0x6D = Orc Wall
            // 0x6E = Human Wall
            // 0x6F = Orc Wall
            // 0x70 = Human Wall
            // 0x71 = Orc Wall
            // 0x72 = Human Wall
            // 0x73 = Orc Wall
            // 0x74 = Human Wall
            // 0x75 = Orc Wall
            // 0x76 = Human Wall
            // 0x77 = Orc Wall
            // 0x78 = Human Wall
            // 0x79 = Orc Wall
            // 0x7A = Human Wall
            // 0x7B = Orc Wall
            // 0x7C = Human Wall
            // 0x7D = Orc Wall
            // 0x7E = Human Wall
            // 0x7F = Orc Wall
            // 0x80 = Human Wall
            // 0x81 = Orc Wall
            // 0x82 = Human Wall
            // 0x83 = Orc Wall
            // 0x84 = Human Wall
            // 0x85 = Orc Wall
            // 0x86 = Human Wall
            // 0x87 = Orc Wall
            // 0x88 = Human Wall
            // 0x89 = Orc Wall
            // 0x8A = Human Wall
            // 0x8B = Orc Wall
            // 0x8C = Human Wall
            // 0x8D = Orc Wall
            // 0x8E = Human Wall
            // 0x8F = Orc Wall
            // 0x90 = Human Wall
            // 0x91 = Orc Wall
            // 0x92 = Human Wall
            // 0x93 = Orc Wall
            // 0x94 = Human Wall
            // 0x95 = Orc Wall
            // 0x96 = Human Wall
            // 0x97 = Orc Wall
            // 0x98 = Human Wall
            // 0x99 = Orc Wall
            // 0x9A = Human Wall
            // 0x9B = Orc Wall
            // 0x9C = Human Wall
            // 0x9D = Orc Wall
            // 0x9E = Human Wall
            // 0x9F = Orc Wall
            // 0xA0 = Human Wall
            // 0xA1 = Orc Wall
            // 0xA2 = Human Wall
            // 0xA3 = Orc Wall
            // 0xA4 = Human Wall
            // 0xA5 = Orc Wall
            // 0xA6 = Human Wall
            // 0xA7 = Orc Wall
            // 0xA8 = Human Wall
            // 0xA9 = Orc Wall
            // 0xAA = Human Wall
            // 0xAB = Orc Wall
            // 0xAC = Human Wall
            // 0xAD = Orc Wall
            // 0xAE = Human Wall
            // 0xAF = Orc Wall
            // 0xB0 = Human Wall
            // 0xB1 = Orc Wall
            // 0xB2 = Human Wall
            // 0xB3 = Orc Wall
            // 0xB4 = Human Wall
            // 0xB5 = Orc Wall
            // 0xB6 = Human Wall
            // 0xB7 = Orc Wall
            // 0xB8 = Human Wall
            // 0xB9 = Orc Wall
            // 0xBA = Human Wall
            // 0xBB = Orc Wall
            // 0xBC = Human Wall
            // 0xBD = Orc Wall
            // 0xBE = Human Wall
            // 0xBF = Orc Wall
            // 0xC0 = Human Wall
            // 0xC1 = Orc Wall
            // 0xC2 = Human Wall
            // 0xC3 = Orc Wall
            // 0xC4 = Human Wall
            // 0xC5 = Orc Wall
            // 0xC6 = Human Wall
            // 0xC7 = Orc Wall
            // 0xC8 = Human Wall
            // 0xC9 = Orc Wall
            // 0xCA = Human Wall
            // 0xCB = Orc Wall
            // 0xCC = Human Wall
            // 0xCD = Orc Wall
            // 0xCE = Human Wall
            // 0xCF = Orc Wall
            // 0xD0 = Human Wall
            // 0xD1 = Orc Wall
            // 0xD2 = Human Wall
            // 0xD3 = Orc Wall
            // 0xD4 = Human Wall
            // 0xD5 = Orc Wall
            // 0xD6 = Human Wall
            // 0xD7 = Orc Wall
            // 0xD8 = Human Wall
            // 0xD9 = Orc Wall
            // 0xDA = Human Wall
            // 0xDB = Orc Wall
            // 0xDC = Human Wall
            // 0xDD = Orc Wall
            // 0xDE = Human Wall
            // 0xDF = Orc Wall
            // 0xE0 = Human Wall
            // 0xE1 = Orc Wall
            // 0xE2 = Human Wall
            // 0xE3 = Orc Wall
            // 0xE4 = Human Wall
            // 0xE5 = Orc Wall
            // 0xE6 = Human Wall
            // 0xE7 = Orc Wall
            // 0xE8 = Human Wall
            // 0xE9 = Orc Wall
            // 0xEA = Human Wall
            // 0xEB = Orc Wall
            // 0xEC = Human Wall
            // 0xED = Orc Wall
            // 0xEE = Human Wall
            // 0xEF = Orc Wall
            // 0xF0 = Human Wall
            // 0xF1 = Orc Wall
            // 0xF2 = Human Wall
            // 0xF3 = Orc Wall
            // 0xF4 = Human Wall
            // 0xF5 = Orc Wall
            // 0xF6 = Human Wall
            // 0xF7 = Orc Wall
            // 0xF8 = Human Wall
            // 0xF9 = Orc Wall
            // 0xFA = Human Wall
            // 0xFB = Orc Wall
            // 0xFC = Human Wall
            // 0xFD = Orc Wall
            // 0xFE = Human Wall
            // 0xFF = Orc Wall
            

        }
        
                 console.log(`🔍 Total markers found: ${mapData.markers.length}`);
     }
     
     /**
      * Parse gold chunk (SGLD)
      */
     parseGoldChunk(pudData, offset, chunkSize, mapData) {
         console.log(`🔍 Parsing gold chunk: ${chunkSize} bytes`);
         
         // Let's examine the raw data to understand the format
         const rawBytes = Array.from(pudData.slice(offset, offset + chunkSize)).map(b => b.toString(16).padStart(2, '0'));
         console.log(`  -> Raw SGLD bytes: ${rawBytes.join(' ')}`);
         
         // The SGLD chunk appears to contain resource amounts, not coordinates
         // Let's look for patterns that might indicate gold amounts
         const uniqueValues = new Set();
         for (let i = 0; i < chunkSize; i += 2) {
             if (i + 1 < chunkSize) {
                 const value = this.readUint16(pudData, offset + i);
                 uniqueValues.add(value);
             }
         }
         console.log(`  -> Unique values in SGLD: ${Array.from(uniqueValues).sort((a, b) => a - b).join(', ')}`);
         
         // If we find reasonable resource amounts, we might need to look elsewhere for coordinates
         // For now, we'll rely on the UNIT chunk for actual goldmine locations
     }
     
     /**
      * Parse oil chunk (SOIL)
      */
     parseOilChunk(pudData, offset, chunkSize, mapData) {
         console.log(`🔍 Parsing oil chunk: ${chunkSize} bytes`);
         
         // Let's examine the raw data to understand the format
         const rawBytes = Array.from(pudData.slice(offset, offset + chunkSize)).map(b => b.toString(16).padStart(2, '0'));
         console.log(`  -> Raw SOIL bytes: ${rawBytes.join(' ')}`);
         
         // The SOIL chunk appears to contain resource amounts, not coordinates
         // Let's look for patterns that might indicate oil amounts
         const uniqueValues = new Set();
         for (let i = 0; i < chunkSize; i += 2) {
             if (i + 1 < chunkSize) {
                 const value = this.readUint16(pudData, offset + i);
                 uniqueValues.add(value);
             }
         }
         console.log(`  -> Unique values in SOIL: ${Array.from(uniqueValues).sort((a, b) => a - b).join(', ')}`);
         
         // If we find reasonable resource amounts, we might need to look elsewhere for coordinates
         // For now, we'll rely on the UNIT chunk or OILM chunk for actual oil platform locations
     }
     
     /**
      * Parse oil map chunk (OILM)
      */
     parseOilMapChunk(pudData, offset, chunkSize, mapData) {
         console.log(`🔍 Parsing oil map chunk: ${chunkSize} bytes`);
         
         // The OILM chunk might contain a bitmap of where oil is located
         // Each bit could represent whether a tile has oil or not
         const totalTiles = mapData.width * mapData.height;
         const expectedBytes = Math.ceil(totalTiles / 8);
         
         console.log(`  -> Expected bytes for ${totalTiles} tiles: ${expectedBytes}`);
         console.log(`  -> Actual chunk size: ${chunkSize}`);
         
         if (chunkSize === expectedBytes) {
             console.log(`  -> OILM chunk appears to be a bitmap of oil locations`);
             
             // Parse the bitmap to find oil locations
             for (let tileIndex = 0; tileIndex < totalTiles; tileIndex++) {
                 const byteIndex = Math.floor(tileIndex / 8);
                 const bitIndex = tileIndex % 8;
                 
                 if (byteIndex < chunkSize) {
                     const byte = pudData[offset + byteIndex];
                     const hasOil = (byte & (1 << bitIndex)) !== 0;
                     
                     if (hasOil) {
                         const x = tileIndex % mapData.width;
                         const y = Math.floor(tileIndex / mapData.width);
                         
                         console.log(`  -> Found oil at tile (${x}, ${y})`);
                         mapData.markers.push({
                             x: x,
                             y: y,
                             marker_type: 'oil',
                             amount: 10000, // Default amount
                             label: 'Oil: 10,000'
                         });
                     }
                 }
             }
         } else {
             console.log(`  -> OILM chunk size doesn't match expected bitmap size`);
         }
     }
    
    /**
     * Convert terrain array to optimized runs
     */
    convertTerrainToRuns(mapData) {
        console.log(`🔍 convertTerrainToRuns called with terrain length: ${mapData.terrain?.length || 0}`);
        if (!mapData.terrain || mapData.terrain.length === 0) {
            console.log(`❌ convertTerrainToRuns: Terrain array is empty or missing, returning early`);
            return;
        }
        
        const runs = [];
        let currentTile = mapData.terrain[0];
        let count = 1;
        let x = 0;
        let y = 0;
        
        for (let i = 1; i < mapData.terrain.length; i++) {
            if (mapData.terrain[i] === currentTile) {
                count++;
            } else {
                // End of current run
                runs.push({
                    terrain_type: this.getTerrainType(currentTile, mapData.tileset),
                    tile_id: currentTile,
                    count: count,
                    start_x: x,
                    start_y: y
                });
                
                // Start new run
                currentTile = mapData.terrain[i];
                count = 1;
                x = i % mapData.width;
                y = Math.floor(i / mapData.width);
            }
        }
        
        // Add final run
        runs.push({
            terrain_type: this.getTerrainType(currentTile, mapData.tileset),
            tile_id: currentTile,
            count: count,
            start_x: x,
            start_y: y
        });
        
        mapData.terrain_runs = runs;
    }
    
    /**
     * Get terrain type from tile ID and tileset
     * Based on war2tools project specifications and actual PUD analysis
     */
    getTerrainType(tileId, tileset) {
        // Water tiles: 0x10-0x2F (16-47) - Consistent across all tilesets
        if (tileId >= 16 && tileId <= 47) {
            return 'water';
        }
        
        // Shore/Coast tiles: 0x30-0x4F (48-79) - Consistent across all tilesets
        if (tileId >= 48 && tileId <= 79) {
            return 'coast';
        }
        
        // Rock/Mountain tiles: 0x60-0x6F (96-111) - Consistent across all tilesets
        if (tileId >= 96 && tileId <= 111) {
            return 'rock';
        }
        
        // Forest/Tree tiles: 0x70-0x7F (112-127) - Consistent across all tilesets
        if (tileId >= 112 && tileId <= 127) {
            return 'forest';
        }
        
        // Basic grass tiles: 0x00-0x0F (0-15) - Consistent across all tilesets
        if (tileId >= 0 && tileId <= 15) {
            return 'grass';
        }
        
        // Tileset-specific terrain variations: 0x50-0x5F (80-95)
        if (tileId >= 80 && tileId <= 95) {
            switch (tileset) {
                case 0: return 'grass';    // Forest tileset - grass variations
                case 1: return 'grass';    // Winter tileset - grass under snow
                case 2: return 'dirt';     // Wasteland tileset - desert dirt
                case 3: return 'grass';    // Swamp tileset - grass in swamp
                default: return 'grass';
            }
        }
        
        // Extended terrain variations: 128+ - Tileset-specific
        if (tileId >= 128) {
            switch (tileset) {
                case 0: return 'grass';    // Forest - grass texture variations
                case 1: return 'snow';     // Winter - snow and ice
                case 2: return 'sand';     // Wasteland - desert sand
                case 3: return 'swamp';    // Swamp - marshy terrain
                default: return 'grass';
            }
        }
        
        // Fallback - default to grass
        return 'grass';
    }

    /**
     * Parse player count from OWNR chunk
     * @param {Uint8Array} data - Raw OWNR chunk data
     * @returns {number} Player count
     */
    parsePlayerCount(data) {
        if (data.length < 8) {
            console.warn('OWNR chunk too short to parse player count.');
            return 1; // Default to 1 player
        }
        return this.readUint16(data, 0);
    }
}

/**
 * Utility function to decompress gzip data
 * Note: This requires a gzip decompression library like pako
 * For now, we'll return the compressed data as-is
 */
export function decompressGzipData(compressedData) {
    // If pako is available, use it
    if (typeof pako !== 'undefined') {
        try {
            const decompressed = pako.inflate(compressedData, { to: 'string' });
            return JSON.parse(decompressed);
        } catch (error) {
            console.warn('Gzip decompression failed, using compressed data:', error);
            return compressedData;
        }
    }
    
    // Fallback: return compressed data (will need server-side decompression)
    console.warn('Gzip decompression not available, using compressed data');
    return compressedData;
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = {};
    }

    /**
     * Start timing an operation
     * @param {string} operation - Operation name
     */
    startTiming(operation) {
        this.metrics[operation] = {
            startTime: performance.now(),
            endTime: null,
            duration: null
        };
    }

    /**
     * End timing an operation
     * @param {string} operation - Operation name
     */
    endTiming(operation) {
        if (this.metrics[operation]) {
            this.metrics[operation].endTime = performance.now();
            this.metrics[operation].duration = 
                this.metrics[operation].endTime - this.metrics[operation].startTime;
        }
    }

    /**
     * Get timing results
     * @returns {Object} Timing metrics
     */
    getResults() {
        return this.metrics;
    }

    /**
     * Log performance summary
     */
    logSummary() {
        console.log('🚀 Performance Summary:');
        Object.entries(this.metrics).forEach(([operation, metric]) => {
            if (metric.duration !== null) {
                console.log(`  ${operation}: ${metric.duration.toFixed(2)}ms`);
            }
        });
    }
}
