use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{BufReader, BufWriter, Seek, SeekFrom};
use std::net::{TcpStream, UdpSocket};
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use windows::Win32::{
    Foundation::HANDLE,
    System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
    System::ProcessStatus::{EnumProcesses, GetModuleBaseNameA},
};

/// Game result data for website display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameResult {
    pub game_id: String,
    pub timestamp: u64,
    pub map_info: MapInfo,
    pub game_settings: GameSettings,
    pub players: Vec<PlayerResult>,
    pub teams: Vec<TeamResult>,
    pub game_outcome: GameOutcome,
    pub game_duration: u32, // in seconds
    pub total_statistics: GameStatistics,
}

/// Map information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapInfo {
    pub name: String,
    pub size: String, // e.g., "128x128", "256x256"
    pub terrain_type: String, // e.g., "Forest", "Swamp", "Winter"
    pub starting_resources: StartingResources,
    pub victory_conditions: Vec<String>,
}

/// Starting resources for the map
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartingResources {
    pub starting_gold: u32,
    pub starting_lumber: u32,
    pub starting_oil: u32,
    pub gold_mines: u32,
    pub oil_wells: u32,
}

/// Game settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSettings {
    pub game_type: String, // "1v1", "2v2", "3v3", "4v4", "FFA"
    pub speed: String, // "Slow", "Normal", "Fast"
    pub starting_age: String, // "Dark Age", "Feudal Age", etc.
    pub resources: String, // "Standard", "High", "Low"
    pub population_limit: u32,
    pub reveal_map: String, // "Normal", "Explored", "All Visible"
    pub starting_units: String, // "Yes", "No"
    pub lock_teams: bool,
    pub lock_speed: bool,
}

/// Player result data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerResult {
    pub name: String,
    pub faction: Faction,
    pub team: u8,
    pub rank: String,
    pub is_host: bool,
    pub final_score: u32,
    pub rank_score: u32, // Score used for ranking calculations
    pub statistics: PlayerStatistics,
    pub outcome: PlayerOutcome,
}

/// Player statistics for ranking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerStatistics {
    pub units_trained: u32,
    pub units_destroyed: u32,
    pub structures_built: u32,
    pub structures_destroyed: u32,
    pub gold_mined: u32,
    pub lumber_harvested: u32,
    pub oil_collected: u32,
    pub units_lost: u32,
    pub structures_lost: u32,
    pub military_score: u32,
    pub economy_score: u32,
    pub technology_score: u32,
}

/// Player outcome
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlayerOutcome {
    Victory,
    Defeat,
    Draw,
    Disconnect,
}

/// Team result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamResult {
    pub team_id: u8,
    pub players: Vec<String>, // Player names
    pub faction: Faction,
    pub total_score: u32,
    pub outcome: TeamOutcome,
    pub team_statistics: TeamStatistics,
}

/// Team outcome
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TeamOutcome {
    Victory,
    Defeat,
    Draw,
}

/// Team statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamStatistics {
    pub total_units_destroyed: u32,
    pub total_structures_destroyed: u32,
    pub total_gold_mined: u32,
    pub total_lumber_harvested: u32,
    pub total_oil_collected: u32,
}

/// Game outcome
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameOutcome {
    Victory { winning_team: u8, winner_names: Vec<String> },
    Defeat { losing_team: u8, loser_names: Vec<String> },
    Draw { teams: Vec<u8> },
    Disconnect { disconnected_players: Vec<String> },
}

/// Game statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStatistics {
    pub total_units_trained: u32,
    pub total_units_destroyed: u32,
    pub total_structures_built: u32,
    pub total_structures_destroyed: u32,
    pub total_gold_mined: u32,
    pub total_lumber_harvested: u32,
    pub total_oil_collected: u32,
    pub game_duration_minutes: u32,
}

/// Faction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Faction {
    Human,
    Orc,
    Neutral,
}

