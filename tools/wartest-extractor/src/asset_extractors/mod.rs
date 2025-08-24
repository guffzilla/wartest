pub mod image_extractor;
pub mod sound_extractor;
pub mod data_extractor;

use anyhow::Result;
use std::path::Path;

/// Trait for asset extractors
pub trait AssetExtractor {
    type Output;
    
    /// Extract assets from a source
    fn extract<P: AsRef<Path>>(&self, source: P, output: P) -> Result<Self::Output>;
    
    /// Check if this extractor can handle the given source
    fn can_extract<P: AsRef<Path>>(&self, source: P) -> bool;
}

/// Supported asset types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AssetType {
    Sprite,     // Unit and building sprites
    Background, // Background images
    UI,         // User interface elements
    Sound,      // Audio files
    Music,      // Background music
    Data,       // Game data files
    Unknown,
}
