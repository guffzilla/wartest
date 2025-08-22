use std::fs;
use std::path::Path;
use std::io::{Read, Seek, SeekFrom, Cursor};
use anyhow::Result;
use byteorder::{LittleEndian, ReadBytesExt};
use chrono::{DateTime, Utc};
use tracing::{info, warn, error};

use crate::structures::FileAnalysis;
use crate::decoder::{ReplayMetadata, ReplayInfo, GameType, PlayerInfo, Race, PlayerColor};
use super::events::{GameEvent, EventType};

/// Parser for WC2 Remastered replay files
#[derive(Clone)]
pub struct ReplayParser {
    buffer_size: usize,
}

impl ReplayParser {
    pub fn new() -> Self {
        Self {
            buffer_size: 1024 * 1024, // 1MB buffer
        }
    }

    /// Analyze a replay file and extract basic information
    pub fn analyze_file(&self, file_path: &Path) -> Result<FileAnalysis> {
        let mut file = fs::File::open(file_path)?;
        let metadata = file.metadata()?;
        let file_size = metadata.len();

        // Read file header
        let mut buffer = vec![0u8; std::cmp::min(self.buffer_size, file_size as usize)];
        file.read_exact(&mut buffer)?;

        // Try to parse as WC2 replay format
        let file_type = self.determine_file_type(file_path, &buffer);
        
        Ok(FileAnalysis {
            filename: file_path.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown")
                .to_string(),
            file_size,
            file_type,
            file_hash: self.calculate_hash(&buffer),
            header: self.parse_header(&buffer),
            patterns: self.find_patterns(&buffer),
        })
    }

    /// Parse all events from a replay file
    pub fn parse_events(&self, analysis: &FileAnalysis) -> Result<Vec<GameEvent>> {
        let mut events = Vec::new();
        
        // Read the full file
        let mut file = fs::File::open(&analysis.filename)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;

        // Parse events based on file type
        match analysis.file_type {
            crate::structures::FileType::W2RReplay => {
                events = self.parse_w2r_events(&buffer)?;
            }
            _ => {
                warn!("Unsupported file type for event parsing: {:?}", analysis.file_type);
            }
        }

        Ok(events)
    }

    /// Extract metadata from replay file
    pub fn extract_metadata(&self, analysis: &FileAnalysis) -> Result<ReplayMetadata> {
        let mut file = fs::File::open(&analysis.filename)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;

        // Parse metadata based on file type
        match analysis.file_type {
            crate::structures::FileType::W2RReplay => {
                self.parse_w2r_metadata(&buffer, analysis)
            }
            _ => {
                // Return basic metadata for unknown files
                Ok(ReplayMetadata {
                    filename: analysis.filename.clone(),
                    file_size: analysis.file_size,
                    creation_date: Utc::now(),
                    game_version: "Unknown".to_string(),
                    map_name: "Unknown".to_string(),
                    game_type: GameType::Unknown,
                    players: Vec::new(),
                    duration: std::time::Duration::from_secs(0),
                    checksum: analysis.file_hash.clone(),
                })
            }
        }
    }

    /// Extract metadata from file path
    pub fn extract_metadata_from_file(&self, file_path: &Path) -> Result<ReplayMetadata> {
        let analysis = self.analyze_file(file_path)?;
        self.extract_metadata(&analysis)
    }

    /// Scan directory for replay files
    pub fn scan_replay_directory(&self, directory: &Path) -> Result<Vec<ReplayInfo>> {
        let mut replays = Vec::new();
        
        if !directory.exists() {
            return Ok(replays);
        }

        for entry in fs::read_dir(directory)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && path.extension().map_or(false, |ext| ext == "idx") {
                if let Ok(metadata) = self.extract_metadata_from_file(&path) {
                    replays.push(ReplayInfo {
                        filename: metadata.filename,
                        file_size: metadata.file_size,
                        creation_date: metadata.creation_date,
                        map_name: metadata.map_name,
                        game_type: metadata.game_type,
                        player_count: metadata.players.len() as u8,
                        duration: metadata.duration,
                    });
                }
            }
        }

