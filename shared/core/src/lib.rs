//! Shared core game engine functionality
//! 
//! This library provides common game engine abstractions, process monitoring, and memory hooking utilities.

pub mod game_engine;
pub mod process_monitor;
pub mod memory_hooks;

pub use game_engine::GameEngine;
pub use process_monitor::ProcessMonitor;
pub use memory_hooks::MemoryHooks;

/// Result type for the shared core library
pub type Result<T> = anyhow::Result<T>;

/// Error type for the shared core library
#[derive(thiserror::Error, Debug)]
pub enum CoreError {
    #[error("Process error: {0}")]
    ProcessError(String),
    
    #[error("Memory error: {0}")]
    MemoryError(String),
    
    #[error("Game engine error: {0}")]
    GameEngineError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}
