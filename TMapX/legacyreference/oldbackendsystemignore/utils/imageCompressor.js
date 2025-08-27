const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Server-side Image Compression Utility
 * Optimized for map thumbnails with high-quality compression
 */
class ServerImageCompressor {
  constructor() {
    this.defaultConfig = {
      // PNG optimization settings - AGGRESSIVE COMPRESSION
      png: {
        quality: 10, // Very aggressive compression for maximum file size reduction
        compressionLevel: 9, // Maximum PNG compression
        progressive: true,
        adaptiveFiltering: true,
        force: false // Allow format conversion if beneficial
      },
      
      // JPEG settings (fallback/alternative) - AGGRESSIVE
      jpeg: {
        quality: 10, // Very aggressive JPEG compression
        progressive: true,
        mozjpeg: true,
        optimizeScans: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        optimizeQuantizationTable: true
      },
      
      // WebP settings (for modern browsers) - AGGRESSIVE
      webp: {
        quality: 10, // Very aggressive WebP compression
        alphaQuality: 10, // Aggressive alpha channel compression
        lossless: false,
        nearLossless: false,
        smartSubsample: true,
        effort: 6 // Higher effort = better compression
      },
      
      // Resize settings for thumbnails
      resize: {
        maxWidth: 1024,
        maxHeight: 1024,
        fit: 'inside', // Maintain aspect ratio
        withoutEnlargement: true // Don't enlarge small images
      }
    };
    
    console.log('[ServerImageCompressor] ✅ Image compressor initialized');
  }

  /**
   * Compress a PNG buffer to optimized PNG
   */
  async compressPngBuffer(buffer, options = {}) {
    try {
      const config = { ...this.defaultConfig.png, ...options };
      
      const startSize = buffer.length;
      const startTime = Date.now();

      // Create Sharp pipeline
      let pipeline = sharp(buffer);
      
      // Resize if requested
      if (options.resize || (options.maxWidth || options.maxHeight)) {
        const resizeConfig = {
          ...this.defaultConfig.resize,
          width: options.maxWidth || this.defaultConfig.resize.maxWidth,
          height: options.maxHeight || this.defaultConfig.resize.maxHeight,
          ...options.resize
        };
        
        pipeline = pipeline.resize(resizeConfig);
      }
      
      // Apply PNG optimization
      pipeline = pipeline.png({
        quality: config.quality,
        compressionLevel: config.compressionLevel,
        progressive: config.progressive,
        adaptiveFiltering: config.adaptiveFiltering,
        force: config.force
      });

      // Get compressed buffer
      const compressedBuffer = await pipeline.toBuffer();
      
      const endSize = compressedBuffer.length;
      const duration = Date.now() - startTime;
      const compressionRatio = ((startSize - endSize) / startSize * 100).toFixed(1);
      
      console.log(`[ServerImageCompressor] PNG: ${this.formatBytes(startSize)} → ${this.formatBytes(endSize)} (${compressionRatio}% reduction, ${duration}ms)`);
      
      return {
        buffer: compressedBuffer,
        originalSize: startSize,
        compressedSize: endSize,
        compressionRatio: parseFloat(compressionRatio),
        format: 'png',
        duration
      };

    } catch (error) {
      console.error('[ServerImageCompressor] PNG compression failed:', error.message);
      // Return original buffer if compression fails
      return {
        buffer,
        originalSize: buffer.length,
        compressedSize: buffer.length,
        compressionRatio: 0,
        format: 'png',
        error: error.message
      };
    }
  }

