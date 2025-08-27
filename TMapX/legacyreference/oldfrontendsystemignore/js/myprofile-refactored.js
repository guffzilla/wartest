/**
 * MyProfile Refactored - Main Profile Page Script
 * 
 * This script handles the profile page functionality using a modular approach.
 * It initializes the ProfileManager and sets up all necessary event handlers.
 */

// Import centralized logger utility
import logger from '/js/utils/logger.js';

// Import ModalManager for modal functionality
let ModalManager = null;

// Import UnifiedProfileManager with error handling
let profileManager;
try {
  const profileManagerModule = await import('./modules/UnifiedProfileManager.js');
  profileManager = profileManagerModule.unifiedProfileManager;
} catch (error) {
  logger.error('Failed to import UnifiedProfileManager', error);
  throw error;
}

// ProfileCore functionality has been integrated into UnifiedProfileManager

// Import UnifiedProfileUI with error handling
let profileUI;
try {
  const profileUIModule = await import('./modules/UnifiedProfileUI.js');
  profileUI = profileUIModule.unifiedProfileUI;
} catch (error) {
  logger.error('Failed to import UnifiedProfileUI', error);
  // Don't throw here, as we can fall back to manual UI updates
}

// Import VoiceChatManager with error handling
let VoiceChatManager;
try {
  const voiceChatModule = await import('./modules/VoiceChatManager.js');
  VoiceChatManager = voiceChatModule.VoiceChatManager;
} catch (error) {
  logger.error('Failed to import VoiceChatManager', error);
  // Don't throw here, as VoiceChatManager is optional
}

// Import ModalManager if available
try {
  const modalManagerModule = await import('./modules/ModalManager.js');
  ModalManager = modalManagerModule.default;
} catch (error) {
  logger.warn('ModalManager import failed, using fallback modal system', error.message);
  ModalManager = null;
}

// Expose profileManager globally for debugging
window.profileManager = profileManager;

/**
 * Initialize the profile system
 * This is the main entry point for the profile page functionality
 */
async function initializeProfileSystem() {
  // Initializing profile system
  
  try {
    // Ensure we are using the real UnifiedProfileManager singleton (imported at top)
    if (!window.profileManager) {
      const module = await import('./modules/UnifiedProfileManager.js');
      window.profileManager = module.unifiedProfileManager;
    }
    // Initialize "my" profile to trigger optimized parallel loading and fast overlay hide
    console.log('🔍 About to initialize profile manager...');
    await window.profileManager.init('my');
    console.log('✅ Profile manager initialized successfully');
    
    // Initialize ProfileDataLoader to load user data
    try {
      const { profileDataLoader } = await import('./modules/ProfileDataLoader.js');
      console.log('🔍 Loading user profile data...');
      const userData = await profileDataLoader.loadUserProfile();
      
      if (userData) {
        console.log('✅ User profile data loaded successfully');
        updateBasicProfileInfo(userData);
        
        // Dispatch profileDataUpdated event for other components
        window.dispatchEvent(new CustomEvent('profileDataUpdated', {
          detail: { user: userData, players: [] }
        }));
      } else {
        console.log('⚠️ No user data loaded from ProfileDataLoader');
      }
    } catch (error) {
      console.error('❌ Failed to load user profile data:', error);
    }
    
    // Setup manual UI updates immediately after UnifiedProfileManager is ready
    setupManualUIUpdates();
    
    // Manually trigger UI update in case the event was already dispatched
    if (window.profileManager && window.profileManager.currentUser) {
      console.log('🔍 Profile manager has current user, updating UI manually');
      updateBasicProfileInfo(window.profileManager.currentUser);
      
      // Set window.currentUser as fallback for legacy code
      window.currentUser = window.profileManager.currentUser;
    }
    
    // Initialize ProfileFormHandlers for About Me editing
    const { ProfileFormHandlers } = await import('./modules/ProfileFormHandlers.js');
    window.profileFormHandlers = new ProfileFormHandlers();
    window.profileFormHandlers.setupBioEditForm();
    
    // Initialize BarracksManager
    const { BarracksManager } = await import('./modules/BarracksManager.js');
    window.barracksManager = new BarracksManager();
    await window.barracksManager.init();
    
    // Layout management is now handled by UnifiedProfileManager
    
    // Initialize clan manager if available
    if (window.clanManager && typeof window.clanManager.initialize === 'function') {
      try {
        await window.clanManager.initialize();
      } catch (error) {
        logger.error('Failed to initialize clan manager', error);
      }
    }
    
    // Update players data - use UnifiedProfileManager instead of profileManager
    let players = [];
    if (window.profileManager && typeof window.profileManager.getUserPlayers === 'function') {
      players = await window.profileManager.getUserPlayers();
    } else if (window.profileManager && window.profileManager.currentPlayers) {
      // Use currentPlayers from UnifiedProfileManager
      players = Array.from(window.profileManager.currentPlayers.values());
    }
    
    // Load and display campaign data for the wartable section
    await loadCampaignDataForWartable();
    
    window.barracksManager.updatePlayers(players);
    window.barracksManager.updatePlayerDisplay();
    
    // Initialize main barracks game tabs
    if (window.barracksManager && window.barracksManager.setupGameTabs) {
      window.barracksManager.setupGameTabs();
    }
    
    // Setup legacy compatibility
    setupLegacyCompatibility();
    
    // Setup profile interaction handlers
    setupProfileInteractionHandlers();
    
    // Initialize Achievement Manager
    try {
      if (window.AchievementManager) {
        window.achievementManager = new window.AchievementManager();
        await window.achievementManager.init();
      } else {
        logger.warn('AchievementManager class not found - achievements may not work');
      }
    } catch (error) {
      logger.error('Failed to initialize Achievement Manager', error);
    }
    
    // Initialize Town Hall Modal Manager
    try {
      if (!window.townHallModalManager) {
        logger.warn('TownHallModalManager not found - town hall modals may not work');
      }
    } catch (error) {
      logger.error('Failed to initialize Town Hall Modal Manager', error);
    }
    
    // Check if we need to open barracks modal for a specific game type
    setTimeout(() => {
      checkAndOpenBarracksModal();
    }, 1000); // Small delay to ensure everything is loaded
    
  } catch (error) {
    logger.error('Error initializing profile system', error);
    // Show error message to user
    showNotification('Failed to load profile data. Please refresh the page.', 'error');
  }
}

// Function to check if we need to open barracks modal for a specific game type
function checkAndOpenBarracksModal() {
  try {
    const storedGameType = localStorage.getItem('openBarracksForGameType');
    if (storedGameType) {
      
      // Clear the stored value
      localStorage.removeItem('openBarracksForGameType');
      
      // Find the barracks section and open it
      const barracksSection = document.querySelector('[data-section="player-names"]');
      if (barracksSection) {
        // Open the barracks modal
        openSectionModal(barracksSection);
        
        // Set the filter to the specific game type after a short delay
        setTimeout(() => {
          if (window.barracksManager) {
            window.barracksManager.filterByGameType(storedGameType);
          }
        }, 500);
      } else {
        logger.warn('Barracks section not found');
      }
    }
  } catch (error) {
    logger.error('Error checking barracks modal', error);
  }
}

/**
 * Setup manual UI updates as fallback when UnifiedProfileUI is not available
 */
