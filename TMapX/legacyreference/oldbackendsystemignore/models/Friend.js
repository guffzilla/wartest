const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  friend: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  }
});

// Compound index to ensure unique relationships
friendSchema.index({ user: 1, friend: 1 }, { unique: true });

// Index for queries
friendSchema.index({ user: 1, status: 1 });
friendSchema.index({ friend: 1, status: 1 });

friendSchema.statics.getFriends = async function(userId) {
  try {
    const friends = await this.find({
      $or: [
        { user: userId, status: 'accepted' },
        { friend: userId, status: 'accepted' }
      ]
    })
    .populate('user', 'username displayName avatar lastLogin')
    .populate('friend', 'username displayName avatar lastLogin')
    .lean();

    // Return the friend user data (not the current user), filtering out deleted users
    return friends
      .map(relationship => {
        const friendUser = relationship.user._id.toString() === userId.toString()
          ? relationship.friend
          : relationship.user;

        // Skip if friend user was deleted (populate returned null)
        if (!friendUser || !friendUser._id) {
          console.log('⚠️ Skipping deleted friend user in relationship:', relationship._id);
          return null;
        }

        return {
          userId: friendUser._id,
          username: friendUser.username || friendUser.displayName || '[Deleted User]',
          displayName: friendUser.displayName || '[Deleted User]',
          avatar: friendUser.avatar,
          lastLogin: friendUser.lastLogin,
          friendshipDate: relationship.acceptedAt || relationship.createdAt
        };
      })
      .filter(friend => friend !== null); // Remove null entries (deleted users)
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
};

friendSchema.statics.getPendingRequests = async function(userId) {
  try {
    const requests = await this.find({
      friend: userId,
      status: 'pending'
    })
    .populate('user', 'username displayName avatar')
    .populate('requestedBy', 'username displayName avatar')
    .lean();

    return requests
      .map(request => {
        // Skip if requesting user was deleted
        if (!request.user || !request.user._id || !request.requestedBy || !request.requestedBy._id) {
          console.log('⚠️ Skipping friend request from deleted user:', request._id);
          return null;
        }

        return {
          requestId: request._id,
          user: {
            userId: request.user._id,
            username: request.user.username || request.user.displayName || '[Deleted User]',
            displayName: request.user.displayName || '[Deleted User]',
            avatar: request.user.avatar
          },
          requestedBy: {
            userId: request.requestedBy._id,
            username: request.requestedBy.username || request.requestedBy.displayName || '[Deleted User]',
            displayName: request.requestedBy.displayName || '[Deleted User]',
            avatar: request.requestedBy.avatar
          },
          createdAt: request.createdAt
        };
      })
      .filter(request => request !== null); // Remove null entries (deleted users)
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return [];
  }
};

friendSchema.statics.sendFriendRequest = async function(fromUserId, toUserId) {
  try {
    // Check if relationship already exists
    const existing = await this.findOne({
      $or: [
        { user: fromUserId, friend: toUserId },
        { user: toUserId, friend: fromUserId }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('Already friends');
      } else if (existing.status === 'pending') {
        throw new Error('Request already sent');
      } else if (existing.status === 'blocked') {
        throw new Error('Cannot send friend request');
      }
    }

    // Create new friend request
    const friendRequest = new this({
      user: fromUserId,
      friend: toUserId,
      requestedBy: fromUserId,
      status: 'pending'
    });

    await friendRequest.save();
    return friendRequest;
  } catch (error) {
    throw error;
  }
};

friendSchema.statics.acceptFriendRequest = async function(requestId, userId) {
  try {
    console.log('🔍 acceptFriendRequest called with:', { requestId, userId });
    
    // Convert to ObjectId if needed
    const mongoose = require('mongoose');
    const requestObjectId = mongoose.Types.ObjectId.isValid(requestId) ? requestId : null;
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    
    if (!requestObjectId) {
      console.error('❌ Invalid requestId:', requestId);
      throw new Error('Invalid request ID');
    }
    
    if (!userObjectId) {
      console.error('❌ Invalid userId:', userId);
      throw new Error('Invalid user ID');
    }
    
    console.log('🔍 Looking for friend request:', { 
      _id: requestObjectId, 
      friend: userObjectId, 
      status: 'pending' 
    });
    
    const request = await this.findOne({
      _id: requestObjectId,
      friend: userObjectId,
      status: 'pending'
    });

    console.log('🔍 Found request:', request);

    if (!request) {
      throw new Error('Request not found');
    }

    request.status = 'accepted';
    request.acceptedAt = new Date();
    await request.save();

    console.log('✅ Request accepted and saved:', request);
    return request;
  } catch (error) {
    console.error('❌ Error in acceptFriendRequest:', error);
    throw error;
  }
};

friendSchema.statics.removeFriend = async function(userId, friendUserId) {
  try {
    const result = await this.deleteOne({
      $or: [
        { user: userId, friend: friendUserId },
        { user: friendUserId, friend: userId }
      ]
    });

    return result.deletedCount > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Friend', friendSchema); 