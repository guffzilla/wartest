const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const War2Map = require('../models/War2Map');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');
const { standardizeMapName, mapNameExists, generateThumbnailFilename, extractMapName } = require('../utils/mapNameUtils');
const PudThumbnailGenerator = require('../utils/pudThumbnailGenerator');

// Create wrapper function for thumbnail generation
const generatePUDThumbnail = async (inputPath, outputPath) => {
  const generator = new PudThumbnailGenerator();
  return await generator.generateThumbnail(inputPath, outputPath, true);
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, '../../uploads/maps/');
    fs.mkdir(dest, { recursive: true }).then(() => cb(null, dest));
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/octet-stream' || path.extname(file.originalname).toLowerCase() === '.pud') {
      cb(null, true);
    } else {
      cb(new Error('Only .pud files are allowed'), false);
    }
  }
});

/**
 * GET /api/war2maps - Get all War2 maps with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    console.log('🗺️ API Request: GET /war2maps');
    
    const {
      page = 1,
      limit = 12,
      search = '',
      tileset = '',
      size = '',
      type = '',
      waterType = '',
      sortBy = 'name',  // Default to alphabetical sort
      gameType = 'wc2'
    } = req.query;

    console.log('📊 Query params:', { page, limit, search, tileset, size, type, waterType, sortBy, gameType });

    // Build search options - if there's a search query, default to relevance sorting
    const effectiveSortBy = search ? 'relevance' : sortBy;
    const options = {
      gameType,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sortBy: effectiveSortBy
    };

    if (tileset && tileset !== 'all') options.tileset = tileset;
    if (size && size !== 'all') options.size = size;
    if (type && type !== 'all') options.type = type;
    if (waterType && waterType !== 'all') options.waterType = waterType;

    console.log('🔍 Search options:', options);

    // Search maps
    const maps = await War2Map.searchMaps(search, options);
    
    // Get total count for pagination using same search logic
    const totalMaps = await War2Map.searchMaps(search, {
      ...options,
      limit: 9999999, // Get all matches for count
      skip: 0
    }).then(results => results.length);
    const totalPages = Math.ceil(totalMaps / parseInt(limit));

    console.log(`✅ Found ${maps.length} War2 maps (${totalMaps} total)`);

    res.json({
      success: true,
      data: maps,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalMaps,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching War2 maps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch War2 maps',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Removed duplicate stats endpoint - using the one at line 508

/**
 * GET /api/war2maps/random - Get a random War2 map
 */
