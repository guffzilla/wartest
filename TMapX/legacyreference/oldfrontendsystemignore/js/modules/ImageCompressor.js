/**
 * Ultra-Aggressive Image Compression Utility
 * Converts ALL uploaded images to PNG at 10% quality with maximum compression
 * Optimized for MINIMAL file sizes - perfect for reducing server costs
 */

export class ImageCompressor {
  constructor() {
    // AGGRESSIVE compression settings for mass storage efficiency
    this.maxWidth = 1024; // Smaller max width for storage efficiency
    this.maxHeight = 768; // Smaller max height
    this.quality = 0.65; // 65% quality - aggressive but still decent
    this.maxFileSize = 150 * 1024; // 150KB target for aggressive compression
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    
    // Aggressive WebP preset for mass storage
    this.aggressiveWebpPreset = {
      maxWidth: 1024,
      maxHeight: 768,
      quality: 0.65, // 65% quality - aggressive compression
      outputFormat: 'image/webp', // Convert everything to WebP for best compression
      progressive: true,
      aggressive: true
    };
    
    console.log('💾 AGGRESSIVE WebP ImageCompressor initialized - 65% quality, mass storage optimized');
  }

  /**
   * Compress ANY image to ultra-aggressive PNG at 10% quality
   */
  async compressImage(file, options = {}) {
    // Use aggressive WebP compression settings with optional overrides
    const config = {
      ...this.aggressiveWebpPreset,
      ...options, // Allow options to override defaults
      maxFileSize: options.maxFileSize || this.maxFileSize
    };

    try {
      console.log(`💾 AGGRESSIVE WebP compression starting: ${file.name} (${this.formatFileSize(file.size)}) → WebP 65%`);

      // Handle PCX files by converting to WebP
      if (file.name.toLowerCase().endsWith('.pcx')) {
        return await this.convertPCXToWebP(file, config);}

      // Perform aggressive WebP compression
      let compressedFile = await this.performAggressiveWebPCompression(file, config);
      
      // Apply additional passes if still over target (more aggressive threshold)
      if (compressedFile.size > config.maxFileSize) {
        compressedFile = await this.applyAggressiveCompressionPasses(compressedFile, config);
      }

      const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
      console.log(`✅ AGGRESSIVE WebP compression complete: ${this.formatFileSize(file.size)} → ${this.formatFileSize(compressedFile.size)} (${compressionRatio}% reduction)`);
      
      return compressedFile;} catch (error) {
      console.error('Failed to compress image:', error);
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  /**
   * Perform aggressive WebP compression for mass storage
   */
  async performAggressiveWebPCompression(file, config) {
    // Create image element
    const img = await this.createImageFromFile(file);
    
    // Calculate reasonable dimensions for WebP
    const dimensions = this.calculateOptimalDimensions(img.width, img.height, config);
    
    // Create canvas and compress to WebP
    const compressedBlob = await this.compressToWebP(img, dimensions, config);
    
    // Create new WebP file
    const fileName = this.generateWebPFileName(file.name);
    const compressedFile = new File([compressedBlob], fileName, {
      type: 'image/webp',
      lastModified: Date.now()
    });

    return compressedFile;}

  /**
   * Calculate aggressive dimensions for mass storage
   */
  calculateOptimalDimensions(originalWidth, originalHeight, config) {
    let { width, height } = { width: originalWidth, height: originalHeight };
    
    // Aggressive downsizing for mass storage
    const megapixels = (width * height) / 1000000;
    let sizeFactor = 1;
    
    if (megapixels > 8) {
      sizeFactor = 0.4; // 40% for huge images (8MP+)
    } else if (megapixels > 4) {
      sizeFactor = 0.5; // 50% for large images (4MP+)
    } else if (megapixels > 2) {
      sizeFactor = 0.6; // 60% for medium images (2MP+)
    } else if (megapixels > 1) {
      sizeFactor = 0.75; // 75% for small images (1MP+)
    } else {
      sizeFactor = 0.85; // 85% for tiny images
    }

    // Apply aggressive size factor first
    width = Math.floor(width * sizeFactor);
    height = Math.floor(height * sizeFactor);
    
    // Then apply max dimension constraints
    const scaleX = config.maxWidth / width;
    const scaleY = config.maxHeight / height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    
    // Ensure minimum reasonable dimensions for web display
    width = Math.max(width, 150);
    height = Math.max(height, 100);
    
    const totalScale = sizeFactor * scale;
    console.log(`📐 Aggressive resize: ${originalWidth}x${originalHeight} → ${width}x${height} (${(totalScale * 100).toFixed(0)}% of original, ${megapixels.toFixed(1)}MP)`);
    
    return { width, height };}

  /**
   * Compress to WebP with high quality and efficiency
   */
  async compressToWebP(img, dimensions, config) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    // Set high quality rendering for best results
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw the resized image
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
    
    // Convert to WebP blob with specified quality
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/webp', config.quality);});
  }

  /**
   * Apply ultra-aggressive compression filters to reduce file size
   */
  async applyUltraCompressionFilters(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Apply aggressive color reduction and dithering
    for (let i = 0; i < data.length; i += 4) {
      // Reduce color depth aggressively (quantize to fewer colors)
      const factor = 16; // Very aggressive quantization
      data[i] = Math.round(data[i] / factor) * factor;     // Red
      data[i + 1] = Math.round(data[i + 1] / factor) * factor; // Green
      data[i + 2] = Math.round(data[i + 2] / factor) * factor; // Blue
      // Keep alpha as-is for transparency support
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply aggressive compression passes for mass storage
   */
  async applyAggressiveCompressionPasses(file, config) {
    let currentFile = file;
    let attempts = 0;
    const maxAttempts = 4; // Aggressive multi-pass compression

    while (currentFile.size > config.maxFileSize && attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Aggressive WebP pass ${attempts}/${maxAttempts}...`);

      // Get increasingly aggressive with each pass
      const passConfig = {
        ...config,
        quality: Math.max(0.4, config.quality - (0.1 * attempts)), // Reduce quality each pass (min 40%)
        maxWidth: Math.floor(config.maxWidth * (1 - 0.12 * attempts)), // Reduce dimensions 12% each pass
        maxHeight: Math.floor(config.maxHeight * (1 - 0.12 * attempts))
      };

      const img = await this.createImageFromFile(currentFile);
      const dimensions = this.calculateOptimalDimensions(img.width, img.height, passConfig);
      const compressedBlob = await this.compressToWebP(img, dimensions, passConfig);
      
      currentFile = new File([compressedBlob], currentFile.name, {
        type: 'image/webp',
        lastModified: Date.now()
      });

      console.log(`📉 Aggressive pass ${attempts} result: ${this.formatFileSize(currentFile.size)} (${(passConfig.quality * 100).toFixed(0)}% quality)`);
    }

    return currentFile;}

  /**
   * Convert PCX file to ultra-compressed PNG
   */
  async convertPCXToWebP(file, config) {
    try {
      console.log(`🔧 Converting PCX to WebP: ${file.name}`);
      
      const arrayBuffer = await file.arrayBuffer();
      const pcxData = this.parsePCXFile(arrayBuffer);
      
      // Create canvas from PCX data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = pcxData.width;
      canvas.height = pcxData.height;
      
      const imageData = ctx.createImageData(pcxData.width, pcxData.height);
      imageData.data.set(pcxData.pixels);
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to image and apply WebP compression
      const img = new Image();
      img.src = canvas.toDataURL();
      
      await new Promise(resolve => {
        img.onload = resolve;
      });
      
      return await this.performAggressiveWebPCompression(
        new File([await this.canvasToWebP(canvas, config)], file.name, { type: 'image/webp' }), 
        config
      );} catch (error) {
      console.error('PCX to WebP conversion failed:', error);
      throw new Error(`Failed to convert PCX to WebP: ${error.message}`);
    }
  }

  /**
   * Generate WebP filename from any input format
   */
  generateWebPFileName(originalName) {
    const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
    return `${baseName}_compressed.webp`;}

  /**
   * Generate PNG filename from any input format
   */
  generatePNGFileName(originalName) {
    const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
    return `${baseName}_compressed.png`;}

  /**
   * Convert canvas to WebP blob
   */
  async canvasToWebP(canvas, config) {
    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/webp', config.quality);});
  }

  /**
   * Convert canvas to blob
   */
  async canvasToBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');});
  }

  /**
   * Batch compress multiple images to ultra-compressed PNGs
   */
  async compressImages(files, options = {}) {
    console.log(`💾 Starting AGGRESSIVE WebP batch compression of ${files.length} files`);
    
    const results = [];
    const config = { ...this.aggressiveWebpPreset, ...options };
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n📦 Processing ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        if (!this.validateImageFile(file)) {
          console.warn(`⚠️ Skipping unsupported file: ${file.name}`);
          continue;
        }
        
        const compressedFile = await this.compressImage(file, config);
        results.push({
          original: file,
          compressed: compressedFile,
          originalSize: file.size,
          compressedSize: compressedFile.size,
          compressionRatio: ((file.size - compressedFile.size) / file.size * 100).toFixed(1)
        });
        
      } catch (error) {
        console.error(`❌ Failed to compress ${file.name}:`, error);
        results.push({
          original: file,
          error: error.message,
          failed: true
        });
      }
    }
    
    // Summary
    const successful = results.filter(r => !r.failed);
    const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = successful.reduce((sum, r) => sum + r.compressedSize, 0);
    const overallRatio = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(1);
    
    console.log(`\n🎉 AGGRESSIVE WebP Batch compression complete!`);
    console.log(`📊 Processed: ${successful.length}/${files.length} files`);
    console.log(`📏 ${this.formatFileSize(totalOriginalSize)} → ${this.formatFileSize(totalCompressedSize)}`);
    console.log(`💾 Overall compression: ${overallRatio}% reduction`);
    
    return results;}

  /**
   * Get compression preview without actually compressing
   */
  async getCompressionPreview(file, options = {}) {
    const config = { ...this.ultraAggressivePreset, ...options };
    
    if (!this.validateImageFile(file)) {
      throw new Error('Unsupported file format');
    }
    
    const img = await this.createImageFromFile(file);
    const dimensions = this.calculateUltraAggressiveDimensions(img.width, img.height, config);
    
    // Estimate compressed size (rough approximation)
    const pixelCount = dimensions.width * dimensions.height;
    const estimatedSize = Math.max(pixelCount * 0.5, 5000); // Very rough PNG size estimate
    
    return {
      originalSize: file.size,
      originalDimensions: { width: img.width, height: img.height },
      compressedDimensions: dimensions,
      estimatedSize: estimatedSize,
      estimatedRatio: ((file.size - estimatedSize) / file.size * 100).toFixed(1),
      outputFormat: 'image/png'
    };}

  /**
   * Validate if file is a supported image format
   */
  validateImageFile(file) {
    if (!file || !(file instanceof File)) {
      return false;}
    
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/gif', 'image/bmp', 'image/tiff'
    ];
    
    const isValidType = supportedTypes.includes(file.type) || 
                       file.name.toLowerCase().endsWith('.pcx');
    
    if (!isValidType) {
      console.warn(`Unsupported image type: ${file.type || 'unknown'}`);
    }
    
    return isValidType;}

  /**
   * Parse PCX file format (existing functionality)
   */
  parsePCXFile(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    
    // Read PCX header (128 bytes)
    const manufacturer = view.getUint8(0);
    const version = view.getUint8(1);
    const encoding = view.getUint8(2);
    const bitsPerPixel = view.getUint8(3);
    
    if (manufacturer !== 10) {
      throw new Error('Invalid PCX file: wrong manufacturer byte');
    }
    
    const xMin = view.getUint16(4, true);
    const yMin = view.getUint16(6, true);
    const xMax = view.getUint16(8, true);
    const yMax = view.getUint16(10, true);
    
    const width = xMax - xMin + 1;
    const height = yMax - yMin + 1;
    const bytesPerLine = view.getUint16(66, true);
    const planes = view.getUint8(65);
    
    console.log(`PCX: ${width}x${height}, ${bitsPerPixel}bpp, ${planes} planes`);
    
    // Read palette for 8-bit images
    let palette = null;
    if (bitsPerPixel === 8) {
      const paletteStart = arrayBuffer.byteLength - 768;
      if (view.getUint8(paletteStart - 1) === 12) { // Palette marker
        palette = new Uint8Array(arrayBuffer, paletteStart, 768);
      }
    }
    
    // Decode image data
    const imageDataStart = 128;
    const pixels = this.decodePCXRLE(arrayBuffer, imageDataStart, width, height, bitsPerPixel, bytesPerLine, palette);
    
    return {
      width,
      height,
      bitsPerPixel,
      pixels
    };}

  /**
   * Decode PCX RLE compression (existing functionality)
   */
  decodePCXRLE(arrayBuffer, dataOffset, width, height, bitsPerPixel, bytesPerLine, palette) {
    const view = new DataView(arrayBuffer);
    const pixels = new Uint8ClampedArray(width * height * 4); // RGBA
    
    let srcIndex = dataOffset;
    let line = 0;
    
    while (line < height && srcIndex < arrayBuffer.byteLength) {
      const lineData = new Uint8Array(bytesPerLine);
      let lineIndex = 0;
      
      // Decode one line
      while (lineIndex < bytesPerLine && srcIndex < arrayBuffer.byteLength) {
        const byte = view.getUint8(srcIndex++);
        
        if ((byte & 0xC0) === 0xC0) {
          // RLE encoded
          const count = byte & 0x3F;
          const value = view.getUint8(srcIndex++);
          
          for (let i = 0; i < count && lineIndex < bytesPerLine; i++) {
            lineData[lineIndex++] = value;
          }
        } else {
          // Raw byte
          lineData[lineIndex++] = byte;
        }
      }
      
      // Convert line to RGBA pixels
      for (let x = 0; x < width; x++) {
        const pixelIndex = (line * width + x) * 4;
        
        if (bitsPerPixel === 8 && palette) {
          const colorIndex = lineData[x];
          const paletteIndex = colorIndex * 3;
          pixels[pixelIndex] = palette[paletteIndex];     // R
          pixels[pixelIndex + 1] = palette[paletteIndex + 1]; // G
          pixels[pixelIndex + 2] = palette[paletteIndex + 2]; // B
          pixels[pixelIndex + 3] = 255; // A
        } else {
          // For other bit depths, convert to grayscale
          const value = lineData[x];
          pixels[pixelIndex] = value;     // R
          pixels[pixelIndex + 1] = value; // G
          pixels[pixelIndex + 2] = value; // B
          pixels[pixelIndex + 3] = 255;   // A
        }
      }
      
      line++;
    }
    
    return pixels;}

  /**
   * Create Image object from File (existing functionality)
   */
  createImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load image: ${file.name}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Format file size for display (existing functionality)
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];}
}

// Create global instance
window.imageCompressor = new ImageCompressor(); 