  /**
   * Compress an image file and save the compressed version
   */
  async compressImageFile(inputPath, outputPath = null, options = {}) {
    try {
      // Use input path for output if not specified
      outputPath = outputPath || inputPath;
      
      const inputBuffer = await fs.readFile(inputPath);
      const result = await this.compressPngBuffer(inputBuffer, options);
      
      // Save compressed buffer
      await fs.writeFile(outputPath, result.buffer);
      
      console.log(`[ServerImageCompressor] File: ${path.basename(inputPath)} → ${this.formatBytes(result.compressedSize)}`);
      
      return {
        ...result,
        inputPath,
        outputPath
      };

    } catch (error) {
      console.error(`[ServerImageCompressor] File compression failed for ${inputPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Compress multiple image formats to PNG with options
   */
  async compressToFormat(buffer, format = 'png', options = {}) {
    try {
      const startSize = buffer.length;
      const startTime = Date.now();

      let pipeline = sharp(buffer);
      
      // Resize if requested
      if (options.resize || (options.maxWidth || options.maxHeight)) {
        const resizeConfig = {
          ...this.defaultConfig.resize,
          width: options.maxWidth || this.defaultConfig.resize.maxWidth,
          height: options.maxHeight || this.defaultConfig.resize.maxHeight,
          ...options.resize
        };
        
        pipeline = pipeline.resize(resizeConfig);
      }

      // Apply format-specific compression
      switch (format.toLowerCase()) {
        case 'png':
          const pngConfig = { ...this.defaultConfig.png, ...options.png };
          pipeline = pipeline.png(pngConfig);
          break;
          
        case 'jpeg':
        case 'jpg':
          const jpegConfig = { ...this.defaultConfig.jpeg, ...options.jpeg };
          pipeline = pipeline.jpeg(jpegConfig);
          break;
          
        case 'webp':
          const webpConfig = { ...this.defaultConfig.webp, ...options.webp };
          pipeline = pipeline.webp(webpConfig);
          break;
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const compressedBuffer = await pipeline.toBuffer();
      
      const endSize = compressedBuffer.length;
      const duration = Date.now() - startTime;
      const compressionRatio = ((startSize - endSize) / startSize * 100).toFixed(1);
      
      console.log(`[ServerImageCompressor] ${format.toUpperCase()}: ${this.formatBytes(startSize)} → ${this.formatBytes(endSize)} (${compressionRatio}% reduction, ${duration}ms)`);
      
      return {
        buffer: compressedBuffer,
        originalSize: startSize,
        compressedSize: endSize,
        compressionRatio: parseFloat(compressionRatio),
        format: format.toLowerCase(),
        duration
      };

    } catch (error) {
      console.error(`[ServerImageCompressor] ${format} compression failed:`, error.message);
      throw error;
    }
  }

  /**
   * Smart compression that chooses the best format and settings
   */
  async smartCompress(buffer, options = {}) {
    try {
      const formats = options.formats || ['png'];
      const results = [];
      
      // Try each format and compare results
      for (const format of formats) {
        try {
          const result = await this.compressToFormat(buffer, format, options);
          results.push(result);
        } catch (error) {
          console.warn(`[ServerImageCompressor] ${format} compression failed:`, error.message);
        }
      }
      
      if (results.length === 0) {
        throw new Error('All compression formats failed');
      }
      
      // Choose the best result (smallest size)
      const bestResult = results.reduce((best, current) => 
        current.compressedSize < best.compressedSize ? current : best
      );
      
      console.log(`[ServerImageCompressor] Best format: ${bestResult.format.toUpperCase()} (${this.formatBytes(bestResult.compressedSize)})`);
      
      return bestResult;

    } catch (error) {
      console.error('[ServerImageCompressor] Smart compression failed:', error.message);
      throw error;
    }
  }

  /**
   * Batch compress multiple files
   */
  async compressBatch(inputPaths, options = {}) {
    const results = [];
    
    console.log(`[ServerImageCompressor] Starting batch compression of ${inputPaths.length} files...`);
    
    for (let i = 0; i < inputPaths.length; i++) {
      const inputPath = inputPaths[i];
      
      try {
        console.log(`[ServerImageCompressor] Processing ${i + 1}/${inputPaths.length}: ${path.basename(inputPath)}`);
        
        const result = await this.compressImageFile(inputPath, null, options);
        results.push({ success: true, ...result });
        
      } catch (error) {
        console.error(`[ServerImageCompressor] Failed to compress ${inputPath}:`, error.message);
        results.push({ 
          success: false, 
          inputPath, 
          error: error.message 
        });
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success);
    const totalOriginalSize = successful.reduce((sum, r) => sum + (r.originalSize || 0), 0);
    const totalCompressedSize = successful.reduce((sum, r) => sum + (r.compressedSize || 0), 0);
    const overallRatio = totalOriginalSize > 0 ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(1) : 0;
    
    console.log(`[ServerImageCompressor] Batch complete: ${successful.length}/${inputPaths.length} files compressed`);
    console.log(`[ServerImageCompressor] Total savings: ${this.formatBytes(totalOriginalSize - totalCompressedSize)} (${overallRatio}% reduction)`);
    
    return results;
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Get image metadata without loading full image
   */
  async getImageMetadata(input) {
    try {
      const metadata = await sharp(input).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        size: input instanceof Buffer ? input.length : undefined
      };
    } catch (error) {
      console.error('[ServerImageCompressor] Failed to get metadata:', error.message);
      return null;
    }
  }
}

module.exports = ServerImageCompressor; 