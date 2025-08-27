const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * Get all streams from content creators
 */
router.get('/', async (req, res) => {
  try {
    const { game } = req.query;

    console.log('Streams API called with game filter:', game);

    // Find all content creators
    const contentCreators = await User.find({
      $or: [
        {
          'streaming.youtubeGames': { $exists: true, $not: { $size: 0 } },
          'socialLinks.youtube': { $exists: true, $ne: '' }
        },
        {
          'streaming.twitchGames': { $exists: true, $not: { $size: 0 } },
          'socialLinks.twitch': { $exists: true, $ne: '' }
        }
      ]
    });

    console.log('Found', contentCreators.length, 'content creators');

    // Filter by game if needed
    const filteredCreators = game && game !== 'all'
      ? contentCreators.filter(user => {
          if (!user.streaming) return false;
          
          const allGames = [
            ...(user.streaming.youtubeGames || []),
            ...(user.streaming.twitchGames || [])
          ];
          
          console.log(`User ${user.username} has games:`, allGames, 'filtering for:', game);
          
          return allGames.includes(game);
        })
      : contentCreators;

    console.log('After filtering:', filteredCreators.length, 'creators');

    // Convert users to stream objects
    const streams = filteredCreators.map(user => {
      // Determine platform and URL - prefer the platform they have games for
      let platform, url;
      
      // If they have both platforms, prefer Twitch for live streaming
      if (user.streaming?.twitchGames?.length > 0 && user.socialLinks.twitch) {
        platform = 'twitch';
        url = user.socialLinks.twitch;
      } else if (user.streaming?.youtubeGames?.length > 0 && user.socialLinks.youtube) {
        platform = 'youtube';
        url = user.socialLinks.youtube;
      }

      let channelName = url;
      if (platform === 'twitch' && url.includes('twitch.tv/')) {
        channelName = url.split('twitch.tv/').pop().split('/')[0];
      } else if (platform === 'youtube' && url.includes('youtube.com/@')) {
        channelName = url.split('@').pop().split('/')[0];
      }

      // Get the first game from the appropriate platform, or all games
      const allGames = [
        ...(user.streaming.youtubeGames || []),
        ...(user.streaming.twitchGames || [])
      ];
      const primaryGame = allGames[0] || 'wc3';

      return {
        id: user._id,
        title: user.streaming.description || `${user.displayName || user.username}'s ${getGameName(primaryGame)} Stream`,
        url: url,
        platform: platform,
        thumbnail: user.avatar || '/assets/img/ranks/emblem.png',
        channelName: user.displayName || user.username || channelName,
        channelIcon: user.avatar || '/assets/img/ranks/emblem.png',
        viewers: 0, // We don't track viewer count
        game: primaryGame,
        startedAt: user.streaming.lastChecked || new Date(),
        isLive: user.streaming?.isLive || false,
        description: platform === 'twitch' ? user.streaming?.twitchDescription : user.streaming?.youtubeDescription
      };
    });

    // Sort streams: live ones first, then by platform (Twitch before YouTube)
    streams.sort((a, b) => {
      if (a.isLive !== b.isLive) return b.isLive ? 1 : -1;
      if (a.platform !== b.platform) return a.platform === 'twitch' ? -1 : 1;
      return 0;
    });

    console.log('Returning', streams.length, 'streams');
    res.json(streams);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get streams for a specific game
 */
router.get('/:game', async (req, res) => {
  try {
    const { game } = req.params;

    // Find users who are content creators and are currently live
    const liveCreators = await User.find({
      'streaming.isLive': true,
      $or: [
        {
          'streaming.youtubeGames': game === 'wc12' ? 'wc12' : game === 'wc3' ? 'wc3' : { $in: ['wc12', 'wc3'] }
        },
        {
          'streaming.twitchGames': game === 'wc12' ? 'wc12' : game === 'wc3' ? 'wc3' : { $in: ['wc12', 'wc3'] }
        }
      ]
    });

    // Convert users to stream objects
    const streams = liveCreators.map(user => {
      const platform = user.socialLinks.twitch ? 'twitch' : 'youtube';
      const url = user.socialLinks[platform];
      let channelName = url;
      
      if (platform === 'twitch' && url.includes('twitch.tv/')) {
        channelName = url.split('twitch.tv/').pop().split('/')[0];
      } else if (platform === 'youtube' && url.includes('youtube.com/@')) {
        channelName = url.split('@').pop().split('/')[0];
      }

      // Get the first game from the appropriate platform
      const allGames = [
        ...(user.streaming.youtubeGames || []),
        ...(user.streaming.twitchGames || [])
      ];
      const primaryGame = allGames[0] || 'wc3';

      return {
        id: user._id,
        title: user.streaming.description || `${user.displayName || user.username}'s ${getGameName(primaryGame)} Stream`,
        url: url,
        platform: platform,
        thumbnail: user.avatar || '/assets/img/ranks/emblem.png',
        channelName: user.displayName || user.username || channelName,
        channelIcon: user.avatar || '/assets/img/ranks/emblem.png',
        viewers: 0, // We don't track viewer count
        game: primaryGame,
        startedAt: user.streaming.lastChecked || new Date(),
        isLive: true
      };
    });

    res.json(streams);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Helper function to convert game code to display name
 */
function getGameName(game) {
  switch (game) {
    case 'wc12': return 'Warcraft 1/2';
    case 'wc3': return 'Warcraft 3';
    case 'warcraft1': return 'Warcraft 1';
    case 'warcraft2': return 'Warcraft 2';
    case 'warcraft3': return 'Warcraft 3';
    case 'warcraft12': return 'Warcraft 1/2';
    default: return 'Warcraft';
  }
}

module.exports = router; 