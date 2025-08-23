use std::path::Path;
use anyhow::{Result, Context};

/// Supported WC3 file formats
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WC3Format {
    /// MPQ archive
    MPQ,
    /// BLP image
    BLP,
    /// MDX model
    MDX,
    /// WAV audio
    WAV,
    /// TGA image
    TGA,
    /// Unknown format
    Unknown,
}

/// Format category
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FormatCategory {
    /// Archive files
    Archive,
    /// Image files
    Image,
    /// Model files
    Model,
    /// Audio files
    Audio,
    /// Unknown category
    Unknown,
}

/// Format detector
pub struct FormatDetector;

impl FormatDetector {
    /// Detect file format from path
    pub fn detect_from_path(path: &Path) -> WC3Format {
        if let Some(ext) = path.extension() {
            if let Some(ext_str) = ext.to_str() {
                return match ext_str.to_lowercase().as_str() {
                    "mpq" => WC3Format::MPQ,
                    "blp" => WC3Format::BLP,
                    "mdx" => WC3Format::MDX,
                    "wav" => WC3Format::WAV,
                    "tga" => WC3Format::TGA,
                    _ => WC3Format::Unknown,
                };
            }
        }
        WC3Format::Unknown
    }

    /// Detect file format from file header
    pub fn detect_from_header(path: &Path) -> Result<WC3Format> {
        let mut file = std::fs::File::open(path)
            .with_context(|| format!("Failed to open file: {}", path.display()))?;
        
        let mut header = [0u8; 8];
        let bytes_read = std::io::Read::read(&mut file, &mut header)?;
        
        if bytes_read < 4 {
            return Ok(WC3Format::Unknown);
        }
        
        // Check for MPQ magic
        if header[0..4] == [0x4D, 0x50, 0x51, 0x1A] {
            return Ok(WC3Format::MPQ);
        }
        
        // Check for BLP magic
        if header[0..4] == [0x42, 0x4C, 0x50, 0x32] {
            return Ok(WC3Format::BLP);
        }
        
        // Check for MDX magic (MDLX)
        if header[0..4] == [0x4D, 0x44, 0x4C, 0x58] {
            return Ok(WC3Format::MDX);
        }
        
        // Check for WAV magic (RIFF)
        if header[0..4] == [0x52, 0x49, 0x46, 0x46] {
            return Ok(WC3Format::WAV);
        }
        
        // Check for TGA magic
        if header[0..2] == [0x00, 0x00] || header[0..2] == [0x01, 0x01] {
            return Ok(WC3Format::TGA);
        }
        
        Ok(WC3Format::Unknown)
    }
}

impl WC3Format {
    /// Detect format from file
    pub fn detect(path: &Path) -> Result<Self> {
        // Try header detection first
        let header_format = FormatDetector::detect_from_header(path)?;
        if header_format != WC3Format::Unknown {
            return Ok(header_format);
        }
        
        // Fall back to extension detection
        Ok(FormatDetector::detect_from_path(path))
    }

    /// Get format category
    pub fn category(&self) -> FormatCategory {
        match self {
            WC3Format::MPQ => FormatCategory::Archive,
            WC3Format::BLP | WC3Format::TGA => FormatCategory::Image,
            WC3Format::MDX => FormatCategory::Model,
            WC3Format::WAV => FormatCategory::Audio,
            WC3Format::Unknown => FormatCategory::Unknown,
        }
    }

