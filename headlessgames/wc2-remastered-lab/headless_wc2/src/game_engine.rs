use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::Result;
use serde::{Serialize, Deserialize};
use log::{info, warn, error, debug};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    input_simulator: Arc<InputSimulator>,
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
        let input_simulator = Arc::new(InputSimulator::new());
        
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
        input_simulator: Arc<InputSimulator>,
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
        
        // Initialize input simulator for AI control
        // Note: We need to get a mutable reference to initialize it
        if let Some(simulator) = Arc::get_mut(&mut self.input_simulator) {
            simulator.initialize().await?;
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
        let _current_state = self.memory_hooks.get_current_state().await?;
        
        // TODO: Parse memory state and update game state
        // For now, we'll skip the actual parsing since the logic isn't implemented yet
        // let mut game_state = self.game_state.lock().await;
        // game_state.update_from_memory(&current_state);
        
        Ok(())
    }
    
    async fn update_ai_controller(&self) -> Result<()> {
        // Get current game state
        let game_state = self.game_state.lock().await.clone();
        
        // Let AI make decisions
        let actions = self.ai_controller.make_decisions(&game_state).await?;
        
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
            
            // Execute the action based on its type
            match action.as_str() {
                "navigate_to_start_game" => {
                    self.execute_game_hotkey(crate::input_simulator::GameHotkey::StartGame).await?;
                }
                "build_barracks" => {
                    self.ai_build_building("Barracks", 100, 100).await?;
                }
                "build_town_hall" => {
                    self.ai_build_building("Town Hall", 64, 64).await?;
                }
                "build_farm" => {
                    self.ai_build_building("Farm", 80, 80).await?;
                }
                "train_peasants" => {
                    self.ai_train_unit("Peasant").await?;
                }
                "train_archers" => {
                    self.ai_train_unit("Archer").await?;
                }
                "attack_move_forward" => {
                    self.ai_attack_move(200, 200).await?;
                }
                "focus_on_economy" => {
                    // Focus on economic buildings
                    self.execute_game_hotkey(crate::input_simulator::GameHotkey::BuildFarm).await?;
                }
                "focus_on_military" => {
                    // Focus on military buildings
                    self.execute_game_hotkey(crate::input_simulator::GameHotkey::BuildBarracks).await?;
                }
                "balanced_development" => {
                    // Balanced approach
                    self.execute_game_hotkey(crate::input_simulator::GameHotkey::BuildTownHall).await?;
                }
                "fast_military_build" => {
                    // Quick military build
                    self.ai_build_building("Barracks", 120, 120).await?;
                }
                "rush_attack" => {
                    // Rush attack
                    self.ai_attack_move(300, 300).await?;
                }
                "build_defensive_structures" => {
                    // Build defenses
                    self.ai_build_building("Tower", 90, 90).await?;
                }
                "expand_economy_slowly" => {
                    // Slow economic expansion
                    self.execute_game_hotkey(crate::input_simulator::GameHotkey::BuildFarm).await?;
                }
                _ => {
                    // Unknown action - log and skip
                    debug!("⚠️ Unknown AI action: {}", action);
                }
            }
            
            // Record the action for learning
            if let Some(ai_controller) = Arc::get_mut(&mut self.ai_controller.clone()) {
                ai_controller.record_learning_example(
                    "AI Decision".to_string(),
                    action.clone(),
                    "Executed".to_string(),
                    0.5, // Default success score, will be updated based on outcome
                ).await?;
            }
        }
        
        Ok(())
    }
    
    async fn export_game_data(&self) -> Result<()> {
        let game_state = self.game_state.lock().await;
        let game_state_json = serde_json::to_string(&*game_state)?;
        
        // Export in JSON format by default
        // We need to clone the data exporter to avoid borrowing issues
        let data_exporter = self.data_exporter.clone();
        data_exporter.export_game_data(&game_state_json, crate::data_exporter::ExportFormat::JSON).await?;
        
        info!("📊 Game data exported successfully");
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
    
    /// Execute a game hotkey through the input simulator
    pub async fn execute_game_hotkey(&self, hotkey: crate::input_simulator::GameHotkey) -> Result<()> {
        info!("🎯 AI executing hotkey: {:?}", hotkey);
        
        // Execute the hotkey
        self.input_simulator.execute_hotkey(hotkey.clone()).await?;
        
        // Record the action
        if self.config.enable_replay_recording {
            self.replay_system.record_ai_action(&format!("Hotkey: {:?}", hotkey)).await?;
        }
        
        Ok(())
    }
    
    /// Execute a mouse action through the input simulator
    pub async fn execute_mouse_action(&self, action: crate::input_simulator::MouseAction) -> Result<()> {
        info!("🖱️ AI executing mouse action: {:?}", action);
        
        // Execute the mouse action
        self.input_simulator.execute_mouse_action(action.clone()).await?;
        
        // Record the action
        if self.config.enable_replay_recording {
            self.replay_system.record_ai_action(&format!("Mouse: {:?}", action)).await?;
        }
        
        Ok(())
    }
    
    /// Build a building at specific coordinates
    pub async fn ai_build_building(&self, building_type: &str, x: i32, y: i32) -> Result<()> {
        info!("🏗️ AI building {} at ({}, {})", building_type, x, y);
        
        // Use the input simulator to build
        self.input_simulator.build_building(building_type, x, y).await?;
        
        // Record the action
        if self.config.enable_replay_recording {
            self.replay_system.record_ai_action(&format!("Build: {} at ({}, {})", building_type, x, y)).await?;
        }
        
        Ok(())
    }
    
    /// Train a unit
    pub async fn ai_train_unit(&self, unit_type: &str) -> Result<()> {
        info!("⚔️ AI training {}", unit_type);
        
        // Use the input simulator to train
        self.input_simulator.train_unit(unit_type).await?;
        
        // Record the action
        if self.config.enable_replay_recording {
            self.replay_system.record_ai_action(&format!("Train: {}", unit_type)).await?;
        }
        
        Ok(())
    }
    
    /// Attack move to a location
    pub async fn ai_attack_move(&self, x: i32, y: i32) -> Result<()> {
        info!("⚔️ AI attack moving to ({}, {})", x, y);
        
        // Use the input simulator to attack move
        self.input_simulator.attack_move(x, y).await?;
        
        // Record the action
        if self.config.enable_replay_recording {
            self.replay_system.record_ai_action(&format!("Attack Move: ({}, {})", x, y)).await?;
        }
        
        Ok(())
    }
    
    /// Select specific units by area
    pub async fn ai_select_units(&self, start_x: i32, start_y: i32, end_x: i32, end_y: i32) -> Result<()> {
        info!("👆 AI selecting units in area ({}, {}) to ({}, {})", start_x, start_y, end_x, end_y);

        // Execute the selection
        self.input_simulator.select_units(start_x, start_y, end_x, end_y).await?;

        // Record the action
        if self.config.enable_replay_recording {
            self.replay_system.record_ai_action(&format!("Select units: ({}, {}) to ({}, {})", start_x, start_y, end_x, end_y)).await?;
        }

        Ok(())
    }
    
    /// Get the current status of the input simulator
    pub fn get_input_status(&self) -> crate::input_simulator::InputSimulatorStatus {
        self.input_simulator.get_status()
    }
    
    async fn cleanup_game(&self) -> Result<()> {
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
        let memory_state = self.memory_hooks.read_game_memory().await?;
        
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
                match memory_hooks.read_game_memory().await {
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
}
