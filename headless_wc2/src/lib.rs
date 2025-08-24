//! Headless WC2 Remastered - AI Laboratory System
//! 
//! This crate provides a complete headless version of Warcraft II Remastered
//! with AI integration, memory monitoring, and data export capabilities.

pub mod game_engine;
pub mod memory_hooks;
pub mod function_hooks;
pub mod ai_controller;
pub mod data_exporter;
pub mod replay_system;

// Re-export main types for easy access
pub use game_engine::{HeadlessGameEngine, HeadlessGameState, HeadlessConfig, GamePhase, GameStatus};
pub use memory_hooks::{MemoryHookManager, MemoryHook};
pub use function_hooks::{FunctionHookManager, FunctionHook, HookType, AIAction};
pub use ai_controller::{AIController, AIStrategy, AIDecisionContext, PrioritizedAction};
pub use data_exporter::{DataExporter, ExportConfig, ExportFormat, PerformanceMetrics};
pub use replay_system::{ReplaySystem, ReplayEvent, ReplayMetadata, GameStats};

/// Version information
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const NAME: &str = "headless-wc2";

/// Error types
pub type Result<T> = anyhow::Result<T>;

/// Initialize the headless WC2 system
pub async fn initialize_headless_system() -> Result<HeadlessGameEngine> {
    log::info!("🚀 Initializing Headless WC2 Remastered System v{}", VERSION);
    
    // Create system components
    let memory_hooks = Arc::new(MemoryHookManager::new());
    let function_hooks = Arc::new(FunctionHookManager::new());
    let ai_controller = Arc::new(AIController::new(ai_controller::AIStrategy::Balanced));
    let data_exporter = Arc::new(DataExporter::default());
    let replay_system = Arc::new(ReplaySystem::default());
    
    // Create the main game engine
    let game_engine = HeadlessGameEngine::new(
        HeadlessConfig::default(),
        memory_hooks,
        function_hooks,
        ai_controller,
        data_exporter,
        replay_system,
    );
    
    log::info!("✅ Headless WC2 System initialized successfully");
    Ok(game_engine)
}

/// Get system information
pub fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "name": NAME,
        "version": VERSION,
        "description": "Headless version of Warcraft II Remastered with AI integration",
        "features": [
            "Memory monitoring and hooks",
            "Function interception and modification",
            "AI decision making and control",
            "Data export and analytics",
            "Replay recording and playback",
            "Headless game execution"
        ],
        "architecture": {
            "memory_hooks": "Real-time memory monitoring",
            "function_hooks": "Function interception and modification",
            "ai_controller": "AI decision making and action execution",
            "data_exporter": "Comprehensive data export and analytics",
            "replay_system": "Game replay recording and analysis",
            "game_engine": "Core headless game logic"
        }
    })
}

use std::sync::Arc;
