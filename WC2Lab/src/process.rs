use anyhow::Result;
use log::{info, warn, error, debug};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use tokio::time::{sleep, Duration};
use windows::Win32::System::ProcessStatus::{
    EnumProcesses, GetModuleBaseNameW, GetModuleFileNameExW
};
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};
use windows::Win32::Foundation::{HANDLE, CloseHandle};

/// Process information for WC2 Remastered
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WC2Process {
    /// Process ID
    pub pid: u32,
    /// Process name
    pub name: String,
    /// Full executable path
    pub executable_path: String,
    /// Process handle (if accessible)
    pub handle: Option<u64>,
    /// Memory usage in bytes
    pub memory_usage: u64,
    /// CPU usage percentage
    pub cpu_usage: f64,
    /// Whether the process is accessible for memory reading
    pub accessible: bool,
    /// Process start time
    pub start_time: chrono::DateTime<chrono::Utc>,
}

/// Process monitor for WC2 Remastered
pub struct ProcessMonitor {
    /// Known WC2 process names
    wc2_process_names: Vec<String>,
    /// Process cache
    process_cache: HashMap<u32, WC2Process>,
    /// Last scan time
    last_scan: chrono::DateTime<chrono::Utc>,
}

impl ProcessMonitor {
    /// Create a new process monitor
    pub fn new() -> Result<Self> {
        let wc2_process_names = vec![
            "Warcraft II Map Editor.exe".to_string(),
            "warcraft ii map editor.exe".to_string(),
            "wc2remastered.exe".to_string(),
            "wc2r.exe".to_string(),
        ];

        Ok(Self {
            wc2_process_names,
            process_cache: HashMap::new(),
            last_scan: chrono::Utc::now(),
        })
    }

    /// Find all WC2 Remastered processes
    pub async fn find_wc2_processes(&mut self) -> Result<Vec<WC2Process>> {
        info!("🔍 Scanning for WC2 Remastered processes...");
        
        let mut processes = Vec::new();
        
        // Method 1: Windows API enumeration
        if let Ok(win_processes) = self.enumerate_processes_windows().await {
            processes.extend(win_processes);
        }
        
        // Method 2: Command line tools (fallback)
        if processes.is_empty() {
            if let Ok(cmd_processes) = self.enumerate_processes_command().await {
                processes.extend(cmd_processes);
            }
        }
        
        // Filter and validate processes
        let valid_processes: Vec<WC2Process> = processes
            .into_iter()
            .filter(|p| self.is_valid_wc2_process(p))
            .collect();
        
        info!("🎮 Found {} valid WC2 Remastered process(es)", valid_processes.len());
        
        // Update cache
        for process in &valid_processes {
            self.process_cache.insert(process.pid, process.clone());
        }
        
        self.last_scan = chrono::Utc::now();
        Ok(valid_processes)
    }

    /// Enumerate processes using Windows API
    async fn enumerate_processes_windows(&self) -> Result<Vec<WC2Process>> {
        let mut processes = Vec::new();
        
        // Get process list
        let mut process_ids = vec![0u32; 1024];
        let mut bytes_returned = 0u32;
        
        unsafe {
            if EnumProcesses(
                process_ids.as_mut_ptr(),
                (process_ids.len() * std::mem::size_of::<u32>()) as u32,
                &mut bytes_returned,
            ).is_ok() {
                let process_count = bytes_returned as usize / std::mem::size_of::<u32>();
                
                for &pid in &process_ids[..process_count] {
                    if pid == 0 { continue; }
                    
                    if let Ok(process) = self.get_process_info_windows(pid).await {
                        processes.push(process);
                    }
                }
            }
        }
        
        Ok(processes)
    }

    /// Get process information using Windows API
    async fn get_process_info_windows(&self, pid: u32) -> Result<WC2Process> {
        let handle = unsafe {
            OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid)
        }?;
        
        if handle.is_invalid() {
            return Err(anyhow::anyhow!("Failed to open process {}", pid));
        }
        
        let mut module_name = [0u16; 260];
        let mut module_path = [0u16; 260];
        
        unsafe {
            let _ = GetModuleBaseNameW(handle, None, &mut module_name);
            let _ = GetModuleFileNameExW(handle, None, &mut module_path);
            let _ = CloseHandle(handle);
        }
        
        let name = String::from_utf16_lossy(&module_name)
            .trim_matches('\0')
            .to_string();
        
        let path = String::from_utf16_lossy(&module_path)
            .trim_matches('\0')
            .to_string();
        
