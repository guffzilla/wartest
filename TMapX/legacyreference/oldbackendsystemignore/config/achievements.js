/**
 * Achievement Configuration
 * 
 * This file defines all available achievements in the system.
 * Each achievement should have a unique ID and can be of different types.
 */

const ACHIEVEMENT_TYPES = {
  SINGLE: 'single',      // One-time achievement (e.g., First Win)
  INCREMENTAL: 'incremental', // Achievement with multiple levels (e.g., Win 10 games)
  TIERED: 'tiered'      // Achievement with multiple tiers (e.g., Win 1/10/100 games)
};

/**
 * Base structure for all achievements
 * @typedef {Object} BaseAchievement
 * @property {string} id - Unique identifier for the achievement
 * @property {string} name - Display name of the achievement
 * @property {string} description - Description shown to the user
 * @property {string} icon - Font Awesome icon class
 * @property {string} type - Type of achievement (from ACHIEVEMENT_TYPES)
 * @property {Object} rewards - Rewards for completing the achievement
 * @property {number} rewards.experience - Experience points awarded
 * @property {number} rewards.arenaGold - Arena gold awarded
 * @property {number} rewards.honorPoints - Honor points awarded
 * @property {boolean} hidden - Whether the achievement is hidden until unlocked
 */

/**
 * Achievement configuration
 * @type {Object.<string, BaseAchievement>}
 */
