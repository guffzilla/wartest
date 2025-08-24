use anyhow::Result;
use log::{info, warn, error};
use std::path::PathBuf;
use std::env;

use wc2_remastered_lab::{
    create_laboratory, init_logging,
    CustomGameBuilder, BuildConfig, BuildType
};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    init_logging()?;
    info!("🚀 Starting WC2 Remastered Headless Laboratory...");
    info!("Version: {}", wc2_remastered_lab::VERSION);

    // Check command line arguments
    let args: Vec<String> = env::args().collect();
    
    match args.get(1).map(|s| s.as_str()) {
        Some("custom-build") => {
            run_custom_game_builder().await?;
        }
        Some("ai-demo") => {
            run_ai_agent_demo().await?;
        }
        Some("analyze-game") => {
            run_real_time_analysis().await?;
        }
        Some(unknown) => {
            info!("Unknown command: {}", unknown);
            info!("Available commands:");
            info!("  custom-build  - Set up custom game build environment");
            info!("  ai-demo       - Run AI Agent demonstration");
            info!("  analyze-game  - Analyze running WC2 Remastered game");
            info!("  (no args)     - Run default laboratory mode");
        }
        None => {
            run_default_laboratory().await?;
        }
    }

    Ok(())
}

/// Run the custom game builder
async fn run_custom_game_builder() -> Result<()> {
    info!("🔧 Starting Custom Game Builder...");
    info!("🔒 SAFETY: This will NEVER modify your original game files!");
    info!("📁 All work is done on isolated copies in our AI laboratory folder");
    
    // Get WC2 Remastered installation path from user or environment
    let original_path = get_wc2_installation_path()?;
    
    // Ensure we're working in our AI laboratory directory, not in the game directory
    let current_dir = std::env::current_dir()?;
    let custom_path = current_dir.join("custom_wc2_build");
    
    // Safety check: ensure we're not trying to work inside the original game directory
    if custom_path.starts_with(&original_path) {
        return Err(anyhow::anyhow!(
            "🚨 SAFETY VIOLATION: Cannot create custom build inside original game directory! \
            This would risk modifying your original files. \
            Please run this command from a different location."
        ));
    }
    
    info!("📁 Original game path: {:?}", original_path);
    info!("📁 Custom build path: {:?}", custom_path);
    info!("🔒 SAFETY: Working with isolated copies only");
    
    // Create custom game builder
    let config = BuildConfig {
        headless_mode: true,
        disable_networking: true,
        enable_data_export: true,
        enable_ai_integration: true,
        build_type: BuildType::Debug,
    };
    
    let builder = CustomGameBuilder::new(original_path, custom_path)
        .with_config(config);
    
    // Initialize the build environment
    builder.initialize().await?;
    
    // Start the analysis
    builder.start_analysis().await?;
    
    info!("✅ Custom Game Builder initialized successfully!");
    info!("🔒 SAFETY CONFIRMED: All operations completed on isolated copies only");
    info!("💡 Check the 'custom_wc2_build' directory for analysis tools and reports");
    info!("🚀 Ready to begin reverse engineering WC2 Remastered!");
    
    Ok(())
}

/// Run AI Agent demonstration mode
async fn run_ai_agent_demo() -> Result<()> {
    info!("🤖 Starting AI Agent Demonstration Mode...");
    
    // Create AI Agent
    let agent = wc2_remastered_lab::ai_agent::AIAgent::new();
    
    // Demonstrate capabilities
    info!("🤖 AI Agent can perform the following actions:");
    info!("   • Mouse clicks and movements");
    info!("   • Keyboard input simulation");
    info!("   • Menu navigation");
    info!("   • Game type selection");
    info!("   • Campaign mission starting");
    info!("   • Custom scenario loading");
    
    // Create example action sequences
    let campaign_sequence = wc2_remastered_lab::ai_agent::ActionSequences::start_campaign_mission("Human Campaign - Mission 1");
    let custom_sequence = wc2_remastered_lab::ai_agent::ActionSequences::start_custom_scenario("2v2_Grunt");
    let menu_sequence = wc2_remastered_lab::ai_agent::ActionSequences::return_to_main_menu();
    
    info!("📋 Example action sequences created:");
    info!("   • Campaign sequence: {} actions", campaign_sequence.len());
    info!("   • Custom scenario sequence: {} actions", custom_sequence.len());
    info!("   • Menu navigation sequence: {} actions", menu_sequence.len());
    
    info!("✅ AI Agent demonstration completed successfully!");
    Ok(())
}

