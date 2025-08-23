use std::path::Path;
use anyhow::{Result, Context};

/// Data utilities for Warcraft III
pub struct DataUtils;

impl DataUtils {
    /// Read binary data from file
    pub fn read_binary_file(path: &Path) -> Result<Vec<u8>> {
        std::fs::read(path)
            .with_context(|| format!("Failed to read binary file: {}", path.display()))
    }

    /// Write binary data to file
    pub fn write_binary_file(path: &Path, data: &[u8]) -> Result<()> {
        std::fs::write(path, data)
            .with_context(|| format!("Failed to write binary file: {}", path.display()))
    }

    /// Read text data from file
    pub fn read_text_file(path: &Path) -> Result<String> {
        std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read text file: {}", path.display()))
    }

    /// Write text data to file
    pub fn write_text_file(path: &Path, content: &str) -> Result<()> {
        std::fs::write(path, content)
            .with_context(|| format!("Failed to write text file: {}", path.display()))
    }

    /// Parse integer from bytes
    pub fn parse_u8(bytes: &[u8], offset: usize) -> Result<u8> {
        if offset >= bytes.len() {
            return Err(anyhow::anyhow!("Offset {} out of bounds for u8", offset));
        }
        Ok(bytes[offset])
    }

    /// Parse 16-bit integer from bytes
    pub fn parse_u16(bytes: &[u8], offset: usize) -> Result<u16> {
        if offset + 1 >= bytes.len() {
            return Err(anyhow::anyhow!("Offset {} out of bounds for u16", offset));
        }
        Ok(u16::from_le_bytes([bytes[offset], bytes[offset + 1]]))
    }

