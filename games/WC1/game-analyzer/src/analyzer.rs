use std::path::{Path, PathBuf};
use anyhow::{Result, Context};
use crate::game_data::GameData;
use crate::utils::AnalysisUtils;

/// WC1 Game Analyzer for analyzing Warcraft I game data
pub struct WC1GameAnalyzer {
    game_data: GameData,
    analysis_config: AnalysisConfig,
}

/// Configuration for game analysis
#[derive(Debug, Clone)]
pub struct AnalysisConfig {
    /// Whether to perform deep analysis
    pub deep_analysis: bool,
    /// Output directory for analysis results
    pub output_dir: PathBuf,
    /// Include detailed statistics
    pub include_stats: bool,
    /// Analyze specific aspects (units, maps, etc.)
    pub analyze_aspects: Vec<AnalysisAspect>,
}

/// Different aspects of the game to analyze
#[derive(Debug, Clone, PartialEq)]
pub enum AnalysisAspect {
    Units,
    Maps,
    Campaigns,
    Multiplayer,
    Assets,
    All,
}

impl Default for AnalysisConfig {
    fn default() -> Self {
        Self {
            deep_analysis: false,
            output_dir: PathBuf::from("wc1_analysis"),
            include_stats: true,
            analyze_aspects: vec![AnalysisAspect::All],
        }
    }
}

impl WC1GameAnalyzer {
    /// Create a new WC1 game analyzer
    pub fn new(game_data: GameData) -> Self {
        Self {
            game_data,
            analysis_config: AnalysisConfig::default(),
        }
    }

    /// Create analyzer with custom configuration
    pub fn with_config(game_data: GameData, config: AnalysisConfig) -> Self {
        Self {
            game_data,
            analysis_config: config,
        }
    }

    /// Analyze the game data
    pub fn analyze(&self) -> Result<AnalysisResult> {
        let mut result = AnalysisResult::new();
        
        // Analyze based on configured aspects
        for aspect in &self.analysis_config.analyze_aspects {
            match aspect {
                AnalysisAspect::Units => self.analyze_units(&mut result)?,
                AnalysisAspect::Maps => self.analyze_maps(&mut result)?,
                AnalysisAspect::Campaigns => self.analyze_campaigns(&mut result)?,
                AnalysisAspect::Multiplayer => self.analyze_multiplayer(&mut result)?,
                AnalysisAspect::Assets => self.analyze_assets(&mut result)?,
                AnalysisAspect::All => self.analyze_all(&mut result)?,
            }
        }

        Ok(result)
    }

    /// Analyze all aspects of the game
    fn analyze_all(&self, result: &mut AnalysisResult) -> Result<()> {
        self.analyze_units(result)?;
        self.analyze_maps(result)?;
        self.analyze_campaigns(result)?;
        self.analyze_multiplayer(result)?;
        self.analyze_assets(result)?;
        Ok(())
    }

    /// Analyze unit data
    fn analyze_units(&self, result: &mut AnalysisResult) -> Result<()> {
        let unit_count = self.game_data.get_unit_count()?;
        result.add_metric("total_units", unit_count as f64);
        
        if self.analysis_config.include_stats {
            let unit_types = self.game_data.get_unit_types()?;
            result.add_metric("unit_types", unit_types.len() as f64);
        }
        
        Ok(())
    }

    /// Analyze map data
    fn analyze_maps(&self, result: &mut AnalysisResult) -> Result<()> {
        let map_count = self.game_data.get_map_count()?;
        result.add_metric("total_maps", map_count as f64);
        
        if self.analysis_config.include_stats {
            let map_sizes = self.game_data.get_map_sizes()?;
            if !map_sizes.is_empty() {
                let avg_size = map_sizes.iter().map(|&x| x as f64).sum::<f64>() / map_sizes.len() as f64;
                result.add_metric("average_map_size", avg_size);
            }
        }
        
        Ok(())
    }

    /// Analyze campaign data
    fn analyze_campaigns(&self, result: &mut AnalysisResult) -> Result<()> {
        let campaign_count = self.game_data.get_campaign_count()?;
        result.add_metric("total_campaigns", campaign_count as f64);
        
        if self.analysis_config.deep_analysis {
            let campaign_missions = self.game_data.get_campaign_missions()?;
            result.add_metric("total_missions", campaign_missions.len() as f64);
        }
        
        Ok(())
    }

