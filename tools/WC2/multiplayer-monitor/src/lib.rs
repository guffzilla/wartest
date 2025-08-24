//! Warcraft II Multiplayer Game Monitoring System
//! 
//! This library provides functionality for monitoring Warcraft II multiplayer games,
//! tracking game results, and analyzing multiplayer gameplay data.

pub mod multiplayer_monitor;
pub mod game_result_monitor;

pub use multiplayer_monitor::MultiplayerMonitor;
pub use game_result_monitor::GameResultMonitor;

/// Result type for the WC2 multiplayer monitor
pub type Result<T> = anyhow::Result<T>;

/// Error type for the WC2 multiplayer monitor
#[derive(thiserror::Error, Debug)]
pub enum MonitorError {
    #[error("Process monitoring error: {0}")]
    ProcessError(String),
    
    #[error("Game detection error: {0}")]
    GameDetectionError(String),
    
    #[error("Data collection error: {0}")]
    DataCollectionError(String),
    
    #[error("Storage error: {0}")]
    StorageError(String),
}

/// Configuration for the multiplayer monitor
#[derive(Debug, Clone)]
pub struct MonitorConfig {
    /// Path to the Warcraft II executable
    pub game_path: Option<String>,
    
    /// Output file for results
    pub output_file: Option<String>,
    
    /// Monitoring interval in milliseconds
    pub interval_ms: u64,
    
    /// Whether to enable detailed logging
    pub verbose: bool,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            game_path: None,
            output_file: None,
            interval_ms: 1000,
            verbose: false,
        }
    }
}
