use anyhow::Result;
use log::{info, warn, error};
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Write, BufWriter};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde_json::{Value, json};
use chrono::{DateTime, Utc};
use crate::game_engine::{HeadlessGameState, GamePhase, GameStatus};

/// Data export formats
#[derive(Debug, Clone)]
pub enum ExportFormat {
    /// JSON format
    JSON,
    /// CSV format
    CSV,
    /// Binary format (bincode)
    Binary,
    /// SQLite database
    SQLite,
}

/// Data export configuration
#[derive(Debug, Clone)]
pub struct ExportConfig {
    /// Export format
    pub format: ExportFormat,
    /// Export directory
    pub export_dir: String,
    /// Export interval (seconds)
    pub export_interval: u64,
    /// Include game state data
    pub include_game_state: bool,
    /// Include performance metrics
    pub include_performance: bool,
    /// Include AI decision data
    pub include_ai_data: bool,
    /// Include memory analysis data
    pub include_memory_data: bool,
    /// Compress exported files
    pub compress_files: bool,
}

/// Performance metrics
#[derive(Debug, Clone, serde::Serialize)]
pub struct PerformanceMetrics {
    /// Frame rate
    pub fps: f32,
    /// Memory usage (MB)
    pub memory_usage: f32,
    /// CPU usage percentage
    pub cpu_usage: f32,
    /// Network latency (ms)
    pub network_latency: u32,
    /// Game loop time (ms)
    pub game_loop_time: u32,
    /// AI decision time (ms)
    pub ai_decision_time: u32,
    /// Export time (ms)
    pub export_time: u32,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
}

/// AI decision data
#[derive(Debug, Clone, serde::Serialize)]
pub struct AIDecisionData {
    /// Decision timestamp
    pub timestamp: DateTime<Utc>,
    /// Game state when decision was made
    pub game_state: HeadlessGameState,
    /// Actions generated
    pub actions: Vec<String>,
    /// Decision reasoning
    pub reasoning: String,
    /// Performance metrics
    pub performance: PerformanceMetrics,
}

/// Memory analysis data
#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryAnalysisData {
    /// Analysis timestamp
    pub timestamp: DateTime<Utc>,
    /// Memory regions analyzed
    pub memory_regions: Vec<MemoryRegion>,
    /// Key variables found
    pub key_variables: HashMap<String, Value>,
    /// Memory patterns detected
    pub patterns: Vec<String>,
    /// Memory usage statistics
    pub usage_stats: MemoryUsageStats,
}

/// Memory region information
#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryRegion {
    /// Region address
    pub address: u64,
    /// Region size
    pub size: usize,
    /// Region type
    pub region_type: String,
    /// Protection flags
    pub protection: String,
    /// Is readable
    pub readable: bool,
    /// Is writable
    pub writable: bool,
    /// Is executable
    pub executable: bool,
}

/// Memory usage statistics
#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryUsageStats {
    /// Total memory allocated
    pub total_allocated: u64,
    /// Memory used by game
    pub game_memory: u64,
    /// Memory used by AI system
    pub ai_memory: u64,
    /// Memory used by export system
    pub export_memory: u64,
    /// Peak memory usage
    pub peak_memory: u64,
}

/// Data exporter for WC2 Remastered
pub struct DataExporter {
    /// Export configuration
    config: ExportConfig,
    /// Export history
    export_history: Arc<Mutex<Vec<ExportRecord>>>,
    /// Performance metrics history
    performance_history: Arc<Mutex<Vec<PerformanceMetrics>>>,
    /// AI decision history
    ai_decision_history: Arc<Mutex<Vec<AIDecisionData>>>,
    /// Memory analysis history
    memory_analysis_history: Arc<Mutex<Vec<MemoryAnalysisData>>>,
    /// Last export time
    last_export_time: u64,
}

/// Export record
#[derive(Debug, Clone)]
pub struct ExportRecord {
    /// Export timestamp
    pub timestamp: DateTime<Utc>,
    /// Export format
    pub format: ExportFormat,
    /// File path
    pub file_path: String,
    /// File size (bytes)
    pub file_size: u64,
    /// Export duration (ms)
    pub duration: u64,
    /// Success status
    pub success: bool,
    /// Error message if failed
    pub error_message: Option<String>,
}

