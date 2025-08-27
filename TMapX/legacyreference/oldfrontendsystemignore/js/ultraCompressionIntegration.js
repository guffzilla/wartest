/**
 * Ultra-Aggressive Image Compression Integration
 * How to integrate 10% quality PNG compression into ALL your upload forms
 */

import { ImageCompressor } from './modules/ImageCompressor.js';
import logger from '/js/utils/logger.js';

// Create ultra compressor instance
const ultraCompressor = new ImageCompressor();

// Image Compression Configuration
const compressionConfig = {
  quality: 0.75, // Increased from 0.65 for better balance
  maxWidth: 1920,
  maxHeight: 1080,
  webpQuality: 0.85, // Increased from aggressive compression
  useWebP: true,
  convertToWebP: true,
  // Disable ultra-aggressive compression
  ultraAggressive: false,
  // Add intelligent compression
  smartCompression: true,
  // Only compress images larger than 1MB
  minimumSizeKB: 1024,
  // Cache compressed results
  enableCache: true,
  cacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Initialize compression with optimized settings
export function initializeCompression() {
  
  
  // Use WebP only when supported
  compressionConfig.useWebP = supportsWebP();
  
  // Initialize compression only when needed
  document.querySelectorAll('input[type="file"][accept*="image"]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      
      // Only compress files that need it
      const filesToCompress = files.filter(file => 
        file.size > compressionConfig.minimumSizeKB * 1024
      );
      
      if (filesToCompress.length === 0) {

        return;}
      
      
      // Compression logic here
    });
  });
  
  
}

// Helper function to check WebP support
function supportsWebP() {
  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;}
  return false;}

// Export configuration
export { compressionConfig };

/**
 * EXAMPLE 1: Screenshot Upload Integration
 * Replace ANY file input with ultra-compressed PNG
 */
export function setupScreenshotUpload() {
  const fileInput = document.getElementById('screenshot-input');
  const previewContainer = document.getElementById('screenshot-preview');
  
  if (!fileInput) return;fileInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;try {
      // Process all files with ultra-aggressive compression
      const results = await ultraCompressor.compressImages(files);
      
      // Show preview and compression stats
      displayCompressionResults(results, previewContainer);
      
      // Replace original files with compressed ones for upload
      const compressedFiles = results
        .filter(r => !r.failed)
        .map(r => r.compressed);
      
      // Update form data with compressed files
      updateFileInput(fileInput, compressedFiles);
      
    } catch (error) {
      logger.error('Ultra compression failed', error);
      alert('Image compression failed: ' + error.message);
    }
  });
}

/**
 * EXAMPLE 2: Map Upload Integration
 * Convert any uploaded map image to ultra-compressed PNG
 */
export function setupMapUpload() {
  const fileInput = document.getElementById('map-image-input');
  
  if (!fileInput) return;fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;try {
      const compressedFile = await ultraCompressor.compressImage(file);
      
      
      
      // Update the file input with compressed version
      updateFileInput(fileInput, [compressedFile]);
      
      // Show preview if there's a preview element
      const preview = document.getElementById('map-preview');
      if (preview) {
        showImagePreview(compressedFile, preview);
      }
      
    } catch (error) {
      logger.error('Map compression failed', error);
      alert('Map image compression failed: ' + error.message);
    }
  });
}

/**
 * EXAMPLE 3: Avatar Upload Integration
 * Ultra-compress any profile picture to PNG
 */
export function setupAvatarUpload() {
  const fileInput = document.getElementById('avatar-input');
  
  if (!fileInput) return;fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;try {
      // Use smaller dimensions for avatars
      const compressedFile = await ultraCompressor.compressImage(file, {
        maxWidth: 300,
        maxHeight: 300
      });
      
      
      
      updateFileInput(fileInput, [compressedFile]);
      
      // Update avatar preview
      const avatarPreview = document.getElementById('avatar-preview');
      if (avatarPreview) {
        showImagePreview(compressedFile, avatarPreview);
      }
      
    } catch (error) {
      logger.error('Avatar compression failed', error);
      alert('Avatar compression failed: ' + error.message);
    }
  });
}

/**
 * UNIVERSAL INTEGRATION: Apply to ANY file input
 * This function can be called on ANY file input to add ultra-compression
 */
