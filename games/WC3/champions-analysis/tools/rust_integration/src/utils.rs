//! Utilities Module
//! 
//! Common utility functions and helper methods used throughout the system.

use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

use crate::IntegrationError;

/// System information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os_version: String,
    pub architecture: String,
    pub memory_total: u64,
    pub memory_available: u64,
    pub cpu_count: u32,
    pub process_id: u32,
    pub timestamp: DateTime<Utc>,
}

/// Performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub network_bytes_sent: u64,
    pub network_bytes_received: u64,
    pub operations_per_second: f32,
    pub average_response_time: f32,
    pub timestamp: DateTime<Utc>,
}

/// Configuration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub injection_method: String,
    pub hook_types: Vec<String>,
    pub data_extraction_interval_ms: u64,
    pub communication_endpoint: String,
    pub stealth_level: String,
    pub log_level: String,
    pub max_memory_usage_mb: u64,
    pub enable_stealth: bool,
    pub enable_logging: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            injection_method: "CreateRemoteThread".to_string(),
            hook_types: vec!["ApiHook".to_string(), "InlineHook".to_string()],
            data_extraction_interval_ms: 16,
            communication_endpoint: "ws://localhost:8080".to_string(),
            stealth_level: "High".to_string(),
            log_level: "info".to_string(),
            max_memory_usage_mb: 100,
            enable_stealth: true,
            enable_logging: true,
        }
    }
}

/// Utility functions
pub struct Utils;

impl Utils {
    /// Get system information
    pub fn get_system_info() -> anyhow::Result<SystemInfo> {
        let os_info = os_info::get();
        
        Ok(SystemInfo {
            os_version: format!("{} {}", os_info.os_type(), os_info.version()),
            architecture: std::env::consts::ARCH.to_string(),
            memory_total: 0, // Would get from system
            memory_available: 0, // Would get from system
            cpu_count: num_cpus::get() as u32,
            process_id: std::process::id(),
            timestamp: Utc::now(),
        })
    }

    /// Get performance metrics
    pub fn get_performance_metrics() -> anyhow::Result<PerformanceMetrics> {
        Ok(PerformanceMetrics {
            cpu_usage: 0.0, // Would calculate from system
            memory_usage: 0, // Would get from process
            network_bytes_sent: 0,
            network_bytes_received: 0,
            operations_per_second: 0.0,
            average_response_time: 0.0,
            timestamp: Utc::now(),
        })
    }

