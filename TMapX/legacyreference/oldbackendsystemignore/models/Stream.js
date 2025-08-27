const mongoose = require('mongoose');

/**
 * Stream Schema
 * Stores data about live streams from various platforms
 * with caching and tracking mechanisms to reduce API calls
 */
const streamSchema = new mongoose.Schema({
  streamId: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['youtube', 'twitch']
  },
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  channelName: {
    type: String,
    required: true
  },
  channelIcon: {
    type: String,
    required: true
  },
  viewers: {
    type: Number,
    required: true,
    default: 0
  },
  game: {
    type: String,
    required: true,
    enum: ['wc1', 'wc2', 'wc3']
  },
  startedAt: {
    type: Date,
    required: true
  },
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now
  },
  isLive: {
    type: Boolean,
    required: true,
    default: true
  },
  cachedAt: {
    type: Date,
    default: Date.now
  },
  viewCount: {
    type: Number,
    default: 0
  },
  popularityScore: {
    type: Number,
    default: 0
  },
  tags: [String]
});

// Create compound index for efficient querying
streamSchema.index({ platform: 1, streamId: 1 }, { unique: true });
streamSchema.index({ game: 1, isLive: 1, viewers: -1 });
streamSchema.index({ lastUpdated: 1 });
streamSchema.index({ cachedAt: 1 });
streamSchema.index({ popularityScore: -1 });

/**
 * Calculate popularity score based on viewers and how recent the stream is
 * This helps prioritize both popular and fresh streams
 */
streamSchema.pre('save', function(next) {
  // Calculate time factor (1.0 for brand new, decreasing over time)
  const now = new Date();
  const streamAge = now - this.startedAt;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
  const timeFactor = Math.max(0, 1 - (streamAge / maxAge));
  
  // Calculate viewer factor (normalized viewers)
  const viewerFactor = Math.log(this.viewers + 1) / 10; // log scale to prevent extremely popular streams from dominating
  
  // Combine factors into a score
  this.popularityScore = (viewerFactor * 0.7) + (timeFactor * 0.3); // 70% viewers, 30% freshness
  
  next();
});

/**
 * Static method to get cached streams
 */
streamSchema.statics.getCachedStreams = async function(game = null, limit = 50, maxCacheAge = 10 * 60 * 1000) {
  const query = {};
  
  // Add game filter if provided
  if (game && game !== 'all') {
    query.game = game;
  }
  
  // Only get live streams
  query.isLive = true;
  
  // Check if we have recent cached data
  const cacheTime = new Date(Date.now() - maxCacheAge);
  const cachedStreams = await this.find({
    ...query,
    cachedAt: { $gt: cacheTime }
  })
  .sort({ popularityScore: -1, viewers: -1 })
  .limit(limit);
  
  // If we have cached data, return it
  if (cachedStreams.length > 0) {
    return cachedStreams;
  }
  
  // Otherwise, return the most recent data we have and mark for refresh
  return this.find(query)
    .sort({ popularityScore: -1, viewers: -1 })
    .limit(limit);
};

/**
 * Update cached timestamp for streams
 */
streamSchema.statics.updateCacheTimestamp = async function(streamIds) {
  if (!streamIds || streamIds.length === 0) return;
  
  return this.updateMany(
    { _id: { $in: streamIds } },
    { $set: { cachedAt: new Date() } }
  );
};

const Stream = mongoose.model('Stream', streamSchema);

module.exports = Stream;