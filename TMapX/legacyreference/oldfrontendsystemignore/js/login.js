// ===== WEB LOGIN SYSTEM =====
import logger from '/js/utils/logger.js';

class WebAuth {
  constructor() {
    this.isLoading = false;
    this.serverUrl = 'http://127.0.0.1:3000';  // Use port 3000 for OAuth compatibility
    
    // WebAuth initialized
    this.init();
  }

  async init() {
    try {
      this.setupWebButtons();
      this.setupEventListeners();
      this.setupAnimations();
      this.checkForRedirectAfterLogin();
      // WebAuth initialization complete
    } catch (error) {
      logger.error('WebAuth initialization failed', error);
      this.showError('Failed to initialize authentication system');
    }
  }

  /**
   * Check if user was redirected here and should be sent back after login
   */
  checkForRedirectAfterLogin() {
    // Check if there's a stored redirect destination
    const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
    if (redirectAfterLogin) {
      logger.info(`🔄 User will be redirected to: ${redirectAfterLogin} after login`);
      
      // Store it in a data attribute for the OAuth buttons to use
      document.body.setAttribute('data-redirect-after-login', redirectAfterLogin);
    }
  }

  async setupWebButtons() {
    const buttons = document.querySelectorAll('.login-btn');
    
    for (const button of buttons) {
      const provider = button.dataset.provider;
      
      // Get stored redirect destination
      const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
      
      // Convert div to anchor for web
      const anchor = document.createElement('a');
      anchor.href = '#';
      anchor.className = button.className;
      anchor.dataset.provider = provider;
      anchor.innerHTML = button.innerHTML;
      
      // Add click handler for OAuth flow
      anchor.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
          // Show loading state
          anchor.classList.add('loading');
          anchor.disabled = true;
          
          // Get OAuth URL from Rust backend
          const authUrl = await this.getOAuthUrl(provider);
          
          // Add redirect parameter if available
          let finalAuthUrl = authUrl;
          if (redirectAfterLogin) {
            const separator = authUrl.includes('?') ? '&' : '?';
            finalAuthUrl = `${authUrl}${separator}redirect=${encodeURIComponent(redirectAfterLogin)}`;
          }
          
          // Redirect to OAuth provider
          window.location.href = finalAuthUrl;
          
        } catch (error) {
          logger.error(`Failed to get OAuth URL for ${provider}:`, error);
          this.showError(`Failed to start ${provider} authentication`);
          
          // Remove loading state
          anchor.classList.remove('loading');
          anchor.disabled = false;
        }
      });
      
      button.parentNode.replaceChild(anchor, button);
    }
  }

  /**
   * Get OAuth URL from Rust backend
   */
  async getOAuthUrl(provider) {
    try {
      const response = await fetch(`/api/auth/${provider}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get OAuth URL for ${provider}`);
      }
      
      const data = await response.json();
      return data.auth_url;
      
    } catch (error) {
      logger.error(`Failed to get OAuth URL for ${provider}:`, error);
      throw error;
    }
  }

  setupEventListeners() {
    // Check for OAuth callback parameters
    this.handleOAuthCallback();
  }

  /**
   * Handle OAuth callback if present in URL
   */
  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
      this.showError(`OAuth error: ${error}`);
      return;
    }
    
    if (code) {
      // Determine provider from URL path or state
      const path = window.location.pathname;
      let provider = 'google'; // default
      
      if (path.includes('/auth/google')) {
        provider = 'google';
      } else if (path.includes('/auth/discord')) {
        provider = 'discord';
      } else if (path.includes('/auth/twitch')) {
        provider = 'twitch';
      }
      
      this.completeOAuthFlow(provider, code, state);
    }
  }

  /**
   * Complete OAuth flow by calling backend callback
   */
  async completeOAuthFlow(provider, code, state) {
    try {
      // Show loading state
      this.showLoading('Completing authentication...');
      
      const response = await fetch(`/api/auth/${provider}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          state
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `OAuth callback failed for ${provider}`);
      }
      
      const data = await response.json();
      
      // Store JWT token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        logger.info('✅ OAuth authentication successful');
      }
      
      // Handle redirect
      this.handlePostLoginRedirect();
      
    } catch (error) {
      logger.error(`OAuth callback failed for ${provider}:`, error);
      this.showError(`Authentication failed: ${error.message}`);
      this.hideLoading();
    }
  }

  /**
   * Handle redirect after successful login
   */
  handlePostLoginRedirect() {
    const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
    
    if (redirectAfterLogin) {
      // Clear stored redirect
      sessionStorage.removeItem('redirectAfterLogin');
      
      // Redirect to original destination
      window.location.href = redirectAfterLogin;
    } else {
      // Default redirect to main page
      window.location.href = '/views/index.html';
    }
  }

  showLoading(message) {
    // Create or update loading overlay
    let loadingOverlay = document.getElementById('loadingOverlay');
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'loadingOverlay';
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="loading-content">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      `;
      document.body.appendChild(loadingOverlay);
    } else {
      loadingOverlay.querySelector('p').textContent = message;
    }
    
    loadingOverlay.style.display = 'flex';
  }

  hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        this.hideError();
      }, 10000);
    } else {
      // Fallback: show alert
      alert(`Error: ${message}`);
    }
  }

  hideError() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.classList.remove('show');
    }
  }

  setupAnimations() {
    // Epic entrance animations
    const buttons = document.querySelectorAll('.login-btn');
    buttons.forEach((button, index) => {
      button.style.animationDelay = `${0.6 + index * 0.2}s`;
      button.style.animation = 'cardEntrance 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both';
    });

    // Add click sound effect
    buttons.forEach(button => {
      button.addEventListener('click', function() {
        this.style.transform = 'translateY(-1px) scale(0.98)';
        setTimeout(() => {
          this.style.transform = '';
        }, 150);
      });
    });

    // Easter egg: Konami code
    this.setupKonamiCode();
    
    // Mouse parallax effect
    this.setupParallax();
  }

  setupKonamiCode() {
    let konamiCode = [];
    const targetCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    
    document.addEventListener('keydown', (e) => {
      konamiCode.push(e.code);
      if (konamiCode.length > targetCode.length) {
        konamiCode.shift();
      }
      
      if (konamiCode.join(',') === targetCode.join(',')) {
        this.activateEasterEgg();
        konamiCode = [];
      }
    });
  }

  activateEasterEgg() {
    // Add rainbow effect to login buttons
    const buttons = document.querySelectorAll('.login-btn');
    buttons.forEach(button => {
      button.style.animation = 'rainbow 2s linear infinite';
    });
    
    // Play victory sound
    this.playSound('victory');
    
    // Show easter egg message
    setTimeout(() => {
      this.showEasterEggMessage();
    }, 1000);
  }

  showEasterEggMessage() {
    const message = document.createElement('div');
    message.className = 'easter-egg-message';
    message.innerHTML = `
      <h3>🎉 Konami Code Activated! 🎉</h3>
      <p>You've unlocked the secret rainbow mode!</p>
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  setupParallax() {
    document.addEventListener('mousemove', (e) => {
      const buttons = document.querySelectorAll('.login-btn');
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;
      
      buttons.forEach((button, index) => {
        const offsetX = (mouseX - 0.5) * (index + 1) * 5;
        const offsetY = (mouseY - 0.5) * (index + 1) * 5;
        
        button.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      });
    });
  }

  playSound(type) {
    // Simple sound effect implementation
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'victory') {
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    }
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }

  // Utility methods for traditional login (if needed)
  async traditionalLogin(username, password) {
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store JWT token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      return data;
      
    } catch (error) {
      logger.error('Traditional login failed:', error);
      throw error;
    }
  }

  async traditionalRegister(userData) {
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      const data = await response.json();
      
      // Store JWT token if provided
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      return data;
      
    } catch (error) {
      logger.error('Traditional registration failed:', error);
      throw error;
    }
  }
}

// Initialize WebAuth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebAuth();
});

// Export for use in other modules
window.WebAuth = WebAuth;