        Ok(replays)
    }

    /// Determine file type based on filename and content
    fn determine_file_type(&self, file_path: &Path, buffer: &[u8]) -> crate::structures::FileType {
        let filename = file_path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("");

        if filename.ends_with(".idx") {
            if filename.starts_with("0") && filename.len() == 13 {
                return crate::structures::FileType::W2RReplay;
            } else {
                return crate::structures::FileType::Index;
            }
        }

        // Check for magic numbers in content
        if buffer.len() >= 4 {
            let magic = &buffer[0..4];
            if magic == b"W2R\0" {
                return crate::structures::FileType::W2RReplay;
            }
        }

        crate::structures::FileType::Unknown
    }

    /// Parse file header
    fn parse_header(&self, buffer: &[u8]) -> Option<crate::structures::FileHeader> {
        if buffer.len() < 32 {
            return None;
        }

        let mut cursor = Cursor::new(&buffer[0..std::cmp::min(1024, buffer.len())]);
        
        let mut header = crate::structures::FileHeader {
            magic: Vec::new(),
            version: 0,
            file_size: 0,
            timestamp: 0,
            flags: 0,
            reserved: Vec::new(),
        };

        // Read magic number
        if buffer.len() >= 4 {
            header.magic = buffer[0..4].to_vec();
        }

        // Try to read version
        if let Ok(version) = cursor.seek(SeekFrom::Start(4)).and_then(|_| cursor.read_u32::<LittleEndian>()) {
            header.version = version;
        }

        // Try to read file size
        if let Ok(file_size) = cursor.seek(SeekFrom::Start(8)).and_then(|_| cursor.read_u32::<LittleEndian>()) {
            header.file_size = file_size;
        }

        // Try to read timestamp
        if let Ok(timestamp) = cursor.seek(SeekFrom::Start(12)).and_then(|_| cursor.read_u64::<LittleEndian>()) {
            header.timestamp = timestamp;
        }

        // Try to read flags
        if let Ok(flags) = cursor.seek(SeekFrom::Start(20)).and_then(|_| cursor.read_u32::<LittleEndian>()) {
            header.flags = flags;
        }

        Some(header)
    }

    /// Parse WC2R replay events
    fn parse_w2r_events(&self, buffer: &[u8]) -> Result<Vec<GameEvent>> {
        let mut events = Vec::new();
        let mut offset = 0;

        // Skip header (assume 64 bytes)
        offset = 64;

        while offset < buffer.len() {
            if let Some(event) = self.parse_event_at_offset(buffer, offset)? {
                let event_size = event.size as usize;
                events.push(event);
                offset += event_size;
            } else {
                break;
            }
        }

        Ok(events)
    }

    /// Parse a single event at given offset
    fn parse_event_at_offset(&self, buffer: &[u8], offset: usize) -> Result<Option<GameEvent>> {
        if offset >= buffer.len() {
            return Ok(None);
        }

        let mut cursor = Cursor::new(&buffer[offset..]);
        
        // Read event header
        let event_type = cursor.read_u8()?;
        let timestamp = cursor.read_u32::<LittleEndian>()?;
        let size = cursor.read_u16::<LittleEndian>()?;

        let event = match event_type {
            0x01 => GameEvent {
                event_type: EventType::PlayerAction,
                timestamp,
                size,
                data: buffer[offset..offset + size as usize].to_vec(),
            },
            0x02 => GameEvent {
                event_type: EventType::UnitMove,
                timestamp,
                size,
                data: buffer[offset..offset + size as usize].to_vec(),
            },
            0x03 => GameEvent {
                event_type: EventType::UnitAttack,
                timestamp,
                size,
                data: buffer[offset..offset + size as usize].to_vec(),
            },
            0x04 => GameEvent {
                event_type: EventType::BuildingConstruct,
                timestamp,
                size,
                data: buffer[offset..offset + size as usize].to_vec(),
            },
            _ => GameEvent {
                event_type: EventType::Unknown,
                timestamp,
                size,
                data: buffer[offset..offset + size as usize].to_vec(),
            },
        };

        Ok(Some(event))
    }

    /// Parse WC2R replay metadata
    fn parse_w2r_metadata(&self, buffer: &[u8], analysis: &FileAnalysis) -> Result<ReplayMetadata> {
        let mut cursor = Cursor::new(buffer);
        
        // Skip to metadata section (assume after header)
        cursor.seek(SeekFrom::Start(64))?;

        // Read basic metadata
        let game_version = self.read_string(&mut cursor, 16)?;
        let map_name = self.read_string(&mut cursor, 32)?;
        let game_type = cursor.read_u8()?;
        let player_count = cursor.read_u8()?;

        // Parse players
        let mut players = Vec::new();
        for _ in 0..player_count {
            let name = self.read_string(&mut cursor, 16)?;
            let race = cursor.read_u8()?;
            let team = cursor.read_u8()?;
            let color = cursor.read_u8()?;
            let is_winner = cursor.read_u8()? != 0;

            players.push(PlayerInfo {
                name,
                race: match race {
                    0 => Race::Human,
                    1 => Race::Orc,
                    _ => Race::Unknown,
                },
                team,
                color: match color {
                    0 => PlayerColor::Red,
                    1 => PlayerColor::Blue,
                    2 => PlayerColor::Green,
                    3 => PlayerColor::Yellow,
                    4 => PlayerColor::Purple,
                    5 => PlayerColor::Orange,
                    6 => PlayerColor::White,
                    7 => PlayerColor::Black,
                    _ => PlayerColor::Red,
                },
                is_winner,
                apm: 0.0, // Will be calculated later
            });
        }

        Ok(ReplayMetadata {
            filename: analysis.filename.clone(),
            file_size: analysis.file_size,
            creation_date: Utc::now(), // Will be extracted from file timestamp
            game_version,
            map_name,
            game_type: match game_type {
                0 => GameType::Campaign,
                1 => GameType::Skirmish,
                2 => GameType::Multiplayer,
                3 => GameType::Custom,
                _ => GameType::Unknown,
            },
            players,
            duration: std::time::Duration::from_secs(0), // Will be calculated from events
            checksum: analysis.file_hash.clone(),
        })
    }

    /// Read a fixed-length string from cursor
    fn read_string(&self, cursor: &mut Cursor<&[u8]>, length: usize) -> Result<String> {
        let mut buffer = vec![0u8; length];
        cursor.read_exact(&mut buffer)?;
        
        // Find null terminator
        let null_pos = buffer.iter().position(|&b| b == 0).unwrap_or(length);
        let string_bytes = &buffer[0..null_pos];
        
        Ok(String::from_utf8_lossy(string_bytes).to_string())
    }

    /// Calculate SHA256 hash of data
    fn calculate_hash(&self, data: &[u8]) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    /// Find patterns in data
    fn find_patterns(&self, _data: &[u8]) -> Option<Vec<crate::structures::DataPattern>> {
        // Simplified pattern finding - can be expanded
        None
    }
}
