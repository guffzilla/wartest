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
    pub executable: String,
    pub maps_folder: Option<String>,
    pub installation_type: InstallationType,
    pub drive: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub enum GameType {
    WC1,
    WC2,
    WC3,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum InstallationType {
    Original,
    Remastered,
    BattleNet,
    Combat,
    DOS,
    Reforged,
    FrozenThrone,
    ReignOfChaos,
    Custom,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub games: Vec<GameInfo>,
    pub total_found: usize,
    pub drives_scanned: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunningGame {
    pub name: String,
    pub process_id: u32,
    pub game_type: GameType,
    pub executable_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameLaunchRequest {
    pub executable_path: String,
    pub working_directory: String,
}

// Game detection patterns and common installation paths
const WC1_PATTERNS: &[&str] = &[
    "warcraft.exe", "war.exe", "wc1.exe", "warcraft1.exe",
    "warcraft orcs & humans.exe", "orcs & humans.exe",
    "warcraft orcs and humans.exe", "warcraft-orcs.exe",
    "war.exe"  // Original WC1 executable
];

const WC2_PATTERNS: &[&str] = &[
    "warcraft2.exe", "war2.exe", "wc2.exe", "warcraft ii.exe",
    "warcraft ii bne.exe", "warcraft ii bne_dx.exe", "war2launcher.exe",
    "warcraft ii map editor.exe", "warcraft2bne.exe", "warcraft2bne_dx.exe",
    "war2bne.exe", "war2bne_dx.exe", "warcraft2combat.exe", "war2combat.exe"
];

const WC3_PATTERNS: &[&str] = &[
    "warcraft3.exe", "war3.exe", "wc3.exe", "warcraft iii.exe",
    "warcraft iii launcher.exe", "world editor.exe", "warcraft3launcher.exe",
    "war3launcher.exe", "warcraft3reforged.exe", "war3reforged.exe",
    "w3champions.exe", "w3c.exe", "w3ch.exe", "w3champions launcher.exe"
];

// Common installation directories to scan
const COMMON_PATHS: &[&str] = &[
    "Program Files (x86)\\Warcraft*",
    "Program Files\\Warcraft*",
    "Games\\Warcraft*",
    "Warcraft*",
    "Blizzard\\Warcraft*",
    "Battle.net\\Warcraft*",
    "GOG Games\\Warcraft*",
    "Steam\\steamapps\\common\\Warcraft*",
    "Epic Games\\Warcraft*",
    "W3Champions*",
    "W3C*",
];

/// Get all available drives on Windows
fn get_available_drives() -> Vec<String> {
    let mut drives = Vec::new();
    
    // Check drives A: through Z:
    for drive_letter in b'A'..=b'Z' {
        let drive = format!("{}:", drive_letter as char);
        let drive_path = Path::new(&drive);
        if drive_path.exists() {
            drives.push(drive);
        }
    }
    
    drives
}

/// Scan for installed Warcraft games across all drives
fn scan_installed_games() -> Vec<GameInfo> {
    let mut games = Vec::new();
    let drives = get_available_drives();
    
    println!("Scanning drives: {:?}", drives);
    
    for drive in &drives {
        // Scan common installation paths on this drive
        for base_path in COMMON_PATHS {
            let full_path = format!("{}\\{}", drive, base_path);
            if let Ok(paths) = glob::glob(&full_path) {
                for entry in paths.filter_map(Result::ok) {
                    if let Some(game_info) = detect_game_in_directory(&entry) {
                        games.push(game_info);
                    }
                }
            }
        }
        
        // Also scan the current games directory if it's on this drive
        if let Ok(current_dir) = std::env::current_dir() {
            if let Some(current_drive) = current_dir.components().next() {
                if current_drive.as_os_str().to_string_lossy() == *drive {
                    // Look for games directory relative to project root (one level up from src-tauri)
                    if let Some(games_dir) = current_dir.parent().map(|p| p.join("games")) {
                        println!("Checking project games directory: {}", games_dir.display());
                        if games_dir.exists() {
                            println!("Project games directory exists, scanning...");
                            if let Ok(entries) = fs::read_dir(games_dir) {
                                for entry in entries.filter_map(Result::ok) {
                                    println!("Checking games directory entry: {}", entry.path().display());
                                    if let Some(game_info) = detect_game_in_directory(&entry.path()) {
                                        println!("Found game in project games directory: {:?}", game_info);
                                        games.push(game_info);
                                    }
                                }
                            }
                        } else {
                            println!("Project games directory does not exist");
                        }
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
    
    let dir_name = dir_path.file_name()?.to_string_lossy().to_lowercase();
    let drive = dir_path.components().next()?.as_os_str().to_string_lossy().to_string();
    
    // Recursively search for executable files
    if let Some(game_info) = search_for_executables_recursive(dir_path, &dir_name, &drive) {
        return Some(game_info);
    }
    
    None
}

/// Recursively search for Warcraft executables in a directory and its subdirectories
fn search_for_executables_recursive(dir_path: &Path, dir_name: &str, drive: &str) -> Option<GameInfo> {
    // First, check the current directory for executables
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file() {
                if let Some(extension) = path.extension() {
                    if extension == "exe" {
                        if let Some(file_name) = path.file_name() {
                            let file_name_str = file_name.to_string_lossy().to_lowercase();
                            
                            println!("Checking executable: {} in directory: {}", file_name_str, dir_path.display());
                            
                            // Check WC1 patterns
                            if WC1_PATTERNS.iter().any(|pattern| file_name_str.contains(pattern)) {
                                println!("Found WC1 game: {} in {}", file_name_str, dir_path.display());
                                return Some(create_game_info(
                                    dir_path, &path, GameType::WC1, dir_name, drive
                                ));
                            }
                            
                            // Check WC2 patterns
                            if WC2_PATTERNS.iter().any(|pattern| file_name_str.contains(pattern)) {
                                println!("Found WC2 game: {} in {}", file_name_str, dir_path.display());
                                return Some(create_game_info(
                                    dir_path, &path, GameType::WC2, dir_name, drive
                                ));
                            }
                            
                            // Check WC3 patterns
                            if WC3_PATTERNS.iter().any(|pattern| file_name_str.contains(pattern)) {
                                println!("Found WC3 game: {} in {}", file_name_str, dir_path.display());
                                return Some(create_game_info(
                                    dir_path, &path, GameType::WC3, dir_name, drive
                                ));
                            }
                        }
                    }
                }
            }
        }
    }
    
    // If no executables found in current directory, search subdirectories
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_dir() {
                // Skip certain system directories to avoid infinite recursion
                let subdir_name = path.file_name()?.to_string_lossy().to_lowercase();
                if !subdir_name.starts_with('.') && 
                   subdir_name != "windows" && 
                   subdir_name != "system32" && 
                   subdir_name != "program files" &&
                   subdir_name != "program files (x86)" {
                    
                    println!("Searching subdirectory: {} in {}", subdir_name, dir_path.display());
                    if let Some(game_info) = search_for_executables_recursive(&path, dir_name, drive) {
                        return Some(game_info);
                    }
                }
            }
        }
    }
    
    None
}

/// Create a GameInfo struct with proper detection
fn create_game_info(
    dir_path: &Path, 
    exe_path: &Path, 
    game_type: GameType, 
    dir_name: &str, 
    drive: &str
) -> GameInfo {
    let executable = exe_path.to_string_lossy().to_string(); // Store full executable path
    let maps_folder = find_maps_folder(dir_path);
    
    let (name, version, installation_type) = match game_type {
        GameType::WC1 => detect_wc1_details(dir_name, &executable),
        GameType::WC2 => detect_wc2_details(dir_name, &executable),
        GameType::WC3 => detect_wc3_details(dir_name, &executable),
    };
    
    GameInfo {
        name,
        path: dir_path.to_string_lossy().to_string(),
        version,
        game_type,
        is_running: false,
        executable,
        maps_folder,
        installation_type,
        drive: drive.to_string(),
    }
}

/// Find the Maps folder for a game installation
fn find_maps_folder(game_dir: &Path) -> Option<String> {
    let maps_paths = [
        "Maps", "maps", "MAPS", 
        "Maps\\Custom", "maps\\custom",
        "Maps\\W3Champions", "maps\\w3champions",
        "W3Champions\\Maps", "w3champions\\maps"
    ];
    
    for maps_path in maps_paths {
        let full_path = game_dir.join(maps_path);
        if full_path.exists() && full_path.is_dir() {
            return Some(full_path.to_string_lossy().to_string());
        }
    }
    
    None
}

/// Detect WC1 specific details
fn detect_wc1_details(dir_name: &str, _executable: &str) -> (String, String, InstallationType) {
    let name = if dir_name.contains("remastered") {
        "Warcraft I: Remastered"
    } else {
        "Warcraft: Orcs & Humans"
    };
    
    let version = if dir_name.contains("remastered") {
        "Remastered"
    } else {
        "Original"
    };
    
    let installation_type = if dir_name.contains("remastered") {
        InstallationType::Remastered
    } else {
        InstallationType::Original
    };
    
    (name.to_string(), version.to_string(), installation_type)
}

/// Detect WC2 specific details
fn detect_wc2_details(dir_name: &str, executable: &str) -> (String, String, InstallationType) {
    let (name, version, installation_type) = if dir_name.contains("bne") || executable.contains("bne") {
        ("Warcraft II: Battle.net Edition", "Battle.net", InstallationType::BattleNet)
    } else if dir_name.contains("combat") || executable.contains("combat") {
        ("Warcraft II: Combat Edition", "Combat", InstallationType::Combat)
    } else if dir_name.contains("remastered") {
        ("Warcraft II: Remastered", "Remastered", InstallationType::Remastered)
    } else if dir_name.contains("dos") {
        ("Warcraft II: Tides of Darkness", "DOS", InstallationType::DOS)
    } else {
        ("Warcraft II: Tides of Darkness", "Original", InstallationType::Original)
    };
    
    (name.to_string(), version.to_string(), installation_type)
}

/// Detect WC3 specific details
fn detect_wc3_details(dir_name: &str, executable: &str) -> (String, String, InstallationType) {
    let (name, version, installation_type) = if dir_name.contains("reforged") || executable.contains("reforged") {
        ("Warcraft III: Reforged", "Reforged", InstallationType::Reforged)
    } else if dir_name.contains("frozen throne") || executable.contains("frozen throne") {
        ("Warcraft III: The Frozen Throne", "Frozen Throne", InstallationType::FrozenThrone)
    } else if dir_name.contains("reign of chaos") || executable.contains("reign of chaos") {
        ("Warcraft III: Reign of Chaos", "Reign of Chaos", InstallationType::ReignOfChaos)
    } else {
        ("Warcraft III", "Original", InstallationType::Original)
    };
    
    (name.to_string(), version.to_string(), installation_type)
}

/// Check if a game is currently running
fn check_game_running(game_path: &str) -> bool {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    for (_, process) in sys.processes() {
        if let Some(exe) = process.exe() {
            if exe.to_string_lossy().to_lowercase().contains(&game_path.to_lowercase()) {
                return true;
            }
        }
    }
    
    false
}

#[tauri::command]
async fn scan_for_games() -> Result<ScanResult, String> {
    let games = scan_installed_games();
    let drives = get_available_drives();
    
    if games.is_empty() {
        return Ok(ScanResult {
            games: vec![GameInfo {
                name: "No Games Found".to_string(),
                path: "".to_string(),
                version: "".to_string(),
                game_type: GameType::WC2,
                is_running: false,
                executable: "".to_string(),
                maps_folder: None,
                installation_type: InstallationType::Custom,
                drive: "".to_string(),
            }],
            total_found: 0,
            drives_scanned: drives,
        });
    }
    
    // Update running status for found games
    let mut updated_games = games;
    for game in &mut updated_games {
        game.is_running = check_game_running(&game.executable);
    }
    
    let total_found = updated_games.len();
    
    // Debug logging
    println!("Total games found: {}", total_found);
    for (i, game) in updated_games.iter().enumerate() {
        println!("Game {}: {:?} - {:?} - {:?}", i, game.name, game.game_type, game.installation_type);
    }
    
    Ok(ScanResult {
        games: updated_games,
        total_found,
        drives_scanned: drives,
    })
}

#[tauri::command]
async fn get_running_games() -> Result<Vec<RunningGame>, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let mut running_games = Vec::new();
    
    for (pid, process) in sys.processes() {
        if let Some(exe) = process.exe() {
            let exe_name = exe.file_name().unwrap().to_string_lossy().to_lowercase();
            
            // Check if this is a Warcraft game
            if WC1_PATTERNS.iter().any(|pattern| exe_name.contains(pattern)) {
                running_games.push(RunningGame {
                    name: "Warcraft I".to_string(),
                    process_id: pid.as_u32(),
                    game_type: GameType::WC1,
                    executable_path: exe.to_string_lossy().to_string(),
                });
            } else if WC2_PATTERNS.iter().any(|pattern| exe_name.contains(pattern)) {
                running_games.push(RunningGame {
                    name: "Warcraft II".to_string(),
                    process_id: pid.as_u32(),
                    game_type: GameType::WC2,
                    executable_path: exe.to_string_lossy().to_string(),
                });
            } else if WC3_PATTERNS.iter().any(|pattern| exe_name.contains(pattern)) {
                running_games.push(RunningGame {
                    name: "Warcraft III".to_string(),
                    process_id: pid.as_u32(),
                    game_type: GameType::WC3,
                    executable_path: exe.to_string_lossy().to_string(),
                });
            }
        }
    }
    
    Ok(running_games)
}

#[tauri::command]
async fn launch_game(request: GameLaunchRequest) -> Result<(), String> {
    let path = Path::new(&request.executable_path);
    if !path.exists() {
        return Err(format!("Game executable not found: {}", request.executable_path));
    }
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", request.executable_path));
    }
    
    match Command::new(&request.executable_path)
        .current_dir(&request.working_directory)
        .spawn()
    {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to launch game: {}", e))
    }
}

#[tauri::command]
async fn open_folder(folder_path: String) -> Result<(), String> {
    let path = Path::new(&folder_path);
    if !path.exists() {
        return Err(format!("Folder not found: {}", folder_path));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", folder_path));
    }
    
    // Use the Windows explorer command to open the folder
    match Command::new("explorer")
        .arg(&folder_path)
        .spawn()
    {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open folder: {}", e))
    }
}

// Asset extraction is handled by separate local development tools
// This function is no longer needed in the main application

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_for_games,
            get_running_games,
            launch_game,
            open_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