        Ok(WC2Process {
            pid,
            name,
            executable_path: path,
            handle: None,
            memory_usage: 0, // Would need additional API calls
            cpu_usage: 0.0,  // Would need additional API calls
            accessible: true,
            start_time: chrono::Utc::now(), // Would need additional API calls
        })
    }

    /// Enumerate processes using command line tools
    async fn enumerate_processes_command(&self) -> Result<Vec<WC2Process>> {
        let mut processes = Vec::new();
        
        // Use tasklist command
        let output = Command::new("tasklist")
            .args(&["/FO", "CSV", "/NH"])
            .output()?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        for line in output_str.lines() {
            if let Ok(process) = self.parse_tasklist_line(line) {
                processes.push(process);
            }
        }
        
        Ok(processes)
    }

    /// Parse a tasklist output line
    fn parse_tasklist_line(&self, line: &str) -> Result<WC2Process> {
        // CSV format: "Image Name","PID","Session Name","Session#","Mem Usage"
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 5 {
            return Err(anyhow::anyhow!("Invalid tasklist line format"));
        }
        
        let name = parts[0].trim_matches('"').to_string();
        let pid: u32 = parts[1].trim_matches('"').parse()?;
        let memory_str = parts[4].trim_matches('"');
        let memory_usage = self.parse_memory_usage(memory_str);
        
        Ok(WC2Process {
            pid,
            name,
            executable_path: String::new(), // Not available in tasklist
            handle: None,
            memory_usage,
            cpu_usage: 0.0,
            accessible: false, // Need to test separately
            start_time: chrono::Utc::now(),
        })
    }

    /// Parse memory usage string from tasklist
    fn parse_memory_usage(&self, memory_str: &str) -> u64 {
        if memory_str.ends_with(" K") {
            if let Ok(kb) = memory_str.trim_end_matches(" K").parse::<u64>() {
                return kb * 1024;
            }
        } else if memory_str.ends_with(" M") {
            if let Ok(mb) = memory_str.trim_end_matches(" M").parse::<u64>() {
                return mb * 1024 * 1024;
            }
        }
        0
    }

    /// Check if a process is a valid WC2 Remastered process
    fn is_valid_wc2_process(&self, process: &WC2Process) -> bool {
        // Check if process name matches known WC2 names
        let name_lower = process.name.to_lowercase();
        
        for wc2_name in &self.wc2_process_names {
            if name_lower.contains(&wc2_name.to_lowercase()) {
                debug!("✅ Found WC2 process: {} (PID: {})", process.name, process.pid);
                return true;
            }
        }
        
        // Additional checks for WC2-specific characteristics
        if name_lower.contains("warcraft") && name_lower.contains("ii") {
            debug!("✅ Found potential WC2 process: {} (PID: {})", process.name, process.pid);
            return true;
        }
        
        false
    }

    /// Monitor a specific process for changes
    pub async fn monitor_process(&self, process: &WC2Process) -> Result<ProcessStatus> {
        info!("📊 Monitoring process {} (PID: {})", process.name, process.pid);
        
        // Check if process is still running
        if !self.is_process_running(process.pid).await? {
            return Ok(ProcessStatus::Terminated);
        }
        
        // Check memory usage changes
        let current_memory = self.get_process_memory_usage(process.pid).await?;
        let memory_change = current_memory as i64 - process.memory_usage as i64;
        
        if memory_change.abs() > 1024 * 1024 { // 1MB threshold
            info!("💾 Process {} memory changed by {} bytes", process.name, memory_change);
        }
        
        Ok(ProcessStatus::Running {
            memory_usage: current_memory,
            memory_change,
        })
    }

    /// Check if a process is still running
    async fn is_process_running(&self, pid: u32) -> Result<bool> {
        // Try to open the process
        let handle = unsafe {
            OpenProcess(PROCESS_QUERY_INFORMATION, false, pid)
        };
        
        if let Ok(handle) = handle {
            if handle.is_invalid() {
                return Ok(false);
            }
            unsafe { let _ = CloseHandle(handle); }
        } else {
            return Ok(false);
        }
        Ok(true)
    }

    /// Get current memory usage for a process
    async fn get_process_memory_usage(&self, pid: u32) -> Result<u64> {
        // This would require additional Windows API calls
        // For now, return a placeholder
        Ok(0)
    }

    /// Get cached process information
    pub fn get_cached_process(&self, pid: u32) -> Option<&WC2Process> {
        self.process_cache.get(&pid)
    }

    /// Clear process cache
    pub fn clear_cache(&mut self) {
        self.process_cache.clear();
        info!("🗑️  Process cache cleared");
    }
}

/// Status of a monitored process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProcessStatus {
    Running {
        memory_usage: u64,
        memory_change: i64,
    },
    Terminated,
    Error(String),
}
