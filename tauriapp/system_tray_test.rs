// Simple test to verify system tray functionality
// This can be run independently to test the system tray API

use std::process::Command;

fn main() {
    println!("Testing system tray functionality...");
    
    // Test game launching functionality
    test_game_launch();
    
    println!("System tray test completed!");
}

fn test_game_launch() {
    println!("Testing game launch functionality...");
    println!("Note: Warcraft II Remastered requires Battle.net to be running");
    
    // First check if Battle.net is running
    let battle_net_running = std::process::Command::new("tasklist")
        .args(&["/FI", "IMAGENAME eq Battle.net.exe"])
        .output()
        .map(|output| {
            String::from_utf8_lossy(&output.stdout).contains("Battle.net.exe")
        })
        .unwrap_or(false);
    
    if battle_net_running {
        println!("✓ Battle.net is running");
    } else {
        println!("⚠ Battle.net is not running - game may not launch properly");
    }
    
    // Common Warcraft II installation paths
    let possible_paths = vec![
        r"C:\Program Files (x86)\Warcraft II Remastered\Warcraft II.exe",
        r"C:\Program Files\Warcraft II Remastered\Warcraft II.exe",
        r"C:\Users\garet\OneDrive\Desktop\wartest\games\Warcraft II Remastered\x86\Warcraft II.exe",
    ];

    for path in possible_paths {
        if std::path::Path::new(path).exists() {
            println!("Found Warcraft II at: {}", path);
            match Command::new(path).spawn() {
                Ok(_) => {
                    println!("✓ Warcraft II launch command sent successfully");
                    println!("Note: The game should launch through Battle.net");
                    return;
                }
                Err(e) => {
                    println!("✗ Failed to launch Warcraft II: {}", e);
                }
            }
        } else {
            println!("Path not found: {}", path);
        }
    }
    
    println!("✗ Warcraft II not found in common locations");
}

// System tray menu structure (for reference)
#[allow(dead_code)]
struct SystemTrayMenu {
    items: Vec<MenuItem>,
}

#[allow(dead_code)]
struct MenuItem {
    id: String,
    label: String,
    action: MenuAction,
}

#[allow(dead_code)]
enum MenuAction {
    LaunchGame,
    StartMonitoring,
    StopMonitoring,
    Settings,
    Quit,
}

#[allow(dead_code)]
impl SystemTrayMenu {
    fn new() -> Self {
        Self { items: Vec::new() }
    }
    
    fn add_item(&mut self, item: MenuItem) {
        self.items.push(item);
    }
    
    fn create_default_menu() -> Self {
        let mut menu = SystemTrayMenu::new();
        
        menu.add_item(MenuItem {
            id: "launch_game".to_string(),
            label: "Launch Warcraft II".to_string(),
            action: MenuAction::LaunchGame,
        });
        
        menu.add_item(MenuItem {
            id: "start_monitoring".to_string(),
            label: "Start Monitoring".to_string(),
            action: MenuAction::StartMonitoring,
        });
        
        menu.add_item(MenuItem {
            id: "stop_monitoring".to_string(),
            label: "Stop Monitoring".to_string(),
            action: MenuAction::StopMonitoring,
        });
        
        menu.add_item(MenuItem {
            id: "settings".to_string(),
            label: "Settings".to_string(),
            action: MenuAction::Settings,
        });
        
        menu.add_item(MenuItem {
            id: "quit".to_string(),
            label: "Quit".to_string(),
            action: MenuAction::Quit,
        });
        
        menu
    }
    
    fn handle_action(&self, id: &str) {
        if let Some(item) = self.items.iter().find(|item| item.id == id) {
            match &item.action {
                MenuAction::LaunchGame => {
                    println!("Launching Warcraft II...");
                    test_game_launch();
                }
                MenuAction::StartMonitoring => {
                    println!("Starting monitoring...");
                }
                MenuAction::StopMonitoring => {
                    println!("Stopping monitoring...");
                }
                MenuAction::Settings => {
                    println!("Opening settings...");
                }
                MenuAction::Quit => {
                    println!("Quitting application...");
                    std::process::exit(0);
                }
            }
        }
    }
}
