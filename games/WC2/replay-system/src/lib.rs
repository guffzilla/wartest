//! WC2 Replay System
//! 
//! A comprehensive system for analyzing, viewing, and managing Warcraft II replays
//! across different game versions with unified data formats and enhanced visualization.

pub mod decoder;
pub mod structures;
pub mod emulator;

use std::sync::Arc;
use anyhow::Result;

/// Main WC2 replay system
pub struct WC2ReplaySystem {
    decoder: Arc<decoder::ReplayDecoder>,
}

impl WC2ReplaySystem {
    /// Create a new WC2 replay system instance
    pub fn new() -> Result<Self> {
        let decoder = Arc::new(decoder::ReplayDecoder::new());
        
        Ok(Self {
            decoder,
        })
    }
    
    /// Get the replay decoder
    pub fn get_decoder(&self) -> Arc<decoder::ReplayDecoder> {
        self.decoder.clone()
    }
    
    /// Create a new replay emulator
    pub fn create_emulator(&self) -> Result<emulator::WC2ReplayEmulator> {
        emulator::WC2ReplayEmulator::new()
    }
}
