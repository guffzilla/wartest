/**
 * Warcraft II Tile Data Reference
 * Based on war2tools project and PUD file specifications
 * 
 * References:
 * - https://github.com/war2/war2tools
 * - PUD file format documentation
 * - Warcraft II tileset specifications
 */

/**
 * Tileset definitions
 * Each tileset has specific tile arrangements and IDs
 */
const TILESETS = {
  0: 'forest',
  1: 'winter',
  2: 'wasteland', 
  3: 'swamp'
};

/**
 * Standard tile categories and their typical ID ranges
 * Based on war2tools libpud and actual PUD file analysis
 */
const TILE_CATEGORIES = {
  // Basic terrain tiles (0x00-0x0F)
  TERRAIN_BASE: {
    start: 0x00,
    end: 0x0F,
    description: 'Basic terrain tiles'
  },
  
  // Water tiles (0x10-0x4F) 
  WATER_LIGHT: {
    start: 0x10,
    end: 0x1F,
    description: 'Light water tiles'
  },
  WATER_DARK: {
    start: 0x20,
    end: 0x2F,
    description: 'Dark water tiles'
  },
  COAST_LIGHT: {
    start: 0x30,
    end: 0x3F,
    description: 'Light coast tiles'
  },
  COAST_DARK: {
    start: 0x40,
    end: 0x4F,
    description: 'Dark coast tiles'
  },
  
  // Terrain variations (0x50+)
  TERRAIN_EXTENDED: {
    start: 0x50,
    end: 0xFF,
    description: 'Extended terrain tiles'
  }
};

/**
 * Get tile color for unknown or missing tiles
 * Based on tileset and tile ID ranges
 */
function getTileColor(tileset, tileId) {
  const tilesetName = TILESETS[tileset] || 'forest';
  
  // Water tiles
  if (tileId >= 0x10 && tileId <= 0x2F) {
    return '#4169E1'; // Blue for water
  }
  
  // Coast tiles
  if (tileId >= 0x30 && tileId <= 0x4F) {
    return '#87CEEB'; // Sky blue for coast
  }
  
  // Tileset-specific base colors
  const tilesetColors = {
    'forest': '#228B22',    // Forest green
    'winter': '#F0F8FF',    // Alice blue (snow)
    'wasteland': '#D2691E', // Chocolate (desert)
    'swamp': '#556B2F'      // Dark olive green
  };
  
  return tilesetColors[tilesetName] || '#666666';
}

/**
 * Standard Warcraft II tileset configuration
 * Based on war2tools specifications
 */
const TILESET_CONFIG = {
  TILE_SIZE: 32,        // Each tile is 32x32 pixels
  TILES_PER_ROW: 16,    // Standard tileset layout (may vary)
  MAX_TILES: 256        // Maximum tiles per tileset
};

/**
 * Check if a tile ID represents water
 */
function isWaterTile(tileId) {
  return tileId >= 0x10 && tileId <= 0x4F;
}

/**
 * Check if a tile ID represents coast
 */
function isCoastTile(tileId) {
  return tileId >= 0x30 && tileId <= 0x4F;
}

/**
 * Check if a tile ID represents basic terrain
 */
function isTerrainTile(tileId) {
  return tileId <= 0x0F || tileId >= 0x50;
}

/**
 * Get tile category description
 */
function getTileCategory(tileId) {
  for (const [category, range] of Object.entries(TILE_CATEGORIES)) {
    if (tileId >= range.start && tileId <= range.end) {
      return range.description;
    }
  }
  return 'Unknown tile type';
}

/**
 * Calculate tile position in tileset image
 * Based on standard Warcraft II tileset layout
 */
function getTilePosition(tileId, tilesPerRow = TILESET_CONFIG.TILES_PER_ROW) {
  const x = (tileId % tilesPerRow) * TILESET_CONFIG.TILE_SIZE;
  const y = Math.floor(tileId / tilesPerRow) * TILESET_CONFIG.TILE_SIZE;
  
  return { x, y };
}

/**
 * Validate tile ID against tileset bounds
 */
function isValidTileId(tileId, maxTiles = TILESET_CONFIG.MAX_TILES) {
  return tileId >= 0 && tileId < maxTiles;
}

module.exports = {
  TILESETS,
  TILE_CATEGORIES,
  TILESET_CONFIG,
  getTileColor,
  isWaterTile,
  isCoastTile,
  isTerrainTile,
  getTileCategory,
  getTilePosition,
  isValidTileId
}; 