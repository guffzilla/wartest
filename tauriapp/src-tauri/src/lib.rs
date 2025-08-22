// WCArena Monitor - Warcraft II Multiplayer Game Monitor
// Tauri app for monitoring Warcraft II Remastered multiplayer games

pub mod game_monitor;
pub mod platform;
pub mod server_client;
pub mod types;

use std::sync::Mutex;
use game_monitor::GameMonitor;

/// Application state
pub struct AppState {
    pub game_monitor: Mutex<Option<GameMonitor>>,
    pub is_monitoring: Mutex<bool>,
    pub minimize_to_tray: Mutex<bool>,
    pub show_main_window: Mutex<bool>, // Flag to show main window from tray
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            game_monitor: Mutex::new(None),
            is_monitoring: Mutex::new(false),
            minimize_to_tray: Mutex::new(true), // Default to minimize to tray
            show_main_window: Mutex::new(false), // Default to not show main window
        }
    }
}