const ACHIEVEMENTS = {
  // Test Achievement - Should be easy to trigger
  TEST_VISIT_PROFILE: {
    id: 'test_visit_profile',
    name: 'First Visit',
    description: 'Visit your profile page for the first time',
    icon: 'fa-user-circle',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'test',
    tags: ['test', 'profile', 'easy']
  },
  
  // Player & Barracks Achievements
  INTO_THE_FRAY: {
    id: 'into_the_fray',
    name: 'Into the Fray',
    description: 'Link a player to your barracks for the first time',
    icon: 'fa-user-shield',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 5

    },
    hidden: false,
    category: 'barracks',
    tags: ['barracks', 'player', 'linking']
  },

  // Clan Achievements
  CLAN_FOUNDER: {
    id: 'clan_founder',
    name: 'Clan Founder',
    description: 'Create your first clan and begin building your legacy',
    icon: 'fa-crown',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 5

    },
    hidden: false,
    category: 'clan',
    tags: ['clan', 'leadership', 'founder']
  },

  BROTHERHOOD: {
    id: 'brotherhood',
    name: 'Brotherhood',
    description: 'Join your first clan and become part of something greater',
    icon: 'fa-users',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 5

    },
    hidden: false,
    category: 'clan',
    tags: ['clan', 'community', 'joining']
  },

  // Social & Forum Achievements
  FIRST_FRIEND: {
    id: 'first_friend',
    name: 'Making Friends',
    description: 'Add your first friend',
    icon: 'fa-user-plus',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  FRIENDLY: {
    id: 'friendly',
    name: 'Friendly Player',
    description: 'Add 5 friends',
    icon: 'fa-user-friends',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 5,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Add 20 friends',
    icon: 'fa-users',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 20,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  // Forum Achievements
  FIRST_FORUM_POST: {
    id: 'first_forum_post',
    name: 'First Steps',
    description: 'Make your first forum post',
    icon: 'fa-comment',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  FORUM_CONTRIBUTOR: {
    id: 'forum_contributor',
    name: 'Forum Contributor',
    description: 'Make 5 forum posts',
    icon: 'fa-comments',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 5,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  FORUM_REGULAR: {
    id: 'forum_regular',
    name: 'Forum Regular',
    description: 'Make 25 forum posts',
    icon: 'fa-comment-dots',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 25,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  FORUM_LEADER: {
    id: 'forum_leader',
    name: 'Forum Leader',
    description: 'Make 100 forum posts',
    icon: 'fa-comment-medical',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 100,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  FIRST_TOPIC: {
    id: 'first_topic',
    name: 'Conversation Starter',
    description: 'Create your first forum topic',
    icon: 'fa-plus-circle',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  TOPIC_MASTER: {
    id: 'topic_master',
    name: 'Topic Master',
    description: 'Create 10 forum topics',
    icon: 'fa-comment-alt',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 10,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  // Chat Achievements
  FIRST_PM: {
    id: 'first_pm',
    name: 'First Message',
    description: 'Send your first private message',
    icon: 'fa-envelope',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  CHAT_CREATOR: {
    id: 'chat_creator',
    name: 'Chat Room Creator',
    description: 'Create a chat room',
    icon: 'fa-plus-square',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  CHATTERBOX: {
    id: 'chatterbox',
    name: 'Chatterbox',
    description: 'Send 100 messages in chat rooms',
    icon: 'fa-comment-alt',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 100,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  // Profile Interaction Achievements
  PROFILE_VISITOR: {
    id: 'profile_visitor',
    name: 'Profile Visitor',
    description: 'Visit another player\'s profile',
    icon: 'fa-user-check',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  PROFILE_COMMENTER: {
    id: 'profile_commenter',
    name: 'Profile Commenter',
    description: 'Leave a comment on a player\'s profile',
    icon: 'fa-comment',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  // Map Achievements
  FIRST_MAP_RATING: {
    id: 'first_map_rating',
    name: 'Map Critic',
    description: 'Rate a custom map',
    icon: 'fa-star',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  MAP_REVIEWER: {
    id: 'map_reviewer',
    name: 'Map Reviewer',
    description: 'Rate 10 different maps',
    icon: 'fa-star-half-alt',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 10,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  MAP_CREATOR: {
    id: 'map_creator',
    name: 'Map Creator',
    description: 'Create and upload a custom map',
    icon: 'fa-map',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  MAP_MASTER: {
    id: 'map_master',
    name: 'Map Master',
    description: 'Create 5 custom maps',
    icon: 'fa-map-marked-alt',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    target: 5,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  CARTOGRAPHER: {
    id: 'cartographer',
    name: 'Cartographer',
    description: 'Upload your first custom map to the community',
    icon: 'fa-map-marked-alt',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {
      experience: 5,
      arenaGold: 5,
      honorPoints: 0
    },
    hidden: false,
    category: 'maps'
  },
  
  // First Win Achievements
  FIRST_WIN: {
    id: 'first_win',
    name: 'First Blood',
    description: 'Win your first game',
    icon: 'fa-trophy',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  FIRST_REPORT: {
    id: 'first_report',
    name: 'Good Sport',
    description: 'Report your first defeat',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  // Game Mode Wins (1v1, 2v2, 3v3, 4v4, FFA)
  WINS_1V1: {
    id: 'wins_1v1',
    name: '1v1 Champion',
    description: 'Win games in 1v1',
    icon: 'fa-user',
    type: ACHIEVEMENT_TYPES.TIERED,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    tiers: [
      { threshold: 1, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 10, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 25, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 50, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 100, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 200, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 500, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 1000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 2000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } }
    ]
  },
  
  WINS_2V2: {
    id: 'wins_2v2',
    name: '2v2 Specialist',
    description: 'Win games in 2v2',
    icon: 'fa-user-friends',
    type: ACHIEVEMENT_TYPES.TIERED,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    tiers: [
      { threshold: 1, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 10, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 25, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 50, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 100, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 200, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 500, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 1000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 2000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } }
    ]
  },
  
  WINS_3V3: {
    id: 'wins_3v3',
    name: '3v3 Veteran',
    description: 'Win games in 3v3',
    icon: 'fa-users',
    type: ACHIEVEMENT_TYPES.TIERED,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    tiers: [
      { threshold: 1, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 10, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 25, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 50, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 100, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 200, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 500, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 1000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 2000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } }
    ]
  },
  
  WINS_4V4: {
    id: 'wins_4v4',
    name: '4v4 Warlord',
    description: 'Win games in 4v4',
    icon: 'fa-users',
    type: ACHIEVEMENT_TYPES.TIERED,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    tiers: [
      { threshold: 1, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 10, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 25, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 50, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 100, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 200, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 500, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 1000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 2000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } }
    ]
  },
  
  WINS_FFA: {
    id: 'wins_ffa',
    name: 'Free For All Champion',
    description: 'Win Free For All games',
    icon: 'fa-crown',
    type: ACHIEVEMENT_TYPES.TIERED,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    tiers: [
      { threshold: 1, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 10, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 25, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 50, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 100, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 200, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 500, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 1000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } },
      { threshold: 2000, rewards: { experience: 5, arenaGold: 5, honorPoints: 0 } }
    ]
  },
  
  // Warcraft 1 Campaigns
  WC1_HUMAN_CAMPAIGN: {
    id: 'wc1_human_campaign',
    name: 'Human Champion',
    description: 'Complete the Warcraft 1 Human Campaign',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC1_ORC_CAMPAIGN: {
    id: 'wc1_orc_campaign',
    name: 'Orc Warlord',
    description: 'Complete the Warcraft 1 Orc Campaign',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  // Warcraft 2 Campaigns
  WC2_HUMAN_CAMPAIGN: {
    id: 'wc2_human_campaign',
    name: 'Hero of the Alliance',
    description: 'Complete the Warcraft 2 Human Campaign',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC2_ORC_CAMPAIGN: {
    id: 'wc2_orc_campaign',
    name: 'Warchief of the Horde',
    description: 'Complete the Warcraft 2 Orc Campaign',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC2_BTDP_HUMAN: {
    id: 'wc2_btdp_human',
    name: 'Beyond the Dark Portal: Alliance',
    description: 'Complete the Warcraft 2: Beyond the Dark Portal Human Campaign',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC2_BTDP_ORC: {
    id: 'wc2_btdp_orc',
    name: 'Beyond the Dark Portal: Horde',
    description: 'Complete the Warcraft 2: Beyond the Dark Portal Orc Campaign',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  // Warcraft 3 Campaigns
  WC3_ROC_HUMAN: {
    id: 'wc3_roc_human',
    name: 'Champion of Lordaeron',
    description: 'Complete the Warcraft 3: Reign of Chaos Human Campaign',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC3_ROC_UNDEAD: {
    id: 'wc3_roc_undead',
    name: 'Scourge of Lordaeron',
    description: 'Complete the Warcraft 3: Reign of Chaos Undead Campaign',
    icon: 'fa-skull',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC3_ROC_ORC: {
    id: 'wc3_roc_orc',
    name: 'Chieftain of the Horde',
    description: 'Complete the Warcraft 3: Reign of Chaos Orc Campaign',
    icon: 'fa-flag',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC3_ROC_NIGHT_ELF: {
    id: 'wc3_roc_night_elf',
    name: 'Guardian of Kalimdor',
    description: 'Complete the Warcraft 3: Reign of Chaos Night Elf Campaign',
    icon: 'fa-moon',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC3_TFT_HUMAN: {
    id: 'wc3_tft_human',
    name: 'Son of the Storm',
    description: 'Complete the Warcraft 3: The Frozen Throne Human Campaign',
    icon: 'fa-bolt',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC3_TFT_UNDEAD: {
    id: 'wc3_tft_undead',
    name: 'The Dark Lady',
    description: 'Complete the Warcraft 3: The Frozen Throne Undead Campaign',
    icon: 'fa-skull',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC3_TFT_NIGHT_ELF: {
    id: 'wc3_tft_night_elf',
    name: 'The Demon Hunter',
    description: 'Complete the Warcraft 3: The Frozen Throne Night Elf Campaign',
    icon: 'fa-moon',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  WC3_TFT_BONUS: {
    id: 'wc3_tft_bonus',
    name: 'The Frozen Throne',
    description: 'Complete the Warcraft 3: The Frozen Throne Bonus Campaign',
    icon: 'fa-ice-cream',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  // Campaign Completionist Achievements
  WC1_COMPLETIONIST: {
    id: 'wc1_completionist',
    name: 'Master of Warcraft',
    description: 'Complete both Warcraft 1 campaigns',
    icon: 'fa-trophy',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: true
  },
  
  WC2_COMPLETIONIST: {
    id: 'wc2_completionist',
    name: 'Veteran of the Second War',
    description: 'Complete all Warcraft 2 campaigns',
    icon: 'fa-trophy',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: true
  },
  
  WC3_COMPLETIONIST: {
    id: 'wc3_completionist',
    name: 'Champion of the Frozen Throne',
    description: 'Complete all Warcraft 3 campaigns',
    icon: 'fa-trophy',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: true
  },
  
  WARCRAFT_MASTER: {
    id: 'warcraft_master',
    name: 'Warcraft Master',
    description: 'Complete all Warcraft campaigns',
    icon: 'fa-crown',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: true
  },
  
  // Special Achievements
  PERFECT_VICTORY: {
    id: 'perfect_victory',
    name: 'Perfect Victory',
    description: 'Win a game without losing any units',
    icon: 'fa-star',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false
  },
  
  COMEBACK_KING: {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Win a game after being down to less than 10% health',
    icon: 'fa-heart-broken',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: true
  },
  
  // Social Achievements
  FRIENDLY_RIVALRY: {
    id: 'friendly_rivalry',
    name: 'Friendly Rivalry',
    description: 'Play against the same opponent 10 times',
    icon: 'fa-handshake',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    target: 10
  },
  
  // Milestone Achievements
  VETERAN: {
    id: 'veteran',
    name: 'Veteran',
    description: 'Play 100 games',
    icon: 'fa-medal',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    target: 100
  },

  // Campaign Mission Achievements
  FIRST_CAMPAIGN_MISSION: {
    id: 'first_campaign_mission',
    name: 'First Steps',
    description: 'Complete your first campaign mission',
    icon: 'fa-flag-checkered',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  CAMPAIGN_MISSIONS_5: {
    id: 'campaign_missions_5',
    name: 'Getting Started',
    description: 'Complete 5 campaign missions',
    icon: 'fa-tasks',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  CAMPAIGN_MISSIONS_10: {
    id: 'campaign_missions_10',
    name: 'Mission Veteran',
    description: 'Complete 10 campaign missions',
    icon: 'fa-list-check',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  CAMPAIGN_MISSIONS_25: {
    id: 'campaign_missions_25',
    name: 'Campaign Warrior',
    description: 'Complete 25 campaign missions',
    icon: 'fa-sword',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  CAMPAIGN_MISSIONS_50: {
    id: 'campaign_missions_50',
    name: 'Mission Master',
    description: 'Complete 50 campaign missions',
    icon: 'fa-crown',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  CAMPAIGN_MISSIONS_100: {
    id: 'campaign_missions_100',
    name: 'Campaign Legend',
    description: 'Complete 100 campaign missions',
    icon: 'fa-trophy',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  // Difficulty-based achievements
  FIRST_HARD_MISSION: {
    id: 'first_hard_mission',
    name: 'Rising to the Challenge',
    description: 'Complete your first mission on Hard difficulty',
    icon: 'fa-fire',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  HARD_MISSIONS_5: {
    id: 'hard_missions_5',
    name: 'Hardcore Gamer',
    description: 'Complete 5 missions on Hard difficulty',
    icon: 'fa-skull',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  HARD_MISSIONS_10: {
    id: 'hard_missions_10',
    name: 'Master of Difficulty',
    description: 'Complete 10 missions on Hard difficulty',
    icon: 'fa-mountain',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  // Speedrun achievements
  FIRST_SPEEDRUN: {
    id: 'first_speedrun',
    name: 'Need for Speed',
    description: 'Complete your first speedrun mission',
    icon: 'fa-stopwatch',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'speedrun'
  },

  SPEEDRUN_5: {
    id: 'speedrun_5',
    name: 'Speed Demon',
    description: 'Complete 5 speedrun missions',
    icon: 'fa-tachometer-alt',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'speedrun'
  },

  SPEEDRUN_10: {
    id: 'speedrun_10',
    name: 'Speedrun Master',
    description: 'Complete 10 speedrun missions',
    icon: 'fa-rocket',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'speedrun'
  },

  SPEEDRUN_UNDER_10_MINUTES: {
    id: 'speedrun_under_10_minutes',
    name: 'Lightning Fast',
    description: 'Complete a mission in under 10 minutes',
    icon: 'fa-bolt',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'speedrun'
  },

  SPEEDRUN_UNDER_5_MINUTES: {
    id: 'speedrun_under_5_minutes',
    name: 'Supersonic',
    description: 'Complete a mission in under 5 minutes',
    icon: 'fa-meteor',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'speedrun'
  },

  // Multiple playthrough achievements
  MISSION_COMPLETIONIST: {
    id: 'mission_completionist',
    name: 'Perfectionist',
    description: 'Complete the same mission on all three difficulties',
    icon: 'fa-star',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  MULTIPLE_PLAYTHROUGHS: {
    id: 'multiple_playthroughs',
    name: 'Replay Master',
    description: 'Complete the same mission 3 times',
    icon: 'fa-redo',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  // Game-specific first mission achievements
  FIRST_WC1_MISSION: {
    id: 'first_wc1_mission',
    name: 'Orcs & Humans Veteran',
    description: 'Complete your first Warcraft: Orcs & Humans mission',
    icon: 'fa-castle',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  FIRST_WC2_MISSION: {
    id: 'first_wc2_mission',
    name: 'Tides of Darkness Veteran',
    description: 'Complete your first Warcraft II mission',
    icon: 'fa-ship',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  FIRST_WC3_MISSION: {
    id: 'first_wc3_mission',
    name: 'Reign of Chaos Veteran',
    description: 'Complete your first Warcraft III mission',
    icon: 'fa-fire',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {

      experience: 5,

      arenaGold: 5,

      honorPoints: 0

    },
    hidden: false,
    category: 'campaign'
  },

  // ===========================================
  // WIKI CONTRIBUTION ACHIEVEMENTS
  // ===========================================
  
  // First Wiki Edit
  WIKI_FIRST_EDIT: {
    id: 'wiki_first_edit',
    name: 'Knowledge Seeker',
    description: 'Make your first contribution to the Wizard\'s Tower wiki',
    icon: 'fa-edit',
    type: ACHIEVEMENT_TYPES.SINGLE,
    rewards: {
      experience: 25,
      arenaGold: 50,
      honorPoints: 10
    },
    hidden: false,
    category: 'wiki',
    tags: ['wiki', 'contribution', 'first_time']
  },

  // Wiki Editor Tiers
  WIKI_EDITOR: {
    id: 'wiki_editor',
    name: 'Wiki Editor',
    description: 'Contribute valuable knowledge to the wiki',
    icon: 'fa-feather-alt',
    type: ACHIEVEMENT_TYPES.TIERED,
    tiers: {
      1: { threshold: 5, name: 'Apprentice Scribe', rewards: { experience: 50, arenaGold: 100, honorPoints: 20 } },
      2: { threshold: 15, name: 'Journeyman Scholar', rewards: { experience: 100, arenaGold: 200, honorPoints: 40 } },
      3: { threshold: 50, name: 'Master Chronicler', rewards: { experience: 200, arenaGold: 500, honorPoints: 100 } },
      4: { threshold: 100, name: 'Grand Archivist', rewards: { experience: 500, arenaGold: 1000, honorPoints: 250 } },
      5: { threshold: 250, name: 'Legendary Lorekeeper', rewards: { experience: 1000, arenaGold: 2500, honorPoints: 500 } }
    },
    category: 'wiki',
    tags: ['wiki', 'contribution', 'tiered']
  },

  // Quality Contributor
  WIKI_QUALITY: {
    id: 'wiki_quality',
    name: 'Quality Contributor',
    description: 'Maintain high-quality wiki contributions',
    icon: 'fa-medal',
    type: ACHIEVEMENT_TYPES.SINGLE,
    requirements: {
      approvedEdits: 10,
      approvalRate: 0.9,
      averageQuality: 70
    },
    rewards: {
      experience: 150,
      arenaGold: 300,
      honorPoints: 75
    },
    hidden: false,
    category: 'wiki',
    tags: ['wiki', 'quality', 'excellence']
  },

  // Community Favorite
  WIKI_COMMUNITY_FAVORITE: {
    id: 'wiki_community_favorite',
    name: 'Community Favorite',
    description: 'Receive 100 helpful votes on your wiki contributions',
    icon: 'fa-heart',
    type: ACHIEVEMENT_TYPES.INCREMENTAL,
    maxProgress: 100,
    rewards: {
      experience: 200,
      arenaGold: 400,
      honorPoints: 100
    },
    hidden: false,
    category: 'wiki',
    tags: ['wiki', 'community', 'votes']
  },

  // Game Specialist Achievements
  WIKI_WC1_SPECIALIST: {
    id: 'wiki_wc1_specialist',
    name: 'Warcraft I Specialist',
    description: 'Become an expert contributor for Warcraft I content',
    icon: 'fa-sword',
    type: ACHIEVEMENT_TYPES.SINGLE,
    requirements: {
      game: 'wc1',
      approvedEdits: 25,
      specialistScore: 100
    },
    rewards: {
      experience: 150,
      arenaGold: 400,
      honorPoints: 80
    },
    hidden: false,
    category: 'wiki',
    tags: ['wiki', 'specialist', 'wc1']
  },

  WIKI_WC2_SPECIALIST: {
    id: 'wiki_wc2_specialist',
    name: 'Warcraft II Specialist',
    description: 'Become an expert contributor for Warcraft II content',
    icon: 'fa-shield',
    type: ACHIEVEMENT_TYPES.SINGLE,
    requirements: {
      game: 'wc2',
      approvedEdits: 25,
      specialistScore: 100
    },
    rewards: {
      experience: 150,
      arenaGold: 400,
      honorPoints: 80
    },
    hidden: false,
    category: 'wiki',
    tags: ['wiki', 'specialist', 'wc2']
  },

  WIKI_WC3_SPECIALIST: {
    id: 'wiki_wc3_specialist',
    name: 'Warcraft III Specialist',
    description: 'Become an expert contributor for Warcraft III content',
    icon: 'fa-crown',
    type: ACHIEVEMENT_TYPES.SINGLE,
    requirements: {
      game: 'wc3',
      approvedEdits: 25,
      specialistScore: 100
    },
    rewards: {
      experience: 150,
      arenaGold: 400,
      honorPoints: 80
    },
    hidden: false,
    category: 'wiki',
    tags: ['wiki', 'specialist', 'wc3']
  },

  // Wiki Moderator Achievement
  WIKI_MODERATOR: {
    id: 'wiki_moderator',
    name: 'Guardian of Knowledge',
    description: 'Help moderate and improve wiki content quality',
    icon: 'fa-gavel',
    type: ACHIEVEMENT_TYPES.SINGLE,
    requirements: {
      isModerator: true,
      moderationReviews: 50
    },
    rewards: {
      experience: 300,
      arenaGold: 600,
      honorPoints: 150
    },
    hidden: true,
    category: 'wiki',
    tags: ['wiki', 'moderation', 'leadership']
  },

  // Comprehensive Contributor
  WIKI_COMPREHENSIVE: {
    id: 'wiki_comprehensive',
    name: 'Comprehensive Contributor',
    description: 'Contribute to all aspects of the wiki across all games',
    icon: 'fa-globe',
    type: ACHIEVEMENT_TYPES.SINGLE,
    requirements: {
      gamesContributed: ['wc1', 'wc2', 'wc3'],
      categoriesContributed: ['unit', 'building', 'hero'],
      totalEdits: 75
    },
    rewards: {
      experience: 400,
      arenaGold: 800,
      honorPoints: 200
    },
    hidden: false,
    category: 'wiki',
    tags: ['wiki', 'comprehensive', 'all_games']
  }
};

/**
 * Get all achievements
 * @returns {Array<BaseAchievement>} Array of all achievements
 */
function getAllAchievements() {
  return Object.values(ACHIEVEMENTS);
}

/**
 * Get an achievement by ID
 * @param {string} achievementId - The ID of the achievement to get
 * @returns {BaseAchievement|undefined} The achievement or undefined if not found
 */
function getAchievementById(achievementId) {
  // First try direct key lookup (for backwards compatibility)
  if (ACHIEVEMENTS[achievementId]) {
    return ACHIEVEMENTS[achievementId];
  }
  
  // Then search by the id field
  return Object.values(ACHIEVEMENTS).find(achievement => achievement.id === achievementId);
}

/**
 * Get achievements by type
 * @param {string} type - The type of achievements to get
 * @returns {Array<BaseAchievement>} Array of matching achievements
 */
function getAchievementsByType(type) {
  return getAllAchievements().filter(ach => ach.type === type);
}

// Export all achievements and utility functions
module.exports = {
  ACHIEVEMENT_TYPES,
  ACHIEVEMENTS,
  getAllAchievements,
  getAchievementById,
  getAchievementsByType
};

// Also export the functions directly for easier importing
module.exports.getAllAchievements = getAllAchievements;
module.exports.getAchievementById = getAchievementById;
module.exports.getAchievementsByType = getAchievementsByType;
