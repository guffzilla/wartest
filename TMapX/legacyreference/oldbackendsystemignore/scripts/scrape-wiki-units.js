const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const GameUnit = require('../models/GameUnit');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';

// Wiki URLs for different games
const WIKI_URLS = {
  wc3: {
    neutral: 'https://wowpedia.fandom.com/wiki/Neutral_units_(Warcraft_III)',
    human: 'https://wowpedia.fandom.com/wiki/Human_units_(Warcraft_III)',
    orc: 'https://wowpedia.fandom.com/wiki/Orc_units_(Warcraft_III)',
    undead: 'https://wowpedia.fandom.com/wiki/Undead_units_(Warcraft_III)',
    nightelf: 'https://wowpedia.fandom.com/wiki/Night_Elf_units_(Warcraft_III)'
  }
};

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function scrapeWikiPage(url) {
  try {
    console.log(`🌐 Fetching: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    return $;
  } catch (error) {
    console.error(`❌ Error fetching ${url}:`, error.message);
    return null;
  }
}

function parseUnitStats($, unitElement) {
  const stats = {};
  
  // Look for stats in tables or lists
  const statText = unitElement.text();
  
  // Parse HP
  const hpMatch = statText.match(/HP[:\s]*(\d+)/i);
  if (hpMatch) stats.hp = parseInt(hpMatch[1]);
  
  // Parse Attack
  const attackMatch = statText.match(/Attack[:\s]*(\d+)-(\d+)/i);
  if (attackMatch) stats.attack = `${attackMatch[1]}-${attackMatch[2]}`;
  
  // Parse Armor
  const armorMatch = statText.match(/Armor[:\s]*(\d+)/i);
  if (armorMatch) stats.armor = parseInt(armorMatch[1]);
  
  // Parse Mana
  const manaMatch = statText.match(/Mana[:\s]*(\d+)/i);
  if (manaMatch) stats.mana = parseInt(manaMatch[1]);
  
  return stats;
}

function parseUnitCosts($, unitElement) {
  const costs = {};
  
  const costText = unitElement.text();
  
  // Parse Gold
  const goldMatch = costText.match(/Gold[:\s]*(\d+)/i);
  if (goldMatch) costs.gold = parseInt(goldMatch[1]);
  
  // Parse Wood
  const woodMatch = costText.match(/Wood[:\s]*(\d+)/i);
  if (woodMatch) costs.wood = parseInt(woodMatch[1]);
  
  // Parse Food
  const foodMatch = costText.match(/Food[:\s]*(\d+)/i);
  if (foodMatch) costs.food = parseInt(foodMatch[1]);
  
  return costs;
}

async function scrapeNeutralUnits() {
  console.log('🔍 Scraping neutral units...');
  
  const $ = await scrapeWikiPage(WIKI_URLS.wc3.neutral);
  if (!$) return [];
  
  const units = [];
  
  // Look for unit tables or lists
  $('table.wikitable, .infobox').each((i, element) => {
    const $element = $(element);
    
    // Try to find unit names and descriptions
    $element.find('tr').each((j, row) => {
      const $row = $(row);
      const $cells = $row.find('td, th');
      
      if ($cells.length >= 2) {
        const name = $cells.eq(0).text().trim();
        const description = $cells.eq(1).text().trim();
        
        if (name && description && name.length > 2) {
          const stats = parseUnitStats($, $row);
          const costs = parseUnitCosts($, $row);
          
          units.push({
            name,
            description,
            stats,
            costs,
            game: 'wc3',
            race: 'neutral',
            type: 'unit',
            source: 'wowpedia'
          });
        }
      }
    });
  });
  
  // Also look for lists
  $('ul li, ol li').each((i, element) => {
    const $element = $(element);
    const text = $element.text().trim();
    
    // Look for unit patterns
    const unitMatch = text.match(/^([A-Z][a-zA-Z\s]+):\s*(.+)/);
    if (unitMatch) {
      const name = unitMatch[1].trim();
      const description = unitMatch[2].trim();
      
      if (name.length > 2 && description.length > 10) {
        const stats = parseUnitStats($, $element);
        const costs = parseUnitCosts($, $element);
        
        units.push({
          name,
          description,
          stats,
          costs,
          game: 'wc3',
          race: 'neutral',
          type: 'unit',
          source: 'wowpedia'
        });
      }
    }
  });
  
  console.log(`📊 Found ${units.length} neutral units from wiki`);
  return units;
}

async function scrapeRaceUnits(game, race) {
  console.log(`🔍 Scraping ${race} units for ${game}...`);
  
  const url = WIKI_URLS[game][race];
  if (!url) {
    console.log(`⚠️ No URL found for ${game} ${race}`);
    return [];
  }
  
  const $ = await scrapeWikiPage(url);
  if (!$) return [];
  
  const units = [];
  
  // Similar parsing logic as neutral units
  $('table.wikitable, .infobox').each((i, element) => {
    const $element = $(element);
    
    $element.find('tr').each((j, row) => {
      const $row = $(row);
      const $cells = $row.find('td, th');
      
      if ($cells.length >= 2) {
        const name = $cells.eq(0).text().trim();
        const description = $cells.eq(1).text().trim();
        
        if (name && description && name.length > 2) {
          const stats = parseUnitStats($, $row);
          const costs = parseUnitCosts($, $row);
          
          units.push({
            name,
            description,
            stats,
            costs,
            game,
            race,
            type: 'unit',
            source: 'wowpedia'
          });
        }
      }
    });
  });
  
  console.log(`📊 Found ${units.length} ${race} units from wiki`);
  return units;
}

async function insertUnits(units) {
  if (units.length === 0) {
    console.log('⚠️ No units to insert');
    return;
  }
  
  try {
    // Clear existing units for this game/race combination
    const firstUnit = units[0];
    await GameUnit.deleteMany({ 
      game: firstUnit.game, 
      race: firstUnit.race,
      type: 'unit'
    });
    
    const result = await GameUnit.insertMany(units);
    console.log(`✅ Successfully inserted ${result.length} units`);
  } catch (error) {
    console.error('❌ Error inserting units:', error);
  }
}

async function main() {
  console.log('🚀 Starting wiki scraping...');
  
  await connectToDatabase();
  
  // Scrape neutral units
  const neutralUnits = await scrapeNeutralUnits();
  if (neutralUnits.length > 0) {
    await insertUnits(neutralUnits);
  }
  
  // Scrape race units (optional - uncomment if needed)
  /*
  const races = ['human', 'orc', 'undead', 'nightelf'];
  for (const race of races) {
    const raceUnits = await scrapeRaceUnits('wc3', race);
    if (raceUnits.length > 0) {
      await insertUnits(raceUnits);
    }
  }
  */
  
  console.log('✅ Wiki scraping completed!');
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { scrapeWikiPage, parseUnitStats, parseUnitCosts }; 