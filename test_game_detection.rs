use std::path::PathBuf;
use std::collections::HashMap;

// Simple test to verify game detection logic
fn main() {
    println!("Testing game detection logic...");
    
    // Test paths that should be detected
    let test_paths = vec![
        "C:\\Users\\garet\\OneDrive\\Desktop\\wartest\\games\\Warcraft I Remastered\\x86",
        "C:\\Users\\garet\\OneDrive\\Desktop\\wartest\\games\\Warcraft II Remastered\\x86",
        "C:\\Program Files\\Warcraft II",
        "C:\\Games\\Warcraft III",
    ];
    
    for path_str in test_paths {
        let path = PathBuf::from(path_str);
        println!("Testing path: {}", path_str);
        
        // Check if path exists
        if path.exists() {
            println!("  ✅ Path exists");
            
            // Check if it contains game executables
            if let Ok(entries) = std::fs::read_dir(&path) {
                let mut found_exe = false;
                for entry in entries {
                    if let Ok(entry) = entry {
                        if let Some(file_name) = entry.file_name().to_str() {
                            if is_warcraft_executable(file_name) {
                                println!("  ✅ Found executable: {}", file_name);
                                found_exe = true;
                                break;
                            }
                        }
                    }
                }
                if !found_exe {
                    println!("  ⚠️  No game executables found");
                }
            }
        } else {
            println!("  ❌ Path does not exist");
        }
        println!();
    }
}

fn is_warcraft_executable(filename: &str) -> bool {
    let warcraft_executables = vec![
        "Warcraft.exe",
        "Warcraft II.exe", 
        "Warcraft II BNE.exe",
        "Warcraft III.exe",
        "Frozen Throne.exe",
        "War2.exe",
        "War3.exe",
        "WarcraftII.exe",
        "WarcraftIII.exe",
        "Warcraft2.exe",
        "Warcraft3.exe",
        "WC2.exe",
        "WC3.exe",
    ];
    
    warcraft_executables.iter().any(|&exe| filename.eq_ignore_ascii_case(exe))
}
