/**
 * Populate Dark Portal with Popular Warcraft Resources
 * This script adds popular Warcraft websites, communities, and resources to the Dark Portal
 */

const mongoose = require('mongoose');
const DarkPortalLink = require('../models/DarkPortalLink');
const User = require('../models/User');

// Popular Warcraft Resources
const warcraftResources = [
  // Reddit Communities
  {
    title: 'r/Warcraft',
    url: 'https://www.reddit.com/r/Warcraft/',
    description: 'Main Warcraft subreddit for all games in the series',
    category: 'reddit',
    gameType: 'wc12'
  },
  {
    title: 'r/Warcraft3',
    url: 'https://www.reddit.com/r/Warcraft3/',
    description: 'Dedicated community for Warcraft III players',
    category: 'reddit',
    gameType: 'wc3'
  },
  {
    title: 'r/WC3',
    url: 'https://www.reddit.com/r/WC3/',
    description: 'Warcraft III community with strategy and custom maps',
    category: 'reddit',
    gameType: 'wc3'
  },
  {
    title: 'r/Warcraft2',
    url: 'https://www.reddit.com/r/Warcraft2/',
    description: 'Classic Warcraft II community',
    category: 'reddit',
    gameType: 'wc12'
  },
  {
    title: 'r/WarcraftCustomGames',
    url: 'https://www.reddit.com/r/WarcraftCustomGames/',
    description: 'Custom games and maps for Warcraft III',
    category: 'reddit',
    gameType: 'wc3'
  },

  // Discord Servers
  {
    title: 'Warcraft III Community Discord',
    url: 'https://discord.gg/wc3',
    description: 'Official Warcraft III community Discord server',
    category: 'discord',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft II Discord',
    url: 'https://discord.gg/warcraft2',
    description: 'Warcraft II community and multiplayer',
    category: 'discord',
    gameType: 'wc12'
  },
  {
    title: 'Warcraft Custom Maps Discord',
    url: 'https://discord.gg/warcraftmaps',
    description: 'Custom maps and mods community',
    category: 'discord',
    gameType: 'wc3'
  },

  // Battle.net Groups
  {
    title: 'Warcraft III Veterans',
    url: 'https://battle.net/communities/',
    description: 'Battle.net community for Warcraft III veterans',
    category: 'battlenet',
    gameType: 'wc3'
  },
  {
    title: 'Classic Warcraft Players',
    url: 'https://battle.net/communities/',
    description: 'Battle.net group for Warcraft I & II players',
    category: 'battlenet',
    gameType: 'wc12'
  },

  // Maps and Mods Sites
  {
    title: 'Hive Workshop',
    url: 'https://www.hiveworkshop.com/',
    description: 'Premier Warcraft III modding and mapping community',
    category: 'maps-mods',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft 3 Maps',
    url: 'https://www.warcraft3maps.com/',
    description: 'Large collection of Warcraft III custom maps',
    category: 'maps-mods',
    gameType: 'wc3'
  },
  {
    title: 'EpicWar',
    url: 'https://www.epicwar.com/',
    description: 'Warcraft III maps and campaigns database',
    category: 'maps-mods',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft 3 Campaigns',
    url: 'https://www.warcraft3campaigns.com/',
    description: 'Custom campaigns for Warcraft III',
    category: 'maps-mods',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft II Maps',
    url: 'https://www.war2.ru/',
    description: 'Warcraft II maps and resources',
    category: 'maps-mods',
    gameType: 'wc12'
  },

  // Community Sites
  {
    title: 'Liquipedia Warcraft',
    url: 'https://liquipedia.net/warcraft/',
    description: 'Comprehensive Warcraft esports wiki and tournament coverage',
    category: 'community-sites',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft Wiki',
    url: 'https://warcraft.wiki.gg/',
    description: 'Official Warcraft wiki with lore and game information',
    category: 'community-sites',
    gameType: 'wc12'
  },
  {
    title: 'Warcraft III Strategy',
    url: 'https://www.warcraft3.info/',
    description: 'Strategy guides and build orders for Warcraft III',
    category: 'community-sites',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft II Strategy',
    url: 'https://www.war2.ru/strategy/',
    description: 'Strategy guides for Warcraft II',
    category: 'community-sites',
    gameType: 'wc12'
  },
  {
    title: 'Warcraft III Reforged',
    url: 'https://us.battle.net/shop/en/product/warcraft-iii-reforged',
    description: 'Official Warcraft III Reforged page',
    category: 'community-sites',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft Archive',
    url: 'https://us.battle.net/shop/en/product/warcraft-orcs-humans',
    description: 'Classic Warcraft games on Battle.net',
    category: 'community-sites',
    gameType: 'wc12'
  },
  {
    title: 'Warcraft III Champions',
    url: 'https://champions.battle.net/',
    description: 'Warcraft III esports and tournaments',
    category: 'community-sites',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft III Stats',
    url: 'https://www.warcraft3.info/stats/',
    description: 'Player statistics and rankings for Warcraft III',
    category: 'community-sites',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft II Multiplayer',
    url: 'https://www.war2.ru/multiplayer/',
    description: 'Warcraft II multiplayer community and guides',
    category: 'community-sites',
    gameType: 'wc12'
  },
  {
    title: 'Warcraft III Mods',
    url: 'https://www.moddb.com/games/warcraft-iii-reign-of-chaos/mods',
    description: 'Warcraft III modifications and total conversions',
    category: 'maps-mods',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft II Campaigns',
    url: 'https://www.war2.ru/campaigns/',
    description: 'Custom campaigns for Warcraft II',
    category: 'maps-mods',
    gameType: 'wc12'
  },
  {
    title: 'Warcraft III Tools',
    url: 'https://www.hiveworkshop.com/tools/',
    description: 'Modding tools for Warcraft III',
    category: 'maps-mods',
    gameType: 'wc3'
  },
  {
    title: 'Warcraft II Tools',
    url: 'https://www.war2.ru/tools/',
    description: 'Tools and utilities for Warcraft II',
    category: 'maps-mods',
    gameType: 'wc12'
  }
];

