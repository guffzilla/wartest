use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// Utility functions for WC3 game analysis
pub struct AnalysisUtils;

impl AnalysisUtils {
    /// Format file size in human readable format
    pub fn format_file_size(bytes: u64) -> String {
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

    /// Calculate percentage
    pub fn calculate_percentage(part: f64, total: f64) -> f64 {
        if total == 0.0 {
            0.0
        } else {
            (part / total) * 100.0
        }
    }

    /// Check if file is a game asset
    pub fn is_game_asset(path: &Path) -> bool {
        if let Some(ext) = path.extension() {
            if let Some(ext_str) = ext.to_str() {
                let game_extensions = [
                    "mpq", "blp", "mdx", "wav", "tga", "w3m", "w3x"
                ];
                return game_extensions.contains(&ext_str.to_lowercase().as_str());
            }
        }
        false
    }

    /// Get file statistics
    pub fn get_file_stats(path: &Path) -> Result<FileStats> {
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        
        Ok(FileStats {
            size: metadata.len(),
            created: metadata.created().ok(),
            modified: metadata.modified().ok(),
            accessed: metadata.accessed().ok(),
        })
    }

    /// Calculate checksum for a file
    pub fn calculate_checksum(path: &Path) -> Result<u32> {
        let data = std::fs::read(path)
            .with_context(|| format!("Failed to read file for checksum: {}", path.display()))?;
        
        Ok(Self::calculate_data_checksum(&data))
    }

    /// Calculate checksum for data
    pub fn calculate_data_checksum(data: &[u8]) -> u32 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        hasher.finish() as u32
    }

    /// Validate file path
    pub fn validate_path(path: &Path) -> Result<()> {
        if !path.exists() {
            return Err(anyhow::anyhow!("Path does not exist: {}", path.display()));
        }
        
        if !path.is_file() {
            return Err(anyhow::anyhow!("Path is not a file: {}", path.display()));
        }
        
        Ok(())
    }

    /// Get file extension
    pub fn get_file_extension(path: &Path) -> Option<String> {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
    }

    /// Check if file has specific extension
    pub fn has_extension(path: &Path, extension: &str) -> bool {
        Self::get_file_extension(path)
            .map(|ext| ext == extension.to_lowercase())
            .unwrap_or(false)
    }

    /// List files with specific extension in directory
    pub fn list_files_with_extension(dir: &Path, extension: &str) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        
        if !dir.exists() || !dir.is_dir() {
            return Ok(files);
        }
        
        for entry in std::fs::read_dir(dir)
            .with_context(|| format!("Failed to read directory: {}", dir.display()))? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && Self::has_extension(&path, extension) {
                files.push(path);
            }
        }
        
        Ok(files)
    }

    /// Create output directory if it doesn't exist
    pub fn ensure_output_dir(path: &Path) -> Result<()> {
        if !path.exists() {
            std::fs::create_dir_all(path)
                .with_context(|| format!("Failed to create output directory: {}", path.display()))?;
        }
        Ok(())
    }

    /// Generate output filename
    pub fn generate_output_filename(input_path: &Path, suffix: &str, extension: &str) -> PathBuf {
        let stem = input_path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        
        let mut filename = format!("{}_{}", stem, suffix);
        if !extension.starts_with('.') {
            filename.push('.');
        }
        filename.push_str(extension);
        
        PathBuf::from(filename)
    }

    /// Safe file copy with overwrite protection
    pub fn safe_copy_file(src: &Path, dst: &Path, overwrite: bool) -> Result<()> {
        if dst.exists() && !overwrite {
            return Err(anyhow::anyhow!("Destination file exists and overwrite not allowed: {}", dst.display()));
        }
        
        std::fs::copy(src, dst)
            .with_context(|| format!("Failed to copy file from {} to {}", src.display(), dst.display()))?;
        
        Ok(())
    }

    /// Get file modification time as string
    pub fn get_file_modified_time_string(path: &Path) -> Result<String> {
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        
        if let Ok(modified) = metadata.modified() {
            if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                let timestamp = duration.as_secs();
                return Ok(format!("{}", timestamp));
            }
        }
        
        Ok("Unknown".to_string())
    }

    /// Check if file is older than specified time
    pub fn is_file_older_than(path: &Path, age_seconds: u64) -> Result<bool> {
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        
        if let Ok(modified) = metadata.modified() {
            if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                let file_age = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() - duration.as_secs();
                
                return Ok(file_age > age_seconds);
            }
        }
        
        Ok(false)
    }

    /// Format duration in human readable format
    pub fn format_duration(duration: std::time::Duration) -> String {
        let seconds = duration.as_secs();
        
        if seconds < 60 {
            format!("{} seconds", seconds)
        } else if seconds < 3600 {
            format!("{} minutes", seconds / 60)
        } else if seconds < 86400 {
            format!("{} hours", seconds / 3600)
        } else {
            format!("{} days", seconds / 86400)
        }
    }

    /// Get current timestamp
    pub fn get_current_timestamp() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
}

