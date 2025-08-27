const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const profileImageService = require('../services/profileImageService');
const imageCache = require('../services/imageCache');
const { getBannerFallback, getAvatarFallback } = require('../config/defaultImages');

/**
 * Get optimized profile image with caching
 */
async function getOptimizedProfileImage(platform, channelName, channelUrl) {
  try {
    // Check cache first
    const cached = await imageCache.getCachedImage(platform, channelName, 'avatar');
    if (cached) {
      return cached;
    }

    // Fetch fresh image
    let imageUrl = '/assets/img/ranks/emblem.png';

    if (platform === 'youtube' && profileImageService) {
      const profile = await profileImageService.fetchYouTubeProfile(channelUrl || channelName);
      imageUrl = profile?.avatar || '/assets/img/ranks/emblem.png';
    } else if (platform === 'twitch' && profileImageService) {
      const profile = await profileImageService.fetchTwitchProfile(channelUrl || channelName);
      imageUrl = profile?.avatar || '/assets/img/ranks/emblem.png';
    }

    // Cache the result (even if it's a fallback)
    await imageCache.setCachedImage(platform, channelName, imageUrl, 'avatar', imageUrl.includes('/assets/'));

    return imageUrl;
  } catch (error) {
    console.error(`Error getting optimized ${platform} profile image:`, error);

    // Cache the error to avoid repeated failures
    await imageCache.setCachedImage(platform, channelName, '/assets/img/ranks/emblem.png', 'avatar', true);

    return '/assets/img/ranks/emblem.png';
  }
}

/**
 * Get optimized banner image with caching
 */
async function getOptimizedBannerImage(platform, channelName, channelUrl) {
  try {
    // Check cache first
    const cached = await imageCache.getCachedImage(platform, channelName, 'banner');
    if (cached) {
      return cached;
    }

    // Fetch fresh image
    let imageUrl = platform === 'youtube' ? '/assets/img/bgs/portal.png' : '/assets/img/bgs/featured.png';

    if (platform === 'youtube' && profileImageService) {
      const profile = await profileImageService.fetchYouTubeProfile(channelUrl || channelName);
      imageUrl = profile?.banner || '/assets/img/bgs/portal.png';
    } else if (platform === 'twitch' && profileImageService) {
      const profile = await profileImageService.fetchTwitchProfile(channelUrl || channelName);
      imageUrl = profile?.banner || '/assets/img/bgs/featured.png';
    }

    // Cache the result
    await imageCache.setCachedImage(platform, channelName, imageUrl, 'banner', imageUrl.includes('/assets/'));

    return imageUrl;
  } catch (error) {
    console.error(`Error getting optimized ${platform} banner image:`, error);

    const fallback = platform === 'youtube' ? '/assets/img/bgs/portal.png' : '/assets/img/bgs/featured.png';
    await imageCache.setCachedImage(platform, channelName, fallback, 'banner', true);

    return fallback;
  }
}

/**
 * Enhanced channel data preparation with optimized image loading
 */
