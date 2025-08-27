use crate::file_parsers::{FileParser, grp_parser::GrpParser};
use anyhow::Result;
use bson::{doc, Document};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use chrono;

/// WC2 Unit data structure for MongoDB
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WC2Unit {
    pub _id: String,                    // MongoDB ObjectId will be auto-generated
    pub name: String,
    pub display_name: String,
    pub unit_type: String,              // "human", "orc", "neutral"
    pub category: String,               // "unit", "building", "hero"
    pub health: Option<u32>,
    pub damage: Option<u32>,
    pub armor: Option<u32>,
    pub speed: Option<f32>,
    pub mana: Option<u32>,
    pub cost: Option<UnitCost>,
    pub abilities: Vec<String>,
    pub spells: Vec<String>,
    pub build_time: Option<u32>,
    pub produces: Vec<String>,
    pub upgrades: Vec<String>,
    pub image_path: Option<String>,
    pub sprite_data: Option<SpriteData>,
    pub description: Option<String>,
    pub lore: Option<String>,
}

/// Unit cost structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitCost {
    pub gold: u32,
    pub lumber: u32,
    pub food: u32,
}

/// Sprite data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpriteData {
    pub width: u16,
    pub height: u16,
    pub frame_count: u16,
    pub file_path: String,
}

/// WC2 Asset Extractor
pub struct WC2Extractor {
    game_path: PathBuf,
    output_path: PathBuf,
    units: Vec<WC2Unit>,
    images_extracted: Vec<String>,
}

impl WC2Extractor {
    pub fn new(game_path: &str, output_path: &str) -> Self {
        Self {
            game_path: PathBuf::from(game_path),
            output_path: PathBuf::from(output_path),
            units: Vec::new(),
            images_extracted: Vec::new(),
        }
    }

    /// Extract all WC2 assets
    pub fn extract_all(&mut self) -> Result<()> {
        println!("Starting WC2 asset extraction...");
        
        // Create output directories
        self.create_output_directories()?;
        
        // Extract units and buildings
        self.extract_units_and_buildings()?;
        
        // Extract spells and abilities
        self.extract_spells_and_abilities()?;
        
        // Extract terrain tiles and tilesets
        self.extract_terrain_tiles()?;
        
        // Extract images
        self.extract_all_images()?;
        
        // Generate MongoDB documents
        self.generate_mongodb_documents()?;
        
        // Generate terrain tile mapping for TMapX
        self.generate_terrain_mapping()?;
        
        println!("WC2 asset extraction complete!");
        println!("Extracted {} units/buildings", self.units.len());
        println!("Extracted {} images", self.images_extracted.len());
        
        Ok(())
    }

    fn create_output_directories(&self) -> Result<()> {
        let dirs = [
            "units",
            "buildings", 
            "spells",
            "images",
            "images/animations",
            "images/portraits", 
            "images/classic",
            "images/remastered",
            "mongodb"
        ];
        
        for dir in &dirs {
            let path = self.output_path.join(dir);
            std::fs::create_dir_all(&path)?;
        }
        
        Ok(())
    }

