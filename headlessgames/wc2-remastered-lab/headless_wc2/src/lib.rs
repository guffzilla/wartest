//! Headless Warcraft II Remastered System
//! 
//! This crate provides a complete headless version of WC2 Remastered with:
//! - AI-controlled gameplay
//! - Memory and function hooking
//! - Comprehensive data export and analytics
//! - Replay recording and playback
//! - Performance monitoring

pub mod game_engine;
pub mod memory_hooks;
pub mod function_hooks;
pub mod ai_controller;
pub mod data_exporter;
pub mod replay_system;

// Re-export main types for easy access
pub use game_engine::{
    HeadlessGameEngine,
    HeadlessConfig,
    HeadlessGameState,
    GamePhase,
    PlayerResources,
    UnitInfo,
    BuildingInfo,
    MapInfo,
    GameStatus,
};

pub use memory_hooks::{
    MemoryHookManager,
    MemoryHook,
    MemoryState,
    MemoryRegion,
};

pub use function_hooks::{
    FunctionHookManager,
    FunctionHook,
    AIAction,
};

pub use ai_controller::{
    AIController,
    AIStrategy,
    AIDecisionContext,
    AIPersonality,
};

pub use data_exporter::{
    DataExporter,
    ExportFormat,
    PerformanceMetrics,
    AIDecisionData,
};

pub use replay_system::{
    ReplaySystem,
    ReplayEvent,
    ReplayData,
    ReplayMetadata,
    GameStats,
};

/// System version information
pub const VERSION: &str = "1.0.0";
pub const NAME: &str = "Headless WC2 Remastered";

/// Initialize the complete headless system
pub async fn initialize_headless_system() -> anyhow::Result<HeadlessGameEngine> {
    log::info!("🚀 Initializing Headless WC2 Remastered System v{}", VERSION);
    
    // Create system components
    let memory_hooks = std::sync::Arc::new(MemoryHookManager::new().await?);
    let function_hooks = std::sync::Arc::new(FunctionHookManager::new().await?);
    let ai_controller = std::sync::Arc::new(AIController::new().await?);
    let data_exporter = std::sync::Arc::new(DataExporter::new().await?);
    let replay_system = std::sync::Arc::new(ReplaySystem::new().await?);
    
    // Create the main game engine
    let game_engine = HeadlessGameEngine::new_with_components(
        HeadlessConfig::default(),
        memory_hooks,
        function_hooks,
        ai_controller,
        data_exporter,
        replay_system,
    ).await?;
    
    log::info!("✅ Headless WC2 System initialized successfully");
    Ok(game_engine)
}

/// Get system information
pub fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "name": NAME,
        "version": VERSION,
        "features": {
            "ai_control": true,
            "memory_hooking": true,
            "function_hooking": true,
            "data_export": true,
            "replay_system": true,
            "performance_monitoring": true,
        },
        "architecture": {
            "game_engine": "HeadlessGameEngine",
            "memory_system": "MemoryHookManager",
            "function_system": "FunctionHookManager",
            "ai_system": "AIController",
            "data_system": "DataExporter",
            "replay_system": "ReplaySystem",
        },
        "status": "ready"
    })
}

/// Result type for the headless system
pub type Result<T> = anyhow::Result<T>;