/// Game Result Monitor for Warcraft II Remastered
pub struct GameResultMonitor {
    game_process_id: Option<u32>,
    log_file_path: String,
    current_game: Option<GameResult>,
    network_monitor: NetworkMonitor,
    memory_addresses: HashMap<String, usize>,
}

/// Network traffic monitor
pub struct NetworkMonitor {
    udp_socket: Option<UdpSocket>,
    packet_log: Vec<NetworkPacket>,
}

/// Network packet
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkPacket {
    pub timestamp: u64,
    pub source: String,
    pub destination: String,
    pub protocol: String,
    pub data: Vec<u8>,
    pub size: usize,
}

impl GameResultMonitor {
    pub fn new(log_file_path: String) -> Self {
        Self {
            game_process_id: None,
            log_file_path,
            current_game: None,
            network_monitor: NetworkMonitor {
                udp_socket: None,
                packet_log: Vec::new(),
            },
            memory_addresses: HashMap::new(),
        }
    }

    /// Start monitoring for game results
    pub fn start_monitoring(&mut self) -> Result<()> {
        println!("Starting game result monitoring...");
        println!("Results will be logged to: {}", self.log_file_path);
        
        // Find Warcraft II process
        self.find_game_process()?;
        
        // Initialize memory monitoring
        self.initialize_memory_monitoring()?;
        
        // Start network monitoring
        self.start_network_monitoring()?;
        
        // Start monitoring loop
        self.monitoring_loop()?;
        
        Ok(())
    }

    /// Find Warcraft II Remastered process
    fn find_game_process(&mut self) -> Result<()> {
        println!("Searching for Warcraft II Remastered process...");
        
        let mut process_ids = vec![0u32; 1024];
        let mut bytes_returned = 0u32;
        
        unsafe {
            if EnumProcesses(
                process_ids.as_mut_ptr(),
                (process_ids.len() * std::mem::size_of::<u32>()) as u32,
                &mut bytes_returned,
            ) == 0 {
                anyhow::bail!("Failed to enumerate processes");
            }
        }
        
        let process_count = (bytes_returned / std::mem::size_of::<u32>() as u32) as usize;
        
        for &process_id in &process_ids[..process_count] {
            if let Ok(process_name) = self.get_process_name(process_id) {
                if process_name.to_lowercase().contains("warcraft") {
                    println!("Found Warcraft process: {} (PID: {})", process_name, process_id);
                    self.game_process_id = Some(process_id);
                    return Ok(());
                }
            }
        }
        
        anyhow::bail!("Warcraft II Remastered process not found");
    }

    /// Get process name by PID
    fn get_process_name(&self, process_id: u32) -> Result<String> {
        unsafe {
            let process_handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, process_id);
            if process_handle.is_null() {
                return Err(anyhow::anyhow!("Failed to open process"));
            }
            
            let mut module_name = [0i8; 256];
            let mut size = 0u32;
            
            if GetModuleBaseNameA(
                process_handle,
                std::ptr::null_mut(),
                module_name.as_mut_ptr(),
                module_name.len() as u32,
            ) > 0 {
                let name = String::from_utf8_lossy(&module_name.iter().map(|&b| b as u8).collect::<Vec<_>>())
                    .trim_matches('\0')
                    .to_string();
                CloseHandle(process_handle);
                return Ok(name);
            }
            
            CloseHandle(process_handle);
        }
        