function setupManualUIUpdates() {
  // Listen for profile data updates
  window.addEventListener('profileDataUpdated', (event) => {
    console.log('🔍 Profile data updated event received:', event.detail);
    const { user, players } = event.detail;
    if (user) {
      console.log('✅ User data found, updating UI');
      updateBasicProfileInfo(user);
    } else {
      console.log('❌ No user data in profileDataUpdated event');
    }
  });
}

/**
 * Update basic profile info manually when UnifiedProfileUI fails
 */
function updateBasicProfileInfo(userData) {
  
  
  // Set window.currentUser as fallback for legacy code
  window.currentUser = userData;
  // Update username
  const usernameElement = document.getElementById('profile-username');
  console.log('🔍 Username update debug:', {
    elementFound: !!usernameElement,
    userData: userData ? { username: userData.username, email: userData.email } : null
  });
  if (usernameElement && userData.username) {
    usernameElement.textContent = userData.username;
    console.log('✅ Username updated to:', userData.username);
  } else if (usernameElement) {
    console.log('⚠️ Username element found but no username data');
  } else {
    console.log('❌ Username element not found in DOM');
  }
  
  // Update email
  const emailElement = document.getElementById('email-text');
  
  if (emailElement && userData.email) {
    emailElement.textContent = userData.email;
    
  }
  
  // Update avatar
  const avatarElement = document.getElementById('profile-avatar');
  if (avatarElement && userData.avatar) {
    avatarElement.innerHTML = `
      <img src="${userData.avatar}" alt="User Avatar" 
           style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
           onerror="this.src='/assets/img/ranks/emblem.png'">
      <div class="profile-status online" aria-label="Online status"></div>
    `;
    
  }
  
  // Update honor points
  const honorElement = document.getElementById('honor-points-small');
  
  if (honorElement) {
    const honor = userData.honor || 0;
    honorElement.textContent = honor.toLocaleString();
    
  } else {
    logger.error('Honor element not found in DOM');
  }
  
  // Update arena gold
  const goldElement = document.getElementById('arena-points-small');
  
  if (goldElement) {
    const gold = userData.arenaGold || 0;
    goldElement.textContent = gold.toLocaleString();
    
  } else {
    logger.error('Arena gold element not found in DOM');
  }
  
  // Update bio if available
  const bioElement = document.getElementById('bio-text');
  if (bioElement && userData.bio) {
    bioElement.textContent = userData.bio;
    
  } else if (bioElement && !userData.bio) {
    bioElement.textContent = 'No bio yet. Click edit to add one!';
    
  }
  
  // Update bio stats fields
  const profile = userData.profile || {};
  const warcraftPrefs = profile.warcraftPreferences || {};
  
  // Date of Birth
  const dobElement = document.getElementById('profile-dob');
  if (dobElement) {
    if (userData.dateOfBirth || profile.dateOfBirth) {
      const dobDate = new Date(userData.dateOfBirth || profile.dateOfBirth);
      if (!isNaN(dobDate.getTime())) {
        dobElement.textContent = dobDate.toLocaleDateString();

      } else {
        dobElement.textContent = 'Not specified';
      }
    } else {
      dobElement.textContent = 'Not specified';
    }
  }
  
  // Country
  const countryElement = document.getElementById('profile-country');
  if (countryElement) {
    const country = profile.country || userData.country;
    countryElement.textContent = country || 'Not specified';
    
  }
  
  // Favorite Game
  const gameElement = document.getElementById('profile-game');
  if (gameElement) {
    const gameMap = {
      'wc1': 'WC: Orcs & Humans',
      'wc2': 'WC II: Tides of Darkness', 
      'wc3': 'WC III: Reign of Chaos'
    };
    const gameValue = warcraftPrefs.favoriteGame || userData.favoriteGame;
    gameElement.textContent = gameMap[gameValue] || gameValue || 'Not specified';
    
  }
  
  // Favorite Race
  const raceElement = document.getElementById('profile-race');
  if (raceElement) {
    const raceMap = {
      'human': 'Human',
      'orc': 'Orc', 
      'night_elf': 'Night Elf',
      'undead': 'Undead'
    };
    const raceValue = warcraftPrefs.favoriteRace || userData.favoriteRace;
    raceElement.textContent = raceMap[raceValue] || raceValue || 'Not specified';
    
  }
  
  // Favorite Tactics
  const tacticsElement = document.getElementById('profile-tactics');
  if (tacticsElement) {
    const tacticsMap = {
      'rush': 'Rush',
      'boom': 'Boom (Economic Focus)',
      'turtle': 'Turtle (Defensive)',
      'all-in': 'All-in Attack',
      'harassment': 'Harassment', 
      'map-control': 'Map Control',
      'tech-rush': 'Tech Rush',
      'mass-units': 'Mass Units',
      'mixed-army': 'Mixed Army',
      'tower-rush': 'Tower Rush',
      'fast-expansion': 'Fast Expansion',
      'stealth-ambush': 'Stealth/Ambush'
    };
    const tacticsValue = warcraftPrefs.favoriteStrategy || userData.favoriteStrategy || userData.favoriteTactics;
    tacticsElement.textContent = tacticsMap[tacticsValue] || tacticsValue || 'Not specified';
    
  }
  
  // Top Allies (set to N/A for now - would need match history data)
  const alliesElement = document.getElementById('profile-allies');
  if (alliesElement) {
    alliesElement.textContent = 'N/A';
    
  }
  
  // Top Opponents (set to N/A for now - would need match history data)
  const enemiesElement = document.getElementById('profile-enemies');
  if (enemiesElement) {
    enemiesElement.textContent = 'N/A';
    
  }
}

// Initialize the profile system when DOM is ready
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
  document.addEventListener('DOMContentLoaded', initializeProfileSystem);
} else {
  // DOM is already loaded, initialize immediately
  initializeProfileSystem();
}

// Listen for user data updates from main system
window.addEventListener('userDataLoaded', (event) => {
  
  if (event.detail && event.detail.user) {
    updateBasicProfileInfo(event.detail.user);
  }
});

// Listen for auth state changes
window.addEventListener('authStateChanged', (event) => {
  
  if (event.detail && event.detail.user) {
    updateBasicProfileInfo(event.detail.user);
  }
});

// Check if user data is already available
if (window.currentUser) {
  
  updateBasicProfileInfo(window.currentUser);
}

/**
 * Setup legacy compatibility functions for backward compatibility
 * This ensures any old HTML or remaining code can still function
 */
