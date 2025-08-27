const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// WC1 Buildings Data
const wc1Buildings = [
  // Human Buildings
  {
    game: 'wc1',
    race: 'human',
    type: 'building',
    name: 'Town Hall',
    description: 'The central building of the human settlement. Required for most other buildings.',
    stats: {
      hp: 1200,
      armor: 5
    },
    costs: {
      gold: 400,
      wood: 0
    },
    production: {
      time: 60,
      building: 'none'
    },
    requirements: {
      buildings: [],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Keep',
        description: 'Upgrades Town Hall to Keep, allowing more advanced units',
        cost: { gold: 400, wood: 0 },
        effect: 'Enables advanced unit production'
      },
      {
        name: 'Castle',
        description: 'Upgrades Keep to Castle, the most advanced human building',
        cost: { gold: 400, wood: 0 },
        effect: 'Enables all unit types and maximum population'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    type: 'building',
    name: 'Farm',
    description: 'Provides food for your army. Each farm supports 4 population.',
    stats: {
      hp: 500,
      armor: 0
    },
    costs: {
      gold: 75,
      wood: 0
    },
    production: {
      time: 30,
      building: 'none'
    },
    requirements: {
      buildings: ['Town Hall'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: []
  },
  {
    game: 'wc1',
    race: 'human',
    type: 'building',
    name: 'Barracks',
    description: 'Trains military units including Footmen, Archers, and Knights.',
    stats: {
      hp: 800,
      armor: 2
    },
    costs: {
      gold: 200,
      wood: 0
    },
    production: {
      time: 45,
      building: 'none'
    },
    requirements: {
      buildings: ['Town Hall'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Weapon Upgrade',
        description: 'Increases attack damage of all units',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Armor Upgrade',
        description: 'Increases armor of all units',
        cost: { gold: 200, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    type: 'building',
    name: 'Church',
    description: 'Trains Clerics and researches healing abilities.',
    stats: {
      hp: 600,
      armor: 1
    },
    costs: {
      gold: 150,
      wood: 0
    },
    production: {
      time: 40,
      building: 'none'
    },
    requirements: {
      buildings: ['Barracks'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Healing',
        description: 'Allows Clerics to heal units',
        cost: { gold: 100, wood: 0 },
        effect: 'Clerics can heal friendly units'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    type: 'building',
    name: 'Stable',
    description: 'Trains Knights and researches cavalry upgrades.',
    stats: {
      hp: 700,
      armor: 2
    },
    costs: {
      gold: 200,
      wood: 0
    },
    production: {
      time: 50,
      building: 'none'
    },
    requirements: {
      buildings: ['Barracks'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Cavalry Training',
        description: 'Improves Knight combat abilities',
        cost: { gold: 150, wood: 0 },
        effect: 'Knights gain +1 attack and +1 armor'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    type: 'building',
    name: 'Workshop',
    description: 'Builds siege weapons like Catapults.',
    stats: {
      hp: 600,
      armor: 1
    },
    costs: {
      gold: 200,
      wood: 0
    },
    production: {
      time: 45,
      building: 'none'
    },
    requirements: {
      buildings: ['Barracks'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Siege Engineering',
        description: 'Improves Catapult damage and range',
        cost: { gold: 200, wood: 0 },
        effect: 'Catapults gain +2 damage and +1 range'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'human',
    type: 'building',
    name: 'Tower',
    description: 'Defensive structure that attacks enemy units.',
    stats: {
      hp: 800,
      armor: 3
    },
    costs: {
      gold: 150,
      wood: 0
    },
    production: {
      time: 35,
      building: 'none'
    },
    requirements: {
      buildings: ['Town Hall'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Arrow Upgrade',
        description: 'Increases tower attack damage',
        cost: { gold: 100, wood: 0 },
        effect: '+2 attack damage'
      }
    ]
  },

  // Orc Buildings
  {
    game: 'wc1',
    race: 'orc',
    type: 'building',
    name: 'Great Hall',
    description: 'The central building of the orc settlement. Required for most other buildings.',
    stats: {
      hp: 1200,
      armor: 5
    },
    costs: {
      gold: 400,
      wood: 0
    },
    production: {
      time: 60,
      building: 'none'
    },
    requirements: {
      buildings: [],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Stronghold',
        description: 'Upgrades Great Hall to Stronghold, allowing more advanced units',
        cost: { gold: 400, wood: 0 },
        effect: 'Enables advanced unit production'
      },
      {
        name: 'Fortress',
        description: 'Upgrades Stronghold to Fortress, the most advanced orc building',
        cost: { gold: 400, wood: 0 },
        effect: 'Enables all unit types and maximum population'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    type: 'building',
    name: 'Pig Farm',
    description: 'Provides food for your army. Each pig farm supports 4 population.',
    stats: {
      hp: 500,
      armor: 0
    },
    costs: {
      gold: 75,
      wood: 0
    },
    production: {
      time: 30,
      building: 'none'
    },
    requirements: {
      buildings: ['Great Hall'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: []
  },
  {
    game: 'wc1',
    race: 'orc',
    type: 'building',
    name: 'Barracks',
    description: 'Trains military units including Grunts, Spearmen, and Raiders.',
    stats: {
      hp: 800,
      armor: 2
    },
    costs: {
      gold: 200,
      wood: 0
    },
    production: {
      time: 45,
      building: 'none'
    },
    requirements: {
      buildings: ['Great Hall'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Weapon Upgrade',
        description: 'Increases attack damage of all units',
        cost: { gold: 200, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Armor Upgrade',
        description: 'Increases armor of all units',
        cost: { gold: 200, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    type: 'building',
    name: 'Temple',
    description: 'Trains Necrolytes and researches death magic abilities.',
    stats: {
      hp: 600,
      armor: 1
    },
    costs: {
      gold: 150,
      wood: 0
    },
    production: {
      time: 40,
      building: 'none'
    },
    requirements: {
      buildings: ['Barracks'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Death Touch',
        description: 'Allows Necrolytes to damage enemy units',
        cost: { gold: 100, wood: 0 },
        effect: 'Necrolytes can damage enemy units'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    type: 'building',
    name: 'Kennel',
    description: 'Trains Raiders and researches wolf rider upgrades.',
    stats: {
      hp: 700,
      armor: 2
    },
    costs: {
      gold: 200,
      wood: 0
    },
    production: {
      time: 50,
      building: 'none'
    },
    requirements: {
      buildings: ['Barracks'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Wolf Training',
        description: 'Improves Raider combat abilities',
        cost: { gold: 150, wood: 0 },
        effect: 'Raiders gain +1 attack and +1 armor'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    type: 'building',
    name: 'Workshop',
    description: 'Builds siege weapons like Catapults.',
    stats: {
      hp: 600,
      armor: 1
    },
    costs: {
      gold: 200,
      wood: 0
    },
    production: {
      time: 45,
      building: 'none'
    },
    requirements: {
      buildings: ['Barracks'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Siege Engineering',
        description: 'Improves Catapult damage and range',
        cost: { gold: 200, wood: 0 },
        effect: 'Catapults gain +2 damage and +1 range'
      }
    ]
  },
  {
    game: 'wc1',
    race: 'orc',
    type: 'building',
    name: 'Guard Tower',
    description: 'Defensive structure that attacks enemy units.',
    stats: {
      hp: 800,
      armor: 3
    },
    costs: {
      gold: 150,
      wood: 0
    },
    production: {
      time: 35,
      building: 'none'
    },
    requirements: {
      buildings: ['Great Hall'],
      upgrades: [],
      level: 1
    },
    abilities: [],
    upgrades: [
      {
        name: 'Arrow Upgrade',
        description: 'Increases tower attack damage',
        cost: { gold: 100, wood: 0 },
        effect: '+2 attack damage'
      }
    ]
  }
];

async function populateWC1Buildings() {
  try {
    console.log('🗑️ Clearing existing WC1 buildings...');
    await GameUnit.deleteMany({ game: 'wc1', type: 'building' });
    
    console.log('📝 Inserting WC1 buildings...');
    const result = await GameUnit.insertMany(wc1Buildings);
    
    console.log(`✅ Successfully inserted ${result.length} WC1 buildings`);
    
    // Display summary
    const humanBuildings = await GameUnit.countDocuments({ game: 'wc1', race: 'human', type: 'building' });
    const orcBuildings = await GameUnit.countDocuments({ game: 'wc1', race: 'orc', type: 'building' });
    
    console.log(`📊 Summary:`);
    console.log(`   Human Buildings: ${humanBuildings}`);
    console.log(`   Orc Buildings: ${orcBuildings}`);
    console.log(`   Total: ${humanBuildings + orcBuildings}`);
    
  } catch (error) {
    console.error('❌ Error populating WC1 buildings:', error);
  } finally {
    mongoose.connection.close();
  }
}

populateWC1Buildings(); 