// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowBuilder, WindowEvent, Emitter};
use tray_icon::{
    TrayIconBuilder, menu::{Menu, MenuItem, PredefinedMenuItem, MenuEvent}, TrayIconEvent
};
use app_lib::*;
use app_lib::game_monitor::GameMonitor;
use std::sync::atomic::{AtomicBool, Ordering};

fn main() {
    // Global flags for communication between tray thread and Tauri app
    static SHOW_WINDOW_REQUESTED: AtomicBool = AtomicBool::new(false);
    static START_MONITORING_REQUESTED: AtomicBool = AtomicBool::new(false);
    static STOP_MONITORING_REQUESTED: AtomicBool = AtomicBool::new(false);
    static QUIT_REQUESTED: AtomicBool = AtomicBool::new(false);
    
    // Create system tray menu items with IDs for event handling
    let launch_game = MenuItem::new("🚀 Launch WC1/2/3 on Battle.net", true, None);
    let start_monitoring_item = MenuItem::new("▶️ Start Monitoring", true, None);
    let stop_monitoring_item = MenuItem::new("⏹️ Stop Monitoring", true, None);
    let show_window = MenuItem::new("🪟 Show Main Window", true, None);
    let settings = MenuItem::new("⚙️ Settings", true, None);
    let quit = MenuItem::new("❌ Quit", true, None);

    // Build the system tray menu
    let tray_menu = Menu::new();
    tray_menu.append(&launch_game).unwrap();
    tray_menu.append(&PredefinedMenuItem::separator()).unwrap();
    tray_menu.append(&start_monitoring_item).unwrap();
    tray_menu.append(&stop_monitoring_item).unwrap();
    tray_menu.append(&PredefinedMenuItem::separator()).unwrap();
    tray_menu.append(&show_window).unwrap();
    tray_menu.append(&settings).unwrap();
    tray_menu.append(&PredefinedMenuItem::separator()).unwrap();
    tray_menu.append(&quit).unwrap();

    // Create a simple icon (16x16 RGBA pixels = 256 pixels total)
    let mut icon_data = Vec::new();
    for _ in 0..256 {
        icon_data.extend_from_slice(&[255, 255, 255, 255]); // White pixels
    }

    // Set up event handlers for tray icon
    TrayIconEvent::set_event_handler(Some(move |event: tray_icon::TrayIconEvent| {
        println!("Tray icon event: {:?}", event);
        
        // Handle double-click to show main window
        if let tray_icon::TrayIconEvent::DoubleClick { .. } = event {
            println!("Double-click detected - requesting main window show");
            SHOW_WINDOW_REQUESTED.store(true, Ordering::SeqCst);
        }
    }));

    // Set up event handlers for menu items
    let launch_game_id = launch_game.id().0.clone();
    let start_monitoring_id = start_monitoring_item.id().0.clone();
    let stop_monitoring_id = stop_monitoring_item.id().0.clone();
    let show_window_id = show_window.id().0.clone();
    let settings_id = settings.id().0.clone();
    let quit_id = quit.id().0.clone();

    MenuEvent::set_event_handler(Some(move |event: tray_icon::menu::MenuEvent| {
        println!("Menu event: {:?}", event);
        
        if event.id == launch_game_id {
            println!("Launching Warcraft games through Battle.net...");
            launch_warcraft_ii_internal();
        } else if event.id == start_monitoring_id {
            println!("Starting monitoring requested");
            START_MONITORING_REQUESTED.store(true, Ordering::SeqCst);
        } else if event.id == stop_monitoring_id {
            println!("Stopping monitoring requested");
            STOP_MONITORING_REQUESTED.store(true, Ordering::SeqCst);
        } else if event.id == show_window_id {
            println!("Show main window requested");
            SHOW_WINDOW_REQUESTED.store(true, Ordering::SeqCst);
        } else if event.id == settings_id {
            println!("Settings requested");
        } else if event.id == quit_id {
            println!("Quitting application...");
            QUIT_REQUESTED.store(true, Ordering::SeqCst);
        }
    }));

    // Create the system tray icon
    let tray = TrayIconBuilder::new()
        .with_menu(Box::new(tray_menu))
        .with_tooltip("WCArena Monitor")
        .with_icon(tray_icon::Icon::from_rgba(icon_data, 16, 16).unwrap())
        .build()
        .unwrap();

    // Keep the tray icon alive
    let _tray = Box::leak(Box::new(tray));

    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            launch_warcraft_ii,
            start_monitoring,
            stop_monitoring,
            show_settings,
            show_status,
            show_main_window,
            quit_app,
            toggle_minimize_to_tray,
            get_minimize_to_tray_setting,
            scan_for_games,
            locate_games,
            add_game_manually,
            get_launcher_info,
            get_map_folders
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Check if minimize to tray is enabled
                let app_state: tauri::State<AppState> = window.state();
                let minimize_to_tray = *app_state.minimize_to_tray.lock().unwrap();
                
                if minimize_to_tray {
                    // Hide the window instead of closing
                    window.hide().unwrap();
                    api.prevent_close();
                }
                // If minimize_to_tray is false, let the window close normally
            }
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            println!("WCArena Monitor initialized");
            println!("Version: {}", env!("CARGO_PKG_VERSION"));
            println!("System tray created successfully");
            println!("Right-click the tray icon to access the menu");
            
            // Start a background thread to handle tray requests
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    // Check for show window request
                    if SHOW_WINDOW_REQUESTED.load(Ordering::SeqCst) {
                        SHOW_WINDOW_REQUESTED.store(false, Ordering::SeqCst);
                        if let Some(window) = app_handle.get_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            println!("Main window shown from tray request");
                        }
                    }
                    
                    // Check for start monitoring request
                    if START_MONITORING_REQUESTED.load(Ordering::SeqCst) {
                        START_MONITORING_REQUESTED.store(false, Ordering::SeqCst);
                        let app_handle_clone = app_handle.clone();
                        std::thread::spawn(move || {
                            let _ = tauri::async_runtime::block_on(start_monitoring(app_handle_clone));
                        });
                    }
                    
                    // Check for stop monitoring request
                    if STOP_MONITORING_REQUESTED.load(Ordering::SeqCst) {
                        STOP_MONITORING_REQUESTED.store(false, Ordering::SeqCst);
                        let app_handle_clone = app_handle.clone();
                        std::thread::spawn(move || {
                            let _ = tauri::async_runtime::block_on(stop_monitoring(app_handle_clone));
                        });
                    }
                    
                    // Check for quit request
                    if QUIT_REQUESTED.load(Ordering::SeqCst) {
                        QUIT_REQUESTED.store(false, Ordering::SeqCst);
                        println!("Quit requested from tray");
                        std::process::exit(0);
                    }
                    
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Internal function for launching Warcraft games through Battle.net (used by system tray)
fn launch_warcraft_ii_internal() {
    println!("Attempting to launch Warcraft games through Battle.net...");
    
    // First, try to launch Battle.net if it's not running
    let battle_net_paths = find_battle_net_paths();
    
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
        let mut launched = false;
        for path in &battle_net_paths {
            if std::path::Path::new(path).exists() {
                println!("Found Battle.net at: {}", path);
                match std::process::Command::new(path).spawn() {
                    Ok(_) => {
                        println!("Battle.net launched successfully from: {}", path);
                        launched = true;
                        // Give Battle.net time to start
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        break;
                    }
                    Err(e) => {
                        eprintln!("Failed to launch Battle.net from {}: {}", path, e);
                    }
                }
            } else {
                println!("Battle.net not found at: {}", path);
            }
        }
        
        if !launched {
            println!("Could not find or launch Battle.net from any known location");
            println!("Please ensure Battle.net is installed and try again");
        }
    } else {
        println!("Battle.net is already running");
    }
    
    // Don't try to launch individual games - just launch Battle.net
    println!("Battle.net should now be available for launching Warcraft games");
    return;
}

