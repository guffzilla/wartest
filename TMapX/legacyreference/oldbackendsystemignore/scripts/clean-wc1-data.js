const mongoose = require('mongoose');
const Player = require('../models/Player');

mongoose.connect('mongodb://localhost:27017/newsite').then(async () => {
  console.log('Connected to MongoDB');
  
  // Remove fake test data
  const result = await Player.deleteMany({
    name: { $regex: /^(WC1_|DOS_|Retro_|WC2_|BNE_|Combat_|WC3_|Reforged_|Champion_)/ }
  });
  
  console.log(`Removed ${result.deletedCount} fake players`);
  
  // Count remaining WC1 players
  const count = await Player.countDocuments({ gameType: 'wc1' });
  console.log(`Remaining WC1 players: ${count}`);
  
  mongoose.connection.close();
}); 