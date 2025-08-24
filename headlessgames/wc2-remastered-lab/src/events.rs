use anyhow::Result;
use log::{info, warn, error, debug};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

use crate::game_state::{GameState, StateChange};

/// Game event for replay recording
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameEvent {
    /// Unique event ID
    pub id: u64,
    /// Event timestamp
    pub timestamp: DateTime<Utc>,
    /// Event type
    pub event_type: EventType,
    /// Event data
    pub data: EventData,
    /// Frame number when event occurred
    pub frame: u32,
    /// Game time when event occurred
    pub game_time: u32,
    /// Player who triggered the event (if applicable)
    pub player_id: Option<u8>,
    /// Additional metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Types of game events
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EventType {
    /// Game started
    GameStart,
    /// Game ended
    GameEnd,
    /// Player joined
    PlayerJoined,
    /// Player left
    PlayerLeft,
    /// Unit created
    UnitCreated,
    /// Unit destroyed
    UnitDestroyed,
    /// Unit moved
    UnitMoved,
    /// Unit attacked
    UnitAttacked,
    /// Unit received damage
    UnitDamaged,
    /// Unit healed
    UnitHealed,
    /// Building created
    BuildingCreated,
    /// Building destroyed
    BuildingDestroyed,
    /// Building damaged
    BuildingDamaged,
    /// Building repaired
    BuildingRepaired,
    /// Resource gathered
    ResourceGathered,
    /// Resource spent
    ResourceSpent,
    /// Unit trained
    UnitTrained,
    /// Research started
    ResearchStarted,
    /// Research completed
    ResearchCompleted,
    /// Player chat message
    ChatMessage,
    /// Player action (selection, orders, etc.)
    PlayerAction,
    /// Game speed changed
    GameSpeedChanged,
    /// Game paused/unpaused
    GamePaused,
    /// Victory condition met
    VictoryCondition,
    /// Custom event
    Custom(String),
}

/// Event data payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventData {
    /// No additional data
    None,
    /// Unit-related data
    Unit {
        unit_id: u32,
        unit_type: String,
        position: Option<(f32, f32)>,
        health: Option<u8>,
        owner: Option<u8>,
    },
    /// Building-related data
    Building {
        building_id: u32,
        building_type: String,
        position: Option<(f32, f32)>,
        health: Option<u8>,
        owner: Option<u8>,
    },
    /// Resource-related data
    Resource {
        resource_type: String,
        amount: u32,
        player_id: u8,
    },
    /// Position data
    Position {
        x: f32,
        y: f32,
    },
    /// Player data
    Player {
        player_id: u8,
        player_name: String,
        race: String,
    },
    /// Chat message data
    Chat {
        message: String,
        player_id: u8,
    },
    /// Action data
    Action {
        action_type: String,
        target_id: Option<u32>,
        target_position: Option<(f32, f32)>,
        parameters: HashMap<String, serde_json::Value>,
    },
    /// Custom data
    Custom(HashMap<String, serde_json::Value>),
}

/// Event recorder for WC2 Remastered
pub struct EventRecorder {
    /// Recorded events
    events: Vec<GameEvent>,
    /// Next event ID
    next_event_id: u64,
    /// Recording enabled
    recording_enabled: bool,
    /// Output file path
    output_file: Option<PathBuf>,
    /// Event filters
    event_filters: Vec<EventFilter>,
    /// Recording statistics
    stats: RecordingStats,
}

/// Event filter for selective recording
#[derive(Debug, Clone)]
pub struct EventFilter {
    /// Event types to include (empty = all)
    pub event_types: Vec<EventType>,
    /// Player IDs to include (empty = all)
    pub player_ids: Vec<u8>,
    /// Minimum importance level
    pub min_importance: EventImportance,
}

/// Event importance levels
#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum EventImportance {
    /// Low importance events
    Low = 1,
    /// Normal importance events
    Normal = 2,
    /// High importance events
    High = 3,
    /// Critical events
    Critical = 4,
}