    fn extract_units_and_buildings(&mut self) -> Result<()> {
        println!("Extracting units and buildings...");
        
        // Define known WC2 units and buildings (more extensive than WC1)
        let human_units = [
            ("peasant", "Peasant", "unit", "human", 60, 2, 0, 1.0, 0, (75, 0, 1)),
            ("footman", "Footman", "unit", "human", 120, 12, 2, 1.0, 0, (135, 0, 1)),
            ("knight", "Knight", "unit", "human", 180, 20, 6, 1.0, 0, (400, 0, 2)),
            ("archer", "Archer", "unit", "human", 60, 8, 0, 1.0, 0, (130, 0, 1)),
            ("ranger", "Ranger", "unit", "human", 90, 12, 0, 1.0, 0, (200, 0, 1)),
            ("paladin", "Paladin", "unit", "human", 240, 25, 8, 1.0, 0, (800, 0, 3)),
            ("cleric", "Cleric", "unit", "human", 60, 4, 0, 1.0, 200, (160, 0, 1)),
            ("conjurer", "Conjurer", "unit", "human", 80, 6, 0, 1.0, 400, (200, 0, 1)),
            ("wizard", "Wizard", "unit", "human", 100, 8, 0, 1.0, 600, (300, 0, 1)),
            ("catapult", "Catapult", "unit", "human", 200, 80, 0, 0.5, 0, (800, 0, 4)),
            ("ballista", "Ballista", "unit", "human", 150, 60, 0, 0.5, 0, (600, 0, 3)),
            ("gryphon_rider", "Gryphon Rider", "unit", "human", 120, 16, 0, 1.5, 0, (500, 0, 2)),
        ];

        let human_buildings = [
            ("townhall", "Town Hall", "building", "human", 2400, 0, 0, 0.0, 0, (400, 0, 0)),
            ("farm", "Farm", "building", "human", 1000, 0, 0, 0.0, 0, (75, 0, 0)),
            ("barracks", "Barracks", "building", "human", 1600, 0, 0, 0.0, 0, (180, 0, 0)),
            ("lumbermill", "Lumber Mill", "building", "human", 1200, 0, 0, 0.0, 0, (100, 0, 0)),
            ("blacksmith", "Blacksmith", "building", "human", 1400, 0, 0, 0.0, 0, (150, 0, 0)),
            ("church", "Church", "building", "human", 1200, 0, 0, 0.0, 0, (200, 0, 0)),
            ("tower", "Guard Tower", "building", "human", 1600, 0, 0, 0.0, 0, (120, 0, 0)),
            ("cannon_tower", "Cannon Tower", "building", "human", 2000, 0, 0, 0.0, 0, (200, 0, 0)),
            ("stables", "Stables", "building", "human", 1400, 0, 0, 0.0, 0, (200, 0, 0)),
            ("workshop", "Workshop", "building", "human", 1600, 0, 0, 0.0, 0, (250, 0, 0)),
            ("gryphon_aviary", "Gryphon Aviary", "building", "human", 1800, 0, 0, 0.0, 0, (300, 0, 0)),
        ];

        let orc_units = [
            ("peon", "Peon", "unit", "orc", 60, 2, 0, 1.0, 0, (75, 0, 1)),
            ("grunt", "Grunt", "unit", "orc", 140, 14, 2, 1.0, 0, (140, 0, 1)),
            ("raider", "Raider", "unit", "orc", 180, 20, 4, 1.0, 0, (400, 0, 2)),
            ("spearman", "Spearman", "unit", "orc", 80, 10, 0, 1.0, 0, (140, 0, 1)),
            ("berserker", "Berserker", "unit", "orc", 120, 15, 0, 1.0, 0, (200, 0, 1)),
            ("ogre", "Ogre", "unit", "orc", 300, 30, 8, 1.0, 0, (800, 0, 3)),
            ("necrolyte", "Necrolyte", "unit", "orc", 60, 4, 0, 1.0, 200, (160, 0, 1)),
            ("warlock", "Warlock", "unit", "orc", 80, 6, 0, 1.0, 400, (200, 0, 1)),
            ("death_knight", "Death Knight", "unit", "orc", 100, 8, 0, 1.0, 600, (300, 0, 1)),
            ("catapult", "Catapult", "unit", "orc", 200, 80, 0, 0.5, 0, (800, 0, 4)),
            ("ballista", "Ballista", "unit", "orc", 150, 60, 0, 0.5, 0, (600, 0, 3)),
            ("wyvern_rider", "Wyvern Rider", "unit", "orc", 120, 16, 0, 1.5, 0, (500, 0, 2)),
        ];

        let orc_buildings = [
            ("greathall", "Great Hall", "building", "orc", 2400, 0, 0, 0.0, 0, (400, 0, 0)),
            ("farm", "Farm", "building", "orc", 1000, 0, 0, 0.0, 0, (75, 0, 0)),
            ("barracks", "Barracks", "building", "orc", 1600, 0, 0, 0.0, 0, (180, 0, 0)),
            ("lumbermill", "Lumber Mill", "building", "orc", 1200, 0, 0, 0.0, 0, (100, 0, 0)),
            ("blacksmith", "Blacksmith", "building", "orc", 1400, 0, 0, 0.0, 0, (150, 0, 0)),
            ("temple", "Temple", "building", "orc", 1200, 0, 0, 0.0, 0, (200, 0, 0)),
            ("tower", "Guard Tower", "building", "orc", 1600, 0, 0, 0.0, 0, (120, 0, 0)),
            ("cannon_tower", "Cannon Tower", "building", "orc", 2000, 0, 0, 0.0, 0, (200, 0, 0)),
            ("kennels", "Kennels", "building", "orc", 1400, 0, 0, 0.0, 0, (200, 0, 0)),
            ("workshop", "Workshop", "building", "orc", 1600, 0, 0, 0.0, 0, (250, 0, 0)),
            ("wyvern_roost", "Wyvern Roost", "building", "orc", 1800, 0, 0, 0.0, 0, (300, 0, 0)),
        ];

        // Add all units and buildings
        for (id, name, category, unit_type, health, damage, armor, speed, mana, (gold, lumber, food)) in human_units.iter() {
            self.add_unit(id, name, category, unit_type, *health, *damage, *armor, *speed, *mana, *gold, *lumber, *food);
        }

        for (id, name, category, unit_type, health, damage, armor, speed, mana, (gold, lumber, food)) in human_buildings.iter() {
            self.add_unit(id, name, category, unit_type, *health, *damage, *armor, *speed, *mana, *gold, *lumber, *food);
        }

        for (id, name, category, unit_type, health, damage, armor, speed, mana, (gold, lumber, food)) in orc_units.iter() {
            self.add_unit(id, name, category, unit_type, *health, *damage, *armor, *speed, *mana, *gold, *lumber, *food);
        }

        for (id, name, category, unit_type, health, damage, armor, speed, mana, (gold, lumber, food)) in orc_buildings.iter() {
            self.add_unit(id, name, category, unit_type, *health, *damage, *armor, *speed, *mana, *gold, *lumber, *food);
        }

        Ok(())
    }

