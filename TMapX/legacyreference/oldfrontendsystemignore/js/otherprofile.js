/**
 * User Profile Page JavaScript
 *
 * Handles user profile functionality including:
 * - Loading user information
 * - Displaying player names linked to the user
 * - Showing social links
 * - Navigation back to chat
 */
import logger from '/js/utils/logger.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the user profile page
  initUserProfilePage();
});

/**
 * Initialize the user profile page
 */
async function initUserProfilePage() {
  // Get user ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  if (!userId) {
    showError('No user ID specified');
    return;}

  // Load current user data first
  await loadCurrentUser();

  // Load profile user data
  await loadUserProfile(userId);

  // Load player names
  await loadPlayerNames(userId);

  // Load user tournaments
  await loadUserTournaments(userId);

  // Load user maps
  await loadUserMaps(userId);

  // Set up activity tabs
  setupActivityTabs(userId);

  // Set up navigation buttons based on referrer
  setupNavigationButtons(userId);

  // Set up send message button
  setupSendMessageButton(userId);
}

/**
 * Load current logged-in user data
 */
async function loadCurrentUser() {
  try {
    const response = await fetch('/api/me', { credentials: 'include' });

    if (response.ok) {
      const user = await response.json();
      window.currentUser = user;
    }
  } catch (error) {
    logger.error('Error loading current user:', error);
    // Continue anyway - user might not be logged in
  }
}

/**
 * Load user profile data
 * @param {string} userId - User ID
 */
