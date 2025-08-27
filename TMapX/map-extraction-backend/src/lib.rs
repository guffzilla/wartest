use wasm_bindgen::prelude::*;
use std::path::PathBuf;
use pud_parser::{PudParser, PudMapInfo};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use flate2::write::GzEncoder;
use flate2::Compression;
use std::io::Write;

mod pud_parser;

#[derive(Serialize, Deserialize)]
pub struct TerrainRun {
    pub terrain_type: String,
    pub count: u32,
    pub start_x: u32,
    pub start_y: u32,
}

#[derive(Serialize, Deserialize)]
pub struct MapMarker {
    pub x: u32,
    pub y: u32,
    pub marker_type: String, // "player", "goldmine", "oil"
    pub label: String,
    pub amount: Option<u32>,
}

#[derive(Serialize, Deserialize)]
pub struct TerrainStats {
    pub water_percentage: f32,
    pub forest_percentage: f32,
    pub grass_percentage: f32,
    pub rock_percentage: f32,
    pub shore_percentage: f32,
    pub dirt_percentage: f32,
}

#[derive(Serialize, Deserialize)]
pub struct OptimizedMapData {
    pub width: u32,
    pub height: u32,
    pub tileset: u8,
    pub terrain_runs: Vec<TerrainRun>,
    pub markers: Vec<MapMarker>,
    pub terrain_stats: TerrainStats,
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

#[derive(Debug, Deserialize)]
struct TerrainMapping {
    tile_mapping: HashMap<String, String>,
    tileset_overrides: HashMap<String, HashMap<String, String>>,
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
            let resource_name = pud_parser::get_resource_name(resource.resource_type);
            info.push_str(&format!("- {} at ({}, {}) - Amount: {}\n", 
                resource_name, resource.x, resource.y, resource.amount));
        }
        
        // Goldmine summary
        let goldmines: Vec<&pud_parser::PudResource> = pud_info.resources.iter()
            .filter(|r| r.resource_type == 0)
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
    
    // Zoom functionality
    html_content.push_str(".zoom-controls { margin: 10px 0; text-align: center; }\n");
    html_content.push_str(".zoom-btn { background: #8B4513; color: white; border: none; padding: 8px 15px; margin: 0 5px; border-radius: 5px; cursor: pointer; }\n");
    html_content.push_str(".zoom-btn:hover { background: #A0522D; }\n");
    html_content.push_str(".zoom-btn:active { background: #654321; }\n");
    html_content.push_str(".terrain-grid.zoom-1 .terrain-tile { width: 6px; height: 6px; }\n");
    html_content.push_str(".terrain-grid.zoom-2 .terrain-tile { width: 8px; height: 8px; }\n");
    html_content.push_str(".terrain-grid.zoom-3 .terrain-tile { width: 12px; height: 12px; }\n");
    html_content.push_str(".terrain-grid.zoom-4 .terrain-tile { width: 16px; height: 16px; }\n");
    html_content.push_str(".terrain-grid.zoom-5 .terrain-tile { width: 24px; height: 24px; }\n");
    
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
    
    // Zoom controls
    html_content.push_str("<div class=\"zoom-controls\">\n");
    html_content.push_str("<button class=\"zoom-btn\" onclick=\"setZoom(1)\">1x</button>\n");
    html_content.push_str("<button class=\"zoom-btn\" onclick=\"setZoom(2)\">2x</button>\n");
    html_content.push_str("<button class=\"zoom-btn\" onclick=\"setZoom(3)\">3x</button>\n");
    html_content.push_str("<button class=\"zoom-btn\" onclick=\"setZoom(4)\">4x</button>\n");
    html_content.push_str("<button class=\"zoom-btn\" onclick=\"setZoom(5)\">5x</button>\n");
    html_content.push_str("</div>\n");
    
    // Generate terrain grid using actual tile data
    html_content.push_str("<div class=\"terrain-grid zoom-1\">\n");
    
