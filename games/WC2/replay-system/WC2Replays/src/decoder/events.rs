use serde::{Serialize, Deserialize};

/// Game event extracted from replay
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameEvent {
    pub event_type: EventType,
    pub timestamp: u32, // Game time in milliseconds
    pub size: u16,      // Event data size
    pub data: Vec<u8>,  // Raw event data
}

/// Types of game events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    PlayerAction,
    UnitMove,
    UnitAttack,
    BuildingConstruct,
    ResourceGather,
    UnitTrain,
    Research,
    Chat,
    Unknown,
}

/// Player action event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerAction {
    pub player_id: u8,
    pub action_type: ActionType,
    pub target_x: u16,
    pub target_y: u16,
    pub unit_id: Option<u32>,
}

/// Types of player actions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    Move,
    Attack,
    Build,
    Train,
    Research,
    Select,
    Deselect,
    Unknown,
}

/// Unit movement event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitMove {
    pub unit_id: u32,
    pub start_x: u16,
    pub start_y: u16,
    pub end_x: u16,
    pub end_y: u16,
    pub speed: f32,
}

/// Unit attack event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitAttack {
    pub attacker_id: u32,
    pub target_id: u32,
    pub damage: u16,
    pub attack_type: AttackType,
}

/// Attack types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AttackType {
    Normal,
    Pierce,
    Siege,
    Magic,
}

/// Building construction event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingConstruct {
    pub building_type: BuildingType,
    pub x: u16,
    pub y: u16,
    pub player_id: u8,
    pub construction_time: u32,
}

/// Building types in WC2
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BuildingType {
    // Human buildings
    TownHall,
    Barracks,
    Farm,
    LumberMill,
    Blacksmith,
    Church,
    Tower,
    Castle,
    
    // Orc buildings
    GreatHall,
    Peon,
    FarmOrc,
    BarracksOrc,
    WarMill,
    Temple,
    TowerOrc,
    Fortress,
    
    Unknown,
}

/// Resource gathering event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceGather {
    pub unit_id: u32,
    pub resource_type: ResourceType,
    pub amount: u16,
    pub location_x: u16,
    pub location_y: u16,
}

/// Resource types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResourceType {
    Gold,
    Wood,
    Oil,
}

/// Unit training event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitTrain {
    pub building_id: u32,
    pub unit_type: UnitType,
    pub training_time: u32,
    pub player_id: u8,
}

/// Unit types in WC2
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UnitType {
    // Human units
    Peasant,
    Footman,
    Knight,
    Archer,
    Paladin,
    Mage,
    Ballista,
    
    // Orc units
    Peon,
    Grunt,
    Ogre,
    Troll,
    Catapult,
    DeathKnight,
    OgreMage,
    
    Unknown,
}

/// Research event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Research {
    pub building_id: u32,
    pub research_type: ResearchType,
    pub research_time: u32,
    pub player_id: u8,
}

/// Research types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResearchType {
    // Human research
    LongSword,
    ImprovedBow,
    PlateMail,
    Ballista,
    
    // Orc research
    SharpAxe,
    SpikedClub,
    ChainMail,
    Catapult,
    
    Unknown,
}

/// Chat event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chat {
    pub player_id: u8,
    pub message: String,
    pub chat_type: ChatType,
}

/// Chat types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChatType {
    All,
    Allies,
    Private,
}
