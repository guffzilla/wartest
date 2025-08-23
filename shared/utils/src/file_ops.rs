use std::path::{Path, PathBuf};
use std::fs;
use anyhow::{Result, Context};

/// File operations utilities for asset extraction and analysis
pub struct FileOps;

impl FileOps {
    /// Check if a file exists and is readable
    pub fn file_exists(path: &Path) -> bool {
        path.exists() && path.is_file()
    }

    /// Get file size in bytes
    pub fn get_file_size(path: &Path) -> Result<u64> {
        let metadata = fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        Ok(metadata.len())
    }

    /// Create directory if it doesn't exist
    pub fn ensure_dir(path: &Path) -> Result<()> {
        if !path.exists() {
            fs::create_dir_all(path)
                .with_context(|| format!("Failed to create directory {}", path.display()))?;
        }
        Ok(())
    }

    /// Get file extension as lowercase string
    pub fn get_extension(path: &Path) -> Option<String> {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
    }

    /// Check if file has a specific extension
    pub fn has_extension(path: &Path, extension: &str) -> bool {
        Self::get_extension(path)
            .map(|ext| ext == extension.to_lowercase())
            .unwrap_or(false)
    }

    /// List files in directory with specific extension
    pub fn list_files_with_extension(dir: &Path, extension: &str) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        
        if !dir.exists() || !dir.is_dir() {
            return Ok(files);
        }

        for entry in fs::read_dir(dir)
            .with_context(|| format!("Failed to read directory {}", dir.display()))? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && Self::has_extension(&path, extension) {
                files.push(path);
            }
        }

        Ok(files)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;

    #[test]
    fn test_ensure_dir() {
        let temp_dir = tempdir().unwrap();
        let new_dir = temp_dir.path().join("test_dir");
        
        assert!(FileOps::ensure_dir(&new_dir).is_ok());
        assert!(new_dir.exists());
        assert!(new_dir.is_dir());
    }

    #[test]
    fn test_has_extension() {
        let path = Path::new("test.txt");
        assert!(FileOps::has_extension(path, "txt"));
        assert!(FileOps::has_extension(path, "TXT"));
        assert!(!FileOps::has_extension(path, "png"));
    }
}
