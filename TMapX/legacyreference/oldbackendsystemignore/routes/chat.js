const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const User = require('../models/User');
const OnlineUser = require('../models/OnlineUser');
const mongoose = require('mongoose');

console.log('🔧 Chat routes module loaded');

/**
 * Test route to verify chat routes are working
 * GET /api/chat/test
 */
router.get('/test', (req, res) => {
  console.log('🧪 Chat test route hit');
  res.json({ success: true, message: 'Chat routes are working!', timestamp: new Date().toISOString() });
});

/**
 * Get recent global chat messages
 * GET /api/chat/recent
 */
router.get('/recent', ensureAuthenticated, async (req, res) => {
  try {
    console.log('📨 GET /api/chat/recent called');
    const limit = parseInt(req.query.limit) || 50;
    const gameType = req.query.game; // Get game filter from query params
    
    console.log(`🎮 Fetching recent messages for game: ${gameType || 'all'}`);
    
    const messages = await ChatMessage.getRecentPublicMessages(limit, gameType);
    res.json({ 
      success: true, 
      data: messages.reverse() // Reverse to show oldest first
    });
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching recent messages' 
    });
  }
});

/**
 * Get group chats (placeholder for future implementation)
 * GET /api/chat/groups
 */
router.get('/groups', ensureAuthenticated, async (req, res) => {
  try {
    console.log('👥 GET /api/chat/groups called');
    // For now, return empty array as group chats are not implemented yet
    // This can be expanded later to support group chat functionality
    res.json({ 
      success: true, 
      data: [] 
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching groups' 
    });
  }
});

/**
 * Get online users for chat
 */
router.get('/online-users', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Auth state:', {
      url: req.originalUrl,
      isPassportAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      hasUser: req.user ? { id: req.user.id, username: req.user.username } : null,
      sessionAuth: req.sessionAuth || null
    });

    const onlineUsers = await OnlineUser.find({})
      .populate('userId', 'username displayName avatar role')
      .lean();

    const formattedUsers = onlineUsers.map(user => ({
      userId: user.userId._id,
      username: user.userId.username || user.userId.displayName,
      displayName: user.userId.displayName,
      avatar: user.userId.avatar,
      role: user.userId.role,
      status: user.status || 'online',
      lastSeen: user.lastSeen
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ message: 'Error fetching online users' });
  }
});

/**
 * Get private conversations for the authenticated user
 */
router.get('/private/conversations', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all private messages where user is sender or recipient
    const messages = await ChatMessage.aggregate([
      {
        $match: {
          type: 'private',
          $or: [
            { 'sender.userId': userId },
            { 'recipient.userId': userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender.userId', userId] },
              '$recipient.userId',
              '$sender.userId'
            ]
          },
          lastMessage: { $first: '$text' },
          lastMessageTime: { $first: '$createdAt' },
          username: {
            $first: {
              $cond: [
                { $eq: ['$sender.userId', userId] },
                '$recipient.username',
                '$sender.username'
              ]
            }
          }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    // Get unread counts for each conversation
    const conversations = await Promise.all(messages.map(async (conv) => {
      const unreadCount = await ChatMessage.countDocuments({
        type: 'private',
        'sender.userId': conv._id,
        'recipient.userId': userId,
        isRead: { $ne: true }
      });

      // Check if user is online
      const onlineUser = await OnlineUser.findOne({ userId: conv._id });
      
      return {
        userId: conv._id,
        username: conv.username,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount,
        isOnline: !!onlineUser
      };
    }));

    res.json({ 
      success: true, 
      data: conversations 
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching conversations' 
    });
  }
});

/**
 * Get private conversation with a specific user
 * GET /api/chat/private/conversation/:userId
 */
router.get('/private/conversation/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    
    console.log('🔄 Private conversation request:', { currentUserId, otherUserId });

    // Validate that otherUserId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      console.log('❌ Invalid user ID format:', otherUserId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format' 
      });
    }

    console.log('🔄 Fetching private messages...');
    const messages = await ChatMessage.getPrivateMessages(currentUserId, otherUserId, 50);
    console.log(`✅ Found ${messages ? messages.length : 0} messages`);
    
    res.json({ 
      success: true, 
      data: messages.reverse() // Reverse to show oldest first
    });
  } catch (error) {
    console.error('❌ Error fetching private conversation:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request params:', req.params);
    console.error('❌ User:', req.user ? { id: req.user.id, username: req.user.username } : 'No user');
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching private conversation',
      error: error.message 
    });
  }
});

/**
 * Get private messages with a specific user
 */
router.get('/private/messages/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await ChatMessage.getPrivateMessages(currentUserId, otherUserId, 50);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching private messages:', error);
    res.status(500).json({ message: 'Error fetching private messages' });
  }
});

/**
 * Mark private messages as read
 */
router.post('/private/mark-read', ensureAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.body;

    // Mark all unread messages from the specified user as read
    await ChatMessage.updateMany(
      {
        type: 'private',
        'sender.userId': userId,
        'recipient.userId': currentUserId,
        isRead: { $ne: true }
      },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error marking messages as read' });
  }
});

/**
 * Get unread private message count
 */
router.get('/private/unread-count', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const count = await ChatMessage.countDocuments({
      type: 'private',
      'recipient.userId': userId,
      isRead: { $ne: true }
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

/**
 * Send a private message (HTTP endpoint, socket.io is preferred)
 */
router.post('/private/send', ensureAuthenticated, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipientId, text } = req.body;

    if (!recipientId || !text || !text.trim()) {
      return res.status(400).json({ message: 'Recipient and message text are required' });
    }

    // Get recipient info
    const recipient = await User.findById(recipientId, 'username displayName');
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Create the message
    const message = new ChatMessage({
      text: text.trim(),
      sender: {
        userId: senderId,
        username: req.user.username || req.user.displayName
      },
      recipient: {
        userId: recipientId,
        username: recipient.username || recipient.displayName
      },
      type: 'private'
    });

    await message.save();

    // Create notification for recipient
    await Notification.createMessageNotification(
      recipientId,
      senderId,
      req.user.username || req.user.displayName
    );

    res.json({ message: 'Message sent successfully', data: message });
  } catch (error) {
    console.error('Error sending private message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

/**
 * Search users for starting new conversations
 */
router.get('/users/search', ensureAuthenticated, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ]
    })
    .select('username displayName avatar')
    .limit(10)
    .lean();

    const formattedUsers = users.map(user => ({
      userId: user._id,
      username: user.username || user.displayName,
      displayName: user.displayName,
      avatar: user.avatar
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

module.exports = router; 