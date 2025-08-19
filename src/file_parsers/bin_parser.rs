use crate::file_parsers::FileParser;
use anyhow::{Context, Result};
use byteorder::{LittleEndian, ReadBytesExt};
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Read};
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum BinParseError {
    #[error("File too small to be a valid BIN file")]
    FileTooSmall,
    #[error("Invalid BIN header")]
    InvalidHeader,
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Unsupported BIN format")]
    UnsupportedFormat,
}

/// BIN file header structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BinHeader {
    pub magic: u32,
    pub version: u32,
    pub data_size: u32,
    pub flags: u32,
}

/// BIN file data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BinFile {
    pub header: BinHeader,
    pub data: Vec<u8>,
    pub sections: Vec<BinSection>,
}

/// BIN file section structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BinSection {
    pub offset: u32,
    pub size: u32,
    pub section_type: u32,
    pub data: Vec<u8>,
}

/// BIN file parser
pub struct BinParser;

impl FileParser for BinParser {
    type Output = BinFile;

    fn parse<P: AsRef<Path>>(&self, path: P) -> Result<Self::Output> {
        let path = path.as_ref();
        let file = std::fs::File::open(path)
            .with_context(|| format!("Failed to open BIN file: {}", path.display()))?;
        
        let mmap = unsafe { memmap2::Mmap::map(&file)? };
        self.parse_from_bytes(&mmap)
    }

    fn can_parse<P: AsRef<Path>>(&self, path: P) -> bool {
        path.as_ref().extension().map_or(false, |ext| ext == "bin")
    }
}

impl BinParser {
    /// Parse BIN data from bytes
    pub fn parse_from_bytes(&self, data: &[u8]) -> Result<BinFile> {
        if data.len() < 16 {
            return Err(BinParseError::FileTooSmall.into());
        }

        let mut cursor = Cursor::new(data);

        // Read header
        let magic = cursor.read_u32::<LittleEndian>()?;
        let version = cursor.read_u32::<LittleEndian>()?;
        let data_size = cursor.read_u32::<LittleEndian>()?;
        let flags = cursor.read_u32::<LittleEndian>()?;

        // Validate magic number (common BIN magic numbers)
        if magic != 0x4E494220 && magic != 0x2042494E { // " BIN" or "BIN "
            return Err(BinParseError::InvalidHeader.into());
        }

        let header = BinHeader {
            magic,
            version,
            data_size,
            flags,
        };

        // Read data
        let mut file_data = vec![0; data_size as usize];
        cursor.read_exact(&mut file_data)?;

        // Parse sections if available
        let sections = self.parse_sections(&file_data)?;

        Ok(BinFile {
            header,
            data: file_data,
            sections,
        })
    }

    /// Parse sections from BIN data
    fn parse_sections(&self, data: &[u8]) -> Result<Vec<BinSection>> {
        let mut sections = Vec::new();
        let mut offset = 0;

        while offset < data.len() {
            if offset + 12 > data.len() {
                break;
            }

            let mut cursor = Cursor::new(&data[offset..]);
            let section_offset = cursor.read_u32::<LittleEndian>()?;
            let section_size = cursor.read_u32::<LittleEndian>()?;
            let section_type = cursor.read_u32::<LittleEndian>()?;

            if section_size == 0 || offset + section_size as usize > data.len() {
                break;
            }

            let section_data = data[offset..offset + section_size as usize].to_vec();

            sections.push(BinSection {
                offset: section_offset,
                size: section_size,
                section_type,
                data: section_data,
            });

            offset += section_size as usize;
        }

        Ok(sections)
    }

    /// Extract information about the BIN file
    pub fn extract_info(&self, bin_file: &BinFile) -> String {
        format!(
            "BIN File: version {}, {} bytes, {} sections",
            bin_file.header.version,
            bin_file.header.data_size,
            bin_file.sections.len()
        )
    }

    /// Get section by type
    pub fn get_section_by_type<'a>(&self, bin_file: &'a BinFile, section_type: u32) -> Option<&'a BinSection> {
        bin_file.sections.iter().find(|s| s.section_type == section_type)
    }

    /// Extract all sections of a specific type
    pub fn get_sections_by_type<'a>(&self, bin_file: &'a BinFile, section_type: u32) -> Vec<&'a BinSection> {
        bin_file.sections
            .iter()
            .filter(|s| s.section_type == section_type)
            .collect()
    }

    /// Check if BIN file contains specific data pattern
    pub fn contains_pattern(&self, bin_file: &BinFile, pattern: &[u8]) -> bool {
        bin_file.data.windows(pattern.len()).any(|window| window == pattern)
    }
}
