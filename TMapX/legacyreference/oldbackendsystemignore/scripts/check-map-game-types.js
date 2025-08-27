const mongoose = require('mongoose');
const War2Map = require('../models/War2Map');
const War1Map = require('../models/War1Map');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('🔗 Connected to MongoDB');
  
  try {
    console.log('🔍 Checking map collections for game type values...\n');
    
    // Check War2Map collection (which handles WC1, WC2, and WC3 maps)
    console.log('📊 Checking War2Map collection...');
    const war2Maps = await War2Map.find({}).lean();
    console.log(`Total War2Map records: ${war2Maps.length}`);
    
    // Group by gameType
    const gameTypeCounts = {};
    war2Maps.forEach(map => {
      const gameType = map.gameType || 'undefined';
      gameTypeCounts[gameType] = (gameTypeCounts[gameType] || 0) + 1;
    });
    
    console.log('Game type distribution in War2Map collection:');
    Object.entries(gameTypeCounts).forEach(([gameType, count]) => {
      console.log(`  ${gameType}: ${count} maps`);
    });
    
    // Show sample maps for each game type
    console.log('\nSample maps by game type:');
    Object.keys(gameTypeCounts).forEach(gameType => {
      const sampleMap = war2Maps.find(map => map.gameType === gameType);
      if (sampleMap) {
        console.log(`  ${gameType}: "${sampleMap.name}" (ID: ${sampleMap._id})`);
      }
    });
    
    // Check War1Map collection (WC1 scenarios)
    console.log('\n📊 Checking War1Map collection...');
    const war1Maps = await War1Map.find({}).lean();
    console.log(`Total War1Map records: ${war1Maps.length}`);
    
    if (war1Maps.length > 0) {
      console.log('Sample War1Map records:');
      war1Maps.slice(0, 3).forEach(map => {
        console.log(`  "${map.name}" (Category: ${map.category}, ID: ${map._id})`);
      });
    }
    
    // Check if there are any maps with old game type values
    const oldGameTypes = ['war1', 'war2', 'war3', 'warcraft1', 'warcraft2', 'warcraft3'];
    const mapsWithOldTypes = war2Maps.filter(map => oldGameTypes.includes(map.gameType));
    
    if (mapsWithOldTypes.length > 0) {
      console.log('\n⚠️  Found maps with old game type values:');
      mapsWithOldTypes.forEach(map => {
        console.log(`  "${map.name}" has gameType: ${map.gameType}`);
      });
      console.log('\n✅ These maps need to be updated to use wc1, wc2, wc3 values.');
    } else {
      console.log('\n✅ All maps are using the correct wc1, wc2, wc3 game type values.');
    }
    
  } catch (error) {
    console.error('❌ Error checking map collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
});
