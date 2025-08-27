#!/usr/bin/env node

/**
 * Rank Images Compression Script
 * Compresses all PNG rank images to 30% quality with PNG optimization
 * Replaces original files with compressed versions
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// Configuration
const CONFIG = {
  ranksDir: path.join(__dirname, '../../frontend/assets/img/ranks'),
  quality: 30, // 30% quality for moderate compression
  progressive: true, // Progressive encoding
  compressionLevel: 9, // Maximum PNG compression level
  dryRun: false, // Set to true for testing without overwriting files
  verbose: true, // Detailed logging
  batchSize: 5 // Process images in smaller batches for large PNGs
};

class RankImageCompressor {
  constructor() {
    this.processed = 0;
    this.failed = 0;
    this.totalSizeBefore = 0;
    this.totalSizeAfter = 0;
    this.startTime = Date.now();
    this.errors = [];
  }

  /**
   * Main compression function
   */
  async compressAllRankImages() {
    try {
      console.log('🏆 Starting rank images compression...');
      console.log(`📁 Target directory: ${CONFIG.ranksDir}`);
      console.log(`📉 Target quality: ${CONFIG.quality}%`);
      console.log(`🔧 Dry run mode: ${CONFIG.dryRun ? 'ENABLED' : 'DISABLED'}`);
      console.log('');

      // Get all PNG files
      const files = await this.getImageFiles();
      console.log(`📊 Found ${files.length} rank images to process`);
      
      if (files.length === 0) {
        console.log('❌ No PNG files found in ranks directory');
        return;
      }

      // Process in batches to manage memory
      await this.processBatches(files);
      
      // Display final results
      this.displayResults();

    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Get all PNG files from ranks directory
   */
  async getImageFiles() {
    try {
      const files = await fs.readdir(CONFIG.ranksDir);
      return files
        .filter(file => file.toLowerCase().endsWith('.png'))
        .map(file => path.join(CONFIG.ranksDir, file));
    } catch (error) {
      throw new Error(`Failed to read ranks directory: ${error.message}`);
    }
  }

  /**
   * Process files in batches
   */
  async processBatches(files) {
    const totalBatches = Math.ceil(files.length / CONFIG.batchSize);
    
    for (let i = 0; i < files.length; i += CONFIG.batchSize) {
      const batch = files.slice(i, i + CONFIG.batchSize);
      const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
      
      console.log(`\n🏅 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`);
      console.log('─'.repeat(60));
      
      // Process batch concurrently
      const promises = batch.map(filePath => this.compressImage(filePath));
      await Promise.allSettled(promises);
      
      // Progress update
      const progress = ((i + batch.length) / files.length * 100).toFixed(1);
      console.log(`📈 Overall progress: ${progress}% (${this.processed + this.failed}/${files.length})`);
    }
  }

  /**
   * Compress a single image
   */
  async compressImage(filePath) {
    const fileName = path.basename(filePath);
    
    try {
      if (CONFIG.verbose) {
        process.stdout.write(`🔧 ${fileName}... `);
      }

      // Get original file stats
      const originalStats = await fs.stat(filePath);
      this.totalSizeBefore += originalStats.size;

      // Create compressed version
      const tempPath = filePath + '.compressed';
      
      // For PNG files, we'll convert to WebP for better compression, then back to PNG
      // Or use PNG optimization techniques
      await sharp(filePath)
        .png({
          quality: CONFIG.quality,
          progressive: CONFIG.progressive,
          compressionLevel: CONFIG.compressionLevel,
          adaptiveFiltering: true, // Better compression
          force: true // Force PNG output
        })
        .toFile(tempPath);

      // Get compressed file stats
      const compressedStats = await fs.stat(tempPath);
      this.totalSizeAfter += compressedStats.size;

      // Calculate compression ratio
      const compressionRatio = ((originalStats.size - compressedStats.size) / originalStats.size * 100);
      const originalSizeKB = (originalStats.size / 1024).toFixed(1);
      const compressedSizeKB = (compressedStats.size / 1024).toFixed(1);

      if (!CONFIG.dryRun) {
        // Replace original with compressed version
        await fs.unlink(filePath);
        await fs.rename(tempPath, filePath);
      } else {
        // Clean up temp file in dry run mode
        await fs.unlink(tempPath);
      }

      this.processed++;
      
      if (CONFIG.verbose) {
        console.log(`✅ ${originalSizeKB}KB → ${compressedSizeKB}KB (${compressionRatio.toFixed(1)}% reduction)`);
      }

    } catch (error) {
      this.failed++;
      this.errors.push({ file: fileName, error: error.message });
      
      // Clean up any temp files
      try {
        await fs.unlink(filePath + '.compressed');
      } catch {}
      
      if (CONFIG.verbose) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }
  }

  /**
   * Display final results
   */
  displayResults() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const totalOriginalMB = (this.totalSizeBefore / 1024 / 1024).toFixed(2);
    const totalCompressedMB = (this.totalSizeAfter / 1024 / 1024).toFixed(2);
    const totalSaved = this.totalSizeBefore - this.totalSizeAfter;
    const totalSavedMB = (totalSaved / 1024 / 1024).toFixed(2);
    const overallReduction = ((totalSaved / this.totalSizeBefore) * 100).toFixed(1);

    console.log('\n' + '═'.repeat(80));
    console.log('🏆 RANK IMAGES COMPRESSION COMPLETE!');
    console.log('═'.repeat(80));
    console.log(`📊 Processed: ${this.processed} rank images`);
    console.log(`❌ Failed: ${this.failed} images`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📏 Original size: ${totalOriginalMB} MB`);
    console.log(`📉 Compressed size: ${totalCompressedMB} MB`);
    console.log(`💾 Space saved: ${totalSavedMB} MB (${overallReduction}% reduction)`);
    console.log(`🏎️  Processing speed: ${(this.processed / parseFloat(duration)).toFixed(1)} images/second`);
    
    if (CONFIG.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No files were actually modified!');
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(({ file, error }) => {
        console.log(`   ${file}: ${error}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
  }

  /**
   * Validate Sharp is available
   */
  static async validateDependencies() {
    try {
      const sharpVersion = sharp.versions;
      console.log(`✅ Sharp v${sharpVersion.sharp} detected`);
      console.log(`   libvips: ${sharpVersion.vips}`);
      return true;
    } catch (error) {
      console.error('❌ Sharp not found. Installing...');
      return false;
    }
  }
}

/**
 * Install Sharp if not available
 */
async function installSharp() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    console.log('📦 Installing Sharp...');
    await execAsync('npm install sharp', { cwd: path.join(__dirname, '..') });
    console.log('✅ Sharp installed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to install Sharp:', error.message);
    console.error('Please run: npm install sharp');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏆 Rank Images Compressor v1.0');
  console.log('──────────────────────────────────────────\n');

  // Check if Sharp is available
  const hasSharp = await RankImageCompressor.validateDependencies();
  if (!hasSharp) {
    const installed = await installSharp();
    if (!installed) {
      process.exit(1);
    }
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--dry-run')) {
    CONFIG.dryRun = true;
    console.log('🧪 Running in DRY RUN mode - files will not be modified');
  }
  if (args.includes('--quiet')) {
    CONFIG.verbose = false;
  }
  if (args.includes('--help')) {
    console.log('Usage: node compressRankImages.js [options]');
    console.log('Options:');
    console.log('  --dry-run    Test run without modifying files');
    console.log('  --quiet      Minimal output');
    console.log('  --help       Show this help');
    process.exit(0);
  }

  // Confirm action unless dry run
  if (!CONFIG.dryRun) {
    console.log('⚠️  WARNING: This will replace rank PNG images with compressed versions!');
    console.log('⚠️  Make sure you have a backup before proceeding!');
    console.log('');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('🚀 Starting compression...\n');
  }

  // Execute compression
  const compressor = new RankImageCompressor();
  await compressor.compressAllRankImages();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Operation cancelled by user');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = RankImageCompressor; 