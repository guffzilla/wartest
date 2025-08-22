use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileAnalysis {
    pub filename: String,
    pub file_size: u64,
    pub file_type: FileType,
    pub file_hash: String,
    pub header: Option<FileHeader>,
    pub patterns: Option<Vec<DataPattern>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileType {
    W2RReplay,
    Index,
    HashIndex,
    GameData,
    SharedMemory,
    Residency,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHeader {
    pub magic: Vec<u8>,
    pub version: u32,
    pub file_size: u32,
    pub timestamp: u64,
    pub flags: u32,
    pub reserved: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPattern {
    pub offset: usize,
    pub data: Vec<u8>,
    pub hex_string: String,
    pub frequency: usize,
}

impl FileHeader {
    pub fn magic_string(&self) -> String {
        String::from_utf8_lossy(&self.magic).to_string()
    }

    pub fn is_valid(&self) -> bool {
        // Check if magic number looks reasonable
        if self.magic.len() >= 4 {
            let magic_str = String::from_utf8_lossy(&self.magic[0..4]);
            return magic_str.chars().all(|c| c.is_ascii_graphic() || c.is_ascii_whitespace());
        }
        false
    }
}

impl DataPattern {
    pub fn is_zero_pattern(&self) -> bool {
        self.data.iter().all(|&b| b == 0)
    }

    pub fn is_repeating_pattern(&self) -> bool {
        if self.data.len() <= 1 {
            return false;
        }
        let first_byte = self.data[0];
        self.data.iter().all(|&b| b == first_byte)
    }

    pub fn is_text_pattern(&self) -> bool {
        self.data.iter().all(|&b| b.is_ascii_graphic() || b.is_ascii_whitespace())
    }
}
