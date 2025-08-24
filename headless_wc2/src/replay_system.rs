use anyhow::Result;
use log::{info, warn, error};
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Write, BufWriter};
use std::sync::Arc;
use tokio::sync::Mutex;
use serde_json::{Value, json};
use chrono::{DateTime, Utc};
use crate::game_engine::{HeadlessGameState, GamePhase, GameStatus, UnitInfo, BuildingInfo};
use crate::function_hooks::AIAction;

/// Replay event types
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ReplayEvent {
    /// Game state change
    GameStateChange {
        timestamp: u64,
        old_phase: GamePhase,
        new_phase: GamePhase,
        description: String,
    },
    /// Unit action
    UnitAction {
        timestamp: u64,
        unit_id: u32,
        action_type: String,
        target_x: Option<i32>,
        target_y: Option<i32>,
        target_id: Option<u32>,
        description: String,
    },
    /// Building action
    BuildingAction {
        timestamp: u64,
        building_id: u32,
        action_type: String,
        description: String,
    },
    /// Resource change
    ResourceChange {
        timestamp: u64,
        resource_type: String,
        old_value: u32,
        new_value: u32,
        change_amount: i32,
        description: String,
    },
    /// AI decision
    AIDecision {
        timestamp: u64,
        decision_type: String,
        actions: Vec<String>,
        reasoning: String,
        priority: f32,
    },
    /// Combat event
    CombatEvent {
        timestamp: u64,
        attacker_id: u32,
        target_id: u32,
        damage: u32,
        result: String,
        description: String,
    },
    /// Victory/defeat condition
    GameEnd {
        timestamp: u64,
        result: GameStatus,
        reason: String,
        final_stats: GameStats,
    },
}

/// Game statistics for replay analysis
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GameStats {
    /// Total game time (seconds)
    pub total_time: u32,
    /// Units created
    pub units_created: u32,
    /// Units lost
    pub units_lost: u32,
    /// Buildings created
    pub buildings_created: u32,
    /// Buildings destroyed
    pub buildings_destroyed: u32,
    /// Resources gathered
    pub resources_gathered: HashMap<String, u32>,
    /// AI decisions made
    pub ai_decisions: u32,
    /// Combat events
    pub combat_events: u32,
    /// Victory/defeat
    pub game_result: GameStatus,
}

/// Replay metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReplayMetadata {
    /// Replay ID
    pub replay_id: String,
    /// Game start time
    pub start_time: DateTime<Utc>,
    /// Game end time
    pub end_time: Option<DateTime<Utc>>,
    /// Game duration (seconds)
    pub duration: u32,
    /// Map information
    pub map_info: MapInfo,
    /// Player information
    pub player_info: PlayerInfo,
    /// AI strategy used
    pub ai_strategy: String,
    /// Game result
    pub game_result: GameStatus,
    /// Replay version
    pub version: String,
    /// File size (bytes)
    pub file_size: u64,
    /// Checksum for integrity
    pub checksum: String,
}

/// Map information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MapInfo {
    /// Map name
    pub name: String,
    /// Map dimensions
    pub width: u32,
    pub height: u32,
    /// Map type
    pub map_type: String,
    /// Starting resources
    pub starting_resources: HashMap<String, u32>,
}

/// Player information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlayerInfo {
    /// Player name
    pub name: String,
    /// Player type (Human/AI)
    pub player_type: String,
    /// AI difficulty (if applicable)
    pub ai_difficulty: Option<String>,
    /// Starting position
    pub start_position: (u32, u32),
}

/// Replay playback state
#[derive(Debug, Clone)]
pub enum PlaybackState {
    /// Stopped
    Stopped,
    /// Playing
    Playing,
    /// Paused
    Paused,
    /// Fast forward
    FastForward { speed: f32 },
    /// Rewind
    Rewind { speed: f32 },
}

