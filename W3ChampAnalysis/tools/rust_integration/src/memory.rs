//! Memory Module
//! 
//! Handles memory scanning, pattern matching, and address resolution
//! for Warcraft III game data structures.

use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};
use windows::{
    Win32::Foundation::HANDLE,
    Win32::System::Memory::{VirtualQueryEx, MEMORY_BASIC_INFORMATION},
    Win32::System::Threading::{ReadProcessMemory, OpenProcess, PROCESS_QUERY_INFORMATION},
    Win32::System::SystemServices::PAGE_READWRITE,
};

use crate::{IntegrationError, injection::ProcessInfo, data_structures::MemoryRegion};

/// Memory scanner for analyzing Warcraft III process memory
pub struct MemoryScanner {
    process_handle: Arc<RwLock<Option<HANDLE>>>,
    memory_regions: Arc<RwLock<Vec<MemoryRegion>>>,
    scan_patterns: Vec<ScanPattern>,
    found_addresses: Arc<RwLock<Vec<FoundAddress>>>,
}

/// Pattern for memory scanning
#[derive(Debug, Clone)]
pub struct ScanPattern {
    pub name: String,
    pub pattern: Vec<u8>,
    pub mask: Vec<bool>, // true = exact match, false = wildcard
    pub expected_offset: usize,
    pub description: String,
}

/// Found memory address with metadata
#[derive(Debug, Clone)]
pub struct FoundAddress {
    pub pattern_name: String,
    pub address: usize,
    pub confidence: f32,
    pub last_verified: chrono::DateTime<chrono::Utc>,
    pub data_size: usize,
    pub description: String,
}

impl MemoryScanner {
    /// Create a new memory scanner
    pub fn new() -> anyhow::Result<Self> {
        let scan_patterns = vec![
            // Game state pattern
            ScanPattern {
                name: "GameState".to_string(),
                pattern: vec![0x8B, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x85, 0xC9],
                mask: vec![true, true, false, false, false, false, true, true],
                expected_offset: 0,
                description: "Game state structure pointer".to_string(),
            },
            // Player data pattern
            ScanPattern {
                name: "PlayerData".to_string(),
                pattern: vec![0x8B, 0x15, 0x00, 0x00, 0x00, 0x00, 0x85, 0xD2],
                mask: vec![true, true, false, false, false, false, true, true],
                expected_offset: 0,
                description: "Player data structure pointer".to_string(),
            },
            // Unit data pattern
            ScanPattern {
                name: "UnitData".to_string(),
                pattern: vec![0x8B, 0x35, 0x00, 0x00, 0x00, 0x00, 0x85, 0xF6],
                mask: vec![true, true, false, false, false, false, true, true],
                expected_offset: 0,
                description: "Unit data structure pointer".to_string(),
            },
            // Building data pattern
            ScanPattern {
                name: "BuildingData".to_string(),
                pattern: vec![0x8B, 0x3D, 0x00, 0x00, 0x00, 0x00, 0x85, 0xFF],
                mask: vec![true, true, false, false, false, false, true, true],
                expected_offset: 0,
                description: "Building data structure pointer".to_string(),
            },
        ];

        Ok(Self {
            process_handle: Arc::new(RwLock::new(None)),
            memory_regions: Arc::new(RwLock::new(Vec::new())),
            scan_patterns,
            found_addresses: Arc::new(RwLock::new(Vec::new())),
        })
    }

    /// Scan game memory for data structures
    pub async fn scan_game_memory(&self, process_info: &ProcessInfo) -> anyhow::Result<Vec<MemoryRegion>> {
        info!("Scanning game memory for process PID {}", process_info.pid);

        // Store process handle
        *self.process_handle.write().await = Some(process_info.handle);

        // Enumerate memory regions
        let memory_regions = self.enumerate_memory_regions(process_info).await?;
        info!("Found {} memory regions", memory_regions.len());

        // Scan for patterns in each region
        let mut found_addresses = Vec::new();
        for pattern in &self.scan_patterns {
            let addresses = self.scan_for_pattern(process_info, pattern, &memory_regions).await?;
            found_addresses.extend(addresses);
        }

        // Update found addresses
        *self.found_addresses.write().await = found_addresses.clone();
        info!("Found {} addresses during pattern scan", found_addresses.len());

        // Update memory regions
        *self.memory_regions.write().await = memory_regions.clone();

        Ok(memory_regions)
    }

    /// Enumerate memory regions in the target process
    async fn enumerate_memory_regions(&self, process_info: &ProcessInfo) -> anyhow::Result<Vec<MemoryRegion>> {
        let mut regions = Vec::new();
        let mut current_address: usize = 0;

        loop {
            unsafe {
                let mut mbi = MEMORY_BASIC_INFORMATION::default();
                let result = VirtualQueryEx(
                    process_info.handle,
                    Some(current_address as _),
                    &mut mbi,
                    std::mem::size_of::<MEMORY_BASIC_INFORMATION>(),
                );

                if result == 0 {
                    break; // No more regions
                }

                let region = MemoryRegion {
                    base_address: mbi.BaseAddress as usize,
                    size: mbi.RegionSize,
                    protection: mbi.Protect.0,
                    state: mbi.State.0,
                    type_: mbi.Type.0,
                    is_game_data: self.is_game_data_region(&mbi),
                    description: self.describe_memory_region(&mbi),
                };

                regions.push(region);

                // Move to next region
                current_address = mbi.BaseAddress as usize + mbi.RegionSize;
                
                // Prevent infinite loop
                if current_address == 0 {
                    break;
                }
            }
        }

        Ok(regions)
    }

