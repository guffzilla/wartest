//! WC2 Remastered Replay Emulator
//! 
//! This module provides a standalone replay emulator that renders WC2 replays
//! using Remastered-quality graphics, regardless of the original game version.

pub mod renderer;
pub mod game_engine;
pub mod playback;
pub mod assets;

use crate::decoder::{DecodedReplay, ReplayInfo};
use anyhow::Result;
use std::path::PathBuf;
use eframe::egui;
use std::collections::HashMap;

/// Main replay emulator that handles playback and rendering
pub struct WC2ReplayEmulator {
    current_replay: Option<DecodedReplay>,
    game_engine: game_engine::GameEngine,
    renderer: renderer::GraphicsRenderer,
    playback_controller: playback::PlaybackController,
    asset_manager: assets::AssetManager,
    
    // File picker and sample replay state
    show_file_picker: bool,
    sample_replays: Vec<SampleReplay>,
    selected_sample: Option<usize>,
}

/// Sample replay data for testing
#[derive(Debug, Clone)]
pub struct SampleReplay {
    pub name: String,
    pub map_name: String,
    pub players: Vec<String>,
    pub duration: std::time::Duration,
    pub description: String,
}

impl WC2ReplayEmulator {
    /// Create a new replay emulator instance
    pub fn new() -> Result<Self> {
        let game_engine = game_engine::GameEngine::new()?;
        let renderer = renderer::GraphicsRenderer::new()?;
        let playback_controller = playback::PlaybackController::new();
        let asset_manager = assets::AssetManager::new()?;
        
        // Initialize sample replays for testing
        let sample_replays = Self::create_sample_replays();
        
        Ok(Self {
            current_replay: None,
            game_engine,
            renderer,
            playback_controller,
            asset_manager,
            show_file_picker: false,
            sample_replays,
            selected_sample: None,
        })
    }
    
    /// Create sample replay data for testing
    fn create_sample_replays() -> Vec<SampleReplay> {
        vec![
            SampleReplay {
                name: "Sample 1v1 - Human vs Orc".to_string(),
                map_name: "Garden of War".to_string(),
                players: vec!["Human_Player".to_string(), "Orc_Player".to_string()],
                duration: std::time::Duration::from_secs(1800), // 30 minutes
                description: "Classic 1v1 match with standard build orders".to_string(),
            },
            SampleReplay {
                name: "Sample 2v2 - Team Battle".to_string(),
                map_name: "Twilight".to_string(),
                players: vec![
                    "Human_Player1".to_string(),
                    "Orc_Player1".to_string(),
                    "Human_Player2".to_string(),
                    "Orc_Player2".to_string(),
                ],
                duration: std::time::Duration::from_secs(2400), // 40 minutes
                description: "Team battle with coordinated strategies".to_string(),
            },
            SampleReplay {
                name: "Sample Campaign Mission".to_string(),
                map_name: "Human Campaign - Mission 1".to_string(),
                players: vec!["Human_Player".to_string()],
                duration: std::time::Duration::from_secs(900), // 15 minutes
                description: "Single player campaign mission completion".to_string(),
            },
        ]
    }
    
    /// Load a replay file for playback
    pub fn load_replay(&mut self, replay_path: &PathBuf) -> Result<()> {
        // Load and decode the replay file
        let replay = crate::decoder::ReplayDecoder::new().decode_replay(replay_path)?;
        self.current_replay = Some(replay);
        
        // Initialize the game engine with replay data
        if let Some(replay) = &self.current_replay {
            self.game_engine.load_replay(replay)?;
        }
        
        Ok(())
    }
    
    /// Start replay playback
    pub fn start_playback(&mut self) -> Result<()> {
        if self.current_replay.is_some() {
            self.playback_controller.start()?;
        }
        Ok(())
    }
    
    /// Pause replay playback
    pub fn pause_playback(&mut self) -> Result<()> {
        self.playback_controller.pause()?;
        Ok(())
    }
    
    /// Stop replay playback
    pub fn stop_playback(&mut self) -> Result<()> {
        self.playback_controller.stop()?;
        Ok(())
    }
    
