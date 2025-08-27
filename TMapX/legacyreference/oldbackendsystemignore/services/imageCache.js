const User = require('../models/User');

/**
 * Improved image caching service with persistent storage
 * Replaces the simple in-memory cache with database-backed caching
 */
class ImageCacheService {
  constructor() {
    this.defaultCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.shortCacheExpiry = 1 * 60 * 60 * 1000; // 1 hour for failed requests
    this.maxCacheSize = 10000; // Maximum number of cache entries
  }

  /**
   * Generate cache key for image
   */
  generateCacheKey(platform, identifier, type = 'profile') {
    return `img_${platform}_${type}_${identifier}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Get cached image URL
   */
  async getCachedImage(platform, identifier, type = 'profile') {
    try {
      const cacheKey = this.generateCacheKey(platform, identifier, type);
      
      // Find cache entry that's still valid
      const cached = await this.findCacheEntry(cacheKey);
      
      if (cached && this.isCacheValid(cached.timestamp, cached.isError)) {
        console.log(`📦 Cache hit for ${platform} ${type}:`, identifier);
        return cached.isError ? null : cached.url;
      }
      
      // Clean up expired cache entry
      if (cached) {
        await this.deleteCacheEntry(cacheKey);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  /**
   * Cache image URL
   */
  async setCachedImage(platform, identifier, imageUrl, type = 'profile', isError = false) {
    try {
      const cacheKey = this.generateCacheKey(platform, identifier, type);
      
      await this.storeCacheEntry(cacheKey, {
        platform,
        identifier,
        type,
        url: imageUrl,
        isError,
        timestamp: Date.now()
      });
      
      console.log(`💾 Cached ${platform} ${type} for:`, identifier);
      
      // Cleanup old cache entries periodically
      if (Math.random() < 0.01) { // 1% chance
        await this.cleanupOldEntries();
      }
      
    } catch (error) {
      console.error('Error caching image:', error);
    }
  }

  /**
   * Check if cache entry is still valid
   */
  isCacheValid(timestamp, isError = false) {
    const expiry = isError ? this.shortCacheExpiry : this.defaultCacheExpiry;
    return timestamp && (Date.now() - timestamp) < expiry;
  }

  /**
   * Find cache entry in database
   */
  async findCacheEntry(cacheKey) {
    try {
      // Using a simple approach with User model for now
      // In production, consider a dedicated cache collection or Redis
      const result = await User.findOne({
        'imageCache.key': cacheKey
      }, {
        'imageCache.$': 1
      });
      
      return result?.imageCache?.[0] || null;
    } catch (error) {
      console.error('Error finding cache entry:', error);
      return null;
    }
  }

  /**
   * Store cache entry in database
   */
  async storeCacheEntry(cacheKey, data) {
    try {
      // Remove existing entry and add new one
      await User.updateMany(
        { 'imageCache.key': cacheKey },
        { $pull: { imageCache: { key: cacheKey } } }
      );
      
      await User.updateOne(
        { 'imageCache.key': { $ne: cacheKey } },
        { 
          $push: { 
            imageCache: {
              key: cacheKey,
              ...data
            }
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error storing cache entry:', error);
    }
  }

  /**
   * Delete cache entry
   */
  async deleteCacheEntry(cacheKey) {
    try {
      await User.updateMany(
        { 'imageCache.key': cacheKey },
        { $pull: { imageCache: { key: cacheKey } } }
      );
    } catch (error) {
      console.error('Error deleting cache entry:', error);
    }
  }

  /**
   * Clean up old cache entries
   */
  async cleanupOldEntries() {
    try {
      const cutoffTime = Date.now() - this.defaultCacheExpiry;
      
      const result = await User.updateMany(
        { 'imageCache.timestamp': { $lt: cutoffTime } },
        { $pull: { imageCache: { timestamp: { $lt: cutoffTime } } } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`🧹 Cleaned up ${result.modifiedCount} expired cache entries`);
      }
    } catch (error) {
      console.error('Error cleaning up cache entries:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const stats = await User.aggregate([
        { $unwind: '$imageCache' },
        {
          $group: {
            _id: '$imageCache.platform',
            count: { $sum: 1 },
            errors: { $sum: { $cond: ['$imageCache.isError', 1, 0] } },
            avgAge: { $avg: { $subtract: [Date.now(), '$imageCache.timestamp'] } }
          }
        }
      ]);
      
      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return [];
    }
  }

  /**
   * Clear all cache entries for a platform
   */
  async clearPlatformCache(platform) {
    try {
      const result = await User.updateMany(
        { 'imageCache.platform': platform },
        { $pull: { imageCache: { platform } } }
      );
      
      console.log(`🗑️ Cleared ${result.modifiedCount} cache entries for platform: ${platform}`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error clearing platform cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache for specific identifier
   */
  async invalidateCache(platform, identifier, type = 'profile') {
    try {
      const cacheKey = this.generateCacheKey(platform, identifier, type);
      await this.deleteCacheEntry(cacheKey);
      console.log(`🗑️ Invalidated cache for ${platform} ${type}:`, identifier);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(imageUrls) {
    const results = [];
    
    for (const url of imageUrls) {
      try {
        // Test if image loads successfully
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        results.push({ url, status: response.ok ? 'success' : 'failed' });
      } catch (error) {
        results.push({ url, status: 'error', error: error.message });
      }
    }
    
    return results;
  }
}

module.exports = new ImageCacheService();
