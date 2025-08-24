use std::path::{Path, PathBuf};
use std::collections::HashMap;
use anyhow::{Result, Context};

/// Game data for Warcraft III
pub struct GameData {
    /// Game installation path
    game_path: PathBuf,
    /// Cached data
    cache: HashMap<String, Vec<u8>>,
    /// Data file paths
    data_files: Vec<PathBuf>,
}

impl GameData {
    /// Create new game data from game installation path
    pub fn new<P: AsRef<Path>>(game_path: P) -> Result<Self> {
        let game_path = game_path.as_ref().to_path_buf();
        
        if !game_path.exists() {
            return Err(anyhow::anyhow!("Game path does not exist: {}", game_path.display()));
        }

        let mut data = Self {
            game_path,
            cache: HashMap::new(),
            data_files: Vec::new(),
        };

        // Scan for data files
        data.scan_data_files()?;
        
        Ok(data)
    }

    /// Scan for data files in the game directory
    fn scan_data_files(&mut self) -> Result<()> {
        self.data_files.clear();
        
        let data_dir = self.game_path.join("Data");
        if data_dir.exists() && data_dir.is_dir() {
            for entry in std::fs::read_dir(&data_dir)
                .with_context(|| format!("Failed to read data directory: {}", data_dir.display()))? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_file() {
                    self.data_files.push(path);
                }
            }
        }

