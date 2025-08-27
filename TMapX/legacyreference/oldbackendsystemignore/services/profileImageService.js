const axios = require('axios');
const { getBannerFallback, getAvatarFallback } = require('../config/defaultImages');
const User = require('../models/User');

/**
 * Service to fetch profile images and banners from YouTube and Twitch APIs
 * Optimized with persistent caching and better error handling
 */
class ProfileImageService {
  constructor() {
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    this.twitchClientId = process.env.TWITCH_CLIENT_ID;
    this.twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;
    this.twitchAccessToken = null;
    this.twitchTokenExpiry = null;

    // Persistent cache settings
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.quotaCooldown = 6 * 60 * 60 * 1000; // 6 hours (reduced from 1 hour)
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    // Log API credential status on initialization
    console.log('🔑 ProfileImageService initialized with credentials:', {
      youtubeApiKey: this.youtubeApiKey ? 'CONFIGURED' : 'MISSING',
      twitchClientId: this.twitchClientId ? 'CONFIGURED' : 'MISSING',
      twitchClientSecret: this.twitchClientSecret ? 'CONFIGURED' : 'MISSING'
    });
  }

  /**
   * Get Twitch access token (app access token for public API calls)
   */
  async getTwitchAccessToken() {
    if (this.twitchAccessToken && this.twitchTokenExpiry && Date.now() < this.twitchTokenExpiry) {
      return this.twitchAccessToken;
    }

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', {
        client_id: this.twitchClientId,
        client_secret: this.twitchClientSecret,
        grant_type: 'client_credentials'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.twitchAccessToken = response.data.access_token;
      this.twitchTokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Subtract 1 minute for safety
      
      return this.twitchAccessToken;
    } catch (error) {
      console.error('Error getting Twitch access token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Extract YouTube channel ID from various URL formats
   */
  extractYouTubeChannelId(url) {
    if (!url) return null;

    // Handle various YouTube URL formats
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { type: pattern.source.includes('channel') ? 'id' : 'username', value: match[1] };
      }
    }

    // If just a username is provided
    if (!url.includes('/') && !url.includes('.')) {
      return { type: 'username', value: url };
    }

    return null;
  }

  /**
   * Extract Twitch username from URL
   */
  extractTwitchUsername(url) {
    if (!url) return null;

    const match = url.match(/twitch\.tv\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }

    // If just a username is provided
    if (!url.includes('/') && !url.includes('.')) {
      return url;
    }

    return null;
  }

  /**
   * Check if we have cached profile data that's still valid
   */
  async getCachedProfile(platform, channelUrl) {
    try {
      const cacheKey = this.generateCacheKey(platform, channelUrl);
      const cached = await this.getFromCache(cacheKey);

      if (cached && this.isCacheValid(cached.timestamp)) {
        console.log(`📦 Using cached ${platform} profile for:`, channelUrl);
        return cached.data;
      }

      return null;
    } catch (error) {
      console.error('Error checking cache:', error);
      return null;
    }
  }

