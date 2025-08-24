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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAnalytics {
    pub current_strategy: AIStrategy,
    pub personality: AIPersonality,
    pub total_learning_examples: usize,
    pub overall_success_rate: f64,
    pub recent_success_rate: f64,
    pub actions_queued: usize,
    pub adaptation_count: usize,
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
        let mut actions = Vec::new();
        
        // Analyze current game state
        let context = self.analyze_game_state(game_state).await?;
        
        // Generate prioritized actions based on strategy
        let prioritized_actions = self.generate_prioritized_actions(&context).await?;
        
        // Convert to simple action strings for execution
        for action in prioritized_actions {
            actions.push(action.action);
        }
        
        Ok(actions)
    }
    
    /// Analyze current game state and create decision context
    async fn analyze_game_state(&self, game_state: &HeadlessGameState) -> Result<AIDecisionContext> {
        let threat_level = self.assess_threat_level(game_state).await?;
        let resource_scarcity = self.assess_resource_scarcity(&game_state.player_resources).await?;
        
        let context = AIDecisionContext {
            current_phase: game_state.game_phase.clone(),
            resources: game_state.player_resources.clone(),
            unit_count: game_state.units.len(),
            building_count: game_state.buildings.len(),
            threat_level,
            resource_scarcity,
            game_time: game_state.game_time,
            map_size: (game_state.map_info.width, game_state.map_info.height),
        };
        
        Ok(context)
    }
    
    /// Assess current threat level based on game state
    async fn assess_threat_level(&self, game_state: &HeadlessGameState) -> Result<ThreatLevel> {
        // Simple threat assessment based on unit count and game phase
        match game_state.game_phase {
            GamePhase::MainMenu | GamePhase::Loading => Ok(ThreatLevel::None),
            GamePhase::InGame => {
                if game_state.units.len() < 5 {
                    Ok(ThreatLevel::Low)
                } else if game_state.units.len() < 15 {
                    Ok(ThreatLevel::Medium)
                } else {
                    Ok(ThreatLevel::High)
                }
            }
            _ => Ok(ThreatLevel::None),
        }
    }
    
    /// Assess resource scarcity
    async fn assess_resource_scarcity(&self, resources: &PlayerResources) -> Result<ResourceScarcity> {
        if resources.gold < 100 && resources.wood < 50 {
            Ok(ResourceScarcity::Critical)
        } else if resources.gold < 300 && resources.wood < 150 {
            Ok(ResourceScarcity::Scarce)
        } else if resources.gold < 800 && resources.wood < 400 {
            Ok(ResourceScarcity::Normal)
        } else {
            Ok(ResourceScarcity::Abundant)
        }
    }
    
    /// Generate prioritized actions based on current context
    async fn generate_prioritized_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        match self.strategy {
            AIStrategy::Aggressive => {
                actions.extend(self.generate_aggressive_actions(context).await?);
            }
            AIStrategy::Defensive => {
                actions.extend(self.generate_defensive_actions(context).await?);
            }
            AIStrategy::Balanced => {
                actions.extend(self.generate_balanced_actions(context).await?);
            }
            AIStrategy::Economic => {
                actions.extend(self.generate_economic_actions(context).await?);
            }
            AIStrategy::Rush => {
                actions.extend(self.generate_rush_actions(context).await?);
            }
            AIStrategy::Turtle => {
                actions.extend(self.generate_turtle_actions(context).await?);
            }
        }
        
        // Sort by priority
        actions.sort_by(|a, b| b.priority.partial_cmp(&a.priority).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(actions)
    }
    
    /// Generate actions for aggressive strategy
    async fn generate_aggressive_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        match context.current_phase {
            GamePhase::MainMenu => {
                // Navigate to start game
                actions.push(PrioritizedAction {
                    action: "navigate_to_start_game".to_string(),
                    priority: 1.0,
                    reasoning: "Start game to begin aggressive strategy".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 1000,
                });
            }
            GamePhase::InGame => {
                if context.unit_count < 10 {
                    // Build army
                    actions.push(PrioritizedAction {
                        action: "build_barracks".to_string(),
                        priority: 0.9,
                        reasoning: "Need barracks to train military units".to_string(),
                        estimated_cost: 150,
                        time_to_complete: 2000,
                    });
                    
                    actions.push(PrioritizedAction {
                        action: "train_peasants".to_string(),
                        priority: 0.8,
                        reasoning: "Need peasants for resource gathering".to_string(),
                        estimated_cost: 75,
                        time_to_complete: 1000,
                    });
                } else {
                    // Attack with existing army
                    actions.push(PrioritizedAction {
                        action: "attack_move_forward".to_string(),
                        priority: 0.95,
                        reasoning: "Aggressive strategy - attack enemy".to_string(),
                        estimated_cost: 0,
                        time_to_complete: 5000,
                    });
                }
            }
            _ => {}
        }
        
        Ok(actions)
    }
    
    /// Generate actions for defensive strategy
    async fn generate_defensive_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        match context.current_phase {
            GamePhase::MainMenu => {
                actions.push(PrioritizedAction {
                    action: "navigate_to_start_game".to_string(),
                    priority: 1.0,
                    reasoning: "Start game to begin defensive strategy".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 1000,
                });
            }
            GamePhase::InGame => {
                if context.building_count < 5 {
                    // Build defensive structures
                    actions.push(PrioritizedAction {
                        action: "build_town_hall".to_string(),
                        priority: 0.9,
                        reasoning: "Need town hall for base defense".to_string(),
                        estimated_cost: 400,
                        time_to_complete: 3000,
                    });
                    
                    actions.push(PrioritizedAction {
                        action: "build_farm".to_string(),
                        priority: 0.8,
                        reasoning: "Need farms for food production".to_string(),
                        estimated_cost: 75,
                        time_to_complete: 1500,
                    });
                } else {
                    // Build defensive units
                    actions.push(PrioritizedAction {
                        action: "train_archers".to_string(),
                        priority: 0.85,
                        reasoning: "Archers good for defensive positions".to_string(),
                        estimated_cost: 125,
                        time_to_complete: 2000,
                    });
                }
            }
            _ => {}
        }
        
        Ok(actions)
    }
    
    /// Generate actions for balanced strategy
    async fn generate_balanced_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        match context.current_phase {
            GamePhase::MainMenu => {
                actions.push(PrioritizedAction {
                    action: "navigate_to_start_game".to_string(),
                    priority: 1.0,
                    reasoning: "Start game to begin balanced strategy".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 1000,
                });
            }
            GamePhase::InGame => {
                // Balance economy and military
                if context.resource_scarcity == ResourceScarcity::Critical {
                    actions.push(PrioritizedAction {
                        action: "focus_on_economy".to_string(),
                        priority: 0.95,
                        reasoning: "Critical resource shortage - focus on economy".to_string(),
                        estimated_cost: 0,
                        time_to_complete: 3000,
                    });
                } else if context.threat_level == ThreatLevel::High {
                    actions.push(PrioritizedAction {
                        action: "focus_on_military".to_string(),
                        priority: 0.9,
                        reasoning: "High threat - focus on military".to_string(),
                        estimated_cost: 0,
                        time_to_complete: 4000,
                    });
                } else {
                    // Balanced development
                    actions.push(PrioritizedAction {
                        action: "balanced_development".to_string(),
                        priority: 0.8,
                        reasoning: "Balanced approach - develop both economy and military".to_string(),
                        estimated_cost: 0,
                        time_to_complete: 5000,
                    });
                }
            }
            _ => {}
        }
        
        Ok(actions)
    }
    
    /// Generate actions for economic strategy
    async fn generate_economic_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        match context.current_phase {
            GamePhase::MainMenu => {
                actions.push(PrioritizedAction {
                    action: "navigate_to_start_game".to_string(),
                    priority: 1.0,
                    reasoning: "Start game to begin economic strategy".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 1000,
                });
            }
            GamePhase::InGame => {
                // Focus on economy
                actions.push(PrioritizedAction {
                    action: "build_town_hall".to_string(),
                    priority: 0.95,
                    reasoning: "Town hall is foundation of economy".to_string(),
                    estimated_cost: 400,
                    time_to_complete: 3000,
                });
                
                actions.push(PrioritizedAction {
                    action: "build_farm".to_string(),
                    priority: 0.9,
                    reasoning: "Farms provide food for population".to_string(),
                    estimated_cost: 75,
                    time_to_complete: 1500,
                });
                
                actions.push(PrioritizedAction {
                    action: "train_peasants".to_string(),
                    priority: 0.85,
                    reasoning: "Peasants gather resources".to_string(),
                    estimated_cost: 75,
                    time_to_complete: 1000,
                });
            }
            _ => {}
        }
        
        Ok(actions)
    }
    
    /// Generate actions for rush strategy
    async fn generate_rush_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        match context.current_phase {
            GamePhase::MainMenu => {
                actions.push(PrioritizedAction {
                    action: "navigate_to_start_game".to_string(),
                    priority: 1.0,
                    reasoning: "Start game to begin rush strategy".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 1000,
                });
            }
            GamePhase::InGame => {
                // Fast military rush
                if context.unit_count < 5 {
                    actions.push(PrioritizedAction {
                        action: "fast_military_build".to_string(),
                        priority: 0.95,
                        reasoning: "Rush strategy - build military quickly".to_string(),
                        estimated_cost: 0,
                        time_to_complete: 2000,
                    });
                } else {
                    actions.push(PrioritizedAction {
                        action: "rush_attack".to_string(),
                        priority: 1.0,
                        reasoning: "Rush strategy - attack immediately with available units".to_string(),
                        estimated_cost: 0,
                        time_to_complete: 3000,
                    });
                }
            }
            _ => {}
        }
        
        Ok(actions)
    }
    
    /// Generate actions for turtle strategy
    async fn generate_turtle_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        match context.current_phase {
            GamePhase::MainMenu => {
                actions.push(PrioritizedAction {
                    action: "navigate_to_start_game".to_string(),
                    priority: 1.0,
                    reasoning: "Start game to begin turtle strategy".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 1000,
                });
            }
            GamePhase::InGame => {
                // Build strong defenses
                actions.push(PrioritizedAction {
                    action: "build_defensive_structures".to_string(),
                    priority: 0.95,
                    reasoning: "Turtle strategy - build strong defenses".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 4000,
                });
                
                actions.push(PrioritizedAction {
                    action: "expand_economy_slowly".to_string(),
                    priority: 0.8,
                    reasoning: "Turtle strategy - expand economy slowly and safely".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 6000,
                });
            }
            _ => {}
        }
        
        Ok(actions)
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
    
    async fn generate_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
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
                actions.push(PrioritizedAction {
                    action: "wait".to_string(),
                    priority: 0.1,
                    reasoning: "Default action for unknown phase".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 1000,
                });
            }
        }
        
        Ok(actions)
    }
    
    async fn generate_menu_actions(&self) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        // Navigate to single player
        actions.push(PrioritizedAction {
            action: "click 400 300".to_string(), // Single Player button
            priority: 1.0,
            reasoning: "Navigate to single player".to_string(),
            estimated_cost: 0,
            time_to_complete: 1000,
        });
        actions.push(PrioritizedAction {
            action: "wait 500".to_string(),
            priority: 0.5,
            reasoning: "Wait for navigation".to_string(),
            estimated_cost: 0,
            time_to_complete: 500,
        });
        
        // Navigate to custom scenario
        actions.push(PrioritizedAction {
            action: "click 400 350".to_string(), // Custom Scenario button
            priority: 1.0,
            reasoning: "Navigate to custom scenario".to_string(),
            estimated_cost: 0,
            time_to_complete: 1000,
        });
        actions.push(PrioritizedAction {
            action: "wait 500".to_string(),
            priority: 0.5,
            reasoning: "Wait for navigation".to_string(),
            estimated_cost: 0,
            time_to_complete: 500,
        });
        
        // Select first map
        actions.push(PrioritizedAction {
            action: "click 300 400".to_string(), // First map in list
            priority: 1.0,
            reasoning: "Select first map".to_string(),
            estimated_cost: 0,
            time_to_complete: 1000,
        });
        actions.push(PrioritizedAction {
            action: "wait 500".to_string(),
            priority: 0.5,
            reasoning: "Wait for selection".to_string(),
            estimated_cost: 0,
            time_to_complete: 500,
        });
        
        // Start game
        actions.push(PrioritizedAction {
            action: "click 500 500".to_string(), // Start button
            priority: 1.0,
            reasoning: "Start game".to_string(),
            estimated_cost: 0,
            time_to_complete: 1000,
        });
        actions.push(PrioritizedAction {
            action: "wait 1000".to_string(),
            priority: 0.5,
            reasoning: "Wait for game start".to_string(),
            estimated_cost: 0,
            time_to_complete: 1000,
        });
        
        Ok(actions)
    }
    
    async fn generate_in_game_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
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
    
    async fn generate_campaign_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        // Campaign-specific logic
        match context.game_time {
            t if t < 10000 => {
                // Early game - focus on economy
                actions.push(PrioritizedAction {
                    action: "build TownHall".to_string(),
                    priority: 0.9,
                    reasoning: "Early game - need town hall".to_string(),
                    estimated_cost: 400,
                    time_to_complete: 3000,
                });
                actions.push(PrioritizedAction {
                    action: "train Peasant".to_string(),
                    priority: 0.8,
                    reasoning: "Early game - need workers".to_string(),
                    estimated_cost: 75,
                    time_to_complete: 1000,
                });
            }
            t if t < 30000 => {
                // Mid game - build military
                actions.push(PrioritizedAction {
                    action: "build Barracks".to_string(),
                    priority: 0.9,
                    reasoning: "Mid game - need military buildings".to_string(),
                    estimated_cost: 150,
                    time_to_complete: 2000,
                });
            }
            _ => {
                // Late game - attack
                actions.push(PrioritizedAction {
                    action: "attack 64 64".to_string(),
                    priority: 0.95,
                    reasoning: "Late game - attack enemy".to_string(),
                    estimated_cost: 0,
                    time_to_complete: 5000,
                });
            }
        }
        
        Ok(actions)
    }
    
    async fn generate_combat_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        // Defensive actions
        if context.threat_level == ThreatLevel::Critical {
            actions.push(PrioritizedAction {
                action: "build Tower".to_string(),
                priority: 0.9,
                reasoning: "Tower for defense".to_string(),
                estimated_cost: 200,
                time_to_complete: 2000,
            });
            actions.push(PrioritizedAction {
                action: "build Tower".to_string(),
                priority: 0.8,
                reasoning: "Tower for defense".to_string(),
                estimated_cost: 200,
                time_to_complete: 2000,
            });
        }
        
        // Offensive actions
        if context.unit_count > 5 {
            actions.push(PrioritizedAction {
                action: "select all".to_string(),
                priority: 0.9,
                reasoning: "Attack with all units".to_string(),
                estimated_cost: 0,
                time_to_complete: 1000,
            });
            actions.push(PrioritizedAction {
                action: "attack 64 64".to_string(),
                priority: 0.9,
                reasoning: "Attack enemy".to_string(),
                estimated_cost: 0,
                time_to_complete: 5000,
            });
        }
        
        Ok(actions)
    }
    
    async fn generate_building_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        // Essential buildings
        if context.building_count == 0 {
            actions.push(PrioritizedAction {
                action: "build TownHall".to_string(),
                priority: 0.9,
                reasoning: "Town hall is essential for base defense".to_string(),
                estimated_cost: 400,
                time_to_complete: 3000,
            });
        } else if context.building_count == 1 {
            actions.push(PrioritizedAction {
                action: "build Farm".to_string(),
                priority: 0.8,
                reasoning: "Farm for food production".to_string(),
                estimated_cost: 75,
                time_to_complete: 1500,
            });
        } else if context.building_count == 2 {
            actions.push(PrioritizedAction {
                action: "build Barracks".to_string(),
                priority: 0.7,
                reasoning: "Barracks for military training".to_string(),
                estimated_cost: 150,
                time_to_complete: 2000,
            });
        } else if context.building_count == 3 {
            actions.push(PrioritizedAction {
                action: "build Blacksmith".to_string(),
                priority: 0.6,
                reasoning: "Blacksmith for unit upgrades".to_string(),
                estimated_cost: 100,
                time_to_complete: 1500,
            });
        }
        
        Ok(actions)
    }
    
    async fn generate_training_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        // Train workers first
        if context.unit_count < 3 {
            actions.push(PrioritizedAction {
                action: "train Peasant".to_string(),
                priority: 0.9,
                reasoning: "Train Peasant for resource gathering".to_string(),
                estimated_cost: 75,
                time_to_complete: 1000,
            });
        } else if context.unit_count < 5 {
            actions.push(PrioritizedAction {
                action: "train Footman".to_string(),
                priority: 0.8,
                reasoning: "Train Footman for combat".to_string(),
                estimated_cost: 125,
                time_to_complete: 2000,
            });
        } else if context.unit_count < 8 {
            actions.push(PrioritizedAction {
                action: "train Archer".to_string(),
                priority: 0.7,
                reasoning: "Train Archer for ranged combat".to_string(),
                estimated_cost: 100,
                time_to_complete: 1500,
            });
        }
        
        Ok(actions)
    }
    
    async fn generate_resource_actions(&self, context: &AIDecisionContext) -> Result<Vec<PrioritizedAction>> {
        let mut actions = Vec::new();
        
        // Send workers to gather resources
        if context.resources.gold < 500 {
            actions.push(PrioritizedAction {
                action: "click 32 32".to_string(), // Gold mine
                priority: 0.9,
                reasoning: "Gather gold for economy".to_string(),
                estimated_cost: 0,
                time_to_complete: 1000,
            });
        }
        
        if context.resources.wood < 300 {
            actions.push(PrioritizedAction {
                action: "click 96 96".to_string(), // Forest
                priority: 0.8,
                reasoning: "Gather wood for building".to_string(),
                estimated_cost: 0,
                time_to_complete: 1000,
            });
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
    
    /// Record a learning example for strategy improvement
    pub async fn record_learning_example(&self, situation: String, action: String, outcome: String, success_score: f64) -> Result<()> {
        let example = LearningExample {
            situation: situation.clone(),
            action_taken: action.clone(),
            outcome: outcome.clone(),
            success_score,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };
        
        let mut learning_data = self.learning_data.lock().await;
        learning_data.push(example);
        
        info!("📚 Recorded learning example: {} -> {} (Score: {:.2})", 
              situation, outcome, success_score);
        
        Ok(())
    }
    
    /// Adapt personality based on stored learning data
    async fn adapt_personality_from_data(&mut self) -> Result<()> {
        let learning_data = self.learning_data.lock().await;
        
        let recent_examples = learning_data.iter()
            .filter(|ex| ex.timestamp > std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() - 300) // Last 5 minutes
            .collect::<Vec<_>>();
        
        if recent_examples.is_empty() {
            return Ok(());
        }
        
        let avg_success = recent_examples.iter()
            .map(|ex| ex.success_score)
            .sum::<f64>() / recent_examples.len() as f64;
        
        // Adjust personality based on recent success
        if avg_success > 0.8 {
            // Doing well - become more aggressive
            self.personality.aggression_level = (self.personality.aggression_level + 0.1).min(1.0);
            self.personality.risk_tolerance = (self.personality.risk_tolerance + 0.05).min(1.0);
            info!("😤 Adapting: Becoming more aggressive due to success");
        } else if avg_success < 0.4 {
            // Struggling - become more defensive
            self.personality.aggression_level = (self.personality.aggression_level - 0.1).max(0.0);
            self.personality.patience_level = (self.personality.patience_level + 0.1).min(1.0);
            info!("🛡️ Adapting: Becoming more defensive due to failures");
        }
        
        Ok(())
    }
    
    /// Analyze learning data and adapt strategy
    pub async fn adapt_strategy(&mut self) -> Result<()> {
        // Get learning data and analyze it
        let (successful_count, failed_count) = {
            let learning_data = self.learning_data.lock().await;
            
            let successful_count = learning_data.iter()
                .filter(|ex| ex.success_score > 0.7)
                .count();
            
            let failed_count = learning_data.iter()
                .filter(|ex| ex.success_score < 0.3)
                .count();
            
            (successful_count, failed_count)
        };
        
        // Adapt strategy based on success/failure patterns
        if successful_count > failed_count {
            // Current strategy is working well
            info!("🎯 Current strategy performing well, maintaining approach");
        } else {
            // Current strategy needs adjustment
            info!("🔄 Current strategy underperforming, adapting...");
            self.adapt_strategy_based_on_failures().await?;
        }
        
        // Adapt personality based on outcomes
        self.adapt_personality_from_data().await?;
        
        Ok(())
    }
    
    /// Adapt strategy based on failed actions (without borrowing issues)
    async fn adapt_strategy_based_on_failures(&mut self) -> Result<()> {
        let failed_actions = {
            let learning_data = self.learning_data.lock().await;
            learning_data.iter()
                .filter(|ex| ex.success_score < 0.3)
                .map(|ex| (ex.situation.clone(), ex.action_taken.clone()))
                .collect::<Vec<_>>()
        };
        
        // Analyze common failure patterns
        let mut failure_patterns = std::collections::HashMap::new();
        
        for (situation, action) in &failed_actions {
            let pattern = format!("{} -> {}", situation, action);
            *failure_patterns.entry(pattern).or_insert(0) += 1;
        }
        
        // Find most common failure pattern
        if let Some((pattern, count)) = failure_patterns.iter().max_by_key(|&(_, count)| count) {
            info!("🚨 Most common failure pattern: {} ({} times)", pattern, count);
            
            // Adapt strategy to avoid this pattern
            match pattern.as_str() {
                pattern if pattern.contains("attack") && pattern.contains("low_units") => {
                    info!("🛡️ Adapting: Avoid attacking with insufficient units");
                    self.strategy = AIStrategy::Defensive;
                }
                pattern if pattern.contains("economy") && pattern.contains("threat") => {
                    info!("⚔️ Adapting: Focus on military when under threat");
                    self.strategy = AIStrategy::Aggressive;
                }
                pattern if pattern.contains("rush") && pattern.contains("defense") => {
                    info!("🏗️ Adapting: Build defenses before rushing");
                    self.strategy = AIStrategy::Balanced;
                }
                _ => {
                    info!("🔄 Adapting: Switching to balanced strategy");
                    self.strategy = AIStrategy::Balanced;
                }
            }
        }
        
        Ok(())
    }
    
    /// Get current AI status and learning progress
    pub async fn get_ai_status(&self) -> Result<AIAnalytics> {
        let learning_data = self.learning_data.lock().await;
        let action_queue = self.action_queue.lock().await;
        
        let total_examples = learning_data.len();
        let avg_success = if total_examples > 0 {
            learning_data.iter().map(|ex| ex.success_score).sum::<f64>() / total_examples as f64
        } else {
            0.0
        };
        
        let recent_success = learning_data.iter()
            .filter(|ex| ex.timestamp > std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() - 600) // Last 10 minutes
            .map(|ex| ex.success_score)
            .collect::<Vec<_>>();
        
        let recent_avg = if !recent_success.is_empty() {
            recent_success.iter().sum::<f64>() / recent_success.len() as f64
        } else {
            0.0
        };
        
        let analytics = AIAnalytics {
            current_strategy: self.strategy.clone(),
            personality: self.personality.clone(),
            total_learning_examples: total_examples,
            overall_success_rate: avg_success,
            recent_success_rate: recent_avg,
            actions_queued: action_queue.len(),
            adaptation_count: 0, // TODO: Track adaptation count
        };
        
        Ok(analytics)
    }
}

impl Default for AIPersonality {
    fn default() -> Self {
        Self {
            aggression_level: 0.5,
            patience_level: 0.5,
            risk_tolerance: 0.5,
            resource_efficiency: 0.7,
            adaptability: 0.6,
        }
    }
}
