use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// Asset utilities for Warcraft III
pub struct AssetUtils;

impl AssetUtils {
    /// Get asset file extension
    pub fn get_asset_extension(path: &Path) -> Option<String> {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
    }

    /// Check if file is a game asset
    pub fn is_game_asset(path: &Path) -> bool {
        if let Some(ext) = Self::get_asset_extension(path) {
            let game_extensions = [
                "mpq", "blp", "mdx", "wav", "tga", "w3m", "w3x", "pud", "pcx", "bin"
            ];
            return game_extensions.contains(&ext.as_str());
        }
        false
    }

    /// Get asset type from file
    pub fn get_asset_type(path: &Path) -> AssetType {
        if let Some(ext) = Self::get_asset_extension(path) {
            match ext.as_str() {
                "mpq" => AssetType::Archive,
                "blp" | "tga" | "pcx" => AssetType::Image,
                "mdx" => AssetType::Model,
                "wav" => AssetType::Audio,
                "w3m" | "w3x" => AssetType::Map,
                "pud" => AssetType::Map,
                "bin" => AssetType::Binary,
                _ => AssetType::Unknown,
            }
        } else {
            AssetType::Unknown
        }
    }

    /// Generate asset output path
    pub fn generate_asset_output_path(
        input_path: &Path,
        output_dir: &Path,
        suffix: &str,
        extension: &str
    ) -> PathBuf {
        let stem = input_path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("asset");
        
        let mut filename = format!("{}_{}", stem, suffix);
        if !extension.starts_with('.') {
            filename.push('.');
        }
        filename.push_str(extension);
        
        output_dir.join(filename)
    }

    /// Validate asset file
    pub fn validate_asset_file(path: &Path) -> Result<()> {
        if !path.exists() {
            return Err(anyhow::anyhow!("Asset file does not exist: {}", path.display()));
        }
        
        if !path.is_file() {
            return Err(anyhow::anyhow!("Path is not a file: {}", path.display()));
        }
        
        if !Self::is_game_asset(path) {
            return Err(anyhow::anyhow!("File is not a recognized game asset: {}", path.display()));
        }
        
        Ok(())
    }

    /// Get asset metadata
    pub fn get_asset_metadata(path: &Path) -> Result<AssetMetadata> {
        Self::validate_asset_file(path)?;
        
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        
        let asset_type = Self::get_asset_type(path);
        let extension = Self::get_asset_extension(path).unwrap_or_default();
        
        Ok(AssetMetadata {
            path: path.to_path_buf(),
            size: metadata.len(),
            asset_type,
            extension,
            created: metadata.created().ok(),
            modified: metadata.modified().ok(),
            accessed: metadata.accessed().ok(),
        })
    }

    /// Check if asset is compressed
    pub fn is_asset_compressed(path: &Path) -> bool {
        if let Some(ext) = Self::get_asset_extension(path) {
            matches!(ext.as_str(), "mpq" | "blp" | "mdx")
        } else {
            false
        }
    }

    /// Check if asset is encrypted
    pub fn is_asset_encrypted(path: &Path) -> bool {
        if let Some(ext) = Self::get_asset_extension(path) {
            matches!(ext.as_str(), "mpq")
        } else {
            false
        }
    }

    /// Get asset category
    pub fn get_asset_category(path: &Path) -> AssetCategory {
        let asset_type = Self::get_asset_type(path);
        match asset_type {
            AssetType::Archive => AssetCategory::Data,
            AssetType::Image => AssetCategory::Graphics,
            AssetType::Model => AssetCategory::Graphics,
            AssetType::Audio => AssetCategory::Audio,
            AssetType::Map => AssetCategory::Gameplay,
            AssetType::Binary => AssetCategory::Data,
            AssetType::Unknown => AssetCategory::Unknown,
        }
    }

    /// List assets in directory
    pub fn list_assets_in_directory(dir: &Path) -> Result<Vec<PathBuf>> {
        if !dir.exists() || !dir.is_dir() {
            return Ok(Vec::new());
        }
        
        let mut assets = Vec::new();
        
        for entry in std::fs::read_dir(dir)
            .with_context(|| format!("Failed to read directory: {}", dir.display()))? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && Self::is_game_asset(&path) {
                assets.push(path);
            }
        }
        
