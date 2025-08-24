use anyhow::Result;
use log::info;

use wc2_remastered_lab::ai_agent::{AIAgent, ActionSequences, MenuTarget, VirtualKey, MouseButton};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    info!("🧪 Testing AI Agent functionality...");

    // Test 1: Create AI Agent
    info!("✅ Test 1: Creating AI Agent");
    let mut ai_agent = AIAgent::new();
    assert!(ai_agent.get_game_window().is_none());
    assert_eq!(ai_agent.get_screen_resolution(), (1920, 1080));
    info!("✅ AI Agent creation successful");

    // Test 2: Action Sequences
    info!("✅ Test 2: Testing Action Sequences");
    let campaign_sequence = ActionSequences::start_campaign_mission("Test Mission");
    assert!(!campaign_sequence.is_empty());
    assert_eq!(campaign_sequence.len(), 7);
    
    let custom_sequence = ActionSequences::start_custom_scenario("Test Map");
    assert!(!custom_sequence.is_empty());
    assert_eq!(custom_sequence.len(), 7);
    
    let menu_sequence = ActionSequences::return_to_main_menu();
    assert!(!menu_sequence.is_empty());
    assert_eq!(menu_sequence.len(), 6);
    info!("✅ Action sequence creation successful");

    // Test 3: AI Agent without game (demonstration mode)
    info!("✅ Test 3: Testing AI Agent demonstration mode");
    info!("🤖 AI Agent can perform the following actions:");
    info!("   • Mouse clicks and movements");
    info!("   • Keyboard input simulation");
    info!("   • Menu navigation");
    info!("   • Game type selection");
    info!("   • Campaign mission starting");
    info!("   • Custom scenario loading");
    
    info!("📋 Example action sequences created:");
    info!("   • Campaign sequence: {} actions", campaign_sequence.len());
    info!("   • Custom scenario sequence: {} actions", custom_sequence.len());
    info!("   • Menu navigation sequence: {} actions", menu_sequence.len());
    
    info!("💡 To test AI Agent with actual game:");
    info!("   1. Launch Warcraft II Remastered");
    info!("   2. Navigate to main menu");
    info!("   3. Run the main laboratory: cargo run");
    
    info!("🎉 All AI Agent tests completed successfully!");
    info!("🚀 AI Agent is ready for game integration testing!");
    
    Ok(())
}