/// Replay system for WC2 Remastered
pub struct ReplaySystem {
    /// Current replay being recorded
    current_replay: Option<ReplayData>,
    /// Replay storage directory
    replay_dir: String,
    /// Replay history
    replay_history: Arc<Mutex<Vec<ReplayMetadata>>>,
    /// Playback state
    playback_state: PlaybackState,
    /// Current playback position
    playback_position: usize,
    /// Replay events buffer
    events_buffer: Arc<Mutex<Vec<ReplayEvent>>>,
    /// Recording configuration
    recording_config: RecordingConfig,
}

/// Replay data structure
#[derive(Debug, Clone)]
pub struct ReplayData {
    /// Replay metadata
    pub metadata: ReplayMetadata,
    /// Replay events
    pub events: Vec<ReplayEvent>,
    /// Game state snapshots
    pub state_snapshots: Vec<GameStateSnapshot>,
    /// Performance metrics
    pub performance_metrics: Vec<PerformanceSnapshot>,
}

/// Game state snapshot
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GameStateSnapshot {
    /// Timestamp
    pub timestamp: u64,
    /// Game state
    pub game_state: HeadlessGameState,
    /// Event index
    pub event_index: usize,
}

/// Performance snapshot
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PerformanceSnapshot {
    /// Timestamp
    pub timestamp: u64,
    /// FPS
    pub fps: f32,
    /// Memory usage
    pub memory_usage: f32,
    /// CPU usage
    pub cpu_usage: f32,
}

/// Recording configuration
#[derive(Debug, Clone)]
pub struct RecordingConfig {
    /// Record game state changes
    pub record_state_changes: bool,
    /// Record unit actions
    pub record_unit_actions: bool,
    /// Record building actions
    pub record_building_actions: bool,
    /// Record resource changes
    pub record_resource_changes: bool,
    /// Record AI decisions
    pub record_ai_decisions: bool,
    /// Record combat events
    pub record_combat_events: bool,
    /// Take state snapshots
    pub take_state_snapshots: bool,
    /// Snapshot interval (seconds)
    pub snapshot_interval: u32,
    /// Record performance metrics
    pub record_performance: bool,
    /// Performance recording interval (seconds)
    pub performance_interval: u32,
}

impl ReplaySystem {
    /// Create a new replay system
    pub fn new(replay_dir: String) -> Self {
        Self {
            current_replay: None,
            replay_dir,
            replay_history: Arc::new(Mutex::new(Vec::new())),
            playback_state: PlaybackState::Stopped,
            playback_position: 0,
            events_buffer: Arc::new(Mutex::new(Vec::new())),
            recording_config: RecordingConfig {
                record_state_changes: true,
                record_unit_actions: true,
                record_building_actions: true,
                record_resource_changes: true,
                record_ai_decisions: true,
                record_combat_events: true,
                take_state_snapshots: true,
                snapshot_interval: 5, // 5 seconds
                record_performance: true,
                performance_interval: 1, // 1 second
            },
        }
    }
    
    /// Initialize the replay system
    pub async fn initialize(&mut self) -> Result<()> {
        info!("🎬 Initializing replay system...");
        
        // Create replay directory if it doesn't exist
        fs::create_dir_all(&self.replay_dir)?;
        
        // Load replay history
        self.load_replay_history().await?;
        
        info!("✅ Replay system initialized successfully");
        Ok(())
    }
    
    /// Start recording a new replay
    pub async fn start_recording(&mut self, game_state: &HeadlessGameState, map_info: MapInfo, player_info: PlayerInfo, ai_strategy: String) -> Result<()> {
        info!("🎬 Starting new replay recording...");
        
        let replay_id = self.generate_replay_id().await?;
        let start_time = Utc::now();
        
        let metadata = ReplayMetadata {
            replay_id: replay_id.clone(),
            start_time,
            end_time: None,
            duration: 0,
            map_info,
            player_info,
            ai_strategy,
            game_result: GameStatus::InProgress,
            version: "1.0.0".to_string(),
            file_size: 0,
            checksum: "".to_string(),
        };
        
        let replay_data = ReplayData {
            metadata: metadata.clone(),
            events: Vec::new(),
            state_snapshots: Vec::new(),
            performance_metrics: Vec::new(),
        };
        
        self.current_replay = Some(replay_data);
        
        // Record initial game state
        self.record_game_state_change(game_state, GamePhase::MainMenu, GamePhase::InGame, "Game started").await?;
        
        info!("✅ Replay recording started: {}", replay_id);
        Ok(())
    }
    