async function populateDarkPortal() {
  try {
    console.log('🌀 Starting Dark Portal population...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite');
    console.log('✅ Connected to MongoDB');
    
    // Get or create system user for Dark Portal submissions
    let systemUser = await User.findOne({ username: 'DarkPortalSystem' });
    if (!systemUser) {
      systemUser = await User.create({
        username: 'DarkPortalSystem',
        email: 'darkportal@system.local',
        displayName: 'Dark Portal System',
        avatar: '/assets/img/ranks/b3.png',
                 role: 'admin',
        isActive: true,
        emailVerified: true
      });
      console.log('✅ Created Dark Portal system user');
    } else {
      console.log('✅ Found existing Dark Portal system user');
    }
    
    // Clear existing links (optional - comment out if you want to keep existing)
    // await DarkPortalLink.deleteMany({});
    // console.log('🗑️ Cleared existing links');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const resource of warcraftResources) {
      try {
        // Check if link already exists
        const existingLink = await DarkPortalLink.findOne({ url: resource.url });
        
        if (existingLink) {
          console.log(`⏭️ Skipped existing link: ${resource.title}`);
          skippedCount++;
          continue;
        }
        
        // Create new link
        const newLink = new DarkPortalLink({
          title: resource.title,
          url: resource.url,
          description: resource.description,
          category: resource.category,
          gameType: resource.gameType,
          status: 'approved', // Auto-approve these popular resources
          submittedBy: systemUser._id, // System submission
          reviewedBy: systemUser._id, // Auto-approved by system
          reviewedAt: new Date(),
          clicks: 0
        });
        
        await newLink.save();
        console.log(`✅ Added: ${resource.title} (${resource.category})`);
        addedCount++;
        
      } catch (error) {
        console.error(`❌ Error adding ${resource.title}:`, error.message);
      }
    }
    
    console.log('\n🎉 Dark Portal population complete!');
    console.log(`✅ Added: ${addedCount} new resources`);
    console.log(`⏭️ Skipped: ${skippedCount} existing resources`);
    console.log(`📊 Total: ${addedCount + skippedCount} resources processed`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error populating Dark Portal:', error);
    process.exit(1);
  }
}

// Run the population script
if (require.main === module) {
  populateDarkPortal();
}

module.exports = { populateDarkPortal, warcraftResources };
