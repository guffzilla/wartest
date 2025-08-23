use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// Data utilities for WC1
pub struct DataUtils;

impl DataUtils {
    /// Read binary data from file
    pub fn read_binary_data(path: &Path) -> Result<Vec<u8>> {
        std::fs::read(path)
            .with_context(|| format!("Failed to read binary data from {}", path.display()))
    }

    /// Write binary data to file
    pub fn write_binary_data(path: &Path, data: &[u8]) -> Result<()> {
        // Create parent directory if it doesn't exist
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create directory {}", parent.display()))?;
        }
        
        std::fs::write(path, data)
            .with_context(|| format!("Failed to write binary data to {}", path.display()))
    }

    /// Read text data from file
    pub fn read_text_data(path: &Path) -> Result<String> {
        std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read text data from {}", path.display()))
    }

    /// Write text data to file
    pub fn write_text_data(path: &Path, data: &str) -> Result<()> {
        // Create parent directory if it doesn't exist
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create directory {}", parent.display()))?;
        }
        
        std::fs::write(path, data)
            .with_context(|| format!("Failed to write text data to {}", path.display()))
    }

    /// Parse integer from bytes
    pub fn parse_u16_le(bytes: &[u8], offset: usize) -> Result<u16> {
        if offset + 2 > bytes.len() {
            return Err(anyhow::anyhow!("Invalid offset for u16: offset={}, len={}", offset, bytes.len()));
        }
        
        let value = u16::from_le_bytes([bytes[offset], bytes[offset + 1]]);
        Ok(value)
    }

    /// Parse integer from bytes
    pub fn parse_u32_le(bytes: &[u8], offset: usize) -> Result<u32> {
        if offset + 4 > bytes.len() {
            return Err(anyhow::anyhow!("Invalid offset for u32: offset={}, len={}", offset, bytes.len()));
        }
        
        let value = u32::from_le_bytes([
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3],
        ]);
        Ok(value)
    }

    /// Parse string from bytes
    pub fn parse_string(bytes: &[u8], offset: usize, length: usize) -> Result<String> {
        if offset + length > bytes.len() {
            return Err(anyhow::anyhow!("Invalid offset for string: offset={}, length={}, len={}", offset, length, bytes.len()));
        }
        
        let string_bytes = &bytes[offset..offset + length];
        
        // Find null terminator
        let null_pos = string_bytes.iter().position(|&b| b == 0);
        let actual_length = null_pos.unwrap_or(length);
        
        let string = String::from_utf8_lossy(&string_bytes[..actual_length]);
        Ok(string.to_string())
    }

    /// Parse null-terminated string from bytes
    pub fn parse_null_terminated_string(bytes: &[u8], offset: usize) -> Result<String> {
        if offset >= bytes.len() {
            return Err(anyhow::anyhow!("Invalid offset for null-terminated string: offset={}, len={}", offset, bytes.len()));
        }
        
        let mut end_offset = offset;
        while end_offset < bytes.len() && bytes[end_offset] != 0 {
            end_offset += 1;
        }
        
        let string_bytes = &bytes[offset..end_offset];
        let string = String::from_utf8_lossy(string_bytes);
        Ok(string.to_string())
    }

    /// Convert bytes to hex string
    pub fn bytes_to_hex(bytes: &[u8]) -> String {
        bytes.iter()
            .map(|b| format!("{:02x}", b))
            .collect::<Vec<String>>()
            .join("")
    }

    /// Convert hex string to bytes
    pub fn hex_to_bytes(hex: &str) -> Result<Vec<u8>> {
        if hex.len() % 2 != 0 {
            return Err(anyhow::anyhow!("Hex string must have even length"));
        }
        
        let mut bytes = Vec::new();
        for i in (0..hex.len()).step_by(2) {
            let byte_str = &hex[i..i + 2];
            let byte = u8::from_str_radix(byte_str, 16)
                .with_context(|| format!("Invalid hex string: {}", byte_str))?;
            bytes.push(byte);
        }
        
        Ok(bytes)
    }

    /// Calculate checksum of data
    pub fn calculate_checksum(data: &[u8]) -> u32 {
        data.iter().fold(0u32, |acc, &byte| acc.wrapping_add(byte as u32))
    }

    /// Validate data integrity using checksum
    pub fn validate_checksum(data: &[u8], expected_checksum: u32) -> bool {
        let actual_checksum = Self::calculate_checksum(data);
        actual_checksum == expected_checksum
    }
}

