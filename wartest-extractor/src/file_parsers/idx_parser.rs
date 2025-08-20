use crate::file_parsers::FileParser;
use anyhow::{Context, Result};
use byteorder::{LittleEndian, ReadBytesExt};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum IdxParseError {
    #[error("File too small to be a valid IDX file")]
    FileTooSmall,
    #[error("Invalid IDX header")]
    InvalidHeader,
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// IDX file entry structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdxEntry {
    pub offset: u32,
    pub size: u32,
    pub flags: u32,
    pub name: Option<String>,
}

/// IDX file structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdxFile {
    pub header: IdxHeader,
    pub entries: Vec<IdxEntry>,
}

/// IDX file header
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdxHeader {
    pub magic: u32,
    pub version: u32,
    pub entry_count: u32,
    pub flags: u32,
}

/// IDX file parser
pub struct IdxParser;

impl FileParser for IdxParser {
    type Output = IdxFile;

    fn parse<P: AsRef<Path>>(&self, path: P) -> Result<Self::Output> {
        let path = path.as_ref();
        let file = std::fs::File::open(path)
            .with_context(|| format!("Failed to open IDX file: {}", path.display()))?;
        
        let mmap = unsafe { memmap2::Mmap::map(&file)? };
        self.parse_from_bytes(&mmap)
    }

    fn can_parse<P: AsRef<Path>>(&self, path: P) -> bool {
        path.as_ref().extension().map_or(false, |ext| ext == "idx")
    }
}

impl IdxParser {
    /// Parse IDX data from bytes
    pub fn parse_from_bytes(&self, data: &[u8]) -> Result<IdxFile> {
        if data.len() < 16 {
            return Err(IdxParseError::FileTooSmall.into());
        }

        let mut cursor = Cursor::new(data);

        // Read header
        let magic = cursor.read_u32::<LittleEndian>()?;
        let version = cursor.read_u32::<LittleEndian>()?;
        let entry_count = cursor.read_u32::<LittleEndian>()?;
        let flags = cursor.read_u32::<LittleEndian>()?;

        // Validate magic number (common IDX magic numbers)
        if magic != 0x58444920 && magic != 0x20494458 { // " IDX" or "IDX "
            return Err(IdxParseError::InvalidHeader.into());
        }

        let header = IdxHeader {
            magic,
            version,
            entry_count,
            flags,
        };

        // Read entries
        let mut entries = Vec::with_capacity(entry_count as usize);
        for _ in 0..entry_count {
            let offset = cursor.read_u32::<LittleEndian>()?;
            let size = cursor.read_u32::<LittleEndian>()?;
            let entry_flags = cursor.read_u32::<LittleEndian>()?;

            entries.push(IdxEntry {
                offset,
                size,
                flags: entry_flags,
                name: None, // IDX files typically don't store names
            });
        }

        Ok(IdxFile { header, entries })
    }

    /// Extract information about the IDX file
    pub fn extract_info(&self, idx_file: &IdxFile) -> String {
        format!(
            "IDX File: {} entries, version {}, total size: {} bytes",
            idx_file.header.entry_count,
            idx_file.header.version,
            idx_file.entries.iter().map(|e| e.size).sum::<u32>()
        )
    }

    /// Get entry by index
    pub fn get_entry<'a>(&self, idx_file: &'a IdxFile, index: usize) -> Option<&'a IdxEntry> {
        idx_file.entries.get(index)
    }

    /// Find entries by size range
    pub fn find_entries_by_size<'a>(&self, idx_file: &'a IdxFile, min_size: u32, max_size: u32) -> Vec<&'a IdxEntry> {
        idx_file.entries
            .iter()
            .filter(|entry| entry.size >= min_size && entry.size <= max_size)
            .collect()
    }
}
