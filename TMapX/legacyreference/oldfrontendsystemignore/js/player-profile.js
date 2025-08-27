/**
 * Player Profile Page JavaScript
 *
 * Handles public player profile functionality including:
 * - Loading player information
 * - Displaying player stats
 * - Showing match history
 * - Loading forum activity
 * - Loading tournament activity
 * - Loading map contributions
 * - Loading achievements
 */

// Import centralized logger utility
import logger from '/js/utils/logger.js';

// Global variables
let charts = {}; // Store chart instances for cleanup

document.addEventListener('DOMContentLoaded', () => {
  // DOMContentLoaded event fired in player-profile.js
  // Initialize the player profile page
  initPlayerProfilePage();
});

/**
 * Initialize the player profile page
 */
async function initPlayerProfilePage() {
  // initPlayerProfilePage function called

  // Get player name from URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  // Player ID from URL

  if (!userId) {
    logger.error('No player ID specified in URL');
    showError('No player ID specified');
    return;}

  try {
    // Show loading state
    document.getElementById('profile-username').textContent = 'Loading profile...';

    // Load player data
    // Calling loadPlayerProfile with ID
    await loadPlayerProfile(userId);

    // Set up match type filter buttons
    setupMatchTypeFilters();

    // Set up stats tabs
    setupStatsTabs();

    // Set up activity tabs
    setupActivityTabs();

    // Load achievements if available
    if (window.AchievementsManager) {
      loadPlayerAchievements(userId);
    }
  } catch (error) {
    logger.error('Error in initPlayerProfilePage', error);
    showError('Failed to initialize player profile page');
  }
}

/**
 * Load player profile data
 * @param {string} userId - Player ID
 */
async function loadPlayerProfile(userId) {
  try {
    // Loading player profile for userId

    // Fetch player data from API
    const response = await fetch(`/api/users/${userId}`);
    // API response status

    if (!response.ok) {
      throw new Error('Failed to fetch player data');
    }

    const userData = await response.json();
    // Player data received

    if (!userData || !userData.player) {
      logger.error('Invalid player data received', userData);
      throw new Error('Invalid player data received from API');
    }

    const { player } = userData;

    // Store player data globally for later use
    window.currentPlayer = player;

    // Update profile elements
    document.getElementById('profile-username').textContent = player.name;
    document.getElementById('profile-email').textContent = `MMR: ${player.mmr}`;

    // Set avatar to rank image
    const avatarContainer = document.getElementById('profile-avatar');
    avatarContainer.innerHTML = `
      <img src="/assets/img/ranks/${player.rank.image}" alt="${player.rank.name}" title="Rank: ${player.rank.name}">
    `;

    // Try to get user data if player is claimed
    if (player.user) {
      try {
        const userResponse = await fetch(`/api/user/${player.user}`, { credentials: 'include' });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          window.profileUser = userData; // Store user data globally

          // Update bio and social links
          updateBioAndSocialLinks(userData);

          // Load player names associated with this user
          await loadPlayerNames(player.user);

          // Load forum activity
          await loadForumActivity(player.user);

          // Load tournament activity
          await loadUserTournaments(player.user);

          // Load map contributions
          await loadUserMaps(player.user);
        }
      } catch (userError) {
        logger.error('Error loading user data', userError);
      }
    } else {
      // If player is not claimed, show appropriate messages
      document.getElementById('player-names-container').innerHTML =
        '<div class="info-message">This player has not been claimed by a user account.</div>';

      document.getElementById('forum-activity-container').innerHTML =
        '<div class="info-message">Forum activity is only available for claimed players.</div>';

      document.getElementById('tournaments-container').innerHTML =
        '<div class="info-message">Tournament activity is only available for claimed players.</div>';

      document.getElementById('user-maps-container').innerHTML =
        '<div class="info-message">Map contributions are only available for claimed players.</div>';
    }

    // Load player stats
    await loadPlayerStats(player._id);

    // Load recent matches with pagination (page 1)
    await loadMatchHistory('all', 1);
  } catch (error) {
    logger.error('Error loading player profile', error);
    showError('Failed to load player profile');
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
    } else {
      youtubeUrl.textContent = 'Not set';
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
    } else {
      twitchUrl.textContent = 'Not set';
    }
  }
}

/**
 * Load player stats
 * @param {string} playerId - Player ID
 */
async function loadPlayerStats(playerId) {
  const statsContainer = document.getElementById('player-profile-stats-content');
  if (!statsContainer) {
    logger.error('Stats container not found with ID: player-profile-stats-content');
    return;}

  try {
    // Fetching stats for player ID
    // Fetch player stats from API
    const response = await fetch(`/api/ladder/player/${playerId}/stats`, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to fetch player stats');
    }

    const data = await response.json();
    const { stats } = data;

    // Store stats globally for tab switching
    window.playerStats = stats;

    // Clear loading message
    statsContainer.innerHTML = '';

    // Create content containers for each tab
    const overviewContent = document.createElement('div');
    overviewContent.className = 'stats-content active';
    overviewContent.id = 'overview-content';

    const racesContent = document.createElement('div');
    racesContent.className = 'stats-content';
    racesContent.id = 'races-content';

    const mapsContent = document.createElement('div');
    mapsContent.className = 'stats-content';
    mapsContent.id = 'maps-content';

    const resourcesContent = document.createElement('div');
    resourcesContent.className = 'stats-content';
    resourcesContent.id = 'resources-content';

    // Create overview content
    createOverviewContent(overviewContent, stats);

    // Create races content
    createRacesContent(racesContent, stats);

    // Create maps content
    createMapsContent(mapsContent, stats);

    // Create resources content
    createResourcesContent(resourcesContent, stats);

    // Add all content containers to the stats container
    statsContainer.appendChild(overviewContent);
    statsContainer.appendChild(racesContent);
    statsContainer.appendChild(mapsContent);
    statsContainer.appendChild(resourcesContent);
  } catch (error) {
    logger.error('Error loading player stats', error);
    statsContainer.innerHTML = '<div class="error">Failed to load player stats</div>';
  }
}

