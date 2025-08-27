const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Online User Schema
 * Tracks users who are currently online in the chat system
 */
const OnlineUserSchema = new Schema({
  // User information
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  username: {
    type: String,
    required: true
  },
  
  displayName: String,
  
  avatar: { 
    type: String, 
    default: '/assets/img/ranks/emblem.png' 
  },
  
  // Socket ID for the user's connection
  socketId: {
    type: String,
    required: true
  },
  
  // Status (online, away, busy)
  status: {
    type: String,
    enum: ['online', 'away', 'busy'],
    default: 'online'
  },
  
  // Last activity timestamp
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for efficient querying
OnlineUserSchema.index({ userId: 1 });
OnlineUserSchema.index({ socketId: 1 });
OnlineUserSchema.index({ lastActivity: -1 });

// Static method to get all online users
OnlineUserSchema.statics.getAllOnlineUsers = async function() {
  return this.find()
    .sort({ username: 1 })
    .lean();
};

// Static method to update user status
OnlineUserSchema.statics.updateUserStatus = async function(userId, status) {
  return this.findOneAndUpdate(
    { userId },
    { 
      status,
      lastActivity: Date.now()
    },
    { new: true }
  );
};

// Static method to remove inactive users
OnlineUserSchema.statics.removeInactiveUsers = async function(timeThreshold) {
  const cutoffTime = new Date(Date.now() - timeThreshold);
  return this.deleteMany({ lastActivity: { $lt: cutoffTime } });
};

// Create the model
const OnlineUser = mongoose.model('OnlineUser', OnlineUserSchema);

module.exports = OnlineUser;
