const mongoose = require('mongoose');
const War2Map = require('../models/War2Map');

// Game type mapping from old to new
const gameTypeMapping = {
  'war1': 'wc1',
  'war2': 'wc2',
  'war3': 'wc3',
  'warcraft1': 'wc1',
  'warcraft2': 'wc2',
  'warcraft3': 'wc3'
};

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('🔗 Connected to MongoDB');
  
  try {
    console.log('🚀 Starting map game type update...\n');
    
    // Find all maps with old game type values
    const oldGameTypes = Object.keys(gameTypeMapping);
    const mapsToUpdate = await War2Map.find({
      gameType: { $in: oldGameTypes }
    }).lean();
    
    console.log(`📊 Found ${mapsToUpdate.length} maps with old game type values`);
    
    if (mapsToUpdate.length === 0) {
      console.log('✅ All maps are already using the correct wc1, wc2, wc3 values.');
      return;
    }
    
    // Show what we found
    console.log('\nMaps that need updating:');
    mapsToUpdate.forEach(map => {
      console.log(`  "${map.name}" (ID: ${map._id}) - Current: ${map.gameType} → New: ${gameTypeMapping[map.gameType]}`);
    });
    
    // Update the maps
    console.log('\n🔄 Updating maps...');
    let updatedCount = 0;
    
    for (const map of mapsToUpdate) {
      const newGameType = gameTypeMapping[map.gameType];
      
      try {
        await War2Map.updateOne(
          { _id: map._id },
          { $set: { gameType: newGameType } }
        );
        
        console.log(`  ✅ Updated "${map.name}": ${map.gameType} → ${newGameType}`);
        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Failed to update "${map.name}":`, error.message);
      }
    }
    
    console.log(`\n📊 Update Summary:`);
    console.log(`  Total maps found: ${mapsToUpdate.length}`);
    console.log(`  Successfully updated: ${updatedCount}`);
    console.log(`  Failed: ${mapsToUpdate.length - updatedCount}`);
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const remainingOldMaps = await War2Map.find({
      gameType: { $in: oldGameTypes }
    }).lean();
    
    if (remainingOldMaps.length === 0) {
      console.log('✅ All maps have been successfully updated to use wc1, wc2, wc3 values.');
    } else {
      console.log(`⚠️  ${remainingOldMaps.length} maps still have old game type values:`);
      remainingOldMaps.forEach(map => {
        console.log(`  "${map.name}" still has gameType: ${map.gameType}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating map game types:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
});
