const mongoose = require('mongoose');
const DarkPortalLink = require('../models/DarkPortalLink');

async function checkDarkPortal() {
  try {
    console.log('🔍 Checking Dark Portal database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite');
    console.log('✅ Connected to MongoDB');
    
    // Check all links
    const allLinks = await DarkPortalLink.find({});
    console.log(`📊 Total links in database: ${allLinks.length}`);
    
    if (allLinks.length > 0) {
      console.log('\n📋 Sample links:');
      allLinks.slice(0, 5).forEach(link => {
        console.log(`- ${link.title} (${link.category}, ${link.gameType}, ${link.status})`);
      });
      
      // Check by status
      const approvedLinks = await DarkPortalLink.find({ status: 'approved' });
      console.log(`\n✅ Approved links: ${approvedLinks.length}`);
      
      // Check by game type
      const wc12Links = await DarkPortalLink.find({ gameType: 'wc12' });
      const wc3Links = await DarkPortalLink.find({ gameType: 'wc3' });
      console.log(`🎮 WC1/2 links: ${wc12Links.length}`);
      console.log(`🎮 WC3 links: ${wc3Links.length}`);
      
      // Check by category
      const redditLinks = await DarkPortalLink.find({ category: 'reddit' });
      console.log(`📱 Reddit links: ${redditLinks.length}`);
      
    } else {
      console.log('❌ No links found in database');
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error checking Dark Portal:', error);
    process.exit(1);
  }
}

// Run the check script
if (require.main === module) {
  checkDarkPortal();
}

module.exports = { checkDarkPortal };
