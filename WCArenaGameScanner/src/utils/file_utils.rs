use anyhow::Result;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// File utility functions
pub struct FileUtils;

impl FileUtils {
    /// Find all files with a specific extension in a directory
    pub fn find_files_by_extension<P: AsRef<Path>>(
        directory: P,
        extension: &str,
    ) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        
        for entry in WalkDir::new(directory)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file()) {
            
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext.to_string_lossy().to_lowercase() == extension.to_lowercase() {
                    files.push(path.to_path_buf());
                }
            }
        }
        
        Ok(files)
    }

    /// Get file size
    pub fn get_file_size<P: AsRef<Path>>(path: P) -> Result<u64> {
        let metadata = std::fs::metadata(path)?;
        Ok(metadata.len())
    }

    /// Create directory if it doesn't exist
    pub fn ensure_directory<P: AsRef<Path>>(path: P) -> Result<()> {
        let path = path.as_ref();
        if !path.exists() {
            std::fs::create_dir_all(path)?;
        }
        Ok(())
    }

    /// Copy file with progress callback
    pub fn copy_file_with_progress<P: AsRef<Path>, Q: AsRef<Path>, F>(
        from: P,
        to: Q,
        progress_callback: F,
    ) -> Result<()>
    where
        F: Fn(u64, u64),
    {
        use std::fs::File;
        use std::io::{Read, Write};
        
        let from = from.as_ref();
        let to = to.as_ref();
        
        let mut source = File::open(from)?;
        let mut dest = File::create(to)?;
        
        let file_size = source.metadata()?.len();
        let mut buffer = [0; 8192];
        let mut copied = 0;
        
        loop {
            let bytes_read = source.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            
            dest.write_all(&buffer[..bytes_read])?;
            copied += bytes_read as u64;
            progress_callback(copied, file_size);
        }
        
        Ok(())
    }

    /// Get relative path from base directory
    pub fn get_relative_path<P: AsRef<Path>, Q: AsRef<Path>>(
        base: P,
        path: Q,
    ) -> Result<PathBuf> {
        let base = base.as_ref().canonicalize()?;
        let path = path.as_ref().canonicalize()?;
        
        path.strip_prefix(base)
            .map(|p| p.to_path_buf())
            .map_err(|e| anyhow::anyhow!("Failed to get relative path: {}", e))
    }
}
