const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');

const CAMPAIGNS = [
  // Warcraft 1 - Human Campaign
  {
    game: 'wc1',
    expansion: 'base',
    campaignName: 'Human Campaign',
    race: 'human',
    missionNumber: 1,
    missionName: 'Elwynn Forest',
    description: 'Build a barracks and train 6 footmen',
    points: 50,
    experience: 100,
    arenaGold: 50,
    isBonus: false,
    displayOrder: 1
  },
  {
    game: 'wc1',
    expansion: 'base',
    campaignName: 'Human Campaign',
    race: 'human',
    missionNumber: 2,
    missionName: 'Westfall',
    description: 'Defend your town from orc raiders',
    points: 50,
    experience: 100,
    arenaGold: 50,
    isBonus: false,
    displayOrder: 2
  },
  {
    game: 'wc1',
    expansion: 'base',
    campaignName: 'Human Campaign',
    race: 'human',
    missionNumber: 3,
    missionName: 'Deadmines',
    description: 'Clear the deadmines of orc occupation',
    points: 75,
    experience: 150,
    arenaGold: 75,
    isBonus: false,
    displayOrder: 3
  },

  // Warcraft 1 - Orc Campaign
  {
    game: 'wc1',
    expansion: 'base',
    campaignName: 'Orc Campaign',
    race: 'orc',
    missionNumber: 1,
    missionName: 'Swamps of Sorrow',
    description: 'Establish an orc base in the swamplands',
    points: 50,
    experience: 100,
    arenaGold: 50,
    isBonus: false,
    displayOrder: 1
  },
  {
    game: 'wc1',
    expansion: 'base',
    campaignName: 'Orc Campaign',
    race: 'orc',
    missionNumber: 2,
    missionName: 'Black Morass',
    description: 'Raid human settlements for resources',
    points: 50,
    experience: 100,
    arenaGold: 50,
    isBonus: false,
    displayOrder: 2
  },

  // Warcraft 2 - Human Campaign  
  {
    game: 'wc2',
    expansion: 'base',
    campaignName: 'Alliance Campaign',
    race: 'human',
    missionNumber: 1,
    missionName: 'Hillsbrad',
    description: 'Rescue the peasants from orc raiders',
    points: 50,
    experience: 100,
    arenaGold: 50,
    isBonus: false,
    displayOrder: 1
  },
  {
    game: 'wc2',
    expansion: 'base',
    campaignName: 'Alliance Campaign',
    race: 'human',
    missionNumber: 2,
    missionName: 'Ambush at Tarren Mill',
    description: 'Destroy the orc base at Tarren Mill',
    points: 75,
    experience: 150,
    arenaGold: 75,
    isBonus: false,
    displayOrder: 2
  },
  {
    game: 'wc2',
    expansion: 'base',
    campaignName: 'Alliance Campaign',
    race: 'human',
    missionNumber: 3,
    missionName: 'Southshore',
    description: 'Defend Southshore from orc naval attack',
    points: 100,
    experience: 200,
    arenaGold: 100,
    isBonus: false,
    displayOrder: 3
  },

  // Warcraft 2 - Orc Campaign
  {
    game: 'wc2',
    expansion: 'base',
    campaignName: 'Horde Campaign',
    race: 'orc',
    missionNumber: 1,
    missionName: 'Zul\'dare',
    description: 'Establish a foothold on the new continent',
    points: 50,
    experience: 100,
    arenaGold: 50,
    isBonus: false,
    displayOrder: 1
  },
  {
    game: 'wc2',
    expansion: 'base',
    campaignName: 'Horde Campaign',
    race: 'orc',
    missionNumber: 2,
    missionName: 'Raid at Hillsbrad',
    description: 'Raid the human settlements for resources',
    points: 75,
    experience: 150,
    arenaGold: 75,
    isBonus: false,
    displayOrder: 2
  },

  // Warcraft 2 Beyond the Dark Portal - Alliance
  {
    game: 'wc2',
    expansion: 'btdp',
    campaignName: 'Alliance Expedition',
    race: 'human',
    missionNumber: 1,
    missionName: 'Slayer of the Shadowmoon',
    description: 'Journey through the Dark Portal to Draenor',
    points: 100,
    experience: 200,
    arenaGold: 100,
    isBonus: false,
    displayOrder: 1
  },

  // Warcraft 3 - Human Campaign
  {
    game: 'wc3',
    expansion: 'roc',
    campaignName: 'Reign of Chaos',
    race: 'human',
    missionNumber: 1,
    missionName: 'The Defense of Strahnbrad',
    description: 'Defend Strahnbrad from orc raiders',
    points: 75,
    experience: 150,
    arenaGold: 75,
    isBonus: false,
    displayOrder: 1
  },
  {
    game: 'wc3',
    expansion: 'roc',
    campaignName: 'Reign of Chaos',
    race: 'human',
    missionNumber: 2,
    missionName: 'Blackrock & Roll',
    description: 'Destroy the Blackrock clan stronghold',
    points: 100,
    experience: 200,
    arenaGold: 100,
    isBonus: false,
    displayOrder: 2
  }
];

async function seedCampaigns() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite');
    console.log('📦 Connected to MongoDB');

    // Clear existing campaigns
    const deleted = await Campaign.deleteMany({});
    console.log(`🧹 Deleted ${deleted.deletedCount} existing campaigns`);

    // Insert new campaigns
    const created = await Campaign.insertMany(CAMPAIGNS);
    console.log(`✅ Created ${created.length} campaigns`);

    // Show campaign summary
    const summary = await Campaign.aggregate([
      {
        $group: {
          _id: { game: '$game', expansion: '$expansion', race: '$race' },
          count: { $sum: 1 },
          campaignName: { $first: '$campaignName' }
        }
      },
      {
        $sort: { '_id.game': 1, '_id.expansion': 1, '_id.race': 1 }
      }
    ]);

    console.log('\n📊 Campaign Summary:');
    summary.forEach(item => {
      console.log(`  ${item._id.game} (${item._id.expansion}) - ${item.campaignName}: ${item.count} missions`);
    });

    console.log('\n🎉 Campaign seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding campaigns:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  seedCampaigns();
}

module.exports = seedCampaigns; 