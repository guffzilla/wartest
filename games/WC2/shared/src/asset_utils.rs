use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// Asset utilities for WC2
pub struct AssetUtils;

impl AssetUtils {
    /// Get asset file extension
    pub fn get_asset_extension(path: &Path) -> Option<String> {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
    }

    /// Check if file is a supported asset type
    pub fn is_supported_asset(path: &Path) -> bool {
        let supported_extensions = vec!["pud", "wav", "pcx", "bin", "mpq"];
        
        if let Some(ext) = Self::get_asset_extension(path) {
            supported_extensions.contains(&ext.as_str())
        } else {
            false
        }
    }

    /// Get asset type from file extension
    pub fn get_asset_type(path: &Path) -> Option<AssetType> {
        let ext = Self::get_asset_extension(path)?;
        
        match ext.as_str() {
            "pud" => Some(AssetType::Map),
            "wav" => Some(AssetType::Audio),
            "pcx" => Some(AssetType::Image),
            "bin" => Some(AssetType::Binary),
            "mpq" => Some(AssetType::Archive),
            _ => None,
        }
    }

    /// Generate asset output path
    pub fn generate_output_path(
        source: &Path,
        output_dir: &Path,
        asset_type: AssetType,
    ) -> PathBuf {
        let filename = source.file_name()
            .unwrap_or_else(|| std::ffi::OsStr::new("unknown"));
        
        let mut output_path = output_dir.to_path_buf();
        output_path.push(asset_type.to_string());
        output_path.push(filename);
        output_path
    }

    /// Validate asset file
    pub fn validate_asset_file(path: &Path) -> Result<()> {
        if !path.exists() {
            return Err(anyhow::anyhow!("Asset file does not exist: {}", path.display()));
        }
        
        if !path.is_file() {
            return Err(anyhow::anyhow!("Asset path is not a file: {}", path.display()));
        }
        
        if !Self::is_supported_asset(path) {
            return Err(anyhow::anyhow!("Unsupported asset type: {}", path.display()));
        }
        
        Ok(())
    }

    /// Get asset file size
    pub fn get_asset_size(path: &Path) -> Result<u64> {
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        Ok(metadata.len())
    }

    /// List asset files in directory
    pub fn list_asset_files(dir: &Path) -> Result<Vec<PathBuf>> {
        let mut asset_files = Vec::new();
        
        if !dir.exists() || !dir.is_dir() {
            return Ok(asset_files);
        }

        for entry in std::fs::read_dir(dir)
            .with_context(|| format!("Failed to read directory {}", dir.display()))? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && Self::is_supported_asset(&path) {
                asset_files.push(path);
            }
        }
        
        Ok(asset_files)
    }
}

/// Asset types
#[derive(Debug, Clone, PartialEq)]
pub enum AssetType {
    Map,
    Audio,
    Image,
    Binary,
    Archive,
}

impl AssetType {
    /// Get string representation
    pub fn to_string(&self) -> &'static str {
        match self {
            AssetType::Map => "maps",
            AssetType::Audio => "audio",
            AssetType::Image => "images",
            AssetType::Binary => "binary",
            AssetType::Archive => "archives",
        }
    }

    /// Get file extension
    pub fn extension(&self) -> &'static str {
        match self {
            AssetType::Map => "pud",
            AssetType::Audio => "wav",
            AssetType::Image => "pcx",
            AssetType::Binary => "bin",
            AssetType::Archive => "mpq",
        }
    }

    /// Get MIME type
    pub fn mime_type(&self) -> &'static str {
        match self {
            AssetType::Map => "application/octet-stream",
            AssetType::Audio => "audio/wav",
            AssetType::Image => "image/x-pcx",
            AssetType::Binary => "application/octet-stream",
            AssetType::Archive => "application/octet-stream",
        }
    }
}

/// Asset metadata
#[derive(Debug, Clone)]
pub struct AssetMetadata {
    /// Asset type
    pub asset_type: AssetType,
    /// File path
    pub path: PathBuf,
    /// File size in bytes
    pub size: u64,
    /// Creation time
    pub created: Option<std::time::SystemTime>,
    /// Modification time
    pub modified: Option<std::time::SystemTime>,
}

impl AssetMetadata {
    /// Create new asset metadata
    pub fn new(asset_type: AssetType, path: PathBuf, size: u64) -> Self {
        Self {
            asset_type,
            path,
            size,
            created: None,
            modified: None,
        }
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
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_asset_utils() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.pud");
        
        File::create(&test_file).unwrap().write_all(b"test").unwrap();
        
        assert!(AssetUtils::is_supported_asset(&test_file));
        assert_eq!(AssetUtils::get_asset_type(&test_file), Some(AssetType::Map));
    }

    #[test]
    fn test_asset_type() {
        assert_eq!(AssetType::Map.to_string(), "maps");
        assert_eq!(AssetType::Audio.extension(), "wav");
        assert_eq!(AssetType::Binary.mime_type(), "application/octet-stream");
    }

    #[test]
    fn test_asset_metadata() {
        let metadata = AssetMetadata::new(
            AssetType::Map,
            PathBuf::from("test.pud"),
            1024,
        );
        
        assert_eq!(metadata.asset_type, AssetType::Map);
        assert_eq!(metadata.size, 1024);
        assert_eq!(metadata.formatted_size(), "1.0 KB");
    }
}
