use std::io::{Read, Seek, SeekFrom, Cursor};
use std::path::Path;
use anyhow::{Result, Context};

/// Binary parser for game data files
pub struct BinaryParser<R> {
    reader: R,
    position: u64,
}

impl<R> BinaryParser<R>
where
    R: Read + Seek,
{
    /// Create a new binary parser from a reader
    pub fn new(reader: R) -> Self {
        Self {
            reader,
            position: 0,
        }
    }

    /// Create a binary parser from a file path
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<BinaryParser<std::fs::File>> {
        let file = std::fs::File::open(path)
            .with_context(|| "Failed to open file for binary parsing")?;
        Ok(BinaryParser::new(file))
    }

    /// Read a u8 value
    pub fn read_u8(&mut self) -> Result<u8> {
        let mut buffer = [0u8; 1];
        self.reader.read_exact(&mut buffer)
            .with_context(|| "Failed to read u8")?;
        self.position += 1;
        Ok(buffer[0])
    }

    /// Read a u16 value (little endian)
    pub fn read_u16(&mut self) -> Result<u16> {
        let mut buffer = [0u8; 2];
        self.reader.read_exact(&mut buffer)
            .with_context(|| "Failed to read u16")?;
        self.position += 2;
        Ok(u16::from_le_bytes(buffer))
    }

    /// Read a u32 value (little endian)
    pub fn read_u32(&mut self) -> Result<u32> {
        let mut buffer = [0u8; 4];
        self.reader.read_exact(&mut buffer)
            .with_context(|| "Failed to read u32")?;
        self.position += 4;
        Ok(u32::from_le_bytes(buffer))
    }

    /// Read a u64 value (little endian)
    pub fn read_u64(&mut self) -> Result<u64> {
        let mut buffer = [0u8; 8];
        self.reader.read_exact(&mut buffer)
            .with_context(|| "Failed to read u64")?;
        self.position += 8;
        Ok(u64::from_le_bytes(buffer))
    }

    /// Read a string with specified length
    pub fn read_string(&mut self, length: usize) -> Result<String> {
        let mut buffer = vec![0u8; length];
        self.reader.read_exact(&mut buffer)
            .with_context(|| format!("Failed to read string of length {}", length))?;
        self.position += length as u64;
        
        // Remove null terminators and convert to string
        let string = buffer.iter()
            .take_while(|&&b| b != 0)
            .map(|&b| b as char)
            .collect();
        Ok(string)
    }

    /// Read a null-terminated string
    pub fn read_null_terminated_string(&mut self) -> Result<String> {
        let mut buffer = Vec::new();
        let mut byte = self.read_u8()?;
        
        while byte != 0 {
            buffer.push(byte);
            byte = self.read_u8()?;
        }
        
        Ok(String::from_utf8(buffer)
            .with_context(|| "Invalid UTF-8 in string")?)
    }

    /// Read bytes into a buffer
    pub fn read_bytes(&mut self, length: usize) -> Result<Vec<u8>> {
        let mut buffer = vec![0u8; length];
        self.reader.read_exact(&mut buffer)
            .with_context(|| format!("Failed to read {} bytes", length))?;
        self.position += length as u64;
        Ok(buffer)
    }

    /// Seek to a specific position
    pub fn seek(&mut self, position: u64) -> Result<()> {
        self.reader.seek(SeekFrom::Start(position))
            .with_context(|| format!("Failed to seek to position {}", position))?;
        self.position = position;
        Ok(())
    }

    /// Get current position
    pub fn position(&self) -> u64 {
        self.position
    }

    /// Skip bytes
    pub fn skip(&mut self, bytes: u64) -> Result<()> {
        self.seek(self.position + bytes)
    }
}

impl BinaryParser<Cursor<Vec<u8>>> {
    /// Create a binary parser from a byte vector
    pub fn from_bytes(bytes: Vec<u8>) -> Self {
        Self::new(Cursor::new(bytes))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read_u8() {
        let data = vec![42u8];
        let mut parser = BinaryParser::from_bytes(data);
        assert_eq!(parser.read_u8().unwrap(), 42);
    }

    #[test]
    fn test_read_u16() {
        let data = vec![42u8, 0u8]; // 42 in little endian
        let mut parser = BinaryParser::from_bytes(data);
        assert_eq!(parser.read_u16().unwrap(), 42);
    }

    #[test]
    fn test_read_string() {
        let data = b"Hello\0World".to_vec();
        let mut parser = BinaryParser::from_bytes(data);
        assert_eq!(parser.read_string(5).unwrap(), "Hello");
    }
}
