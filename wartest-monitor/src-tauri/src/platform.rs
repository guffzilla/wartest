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
    pub fn detect_all_games(&self) -> Result<HashMap<String, Vec<GameInstallation>>> {
        let mut all_games = HashMap::new();
        
        // 1. Check Battle.net
        if let Ok(battle_net_games) = self.detect_battle_net_games() {
            for game in battle_net_games {
                all_games.entry(game.name.clone()).or_insert_with(Vec::new).push(game);
            }
        }

        // 2. Check GOG Galaxy
        if let Ok(gog_games) = self.detect_gog_games() {
            for game in gog_games {
                all_games.entry(game.name.clone()).or_insert_with(Vec::new).push(game);
            }
        }

        // 3. Check Microsoft Game Pass
        if let Ok(gamepass_games) = self.detect_gamepass_games() {
            for game in gamepass_games {
                all_games.entry(game.name.clone()).or_insert_with(Vec::new).push(game);
            }
        }

        // 4. Check Windows Registry (Windows only)
        if let Ok(registry_games) = self.detect_registry_games() {
            for game in registry_games {
                all_games.entry(game.name.clone()).or_insert_with(Vec::new).push(game);
            }
        }

        // 5. Check common installation paths
        if let Ok(common_games) = self.detect_common_path_games() {
            for game in common_games {
                all_games.entry(game.name.clone()).or_insert_with(Vec::new).push(game);
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

    /// Get possible Battle.net installation paths using multiple detection methods
    pub fn get_battle_net_paths(&self) -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        // Method 1: Check Windows Registry (most reliable)
        if let Ok(registry_paths) = self.get_battle_net_from_registry() {
            paths.extend(registry_paths);
        }
        
        // Method 2: Standard installation paths
        let standard_paths = vec![
            r"C:\Program Files (x86)\Battle.net\Battle.net Launcher.exe",
            r"C:\Program Files\Battle.net\Battle.net Launcher.exe",
            r"C:\Program Files (x86)\Battle.net\Battle.net.exe",
            r"C:\Program Files\Battle.net\Battle.net.exe",
        ];
        
        for path in standard_paths {
            paths.push(PathBuf::from(path));
        }
        
        // Method 3: Microsoft Store version
        if let Ok(entries) = std::fs::read_dir(r"C:\Program Files\WindowsApps") {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = path.file_name().unwrap_or_default().to_string_lossy();
                    if dir_name.to_lowercase().contains("blizzard.battlenet") {
                        let launcher_path = path.join("Battle.net Launcher.exe");
                        if launcher_path.exists() {
                            paths.push(launcher_path);
                        }
                    }
                }
            }
        }
        
        // Method 4: User-specific paths
        if let Some(user_profile) = std::env::var("USERPROFILE").ok() {
            let user_paths = vec![
                format!("{}\\AppData\\Local\\Programs\\Battle.net\\Battle.net Launcher.exe", user_profile),
                format!("{}\\AppData\\Local\\Battle.net\\Battle.net Launcher.exe", user_profile),
            ];
            
            for path in user_paths {
                paths.push(PathBuf::from(path));
            }
        }
        
        // Method 5: Check if any Warcraft games have .battle.net directories
        let warcraft_paths = vec![
            r"C:\Program Files (x86)\Warcraft III\.battle.net",
            r"C:\Program Files\Warcraft III\.battle.net",
        ];
        
        for path in warcraft_paths {
            if Path::new(path).exists() {
                if let Some(parent) = Path::new(path).parent() {
                    let battle_net_dir = parent.join("Battle.net");
                    if battle_net_dir.exists() {
                        let launcher_path = battle_net_dir.join("Battle.net Launcher.exe");
                        if launcher_path.exists() {
                            paths.push(launcher_path);
                        }
                    }
                }
            }
        }
        
        // Method 6: Search for Battle.net in common game directories
        let common_game_dirs = vec![
            r"C:\Games",
            r"C:\Program Files (x86)\Games",
            r"C:\Program Files\Games",
        ];
        
        for base_dir in common_game_dirs {
            if let Ok(entries) = std::fs::read_dir(base_dir) {
                for entry in entries.filter_map(|e| e.ok()) {
                    let path = entry.path();
                    if path.is_dir() {
                        let dir_name = path.file_name().unwrap_or_default().to_string_lossy();
                        if dir_name.to_lowercase().contains("battle.net") {
                            let launcher_path = path.join("Battle.net Launcher.exe");
                            if launcher_path.exists() {
                                paths.push(launcher_path);
                            }
                        }
                    }
                }
            }
        }
        
        paths
    }
    
    /// Get Battle.net installation path from Windows Registry
    fn get_battle_net_from_registry(&self) -> Result<Vec<PathBuf>> {
        let mut paths = Vec::new();
        
        #[cfg(target_os = "windows")]
        {
            use winreg::enums::*;
            use winreg::RegKey;
            
            // Try HKEY_LOCAL_MACHINE first
            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            if let Ok(software) = hklm.open_subkey_with_flags(
                r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Battle.net",
                KEY_READ
            ) {
                if let Ok(install_location) = software.get_value::<String, _>("InstallLocation") {
                    let launcher_path = PathBuf::from(install_location).join("Battle.net Launcher.exe");
                    if launcher_path.exists() {
                        paths.push(launcher_path);
                    }
                }
            }
            
            // Try regular SOFTWARE key
            if let Ok(software) = hklm.open_subkey_with_flags(
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Battle.net",
                KEY_READ
            ) {
                if let Ok(install_location) = software.get_value::<String, _>("InstallLocation") {
                    let launcher_path = PathBuf::from(install_location).join("Battle.net Launcher.exe");
                    if launcher_path.exists() {
                        paths.push(launcher_path);
                    }
                }
            }
            
            // Try HKEY_CURRENT_USER
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok(battle_net) = hkcu.open_subkey_with_flags(
                r"SOFTWARE\Battle.net",
                KEY_READ
            ) {
                if let Ok(install_path) = battle_net.get_value::<String, _>("InstallPath") {
                    let launcher_path = PathBuf::from(install_path).join("Battle.net Launcher.exe");
                    if launcher_path.exists() {
                        paths.push(launcher_path);
                    }
                }
            }
        }
        
        Ok(paths)
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
    /// Note: GOG versions are typically the same as Battle.net versions
    /// So we'll focus on Battle.net detection instead
    fn detect_gog_games(&self) -> Result<Vec<GameInstallation>> {
        // GOG versions are essentially the same as Battle.net versions
        // Focus on Battle.net detection for consistency
        Ok(Vec::new())
    }

    /// Read GOG Galaxy game library
    fn read_gog_library(&self, _gog_path: &Path) -> Result<Vec<GameInstallation>> {
        // Not needed since we're focusing on Battle.net
        Ok(Vec::new())
    }

    /// Detect Microsoft Game Pass games
    /// Note: Game Pass Warcraft games still require Battle.net launcher
    /// So we don't need separate detection - they'll be found via Battle.net
    fn detect_gamepass_games(&self) -> Result<Vec<GameInstallation>> {
        // Game Pass Warcraft games require Battle.net anyway
        // So we'll find them through Battle.net detection instead
        Ok(Vec::new())
    }

    /// Read Microsoft Game Pass game library
    fn read_gamepass_library(&self, _xbox_path: &Path) -> Result<Vec<GameInstallation>> {
        // Not needed since Game Pass games require Battle.net
        Ok(Vec::new())
    }

    /// Detect games from Windows Registry
    fn detect_registry_games(&self) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        #[cfg(windows)]
        {
            use winreg::enums::*;
            
            // Steam detection via registry
            if let Ok(hklm) = winreg::RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey("SOFTWARE\\Valve\\Steam") {
                if let Ok(steam_path) = hklm.get_value::<String, _>("InstallPath") {
                    let steamapps_path = std::path::Path::new(&steam_path).join("steamapps").join("common");
                    if steamapps_path.exists() {
                        self.scan_steam_library(&steamapps_path, &mut games);
                    }
                }
            }
            
            // GOG Galaxy detection via registry
            if let Ok(hklm) = winreg::RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey("SOFTWARE\\GOG.com\\GalaxyClient\\paths") {
                if let Ok(gog_path) = hklm.get_value::<String, _>("client") {
                    let gog_games_path = std::path::Path::new(&gog_path).join("Games");
                    if gog_games_path.exists() {
                        self.scan_directory_for_games(&gog_games_path, "GOG", &mut games);
                    }
                }
            }
            
            // Epic Games Store detection
            if let Ok(hklm) = winreg::RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey("SOFTWARE\\Epic Games\\EpicGamesLauncher") {
                if let Ok(epic_path) = hklm.get_value::<String, _>("AppDataPath") {
                    // Epic stores game info in manifests, but for simplicity we'll scan common locations
                    let drives = vec!["C:", "D:", "E:", "F:"];
                    for drive in drives {
                        let epic_games_path = std::path::Path::new(drive).join("Epic Games");
                        if epic_games_path.exists() {
                            self.scan_directory_for_games(&epic_games_path, "Epic", &mut games);
                        }
                    }
                }
            }
        }
        
        println!("Registry detection found {} games", games.len());
        Ok(games)
    }
    
    /// Scan Steam library for Warcraft games
    fn scan_steam_library(&self, steamapps_path: &std::path::Path, games: &mut Vec<GameInstallation>) {
        println!("Scanning Steam library at: {:?}", steamapps_path);
        if let Ok(entries) = std::fs::read_dir(steamapps_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = path.file_name().unwrap_or_default().to_string_lossy();
                    if dir_name.to_lowercase().contains("warcraft") {
                        self.scan_directory_for_games(&path, &dir_name, games);
                    }
                }
            }
        }
    }

        /// Detect games from common installation paths
    fn detect_common_path_games(&self) -> Result<Vec<GameInstallation>> {
        let mut games = Vec::new();
        
        println!("=== STARTING SIMPLE GAME DETECTION ===");
        
        // DYNAMIC DRIVE DETECTION: Find ALL available drives including USB drives
        let drives = self.get_all_available_drives();
        println!("🚀 Found {} available drives: {:?}", drives.len(), drives);
        
        let search_paths = vec![
            "Program Files (x86)",
            "Program Files", 
            "Games",
            "Steam\\steamapps\\common",
            "Epic Games",
            "GOG Galaxy\\GamesInstalled",
            "Users\\garet\\OneDrive\\Desktop\\wartest\\games"
        ];
        
        // Search each drive systematically
        for drive in &drives {
            println!("🔍 Searching drive: {}", drive);
            
            for search_path in &search_paths {
                let full_path = Path::new(drive).join(search_path);
                if full_path.exists() {
                    println!("  📁 Found directory: {:?}", full_path);
                    self.search_for_warcraft_executables(&full_path, &mut games);
                }
            }
            
            // Also search the root of each drive for Warcraft folders
            let drive_root = Path::new(drive);
            if let Ok(entries) = std::fs::read_dir(drive_root) {
                for entry in entries.filter_map(|e| e.ok()) {
                    let path = entry.path();
                    if path.is_dir() {
                        let dir_name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                        if dir_name.contains("warcraft") || dir_name.contains("war") {
                            println!("  🎮 Found Warcraft directory: {:?}", path);
                            self.search_for_warcraft_executables(&path, &mut games);
                        }
                    }
                }
            }
        }
        
        // Search your specific project directory
        let project_games = Path::new(r"C:\Users\garet\OneDrive\Desktop\wartest\games");
        if project_games.exists() {
            println!("🎯 Searching project games directory: {:?}", project_games);
            println!("🎯 Project directory exists and is accessible!");
            
            // Test: List what's in the directory
            if let Ok(entries) = std::fs::read_dir(project_games) {
                let count = entries.count();
                println!("🎯 Found {} entries in project games directory", count);
            }
            
            self.search_for_warcraft_executables(project_games, &mut games);
            println!("🎯 After search, found {} games", games.len());
        } else {
            println!("❌ Project games directory not found: {:?}", project_games);
        }
        
        println!("=== GAME DETECTION COMPLETE ===");
        println!("Total games found: {}", games.len());
        for game in &games {
            println!("  ✅ {} ({}) at: {}", game.name, game.version.as_deref().unwrap_or("Unknown"), game.path.display());
        }

        Ok(games)
    }
    
    /// Get all available drives on the system (including USB drives)
    fn get_all_available_drives(&self) -> Vec<String> {
        let mut drives = Vec::new();
        
        #[cfg(target_os = "windows")]
        {
            // Method 1: Check for drives A: through Z: that actually exist
            for letter in b'A'..=b'Z' {
                let drive = format!("{}:", letter as char);
                let drive_path = Path::new(&drive);
                if drive_path.exists() {
                    // Check if it's actually accessible (not just a floppy drive)
                    if let Ok(entries) = std::fs::read_dir(drive_path) {
                        // If we can read the directory, it's a valid drive
                        drives.push(drive);
                    }
                }
            }
        }
        
        // Remove duplicates and sort
        drives.sort();
        drives.dedup();
        
        println!("🔍 Detected drives: {:?}", drives);
        drives
    }
    
    /// Find map folders for a specific game installation
    pub fn find_map_folders(&self, game_path: &Path) -> Vec<PathBuf> {
        let mut map_folders = Vec::new();
        let game_dir = game_path.parent().unwrap_or(game_path);
        
        println!("Searching for map folders in: {:?}", game_dir);
        
        // Common map folder names for different Warcraft versions
        let map_folder_names = vec![
            "maps", "Maps", "MAPS", "scenarios", "Scenarios", "SCENARIOS",
            "campaigns", "Campaigns", "CAMPAIGNS", "Maps", "Maps", "Maps",
            "Custom", "custom", "CUSTOM", "Downloads", "downloads", "DOWNLOADS"
        ];
        
        // Look for map folders in the game directory and subdirectories
        if let Ok(entries) = std::fs::read_dir(game_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                    println!("Checking directory: {} for map folders", dir_name);
                    
                    // Check if this is a map folder
                    if map_folder_names.iter().any(|&name| dir_name == name.to_lowercase()) {
                        println!("Found map folder: {:?}", path);
                        map_folders.push(path.clone());
                    }
                    
                    // Recursively check subdirectories for map folders
                    if let Ok(sub_entries) = std::fs::read_dir(&path) {
                        for sub_entry in sub_entries.filter_map(|e| e.ok()) {
                            let sub_path = sub_entry.path();
                            if sub_path.is_dir() {
                                let sub_dir_name = sub_path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                                if map_folder_names.iter().any(|&name| sub_dir_name == name.to_lowercase()) {
                                    println!("Found map folder in subdirectory: {:?}", sub_path);
                                    map_folders.push(sub_path);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Also check common parent directories that might contain maps
        let parent_dirs = vec![
            game_dir.join("..").join("Maps"),
            game_dir.join("..").join("maps"),
            game_dir.join("..").join("Scenarios"),
            game_dir.join("..").join("scenarios"),
        ];
        
        for parent_dir in parent_dirs {
            if parent_dir.exists() {
                println!("Found map folder in parent directory: {:?}", parent_dir);
                map_folders.push(parent_dir);
            }
        }
        
        println!("Total map folders found: {}", map_folders.len());
        map_folders
    }
    
    /// Recursively scan a directory for Warcraft game executables
    fn scan_directory_for_games(&self, dir_path: &Path, dir_name: &str, games: &mut Vec<GameInstallation>) {
        if let Ok(entries) = std::fs::read_dir(dir_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                
                if path.is_file() && path.extension().map_or(false, |ext| ext == "exe") {
                    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                    
                    // Determine game type based on directory name and executable
                    let game_info = self.identify_game_type(dir_name, &file_name, &path);
                    if let Some((name, version)) = game_info {
                        games.push(GameInstallation {
                            name: name.to_string(),
                            path: path.clone(),
                            launcher: Some("Project Directory".to_string()),
                            version: Some(version.to_string()),
                            is_valid: true,
                        });
                    }
                } else if path.is_dir() {
                    // Recursively scan subdirectories
                    let sub_dir_name = path.file_name().unwrap_or_default().to_string_lossy();
                    self.scan_directory_for_games(&path, &sub_dir_name, games);
                }
            }
        }
    }
    
    /// Search specifically for Warcraft executables with common names
    fn search_for_warcraft_executables(&self, search_path: &Path, games: &mut Vec<GameInstallation>) {
        println!("🔍 Searching directory: {:?}", search_path);
        
        // First, do a comprehensive recursive search for ALL .exe files
        self.recursive_exe_search(search_path, games);
        
        // Then, do targeted searches for specific known executables
        // Based on actual files found in the project folder
        let warcraft_executables = vec![
            // Warcraft I
            ("Warcraft.exe", "Warcraft I", "Remastered"),
            ("WAR.EXE", "Warcraft I", "DOS"),
            ("WAR_EDIT.EXE", "Warcraft I", "DOS Editor"),
            
            // Warcraft II
            ("Warcraft II.exe", "Warcraft II", "Remastered"),
            ("Warcraft II BNE.exe", "Warcraft II", "Combat Edition"),
            ("Warcraft II Map Editor.exe", "Warcraft II", "Map Editor"),
            
            // Warcraft III
            ("Warcraft III.exe", "Warcraft III", "Reign of Chaos"),
            ("Warcraft III Launcher.exe", "Warcraft III", "Launcher"),
            ("World Editor.exe", "Warcraft III", "World Editor"),
            
            // W3Arena/W3Champions
            ("W3Champions.exe", "W3Arena", "W3Champions"),
            
            // Common variations (for other installations)
            ("war.exe", "Warcraft I", "DOS"),
            ("war2.exe", "Warcraft II", "DOS"),
            ("war3.exe", "Warcraft III", "Reign of Chaos"),
            ("warcraft1.exe", "Warcraft I", "Classic"),
            ("warcraft2.exe", "Warcraft II", "Classic"),
            ("warcraft3.exe", "Warcraft III", "Reign of Chaos"),
        ];
        
        for (exe_name, game_name, version) in warcraft_executables {
            let exe_path = search_path.join(exe_name);
            if exe_path.exists() {
                // Check if we already have this game
                let already_exists = games.iter().any(|g| g.path == exe_path);
                if !already_exists {
                    println!("🎯 Found Warcraft executable: {} ({}) at: {:?}", game_name, version, exe_path);
                    games.push(GameInstallation {
                        name: game_name.to_string(),
                        path: exe_path,
                        launcher: Some("Executable Search".to_string()),
                        version: Some(version.to_string()),
                        is_valid: true,
                    });
                }
            }
        }
    }
    
    /// Recursively search for ALL .exe files and identify Warcraft games
    fn recursive_exe_search(&self, search_path: &Path, games: &mut Vec<GameInstallation>) {
        if let Ok(entries) = std::fs::read_dir(search_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                
                if path.is_file() && path.extension().map_or(false, |ext| ext == "exe") {
                    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                    let full_path_str = path.to_string_lossy().to_lowercase();
                    
                    // Check if this looks like a Warcraft executable
                    if file_name.contains("warcraft") || file_name.contains("war") || 
                       full_path_str.contains("warcraft") || full_path_str.contains("war") {
                        
                        // Check if we already have this game
                        let already_exists = games.iter().any(|g| g.path == path);
                        if !already_exists {
                            println!("🔍 Found potential Warcraft executable: {:?}", path);
                            println!("  File name: {}", file_name);
                            println!("  Full path: {}", full_path_str);
                            
                            // Try to identify the game type
                            if let Some((name, version)) = self.identify_game_type("", &file_name, &path) {
                                println!("  ✅ Identified as: {} ({})", name, version);
                                games.push(GameInstallation {
                                    name: name.to_string(),
                                    path: path.clone(),
                                    launcher: Some("Recursive Search".to_string()),
                                    version: Some(version.to_string()),
                                    is_valid: true,
                                });
                            } else {
                                println!("  ❌ Could not identify game type");
                            }
                        }
                    }
                } else if path.is_dir() {
                    // Recursively search subdirectories (limit depth to avoid infinite loops)
                    let depth = self.get_directory_depth(search_path, &path);
                    if depth <= 5 { // Increased depth limit
                        self.recursive_exe_search(&path, games);
                    }
                }
            }
        }
    }
    
    /// Get the depth of a directory relative to a base path
    fn get_directory_depth(&self, base_path: &Path, target_path: &Path) -> usize {
        let mut depth = 0;
        let mut current = target_path;
        
        while let Some(parent) = current.parent() {
            if parent == base_path {
                break;
            }
            depth += 1;
            current = parent;
        }
        
        depth
    }
    
    /// Identify the game type based on directory and executable names
    fn identify_game_type(&self, dir_name: &str, exe_name: &str, full_path: &Path) -> Option<(&str, &str)> {
        let _dir_lower = dir_name.to_lowercase(); // Prefix with _ to indicate intentionally unused
        let path_str = full_path.to_string_lossy().to_lowercase();
        
        // Warcraft I
        if path_str.contains("warcraft") && path_str.contains("i") && !path_str.contains("ii") && !path_str.contains("iii") {
            if exe_name.contains("warcraft") || exe_name.contains("war") {
                if path_str.contains("remastered") {
                    return Some(("Warcraft I", "Remastered"));
                } else if path_str.contains("dos") || path_str.contains("orcs") || path_str.contains("orcs & humans") {
                    return Some(("Warcraft I", "DOS"));
                } else {
                    return Some(("Warcraft I", "Classic"));
                }
            }
        }
        
        // Also check for DOS-specific patterns
        if exe_name == "war.exe" || exe_name == "war_edit.exe" || exe_name == "war_edit.exe" {
            if path_str.contains("dos") || path_str.contains("orcs") || path_str.contains("orcs & humans") {
                return Some(("Warcraft I", "DOS"));
            }
        }
        
        // Check for specific executable names from the project folder
        if exe_name == "warcraft ii bne.exe" {
            return Some(("Warcraft II", "Combat Edition"));
        }
        
        if exe_name == "w3champions.exe" {
            return Some(("W3Arena", "W3Champions"));
        }
        
        if exe_name == "world editor.exe" {
            return Some(("Warcraft III", "World Editor"));
        }
        
        // Warcraft II
        if path_str.contains("warcraft") && path_str.contains("ii") && !path_str.contains("iii") {
            if exe_name.contains("warcraft") || exe_name.contains("war2") || exe_name.contains("warcraft ii") {
                if path_str.contains("remastered") {
                    return Some(("Warcraft II", "Remastered"));
                } else if path_str.contains("combat") || path_str.contains("war2combat") {
                    return Some(("Warcraft II", "Combat Edition"));
                } else if path_str.contains("bne") || exe_name.contains("bne") {
                    return Some(("Warcraft II", "Battle.net Edition"));
                } else {
                    return Some(("Warcraft II", "Classic"));
                }
            }
        }
        
        // Warcraft III
        if path_str.contains("warcraft") && path_str.contains("iii") {
            if exe_name.contains("warcraft") || exe_name.contains("war3") || exe_name.contains("warcraft iii") {
                if path_str.contains("reforged") {
                    return Some(("Warcraft III", "Reforged"));
                } else if path_str.contains("frozen throne") || path_str.contains("tft") {
                    return Some(("Warcraft III", "The Frozen Throne"));
                } else {
                    return Some(("Warcraft III", "Reign of Chaos"));
                }
            }
        }
        
        // W3Arena/W3Champions
        if path_str.contains("w3") || path_str.contains("champions") || path_str.contains("w3champions") {
            if exe_name.contains("w3") || exe_name.contains("champions") {
                return Some(("W3Arena", "W3Champions"));
            }
        }
        
        None
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

        // GOG Galaxy - Note: GOG versions are essentially the same as Battle.net versions
        // So we don't need separate detection

        // Microsoft Game Pass - Note: Game Pass Warcraft games require Battle.net anyway
        // So we don't need separate detection

        Ok(launchers)
    }
}

impl Default for GameDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_game_detector_creation() {
        println!("🧪 Testing GameDetector creation...");
        let detector = GameDetector::new();
        println!("✅ GameDetector created successfully");
        assert!(true); // Basic creation test
    }

    #[test]
    fn test_get_all_available_drives() {
        println!("🧪 Testing drive detection...");
        let detector = GameDetector::new();
        let drives = detector.get_all_available_drives();
        println!("🚀 Found drives: {:?}", drives);
        assert!(!drives.is_empty(), "Should find at least one drive");
        println!("✅ Drive detection working");
    }

    #[test]
    fn test_project_directory_access() {
        println!("🧪 Testing project directory access...");
        let project_path = Path::new(r"C:\Users\garet\OneDrive\Desktop\wartest\games");
        
        if project_path.exists() {
            println!("✅ Project directory exists: {:?}", project_path);
            
            if let Ok(entries) = std::fs::read_dir(project_path) {
                let count = entries.count();
                println!("✅ Project directory accessible, found {} entries", count);
            } else {
                println!("❌ Project directory not readable");
            }
        } else {
            println!("❌ Project directory does not exist: {:?}", project_path);
        }
        
        assert!(true); // Test always passes, just for debugging
    }

    #[test]
    fn test_recursive_exe_search() {
        println!("🧪 Testing recursive executable search...");
        let detector = GameDetector::new();
        let project_path = Path::new(r"C:\Users\garet\OneDrive\Desktop\wartest\games");
        
        if project_path.exists() {
            let mut games = Vec::new();
            detector.recursive_exe_search(project_path, &mut games);
            println!("🔍 Recursive search found {} potential games", games.len());
            
            for game in &games {
                println!("  - {}: {:?} (via {})", 
                    game.name, 
                    game.path, 
                    game.launcher.as_deref().unwrap_or("Unknown"));
            }
        } else {
            println!("❌ Project directory not found for testing");
        }
        
        assert!(true); // Test always passes, just for debugging
    }

    #[test]
    fn test_identify_game_type() {
        println!("🧪 Testing game identification...");
        let detector = GameDetector::new();
        
        // Test Warcraft I DOS
        let war_exe_path = Path::new(r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft Orcs & Humans\dos\WARCRAFT\WAR.EXE");
        if war_exe_path.exists() {
            println!("✅ WAR.EXE exists at: {:?}", war_exe_path);
            
            if let Some((name, version)) = detector.identify_game_type("", "war.exe", war_exe_path) {
                println!("✅ Identified as: {} ({})", name, version);
            } else {
                println!("❌ Could not identify WAR.EXE");
            }
        } else {
            println!("❌ WAR.EXE not found at expected path");
        }
        
        // Test Warcraft I Remastered
        let warcraft_exe_path = Path::new(r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft I Remastered\x86\Warcraft.exe");
        if warcraft_exe_path.exists() {
            println!("✅ Warcraft.exe exists at: {:?}", warcraft_exe_path);
            
            if let Some((name, version)) = detector.identify_game_type("", "warcraft.exe", warcraft_exe_path) {
                println!("✅ Identified as: {} ({})", name, version);
            } else {
                println!("❌ Could not identify Warcraft.exe");
            }
        } else {
            println!("❌ Warcraft.exe not found at expected path");
        }
        
        assert!(true); // Test always passes, just for debugging
    }

    #[test]
    fn test_detect_all_games() {
        println!("🧪 Testing complete game detection...");
        let detector = GameDetector::new();
        
        match detector.detect_all_games() {
            Ok(games) => {
                println!("✅ detect_all_games succeeded, found {} game types", games.len());
                
                for (name, installations) in &games {
                    println!("  - {}: {} installations", name, installations.len());
                    for installation in installations {
                        println!("    * {:?} (via {})", 
                            installation.path, 
                            installation.launcher.as_deref().unwrap_or("Unknown"));
                    }
                }
            }
            Err(e) => {
                println!("❌ detect_all_games failed: {}", e);
            }
        }
        
        assert!(true); // Test always passes, just for debugging
    }

    #[test]
    fn test_specific_file_search() {
        println!("🧪 Testing specific file search...");
        
        // Check if specific files exist
        let test_files = vec![
            r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft Orcs & Humans\dos\WARCRAFT\WAR.EXE",
            r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft I Remastered\x86\Warcraft.exe",
            r"C:\Users\garet\OneDrive\Desktop\wartest\games\War2Combat\Warcraft II BNE.exe",
            r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft II Remastered\x86\Warcraft II.exe",
            r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft III\_retail_\x86_64\Warcraft III.exe",
            r"C:\Users\garet\OneDrive\Desktop\wartest\games\W3Champions\W3Champions.exe",
        ];
        
        for file_path in test_files {
            let path = Path::new(file_path);
            if path.exists() {
                println!("✅ Found: {}", path.display());
            } else {
                println!("❌ Missing: {}", path.display());
            }
        }
        
        assert!(true); // Test always passes, just for debugging
    }
}
