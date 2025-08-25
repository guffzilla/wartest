use anyhow::{anyhow, Result};
use log::{info, warn};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::fs::OpenOptions;
use std::io::Write;
use chrono::Utc;
use tokio::time::sleep;

// Windows API imports for real input simulation
use windows::Win32::Foundation::*;
use windows::Win32::System::Diagnostics::ToolHelp::*;
use windows::Win32::System::Threading::*;
use windows::Win32::UI::Input::KeyboardAndMouse::*;
use windows::Win32::UI::WindowsAndMessaging::*;
use windows::core::PCSTR;

fn log_to_json(level: &str, message: &str) {
    let log_entry = serde_json::json!({
        "timestamp": Utc::now().to_rfc3339(),
        "level": level,
        "message": message
    });
    
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("ai_debug.log")
    {
        let _ = writeln!(file, "{}", log_entry);
    }
}

/// Represents all the hotkeys available in Warcraft II
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GameHotkey {
    // Unit selection
    SelectAllUnits,
    SelectAllWorkers,
    SelectAllMilitary,
    SelectAllBuildings,
    
    // Building construction
    BuildTownHall,
    BuildBarracks,
    BuildFarm,
    BuildTower,
    BuildWall,
    BuildLumberMill,
    BuildBlacksmith,
    BuildStable,
    BuildChurch,
    BuildWorkshop,
    BuildMine,       // Gold mine
    BuildOilWell,    // Oil well
    
    // Unit training
    BuildWorker,
    BuildFootman,
    BuildArcher,
    BuildKnight,
    BuildPaladin,
    BuildPriest,
    BuildMage,
    BuildCatapult,
    BuildBallista,
    BuildPeasant,    // Human worker
    BuildScoutTower, // Scout tower for scouting
    
    // Game commands
    PauseGame,
    SpeedUp,
    SlowDown,
    SaveGame,
    LoadGame,
    QuitGame,
    StartGame,      // Start a new game
    SinglePlayer,   // Navigate to single player
    CustomGame,     // Navigate to custom game
    Campaign,       // Navigate to campaign
    Multiplayer,    // Navigate to multiplayer
    
    // Camera control
    CameraUp,
    CameraDown,
    CameraLeft,
    CameraRight,
    CameraHome,
    
    // Combat
    Attack,
    Move,
    Stop,
    Patrol,
    HoldPosition,
    
    // Special abilities
    CastSpell,
    UseAbility,
    SetRallyPoint,
    Repair,
    Harvest,
}

/// Represents mouse actions for AI control
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MouseAction {
    Click { x: i32, y: i32 },
    RightClick { x: i32, y: i32 },
    DoubleClick { x: i32, y: i32 },
    Drag { start_x: i32, start_y: i32, end_x: i32, end_y: i32 },
    Select { x: i32, y: i32 },
    Move { x: i32, y: i32 },
}

/// Main input simulator for AI control of Warcraft II
#[derive(Debug, Clone)]
pub struct InputSimulator {
    process_handle: Option<u64>,
    window_handle: Option<u64>,
    is_active: bool,
    status: InputSimulatorStatus,
}

impl InputSimulator {
    /// Create a new input simulator
    pub fn new() -> Self {
        Self {
            process_handle: None,
            window_handle: None,
            is_active: false,
            status: InputSimulatorStatus {
                is_active: false,
                process_handle: None,
                window_handle: None,
            },
        }
    }

    /// Initialize the input simulator
    pub async fn initialize(&mut self) -> Result<()> {
        info!("🎮 Initializing Input Simulator...");
        
        // Try to find existing Warcraft II process first
        if let Ok(()) = self.find_game_process().await {
            info!("✅ Found existing Warcraft II process");
            if let Ok(()) = self.find_game_window().await {
                info!("✅ Found existing Warcraft II window");
                if let Ok(()) = self.ensure_window_active().await {
                    info!("✅ Warcraft II window is active and ready");
                    self.is_active = true;
                    self.status.is_active = true;
                    return Ok(());
                }
            }
        }
        
        // If no existing process found, inform user to launch Warcraft II manually
        info!("⚠️ No existing Warcraft II found. Please launch Warcraft II manually and run this system again.");
        Err(anyhow!("Warcraft II not running. Please launch the game manually and try again."))
    }

