//! WC2 Remastered Headless Laboratory
//! 
//! A sophisticated laboratory environment for analyzing Warcraft II Remastered's
//! internal structures, memory layouts, and game mechanics.

pub mod core;
pub mod memory;
pub mod process;
pub mod game_state;
pub mod events;
pub mod analysis;
pub mod utils;
pub mod ai_agent;
pub mod custom_game_builder;

// Re-export main types for convenience
pub use core::{Laboratory, LaboratoryConfig, ExtractionDepth, OutputFormat};
pub use process::{ProcessMonitor, WC2Process, ProcessStatus};
pub use memory::{MemoryAnalyzer, ProcessMemoryMap, MemoryRegion, MemoryAnalysis};
pub use game_state::{GameState, GameStateTracker, GamePhase, UnitType, BuildingType};
pub use events::{EventRecorder, GameEvent, EventType, EventData};
pub use analysis::{AnalysisResult, AnalysisType, AnalysisData};
pub use ai_agent::{AIAgent, AIAction, ActionSequences, MenuTarget, GameType};
pub use custom_game_builder::{CustomGameBuilder, BuildConfig, BuildType, BuildStatus};

/// Laboratory version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Laboratory name
pub const NAME: &str = "WC2 Remastered Headless Laboratory";

/// Default configuration
pub fn default_config() -> LaboratoryConfig {
    LaboratoryConfig::default()
}

/// Create a new laboratory instance with default settings
pub fn create_laboratory() -> anyhow::Result<Laboratory> {
    Laboratory::new()
}

/// Initialize logging for the laboratory
pub fn init_logging() -> Result<(), std::io::Error> {
    env_logger::init();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_laboratory_creation() {
        let lab = create_laboratory();
        assert!(lab.is_ok());
    }

    #[test]
    fn test_default_config() {
        let config = default_config();
        assert!(config.headless_mode);
        assert_eq!(config.memory_scan_interval, 100);
        assert!(config.event_recording);
    }

    #[test]
    fn test_version() {
        assert!(!VERSION.is_empty());
        assert!(!NAME.is_empty());
    }
}
