use std::fs;
use std::path::Path;
use anyhow::Result;
use sha2::{Sha256, Digest};
use hex;
use byteorder::{LittleEndian, ReadBytesExt};
use std::io::{Read, Seek, SeekFrom};

use crate::structures::{FileAnalysis, FileType, FileHeader, DataPattern};

pub struct BinaryAnalyzer {
    max_header_size: usize,
    pattern_size: usize,
}

impl BinaryAnalyzer {
    pub fn new() -> Self {
        Self {
            max_header_size: 1024, // Analyze first 1KB for headers
            pattern_size: 16,      // Look for 16-byte patterns
        }
    }

    pub fn analyze_file(&self, file_path: &str) -> Result<FileAnalysis> {
        let path = Path::new(file_path);
        let filename = path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unknown")
            .to_string();

        let metadata = fs::metadata(path)?;
        let file_size = metadata.len();

        // Read file content
        let mut file = fs::File::open(path)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;

        // Calculate file hash
        let file_hash = self.calculate_hash(&buffer);

        // Determine file type
        let file_type = self.determine_file_type(&filename, &buffer);

        // Analyze header
        let header = self.analyze_header(&buffer);

        // Find patterns
        let patterns = self.find_patterns(&buffer);

        Ok(FileAnalysis {
            filename,
            file_size,
            file_type,
            file_hash,
            header,
            patterns,
        })
    }

    fn calculate_hash(&self, data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hex::encode(hasher.finalize())
    }

    fn determine_file_type(&self, filename: &str, data: &[u8]) -> FileType {
        // Check file extension
        if filename.ends_with(".idx") {
            if filename.starts_with("0") && filename.len() == 13 {
                return FileType::W2RReplay;
            } else {
                return FileType::Index;
            }
        } else if filename.ends_with(".index") {
            return FileType::HashIndex;
        } else if filename == "data.000" {
            return FileType::GameData;
        } else if filename == "shmem" {
            return FileType::SharedMemory;
        } else if filename == ".residency" {
            return FileType::Residency;
        }

        // Try to determine from content
        if data.len() >= 4 {
            let magic = &data[0..4];
            if magic == b"W2R\0" {
                return FileType::W2RReplay;
            } else if magic == b"IDX\0" {
                return FileType::Index;
            }
        }

        FileType::Unknown
    }

    fn analyze_header(&self, data: &[u8]) -> Option<FileHeader> {
        if data.len() < 32 {
            return None;
        }

        let header_size = std::cmp::min(self.max_header_size, data.len());
        let header_data = &data[0..header_size];

        // Try to read as little-endian values
        let mut cursor = std::io::Cursor::new(header_data);
        
        let mut header = FileHeader {
            magic: Vec::new(),
            version: 0,
            file_size: 0,
            timestamp: 0,
            flags: 0,
            reserved: Vec::new(),
        };

        // Read first 4 bytes as potential magic number
        if header_data.len() >= 4 {
            header.magic = header_data[0..4].to_vec();
        }

        // Try to read version (4 bytes)
        if let Ok(version) = cursor.seek(SeekFrom::Start(4)).and_then(|_| cursor.read_u32::<LittleEndian>()) {
            header.version = version;
        }

        // Try to read file size (4 bytes)
        if let Ok(file_size) = cursor.seek(SeekFrom::Start(8)).and_then(|_| cursor.read_u32::<LittleEndian>()) {
            header.file_size = file_size;
        }

        // Try to read timestamp (8 bytes)
        if let Ok(timestamp) = cursor.seek(SeekFrom::Start(12)).and_then(|_| cursor.read_u64::<LittleEndian>()) {
            header.timestamp = timestamp;
        }

        // Try to read flags (4 bytes)
        if let Ok(flags) = cursor.seek(SeekFrom::Start(20)).and_then(|_| cursor.read_u32::<LittleEndian>()) {
            header.flags = flags;
        }

        // Read remaining bytes as reserved
        if header_data.len() > 24 {
            header.reserved = header_data[24..].to_vec();
        }

        Some(header)
    }

    fn find_patterns(&self, data: &[u8]) -> Option<Vec<DataPattern>> {
        if data.len() < self.pattern_size {
            return None;
        }

        let mut patterns = Vec::new();
        let mut i = 0;

        while i <= data.len() - self.pattern_size {
            let pattern_data = &data[i..i + self.pattern_size];
            
            // Look for repeating patterns
            let pattern = DataPattern {
                offset: i,
                data: pattern_data.to_vec(),
                hex_string: hex::encode(pattern_data),
                frequency: self.count_pattern_occurrences(data, pattern_data),
            };

            // Only add patterns that appear multiple times or have interesting characteristics
            if pattern.frequency > 1 || self.is_interesting_pattern(pattern_data) {
                patterns.push(pattern);
            }

            i += 1;
        }

        // Remove duplicates and sort by frequency
        patterns.sort_by(|a, b| b.frequency.cmp(&a.frequency));
        patterns.dedup_by(|a, b| a.data == b.data);

        // Limit to top 10 patterns
        patterns.truncate(10);

        if patterns.is_empty() {
            None
        } else {
            Some(patterns)
        }
    }

    fn count_pattern_occurrences(&self, data: &[u8], pattern: &[u8]) -> usize {
        let mut count = 0;
        let mut i = 0;

        while i <= data.len() - pattern.len() {
            if &data[i..i + pattern.len()] == pattern {
                count += 1;
            }
            i += 1;
        }

        count
    }

    fn is_interesting_pattern(&self, data: &[u8]) -> bool {
        // Check for all zeros
        if data.iter().all(|&b| b == 0) {
            return true;
        }

        // Check for all ones
        if data.iter().all(|&b| b == 0xFF) {
            return true;
        }

        // Check for repeating bytes
        if data.len() > 1 {
            let first_byte = data[0];
            if data.iter().all(|&b| b == first_byte) {
                return true;
            }
        }

        // Check for potential text (printable ASCII)
        if data.iter().all(|&b| b.is_ascii_graphic() || b.is_ascii_whitespace()) {
            return true;
        }

        false
    }
}
