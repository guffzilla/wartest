// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use sysinfo::System;

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

// Game detection patterns
const WC1_PATTERNS: &[&str] = &["warcraft.exe", "war.exe", "wc1.exe"];
const WC2_PATTERNS: &[&str] = &["warcraft2.exe", "war2.exe", "wc2.exe"];
const WC3_PATTERNS: &[&str] = &["warcraft3.exe", "war3.exe", "wc3.exe", "frozen throne.exe"];

#[tauri::command]
async fn scan_for_games() -> Result<ScanResult, String> {
    // For now, return mock data
    // TODO: Implement actual game scanning
    let games = vec![
        GameInfo {
            name: "Warcraft I".to_string(),
            path: "C:\\Games\\Warcraft\\warcraft.exe".to_string(),
            version: "1.0".to_string(),
            game_type: GameType::WC1,
            is_running: false,
        },
        GameInfo {
            name: "Warcraft II".to_string(),
            path: "C:\\Games\\Warcraft2\\warcraft2.exe".to_string(),
            version: "2.0".to_string(),
            game_type: GameType::WC2,
            is_running: false,
        },
        GameInfo {
            name: "Warcraft III".to_string(),
            path: "C:\\Games\\Warcraft3\\warcraft3.exe".to_string(),
            version: "3.0".to_string(),
            game_type: GameType::WC3,
            is_running: false,
        },
    ];

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
    // TODO: Implement game launching
    println!("Launching game: {}", game_path);
    Ok(())
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
