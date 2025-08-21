use std::path::{Path, PathBuf};
use std::collections::HashMap;
use anyhow::{Result, anyhow};
use serde_json::Value;
use crate::types::{GameInstallation};

#[derive(Debug, Clone)]
pub enum Platform {
    Windows,
    MacOS,
    Linux,
}

impl Platform {
    pub fn current() -> Platform {
        #[cfg(target_os = "windows")]
        return Platform::Windows;
        #[cfg(target_os = "macos")]
        return Platform::MacOS;
        #[cfg(target_os = "linux")]
        return Platform::Linux;
    }
}

pub struct GameDetector {
    platform: Platform,
}

impl GameDetector {
    pub fn new() -> Self {
        Self {
            platform: Platform::current(),
        }
    }

    pub fn detect_all_games(&self) -> Result<HashMap<String, Vec<GameInstallation>>> {
        let mut all_games = HashMap::new();
        
        // Detect games from registry
        if let Ok(registry_games) = self.detect_registry_games() {
            for (name, installations) in registry_games {
                all_games.entry(name).or_insert_with(Vec::new).extend(installations);
            }
        }

        // Detect games from common paths
        if let Ok(path_games) = self.detect_common_path_games() {
            for (name, installations) in path_games {
                all_games.entry(name).or_insert_with(Vec::new).extend(installations);
            }
        }

        // Search for Warcraft executables across all drives
        if let Ok(exe_games) = self.search_for_warcraft_executables() {
            for (name, installations) in exe_games {
                all_games.entry(name).or_insert_with(Vec::new).extend(installations);
            }
        }

        Ok(all_games)
    }

    fn detect_registry_games(&self) -> Result<HashMap<String, Vec<GameInstallation>>> {
        let mut games = HashMap::new();
        
        #[cfg(target_os = "windows")]
        {
            use winreg::enums::*;
            use winreg::RegKey;

            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            
            // Check for Battle.net games
            if let Ok(battlenet_key) = hklm.open_subkey("SOFTWARE\\Blizzard Entertainment") {
                for subkey_name in battlenet_key.enum_keys() {
                    if let Ok(subkey_name) = subkey_name {
                        if let Ok(game_key) = battlenet_key.open_subkey(&subkey_name) {
                            if let Ok(install_path) = game_key.get_value::<String, _>("InstallPath") {
                                if let Some(game_info) = self.identify_game_type(&PathBuf::from(&install_path)) {
                                    let installation = GameInstallation {
                                        path: PathBuf::from(install_path),
                                        version: game_info.version,
                                        launcher: Some("Battle.net".to_string()),
                                    };
                                    games.entry(game_info.name).or_insert_with(Vec::new).push(installation);
                                }
                            }
                        }
                    }
                }
            }

            // Check for Steam games
            if let Ok(steam_key) = hklm.open_subkey("SOFTWARE\\Valve\\Steam") {
                if let Ok(steam_path) = steam_key.get_value::<String, _>("InstallPath") {
                    let steamapps_path = PathBuf::from(steam_path).join("steamapps").join("common");
                    if steamapps_path.exists() {
                        for entry in std::fs::read_dir(&steamapps_path).unwrap_or_else(|_| std::fs::read_dir(".").unwrap()) {
                            if let Ok(entry) = entry {
                                if let Some(game_info) = self.identify_game_type(&entry.path()) {
                                    let installation = GameInstallation {
                                        path: entry.path(),
                                        version: game_info.version,
                                        launcher: Some("Steam".to_string()),
                                        
                                    };
                                    games.entry(game_info.name).or_insert_with(Vec::new).push(installation);
                                }
                            }
                        }
                    }
                }
            }

            // Check for GOG Galaxy games
            if let Ok(gog_key) = hklm.open_subkey("SOFTWARE\\GOG.com\\GalaxyClient\\paths") {
                if let Ok(gog_path) = gog_key.get_value::<String, _>("client") {
                    // GOG games detection would go here
                }
            }

            // Check for Epic Games
            if let Ok(epic_key) = hklm.open_subkey("SOFTWARE\\Epic Games\\EpicGamesLauncher") {
                if let Ok(_epic_path) = hklm.get_value::<String, _>("AppDataPath") {
                    // Epic games detection would go here
                }
            }
        }

        Ok(games)
    }

