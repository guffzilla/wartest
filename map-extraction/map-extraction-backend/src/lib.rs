use std::path::PathBuf;
use tauri::api::dialog::FileDialogBuilder;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapData {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub player_count: u8,
    pub resources: Vec<ResourceData>,
    pub terrain: TerrainData,
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
    let dialog = FileDialogBuilder::new()
        .add_filter("Warcraft II Maps", &["w2m", "w2x"])
        .set_title("Select Warcraft II Map File")
        .set_directory(get_default_warcraft_directory())
        .build();

    match dialog {
        Ok(Some(path)) => Ok(Some(path.to_string_lossy().to_string())),
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to open file dialog: {}", e)),
    }
}

#[tauri::command]
async fn parse_map_file(file_path: String) -> Result<MapData, String> {
    let path = PathBuf::from(file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    // For now, return mock data
    // In the future, this will parse actual Warcraft II map files
    let map_data = MapData {
        name: path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown Map")
            .to_string(),
        width: 128,
        height: 128,
        player_count: 4,
        resources: vec![
            ResourceData {
                resource_type: "Gold".to_string(),
                x: 32,
                y: 32,
                amount: 10000,
                is_goldmine: true,
            },
            ResourceData {
                resource_type: "Gold".to_string(),
                x: 96,
                y: 96,
                amount: 10000,
                is_goldmine: true,
            },
            ResourceData {
                resource_type: "Wood".to_string(),
                x: 64,
                y: 64,
                amount: 5000,
                is_goldmine: false,
            },
        ],
        terrain: TerrainData {
            tiles: vec![0; 128 * 128],
            elevation: vec![0; 128 * 128],
            water_level: 0,
        },
        units: vec![
            UnitData {
                unit_type: "Peasant".to_string(),
                x: 64,
                y: 64,
                owner: 1,
                health: 100,
            },
        ],
        buildings: vec![
            BuildingData {
                building_type: "Town Hall".to_string(),
                x: 64,
                y: 64,
                owner: 1,
                health: 1000,
                is_completed: true,
            },
        ],
    };

    Ok(map_data)
}

#[tauri::command]
async fn generate_map_image(map_data: MapData) -> Result<String, String> {
    // For now, return a placeholder
    // In the future, this will generate an actual map image
    Ok("map_preview.png".to_string())
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            select_map_file,
            parse_map_file,
            generate_map_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
