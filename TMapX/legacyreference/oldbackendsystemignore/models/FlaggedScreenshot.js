const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * FlaggedScreenshot Schema
 *
 * Represents a screenshot that has been flagged as inappropriate
 */
const FlaggedScreenshotSchema = new Schema({
  // URL of the screenshot
  url: {
    type: String,
    required: true
  },
  
  // ID of the screenshot in the Match model (if available)
  screenshotId: {
    type: Schema.Types.ObjectId
  },
  
  // User who flagged the screenshot
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
  
  // Status of the flagged screenshot
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Admin who reviewed the flagged screenshot
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Date when the screenshot was reviewed
  reviewedAt: {
    type: Date
  },
  
  // Reason for the decision
  reviewNotes: {
    type: String
  },
  
  // Date when the screenshot was flagged
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster lookups
FlaggedScreenshotSchema.index({ status: 1 });
FlaggedScreenshotSchema.index({ 'flaggedBy.userId': 1 });
FlaggedScreenshotSchema.index({ createdAt: -1 });

// Static method to get pending flagged screenshots
FlaggedScreenshotSchema.statics.getPendingFlaggedScreenshots = function() {
  return this.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .populate('flaggedBy.userId', 'username displayName avatar')
    .lean();
};

// Export model
module.exports = mongoose.model('FlaggedScreenshot', FlaggedScreenshotSchema);
