const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect('mongodb://localhost:27017/newsite', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Authentication required' });
};

// Import the War3Map model from models directory
const War3Map = require('../models/War3Map');



/**
 * POST /api/war3maps/upload - Upload a new War3 map
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/war3');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.w3m', '.w3x'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .w3m and .w3x files are allowed.'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

router.post('/upload', ensureAuthenticated, upload.single('mapFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`📤 War3 map upload: ${req.file.originalname} by ${req.user.username}`);

    // Extract basic metadata from filename
    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const fileExtension = path.extname(originalName).toLowerCase();
    
    // Generate map name from filename (remove extension and replace underscores)
    const mapName = path.basename(originalName, fileExtension)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    // Create new map document
    const newMap = new War3Map({
      filename: filename,
      name: mapName,
      author: req.user.username,
      description: req.body.description || `Uploaded by ${req.user.username}`,
      players: req.body.players || 2,
      mapSize: req.body.mapSize || 'Unknown',
      tileset: req.body.tileset || 'Unknown',
      // Set default values for required fields
      goldmines: 0,
      neutralStructures: 0,
      creepUnits: 0,
      startingLocations: 2,
      dropTables: 0,
      inferredDropTables: 0,
      shopInventories: 0,
      hasThumbnail: false,
      accuracyScore: 0,
      parsingMethod: 'manual_upload',
      dataCompleteness: {
        hasJass: false,
        hasDoo: false,
        hasDropTables: false,
        hasInferredDropTables: false,
        hasShopInventories: false,
        hasStartingPositions: false
      },
      strategicData: {
        jassGoldmines: [],
        dooGoldmines: [],
        jassNeutralStructures: [],
        dooNeutralStructures: [],
        jassCreepUnits: [],
        dooCreepUnits: [],
        jassStartingPositions: [],
        dooStartingPositions: [],
        starting_positions: [],
        dropTables: [],
        inferredDropTables: [],
        shopInventories: [],
        hasJassData: false,
        hasDooData: false,
        parsingMethod: 'manual_upload'
      },
      uploadDate: new Date(),
      uploadedBy: req.user._id
    });

    await newMap.save();
    console.log(`✅ War3 map uploaded successfully: ${newMap.name} (ID: ${newMap._id})`);

    res.json({
      success: true,
      message: 'Map uploaded successfully',
      data: {
        id: newMap._id,
        name: newMap.name,
        filename: newMap.filename,
        author: newMap.author
      }
    });

  } catch (error) {
    console.error('❌ Error uploading War3 map:', error);
    
    // Clean up uploaded file if database save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload map',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/war3maps/:id/rate - Rate a War3 map
 */
router.post('/:id/rate', ensureAuthenticated, async (req, res) => {
  try {
    const { rating, comment = '' } = req.body;
    const userId = req.user._id; // Use actual authenticated user

    console.log(`⭐ User ${req.user.username} rating War3 map ${req.params.id}: ${rating}/5`);

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const map = await War3Map.findById(req.params.id);
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'War3 map not found'
      });
    }

    await map.addRating(userId, Number(rating), comment);
    console.log(`✅ Rating saved: ${map.averageRating.toFixed(1)}/5 (${map.ratingCount} reviews)`);

    const updatedMap = await War3Map.findById(req.params.id)
      .populate({
        path: 'ratings.userId',
        select: 'username displayName'
      });

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: updatedMap
    });
  } catch (error) {
    console.error('❌ Error rating War3 map:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating'
    });
  }
});

