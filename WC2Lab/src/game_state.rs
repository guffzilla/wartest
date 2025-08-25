use anyhow::Result;
use log::{info, warn, error, debug};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

use crate::memory::ProcessMemoryMap;

/// Complete game state for WC2 Remastered
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    /// Timestamp of this game state
    pub timestamp: DateTime<Utc>,
    /// Game phase
    pub game_phase: GamePhase,
    /// Map information
    pub map: MapInfo,
    /// Players in the game
    pub players: Vec<PlayerInfo>,
    /// Units on the map
    pub units: Vec<UnitInfo>,
    /// Buildings on the map
    pub buildings: Vec<BuildingInfo>,
    /// Resources for each player
    pub resources: HashMap<u8, ResourceInfo>,
    /// Game time in seconds
    pub game_time: u32,
    /// Current frame number
    pub frame: u32,
    /// Game speed
    pub game_speed: GameSpeed,
    /// Victory conditions
    pub victory_conditions: VictoryConditions,
}

/// Game phases in WC2
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GamePhase {
    /// Game is loading
    Loading,
    /// Main menu
    MainMenu,
    /// Single player campaign
    Campaign,
    /// Single player scenario
    Scenario,
    /// Multiplayer game
    Multiplayer,
    /// Game is paused
    Paused,
    /// Game is running
    Running,
    /// Game is ending
    Ending,
}

/// Map information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapInfo {
    /// Map name
    pub name: String,
    /// Map dimensions (width x height)
    pub dimensions: (u16, u16),
    /// Map type
    pub map_type: MapType,
    /// Starting resources
    pub starting_resources: ResourceInfo,
    /// Victory conditions
    pub victory_conditions: VictoryConditions,
    /// Map tiles
    pub tiles: Vec<TileInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MapType {
    Campaign,
    Scenario,
    Custom,
    Multiplayer,
}