/// Recording statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingStats {
    /// Total events recorded
    pub total_events: u64,
    /// Events by type
    pub events_by_type: HashMap<String, u64>,
    /// Events by player
    pub events_by_player: HashMap<u8, u64>,
    /// Recording start time
    pub start_time: DateTime<Utc>,
    /// Recording duration
    pub duration: chrono::Duration,
    /// Average events per second
    pub events_per_second: f64,
}

impl EventRecorder {
    /// Create a new event recorder
    pub fn new() -> Result<Self> {
        Ok(Self {
            events: Vec::new(),
            next_event_id: 1,
            recording_enabled: true,
            output_file: None,
            event_filters: Vec::new(),
            stats: RecordingStats {
                total_events: 0,
                events_by_type: HashMap::new(),
                events_by_player: HashMap::new(),
                start_time: Utc::now(),
                duration: chrono::Duration::zero(),
                events_per_second: 0.0,
            },
        })
    }

    /// Start recording events
    pub fn start_recording(&mut self, output_file: Option<PathBuf>) -> Result<()> {
        self.recording_enabled = true;
        self.output_file = output_file;
        self.stats.start_time = Utc::now();
        
        info!("🎬 Started event recording");
        if let Some(ref path) = self.output_file {
            info!("📁 Output file: {:?}", path);
        }
        
        Ok(())
    }

    /// Stop recording events
    pub fn stop_recording(&mut self) -> Result<()> {
        self.recording_enabled = false;
        self.stats.duration = Utc::now() - self.stats.start_time;
        
        if self.stats.duration.num_seconds() > 0 {
            self.stats.events_per_second = self.stats.total_events as f64 / self.stats.duration.num_seconds() as f64;
        }
        
        info!("⏹️  Stopped event recording");
        info!("📊 Recording stats: {} events, {:.2} events/sec", 
              self.stats.total_events, self.stats.events_per_second);
        
        Ok(())
    }

    /// Record events from game state changes
    pub async fn record_events(&mut self, game_state: &GameState) -> Result<()> {
        if !self.recording_enabled {
            return Ok(());
        }

        // This would be called with actual state changes
        // For now, we'll create some sample events
        
        let frame = game_state.frame;
        let game_time = game_state.game_time;
        
        // Record unit events
        for unit in &game_state.units {
            if unit.is_moving {
                self.record_event(
                    EventType::UnitMoved,
                    EventData::Unit {
                        unit_id: unit.id,
                        unit_type: format!("{:?}", unit.unit_type),
                        position: Some(unit.position),
                        health: Some(unit.health),
                        owner: Some(unit.owner),
                    },
                    frame,
                    game_time,
                    Some(unit.owner),
                )?;
            }
            
            if unit.is_attacking {
                self.record_event(
                    EventType::UnitAttacked,
                    EventData::Unit {
                        unit_id: unit.id,
                        unit_type: format!("{:?}", unit.unit_type),
                        position: Some(unit.position),
                        health: Some(unit.health),
                        owner: Some(unit.owner),
                    },
                    frame,
                    game_time,
                    Some(unit.owner),
                )?;
            }
        }
        
        // Record building events
        for building in &game_state.buildings {
            if building.construction_progress == 100 {
                self.record_event(
                    EventType::BuildingCreated,
                    EventData::Building {
                        building_id: building.id,
                        building_type: format!("{:?}", building.building_type),
                        position: Some(building.position),
                        health: Some(building.health),
                        owner: Some(building.owner),
                    },
                    frame,
                    game_time,
                    Some(building.owner),
                )?;
            }
        }
        
        Ok(())
    }

    /// Record a single event
    pub fn record_event(
        &mut self,
        event_type: EventType,
        data: EventData,
        frame: u32,
        game_time: u32,
        player_id: Option<u8>,
    ) -> Result<()> {
        if !self.recording_enabled {
            return Ok(());
        }

        // Check filters
        if !self.should_record_event(&event_type, player_id) {
            return Ok(());
        }

        let event = GameEvent {
            id: self.next_event_id,
            timestamp: Utc::now(),
            event_type: event_type.clone(),
            data,
            frame,
            game_time,
            player_id,
            metadata: HashMap::new(),
        };

        // Add to events list
        self.events.push(event.clone());
        self.next_event_id += 1;

        // Update statistics
        self.stats.total_events += 1;
        
        let event_type_str = format!("{:?}", event_type);
        *self.stats.events_by_type.entry(event_type_str).or_insert(0) += 1;
        
        if let Some(pid) = player_id {
            *self.stats.events_by_player.entry(pid).or_insert(0) += 1;
        }

        // Log event
        debug!("📝 Recorded event: {:?} at frame {}", event_type, frame);

        Ok(())
    }