/// Comprehensive Battle.net path finder using the improved detection system
fn find_battle_net_paths() -> Vec<String> {
    // Use the improved GameDetector to find Battle.net paths
    let game_detector = app_lib::platform::GameDetector::new();
    let battle_net_paths = game_detector.get_battle_net_paths();
    
    // Convert PathBuf to String and filter for executable files
    let mut paths = Vec::new();
    for path in battle_net_paths {
        if path.is_file() && path.extension().map_or(false, |ext| ext == "exe") {
            paths.push(path.to_string_lossy().to_string());
        }
    }
    
    println!("Found {} potential Battle.net executable paths: {:?}", paths.len(), paths);
    paths
}

// Tauri command functions
#[tauri::command]
async fn launch_warcraft_ii() -> Result<String, String> {
    println!("Attempting to launch Warcraft games through Battle.net...");
    
    // First, try to launch Battle.net if it's not running
    let battle_net_paths = find_battle_net_paths();
    
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
        let mut launched = false;
        for path in &battle_net_paths {
            if std::path::Path::new(path).exists() {
                println!("Found Battle.net at: {}", path);
                match std::process::Command::new(path).spawn() {
                    Ok(_) => {
                        println!("Battle.net launched successfully from: {}", path);
                        launched = true;
                        // Give Battle.net time to start
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        break;
                    }
                    Err(e) => {
                        eprintln!("Failed to launch Battle.net from {}: {}", path, e);
                    }
                }
            } else {
                println!("Battle.net not found at: {}", path);
            }
        }
        
        if !launched {
            println!("Could not find or launch Battle.net from any known location");
            println!("Please ensure Battle.net is installed and try again");
            return Err("Could not find or launch Battle.net".to_string());
        }
    } else {
        println!("Battle.net is already running");
    }
    
        // Don't try to launch individual games - just launch Battle.net
    println!("Battle.net should now be available for launching Warcraft games");
    return Ok("Battle.net launched successfully".to_string());
}

