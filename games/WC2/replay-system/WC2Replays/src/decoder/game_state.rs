use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// Current game state during replay playback
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub current_time: u32, // Current game time in milliseconds
    pub map_size: (u16, u16), // Map width and height
    pub players: HashMap<u8, PlayerState>,
    pub units: HashMap<u32, UnitState>,
    pub buildings: HashMap<u32, BuildingState>,
    pub resources: HashMap<u8, ResourceState>,
    pub game_phase: GamePhase,
}

/// Player state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerState {
    pub id: u8,
    pub name: String,
    pub race: crate::decoder::Race,
    pub color: crate::decoder::PlayerColor,
    pub team: u8,
    pub is_active: bool,
    pub is_winner: Option<bool>,
    pub apm: f32,
    pub total_actions: u32,
}

/// Unit state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitState {
    pub id: u32,
    pub unit_type: super::events::UnitType,
    pub player_id: u8,
    pub x: f32,
    pub y: f32,
    pub health: u16,
    pub max_health: u16,
    pub mana: u16,
    pub max_mana: u16,
    pub level: u8,
    pub experience: u32,
    pub is_moving: bool,
    pub target_x: Option<f32>,
    pub target_y: Option<f32>,
    pub is_attacking: bool,
    pub target_id: Option<u32>,
}

/// Building state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingState {
    pub id: u32,
    pub building_type: super::events::BuildingType,
    pub player_id: u8,
    pub x: f32,
    pub y: f32,
    pub health: u16,
    pub max_health: u16,
    pub construction_progress: f32, // 0.0 to 1.0
    pub is_constructing: bool,
    pub training_queue: Vec<super::events::UnitType>,
    pub research_queue: Vec<super::events::ResearchType>,
}

/// Resource state for a player
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceState {
    pub player_id: u8,
    pub gold: u32,
    pub wood: u32,
    pub oil: u32,
    pub food_used: u16,
    pub food_capacity: u16,
    pub population: u16,
    pub max_population: u16,
}

