use eframe::egui;
use std::time::Duration;

/// Reusable UI components for the replay viewer

/// Render a time display widget
pub fn render_time_display(ui: &mut egui::Ui, current_time: f32, total_time: f32) {
    ui.horizontal(|ui| {
        ui.label(format!("{:.1}s", current_time));
        ui.label("/");
        ui.label(format!("{:.1}s", total_time));
    });
}

/// Render a progress bar
pub fn render_progress_bar(ui: &mut egui::Ui, progress: f32, label: &str) {
    ui.label(label);
    ui.add(egui::widgets::ProgressBar::new(progress).show_percentage());
}

/// Render playback controls
pub fn render_playback_controls(
    ui: &mut egui::Ui,
    is_playing: bool,
    on_play_pause: impl FnOnce(),
    on_stop: impl FnOnce(),
    on_previous: impl FnOnce(),
    on_next: impl FnOnce(),
) {
    ui.horizontal(|ui| {
        if ui.button("⏮").clicked() {
            on_previous();
        }
        
        if ui.button(if is_playing { "⏸" } else { "▶" }).clicked() {
            on_play_pause();
        }
        
        if ui.button("⏹").clicked() {
            on_stop();
        }
        
        if ui.button("⏭").clicked() {
            on_next();
        }
    });
}

/// Render speed controls
pub fn render_speed_controls(
    ui: &mut egui::Ui,
    current_speed: f32,
    on_speed_change: impl Fn(f32),
) {
    ui.label("Speed:");
    ui.horizontal(|ui| {
        for speed in [0.25, 0.5, 1.0, 2.0, 4.0] {
            let is_selected = (current_speed - speed).abs() < 0.1;
            if ui.selectable_label(is_selected, format!("{}x", speed)).clicked() {
                on_speed_change(speed);
            }
        }
    });
}

/// Render a replay list item
pub fn render_replay_item(
    ui: &mut egui::Ui,
    replay: &crate::decoder::ReplayInfo,
    is_selected: bool,
) -> bool {
    let mut clicked = false;
    
    ui.horizontal(|ui| {
        if ui.selectable_label(is_selected, &replay.filename).clicked() {
            clicked = true;
        }
        
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            ui.label(format!("{:.1} KB", replay.file_size as f32 / 1024.0));
        });
    });
    
    if is_selected {
        ui.indent("replay_details", |ui| {
            ui.label(format!("Map: {}", replay.map_name));
            ui.label(format!("Players: {}", replay.player_count));
            ui.label(format!("Duration: {:.1} min", replay.duration.as_secs_f32() / 60.0));
        });
    }
    
    clicked
}

/// Render player information
pub fn render_player_info(ui: &mut egui::Ui, player: &crate::decoder::PlayerInfo) {
    ui.collapsing(&player.name, |ui| {
        egui::Grid::new("player_grid").show(ui, |ui| {
            ui.label("Race:");
            ui.label(format!("{:?}", player.race));
            ui.end_row();
            
            ui.label("Team:");
            ui.label(&player.team.to_string());
            ui.end_row();
            
            ui.label("Color:");
            ui.label(format!("{:?}", player.color));
            ui.end_row();
            
            ui.label("APM:");
            ui.label(format!("{:.1}", player.apm));
            ui.end_row();
            
            ui.label("Winner:");
            ui.label(if player.is_winner { "Yes" } else { "No" });
            ui.end_row();
        });
    });
}

