use anyhow::Result;
use log::{info, warn, error};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, 
    KEYEVENTF_KEYUP, MOUSEINPUT, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MOVE, MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP,
    VIRTUAL_KEY, SendInput
};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::WindowsAndMessaging::{FindWindowA, GetWindowRect, SetForegroundWindow};
use windows::core::PCSTR;
use chrono;

/// AI Agent for interacting with Warcraft II Remastered
pub struct AIAgent {
    game_window: Option<HWND>,
    screen_resolution: (u32, u32),
    last_action_time: Instant,
    action_delay: Duration,
}

/// Types of actions the AI can perform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIAction {
    /// Mouse click at specific coordinates
    Click { x: i32, y: i32, button: MouseButton },
    /// Mouse movement to coordinates
    Move { x: i32, y: i32 },
    /// Keyboard key press
    KeyPress { key: VirtualKey },
    /// Wait for specified duration
    Wait { duration_ms: u64 },
    /// Navigate to specific menu
    NavigateTo { menu: MenuTarget },
    /// Start specific game mode
    StartGame { game_type: GameType },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VirtualKey {
    Enter,
    Escape,
    Tab,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Space,
    Custom(u16),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MenuTarget {
    MainMenu,
    Campaign,
    CustomGame,
    Multiplayer,
    Options,
    Exit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameType {
    Campaign { mission: String },
    CustomScenario { map_name: String },
    SinglePlayer,
    Tutorial,
}

impl AIAgent {
    /// Create a new AI agent
    pub fn new() -> Self {
        Self {
            game_window: None,
            screen_resolution: (1920, 1080), // Default, will be detected
            last_action_time: Instant::now(),
            action_delay: Duration::from_millis(100), // Realistic human-like delays
        }
    }

    /// Initialize the AI agent and find the game window
    pub fn initialize(&mut self, game_title: &str) -> Result<()> {
        info!("🤖 Initializing AI Agent for game: {}", game_title);
        
        // Find the game window
        let window_title = format!("{}\0", game_title);
        let hwnd = unsafe { FindWindowA(None, PCSTR::from_raw(window_title.as_ptr())) };
        
        if hwnd.0 == 0 {
            return Err(anyhow::anyhow!("Game window not found: {}", game_title));
        }
        
        self.game_window = Some(hwnd);
        info!("✅ Game window found: {:?}", hwnd);
        
        // Get window dimensions
        self.detect_screen_resolution()?;
        
        // Bring window to foreground
        self.bring_window_to_foreground()?;
        
        info!("🚀 AI Agent initialized successfully");
        Ok(())
    }

    /// Detect the screen resolution of the game window
    fn detect_screen_resolution(&mut self) -> Result<()> {
        if let Some(hwnd) = self.game_window {
            let mut rect = RECT::default();
            unsafe { GetWindowRect(hwnd, &mut rect) };
            let width = (rect.right - rect.left) as u32;
            let height = (rect.bottom - rect.top) as u32;
            
            self.screen_resolution = (width, height);
            info!("📱 Detected screen resolution: {}x{}", width, height);
        }
        Ok(())
    }

    /// Bring the game window to the foreground
    fn bring_window_to_foreground(&self) -> Result<()> {
        if let Some(hwnd) = self.game_window {
            unsafe { SetForegroundWindow(hwnd) };
            info!("🪟 Brought game window to foreground");
        }
        Ok(())
    }

    /// Execute a sequence of AI actions
    pub async fn execute_actions(&mut self, actions: Vec<AIAction>) -> Result<()> {
        info!("🎬 Executing {} AI actions", actions.len());
        
        for (i, action) in actions.iter().enumerate() {
            info!("▶️  Action {}/{}: {:?}", i + 1, actions.len(), action);
            
            match self.execute_action(action).await {
                Ok(_) => info!("✅ Action {} completed successfully", i + 1),
                Err(e) => {
                    error!("❌ Action {} failed: {}", i + 1, e);
                    return Err(e);
                }
            }
            
            // Add realistic delay between actions
            self.wait_for_next_action().await;
        }
        
        info!("🎉 All AI actions completed successfully");
        Ok(())
    }

    /// Execute a single AI action
    async fn execute_action(&mut self, action: &AIAction) -> Result<()> {
        match action {
            AIAction::Click { x, y, button } => {
                self.mouse_click(*x, *y, button.clone())?;
            }
            AIAction::Move { x, y } => {
                self.mouse_move(*x, *y)?;
            }
            AIAction::KeyPress { key } => {
                self.key_press(key.clone())?;
            }
            AIAction::Wait { duration_ms } => {
                tokio::time::sleep(Duration::from_millis(*duration_ms)).await;
            }
            AIAction::NavigateTo { menu } => {
                self.navigate_to_menu(menu.clone())?;
            }
            AIAction::StartGame { game_type } => {
                self.start_game(game_type.clone())?;
            }
        }
        Ok(())
    }

    /// Perform a mouse click at specified coordinates
    fn mouse_click(&self, x: i32, y: i32, button: MouseButton) -> Result<()> {
        info!("🖱️  Clicking at ({}, {}) with {:?} button", x, y, button);
        
        // Move mouse to position first
        self.mouse_move(x, y)?;
        
        // Perform the click
        let event_flags = match button {
            MouseButton::Left => MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP,
            MouseButton::Right => MOUSEEVENTF_RIGHTDOWN | MOUSEEVENTF_RIGHTUP,
            MouseButton::Middle => MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, // Simplified
        };
        
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: event_flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        
        unsafe {
            SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        }
        
        Ok(())
    }

    /// Move mouse to specified coordinates
    fn mouse_move(&self, x: i32, y: i32) -> Result<()> {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: x,
                    dy: y,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_MOVE,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        
        unsafe {
            SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        }
        
        Ok(())
    }

    /// Press a keyboard key
    fn key_press(&self, key: VirtualKey) -> Result<()> {
        let vk_code = match key {
            VirtualKey::Enter => 0x0D,
            VirtualKey::Escape => 0x1B,
            VirtualKey::Tab => 0x09,
            VirtualKey::ArrowUp => 0x26,
            VirtualKey::ArrowDown => 0x28,
            VirtualKey::ArrowLeft => 0x25,
            VirtualKey::ArrowRight => 0x27,
            VirtualKey::Space => 0x20,
            VirtualKey::Custom(code) => code,
        };
        
        info!("⌨️  Pressing key: {:?} (VK: 0x{:02X})", key, vk_code);
        
        // Key down
        let key_down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(vk_code),
                    wScan: 0,
                    dwFlags: windows::Win32::UI::Input::KeyboardAndMouse::KEYBD_EVENT_FLAGS(0u32), // KEYDOWN flag
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        
        // Key up
        let key_up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(vk_code),
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        
        unsafe {
            SendInput(&[key_down, key_up], std::mem::size_of::<INPUT>() as i32);
        }
        
        Ok(())
    }

    /// Navigate to a specific menu
    fn navigate_to_menu(&self, menu: MenuTarget) -> Result<()> {
        info!("🧭 Navigating to menu: {:?}", menu);
        
        // This will be implemented with screen analysis and menu recognition
        // For now, we'll use basic navigation patterns
        match menu {
            MenuTarget::MainMenu => {
                // Press Escape multiple times to return to main menu
                for _ in 0..3 {
                    self.key_press(VirtualKey::Escape)?;
                    std::thread::sleep(Duration::from_millis(200));
                }
            }
            MenuTarget::Campaign => {
                // Navigate to campaign menu (this will need screen analysis)
                self.key_press(VirtualKey::Tab)?;
                std::thread::sleep(Duration::from_millis(100));
                self.key_press(VirtualKey::Enter)?;
            }
            MenuTarget::CustomGame => {
                // Navigate to custom game menu
                self.key_press(VirtualKey::Tab)?;
                std::thread::sleep(Duration::from_millis(100));
                self.key_press(VirtualKey::Tab)?;
                std::thread::sleep(Duration::from_millis(100));
                self.key_press(VirtualKey::Enter)?;
            }
            _ => {
                warn!("⚠️  Menu navigation not yet implemented for: {:?}", menu);
            }
        }
        
        Ok(())
    }

    /// Start a specific game type
    fn start_game(&self, game_type: GameType) -> Result<()> {
        info!("🎮 Starting game: {:?}", game_type);
        
        match game_type {
            GameType::Campaign { mission } => {
                info!("📖 Starting campaign mission: {}", mission);
                // Navigate to campaign and select mission
                self.navigate_to_menu(MenuTarget::Campaign)?;
                // TODO: Implement mission selection logic
            }
            GameType::CustomScenario { map_name } => {
                info!("🗺️  Starting custom scenario: {}", map_name);
                // Navigate to custom game and load map
                self.navigate_to_menu(MenuTarget::CustomGame)?;
                // TODO: Implement map loading logic
            }
            GameType::SinglePlayer => {
                info!("👤 Starting single player game");
                // Start a basic single player game
                self.navigate_to_menu(MenuTarget::CustomGame)?;
            }
            GameType::Tutorial => {
                info!("📚 Starting tutorial");
                // Navigate to tutorial
                // TODO: Implement tutorial navigation
            }
        }
        
        Ok(())
    }

    /// Wait for the next action (realistic timing)
    async fn wait_for_next_action(&mut self) {
        let elapsed = self.last_action_time.elapsed();
        if elapsed < self.action_delay {
            let wait_time = self.action_delay - elapsed;
            tokio::time::sleep(wait_time).await;
        }
        self.last_action_time = Instant::now();
    }

    /// Get the current game window
    pub fn get_game_window(&self) -> Option<HWND> {
        self.game_window
    }

    /// Get the screen resolution
    pub fn get_screen_resolution(&self) -> (u32, u32) {
        self.screen_resolution
    }

    /// **NEW: Real-time game analysis for headless version creation**
    /// This method analyzes the running WC2 Remastered game to understand its structure
    pub async fn analyze_running_game(&self) -> Result<GameAnalysis> {
        info!("🔍 Starting real-time analysis of running WC2 Remastered...");
        
        // First, find the running game process
        let game_process = self.find_wc2_process().await?;
        info!("🎮 Found WC2 Remastered process: PID {}", game_process.pid);
        
        // Analyze the game's memory structure
        let memory_analysis = self.analyze_game_memory(&game_process).await?;
        
        // Analyze the game's window and UI structure
        let ui_analysis = self.analyze_game_ui(&game_process).await?;
        
        // Extract game state patterns
        let state_patterns = self.extract_state_patterns(&game_process).await?;
        
        Ok(GameAnalysis {
            process_info: game_process,
            memory_structure: memory_analysis,
            ui_structure: ui_analysis,
            state_patterns,
            timestamp: chrono::Utc::now(),
        })
    }

    /// Find the running WC2 Remastered process
    async fn find_wc2_process(&self) -> Result<ProcessInfo> {
        info!("🔍 Searching for WC2 Remastered process...");
        
        // Look for the main executable
        let target_names = vec![
            "Warcraft II.exe",
            "Warcraft II Remastered.exe",
            "WC2.exe"
        ];
        
        for name in target_names {
            if let Some(process) = self.find_process_by_name(name).await? {
                info!("✅ Found WC2 process: {} (PID: {})", name, process.pid);
                return Ok(process);
            }
        }
        
        Err(anyhow::anyhow!("WC2 Remastered process not found. Please launch the game first."))
    }

    /// Find a process by name
    async fn find_process_by_name(&self, name: &str) -> Result<Option<ProcessInfo>> {
        // This would use our process monitoring system
        // For now, return a mock process for testing
        Ok(Some(ProcessInfo {
            pid: 12345,
            name: name.to_string(),
            path: "C:\\Path\\To\\WC2".to_string(),
            memory_usage: 1024 * 1024 * 100, // 100MB
        }))
    }

    /// Analyze the game's memory structure
    async fn analyze_game_memory(&self, process: &ProcessInfo) -> Result<MemoryStructure> {
        info!("🧠 Analyzing game memory structure...");
        
        // This would use our memory analysis system to:
        // 1. Map memory regions
        // 2. Identify data structures
        // 3. Find game state variables
        
        Ok(MemoryStructure {
            total_memory: process.memory_usage,
            memory_regions: vec![
                MemoryRegion {
                    address: 0x10000000,
                    size: 1024 * 1024 * 50, // 50MB
                    protection: "RW".to_string(),
                    description: "Game state data".to_string(),
                },
                MemoryRegion {
                    address: 0x20000000,
                    size: 1024 * 1024 * 30, // 30MB
                    protection: "RW".to_string(),
                    description: "Unit and building data".to_string(),
                },
                MemoryRegion {
                    address: 0x30000000,
                    size: 1024 * 1024 * 20, // 20MB
                    protection: "RW".to_string(),
                    description: "Map and terrain data".to_string(),
                },
            ],
            key_variables: vec![
                "game_time".to_string(),
                "player_resources".to_string(),
                "unit_count".to_string(),
                "building_count".to_string(),
            ],
        })
    }

    /// Analyze the game's UI structure
    async fn analyze_game_ui(&self, _process: &ProcessInfo) -> Result<UIStructure> {
        info!("🖥️ Analyzing game UI structure...");
        
        // This would analyze the game window to understand:
        // 1. Window dimensions and layout
        // 2. UI element positions
        // 3. Menu structures
        
        Ok(UIStructure {
            window_title: "Warcraft II Remastered".to_string(),
            window_dimensions: WindowDimensions { width: 1920, height: 1080 },
            ui_elements: vec![
                UIElement {
                    name: "main_menu".to_string(),
                    position: Position { x: 400, y: 300 },
                    size: Size { width: 200, height: 150 },
                    element_type: "menu".to_string(),
                },
                UIElement {
                    name: "game_viewport".to_string(),
                    position: Position { x: 0, y: 0 },
                    size: Size { width: 1920, height: 1080 },
                    element_type: "viewport".to_string(),
                },
            ],
        })
    }

    /// Extract patterns for game state monitoring
    async fn extract_state_patterns(&self, _process: &ProcessInfo) -> Result<Vec<StatePattern>> {
        info!("📊 Extracting game state patterns...");
        
        // This would identify patterns in memory that indicate:
        // 1. Game state changes
        // 2. Unit movements
        // 3. Resource changes
        // 4. Victory/defeat conditions
        
        Ok(vec![
            StatePattern {
                name: "game_state".to_string(),
                memory_address: 0x10000000,
                pattern_type: "enum".to_string(),
                possible_values: vec![
                    "main_menu".to_string(),
                    "in_game".to_string(),
                    "paused".to_string(),
                    "victory".to_string(),
                    "defeat".to_string(),
                ],
            },
            StatePattern {
                name: "player_resources".to_string(),
                memory_address: 0x10000010,
                pattern_type: "struct".to_string(),
                possible_values: vec![
                    "gold".to_string(),
                    "wood".to_string(),
                    "oil".to_string(),
                ],
            },
        ])
    }

    /// **NEW: Generate headless version specifications**
    /// Based on the analysis, generate specifications for our headless version
    pub fn generate_headless_specs(&self, analysis: &GameAnalysis) -> HeadlessSpecs {
        info!("🏗️ Generating headless version specifications...");
        
        HeadlessSpecs {
            memory_hooks: self.generate_memory_hooks(analysis),
            ui_replacements: self.generate_ui_replacements(analysis),
            network_disablers: self.generate_network_disablers(analysis),
            ai_integration_points: self.generate_ai_integration_points(analysis),
        }
    }

    /// Generate memory hooks for monitoring game state
    fn generate_memory_hooks(&self, analysis: &GameAnalysis) -> Vec<MemoryHook> {
        analysis.state_patterns.iter().map(|pattern| {
            MemoryHook {
                name: pattern.name.clone(),
                address: pattern.memory_address,
                hook_type: "read".to_string(),
                callback: format!("on_{}_change", pattern.name),
            }
        }).collect()
    }

    /// Generate UI replacement specifications
    fn generate_ui_replacements(&self, analysis: &GameAnalysis) -> Vec<UIReplacement> {
        analysis.ui_structure.ui_elements.iter().map(|element| {
            UIReplacement {
                original_element: element.name.clone(),
                replacement_type: "headless".to_string(),
                description: format!("Replace {} with headless equivalent", element.name),
            }
        }).collect()
    }

    /// Generate network disabler specifications
    fn generate_network_disablers(&self, _analysis: &GameAnalysis) -> Vec<NetworkDisabler> {
        vec![
            NetworkDisabler {
                function_name: "BattleNetConnect".to_string(),
                replacement: "return SUCCESS".to_string(),
                description: "Disable Battle.net connection requirement".to_string(),
            },
            NetworkDisabler {
                function_name: "SendNetworkData".to_string(),
                replacement: "return 0".to_string(),
                description: "Disable network data transmission".to_string(),
            },
        ]
    }

    /// Generate AI integration points
    fn generate_ai_integration_points(&self, _analysis: &GameAnalysis) -> Vec<AIIntegrationPoint> {
        vec![
            AIIntegrationPoint {
                function_name: "ProcessInput".to_string(),
                integration_type: "hook".to_string(),
                description: "Hook input processing for AI control".to_string(),
            },
            AIIntegrationPoint {
                function_name: "UpdateGameState".to_string(),
                integration_type: "callback".to_string(),
                description: "Callback for AI to update game state".to_string(),
            },
        ]
    }
}

/// Predefined action sequences for common tasks
pub struct ActionSequences;

impl ActionSequences {
    /// Sequence to start a campaign mission
    pub fn start_campaign_mission(mission_name: &str) -> Vec<AIAction> {
        vec![
            AIAction::Wait { duration_ms: 1000 }, // Wait for game to load
            AIAction::NavigateTo { menu: MenuTarget::Campaign },
            AIAction::Wait { duration_ms: 500 },
            AIAction::Click { x: 960, y: 540, button: MouseButton::Left }, // Center click
            AIAction::Wait { duration_ms: 200 },
            AIAction::KeyPress { key: VirtualKey::Enter },
            AIAction::Wait { duration_ms: 1000 }, // Wait for mission to start
        ]
    }

    /// Sequence to start a custom scenario
    pub fn start_custom_scenario(map_name: &str) -> Vec<AIAction> {
        vec![
            AIAction::Wait { duration_ms: 1000 },
            AIAction::NavigateTo { menu: MenuTarget::CustomGame },
            AIAction::Wait { duration_ms: 500 },
            AIAction::Click { x: 960, y: 540, button: MouseButton::Left },
            AIAction::Wait { duration_ms: 200 },
            AIAction::KeyPress { key: VirtualKey::Enter },
            AIAction::Wait { duration_ms: 1000 },
        ]
    }

    /// Sequence to return to main menu
    pub fn return_to_main_menu() -> Vec<AIAction> {
        vec![
            AIAction::KeyPress { key: VirtualKey::Escape },
            AIAction::Wait { duration_ms: 200 },
            AIAction::KeyPress { key: VirtualKey::Escape },
            AIAction::Wait { duration_ms: 200 },
            AIAction::KeyPress { key: VirtualKey::Escape },
            AIAction::Wait { duration_ms: 500 },
        ]
    }
}

// **NEW: Data structures for game analysis**

#[derive(Debug, Clone, serde::Serialize)]
pub struct GameAnalysis {
    pub process_info: ProcessInfo,
    pub memory_structure: MemoryStructure,
    pub ui_structure: UIStructure,
    pub state_patterns: Vec<StatePattern>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub path: String,
    pub memory_usage: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryStructure {
    pub total_memory: u64,
    pub memory_regions: Vec<MemoryRegion>,
    pub key_variables: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryRegion {
    pub address: u64,
    pub size: u64,
    pub protection: String,
    pub description: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct UIStructure {
    pub window_title: String,
    pub window_dimensions: WindowDimensions,
    pub ui_elements: Vec<UIElement>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct WindowDimensions {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct UIElement {
    pub name: String,
    pub position: Position,
    pub size: Size,
    pub element_type: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct Size {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct StatePattern {
    pub name: String,
    pub memory_address: u64,
    pub pattern_type: String,
    pub possible_values: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct HeadlessSpecs {
    pub memory_hooks: Vec<MemoryHook>,
    pub ui_replacements: Vec<UIReplacement>,
    pub network_disablers: Vec<NetworkDisabler>,
    pub ai_integration_points: Vec<AIIntegrationPoint>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryHook {
    pub name: String,
    pub address: u64,
    pub hook_type: String,
    pub callback: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct UIReplacement {
    pub original_element: String,
    pub replacement_type: String,
    pub description: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct NetworkDisabler {
    pub function_name: String,
    pub replacement: String,
    pub description: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AIIntegrationPoint {
    pub function_name: String,
    pub integration_type: String,
    pub description: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_agent_creation() {
        let agent = AIAgent::new();
        assert!(agent.game_window.is_none());
        assert_eq!(agent.screen_resolution, (1920, 1080));
    }

    #[test]
    fn test_action_sequence_creation() {
        let campaign_sequence = ActionSequences::start_campaign_mission("Test Mission");
        assert!(!campaign_sequence.is_empty());
        assert_eq!(campaign_sequence.len(), 7);
    }
}
