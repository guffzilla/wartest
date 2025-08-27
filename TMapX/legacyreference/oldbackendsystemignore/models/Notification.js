const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Notification Schema
 * Stores notifications for users
 */
const NotificationSchema = new Schema({
  // User who should receive this notification
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Notification type
  type: {
    type: String,
    required: true,
    enum: [
      'message',           // Private message notification
      'system',           // System notification
      'match',            // Match-related notification
      'dispute',          // New dispute notification
      'dispute_resolved', // Dispute resolved notification
      'dispute_rejected', // Dispute rejected notification
      'achievement',      // Achievement unlocked notification
      'campaign',         // Campaign completion notification
      'friend_request',   // Friend request notification
      'chat_request'      // Chat request notification
    ]
  },

  // Notification content
  content: {
    type: String,
    required: true
  },

  // Link to follow when clicking the notification
  link: {
    type: String,
    default: null
  },

  // Additional data (depends on notification type)
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // Has this notification been read?
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  // Creation date
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Create indexes for faster lookups
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

// Static method to get unread notifications for a user
NotificationSchema.statics.getUnreadNotifications = async function(userId) {
  return this.find({ userId, isRead: false })
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to get all notifications for a user
NotificationSchema.statics.getUserNotifications = async function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to mark a notification as read
NotificationSchema.statics.markAsRead = async function(notificationId) {
  return this.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
};

// Static method to mark all notifications as read for a user
NotificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany({ userId, isRead: false }, { isRead: true });
};

// Static method to create a new message notification
NotificationSchema.statics.createMessageNotification = async function(userId, senderId, senderName) {
  return this.create({
    userId,
    type: 'message',
    content: `New message from ${senderName}`,
    data: {
      senderId,
      senderName
    }
  });
};

// Static method to create a match notification
NotificationSchema.statics.createMatchNotification = async function(userId, matchId, matchType) {
  return this.create({
    userId,
    type: 'match',
    content: `New ${matchType} match available`,
    data: {
      matchId,
      matchType
    }
  });
};

// Static method to create a dispute notification
NotificationSchema.statics.createDisputeNotification = async function(userId, disputeId, disputeType) {
  return this.create({
    userId,
    type: 'dispute',
    content: `New ${disputeType} dispute`,
    data: {
      disputeId,
      disputeType
    }
  });
};

// Static method to create a system notification
NotificationSchema.statics.createSystemNotification = async function(userId, content, link = null) {
  return this.create({
    userId,
    type: 'system',
    content,
    link
  });
};

// Static method to create a friend request notification
NotificationSchema.statics.createFriendRequestNotification = async function(userId, fromUserId, fromUsername, requestId) {
  return this.create({
    userId,
    type: 'friend_request',
    content: `${fromUsername} wants to be your friend`,
    data: {
      fromUserId,
      fromUsername,
      requestId,
      actions: [
        { label: 'Accept', action: 'accept_friend_request', style: 'success' },
        { label: 'Decline', action: 'decline_friend_request', style: 'danger' }
      ]
    }
  });
};

// Static method to create a chat request notification
NotificationSchema.statics.createChatRequestNotification = async function(userId, fromUserId, fromUsername, chatRoomId) {
  return this.create({
    userId,
    type: 'chat_request',
    content: `${fromUsername} wants to chat with you`,
    data: {
      fromUserId,
      fromUsername,
      chatRoomId,
      actions: [
        { label: 'Join Chat', action: 'join_private_chat', style: 'primary' }
      ]
    }
  });
};

// Create the model
const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
