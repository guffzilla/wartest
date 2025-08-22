use eframe::egui;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;
use tracing::{info, warn, error};

use crate::decoder::{ReplayDecoder, DecodedReplay, ReplayInfo};
use super::replay_player::ReplayPlayer;
use super::ui_components::*;

/// Main replay viewer application
pub struct ReplayViewerApp {
    decoder: ReplayDecoder,
    player: Arc<RwLock<ReplayPlayer>>,
    current_replay: Option<DecodedReplay>,
    replay_list: Vec<ReplayInfo>,
    selected_replay: Option<usize>,
    replay_directory: PathBuf,
    ui_state: UIState,
}

/// UI state for the viewer
#[derive(Debug, Clone)]
pub struct UIState {
    pub show_replay_list: bool,
    pub show_controls: bool,
    pub show_info: bool,
    pub show_minimap: bool,
    pub show_stats: bool,
    pub selected_tab: usize,
}

impl Default for UIState {
    fn default() -> Self {
        Self {
            show_replay_list: true,
            show_controls: true,
            show_info: true,
            show_minimap: true,
            show_stats: false,
            selected_tab: 0,
        }
    }
}

impl ReplayViewerApp {
    pub fn new() -> Result<Self> {
        let decoder = ReplayDecoder::new();
        let player = Arc::new(RwLock::new(ReplayPlayer::new()));
        
        // Default replay directory
        let replay_directory = PathBuf::from("../games/Warcraft II Remastered/Data/w2r");
        
        Ok(Self {
            decoder,
            player,
            current_replay: None,
            replay_list: Vec::new(),
            selected_replay: None,
            replay_directory,
            ui_state: UIState::default(),
        })
    }

    /// Load replay list from directory
    fn load_replay_list(&mut self) -> Result<()> {
        info!("Loading replay list from: {:?}", self.replay_directory);
        self.replay_list = self.decoder.list_replays(&self.replay_directory)?;
        info!("Found {} replays", self.replay_list.len());
        Ok(())
    }

    /// Load a specific replay
    fn load_replay(&mut self, replay_path: &PathBuf) -> Result<()> {
        info!("Loading replay: {:?}", replay_path);
        self.current_replay = Some(self.decoder.decode_replay(replay_path)?);
        
        // Reset player
        if let Ok(mut player) = self.player.try_write() {
            if let Some(replay) = &self.current_replay {
                player.load_replay(replay.clone())?;
            }
        }
        
        info!("Replay loaded successfully");
        Ok(())
    }
}

impl eframe::App for ReplayViewerApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| {
            // Main layout
            egui::SidePanel::left("replay_list")
                .resizable(true)
                .default_width(300.0)
                .show_inside(ui, |ui| {
                    self.render_replay_list(ui);
                });

            egui::SidePanel::right("controls")
                .resizable(true)
                .default_width(250.0)
                .show_inside(ui, |ui| {
                    self.render_controls(ui);
                });

            egui::TopBottomPanel::top("toolbar")
                .show_inside(ui, |ui| {
                    self.render_toolbar(ui);
                });

            egui::CentralPanel::default().show_inside(ui, |ui| {
                self.render_main_view(ui);
            });
        });

        // Request continuous updates for smooth playback
        ctx.request_repaint();
    }

    fn on_exit(&mut self, _gl: Option<&eframe::glow::Context>) {
        info!("WC2 Replay Viewer shutting down");
    }
}