    /// Stop recording current replay
    pub async fn stop_recording(&mut self, game_state: &HeadlessGameState, game_result: GameStatus) -> Result<()> {
        if let Some(ref mut replay) = self.current_replay {
            info!("🎬 Stopping replay recording...");
            
            let end_time = Utc::now();
            let duration = (end_time - replay.metadata.start_time).num_seconds() as u32;
            
            // Update metadata
            replay.metadata.end_time = Some(end_time);
            replay.metadata.duration = duration;
            replay.metadata.game_result = game_result.clone();
            
            // Record final game state
            self.record_game_state_change(game_state, GamePhase::InGame, GamePhase::Victory, "Game ended").await?;
            
            // Record game end event
            let final_stats = self.calculate_final_stats(game_state).await?;
            let game_end_event = ReplayEvent::GameEnd {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                result: game_result,
                reason: "Game completed".to_string(),
                final_stats,
            };
            
            replay.events.push(game_end_event);
            
            // Save replay
            self.save_replay(replay).await?;
            
            // Add to history
            self.replay_history.lock().await.push(replay.metadata.clone());
            
            // Clear current replay
            self.current_replay = None;
            
            info!("✅ Replay recording stopped and saved");
        }
        
        Ok(())
    }
    
    /// Record a game state change
    pub async fn record_game_state_change(&self, game_state: &HeadlessGameState, old_phase: GamePhase, new_phase: GamePhase, description: &str) -> Result<()> {
        if !self.recording_config.record_state_changes {
            return Ok(());
        }
        
        if let Some(ref replay) = self.current_replay {
            let event = ReplayEvent::GameStateChange {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                old_phase,
                new_phase,
                description: description.to_string(),
            };
            
            replay.events.push(event);
            
            // Take state snapshot if configured
            if self.recording_config.take_state_snapshots {
                self.take_state_snapshot(game_state, replay.events.len() - 1).await?;
            }
        }
        
        Ok(())
    }
    
    /// Record a unit action
    pub async fn record_unit_action(&self, unit_id: u32, action_type: &str, target_x: Option<i32>, target_y: Option<i32>, target_id: Option<u32>, description: &str) -> Result<()> {
        if !self.recording_config.record_unit_actions {
            return Ok(());
        }
        
        if let Some(ref replay) = self.current_replay {
            let event = ReplayEvent::UnitAction {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                unit_id,
                action_type: action_type.to_string(),
                target_x,
                target_y,
                target_id,
                description: description.to_string(),
            };
            
            replay.events.push(event);
        }
        
        Ok(())
    }
    
    /// Record a building action
    pub async fn record_building_action(&self, building_id: u32, action_type: &str, description: &str) -> Result<()> {
        if !self.recording_config.record_building_actions {
            return Ok(());
        }
        
        if let Some(ref replay) = self.current_replay {
            let event = ReplayEvent::BuildingAction {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                building_id,
                action_type: action_type.to_string(),
                description: description.to_string(),
            };
            
            replay.events.push(event);
        }
        
        Ok(())
    }
    
    /// Record a resource change
    pub async fn record_resource_change(&self, resource_type: &str, old_value: u32, new_value: u32, description: &str) -> Result<()> {
        if !self.recording_config.record_resource_changes {
            return Ok(());
        }
        
        if let Some(ref replay) = self.current_replay {
            let change_amount = new_value as i32 - old_value as i32;
            let event = ReplayEvent::ResourceChange {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                resource_type: resource_type.to_string(),
                old_value,
                new_value,
                change_amount,
                description: description.to_string(),
            };
            
            replay.events.push(event);
        }
        
        Ok(())
    }
    