/// Game phases
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GamePhase {
    Loading,
    Playing,
    Paused,
    Finished,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            current_time: 0,
            map_size: (0, 0),
            players: HashMap::new(),
            units: HashMap::new(),
            buildings: HashMap::new(),
            resources: HashMap::new(),
            game_phase: GamePhase::Loading,
        }
    }

    /// Update game state based on an event
    pub fn apply_event(&mut self, event: &super::events::GameEvent) {
        self.current_time = event.timestamp;
        
        match event.event_type {
            super::events::EventType::PlayerAction => {
                self.handle_player_action(event);
            }
            super::events::EventType::UnitMove => {
                self.handle_unit_move(event);
            }
            super::events::EventType::UnitAttack => {
                self.handle_unit_attack(event);
            }
            super::events::EventType::BuildingConstruct => {
                self.handle_building_construct(event);
            }
            super::events::EventType::UnitTrain => {
                self.handle_unit_train(event);
            }
            super::events::EventType::ResourceGather => {
                self.handle_resource_gather(event);
            }
            _ => {
                // Handle other event types
            }
        }
    }

    /// Handle player action event
    fn handle_player_action(&mut self, event: &super::events::GameEvent) {
        // Parse player action from event data
        if event.data.len() >= 8 {
            let player_id = event.data[0];
            let action_type = event.data[1];
            let target_x = u16::from_le_bytes([event.data[2], event.data[3]]);
            let target_y = u16::from_le_bytes([event.data[4], event.data[5]]);
            
            // Update player APM
            if let Some(player) = self.players.get_mut(&player_id) {
                player.total_actions += 1;
                let minutes = self.current_time as f32 / 60000.0; // Convert to minutes
                if minutes > 0.0 {
                    player.apm = player.total_actions as f32 / minutes;
                }
            }
        }
    }

    /// Handle unit movement event
    fn handle_unit_move(&mut self, event: &super::events::GameEvent) {
        if event.data.len() >= 12 {
            let unit_id = u32::from_le_bytes([
                event.data[0], event.data[1], event.data[2], event.data[3]
            ]);
            let start_x = u16::from_le_bytes([event.data[4], event.data[5]]);
            let start_y = u16::from_le_bytes([event.data[6], event.data[7]]);
            let end_x = u16::from_le_bytes([event.data[8], event.data[9]]);
            let end_y = u16::from_le_bytes([event.data[10], event.data[11]]);
            
            if let Some(unit) = self.units.get_mut(&unit_id) {
                unit.x = start_x as f32;
                unit.y = start_y as f32;
                unit.target_x = Some(end_x as f32);
                unit.target_y = Some(end_y as f32);
                unit.is_moving = true;
            }
        }
    }

    /// Handle unit attack event
    fn handle_unit_attack(&mut self, event: &super::events::GameEvent) {
        if event.data.len() >= 12 {
            let attacker_id = u32::from_le_bytes([
                event.data[0], event.data[1], event.data[2], event.data[3]
            ]);
            let target_id = u32::from_le_bytes([
                event.data[4], event.data[5], event.data[6], event.data[7]
            ]);
            let damage = u16::from_le_bytes([event.data[8], event.data[9]]);
            
            // Update attacker state
            if let Some(unit) = self.units.get_mut(&attacker_id) {
                unit.is_attacking = true;
                unit.target_id = Some(target_id);
            }
            
            // Apply damage to target
            if let Some(target) = self.units.get_mut(&target_id) {
                if target.health > damage {
                    target.health -= damage;
                } else {
                    target.health = 0;
                    // Unit dies - could be removed from HashMap
                }
            }
        }
    }

    /// Handle building construction event
    fn handle_building_construct(&mut self, event: &super::events::GameEvent) {
        if event.data.len() >= 8 {
            let building_type = event.data[0];
            let x = u16::from_le_bytes([event.data[1], event.data[2]]);
            let y = u16::from_le_bytes([event.data[3], event.data[4]]);
            let player_id = event.data[5];
            let construction_time = u32::from_le_bytes([
                event.data[6], event.data[7], event.data[8], event.data[9]
            ]);
            
            let building_id = self.generate_building_id();
            let building = BuildingState {
                id: building_id,
                building_type: self.parse_building_type(building_type),
                player_id,
                x: x as f32,
                y: y as f32,
                health: 100, // Starting health
                max_health: 100,
                construction_progress: 0.0,
                is_constructing: true,
                training_queue: Vec::new(),
                research_queue: Vec::new(),
            };
            
            self.buildings.insert(building_id, building);
        }
    }

    /// Handle unit training event
    fn handle_unit_train(&mut self, event: &super::events::GameEvent) {
        if event.data.len() >= 8 {
            let building_id = u32::from_le_bytes([
                event.data[0], event.data[1], event.data[2], event.data[3]
            ]);
            let unit_type = event.data[4];
            let player_id = event.data[5];
            
            let unit_type_parsed = self.parse_unit_type(unit_type);
            if let Some(building) = self.buildings.get_mut(&building_id) {
                building.training_queue.push(unit_type_parsed);
            }
        }
    }

    /// Handle resource gathering event
    fn handle_resource_gather(&mut self, event: &super::events::GameEvent) {
        if event.data.len() >= 8 {
            let unit_id = u32::from_le_bytes([
                event.data[0], event.data[1], event.data[2], event.data[3]
            ]);
            let resource_type = event.data[4];
            let amount = u16::from_le_bytes([event.data[5], event.data[6]]);
            
            // Find which player owns this unit
            if let Some(unit) = self.units.get(&unit_id) {
                if let Some(resources) = self.resources.get_mut(&unit.player_id) {
                    match resource_type {
                        0 => resources.gold += amount as u32,
                        1 => resources.wood += amount as u32,
                        2 => resources.oil += amount as u32,
                        _ => {}
                    }
                }
            }
        }
    }

    /// Generate a unique building ID
    fn generate_building_id(&self) -> u32 {
        // Simple ID generation - could be improved
        self.buildings.len() as u32 + 1000
    }

    /// Parse building type from byte
    fn parse_building_type(&self, building_type: u8) -> super::events::BuildingType {
        match building_type {
            0 => super::events::BuildingType::TownHall,
            1 => super::events::BuildingType::Barracks,
            2 => super::events::BuildingType::Farm,
            3 => super::events::BuildingType::LumberMill,
            4 => super::events::BuildingType::Blacksmith,
            5 => super::events::BuildingType::Church,
            6 => super::events::BuildingType::Tower,
            7 => super::events::BuildingType::Castle,
            8 => super::events::BuildingType::GreatHall,
            9 => super::events::BuildingType::BarracksOrc,
            10 => super::events::BuildingType::FarmOrc,
            11 => super::events::BuildingType::WarMill,
            12 => super::events::BuildingType::Temple,
            13 => super::events::BuildingType::TowerOrc,
            14 => super::events::BuildingType::Fortress,
            _ => super::events::BuildingType::Unknown,
        }
    }

    /// Parse unit type from byte
    fn parse_unit_type(&self, unit_type: u8) -> super::events::UnitType {
        match unit_type {
            0 => super::events::UnitType::Peasant,
            1 => super::events::UnitType::Footman,
            2 => super::events::UnitType::Knight,
            3 => super::events::UnitType::Archer,
            4 => super::events::UnitType::Paladin,
            5 => super::events::UnitType::Mage,
            6 => super::events::UnitType::Ballista,
            7 => super::events::UnitType::Peon,
            8 => super::events::UnitType::Grunt,
            9 => super::events::UnitType::Ogre,
            10 => super::events::UnitType::Troll,
            11 => super::events::UnitType::Catapult,
            12 => super::events::UnitType::DeathKnight,
            13 => super::events::UnitType::OgreMage,
            _ => super::events::UnitType::Unknown,
        }
    }

    /// Get current game time in seconds
    pub fn current_time_seconds(&self) -> f32 {
        self.current_time as f32 / 1000.0
    }

    /// Get current game time in minutes
    pub fn current_time_minutes(&self) -> f32 {
        self.current_time as f32 / 60000.0
    }

    /// Check if game is finished
    pub fn is_finished(&self) -> bool {
        matches!(self.game_phase, GamePhase::Finished)
    }

    /// Get winner player ID if game is finished
    pub fn get_winner(&self) -> Option<u8> {
        if self.is_finished() {
            for (id, player) in &self.players {
                if player.is_winner == Some(true) {
                    return Some(*id);
                }
            }
        }
        None
    }
}
