const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Chat Message Schema
 * Stores chat messages for the chat system
 */
const ChatMessageSchema = new Schema({
  // Message content
  text: {
    type: String,
    required: true,
    trim: true
  },
  
  // Sender information
  sender: {
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
  
  // Message type (public, private, system, room)
  type: {
    type: String,
    enum: ['public', 'private', 'system', 'room'],
    default: 'public'
  },
  
  // For private messages, the recipient
  recipient: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  },

  // For room messages, the room
  room: {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatRoom'
    },
    name: String
  },
  
  // For global messages - game type (wc1, wc2, wc3)
  gameType: {
    type: String,
    enum: ['wc1', 'wc2', 'wc3', null],
    default: null
  },
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now
  },

  // For private messages - track if message has been read
  isRead: {
    type: Boolean,
    default: false
  }
});

// Create indexes for efficient querying
ChatMessageSchema.index({ 'sender.userId': 1 });
ChatMessageSchema.index({ 'recipient.userId': 1 });
ChatMessageSchema.index({ 'room.roomId': 1 });
ChatMessageSchema.index({ type: 1 });
ChatMessageSchema.index({ gameType: 1 });
ChatMessageSchema.index({ createdAt: -1 });

// Static method to get recent public messages
ChatMessageSchema.statics.getRecentPublicMessages = async function(limit = 50, gameType = null) {
  const query = { type: 'public' };
  
  // Add gameType filter if specified
  if (gameType) {
    query.gameType = gameType;
  }
  
  const messages = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  
  // If no messages found with specific gameType, fallback to messages without gameType
  // (for backward compatibility with existing messages)
  if (gameType && messages.length === 0) {
    console.log(`🔄 No messages found for ${gameType}, falling back to general messages`);
    const fallbackQuery = { 
      type: 'public',
      $or: [
        { gameType: { $exists: false } },
        { gameType: null }
      ]
    };
    
    const fallbackMessages = await this.find(fallbackQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    console.log(`📦 Found ${fallbackMessages.length} fallback messages`);
    return fallbackMessages;
  }
  
  return messages;
};

// Static method to get private messages between users
ChatMessageSchema.statics.getPrivateMessages = async function(user1Id, user2Id, limit = 50) {
  return this.find({
    $or: [
      { 
        'sender.userId': user1Id, 
        'recipient.userId': user2Id,
        type: 'private'
      },
      { 
        'sender.userId': user2Id, 
        'recipient.userId': user1Id,
        type: 'private'
      }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .lean();
};

// Static method to get recent room messages
ChatMessageSchema.statics.getRecentRoomMessages = async function(roomId, limit = 50) {
  return this.find({ 
    'room.roomId': roomId,
    type: 'room'
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .lean();
};

// Create the model
const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

module.exports = ChatMessage;