    /// Record an AI decision
    pub async fn record_ai_decision(&self, decision_type: &str, actions: Vec<String>, reasoning: &str, priority: f32) -> Result<()> {
        if !self.recording_config.record_ai_decisions {
            return Ok(());
        }
        
        if let Some(ref replay) = self.current_replay {
            let event = ReplayEvent::AIDecision {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                decision_type: decision_type.to_string(),
                actions,
                reasoning: reasoning.to_string(),
                priority,
            };
            
            replay.events.push(event);
        }
        
        Ok(())
    }
    
    /// Record a combat event
    pub async fn record_combat_event(&self, attacker_id: u32, target_id: u32, damage: u32, result: &str, description: &str) -> Result<()> {
        if !self.recording_config.record_combat_events {
            return Ok(());
        }
        
        if let Some(ref replay) = self.current_replay {
            let event = ReplayEvent::CombatEvent {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                attacker_id,
                target_id,
                damage,
                result: result.to_string(),
                description: description.to_string(),
            };
            
            replay.events.push(event);
        }
        
        Ok(())
    }
    
    /// Take a state snapshot
    async fn take_state_snapshot(&self, game_state: &HeadlessGameState, event_index: usize) -> Result<()> {
        if let Some(ref replay) = self.current_replay {
            let snapshot = GameStateSnapshot {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                game_state: game_state.clone(),
                event_index,
            };
            
            replay.state_snapshots.push(snapshot);
        }
        
        Ok(())
    }
    
    /// Generate a unique replay ID
    async fn generate_replay_id(&self) -> Result<String> {
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let random_suffix = rand::random::<u32>() % 10000;
        Ok(format!("replay_{}_{:04}", timestamp, random_suffix))
    }
    
    /// Calculate final game statistics
    async fn calculate_final_stats(&self, game_state: &HeadlessGameState) -> Result<GameStats> {
        let mut stats = GameStats {
            total_time: game_state.game_time,
            units_created: 0,
            units_lost: 0,
            buildings_created: 0,
            buildings_destroyed: 0,
            resources_gathered: HashMap::new(),
            ai_decisions: 0,
            combat_events: 0,
            game_result: game_state.game_status.clone(),
        };
        
        // Count units and buildings
        stats.units_created = game_state.units.len() as u32;
        stats.buildings_created = game_state.buildings.len() as u32;
        
        // Count AI decisions and combat events from replay
        if let Some(ref replay) = self.current_replay {
            for event in &replay.events {
                match event {
                    ReplayEvent::AIDecision { .. } => stats.ai_decisions += 1,
                    ReplayEvent::CombatEvent { .. } => stats.combat_events += 1,
                    _ => {}
                }
            }
        }
        
        // Calculate resources gathered
        stats.resources_gathered.insert("gold".to_string(), game_state.player_resources.gold);
        stats.resources_gathered.insert("wood".to_string(), game_state.player_resources.wood);
        stats.resources_gathered.insert("oil".to_string(), game_state.player_resources.oil);
        
        Ok(stats)
    }
    
    /// Save replay to file
    async fn save_replay(&self, replay: &ReplayData) -> Result<()> {
        let filename = format!("{}.json", replay.metadata.replay_id);
        let filepath = format!("{}/{}", self.replay_dir, filename);
        
        let data = json!({
            "metadata": replay.metadata,
            "events": replay.events,
            "state_snapshots": replay.state_snapshots,
            "performance_metrics": replay.performance_metrics,
        });
        
        let file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&filepath)?;
        
        let mut writer = BufWriter::new(file);
        serde_json::to_writer_pretty(&mut writer, &data)?;
        writer.flush()?;
        
        // Update file size and checksum
        let file_size = fs::metadata(&filepath)?.len();
        let checksum = self.calculate_checksum(&filepath).await?;
        
        info!("💾 Replay saved: {} ({} bytes)", filepath, file_size);
        
