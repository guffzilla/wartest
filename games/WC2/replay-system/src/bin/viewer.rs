use eframe::egui;
use anyhow::Result;

use wc2_replay_system::viewer::viewer_app::ReplayViewerApp;

fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Create the replay viewer app
    let app = ReplayViewerApp::new()?;

    // Configure egui options
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1200.0, 800.0])
            .with_min_inner_size([800.0, 600.0])
            .with_resizable(true),
        vsync: true,
        ..Default::default()
    };

    // Run the application
    eframe::run_native(
        "WC2 Remastered Replay Viewer",
        options,
        Box::new(|_cc| Box::new(app)),
    ).map_err(|e| anyhow::anyhow!("Failed to run application: {}", e))?;

    Ok(())
}