    /// Parse 32-bit integer from bytes
    pub fn parse_u32(bytes: &[u8], offset: usize) -> Result<u32> {
        if offset + 3 >= bytes.len() {
            return Err(anyhow::anyhow!("Offset {} out of bounds for u32", offset));
        }
        Ok(u32::from_le_bytes([
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3],
        ]))
    }

    /// Parse 64-bit integer from bytes
    pub fn parse_u64(bytes: &[u8], offset: usize) -> Result<u64> {
        if offset + 7 >= bytes.len() {
            return Err(anyhow::anyhow!("Offset {} out of bounds for u64", offset));
        }
        Ok(u64::from_le_bytes([
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3],
            bytes[offset + 4],
            bytes[offset + 5],
            bytes[offset + 6],
            bytes[offset + 7],
        ]))
    }

    /// Parse string from bytes
    pub fn parse_string(bytes: &[u8], offset: usize, length: usize) -> Result<String> {
        if offset + length > bytes.len() {
            return Err(anyhow::anyhow!("Offset {} + length {} out of bounds", offset, length));
        }
        
        let string_bytes = &bytes[offset..offset + length];
        
        // Find null terminator if present
        let null_pos = string_bytes.iter().position(|&b| b == 0);
        let actual_length = null_pos.unwrap_or(length);
        
        Ok(String::from_utf8_lossy(&string_bytes[..actual_length])
            .trim_matches('\0')
            .to_string())
    }

    /// Parse null-terminated string from bytes
    pub fn parse_null_terminated_string(bytes: &[u8], offset: usize) -> Result<String> {
        let mut length = 0;
        let mut pos = offset;
        
        while pos < bytes.len() && bytes[pos] != 0 {
            length += 1;
            pos += 1;
        }
        
        Self::parse_string(bytes, offset, length)
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
            return Err(anyhow::anyhow!("Hex string length must be even"));
        }
        
        let mut bytes = Vec::new();
        let mut chars = hex.chars();
        
        while let (Some(a), Some(b)) = (chars.next(), chars.next()) {
            let byte = u8::from_str_radix(&format!("{}{}", a, b), 16)
                .with_context(|| format!("Invalid hex character: {}{}", a, b))?;
            bytes.push(byte);
        }
        
        Ok(bytes)
    }

    /// Calculate checksum for data
    pub fn calculate_checksum(data: &[u8]) -> u32 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        hasher.finish() as u32
    }

    /// Calculate CRC32 checksum
    pub fn calculate_crc32(data: &[u8]) -> u32 {
        // Simple CRC32 implementation
        let mut crc: u32 = 0xFFFFFFFF;
        
        for &byte in data {
            crc ^= byte as u32;
            for _ in 0..8 {
                if (crc & 1) != 0 {
                    crc = (crc >> 1) ^ 0xEDB88320;
                } else {
                    crc >>= 1;
                }
            }
        }
        
        crc ^ 0xFFFFFFFF
    }

    /// Calculate MD5 hash
    pub fn calculate_md5(data: &[u8]) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        let hash = hasher.finish();
        
        format!("{:016x}", hash)
    }

    /// Check if data starts with magic bytes
    pub fn has_magic_bytes(data: &[u8], magic: &[u8]) -> bool {
        if data.len() < magic.len() {
            return false;
        }
        data.starts_with(magic)
    }

    /// Find magic bytes in data
    pub fn find_magic_bytes(data: &[u8], magic: &[u8]) -> Option<usize> {
        data.windows(magic.len())
            .position(|window| window == magic)
    }

    /// Extract data between magic bytes
    pub fn extract_between_magic(data: &[u8], start_magic: &[u8], end_magic: &[u8]) -> Result<Vec<u8>> {
        let start_pos = Self::find_magic_bytes(data, start_magic)
            .ok_or_else(|| anyhow::anyhow!("Start magic not found"))?;
        
        let end_pos = Self::find_magic_bytes(&data[start_pos + start_magic.len()..], end_magic)
            .ok_or_else(|| anyhow::anyhow!("End magic not found"))?;
        
        let actual_end_pos = start_pos + start_magic.len() + end_pos;
        Ok(data[start_pos + start_magic.len()..actual_end_pos].to_vec())
    }

    /// Pad data to specified length
    pub fn pad_data(data: &[u8], length: usize, padding_byte: u8) -> Vec<u8> {
        let mut padded = data.to_vec();
        
        if padded.len() < length {
            padded.extend(std::iter::repeat(padding_byte).take(length - padded.len()));
        }
        
        padded
    }

    /// Trim padding from data
    pub fn trim_padding(data: &[u8], padding_byte: u8) -> &[u8] {
        let mut end = data.len();
        
        while end > 0 && data[end - 1] == padding_byte {
            end -= 1;
        }
        
        &data[..end]
    }

    /// Reverse byte order
    pub fn reverse_bytes(data: &[u8]) -> Vec<u8> {
        data.iter().rev().cloned().collect()
    }

    /// Swap byte order for 16-bit values
    pub fn swap_bytes_u16(data: &[u8]) -> Result<Vec<u8>> {
        if data.len() % 2 != 0 {
            return Err(anyhow::anyhow!("Data length must be even for u16 swap"));
        }
        
        let mut swapped = Vec::new();
        for chunk in data.chunks(2) {
            swapped.push(chunk[1]);
            swapped.push(chunk[0]);
        }
        
        Ok(swapped)
    }

    /// Swap byte order for 32-bit values
    pub fn swap_bytes_u32(data: &[u8]) -> Result<Vec<u8>> {
        if data.len() % 4 != 0 {
            return Err(anyhow::anyhow!("Data length must be multiple of 4 for u32 swap"));
        }
        
        let mut swapped = Vec::new();
        for chunk in data.chunks(4) {
            swapped.push(chunk[3]);
            swapped.push(chunk[2]);
            swapped.push(chunk[1]);
            swapped.push(chunk[0]);
        }
        
        Ok(swapped)
    }
}

/// Game data header
#[derive(Debug, Clone)]
pub struct GameDataHeader {
    /// Magic bytes
    pub magic: [u8; 4],
    /// Version
    pub version: u32,
    /// Data size
    pub data_size: u32,
    /// Checksum
    pub checksum: u32,
    /// Flags
    pub flags: u32,
}

impl GameDataHeader {
    /// Create new game data header
    pub fn new(magic: [u8; 4], version: u32, data_size: u32, checksum: u32, flags: u32) -> Self {
        Self {
            magic,
            version,
            data_size,
            checksum,
            flags,
        }
    }

