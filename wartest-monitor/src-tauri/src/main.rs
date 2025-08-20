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
    let launch_game = MenuItem::new("🚀 Launch Warcraft II", true, None);
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
            println!("Launching Warcraft II...");
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
            get_minimize_to_tray_setting
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

// Internal function for launching Warcraft II (used by system tray)
fn launch_warcraft_ii_internal() {
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
    
    println!("Warcraft II not found in common locations");
}

// Tauri command functions
#[tauri::command]
async fn launch_warcraft_ii() -> Result<String, String> {
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
                    return Ok("Warcraft II launch command sent successfully".to_string());
                }
                Err(e) => {
                    eprintln!("Failed to launch Warcraft II: {}", e);
                }
            }
        }
    }
    
    Err("Warcraft II not found in common locations".to_string())
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
