//! W3C Rust Integration Library
//! 
//! A sophisticated Rust implementation that duplicates W3Champions' process injection
//! and memory hooking techniques for extracting real-time game data from Warcraft III.

pub mod injection;
pub mod hooking;
pub mod memory;
pub mod data_structures;
pub mod communication;
pub mod stealth;
pub mod utils;

use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, error, warn};

/// Main integration manager that orchestrates all components
pub struct W3CIntegration {
    process_manager: Arc<injection::ProcessManager>,
    hook_manager: Arc<hooking::HookManager>,
    memory_scanner: Arc<memory::MemoryScanner>,
    data_extractor: Arc<data_structures::DataExtractor>,
    communication_manager: Arc<communication::CommunicationManager>,
    stealth_manager: Arc<stealth::StealthManager>,
    is_running: Arc<RwLock<bool>>,
}

impl W3CIntegration {
    /// Create a new W3C integration instance
    pub fn new() -> anyhow::Result<Self> {
        info!("Initializing W3C Rust Integration System");

        let process_manager = Arc::new(injection::ProcessManager::new()?);
        let hook_manager = Arc::new(hooking::HookManager::new()?);
        let memory_scanner = Arc::new(memory::MemoryScanner::new()?);
        let data_extractor = Arc::new(data_structures::DataExtractor::new()?);
        let communication_manager = Arc::new(communication::CommunicationManager::new()?);
        let stealth_manager = Arc::new(stealth::StealthManager::new()?);

        Ok(Self {
            process_manager,
            hook_manager,
            memory_scanner,
            data_extractor,
            communication_manager,
            stealth_manager,
            is_running: Arc::new(RwLock::new(false)),
        })
    }

    /// Start the integration system
    pub async fn start(&self) -> anyhow::Result<()> {
        info!("Starting W3C Integration System");

        // Check for anti-debug and other detection mechanisms
        self.stealth_manager.check_environment()?;

        // Find Warcraft III process
        let process_info = self.process_manager.find_warcraft_process().await?;
        info!("Found Warcraft III process: PID {}", process_info.pid);

        // Inject our DLL into the target process
        let injection_result = self.process_manager.inject_dll(&process_info).await?;
        info!("Successfully injected into process");

        // Set up memory scanning for game data structures
        let memory_regions = self.memory_scanner.scan_game_memory(&process_info).await?;
        info!("Scanned {} memory regions", memory_regions.len());

        // Install hooks for real-time data extraction
        let hook_points = self.hook_manager.install_hooks(&process_info).await?;
        info!("Installed {} hooks", hook_points.len());

        // Start data extraction loop
        self.start_data_extraction_loop().await?;

        // Start communication server
        self.communication_manager.start_server().await?;

        *self.is_running.write().await = true;
        info!("W3C Integration System started successfully");

        Ok(())
    }

    /// Stop the integration system
    pub async fn stop(&self) -> anyhow::Result<()> {
        info!("Stopping W3C Integration System");

        *self.is_running.write().await = false;

        // Remove hooks
        self.hook_manager.remove_hooks().await?;

        // Stop communication
        self.communication_manager.stop_server().await?;

        info!("W3C Integration System stopped");
        Ok(())
    }

    /// Main data extraction loop
    async fn start_data_extraction_loop(&self) -> anyhow::Result<()> {
        let is_running = self.is_running.clone();
        let data_extractor = self.data_extractor.clone();
        let communication_manager = self.communication_manager.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(16)); // ~60 FPS

            while *is_running.read().await {
                interval.tick().await;

                // Extract current game state
                match data_extractor.extract_game_state().await {
                    Ok(game_data) => {
                        // Send data to communication manager
                        if let Err(e) = communication_manager.send_data(game_data).await {
                            error!("Failed to send game data: {}", e);
                        }
                    }
                    Err(e) => {
                        warn!("Failed to extract game data: {}", e);
                    }
                }
            }
        });

        Ok(())
    }

    /// Get current system status
    pub async fn get_status(&self) -> anyhow::Result<IntegrationStatus> {
        Ok(IntegrationStatus {
            is_running: *self.is_running.read().await,
            process_info: self.process_manager.get_process_info().await?,
            hook_count: self.hook_manager.get_hook_count().await,
            memory_regions: self.memory_scanner.get_memory_regions().await?,
            data_extraction_stats: self.data_extractor.get_stats().await?,
            communication_stats: self.communication_manager.get_stats().await?,
        })
    }
}

/// Status information about the integration system
#[derive(Debug, Clone, serde::Serialize)]
pub struct IntegrationStatus {
    pub is_running: bool,
    pub process_info: Option<injection::ProcessInfo>,
    pub hook_count: usize,
    pub memory_regions: Vec<memory::MemoryRegion>,
    pub data_extraction_stats: data_structures::ExtractionStats,
    pub communication_stats: communication::CommunicationStats,
}

/// Configuration for the integration system
#[derive(Debug, Clone, serde::Deserialize)]
pub struct IntegrationConfig {
    pub injection_method: InjectionMethod,
    pub hook_types: Vec<HookType>,
    pub data_extraction_interval_ms: u64,
    pub communication_endpoint: String,
    pub stealth_level: StealthLevel,
    pub log_level: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub enum InjectionMethod {
    CreateRemoteThread,
    SetWindowsHookEx,
    ManualMap,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub enum HookType {
    ApiHook,
    InlineHook,
    VTableHook,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub enum StealthLevel {
    Low,
    Medium,
    High,
    Maximum,
}

impl Default for IntegrationConfig {
    fn default() -> Self {
        Self {
            injection_method: InjectionMethod::CreateRemoteThread,
            hook_types: vec![HookType::ApiHook, HookType::InlineHook],
            data_extraction_interval_ms: 16,
            communication_endpoint: "ws://localhost:8080".to_string(),
            stealth_level: StealthLevel::High,
            log_level: "info".to_string(),
        }
    }
}

/// Error types for the integration system
#[derive(Debug, thiserror::Error)]
pub enum IntegrationError {
    #[error("Process not found: {0}")]
    ProcessNotFound(String),
    
    #[error("Injection failed: {0}")]
    InjectionFailed(String),
    
    #[error("Hook installation failed: {0}")]
    HookInstallationFailed(String),
    
    #[error("Memory access failed: {0}")]
    MemoryAccessFailed(String),
    
    #[error("Communication error: {0}")]
    CommunicationError(String),
    
    #[error("Stealth detection: {0}")]
    StealthDetection(String),
    
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}

/// Initialize the integration system with logging
pub fn init_integration(config: &IntegrationConfig) -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(&config.log_level)
        .init();

    info!("W3C Rust Integration System initialized");
    info!("Configuration: {:?}", config);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_integration_creation() {
        let integration = W3CIntegration::new();
        assert!(integration.is_ok());
    }

    #[tokio::test]
    async fn test_config_default() {
        let config = IntegrationConfig::default();
        assert_eq!(config.data_extraction_interval_ms, 16);
        assert_eq!(config.stealth_level, StealthLevel::High);
    }
}
