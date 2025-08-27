/**
 * Map Name Utilities
 * 
 * Provides consistent naming strategies for map names across the application
 */

/**
 * Standardizes a map name according to our naming conventions
 * @param {string} inputName - Raw map name from PUD file or user input
 * @returns {string} - Standardized map name
 */
function standardizeMapName(inputName) {
  if (!inputName || typeof inputName !== 'string') {
    return 'UNNAMED MAP';
  }

  let standardized = inputName.trim();
  
  // Remove file extension if present
  standardized = standardized.replace(/\.pud$/i, '');
  
  // Replace underscores with spaces
  standardized = standardized.replace(/_/g, ' ');
  
  // Remove multiple spaces and replace with single space
  standardized = standardized.replace(/\s+/g, ' ');
  
  // Convert to uppercase
  standardized = standardized.toUpperCase();
  
  // Remove any non-alphanumeric characters except spaces and common punctuation
  standardized = standardized.replace(/[^A-Z0-9\s\-\(\)\[\]]/g, '');
  
  // Trim again to remove any leading/trailing spaces
  standardized = standardized.trim();
  
  return standardized || 'UNNAMED MAP';
}

/**
 * Checks if a map name already exists in the database
 * @param {string} mapName - Map name to check
 * @param {Object} MapModel - Mongoose Map model
 * @returns {Promise<boolean>} - True if map exists, false otherwise
 */
async function mapNameExists(mapName, MapModel) {
  const standardizedName = standardizeMapName(mapName);
  const existingMap = await MapModel.findOne({ 
    name: { $regex: new RegExp(`^${standardizedName}$`, 'i') }
  });
  return !!existingMap;
}

/**
 * Generates a unique filename for thumbnails based on map name
 * @param {string} mapName - Standardized map name
 * @param {string} suffix - Optional suffix (e.g., '_strategic', '_basic')
 * @returns {string} - Safe filename for thumbnails
 */
function generateThumbnailFilename(mapName, suffix = '') {
  const standardizedName = standardizeMapName(mapName);
  
  // Replace spaces with underscores for filename
  let filename = standardizedName.replace(/\s/g, '_');
  
  // Remove any remaining unsafe characters for filenames
  filename = filename.replace(/[^A-Z0-9_\-\(\)\[\]]/g, '');
  
  // Add suffix if provided
  if (suffix) {
    filename += suffix;
  }
  
  return filename + '.png';
}

/**
 * Extracts map name from various sources with fallback hierarchy
 * @param {Object} pudMetadata - Parsed PUD metadata
 * @param {string} originalFilename - Original uploaded filename
 * @returns {string} - Extracted and standardized map name
 */
function extractMapName(pudMetadata, originalFilename) {
  // Priority hierarchy for map name extraction:
  // 1. PUD metadata name
  // 2. PUD metadata description (first line)
  // 3. Original filename
  
  let mapName = null;
  
  // Try PUD metadata name first
  if (pudMetadata && pudMetadata.name && pudMetadata.name.trim()) {
    mapName = pudMetadata.name.trim();
  }
  
  // Fallback to first line of description
  if (!mapName && pudMetadata && pudMetadata.description) {
    const firstLine = pudMetadata.description.split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length < 50) { // Reasonable name length
      mapName = firstLine;
    }
  }
  
  // Final fallback to filename
  if (!mapName && originalFilename) {
    mapName = originalFilename.replace(/\.pud$/i, '');
  }
  
  return standardizeMapName(mapName || 'UNNAMED MAP');
}

module.exports = {
  standardizeMapName,
  mapNameExists,
  generateThumbnailFilename,
  extractMapName
}; 