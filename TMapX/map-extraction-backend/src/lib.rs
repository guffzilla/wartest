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
    pub tile_id: u16,  // Add actual tile ID for better classification
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

// NEW: Texture extraction structures
#[derive(Serialize, Deserialize)]
pub struct TileTexture {
    pub tile_id: u16,
    pub tileset: u8,
    pub texture_data: Vec<u8>,  // RGBA pixel data
    pub width: u16,
    pub height: u16,
    pub format: String,          // "RGBA8", "RGB8", etc.
}

#[derive(Serialize, Deserialize)]
pub struct TextureAtlas {
    pub tileset: u8,
    pub tiles: Vec<TileTexture>,
    pub atlas_width: u16,
    pub atlas_height: u16,
    pub tile_size: u16,         // Standard tile size (usually 32x32)
}

#[derive(Serialize, Deserialize)]
pub struct ExtractedTextures {
    pub tilesets: Vec<TextureAtlas>,
    pub total_textures: u32,
    pub total_size: u32,        // Total size in bytes
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

// NEW: Extract Warcraft II tile textures
#[wasm_bindgen]
pub fn extract_warcraft_textures_new() -> Result<String, JsValue> {
    // Create a simple tileset structure for now
    let textures = ExtractedTextures {
        tilesets: vec![
            TextureAtlas {
                tileset: 0,
                tiles: vec![
                    TileTexture {
                        tile_id: 0x10,
                        tileset: 0,
                        texture_data: vec![255, 0, 0, 255; 1024], // Red water tiles
                        width: 32,
                        height: 32,
                        format: "RGBA8".to_string(),
                    },
                    TileTexture {
                        tile_id: 0x80,
                        tileset: 0,
                        texture_data: vec![0, 255, 0, 255; 1024], // Green grass tiles
                        width: 32,
                        height: 32,
                        format: "RGBA8".to_string(),
                    },
                    TileTexture {
                        tile_id: 0x50,
                        tileset: 0,
                        texture_data: vec![0, 128, 0, 255; 1024], // Dark green forest tiles
                        width: 32,
                        height: 32,
                        format: "RGBA8".to_string(),
                    },
                ],
                atlas_width: 96,
                atlas_height: 32,
                tile_size: 32,
            }
        ],
        total_textures: 3,
        total_size: 3072,
    };
    
    // Convert to JSON and return as string
    let json_string = serde_json::to_string(&textures)
        .map_err(|e| JsValue::from_str(&format!("JSON serialization error: {}", e)))?;
    
    Ok(json_string)
}

// NEW: Get texture data for specific tile
#[wasm_bindgen]
pub fn get_tile_texture(tile_id: u16, tileset: u8) -> Result<String, JsValue> {
    // Get texture data for a specific tile
    let texture = get_specific_tile_texture(tile_id, tileset)?;
    
    // Convert to JSON and return as string
    let json_string = serde_json::to_string(&texture)
        .map_err(|e| JsValue::from_str(&format!("JSON serialization error: {}", e)))?;
    
    Ok(json_string)
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



#[derive(Serialize, Deserialize)]
pub struct BinaryMapData {
    pub binary_size: u32,
    pub json_size: u32,
    pub compression_ratio: f32,
    pub data: Vec<u8>,
}

fn get_terrain_class(tile_id: usize, tileset: u8) -> &'static str {
    // Enhanced hybrid classification system with tileset awareness
    // Less aggressive dirt classification - only use dirt for actual dirt tiles
    match tile_id {
        // Water tiles (consistent across all tilesets)
        0x10..=0x1F => "water",
        0x20..=0x2F => "water-deep",
        0x30..=0x3F => "coast",
        0x40..=0x4F => "coast",
        
        // Tileset-specific terrain (0x50-0x6F range)
        0x50..=0x6F => match tileset {
            0 => "forest",    // Forest tileset - dense trees
            1 => "snow",      // Winter tileset - snow/ice
            2 => "sand",      // Wasteland tileset - desert sand
            3 => "swamp",     // Swamp tileset - marshy terrain
            _ => "grass",     // Default fallback
        },
        
        // Rock/mountain tiles (consistent)
        0x70..=0x7F => "rock",
        0xD0..=0xEF => "rock-dark",
        
        // Dirt tiles - only for actual dirt tiles, not mixed terrain
        // These are typically brown/dirt colored tiles in Warcraft II
        0x80..=0x8F => {
            // Only classify as dirt if it's actually a dirt tile
            // Many of these are actually grass variations
            if tile_id % 4 == 0 { "dirt" } else { "grass" }
        },
        0x90..=0xAF => {
            // Most of these are grass variations, not dirt
            if tile_id % 8 == 0 { "dirt" } else { "grass" }
        },
        0xF0..=0xFF => {
            // These are often grass variations too
            if tile_id % 16 == 0 { "dirt" } else { "grass" }
        },
        
        // Tileset-specific terrain (0xB0-0xCF range)
        0xB0..=0xCF => match tileset {
            0 => "forest",    // Forest tileset - more trees
            1 => "snow",      // Winter tileset - more snow
            2 => "sand",      // Wasteland tileset - more sand
            3 => "swamp",     // Swamp tileset - more swamp
            _ => "grass",     // Default fallback
        },
        
        // Basic grass tiles (0x00-0x0F) - most common
        0x00..=0x0F => "grass",
        
        // Default fallback - prefer grass over dirt
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

// Main optimized map data generator
#[wasm_bindgen]
pub fn get_optimized_map_data(file_data: &[u8]) -> Result<JsValue, JsValue> {
    // Parse the PUD file
    let mut parser = PudParser::from_data(file_data)?;
    let pud_info = parser.parse()?;
    
    // Generate optimized terrain runs
    let terrain_runs = get_optimized_terrain_runs(&pud_info);
    
    // Generate markers for players, goldmines, and oil
    let markers = generate_map_markers(&pud_info);
    
    // Calculate terrain statistics
    let terrain_stats = TerrainStats {
        water_percentage: pud_info.terrain_analysis.water_percentage,
        forest_percentage: pud_info.terrain_analysis.tree_percentage,
        grass_percentage: pud_info.terrain_analysis.grass_percentage,
        rock_percentage: pud_info.terrain_analysis.mountain_percentage,
        shore_percentage: pud_info.terrain_analysis.shore_percentage,
        dirt_percentage: pud_info.terrain_analysis.dirt_percentage,
    };
    
    // Create optimized map data
    let optimized_data = OptimizedMapData {
        width: pud_info.width as u32,
        height: pud_info.height as u32,
        tileset: pud_info.tileset as u8,
        terrain_runs,
        markers,
        terrain_stats,
    };
    
    // Convert to JSON and return
    let json_string = serde_json::to_string(&optimized_data)
        .map_err(|e| JsValue::from_str(&format!("JSON serialization error: {}", e)))?;
    
    Ok(JsValue::from_str(&json_string))
}

// Binary map data generator for Level 3 optimization
#[wasm_bindgen]
pub fn get_binary_map_data(file_data: &[u8]) -> Result<JsValue, JsValue> {
    // Get the optimized map data first
    let optimized_data = get_optimized_map_data(file_data)?;
    let map_data: OptimizedMapData = serde_json::from_str(&optimized_data.as_string().unwrap())
        .map_err(|e| JsValue::from_str(&format!("JSON deserialization error: {}", e)))?;
    
    // Convert to JSON for size comparison
    let json_string = serde_json::to_string(&map_data)
        .map_err(|e| JsValue::from_str(&format!("JSON serialization error: {}", e)))?;
    
    // Generate binary data
    let mut binary_data = Vec::new();
    
    // Header: width (2 bytes), height (2 bytes), tileset (1 byte)
    binary_data.extend_from_slice(&(map_data.width as u16).to_le_bytes());
    binary_data.extend_from_slice(&(map_data.height as u16).to_le_bytes());
    binary_data.push(map_data.tileset);
    
    // Terrain runs count (2 bytes)
    let runs_count = map_data.terrain_runs.len() as u16;
    binary_data.extend_from_slice(&runs_count.to_le_bytes());
    
    // Each terrain run: terrain_type_id (1 byte), tile_id (2 bytes), count (2 bytes), start_x (2 bytes), start_y (2 bytes)
    for run in &map_data.terrain_runs {
        let terrain_id = get_terrain_id(&run.terrain_type);
        binary_data.push(terrain_id);
        binary_data.extend_from_slice(&run.tile_id.to_le_bytes());
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

// Helper function to generate optimized terrain runs
fn get_optimized_terrain_runs(pud_info: &pud_parser::PudMapInfo) -> Vec<TerrainRun> {
    let mut terrain_runs = Vec::new();
    let map_width = pud_info.width as usize;
    let map_height = pud_info.height as usize;
    
    if pud_info.terrain.is_empty() {
        return terrain_runs;
    }
    
    let mut current_run: Option<(String, u16, u32, u32, u32)> = None;
    
    for y in 0..map_height {
        for x in 0..map_width {
            let tile_index = y * map_width + x;
            if tile_index >= pud_info.terrain.len() {
                continue;
            }
            
            let tile_id = pud_info.terrain[tile_index];
            let terrain_type = get_terrain_class(tile_id as usize, pud_info.tileset as u8);
            
            if let Some((run_type, run_tile_id, count, start_x, start_y)) = current_run {
                if run_type == terrain_type && run_tile_id == tile_id {
                    // Continue current run
                    current_run = Some((run_type, run_tile_id, count + 1, start_x, start_y));
                } else {
                    // End current run and start new one
                    terrain_runs.push(TerrainRun {
                        terrain_type: run_type,
                        tile_id: run_tile_id,
                        count,
                        start_x,
                        start_y,
                    });
                    current_run = Some((terrain_type.to_string(), tile_id, 1, x as u32, y as u32));
                }
            } else {
                // Start first run
                current_run = Some((terrain_type.to_string(), tile_id, 1, x as u32, y as u32));
            }
        }
    }
    
    // Add the last run
    if let Some((run_type, run_tile_id, count, start_x, start_y)) = current_run {
        terrain_runs.push(TerrainRun {
            terrain_type: run_type,
            tile_id: run_tile_id,
            count,
            start_x,
            start_y,
        });
    }
    
    terrain_runs
}

// Helper function to generate map markers
fn generate_map_markers(pud_info: &pud_parser::PudMapInfo) -> Vec<MapMarker> {
    let mut markers = Vec::new();
    
    // Add player starting positions
    for unit in &pud_info.units {
        if unit.owner < 8 && (unit.unit_type == 94 || unit.unit_type == 95) {
            let player_number = unit.owner + 1; // Convert 0-7 to 1-8
            markers.push(MapMarker {
                x: unit.x as u32,
                y: unit.y as u32,
                marker_type: "player".to_string(),
                label: format!("Player {}", player_number),
                amount: None,
            });
        }
    }
    
    // Add goldmines
    for resource in &pud_info.resources {
        if resource.resource_type == 0 { // Gold mine
            markers.push(MapMarker {
                x: resource.x as u32,
                y: resource.y as u32,
                marker_type: "goldmine".to_string(),
                label: "Gold Mine".to_string(),
                amount: Some(resource.amount),
            });
        }
    }
    
    markers
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

// Implementation of texture extraction functions
fn extract_textures_from_warcraft() -> Result<ExtractedTextures, JsValue> {
    // Create a minimal texture atlas with metadata only (no actual texture data)
    // This will be used to generate the initial tileset structure
    let mut textures = ExtractedTextures {
        tilesets: Vec::new(),
        total_textures: 0,
        total_size: 0,
    };
    
    // Generate tileset metadata for all 4 Warcraft II tilesets
    for tileset_id in 0..4 {
        let tileset = create_tileset_metadata(tileset_id)?;
        textures.total_textures += tileset.tiles.len() as u32;
        textures.tilesets.push(tileset);
    }
    
    Ok(textures)
}

fn create_tileset_metadata(tileset_id: u8) -> Result<TextureAtlas, JsValue> {
    let mut tiles = Vec::new();
    
    // Create metadata for common Warcraft II tile IDs (no actual texture data)
    let tile_ids = vec![
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
        0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
        0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F,
        0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F,
        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F,
        0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,
        0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
        0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
        0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
        0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
        0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF,
        0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF
    ];
    
    for &tile_id in &tile_ids {
        // Create minimal tile metadata without actual texture data
        tiles.push(TileTexture {
            tile_id,
            tileset: tileset_id,
            texture_data: Vec::new(), // Empty - will be generated client-side
            width: 32,
            height: 32,
            format: "RGBA8".to_string(),
        });
    }
    
    Ok(TextureAtlas {
        tileset: tileset_id,
        tiles,
        atlas_width: 1024,
        atlas_height: 1024,
        tile_size: 32,
    })
}

fn create_comprehensive_tileset(tileset_id: u8) -> Result<TextureAtlas, JsValue> {
    let mut tiles = Vec::new();
    
    // Generate textures for all common Warcraft II tile IDs
    // These are the actual tile IDs used in Warcraft II maps
    let tile_ids = vec![
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
        0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
        0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F,
        0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F,
        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F,
        0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,
        0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
        0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
        0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
        0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
        0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF,
        0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
        0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF
    ];
    
    for &tile_id in &tile_ids {
        let texture_data = create_realistic_texture_data(tile_id, tileset_id)?;
        
        tiles.push(TileTexture {
            tile_id,
            tileset: tileset_id,
            texture_data,
            width: 32,  // Standard Warcraft II tile size
            height: 32,
            format: "RGBA8".to_string(),
        });
    }
    
    Ok(TextureAtlas {
        tileset: tileset_id,
        tiles,
        atlas_width: 1024,  // 32 tiles * 32 pixels
        atlas_height: 1024, // 32 tiles * 32 pixels
        tile_size: 32,
    })
}

fn create_realistic_texture_data(tile_id: u16, tileset: u8) -> Result<Vec<u8>, JsValue> {
    // Create realistic 32x32 RGBA textures based on Warcraft II tile patterns
    let mut texture_data = Vec::new();
    let size = 32; // Standard Warcraft II tile size
    
    // Define terrain types based on tile ID ranges
    let terrain_type = get_terrain_type_from_tile_id(tile_id);
    let tileset_colors = get_tileset_colors(tileset);
    
    for y in 0..size {
        for x in 0..size {
            let (r, g, b, a) = generate_terrain_pixel(x, y, tile_id, tileset, terrain_type, &tileset_colors);
            texture_data.extend_from_slice(&[r, g, b, a]);
        }
    }
    
    Ok(texture_data)
}

fn get_terrain_type_from_tile_id(tile_id: u16) -> &'static str {
    match tile_id {
        0x00..=0x0F => "grass",
        0x10..=0x1F => "water",
        0x20..=0x2F => "water-deep",
        0x30..=0x3F => "coast",
        0x40..=0x4F => "coast",
        0x50..=0x5F => "forest",
        0x60..=0x6F => "forest",
        0x70..=0x7F => "rock",
        0x80..=0x8F => "dirt",
        0x90..=0x9F => "forest",
        0xA0..=0xAF => "rock-dark",
        0xB0..=0xBF => "dirt",
        0xC0..=0xCF => "special",
        0xD0..=0xDF => "special",
        0xE0..=0xEF => "special",
        0xF0..=0xFF => "special",
        _ => "special", // Handle any other values
    }
}

fn get_tileset_colors(tileset: u8) -> (u8, u8, u8) {
    match tileset {
        0 => (34, 139, 34),   // Forest - green
        1 => (255, 255, 255), // Winter - white
        2 => (160, 82, 45),   // Wasteland - brown
        3 => (85, 107, 47),   // Swamp - dark green
        _ => (34, 139, 34),   // Default to forest
    }
}

fn generate_terrain_pixel(x: u8, y: u8, tile_id: u16, _tileset: u8, terrain_type: &str, base_color: &(u8, u8, u8)) -> (u8, u8, u8, u8) {
    let (base_r, base_g, base_b) = *base_color;
    
    // Add variation based on terrain type
    let (r, g, b) = match terrain_type {
        "grass" => {
            let variation = ((tile_id * 7 + x as u16 + y as u16) % 50) as i16;
            (
                (base_r as i16 + variation - 25).clamp(0, 255) as u8,
                (base_g as i16 + variation - 25).clamp(0, 255) as u8,
                (base_b as i16 + variation - 25).clamp(0, 255) as u8
            )
        },
        "water" => {
            let wave = ((x as f32 * 0.2 + y as f32 * 0.1 + tile_id as f32 * 0.01).sin() * 30.0) as i16;
            (
                (base_r as i16 + wave).clamp(0, 255) as u8,
                (base_g as i16 + wave).clamp(0, 255) as u8,
                (base_b as i16 + wave).clamp(0, 255) as u8
            )
        },
        "forest" => {
            let tree_variation = ((tile_id * 13 + x as u16 * 3 + y as u16 * 7) % 60) as i16;
            (
                (base_r as i16 + tree_variation - 30).clamp(0, 255) as u8,
                (base_g as i16 + tree_variation - 30).clamp(0, 255) as u8,
                (base_b as i16 + tree_variation - 30).clamp(0, 255) as u8
            )
        },
        "rock" => {
            let rock_variation = ((tile_id * 17 + x as u16 * 5 + y as u16 * 11) % 80) as i16;
            (
                (base_r as i16 + rock_variation - 40).clamp(0, 255) as u8,
                (base_g as i16 + rock_variation - 40).clamp(0, 255) as u8,
                (base_b as i16 + rock_variation - 40).clamp(0, 255) as u8
            )
        },
        "dirt" => {
            let dirt_variation = ((tile_id * 19 + x as u16 * 7 + y as u16 * 13) % 40) as i16;
            (
                (base_r as i16 + dirt_variation - 20).clamp(0, 255) as u8,
                (base_g as i16 + dirt_variation - 20).clamp(0, 255) as u8,
                (base_b as i16 + dirt_variation - 20).clamp(0, 255) as u8
            )
        },
        _ => {
            let variation = ((tile_id * 23 + x as u16 + y as u16) % 30) as i16;
            (
                (base_r as i16 + variation - 15).clamp(0, 255) as u8,
                (base_g as i16 + variation - 15).clamp(0, 255) as u8,
                (base_b as i16 + variation - 15).clamp(0, 255) as u8
            )
        }
    };
    
    (r, g, b, 255) // Fully opaque
}

fn get_specific_tile_texture(tile_id: u16, tileset: u8) -> Result<TileTexture, JsValue> {
    // For now, return a placeholder texture
    // In a full implementation, this would load the actual texture data
    
    let texture_data = create_placeholder_texture_data(tile_id, tileset)?;
    
    Ok(TileTexture {
        tile_id,
        tileset,
        texture_data,
        width: 8,   // Reduced size for testing
        height: 8,
        format: "RGBA8".to_string(),
    })
}

fn create_placeholder_texture_atlas(tileset_id: u8) -> Result<TextureAtlas, JsValue> {
    let mut tiles = Vec::new();
    
    // Create placeholder textures for common tile IDs
    let common_tile_ids = vec![0x00, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90, 0xA0, 0xB0, 0xC0, 0xD0, 0xE0, 0xF0];
    
    for &tile_id in &common_tile_ids {
        let texture_data = create_placeholder_texture_data(tile_id, tileset_id)?;
        
        tiles.push(TileTexture {
            tile_id,
            tileset: tileset_id,
            texture_data,
            width: 8,
            height: 8,
            format: "RGBA8".to_string(),
        });
    }
    
    Ok(TextureAtlas {
        tileset: tileset_id,
        tiles,
        atlas_width: 64,   // 8 tiles * 8 pixels
        atlas_height: 64,   // 8 tiles * 8 pixels
        tile_size: 8,
    })
}

fn create_placeholder_texture_data(tile_id: u16, tileset: u8) -> Result<Vec<u8>, JsValue> {
    // Create a smaller 8x8 RGBA texture to avoid serialization issues
    let mut texture_data = Vec::new();
    let size = 8; // Reduced from 32 to 8
    
    for y in 0..size {
        for x in 0..size {
            // Create a pattern based on tile ID and tileset
            let r = ((tile_id * 7 + x as u16) % 256) as u8;
            let g = ((tile_id * 11 + y as u16) % 256) as u8;
            let b = ((tileset as u16 * 85 + tile_id) % 256) as u8;
            let a = 255; // Fully opaque
            
            texture_data.extend_from_slice(&[r, g, b, a]);
        }
    }
    
    Ok(texture_data)
}
