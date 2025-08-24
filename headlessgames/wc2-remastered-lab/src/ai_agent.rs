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
