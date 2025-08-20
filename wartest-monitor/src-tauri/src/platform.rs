use crate::types::*;
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;
use anyhow::Result;

/// Platform detection and compatibility
#[derive(Debug, Clone)]
pub enum Platform {
    Windows,
    macOS,
    Linux,
}

impl Platform {
    pub fn current() -> Self {
        match env::consts::OS {
            "windows" => Platform::Windows,
            "macos" => Platform::macOS,
            "linux" => Platform::Linux,
            _ => Platform::Linux, // Default fallback
        }
    }
    
    pub fn to_string(&self) -> String {
        match self {
            Platform::Windows => "Windows".to_string(),
            Platform::macOS => "macOS".to_string(),
            Platform::Linux => "Linux".to_string(),
        }
    }
    
    pub fn game_executable_name(&self) -> &'static str {
        match self {
            Platform::Windows => "Warcraft II.exe",
            Platform::macOS => "Warcraft II",
            Platform::Linux => "warcraft2",
        }
    }
    
    pub fn game_process_name(&self) -> &'static str {
        match self {
            Platform::Windows => "Warcraft II",
            Platform::macOS => "Warcraft II",
            Platform::Linux => "warcraft2",
        }
    }
}

/// Game path finder for different platforms
pub struct GamePathFinder {
    platform: Platform,
}

impl GamePathFinder {
    pub fn new() -> Self {
        Self {
            platform: Platform::current(),
        }
    }
    
    /// Find Warcraft II installation paths
    pub fn find_game_paths(&self) -> Vec<PathBuf> {
        match self.platform {
            Platform::Windows => self.find_windows_paths(),
            Platform::macOS => self.find_macos_paths(),
            Platform::Linux => self.find_linux_paths(),
        }
    }
    
    /// Windows: Check common installation locations
    fn find_windows_paths(&self) -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        // Common Windows installation paths
        let common_paths = vec![
            r"C:\Program Files (x86)\Warcraft II Remastered",
            r"C:\Program Files\Warcraft II Remastered",
            r"C:\Games\Warcraft II Remastered",
            r"C:\Users\{}\AppData\Local\Programs\Warcraft II Remastered",
            r"C:\Users\{}\OneDrive\Desktop\games\Warcraft II Remastered",
        ];
        
        for path in common_paths {
            if let Some(expanded_path) = self.expand_windows_path(path) {
                if expanded_path.join("x86").join("Warcraft II.exe").exists() {
                    paths.push(expanded_path);
                }
            }
        }
        
        paths
    }
    
    /// macOS: Check common installation locations
    fn find_macos_paths(&self) -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        let home = env::var("HOME").unwrap_or_default();
        let common_paths = vec![
            "/Applications/Warcraft II Remastered.app".to_string(),
            "/Applications/Games/Warcraft II Remastered.app".to_string(),
            format!("{}/Applications/Warcraft II Remastered.app", home),
        ];
        
        for path in common_paths {
            let path_buf = PathBuf::from(path);
            if path_buf.exists() {
                paths.push(path_buf);
            }
        }
        
        paths
    }
    
    /// Linux: Check common installation locations
    fn find_linux_paths(&self) -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        let home = env::var("HOME").unwrap_or_default();
        let common_paths = vec![
            "/usr/local/games/warcraft2".to_string(),
            "/opt/warcraft2".to_string(),
            format!("{}/.local/share/Steam/steamapps/common/Warcraft II", home),
            format!("{}/.steam/steam/steamapps/common/Warcraft II", home),
        ];
        
        for path in common_paths {
            let path_buf = PathBuf::from(path);
            if path_buf.exists() {
                paths.push(path_buf);
            }
        }
        
        paths
    }
    
    /// Expand Windows environment variables and user placeholders
    fn expand_windows_path(&self, path: &str) -> Option<PathBuf> {
        let mut expanded = path.to_string();
        
        // Replace {username} with actual username
        if expanded.contains("{}") {
            if let Ok(username) = env::var("USERNAME") {
                expanded = expanded.replace("{}", &username);
            } else if let Ok(username) = env::var("USER") {
                expanded = expanded.replace("{}", &username);
            }
        }
        
        // Expand other environment variables
        for (key, value) in env::vars() {
            let placeholder = format!("{{{}}}", key);
            if expanded.contains(&placeholder) {
                expanded = expanded.replace(&placeholder, &value);
            }
        }
        
        Some(PathBuf::from(expanded))
    }
}

/// Process monitor for different platforms
pub struct ProcessMonitor {
    platform: Platform,
}

impl ProcessMonitor {
    pub fn new() -> Self {
        Self {
            platform: Platform::current(),
        }
    }
    
    /// Find running Warcraft II processes
    pub fn find_game_processes(&self) -> Result<Vec<ProcessInfo>> {
        match self.platform {
            Platform::Windows => self.find_windows_processes(),
            Platform::Linux => self.find_wine_processes(),
            Platform::macOS => self.find_wine_processes(),
        }
    }
    
    /// Windows: Use tasklist command
    fn find_windows_processes(&self) -> Result<Vec<ProcessInfo>> {
        let output = Command::new("tasklist")
            .args(&["/FO", "CSV", "/NH"])
            .output()?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut processes = Vec::new();
        
        for line in output_str.lines() {
            if line.to_lowercase().contains("warcraft") {
                if let Some(process) = self.parse_windows_process_line(line) {
                    processes.push(process);
                }
            }
        }
        
        Ok(processes)
    }
    
