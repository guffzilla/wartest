const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';

// Neutral units data structure
const neutralUnits = {
  creeps: [
    {
      name: "Gnoll",
      description: "Basic neutral creep unit. Weak but numerous.",
      stats: { hp: 240, attack: "8-8", armor: 0, range: 1, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Gnoll Brute",
      description: "Stronger version of the Gnoll with more health and damage.",
      stats: { hp: 400, attack: "12-12", armor: 1, range: 1, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Gnoll Assassin",
      description: "Ranged Gnoll unit with poison attack.",
      stats: { hp: 320, attack: "10-10", armor: 0, range: 600, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Kobold",
      description: "Small, weak neutral unit often found in groups.",
      stats: { hp: 200, attack: "6-6", armor: 0, range: 1, sight: 1200, speed: 270 },
      category: "creep"
    },
    {
      name: "Kobold Geomancer",
      description: "Kobold spellcaster with magical abilities.",
      stats: { hp: 280, attack: "8-8", armor: 0, range: 600, sight: 1200, speed: 270, mana: 200 },
      category: "creep"
    },
    {
      name: "Murloc",
      description: "Amphibious neutral unit found near water.",
      stats: { hp: 240, attack: "7-7", armor: 0, range: 1, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Murloc Nightcrawler",
      description: "Elite Murloc unit with enhanced abilities.",
      stats: { hp: 400, attack: "11-11", armor: 1, range: 1, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Ogre",
      description: "Large, powerful neutral unit with high health.",
      stats: { hp: 600, attack: "15-15", armor: 2, range: 1, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Ogre Warrior",
      description: "Elite Ogre unit with enhanced combat abilities.",
      stats: { hp: 800, attack: "18-18", armor: 3, range: 1, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Ogre Magi",
      description: "Ogre spellcaster with powerful magical abilities.",
      stats: { hp: 500, attack: "10-10", armor: 1, range: 600, sight: 1400, speed: 270, mana: 300 },
      category: "creep"
    },
    {
      name: "Troll",
      description: "Ranged neutral unit with regeneration abilities.",
      stats: { hp: 300, attack: "9-9", armor: 0, range: 600, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Troll Berserker",
      description: "Elite Troll unit with enhanced combat abilities.",
      stats: { hp: 450, attack: "13-13", armor: 1, range: 600, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Troll Priest",
      description: "Troll spellcaster with healing abilities.",
      stats: { hp: 350, attack: "8-8", armor: 0, range: 600, sight: 1400, speed: 270, mana: 250 },
      category: "creep"
    },
    {
      name: "Harpy",
      description: "Flying neutral unit with ranged attacks.",
      stats: { hp: 280, attack: "9-9", armor: 0, range: 600, sight: 1400, speed: 350 },
      category: "creep"
    },
    {
      name: "Harpy Scout",
      description: "Fast flying unit with enhanced sight range.",
      stats: { hp: 240, attack: "7-7", armor: 0, range: 600, sight: 1800, speed: 400 },
      category: "creep"
    },
    {
      name: "Harpy Windwitch",
      description: "Elite Harpy with magical abilities.",
      stats: { hp: 400, attack: "12-12", armor: 1, range: 600, sight: 1400, speed: 350, mana: 200 },
      category: "creep"
    },
    {
      name: "Centaur",
      description: "Powerful neutral unit with high mobility.",
      stats: { hp: 500, attack: "14-14", armor: 2, range: 1, sight: 1400, speed: 320 },
      category: "creep"
    },
    {
      name: "Centaur Outrunner",
      description: "Fast Centaur unit with enhanced mobility.",
      stats: { hp: 400, attack: "11-11", armor: 1, range: 1, sight: 1400, speed: 400 },
      category: "creep"
    },
    {
      name: "Centaur Khan",
      description: "Elite Centaur leader with powerful abilities.",
      stats: { hp: 700, attack: "17-17", armor: 3, range: 1, sight: 1400, speed: 320 },
      category: "creep"
    },
    {
      name: "Furbolg",
      description: "Large, powerful neutral unit with high health.",
      stats: { hp: 600, attack: "16-16", armor: 2, range: 1, sight: 1400, speed: 270 },
      category: "creep"
    },
    {
      name: "Furbolg Shaman",
      description: "Furbolg spellcaster with magical abilities.",
      stats: { hp: 450, attack: "10-10", armor: 1, range: 600, sight: 1400, speed: 270, mana: 300 },
      category: "creep"
    },
    {
      name: "Furbolg Ursa Warrior",
      description: "Elite Furbolg warrior with enhanced combat abilities.",
      stats: { hp: 800, attack: "20-20", armor: 3, range: 1, sight: 1400, speed: 270 },
      category: "creep"
    }
  ],
  mercenaries: [
    {
      name: "Goblin Sapper",
      description: "Explosive mercenary unit that can destroy buildings.",
      stats: { hp: 200, attack: "5-5", armor: 0, range: 1, sight: 1400, speed: 270 },
      costs: { gold: 150, wood: 0, food: 1 },
      category: "mercenary"
    },
    {
      name: "Goblin Tinker",
      description: "Mechanical mercenary with repair abilities.",
      stats: { hp: 300, attack: "8-8", armor: 1, range: 1, sight: 1400, speed: 270 },
      costs: { gold: 200, wood: 0, food: 2 },
      category: "mercenary"
    },
    {
      name: "Goblin Shredder",
      description: "Powerful mechanical unit that can harvest lumber.",
      stats: { hp: 400, attack: "12-12", armor: 2, range: 1, sight: 1400, speed: 270 },
      costs: { gold: 250, wood: 0, food: 3 },
      category: "mercenary"
    },
    {
      name: "Goblin Zeppelin",
      description: "Flying transport unit for carrying units and resources.",
      stats: { hp: 500, attack: "0-0", armor: 1, range: 1, sight: 1400, speed: 350 },
      costs: { gold: 300, wood: 0, food: 0 },
      category: "mercenary"
    },
    {
      name: "Goblin Alchemist",
      description: "Mercenary spellcaster with healing and buff abilities.",
      stats: { hp: 350, attack: "6-6", armor: 0, range: 600, sight: 1400, speed: 270, mana: 400 },
      costs: { gold: 275, wood: 0, food: 2 },
      category: "mercenary"
    },
    {
      name: "Pandaren Brewmaster",
      description: "Powerful neutral hero with unique abilities.",
      stats: { hp: 600, attack: "15-15", armor: 2, range: 1, sight: 1400, speed: 270, mana: 300 },
      costs: { gold: 425, wood: 0, food: 5 },
      category: "mercenary"
    },
    {
      name: "Dark Ranger",
      description: "Undead-themed mercenary with death magic.",
      stats: { hp: 450, attack: "12-12", armor: 1, range: 600, sight: 1400, speed: 270, mana: 350 },
      costs: { gold: 400, wood: 0, food: 4 },
      category: "mercenary"
    },
    {
      name: "Naga Sea Witch",
      description: "Aquatic mercenary with water magic abilities.",
      stats: { hp: 500, attack: "14-14", armor: 1, range: 600, sight: 1400, speed: 270, mana: 400 },
      costs: { gold: 450, wood: 0, food: 5 },
      category: "mercenary"
    },
    {
      name: "Beastmaster",
      description: "Mercenary hero that can summon animal companions.",
      stats: { hp: 550, attack: "13-13", armor: 2, range: 1, sight: 1400, speed: 270, mana: 300 },
      costs: { gold: 425, wood: 0, food: 5 },
      category: "mercenary"
    },
    {
      name: "Firelord",
      description: "Elemental mercenary with fire magic abilities.",
      stats: { hp: 500, attack: "14-14", armor: 1, range: 600, sight: 1400, speed: 270, mana: 350 },
      costs: { gold: 425, wood: 0, food: 5 },
      category: "mercenary"
    }
  ],
  heroes: [
    {
      name: "Pit Lord",
      description: "Powerful demon hero with fire and chaos abilities.",
      stats: { hp: 800, attack: "18-18", armor: 3, range: 1, sight: 1400, speed: 270, mana: 400 },
      category: "hero"
    },
    {
      name: "Goblin Alchemist",
      description: "Hero with healing and transmutation abilities.",
      stats: { hp: 600, attack: "12-12", armor: 2, range: 1, sight: 1400, speed: 270, mana: 500 },
      category: "hero"
    },
    {
      name: "Firelord",
      description: "Elemental hero with powerful fire magic.",
      stats: { hp: 650, attack: "15-15", armor: 2, range: 600, sight: 1400, speed: 270, mana: 450 },
      category: "hero"
    },
    {
      name: "Dark Ranger",
      description: "Undead-themed hero with death and shadow magic.",
      stats: { hp: 550, attack: "14-14", armor: 1, range: 600, sight: 1400, speed: 270, mana: 400 },
      category: "hero"
    },
    {
      name: "Naga Sea Witch",
      description: "Aquatic hero with water and ice magic.",
      stats: { hp: 600, attack: "15-15", armor: 2, range: 600, sight: 1400, speed: 270, mana: 450 },
      category: "hero"
    },
    {
      name: "Beastmaster",
      description: "Hero that can summon and control animals.",
      stats: { hp: 650, attack: "13-13", armor: 2, range: 1, sight: 1400, speed: 270, mana: 350 },
      category: "hero"
    },
    {
      name: "Tinker",
      description: "Mechanical hero with engineering abilities.",
      stats: { hp: 550, attack: "11-11", armor: 2, range: 1, sight: 1400, speed: 270, mana: 400 },
      category: "hero"
    },
    {
      name: "Warden",
      description: "Elite assassin hero with shadow and poison abilities.",
      stats: { hp: 600, attack: "16-16", armor: 2, range: 1, sight: 1400, speed: 270, mana: 350 },
      category: "hero"
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

async function clearExistingNeutralUnits() {
  try {
    const result = await GameUnit.deleteMany({ 
      game: 'wc3', 
      race: 'neutral',
      type: 'unit'
    });
    console.log(`🗑️ Deleted ${result.deletedCount} existing neutral units`);
  } catch (error) {
    console.error('❌ Error clearing existing neutral units:', error);
  }
}

async function insertNeutralUnits() {
  try {
    const unitsToInsert = [];
    
    // Process creeps
    neutralUnits.creeps.forEach(creep => {
      unitsToInsert.push({
        game: 'wc3',
        race: 'neutral',
        type: 'unit',
        name: creep.name,
        description: creep.description,
        stats: creep.stats,
        category: creep.category,
        source: 'wowpedia'
      });
    });
    
    // Process mercenaries
    neutralUnits.mercenaries.forEach(mercenary => {
      unitsToInsert.push({
        game: 'wc3',
        race: 'neutral',
        type: 'unit',
        name: mercenary.name,
        description: mercenary.description,
        stats: mercenary.stats,
        costs: mercenary.costs,
        category: mercenary.category,
        source: 'wowpedia'
      });
    });
    
    // Process heroes
    neutralUnits.heroes.forEach(hero => {
      unitsToInsert.push({
        game: 'wc3',
        race: 'neutral',
        type: 'unit',
        name: hero.name,
        description: hero.description,
        stats: hero.stats,
        category: hero.category,
        source: 'wowpedia'
      });
    });
    
    const result = await GameUnit.insertMany(unitsToInsert);
    console.log(`✅ Successfully inserted ${result.length} neutral units`);
    
    // Log summary
    const creepsCount = neutralUnits.creeps.length;
    const mercenariesCount = neutralUnits.mercenaries.length;
    const heroesCount = neutralUnits.heroes.length;
    
    console.log(`📊 Summary:`);
    console.log(`   - Creeps: ${creepsCount}`);
    console.log(`   - Mercenaries: ${mercenariesCount}`);
    console.log(`   - Heroes: ${heroesCount}`);
    console.log(`   - Total: ${creepsCount + mercenariesCount + heroesCount}`);
    
  } catch (error) {
    console.error('❌ Error inserting neutral units:', error);
  }
}

async function main() {
  console.log('🚀 Starting Warcraft 3 neutral units import...');
  
  await connectToDatabase();
  await clearExistingNeutralUnits();
  await insertNeutralUnits();
  
  console.log('✅ Import completed successfully!');
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { neutralUnits }; 