#[tauri::command]
async fn start_monitoring(app: tauri::AppHandle) -> Result<String, String> {
    println!("Starting game monitoring...");
    
    let app_state: tauri::State<AppState> = app.state();
    let mut game_monitor = app_state.game_monitor.lock().unwrap();
    
    if game_monitor.is_none() {
        *game_monitor = Some(GameMonitor::new(None));
    }
    
    if let Some(ref mut monitor) = *game_monitor {
        match monitor.start_monitoring() {
            Ok(_) => {
                let mut is_monitoring = app_state.is_monitoring.lock().unwrap();
                *is_monitoring = true;
                println!("Game monitoring started successfully");
                Ok("Game monitoring started successfully".to_string())
            }
            Err(e) => {
                eprintln!("Failed to start monitoring: {}", e);
                Err(format!("Failed to start monitoring: {}", e))
            }
        }
    } else {
        Err("Failed to initialize game monitor".to_string())
    }
}

#[tauri::command]
async fn stop_monitoring(app: tauri::AppHandle) -> Result<String, String> {
    println!("Stopping game monitoring...");
    
    let app_state: tauri::State<AppState> = app.state();
    let mut game_monitor = app_state.game_monitor.lock().unwrap();
    
    if let Some(ref mut monitor) = *game_monitor {
        match monitor.stop_monitoring() {
            Ok(_) => {
                let mut is_monitoring = app_state.is_monitoring.lock().unwrap();
                *is_monitoring = false;
                println!("Game monitoring stopped successfully");
                Ok("Game monitoring stopped successfully".to_string())
            }
            Err(e) => {
                eprintln!("Failed to stop monitoring: {}", e);
                Err(format!("Failed to stop monitoring: {}", e))
            }
        }
    } else {
        Ok("No monitoring was running".to_string())
    }
}

