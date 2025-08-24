// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use sysinfo::System;
use std::path::Path;
use std::fs;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameInfo {
    pub name: String,
    pub path: String,
    pub version: String,
    pub game_type: GameType,
    pub is_running: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum GameType {
    WC1,
    WC2,
    WC3,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub games: Vec<GameInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunningGame {
    pub name: String,
    pub process_id: u32,
    pub game_type: GameType,
}

// Game detection patterns and common installation paths
const WC1_PATTERNS: &[&str] = &["warcraft.exe", "war.exe", "wc1.exe"];
const WC2_PATTERNS: &[&str] = &["warcraft2.exe", "war2.exe", "wc2.exe"];
const WC3_PATTERNS: &[&str] = &["warcraft3.exe", "war3.exe", "wc3.exe", "frozen throne.exe"];

// Common installation directories
const COMMON_PATHS: &[&str] = &[
    "C:\\Program Files (x86)\\Warcraft*",
    "C:\\Program Files\\Warcraft*",
    "C:\\Games\\Warcraft*",
    "C:\\Warcraft*",
    "D:\\Games\\Warcraft*",
    "D:\\Warcraft*",
];

/// Scan for installed Warcraft games
fn scan_installed_games() -> Vec<GameInfo> {
    let mut games = Vec::new();
    
    // Scan common installation paths
    for base_path in COMMON_PATHS {
        if let Ok(paths) = glob::glob(base_path) {
            for entry in paths.filter_map(Result::ok) {
                if let Some(game_info) = detect_game_in_directory(&entry) {
                    games.push(game_info);
                }
            }
        }
    }
    
    // Also scan current games directory if it exists
    if let Ok(games_dir) = std::env::current_dir().map(|p| p.join("games")) {
        if games_dir.exists() {
            if let Ok(entries) = fs::read_dir(games_dir) {
                for entry in entries.filter_map(Result::ok) {
                    if let Some(game_info) = detect_game_in_directory(&entry.path()) {
                        games.push(game_info);
                    }
                }
            }
        }
    }
    
    games
}

/// Detect if a directory contains a Warcraft game
fn detect_game_in_directory(dir_path: &Path) -> Option<GameInfo> {
    if !dir_path.is_dir() {
        return None;
    }
    
    // Check for executable files
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file() {
                if let Some(extension) = path.extension() {
                    if extension == "exe" {
                        if let Some(file_name) = path.file_name() {
                            let file_name_str = file_name.to_string_lossy().to_lowercase();
                            
                            // Check WC1 patterns
                            if WC1_PATTERNS.iter().any(|pattern| file_name_str.contains(pattern)) {
                                return Some(GameInfo {
                                    name: "Warcraft I".to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    version: detect_game_version(&path),
                                    game_type: GameType::WC1,
                                    is_running: false,
                                });
                            }
                            
                            // Check WC2 patterns
                            if WC2_PATTERNS.iter().any(|pattern| file_name_str.contains(pattern)) {
                                return Some(GameInfo {
                                    name: "Warcraft II".to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    version: detect_game_version(&path),
                                    game_type: GameType::WC2,
                                    is_running: false,
                                });
                            }
                            
                            // Check WC3 patterns
                            if WC3_PATTERNS.iter().any(|pattern| file_name_str.contains(pattern)) {
                                return Some(GameInfo {
                                    name: "Warcraft III".to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    version: detect_game_version(&path),
                                    game_type: GameType::WC3,
                                    is_running: false,
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    None
}

/// Detect game version (simplified - could be enhanced with actual version detection)
fn detect_game_version(_exe_path: &Path) -> String {
    // TODO: Implement actual version detection from executable
    // For now, return a placeholder
    "1.0".to_string()
}

#[tauri::command]
async fn scan_for_games() -> Result<ScanResult, String> {
    let games = scan_installed_games();
    
    // If no games found, provide some helpful information
    if games.is_empty() {
        return Ok(ScanResult { 
            games: vec![
                GameInfo {
                    name: "No Games Found".to_string(),
                    path: "".to_string(),
                    version: "".to_string(),
                    game_type: GameType::WC2, // Default type
                    is_running: false,
                }
            ] 
        });
    }
    
    Ok(ScanResult { games })
}

#[tauri::command]
async fn get_running_games() -> Result<Vec<RunningGame>, String> {
    let mut running_games = Vec::new();
    let mut sys = System::new_all();
    sys.refresh_all();

    for (pid, process) in sys.processes() {
        let process_name = process.name().to_lowercase();
        
        // Check for WC1 patterns
        if WC1_PATTERNS.iter().any(|pattern| process_name.contains(pattern)) {
            running_games.push(RunningGame {
                name: process.name().to_string(),
                process_id: pid.as_u32(),
                game_type: GameType::WC1,
            });
        }
        
        // Check for WC2 patterns
        if WC2_PATTERNS.iter().any(|pattern| process_name.contains(pattern)) {
            running_games.push(RunningGame {
                name: process.name().to_string(),
                process_id: pid.as_u32(),
                game_type: GameType::WC2,
            });
        }
        
        // Check for WC3 patterns
        if WC3_PATTERNS.iter().any(|pattern| process_name.contains(pattern)) {
            running_games.push(RunningGame {
                name: process.name().to_string(),
                process_id: pid.as_u32(),
                game_type: GameType::WC3,
            });
        }
    }

    Ok(running_games)
}

#[tauri::command]
async fn launch_game(game_path: String) -> Result<(), String> {
    let path = Path::new(&game_path);
    
    if !path.exists() {
        return Err(format!("Game executable not found: {}", game_path));
    }
    
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", game_path));
    }
    
    // Launch the game
    match Command::new(&game_path)
        .current_dir(path.parent().unwrap_or(Path::new(".")))
        .spawn() 
    {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to launch game: {}", e))
    }
}

#[tauri::command]
async fn get_game_assets(game_type: GameType, _game_path: String) -> Result<Vec<String>, String> {
    // TODO: Implement asset scanning
    match game_type {
        GameType::WC1 => Ok(vec!["sprites".to_string(), "maps".to_string(), "sounds".to_string()]),
        GameType::WC2 => Ok(vec!["sprites".to_string(), "maps".to_string(), "sounds".to_string(), "replays".to_string()]),
        GameType::WC3 => Ok(vec!["sprites".to_string(), "maps".to_string(), "sounds".to_string(), "models".to_string()]),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_for_games,
            get_running_games,
            launch_game,
            get_game_assets
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
