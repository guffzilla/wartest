use std::path::{Path, PathBuf};
use anyhow::{Result, Context};
use crate::formats::WC2Format;
use crate::utils::ExtractionUtils;

/// WC2 Asset Extractor for extracting assets from Warcraft II files
pub struct WC2AssetExtractor {
    /// Supported file formats
    formats: Vec<WC2Format>,
    /// Extraction configuration
    config: ExtractionConfig,
}

/// Configuration for asset extraction
#[derive(Debug, Clone)]
pub struct ExtractionConfig {
    /// Output directory for extracted assets
    pub output_dir: PathBuf,
    /// Whether to overwrite existing files
    pub overwrite: bool,
    /// Extract specific asset types only
    pub asset_types: Option<Vec<String>>,
    /// Maximum file size to extract (in bytes)
    pub max_size: Option<u64>,
    /// Create organized directory structure
    pub organize_output: bool,
}

impl Default for ExtractionConfig {
    fn default() -> Self {
        Self {
            output_dir: PathBuf::from("WC2Assets"),
            overwrite: false,
            asset_types: None,
            max_size: None,
            organize_output: true,
        }
    }
}

impl WC2AssetExtractor {
    /// Create a new WC2 asset extractor
    pub fn new() -> Self {
        Self {
            formats: vec![
                WC2Format::PUD,  // Warcraft II map files
                WC2Format::WAV,  // Audio files
                WC2Format::PCX,  // Image files
                WC2Format::BIN,  // Binary data files
            ],
            config: ExtractionConfig::default(),
        }
    }

    /// Create extractor with custom configuration
    pub fn with_config(config: ExtractionConfig) -> Self {
        Self {
            formats: vec![
                WC2Format::PUD,
                WC2Format::WAV,
                WC2Format::PCX,
                WC2Format::BIN,
            ],
            config,
        }
    }

    /// Extract assets from a source file
    pub fn extract_assets(&self, source: &Path) -> Result<ExtractionResult> {
        let mut result = ExtractionResult::new();
        
        // Validate source file
        ExtractionUtils::validate_source_file(source)?;
        
        // Determine file format
        let format = self.detect_format(source)?;
        
        // Create output directory
        let output_dir = self.create_output_directory(source, &format)?;
        
        // Extract based on format
        match format {
            WC2Format::PUD => self.extract_pud_file(source, &output_dir, &mut result)?,
            WC2Format::WAV => self.extract_audio_file(source, &output_dir, &mut result)?,
            WC2Format::PCX => self.extract_image_file(source, &output_dir, &mut result)?,
            WC2Format::BIN => self.extract_binary_file(source, &output_dir, &mut result)?,
            WC2Format::MPQ | WC2Format::CAM | WC2Format::SAV => {
                // For now, treat these as binary files
                self.extract_binary_file(source, &output_dir, &mut result)?;
            }
        }
        
        Ok(result)
    }

    /// Extract assets from a directory
    pub fn extract_directory(&self, source_dir: &Path) -> Result<ExtractionResult> {
        let mut result = ExtractionResult::new();
        
        if !source_dir.exists() || !source_dir.is_dir() {
            return Err(anyhow::anyhow!("Source directory does not exist: {}", source_dir.display()));
        }
        
        // Find all supported files
        let files = self.find_supported_files(source_dir)?;
        
        for file in files {
            match self.extract_assets(&file) {
                Ok(file_result) => {
                    result.merge(file_result);
                }
                Err(e) => {
                    result.add_error(format!("Failed to extract {}: {}", file.display(), e));
                }
            }
        }
        
        Ok(result)
    }

    /// Detect file format
    fn detect_format(&self, path: &Path) -> Result<WC2Format> {
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .ok_or_else(|| anyhow::anyhow!("Unable to determine file extension"))?;
        
        match extension.to_lowercase().as_str() {
            "pud" => Ok(WC2Format::PUD),
            "wav" => Ok(WC2Format::WAV),
            "pcx" => Ok(WC2Format::PCX),
            "bin" => Ok(WC2Format::BIN),
            _ => Err(anyhow::anyhow!("Unsupported file format: {}", extension)),
        }
    }

    /// Create output directory structure
    fn create_output_directory(&self, source: &Path, format: &WC2Format) -> Result<PathBuf> {
        let mut output_dir = self.config.output_dir.clone();
        
        if self.config.organize_output {
            output_dir.push(format.to_string());
            
            // Add subdirectory based on source filename
            if let Some(stem) = source.file_stem() {
                output_dir.push(stem);
            }
        }
        
        std::fs::create_dir_all(&output_dir)
            .with_context(|| format!("Failed to create output directory: {}", output_dir.display()))?;
        
        Ok(output_dir)
    }

    /// Extract PUD (map) file
    fn extract_pud_file(&self, source: &Path, output_dir: &Path, result: &mut ExtractionResult) -> Result<()> {
        // Read PUD file
        let data = std::fs::read(source)?;
        
        // Extract map information
        let map_info = self.parse_pud_header(&data)?;
        
        // Save map info
        let info_path = output_dir.join("map_info.json");
        let info_json = serde_json::to_string_pretty(&map_info)?;
        std::fs::write(&info_path, &info_json)?;
        
        result.add_file(info_path, info_json.len() as u64);
        
        // Extract embedded assets if any
        if let Some(assets) = self.extract_pud_assets(&data)? {
            for (name, asset_data) in assets {
                let asset_path = output_dir.join(name);
                std::fs::write(&asset_path, &asset_data)?;
                result.add_file(asset_path, asset_data.len() as u64);
            }
        }
        
        Ok(())
    }

