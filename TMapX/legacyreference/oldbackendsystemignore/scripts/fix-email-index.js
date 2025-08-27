/**
 * Fix Email Index Script
 * 
 * Fixes the MongoDB unique index issue with email field that's preventing
 * profile image updates from being saved properly.
 */
const mongoose = require('mongoose');
require('dotenv').config();
async function fixEmailIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite');
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));
    // Check if the problematic email index exists
    const emailIndex = indexes.find(idx => idx.key && idx.key.email === 1);
    if (emailIndex) {
      try {
        await usersCollection.dropIndex('email_1');
      } catch (error) {
      }
    }
    await usersCollection.createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        sparse: true, // This allows multiple null values
        name: 'email_sparse_unique'
      }
    );
    const nullEmailCount = await usersCollection.countDocuments({ email: null });
    if (nullEmailCount > 0) {
      const result = await usersCollection.updateMany(
        { email: null },
        { $unset: { email: "" } } // Remove the email field entirely for null values
      );
    }
    const finalIndexes = await usersCollection.indexes();
    console.log('Final indexes:', finalIndexes.map(idx => ({ name: idx.name, key: idx.key, sparse: idx.sparse, unique: idx.unique })));
  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
}
// Run the fix
if (require.main === module) {
  fixEmailIndex().then(() => {
    process.exit(0);
  }).catch(error => {
    process.exit(1);
  });
}
module.exports = fixEmailIndex;
