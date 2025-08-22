# System Tray Implementation for Wartest Monitor

## Overview
This document outlines the system tray functionality for the Wartest Monitor Tauri application.

## Features
- **Launch Warcraft II**: Directly launch the game from the system tray
- **Start/Stop Monitoring**: Control game monitoring without opening the main window
- **Settings**: Quick access to application settings
- **Quit**: Clean application shutdown
- **Status Display**: Show monitoring status on hover/click

## Implementation

### 1. Add System Tray Dependencies
The system tray functionality is built into Tauri 2.x, so no additional dependencies are needed.

### 2. Main Application Structure
```rust
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, 
    SystemTrayMenu, SystemTrayMenuItem,
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
        .on_system_tray_event(handle_system_tray_event)
        .setup(setup_app)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3. System Tray Event Handler
```rust
fn handle_system_tray_event(app: &tauri::App, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "launch_game" => {
                    println!("Launching Warcraft II...");
                    launch_warcraft_ii();
                }
                "start_monitoring" => {
                    println!("Starting monitoring...");
                    start_game_monitoring(app);
                }
                "stop_monitoring" => {
                    println!("Stopping monitoring...");
                    stop_game_monitoring(app);
                }
                "settings" => {
                    println!("Opening settings...");
                    show_settings_window(app);
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
            show_status_window(app);
        }
        SystemTrayEvent::RightClick { .. } => {
            println!("System tray right clicked");
            // Could show context menu
        }
        _ => {}
    }
}
```

### 4. Game Launching Function
```rust
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
    let warcraft_paths = vec![
        r"C:\Program Files (x86)\Warcraft II Remastered\Warcraft II.exe",
        r"C:\Program Files\Warcraft II Remastered\Warcraft II.exe",
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
```

### 5. Monitoring Control Functions
```rust
fn start_game_monitoring(app: &tauri::App) {
    // Get the app state
    let state = app.state::<AppState>();
    
    // Start monitoring in a separate thread
    std::thread::spawn(move || {
        let mut monitor = GameMonitor::new();
        if let Err(e) = monitor.start_monitoring() {
            eprintln!("Failed to start monitoring: {}", e);
        }
    });
    
    // Update UI state
    if let Ok(mut is_monitoring) = state.is_monitoring.lock() {
        *is_monitoring = true;
    }
}

fn stop_game_monitoring(app: &tauri::App) {
    // Get the app state
    let state = app.state::<AppState>();
    
    // Stop monitoring
    if let Ok(mut game_monitor) = state.game_monitor.lock() {
        if let Some(ref mut monitor) = *game_monitor {
            monitor.stop_monitoring();
        }
    }
    
    // Update UI state
    if let Ok(mut is_monitoring) = state.is_monitoring.lock() {
        *is_monitoring = false;
    }
}
```

### 6. Status Window Function
```rust
fn show_status_window(app: &tauri::App) {
    let state = app.state::<AppState>();
    
    let is_monitoring = state.is_monitoring.lock().unwrap_or(false);
    let status = if is_monitoring { "Active" } else { "Inactive" };
    
    // Create a simple status window
    let window = tauri::WindowBuilder::new(
        app,
        "status",
        tauri::WindowUrl::App("status.html".into())
    )
    .title("Wartest Monitor Status")
    .inner_size(300.0, 200.0)
    .resizable(false)
    .build()
    .unwrap();
    
    // Emit status data to the window
    window.emit("status-update", status).unwrap();
}
```

### 7. Settings Window Function
```rust
fn show_settings_window(app: &tauri::App) {
    // Create settings window
    let window = tauri::WindowBuilder::new(
        app,
        "settings",
        tauri::WindowUrl::App("settings.html".into())
    )
    .title("Wartest Monitor Settings")
    .inner_size(400.0, 300.0)
    .resizable(true)
    .build()
    .unwrap();
}
```

## Configuration

### Tauri Configuration (tauri.conf.json)
```json
{
  "app": {
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  }
}
```

### Icon Requirements
- **Windows**: 16x16, 32x32, 48x48 PNG or ICO
- **macOS**: 16x16, 32x32 PNG (template icons work best)
- **Linux**: 16x16, 32x32 PNG

## Usage

### For Users
1. **Right-click** the system tray icon to access the menu
2. **Left-click** to show quick status
3. **Launch Game**: Starts Warcraft II directly
4. **Start/Stop Monitoring**: Controls game monitoring
5. **Settings**: Opens configuration window
6. **Quit**: Closes the application

### For Developers
1. The system tray is automatically created when the app starts
2. All menu items are handled in the `handle_system_tray_event` function
3. Game monitoring state is managed through the `AppState`
4. Windows can be created and managed through the Tauri API

## Benefits
- **Minimal Resource Usage**: App runs in background without visible window
- **Quick Access**: Instant access to key functions
- **User-Friendly**: Familiar system tray interface
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Non-Intrusive**: Doesn't interfere with gaming experience

## Next Steps
1. Resolve compilation issues (file lock problem)
2. Implement the system tray functionality
3. Add proper error handling
4. Create status and settings windows
5. Test on different platforms