    /// Set playback speed
    pub fn set_playback_speed(&mut self, speed: f32) -> Result<()> {
        self.playback_controller.set_speed(speed)?;
        Ok(())
    }
    
    /// Seek to specific time in replay
    pub fn seek_to_time(&mut self, time_seconds: f32) -> Result<()> {
        if let Some(replay) = &self.current_replay {
            self.game_engine.seek_to_time(time_seconds, replay)?;
            self.playback_controller.seek_to_time(time_seconds)?;
        }
        Ok(())
    }
    
    /// Get current replay information
    pub fn get_replay_info(&self) -> Option<&DecodedReplay> {
        self.current_replay.as_ref()
    }
    
    /// Get current playback state
    pub fn get_playback_state(&self) -> playback::PlaybackState {
        self.playback_controller.get_state()
    }
    
    /// Render current frame
    pub fn render_frame(&mut self) -> Result<()> {
        if let Some(replay) = &self.current_replay {
            if let Some(game_state) = self.game_engine.get_current_state() {
                self.renderer.render_frame(game_state, &self.asset_manager)?;
            }
        }
        Ok(())
    }
    
    /// Export current frame as image
    pub fn export_frame(&self, output_path: &PathBuf) -> Result<()> {
        self.renderer.export_frame(output_path)
    }
    
    /// Export replay as video
    pub fn export_video(&self, output_path: &PathBuf, fps: u32) -> Result<()> {
        self.renderer.export_video(output_path, fps)
    }
    
    /// Load a sample replay for testing
    pub fn load_sample_replay(&mut self, sample_index: usize) -> Result<()> {
        if let Some(sample) = self.sample_replays.get(sample_index) {
            // Create a mock DecodedReplay from sample data
            let mock_replay = DecodedReplay {
                metadata: crate::decoder::ReplayMetadata {
                    filename: format!("sample_{}.w2r", sample_index + 1),
                    file_size: 1024 * 100, // 100KB mock size
                    creation_date: chrono::Utc::now(),
                    game_version: "WC2 Remastered".to_string(),
                    map_name: sample.map_name.clone(),
                    game_type: crate::decoder::GameType::Multiplayer,
                    players: sample.players.iter().enumerate().map(|(i, name)| {
                        crate::decoder::PlayerInfo {
                            name: name.clone(),
                            race: if i % 2 == 0 { crate::decoder::Race::Human } else { crate::decoder::Race::Orc },
                            team: (i / 2) as u8,
                            color: crate::decoder::PlayerColor::Blue,
                            is_winner: false,
                            apm: 150.0,
                        }
                    }).collect(),
                    duration: sample.duration,
                    checksum: "sample_checksum".to_string(),
                },
                game_state: crate::decoder::game_state::GameState::new(),
                events: vec![], // Empty events for now
                analysis: crate::structures::FileAnalysis {
                    filename: format!("sample_{}.w2r", sample_index + 1),
                    file_size: 1024 * 100,
                    file_type: crate::structures::FileType::W2RReplay,
                    file_hash: "sample_hash".to_string(),
                    header: None,
                    patterns: None,
                },
            };
            
            self.current_replay = Some(mock_replay.clone());
            self.game_engine.load_replay(&mock_replay)?;
            self.selected_sample = Some(sample_index);
        }
        Ok(())
    }
    
    /// Toggle file picker dialog
    pub fn toggle_file_picker(&mut self) {
        self.show_file_picker = !self.show_file_picker;
    }
    