        Ok(assets)
    }

    /// Get asset size in human readable format
    pub fn format_asset_size(bytes: u64) -> String {
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

    /// Calculate asset checksum
    pub fn calculate_asset_checksum(path: &Path) -> Result<u32> {
        let data = std::fs::read(path)
            .with_context(|| format!("Failed to read asset for checksum: {}", path.display()))?;
        
        Ok(Self::calculate_data_checksum(&data))
    }

    /// Calculate data checksum
    pub fn calculate_data_checksum(data: &[u8]) -> u32 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        hasher.finish() as u32
    }

    /// Check if asset is valid for extraction
    pub fn is_asset_extractable(path: &Path) -> bool {
        if let Some(ext) = Self::get_asset_extension(path) {
            matches!(ext.as_str(), "mpq" | "blp" | "mdx" | "wav" | "tga" | "w3m" | "w3x")
        } else {
            false
        }
    }

    /// Get asset priority for processing
    pub fn get_asset_priority(path: &Path) -> AssetPriority {
        if let Some(ext) = Self::get_asset_extension(path) {
            match ext.as_str() {
                "mpq" => AssetPriority::High,      // Archives contain many assets
                "w3m" | "w3x" => AssetPriority::High, // Maps are important
                "blp" | "mdx" => AssetPriority::Medium, // Graphics and models
                "wav" | "tga" => AssetPriority::Low,   // Audio and images
                _ => AssetPriority::Low,
            }
        } else {
            AssetPriority::Low
        }
    }
}

/// Asset types
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AssetType {
    /// Archive file (MPQ)
    Archive,
    /// Image file (BLP, TGA, PCX)
    Image,
    /// 3D model file (MDX)
    Model,
    /// Audio file (WAV)
    Audio,
    /// Map file (W3M, W3X, PUD)
    Map,
    /// Binary data file
    Binary,
    /// Unknown file type
    Unknown,
}

/// Asset categories
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AssetCategory {
    /// Data files
    Data,
    /// Graphics files
    Graphics,
    /// Audio files
    Audio,
    /// Gameplay files
    Gameplay,
    /// Unknown category
    Unknown,
}

/// Asset priority levels
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum AssetPriority {
    /// Low priority
    Low = 0,
    /// Medium priority
    Medium = 1,
    /// High priority
    High = 2,
}

/// Asset metadata
#[derive(Debug, Clone)]
pub struct AssetMetadata {
    /// File path
    pub path: PathBuf,
    /// File size in bytes
    pub size: u64,
    /// Asset type
    pub asset_type: AssetType,
    /// File extension
    pub extension: String,
    /// Creation time
    pub created: Option<std::time::SystemTime>,
    /// Modification time
    pub modified: Option<std::time::SystemTime>,
    /// Access time
    pub accessed: Option<std::time::SystemTime>,
}

impl AssetMetadata {
    /// Create new asset metadata
    pub fn new(path: PathBuf, size: u64, asset_type: AssetType, extension: String) -> Self {
        Self {
            path,
            size,
            asset_type,
            extension,
            created: None,
            modified: None,
            accessed: None,
        }
    }

    /// Get formatted file size
    pub fn formatted_size(&self) -> String {
        AssetUtils::format_asset_size(self.size)
    }

    /// Check if asset is empty
    pub fn is_empty(&self) -> bool {
        self.size == 0
    }

    /// Get asset age in seconds
    pub fn age_seconds(&self) -> Option<u64> {
        if let Some(modified) = self.modified {
            if let Ok(duration) = std::time::SystemTime::now().duration_since(modified) {
                return Some(duration.as_secs());
            }
        }
        None
    }

