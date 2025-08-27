const mongoose = require('mongoose');
const War2Map = require('../models/War2Map');
const War1Map = require('../models/War1Map');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkMaps() {
  console.log('🔍 Checking existing map data...\n');

  try {
    // Check WC2 maps
    const war2maps = await War2Map.find({}, 'name').limit(20);
    console.log('🗺️ WC2 Maps found:', war2maps.length);
    console.log('WC2 Map names:', war2maps.map(m => m.name).slice(0, 10));
    
    // Check WC1 maps
    const war1maps = await War1Map.find({}, 'name').limit(20);
    console.log('\n🗺️ WC1 Maps found:', war1maps.length);
    console.log('WC1 Map names:', war1maps.map(m => m.name).slice(0, 10));
    
    // Check if War3Map model exists
    try {
      const War3Map = require('../models/War3Map');
      const war3maps = await War3Map.find({}, 'name').limit(20);
      console.log('\n🗺️ WC3 Maps found:', war3maps.length);
      console.log('WC3 Map names:', war3maps.map(m => m.name).slice(0, 10));
    } catch (e) {
      console.log('\n🗺️ WC3 Maps: Model not found or no data');
    }

  } catch (error) {
    console.error('❌ Error checking maps:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkMaps(); 