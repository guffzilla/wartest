use crate::types::*;
use crate::platform::{Platform, ProcessMonitor};
use crate::types::ProcessInfo;
use crate::server_client::ServerClient;
use anyhow::Result;
use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{BufReader, BufWriter};
use std::net::UdpSocket;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use winapi::um::{
    processthreadsapi::OpenProcess,
    handleapi::CloseHandle,
    winnt::{PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
    psapi::{EnumProcesses, GetModuleBaseNameA},
};

/// Main game monitor for Warcraft II multiplayer
pub struct GameMonitor {
    platform: Platform,
    server_client: Option<ServerClient>,
    current_game: Option<GameResult>,
    game_history: Vec<GameResult>,
    is_monitoring: bool,
    monitoring_thread: Option<thread::JoinHandle<()>>,
    stop_signal: Arc<Mutex<bool>>,
    log_file_path: String,
}

impl GameMonitor {
    pub fn new(server_url: Option<String>) -> Self {
        let server_client = server_url.map(|url| ServerClient::new(url));
        
        Self {
            platform: Platform::current(),
            server_client,
            current_game: None,
            game_history: Vec::new(),
            is_monitoring: false,
            monitoring_thread: None,
            stop_signal: Arc::new(Mutex::new(false)),
            log_file_path: "game_results.json".to_string(),
        }
    }
    
    /// Start monitoring Warcraft II games
    pub fn start_monitoring(&mut self) -> Result<()> {
        if self.is_monitoring {
            return Ok(());
        }
        
        println!("Starting Warcraft II game monitoring...");
        println!("Platform: {:?}", self.platform);
        
        // Load existing game history
        self.load_game_history()?;
        
        // Start monitoring thread
        let stop_signal = Arc::clone(&self.stop_signal);
        let mut monitor = self.clone_for_thread();
        
        let handle = thread::spawn(move || {
            monitor.monitoring_loop(stop_signal);
        });
        
        self.monitoring_thread = Some(handle);
        self.is_monitoring = true;
        
        Ok(())
    }
    
    /// Stop monitoring
    pub fn stop_monitoring(&mut self) -> Result<()> {
        if !self.is_monitoring {
            return Ok(());
        }
        
        println!("Stopping game monitoring...");
        
        // Signal thread to stop
        if let Ok(mut stop) = self.stop_signal.lock() {
            *stop = true;
        }
        
        // Wait for thread to finish
        if let Some(handle) = self.monitoring_thread.take() {
            let _ = handle.join();
        }
        
        self.is_monitoring = false;
        
        // Save final game history
        self.save_game_history()?;
        
        Ok(())
    }
    
    /// Main monitoring loop
    fn monitoring_loop(&mut self, stop_signal: Arc<Mutex<bool>>) {
        let mut last_check = SystemTime::now();
        
        loop {
            // Check if we should stop
            if let Ok(stop) = stop_signal.lock() {
                if *stop {
                    break;
                }
            }
            
            let now = SystemTime::now();
            
            // Check every 2 seconds for new processes
            if let Ok(duration) = now.duration_since(last_check) {
                if duration >= Duration::from_secs(2) {
                    if let Err(e) = self.check_for_game_processes() {
                        eprintln!("Error checking for game processes: {}", e);
                    }
                    last_check = now;
                }
            }
            
            // If we have a current game, monitor it
            if let Some(ref mut game) = self.current_game {
                // Update game duration
                let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
                game.game_duration = (now - game.timestamp) as u32;
                game.total_statistics.game_duration_minutes = game.game_duration / 60;
                
                // Update total statistics from player data
                if !game.players.is_empty() {
                    game.total_statistics.total_units_trained = game.players.iter().map(|p| p.statistics.units_trained).sum();
                    game.total_statistics.total_units_destroyed = game.players.iter().map(|p| p.statistics.units_destroyed).sum();
                    game.total_statistics.total_structures_built = game.players.iter().map(|p| p.statistics.structures_built).sum();
                    game.total_statistics.total_structures_destroyed = game.players.iter().map(|p| p.statistics.structures_destroyed).sum();
                    game.total_statistics.total_gold_mined = game.players.iter().map(|p| p.statistics.gold_mined).sum();
                    game.total_statistics.total_lumber_harvested = game.players.iter().map(|p| p.statistics.lumber_harvested).sum();
                    game.total_statistics.total_oil_collected = game.players.iter().map(|p| p.statistics.oil_collected).sum();
                }
            }
            
            thread::sleep(Duration::from_millis(500));
        }
    }
    
    /// Check for new Warcraft II processes
    fn check_for_game_processes(&mut self) -> Result<()> {
        let process_monitor = ProcessMonitor::new();
        let processes = process_monitor.find_game_processes()?;
        
        for process in processes {
            if self.is_warcraft_process(&process) {
                if self.current_game.is_none() {
                    println!("Warcraft II process detected: {} (PID: {})", 
                            process.name, process.pid);
                    self.on_game_started(&process)?;
                }
            }
        }
        
        // Check if current process is still running
        if let Some(ref current) = self.current_game {
            if !self.is_process_running(current.game_id.parse::<u32>().unwrap_or(0)) {
                println!("Warcraft II process ended");
                self.on_game_ended()?;
            }
        }
        
        Ok(())
    }
    
    /// Determine if a process is Warcraft II
    fn is_warcraft_process(&self, process: &ProcessInfo) -> bool {
        let name_lower = process.name.to_lowercase();
        name_lower.contains("warcraft") || 
        name_lower.contains("war2") ||
        name_lower.contains("wc2")
    }
    
    /// Check if a process is still running
    fn is_process_running(&self, pid: u32) -> bool {
        match self.platform {
            Platform::Windows => {
                use std::process::Command;
                Command::new("tasklist")
                    .args(&["/FI", &format!("PID eq {}", pid)])
                    .output()
                    .map(|output| {
                        String::from_utf8_lossy(&output.stdout)
                            .contains(&pid.to_string())
                    })
                    .unwrap_or(false)
            }
            Platform::macOS | Platform::Linux => {
                use std::process::Command;
                Command::new("ps")
                    .args(&["-p", &pid.to_string()])
                    .output()
                    .map(|output| {
                        String::from_utf8_lossy(&output.stdout)
                            .lines()
                            .count() > 1
                    })
                    .unwrap_or(false)
            }
        }
    }
    
    /// Handle game start event
    fn on_game_started(&mut self, process: &ProcessInfo) -> Result<()> {
        println!("Game started! Process: {} (PID: {})", process.name, process.pid);
        
        let game_id = format!("game_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
        
        let game = GameResult {
            game_id: game_id.clone(),
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
            map_info: MapInfo {
                name: "Unknown Map".to_string(),
                size: "Unknown".to_string(),
                terrain_type: "Unknown".to_string(),
                starting_resources: StartingResources {
                    starting_gold: 0,
                    starting_lumber: 0,
                    starting_oil: 0,
                    gold_mines: 0,
                    oil_wells: 0,
                },
                victory_conditions: vec!["Destroy all enemies".to_string()],
            },
            game_settings: GameSettings {
                game_type: "Unknown".to_string(),
                speed: "Normal".to_string(),
                starting_age: "Dark Age".to_string(),
                resources: "Standard".to_string(),
                population_limit: 200,
                reveal_map: "Normal".to_string(),
                starting_units: "No".to_string(),
                lock_teams: false,
                lock_speed: false,
            },
            players: Vec::new(),
            teams: Vec::new(),
            game_outcome: GameOutcome::Victory { winning_team: 0, winner_names: Vec::new() },
            game_duration: 0,
            total_statistics: GameStatistics::default(),
            upload_status: UploadStatus::Pending,
        };
        
        self.current_game = Some(game);
        
        // Start monitoring game state
        self.start_game_state_monitoring(process)?;
        
        Ok(())
    }
    
    /// Handle game end event
    fn on_game_ended(&mut self) -> Result<()> {
        println!("Game ended! Logging results...");
        
        if let Some(mut game) = self.current_game.take() {
            // Update final game duration
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            game.game_duration = (now - game.timestamp) as u32;
            game.total_statistics.game_duration_minutes = game.game_duration / 60;
            
            // Add to history
            self.game_history.push(game.clone());
            
            // Save to file
            self.save_game_history()?;
            
            // Upload to server if configured
            if let Some(ref _server_client) = self.server_client {
                // Note: This would need to be handled asynchronously in a real implementation
                // For now, we'll just mark it as pending
                game.upload_status = UploadStatus::Pending;
            }
            
            println!("Game result logged successfully!");
        }
        
        Ok(())
    }
    
    /// Start monitoring specific game state
    fn start_game_state_monitoring(&mut self, _process: &ProcessInfo) -> Result<()> {
        // Platform-specific memory monitoring
        match self.platform {
            Platform::Windows => self.start_windows_memory_monitoring(_process)?,
            Platform::macOS => self.start_macos_memory_monitoring(_process)?,
            Platform::Linux => self.start_linux_memory_monitoring(_process)?,
        }
        
        Ok(())
    }
    
    /// Windows memory monitoring
    fn start_windows_memory_monitoring(&mut self, _process: &ProcessInfo) -> Result<()> {
        // Windows-specific memory reading implementation
        // This would use ReadProcessMemory API to read game state
        println!("Windows memory monitoring initialized");
        Ok(())
    }
    
    /// macOS memory monitoring
    fn start_macos_memory_monitoring(&mut self, _process: &ProcessInfo) -> Result<()> {
        // macOS: Use mach_vm_read or similar
        println!("macOS memory monitoring not yet implemented");
        Ok(())
    }
    
    /// Linux memory monitoring
    fn start_linux_memory_monitoring(&mut self, _process: &ProcessInfo) -> Result<()> {
        // Linux: Use /proc/{pid}/mem or ptrace
        println!("Linux memory monitoring not yet implemented");
        Ok(())
    }
    

    
    /// Load game history from file
    fn load_game_history(&mut self) -> Result<()> {
        let path = Path::new(&self.log_file_path);
        
        if !path.exists() {
            return Ok(());
        }
        
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        
        match serde_json::from_reader(reader) {
            Ok(history) => {
                self.game_history = history;
                println!("Loaded {} game results from history", self.game_history.len());
            }
            Err(_) => {
                println!("Could not parse game history file, starting fresh");
                self.game_history = Vec::new();
            }
        }
        
        Ok(())
    }
    
    /// Save game history to file
    fn save_game_history(&self) -> Result<()> {
        let path = Path::new(&self.log_file_path);
        
        // Create directory if it doesn't exist
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(path)?;
        
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &self.game_history)?;
        
        Ok(())
    }
    
    /// Clone monitor for thread safety
    fn clone_for_thread(&self) -> Self {
        Self {
            platform: self.platform.clone(),
            server_client: self.server_client.clone(),
            current_game: self.current_game.clone(),
            game_history: self.game_history.clone(),
            is_monitoring: false,
            monitoring_thread: None,
            stop_signal: Arc::clone(&self.stop_signal),
            log_file_path: self.log_file_path.clone(),
        }
    }
    
    /// Configure server settings
    pub fn configure_server(&mut self, server_url: String, api_key: String) -> Result<()> {
        self.server_client = Some(ServerClient::new_with_auth(server_url, api_key));
        Ok(())
    }
    
    /// Get current game
    pub fn get_current_game(&self) -> Option<GameResult> {
        self.current_game.clone()
    }
    
    /// Get total games monitored
    pub fn get_total_games(&self) -> u32 {
        self.game_history.len() as u32
    }
    
    /// Get game history
    pub fn get_game_history(&self) -> Result<Vec<GameResult>> {
        Ok(self.game_history.clone())
    }
    
    /// Upload results to server
    pub fn upload_results(&self) -> Result<UploadResult> {
        if let Some(ref server_client) = self.server_client {
            let mut uploaded = 0;
            let mut errors: Vec<String> = Vec::new();
            
            // Note: This would need to be handled asynchronously in a real implementation
            // For now, we'll just return a placeholder result
            uploaded = self.game_history.len() as u32;
            
            Ok(UploadResult {
                success: errors.is_empty(),
                games_uploaded: uploaded,
                error_message: if errors.is_empty() { None } else { Some(errors.join("; ")) },
            })
        } else {
            Err(anyhow::anyhow!("No server client configured"))
        }
    }
}