router.get('/random', async (req, res) => {
  try {
    console.log('🎲 API Request: GET /war2maps/random');
    
    const count = await War2Map.countDocuments();
    if (count === 0) {
      return res.status(404).json({
        success: false,
        message: 'No War2 maps found'
      });
    }
    
    const random = Math.floor(Math.random() * count);
    const map = await War2Map.findOne()
      .skip(random)
      .populate('uploadedBy', 'username displayName')
      .populate({
        path: 'ratings.userId',
        select: 'username displayName'
      });
    
    console.log(`✅ Random War2 map selected: ${map.name}`);
    
    res.json({
      success: true,
      data: map
    });
  } catch (error) {
    console.error('❌ Error getting random War2 map:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get random War2 map',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/war2maps/stats - Get War2 map statistics for hero stats display
 */
router.get('/stats', async (req, res) => {
  try {
    // Get total War2 map count
    const totalMaps = await War2Map.countDocuments();
    
    // Get recent uploads (maps uploaded in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUploads = await War2Map.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // For War2 maps, all maps are War2 maps
    const war2Maps = totalMaps;
    
    res.json({
      totalMaps,
      war2Maps,
      recentUploads,
      currentGameMaps: totalMaps // Same as totalMaps for War2
    });
  } catch (err) {
    console.error('Error getting War2 map stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



/**
 * GET /api/war2maps/:id - Get specific War2 map
 */
router.get('/:id', async (req, res) => {
  try {
    const map = await War2Map.findById(req.params.id)
      .populate('uploadedBy', 'username displayName')
      .populate({
        path: 'ratings.userId',
        select: 'username displayName'
      });

    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'War2 map not found'
      });
    }

    // Increment view count
    await map.incrementViewCount();

    res.json({
      success: true,
      data: map
    });
  } catch (error) {
    console.error('❌ Error fetching War2 map:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch War2 map'
    });
  }
});

/**
 * POST /api/war2maps/upload - Upload a new War2 map
 */
router.post('/upload', ensureAuthenticated, upload.single('mapFile'), async (req, res) => {
  try {
    console.log('📤 War2 Map upload initiated');
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No map file provided' });
    }

    const mapName = extractMapName(null, req.file.originalname);
    console.log('🏷️ Extracted War2 map name:', mapName);

    const existingMap = await mapNameExists(mapName, War2Map);
    if (existingMap) {
      await fs.unlink(req.file.path);
      return res.status(409).json({
        success: false,
        message: `A map with the name "${mapName}" already exists for War2.`,
        map: existingMap
      });
    }

    const standardizedName = standardizeMapName(mapName);
    const relativeFilePath = path.join('uploads', 'maps', req.file.filename).replace(/\\/g, '/');

    console.log('🖼️ Generating Warcraft 2 thumbnails and strategic data...');
    const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');
    await fs.mkdir(thumbnailDir, { recursive: true });
    const thumbnailFilename = generateThumbnailFilename(standardizedName, '.png');
    const thumbnailDiskPath = path.join(thumbnailDir, thumbnailFilename);
    const thumbnailWebPath = `/uploads/thumbnails/${thumbnailFilename}`;
    
    let thumbnailResult;
    try {
      thumbnailResult = await generatePUDThumbnail(req.file.path, thumbnailDiskPath);
      console.log('✅ War2 thumbnails and strategic data generated successfully.');
    } catch (thumbnailError) {
      console.warn('⚠️ Failed to generate strategic thumbnail for War2 map, using default:', thumbnailError.message);
      thumbnailResult = { success: false, mapData: {}, strategicData: {} };
    }

    const mapData = {
      name: standardizedName,
      displayName: mapName,
      originalName: req.file.originalname,
      author: req.user.username,
      uploadedBy: req.user._id,
      filePath: relativeFilePath,
      fileSize: req.file.size,
      thumbnailPath: thumbnailResult.success ? thumbnailWebPath : '/uploads/thumbnails/default-map.png',
      gameType: 'wc2',
      description: req.body.description || thumbnailResult.mapData?.description || '',
      size: thumbnailResult.mapData ? `${thumbnailResult.mapData.width}x${thumbnailResult.mapData.height}` : 'other',
      dimensions: thumbnailResult.mapData ? { width: thumbnailResult.mapData.width, height: thumbnailResult.mapData.height } : { width: 64, height: 64 },
      tileset: thumbnailResult.mapData?.tilesetName || 'forest',
      playerCount: thumbnailResult.strategicData?.playerCount || 2,
      strategicData: thumbnailResult.strategicData || {}
    };

    const newMap = new War2Map(mapData);
    await newMap.save();
    console.log(`💾 New Warcraft 2 map saved: ${newMap.name}`);

    req.user.uploadedMapsCount = (req.user.uploadedMapsCount || 0) + 1;
    await req.user.save();

    res.status(201).json({
      success: true,
      message: 'Warcraft 2 map uploaded successfully!',
      map: newMap
    });

  } catch (error) {
    console.error('❌ Error uploading War2 map:', error);
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('❌ Error cleaning up file:', cleanupError);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Failed to upload War2 map',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/war2maps/:id/download - Download a War2 map
 */
router.get('/:id/download', async (req, res) => {
  try {
    const map = await War2Map.findById(req.params.id);
    
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'War2 map not found'
      });
    }

    // Construct proper file path - handle both new format and legacy data
    let filePath;
    
    // Check if path is truly absolute (Windows: starts with drive letter, Unix: starts with /)
    // But on Windows, paths starting with / are not truly absolute
    const isTrulyAbsolute = path.isAbsolute(map.filePath) && !map.filePath.startsWith('/');
    
    if (isTrulyAbsolute) {
      filePath = map.filePath;
    } else if (map.filePath.startsWith('/uploads/')) {
      // Path starts with /uploads/ - remove leading slash and make relative to project root
      // __dirname is backend/routes/, so we need to go up TWO levels to get to project root
      filePath = path.join(__dirname, '../..', map.filePath.substring(1));
    } else if (map.filePath.includes('uploads/')) {
      // Relative path from project root  
      filePath = path.join(__dirname, '../../', map.filePath);
    } else {
      // Legacy format: just filename stored, need to construct full path
      filePath = path.join(__dirname, '../../uploads/maps', map.filePath);
    }
    
    console.log(`🔍 Looking for map file at: ${filePath}`);
    console.log(`🔍 __dirname: ${__dirname}`);
    console.log(`🔍 map.filePath from DB: ${map.filePath}`);
    console.log(`🔍 isTrulyAbsolute: ${isTrulyAbsolute}`);
    console.log(`🔍 constructed filePath: ${filePath}`);
    
    try {
      await fs.access(filePath);
      console.log(`✅ Map file found at: ${filePath}`);
    } catch (error) {
      console.error(`❌ Map file not found at: ${filePath}`, error);
      
      // If first attempt fails, try alternative paths for legacy data
      if (!map.filePath.includes('uploads/')) {
        const mapsDir = path.join(__dirname, '../../uploads/maps');
        const triedPaths = [filePath];
        
        // Try with original name
        const originalNamePath = path.join(mapsDir, map.originalName || map.filePath);
        triedPaths.push(originalNamePath);
        console.log(`🔄 Trying original name path: ${originalNamePath}`);
        
        try {
          await fs.access(originalNamePath);
          filePath = originalNamePath;
          console.log(`✅ Map file found at original name path: ${filePath}`);
        } catch (altError) {
          // Try fuzzy matching with existing files
          try {
            const files = await fs.readdir(mapsDir);
            
            // Try multiple matching strategies
            let matchingFile = null;
            
            // Strategy 1: Exact filename match (case-insensitive)
            matchingFile = files.find(file => 
              file.toLowerCase() === (map.originalName || map.filePath || '').toLowerCase()
            );
            
            // Strategy 2: Check if stored path basename matches any file
            if (!matchingFile) {
              const storedBasename = path.basename(map.filePath || '');
              matchingFile = files.find(file => 
                file.toLowerCase() === storedBasename.toLowerCase()
              );
            }
            
            // Strategy 3: Fuzzy match by removing special characters
            if (!matchingFile) {
              const mapName = (map.name || map.filePath || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              matchingFile = files.find(file => {
                const fileName = file.toLowerCase().replace(/[^a-z0-9]/g, '');
                return fileName.includes(mapName) || mapName.includes(fileName.replace('pud', ''));
              });
            }
            
            if (matchingFile) {
              const matchedPath = path.join(mapsDir, matchingFile);
              triedPaths.push(matchedPath);
              console.log(`🎯 Found fuzzy match: ${matchedPath}`);
              filePath = matchedPath;
            } else {
              console.error(`❌ No fuzzy match found for map: ${map.name}`);
              return res.status(404).json({
                success: false,
                message: 'Map file not found on server',
                filePath: map.filePath,
                triedPaths: triedPaths
              });
            }
          } catch (fuzzyError) {
            console.error(`❌ Error during fuzzy matching:`, fuzzyError);
            return res.status(404).json({
              success: false,
              message: 'Map file not found on server',
              filePath: map.filePath,
              triedPaths: triedPaths
            });
          }
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'Map file not found on server',
          filePath: map.filePath
        });
      }
    }

    // Increment download count
    await map.incrementDownloadCount();

    // Ensure filename has .pud extension
    let downloadFilename = map.originalName || map.name || path.basename(filePath);
    if (!downloadFilename.toLowerCase().endsWith('.pud')) {
      downloadFilename += '.pud';
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    res.sendFile(filePath);
    
    console.log(`📥 War2 map downloaded: ${map.name}`);
  } catch (error) {
    console.error('❌ Error downloading War2 map:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download War2 map'
    });
  }
});

/**
 * DELETE /api/war2maps/:id - Delete a War2 map
 */
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🔍 DELETE War2Map route hit:', {
      mapId: req.params.id,
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role
    });
    
    const map = await War2Map.findById(req.params.id);
    
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'War2 map not found'
      });
    }

    // Debug: Log authorization details
    console.log('🔍 War2Map Delete authorization debug:', {
      mapId: req.params.id,
      mapName: map.name,
      mapUploadedBy: map.uploadedBy ? map.uploadedBy.toString() : 'null',
      currentUserId: req.user._id ? req.user._id.toString() : 'null',
      currentUserRole: req.user.role,
      isOwner: map.uploadedBy && req.user._id ? map.uploadedBy.toString() === req.user._id.toString() : false,
      isAdmin: req.user.role === 'admin'
    });

    // Check if user is the uploader or an admin
    if (map.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      console.log('❌ Authorization failed - user cannot delete this War2 map');
      return res.status(403).json({
        success: false,
        message: 'You can only delete maps you uploaded'
      });
    }

    // Delete associated files
    const filesToDelete = [
      map.filePath,
      map.thumbnailPath?.replace(/^\//, ''),
      map.strategicThumbnailPath?.replace(/^\//, '')
    ].filter(Boolean);

    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
      } catch (error) {
        console.warn(`⚠️ Could not delete file: ${filePath}`, error.message);
      }
    }

    // Delete map from database
    await War2Map.findByIdAndDelete(req.params.id);
    
    console.log(`✅ War2 map deleted: ${map.name}`);
    
    res.json({
      success: true,
      message: 'War2 map deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting War2 map:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete War2 map'
    });
  }
});

/**
 * POST /api/war2maps/:id/rate - Rate a War2 map
 */
router.post('/:id/rate', ensureAuthenticated, async (req, res) => {
  try {
    const { rating, comment = '' } = req.body;
    const userId = req.user._id; // Use actual authenticated user

    console.log(`⭐ User ${req.user.username} rating War2 map ${req.params.id}: ${rating}/5`);

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const map = await War2Map.findById(req.params.id);
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'War2 map not found'
      });
    }

    await map.addRating(userId, Number(rating), comment);
    console.log(`✅ Rating saved: ${map.averageRating.toFixed(1)}/5 (${map.ratingCount} reviews)`);

    const updatedMap = await War2Map.findById(req.params.id)
      .populate('uploadedBy', 'username displayName')
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
    console.error('❌ Error rating War2 map:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating'
    });
  }
});

module.exports = router; 