/// Render game statistics
pub fn render_game_stats(ui: &mut egui::Ui, replay: &crate::decoder::DecodedReplay) {
    ui.heading("Game Statistics");
    
    egui::Grid::new("game_stats").show(ui, |ui| {
        ui.label("Map:");
        ui.label(&replay.metadata.map_name);
        ui.end_row();
        
        ui.label("Game Type:");
        ui.label(format!("{:?}", replay.metadata.game_type));
        ui.end_row();
        
        ui.label("Players:");
        ui.label(&replay.metadata.players.len().to_string());
        ui.end_row();
        
        ui.label("Total Events:");
        ui.label(&replay.events.len().to_string());
        ui.end_row();
        
        ui.label("Duration:");
        ui.label(&format!("{:.1} minutes", replay.metadata.duration.as_secs_f32() / 60.0));
        ui.end_row();
        
        ui.label("File Size:");
        ui.label(&format!("{:.1} KB", replay.metadata.file_size as f32 / 1024.0));
        ui.end_row();
    });
}

/// Render event details
pub fn render_event_details(ui: &mut egui::Ui, event: &crate::decoder::events::GameEvent) {
    ui.collapsing(format!("Event: {:?}", event.event_type), |ui| {
        egui::Grid::new("event_grid").show(ui, |ui| {
            ui.label("Timestamp:");
            ui.label(format!("{}ms", event.timestamp));
            ui.end_row();
            
            ui.label("Size:");
            ui.label(format!("{} bytes", event.size));
            ui.end_row();
            
            ui.label("Type:");
            ui.label(format!("{:?}", event.event_type));
            ui.end_row();
        });
        
        ui.separator();
        
        ui.label("Raw Data:");
        let mut text = format!("{:?}", &event.data[..std::cmp::min(64, event.data.len())]);
        ui.add(egui::widgets::TextEdit::multiline(&mut text)
            .desired_width(f32::INFINITY)
            .desired_rows(3));
    });
}

/// Render a minimap placeholder
pub fn render_minimap_placeholder(ui: &mut egui::Ui) {
    ui.centered_and_justified(|ui| {
        ui.label("Minimap View");
        ui.label("This will show the game minimap with unit positions");
        ui.label("and player territories.");
        
        ui.add_space(20.0);
        
        // Placeholder minimap
        let (rect, _) = ui.allocate_exact_size(
            egui::vec2(200.0, 200.0),
            egui::Sense::click(),
        );
        
        ui.painter().rect_filled(
            rect,
            0.0,
            egui::Color32::from_gray(50),
        );
        
        ui.painter().text(
            rect.center(),
            egui::Align2::CENTER_CENTER,
            "Minimap\nComing Soon",
            egui::FontId::proportional(14.0),
            egui::Color32::WHITE,
        );
    });
}

/// Render a game view placeholder
pub fn render_game_view_placeholder(ui: &mut egui::Ui) {
    ui.centered_and_justified(|ui| {
        ui.label("Game View");
        ui.label("This will show the actual game visualization");
        ui.label("with units, buildings, and terrain.");
        
        ui.add_space(20.0);
        
        // Placeholder game view
        let (rect, _) = ui.allocate_exact_size(
            egui::vec2(400.0, 300.0),
            egui::Sense::click(),
        );
        
        ui.painter().rect_filled(
            rect,
            0.0,
            egui::Color32::from_gray(30),
        );
        
        ui.painter().text(
            rect.center(),
            egui::Align2::CENTER_CENTER,
            "Game Visualization\nComing Soon",
            egui::FontId::proportional(16.0),
            egui::Color32::WHITE,
        );
    });
}

/// Format duration for display
pub fn format_duration(duration: Duration) -> String {
    let total_seconds = duration.as_secs();
    let minutes = total_seconds / 60;
    let seconds = total_seconds % 60;
    
    if minutes > 0 {
        format!("{}:{:02}", minutes, seconds)
    } else {
        format!("{}s", seconds)
    }
}

/// Format file size for display
pub fn format_file_size(bytes: u64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;
    
    let bytes_f = bytes as f64;
    
    if bytes_f >= GB {
        format!("{:.1} GB", bytes_f / GB)
    } else if bytes_f >= MB {
        format!("{:.1} MB", bytes_f / MB)
    } else if bytes_f >= KB {
        format!("{:.1} KB", bytes_f / KB)
    } else {
        format!("{} B", bytes)
    }
}
