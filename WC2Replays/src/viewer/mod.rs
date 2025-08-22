//! WC2 Remastered Replay Viewer
//! 
//! This module contains the main replay viewer application with GUI components.

pub mod viewer_app;
pub mod replay_player;
pub mod ui_components;

use eframe::egui;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;

use crate::decoder::{ReplayDecoder, DecodedReplay, ReplayInfo};
use viewer_app::ReplayViewerApp;
use replay_player::ReplayPlayer;
use ui_components::*;

/// Main replay viewer application
pub struct ReplayViewer {
    app: ReplayViewerApp,
    player: Arc<RwLock<ReplayPlayer>>,
    decoder: ReplayDecoder,
    current_replay: Option<DecodedReplay>,
    replay_list: Vec<ReplayInfo>,
    selected_replay: Option<usize>,
    replay_directory: PathBuf,
}

impl ReplayViewer {
    pub fn new() -> Result<Self> {
        let app = ReplayViewerApp::new()?;
        let player = Arc::new(RwLock::new(ReplayPlayer::new()));
        let decoder = ReplayDecoder::new();
        
        // Default replay directory
        let replay_directory = PathBuf::from("../games/Warcraft II Remastered/Data/w2r");
        
        Ok(Self {
            app,
            player,
            decoder,
            current_replay: None,
            replay_list: Vec::new(),
            selected_replay: None,
            replay_directory,
        })
    }

    /// Load replay list from directory
    pub async fn load_replay_list(&mut self) -> Result<()> {
        self.replay_list = self.decoder.list_replays(&self.replay_directory)?;
        Ok(())
    }

    /// Load a specific replay
    pub fn load_replay(&mut self, replay_path: &PathBuf) -> Result<()> {
        self.current_replay = Some(self.decoder.decode_replay(replay_path)?);
        
        // Reset player
        if let Ok(mut player) = self.player.try_write() {
            if let Some(replay) = &self.current_replay {
                player.load_replay(replay.clone())?;
            }
        }
        
        Ok(())
    }

    /// Get current replay
    pub fn get_current_replay(&self) -> Option<&DecodedReplay> {
        self.current_replay.as_ref()
    }

    /// Get replay list
    pub fn get_replay_list(&self) -> &[ReplayInfo] {
        &self.replay_list
    }

    /// Set selected replay index
    pub fn set_selected_replay(&mut self, index: Option<usize>) {
        self.selected_replay = index;
    }

    /// Get selected replay
    pub fn get_selected_replay(&self) -> Option<&ReplayInfo> {
        self.selected_replay.and_then(|i| self.replay_list.get(i))
    }

    /// Get player reference
    pub fn get_player(&self) -> Arc<RwLock<ReplayPlayer>> {
        self.player.clone()
    }
}
