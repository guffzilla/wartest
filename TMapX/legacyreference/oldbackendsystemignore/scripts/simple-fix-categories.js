const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function fixCategories() {
  try {
    console.log('🔧 Fixing neutral unit categories...');
    
    // Get all neutral units
    const units = await GameUnit.find({ 
      game: 'wc3', 
      race: 'neutral',
      type: 'unit'
    });
    
    console.log(`📊 Found ${units.length} neutral units`);
    
    // Define categories based on unit names
    const creeps = ['Gnoll', 'Gnoll Brute', 'Gnoll Assassin', 'Kobold', 'Kobold Geomancer', 
                   'Murloc', 'Murloc Nightcrawler', 'Ogre', 'Ogre Warrior', 'Ogre Magi',
                   'Troll', 'Troll Berserker', 'Troll Priest', 'Harpy', 'Harpy Scout', 
                   'Harpy Windwitch', 'Centaur', 'Centaur Outrunner', 'Centaur Khan',
                   'Furbolg', 'Furbolg Shaman', 'Furbolg Ursa Warrior'];
    
    const mercenaries = ['Goblin Sapper', 'Goblin Tinker', 'Goblin Shredder', 'Goblin Zeppelin',
                        'Goblin Alchemist', 'Pandaren Brewmaster', 'Dark Ranger', 
                        'Naga Sea Witch', 'Beastmaster', 'Firelord'];
    
    const heroes = ['Pit Lord', 'Tinker', 'Warden'];
    
    let updatedCount = 0;
    
    for (const unit of units) {
      let category = null;
      
      if (creeps.includes(unit.name)) {
        category = 'creep';
      } else if (mercenaries.includes(unit.name)) {
        category = 'mercenary';
      } else if (heroes.includes(unit.name)) {
        category = 'hero';
      }
      
      if (category) {
        // Use save() method instead of update
        unit.category = category;
        await unit.save();
        console.log(`✅ Updated ${unit.name} -> ${category}`);
        updatedCount++;
      } else {
        console.log(`⚠️ No category found for: ${unit.name}`);
      }
    }
    
    console.log(`\n📊 Summary: Updated ${updatedCount} units`);
    
    // Verify
    const updatedUnits = await GameUnit.find({ 
      game: 'wc3', 
      race: 'neutral',
      type: 'unit'
    });
    
    const creepsCount = updatedUnits.filter(u => u.category === 'creep').length;
    const mercenariesCount = updatedUnits.filter(u => u.category === 'mercenary').length;
    const heroesCount = updatedUnits.filter(u => u.category === 'hero').length;
    const uncategorized = updatedUnits.filter(u => !u.category).length;
    
    console.log(`\n🔍 Verification:`);
    console.log(`   - Creeps: ${creepsCount}`);
    console.log(`   - Mercenaries: ${mercenariesCount}`);
    console.log(`   - Heroes: ${heroesCount}`);
    console.log(`   - Uncategorized: ${uncategorized}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  console.log('🚀 Starting category fix...');
  await connectToDatabase();
  await fixCategories();
  console.log('✅ Done!');
  process.exit(0);
}

main().catch(console.error); 