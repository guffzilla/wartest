//! WC2 Remastered Replay Decoder
//! 
//! This module handles decoding and parsing of WC2 Remastered replay files
//! to extract game events, player actions, and game state information.

pub mod parser;
pub mod events;
pub mod game_state;

use std::path::Path;
use anyhow::Result;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

use crate::structures::FileAnalysis;

/// Main replay decoder that handles file parsing and event extraction
#[derive(Clone)]
pub struct ReplayDecoder {
    parser: parser::ReplayParser,
    game_state: game_state::GameState,
}

impl ReplayDecoder {
    pub fn new() -> Self {
        Self {
            parser: parser::ReplayParser::new(),
            game_state: game_state::GameState::new(),
        }
    }

    /// Decode a replay file and extract all game events
    pub fn decode_replay(&self, file_path: &Path) -> Result<DecodedReplay> {
        let analysis = self.parser.analyze_file(file_path)?;
        let events = self.parser.parse_events(&analysis)?;
        let metadata = self.parser.extract_metadata(&analysis)?;
        
        Ok(DecodedReplay {
            metadata,
            events,
            game_state: self.game_state.clone(),
            analysis,
        })
    }

    /// Get replay metadata without full decoding
    pub fn get_metadata(&self, file_path: &Path) -> Result<ReplayMetadata> {
        self.parser.extract_metadata_from_file(file_path)
    }

    /// List all available replays in a directory
    pub fn list_replays(&self, directory: &Path) -> Result<Vec<ReplayInfo>> {
        self.parser.scan_replay_directory(directory)
    }
}

/// Complete decoded replay with all events and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodedReplay {
    pub metadata: ReplayMetadata,
    pub events: Vec<events::GameEvent>,
    pub game_state: game_state::GameState,
    pub analysis: FileAnalysis,
}

/// Replay metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayMetadata {
    pub filename: String,
    pub file_size: u64,
    pub creation_date: DateTime<Utc>,
    pub game_version: String,
    pub map_name: String,
    pub game_type: GameType,
    pub players: Vec<PlayerInfo>,
    pub duration: std::time::Duration,
    pub checksum: String,
}

/// Basic replay information for listing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayInfo {
    pub filename: String,
    pub file_size: u64,
    pub creation_date: DateTime<Utc>,
    pub map_name: String,
    pub game_type: GameType,
    pub player_count: u8,
    pub duration: std::time::Duration,
}

/// Player information from replay
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerInfo {
    pub name: String,
    pub race: Race,
    pub team: u8,
    pub color: PlayerColor,
    pub is_winner: bool,
    pub apm: f32, // Actions per minute
}

/// Game types supported by WC2 Remastered
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameType {
    Campaign,
    Skirmish,
    Multiplayer,
    Custom,
    Unknown,
}

/// Player races in WC2
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Race {
    Human,
    Orc,
    Unknown,
}

/// Player colors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlayerColor {
    Red,
    Blue,
    Green,
    Yellow,
    Purple,
    Orange,
    White,
    Black,
}
