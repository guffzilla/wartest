const mongoose = require('mongoose');
require('dotenv').config();

async function cleanOAuthData() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';
    // Replace 'mongo' with 'localhost' if found
    const correctedUri = mongoUri.replace('mongodb://mongo:', 'mongodb://localhost:');
    await mongoose.connect(correctedUri);
    console.log('✅ Connected to MongoDB');

    // Remove OAuth profile data fields from all users
    const result = await mongoose.connection.db.collection('users').updateMany(
      {},
      {
        $unset: {
          'oauthData': '',
          'preferences': ''
        }
      }
    );

    console.log(`🧹 Cleaned OAuth data from ${result.modifiedCount} users`);

    // Show sample of remaining OAuth fields (just IDs for auth)
    const sampleUser = await mongoose.connection.db.collection('users').findOne(
      { 
        $or: [
          { googleId: { $exists: true } },
          { discordId: { $exists: true } },
          { twitchId: { $exists: true } }
        ]
      },
      { projection: { googleId: 1, discordId: 1, twitchId: 1, displayName: 1, avatar: 1 } }
    );

    if (sampleUser) {
      console.log('📋 Sample user OAuth data after cleanup:', {
        googleId: sampleUser.googleId ? 'PRESENT' : 'NOT SET',
        discordId: sampleUser.discordId ? 'PRESENT' : 'NOT SET', 
        twitchId: sampleUser.twitchId ? 'PRESENT' : 'NOT SET',
        displayName: sampleUser.displayName || 'NOT SET',
        avatar: sampleUser.avatar || 'DEFAULT'
      });
    }

    console.log('✅ OAuth data cleanup completed');
    
  } catch (error) {
    console.error('❌ Error cleaning OAuth data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  cleanOAuthData();
}

module.exports = { cleanOAuthData }; 