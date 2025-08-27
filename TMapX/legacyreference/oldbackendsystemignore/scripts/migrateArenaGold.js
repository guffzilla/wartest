const mongoose = require('mongoose');
const User = require('../models/User');

async function migrateArenaGold() {
  try {
    console.log('🪙 Starting Arena Gold migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite');
    console.log('✅ Connected to MongoDB');

    // Find all users without arenaGold field or with null/undefined arenaGold
    const usersToUpdate = await User.find({
      $or: [
        { arenaGold: { $exists: false } },
        { arenaGold: null },
        { arenaGold: undefined }
      ]
    });

    console.log(`📊 Found ${usersToUpdate.length} users to update`);

    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have arenaGold field');
      await mongoose.disconnect();
      return;
    }

    // Update users with default arena gold value
    const result = await User.updateMany(
      {
        $or: [
          { arenaGold: { $exists: false } },
          { arenaGold: null },
          { arenaGold: undefined }
        ]
      },
      { $set: { arenaGold: 100 } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with arena gold`);

    // Verify the update
    const verifyUsers = await User.find({ arenaGold: { $exists: true } }).select('username arenaGold');
    console.log('🔍 Verification:');
    verifyUsers.forEach(user => {
      console.log(`  ${user.username}: ${user.arenaGold} arena gold`);
    });

    console.log('🎯 Arena Gold migration completed successfully!');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error during migration:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  migrateArenaGold();
}

module.exports = migrateArenaGold; 