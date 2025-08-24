use anyhow::Result;
use log::{info, warn, error};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::time::Duration;
use chrono::Utc;

use crate::{
    HeadlessConfig, HeadlessGameState, GamePhase, GameStatus,
    memory_hooks::MemoryHookManager,
    function_hooks::FunctionHookManager,
    ai_controller::AIController,
    data_exporter::DataExporter,
    replay_system::ReplaySystem,
};

/// Headless game engine for WC2 Remastered
pub struct HeadlessGameEngine {
    config: HeadlessConfig,
    memory_hooks: Arc<MemoryHookManager>,
    function_hooks: Arc<FunctionHookManager>,
    ai_controller: Arc<AIController>,
    data_exporter: Arc<DataExporter>,
    replay_system: Arc<ReplaySystem>,
    game_state: Arc<Mutex<HeadlessGameState>>,
    running: Arc<Mutex<bool>>,
}

impl HeadlessGameEngine {
    /// Create a new headless game engine
    pub fn new(
        memory_hooks: Arc<MemoryHookManager>,
        function_hooks: Arc<FunctionHookManager>,
        ai_controller: Arc<AIController>,
        data_exporter: Arc<DataExporter>,
        replay_system: Arc<ReplaySystem>,
    ) -> Self {
        let config = HeadlessConfig::default();
        let game_state = Arc::new(Mutex::new(HeadlessGameState::default()));
        let running = Arc::new(Mutex::new(false));
        
        Self {
            config,
            memory_hooks,
            function_hooks,
            ai_controller,
            data_exporter,
            replay_system,
            game_state,
            running,
        }
    }
    
    /// Start the headless game
    pub async fn start_headless_game(&self) -> Result<()> {
        info!("🎮 Starting headless WC2 Remastered game...");
        
        // Set running flag
        *self.running.lock().await = true;
        
        // Initialize the game
        self.initialize_game().await?;
        
        // Main game loop
        self.run_game_loop().await?;
        
        // Cleanup
        self.cleanup_game().await?;
        
        info!("✅ Headless game completed successfully");
        Ok(())
    }
    
    /// Initialize the headless game
    async fn initialize_game(&self) -> Result<()> {
        info!("🔧 Initializing headless game...");
        
        // Install memory hooks
        self.memory_hooks.install_all_hooks().await?;
        info!("✅ Memory hooks installed");
        
        // Install function hooks
        self.function_hooks.install_all_hooks().await?;
        info!("✅ Function hooks installed");
        
        // Initialize AI controller
        self.ai_controller.initialize().await?;
        info!("✅ AI controller initialized");
        
        // Initialize data exporter
        self.data_exporter.initialize().await?;
        info!("✅ Data exporter initialized");
        
        // Initialize replay system
        self.replay_system.initialize().await?;
        info!("✅ Replay system initialized");
        
        // Set initial game state
        let mut game_state = self.game_state.lock().await;
        game_state.phase = GamePhase::MainMenu;
        game_state.timestamp = Utc::now();
        
        info!("🎯 Game initialized successfully");
        Ok(())
    }
    
