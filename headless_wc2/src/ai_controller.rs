use anyhow::Result;
use log::{info, warn, error};
use std::sync::Arc;
use tokio::sync::Mutex;
use serde_json::Value;
use crate::game_engine::{HeadlessGameState, GamePhase, PlayerResources, UnitInfo, BuildingInfo};
use crate::function_hooks::AIAction;

/// AI decision making strategies
#[derive(Debug, Clone)]
pub enum AIStrategy {
    /// Passive AI that only responds to threats
    Passive,
    /// Aggressive AI that actively seeks combat
    Aggressive,
    /// Economic AI that focuses on resource gathering
    Economic,
    /// Balanced AI that adapts to the situation
    Balanced,
    /// Custom AI with specific parameters
    Custom { aggression: f32, economy_focus: f32, defense_focus: f32 },
}

/// AI decision context
#[derive(Debug, Clone)]
pub struct AIDecisionContext {
    /// Current game state
    pub game_state: HeadlessGameState,
    /// Available resources
    pub resources: PlayerResources,
    /// Current units
    pub units: Vec<UnitInfo>,
    /// Current buildings
    pub buildings: Vec<BuildingInfo>,
    /// Game time
    pub game_time: u32,
    /// Threat level (0.0 to 1.0)
    pub threat_level: f32,
    /// Resource scarcity (0.0 to 1.0)
    pub resource_scarcity: f32,
}

/// AI action with priority and reasoning
#[derive(Debug, Clone)]
pub struct PrioritizedAction {
    /// The AI action to execute
    pub action: AIAction,
    /// Priority score (higher = more important)
    pub priority: f32,
    /// Reasoning for this action
    pub reasoning: String,
}

/// AI Controller for WC2 Remastered
pub struct AIController {
    /// Current AI strategy
    strategy: AIStrategy,
    /// Decision making interval (milliseconds)
    decision_interval: u64,
    /// Last decision time
    last_decision_time: u64,
    /// AI personality parameters
    personality: AIPersonality,
    /// Action queue
    action_queue: Arc<Mutex<Vec<PrioritizedAction>>>,
    /// Learning data
    learning_data: Arc<Mutex<Vec<LearningExample>>>,
}

/// AI personality traits
#[derive(Debug, Clone)]
pub struct AIPersonality {
    /// Aggression level (0.0 to 1.0)
    pub aggression: f32,
    /// Economic focus (0.0 to 1.0)
    pub economy_focus: f32,
    /// Defense focus (0.0 to 1.0)
    pub defense_focus: f32,
    /// Risk tolerance (0.0 to 1.0)
    pub risk_tolerance: f32,
    /// Adaptability (0.0 to 1.0)
    pub adaptability: f32,
}

/// Learning example for AI improvement
#[derive(Debug, Clone)]
pub struct LearningExample {
    /// Game state when decision was made
    pub game_state: HeadlessGameState,
    /// Action taken
    pub action: AIAction,
    /// Outcome (success/failure)
    pub outcome: bool,
    /// Reward score
    pub reward: f32,
    /// Timestamp
    pub timestamp: u64,
}

