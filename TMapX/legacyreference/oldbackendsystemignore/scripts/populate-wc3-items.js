const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Warcraft 3 Items Data from Wowpedia
const wc3Items = [
  // CONSUMABLE ITEMS
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Healing Potion',
    type: 'item',
    description: 'Restores health to the user when consumed.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 150,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Heal',
        description: 'Restores 250 health points',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'consumable',
    rarity: 'common'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Mana Potion',
    type: 'item',
    description: 'Restores mana to the user when consumed.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 100,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Restore Mana',
        description: 'Restores 200 mana points',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'consumable',
    rarity: 'common'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Greater Healing Potion',
    type: 'item',
    description: 'Restores a large amount of health to the user.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 300,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Greater Heal',
        description: 'Restores 500 health points',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'consumable',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Greater Mana Potion',
    type: 'item',
    description: 'Restores a large amount of mana to the user.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 200,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Greater Mana Restore',
        description: 'Restores 400 mana points',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'consumable',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Scroll of Town Portal',
    type: 'item',
    description: 'Allows the user to teleport back to their town hall.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 350,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Town Portal',
        description: 'Teleports the user to their town hall',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'consumable',
    rarity: 'common'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Dust of Appearance',
    type: 'item',
    description: 'Reveals invisible units in a large area.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 200,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Reveal',
        description: 'Reveals invisible units in a large area',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'consumable',
    rarity: 'uncommon'
  },

  // PERMANENT ITEMS
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Claws of Attack',
    type: 'item',
    description: 'Increases attack damage of the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 6,
      armor: 0
    },
    costs: {
      gold: 300,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [],
    upgrades: [],
    category: 'permanent',
    rarity: 'common'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Claws of Attack +12',
    type: 'item',
    description: 'Significantly increases attack damage of the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 12,
      armor: 0
    },
    costs: {
      gold: 600,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [],
    upgrades: [],
    category: 'permanent',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Claws of Attack +15',
    type: 'item',
    description: 'Greatly increases attack damage of the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 15,
      armor: 0
    },
    costs: {
      gold: 750,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [],
    upgrades: [],
    category: 'permanent',
    rarity: 'rare'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Ring of Protection',
    type: 'item',
    description: 'Increases armor of the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 2
    },
    costs: {
      gold: 175,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [],
    upgrades: [],
    category: 'permanent',
    rarity: 'common'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Ring of Protection +3',
    type: 'item',
    description: 'Significantly increases armor of the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 3
    },
    costs: {
      gold: 350,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [],
    upgrades: [],
    category: 'permanent',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Ring of Protection +5',
    type: 'item',
    description: 'Greatly increases armor of the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 5
    },
    costs: {
      gold: 500,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [],
    upgrades: [],
    category: 'permanent',
    rarity: 'rare'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Circlet of Nobility',
    type: 'item',
    description: 'Increases all attributes of the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 185,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'All Attributes +2',
        description: 'Increases strength, agility, and intelligence by 2',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'common'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Mask of Death',
    type: 'item',
    description: 'Provides life steal to the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 400,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Life Steal',
        description: '15% chance to steal life on attack',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Orb of Fire',
    type: 'item',
    description: 'Adds fire damage to attacks and provides splash damage.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 375,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Fire Attack',
        description: 'Adds fire damage and splash damage to attacks',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Orb of Lightning',
    type: 'item',
    description: 'Adds lightning damage to attacks and can chain to nearby enemies.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 375,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Lightning Attack',
        description: 'Adds lightning damage and chain lightning effect',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Orb of Frost',
    type: 'item',
    description: 'Adds frost damage to attacks and slows enemies.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 375,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Frost Attack',
        description: 'Adds frost damage and slow effect to attacks',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Orb of Venom',
    type: 'item',
    description: 'Adds poison damage to attacks over time.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 375,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Poison Attack',
        description: 'Adds poison damage over time to attacks',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'uncommon'
  },

  // ARTIFACTS
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Crown of Kings',
    type: 'item',
    description: 'Powerful artifact that greatly increases all attributes.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 1000,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'All Attributes +5',
        description: 'Increases strength, agility, and intelligence by 5',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'artifact',
    rarity: 'epic'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Khadgar\'s Pipe of Insight',
    type: 'item',
    description: 'Increases mana regeneration and provides true sight.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 800,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Mana Regeneration',
        description: 'Increases mana regeneration rate',
        manaCost: 0,
        cooldown: 0
      },
      {
        name: 'True Sight',
        description: 'Reveals invisible units',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'artifact',
    rarity: 'epic'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Helm of Valor',
    type: 'item',
    description: 'Increases strength and provides bonus health.',
    stats: {
      hp: 150,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 600,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Strength +4',
        description: 'Increases strength by 4',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'artifact',
    rarity: 'rare'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Medallion of Courage',
    type: 'item',
    description: 'Increases agility and provides bonus armor.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 3
    },
    costs: {
      gold: 600,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Agility +4',
        description: 'Increases agility by 4',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'artifact',
    rarity: 'rare'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Staff of Preservation',
    type: 'item',
    description: 'Increases intelligence and provides bonus mana.',
    stats: {
      hp: 0,
      mana: 200,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 600,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Intelligence +4',
        description: 'Increases intelligence by 4',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'artifact',
    rarity: 'rare'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Alleria\'s Flute of Accuracy',
    type: 'item',
    description: 'Increases attack damage and provides bonus attack speed.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 10,
      armor: 0
    },
    costs: {
      gold: 800,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Attack Speed',
        description: 'Increases attack speed',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'artifact',
    rarity: 'epic'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Thunder Lizard Diamond',
    type: 'item',
    description: 'Provides chain lightning ability and increases intelligence.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 800,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Chain Lightning',
        description: 'Casts chain lightning spell',
        manaCost: 75,
        cooldown: 0
      },
      {
        name: 'Intelligence +3',
        description: 'Increases intelligence by 3',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'artifact',
    rarity: 'epic'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Sobi Mask',
    type: 'item',
    description: 'Increases mana regeneration rate.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 325,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Mana Regeneration',
        description: 'Increases mana regeneration rate',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'common'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Robe of the Magi',
    type: 'item',
    description: 'Increases intelligence and provides bonus mana.',
    stats: {
      hp: 0,
      mana: 150,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 450,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Intelligence +3',
        description: 'Increases intelligence by 3',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'uncommon'
  },
  {
    game: 'wc3',
    race: 'neutral',
    name: 'Boots of Speed',
    type: 'item',
    description: 'Increases movement speed of the bearer.',
    stats: {
      hp: 0,
      mana: 0,
      attack: 0,
      armor: 0
    },
    costs: {
      gold: 300,
      wood: 0,
      food: 0
    },
    production: {
      time: 0,
      building: 'Shop'
    },
    abilities: [
      {
        name: 'Movement Speed',
        description: 'Increases movement speed by 50',
        manaCost: 0,
        cooldown: 0
      }
    ],
    upgrades: [],
    category: 'permanent',
    rarity: 'common'
  }
];

async function populateWC3Items() {
  try {
    console.log('🗑️ Clearing existing WC3 items...');
    await GameUnit.deleteMany({ game: 'wc3', type: 'item' });

    console.log('📝 Inserting WC3 items...');
    const result = await GameUnit.insertMany(wc3Items);

    // Count by category
    const consumableItems = await GameUnit.countDocuments({ game: 'wc3', type: 'item', category: 'consumable' });
    const permanentItems = await GameUnit.countDocuments({ game: 'wc3', type: 'item', category: 'permanent' });
    const artifactItems = await GameUnit.countDocuments({ game: 'wc3', type: 'item', category: 'artifact' });

    console.log('   Consumable Items:', consumableItems);
    console.log('   Permanent Items:', permanentItems);
    console.log('   Artifact Items:', artifactItems);
    console.log('   Total:', result.length);

    console.log('✅ WC3 items populated successfully!');
  } catch (error) {
    console.error('❌ Error populating WC3 items:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

populateWC3Items(); 