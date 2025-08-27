const express = require('express');
const router = express.Router();
const Friend = require('../models/Friend');
const User = require('../models/User');
const OnlineUser = require('../models/OnlineUser');
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

console.log('👥 Friends routes module loaded');

/**
 * Get user's friends list
 * GET /api/friends
 */
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    console.log('👥 GET /api/friends called for user:', req.user.username);
    
    const friends = await Friend.getFriends(req.user.id);
    
    // Check which friends are currently online
    const onlineUsers = await OnlineUser.find({}).lean();
    const onlineUserIds = new Set(onlineUsers.map(u => u.userId.toString()));
    
    const friendsWithStatus = friends.map(friend => ({
      ...friend,
      isOnline: onlineUserIds.has(friend.userId.toString())
    }));
    
    res.json({
      success: true,
      data: friendsWithStatus
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching friends'
    });
  }
});

/**
 * Get pending friend requests
 * GET /api/friends/requests
 */
router.get('/requests', ensureAuthenticated, async (req, res) => {
  try {
    console.log('📨 GET /api/friends/requests called for user:', req.user.username);
    
    const pendingRequests = await Friend.getPendingRequests(req.user.id);
    
    res.json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching friend requests'
    });
  }
});

/**
 * Send friend request
 * POST /api/friends/request
 */
router.post('/request', ensureAuthenticated, async (req, res) => {
  try {
    console.log('👥 POST /api/friends/request called');
    console.log('👥 Request body:', req.body);
    console.log('👥 User making request:', req.user ? { id: req.user.id, username: req.user.username } : 'No user');
    
    const { username, userId, targetUserId } = req.body;
    let targetUser;
    
    // If userId or targetUserId is provided, find user by ID
    if (userId || targetUserId) {
      const searchUserId = userId || targetUserId;
      console.log(`🔍 Looking for target user by ID: ${searchUserId}`);
      
      targetUser = await User.findById(searchUserId);
      if (!targetUser) {
        console.log(`❌ Target user not found by ID: ${searchUserId}`);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    } 
    // Otherwise, look up by username
    else if (username) {
      console.log(`🔍 Looking for target user by username: ${username}`);
      
      targetUser = await User.findOne({
        $or: [
          { username: username },
          { displayName: username }
        ]
      });
      
      if (!targetUser) {
        console.log(`❌ Target user not found by username: ${username}`);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    } 
    else {
      console.log('❌ Missing username or userId in request');
      return res.status(400).json({
        success: false,
        message: 'Username or user ID is required'
      });
    }
    
    console.log(`✅ Found target user: ${targetUser.username} (${targetUser._id})`);
    
    if (targetUser._id.toString() === req.user.id) {
      console.log('❌ Cannot send friend request to self');
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
    }
    
    console.log(`📤 ${req.user.username} sending friend request to ${targetUser.username}`);
    
    const friendRequest = await Friend.sendFriendRequest(req.user.id, targetUser._id);
    
    // Create notification for the recipient
    try {
      await Notification.createFriendRequestNotification(
        targetUser._id,
        req.user.id,
        req.user.username || req.user.displayName,
        friendRequest._id
      );
      console.log(`📬 Friend request notification sent to ${targetUser.username}`);
    } catch (notificationError) {
      console.error('Error creating friend request notification:', notificationError);
      // Don't fail the request if notification creation fails
    }
    
    res.json({
      success: true,
      message: `Friend request sent to ${targetUser.username || targetUser.displayName}`,
      data: friendRequest
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    if (error.message === 'Already friends') {
      return res.status(400).json({
        success: false,
        message: 'You are already friends with this user'
      });
    } else if (error.message === 'Request already sent') {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent to this user'
      });
    } else if (error.message === 'Cannot send friend request') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to this user'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error sending friend request'
    });
  }
});

/**
 * Accept friend request
 * POST /api/friends/accept/:requestId
 */
router.post('/accept/:requestId', ensureAuthenticated, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    console.log(`✅ ${req.user.username} accepting friend request ${requestId}`);
    console.log('✅ Request details:', { requestId, userId: req.user.id, userObjectId: req.user._id });
    
    // Validate requestId format
    if (!requestId || !requestId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('❌ Invalid requestId format:', requestId);
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }
    
    const acceptedRequest = await Friend.acceptFriendRequest(requestId, req.user._id || req.user.id);
    
    console.log('✅ Friend request accepted successfully:', acceptedRequest);
    
    res.json({
      success: true,
      message: 'Friend request accepted',
      data: acceptedRequest
    });
  } catch (error) {
    console.error('❌ Error accepting friend request:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      requestId: req.params.requestId,
      userId: req.user ? req.user.id : 'No user'
    });
    
    if (error.message === 'Request not found') {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error accepting friend request',
      error: error.message
    });
  }
});

/**
 * Decline friend request
 * DELETE /api/friends/decline/:requestId
 */
router.delete('/decline/:requestId', ensureAuthenticated, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    console.log(`❌ ${req.user.username} declining friend request ${requestId}`);
    
    const result = await Friend.findOneAndDelete({
      _id: requestId,
      friend: req.user.id,
      status: 'pending'
    });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Friend request declined'
    });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Error declining friend request'
    });
  }
});

/**
 * Remove friend
 * DELETE /api/friends/:userId
 */
router.delete('/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🗑️ ${req.user.username} removing friend ${userId}`);
    
    const removed = await Friend.removeFriend(req.user.id, userId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Friend relationship not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing friend'
    });
  }
});

/**
 * Search users for friend requests
 * GET /api/friends/search
 */
router.get('/search', ensureAuthenticated, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    console.log(`🔍 ${req.user.username} searching for users: ${q}`);
    
    // Find users matching the query
    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ]
    })
    .select('username displayName avatar')
    .limit(10)
    .lean();
    
    // Get existing friend relationships
    const existingFriends = await Friend.find({
      $or: [
        { user: req.user.id },
        { friend: req.user.id }
      ]
    }).lean();
    
    const friendUserIds = new Set();
    existingFriends.forEach(friendship => {
      friendUserIds.add(friendship.user.toString());
      friendUserIds.add(friendship.friend.toString());
    });
    
    // Filter out existing friends and current user
    const availableUsers = users.filter(user => 
      !friendUserIds.has(user._id.toString()) && 
      user._id.toString() !== req.user.id
    );
    
    const formattedUsers = availableUsers.map(user => ({
      userId: user._id,
      username: user.username || user.displayName,
      displayName: user.displayName,
      avatar: user.avatar
    }));
    
    res.json({
      success: true,
      data: formattedUsers
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users'
    });
  }
});

module.exports = router; 