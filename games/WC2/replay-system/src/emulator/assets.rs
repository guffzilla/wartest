//! Asset manager for WC2 Remastered graphics and resources
//! 
//! This module handles loading, caching, and managing all graphics assets
//! needed for rendering replays with Remastered-quality visuals.

use anyhow::Result;
use std::collections::HashMap;
use std::path::PathBuf;

/// Asset types that can be loaded
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AssetType {
    Texture,
    Sprite,
    Animation,
    Sound,
    Music,
    Font,
}

/// Asset manager for WC2 Remastered resources
pub struct AssetManager {
    asset_cache: HashMap<String, Asset>,
    asset_paths: HashMap<AssetType, PathBuf>,
    loaded_assets: HashMap<String, bool>,
}

/// Generic asset representation
pub struct Asset {
    id: String,
    asset_type: AssetType,
    data: AssetData,
    metadata: AssetMetadata,
}

/// Asset data container
pub enum AssetData {
    Texture(TextureAsset),
    Sprite(SpriteAsset),
    Animation(AnimationAsset),
    Sound(SoundAsset),
    Music(MusicAsset),
    Font(FontAsset),
}

/// Texture asset data
pub struct TextureAsset {
    width: u32,
    height: u32,
    format: TextureFormat,
    data: Vec<u8>,
    mipmaps: Vec<Vec<u8>>,
}

/// Sprite asset data
pub struct SpriteAsset {
    texture_id: String,
    region: SpriteRegion,
    pivot: (f32, f32),
    animations: Vec<String>, // Changed from Vec<Animation> to Vec<String> to avoid circular reference
}

/// Animation asset data
pub struct AnimationAsset {
    frames: Vec<AnimationFrame>,
    frame_rate: f32,
    loop_type: LoopType,
}

/// Sound asset data
pub struct SoundAsset {
    sample_rate: u32,
    channels: u8,
    data: Vec<u8>,
    duration: f32,
}

/// Music asset data
pub struct MusicAsset {
    sample_rate: u32,
    channels: u8,
    data: Vec<u8>,
    duration: f32,
    loop_point: Option<f32>,
}

/// Font asset data
pub struct FontAsset {
    family: String,
    size: u32,
    glyphs: HashMap<char, GlyphData>,
    metrics: FontMetrics,
}

/// Texture format enumeration
pub enum TextureFormat {
    RGBA8,
    RGB8,
    RG8,
    R8,
    DXT1,
    DXT5,
}

/// Sprite region within texture
pub struct SpriteRegion {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

/// Animation frame data
pub struct AnimationFrame {
    sprite_id: String,
    duration: f32,
    offset: (f32, f32),
}

/// Loop type for animations
pub enum LoopType {
    None,
    Loop,
    PingPong,
}

/// Glyph data for fonts
pub struct GlyphData {
    texture_region: SpriteRegion,
    advance: f32,
    bearing: (f32, f32),
}

/// Font metrics
pub struct FontMetrics {
    ascent: f32,
    descent: f32,
    line_height: f32,
}

/// Asset metadata
pub struct AssetMetadata {
    file_path: PathBuf,
    file_size: u64,
    creation_date: chrono::DateTime<chrono::Utc>,
    checksum: String,
}

impl AssetManager {
    /// Create a new asset manager
    pub fn new() -> Result<Self> {
        let asset_cache = HashMap::new();
        let asset_paths = Self::initialize_asset_paths()?;
        let loaded_assets = HashMap::new();
        
        Ok(Self {
            asset_cache,
            asset_paths,
            loaded_assets,
        })
    }
    
    /// Initialize asset paths for different asset types
    fn initialize_asset_paths() -> Result<HashMap<AssetType, PathBuf>> {
        let mut paths = HashMap::new();
        
        // Set paths for WC2 Remastered assets
        // These would typically point to the game installation directory
        paths.insert(AssetType::Texture, PathBuf::from("../../Warcraft II Remastered/Data/Art"));
        paths.insert(AssetType::Sprite, PathBuf::from("../../Warcraft II Remastered/Data/Art"));
        paths.insert(AssetType::Animation, PathBuf::from("../../Warcraft II Remastered/Data/Art"));
        paths.insert(AssetType::Sound, PathBuf::from("../../Warcraft II Remastered/Data/Speech"));
        paths.insert(AssetType::Music, PathBuf::from("../../Warcraft II Remastered/Data/Music"));
        paths.insert(AssetType::Font, PathBuf::from("../../Warcraft II Remastered/Data/Font"));
        
        Ok(paths)
    }
    