    /// Linux/macOS: Find Wine processes running Warcraft
    fn find_wine_processes(&self) -> Result<Vec<ProcessInfo>> {
        let mut processes = Vec::new();
        
        // Look for Wine processes
        let wine_processes = self.find_processes_by_name("wine")?;
        let wine64_processes = self.find_processes_by_name("wine64")?;
        let proton_processes = self.find_processes_by_name("proton")?;
        
        // Check each Wine process for Warcraft executables
        for wine_pid in wine_processes.iter().chain(wine64_processes.iter()).chain(proton_processes.iter()) {
            if let Some(warcraft_process) = self.check_wine_process_for_warcraft(*wine_pid)? {
                processes.push(warcraft_process);
            }
        }
        
        Ok(processes)
    }
    
    /// Check if a Wine process is running Warcraft
    fn check_wine_process_for_warcraft(&self, wine_pid: u32) -> Result<Option<ProcessInfo>> {
        // Use lsof to see what files the Wine process has open
        let output = Command::new("lsof")
            .args(&["-p", &wine_pid.to_string()])
            .output()?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        // Look for Warcraft executable files
        for line in output_str.lines() {
            if line.contains("Warcraft") || line.contains("war2") || line.contains("wc2") {
                // Extract process info
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(pid) = parts[1].parse::<u32>() {
                        return Ok(Some(ProcessInfo {
                            pid,
                            name: "Warcraft II (Wine)".to_string(),
                            executable_path: Some(PathBuf::from(parts[8]).to_string_lossy().to_string()),
                            wine_pid: Some(wine_pid),
                        }));
                    }
                }
            }
        }
        
        Ok(None)
    }
    
    /// Find processes by name using ps
    fn find_processes_by_name(&self, name: &str) -> Result<Vec<u32>> {
        let output = Command::new("ps")
            .args(&["-ax", "-o", "pid,comm"])
            .output()?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut pids = Vec::new();
        
        for line in output_str.lines() {
            if line.to_lowercase().contains(name) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(pid) = parts[0].parse::<u32>() {
                        pids.push(pid);
                    }
                }
            }
        }
        
        Ok(pids)
    }
    
    /// Parse Windows process line
    fn parse_windows_process_line(&self, line: &str) -> Option<ProcessInfo> {
        // Windows CSV format: "Image Name","PID","Session Name","Session#","Mem Usage"
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 2 {
            let name = parts[0].trim_matches('"');
            if let Ok(pid) = parts[1].trim_matches('"').parse::<u32>() {
                return Some(ProcessInfo {
                    pid,
                    name: name.to_string(),
                    executable_path: self.find_windows_executable_path(pid),
                    wine_pid: None,
                });
            }
        }
        None
    }
    
    /// Find executable path for Windows process
    fn find_windows_executable_path(&self, pid: u32) -> Option<String> {
        // Use wmic to get executable path
        let output = Command::new("wmic")
            .args(&["process", "where", &format!("ProcessId={}", pid), "get", "ExecutablePath"])
            .output();
        
        if let Ok(output) = output {
            let output_str = String::from_utf8_lossy(&output.stdout);
            for line in output_str.lines() {
                if line.contains(":\\") && !line.contains("ExecutablePath") {
                    return Some(line.trim().to_string());
                }
            }
        }
        None
    }
}

/// Public functions for Tauri commands

/// Detect Warcraft II installation
pub fn detect_warcraft_installation() -> Result<bool> {
    let path_finder = GamePathFinder::new();
    let paths = path_finder.find_game_paths();
    Ok(!paths.is_empty())
}

/// Get platform information
pub fn get_platform_info() -> PlatformInfo {
    let platform = Platform::current();
    let path_finder = GamePathFinder::new();
    let paths = path_finder.find_game_paths();
    
    // Check for Wine
    let wine_detected = check_wine_installed();
    
    // Determine compatibility level
    let compatibility_level = match platform {
        Platform::Windows => CompatibilityLevel::Native,
        Platform::Linux => if wine_detected { CompatibilityLevel::Wine } else { CompatibilityLevel::Unsupported },
        Platform::macOS => if wine_detected { CompatibilityLevel::Wine } else { CompatibilityLevel::Unsupported },
    };
    
    PlatformInfo {
        platform: platform.to_string(),
        wine_detected,
        recommended_paths: paths.iter().map(|p| p.to_string_lossy().to_string()).collect(),
        compatibility_level,
    }
}

/// Detect running game
pub fn detect_running_game() -> GameDetectionResult {
    let _platform = Platform::current();
    let process_monitor = ProcessMonitor::new();
    
    match process_monitor.find_game_processes() {
        Ok(processes) => {
            if let Some(process) = processes.first() {
                GameDetectionResult {
                    is_running: true,
                    process_info: Some(process.clone()),
                    installation_path: process.executable_path.clone(),
                }
            } else {
                GameDetectionResult {
                    is_running: false,
                    process_info: None,
                    installation_path: None,
                }
            }
        }
        Err(_) => GameDetectionResult {
            is_running: false,
            process_info: None,
            installation_path: None,
        }
    }
}

/// Get recommended installation paths
pub fn get_recommended_paths() -> Vec<String> {
    let path_finder = GamePathFinder::new();
    path_finder.find_game_paths()
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect()
}

/// Check if Wine is installed
fn check_wine_installed() -> bool {
    let platform = Platform::current();
    match platform {
        Platform::Windows => false,
        Platform::Linux | Platform::macOS => {
            Command::new("wine")
                .arg("--version")
                .output()
                .is_ok()
        }
    }
}
