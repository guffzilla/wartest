use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PudHeader {
    pub magic: [u8; 4],        // "FORM"
    pub file_size: u32,        // Total file size
    pub type_id: [u8; 4],      // "PUD "
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PudMapInfo {
    pub width: u16,
    pub height: u16,
    pub max_players: u16,
    pub map_name: String,
    pub map_description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PudTerrain {
    pub tiles: Vec<u16>,
    pub elevations: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PudUnit {
    pub unit_type: u16,
    pub x: u16,
    pub y: u16,
    pub owner: u8,
    pub health: u16,
    pub rotation: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PudResource {
    pub resource_type: u16,
    pub x: u16,
    pub y: u16,
    pub amount: u16,
}

pub struct PudParser {
    data: Vec<u8>,
    position: usize,
}

impl PudParser {
    pub fn new(file_path: &Path) -> Result<Self, String> {
        let mut file = File::open(file_path)
            .map_err(|e| format!("Failed to open file: {}", e))?;
        
        let mut data = Vec::new();
        file.read_to_end(&mut data)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        Ok(PudParser {
            data,
            position: 0,
        })
    }

    pub fn parse(&mut self) -> Result<PudMapInfo, String> {
        // Parse header
        let header = self.parse_header()?;
        
        println!("Header magic: {:?}, type_id: {:?}", 
                 String::from_utf8_lossy(&header.magic),
                 String::from_utf8_lossy(&header.type_id));
        
        // Verify it's a valid Warcraft II file
        if &header.magic != b"FORM" && &header.magic != b"TYPE" {
            return Err("Not a valid Warcraft II file".to_string());
        }
        
        // Handle different file formats
        if &header.magic == b"TYPE" {
            // This appears to be a different format, let's try to parse it
            println!("Detected TYPE format, attempting to parse...");
        }

        // Parse chunks
        let mut map_info = PudMapInfo {
            width: 0,
            height: 0,
            max_players: 0,
            map_name: String::new(),
            map_description: String::new(),
        };

        while self.position < self.data.len() {
            if self.position + 8 > self.data.len() {
                println!("Reached end of file at position {}", self.position);
                break;
            }

            let chunk_id = self.read_u32_be();
            let chunk_size = self.read_u32_be();

            // Convert chunk_id to string for comparison
            let chunk_str = String::from_utf8_lossy(&chunk_id.to_be_bytes()).to_string();
            
            println!("Processing chunk: '{}' (size: {}) at position {}", chunk_str, chunk_size, self.position);
            
            // Validate chunk size
            if chunk_size > 1000000 {
                println!("Warning: Suspiciously large chunk size: {}", chunk_size);
            }
            
            match chunk_str.as_str() {
                "VER " => {
                    // Version chunk - skip
                    self.position += chunk_size as usize;
                }
                "TYPE" => {
                    // Type chunk - read the type
                    if chunk_size >= 4 {
                        let type_data = self.read_string(chunk_size as usize);
                        println!("File type: {}", type_data);
                    } else {
                        self.position += chunk_size as usize;
                    }
                }
                "DIM " => {
                    // Dimensions chunk
                    if chunk_size >= 4 {
                        map_info.width = self.read_u16_be();
                        map_info.height = self.read_u16_be();
                    }
                }
                "ERA " => {
                    // Era chunk - skip
                    self.position += chunk_size as usize;
                }
                "SIDE" => {
                    // Side chunk - skip
                    self.position += chunk_size as usize;
                }
                "OWNR" => {
                    // Owner chunk - skip
                    self.position += chunk_size as usize;
                }
                "UNIT" => {
                    // Units chunk - parse units
                    println!("Found UNIT chunk (size: {})", chunk_size);
                    let unit_count = chunk_size / 7; // Each unit is 7 bytes
                    println!("Unit count: {}", unit_count);
                    
                    for _ in 0..unit_count {
                        if self.position + 7 <= self.data.len() {
                            let unit_type = self.read_u16_be();
                            let x = self.read_u16_be();
                            let y = self.read_u16_be();
                            let owner = self.read_u8();
                            let health = self.read_u8();
                            
                            println!("Unit: type={}, pos=({},{}), owner={}, health={}", 
                                   unit_type, x, y, owner, health);
                        }
                    }
                }
                "THG2" => {
                    // Triggers chunk - skip
                    self.position += chunk_size as usize;
                }
                "MASK" => {
                    // Mask chunk - skip
                    self.position += chunk_size as usize;
                }
                "MTXM" => {
                    // Terrain chunk - contains tile data
                    println!("Found MTXM (terrain) chunk (size: {})", chunk_size);
                    if chunk_size >= 4 {
                        let terrain_width = self.read_u16_be();
                        let terrain_height = self.read_u16_be();
                        println!("Terrain dimensions: {}x{}", terrain_width, terrain_height);
                        
                        // If we don't have dimensions yet, use terrain dimensions
                        if map_info.width == 0 && map_info.height == 0 {
                            map_info.width = terrain_width;
                            map_info.height = terrain_height;
                            println!("Using terrain dimensions: {}x{}", map_info.width, map_info.height);
                        }
                    }
                    self.position += (chunk_size - 4) as usize;
                }
                "PUNI" => {
                    // Player units chunk - skip
                    self.position += chunk_size as usize;
                }
                "UPGR" => {
                    // Upgrades chunk - skip
                    self.position += chunk_size as usize;
                }
                "PTEC" => {
                    // Player tech chunk - skip
                    self.position += chunk_size as usize;
                }
                "UNIx" => {
                    // Extended units chunk - skip
                    self.position += chunk_size as usize;
                }
                "UPGx" => {
                    // Extended upgrades chunk - skip
                    self.position += chunk_size as usize;
                }
                "TECx" => {
                    // Extended tech chunk - skip
                    self.position += chunk_size as usize;
                }
                " MAP" => {
                    // Map data chunk - this likely contains the actual map information
                    println!("Found MAP chunk (size: {})", chunk_size);
                    
                    // Try different parsing approaches for the MAP chunk
                    if chunk_size >= 8 {
                        // Try reading as if it's a header with dimensions
                        let possible_width = self.read_u32_be();
                        let possible_height = self.read_u32_be();
                        println!("Possible dimensions from MAP chunk: {}x{}", possible_width, possible_height);
                        
                        // Check if these look like reasonable dimensions
                        if possible_width > 0 && possible_width <= 256 && 
                           possible_height > 0 && possible_height <= 256 {
                            map_info.width = possible_width as u16;
                            map_info.height = possible_height as u16;
                            println!("Using dimensions from MAP chunk: {}x{}", map_info.width, map_info.height);
                        } else {
                            // Reset position and try different approach
                            self.position -= 8;
                        }
                    }
                    
                    // Skip the rest of the chunk
                    self.position += chunk_size as usize;
                }
                _ => {
                    // Unknown chunk - skip
                    println!("Unknown chunk: '{}' (size: {})", chunk_str, chunk_size);
                    self.position += chunk_size as usize;
                }
            }
        }

        // Set default values if not found
        if map_info.width == 0 {
            map_info.width = 128;
        }
        if map_info.height == 0 {
            map_info.height = 128;
        }
        if map_info.max_players == 0 {
            map_info.max_players = 4;
        }

        Ok(map_info)
    }

    fn parse_header(&mut self) -> Result<PudHeader, String> {
        if self.position + 12 > self.data.len() {
            return Err("File too small to be a valid PUD".to_string());
        }

        let mut magic = [0u8; 4];
        magic.copy_from_slice(&self.data[self.position..self.position + 4]);
        self.position += 4;

        let file_size = self.read_u32_be();
        
        let mut type_id = [0u8; 4];
        type_id.copy_from_slice(&self.data[self.position..self.position + 4]);
        self.position += 4;

        Ok(PudHeader {
            magic,
            file_size,
            type_id,
        })
    }

    fn read_u16_be(&mut self) -> u16 {
        if self.position + 2 > self.data.len() {
            return 0;
        }
        let value = u16::from_be_bytes([
            self.data[self.position],
            self.data[self.position + 1]
        ]);
        self.position += 2;
        value
    }

    fn read_u8(&mut self) -> u8 {
        if self.position >= self.data.len() {
            return 0;
        }
        let value = self.data[self.position];
        self.position += 1;
        value
    }

    fn read_u32_be(&mut self) -> u32 {
        if self.position + 4 > self.data.len() {
            return 0;
        }
        let value = u32::from_be_bytes([
            self.data[self.position],
            self.data[self.position + 1],
            self.data[self.position + 2],
            self.data[self.position + 3]
        ]);
        self.position += 4;
        value
    }

    fn read_string(&mut self, length: usize) -> String {
        if self.position + length > self.data.len() {
            return String::new();
        }
        let bytes = &self.data[self.position..self.position + length];
        self.position += length;
        
        // Convert to string, removing null bytes
        String::from_utf8_lossy(bytes)
            .trim_matches('\0')
            .to_string()
    }
}

// Unit type mappings for Warcraft II
pub fn get_unit_name(unit_type: u16) -> &'static str {
    match unit_type {
        0 => "Peasant",
        1 => "Footman", 
        2 => "Knight",
        3 => "Archer",
        4 => "Ranger",
        5 => "Paladin",
        6 => "Mage",
        7 => "Conjurer",
        8 => "Warlock",
        9 => "Necromancer",
        10 => "Monk",
        11 => "Dwarves",
        12 => "Catapult",
        13 => "Ballista",
        14 => "Transport",
        15 => "Frigate",
        16 => "Destroyer",
        17 => "Battleship",
        18 => "Submarine",
        19 => "Oil Tanker",
        20 => "Flying Machine",
        21 => "Gryphon Rider",
        22 => "Dragon",
        23 => "Giant",
        24 => "Golem",
        25 => "Skeleton",
        26 => "Daemon",
        27 => "Warlock (Summoned)",
        28 => "Eye of Kilrogg",
        29 => "Doom Guard",
        30 => "Peon",
        31 => "Grunt",
        32 => "Troll Axethrower",
        33 => "Troll Berserker",
        34 => "Ogre",
        35 => "Ogre Mage",
        36 => "Knight",
        37 => "Catapult",
        38 => "Ballista",
        39 => "Transport",
        40 => "Juggernaught",
        41 => "Troll Destroyer",
        42 => "Troll Battleship",
        43 => "Troll Submarine",
        44 => "Troll Oil Tanker",
        45 => "Troll Flying Machine",
        46 => "Troll Gryphon Rider",
        47 => "Troll Dragon",
        48 => "Troll Giant",
        49 => "Troll Golem",
        50 => "Troll Skeleton",
        51 => "Troll Daemon",
        52 => "Troll Warlock (Summoned)",
        53 => "Troll Eye of Kilrogg",
        54 => "Troll Doom Guard",
        55 => "Troll Peon",
        56 => "Troll Grunt",
        57 => "Troll Axethrower",
        58 => "Troll Berserker",
        59 => "Troll Ogre",
        60 => "Troll Ogre Mage",
        61 => "Troll Knight",
        62 => "Troll Catapult",
        63 => "Troll Ballista",
        64 => "Troll Transport",
        65 => "Troll Juggernaught",
        66 => "Troll Destroyer",
        67 => "Troll Battleship",
        68 => "Troll Submarine",
        69 => "Troll Oil Tanker",
        70 => "Troll Flying Machine",
        71 => "Troll Gryphon Rider",
        72 => "Troll Dragon",
        73 => "Troll Giant",
        74 => "Troll Golem",
        75 => "Troll Skeleton",
        76 => "Troll Daemon",
        77 => "Troll Warlock (Summoned)",
        78 => "Troll Eye of Kilrogg",
        79 => "Troll Doom Guard",
        80 => "Troll Peon",
        81 => "Troll Grunt",
        82 => "Troll Axethrower",
        83 => "Troll Berserker",
        84 => "Troll Ogre",
        85 => "Troll Ogre Mage",
        86 => "Troll Knight",
        87 => "Troll Catapult",
        88 => "Troll Ballista",
        89 => "Troll Transport",
        90 => "Troll Juggernaught",
        91 => "Troll Destroyer",
        92 => "Troll Battleship",
        93 => "Troll Submarine",
        94 => "Troll Oil Tanker",
        95 => "Troll Flying Machine",
        96 => "Troll Gryphon Rider",
        97 => "Troll Dragon",
        98 => "Troll Giant",
        99 => "Troll Golem",
        100 => "Troll Skeleton",
        101 => "Troll Daemon",
        102 => "Troll Warlock (Summoned)",
        103 => "Troll Eye of Kilrogg",
        104 => "Troll Doom Guard",
        105 => "Troll Peon",
        106 => "Troll Grunt",
        107 => "Troll Axethrower",
        108 => "Troll Berserker",
        109 => "Troll Ogre",
        110 => "Troll Ogre Mage",
        111 => "Troll Knight",
        112 => "Troll Catapult",
        113 => "Troll Ballista",
        114 => "Troll Transport",
        115 => "Troll Juggernaught",
        116 => "Troll Destroyer",
        117 => "Troll Battleship",
        118 => "Troll Submarine",
        119 => "Troll Oil Tanker",
        120 => "Troll Flying Machine",
        121 => "Troll Gryphon Rider",
        122 => "Troll Dragon",
        123 => "Troll Giant",
        124 => "Troll Golem",
        125 => "Troll Skeleton",
        126 => "Troll Daemon",
        127 => "Troll Warlock (Summoned)",
        128 => "Troll Eye of Kilrogg",
        129 => "Troll Doom Guard",
        130 => "Troll Peon",
        131 => "Troll Grunt",
        132 => "Troll Axethrower",
        133 => "Troll Berserker",
        134 => "Troll Ogre",
        135 => "Troll Ogre Mage",
        136 => "Troll Knight",
        137 => "Troll Catapult",
        138 => "Troll Ballista",
        139 => "Troll Transport",
        140 => "Troll Juggernaught",
        141 => "Troll Destroyer",
        142 => "Troll Battleship",
        143 => "Troll Submarine",
        144 => "Troll Oil Tanker",
        145 => "Troll Flying Machine",
        146 => "Troll Gryphon Rider",
        147 => "Troll Dragon",
        148 => "Troll Giant",
        149 => "Troll Golem",
        150 => "Troll Skeleton",
        151 => "Troll Daemon",
        152 => "Troll Warlock (Summoned)",
        153 => "Troll Eye of Kilrogg",
        154 => "Troll Doom Guard",
        155 => "Troll Peon",
        156 => "Troll Grunt",
        157 => "Troll Axethrower",
        158 => "Troll Berserker",
        159 => "Troll Ogre",
        160 => "Troll Ogre Mage",
        161 => "Troll Knight",
        162 => "Troll Catapult",
        163 => "Troll Ballista",
        164 => "Troll Transport",
        165 => "Troll Juggernaught",
        166 => "Troll Destroyer",
        167 => "Troll Battleship",
        168 => "Troll Submarine",
        169 => "Troll Oil Tanker",
        170 => "Troll Flying Machine",
        171 => "Troll Gryphon Rider",
        172 => "Troll Dragon",
        173 => "Troll Giant",
        174 => "Troll Golem",
        175 => "Troll Skeleton",
        176 => "Troll Daemon",
        177 => "Troll Warlock (Summoned)",
        178 => "Troll Eye of Kilrogg",
        179 => "Troll Doom Guard",
        180 => "Troll Peon",
        181 => "Troll Grunt",
        182 => "Troll Axethrower",
        183 => "Troll Berserker",
        184 => "Troll Ogre",
        185 => "Troll Ogre Mage",
        186 => "Troll Knight",
        187 => "Troll Catapult",
        188 => "Troll Ballista",
        189 => "Troll Transport",
        190 => "Troll Juggernaught",
        191 => "Troll Destroyer",
        192 => "Troll Battleship",
        193 => "Troll Submarine",
        194 => "Troll Oil Tanker",
        195 => "Troll Flying Machine",
        196 => "Troll Gryphon Rider",
        197 => "Troll Dragon",
        198 => "Troll Giant",
        199 => "Troll Golem",
        200 => "Troll Skeleton",
        201 => "Troll Daemon",
        202 => "Troll Warlock (Summoned)",
        203 => "Troll Eye of Kilrogg",
        204 => "Troll Doom Guard",
        205 => "Troll Peon",
        206 => "Troll Grunt",
        207 => "Troll Axethrower",
        208 => "Troll Berserker",
        209 => "Troll Ogre",
        210 => "Troll Ogre Mage",
        211 => "Troll Knight",
        212 => "Troll Catapult",
        213 => "Troll Ballista",
        214 => "Troll Transport",
        215 => "Troll Juggernaught",
        216 => "Troll Destroyer",
        217 => "Troll Battleship",
        218 => "Troll Submarine",
        219 => "Troll Oil Tanker",
        220 => "Troll Flying Machine",
        221 => "Troll Gryphon Rider",
        222 => "Troll Dragon",
        223 => "Troll Giant",
        224 => "Troll Golem",
        225 => "Troll Skeleton",
        226 => "Troll Daemon",
        227 => "Troll Warlock (Summoned)",
        228 => "Troll Eye of Kilrogg",
        229 => "Troll Doom Guard",
        230 => "Troll Peon",
        231 => "Troll Grunt",
        232 => "Troll Axethrower",
        233 => "Troll Berserker",
        234 => "Troll Ogre",
        235 => "Troll Ogre Mage",
        236 => "Troll Knight",
        237 => "Troll Catapult",
        238 => "Troll Ballista",
        239 => "Troll Transport",
        240 => "Troll Juggernaught",
        241 => "Troll Destroyer",
        242 => "Troll Battleship",
        243 => "Troll Submarine",
        244 => "Troll Oil Tanker",
        245 => "Troll Flying Machine",
        246 => "Troll Gryphon Rider",
        247 => "Troll Dragon",
        248 => "Troll Giant",
        249 => "Troll Golem",
        250 => "Troll Skeleton",
        251 => "Troll Daemon",
        252 => "Troll Warlock (Summoned)",
        253 => "Troll Eye of Kilrogg",
        254 => "Troll Doom Guard",
        255 => "Troll Peon",
        _ => "Unknown Unit",
    }
}
