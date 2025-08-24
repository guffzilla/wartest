use anyhow::Result;
use log::{info, warn, error};

use headless_wc2::{initialize_headless_system, get_system_info, VERSION, NAME};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    
    info!("🚀 Starting Headless WC2 Remastered v1.0.0...");
    info!("🤖 AI Integration: ENABLED");
    info!("📊 Analytics: ENABLED");
    info!("🔒 Safety: MAXIMUM PROTECTION");
    
    info!("📋 System Info: {}", serde_json::to_string_pretty(&get_system_info())?);
    
    // Initialize the headless game engine
    let mut game_engine = initialize_headless_system().await?;
    
    info!("✅ Headless game engine initialized successfully");
    
    // Start memory monitoring
    game_engine.start_memory_monitoring().await?;
    info!("🔍 Memory monitoring started");
    
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