/**
 * Create overview content
 * @param {HTMLElement} container - Container element
 * @param {Object} stats - Player stats
 */
function createOverviewContent(container, stats) {
  // Create stats overview
  const statsOverview = document.createElement('div');
  statsOverview.className = 'stats-overview';
  statsOverview.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${stats.totalMatches}</div>
      <div class="stat-label">Total Matches</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.wins}</div>
      <div class="stat-label">Wins</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.losses}</div>
      <div class="stat-label">Losses</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.winRate.toFixed(1)}%</div>
      <div class="stat-label">Win Rate</div>
    </div>
  `;

  // Add win/loss chart if Chart.js is available
  if (typeof Chart !== 'undefined' && stats.totalMatches > 0) {
    // Chart.js is available, creating win/loss chart
    const chartContainer = document.createElement('div');
    chartContainer.className = 'stats-chart-container';

    const canvas = document.createElement('canvas');
    canvas.id = 'winLossChart';
    chartContainer.appendChild(canvas);

    statsOverview.appendChild(chartContainer);

    // Create the chart after the DOM is updated
    setTimeout(() => {
      createWinLossChart(canvas, stats);
    }, 0);
  } else {
    logger.warn('Chart.js not available or no matches to display');
  }

  // Create game types section
  const gameTypesSection = document.createElement('div');
  gameTypesSection.className = 'stats-section';

  let gameTypesHtml = '<h3>Game Types</h3><div class="game-types-stats">';
  for (const [type, typeStats] of Object.entries(stats.matchTypes)) {
    if (typeStats.matches > 0) {
      gameTypesHtml += `
        <div class="game-type-card">
          <h4>${type}</h4>
          <div class="game-type-stats">
            <div class="stat-row">
              <span class="stat-label">Matches:</span>
              <span class="stat-value">${typeStats.matches}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Wins:</span>
              <span class="stat-value">${typeStats.wins}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Losses:</span>
              <span class="stat-value">${typeStats.losses}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Win Rate:</span>
              <span class="stat-value">${typeStats.winRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      `;
    }
  }
  gameTypesHtml += '</div>';
  gameTypesSection.innerHTML = gameTypesHtml;

  // Create match history section
  const matchHistorySection = document.createElement('div');
  matchHistorySection.className = 'match-history-section';
  matchHistorySection.innerHTML = `
    <h3>Match History</h3>
    <div class="match-type-filters">
      <button class="filter-btn active" data-match-type="all">All</button>
      <button class="filter-btn" data-match-type="1v1">1v1</button>
      <button class="filter-btn" data-match-type="2v2">2v2</button>
      <button class="filter-btn" data-match-type="ffa">FFA</button>
    </div>
    <div id="recent-matches-container"></div>
    <div id="match-history-pagination" class="match-history-pagination"></div>
  `;
  
  container.appendChild(statsOverview);
  container.appendChild(gameTypesSection);
  container.appendChild(matchHistorySection);
  
  // Set up match type filters
  setupMatchTypeFilters();
  
  // Load initial match history
  loadMatchHistory('all', 1);

  // Create allies and enemies section
  const alliesEnemiesSection = document.createElement('div');
  alliesEnemiesSection.className = 'allies-enemies-section';
  alliesEnemiesSection.innerHTML = `
    <h3>Top Allies & Enemies</h3>
    <div id="allies-enemies-container"></div>
  `;
  
  container.appendChild(alliesEnemiesSection);
  
  // Load allies and enemies data
  loadAlliesAndEnemies(window.currentPlayer.name);
}

/**
 * Create races content
 * @param {HTMLElement} container - Container element
 * @param {Object} stats - Player stats
 */
function createRacesContent(container, stats) {
  if (!stats.races || !Object.values(stats.races).some(count => count > 0)) {
    container.innerHTML = '<div class="info-message">No race statistics available.</div>';
    return;}

  const racesSection = document.createElement('div');
  racesSection.className = 'stats-section';
  racesSection.innerHTML = '<h3>Race Statistics</h3>';

  // Create condensed race stats table
  const racesTable = document.createElement('table');
  racesTable.className = 'races-table';

  // Table header
  racesTable.innerHTML = `
    <thead>
      <tr>
        <th>Race</th>
        <th>Games</th>
        <th>Wins</th>
        <th>Win Rate</th>
        <th>%</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tableBody = racesTable.querySelector('tbody');

  const raceLabels = {
    human: 'Human',
    orc: 'Orc',
    random: 'Random'
  };

  // Initialize race wins if not present
  if (!stats.raceWins) {
    stats.raceWins = { human: 0, orc: 0, random: 0 };
  }

  // Calculate race win percentages
  stats.raceWinPercentages = {};
  for (const race in stats.races) {
    const raceCount = stats.races[race] || 0;
    const raceWins = stats.raceWins[race] || 0;
    stats.raceWinPercentages[race] = raceCount > 0 ? (raceWins / raceCount) * 100 : 0;
  }

  // Sort races by play count (descending)
  const sortedRaces = Object.entries(stats.races)
    .filter(([_, count]) => count > 0)
    .sort(([_, countA], [__, countB]) => countB - countA);

  for (const [race, count] of sortedRaces) {
    const percentage = stats.racePercentages[race].toFixed(1);
    const wins = stats.raceWins[race] || 0;
    const winPercentage = stats.raceWinPercentages[race] ? stats.raceWinPercentages[race].toFixed(1) : '0.0';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${raceLabels[race] || race}</strong></td>
      <td>${count}</td>
      <td>${wins}</td>
      <td>${winPercentage}%</td>
      <td>
        <div class="mini-bar-container">
          <div class="mini-bar" style="width: ${percentage}%"></div>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  }

  racesSection.appendChild(racesTable);
  container.appendChild(racesSection);
}

/**
 * Create maps content
 * @param {HTMLElement} container - Container element
 * @param {Object} stats - Player stats
 */
