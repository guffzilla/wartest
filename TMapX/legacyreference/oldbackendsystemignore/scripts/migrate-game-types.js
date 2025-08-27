const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Channel = require('../models/Channel');
const Campaign = require('../models/Campaign');
const Clan = require('../models/Clan');
const DarkPortalLink = require('../models/DarkPortalLink');
const Stream = require('../models/Stream');
const Tournament = require('../models/Tournament');
const War2Map = require('../models/War2Map');
const ForumTopic = require('../models/ForumTopic');
const ChatMessage = require('../models/ChatMessage');
const GameUnit = require('../models/GameUnit');

// Game type mapping from old to new
const gameTypeMapping = {
  // Old naming conventions to new standardized naming
  'warcraft1': 'wc1',
  'war1': 'wc1',
  'warcraft2': 'wc2', 
  'war2': 'wc2',
  'warcraft3': 'wc3',
  'war3': 'wc3',
  'warcraft12': 'wc12'
};

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('🔗 Connected to MongoDB');
  
  try {
    console.log('🚀 Starting game type migration...');
    
    // Track migration statistics
    const stats = {
      players: { updated: 0, total: 0 },
      matches: { updated: 0, total: 0 },
      channels: { updated: 0, total: 0 },
      campaigns: { updated: 0, total: 0 },
      clans: { updated: 0, total: 0 },
      darkPortalLinks: { updated: 0, total: 0 },
      streams: { updated: 0, total: 0 },
      tournaments: { updated: 0, total: 0 },
      war2Maps: { updated: 0, total: 0 },
      forumTopics: { updated: 0, total: 0 },
      chatMessages: { updated: 0, total: 0 },
      gameUnits: { updated: 0, total: 0 }
    };

    // 1. Update Players collection
    console.log('\n📊 Migrating Players collection...');
    const players = await Player.find({});
    stats.players.total = players.length;
    
    for (const player of players) {
      if (gameTypeMapping[player.gameType]) {
        const oldGameType = player.gameType;
        player.gameType = gameTypeMapping[player.gameType];
        await player.save();
        stats.players.updated++;
        console.log(`  ✅ Updated player ${player.name}: ${oldGameType} → ${player.gameType}`);
      }
    }

    // 2. Update Matches collection
    console.log('\n📊 Migrating Matches collection...');
    const matches = await Match.find({});
    stats.matches.total = matches.length;
    
    for (const match of matches) {
      if (gameTypeMapping[match.gameType]) {
        const oldGameType = match.gameType;
        match.gameType = gameTypeMapping[match.gameType];
        await match.save();
        stats.matches.updated++;
        console.log(`  ✅ Updated match ${match._id}: ${oldGameType} → ${match.gameType}`);
      }
    }

    // 3. Update Channels collection (games array)
    console.log('\n📊 Migrating Channels collection...');
    const channels = await Channel.find({});
    stats.channels.total = channels.length;
    
    for (const channel of channels) {
      let updated = false;
      if (channel.games && channel.games.length > 0) {
        for (let i = 0; i < channel.games.length; i++) {
          if (gameTypeMapping[channel.games[i]]) {
            const oldGameType = channel.games[i];
            channel.games[i] = gameTypeMapping[channel.games[i]];
            updated = true;
            console.log(`  ✅ Updated channel ${channel.name} game: ${oldGameType} → ${channel.games[i]}`);
          }
        }
        if (updated) {
          await channel.save();
          stats.channels.updated++;
        }
      }
    }

    // 4. Update Campaigns collection
    console.log('\n📊 Migrating Campaigns collection...');
    const campaigns = await Campaign.find({});
    stats.campaigns.total = campaigns.length;
    
    for (const campaign of campaigns) {
      if (gameTypeMapping[campaign.game]) {
        const oldGameType = campaign.game;
        campaign.game = gameTypeMapping[campaign.game];
        await campaign.save();
        stats.campaigns.updated++;
        console.log(`  ✅ Updated campaign ${campaign.missionName}: ${oldGameType} → ${campaign.game}`);
      }
    }

    // 5. Update Clans collection
    console.log('\n📊 Migrating Clans collection...');
    const clans = await Clan.find({});
    stats.clans.total = clans.length;
    
    for (const clan of clans) {
      if (gameTypeMapping[clan.gameType]) {
        const oldGameType = clan.gameType;
        clan.gameType = gameTypeMapping[clan.gameType];
        await clan.save();
        stats.clans.updated++;
        console.log(`  ✅ Updated clan ${clan.name}: ${oldGameType} → ${clan.gameType}`);
      }
    }

    // 6. Update DarkPortalLinks collection
    console.log('\n📊 Migrating DarkPortalLinks collection...');
    const darkPortalLinks = await DarkPortalLink.find({});
    stats.darkPortalLinks.total = darkPortalLinks.length;
    
    for (const link of darkPortalLinks) {
      if (gameTypeMapping[link.gameType]) {
        const oldGameType = link.gameType;
        link.gameType = gameTypeMapping[link.gameType];
        await link.save();
        stats.darkPortalLinks.updated++;
        console.log(`  ✅ Updated Dark Portal link ${link.title}: ${oldGameType} → ${link.gameType}`);
      }
    }

    // 7. Update Streams collection
    console.log('\n📊 Migrating Streams collection...');
    const streams = await Stream.find({});
    stats.streams.total = streams.length;
    
    for (const stream of streams) {
      if (gameTypeMapping[stream.game]) {
        const oldGameType = stream.game;
        stream.game = gameTypeMapping[stream.game];
        await stream.save();
        stats.streams.updated++;
        console.log(`  ✅ Updated stream ${stream.title}: ${oldGameType} → ${stream.game}`);
      }
    }

    // 8. Update Tournaments collection
    console.log('\n📊 Migrating Tournaments collection...');
    const tournaments = await Tournament.find({});
    stats.tournaments.total = tournaments.length;
    
    for (const tournament of tournaments) {
      if (gameTypeMapping[tournament.gameType]) {
        const oldGameType = tournament.gameType;
        tournament.gameType = gameTypeMapping[tournament.gameType];
        await tournament.save();
        stats.tournaments.updated++;
        console.log(`  ✅ Updated tournament ${tournament.name}: ${oldGameType} → ${tournament.gameType}`);
      }
    }

    // 9. Update War2Maps collection
    console.log('\n📊 Migrating War2Maps collection...');
    const war2Maps = await War2Map.find({});
    stats.war2Maps.total = war2Maps.length;
    
    for (const map of war2Maps) {
      if (gameTypeMapping[map.gameType]) {
        const oldGameType = map.gameType;
        map.gameType = gameTypeMapping[map.gameType];
        await map.save();
        stats.war2Maps.updated++;
        console.log(`  ✅ Updated map ${map.name}: ${oldGameType} → ${map.gameType}`);
      }
    }

    // 10. Update ForumTopics collection
    console.log('\n📊 Migrating ForumTopics collection...');
    const forumTopics = await ForumTopic.find({});
    stats.forumTopics.total = forumTopics.length;
    
    for (const topic of forumTopics) {
      if (gameTypeMapping[topic.gameType]) {
        const oldGameType = topic.gameType;
        topic.gameType = gameTypeMapping[topic.gameType];
        await topic.save();
        stats.forumTopics.updated++;
        console.log(`  ✅ Updated forum topic ${topic.title}: ${oldGameType} → ${topic.gameType}`);
      }
    }

    // 11. Update ChatMessages collection
    console.log('\n📊 Migrating ChatMessages collection...');
    const chatMessages = await ChatMessage.find({ gameType: { $ne: null } });
    stats.chatMessages.total = chatMessages.length;
    
    for (const message of chatMessages) {
      if (gameTypeMapping[message.gameType]) {
        const oldGameType = message.gameType;
        message.gameType = gameTypeMapping[message.gameType];
        await message.save();
        stats.chatMessages.updated++;
        console.log(`  ✅ Updated chat message ${message._id}: ${oldGameType} → ${message.gameType}`);
      }
    }

    // 12. Update GameUnits collection
    console.log('\n📊 Migrating GameUnits collection...');
    const gameUnits = await GameUnit.find({});
    stats.gameUnits.total = gameUnits.length;
    
    for (const unit of gameUnits) {
      if (gameTypeMapping[unit.game]) {
        const oldGameType = unit.game;
        unit.game = gameTypeMapping[unit.game];
        await unit.save();
        stats.gameUnits.updated++;
        console.log(`  ✅ Updated game unit ${unit.name}: ${oldGameType} → ${unit.game}`);
      }
    }

    // Print migration summary
    console.log('\n🎉 Migration completed!');
    console.log('\n📈 Migration Statistics:');
    console.log('=======================');
    
    Object.entries(stats).forEach(([collection, data]) => {
      console.log(`${collection.padEnd(20)}: ${data.updated}/${data.total} records updated`);
    });

    // Calculate totals
    const totalRecords = Object.values(stats).reduce((sum, data) => sum + data.total, 0);
    const totalUpdated = Object.values(stats).reduce((sum, data) => sum + data.updated, 0);
    
    console.log('\n📊 Overall Summary:');
    console.log(`Total records processed: ${totalRecords}`);
    console.log(`Total records updated: ${totalUpdated}`);
    console.log(`Records unchanged: ${totalRecords - totalUpdated}`);

    if (totalUpdated > 0) {
      console.log('\n✅ Migration successful! All game type references have been updated to use the new standardized naming convention (wc1, wc2, wc3).');
    } else {
      console.log('\nℹ️ No records needed updating. All game types are already using the new standardized naming convention.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}).catch(error => {
  console.error('❌ Failed to connect to MongoDB:', error);
  process.exit(1);
});