    /// Load configuration from file
    pub fn load_config(path: &str) -> anyhow::Result<Config> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;
        Ok(config)
    }

    /// Save configuration to file
    pub fn save_config(config: &Config, path: &str) -> anyhow::Result<()> {
        let content = serde_json::to_string_pretty(config)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    /// Generate random string
    pub fn generate_random_string(length: usize) -> String {
        use rand::Rng;
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ\
                                abcdefghijklmnopqrstuvwxyz\
                                0123456789)(*&^%$#@!~";
        let mut rng = rand::thread_rng();

        (0..length)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect()
    }

    /// Generate random bytes
    pub fn generate_random_bytes(length: usize) -> Vec<u8> {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        (0..length).map(|_| rng.gen()).collect()
    }

    /// Calculate hash of data
    pub fn calculate_hash(data: &[u8]) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    /// Format bytes to human readable format
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

    /// Format duration to human readable format
    pub fn format_duration(duration: std::time::Duration) -> String {
        let seconds = duration.as_secs();
        let minutes = seconds / 60;
        let hours = minutes / 60;
        let days = hours / 24;

        if days > 0 {
            format!("{}d {}h {}m {}s", days, hours % 24, minutes % 60, seconds % 60)
        } else if hours > 0 {
            format!("{}h {}m {}s", hours, minutes % 60, seconds % 60)
        } else if minutes > 0 {
            format!("{}m {}s", minutes, seconds % 60)
        } else {
            format!("{}s", seconds)
        }
    }

    /// Check if file exists
    pub fn file_exists(path: &str) -> bool {
        std::path::Path::new(path).exists()
    }

    /// Create directory if it doesn't exist
    pub fn ensure_directory(path: &str) -> anyhow::Result<()> {
        std::fs::create_dir_all(path)?;
        Ok(())
    }

    /// Get file size
    pub fn get_file_size(path: &str) -> anyhow::Result<u64> {
        let metadata = std::fs::metadata(path)?;
        Ok(metadata.len())
    }

    /// Read file as string
    pub fn read_file_as_string(path: &str) -> anyhow::Result<String> {
        std::fs::read_to_string(path).map_err(|e| IntegrationError::FileOperation(format!("Failed to read file {}: {}", path, e)).into())
    }

    /// Write string to file
    pub fn write_string_to_file(path: &str, content: &str) -> anyhow::Result<()> {
        std::fs::write(path, content).map_err(|e| IntegrationError::FileOperation(format!("Failed to write file {}: {}", path, e)).into())
    }

    /// Append string to file
    pub fn append_string_to_file(path: &str, content: &str) -> anyhow::Result<()> {
        use std::fs::OpenOptions;
        use std::io::Write;
        
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| IntegrationError::FileOperation(format!("Failed to open file {}: {}", path, e)))?;
        
        writeln!(file, "{}", content)
            .map_err(|e| IntegrationError::FileOperation(format!("Failed to write to file {}: {}", path, e)))?;
        
        Ok(())
    }

    /// Get current timestamp
    pub fn get_timestamp() -> DateTime<Utc> {
        Utc::now()
    }

    /// Get timestamp as string
    pub fn get_timestamp_string() -> String {
        Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string()
    }

    /// Sleep for specified duration
    pub async fn sleep(duration: std::time::Duration) {
        tokio::time::sleep(duration).await;
    }

    /// Sleep for specified milliseconds
    pub async fn sleep_ms(milliseconds: u64) {
        tokio::time::sleep(std::time::Duration::from_millis(milliseconds)).await;
    }

    /// Retry operation with exponential backoff
    pub async fn retry_with_backoff<F, T, E>(
        mut operation: F,
        max_retries: usize,
        initial_delay: std::time::Duration,
    ) -> Result<T, E>
    where
        F: FnMut() -> Result<T, E>,
        E: std::fmt::Debug,
    {
        let mut delay = initial_delay;
        
        for attempt in 0..=max_retries {
            match operation() {
                Ok(result) => return Ok(result),
                Err(e) => {
                    if attempt == max_retries {
                        return Err(e);
                    }
                    
                    warn!("Operation failed (attempt {}/{}): {:?}, retrying in {:?}", 
                          attempt + 1, max_retries + 1, e, delay);
                    
                    tokio::time::sleep(delay).await;
                    delay *= 2; // Exponential backoff
                }
            }
        }
        
        unreachable!()
    }

    /// Validate IP address
    pub fn is_valid_ip(ip: &str) -> bool {
        ip.parse::<std::net::IpAddr>().is_ok()
    }

    /// Validate port number
    pub fn is_valid_port(port: u16) -> bool {
        port > 0 && port <= 65535
    }

    /// Parse command line arguments
    pub fn parse_args() -> clap::ArgMatches {
        use clap::{App, Arg};
        
        App::new("W3C Rust Integration")
            .version("1.0")
            .author("W3C Analysis Team")
            .about("Warcraft III integration system")
            .arg(
                Arg::new("config")
                    .short('c')
                    .long("config")
                    .value_name("FILE")
                    .help("Configuration file path")
                    .takes_value(true)
            )
            .arg(
                Arg::new("log-level")
                    .short('l')
                    .long("log-level")
                    .value_name("LEVEL")
                    .help("Log level (debug, info, warn, error)")
                    .takes_value(true)
                    .default_value("info")
            )
            .arg(
                Arg::new("injection-method")
                    .short('i')
                    .long("injection-method")
                    .value_name("METHOD")
                    .help("Injection method (CreateRemoteThread, SetWindowsHookEx, ManualMap)")
                    .takes_value(true)
                    .default_value("CreateRemoteThread")
            )
            .get_matches()
    }

    /// Initialize logging
    pub fn init_logging(level: &str) -> anyhow::Result<()> {
        let level = match level.to_lowercase().as_str() {
            "debug" => tracing::Level::DEBUG,
            "info" => tracing::Level::INFO,
            "warn" => tracing::Level::WARN,
            "error" => tracing::Level::ERROR,
            _ => tracing::Level::INFO,
        };

        tracing_subscriber::fmt()
            .with_max_level(level)
            .with_target(false)
            .with_thread_ids(true)
            .with_thread_names(true)
            .with_file(true)
            .with_line_number(true)
            .init();

        Ok(())
    }

    /// Create log file
    pub fn create_log_file(path: &str) -> anyhow::Result<()> {
        use tracing_subscriber::{fmt, EnvFilter};
        use std::fs::File;
        
        let file = File::create(path)?;
        
        fmt::Subscriber::builder()
            .with_env_filter(EnvFilter::from_default_env())
            .with_file(true)
            .with_line_number(true)
            .with_thread_ids(true)
            .with_thread_names(true)
            .with_writer(file)
            .init();
        
        Ok(())
    }

    /// Get memory usage of current process
    pub fn get_process_memory_usage() -> anyhow::Result<u64> {
        // This would use Windows API to get process memory usage
        // For now, return a placeholder
        Ok(0)
    }

    /// Get CPU usage of current process
    pub fn get_process_cpu_usage() -> anyhow::Result<f32> {
        // This would use Windows API to get process CPU usage
        // For now, return a placeholder
        Ok(0.0)
    }

    /// Check if process is running with administrator privileges
    pub fn is_admin() -> bool {
        // This would check for admin privileges
        // For now, return false
        false
    }

    /// Get executable path
    pub fn get_executable_path() -> anyhow::Result<String> {
        std::env::current_exe()
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|e| IntegrationError::SystemError(format!("Failed to get executable path: {}", e)).into())
    }

    /// Get current working directory
    pub fn get_current_dir() -> anyhow::Result<String> {
        std::env::current_dir()
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|e| IntegrationError::SystemError(format!("Failed to get current directory: {}", e)).into())
    }

    /// Set current working directory
    pub fn set_current_dir(path: &str) -> anyhow::Result<()> {
        std::env::set_current_dir(path)
            .map_err(|e| IntegrationError::SystemError(format!("Failed to set current directory: {}", e)).into())
    }

    /// Get environment variable
    pub fn get_env_var(key: &str) -> Option<String> {
        std::env::var(key).ok()
    }

    /// Set environment variable
    pub fn set_env_var(key: &str, value: &str) -> anyhow::Result<()> {
        std::env::set_var(key, value);
        Ok(())
    }

    /// Remove environment variable
    pub fn remove_env_var(key: &str) {
        std::env::remove_var(key);
    }
}

