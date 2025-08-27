/**
 * ProfileUIManager - Handles UI updates and DOM manipulation for profile sections
 * Features:
 * - Dynamic content rendering
 * - Statistics display and formatting
 * - War Table and achievement progress
 * - Player card management
 * - Loading states and animations
 */



export class ProfileUIManager {
  constructor() {
    this.elements = new Map();
    this.loadingElements = new Set();
    this.animationQueue = [];
    this.isUpdating = false;
  }

  /**
   * Initialize UI manager and cache commonly used elements
   */
  init() {
    this.cacheElements();
    this.setupGlobalAnimations();
  }

  /**
   * Cache frequently accessed DOM elements
   */
  cacheElements() {
    const elementMap = {
      // User profile elements
      'username': '#profile-username',
      'email-text': '#email-text',
      'profile-avatar': '#profile-avatar',
      'user-level': '#user-level',
      'user-experience': '#user-experience',
      'experience-bar': '.experience-bar-fill',
      
      // Points display
      'honor-points': '#honor-points-small',
      'arena-gold': '#arena-points-small',
      'total-points': '#total-points',
      
      // Player stats
      'highest-rank': '#highest-rank-name',
      'highest-mmr': '#highest-mmr',
      'wins-losses': '#wins-losses',
      'win-rate': '#win-rate',
      
      // Campaign stats
      'campaign-progress': '#campaign-progress',
      'completed-campaigns': '#completed-campaigns',
      'total-playtime': '#total-playtime',
      'speedrun-records': '#speedrun-records',
      
      // Achievement stats
      'total-achievements': '#total-achievements',
      'achievement-points': '#achievement-points',
      'completion-percentage': '#completion-percentage',
      
      // Campaign stats (War Table section)
      'missions-completed': '#missions-completed',
      'campaigns-completed': '#campaigns-completed',
      
      // Content areas
      'player-cards-container': '#player-names-container',
      'tournaments-container': '#tournaments-container',
      // Note: campaign-achievements-container removed - achievements now in main achievements section
      'recent-achievements': '#recent-achievements',
      'recent-campaigns': '#recent-campaigns-container',
      'forum-activity': '#forum-activity-container',
      
      // Bio and social
      'bio-text': '#bio-text',
      'twitch-link': '#twitch-link',
      'youtube-link': '#youtube-link',
      'discord-link': '#discord-link',
      'clan-container': '#clan-container',
      'profile-dob': '#profile-dob',
      'profile-country': '#profile-country',
      'profile-game': '#profile-game',
      'profile-race': '#profile-race',
      'profile-tactics': '#profile-tactics'
    };

    Object.entries(elementMap).forEach(([key, selector]) => {
      const element = document.querySelector(selector);
      if (element) {
        this.elements.set(key, element);
      } else {
        console.warn(`🚨 Element not found: ${key} (${selector})`);
      }
    });

    console.log(`📦 Cached ${this.elements.size} UI elements out of ${Object.keys(elementMap).length} expected`);
    console.log('📋 Missing elements:', Object.entries(elementMap).filter(([key, selector]) => !document.querySelector(selector)).map(([key]) => key));
  }

  /**
   * Update entire user profile UI
   */
  async updateUserProfile(userData) {
    if (!userData) {
      console.error('❌ updateUserProfile called with missing userData');
      // Set a fallback username even if no data
      this.updateElement('username', 'No User Data');
      return;}
    
    // Update basic user info with robust fallback logic
    const username = userData.username || userData.displayName || 'Unknown User';
    
    const usernameElem = this.elements.get('username') || document.getElementById('profile-username');
    
    if (!usernameElem) {
      console.error('❌ profile-username element not found in DOM');
      
      // Try to find the element again after a short delay
      setTimeout(() => {
        const delayedUsernameElem = document.getElementById('profile-username');
        if (delayedUsernameElem) {
          delayedUsernameElem.textContent = username;
        } else {
          console.error('❌ Still cannot find username element after delay');
        }
      }, 100);
    }
    
    this.updateElement('username', username);
    
    const emailText = userData.email || 'No email provided';
    this.updateElement('email-text', emailText);
    
    this.updateAvatar(userData.avatar);
    this.updateUserLevel(userData);
    this.updatePointsDisplay(userData);
    this.updateBioAndSocial(userData);
  }

  /**
   * Update player statistics display
   */
  async updatePlayerStats(playersWithStats) {
    
    try {
      if (!playersWithStats || playersWithStats.length === 0) {
        // Show no players message
        const container = this.elements.get('player-cards-container');
        if (container) {
          container.innerHTML = this.createNoPlayersMessage();
        }
        
        // Reset stats to defaults and show default rank
        this.updateElement('highest-rank', 'Unranked');
        this.updateElement('highest-mmr', 0);
        this.updateElement('wins-losses', '0/0');
        this.updateElement('win-rate', '0%');
        this.updateRankBadge('emblem.png', 'Unranked');
        
        return;}

      // Calculate overall stats
      const overallStats = this.calculateOverallStats(playersWithStats);
      
      // Update stat displays
      this.updateElement('highest-rank', overallStats.highestRank?.name || 'Unranked');
      this.updateElement('highest-mmr', overallStats.highestMMR || 0);
      this.updateElement('wins-losses', `${overallStats.totalWins}/${overallStats.totalLosses}`);
      this.updateElement('win-rate', `${overallStats.winRate || 0}%`);

      // Always show the user's chosen avatar
      if (window.currentUser && window.currentUser.avatar) {
        this.updateAvatar(window.currentUser.avatar);
      } else {
        this.updateAvatar('/assets/img/ranks/emblem.png');
      }

      // Show the rank badge as an overlay on the avatar
      if (overallStats.highestRank && overallStats.highestRank.image) {
        this.updateRankBadge(overallStats.highestRank.image, overallStats.highestRank.name);
      } else {
        this.updateRankBadge('emblem.png', 'Unranked');
      }

      // Update player cards
      this.updatePlayerCards(playersWithStats);
      
    } catch (error) {
      console.error('❌ Failed to update player stats UI:', error);
    }
  }

