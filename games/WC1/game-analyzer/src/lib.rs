//! Warcraft I Game Analysis System
//! 
//! This library provides functionality for analyzing Warcraft I game files and gameplay data.

pub mod analyzer;
pub mod game_data;
pub mod utils;

pub use analyzer::WC1GameAnalyzer;

/// Result type for the WC1 game analyzer
pub type Result<T> = anyhow::Result<T>;

/// Error type for the WC1 game analyzer
#[derive(thiserror::Error, Debug)]
pub enum AnalyzerError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("Invalid file format: {0}")]
    InvalidFormat(String),
    
    #[error("Analysis failed: {0}")]
    AnalysisFailed(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Configuration for the game analyzer
#[derive(Debug, Clone)]
pub struct AnalyzerConfig {
    /// Input directory containing game files
    pub input_dir: String,
    
    /// Output directory for analysis results
    pub output_dir: String,
    
    /// Whether to analyze game mechanics
    pub analyze_mechanics: bool,
    
    /// Whether to analyze game balance
    pub analyze_balance: bool,
    
    /// Whether to analyze game performance
    pub analyze_performance: bool,
}

impl Default for AnalyzerConfig {
    fn default() -> Self {
        Self {
            input_dir: ".".to_string(),
            output_dir: "./analysis".to_string(),
            analyze_mechanics: true,
            analyze_balance: true,
            analyze_performance: true,
        }
    }
}
