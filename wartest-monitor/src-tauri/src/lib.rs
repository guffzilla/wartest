// Wartest Monitor - Warcraft II Multiplayer Game Monitor
// Tauri app for monitoring Warcraft II Remastered multiplayer games

pub mod game_monitor;
pub mod platform;
pub mod server_client;
pub mod types;

use tauri::State;
use std::sync::Mutex;
use game_monitor::GameMonitor;
use types::*;

/// Application state
pub struct AppState {
    game_monitor: Mutex<Option<GameMonitor>>,
    is_monitoring: Mutex<bool>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            game_monitor: Mutex::new(None),
            is_monitoring: Mutex::new(false),
        }
    }
}