async function prepareChannelData(creator, platform) {
  // Extract channel name with improved parsing
  let channelName = creator.username;
  let channelUrl = creator.socialLinks?.[platform];

  if (platform === 'youtube') {
    if (creator.streaming?.youtubeUsername) {
      channelName = creator.streaming.youtubeUsername;
    } else if (channelUrl) {
      const match = channelUrl.match(/@([^/?#]+)|\/(?:channel|c|user)\/([^/?#]+)/);
      if (match) channelName = match[1] || match[2];
    }
  } else if (platform === 'twitch') {
    if (creator.streaming?.twitchUsername) {
      channelName = creator.streaming.twitchUsername;
    } else if (channelUrl) {
      const match = channelUrl.match(/twitch\.tv\/([^/?#]+)/);
      if (match) channelName = match[1];
    }
  }

  // Use cached images if available, otherwise use optimized fetching
  const avatar = creator[`${platform}Avatar`] || await getOptimizedProfileImage(platform, channelName, channelUrl);
  const banner = creator[`${platform}Banner`] || await getOptimizedBannerImage(platform, channelName, channelUrl);

  return {
    id: creator._id.toString(),
    name: channelName,
    description: creator.streaming?.[`${platform}Description`] || creator.bio || 'Warcraft content creator',
    url: channelUrl,
    avatar,
    banner,
    platform,
    games: creator.streaming?.[`${platform}Games`] || [],
    isLive: Boolean(creator.streaming?.[`${platform}IsLive`]),
    [`${platform}IsLive`]: creator.streaming?.[`${platform}IsLive`] || false,
    // Include platform-specific avatars for frontend optimization
    youtubeAvatar: creator.youtubeAvatar,
    twitchAvatar: creator.twitchAvatar,
    // Platform-specific ratings
    averageRating: creator[`${platform}AverageRating`] || 0,
    ratingsCount: creator[`${platform}RatingsCount`] || 0
  };
}

// Middleware to prevent treating specific paths as ObjectIds
router.use((req, res, next) => {
  const pathSegments = req.path.split('/').filter(segment => segment); // Remove empty segments
  const firstSegment = pathSegments[0];
  
  // Allow specific named routes
  if (['all', 'youtube', 'twitch', 'featured', 'admin', 'user', 'refresh-images'].includes(firstSegment)) {
    return next();
  }
  
  // Allow ObjectId routes (with potential sub-routes like /rate, /ratings)
  if (firstSegment && firstSegment.length === 24 && /^[0-9a-fA-F]{24}$/.test(firstSegment)) {
    return next();
  }
  
  // For any other paths, treat as non-ObjectId routes
  next();
});

/**
 * Get all channels from content creators (combining YouTube and Twitch)
 * MUST BE FIRST - specific routes before any generic ones
 */
router.get('/all', async (req, res) => {
  try {
    const { game, sort } = req.query;
    console.log('Getting all channels for game:', game, 'sort:', sort);

    // Get YouTube channels
    const youtubeCreators = await User.find({
      'streaming.youtubeGames': { $exists: true, $not: { $size: 0 } },
      'socialLinks.youtube': { $exists: true, $ne: '' }
    });

    // Get Twitch channels  
    const twitchCreators = await User.find({
      'streaming.twitchGames': { $exists: true, $not: { $size: 0 } },
      'socialLinks.twitch': { $exists: true, $ne: '' }
    });

    console.log(`Found ${youtubeCreators.length} YouTube and ${twitchCreators.length} Twitch creators`);

    // Filter YouTube creators by game
    const filteredYouTubeCreators = game && game !== 'all'
      ? youtubeCreators.filter(user => {
          if (!user.streaming || !user.streaming.youtubeGames) return false;
          
          if (game === 'wc12') {
            return user.streaming.youtubeGames.includes('wc12');
          } else if (game === 'wc3') {
            return user.streaming.youtubeGames.includes('wc3');
          }
          return user.streaming.youtubeGames.includes(game);
        })
      : youtubeCreators;

    // Filter Twitch creators by game
    const filteredTwitchCreators = game && game !== 'all'
      ? twitchCreators.filter(user => {
          if (!user.streaming || !user.streaming.twitchGames) return false;
          
          if (game === 'wc12') {
            return user.streaming.twitchGames.includes('wc12');
          } else if (game === 'wc3') {
            return user.streaming.twitchGames.includes('wc3');
          }
          return user.streaming.twitchGames.includes(game);
        })
      : twitchCreators;

    console.log(`After filtering: ${filteredYouTubeCreators.length} YouTube and ${filteredTwitchCreators.length} Twitch creators`);

    // Prepare channel data for YouTube
    const youtubeChannels = filteredYouTubeCreators.map(creator => {
      // Extract channel name from various sources with proper URL parsing
      let channelName = creator.username; // Default to username
      
      // Try to get a better name from streaming data or social links
      if (creator.streaming?.youtubeUsername) {
        channelName = creator.streaming.youtubeUsername;
      } else if (creator.socialLinks?.youtube) {
        // Extract username from YouTube URL
        const youtubeUrl = creator.socialLinks.youtube;
        if (youtubeUrl.includes('@')) {
          // Handle @username format
          const atMatch = youtubeUrl.match(/@([^/?#]+)/);
          if (atMatch) channelName = atMatch[1];
        } else if (youtubeUrl.includes('/channel/') || youtubeUrl.includes('/c/') || youtubeUrl.includes('/user/')) {
          // Handle other YouTube URL formats
          const pathMatch = youtubeUrl.match(/\/(channel|c|user)\/([^/?#]+)/);
          if (pathMatch) channelName = pathMatch[2];
        }
      }

      // More accurate live status detection - only use platform-specific status
      const channelIsLive = Boolean(creator.streaming?.youtubeIsLive);

      return {
        id: creator._id.toString(),
        name: channelName,
        description: creator.streaming?.youtubeDescription || creator.bio || 'Warcraft content creator',
        url: creator.socialLinks?.youtube,
        avatar: creator.youtubeAvatar || creator.avatar || '/assets/img/ranks/emblem.png',
        banner: creator.youtubeBanner || creator.bannerImage || '/assets/img/bgs/portal.png',
        platform: 'youtube',
        games: creator.streaming?.youtubeGames || [],
        isLive: channelIsLive,
        youtubeIsLive: creator.streaming?.youtubeIsLive || false,
        twitchIsLive: false, // YouTube channel doesn't show Twitch status
        // Include platform-specific avatars for frontend optimization
        youtubeAvatar: creator.youtubeAvatar,
        twitchAvatar: creator.twitchAvatar,
        // Platform-specific ratings
        averageRating: creator.youtubeAverageRating || 0,
        ratingsCount: creator.youtubeRatingsCount || 0
      };
    });

    // Prepare channel data for Twitch
    const twitchChannels = filteredTwitchCreators.map(creator => {
      // Extract channel name from various sources with proper URL parsing
      let channelName = creator.username; // Default to username
      
      // Try to get a better name from streaming data or social links
      if (creator.streaming?.twitchUsername) {
        channelName = creator.streaming.twitchUsername;
      } else if (creator.socialLinks?.twitch) {
        // Extract username from Twitch URL
        const twitchUrl = creator.socialLinks.twitch;
        // Extract the username from URLs like https://twitch.tv/username
        const match = twitchUrl.match(/twitch\.tv\/([^/?#]+)/);
        if (match) channelName = match[1];
      }

      // More accurate live status detection - only use platform-specific status
      const channelIsLive = Boolean(creator.streaming?.twitchIsLive);

      return {
        id: creator._id.toString(),
        name: channelName,
        description: creator.streaming?.twitchDescription || creator.bio || 'Warcraft content creator',
        url: creator.socialLinks?.twitch,
        avatar: creator.twitchAvatar || creator.avatar || '/assets/img/ranks/emblem.png',
        banner: creator.twitchBanner || creator.bannerImage || '/assets/img/bgs/featured.png',
        platform: 'twitch',
        games: creator.streaming?.twitchGames || [],
        isLive: channelIsLive,
        twitchIsLive: creator.streaming?.twitchIsLive || false,
        youtubeIsLive: false, // Twitch channel doesn't show YouTube status
        // Include platform-specific avatars for frontend optimization
        youtubeAvatar: creator.youtubeAvatar,
        twitchAvatar: creator.twitchAvatar,
        // Platform-specific ratings
        averageRating: creator.twitchAverageRating || 0,
        ratingsCount: creator.twitchRatingsCount || 0
      };
    });

    // Combine all channels
    let allChannels = [...youtubeChannels, ...twitchChannels];
    
    // Apply sorting
    if (sort === 'highest-rated') {
      allChannels.sort((a, b) => {
        // Sort by average rating first (descending), then by number of ratings (descending)
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.ratingsCount - a.ratingsCount;
      });
    } else if (sort === 'live') {
      // Sort by live status first, then by rating
      allChannels.sort((a, b) => {
        if (b.isLive !== a.isLive) {
          return b.isLive - a.isLive; // Live channels first
        }
        return b.averageRating - a.averageRating;
      });
    }
    // Default: no sorting (natural order)
    
    console.log(`Returning ${allChannels.length} total channels with sort: ${sort || 'none'}`);
    res.json(allChannels);
  } catch (error) {
    console.error('Error fetching all channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get YouTube channels from content creators
 */
router.get('/youtube', async (req, res) => {
  try {
    const { game } = req.query;
    console.log('YouTube channels API called with game filter:', game);

    // Find users who are content creators and have YouTube links
    const youtubeCreators = await User.find({
      'streaming.youtubeGames': { $exists: true, $not: { $size: 0 } },
      'socialLinks.youtube': { $exists: true, $ne: '' }
    });

    console.log(`Found ${youtubeCreators.length} YouTube content creators`);

    // Filter by game if needed
    const filteredCreators = game && game !== 'all'
      ? youtubeCreators.filter(user => {
          if (!user.streaming || !user.streaming.youtubeGames) return false;
          
          if (game === 'wc12') {
            return user.streaming.youtubeGames.includes('wc12');
          } else if (game === 'wc3') {
            return user.streaming.youtubeGames.includes('wc3');
          }
          return false;
        })
      : youtubeCreators;

    console.log('After filtering:', filteredCreators.length, 'YouTube creators');

    // Prepare channel data for YouTube
    const youtubeChannelsFiltered = filteredCreators.map(creator => {
      // Extract channel name from various sources with proper URL parsing
      let channelName = creator.username; // Default to username
      
      // Try to get a better name from streaming data or social links
      if (creator.streaming?.youtubeUsername) {
        channelName = creator.streaming.youtubeUsername;
      } else if (creator.socialLinks?.youtube) {
        // Extract username from YouTube URL
        const youtubeUrl = creator.socialLinks.youtube;
        if (youtubeUrl.includes('@')) {
          // Handle @username format
          const atMatch = youtubeUrl.match(/@([^/?#]+)/);
          if (atMatch) channelName = atMatch[1];
        } else if (youtubeUrl.includes('/channel/') || youtubeUrl.includes('/c/') || youtubeUrl.includes('/user/')) {
          // Handle other YouTube URL formats
          const pathMatch = youtubeUrl.match(/\/(channel|c|user)\/([^/?#]+)/);
          if (pathMatch) channelName = pathMatch[2];
        }
      }

      // More accurate live status detection - only use platform-specific status
      const channelIsLive = Boolean(creator.streaming?.youtubeIsLive);

      return {
        id: creator._id.toString(),
        name: channelName,
        description: creator.streaming?.youtubeDescription || creator.bio || 'Warcraft content creator',
        url: creator.socialLinks?.youtube,
        avatar: creator.youtubeAvatar || creator.avatar || '/assets/img/ranks/emblem.png',
        banner: creator.youtubeBanner || creator.bannerImage || '/assets/img/bgs/portal.png',
        platform: 'youtube',
        games: creator.streaming?.youtubeGames || [],
        isLive: channelIsLive,
        youtubeIsLive: creator.streaming?.youtubeIsLive || false,
        twitchIsLive: false, // YouTube channel doesn't show Twitch status
        // Platform-specific ratings
        averageRating: creator.youtubeAverageRating || 0,
        ratingsCount: creator.youtubeRatingsCount || 0
      };
    });

    console.log('Returning', youtubeChannelsFiltered.length, 'YouTube channels');
    return res.json(youtubeChannelsFiltered);
  } catch (error) {
    console.error('Error fetching YouTube channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get Twitch channels from content creators
 */
router.get('/twitch', async (req, res) => {
  try {
    const { game } = req.query;
    console.log('Twitch channels API called with game filter:', game);

    // Find users who are content creators and have Twitch links
    const twitchCreators = await User.find({
      'streaming.twitchGames': { $exists: true, $not: { $size: 0 } },
      'socialLinks.twitch': { $exists: true, $ne: '' }
    });

    console.log(`Found ${twitchCreators.length} Twitch content creators`);

    // Filter by game if needed
    const filteredCreators = game && game !== 'all'
      ? twitchCreators.filter(user => {
          if (!user.streaming || !user.streaming.twitchGames) return false;
          
          if (game === 'wc12') {
            return user.streaming.twitchGames.includes('wc12');
          } else if (game === 'wc3') {
            return user.streaming.twitchGames.includes('wc3');
          }
          return false;
        })
      : twitchCreators;

    console.log('After filtering:', filteredCreators.length, 'Twitch creators');

    // Prepare channel data for Twitch
    const twitchChannels = filteredCreators.map(creator => {
      // Use the appropriate channel name (prioritize streaming username, then regular username, then display name)
      const channelName = creator.streaming?.twitchUsername || 
                         creator.socialLinks?.twitch || 
                         creator.username || 
                         creator.displayName;

      // More accurate live status detection - only use platform-specific status
      const channelIsLive = Boolean(creator.streaming?.twitchIsLive);

      return {
        id: creator._id.toString(),
        name: channelName,
        description: creator.streaming?.twitchDescription || creator.bio || 'Warcraft content creator',
        url: creator.socialLinks?.twitch,
        avatar: creator.twitchAvatar || creator.avatar || '/assets/img/ranks/emblem.png',
        banner: creator.twitchBanner || creator.bannerImage || '/assets/img/bgs/featured.png',
        platform: 'twitch',
        games: creator.streaming?.twitchGames || [],
        isLive: channelIsLive,
        twitchIsLive: creator.streaming?.twitchIsLive || false,
        youtubeIsLive: false, // Twitch channel doesn't show YouTube status
        // Platform-specific ratings
        averageRating: creator.twitchAverageRating || 0,
        ratingsCount: creator.twitchRatingsCount || 0
      };
    });

    console.log('Returning', twitchChannels.length, 'Twitch channels');
    res.json(twitchChannels);
  } catch (error) {
    console.error('Error fetching Twitch channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get featured channels (legacy Channel model)
 */
router.get('/featured', async (req, res) => {
  try {
    const { game } = req.query;
    const channels = await Channel.getFeaturedChannels(game);
    res.json(channels);
  } catch (error) {
    console.error('Error fetching featured channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get channels pending approval (admin only) (legacy Channel model)
 */
router.get('/admin/pending', [authenticate, requireAdmin], async (req, res) => {
  try {
    const channels = await Channel.find({ approved: false })
      .sort({ createdAt: 1 });

    res.json(channels);
  } catch (error) {
    console.error('Error fetching pending channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user's channels (legacy Channel model)
 */
router.get('/user/my-channels', authenticate, async (req, res) => {
  try {
    const channels = await Channel.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(channels);
  } catch (error) {
    console.error('Error fetching user channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Legacy Channel model routes (keeping for backward compatibility)
// These should come AFTER all the specific routes

/**
 * Get all approved channels (legacy Channel model)
 */
router.get('/', async (req, res) => {
  try {
    const { game } = req.query;
    const channels = await Channel.getApprovedChannels(game);
    res.json(channels);
  } catch (error) {
    console.error('Error fetching legacy channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Add a new channel (legacy Channel model)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, url, platform, description, games, videoIds } = req.body;

    // Validate required fields
    if (!name || !url || !description || !games || !games.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new channel
    const channel = new Channel({
      user: req.user.id,
      name,
      url,
      platform: platform || 'twitch',
      description,
      games,
      videoIds: videoIds || [],
      approved: false,
      featured: false
    });

    await channel.save();
    res.status(201).json(channel);
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Refresh profile images for a specific user (admin only)
 * Enhanced with better caching and error handling
 */
router.post('/refresh-images/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { force = false } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if we should skip due to recent update (unless forced)
    if (!force && user.profileImagesLastUpdated) {
      const timeSinceUpdate = Date.now() - user.profileImagesLastUpdated.getTime();
      const minInterval = 30 * 60 * 1000; // 30 minutes

      if (timeSinceUpdate < minInterval) {
        return res.json({
          message: 'Profile images were recently updated',
          lastUpdated: user.profileImagesLastUpdated,
          nextUpdateAllowed: new Date(user.profileImagesLastUpdated.getTime() + minInterval)
        });
      }
    }

    // Clear cache for this user if forced
    if (force) {
      if (user.socialLinks?.youtube) {
        const ytChannelInfo = profileImageService.extractYouTubeChannelId(user.socialLinks.youtube);
        if (ytChannelInfo) {
          await imageCache.invalidateCache('youtube', ytChannelInfo.value);
        }
      }

      if (user.socialLinks?.twitch) {
        const twitchUsername = profileImageService.extractTwitchUsername(user.socialLinks.twitch);
        if (twitchUsername) {
          await imageCache.invalidateCache('twitch', twitchUsername);
        }
      }
    }

    const updates = await profileImageService.updateUserProfileImages(user);

    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(userId, updates);
      res.json({
        message: 'Profile images refreshed successfully',
        updates,
        user: user.username
      });
    } else {
      res.json({
        message: 'No updates needed',
        user: user.username
      });
    }
  } catch (error) {
    console.error('Error refreshing profile images:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});



/**
 * Force refresh live status for all content creators (admin only)
 */
router.post('/refresh-live-status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { checkAllLiveStatus } = require('../services/streamChecker');
    
    console.log('🔄 Manually triggering live status check...');
    await checkAllLiveStatus();
    
    res.json({ 
      message: 'Live status check completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing live status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rate a content creator on a specific platform
router.post('/:id/rate', authenticate, async (req, res) => {
  try {
    console.log('🎯 Creator rating request received:', {
      creatorId: req.params.id,
      body: req.body,
      user: req.user ? { id: req.user._id, username: req.user.username } : 'No user'
    });

    const { rating, comment, platform } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      console.error('❌ Invalid rating value:', rating);
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (!platform || !['youtube', 'twitch'].includes(platform)) {
      console.error('❌ Invalid or missing platform:', platform);
      return res.status(400).json({ error: 'Platform must be either "youtube" or "twitch"' });
    }

    // Find the content creator
    const creator = await User.findById(req.params.id);

    if (!creator) {
      console.error('❌ Creator not found:', req.params.id);
      return res.status(404).json({ error: 'Content creator not found' });
    }

    console.log('✅ Creator found:', creator.username);
    console.log('🔍 User rating:', { id: req.user._id, username: req.user.username });

    // Add the platform-specific rating
    const newAverage = await creator.addRating(req.user._id, rating, comment || '', platform);

    console.log('✅ Rating added successfully');
    res.json({
      message: 'Rating added successfully',
      averageRating: newAverage,
      platform: platform
    });

  } catch (err) {
    console.error('❌ Error adding rating:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Remove a platform-specific rating
router.delete('/:id/rate', authenticate, async (req, res) => {
  try {
    const { platform } = req.body;

    if (!platform || !['youtube', 'twitch'].includes(platform)) {
      return res.status(400).json({ error: 'Platform must be either "youtube" or "twitch"' });
    }

    const creator = await User.findById(req.params.id);

    if (!creator) {
      return res.status(404).json({ error: 'Content creator not found' });
    }

    const success = await creator.removeRating(req.user._id, platform);

    if (success) {
      // Get updated average based on platform
      const averageField = platform === 'youtube' ? 'youtubeAverageRating' : 'twitchAverageRating';
      res.json({
        message: 'Rating removed successfully',
        averageRating: creator[averageField],
        platform: platform
      });
    } else {
      res.status(404).json({ error: 'Rating not found' });
    }

  } catch (err) {
    console.error('❌ Error removing rating:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get platform-specific ratings for a content creator
router.get('/:id/ratings', async (req, res) => {
  try {
    const { platform } = req.query;

    const populateFields = platform === 'youtube' ? 'youtubeRatings.userId' :
                          platform === 'twitch' ? 'twitchRatings.userId' :
                          'youtubeRatings.userId twitchRatings.userId';

    const creator = await User.findById(req.params.id)
      .populate(populateFields, 'username displayName avatar playerIDs')
      .select('youtubeRatings twitchRatings youtubeAverageRating twitchAverageRating youtubeRatingsCount twitchRatingsCount username displayName');

    if (!creator) {
      return res.status(404).json({ error: 'Content creator not found' });
    }

    if (platform) {
      // Return platform-specific ratings
      const ratingsArray = platform === 'youtube' ? creator.youtubeRatings : creator.twitchRatings;
      const averageRating = platform === 'youtube' ? creator.youtubeAverageRating : creator.twitchAverageRating;
      const ratingsCount = platform === 'youtube' ? creator.youtubeRatingsCount : creator.twitchRatingsCount;

      res.json({
        ratings: ratingsArray,
        averageRating: averageRating,
        ratingsCount: ratingsCount,
        platform: platform,
        creatorName: creator.displayName || creator.username
      });
    } else {
      // Return all ratings for both platforms
      res.json({
        youtubeRatings: creator.youtubeRatings,
        twitchRatings: creator.twitchRatings,
        youtubeAverageRating: creator.youtubeAverageRating,
        twitchAverageRating: creator.twitchAverageRating,
        youtubeRatingsCount: creator.youtubeRatingsCount,
        twitchRatingsCount: creator.twitchRatingsCount,
        creatorName: creator.displayName || creator.username
      });
    }
  } catch (err) {
    console.error('❌ Error getting ratings:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Debug endpoints (remove in production)
router.get('/debug/check-live', async (req, res) => {
  try {
    console.log('🔄 Debug: Manual live status check triggered');
    const { checkAllLiveStatus } = require('../services/streamChecker');
    
    const result = await checkAllLiveStatus();
    
    res.json({ 
      success: true, 
      message: 'Live status check completed',
      timestamp: new Date().toISOString(),
      result: result
    });
  } catch (error) {
    console.error('Error in debug live status check:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message,
      stack: error.stack
    });
  }
});

router.get('/debug/check-images', async (req, res) => {
  try {
    console.log('🔄 Debug: Checking profile image status');
    const User = require('../models/User');
    
    // Find content creators with social links
    const contentCreators = await User.find({
      $or: [
        { 'socialLinks.youtube': { $exists: true, $ne: '' } },
        { 'socialLinks.twitch': { $exists: true, $ne: '' } }
      ]
    }).select('username socialLinks youtubeAvatar twitchAvatar');
    
    const results = contentCreators.map(user => ({
      username: user.username,
      socialLinks: user.socialLinks,
      youtubeAvatar: user.youtubeAvatar || 'NOT_SET',
      twitchAvatar: user.twitchAvatar || 'NOT_SET'
    }));
    
    res.json({
      success: true,
      message: `Found ${contentCreators.length} content creators`,
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug profile image check:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
});

router.post('/debug/refresh-images', async (req, res) => {
  try {
    console.log('🔄 Debug: Manual profile image refresh triggered');
    const User = require('../models/User');
    
    // Find content creators with social links
    const contentCreators = await User.find({
      $or: [
        { 'socialLinks.youtube': { $exists: true, $ne: '' } },
        { 'socialLinks.twitch': { $exists: true, $ne: '' } }
      ]
    }).limit(5); // Limit to 5 for testing
    
    console.log(`📦 Found ${contentCreators.length} content creators to refresh`);
    
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const user of contentCreators) {
      try {
        console.log(`🔄 Refreshing images for: ${user.username}`);
        const updates = await profileImageService.updateUserProfileImages(user);
        
        if (Object.keys(updates).length > 0) {
          await User.findByIdAndUpdate(user._id, updates);
          console.log(`✅ Updated profile images for ${user.username}:`, updates);
          updatedCount++;
          results.push({
            username: user.username,
            status: 'updated',
            updates: updates
          });
        } else {
          console.log(`ℹ️ No updates needed for ${user.username}`);
          results.push({
            username: user.username,
            status: 'no_updates_needed'
          });
        }
        
        // Add small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error updating profile images for ${user.username}:`, error.message);
        errorCount++;
        results.push({
          username: user.username,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Profile image refresh completed: ${updatedCount} updated, ${errorCount} errors`,
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug profile image refresh:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
});

module.exports = router;