/// Data structure for WC1 game data
#[derive(Debug, Clone)]
pub struct GameDataHeader {
    /// Magic number/identifier
    pub magic: [u8; 4],
    /// Version number
    pub version: u16,
    /// Data size
    pub data_size: u32,
    /// Checksum
    pub checksum: u32,
}

impl GameDataHeader {
    /// Parse header from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < 16 {
            return Err(anyhow::anyhow!("Header too small: {} bytes", bytes.len()));
        }
        
        let magic = [bytes[0], bytes[1], bytes[2], bytes[3]];
        let version = DataUtils::parse_u16_le(bytes, 4)?;
        let data_size = DataUtils::parse_u32_le(bytes, 6)?;
        let checksum = DataUtils::parse_u32_le(bytes, 10)?;
        
        Ok(Self {
            magic,
            version,
            data_size,
            checksum,
        })
    }

    /// Convert header to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&self.magic);
        bytes.extend_from_slice(&self.version.to_le_bytes());
        bytes.extend_from_slice(&self.data_size.to_le_bytes());
        bytes.extend_from_slice(&self.checksum.to_le_bytes());
        bytes
    }

    /// Validate magic number
    pub fn is_valid_magic(&self) -> bool {
        self.magic == [b'W', b'A', b'R', b'1'] // "WAR1"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_binary_data_io() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.bin");
        let test_data = b"Hello, World!";
        
        DataUtils::write_binary_data(&test_file, test_data).unwrap();
        let read_data = DataUtils::read_binary_data(&test_file).unwrap();
        
        assert_eq!(read_data, test_data);
    }

    #[test]
    fn test_text_data_io() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        let test_text = "Hello, World!";
        
        DataUtils::write_text_data(&test_file, test_text).unwrap();
        let read_text = DataUtils::read_text_data(&test_file).unwrap();
        
        assert_eq!(read_text, test_text);
    }

    #[test]
    fn test_parse_integers() {
        let bytes = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0];
        
        assert_eq!(DataUtils::parse_u16_le(&bytes, 0).unwrap(), 0x3412);
        assert_eq!(DataUtils::parse_u32_le(&bytes, 0).unwrap(), 0x78563412);
    }

    #[test]
    fn test_parse_strings() {
        let bytes = b"Hello\0World";
        
        assert_eq!(DataUtils::parse_string(&bytes, 0, 5).unwrap(), "Hello");
        assert_eq!(DataUtils::parse_null_terminated_string(&bytes, 0).unwrap(), "Hello");
    }

    #[test]
    fn test_hex_conversion() {
        let bytes = [0x12, 0x34, 0x56, 0x78];
        let hex = DataUtils::bytes_to_hex(&bytes);
        
        assert_eq!(hex, "12345678");
        assert_eq!(DataUtils::hex_to_bytes(&hex).unwrap(), bytes);
    }

    #[test]
    fn test_checksum() {
        let data = b"Hello, World!";
        let checksum = DataUtils::calculate_checksum(data);
        
        assert!(DataUtils::validate_checksum(data, checksum));
        assert!(!DataUtils::validate_checksum(data, checksum + 1));
    }

    #[test]
    fn test_game_data_header() {
        let header = GameDataHeader {
            magic: [b'W', b'A', b'R', b'1'],
            version: 1,
            data_size: 1024,
            checksum: 42,
        };
        
        assert!(header.is_valid_magic());
        
        let bytes = header.to_bytes();
        let parsed_header = GameDataHeader::from_bytes(&bytes).unwrap();
        
        assert_eq!(parsed_header.magic, header.magic);
        assert_eq!(parsed_header.version, header.version);
        assert_eq!(parsed_header.data_size, header.data_size);
        assert_eq!(parsed_header.checksum, header.checksum);
    }
}
