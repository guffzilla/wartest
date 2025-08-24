use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// Extraction utilities for WC2 asset extraction
pub struct ExtractionUtils;

impl ExtractionUtils {
    /// Validate source file for extraction
    pub fn validate_source_file(path: &Path) -> Result<()> {
        if !path.exists() {
            return Err(anyhow::anyhow!("Source file does not exist: {}", path.display()));
        }
        
        if !path.is_file() {
            return Err(anyhow::anyhow!("Source path is not a file: {}", path.display()));
        }
        
        // Check file size
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        
        if metadata.len() == 0 {
            return Err(anyhow::anyhow!("Source file is empty: {}", path.display()));
        }
        
        Ok(())
    }

    /// Create output directory structure
    pub fn create_output_dirs(base_path: &Path, subdirs: &[&str]) -> Result<()> {
        for subdir in subdirs {
            let dir_path = base_path.join(subdir);
            std::fs::create_dir_all(&dir_path)
                .with_context(|| format!("Failed to create directory {}", dir_path.display()))?;
        }
        Ok(())
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

    /// Check if file should be extracted based on size
    pub fn should_extract_file(file_size: u64, max_size: Option<u64>) -> bool {
        if let Some(max) = max_size {
            if file_size > max {
                return false;
            }
        }
        true
    }

    /// Copy file to output directory
    pub fn copy_file_to_output(
        source: &Path,
        output_path: &Path,
        overwrite: bool,
    ) -> Result<u64> {
        // Create output directory if it doesn't exist
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create directory {}", parent.display()))?;
        }

        // Check if file already exists
        if output_path.exists() && !overwrite {
            return Err(anyhow::anyhow!("Output file already exists: {}", output_path.display()));
        }

        // Copy file
        std::fs::copy(source, output_path)
            .with_context(|| format!("Failed to copy {} to {}", source.display(), output_path.display()))
    }

    /// Get file size in human-readable format
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

    /// Check if file has a specific extension
    pub fn has_extension(path: &Path, extension: &str) -> bool {
        Self::get_file_extension(path)
            .map(|ext| ext == extension.to_lowercase())
            .unwrap_or(false)
    }

    /// Find files with specific extension in directory
    pub fn find_files_with_extension(
        directory: &Path,
        extension: &str,
    ) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        
        if !directory.exists() || !directory.is_dir() {
            return Ok(files);
        }

        for entry in std::fs::read_dir(directory)
            .with_context(|| format!("Failed to read directory {}", directory.display()))? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && Self::has_extension(&path, extension) {
                files.push(path);
            }
        }
        
        Ok(files)
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

    /// Get relative path from base
    pub fn get_relative_path(path: &Path, base: &Path) -> Result<PathBuf> {
        path.strip_prefix(base)
            .map(|p| p.to_path_buf())
            .with_context(|| format!("Failed to get relative path from {} to {}", base.display(), path.display()))
    }

    /// Check if path is within base directory
    pub fn is_within_directory(path: &Path, base: &Path) -> bool {
        path.starts_with(base)
    }

    /// Sanitize filename for filesystem
    pub fn sanitize_filename(filename: &str) -> String {
        let mut sanitized = filename.to_string();
        
        // Replace invalid characters
        let invalid_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/'];
        for &ch in &invalid_chars {
            sanitized = sanitized.replace(ch, "_");
        }
        
        // Remove or replace other problematic characters
        sanitized = sanitized.replace('\0', "");
        
        // Limit length
        if sanitized.len() > 255 {
            if let Some(ext) = sanitized.rfind('.') {
                let name_part = &sanitized[..ext];
                let ext_part = &sanitized[ext..];
                let max_name_len = 255 - ext_part.len();
                sanitized = format!("{}{}", &name_part[..max_name_len], ext_part);
            } else {
                sanitized.truncate(255);
            }
        }
        
        sanitized
    }
}

/// Progress tracking for extraction operations
pub struct ProgressTracker {
    /// Total items to process
    total_items: usize,
    /// Current item being processed
    current_item: usize,
    /// Start time
    start_time: std::time::Instant,
}