    fn add_unit(&mut self, id: &str, name: &str, category: &str, unit_type: &str, 
                health: u32, damage: u32, armor: u32, speed: f32, mana: u32, 
                gold: u32, lumber: u32, food: u32) {
        let unit = WC2Unit {
            _id: id.to_string(),
            name: id.to_string(),
            display_name: name.to_string(),
            unit_type: unit_type.to_string(),
            category: category.to_string(),
            health: Some(health),
            damage: Some(damage),
            armor: Some(armor),
            speed: Some(speed),
            mana: if mana > 0 { Some(mana) } else { None },
            cost: Some(UnitCost { gold, lumber, food }),
            abilities: Vec::new(),
            spells: Vec::new(),
            build_time: None,
            produces: Vec::new(),
            upgrades: Vec::new(),
            image_path: None,
            sprite_data: None,
            description: None,
            lore: None,
        };
        
        self.units.push(unit);
    }

    fn extract_spells_and_abilities(&mut self) -> Result<()> {
        println!("Extracting spells and abilities...");
        
        // Define WC2 spells and abilities (more extensive than WC1)
        let spells = [
            ("heal", "Heal", "cleric", 6, "Restores health to a friendly unit"),
            ("holy_vision", "Holy Vision", "cleric", 2, "Reveals hidden areas of the map"),
            ("exorcism", "Exorcism", "cleric", 8, "Damages undead units"),
            ("fireball", "Fireball", "conjurer", 4, "Launches a fireball at enemies"),
            ("slow", "Slow", "conjurer", 3, "Reduces enemy movement speed"),
            ("invisibility", "Invisibility", "conjurer", 5, "Makes a unit invisible"),
            ("polymorph", "Polymorph", "wizard", 6, "Transforms enemy into a sheep"),
            ("blizzard", "Blizzard", "wizard", 8, "Area damage spell"),
            ("death_coil", "Death Coil", "necrolyte", 6, "Damages living units or heals undead"),
            ("raise_dead", "Raise Dead", "necrolyte", 4, "Raises fallen units as skeletons"),
            ("unholy_armor", "Unholy Armor", "necrolyte", 3, "Increases armor of undead units"),
            ("bloodlust", "Bloodlust", "warlock", 5, "Increases attack speed and damage"),
            ("eye_of_kilrogg", "Eye of Kilrogg", "warlock", 2, "Creates a flying eye for scouting"),
            ("death_and_decay", "Death and Decay", "warlock", 8, "Damages all units in an area"),
            ("dark_ritual", "Dark Ritual", "death_knight", 7, "Sacrifices health for mana"),
            ("death_pact", "Death Pact", "death_knight", 6, "Kills a unit to restore health"),
        ];

        // Add spells to appropriate units
        for (_spell_id, spell_name, unit_type, _mana_cost, _description) in spells.iter() {
            for unit in &mut self.units {
                if unit.unit_type == *unit_type && unit.category == "unit" {
                    unit.spells.push(spell_name.to_string());
                }
            }
        }

        Ok(())
    }

