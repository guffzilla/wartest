const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Chat Room Schema
 * Represents a chat room in the application
 */
const ChatRoomSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

  isPrivate: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
ChatRoomSchema.index({ name: 1 });
ChatRoomSchema.index({ createdBy: 1 });
ChatRoomSchema.index({ participants: 1 });

module.exports = mongoose.model('ChatRoom', ChatRoomSchema); 