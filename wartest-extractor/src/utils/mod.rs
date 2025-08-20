pub mod file_utils;

use anyhow::Result;
use std::path::Path;

/// Utility functions for the wartest project
pub struct Utils;

impl Utils {
    /// Get file size in human readable format
    pub fn format_file_size(bytes: u64) -> String {
        const UNITS: [&str; 4] = ["B", "KB", "MB", "GB"];
        let mut size = bytes as f64;
        let mut unit_index = 0;
        
        while size >= 1024.0 && unit_index < UNITS.len() - 1 {
            size /= 1024.0;
            unit_index += 1;
        }
        
        format!("{:.1} {}", size, UNITS[unit_index])
    }

    /// Check if a file is likely a binary file
    pub fn is_binary_file<P: AsRef<Path>>(path: P) -> Result<bool> {
        use std::fs::File;
        use std::io::Read;
        
        let mut file = File::open(path)?;
        let mut buffer = [0; 1024];
        let bytes_read = file.read(&mut buffer)?;
        
        // Check for null bytes in the first 1KB
        let is_binary = buffer[..bytes_read].contains(&0);
        Ok(is_binary)
    }

    /// Get file extension without the dot
    pub fn get_extension<P: AsRef<Path>>(path: P) -> Option<String> {
        path.as_ref()
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
    }
}
