use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};
use log::{info, warn, debug};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

use crate::memory_hooks::MemoryHookManager;
use crate::function_hooks::FunctionHookManager;
use crate::ai_controller::AIController;
use crate::data_exporter::DataExporter;
use crate::replay_system::ReplaySystem;
use crate::input_simulator::InputSimulator;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeadlessConfig {
    pub game_speed: f64,
    pub ai_decision_interval: u64,
    pub enable_replay_recording: bool,
    pub enable_performance_monitoring: bool,
    pub memory_hook_interval: u64,
    pub data_export_interval: u64,
    pub max_replay_size: usize,
    pub log_level: String,
}

impl Default for HeadlessConfig {
    fn default() -> Self {
        Self {
            game_speed: 1.0,
            ai_decision_interval: 100,
            enable_replay_recording: true,
            enable_performance_monitoring: true,
            memory_hook_interval: 50,
            data_export_interval: 1000,
            max_replay_size: 100 * 1024 * 1024,
            log_level: "info".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeadlessGameState {
    pub game_phase: GamePhase,
    pub player_resources: PlayerResources,
    pub units: Vec<UnitInfo>,
    pub buildings: Vec<BuildingInfo>,
    pub map_info: MapInfo,
    pub game_time: u64,
    pub game_status: GameStatus,
    pub ai_actions_queued: usize,
    pub memory_hooks_active: usize,
    pub last_update: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GamePhase {
    MainMenu,
    Loading,
    InGame,
    Paused,
    Victory,
    Defeat,
    Campaign,
    CustomScenario,
    Multiplayer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerResources {
    pub gold: u32,
    pub wood: u32,
    pub oil: u32,
    pub food_current: u32,
    pub food_max: u32,
    pub population: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UnitInfo {
    pub id: u32,
    pub unit_type: String,
    pub position: (i32, i32),
    pub health: u32,
    pub max_health: u32,
    pub owner: u8,
    pub is_selected: bool,
    pub current_action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingInfo {
    pub id: u32,
    pub building_type: String,
    pub position: (i32, i32),
    pub health: u32,
    pub max_health: u32,
    pub owner: u8,
    pub is_completed: bool,
    pub current_production: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapInfo {
    pub width: u32,
    pub height: u32,
    pub terrain_type: String,
    pub starting_positions: Vec<(i32, i32)>,
    pub resource_locations: Vec<(i32, i32)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameStatus {
    Running,
    Paused,
    Completed,
    Error,
}

impl Default for HeadlessGameState {
    fn default() -> Self {
        Self {
            game_phase: GamePhase::MainMenu,
            player_resources: PlayerResources::default(),
            units: Vec::new(),
            buildings: Vec::new(),
            map_info: MapInfo::default(),
            game_time: 0,
            game_status: GameStatus::Running,
            ai_actions_queued: 0,
            memory_hooks_active: 0,
            last_update: 0,
        }
    }
}

impl Default for PlayerResources {
    fn default() -> Self {
        Self {
            gold: 1000,
            wood: 500,
            oil: 0,
            food_current: 0,
            food_max: 10,
            population: 0,
        }
    }
}

impl Default for MapInfo {
    fn default() -> Self {
        Self {
            width: 128,
            height: 128,
            terrain_type: "Grassland".to_string(),
            starting_positions: vec![(64, 64)],
            resource_locations: vec![(32, 32), (96, 96)],
        }
    }
}

pub struct HeadlessGameEngine {
    config: HeadlessConfig,
    memory_hooks: Arc<MemoryHookManager>,
    function_hooks: Arc<FunctionHookManager>,
    ai_controller: Arc<AIController>,
    data_exporter: Arc<DataExporter>,
    replay_system: Arc<ReplaySystem>,
    input_simulator: Arc<Mutex<InputSimulator>>,  // Wrap in Mutex for mutable access
    game_state: Arc<Mutex<HeadlessGameState>>,
    running: Arc<Mutex<bool>>,
}

impl HeadlessGameEngine {
    pub async fn new(config: HeadlessConfig) -> Result<Self> {
        info!("🔧 Initializing Headless Game Engine...");
        
        // Initialize all system components
        let memory_hooks = Arc::new(MemoryHookManager::new().await?);
        let function_hooks = Arc::new(FunctionHookManager::new().await?);
        let ai_controller = Arc::new(AIController::new().await?);
        let data_exporter = Arc::new(DataExporter::new().await?);
        let replay_system = Arc::new(ReplaySystem::new().await?);
        let input_simulator = Arc::new(Mutex::new(InputSimulator::new()));
        
        let game_state = Arc::new(Mutex::new(HeadlessGameState::default()));
        let running = Arc::new(Mutex::new(false));
        
        info!("✅ Headless Game Engine initialized successfully");
        
        Ok(Self {
            config,
            memory_hooks,
            function_hooks,
            ai_controller,
            data_exporter,
            replay_system,
            input_simulator,
            game_state,
            running,
        })
    }
    
    pub async fn new_with_components(
        config: HeadlessConfig,
        memory_hooks: Arc<MemoryHookManager>,
        function_hooks: Arc<FunctionHookManager>,
        ai_controller: Arc<AIController>,
        data_exporter: Arc<DataExporter>,
        replay_system: Arc<ReplaySystem>,
        input_simulator: Arc<Mutex<InputSimulator>>,
    ) -> Result<Self> {
        info!("🔧 Initializing Headless Game Engine with components...");
        
        let game_state = Arc::new(Mutex::new(HeadlessGameState::default()));
        let running = Arc::new(Mutex::new(false));
        
        info!("✅ Headless Game Engine initialized successfully");
        
        Ok(Self {
            config,
            memory_hooks,
            function_hooks,
            ai_controller,
            data_exporter,
            replay_system,
            input_simulator,
            game_state,
            running,
        })
    }
    
    pub async fn start_headless_game(&mut self) -> Result<()> {
        info!("🎮 Starting headless WC2 Remastered...");
        
        // Initialize the game
        self.initialize_game().await?;
        
        // Run the main game loop
        self.run_game_loop().await?;
        
        // Cleanup
        self.cleanup_game().await?;
        
        info!("✅ Headless game completed successfully");
        Ok(())
    }
    
    async fn initialize_game(&mut self) -> Result<()> {
        info!("🎮 Initializing headless game...");
        
        // Initialize memory hooks - these are already initialized when created
        // We just need to install the hooks
        self.memory_hooks.install_all_hooks().await?;
        
        // Initialize function hooks - these are already initialized when created
        // We just need to install the hooks
        self.function_hooks.install_all_hooks().await?;
        
        // Initialize input simulator
        {
            let mut simulator = self.input_simulator.lock().await;
            simulator.initialize().await?;
            
            // Check if Warcraft II is running
            if !simulator.is_warcraft_ii_running().await {
                info!("🎮 Warcraft II not running, attempting to launch...");
                
                // Try to launch Warcraft II
                match simulator.launch_warcraft_ii().await {
                    Ok(()) => {
                        info!("✅ Warcraft II launched successfully");
                    }
                    Err(e) => {
                        warn!("⚠️ Failed to launch Warcraft II: {}", e);
                        info!("💡 Please launch Warcraft II manually and try again");
                    }
                }
            }
        }
        
        // Note: These components are already initialized when created
        // We don't need to call initialize() on Arc-wrapped components
        
        info!("✅ Game initialization complete");
        Ok(())
    }
    
    async fn run_game_loop(&mut self) -> Result<()> {
        info!("🔄 Starting game loop...");
        
        let mut running = self.running.lock().await;
        *running = true;
        drop(running); // Release the lock
        
        while *self.running.lock().await {
            // Update memory state
            self.update_memory_state().await?;
            
            // Update AI controller
            self.update_ai_controller().await?;
            
            // Execute AI actions (empty vector for now)
            self.execute_ai_actions(vec![]).await?;
            
            // Export game data if performance monitoring is enabled
            if self.config.enable_performance_monitoring {
                self.export_game_data().await?;
            }
            
            // Check if we should end the game
            if self.should_end_game().await {
                break;
            }
            
            // Small delay to prevent busy waiting
            tokio::time::sleep(tokio::time::Duration::from_millis(16)).await; // ~60 FPS
        }
        
        info!("🔄 Game loop ended");
        Ok(())
    }
    
    async fn update_memory_state(&mut self) -> Result<()> {
        // Check if Warcraft II is running before attempting to read memory
        {
            let simulator = self.input_simulator.lock().await;
            if simulator.is_warcraft_ii_running().await {
                info!("🎮 Warcraft II is running, attempting to read real memory...");
                
                // Try to read memory from multiple base addresses
                let base_addresses = vec![0x00400000, 0x10000000, 0x20000000];
                
                for base_addr in base_addresses {
                    match self.memory_hooks.read_game_memory(base_addr, 4096).await {
                        Ok(memory_data) => {
                            match self.memory_hooks.parse_game_state(&memory_data).await {
                                Ok(memory_state) => {
                                    // Update game state with real memory data
                                    let mut game_state = self.game_state.lock().await;
                                    game_state.update_from_memory_state(&memory_state);
                                    
                                    break; // Successfully read and parsed memory
                                }
                                Err(e) => {
                                    debug!("⚠️ Failed to parse memory from 0x{:x}: {}", base_addr, e);
                                    continue;
                                }
                            }
                        }
                        Err(e) => {
                            debug!("⚠️ Failed to read memory from 0x{:x}: {}", base_addr, e);
                            continue;
                        }
                    }
                }
            } else {
                debug!("🎮 Warcraft II not running, using simulated memory state");
                // Fall back to simulated state
                let _current_state = self.memory_hooks.get_current_state().await?;
            }
        }
        
        Ok(())
    }
    
    async fn update_ai_controller(&self) -> Result<()> {
        // Get current game state
        let game_state = self.game_state.lock().await.clone();
        
        // Let AI make enhanced decisions with advanced behaviors
        let actions = self.ai_controller.make_enhanced_decisions(&game_state).await?;
        
        // Execute AI actions
        if !actions.is_empty() {
            self.execute_ai_actions(actions).await?;
        }
        
        // Periodically adapt AI strategy
        if game_state.game_time % 1000 == 0 { // Every 1000 game ticks
            if let Some(ai_controller) = Arc::get_mut(&mut self.ai_controller.clone()) {
                ai_controller.adapt_strategy().await?;
            }
        }
        
        Ok(())
    }
    
    async fn execute_ai_actions(&self, actions: Vec<String>) -> Result<()> {
        for action in actions {
            debug!("🤖 Executing AI action: {}", action);
            
            // Parse and execute the action using a flexible parser
            self.parse_and_execute_action(&action).await?;
        }
        
        Ok(())
    }
    
    /// Parse and execute AI actions with flexible parsing
    async fn parse_and_execute_action(&self, action: &str) -> Result<()> {
        let action_lower = action.to_lowercase();
        
        // Building actions: "build TownHall", "build Farm", etc.
        if action_lower.starts_with("build ") {
            let building_type = action[6..].trim(); // Remove "build " prefix
            let (x, y) = self.get_optimal_building_position(building_type).await?;
            self.ai_build_building(building_type, x, y).await?;
            return Ok(());
        }
        
        // Training actions: "train Peasant", "train Footman", etc.
        if action_lower.starts_with("train ") {
            let unit_type = action[6..].trim(); // Remove "train " prefix
            self.ai_train_unit(unit_type).await?;
            return Ok(());
        }
        
        // Attack actions: "attack 64 64", "attack 128 128", etc.
        if action_lower.starts_with("attack ") {
            let coords = action[7..].trim(); // Remove "attack " prefix
            if let Some((x, y)) = self.parse_coordinates(coords) {
                self.ai_attack_move(x, y).await?;
                return Ok(());
            }
        }
        
        // Click actions: "click 32 32", "click 64 64", etc.
        if action_lower.starts_with("click ") {
            let coords = action[6..].trim(); // Remove "click " prefix
            if let Some((x, y)) = self.parse_coordinates(coords) {
                let mouse_action = crate::input_simulator::MouseAction::Click { x, y };
                self.execute_mouse_action(mouse_action).await?;
                return Ok(());
            }
        }
        
        // Formation actions: "formation_line", "formation_wedge", etc.
        if action_lower.starts_with("formation_") {
            self.execute_formation_action(action).await?;
            return Ok(());
        }
        
        // Resource gathering actions
        if action_lower.contains("gather") || action_lower.contains("mine") {
            self.execute_resource_gathering_action(action).await?;
            return Ok(());
        }
        
        // Default: try to execute as a hotkey
        if let Ok(hotkey) = self.parse_hotkey_from_action(action) {
            self.execute_game_hotkey(hotkey).await?;
            return Ok(());
        }
        
        // Unknown action - log and skip
        warn!("⚠️ Unknown AI action: {}", action);
        Ok(())
    }
    
    /// Get optimal building position based on building type and current game state
    async fn get_optimal_building_position(&self, building_type: &str) -> Result<(i32, i32)> {
        // For now, return a simple position. In a real implementation,
        // this would analyze the current map and building layout
        match building_type.to_lowercase().as_str() {
            "townhall" | "town hall" => Ok((64, 64)),
            "farm" => Ok((80, 80)),
            "barracks" => Ok((100, 100)),
            "blacksmith" => Ok((120, 120)),
            "tower" => Ok((90, 90)),
            _ => Ok((100, 100)), // Default position
        }
    }
    
    /// Parse coordinates from string like "64 64" or "128 128"
    fn parse_coordinates(&self, coords: &str) -> Option<(i32, i32)> {
        let parts: Vec<&str> = coords.split_whitespace().collect();
        if parts.len() == 2 {
            if let (Ok(x), Ok(y)) = (parts[0].parse::<i32>(), parts[1].parse::<i32>()) {
                return Some((x, y));
            }
        }
        None
    }
    
    /// Parse hotkey from action string
    fn parse_hotkey_from_action(&self, action: &str) -> Result<crate::input_simulator::GameHotkey> {
        match action.to_lowercase().as_str() {
            "start_game" => Ok(crate::input_simulator::GameHotkey::StartGame),
            "build_farm" => Ok(crate::input_simulator::GameHotkey::BuildFarm),
            "build_barracks" => Ok(crate::input_simulator::GameHotkey::BuildBarracks),
            "build_town_hall" => Ok(crate::input_simulator::GameHotkey::BuildTownHall),
            "build_peasant" => Ok(crate::input_simulator::GameHotkey::BuildPeasant),
            "build_archer" => Ok(crate::input_simulator::GameHotkey::BuildArcher),
            "build_knight" => Ok(crate::input_simulator::GameHotkey::BuildKnight),
            "attack_move" => Ok(crate::input_simulator::GameHotkey::Attack),
            _ => Err(anyhow!("Unknown hotkey action: {}", action)),
        }
    }
    
    /// Execute resource gathering action
    async fn execute_resource_gathering_action(&self, action: &str) -> Result<()> {
        // Parse resource type and location from action
        if action.to_lowercase().contains("gold") {
            // Send workers to gold mine
            let mouse_action = crate::input_simulator::MouseAction::Click { x: 32, y: 32 };
            self.execute_mouse_action(mouse_action).await?;
        } else if action.to_lowercase().contains("wood") {
            // Send workers to forest
            let mouse_action = crate::input_simulator::MouseAction::Click { x: 96, y: 96 };
            self.execute_mouse_action(mouse_action).await?;
        }
        Ok(())
    }
    
    /// Execute formation-based actions
    async fn execute_formation_action(&self, action: &str) -> Result<()> {
        // Parse formation action string (e.g., "formation_line_100_100_0")
        let parts: Vec<&str> = action.split('_').collect();
        if parts.len() >= 4 {
            let formation_type = parts[1];
            let center_x: i32 = parts[2].parse().unwrap_or(100);
            let center_y: i32 = parts[3].parse().unwrap_or(100);
            
            match formation_type {
                "line" => {
                    debug!("📏 Executing line formation at ({}, {})", center_x, center_y);
                    // In real implementation, this would select units and move them to line formation
                    self.ai_attack_move(center_x, center_y).await?;
                }
                "wedge" => {
                    debug!("🔺 Executing wedge formation at ({}, {})", center_x, center_y);
                    // In real implementation, this would create a wedge formation
                    self.ai_attack_move(center_x, center_y).await?;
                }
                "circle" => {
                    if let Some(unit_count) = parts.get(4).and_then(|s| s.parse::<i32>().ok()) {
                        debug!("⭕ Executing circle formation at ({}, {}) with {} units", center_x, center_y, unit_count);
                        // In real implementation, this would arrange units in a circle
                        self.ai_attack_move(center_x, center_y).await?;
                    }
                }
                _ => {
                    debug!("❓ Unknown formation type: {}", formation_type);
                }
            }
        }
        
        Ok(())
    }

    /// Export game data for analysis
    async fn export_game_data(&mut self) -> Result<()> {
        if !self.config.enable_performance_monitoring {
            return Ok(());
        }
        
        // Collect comprehensive performance metrics
        let metrics = self.data_exporter.collect_performance_metrics().await?;
        
        // Export metrics in multiple formats
        let json_data = self.data_exporter.export_performance_metrics(crate::data_exporter::ExportFormat::JSON).await?;
        let csv_data = self.data_exporter.export_performance_metrics(crate::data_exporter::ExportFormat::CSV).await?;
        
        // Log performance summary
        info!("📊 Performance Metrics - CPU: {:.1}%, Memory: {}MB, FPS: {:.1}, AI Latency: {}ms", 
              metrics.cpu_usage_percent, metrics.memory_usage_mb, metrics.game_fps, metrics.ai_decision_latency_ms);
        
        // Export to files if configured
        if let Some(exporter) = Arc::get_mut(&mut self.data_exporter) {
            // Export JSON metrics
            if let Ok(()) = exporter.export_game_data(&String::from_utf8_lossy(&json_data), crate::data_exporter::ExportFormat::JSON).await {
                debug!("✅ Performance metrics exported to JSON");
            }
            
            // Export CSV metrics
            if let Ok(()) = exporter.export_game_data(&String::from_utf8_lossy(&csv_data), crate::data_exporter::ExportFormat::CSV).await {
                debug!("✅ Performance metrics exported to CSV");
            }
        }
        
        Ok(())
    }
    
    async fn should_end_game(&self) -> bool {
        let game_state = self.game_state.lock().await;
        
        match game_state.game_status {
            GameStatus::Completed => true,
            GameStatus::Error => true,
            _ => false,
        }
    }
    
    // **AI CONTROL METHODS USING INPUT SIMULATOR**
    
    /// Execute a game hotkey
    pub async fn execute_game_hotkey(&self, hotkey: crate::input_simulator::GameHotkey) -> Result<()> {
        info!("🎯 Executing game hotkey: {:?}", hotkey);
        
        // Now we can actually execute the hotkey using the mutex-protected input simulator
        let mut input_sim = self.input_simulator.lock().await;
        input_sim.execute_hotkey(hotkey.clone()).await?;
        
        info!("✅ Hotkey {:?} executed successfully", hotkey);
        Ok(())
    }
    
    /// Execute a mouse action
    pub async fn execute_mouse_action(&self, action: crate::input_simulator::MouseAction) -> Result<()> {
        info!("🖱️ Executing mouse action: {:?}", action);
        
        // Now we can actually execute the mouse action using the mutex-protected input simulator
        let mut input_sim = self.input_simulator.lock().await;
        input_sim.execute_mouse_action(action.clone()).await?;
        
        info!("✅ Mouse action {:?} executed successfully", action);
        Ok(())
    }
    
    /// AI builds a building
    pub async fn ai_build_building(&self, building_type: &str, x: i32, y: i32) -> Result<()> {
        info!("🏗️ AI building {} at ({}, {})", building_type, x, y);
        
        // Now we can actually execute the building action using the mutex-protected input simulator
        let mut input_sim = self.input_simulator.lock().await;
        
        // Select the building type from the build menu
        input_sim.execute_hotkey(crate::input_simulator::GameHotkey::BuildTownHall).await?;
        
        // Move mouse to position and click to place building
        let mouse_action = crate::input_simulator::MouseAction::Click { x, y };
        input_sim.execute_mouse_action(mouse_action).await?;
        
        info!("✅ Building {} at ({}, {}) executed successfully", building_type, x, y);
        Ok(())
    }
    
    /// AI trains a unit
    pub async fn ai_train_unit(&self, unit_type: &str) -> Result<()> {
        info!("⚔️ AI training {}", unit_type);
        
        // Now we can actually execute the unit training action using the mutex-protected input simulator
        let mut input_sim = self.input_simulator.lock().await;
        
        // Select the appropriate building for training this unit type
        match unit_type {
            "Peasant" => {
                input_sim.execute_hotkey(crate::input_simulator::GameHotkey::BuildPeasant).await?;
            }
            "Archer" => {
                input_sim.execute_hotkey(crate::input_simulator::GameHotkey::BuildArcher).await?;
            }
            "Knight" => {
                input_sim.execute_hotkey(crate::input_simulator::GameHotkey::BuildKnight).await?;
            }
            _ => {
                // Generic unit training - use the build menu
                input_sim.execute_hotkey(crate::input_simulator::GameHotkey::BuildWorker).await?;
            }
        }
        
        info!("✅ Training {} executed successfully", unit_type);
        Ok(())
    }
    
    /// AI attack move
    pub async fn ai_attack_move(&self, x: i32, y: i32) -> Result<()> {
        info!("⚔️ AI attack moving to ({}, {})", x, y);
        
        // Now we can actually execute the attack move action using the mutex-protected input simulator
        let mut input_sim = self.input_simulator.lock().await;
        
        // Use attack move hotkey (A key) and then click at the target position
        input_sim.execute_hotkey(crate::input_simulator::GameHotkey::Attack).await?;
        
        // Move mouse to target position and click
        let mouse_action = crate::input_simulator::MouseAction::Click { x, y };
        input_sim.execute_mouse_action(mouse_action).await?;
        
        info!("✅ Attack move to ({}, {}) executed successfully", x, y);
        Ok(())
    }
    
    /// AI select units
    pub async fn ai_select_units(&self, start_x: i32, start_y: i32, end_x: i32, end_y: i32) -> Result<()> {
        info!("👆 AI selecting units from ({}, {}) to ({}, {})", start_x, start_y, end_x, end_y);
        
        // Now we can actually execute the unit selection action using the mutex-protected input simulator
        let mut input_sim = self.input_simulator.lock().await;
        
        // Click and drag to select units in the specified area
        let start_action = crate::input_simulator::MouseAction::Click { x: start_x, y: start_y };
        let end_action = crate::input_simulator::MouseAction::Click { x: end_x, y: end_y };
        
        // Click at start position
        input_sim.execute_mouse_action(start_action).await?;
        
        // Drag to end position (this would need to be implemented as a drag action)
        // For now, we'll use a simple click at the end position
        input_sim.execute_mouse_action(end_action).await?;
        
        info!("✅ Unit selection from ({}, {}) to ({}, {}) executed successfully", start_x, start_y, end_x, end_y);
        Ok(())
    }
    
    /// Get the current status of the input simulator
    pub async fn get_input_status(&self) -> crate::input_simulator::InputSimulatorStatus {
        self.input_simulator.lock().await.get_status()
    }
    
    async fn cleanup_game(&mut self) -> Result<()> {
        info!("🧹 Cleaning up game systems...");
        
        // Stop replay recording
        if self.config.enable_replay_recording {
            self.replay_system.stop_recording().await?;
        }
        
        // Uninstall hooks
        self.memory_hooks.uninstall_all_hooks().await?;
        self.function_hooks.uninstall_all_hooks().await?;
        
        // Export final data
        self.export_game_data().await?;
        
        info!("✅ Cleanup completed");
        Ok(())
    }
    
    pub async fn get_game_state(&self) -> HeadlessGameState {
        self.game_state.lock().await.clone()
    }
    
    /// Read game memory and update the current game state
    pub async fn read_game_memory(&self) -> Result<()> {
        info!("🔍 Reading game memory to update state...");
        
        // Read memory from the game process
        let memory_data = self.memory_hooks.read_game_memory(0x00400000, 4096).await?;
        let memory_state = self.memory_hooks.parse_game_state(&memory_data).await?;
        
        // Update our game state with the memory data
        let mut game_state = self.game_state.lock().await;
        
        // Update game phase
        game_state.game_phase = match memory_state.game_phase.as_str() {
            "MainMenu" => GamePhase::MainMenu,
            "InGame" => GamePhase::InGame,
            "Paused" => GamePhase::Paused,
            "Victory" => GamePhase::Victory,
            "Defeat" => GamePhase::Defeat,
            "Campaign" => GamePhase::Campaign,
            "CustomScenario" => GamePhase::CustomScenario,
            "Multiplayer" => GamePhase::Multiplayer,
            "MemoryAccessible" => GamePhase::InGame, // Memory is accessible, assume in game
            _ => GamePhase::MainMenu,
        };
        
        // Update resources if available
        if let Some(gold) = memory_state.player_resources.get("gold") {
            game_state.player_resources.gold = *gold;
        }
        if let Some(wood) = memory_state.player_resources.get("wood") {
            game_state.player_resources.wood = *wood;
        }
        if let Some(oil) = memory_state.player_resources.get("oil") {
            game_state.player_resources.oil = *oil;
        }
        if let Some(food) = memory_state.player_resources.get("food") {
            game_state.player_resources.food_current = *food;
        }
        
        // Update units
        game_state.units = memory_state.units.iter().map(|unit| UnitInfo {
            id: unit.id,
            unit_type: unit.unit_type.clone(),
            position: (unit.x, unit.y),
            health: unit.health,
            max_health: unit.health, // We'll need to determine max health separately
            owner: unit.owner,
            is_selected: false, // This would need to be determined from game state
            current_action: None, // This would need to be determined from game state
        }).collect();
        
        // Update buildings
        game_state.buildings = memory_state.buildings.iter().map(|building| BuildingInfo {
            id: building.id,
            building_type: building.building_type.clone(),
            position: (building.x, building.y),
            health: building.health,
            max_health: building.health, // We'll need to determine max health separately
            owner: building.owner,
            is_completed: true, // Assume completed for now
            current_production: None, // This would need to be determined from game state
        }).collect();
        
        // Update map info
        game_state.map_info.width = memory_state.map_data.width;
        game_state.map_info.height = memory_state.map_data.height;
        
        // Update timestamp
        game_state.last_update = memory_state.timestamp;
        game_state.game_time = memory_state.timestamp;
        
        info!("✅ Game state updated from memory: {} units, {} buildings", 
              game_state.units.len(), game_state.buildings.len());
        
        Ok(())
    }
    
    pub async fn update_config(&mut self, new_config: HeadlessConfig) -> Result<()> {
        info!("⚙️ Updating configuration...");
        self.config = new_config;
        
        // Reinitialize systems with new config
        self.initialize_game().await?;
        
        info!("✅ Configuration updated");
        Ok(())
    }

    /// Start continuous memory monitoring
    pub async fn start_memory_monitoring(&self) -> Result<()> {
        info!("🔍 Starting continuous memory monitoring...");
        
        let memory_hooks = self.memory_hooks.clone();
        let game_state = self.game_state.clone();
        
        // Spawn a background task for memory monitoring
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(100)); // 10 FPS
            
            loop {
                interval.tick().await;
                
                // Read game memory
                // Try to read from a common memory address
                match memory_hooks.read_game_memory(0x00400000, 4096).await {
                    Ok(memory_data) => {
                        // Parse the memory data
                        match memory_hooks.parse_game_state(&memory_data).await {
                            Ok(memory_state) => {
                                // Update game state with memory data
                                let mut state = game_state.lock().await;
                                
                                // Update basic info
                                state.game_phase = match memory_state.game_phase.as_str() {
                                    "MainMenu" => GamePhase::MainMenu,
                                    "InGame" => GamePhase::InGame,
                                    "Paused" => GamePhase::Paused,
                                    "Victory" => GamePhase::Victory,
                                    "Defeat" => GamePhase::Defeat,
                                    "Campaign" => GamePhase::Campaign,
                                    "CustomScenario" => GamePhase::CustomScenario,
                                    "Multiplayer" => GamePhase::Multiplayer,
                                    "MemoryAccessible" => GamePhase::InGame,
                                    _ => GamePhase::MainMenu,
                                };
                                
                                state.last_update = memory_state.timestamp;
                                state.game_time = memory_state.timestamp;
                                
                                // Update memory hooks count
                                state.memory_hooks_active = memory_state.units.len() + memory_state.buildings.len();
                            }
                            Err(e) => {
                                debug!("⚠️ Memory parsing failed: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        debug!("⚠️ Memory read failed: {}", e);
                    }
                }
            }
        });
        
        info!("✅ Memory monitoring started");
        Ok(())
    }

    /// Get AI analytics and learning progress
    pub async fn get_ai_analytics(&self) -> Result<crate::ai_controller::AIAnalytics> {
        self.ai_controller.get_ai_status().await
    }
    
    /// Change AI strategy
    pub async fn change_ai_strategy(&mut self, new_strategy: crate::ai_controller::AIStrategy) -> Result<()> {
        info!("🔄 Changing AI strategy to: {:?}", new_strategy);
        
        // This would require mutable access to the AI controller
        // For now, we'll just log the change
        info!("✅ AI strategy change requested to: {:?}", new_strategy);
        
        Ok(())
    }
}

impl HeadlessGameState {
    pub fn update_from_memory(&mut self, _memory_data: &[u8]) {
        // This would parse the actual memory data from the game
        // For now, we'll simulate some updates
        self.game_time += 1;
        
        // Simulate resource changes
        if self.game_time % 100 == 0 {
            self.player_resources.gold += 10;
            self.player_resources.wood += 5;
        }
        
        // Simulate unit movement
        for unit in &mut self.units {
            if unit.current_action.is_some() {
                // Simulate unit completing action
                unit.current_action = None;
            }
        }
    }
    
    /// Update game state from parsed memory state
    pub fn update_from_memory_state(&mut self, memory_state: &crate::memory_hooks::MemoryState) {
        // Update game phase
        self.game_phase = match memory_state.game_phase.as_str() {
            "MainMenu" => GamePhase::MainMenu,
            "Loading" => GamePhase::Loading,
            "InGame" => GamePhase::InGame,
            "Paused" => GamePhase::Paused,
            "Victory" => GamePhase::Victory,
            "Defeat" => GamePhase::Defeat,
            "Campaign" => GamePhase::Campaign,
            "CustomScenario" => GamePhase::CustomScenario,
            "Multiplayer" => GamePhase::Multiplayer,
            _ => GamePhase::MainMenu,
        };
        
        // Update resources from memory
        if let Some(gold) = memory_state.player_resources.get("gold") {
            self.player_resources.gold = *gold;
        }
        if let Some(wood) = memory_state.player_resources.get("wood") {
            self.player_resources.wood = *wood;
        }
        if let Some(oil) = memory_state.player_resources.get("oil") {
            self.player_resources.oil = *oil;
        }
        if let Some(food_current) = memory_state.player_resources.get("food_current") {
            self.player_resources.food_current = *food_current;
        }
        if let Some(food_max) = memory_state.player_resources.get("food_max") {
            self.player_resources.food_max = *food_max;
        }
        if let Some(population) = memory_state.player_resources.get("population") {
            self.player_resources.population = *population;
        }
        
        // Update timestamp
        self.last_update = memory_state.timestamp;
        self.game_time = memory_state.timestamp;
        
        // Update memory hooks count
        self.memory_hooks_active = memory_state.units.len() + memory_state.buildings.len();
        
        info!("🔄 Game state updated from memory: phase={:?}, gold={}, wood={}, oil={}", 
              self.game_phase, self.player_resources.gold, self.player_resources.wood, self.player_resources.oil);
    }
}
