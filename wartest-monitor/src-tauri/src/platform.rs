use std::path::{Path, PathBuf};
use std::collections::HashMap;
use anyhow::{Result, anyhow};
use serde_json::Value;

#[derive(Debug, Clone)]
pub enum Platform {
    Windows,
    macOS,
    Linux,
}

impl Platform {
    pub fn current() -> Self {
        #[cfg(target_os = "windows")]
        return Platform::Windows;
        #[cfg(target_os = "macos")]
        return Platform::macOS;
        #[cfg(target_os = "linux")]
        return Platform::Linux;
    }
}

#[derive(Debug, Clone)]
pub struct GameInstallation {
    pub name: String,
    pub path: PathBuf,
    pub launcher: Option<String>,
    pub version: Option<String>,
    pub is_valid: bool,
}

#[derive(Debug, Clone)]
pub struct LauncherInfo {
    pub name: String,
    pub is_installed: bool,
    pub installation_path: Option<PathBuf>,
    pub games: Vec<GameInstallation>,
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

    /// Comprehensive game detection across all platforms and launchers
    pub fn detect_all_games(&self) -> Result<HashMap<String, GameInstallation>> {
        let mut all_games = HashMap::new();
        
        // 1. Check Battle.net
        if let Ok(battle_net_games) = self.detect_battle_net_games() {
            for game in battle_net_games {
                all_games.insert(game.name.clone(), game);
            }
        }

        // 2. Check GOG Galaxy
        if let Ok(gog_games) = self.detect_gog_games() {
            for game in gog_games {
                all_games.insert(game.name.clone(), game);
            }
        }

        // 3. Check Microsoft Game Pass
        if let Ok(gamepass_games) = self.detect_gamepass_games() {
            for game in gamepass_games {
                all_games.insert(game.name.clone(), game);
            }
        }

        // 4. Check Windows Registry (Windows only)
        if let Ok(registry_games) = self.detect_registry_games() {
            for game in registry_games {
                all_games.insert(game.name.clone(), game);
            }
        }

        // 5. Check common installation paths
        if let Ok(common_games) = self.detect_common_path_games() {
            for game in common_games {
                all_games.insert(game.name.clone(), game);
            }
        }

        Ok(all_games)
    }

    /// Detect Battle.net games
    fn detect_battle_net_games(&self) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        // Check if Battle.net is installed
        let battle_net_paths = self.get_battle_net_paths();
        
        for path in battle_net_paths {
            if path.exists() {
                // Try to read Battle.net's game library
                if let Ok(battle_net_games) = self.read_battle_net_library(&path) {
                    games.extend(battle_net_games);
                }
            }
        }