impl AIController {
    /// Create a new AI controller
    pub fn new(strategy: AIStrategy) -> Self {
        let personality = match &strategy {
            AIStrategy::Passive => AIPersonality {
                aggression: 0.2,
                economy_focus: 0.6,
                defense_focus: 0.8,
                risk_tolerance: 0.3,
                adaptability: 0.7,
            },
            AIStrategy::Aggressive => AIPersonality {
                aggression: 0.9,
                economy_focus: 0.4,
                defense_focus: 0.3,
                risk_tolerance: 0.8,
                adaptability: 0.6,
            },
            AIStrategy::Economic => AIPersonality {
                aggression: 0.3,
                economy_focus: 0.9,
                defense_focus: 0.5,
                risk_tolerance: 0.4,
                adaptability: 0.8,
            },
            AIStrategy::Balanced => AIPersonality {
                aggression: 0.6,
                economy_focus: 0.7,
                defense_focus: 0.6,
                risk_tolerance: 0.6,
                adaptability: 0.8,
            },
            AIStrategy::Custom { aggression, economy_focus, defense_focus } => AIPersonality {
                aggression: *aggression,
                economy_focus: *economy_focus,
                defense_focus: *defense_focus,
                risk_tolerance: 0.5,
                adaptability: 0.7,
            },
        };

        Self {
            strategy,
            decision_interval: 1000, // 1 second
            last_decision_time: 0,
            personality,
            action_queue: Arc::new(Mutex::new(Vec::new())),
            learning_data: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    /// Initialize the AI controller
    pub async fn initialize(&mut self) -> Result<()> {
        info!("🤖 Initializing AI controller with strategy: {:?}", self.strategy);
        
        // Load any saved learning data
        self.load_learning_data().await?;
        
        // Initialize personality based on strategy
        self.update_personality();
        
        info!("✅ AI controller initialized successfully");
        Ok(())
    }
    
    /// Make AI decisions based on current game state
    pub async fn make_decisions(&mut self, game_state: &HeadlessGameState) -> Result<Vec<AIAction>> {
        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // Check if it's time to make decisions
        if current_time - self.last_decision_time < self.decision_interval {
            return Ok(Vec::new());
        }
        
        self.last_decision_time = current_time;
        
        info!("🧠 AI making decisions for game state: {:?}", game_state.phase);
        
        // Create decision context
        let context = self.create_decision_context(game_state).await?;
        
        // Generate actions based on strategy and personality
        let actions = self.generate_actions(&context).await?;
        
        // Prioritize actions
        let prioritized_actions = self.prioritize_actions(actions, &context).await?;
        
        // Add to action queue
        self.add_to_action_queue(prioritized_actions).await?;
        
        // Return immediate actions (high priority)
        let immediate_actions: Vec<AIAction> = self.action_queue.lock().await
            .iter()
            .filter(|pa| pa.priority > 0.8)
            .map(|pa| pa.action.clone())
            .collect();
        
        info!("✅ AI generated {} actions, {} immediate", 
               self.action_queue.lock().await.len(), immediate_actions.len());
        
        Ok(immediate_actions)
    }
    
    /// Create decision context from game state
    async fn create_decision_context(&self, game_state: &HeadlessGameState) -> Result<AIDecisionContext> {
        let threat_level = self.calculate_threat_level(game_state).await?;
        let resource_scarcity = self.calculate_resource_scarcity(game_state).await?;
        
        Ok(AIDecisionContext {
            game_state: game_state.clone(),
            resources: game_state.player_resources.clone(),
            units: game_state.units.clone(),
            buildings: game_state.buildings.clone(),
            game_time: game_state.game_time,
            threat_level,
            resource_scarcity,
        })
    }
    
    /// Calculate current threat level
    async fn calculate_threat_level(&self, game_state: &HeadlessGameState) -> Result<f32> {
        // Simple threat calculation based on unit count and game phase
        let base_threat = match game_state.phase {
            GamePhase::MainMenu => 0.0,
            GamePhase::InGame => 0.3,
            GamePhase::Combat => 0.8,
            GamePhase::Victory => 0.0,
            GamePhase::Defeat => 0.0,
        };
        
        // Adjust based on unit count
        let unit_threat = (game_state.units.len() as f32 / 50.0).min(1.0);
        
        Ok((base_threat + unit_threat) / 2.0)
    }
    
    /// Calculate resource scarcity
    async fn calculate_resource_scarcity(&self, game_state: &HeadlessGameState) -> Result<f32> {
        let resources = &game_state.player_resources;
        
        // Calculate scarcity based on resource levels
        let gold_scarcity = if resources.gold < 100 { 1.0 } else { 0.0 };
        let wood_scarcity = if resources.wood < 50 { 1.0 } else { 0.0 };
        let oil_scarcity = if resources.oil < 25 { 1.0 } else { 0.0 };
        
        Ok((gold_scarcity + wood_scarcity + oil_scarcity) / 3.0)
    }
    
    /// Generate AI actions based on context
    async fn generate_actions(&self, context: &AIDecisionContext) -> Result<Vec<AIAction>> {
        let mut actions = Vec::new();
        
        match context.game_state.phase {
            GamePhase::MainMenu => {
                // Start a game if we're in main menu
                actions.push(AIAction::Click { x: 400, y: 300 }); // Example coordinates
            }
            GamePhase::InGame => {
                // Generate in-game actions based on personality
                actions.extend(self.generate_in_game_actions(context).await?);
            }
            GamePhase::Combat => {
                // Generate combat actions
                actions.extend(self.generate_combat_actions(context).await?);
            }
            _ => {}
        }
        
        Ok(actions)
    }
    
    /// Generate in-game actions
    async fn generate_in_game_actions(&self, context: &AIDecisionContext) -> Result<Vec<AIAction>> {
        let mut actions = Vec::new();
        
        // Economic actions based on personality
        if self.personality.economy_focus > 0.7 && context.resource_scarcity > 0.5 {
            if context.resources.gold < 100 {
                actions.push(AIAction::Build { building_type: "Town Hall".to_string() });
            }
            if context.resources.wood < 50 {
                actions.push(AIAction::Build { building_type: "Lumber Mill".to_string() });
            }
        }
        
        // Aggressive actions based on personality
        if self.personality.aggression > 0.7 && context.threat_level < 0.3 {
            // Build offensive units
            actions.push(AIAction::Train { unit_type: "Footman".to_string() });
            actions.push(AIAction::Train { unit_type: "Knight".to_string() });
        }
        
        // Defensive actions based on personality
        if self.personality.defense_focus > 0.7 && context.threat_level > 0.6 {
            actions.push(AIAction::Build { building_type: "Tower".to_string() });
            actions.push(AIAction::Train { unit_type: "Archer".to_string() });
        }
        
        Ok(actions)
    }
    
    /// Generate combat actions
    async fn generate_combat_actions(&self, context: &AIDecisionContext) -> Result<Vec<AIAction>> {
        let mut actions = Vec::new();
        
        // Simple combat logic - attack with available units
        for unit in &context.units {
            if unit.unit_type.contains("Combat") || unit.unit_type.contains("Footman") || unit.unit_type.contains("Knight") {
                // Find a target (for now, just move to a random location)
                let target_x = 400 + (unit.id % 100) as i32;
                let target_y = 300 + (unit.id % 100) as i32;
                
                actions.push(AIAction::Move { unit_id: unit.id, x: target_x, y: target_y });
                
                // Attack if we're aggressive
                if self.personality.aggression > 0.6 {
                    actions.push(AIAction::Attack { unit_id: unit.id, target_id: 999 }); // Example target
                }
            }
        }
        
        Ok(actions)
    }
    
    /// Prioritize actions based on context and personality
    async fn prioritize_actions(&self, actions: Vec<AIAction>, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut prioritized = Vec::new();
        
        for action in actions {
            let priority = self.calculate_action_priority(&action, context).await?;
            let reasoning = self.generate_action_reasoning(&action, context).await?;
            
            prioritized.push(PrioritizedAction {
                action,
                priority,
                reasoning,
            });
        }
        
        // Sort by priority (highest first)
        prioritized.sort_by(|a, b| b.priority.partial_cmp(&a.priority).unwrap());
        
        Ok(prioritized)
    }
    
    /// Calculate priority for an action
    async fn calculate_action_priority(&self, action: &AIAction, context: &AIDecisionContext) -> Result<f32> {
        let mut priority = 0.5; // Base priority
        
        match action {
            AIAction::Build { building_type } => {
                if building_type.contains("Town Hall") && context.resources.gold < 100 {
                    priority += 0.3;
                }
                if building_type.contains("Tower") && context.threat_level > 0.7 {
                    priority += 0.4;
                }
            }
            AIAction::Train { unit_type } => {
                if unit_type.contains("Combat") && context.threat_level > 0.5 {
                    priority += 0.3;
                }
            }
            AIAction::Attack { .. } => {
                if self.personality.aggression > 0.6 {
                    priority += 0.2;
                }
            }
            _ => {}
        }
        
        Ok(priority.min(1.0))
    }
    
    /// Generate reasoning for an action
    async fn generate_action_reasoning(&self, action: &AIAction, context: &AIDecisionContext) -> Result<String> {
        match action {
            AIAction::Build { building_type } => {
                if building_type.contains("Town Hall") {
                    Ok("Building Town Hall to increase gold production".to_string())
                } else if building_type.contains("Tower") {
                    Ok("Building defensive tower due to high threat level".to_string())
                } else {
                    Ok(format!("Building {} for strategic purposes", building_type))
                }
            }
            AIAction::Train { unit_type } => {
                if unit_type.contains("Combat") {
                    Ok("Training combat units for defense/offense".to_string())
                } else {
                    Ok(format!("Training {} for resource gathering", unit_type))
                }
            }
            AIAction::Attack { .. } => {
                Ok("Attacking enemy units to reduce threat".to_string())
            }
            _ => Ok("Standard AI action".to_string()),
        }
    }
    
    /// Add actions to the queue
    async fn add_to_action_queue(&self, actions: Vec<PrioritizedAction>) -> Result<()> {
        let mut queue = self.action_queue.lock().await;
        queue.extend(actions);
        
        // Keep queue size manageable
        if queue.len() > 100 {
            queue.truncate(100);
        }
        
        Ok(())
    }
    
    /// Get next action from queue
    pub async fn get_next_action(&self) -> Option<PrioritizedAction> {
        let mut queue = self.action_queue.lock().await;
        queue.pop()
    }
    
    /// Update AI personality based on learning
    fn update_personality(&mut self) {
        // Simple personality adaptation based on strategy
        match self.strategy {
            AIStrategy::Balanced => {
                // Balanced AI adapts based on game performance
                self.personality.adaptability = 0.8;
            }
            AIStrategy::Custom { .. } => {
                // Custom AI maintains its parameters
                self.personality.adaptability = 0.9;
            }
            _ => {
                // Other strategies are more rigid
                self.personality.adaptability = 0.5;
            }
        }
    }
    
    /// Load learning data
    async fn load_learning_data(&self) -> Result<()> {
        // This would load from a file or database
        // For now, we'll start with empty data
        info!("📚 Learning data initialized (empty)");
        Ok(())
    }
    
    /// Save learning data
    pub async fn save_learning_data(&self) -> Result<()> {
        // This would save to a file or database
        let data = self.learning_data.lock().await;
        info!("💾 Saving {} learning examples", data.len());
        Ok(())
    }
    
    /// Get AI status information
    pub async fn get_status(&self) -> Value {
        let mut status = serde_json::Map::new();
        
        status.insert("strategy".to_string(), Value::String(format!("{:?}", self.strategy)));
        status.insert("personality".to_string(), serde_json::json!({
            "aggression": self.personality.aggression,
            "economy_focus": self.personality.economy_focus,
            "defense_focus": self.personality.defense_focus,
            "risk_tolerance": self.personality.risk_tolerance,
            "adaptability": self.personality.adaptability,
        }));
        
        let queue = self.action_queue.lock().await;
        status.insert("action_queue_size".to_string(), Value::Number(queue.len().into()));
        
        let learning = self.learning_data.lock().await;
        status.insert("learning_examples".to_string(), Value::Number(learning.len().into()));
        
        Value::Object(status)
    }
}

impl Default for AIController {
    fn default() -> Self {
        Self::new(AIStrategy::Balanced)
    }
}
