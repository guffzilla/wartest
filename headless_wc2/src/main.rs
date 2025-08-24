use anyhow::Result;
use log::{info, warn, error};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::time::Duration;

// Import from our library
use headless_wc2::{initialize_headless_system, get_system_info, VERSION, NAME};

/// Main entry point for Headless WC2 Remastered
#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    
    info!("🚀 Starting Headless WC2 Remastered v{}...", VERSION);
    info!("🤖 AI Integration: ENABLED");
    info!("📊 Analytics: ENABLED");
    info!("🔒 Safety: MAXIMUM PROTECTION");
    
    // Display system information
    let system_info = get_system_info();
    info!("📋 System Info: {}", serde_json::to_string_pretty(&system_info)?);
    
    // Initialize the headless system
    let game_engine = initialize_headless_system().await?;
    
    info!("✅ All systems initialized successfully");
    
    // Start the headless game
    match game_engine.start_headless_game().await {
        Ok(_) => {
            info!("🎉 Headless game completed successfully");
        }
        Err(e) => {
            error!("❌ Headless game failed: {}", e);
            return Err(e);
        }
    }
    
    info!("🔄 Shutting down headless WC2...");
    Ok(())
}

// All struct definitions are now in the library modules