function setupLegacyCompatibility() {
  
  // Global functions that may be called from HTML onclick handlers
  // Note: window.addPlayer is now defined separately with proper modal functionality
  window.removePlayer = (playerId) => profileManager.removePlayer(playerId);
  window.switchTab = (tabName) => profileManager.switchTab(tabName);
  window.refreshProfile = () => profileManager.refreshProfileDisplay();
  
  // Expose clan manager directly for onclick handlers (with safety check)
  if (profileManager.modules && profileManager.modules.clanManager) {
    window.clanManager = profileManager.modules.clanManager;
  } else {
    
    // Do not overwrite an existing global clanManager instance
  }
  
  // Clan management functions with error handling
  window.showCreateClanModal = () => {
    if (!profileManager.modules || !profileManager.modules.clanManager) {
      
      return;}
    return profileManager.modules.clanManager.showCreateClanModal();};
  window.showFindClansModal = () => {
    if (!profileManager.modules || !profileManager.modules.clanManager) {
      
      return;}
    return profileManager.modules.clanManager.showBrowseClansModal();};
  window.viewClanDetails = (clanId) => {
    if (!profileManager.modules || !profileManager.modules.clanManager) {
      
      return;}
    return profileManager.modules.clanManager.loadClanDetails(clanId);};
  window.manageClan = (clanId) => {
    if (!profileManager.modules || !profileManager.modules.clanManager) {
      
      return;}
    return profileManager.modules.clanManager.showClanManagement(clanId);};
  window.leaveClan = (clanId) => {
    if (!profileManager.modules || !profileManager.modules.clanManager) {
      
      return;}
    return profileManager.modules.clanManager.showLeaveClanModal(clanId);};
  window.joinClan = (clanId) => {
    if (!profileManager.modules || !profileManager.modules.clanManager) {
      
      return;}
    return profileManager.modules.clanManager.showApplyToClanModal(clanId);};
  
  // Legacy data access (for any remaining old code)
  window.getCurrentUser = async () => {
    if (profileManager.modules && profileManager.modules.dataLoader) {
    const userData = await profileManager.modules.dataLoader.loadUserProfile();
    return userData;} else {
      // Fallback to direct API call
      const response = await fetch('/api/me');
      return response.ok ? await response.json() : null;}
  };
  
  window.getPlayerData = async () => {
    if (profileManager.modules && profileManager.modules.dataLoader) {
    const playerData = await profileManager.modules.dataLoader.loadPlayerStats();
    return playerData;} else {
      // Fallback to direct API call
      const response = await fetch('/api/me/players');
      return response.ok ? await response.json() : null;}
  };
  
  // Legacy UI update functions (for any remaining old code)
  window.updateUserProfile = (userData) => {
    if (profileManager.modules && profileManager.modules.uiManager) {
    return profileManager.modules.uiManager.updateUserProfile(userData);} else {
      // Fallback to basic update
      updateBasicProfileInfo(userData);
      
      // Update Watch Tower status indicators
      if (window.profileFormHandlers && typeof window.profileFormHandlers.updateWatchTowerStatusIndicators === 'function') {
        window.profileFormHandlers.updateWatchTowerStatusIndicators(userData);
      }
    }
  };
  
  window.updatePlayerStats = (playerStats) => {
    if (profileManager.modules && profileManager.modules.uiManager) {
    return profileManager.modules.uiManager.updatePlayerStats(playerStats);} else {
      
    }
  };
  
  // Development and debugging helpers
  window.getProfileSystemStatus = () => profileManager.getSystemStatus();
  window.emergencyResetProfile = () => profileManager.emergencyReset();
  
  // Test function for button functionality
  window.testProfileButtons = () => {
    
    
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const changeUsernameBtn = document.getElementById('change-username-btn');
    
    if (changeAvatarBtn) {
      
      changeAvatarBtn.addEventListener('click', () => {
        
        alert('Avatar button is working!');
      });
    } else {
      
    }
    
    if (changeUsernameBtn) {
      
      changeUsernameBtn.addEventListener('click', () => {
        
        alert('Username button is working!');
      });
    } else {
      
    }
    

  };
  
  // Setup delete account functionality after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDeleteAccountHandlers);
  } else {
    setupDeleteAccountHandlers();
  }
}

/**
 * Setup handlers for profile interactions (avatar change, username change, etc.)
 */
function setupProfileInteractionHandlers() {
  
  
  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupProfileInteractionHandlersInternal();
    });
  } else {
    setupProfileInteractionHandlersInternal();
  }
  
  // Add a retry mechanism in case the buttons aren't ready yet
  setTimeout(() => {
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const changeUsernameBtn = document.getElementById('change-username-btn');
    
    if (!changeAvatarBtn || !changeUsernameBtn) {
      
      setupProfileInteractionHandlersInternal();
    }
  }, 1000);
  
  // Final retry after 3 seconds
  setTimeout(() => {
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const changeUsernameBtn = document.getElementById('change-username-btn');
    
    if (!changeAvatarBtn || !changeUsernameBtn) {
      
      setupProfileInteractionHandlersInternal();
    }
  }, 3000);
}

/**
 * Internal function to setup profile interaction handlers
 */
function setupProfileInteractionHandlersInternal() {
  
  
  // Change avatar button
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  if (changeAvatarBtn) {
    
    // Remove any existing listeners to prevent duplicates
    changeAvatarBtn.removeEventListener('click', handleAvatarChange);
    changeAvatarBtn.addEventListener('click', handleAvatarChange);
  } else {
    
  }
  
  // Change username button
  const changeUsernameBtn = document.getElementById('change-username-btn');
  if (changeUsernameBtn) {
    
    // Remove any existing listeners to prevent duplicates
    changeUsernameBtn.removeEventListener('click', handleUsernameChange);
    changeUsernameBtn.addEventListener('click', handleUsernameChange);
  } else {
    
  }
  
  // Username change form
  const usernameChangeForm = document.getElementById('username-change-form');
  if (usernameChangeForm) {
    
    // Remove any existing listeners to prevent duplicates
    usernameChangeForm.removeEventListener('submit', handleUsernameSubmit);
    usernameChangeForm.addEventListener('submit', handleUsernameSubmit);
  } else {
    
  }
  
  // Cancel username change button
  const cancelUsernameBtn = document.getElementById('cancel-username-change');
  if (cancelUsernameBtn) {
    
    // Remove any existing listeners to prevent duplicates
    cancelUsernameBtn.removeEventListener('click', cancelUsernameChange);
    cancelUsernameBtn.addEventListener('click', cancelUsernameChange);
  } else {
    
  }
  

}

/**
 * Handle avatar change button click
 */
function handleAvatarChange() {
  
  
  // Use the existing avatar modal system instead of file upload
  if (window.avatarManager) {
    window.avatarManager.showAvatarModal();
  } else {
    // Fallback: try to initialize avatar manager
    import('./modules/AvatarManager.js').then(({ AvatarManager }) => {
      window.avatarManager = new AvatarManager();
      window.avatarManager.init().then(() => {
        window.avatarManager.showAvatarModal();
      });
    }).catch(error => {
      logger.error('Failed to load avatar manager', error);
      showNotification('Avatar system not available. Please try again later.', 'error');
    });
  }
}

/**
 * Handle username change button click
 */
async function handleUsernameChange() {
  
  
  try {
    // Check username change restrictions before showing form
    const response = await fetch('/api/me/username-change-status');
    if (!response.ok) {
      throw new Error('Failed to check username change status');
    }
    
    const status = await response.json();
    
    if (!status.canChange) {
      // Show restriction message in a more visible modal
      showUsernameRestrictionModal(status);
      return;}
    
    // If we can change username, show the form
    const container = document.getElementById('username-change-container');
    const form = document.getElementById('username-change-form');
    
    if (container && form) {
      container.style.display = 'block';
      form.querySelector('#new-username').focus();
      
    } else {
      
    }
    
  } catch (error) {
    logger.error('Failed to check username change status', error);
    showNotification('Failed to check username change restrictions. Please try again.', 'error');
  }
}

/**
 * Show username restriction modal with detailed information
 */