    /// Main game loop
    async fn run_game_loop(&self) -> Result<()> {
        info!("🔄 Starting main game loop...");
        
        let start_time = std::time::Instant::now();
        let mut last_memory_update = std::time::Instant::now();
        let mut last_ai_update = std::time::Instant::now();
        let mut last_data_export = std::time::Instant::now();
        
        while *self.running.lock().await {
            let current_time = std::time::Instant::now();
            
            // Check if game duration exceeded
            if current_time.duration_since(start_time).as_secs() > self.config.max_game_duration {
                info!("⏰ Maximum game duration reached, ending game");
                break;
            }
            
            // Update memory hooks (every 100ms)
            if current_time.duration_since(last_memory_update).as_millis() >= self.config.memory_monitor_interval as u128 {
                self.update_memory_state().await?;
                last_memory_update = current_time;
            }
            
            // Update AI controller (every 500ms)
            if current_time.duration_since(last_ai_update).as_millis() >= self.config.ai_decision_interval as u128 {
                self.update_ai_controller().await?;
                last_ai_update = current_time;
            }
            
            // Export data (every 1 second)
            if current_time.duration_since(last_data_export).as_secs() >= 1 {
                self.export_game_data().await?;
                last_data_export = current_time;
            }
            
            // Check game status
            if self.should_end_game().await {
                info!("🎯 Game end condition met, ending game");
                break;
            }
            
            // Small delay to prevent excessive CPU usage
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        
        info!("🔄 Main game loop completed");
        Ok(())
    }
    
    /// Update memory state from hooks
    async fn update_memory_state(&self) -> Result<()> {
        // Get current memory state
        let memory_state = self.memory_hooks.get_current_state().await?;
        
        // Update game state
        let mut game_state = self.game_state.lock().await;
        game_state.update_from_memory(&memory_state)?;
        
        Ok(())
    }
    
    /// Update AI controller
    async fn update_ai_controller(&self) -> Result<()> {
        if !self.config.ai_control_enabled {
            return Ok(());
        }
        
        // Get current game state
        let game_state = self.game_state.lock().await.clone();
        
        // Let AI make decisions
        let ai_actions = self.ai_controller.process_game_state(&game_state).await?;
        
        // Execute AI actions
        if !ai_actions.is_empty() {
            self.execute_ai_actions(ai_actions).await?;
        }
        
        Ok(())
    }
    
    /// Export game data
    async fn export_game_data(&self) -> Result<()> {
        if !self.config.data_export_enabled {
            return Ok(());
        }
        
        // Get current game state
        let game_state = self.game_state.lock().await.clone();
        
        // Export data
        self.data_exporter.export_game_state(&game_state).await?;
        
        // Update replay system
        self.replay_system.record_game_state(&game_state).await?;
        
        Ok(())
    }
    
    /// Execute AI actions
    async fn execute_ai_actions(&self, actions: Vec<String>) -> Result<()> {
        for action in actions {
            info!("🤖 Executing AI action: {}", action);
            
            // Execute the action through function hooks
            self.function_hooks.execute_action(&action).await?;
            
            // Small delay between actions
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        
        Ok(())
    }
    
    /// Check if game should end
    async fn should_end_game(&self) -> bool {
        let game_state = self.game_state.lock().await;
        
        match game_state.game_status {
            GameStatus::Victory { .. } | GameStatus::Defeat { .. } => true,
            _ => false,
        }
    }
    
    /// Cleanup the game
    async fn cleanup_game(&self) -> Result<()> {
        info!("🧹 Cleaning up headless game...");
        
        // Set running flag to false
        *self.running.lock().await = false;
        
        // Final data export
        let game_state = self.game_state.lock().await.clone();
        self.data_exporter.export_final_state(&game_state).await?;
        
        // Generate final replay
        self.replay_system.generate_final_replay().await?;
        
        // Uninstall hooks
        self.memory_hooks.uninstall_all_hooks().await?;
        self.function_hooks.uninstall_all_hooks().await?;
        
        info!("✅ Game cleanup completed");
        Ok(())
    }
    
    /// Get current game state
    pub async fn get_game_state(&self) -> HeadlessGameState {
        self.game_state.lock().await.clone()
    }
    
    /// Update configuration
    pub fn update_config(&mut self, config: HeadlessConfig) {
        self.config = config;
    }
}

impl Default for HeadlessGameState {
    fn default() -> Self {
        Self {
            phase: GamePhase::MainMenu,
            game_time: 0,
            player_resources: PlayerResources {
                gold: 0,
                wood: 0,
                oil: 0,
            },
            units: Vec::new(),
            buildings: Vec::new(),
            map_info: MapInfo {
                width: 0,
                height: 0,
                terrain_type: String::new(),
                player_start_positions: Vec::new(),
            },
            game_status: GameStatus::InProgress,
            timestamp: Utc::now(),
        }
    }
}

impl HeadlessGameState {
    /// Update game state from memory data
    pub fn update_from_memory(&mut self, memory_data: &serde_json::Value) -> Result<()> {
        // Update game phase
        if let Some(phase) = memory_data.get("game_phase") {
            if let Some(phase_str) = phase.as_str() {
                self.phase = match phase_str {
                    "main_menu" => GamePhase::MainMenu,
                    "loading" => GamePhase::Loading,
                    "in_game" => GamePhase::InGame,
                    "paused" => GamePhase::Paused,
                    "victory" => GamePhase::Victory,
                    "defeat" => GamePhase::Defeat,
                    _ => GamePhase::MainMenu,
                };
            }
        }
        
        // Update game time
        if let Some(game_time) = memory_data.get("game_time") {
            if let Some(time) = game_time.as_u64() {
                self.game_time = time;
            }
        }
        
        // Update player resources
        if let Some(resources) = memory_data.get("player_resources") {
            if let Some(gold) = resources.get("gold").and_then(|v| v.as_u32()) {
                self.player_resources.gold = gold;
            }
            if let Some(wood) = resources.get("wood").and_then(|v| v.as_u32()) {
                self.player_resources.wood = wood;
            }
            if let Some(oil) = resources.get("oil").and_then(|v| v.as_u32()) {
                self.player_resources.oil = oil;
            }
        }
        
        // Update timestamp
        self.timestamp = Utc::now();
        
        Ok(())
    }
}