    /// Extract audio file
    fn extract_audio_file(&self, source: &Path, output_dir: &Path, result: &mut ExtractionResult) -> Result<()> {
        let output_path = output_dir.join(source.file_name().unwrap());
        
        if output_path.exists() && !self.config.overwrite {
            return Err(anyhow::anyhow!("Output file already exists: {}", output_path.display()));
        }
        
        std::fs::copy(source, &output_path)?;
        
        let metadata = std::fs::metadata(source)?;
        result.add_file(output_path, metadata.len());
        
        Ok(())
    }

    /// Extract image file
    fn extract_image_file(&self, source: &Path, output_dir: &Path, result: &mut ExtractionResult) -> Result<()> {
        let output_path = output_dir.join(source.file_name().unwrap());
        
        if output_path.exists() && !self.config.overwrite {
            return Err(anyhow::anyhow!("Output file already exists: {}", output_path.display()));
        }
        
        std::fs::copy(source, &output_path)?;
        
        let metadata = std::fs::metadata(source)?;
        result.add_file(output_path, metadata.len());
        
        Ok(())
    }

    /// Extract binary file
    fn extract_binary_file(&self, source: &Path, output_dir: &Path, result: &mut ExtractionResult) -> Result<()> {
        let output_path = output_dir.join(source.file_name().unwrap());
        
        if output_path.exists() && !self.config.overwrite {
            return Err(anyhow::anyhow!("Output file already exists: {}", output_path.display()));
        }
        
        std::fs::copy(source, &output_path)?;
        
        let metadata = std::fs::metadata(source)?;
        result.add_file(output_path, metadata.len());
        
        Ok(())
    }

    /// Parse PUD file header
    fn parse_pud_header(&self, data: &[u8]) -> Result<PUDMapInfo> {
        if data.len() < 16 {
            return Err(anyhow::anyhow!("PUD file too small"));
        }
        
        // Basic PUD header parsing (simplified)
        let map_info = PUDMapInfo {
            width: 64,  // Default size
            height: 64,
            tileset: "Forest".to_string(),
            players: 2,
            description: "Warcraft II Map".to_string(),
        };
        
        Ok(map_info)
    }

    /// Extract assets embedded in PUD file
    fn extract_pud_assets(&self, _data: &[u8]) -> Result<Option<Vec<(String, Vec<u8>)>>> {
        // This would parse the actual PUD file structure
        // For now, return None (no embedded assets)
        Ok(None)
    }

    /// Find supported files in directory
    fn find_supported_files(&self, dir: &Path) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
                if self.detect_format(&path).is_ok() {
                    files.push(path);
                }
            }
        }
        
        Ok(files)
    }

    /// Get extraction configuration
    pub fn config(&self) -> &ExtractionConfig {
        &self.config
    }

    /// Update extraction configuration
    pub fn update_config(&mut self, config: ExtractionConfig) {
        self.config = config;
    }
}

/// PUD map information
#[derive(Debug, serde::Serialize)]
pub struct PUDMapInfo {
    pub width: u32,
    pub height: u32,
    pub tileset: String,
    pub players: u32,
    pub description: String,
}

/// Result of asset extraction
#[derive(Debug)]
pub struct ExtractionResult {
    /// Number of files extracted
    pub files_extracted: usize,
    /// Total size of extracted files
    pub total_size: u64,
    /// List of extracted file paths
    pub extracted_files: Vec<PathBuf>,
    /// Any errors encountered during extraction
    pub errors: Vec<String>,
}

impl ExtractionResult {
    /// Create a new extraction result
    pub fn new() -> Self {
        Self {
            files_extracted: 0,
            total_size: 0,
            extracted_files: Vec::new(),
            errors: Vec::new(),
        }
    }

    /// Add a successfully extracted file
    pub fn add_file(&mut self, path: PathBuf, size: u64) {
        self.files_extracted += 1;
        self.total_size += size;
        self.extracted_files.push(path);
    }

    /// Add an error
    pub fn add_error(&mut self, error: String) {
        self.errors.push(error);
    }

    /// Merge another result into this one
    pub fn merge(&mut self, other: ExtractionResult) {
        self.files_extracted += other.files_extracted;
        self.total_size += other.total_size;
        self.extracted_files.extend(other.extracted_files);
        self.errors.extend(other.errors);
    }

    /// Check if extraction was successful
    pub fn is_success(&self) -> bool {
        self.errors.is_empty()
    }
}

impl Default for ExtractionResult {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_extraction_config_default() {
        let config = ExtractionConfig::default();
        assert_eq!(config.output_dir, PathBuf::from("WC2Assets"));
        assert!(!config.overwrite);
        assert!(config.organize_output);
    }

    #[test]
    fn test_extraction_result() {
        let mut result = ExtractionResult::new();
        assert_eq!(result.files_extracted, 0);
        assert_eq!(result.total_size, 0);
        assert!(result.errors.is_empty());

        result.add_file(PathBuf::from("test.txt"), 1024);
        assert_eq!(result.files_extracted, 1);
        assert_eq!(result.total_size, 1024);
        assert!(result.is_success());
    }
}