/// Error types for utilities
#[derive(Debug, thiserror::Error)]
pub enum UtilsError {
    #[error("File operation failed: {0}")]
    FileOperation(String),
    #[error("System error: {0}")]
    SystemError(String),
    #[error("Configuration error: {0}")]
    ConfigError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_random_string() {
        let random = Utils::generate_random_string(10);
        assert_eq!(random.len(), 10);
    }

    #[test]
    fn test_generate_random_bytes() {
        let random = Utils::generate_random_bytes(10);
        assert_eq!(random.len(), 10);
    }

    #[test]
    fn test_calculate_hash() {
        let data = b"test data";
        let hash = Utils::calculate_hash(data);
        assert!(!hash.is_empty());
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(Utils::format_bytes(1024), "1.00 KB");
        assert_eq!(Utils::format_bytes(1048576), "1.00 MB");
    }

    #[test]
    fn test_format_duration() {
        let duration = std::time::Duration::from_secs(3661);
        assert_eq!(Utils::format_duration(duration), "1h 1m 1s");
    }

    #[test]
    fn test_is_valid_ip() {
        assert!(Utils::is_valid_ip("127.0.0.1"));
        assert!(Utils::is_valid_ip("::1"));
        assert!(!Utils::is_valid_ip("invalid"));
    }

    #[test]
    fn test_is_valid_port() {
        assert!(Utils::is_valid_port(8080));
        assert!(!Utils::is_valid_port(0));
        assert!(!Utils::is_valid_port(70000));
    }

    #[tokio::test]
    async fn test_retry_with_backoff() {
        let mut attempts = 0;
        let result = Utils::retry_with_backoff(
            || {
                attempts += 1;
                if attempts < 3 {
                    Err("Temporary error")
                } else {
                    Ok("Success")
                }
            },
            5,
            std::time::Duration::from_millis(10),
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(attempts, 3);
    }
}
