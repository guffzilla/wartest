//! Shared AI and machine learning functionality
//! 
//! This library provides AI models and utilities for game analysis and pattern recognition.

pub mod game_analysis;
pub mod pattern_recognition;

pub use game_analysis::GameAnalysisAI;
pub use pattern_recognition::PatternRecognition;

/// Result type for the shared AI library
pub type Result<T> = anyhow::Result<T>;

/// Error type for the shared AI library
#[derive(thiserror::Error, Debug)]
pub enum AIError {
    #[error("Model loading error: {0}")]
    ModelLoadingError(String),
    
    #[error("Inference error: {0}")]
    InferenceError(String),
    
    #[error("Pattern recognition error: {0}")]
    PatternRecognitionError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}