    /// Load an asset by ID
    pub fn load_asset(&mut self, asset_id: &str) -> Result<&Asset> {
        // Check if asset is already loaded
        if self.asset_cache.contains_key(asset_id) {
            return self.asset_cache.get(asset_id)
                .ok_or_else(|| anyhow::anyhow!("Failed to retrieve cached asset"));
        }
        
        // Load the asset from disk
        let asset = self.load_asset_from_disk(asset_id)?;
        
        // Cache the asset
        self.asset_cache.insert(asset_id.to_string(), asset);
        self.loaded_assets.insert(asset_id.to_string(), true);
        
        // Return reference to cached asset
        self.asset_cache.get(asset_id)
            .ok_or_else(|| anyhow::anyhow!("Failed to retrieve loaded asset"))
    }
    
    /// Load asset from disk
    fn load_asset_from_disk(&self, asset_id: &str) -> Result<Asset> {
        // Determine asset type from ID
        let asset_type = self.determine_asset_type(asset_id)?;
        
        // Get asset path
        let asset_path = self.asset_paths.get(&asset_type)
            .ok_or_else(|| anyhow::anyhow!("No path configured for asset type"))?;
        
        // Load asset based on type
        let asset_data = match asset_type {
            AssetType::Texture => {
                AssetData::Texture(self.load_texture_asset(asset_path, asset_id)?)
            }
            AssetType::Sprite => {
                AssetData::Sprite(self.load_sprite_asset(asset_path, asset_id)?)
            }
            AssetType::Animation => {
                AssetData::Animation(self.load_animation_asset(asset_path, asset_id)?)
            }
            AssetType::Sound => {
                AssetData::Sound(self.load_sound_asset(asset_path, asset_id)?)
            }
            AssetType::Music => {
                AssetData::Music(self.load_music_asset(asset_path, asset_id)?)
            }
            AssetType::Font => {
                AssetData::Font(self.load_font_asset(asset_path, asset_id)?)
            }
        };
        
        // Create asset metadata
        let metadata = AssetMetadata {
            file_path: asset_path.join(format!("{}.asset", asset_id)),
            file_size: 0, // Will be set during loading
            creation_date: chrono::Utc::now(),
            checksum: String::new(), // Will be calculated during loading
        };
        
        Ok(Asset {
            id: asset_id.to_string(),
            asset_type,
            data: asset_data,
            metadata,
        })
    }
    
    /// Determine asset type from asset ID
    fn determine_asset_type(&self, asset_id: &str) -> Result<AssetType> {
        // Parse asset ID to determine type
        // This is a simplified implementation
        if asset_id.contains("texture") || asset_id.contains("tex") {
            Ok(AssetType::Texture)
        } else if asset_id.contains("sprite") || asset_id.contains("spr") {
            Ok(AssetType::Sprite)
        } else if asset_id.contains("animation") || asset_id.contains("anim") {
            Ok(AssetType::Animation)
        } else if asset_id.contains("sound") || asset_id.contains("sfx") {
            Ok(AssetType::Sound)
        } else if asset_id.contains("music") || asset_id.contains("bgm") {
            Ok(AssetType::Music)
        } else if asset_id.contains("font") {
            Ok(AssetType::Font)
        } else {
            // Default to texture for unknown types
            Ok(AssetType::Texture)
        }
    }
    
    /// Load texture asset
    fn load_texture_asset(&self, asset_path: &PathBuf, asset_id: &str) -> Result<TextureAsset> {
        // This is a placeholder implementation
        // In a real implementation, this would load actual texture files
        
        Ok(TextureAsset {
            width: 64,
            height: 64,
            format: TextureFormat::RGBA8,
            data: vec![0; 64 * 64 * 4], // Placeholder data
            mipmaps: Vec::new(),
        })
    }
    
    /// Load sprite asset
    fn load_sprite_asset(&self, asset_path: &PathBuf, asset_id: &str) -> Result<SpriteAsset> {
        // This is a placeholder implementation
        
        Ok(SpriteAsset {
            texture_id: asset_id.to_string(),
            region: SpriteRegion { x: 0, y: 0, width: 64, height: 64 },
            pivot: (0.5, 0.5),
            animations: Vec::new(),
        })
    }
    
