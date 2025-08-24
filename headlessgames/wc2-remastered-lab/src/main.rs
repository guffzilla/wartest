use anyhow::Result;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::ffi::c_void;

mod core;
mod memory;
mod process;
mod game_state;
mod events;
mod analysis;
mod utils;
mod ai_agent;

use core::Laboratory;
use process::ProcessMonitor;
use memory::MemoryAnalyzer;
use game_state::GameStateTracker;
use events::EventRecorder;
use ai_agent::{AIAgent, ActionSequences, GameType, MenuTarget};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    info!("🚀 Starting WC2 Remastered Headless Laboratory with AI Agent...");

    // Create shared state
    let laboratory = Arc::new(Mutex::new(Laboratory::new()?));

    // Initialize core components
    let process_monitor = Arc::new(Mutex::new(ProcessMonitor::new()?));
    let memory_analyzer = Arc::new(Mutex::new(MemoryAnalyzer::new()?));
    let game_state_tracker = Arc::new(Mutex::new(GameStateTracker::new()?));
    let event_recorder = Arc::new(Mutex::new(EventRecorder::new()?));

    info!("📊 Laboratory components initialized successfully");

    // Initialize AI Agent
    let mut ai_agent = AIAgent::new();
    info!("🤖 AI Agent created successfully");

    // Run the laboratory with AI agent integration
    run_laboratory_with_ai(
        laboratory, 
        process_monitor, 
        memory_analyzer, 
        game_state_tracker, 
        event_recorder,
        &mut ai_agent
    ).await?;

    info!("✅ Laboratory analysis with AI Agent completed successfully");
    Ok(())
}

async fn run_laboratory_with_ai(
    laboratory: Arc<Mutex<Laboratory>>,
    process_monitor: Arc<Mutex<ProcessMonitor>>,
    memory_analyzer: Arc<Mutex<MemoryAnalyzer>>,
    game_state_tracker: Arc<Mutex<GameStateTracker>>,
    event_recorder: Arc<Mutex<EventRecorder>>,
    ai_agent: &mut AIAgent,
) -> Result<()> {
    info!("🔬 Starting WC2 Remastered analysis with AI Agent...");

    // Phase 1: Process Detection
    info!("📋 Phase 1: Detecting WC2 Remastered processes...");
    let processes = process_monitor.lock().await.find_wc2_processes().await?;

    if processes.is_empty() {
        info!("⚠️  No WC2 Remastered processes found. Starting AI Agent demonstration...");
        
        // Demonstrate AI Agent capabilities
        demonstrate_ai_agent(ai_agent).await?;
        
    } else {
        info!("🎮 Found {} WC2 Remastered process(es)", processes.len());

        // Phase 2: AI Agent Integration
        info!("📋 Phase 2: Integrating AI Agent with running game...");
        integrate_ai_with_running_game(ai_agent, &processes).await?;

        // Phase 3: Memory Analysis
        info!("📋 Phase 3: Analyzing memory structures...");
        for process in processes {
            let memory_map = memory_analyzer.lock().await.analyze_process(&process).await?;
            info!("💾 Memory analysis completed for PID {}", process.pid);

            // Phase 4: Game State Tracking
            info!("📋 Phase 4: Tracking game state...");
            let game_state = game_state_tracker.lock().await.track_state(&memory_map).await?;

            // Phase 5: Event Recording
            info!("📋 Phase 5: Recording game events...");
            event_recorder.lock().await.record_events(&game_state).await?;
        }
    }

    // Phase 6: Data Analysis
    info!("📋 Phase 6: Analyzing collected data...");
    let analysis_results = analysis::analyze_collected_data().await?;

    // Save results
    laboratory.lock().await.save_results(&analysis_results).await?;

    info!("✅ Laboratory analysis with AI Agent completed successfully");
    Ok(())
}

/// Demonstrate AI Agent capabilities when no game is running
async fn demonstrate_ai_agent(ai_agent: &mut AIAgent) -> Result<()> {
    info!("🎭 Demonstrating AI Agent capabilities...");
    
    // Show what the AI agent can do
    info!("🤖 AI Agent can perform the following actions:");
    info!("   • Mouse clicks and movements");
    info!("   • Keyboard input simulation");
    info!("   • Menu navigation");
    info!("   • Game type selection");
    info!("   • Campaign mission starting");
    info!("   • Custom scenario loading");
    
    // Create example action sequences
    let campaign_sequence = ActionSequences::start_campaign_mission("Human Campaign - Mission 1");
    let custom_sequence = ActionSequences::start_custom_scenario("2v2_Grunt");
    let menu_sequence = ActionSequences::return_to_main_menu();
    
    info!("📋 Example action sequences created:");
    info!("   • Campaign sequence: {} actions", campaign_sequence.len());
    info!("   • Custom scenario sequence: {} actions", custom_sequence.len());
    info!("   • Menu navigation sequence: {} actions", menu_sequence.len());
    
    // Note: We won't actually execute these without a game running
    info!("💡 To test AI Agent, launch Warcraft II Remastered first");
    
    Ok(())
}

/// Integrate AI Agent with a running game
async fn integrate_ai_with_running_game(
    ai_agent: &mut AIAgent, 
    processes: &[process::WC2Process]
) -> Result<()> {
    info!("🔗 Integrating AI Agent with running game...");
    
    // Try to initialize AI Agent with the game
    let game_title = "Warcraft II: Remastered"; // Adjust based on actual window title
    
    match ai_agent.initialize(game_title) {
        Ok(_) => {
            info!("✅ AI Agent successfully connected to game window");
            
            // Get game window information
            if let Some(hwnd) = ai_agent.get_game_window() {
                info!("🪟 Game window handle: {:?}", hwnd);
            }
            
            let (width, height) = ai_agent.get_screen_resolution();
            info!("📱 Game window resolution: {}x{}", width, height);
            
            // Demonstrate basic AI actions
            info!("🎬 Demonstrating basic AI actions...");
            
            // Example: Navigate to campaign menu
            let campaign_actions = vec![
                ai_agent::AIAction::Wait { duration_ms: 1000 },
                ai_agent::AIAction::NavigateTo { menu: MenuTarget::Campaign },
                ai_agent::AIAction::Wait { duration_ms: 500 },
            ];
            
            info!("🧭 Executing campaign navigation sequence...");
            ai_agent.execute_actions(campaign_actions).await?;
            
            info!("✅ AI Agent integration demonstration completed");
            
        }
        Err(e) => {
            warn!("⚠️  Could not initialize AI Agent: {}", e);
            info!("💡 This is normal if the game window title doesn't match exactly");
            info!("💡 The AI Agent will still work once the correct window is found");
        }
    }
    
    Ok(())
}