        Ok(())
    }
    
    /// Calculate file checksum
    async fn calculate_checksum(&self, filepath: &str) -> Result<String> {
        // Simple checksum calculation for now
        let content = fs::read(filepath)?;
        let checksum = format!("{:x}", md5::compute(&content));
        Ok(checksum)
    }
    
    /// Load replay history
    async fn load_replay_history(&mut self) -> Result<()> {
        info!("📚 Loading replay history...");
        
        let mut history = Vec::new();
        
        if let Ok(entries) = fs::read_dir(&self.replay_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    if let Some(extension) = entry.path().extension() {
                        if extension == "json" {
                            if let Ok(content) = fs::read_to_string(entry.path()) {
                                if let Ok(data) = serde_json::from_str::<Value>(&content) {
                                    if let Some(metadata) = data.get("metadata") {
                                        if let Ok(metadata) = serde_json::from_value::<ReplayMetadata>(metadata.clone()) {
                                            history.push(metadata);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        *self.replay_history.lock().await = history;
        
        info!("✅ Loaded {} replay files", self.replay_history.lock().await.len());
        Ok(())
    }
    
    /// Load a replay for playback
    pub async fn load_replay(&mut self, replay_id: &str) -> Result<()> {
        info!("📖 Loading replay: {}", replay_id);
        
        let filepath = format!("{}/{}.json", self.replay_dir, replay_id);
        let content = fs::read_to_string(&filepath)?;
        let data: Value = serde_json::from_str(&content)?;
        
        let replay_data = ReplayData {
            metadata: serde_json::from_value(data["metadata"].clone())?,
            events: serde_json::from_value(data["events"].clone())?,
            state_snapshots: serde_json::from_value(data["state_snapshots"].clone())?,
            performance_metrics: serde_json::from_value(data["performance_metrics"].clone())?,
        };
        
        self.current_replay = Some(replay_data);
        self.playback_position = 0;
        self.playback_state = PlaybackState::Stopped;
        
        info!("✅ Replay loaded: {} events", self.current_replay.as_ref().unwrap().events.len());
        Ok(())
    }
    
    /// Start replay playback
    pub async fn start_playback(&mut self) -> Result<()> {
        if self.current_replay.is_some() {
            self.playback_state = PlaybackState::Playing;
            info!("▶️ Replay playback started");
        }
        Ok(())
    }
    
    /// Pause replay playback
    pub async fn pause_playback(&mut self) -> Result<()> {
        self.playback_state = PlaybackState::Paused;
        info!("⏸️ Replay playback paused");
        Ok(())
    }
    
    /// Stop replay playback
    pub async fn stop_playback(&mut self) -> Result<()> {
        self.playback_state = PlaybackState::Stopped;
        self.playback_position = 0;
        info!("⏹️ Replay playback stopped");
        Ok(())
    }
    
    /// Get current replay status
    pub async fn get_status(&self) -> Value {
        let mut status = serde_json::Map::new();
        
        if let Some(ref replay) = self.current_replay {
            status.insert("recording".to_string(), Value::Bool(true));
            status.insert("replay_id".to_string(), Value::String(replay.metadata.replay_id.clone()));
            status.insert("events_recorded".to_string(), Value::Number(replay.events.len().into()));
            status.insert("duration".to_string(), Value::Number(replay.metadata.duration.into()));
        } else {
            status.insert("recording".to_string(), Value::Bool(false));
        }
        
        let history = self.replay_history.lock().await;
        status.insert("total_replays".to_string(), Value::Number(history.len().into()));
        
        status.insert("playback_state".to_string(), Value::String(format!("{:?}", self.playback_state)));
        status.insert("playback_position".to_string(), Value::Number(self.playback_position.into()));
        
        Value::Object(status)
    }
    
    /// Get replay list
    pub async fn get_replay_list(&self) -> Vec<ReplayMetadata> {
        self.replay_history.lock().await.clone()
    }
    
    /// Delete a replay
    pub async fn delete_replay(&mut self, replay_id: &str) -> Result<()> {
        info!("🗑️ Deleting replay: {}", replay_id);
        
        let filepath = format!("{}/{}.json", self.replay_dir, replay_id);
        fs::remove_file(&filepath)?;
        
        // Remove from history
        let mut history = self.replay_history.lock().await;
        history.retain(|r| r.replay_id != replay_id);
        
        info!("✅ Replay deleted: {}", replay_id);
        Ok(())
    }
}

impl Default for ReplaySystem {
    fn default() -> Self {
        Self::new("replays".to_string())
    }
}
