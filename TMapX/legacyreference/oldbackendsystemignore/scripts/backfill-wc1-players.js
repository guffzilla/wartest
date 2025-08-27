/**
 * Backfill WC1 players for existing users
 * 
 * This script creates WC1 players for all existing users who:
 * 1. Have a defined username (isUsernameDefined: true)
 * 2. Don't already have a WC1 player
 * 
 * Run with: node backend/scripts/backfill-wc1-players.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Player = require('../models/Player');

// MongoDB connection string - adjust if needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';

async function backfillWC1Players() {
  console.log('🚀 Starting WC1 player backfill process...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('📦 Connected to MongoDB');

    // Find all users who have defined usernames but no WC1 player
    const usersWithoutWC1 = await User.find({
      isUsernameDefined: true,
      username: { $exists: true, $ne: null }
    });

    console.log(`👥 Found ${usersWithoutWC1.length} users with defined usernames`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of usersWithoutWC1) {
      try {
        // Check if WC1 player already exists
        const existingWC1Player = await Player.findOne({
          user: user._id,
          gameType: 'wc1'
        });

        if (existingWC1Player) {
          console.log(`✅ ${user.username} already has WC1 player`);
          skipped++;
          continue;
        }

        // Create WC1 player
        const wc1Player = new Player({
          name: user.username,
          user: user._id,
          gameType: 'wc1',
          mmr: 1200, // Default MMR for WC1
          wins: 0,
          losses: 0,
          isActive: true,
          autoCreated: true,
          createdAt: new Date()
        });

        await wc1Player.save();
        console.log(`✅ Created WC1 player for ${user.username}`);
        created++;

      } catch (error) {
        console.error(`❌ Error creating WC1 player for ${user.username}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Backfill Summary:');
    console.log(`✅ Created: ${created} WC1 players`);
    console.log(`⏭️ Skipped: ${skipped} (already had WC1 players)`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Total users processed: ${usersWithoutWC1.length}`);

  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  backfillWC1Players()
    .then(() => {
      console.log('🎉 WC1 player backfill completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Backfill failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillWC1Players }; 