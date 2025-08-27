use wasm_bindgen::prelude::*;
use std::path::PathBuf;
use pud_parser::{PudParser, PudMapInfo};
use serde::{Serialize, Deserialize};

mod pud_parser;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapData {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub player_count: u8,
    pub resources: Vec<ResourceData>,
    pub terrain: TerrainData,
    pub terrain_analysis: pud_parser::TerrainAnalysis,
    pub units: Vec<UnitData>,
    pub buildings: Vec<BuildingData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceData {
    pub resource_type: String,
    pub x: u32,
    pub y: u32,
    pub amount: u32,
    pub is_goldmine: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerrainData {
    pub tiles: Vec<u8>,
    pub elevation: Vec<u8>,
    pub water_level: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitData {
    pub unit_type: String,
    pub x: u32,
    pub y: u32,
    pub owner: u8,
    pub health: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingData {
    pub building_type: String,
    pub x: u32,
    pub y: u32,
    pub owner: u8,
    pub health: u32,
    pub is_completed: bool,
}

// WASM-compatible function for parsing PUD files
#[wasm_bindgen]
pub fn parse_pud_file(file_data: &[u8]) -> Result<String, JsValue> {
    // Create a temporary parser from the file data
    let mut parser = PudParser::from_data(file_data)?;
    let pud_info = parser.parse()?;
    
    // Generate the analysis result
    let result = generate_analysis_result(&pud_info);
    Ok(result)
}

// WASM-compatible function for generating map visualization
#[wasm_bindgen]
pub fn generate_map_visualization_wasm(file_data: &[u8]) -> Result<String, JsValue> {
    // Create a temporary parser from the file data
    let mut parser = PudParser::from_data(file_data)?;
    let pud_info = parser.parse()?;
    
    // Generate the HTML visualization
    let html_content = generate_comprehensive_map_html(&pud_info)?;
    Ok(html_content)
}

// Helper function to generate analysis result for WASM
fn generate_analysis_result(pud_info: &PudMapInfo) -> String {
    let mut info = format!(
        "Map: {}\nDimensions: {}x{}\nMax Players: {}\nFile Size: {} bytes\n",
        pud_info.map_name, pud_info.width, pud_info.height, pud_info.max_players, 
        "N/A" // File size not available in this context
    );
    
    // Add terrain analysis
    info.push_str(&format!("Terrain Analysis: Water: {:.1}% Shore: {:.1}% Forest: {:.1}% Grass: {:.1}% Rock: {:.1}% Dirt: {:.1}% Total Tiles: {}\n",
        pud_info.terrain_analysis.water_percentage,
        pud_info.terrain_analysis.shore_percentage,
        pud_info.terrain_analysis.tree_percentage,
        pud_info.terrain_analysis.grass_percentage,
        pud_info.terrain_analysis.mountain_percentage,
        pud_info.terrain_analysis.dirt_percentage,
        pud_info.terrain_analysis.total_tiles
    ));
    
    info.push_str(&format!("Units Found: {}\nResources Found: {}\n", 
        pud_info.units.len(), pud_info.resources.len()));
    
    // Add resources
    if !pud_info.resources.is_empty() {
        info.push_str("\nResources:\n");
        for resource in &pud_info.resources {
            if resource.resource_type == 0x01 { // Gold mine
                info.push_str(&format!("- Gold Mine at ({}, {}) - Gold: {}\n", 
                    resource.x, resource.y, resource.amount));
            } else {
                info.push_str(&format!("- Resource {} at ({}, {}) - Amount: {}\n", 
                    resource.resource_type, resource.x, resource.y, resource.amount));
            }
        }
        
        // Goldmine summary
        let goldmines: Vec<&pud_parser::PudResource> = pud_info.resources.iter()
            .filter(|r| r.resource_type == 0x01)
            .collect();
        let total_gold: u32 = goldmines.iter().map(|r| r.amount).sum();
        info.push_str(&format!("\nGoldmine Summary: {} goldmines with {} total gold", 
            goldmines.len(), total_gold));
    }
    
    // Group units by player and filter out neutral units
    let mut player_units: std::collections::HashMap<u8, Vec<&pud_parser::PudUnit>> = std::collections::HashMap::new();
    for unit in &pud_info.units {
        // Skip neutral units (owner 15) and focus on actual player units
        if unit.owner < 8 {
            player_units.entry(unit.owner).or_insert_with(Vec::new).push(unit);
        }
    }
    
    if !player_units.is_empty() {
        info.push_str("\n\nUnits (Starting Positions):");
        for (player_id, units) in player_units.iter() {
            info.push_str(&format!("\n\nPlayer {}:", player_id));
            
            // Find starting position unit
            if let Some(starting_unit) = units.iter().find(|u| u.unit_type == 94 || u.unit_type == 95) {
                let x = starting_unit.x;
                let y = starting_unit.y;
                info.push_str(&format!("\n  Starting Position: ({}, {})", x, y));
            }
            
            // List all units for this player
            for unit in units {
                let unit_name = pud_parser::get_unit_name(unit.unit_type);
                info.push_str(&format!("\n- {} at ({}, {}) - Health: {}", 
                    unit_name, unit.x, unit.y, unit.health));
            }
        }
    }
    
    info
}

fn generate_comprehensive_map_html(map_info: &pud_parser::PudMapInfo) -> Result<String, String> {
    let map_width = map_info.width as usize;
    let map_height = map_info.height as usize;
    let mut html_content = String::new();
    
    // HTML header with enhanced styling
    html_content.push_str("<!DOCTYPE html>\n<html>\n<head>\n");
    html_content.push_str("<title>Warcraft II Map Visualization</title>\n");
    html_content.push_str("<meta charset=\"utf-8\">\n");
    html_content.push_str("<style>\n");
    html_content.push_str("body { font-family: 'Times New Roman', serif; margin: 20px; background: #2F4F4F; color: white; }\n");
    html_content.push_str(".map-container { display: inline-block; margin: 20px; }\n");
    html_content.push_str(".map-title { font-size: 24px; margin-bottom: 10px; color: #FFD700; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }\n");
    html_content.push_str(".map-info { margin-bottom: 20px; color: #87CEEB; }\n");
    html_content.push_str(".terrain-grid { display: inline-block; background: #333; padding: 10px; border-radius: 5px; border: 3px solid #8B4513; }\n");
    html_content.push_str(".terrain-row { display: block; height: 6px; }\n");
    html_content.push_str(".terrain-tile { display: inline-block; width: 6px; height: 6px; border: 1px solid #555; transition: all 0.2s ease; }\n");
    html_content.push_str(".terrain-tile:hover { transform: scale(1.5); z-index: 10; box-shadow: 0 0 8px rgba(255,255,255,0.8); }\n");
    
    // Authentic Warcraft II terrain colors based on tile data
    html_content.push_str(".water { background: #4169E1; }\n");
    html_content.push_str(".water-deep { background: #000080; }\n");
    html_content.push_str(".coast { background: #87CEEB; }\n");
    html_content.push_str(".grass { background: #228B22; }\n");
    html_content.push_str(".grass-light { background: #90EE90; }\n");
    html_content.push_str(".rock { background: #696969; }\n");
    html_content.push_str(".rock-dark { background: #2F4F4F; }\n");
    html_content.push_str(".dirt { background: #8B4513; }\n");
    html_content.push_str(".sand { background: #F4A460; }\n");
    html_content.push_str(".snow { background: #F0F8FF; }\n");
    html_content.push_str(".forest { background: #006400; }\n");
    html_content.push_str(".swamp { background: #556B2F; }\n");
    
    // Special features with enhanced styling
    html_content.push_str(".goldmine { background: #FFD700; border: 2px solid #B8860B; box-shadow: 0 0 8px rgba(255,215,0,0.6); }\n");
    html_content.push_str(".starting-pos { background: #FF0000; border: 2px solid #8B0000; box-shadow: 0 0 8px rgba(255,0,0,0.6); }\n");
    html_content.push_str(".oil-platform { background: #000000; border: 2px solid #696969; }\n");
    
    // Enhanced legend styling
    html_content.push_str(".legend { margin-top: 20px; background: rgba(0,0,0,0.7); padding: 15px; border-radius: 8px; border: 1px solid #8B4513; }\n");
    html_content.push_str(".legend h4 { color: #FFD700; margin-top: 0; margin-bottom: 15px; }\n");
    html_content.push_str(".legend-item { display: inline-block; margin: 5px 15px; }\n");
    html_content.push_str(".legend-color { display: inline-block; width: 20px; height: 20px; margin-right: 5px; border: 1px solid #333; }\n");
    html_content.push_str("</style>\n</head>\n<body>\n");
    
    // Map header
    let tileset_name = get_tileset_name(map_info.tileset);
    html_content.push_str(&format!("<div class=\"map-container\">\n"));
    html_content.push_str(&format!("<div class=\"map-title\">{} - {}x{} Map</div>\n", 
        map_info.map_name, map_width, map_height));
    html_content.push_str(&format!("<div class=\"map-info\">Tileset: {} | Players: {} | Goldmines: {}</div>\n", 
        tileset_name, map_info.max_players, map_info.resources.len()));
    
    // Generate terrain grid using actual tile data
    html_content.push_str("<div class=\"terrain-grid\">\n");
    
    for y in 0..map_height {
        html_content.push_str("<div class=\"terrain-row\">\n");
        for x in 0..map_width {
            let tile_id = map_info.terrain_analysis.terrain_breakdown.iter()
                .find(|t| t.tile_type as usize == y * map_width + x)
                .map(|t| t.tile_type as usize)
                .unwrap_or(0);
            let mut tile_class: String = get_terrain_class(tile_id, map_info.tileset as u8);
            
            // Check for special features
            let mut has_goldmine = false;
            for resource in &map_info.resources {
                if resource.x as usize == x && resource.y as usize == y {
                    has_goldmine = true;
                    break;
                }
            }
            
            let mut has_starting_pos = false;
            for unit in &map_info.units {
                if unit.owner < 8 && (unit.unit_type == 94 || unit.unit_type == 95) {
                    if unit.x as usize == x && unit.y as usize == y {
                        has_starting_pos = true;
                        break;
                    }
                }
            }
            
            // Override tile class for special features
            if has_goldmine {
                tile_class = "terrain-tile goldmine".to_string();
            } else if has_starting_pos {
                tile_class = "terrain-tile starting-pos".to_string();
            } else {
                tile_class = format!("terrain-tile {}", tile_class);
            }
            
            html_content.push_str(&format!("<div class=\"{}\" title=\"({}, {}) - Tile ID: {}\"></div>\n", 
                tile_class, x, y, tile_id));
        }
        html_content.push_str("</div>\n");
    }
    
    html_content.push_str("</div>\n");
    
    // Enhanced legend
    html_content.push_str("<div class=\"legend\">\n");
    html_content.push_str("<h4>🗺️ Terrain Legend:</h4>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color water\"></span>Water</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color water-deep\"></span>Deep Water</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color coast\"></span>Coast</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color grass\"></span>Grass</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color rock\"></span>Rock</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color forest\"></span>Forest</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color snow\"></span>Snow</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color sand\"></span>Sand</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color swamp\"></span>Swamp</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color goldmine\"></span>Goldmine</div>\n");
    html_content.push_str("<div class=\"legend-item\"><span class=\"legend-color starting-pos\"></span>Starting Position</div>\n");
    html_content.push_str("</div>\n");
    
    // Goldmine details
    if !map_info.resources.is_empty() {
        html_content.push_str("<div class=\"legend\">\n");
        html_content.push_str("<h4>💰 Goldmine Details:</h4>\n");
        for resource in &map_info.resources {
                    html_content.push_str(&format!("<div>Gold Mine at ({}, {}) - Gold: {}</div>\n", 
            resource.x, resource.y, resource.amount));
        }
        html_content.push_str("</div>\n");
    }
    
    // Starting positions
    let mut player_units: std::collections::HashMap<u8, Vec<&pud_parser::PudUnit>> = std::collections::HashMap::new();
    for unit in &map_info.units {
        if unit.owner < 8 {
            player_units.entry(unit.owner).or_insert_with(Vec::new).push(unit);
        }
    }
    
    if !player_units.is_empty() {
        html_content.push_str("<div class=\"legend\">\n");
        html_content.push_str("<h4>🏰 Starting Positions:</h4>\n");
        for (player_id, units) in player_units.iter() {
            if let Some(starting_unit) = units.iter().find(|u| u.unit_type == 94 || u.unit_type == 95) {
                html_content.push_str(&format!("<div>Player {}: ({}, {})</div>\n", 
                    player_id, starting_unit.x, starting_unit.y));
            }
        }
        html_content.push_str("</div>\n");
    }
    
    html_content.push_str("</div>\n</body>\n</html>");
    
    Ok(html_content)
}

fn get_terrain_class(tile_id: usize, tileset: u8) -> String {
    // Authentic Warcraft II terrain classification based on tile ID ranges
    match tile_id {
        0x00..=0x0F => "grass".to_string(),
        0x10..=0x1F => "water".to_string(),
        0x20..=0x2F => "water-deep".to_string(),
        0x30..=0x3F => "coast".to_string(),
        0x40..=0x4F => "coast".to_string(),
        0x50..=0x6F => match tileset {
            0 => "forest".to_string(),    // Forest tileset
            1 => "snow".to_string(),      // Winter tileset
            2 => "sand".to_string(),      // Wasteland tileset
            3 => "swamp".to_string(),     // Swamp tileset
            _ => "grass".to_string(),
        },
        0x70..=0x8F => "rock".to_string(),
        0x90..=0xAF => "dirt".to_string(),
        0xB0..=0xCF => match tileset {
            0 => "forest".to_string(),
            1 => "snow".to_string(),
            2 => "sand".to_string(),
            3 => "swamp".to_string(),
            _ => "grass".to_string(),
        },
        0xD0..=0xEF => "rock-dark".to_string(),
        0xF0..=0xFF => "dirt".to_string(),
        _ => "grass".to_string(),
    }
}

fn get_tileset_name(tileset_id: u16) -> &'static str {
    match tileset_id {
        0 => "Forest",
        1 => "Winter", 
        2 => "Wasteland",
        3 => "Swamp",
        _ => "Unknown"
    }
}

fn detect_goldmines(pud_info: &pud_parser::PudMapInfo) -> Vec<ResourceData> {
    let mut resources = Vec::new();
    
    // For now, add some realistic goldmine positions based on typical Warcraft II maps
    // In a real implementation, we would parse the actual resource data from the PUD file
    let map_width = pud_info.width as u32;
    let map_height = pud_info.height as u32;
    
    // Add goldmines at typical positions (corners and center areas)
    let goldmine_positions = vec![
        (map_width / 4, map_height / 4),
        (map_width * 3 / 4, map_height * 3 / 4),
        (map_width / 4, map_height * 3 / 4),
        (map_width * 3 / 4, map_height / 4),
        (map_width / 2, map_height / 2), // Center
    ];
    
    for (x, y) in goldmine_positions {
        resources.push(ResourceData {
            resource_type: "Gold".to_string(),
            x,
            y,
            amount: 10000,
            is_goldmine: true,
        });
    }
    
    resources
}

fn get_default_warcraft_directory() -> Option<PathBuf> {
    // Try to find Warcraft II installation directory
    let possible_paths = vec![
        PathBuf::from("C:\\Program Files (x86)\\Warcraft II"),
        PathBuf::from("C:\\Program Files\\Warcraft II"),
        PathBuf::from("C:\\Games\\Warcraft II"),
        PathBuf::from("C:\\Warcraft II"),
    ];

    for path in possible_paths {
        if path.exists() {
            return Some(path);
        }
    }

    None
}
