use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::Result;
use serde::{Serialize, Deserialize};
use log::{info, warn, error, debug};

use crate::game_engine::{HeadlessGameState, GamePhase, PlayerResources, UnitInfo, BuildingInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIStrategy {
    Aggressive,    // Focus on early attacks and military
    Defensive,     // Build up defenses and economy
    Balanced,      // Balanced approach
    Economic,      // Focus on resource gathering and building
    Rush,          // Fast military rush strategy
    Turtle,        // Defensive turtle strategy
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIDecisionContext {
    pub current_phase: GamePhase,
    pub resources: PlayerResources,
    pub unit_count: usize,
    pub building_count: usize,
    pub threat_level: ThreatLevel,
    pub resource_scarcity: ResourceScarcity,
    pub game_time: u64,
    pub map_size: (u32, u32),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ThreatLevel {
    None,
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ResourceScarcity {
    Abundant,
    Normal,
    Scarce,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrioritizedAction {
    pub action: String,
    pub priority: f64,
    pub reasoning: String,
    pub estimated_cost: u32,
    pub time_to_complete: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIPersonality {
    pub aggression_level: f64,      // 0.0 to 1.0
    pub patience_level: f64,        // 0.0 to 1.0
    pub risk_tolerance: f64,        // 0.0 to 1.0
    pub resource_efficiency: f64,   // 0.0 to 1.0
    pub adaptability: f64,          // 0.0 to 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningExample {
    pub situation: String,
    pub action_taken: String,
    pub outcome: String,
    pub success_score: f64,
    pub timestamp: u64,
}

pub struct AIController {
    strategy: AIStrategy,
    decision_interval: u64,
    last_decision_time: u64,
    personality: AIPersonality,
    action_queue: Arc<Mutex<Vec<PrioritizedAction>>>,
    learning_data: Arc<Mutex<Vec<LearningExample>>>,
}

impl AIController {
    pub async fn new() -> Result<Self> {
        info!("🤖 Initializing AI Controller...");
        
        let controller = Self {
            strategy: AIStrategy::Balanced,
            decision_interval: 1000, // 1 second
            last_decision_time: 0,
            personality: AIPersonality::default(),
            action_queue: Arc::new(Mutex::new(Vec::new())),
            learning_data: Arc::new(Mutex::new(Vec::new())),
        };
        
        info!("✅ AI Controller initialized");
        Ok(controller)
    }
    
    pub async fn initialize(&mut self) -> Result<()> {
        info!("🔧 Initializing AI Controller...");
        
        // Load learning data
        self.load_learning_data().await?;
        
        // Initialize personality based on strategy
        self.update_personality();
        
        info!("✅ AI Controller initialized");
        Ok(())
    }
    
    pub async fn make_decisions(&self, game_state: &HeadlessGameState) -> Result<Vec<String>> {
        let context = self.create_decision_context(game_state);
        let actions = self.generate_actions(&context).await?;
        let prioritized_actions = self.prioritize_actions(actions).await?;
        
        // Add to action queue
        let mut queue = self.action_queue.lock().await;
        queue.extend(prioritized_actions);
        
        // Return immediate actions to execute
        let immediate_actions = self.get_immediate_actions(&context).await?;
        
        Ok(immediate_actions)
    }
    
    fn create_decision_context(&self, game_state: &HeadlessGameState) -> AIDecisionContext {
        let threat_level = self.calculate_threat_level(game_state);
        let resource_scarcity = self.calculate_resource_scarcity(&game_state.player_resources);
        
        AIDecisionContext {
            current_phase: game_state.game_phase.clone(),
            resources: game_state.player_resources.clone(),
            unit_count: game_state.units.len(),
            building_count: game_state.buildings.len(),
            threat_level,
            resource_scarcity,
            game_time: game_state.game_time,
            map_size: (game_state.map_info.width, game_state.map_info.height),
        }
    }
    
    fn calculate_threat_level(&self, game_state: &HeadlessGameState) -> ThreatLevel {
        // Simple threat calculation based on unit count and health
        let total_health: u32 = game_state.units.iter().map(|u| u.health).sum();
        let max_health: u32 = game_state.units.iter().map(|u| u.max_health).sum();
        
        if max_health == 0 {
            return ThreatLevel::None;
        }
        
        let health_ratio = total_health as f64 / max_health as f64;
        
        match health_ratio {
            h if h > 0.8 => ThreatLevel::None,
            h if h > 0.6 => ThreatLevel::Low,
            h if h > 0.4 => ThreatLevel::Medium,
            h if h > 0.2 => ThreatLevel::High,
            _ => ThreatLevel::Critical,
        }
    }
    
    fn calculate_resource_scarcity(&self, resources: &PlayerResources) -> ResourceScarcity {
        let total_resources = resources.gold + resources.wood + resources.oil;
        
        match total_resources {
            r if r > 2000 => ResourceScarcity::Abundant,
            r if r > 1000 => ResourceScarcity::Normal,
            r if r > 500 => ResourceScarcity::Scarce,
            _ => ResourceScarcity::Critical,
        }
    }
    
    async fn generate_actions(&self, context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        match context.current_phase {
            GamePhase::MainMenu => {
                actions.extend(self.generate_menu_actions().await?);
            }
            GamePhase::InGame => {
                actions.extend(self.generate_in_game_actions(context).await?);
            }
            GamePhase::Campaign => {
                actions.extend(self.generate_campaign_actions(context).await?);
            }
            _ => {
                // Default actions for other phases
                actions.push("wait".to_string());
            }
        }
        
        Ok(actions)
    }
    
    async fn generate_menu_actions(&self) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        // Navigate to single player
        actions.push("click 400 300".to_string()); // Single Player button
        actions.push("wait 500".to_string());
        
        // Navigate to custom scenario
        actions.push("click 400 350".to_string()); // Custom Scenario button
        actions.push("wait 500".to_string());
        
        // Select first map
        actions.push("click 300 400".to_string()); // First map in list
        actions.push("wait 500".to_string());
        
        // Start game
        actions.push("click 500 500".to_string()); // Start button
        actions.push("wait 1000".to_string());
        
        Ok(actions)
    }
    
    async fn generate_in_game_actions(&self, context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        // Economic actions
        if context.resource_scarcity == ResourceScarcity::Critical {
            actions.extend(self.generate_economic_actions(context).await?);
        }
        
        // Military actions
        if context.threat_level == ThreatLevel::High || context.threat_level == ThreatLevel::Critical {
            actions.extend(self.generate_combat_actions(context).await?);
        }
        
        // Building actions
        if context.building_count < 5 {
            actions.extend(self.generate_building_actions(context).await?);
        }
        
        // Unit training
        if context.unit_count < 10 {
            actions.extend(self.generate_training_actions(context).await?);
        }
        
        // Resource gathering
        actions.extend(self.generate_resource_actions(context).await?);
        
        Ok(actions)
    }
    
    async fn generate_campaign_actions(&self, context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        // Campaign-specific logic
        match context.game_time {
            t if t < 10000 => {
                // Early game - focus on economy
                actions.push("build TownHall".to_string());
                actions.push("train Peasant".to_string());
                actions.push("train Peasant".to_string());
            }
            t if t < 30000 => {
                // Mid game - build military
                actions.push("build Barracks".to_string());
                actions.push("train Footman".to_string());
                actions.push("train Footman".to_string());
            }
            _ => {
                // Late game - attack
                actions.push("select all".to_string());
                actions.push("attack 64 64".to_string());
            }
        }
        
        Ok(actions)
    }
    
    async fn generate_economic_actions(&self, context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        if context.resources.gold < 200 {
            actions.push("build Farm".to_string());
        }
        
        if context.resources.wood < 100 {
            actions.push("train Peasant".to_string());
        }
        
        if context.resources.oil < 50 {
            actions.push("build OilRefinery".to_string());
        }
        
        Ok(actions)
    }
    
    async fn generate_combat_actions(&self, context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        // Defensive actions
        if context.threat_level == ThreatLevel::Critical {
            actions.push("build Tower".to_string());
            actions.push("build Tower".to_string());
        }
        
        // Offensive actions
        if context.unit_count > 5 {
            actions.push("select all".to_string());
            actions.push("attack 64 64".to_string());
        }
        
        Ok(actions)
    }
    
    async fn generate_building_actions(&self, context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        // Essential buildings
        if context.building_count == 0 {
            actions.push("build TownHall".to_string());
        } else if context.building_count == 1 {
            actions.push("build Farm".to_string());
        } else if context.building_count == 2 {
            actions.push("build Barracks".to_string());
        } else if context.building_count == 3 {
            actions.push("build Blacksmith".to_string());
        }
        
        Ok(actions)
    }
    
    async fn generate_training_actions(&self, context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        // Train workers first
        if context.unit_count < 3 {
            actions.push("train Peasant".to_string());
        } else if context.unit_count < 5 {
            actions.push("train Footman".to_string());
        } else if context.unit_count < 8 {
            actions.push("train Archer".to_string());
        }
        
        Ok(actions)
    }
    
    async fn generate_resource_actions(&self, context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        // Send workers to gather resources
        if context.resources.gold < 500 {
            actions.push("click 32 32".to_string()); // Gold mine
            actions.push("select 1".to_string());
            actions.push("right-click 32 32".to_string());
        }
        
        if context.resources.wood < 300 {
            actions.push("click 96 96".to_string()); // Forest
            actions.push("select 2".to_string());
            actions.push("right-click 96 96".to_string());
        }
        
        Ok(actions)
    }
    
    async fn prioritize_actions(&self, actions: Vec<String>) -> Result<Vec<PrioritizedAction>> {
        let mut prioritized = Vec::new();
        
        for action in actions {
            let priority = self.calculate_action_priority(&action).await?;
            let reasoning = self.generate_action_reasoning(&action).await?;
            
            prioritized.push(PrioritizedAction {
                action,
                priority,
                reasoning,
                estimated_cost: 0, // Mock for now
                time_to_complete: 1000, // Mock for now
            });
        }
        
        // Sort by priority (highest first)
        prioritized.sort_by(|a, b| b.priority.partial_cmp(&a.priority).unwrap());
        
        Ok(prioritized)
    }
    
    async fn calculate_action_priority(&self, action: &str) -> Result<f64> {
        let mut priority = 0.5; // Base priority
        
        // Adjust based on action type
        if action.contains("attack") {
            priority += 0.3;
        } else if action.contains("build") {
            priority += 0.2;
        } else if action.contains("train") {
            priority += 0.1;
        }
        
        // Adjust based on personality
        priority += (self.personality.aggression_level - 0.5) * 0.2;
        
        Ok(priority.max(0.0).min(1.0))
    }
    
    async fn generate_action_reasoning(&self, action: &str) -> Result<String> {
        let reasoning = match action {
            a if a.contains("attack") => "Military action required for victory",
            a if a.contains("build") => "Infrastructure needed for development",
            a if a.contains("train") => "Unit production for army building",
            a if a.contains("click") => "Navigation or selection action",
            _ => "Standard game action",
        };
        
        Ok(reasoning.to_string())
    }
    
    async fn get_immediate_actions(&self, _context: &AIDecisionContext) -> Result<Vec<String>> {
        let mut actions = Vec::new();
        
        // Return high-priority actions immediately
        let queue = self.action_queue.lock().await;
        for action in queue.iter().take(3) {
            if action.priority > 0.7 {
                actions.push(action.action.clone());
            }
        }
        
        Ok(actions)
    }
    
    pub async fn add_to_action_queue(&self, action: String, priority: f64) -> Result<()> {
        let mut queue = self.action_queue.lock().await;
        
        let prioritized_action = PrioritizedAction {
            action,
            priority,
            reasoning: "Manual action".to_string(),
            estimated_cost: 0,
            time_to_complete: 1000,
        };
        
        queue.push(prioritized_action);
        Ok(())
    }
    
    pub async fn get_next_action(&self) -> Option<String> {
        let mut queue = self.action_queue.lock().await;
        
        if let Some(action) = queue.pop() {
            Some(action.action)
        } else {
            None
        }
    }
    
    pub async fn update_personality(&mut self) {
        match self.strategy {
            AIStrategy::Aggressive => {
                self.personality.aggression_level = 0.9;
                self.personality.risk_tolerance = 0.8;
                self.personality.patience_level = 0.3;
            }
            AIStrategy::Defensive => {
                self.personality.aggression_level = 0.2;
                self.personality.risk_tolerance = 0.1;
                self.personality.patience_level = 0.9;
            }
            AIStrategy::Balanced => {
                self.personality.aggression_level = 0.5;
                self.personality.risk_tolerance = 0.5;
                self.personality.patience_level = 0.5;
            }
            AIStrategy::Economic => {
                self.personality.aggression_level = 0.1;
                self.personality.resource_efficiency = 0.9;
                self.personality.patience_level = 0.8;
            }
            AIStrategy::Rush => {
                self.personality.aggression_level = 1.0;
                self.personality.risk_tolerance = 1.0;
                self.personality.patience_level = 0.1;
            }
            AIStrategy::Turtle => {
                self.personality.aggression_level = 0.0;
                self.personality.risk_tolerance = 0.0;
                self.personality.patience_level = 1.0;
            }
        }
    }
    
    pub async fn load_learning_data(&self) -> Result<()> {
        // Mock learning data loading
        let mut learning = self.learning_data.lock().await;
        
        learning.push(LearningExample {
            situation: "Low resources".to_string(),
            action_taken: "Build Farm".to_string(),
            outcome: "Success".to_string(),
            success_score: 0.8,
            timestamp: 0,
        });
        
        Ok(())
    }
    
    pub async fn save_learning_data(&self) -> Result<()> {
        // Mock learning data saving
        let learning = self.learning_data.lock().await;
        info!("💾 Saved {} learning examples", learning.len());
        Ok(())
    }
    
    pub async fn get_status(&self) -> String {
        format!(
            "AI Controller - Strategy: {:?}, Actions Queued: {}, Personality: Aggression={:.2}, Patience={:.2}",
            self.strategy,
            self.action_queue.lock().await.len(),
            self.personality.aggression_level,
            self.personality.patience_level
        )
    }
}

impl Default for AIPersonality {
    fn default() -> Self {
        Self {
            aggression_level: 0.5,
            patience_level: 0.5,
            risk_tolerance: 0.5,
            resource_efficiency: 0.5,
            adaptability: 0.5,
        }
    }
}
