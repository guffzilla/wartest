/**
 * 🎨 Texture Manager for Warcraft II Map Rendering
 * 
 * This class manages the loading, caching, and rendering of actual Warcraft II tile textures
 * instead of just using colors. It provides authentic visual appearance matching the original game.
 */

class TextureManager {
    constructor() {
        this.textureCache = new Map();
        this.textureAtlas = null;
        this.isTexturesLoaded = false;
        this.textureSize = 32; // Standard Warcraft II tile size
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Initialize texture system and load Warcraft II textures
     */
    async initialize(wasmModule) {
        try {
            console.log('🎨 Initializing texture system...');
            
            // Extract textures from WASM module
            const textures = await this.extractTextures(wasmModule);
            
            // Create texture atlas
            await this.createTextureAtlas(textures);
            
            this.isTexturesLoaded = true;
            console.log('✅ Texture system initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize texture system:', error);
            return false;
        }
    }

    /**
     * Initialize texture system without WASM (uses color fallback)
     */
    async initializeWithoutWasm() {
        try {
            console.log('🎨 Initializing texture system (no WASM)...');
            
            // Set up color-based rendering
            this.isTexturesLoaded = true;
            console.log('✅ Color-based texture system initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize texture system:', error);
            return false;
        }
    }

    /**
     * Extract textures from WASM module
     */
    async extractTextures(wasmModule) {
        try {
            console.log('🔍 Extracting Warcraft II textures...');
            
            // Call the new WASM function
            const result = wasmModule.extract_warcraft_textures();
            
            // Debug: Log what we got from WASM
            console.log('🔍 WASM result type:', typeof result);
            console.log('🔍 WASM result:', result);
            console.log('🔍 WASM result length:', result ? result.length : 'null/undefined');
            
            // Show first 200 characters of the result
            if (result && typeof result === 'string') {
                console.log('🔍 First 200 chars:', result.substring(0, 200));
                console.log('🔍 Last 200 chars:', result.substring(Math.max(0, result.length - 200)));
            }
            
            const textures = JSON.parse(result);
            
            console.log(`📊 Extracted ${textures.total_textures} textures (${textures.total_size} bytes)`);
            return textures;
            
        } catch (error) {
            console.error('❌ Texture extraction failed:', error);
            throw error;
        }
    }

    /**
     * Create texture atlas from extracted textures
     */
    async createTextureAtlas(textures) {
        try {
            console.log('🖼️ Creating texture atlas...');
            
            // For now, we'll create a placeholder atlas
            // In a full implementation, this would create actual texture atlases
            this.textureAtlas = {
                tilesets: textures.tilesets,
                totalTextures: textures.total_textures,
                totalSize: textures.total_size
            };
            
            // Pre-load all textures into cache
            await this.preloadTextures();
            
            console.log('✅ Texture atlas created successfully');
            
        } catch (error) {
            console.error('❌ Failed to create texture atlas:', error);
            throw error;
        }
    }

    /**
     * Pre-load all textures into cache for fast access
     */
    async preloadTextures() {
        try {
            console.log('⏳ Pre-loading textures into cache...');
            
            for (const tileset of this.textureAtlas.tilesets) {
                for (const tile of tileset.tiles) {
                    const key = `${tile.tileset}_${tile.tile_id}`;
                    await this.cacheTexture(key, tile);
                }
            }
            
            console.log(`✅ Cached ${this.textureCache.size} textures`);
            
        } catch (error) {
            console.error('❌ Failed to preload textures:', error);
            throw error;
        }
    }

    /**
     * Cache a texture for fast access
     */
    async cacheTexture(key, tileData) {
        try {
            // Convert RGBA data to ImageData
            const imageData = new ImageData(
                new Uint8ClampedArray(tileData.texture_data),
                tileData.width,
                tileData.height
            );
            
            // Create a temporary canvas to convert to ImageBitmap
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = tileData.width;
            tempCanvas.height = tileData.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.putImageData(imageData, 0, 0);
            
            // Convert to ImageBitmap for better performance
            const imageBitmap = await createImageBitmap(tempCanvas);
            
            // Store in cache
            this.textureCache.set(key, {
                imageBitmap,
                width: tileData.width,
                height: tileData.height,
                format: tileData.format
            });
            
        } catch (error) {
            console.error(`❌ Failed to cache texture ${key}:`, error);
        }
    }

    /**
     * Get texture for a specific tile
     */
    getTileTexture(tileId, tileset) {
        const key = `${tileset}_${tileId}`;
        return this.textureCache.get(key);
    }

    /**
     * Render a tile with its actual texture
     */
    renderTile(ctx, tileId, tileset, x, y, size) {
        try {
            const texture = this.getTileTexture(tileId, tileset);
            
            if (texture && texture.imageBitmap) {
                // Render actual texture
                ctx.drawImage(
                    texture.imageBitmap,
                    x, y, size, size
                );
            } else {
                // Fallback to color-based rendering
                this.renderFallbackTile(ctx, tileId, tileset, x, y, size);
            }
            
        } catch (error) {
            console.error(`❌ Failed to render tile ${tileId}:`, error);
            // Fallback to color-based rendering
            this.renderFallbackTile(ctx, tileId, tileset, x, y, size);
        }
    }

    /**
     * Render a tile with a pre-determined terrain type
     */
    renderTileWithTerrainType(ctx, tileId, terrainType, tileset, x, y, size) {
        try {
            const texture = this.getTileTexture(tileId, tileset);
            
            if (texture && texture.imageBitmap) {
                // Render actual texture
                ctx.drawImage(
                    texture.imageBitmap,
                    x, y, size, size
                );
            } else {
                // Fallback to color-based rendering with known terrain type
                this.renderFallbackTileWithTerrainType(ctx, terrainType, x, y, size);
            }
            
        } catch (error) {
            console.error(`❌ Failed to render tile ${tileId}:`, error);
            // Fallback to color-based rendering with known terrain type
            this.renderFallbackTileWithTerrainType(ctx, terrainType, x, y, size);
        }
    }

    /**
     * Fallback rendering using colors (for when textures aren't available)
     */
    renderFallbackTile(ctx, tileId, tileset, x, y, size) {
        const color = this.getFallbackColor(tileId, tileset);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        
        // Add subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, size, size);
    }

    /**
     * Get fallback color for a tile (our existing color system)
     */
    getFallbackColor(tileId, tileset) {
        // Use our existing enhanced color system as fallback
        const terrainType = this.getTerrainType(tileId, tileset);
        
        const colors = {
            'water': '#1E90FF',
            'water-deep': '#0000CD',
            'coast': '#87CEEB',
            'grass': '#32CD32',
            'forest': '#228B22',
            'rock': '#696969',
            'rock-dark': '#2F4F4F',
            'dirt': '#8B4513',
            'sand': '#F4A460',
            'snow': '#FFFFFF',
            'swamp': '#8FBC8F'
        };
        
        return colors[terrainType] || '#808080';
    }

        /**
     * Get fallback color for a known terrain type
     * Based on war2tools project specifications and authentic Warcraft II colors
     */
    getFallbackColorForTerrainType(terrainType) {
        const colors = {
            // Water tiles - Authentic Warcraft II blue tones
            'water': '#4169E1',      // Royal blue (consistent with war2tools)
            'water-deep': '#000080',  // Navy blue for deep water
            
            // Coast/Shore tiles - Light blue variations
            'coast': '#87CEEB',       // Sky blue for coast/shore
            
            // Ground tiles - Tileset-specific colors
            'grass': '#228B22',       // Forest green (authentic Warcraft II)
            'dirt': '#8B4513',        // Saddle brown for wasteland
            
            // Terrain features - Distinct colors
            'forest': '#006400',      // Dark green for trees
            'rock': '#696969',        // Dim gray for mountains/rock
            'rock-dark': '#2F4F4F',   // Dark slate gray
            
            // Tileset-specific variations
            'sand': '#F4A460',        // Sandy brown for wasteland
            'snow': '#F0F8FF',        // Alice blue for winter
            'swamp': '#556B2F'        // Dark olive green for swamp
        };

        return colors[terrainType] || '#666666';
    }

    /**
     * Fallback rendering using colors with known terrain type
     */
    renderFallbackTileWithTerrainType(ctx, terrainType, x, y, size) {
        const color = this.getFallbackColorForTerrainType(terrainType);
        // Only log occasionally to avoid spam
        if (Math.random() < 0.001) { // Log 0.1% of tiles
            console.log(`Rendering ${terrainType} tile at (${x}, ${y}) with color ${color}`);
        }
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        
        // Add subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, size, size);
    }

    /**
     * Get terrain type for a tile (our existing classification system)
     */
    getTerrainType(tileId, tileset) {
        // Simplified version of our Rust terrain classification
        if (tileId >= 0x10 && tileId <= 0x4F) return 'water';
        if (tileId >= 0x50 && tileId <= 0x6F) {
            if (tileset === 0) return 'forest';
            if (tileset === 1) return 'snow';
            if (tileset === 2) return 'sand';
            if (tileset === 3) return 'swamp';
            return 'grass';
        }
        if (tileId >= 0x70 && tileId <= 0x7F) return 'rock';
        if (tileId >= 0xD0 && tileId <= 0xEF) return 'rock-dark';
        if (tileId >= 0x80 && tileId <= 0xFF) {
            // Intelligent dirt classification
            if (tileId % 4 === 0 || tileId % 8 === 0 || tileId % 16 === 0) {
                return 'dirt';
            }
            return 'grass';
        }
        return 'grass';
    }

    /**
     * Check if textures are available
     */
    hasTextures() {
        return this.isTexturesLoaded && this.textureCache.size > 0;
    }

    /**
     * Get texture statistics
     */
    getStats() {
        return {
            isLoaded: this.isTexturesLoaded,
            cachedTextures: this.textureCache.size,
            totalTextures: this.textureAtlas?.totalTextures || 0,
            totalSize: this.textureAtlas?.totalSize || 0
        };
    }

    /**
     * Clear texture cache to free memory
     */
    clearCache() {
        this.textureCache.clear();
        console.log('🗑️ Texture cache cleared');
    }
}

// Export for ES6 modules
export { TextureManager };