        Ok(())
    }

    /// Get the game installation path
    pub fn game_path(&self) -> &Path {
        &self.game_path
    }

    /// Get list of data files
    pub fn get_data_files(&self) -> &[PathBuf] {
        &self.data_files
    }

    /// Get unit count (placeholder implementation)
    pub fn get_unit_count(&self) -> Result<usize> {
        // This would parse actual game data files
        // For now, return a placeholder value
        Ok(50) // Warcraft III has approximately 50 unit types
    }

    /// Get unit types (placeholder implementation)
    pub fn get_unit_types(&self) -> Result<Vec<String>> {
        // This would parse actual unit data
        // For now, return placeholder values
        Ok(vec![
            "Peasant".to_string(),
            "Footman".to_string(),
            "Knight".to_string(),
            "Archer".to_string(),
            "Ranger".to_string(),
            "Paladin".to_string(),
            "Mage".to_string(),
            "Priest".to_string(),
            "Sorceress".to_string(),
            "Spell Breaker".to_string(),
            "Dragonhawk Rider".to_string(),
            "Gryphon Rider".to_string(),
            "Mortar Team".to_string(),
            "Flying Machine".to_string(),
            "Steam Tank".to_string(),
            "Peon".to_string(),
            "Grunt".to_string(),
            "Troll Headhunter".to_string(),
            "Troll Berserker".to_string(),
            "Raider".to_string(),
            "Kodo Beast".to_string(),
            "Wind Rider".to_string(),
            "Tauren".to_string(),
            "Shaman".to_string(),
            "Witch Doctor".to_string(),
            "Spirit Walker".to_string(),
            "Acolyte".to_string(),
            "Ghoul".to_string(),
            "Crypt Fiend".to_string(),
            "Gargoyle".to_string(),
            "Abomination".to_string(),
            "Necromancer".to_string(),
            "Banshee".to_string(),
            "Meat Wagon".to_string(),
            "Frost Wyrm".to_string(),
            "Wisp".to_string(),
            "Archer".to_string(),
            "Huntress".to_string(),
            "Dryad".to_string(),
            "Druid of the Claw".to_string(),
            "Druid of the Talon".to_string(),
            "Hippogryph".to_string(),
            "Chimaera".to_string(),
            "Mountain Giant".to_string(),
            "Faerie Dragon".to_string(),
            "Keeper of the Grove".to_string(),
            "Priestess of the Moon".to_string(),
        ])
    }

    /// Get unit races (placeholder implementation)
    pub fn get_unit_races(&self) -> Result<Vec<String>> {
        Ok(vec![
            "Human".to_string(),
            "Orc".to_string(),
            "Undead".to_string(),
            "Night Elf".to_string(),
        ])
    }

    /// Get map count (placeholder implementation)
    pub fn get_map_count(&self) -> Result<usize> {
        // This would count actual map files
        Ok(self.data_files.len())
    }

    /// Get map sizes (placeholder implementation)
    pub fn get_map_sizes(&self) -> Result<Vec<u64>> {
        // This would parse actual map files
        // For now, return placeholder values
        Ok(vec![
            64 * 64,   // 64x64 map
            96 * 96,   // 96x96 map
            128 * 128, // 128x128 map
            256 * 256, // 256x256 map
        ])
    }

    /// Get campaign count (placeholder implementation)
    pub fn get_campaign_count(&self) -> Result<usize> {
        // Warcraft III has 4 campaigns (Human, Orc, Undead, Night Elf)
        Ok(4)
    }

    /// Get campaign missions (placeholder implementation)
    pub fn get_campaign_missions(&self) -> Result<Vec<String>> {
        Ok(vec![
            "Human Campaign - Prologue".to_string(),
            "Human Campaign - Chapter 1".to_string(),
            "Human Campaign - Chapter 2".to_string(),
            "Human Campaign - Chapter 3".to_string(),
            "Human Campaign - Chapter 4".to_string(),
            "Human Campaign - Chapter 5".to_string(),
            "Human Campaign - Chapter 6".to_string(),
            "Human Campaign - Chapter 7".to_string(),
            "Orc Campaign - Chapter 1".to_string(),
            "Orc Campaign - Chapter 2".to_string(),
            "Orc Campaign - Chapter 3".to_string(),
            "Orc Campaign - Chapter 4".to_string(),
            "Orc Campaign - Chapter 5".to_string(),
            "Orc Campaign - Chapter 6".to_string(),
            "Orc Campaign - Chapter 7".to_string(),
            "Undead Campaign - Chapter 1".to_string(),
            "Undead Campaign - Chapter 2".to_string(),
            "Undead Campaign - Chapter 3".to_string(),
            "Undead Campaign - Chapter 4".to_string(),
            "Undead Campaign - Chapter 5".to_string(),
            "Undead Campaign - Chapter 6".to_string(),
            "Undead Campaign - Chapter 7".to_string(),
            "Night Elf Campaign - Chapter 1".to_string(),
            "Night Elf Campaign - Chapter 2".to_string(),
            "Night Elf Campaign - Chapter 3".to_string(),
            "Night Elf Campaign - Chapter 4".to_string(),
            "Night Elf Campaign - Chapter 5".to_string(),
            "Night Elf Campaign - Chapter 6".to_string(),
            "Night Elf Campaign - Chapter 7".to_string(),
        ])
    }

    /// Get multiplayer maps (placeholder implementation)
    pub fn get_multiplayer_maps(&self) -> Result<Vec<String>> {
        Ok(vec![
            "2 Player Map".to_string(),
            "4 Player Map".to_string(),
            "6 Player Map".to_string(),
            "8 Player Map".to_string(),
            "12 Player Map".to_string(),
        ])
    }

    /// Get multiplayer player counts (placeholder implementation)
    pub fn get_multiplayer_player_counts(&self) -> Result<Vec<usize>> {
        Ok(vec![2, 4, 6, 8, 12])
    }

    /// Get asset count (placeholder implementation)
    pub fn get_asset_count(&self) -> Result<usize> {
        Ok(self.data_files.len())
    }

    /// Get asset types (placeholder implementation)
    pub fn get_asset_types(&self) -> Result<Vec<String>> {
        let mut types = Vec::new();
        
        for file in &self.data_files {
            if let Some(ext) = file.extension() {
                if let Some(ext_str) = ext.to_str() {
                    types.push(ext_str.to_lowercase());
                }
            }
        }
        
        types.sort();
        types.dedup();
        Ok(types)
    }

    /// Read a data file
    pub fn read_file(&mut self, path: &Path) -> Result<Vec<u8>> {
        let key = path.to_string_lossy().to_string();
        
        if let Some(cached) = self.cache.get(&key) {
            return Ok(cached.clone());
        }
        
        let data = std::fs::read(path)
            .with_context(|| format!("Failed to read file: {}", path.display()))?;
        
        self.cache.insert(key, data.clone());
        Ok(data)
    }

    /// Check if a file exists
    pub fn file_exists(&self, path: &Path) -> bool {
        path.exists() && path.is_file()
    }

    /// Get file size
    pub fn get_file_size(&self, path: &Path) -> Result<u64> {
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for {}", path.display()))?;
        Ok(metadata.len())
    }

    /// Clear cache
    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    /// Get cache size
    pub fn cache_size(&self) -> usize {
        self.cache.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_game_data_new() {
        let temp_dir = tempdir().unwrap();
        let game_data = GameData::new(temp_dir.path());
        assert!(game_data.is_ok());
    }

    #[test]
    fn test_game_data_new_invalid_path() {
        let game_data = GameData::new("/nonexistent/path");
        assert!(game_data.is_err());
    }

    #[test]
    fn test_get_unit_count() {
        let temp_dir = tempdir().unwrap();
        let game_data = GameData::new(temp_dir.path()).unwrap();
        let unit_count = game_data.get_unit_count().unwrap();
        assert_eq!(unit_count, 50);
    }

    #[test]
    fn test_get_campaign_count() {
        let temp_dir = tempdir().unwrap();
        let game_data = GameData::new(temp_dir.path()).unwrap();
        let campaign_count = game_data.get_campaign_count().unwrap();
        assert_eq!(campaign_count, 4);
    }

    #[test]
    fn test_get_unit_races() {
        let temp_dir = tempdir().unwrap();
        let game_data = GameData::new(temp_dir.path()).unwrap();
        let races = game_data.get_unit_races().unwrap();
        assert_eq!(races.len(), 4);
        assert!(races.contains(&"Human".to_string()));
        assert!(races.contains(&"Orc".to_string()));
        assert!(races.contains(&"Undead".to_string()));
        assert!(races.contains(&"Night Elf".to_string()));
    }
}