  /**
   * Update the rank badge overlay on the avatar
   */
  updateRankBadge(rankImage, rankName) {
    const avatarContainer = this.elements.get('profile-avatar');
    if (!avatarContainer) return;const oldBadge = avatarContainer.querySelector('.rank-badge-overlay');
    if (oldBadge) oldBadge.remove();
    // Add new badge
    let imageUrl = rankImage || 'emblem.png';
    if (!imageUrl.startsWith('/assets') && !imageUrl.startsWith('http')) {
      imageUrl = `/assets/img/ranks/${imageUrl}`;
    }
    const badge = document.createElement('img');
    badge.src = imageUrl;
    badge.alt = rankName || 'Rank';
    badge.className = 'rank-badge-overlay';
    badge.style.position = 'absolute';
    badge.style.bottom = '0';
    badge.style.right = '0';
    badge.style.width = '40px';
    badge.style.height = '40px';
    badge.style.borderRadius = '50%';
    badge.style.border = '2px solid #fff';
    badge.style.background = '#222';
    badge.style.boxShadow = '0 2px 8px #0006';
    badge.style.zIndex = '10';
    avatarContainer.style.position = 'relative';
    avatarContainer.appendChild(badge);
  }

  /**
   * Update campaign statistics display
   */
  updateCampaignStats(campaignData) {
    
    try {
      const { stats, progress } = campaignData;
      
      if (stats) {
        this.updateElement('completed-campaigns', stats.completedCampaigns || 0);
        this.updateElement('total-playtime', this.formatPlaytime(stats.totalPlaytime));
        this.updateElement('speedrun-records', stats.speedrunRecords || 0);
        
        // Update progress bar
        this.updateProgressBar('campaign-progress', stats.completionPercentage || 0);
      }
      
      // Update recent campaigns
      if (progress && progress.length > 0) {
        this.updateRecentCampaigns(progress);
      }
      
    } catch (error) {
      console.error('❌ Failed to update campaign stats UI:', error);
    }
  }

  /**
   * Update campaign progress display for the War Table section
   */
  async updateCampaignProgress(campaignData) {
    
    try {
      const { stats, progress } = campaignData;
      
      // Update campaign stat cards
      if (stats) {
        this.updateElement('missions-completed', stats.totalMissionsCompleted || 0);
        this.updateElement('campaigns-completed', stats.completedCampaigns || 0);
      }
      
      // Initialize War Table tabs
      this.initializeWarTableTabs();
      
      // Load and display all campaigns
      await this.loadAllCampaigns();
      
    } catch (error) {
      console.error('❌ Failed to update campaign progress UI:', error);
    }
  }

  /**
   * Initialize War Table tabs functionality
   */
  initializeWarTableTabs() {
    const tabs = document.querySelectorAll('.war-table-tab');
    if (!tabs.length) return;tabs.forEach(tab => {
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);
    });

