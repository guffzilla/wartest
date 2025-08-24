use eframe::egui;
use std::path::PathBuf;
use anyhow::Result;
use tracing::{info, warn, error};

use crate::decoder::{ReplayDecoder, DecodedReplay, ReplayInfo};

/// Main replay viewer application
pub struct ReplayViewerApp {
    decoder: ReplayDecoder,
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
        
        // Default replay directory - point to actual WC2 Remastered installation
        let replay_directory = PathBuf::from("../../Warcraft II Remastered/Data/w2r");
        
        Ok(Self {
            decoder,
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
        info!("Replay loaded successfully");
        Ok(())
    }
    
    /// Generate sample replay data for testing
    fn generate_sample_replays(&mut self) {
        info!("Generating sample replay data");
        
        // Create sample replay info
        let sample_replay = crate::decoder::ReplayInfo {
            filename: "sample_replay_001.w2r".to_string(),
            file_size: 1024 * 1024, // 1MB
            creation_date: chrono::Utc::now(),
            map_name: "Forest of Shadows".to_string(),
            game_type: crate::decoder::GameType::Skirmish,
            player_count: 2,
            duration: std::time::Duration::from_secs(1800), // 30 minutes
        };
        
        let sample_replay2 = crate::decoder::ReplayInfo {
            filename: "sample_replay_002.w2r".to_string(),
            file_size: 2048 * 1024, // 2MB
            creation_date: chrono::Utc::now(),
            map_name: "Ice Crown".to_string(),
            game_type: crate::decoder::GameType::Multiplayer,
            player_count: 4,
            duration: std::time::Duration::from_secs(2400), // 40 minutes
        };
        
        let sample_replay3 = crate::decoder::ReplayInfo {
            filename: "sample_replay_003.w2r".to_string(),
            file_size: 1536 * 1024, // 1.5MB
            creation_date: chrono::Utc::now(),
            map_name: "Swamp of Sorrows".to_string(),
            game_type: crate::decoder::GameType::Campaign,
            player_count: 1,
            duration: std::time::Duration::from_secs(1200), // 20 minutes
        };
        
        self.replay_list = vec![sample_replay, sample_replay2, sample_replay3];
        info!("Generated {} sample replays", self.replay_list.len());
    }

    /// Apply dark mode styling
    fn apply_dark_theme(&self, ctx: &egui::Context) {
        let mut style = (*ctx.style()).clone();
        
        // Dark color scheme - comprehensive coverage
        style.visuals.override_text_color = Some(egui::Color32::from_rgb(220, 220, 220)); // Light gray text
        
        // Widget backgrounds - ensure all states are covered
        style.visuals.widgets.noninteractive.bg_fill = egui::Color32::from_rgb(45, 45, 45); // Darker widget background
        style.visuals.widgets.noninteractive.bg_stroke.color = egui::Color32::from_rgb(60, 60, 60); // Dark borders
        style.visuals.widgets.inactive.bg_fill = egui::Color32::from_rgb(50, 50, 50); // Inactive widget background
        style.visuals.widgets.active.bg_fill = egui::Color32::from_rgb(70, 70, 70); // Active widget background
        style.visuals.widgets.hovered.bg_fill = egui::Color32::from_rgb(60, 60, 60); // Hovered widget background
        
        // Widget text colors - ensure high contrast for readability
        style.visuals.widgets.noninteractive.fg_stroke.color = egui::Color32::from_rgb(255, 255, 255); // Widget text - bright white
        style.visuals.widgets.inactive.fg_stroke.color = egui::Color32::from_rgb(255, 255, 255); // Inactive text - bright white
        style.visuals.widgets.active.fg_stroke.color = egui::Color32::from_rgb(255, 255, 255); // Active text - bright white
        style.visuals.widgets.hovered.fg_stroke.color = egui::Color32::from_rgb(255, 255, 255); // Hovered text - bright white
        
        // Selection colors
        style.visuals.selection.bg_fill = egui::Color32::from_rgb(0, 100, 200); // Blue selection
        style.visuals.selection.stroke.color = egui::Color32::from_rgb(0, 120, 240); // Blue selection border
        
        // Panel colors
        style.visuals.panel_fill = egui::Color32::from_rgb(35, 35, 35); // Dark panel background
        style.visuals.window_fill = egui::Color32::from_rgb(40, 40, 40); // Dark window background
        style.visuals.popup_shadow.color = egui::Color32::from_rgb(0, 0, 0); // Dark shadow
        
        // Hyperlink colors
        style.visuals.hyperlink_color = egui::Color32::from_rgb(100, 200, 255); // Light blue links
        
        // Additional dark mode elements
        style.visuals.extreme_bg_color = egui::Color32::from_rgb(25, 25, 25); // Darkest background
        style.visuals.faint_bg_color = egui::Color32::from_rgb(55, 55, 55); // Faint background
        style.visuals.code_bg_color = egui::Color32::from_rgb(30, 30, 30); // Code background
        
        // Button styling - make buttons VERY dark with bright text
        style.visuals.widgets.inactive.bg_fill = egui::Color32::from_rgb(30, 30, 30); // Very dark button background
        style.visuals.widgets.inactive.bg_stroke.color = egui::Color32::from_rgb(80, 80, 80); // Button borders
        style.visuals.widgets.hovered.bg_fill = egui::Color32::from_rgb(40, 40, 40); // Slightly lighter on hover
        style.visuals.widgets.hovered.bg_stroke.color = egui::Color32::from_rgb(100, 100, 100); // Hovered button borders
        style.visuals.widgets.active.bg_fill = egui::Color32::from_rgb(50, 50, 50); // Active button background
        style.visuals.widgets.active.bg_stroke.color = egui::Color32::from_rgb(120, 120, 120); // Active button borders
        
        // Separator styling
        style.visuals.widgets.noninteractive.bg_stroke.color = egui::Color32::from_rgb(60, 60, 60); // Separator color
        
        // Collapsing header styling
        style.visuals.widgets.inactive.bg_fill = egui::Color32::from_rgb(45, 45, 45); // Collapsing header background
        
        ctx.set_style(style);
    }
}

impl eframe::App for ReplayViewerApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Apply dark theme
        self.apply_dark_theme(ctx);
        
