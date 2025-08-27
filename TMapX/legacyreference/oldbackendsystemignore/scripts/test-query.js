const mongoose = require('mongoose');
const DarkPortalLink = require('../models/DarkPortalLink');

async function testQuery() {
  try {
    console.log('🔍 Testing Dark Portal query...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite');
    console.log('✅ Connected to MongoDB');
    
    const gameType = 'wc12';
    const category = 'reddit';
    
    console.log(`\n🔍 Testing query for category: ${category}, gameType: ${gameType}`);
    
    // Test the exact query from getApprovedLinks
    const query = { 
      status: 'approved',
      category: category
    };
    
    // If gameType is specified and not 'all', filter by it
    if (gameType && gameType !== 'all') {
      query.gameType = gameType;
    }
    
    console.log('🔍 Query:', JSON.stringify(query, null, 2));
    
    const results = await DarkPortalLink.find(query);
    console.log(`📊 Results found: ${results.length}`);
    
    if (results.length > 0) {
      console.log('\n📋 Found links:');
      results.forEach(link => {
        console.log(`- ${link.title} (${link.category}, ${link.gameType})`);
      });
    }
    
    // Test simpler query
    console.log('\n🔍 Testing simpler query...');
    const simpleQuery = { 
      status: 'approved',
      category: category,
      gameType: gameType
    };
    
    console.log('🔍 Simple query:', JSON.stringify(simpleQuery, null, 2));
    
    const simpleResults = await DarkPortalLink.find(simpleQuery);
    console.log(`📊 Simple results found: ${simpleResults.length}`);
    
    if (simpleResults.length > 0) {
      console.log('\n📋 Simple query found:');
      simpleResults.forEach(link => {
        console.log(`- ${link.title} (${link.category}, ${link.gameType})`);
      });
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error testing query:', error);
    process.exit(1);
  }
}

// Run the test script
if (require.main === module) {
  testQuery();
}

module.exports = { testQuery };