    /// Parse header from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < 20 {
            return Err(anyhow::anyhow!("Insufficient bytes for header"));
        }
        
        let magic = [bytes[0], bytes[1], bytes[2], bytes[3]];
        let version = DataUtils::parse_u32(bytes, 4)?;
        let data_size = DataUtils::parse_u32(bytes, 8)?;
        let checksum = DataUtils::parse_u32(bytes, 12)?;
        let flags = DataUtils::parse_u32(bytes, 16)?;
        
        Ok(Self {
            magic,
            version,
            data_size,
            checksum,
            flags,
        })
    }

    /// Convert header to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&self.magic);
        bytes.extend_from_slice(&self.version.to_le_bytes());
        bytes.extend_from_slice(&self.data_size.to_le_bytes());
        bytes.extend_from_slice(&self.checksum.to_le_bytes());
        bytes.extend_from_slice(&self.flags.to_le_bytes());
        bytes
    }

    /// Check if header is valid
    pub fn is_valid(&self) -> bool {
        // Check magic bytes (example: "WC3D")
        self.magic == [0x57, 0x43, 0x33, 0x44]
    }

    /// Get magic as string
    pub fn magic_string(&self) -> String {
        String::from_utf8_lossy(&self.magic).to_string()
    }

    /// Check if version is supported
    pub fn is_version_supported(&self) -> bool {
        self.version >= 1 && self.version <= 100
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_read_write_binary_file() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.bin");
        let test_data = vec![1, 2, 3, 4, 5];
        
        DataUtils::write_binary_file(&test_file, &test_data).unwrap();
        let read_data = DataUtils::read_binary_file(&test_file).unwrap();
        
        assert_eq!(read_data, test_data);
    }

    #[test]
    fn test_read_write_text_file() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        let test_content = "Hello, World!";
        
        DataUtils::write_text_file(&test_file, test_content).unwrap();
        let read_content = DataUtils::read_text_file(&test_file).unwrap();
        
        assert_eq!(read_content, test_content);
    }

    #[test]
    fn test_parse_integers() {
        let test_data = vec![1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0];
        
        assert_eq!(DataUtils::parse_u8(&test_data, 0).unwrap(), 1);
        assert_eq!(DataUtils::parse_u16(&test_data, 0).unwrap(), 1);
        assert_eq!(DataUtils::parse_u32(&test_data, 0).unwrap(), 1);
        assert_eq!(DataUtils::parse_u64(&test_data, 0).unwrap(), 1);
    }

    #[test]
    fn test_parse_strings() {
        let test_data = b"Hello\0World\0";
        
        let string1 = DataUtils::parse_null_terminated_string(test_data, 0).unwrap();
        assert_eq!(string1, "Hello");
        
        let string2 = DataUtils::parse_string(test_data, 6, 5).unwrap();
        assert_eq!(string2, "World");
    }

    #[test]
    fn test_hex_conversion() {
        let test_data = vec![0x12, 0x34, 0x56, 0x78];
        let hex_string = DataUtils::bytes_to_hex(&test_data);
        
        assert_eq!(hex_string, "12345678");
        
        let converted_back = DataUtils::hex_to_bytes(&hex_string).unwrap();
        assert_eq!(converted_back, test_data);
    }

    #[test]
    fn test_checksums() {
        let test_data = b"Hello, World!";
        
        let checksum = DataUtils::calculate_checksum(test_data);
        assert!(checksum > 0);
        
        let crc32 = DataUtils::calculate_crc32(test_data);
        assert!(crc32 > 0);
        
        let md5 = DataUtils::calculate_md5(test_data);
        assert_eq!(md5.len(), 16);
    }

    #[test]
    fn test_magic_bytes() {
        let test_data = b"WC3DHelloWorld";
        let magic = b"WC3D";
        
        assert!(DataUtils::has_magic_bytes(test_data, magic));
        
        let pos = DataUtils::find_magic_bytes(test_data, magic).unwrap();
        assert_eq!(pos, 0);
    }

    #[test]
    fn test_game_data_header() {
        let header = GameDataHeader::new(
            [0x57, 0x43, 0x33, 0x44], // "WC3D"
            1,
            1000,
            0x12345678,
            0x00000001,
        );
        
        assert!(header.is_valid());
        assert_eq!(header.magic_string(), "WC3D");
        assert!(header.is_version_supported());
        
        let bytes = header.to_bytes();
        let parsed_header = GameDataHeader::from_bytes(&bytes).unwrap();
        
        assert_eq!(header.magic, parsed_header.magic);
        assert_eq!(header.version, parsed_header.version);
        assert_eq!(header.data_size, parsed_header.data_size);
    }

    #[test]
    fn test_data_manipulation() {
        let test_data = vec![1, 2, 3, 4];
        
        let padded = DataUtils::pad_data(&test_data, 8, 0);
        assert_eq!(padded.len(), 8);
        assert_eq!(padded[4..], [0, 0, 0, 0]);
        
        let trimmed = DataUtils::trim_padding(&padded, 0);
        assert_eq!(trimmed, test_data.as_slice());
        
        let reversed = DataUtils::reverse_bytes(&test_data);
        assert_eq!(reversed, vec![4, 3, 2, 1]);
    }
}