async function loadUserProfile(userId) {
  try {
    // Fetch user data from API
    const response = await fetch(`/api/user/${userId}`, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const user = await response.json();

    // Store user data globally for later use
    window.profileUser = user;

    // Update profile elements
    const usernameElement = document.getElementById('profile-username');
    if (usernameElement) {
      usernameElement.textContent = user.username || user.displayName;
    }

    // Fetch player data to get rank information
    const playersResponse = await fetch(`/api/user/${userId}/players`, { credentials: 'include' });
    if (playersResponse.ok) {
      const players = await playersResponse.json();

      // Find player with highest MMR
      let highestRankPlayer = null;
      if (players && players.length > 0) {
        highestRankPlayer = players.reduce((highest, current) => {
          if (!highest || !highest.mmr) return current;if (!current || !current.mmr) return highest;return (current.mmr > highest.mmr) ? current : highest;}, null);
      }

      // Update rank information
      const highestRankName = document.getElementById('highest-rank-name');
      const highestMmr = document.getElementById('highest-mmr');
      const winsLosses = document.getElementById('wins-losses');
      const winRate = document.getElementById('win-rate');
      const profileAvatar = document.getElementById('profile-avatar');

      if (highestRankPlayer) {
        // Update rank name
        if (highestRankName) {
          highestRankName.textContent = highestRankPlayer.rank?.name || 'Unranked';
        }

        // Update MMR
        if (highestMmr) {
          highestMmr.textContent = highestRankPlayer.mmr || '0';
        }

        // Update W/L stats
        if (winsLosses) {
          const wins = highestRankPlayer.stats?.wins || 0;
          const losses = highestRankPlayer.stats?.losses || 0;
          winsLosses.textContent = `${wins}/${losses}`;
        }

        // Update win rate
        if (winRate) {
          const totalMatches = highestRankPlayer.stats?.totalMatches || 0;
          const winRateValue = totalMatches > 0 ?
            Math.round((highestRankPlayer.stats.wins / totalMatches) * 100) : 0;
          winRate.textContent = `${winRateValue}%`;
        }

        // Use database avatar (managed by backend AvatarService)
        if (profileAvatar && user.avatar) {
          profileAvatar.innerHTML = `<img src="${user.avatar}" alt="User Avatar">`;
        }
      } else {
        // Set default values if no player data
        if (highestRankName) highestRankName.textContent = 'Unranked';
        if (highestMmr) highestMmr.textContent = '0';
        if (winsLosses) winsLosses.textContent = '0/0';
        if (winRate) winRate.textContent = '0%';
        if (profileAvatar && user.avatar) {
          profileAvatar.innerHTML = `<img src="${user.avatar}" alt="User Avatar">`;
        } else if (profileAvatar) {
          profileAvatar.innerHTML = '<img src="/assets/img/ranks/emblem.png" alt="Default Rank">';
        }
      }
    }

    // Update bio and social links
    updateBioAndSocialLinks(user);
  } catch (error) {
    logger.error('Error loading user profile:', error);
    showError('Failed to load user profile');
  }
}

/**
 * Update bio and social links in the UI
 * @param {Object} user - User data
 */
function updateBioAndSocialLinks(user) {
  // Update bio
  const bioText = document.getElementById('bio-text');
  if (user.bio) {
    bioText.textContent = user.bio;
  } else {
    bioText.textContent = 'No bio available.';
  }

  // Update social links
  const youtubeUrl = document.getElementById('youtube-url');
  const twitchUrl = document.getElementById('twitch-url');
  const youtubeCreatorBadge = document.getElementById('youtube-creator-badge');
  const twitchCreatorBadge = document.getElementById('twitch-creator-badge');

  if (user.socialLinks) {
    if (user.socialLinks.youtube) {
      // Extract username from YouTube URL for display
      let youtubeUsername = user.socialLinks.youtube;
      let youtubeDisplayUrl = user.socialLinks.youtube;
      
      // Ensure proper URL format
      if (!youtubeDisplayUrl.startsWith('http')) {
        youtubeDisplayUrl = `https://youtube.com/@${youtubeDisplayUrl}`;
      }
      
      // Display the full URL instead of just username
      youtubeUrl.innerHTML = `<a href="${youtubeDisplayUrl}" target="_blank" rel="noopener noreferrer">${youtubeDisplayUrl}</a>`;

      // Show creator badge
      if (youtubeCreatorBadge) {
        youtubeCreatorBadge.style.display = 'inline-block';
      }
    } else {
      youtubeUrl.textContent = 'Not set';

      // Hide creator badge
      if (youtubeCreatorBadge) {
        youtubeCreatorBadge.style.display = 'none';
      }
    }

    if (user.socialLinks.twitch) {
      // Extract username from Twitch URL for display
      let twitchUsername = user.socialLinks.twitch;
      let twitchDisplayUrl = user.socialLinks.twitch;
      
      // Ensure proper URL format
      if (!twitchDisplayUrl.startsWith('http')) {
        twitchDisplayUrl = `https://twitch.tv/${twitchDisplayUrl}`;
      }
      
      // Display the full URL instead of just username
      twitchUrl.innerHTML = `<a href="${twitchDisplayUrl}" target="_blank" rel="noopener noreferrer">${twitchDisplayUrl}</a>`;

      // Show creator badge
      if (twitchCreatorBadge) {
        twitchCreatorBadge.style.display = 'inline-block';
      }
    } else {
      twitchUrl.textContent = 'Not set';

      // Hide creator badge
      if (twitchCreatorBadge) {
        twitchCreatorBadge.style.display = 'none';
      }
    }
  }
}

/**
 * Load player names for the user
 * @param {string} userId - User ID
 */
async function loadPlayerNames(userId) {
  const playerNamesContainer = document.getElementById('player-names-container');
  const avatarContainer = document.getElementById('profile-avatar');

  try {
    // Show loading state
    playerNamesContainer.innerHTML = '<div class="loading">Loading player names...</div>';

    // Fetch player names from API
    const response = await fetch(`/api/user/${userId}/players`, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to fetch player names');
    }

    const players = await response.json();

    // Clear loading message
    playerNamesContainer.innerHTML = '';

    // Check if there are any player names
    if (!players || players.length === 0) {
      playerNamesContainer.innerHTML = '<div class="info-message">No player names linked to this user.</div>';

      // Use default avatar or initials if no players
      if (window.profileUser && window.profileUser.avatar) {
        // Handle Google avatar URLs
        let avatarUrl = window.profileUser.avatar;
        if (avatarUrl.includes('googleusercontent.com')) {
          // Remove any size parameters and use a larger size
          avatarUrl = avatarUrl.split('=')[0] + '=s192-c';
        }

        // Create a new image to test loading
        const img = new Image();
        img.onload = () => {
          avatarContainer.innerHTML = `<img src="${avatarUrl}" alt="Profile Avatar">`;
        };
        img.onerror = () => {
          // Fallback to initials if loading fails
          const initials = (window.profileUser?.username || window.profileUser?.displayName || 'U').charAt(0).toUpperCase();
          avatarContainer.innerHTML = `<div class="avatar-initials">${initials}</div>`;
        };
        img.src = avatarUrl;
      } else {
        const initials = (window.profileUser?.username || window.profileUser?.displayName || 'U').charAt(0).toUpperCase();
        avatarContainer.innerHTML = `<div class="avatar-initials">${initials}</div>`;
      }
      return;}

    // Find player with highest MMR for avatar
    const highestRankPlayer = players.reduce((highest, current) =>
      (current.mmr || 0) > (highest.mmr || 0) ? current : highest, players[0]);

    // Use database avatar (managed by backend AvatarService)
    if (window.profileUser && window.profileUser.avatar) {
      avatarContainer.innerHTML = `
        <img src="${window.profileUser.avatar}" alt="User Avatar" title="${highestRankPlayer?.rank?.name || 'User Avatar'}">
      `;
    } else {
      avatarContainer.innerHTML = '<img src="/assets/img/ranks/emblem.png" alt="Default Avatar">';
    }

    // Create player cards
    players.forEach(player => {
      if (player && player.name) {  // Only create cards for valid players
        const playerCard = createPlayerCard(player);
        playerNamesContainer.appendChild(playerCard);
      }
    });

    // If no valid players were added, show message
    if (playerNamesContainer.children.length === 0) {
      playerNamesContainer.innerHTML = '<div class="info-message">No valid player names found.</div>';
    }
  } catch (error) {
    logger.error('Error loading player names:', error);
    playerNamesContainer.innerHTML = '<div class="error">Failed to load player names. Please try again later.</div>';

    // Use default avatar or initials if error
    if (window.profileUser && window.profileUser.avatar) {
      // Handle Google avatar URLs
      let avatarUrl = window.profileUser.avatar;
      if (avatarUrl.includes('googleusercontent.com')) {
        // Remove any size parameters and use a larger size
        avatarUrl = avatarUrl.split('=')[0] + '=s192-c';
      }

      // Create a new image to test loading
      const img = new Image();
      img.onload = () => {
        avatarContainer.innerHTML = `<img src="${avatarUrl}" alt="Profile Avatar">`;
      };
      img.onerror = () => {
        // Fallback to initials if loading fails
        const initials = (window.profileUser?.username || window.profileUser?.displayName || 'U').charAt(0).toUpperCase();
        avatarContainer.innerHTML = `<div class="avatar-initials">${initials}</div>`;
      };
      img.src = avatarUrl;
    } else {
      const initials = (window.profileUser?.username || window.profileUser?.displayName || 'U').charAt(0).toUpperCase();
      avatarContainer.innerHTML = `<div class="avatar-initials">${initials}</div>`;
    }
  }
}

/**
 * Create a player card element
 * @param {Object} player - Player data
 * @returns {HTMLElement} - Player card element
 */
function createPlayerCard(player) {
  const playerCard = document.createElement('div');playerCard.className = 'player-card';

  // Calculate stats
  const totalMatches = player.stats?.totalMatches || 0;
  const wins = player.stats?.wins || 0;
  const losses = player.stats?.losses || 0;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  // Get the user's display name - only use social media names if explicitly set in profile
  let displayName = player.name; // Default to WCArena username
  
  // Check if we have the user's social links from the profile
  if (window.profileUser?.socialLinks) {
    // Check for YouTube first if explicitly set
    if (window.profileUser.socialLinks.youtube) {
      const ytUrl = window.profileUser.socialLinks.youtube.trim();
      if (ytUrl) {
        // Only use YouTube name if it's a valid URL with a username
        if (ytUrl.includes('youtube.com/@')) {
          displayName = '@' + ytUrl.split('@').pop().split('/')[0];
        } else if (ytUrl.includes('youtube.com/c/')) {
          displayName = 'YouTube Channel';
        } else if (ytUrl.includes('youtube.com/channel/')) {
          displayName = 'YouTube Channel';
        } else if (ytUrl.includes('youtube.com/user/')) {
          displayName = ytUrl.split('/user/').pop().split('/')[0];
        }
      }
    } 
    // Only check Twitch if YouTube isn't set
    else if (window.profileUser.socialLinks.twitch) {
      const twitchUrl = window.profileUser.socialLinks.twitch.trim();
      if (twitchUrl) {
        // Only use Twitch name if it's a valid URL with a username
        if (twitchUrl.includes('twitch.tv/')) {
          displayName = twitchUrl.split('twitch.tv/').pop().split('/')[0];
        } else {
          // If it's just a username
          displayName = twitchUrl.startsWith('@') ? twitchUrl.substring(1) : twitchUrl;
        }
      }
    }
  }

  // Use rank image or fall back to default emblem
  const rankImage = player.rank?.image || '/assets/img/ranks/emblem.png';
  const rankName = player.rank?.name || 'Unranked';
  
  // Use database avatar (managed by backend AvatarService)
  const userAvatar = window.profileUser?.avatar || '/assets/img/ranks/emblem.png';

  playerCard.innerHTML = `
    <div class="player-info">
      <img src="${userAvatar}" alt="${rankName}" class="player-rank-image" onerror="this.onerror=null; this.src='/assets/img/ranks/emblem.png';">
      <span class="player-name" title="WCArena: ${player.name}">${displayName}</span>
      <span class="player-mmr">MMR: ${player.mmr || 'N/A'}</span>
    </div>
    <div class="player-stats">
      <div class="player-stat">
        <div class="stat-value">${totalMatches}</div>
        <div class="stat-label">Matches</div>
      </div>
      <div class="player-stat">
        <div class="stat-value">${wins}/${losses}</div>
        <div class="stat-label">W/L</div>
      </div>
      <div class="player-stat">
        <div class="stat-value">${winRate}%</div>
        <div class="stat-label">Win Rate</div>
      </div>
    </div>
    <div class="player-actions">
      <button class="btn btn-view-stats" data-player-id="${player._id}">View Stats</button>
    </div>
  `;

  // Add event listener to view stats button
  playerCard.querySelector('.btn-view-stats').addEventListener('click', () => {
    // Show player details in a modal instead of navigating to player profile
    window.showPlayerDetails(player._id);
  });

  return playerCard;}

/**
 * Set up navigation buttons based on referrer
 * @param {string} userId - User ID
 */
function setupNavigationButtons(userId) {
  const backButton = document.getElementById('back-to-chat');
  const actionsContainer = document.querySelector('.profile-actions');

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('source');
  const topicId = urlParams.get('topicId');
  const postId = urlParams.get('postId');

  // Check if we came from the forum
  const referrer = document.referrer;
  const cameFromForum = source === 'forum' || referrer.includes('/views/stone-tablet.html');

  // Update button text and icon based on referrer
  if (cameFromForum) {
    backButton.innerHTML = '<i class="fas fa-comments"></i> Back to Forum';
    backButton.addEventListener('click', () => {
      // If we have a topic ID, navigate back to that specific topic
      if (topicId) {
        let forumUrl = `/views/stone-tablet.html?topic=${topicId}`;
        // If we also have a post ID, add a hash to scroll to that post
        if (postId) {
          forumUrl += `#post-${postId}`;
        }
        window.location.href = forumUrl;
      } else {
        // Otherwise, just go back to the forum
        window.location.href = '/views/stone-tablet.html';
      }
    });
  } else {
    // Default to chat
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Chat';
    backButton.addEventListener('click', () => {
      window.location.href = '/views/chat.html';
    });
  }

  // Add a "View Achievements" button
  const achievementsButton = document.createElement('button');
  achievementsButton.className = 'btn btn-secondary';
  achievementsButton.innerHTML = '<i class="fas fa-trophy"></i> Achievements';
  achievementsButton.addEventListener('click', () => {
    // Scroll to achievements section or show achievements modal
    loadAndShowAchievements(userId);
  });

  // Insert the achievements button before the send message button
  if (actionsContainer) {
    actionsContainer.insertBefore(achievementsButton, document.getElementById('send-message'));
  }
}

/**
 * Set up send message button
 * @param {string} userId - User ID
 */
function setupSendMessageButton(userId) {
  const sendButton = document.getElementById('send-message');

  sendButton.addEventListener('click', () => {
    // Store the user ID in session storage to open a private chat when returning to chat
    sessionStorage.setItem('openPrivateChatWithUser', userId);window.location.href = '/views/chat.html';
  });
}

/**
 * Load and show user achievements
 * @param {string} userId - User ID
 */
async function loadAndShowAchievements(userId) {
  try {
    // Check if achievements section already exists
    let achievementsSection = document.getElementById('achievements-section');

    // If not, create it
    if (!achievementsSection) {
      achievementsSection = document.createElement('section');
      achievementsSection.id = 'achievements-section';
      achievementsSection.className = 'achievements-section';

      // Create the basic structure
      achievementsSection.innerHTML = `
        <div class="section-header">
          <h2><i class="fas fa-trophy"></i> Achievements</h2>
          <div class="section-actions">
            <button class="btn btn-outline-secondary" id="refresh-achievements">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>

        <!-- Achievements Summary -->
        <div class="achievement-summary-card" id="achievements-summary">
          <div class="summary-item">
            <div class="summary-value" id="total-achievements">0</div>
            <div class="summary-label">Total</div>
          </div>
          <div class="summary-item">
            <div class="summary-value" id="completed-achievements">0</div>
            <div class="summary-label">Completed</div>
          </div>
          <div class="summary-item">
            <div class="summary-value" id="total-points">0</div>
            <div class="summary-label">Points</div>
          </div>
          <div class="summary-item">
            <div class="summary-value" id="completion-percentage">0%</div>
            <div class="summary-label">Complete</div>
          </div>
        </div>

        <!-- Category Filter -->
        <div class="achievement-categories" id="achievement-categories">
          <button class="achievement-category active" data-category="all">All</button>
          <button class="achievement-category" data-category="wins">Wins</button>
          <button class="achievement-category" data-category="social">Social</button>
          <button class="achievement-category" data-category="milestone">Milestones</button>
          <button class="achievement-category" data-category="special">Special</button>
        </div>

        <!-- Achievements Grid -->
        <div class="achievements-grid" id="achievements-grid">
          <!-- Achievements will be populated by JavaScript -->
          <div class="loading">Loading achievements...</div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" id="achievements-empty" style="display: none;">
          <div class="empty-state-icon">
            <i class="fas fa-trophy"></i>
          </div>
          <h3>No Achievements Yet</h3>
          <p>Complete challenges and earn achievements to see them here!</p>
        </div>
      `;

      // Add to the page
      document.querySelector('.profile-container').appendChild(achievementsSection);

      // Add CSS if not already loaded
      if (!document.querySelector('link[href="/css/achievements.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/achievements.css';
        document.head.appendChild(link);
      }
    }

    // Scroll to the achievements section
    achievementsSection.scrollIntoView({ behavior: 'smooth' });

    // Load achievements data
    const response = await fetch(`/api/achievements/user/${userId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to load achievements');
    }

    const achievementsData = await response.json();

    // Update the UI with achievements data
    updateAchievementsUI(achievementsData);

    // Set up category filters
    setupAchievementCategories();

  } catch (error) {
    logger.error('Error loading achievements:', error);
    // Show error message in achievements section
    const achievementsGrid = document.getElementById('achievements-grid');
    if (achievementsGrid) {
      achievementsGrid.innerHTML = `<div class="error-message">Failed to load achievements: ${error.message}</div>`;
    }
  }
}

// Add pagination state for tournaments
let currentTournamentsPage = 1;
const TOURNAMENTS_PER_PAGE = 6;

/**
 * Load tournaments for the user
 * @param {string} userId - User ID
 * @param {number} page - Page number
 */
async function loadUserTournaments(userId, page = 1) {
  const tournamentsContainer = document.getElementById('tournaments-container');

  try {
    // Fetch tournaments from API
    const response = await fetch(`/api/tournaments/user/${userId}`, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to fetch tournaments');
    }

    const tournaments = await response.json();

    // Clear loading message
    tournamentsContainer.innerHTML = '';

    // Check if there are any tournaments
    if (!tournaments || tournaments.length === 0) {
      tournamentsContainer.innerHTML = '<div class="info-message">No tournaments found for this user.</div>';
      return;}

    // Group tournaments by status
    const organizedTournaments = {
      created: tournaments.filter(t => t.organizer.userId === userId),
      registered: tournaments.filter(t =>
        t.organizer.userId !== userId &&
        t.participants.some(p => p.userId === userId)
      )
    };

    // Calculate pagination for each group
    const totalCreated = organizedTournaments.created.length;
    const totalRegistered = organizedTournaments.registered.length;
    const totalPages = Math.ceil(Math.max(totalCreated, totalRegistered) / TOURNAMENTS_PER_PAGE);
    const startIndex = (page - 1) * TOURNAMENTS_PER_PAGE;
    const endIndex = startIndex + TOURNAMENTS_PER_PAGE;

    // Get current page items for each group
    const currentPageCreated = organizedTournaments.created.slice(startIndex, endIndex);
    const currentPageRegistered = organizedTournaments.registered.slice(startIndex, endIndex);

    // Create tournaments section
    let html = '';

    // Tournaments created by user
    if (currentPageCreated.length > 0) {
      html += '<div class="tournaments-section"><h3>Tournaments Organized</h3>';

      currentPageCreated.forEach(tournament => {
        html += createTournamentCard(tournament, true);
      });

      html += '</div>';
    }

    // Tournaments user is registered for
    if (currentPageRegistered.length > 0) {
      html += '<div class="tournaments-section"><h3>Tournaments Registered</h3>';

      currentPageRegistered.forEach(tournament => {
        html += createTournamentCard(tournament, false);
      });

      html += '</div>';
    }

    tournamentsContainer.innerHTML = html;

    // Add pagination controls if there are multiple pages
    if (totalPages > 1) {
      const paginationContainer = document.createElement('div');
      paginationContainer.className = 'pagination-controls';

      // Previous button
      const prevButton = document.createElement('button');
      prevButton.className = 'pagination-btn';
      prevButton.innerHTML = '&laquo; Previous';
      prevButton.disabled = page === 1;
      prevButton.onclick = () => loadUserTournaments(userId, page - 1);
      paginationContainer.appendChild(prevButton);

      // Page numbers
      for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `pagination-btn ${i === page ? 'active' : ''}`;
        pageButton.textContent = i;
        pageButton.onclick = () => loadUserTournaments(userId, i);
        paginationContainer.appendChild(pageButton);
      }

      // Next button
      const nextButton = document.createElement('button');
      nextButton.className = 'pagination-btn';
      nextButton.innerHTML = 'Next &raquo;';
      nextButton.disabled = page === totalPages;
      nextButton.onclick = () => loadUserTournaments(userId, page + 1);
      paginationContainer.appendChild(nextButton);

      tournamentsContainer.appendChild(paginationContainer);
    }

    // Add event listeners to buttons
    document.querySelectorAll('.btn-manage-tournament').forEach(btn => {
      btn.addEventListener('click', () => {
        const tournamentId = btn.dataset.tournamentId;
        window.location.href = `/views/tournament-manage.html?id=${tournamentId}`;
      });
    });

    document.querySelectorAll('.btn-view-tournament').forEach(btn => {
      btn.addEventListener('click', () => {
        const tournamentId = btn.dataset.tournamentId;
        window.location.href = `/views/tournament.html?id=${tournamentId}`;
      });
    });

    document.querySelectorAll('.btn-delete-tournament').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tournamentId = btn.dataset.tournamentId;
        await deleteTournament(tournamentId);
      });
    });
  } catch (error) {
    logger.error('Error loading tournaments:', error);
    tournamentsContainer.innerHTML = '<div class="error">Failed to load tournaments.</div>';
  }
}

/**
 * Create a tournament card element
 * @param {Object} tournament - Tournament data
 * @param {boolean} isOrganizer - Whether the user is the organizer
 * @returns {string} - Tournament card HTML
 */
function createTournamentCard(tournament, isOrganizer) {
  // Format date
  const startDate = new Date(tournament.startDate).toLocaleDateString();let statusText, statusClass;

  if (tournament.status === 'registration') {
    statusText = 'Registration Open';
    statusClass = 'status-registration';
  } else if (tournament.status === 'in_progress') {
    statusText = 'In Progress';
    statusClass = 'status-in-progress';
  } else if (tournament.status === 'completed') {
    statusText = 'Completed';
    statusClass = 'status-completed';
  } else {
    statusText = 'Unknown';
    statusClass = '';
  }

  // Check if we're viewing our own profile or someone else's
  const isCurrentUser = window.currentUser && window.currentUser.id === getUserIdFromUrl();

  // Only show management buttons if it's the current user's profile
  let actions;
  if (isCurrentUser) {
    actions = isOrganizer
      ? `<div class="tournament-actions">
           <button class="btn btn-manage-tournament" data-tournament-id="${tournament._id}">Manage</button>
           <button class="btn btn-delete-tournament" data-tournament-id="${tournament._id}">Delete</button>
         </div>`
      : `<div class="tournament-actions">
           <button class="btn btn-view-tournament" data-tournament-id="${tournament._id}">View</button>
         </div>`;
  } else {
    // For other users' profiles, only show view button
    actions = `<div class="tournament-actions">
      <button class="btn btn-view-tournament" data-tournament-id="${tournament._id}">View</button>
    </div>`;
  }

  return `
    <div class="tournament-card ${statusClass}">
      <div class="tournament-info">
        <h4 class="tournament-name">${tournament.name}</h4>
        <div class="tournament-meta">
          <span class="tournament-date">Starts: ${startDate}</span>
          <span class="tournament-status">${statusText}</span>
          <span class="tournament-participants">${tournament.participants.length} participants</span>
        </div>
        <div class="tournament-description">${tournament.description || 'No description provided.'}</div>
      </div>
      ${actions}
    </div>
  `;}

/**
 * Delete a tournament
 * @param {string} tournamentId - Tournament ID
 */
async function deleteTournament(tournamentId) {
  if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
    return;}

  try {
    const response = await fetch(`/api/tournaments/${tournamentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete tournament');
    }

    // Reload tournaments
    await loadUserTournaments(getUserIdFromUrl());

    alert('Tournament deleted successfully');
  } catch (error) {
    logger.error('Error deleting tournament:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Get user ID from URL
 * @returns {string} - User ID
 */
function getUserIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);return urlParams.get('id');}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  const profileUsername = document.getElementById('profile-username');
  profileUsername.textContent = 'Error';

  const profileSections = document.querySelector('.profile-sections');
  profileSections.innerHTML = `<div class="error-message">${message}</div>`;
}

/**
 * Update achievements UI with data
 * @param {Object} data - Achievements data
 */
function updateAchievementsUI(data) {
  // Update summary
  document.getElementById('total-achievements').textContent = data.total || 0;
  document.getElementById('completed-achievements').textContent = data.completed || 0;
  document.getElementById('total-points').textContent = data.points || 0;
  document.getElementById('completion-percentage').textContent = `${data.percentage || 0}%`;

  // Get the grid
  const grid = document.getElementById('achievements-grid');
  const emptyState = document.getElementById('achievements-empty');

  // Clear loading indicator
  grid.innerHTML = '';

  // Check if there are achievements
  if (!data.achievements || data.achievements.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
    return;}

  // Show grid, hide empty state
  grid.style.display = 'grid';
  emptyState.style.display = 'none';

  // Render achievements
  data.achievements.forEach(achievement => {
    const achievementCard = createAchievementCard(achievement);
    grid.appendChild(achievementCard);
  });
}

/**
 * Create an achievement card element
 * @param {Object} achievement - Achievement data
 * @returns {HTMLElement} - Achievement card element
 */
function createAchievementCard(achievement) {
  const card = document.createElement('div');card.className = `achievement-card ${achievement.completed ? 'completed' : 'locked'}`;
  card.dataset.category = achievement.category || 'all';

  // Create the card content
  card.innerHTML = `
    <div class="achievement-icon">
      <i class="${achievement.icon || 'fas fa-trophy'}"></i>
    </div>
    <div class="achievement-info">
      <h3 class="achievement-title">${achievement.name}</h3>
      <p class="achievement-description">${achievement.description}</p>
      <div class="achievement-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${achievement.progress || 0}%"></div>
        </div>
        <span class="progress-text">${achievement.progress || 0}%</span>
      </div>
    </div>
              <div class="achievement-rewards">${achievement.rewards?.experience || 0} exp, ${achievement.rewards?.arenaGold || 0} gold</div>
  `;

  return card;}

/**
 * Set up achievement category filters
 */
function setupAchievementCategories() {
  const categoryButtons = document.querySelectorAll('.achievement-category');
  const achievementCards = document.querySelectorAll('.achievement-card');

  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      categoryButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Get selected category
      const category = button.dataset.category;

      // Filter achievements
      achievementCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Set up refresh button
  const refreshButton = document.getElementById('refresh-achievements');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      const userId = getUserIdFromUrl();
      if (userId) {
        loadAndShowAchievements(userId);
      }
    });
  }
}

