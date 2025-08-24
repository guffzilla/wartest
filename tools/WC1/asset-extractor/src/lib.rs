//! Warcraft I Asset Extraction System
//! 
//! This library provides functionality for extracting and analyzing assets from Warcraft I game files.

pub mod extractor;
pub mod formats;
pub mod utils;

pub use extractor::WC1AssetExtractor;

/// Result type for the WC1 asset extractor
pub type Result<T> = anyhow::Result<T>;

/// Error type for the WC1 asset extractor
#[derive(thiserror::Error, Debug)]
pub enum ExtractorError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("Invalid file format: {0}")]
    InvalidFormat(String),
    
    #[error("Extraction failed: {0}")]
    ExtractionFailed(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Configuration for the asset extractor
#[derive(Debug, Clone)]
pub struct ExtractorConfig {
    /// Input directory containing game files
    pub input_dir: String,
    
    /// Output directory for extracted assets
    pub output_dir: String,
    
    /// Whether to extract images
    pub extract_images: bool,
    
    /// Whether to extract audio
    pub extract_audio: bool,
    
    /// Whether to extract data files
    pub extract_data: bool,
}

impl Default for ExtractorConfig {
    fn default() -> Self {
        Self {
            input_dir: ".".to_string(),
            output_dir: "./extracted".to_string(),
            extract_images: true,
            extract_audio: true,
            extract_data: true,
        }
    }
}
