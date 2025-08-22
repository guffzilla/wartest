use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameInfo {
    pub name: String,
    pub path: PathBuf,
    pub is_running: bool,
    pub process_id: Option<u32>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameConfig {
    pub name: String,
    pub executable_name: String,
    pub install_paths: Vec<String>,
    pub launch_args: Vec<String>,
}

pub struct GameManager {
    games: Mutex<HashMap<String, GameInfo>>,
    configs: Mutex<HashMap<String, GameConfig>>,
}

impl GameManager {
    pub fn new() -> Self {
        let mut configs = HashMap::new();
        
        // Default game configurations
        configs.insert("Warcraft".to_string(), GameConfig {
            name: "Warcraft".to_string(),
            executable_name: "war.exe".to_string(),
            install_paths: vec![
                "C:\\Program Files\\Warcraft".to_string(),
                "C:\\Program Files (x86)\\Warcraft".to_string(),
            ],
            launch_args: vec![],
        });
        
        configs.insert("Warcraft II".to_string(), GameConfig {
            name: "Warcraft II".to_string(),
            executable_name: "war2.exe".to_string(),
            install_paths: vec![
                "C:\\Program Files\\Warcraft II".to_string(),
                "C:\\Program Files (x86)\\Warcraft II".to_string(),
            ],
            launch_args: vec![],
        });

        Self {
            games: Mutex::new(HashMap::new()),
            configs: Mutex::new(configs),
        }
    }

    pub fn scan_for_games(&self) -> Vec<GameInfo> {
        let configs = self.configs.lock().unwrap();
        let mut games = self.games.lock().unwrap();
        let mut found_games = Vec::new();

        for (game_name, config) in configs.iter() {
            for install_path in &config.install_paths {
                let exe_path = PathBuf::from(install_path).join(&config.executable_name);
                if exe_path.exists() {
                    let game_info = GameInfo {
                        name: game_name.clone(),
                        path: exe_path.clone(),
                        is_running: false,
                        process_id: None,
                        version: None,
                    };
                    
                    games.insert(game_name.clone(), game_info.clone());
                    found_games.push(game_info);
                }
            }
        }

        found_games
    }

    pub fn launch_game(&self, game_name: &str) -> Result<(), String> {
        let configs = self.configs.lock().unwrap();
        let mut games = self.games.lock().unwrap();
        
        if let Some(config) = configs.get(game_name) {
            if let Some(game_info) = games.get(game_name) {
                let mut command = Command::new(&game_info.path);
                
                for arg in &config.launch_args {
                    command.arg(arg);
                }

                match command.spawn() {
                    Ok(child) => {
                        let mut updated_game = game_info.clone();
                        updated_game.is_running = true;
                        updated_game.process_id = Some(child.id());
                        games.insert(game_name.to_string(), updated_game);
                        Ok(())
                    }
                    Err(e) => Err(format!("Failed to launch game: {}", e)),
                }
            } else {
                Err("Game not found".to_string())
            }
        } else {
            Err("Game configuration not found".to_string())
        }
    }

    pub fn get_running_games(&self) -> Vec<GameInfo> {
        let games = self.games.lock().unwrap();
        games.values().filter(|game| game.is_running).cloned().collect()
    }

    pub fn get_all_games(&self) -> Vec<GameInfo> {
        let games = self.games.lock().unwrap();
        games.values().cloned().collect()
    }
}

// Tauri commands
#[tauri::command]
pub fn scan_games(state: State<GameManager>) -> Vec<GameInfo> {
    state.scan_for_games()
}

#[tauri::command]
pub fn launch_game(game_name: String, state: State<GameManager>) -> Result<(), String> {
    state.launch_game(&game_name)
}

#[tauri::command]
pub fn get_running_games(state: State<GameManager>) -> Vec<GameInfo> {
    state.get_running_games()
}

#[tauri::command]
pub fn get_all_games(state: State<GameManager>) -> Vec<GameInfo> {
    state.get_all_games()
}