        Err(anyhow::anyhow!("Failed to get process name"))
    }

    /// Initialize memory monitoring for game state
    fn initialize_memory_monitoring(&mut self) -> Result<()> {
        println!("Initializing memory monitoring for game results...");
        
        // Memory addresses for game result data (to be discovered)
        self.memory_addresses.insert("game_state".to_string(), 0x00400000);
        self.memory_addresses.insert("player_count".to_string(), 0x00400004);
        self.memory_addresses.insert("map_info".to_string(), 0x00400008);
        self.memory_addresses.insert("game_settings".to_string(), 0x0040000C);
        self.memory_addresses.insert("victory_condition".to_string(), 0x00400010);
        self.memory_addresses.insert("game_time".to_string(), 0x00400014);
        
        Ok(())
    }

    /// Start network traffic monitoring
    fn start_network_monitoring(&mut self) -> Result<()> {
        println!("Starting network monitoring for game results...");
        
        // Monitor Battle.net ports for game result packets
        let battle_net_ports = vec![6112, 6113, 6114, 6115, 6116, 6117, 6118, 6119];
        
        for port in battle_net_ports {
            if let Ok(socket) = UdpSocket::bind(format!("0.0.0.0:{}", port)) {
                println!("Monitoring UDP port: {} for game results", port);
                self.network_monitor.udp_socket = Some(socket);
                break;
            }
        }
        
        Ok(())
    }

    /// Main monitoring loop
    fn monitoring_loop(&mut self) -> Result<()> {
        println!("Starting game result monitoring loop...");
        
        let mut last_check = SystemTime::now();
        
        loop {
            let now = SystemTime::now();
            
            // Check every 500ms for game state changes
            if let Ok(duration) = now.duration_since(last_check) {
                if duration >= Duration::from_millis(500) {
                    self.check_game_state()?;
                    self.check_network_traffic()?;
                    self.check_memory_state()?;
                    
                    last_check = now;
                }
            }
            
            // Check if game has ended and we need to log results
            if let Some(ref game) = self.current_game {
                if self.is_game_finished(game) {
                    self.log_game_result(game)?;
                    self.current_game = None;
                    println!("Game result logged, waiting for next game...");
                }
            }
            
            std::thread::sleep(Duration::from_millis(100));
        }
    }

    /// Check current game state
    fn check_game_state(&mut self) -> Result<()> {
        // Detect when a new game starts
        if self.current_game.is_none() {
            if self.is_game_starting() {
                self.current_game = Some(self.create_new_game()?);
                println!("New game detected, starting monitoring...");
            }
        }
        
        Ok(())
    }

    /// Check if a new game is starting
    fn is_game_starting(&self) -> bool {
        // This would check memory or network for game start indicators
        // For now, we'll simulate detection
        false
    }

    /// Create a new game instance
    fn create_new_game(&self) -> Result<GameResult> {
        let game_id = format!("game_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
        
        Ok(GameResult {
            game_id,
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
            total_statistics: GameStatistics {
                total_units_trained: 0,
                total_units_destroyed: 0,
                total_structures_built: 0,
                total_structures_destroyed: 0,
                total_gold_mined: 0,
                total_lumber_harvested: 0,
                total_oil_collected: 0,
                game_duration_minutes: 0,
            },
        })
    }

    /// Check if game is finished
    fn is_game_finished(&self, game: &GameResult) -> bool {
        // Check for victory/defeat conditions
        // This would read from memory or network packets
        false
    }

    /// Check network traffic for game data
    fn check_network_traffic(&mut self) -> Result<()> {
        if let Some(ref socket) = self.network_monitor.udp_socket {
            let mut buffer = [0u8; 1024];
            
            match socket.recv_from(&mut buffer) {
                Ok((size, addr)) => {
                    let packet = NetworkPacket {
                        timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs(),
                        source: addr.ip().to_string(),
                        destination: "local".to_string(),
                        protocol: "UDP".to_string(),
                        data: buffer[..size].to_vec(),
                        size,
                    };
                    
                    self.analyze_network_packet(&packet)?;
                    self.network_monitor.packet_log.push(packet);
                }
                Err(_) => {
                    // No data available, continue
                }
            }
        }
        
        Ok(())
    }

    /// Analyze network packet for game data
    fn analyze_network_packet(&mut self, packet: &NetworkPacket) -> Result<()> {
        // Look for Battle.net game result packets
        if packet.data.len() >= 4 {
            if packet.data[0] == 0xFF && packet.data[1] == 0xFF {
                if packet.data.len() >= 3 {
                    match packet.data[2] {
                        0x05 => {
                            println!("Game result packet detected!");
                            self.parse_game_result_packet(&packet.data)?;
                        }
                        0x04 => {
                            println!("Player list update packet detected!");
                            self.parse_player_list_packet(&packet.data)?;
                        }
                        _ => {
                            // Other packet types
                        }
                    }
                }
            }
        }
        
        Ok(())
    }

    /// Parse game result packet
    fn parse_game_result_packet(&mut self, data: &[u8]) -> Result<()> {
        if let Some(ref mut game) = self.current_game {
            if data.len() >= 4 {
                let result_type = data[3];
                match result_type {
                    0x01 => {
                        // Victory
                        game.game_outcome = GameOutcome::Victory {
                            winning_team: 1, // This would be extracted from packet
                            winner_names: vec!["Player1".to_string()], // This would be extracted
                        };
                    }
                    0x02 => {
                        // Defeat
                        game.game_outcome = GameOutcome::Defeat {
                            losing_team: 1,
                            loser_names: vec!["Player1".to_string()],
                        };
                    }
                    0x03 => {
                        // Draw
                        game.game_outcome = GameOutcome::Draw { teams: vec![1, 2] };
                    }
                    0x04 => {
                        // Disconnect
                        game.game_outcome = GameOutcome::Disconnect {
                            disconnected_players: vec!["Player1".to_string()],
                        };
                    }
                    _ => {
                        println!("Unknown game result type: 0x{:02X}", result_type);
                    }
                }
            }
        }
        
        Ok(())
    }

    /// Parse player list packet
    fn parse_player_list_packet(&mut self, data: &[u8]) -> Result<()> {
        if let Some(ref mut game) = self.current_game {
            if data.len() >= 4 {
                let player_count = data[3] as u32;
                println!("Player count: {}", player_count);
                
                // This would parse the actual player data from the packet
                // For now, we'll create sample data
                for i in 0..player_count {
                    let player = PlayerResult {
                        name: format!("Player{}", i + 1),
                        faction: if i % 2 == 0 { Faction::Human } else { Faction::Orc },
                        team: (i / 2) as u8 + 1,
                        rank: "Knight".to_string(),
                        is_host: i == 0,
                        final_score: 1500 + (i * 100) as u32,
                        rank_score: 1500 + (i * 100) as u32,
                        statistics: PlayerStatistics {
                            units_trained: 45 + (i * 5) as u32,
                            units_destroyed: 25 + (i * 3) as u32,
                            structures_built: 15 + (i * 2) as u32,
                            structures_destroyed: 8 + i as u32,
                            gold_mined: 5000 + (i * 500) as u32,
                            lumber_harvested: 3000 + (i * 300) as u32,
                            oil_collected: 0,
                            units_lost: 20 + (i * 2) as u32,
                            structures_lost: 5 + i as u32,
                            military_score: 800 + (i * 100) as u32,
                            economy_score: 600 + (i * 80) as u32,
                            technology_score: 400 + (i * 60) as u32,
                        },
                        outcome: if i == 0 { PlayerOutcome::Victory } else { PlayerOutcome::Defeat },
                    };
                    
                    game.players.push(player);
                }
                
                // Create teams - clone the data to avoid borrow conflicts
                let players_clone = game.players.clone();
                let game_outcome_clone = game.game_outcome.clone();
                let mut teams = Vec::new();
                Self::create_teams_from_players_static(&players_clone, &mut teams, &game_outcome_clone);
                game.teams = teams;
            }
        }
        
        Ok(())
    }

    /// Create team structures from players (static version to avoid borrow conflicts)
    fn create_teams_from_players_static(players: &[PlayerResult], teams: &mut Vec<TeamResult>, game_outcome: &GameOutcome) {
        let mut team_map: HashMap<u8, Vec<&PlayerResult>> = HashMap::new();
        
        for player in players {
            team_map.entry(player.team).or_insert_with(Vec::new).push(player);
        }
        
        for (team_id, team_players) in team_map {
            let team_names: Vec<String> = team_players.iter().map(|p| p.name.clone()).collect();
            let faction = team_players[0].faction.clone();
            let total_score: u32 = team_players.iter().map(|p| p.final_score).sum();
            
            let team_stats = TeamStatistics {
                total_units_destroyed: team_players.iter().map(|p| p.statistics.units_destroyed).sum(),
                total_structures_destroyed: team_players.iter().map(|p| p.statistics.structures_destroyed).sum(),
                total_gold_mined: team_players.iter().map(|p| p.statistics.gold_mined).sum(),
                total_lumber_harvested: team_players.iter().map(|p| p.statistics.lumber_harvested).sum(),
                total_oil_collected: team_players.iter().map(|p| p.statistics.oil_collected).sum(),
            };
            
            let outcome = match game_outcome {
                GameOutcome::Victory { winning_team, .. } => {
                    if *winning_team == team_id {
                        TeamOutcome::Victory
                    } else {
                        TeamOutcome::Defeat
                    }
                }
                GameOutcome::Defeat { losing_team, .. } => {
                    if *losing_team == team_id {
                        TeamOutcome::Defeat
                    } else {
                        TeamOutcome::Victory
                    }
                }
                GameOutcome::Draw { .. } => TeamOutcome::Draw,
                GameOutcome::Disconnect { .. } => TeamOutcome::Defeat,
            };
            
            let team = TeamResult {
                team_id,
                players: team_names,
                faction,
                total_score,
                outcome,
                team_statistics: team_stats,
            };
            
            teams.push(team);
        }
    }

    /// Check memory state for game information
    fn check_memory_state(&mut self) -> Result<()> {
        if let Some(ref mut game) = self.current_game {
            // This would read from the game's memory to get real-time statistics
            // For now, we'll simulate the monitoring
            
            // Update game duration
            game.game_duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as u32 - game.timestamp as u32;
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
        
        Ok(())
    }

    /// Log game result to JSON file
    fn log_game_result(&self, game: &GameResult) -> Result<()> {
        println!("Logging game result: {}", game.game_id);
        
        // Read existing log file
        let mut game_results = self.read_existing_log()?;
        
        // Add new game result
        game_results.push(game.clone());
        
        // Write updated log file
        self.write_log_file(&game_results)?;
        
        println!("Game result logged successfully!");
        Ok(())
    }

    /// Read existing log file
    fn read_existing_log(&self) -> Result<Vec<GameResult>> {
        let path = Path::new(&self.log_file_path);
        
        if !path.exists() {
            return Ok(Vec::new());
        }
        
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        
        match serde_json::from_reader(reader) {
            Ok(results) => Ok(results),
            Err(_) => {
                // If file is corrupted or empty, start fresh
                Ok(Vec::new())
            }
        }
    }

    /// Write log file
    fn write_log_file(&self, game_results: &[GameResult]) -> Result<()> {
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
        serde_json::to_writer_pretty(writer, game_results)?;
        
        Ok(())
    }

    /// Get current game statistics
    pub fn get_current_game(&self) -> Option<&GameResult> {
        self.current_game.as_ref()
    }

    /// Get all logged game results
    pub fn get_all_game_results(&self) -> Result<Vec<GameResult>> {
        self.read_existing_log()
    }

    /// Clear log file
    pub fn clear_log(&self) -> Result<()> {
        let empty_results: Vec<GameResult> = Vec::new();
        self.write_log_file(&empty_results)
    }
}

impl NetworkMonitor {
    /// Get packet log
    pub fn get_packet_log(&self) -> &[NetworkPacket] {
        &self.packet_log
    }

    /// Clear packet log
    pub fn clear_packet_log(&mut self) {
        self.packet_log.clear();
    }
}
