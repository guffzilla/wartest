use tauri::{Manager, WindowEvent};
use std::collections::HashMap;
use serde_json::Value;
use crate::platform::GameDetector;
use crate::types::GameInstallation;

mod platform;
mod types;
mod game_monitor;
mod server_client;

// Tauri commands
#[tauri::command]
async fn scan_for_games() -> Result<HashMap<String, Value>, String> {
    println!("Scanning for games...");
    
    let game_detector = GameDetector::new();
    let all_games = game_detector.detect_all_games()
        .map_err(|e| format!("Failed to detect games: {}", e))?;
    
    let mut result = HashMap::new();
    
    // all_games is a HashMap<String, Vec<GameInstallation>>
    for (_game_name, installations) in all_games {
        for installation in installations {
            let game_key = match installation.version.as_deref() {
                Some("Remastered") => {
                    if installation.path.to_string_lossy().contains("Warcraft I") {
                        "wc1-remastered"
                    } else if installation.path.to_string_lossy().contains("Warcraft II") {
                        "wc2-remastered"
                    } else {
                        continue;
                    }
                },
                Some("Combat Edition") => "wc2-combat",
                Some("Battle.net Edition") => "wc2-bnet",
                Some("Reign of Chaos") => "wc3-roc",
                Some("The Frozen Throne") => "wc3-tft",
                Some("Reforged") => "wc3-reforged",
                Some("W3Arena") => "w3arena",
                _ => {
                    // Check for DOS versions
                    if installation.path.to_string_lossy().contains("Warcraft I") && 
                       !installation.path.to_string_lossy().contains("Remastered") {
                        "wc1-dos"
                    } else if installation.path.to_string_lossy().contains("Warcraft II") && 
                              !installation.path.to_string_lossy().contains("Remastered") {
                        "wc2-dos"
                    } else {
                        continue;
                    }
                }
            };
            
            let game_info = serde_json::json!({
                "found": true,
                "path": installation.path.to_string_lossy(),
                "launcher": installation.launcher.unwrap_or_else(|| "Unknown".to_string()),
                "version": installation.version.unwrap_or_else(|| "Unknown".to_string()),
                "multiple_installations": false
            });
            
            result.insert(game_key.to_string(), game_info);
        }
    }
    
    println!("Found {} games", result.len());
    Ok(result)
}

#[tauri::command]
async fn locate_games(game_type: String) -> Result<HashMap<String, Value>, String> {
    println!("Locating games for type: {}", game_type);
    
    let game_detector = GameDetector::new();
    let all_games = game_detector.detect_all_games()
        .map_err(|e| format!("Failed to detect games: {}", e))?;
    
    let mut result = HashMap::new();
    
    // Filter games by the requested type
    for (_game_name, installations) in all_games {
        for installation in installations {
            let path_str = installation.path.to_string_lossy();
            let matches_type = match game_type.as_str() {
                "wc1" => path_str.contains("Warcraft I"),
                "wc2" => path_str.contains("Warcraft II"),
                "wc3" => path_str.contains("Warcraft III"),
                _ => false
            };
            
            if matches_type {
                let game_key = if path_str.contains("Remastered") {
                    if path_str.contains("Warcraft I") { "wc1-remastered" } else { "wc2-remastered" }
                } else if path_str.contains("Combat Edition") {
                    "wc2-combat"
                } else if path_str.contains("Battle.net Edition") {
                    "wc2-bnet"
                } else if path_str.contains("Reign of Chaos") {
                    "wc3-roc"
                } else if path_str.contains("The Frozen Throne") {
                    "wc3-tft"
                } else if path_str.contains("Reforged") {
                    "wc3-reforged"
                } else if path_str.contains("W3Arena") {
                    "w3arena"
                } else {
                    if path_str.contains("Warcraft I") { "wc1-dos" } else { "wc2-dos" }
                };
                
                let game_info = serde_json::json!({
                    "found": true,
                    "path": path_str,
                    "launcher": installation.launcher.unwrap_or_else(|| "Unknown".to_string()),
                    "version": installation.version.unwrap_or_else(|| "Unknown".to_string()),
                    "multiple_installations": false
                });
                
                result.insert(game_key.to_string(), game_info);
            }
        }
    }
    
    Ok(result)
}

