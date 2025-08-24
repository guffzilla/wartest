use std::fmt;

/// Supported WC2 file formats
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum WC2Format {
    /// Warcraft II map files (.pud)
    PUD,
    /// Audio files (.wav)
    WAV,
    /// Image files (.pcx)
    PCX,
    /// Binary data files (.bin)
    BIN,
    /// MPQ archive files
    MPQ,
    /// Campaign files
    CAM,
    /// Save game files
    SAV,
}

impl fmt::Display for WC2Format {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WC2Format::PUD => write!(f, "PUD"),
            WC2Format::WAV => write!(f, "WAV"),
            WC2Format::PCX => write!(f, "PCX"),
            WC2Format::BIN => write!(f, "BIN"),
            WC2Format::MPQ => write!(f, "MPQ"),
            WC2Format::CAM => write!(f, "CAM"),
            WC2Format::SAV => write!(f, "SAV"),
        }
    }
}

impl WC2Format {
    /// Get file extension for this format
    pub fn extension(&self) -> &'static str {
        match self {
            WC2Format::PUD => "pud",
            WC2Format::WAV => "wav",
            WC2Format::PCX => "pcx",
            WC2Format::BIN => "bin",
            WC2Format::MPQ => "mpq",
            WC2Format::CAM => "cam",
            WC2Format::SAV => "sav",
        }
    }

    /// Get MIME type for this format
    pub fn mime_type(&self) -> &'static str {
        match self {
            WC2Format::PUD => "application/octet-stream",
            WC2Format::WAV => "audio/wav",
            WC2Format::PCX => "image/x-pcx",
            WC2Format::BIN => "application/octet-stream",
            WC2Format::MPQ => "application/octet-stream",
            WC2Format::CAM => "application/octet-stream",
            WC2Format::SAV => "application/octet-stream",
        }
    }

    /// Check if this format is an image format
    pub fn is_image(&self) -> bool {
        matches!(self, WC2Format::PCX)
    }

    /// Check if this format is an audio format
    pub fn is_audio(&self) -> bool {
        matches!(self, WC2Format::WAV)
    }

    /// Check if this format is a map format
    pub fn is_map(&self) -> bool {
        matches!(self, WC2Format::PUD)
    }

    /// Check if this format is an archive format
    pub fn is_archive(&self) -> bool {
        matches!(self, WC2Format::MPQ)
    }

    /// Get description for this format
    pub fn description(&self) -> &'static str {
        match self {
            WC2Format::PUD => "Warcraft II Map File",
            WC2Format::WAV => "Audio File",
            WC2Format::PCX => "Image File",
            WC2Format::BIN => "Binary Data File",
            WC2Format::MPQ => "Blizzard Archive File",
            WC2Format::CAM => "Campaign File",
            WC2Format::SAV => "Save Game File",
        }
    }

    /// Get all supported formats
    pub fn all_formats() -> Vec<WC2Format> {
        vec![
            WC2Format::PUD,
            WC2Format::WAV,
            WC2Format::PCX,
            WC2Format::BIN,
            WC2Format::MPQ,
            WC2Format::CAM,
            WC2Format::SAV,
        ]
    }

    /// Get formats by category
    pub fn by_category(category: FormatCategory) -> Vec<WC2Format> {
        match category {
            FormatCategory::Image => vec![WC2Format::PCX],
            FormatCategory::Audio => vec![WC2Format::WAV],
            FormatCategory::Map => vec![WC2Format::PUD],
            FormatCategory::Archive => vec![WC2Format::MPQ],
            FormatCategory::Data => vec![WC2Format::BIN, WC2Format::CAM, WC2Format::SAV],
        }
    }
}

/// Format categories for organization
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FormatCategory {
    Image,
    Audio,
    Map,
    Archive,
    Data,
}

impl fmt::Display for FormatCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FormatCategory::Image => write!(f, "Image"),
            FormatCategory::Audio => write!(f, "Audio"),
            FormatCategory::Map => write!(f, "Map"),
            FormatCategory::Archive => write!(f, "Archive"),
            FormatCategory::Data => write!(f, "Data"),
        }
    }
}

/// File format detection utilities
pub struct FormatDetector;

