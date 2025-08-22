//! Warcraft III Shared Utilities
//! 
//! This library provides shared utilities specific to Warcraft III.

pub mod game_utils;
pub mod asset_utils;
pub mod data_utils;

/// Result type for the WC3 shared library
pub type Result<T> = anyhow::Result<T>;

/// Error type for the WC3 shared library
#[derive(thiserror::Error, Debug)]
pub enum WC3SharedError {
    #[error("Game utility error: {0}")]
    GameUtilityError(String),
    
    #[error("Asset utility error: {0}")]
    AssetUtilityError(String),
    
    #[error("Data utility error: {0}")]
    DataUtilityError(String),
}
