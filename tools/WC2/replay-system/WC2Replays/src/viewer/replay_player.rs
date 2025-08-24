use std::time::{Duration, Instant};
use anyhow::Result;
use tracing::{info, warn, error};

use crate::decoder::{DecodedReplay, events::GameEvent};
use crate::decoder::game_state::GameState;

/// Replay player that handles playback timing and state management
pub struct ReplayPlayer {
    replay: Option<DecodedReplay>,
    game_state: GameState,
    current_event_index: usize,
    current_time: f32, // Current time in seconds
    playback_speed: f32,
    is_playing: bool,
    last_update: Instant,
}

impl ReplayPlayer {
    pub fn new() -> Self {
        Self {
            replay: None,
            game_state: GameState::new(),
            current_event_index: 0,
            current_time: 0.0,
            playback_speed: 1.0,
            is_playing: false,
            last_update: Instant::now(),
        }
    }

    /// Load a replay for playback
    pub fn load_replay(&mut self, replay: DecodedReplay) -> Result<()> {
        info!("Loading replay for playback: {}", replay.metadata.filename);
        
        self.replay = Some(replay);
        self.game_state = GameState::new();
        self.current_event_index = 0;
        self.current_time = 0.0;
        self.is_playing = false;
        self.last_update = Instant::now();
        
        // Initialize game state with player information
        if let Some(replay) = &self.replay {
            for player in &replay.metadata.players {
                self.game_state.players.insert(player.team, crate::decoder::game_state::PlayerState {
                    id: player.team,
                    name: player.name.clone(),
                    race: player.race.clone(),
                    color: player.color.clone(),
                    team: player.team,
                    is_active: true,
                    is_winner: Some(player.is_winner),
                    apm: player.apm,
                    total_actions: 0,
                });
            }
        }
        
        info!("Replay loaded successfully");
        Ok(())
    }

    /// Update the player state (called every frame)
    pub fn update(&mut self) {
        if !self.is_playing || self.replay.is_none() {
            return;
        }

        let now = Instant::now();
        let delta_time = now.duration_since(self.last_update).as_secs_f32();
        self.last_update = now;

        // Advance time based on playback speed
        let time_delta = delta_time * self.playback_speed;
        self.current_time += time_delta;

        // Process events that should occur at the current time
        self.process_events_at_current_time();
    }

    /// Process all events that should occur at the current time
    fn process_events_at_current_time(&mut self) {
        if let Some(replay) = &self.replay {
            let current_time_ms = (self.current_time * 1000.0) as u32;
            
            // Process events up to current time
            while self.current_event_index < replay.events.len() {
                let event = &replay.events[self.current_event_index];
                
                if event.timestamp <= current_time_ms {
                    // Apply this event to the game state
                    self.game_state.apply_event(event);
                    self.current_event_index += 1;
                } else {
                    break;
                }
            }
        }
    }

    /// Toggle playback (play/pause)
    pub fn toggle_playback(&mut self) {
        self.is_playing = !self.is_playing;
        self.last_update = Instant::now();
        
        if self.is_playing {
            info!("Playback started");
        } else {
            info!("Playback paused");
        }
    }

    /// Start playback
    pub fn play(&mut self) {
        self.is_playing = true;
        self.last_update = Instant::now();
        info!("Playback started");
    }

    /// Pause playback
    pub fn pause(&mut self) {
        self.is_playing = false;
        info!("Playback paused");
    }

    /// Stop playback and reset to beginning
    pub fn stop(&mut self) {
        self.is_playing = false;
        self.current_event_index = 0;
        self.current_time = 0.0;
        self.game_state = GameState::new();
        info!("Playback stopped");
    }

    /// Seek to a specific time
    pub fn seek_to_time(&mut self, time: f32) {
        self.current_time = time.max(0.0);
        self.current_event_index = 0;
        self.game_state = GameState::new();
        
        // Replay events up to the seek time
        if let Some(replay) = &self.replay {
            let target_time_ms = (time * 1000.0) as u32;
            
            for event in &replay.events {
                if event.timestamp <= target_time_ms {
                    self.game_state.apply_event(event);
                    self.current_event_index += 1;
                } else {
                    break;
                }
            }
        }
        
        info!("Seeked to {:.1}s", time);
    }

    /// Seek to the beginning
    pub fn seek_to_start(&mut self) {
        self.seek_to_time(0.0);
    }

    /// Seek to the end
    pub fn seek_to_end(&mut self) {
        if let Some(replay) = &self.replay {
            let total_time = replay.metadata.duration.as_secs_f32();
            self.seek_to_time(total_time);
        }
    }

    /// Set playback speed
    pub fn set_speed(&mut self, speed: f32) {
        self.playback_speed = speed.max(0.1).min(10.0);
        info!("Playback speed set to {}x", speed);
    }

    /// Get current playback time
    pub fn get_current_time(&self) -> f32 {
        self.current_time
    }

    /// Get total replay duration
    pub fn get_total_time(&self) -> f32 {
        if let Some(replay) = &self.replay {
            replay.metadata.duration.as_secs_f32()
        } else {
            0.0
        }
    }

    /// Get current progress (0.0 to 1.0)
    pub fn get_progress(&self) -> f32 {
        let total_time = self.get_total_time();
        if total_time > 0.0 {
            (self.current_time / total_time).min(1.0)
        } else {
            0.0
        }
    }

    /// Check if playback is active
    pub fn is_playing(&self) -> bool {
        self.is_playing
    }

    /// Check if replay is loaded
    pub fn has_replay(&self) -> bool {
        self.replay.is_some()
    }

    /// Get current game state
    pub fn get_game_state(&self) -> &GameState {
        &self.game_state
    }

    /// Get current event index
    pub fn get_current_event_index(&self) -> usize {
        self.current_event_index
    }

    /// Get total number of events
    pub fn get_total_events(&self) -> usize {
        if let Some(replay) = &self.replay {
            replay.events.len()
        } else {
            0
        }
    }

    /// Get current event
    pub fn get_current_event(&self) -> Option<&GameEvent> {
        if let Some(replay) = &self.replay {
            replay.events.get(self.current_event_index)
        } else {
            None
        }
    }

    /// Get replay metadata
    pub fn get_replay_metadata(&self) -> Option<&crate::decoder::ReplayMetadata> {
        if let Some(replay) = &self.replay {
            Some(&replay.metadata)
        } else {
            None
        }
    }

    /// Step forward by one event
    pub fn step_forward(&mut self) {
        if let Some(replay) = &self.replay {
            if self.current_event_index < replay.events.len() {
                let event = &replay.events[self.current_event_index];
                self.game_state.apply_event(event);
                self.current_event_index += 1;
                self.current_time = event.timestamp as f32 / 1000.0;
            }
        }
    }

    /// Step backward by one event
    pub fn step_backward(&mut self) {
        if self.current_event_index > 0 {
            self.current_event_index -= 1;
            
            // Reset game state and replay events up to current index
            self.game_state = GameState::new();
            
            if let Some(replay) = &self.replay {
                for i in 0..self.current_event_index {
                    let event = &replay.events[i];
                    self.game_state.apply_event(event);
                }
                
                if self.current_event_index > 0 {
                    let event = &replay.events[self.current_event_index - 1];
                    self.current_time = event.timestamp as f32 / 1000.0;
                } else {
                    self.current_time = 0.0;
                }
            }
        }
    }
}
