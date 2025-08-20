// Example system tray implementation for Tauri 2.x
// This shows how to implement system tray functionality

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};

fn main() {
    // Create system tray menu items
    let launch_game = CustomMenuItem::new("launch_game".to_string(), "Launch Warcraft II");
    let start_monitoring = CustomMenuItem::new("start_monitoring".to_string(), "Start Monitoring");
    let stop_monitoring = CustomMenuItem::new("stop_monitoring".to_string(), "Stop Monitoring");
    let settings = CustomMenuItem::new("settings".to_string(), "Settings");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");

    // Build the system tray menu
    let tray_menu = SystemTrayMenu::new()
        .add_item(launch_game)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(start_monitoring)
        .add_item(stop_monitoring)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(settings)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    // Create the system tray
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "launch_game" => {
                            println!("Launching Warcraft II...");
                            // TODO: Implement game launching
                            // This could launch the game executable
                        }
                        "start_monitoring" => {
                            println!("Starting monitoring...");
                            // TODO: Start monitoring Warcraft II processes
                        }
                        "stop_monitoring" => {
                            println!("Stopping monitoring...");
                            // TODO: Stop monitoring
                        }
                        "settings" => {
                            println!("Opening settings...");
                            // TODO: Show settings window
                        }
                        "quit" => {
                            println!("Quitting application...");
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                }
                SystemTrayEvent::LeftClick { .. } => {
                    println!("System tray left clicked");
                    // Could show a quick status window
                }
                SystemTrayEvent::RightClick { .. } => {
                    println!("System tray right clicked");
                    // Could show context menu
                }
                _ => {}
            }
        })
        .setup(|app| {
            println!("Wartest Monitor initialized");
            println!("System tray is active");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
