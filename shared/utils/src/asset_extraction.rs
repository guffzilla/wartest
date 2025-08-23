use std::path::{Path, PathBuf};
use std::collections::HashMap;
use anyhow::{Result, Context};
use crate::file_ops::FileOps;

/// Asset extraction configuration
#[derive(Debug, Clone)]
pub struct ExtractionConfig {
    /// Output directory for extracted assets
    pub output_dir: PathBuf,
    /// Whether to overwrite existing files
    pub overwrite: bool,
    /// File format to extract (e.g., "png", "wav")
    pub format: Option<String>,
    /// Maximum file size to extract (in bytes)
    pub max_size: Option<u64>,
}

impl Default for ExtractionConfig {
    fn default() -> Self {
        Self {
            output_dir: PathBuf::from("extracted_assets"),
            overwrite: false,
            format: None,
            max_size: None,
        }
    }
}

/// Asset extraction result
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

    /// Check if extraction was successful
    pub fn is_success(&self) -> bool {
        self.errors.is_empty()
    }
}

/// Asset extractor trait for different game formats
pub trait AssetExtractor {
    /// Extract assets from a source file
    fn extract_assets(&self, source: &Path, config: &ExtractionConfig) -> Result<ExtractionResult>;
    
    /// Get supported file extensions
    fn supported_extensions(&self) -> Vec<&'static str>;
    
    /// Check if file is supported
    fn supports_file(&self, path: &Path) -> bool {
        let ext = FileOps::get_extension(path);
        ext.map(|e| self.supported_extensions().contains(&e.as_str()))
            .unwrap_or(false)
    }
}

/// Generic asset extraction manager
pub struct AssetExtractionManager {
    extractors: HashMap<String, Box<dyn AssetExtractor>>,
}

impl AssetExtractionManager {
    /// Create a new asset extraction manager
    pub fn new() -> Self {
        Self {
            extractors: HashMap::new(),
        }
    }

    /// Register an asset extractor
    pub fn register_extractor(&mut self, name: String, extractor: Box<dyn AssetExtractor>) {
        self.extractors.insert(name, extractor);
    }

    /// Extract assets from a file using the appropriate extractor
    pub fn extract_assets(&self, source: &Path, config: &ExtractionConfig) -> Result<ExtractionResult> {
        // Find appropriate extractor
        let extractor = self.find_extractor(source)
            .with_context(|| format!("No extractor found for file: {}", source.display()))?;
        
        // Extract assets
        extractor.extract_assets(source, config)
    }

    /// Find the appropriate extractor for a file
    fn find_extractor(&self, path: &Path) -> Option<&dyn AssetExtractor> {
        for extractor in self.extractors.values() {
            if extractor.supports_file(path) {
                return Some(extractor.as_ref());
            }
        }
        None
    }

    /// Get list of registered extractors
    pub fn get_extractors(&self) -> Vec<&str> {
        self.extractors.keys().map(|s| s.as_str()).collect()
    }
}

impl Default for AssetExtractionManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Utility functions for asset extraction
pub mod utils {
    use super::*;
    use std::fs;

    /// Create output directory structure
    pub fn create_output_dirs(config: &ExtractionConfig) -> Result<()> {
        FileOps::ensure_dir(&config.output_dir)
    }

    /// Generate output path for extracted asset
    pub fn generate_output_path(
        source: &Path,
        output_dir: &Path,
        subdir: Option<&str>,
    ) -> PathBuf {
        let filename = source.file_name()
            .unwrap_or_else(|| std::ffi::OsStr::new("unknown"));
        
        let mut output_path = output_dir.to_path_buf();
        
        if let Some(subdir) = subdir {
            output_path.push(subdir);
        }
        
        output_path.push(filename);
        output_path
    }

    /// Check if file should be extracted based on config
    pub fn should_extract_file(file_size: u64, config: &ExtractionConfig) -> bool {
        if let Some(max_size) = config.max_size {
            if file_size > max_size {
                return false;
            }
        }
        true
    }

    /// Copy file to output directory
    pub fn copy_file_to_output(
        source: &Path,
        output_path: &Path,
        config: &ExtractionConfig,
    ) -> Result<u64> {
        // Create output directory if it doesn't exist
        if let Some(parent) = output_path.parent() {
            FileOps::ensure_dir(parent)?;
        }

        // Check if file already exists
        if output_path.exists() && !config.overwrite {
            return Err(anyhow::anyhow!("File already exists: {}", output_path.display()));
        }

        // Copy file
        fs::copy(source, output_path)
            .with_context(|| format!("Failed to copy {} to {}", source.display(), output_path.display()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_extraction_config_default() {
        let config = ExtractionConfig::default();
        assert_eq!(config.output_dir, PathBuf::from("extracted_assets"));
        assert!(!config.overwrite);
        assert!(config.format.is_none());
        assert!(config.max_size.is_none());
    }

    #[test]
    fn test_extraction_result() {
        let mut result = ExtractionResult::new();
        assert_eq!(result.files_extracted, 0);
        assert_eq!(result.total_size, 0);
        assert!(result.errors.is_empty());

        result.add_file(PathBuf::from("test.png"), 1024);
        assert_eq!(result.files_extracted, 1);
        assert_eq!(result.total_size, 1024);
        assert!(result.is_success());
    }

    #[test]
    fn test_asset_extraction_manager() {
        let manager = AssetExtractionManager::new();
        assert_eq!(manager.get_extractors().len(), 0);
    }
}