/// File statistics
#[derive(Debug, Clone)]
pub struct FileStats {
    /// File size in bytes
    pub size: u64,
    /// File creation time
    pub created: Option<std::time::SystemTime>,
    /// File modification time
    pub modified: Option<std::time::SystemTime>,
    /// File access time
    pub accessed: Option<std::time::SystemTime>,
}

impl FileStats {
    /// Create new file stats
    pub fn new(size: u64) -> Self {
        Self {
            size,
            created: None,
            modified: None,
            accessed: None,
        }
    }

    /// Get formatted file size
    pub fn formatted_size(&self) -> String {
        AnalysisUtils::format_file_size(self.size)
    }

    /// Check if file is empty
    pub fn is_empty(&self) -> bool {
        self.size == 0
    }

    /// Get age in seconds
    pub fn age_seconds(&self) -> Option<u64> {
        if let Some(modified) = self.modified {
            if let Ok(duration) = std::time::SystemTime::now().duration_since(modified) {
                return Some(duration.as_secs());
            }
        }
        None
    }

    /// Get formatted age
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
}

/// Progress tracking for long operations
pub struct ProgressTracker {
    /// Total items to process
    total: usize,
    /// Current progress
    current: usize,
    /// Start time
    start_time: std::time::Instant,
}

impl ProgressTracker {
    /// Create new progress tracker
    pub fn new(total: usize) -> Self {
        Self {
            total,
            current: 0,
            start_time: std::time::Instant::now(),
        }
    }

    /// Update progress
    pub fn update(&mut self, increment: usize) {
        self.current += increment;
    }

    /// Get current progress
    pub fn current(&self) -> usize {
        self.current
    }

    /// Get total items
    pub fn total(&self) -> usize {
        self.total
    }

    /// Get progress percentage
    pub fn percentage(&self) -> f64 {
        if self.total == 0 {
            0.0
        } else {
            (self.current as f64 / self.total as f64) * 100.0
        }
    }

    /// Check if complete
    pub fn is_complete(&self) -> bool {
        self.current >= self.total
    }

    /// Get elapsed time
    pub fn elapsed(&self) -> std::time::Duration {
        self.start_time.elapsed()
    }

    /// Get estimated time remaining
    pub fn estimated_remaining(&self) -> Option<std::time::Duration> {
        if self.current == 0 {
            return None;
        }
        
        let elapsed = self.elapsed();
        let rate = self.current as f64 / elapsed.as_secs_f64();
        let remaining = (self.total - self.current) as f64 / rate;
        
        Some(std::time::Duration::from_secs_f64(remaining))
    }

    /// Get progress bar string
    pub fn progress_bar(&self, width: usize) -> String {
        let percentage = self.percentage();
        let filled = (width as f64 * percentage / 100.0) as usize;
        let empty = width.saturating_sub(filled);
        
        let filled_str = "█".repeat(filled);
        let empty_str = "░".repeat(empty);
        
        format!("[{}{}] {:.1}%", filled_str, empty_str, percentage)
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
        assert_eq!(AnalysisUtils::format_file_size(500), "500 B");
    }

    #[test]
    fn test_calculate_percentage() {
        assert_eq!(AnalysisUtils::calculate_percentage(50.0, 100.0), 50.0);
        assert_eq!(AnalysisUtils::calculate_percentage(0.0, 100.0), 0.0);
        assert_eq!(AnalysisUtils::calculate_percentage(100.0, 0.0), 0.0);
    }

    #[test]
    fn test_is_game_asset() {
        let temp_dir = tempdir().unwrap();
        let mpq_file = temp_dir.path().join("test.mpq");
        let txt_file = temp_dir.path().join("test.txt");
        
        assert!(AnalysisUtils::is_game_asset(&mpq_file));
        assert!(!AnalysisUtils::is_game_asset(&txt_file));
    }

    #[test]
    fn test_progress_tracker() {
        let mut tracker = ProgressTracker::new(100);
        assert_eq!(tracker.percentage(), 0.0);
        assert!(!tracker.is_complete());
        
        tracker.update(50);
        assert_eq!(tracker.percentage(), 50.0);
        assert!(!tracker.is_complete());
        
        tracker.update(50);
        assert_eq!(tracker.percentage(), 100.0);
        assert!(tracker.is_complete());
    }

    #[test]
    fn test_file_stats() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        
        File::create(&test_file).unwrap().write_all(b"test").unwrap();
        
        let stats = AnalysisUtils::get_file_stats(&test_file).unwrap();
        assert_eq!(stats.size, 4);
        assert!(!stats.is_empty());
    }

    #[test]
    fn test_format_duration() {
        let duration = std::time::Duration::from_secs(3661); // 1 hour, 1 minute, 1 second
        assert_eq!(AnalysisUtils::format_duration(duration), "1 hours");
    }
}
