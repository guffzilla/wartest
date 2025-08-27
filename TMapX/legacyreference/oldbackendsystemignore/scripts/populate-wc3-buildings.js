const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Warcraft 3 Buildings Data from Wowpedia
const wc3Buildings = [
  // HUMAN BUILDINGS
  {
    game: 'wc3',
    race: 'human',
    name: 'Town Hall',
    type: 'building',
    description: 'Main building that provides food and allows resource gathering. Can be upgraded to Keep and Castle.',
    stats: {
      hp: 1500,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 400,
      wood: 185
    },
    production: {
      time: 150,
      requirements: []
    },
    upgrades: [
      {
        name: 'Keep',
        description: 'Upgrades Town Hall to Keep, increases HP and allows more advanced units',
        cost: { gold: 320, wood: 160 },
        effect: '+500 HP, unlocks advanced units'
      },
      {
        name: 'Castle',
        description: 'Upgrades Keep to Castle, maximum tier building',
        cost: { gold: 400, wood: 200 },
        effect: '+500 HP, unlocks all units'
      }
    ],
    abilities: [
      {
        name: 'Call to Arms',
        description: 'Temporarily converts nearby peasants to militia',
        manaCost: 0,
        cooldown: 0
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Farm',
    type: 'building',
    description: 'Provides food supply for your army.',
    stats: {
      hp: 500,
      armor: 0,
      sight: 6
    },
    costs: {
      gold: 80,
      wood: 0
    },
    production: {
      time: 40,
      requirements: []
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Barracks',
    type: 'building',
    description: 'Produces basic military units: Footmen, Knights, and Riflemen.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 180,
      wood: 40
    },
    production: {
      time: 100,
      requirements: ['Town Hall']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Blacksmith',
    type: 'building',
    description: 'Provides weapon and armor upgrades for military units.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 150,
      wood: 40
    },
    production: {
      time: 80,
      requirements: ['Barracks']
    },
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage for melee units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Iron Plated Armor',
        description: 'Increases armor for all units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Workshop',
    type: 'building',
    description: 'Produces mechanical units: Mortar Teams, Gyrocopters, and Flying Machines.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 140,
      wood: 100
    },
    production: {
      time: 100,
      requirements: ['Blacksmith']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Lumber Mill',
    type: 'building',
    description: 'Provides wood gathering upgrades and produces workers.',
    stats: {
      hp: 1000,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 140,
      wood: 0
    },
    production: {
      time: 80,
      requirements: ['Town Hall']
    },
    upgrades: [
      {
        name: 'Improved Lumber Harvesting',
        description: 'Increases wood gathering speed',
        cost: { gold: 100, wood: 0 },
        effect: '+20% wood gathering'
      },
      {
        name: 'Advanced Lumber Harvesting',
        description: 'Further increases wood gathering speed',
        cost: { gold: 175, wood: 0 },
        effect: '+40% wood gathering'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Church',
    type: 'building',
    description: 'Produces spellcasters: Priests and Sorceresses.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0
    },
    production: {
      time: 100,
      requirements: ['Barracks']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Tower',
    type: 'building',
    description: 'Defensive structure that attacks enemy units.',
    stats: {
      hp: 800,
      armor: 5,
      sight: 10
    },
    costs: {
      gold: 150,
      wood: 0
    },
    production: {
      time: 60,
      requirements: ['Town Hall']
    },
    upgrades: [
      {
        name: 'Guard Tower',
        description: 'Upgrades Tower to Guard Tower with increased damage',
        cost: { gold: 100, wood: 0 },
        effect: '+50% damage'
      },
      {
        name: 'Cannon Tower',
        description: 'Upgrades Guard Tower to Cannon Tower with area damage',
        cost: { gold: 100, wood: 0 },
        effect: 'Area damage, +100% damage'
      }
    ]
  },

  // ORC BUILDINGS
  {
    game: 'wc3',
    race: 'orc',
    name: 'Great Hall',
    type: 'building',
    description: 'Main building that provides food and allows resource gathering. Can be upgraded to Stronghold and Fortress.',
    stats: {
      hp: 1500,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 400,
      wood: 185
    },
    production: {
      time: 150,
      requirements: []
    },
    upgrades: [
      {
        name: 'Stronghold',
        description: 'Upgrades Great Hall to Stronghold, increases HP and allows more advanced units',
        cost: { gold: 320, wood: 160 },
        effect: '+500 HP, unlocks advanced units'
      },
      {
        name: 'Fortress',
        description: 'Upgrades Stronghold to Fortress, maximum tier building',
        cost: { gold: 400, wood: 200 },
        effect: '+500 HP, unlocks all units'
      }
    ],
    abilities: [
      {
        name: 'Call to Arms',
        description: 'Temporarily converts nearby peons to militia',
        manaCost: 0,
        cooldown: 0
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Pig Farm',
    type: 'building',
    description: 'Provides food supply for your army.',
    stats: {
      hp: 500,
      armor: 0,
      sight: 6
    },
    costs: {
      gold: 80,
      wood: 0
    },
    production: {
      time: 40,
      requirements: []
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Barracks',
    type: 'building',
    description: 'Produces basic military units: Grunts, Raiders, and Troll Headhunters.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 180,
      wood: 40
    },
    production: {
      time: 100,
      requirements: ['Great Hall']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'War Mill',
    type: 'building',
    description: 'Provides weapon and armor upgrades for military units.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 150,
      wood: 40
    },
    production: {
      time: 80,
      requirements: ['Barracks']
    },
    upgrades: [
      {
        name: 'Steel Melee Weapons',
        description: 'Increases attack damage for melee units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Ranged Weapons',
        description: 'Increases attack damage for ranged units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Iron Plated Armor',
        description: 'Increases armor for all units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Altar of Storms',
    type: 'building',
    description: 'Produces spellcasters: Shamans and Warlocks.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0
    },
    production: {
      time: 100,
      requirements: ['Barracks']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Beastiary',
    type: 'building',
    description: 'Produces beast units: Kodo Beasts and Tauren.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 140,
      wood: 100
    },
    production: {
      time: 100,
      requirements: ['War Mill']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Watch Tower',
    type: 'building',
    description: 'Defensive structure that attacks enemy units.',
    stats: {
      hp: 800,
      armor: 5,
      sight: 10
    },
    costs: {
      gold: 150,
      wood: 0
    },
    production: {
      time: 60,
      requirements: ['Great Hall']
    },
    upgrades: [
      {
        name: 'Guard Tower',
        description: 'Upgrades Watch Tower to Guard Tower with increased damage',
        cost: { gold: 100, wood: 0 },
        effect: '+50% damage'
      },
      {
        name: 'Cannon Tower',
        description: 'Upgrades Guard Tower to Cannon Tower with area damage',
        cost: { gold: 100, wood: 0 },
        effect: 'Area damage, +100% damage'
      }
    ]
  },

  // UNDEAD BUILDINGS
  {
    game: 'wc3',
    race: 'undead',
    name: 'Necropolis',
    type: 'building',
    description: 'Main building that provides food and allows resource gathering. Can be upgraded to Halls of the Dead and Black Citadel.',
    stats: {
      hp: 1500,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 400,
      wood: 185
    },
    production: {
      time: 150,
      requirements: []
    },
    upgrades: [
      {
        name: 'Halls of the Dead',
        description: 'Upgrades Necropolis to Halls of the Dead, increases HP and allows more advanced units',
        cost: { gold: 320, wood: 160 },
        effect: '+500 HP, unlocks advanced units'
      },
      {
        name: 'Black Citadel',
        description: 'Upgrades Halls of the Dead to Black Citadel, maximum tier building',
        cost: { gold: 400, wood: 200 },
        effect: '+500 HP, unlocks all units'
      }
    ],
    abilities: [
      {
        name: 'Call to Arms',
        description: 'Temporarily converts nearby acolytes to militia',
        manaCost: 0,
        cooldown: 0
      }
    ]
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Ziggurat',
    type: 'building',
    description: 'Provides food supply and can be upgraded to defensive towers.',
    stats: {
      hp: 500,
      armor: 0,
      sight: 6
    },
    costs: {
      gold: 80,
      wood: 0
    },
    production: {
      time: 40,
      requirements: []
    },
    upgrades: [
      {
        name: 'Spirit Tower',
        description: 'Upgrades Ziggurat to Spirit Tower for defense',
        cost: { gold: 100, wood: 0 },
        effect: 'Becomes defensive tower'
      },
      {
        name: 'Nerubian Tower',
        description: 'Upgrades Spirit Tower to Nerubian Tower with increased damage',
        cost: { gold: 100, wood: 0 },
        effect: '+50% damage'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Crypt',
    type: 'building',
    description: 'Produces basic military units: Ghouls and Abominations.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 180,
      wood: 40
    },
    production: {
      time: 100,
      requirements: ['Necropolis']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Graveyard',
    type: 'building',
    description: 'Provides weapon and armor upgrades for military units.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 150,
      wood: 40
    },
    production: {
      time: 80,
      requirements: ['Crypt']
    },
    upgrades: [
      {
        name: 'Skeletal Longswords',
        description: 'Increases attack damage for melee units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Bone Armor',
        description: 'Increases armor for all units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Temple of the Damned',
    type: 'building',
    description: 'Produces spellcasters: Necromancers and Death Knights.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0
    },
    production: {
      time: 100,
      requirements: ['Crypt']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Slaughterhouse',
    type: 'building',
    description: 'Produces heavy units: Abominations and Meat Wagons.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 140,
      wood: 100
    },
    production: {
      time: 100,
      requirements: ['Graveyard']
    },
    upgrades: []
  },

  // NIGHT ELF BUILDINGS
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Tree of Life',
    type: 'building',
    description: 'Main building that provides food and allows resource gathering. Can be upgraded to Tree of Ages and Tree of Eternity.',
    stats: {
      hp: 1500,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 400,
      wood: 185
    },
    production: {
      time: 150,
      requirements: []
    },
    upgrades: [
      {
        name: 'Tree of Ages',
        description: 'Upgrades Tree of Life to Tree of Ages, increases HP and allows more advanced units',
        cost: { gold: 320, wood: 160 },
        effect: '+500 HP, unlocks advanced units'
      },
      {
        name: 'Tree of Eternity',
        description: 'Upgrades Tree of Ages to Tree of Eternity, maximum tier building',
        cost: { gold: 400, wood: 200 },
        effect: '+500 HP, unlocks all units'
      }
    ],
    abilities: [
      {
        name: 'Call to Arms',
        description: 'Temporarily converts nearby wisps to militia',
        manaCost: 0,
        cooldown: 0
      }
    ]
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Moon Well',
    type: 'building',
    description: 'Provides food supply and can heal units. Can be upgraded for increased healing.',
    stats: {
      hp: 500,
      armor: 0,
      sight: 6
    },
    costs: {
      gold: 80,
      wood: 0
    },
    production: {
      time: 40,
      requirements: []
    },
    upgrades: [
      {
        name: 'Improved Moon Well',
        description: 'Increases healing capacity',
        cost: { gold: 100, wood: 0 },
        effect: '+50% healing'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Ancient of War',
    type: 'building',
    description: 'Produces basic military units: Archers and Huntresses.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 180,
      wood: 40
    },
    production: {
      time: 100,
      requirements: ['Tree of Life']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Ancient of Lore',
    type: 'building',
    description: 'Produces spellcasters: Dryads and Druids.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0
    },
    production: {
      time: 100,
      requirements: ['Ancient of War']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Ancient of Wind',
    type: 'building',
    description: 'Produces flying units: Hippogryphs and Chimaeras.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 140,
      wood: 100
    },
    production: {
      time: 100,
      requirements: ['Ancient of Lore']
    },
    upgrades: []
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Hunter\'s Hall',
    type: 'building',
    description: 'Provides weapon and armor upgrades for military units.',
    stats: {
      hp: 1200,
      armor: 5,
      sight: 8
    },
    costs: {
      gold: 150,
      wood: 40
    },
    production: {
      time: 80,
      requirements: ['Ancient of War']
    },
    upgrades: [
      {
        name: 'Improved Bows',
        description: 'Increases attack damage for ranged units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Reinforced Hides',
        description: 'Increases armor for all units',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  }
];

async function populateWC3Buildings() {
  try {
    console.log('🗑️ Clearing existing WC3 buildings...');
    await GameUnit.deleteMany({ game: 'wc3', type: 'building' });

    console.log('📝 Inserting WC3 buildings...');
    const result = await GameUnit.insertMany(wc3Buildings);

    // Count by race
    const humanBuildings = await GameUnit.countDocuments({ game: 'wc3', race: 'human', type: 'building' });
    const orcBuildings = await GameUnit.countDocuments({ game: 'wc3', race: 'orc', type: 'building' });
    const undeadBuildings = await GameUnit.countDocuments({ game: 'wc3', race: 'undead', type: 'building' });
    const nightelfBuildings = await GameUnit.countDocuments({ game: 'wc3', race: 'nightelf', type: 'building' });

    console.log('   Human Buildings:', humanBuildings);
    console.log('   Orc Buildings:', orcBuildings);
    console.log('   Undead Buildings:', undeadBuildings);
    console.log('   Night Elf Buildings:', nightelfBuildings);
    console.log('   Total:', result.length);

    console.log('✅ WC3 buildings populated successfully!');
  } catch (error) {
    console.error('❌ Error populating WC3 buildings:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

populateWC3Buildings(); 