// Get all maps with filtering and pagination
router.get('/', async (req, res) => {
  try {
    console.log('🗺️ API Request: GET /war3maps');
    
    const {
      page = 1,
      limit = 12,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    console.log('📊 Query params:', { page, limit, search, sortBy, sortOrder });

    // Build search filter
    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const maps = await War3Map.find(searchFilter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalMaps = await War3Map.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalMaps / parseInt(limit));

    console.log(`✅ Found ${maps.length} War3 maps (${totalMaps} total)`);

    res.json({
      success: true,
      maps: maps,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalMaps,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Error getting War3 maps:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get War3 maps',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get random map
router.get('/random/map', async (req, res) => {
  try {
    console.log('🎲 API Request: GET /war3maps/random');
    
    const count = await War3Map.countDocuments();
    if (count === 0) {
      return res.status(404).json({
        success: false,
        message: 'No War3 maps found'
      });
    }
    
    const random = Math.floor(Math.random() * count);
    const map = await War3Map.findOne().skip(random).lean();
    
    console.log(`✅ Random War3 map selected: ${map.name}`);
    
    res.json({
      success: true,
      data: map
    });
  } catch (error) {
    console.error('❌ Error getting random War3 map:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get random War3 map',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get map statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 API Request: GET /war3maps/stats');
    
    // Get total map count
    const totalMaps = await War3Map.countDocuments();
    
    // Get recent uploads (maps added in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUploads = await War3Map.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    console.log(`📊 War3 Stats: ${totalMaps} total maps, ${recentUploads} recent uploads`);
    
    res.json({
      totalMaps,
      currentGameMaps: totalMaps,
      recentUploads,
      war3Maps: totalMaps
    });
  } catch (error) {
    console.error('❌ Error getting War3 map stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get War3 map statistics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Download a specific map
router.get('/:id/download', async (req, res) => {
  try {
    console.log(`📥 API Request: GET /war3maps/${req.params.id}/download`);
    
    const map = await War3Map.findById(req.params.id);
    
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'War3 map not found'
      });
    }

    // Construct file path - War3 maps are stored in uploads/war3/
    const path = require('path');
    const fs = require('fs').promises;
    
    let filePath;
    if (map.filename) {
      // Use filename from database
      filePath = path.join(__dirname, '../../uploads/war3', map.filename);
    } else {
      // Fallback to constructing from name
      const filename = `${map.name.replace(/[^a-zA-Z0-9\s\-_.]/g, '')}.w3x`;
      filePath = path.join(__dirname, '../../uploads/war3', filename);
    }
    
    console.log(`🔍 Looking for War3 map file at: ${filePath}`);
    
    try {
      await fs.access(filePath);
      console.log(`✅ War3 map file found at: ${filePath}`);
    } catch (error) {
      console.error(`❌ War3 map file not found at: ${filePath}`, error);
      
      // Try fuzzy matching with existing files
      try {
        const war3Dir = path.join(__dirname, '../../uploads/war3');
        const files = await fs.readdir(war3Dir);
        
        // Try multiple matching strategies
        let matchingFile = null;
        
        // Strategy 1: Exact filename match (case-insensitive)
        if (map.filename) {
          matchingFile = files.find(file => 
            file.toLowerCase() === map.filename.toLowerCase()
          );
        }
        
        // Strategy 2: Fuzzy match by map name
        if (!matchingFile) {
          const mapName = (map.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          matchingFile = files.find(file => {
            const fileName = file.toLowerCase().replace(/[^a-z0-9]/g, '');
            return fileName.includes(mapName) || mapName.includes(fileName.replace('w3x', ''));
          });
        }
        
        if (matchingFile) {
          const matchedPath = path.join(war3Dir, matchingFile);
          console.log(`🎯 Found fuzzy match: ${matchedPath}`);
          filePath = matchedPath;
        } else {
          console.error(`❌ No fuzzy match found for War3 map: ${map.name}`);
          return res.status(404).json({
            success: false,
            message: 'War3 map file not found on server',
            filename: map.filename
          });
        }
      } catch (fuzzyError) {
        console.error(`❌ Error during fuzzy matching:`, fuzzyError);
        return res.status(404).json({
          success: false,
          message: 'War3 map file not found on server',
          filename: map.filename
        });
      }
    }

    // Ensure filename has .w3x extension
    let downloadFilename = map.filename || map.name || path.basename(filePath);
    if (!downloadFilename.toLowerCase().endsWith('.w3x')) {
      downloadFilename += '.w3x';
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    res.sendFile(filePath);
    
    console.log(`📥 War3 map downloaded: ${map.name}`);
  } catch (error) {
    console.error('❌ Error downloading War3 map:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download War3 map'
    });
  }
});




// Get a specific map by ID (must be last to avoid catching other routes)
router.get('/:id', async (req, res) => {
  try {
    console.log(`🎯 API Request: GET /war3maps/${req.params.id}`);
    
    const map = await War3Map.findById(req.params.id).lean();
    
    if (!map) {
      return res.status(404).json({ 
        success: false,
        error: 'Map not found' 
      });
    }

    console.log(`✅ Found War3 map: ${map.name}`);
    
    res.json({
      success: true,
      data: map
    });
  } catch (error) {
    console.error('❌ Error getting War3 map:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get War3 map',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
module.exports.War3Map = War3Map; 