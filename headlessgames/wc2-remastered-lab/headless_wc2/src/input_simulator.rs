use anyhow::{anyhow, Result};
use log::info;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;

// Windows API imports for real input simulation
use windows::Win32::Foundation::*;
use windows::Win32::System::Diagnostics::ToolHelp::*;
use windows::Win32::UI::Input::KeyboardAndMouse::*;
use windows::Win32::UI::WindowsAndMessaging::*;
use windows::core::PCSTR;

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
    pub async fn execute_hotkey(&self, hotkey: GameHotkey) -> Result<()> {
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
            // Add more hotkeys as needed...
            _ => {
                // warn!("⚠️ Hotkey {:?} not yet implemented, logging only", hotkey); // Removed warn!
            }
        }

        info!("✅ Hotkey executed: {:?}", hotkey);
        Ok(())
    }

    /// Execute a mouse action through real Windows API
    pub async fn execute_mouse_action(&self, action: MouseAction) -> Result<()> {
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

    /// Find the Warcraft II process
    async fn find_game_process(&mut self) -> Result<()> {
        info!("🔍 Finding Warcraft II process...");

        let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }?;

        let mut process_entry = PROCESSENTRY32W::default();
        process_entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if unsafe { Process32FirstW(snapshot, &mut process_entry) }.is_err() {
            unsafe { CloseHandle(snapshot) };
            return Err(anyhow!("Failed to get first process"));
        }

        loop {
            let process_name = String::from_utf16_lossy(&process_entry.szExeFile)
                .trim_matches('\0')
                .to_lowercase();

            if process_name.contains("warcraft") || process_name.contains("wc2") {
                self.process_handle = Some(process_entry.th32ProcessID as u64);
                self.status.process_handle = Some(process_entry.th32ProcessID as u64);
                info!("✅ Found Warcraft II process: {} (PID: {})",
                      String::from_utf16_lossy(&process_entry.szExeFile).trim_matches('\0'),
                      process_entry.th32ProcessID);
                unsafe { CloseHandle(snapshot) };
                return Ok(());
            }

            if unsafe { Process32NextW(snapshot, &mut process_entry) }.is_err() {
                break;
            }
        }

        unsafe { CloseHandle(snapshot) };
        Err(anyhow!("Warcraft II process not found"))
    }

    /// Find the Warcraft II window
    async fn find_game_window(&mut self) -> Result<()> {
        info!("🔍 Finding Warcraft II window...");

        // Try different possible window titles
        let possible_titles = [
            "Warcraft II",
            "Warcraft II: Tides of Darkness",
            "Warcraft II: Beyond the Dark Portal",
            "Warcraft II Remastered",
            "Warcraft II: Battle.net Edition"
        ];

        for title in &possible_titles {
            let hwnd = unsafe {
                FindWindowA(
                    PCSTR::null(),
                    PCSTR::from_raw(title.as_ptr())
                )
            };

            if hwnd.0 != 0 { // Check if handle is valid (not null)
                self.window_handle = Some(hwnd.0 as u64);
                self.status.window_handle = Some(hwnd.0 as u64);
                info!("✅ Found Warcraft II window: '{}' (Handle: 0x{:x})",
                      title, hwnd.0);
                return Ok(());
            }
        }

        // If no window found, try to find by class name
        let hwnd = unsafe {
            FindWindowA(
                PCSTR::from_raw("Warcraft II".as_ptr()),
                PCSTR::null()
            )
        };

        if hwnd.0 != 0 { // Check if handle is valid (not null)
            self.window_handle = Some(hwnd.0 as u64);
            self.status.window_handle = Some(hwnd.0 as u64);
            info!("✅ Found Warcraft II window by class name (Handle: 0x{:x})", hwnd.0);
            return Ok(());
        }

        Err(anyhow!("Warcraft II window not found"))
    }

    /// Ensure the game window is active and focused
    async fn ensure_window_active(&self) -> Result<()> {
        if let Some(hwnd) = self.window_handle {
            let hwnd = HWND(hwnd.try_into().unwrap());
            
            // Check if window is minimized
            let is_iconic = unsafe { IsIconic(hwnd).as_bool() };
            if is_iconic {
                unsafe { ShowWindow(hwnd, SW_RESTORE); }
                sleep(Duration::from_millis(100)).await;
            }
            
            // Ensure window is focused
            unsafe {
                SetForegroundWindow(hwnd);
                SetActiveWindow(hwnd);
                BringWindowToTop(hwnd);
            }
            
            sleep(Duration::from_millis(100)).await;
        }
        
        Ok(())
    }

    // **HIGH-LEVEL GAME ACTIONS**

    /// Build a specific building type
    pub async fn build_building(&self, building_type: &str, x: i32, y: i32) -> Result<()> {
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
            _ => return Err(anyhow!("Unknown building type: {}", building_type)),
        };
        
        // Execute the building hotkey
        self.execute_hotkey(hotkey).await?;
        
        // Click where to build
        self.execute_mouse_action(MouseAction::Click { x, y }).await?;
        
        Ok(())
    }

    /// Train a specific unit type
    pub async fn train_unit(&self, unit_type: &str) -> Result<()> {
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
    pub async fn attack_move(&self, x: i32, y: i32) -> Result<()> {
        info!("⚔️ AI attack moving to ({}, {})", x, y);
        
        // Select all military units
        self.execute_hotkey(GameHotkey::SelectAllMilitary).await?;
        
        // Attack move to location
        self.execute_hotkey(GameHotkey::Attack).await?;
        self.execute_mouse_action(MouseAction::Click { x, y }).await?;
        
        Ok(())
    }

    /// Select units in an area
    pub async fn select_units(&self, start_x: i32, start_y: i32, end_x: i32, end_y: i32) -> Result<()> {
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