function showUsernameRestrictionModal(status) {
  const modal = document.createElement('div');
  modal.className = 'username-restriction-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(3px);
  `;
  
  // Format the next change date
  let nextChangeText = '';
  if (status.nextChangeDate) {
    const nextDate = new Date(status.nextChangeDate);
    const now = new Date();
    const daysRemaining = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining === 0) {
      nextChangeText = 'You can change your username again today!';
    } else if (daysRemaining === 1) {
      nextChangeText = 'You can change your username again tomorrow!';
    } else {
      nextChangeText = `You can change your username again in ${daysRemaining} days (${nextDate.toLocaleDateString()})`;
    }
  }
  
  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 2px solid rgba(255, 215, 0, 0.3);
      border-radius: 15px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    ">
      <div style="color: #ffd700; font-size: 3rem; margin-bottom: 1rem;">⏰</div>
      <h3 style="color: #ffd700; margin-bottom: 1rem; font-family: 'Cinzel', serif;">Username Change Restricted</h3>
      
      <div style="
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.3);
        border-radius: 10px;
        padding: 1rem;
        margin-bottom: 1.5rem;
        text-align: left;
      ">
        <p style="color: rgba(255, 255, 255, 0.9); margin: 0 0 0.5rem 0; font-weight: 600;">
          <i class="fas fa-info-circle" style="color: #dc3545; margin-right: 0.5rem;"></i>
          ${status.message}
        </p>
        ${status.daysSinceLastChange !== null ? `
          <p style="color: rgba(255, 255, 255, 0.7); margin: 0; font-size: 0.9rem;">
            <i class="fas fa-clock" style="margin-right: 0.5rem;"></i>
            Last changed: ${status.daysSinceLastChange} days ago
          </p>
        ` : ''}
      </div>
      
      ${nextChangeText ? `
        <div style="
          background: rgba(40, 167, 69, 0.1);
          border: 1px solid rgba(40, 167, 69, 0.3);
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        ">
          <p style="color: #28a745; margin: 0; font-weight: 600;">
            <i class="fas fa-calendar-check" style="margin-right: 0.5rem;"></i>
            ${nextChangeText}
          </p>
        </div>
      ` : ''}
      
      <div style="
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 10px;
        padding: 1rem;
        margin-bottom: 1.5rem;
        text-align: left;
      ">
        <h4 style="color: #ffc107; margin: 0 0 0.5rem 0; font-size: 1rem;">
          <i class="fas fa-question-circle" style="margin-right: 0.5rem;"></i>
          Username Change Rules:
        </h4>
        <ul style="color: rgba(255, 255, 255, 0.8); margin: 0; padding-left: 1.5rem; font-size: 0.9rem;">
          <li>First 30 days: You can change your username once</li>
          <li>After 30 days: You can change your username once every 30 days</li>
          <li>This helps maintain consistency and prevent abuse</li>
        </ul>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button onclick="this.closest('.username-restriction-modal').remove()" style="
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
          <i class="fas fa-times" style="margin-right: 0.5rem;"></i>
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Handle username change form submission
 */
async function handleUsernameSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const newUsername = form.querySelector('#new-username').value.trim();
  const feedback = document.getElementById('username-change-feedback');
  
  if (!newUsername) {
    showFeedback(feedback, 'Please enter a username', 'error');
    return;}
  
  try {
    const response = await fetch('/api/me/change-username', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: newUsername })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Show success message
      showNotification('Username updated successfully! Reloading page...', 'success');
      
      // Hide the form
      cancelUsernameChange();
      
      // Reload the page to show updated username
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Give user time to see the success message
      
    } else {
      const error = await response.json();
      
      // Show specific error message from backend
      let errorMessage = error.message || 'Failed to update username';
      
      // If there's a nextChangeDate, include it in the message
      if (error.nextChangeDate) {
        const nextDate = new Date(error.nextChangeDate);
        const now = new Date();
        const daysRemaining = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining === 0) {
          errorMessage += ' You can change your username again today!';
        } else if (daysRemaining === 1) {
          errorMessage += ' You can change your username again tomorrow!';
        } else {
          errorMessage += ` You can change your username again in ${daysRemaining} days (${nextDate.toLocaleDateString()})`;
        }
      }
      
      showFeedback(feedback, errorMessage, 'error');
      logger.error('Username change failed', error);
    }
  } catch (error) {
    logger.error('Username update failed', error);
    showFeedback(feedback, 'Failed to update username. Please try again.', 'error');
  }
}

/**
 * Cancel username change
 */
function cancelUsernameChange() {
  const container = document.getElementById('username-change-container');
  const form = document.getElementById('username-change-form');
  const feedback = document.getElementById('username-change-feedback');
  
  if (container) container.style.display = 'none';
  if (form) form.reset();
  if (feedback) feedback.innerHTML = '';
}

/**
 * Show feedback message
 */
function showFeedback(element, message, type) {
  if (!element) return;element.innerHTML = `<div class="feedback-message ${type}">${message}</div>`;
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) return;const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  container.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

/**
 * Show success toast notification
 */
function showSuccessToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    max-width: 400px;
    font-weight: 600;
    backdrop-filter: blur(10px);
    animation: slideInRight 0.3s ease-out;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    </div>
  `;

  // Add animation styles if not already present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 4000);
}

// Make toast functions globally available
window.showSuccessToast = showSuccessToast;

/**
 * Show error toast notification
 */
function showErrorToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    max-width: 400px;
    font-weight: 600;
    backdrop-filter: blur(10px);
    animation: slideInRight 0.3s ease-out;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <i class="fas fa-exclamation-triangle"></i>
      <span>${message}</span>
    </div>
  `;

  // Ensure animation styles are present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto remove after 5 seconds (longer for errors)
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 5000);
}

// Make error toast function globally available
window.showErrorToast = showErrorToast;

/**
 * Refresh player data from API
 */
async function refreshPlayerData() {
  try {
    logger.info('Refreshing player data from API');
    
    // Fetch fresh player data from API
    const response = await fetch('/api/ladder/my-players', {
      headers: window.getAuthHeaders ? window.getAuthHeaders() : {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      cache: 'no-cache' // Ensure we get fresh data
    });
    
    if (response.ok) {
      const players = await response.json();
      logger.info('Refreshed players from API', { count: players.length });
      logger.debug('Player details', players.map(p => ({ name: p.name, gameType: p.gameType, mmr: p.mmr })));
      
      // Update barracks manager with fresh data
      if (window.barracksManager) {
        logger.info('Updating barracks manager with refreshed players');
        window.barracksManager.updatePlayers(players);
        logger.info('Barracks manager updated');
      } else {
        logger.warn('Barracks manager not available');
      }
      
      // Update profile manager cache if available
      if (window.profileManager && window.profileManager.updatePlayersCache) {
        logger.info('Updating profile manager cache');
        window.profileManager.updatePlayersCache(players);
      } else {
        logger.info('Profile manager cache update not available');
      }
      
      return players;} else {
      logger.error('Failed to refresh player data', { status: response.status, statusText: response.statusText });
      throw new Error('Failed to refresh player data');
    }
  } catch (error) {
    logger.error('Error refreshing player data', error);
    throw error;
  }
}

/**
 * Setup delete account modal and functionality
 */
function setupDeleteAccountHandlers() {
  logger.info('Setting up delete account handlers');
  
  const deleteBtn = document.getElementById('delete-account-btn');
  const modal = document.getElementById('delete-account-modal');
  const closeBtn = document.getElementById('close-delete-account-modal');
  const cancelBtn = document.getElementById('cancel-delete-account');
  const confirmBtn = document.getElementById('confirm-delete-account');
  const confirmationInput = document.getElementById('delete-confirmation');
  
  logger.debug('Delete account elements found', {
    deleteBtn: !!deleteBtn,
    modal: !!modal,
    closeBtn: !!closeBtn,
    cancelBtn: !!cancelBtn,
    confirmBtn: !!confirmBtn,
    confirmationInput: !!confirmationInput
  });
  
  if (!deleteBtn || !modal) {
    logger.error('Delete account elements not found, skipping setup');
    return;}
  
  // Show modal when delete button is clicked
  deleteBtn.addEventListener('click', (e) => {
    logger.info('Delete account button clicked');
    
    // Show modal using CSS classes
    modal.style.display = 'block';
    modal.classList.add('show');
    
    logger.debug('Modal display properties', {
      display: modal.style.display,
      classes: modal.className,
      computedDisplay: window.getComputedStyle(modal).display,
      computedVisibility: window.getComputedStyle(modal).visibility,
      computedZIndex: window.getComputedStyle(modal).zIndex
    });
  });
  
  // Hide modal functions
  const hideModal = () => {
    logger.info('Hiding delete account modal');
    modal.style.display = 'none';
    modal.classList.remove('show');
  };
  
  closeBtn?.addEventListener('click', hideModal);
  cancelBtn?.addEventListener('click', hideModal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal();
    }
  });
  
  // Enable/disable confirm button based on input
  confirmationInput?.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    const isValid = value === 'DELETE';
    
    confirmBtn.disabled = !isValid;
    if (isValid) {
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    } else {
      confirmBtn.style.opacity = '0.5';
      confirmBtn.style.cursor = 'not-allowed';
    }
  });
  
  // Handle account deletion
  confirmBtn?.addEventListener('click', async () => {
    if (confirmBtn.disabled) return;logger.info('Confirming account deletion');
    
    try {
      // Show loading state
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
      confirmBtn.disabled = true;
      
      // Make API call to delete account
      const response = await fetch('/api/users/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (response.ok) {
        logger.info('Account deletion successful');
        // Show success message and redirect
        modal.innerHTML = `
          <div class="modal-content" style="max-width: 400px; text-align: center;">
            <div class="modal-header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
              <h2><i class="fas fa-check-circle"></i> Account Deleted</h2>
            </div>
            <div class="modal-body">
              <p style="color: #e2e8f0; margin-bottom: 1.5rem;">
                Your account has been successfully deleted. You will be redirected to the home page in 3 seconds.
              </p>
              <div style="color: #20c997;">
                <i class="fas fa-spinner fa-spin"></i> Redirecting...
              </div>
            </div>
          </div>
        `;
        
        // Redirect to home page after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        
      } else {
        throw new Error(result.error || 'Failed to delete account');
      }
      
    } catch (error) {
      logger.error('Delete account error', error);
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 8px; padding: 1rem; margin-top: 1rem; color: #dc3545;';
      errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        Error: ${error.message}
      `;
      
      modal.querySelector('.modal-body').appendChild(errorDiv);
      
      // Reset button state
      confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete My Account Forever';
      confirmBtn.disabled = false;
    }
  });
  
  logger.info('Delete account handlers setup complete');
}

/**
 * Handle any uncaught errors in the profile system
 */
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('profile')) {
    // console.error('🚨 Profile System Error:', {
    //   message: event.message,
    //   filename: event.filename,
    //   lineno: event.lineno,
    //   colno: event.colno,
    //   error: event.error
    // });
    
    // Could send error report to server here
    // sendErrorReport(event);
  }
});

/**
 * Handle unhandled promise rejections in profile system
 */
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('profile')) {
    // console.error('🚨 Profile System Promise Rejection:', event.reason);
    event.preventDefault(); // Prevent default browser error handling
  }
});

// Modal functionality now handled by TownHallModalManager
// Legacy functions removed - use TownHallModalManager directly

 

// Global function to handle player clicks from HTML
window.handlePlayerClick = function(playerName) {
  logger.info(`Global handlePlayerClick called for: ${playerName}`);
  
  if (window.barracksManager && window.barracksManager.handlePlayerClick) {
    window.barracksManager.handlePlayerClick(playerName);
  } else {
    // Fallback handling
    if (window.showPlayerDetails) {
      window.showPlayerDetails(playerName);
    } else if (window.openPlayerDetailsModal) {
      window.openPlayerDetailsModal(playerName);
    } else {
      logger.warn('No player modal functions available, redirecting to ladder');
      window.location.href = `/views/arena.html?search=${encodeURIComponent(playerName)}`;
    }
  }
};

// Function to sync WC1 player name with current username
window.syncWC1Player = async function() {
  try {
    
    
    // Get current user data
    const userResponse = await fetch('/api/me');
    if (!userResponse.ok) {
      throw new Error('Failed to get user data');
    }
    const userData = await userResponse.json();
    
    logger.info('Current username', { username: userData.username });
    
    // Call the WC1 sync endpoint
    const response = await fetch('/api/ladder/wc1/sync-username', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const result = await response.json();
      
      
      // Show success message
      showSuccessToast(`WC1 player synced successfully! Player name is now "${userData.username}".`);
      
      // Refresh player data
      await refreshPlayerData();
      
      // Refresh the barracks modal
      const modal = document.querySelector('.modal.show');
      if (modal) {
        const sectionType = modal.dataset.section;
        if (sectionType === 'player-names') {
          // Re-initialize the barracks section
          logger.info('Barracks section refresh handled by TownHallModalManager');
        }
      }
    } else {
      const error = await response.json();
      if (error.error && error.error.includes('No WC1 player found')) {
        // No WC1 player exists, create one
        logger.info('No WC1 player found, creating one');
        await createWC1Player();
      } else {
        throw new Error(error.error || 'Failed to sync WC1 player');
      }
    }
  } catch (error) {
    logger.error('Error syncing WC1 player', error);
    showErrorToast(`Failed to sync WC1 player: ${error.message}`);
  }
};

// Function to create a WC1 player
async function createWC1Player() {
  try {
    logger.info('Creating WC1 player');
    
    // Get current user data
    const userResponse = await fetch('/api/me');
    if (!userResponse.ok) {
      throw new Error('Failed to get user data');
    }
    const userData = await userResponse.json();
    
    // Create a WC1 player using the user's username
    const response = await fetch('/api/ladder/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        playerName: userData.username,
        gameType: 'wc1',
        preferredRace: 'human',
        autoCreated: true
      })
    });
    
    if (response.ok) {
      const player = await response.json();
      logger.info('WC1 player created', { player });
      
      // Show success message
      showSuccessToast(`WC1 player "${player.player.name}" created successfully!`);
      
      // Refresh player data
      await refreshPlayerData();
      
      // Refresh the barracks modal
      const modal = document.querySelector('.modal.show');
      if (modal) {
        const sectionType = modal.dataset.section;
        if (sectionType === 'player-names') {
          // Re-initialize the barracks section
          logger.info('Barracks section refresh handled by TownHallModalManager');
        }
      }
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create WC1 player');
    }
  } catch (error) {
    logger.error('Error creating WC1 player', error);
    showErrorToast(`Failed to create WC1 player: ${error.message}`);
  }
} 

