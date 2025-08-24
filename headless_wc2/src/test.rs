use anyhow::Result;
use log::{info, warn, error};
use headless_wc2::{get_system_info, VERSION, NAME};

/// Test entry point for headless WC2
#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    
    info!("🧪 Starting Headless WC2 Test Suite v{}", VERSION);
    
    // Test 1: System information
    info!("📋 Test 1: System Information");
    let system_info = get_system_info();
    info!("✅ System info retrieved: {}", serde_json::to_string_pretty(&system_info)?);
    
    // Test 2: Basic functionality
    info!("🔧 Test 2: Basic Functionality");
    info!("✅ Library name: {}", NAME);
    info!("✅ Library version: {}", VERSION);
    
    // Test 3: JSON serialization
    info!("📊 Test 3: JSON Serialization");
    let test_data = serde_json::json!({
        "test": "data",
        "number": 42,
        "boolean": true,
        "array": [1, 2, 3]
    });
    info!("✅ JSON serialization test: {}", serde_json::to_string_pretty(&test_data)?);
    
    info!("🎉 All tests completed successfully!");
    Ok(())
}
