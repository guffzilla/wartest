const User = require('../models/User');
const axios = require('axios');
const { google } = require('googleapis');
const mongoose = require('mongoose');

// Store Twitch access token in memory
let twitchAccessToken = null;
let twitchTokenExpiry = null;

// YouTube quota management
let youtubeQuotaUsed = 0;
let youtubeQuotaResetTime = null;
const YOUTUBE_DAILY_QUOTA = 10000;
const YOUTUBE_SEARCH_COST = 100;
const YOUTUBE_CHANNELS_COST = 1;

// Cache channel IDs to avoid repeated searches
const channelIdCache = new Map();

/**
 * Get Twitch access token using client credentials flow
 */
async function getTwitchAccessToken() {
  // If we have a direct access token in environment, try to validate it first
  if (process.env.TWITCH_ACCESS_TOKEN) {
    try {
      // Validate the stored token
      await axios.get('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`
        }
      });
      // If validation succeeds, use the stored token
      return process.env.TWITCH_ACCESS_TOKEN;
    } catch (error) {
      console.warn('🔑 Stored Twitch access token is invalid, generating new one...');
      // Fall through to generate a new token
    }
  }

  // Use cached token if available and not expired
  if (twitchAccessToken && twitchTokenExpiry && Date.now() < twitchTokenExpiry) {
    return twitchAccessToken;
  }

  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    twitchAccessToken = response.data.access_token;
    twitchTokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Subtract 1 minute for safety
    
    console.log('✅ Generated fresh Twitch access token');
    return twitchAccessToken;
  } catch (error) {
    console.error('Error getting Twitch access token:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Extract username from Twitch URL
 */
function getTwitchUsername(url) {
  if (!url) return null;
  
  // Handle full URLs
  if (url.includes('twitch.tv/')) {
    return url.split('twitch.tv/').pop().split('/')[0];
  }
  
  // Handle plain usernames (stored directly in database)
  if (!url.includes('http') && !url.includes('/')) {
    return url;
  }
  
  return null;
}

/**
 * Get YouTube username/handle from URL
 */
function getYoutubeUsername(url) {
  if (!url) return null;
  
  // Handle @username format
  if (url.includes('youtube.com/@')) {
    return url.split('@').pop().split('/')[0];
  }
  
  // Handle channel ID format (UCxxxxxxxxxxxxxxxxxxxx)
  if (url.includes('/channel/')) {
    return url.split('/channel/').pop().split('/')[0];
  }
  
  // Handle /c/ format
  if (url.includes('/c/')) {
    return url.split('/c/').pop().split('/')[0];
  }
  
  // Handle /user/ format  
  if (url.includes('/user/')) {
    return url.split('/user/').pop().split('/')[0];
  }
  
  // Handle plain usernames (stored directly in database)
  if (!url.includes('http') && !url.includes('/')) {
    return url;
  }
  
  return null;
}

/**
 * Check if YouTube quota is available for the operation
 */
function checkYouTubeQuota(cost) {
  // Reset quota if it's a new day (quota resets at midnight PST)
  const now = new Date();
  const pstTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
  const today = pstTime.toDateString();
  
  if (!youtubeQuotaResetTime || youtubeQuotaResetTime !== today) {
    youtubeQuotaUsed = 0;
    youtubeQuotaResetTime = today;
    console.log('🔄 YouTube quota reset for new day');
  }
  
  const remainingQuota = YOUTUBE_DAILY_QUOTA - youtubeQuotaUsed;
  const canProceed = remainingQuota >= cost;
  
  if (!canProceed) {
    console.warn(`⚠️ YouTube quota insufficient. Used: ${youtubeQuotaUsed}/${YOUTUBE_DAILY_QUOTA}, Needed: ${cost}`);
  }
  
  return {
    canProceed,
    remaining: remainingQuota,
    used: youtubeQuotaUsed,
    total: YOUTUBE_DAILY_QUOTA
  };
}

/**
 * Record YouTube quota usage
 */
function recordYouTubeQuotaUsage(cost) {
  youtubeQuotaUsed += cost;
  const remaining = YOUTUBE_DAILY_QUOTA - youtubeQuotaUsed;
  console.log(`📊 YouTube quota used: ${cost} units. Total: ${youtubeQuotaUsed}/${YOUTUBE_DAILY_QUOTA} (${remaining} remaining)`);
}

/**
 * Check if required API credentials are available
 */
function checkAPICredentials() {
  const twitchCredentials = {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    accessToken: process.env.TWITCH_ACCESS_TOKEN
  };
  
  const youtubeCredentials = {
    apiKey: process.env.YOUTUBE_API_KEY
  };
  
  // Twitch is configured if we have either:
  // 1. Client ID + Client Secret (for OAuth flow), OR  
  // 2. Client ID + Access Token (for direct API access)
  const twitchConfigured = !!(
    twitchCredentials.clientId && (
      twitchCredentials.clientSecret || twitchCredentials.accessToken
    )
  );
  
  return {
    twitch: twitchConfigured,
    youtube: !!youtubeCredentials.apiKey,
    twitchCredentials,
    youtubeCredentials
  };
}

/**
 * Check if a Twitch channel is live
 */
async function checkTwitchLive(username) {
  try {
    console.log('Checking Twitch live status for:', username);
    
    const credentials = checkAPICredentials();
    if (!credentials.twitch) {
      console.warn('⚠️ Twitch API credentials not configured.');
      console.warn('💡 You need either:');
      console.warn('   Option 1: TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET (for OAuth)');
      console.warn('   Option 2: TWITCH_CLIENT_ID + TWITCH_ACCESS_TOKEN (for direct API access)');
      console.warn('Current credentials:', {
        TWITCH_CLIENT_ID: credentials.twitchCredentials.clientId ? 'SET' : 'MISSING',
        TWITCH_CLIENT_SECRET: credentials.twitchCredentials.clientSecret ? 'SET' : 'MISSING',
        TWITCH_ACCESS_TOKEN: credentials.twitchCredentials.accessToken ? 'SET' : 'MISSING'
      });
      return false; // Return false instead of throwing error
    }
    
    const accessToken = await getTwitchAccessToken();
    
    const response = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${username}`, {
      headers: {
        'Client-ID': credentials.twitchCredentials.clientId,
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 10000 // 10 second timeout
    });
    
    const isLive = response.data.data.length > 0;
    console.log(`✅ Twitch live status for ${username}:`, isLive);
    return isLive;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error(`🔑 Twitch API authentication failed for ${username}. Clearing cached token and retrying...`);
      // Clear cached token
      twitchAccessToken = null;
      twitchTokenExpiry = null;
    } else if (error.response?.status === 400) {
      console.error(`❌ Twitch API bad request for ${username}. Check username format.`);
    } else {
      console.error(`⚠️ Error checking Twitch live status for ${username}:`, error.message);
    }
    return false; // Return false instead of throwing
  }
}

/**
 * Check if a YouTube channel is live (with quota management)
 */
async function checkYoutubeLive(username) {
  try {
    // Check quota before making API calls (search + live check = 200 units max, but we'll try to use cache first)
    const quotaCheck = checkYouTubeQuota(100); // Start with just search cost
    if (!quotaCheck.canProceed) {
      console.warn(`⚠️ Skipping YouTube check for ${username} - insufficient quota (${quotaCheck.remaining} remaining)`);
      return false; // Return last known status or false
    }

    const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });
    
    // First, try to resolve username to channel ID if it's not already a channel ID
    let channelId = username;
    
    // If it's not a channel ID format (UCxxxxxx), check cache first
    if (!username.startsWith('UC') || username.length !== 24) {
      // Check cache first
      if (channelIdCache.has(username)) {
        channelId = channelIdCache.get(username);
        console.log(`📂 Using cached channel ID for ${username}: ${channelId}`);
      } else {
        console.log(`Searching for YouTube channel: ${username}`);
        
        try {
          const searchResponse = await youtube.search.list({
            part: 'snippet',
            q: username,
            type: 'channel',
            maxResults: 1
          });
          
          recordYouTubeQuotaUsage(YOUTUBE_SEARCH_COST); // Record search cost
          
          if (searchResponse.data.items && searchResponse.data.items.length > 0) {
            channelId = searchResponse.data.items[0].snippet.channelId;
            channelIdCache.set(username, channelId); // Cache the result
            console.log(`Found and cached channel ID for ${username}: ${channelId}`);
          } else {
            console.log(`No YouTube channel found for: ${username}`);
            return false; // Channel not found, not an error
          }
        } catch (searchError) {
          recordYouTubeQuotaUsage(YOUTUBE_SEARCH_COST); // Record even failed attempts
          
          if (searchError.response?.status === 403) {
            console.warn(`YouTube quota exceeded during search for ${username}`);
            return false;
          }
          
          console.log(`Failed to search for YouTube channel ${username}:`, searchError.message);
          return false; // Search failed, assume not live
        }
      }
    }
    
    // Now check for live streams using the channel ID
    try {
      const response = await youtube.search.list({
        part: 'snippet',
        channelId: channelId,
        eventType: 'live',
        type: 'video',
        maxResults: 1
      });
      
      recordYouTubeQuotaUsage(YOUTUBE_SEARCH_COST); // Record live search cost
      
      const isLive = response.data.items && response.data.items.length > 0;
      console.log(`✅ YouTube live status for ${username}:`, isLive);
      return isLive;
      
    } catch (liveError) {
      recordYouTubeQuotaUsage(YOUTUBE_SEARCH_COST); // Record even failed attempts
      
      if (liveError.response?.status === 403) {
        console.warn(`YouTube quota exceeded during live check for ${username}`);
        return false;
      }
      
      throw liveError;
    }
    
  } catch (error) {
    // More specific error handling
    if (error.code === 400) {
      console.log(`YouTube API 400 error for ${username} - likely invalid channel identifier:`, error.message);
    } else if (error.response?.status === 403) {
      console.warn(`YouTube quota exceeded for ${username}`);
    } else {
      console.error(`Error checking YouTube live status for ${username}:`, error.message);
    }
    return false; // Return false instead of throwing to prevent breaking the entire check
  }
}

/**
 * Check live status for all content creators
 */
async function checkAllLiveStatus() {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ MongoDB not connected. Current state:', mongoose.connection.readyState);
      console.warn('States: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting');
      return;
    }

    // Check API credentials at startup
    const credentials = checkAPICredentials();
    console.log('🔑 API Credentials Status:', {
      Twitch: credentials.twitch ? '✅ Configured' : '❌ Missing',
      YouTube: credentials.youtube ? '✅ Configured' : '❌ Missing'
    });
    
    if (!credentials.twitch && !credentials.youtube) {
      console.warn('⚠️ No API credentials configured. Live status checking will be disabled.');
      console.warn('💡 To enable live status checking, add these to your .env file:');
      console.warn('   TWITCH_CLIENT_ID=your_twitch_client_id');
      console.warn('   TWITCH_CLIENT_SECRET=your_twitch_client_secret');
      console.warn('   YOUTUBE_API_KEY=your_youtube_api_key');
      return;
    }

    console.log('🔍 Searching for content creators...');

    // Get all content creators with extended timeout
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
    }).maxTimeMS(30000); // 30 second timeout for this query

    console.log(`📦 Found ${contentCreators.length} content creators to check`);

    if (contentCreators.length === 0) {
      console.log('ℹ️ No content creators found to check live status');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const creator of contentCreators) {
      try {
        let twitchIsLive = false;
        let youtubeIsLive = false;

        // Check Twitch if available and has games configured and credentials are available
        if (credentials.twitch && creator.streaming?.twitchGames?.length > 0 && creator.socialLinks.twitch) {
          const twitchUsername = getTwitchUsername(creator.socialLinks.twitch);
          if (twitchUsername) {
            console.log(`🔴 Checking Twitch: ${twitchUsername}`);
            twitchIsLive = await checkTwitchLive(twitchUsername);
          }
        }

        // Check YouTube if has games configured and credentials are available
        if (credentials.youtube && creator.streaming?.youtubeGames?.length > 0 && creator.socialLinks.youtube) {
          const youtubeUsername = getYoutubeUsername(creator.socialLinks.youtube);
          if (youtubeUsername) {
            console.log(`🔴 Checking YouTube: ${youtubeUsername}`);
            youtubeIsLive = await checkYoutubeLive(youtubeUsername);
          }
        }

        // Update user's platform-specific live status only if changed
        const needsUpdate = 
          creator.streaming?.twitchIsLive !== twitchIsLive || 
          creator.streaming?.youtubeIsLive !== youtubeIsLive;
          
        if (needsUpdate) {
          console.log(`🔄 Updating ${creator.username || creator.displayName}: Twitch=${twitchIsLive}, YouTube=${youtubeIsLive}`);
          
          // Use findByIdAndUpdate for atomic operation with timeout
          await User.findByIdAndUpdate(
            creator._id,
            {
              'streaming.twitchIsLive': twitchIsLive,
              'streaming.youtubeIsLive': youtubeIsLive,
              'streaming.lastChecked': new Date()
            },
            { 
              new: true,
              maxTimeMS: 10000 // 10 second timeout for individual updates
            }
          );
          
          updatedCount++;
        } else {
          // Just update lastChecked timestamp
          await User.findByIdAndUpdate(
            creator._id,
            { 'streaming.lastChecked': new Date() },
            { maxTimeMS: 5000 }
          );
        }

        // Add small delay to avoid overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        console.error(`❌ Error checking ${creator.username || creator.displayName}:`, error.message);
        
        // Continue with other creators even if one fails
        continue;
      }
    }

    console.log(`✅ Live status check completed: ${updatedCount} updated, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Critical error in checkAllLiveStatus:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    
    // If it's a connection error, log helpful info
    if (error.name === 'MongooseError' || error.message.includes('buffering timed out')) {
      console.error('💡 This appears to be a MongoDB connection issue.');
      console.error('   Current connection state:', mongoose.connection.readyState);
      console.error('   Make sure MongoDB is running and accessible.');
    }
  }
}

module.exports = {
  checkAllLiveStatus,
  checkTwitchLive,
  checkYoutubeLive,
  checkAPICredentials
}; 