    fn detect_common_path_games(&self) -> Result<HashMap<String, Vec<GameInstallation>>> {
        let mut games = HashMap::new();
        
        let common_paths = vec![
            // Program Files paths
            "C:\\Program Files\\Warcraft",
            "C:\\Program Files\\Warcraft II",
            "C:\\Program Files\\Warcraft III",
            "C:\\Program Files (x86)\\Warcraft",
            "C:\\Program Files (x86)\\Warcraft II", 
            "C:\\Program Files (x86)\\Warcraft III",
            "C:\\Program Files\\Blizzard Entertainment",
            "C:\\Program Files (x86)\\Blizzard Entertainment",
            
            // User directories
            "C:\\Users\\Public\\Games",
            "C:\\Games",
            
            // Battle.net default paths
            "C:\\Program Files (x86)\\Battle.net",
            
            // Common game installation paths
            "C:\\Games",
            "C:\\Users\\Public\\Games",
            "C:\\Program Files\\Games",
            "C:\\Program Files (x86)\\Games",
        ];

        for path_str in common_paths {
            let path = PathBuf::from(path_str);
            if path.exists() {
                self.scan_directory_for_games(&path, &mut games, 3);
            }
        }

        Ok(games)
    }

    pub fn scan_directory_for_games(&self, dir: &Path, games: &mut HashMap<String, Vec<GameInstallation>>, max_depth: usize) {
        if max_depth == 0 {
            return;
        }

        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_dir() {
                        // Check if this directory contains a game
                        if let Some(game_info) = self.identify_game_type(&path) {
                            let installation = GameInstallation {
                                path: path.clone(),
                                version: game_info.version,
                                launcher: None,
                                
                            };
                            games.entry(game_info.name).or_insert_with(Vec::new).push(installation);
                        }
                        
                        // Recursively scan subdirectories
                        self.scan_directory_for_games(&path, games, max_depth - 1);
                    }
                }
            }
        }
    }

    fn search_for_warcraft_executables(&self) -> Result<HashMap<String, Vec<GameInstallation>>> {
        let mut games = HashMap::new();
        
        // Get all available drives
        let drives = self.get_all_available_drives();
        
        for drive in drives {
            let drive_path = PathBuf::from(format!("{}\\", drive));
            if drive_path.exists() {
                println!("Scanning drive: {}", drive);
                self.recursive_exe_search(&drive_path, &mut games, 5);
            }
        }

        Ok(games)
    }

    fn get_all_available_drives(&self) -> Vec<String> {
        let mut drives = Vec::new();
        
        #[cfg(target_os = "windows")]
        {
            for letter in 'A'..='Z' {
                let drive = format!("{}:", letter);
                let drive_path = PathBuf::from(format!("{}\\", drive));
                if drive_path.exists() {
                    // Check if we can actually read from this drive
                    if let Ok(_entries) = std::fs::read_dir(drive_path) {
                        drives.push(drive);
                    }
                }
            }
        }
        
        drives
    }

    fn recursive_exe_search(&self, dir: &Path, games: &mut HashMap<String, Vec<GameInstallation>>, max_depth: usize) {
        if max_depth == 0 {
            return;
        }

        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    
                    if path.is_file() {
                        if let Some(file_name) = path.file_name() {
                            if let Some(file_name_str) = file_name.to_str() {
                                // Check for Warcraft executables
                                if self.is_warcraft_executable(file_name_str) {
                                    if let Some(game_dir) = path.parent() {
                                        if let Some(game_info) = self.identify_game_type(game_dir) {
                                            let installation = GameInstallation {
                                                path: game_dir.to_path_buf(),
                                                version: game_info.version,
                                                launcher: None,
                                                
                                            };
                                            games.entry(game_info.name).or_insert_with(Vec::new).push(installation);
                                        }
                                    }
                                }
                            }
                        }
                    } else if path.is_dir() && self.get_directory_depth(&path) < 10 {
                        // Only recurse into directories that aren't too deep
                        self.recursive_exe_search(&path, games, max_depth - 1);
                    }
                }
            }
        }
    }

    fn is_warcraft_executable(&self, filename: &str) -> bool {
        let warcraft_executables = vec![
            "Warcraft.exe",
            "Warcraft II.exe", 
            "Warcraft II BNE.exe",
            "Warcraft III.exe",
            "Frozen Throne.exe",
            "War2.exe",
            "War3.exe",
            "WarcraftII.exe",
            "WarcraftIII.exe",
            "Warcraft2.exe",
            "Warcraft3.exe",
            "WC2.exe",
            "WC3.exe",
        ];
        
        warcraft_executables.iter().any(|&exe| filename.eq_ignore_ascii_case(exe))
    }

    fn get_directory_depth(&self, path: &Path) -> usize {
        path.components().count()
    }

    fn identify_game_type(&self, path: &Path) -> Option<GameInfo> {
        let path_str = path.to_string_lossy().to_lowercase();
        
        // Check for Warcraft III variants
        if path_str.contains("warcraft iii") || path_str.contains("warcraft 3") {
            if path_str.contains("reforged") {
                return Some(GameInfo {
                    name: "Warcraft III".to_string(),
                    version: Some("Reforged".to_string()),
                });
            } else if path_str.contains("frozen throne") {
                return Some(GameInfo {
                    name: "Warcraft III".to_string(),
                    version: Some("The Frozen Throne".to_string()),
                });
            } else {
                return Some(GameInfo {
                    name: "Warcraft III".to_string(),
                    version: Some("Reign of Chaos".to_string()),
                });
            }
        }
        
        // Check for Warcraft II variants
        if path_str.contains("warcraft ii") || path_str.contains("warcraft 2") {
            if path_str.contains("remastered") {
                return Some(GameInfo {
                    name: "Warcraft II".to_string(),
                    version: Some("Remastered".to_string()),
                });
            } else if path_str.contains("battle.net") || path_str.contains("battlenet") {
                return Some(GameInfo {
                    name: "Warcraft II".to_string(),
                    version: Some("Battle.net Edition".to_string()),
                });
            } else if path_str.contains("combat") {
                return Some(GameInfo {
                    name: "Warcraft II".to_string(),
                    version: Some("Combat Edition".to_string()),
                });
            } else {
                return Some(GameInfo {
                    name: "Warcraft II".to_string(),
                    version: Some("DOS".to_string()),
                });
            }
        }
        
        // Check for Warcraft I variants
        if path_str.contains("warcraft i") || path_str.contains("warcraft 1") || 
           (path_str.contains("warcraft") && !path_str.contains("ii") && !path_str.contains("iii") && 
            !path_str.contains("2") && !path_str.contains("3")) {
            if path_str.contains("remastered") {
                return Some(GameInfo {
                    name: "Warcraft I".to_string(),
                    version: Some("Remastered".to_string()),
                });
            } else {
                return Some(GameInfo {
                    name: "Warcraft I".to_string(),
                    version: Some("DOS".to_string()),
                });
            }
        }

        // Check for W3Arena
        if path_str.contains("w3arena") {
            return Some(GameInfo {
                name: "W3Arena".to_string(),
                version: None,
            });
        }

        None
    }

    fn read_gog_library(&self, _gog_path: &Path) -> Result<Vec<GameInstallation>> {
        // GOG Galaxy library reading logic would go here
        Ok(Vec::new())
    }

    fn read_gamepass_library(&self, _xbox_path: &Path) -> Result<Vec<GameInstallation>> {
        // Xbox Game Pass library reading logic would go here
        Ok(Vec::new())
    }

    pub fn find_map_folders(&self, game_path: &Path, game_type: &str) -> Result<Vec<PathBuf>> {
        let mut map_folders = Vec::new();
        
        match game_type {
            "wc1-dos" | "wc1-remastered" => {
                // Warcraft I doesn't have custom maps in the traditional sense
                // But we can look for scenario files
                let scenarios_path = game_path.join("scenarios");
                if scenarios_path.exists() {
                    map_folders.push(scenarios_path);
                }
            },
            "wc2-dos" | "wc2-combat" | "wc2-remastered" => {
                // Warcraft II map folders
                let maps_path = game_path.join("maps");
                if maps_path.exists() {
                    map_folders.push(maps_path);
                }
                
                let scenarios_path = game_path.join("scenarios");
                if scenarios_path.exists() {
                    map_folders.push(scenarios_path);
                }
            },
            "wc3-roc" | "wc3-tft" | "wc3-reforged" => {
                // Warcraft III has a more complex map system
                let maps_path = game_path.join("Maps");
                if maps_path.exists() {
                    map_folders.push(maps_path);
                }
                
                // User maps in Documents
                if let Ok(documents_path) = std::env::var("USERPROFILE") {
                    let user_maps = PathBuf::from(documents_path)
                        .join("Documents")
                        .join("Warcraft III")
                        .join("Maps");
                    if user_maps.exists() {
                        map_folders.push(user_maps);
                    }
                }
            },
            _ => {
                // Generic map folder search
                let maps_path = game_path.join("maps");
                if maps_path.exists() {
                    map_folders.push(maps_path);
                }
            }
        }
        
        Ok(map_folders)
    }
}

struct GameInfo {
    name: String,
    version: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_detection() {
        let detector = GameDetector::new();
        let games = detector.detect_all_games().unwrap();
        
        // This will depend on what games are actually installed
        println!("Detected games: {:?}", games);
    }

    #[test]
    fn test_game_identification() {
        let detector = GameDetector::new();
        
        let wc1_path = PathBuf::from("C:\\Games\\Warcraft I Remastered");
        let game_info = detector.identify_game_type(&wc1_path);
        assert!(game_info.is_some());
        
        let wc2_path = PathBuf::from("C:\\Games\\Warcraft II Battle.net Edition");
        let game_info = detector.identify_game_type(&wc2_path);
        assert!(game_info.is_some());
    }

    #[test]
    fn test_executable_detection() {
        let detector = GameDetector::new();
        
        assert!(detector.is_warcraft_executable("Warcraft.exe"));
        assert!(detector.is_warcraft_executable("Warcraft II.exe"));
        assert!(detector.is_warcraft_executable("War3.exe"));
        assert!(!detector.is_warcraft_executable("notepad.exe"));
    }
}