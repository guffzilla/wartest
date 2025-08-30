/**
 * Fixed Binary PUD Parser for Warcraft II Maps
 * Based on the working Rust implementation from TMapX/map-extraction-backend/src/pud_parser.rs
 */

class FixedBinaryParser {
    constructor() {
        console.log('🔧 Fixed Binary PUD Parser initialized');
    }

    /**
     * Parse PUD file using correct logic from working Rust implementation
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
        console.log(`🔍 Type section length: ${typeLength}`);
        
        // Validate the type length
        if (typeLength > 1000 || typeLength < 0) {
            console.log(`🔍 Invalid type length ${typeLength}, using safe default of 8`);
            offset += 4 + 8; // Skip 8 bytes safely
        } else {
            offset += 4 + typeLength;
        }
        
        console.log(`🔍 After TYPE section, offset: ${offset}`);
        
        // Initialize map data
        const mapData = {
            width: 128,
            height: 128,
            tileset: 0,
            max_players: 4,
            map_name: "Unknown Map",
            map_description: "",
            terrain: [],
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
            
            if (offset + chunkSize > pudData.length) {
                console.log(`🔍 Chunk extends beyond file end, stopping`);
                break;
            }
            
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
                    
                case 'OWNR':
                    if (chunkSize >= 8) {
                        mapData.max_players = this.parsePlayerCount(pudData.slice(offset, offset + chunkSize));
                        console.log(`  -> Max players: ${mapData.max_players}`);
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
                    
                default:
                    console.log(`  -> Unknown chunk "${chunkName}", skipping...`);
                    break;
            }
            
            offset += chunkSize;
        }
        
        // Convert terrain data to runs
        console.log(`🔍 Converting terrain data to runs...`);
        if (mapData.terrain && mapData.terrain.length > 0) {
            this.convertTerrainToRuns(mapData);
            console.log(`🔍 Final terrain runs: ${mapData.terrain_runs?.length || 0}`);
        }
        
        // Final summary
        console.log(`\n=== PUD PARSING SUMMARY ===`);
        console.log(`Map Dimensions: ${mapData.width}x${mapData.height}`);
        console.log(`Max Players: ${mapData.max_players}`);
        console.log(`Units Found: ${mapData.units?.length || 0}`);
        console.log(`Markers Created: ${mapData.markers.length}`);
        console.log(`Terrain Tiles: ${mapData.terrain?.length || 0}`);
        console.log(`===========================\n`);
        
        return mapData;
    }

    /**
     * Parse units chunk using CORRECT logic from working Rust implementation
     * @param {Uint8Array} pudData - Raw PUD data
     * @param {number} offset - Offset to start of chunk data
     * @param {number} chunkSize - Size of chunk data
     * @param {Object} mapData - Map data to populate
     */
    parseUnitsChunkCorrected(pudData, offset, chunkSize, mapData) {
        const unitSize = 8; // Each unit is 8 bytes as per Rust implementation
        const unitsCount = Math.floor(chunkSize / unitSize);
        
        console.log(`🔍 Reading ${unitsCount} units from UNIT chunk`);
        
        // CORRECT unit IDs from working Rust implementation
        const CONFIRMED_GOLDMINE_IDS = [0x5C, 92]; // 0x5C and 92
        const CONFIRMED_STARTING_POSITION_IDS = [0x5E, 0x5F, 94, 95]; // 0x5E, 0x5F, 94, 95
        
        for (let i = 0; i < unitsCount; i++) {
            if (i * 8 + 7 < chunkSize) {
                const unitOffset = offset + i * 8;
                
                // Parse unit structure: [x, y, unit_id, owner, health, rotation, data]
                const x = this.readUint16(pudData, unitOffset);
                const y = this.readUint16(pudData, unitOffset + 2);
                const unitId = pudData[unitOffset + 4];
                const owner = pudData[unitOffset + 5];
                const data = this.readUint16(pudData, unitOffset + 6);
                
                // Validate coordinates are reasonable
                if (x > 1000 || y > 1000) {
                    console.log(`⚠️ Warning: Suspicious unit coordinates (${x}, ${y}) - skipping`);
                    continue;
                }
                
                console.log(`🔍 Unit ${i + 1}: pos(${x},${y}) id=${unitId}(0x${unitId.toString(16).toUpperCase()}) owner=${owner} data=${data}`);
                
                // Store the unit
                if (!mapData.units) mapData.units = [];
                mapData.units.push({
                    unit_type: unitId,
                    x: x,
                    y: y,
                    owner: owner,
                    health: 100, // Default health
                    rotation: 0, // Default rotation
                    data: data
                });
                
                // Check for goldmines FIRST - ONLY use confirmed ID 92 (0x5C)
                if (CONFIRMED_GOLDMINE_IDS.includes(unitId)) {
                    // Additional validation: goldmines should have owner=15 and data>0
                    if (owner === 15 && data > 0) {
                        // Convert data to actual gold amount (data appears to be in resource units)
                        let goldAmount = 0;
                        if (data <= 100) {
                            goldAmount = data * 2500; // Safe range: 1-100 * 2500 = 2,500 - 250,000
                        } else if (data <= 1000) {
                            goldAmount = data * 1000; // Extended range: 101-1000 * 1000 = 101,000 - 1,000,000
                        } else {
                            goldAmount = 1000000; // Cap at 1 million for very large values
                        }
                        
                        // Final safety check to prevent any overflow
                        const safeGoldAmount = Math.min(goldAmount, 10000000); // Cap at 10 million
                        
                        mapData.markers.push({
                            x: x,
                            y: y,
                            marker_type: 'goldmine',
                            amount: safeGoldAmount,
                            label: `Gold: ${safeGoldAmount.toLocaleString()}`,
                            description: `Goldmine containing ${safeGoldAmount.toLocaleString()} gold`
                        });
                        
                        console.log(`🟡 GOLDMINE found at (${x}, ${y}) - unitId: ${unitId} owner: ${owner} data: ${data} (${safeGoldAmount} gold / ${Math.floor(safeGoldAmount/1000)}k)`);
                    } else {
                        console.log(`⚠️ Potential goldmine rejected: pos(${x},${y}) id=${unitId} owner=${owner} data=${data} (invalid owner/data)`);
                    }
                }
                
                // Check for starting positions
                if (CONFIRMED_STARTING_POSITION_IDS.includes(unitId) && owner >= 0 && owner <= 7) {
                    const race = (unitId === 0x5E || unitId === 94) ? 'Human' : 'Orc';
                    
                    mapData.markers.push({
                        x: x,
                        y: y,
                        marker_type: 'player',
                        player: owner,
                        race: race,
                        label: `Player ${owner + 1} (${race})`,
                        description: `${race} starting position with 1000 gold, 500 lumber, 200 oil`
                    });
                    
                    console.log(`🔥 STARTING POSITION found at (${x}, ${y}) - ${race} player: ${owner + 1}`);
                }
            }
        }
        
        console.log(`✅ Parsed ${unitsCount} units, created ${mapData.markers.length} markers`);
    }

