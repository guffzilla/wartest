const mongoose = require('mongoose');
const Player = require('../models/Player');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function initializeMatchTypeMmr() {
  console.log('🔄 Initializing match-type-specific MMR for existing players...');
  
  try {
    // Find all players
    const players = await Player.find({});
    console.log(`Found ${players.length} players`);
    
    let updatedCount = 0;
    
    for (const player of players) {
      let needsUpdate = false;
      
      // Check each match type and add MMR field if missing
      const matchTypes = ['1v1', '2v2', '3v3', '4v4', 'ffa'];
      
      for (const matchType of matchTypes) {
        if (!player.stats.matchTypes[matchType]) {
          // Initialize entire match type if missing
          player.stats.matchTypes[matchType] = {
            matches: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            mmr: player.mmr || 1500
          };
          needsUpdate = true;
        } else if (player.stats.matchTypes[matchType].mmr === undefined) {
          // Add MMR field if missing, set to current overall MMR
          player.stats.matchTypes[matchType].mmr = player.mmr || 1500;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await player.save();
        updatedCount++;
        console.log(`✅ Updated ${player.name} - set match-type MMR to ${player.mmr || 1500}`);
      }
    }
    
    console.log(`🏁 Completed! Updated ${updatedCount} players`);
    
  } catch (error) {
    console.error('❌ Error initializing match-type MMR:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the script
initializeMatchTypeMmr(); 