function createMapsContent(container, stats) {
      // Creating maps content with stats

  // Create maps section with interactive header
  const mapsSection = document.createElement('div');
  mapsSection.className = 'stats-section';
  mapsSection.innerHTML = '<h3>Map Statistics <span class="stats-count">(Maps played)</span></h3>';

  // Create map-resource combinations section
  const mapResourceSection = document.createElement('div');
  mapResourceSection.className = 'stats-section';
  mapResourceSection.innerHTML = '<h3>Map & Resource Combinations <span class="stats-count">(Best performance)</span></h3>';

  // Display map statistics in a tabular format for better readability
  const mapsTable = document.createElement('table');
  mapsTable.className = 'stats-table maps-table';
  mapsTable.innerHTML = `
    <thead>
      <tr>
        <th>Map</th>
        <th>Games</th>
        <th>Wins</th>
        <th>Win Rate</th>
        <th>Performance</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const mapsTableBody = mapsTable.querySelector('tbody');

  // Display map statistics
  if (stats.topMaps && stats.topMaps.length > 0) {
    // Sort maps by count for consistency
    const sortedMaps = [...stats.topMaps].sort((a, b) => b.count - a.count);

    sortedMaps.forEach(map => {
      const wins = map.wins || stats.mapWins?.[map.name] || 0;
      const winRateValue = map.winRate.toFixed(1);
      const performanceClass = winRateValue > 60 ? 'high-performance' :
                               winRateValue < 40 ? 'low-performance' : 'normal-performance';

      // Calculate global popularity if available
      let popularityHtml = '';
      if (map.totalPlayCount) {
        const playerPercentage = ((map.count / map.totalPlayCount) * 100).toFixed(1);
        popularityHtml = `
          <div class="map-popularity" title="This map has been played ${map.totalPlayCount} times globally">
            <small>You've played ${playerPercentage}% of all games on this map</small>
          </div>
        `;
      }

      // Format race stats if available
      let raceStatsHtml = '';
      if (map.raceStats) {
        const humanWinRate = map.raceStats.human.wins + map.raceStats.human.losses > 0
          ? ((map.raceStats.human.wins / (map.raceStats.human.wins + map.raceStats.human.losses)) * 100).toFixed(1)
          : 0;
        const orcWinRate = map.raceStats.orc.wins + map.raceStats.orc.losses > 0
          ? ((map.raceStats.orc.wins / (map.raceStats.orc.wins + map.raceStats.orc.losses)) * 100).toFixed(1)
          : 0;

        raceStatsHtml = `
          <div class="map-race-stats">
            <small>Human win rate: ${humanWinRate}% | Orc win rate: ${orcWinRate}%</small>
          </div>
        `;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <strong>${map.name}</strong>
          ${popularityHtml}
          ${raceStatsHtml}
        </td>
        <td>${map.count}</td>
        <td>${wins}</td>
        <td>${winRateValue}%</td>
        <td>
          <div class="performance-indicator ${performanceClass}">
            <div class="performance-bar" style="width: ${map.winRate}%"></div>
          </div>
        </td>
      `;
      mapsTableBody.appendChild(row);
    });
  } else {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="no-data">No map data available</td>';
    mapsTableBody.appendChild(row);
  }

  // Display map-resource combinations in a better visual format
  const mapResourceTable = document.createElement('table');
  mapResourceTable.className = 'stats-table map-resource-table';
  mapResourceTable.innerHTML = `
    <thead>
      <tr>
        <th>Map</th>
        <th>Resource</th>
        <th>Games</th>
        <th>Win Rate</th>
        <th>Performance</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const mapResourceTableBody = mapResourceTable.querySelector('tbody');

  // Display map-resource combinations
  if (stats.mapResources && Object.keys(stats.mapResources).length > 0) {
    // Convert map-resource data to array for sorting
    const mapResourceEntries = Object.entries(stats.mapResources)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => {
        const [map, resource] = key.split('|');
        const wins = stats.mapResourceWins?.[key] || 0;
        const winRate = count > 0 ? (wins / count) * 100 : 0;
        return { map, resource, count, wins, winRate };})
      // Sort by win rate descending to show best performance first
      .sort((a, b) => b.winRate - a.winRate);

    // Show top 10 combinations for performance
    const topCombinations = mapResourceEntries.slice(0, 10);

    // Format resource level names
    const resourceLabels = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };

    topCombinations.forEach(item => {
      const winRateValue = item.winRate.toFixed(1);
      const performanceClass = winRateValue > 60 ? 'high-performance' :
                               winRateValue < 40 ? 'low-performance' : 'normal-performance';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${item.map}</strong></td>
        <td>${resourceLabels[item.resource] || item.resource}</td>
        <td>${item.count}</td>
        <td>${winRateValue}%</td>
        <td>
          <div class="performance-indicator ${performanceClass}">
            <div class="performance-bar" style="width: ${item.winRate}%"></div>
          </div>
        </td>
      `;
      mapResourceTableBody.appendChild(row);
    });
  } else {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="no-data">No map & resource data available</td>';
    mapResourceTableBody.appendChild(row);
  }

  mapsSection.appendChild(mapsTable);
  mapResourceSection.appendChild(mapResourceTable);
  container.appendChild(mapsSection);
  container.appendChild(mapResourceSection);
}

/**
 * Create resources content
 * @param {HTMLElement} container - Container element
 * @param {Object} stats - Player stats
 */
