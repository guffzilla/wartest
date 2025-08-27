const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Forum Post Schema
 * Represents a post (reply) in a forum topic
 */
const ForumPostSchema = new Schema({
  // Topic this post belongs to
  topic: {
    type: Schema.Types.ObjectId,
    ref: 'ForumTopic',
    required: true
  },



  // User who created this post
  author: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: String
  },

  // Post content
  content: {
    type: String,
    required: true
  },

  // Is this post edited?
  isEdited: {
    type: Boolean,
    default: false
  },

  // Last edit timestamp
  editedAt: {
    type: Date
  },

  // Like/dislike tracking
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Creation date
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for faster lookups
ForumPostSchema.index({ topic: 1 });
ForumPostSchema.index({ 'author.userId': 1 });
ForumPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ForumPost', ForumPostSchema);
