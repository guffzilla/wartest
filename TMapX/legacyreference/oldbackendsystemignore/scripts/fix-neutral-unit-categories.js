const mongoose = require('mongoose');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';

// Category mappings for neutral units
const categoryMappings = {
  // Creeps
  'Gnoll': 'creep',
  'Gnoll Brute': 'creep',
  'Gnoll Assassin': 'creep',
  'Kobold': 'creep',
  'Kobold Geomancer': 'creep',
  'Murloc': 'creep',
  'Murloc Nightcrawler': 'creep',
  'Ogre': 'creep',
  'Ogre Warrior': 'creep',
  'Ogre Magi': 'creep',
  'Troll': 'creep',
  'Troll Berserker': 'creep',
  'Troll Priest': 'creep',
  'Harpy': 'creep',
  'Harpy Scout': 'creep',
  'Harpy Windwitch': 'creep',
  'Centaur': 'creep',
  'Centaur Outrunner': 'creep',
  'Centaur Khan': 'creep',
  'Furbolg': 'creep',
  'Furbolg Shaman': 'creep',
  'Furbolg Ursa Warrior': 'creep',
  
  // Mercenaries
  'Goblin Sapper': 'mercenary',
  'Goblin Tinker': 'mercenary',
  'Goblin Shredder': 'mercenary',
  'Goblin Zeppelin': 'mercenary',
  'Goblin Alchemist': 'mercenary',
  'Pandaren Brewmaster': 'mercenary',
  'Dark Ranger': 'mercenary',
  'Naga Sea Witch': 'mercenary',
  'Beastmaster': 'mercenary',
  'Firelord': 'mercenary',
  
  // Heroes
  'Pit Lord': 'hero',
  'Tinker': 'hero',
  'Warden': 'hero'
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

async function fixNeutralUnitCategories() {
  try {
    console.log('🔧 Fixing neutral unit categories...');
    
    const neutralUnits = await GameUnit.find({ 
      game: 'wc3', 
      race: 'neutral',
      type: 'unit'
    });
    
    console.log(`📊 Found ${neutralUnits.length} neutral units to update`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const unit of neutralUnits) {
      const category = categoryMappings[unit.name];
      
      if (category) {
        // Use findByIdAndUpdate instead of updateOne
        await GameUnit.findByIdAndUpdate(
          unit._id,
          { category: category },
          { new: true }
        );
        console.log(`✅ Updated ${unit.name} -> ${category}`);
        updatedCount++;
      } else {
        console.log(`⚠️ No category mapping found for: ${unit.name}`);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   - Updated: ${updatedCount} units`);
    console.log(`   - Skipped: ${skippedCount} units`);
    
    // Verify the update
    const updatedUnits = await GameUnit.find({ 
      game: 'wc3', 
      race: 'neutral',
      type: 'unit'
    });
    
    console.log(`\n🔍 Verification - Units with categories:`);
    const creeps = updatedUnits.filter(u => u.category === 'creep');
    const mercenaries = updatedUnits.filter(u => u.category === 'mercenary');
    const heroes = updatedUnits.filter(u => u.category === 'hero');
    const uncategorized = updatedUnits.filter(u => !u.category);
    
    console.log(`   - Creeps: ${creeps.length}`);
    console.log(`   - Mercenaries: ${mercenaries.length}`);
    console.log(`   - Heroes: ${heroes.length}`);
    console.log(`   - Uncategorized: ${uncategorized.length}`);
    
    if (uncategorized.length > 0) {
      console.log(`\n⚠️ Uncategorized units:`);
      uncategorized.forEach(u => console.log(`   - ${u.name}`));
    }
    
  } catch (error) {
    console.error('❌ Error fixing neutral unit categories:', error);
  }
}

async function main() {
  console.log('🚀 Starting neutral unit category fix...');
  
  await connectToDatabase();
  await fixNeutralUnitCategories();
  
  console.log('✅ Category fix completed!');
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { categoryMappings }; 