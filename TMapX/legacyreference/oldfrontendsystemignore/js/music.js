// Enhanced Music System with Persistence and Beat Visualization
import logger from '/js/utils/logger.js';

(function() {
  // Enhanced Music.js loading...

  // Prevent duplicate initialization
  if (window.musicSystemInitialized) {
    // Music system already initialized, skipping...
    return;}

  // Add debounce utility with a longer wait time
  function debounce(func, wait) {
    let timeout;
    return ;
  }

  // Global music manager
  class MusicManager {
    constructor() {
      this.orcMusic = null;
      this.humanMusic = null;
      this.currentAudio = null;
      this.audioContext = null;
      this.analyser = null;
      this.dataArray = null;
      this.animationId = null;
      this.isInitialized = false;
      this.beatThreshold = 128;
      this.lastBeatTime = 0;
      this.beatCooldown = 200; // Minimum time between beats in ms
      
      // Audio caching
      this.audioCache = new Map();
      this.dbName = 'WarcraftMusicCache';
      this.dbVersion = 1;
      this.db = null;
      
      // UI elements
      this.muteBtn = null;
      this.orcBtn = null;
      this.humanBtn = null;
      this.musicIcons = [];
      
      // State
      this.currentTrack = 'mute';
      this.volume = 0.5;
      this.isPlaying = false;
      this.persistentAudioCreated = false;
      
      // Bind methods
      this.handleMusicChange = this.handleMusicChange.bind(this);
      this.updateBeatVisualization = this.updateBeatVisualization.bind(this);
      this.onPageLoad = this.onPageLoad.bind(this);
      
      // Create persistent audio elements immediately
      this.createPersistentAudioElements();
      
      // Listen for page changes
      this.setupPageChangeListeners();

      // Debounce the save state function with a longer delay
      this.debouncedSaveState = debounce(() => {
        const state = {
          currentTrack: this.currentTrack,
          volume: this.volume,
          isPlaying: this.isPlaying,
          isMuted: this.muteBtn ? this.muteBtn.checked : true,
          orcSelected: this.orcBtn ? this.orcBtn.checked : false,
          humanSelected: this.humanBtn ? this.humanBtn.checked : false,
          currentTime: this.currentAudio ? this.currentAudio.currentTime : 0
        };
        
        const stateStr = JSON.stringify(state);
        const lastState = localStorage.getItem('musicState');
        
        // Only save if state has actually changed
        if (stateStr !== lastState) {
          localStorage.setItem('musicState', stateStr);
          // Music state saved
        }
      }, 5000); // Save at most once every 5 seconds
    }

    createPersistentAudioElements() {
      if (this.persistentAudioCreated) return;this.orcMusic = document.createElement('audio');
      this.orcMusic.id = 'persistent-orc-music';
      this.orcMusic.src = '/assets/AUDIO/ORC/orcmusic.mp3';
      this.orcMusic.loop = true;
      this.orcMusic.volume = this.volume;
      this.orcMusic.preload = 'metadata';
      
      this.humanMusic = document.createElement('audio');
      this.humanMusic.id = 'persistent-human-music';
      this.humanMusic.src = '/assets/AUDIO/HUMAN/humanmusic.mp3';
      this.humanMusic.loop = true;
      this.humanMusic.volume = this.volume;
      this.humanMusic.preload = 'metadata';
      
      // Append to body so they persist across page changes
      document.body.appendChild(this.orcMusic);
      document.body.appendChild(this.humanMusic);
      
              this.persistentAudioCreated = true;
        // Persistent audio elements created
    }

    setupPageChangeListeners() {
      // Listen for page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isPlaying) {
          // Page became visible, ensure music is still playing
          setTimeout(() => {
            this.checkAndRestoreMusic();
          }, 500);
        }
      });

      // Listen for beforeunload to save state
      window.addEventListener('beforeunload', () => {
        this.saveState();
      });

      // Listen for page load to restore state
      window.addEventListener('load', this.onPageLoad);
      
      // Also listen for DOMContentLoaded in case we missed the load event
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this.onPageLoad);
      } else {
        // DOM is already ready
        setTimeout(this.onPageLoad, 100);
      }

      // Listen for page focus/blur events
      window.addEventListener('focus', () => {
        // Window focused, checking music state...
        setTimeout(() => {
          this.checkAndRestoreMusic();
        }, 200);
      });

      // Enhanced navigation detection
      let lastUrl = location.href;
      this.navigationObserver = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          // Page navigation detected, maintaining music state...
          this.saveState();
          
          // Re-initialize after navigation
          setTimeout(() => {
            this.initialize().then(() => {
              this.checkAndRestoreMusic();
            });
          }, 500);
        }
      });
      this.navigationObserver.observe(document, { subtree: true, childList: true });

      // Intercept link clicks to save state before navigation
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (link && link.href && !link.href.startsWith('javascript:') && !link.target) {
          // Navigation detected, saving music state...
          this.saveState();
        }
      });

      // Remove the interval-based state saving
      // Instead, we'll rely on the debounced save on actual state changes
    }

    onPageLoad() {
      // Page loaded, initializing music manager...
      this.initialize().then(() => {
        // After initialization, immediately check if we should restore music
        setTimeout(() => {
          this.checkAndRestoreMusic();
        }, 500);
      });
    }

    async initialize() {
      if (this.isInitialized) {
        // Music manager already initialized
        return true;}

      // Initializing enhanced music system...

      // Wait for audio elements to be available
      await this.waitForAudioElements();
      
      if (!this.orcMusic || !this.humanMusic) {
        logger.error('Audio elements not found');
        return false;}

      // Wait for control elements
      await this.waitForControlElements();
      
      if (!this.muteBtn || !this.orcBtn || !this.humanBtn) {
        logger.error('Music control elements not found');
        return false;}

      // Setup audio context for beat detection
      await this.setupAudioContext();

      // Setup event listeners
      this.setupEventListeners();

      // Restore saved state
      this.restoreState();

      // Find all music icons for beat visualization
      this.findMusicIcons();

      // Start periodic music check
      this.startPeriodicMusicCheck();

      this.isInitialized = true;
      window.musicSystemInitialized = true;
      
      // Enhanced music system initialized successfully
      return true
    }

    async waitForAudioElements() {
      // First try to use persistent audio elements
      if (this.persistentAudioCreated && this.orcMusic && this.humanMusic) {
        logger.info('Using persistent audio elements');return true;}
      
      // Fall back to looking for page audio elements
      let attempts = 0;
      const maxAttempts = 10; // Reduced since we have persistent elements
      
      while (attempts < maxAttempts) {
        const pageOrcMusic = document.getElementById('orc-music');
        const pageHumanMusic = document.getElementById('human-music');
        
        if (pageOrcMusic && pageHumanMusic) {
          logger.info('Found page audio elements, using as fallback');
          
          // Only use page elements if persistent ones don't exist
          if (!this.persistentAudioCreated) {
            this.orcMusic = pageOrcMusic;
            this.humanMusic = pageHumanMusic;
            
            // Set initial properties
            this.orcMusic.volume = this.volume;
            this.humanMusic.volume = this.volume;
            this.orcMusic.loop = true;
            this.humanMusic.loop = true;
            this.orcMusic.preload = 'metadata';
            this.humanMusic.preload = 'metadata';
          }
          
          logger.info('Audio elements configured');
          return true;}
        
        logger.info(`Waiting for audio elements... (attempt ${attempts + 1})`);
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      // If no page elements found, ensure we have persistent ones
      if (!this.persistentAudioCreated) {
        this.createPersistentAudioElements();
        return true;}
      
      return this.persistentAudioCreated;}

    async waitForControlElements() {
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        this.muteBtn = document.getElementById('music-mute');
        this.orcBtn = document.getElementById('music-orc');
        this.humanBtn = document.getElementById('music-human');
        
        if (this.muteBtn && this.orcBtn && this.humanBtn) {
          logger.info('Music control elements found');
          return true;}
        
        logger.info(`Waiting for control elements... (attempt ${attempts + 1})`);
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      return false;}

    async setupAudioContext() {
      try {
        // Create audio context for beat detection
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        logger.info('Audio context setup complete');
      } catch (error) {
        logger.error('Error setting up audio context:', error);
      }
    }

    connectAudioToAnalyser(audio) {
      if (!this.audioContext || !this.analyser || !audio) return;try {
        // Create media element source
        const source = this.audioContext.createMediaElementSource(audio);
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        logger.info('Audio connected to analyser');
      } catch (error) {
        logger.error('Error connecting audio to analyser:', error);
      }
    }

    findMusicIcons() {
      // Find all music-related icons for beat visualization
      this.musicIcons = [
        ...document.querySelectorAll('.music-toggle label i'),
        ...document.querySelectorAll('[class*="music"] i'),
        ...document.querySelectorAll('[class*="drum"] i'),
        ...document.querySelectorAll('.fa-music'),
        ...document.querySelectorAll('.fa-drum'),
        ...document.querySelectorAll('.fa-volume-mute')
      ];
      
      logger.info(`Found ${this.musicIcons.length} music icons for beat visualization`);
    }

    setupEventListeners() {
      // Remove existing listeners
      this.muteBtn.removeEventListener('change', this.handleMusicChange);
      this.orcBtn.removeEventListener('change', this.handleMusicChange);
      this.humanBtn.removeEventListener('change', this.handleMusicChange);

      // Add event listeners
      this.muteBtn.addEventListener('change', this.handleMusicChange);
      this.orcBtn.addEventListener('change', this.handleMusicChange);
      this.humanBtn.addEventListener('change', this.handleMusicChange);

      // Add click listeners to labels for better compatibility
      const muteLabel = document.querySelector('label[for="music-mute"]');
      const orcLabel = document.querySelector('label[for="music-orc"]');
      const humanLabel = document.querySelector('label[for="music-human"]');

      if (muteLabel) {
        muteLabel.addEventListener('click', () => {
          this.muteBtn.checked = true;
          setTimeout(this.handleMusicChange, 10);
        });
      }

      if (orcLabel) {
        orcLabel.addEventListener('click', () => {
          this.orcBtn.checked = true;
          setTimeout(this.handleMusicChange, 10);
        });
      }

      if (humanLabel) {
        humanLabel.addEventListener('click', () => {
          this.humanBtn.checked = true;
          setTimeout(this.handleMusicChange, 10);
        });
      }



      logger.info('Event listeners setup complete');
    }

    async handleMusicChange() {
      logger.info('Music state changed');
      
      if (this.muteBtn.checked) {
        await this.stopAllMusic();
        this.currentTrack = 'mute';
      } else if (this.orcBtn.checked) {
        await this.playTrack('orc');
      } else if (this.humanBtn.checked) {
        await this.playTrack('human');
      }

      this.updateButtonStyling();
      this.saveState();
    }

    async playTrack(trackType, startTime = 0) {
      logger.info(`Playing ${trackType} music${startTime > 0 ? ` from ${startTime.toFixed(2)}s` : ''}`);
      
      // Stop current music
      await this.stopAllMusic();
      
      const audio = trackType === 'orc' ? this.orcMusic : this.humanMusic;
      
      if (!audio) {
        logger.error(`${trackType} audio not available`);
        return;}

      try {
        // Set audio source if not already set
        const audioUrl = trackType === 'orc' 
          ? '/assets/AUDIO/ORC/orcmusic.mp3'
          : '/assets/AUDIO/HUMAN/humanmusic.mp3';
        
        if (!audio.src || audio.src !== window.location.origin + audioUrl) {
          logger.info(`Setting ${trackType} audio source...`);
          audio.src = audioUrl;
          audio.load();
        }

        // Resume audio context if suspended (requires user interaction)
        if (this.audioContext && this.audioContext.state === 'suspended') {
          logger.info('Audio context suspended, attempting to resume...');
          try {
            await this.audioContext.resume();
            logger.info('Audio context resumed');
          } catch (error) {
            logger.warn('Could not resume audio context (may need user interaction):', error);
          }
        }

        // Connect to analyser for beat detection
        this.connectAudioToAnalyser(audio);
        
        // Wait for audio to be ready if needed
        if (audio.readyState < 2) {
          logger.info('Waiting for audio to be ready...');
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 10000);
            const onReady = () => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', onReady);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', onReady);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load error'));
            };
            audio.addEventListener('canplay', onReady);
            audio.addEventListener('error', onError);
          });
        }
        
        // Set the playback position before playing
        if (startTime > 0 && audio.duration && startTime < audio.duration) {
          audio.currentTime = startTime;
          logger.info(`Set playback position to ${startTime.toFixed(2)}s`);
        }
        
        // Play the audio
        await audio.play();
        
        this.currentAudio = audio;
        this.currentTrack = trackType;
        this.isPlaying = true;
        
        // Start beat visualization
        this.startBeatVisualization();
        
        logger.info(`${trackType} music started playing${startTime > 0 ? ` from ${startTime.toFixed(2)}s` : ''}`);
      } catch (error) {
        logger.error(`Error playing ${trackType} music:`, error);
        
        // If it's an interaction error, set up a click listener to resume
        if (error.name === 'NotAllowedError') {
          logger.info('Setting up click listener for user interaction...');
          this.setupUserInteractionHandler(trackType, startTime);
        } else {
          this.currentTrack = 'mute';
          this.isPlaying = false;
          if (this.muteBtn) this.muteBtn.checked = true;
        }
      }
    }

    setupUserInteractionHandler(trackType, startTime = 0) {
      const handleUserInteraction = async () => {
        logger.info('User interaction detected, attempting to play music...');
        try {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
          await this.playTrack(trackType, startTime);
          // Remove the listener after successful play
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
        } catch (error) {
          logger.error('Still unable to play music after user interaction:', error);
        }
      };

      document.addEventListener('click', handleUserInteraction, { once: true });
      document.addEventListener('keydown', handleUserInteraction, { once: true });
      
      logger.info('Waiting for user interaction to resume music...');
    }

    async stopAllMusic() {
      logger.info('Stopping all music');
      
      if (this.orcMusic) {
        this.orcMusic.pause();
        this.orcMusic.currentTime = 0;
      }
      if (this.humanMusic) {
        this.humanMusic.pause();
        this.humanMusic.currentTime = 0;
      }
      
      this.currentAudio = null;
      this.isPlaying = false;
      this.stopBeatVisualization();
    }

    async resumeCurrentTrack() {
      if (this.currentTrack === 'mute' || !this.isPlaying) return;logger.info(`Resuming ${this.currentTrack} music`);
      await this.playTrack(this.currentTrack);
    }

    async checkAndRestoreMusic() {
      logger.info('Checking music state for restoration...');
      
      // Ensure we have audio elements
      if (!this.orcMusic || !this.humanMusic) {
        logger.info('No audio elements, creating persistent ones...');
        this.createPersistentAudioElements();
      }

      // Check if we should be playing music
      const savedState = JSON.parse(localStorage.getItem('musicState') || '{}');
      if (savedState.isPlaying && savedState.currentTrack !== 'mute') {
        logger.info(`Should be playing ${savedState.currentTrack}, checking current state...`);
        
        // Check if music is actually playing
        const audio = savedState.currentTrack === 'orc' ? this.orcMusic : this.humanMusic;
        if (audio && (audio.paused || audio.currentTime === 0)) {
          logger.info('Music not playing, attempting to resume...');
          this.currentTrack = savedState.currentTrack;
          this.isPlaying = true;
          
          // Ensure we're initialized first
          if (!this.isInitialized) {
            await this.initialize();
          }
          
          // Set the correct button state if buttons exist
          if (savedState.currentTrack === 'orc' && this.orcBtn) {
            this.orcBtn.checked = true;
          } else if (savedState.currentTrack === 'human' && this.humanBtn) {
            this.humanBtn.checked = true;
          }
          
          // Calculate resume time
          let resumeTime = savedState.currentTime || 0;
          if (savedState.savedAt) {
            const timeElapsed = (Date.now() - savedState.savedAt) / 1000;
            resumeTime += timeElapsed;
          }
          
          await this.playTrack(savedState.currentTrack, resumeTime);
        } else if (audio && !audio.paused) {
          logger.info('Music is already playing correctly');
          this.currentTrack = savedState.currentTrack;
          this.isPlaying = true;
          this.currentAudio = audio;
          
          // Update button states
          if (this.isInitialized) {
            this.updateButtonStyling();
          }
        }
      }
    }

    startBeatVisualization() {
      if (!this.analyser || !this.dataArray) return;this.stopBeatVisualization(); // Stop any existing animation
      
      const animate = () => {
        this.animationId = requestAnimationFrame(animate);
        this.updateBeatVisualization();
      };
      
      animate();
      logger.info('Beat visualization started');
    }

    stopBeatVisualization() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      // Reset all icon scales
      this.musicIcons.forEach(icon => {
        if (icon) {
          icon.style.transform = 'scale(1)';
          icon.style.transition = 'transform 0.1s ease-out';
        }
      });
    }

    updateBeatVisualization() {
      if (!this.analyser || !this.dataArray || !this.isPlaying) return;this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate average amplitude in bass frequencies (0-64 Hz range)
      const bassRange = Math.floor(this.dataArray.length * 0.1); // First 10% for bass
      let bassSum = 0;
      for (let i = 0; i < bassRange; i++) {
        bassSum += this.dataArray[i];
      }
      const bassAverage = bassSum / bassRange;
      
      // Detect beat
      const currentTime = Date.now();
      const timeSinceLastBeat = currentTime - this.lastBeatTime;
      
      if (bassAverage > this.beatThreshold && timeSinceLastBeat > this.beatCooldown) {
        this.triggerBeatEffect();
        this.lastBeatTime = currentTime;
      }
    }

    triggerBeatEffect() {
      // Apply beat effect to all music icons
      this.musicIcons.forEach((icon, index) => {
        if (icon) {
          // Stagger the effect slightly for a wave effect
          setTimeout(() => {
            icon.style.transition = 'transform 0.1s ease-out';
            icon.style.transform = 'scale(1.3)';
            
            // Reset after a short time
            setTimeout(() => {
              icon.style.transform = 'scale(1)';
            }, 150);
          }, index * 20);
        }
      });
      
      // Also pulse the active music button
      const activeLabel = this.currentTrack === 'orc' 
        ? document.querySelector('label[for="music-orc"]')
        : this.currentTrack === 'human'
        ? document.querySelector('label[for="music-human"]')
        : null;
        
      if (activeLabel) {
        activeLabel.style.transition = 'all 0.1s ease-out';
        activeLabel.style.transform = 'scale(1.1)';
        activeLabel.style.boxShadow = '0 0 20px rgba(40, 167, 69, 0.8)';
        
        setTimeout(() => {
          activeLabel.style.transform = 'scale(1)';
          activeLabel.style.boxShadow = '0 0 15px rgba(40, 167, 69, 0.6)';
        }, 150);
      }
    }

    updateButtonStyling() {
      const muteLabel = document.querySelector('label[for="music-mute"]');
      const orcLabel = document.querySelector('label[for="music-orc"]');
      const humanLabel = document.querySelector('label[for="music-human"]');
      
      // Reset all styles
      [muteLabel, orcLabel, humanLabel].forEach(label => {
        if (label) {
          label.style.setProperty('background-color', 'rgba(255, 255, 255, 0.1)', 'important');
          label.style.setProperty('border-color', 'rgba(255, 255, 255, 0.2)', 'important');
          label.style.setProperty('color', '#d8dee9', 'important');
          label.style.setProperty('box-shadow', 'none', 'important');
          label.style.setProperty('transform', 'scale(1)', 'important');
          label.style.setProperty('opacity', '0.7', 'important');
        }
      });
      
      // Apply active styling
      if (this.muteBtn && this.muteBtn.checked && muteLabel) {
        muteLabel.style.setProperty('background-color', '#dc3545', 'important');
        muteLabel.style.setProperty('border-color', '#dc3545', 'important');
        muteLabel.style.setProperty('color', 'white', 'important');
        muteLabel.style.setProperty('box-shadow', '0 0 15px rgba(220, 53, 69, 0.6)', 'important');
        muteLabel.style.setProperty('opacity', '1', 'important');
      } else if (this.orcBtn && this.orcBtn.checked && orcLabel) {
        orcLabel.style.setProperty('background-color', '#28a745', 'important');
        orcLabel.style.setProperty('border-color', '#28a745', 'important');
        orcLabel.style.setProperty('color', 'white', 'important');
        orcLabel.style.setProperty('box-shadow', '0 0 15px rgba(40, 167, 69, 0.6)', 'important');
        orcLabel.style.setProperty('opacity', '1', 'important');
      } else if (this.humanBtn && this.humanBtn.checked && humanLabel) {
        humanLabel.style.setProperty('background-color', '#28a745', 'important');
        humanLabel.style.setProperty('border-color', '#28a745', 'important');
        humanLabel.style.setProperty('color', 'white', 'important');
        humanLabel.style.setProperty('box-shadow', '0 0 15px rgba(40, 167, 69, 0.6)', 'important');
        humanLabel.style.setProperty('opacity', '1', 'important');
      }
    }

    saveState() {
      this.debouncedSaveState();
    }
    
    // Cleanup method to prevent memory leaks
    cleanup() {
      logger.info('Cleaning up music system...');
      
      // Clear intervals
      if (this.periodicCheckInterval) {
        clearInterval(this.periodicCheckInterval);
        this.periodicCheckInterval = null;
      }
      
      // Disconnect observers
      if (this.navigationObserver) {
        this.navigationObserver.disconnect();
        this.navigationObserver = null;
      }
      
      // Clear animation frame
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      // Save state before cleanup
      this.saveState();
      
      logger.info('Music system cleanup complete');
    }

    restoreState() {
      try {
        const savedState = JSON.parse(localStorage.getItem('musicState'));
        if (!savedState) {
          logger.info('No saved music state found');
          return;}
        
        logger.info('Restoring music state:', savedState);
        
        this.currentTrack = savedState.currentTrack || 'mute';
        this.volume = savedState.volume || 0.5;
        this.isPlaying = savedState.isPlaying || false;
        
        // Set button states
        if (this.muteBtn) this.muteBtn.checked = savedState.isMuted;
        if (this.orcBtn) this.orcBtn.checked = savedState.orcSelected;
        if (this.humanBtn) this.humanBtn.checked = savedState.humanSelected;
        
        // Set audio volumes
        if (this.orcMusic) this.orcMusic.volume = this.volume;
        if (this.humanMusic) this.humanMusic.volume = this.volume;
        
        // Resume playing if was playing - with multiple attempts
        if (this.isPlaying && this.currentTrack !== 'mute') {
          logger.info(`Attempting to resume ${this.currentTrack} music...`);
          
          // Calculate the current time accounting for time elapsed during page load
          let resumeTime = savedState.currentTime || 0;
          if (savedState.savedAt) {
            const timeElapsed = (Date.now() - savedState.savedAt) / 1000; // Convert to seconds
            resumeTime += timeElapsed;
            logger.info(`Time elapsed during page load: ${timeElapsed.toFixed(2)}s, resuming from: ${resumeTime.toFixed(2)}s`);
          }
          
          // Try immediately
          setTimeout(() => {
            this.playTrack(this.currentTrack, resumeTime);
          }, 100);
          
          // Try again after a short delay
          setTimeout(() => {
            if (this.isPlaying && this.currentTrack !== 'mute') {
              const audio = this.currentTrack === 'orc' ? this.orcMusic : this.humanMusic;
              if (audio && audio.paused) {
                logger.info('First attempt failed, retrying...');
                this.playTrack(this.currentTrack, resumeTime);
              }
            }
          }, 1000);
          
          // Final attempt after page is fully loaded
          setTimeout(() => {
            if (this.isPlaying && this.currentTrack !== 'mute') {
              const audio = this.currentTrack === 'orc' ? this.orcMusic : this.humanMusic;
              if (audio && audio.paused) {
                logger.info('Second attempt failed, final retry...');
                this.playTrack(this.currentTrack, resumeTime);
              }
            }
          }, 2000);
        }
        
        this.updateButtonStyling();
        
      } catch (error) {
        logger.error('Error restoring music state:', error);
      }
    }

    // Public methods for backward compatibility
    stopMusic() {
      this.stopAllMusic();
    }

    playOrcMusic() {
      if (this.orcBtn) {
        this.orcBtn.checked = true;
        this.handleMusicChange();
      }
    }

    playHumanMusic() {
      if (this.humanBtn) {
        this.humanBtn.checked = true;
        this.handleMusicChange();
      }
    }

    muteMusic() {
      if (this.muteBtn) {
        this.muteBtn.checked = true;
        this.handleMusicChange();
      }
    }

    // Start periodic music check
    startPeriodicMusicCheck() {
      
      
      // Clear existing interval
      if (this.periodicCheckInterval) {
        clearInterval(this.periodicCheckInterval);
      }
      
      // Check music state every 3 seconds
      this.periodicCheckInterval = setInterval(() => {
        if (this.isPlaying && this.currentTrack !== 'mute') {
          const audio = this.currentTrack === 'orc' ? this.orcMusic : this.humanMusic;
          if (audio && audio.paused) {
            logger.info('Periodic check: Music stopped unexpectedly, attempting to resume...');
            // Get the last saved state to resume from correct position
            const savedState = JSON.parse(localStorage.getItem('musicState') || '{}');
            let resumeTime = savedState.currentTime || 0;
            if (savedState.savedAt) {
              const timeElapsed = (Date.now() - savedState.savedAt) / 1000;
              resumeTime += timeElapsed;
            }
            this.playTrack(this.currentTrack, resumeTime);
          } else if (audio && !audio.paused) {
            // Music is playing, update the saved position
            this.saveState();
          }
        }
      }, 3000);
      
      logger.info('Periodic music check started');
    }
  }

  // Create global music manager instance
  window.musicManager = new MusicManager();

  // Expose legacy functions for backward compatibility
  window.stopAllMusic = () => window.musicManager.stopMusic();
  window.playOrcMusic = () => window.musicManager.playOrcMusic();
  window.playHumanMusic = () => window.musicManager.playHumanMusic();
  window.muteMusic = () => window.musicManager.muteMusic();
  window.initializeMusic = () => window.musicManager.initialize();

  logger.info('Enhanced Music.js loaded with persistent audio and beat visualization');
})();