// Function to add a new player properly
window.addPlayer = async function() {
  try {
    logger.info('Adding new player');
    
    // Create a simple modal for adding a player
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const currentFilter = window.barracksManager?.currentFilter || 'wc3';
    const gameTypeNames = {
      'wc1': 'WC1',
      'wc2': 'WC2', 
      'wc3': 'WC3'
    };
    const gameTypeName = gameTypeNames[currentFilter] || currentFilter.toUpperCase();
    
    // Determine if we should show the dropdown based on current context
    const shouldShowDropdown = currentFilter === 'all';
    
    const backendGameType = currentFilter;
    
    modal.innerHTML = `
      <div style="
        background: #1a1a1a;
        border: 2px solid #d4af37;
        border-radius: 10px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        color: white;
        font-family: 'Cinzel', serif;
      ">
        <h2 style="color: #d4af37; margin-bottom: 20px; text-align: center;">
          <i class="fas fa-user-plus"></i> Add ${shouldShowDropdown ? '' : gameTypeName + ' '}Player
        </h2>
        
        <form id="add-player-form">
          <div style="margin-bottom: 20px;">
            <label for="player-name" style="display: block; margin-bottom: 5px; color: #d4af37;">
              Player Name:
            </label>
            <input type="text" id="player-name" name="playerName" required
                   style="
                     width: 100%;
                     padding: 10px;
                     border: 1px solid #d4af37;
                     border-radius: 5px;
                     background: #2a2a2a;
                     color: white;
                     font-size: 16px;
                   "
                   placeholder="Enter your in-game player name">
            <small style="color: #888; font-size: 12px;">
              Enter the exact player name as it appears in-game
            </small>
          </div>
          
          ${shouldShowDropdown ? `
          <div style="margin-bottom: 20px;">
            <label for="game-type" style="display: block; margin-bottom: 5px; color: #d4af37;">
              Game Type:
            </label>
            <select id="game-type" name="gameType" required
                    style="
                      width: 100%;
                      padding: 10px;
                      border: 1px solid #d4af37;
                      border-radius: 5px;
                      background: #2a2a2a;
                      color: white;
                      font-size: 16px;
                    ">
              <option value="wc1">Warcraft 1</option>
              <option value="wc2">Warcraft 2</option>
              <option value="wc3" selected>Warcraft 3</option>
            </select>
          </div>` : `
          <input type="hidden" name="gameType" value="${backendGameType}">
          `}
          
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button type="submit" style="
              background: linear-gradient(45deg, #d4af37, #b8941f);
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
              font-size: 16px;
            ">
              <i class="fas fa-plus"></i> Add Player
            </button>
            <button type="button" onclick="this.closest('.modal').remove()" style="
              background: #666;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            ">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    const form = modal.querySelector('#add-player-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const playerName = formData.get('playerName').trim();
      const gameType = formData.get('gameType');
      
      if (!playerName) {
        showErrorToast('Please enter a player name');
        return;}
      
      try {
        logger.info(`Creating player: ${playerName} for ${gameType}`);
        
        const response = await fetch('/api/ladder/players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            playerName: playerName,
            gameType: gameType,
            preferredRace: 'human'
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          logger.info('Player created successfully', { result });
          
          // Close modal
          modal.remove();
          
          // Show success notification using toast
          showSuccessToast(`Player "${playerName}" added successfully!`);
          
          logger.info('Starting refresh process after player creation');
          
          // Clear any cached player data
          if (window.profileManager && window.profileManager.clearCache) {
            logger.info('Clearing profile manager cache');
            window.profileManager.clearCache();
          }
          
          // Wait a moment for backend to be consistent
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh player data from API directly
          logger.info('Refreshing player data');
          const refreshedPlayers = await refreshPlayerData();
          logger.debug('Refreshed players', { players: refreshedPlayers });
          
          // Force refresh the entire barracks modal
          const openModal = document.querySelector('.modal.show');
          if (openModal && openModal.dataset.section === 'player-names') {
            logger.info('Re-initializing barracks modal');
            // Re-initialize the modal content instead of reopening
            logger.info('Barracks section refresh handled by TownHallModalManager');
            logger.info('Barracks modal refreshed');
          } else {
            logger.info('No barracks modal open, skipping modal refresh');
          }
          
          // Also refresh the main page barracks section if present
          if (window.barracksManager && refreshedPlayers) {
            logger.info('Refreshing main page barracks section');
            window.barracksManager.updatePlayers(refreshedPlayers);
            window.barracksManager.updatePlayerDisplay();
            window.barracksManager.updateFilterCounts();
            logger.info('Main page barracks refreshed');
          }
          
        } else {
          let errorMessage = 'Failed to create player';
          try {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          } catch (parseError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
      } catch (error) {
        logger.error('Error creating player', error);
        showErrorToast(`Failed to create player: ${error.message}`);
      }
    });
    
    // Focus on the input
    const input = modal.querySelector('#player-name');
    if (input) {
      input.focus();
    }
    
  } catch (error) {
    logger.error('Error showing add player modal', error);
    showErrorToast('Failed to show add player form');
  }
}; 

/**
 * Load campaign data and update the wartable section
 */
async function loadCampaignDataForWartable() {
  try {
    // Get campaign data from UnifiedProfileManager
    let campaignData = null;
    if (window.profileManager && typeof window.profileManager.getCampaignData === 'function') {
      campaignData = window.profileManager.getCampaignData();
    } else {
      // Fallback: load campaign data directly
      const [statsResponse, progressResponse] = await Promise.all([
        fetch('/api/campaigns/user/stats', { credentials: 'include' }),
        fetch('/api/campaigns/user/progress', { credentials: 'include' })
      ]);
      
      campaignData = {
        stats: null,
        progress: [],
        speedruns: []
      };
      
      if (statsResponse.ok) {
        campaignData.stats = await statsResponse.json();
      }
      
      if (progressResponse.ok) {
        campaignData.progress = await progressResponse.json();
      }
    }
    
    // Update the wartable section with campaign data
    updateWartableSection(campaignData);
    
  } catch (error) {
    logger.error('Failed to load campaign data for wartable', error);
  }
}

/**
 * Update the wartable section with campaign data
 */
function updateWartableSection(campaignData) {
  try {
    // Update campaign stat cards
    if (campaignData && campaignData.stats) {
      const stats = campaignData.stats;
      
      // Update missions completed
      const missionsCompletedElement = document.getElementById('missions-completed');
      if (missionsCompletedElement) {
        missionsCompletedElement.textContent = stats.totalMissionsCompleted || 0;
      }
      
      // Update campaigns completed
      const campaignsCompletedElement = document.getElementById('campaigns-completed');
      if (campaignsCompletedElement) {
        campaignsCompletedElement.textContent = stats.completedCampaigns || 0;
      }
    }
    
    // Load and display campaign progress
    loadCampaignProgress(campaignData);
    
  } catch (error) {
    logger.error('Failed to update wartable section', error);
  }
}

/**
 * Load and display campaign progress
 */
async function loadCampaignProgress(campaignData) {
  try {
    const container = document.getElementById('campaign-progress-container');
    if (!container) {
      return;}
    
    // Show loading state
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading campaigns...</div>';
    
    // Fetch all campaigns from backend
    const campaignsResponse = await fetch('/api/campaigns', { credentials: 'include' });
    
    let allCampaigns = [];
    if (campaignsResponse.ok) {
      allCampaigns = await campaignsResponse.json();
    } else {
      logger.error('Failed to load campaigns', { status: campaignsResponse.status, statusText: campaignsResponse.statusText });
    }
    
    // Get user progress from campaign data
    const userProgress = campaignData?.progress || [];
    
    // Show campaigns for active tab (default to WC2)
    const activeTab = document.querySelector('.war-table-tab.active');
    const selectedGame = activeTab ? activeTab.dataset.game : 'wc2';
    
    // Filter and display campaigns
    filterCampaignsByGame(selectedGame, allCampaigns, userProgress);
    
    // Setup war table tabs
    setupWarTableTabs(allCampaigns, userProgress);
    
  } catch (error) {
    logger.error('Failed to load campaign progress', error);
    const container = document.getElementById('campaign-progress-container');
    if (container) {
      container.innerHTML = '<div class="error">Failed to load campaigns</div>';
    }
  }
}

/**
 * Setup war table tabs functionality
 */
function setupWarTableTabs(allCampaigns, userProgress) {
  const tabs = document.querySelectorAll('.war-table-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Filter campaigns by selected game
      const selectedGame = tab.dataset.game;
      filterCampaignsByGame(selectedGame, allCampaigns, userProgress);
    });
  });
  
}

/**
 * Filter and display campaigns by game type
 */
function filterCampaignsByGame(gameType, allCampaigns, userProgress) {
  const container = document.getElementById('campaign-progress-container');
  if (!container || !allCampaigns) return;const dbGameType = gameType;

  // Extract campaigns for the selected game type
  let allCampaignsList = [];
  
  if (Array.isArray(allCampaigns)) {
    allCampaigns.forEach((gameGroup, index) => {
      const groupGame = gameGroup.game || gameGroup._id?.game;
      const groupExpansion = gameGroup.expansion || gameGroup._id?.expansion;
      
      if (groupGame === dbGameType && gameGroup.campaigns) {
        gameGroup.campaigns.forEach(campaign => {
          allCampaignsList.push({
            game: groupGame,
            expansion: groupExpansion,
            name: campaign.campaignName,
            race: campaign.race,
            missions: campaign.missions,
            totalMissions: campaign.totalMissions
          });
        });
      }
    });
  }



  if (allCampaignsList.length === 0) {
    const gameNames = {
      'wc1': 'Warcraft I',
      'wc2': 'Warcraft II',
      'wc3': 'Warcraft III'
    };
    container.innerHTML = `
      <div class="no-campaigns">
        <i class="fas fa-info-circle"></i>
        <p>No ${gameNames[gameType]} campaigns available yet</p>
        <p>Check back later for new content!</p>
      </div>
    `;
    return;}

  // Create progress map for quick lookup
  const progressMap = new Map();
  if (userProgress) {
    userProgress.forEach(item => {
      if (item._id) {
        const key = `${item._id.game}-${item._id.expansion}-${item._id.campaignName}-${item._id.race}`;
        progressMap.set(key, {
          completed: item.completedMissions || 0,
          total: item.totalMissions || 0
        });
      }
    });
  }

  // Process each campaign and categorize them
  const inProgressCampaigns = [];
  const completedCampaigns = [];
  const notStartedCampaigns = [];

  allCampaignsList.forEach(campaign => {
    const key = `${campaign.game}-${campaign.expansion || 'base'}-${campaign.name}-${campaign.race || 'any'}`;
    const userProgress = progressMap.get(key) || { completed: 0, total: 0 };
    
    // Use campaign.totalMissions if available, otherwise fallback to userProgress.total
    // If both are missing, use the missions array length as a fallback
    let totalMissions = campaign.totalMissions || userProgress.total || 0;
    if (totalMissions === 0 && campaign.missions && Array.isArray(campaign.missions)) {
      totalMissions = campaign.missions.length;
    }
    
    const completedMissions = userProgress.completed || 0;
    const percentage = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;
    
    const campaignData = {
      ...campaign,
      completedMissions,
      totalMissions,
      percentage,
      key
    };

    // Categorize the campaign
    if (completedMissions === 0) {
      notStartedCampaigns.push(campaignData);
    } else if (percentage >= 100) {
      completedCampaigns.push(campaignData);
    } else {
      inProgressCampaigns.push(campaignData);
    }
  });

  // Generate HTML for each section
  const gameNames = {
    'wc1': 'WC I',
    'wc2': 'WC II', 
    'wc3': 'WC III'
  };

  const raceNames = {
    'human': 'Human',
    'orc': 'Orc',
    'undead': 'Undead',
    'nightelf': 'Night Elf',
    'alliance': 'Alliance',
    'horde': 'Horde'
  };

  function generateCampaignHTML(campaign) {
    return `
      <div class="campaign-progress-item">
        <div class="campaign-item-header">
          <div class="campaign-name">
            <h4>${campaign.name}</h4>
            <span class="campaign-race">${raceNames[campaign.race] || campaign.race || 'Any Race'}</span>
          </div>
          <div class="campaign-game-badge">${gameNames[campaign.game] || campaign.game}</div>
        </div>
        <div class="campaign-progress-info">
          <span class="progress-fraction">${campaign.completedMissions}/${campaign.totalMissions}</span>
          <span class="progress-percentage">${Math.round(campaign.percentage)}%</span>
        </div>
        <div class="campaign-progress-bar">
          <div class="campaign-progress-fill" style="width: ${campaign.percentage}%"></div>
        </div>
      </div>
    `;}

  // Build the complete HTML
  let html = '';

  // In Progress Section
  if (inProgressCampaigns.length > 0) {
    html += `
      <div class="campaign-section">
        <h3 class="campaign-section-title">
          <i class="fas fa-play-circle"></i>
          In Progress (${inProgressCampaigns.length})
        </h3>
        <div class="campaign-section-content">
          ${inProgressCampaigns.map(generateCampaignHTML).join('')}
        </div>
      </div>
    `;
  }

  // Completed Section
  if (completedCampaigns.length > 0) {
    html += `
      <div class="campaign-section">
        <h3 class="campaign-section-title">
          <i class="fas fa-check-circle"></i>
          Completed (${completedCampaigns.length})
        </h3>
        <div class="campaign-section-content">
          ${completedCampaigns.map(generateCampaignHTML).join('')}
        </div>
      </div>
    `;
  }

  // Not Started Section (optional - can be hidden if you prefer)
  if (notStartedCampaigns.length > 0) {
    html += `
      <div class="campaign-section">
        <h3 class="campaign-section-title">
          <i class="fas fa-clock"></i>
          Not Started (${notStartedCampaigns.length})
        </h3>
        <div class="campaign-section-content">
          ${notStartedCampaigns.map(generateCampaignHTML).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  
  // Update the summary stats for this game type
  updateGameTypeSummary(gameType, inProgressCampaigns, completedCampaigns, notStartedCampaigns);
  
}

/**
 * Update the summary stats for the selected game type
 */
function updateGameTypeSummary(gameType, inProgressCampaigns, completedCampaigns, notStartedCampaigns) {
  const missionsCompletedElement = document.getElementById('missions-completed');
  const campaignsCompletedElement = document.getElementById('campaigns-completed');
  
  if (missionsCompletedElement && campaignsCompletedElement) {
    // Calculate totals for this game type
    const totalMissionsCompleted = inProgressCampaigns.reduce((sum, c) => sum + c.completedMissions, 0) + 
                                  completedCampaigns.reduce((sum, c) => sum + c.completedMissions, 0);
    const totalCampaignsCompleted = completedCampaigns.length;
    
    missionsCompletedElement.textContent = totalMissionsCompleted;
    campaignsCompletedElement.textContent = totalCampaignsCompleted;
    
  }
}

// Test function for TownHallModalManager
window.testTownHallModalSystem = function() {
  if (window.townHallModalManager) {
    // Test opening the first section
    const firstSection = document.querySelector('[data-section="about-me"]');
    if (firstSection) {
      window.townHallModalManager.openSectionModal(firstSection);
    }
  }
};

/**
 * Initialize War Tales Canvas functionality
 */
function initializeWarTales() {
  try {
    // Initialize Canvas Book Engine
    const canvas = document.getElementById('war-tales-canvas');
    if (!canvas) {
      logger.error('Canvas element not found');
      return;}
    
    // Create book engine instance
    window.warTalesBook = new CanvasBookEngine(canvas, {
      width: 500,
      height: 600,
      pageCount: 10
    });
    
    // Set up game selection tabs
    setupGameSelectionTabs();
    
    // Set up book controls
    setupBookControls();
    
    // Load initial game data
    loadCanvasWarTaleData('wc2');
    
    // Hide loading indicator
    const loadingElement = document.getElementById('book-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  } catch (error) {
    logger.error('Failed to initialize War Tales Canvas', error);
  }
}

/**
 * Set up game selection tabs
 */
function setupGameSelectionTabs() {
  const gameTabs = document.querySelectorAll('.game-tab');
  
  gameTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const gameType = tab.dataset.game;
      
      // Update active tab
      gameTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Load game data
      loadCanvasWarTaleData(gameType);
    });
  });
}

