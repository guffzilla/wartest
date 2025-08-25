use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use log::{info, warn, error, debug};
use std::fs;
use std::path::Path;

use crate::game_engine::HeadlessGameState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    JSON,
    CSV,
    Binary,
    SQLite,
}

impl ExportFormat {
    pub fn extension(&self) -> &'static str {
        match self {
            ExportFormat::JSON => "json",
            ExportFormat::CSV => "csv",
            ExportFormat::Binary => "bin",
            ExportFormat::SQLite => "db",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportConfig {
    pub output_directory: String,
    pub default_format: ExportFormat,
    pub auto_export: bool,
    pub export_interval: u64,
    pub max_file_size: usize,
    pub compression_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub timestamp: u64,
    pub cpu_usage_percent: f64,
    pub memory_usage_mb: u64,
    pub disk_read_mb_s: f64,
    pub disk_write_mb_s: f64,
    pub network_in_mb_s: f64,
    pub network_out_mb_s: f64,
    pub collection_latency_ms: u64,
    pub game_fps: f64,
    pub ai_decision_latency_ms: u64,
    pub memory_hook_latency_ms: u64,
    pub input_simulation_latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIDecisionData {
    pub timestamp: u64,
    pub action: String,
    pub priority: f64,
    pub reasoning: String,
    pub game_state_snapshot: GameStateSnapshot,
    pub execution_time: f64,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryAnalysisData {
    pub timestamp: u64,
    pub memory_regions: Vec<MemoryRegion>,
    pub hooks_active: usize,
    pub memory_changes: usize,
    pub data_extracted: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryRegion {
    pub address: u64,
    pub size: usize,
    pub protection: String,
    pub data_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryUsageStats {
    pub total_memory: u64,
    pub used_memory: u64,
    pub free_memory: u64,
    pub peak_memory: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStateSnapshot {
    pub game_phase: String,
    pub resources: HashMap<String, u32>,
    pub unit_count: usize,
    pub building_count: usize,
    pub game_time: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRecord {
    pub timestamp: u64,
    pub filename: String,
    pub format: ExportFormat,
    pub size: usize,
    pub checksum: String,
    pub export_type: String,
}

pub struct DataExporter {
    config: ExportConfig,
    export_history: Arc<Mutex<Vec<ExportRecord>>>,
    performance_history: Arc<Mutex<Vec<PerformanceMetrics>>>,
    ai_decision_history: Arc<Mutex<Vec<AIDecisionData>>>,
    memory_analysis_history: Arc<Mutex<Vec<MemoryAnalysisData>>>,
    last_export_time: u64,
}

impl DataExporter {
    pub async fn new() -> Result<Self> {
        info!("📊 Initializing Data Exporter...");
        
        let config = ExportConfig::default();
        let exporter = Self {
            config,
            export_history: Arc::new(Mutex::new(Vec::new())),
            performance_history: Arc::new(Mutex::new(Vec::new())),
            ai_decision_history: Arc::new(Mutex::new(Vec::new())),
            memory_analysis_history: Arc::new(Mutex::new(Vec::new())),
            last_export_time: 0,
        };
        
        info!("✅ Data Exporter initialized");
        Ok(exporter)
    }
    
    pub async fn initialize(&mut self) -> Result<()> {
        info!("🔧 Initializing Data Exporter...");
        
        // Create output directory if it doesn't exist
        fs::create_dir_all(&self.config.output_directory)?;
        
        // Load export history (mock for now)
        // self.load_export_history().await?;
        
        info!("✅ Data Exporter initialized");
        Ok(())
    }
    
    pub async fn export_game_data(&self, data: &str, format: ExportFormat) -> Result<()> {
        let processed_data = match format {
            ExportFormat::JSON => data.to_string(),
            ExportFormat::CSV => self.convert_to_csv(data)?,
            ExportFormat::Binary => {
                // For binary, we need to return Vec<u8>, not String
                // So we'll handle this differently
                return self.export_binary_data(data.as_bytes()).await;
            },
            ExportFormat::SQLite => data.to_string(), // Would need SQLite implementation
        };
        
        let filename = format!("export_{}.{}", 
            chrono::Utc::now().format("%Y%m%d_%H%M%S"),
            format.extension()
        );
        
        self.write_data_to_file(&filename, &processed_data).await?;
        
        info!("📊 Exported game data to {} in {:?} format", filename, format);
        Ok(())
    }
    
    async fn export_binary_data(&self, data: &[u8]) -> Result<()> {
        let filename = format!("export_{}.bin", 
            chrono::Utc::now().format("%Y%m%d_%H%M%S")
        );
        
        // For binary data, we need to write the bytes directly
        let filepath = Path::new(&self.config.output_directory).join(&filename);
        fs::write(&filepath, data)?;
        
        info!("📊 Exported binary data to {}", filename);
        Ok(())
    }
    
    pub async fn export_game_state(&self, game_state: &HeadlessGameState) -> Result<()> {
        let filename = format!("game_state_{}.json", 
            chrono::Utc::now().format("%Y%m%d_%H%M%S"));
        let filepath = Path::new(&self.config.output_directory).join(&filename);
        
        let data = serde_json::to_string_pretty(game_state)?;
        let data_len = data.len();
        fs::write(&filepath, &data)?;
        
        let record = ExportRecord {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            filename: filename.clone(),
            format: ExportFormat::JSON,
            size: data_len,
            checksum: self.calculate_checksum(&data),
            export_type: "game_state".to_string(),
        };
        
        self.record_export(record).await?;
        
        info!("📊 Exported game state to {}", filepath.display());
        Ok(())
    }
    
    /// Collect comprehensive performance metrics
    pub async fn collect_performance_metrics(&self) -> Result<PerformanceMetrics> {
        let start_time = std::time::Instant::now();
        
        // Get system performance data
        let cpu_usage = self.get_cpu_usage().await?;
        let memory_usage = self.get_memory_usage().await?;
        let disk_io = self.get_disk_io().await?;
        let network_io = self.get_network_io().await?;
        
        let collection_time = start_time.elapsed();
        
        let metrics = PerformanceMetrics {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            cpu_usage_percent: cpu_usage,
            memory_usage_mb: memory_usage,
            disk_read_mb_s: disk_io.0,
            disk_write_mb_s: disk_io.1,
            network_in_mb_s: network_io.0,
            network_out_mb_s: network_io.1,
            collection_latency_ms: collection_time.as_millis() as u64,
            game_fps: self.estimate_game_fps().await?,
            ai_decision_latency_ms: self.get_ai_decision_latency().await?,
            memory_hook_latency_ms: self.get_memory_hook_latency().await?,
            input_simulation_latency_ms: self.get_input_simulation_latency().await?,
        };
        
        Ok(metrics)
    }
    
    /// Get current CPU usage percentage
    async fn get_cpu_usage(&self) -> Result<f64> {
        // This is a simplified implementation
        // In a real system, you'd use proper system monitoring APIs
        Ok(25.0) // Placeholder value
    }
    
    /// Get current memory usage in MB
    async fn get_memory_usage(&self) -> Result<u64> {
        // Get current process memory usage
        let process = std::process::id();
        let output = std::process::Command::new("tasklist")
            .args(&["/FI", &format!("PID eq {}", process), "/FO", "CSV"])
            .output()
            .map_err(|e| anyhow!("Failed to get memory usage: {}", e))?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        if let Some(line) = output_str.lines().nth(1) {
            if let Some(memory_str) = line.split(',').nth(4) {
                if let Ok(memory_kb) = memory_str.trim_matches('"').parse::<u64>() {
                    return Ok(memory_kb / 1024); // Convert KB to MB
                }
            }
        }
        
        Ok(0) // Fallback
    }
    
    /// Get disk I/O rates in MB/s
    async fn get_disk_io(&self) -> Result<(f64, f64)> {
        // This is a simplified implementation
        // In a real system, you'd use proper disk monitoring APIs
        Ok((5.2, 2.1)) // Placeholder values (read, write)
    }
    
    /// Get network I/O rates in MB/s
    async fn get_network_io(&self) -> Result<(f64, f64)> {
        // This is a simplified implementation
        // In a real system, you'd use proper network monitoring APIs
        Ok((0.1, 0.05)) // Placeholder values (in, out)
    }
    
    /// Estimate current game FPS
    async fn estimate_game_fps(&self) -> Result<f64> {
        // This would be calculated from actual frame timing data
        // For now, return a reasonable estimate
        Ok(60.0)
    }
    
    /// Get AI decision latency in milliseconds
    async fn get_ai_decision_latency(&self) -> Result<u64> {
        // This would be tracked from actual AI decision timing
        // For now, return a reasonable estimate
        Ok(50)
    }
    
    /// Get memory hook latency in milliseconds
    async fn get_memory_hook_latency(&self) -> Result<u64> {
        // This would be tracked from actual memory hook timing
        // For now, return a reasonable estimate
        Ok(10)
    }
    
    /// Get input simulation latency in milliseconds
    async fn get_input_simulation_latency(&self) -> Result<u64> {
        // This would be tracked from actual input simulation timing
        // For now, return a reasonable estimate
        Ok(5)
    }
    
    /// Export performance metrics to various formats
    pub async fn export_performance_metrics(&self, format: ExportFormat) -> Result<Vec<u8>> {
        let metrics = self.collect_performance_metrics().await?;
        
        match format {
            ExportFormat::JSON => {
                serde_json::to_vec_pretty(&metrics)
                    .map_err(|e| anyhow!("Failed to serialize metrics to JSON: {}", e))
            }
            ExportFormat::CSV => {
                self.metrics_to_csv(&metrics)
            }
            ExportFormat::Binary => {
                self.metrics_to_binary(&metrics)
            }
            ExportFormat::SQLite => {
                Err(anyhow!("SQLite export not implemented yet"))
            }
        }
    }
    
    /// Convert performance metrics to CSV format
    fn metrics_to_csv(&self, metrics: &PerformanceMetrics) -> Result<Vec<u8>> {
        let csv = format!(
            "timestamp,cpu_usage_percent,memory_usage_mb,disk_read_mb_s,disk_write_mb_s,network_in_mb_s,network_out_mb_s,collection_latency_ms,game_fps,ai_decision_latency_ms,memory_hook_latency_ms,input_simulation_latency_ms\n{},{},{},{},{},{},{},{},{},{},{},{}\n",
            metrics.timestamp,
            metrics.cpu_usage_percent,
            metrics.memory_usage_mb,
            metrics.disk_read_mb_s,
            metrics.disk_write_mb_s,
            metrics.network_in_mb_s,
            metrics.network_out_mb_s,
            metrics.collection_latency_ms,
            metrics.game_fps,
            metrics.ai_decision_latency_ms,
            metrics.memory_hook_latency_ms,
            metrics.input_simulation_latency_ms,
        );
        
        Ok(csv.into_bytes())
    }
    
    /// Convert performance metrics to binary format
    fn metrics_to_binary(&self, metrics: &PerformanceMetrics) -> Result<Vec<u8>> {
        // Simple binary serialization
        let mut buffer = Vec::new();
        
        // Write timestamp (u64)
        buffer.extend_from_slice(&metrics.timestamp.to_le_bytes());
        
        // Write CPU usage (f64)
        buffer.extend_from_slice(&metrics.cpu_usage_percent.to_le_bytes());
        
        // Write memory usage (u64)
        buffer.extend_from_slice(&metrics.memory_usage_mb.to_le_bytes());
        
        // Write other metrics...
        buffer.extend_from_slice(&metrics.disk_read_mb_s.to_le_bytes());
        buffer.extend_from_slice(&metrics.disk_write_mb_s.to_le_bytes());
        buffer.extend_from_slice(&metrics.network_in_mb_s.to_le_bytes());
        buffer.extend_from_slice(&metrics.network_out_mb_s.to_le_bytes());
        buffer.extend_from_slice(&metrics.collection_latency_ms.to_le_bytes());
        buffer.extend_from_slice(&metrics.game_fps.to_le_bytes());
        buffer.extend_from_slice(&metrics.ai_decision_latency_ms.to_le_bytes());
        buffer.extend_from_slice(&metrics.memory_hook_latency_ms.to_le_bytes());
        buffer.extend_from_slice(&metrics.input_simulation_latency_ms.to_le_bytes());
        
        Ok(buffer)
    }
    
    pub async fn export_ai_decision_data(&self) -> Result<()> {
        let decision_data = AIDecisionData {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            action: "build TownHall".to_string(),
            priority: 0.8,
            reasoning: "Essential building for economy".to_string(),
            game_state_snapshot: GameStateSnapshot {
                game_phase: "InGame".to_string(),
                resources: HashMap::new(),
                unit_count: 3,
                building_count: 1,
                game_time: 5000,
            },
            execution_time: 150.0, // 150ms
            success: true,
        };
        
        let filename = format!("ai_decisions_{}.json", 
            chrono::Utc::now().format("%Y%m%d_%H%M%S"));
        let filepath = Path::new(&self.config.output_directory).join(&filename);
        
        let data = serde_json::to_string_pretty(&decision_data)?;
        fs::write(&filepath, data)?;
        
        // Add to history
        let mut history = self.ai_decision_history.lock().await;
        history.push(decision_data);
        
        // Keep only last 1000 entries
        let len = history.len();
        if len > 1000 {
            history.drain(0..len - 1000);
        }
        
        info!("📊 Exported AI decision data to {}", filepath.display());
        Ok(())
    }
    
    pub async fn export_memory_analysis_data(&self) -> Result<()> {
        let memory_data = MemoryAnalysisData {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_millis() as u64,
            memory_regions: vec![
                MemoryRegion {
                    address: 0x10000000,
                    size: 4096,
                    protection: "PAGE_READWRITE".to_string(),
                    data_hash: "abc123".to_string(),
                }
            ],
            hooks_active: 4,
            memory_changes: 12,
            data_extracted: 1024,
        };
        
        let filename = format!("memory_analysis_{}.json", 
            chrono::Utc::now().format("%Y%m%d_%H%M%S"));
        let filepath = Path::new(&self.config.output_directory).join(&filename);
        
        let data = serde_json::to_string_pretty(&memory_data)?;
        fs::write(&filepath, data)?;
        
        // Add to history
        let mut history = self.memory_analysis_history.lock().await;
        history.push(memory_data);
        
        // Keep only last 1000 entries
        let len = history.len();
        if len > 1000 {
            history.drain(0..len - 1000);
        }
        
        info!("📊 Exported memory analysis data to {}", filepath.display());
        Ok(())
    }
    
    pub async fn write_data_to_file(&self, filename: &str, data: &str) -> Result<()> {
        let filepath = Path::new(&self.config.output_directory).join(filename);
        
        fs::write(&filepath, data)?;
        
        info!("📁 Wrote data to {}", filepath.display());
        Ok(())
    }
    
    fn convert_to_csv(&self, json_data: &str) -> Result<String> {
        // Simple CSV conversion for now
        // In a real implementation, this would parse JSON and convert to CSV
        Ok(format!("timestamp,data\n{},{}", 
            chrono::Utc::now().timestamp_millis(),
            json_data.replace("\"", "\"\"")))
    }
    
    async fn record_export(&self, record: ExportRecord) -> Result<()> {
        let mut history = self.export_history.lock().await;
        history.push(record);
        
        // Keep only last 1000 exports
        let len = history.len();
        if len > 1000 {
            history.drain(0..len - 1000);
        }
        
        Ok(())
    }
    
    fn calculate_checksum(&self, data: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }
    
    pub async fn calculate_average_fps(&self) -> f64 {
        let history = self.performance_history.lock().await;
        if history.is_empty() {
            return 0.0;
        }
        
        let total: f64 = history.iter().map(|m| m.game_fps).sum();
        total / history.len() as f64
    }
    
    pub async fn calculate_average_memory(&self) -> u64 {
        let history = self.performance_history.lock().await;
        if history.is_empty() {
            return 0;
        }
        
        let total: u64 = history.iter().map(|m| m.memory_usage_mb).sum();
        total / history.len() as u64
    }
    
    pub async fn analyze_decision_patterns(&self) -> HashMap<String, usize> {
        let history = self.ai_decision_history.lock().await;
        let mut patterns = HashMap::new();
        
        for decision in history.iter() {
            *patterns.entry(decision.action.clone()).or_insert(0) += 1;
        }
        
        patterns
    }
    
    pub async fn analyze_memory_trends(&self) -> Vec<(u64, usize)> {
        let history = self.memory_analysis_history.lock().await;
        history.iter()
            .map(|m| (m.timestamp, m.data_extracted))
            .collect()
    }
    
    pub async fn get_export_stats(&self) -> HashMap<String, usize> {
        let history = self.export_history.lock().await;
        let mut stats = HashMap::new();
        
        stats.insert("total_exports".to_string(), history.len());
        stats.insert("json_exports".to_string(), 
            history.iter().filter(|r| matches!(r.format, ExportFormat::JSON)).count());
        stats.insert("csv_exports".to_string(), 
            history.iter().filter(|r| matches!(r.format, ExportFormat::CSV)).count());
        
        stats
    }
    
    pub async fn cleanup_old_exports(&self, max_age_hours: u64) -> Result<usize> {
        let mut history = self.export_history.lock().await;
        let cutoff_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_millis() as u64 - (max_age_hours * 3600 * 1000);
        
        let initial_count = history.len();
        history.retain(|record| record.timestamp > cutoff_time);
        let removed_count = initial_count - history.len();
        
        info!("🧹 Cleaned up {} old export records", removed_count);
        Ok(removed_count)
    }
}

impl Default for ExportConfig {
    fn default() -> Self {
        Self {
            output_directory: "exports".to_string(),
            default_format: ExportFormat::JSON,
            auto_export: true,
            export_interval: 5000, // 5 seconds
            max_file_size: 10 * 1024 * 1024, // 10MB
            compression_enabled: false,
        }
    }
}