    // Add click listeners to new tabs
    document.querySelectorAll('.war-table-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        document.querySelectorAll('.war-table-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Get selected game
        const selectedGame = tab.dataset.game;
        
        // Filter campaigns by game
        this.filterCampaignsByGame(selectedGame);
      });
    });

  }

  /**
   * Load all campaigns from the backend and display them
   */
  async loadAllCampaigns() {
    const container = document.getElementById('campaign-progress-container');
    if (!container) return;try {
      // Show loading state
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading campaigns...</div>';

      // Fetch all campaigns from backend
      const [campaignsResponse, userProgressResponse] = await Promise.all([
        fetch('/api/campaigns', { credentials: 'include' }),
        fetch('/api/campaigns/user/progress', { credentials: 'include' })
      ]);

      let allCampaigns = [];
      let userProgress = [];

      if (campaignsResponse.ok) {
        allCampaigns = await campaignsResponse.json();
      }

      if (userProgressResponse.ok) {
        userProgress = await userProgressResponse.json();
      }

      // Show campaigns for active tab (default to WC2)
      const activeTab = document.querySelector('.war-table-tab.active');
      const selectedGame = activeTab ? activeTab.dataset.game : 'war2';
      this.filterCampaignsByGame(selectedGame);

    } catch (error) {
      console.error('❌ Failed to load campaigns:', error);
      container.innerHTML = '<div class="error">Failed to load campaigns</div>';
    }
  }

  /**
   * Filter and display campaigns by game type
   */
  filterCampaignsByGame(gameType) {
    const container = document.getElementById('campaign-progress-container');
    if (!container || !this.allCampaigns) return;const gameMapping = {
      'war1': 'warcraft1',
      'war2': 'warcraft2', 
      'war3': 'warcraft3'
    };
    
    const dbGameType = gameMapping[gameType];

    // Extract all campaigns from the grouped structure returned by backend
    let allCampaignsList = [];if (Array.isArray(this.allCampaigns)) {
      // Handle grouped data structure from Campaign.getAllCampaigns()
      this.allCampaigns.forEach(gameGroup => {
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
        'war1': 'Warcraft I',
        'war2': 'Warcraft II',
        'war3': 'Warcraft III'
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
    if (this.userProgress) {
      this.userProgress.forEach(item => {
        if (item._id) {
          const key = `${item._id.game}-${item._id.expansion}-${item._id.campaignName}-${item._id.race}`;
          progressMap.set(key, {
            completed: item.completedMissions || 0,
            total: item.totalMissions || 0
          });
        }
      });
    }

    // Generate HTML for filtered campaigns
    const campaignsHTML = allCampaignsList.map(campaign => {
      const key = `${campaign.game}-${campaign.expansion || 'base'}-${campaign.name}-${campaign.race || 'any'}`;
      const userProgress = progressMap.get(key) || { completed: 0, total: campaign.totalMissions || 0 };
      
      // Use campaign.totalMissions if available, otherwise fallback to userProgress.total
      const totalMissions = campaign.totalMissions || userProgress.total || 0;
      const completedMissions = userProgress.completed || 0;
      const percentage = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;
      
      const gameNames = {
        'warcraft1': 'WC I',
        'warcraft2': 'WC II', 
        'warcraft3': 'WC III'
      };

      // Create race display name
      const raceNames = {
        'human': 'Human',
        'orc': 'Orc',
        'undead': 'Undead',
        'nightelf': 'Night Elf',
        'alliance': 'Alliance',
        'horde': 'Horde'
      };

      return `
        <div class="campaign-progress-item">
          <div class="campaign-item-header">
            <div class="campaign-name">${campaign.name} (${raceNames[campaign.race] || campaign.race})</div>
            <div class="campaign-game-badge">${gameNames[campaign.game] || campaign.game}</div>
          </div>
          <div class="campaign-progress-info">
            <span class="progress-fraction">${completedMissions}/${totalMissions}</span>
            <span class="progress-percentage">${Math.round(percentage)}%</span>
          </div>
          <div class="campaign-progress-bar">
            <div class="campaign-progress-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;}).join('');

    container.innerHTML = campaignsHTML;
  }

  /**
   * Update achievement statistics display
   */
  updateAchievementStats(achievementData) {
    
    try {
      // Handle different response formats from API
      let totalCount = 0;
      let completedCount = 0;
      let totalPoints = 0;
      let completionPercentage = 0;
      
      if (achievementData) {
        // Use the totalUnlocked count from the API (most reliable)
        completedCount = achievementData.totalUnlocked || 0;
        totalPoints = achievementData.totalPointsEarned || 0;
        
        // Calculate completion percentage from achievements array
        if (achievementData.achievements) {
          totalCount = achievementData.achievements.length;
          const completed = achievementData.achievements.filter(a => a.completed).length;
          completedCount = completed;
          completionPercentage = totalCount > 0 ? Math.round((completed / totalCount) * 100) : 0;
        }
        
        // Fallback: if totalUnlocked is missing but we have completed array
        if (completedCount === 0 && achievementData.completed) {
          completedCount = achievementData.completed.length || 0;
        }
        
        // Fallback: if we have stats format
        if (achievementData.stats) {
          completedCount = achievementData.stats.totalUnlocked || completedCount;
          totalPoints = achievementData.stats.totalPoints || totalPoints;
          completionPercentage = achievementData.stats.completionPercentage || completionPercentage;
        }
      }
      
      // Update the correct element IDs matching the HTML
      this.updateElement('total-achievements', totalCount);
      this.updateElement('completed-achievements', completedCount);
      this.updateElement('completion-percentage', `${completionPercentage}%`);

      // Load achievements for each category
      if (achievementData && achievementData.achievements) {
        this.loadAchievementsByCategory(achievementData.achievements);
      }
      
    } catch (error) {
      console.error('❌ Failed to update achievement stats UI:', error);
    }
  }

  /**
   * Load and categorize achievements into Arena/Social/War Table tabs
   */
  loadAchievementsByCategory(achievements) {
    
    const categories = {
      arena: [],
      social: [],
      wartable: []
    };

    achievements.forEach(achievement => {
      const id = achievement.id.toLowerCase();
      const category = achievement.category?.toLowerCase();
      
      // War Table achievements (campaigns, missions, speedruns)
      if (id.includes('wc1') || id.includes('wc2') || id.includes('wc3') || 
          id.includes('campaign') || id.includes('mission') || id.includes('speedrun') ||
          id.includes('human_campaign') || id.includes('orc_campaign') || 
          id.includes('completionist') || id.includes('warcraft_master') ||
          id.includes('btdp') || id.includes('roc') || id.includes('tft') ||
          category === 'campaign' || category === 'speedrun') {
        categories.wartable.push(achievement);
      }
      // Arena achievements (PvP, matches, wins, rankings, map-related)
      else if (id.includes('win') || id.includes('1v1') || id.includes('2v2') || 
               id.includes('3v3') || id.includes('4v4') || id.includes('ffa') ||
               id.includes('first_report') || id.includes('first_win') ||
               id.includes('map_') || id.includes('cartographer') ||
               id.includes('veteran') || id.includes('perfect_victory') ||
               id.includes('comeback_king')) {
        categories.arena.push(achievement);
      }
      // Social achievements (friends, clans, forum, chat, profile, site-related)
      else {
        categories.social.push(achievement);
      }
    });

    // Update each tab
    this.updateArenaAchievements(categories.arena);
    this.updateSocialAchievements(categories.social);
    this.updateWarTableAchievements(categories.wartable);
  }

  /**
   * Update Arena achievements tab
   */
  updateArenaAchievements(achievements) {
    const container = document.getElementById('arena-achievements-container');
    if (!container) return;container.innerHTML = this.createAchievementGrid(achievements, 'arena');
  }

  /**
   * Update Social achievements tab
   */
  updateSocialAchievements(achievements) {
    const container = document.getElementById('social-achievements-container');
    if (!container) return;container.innerHTML = this.createAchievementGrid(achievements, 'social');
  }

  /**
   * Update War Table achievements tab
   */
  updateWarTableAchievements(achievements) {
    
    // Subdivide achievements by game type
    const gameAchievements = {
      wc1: [],
      wc2: [],
      wc3: []
    };

    achievements.forEach(achievement => {
      const id = achievement.id.toLowerCase();
      
      if (id.includes('wc1') || id.includes('warcraft1')) {
        gameAchievements.wc1.push(achievement);
      } else if (id.includes('wc2') || id.includes('warcraft2')) {
        gameAchievements.wc2.push(achievement);
      } else if (id.includes('wc3') || id.includes('warcraft3')) {
        gameAchievements.wc3.push(achievement);
      } else if (id.includes('campaign') || id.includes('mission') || id.includes('speedrun')) {
        // Generic campaign achievements go to all games for now
        // You can customize this logic based on your needs
        gameAchievements.wc1.push(achievement);
        gameAchievements.wc2.push(achievement);
        gameAchievements.wc3.push(achievement);
      }
    });

    // Update each game container
    const wc1Container = document.getElementById('wc1-achievements-container');
    const wc2Container = document.getElementById('wc2-achievements-container');
    const wc3Container = document.getElementById('wc3-achievements-container');

    if (wc1Container) {
      wc1Container.innerHTML = this.createAchievementGrid(gameAchievements.wc1, 'wc1');
    }
    if (wc2Container) {
      wc2Container.innerHTML = this.createAchievementGrid(gameAchievements.wc2, 'wc2');
    }
    if (wc3Container) {
      wc3Container.innerHTML = this.createAchievementGrid(gameAchievements.wc3, 'wc3');
    }

  }

  /**
   * Create achievement grid HTML for a category
   */
  createAchievementGrid(achievements, category) {
    if (!achievements || achievements.length === 0) {
      const messages = {
        arena: 'No arena achievements yet. Play matches to earn achievements!',
        social: 'No social achievements yet. Make friends and join the community!',
        wartable: 'No War Table achievements yet. Complete campaigns to earn achievements!',
        wc1: 'No Warcraft I achievements yet. Complete WC1 campaigns to earn achievements!',
        wc2: 'No Warcraft II achievements yet. Complete WC2 campaigns to earn achievements!',
        wc3: 'No Warcraft III achievements yet. Complete WC3 campaigns to earn achievements!'
      };
      
      return `
        <div class="no-achievements">
          <i class="fas fa-trophy"></i>
          <p>${messages[category]}</p>
        </div>
      `;}

    return `
      <div class="achievements-grid">
        ${achievements.map(achievement => `
          <div class="achievement-card ${achievement.completed ? 'completed' : 'locked'}">
            <div class="achievement-icon">
              <i class="fas ${achievement.icon || 'fa-trophy'}"></i>
            </div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-rewards">
              <span class="exp-reward"><i class="fas fa-star"></i> ${achievement.rewards?.experience || 5} EXP</span>
              <span class="gold-reward"><i class="fas fa-coins"></i> ${achievement.rewards?.arenaGold || 5} Gold</span>
              ${(achievement.rewards?.honorPoints || 0) > 0 ? `<span class="honor-reward"><i class="fas fa-medal"></i> ${achievement.rewards.honorPoints} Honor</span>` : ''}
            </div>
            <div class="achievement-status">
              ${achievement.completed ? 
                `<i class="fas fa-check-circle"></i>
                 <span class="completed-date">${this.formatDate(achievement.earnedAt)}</span>` : 
                `<i class="fas fa-lock"></i>
                 <span class="locked-text">Locked</span>`
              }
            </div>
          </div>
        `).join('')}
      </div>
    `;}

  /**
   * Update tournament activity display
   */
  updateTournamentActivity(tournamentData) {
    
    try {
      const container = this.elements.get('tournaments-container');
      if (!container) return;if (!tournamentData.tournaments || tournamentData.tournaments.length === 0) {
        container.innerHTML = this.createNoActivityMessage(
          'trophy',
          'No Tournament Activity Yet',
          'You haven\'t participated in any tournaments yet.',
          '/views/tournaments.html',
          'Browse Tournaments'
        );
        return;}

      // Create tournament cards
      const tournamentCards = tournamentData.tournaments.map(tournament => 
        this.createTournamentCard(tournament)
      ).join('');

      container.innerHTML = tournamentCards;

      // Add pagination if needed
      if (tournamentData.totalPages > 1) {
        this.addPagination(container, tournamentData, 'loadUserTournaments');
      }
      
    } catch (error) {
      console.error('❌ Failed to update tournament activity UI:', error);
    }
  }

  /**
   * Update experience bar display - DEPRECATED
   * Use achievementUI.updateProgressDisplays() instead
   */
  updateExperienceBar(userData) {
    
    // Delegate to new unified system
    if (window.achievementUI && userData) {
      window.achievementEngine.updateUserProgress({
        experience: userData.experience,
        arenaGold: userData.arenaGold,
        honor: userData.honor
      });
    }

    // Update arena gold and honor displays
    const arenaGoldElements = document.querySelectorAll('#arena-gold, #arena-points-small');
    arenaGoldElements.forEach(element => {
      if (element) {
        element.textContent = userData.arenaGold || 0;
      }
    });

    const honorElements = document.querySelectorAll('#honor-points, #honor-points-small');
    honorElements.forEach(element => {
      if (element) {
        element.textContent = userData.honor || 0;
      }
    });
  }

  /**
   * Update points display
   */
  updatePointsDisplay(userData) {
            const honor = userData.honor || 0;
    const arena = userData.arenaGold || 0;
    const total = honor + arena;

    this.updateElement('honor-points', this.formatNumber(honor));
    this.updateElement('honor-points-small', this.formatNumber(honor));
    this.updateElement('arena-gold', this.formatNumber(arena));
    this.updateElement('arena-points-small', this.formatNumber(arena));
    this.updateElement('total-points', this.formatNumber(total));

    // Animate if points changed
    this.animatePointsChange('honor-points', honor);
    this.animatePointsChange('honor-points-small', honor);
    this.animatePointsChange('arena-gold', arena);
    this.animatePointsChange('arena-points-small', arena);
  }

  /**
   * Update user level and experience
   */
  updateUserLevel(userData) {
    const level = this.calculateLevel(userData.experience || 0);
    const currentLevelExp = this.calculateLevelExperience(level);
    const nextLevelExp = this.calculateLevelExperience(level + 1);
    const progressPercent = ((userData.experience - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;

    this.updateElement('user-level', level);
    this.updateProgressBar('experience-bar', progressPercent);
  }

  /**
   * Refresh user data from API to catch updates like achievements
   */
  async refreshUserData() {
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      if (response.ok) {
        const userData = await response.json();
        this.updateExperienceBar(userData);
        
        // Also refresh notifications
        if (window.notificationsManager) {
          await window.notificationsManager.loadNotifications();
        }
        
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  }

  /**
   * Start periodic refresh of user data to catch achievement updates
   */
  startPeriodicRefresh() {
    
    // Refresh every 30 seconds to catch new achievements
    this.refreshInterval = setInterval(() => {
      this.refreshUserData();
    }, 30000);
    
  }

  /**
   * Stop periodic refresh
   */
  stopPeriodicRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Handle achievement unlock - DEPRECATED
   * Use achievementUI.handleAchievementAward() instead
   */
  async handleAchievementUnlock(achievementCount = 1) {
    
    // Delegate to new unified system
    if (window.achievementUI) {
      window.achievementUI.handleAchievementAward({ count: achievementCount });
    }
  }

  /**
   * Show achievement celebration animation
   */
  showAchievementCelebration(count) {
    // Create celebration overlay
    const celebration = document.createElement('div');
    celebration.className = 'achievement-celebration';
    celebration.innerHTML = `
      <div class="celebration-content">
        <div class="trophy-icon">🏆</div>
        <div class="celebration-text">
          <h3>Achievement${count > 1 ? 's' : ''} Unlocked!</h3>
          <p>${count} new achievement${count > 1 ? 's' : ''} earned</p>
        </div>
      </div>
    `;
    
    // Add styles
    celebration.style.cssText = `
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
      animation: fadeIn 0.3s ease-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .achievement-celebration .celebration-content {
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        border: 2px solid #ffd700;
        border-radius: 15px;
        padding: 2rem;
        text-align: center;
        animation: bounceIn 0.6s ease-out;
      }
      @keyframes bounceIn {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); opacity: 1; }
      }
      .achievement-celebration .trophy-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: pulse 1s infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      .achievement-celebration h3 {
        color: #ffd700;
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
      }
      .achievement-celebration p {
        color: #fff;
        margin: 0;
        font-size: 1rem;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(celebration);
    
    // Remove after 3 seconds
    setTimeout(() => {
      celebration.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(celebration);
        document.head.removeChild(style);
      }, 300);
    }, 3000);
  }

  /**
   * Update bio and social links
   */
  updateBioAndSocial(userData) {
    
    // Update main bio text
    this.updateElement('bio-text', userData.bio || 'No bio yet. Click edit to add one!');
    
    // Update bio textarea (form field)
    const bioTextarea = document.getElementById('bio-textarea');
    if (bioTextarea) {
      bioTextarea.value = userData.bio || '';
    }
    
    // Update profile fields with proper handling of nested data
    const profile = userData.profile || {};
    const warcraftPrefs = profile.warcraftPreferences || {};
    
    // Date of birth
    let dobText = 'Not specified';
    if (userData.dateOfBirth || profile.dateOfBirth) {
      const dobDate = new Date(userData.dateOfBirth || profile.dateOfBirth);
      if (!isNaN(dobDate.getTime())) {
        dobText = dobDate.toLocaleDateString();
      }
    }
    this.updateElement('profile-dob', dobText);
    
    // Country
    this.updateElement('profile-country', profile.country || userData.country || 'Not specified');
    
    // Game preference mapping
    const gameMap = {
      'wc1': 'WC: Orcs & Humans',
      'wc2': 'WC II: Tides of Darkness', 
      'wc3': 'WC III: Reign of Chaos'
    };
    const gameValue = warcraftPrefs.favoriteGame || userData.favoriteGame;
    this.updateElement('profile-game', gameMap[gameValue] || gameValue || 'Not specified');
    
    // Race preference mapping
    const raceMap = {
      'human': 'Human',
      'orc': 'Orc', 
      'night_elf': 'Night Elf',
      'undead': 'Undead'
    };
    const raceValue = warcraftPrefs.favoriteRace || userData.favoriteRace;
    this.updateElement('profile-race', raceMap[raceValue] || raceValue || 'Not specified');
    
    // Tactics/Strategy preference mapping
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
    this.updateElement('profile-tactics', tacticsMap[tacticsValue] || tacticsValue || 'Not specified');
    
    // Also populate form fields if they exist
    this.populateFormFields(userData);
    
    // Update content creator status and information
    this.updateContentCreatorStatus(userData);
    
    // Update Watch Tower status indicators
    if (window.profileFormHandlers && typeof window.profileFormHandlers.updateWatchTowerStatusIndicators === 'function') {
      window.profileFormHandlers.updateWatchTowerStatusIndicators(userData);
    }
    
    // Update social links (for the About section, not content creator section)
    if (userData.socialLinks) {
      this.updateSocialLink('twitch-link', userData.socialLinks.twitch);
      this.updateSocialLink('youtube-link', userData.socialLinks.youtube);
      this.updateSocialLink('discord-link', userData.socialLinks.discord);
    }
    
  }

  /**
   * Update content creator status and information
   */
  updateContentCreatorStatus(userData) {
    
    const platforms = ['youtube', 'twitch'];
    
    platforms.forEach(platform => {
      const statusElement = document.getElementById(`${platform}-status`);
      const descriptionDisplay = document.getElementById(`${platform}-description-display`);
      const descriptionText = document.getElementById(`${platform}-description-text`);
      const contentTypes = document.getElementById(`${platform}-content-types`);
      
      // Find the correct platform card for this platform
      const allPlatformCards = document.querySelectorAll(`#section-content-creator .platform-card`);
      let platformCard = null;
      allPlatformCards.forEach(card => {
        const platformIcon = card.querySelector(`.platform-icon.${platform}`);
        if (platformIcon) {
          platformCard = card;
        }
      });
      const platformHeader = platformCard?.querySelector('.platform-header');
      
      if (userData.socialLinks?.[platform]) {
        // Extract username for display
        let username = '';
        const url = userData.socialLinks[platform];
        if (platform === 'youtube' && url.includes('youtube.com/@')) {
          username = url.split('@').pop().split('/')[0];
        } else if (platform === 'twitch' && url.includes('twitch.tv/')) {
          username = url.split('twitch.tv/').pop().split('/')[0];
        }
        
        // Update status to show connected with clickable link
        if (statusElement && username) {
          statusElement.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #ffd700; text-decoration: none;">@${username}</a>`;
        }
        
        // Show description and content types if they exist
        const description = userData.streaming?.[`${platform}Description`];
        const games = userData.streaming?.[`${platform}Games`] || [];
        
        if (description || games.length > 0) {
          if (descriptionDisplay) {
            descriptionDisplay.classList.remove('d-none');
          }
          
          if (descriptionText && description) {
            descriptionText.textContent = description;
          }
          
          if (contentTypes) {
            contentTypes.innerHTML = '';
            games.forEach(game => {
              const badge = document.createElement('span');
              badge.className = 'content-type-badge';
              badge.textContent = game === 'wc12' ? 'WC 1 & 2' : 'WC 3';
              contentTypes.appendChild(badge);
            });
          }
        } else {
          // Hide description display if no content
          if (descriptionDisplay) {
            descriptionDisplay.classList.add('d-none');
          }
        }
      } else {
        // Not connected - just update status, don't remove cached images
        if (statusElement) {
          statusElement.textContent = 'Not connected';
        }
        if (descriptionDisplay) {
          descriptionDisplay.classList.add('d-none');
        }
      }
      
      // ALWAYS check for cached profile images and add them if available (regardless of connection status)
      if (platformHeader) {
        const avatarUrl = userData[`${platform}Avatar`];
        if (avatarUrl) {
          this.updatePlatformHeaderImage(platformHeader, platform, avatarUrl, userData.socialLinks?.[platform] || platform);
        }
      }
    });
    
  }

  /**
   * Update platform header with profile image
   */
  updatePlatformHeaderImage(platformHeader, platform, avatarUrl, username) {
    // Look for existing platform image or create one
    let platformImage = platformHeader.querySelector('.platform-profile-image');
    
    if (!platformImage) {
      // Create platform image element
      platformImage = document.createElement('div');
      platformImage.className = 'platform-profile-image';
      
      // Insert before platform info
      const platformInfo = platformHeader.querySelector('.platform-info');
      if (platformInfo) {
        platformHeader.insertBefore(platformImage, platformInfo);
      }
    }
    
    platformImage.innerHTML = `
      <img src="${avatarUrl}" 
           alt="${username} ${platform} avatar" 
           title="${username} on ${platform}"
           style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 0.75rem; border: 2px solid rgba(255, 215, 0, 0.3);"
           onerror="this.style.display='none';">
    `;
  }

  /**
   * Reset platform header to default (no profile image)
   */
  resetPlatformHeaderImage(platformHeader, platform) {
    const platformImage = platformHeader.querySelector('.platform-profile-image');
    if (platformImage) {
      platformImage.remove();
    }
  }

  /**
   * Populate form fields with user data for editing
   */
  populateFormFields(userData) {
    const profile = userData.profile || {};
    const warcraftPrefs = profile.warcraftPreferences || {};
    
    // Date of birth form field
    const dobInput = document.getElementById('bio-dob');
    if (dobInput && (userData.dateOfBirth || profile.dateOfBirth)) {
      const dobDate = new Date(userData.dateOfBirth || profile.dateOfBirth);
      if (!isNaN(dobDate.getTime())) {
        // Format as YYYY-MM-DD for date input
        dobInput.value = dobDate.toISOString().split('T')[0];
      }
    }
    
    // Country form field
    const countryInput = document.getElementById('bio-country');
    if (countryInput) {
      countryInput.value = profile.country || userData.country || '';
    }
    
    // Game preference form field
    const gameSelect = document.getElementById('bio-game');
    if (gameSelect) {
      gameSelect.value = warcraftPrefs.favoriteGame || userData.favoriteGame || '';
    }
    
    // Race preference form field
    const raceSelect = document.getElementById('bio-race');
    if (raceSelect) {
      raceSelect.value = warcraftPrefs.favoriteRace || userData.favoriteRace || '';
    }
    
    // Tactics preference form field
    const tacticsSelect = document.getElementById('bio-tactics');
    if (tacticsSelect) {
      tacticsSelect.value = warcraftPrefs.favoriteStrategy || userData.favoriteStrategy || userData.favoriteTactics || '';
    }
    
  }

  /**
   * Update avatar container with user's database avatar
   */
  updateAvatar(avatarUrl) {
    const avatarContainer = this.elements.get('profile-avatar');
    if (!avatarContainer) return;const imageUrl = avatarUrl || '/assets/img/ranks/emblem.png';
    
    avatarContainer.innerHTML = `
      <img src="${imageUrl}" 
           alt="User Avatar" 
           style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
           onerror="this.src='/assets/img/ranks/emblem.png'">
    `;
    
  }

  /**
   * Update rank avatar display (compatibility function)
   */
  updateRankAvatar(rankImage, rankName) {
    
    // For now, just use the regular avatar update
    // This maintains compatibility with existing code
    if (rankImage) {
      const avatarUrl = rankImage.startsWith('/') ? rankImage : `/assets/img/ranks/${rankImage}`;
      this.updateAvatar(avatarUrl);
    }
  }

  /**
   * Update player cards display
   */
  updatePlayerCards(playersWithStats) {
    const container = this.elements.get('player-cards-container');
    if (!container) return;if (!playersWithStats || playersWithStats.length === 0) {
      container.innerHTML = this.createNoPlayersMessage();
      return;}

    const playerCards = playersWithStats.map(player => 
      this.createPlayerCard(player)
    ).join('');

    container.innerHTML = playerCards;
    
    // Add event listeners for unlink buttons
    this.attachUnlinkListeners();
  }

  /**
   * Attach event listeners to unlink buttons
   */
  attachUnlinkListeners() {
    const unlinkButtons = document.querySelectorAll('.btn-unlink');
    unlinkButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent triggering the card click
        const playerId = button.getAttribute('data-player-id');
        const playerCard = button.closest('.player-card-container');
        const playerName = playerCard?.querySelector('.player-name')?.textContent || 'Unknown Player';
        
        if (confirm(`Are you sure you want to unlink player "${playerName}"? This action cannot be undone.`)) {
          await this.unlinkPlayer(playerId, button);
        }
      });
    });
  }

  /**
   * Unlink a player from the user account
   */
  async unlinkPlayer(playerId, buttonElement) {
    try {
      
      // Show loading state on the button
      const originalHTML = buttonElement.innerHTML;
      buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      buttonElement.disabled = true;
      
      const response = await fetch('/api/ladder/unlink-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId })
      });

      if (!response.ok) {
        throw new Error(`Failed to unlink player: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Refresh avatar across the application
      if (window.AvatarUtils) {
        try {
          await window.AvatarUtils.refreshUserAvatar();
        } catch (error) {
          console.warn('⚠️ Avatar refresh failed after player unlink:', error);
        }
      }
      
      // Remove the player card from the UI
      const playerCard = buttonElement.closest('.player-card-container');
      if (playerCard) {
        playerCard.style.transition = 'all 0.3s ease';
        playerCard.style.opacity = '0';
        playerCard.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
          playerCard.remove();
          
          // Check if no players left and show the no players message
          const container = this.elements.get('player-cards-container');
          if (container && container.children.length === 0) {
            container.innerHTML = this.createNoPlayersMessage();
          }
        }, 300);
      }
      
      // Show success notification
      this.showUnlinkNotification('Player unlinked successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Error unlinking player:', error);
      
      // Restore button state
      buttonElement.innerHTML = originalHTML;
      buttonElement.disabled = false;
      
      // Show error notification
      this.showUnlinkNotification('Failed to unlink player. Please try again.', 'error');
    }
  }

  /**
   * Show notification for unlink operations
   */
  showUnlinkNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    `;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Update recent campaigns display
   */
  updateRecentCampaigns(campaigns) {
    const container = this.elements.get('recent-campaigns');
    if (!container) return;const campaignItems = campaigns.slice(0, 5).map(campaign => `
      <div class="recent-item">
        <div class="item-icon">
          <i class="fas fa-flag-checkered"></i>
        </div>
        <div class="item-content">
          <div class="item-title">${campaign.campaignName}</div>
          <div class="item-subtitle">${campaign.difficulty} • ${this.formatDate(campaign.completedAt)}</div>
        </div>
        <div class="item-progress">
          <span class="completion-time">${this.formatDuration(campaign.completionTime)}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = campaignItems;
  }

  /**
   * Update recent achievements display in the main achievements section
   */
  updateRecentAchievements(achievements) {
    const container = this.elements.get('recent-achievements');
    if (!container) {
      console.error('❌ recent-achievements container not found!');
      return;}

    if (!achievements || achievements.length === 0) {
      container.innerHTML = this.createNoActivityMessage(
        'fa-trophy',
        'No Achievements Yet',
        'Play matches and complete challenges to unlock achievements.',
        '/achievements', // Link to a future page explaining achievements
        'Learn More'
      );
      return;}

    // Sort by completion date (most recent first), then by rarity
    const sortedAchievements = achievements.sort((a, b) => {
      if (a.completed && !b.completed) return -1;if (!a.completed && b.completed) return 1;if (a.completedAt && b.completedAt) {
        return new Date(b.completedAt) - new Date(a.completedAt);}
      // Fallback for rarity or points if dates are equal/missing
      return (b.rarity || 0) - (a.rarity || 0) || (b.points || 0) - (a.points || 0);});

    // Limit to a reasonable number, e.g., 20 most recent/relevant
    const recent = sortedAchievements.slice(0, 20);

    let html = '<div class="achievements-grid">';
    recent.forEach(ach => {
      const isCompleted = ach.completed;
      const rarityClass = `rarity-${(ach.rarity || 'common').toLowerCase()}`;
      const completedClass = isCompleted ? 'completed' : 'locked';
      
      html += `
        <div class="achievement-card ${rarityClass} ${completedClass}" title="${ach.description}">
          <div class="achievement-icon">
            <i class="fas ${isCompleted ? ach.icon : 'fa-lock'}"></i>
          </div>
          <div class="achievement-info">
            <h4 class="achievement-title">${ach.name}</h4>
            <p class="achievement-description">${ach.description}</p>
          </div>
          <div class="achievement-status">
            ${isCompleted ? `
              <span class="achievement-date">Unlocked: ${this.formatDate(ach.earnedAt || ach.completedAt)}</span>
              <div class="achievement-rewards">
                <span class="exp-reward"><i class="fas fa-star"></i> ${ach.rewards?.experience || 5} EXP</span>
                <span class="gold-reward"><i class="fas fa-coins"></i> ${ach.rewards?.arenaGold || 5} Gold</span>
                ${(ach.rewards?.honorPoints || 0) > 0 ? `<span class="honor-reward"><i class="fas fa-medal"></i> ${ach.rewards.honorPoints} Honor</span>` : ''}
              </div>
            ` : `
              <span class="achievement-progress">
                ${ach.progress ? `${ach.progress.current}/${ach.progress.total}` : 'Locked'}
              </span>
            `}
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    container.innerHTML = html;
  }

  /**
   * Legacy method - no longer used since campaign achievements moved to main achievements section
   * Kept for backward compatibility
   */
  updateCampaignAchievements(campaignAchievements) {
    // This method is no longer used since we moved campaign achievements to the main achievements section
    // Campaign achievements are now handled in the War Table tab of the achievements section
  }

  /**
   * Show loading state for specific element
   */
  showLoading(elementKey) {
    const element = this.elements.get(elementKey);
    if (!element) return;element.classList.add('loading');
    this.loadingElements.add(elementKey);
    
    // Add loading spinner if not present
    if (!element.querySelector('.loading-spinner')) {
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      element.appendChild(spinner);
    }
  }

  /**
   * Hide loading state for specific element
   */
  hideLoading(elementKey) {
    const element = this.elements.get(elementKey);
    if (!element) return;element.classList.remove('loading');
    this.loadingElements.delete(elementKey);
    
    // Remove loading spinner
    const spinner = element.querySelector('.loading-spinner');
    if (spinner) {
      spinner.remove();
    }
  }

  /**
   * Show error state for specific element
   */
  showError(elementKey, message) {
    const element = this.elements.get(elementKey);
    if (!element) return;element.classList.add('error');
    element.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * Update progress bar with animation
   */
  updateProgressBar(elementKey, percentage) {
    const progressBar = this.elements.get(elementKey);
    if (!progressBar) return;const clampedPercent = Math.max(0, Math.min(100, percentage));
    
    // Animate the progress bar
    progressBar.style.transition = 'width 1s ease-out';
    progressBar.style.width = `${clampedPercent}%`;
  }

  /**
   * Animate points change
   */
  animatePointsChange(elementKey, newValue) {
    const element = this.elements.get(elementKey);
    if (!element) return;const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    
    if (currentValue !== newValue) {
      element.classList.add('points-changed');
      setTimeout(() => {
        element.classList.remove('points-changed');
      }, 1000);
    }
  }

  /**
   * Generic element update with null checks
   */
  updateElement(elementKey, value) {
    const element = this.elements.get(elementKey);
    if (element) {
      element.textContent = value;
    } else {
      // Try to find it directly in DOM
      const directElement = document.querySelector(`#${elementKey.replace(/^#/, '')}`);
      if (directElement) {
        directElement.textContent = value;
      } else {
        console.error(`❌ Element '${elementKey}' not found in cache or DOM`);
      }
    }
  }

  /**
   * Update social link with proper validation
   */
  updateSocialLink(elementKey, url) {
    const element = this.elements.get(elementKey);
    if (!element) return;if (url && url.trim()) {
      element.href = url;
      element.style.display = 'inline-block';
      element.classList.remove('disabled');
    } else {
      element.style.display = 'none';
      element.classList.add('disabled');
    }
  }

  /**
   * Calculate overall stats from player data (consolidated from duplicated functions)
   */
  calculateOverallStats(players) {
    
    let highestMMR = 0;
    let highestRank = null;
    let totalGames = 0;
    let totalWins = 0;
    let totalLosses = 0;

    if (!players || players.length === 0) {
      return {
        highestMMR: 0,
        highestRank: null,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0
      };}

    players.forEach((player, index) => {
      
      if (player.stats) {
        // Handle nested stats structure - stats can be at player.stats or player.stats.stats
        const stats = player.stats.stats || player.stats;
        
        // Try multiple possible field names for stats
        const games = stats.totalMatches || stats.gamesPlayed || stats.matches || 0;
        const wins = stats.wins || 0;
        const losses = stats.losses || 0;
        
        totalGames += games;
        totalWins += wins;
        totalLosses += losses;
        
      } else {
      }
      
      if (player.mmr > highestMMR) {
        highestMMR = player.mmr;
        highestRank = player.rank;
      }
    });

    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

    const result = {
      highestMMR,
      highestRank,
      totalGames,
      totalWins,
      totalLosses,
      winRate
    };
    
    return result;}

  /**
   * Calculate user level from experience
   */
  calculateLevel(experience) {
    return Math.floor(Math.sqrt(experience / 100)) + 1;}

  /**
   * Calculate experience required for specific level
   */
  calculateLevelExperience(level) {
    return Math.pow(level - 1, 2) * 100;}

  /**
   * Create player card HTML
   */
  createPlayerCard(player) {
    // Fix rank image path - don't double-concatenate
    let rankImage = player.rank?.image || 'emblem.png';
    if (!rankImage.startsWith('/assets') && !rankImage.startsWith('http')) {
      rankImage = `/assets/img/ranks/${rankImage}`;
    }
    
    const rankName = player.rank?.name || 'Unranked';
    const mmr = player.mmr || 0;
    
    // Try multiple possible field names for games played
    const stats = player.stats?.stats || player.stats || {};
    const games = stats.totalMatches || stats.gamesPlayed || stats.matches || 0;
    const winRate = stats.winRate || (stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0);

    return `
      <div class="player-card-container" data-player-id="${player._id}">
        <div class="player-card-clickable" onclick="window.showPlayerDetails?.('${player.name}')">
          <div class="player-basic-info">
            <img src="${rankImage}" alt="${rankName}" class="rank-icon">
            <span class="player-name">${player.name}</span>
            <span class="player-rank">${rankName}</span>
          </div>
          <div class="player-mmr-section">
            <span class="mmr-value">${mmr}</span>
            <span class="mmr-label">MMR</span>
          </div>
          <div class="player-stats-row">
            <span class="stat-item">${games} games</span>
            <span class="stat-item">${winRate}% WR</span>
          </div>
          <div class="action-hint">View Stats</div>
        </div>
        <div class="player-unlink-action">
          <button class="btn-unlink" data-player-id="${player._id}" title="Unlink this player">
            <i class="fas fa-unlink"></i>
          </button>
        </div>
      </div>
    `;}

  /**
   * Create tournament card HTML
   */
  createTournamentCard(tournament) {
    return `
      <div class="tournament-card">
        <div class="tournament-info">
          <h3 class="tournament-name">${tournament.name}</h3>
          <div class="tournament-date">${this.formatDate(tournament.startDate)}</div>
          <div class="tournament-status status-${tournament.status.toLowerCase()}">${tournament.status}</div>
        </div>
        <div class="tournament-actions">
          <a href="/views/tournaments.html?id=${tournament._id}" class="btn btn-primary">
            <i class="fas fa-external-link-alt"></i> View Tournament
          </a>
        </div>
      </div>
    `;}

  /**
   * Create no activity message
   */
  createNoActivityMessage(icon, title, description, linkHref, linkText) {
    return `
      <div class="no-activity-message">
        <i class="fas fa-${icon}"></i>
        <h3>${title}</h3>
        <p>${description}</p>
        <div class="activity-actions">
          <a href="${linkHref}" class="btn btn-primary">
            <i class="fas fa-${icon}"></i> ${linkText}
          </a>
        </div>
      </div>
    `;}

  /**
   * Create no players message
   */
  createNoPlayersMessage() {
    return `
      <div class="no-activity-message">
        <i class="fas fa-user-plus"></i>
        <h3>No Players Linked</h3>
        <p>Link your player names to see your ladder statistics.</p>
      </div>
    `;}

  /**
   * Setup global animations
   */
  setupGlobalAnimations() {
    // Add smooth transitions to all tracked elements
    this.elements.forEach((element) => {
      element.style.transition = 'all 0.3s ease';
    });
  }

  /**
   * Utility: Format number with commas
   */
  formatNumber(num) {
    return num.toLocaleString();}

  /**
   * Utility: Format playtime duration
   */
  formatPlaytime(minutes) {
    if (!minutes) return '0h 0m';const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;}

  /**
   * Utility: Format duration
   */
  formatDuration(seconds) {
    if (!seconds) return '0:00';const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;}

  /**
   * Utility: Format date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();}

  /**
   * Add pagination controls
   */
  addPagination(container, data, loadFunction) {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-controls';

    // Previous button
    if (data.hasPrev) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'pagination-btn';
      prevBtn.innerHTML = '« Previous';
      prevBtn.onclick = () => window[loadFunction](data.currentPage - 1);
      paginationContainer.appendChild(prevBtn);
    }

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${data.currentPage} of ${data.totalPages}`;
    paginationContainer.appendChild(pageInfo);

    // Next button
    if (data.hasNext) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'pagination-btn';
      nextBtn.innerHTML = 'Next »';
      nextBtn.onclick = () => window[loadFunction](data.currentPage + 1);
      paginationContainer.appendChild(nextBtn);
    }

    container.appendChild(paginationContainer);
  }

  /**
   * Update clan encampment section
   */
  updateClanManagement(clanData) {
    const clanContainer = document.getElementById('clan-container');
    if (!clanContainer) {
      console.log('🏕️ Clan container not found');
      return;}

    console.log('🏕️ Updating Clan Encampment with data:', clanData);

    // Handle different data structures
    let clans = [];
    if (Array.isArray(clanData)) {
      // Direct array of clans
      clans = clanData;
    } else if (clanData && Array.isArray(clanData.clans)) {
      // Object with clans array
      clans = clanData.clans;
    } else if (clanData && clanData.clan) {
      // Single clan object
      clans = [clanData.clan];
    } else if (clanData && clanData._id) {
      // Single clan object (direct)
      clans = [clanData];
    }

    console.log('🏕️ Processed clans array:', clans);

    // Just show simple buttons - no cards, no descriptions, no icons
    clanContainer.innerHTML = `
      <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
        <button class="btn btn-primary" onclick="clanManager.showCreateClanModal()">
          Create Clan
        </button>
        
        <button class="btn btn-secondary" onclick="clanManager.showBrowseClansModal()">
          Browse Clans
        </button>
      </div>
      
      <div id="user-clans-container">
        ${this.createUserClansDisplay({ clans })}
      </div>
    `;
  }

  /**
   * Create user clans display for the simplified encampment view
   */
  createUserClansDisplay(clanData) {
    if (clanData && clanData.clans && clanData.clans.length > 0) {
      return this.createUserClansHTML(clanData.clans);} else if (clanData && clanData.clan) {
      return this.createUserClansHTML([clanData.clan]);} else {
      return '';}
  }

  /**
   * Create user clans HTML for the simplified encampment view
   */
  createUserClansHTML(clans) {
    return clans.map(clan => `
      <div class="user-clan-card" onclick="viewClanDetails('${clan._id || clan.id}')">
        <div class="clan-card-header">
          <div class="clan-name-tag">
            <span class="clan-name">${clan.name}</span>
            <span class="clan-tag">${clan.tag || 'CLAN'}</span>
          </div>
          <span class="clan-role ${(clan.userRole || 'member').toLowerCase()}">${clan.userRole || 'Member'}</span>
        </div>
        <div class="clan-card-info">
          <div class="clan-member-count">
            <i class="fas fa-users"></i>
            <span>${clan.memberCount || 0} members</span>
          </div>
          <div class="clan-game-type">${this.formatGameType(clan.primaryGame || clan.gameType)}</div>
        </div>
      </div>
    `).join('');}

  /**
   * Create no clans HTML for users without any clans
   */
  createNoClansHTML() {
    return `
      <div class="no-clans-message">
        <i class="fas fa-campground"></i>
        <p>You haven't joined a clan encampment yet.</p>
        <p>Use the buttons above to create or find a clan to join the battle!</p>
      </div>
    `;}

  /**
   * Format game type for display
   */
  formatGameType(gameType) {
    const gameMap = {
      'wc1': 'WC: Orcs & Humans',
      'wc2': 'WC II: Tides of Darkness',
      'wc3': 'WC III: Reign of Chaos',
      'warcraft1': 'WC: Orcs & Humans',
      'warcraft2': 'WC II: Tides of Darkness',
      'warcraft3': 'WC III: Reign of Chaos'
    };
    return gameMap[gameType] || gameType || 'Multiple Games';}


}

// Create and export singleton instance
export const profileUIManager = new ProfileUIManager(); 