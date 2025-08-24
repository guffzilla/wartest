use std::path::PathBuf;

/// Game utilities for WC2
pub struct GameUtils;

impl GameUtils {
    /// Get game installation path
    pub fn get_game_path() -> Option<PathBuf> {
        // Common WC2 installation paths
        let possible_paths = vec![
            "C:\\Program Files\\Warcraft II",
            "C:\\Program Files (x86)\\Warcraft II",
            "C:\\Games\\Warcraft II",
        ];
        
        for path in possible_paths {
            let path_buf = PathBuf::from(path);
            if path_buf.exists() {
                return Some(path_buf);
            }
        }
        
        None
    }

    /// Check if WC2 is installed
    pub fn is_wc2_installed() -> bool {
        Self::get_game_path().is_some()
    }

    /// Get game executable path
    pub fn get_game_exe_path() -> Option<PathBuf> {
        Self::get_game_path().map(|path| path.join("Warcraft II.exe"))
    }

    /// Get data directory path
    pub fn get_data_path() -> Option<PathBuf> {
        Self::get_game_path().map(|path| path.join("Data"))
    }

    /// Get save game directory
    pub fn get_save_path() -> Option<PathBuf> {
        Self::get_game_path().map(|path| path.join("Save"))
    }
}

/// Game constants
pub mod constants {
    /// WC2 version
    pub const WC2_VERSION: &str = "1.0";
    
    /// Supported map sizes
    pub const SUPPORTED_MAP_SIZES: [u32; 3] = [64, 96, 128];
    
    /// Maximum players
    pub const MAX_PLAYERS: u32 = 8;
    
    /// Game window dimensions
    pub const GAME_WIDTH: u32 = 800;
    pub const GAME_HEIGHT: u32 = 600;
}

/// Game types
pub mod types {
    /// Player race
    #[derive(Debug, Clone, PartialEq)]
    pub enum PlayerRace {
        Human,
        Orc,
    }

    /// Game difficulty
    #[derive(Debug, Clone, PartialEq)]
    pub enum GameDifficulty {
        Easy,
        Normal,
        Hard,
    }

    /// Game type
    #[derive(Debug, Clone, PartialEq)]
    pub enum GameType {
        Campaign,
        Custom,
        Multiplayer,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_utils() {
        // These tests will only pass if WC2 is actually installed
        // For now, just test the functions don't panic
        let _ = GameUtils::get_game_path();
        let _ = GameUtils::is_wc2_installed();
        let _ = GameUtils::get_game_exe_path();
        let _ = GameUtils::get_data_path();
        let _ = GameUtils::get_save_path();
    }

    #[test]
    fn test_constants() {
        assert_eq!(constants::WC2_VERSION, "1.0");
        assert_eq!(constants::MAX_PLAYERS, 8);
        assert_eq!(constants::GAME_WIDTH, 800);
        assert_eq!(constants::GAME_HEIGHT, 600);
    }

    #[test]
    fn test_types() {
        let race = types::PlayerRace::Human;
        let difficulty = types::GameDifficulty::Normal;
        let game_type = types::GameType::Campaign;
        
        assert_eq!(race, types::PlayerRace::Human);
        assert_eq!(difficulty, types::GameDifficulty::Normal);
        assert_eq!(game_type, types::GameType::Campaign);
    }
}