    /// Check if a memory region contains game data
    fn is_game_data_region(&self, mbi: &MEMORY_BASIC_INFORMATION) -> bool {
        // Check if region is readable and writable
        let is_readable = mbi.Protect.0 & PAGE_READWRITE.0 != 0;
        
        // Check if region is committed
        let is_committed = mbi.State.0 == 0x1000; // MEM_COMMIT
        
        // Check if region is private (not shared)
        let is_private = mbi.Type.0 == 0x20000; // MEM_PRIVATE
        
        // Check if region size is reasonable for game data
        let reasonable_size = mbi.RegionSize > 0 && mbi.RegionSize < 0x1000000; // 16MB max
        
        is_readable && is_committed && is_private && reasonable_size
    }

    /// Describe a memory region
    fn describe_memory_region(&self, mbi: &MEMORY_BASIC_INFORMATION) -> String {
        let protection = match mbi.Protect.0 {
            0x01 => "No Access",
            0x02 => "Read Only",
            0x04 => "Read/Write",
            0x08 => "Copy on Write",
            0x10 => "Execute",
            0x20 => "Execute/Read",
            0x40 => "Execute/Read/Write",
            _ => "Unknown",
        };

        let state = match mbi.State.0 {
            0x1000 => "Committed",
            0x2000 => "Reserved",
            0x10000 => "Free",
            _ => "Unknown",
        };

        let type_ = match mbi.Type.0 {
            0x20000 => "Private",
            0x40000 => "Mapped",
            0x1000000 => "Image",
            _ => "Unknown",
        };

        format!("{} | {} | {} | {} bytes", protection, state, type_, mbi.RegionSize)
    }

    /// Scan for a specific pattern in memory regions
    async fn scan_for_pattern(
        &self,
        process_info: &ProcessInfo,
        pattern: &ScanPattern,
        memory_regions: &[MemoryRegion],
    ) -> anyhow::Result<Vec<FoundAddress>> {
        let mut found_addresses = Vec::new();

        for region in memory_regions {
            if !region.is_game_data {
                continue; // Skip non-game data regions
            }

            // Read memory from the region
            let memory_data = self.read_memory_region(process_info, region).await?;
            
            // Search for pattern in the memory data
            let matches = self.find_pattern_matches(&memory_data, pattern);
            
            for offset in matches {
                let address = region.base_address + offset;
                
                let found_address = FoundAddress {
                    pattern_name: pattern.name.clone(),
                    address,
                    confidence: self.calculate_confidence(pattern, &memory_data, offset),
                    last_verified: chrono::Utc::now(),
                    data_size: pattern.pattern.len(),
                    description: pattern.description.clone(),
                };
                
                found_addresses.push(found_address);
            }
        }

        Ok(found_addresses)
    }

    /// Read memory from a specific region
    async fn read_memory_region(&self, process_info: &ProcessInfo, region: &MemoryRegion) -> anyhow::Result<Vec<u8>> {
        let mut buffer = vec![0u8; region.size];
        let mut bytes_read = 0usize;

        unsafe {
            if !ReadProcessMemory(
                process_info.handle,
                region.base_address as _,
                Some(buffer.as_mut_ptr() as _),
                region.size,
                Some(&mut bytes_read),
            ).as_bool() {
                return Err(IntegrationError::MemoryAccessFailed(
                    format!("Failed to read memory at address 0x{:X}", region.base_address)
                ).into());
            }
        }

        buffer.truncate(bytes_read);
        Ok(buffer)
    }

    /// Find pattern matches in memory data
    fn find_pattern_matches(&self, data: &[u8], pattern: &ScanPattern) -> Vec<usize> {
        let mut matches = Vec::new();
        
        if data.len() < pattern.pattern.len() {
            return matches;
        }

        for i in 0..=data.len() - pattern.pattern.len() {
            if self.pattern_matches_at(data, pattern, i) {
                matches.push(i);
            }
        }

        matches
    }

    /// Check if pattern matches at a specific offset
    fn pattern_matches_at(&self, data: &[u8], pattern: &ScanPattern, offset: usize) -> bool {
        for (i, &byte) in pattern.pattern.iter().enumerate() {
            let data_byte = data[offset + i];
            
            if pattern.mask[i] {
                // Exact match required
                if byte != data_byte {
                    return false;
                }
            }
            // Wildcard - any byte is acceptable
        }
        
        true
    }