    fn extract_terrain_tiles(&mut self) -> Result<()> {
        println!("Extracting terrain tiles and tilesets...");
        
        // Try multiple possible terrain asset locations
        let terrain_paths = [
            self.game_path.join("data").join("terrain"),
            self.game_path.join("data").join("tileset"),
            self.game_path.join("data").join("art").join("terrain"),
            self.game_path.join("data").join("art").join("tileset"),
        ];

        let mut terrain_found = false;
        let grp_parser = GrpParser;

        for terrain_path in &terrain_paths {
            if terrain_path.exists() {
                println!("Found terrain assets at: {}", terrain_path.display());
                terrain_found = true;
                
                // Extract terrain tiles
                self.extract_terrain_from_path(terrain_path, &grp_parser)?;
                
                // Also check for tileset-specific directories
                let tileset_dirs = ["forest", "winter", "wasteland", "swamp"];
                for tileset in &tileset_dirs {
                    let tileset_path = terrain_path.join(tileset);
                    if tileset_path.exists() {
                        println!("Found {} tileset at: {}", tileset, tileset_path.display());
                        self.extract_terrain_from_path(&tileset_path, &grp_parser)?;
                    }
                }
            }
        }

        if !terrain_found {
            println!("Warning: No terrain directories found. Trying to extract from art directory...");
            
            // Fallback: try to extract terrain from art directory
            let art_path = self.game_path.join("data").join("art");
            if art_path.exists() {
                self.extract_terrain_from_path(&art_path, &grp_parser)?;
            }
        }

        Ok(())
    }

    fn extract_terrain_from_path(&mut self, path: &Path, grp_parser: &GrpParser) -> Result<()> {
        for entry in WalkDir::new(path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file()) {
            
            let file_path = entry.path();
            
            // Handle different terrain file formats
            if grp_parser.can_parse(file_path) {
                // GRP format (sprites)
                self.extract_grp_terrain(file_path, grp_parser)?;
            } else if file_path.extension().map_or(false, |ext| ext == "bin") {
                // BIN format (raw terrain data)
                self.extract_bin_terrain(file_path)?;
            } else if file_path.extension().map_or(false, |ext| ext == "idx") {
                // IDX format (terrain index files)
                self.extract_idx_terrain(file_path)?;
            }
        }
        
        Ok(())
    }

    fn extract_grp_terrain(&mut self, file_path: &Path, grp_parser: &GrpParser) -> Result<()> {
        match grp_parser.parse(file_path) {
            Ok(sprite) => {
                let filename = file_path.file_stem().unwrap().to_string_lossy();
                
                // Determine if this is a terrain tile or tileset
                let (category, output_subdir) = self.categorize_terrain_file(&filename, &sprite);
                let output_path = self.output_path.join("images").join("terrain").join(output_subdir).join(format!("{}.png", filename));
                
                // Ensure output directory exists
                if let Some(parent) = output_path.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                
                if let Err(e) = grp_parser.to_png(&sprite, &output_path) {
                    println!("Failed to extract terrain tile {}: {}", file_path.display(), e);
                } else {
                    self.images_extracted.push(output_path.to_string_lossy().to_string());
                    println!("Extracted terrain tile: {} -> {}", filename, output_path.display());
                }
            }
            Err(e) => {
                println!("Failed to parse terrain tile {}: {}", file_path.display(), e);
            }
        }
        Ok(())
    }