impl DataExporter {
    /// Create a new data exporter
    pub fn new(config: ExportConfig) -> Self {
        Self {
            config,
            export_history: Arc::new(Mutex::new(Vec::new())),
            performance_history: Arc::new(Mutex::new(Vec::new())),
            ai_decision_history: Arc::new(Mutex::new(Vec::new())),
            memory_analysis_history: Arc::new(Mutex::new(Vec::new())),
            last_export_time: 0,
        }
    }
    
    /// Initialize the data exporter
    pub async fn initialize(&mut self) -> Result<()> {
        info!("📊 Initializing data exporter...");
        
        // Create export directory if it doesn't exist
        fs::create_dir_all(&self.config.export_dir)?;
        
        // Create subdirectories for different data types
        let subdirs = vec!["game_state", "performance", "ai_decisions", "memory_analysis"];
        for subdir in subdirs {
            fs::create_dir_all(format!("{}/{}", self.config.export_dir, subdir))?;
        }
        
        info!("✅ Data exporter initialized successfully");
        Ok(())
    }
    
    /// Export game data
    pub async fn export_game_data(&mut self, game_state: &HeadlessGameState) -> Result<()> {
        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        // Check if it's time to export
        if current_time - self.last_export_time < self.config.export_interval {
            return Ok(());
        }
        
        self.last_export_time = current_time;
        
        info!("📤 Exporting game data...");
        
        let start_time = std::time::Instant::now();
        
        // Export based on configuration
        if self.config.include_game_state {
            self.export_game_state(game_state).await?;
        }
        
        if self.config.include_performance {
            self.export_performance_metrics().await?;
        }
        
        if self.config.include_ai_data {
            self.export_ai_decision_data(game_state).await?;
        }
        
        if self.config.include_memory_data {
            self.export_memory_analysis_data().await?;
        }
        
        let duration = start_time.elapsed().as_millis() as u64;
        
        // Record export
        self.record_export(duration, true, None).await?;
        
        info!("✅ Game data exported successfully in {}ms", duration);
        Ok(())
    }
    
    /// Export game state data
    async fn export_game_state(&self, game_state: &HeadlessGameState) -> Result<()> {
        let timestamp = Utc::now();
        let filename = format!("game_state_{}.json", timestamp.format("%Y%m%d_%H%M%S"));
        let filepath = format!("{}/game_state/{}", self.config.export_dir, filename);
        
        let data = json!({
            "timestamp": timestamp,
            "game_state": game_state,
            "export_config": self.config
        });
        
        self.write_data_to_file(&filepath, &data, ExportFormat::JSON).await?;
        
        info!("📁 Game state exported to: {}", filepath);
        Ok(())
    }
    
    /// Export performance metrics
    async fn export_performance_metrics(&self) -> Result<()> {
        let timestamp = Utc::now();
        let filename = format!("performance_{}.json", timestamp.format("%Y%m%d_%H%M%S"));
        let filepath = format!("{}/performance/{}", self.config.export_dir, filename);
        
        // Generate mock performance metrics for now
        let metrics = PerformanceMetrics {
            fps: 60.0,
            memory_usage: 512.5,
            cpu_usage: 25.3,
            network_latency: 45,
            game_loop_time: 16,
            ai_decision_time: 5,
            export_time: 2,
            timestamp,
        };
        
        // Add to history
        self.performance_history.lock().await.push(metrics.clone());
        
        let data = json!({
            "timestamp": timestamp,
            "performance_metrics": metrics,
            "history_summary": {
                "total_records": self.performance_history.lock().await.len(),
                "average_fps": self.calculate_average_fps().await,
                "average_memory": self.calculate_average_memory().await,
            }
        });
        
        self.write_data_to_file(&filepath, &data, ExportFormat::JSON).await?;
        
        info!("📊 Performance metrics exported to: {}", filepath);
        Ok(())
    }
    