    /**
     * Parse player count from OWNR chunk
     * @param {Uint8Array} chunkData - OWNR chunk data
     * @returns {number} Number of players
     */
    parsePlayerCount(chunkData) {
        let playerCount = 0;
        for (let i = 0; i < Math.min(8, chunkData.length); i++) {
            const slot = chunkData[i];
            // Player slot values: 0x04=Human, 0x05=Orc, 0x06=Human, 0x07=Orc
            if (slot === 0x04 || slot === 0x05 || slot === 0x06 || slot === 0x07) {
                playerCount += 1;
            }
        }
        return Math.max(2, playerCount); // Minimum 2 players
    }

    /**
     * Parse terrain chunk (MTXM)
     * @param {Uint8Array} pudData - Raw PUD data
     * @param {number} offset - Offset to start of chunk data
     * @param {number} chunkSize - Size of chunk data
     * @param {Object} mapData - Map data to populate
     */
    parseTerrainChunk(pudData, offset, chunkSize, mapData) {
        const totalTiles = mapData.width * mapData.height;
        const tilesToRead = Math.min(totalTiles, chunkSize / 2);
        
        console.log(`🔍 Reading ${tilesToRead} terrain tiles`);
        
        for (let i = 0; i < tilesToRead; i++) {
            const tileType = this.readUint16(pudData, offset + i * 2);
            mapData.terrain.push(tileType);
        }
        
        console.log(`✅ Parsed ${tilesToRead} terrain tiles`);
    }

    /**
     * Convert terrain data to runs for efficient rendering
     * @param {Object} mapData - Map data with terrain array
     */
    convertTerrainToRuns(mapData) {
        if (!mapData.terrain || mapData.terrain.length === 0) {
            console.log('❌ No terrain data to convert');
            return;
        }

        const runs = [];
        let currentType = mapData.terrain[0];
        let currentCount = 1;
        let currentX = 0;
        let currentY = 0;

        for (let i = 1; i < mapData.terrain.length; i++) {
            const tileType = mapData.terrain[i];
            
            if (tileType === currentType) {
                currentCount++;
            } else {
                // End of current run
                runs.push({
                    terrain_type: this.getTerrainName(currentType),
                    tile_id: currentType,
                    count: currentCount,
                    start_x: currentX,
                    start_y: currentY
                });
                
                // Start new run
                currentType = tileType;
                currentCount = 1;
                currentX = i % mapData.width;
                currentY = Math.floor(i / mapData.width);
            }
        }

        // Add final run
        runs.push({
            terrain_type: this.getTerrainName(currentType),
            tile_id: currentType,
            count: currentCount,
            start_x: currentX,
            start_y: currentY
        });

        mapData.terrain_runs = runs;
        console.log(`✅ Converted terrain to ${runs.length} runs`);
    }

    /**
     * Get terrain name from tile ID
     * @param {number} tileId - Tile ID
     * @returns {string} Terrain name
     */
    getTerrainName(tileId) {
        // Basic terrain categorization
        if (tileId >= 16 && tileId <= 47) return 'water';
        if (tileId >= 48 && tileId <= 79) return 'shore';
        if (tileId >= 80 && tileId <= 95) return 'grass';
        if (tileId >= 96 && tileId <= 111) return 'rock';
        if (tileId >= 112 && tileId <= 127) return 'trees';
        return 'grass';
    }

    // Utility functions for reading binary data
    readUint16(data, offset) {
        return data[offset] | (data[offset + 1] << 8);
    }

    readUint32(data, offset) {
        return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FixedBinaryParser;
} else if (typeof window !== 'undefined') {
    window.FixedBinaryParser = FixedBinaryParser;
}