/// Tile information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileInfo {
    /// Tile position
    pub position: (u16, u16),
    /// Tile type
    pub tile_type: TileType,
    /// Terrain type
    pub terrain: TerrainType,
    /// Whether tile is passable
    pub passable: bool,
    /// Whether tile is buildable
    pub buildable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TileType {
    Land,
    Water,
    Shore,
    Forest,
    Mountain,
    GoldMine,
    OilField,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TerrainType {
    Grass,
    Dirt,
    Sand,
    Snow,
    Swamp,
    Lava,
}

/// Player information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerInfo {
    /// Player ID (0-7)
    pub id: u8,
    /// Player name
    pub name: String,
    /// Player race
    pub race: Race,
    /// Player color
    pub color: PlayerColor,
    /// Whether player is human
    pub is_human: bool,
    /// Whether player is alive
    pub is_alive: bool,
    /// Player's team
    pub team: Option<u8>,
    /// Player's resources
    pub resources: ResourceInfo,
    /// Player's score
    pub score: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Race {
    Human,
    Orc,
    Neutral,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlayerColor {
    Red,
    Blue,
    Green,
    Yellow,
    Purple,
    Orange,
    Teal,
    Pink,
}

/// Unit information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitInfo {
    /// Unique unit ID
    pub id: u32,
    /// Unit type
    pub unit_type: UnitType,
    /// Unit position
    pub position: (f32, f32),
    /// Unit owner (player ID)
    pub owner: u8,
    /// Unit health (0-100)
    pub health: u8,
    /// Unit mana (0-100)
    pub mana: u8,
    /// Unit experience level
    pub experience: u8,
    /// Unit orders
    pub orders: Vec<UnitOrder>,
    /// Unit target (if any)
    pub target: Option<u32>,
    /// Whether unit is selected
    pub is_selected: bool,
    /// Whether unit is moving
    pub is_moving: bool,
    /// Whether unit is attacking
    pub is_attacking: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UnitType {
    // Human units
    Peasant,
    Footman,
    Knight,
    Archer,
    Paladin,
    Mage,
    Cleric,
    
    // Orc units
    Peon,
    Grunt,
    Troll,
    Ogre,
    Catapult,
    DeathKnight,
    Shaman,
    
    // Neutral units
    GoldMine,
    OilPlatform,
    Farm,
    Barracks,
    Church,
    Tower,
    Castle,
}

/// Unit orders
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitOrder {
    /// Order type
    pub order_type: OrderType,
    /// Target position
    pub target_position: Option<(f32, f32)>,
    /// Target unit/building ID
    pub target_id: Option<u32>,
    /// Order progress (0-100)
    pub progress: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderType {
    Move,
    Attack,
    Build,
    Harvest,
    Repair,
    Train,
    Research,
    Stop,
    Hold,
    Patrol,
}

/// Building information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingInfo {
    /// Unique building ID
    pub id: u32,
    /// Building type
    pub building_type: BuildingType,
    /// Building position
    pub position: (f32, f32),
    /// Building owner (player ID)
    pub owner: u8,
    /// Building health (0-100)
    pub health: u8,
    /// Building construction progress (0-100)
    pub construction_progress: u8,
    /// Whether building is selected
    pub is_selected: bool,
    /// Current production (if any)
    pub current_production: Option<ProductionInfo>,
    /// Production queue
    pub production_queue: Vec<ProductionInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BuildingType {
    // Human buildings
    TownHall,
    HumanBarracks,
    Church,
    MageTower,
    HumanFarm,
    HumanLumberMill,
    HumanBlacksmith,
    HumanTower,
    Castle,
    
    // Orc buildings
    GreatHall,
    OrcBarracks,
    Temple,
    OgreMound,
    OrcFarm,
    OrcLumberMill,
    OrcBlacksmith,
    OrcTower,
    Fortress,
    
    // Neutral buildings
    GoldMine,
    OilPlatform,
}

/// Production information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionInfo {
    /// What is being produced
    pub product_type: ProductType,
    /// Production progress (0-100)
    pub progress: u8,
    /// Time remaining in seconds
    pub time_remaining: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProductType {
    Unit(UnitType),
    Building(BuildingType),
    Upgrade(UpgradeType),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpgradeType {
    // Human upgrades
    HumanArmor,
    HumanWeapon,
    HumanRange,
    
    // Orc upgrades
    OrcArmor,
    OrcWeapon,
    OrcRange,
}

/// Resource information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceInfo {
    /// Gold amount
    pub gold: u32,
    /// Wood amount
    pub wood: u32,
    /// Ore amount
    pub ore: u32,
    /// Oil amount
    pub oil: u32,
}

/// Game speed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameSpeed {
    Slow,
    Normal,
    Fast,
    VeryFast,
}

/// Victory conditions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VictoryConditions {
    /// Victory type
    pub victory_type: VictoryType,
    /// Time limit in seconds (if applicable)
    pub time_limit: Option<u32>,
    /// Resource goal (if applicable)
    pub resource_goal: Option<u32>,
    /// Unit goal (if applicable)
    pub unit_goal: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VictoryType {
    /// Destroy all enemy units and buildings
    Annihilation,
    /// Control specific locations
    Control,
    /// Reach specific resource amounts
    Resources,
    /// Survive for a time limit
    Survival,
    /// Custom victory conditions
    Custom,
}

/// Game state tracker for WC2 Remastered
pub struct GameStateTracker {
    /// Previous game states for comparison
    previous_states: Vec<GameState>,
    /// Maximum number of states to keep
    max_states: usize,
    /// State change detection thresholds
    change_thresholds: ChangeThresholds,
}

/// Thresholds for detecting state changes
#[derive(Debug, Clone)]
pub struct ChangeThresholds {
    /// Minimum health change to trigger update
    pub health_change: u8,
    /// Minimum position change to trigger update
    pub position_change: f32,
    /// Minimum resource change to trigger update
    pub resource_change: u32,
}

impl GameStateTracker {
    /// Create a new game state tracker
    pub fn new() -> Result<Self> {
        Ok(Self {
            previous_states: Vec::new(),
            max_states: 100,
            change_thresholds: ChangeThresholds {
                health_change: 5,
                position_change: 1.0,
                resource_change: 10,
            },
        })
    }

    /// Track game state from memory map
    pub async fn track_state(&mut self, memory_map: &ProcessMemoryMap) -> Result<GameState> {
        info!("📊 Tracking game state from memory map (PID: {})", memory_map.pid);
        
        // Extract game state from memory regions
        let game_state = self.extract_game_state(memory_map).await?;
        
        // Detect significant changes
        if let Some(previous_state) = self.previous_states.last() {
            let changes = self.detect_state_changes(previous_state, &game_state);
            if !changes.is_empty() {
                info!("🔄 Detected {} state changes", changes.len());
                for change in &changes {
                    debug!("📝 Change: {:?}", change);
                }
            }
        }
        
        // Add to history
        self.previous_states.push(game_state.clone());
        
        // Maintain history size
        if self.previous_states.len() > self.max_states {
            self.previous_states.remove(0);
        }
        
        info!("✅ Game state tracked successfully");
        Ok(game_state)
    }

    /// Extract game state from memory map
    async fn extract_game_state(&self, memory_map: &ProcessMemoryMap) -> Result<GameState> {
        // This is where we'd implement the actual memory parsing
        // For now, create a sample state for testing
        
        let game_state = GameState {
            timestamp: Utc::now(),
            game_phase: GamePhase::Running,
            map: MapInfo {
                name: "Sample Map".to_string(),
                dimensions: (128, 128),
                map_type: MapType::Custom,
                starting_resources: ResourceInfo {
                    gold: 1000,
                    wood: 500,
                    ore: 200,
                    oil: 100,
                },
                victory_conditions: VictoryConditions {
                    victory_type: VictoryType::Annihilation,
                    time_limit: None,
                    resource_goal: None,
                    unit_goal: None,
                },
                tiles: Vec::new(),
            },
            players: vec![
                PlayerInfo {
                    id: 0,
                    name: "Player 1".to_string(),
                    race: Race::Human,
                    color: PlayerColor::Red,
                    is_human: true,
                    is_alive: true,
                    team: None,
                    resources: ResourceInfo {
                        gold: 800,
                        wood: 300,
                        ore: 150,
                        oil: 75,
                    },
                    score: 0,
                },
            ],
            units: vec![
                UnitInfo {
                    id: 1,
                    unit_type: UnitType::Footman,
                    position: (64.0, 64.0),
                    owner: 0,
                    health: 100,
                    mana: 0,
                    experience: 0,
                    orders: vec![],
                    target: None,
                    is_selected: false,
                    is_moving: false,
                    is_attacking: false,
                },
            ],
            buildings: vec![
                BuildingInfo {
                    id: 1,
                    building_type: BuildingType::TownHall,
                    position: (60.0, 60.0),
                    owner: 0,
                    health: 100,
                    construction_progress: 100,
                    is_selected: false,
                    current_production: None,
                    production_queue: vec![],
                },
            ],
            resources: HashMap::new(),
            game_time: 0,
            frame: 0,
            game_speed: GameSpeed::Normal,
            victory_conditions: VictoryConditions {
                victory_type: VictoryType::Annihilation,
                time_limit: None,
                resource_goal: None,
                unit_goal: None,
            },
        };
        
        Ok(game_state)
    }

    /// Detect changes between two game states
    fn detect_state_changes(&self, previous: &GameState, current: &GameState) -> Vec<StateChange> {
        let mut changes = Vec::new();
        
        // Check unit changes
        for current_unit in &current.units {
            if let Some(previous_unit) = previous.units.iter().find(|u| u.id == current_unit.id) {
                // Health changes
                if (current_unit.health as i16 - previous_unit.health as i16).abs() 
                   >= self.change_thresholds.health_change as i16 {
                    changes.push(StateChange::UnitHealthChanged {
                        unit_id: current_unit.id,
                        old_health: previous_unit.health,
                        new_health: current_unit.health,
                    });
                }
                
                // Position changes
                let dx = current_unit.position.0 - previous_unit.position.0;
                let dy = current_unit.position.1 - previous_unit.position.1;
                let distance = (dx * dx + dy * dy).sqrt();
                
                if distance >= self.change_thresholds.position_change {
                    changes.push(StateChange::UnitMoved {
                        unit_id: current_unit.id,
                        old_position: previous_unit.position,
                        new_position: current_unit.position,
                    });
                }
            } else {
                // New unit
                changes.push(StateChange::UnitCreated {
                    unit_id: current_unit.id,
                    unit_type: current_unit.unit_type.clone(),
                    position: current_unit.position,
                    owner: current_unit.owner,
                });
            }
        }
        
        // Check for removed units
        for previous_unit in &previous.units {
            if !current.units.iter().any(|u| u.id == previous_unit.id) {
                changes.push(StateChange::UnitDestroyed {
                    unit_id: previous_unit.id,
                    unit_type: previous_unit.unit_type.clone(),
                });
            }
        }
        
        // Check resource changes
        for (player_id, current_resources) in &current.resources {
            if let Some(previous_resources) = previous.resources.get(player_id) {
                if (current_resources.gold as i32 - previous_resources.gold as i32).abs() 
                   >= self.change_thresholds.resource_change as i32 {
                    changes.push(StateChange::ResourcesChanged {
                        player_id: *player_id,
                        resource_type: "gold".to_string(),
                        old_amount: previous_resources.gold,
                        new_amount: current_resources.gold,
                    });
                }
            }
        }
        
        changes
    }

    /// Get the most recent game state
    pub fn get_latest_state(&self) -> Option<&GameState> {
        self.previous_states.last()
    }

    /// Get game state history
    pub fn get_state_history(&self) -> &[GameState] {
        &self.previous_states
    }

    /// Clear state history
    pub fn clear_history(&mut self) {
        self.previous_states.clear();
        info!("🗑️  Game state history cleared");
    }
}

/// Types of state changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateChange {
    UnitCreated {
        unit_id: u32,
        unit_type: UnitType,
        position: (f32, f32),
        owner: u8,
    },
    UnitDestroyed {
        unit_id: u32,
        unit_type: UnitType,
    },
    UnitHealthChanged {
        unit_id: u32,
        old_health: u8,
        new_health: u8,
    },
    UnitMoved {
        unit_id: u32,
        old_position: (f32, f32),
        new_position: (f32, f32),
    },
    ResourcesChanged {
        player_id: u8,
        resource_type: String,
        old_amount: u32,
        new_amount: u32,
    },
    BuildingCreated {
        building_id: u32,
        building_type: BuildingType,
        position: (f32, f32),
        owner: u8,
    },
    BuildingDestroyed {
        building_id: u32,
        building_type: BuildingType,
    },
}
