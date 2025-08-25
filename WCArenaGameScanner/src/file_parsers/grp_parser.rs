use crate::file_parsers::FileParser;
use anyhow::{Context, Result};
use byteorder::{LittleEndian, ReadBytesExt};
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Read};
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GrpParseError {
    #[error("File too small to be a valid GRP file")]
    FileTooSmall,
    #[error("Invalid dimensions: width={width}, height={height}")]
    InvalidDimensions { width: u16, height: u16 },
    #[error("Invalid frame count: {frame_count}")]
    InvalidFrameCount { frame_count: u16 },
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Invalid palette data")]
    InvalidPalette,
    #[error("Unsupported GRP format version")]
    UnsupportedFormat,
}

/// GRP file header structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpHeader {
    pub width: u16,
    pub height: u16,
    pub frame_count: u16,
    pub flags: u16,
}

/// GRP sprite data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpSprite {
    pub header: GrpHeader,
    pub pixel_data: Vec<u8>,
    pub palette: Vec<u8>,
    pub frame_offsets: Vec<u32>,
}

/// GRP file parser
pub struct GrpParser;

impl FileParser for GrpParser {
    type Output = GrpSprite;

    fn parse<P: AsRef<Path>>(&self, path: P) -> Result<Self::Output> {
        let path = path.as_ref();
        let file = std::fs::File::open(path)
            .with_context(|| format!("Failed to open GRP file: {}", path.display()))?;
        
        let mmap = unsafe { memmap2::Mmap::map(&file)? };
        self.parse_from_bytes(&mmap)
    }

    fn can_parse<P: AsRef<Path>>(&self, path: P) -> bool {
        path.as_ref().extension().map_or(false, |ext| ext == "grp")
    }
}

impl GrpParser {
    /// Parse GRP data from bytes
    pub fn parse_from_bytes(&self, data: &[u8]) -> Result<GrpSprite> {
        if data.len() < 8 {
            return Err(GrpParseError::FileTooSmall.into());
        }

        let mut cursor = Cursor::new(data);

        // Read header
        let width = cursor.read_u16::<LittleEndian>()?;
        let height = cursor.read_u16::<LittleEndian>()?;
        let frame_count = cursor.read_u16::<LittleEndian>()?;
        let flags = cursor.read_u16::<LittleEndian>()?;

        // Validate header
        if width == 0 || height == 0 {
            return Err(GrpParseError::InvalidDimensions { width, height }.into());
        }

        if frame_count == 0 {
            return Err(GrpParseError::InvalidFrameCount { frame_count }.into());
        }

        let header = GrpHeader {
            width,
            height,
            frame_count,
            flags,
        };

        // Read frame offsets
        let mut frame_offsets = Vec::with_capacity(frame_count as usize);
        for _ in 0..frame_count {
            let offset = cursor.read_u32::<LittleEndian>()?;
            frame_offsets.push(offset);
        }

        // Read palette (typically 256 colors * 3 bytes = 768 bytes)
        let palette_size = 768;
        let mut palette = vec![0; palette_size];
        cursor.read_exact(&mut palette)?;

        // Read pixel data
        let remaining_data = &data[cursor.position() as usize..];
        let pixel_data = remaining_data.to_vec();

        Ok(GrpSprite {
            header,
            pixel_data,
            palette,
            frame_offsets,
        })
    }

    /// Convert GRP sprite to PNG image
    pub fn to_png(&self, sprite: &GrpSprite, output_path: &Path) -> Result<()> {
        use image::{ImageBuffer, Rgb, RgbImage};

        let width = sprite.header.width as u32;
        let height = sprite.header.height as u32;
        let mut img: RgbImage = ImageBuffer::new(width, height);

        // Convert palette indices to RGB values
        for (i, &pixel_index) in sprite.pixel_data.iter().enumerate() {
            if i >= (width * height) as usize {
                break;
            }

            let palette_offset = (pixel_index as usize) * 3;
            if palette_offset + 2 < sprite.palette.len() {
                let r = sprite.palette[palette_offset];
                let g = sprite.palette[palette_offset + 1];
                let b = sprite.palette[palette_offset + 2];

                let x = (i as u32) % width;
                let y = (i as u32) / width;

                if x < width && y < height {
                    img.put_pixel(x, y, Rgb([r, g, b]));
                }
            }
        }

        img.save(output_path)
            .with_context(|| format!("Failed to save PNG: {}", output_path.display()))?;

        Ok(())
    }

    /// Extract sprite information
    pub fn extract_info(&self, sprite: &GrpSprite) -> String {
        format!(
            "GRP Sprite: {}x{} pixels, {} frames, {} bytes of pixel data",
            sprite.header.width,
            sprite.header.height,
            sprite.header.frame_count,
            sprite.pixel_data.len()
        )
    }
}
