use anyhow::Result;
use log::{info, warn, error};
use std::fs::OpenOptions;
use std::io::Write;
use chrono::Utc;

use wc2_ai::{initialize_headless_system, get_system_info, VERSION, NAME};

fn log_to_json(level: &str, message: &str) {
    let log_entry = serde_json::json!({
        "timestamp": Utc::now().to_rfc3339(),
        "level": level,
        "message": message
    });
    
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("ai_debug.log")
    {
        let _ = writeln!(file, "{}", log_entry);
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    
    log_to_json("INFO", "🚀 Starting Headless WC2 Remastered v1.0.0...");
    info!("🚀 Starting Headless WC2 Remastered v1.0.0...");
    
    log_to_json("INFO", "🤖 AI Integration: ENABLED");
    info!("🤖 AI Integration: ENABLED");
    
    log_to_json("INFO", "📊 Analytics: ENABLED");
    info!("📊 Analytics: ENABLED");
    
    log_to_json("INFO", "🔒 Safety: MAXIMUM PROTECTION");
    info!("🔒 Safety: MAXIMUM PROTECTION");
    
    let system_info = serde_json::to_string_pretty(&get_system_info())?;
    log_to_json("INFO", &format!("📋 System Info: {}", system_info));
    info!("📋 System Info: {}", system_info);
    
    // Initialize the headless game engine
    log_to_json("INFO", "🔄 Initializing headless game engine...");
    let mut game_engine = initialize_headless_system().await?;
    
    log_to_json("INFO", "✅ Headless game engine initialized successfully");
    info!("✅ Headless game engine initialized successfully");
    
    // Start memory monitoring
    log_to_json("INFO", "🔄 Starting memory monitoring...");
    game_engine.start_memory_monitoring().await?;
    log_to_json("INFO", "🔍 Memory monitoring started");
    info!("🔍 Memory monitoring started");
    
    // Start the headless game
    log_to_json("INFO", "🎮 Starting headless game...");
    match game_engine.start_headless_game().await {
        Ok(_) => {
            log_to_json("INFO", "🎉 Headless game completed successfully");
            info!("🎉 Headless game completed successfully");
        }
        Err(e) => {
            let error_msg = format!("❌ Headless game failed: {}", e);
            log_to_json("ERROR", &error_msg);
            error!("❌ Headless game failed: {}", e);
            return Err(e);
        }
    }
    
    log_to_json("INFO", "🔄 Shutting down headless WC2...");
    info!("🔄 Shutting down headless WC2...");
    Ok(())
}
