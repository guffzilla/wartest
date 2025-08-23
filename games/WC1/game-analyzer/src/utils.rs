use std::path::{Path, PathBuf};
use std::collections::HashMap;
use anyhow::{Result, Context};

/// Analysis utilities for WC1 game analyzer
pub struct AnalysisUtils;

impl AnalysisUtils {
    /// Format file size in human-readable format
    pub fn format_file_size(bytes: u64) -> String {
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

    /// Calculate percentage
    pub fn calculate_percentage(part: u64, total: u64) -> f64 {
        if total == 0 {
            0.0
        } else {
            (part as f64 / total as f64) * 100.0
        }
    }

    /// Get file extension without dot
    pub fn get_file_extension(path: &Path) -> Option<String> {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
    }

    /// Check if file is a specific type
    pub fn is_file_type(path: &Path, file_type: &str) -> bool {
        Self::get_file_extension(path)
            .map(|ext| ext == file_type.to_lowercase())
            .unwrap_or(false)
    }

    /// Group files by extension
    pub fn group_files_by_extension(files: &[PathBuf]) -> HashMap<String, Vec<PathBuf>> {
        let mut groups = HashMap::new();
        
        for file in files {
            if let Some(ext) = Self::get_file_extension(file) {
                groups.entry(ext).or_insert_with(Vec::new).push(file.clone());
            }
        }
        
        groups
    }

    /// Calculate total size of files
    pub fn calculate_total_size(files: &[PathBuf]) -> Result<u64> {
        let mut total = 0u64;
        
        for file in files {
            if file.exists() {
                let metadata = std::fs::metadata(file)
                    .with_context(|| format!("Failed to read metadata for {}", file.display()))?;
                total += metadata.len();
            }
        }
        
        Ok(total)
    }

    /// Find files matching a pattern
    pub fn find_files_matching_pattern(
        directory: &Path,
        pattern: &str,
    ) -> Result<Vec<PathBuf>> {
        let mut matching_files = Vec::new();
        
        if !directory.exists() || !directory.is_dir() {
            return Ok(matching_files);
        }

        for entry in std::fs::read_dir(directory)
            .with_context(|| format!("Failed to read directory {}", directory.display()))? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
                let filename = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("");
                
                if filename.contains(pattern) {
                    matching_files.push(path);
                }
            }
        }
        
        Ok(matching_files)
    }

    /// Create directory structure for output
    pub fn create_output_dirs(base_path: &Path, subdirs: &[&str]) -> Result<()> {
        for subdir in subdirs {
            let dir_path = base_path.join(subdir);
            std::fs::create_dir_all(&dir_path)
                .with_context(|| format!("Failed to create directory {}", dir_path.display()))?;
        }
        Ok(())
    }

    /// Generate unique filename
    pub fn generate_unique_filename(base_path: &Path, filename: &str) -> PathBuf {
        let mut counter = 1;
        let mut path = base_path.join(filename);
        
        while path.exists() {
            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(filename);
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            
            let new_filename = if ext.is_empty() {
                format!("{}_{}", stem, counter)
            } else {
                format!("{}_{}.{}", stem, counter, ext)
            };
            
            path = base_path.join(new_filename);
            counter += 1;
        }
        
        path
    }

    /// Validate file path
    pub fn validate_file_path(path: &Path) -> Result<()> {
        if !path.exists() {
            return Err(anyhow::anyhow!("File does not exist: {}", path.display()));
        }
        
        if !path.is_file() {
            return Err(anyhow::anyhow!("Path is not a file: {}", path.display()));
        }
        
        Ok(())
    }

    /// Get relative path from base
    pub fn get_relative_path(path: &Path, base: &Path) -> Result<PathBuf> {
        path.strip_prefix(base)
            .map(|p| p.to_path_buf())
            .with_context(|| format!("Failed to get relative path from {} to {}", base.display(), path.display()))
    }
}

/// File statistics
#[derive(Debug, Clone)]
pub struct FileStats {
    /// Total file count
    pub total_files: usize,
    /// Total size in bytes
    pub total_size: u64,
    /// File count by extension
    pub files_by_extension: HashMap<String, usize>,
    /// Size by extension
    pub size_by_extension: HashMap<String, u64>,
}

impl FileStats {
    /// Create new file statistics
    pub fn new() -> Self {
        Self {
            total_files: 0,
            total_size: 0,
            files_by_extension: HashMap::new(),
            size_by_extension: HashMap::new(),
        }
    }

    /// Calculate statistics from a list of files
    pub fn from_files(files: &[PathBuf]) -> Result<Self> {
        let mut stats = Self::new();
        
        for file in files {
            if file.exists() {
                let metadata = std::fs::metadata(file)
                    .with_context(|| format!("Failed to read metadata for {}", file.display()))?;
                
                let size = metadata.len();
                stats.total_files += 1;
                stats.total_size += size;
                
                if let Some(ext) = AnalysisUtils::get_file_extension(file) {
                    *stats.files_by_extension.entry(ext.clone()).or_insert(0) += 1;
                    *stats.size_by_extension.entry(ext).or_insert(0) += size;
                }
            }
        }
        
        Ok(stats)
    }

    /// Get formatted total size
    pub fn formatted_total_size(&self) -> String {
        AnalysisUtils::format_file_size(self.total_size)
    }

    /// Get percentage of files with specific extension
    pub fn get_extension_percentage(&self, extension: &str) -> f64 {
        let ext_count = self.files_by_extension.get(extension).copied().unwrap_or(0);
        AnalysisUtils::calculate_percentage(ext_count as u64, self.total_files as u64)
    }
}

impl Default for FileStats {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_format_file_size() {
        assert_eq!(AnalysisUtils::format_file_size(1024), "1.0 KB");
        assert_eq!(AnalysisUtils::format_file_size(1024 * 1024), "1.0 MB");
        assert_eq!(AnalysisUtils::format_file_size(512), "512 B");
    }

    #[test]
    fn test_calculate_percentage() {
        assert_eq!(AnalysisUtils::calculate_percentage(50, 100), 50.0);
        assert_eq!(AnalysisUtils::calculate_percentage(25, 100), 25.0);
        assert_eq!(AnalysisUtils::calculate_percentage(0, 100), 0.0);
    }

    #[test]
    fn test_is_file_type() {
        let path = Path::new("test.txt");
        assert!(AnalysisUtils::is_file_type(path, "txt"));
        assert!(AnalysisUtils::is_file_type(path, "TXT"));
        assert!(!AnalysisUtils::is_file_type(path, "png"));
    }

    #[test]
    fn test_file_stats() {
        let temp_dir = tempdir().unwrap();
        let file1 = temp_dir.path().join("test1.txt");
        let file2 = temp_dir.path().join("test2.txt");
        
        File::create(&file1).unwrap().write_all(b"test").unwrap();
        File::create(&file2).unwrap().write_all(b"test").unwrap();
        
        let files = vec![file1, file2];
        let stats = FileStats::from_files(&files).unwrap();
        
        assert_eq!(stats.total_files, 2);
        assert!(stats.total_size > 0);
        assert_eq!(stats.files_by_extension.get("txt"), Some(&2));
    }
}