/**
 * Set up book controls
 */
function setupBookControls() {
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (window.warTalesBook) {
        window.warTalesBook.flipPage(-1);
      }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (window.warTalesBook) {
        window.warTalesBook.flipPage(1);
      }
    });
  }
  
  // Update page info when page changes
  if (window.warTalesBook) {
    window.warTalesBook.onPageChange = (pageIndex) => {
      updatePageInfo(pageIndex);
    };
  }
}



/**
 * Load Canvas War Tale data for a specific game
 */
async function loadCanvasWarTaleData(gameType) {
  try {
    // Update book info panel
    updateBookInfo(gameType);
    
    // Load campaign data from API
    const response = await fetch('/api/campaigns', { credentials: 'include' });
    
    if (response.ok) {
      const allCampaigns = await response.json();
      
      // Filter campaigns for this game
      const gameCampaigns = allCampaigns.filter(campaign => {
        const campaignGame = campaign.gameType || campaign.game || campaign._id?.game;
        return campaignGame === gameType;});
      
      // Generate book pages from campaign data
      const bookPages = generateBookPages(gameType, gameCampaigns);
      
      // Update Canvas Book Engine
      if (window.warTalesBook) {
        window.warTalesBook.pages = bookPages;
        window.warTalesBook.pageCount = bookPages.length;
        window.warTalesBook.currentPage = 0;
        window.warTalesBook.render();
        
        // Update page info
        updatePageInfo(0);
      }
      
    } else {
      logger.error(`Failed to load campaigns for ${gameType}`, { status: response.status });
    }
    
  } catch (error) {
    logger.error(`Error loading Canvas War Tale data for ${gameType}`, error);
  }
}

