const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Warcraft 3 Units Data from Wowpedia
const wc3Units = [
  // HUMAN UNITS
  {
    game: 'wc3',
    race: 'human',
    name: 'Peasant',
    type: 'unit',
    description: 'Basic worker unit. Harvests resources, builds structures, and repairs buildings.',
    stats: {
      hp: 220,
      attack: '5-5',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 75,
      wood: 0,
      food: 1
    },
    production: {
      time: 20,
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
        name: 'Improved Lumber Harvesting',
        description: 'Increases wood gathering speed',
        cost: { gold: 100, wood: 0 },
        effect: '+20% wood gathering'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Footman',
    type: 'unit',
    description: 'Basic infantry unit. Good against ground units.',
    stats: {
      hp: 420,
      attack: '12-12',
      armor: 2,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 135,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Barracks']
    },
    production: {
      time: 30,
      building: 'Barracks'
    },
    abilities: [
      {
        name: 'Defend',
        description: 'Reduces damage from ranged attacks',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Iron Plated Armor',
        description: 'Increases armor',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Knight',
    type: 'unit',
    description: 'Heavy cavalry unit. Strong against ground units and has high mobility.',
    stats: {
      hp: 835,
      attack: '25-25',
      armor: 5,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 245,
      wood: 0,
      food: 4
    },
    requirements: {
      buildings: ['Barracks', 'Blacksmith']
    },
    production: {
      time: 45,
      building: 'Barracks'
    },
    abilities: [
      {
        name: 'Charge',
        description: 'Increases movement speed and attack damage',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Iron Plated Armor',
        description: 'Increases armor',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Rifleman',
    type: 'unit',
    description: 'Ranged unit. Good against flying units and can attack from a distance.',
    stats: {
      hp: 505,
      attack: '21-21',
      armor: 0,
      range: 5,
      sight: 8
    },
    costs: {
      gold: 205,
      wood: 0,
      food: 3
    },
    requirements: {
      buildings: ['Barracks']
    },
    production: {
      time: 35,
      building: 'Barracks'
    },
    abilities: [
      {
        name: 'Long Rifles',
        description: 'Increases attack range',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Priest',
    type: 'unit',
    description: 'Support unit. Can heal allies and dispel magic.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 135,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Church']
    },
    production: {
      time: 30,
      building: 'Church'
    },
    abilities: [
      {
        name: 'Heal',
        description: 'Heals a friendly unit',
        manaCost: 25,
        cooldown: 0,
        range: 6
      },
      {
        name: 'Dispel Magic',
        description: 'Removes magic effects from units',
        manaCost: 50,
        cooldown: 0,
        range: 8
      }
    ],
    upgrades: [
      {
        name: 'Improved Heal',
        description: 'Increases healing effectiveness',
        cost: { gold: 150, wood: 0 },
        effect: 'Heal restores more HP'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Sorceress',
    type: 'unit',
    description: 'Spellcaster unit. Can cast offensive and utility spells.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Church']
    },
    production: {
      time: 30,
      building: 'Church'
    },
    abilities: [
      {
        name: 'Slow',
        description: 'Reduces enemy unit movement and attack speed',
        manaCost: 50,
        cooldown: 0,
        range: 8
      },
      {
        name: 'Invisibility',
        description: 'Makes a unit invisible',
        manaCost: 75,
        cooldown: 0,
        range: 6
      }
    ],
    upgrades: [
      {
        name: 'Improved Spells',
        description: 'Increases spell effectiveness',
        cost: { gold: 150, wood: 0 },
        effect: 'Spells last longer'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Mortar Team',
    type: 'unit',
    description: 'Siege weapon. Excellent against buildings and ground units.',
    stats: {
      hp: 360,
      attack: '62-62',
      armor: 0,
      range: 11,
      sight: 8
    },
    costs: {
      gold: 180,
      wood: 0,
      food: 3
    },
    requirements: {
      buildings: ['Barracks', 'Workshop']
    },
    production: {
      time: 40,
      building: 'Workshop'
    },
    abilities: [
      {
        name: 'Fragmentation Shards',
        description: 'Increases damage against buildings',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Improved Siege',
        description: 'Increases damage against buildings',
        cost: { gold: 150, wood: 0 },
        effect: '+50% damage vs buildings'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'human',
    name: 'Gryphon Rider',
    type: 'unit',
    description: 'Flying unit. Excellent against ground units and buildings.',
    stats: {
      hp: 825,
      attack: '45-45',
      armor: 2,
      range: 3,
      sight: 8
    },
    costs: {
      gold: 280,
      wood: 0,
      food: 4
    },
    requirements: {
      buildings: ['Barracks', 'Workshop']
    },
    production: {
      time: 50,
      building: 'Workshop'
    },
    abilities: [
      {
        name: 'Storm Hammer',
        description: 'Deals area damage to enemy units',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Improved Storm Hammer',
        description: 'Increases area damage',
        cost: { gold: 150, wood: 0 },
        effect: '+25% area damage'
      }
    ]
  },

  // ORC UNITS
  {
    game: 'wc3',
    race: 'orc',
    name: 'Peon',
    type: 'unit',
    description: 'Basic orc worker unit. Harvests resources, builds structures, and repairs buildings.',
    stats: {
      hp: 220,
      attack: '5-5',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 75,
      wood: 0,
      food: 1
    },
    production: {
      time: 20,
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
        name: 'Improved Lumber Harvesting',
        description: 'Increases wood gathering speed',
        cost: { gold: 100, wood: 0 },
        effect: '+20% wood gathering'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Grunt',
    type: 'unit',
    description: 'Basic orc infantry unit. Strong and durable ground fighter.',
    stats: {
      hp: 700,
      attack: '19-19',
      armor: 1,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 135,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Barracks']
    },
    production: {
      time: 30,
      building: 'Barracks'
    },
    abilities: [
      {
        name: 'Berserker Strength',
        description: 'Increases attack damage when health is low',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Iron Plated Armor',
        description: 'Increases armor',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Troll Headhunter',
    type: 'unit',
    description: 'Ranged orc unit. Throws spears at enemies from a distance.',
    stats: {
      hp: 400,
      attack: '16-16',
      armor: 0,
      range: 5,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Barracks']
    },
    production: {
      time: 30,
      building: 'Barracks'
    },
    abilities: [
      {
        name: 'Berserker Upgrade',
        description: 'Transforms into a melee unit with increased damage',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Tauren',
    type: 'unit',
    description: 'Large, powerful orc unit. Excellent against ground units.',
    stats: {
      hp: 1000,
      attack: '33-33',
      armor: 3,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 280,
      wood: 0,
      food: 5
    },
    requirements: {
      buildings: ['Barracks', 'Stronghold']
    },
    production: {
      time: 50,
      building: 'Barracks'
    },
    abilities: [
      {
        name: 'Pulverize',
        description: 'Deals area damage to nearby enemies',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Iron Plated Armor',
        description: 'Increases armor',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Shaman',
    type: 'unit',
    description: 'Orc spellcaster. Can cast supportive and offensive spells.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Altar of Storms']
    },
    production: {
      time: 30,
      building: 'Altar of Storms'
    },
    abilities: [
      {
        name: 'Purge',
        description: 'Removes magic effects and slows enemy units',
        manaCost: 50,
        cooldown: 0,
        range: 8
      },
      {
        name: 'Bloodlust',
        description: 'Increases attack and movement speed of friendly units',
        manaCost: 75,
        cooldown: 0,
        range: 6
      }
    ],
    upgrades: [
      {
        name: 'Improved Spells',
        description: 'Increases spell effectiveness',
        cost: { gold: 150, wood: 0 },
        effect: 'Spells last longer'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Witch Doctor',
    type: 'unit',
    description: 'Orc spellcaster. Specializes in healing and wards.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Altar of Storms']
    },
    production: {
      time: 30,
      building: 'Altar of Storms'
    },
    abilities: [
      {
        name: 'Healing Ward',
        description: 'Creates a ward that heals nearby units',
        manaCost: 75,
        cooldown: 0,
        range: 6
      },
      {
        name: 'Stasis Trap',
        description: 'Creates a trap that stuns enemy units',
        manaCost: 50,
        cooldown: 0,
        range: 6
      }
    ],
    upgrades: [
      {
        name: 'Improved Wards',
        description: 'Increases ward effectiveness',
        cost: { gold: 150, wood: 0 },
        effect: 'Wards last longer'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Catapult',
    type: 'unit',
    description: 'Orc siege weapon. Destroys buildings and ground units effectively.',
    stats: {
      hp: 360,
      attack: '62-62',
      armor: 0,
      range: 11,
      sight: 8
    },
    costs: {
      gold: 180,
      wood: 0,
      food: 3
    },
    requirements: {
      buildings: ['Barracks', 'War Mill']
    },
    production: {
      time: 40,
      building: 'War Mill'
    },
    abilities: [
      {
        name: 'Fragmentation Shards',
        description: 'Increases damage against buildings',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Improved Siege',
        description: 'Increases damage against buildings',
        cost: { gold: 150, wood: 0 },
        effect: '+50% damage vs buildings'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'orc',
    name: 'Wind Rider',
    type: 'unit',
    description: 'Flying orc unit. Good against ground units and buildings.',
    stats: {
      hp: 825,
      attack: '45-45',
      armor: 2,
      range: 3,
      sight: 8
    },
    costs: {
      gold: 280,
      wood: 0,
      food: 4
    },
    requirements: {
      buildings: ['Barracks', 'War Mill']
    },
    production: {
      time: 50,
      building: 'War Mill'
    },
    abilities: [
      {
        name: 'Ensnare',
        description: 'Traps enemy units in a net',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Improved Ensnare',
        description: 'Increases ensnare duration',
        cost: { gold: 150, wood: 0 },
        effect: '+2 seconds duration'
      }
    ]
  },

  // UNDEAD UNITS
  {
    game: 'wc3',
    race: 'undead',
    name: 'Acolyte',
    type: 'unit',
    description: 'Basic undead worker unit. Harvests resources and builds structures.',
    stats: {
      hp: 220,
      attack: '5-5',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 75,
      wood: 0,
      food: 1
    },
    production: {
      time: 20,
      building: 'Necropolis'
    },
    abilities: [
      {
        name: 'Sacrifice',
        description: 'Sacrifices itself to repair buildings',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Improved Lumber Harvesting',
        description: 'Increases wood gathering speed',
        cost: { gold: 100, wood: 0 },
        effect: '+20% wood gathering'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Ghoul',
    type: 'unit',
    description: 'Fast undead infantry unit. Good for harassment and wood gathering.',
    stats: {
      hp: 340,
      attack: '13-13',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 120,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Crypt']
    },
    production: {
      time: 25,
      building: 'Crypt'
    },
    abilities: [
      {
        name: 'Cannibalize',
        description: 'Eats corpses to restore health',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Crypt Fiend',
    type: 'unit',
    description: 'Ranged undead unit. Can web flying units and attack from distance.',
    stats: {
      hp: 550,
      attack: '21-21',
      armor: 0,
      range: 5,
      sight: 8
    },
    costs: {
      gold: 215,
      wood: 0,
      food: 3
    },
    requirements: {
      buildings: ['Crypt']
    },
    production: {
      time: 35,
      building: 'Crypt'
    },
    abilities: [
      {
        name: 'Web',
        description: 'Traps flying units and brings them to ground',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Abomination',
    type: 'unit',
    description: 'Large undead unit. Excellent against ground units and buildings.',
    stats: {
      hp: 1175,
      attack: '37-37',
      armor: 1,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 240,
      wood: 0,
      food: 4
    },
    requirements: {
      buildings: ['Crypt', 'Slaughterhouse']
    },
    production: {
      time: 45,
      building: 'Slaughterhouse'
    },
    abilities: [
      {
        name: 'Disease Cloud',
        description: 'Creates a cloud that damages enemy units',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      },
      {
        name: 'Iron Plated Armor',
        description: 'Increases armor',
        cost: { gold: 150, wood: 0 },
        effect: '+2 armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Necromancer',
    type: 'unit',
    description: 'Undead spellcaster. Can raise skeletons and cast curses.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Temple of the Damned']
    },
    production: {
      time: 30,
      building: 'Temple of the Damned'
    },
    abilities: [
      {
        name: 'Raise Dead',
        description: 'Raises skeletons from corpses',
        manaCost: 50,
        cooldown: 0,
        range: 6
      },
      {
        name: 'Cripple',
        description: 'Reduces enemy unit effectiveness',
        manaCost: 75,
        cooldown: 0,
        range: 8
      }
    ],
    upgrades: [
      {
        name: 'Improved Necromancy',
        description: 'Increases skeleton power',
        cost: { gold: 150, wood: 0 },
        effect: 'Skeletons are stronger'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'undead',
    name: 'Banshee',
    type: 'unit',
    description: 'Undead spellcaster. Can possess enemy units and cast curses.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Temple of the Damned']
    },
    production: {
      time: 30,
      building: 'Temple of the Damned'
    },
    abilities: [
      {
        name: 'Possession',
        description: 'Takes control of an enemy unit',
        manaCost: 150,
        cooldown: 0,
        range: 6
      },
      {
        name: 'Curse',
        description: 'Reduces enemy unit attack damage',
        manaCost: 50,
        cooldown: 0,
        range: 8
      }
    ],
    upgrades: [
      {
        name: 'Improved Possession',
        description: 'Increases possession effectiveness',
        cost: { gold: 150, wood: 0 },
        effect: 'Possessed units are stronger'
      }
    ]
  },

  // NIGHT ELF UNITS
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Wisp',
    type: 'unit',
    description: 'Basic night elf worker unit. Harvests resources and builds structures.',
    stats: {
      hp: 220,
      attack: '5-5',
      armor: 0,
      range: 1,
      sight: 6
    },
    costs: {
      gold: 75,
      wood: 0,
      food: 1
    },
    production: {
      time: 20,
      building: 'Tree of Life'
    },
    abilities: [
      {
        name: 'Detonate',
        description: 'Explodes to damage enemy units and buildings',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Improved Lumber Harvesting',
        description: 'Increases wood gathering speed',
        cost: { gold: 100, wood: 0 },
        effect: '+20% wood gathering'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Archer',
    type: 'unit',
    description: 'Ranged night elf unit. Good against flying units and can attack from distance.',
    stats: {
      hp: 310,
      attack: '16-16',
      armor: 0,
      range: 5,
      sight: 8
    },
    costs: {
      gold: 130,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Ancient of War']
    },
    production: {
      time: 25,
      building: 'Ancient of War'
    },
    abilities: [
      {
        name: 'Marksmanship',
        description: 'Increases attack damage',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Huntress',
    type: 'unit',
    description: 'Fast night elf unit. Good for scouting and harassment.',
    stats: {
      hp: 600,
      attack: '18-18',
      armor: 0,
      range: 3,
      sight: 8
    },
    costs: {
      gold: 195,
      wood: 0,
      food: 3
    },
    requirements: {
      buildings: ['Ancient of War']
    },
    production: {
      time: 35,
      building: 'Ancient of War'
    },
    abilities: [
      {
        name: 'Sentinel',
        description: 'Creates an owl that provides vision',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Iron Forged Swords',
        description: 'Increases attack damage',
        cost: { gold: 150, wood: 0 },
        effect: '+2 attack damage'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Druid of the Claw',
    type: 'unit',
    description: 'Night elf spellcaster. Can transform into a bear for combat.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Ancient of Lore']
    },
    production: {
      time: 30,
      building: 'Ancient of Lore'
    },
    abilities: [
      {
        name: 'Rejuvenation',
        description: 'Heals a friendly unit over time',
        manaCost: 50,
        cooldown: 0,
        range: 6
      },
      {
        name: 'Bear Form',
        description: 'Transforms into a powerful bear',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Improved Healing',
        description: 'Increases healing effectiveness',
        cost: { gold: 150, wood: 0 },
        effect: 'Rejuvenation heals more'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Druid of the Talon',
    type: 'unit',
    description: 'Night elf spellcaster. Can transform into a crow for scouting.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Ancient of Wind']
    },
    production: {
      time: 30,
      building: 'Ancient of Wind'
    },
    abilities: [
      {
        name: 'Faerie Fire',
        description: 'Reveals invisible units and reduces armor',
        manaCost: 50,
        cooldown: 0,
        range: 8
      },
      {
        name: 'Crow Form',
        description: 'Transforms into a flying crow',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [
      {
        name: 'Improved Faerie Fire',
        description: 'Increases faerie fire effectiveness',
        cost: { gold: 150, wood: 0 },
        effect: 'Reduces more armor'
      }
    ]
  },
  {
    game: 'wc3',
    race: 'nightelf',
    name: 'Dryad',
    type: 'unit',
    description: 'Night elf support unit. Can dispel magic and poison enemies.',
    stats: {
      hp: 340,
      mana: 200,
      attack: '8-8',
      armor: 0,
      range: 6,
      sight: 8
    },
    costs: {
      gold: 155,
      wood: 0,
      food: 2
    },
    requirements: {
      buildings: ['Ancient of Wind']
    },
    production: {
      time: 30,
      building: 'Ancient of Wind'
    },
    abilities: [
      {
        name: 'Abolish Magic',
        description: 'Removes magic effects from units',
        manaCost: 50,
        cooldown: 0,
        range: 8
      },
      {
        name: 'Poison',
        description: 'Poisons enemy units over time',
        manaCost: 75,
        cooldown: 0,
        range: 6
      }
    ],
    upgrades: [
      {
        name: 'Improved Poison',
        description: 'Increases poison damage',
        cost: { gold: 150, wood: 0 },
        effect: 'Poison deals more damage'
      }
    ]
  }
];

async function populateWC3Units() {
  try {
    console.log('🗑️ Clearing existing WC3 units...');
    await GameUnit.deleteMany({ game: 'wc3' });
    
    console.log('📝 Inserting WC3 units...');
    const result = await GameUnit.insertMany(wc3Units);
    
    console.log(`✅ Successfully inserted ${result.length} WC3 units`);
    
    // Display summary
    const humanUnits = await GameUnit.countDocuments({ game: 'wc3', race: 'human' });
    const orcUnits = await GameUnit.countDocuments({ game: 'wc3', race: 'orc' });
    const undeadUnits = await GameUnit.countDocuments({ game: 'wc3', race: 'undead' });
    const nightelfUnits = await GameUnit.countDocuments({ game: 'wc3', race: 'nightelf' });
    
    console.log(`📊 Summary:`);
    console.log(`   Human Units: ${humanUnits}`);
    console.log(`   Orc Units: ${orcUnits}`);
    console.log(`   Undead Units: ${undeadUnits}`);
    console.log(`   Night Elf Units: ${nightelfUnits}`);
    console.log(`   Total: ${humanUnits + orcUnits + undeadUnits + nightelfUnits}`);
    
  } catch (error) {
    console.error('❌ Error populating WC3 units:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
populateWC3Units(); 