    fn extract_bin_terrain(&mut self, file_path: &Path) -> Result<()> {
        // TODO: Implement BIN terrain extraction
        // This would convert raw terrain data to images
        println!("BIN terrain extraction not yet implemented for: {}", file_path.display());
        Ok(())
    }

    fn extract_idx_terrain(&mut self, file_path: &Path) -> Result<()> {
        // TODO: Implement IDX terrain extraction
        // This would handle terrain index files
        println!("IDX terrain extraction not yet implemented for: {}", file_path.display());
        Ok(())
    }

    fn categorize_terrain_file(&self, filename: &str, sprite: &crate::file_parsers::grp_parser::GrpSprite) -> (&'static str, &'static str) {
        let filename_lower = filename.to_lowercase();
        
        // Check for specific terrain types
        if filename_lower.contains("water") || filename_lower.contains("sea") {
            return ("water", "water");
        } else if filename_lower.contains("grass") || filename_lower.contains("meadow") {
            return ("grass", "grass");
        } else if filename_lower.contains("forest") || filename_lower.contains("tree") {
            return ("forest", "forest");
        } else if filename_lower.contains("rock") || filename_lower.contains("mountain") {
            return ("rock", "rock");
        } else if filename_lower.contains("dirt") || filename_lower.contains("mud") {
            return ("dirt", "dirt");
        } else if filename_lower.contains("snow") || filename_lower.contains("ice") {
            return ("snow", "snow");
        } else if filename_lower.contains("sand") || filename_lower.contains("desert") {
            return ("sand", "sand");
        } else if filename_lower.contains("swamp") || filename_lower.contains("marsh") {
            return ("swamp", "swamp");
        } else if filename_lower.contains("coast") || filename_lower.contains("shore") {
            return ("coast", "coast");
        }
        
        // Default to generic terrain
        ("terrain", "generic")
    }

    fn extract_all_images(&mut self) -> Result<()> {
        println!("Extracting images...");
        
        // Try modern HD format first
        let hd_path = self.game_path.join("data").join("hd");
        if hd_path.exists() {
            println!("Found HD assets, extracting modern format...");
            self.extract_hd_sprites(&hd_path)?;
        } else {
            // Fall back to classic GRP format
            let art_path = self.game_path.join("data").join("art");
            if !art_path.exists() {
                println!("Warning: Art directory not found at {}", art_path.display());
                return Ok(());
            }

            let grp_parser = GrpParser;
            
            // Extract unit sprites
            self.extract_unit_sprites(&art_path, &grp_parser)?;
            
            // Extract building sprites
            self.extract_building_sprites(&art_path, &grp_parser)?;
            
            // Extract UI and other sprites
            self.extract_ui_sprites(&art_path, &grp_parser)?;
        }

        Ok(())
    }

