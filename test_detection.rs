use std::path::{Path, PathBuf};
use std::collections::HashMap;

fn main() {
    println!("🔍 Testing Game Detection Logic");
    println!("================================");
    
    // Test the game detection logic
    let detector = GameDetector::new();
    
    println!("📂 Scanning for games...");
    match detector.detect_all_games() {
        Ok(games) => {
            println!("✅ Found {} game types:", games.len());
            for (game_name, installations) in &games {
                println!("  🎮 {}: {} installation(s)", game_name, installations.len());
                for (i, installation) in installations.iter().enumerate() {
                    println!("    {}. Path: {}", i + 1, installation.path.display());
                    println!("       Version: {}", installation.version.as_deref().unwrap_or("Unknown"));
                    println!("       Launcher: {}", installation.launcher.as_deref().unwrap_or("Unknown"));
                }
            }
        }
        Err(e) => {
            println!("❌ Error detecting games: {}", e);
        }
    }
}

struct GameDetector {
    platform: Platform,
}

#[derive(Debug, Clone)]
enum Platform {
    Windows,
    MacOS,
    Linux,
}

impl Platform {
    fn current() -> Platform {
        #[cfg(target_os = "windows")]
        return Platform::Windows;
        #[cfg(target_os = "macos")]
        return Platform::MacOS;
        #[cfg(target_os = "linux")]
        return Platform::Linux;
    }
}

struct GameInstallation {
    path: PathBuf,
    version: Option<String>,
    launcher: Option<String>,
}

impl GameDetector {
    fn new() -> Self {
        Self {
            platform: Platform::current(),
        }
    }

    fn detect_all_games(&self) -> Result<HashMap<String, Vec<GameInstallation>>, Box<dyn std::error::Error>> {
        let mut all_games = HashMap::new();
        
        // Detect games from common paths
        if let Ok(path_games) = self.detect_common_path_games() {
            for (name, installations) in path_games {
                all_games.entry(name).or_insert_with(Vec::new).extend(installations);
            }
        }

        Ok(all_games)
    }

    fn detect_common_path_games(&self) -> Result<HashMap<String, Vec<GameInstallation>>, Box<dyn std::error::Error>> {
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
            
            // Project-specific paths for testing
            "C:\\Users\\garet\\OneDrive\\Desktop\\wartest\\games",
        ];

        for path_str in common_paths {
            let path = PathBuf::from(path_str);
            if path.exists() {
                println!("  📁 Scanning: {}", path_str);
                self.scan_directory_for_games(&path, &mut games, 3);
            }
        }

        Ok(games)
    }

    fn scan_directory_for_games(&self, dir: &Path, games: &mut HashMap<String, Vec<GameInstallation>>, max_depth: usize) {
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
                                version: game_info.version.clone(),
                                launcher: None,
                            };
                            games.entry(game_info.name.clone()).or_insert_with(Vec::new).push(installation);
                            println!("    ✅ Found game: {} ({})", game_info.name, game_info.version.as_deref().unwrap_or("Unknown"));
                        }
                        
                        // Recursively scan subdirectories
                        self.scan_directory_for_games(&path, games, max_depth - 1);
                    }
                }
            }
        }
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
}

struct GameInfo {
    name: String,
    version: Option<String>,
}
