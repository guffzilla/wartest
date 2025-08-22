//! Utility functions for the WC1 asset extractor

use std::path::Path;
use walkdir::WalkDir;

/// Get all files in a directory recursively
pub fn get_all_files(dir_path: &Path) -> Vec<std::path::PathBuf> {
    WalkDir::new(dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.path().to_path_buf())
        .collect()
}

/// Get file size in human-readable format
pub fn format_file_size(size: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    
    match size {
        0..KB => format!("{} B", size),
        KB..MB => format!("{:.1} KB", size as f64 / KB as f64),
        MB..GB => format!("{:.1} MB", size as f64 / MB as f64),
        _ => format!("{:.1} GB", size as f64 / GB as f64),
    }
}

/// Calculate hash of a file
pub fn calculate_file_hash(file_path: &Path) -> Result<String, std::io::Error> {
    use std::fs::File;
    use std::io::Read;
    use sha2::{Sha256, Digest};
    
    let mut file = File::open(file_path)?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;
    
    let mut hasher = Sha256::new();
    hasher.update(&buffer);
    let result = hasher.finalize();
    
    Ok(format!("{:x}", result))
}

/// Create output directory if it doesn't exist
pub fn ensure_output_dir(output_path: &Path) -> Result<(), std::io::Error> {
    if !output_path.exists() {
        std::fs::create_dir_all(output_path)?;
    }
    Ok(())
}
