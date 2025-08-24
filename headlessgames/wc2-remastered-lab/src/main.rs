use anyhow::Result;
use log::{info, error};
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

use core::Laboratory;
use process::ProcessMonitor;
use memory::MemoryAnalyzer;
use game_state::GameStateTracker;
use events::EventRecorder;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    info!("🚀 Starting WC2 Remastered Headless Laboratory...");

    // Create shared state
    let laboratory = Arc::new(Mutex::new(Laboratory::new()?));
    
    // Initialize core components
    let process_monitor = Arc::new(Mutex::new(ProcessMonitor::new()?));
    let memory_analyzer = Arc::new(Mutex::new(MemoryAnalyzer::new()?));
    let game_state_tracker = Arc::new(Mutex::new(GameStateTracker::new()?));
    let event_recorder = Arc::new(Mutex::new(EventRecorder::new()?));

    info!("📊 Laboratory components initialized successfully");

    // Run the laboratory directly
    run_laboratory(laboratory, process_monitor, memory_analyzer, game_state_tracker, event_recorder).await?;
    
    info!("✅ Laboratory analysis completed successfully");

    Ok(())
}

async fn run_laboratory(
    laboratory: Arc<Mutex<Laboratory>>,
    process_monitor: Arc<Mutex<ProcessMonitor>>,
    memory_analyzer: Arc<Mutex<MemoryAnalyzer>>,
    game_state_tracker: Arc<Mutex<GameStateTracker>>,
    event_recorder: Arc<Mutex<EventRecorder>>,
) -> Result<()> {
    info!("🔬 Starting WC2 Remastered analysis...");

    // Phase 1: Process Detection
    info!("📋 Phase 1: Detecting WC2 Remastered processes...");
    let processes = process_monitor.lock().await.find_wc2_processes().await?;
    
    if processes.is_empty() {
        info!("⚠️  No WC2 Remastered processes found. Starting in analysis mode...");
        // Continue in analysis mode for data structure exploration
    } else {
        info!("🎮 Found {} WC2 Remastered process(es)", processes.len());
        
        // Phase 2: Memory Analysis
        info!("📋 Phase 2: Analyzing memory structures...");
        for process in processes {
            let memory_map = memory_analyzer.lock().await.analyze_process(&process).await?;
            info!("💾 Memory analysis completed for PID {}", process.pid);
            
            // Phase 3: Game State Tracking
            info!("📋 Phase 3: Tracking game state...");
            let game_state = game_state_tracker.lock().await.track_state(&memory_map).await?;
            
            // Phase 4: Event Recording
            info!("📋 Phase 4: Recording game events...");
            event_recorder.lock().await.record_events(&game_state).await?;
        }
    }

    // Phase 5: Data Analysis
    info!("📋 Phase 5: Analyzing collected data...");
    let analysis_results = analysis::analyze_collected_data().await?;
    
    // Save results
    laboratory.lock().await.save_results(&analysis_results).await?;
    
    info!("✅ Laboratory analysis completed successfully");
    Ok(())
}