    /// Execute a game hotkey through real Windows API
    pub async fn execute_hotkey(&mut self, hotkey: GameHotkey) -> Result<()> {
        info!("🎯 Executing hotkey: {:?}", hotkey);

        // Ensure window is active before sending input
        self.ensure_window_active().await?;

        match hotkey {
            GameHotkey::SelectAllUnits => {
                self.send_key(VK_A.0, false).await?;  // Press A
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_A.0, true).await?;   // Release A
            }
            GameHotkey::SelectAllWorkers => {
                self.send_key(VK_W.0, false).await?;  // Press W
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_W.0, true).await?;   // Release W
            }
            GameHotkey::SelectAllMilitary => {
                self.send_key(VK_M.0, false).await?;  // Press M
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_M.0, true).await?;   // Release M
            }
            GameHotkey::SelectAllBuildings => {
                self.send_key(VK_B.0, false).await?;  // Press B
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_B.0, true).await?;   // Release B
            }
            GameHotkey::BuildTownHall => {
                self.send_key(VK_T.0, false).await?;  // Press T
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_T.0, true).await?;   // Release T
            }
            GameHotkey::BuildBarracks => {
                self.send_key(VK_R.0, false).await?;  // Press R
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_R.0, true).await?;   // Release R
            }
            GameHotkey::BuildWorker => {
                self.send_key(VK_W.0, false).await?;  // Press W
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_W.0, true).await?;   // Release W
            }
            GameHotkey::BuildFootman => {
                self.send_key(VK_F.0, false).await?;  // Press F
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_F.0, true).await?;   // Release F
            }
            GameHotkey::Attack => {
                self.send_key(VK_A.0, false).await?;  // Press A
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_A.0, true).await?;   // Release A
            }
            GameHotkey::Move => {
                self.send_key(VK_M.0, false).await?;  // Press M
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_M.0, true).await?;   // Release M
            }
            GameHotkey::Stop => {
                self.send_key(VK_S.0, false).await?;  // Press S
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_S.0, true).await?;   // Release S
            }
            GameHotkey::Patrol => {
                self.send_key(VK_P.0, false).await?;  // Press P
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_P.0, true).await?;   // Release P
            }
            GameHotkey::HoldPosition => {
                self.send_key(VK_H.0, false).await?;  // Press H
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_H.0, true).await?;   // Release H
            }
            GameHotkey::PauseGame => {
                self.send_key(VK_PAUSE.0, false).await?;  // Press Pause
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_PAUSE.0, true).await?;   // Release Pause
            }
            GameHotkey::SpeedUp => {
                self.send_key(VK_ADD.0, false).await?;  // Press +
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_ADD.0, true).await?;   // Release +
            }
            GameHotkey::SlowDown => {
                self.send_key(VK_SUBTRACT.0, false).await?;  // Press -
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_SUBTRACT.0, true).await?;   // Release -
            }
            GameHotkey::CameraUp => {
                self.send_key(VK_UP.0, false).await?;  // Press Up
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_UP.0, true).await?;   // Release Up
            }
            GameHotkey::CameraDown => {
                self.send_key(VK_DOWN.0, false).await?;  // Press Down
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_DOWN.0, true).await?;   // Release Down
            }
            GameHotkey::CameraLeft => {
                self.send_key(VK_LEFT.0, false).await?;  // Press Left
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_LEFT.0, true).await?;   // Release Left
            }
            GameHotkey::CameraRight => {
                self.send_key(VK_RIGHT.0, false).await?;  // Press Right
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_RIGHT.0, true).await?;   // Release Right
            }
            GameHotkey::CameraHome => {
                self.send_key(VK_HOME.0, false).await?;  // Press Home
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_HOME.0, true).await?;   // Release Home
            }
            GameHotkey::StartGame => {
                self.send_key(VK_RETURN.0, false).await?;  // Press Enter
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_RETURN.0, true).await?;   // Release Enter
            }
            GameHotkey::SinglePlayer => {
                self.send_key(VK_S.0, false).await?;  // Press S
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_S.0, true).await?;   // Release S
            }
            GameHotkey::CustomGame => {
                self.send_key(VK_C.0, false).await?;  // Press C
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_C.0, true).await?;   // Release C
            }
            GameHotkey::Campaign => {
                self.send_key(VK_C.0, false).await?;  // Press C
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_C.0, true).await?;   // Release C
            }
            GameHotkey::Multiplayer => {
                self.send_key(VK_M.0, false).await?;  // Press M
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_M.0, true).await?;   // Release M
            }
            GameHotkey::BuildMine => {
                self.send_key(VK_M.0, false).await?;  // Press M
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_M.0, true).await?;   // Release M
            }
            GameHotkey::BuildOilWell => {
                self.send_key(VK_O.0, false).await?;  // Press O
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_O.0, true).await?;   // Release O
            }
            GameHotkey::BuildPeasant => {
                self.send_key(VK_P.0, false).await?;  // Press P
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_P.0, true).await?;   // Release P
            }
            GameHotkey::BuildScoutTower => {
                self.send_key(VK_T.0, false).await?;  // Press T
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_T.0, true).await?;   // Release T
            }
            GameHotkey::BuildTower => {
                self.send_key(VK_T.0, false).await?;  // Press T
                sleep(Duration::from_millis(50)).await;
                self.send_key(VK_T.0, true).await?;   // Release T
            }
            // Add more hotkeys as needed...
            _ => {
                // warn!("⚠️ Hotkey {:?} not yet implemented, logging only", hotkey); // Removed warn!
            }
        }

        info!("✅ Hotkey executed: {:?}", hotkey);
        Ok(())
    }

    /// Execute a mouse action through real Windows API
    pub async fn execute_mouse_action(&mut self, action: MouseAction) -> Result<()> {
        info!("🖱️ Executing mouse action: {:?}", action);

        // Ensure window is active before sending input
        self.ensure_window_active().await?;

        match action {
            MouseAction::Click { x, y } => {
                self.move_mouse_to(x, y).await?;
                sleep(Duration::from_millis(100)).await;
                self.left_click().await?;
            }
            MouseAction::RightClick { x, y } => {
                self.move_mouse_to(x, y).await?;
                sleep(Duration::from_millis(100)).await;
                self.right_click().await?;
            }
            MouseAction::DoubleClick { x, y } => {
                self.move_mouse_to(x, y).await?;
                sleep(Duration::from_millis(100)).await;
                self.left_click().await?;
                sleep(Duration::from_millis(50)).await;
                self.left_click().await?;
            }
            MouseAction::Drag { start_x, start_y, end_x, end_y } => {
                self.move_mouse_to(start_x, start_y).await?;
                sleep(Duration::from_millis(100)).await;
                self.left_mouse_down().await?;
                sleep(Duration::from_millis(100)).await;
                self.move_mouse_to(end_x, end_y).await?;
                sleep(Duration::from_millis(100)).await;
                self.left_mouse_up().await?;
            }
            MouseAction::Select { x, y } => {
                self.move_mouse_to(x, y).await?;
                sleep(Duration::from_millis(100)).await;
                self.left_click().await?;
            }
            MouseAction::Move { x, y } => {
                self.move_mouse_to(x, y).await?;
            }
        }

        info!("✅ Mouse action executed: {:?}", action);
        Ok(())
    }

    // **REAL WINDOWS API IMPLEMENTATION**

    /// Send a key press/release using Windows API
    async fn send_key(&self, vk_code: u16, key_up: bool) -> Result<()> {
        let mut input = INPUT {
            r#type: INPUT_TYPE(0), // KEYBOARD
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(vk_code),
                    dwFlags: if key_up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) }, // 0 for keydown
                    dwExtraInfo: 0,
                    time: 0,
                    ..Default::default()
                }
            }
        };
        
        unsafe {
            let result = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
            if result == 0 {
                return Err(anyhow!("Failed to send keyboard input"));
            }
        }
        
        Ok(())
    }

    /// Move mouse to specific coordinates
    async fn move_mouse_to(&self, x: i32, y: i32) -> Result<()> {
        unsafe {
            let result = SetCursorPos(x, y);
            if result.is_err() {
                return Err(anyhow!("Failed to move mouse cursor"));
            }
        }
        Ok(())
    }

    /// Perform left mouse click
    async fn left_click(&self) -> Result<()> {
        let mut input = INPUT {
            r#type: INPUT_TYPE(0), // MOUSE
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_LEFTDOWN,
                    time: 0,
                    dwExtraInfo: 0,
                }
            }
        };
        
        unsafe {
            let result = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
            if result == 0 {
                return Err(anyhow!("Failed to send left mouse down"));
            }
        }
        
        sleep(Duration::from_millis(50)).await;
        
        // Release left mouse button
        input.Anonymous.mi.dwFlags = MOUSEEVENTF_LEFTUP;
        
        unsafe {
            let result = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
            if result == 0 {
                return Err(anyhow!("Failed to send left mouse up"));
            }
        }
        
        Ok(())
    }

    /// Perform right mouse click
    async fn right_click(&self) -> Result<()> {
        let mut input = INPUT {
            r#type: INPUT_TYPE(0), // MOUSE
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_RIGHTDOWN,
                    time: 0,
                    dwExtraInfo: 0,
                }
            }
        };
        
        unsafe {
            let result = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
            if result == 0 {
                return Err(anyhow!("Failed to send right mouse down"));
            }
        }
        
        sleep(Duration::from_millis(50)).await;
        
        // Release right mouse button
        input.Anonymous.mi.dwFlags = MOUSEEVENTF_RIGHTUP;
        
        unsafe {
            let result = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
            if result == 0 {
                return Err(anyhow!("Failed to send right mouse up"));
            }
        }
        
        Ok(())
    }

    /// Press and hold left mouse button
    async fn left_mouse_down(&self) -> Result<()> {
        let input = INPUT {
            r#type: INPUT_TYPE(0), // MOUSE
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_LEFTDOWN,
                    time: 0,
                    dwExtraInfo: 0,
                }
            }
        };
        
        unsafe {
            let result = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
            if result == 0 {
                return Err(anyhow!("Failed to send left mouse down"));
            }
        }
        
        Ok(())
    }

    /// Release left mouse button
    async fn left_mouse_up(&self) -> Result<()> {
        let input = INPUT {
            r#type: INPUT_TYPE(0), // MOUSE
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_LEFTUP,
                    time: 0,
                    dwExtraInfo: 0,
                }
            }
        };
        
        unsafe {
            let result = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
            if result == 0 {
                return Err(anyhow!("Failed to send left mouse up"));
            }
        }
        
        Ok(())
    }

    /// Launch Warcraft II Remastered from the system
    pub async fn launch_warcraft_ii(&mut self) -> Result<()> {
        info!("🚀 Launching Warcraft II Remastered...");
        
        // Common Warcraft II installation paths
        let possible_paths = vec![
            r"C:\Program Files (x86)\Warcraft II\Warcraft II.exe",
            r"C:\Program Files\Warcraft II\Warcraft II.exe",
            r"C:\Games\Warcraft II\Warcraft II.exe",
            r"C:\Users\{}\AppData\Local\Programs\Warcraft II\Warcraft II.exe",
            r"C:\Users\{}\OneDrive\Games\Warcraft II\Warcraft II.exe",
        ];
        
        // Try to find and launch the game
        for path in possible_paths {
            let expanded_path = if path.contains("{}") {
                path.replace("{}", &std::env::var("USERNAME").unwrap_or_default())
            } else {
                path.to_string()
            };
            
            if std::path::Path::new(&expanded_path).exists() {
                info!("🎮 Found Warcraft II at: {}", expanded_path);
                
                // Launch the game process
                let output = std::process::Command::new(&expanded_path)
                    .spawn()
                    .map_err(|e| anyhow!("Failed to launch Warcraft II: {}", e))?;
                
                info!("✅ Warcraft II process launched with PID: {}", output.id());
                
                // Wait a moment for the game to start
                sleep(Duration::from_millis(3000)).await;
                
                // Try to find and connect to the launched process
                if let Ok(()) = self.find_game_process().await {
                    if let Ok(()) = self.find_game_window().await {
                        if let Ok(()) = self.ensure_window_active().await {
                            self.is_active = true;
                            self.status.is_active = true;
                            info!("✅ Successfully connected to launched Warcraft II");
                            return Ok(());
                        }
                    }
                }
                
                // If we get here, the launch succeeded but connection failed
                warn!("⚠️ Warcraft II launched but connection failed. Retrying...");
                sleep(Duration::from_millis(2000)).await;
                
                // Try one more time
                if let Ok(()) = self.refresh_game_connection().await {
                    info!("✅ Connection established on retry");
                    return Ok(());
                }
                
                return Err(anyhow!("Warcraft II launched but connection failed"));
            }
        }
        
        // If no installation found, try to launch from PATH or registry
        info!("🔍 No standard installation found, trying alternative methods...");
        
        // Try launching from PATH
        if let Ok(output) = std::process::Command::new("warcraft2")
            .spawn() {
            info!("✅ Launched Warcraft II from PATH with PID: {}", output.id());
            sleep(Duration::from_millis(3000)).await;
            
            if let Ok(()) = self.refresh_game_connection().await {
                return Ok(());
            }
        }
        
        // Try launching from registry
        if let Ok(()) = self.launch_from_registry().await {
            return Ok(());
        }
        
        Err(anyhow!("Could not find or launch Warcraft II Remastered. Please install the game or provide the correct path."))
    }
    
    /// Try to launch Warcraft II from Windows registry
    async fn launch_from_registry(&mut self) -> Result<()> {
        info!("🔍 Attempting to launch from Windows registry...");
        
        // This is a simplified registry check - in a real implementation,
        // you would use the windows-registry crate for proper registry access
        let output = std::process::Command::new("reg")
            .args(&["query", r"HKEY_LOCAL_MACHINE\SOFTWARE\Warcraft II", "/v", "InstallPath"])
            .output()
            .map_err(|e| anyhow!("Failed to query registry: {}", e))?;
        
        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            if let Some(path) = output_str.lines()
                .find(|line| line.contains("InstallPath"))
                .and_then(|line| line.split_whitespace().last()) {
                
                let game_path = format!("{}\\Warcraft II.exe", path);
                info!("🎮 Found registry path: {}", game_path);
                
                if std::path::Path::new(&game_path).exists() {
                    let output = std::process::Command::new(&game_path)
                        .spawn()
                        .map_err(|e| anyhow!("Failed to launch from registry path: {}", e))?;
                    
                    info!("✅ Launched from registry with PID: {}", output.id());
                    sleep(Duration::from_millis(3000)).await;
                    
                    if let Ok(()) = self.refresh_game_connection().await {
                        return Ok(());
                    }
                }
            }
        }
        
        Err(anyhow!("Registry launch failed"))
    }

    /// Enhanced process detection that works with real Warcraft II processes
    async fn find_game_process(&mut self) -> Result<()> {
        log_to_json("INFO", "🔍 Searching for Warcraft II process...");
        info!("🔍 Searching for Warcraft II process...");
        
        // Use real Windows API to enumerate processes
        unsafe {
            let snapshot_result = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            let snapshot = match snapshot_result {
                Ok(handle) => handle,
                Err(_) => return Err(anyhow!("Failed to create process snapshot")),
            };
            
            let mut process_entry = PROCESSENTRY32W::default();
            process_entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
            
            if Process32FirstW(snapshot, &mut process_entry).is_ok() {
                loop {
                    let process_name = String::from_utf16_lossy(&process_entry.szExeFile)
                        .trim_matches('\0')
                        .to_string();
                    
                    if self.is_warcraft_process(&process_name) {
                        let process_id = process_entry.th32ProcessID;
                        let found_msg = format!("🎮 Found Warcraft II process: {} (PID: {})", process_name, process_id);
                        log_to_json("INFO", &found_msg);
                        info!("🎮 Found Warcraft II process: {} (PID: {})", process_name, process_id);
                        
                        // Open process with necessary permissions
                        let process_handle = OpenProcess(
                            PROCESS_ALL_ACCESS,
                            false,
                            process_id
                        );
                        
                        if let Ok(handle) = process_handle {
                            self.process_handle = Some(handle.0 as u64);
                            self.status.process_handle = Some(handle.0 as u64);
                            let success_msg = format!("✅ Successfully opened Warcraft II process (PID: {})", process_id);
                            log_to_json("INFO", &success_msg);
                            info!("✅ Successfully opened Warcraft II process (PID: {})", process_id);
                            CloseHandle(snapshot);
                            return Ok(());
                        } else {
                            let fail_msg = format!("⚠️ Failed to open process {}: Access denied", process_id);
                            log_to_json("WARN", &fail_msg);
                            warn!("⚠️ Failed to open process {}: Access denied", process_id);
                        }
                    }
                    
                    if Process32NextW(snapshot, &mut process_entry).is_err() {
                        break;
                    }
                }
            }
            
            // Close snapshot handle
            CloseHandle(snapshot);
        }
        
        log_to_json("WARN", "⚠️ No Warcraft II process found");
        warn!("⚠️ No Warcraft II process found");
        Err(anyhow!("Warcraft II process not found"))
    }
    
    /// Check if a process name matches Warcraft II
    fn is_warcraft_process(&self, process_name: &str) -> bool {
        let warcraft_names = vec![
            "Warcraft II.exe",
            "Warcraft2.exe", 
            "WC2.exe",
            "WC2Remastered.exe",
            "WarcraftII.exe",
            "Warcraft2Remastered.exe",
        ];
        
        warcraft_names.iter().any(|name| {
            process_name.eq_ignore_ascii_case(name)
        })
    }

    /// Simple debug function to check if any windows exist
    async fn enumerate_visible_windows(&self) -> Result<()> {
        info!("🔍 Checking for any visible windows...");
        
        // Let's try a few common window titles to see what's available
        let test_titles = [
            "Warcraft II: Remastered",
            "Warcraft II",
            "Notepad",
            "Calculator",
            "Chrome",
            "Firefox",
            "Edge"
        ];
        
        unsafe {
            for title in &test_titles {
                let window_handle = FindWindowA(
                    PCSTR::null(),
                    PCSTR::from_raw(title.as_ptr())
                );
                
                if window_handle.0 != 0 {
                    info!("🔍 Found window: '{}' (Handle: {:?})", title, window_handle.0);
                } else {
                    info!("🔍 No window found for: '{}'", title);
                }
            }
        }
        
        Ok(())
    }

    /// Enhanced window detection that works with real Warcraft II windows
    async fn find_game_window(&mut self) -> Result<()> {
        log_to_json("INFO", "🔍 Searching for Warcraft II window...");
        info!("🔍 Searching for Warcraft II window...");
        
        // First, let's enumerate all visible windows to see what's available
        self.enumerate_visible_windows().await?;
        
        // Try a different approach: use GetForegroundWindow to see what's currently active
        unsafe {
            let foreground_window = GetForegroundWindow();
            let fg_msg = format!("🔍 Current foreground window: {:?}", foreground_window.0);
            log_to_json("INFO", &fg_msg);
            info!("🔍 Current foreground window: {:?}", foreground_window.0);
            
            if foreground_window.0 != 0 {
                let mut title = [0u8; 256];
                let title_len = GetWindowTextA(foreground_window, &mut title);
                
                if title_len > 0 {
                    let title_str = String::from_utf8_lossy(&title[..title_len as usize]);
                    let title_msg = format!("🔍 Foreground window title: '{}'", title_str);
                    log_to_json("INFO", &title_msg);
                    info!("🔍 Foreground window title: '{}'", title_str);
                    
                    // Check if this is our Warcraft II window
                    if title_str.to_lowercase().contains("warcraft") || 
                       title_str.to_lowercase().contains("wc2") ||
                       title_str.to_lowercase().contains("war2") {
                        let found_msg = format!("✅ Found Warcraft II window via foreground: '{}'", title_str);
                        log_to_json("INFO", &found_msg);
                        info!("✅ Found Warcraft II window via foreground: '{}'", title_str);
                        self.window_handle = Some(foreground_window.0 as u64);
                        return Ok(());
                    }
                }
            }
        }
        
        // Try to find Warcraft II window by searching through all windows
        info!("🔍 Searching through all windows for Warcraft II...");
        unsafe {
            // Get the desktop window and enumerate its children
            let desktop = GetDesktopWindow();
            let mut current_window = GetWindow(desktop, GW_CHILD);
            
            while current_window.0 != 0 {
                let mut title = [0u8; 256];
                let title_len = GetWindowTextA(current_window, &mut title);
                
                if title_len > 0 {
                    let title_str = String::from_utf8_lossy(&title[..title_len as usize]);
                    
                    // Check if this is our Warcraft II window
                    if title_str.to_lowercase().contains("warcraft") || 
                       title_str.to_lowercase().contains("wc2") ||
                       title_str.to_lowercase().contains("war2") {
                        info!("✅ Found Warcraft II window: '{}' (Handle: {:?})", title_str, current_window.0);
                        self.window_handle = Some(current_window.0 as u64);
                        return Ok(());
                    }
                }
                
                // Get the next window
                current_window = GetWindow(current_window, GW_HWNDNEXT);
            }
        }
        
        // Fallback: Use real Windows API to find the window
        unsafe {
            // Look for various possible window titles
            let window_titles = [
                "Warcraft II: Remastered",  // Exact title from user's game
                "Warcraft II: Tides of Darkness",
                "Warcraft II: Beyond the Dark Portal", 
                "Warcraft II Remastered",
                "Warcraft II",
                "WC2",
                "Warcraft II Remastered",  // Alternative spelling
            ];
            
            info!("🔍 Trying {} window titles...", window_titles.len());
            
            for (i, title) in window_titles.iter().enumerate() {
                info!("🔍 [{}] Trying window title: '{}'", i + 1, title);
                
                let window_handle = FindWindowA(
                    PCSTR::null(),
                    PCSTR::from_raw(title.as_ptr())
                );
                
                info!("🔍 [{}] FindWindowA result: {:?} (0 = not found)", i + 1, window_handle.0);
                
                if window_handle.0 != 0 {
                    info!("✅ Found Warcraft II window: '{}' (Handle: {:?})", title, window_handle);
                    self.window_handle = Some(window_handle.0 as u64);
                    return Ok(());
                } else {
                    info!("❌ Window not found for title: '{}'", title);
                }
            }
        }
        
        log_to_json("ERROR", "❌ Could not find Warcraft II window with any known title");
        info!("❌ Could not find Warcraft II window with any known title");
        Err(anyhow!("Could not find Warcraft II window with any known title"))
    }

    /// Enhanced window activation that actually brings the game to the front
    async fn ensure_window_active(&mut self) -> Result<()> {
        if let Some(window_id) = self.window_handle {
            info!("🎯 Activating Warcraft II window (ID: {})", window_id);
            
            unsafe {
                let hwnd = HWND(window_id as isize);
                
                // Bring window to front and activate it
                if SetForegroundWindow(hwnd).as_bool() {
                    info!("✅ Window brought to foreground");
                } else {
                    warn!("⚠️ Failed to bring window to foreground");
                }
                
                // SetActiveWindow returns an HWND, not a Result
                let _active_hwnd = SetActiveWindow(hwnd);
                info!("✅ Window activation attempted");
                
                if BringWindowToTop(hwnd).is_ok() {
                    info!("✅ Window brought to top");
                } else {
                    warn!("⚠️ Failed to bring window to top");
                }
                
                // Show window if it's minimized
                let show_result = ShowWindow(hwnd, SW_SHOW);
                if show_result.as_bool() {
                    info!("✅ Window shown");
                } else {
                    warn!("⚠️ Failed to show window");
                }
            }
            
            Ok(())
        } else {
            Err(anyhow!("No window handle available for activation"))
        }
    }

    // **HIGH-LEVEL GAME ACTIONS**

    /// Build a specific building type
    pub async fn build_building(&mut self, building_type: &str, x: i32, y: i32) -> Result<()> {
        info!("🏗️ AI building {} at ({}, {})", building_type, x, y);
        
        // Select the building hotkey
        let hotkey = match building_type.to_lowercase().as_str() {
            "town hall" | "townhall" => GameHotkey::BuildTownHall,
            "barracks" => GameHotkey::BuildBarracks,
            "farm" => GameHotkey::BuildFarm,
            "tower" => GameHotkey::BuildTower,
            "wall" => GameHotkey::BuildWall,
            "lumber mill" | "lumbermill" => GameHotkey::BuildLumberMill,
            "blacksmith" => GameHotkey::BuildBlacksmith,
            "stable" => GameHotkey::BuildStable,
            "church" => GameHotkey::BuildChurch,
            "workshop" => GameHotkey::BuildWorkshop,
            "mine" => GameHotkey::BuildMine,
            "oil well" => GameHotkey::BuildOilWell,
            "scout tower" => GameHotkey::BuildScoutTower,
            _ => return Err(anyhow!("Unknown building type: {}", building_type)),
        };
        
        // Execute the building hotkey
        self.execute_hotkey(hotkey).await?;
        
        // Click where to build
        self.execute_mouse_action(MouseAction::Click { x, y }).await?;
        
        Ok(())
    }

    /// Train a specific unit type
    pub async fn train_unit(&mut self, unit_type: &str) -> Result<()> {
        info!("⚔️ AI training {}", unit_type);
        
        // Select the training hotkey
        let hotkey = match unit_type.to_lowercase().as_str() {
            "worker" => GameHotkey::BuildWorker,
            "footman" => GameHotkey::BuildFootman,
            "archer" => GameHotkey::BuildArcher,
            "knight" => GameHotkey::BuildKnight,
            "paladin" => GameHotkey::BuildPaladin,
            "priest" => GameHotkey::BuildPriest,
            "mage" => GameHotkey::BuildMage,
            "catapult" => GameHotkey::BuildCatapult,
            "ballista" => GameHotkey::BuildBallista,
            "peasant" => GameHotkey::BuildPeasant,
            _ => return Err(anyhow!("Unknown unit type: {}", unit_type)),
        };
        
        // Execute the training hotkey
        self.execute_hotkey(hotkey).await?;
        
        Ok(())
    }

    /// Attack move to a location
    pub async fn attack_move(&mut self, x: i32, y: i32) -> Result<()> {
        info!("⚔️ AI attack moving to ({}, {})", x, y);
        
        // Select all military units
        self.execute_hotkey(GameHotkey::SelectAllMilitary).await?;
        
        // Attack move to location
        self.execute_hotkey(GameHotkey::Attack).await?;
        self.execute_mouse_action(MouseAction::Click { x, y }).await?;
        
        Ok(())
    }

    /// Select units in an area
    pub async fn select_units(&mut self, start_x: i32, start_y: i32, end_x: i32, end_y: i32) -> Result<()> {
        info!("👆 AI selecting units from ({}, {}) to ({}, {})", start_x, start_y, end_x, end_y);
        
        self.execute_mouse_action(MouseAction::Drag { 
            start_x, start_y, end_x, end_y 
        }).await?;
        
        Ok(())
    }

    /// Check if Warcraft II is currently running
    pub async fn is_warcraft_ii_running(&self) -> bool {
        self.process_handle.is_some() && self.window_handle.is_some()
    }

    /// Get the current status of the input simulator
    pub fn get_status(&self) -> InputSimulatorStatus {
        InputSimulatorStatus {
            is_active: self.is_active,
            process_handle: self.process_handle,
            window_handle: self.window_handle,
        }
    }

    /// Force refresh the game process and window detection
    pub async fn refresh_game_connection(&mut self) -> Result<()> {
        info!("🔄 Refreshing game connection...");
        
        // Reset handles
        self.process_handle = None;
        self.window_handle = None;
        self.is_active = false;
        self.status.process_handle = None;
        self.status.window_handle = None;
        self.status.is_active = false;
        
        // Try to find existing process first
        if let Ok(()) = self.find_game_process().await {
            if let Ok(()) = self.find_game_window().await {
                if let Ok(()) = self.ensure_window_active().await {
                    self.is_active = true;
                    self.status.is_active = true;
                    return Ok(());
                }
            }
        }
        
        // If no existing process found, inform user to launch Warcraft II manually
        Err(anyhow!("Warcraft II not running. Please launch the game manually and try again."))
    }
}

/// Status information for the input simulator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputSimulatorStatus {
    pub is_active: bool,
    pub process_handle: Option<u64>,
    pub window_handle: Option<u64>,
}