/// **NEW: Run real-time game analysis using our AI Agent system**
async fn run_real_time_analysis() -> Result<()> {
    info!("🔍 Starting Real-Time Game Analysis Mode...");
    info!("🎯 This will analyze the running WC2 Remastered game to create headless specifications");
    
    // Create AI Agent
    let agent = wc2_remastered_lab::ai_agent::AIAgent::new();
    
    // Analyze the running game
    info!("🔍 Analyzing running WC2 Remastered game...");
    let game_analysis = agent.analyze_running_game().await?;
    
    info!("✅ Game analysis completed successfully!");
    info!("📊 Analysis Results:");
    info!("   • Process: {} (PID: {})", game_analysis.process_info.name, game_analysis.process_info.pid);
    info!("   • Memory Usage: {} MB", game_analysis.process_info.memory_usage / (1024 * 1024));
    info!("   • Memory Regions: {}", game_analysis.memory_structure.memory_regions.len());
    info!("   • UI Elements: {}", game_analysis.ui_structure.ui_elements.len());
    info!("   • State Patterns: {}", game_analysis.state_patterns.len());
    
    // Generate headless specifications
    info!("🏗️ Generating headless version specifications...");
    let headless_specs = agent.generate_headless_specs(&game_analysis);
    
    info!("📋 Headless Specifications Generated:");
    info!("   • Memory Hooks: {}", headless_specs.memory_hooks.len());
    info!("   • UI Replacements: {}", headless_specs.ui_replacements.len());
    info!("   • Network Disablers: {}", headless_specs.network_disablers.len());
    info!("   • AI Integration Points: {}", headless_specs.ai_integration_points.len());
    
    // Save analysis results
    let output_dir = format!("output/analysis-{}", chrono::Utc::now().timestamp());
    std::fs::create_dir_all(&output_dir)?;
    
    let analysis_file = format!("{}/game_analysis.json", output_dir);
    let specs_file = format!("{}/headless_specs.json", output_dir);
    
    // Save game analysis
    let analysis_json = serde_json::to_string_pretty(&game_analysis)?;
    std::fs::write(&analysis_file, analysis_json)?;
    
    // Save headless specifications
    let specs_json = serde_json::to_string_pretty(&headless_specs)?;
    std::fs::write(&specs_file, specs_json)?;
    
    info!("💾 Analysis results saved to:");
    info!("   • Game Analysis: {}", analysis_file);
    info!("   • Headless Specs: {}", specs_file);
    
    info!("🎉 Real-time analysis completed successfully!");
    info!("🚀 Next step: Use these specifications to create the headless version");
    
    Ok(())
}

/// Run default laboratory (original functionality)
async fn run_default_laboratory() -> Result<()> {
    info!("🧪 Starting Default Laboratory Mode...");
    
    // Create laboratory instance
    let mut laboratory = create_laboratory()?;
    
    // Start laboratory session
    laboratory.start_session().await?;
    
    info!("🎮 Laboratory session started successfully!");
    info!("💡 To test with actual game, launch WC2 Remastered and run:");
    info!("   {} custom-build", env::args().next().unwrap());
    
    Ok(())
}

/// Get WC2 Remastered installation path
fn get_wc2_installation_path() -> Result<PathBuf> {
    // Try to get from environment variable first
    if let Ok(path) = env::var("WC2_INSTALL_PATH") {
        let path_buf = PathBuf::from(path);
        if path_buf.exists() {
            return Ok(path_buf);
        }
    }
    
    // Common installation paths
    let common_paths = [
        r"C:\Program Files (x86)\Warcraft II Remastered",
        r"C:\Program Files\Warcraft II Remastered",
        r"C:\Games\Warcraft II Remastered",
        r"D:\Games\Warcraft II Remastered",
    ];
    
    for path in &common_paths {
        let path_buf = PathBuf::from(path);
        if path_buf.exists() {
            return Ok(path_buf);
        }
    }
    
    // If no path found, ask user to provide one
    warn!("⚠️ WC2 Remastered installation not found in common locations");
    warn!("💡 Please set WC2_INSTALL_PATH environment variable or");
    warn!("💡 provide the installation path manually");
    
    // For now, return a default path that the user can modify
    Ok(PathBuf::from(r"C:\Path\To\Warcraft II Remastered"))
}

/// Print usage information
fn print_usage() {
    println!("WC2 Remastered Headless Laboratory");
    println!("Version: {}", wc2_remastered_lab::VERSION);
    println!();
    println!("Usage:");
    println!("  {}                    - Run default laboratory with AI Agent", env::args().next().unwrap());
    println!("  {} custom-build       - Initialize custom game builder for headless WC2", env::args().next().unwrap());
    println!("  {} ai-demo            - Run AI Agent demonstration mode", env::args().next().unwrap());
    println!("  {} help               - Show this help message", env::args().next().unwrap());
    println!();
    println!("Commands:");
    println!("  custom-build          - Set up environment for building custom headless WC2");
    println!("  ai-demo               - Demonstrate AI Agent capabilities without game");
    println!("  help                  - Show this help message");
    println!();
    println!("Environment Variables:");
    println!("  WC2_INSTALL_PATH     - Path to WC2 Remastered installation");
    println!();
    println!("Examples:");
    println!("  # Set WC2 installation path and run custom builder");
    println!("  set WC2_INSTALL_PATH=C:\\Games\\Warcraft II Remastered");
    println!("  {} custom-build", env::args().next().unwrap());
    println!();
    println!("  # Run AI Agent demonstration");
    println!("  {} ai-demo", env::args().next().unwrap());
}
