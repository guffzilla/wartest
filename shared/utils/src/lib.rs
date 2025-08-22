//! Shared utility functions and helpers
//! 
//! This library provides common utility functions for file operations, binary parsing, and asset extraction.

pub mod file_ops;
pub mod binary_parser;
pub mod asset_extraction;

pub use file_ops::FileOps;
pub use binary_parser::BinaryParser;
pub use asset_extraction::AssetExtraction;

/// Result type for the shared utils library
pub type Result<T> = anyhow::Result<T>;

/// Error type for the shared utils library
#[derive(thiserror::Error, Debug)]
pub enum UtilsError {
    #[error("File operation error: {0}")]
    FileOpError(String),
    
    #[error("Binary parsing error: {0}")]
    BinaryParseError(String),
    
    #[error("Asset extraction error: {0}")]
    AssetExtractionError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}
