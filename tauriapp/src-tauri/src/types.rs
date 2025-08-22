use serde::{Deserialize, Serialize};

/// Application information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub platform: String,
    pub version: String,
    pub game_detected: bool,
}

/// Monitoring status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringStatus {
    pub is_active: bool,
    pub current_game: Option<GameResult>,
    pub total_games_monitored: u32,
}

/// Platform information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub platform: String,
    pub wine_detected: bool,
    pub recommended_paths: Vec<String>,
    pub compatibility_level: CompatibilityLevel,
}

/// Game installation information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameInstallation {
    pub path: std::path::PathBuf,
    pub version: Option<String>,
    pub launcher: Option<String>,
}

/// Game detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameDetectionResult {
    pub is_running: bool,
    pub process_info: Option<ProcessInfo>,
    pub installation_path: Option<String>,
}

/// Process information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub executable_path: Option<String>,
    pub wine_pid: Option<u32>, // For Wine processes
}

/// Compatibility level
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompatibilityLevel {
    Native,     // Windows
    Wine,       // Linux/macOS via Wine
    Virtual,    // Virtual machine
    Unsupported,
}

/// Game result data for Warcraft II multiplayer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameResult {
    pub game_id: String,
    pub timestamp: u64,
    pub map_info: MapInfo,
    pub game_settings: GameSettings,
    pub players: Vec<PlayerResult>,
    pub teams: Vec<TeamResult>,
    pub game_outcome: GameOutcome,
    pub game_duration: u32, // in seconds
    pub total_statistics: GameStatistics,
    pub upload_status: UploadStatus,
}

/// Map information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapInfo {
    pub name: String,
    pub size: String, // e.g., "128x128", "256x256"
    pub terrain_type: String, // e.g., "Forest", "Swamp", "Winter"
    pub starting_resources: StartingResources,
    pub victory_conditions: Vec<String>,
}

/// Starting resources for the map
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartingResources {
    pub starting_gold: u32,
    pub starting_lumber: u32,
    pub starting_oil: u32,
    pub gold_mines: u32,
    pub oil_wells: u32,
}

/// Game settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSettings {
    pub game_type: String, // "1v1", "2v2", "3v3", "4v4", "FFA"
    pub speed: String, // "Slow", "Normal", "Fast"
    pub starting_age: String, // "Dark Age", "Feudal Age", etc.
    pub resources: String, // "Standard", "High", "Low"
    pub population_limit: u32,
    pub reveal_map: String, // "Normal", "Explored", "All Visible"
    pub starting_units: String, // "Yes", "No"
    pub lock_teams: bool,
    pub lock_speed: bool,
}

/// Player result data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerResult {
    pub name: String,
    pub faction: Faction,
    pub team: u8,
    pub rank: String,
    pub is_host: bool,
    pub final_score: u32,
    pub rank_score: u32, // Score used for ranking calculations
    pub statistics: PlayerStatistics,
    pub outcome: PlayerOutcome,
}

/// Player statistics for ranking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerStatistics {
    pub units_trained: u32,
    pub units_destroyed: u32,
    pub structures_built: u32,
    pub structures_destroyed: u32,
    pub gold_mined: u32,
    pub lumber_harvested: u32,
    pub oil_collected: u32,
    pub units_lost: u32,
    pub structures_lost: u32,
    pub military_score: u32,
    pub economy_score: u32,
    pub technology_score: u32,
}

/// Player outcome
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlayerOutcome {
    Victory,
    Defeat,
    Draw,
    Disconnect,
}

/// Team result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamResult {
    pub team_id: u8,
    pub players: Vec<String>, // Player names
    pub faction: Faction,
    pub total_score: u32,
    pub outcome: TeamOutcome,
    pub team_statistics: TeamStatistics,
}

/// Team outcome
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TeamOutcome {
    Victory,
    Defeat,
    Draw,
}

/// Team statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamStatistics {
    pub total_units_destroyed: u32,
    pub total_structures_destroyed: u32,
    pub total_gold_mined: u32,
    pub total_lumber_harvested: u32,
    pub total_oil_collected: u32,
}

/// Game outcome
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameOutcome {
    Victory { winning_team: u8, winner_names: Vec<String> },
    Defeat { losing_team: u8, loser_names: Vec<String> },
    Draw { teams: Vec<u8> },
    Disconnect { disconnected_players: Vec<String> },
}

/// Game statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStatistics {
    pub total_units_trained: u32,
    pub total_units_destroyed: u32,
    pub total_structures_built: u32,
    pub total_structures_destroyed: u32,
    pub total_gold_mined: u32,
    pub total_lumber_harvested: u32,
    pub total_oil_collected: u32,
    pub game_duration_minutes: u32,
}

/// Faction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Faction {
    Human,
    Orc,
    Neutral,
}

/// Upload status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UploadStatus {
    Pending,
    Uploading,
    Success,
    Failed(String),
}

/// Upload result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub success: bool,
    pub games_uploaded: u32,
    pub error_message: Option<String>,
}

/// Network packet for Battle.net monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkPacket {
    pub timestamp: u64,
    pub source: String,
    pub destination: String,
    pub protocol: String,
    pub data: Vec<u8>,
    pub size: usize,
}

/// Battle.net packet types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BattleNetPacketType {
    Login,
    Chat,
    GameData,
    PlayerList,
    GameResult,
    Unknown,
}

/// Game monitoring event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameEvent {
    GameStarted { game_id: String, timestamp: u64 },
    GameEnded { game_id: String, timestamp: u64, outcome: GameOutcome },
    PlayerJoined { player_name: String, faction: Faction, team: u8 },
    PlayerLeft { player_name: String },
    GameStateChanged { new_state: String },
}

impl Default for PlayerStatistics {
    fn default() -> Self {
        Self {
            units_trained: 0,
            units_destroyed: 0,
            structures_built: 0,
            structures_destroyed: 0,
            gold_mined: 0,
            lumber_harvested: 0,
            oil_collected: 0,
            units_lost: 0,
            structures_lost: 0,
            military_score: 0,
            economy_score: 0,
            technology_score: 0,
        }
    }
}

impl Default for GameStatistics {
    fn default() -> Self {
        Self {
            total_units_trained: 0,
            total_units_destroyed: 0,
            total_structures_built: 0,
            total_structures_destroyed: 0,
            total_gold_mined: 0,
            total_lumber_harvested: 0,
            total_oil_collected: 0,
            game_duration_minutes: 0,
        }
    }
}

impl Default for TeamStatistics {
    fn default() -> Self {
        Self {
            total_units_destroyed: 0,
            total_structures_destroyed: 0,
            total_gold_mined: 0,
            total_lumber_harvested: 0,
            total_oil_collected: 0,
        }
    }
}
