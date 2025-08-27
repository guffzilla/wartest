const mongoose = require('mongoose');
require('dotenv').config();
const Player = require('../models/Player');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// New rank system - Bronze/Gold/Amber/Sapphire/Champion
const RANKS = [
  { name: 'Bronze 3', image: '/assets/img/ranks/b3.png', threshold: 0 },
  { name: 'Bronze 2', image: '/assets/img/ranks/b2.png', threshold: 300 },
  { name: 'Bronze 1', image: '/assets/img/ranks/b1.png', threshold: 600 },
  { name: 'Gold 3', image: '/assets/img/ranks/g3.png', threshold: 900 },
  { name: 'Gold 2', image: '/assets/img/ranks/g2.png', threshold: 1200 },
  { name: 'Gold 1', image: '/assets/img/ranks/g1.png', threshold: 1500 },
  { name: 'Amber 3', image: '/assets/img/ranks/a3.png', threshold: 1800 },
  { name: 'Amber 2', image: '/assets/img/ranks/a2.png', threshold: 2100 },
  { name: 'Amber 1', image: '/assets/img/ranks/a1.png', threshold: 2400 },
  { name: 'Sapphire 3', image: '/assets/img/ranks/s3.png', threshold: 2700 },
  { name: 'Sapphire 2', image: '/assets/img/ranks/s2.png', threshold: 3000 },
  { name: 'Sapphire 1', image: '/assets/img/ranks/s1.png', threshold: 3300 },
  { name: 'Champion', image: '/assets/img/ranks/champion.png', threshold: 3600 }
];

function getRankByMmr(mmr) {
  // Find the highest rank the player qualifies for
  let playerRank = RANKS[0]; // Default to lowest rank

  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (mmr >= RANKS[i].threshold) {
      playerRank = RANKS[i];
      break;
    }
  }

  return playerRank;
}

async function migratePlayerRanks() {
  try {
    console.log('🔄 Starting rank migration...');
    
    // Get all players
    const players = await Player.find({});
    console.log(`📊 Found ${players.length} players to migrate`);
    
    let migrated = 0;
    let unchanged = 0;
    
    for (const player of players) {
      const currentMMR = player.mmr || 1500;
      const newRank = getRankByMmr(currentMMR);
      
      // Check if rank needs updating
      const currentRankName = player.rank?.name;
      if (currentRankName !== newRank.name) {
        console.log(`👤 ${player.name}: ${currentRankName || 'No rank'} (${currentMMR} MMR) → ${newRank.name}`);
        
        // Update player rank
        player.rank = {
          name: newRank.name,
          image: newRank.image,
          threshold: newRank.threshold
        };
        
        // Update highest rank if necessary
        const currentHighestRank = getRankByMmr(player.stats?.highestMmr || currentMMR);
        if (!player.stats.highestRank || player.stats.highestRank.includes('Platinum') || player.stats.highestRank.includes('Silver')) {
          player.stats.highestRank = currentHighestRank.name;
        }
        
        await player.save();
        migrated++;
      } else {
        unchanged++;
      }
    }
    
    console.log(`✅ Migration completed!`);
    console.log(`📈 ${migrated} players migrated`);
    console.log(`📋 ${unchanged} players unchanged`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePlayerRanks(); 