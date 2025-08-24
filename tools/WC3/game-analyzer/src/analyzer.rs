use std::path::PathBuf;
use anyhow::Result;
use crate::game_data::GameData;

/// WC3 Game Analyzer
pub struct WC3GameAnalyzer {
    /// Game data
    game_data: GameData,
    /// Analysis configuration
    analysis_config: AnalysisConfig,
}

/// Analysis configuration
pub struct AnalysisConfig {
    /// Include statistics
    pub include_stats: bool,
    /// Include detailed analysis
    pub include_detailed: bool,
    /// Output format
    pub output_format: OutputFormat,
}

/// Output format
#[derive(Debug, Clone)]
pub enum OutputFormat {
    /// JSON output
    Json,
    /// Text output
    Text,
    /// CSV output
    Csv,
}

/// Analysis aspects
#[derive(Debug, Clone)]
pub enum AnalysisAspect {
    /// Units analysis
    Units,
    /// Maps analysis
    Maps,
    /// Campaigns analysis
    Campaigns,
    /// Multiplayer analysis
    Multiplayer,
    /// Assets analysis
    Assets,
}

/// Analysis result
pub struct AnalysisResult {
    /// Metrics
    pub metrics: std::collections::HashMap<String, f64>,
    /// Summary
    pub summary: String,
    /// Details
    pub details: Vec<String>,
}

impl WC3GameAnalyzer {
    /// Create new WC3 game analyzer
    pub fn new(game_data: GameData, config: AnalysisConfig) -> Self {
        Self {
            game_data,
            analysis_config: config,
        }
    }

    /// Analyze game data
    pub fn analyze(&self, aspects: &[AnalysisAspect]) -> Result<AnalysisResult> {
        let mut result = AnalysisResult {
            metrics: std::collections::HashMap::new(),
            summary: String::new(),
            details: Vec::new(),
        };

        for aspect in aspects {
            match aspect {
                AnalysisAspect::Units => self.analyze_units(&mut result)?,
                AnalysisAspect::Maps => self.analyze_maps(&mut result)?,
                AnalysisAspect::Campaigns => self.analyze_campaigns(&mut result)?,
                AnalysisAspect::Multiplayer => self.analyze_multiplayer(&mut result)?,
                AnalysisAspect::Assets => self.analyze_assets(&mut result)?,
            }
        }

        self.generate_summary(&mut result);
        Ok(result)
    }

    /// Analyze units
    fn analyze_units(&self, result: &mut AnalysisResult) -> Result<()> {
        let unit_count = self.game_data.get_unit_count()?;
        result.add_metric("total_units", unit_count as f64);
        
        if self.analysis_config.include_stats {
            let unit_types = self.game_data.get_unit_types()?;
            result.add_metric("unit_types", unit_types.len() as f64);
            
            let races = self.game_data.get_unit_races()?;
            result.add_metric("unit_races", races.len() as f64);
        }
        
        Ok(())
    }

    /// Analyze maps
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

    /// Analyze campaigns
    fn analyze_campaigns(&self, result: &mut AnalysisResult) -> Result<()> {
        let campaign_count = self.game_data.get_campaign_count()?;
        result.add_metric("total_campaigns", campaign_count as f64);
        
        if self.analysis_config.include_stats {
            let missions = self.game_data.get_campaign_missions()?;
            result.add_metric("total_missions", missions.len() as f64);
        }
        
        Ok(())
    }

    /// Analyze multiplayer
    fn analyze_multiplayer(&self, result: &mut AnalysisResult) -> Result<()> {
        let map_count = self.game_data.get_multiplayer_maps()?.len();
        result.add_metric("multiplayer_maps", map_count as f64);
        
        if self.analysis_config.include_stats {
            let player_counts = self.game_data.get_multiplayer_player_counts()?;
            if !player_counts.is_empty() {
                let max_players = player_counts.iter().max().unwrap_or(&0);
                result.add_metric("max_players", *max_players as f64);
            }
        }
        
        Ok(())
    }