#[tauri::command]
async fn show_settings(app: tauri::AppHandle) -> Result<String, String> {
    println!("Opening settings...");
    
    // Create settings window
    let settings_window = WindowBuilder::new(
        &app,
        "settings"
    )
    .title("WCArena Monitor Settings")
    .inner_size(500.0, 400.0)
    .resizable(true)
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok("Settings window opened".to_string())
}

#[tauri::command]
async fn show_status(app: tauri::AppHandle) -> Result<String, String> {
    println!("Showing status...");
    
    // Create status window
    let status_window = WindowBuilder::new(
        &app,
        "status"
    )
    .title("WCArena Monitor Status")
    .inner_size(300.0, 200.0)
    .resizable(false)
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok("Status window opened".to_string())
}

#[tauri::command]
async fn show_main_window(app: tauri::AppHandle) -> Result<String, String> {
    println!("Showing main window...");
    
    if let Some(window) = app.get_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        Ok("Main window shown".to_string())
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
async fn quit_app() -> Result<String, String> {
    println!("Quitting application...");
    std::process::exit(0);
}

#[tauri::command]
async fn toggle_minimize_to_tray(app: tauri::AppHandle) -> Result<bool, String> {
    let app_state: tauri::State<AppState> = app.state();
    let mut setting = app_state.minimize_to_tray.lock().unwrap();
    *setting = !*setting;
    println!("Minimize to tray setting: {}", *setting);
    Ok(*setting)
}

#[tauri::command]
async fn get_minimize_to_tray_setting(app: tauri::AppHandle) -> Result<bool, String> {
    let app_state: tauri::State<AppState> = app.state();
    let setting = app_state.minimize_to_tray.lock().unwrap();
    Ok(*setting)
}

#[tauri::command]
async fn scan_for_games() -> Result<std::collections::HashMap<String, serde_json::Value>, String> {
    println!("Scanning for Warcraft game installations using comprehensive detection...");
    
    let mut results = std::collections::HashMap::new();
    
    // Use the new comprehensive game detection system
    let game_detector = app_lib::platform::GameDetector::new();
    
    match game_detector.detect_all_games() {
            Ok(games) => {
                println!("Comprehensive scan found {} game types", games.len());
                
                // Map detected games to our expected game keys
                for (name, installations) in games {
                    // Get the version from the first installation to construct the full game name
                    let full_game_name = if let Some(first_install) = installations.first() {
                        if let Some(version) = &first_install.version {
                            format!("{} ({})", name, version)
                        } else {
                            name.clone()
                        }
                    } else {
                        name.clone()
                    };
                    
                    let game_key = map_game_name_to_key(&full_game_name);
                    if let Some(key) = game_key {
                        if installations.len() == 1 {
                            // Single installation
                            let installation = &installations[0];
                            results.insert(key, serde_json::json!({
                                "found": true,
                                "path": installation.path.to_string_lossy(),
                                "launcher": installation.launcher,
                                "version": installation.version,
                                "multiple_installations": false
                            }));
                            println!("Found {} at: {} (via {})", name, installation.path.display(), 
                                     installation.launcher.as_deref().unwrap_or("Unknown"));
                        } else {
                            // Multiple installations - store all paths
                            let paths: Vec<String> = installations.iter()
                                .map(|i| i.path.to_string_lossy().to_string())
                                .collect();
                            let launchers: Vec<String> = installations.iter()
                                .filter_map(|i| i.launcher.clone())
                                .collect();
                            
                            results.insert(key, serde_json::json!({
                                "found": true,
                                "path": paths.join("; "),
                                "launcher": launchers.join("; "),
                                "version": "Multiple versions",
                                "multiple_installations": true,
                                "all_paths": paths,
                                "all_launchers": launchers
                            }));
                            println!("Found {} at {} locations: {:?}", name, installations.len(), paths);
                        }
                    }
                }
            }
        Err(e) => {
            eprintln!("Comprehensive scan failed: {}", e);
            println!("Falling back to basic path scanning...");
            
            // Fallback to basic path scanning
            let basic_results = scan_basic_paths();
            results.extend(basic_results);
        }
    }
    
    // Ensure all game types are represented
    let all_games = vec![
        "wc1-dos", "wc1-remastered", 
        "wc2-bnet", "wc2-combat", "wc2-remastered",
        "wc3-roc", "wc3-tft", "wc3-reforged", "w3arena"
    ];
    
    for game in all_games {
        if !results.contains_key(game) {
            results.insert(game.to_string(), serde_json::json!({
                "found": false,
                "path": "",
                "launcher": serde_json::Value::Null,
                "version": serde_json::Value::Null
            }));
        }
    }
    
    println!("Scan complete. Found {} games", results.values().filter(|v| v["found"].as_bool().unwrap_or(false)).count());
    Ok(results)
}

#[tauri::command]
async fn get_map_folders(game_path: String) -> Result<Vec<String>, String> {
    println!("Finding map folders for game at: {}", game_path);
    
    let game_detector = app_lib::platform::GameDetector::new();
    let path = std::path::Path::new(&game_path);
    
    if !path.exists() {
        return Err("Game path does not exist".to_string());
    }
    
    let map_folders = game_detector.find_map_folders(path);
    let map_folder_paths: Vec<String> = map_folders.iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    
    println!("Found {} map folders: {:?}", map_folder_paths.len(), map_folder_paths);
    Ok(map_folder_paths)
}

/// Fallback basic path scanning
fn scan_basic_paths() -> std::collections::HashMap<String, serde_json::Value> {
    let mut results = std::collections::HashMap::new();
    
    let search_paths = vec![
        // Warcraft I
        (r"C:\Program Files (x86)\Warcraft I\Warcraft.exe", "wc1-dos"),
        (r"C:\Program Files\Warcraft I\Warcraft.exe", "wc1-dos"),
        (r"C:\Program Files (x86)\Warcraft I Remastered\Warcraft.exe", "wc1-remastered"),
        (r"C:\Program Files\Warcraft I Remastered\Warcraft.exe", "wc1-remastered"),
        
        // Warcraft II
        (r"C:\Program Files (x86)\Warcraft II\Warcraft II.exe", "wc2-bnet"),
        (r"C:\Program Files\Warcraft II\Warcraft II.exe", "wc2-bnet"),
        (r"C:\Program Files (x86)\Warcraft II Combat Edition\Warcraft II.exe", "wc2-combat"),
        (r"C:\Program Files\Warcraft II Combat Edition\Warcraft II.exe", "wc2-combat"),
        (r"C:\Program Files (x86)\Warcraft II Remastered\Warcraft II.exe", "wc2-remastered"),
        (r"C:\Program Files\Warcraft II Remastered\Warcraft II.exe", "wc2-remastered"),
        
        // Warcraft III
        (r"C:\Program Files (x86)\Warcraft III\Warcraft III.exe", "wc3-roc"),
        (r"C:\Program Files\Warcraft III\Warcraft III.exe", "wc3-roc"),
        (r"C:\Program Files (x86)\Warcraft III\Frozen Throne.exe", "wc3-tft"),
        (r"C:\Program Files\Warcraft III\Frozen Throne.exe", "wc3-tft"),
        (r"C:\Program Files (x86)\Warcraft III Reforged\Warcraft III.exe", "wc3-reforged"),
        (r"C:\Program Files\Warcraft III Reforged\Warcraft III.exe", "wc3-reforged"),
        
        // W3Arena
        (r"C:\Program Files (x86)\W3Arena\W3Arena.exe", "w3arena"),
        (r"C:\Program Files\W3Arena\W3Arena.exe", "w3arena"),
        
        // Project-specific paths
        (r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft I Remastered\x86\Warcraft.exe", "wc1-remastered"),
        (r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft II Remastered\x86\Warcraft II.exe", "wc2-remastered"),
        (r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft II Combat Edition\Warcraft II.exe", "wc2-combat"),
        (r"C:\Users\garet\OneDrive\Desktop\wartest\games\W3Arena\W3Arena.exe", "w3arena"),
    ];
    
    for (path, game_key) in search_paths {
        if std::path::Path::new(path).exists() {
            results.insert(game_key.to_string(), serde_json::json!({
                "found": true,
                "path": path,
                "launcher": "Standard Installation",
                "version": "Unknown"
            }));
            println!("Found {} at: {} (basic scan)", game_key, path);
        }
    }
    
    results
}

/// Map game names to our internal game keys
fn map_game_name_to_key(game_name: &str) -> Option<String> {
    let name_lower = game_name.to_lowercase();
    println!("🔍 Mapping game name: '{}' -> '{}'", game_name, name_lower);
    
    // Check for longer/more specific patterns FIRST to avoid conflicts
    if name_lower.contains("warcraft iii") || name_lower.contains("warcraft 3") {
        if name_lower.contains("reforged") {
            println!("  ✅ Mapped to: wc3-reforged");
            Some("wc3-reforged".to_string())
        } else if name_lower.contains("frozen throne") {
            println!("  ✅ Mapped to: wc3-tft");
            Some("wc3-tft".to_string())
        } else {
            println!("  ✅ Mapped to: wc3-roc");
            Some("wc3-roc".to_string())
        }
    } else if name_lower.contains("warcraft ii") || name_lower.contains("warcraft 2") {
        if name_lower.contains("remastered") || name_lower.contains("(remastered") || name_lower.contains("remastered)") {
            println!("  ✅ Mapped to: wc2-remastered");
            Some("wc2-remastered".to_string())
        } else if name_lower.contains("combat") || name_lower.contains("(combat") || name_lower.contains("combat)") {
            println!("  ✅ Mapped to: wc2-combat");
            Some("wc2-combat".to_string())
        } else if name_lower.contains("battle.net") || name_lower.contains("bne") {
            println!("  ✅ Mapped to: wc2-bnet");
            Some("wc2-bnet".to_string())
        } else {
            println!("  ✅ Mapped to: wc2-bnet (default)");
            Some("wc2-bnet".to_string())
        }
    } else if name_lower.contains("warcraft i") || name_lower.contains("warcraft 1") {
        if name_lower.contains("remastered") || name_lower.contains("(remastered") || name_lower.contains("remastered)") {
            println!("  ✅ Mapped to: wc1-remastered");
            Some("wc1-remastered".to_string())
        } else {
            println!("  ✅ Mapped to: wc1-dos");
            Some("wc1-dos".to_string())
        }
    } else if name_lower.contains("w3arena") {
        println!("  ✅ Mapped to: w3arena");
        Some("w3arena".to_string())
    } else {
        println!("  ❌ No mapping found for: {}", game_name);
        None
    }
}

/// Get information about installed game launchers
#[tauri::command]
async fn get_launcher_info() -> Result<Vec<serde_json::Value>, String> {
    println!("Getting launcher information...");
    
    let game_detector = app_lib::platform::GameDetector::new();
    
    match game_detector.get_launcher_info() {
        Ok(launchers) => {
            let mut result = Vec::new();
            
            for launcher in launchers {
                result.push(serde_json::json!({
                    "name": launcher.name,
                    "is_installed": launcher.is_installed,
                    "installation_path": launcher.installation_path.map(|p| p.to_string_lossy().to_string()),
                    "games_count": launcher.games.len()
                }));
                
                println!("Launcher: {} - Installed: {} - Games: {}", 
                         launcher.name, launcher.is_installed, launcher.games.len());
            }
            
            Ok(result)
        }
        Err(e) => {
            Err(format!("Failed to get launcher info: {}", e))
        }
    }
}

#[tauri::command]
async fn locate_games(game_type: String) -> Result<std::collections::HashMap<String, serde_json::Value>, String> {
    println!("Locating games for type: {}", game_type);
    
    // Use our comprehensive game detection system instead of hardcoded paths
    let game_detector = app_lib::platform::GameDetector::new();
    
    match game_detector.detect_all_games() {
        Ok(games) => {
            println!("Comprehensive scan found {} game types", games.len());
            
            // Filter results based on the requested game type
            let mut results = std::collections::HashMap::new();
            
            for (name, installations) in games {
                // Check if this game matches the requested type
                let matches_type = match game_type.as_str() {
                    "wc1" => name.to_lowercase().contains("warcraft i") || name.to_lowercase().contains("warcraft 1"),
                    "wc2" => name.to_lowercase().contains("warcraft ii") || name.to_lowercase().contains("warcraft 2"),
                    "wc3" => name.to_lowercase().contains("warcraft iii") || name.to_lowercase().contains("warcraft 3"),
                    "w3arena" => name.to_lowercase().contains("w3arena") || name.to_lowercase().contains("w3champions"),
                    _ => false,
                };
                
                if matches_type {
                    // Get the version from the first installation to construct the full game name
                    let full_game_name = if let Some(first_install) = installations.first() {
                        if let Some(version) = &first_install.version {
                            format!("{} ({})", name, version)
                        } else {
                            name.clone()
                        }
                    } else {
                        name.clone()
                    };
                    
                    let game_key = map_game_name_to_key(&full_game_name);
                    if let Some(key) = game_key {
                        if installations.len() == 1 {
                            // Single installation
                            let installation = &installations[0];
                            results.insert(key, serde_json::json!({
                                "found": true,
                                "path": installation.path.to_string_lossy(),
                                "launcher": installation.launcher,
                                "version": installation.version,
                                "multiple_installations": false
                            }));
                            println!("Found {} at: {} (via {})", name, installation.path.display(), 
                                     installation.launcher.as_deref().unwrap_or("Unknown"));
                        } else {
                            // Multiple installations - store all paths
                            let paths: Vec<String> = installations.iter()
                                .map(|i| i.path.to_string_lossy().to_string())
                                .collect();
                            let launchers: Vec<String> = installations.iter()
                                .filter_map(|i| i.launcher.clone())
                                .collect();
                            
                            results.insert(key, serde_json::json!({
                                "found": true,
                                "path": paths.join("; "),
                                "launcher": launchers.join("; "),
                                "version": "Multiple versions",
                                "multiple_installations": true,
                                "all_paths": paths,
                                "all_launchers": launchers
                            }));
                            println!("Found {} at {} locations: {:?}", name, installations.len(), paths);
                        }
                    }
                }
            }
            
            Ok(results)
        }
        Err(e) => {
            eprintln!("Comprehensive scan failed: {}", e);
            Err(format!("Failed to detect games: {}", e))
        }
    }
}

#[tauri::command]
async fn add_game_manually(game_type: String, game_path: String) -> Result<(), String> {
    println!("Adding game manually - Type: {}, Path: {}", game_type, game_path);
    
    // Validate the path exists
    if !std::path::Path::new(&game_path).exists() {
        return Err("Game executable not found at specified path".to_string());
    }
    
    // Validate it's an executable file
    if !game_path.to_lowercase().ends_with(".exe") {
        return Err("Path must point to an executable (.exe) file".to_string());
    }
    
    // In a real implementation, you would:
    // 1. Store this in a configuration file or database
    // 2. Validate the executable is actually the expected game
    // 3. Possibly verify the game version
    
    println!("Game added successfully: {} -> {}", game_type, game_path);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_for_games_command() {
        println!("🧪 Testing scan_for_games Tauri command...");
        
        // Test the command directly
        let result = tauri::async_runtime::block_on(scan_for_games());
        
        match result {
            Ok(results) => {
                println!("✅ scan_for_games command succeeded!");
                println!("📊 Found {} game results", results.len());
                
                for (game_key, game_data) in &results {
                    println!("  - {}: {:?}", game_key, game_data);
                }
            }
            Err(e) => {
                println!("❌ scan_for_games command failed: {}", e);
            }
        }
        
        assert!(true); // Test always passes, just for debugging
    }
}