            for y in 0..map_height {
                html_content.push_str("<div class=\"terrain-row\">\n");
                for x in 0..map_width {
                    let tile_index = y * map_width + x;
                    let tile_id = if tile_index < map_info.terrain.len() {
                        map_info.terrain[tile_index] as usize
                    } else {
                        0
                    };
                    let terrain_type = get_terrain_class(tile_id, map_info.tileset as u8);
                    
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
                    
                    // Build the complete CSS class string
                    let mut css_classes = vec!["terrain-tile"];
                    
                    if has_goldmine {
                        css_classes.push("goldmine");
                    } else if has_starting_pos {
                        css_classes.push("starting-pos");
                    } else {
                        css_classes.push(&terrain_type);
                    }
                    
                    let tile_class = css_classes.join(" ");
                    
                    html_content.push_str(&format!("<div class=\"{}\" title=\"({}, {}) - Tile ID: {} - Terrain: {}\" style=\"background-color: {}\"></div>\n", 
                        tile_class, x, y, tile_id, terrain_type, get_terrain_color(terrain_type)));
                }
                html_content.push_str("</div>\n");
            }
    
    html_content.push_str("</div>\n");
    
    // Add interactive markers for players, goldmines, and oil platforms
    html_content.push_str("<div class=\"map-markers\">\n");
    
    // Add player markers
    for unit in &map_info.units {
        if unit.owner < 8 && (unit.unit_type == 94 || unit.unit_type == 95) {
            let player_number = unit.owner + 1; // Convert 0-7 to 1-8
            let x_pos = unit.x as f32 * 6.0; // 6px tile size
            let y_pos = unit.y as f32 * 6.0;
            
            html_content.push_str(&format!(
                "<div class=\"player-marker\" style=\"position: absolute; left: {}px; top: {}px;\" \
                onmouseover=\"showTooltip(this, 'Player {}', event.pageX + 10, event.pageY - 30)\" \
                onmouseout=\"hideTooltip()\"></div>\n",
                x_pos, y_pos, player_number
            ));
        }
    }
    
    // Add resource markers (goldmines and oil platforms)
    for resource in &map_info.resources {
        let x_pos = resource.x as f32 * 6.0;
        let y_pos = resource.y as f32 * 6.0;
        
        match resource.resource_type {
            0 => { // Goldmine
                html_content.push_str(&format!(
                    "<div class=\"goldmine-marker\" style=\"position: absolute; left: {}px; top: {}px;\" \
                    onmouseover=\"showTooltip(this, 'Gold: {}', event.pageX + 10, event.pageY - 30)\" \
                    onmouseout=\"hideTooltip()\"></div>\n",
                    x_pos, y_pos, resource.amount
                ));
            },
            1 => { // Oil Platform
                html_content.push_str(&format!(
                    "<div class=\"oil-marker\" style=\"position: absolute; left: {}px; top: {}px;\" \
                    onmouseover=\"showTooltip(this, 'Oil: {}', event.pageX + 10, event.pageY - 30)\" \
                    onmouseout=\"hideTooltip()\"></div>\n",
                    x_pos, y_pos, resource.amount
                ));
            },
            _ => { // Other resources
                let resource_name = pud_parser::get_resource_name(resource.resource_type);
                html_content.push_str(&format!(
                    "<div class=\"resource-marker\" style=\"position: absolute; left: {}px; top: {}px;\" \
                    onmouseover=\"showTooltip(this, '{}: {}', event.pageX + 10, event.pageY - 30)\" \
                    onmouseout=\"hideTooltip()\"></div>\n",
                    x_pos, y_pos, resource_name, resource.amount
                ));
            }
        }
    }
    
    html_content.push_str("</div>\n");
    
    // Terrain percentages (no legend needed)
    html_content.push_str("<div class=\"legend\">\n");
    html_content.push_str("<h4>📊 Terrain Summary:</h4>\n");
    html_content.push_str(&format!("<div>Water: {:.1}% | Forest: {:.1}% | Grass: {:.1}% | Rock: {:.1}% | Shore: {:.1}% | Dirt: {:.1}%</div>\n",
        map_info.terrain_analysis.water_percentage,
        map_info.terrain_analysis.tree_percentage,
        map_info.terrain_analysis.grass_percentage,
        map_info.terrain_analysis.mountain_percentage,
        map_info.terrain_analysis.shore_percentage,
        map_info.terrain_analysis.dirt_percentage));
    html_content.push_str("</div>\n");
    
