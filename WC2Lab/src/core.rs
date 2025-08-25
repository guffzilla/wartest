use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use log::{info, warn, error};

use crate::analysis::AnalysisResult;
use crate::game_state::GameState;
use crate::events::GameEvent;

/// Main laboratory coordinator for WC2 Remastered analysis
pub struct Laboratory {
    /// Current laboratory session
    session_id: String,
    /// Start time of the session
    start_time: DateTime<Utc>,
    /// Configuration for the laboratory
    config: LaboratoryConfig,
    /// Collected game states
    game_states: Vec<GameState>,
    /// Recorded game events
    game_events: Vec<GameEvent>,
    /// Analysis results
    analysis_results: Vec<AnalysisResult>,
    /// Output directory for results
    output_dir: PathBuf,
}

/// Configuration for the laboratory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaboratoryConfig {
    /// Whether to run in headless mode (no GUI)
    pub headless_mode: bool,
    /// Memory scan interval in milliseconds
    pub memory_scan_interval: u64,
    /// Event recording enabled
    pub event_recording: bool,
    /// Data extraction depth
    pub extraction_depth: ExtractionDepth,
    /// Output format for results
    pub output_format: OutputFormat,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExtractionDepth {
    /// Basic game state (units, resources, buildings)
    Basic,
    /// Detailed state (unit health, building progress, etc.)
    Detailed,
    /// Complete state (all available data)
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OutputFormat {
    JSON,
    Bincode,
    CSV,
    Custom(String),
}

impl Laboratory {
    /// Create a new laboratory instance
    pub fn new() -> Result<Self> {
        let session_id = format!("wc2-lab-{}", chrono::Utc::now().timestamp());
        let output_dir = PathBuf::from("output").join(&session_id);
        
        // Create output directory
        std::fs::create_dir_all(&output_dir)?;
        
        let config = LaboratoryConfig::default();
        
        Ok(Self {
            session_id,
            start_time: Utc::now(),
            config,
            game_states: Vec::new(),
            game_events: Vec::new(),
            analysis_results: Vec::new(),
            output_dir,
        })
    }

    /// Start a new analysis session
    pub async fn start_session(&mut self) -> Result<()> {
        info!("🔬 Starting new laboratory session: {}", self.session_id);
        info!("📁 Output directory: {:?}", self.output_dir);
        info!("⚙️  Configuration: {:?}", self.config);
        
        // Save session configuration
        self.save_config().await?;
        
        Ok(())
    }

    /// Add a new game state to the laboratory
    pub fn add_game_state(&mut self, state: GameState) {
        self.game_states.push(state);
        info!("📊 Added game state #{}", self.game_states.len());
    }

    /// Add a new game event to the laboratory
    pub fn add_game_event(&mut self, event: GameEvent) {
        self.game_events.push(event);
        info!("📝 Added game event #{}", self.game_events.len());
    }

    /// Add analysis results
    pub fn add_analysis_result(&mut self, result: AnalysisResult) {
        self.analysis_results.push(result);
        info!("🔍 Added analysis result #{}", self.analysis_results.len());
    }

    /// Save all collected data
    pub async fn save_results(&self, results: &[AnalysisResult]) -> Result<()> {
        info!("💾 Saving laboratory results...");
        
        // Save game states
        let states_path = self.output_dir.join("game_states.json");
        let states_json = serde_json::to_string_pretty(&self.game_states)?;
        std::fs::write(&states_path, states_json)?;
        info!("💾 Saved {} game states to {:?}", self.game_states.len(), states_path);

        // Save game events
        let events_path = self.output_dir.join("game_events.json");
        let events_json = serde_json::to_string_pretty(&self.game_events)?;
        std::fs::write(&events_path, events_json)?;
        info!("💾 Saved {} game events to {:?}", self.game_events.len(), events_path);

        // Save analysis results
        let results_path = self.output_dir.join("analysis_results.json");
        let results_json = serde_json::to_string_pretty(results)?;
        std::fs::write(&results_path, results_json)?;
        info!("💾 Saved {} analysis results to {:?}", results.len(), results_path);

        // Generate summary report
        self.generate_summary_report().await?;
        
        Ok(())
    }

    /// Generate a summary report of the laboratory session
    async fn generate_summary_report(&self) -> Result<()> {
        let summary = LaboratorySummary {
            session_id: self.session_id.clone(),
            start_time: self.start_time,
            end_time: Utc::now(),
            total_game_states: self.game_states.len(),
            total_game_events: self.game_events.len(),
            total_analysis_results: self.analysis_results.len(),
            config: self.config.clone(),
        };

        let summary_path = self.output_dir.join("session_summary.json");
        let summary_json = serde_json::to_string_pretty(&summary)?;
        std::fs::write(&summary_path, summary_json)?;
        
        info!("📋 Generated session summary: {:?}", summary_path);
        Ok(())
    }

    /// Save laboratory configuration
    async fn save_config(&self) -> Result<()> {
        let config_path = self.output_dir.join("laboratory_config.json");
        let config_json = serde_json::to_string_pretty(&self.config)?;
        std::fs::write(&config_path, config_json)?;
        Ok(())
    }

    /// Get current laboratory statistics
    pub fn get_stats(&self) -> LaboratoryStats {
        LaboratoryStats {
            session_id: self.session_id.clone(),
            start_time: self.start_time,
            game_states_count: self.game_states.len(),
            game_events_count: self.game_events.len(),
            analysis_results_count: self.analysis_results.len(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LaboratorySummary {
    pub session_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub total_game_states: usize,
    pub total_game_events: usize,
    pub total_analysis_results: usize,
    pub config: LaboratoryConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LaboratoryStats {
    pub session_id: String,
    pub start_time: DateTime<Utc>,
    pub game_states_count: usize,
    pub game_events_count: usize,
    pub analysis_results_count: usize,
}

impl Default for LaboratoryConfig {
    fn default() -> Self {
        Self {
            headless_mode: true,
            memory_scan_interval: 100, // 100ms
            event_recording: true,
            extraction_depth: ExtractionDepth::Detailed,
            output_format: OutputFormat::JSON,
        }
    }
}