impl ProgressTracker {
    /// Create a new progress tracker
    pub fn new(total_items: usize) -> Self {
        Self {
            total_items,
            current_item: 0,
            start_time: std::time::Instant::now(),
        }
    }

    /// Update progress
    pub fn update(&mut self, items_processed: usize) {
        self.current_item = items_processed;
    }

    /// Get current progress percentage
    pub fn percentage(&self) -> f64 {
        if self.total_items == 0 {
            0.0
        } else {
            (self.current_item as f64 / self.total_items as f64) * 100.0
        }
    }

    /// Get elapsed time
    pub fn elapsed(&self) -> std::time::Duration {
        self.start_time.elapsed()
    }

    /// Get estimated time remaining
    pub fn estimated_remaining(&self) -> Option<std::time::Duration> {
        if self.current_item == 0 {
            return None;
        }
        
        let elapsed = self.elapsed();
        let items_per_second = self.current_item as f64 / elapsed.as_secs_f64();
        let remaining_items = self.total_items - self.current_item;
        
        if items_per_second > 0.0 {
            Some(std::time::Duration::from_secs_f64(remaining_items as f64 / items_per_second))
        } else {
            None
        }
    }

    /// Get progress string
    pub fn progress_string(&self) -> String {
        let percentage = self.percentage();
        let elapsed = self.elapsed();
        
        if let Some(remaining) = self.estimated_remaining() {
            format!(
                "Progress: {:.1}% ({}/{}) - Elapsed: {:?} - Remaining: {:?}",
                percentage,
                self.current_item,
                self.total_items,
                elapsed,
                remaining
            )
        } else {
            format!(
                "Progress: {:.1}% ({}/{}) - Elapsed: {:?}",
                percentage,
                self.current_item,
                self.total_items,
                elapsed
            )
        }
    }
}

/// File operation utilities
pub struct FileOps;

impl FileOps {
    /// Check if file exists and is readable
    pub fn file_exists(path: &Path) -> bool {
        path.exists() && path.is_file()
    }

    /// Get file size in bytes
    pub fn get_file_size(path: &Path) -> Result<u64> {
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        Ok(metadata.len())
    }

    /// Create directory if it doesn't exist
    pub fn ensure_dir(path: &Path) -> Result<()> {
        if !path.exists() {
            std::fs::create_dir_all(path)
                .with_context(|| format!("Failed to create directory {}", path.display()))?;
        }
        Ok(())
    }

    /// List files in directory
    pub fn list_files(dir: &Path) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        
        if !dir.exists() || !dir.is_dir() {
            return Ok(files);
        }

        for entry in std::fs::read_dir(dir)
            .with_context(|| format!("Failed to read directory {}", dir.display()))? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
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
    use std::io::Write;

    #[test]
    fn test_format_file_size() {
        assert_eq!(ExtractionUtils::format_file_size(1024), "1.0 KB");
        assert_eq!(ExtractionUtils::format_file_size(1024 * 1024), "1.0 MB");
        assert_eq!(ExtractionUtils::format_file_size(512), "512 B");
    }

    #[test]
    fn test_calculate_percentage() {
        assert_eq!(ExtractionUtils::calculate_percentage(50, 100), 50.0);
        assert_eq!(ExtractionUtils::calculate_percentage(25, 100), 25.0);
        assert_eq!(ExtractionUtils::calculate_percentage(0, 100), 0.0);
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(ExtractionUtils::sanitize_filename("test<file>.txt"), "test_file_.txt");
        assert_eq!(ExtractionUtils::sanitize_filename("file:with:colons"), "file_with_colons");
    }

    #[test]
    fn test_progress_tracker() {
        let mut tracker = ProgressTracker::new(100);
        assert_eq!(tracker.percentage(), 0.0);
        
        tracker.update(50);
        assert_eq!(tracker.percentage(), 50.0);
        
        tracker.update(100);
        assert_eq!(tracker.percentage(), 100.0);
    }

    #[test]
    fn test_file_ops() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        
        File::create(&test_file).unwrap().write_all(b"test").unwrap();
        
        assert!(FileOps::file_exists(&test_file));
        assert_eq!(FileOps::get_file_size(&test_file).unwrap(), 4);
    }
}
