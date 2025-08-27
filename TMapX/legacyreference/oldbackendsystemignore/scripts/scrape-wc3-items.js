const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';

// Warcraft 3 items data
const wc3Items = {
  consumables: [
    {
      name: "Healing Salve",
      description: "Restores 400 HP over 45 seconds. Interrupted by damage.",
      stats: { hp: 400 },
      costs: { gold: 100, wood: 0 },
      category: "consumable"
    },
    {
      name: "Mana Potion",
      description: "Restores 200 mana instantly.",
      stats: { mana: 200 },
      costs: { gold: 100, wood: 0 },
      category: "consumable"
    },
    {
      name: "Scroll of Town Portal",
      description: "Teleports hero and nearby units to town hall.",
      costs: { gold: 350, wood: 0 },
      category: "consumable"
    },
    {
      name: "Scroll of Protection",
      description: "Increases armor of nearby units by 5 for 45 seconds.",
      stats: { armor: 5 },
      costs: { gold: 150, wood: 0 },
      category: "consumable"
    },
    {
      name: "Scroll of Speed",
      description: "Increases movement speed of nearby units by 50% for 45 seconds.",
      stats: { speed: 50 },
      costs: { gold: 150, wood: 0 },
      category: "consumable"
    },
    {
      name: "Dust of Appearance",
      description: "Reveals invisible units in a large area for 10 seconds.",
      costs: { gold: 100, wood: 0 },
      category: "consumable"
    },
    {
      name: "Potion of Invisibility",
      description: "Makes hero invisible for 15 seconds. Attacking breaks invisibility.",
      costs: { gold: 100, wood: 0 },
      category: "consumable"
    },
    {
      name: "Potion of Restoration",
      description: "Restores 500 HP and 300 mana over 45 seconds.",
      stats: { hp: 500, mana: 300 },
      costs: { gold: 150, wood: 0 },
      category: "consumable"
    },
    {
      name: "Clarity Potion",
      description: "Restores 200 mana over 30 seconds. Interrupted by damage.",
      stats: { mana: 200 },
      costs: { gold: 100, wood: 0 },
      category: "consumable"
    },
    {
      name: "Lesser Clarity Potion",
      description: "Restores 100 mana over 20 seconds. Interrupted by damage.",
      stats: { mana: 100 },
      costs: { gold: 50, wood: 0 },
      category: "consumable"
    }
  ],
  permanent: [
    {
      name: "Ring of Protection +2",
      description: "Increases hero armor by 2.",
      stats: { armor: 2 },
      costs: { gold: 175, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Protection +3",
      description: "Increases hero armor by 3.",
      stats: { armor: 3 },
      costs: { gold: 250, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Protection +4",
      description: "Increases hero armor by 4.",
      stats: { armor: 4 },
      costs: { gold: 325, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Protection +5",
      description: "Increases hero armor by 5.",
      stats: { armor: 5 },
      costs: { gold: 400, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Regeneration",
      description: "Regenerates 2 HP per second.",
      stats: { hpRegen: 2 },
      costs: { gold: 175, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Regeneration +1",
      description: "Regenerates 3 HP per second.",
      stats: { hpRegen: 3 },
      costs: { gold: 250, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Regeneration +2",
      description: "Regenerates 4 HP per second.",
      stats: { hpRegen: 4 },
      costs: { gold: 325, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Regeneration +3",
      description: "Regenerates 5 HP per second.",
      stats: { hpRegen: 5 },
      costs: { gold: 400, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Regeneration +4",
      description: "Regenerates 6 HP per second.",
      stats: { hpRegen: 6 },
      costs: { gold: 475, wood: 0 },
      category: "permanent"
    },
    {
      name: "Ring of Regeneration +5",
      description: "Regenerates 7 HP per second.",
      stats: { hpRegen: 7 },
      costs: { gold: 550, wood: 0 },
      category: "permanent"
    },
    {
      name: "Sobi Mask",
      description: "Regenerates 1 mana per second.",
      stats: { manaRegen: 1 },
      costs: { gold: 175, wood: 0 },
      category: "permanent"
    },
    {
      name: "Sobi Mask +1",
      description: "Regenerates 2 mana per second.",
      stats: { manaRegen: 2 },
      costs: { gold: 250, wood: 0 },
      category: "permanent"
    },
    {
      name: "Sobi Mask +2",
      description: "Regenerates 3 mana per second.",
      stats: { manaRegen: 3 },
      costs: { gold: 325, wood: 0 },
      category: "permanent"
    },
    {
      name: "Sobi Mask +3",
      description: "Regenerates 4 mana per second.",
      stats: { manaRegen: 4 },
      costs: { gold: 400, wood: 0 },
      category: "permanent"
    },
    {
      name: "Sobi Mask +4",
      description: "Regenerates 5 mana per second.",
      stats: { manaRegen: 5 },
      costs: { gold: 475, wood: 0 },
      category: "permanent"
    },
    {
      name: "Sobi Mask +5",
      description: "Regenerates 6 mana per second.",
      stats: { manaRegen: 6 },
      costs: { gold: 550, wood: 0 },
      category: "permanent"
    },
    {
      name: "Claws of Attack +3",
      description: "Increases attack damage by 3.",
      stats: { attack: 3 },
      costs: { gold: 175, wood: 0 },
      category: "permanent"
    },
    {
      name: "Claws of Attack +6",
      description: "Increases attack damage by 6.",
      stats: { attack: 6 },
      costs: { gold: 250, wood: 0 },
      category: "permanent"
    },
    {
      name: "Claws of Attack +9",
      description: "Increases attack damage by 9.",
      stats: { attack: 9 },
      costs: { gold: 325, wood: 0 },
      category: "permanent"
    },
    {
      name: "Claws of Attack +12",
      description: "Increases attack damage by 12.",
      stats: { attack: 12 },
      costs: { gold: 400, wood: 0 },
      category: "permanent"
    },
    {
      name: "Claws of Attack +15",
      description: "Increases attack damage by 15.",
      stats: { attack: 15 },
      costs: { gold: 475, wood: 0 },
      category: "permanent"
    },
    {
      name: "Claws of Attack +18",
      description: "Increases attack damage by 18.",
      stats: { attack: 18 },
      costs: { gold: 550, wood: 0 },
      category: "permanent"
    },
    {
      name: "Boots of Speed",
      description: "Increases movement speed by 50.",
      stats: { speed: 50 },
      costs: { gold: 175, wood: 0 },
      category: "permanent"
    },
    {
      name: "Boots of Speed +1",
      description: "Increases movement speed by 60.",
      stats: { speed: 60 },
      costs: { gold: 250, wood: 0 },
      category: "permanent"
    },
    {
      name: "Boots of Speed +2",
      description: "Increases movement speed by 70.",
      stats: { speed: 70 },
      costs: { gold: 325, wood: 0 },
      category: "permanent"
    },
    {
      name: "Boots of Speed +3",
      description: "Increases movement speed by 80.",
      stats: { speed: 80 },
      costs: { gold: 400, wood: 0 },
      category: "permanent"
    },
    {
      name: "Boots of Speed +4",
      description: "Increases movement speed by 90.",
      stats: { speed: 90 },
      costs: { gold: 475, wood: 0 },
      category: "permanent"
    },
    {
      name: "Boots of Speed +5",
      description: "Increases movement speed by 100.",
      stats: { speed: 100 },
      costs: { gold: 550, wood: 0 },
      category: "permanent"
    }
  ],
  artifacts: [
    {
      name: "Crown of Kings +5",
      description: "Increases all attributes by 5.",
      stats: { allStats: 5 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Crown of Kings +10",
      description: "Increases all attributes by 10.",
      stats: { allStats: 10 },
      costs: { gold: 2000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Mask of Death",
      description: "Grants 15% life steal on attacks.",
      stats: { lifeSteal: 15 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Mask of Death +1",
      description: "Grants 20% life steal on attacks.",
      stats: { lifeSteal: 20 },
      costs: { gold: 1500, wood: 0 },
      category: "artifact"
    },
    {
      name: "Mask of Death +2",
      description: "Grants 25% life steal on attacks.",
      stats: { lifeSteal: 25 },
      costs: { gold: 2000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Mask of Death +3",
      description: "Grants 30% life steal on attacks.",
      stats: { lifeSteal: 30 },
      costs: { gold: 2500, wood: 0 },
      category: "artifact"
    },
    {
      name: "Mask of Death +4",
      description: "Grants 35% life steal on attacks.",
      stats: { lifeSteal: 35 },
      costs: { gold: 3000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Mask of Death +5",
      description: "Grants 40% life steal on attacks.",
      stats: { lifeSteal: 40 },
      costs: { gold: 3500, wood: 0 },
      category: "artifact"
    },
    {
      name: "Orb of Darkness",
      description: "Attacks slow enemy movement speed by 25% for 3 seconds.",
      stats: { slowEffect: 25 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Orb of Fire",
      description: "Attacks deal 5 splash damage to nearby enemies.",
      stats: { splashDamage: 5 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Orb of Frost",
      description: "Attacks slow enemy attack speed by 25% for 3 seconds.",
      stats: { attackSlow: 25 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Orb of Lightning",
      description: "Attacks chain to 3 additional enemies for 75% damage.",
      stats: { chainTargets: 3, chainDamage: 75 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Orb of Venom",
      description: "Attacks poison enemies for 5 damage per second for 10 seconds.",
      stats: { poisonDamage: 5, poisonDuration: 10 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Staff of Preservation",
      description: "Revives hero at town hall when killed.",
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Staff of Teleportation",
      description: "Teleports hero to target location.",
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Diamond",
      description: "Increases attack damage by 25 and grants chain lightning ability.",
      stats: { attack: 25 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Egg",
      description: "Summons a Thunder Lizard to fight for you.",
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Eye",
      description: "Increases attack damage by 15 and grants chain lightning ability.",
      stats: { attack: 15 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Fang",
      description: "Increases attack damage by 20 and grants chain lightning ability.",
      stats: { attack: 20 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Heart",
      description: "Increases attack damage by 30 and grants chain lightning ability.",
      stats: { attack: 30 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Horn",
      description: "Increases attack damage by 35 and grants chain lightning ability.",
      stats: { attack: 35 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Mane",
      description: "Increases attack damage by 40 and grants chain lightning ability.",
      stats: { attack: 40 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Scales",
      description: "Increases attack damage by 45 and grants chain lightning ability.",
      stats: { attack: 45 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    },
    {
      name: "Thunder Lizard Tail",
      description: "Increases attack damage by 50 and grants chain lightning ability.",
      stats: { attack: 50 },
      costs: { gold: 1000, wood: 0 },
      category: "artifact"
    }
  ]
};

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function clearExistingItems() {
  try {
    const result = await GameUnit.deleteMany({ 
      game: 'wc3', 
      race: 'neutral',
      type: 'item'
    });
    console.log(`🗑️ Deleted ${result.deletedCount} existing items`);
  } catch (error) {
    console.error('❌ Error clearing existing items:', error);
  }
}

async function insertItems() {
  try {
    const itemsToInsert = [];
    
    // Process consumables
    wc3Items.consumables.forEach(item => {
      itemsToInsert.push({
        game: 'wc3',
        race: 'neutral',
        type: 'item',
        name: item.name,
        description: item.description,
        stats: item.stats,
        costs: item.costs,
        category: item.category,
        source: 'wowpedia'
      });
    });
    
    // Process permanent items
    wc3Items.permanent.forEach(item => {
      itemsToInsert.push({
        game: 'wc3',
        race: 'neutral',
        type: 'item',
        name: item.name,
        description: item.description,
        stats: item.stats,
        costs: item.costs,
        category: item.category,
        source: 'wowpedia'
      });
    });
    
    // Process artifacts
    wc3Items.artifacts.forEach(item => {
      itemsToInsert.push({
        game: 'wc3',
        race: 'neutral',
        type: 'item',
        name: item.name,
        description: item.description,
        stats: item.stats,
        costs: item.costs,
        category: item.category,
        source: 'wowpedia'
      });
    });
    
    const result = await GameUnit.insertMany(itemsToInsert);
    console.log(`✅ Successfully inserted ${result.length} items`);
    
    // Log summary
    const consumablesCount = wc3Items.consumables.length;
    const permanentCount = wc3Items.permanent.length;
    const artifactsCount = wc3Items.artifacts.length;
    
    console.log(`📊 Summary:`);
    console.log(`   - Consumables: ${consumablesCount}`);
    console.log(`   - Permanent: ${permanentCount}`);
    console.log(`   - Artifacts: ${artifactsCount}`);
    console.log(`   - Total: ${consumablesCount + permanentCount + artifactsCount}`);
    
  } catch (error) {
    console.error('❌ Error inserting items:', error);
  }
}

async function main() {
  console.log('🚀 Starting Warcraft 3 items import...');
  
  await connectToDatabase();
  await clearExistingItems();
  await insertItems();
  
  console.log('✅ Items import completed successfully!');
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { wc3Items }; 