        egui::CentralPanel::default().show(ctx, |ui| {
            // Main layout
            egui::SidePanel::left("replay_list")
                .resizable(true)
                .default_width(300.0)
                .show_inside(ui, |ui| {
                    self.render_replay_list(ui);
                });

            egui::CentralPanel::default().show_inside(ui, |ui| {
                self.render_main_content(ui);
            });
        });
    }
}

impl ReplayViewerApp {
    /// Render the replay list panel
    fn render_replay_list(&mut self, ui: &mut egui::Ui) {
        ui.heading("Replay List");
        
        // Show replay directory path
        ui.label(format!("Directory: {:?}", self.replay_directory));
        
        // Note about WC2 Remastered replays
        ui.label("Note: WC2 Remastered only saves index files (.idx), not full replays");
        ui.label("Use 'Generate Sample' to create test replay data");
        
        // Custom styled Refresh button
        let refresh_button = egui::Button::new(egui::RichText::new("Refresh").color(egui::Color32::from_rgb(255, 255, 255)))
            .fill(egui::Color32::from_rgb(30, 30, 30))
            .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(80, 80, 80)));
        
        if ui.add_sized([ui.available_width(), 30.0], refresh_button).clicked() {
            // Load replay list synchronously for now
            match self.decoder.list_replays(&self.replay_directory) {
                Ok(replays) => {
                    self.replay_list = replays;
                    info!("Successfully loaded {} replays", self.replay_list.len());
                }
                Err(e) => {
                    error!("Failed to load replays: {}", e);
                    // Show error in UI
                    ui.label(format!("Error loading replays: {}", e));
                }
            }
        }
        
        // Generate sample replays button
        let sample_button = egui::Button::new(egui::RichText::new("Generate Sample Replays").color(egui::Color32::from_rgb(255, 255, 255)))
            .fill(egui::Color32::from_rgb(40, 80, 40))  // Green for generate
            .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(80, 120, 80)));
        
        if ui.add_sized([ui.available_width(), 30.0], sample_button).clicked() {
            self.generate_sample_replays();
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
            let load_button = egui::Button::new(egui::RichText::new("Load Replay").color(egui::Color32::from_rgb(255, 255, 255)))
                .fill(egui::Color32::from_rgb(30, 30, 30))
                .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(80, 80, 80)));
            
            if ui.add_sized([ui.available_width(), 30.0], load_button).clicked() {
                if let Some(replay) = self.replay_list.get(selected_index) {
                    let replay_path = self.replay_directory.join(&replay.filename);
                    if let Ok(replay_data) = self.decoder.decode_replay(&replay_path) {
                        self.current_replay = Some(replay_data);
                    }
                }
            }
        }
    }

    /// Render the main content area
    fn render_main_content(&mut self, ui: &mut egui::Ui) {
        ui.centered_and_justified(|ui| {
            if let Some(replay) = &self.current_replay {
                ui.heading("Replay Loaded");
                ui.label(format!("Map: {}", replay.metadata.map_name));
                ui.label(format!("Players: {}", replay.metadata.players.len()));
                ui.label(format!("Duration: {:.1} min", replay.metadata.duration.as_secs_f32() / 60.0));
                ui.label(format!("Events: {}", replay.events.len()));
            } else {
                ui.label("No replay loaded");
                ui.label("Select a replay from the left panel to get started");
            }
        });
    }
}