        Ok(games)
    }

    /// Get possible Battle.net installation paths
    fn get_battle_net_paths(&self) -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        // Standard installation paths
        paths.push(PathBuf::from(r"C:\Program Files (x86)\Battle.net"));
        paths.push(PathBuf::from(r"C:\Program Files\Battle.net"));
        
        // User-specific paths
        if let Some(user_profile) = std::env::var("USERPROFILE").ok() {
            paths.push(PathBuf::from(format!("{}\\AppData\\Local\\Programs\\Battle.net", user_profile)));
            paths.push(PathBuf::from(format!("{}\\AppData\\Local\\Battle.net", user_profile)));
        }

        // Check if any Warcraft games have .battle.net directories
        let warcraft_paths = vec![
            r"C:\Program Files (x86)\Warcraft III\.battle.net",
            r"C:\Program Files\Warcraft III\.battle.net",
        ];
        
        for path in warcraft_paths {
            if Path::new(path).exists() {
                if let Some(parent) = Path::new(path).parent() {
                    paths.push(parent.to_path_buf());
                }
            }
        }

        paths
    }

    /// Read Battle.net game library
    fn read_battle_net_library(&self, battle_net_path: &Path) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        // Look for Battle.net's game database or configuration files
        let possible_configs = vec![
            "Battle.net.exe",
            "Battle.net Launcher.exe",
            "config",
            "data",
        ];

        for config in possible_configs {
            let config_path = battle_net_path.join(config);
            if config_path.exists() {
                // Try to extract game information
                if let Ok(game_list) = self.parse_battle_net_config(&config_path) {
                    games.extend(game_list);
                }
            }
        }

        Ok(games)
    }

    /// Parse Battle.net configuration to find games
    fn parse_battle_net_config(&self, config_path: &Path) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        // This is a simplified parser - in a real implementation, you'd parse
        // Battle.net's actual configuration format (likely JSON or similar)
        
        // For now, let's check for common Warcraft game directories
        let warcraft_games = vec![
            ("Warcraft I", vec!["Warcraft.exe", "Warcraft I.exe"]),
            ("Warcraft II", vec!["Warcraft II.exe", "Warcraft2.exe"]),
            ("Warcraft III", vec!["Warcraft III.exe", "Warcraft3.exe"]),
        ];

        for (game_name, exe_names) in warcraft_games {
            for exe_name in exe_names {
                let exe_path = config_path.join(exe_name);
                if exe_path.exists() {
                    games.push(GameInstallation {
                        name: game_name.to_string(),
                        path: exe_path,
                        launcher: Some("Battle.net".to_string()),
                        version: None,
                        is_valid: true,
                    });
                }
            }
        }

        Ok(games)
    }

    /// Detect GOG Galaxy games
    fn detect_gog_games(&self) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        // Check for GOG Galaxy installation
        let gog_paths = vec![
            r"C:\Program Files (x86)\GOG Galaxy",
            r"C:\Program Files\GOG Galaxy",
        ];

        for path in gog_paths {
            let gog_path = Path::new(path);
            if gog_path.exists() {
                // Look for GOG Galaxy's game database
                if let Ok(gog_games) = self.read_gog_library(gog_path) {
                    games.extend(gog_games);
                }
            }
        }

        Ok(games)
    }

    /// Read GOG Galaxy game library
    fn read_gog_library(&self, gog_path: &Path) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        // GOG Galaxy typically stores game info in its database
        // This would require parsing GOG's specific format
        // For now, we'll implement a basic check
        
        Ok(games)
    }

    /// Detect Microsoft Game Pass games
    fn detect_gamepass_games(&self) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        // Check for Xbox app and Game Pass installations
        let xbox_paths = vec![
            r"C:\Program Files\WindowsApps\Microsoft.GamingApp",
            r"C:\Program Files\Microsoft\Xbox",
        ];

        for path in xbox_paths {
            let xbox_path = Path::new(path);
            if xbox_path.exists() {
                // Look for Game Pass games
                if let Ok(gamepass_games) = self.read_gamepass_library(xbox_path) {
                    games.extend(gamepass_games);
                }
            }
        }

        Ok(games)
    }

    /// Read Microsoft Game Pass game library
    fn read_gamepass_library(&self, xbox_path: &Path) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        // Game Pass games are typically installed in WindowsApps
        // This requires special permissions and parsing of Microsoft's format
        
        Ok(games)
    }

    /// Detect games from Windows Registry
    fn detect_registry_games(&self) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        // This would require Windows-specific registry access
        // For now, we'll implement a basic structure
        
        Ok(games)
    }

    /// Detect games from common installation paths
    fn detect_common_path_games(&self) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        let common_paths = vec![
            (r"C:\Program Files (x86)\Warcraft I", "Warcraft.exe", "Warcraft I"),
            (r"C:\Program Files\Warcraft I", "Warcraft.exe", "Warcraft I"),
            (r"C:\Program Files (x86)\Warcraft II", "Warcraft II.exe", "Warcraft II"),
            (r"C:\Program Files\Warcraft II", "Warcraft II.exe", "Warcraft II"),
            (r"C:\Program Files (x86)\Warcraft III", "Warcraft III.exe", "Warcraft III"),
            (r"C:\Program Files\Warcraft III", "Warcraft III.exe", "Warcraft III"),
        ];

        for (base_path, exe_name, game_name) in common_paths {
            let exe_path = Path::new(base_path).join(exe_name);
            if exe_path.exists() {
                games.push(GameInstallation {
                    name: game_name.to_string(),
                    path: exe_path,
                    launcher: None,
                    version: None,
                    is_valid: true,
                });
            }
        }

        Ok(games)
    }

    /// Get launcher information
    pub fn get_launcher_info(&self) -> Result<Vec<LauncherInfo>> {
        let mut launchers = Vec::new();
        
        // Battle.net
        let battle_net_paths = self.get_battle_net_paths();
        let battle_net_installed = battle_net_paths.iter().any(|p| p.exists());
        let battle_net_path = battle_net_paths.iter().find(|p| p.exists()).cloned();
        
        launchers.push(LauncherInfo {
            name: "Battle.net".to_string(),
            is_installed: battle_net_installed,
            installation_path: battle_net_path,
            games: Vec::new(),
        });

        // GOG Galaxy
        let gog_installed = Path::new(r"C:\Program Files (x86)\GOG Galaxy").exists() 
            || Path::new(r"C:\Program Files\GOG Galaxy").exists();
        
        launchers.push(LauncherInfo {
            name: "GOG Galaxy".to_string(),
            is_installed: gog_installed,
            installation_path: None, // Would need to determine actual path
            games: Vec::new(),
        });

        // Microsoft Game Pass
        let gamepass_installed = Path::new(r"C:\Program Files\WindowsApps\Microsoft.GamingApp").exists();
        
        launchers.push(LauncherInfo {
            name: "Microsoft Game Pass".to_string(),
            is_installed: gamepass_installed,
            installation_path: None,
            games: Vec::new(),
        });

        Ok(launchers)
    }
}

impl Default for GameDetector {
    fn default() -> Self {
        Self::new()
    }
}
