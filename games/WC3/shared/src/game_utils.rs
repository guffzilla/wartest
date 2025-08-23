use std::path::PathBuf;

/// Game utilities for Warcraft III
pub struct GameUtils;

impl GameUtils {
    /// Get default game installation path
    pub fn get_default_install_path() -> PathBuf {
        // Common Warcraft III installation paths
        let paths = vec![
            r"C:\Program Files\Warcraft III",
            r"C:\Program Files (x86)\Warcraft III",
            r"C:\Games\Warcraft III",
            r"D:\Games\Warcraft III",
        ];
        
        for path in paths {
            let path_buf = PathBuf::from(path);
            if path_buf.exists() {
                return path_buf;
            }
        }
        
        // Default fallback
        PathBuf::from(r"C:\Program Files\Warcraft III")
    }

    /// Get game executable path
    pub fn get_game_executable_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Warcraft III.exe")
    }

    /// Get game data path
    pub fn get_game_data_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Data")
    }

    /// Get game save path
    pub fn get_game_save_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Save")
    }

    /// Get game maps path
    pub fn get_game_maps_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Maps")
    }

    /// Get game campaigns path
    pub fn get_game_campaigns_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Campaigns")
    }

    /// Get game custom maps path
    pub fn get_game_custom_maps_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Maps").join("Custom")
    }

    /// Get game replays path
    pub fn get_game_replays_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Replays")
    }

    /// Get game screenshots path
    pub fn get_game_screenshots_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Screenshots")
    }

    /// Get game logs path
    pub fn get_game_logs_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Logs")
    }

    /// Get game config path
    pub fn get_game_config_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Config")
    }

    /// Get game mods path
    pub fn get_game_mods_path(install_path: &PathBuf) -> PathBuf {
        install_path.join("Mods")
    }

    /// Check if game is installed at path
    pub fn is_game_installed_at(path: &PathBuf) -> bool {
        let exe_path = Self::get_game_executable_path(path);
        exe_path.exists() && exe_path.is_file()
    }

    /// Get game version from executable
    pub fn get_game_version(install_path: &PathBuf) -> Option<String> {
        let exe_path = Self::get_game_executable_path(install_path);
        if !exe_path.exists() {
            return None;
        }
        
        // This would use Windows API to get file version
        // For now, return a placeholder
        Some("1.31.1.12109".to_string())
    }

    /// Get game language
    pub fn get_game_language(install_path: &PathBuf) -> Option<String> {
        let config_path = Self::get_game_config_path(install_path).join("game.cfg");
        if !config_path.exists() {
            return None;
        }
        
        // This would parse the config file
        // For now, return a placeholder
        Some("enUS".to_string())
    }

    /// Get game resolution
    pub fn get_game_resolution(install_path: &PathBuf) -> Option<(u32, u32)> {
        let config_path = Self::get_game_config_path(install_path).join("game.cfg");
        if !config_path.exists() {
            return None;
        }
        
        // This would parse the config file
        // For now, return a placeholder
        Some((1920, 1080))
    }

    /// Get game audio settings
    pub fn get_game_audio_settings(install_path: &PathBuf) -> Option<AudioSettings> {
        let config_path = Self::get_game_config_path(install_path).join("game.cfg");
        if !config_path.exists() {
            return None;
        }
        
        // This would parse the config file
        // For now, return a placeholder
        Some(AudioSettings {
            master_volume: 100,
            music_volume: 80,
            sfx_volume: 90,
            voice_volume: 85,
        })
    }

    /// Get game graphics settings
    pub fn get_game_graphics_settings(install_path: &PathBuf) -> Option<GraphicsSettings> {
        let config_path = Self::get_game_config_path(install_path).join("game.cfg");
        if !config_path.exists() {
            return None;
        }
        
        // This would parse the config file
        // For now, return a placeholder
        Some(GraphicsSettings {
            resolution: (1920, 1080),
            refresh_rate: 60,
            vsync: true,
            antialiasing: true,
            texture_quality: TextureQuality::High,
            model_quality: ModelQuality::High,
            animation_quality: AnimationQuality::High,
        })
    }
}

/// Audio settings
#[derive(Debug, Clone)]
pub struct AudioSettings {
    /// Master volume (0-100)
    pub master_volume: u8,
    /// Music volume (0-100)
    pub music_volume: u8,
    /// Sound effects volume (0-100)
    pub sfx_volume: u8,
    /// Voice volume (0-100)
    pub voice_volume: u8,
}

/// Graphics settings
#[derive(Debug, Clone)]
pub struct GraphicsSettings {
    /// Screen resolution
    pub resolution: (u32, u32),
    /// Refresh rate
    pub refresh_rate: u32,
    /// Vertical sync
    pub vsync: bool,
    /// Antialiasing
    pub antialiasing: bool,
    /// Texture quality
    pub texture_quality: TextureQuality,
    /// Model quality
    pub model_quality: ModelQuality,
    /// Animation quality
    pub animation_quality: AnimationQuality,
}

/// Texture quality levels
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TextureQuality {
    /// Low quality
    Low,
    /// Medium quality
    Medium,
    /// High quality
    High,
    /// Ultra quality
    Ultra,
}