export function makeFileInputUltraAggressive(inputSelector, options = {}) {
  const fileInput = document.querySelector(inputSelector);
  if (!fileInput) {
    logger.warn(`File input not found: ${inputSelector}`);
    return;}
  
  // Check if already has compression listener
  if (fileInput.hasAttribute('data-ultra-compressed')) {
    // Skipping - already has compression listener
    return;}
  
  logger.info(`Making ${inputSelector} ultra-aggressive`);
  
  // Mark as processed before adding listener
  fileInput.setAttribute('data-ultra-compressed', 'true');
  
  fileInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;const imageFiles = files.filter(file => 
      ultraCompressor.validateImageFile(file)
    );
    
    if (imageFiles.length === 0) {
      
      return;}
    
    
    
    try {
      const results = await ultraCompressor.compressImages(imageFiles, options);
      
      const compressedFiles = results
        .filter(r => !r.failed)
        .map(r => r.compressed);
      
      if (compressedFiles.length > 0) {
        updateFileInput(fileInput, compressedFiles);
        
        // Show compression summary
        const totalOriginal = results.reduce((sum, r) => sum + (r.originalSize || 0), 0);
        const totalCompressed = results.reduce((sum, r) => sum + (r.compressedSize || 0), 0);
        const ratio = ((totalOriginal - totalCompressed) / totalOriginal * 100).toFixed(1);
        

        
        // Show toast notification if available
        showCompressionToast(imageFiles.length, ratio);
      }
      
    } catch (error) {
      logger.error('Ultra compression failed', error);
      alert('Image compression failed: ' + error.message);
    }
  });
}

/**
 * Helper: Update file input with compressed files
 */
function updateFileInput(fileInput, compressedFiles) {
  // Create new FileList
  const dt = new DataTransfer();
  compressedFiles.forEach(file => dt.items.add(file));
  fileInput.files = dt.files;
  
  // Update War Tales file list if on War Tales page
  if (typeof window.updateCampaignFileList === 'function' && 
      fileInput.id === 'screenshots' && 
      window.location.pathname.includes('/wartales')) {
    window.updateCampaignFileList(fileInput.files);
  }
  
  // DON'T dispatch change event - this causes infinite loops with compression listeners
  // Other systems should use compression hooks instead
}

/**
 * Helper: Show image preview
 */
function showImagePreview(file, previewElement) {
  const url = URL.createObjectURL(file);
  
  if (previewElement.tagName === 'IMG') {
    previewElement.src = url;
    previewElement.onload = () => URL.revokeObjectURL(url);
  } else {
    previewElement.innerHTML = `<img src="${url}" style="max-width: 100%; height: auto;" onload="URL.revokeObjectURL(this.src)">`;
  }
}

/**
 * Helper: Display compression results with stats
 */
function displayCompressionResults(results, container) {
  if (!container) return;const successful = results.filter(r => !r.failed);
  const failed = results.filter(r => r.failed);
  
  const html = `
    <div class="compression-results">
      <h4>🔥 Ultra Compression Results</h4>
      <div class="stats">
        <span class="success">✅ ${successful.length} compressed</span>
        ${failed.length > 0 ? `<span class="failed">❌ ${failed.length} failed</span>` : ''}
      </div>
      <div class="file-list">
        ${successful.map(result => `
          <div class="file-result">
            <span class="filename">${result.compressed.name}</span>
            <span class="size">${ultraCompressor.formatFileSize(result.originalSize)} → ${ultraCompressor.formatFileSize(result.compressedSize)}</span>
            <span class="ratio">${result.compressionRatio}% reduction</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Helper: Show compression toast notification
 */
function showCompressionToast(fileCount, compressionRatio) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'compression-toast';
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-icon">🔥</div>
      <div class="toast-message">
        <strong>Ultra Compression Complete!</strong><br>
        ${fileCount} files compressed by ${compressionRatio}%
      </div>
    </div>
  `;
  
  // Style the toast
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    zIndex: '10000',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '300px',
    animation: 'slideInRight 0.3s ease-out'
  });
  
  // Add animation styles
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .compression-toast .toast-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .compression-toast .toast-icon {
        font-size: 24px;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  // Remove toast after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * AUTO-INITIALIZATION
 * Automatically apply ultra compression to common file inputs
 */
export function autoInitializeUltraCompression() {
  
  
  // Common file input selectors
  const selectors = [
    '#screenshot-input',
    '#map-image-input', 
    '#avatar-input',
    'input[type="file"][accept*="image"]',
    '.image-upload',
    '.file-upload'
  ];
  
  // Track processed inputs to avoid duplicates
  const processedInputs = new Set();
  
  selectors.forEach(selector => {
    const inputs = document.querySelectorAll(selector);
    inputs.forEach(input => {
      // Skip if already processed
      if (processedInputs.has(input)) {
        return;}
      
      makeFileInputUltraAggressive(selector);
      processedInputs.add(input);
    });
  });
  
  
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInitializeUltraCompression);
} else {
  autoInitializeUltraCompression();
} 