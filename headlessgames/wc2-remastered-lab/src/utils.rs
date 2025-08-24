use anyhow::Result;
use log::{info, warn, error, debug};
use std::collections::HashMap;
use std::path::PathBuf;
use std::fs;
use serde_json;

/// Utility functions for the WC2 Remastered laboratory

/// Create output directory if it doesn't exist
pub fn ensure_output_directory(path: &PathBuf) -> Result<()> {
    if !path.exists() {
        fs::create_dir_all(path)?;
        info!("📁 Created output directory: {:?}", path);
    }
    Ok(())
}

/// Save data to JSON file
pub fn save_json<T: serde::Serialize>(data: &T, file_path: &PathBuf) -> Result<()> {
    let json_string = serde_json::to_string_pretty(data)?;
    fs::write(file_path, json_string)?;
    info!("💾 Saved JSON data to: {:?}", file_path);
    Ok(())
}

/// Load data from JSON file
pub fn load_json<T: for<'de> serde::Deserialize<'de>>(file_path: &PathBuf) -> Result<T> {
    let json_string = fs::read_to_string(file_path)?;
    let data: T = serde_json::from_str(&json_string)?;
    info!("📂 Loaded JSON data from: {:?}", file_path);
    Ok(data)
}

/// Generate timestamp string
pub fn timestamp_string() -> String {
    chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string()
}

/// Generate unique filename
pub fn unique_filename(prefix: &str, extension: &str) -> String {
    format!("{}_{}.{}", prefix, timestamp_string(), extension)
}

/// Format bytes as human readable string
pub fn format_bytes(bytes: u64) -> String {
    const UNITS: [&str; 4] = ["B", "KB", "MB", "GB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    format!("{:.2} {}", size, UNITS[unit_index])
}

/// Format duration as human readable string
pub fn format_duration(duration: chrono::Duration) -> String {
    let total_seconds = duration.num_seconds();
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    
    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, seconds)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
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

/// Calculate moving average
pub fn moving_average(values: &[f64], window_size: usize) -> Vec<f64> {
    if values.len() < window_size {
        return values.to_vec();
    }
    
    let mut result = Vec::new();
    
    for i in 0..=values.len() - window_size {
        let window = &values[i..i + window_size];
        let sum: f64 = window.iter().sum();
        result.push(sum / window_size as f64);
    }
    
    result
}

/// Calculate standard deviation
pub fn standard_deviation(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / values.len() as f64;
    
    variance.sqrt()
}

/// Find peaks in data
pub fn find_peaks(values: &[f64], threshold: f64) -> Vec<usize> {
    let mut peaks = Vec::new();
    
    for i in 1..values.len() - 1 {
        if values[i] > values[i - 1] && values[i] > values[i + 1] && values[i] > threshold {
            peaks.push(i);
        }
    }
    
    peaks
}

/// Calculate correlation coefficient between two datasets
pub fn correlation_coefficient(x: &[f64], y: &[f64]) -> Result<f64> {
    if x.len() != y.len() || x.is_empty() {
        return Err(anyhow::anyhow!("Invalid input for correlation calculation"));
    }
    
    let n = x.len() as f64;
    let sum_x: f64 = x.iter().sum();
    let sum_y: f64 = y.iter().sum();
    let sum_xy: f64 = x.iter().zip(y.iter()).map(|(a, b)| a * b).sum();
    let sum_x2: f64 = x.iter().map(|a| a * a).sum();
    let sum_y2: f64 = y.iter().map(|a| a * a).sum();
    
    let numerator = n * sum_xy - sum_x * sum_y;
    let denominator = ((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y)).sqrt();
    
    if denominator == 0.0 {
        Ok(0.0)
    } else {
        Ok(numerator / denominator)
    }
}

/// Generate summary statistics for a dataset
pub fn generate_statistics(values: &[f64]) -> HashMap<String, f64> {
    let mut stats = HashMap::new();
    
    if values.is_empty() {
        return stats;
    }
    
    let count = values.len() as f64;
    let sum: f64 = values.iter().sum();
    let mean = sum / count;
    
    let variance = values.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / count;
    
    let sorted_values: Vec<f64> = {
        let mut v = values.to_vec();
        v.sort_by(|a, b| a.partial_cmp(b).unwrap());
        v
    };
    
    let median = if count as usize % 2 == 0 {
        (sorted_values[count as usize / 2 - 1] + sorted_values[count as usize / 2]) / 2.0
    } else {
        sorted_values[count as usize / 2]
    };
    
    stats.insert("count".to_string(), count);
    stats.insert("sum".to_string(), sum);
    stats.insert("mean".to_string(), mean);
    stats.insert("median".to_string(), median);
    stats.insert("variance".to_string(), variance);
    stats.insert("std_dev".to_string(), variance.sqrt());
    stats.insert("min".to_string(), sorted_values[0]);
    stats.insert("max".to_string(), sorted_values[sorted_values.len() - 1]);
    
    stats
}

/// Validate file path
pub fn validate_file_path(path: &PathBuf) -> Result<()> {
    if path.exists() {
        if !path.is_file() {
            return Err(anyhow::anyhow!("Path exists but is not a file: {:?}", path));
        }
    } else {
        // Check if parent directory exists and is writable
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err(anyhow::anyhow!("Parent directory does not exist: {:?}", parent));
            }
            if !parent.is_dir() {
                return Err(anyhow::anyhow!("Parent path is not a directory: {:?}", parent));
            }
        }
    }
    Ok(())
}

/// Get file size in bytes
pub fn get_file_size(path: &PathBuf) -> Result<u64> {
    let metadata = fs::metadata(path)?;
    Ok(metadata.len())
}

/// Check if file is empty
pub fn is_file_empty(path: &PathBuf) -> Result<bool> {
    let size = get_file_size(path)?;
    Ok(size == 0)
}

/// Create backup of file
pub fn create_backup(file_path: &PathBuf) -> Result<PathBuf> {
    let backup_path = file_path.with_extension(format!("{}.bak", timestamp_string()));
    fs::copy(file_path, &backup_path)?;
    info!("💾 Created backup: {:?}", backup_path);
    Ok(backup_path)
}

/// Clean up old backup files
pub fn cleanup_old_backups(directory: &PathBuf, max_backups: usize) -> Result<()> {
    let mut backup_files: Vec<_> = fs::read_dir(directory)?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            if let Some(ext) = entry.path().extension() {
                ext.to_string_lossy().starts_with("bak")
            } else {
                false
            }
        })
        .collect();
    
    // Sort by modification time (oldest first)
    backup_files.sort_by(|a, b| {
        a.metadata().unwrap().modified().unwrap()
            .cmp(&b.metadata().unwrap().modified().unwrap())
    });
    
    // Remove old backups if we have too many
    if backup_files.len() > max_backups {
        let to_remove = backup_files.len() - max_backups;
        for backup in backup_files.iter().take(to_remove) {
            fs::remove_file(&backup.path())?;
            info!("🗑️  Removed old backup: {:?}", backup.path());
        }
    }
    
    Ok(())
}
