mod game_manager;

use game_manager::{GameManager, scan_games, launch_game, get_running_games, get_all_games};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let game_manager = GameManager::new();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(game_manager)
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_games,
            launch_game,
            get_running_games,
            get_all_games
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