/**
 * Set up activity tabs
 * @param {string} userId - User ID
 */
function setupActivityTabs(userId) {
  const tabs = document.querySelectorAll('.activity-tab');
  const contents = document.querySelectorAll('.activity-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Show corresponding content
      const tabName = tab.dataset.tab;
      const content = document.getElementById(`${tabName}-tab`);
      if (content) {
        content.classList.add('active');

        // Load forum activity if forum tab is clicked
        if (tabName === 'forum') {
          loadForumActivity(userId);
        }
      }
    });
  });
}

// Add pagination state
let currentForumPage = 1;
const ITEMS_PER_PAGE = 3;

/**
 * Load forum activity for the user
 * @param {string} userId - User ID
 * @param {number} page - Page number
 */
async function loadForumActivity(userId, page = 1) {
  const forumContainer = document.getElementById('forum-activity-container');
  

  try {
    // Show loading state
    forumContainer.innerHTML = '<div class="loading">Loading forum activity...</div>';

    // Fetch forum activity from API
    const response = await fetch(`/api/forum/user/${userId}/activity`, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to fetch forum activity');
    }

    const data = await response.json();
    const { topics, posts } = data;

    // Clear loading message
    forumContainer.innerHTML = '';

    if (topics.length === 0 && posts.length === 0) {
      forumContainer.innerHTML = '<div class="info-message">No forum activity found for this user.</div>';
      return;}

    // Combine and sort all activities by date
    const allActivities = [
      ...topics.map(topic => ({
        type: 'topic',
        title: topic.title,
        createdAt: topic.createdAt,
        topicId: topic._id
      })),
      ...posts.map(post => ({
        type: 'post',
        title: post.topic.title,
        createdAt: post.createdAt,
        topicId: post.topic._id
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate pagination
    const totalItems = allActivities.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPageItems = allActivities.slice(startIndex, endIndex);

    // Create a container for the current page items
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'forum-activity-items';

    // Create activity items for current page
    currentPageItems.forEach(activity => {
      const activityItem = createForumActivityItem(activity);
      itemsContainer.appendChild(activityItem);
    });

    // Clear the container and append the new items
    forumContainer.innerHTML = '';
    forumContainer.appendChild(itemsContainer);

    // Add pagination controls if there are multiple pages
    if (totalPages > 1) {
      const paginationContainer = document.createElement('div');
      paginationContainer.className = 'pagination-controls';

      // Previous button
      const prevButton = document.createElement('button');
      prevButton.className = 'pagination-btn';
      prevButton.innerHTML = '&laquo; Previous';
      prevButton.disabled = page === 1;
      prevButton.onclick = () => loadForumActivity(userId, page - 1);
      paginationContainer.appendChild(prevButton);

      // Page numbers
      for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `pagination-btn ${i === page ? 'active' : ''}`;
        pageButton.textContent = i;
        pageButton.onclick = () => loadForumActivity(userId, i);
        paginationContainer.appendChild(pageButton);
      }

      // Next button
      const nextButton = document.createElement('button');
      nextButton.className = 'pagination-btn';
      nextButton.innerHTML = 'Next &raquo;';
      nextButton.disabled = page === totalPages;
      nextButton.onclick = () => loadForumActivity(userId, page + 1);
      paginationContainer.appendChild(nextButton);

      forumContainer.appendChild(paginationContainer);
    }
  } catch (error) {
    logger.error('Error loading forum activity:', error);
    forumContainer.innerHTML = '<div class="error">Failed to load forum activity. Please try again later.</div>';
  }
}

/**
 * Create forum activity item
 * @param {Object} item - Activity item data
 * @returns {HTMLElement} - Activity item element
 */
function createForumActivityItem(item) {
  const activityItem = document.createElement('div');activityItem.className = 'forum-activity-item';

  const date = new Date(item.createdAt).toLocaleDateString();

  let actionText = '';
  if (item.type === 'topic') {
    actionText = 'Created topic';
  } else if (item.type === 'post') {
    actionText = 'Replied to topic';
  }

  activityItem.innerHTML = `
    <div class="activity-info">
      <div class="activity-action">${actionText}</div>
      <div class="activity-title">${item.title}</div>
      <div class="activity-date">${date}</div>
    </div>
    <a href="/views/stone-tablet.html?topic=${item.topicId}" class="btn btn-view">View</a>
  `;

  return activityItem;}

// Add pagination state for maps
let currentMapsPage = 1;
const MAPS_PER_PAGE = 6;

/**
 * Load user's maps
 * @param {string} userId - User ID
 * @param {number} page - Page number
 */
async function loadUserMaps(userId, page = 1) {
  try {
            const response = await fetch(`/api/wc2maps?uploadedBy=${userId}&limit=1000`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load maps');
    }

    const data = await response.json();
    
    // Handle different response formats
    let maps = [];
    if (data.success && data.data) {
      maps = data.data;
    } else if (data.maps) {
      maps = data.maps;
    } else if (Array.isArray(data)) {
      maps = data;
    }
    const mapsContainer = document.getElementById('user-maps-container');

    if (!mapsContainer) {
      logger.error('Maps container not found');
      return;}

    if (!maps || maps.length === 0) {
      mapsContainer.innerHTML = '<p class="no-maps">No maps uploaded yet.</p>';
      return;}

    // Calculate pagination
    const totalItems = maps.length;
    const totalPages = Math.ceil(totalItems / MAPS_PER_PAGE);
    const startIndex = (page - 1) * MAPS_PER_PAGE;
    const endIndex = startIndex + MAPS_PER_PAGE;
    const currentPageMaps = maps.slice(startIndex, endIndex);

    // Create the grid container if it doesn't exist
    let mapsGrid = mapsContainer.querySelector('.user-maps-grid');
    if (!mapsGrid) {
      mapsGrid = document.createElement('div');
      mapsGrid.className = 'user-maps-grid';
      mapsContainer.appendChild(mapsGrid);
    }

    // Clear existing content
    mapsGrid.innerHTML = '';

    // Add maps for current page
    currentPageMaps.forEach(map => {
      const mapCard = document.createElement('div');
      mapCard.className = 'user-map-card';
      mapCard.innerHTML = `
        <img src="${map.thumbnailPath || '/uploads/thumbnails/default-map.png'}" alt="${map.name}" class="user-map-thumbnail">
        <div class="user-map-info">
          <h3 class="user-map-name">${map.name}</h3>
          <div class="user-map-stats">
            <span><i class="fas fa-star"></i> ${map.averageRating?.toFixed(1) || '0.0'}</span>
            <span><i class="fas fa-download"></i> ${map.downloadCount || 0}</span>
            <span><i class="fas fa-gamepad"></i> ${map.playCount || 0}</span>
          </div>
          <div class="user-map-actions">
            <a href="/views/atlas.html?id=${map._id}" class="btn btn-primary">
              <i class="fas fa-external-link-alt"></i> View Map
            </a>
          </div>
        </div>
      `;
      mapsGrid.appendChild(mapCard);
    });

    // Add pagination controls if there are multiple pages
    let paginationContainer = mapsContainer.querySelector('.user-maps-pagination');
    if (!paginationContainer) {
      paginationContainer = document.createElement('div');
      paginationContainer.className = 'user-maps-pagination';
      mapsContainer.appendChild(paginationContainer);
    }

    if (totalPages > 1) {
      paginationContainer.innerHTML = `
        <div class="pagination-controls">
          <button class="pagination-btn" ${page === 1 ? 'disabled' : ''} onclick="loadUserMaps('${userId}', ${page - 1})">
            &laquo; Previous
          </button>
          ${Array.from({ length: totalPages }, (_, i) => i + 1).map(num => `
            <button class="pagination-btn ${num === page ? 'active' : ''}" onclick="loadUserMaps('${userId}', ${num})">
              ${num}
            </button>
          `).join('')}
          <button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} onclick="loadUserMaps('${userId}', ${page + 1})">
            Next &raquo;
          </button>
        </div>
      `;
    } else {
      paginationContainer.innerHTML = '';
    }

  } catch (error) {
    logger.error('Error loading maps:', error);
    const mapsContainer = document.getElementById('user-maps-container');
    if (mapsContainer) {
      mapsContainer.innerHTML = '<p class="error">Error loading maps</p>';
    }
  }
}