    /// Apply comprehensive dark theme styling
    fn apply_dark_theme(&self, ctx: &egui::Context) {
        let mut style = (*ctx.style()).clone();
        
        // Dark color scheme - comprehensive coverage
        style.visuals.override_text_color = Some(egui::Color32::from_rgb(220, 220, 220)); // Light gray text
        
        // Widget backgrounds - ensure all states are covered
        style.visuals.widgets.noninteractive.bg_fill = egui::Color32::from_rgb(40, 40, 40); // Dark widget background
        style.visuals.widgets.noninteractive.bg_stroke.color = egui::Color32::from_rgb(60, 60, 60); // Dark borders
        style.visuals.widgets.inactive.bg_fill = egui::Color32::from_rgb(45, 45, 45); // Inactive widget background
        style.visuals.widgets.active.bg_fill = egui::Color32::from_rgb(55, 55, 55); // Active widget background
        style.visuals.widgets.hovered.bg_fill = egui::Color32::from_rgb(50, 50, 50); // Hovered widget background
        
        // Widget text colors - ensure high contrast for readability
        style.visuals.widgets.noninteractive.fg_stroke.color = egui::Color32::from_rgb(220, 220, 220); // Widget text
        style.visuals.widgets.inactive.fg_stroke.color = egui::Color32::from_rgb(220, 220, 220); // Inactive text
        style.visuals.widgets.active.fg_stroke.color = egui::Color32::from_rgb(255, 255, 255); // Active text - bright white
        style.visuals.widgets.hovered.fg_stroke.color = egui::Color32::from_rgb(255, 255, 255); // Hovered text - bright white
        
        // Button styling - make buttons clearly visible with good contrast
        style.visuals.widgets.inactive.bg_fill = egui::Color32::from_rgb(30, 30, 30); // Button background - very dark
        style.visuals.widgets.inactive.bg_stroke.color = egui::Color32::from_rgb(80, 80, 80); // Button borders
        style.visuals.widgets.hovered.bg_fill = egui::Color32::from_rgb(40, 40, 40); // Hovered button background
        style.visuals.widgets.hovered.bg_stroke.color = egui::Color32::from_rgb(100, 100, 100); // Hovered button borders
        style.visuals.widgets.active.bg_fill = egui::Color32::from_rgb(50, 50, 50); // Active button background
        style.visuals.widgets.active.bg_stroke.color = egui::Color32::from_rgb(120, 120, 120); // Active button borders
        
        // Selection colors
        style.visuals.selection.bg_fill = egui::Color32::from_rgb(0, 100, 200); // Blue selection
        style.visuals.selection.stroke.color = egui::Color32::from_rgb(0, 120, 240); // Blue selection border
        
        // Panel and window colors
        style.visuals.panel_fill = egui::Color32::from_rgb(25, 25, 25); // Very dark panel background
        style.visuals.window_fill = egui::Color32::from_rgb(30, 30, 30); // Dark window background
        style.visuals.popup_shadow.color = egui::Color32::from_rgb(0, 0, 0); // Black shadow
        
        // Hyperlink colors
        style.visuals.hyperlink_color = egui::Color32::from_rgb(100, 200, 255); // Light blue links
        
        // Additional dark mode elements
        style.visuals.extreme_bg_color = egui::Color32::from_rgb(15, 15, 15); // Darkest background
        style.visuals.faint_bg_color = egui::Color32::from_rgb(35, 35, 35); // Faint background
        style.visuals.code_bg_color = egui::Color32::from_rgb(20, 20, 20); // Code background
        
        // Separator styling
        style.visuals.widgets.noninteractive.bg_stroke.color = egui::Color32::from_rgb(60, 60, 60); // Separator color
        
        // Window rounding for modern look
        style.visuals.window_rounding = egui::Rounding::same(8.0);
        style.visuals.menu_rounding = egui::Rounding::same(6.0);
        
        ctx.set_style(style);
    }
}

impl eframe::App for WC2ReplayEmulator {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Apply dark theme
        self.apply_dark_theme(ctx);
        