#[tauri::command]
async fn get_launcher_info() -> Result<Vec<Value>, String> {
    println!("Getting launcher information...");
    
    let mut launchers = Vec::new();
    
    // Check for Battle.net
    let battle_net_path = std::env::var("LOCALAPPDATA")
        .map(|appdata| format!("{}\\Battle.net", appdata))
        .unwrap_or_else(|_| "C:\\Users\\garet\\AppData\\Local\\Battle.net".to_string());
    
    if std::path::Path::new(&battle_net_path).exists() {
        launchers.push(serde_json::json!({
            "name": "Battle.net",
            "is_installed": true,
            "installation_path": battle_net_path,
            "games_count": 3
        }));
    } else {
        launchers.push(serde_json::json!({
            "name": "Battle.net",
            "is_installed": false,
            "installation_path": null,
            "games_count": 0
        }));
    }
    
    // Check for GOG Galaxy
    let gog_path = "C:\\Program Files (x86)\\GOG Galaxy\\GalaxyClient.exe";
    if std::path::Path::new(gog_path).exists() {
        launchers.push(serde_json::json!({
            "name": "GOG Galaxy",
            "is_installed": true,
            "installation_path": gog_path,
            "games_count": 0
        }));
    } else {
        launchers.push(serde_json::json!({
            "name": "GOG Galaxy",
            "is_installed": false,
            "installation_path": null,
            "games_count": 0
        }));
    }
    
    // Check for Microsoft Game Pass
    let xbox_path = "C:\\Program Files\\WindowsApps\\Microsoft.GamingServices_*\\GamingServices.exe";
    if std::path::Path::new("C:\\Program Files\\WindowsApps").exists() {
        launchers.push(serde_json::json!({
            "name": "Microsoft Game Pass",
            "is_installed": true,
            "installation_path": "C:\\Program Files\\WindowsApps",
            "games_count": 0
        }));
    } else {
        launchers.push(serde_json::json!({
            "name": "Microsoft Game Pass",
            "is_installed": false,
            "installation_path": null,
            "games_count": 0
        }));
    }
    
    Ok(launchers)
}

#[tauri::command]
async fn get_map_folders(game_path: String) -> Result<Vec<String>, String> {
    println!("Getting map folders for: {}", game_path);
    
    let game_detector = GameDetector::new();
    let path = std::path::Path::new(&game_path);
    
    if !path.exists() {
        return Err("Game path does not exist".to_string());
    }
    
    // Extract game type from path
    let path_str = path.to_string_lossy();
    let game_type = if path_str.contains("Warcraft I") {
        if path_str.contains("Remastered") { "wc1-remastered" } else { "wc1-dos" }
    } else if path_str.contains("Warcraft II") {
        if path_str.contains("Remastered") { "wc2-remastered" } else { "wc2-dos" }
    } else if path_str.contains("Warcraft III") {
        "wc3"
    } else {
        return Err("Unknown game type".to_string());
    };
    
    let map_folders = game_detector.find_map_folders(path, game_type)
        .map_err(|e| format!("Failed to find map folders: {}", e))?;
    
    let map_paths: Vec<String> = map_folders.iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    
    Ok(map_paths)
}

#[tauri::command]
async fn add_game_manually() -> Result<String, String> {
    Ok("Manual game addition not implemented yet".to_string())
}

#[tauri::command]
async fn open_folder_dialog() -> Result<Vec<String>, String> {
    // TODO: Implement folder dialog when Tauri features are available
    Err("Folder dialog not yet implemented".to_string())
}

#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    // TODO: Implement external URL opening when Tauri features are available
    println!("Would open URL: {}", url);
    Ok(())
}

#[tauri::command]
async fn open_wc_arena_app() -> Result<(), String> {
    // TODO: Implement WCArena app opening
    println!("Would open WCArena app");
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_for_games,
            locate_games,
            add_game_manually,
            get_launcher_info,
            get_map_folders,
            open_folder_dialog,
            open_external_url,
            open_wc_arena_app
        ])
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            
            // Handle window events
            main_window.clone().on_window_event(move |event| {
                match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        main_window.hide().unwrap();
                    }
                    _ => {}
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}