    /// Calculate confidence score for a found address
    fn calculate_confidence(&self, pattern: &ScanPattern, data: &[u8], offset: usize) -> f32 {
        let mut confidence = 1.0;
        
        // Check surrounding bytes for consistency
        let context_size = 16;
        let start = offset.saturating_sub(context_size);
        let end = (offset + pattern.pattern.len() + context_size).min(data.len());
        
        // Look for null bytes or suspicious patterns
        for i in start..end {
            if data[i] == 0x00 {
                confidence -= 0.1; // Penalize null bytes
            }
        }
        
        // Check if the address is aligned
        if offset % 4 != 0 {
            confidence -= 0.2; // Penalize unaligned addresses
        }
        
        confidence.max(0.0)
    }

    /// Get memory regions
    pub async fn get_memory_regions(&self) -> anyhow::Result<Vec<MemoryRegion>> {
        Ok(self.memory_regions.read().await.clone())
    }

    /// Get found addresses
    pub async fn get_found_addresses(&self) -> anyhow::Result<Vec<FoundAddress>> {
        Ok(self.found_addresses.read().await.clone())
    }

    /// Verify found addresses are still valid
    pub async fn verify_addresses(&self) -> anyhow::Result<()> {
        let mut addresses = self.found_addresses.write().await;
        
        // Remove addresses that are no longer valid
        addresses.retain(|addr| {
            // This would verify the address is still valid
            // For now, just keep all addresses
            true
        });

        Ok(())
    }

    /// Read data from a specific address
    pub async fn read_address(&self, address: usize, size: usize) -> anyhow::Result<Vec<u8>> {
        if let Some(process_handle) = *self.process_handle.read().await {
            let mut buffer = vec![0u8; size];
            let mut bytes_read = 0usize;

            unsafe {
                if !ReadProcessMemory(
                    process_handle,
                    address as _,
                    Some(buffer.as_mut_ptr() as _),
                    size,
                    Some(&mut bytes_read),
                ).as_bool() {
                    return Err(IntegrationError::MemoryAccessFailed(
                        format!("Failed to read memory at address 0x{:X}", address)
                    ).into());
                }
            }

            buffer.truncate(bytes_read);
            Ok(buffer)
        } else {
            Err(IntegrationError::MemoryAccessFailed("No process handle available".to_string()).into())
        }
    }

    /// Follow pointer chain to resolve final address
    pub async fn resolve_pointer_chain(&self, base_address: usize, offsets: &[usize]) -> anyhow::Result<usize> {
        let mut current_address = base_address;

        for &offset in offsets {
            // Read pointer at current address
            let pointer_data = self.read_address(current_address, 4).await?;
            
            if pointer_data.len() < 4 {
                return Err(IntegrationError::MemoryAccessFailed(
                    format!("Invalid pointer at address 0x{:X}", current_address)
                ).into());
            }

            // Convert bytes to pointer
            let pointer = u32::from_le_bytes([pointer_data[0], pointer_data[1], pointer_data[2], pointer_data[3]]) as usize;
            
            // Add offset
            current_address = pointer + offset;
        }

        Ok(current_address)
    }

    /// Get memory statistics
    pub async fn get_memory_stats(&self) -> anyhow::Result<MemoryStats> {
        let regions = self.memory_regions.read().await;
        let addresses = self.found_addresses.read().await;

        let mut stats = MemoryStats {
            total_regions: regions.len(),
            game_data_regions: 0,
            total_memory_size: 0,
            game_data_size: 0,
            found_addresses: addresses.len(),
            patterns_scanned: self.scan_patterns.len(),
        };

        for region in regions.iter() {
            stats.total_memory_size += region.size;
            
            if region.is_game_data {
                stats.game_data_regions += 1;
                stats.game_data_size += region.size;
            }
        }

        Ok(stats)
    }
}

/// Memory statistics
#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryStats {
    pub total_regions: usize,
    pub game_data_regions: usize,
    pub total_memory_size: usize,
    pub game_data_size: usize,
    pub found_addresses: usize,
    pub patterns_scanned: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_memory_scanner_creation() {
        let scanner = MemoryScanner::new();
        assert!(scanner.is_ok());
    }

    #[tokio::test]
    async fn test_pattern_matching() {
        let scanner = MemoryScanner::new().unwrap();
        let data = vec![0x8B, 0x0D, 0x12, 0x34, 0x56, 0x78, 0x85, 0xC9];
        let pattern = ScanPattern {
            name: "Test".to_string(),
            pattern: vec![0x8B, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x85, 0xC9],
            mask: vec![true, true, false, false, false, false, true, true],
            expected_offset: 0,
            description: "Test pattern".to_string(),
        };

        let matches = scanner.find_pattern_matches(&data, &pattern);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0], 0);
    }

    #[tokio::test]
    async fn test_confidence_calculation() {
        let scanner = MemoryScanner::new().unwrap();
        let data = vec![0x8B, 0x0D, 0x12, 0x34, 0x56, 0x78, 0x85, 0xC9];
        let pattern = ScanPattern {
            name: "Test".to_string(),
            pattern: vec![0x8B, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x85, 0xC9],
            mask: vec![true, true, false, false, false, false, true, true],
            expected_offset: 0,
            description: "Test pattern".to_string(),
        };

        let confidence = scanner.calculate_confidence(&pattern, &data, 0);
        assert!(confidence > 0.0);
        assert!(confidence <= 1.0);
    }
}