/**
 * Generate book pages from campaign data
 */
function generateBookPages(gameType, campaigns) {
  const pages = [];
  
  // Game info pages
  const gameInfo = getGameInfo(gameType);
  pages.push({
    id: 0,
    content: {
      title: gameInfo.title,
      text: gameInfo.description,
      missions: [],
      progress: 0
    },
    texture: null,
    curlAngle: 0,
    curlRadius: 0,
    isFlipping: false,
    flipStartTime: 0,
    z: 0
  });
  
  // Campaign pages
  campaigns.forEach((campaign, index) => {
    const progress = calculateCampaignProgress(campaign);
    
    pages.push({
      id: index + 1,
      content: {
        title: campaign.name || campaign.campaignName,
        text: campaign.description || `Campaign ${index + 1} for ${gameInfo.title}`,
        missions: campaign.missions || [],
        progress: progress.percentage
      },
      texture: null,
      curlAngle: 0,
      curlRadius: 0,
      isFlipping: false,
      flipStartTime: 0,
      z: (index + 1) * 0.1
    });
  });
  
  return pages;}

/**
 * Get game information
 */
function getGameInfo(gameType) {
  const gameInfo = {
    'wc1': {
      title: 'Warcraft I: Orcs & Humans',
      description: 'The first war between the Orcish Horde and the Human Alliance. Experience the origins of the conflict that would shape Azeroth for generations to come.',
      totalMissions: 10
    },
    'wc2': {
      title: 'Warcraft II: Tides of Darkness',
      description: 'The Second War rages across Azeroth as the Horde seeks to conquer the Eastern Kingdoms. Command mighty armies and legendary heroes in epic battles.',
      totalMissions: 15
    },
    'wc3': {
      title: 'Warcraft III: Reign of Chaos',
      description: 'A new threat emerges as the Burning Legion invades Azeroth. Heroes must rise to face the demonic invasion and save the world from destruction.',
      totalMissions: 20
    }
  };
  
  return gameInfo[gameType] || gameInfo['wc2'];}

/**
 * Update book information panel
 */
function updateBookInfo(gameType) {
  const gameInfo = getGameInfo(gameType);
  
  const titleElement = document.getElementById('book-title');
  const subtitleElement = document.getElementById('book-subtitle');
  const totalMissionsElement = document.getElementById('total-missions');
  
  if (titleElement) titleElement.textContent = gameInfo.title;
  if (subtitleElement) subtitleElement.textContent = gameInfo.description.split('.')[0] + '.';
  if (totalMissionsElement) totalMissionsElement.textContent = gameInfo.totalMissions;
}

/**
 * Update page information
 */
function updatePageInfo(pageIndex) {
  const pageInfoElement = document.getElementById('page-info');
  if (pageInfoElement && window.warTalesBook) {
    pageInfoElement.textContent = `Page ${pageIndex + 1} of ${window.warTalesBook.pageCount}`;
  }
}



/**
 * Calculate campaign progress for War Tales
 */
function calculateCampaignProgress(campaign) {
  // Handle different campaign data structures
  let totalMissions = 0;
  let completedMissions = 0;
  
  if (campaign.missions && Array.isArray(campaign.missions)) {
    totalMissions = campaign.missions.length;
    completedMissions = campaign.missions.filter(m => m.completed).length;
  } else if (campaign.totalMissions) {
    totalMissions = campaign.totalMissions;
    completedMissions = campaign.completedMissions || 0;
  } else if (campaign.missionCount) {
    totalMissions = campaign.missionCount;
    completedMissions = campaign.completedMissionCount || 0;
  }
  
  const percentage = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  
  return {
    totalMissions,
    completedMissions,
    percentage
  };}



/**
 * View War Tale campaign details
 */
function viewWarTaleCampaign(campaignId) {
  // TODO: Implement campaign viewing functionality
  alert(`Viewing War Tale campaign: ${campaignId}`);
}

/**
 * Complete War Tale campaign
 */
function completeWarTaleCampaign(campaignId) {
  // TODO: Implement campaign completion functionality
  alert(`Completing War Tale campaign: ${campaignId}`);
}

// Initialize War Tales when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait for profile system to be ready
  const checkProfileSystem = () => {
    if (window.profileManager && window.profileManager.isReady) {
      initializeWarTales();
    } else {
      setTimeout(checkProfileSystem, 500);
    }
  };
  checkProfileSystem();
});

// Expose War Tales functions globally for debugging
window.initializeWarTales = initializeWarTales;
window.loadCanvasWarTaleData = loadCanvasWarTaleData;
window.viewWarTaleCampaign = viewWarTaleCampaign;
window.completeWarTaleCampaign = completeWarTaleCampaign;