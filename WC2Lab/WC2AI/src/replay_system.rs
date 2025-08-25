use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::Result;
use serde::{Serialize, Deserialize};
use log::{info, warn, error, debug};
use std::fs;
use std::path::Path;

use crate::game_engine::HeadlessGameState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ReplayEvent {
    GameStart { timestamp: u64, map_name: String, player_count: u8 },
    GameEnd { timestamp: u64, winner: u8, reason: String },
    UnitCreated { timestamp: u64, unit_id: u32, unit_type: String, position: (i32, i32), owner: u8 },
    UnitDestroyed { timestamp: u64, unit_id: u32, killer_id: Option<u32> },
    UnitMoved { timestamp: u64, unit_id: u32, from: (i32, i32), to: (i32, i32) },
    UnitAttacked { timestamp: u64, attacker_id: u32, target_id: u32, damage: u32 },
    BuildingConstructed { timestamp: u64, building_id: u32, building_type: String, position: (i32, i32), owner: u8 },
    BuildingDestroyed { timestamp: u64, building_id: u32, destroyer_id: Option<u32> },
    ResourceGathered { timestamp: u64, player_id: u8, resource_type: String, amount: u32, location: (i32, i32) },
    UnitTrained { timestamp: u64, building_id: u32, unit_type: String, cost: u32 },
    ResearchCompleted { timestamp: u64, player_id: u8, upgrade_type: String, cost: u32 },
    AIAction { timestamp: u64, action: String, reasoning: String, success: bool },
    StateChange { timestamp: u64, old_state: String, new_state: String },
    PlayerAction { timestamp: u64, player_id: u8, action_type: String, details: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStats {
    pub total_units_created: u32,
    pub total_units_destroyed: u32,
    pub total_buildings_constructed: u32,
    pub total_buildings_destroyed: u32,
    pub total_resources_gathered: HashMap<String, u32>,
    pub total_ai_actions: u32,
    pub successful_ai_actions: u32,
    pub game_duration: u64,
    pub average_fps: f64,
    pub peak_memory_usage: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayMetadata {
    pub replay_id: String,
    pub game_name: String,
    pub map_name: String,
    pub player_count: u8,
    pub game_duration: u64,
    pub total_events: usize,
    pub file_size: usize,
    pub created_at: u64,
    pub checksum: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapInfo {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub terrain_type: String,
    pub starting_positions: Vec<(i32, i32)>,
    pub resource_locations: Vec<ResourceLocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceLocation {
    pub x: i32,
    pub y: i32,
    pub resource_type: String,
    pub initial_amount: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerInfo {
    pub id: u8,
    pub name: String,
    pub race: String,
    pub color: String,
    pub final_score: u32,
    pub units_created: u32,
    pub buildings_constructed: u32,
    pub resources_gathered: HashMap<String, u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlaybackState {
    Stopped,
    Playing,
    Paused,
    FastForward,
    Rewind,
}

#[derive(Debug, Clone)]
pub struct ReplaySystem {
    pub current_replay: Arc<Mutex<Option<ReplayData>>>,
    pub replay_dir: String,
    pub replay_history: Arc<Mutex<Vec<ReplayMetadata>>>,
    pub playback_state: Arc<Mutex<PlaybackState>>,
    pub playback_position: Arc<Mutex<usize>>,
    pub events_buffer: Arc<Mutex<Vec<ReplayEvent>>>,
    pub recording_config: RecordingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayData {
    pub metadata: ReplayMetadata,
    pub map_info: MapInfo,
    pub players: Vec<PlayerInfo>,
    pub events: Vec<ReplayEvent>,
    pub game_stats: GameStats,
    pub state_snapshots: Vec<GameStateSnapshot>,
    pub performance_snapshots: Vec<PerformanceSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStateSnapshot {
    pub timestamp: u64,
    pub game_state: HeadlessGameState,
    pub event_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSnapshot {
    pub timestamp: u64,
    pub fps: f64,
    pub memory_usage: u64,
    pub cpu_usage: f64,
    pub ai_decision_time: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingConfig {
    pub auto_record: bool,
    pub record_interval: u64,
    pub max_replay_size: usize,
    pub compression_enabled: bool,
    pub include_performance_data: bool,
    pub include_ai_reasoning: bool,
    pub event_filter: Vec<String>,
}

impl ReplaySystem {
    pub async fn new() -> Result<Self> {
        info!("🎬 Initializing Replay System...");
        
        let system = Self {
            current_replay: Arc::new(Mutex::new(None)),
            replay_dir: "replays".to_string(),
            replay_history: Arc::new(Mutex::new(Vec::new())),
            playback_state: Arc::new(Mutex::new(PlaybackState::Stopped)),
            playback_position: Arc::new(Mutex::new(0)),
            events_buffer: Arc::new(Mutex::new(Vec::new())),
            recording_config: RecordingConfig::default(),
        };
        
        info!("✅ Replay System initialized");
        Ok(system)
    }
    
    pub async fn initialize(&mut self) -> Result<()> {
        info!("🔧 Initializing Replay System...");
        
        // Create replay directory
        fs::create_dir_all(&self.replay_dir)?;
        
        // Load replay history
        self.load_replay_history().await?;
        
        info!("✅ Replay System initialized");
        Ok(())
    }
    
    pub async fn start_recording(&self) -> Result<()> {
        info!("🎬 Starting replay recording...");
        
        let replay_id = self.generate_replay_id();
        let metadata = ReplayMetadata {
            replay_id: replay_id.clone(),
            game_name: "WC2 Remastered Headless".to_string(),
            map_name: "Default Map".to_string(),
            player_count: 1,
            game_duration: 0,
            total_events: 0,
            file_size: 0,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            checksum: "".to_string(),
            version: "1.0.0".to_string(),
        };
        
        let replay_data = ReplayData {
            metadata: metadata.clone(),
            map_info: MapInfo::default(),
            players: vec![PlayerInfo::default()],
            events: Vec::new(),
            game_stats: GameStats::default(),
            state_snapshots: Vec::new(),
            performance_snapshots: Vec::new(),
        };
        
        // Set current replay
        let mut current = self.current_replay.lock().await;
        *current = Some(replay_data);
        
        info!("✅ Started recording replay: {}", replay_id);
        Ok(())
    }
    
    pub async fn stop_recording(&self) -> Result<()> {
        info!("⏹️ Stopping replay recording...");
        
        let current = self.current_replay.lock().await;
        if let Some(replay) = &*current {
            // Calculate final stats
            let _final_stats = self.calculate_final_stats(replay).await?;
            
            // Save replay
            self.save_replay(replay).await?;
            
            // Add to history
            let mut history = self.replay_history.lock().await;
            history.push(replay.metadata.clone());
            
            info!("✅ Stopped recording and saved replay");
        }
        
        Ok(())
    }
    
    pub async fn record_game_state_change(&self, old_state: &HeadlessGameState, new_state: &HeadlessGameState) -> Result<()> {
        let event = ReplayEvent::StateChange {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            old_state: format!("{:?}", old_state.game_phase),
            new_state: format!("{:?}", new_state.game_phase),
        };
        
        self.record_event(event).await?;
        Ok(())
    }
    
    pub async fn record_unit_action(&self, action_type: &str, unit_id: u32, _details: String) -> Result<()> {
        let event = match action_type {
            "created" => ReplayEvent::UnitCreated {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_millis() as u64,
                unit_id,
                unit_type: "Unknown".to_string(),
                position: (0, 0),
                owner: 0,
            },
            "destroyed" => ReplayEvent::UnitDestroyed {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_millis() as u64,
                unit_id,
                killer_id: None,
            },
            "moved" => ReplayEvent::UnitMoved {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_millis() as u64,
                unit_id,
                from: (0, 0),
                to: (0, 0),
            },
            _ => return Ok(()),
        };
        
        self.record_event(event).await?;
        Ok(())
    }
    
    pub async fn record_building_action(&self, action_type: &str, building_id: u32, _details: String) -> Result<()> {
        let event = match action_type {
            "constructed" => ReplayEvent::BuildingConstructed {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_millis() as u64,
                building_id,
                building_type: "Unknown".to_string(),
                position: (0, 0),
                owner: 0,
            },
            "destroyed" => ReplayEvent::BuildingDestroyed {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_millis() as u64,
                building_id,
                destroyer_id: None,
            },
            _ => return Ok(()),
        };
        
        self.record_event(event).await?;
        Ok(())
    }
    
    pub async fn record_resource_change(&self, player_id: u8, resource_type: &str, amount: u32, location: (i32, i32)) -> Result<()> {
        let event = ReplayEvent::ResourceGathered {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            player_id,
            resource_type: resource_type.to_string(),
            amount,
            location,
        };
        
        self.record_event(event).await?;
        Ok(())
    }
    
    pub async fn record_ai_decision(&self, action: &str, reasoning: &str, success: bool) -> Result<()> {
        let event = ReplayEvent::AIAction {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            action: action.to_string(),
            reasoning: reasoning.to_string(),
            success,
        };
        
        self.record_event(event).await?;
        Ok(())
    }
    
    pub async fn record_ai_action(&self, action: &str) -> Result<()> {
        let event = ReplayEvent::AIAction {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            action: action.to_string(),
            reasoning: "AI action".to_string(),
            success: true,
        };
        
        self.record_event(event).await?;
        Ok(())
    }
    
    pub async fn record_combat_event(&self, attacker_id: u32, target_id: u32, damage: u32) -> Result<()> {
        let event = ReplayEvent::UnitAttacked {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            attacker_id,
            target_id,
            damage,
        };
        
        self.record_event(event).await?;
        Ok(())
    }
    
    async fn record_event(&self, event: ReplayEvent) -> Result<()> {
        // Add to events buffer
        let mut buffer = self.events_buffer.lock().await;
        buffer.push(event.clone());
        
        // Add to current replay if recording
        let mut current = self.current_replay.lock().await;
        if let Some(replay) = &mut *current {
            replay.events.push(event);
            replay.metadata.total_events = replay.events.len();
        }
        
        Ok(())
    }
    
    pub async fn take_state_snapshot(&self, game_state: &HeadlessGameState) -> Result<()> {
        let mut current = self.current_replay.lock().await;
        if let Some(replay) = &mut *current {
            let snapshot = GameStateSnapshot {
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_millis() as u64,
                game_state: game_state.clone(),
                event_index: replay.events.len(),
            };
            
            replay.state_snapshots.push(snapshot);
        }
        
        Ok(())
    }
    
    fn generate_replay_id(&self) -> String {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let random_bytes: [u8; 8] = rng.gen();
        hex::encode(random_bytes)
    }
    
    async fn calculate_final_stats(&self, replay: &ReplayData) -> Result<GameStats> {
        let mut stats = GameStats::default();
        
        for event in &replay.events {
            match event {
                ReplayEvent::UnitCreated { .. } => stats.total_units_created += 1,
                ReplayEvent::UnitDestroyed { .. } => stats.total_units_destroyed += 1,
                ReplayEvent::BuildingConstructed { .. } => stats.total_buildings_constructed += 1,
                ReplayEvent::BuildingDestroyed { .. } => stats.total_buildings_destroyed += 1,
                ReplayEvent::ResourceGathered { resource_type, amount, .. } => {
                    *stats.total_resources_gathered.entry(resource_type.clone()).or_insert(0) += amount;
                }
                ReplayEvent::AIAction { success, .. } => {
                    stats.total_ai_actions += 1;
                    if *success {
                        stats.successful_ai_actions += 1;
                    }
                }
                _ => {}
            }
        }
        
        stats.game_duration = replay.metadata.game_duration;
        
        Ok(stats)
    }
    
    async fn save_replay(&self, replay: &ReplayData) -> Result<()> {
        let filename = format!("{}.json", replay.metadata.replay_id);
        let filepath = Path::new(&self.replay_dir).join(&filename);
        
        let data = serde_json::to_string_pretty(replay)?;
        let _data_len = data.len();
        fs::write(&filepath, &data)?;
        
        // Update metadata with file size and checksum
        let file_size = fs::metadata(&filepath)?.len() as usize;
        let _checksum = self.calculate_checksum(&data);
        
        info!("💾 Saved replay to {} ({} bytes)", filepath.display(), file_size);
        Ok(())
    }
    
    fn calculate_checksum(&self, data: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }
    
    pub async fn load_replay_history(&self) -> Result<()> {
        let mut history = self.replay_history.lock().await;
        
        // Mock replay history for now
        history.push(ReplayMetadata {
            replay_id: "mock_replay_1".to_string(),
            game_name: "WC2 Remastered Headless".to_string(),
            map_name: "Test Map".to_string(),
            player_count: 1,
            game_duration: 300000, // 5 minutes
            total_events: 150,
            file_size: 1024 * 1024, // 1MB
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            checksum: "mock_checksum".to_string(),
            version: "1.0.0".to_string(),
        });
        
        info!("📚 Loaded {} replay records", history.len());
        Ok(())
    }
    
    pub async fn load_replay(&self, replay_id: &str) -> Result<ReplayData> {
        let filename = format!("{}.json", replay_id);
        let filepath = Path::new(&self.replay_dir).join(&filename);
        
        let data = fs::read_to_string(&filepath)?;
        let replay: ReplayData = serde_json::from_str(&data)?;
        
        info!("📖 Loaded replay: {}", replay_id);
        Ok(replay)
    }
    
    pub async fn start_playback(&self, replay_id: &str) -> Result<()> {
        info!("▶️ Starting replay playback: {}", replay_id);
        
        let _replay = self.load_replay(replay_id).await?;
        
        // Set playback state
        let mut state = self.playback_state.lock().await;
        *state = PlaybackState::Playing;
        let mut position = self.playback_position.lock().await;
        *position = 0;
        
        info!("✅ Started playback of replay: {}", replay_id);
        Ok(())
    }
    
    pub async fn pause_playback(&self) -> Result<()> {
        info!("⏸️ Pausing replay playback");
        let mut state = self.playback_state.lock().await;
        *state = PlaybackState::Paused;
        Ok(())
    }
    
    pub async fn stop_playback(&self) -> Result<()> {
        info!("⏹️ Stopping replay playback");
        let mut state = self.playback_state.lock().await;
        *state = PlaybackState::Stopped;
        let mut position = self.playback_position.lock().await;
        *position = 0;
        Ok(())
    }
    
    pub async fn get_status(&self) -> String {
        let recording = self.current_replay.lock().await.is_some();
        let state = self.playback_state.lock().await.clone();
        let position = *self.playback_position.lock().await;
        let events = self.events_buffer.lock().await.len();
        
        format!(
            "Replay System - Recording: {}, Playback: {:?}, Position: {}, Events: {}",
            recording,
            state,
            position,
            events
        )
    }
    
    pub async fn get_replay_list(&self) -> Vec<ReplayMetadata> {
        let history = self.replay_history.lock().await;
        history.clone()
    }
    
    pub async fn delete_replay(&self, replay_id: &str) -> Result<()> {
        let filename = format!("{}.json", replay_id);
        let filepath = Path::new(&self.replay_dir).join(&filename);
        
        if filepath.exists() {
            fs::remove_file(&filepath)?;
            
            // Remove from history
            let mut history = self.replay_history.lock().await;
            history.retain(|r| r.replay_id != replay_id);
            
            info!("🗑️ Deleted replay: {}", replay_id);
        }
        
        Ok(())
    }
}

impl Default for MapInfo {
    fn default() -> Self {
        Self {
            name: "Default Map".to_string(),
            width: 128,
            height: 128,
            terrain_type: "Grassland".to_string(),
            starting_positions: vec![(64, 64)],
            resource_locations: vec![
                ResourceLocation {
                    x: 32,
                    y: 32,
                    resource_type: "Gold".to_string(),
                    initial_amount: 10000,
                },
                ResourceLocation {
                    x: 96,
                    y: 96,
                    resource_type: "Wood".to_string(),
                    initial_amount: 5000,
                },
            ],
        }
    }
}

impl Default for PlayerInfo {
    fn default() -> Self {
        Self {
            id: 0,
            name: "Player 1".to_string(),
            race: "Human".to_string(),
            color: "Blue".to_string(),
            final_score: 0,
            units_created: 0,
            buildings_constructed: 0,
            resources_gathered: HashMap::new(),
        }
    }
}

impl Default for GameStats {
    fn default() -> Self {
        Self {
            total_units_created: 0,
            total_units_destroyed: 0,
            total_buildings_constructed: 0,
            total_buildings_destroyed: 0,
            total_resources_gathered: HashMap::new(),
            total_ai_actions: 0,
            successful_ai_actions: 0,
            game_duration: 0,
            average_fps: 0.0,
            peak_memory_usage: 0,
        }
    }
}

impl Default for RecordingConfig {
    fn default() -> Self {
        Self {
            auto_record: true,
            record_interval: 1000, // 1 second
            max_replay_size: 100 * 1024 * 1024, // 100MB
            compression_enabled: false,
            include_performance_data: true,
            include_ai_reasoning: true,
            event_filter: Vec::new(),
        }
    }
}