    /// Export AI decision data
    async fn export_ai_decision_data(&self, game_state: &HeadlessGameState) -> Result<()> {
        let timestamp = Utc::now();
        let filename = format!("ai_decisions_{}.json", timestamp.format("%Y%m%d_%H%M%S"));
        let filepath = format!("{}/ai_decisions/{}", self.config.export_dir, filename);
        
        // Generate mock AI decision data for now
        let ai_data = AIDecisionData {
            timestamp,
            game_state: game_state.clone(),
            actions: vec![
                "Build Town Hall".to_string(),
                "Train Footman".to_string(),
                "Move unit to position (400, 300)".to_string(),
            ],
            reasoning: "Economic focus: Building infrastructure and training defensive units".to_string(),
            performance: PerformanceMetrics {
                fps: 60.0,
                memory_usage: 512.5,
                cpu_usage: 25.3,
                network_latency: 45,
                game_loop_time: 16,
                ai_decision_time: 5,
                export_time: 2,
                timestamp,
            },
        };
        
        // Add to history
        self.ai_decision_history.lock().await.push(ai_data.clone());
        
        let data = json!({
            "timestamp": timestamp,
            "ai_decision_data": ai_data,
            "history_summary": {
                "total_decisions": self.ai_decision_history.lock().await.len(),
                "decision_patterns": self.analyze_decision_patterns().await,
            }
        });
        
        self.write_data_to_file(&filepath, &data, ExportFormat::JSON).await?;
        
        info!("🤖 AI decision data exported to: {}", filepath);
        Ok(())
    }
    
    /// Export memory analysis data
    async fn export_memory_analysis_data(&self) -> Result<()> {
        let timestamp = Utc::now();
        let filename = format!("memory_analysis_{}.json", timestamp.format("%Y%m%d_%H%M%S"));
        let filepath = format!("{}/memory_analysis/{}", self.config.export_dir, filename);
        
        // Generate mock memory analysis data for now
        let memory_data = MemoryAnalysisData {
            timestamp,
            memory_regions: vec![
                MemoryRegion {
                    address: 0x10000000,
                    size: 4096,
                    region_type: "Game State".to_string(),
                    protection: "RW".to_string(),
                    readable: true,
                    writable: true,
                    executable: false,
                },
                MemoryRegion {
                    address: 0x10001000,
                    size: 8192,
                    region_type: "Unit Data".to_string(),
                    protection: "RW".to_string(),
                    readable: true,
                    writable: true,
                    executable: false,
                },
            ],
            key_variables: HashMap::from([
                ("game_state".to_string(), json!("in_game")),
                ("player_resources".to_string(), json!({"gold": 150, "wood": 75, "oil": 25})),
                ("unit_count".to_string(), json!(8)),
            ]),
            patterns: vec![
                "Resource pattern detected at 0x10000010".to_string(),
                "Unit movement pattern at 0x10001000".to_string(),
            ],
            usage_stats: MemoryUsageStats {
                total_allocated: 1024 * 1024 * 512, // 512 MB
                game_memory: 1024 * 1024 * 256,     // 256 MB
                ai_memory: 1024 * 1024 * 64,        // 64 MB
                export_memory: 1024 * 1024 * 32,    // 32 MB
                peak_memory: 1024 * 1024 * 600,     // 600 MB
            },
        };
        
        // Add to history
        self.memory_analysis_history.lock().await.push(memory_data.clone());
        
        let data = json!({
            "timestamp": timestamp,
            "memory_analysis_data": memory_data,
            "history_summary": {
                "total_analyses": self.memory_analysis_history.lock().await.len(),
                "memory_trends": self.analyze_memory_trends().await,
            }
        });
        
        self.write_data_to_file(&filepath, &data, ExportFormat::JSON).await?;
        
        info!("🧠 Memory analysis data exported to: {}", filepath);
        Ok(())
    }
    
    /// Write data to file based on format
    async fn write_data_to_file(&self, filepath: &str, data: &Value, format: ExportFormat) -> Result<()> {
        match format {
            ExportFormat::JSON => {
                let file = OpenOptions::new()
                    .write(true)
                    .create(true)
                    .truncate(true)
                    .open(filepath)?;
                
                let mut writer = BufWriter::new(file);
                serde_json::to_writer_pretty(&mut writer, data)?;
                writer.flush()?;
            }
            ExportFormat::CSV => {
                // Convert to CSV format
                let csv_data = self.convert_to_csv(data).await?;
                fs::write(filepath, csv_data)?;
            }
            ExportFormat::Binary => {
                let file = OpenOptions::new()
                    .write(true)
                    .create(true)
                    .truncate(true)
                    .open(filepath)?;
                
                let encoded = bincode::serialize(data)?;
                file.write_all(&encoded)?;
            }
            ExportFormat::SQLite => {
                // This would require a SQLite implementation
                warn!("SQLite export not yet implemented");
            }
        }
        
        Ok(())
    }
    
