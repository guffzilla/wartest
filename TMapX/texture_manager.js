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
     * Get tileset name for display
     */
    getTilesetName(tileset) {
        const tilesetNames = {
            0: 'Forest',
            1: 'Winter', 
            2: 'Wasteland',
            3: 'Swamp'
        };
        return tilesetNames[tileset] || 'Unknown';
    }

    /**
     * Get terrain type for a tile with proper tileset support
     * Based on authentic Warcraft II terrain classification
     */
    getTerrainType(tileId, tileset) {
        // Water tiles (same across all tilesets)
        if (tileId >= 0x10 && tileId <= 0x4F) return 'water';
        
        // Coast/Shore tiles (same across all tilesets)
        if (tileId >= 0x50 && tileId <= 0x6F) return 'coast';
        
        // Ground tiles - Tileset-specific classification
        if (tileId >= 0x70 && tileId <= 0x8F) {
            switch (tileset) {
                case 0: // Forest
                    if (tileId >= 0x70 && tileId <= 0x7F) return 'rock';
                    if (tileId >= 0x80 && tileId <= 0x8F) return 'forest';
                    break;
                case 1: // Winter
                    if (tileId >= 0x70 && tileId <= 0x7F) return 'rock';
                    if (tileId >= 0x80 && tileId <= 0x8F) return 'snow';
                    break;
                case 2: // Wasteland
                    if (tileId >= 0x70 && tileId <= 0x7F) return 'rock';
                    if (tileId >= 0x80 && tileId <= 0x8F) return 'sand';
                    break;
                case 3: // Swamp
                    if (tileId >= 0x70 && tileId <= 0x7F) return 'rock';
                    if (tileId >= 0x80 && tileId <= 0x8F) return 'swamp';
                    break;
            }
        }
        
        // Extended terrain tiles
        if (tileId >= 0x90 && tileId <= 0xAF) {
            switch (tileset) {
                case 0: // Forest
                    return 'grass';
                case 1: // Winter
                    return 'snow';
                case 2: // Wasteland
                    return 'dirt';
                case 3: // Swamp
                    return 'swamp';
            }
        }
        
        // Rock and mountain tiles
        if (tileId >= 0xB0 && tileId <= 0xCF) return 'rock';
        if (tileId >= 0xD0 && tileId <= 0xEF) return 'rock-dark';
        
        // Final terrain classification
        if (tileId >= 0xF0 && tileId <= 0xFF) {
            switch (tileset) {
                case 0: return 'forest';  // Forest
                case 1: return 'snow';    // Winter
                case 2: return 'dirt';    // Wasteland
                case 3: return 'swamp';   // Swamp
                default: return 'grass';
            }
        }
        
        // Default fallback based on tileset
        switch (tileset) {
            case 0: return 'forest';  // Forest
            case 1: return 'snow';    // Winter
            case 2: return 'dirt';    // Wasteland
            case 3: return 'swamp';   // Swamp
            default: return 'grass';
        }
    }

    /**
     * Get tileset name for display
     */
    getTilesetName(tileset) {
        const tilesetNames = {
            0: 'Forest',
            1: 'Winter', 
            2: 'Wasteland',
            3: 'Swamp'
        };
        return tilesetNames[tileset] || 'Unknown';
    }

    /**
     * Get enhanced fallback colors with tileset-specific variations
     */
    getFallbackColorForTerrainType(terrainType, tileset = 0) {
        const baseColors = {
            // Water tiles - Same across all tilesets
            'water': '#4169E1',      // Royal blue
            'water-deep': '#000080',  // Navy blue
            'coast': '#87CEEB',       // Sky blue
            
            // Rock tiles - Same across all tilesets
            'rock': '#696969',        // Dim gray
            'rock-dark': '#2F4F4F',   // Dark slate gray
        };

        // Tileset-specific colors
        const tilesetColors = {
            0: { // Forest
                'grass': '#228B22',       // Forest green
                'forest': '#006400',      // Dark green
                'dirt': '#8B4513',       // Saddle brown
            },
            1: { // Winter
                'grass': '#F0F8FF',      // Alice blue (snow)
                'forest': '#E6E6FA',     // Lavender (frozen trees)
                'dirt': '#F5F5DC',       // Beige (frozen ground)
                'snow': '#FFFFFF',       // Pure white
            },
            2: { // Wasteland
                'grass': '#F4A460',      // Sandy brown
                'forest': '#DEB887',     // Burlywood
                'dirt': '#CD853F',       // Peru (desert)
                'sand': '#F4A460',       // Sandy brown
            },
            3: { // Swamp
                'grass': '#556B2F',      // Dark olive green
                'forest': '#6B8E23',     // Olive drab
                'dirt': '#8FBC8F',      // Dark sea green
                'swamp': '#556B2F',      // Dark olive green
            }
        };

        // Return base color if it exists
        if (baseColors[terrainType]) {
            return baseColors[terrainType];
        }

        // Return tileset-specific color
        const tilesetColor = tilesetColors[tileset]?.[terrainType];
        if (tilesetColor) {
            return tilesetColor;
        }

        // Fallback colors for unknown terrain types
        const fallbackColors = {
            'grass': '#228B22',
            'forest': '#006400',
            'dirt': '#8B4513',
            'snow': '#FFFFFF',
            'sand': '#F4A460',
            'swamp': '#556B2F'
        };

        return fallbackColors[terrainType] || '#666666';
    }

    /**
     * Enhanced fallback rendering with tileset support
     */
    renderFallbackTileWithTerrainType(ctx, terrainType, x, y, size, tileset = 0) {
        const color = this.getFallbackColorForTerrainType(terrainType, tileset);
        
        // Only log occasionally to avoid spam
        if (Math.random() < 0.001) {
            const tilesetName = this.getTilesetName(tileset);
            console.log(`🎨 Rendering ${terrainType} tile at (${x}, ${y}) with ${tilesetName} tileset color: ${color}`);
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        
        // Add subtle border based on tileset
        let borderColor = 'rgba(255, 255, 255, 0.1)';
        let borderWidth = 0.5;
        
        // Enhanced borders for different tilesets
        switch (tileset) {
            case 0: // Forest - subtle green tint
                borderColor = 'rgba(34, 139, 34, 0.2)';
                break;
            case 1: // Winter - subtle blue tint
                borderColor = 'rgba(240, 248, 255, 0.3)';
                break;
            case 2: // Wasteland - subtle brown tint
                borderColor = 'rgba(244, 164, 96, 0.2)';
                break;
            case 3: // Swamp - subtle olive tint
                borderColor = 'rgba(85, 107, 47, 0.3)';
                break;
        }
        
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(x, y, size, size);
        
        // Add tileset-specific texture hints
        this.addTilesetTextureHints(ctx, terrainType, tileset, x, y, size);
    }

    /**
     * Add subtle texture hints based on tileset
     */
    addTilesetTextureHints(ctx, terrainType, tileset, x, y, size) {
        if (size < 8) return; // Too small for texture hints
        
        ctx.save();
        ctx.globalAlpha = 0.1;
        
        switch (tileset) {
            case 0: // Forest
                if (terrainType === 'forest') {
                    // Add subtle tree-like dots
                    this.drawTextureDots(ctx, x, y, size, '#006400', 3);
                }
                break;
            case 1: // Winter
                if (terrainType === 'snow') {
                    // Add subtle snowflake-like patterns
                    this.drawTextureDots(ctx, x, y, size, '#FFFFFF', 2);
                }
                break;
            case 2: // Wasteland
                if (terrainType === 'sand' || terrainType === 'dirt') {
                    // Add subtle sand-like texture
                    this.drawTextureDots(ctx, x, y, size, '#CD853F', 4);
                }
                break;
            case 3: // Swamp
                if (terrainType === 'swamp') {
                    // Add subtle swamp-like texture
                    this.drawTextureDots(ctx, x, y, size, '#556B2F', 3);
                }
                break;
        }
        
        ctx.restore();
    }

    /**
     * Draw subtle texture dots
     */
    drawTextureDots(ctx, x, y, size, color, count) {
        ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
            const dotX = x + Math.random() * size;
            const dotY = y + Math.random() * size;
            const dotSize = Math.random() * 2 + 1;
            
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }
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
