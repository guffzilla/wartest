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
    
    if args.len() > 1 {
        match args[1].as_str() {
            "custom-build" => {
                run_custom_game_builder().await?;
            }
            "ai-demo" => {
                run_ai_agent_demo().await?;
            }
            "help" | "--help" | "-h" => {
                print_usage();
            }
            _ => {
                warn!("Unknown command: {}. Running default laboratory...", args[1]);
                run_default_laboratory().await?;
            }
        }
    } else {
        // Default behavior - run laboratory with AI Agent
        run_default_laboratory().await?;
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
    
    // Create laboratory instance
    let mut laboratory = create_laboratory()?;
    
    // Start laboratory session
    laboratory.start_session().await?;
    
    // Demonstrate AI Agent capabilities
    info!("🤖 AI Agent can perform the following actions:");
    info!("   • Mouse clicks and movements");
    info!("   • Keyboard input simulation");
    info!("   • Menu navigation");
    info!("   • Game type selection");
    info!("   • Campaign mission starting");
    info!("   • Custom scenario loading");
    
    // Create example action sequences
    use wc2_remastered_lab::ai_agent::{ActionSequences, MenuTarget};
    let campaign_sequence = ActionSequences::start_campaign_mission("Human Campaign - Mission 1");
    let custom_sequence = ActionSequences::start_custom_scenario("2v2_Grunt");
    let menu_sequence = ActionSequences::return_to_main_menu();
    
    info!("📋 Example action sequences created:");
    info!("   • Campaign sequence: {} actions", campaign_sequence.len());
    info!("   • Custom scenario sequence: {} actions", custom_sequence.len());
    info!("   • Menu navigation sequence: {} actions", menu_sequence.len());
    
    info!("✅ AI Agent demonstration completed successfully!");
    
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
