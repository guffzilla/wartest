const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Feedback Schema
 *
 * Represents user feedback and bug reports submitted through the website
 */
const FeedbackSchema = new Schema({
  // User who submitted the feedback (optional - can be anonymous)
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Type of feedback
  type: {
    type: String,
    required: true,
    enum: ['bug', 'feedback', 'suggestion', 'complaint', 'other']
  },

  // Subject/Title of the feedback
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },

  // Detailed description
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // Priority level (admin can set this)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Status of the feedback
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed', 'duplicate'],
    default: 'open'
  },

  // Category for better organization
  category: {
    type: String,
    enum: ['ui', 'gameplay', 'performance', 'account', 'ladder', 'chat', 'maps', 'tournaments', 'other'],
    default: 'other'
  },

  // Browser/Platform information (if provided)
  browserInfo: {
    userAgent: String,
    platform: String,
    url: String
  },

  // Contact information (if user wants to be contacted)
  contact: {
    email: String,
    discord: String,
    preferredMethod: {
      type: String,
      enum: ['email', 'discord', 'none'],
      default: 'none'
    }
  },

  // Admin response
  adminResponse: {
    message: String,
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    respondedAt: {
      type: Date,
      default: null
    }
  },

  // Internal admin notes
  adminNotes: {
    type: String,
    default: ''
  },

  // Number of similar reports (for tracking duplicates)
  similarReports: {
    type: Number,
    default: 0
  },

  // Tags for categorization
  tags: [String],

  // Votes/thumbs up from other users (if public)
  votes: {
    type: Number,
    default: 0
  },

  // Whether this feedback is publicly visible
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster lookups
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ type: 1 });
FeedbackSchema.index({ priority: 1 });
FeedbackSchema.index({ submittedBy: 1 });
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ category: 1 });

// Static method to get open feedback
FeedbackSchema.statics.getOpenFeedback = function(limit = 20) {
  return this.find({ status: { $in: ['open', 'in-progress'] } })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .populate('submittedBy', 'username displayName avatar');
};

// Static method to get feedback by user
FeedbackSchema.statics.getUserFeedback = function(userId, limit = 20) {
  return this.find({ submittedBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('adminResponse.respondedBy', 'username displayName avatar');
};

// Static method to get feedback by type
FeedbackSchema.statics.getFeedbackByType = function(type, limit = 20) {
  return this.find({ type: type })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('submittedBy', 'username displayName avatar');
};

// Static method to get bug reports
FeedbackSchema.statics.getBugReports = function(limit = 20) {
  return this.find({ type: 'bug' })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .populate('submittedBy', 'username displayName avatar');
};

// Method to increment similar reports
FeedbackSchema.methods.incrementSimilarReports = function() {
  this.similarReports += 1;
  return this.save();
};

// Method to add admin response
FeedbackSchema.methods.addAdminResponse = function(message, adminId) {
  this.adminResponse = {
    message: message,
    respondedBy: adminId,
    respondedAt: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('Feedback', FeedbackSchema); 