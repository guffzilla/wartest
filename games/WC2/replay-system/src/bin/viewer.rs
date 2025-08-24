use eframe::egui;
use anyhow::Result;

use wc2_replay_system::emulator::WC2ReplayEmulator;

fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Create the replay emulator
    let emulator = WC2ReplayEmulator::new()?;

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
        "WC2 Remastered Replay Emulator",
        options,
        Box::new(|_cc| Box::new(emulator)),
    ).map_err(|e| anyhow::anyhow!("Failed to run application: {}", e))?;

    Ok(())
}
