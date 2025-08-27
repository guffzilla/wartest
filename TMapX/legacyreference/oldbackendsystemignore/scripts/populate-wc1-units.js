const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Warcraft 1 Units Data from Wowpedia
const wc1Units = [
  // HUMAN UNITS
  {
    game: 'wc1',
    race: 'human',
    name: 'Peasant',
    type: 'unit',
    description: 'Basic worker unit. Harvests resources, builds structures, and repairs buildings.',
    stats: {
      hp: 30,
      attack: '1-1',
      armor: 0,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 60,
      wood: 0,
      food: 1
    },
    production: {
      time: 30,
      building: 'Town Hall'
    },
    abilities: [
      {
        name: 'Repair',
        description: 'Repairs buildings and mechanical units',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Sharpening Stone',
        description: 'Increases attack damage by 1',
        cost: { gold: 100, wood: 0 },
        effect: '+1 attack damage'
      },
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage by 2',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Forged Swords',
        description: 'Increases attack damage by 3',
        cost: { gold: 300, wood: 0 },
        effect: '+3 attack damage'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    name: 'Footman',
    type: 'unit',
    description: 'Basic infantry unit. Good against ground units.',
    stats: {
      hp: 60,
      attack: '6-6',
      armor: 2,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 120,
      wood: 0,
      food: 1
    },
    requirements: {
      buildings: ['Barracks']
    },
    production: {
      time: 45,
      building: 'Barracks'
    },
    upgrades: [
      {
        name: 'Sharpening Stone',
        description: 'Increases attack damage by 1',
        cost: { gold: 100, wood: 0 },
        effect: '+1 attack damage'
      },
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage by 2',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Forged Swords',
        description: 'Increases attack damage by 3',
        cost: { gold: 300, wood: 0 },
        effect: '+3 attack damage'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    name: 'Archer',
    type: 'unit',
    description: 'Ranged unit. Good against flying units and can attack from a distance.',
    stats: {
      hp: 40,
      attack: '4-4',
      armor: 0,
      range: 4,
      sight: 6
    },
    costs: {
      gold: 100,
      wood: 0,
      food: 1
    },
    requirements: {
      buildings: ['Barracks']
    },
    production: {
      time: 40,
      building: 'Barracks'
    },
    upgrades: [
      {
        name: 'Sharpening Stone',
        description: 'Increases attack damage by 1',
        cost: { gold: 100, wood: 0 },
        effect: '+1 attack damage'
      },
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage by 2',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Forged Swords',
        description: 'Increases attack damage by 3',
        cost: { gold: 300, wood: 0 },
        effect: '+3 attack damage'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    name: 'Knight',
    type: 'unit',
    description: 'Heavy cavalry unit. Strong against ground units and has high mobility.',
    stats: {
      hp: 100,
      attack: '10-10',
      armor: 3,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 200,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Barracks', 'Stables']
    },
    production: {
      time: 60,
      building: 'Stables'
    },
    upgrades: [
      {
        name: 'Sharpening Stone',
        description: 'Increases attack damage by 1',
        cost: { gold: 100, wood: 0 },
        effect: '+1 attack damage'
      },
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage by 2',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Forged Swords',
        description: 'Increases attack damage by 3',
        cost: { gold: 300, wood: 0 },
        effect: '+3 attack damage'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    name: 'Cleric',
    type: 'unit',
    description: 'Spellcaster unit. Can heal allies and cast protective spells.',
    stats: {
      hp: 30,
      mana: 100,
      attack: '1-1',
      armor: 0,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 120,
      wood: 0,
      food: 1
    },
    requirements: {
      buildings: ['Church']
    },
    production: {
      time: 50,
      building: 'Church'
    },
    abilities: [
      {
        name: 'Heal',
        description: 'Heals a friendly unit',
        manaCost: 20,
        cooldown: 0,
        range: 4
      },
      {
        name: 'Holy Vision',
        description: 'Reveals an area of the map',
        manaCost: 30,
        cooldown: 0,
        range: 6
      }
    ],
    upgrades: [
      {
        name: 'Improved Healing',
        description: 'Increases healing effectiveness',
        cost: { gold: 150, wood: 0 },
        effect: 'Heal restores more HP'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    name: 'Conjurer',
    type: 'unit',
    description: 'Powerful spellcaster. Can summon creatures and cast offensive spells.',
    stats: {
      hp: 40,
      mana: 120,
      attack: '2-2',
      armor: 0,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 160,
      wood: 0,
      food: 1
    },
    requirements: {
      buildings: ['Church']
    },
    production: {
      time: 60,
      building: 'Church'
    },
    abilities: [
      {
        name: 'Summon Water Elemental',
        description: 'Summons a powerful water elemental',
        manaCost: 50,
        cooldown: 0,
        range: 4
      },
      {
        name: 'Blizzard',
        description: 'Causes damage to enemy units in an area',
        manaCost: 40,
        cooldown: 0,
        range: 6
      }
    ],
    upgrades: [
      {
        name: 'Improved Summoning',
        description: 'Increases summoned creature power',
        cost: { gold: 200, wood: 0 },
        effect: 'Summoned creatures are stronger'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    name: 'Catapult',
    type: 'unit',
    description: 'Siege weapon. Excellent against buildings and ground units.',
    stats: {
      hp: 80,
      attack: '20-20',
      armor: 0,
      range: 8,
      sight: 6
    },
    costs: {
      gold: 200,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Barracks', 'Blacksmith']
    },
    production: {
      time: 80,
      building: 'Blacksmith'
    },
    upgrades: [
      {
        name: 'Improved Siege',
        description: 'Increases damage against buildings',
        cost: { gold: 150, wood: 0 },
        effect: '+50% damage vs buildings'
      }
    ]
  },

  // ORC UNITS
  {
    game: 'wc1',
    race: 'orc',
    name: 'Peon',
    type: 'unit',
    description: 'Basic orc worker unit. Harvests resources, builds structures, and repairs buildings.',
    stats: {
      hp: 30,
      attack: '1-1',
      armor: 0,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 60,
      wood: 0,
      food: 1
    },
    production: {
      time: 30,
      building: 'Great Hall'
    },
    abilities: [
      {
        name: 'Repair',
        description: 'Repairs buildings and mechanical units',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Sharpening Stone',
        description: 'Increases attack damage by 1',
        cost: { gold: 100, wood: 0 },
        effect: '+1 attack damage'
      },
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage by 2',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Forged Swords',
        description: 'Increases attack damage by 3',
        cost: { gold: 300, wood: 0 },
        effect: '+3 attack damage'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    name: 'Grunt',
    type: 'unit',
    description: 'Basic orc infantry unit. Strong and durable ground fighter.',
    stats: {
      hp: 80,
      attack: '8-8',
      armor: 2,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 120,
      wood: 0,
      food: 1
    },
    requirements: {
      buildings: ['Barracks']
    },
    production: {
      time: 45,
      building: 'Barracks'
    },
    upgrades: [
      {
        name: 'Sharpening Stone',
        description: 'Increases attack damage by 1',
        cost: { gold: 100, wood: 0 },
        effect: '+1 attack damage'
      },
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage by 2',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Forged Swords',
        description: 'Increases attack damage by 3',
        cost: { gold: 300, wood: 0 },
        effect: '+3 attack damage'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    name: 'Axethrower',
    type: 'unit',
    description: 'Ranged orc unit. Throws axes at enemies from a distance.',
    stats: {
      hp: 50,
      attack: '6-6',
      armor: 0,
      range: 4,
      sight: 6
    },
    costs: {
      gold: 100,
      wood: 0,
      food: 1
    },
    requirements: {
      buildings: ['Barracks']
    },
    production: {
      time: 40,
      building: 'Barracks'
    },
    upgrades: [
      {
        name: 'Sharpening Stone',
        description: 'Increases attack damage by 1',
        cost: { gold: 100, wood: 0 },
        effect: '+1 attack damage'
      },
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage by 2',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Forged Swords',
        description: 'Increases attack damage by 3',
        cost: { gold: 300, wood: 0 },
        effect: '+3 attack damage'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    name: 'Ogre',
    type: 'unit',
    description: 'Large, powerful orc unit. Excellent against ground units.',
    stats: {
      hp: 120,
      attack: '12-12',
      armor: 3,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 200,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Barracks', 'Ogre Mound']
    },
    production: {
      time: 60,
      building: 'Ogre Mound'
    },
    upgrades: [
      {
        name: 'Sharpening Stone',
        description: 'Increases attack damage by 1',
        cost: { gold: 100, wood: 0 },
        effect: '+1 attack damage'
      },
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage by 2',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Steel Forged Swords',
        description: 'Increases attack damage by 3',
        cost: { gold: 300, wood: 0 },
        effect: '+3 attack damage'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    name: 'Warlock',
    type: 'unit',
    description: 'Orc spellcaster. Can cast destructive spells and summon creatures.',
    stats: {
      hp: 40,
      mana: 100,
      attack: '2-2',
      armor: 0,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 140,
      wood: 0,
      food: 1
    },
    requirements: {
      buildings: ['Temple']
    },
    production: {
      time: 55,
      building: 'Temple'
    },
    abilities: [
      {
        name: 'Summon Skeleton',
        description: 'Summons a skeleton warrior',
        manaCost: 30,
        cooldown: 0,
        range: 4
      },
      {
        name: 'Death Coil',
        description: 'Damages enemy units',
        manaCost: 25,
        cooldown: 0,
        range: 6
      }
    ],
    upgrades: [
      {
        name: 'Improved Summoning',
        description: 'Increases summoned creature power',
        cost: { gold: 180, wood: 0 },
        effect: 'Summoned creatures are stronger'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    name: 'Necrolyte',
    type: 'unit',
    description: 'Dark orc spellcaster. Specializes in death magic and curses.',
    stats: {
      hp: 35,
      mana: 120,
      attack: '1-1',
      armor: 0,
      range: 1,
      sight: 4
    },
    costs: {
      gold: 160,
      wood: 0,
      food: 1
    },
    requirements: {
      buildings: ['Temple']
    },
    production: {
      time: 60,
      building: 'Temple'
    },
    abilities: [
      {
        name: 'Raise Dead',
        description: 'Raises fallen units as skeletons',
        manaCost: 40,
        cooldown: 0,
        range: 4
      },
      {
        name: 'Curse',
        description: 'Reduces enemy unit effectiveness',
        manaCost: 35,
        cooldown: 0,
        range: 6
      }
    ],
    upgrades: [
      {
        name: 'Improved Necromancy',
        description: 'Increases undead creature power',
        cost: { gold: 200, wood: 0 },
        effect: 'Raised undead are stronger'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    name: 'Catapult',
    type: 'unit',
    description: 'Orc siege weapon. Destroys buildings and ground units effectively.',
    stats: {
      hp: 80,
      attack: '20-20',
      armor: 0,
      range: 8,
      sight: 6
    },
    costs: {
      gold: 200,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Barracks', 'Blacksmith']
    },
    production: {
      time: 80,
      building: 'Blacksmith'
    },
    upgrades: [
      {
        name: 'Improved Siege',
        description: 'Increases damage against buildings',
        cost: { gold: 150, wood: 0 },
        effect: '+50% damage vs buildings'
      }
    ]
  }
];

async function populateWC1Units() {
  try {
    console.log('🗑️ Clearing existing WC1 units...');
    await GameUnit.deleteMany({ game: 'wc1' });
    
    console.log('📝 Inserting WC1 units...');
    const result = await GameUnit.insertMany(wc1Units);
    
    console.log(`✅ Successfully inserted ${result.length} WC1 units`);
    
    // Display summary
    const humanUnits = await GameUnit.countDocuments({ game: 'wc1', race: 'human' });
    const orcUnits = await GameUnit.countDocuments({ game: 'wc1', race: 'orc' });
    
    console.log(`📊 Summary:`);
    console.log(`   Human Units: ${humanUnits}`);
    console.log(`   Orc Units: ${orcUnits}`);
    console.log(`   Total: ${humanUnits + orcUnits}`);
    
  } catch (error) {
    console.error('❌ Error populating WC1 units:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
populateWC1Units(); 