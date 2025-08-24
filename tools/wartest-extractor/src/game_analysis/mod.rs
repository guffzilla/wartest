pub mod unit_analyzer;
pub mod map_analyzer;
pub mod campaign_analyzer;

use anyhow::Result;
use serde::{Deserialize, Serialize};

/// Game analysis results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameAnalysis {
    pub units: Vec<UnitAnalysis>,
    pub buildings: Vec<BuildingAnalysis>,
    pub maps: Vec<MapAnalysis>,
    pub campaigns: Vec<CampaignAnalysis>,
}

/// Unit analysis data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitAnalysis {
    pub name: String,
    pub health: u32,
    pub damage: u32,
    pub armor: u32,
    pub speed: f32,
    pub cost: UnitCost,
    pub abilities: Vec<String>,
}

/// Building analysis data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingAnalysis {
    pub name: String,
    pub health: u32,
    pub build_time: u32,
    pub cost: UnitCost,
    pub produces: Vec<String>,
    pub upgrades: Vec<String>,
}

/// Map analysis data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapAnalysis {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub players: u32,
    pub resources: MapResources,
}

/// Campaign analysis data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignAnalysis {
    pub name: String,
    pub missions: Vec<MissionAnalysis>,
}

/// Mission analysis data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MissionAnalysis {
    pub name: String,
    pub objectives: Vec<String>,
    pub starting_resources: UnitCost,
}

/// Unit cost structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitCost {
    pub gold: u32,
    pub lumber: u32,
    pub food: u32,
}

/// Map resources structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapResources {
    pub gold_mines: u32,
    pub trees: u32,
    pub neutral_units: u32,
}
