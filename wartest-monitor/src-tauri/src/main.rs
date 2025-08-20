// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use app_lib::*;

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Initialize the app
            println!("Wartest Monitor initialized");
            println!("Version: {}", env!("CARGO_PKG_VERSION"));
            println!("System tray is active");
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// System tray helper functions
fn launch_warcraft_ii() {
    println!("Attempting to launch Warcraft II through Battle.net...");
    
    // First, try to launch Battle.net if it's not running
    let battle_net_paths = vec![
        r"C:\Program Files (x86)\Battle.net\Battle.net Launcher.exe",
        r"C:\Program Files\Battle.net\Battle.net Launcher.exe",
    ];
    
    // Check if Battle.net is already running
    let battle_net_running = std::process::Command::new("tasklist")
        .args(&["/FI", "IMAGENAME eq Battle.net.exe"])
        .output()
        .map(|output| {
            String::from_utf8_lossy(&output.stdout).contains("Battle.net.exe")
        })
        .unwrap_or(false);
    
    if !battle_net_running {
        println!("Battle.net not running, attempting to launch it...");
        for path in &battle_net_paths {
            if std::path::Path::new(path).exists() {
                match std::process::Command::new(path).spawn() {
                    Ok(_) => {
                        println!("Battle.net launched successfully");
                        // Give Battle.net time to start
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        break;
                    }
                    Err(e) => {
                        eprintln!("Failed to launch Battle.net: {}", e);
                    }
                }
            }
        }
    } else {
        println!("Battle.net is already running");
    }
    
    // Now try to launch Warcraft II through Battle.net
    // We can try to launch the game directly, but it should redirect to Battle.net
    let warcraft_paths = vec![
        r"C:\Program Files (x86)\Warcraft II Remastered\Warcraft II.exe",
        r"C:\Program Files\Warcraft II Remastered\Warcraft II.exe",
        r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft II Remastered\x86\Warcraft II.exe",
    ];

    for path in warcraft_paths {
        if std::path::Path::new(path).exists() {
            match std::process::Command::new(path).spawn() {
                Ok(_) => {
                    println!("Warcraft II launch command sent successfully");
                    println!("Note: The game should launch through Battle.net");
                    return;
                }
                Err(e) => {
                    eprintln!("Failed to launch Warcraft II: {}", e);
                }
            }
        }
    }
    
    eprintln!("Warcraft II not found in common locations");
    println!("Please ensure Battle.net is installed and Warcraft II is added to your library");
}

fn start_game_monitoring(app: &tauri::App) {
    println!("Starting game monitoring...");
    // TODO: Implement actual monitoring logic
}

fn stop_game_monitoring(app: &tauri::App) {
    println!("Stopping game monitoring...");
    // TODO: Implement actual monitoring stop logic
}

fn show_settings_window(app: &tauri::App) {
    println!("Opening settings window...");
    // TODO: Implement settings window
}

fn show_status_window(app: &tauri::App) {
    println!("Showing status window...");
    // TODO: Implement status window
}