        egui::CentralPanel::default().show(ctx, |ui| {
            // Main title with styling
            ui.vertical_centered(|ui| {
                ui.add_space(10.0);
                ui.heading(egui::RichText::new("🎮 WC2 Remastered Replay Emulator")
                    .size(24.0)
                    .color(egui::Color32::from_rgb(100, 200, 255)));
                ui.add_space(10.0);
            });
            
            ui.separator();
            ui.add_space(10.0);
            
            // Show current status
            if let Some(replay) = &self.current_replay {
                // Replay info section
                egui::Frame::none()
                    .fill(egui::Color32::from_rgb(35, 35, 35))
                    .rounding(egui::Rounding::same(8.0))
                    .inner_margin(egui::Margin::same(15.0))
                    .show(ui, |ui| {
                        ui.label(egui::RichText::new("📁 Loaded Replay").size(16.0).strong());
                        ui.add_space(5.0);
                        ui.label(egui::RichText::new(format!("Map: {}", replay.metadata.map_name))
                            .color(egui::Color32::from_rgb(200, 200, 200)));
                        ui.label(egui::RichText::new(format!("Players: {}", replay.metadata.players.len()))
                            .color(egui::Color32::from_rgb(200, 200, 200)));
                        ui.label(egui::RichText::new(format!("Duration: {:?}", replay.metadata.duration))
                            .color(egui::Color32::from_rgb(200, 200, 200)));
                    });
                
                ui.add_space(15.0);
                
                // Playback controls section
                egui::Frame::none()
                    .fill(egui::Color32::from_rgb(35, 35, 35))
                    .rounding(egui::Rounding::same(8.0))
                    .inner_margin(egui::Margin::same(15.0))
                    .show(ui, |ui| {
                        ui.label(egui::RichText::new("🎬 Playback Controls").size(16.0).strong());
                        ui.add_space(10.0);
                        
                        // Main playback buttons
                        ui.horizontal(|ui| {
                            let play_btn = egui::Button::new(egui::RichText::new("▶ Play").size(14.0))
                                .fill(egui::Color32::from_rgb(0, 120, 60))
                                .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(0, 150, 80)));
                            if ui.add_sized([80.0, 35.0], play_btn).clicked() {
                                let _ = self.start_playback();
                            }
                            
                            let pause_btn = egui::Button::new(egui::RichText::new("⏸ Pause").size(14.0))
                                .fill(egui::Color32::from_rgb(120, 80, 0))
                                .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(150, 100, 0)));
                            if ui.add_sized([80.0, 35.0], pause_btn).clicked() {
                                let _ = self.pause_playback();
                            }
                            
                            let stop_btn = egui::Button::new(egui::RichText::new("⏹ Stop").size(14.0))
                                .fill(egui::Color32::from_rgb(120, 40, 40))
                                .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(150, 60, 60)));
                            if ui.add_sized([80.0, 35.0], stop_btn).clicked() {
                                let _ = self.stop_playback();
                            }
                        });
                        
                        ui.add_space(10.0);
                        
                        // Speed controls
                        ui.horizontal(|ui| {
                            ui.label(egui::RichText::new("⚡ Speed:").strong());
                            ui.add_space(10.0);
                            
                            let speeds = [("0.5x", 0.5), ("1x", 1.0), ("2x", 2.0), ("4x", 4.0)];
                            for (label, speed) in speeds {
                                let speed_btn = egui::Button::new(egui::RichText::new(label).size(12.0))
                                    .fill(egui::Color32::from_rgb(40, 40, 60))
                                    .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(80, 80, 120)));
                                if ui.add_sized([50.0, 30.0], speed_btn).clicked() {
                                    let _ = self.set_playback_speed(speed);
                                }
                            }
                        });
                        
                        ui.add_space(10.0);
                        
                        // Current playback state
                        let state = self.get_playback_state();
                        ui.label(egui::RichText::new(format!("Status: {:?}", state))
                            .color(egui::Color32::from_rgb(100, 200, 100)));
                    });
                
            } else {
                // No replay loaded section
                egui::Frame::none()
                    .fill(egui::Color32::from_rgb(35, 35, 35))
                    .rounding(egui::Rounding::same(8.0))
                    .inner_margin(egui::Margin::same(20.0))
                    .show(ui, |ui| {
                        ui.vertical_centered(|ui| {
                            ui.label(egui::RichText::new("📂 No replay loaded")
                                .size(18.0)
                                .color(egui::Color32::from_rgb(180, 180, 180)));
                            ui.add_space(10.0);
                            
                            // Load replay button
                            let load_btn = egui::Button::new(egui::RichText::new("📁 Load Replay").size(16.0))
                                .fill(egui::Color32::from_rgb(60, 60, 100))
                                .stroke(egui::Stroke::new(2.0, egui::Color32::from_rgb(100, 100, 150)));
                            if ui.add_sized([150.0, 40.0], load_btn).clicked() {
                                self.toggle_file_picker();
                            }
                        });
                        
                        ui.add_space(15.0);
                        
                        // Sample replays section
                        ui.label(egui::RichText::new("🧪 Sample Replays for Testing").size(16.0).strong());
                        ui.add_space(10.0);
                        
                        // Store sample index to load after the loop
                        let mut sample_to_load = None;
                        
                        for (index, sample) in self.sample_replays.iter().enumerate() {
                            let is_selected = self.selected_sample == Some(index);
                            let frame_color = if is_selected {
                                egui::Color32::from_rgb(60, 80, 120)
                            } else {
                                egui::Color32::from_rgb(45, 45, 45)
                            };
                            
                            egui::Frame::none()
                                .fill(frame_color)
                                .rounding(egui::Rounding::same(6.0))
                                .inner_margin(egui::Margin::same(10.0))
                                .show(ui, |ui| {
                                    ui.horizontal(|ui| {
                                        ui.vertical(|ui| {
                                            ui.label(egui::RichText::new(&sample.name).strong());
                                            ui.label(egui::RichText::new(format!("Map: {}", sample.map_name))
                                                .color(egui::Color32::from_rgb(200, 200, 200)));
                                            ui.label(egui::RichText::new(format!("Players: {}", sample.players.join(", ")))
                                                .color(egui::Color32::from_rgb(200, 200, 200)));
                                            ui.label(egui::RichText::new(format!("Duration: {:.1} min", sample.duration.as_secs_f32() / 60.0))
                                                .color(egui::Color32::from_rgb(200, 200, 200)));
                                        });
                                        
                                        ui.add_space(10.0);
                                        
                                        let load_sample_btn = egui::Button::new(egui::RichText::new("Load").size(14.0))
                                            .fill(egui::Color32::from_rgb(40, 80, 40))
                                            .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(80, 120, 80)));
                                        if ui.add_sized([60.0, 30.0], load_sample_btn).clicked() {
                                            sample_to_load = Some(index);
                                        }
                                    });
                                });
                            
                            ui.add_space(5.0);
                        }
                        
                        // Load sample replay after the loop to avoid borrow checker issues
                        if let Some(index) = sample_to_load {
                            if let Err(e) = self.load_sample_replay(index) {
                                eprintln!("Failed to load sample replay: {}", e);
                            }
                        }
                    });
            }
            
            ui.add_space(20.0);
            
            // Emulator info section
            egui::Frame::none()
                .fill(egui::Color32::from_rgb(30, 30, 40))
                .rounding(egui::Rounding::same(8.0))
                .inner_margin(egui::Margin::same(15.0))
                .show(ui, |ui| {
                    ui.label(egui::RichText::new("ℹ️ About This Emulator").size(16.0).strong());
                    ui.add_space(5.0);
                    ui.label(egui::RichText::new("• Renders replays with Remastered-quality graphics")
                        .color(egui::Color32::from_rgb(200, 200, 200)));
                    ui.label(egui::RichText::new("• Works with replays from any WC2 version")
                        .color(egui::Color32::from_rgb(200, 200, 200)));
                    ui.label(egui::RichText::new("• Unified replay format (.w2r)")
                        .color(egui::Color32::from_rgb(200, 200, 200)));
                    ui.label(egui::RichText::new("• Export to video and images")
                        .color(egui::Color32::from_rgb(200, 200, 200)));
                });
        });
        
        // File picker dialog
        if self.show_file_picker {
            egui::Window::new("📁 Load Replay File")
                .default_pos(egui::Pos2::new(400.0, 200.0))
                .show(ctx, |ui| {
                    ui.label("File picker dialog - coming soon!");
                    ui.label("For now, use the sample replays above for testing.");
                    ui.add_space(10.0);
                    
                    if ui.button("Close").clicked() {
                        self.show_file_picker = false;
                    }
                });
        }
    }
}
