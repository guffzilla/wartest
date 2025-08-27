const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Warcraft 3 Neutral Units Data from Wowpedia
const wc3NeutralUnits = [
  // NEUTRAL CREEP UNITS
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Kobold',
    type: 'unit',
    description: 'Small, weak neutral creature found in mines and caves.',
    stats: {
      hp: 150,
      attack: '4-4',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Kobold Geomancer',
    type: 'unit',
    description: 'Kobold spellcaster that can cast healing spells.',
    stats: {
      hp: 200,
      mana: 300,
      attack: '3-3',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [
      {
        name: 'Heal',
        description: 'Heals a friendly unit',
        manaCost: 75,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Gnoll',
    type: 'unit',
    description: 'Wolf-like humanoid creature found in forests.',
    stats: {
      hp: 300,
      attack: '8-8',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Gnoll Warden',
    type: 'unit',
    description: 'Elite gnoll warrior with increased stats.',
    stats: {
      hp: 500,
      attack: '12-12',
      armor: 1,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Murloc',
    type: 'unit',
    description: 'Fish-like creature found near water.',
    stats: {
      hp: 250,
      attack: '6-6',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Murloc Nightcrawler',
    type: 'unit',
    description: 'Elite murloc with increased stats and abilities.',
    stats: {
      hp: 400,
      attack: '10-10',
      armor: 1,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [
      {
        name: 'Net',
        description: 'Entangles an enemy unit',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Ogre',
    type: 'unit',
    description: 'Large, powerful neutral creature.',
    stats: {
      hp: 600,
      attack: '15-15',
      armor: 2,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Ogre Warrior',
    type: 'unit',
    description: 'Elite ogre with increased stats and abilities.',
    stats: {
      hp: 800,
      attack: '20-20',
      armor: 3,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [
      {
        name: 'Bash',
        description: 'Stuns an enemy unit',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Troll',
    type: 'unit',
    description: 'Troll warrior with regeneration abilities.',
    stats: {
      hp: 400,
      attack: '12-12',
      armor: 1,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [
      {
        name: 'Regeneration',
        description: 'Passive ability that regenerates health',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'creep'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Troll Berserker',
    type: 'unit',
    description: 'Elite troll with increased stats and berserker rage.',
    stats: {
      hp: 600,
      attack: '18-18',
      armor: 2,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 0,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Neutral'
    },
    abilities: [
      {
        name: 'Regeneration',
        description: 'Passive ability that regenerates health',
        manaCost: 0,
        cooldown: 0
      },
      {
        name: 'Berserker Rage',
        description: 'Increases attack speed and damage',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'creep'
  },

  // NEUTRAL MERCENARIES
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Bandit',
    type: 'unit',
    description: 'Mercenary unit that can be hired at taverns.',
    stats: {
      hp: 400,
      attack: '14-14',
      armor: 1,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 135,
      wood: 0,
      food: 2
    },
    production: {
      time: 30,
      building: 'Tavern'
    },
    abilities: [],
    upgrades: [],
    category: 'mercenary'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Bandit Lord',
    type: 'unit',
    description: 'Elite bandit with increased stats and leadership abilities.',
    stats: {
      hp: 600,
      attack: '20-20',
      armor: 2,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 245,
      wood: 0,
      food: 4
    },
    production: {
      time: 45,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Leadership',
        description: 'Increases damage of nearby units',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'mercenary'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Mercenary',
    type: 'unit',
    description: 'Professional fighter available for hire.',
    stats: {
      hp: 500,
      attack: '16-16',
      armor: 2,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 180,
      wood: 0,
      food: 3
    },
    production: {
      time: 35,
      building: 'Tavern'
    },
    abilities: [],
    upgrades: [],
    category: 'mercenary'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Mercenary Captain',
    type: 'unit',
    description: 'Elite mercenary with command abilities.',
    stats: {
      hp: 700,
      attack: '22-22',
      armor: 3,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 280,
      wood: 0,
      food: 5
    },
    production: {
      time: 50,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Command Aura',
        description: 'Increases attack damage of nearby units',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'mercenary'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Assassin',
    type: 'unit',
    description: 'Stealthy fighter with critical strike abilities.',
    stats: {
      hp: 450,
      attack: '18-18',
      armor: 1,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 200,
      wood: 0,
      food: 3
    },
    production: {
      time: 40,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Critical Strike',
        description: 'Chance to deal extra damage',
        manaCost: 0,
        cooldown: 0
      },
      {
        name: 'Stealth',
        description: 'Can become invisible',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'mercenary'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Assassin Lord',
    type: 'unit',
    description: 'Elite assassin with enhanced stealth and critical abilities.',
    stats: {
      hp: 650,
      attack: '25-25',
      armor: 2,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 320,
      wood: 0,
      food: 5
    },
    production: {
      time: 55,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Enhanced Critical Strike',
        description: 'Higher chance to deal extra damage',
        manaCost: 0,
        cooldown: 0
      },
      {
        name: 'Improved Stealth',
        description: 'Better stealth abilities',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'mercenary'
  },

  // NEUTRAL HEROES
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Pandaren Brewmaster',
    type: 'unit',
    description: 'Neutral hero with drunken fighting abilities and elemental transformations.',
    stats: {
      hp: 800,
      mana: 400,
      attack: '25-25',
      armor: 3,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 425,
      wood: 0,
      food: 5
    },
    production: {
      time: 60,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Drunken Haze',
        description: 'Slows and reduces accuracy of enemy units',
        manaCost: 75,
        cooldown: 0
      },
      {
        name: 'Drunken Brawler',
        description: 'Passive ability that provides evasion and critical strikes',
        manaCost: 0,
        cooldown: 0
      },
      {
        name: 'Thunder Clap',
        description: 'Area damage and slow effect',
        manaCost: 90,
        cooldown: 0
      },
      {
        name: 'Storm, Earth, and Fire',
        description: 'Splits into three elemental spirits',
        manaCost: 150,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'hero'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Dark Ranger',
    type: 'unit',
    description: 'Neutral hero with dark magic and control abilities.',
    stats: {
      hp: 600,
      mana: 500,
      attack: '20-20',
      armor: 2,
      range: 5,
      sight: 8
    },
    costs: {
      gold: 425,
      wood: 0,
      food: 5
    },
    production: {
      time: 60,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Silence',
        description: 'Prevents enemy units from casting spells',
        manaCost: 75,
        cooldown: 0
      },
      {
        name: 'Black Arrow',
        description: 'Ranged attack that creates skeletons on kill',
        manaCost: 0,
        cooldown: 0
      },
      {
        name: 'Life Drain',
        description: 'Drains life from enemy units',
        manaCost: 50,
        cooldown: 0
      },
      {
        name: 'Charm',
        description: 'Takes control of an enemy unit',
        manaCost: 100,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'hero'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Beastmaster',
    type: 'unit',
    description: 'Neutral hero that summons and controls beasts.',
    stats: {
      hp: 700,
      mana: 450,
      attack: '22-22',
      armor: 2,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 425,
      wood: 0,
      food: 5
    },
    production: {
      time: 60,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Summon Bear',
        description: 'Summons a powerful bear companion',
        manaCost: 75,
        cooldown: 0
      },
      {
        name: 'Summon Hawk',
        description: 'Summons a hawk for scouting',
        manaCost: 50,
        cooldown: 0
      },
      {
        name: 'Summon Quilbeast',
        description: 'Summons a spiked beast',
        manaCost: 75,
        cooldown: 0
      },
      {
        name: 'Stampede',
        description: 'Summons multiple beasts to attack',
        manaCost: 150,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'hero'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Firelord',
    type: 'unit',
    description: 'Neutral hero with fire-based abilities and lava spawn.',
    stats: {
      hp: 650,
      mana: 500,
      attack: '18-18',
      armor: 2,
      range: 5,
      sight: 6
    },
    costs: {
      gold: 425,
      wood: 0,
      food: 5
    },
    production: {
      time: 60,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Soul Burn',
        description: 'Burns enemy units and prevents spell casting',
        manaCost: 75,
        cooldown: 0
      },
      {
        name: 'Summon Lava Spawn',
        description: 'Summons a lava spawn that grows stronger',
        manaCost: 75,
        cooldown: 0
      },
      {
        name: 'Incinerate',
        description: 'Deals damage over time to enemy units',
        manaCost: 90,
        cooldown: 0
      },
      {
        name: 'Volcano',
        description: 'Creates a volcano that damages nearby units',
        manaCost: 150,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'hero'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Goblin Alchemist',
    type: 'unit',
    description: 'Neutral hero with alchemical abilities and gold generation.',
    stats: {
      hp: 600,
      mana: 400,
      attack: '16-16',
      armor: 2,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 425,
      wood: 0,
      food: 5
    },
    production: {
      time: 60,
      building: 'Tavern'
    },
    abilities: [
      {
        name: 'Healing Spray',
        description: 'Heals multiple units in a cone',
        manaCost: 75,
        cooldown: 0
      },
      {
        name: 'Chemical Rage',
        description: 'Increases attack speed and movement speed',
        manaCost: 50,
        cooldown: 0
      },
      {
        name: 'Acid Bomb',
        description: 'Throws acid that damages and slows enemies',
        manaCost: 90,
        cooldown: 0
      },
      {
        name: 'Transmute',
        description: 'Converts enemy units to gold',
        manaCost: 100,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'hero'
  }
];

async function populateWC3NeutralUnits() {
  try {
    console.log('🗑️ Clearing existing WC3 neutral units...');
    await GameUnit.deleteMany({ game: 'wc3', race: 'neutral' });

    console.log('📝 Inserting WC3 neutral units...');
    const result = await GameUnit.insertMany(wc3NeutralUnits);

    // Count by category
    const creepUnits = await GameUnit.countDocuments({ game: 'wc3', race: 'neutral', category: 'creep' });
    const mercenaryUnits = await GameUnit.countDocuments({ game: 'wc3', race: 'neutral', category: 'mercenary' });
    const heroUnits = await GameUnit.countDocuments({ game: 'wc3', race: 'neutral', category: 'hero' });

    console.log('   Creep Units:', creepUnits);
    console.log('   Mercenary Units:', mercenaryUnits);
    console.log('   Hero Units:', heroUnits);
    console.log('   Total:', result.length);

    console.log('✅ WC3 neutral units populated successfully!');
  } catch (error) {
    console.error('❌ Error populating WC3 neutral units:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

populateWC3NeutralUnits(); 