    /// Get file extension
    pub fn extension(&self) -> &'static str {
        match self {
            WC3Format::MPQ => "mpq",
            WC3Format::BLP => "blp",
            WC3Format::MDX => "mdx",
            WC3Format::WAV => "wav",
            WC3Format::TGA => "tga",
            WC3Format::Unknown => "unknown",
        }
    }

    /// Get MIME type
    pub fn mime_type(&self) -> &'static str {
        match self {
            WC3Format::MPQ => "application/octet-stream",
            WC3Format::BLP => "image/x-blp",
            WC3Format::MDX => "model/x-mdx",
            WC3Format::WAV => "audio/wav",
            WC3Format::TGA => "image/tga",
            WC3Format::Unknown => "application/octet-stream",
        }
    }

    /// Check if format is supported
    pub fn is_supported(&self) -> bool {
        *self != WC3Format::Unknown
    }

    /// Get format description
    pub fn description(&self) -> &'static str {
        match self {
            WC3Format::MPQ => "MPQ Archive (Blizzard's archive format)",
            WC3Format::BLP => "BLP Image (Blizzard's image format)",
            WC3Format::MDX => "MDX Model (Warcraft III model format)",
            WC3Format::WAV => "WAV Audio (Waveform audio format)",
            WC3Format::TGA => "TGA Image (Truevision Graphics Adapter)",
            WC3Format::Unknown => "Unknown format",
        }
    }
}

/// Format metadata
#[derive(Debug, Clone)]
pub struct FormatMetadata {
    /// File format
    pub format: WC3Format,
    /// File size in bytes
    pub size: u64,
    /// File path
    pub path: std::path::PathBuf,
    /// Detection method
    pub detection_method: DetectionMethod,
}

/// Detection method
#[derive(Debug, Clone)]
pub enum DetectionMethod {
    /// Detected by file header
    Header,
    /// Detected by file extension
    Extension,
    /// Unknown detection method
    Unknown,
}

impl FormatMetadata {
    /// Create new format metadata
    pub fn new(format: WC3Format, size: u64, path: std::path::PathBuf, method: DetectionMethod) -> Self {
        Self {
            format,
            size,
            path,
            detection_method: method,
        }
    }

    /// Get formatted file size
    pub fn formatted_size(&self) -> String {
        Self::format_size(self.size)
    }

    /// Format file size
    fn format_size(bytes: u64) -> String {
        const UNITS: [&str; 4] = ["B", "KB", "MB", "GB"];
        let mut size = bytes as f64;
        let mut unit_index = 0;
        
        while size >= 1024.0 && unit_index < UNITS.len() - 1 {
            size /= 1024.0;
            unit_index += 1;
        }
        
        if unit_index == 0 {
            format!("{} {}", size as u64, UNITS[unit_index])
        } else {
            format!("{:.1} {}", size, UNITS[unit_index])
        }
    }

    /// Check if format is supported
    pub fn is_supported(&self) -> bool {
        self.format.is_supported()
    }

    /// Get format category
    pub fn category(&self) -> FormatCategory {
        self.format.category()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_format_detection_from_extension() {
        let temp_dir = tempdir().unwrap();
        let mpq_file = temp_dir.path().join("test.mpq");
        let blp_file = temp_dir.path().join("test.blp");
        
        assert_eq!(FormatDetector::detect_from_path(&mpq_file), WC3Format::MPQ);
        assert_eq!(FormatDetector::detect_from_path(&blp_file), WC3Format::BLP);
    }

    #[test]
    fn test_format_category() {
        assert_eq!(WC3Format::MPQ.category(), FormatCategory::Archive);
        assert_eq!(WC3Format::BLP.category(), FormatCategory::Image);
        assert_eq!(WC3Format::MDX.category(), FormatCategory::Model);
        assert_eq!(WC3Format::WAV.category(), FormatCategory::Audio);
    }

    #[test]
    fn test_format_extension() {
        assert_eq!(WC3Format::MPQ.extension(), "mpq");
        assert_eq!(WC3Format::BLP.extension(), "blp");
        assert_eq!(WC3Format::MDX.extension(), "mdx");
    }

    #[test]
    fn test_format_metadata() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.mpq");
        File::create(&test_file).unwrap().write_all(b"test").unwrap();
        
        let metadata = FormatMetadata::new(
            WC3Format::MPQ,
            4,
            test_file,
            DetectionMethod::Extension,
        );
        
        assert_eq!(metadata.formatted_size(), "4 B");
        assert!(metadata.is_supported());
        assert_eq!(metadata.category(), FormatCategory::Archive);
    }
}