    /// Analyze assets
    fn analyze_assets(&self, result: &mut AnalysisResult) -> Result<()> {
        let asset_count = self.game_data.get_asset_count()?;
        result.add_metric("total_assets", asset_count as f64);
        
        if self.analysis_config.include_stats {
            let asset_types = self.game_data.get_asset_types()?;
            result.add_metric("asset_types", asset_types.len() as f64);
        }
        
        Ok(())
    }

    /// Generate summary
    fn generate_summary(&self, result: &mut AnalysisResult) {
        let mut summary_parts = Vec::new();
        
        if let Some(&unit_count) = result.metrics.get("total_units") {
            summary_parts.push(format!("{} units", unit_count as u32));
        }
        
        if let Some(&map_count) = result.metrics.get("total_maps") {
            summary_parts.push(format!("{} maps", map_count as u32));
        }
        
        if let Some(&campaign_count) = result.metrics.get("total_campaigns") {
            summary_parts.push(format!("{} campaigns", campaign_count as u32));
        }
        
        if let Some(&asset_count) = result.metrics.get("total_assets") {
            summary_parts.push(format!("{} assets", asset_count as u32));
        }
        
        result.summary = summary_parts.join(", ");
    }
}

impl AnalysisConfig {
    /// Create new analysis config
    pub fn new() -> Self {
        Self {
            include_stats: true,
            include_detailed: false,
            output_format: OutputFormat::Json,
        }
    }

    /// Set include stats
    pub fn with_stats(mut self, include_stats: bool) -> Self {
        self.include_stats = include_stats;
        self
    }

    /// Set include detailed
    pub fn with_detailed(mut self, include_detailed: bool) -> Self {
        self.include_detailed = include_detailed;
        self
    }

    /// Set output format
    pub fn with_output_format(mut self, output_format: OutputFormat) -> Self {
        self.output_format = output_format;
        self
    }
}

impl Default for AnalysisConfig {
    fn default() -> Self {
        Self::new()
    }
}

impl AnalysisResult {
    /// Add metric
    pub fn add_metric(&mut self, key: &str, value: f64) {
        self.metrics.insert(key.to_string(), value);
    }

    /// Get metric
    pub fn get_metric(&self, key: &str) -> Option<f64> {
        self.metrics.get(key).copied()
    }

    /// Add detail
    pub fn add_detail(&mut self, detail: String) {
        self.details.push(detail);
    }

    /// Get metrics count
    pub fn metrics_count(&self) -> usize {
        self.metrics.len()
    }

    /// Get details count
    pub fn details_count(&self) -> usize {
        self.details.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_analyzer_new() {
        let temp_dir = tempdir().unwrap();
        let game_data = GameData::new(temp_dir.path()).unwrap();
        let config = AnalysisConfig::new();
        let analyzer = WC3GameAnalyzer::new(game_data, config);
        
        assert!(analyzer.analysis_config.include_stats);
        assert!(!analyzer.analysis_config.include_detailed);
    }

    #[test]
    fn test_analysis_config() {
        let config = AnalysisConfig::new()
            .with_stats(false)
            .with_detailed(true)
            .with_output_format(OutputFormat::Text);
        
        assert!(!config.include_stats);
        assert!(config.include_detailed);
        matches!(config.output_format, OutputFormat::Text);
    }

    #[test]
    fn test_analysis_result() {
        let mut result = AnalysisResult {
            metrics: std::collections::HashMap::new(),
            summary: String::new(),
            details: Vec::new(),
        };
        
        result.add_metric("test", 42.0);
        result.add_detail("test detail".to_string());
        
        assert_eq!(result.get_metric("test"), Some(42.0));
        assert_eq!(result.metrics_count(), 1);
        assert_eq!(result.details_count(), 1);
    }
}