impl FormatDetector {
    /// Detect format from file extension
    pub fn from_extension(extension: &str) -> Option<WC2Format> {
        let ext = extension.to_lowercase();
        match ext.as_str() {
            "pud" => Some(WC2Format::PUD),
            "wav" => Some(WC2Format::WAV),
            "pcx" => Some(WC2Format::PCX),
            "bin" => Some(WC2Format::BIN),
            "mpq" => Some(WC2Format::MPQ),
            "cam" => Some(WC2Format::CAM),
            "sav" => Some(WC2Format::SAV),
            _ => None,
        }
    }

    /// Detect format from file path
    pub fn from_path<P: AsRef<std::path::Path>>(path: P) -> Option<WC2Format> {
        path.as_ref()
            .extension()
            .and_then(|ext| ext.to_str())
            .and_then(|ext| Self::from_extension(ext))
    }

    /// Detect format from file header (magic bytes)
    pub fn from_magic_bytes(data: &[u8]) -> Option<WC2Format> {
        if data.len() < 4 {
            return None;
        }

        // Check for common magic bytes
        match &data[0..4] {
            b"RIFF" => Some(WC2Format::WAV),  // WAV files start with "RIFF"
            b"MPQ\x1A" => Some(WC2Format::MPQ), // MPQ files have this signature
            _ => {
                // For other formats, we'd need more sophisticated detection
                // For now, return None and rely on file extension
                None
            }
        }
    }

    /// Get all supported extensions
    pub fn supported_extensions() -> Vec<&'static str> {
        WC2Format::all_formats()
            .iter()
            .map(|f| f.extension())
            .collect()
    }
}

/// Format-specific metadata
#[derive(Debug, Clone)]
pub struct FormatMetadata {
    /// The format
    pub format: WC2Format,
    /// File size in bytes
    pub size: u64,
    /// Whether the format is supported for extraction
    pub supported: bool,
    /// Additional format-specific information
    pub details: Option<String>,
}

impl FormatMetadata {
    /// Create new format metadata
    pub fn new(format: WC2Format, size: u64) -> Self {
        Self {
            format,
            size,
            supported: true, // All WC2 formats are supported
            details: None,
        }
    }

    /// Add format-specific details
    pub fn with_details(mut self, details: String) -> Self {
        self.details = Some(details);
        self
    }

    /// Get formatted file size
    pub fn formatted_size(&self) -> String {
        Self::format_size(self.size)
    }

    /// Format file size in human-readable format
    fn format_size(bytes: u64) -> String {
        const UNITS: [&str; 4] = ["B", "KB", "MB", "GB"];
        let mut size = bytes as f64;
        let mut unit_index = 0;
        
        while size >= 1024.0 && unit_index < UNITS.len() - 1 {
            size /= 1024.0;
            unit_index += 1;
        }
        
        if unit_index == 0 {
            format!("{} {}", bytes, UNITS[unit_index])
        } else {
            format!("{:.1} {}", size, UNITS[unit_index])
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_display() {
        assert_eq!(WC2Format::PUD.to_string(), "PUD");
        assert_eq!(WC2Format::WAV.to_string(), "WAV");
        assert_eq!(WC2Format::PCX.to_string(), "PCX");
    }

    #[test]
    fn test_format_extension() {
        assert_eq!(WC2Format::PUD.extension(), "pud");
        assert_eq!(WC2Format::WAV.extension(), "wav");
        assert_eq!(WC2Format::PCX.extension(), "pcx");
    }

    #[test]
    fn test_format_detection() {
        assert_eq!(FormatDetector::from_extension("pud"), Some(WC2Format::PUD));
        assert_eq!(FormatDetector::from_extension("WAV"), Some(WC2Format::WAV));
        assert_eq!(FormatDetector::from_extension("unknown"), None);
    }

    #[test]
    fn test_format_categories() {
        assert!(WC2Format::PCX.is_image());
        assert!(WC2Format::WAV.is_audio());
        assert!(WC2Format::PUD.is_map());
        assert!(WC2Format::MPQ.is_archive());
    }

    #[test]
    fn test_format_metadata() {
        let metadata = FormatMetadata::new(WC2Format::PUD, 1024);
        assert_eq!(metadata.format, WC2Format::PUD);
        assert_eq!(metadata.size, 1024);
        assert!(metadata.supported);
    }
}