    /// Check if an event should be recorded based on filters
    fn should_record_event(&self, event_type: &EventType, player_id: Option<u8>) -> bool {
        if self.event_filters.is_empty() {
            return true; // No filters = record everything
        }

        for filter in &self.event_filters {
            // Check event type filter
            if !filter.event_types.is_empty() && !filter.event_types.contains(event_type) {
                continue;
            }

            // Check player ID filter
            if !filter.player_ids.is_empty() {
                if let Some(pid) = player_id {
                    if !filter.player_ids.contains(&pid) {
                        continue;
                    }
                } else {
                    continue; // No player ID for this event
                }
            }

            return true; // Event passes this filter
        }

        false // Event doesn't pass any filter
    }

    /// Add an event filter
    pub fn add_filter(&mut self, filter: EventFilter) {
        self.event_filters.push(filter);
        info!("🔍 Added event filter");
    }

    /// Clear all event filters
    pub fn clear_filters(&mut self) {
        self.event_filters.clear();
        info!("🗑️  Cleared all event filters");
    }

    /// Get recorded events
    pub fn get_events(&self) -> &[GameEvent] {
        &self.events
    }

    /// Get events by type
    pub fn get_events_by_type(&self, event_type: &EventType) -> Vec<&GameEvent> {
        self.events.iter()
            .filter(|e| std::mem::discriminant(&e.event_type) == std::mem::discriminant(event_type))
            .collect()
    }

    /// Get events by player
    pub fn get_events_by_player(&self, player_id: u8) -> Vec<&GameEvent> {
        self.events.iter()
            .filter(|e| e.player_id == Some(player_id))
            .collect()
    }

    /// Get events in time range
    pub fn get_events_in_range(&self, start_time: DateTime<Utc>, end_time: DateTime<Utc>) -> Vec<&GameEvent> {
        self.events.iter()
            .filter(|e| e.timestamp >= start_time && e.timestamp <= end_time)
            .collect()
    }

    /// Export events to file
    pub async fn export_events(&self, file_path: &PathBuf) -> Result<()> {
        let events_json = serde_json::to_string_pretty(&self.events)?;
        std::fs::write(file_path, events_json)?;
        
        info!("💾 Exported {} events to {:?}", self.events.len(), file_path);
        Ok(())
    }

    /// Export events in replay format
    pub async fn export_replay(&self, file_path: &PathBuf) -> Result<()> {
        let replay_data = ReplayData {
            version: "1.0".to_string(),
            game_name: "Warcraft II Remastered".to_string(),
            created_at: Utc::now(),
            events: self.events.clone(),
            metadata: HashMap::new(),
        };

        let replay_json = serde_json::to_string_pretty(&replay_data)?;
        std::fs::write(file_path, replay_json)?;
        
        info!("🎮 Exported replay with {} events to {:?}", self.events.len(), file_path);
        Ok(())
    }

    /// Get recording statistics
    pub fn get_stats(&self) -> &RecordingStats {
        &self.stats
    }

    /// Clear all recorded events
    pub fn clear_events(&mut self) {
        self.events.clear();
        self.next_event_id = 1;
        self.stats.total_events = 0;
        self.stats.events_by_type.clear();
        self.stats.events_by_player.clear();
        
        info!("🗑️  Cleared all recorded events");
    }
}

/// Replay data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayData {
    /// Replay format version
    pub version: String,
    /// Game name
    pub game_name: String,
    /// When replay was created
    pub created_at: DateTime<Utc>,
    /// All recorded events
    pub events: Vec<GameEvent>,
    /// Additional metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

impl Default for EventFilter {
    fn default() -> Self {
        Self {
            event_types: Vec::new(),
            player_ids: Vec::new(),
            min_importance: EventImportance::Low,
        }
    }
}