function createResourcesContent(container, stats) {
  if (!stats.resources || Object.keys(stats.resources).length === 0) {
    container.innerHTML = '<div class="info-message">No resource statistics available.</div>';
    return;}

  const resourcesSection = document.createElement('div');
  resourcesSection.className = 'stats-section';
  resourcesSection.innerHTML = '<h3>Resource Level Statistics <span class="stats-count">(Performance by resource)</span></h3>';

  // Create resource stats table
  const resourcesTable = document.createElement('table');
  resourcesTable.className = 'stats-table resources-table';
  resourcesTable.innerHTML = `
    <thead>
      <tr>
        <th>Resource Level</th>
        <th>Games</th>
        <th>Wins</th>
        <th>Win Rate</th>
        <th>Performance</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const resourcesTableBody = resourcesTable.querySelector('tbody');

  // Convert resources object to array and sort by count
  let resourceItems = [];

  // Handle different resource data formats
  if (Array.isArray(stats.resources)) {
    resourceItems = stats.resources;
  } else if (typeof stats.resources === 'object') {
    resourceItems = Object.entries(stats.resources)
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);
  }

  if (resourceItems.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="no-data">No resource statistics available</td>';
    resourcesTableBody.appendChild(row);
    resourcesSection.appendChild(resourcesTable);
    container.appendChild(resourcesSection);
    return;}

  // Format resource level names
  const resourceNames = {
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low'
  };

  resourceItems.forEach(resource => {
    // Calculate win rate if available
    let winRate = 0;
    let wins = 0;
    if (stats.resourceWins && stats.resourceWins[resource.level]) {
      wins = stats.resourceWins[resource.level];
      winRate = (wins / resource.count) * 100;
    }

    const winRateValue = winRate.toFixed(1);
    const performanceClass = winRateValue > 60 ? 'high-performance' :
                             winRateValue < 40 ? 'low-performance' : 'normal-performance';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${resourceNames[resource.level] || resource.level}</strong></td>
      <td>${resource.count}</td>
      <td>${wins}</td>
      <td>${winRateValue}%</td>
      <td>
        <div class="performance-indicator ${performanceClass}">
          <div class="performance-bar" style="width: ${winRate}%"></div>
        </div>
      </td>
    `;
    resourcesTableBody.appendChild(row);
  });

  resourcesSection.appendChild(resourcesTable);
  container.appendChild(resourcesSection);
}

/**
 * Set up stats tabs
 */
function setupStatsTabs() {
  const statsTabs = document.querySelectorAll('.stats-tab');
  const statsContents = document.querySelectorAll('.stats-content');

  statsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      statsTabs.forEach(t => t.classList.remove('active'));
      statsContents.forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Show corresponding content
      const tabName = tab.dataset.tab;
      document.getElementById(`${tabName}-content`).classList.add('active');
    });
  });
}

/**
 * Load match history with pagination
 * @param {string} matchType - Match type to filter by
 * @param {number} page - Page number
 */
async function loadMatchHistory(matchType = 'all', page = 1) {
  const matchesContainer = document.getElementById('recent-matches-container');
  const paginationContainer = document.getElementById('match-history-pagination');

  try {
    // Show loading state
    matchesContainer.innerHTML = '<div class="loading">Loading match history...</div>';

    // Fetch matches from API with pagination
    const response = await fetch(`/api/matches/player/${currentPlayerId}?matchType=${matchType}&page=${page}&limit=5`);

    if (!response.ok) {
      throw new Error('Failed to fetch match history');
    }

    const data = await response.json();
    const { matches, pagination } = data;

    // Clear loading message
    matchesContainer.innerHTML = '';

    // Create and append match cards
    if (matches.length === 0) {
      matchesContainer.innerHTML = '<div class="no-matches">No matches found for this match type.</div>';
      return;}

    // Create match cards
    matches.forEach(match => {
      const matchCard = createMatchCard(match);
      matchesContainer.appendChild(matchCard);
    });

    // Update pagination controls
    updateMatchHistoryPagination(pagination, matchType);

  } catch (error) {
    logger.error('Error loading match history', error);
    matchesContainer.innerHTML = '<div class="error">Failed to load match history. Please try again later.</div>';
  }
}

function updateMatchHistoryPagination(pagination, matchType) {
  const paginationContainer = document.getElementById('match-history-pagination');
  if (!paginationContainer) return;const { currentPage, totalPages } = pagination;

  // Create pagination HTML
  let paginationHTML = `
    <div class="pagination-controls">
      <button class="btn btn-secondary" id="prev-match-page" ${currentPage <= 1 ? 'disabled' : ''}>
        Previous
      </button>
      <span class="page-info">Page ${currentPage} of ${totalPages}</span>
      <button class="btn btn-secondary" id="next-match-page" ${currentPage >= totalPages ? 'disabled' : ''}>
        Next
      </button>
    </div>
  `;

  paginationContainer.innerHTML = paginationHTML;

  // Add event listeners
  const prevButton = document.getElementById('prev-match-page');
  const nextButton = document.getElementById('next-match-page');

  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      loadMatchHistory(matchType, currentPage - 1);
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      loadMatchHistory(matchType, currentPage + 1);
    }
  });
}

/**
 * Set up match type filter buttons
 */
function setupMatchTypeFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');

  filterButtons.forEach(button => {
    button.addEventListener('click', async () => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Get match type from data attribute
      const matchType = button.getAttribute('data-match-type');

      // Load match history for selected match type
      await loadMatchHistory(matchType, 1);
    });
  });
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  document.getElementById('profile-username').textContent = 'Error';
  document.getElementById('profile-email').textContent = message;
  document.getElementById('bio-text').textContent = 'An error occurred loading this profile.';
  document.getElementById('player-profile-stats-content').innerHTML = '<div class="error">Failed to load player stats</div>';
  document.getElementById('recent-matches-container').innerHTML = '<div class="error">Failed to load recent matches</div>';
}

/**
 * View screenshots in a modal
 * @param {Array} screenshots - Array of screenshot objects with url property
 */