/// Model quality levels
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelQuality {
    /// Low quality
    Low,
    /// Medium quality
    Medium,
    /// High quality
    High,
    /// Ultra quality
    Ultra,
}

/// Animation quality levels
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnimationQuality {
    /// Low quality
    Low,
    /// Medium quality
    Medium,
    /// High quality
    High,
    /// Ultra quality
    Ultra,
}

/// Game constants
pub mod constants {
    /// Game title
    pub const GAME_TITLE: &str = "Warcraft III: Reign of Chaos";
    /// Game expansion title
    pub const EXPANSION_TITLE: &str = "Warcraft III: The Frozen Throne";
    /// Game version
    pub const GAME_VERSION: &str = "1.31.1.12109";
    /// Game developer
    pub const GAME_DEVELOPER: &str = "Blizzard Entertainment";
    /// Game publisher
    pub const GAME_PUBLISHER: &str = "Blizzard Entertainment";
    /// Game release year
    pub const GAME_RELEASE_YEAR: u32 = 2002;
    /// Expansion release year
    pub const EXPANSION_RELEASE_YEAR: u32 = 2003;
    /// Maximum players in multiplayer
    pub const MAX_PLAYERS: u32 = 12;
    /// Maximum map size
    pub const MAX_MAP_SIZE: u32 = 256;
    /// Minimum map size
    pub const MIN_MAP_SIZE: u32 = 32;
}

/// Game types
pub mod types {
    /// Player race
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub enum PlayerRace {
        /// Human race
        Human,
        /// Orc race
        Orc,
        /// Undead race
        Undead,
        /// Night Elf race
        NightElf,
        /// Random race
        Random,
    }

    /// Game difficulty
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub enum GameDifficulty {
        /// Easy difficulty
        Easy,
        /// Normal difficulty
        Normal,
        /// Hard difficulty
        Hard,
        /// Insane difficulty
        Insane,
    }

    /// Game type
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub enum GameType {
        /// Single player campaign
        Campaign,
        /// Single player custom game
        Custom,
        /// Multiplayer game
        Multiplayer,
        /// Battle.net game
        BattleNet,
        /// LAN game
        Lan,
    }

    /// Game speed
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub enum GameSpeed {
        /// Slow speed
        Slow,
        /// Normal speed
        Normal,
        /// Fast speed
        Fast,
    }

    /// Map type
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub enum MapType {
        /// Melee map
        Melee,
        /// Custom map
        Custom,
        /// Campaign map
        Campaign,
        /// Scenario map
        Scenario,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_default_install_path() {
        let path = GameUtils::get_default_install_path();
        assert!(!path.to_string_lossy().is_empty());
    }

    #[test]
    fn test_get_game_executable_path() {
        let install_path = PathBuf::from("C:\\Test");
        let exe_path = GameUtils::get_game_executable_path(&install_path);
        assert_eq!(exe_path, PathBuf::from("C:\\Test\\Warcraft III.exe"));
    }

    #[test]
    fn test_get_game_data_path() {
        let install_path = PathBuf::from("C:\\Test");
        let data_path = GameUtils::get_game_data_path(&install_path);
        assert_eq!(data_path, PathBuf::from("C:\\Test\\Data"));
    }

    #[test]
    fn test_audio_settings() {
        let settings = AudioSettings {
            master_volume: 100,
            music_volume: 80,
            sfx_volume: 90,
            voice_volume: 85,
        };
        
        assert_eq!(settings.master_volume, 100);
        assert_eq!(settings.music_volume, 80);
        assert_eq!(settings.sfx_volume, 90);
        assert_eq!(settings.voice_volume, 85);
    }

    #[test]
    fn test_graphics_settings() {
        let settings = GraphicsSettings {
            resolution: (1920, 1080),
            refresh_rate: 60,
            vsync: true,
            antialiasing: true,
            texture_quality: TextureQuality::High,
            model_quality: ModelQuality::High,
            animation_quality: AnimationQuality::High,
        };
        
        assert_eq!(settings.resolution, (1920, 1080));
        assert_eq!(settings.refresh_rate, 60);
        assert!(settings.vsync);
        assert!(settings.antialiasing);
        assert_eq!(settings.texture_quality, TextureQuality::High);
    }

    #[test]
    fn test_game_constants() {
        assert_eq!(constants::GAME_TITLE, "Warcraft III: Reign of Chaos");
        assert_eq!(constants::GAME_VERSION, "1.31.1.12109");
        assert_eq!(constants::MAX_PLAYERS, 12);
        assert_eq!(constants::MAX_MAP_SIZE, 256);
    }

    #[test]
    fn test_game_types() {
        let race = types::PlayerRace::Human;
        let difficulty = types::GameDifficulty::Normal;
        let game_type = types::GameType::Multiplayer;
        
        assert!(matches!(race, types::PlayerRace::Human));
        assert!(matches!(difficulty, types::GameDifficulty::Normal));
        assert!(matches!(game_type, types::GameType::Multiplayer));
    }
}
