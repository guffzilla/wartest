//! Playback controller for managing replay timing and controls
//! 
//! This module handles the timing and control aspects of replay playback,
//! including play/pause/stop functionality and speed control.

use anyhow::Result;
use std::time::{Duration, Instant};

/// Playback state enumeration
#[derive(Debug, Clone, PartialEq)]
pub enum PlaybackState {
    Stopped,
    Playing,
    Paused,
    Seeking,
}

/// Playback controller for managing replay timing
pub struct PlaybackController {
    state: PlaybackState,
    playback_speed: f32,
    start_time: Option<Instant>,
    paused_time: Duration,
    total_elapsed: Duration,
}

impl PlaybackController {
    /// Create a new playback controller
    pub fn new() -> Self {
        Self {
            state: PlaybackState::Stopped,
            playback_speed: 1.0,
            start_time: None,
            paused_time: Duration::ZERO,
            total_elapsed: Duration::ZERO,
        }
    }
    
    /// Start playback
    pub fn start(&mut self) -> Result<()> {
        match self.state {
            PlaybackState::Stopped => {
                // Starting fresh
                self.start_time = Some(Instant::now());
                self.paused_time = Duration::ZERO;
                self.total_elapsed = Duration::ZERO;
            }
            PlaybackState::Paused => {
                // Resuming from pause
                if let Some(start) = self.start_time {
                    let now = Instant::now();
                    self.paused_time += now.duration_since(start);
                    self.start_time = Some(now);
                }
            }
            _ => {
                // Already playing or seeking
                return Ok(());
            }
        }
        
        self.state = PlaybackState::Playing;
        Ok(())
    }
    
    /// Pause playback
    pub fn pause(&mut self) -> Result<()> {
        if self.state == PlaybackState::Playing {
            if let Some(start) = self.start_time {
                let now = Instant::now();
                self.total_elapsed += now.duration_since(start);
                self.start_time = None;
            }
            self.state = PlaybackState::Paused;
        }
        
        Ok(())
    }
    
    /// Stop playback
    pub fn stop(&mut self) -> Result<()> {
        self.state = PlaybackState::Stopped;
        self.start_time = None;
        self.paused_time = Duration::ZERO;
        self.total_elapsed = Duration::ZERO;
        
        Ok(())
    }
    
    /// Set playback speed
    pub fn set_speed(&mut self, speed: f32) -> Result<()> {
        if speed > 0.0 && speed <= 8.0 {
            self.playback_speed = speed;
        } else {
            return Err(anyhow::anyhow!("Invalid playback speed: {}", speed));
        }
        
        Ok(())
    }
    
    /// Get current playback speed
    pub fn get_speed(&self) -> f32 {
        self.playback_speed
    }
    
    /// Seek to a specific time
    pub fn seek_to_time(&mut self, time_seconds: f32) -> Result<()> {
        let target_time = Duration::from_secs_f32(time_seconds);
        
        self.state = PlaybackState::Seeking;
        self.total_elapsed = target_time;
        self.paused_time = Duration::ZERO;
        self.start_time = None;
        
        // Brief delay to indicate seeking state
        std::thread::sleep(Duration::from_millis(50));
        
        self.state = PlaybackState::Paused;
        
        Ok(())
    }
    
    /// Get current playback time
    pub fn get_current_time(&self) -> Duration {
        match self.state {
            PlaybackState::Playing => {
                if let Some(start) = self.start_time {
                    let now = Instant::now();
                    let elapsed = now.duration_since(start);
                    self.total_elapsed + elapsed
                } else {
                    self.total_elapsed
                }
            }
            PlaybackState::Paused | PlaybackState::Stopped => {
                self.total_elapsed
            }
            PlaybackState::Seeking => {
                self.total_elapsed
            }
        }
    }
    
    /// Get current playback state
    pub fn get_state(&self) -> PlaybackState {
        self.state.clone()
    }
    
    /// Check if playback is currently playing
    pub fn is_playing(&self) -> bool {
        self.state == PlaybackState::Playing
    }
    
    /// Check if playback is paused
    pub fn is_paused(&self) -> bool {
        self.state == PlaybackState::Paused
    }
    
    /// Check if playback is stopped
    pub fn is_stopped(&self) -> bool {
        self.state == PlaybackState::Stopped
    }
    
    /// Get elapsed time adjusted for playback speed
    pub fn get_adjusted_elapsed(&self) -> Duration {
        let current_time = self.get_current_time();
        let adjusted_seconds = current_time.as_secs_f32() * self.playback_speed;
        Duration::from_secs_f32(adjusted_seconds)
    }
    
    /// Get remaining time based on total duration
    pub fn get_remaining_time(&self, total_duration: Duration) -> Duration {
        let current = self.get_current_time();
        if current < total_duration {
            total_duration - current
        } else {
            Duration::ZERO
        }
    }
    
    /// Get playback progress as percentage (0.0 to 1.0)
    pub fn get_progress(&self, total_duration: Duration) -> f32 {
        if total_duration.is_zero() {
            0.0
        } else {
            let current = self.get_current_time();
            (current.as_secs_f32() / total_duration.as_secs_f32()).min(1.0)
        }
    }
    
    /// Step forward by one frame/event
    pub fn step_forward(&mut self, step_duration: Duration) -> Result<()> {
        self.total_elapsed += step_duration;
        self.state = PlaybackState::Paused;
        self.start_time = None;
        
        Ok(())
    }
    
    /// Step backward by one frame/event
    pub fn step_backward(&mut self, step_duration: Duration) -> Result<()> {
        if self.total_elapsed >= step_duration {
            self.total_elapsed -= step_duration;
        } else {
            self.total_elapsed = Duration::ZERO;
        }
        
        self.state = PlaybackState::Paused;
        self.start_time = None;
        
        Ok(())
    }
    
    /// Reset playback to beginning
    pub fn reset(&mut self) -> Result<()> {
        self.stop()?;
        self.total_elapsed = Duration::ZERO;
        self.paused_time = Duration::ZERO;
        
        Ok(())
    }
}

