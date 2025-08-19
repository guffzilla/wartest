pub mod grp_parser;
pub mod idx_parser;
pub mod bin_parser;
pub mod json_parser;

use anyhow::Result;
use std::path::Path;

/// Trait for file parsers
pub trait FileParser {
    type Output;
    
    /// Parse a file and return the parsed data
    fn parse<P: AsRef<Path>>(&self, path: P) -> Result<Self::Output>;
    
    /// Check if this parser can handle the given file
    fn can_parse<P: AsRef<Path>>(&self, path: P) -> bool;
}

/// Supported file formats
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum FileFormat {
    Grp,    // Warcraft sprite files
    Idx,    // Index files
    Bin,    // Binary data files
    Json,   // JSON configuration files
    Png,    // PNG image files
    Wav,    // WAV audio files
    Ogg,    // OGG audio files
    Unknown,
}

impl std::fmt::Display for FileFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FileFormat::Grp => write!(f, "grp"),
            FileFormat::Idx => write!(f, "idx"),
            FileFormat::Bin => write!(f, "bin"),
            FileFormat::Json => write!(f, "json"),
            FileFormat::Png => write!(f, "png"),
            FileFormat::Wav => write!(f, "wav"),
            FileFormat::Ogg => write!(f, "ogg"),
            FileFormat::Unknown => write!(f, "unknown"),
        }
    }
}

impl FileFormat {
    /// Detect file format from file extension
    pub fn from_extension<P: AsRef<Path>>(path: P) -> Self {
        let path = path.as_ref();
        match path.extension().and_then(|ext| ext.to_str()) {
            Some("grp") => FileFormat::Grp,
            Some("idx") => FileFormat::Idx,
            Some("bin") => FileFormat::Bin,
            Some("json") => FileFormat::Json,
            Some("png") => FileFormat::Png,
            Some("wav") => FileFormat::Wav,
            Some("ogg") => FileFormat::Ogg,
            _ => FileFormat::Unknown,
        }
    }
}
