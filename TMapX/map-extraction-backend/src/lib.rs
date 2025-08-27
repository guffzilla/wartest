use pud_parser::PudParser;
use std::path::PathBuf;
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

#[tauri::command]
async fn select_map_file() -> Result<Option<String>, String> {
    // For now, return the test file path - we'll implement proper file dialog later
    // In Tauri v2, we need to use a different approach for file dialogs
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let test_path = current_dir.join("MapTests").join("Garden of War.pud");
    
    if test_path.exists() {
        println!("Using test file: {}", test_path.display());
        return Ok(Some(test_path.to_string_lossy().to_string()));
    }
    
    Err("Test file not found".to_string())
}

#[tauri::command]
async fn select_pud_file() -> Result<Option<String>, String> {
    // This function is no longer needed - using frontend dialog instead
    Err("Use frontend dialog instead".to_string())
}

#[tauri::command]
async fn parse_map_file(file_path: String) -> Result<MapData, String> {
    let path = PathBuf::from(file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    // Parse the PUD file
    let mut parser = PudParser::new(&path)?;
    let pud_info = parser.parse()?;

    // Convert PUD data to our MapData format
    let map_data = MapData {
        name: path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown Map")
            .replace(".pud", "")
            .to_string(),
        width: pud_info.width as u32,
        height: pud_info.height as u32,
        player_count: pud_info.max_players as u8,
        resources: detect_goldmines(&pud_info),
        terrain: TerrainData {
            tiles: vec![0; (pud_info.width * pud_info.height) as usize],
            elevation: vec![0; (pud_info.width * pud_info.height) as usize],
            water_level: 0,
        },
        terrain_analysis: pud_info.terrain_analysis,
        units: pud_info.units.iter().map(|unit| UnitData {
            unit_type: pud_parser::get_unit_name(unit.unit_type).to_string(),
            x: unit.x as u32,
            y: unit.y as u32,
            owner: unit.owner,
            health: unit.health as u32,
        }).collect(),
        buildings: vec![
            // Add starting buildings for each player
            BuildingData {
                building_type: "Town Hall".to_string(),
                x: (pud_info.width / 8) as u32,
                y: (pud_info.height / 8) as u32,
                owner: 1,
                health: 1000,
                is_completed: true,
            },
            BuildingData {
                building_type: "Town Hall".to_string(),
                x: (pud_info.width * 7 / 8) as u32,
                y: (pud_info.height * 7 / 8) as u32,
                owner: 2,
                health: 1000,
                is_completed: true,
            },
        ],
    };

    Ok(map_data)
}

#[tauri::command]
async fn generate_map_image(map_data: MapData) -> Result<String, String> {
    // Generate a simple SVG map representation
    let svg_content = format!(
        "<svg width=\"{}\" height=\"{}\" xmlns=\"http://www.w3.org/2000/svg\">\n  <defs>\n    <pattern id=\"grid\" width=\"10\" height=\"10\" patternUnits=\"userSpaceOnUse\">\n      <path d=\"M 10 0 L 0 0 0 10\" fill=\"none\" stroke=\"#ddd\" stroke-width=\"1\"/>\n    </pattern>\n  </defs>\n  \n  <!-- Background -->\n  <rect width=\"100%\" height=\"100%\" fill=\"#8B4513\"/>\n  <rect width=\"100%\" height=\"100%\" fill=\"url(#grid)\"/>\n  \n  <!-- Goldmines -->\n  {}\n  \n  <!-- Player Starting Positions -->\n  {}\n  \n  <!-- Units -->\n  {}\n  \n  <!-- Buildings -->\n  {}\n  \n  <!-- Legend -->\n  <g transform=\"translate(10, 10)\">\n    <rect width=\"15\" height=\"15\" fill=\"#FFD700\" stroke=\"black\"/>\n    <text x=\"20\" y=\"12\" font-size=\"12\" fill=\"white\">Goldmine</text>\n    <rect width=\"15\" height=\"15\" fill=\"#FF0000\" stroke=\"black\" y=\"20\"/>\n    <text x=\"20\" y=\"32\" font-size=\"12\" fill=\"white\">Player 1</text>\n    <rect width=\"15\" height=\"15\" fill=\"#0000FF\" stroke=\"black\" y=\"40\"/>\n    <text x=\"20\" y=\"52\" font-size=\"12\" fill=\"white\">Player 2</text>\n  </g>\n</svg>",
        map_data.width * 2,
        map_data.height * 2,
        // Goldmines
        map_data.resources.iter()
            .filter(|r| r.is_goldmine)
            .map(|r| format!(
                "<circle cx=\"{}\" cy=\"{}\" r=\"8\" fill=\"#FFD700\" stroke=\"black\" stroke-width=\"2\"/>\n                <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-size=\"10\" fill=\"black\">G</text>",
                r.x * 2, r.y * 2, r.x * 2, r.y * 2 + 3
            ))
            .collect::<Vec<_>>()
            .join("\n  "),
        // Player starting positions
        map_data.buildings.iter()
            .filter(|b| b.building_type == "Town Hall")
            .map(|b| format!(
                "<rect x=\"{}\" y=\"{}\" width=\"16\" height=\"16\" fill=\"{}\" stroke=\"black\" stroke-width=\"2\"/>\n                <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-size=\"10\" fill=\"white\">TH</text>",
                b.x * 2 - 8, b.y * 2 - 8,
                if b.owner == 1 { "#FF0000" } else { "#0000FF" },
                b.x * 2, b.y * 2 + 3
            ))
            .collect::<Vec<_>>()
            .join("\n  "),
        // Units
        map_data.units.iter()
            .map(|u| format!(
                "<circle cx=\"{}\" cy=\"{}\" r=\"4\" fill=\"{}\" stroke=\"black\" stroke-width=\"1\"/>\n                <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-size=\"8\" fill=\"white\">P</text>",
                u.x * 2, u.y * 2,
                if u.owner == 1 { "#FF0000" } else { "#0000FF" },
                u.x * 2, u.y * 2 + 2
            ))
            .collect::<Vec<_>>()
            .join("\n  "),
        // Buildings
        map_data.buildings.iter()
            .filter(|b| b.building_type != "Town Hall")
            .map(|b| format!(
                "<rect x=\"{}\" y=\"{}\" width=\"12\" height=\"12\" fill=\"{}\" stroke=\"black\" stroke-width=\"1\"/>\n                <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-size=\"8\" fill=\"white\">B</text>",
                b.x * 2 - 6, b.y * 2 - 6,
                if b.owner == 1 { "#FF0000" } else { "#0000FF" },
                b.x * 2, b.y * 2 + 2
            ))
            .collect::<Vec<_>>()
            .join("\n  ")
    );
    
    // Save the SVG to a file
    let output_path = "map_preview.svg";
    std::fs::write(output_path, svg_content)
        .map_err(|e| format!("Failed to write SVG: {}", e))?;
    
    Ok(output_path.to_string())
}

#[tauri::command]
async fn test_pud_parser(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    // Parse the PUD file
    let mut parser = PudParser::new(&path)?;
    let pud_info = parser.parse()?;

    // Return detailed information including terrain analysis
    let mut info = format!(
        "Map: {}\nDimensions: {}x{}\nMax Players: {}\nFile Size: {} bytes\n\nTerrain Analysis:\nWater: {:.1}%\nShore: {:.1}%\nForest: {:.1}%\nGrass: {:.1}%\nRock: {:.1}%\nDirt: {:.1}%\nTotal Tiles: {}\n\nUnits Found: {}\nResources Found: {}",
        path.file_name().unwrap().to_string_lossy(),
        pud_info.width,
        pud_info.height,
        pud_info.max_players,
        std::fs::metadata(&path).unwrap().len(),
        pud_info.terrain_analysis.water_percentage,
        pud_info.terrain_analysis.shore_percentage,
        pud_info.terrain_analysis.tree_percentage,
        pud_info.terrain_analysis.grass_percentage,
        pud_info.terrain_analysis.mountain_percentage,
        pud_info.terrain_analysis.dirt_percentage,
        pud_info.terrain_analysis.total_tiles,
        pud_info.units.len(),
        pud_info.resources.len()
    );
    
    // Add resource details
    if !pud_info.resources.is_empty() {
        info.push_str("\n\nResources:");
        let mut goldmine_count = 0;
        let mut total_gold = 0;
        
        for resource in &pud_info.resources {
            let resource_name = match resource.resource_type {
                0 => {
                    goldmine_count += 1;
                    total_gold += resource.amount;
                    "Gold Mine"
                },
                1 => "Tree",
                2 => "Oil Patch", 
                3 => "Crystal Mine",
                4 => "Forest",
                _ => "Unknown",
            };
            
            if resource.resource_type == 0 {
                info.push_str(&format!("\n- {} at ({}, {}) - Gold: {}", 
                    resource_name, resource.x, resource.y, resource.amount));
            } else {
                info.push_str(&format!("\n- {} at ({}, {}) - Amount: {}", 
                    resource_name, resource.x, resource.y, resource.amount));
            }
        }
        
        if goldmine_count > 0 {
            info.push_str(&format!("\n\nGoldmine Summary: {} goldmines with {} total gold", 
                goldmine_count, total_gold));
        }
    }
    
    // Add unit details (focusing on starting positions)
    if !pud_info.units.is_empty() {
        info.push_str("\n\nUnits (Starting Positions):");
        
        // Group units by player to identify starting positions
        let mut player_units: std::collections::HashMap<u8, Vec<&pud_parser::PudUnit>> = std::collections::HashMap::new();
        for unit in &pud_info.units {
            player_units.entry(unit.owner).or_insert_with(Vec::new).push(unit);
        }
        
        for (player_id, units) in player_units {
            info.push_str(&format!("\n\nPlayer {}:", player_id));
            
            // Find starting position (usually a Town Hall or first unit)
            let mut starting_pos = None;
            for unit in units {
                let unit_name = match unit.unit_type {
                    0 => "Peasant",
                    1 => "Footman", 
                    2 => "Knight",
                    3 => "Archer",
                    4 => "Ranger",
                    5 => "Mage",
                    6 => "Paladin",
                    7 => "Ogre",
                    8 => "Dwarves",
                    9 => "Goblin Sappers",
                    _ => "Unknown",
                };
                
                info.push_str(&format!("\n- {} at ({}, {}) - Health: {}", 
                    unit_name, unit.x, unit.y, unit.health));
                
                // Consider first unit as starting position
                if starting_pos.is_none() {
                    starting_pos = Some((unit.x, unit.y));
                }
            }
            
            if let Some((x, y)) = starting_pos {
                info.push_str(&format!("\n  Starting Position: ({}, {})", x, y));
            }
        }
    }

    Ok(info)
}

#[tauri::command]
async fn export_map_report(map_data: MapData) -> Result<String, String> {
    // Generate a comprehensive map report
    let report_content = format!(
        "# Warcraft II Map Analysis Report\n\n## Map Information\n- **Name:** {}\n- **Dimensions:** {}x{}\n- **Players:** {}\n\n## Resources\n",
        map_data.name, map_data.width, map_data.height, map_data.player_count
    );
    
    let resources_section = map_data.resources.iter()
        .map(|r| format!("- **{}** at ({}, {}) - Amount: {} {}", 
            r.resource_type, r.x, r.y, r.amount, 
            if r.is_goldmine { "(Goldmine)" } else { "" }))
        .collect::<Vec<_>>()
        .join("\n");
    
    let units_section = map_data.units.iter()
        .map(|u| format!("- **{}** at ({}, {}) - Player {} - Health: {}", 
            u.unit_type, u.x, u.y, u.owner, u.health))
        .collect::<Vec<_>>()
        .join("\n");
    
    let buildings_section = map_data.buildings.iter()
        .map(|b| format!("- **{}** at ({}, {}) - Player {} - Health: {} {}", 
            b.building_type, b.x, b.y, b.owner, b.health,
            if b.is_completed { "(Completed)" } else { "(Under Construction)" }))
        .collect::<Vec<_>>()
        .join("\n");
    
    let full_report = format!(
        "{}{}\n\n## Units\n{}\n\n## Buildings\n{}\n\n## Strategic Analysis\n- **Goldmine Count:** {}\n- **Starting Positions:** {}\n- **Map Type:** {}\n",
        report_content, resources_section, units_section, buildings_section,
        map_data.resources.iter().filter(|r| r.is_goldmine).count(),
        map_data.buildings.iter().filter(|b| b.building_type == "Town Hall").count(),
        if map_data.width == map_data.height { "Square" } else { "Rectangular" }
    );
    
    // Save the report to a file
    let output_path = format!("map_report_{}.md", map_data.name.replace(" ", "_"));
    std::fs::write(&output_path, full_report)
        .map_err(|e| format!("Failed to write report: {}", e))?;
    
    Ok(output_path)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            select_map_file,
            select_pud_file,
            parse_map_file,
            generate_map_image,
            test_pud_parser,
            export_map_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