impl ReplayViewerApp {
    /// Render the replay list panel
    fn render_replay_list(&mut self, ui: &mut egui::Ui) {
        ui.heading("Replay List");
        
        if ui.button("Refresh").clicked() {
            // Load replay list synchronously for now
            if let Ok(replays) = self.decoder.list_replays(&self.replay_directory) {
                self.replay_list = replays;
            }
        }

        ui.separator();

        // Display replay list
        egui::ScrollArea::vertical().show(ui, |ui| {
            for (index, replay) in self.replay_list.iter().enumerate() {
                let is_selected = self.selected_replay == Some(index);
                
                if ui.selectable_label(is_selected, &replay.filename).clicked() {
                    self.selected_replay = Some(index);
                }

                if is_selected {
                    ui.label(format!("Map: {}", replay.map_name));
                    ui.label(format!("Players: {}", replay.player_count));
                    ui.label(format!("Duration: {:.1} min", replay.duration.as_secs_f32() / 60.0));
                    ui.label(format!("Size: {:.1} KB", replay.file_size as f32 / 1024.0));
                }
            }
        });

        // Load selected replay button
        if let Some(selected_index) = self.selected_replay {
            if ui.button("Load Replay").clicked() {
                if let Some(replay) = self.replay_list.get(selected_index) {
                    let replay_path = self.replay_directory.join(&replay.filename);
                    if let Ok(replay_data) = self.decoder.decode_replay(&replay_path) {
                        self.current_replay = Some(replay_data);
                        // Reset player
                        if let Ok(mut player) = self.player.try_write() {
                            if let Some(replay) = &self.current_replay {
                                if let Err(e) = player.load_replay(replay.clone()) {
                                    error!("Failed to load replay: {}", e);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /// Render the controls panel
    fn render_controls(&mut self, ui: &mut egui::Ui) {
        ui.heading("Playback Controls");

        let mut player = match self.player.try_write() {
            Ok(player) => player,
            Err(_) => {
                error!("Failed to acquire player lock");
                return;
            }
        };

        // Playback controls
        ui.horizontal(|ui| {
            if ui.button("⏮").clicked() {
                player.seek_to_start();
            }
            if ui.button("⏯").clicked() {
                player.toggle_playback();
            }
            if ui.button("⏭").clicked() {
                player.seek_to_end();
            }
        });

        // Speed controls
        ui.label("Playback Speed:");
        ui.horizontal(|ui| {
            if ui.button("0.5x").clicked() {
                player.set_speed(0.5);
            }
            if ui.button("1.0x").clicked() {
                player.set_speed(1.0);
            }
            if ui.button("2.0x").clicked() {
                player.set_speed(2.0);
            }
            if ui.button("4.0x").clicked() {
                player.set_speed(4.0);
            }
        });

        // Progress slider
        if let Some(replay) = &self.current_replay {
            let current_time = player.get_current_time();
            let total_time = replay.metadata.duration.as_secs_f32();
            
            if total_time > 0.0 {
                let progress = current_time / total_time;
                let mut progress_value = progress;
                if ui.add(egui::widgets::Slider::new(&mut progress_value, 0.0..=1.0).text("Progress")).changed() {
                    player.seek_to_time(progress_value * total_time);
                }
                
                ui.label(format!("Time: {:.1}s / {:.1}s", current_time, total_time));
            }
        }

        ui.separator();

        // Replay info
        if let Some(replay) = &self.current_replay {
            ui.heading("Replay Info");
            ui.label(format!("Map: {}", replay.metadata.map_name));
            ui.label(format!("Game Type: {:?}", replay.metadata.game_type));
            ui.label(format!("Players: {}", replay.metadata.players.len()));
            ui.label(format!("Events: {}", replay.events.len()));
        }
    }

    /// Render the toolbar
    fn render_toolbar(&mut self, ui: &mut egui::Ui) {
        ui.horizontal(|ui| {
            ui.heading("WC2 Remastered Replay Viewer");
            
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if ui.button("Settings").clicked() {
                    // Show settings dialog
                }
                
                if ui.button("About").clicked() {
                    // Show about dialog
                }
            });
        });
    }

    /// Render the main view area
    fn render_main_view(&mut self, ui: &mut egui::Ui) {
        // Tab bar
        ui.horizontal(|ui| {
            ui.selectable_value(&mut self.ui_state.selected_tab, 0, "Game View");
            ui.selectable_value(&mut self.ui_state.selected_tab, 1, "Minimap");
            ui.selectable_value(&mut self.ui_state.selected_tab, 2, "Statistics");
            ui.selectable_value(&mut self.ui_state.selected_tab, 3, "Events");
        });

        ui.separator();

        // Tab content
        match self.ui_state.selected_tab {
            0 => self.render_game_view(ui),
            1 => self.render_minimap(ui),
            2 => self.render_statistics(ui),
            3 => self.render_events(ui),
            _ => {}
        }
    }

    /// Render the main game view
    fn render_game_view(&mut self, ui: &mut egui::Ui) {
        ui.centered_and_justified(|ui| {
            ui.label("Game View - Coming Soon");
            ui.label("This will show the actual game visualization");
        });
    }

    /// Render the minimap
    fn render_minimap(&mut self, ui: &mut egui::Ui) {
        ui.centered_and_justified(|ui| {
            ui.label("Minimap - Coming Soon");
            ui.label("This will show the game minimap");
        });
    }

    /// Render statistics
    fn render_statistics(&mut self, ui: &mut egui::Ui) {
        if let Some(replay) = &self.current_replay {
            ui.heading("Game Statistics");
            
            egui::Grid::new("stats_grid").show(ui, |ui| {
                ui.label("Players:");
                ui.label(&replay.metadata.players.len().to_string());
                ui.end_row();
                
                ui.label("Total Events:");
                ui.label(&replay.events.len().to_string());
                ui.end_row();
                
                ui.label("Duration:");
                ui.label(&format!("{:.1} minutes", replay.metadata.duration.as_secs_f32() / 60.0));
                ui.end_row();
            });

            ui.separator();

            // Player statistics
            ui.heading("Player Statistics");
            for player in &replay.metadata.players {
                ui.collapsing(&player.name, |ui| {
                    ui.label(format!("Race: {:?}", player.race));
                    ui.label(format!("Team: {}", player.team));
                    ui.label(format!("APM: {:.1}", player.apm));
                    ui.label(format!("Winner: {}", player.is_winner));
                });
            }
        } else {
            ui.label("No replay loaded");
        }
    }

    /// Render events list
    fn render_events(&mut self, ui: &mut egui::Ui) {
        if let Some(replay) = &self.current_replay {
            ui.heading("Game Events");
            
            egui::ScrollArea::vertical().show(ui, |ui| {
                for (index, event) in replay.events.iter().enumerate() {
                    ui.collapsing(format!("Event {}: {:?}", index, event.event_type), |ui| {
                        ui.label(format!("Timestamp: {}ms", event.timestamp));
                        ui.label(format!("Size: {} bytes", event.size));
                        ui.label(format!("Data: {:?}", &event.data[..std::cmp::min(16, event.data.len())]));
                    });
                }
            });
        } else {
            ui.label("No replay loaded");
        }
    }
}