    /// Get formatted asset age
    pub fn formatted_age(&self) -> String {
        if let Some(age_seconds) = self.age_seconds() {
            if age_seconds < 60 {
                format!("{} seconds ago", age_seconds)
            } else if age_seconds < 3600 {
                format!("{} minutes ago", age_seconds / 60)
            } else if age_seconds < 86400 {
                format!("{} hours ago", age_seconds / 3600)
            } else {
                format!("{} days ago", age_seconds / 86400)
            }
        } else {
            "Unknown".to_string()
        }
    }

    /// Check if asset is compressed
    pub fn is_compressed(&self) -> bool {
        AssetUtils::is_asset_compressed(&self.path)
    }

    /// Check if asset is encrypted
    pub fn is_encrypted(&self) -> bool {
        AssetUtils::is_asset_encrypted(&self.path)
    }

    /// Get asset category
    pub fn category(&self) -> AssetCategory {
        AssetUtils::get_asset_category(&self.path)
    }

    /// Check if asset is extractable
    pub fn is_extractable(&self) -> bool {
        AssetUtils::is_asset_extractable(&self.path)
    }

    /// Get asset priority
    pub fn priority(&self) -> AssetPriority {
        AssetUtils::get_asset_priority(&self.path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_get_asset_extension() {
        let temp_dir = tempdir().unwrap();
        let mpq_file = temp_dir.path().join("test.mpq");
        let txt_file = temp_dir.path().join("test.txt");
        
        assert_eq!(AssetUtils::get_asset_extension(&mpq_file), Some("mpq".to_string()));
        assert_eq!(AssetUtils::get_asset_extension(&txt_file), Some("txt".to_string()));
    }

    #[test]
    fn test_is_game_asset() {
        let temp_dir = tempdir().unwrap();
        let mpq_file = temp_dir.path().join("test.mpq");
        let txt_file = temp_dir.path().join("test.txt");
        
        assert!(AssetUtils::is_game_asset(&mpq_file));
        assert!(!AssetUtils::is_game_asset(&txt_file));
    }

    #[test]
    fn test_get_asset_type() {
        let temp_dir = tempdir().unwrap();
        let mpq_file = temp_dir.path().join("test.mpq");
        let blp_file = temp_dir.path().join("test.blp");
        let mdx_file = temp_dir.path().join("test.mdx");
        
        assert_eq!(AssetUtils::get_asset_type(&mpq_file), AssetType::Archive);
        assert_eq!(AssetUtils::get_asset_type(&blp_file), AssetType::Image);
        assert_eq!(AssetUtils::get_asset_type(&mdx_file), AssetType::Model);
    }

    #[test]
    fn test_generate_asset_output_path() {
        let temp_dir = tempdir().unwrap();
        let input_path = temp_dir.path().join("test.mpq");
        let output_dir = temp_dir.path().join("output");
        
        let output_path = AssetUtils::generate_asset_output_path(&input_path, &output_dir, "extracted", "txt");
        assert_eq!(output_path, output_dir.join("test_extracted.txt"));
    }

    #[test]
    fn test_asset_metadata() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.mpq");
        File::create(&test_file).unwrap().write_all(b"test").unwrap();
        
        let metadata = AssetUtils::get_asset_metadata(&test_file).unwrap();
        assert_eq!(metadata.size, 4);
        assert_eq!(metadata.asset_type, AssetType::Archive);
        assert_eq!(metadata.extension, "mpq");
        assert!(!metadata.is_empty());
        assert!(metadata.is_extractable());
        assert_eq!(metadata.priority(), AssetPriority::High);
    }

    #[test]
    fn test_asset_utils() {
        let temp_dir = tempdir().unwrap();
        let mpq_file = temp_dir.path().join("test.mpq");
        let txt_file = temp_dir.path().join("test.txt");
        
        assert!(AssetUtils::is_asset_compressed(&mpq_file));
        assert!(!AssetUtils::is_asset_compressed(&txt_file));
        
        assert!(AssetUtils::is_asset_encrypted(&mpq_file));
        assert!(!AssetUtils::is_asset_encrypted(&txt_file));
        
        assert_eq!(AssetUtils::get_asset_category(&mpq_file), AssetCategory::Data);
        assert_eq!(AssetUtils::get_asset_category(&txt_file), AssetCategory::Unknown);
    }
}
