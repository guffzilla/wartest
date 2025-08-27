const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * FlaggedForumContent Schema
 *
 * Represents forum content (topic or post) that has been flagged as inappropriate
 */
const FlaggedForumContentSchema = new Schema({
  // Content type (topic or post)
  contentType: {
    type: String,
    enum: ['topic', 'post'],
    required: true
  },
  
  // ID of the content (topic or post)
  contentId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  
  // Topic ID (for easier querying)
  topicId: {
    type: Schema.Types.ObjectId,
    ref: 'ForumTopic'
  },
  

  
  // Content title or excerpt
  contentPreview: {
    type: String,
    required: true
  },
  
  // User who flagged the content
  flaggedBy: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    }
  },
  
  // Reason for flagging
  reason: {
    type: String,
    required: true
  },
  
  // Status of the flagged content
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Admin/moderator who reviewed the flagged content
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Date when the content was reviewed
  reviewedAt: {
    type: Date
  },
  
  // Reason for the decision
  reviewNotes: {
    type: String
  },
  
  // Date when the content was flagged
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for faster lookups
FlaggedForumContentSchema.index({ status: 1 });
FlaggedForumContentSchema.index({ contentType: 1, contentId: 1 });
FlaggedForumContentSchema.index({ 'flaggedBy.userId': 1 });
FlaggedForumContentSchema.index({ createdAt: -1 });

// Static method to get pending flagged content
FlaggedForumContentSchema.statics.getPendingFlaggedContent = function() {
  return this.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .populate('flaggedBy.userId', 'username displayName avatar')
    .populate('topicId', 'title')

    .lean();
};

module.exports = mongoose.model('FlaggedForumContent', FlaggedForumContentSchema);
