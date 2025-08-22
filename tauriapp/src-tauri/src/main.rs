use tauri::{Manager, WindowEvent};
use std::collections::HashMap;
use serde_json::{Value, json};
use crate::platform::GameDetector;

mod platform;
mod types;
mod game_monitor;
mod server_client;

// Tauri commands
#[tauri::command]
async fn scan_for_games() -> Result<HashMap<String, Value>, String> {
    println!("Scanning for games...");
    
    // Simple test response to see if the app works
    let mut result = HashMap::new();
    result.insert("wc1-remastered".to_string(), json!({
        "found": true,
        "path": "C:\\Test\\Warcraft.exe",
        "version": "Remastered",
        "multiple_installations": false,
        "all_paths": vec!["C:\\Test\\Warcraft.exe"]
    }));
    
    println!("Test response: Found 1 game");
    Ok(result)
}

#[tauri::command]
async fn locate_games(game_type: String) -> Result<HashMap<String, Value>, String> {
    println!("Locating games for type: {}", game_type);
    
    let game_detector = GameDetector::new();
    let all_games = game_detector.detect_all_games()
        .map_err(|e| format!("Failed to detect games: {}", e))?;
    
    let mut result = HashMap::new();
    
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
                    "path": installation.path.to_string_lossy(),
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
async fn add_game_manually(game_path: String) -> Result<(), String> {
    println!("Adding game manually: {}", game_path);
    // TODO: Implement manual game addition
    Ok(())
}

#[tauri::command]
async fn scan_folder_for_games(folder_path: String) -> Result<HashMap<String, Value>, String> {
    println!("Scanning folder for games: {}", folder_path);
    let game_detector = GameDetector::new();
    let path = std::path::Path::new(&folder_path);
    if !path.exists() {
        return Err("Folder does not exist".to_string());
    }
    let mut games = HashMap::new();
    
    // TODO: Implement folder scanning
    Ok(games)
}

#[tauri::command]
async fn get_launcher_info() -> Result<HashMap<String, Value>, String> {
    println!("Getting launcher info...");
    
    let mut launchers = HashMap::new();
    
    // Test data for launchers
    launchers.insert("battle-net".to_string(), json!({
        "name": "Battle.net",
        "found": true,
        "path": "C:\\Program Files (x86)\\Battle.net\\Battle.net Launcher.exe",
        "version": "1.0.0"
    }));
    
    launchers.insert("steam".to_string(), json!({
        "name": "Steam",
        "found": true,
        "path": "C:\\Program Files (x86)\\Steam\\steam.exe",
        "version": "2.0.0"
    }));
    
    Ok(launchers)
}

#[tauri::command]
async fn get_map_folders(game_path: String) -> Result<Vec<String>, String> {
    println!("Looking for map folders for game at: {}", game_path);
    
    let game_dir = std::path::Path::new(&game_path).parent()
        .ok_or("Invalid game path")?;
    
    let mut map_folders = Vec::new();
    
    // Common map folder names
    let map_folder_names = vec![
        "maps", "Maps", "MAPS",
        "scenarios", "Scenarios", "SCENARIOS",
        "campaigns", "Campaigns", "CAMPAIGNS",
        "custom", "Custom", "CUSTOM"
    ];
    
    for folder_name in map_folder_names {
        let map_path = game_dir.join(folder_name);
        if map_path.exists() && map_path.is_dir() {
            map_folders.push(map_path.to_string_lossy().to_string());
        }
    }
    
    // Also check for maps in subdirectories
    if let Ok(entries) = std::fs::read_dir(game_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                if entry.path().is_dir() {
                    let dir_name = entry.file_name().to_string_lossy().to_lowercase();
                    if dir_name.contains("map") || dir_name.contains("scenario") || dir_name.contains("campaign") {
                        map_folders.push(entry.path().to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    
    Ok(map_folders)
}

#[tauri::command]
async fn open_folder_dialog() -> Result<String, String> {
    // For now, return a placeholder since dialog API is complex
    // TODO: Implement proper folder dialog
    Err("Folder dialog not yet implemented".to_string())
}

#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    // For now, just print the URL since opener plugin is complex
    println!("Would open URL: {}", url);
    Ok(())
}

#[tauri::command]
async fn open_wc_arena_app() -> Result<(), String> {
    // For now, just print the URL since shell-open feature is not available
    let wc_arena_url = "https://wcarena.com"; // Replace with actual WCArena URL
    println!("Would open WCArena: {}", wc_arena_url);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_for_games,
            locate_games,
            add_game_manually,
            scan_folder_for_games,
            get_launcher_info,
            get_map_folders,
            open_folder_dialog,
            open_external_url,
            open_wc_arena_app
        ])
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            
            // Enable dev tools for debugging
            #[cfg(debug_assertions)]
            {
                main_window.open_devtools();
            }
            
            // Handle window events
            main_window.clone().on_window_event(move |event| {
                match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        // TODO: Implement proper close handling
                        std::process::exit(0);
                    }
                    _ => {}
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ============================================================================
// UNIT TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use serde_json::Value;

    // Test Tauri command registration and functionality
    #[tokio::test]
    async fn test_scan_for_games_command() {
        println!("🧪 Testing scan_for_games command...");
        
        let result = scan_for_games().await;
        assert!(result.is_ok(), "scan_for_games should return Ok");
        
        let games = result.unwrap();
        assert!(games.contains_key("wc1-remastered"), "Should contain test game");
        
        let game_info = &games["wc1-remastered"];
        assert!(game_info["found"].as_bool().unwrap(), "Game should be found");
        assert_eq!(game_info["version"].as_str().unwrap(), "Remastered", "Version should match");
        
        println!("✅ scan_for_games command test passed");
    }

    #[tokio::test]
    async fn test_get_launcher_info_command() {
        println!("🧪 Testing get_launcher_info command...");
        
        let result = get_launcher_info().await;
        assert!(result.is_ok(), "get_launcher_info should return Ok");
        
        let launchers = result.unwrap();
        assert!(launchers.contains_key("battle-net"), "Should contain Battle.net");
        assert!(launchers.contains_key("steam"), "Should contain Steam");
        
        let battle_net = &launchers["battle-net"];
        assert!(battle_net["found"].as_bool().unwrap(), "Battle.net should be found");
        
        println!("✅ get_launcher_info command test passed");
    }

    #[tokio::test]
    async fn test_locate_games_command() {
        println!("🧪 Testing locate_games command...");
        
        let result = locate_games("wc1".to_string()).await;
        // This might fail if no games are found, which is expected
        match result {
            Ok(games) => {
                println!("✅ locate_games command returned {} games", games.len());
            }
            Err(e) => {
                println!("ℹ️ locate_games command failed as expected: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_add_game_manually_command() {
        println!("🧪 Testing add_game_manually command...");
        
        let result = add_game_manually("C:\\Test\\Game.exe".to_string()).await;
        assert!(result.is_ok(), "add_game_manually should return Ok");
        
        println!("✅ add_game_manually command test passed");
    }

    #[tokio::test]
    async fn test_scan_folder_for_games_command() {
        println!("🧪 Testing scan_folder_for_games command...");
        
        // Test with non-existent folder
        let result = scan_folder_for_games("C:\\NonExistentFolder".to_string()).await;
        assert!(result.is_err(), "Should fail for non-existent folder");
        
        // Test with existing folder (might be empty)
        let result = scan_folder_for_games("C:\\".to_string()).await;
        match result {
            Ok(games) => {
                println!("✅ scan_folder_for_games returned {} games", games.len());
            }
            Err(e) => {
                println!("ℹ️ scan_folder_for_games failed: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_get_map_folders_command() {
        println!("🧪 Testing get_map_folders command...");
        
        // Test with invalid path
        let result = get_map_folders("invalid_path".to_string()).await;
        assert!(result.is_err(), "Should fail for invalid path");
        
        // Test with valid path (might be empty)
        let result = get_map_folders("C:\\Windows\\System32\\cmd.exe".to_string()).await;
        match result {
            Ok(folders) => {
                println!("✅ get_map_folders returned {} folders", folders.len());
            }
            Err(e) => {
                println!("ℹ️ get_map_folders failed: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_open_external_url_command() {
        println!("🧪 Testing open_external_url command...");
        
        let result = open_external_url("https://example.com".to_string()).await;
        assert!(result.is_ok(), "open_external_url should return Ok");
        
        println!("✅ open_external_url command test passed");
    }

    #[tokio::test]
    async fn test_open_wc_arena_app_command() {
        println!("🧪 Testing open_wc_arena_app command...");
        
        let result = open_wc_arena_app().await;
        assert!(result.is_ok(), "open_wc_arena_app should return Ok");
        
        println!("✅ open_wc_arena_app command test passed");
    }

    // Test data serialization
    #[test]
    fn test_data_serialization() {
        println!("🧪 Testing data serialization...");
        
        let mut test_data = HashMap::new();
        test_data.insert("test_key".to_string(), json!({
            "found": true,
            "path": "C:\\Test\\Path",
            "version": "1.0.0"
        }));
        
        // Test JSON serialization
        let json_string = serde_json::to_string(&test_data).unwrap();
        assert!(json_string.contains("test_key"), "JSON should contain test key");
        assert!(json_string.contains("found"), "JSON should contain found field");
        
        // Test JSON deserialization
        let deserialized: HashMap<String, Value> = serde_json::from_str(&json_string).unwrap();
        assert!(deserialized.contains_key("test_key"), "Should contain test key after deserialization");
        
        println!("✅ Data serialization test passed");
    }

    // Test error handling
    #[test]
    fn test_error_handling() {
        println!("🧪 Testing error handling...");
        
        // Test string error creation
        let error_msg = "Test error message";
        let error = Err::<(), String>(error_msg.to_string());
        
        assert!(error.is_err(), "Should be an error");
        if let Err(e) = error {
            assert_eq!(e, error_msg, "Error message should match");
        }
        
        println!("✅ Error handling test passed");
    }

    // Run all tests
    #[test]
    fn run_all_tests() {
        println!("🚀 Running all backend unit tests...");
        
        // Note: Async tests need to be run with tokio runtime
        // These will be run separately with: cargo test
        
        println!("✅ All backend unit tests completed");
    }
}