const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const SCREENSHOTS_DIR = path.join(UPLOAD_DIR, 'screenshots');
const EVIDENCE_DIR = path.join(UPLOAD_DIR, 'evidence');

// Create directories if they don't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Configure storage for screenshots
const screenshotStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, SCREENSHOTS_DIR);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, 'screenshot-' + uniqueSuffix + ext);
  }
});

// File filter for screenshots
const screenshotFilter = function (req, file, cb) {
  // Accept PNG and JPG/JPEG files
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpeg' ||
    file.originalname.toLowerCase().endsWith('.png') ||
    file.originalname.toLowerCase().endsWith('.jpg') ||
    file.originalname.toLowerCase().endsWith('.jpeg')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG and JPG/JPEG files are allowed for screenshots!'), false);
  }
};

// Create multer upload instance for screenshots
const uploadScreenshot = multer({
  storage: screenshotStorage,
  fileFilter: screenshotFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Configure storage for evidence
const evidenceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, EVIDENCE_DIR);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, 'evidence-' + uniqueSuffix + ext);
  }
});

// Create multer upload instance for evidence
const uploadEvidence = multer({
  storage: evidenceStorage,
  fileFilter: screenshotFilter, // Reuse the same filter as screenshots
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Get public URL for a screenshot
 *
 * @param {String} filename - Screenshot filename
 * @returns {String} - Public URL for the screenshot
 */
function getScreenshotUrl(filename) {
  return `/uploads/screenshots/${filename}`;
}

/**
 * Get public URL for evidence
 *
 * @param {String} filename - Evidence filename
 * @returns {String} - Public URL for the evidence
 */
function getEvidenceUrl(filename) {
  return `/uploads/evidence/${filename}`;
}

/**
 * Delete a screenshot file
 *
 * @param {String} filename - Screenshot filename
 * @returns {Promise} - Promise that resolves when the file is deleted
 */
function deleteScreenshot(filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(SCREENSHOTS_DIR, path.basename(filename));
    fs.unlink(filepath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Delete an evidence file
 *
 * @param {String} filename - Evidence filename
 * @returns {Promise} - Promise that resolves when the file is deleted
 */
function deleteEvidence(filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(EVIDENCE_DIR, path.basename(filename));
    fs.unlink(filepath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Validate screenshot metadata
 *
 * @param {String} filepath - Path to the screenshot file
 * @returns {Promise<Object>} - Promise that resolves with validation result
 */
function validateScreenshotMetadata(filepath) {
  return new Promise((resolve, reject) => {
    fs.stat(filepath, (err, stats) => {
      if (err) {
        return reject(new Error(`Failed to get file stats: ${err.message}`));
      }

      const now = new Date();
      const creationTime = stats.birthtime;
      const modifiedTime = stats.mtime;

      // Check if file is less than 2 days old
      // Use the most recent time between creation and modification
      const fileTime = creationTime > modifiedTime ? creationTime : modifiedTime;
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
      const isRecent = fileTime >= twoDaysAgo;

      // For Windows screenshots, the creation and modification times might differ
      // Allow a larger tolerance (5 minutes) for Windows screenshots
      const timeDifference = Math.abs(modifiedTime.getTime() - creationTime.getTime());
      const timesMatch = timeDifference < (5 * 60 * 1000); // 5 minute tolerance

      // If the file was created/modified within the last hour, consider it valid
      // This helps with screenshots that were just taken
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
      const isVeryRecent = fileTime >= oneHourAgo;

      // Consider the screenshot valid if it's very recent or if it meets our other criteria
      const isValid = isVeryRecent || (isRecent && timesMatch);

      resolve({
        isValid,
        isRecent,
        timesMatch,
        isVeryRecent,
        creationTime,
        modifiedTime,
        errors: []
          .concat(!isRecent ? ['Screenshot must be less than 2 days old'] : [])
          .concat(!timesMatch && !isVeryRecent ? ['Screenshot creation and modification times must match'] : [])
      });
    });
  });
}

module.exports = {
  uploadScreenshot,
  uploadEvidence,
  getScreenshotUrl,
  getEvidenceUrl,
  deleteScreenshot,
  deleteEvidence,
  validateScreenshotMetadata
};