                    // Goldmine details
                if !map_info.resources.is_empty() {
                    html_content.push_str("<div class=\"legend\">\n");
                    html_content.push_str("<h4>💰 Resource Details:</h4>\n");
                    for resource in &map_info.resources {
                        let resource_name = pud_parser::get_resource_name(resource.resource_type);
                        html_content.push_str(&format!("<div>{} at ({}, {}) - Amount: {}</div>\n", 
                            resource_name, resource.x, resource.y, resource.amount));
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
    
    // Add JavaScript for zoom functionality
    html_content.push_str("<script>\n");
    html_content.push_str("function setZoom(level) {\n");
    html_content.push_str("    const grid = document.querySelector('.terrain-grid');\n");
    html_content.push_str("    grid.className = 'terrain-grid zoom-' + level;\n");
    html_content.push_str("    \n");
    html_content.push_str("    // Update button states\n");
    html_content.push_str("    document.querySelectorAll('.zoom-btn').forEach(btn => {\n");
    html_content.push_str("        btn.style.background = '#8B4513';\n");
    html_content.push_str("    });\n");
    html_content.push_str("    event.target.style.background = '#A0522D';\n");
    html_content.push_str("}\n");
    html_content.push_str("</script>\n");
    
    html_content.push_str("</div>\n</body>\n</html>");
    
    Ok(html_content)
}

#[wasm_bindgen]
pub fn get_optimized_map_data(file_data: &[u8]) -> Result<JsValue, JsValue> {
    let mut parser = PudParser::from_data(file_data)
        .map_err(|e| JsValue::from_str(&format!("Failed to create parser: {}", e)))?;
    let map_info = parser.parse()
        .map_err(|e| JsValue::from_str(&format!("Failed to parse PUD file: {}", e)))?;

    // Generate terrain runs using run-length encoding
    let mut terrain_runs = Vec::new();
    let mut current_run = None;
    
    for y in 0..map_info.height {
        for x in 0..map_info.width {
            let tile_index = (y * map_info.width + x) as usize;
            let tile_id = if tile_index < map_info.terrain.len() {
                map_info.terrain[tile_index]
            } else {
                0
            };
            
            let terrain_type = get_terrain_class(tile_id as usize, map_info.tileset as u8);
            
            match current_run {
                Some((ref run_type, ref mut count, start_x, start_y)) if *run_type == terrain_type => {
                    *count += 1;
                }
                _ => {
                    // End current run and start new one
                    if let Some((run_type, count, start_x, start_y)) = current_run {
                        terrain_runs.push(TerrainRun {
                            terrain_type: run_type,
                            count,
                            start_x,
                            start_y,
                        });
                    }
                    current_run = Some((terrain_type.to_string(), 1, x as u32, y as u32));
                }
            }
        }
    }
    
    // Add final run
    if let Some((run_type, count, start_x, start_y)) = current_run {
        terrain_runs.push(TerrainRun {
            terrain_type: run_type,
            count,
            start_x,
            start_y,
        });
    }

    // Generate markers (only actual resources/units, not tile flags)
    let mut markers = Vec::new();
    
    // Add player starting positions
    for unit in &map_info.units {
        if unit.owner < 8 && (unit.unit_type == 94 || unit.unit_type == 95) {
            markers.push(MapMarker {
                x: unit.x as u32,
                y: unit.y as u32,
                marker_type: "player".to_string(),
                label: format!("Player {}", unit.owner + 1),
                amount: None,
            });
        }
    }
    
    // Add resources
    for resource in &map_info.resources {
        let marker_type = match resource.resource_type {
            0 => "goldmine",
            1 => "oil",
            _ => "resource",
        };
        
        let label = match resource.resource_type {
            0 => format!("Gold: {}", resource.amount),
            1 => format!("Oil: {}", resource.amount),
            _ => format!("Resource: {}", resource.amount),
        };
        
        markers.push(MapMarker {
            x: resource.x as u32,
            y: resource.y as u32,
            marker_type: marker_type.to_string(),
            label,
            amount: Some(resource.amount as u32),
        });
    }

    let terrain_stats = TerrainStats {
        water_percentage: map_info.terrain_analysis.water_percentage,
        forest_percentage: map_info.terrain_analysis.tree_percentage,
        grass_percentage: map_info.terrain_analysis.grass_percentage,
        rock_percentage: map_info.terrain_analysis.mountain_percentage,
        shore_percentage: map_info.terrain_analysis.shore_percentage,
        dirt_percentage: map_info.terrain_analysis.dirt_percentage,
    };

    let optimized_map_data = OptimizedMapData {
        width: map_info.width as u32,
        height: map_info.height as u32,
        tileset: map_info.tileset as u8,
        terrain_runs,
        markers,
        terrain_stats,
    };

    Ok(JsValue::from_str(&serde_json::to_string(&optimized_map_data).unwrap()))
}

#[wasm_bindgen]
pub fn get_compressed_map_data(file_data: &[u8]) -> Result<JsValue, JsValue> {
    // First get the optimized data
    let optimized_data = get_optimized_map_data(file_data)?;
    let json_string = optimized_data.as_string().unwrap();
    
    // Compress the JSON data using gzip
    let mut encoder = GzEncoder::new(Vec::new(), Compression::best());
    encoder.write_all(json_string.as_bytes())
        .map_err(|e| JsValue::from_str(&format!("Compression failed: {}", e)))?;
    
    let compressed_data = encoder.finish()
        .map_err(|e| JsValue::from_str(&format!("Compression finalization failed: {}", e)))?;
    
    // Return both compressed data and original size for comparison
    let result = CompressedMapData {
        compressed_size: compressed_data.len() as u32,
        original_size: json_string.len() as u32,
        compression_ratio: ((json_string.len() - compressed_data.len()) as f64 / json_string.len() as f64 * 100.0) as f32,
        data: compressed_data,
    };
    
    Ok(JsValue::from_str(&serde_json::to_string(&result).unwrap()))
}

#[derive(Serialize, Deserialize)]
pub struct CompressedMapData {
    pub compressed_size: u32,
    pub original_size: u32,
    pub compression_ratio: f32,
    pub data: Vec<u8>,
}

#[wasm_bindgen]
pub fn get_binary_map_data(file_data: &[u8]) -> Result<JsValue, JsValue> {
    // Get the optimized data first
    let optimized_data = get_optimized_map_data(file_data)?;
    let json_string = optimized_data.as_string().unwrap();
    let map_data: OptimizedMapData = serde_json::from_str(&json_string)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse optimized data: {}", e)))?;
    
    // Create binary representation
    let mut binary_data = Vec::new();
    
    // Header: width (2 bytes), height (2 bytes), tileset (1 byte)
    binary_data.extend_from_slice(&(map_data.width as u16).to_le_bytes());
    binary_data.extend_from_slice(&(map_data.height as u16).to_le_bytes());
    binary_data.push(map_data.tileset);
    
    // Terrain runs count (2 bytes)
    let runs_count = map_data.terrain_runs.len() as u16;
    binary_data.extend_from_slice(&runs_count.to_le_bytes());
    
    // Each terrain run: terrain_type_id (1 byte), count (2 bytes), start_x (2 bytes), start_y (2 bytes)
    for run in &map_data.terrain_runs {
        let terrain_id = get_terrain_id(&run.terrain_type);
        binary_data.push(terrain_id);
        binary_data.extend_from_slice(&(run.count as u16).to_le_bytes());
        binary_data.extend_from_slice(&(run.start_x as u16).to_le_bytes());
        binary_data.extend_from_slice(&(run.start_y as u16).to_le_bytes());
    }
    
    // Markers count (2 bytes)
    let markers_count = map_data.markers.len() as u16;
    binary_data.extend_from_slice(&markers_count.to_le_bytes());
    
    // Each marker: type_id (1 byte), x (2 bytes), y (2 bytes), amount (4 bytes if applicable)
    for marker in &map_data.markers {
        let marker_type_id = get_marker_type_id(&marker.marker_type);
        binary_data.push(marker_type_id);
        binary_data.extend_from_slice(&(marker.x as u16).to_le_bytes());
        binary_data.extend_from_slice(&(marker.y as u16).to_le_bytes());
        
        if let Some(amount) = marker.amount {
            binary_data.extend_from_slice(&amount.to_le_bytes());
        } else {
            binary_data.extend_from_slice(&0u32.to_le_bytes());
        }
    }
    
    // Return binary data with size comparison
    let result = BinaryMapData {
        binary_size: binary_data.len() as u32,
        json_size: json_string.len() as u32,
        compression_ratio: ((json_string.len() - binary_data.len()) as f64 / json_string.len() as f64 * 100.0) as f32,
        data: binary_data,
    };
    
    Ok(JsValue::from_str(&serde_json::to_string(&result).unwrap()))
}

#[derive(Serialize, Deserialize)]
pub struct BinaryMapData {
    pub binary_size: u32,
    pub json_size: u32,
    pub compression_ratio: f32,
    pub data: Vec<u8>,
}

fn get_terrain_class(tile_id: usize, tileset: u8) -> &'static str {
    // Fallback to hardcoded classification - this is more reliable for WASM
    match tile_id {
        0x00..=0x0F => "grass",
        0x10..=0x1F => "water",
        0x20..=0x2F => "water-deep",
        0x30..=0x3F => "coast",
        0x40..=0x4F => "coast",
        0x50..=0x6F => match tileset {
            0 => "forest",    // Forest tileset
            1 => "snow",      // Winter tileset
            2 => "sand",      // Wasteland tileset
            3 => "swamp",     // Swamp tileset
            _ => "grass",
        },
        0x70..=0x7F => "rock",
        0x80..=0x8F => "dirt",
        0x90..=0xAF => "dirt",
        0xB0..=0xCF => match tileset {
            0 => "forest",
            1 => "snow",
            2 => "sand",
            3 => "swamp",
            _ => "grass",
        },
        0xD0..=0xEF => "rock-dark",
        0xF0..=0xFF => "dirt",
        _ => "grass",
    }
}

fn get_terrain_color(terrain_type: &str) -> &'static str {
    match terrain_type {
        "water" => "#4169E1",
        "water-deep" => "#000080",
        "coast" => "#87CEEB",
        "grass" => "#228B22",
        "grass-light" => "#90EE90",
        "rock" => "#696969",
        "rock-dark" => "#2F4F4F",
        "dirt" => "#8B4513",
        "sand" => "#F4A460",
        "snow" => "#F0F8FF",
        "forest" => "#006400",
        "swamp" => "#556B2F",
        "goldmine" => "#FFD700",
        "starting-pos" => "#FF0000",
        "oil-platform" => "#000000",
        _ => "#228B22", // Default to grass
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

fn load_terrain_mapping() -> Result<TerrainMapping, Box<dyn std::error::Error>> {
    // Embedded terrain mapping data for WASM compatibility
    let embedded_mapping = r#"{
        "tile_mapping": {
            "0x00": "grass",
            "0x10": "water",
            "0x20": "water-deep",
            "0x30": "coast",
            "0x40": "coast",
            "0x50": "forest",
            "0x60": "forest",
            "0x70": "rock",
            "0x80": "dirt",
            "0x90": "forest",
            "0xA0": "rock-dark",
            "0xB0": "dirt"
        },
        "tileset_overrides": {
            "0": {
                "0x50": "forest",
                "0x60": "forest",
                "0x90": "forest"
            },
            "1": {
                "0x50": "snow",
                "0x60": "snow",
                "0x90": "snow"
            },
            "2": {
                "0x50": "sand",
                "0x60": "sand",
                "0x90": "sand"
            },
            "3": {
                "0x50": "swamp",
                "0x60": "swamp",
                "0x90": "swamp"
            }
        }
    }"#;
    
    // Parse the embedded JSON
    match serde_json::from_str::<TerrainMapping>(embedded_mapping) {
        Ok(mapping) => Ok(mapping),
        Err(_) => {
            // Fallback to hardcoded mapping if JSON parsing fails
            Ok(TerrainMapping {
                tile_mapping: HashMap::new(),
                tileset_overrides: HashMap::new(),
            })
        }
    }
}

// High-performance map data generator (legacy function for compatibility)
#[wasm_bindgen]
pub fn generate_optimized_map_data(file_data: &[u8]) -> Result<JsValue, JsValue> {
    // This function is deprecated - use get_optimized_map_data instead
    get_optimized_map_data(file_data)
}

// Helper function to convert terrain type to compact ID
fn get_terrain_id(terrain_type: &str) -> u8 {
    match terrain_type {
        "water" => 0,
        "water-deep" => 1,
        "coast" => 2,
        "grass" => 3,
        "grass-light" => 4,
        "rock" => 5,
        "rock-dark" => 6,
        "dirt" => 7,
        "sand" => 8,
        "snow" => 9,
        "forest" => 10,
        "swamp" => 11,
        _ => 255, // unknown
    }
}

// Helper function to convert marker type to compact ID
fn get_marker_type_id(marker_type: &str) -> u8 {
    match marker_type {
        "player" => 0,
        "goldmine" => 1,
        "oil" => 2,
        "resource" => 3,
        _ => 255, // unknown
    }
}
