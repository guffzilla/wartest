use std::fs;
use std::path::Path;
use anyhow::Result;

fn main() -> Result<()> {
    println!("Generating sample WC2 replay files...");
    
    // Create sample replays directory
    let sample_dir = Path::new("sample_replays");
    fs::create_dir_all(sample_dir)?;
    
    // Generate sample replay 1
    generate_sample_replay_1(sample_dir)?;
    
    // Generate sample replay 2
    generate_sample_replay_2(sample_dir)?;
    
    println!("Sample replay files generated in 'sample_replays/' directory");
    println!("You can now test the viewer with these files!");
    
    Ok(())
}

fn generate_sample_replay_1(dir: &Path) -> Result<()> {
    let content = r#"{
        "filename": "sample_replay_1.w2r",
        "file_size": 1024,
        "creation_date": "2024-01-15T10:30:00Z",
        "game_version": "1.0.0",
        "map_name": "Sample Map",
        "game_type": "Skirmish",
        "players": [
            {
                "name": "Player1",
                "race": "Human",
                "team": 1,
                "color": "Red",
                "is_winner": true,
                "apm": 120.5
            }
        ],
        "duration": 1800,
        "checksum": "abc123def456"
    }"#;
    
    let file_path = dir.join("sample_replay_1.w2r");
    fs::write(file_path, content)?;
    Ok(())
}

fn generate_sample_replay_2(dir: &Path) -> Result<()> {
    let content = r#"{
        "filename": "sample_replay_2.w2r",
        "file_size": 2048,
        "creation_date": "2024-01-16T14:45:00Z",
        "game_version": "1.0.0",
        "map_name": "Advanced Map",
        "game_type": "Multiplayer",
        "players": [
            {
                "name": "Player1",
                "race": "Human",
                "team": 1,
                "color": "Red",
                "is_winner": false,
                "apm": 95.2
            },
            {
                "name": "Player2",
                "race": "Orc",
                "team": 2,
                "color": "Blue",
                "is_winner": true,
                "apm": 110.8
            }
        ],
        "duration": 2400,
        "checksum": "xyz789uvw012"
    }"#;
    
    let file_path = dir.join("sample_replay_2.w2r");
    fs::write(file_path, content)?;
    Ok(())
}