    /// Convert data to CSV format
    async fn convert_to_csv(&self, data: &Value) -> Result<String> {
        // Simple CSV conversion for basic data structures
        let mut csv_lines = Vec::new();
        
        if let Value::Object(map) = data {
            // Header
            let headers: Vec<String> = map.keys().cloned().collect();
            csv_lines.push(headers.join(","));
            
            // Values (simplified - would need more sophisticated handling for nested structures)
            let values: Vec<String> = map.values().map(|v| format!("{:?}", v)).collect();
            csv_lines.push(values.join(","));
        }
        
        Ok(csv_lines.join("\n"))
    }
    
    /// Record export operation
    async fn record_export(&self, duration: u64, success: bool, error_message: Option<String>) -> Result<()> {
        let record = ExportRecord {
            timestamp: Utc::now(),
            format: self.config.format.clone(),
            file_path: self.config.export_dir.clone(),
            file_size: 0, // Would calculate actual file size
            duration,
            success,
            error_message,
        };
        
        self.export_history.lock().await.push(record);
        
        Ok(())
    }
    
    /// Calculate average FPS from history
    async fn calculate_average_fps(&self) -> f32 {
        let history = self.performance_history.lock().await;
        if history.is_empty() {
            return 0.0;
        }
        
        let total: f32 = history.iter().map(|m| m.fps).sum();
        total / history.len() as f32
    }
    
    /// Calculate average memory usage from history
    async fn calculate_average_memory(&self) -> f32 {
        let history = self.performance_history.lock().await;
        if history.is_empty() {
            return 0.0;
        }
        
        let total: f32 = history.iter().map(|m| m.memory_usage).sum();
        total / history.len() as f32
    }
    
    /// Analyze decision patterns
    async fn analyze_decision_patterns(&self) -> Value {
        let history = self.ai_decision_history.lock().await;
        
        // Simple pattern analysis
        let mut action_counts = HashMap::new();
        for decision in history.iter() {
            for action in &decision.actions {
                *action_counts.entry(action.clone()).or_insert(0) += 1;
            }
        }
        
        json!({
            "total_decisions": history.len(),
            "action_frequency": action_counts,
            "common_patterns": ["Economic focus", "Defensive building", "Unit training"]
        })
    }
    
    /// Analyze memory trends
    async fn analyze_memory_trends(&self) -> Value {
        let history = self.memory_analysis_history.lock().await;
        
        if history.is_empty() {
            return json!({"error": "No memory analysis data available"});
        }
        
        let latest = &history[history.len() - 1];
        
        json!({
            "total_analyses": history.len(),
            "latest_memory_usage": latest.usage_stats.total_allocated,
            "memory_growth_rate": "Stable",
            "peak_memory_usage": latest.usage_stats.peak_memory
        })
    }
    
    /// Get export statistics
    pub async fn get_export_stats(&self) -> Value {
        let export_history = self.export_history.lock().await;
        let performance_history = self.performance_history.lock().await;
        let ai_history = self.ai_decision_history.lock().await;
        let memory_history = self.memory_analysis_history.lock().await;
        
        json!({
            "export_summary": {
                "total_exports": export_history.len(),
                "successful_exports": export_history.iter().filter(|r| r.success).count(),
                "failed_exports": export_history.iter().filter(|r| !r.success).count(),
                "last_export": export_history.last().map(|r| r.timestamp),
            },
            "data_summary": {
                "performance_records": performance_history.len(),
                "ai_decisions": ai_history.len(),
                "memory_analyses": memory_history.len(),
            },
            "export_config": {
                "format": format!("{:?}", self.config.format),
                "directory": self.config.export_dir,
                "interval": self.config.export_interval,
            }
        })
    }
    
    /// Clean up old export files
    pub async fn cleanup_old_exports(&self, max_age_days: u32) -> Result<()> {
        info!("🧹 Cleaning up exports older than {} days...", max_age_days);
        
        let cutoff_time = Utc::now() - chrono::Duration::days(max_age_days as i64);
        let mut cleaned_count = 0;
        
        // Clean up export history
        let mut export_history = self.export_history.lock().await;
        export_history.retain(|record| {
            if record.timestamp < cutoff_time {
                cleaned_count += 1;
                false
            } else {
                true
            }
        });
        
        info!("✅ Cleaned up {} old export records", cleaned_count);
        Ok(())
    }
}

impl Default for DataExporter {
    fn default() -> Self {
        Self::new(ExportConfig {
            format: ExportFormat::JSON,
            export_dir: "exports".to_string(),
            export_interval: 60, // 1 minute
            include_game_state: true,
            include_performance: true,
            include_ai_data: true,
            include_memory_data: true,
            compress_files: false,
        })
    }
}