    fn extract_unit_sprites(&mut self, art_path: &Path, grp_parser: &GrpParser) -> Result<()> {
        let unit_paths = [
            art_path.join("unit").join("human"),
            art_path.join("unit").join("orc"),
        ];

        for unit_path in &unit_paths {
            if !unit_path.exists() {
                continue;
            }

            for entry in WalkDir::new(unit_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file()) {
                
                let file_path = entry.path();
                if grp_parser.can_parse(file_path) {
                    match grp_parser.parse(file_path) {
                        Ok(sprite) => {
                            let filename = file_path.file_stem().unwrap().to_string_lossy();
                            
                            // Determine image category based on frame count and filename
                            let (category, output_subdir) = self.categorize_image(&filename, sprite.header.frame_count);
                            let output_path = self.output_path.join("images").join(output_subdir).join(format!("{}.png", filename));
                            
                            if let Err(e) = grp_parser.to_png(&sprite, &output_path) {
                                println!("Failed to extract {}: {}", file_path.display(), e);
                            } else {
                                self.images_extracted.push(output_path.to_string_lossy().to_string());
                                
                                // Update unit with sprite data
                                for unit in &mut self.units {
                                    if unit.name == filename.to_string() {
                                        unit.image_path = Some(format!("images/{}/{}.png", output_subdir, filename));
                                        unit.sprite_data = Some(SpriteData {
                                            width: sprite.header.width,
                                            height: sprite.header.height,
                                            frame_count: sprite.header.frame_count,
                                            file_path: output_path.to_string_lossy().to_string(),
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            println!("Failed to parse {}: {}", file_path.display(), e);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn categorize_image(&self, filename: &str, frame_count: u16) -> (&'static str, &'static str) {
        let filename_lower = filename.to_lowercase();
        
        // Check for portrait indicators
        if filename_lower.contains("port") || 
           filename_lower.contains("face") || 
           filename_lower.contains("head") ||
           frame_count <= 4 {
            return ("portrait", "portraits");
        }
        
        // Check for animation indicators (multiple frames)
        if frame_count > 4 {
            return ("animation", "animations");
        }
        
        // Default to animations for units
        ("animation", "animations")
    }

    fn extract_building_sprites(&mut self, art_path: &Path, grp_parser: &GrpParser) -> Result<()> {
        let building_paths = [
            art_path.join("building").join("human"),
            art_path.join("building").join("orc"),
        ];

        for building_path in &building_paths {
            if !building_path.exists() {
                continue;
            }

            for entry in WalkDir::new(building_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file()) {
                
                let file_path = entry.path();
                if grp_parser.can_parse(file_path) {
                    match grp_parser.parse(file_path) {
                        Ok(sprite) => {
                            let filename = file_path.file_stem().unwrap().to_string_lossy();
                            
                            // Buildings are typically static or have few frames
                            let (category, output_subdir) = self.categorize_building_image(&filename, sprite.header.frame_count);
                            let output_path = self.output_path.join("images").join(output_subdir).join(format!("{}.png", filename));
                            
                            if let Err(e) = grp_parser.to_png(&sprite, &output_path) {
                                println!("Failed to extract {}: {}", file_path.display(), e);
                            } else {
                                self.images_extracted.push(output_path.to_string_lossy().to_string());
                                
                                // Update building with sprite data
                                for unit in &mut self.units {
                                    if unit.name == filename.to_string() {
                                        unit.image_path = Some(format!("images/{}/{}.png", output_subdir, filename));
                                        unit.sprite_data = Some(SpriteData {
                                            width: sprite.header.width,
                                            height: sprite.header.height,
                                            frame_count: sprite.header.frame_count,
                                            file_path: output_path.to_string_lossy().to_string(),
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            println!("Failed to parse {}: {}", file_path.display(), e);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn categorize_building_image(&self, filename: &str, frame_count: u16) -> (&'static str, &'static str) {
        let filename_lower = filename.to_lowercase();
        
        // Buildings with construction animations
        if frame_count > 8 {
            return ("animation", "animations");
        }
        
        // Static building images
        ("portrait", "portraits")
    }

    fn extract_ui_sprites(&mut self, art_path: &Path, grp_parser: &GrpParser) -> Result<()> {
        let ui_paths = [
            art_path.join("ui"),
            art_path.join("cursor"),
            art_path.join("icon"),
        ];

        for ui_path in &ui_paths {
            if !ui_path.exists() {
                continue;
            }

            for entry in WalkDir::new(ui_path)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file()) {
                
                let file_path = entry.path();
                if grp_parser.can_parse(file_path) {
                    match grp_parser.parse(file_path) {
                        Ok(sprite) => {
                            let filename = file_path.file_stem().unwrap().to_string_lossy();
                            
                            // UI elements go to classic category
                            let output_path = self.output_path.join("images").join("classic").join(format!("{}.png", filename));
                            
                            if let Err(e) = grp_parser.to_png(&sprite, &output_path) {
                                println!("Failed to extract {}: {}", file_path.display(), e);
                            } else {
                                self.images_extracted.push(output_path.to_string_lossy().to_string());
                            }
                        }
                        Err(e) => {
                            println!("Failed to parse {}: {}", file_path.display(), e);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn extract_hd_sprites(&mut self, hd_path: &Path) -> Result<()> {
        let units_path = hd_path.join("units");
        if !units_path.exists() {
            println!("Warning: HD units directory not found");
            return Ok(());
        }

        // Parse sprite atlas JSON files
        let sprite_files = [
            ("units_human_sprites.json", "units_human_sprites.png"),
            ("units_orc_sprites.json", "units_orc_sprites.png"),
            ("units_common_sprites.json", "units_common_sprites.png"),
        ];

        for (json_file, png_file) in &sprite_files {
            let json_path = units_path.join(json_file);
            let png_path = units_path.join(png_file);
            
            if !json_path.exists() || !png_path.exists() {
                continue;
            }

            println!("Processing {}...", json_file);
            
            // Parse JSON sprite atlas
            let json_content = std::fs::read_to_string(&json_path)?;
            let sprite_atlas: serde_json::Value = serde_json::from_str(&json_content)?;
            
            // Load the sprite sheet image
            let sprite_sheet = image::open(&png_path)?;
            
            if let Some(frames) = sprite_atlas["frames"].as_object() {
                for (frame_name, frame_data) in frames {
                    if let Some(frame_obj) = frame_data.as_object() {
                        if let (Some(frame), Some(_source_size)) = (
                            frame_obj.get("frame"),
                            frame_obj.get("sourceSize")
                        ) {
                            let x = frame["x"].as_u64().unwrap_or(0) as u32;
                            let y = frame["y"].as_u64().unwrap_or(0) as u32;
                            let w = frame["w"].as_u64().unwrap_or(0) as u32;
                            let h = frame["h"].as_u64().unwrap_or(0) as u32;
                            
                            // Extract the sprite from the sheet
                            let sprite = sprite_sheet.crop_imm(x, y, w, h);
                            
                            // Generate filename from frame name
                            let filename = frame_name.replace("/", "_").replace(".grp", "");
                            
                            // HD assets go to remastered category
                            let output_path = self.output_path.join("images").join("remastered").join(format!("{}.png", filename));
                            
                            // Save the sprite
                            sprite.save(&output_path)?;
                            self.images_extracted.push(output_path.to_string_lossy().to_string());
                            
                            // Update unit with sprite data
                            for unit in &mut self.units {
                                if frame_name.contains(&unit.name) {
                                    unit.image_path = Some(format!("images/remastered/{}.png", filename));
                                    unit.sprite_data = Some(SpriteData {
                                        width: w as u16,
                                        height: h as u16,
                                        frame_count: 1, // Single frame for extracted sprites
                                        file_path: output_path.to_string_lossy().to_string(),
                                    });
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn generate_mongodb_documents(&self) -> Result<()> {
        println!("Generating MongoDB documents...");
        
        // Generate BSON documents for MongoDB import
        let mut documents = Vec::new();
        
        for unit in &self.units {
            let doc = self.unit_to_bson(unit)?;
            documents.push(doc);
        }
        
        // Save as BSON file for MongoDB import
        let bson_path = self.output_path.join("mongodb").join("wc2_units.bson");
        let mut bson_data = Vec::new();
        for doc in &documents {
            bson_data.extend_from_slice(&bson::to_vec(doc)?);
        }
        std::fs::write(&bson_path, bson_data)?;
        
        // Also save as JSON for easy viewing
        let json_path = self.output_path.join("mongodb").join("wc2_units.json");
        let json_data = serde_json::to_string_pretty(&self.units)?;
        std::fs::write(&json_path, json_data)?;
        
        println!("MongoDB documents saved to:");
        println!("  BSON: {}", bson_path.display());
        println!("  JSON: {}", json_path.display());
        
        Ok(())
    }

    fn unit_to_bson(&self, unit: &WC2Unit) -> Result<Document> {
        let mut doc = doc! {
            "_id": &unit._id,
            "name": &unit.name,
            "display_name": &unit.display_name,
            "unit_type": &unit.unit_type,
            "category": &unit.category,
            "abilities": &unit.abilities,
            "spells": &unit.spells,
            "produces": &unit.produces,
            "upgrades": &unit.upgrades,
        };

        if let Some(health) = unit.health {
            doc.insert("health", health);
        }
        if let Some(damage) = unit.damage {
            doc.insert("damage", damage);
        }
        if let Some(armor) = unit.armor {
            doc.insert("armor", armor);
        }
        if let Some(speed) = unit.speed {
            doc.insert("speed", speed);
        }
        if let Some(mana) = unit.mana {
            doc.insert("mana", mana);
        }
        if let Some(cost) = &unit.cost {
            doc.insert("cost", doc! {
                "gold": cost.gold,
                "lumber": cost.lumber,
                "food": cost.food,
            });
        }
        if let Some(build_time) = unit.build_time {
            doc.insert("build_time", build_time);
        }
        if let Some(image_path) = &unit.image_path {
            doc.insert("image_path", image_path);
        }
        if let Some(sprite_data) = &unit.sprite_data {
            doc.insert("sprite_data", doc! {
                "width": sprite_data.width as i32,
                "height": sprite_data.height as i32,
                "frame_count": sprite_data.frame_count as i32,
                "file_path": &sprite_data.file_path,
            });
        }
        if let Some(description) = &unit.description {
            doc.insert("description", description);
        }
        if let Some(lore) = &unit.lore {
            doc.insert("lore", lore);
        }

        Ok(doc)
    }

    fn generate_terrain_mapping(&self) -> Result<()> {
        println!("Generating terrain tile mapping for TMapX...");
        
        // Create terrain mapping structure
        let terrain_mapping = serde_json::json!({
            "version": "1.0",
            "game": "Warcraft II",
            "extraction_date": chrono::Utc::now().to_rfc3339(),
            "tilesets": {
                "forest": {
                    "description": "Forest tileset - lush green terrain",
                    "tiles": {}
                },
                "winter": {
                    "description": "Winter tileset - snow and ice terrain",
                    "tiles": {}
                },
                "wasteland": {
                    "description": "Wasteland tileset - desert and arid terrain",
                    "tiles": {}
                },
                "swamp": {
                    "description": "Swamp tileset - marshy and wet terrain",
                    "tiles": {}
                }
            },
            "terrain_types": {
                "water": "Deep water tiles",
                "grass": "Grass and meadow tiles",
                "forest": "Forest and tree tiles",
                "rock": "Rock and mountain tiles",
                "dirt": "Dirt and mud tiles",
                "snow": "Snow and ice tiles",
                "sand": "Sand and desert tiles",
                "swamp": "Swamp and marsh tiles",
                "coast": "Coastal and shore tiles"
            }
        });
        
        // Write terrain mapping to file
        let mapping_path = self.output_path.join("terrain_mapping.json");
        let mapping_file = std::fs::File::create(&mapping_path)?;
        serde_json::to_writer_pretty(mapping_file, &terrain_mapping)?;
        
        println!("Terrain mapping saved to: {}", mapping_path.display());
        
        // Also create a TMapX-specific mapping file
        let timapx_mapping = serde_json::json!({
            "tile_mapping": {
                "0x00": "grass",
                "0x10": "water",
                "0x20": "water-deep",
                "0x30": "coast",
                "0x40": "coast",
                "0x50": "forest",  // Forest tileset
                "0x60": "forest",  // Forest tileset
                "0x70": "rock",
                "0x80": "dirt",
                "0x90": "forest",  // Forest tileset
                "0xA0": "rock-dark",
                "0xB0": "dirt"
            },
            "tileset_overrides": {
                "0": {  // Forest tileset
                    "0x50": "forest",
                    "0x60": "forest",
                    "0x90": "forest"
                },
                "1": {  // Winter tileset
                    "0x50": "snow",
                    "0x60": "snow",
                    "0x90": "snow"
                },
                "2": {  // Wasteland tileset
                    "0x50": "sand",
                    "0x60": "sand",
                    "0x90": "sand"
                },
                "3": {  // Swamp tileset
                    "0x50": "swamp",
                    "0x60": "swamp",
                    "0x90": "swamp"
                }
            }
        });
        
        let timapx_path = self.output_path.join("timapx_terrain_mapping.json");
        let timapx_file = std::fs::File::create(&timapx_path)?;
        serde_json::to_writer_pretty(timapx_file, &timapx_mapping)?;
        
        println!("TMapX terrain mapping saved to: {}", timapx_path.display());
        
        Ok(())
    }
}