    /// Analyze multiplayer data
    fn analyze_multiplayer(&self, result: &mut AnalysisResult) -> Result<()> {
        let multiplayer_maps = self.game_data.get_multiplayer_maps()?;
        result.add_metric("multiplayer_maps", multiplayer_maps.len() as f64);
        
        if self.analysis_config.deep_analysis {
            let player_counts = self.game_data.get_multiplayer_player_counts()?;
            if let Some(max_players) = player_counts.iter().max() {
                result.add_metric("max_players", *max_players as f64);
            }
        }
        
        Ok(())
    }

    /// Analyze asset data
    fn analyze_assets(&self, result: &mut AnalysisResult) -> Result<()> {
        let asset_count = self.game_data.get_asset_count()?;
        result.add_metric("total_assets", asset_count as f64);
        
        if self.analysis_config.include_stats {
            let asset_types = self.game_data.get_asset_types()?;
            result.add_metric("asset_types", asset_types.len() as f64);
        }
        
        Ok(())
    }

    /// Get analysis configuration
    pub fn config(&self) -> &AnalysisConfig {
        &self.analysis_config
    }

    /// Update analysis configuration
    pub fn update_config(&mut self, config: AnalysisConfig) {
        self.analysis_config = config;
    }
}

/// Result of game analysis
#[derive(Debug)]
pub struct AnalysisResult {
    /// Analysis metrics
    pub metrics: std::collections::HashMap<String, f64>,
    /// Analysis errors
    pub errors: Vec<String>,
    /// Analysis warnings
    pub warnings: Vec<String>,
    /// Timestamp of analysis
    pub timestamp: std::time::SystemTime,
}

impl AnalysisResult {
    /// Create a new analysis result
    pub fn new() -> Self {
        Self {
            metrics: std::collections::HashMap::new(),
            errors: Vec::new(),
            warnings: Vec::new(),
            timestamp: std::time::SystemTime::now(),
        }
    }

    /// Add a metric
    pub fn add_metric(&mut self, name: &str, value: f64) {
        self.metrics.insert(name.to_string(), value);
    }

    /// Add an error
    pub fn add_error(&mut self, error: String) {
        self.errors.push(error);
    }

    /// Add a warning
    pub fn add_warning(&mut self, warning: String) {
        self.warnings.push(warning);
    }

    /// Get a metric value
    pub fn get_metric(&self, name: &str) -> Option<f64> {
        self.metrics.get(name).copied()
    }

    /// Check if analysis was successful
    pub fn is_success(&self) -> bool {
        self.errors.is_empty()
    }

    /// Get summary of analysis
    pub fn get_summary(&self) -> String {
        let mut summary = format!("Analysis completed at {:?}\n", self.timestamp);
        summary.push_str(&format!("Metrics: {}\n", self.metrics.len()));
        summary.push_str(&format!("Errors: {}\n", self.errors.len()));
        summary.push_str(&format!("Warnings: {}\n", self.warnings.len()));
        
        if !self.metrics.is_empty() {
            summary.push_str("\nKey Metrics:\n");
            for (name, value) in &self.metrics {
                summary.push_str(&format!("  {}: {}\n", name, value));
            }
        }
        
        summary
    }
}

impl Default for AnalysisResult {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game_data::GameData;

    #[test]
    fn test_analysis_config_default() {
        let config = AnalysisConfig::default();
        assert!(!config.deep_analysis);
        assert_eq!(config.output_dir, PathBuf::from("wc1_analysis"));
        assert!(config.include_stats);
        assert_eq!(config.analyze_aspects, vec![AnalysisAspect::All]);
    }

    #[test]
    fn test_analysis_result() {
        let mut result = AnalysisResult::new();
        assert_eq!(result.metrics.len(), 0);
        assert!(result.errors.is_empty());
        assert!(result.warnings.is_empty());

        result.add_metric("test_metric", 42.0);
        assert_eq!(result.get_metric("test_metric"), Some(42.0));
        assert!(result.is_success());
    }
}