    /// Load animation asset
    fn load_animation_asset(&self, asset_path: &PathBuf, asset_id: &str) -> Result<AnimationAsset> {
        // This is a placeholder implementation
        
        Ok(AnimationAsset {
            frames: Vec::new(),
            frame_rate: 24.0,
            loop_type: LoopType::Loop,
        })
    }
    
    /// Load sound asset
    fn load_sound_asset(&self, asset_path: &PathBuf, asset_id: &str) -> Result<SoundAsset> {
        // This is a placeholder implementation
        
        Ok(SoundAsset {
            sample_rate: 44100,
            channels: 2,
            data: Vec::new(),
            duration: 0.0,
        })
    }
    
    /// Load music asset
    fn load_music_asset(&self, asset_path: &PathBuf, asset_id: &str) -> Result<MusicAsset> {
        // This is a placeholder implementation
        
        Ok(MusicAsset {
            sample_rate: 44100,
            channels: 2,
            data: Vec::new(),
            duration: 0.0,
            loop_point: None,
        })
    }
    
    /// Load font asset
    fn load_font_asset(&self, asset_path: &PathBuf, asset_id: &str) -> Result<FontAsset> {
        // This is a placeholder implementation
        
        Ok(FontAsset {
            family: "Arial".to_string(),
            size: 12,
            glyphs: HashMap::new(),
            metrics: FontMetrics {
                ascent: 10.0,
                descent: 2.0,
                line_height: 12.0,
            },
        })
    }
    
    /// Check if an asset is loaded
    pub fn is_asset_loaded(&self, asset_id: &str) -> bool {
        self.loaded_assets.get(asset_id).copied().unwrap_or(false)
    }
    
    /// Get asset by ID (returns None if not loaded)
    pub fn get_asset(&self, asset_id: &str) -> Option<&Asset> {
        self.asset_cache.get(asset_id)
    }
    
    /// Unload an asset to free memory
    pub fn unload_asset(&mut self, asset_id: &str) -> Result<()> {
        if self.asset_cache.remove(asset_id).is_some() {
            self.loaded_assets.remove(asset_id);
        }
        
        Ok(())
    }
    
    /// Get asset path for a specific type
    pub fn get_asset_path(&self, asset_type: &AssetType) -> Option<&PathBuf> {
        self.asset_paths.get(asset_type)
    }
    
    /// Set custom asset path for a type
    pub fn set_asset_path(&mut self, asset_type: AssetType, path: PathBuf) {
        self.asset_paths.insert(asset_type, path);
    }
    
    /// Preload common assets
    pub fn preload_common_assets(&mut self) -> Result<()> {
        // Load commonly used assets like UI elements, basic units, etc.
        let common_assets = vec![
            "ui_button",
            "ui_panel",
            "unit_peasant",
            "unit_footman",
            "building_townhall",
            "building_barracks",
        ];
        
        for asset_id in common_assets {
            self.load_asset(asset_id)?;
        }
        
        Ok(())
    }
    
    /// Get memory usage statistics
    pub fn get_memory_usage(&self) -> MemoryUsage {
        let mut total_size = 0;
        let asset_count = self.asset_cache.len();
        
        for asset in self.asset_cache.values() {
            total_size += self.get_asset_size(asset);
        }
        
        MemoryUsage {
            asset_count,
            total_size_bytes: total_size,
            cache_hits: 0, // Would need to implement hit tracking
            cache_misses: 0,
        }
    }
    
    /// Get size of an asset in bytes
    fn get_asset_size(&self, asset: &Asset) -> usize {
        match &asset.data {
            AssetData::Texture(tex) => tex.data.len(),
            AssetData::Sprite(_) => 0, // Sprites reference textures
            AssetData::Animation(_) => 0, // Animations reference sprites
            AssetData::Sound(sound) => sound.data.len(),
            AssetData::Music(music) => music.data.len(),
            AssetData::Font(_) => 0, // Fonts are typically small
        }
    }
}

/// Memory usage statistics
pub struct MemoryUsage {
    pub asset_count: usize,
    pub total_size_bytes: usize,
    pub cache_hits: u64,
    pub cache_misses: u64,
}