function viewScreenshots(screenshots) {
  // Create modal container if it doesn't exist
  let modal = document.getElementById('screenshot-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'screenshot-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  // Create modal content
  let modalContent = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <div class="screenshot-container">
  `;

  // Add screenshots
  screenshots.forEach((screenshot, index) => {
    modalContent += `
      <div class="screenshot-item" id="screenshot-${index}">
        <img src="${screenshot.url}" alt="Match Screenshot">
        <div class="screenshot-actions">
          <button class="btn btn-danger flag-screenshot" data-screenshot-url="${screenshot.url}" data-screenshot-id="${screenshot._id || ''}">
            <i class="fas fa-flag"></i> Flag Inappropriate Content
          </button>
        </div>
      </div>
    `;
  });

  modalContent += `
      </div>
    </div>
  `;

  // Set modal content
  modal.innerHTML = modalContent;

  // Show modal
  modal.style.display = 'block';

  // Add event listener to close button
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Add flag button event listeners
  const flagButtons = modal.querySelectorAll('.flag-screenshot');
  flagButtons.forEach(button => {
    button.addEventListener('click', () => {
      const screenshotUrl = button.dataset.screenshotUrl;
      const screenshotId = button.dataset.screenshotId;
      flagScreenshot(screenshotUrl, screenshotId);
    });
  });

  // Close modal when clicking outside of it
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Open dispute match modal
 * @param {string} matchId - Match ID
 */
async function openDisputeMatchModal(matchId) {
  try {
    // Create modal if it doesn't exist
    let modal = document.getElementById('dispute-match-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dispute-match-modal';
      modal.className = 'dispute-match-modal';
      document.body.appendChild(modal);
    }

    // Show loading state
    modal.innerHTML = `
      <div class="dispute-match-content">
        <div class="dispute-match-header">
          <h2 class="dispute-match-title">Dispute Match</h2>
          <span class="close-dispute-modal">&times;</span>
        </div>
        <div class="loading">Loading match details...</div>
      </div>
    `;
    modal.style.display = 'block';

    // Add event listener to close button
    const closeBtn = modal.querySelector('.close-dispute-modal');
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });

    // Fetch match details
    const response = await fetch(`/api/matches/${matchId}`, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to fetch match details');
    }

    const match = await response.json();
    // Match details for dispute

    // Create dispute form
    const modalContent = document.querySelector('.dispute-match-content');
    modalContent.innerHTML = `
      <div class="dispute-match-header">
        <h2 class="dispute-match-title">Dispute Match</h2>
        <span class="close-dispute-modal">&times;</span>
      </div>
      <form id="dispute-match-form" class="dispute-match-form">
        <input type="hidden" id="dispute-match-id" value="${match._id}">

        <div class="dispute-match-section">
          <h3 class="dispute-match-section-title">Match Details</h3>
          <div class="dispute-match-details">
            <div class="dispute-match-detail">
              <span class="dispute-match-label">Match Type:</span>
              <span class="dispute-match-value">${match.matchType}</span>
            </div>
            <div class="dispute-match-detail">
              <span class="dispute-match-label">Map:</span>
              <span class="dispute-match-value">${match.map.name}</span>
            </div>
            <div class="dispute-match-detail">
              <span class="dispute-match-label">Date:</span>
              <span class="dispute-match-value">${new Date(match.date).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="dispute-match-section">
          <h3 class="dispute-match-section-title">Players</h3>
          <div class="dispute-match-players">
            ${match.players.map(player => {
              const playerName = player.playerName || (player.playerId?.name || 'Unknown Player');
              return `
                <div class="dispute-player-item">
                  <span class="dispute-player-name">${playerName}</span>
                  <span class="dispute-player-race">${player.race}</span>
                </div>
              `;}).join('')}
          </div>
        </div>

        <div class="dispute-match-section">
          <h3 class="dispute-match-section-title">Dispute Reason</h3>
          <div class="dispute-match-field">
            <label class="dispute-match-label" for="dispute-reason">Reason for dispute:</label>
            <select class="dispute-match-select" id="dispute-reason" required>
              <option value="">Select a reason...</option>
              <option value="incorrect_outcome">Incorrect outcome</option>
              <option value="incorrect_player">Incorrect player</option>
              <option value="incorrect_race">Incorrect race</option>
              <option value="incorrect_map">Incorrect map</option>
              <option value="duplicate_match">Duplicate match</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="dispute-match-field">
            <label class="dispute-match-label" for="dispute-details">Additional details:</label>
            <textarea class="dispute-match-textarea" id="dispute-details" rows="4" placeholder="Please provide details about your dispute..." required></textarea>
          </div>

          <div class="dispute-match-field">
            <label class="dispute-match-label" for="dispute-player-name">Your player name in this match:</label>
            <input type="text" class="dispute-match-input" id="dispute-player-name" placeholder="Enter your player name" required>
          </div>

          <div class="dispute-match-field">
            <label class="dispute-match-label" for="dispute-evidence">Upload evidence (screenshots):</label>
            <input type="file" class="dispute-match-file" id="dispute-evidence" accept="image/png,image/jpeg" multiple>
            <div class="dispute-match-hint">You can upload up to 5 screenshots as evidence.</div>
          </div>
        </div>

        <div class="dispute-match-actions">
          <button type="button" class="btn-cancel-dispute">Cancel</button>
          <button type="submit" class="btn-submit-dispute">Submit Dispute</button>
        </div>
      </form>
    `;

    // Add event listener to close button
    const newCloseBtn = modalContent.querySelector('.close-dispute-modal');
    newCloseBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Add event listener to cancel button
    const cancelBtn = modalContent.querySelector('.btn-cancel-dispute');
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Add event listener to form submission
    const form = document.getElementById('dispute-match-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await submitDisputeForm(matchId);
    });
  } catch (error) {
    logger.error('Error opening dispute match modal', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Submit dispute form
 * @param {string} matchId - Match ID
 */
async function submitDisputeForm(matchId) {
  try {
    const reason = document.getElementById('dispute-reason').value;
    const details = document.getElementById('dispute-details').value;
    const playerName = document.getElementById('dispute-player-name').value;
    const evidenceFiles = document.getElementById('dispute-evidence').files;

    if (!reason || !details || !playerName) {
      alert('Please fill in all required fields');
      return;}

    // Create form data
    const formData = new FormData();
    formData.append('matchId', matchId);
    formData.append('reason', `${reason}: ${details}`);
    formData.append('playerName', playerName);

    // Add evidence files
    for (let i = 0; i < evidenceFiles.length && i < 5; i++) {
      formData.append('evidence', evidenceFiles[i]);
    }

    // Submit dispute
    const response = await fetch('/api/ladder/dispute-match', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit dispute');
    }

    // Close modal
    const modal = document.getElementById('dispute-match-modal');
    modal.style.display = 'none';

    alert('Dispute submitted successfully. An administrator will review your dispute.');
  } catch (error) {
    logger.error('Error submitting dispute', error);
    alert(`Failed to submit dispute: ${error.message}`);
  }
}

/**
 * Flag a screenshot as inappropriate
 * @param {string} screenshotUrl - URL of the screenshot
 * @param {string} screenshotId - ID of the screenshot if available
 */
async function flagScreenshot(screenshotUrl, screenshotId) {
  try {
    if (!confirm('Are you sure you want to flag this screenshot as inappropriate content?')) {
      return;}

    const response = await fetch('/api/ladder/flag-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        screenshotUrl,
        screenshotId
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to flag screenshot');
    }

    await response.json(); // Process the response but we don't need the data
    alert('Screenshot has been flagged and will be reviewed by an administrator.');

    // Close the modal
    const modal = document.getElementById('screenshot-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  } catch (error) {
    logger.error('Error flagging screenshot', error);
    alert(`Error flagging screenshot: ${error.message}`);
  }
}

/**
 * Open edit match modal
 * @param {string} matchId - Match ID
 */
async function openEditMatchModal(matchId) {
  try {
    // Create modal if it doesn't exist
    let modal = document.getElementById('edit-match-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'edit-match-modal';
      modal.className = 'edit-match-modal';
      document.body.appendChild(modal);
    }

    // Show loading state
    modal.innerHTML = `
      <div class="edit-match-content">
        <div class="edit-match-header">
          <h2 class="edit-match-title">Edit Match</h2>
          <span class="close-edit-modal">&times;</span>
        </div>
        <div class="loading">Loading match details...</div>
      </div>
    `;
    modal.style.display = 'block';

    // Add event listener to close button
    const closeBtn = modal.querySelector('.close-edit-modal');
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });

    // Fetch match details
    const response = await fetch(`/api/matches/${matchId}`, { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Failed to fetch match details');
    }

    const match = await response.json();
    // Match details

    // Fetch maps for dropdown
          const mapsResponse = await fetch('/api/wc2maps?limit=1000', { credentials: 'include' });
    let maps = [];

    if (mapsResponse.ok) {
      const data = await mapsResponse.json();
      
      // Handle different response formats
      if (data.success && data.data) {
        maps = data.data;
      } else if (data.maps) {
        maps = data.maps;
      } else if (Array.isArray(data)) {
        maps = data;
      }
    } else {
      logger.error('Failed to fetch maps');
    }

    // Create edit form
    const modalContent = document.querySelector('.edit-match-content');
    modalContent.innerHTML = `
      <div class="edit-match-header">
        <h2 class="edit-match-title">Edit Match</h2>
        <span class="close-edit-modal">&times;</span>
      </div>
      <form id="edit-match-form" class="edit-match-form">
        <input type="hidden" id="edit-match-id" value="${match._id}">

        <div class="edit-match-section">
          <h3 class="edit-match-section-title">Match Details</h3>

          <div class="edit-match-field">
            <label class="edit-match-label" for="edit-match-type">Match Type</label>
            <select class="edit-match-select" id="edit-match-type">
              <option value="1v1" ${match.matchType === '1v1' ? 'selected' : ''}>1v1</option>
              <option value="2v2" ${match.matchType === '2v2' ? 'selected' : ''}>2v2</option>
              <option value="3v3" ${match.matchType === '3v3' ? 'selected' : ''}>3v3</option>
              <option value="4v4" ${match.matchType === '4v4' ? 'selected' : ''}>4v4</option>
              <option value="FFA" ${match.matchType === 'FFA' ? 'selected' : ''}>FFA</option>
            </select>
          </div>

          <div class="edit-match-field">
            <label class="edit-match-label" for="edit-match-map">Map</label>
            <select class="edit-match-select" id="edit-match-map">
              <option value="${match.map._id || match.map}">${match.map.name || 'Current Map'}</option>
              ${maps.map(map => `
                <option value="${map._id}" ${(match.map._id === map._id) ? 'selected' : ''}>
                  ${map.name}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="edit-match-field">
            <label class="edit-match-label" for="edit-match-resources">Resource Level</label>
            <select class="edit-match-select" id="edit-match-resources">
              <option value="low" ${match.resourceLevel === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${match.resourceLevel === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${match.resourceLevel === 'high' ? 'selected' : ''}>High</option>
            </select>
          </div>
        </div>

        <div class="edit-match-section">
          <h3 class="edit-match-section-title">Players</h3>
          <div class="edit-match-players" id="edit-match-players">
            ${match.players.map((player, index) => {
              const playerName = player.playerName || (player.playerId?.name || 'Unknown Player');
              return `
                <div class="edit-player-item">
                  <input type="hidden" name="player-id-${index}" value="${player.playerId?._id || player.playerId}">
                  <div class="edit-player-name">
                    <input type="text" class="edit-match-input" name="player-name-${index}" value="${playerName}" readonly>
                  </div>
                  <div class="edit-player-race">
                    <select class="edit-match-select" name="player-race-${index}">
                      <option value="human" ${player.race === 'human' ? 'selected' : ''}>Human</option>
                      <option value="orc" ${player.race === 'orc' ? 'selected' : ''}>Orc</option>
                      <option value="random" ${player.race === 'random' ? 'selected' : ''}>Random</option>
                    </select>
                  </div>
                </div>
              `;}).join('')}
          </div>
        </div>

        <div class="edit-match-actions">
          <button type="button" class="btn-cancel-edit">Cancel</button>
          <button type="submit" class="btn-save-match">Save Changes</button>
        </div>
      </form>
    `;

    // Add event listener to close button
    const newCloseBtn = modalContent.querySelector('.close-edit-modal');
    newCloseBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Add event listener to cancel button
    const cancelBtn = modalContent.querySelector('.btn-cancel-edit');
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Add event listener to form submission
    const form = document.getElementById('edit-match-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveMatchChanges(match);
    });

  } catch (error) {
    logger.error('Error opening edit match modal', error);
    alert('Failed to load match details. Please try again.');
  }
}

/**
 * Save match changes
 * @param {Object} originalMatch - Original match data
 */
async function saveMatchChanges(originalMatch) {
  try {
    const matchId = document.getElementById('edit-match-id').value;
    const matchType = document.getElementById('edit-match-type').value;
    const mapId = document.getElementById('edit-match-map').value;
    const resourceLevel = document.getElementById('edit-match-resources').value;

    // Get player data
    const players = [];
    const playerItems = document.querySelectorAll('.edit-player-item');

    playerItems.forEach((item, index) => {
      const playerId = item.querySelector(`input[name="player-id-${index}"]`).value;
      const playerName = item.querySelector(`input[name="player-name-${index}"]`).value;
      const race = item.querySelector(`select[name="player-race-${index}"]`).value;

      // Find original player to preserve other data
      const originalPlayer = originalMatch.players.find(p => {
        const originalId = p.playerId?._id || p.playerId;
        return originalId === playerId;});

      if (originalPlayer) {
        players.push({
          ...originalPlayer,
          race,
          playerName
        });
      }
    });

    // Prepare update data
    const updateData = {
      matchType,
      map: mapId,
      resourceLevel,
      players
    };

    // Updating match with data

    // Send update request
    const response = await fetch(`/api/matches/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update match');
    }

    // Close modal
    const modal = document.getElementById('edit-match-modal');
    modal.style.display = 'none';

    // Reload matches to show updated data
    await loadPlayerProfile();

    alert('Match updated successfully!');
  } catch (error) {
    logger.error('Error saving match changes', error);
    alert(`Failed to update match: ${error.message}`);
  }
}

// Make functions available globally
window.viewScreenshots = viewScreenshots;
window.flagScreenshot = flagScreenshot;
window.openEditMatchModal = openEditMatchModal;

/**
 * Create a win/loss chart
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} stats - Player stats
 */
function createWinLossChart(canvas, stats) {
  try {
    // Creating win/loss chart with stats

    // Check if Chart is defined
    if (typeof Chart === 'undefined') {
      logger.error('Chart.js is not loaded');
      return;}

    // Clean up any existing chart
    if (charts.winLossChart) {
      charts.winLossChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    // Create the chart
    charts.winLossChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Wins', 'Losses'],
        datasets: [{
          data: [stats.wins || 0, stats.losses || 0],
          backgroundColor: ['#4CAF50', '#F44336'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = stats.totalMatches || 0;
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;}
            }
          }
        }
      }
    });

    // Win/loss chart created successfully
  } catch (error) {
          logger.error('Error creating win/loss chart', error);
  }
}

/**
 * Load forum activity for a user
 * @param {string} userId - User ID
 */
async function loadForumActivity(userId) {
  const forumContainer = document.getElementById('forum-activity-container');

  if (!forumContainer) {
    logger.warn('Forum activity container not found');
    return;}

  try {
    // Show loading state
    forumContainer.innerHTML = '<div class="loading">Loading forum activity...</div>';

    // Fetch forum activity from API
    const response = await fetch(`/api/users/${userId}/forum-activity`, { credentials: 'include' });

    if (!response.ok) {
      if (response.status === 404) {
        forumContainer.innerHTML = '<div class="info-message">No forum activity found for this user.</div>';
        return;}
      throw new Error('Failed to fetch forum activity');
    }

    const activity = await response.json();

    // Clear loading message
    forumContainer.innerHTML = '';

    // Check if there is any activity
    if (!activity || activity.length === 0) {
      forumContainer.innerHTML = '<div class="info-message">No forum activity found for this user.</div>';
      return;}

    // Create activity items
    const activityList = document.createElement('div');
    activityList.className = 'activity-list';

    // Sort by date (newest first)
    activity.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Show up to 10 most recent activities
    const recentActivity = activity.slice(0, 10);

    recentActivity.forEach(item => {
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';

      // Format date
      const date = new Date(item.date);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

      // Determine activity type and create appropriate content
      let activityContent = '';
      if (item.type === 'post') {
        activityContent = `
          <div class="activity-type">${item.type}</div>
          <div class="activity-content">${item.content}</div>
          <div class="activity-date">${formattedDate}</div>
        `;
      } else if (item.type === 'topic') {
        activityContent = `
          <div class="activity-type">${item.type}</div>
          <div class="activity-content">${item.content}</div>
          <div class="activity-date">${formattedDate}</div>
        `;
      }

      activityItem.innerHTML = activityContent;

      activityList.appendChild(activityItem);
    });

    forumContainer.appendChild(activityList);

    // Add view all link if there are more than 10 activities
    if (activity.length > 10) {
      const viewAllLink = document.createElement('div');
      viewAllLink.className = 'view-all-link';
      viewAllLink.innerHTML = `
        <a href="/views/stone-tablet.html?user=${userId}" class="btn btn-secondary">
          <i class="fas fa-external-link-alt"></i> View All Forum Activity
        </a>
      `;
      forumContainer.appendChild(viewAllLink);
    }
  } catch (error) {
    logger.error('Error loading forum activity', error);
    forumContainer.innerHTML = '<div class="error">Failed to load forum activity. Please try again later.</div>';
  }
}

/**
 * Load user tournaments
 * @param {string} userId - User ID
 */
async function loadUserTournaments(userId) {
  const tournamentsContainer = document.getElementById('tournaments-container');

  if (!tournamentsContainer) {
    logger.warn('Tournaments container not found');
    return;}

  try {
    // Show loading state
    tournamentsContainer.innerHTML = '<div class="loading">Loading tournaments...</div>';

    // Fetch tournaments from API
    const response = await fetch(`/api/tournaments/user/${userId}`, { credentials: 'include' });

    if (!response.ok) {
      if (response.status === 404) {
        tournamentsContainer.innerHTML = '<div class="info-message">No tournaments found for this user.</div>';
        return;}
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

    // Create tournaments section
    let html = '';

    // Tournaments created by user
    if (organizedTournaments.created.length > 0) {
      html += '<div class="tournaments-section"><h3>Tournaments Organized</h3>';

      organizedTournaments.created.forEach(tournament => {
        html += createTournamentCard(tournament, true);
      });

      html += '</div>';
    }

    // Tournaments user is registered for
    if (organizedTournaments.registered.length > 0) {
      html += '<div class="tournaments-section"><h3>Tournaments Registered</h3>';

      organizedTournaments.registered.forEach(tournament => {
        html += createTournamentCard(tournament, false);
      });

      html += '</div>';
    }

    tournamentsContainer.innerHTML = html;
  } catch (error) {
    logger.error('Error loading tournaments', error);
    tournamentsContainer.innerHTML = '<div class="error">Failed to load tournaments. Please try again later.</div>';
  }
}

/**
 * Create a tournament card
 * @param {Object} tournament - Tournament data
 * @param {boolean} isOrganizer - Whether the user is the organizer
 * @returns {string} - HTML for the tournament card
 */
function createTournamentCard(tournament, isOrganizer) {
  // Format date
  const startDate = new Date(tournament.startDate);const formattedDate = startDate.toLocaleDateString();

  return `
    <div class="tournament-card">
      <div class="tournament-info">
        <h4 class="tournament-name">${tournament.name}</h4>
        <div class="tournament-date">${formattedDate}</div>
        <div class="tournament-status">${tournament.status}</div>
      </div>
      <div class="tournament-actions">
        <a href="/views/tournament.html?id=${tournament._id}" class="btn btn-primary">
          <i class="fas fa-external-link-alt"></i> View Tournament
        </a>
        ${isOrganizer ? `
          <a href="/views/tournament-manage.html?id=${tournament._id}" class="btn btn-secondary">
            <i class="fas fa-cog"></i> Manage
          </a>
        ` : ''}
      </div>
    </div>
  `;}

/**
 * Load user maps
 * @param {string} userId - User ID
 */
async function loadUserMaps(userId) {
  try {
    const response = await fetch(`/api/users/${userId}/maps`);
    if (!response.ok) {
      throw new Error('Failed to load user maps');
    }

    const maps = await response.json();
    const mapsContainer = document.getElementById('user-maps-container');
    
    if (!mapsContainer) {
      logger.warn('Maps container not found');
      return;}

    if (maps.length === 0) {
      mapsContainer.innerHTML = `
        <div class="no-activity-message">
          <i class="fas fa-map"></i>
          <h3>No Maps Created</h3>
          <p>You haven't created any maps yet.</p>
        </div>
      `;
      return;}

    const mapsList = document.createElement('div');
    mapsList.className = 'maps-list';

    maps.forEach(map => {
      const mapItem = document.createElement('div');
      mapItem.className = 'map-item';
      mapItem.innerHTML = `
        <a href="/maps/${map.id}" class="map-name">${map.name}</a>
        <span class="map-date">Created: ${new Date(map.createdAt).toLocaleDateString()}</span>
      `;
      mapsList.appendChild(mapItem);
    });

    mapsContainer.innerHTML = '';
    mapsContainer.appendChild(mapsList);
  } catch (error) {
    logger.error('Error loading user maps', error);
    const mapsContainer = document.getElementById('user-maps-container');
    if (mapsContainer) {
      mapsContainer.innerHTML = '<div class="error">Failed to load maps</div>';
    }
  }
}

/**
 * Set up activity tabs for forum and tournament activities
 */
function setupActivityTabs() {
  const tabs = document.querySelectorAll('.activity-tab');
  const containers = document.querySelectorAll('.activity-container');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and containers
      tabs.forEach(t => t.classList.remove('active'));
      containers.forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab and corresponding container
      tab.classList.add('active');
      const containerId = `${tab.dataset.tab}-container`;
      const container = document.getElementById(containerId);
      if (container) {
        container.classList.add('active');
      }
    });
  });

  // Activate the first tab by default
  if (tabs.length > 0) {
    tabs[0].click();
  }
}

/**
 * Load player achievements
 */
async function loadPlayerAchievements(userId) {
  try {
    // Load all achievements
    const allAchievementsRes = await fetch('/api/achievements', { credentials: 'include' });
    const allAchievements = await allAchievementsRes.json();
    // Load user progress
    const userAchievementsRes = await fetch('/api/achievements/me', { credentials: 'include' });
    const userAchievementsData = await userAchievementsRes.json();
    // Merge achievements and user progress
    const achievements = allAchievements.map(ach => {
      const userAch = (userAchievementsData.achievements || []).find(a => a.id === ach.id);
      return {
        ...ach,
        completed: userAch ? userAch.completed : false,
        progress: userAch ? userAch.progress : 0,
        unlockedAt: userAch ? userAch.earnedAt : null
      };});
    // Render achievements
    const achievementsManager = new AchievementsManager();
    achievementsManager.achievements = achievements;
    achievementsManager.userAchievements = (userAchievementsData.achievements || []).reduce((acc, curr) => {
      acc[curr.id] = curr;
      return acc;}, {});
    achievementsManager.renderCategories();
    achievementsManager.renderAchievements();
    // Update achievement summary
    const total = achievements.length;
    const completed = achievements.filter(a => a.completed).length;
    const experience = achievements.filter(a => a.completed).reduce((sum, a) => sum + (a.rewards?.experience || 0), 0);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('total-achievements').textContent = total;
    document.getElementById('completed-achievements').textContent = completed;
    document.getElementById('total-points').textContent = points;
    document.getElementById('completion-percentage').textContent = `${percentage}%`;
  } catch (error) {
    logger.error('Error loading achievements', error);
    showError('Failed to load achievements');
  }
}



/**
 * Load and display allies and enemies data
 * @param {string} playerName - Name of the player
 */
async function loadAlliesAndEnemies(playerName) {
  const container = document.getElementById('allies-enemies-container');
  if (!container) return;try {
    // Show loading state
    container.innerHTML = '<div class="loading">Loading allies and enemies data...</div>';

    // Fetch data from API
    const response = await fetch(`/api/ladder/player/${encodeURIComponent(playerName)}/allies-enemies`);
    if (!response.ok) {
      throw new Error('Failed to fetch allies and enemies data');
    }

    const data = await response.json();
    const { allies, enemies } = data;

    // Create HTML content
    const html = `
      <div class="allies-enemies-grid">
        <div class="allies-section">
          <h3>Top Allies</h3>
          ${allies.length > 0 ? `
            <div class="allies-list">
              ${allies.map(ally => `