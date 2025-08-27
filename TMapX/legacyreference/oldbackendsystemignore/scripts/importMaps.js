/**
 * Script to import maps from the maps folder into the database
 * 
 * Usage: node importMaps.js
 */

const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const War2Map = require('../models/War2Map');
const PudThumbnailGenerator = require('../utils/pudThumbnailGenerator');

console.log('✅ Thumbnail auto-generation is enabled for map imports');

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Paths to maps and thumbnails
const MAPS_DIR = path.join(__dirname, '../../uploads/maps');
const THUMBNAILS_DIR = path.join(__dirname, '../../uploads/thumbnails');

// Function to get all .pud files from the maps directory
async function getMapFiles() {
  console.log('Reading maps from:', MAPS_DIR);
  
  try {
    // Ensure directories exist
    await fs.mkdir(MAPS_DIR, { recursive: true });
    await fs.mkdir(THUMBNAILS_DIR, { recursive: true });

    const files = await fs.readdir(MAPS_DIR);
    const pudFiles = files.filter(file => file.toLowerCase().endsWith('.pud'));
    console.log(`Found ${pudFiles.length} PUD files`);
    return pudFiles.map(file => path.join(MAPS_DIR, file));
  } catch (error) {
    console.error('Error reading maps directory:', error);
    return [];
  }
}

// Function to import a single map
async function importMap(pudPath) {
  try {
    const mapName = path.basename(pudPath, '.pud');
    console.log(`\nProcessing map: ${mapName}`);

    // Verify map file exists and is readable
    try {
      const stats = await fs.stat(pudPath);
      if (stats.size === 0) {
        console.error(`Map file ${mapName} is empty, skipping`);
        return;
      }
    } catch (err) {
      console.error(`Cannot access map file ${mapName}:`, err);
      return;
    }

    // Check if map already exists
    const existingMap = await War2Map.findOne({ name: mapName });
    if (existingMap) {
      console.log(`Map ${mapName} already exists in database, skipping`);
      return;
    }

    // Parse PUD file to get metadata
    const generator = new PudThumbnailGenerator();
    const metadata = await generator.parsePudFile(pudPath);
    if (!metadata) {
      console.error(`Failed to parse PUD file for ${mapName}`);
      return;
    }
    console.log('Parsed metadata:', JSON.stringify(metadata, null, 2));

    // Generate thumbnail automatically from PUD file
    let thumbnailPath = '/uploads/thumbnails/default-map.png'; // Default fallback
    try {
      const cleanMapName = mapName.replace(/[^a-zA-Z0-9\-_]/g, '_'); // Clean filename
      const thumbnailFilename = `${cleanMapName}_imported.png`;
      const outputPath = path.join(THUMBNAILS_DIR, thumbnailFilename);
      
      // Generate thumbnail using our PudThumbnailGenerator
      await generator.generateThumbnail(pudPath, outputPath);
      
      thumbnailPath = `/uploads/thumbnails/${thumbnailFilename}`;
      console.log(`✅ Generated thumbnail for ${mapName}: ${thumbnailFilename}`);
    } catch (thumbnailError) {
      console.warn(`⚠️  Failed to generate thumbnail for ${mapName}, using default:`, thumbnailError.message);
      // thumbnailPath remains as default
    }

    // Create map document
    const map = new War2Map({
      name: mapName,
      originalName: mapName,
      description: metadata.description || 'No description available',
      filePath: `/uploads/maps/${mapName}.pud`,
      thumbnailPath: thumbnailPath,
      size: metadata.size || 'other',
      dimensions: metadata.dimensions || { width: 64, height: 64 },
      tileset: typeof metadata.tileset === 'number' ? generator.getTilesetName(metadata.tileset) : (metadata.tileset || 'forest'),
      playerCount: metadata.playerCount || { min: 2, max: 8 },
      version: metadata.version || '1.0',
      type: metadata.type || 'melee',
      gameType: 'wc2', // Set gameType for WC2 maps
      isWaterMap: metadata.isWaterMap || false,
      hasWaterTiles: metadata.hasWaterTiles || false,
      hasOilPatch: metadata.hasOilPatch || false,
      creator: metadata.creator || 'Unknown',
      uploadedBy: process.env.ADMIN_USER_ID || '000000000000000000000000'
    });

    // Save to database
    try {
      const savedMap = await map.save();
      console.log(`✅ Successfully imported map: ${mapName} with ID: ${savedMap._id}`);
      return savedMap;
    } catch (saveError) {
      console.error(`Error saving map ${mapName} to database:`, saveError);
      throw saveError;
    }
  } catch (error) {
    console.error(`Error importing map ${pudPath}:`, error);
    throw error;
  }
}

// Main import function
async function importAllMaps() {
  try {
    console.log('🚀 Starting map import process...');
    
    const mapFiles = await getMapFiles();
    
    if (mapFiles.length === 0) {
      console.log('No .pud files found to import');
      return;
    }
    
    console.log(`Found ${mapFiles.length} maps to import`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const mapFile of mapFiles) {
      try {
        console.log(`\n--- Processing: ${path.basename(mapFile)} ---`);
        const result = await importMap(mapFile);
        
        if (result) {
          imported++;
          console.log(`✅ Import successful`);
        } else {
          skipped++;
          console.log(`⏭️  Import skipped`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Import failed:`, error.message);
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`Total files: ${mapFiles.length}`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Fatal error during import process:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔚 Import process completed');
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  importAllMaps();
}

module.exports = { importAllMaps, importMap, getMapFiles };