  /**
   * Store profile data in cache
   */
  async setCachedProfile(platform, channelUrl, profileData) {
    try {
      const cacheKey = this.generateCacheKey(platform, channelUrl);
      await this.setInCache(cacheKey, {
        data: profileData,
        timestamp: Date.now()
      });
      console.log(`💾 Cached ${platform} profile for:`, channelUrl);
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  /**
   * Generate cache key for profile data
   */
  generateCacheKey(platform, channelUrl) {
    const channelInfo = platform === 'youtube'
      ? this.extractYouTubeChannelId(channelUrl)
      : this.extractTwitchUsername(channelUrl);

    return `profile_${platform}_${channelInfo?.value || channelUrl}`;
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(timestamp) {
    return timestamp && (Date.now() - timestamp) < this.cacheExpiry;
  }

  /**
   * Get data from persistent cache (using database for now)
   */
  async getFromCache(cacheKey) {
    try {
      // For now, we'll use a simple approach with User model
      // In production, consider using Redis
      const cached = await User.findOne({
        'cache.key': cacheKey,
        'cache.timestamp': { $gt: Date.now() - this.cacheExpiry }
      });

      return cached?.cache?.data ? {
        data: cached.cache.data,
        timestamp: cached.cache.timestamp
      } : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in persistent cache
   */
  async setInCache(cacheKey, data) {
    try {
      // Store in a dedicated cache collection or user cache field
      // This is a simplified approach - consider Redis for production
      await User.updateOne(
        { 'cache.key': cacheKey },
        {
          $set: {
            'cache.$.data': data.data,
            'cache.$.timestamp': data.timestamp
          }
        }
      );
      
      // If no document was updated, insert a new cache entry
      const result = await User.updateOne(
        { 'cache.key': { $ne: cacheKey } },
        {
          $push: {
            cache: {
              key: cacheKey,
              data: data.data,
              timestamp: data.timestamp
            }
          }
        }
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Check quota status from persistent storage
   */
  async isQuotaExhausted(platform) {
    try {
      const quotaRecord = await User.findOne({
        'quotaStatus.platform': platform,
        'quotaStatus.exhaustedAt': { $gt: Date.now() - this.quotaCooldown }
      });

      return !!quotaRecord;
    } catch (error) {
      console.error('Error checking quota status:', error);
      return false;
    }
  }

  /**
   * Mark quota as exhausted
   */
  async markQuotaExhausted(platform) {
    try {
      await User.updateOne(
        { 'quotaStatus.platform': platform },
        {
          $set: {
            'quotaStatus.$.exhaustedAt': Date.now()
          }
        }
      );
      
      // If no document was updated, insert a new quota status entry
      await User.updateOne(
        { 'quotaStatus.platform': { $ne: platform } },
        {
          $push: {
            quotaStatus: {
              platform: platform,
              exhaustedAt: Date.now()
            }
          }
        }
      );
      console.warn(`⚠️ Marked ${platform} API quota as exhausted`);
    } catch (error) {
      console.error('Error marking quota exhausted:', error);
    }
  }

  /**
   * Fetch YouTube channel profile images with improved caching and error handling
   */
  async fetchYouTubeProfile(channelUrl) {
    if (!this.youtubeApiKey) {
      console.warn('YouTube API key not configured');
      return null;
    }

    // Check cache first
    const cached = await this.getCachedProfile('youtube', channelUrl);
    if (cached) {
      return cached;
    }

    // Check if quota is exhausted
    if (await this.isQuotaExhausted('youtube')) {
      console.warn('YouTube API quota recently exhausted, using fallback');
      const channelInfo = this.extractYouTubeChannelId(channelUrl);
      return this.createFallbackYouTubeProfile(channelInfo?.value || 'Unknown');
    }

    return await this.retryOperation(async () => {
      const channelInfo = this.extractYouTubeChannelId(channelUrl);
      if (!channelInfo) {
        console.warn('Could not extract YouTube channel info from:', channelUrl);
        return null;
      }

      let apiUrl;
      if (channelInfo.type === 'id') {
        apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&id=${channelInfo.value}&key=${this.youtubeApiKey}`;
      } else {
        // For username/@handle, we need to search first
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channelInfo.value}&key=${this.youtubeApiKey}&maxResults=1`;

        try {
          const searchResponse = await this.makeApiRequest(searchUrl);

          if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
            console.warn('YouTube channel not found:', channelInfo.value);
            const fallback = this.createFallbackYouTubeProfile(channelInfo.value);
            await this.setCachedProfile('youtube', channelUrl, fallback);
            return fallback;
          }

          const channelId = searchResponse.data.items[0].snippet.channelId;
          apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&id=${channelId}&key=${this.youtubeApiKey}`;
        } catch (searchError) {
          if (searchError.response?.status === 403) {
            console.warn('YouTube API quota exceeded during search - using fallback profile');
            await this.markQuotaExhausted('youtube');
            const fallback = this.createFallbackYouTubeProfile(channelInfo.value);
            await this.setCachedProfile('youtube', channelUrl, fallback);
            return fallback;
          }
          throw searchError;
        }
      }

      const response = await this.makeApiRequest(apiUrl);

      if (!response.data.items || response.data.items.length === 0) {
        console.warn('YouTube channel data not found');
        const fallback = this.createFallbackYouTubeProfile(channelInfo.value);
        await this.setCachedProfile('youtube', channelUrl, fallback);
        return fallback;
      }

      const channel = response.data.items[0];
      const snippet = channel.snippet;
      const branding = channel.brandingSettings;

      const profileData = {
        avatar: this.validateImageUrl(snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url) || '/assets/img/ranks/emblem.png',
        banner: this.validateImageUrl(branding?.image?.bannerExternalUrl) || this.validateImageUrl(snippet.thumbnails?.high?.url) || '/assets/img/bgs/portal.png',
        title: snippet.title,
        description: snippet.description,
        subscriberCount: snippet.customUrl ? null : null,
        lastUpdated: Date.now()
      };

      // Cache the successful result
      await this.setCachedProfile('youtube', channelUrl, profileData);

      return profileData;
    }, 'YouTube profile fetch', channelUrl);
  }

  /**
   * Make API request with error handling
   */
  async makeApiRequest(url, options = {}) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        ...options
      });
      return response;
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.error?.message?.includes('quota')) {
        const platform = url.includes('youtube') ? 'youtube' : 'twitch';
        await this.markQuotaExhausted(platform);
        throw new Error(`${platform} API quota exceeded`);
      }
      throw error;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation(operation, operationName, ...args) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation(...args);
      } catch (error) {
        lastError = error;

        // Don't retry quota errors
        if (error.message?.includes('quota exceeded')) {
          console.warn(`${operationName} failed due to quota exhaustion`);
          break;
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.warn(`${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
          await this.sleep(delay);
        }
      }
    }

    console.error(`${operationName} failed after ${this.maxRetries} attempts:`, lastError?.message);
    return null;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate image URL
   */
  validateImageUrl(url) {
    if (!url || typeof url !== 'string') return null;

    // Check if it's a valid HTTP/HTTPS URL
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:' ? url : null;
    } catch {
      return null;
    }
  }

  /**
   * Create a fallback YouTube profile when API is unavailable
   */
  createFallbackYouTubeProfile(channelName) {
    return {
      avatar: '/assets/img/ranks/emblem.png',
      banner: '/assets/img/bgs/portal.png',
      title: channelName || 'YouTube Channel',
      description: `${channelName}'s YouTube channel`,
      subscriberCount: null,
      lastUpdated: Date.now()
    };
  }

  /**
   * Fetch Twitch channel profile images with improved caching and error handling
   */
  async fetchTwitchProfile(channelUrl) {
    if (!this.twitchClientId || !this.twitchClientSecret) {
      console.warn('Twitch API credentials not configured');
      return null;
    }

    // Check cache first
    const cached = await this.getCachedProfile('twitch', channelUrl);
    if (cached) {
      return cached;
    }

    // Check if quota is exhausted
    if (await this.isQuotaExhausted('twitch')) {
      console.warn('Twitch API quota recently exhausted, using fallback');
      const username = this.extractTwitchUsername(channelUrl);
      return this.createFallbackTwitchProfile(username || 'Unknown');
    }

    return await this.retryOperation(async () => {
      const username = this.extractTwitchUsername(channelUrl);
      if (!username) {
        console.warn('Could not extract Twitch username from:', channelUrl);
        return null;
      }

      const accessToken = await this.getTwitchAccessToken();

      const response = await this.makeApiRequest(`https://api.twitch.tv/helix/users?login=${username}`, {
        headers: {
          'Client-ID': this.twitchClientId,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.data || response.data.data.length === 0) {
        console.warn('Twitch user not found:', username);
        const fallback = this.createFallbackTwitchProfile(username);
        await this.setCachedProfile('twitch', channelUrl, fallback);
        return fallback;
      }

      const user = response.data.data[0];

      const profileData = {
        avatar: this.validateImageUrl(user.profile_image_url) || '/assets/img/ranks/emblem.png',
        banner: this.validateImageUrl(user.offline_image_url) || this.validateImageUrl(user.profile_image_url) || '/assets/img/bgs/featured.png',
        title: user.display_name,
        description: user.description || `${user.display_name}'s Twitch channel`,
        followerCount: null, // We'd need different endpoint for follower count
        lastUpdated: Date.now()
      };

      // Cache the successful result
      await this.setCachedProfile('twitch', channelUrl, profileData);

      return profileData;
    }, 'Twitch profile fetch', channelUrl);
  }

  /**
   * Create a fallback Twitch profile when API is unavailable
   */
  createFallbackTwitchProfile(username) {
    return {
      avatar: '/assets/img/ranks/emblem.png',
      banner: '/assets/img/bgs/featured.png',
      title: username || 'Twitch Channel',
      description: `${username}'s Twitch channel`,
      followerCount: null,
      lastUpdated: Date.now()
    };
  }

  /**
   * Cache profile data in user record with improved error handling and validation
   */
  async updateUserProfileImages(user) {
    const updates = {};
    const errors = [];

    try {
      // Fetch YouTube profile if available
      if (user.socialLinks?.youtube) {
        try {
          const ytProfile = await this.fetchYouTubeProfile(user.socialLinks.youtube);
          if (ytProfile) {
            // Validate URLs before storing
            if (this.validateImageUrl(ytProfile.avatar)) {
              updates.youtubeAvatar = ytProfile.avatar;
            }
            if (this.validateImageUrl(ytProfile.banner)) {
              updates.youtubeBanner = ytProfile.banner;
            }

            // Store additional metadata
            updates.youtubeProfileTitle = ytProfile.title;
            updates.youtubeProfileDescription = ytProfile.description;
            updates.youtubeProfileLastUpdated = ytProfile.lastUpdated;

            console.log('💾 Cached YouTube profile for user:', user.username);
          }
        } catch (error) {
          console.error('Error fetching YouTube profile for user:', user.username, error.message);
          errors.push(`YouTube: ${error.message}`);
        }
      }

      // Fetch Twitch profile if available
      if (user.socialLinks?.twitch) {
        try {
          const twitchProfile = await this.fetchTwitchProfile(user.socialLinks.twitch);
          if (twitchProfile) {
            // Validate URLs before storing
            if (this.validateImageUrl(twitchProfile.avatar)) {
              updates.twitchAvatar = twitchProfile.avatar;
            }
            if (this.validateImageUrl(twitchProfile.banner)) {
              updates.twitchBanner = twitchProfile.banner;
            }

            // Store additional metadata
            updates.twitchProfileTitle = twitchProfile.title;
            updates.twitchProfileDescription = twitchProfile.description;
            updates.twitchProfileLastUpdated = twitchProfile.lastUpdated;

            console.log('💾 Cached Twitch profile for user:', user.username);
          }
        } catch (error) {
          console.error('Error fetching Twitch profile for user:', user.username, error.message);
          errors.push(`Twitch: ${error.message}`);
        }
      }

      // Add error information if any occurred
      if (errors.length > 0) {
        updates.profileImageErrors = errors;
        updates.profileImageLastErrorAt = Date.now();
      } else {
        // Clear previous errors on success
        updates.profileImageErrors = [];
        updates.profileImageLastErrorAt = null;
      }

      updates.profileImagesLastUpdated = Date.now();

      return updates;
    } catch (error) {
      console.error('Error updating user profile images:', error);
      return {
        profileImageErrors: [error.message],
        profileImageLastErrorAt: Date.now()
      };
    }
  }

  /**
   * Bulk update profile images for multiple users
   */
  async bulkUpdateProfileImages(users, options = {}) {
    const { batchSize = 5, delayBetweenBatches = 1000 } = options;
    const results = [];

    console.log(`🔄 Starting bulk update for ${users.length} users`);

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchPromises = batch.map(async (user) => {
        try {
          const updates = await this.updateUserProfileImages(user);
          if (Object.keys(updates).length > 0) {
            await User.findByIdAndUpdate(user._id, updates);
            return { userId: user._id, username: user.username, status: 'success', updates };
          }
          return { userId: user._id, username: user.username, status: 'no_updates' };
        } catch (error) {
          console.error(`Error updating profile images for user ${user.username}:`, error);
          return { userId: user._id, username: user.username, status: 'error', error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      console.log(`✅ Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`);

      // Delay between batches to avoid overwhelming APIs
      if (i + batchSize < users.length) {
        await this.sleep(delayBetweenBatches);
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`🎯 Bulk update completed: ${successCount} success, ${errorCount} errors, ${results.length - successCount - errorCount} no updates`);

    return results;
  }
}

module.exports = new ProfileImageService(); 