use crate::file_parsers::FileParser;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// Game configuration data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameConfig {
    pub strings: HashMap<String, String>,
    pub units: Option<HashMap<String, UnitData>>,
    pub buildings: Option<HashMap<String, BuildingData>>,
    pub spells: Option<Vec<SpellData>>,
}

/// Unit data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitData {
    pub name: String,
    pub health: Option<u32>,
    pub damage: Option<u32>,
    pub armor: Option<u32>,
    pub speed: Option<f32>,
    pub cost: Option<UnitCost>,
    pub abilities: Option<Vec<String>>,
}

/// Building data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingData {
    pub name: String,
    pub health: Option<u32>,
    pub build_time: Option<u32>,
    pub cost: Option<UnitCost>,
    pub produces: Option<Vec<String>>,
    pub upgrades: Option<Vec<String>>,
}

/// Spell data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpellData {
    pub name: String,
    pub mana_cost: Option<u32>,
    pub damage: Option<u32>,
    pub range: Option<f32>,
    pub duration: Option<u32>,
}

/// Unit cost structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitCost {
    pub gold: Option<u32>,
    pub lumber: Option<u32>,
    pub food: Option<u32>,
}

/// JSON file parser
pub struct JsonParser;

impl FileParser for JsonParser {
    type Output = GameConfig;

    fn parse<P: AsRef<Path>>(&self, path: P) -> Result<Self::Output> {
        let path = path.as_ref();
        let content = std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read JSON file: {}", path.display()))?;
        
        // Try to parse as simple string mapping first
        if let Ok(strings) = serde_json::from_str::<HashMap<String, String>>(&content) {
            return Ok(GameConfig {
                strings,
                units: None,
                buildings: None,
                spells: None,
            });
        }
        
        // Try to parse as full config
        let config: GameConfig = serde_json::from_str(&content)
            .with_context(|| format!("Failed to parse JSON: {}", path.display()))?;
        
        Ok(config)
    }

    fn can_parse<P: AsRef<Path>>(&self, path: P) -> bool {
        path.as_ref().extension().map_or(false, |ext| ext == "json")
    }
}

impl JsonParser {
    /// Parse strings-only JSON (like enUS.json)
    pub fn parse_strings<P: AsRef<Path>>(&self, path: P) -> Result<HashMap<String, String>> {
        let path = path.as_ref();
        let content = std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read JSON file: {}", path.display()))?;
        
        let strings: HashMap<String, String> = serde_json::from_str(&content)
            .with_context(|| format!("Failed to parse JSON strings: {}", path.display()))?;
        
        Ok(strings)
    }

    /// Extract unit information from configuration
    pub fn extract_unit_info(&self, config: &GameConfig) -> Vec<String> {
        let mut info = Vec::new();
        
        if let Some(units) = &config.units {
            for (unit_id, unit_data) in units {
                info.push(format!(
                    "Unit: {} - Health: {}, Damage: {}, Cost: {} gold",
                    unit_data.name,
                    unit_data.health.unwrap_or(0),
                    unit_data.damage.unwrap_or(0),
                    unit_data.cost.as_ref().and_then(|c| c.gold).unwrap_or(0)
                ));
            }
        }
        
        info
    }

    /// Extract building information from configuration
    pub fn extract_building_info(&self, config: &GameConfig) -> Vec<String> {
        let mut info = Vec::new();
        
        if let Some(buildings) = &config.buildings {
            for (building_id, building_data) in buildings {
                info.push(format!(
                    "Building: {} - Health: {}, Build Time: {}",
                    building_data.name,
                    building_data.health.unwrap_or(0),
                    building_data.build_time.unwrap_or(0)
                ));
            }
        }
        
        info
    }

    /// Extract spell information from configuration
    pub fn extract_spell_info(&self, config: &GameConfig) -> Vec<String> {
        let mut info = Vec::new();
        
        if let Some(spells) = &config.spells {
            for spell in spells {
                info.push(format!(
                    "Spell: {} - Mana: {}, Damage: {}, Range: {}",
                    spell.name,
                    spell.mana_cost.unwrap_or(0),
                    spell.damage.unwrap_or(0),
                    spell.range.unwrap_or(0.0)
                ));
            }
        }
        
        info
    }
}
