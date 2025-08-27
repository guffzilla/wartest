const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const { ensureAuthenticated } = require('../middleware/auth');

/**
 * Create a new chat room
 * POST /api/chat-rooms
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { name, isPrivate } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Chat room name is required' });
    }

    // Check if user already has a custom chat room
    const existingRoom = await ChatRoom.findOne({
      createdBy: req.user._id,
      name: { $ne: 'Main Chat' } // Exclude the main chat room
    });

    if (existingRoom) {
      return res.status(400).json({ 
        error: 'You can only create one custom chat room. You already have a room called "' + existingRoom.name + '"' 
      });
    }

    const chatRoom = new ChatRoom({
      name,
      createdBy: req.user._id,
      isPrivate: isPrivate || false,
      participants: [req.user._id]
    });

    await chatRoom.save();
    res.status(201).json(chatRoom);
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

/**
 * Force cleanup of empty rooms
 * POST /api/chat-rooms/cleanup
 */
router.post('/cleanup', ensureAuthenticated, async (req, res) => {
  try {
    // Delete all rooms except Main Chat that have no active participants
    const result = await ChatRoom.deleteMany({
      $and: [
        { name: { $ne: 'Main Chat' } },
        { $or: [
          { participants: { $size: 0 } },
          { participants: { $exists: false } },
          { participants: null },
          { participants: [] }
        ]}
      ]
    });

    console.log(`Cleaned up ${result.deletedCount} empty rooms`);
    res.json({ message: `Cleaned up ${result.deletedCount} empty rooms` });
  } catch (error) {
    console.error('Error cleaning up rooms:', error);
    res.status(500).json({ error: 'Failed to clean up rooms' });
  }
});

/**
 * Get all chat rooms
 * GET /api/chat-rooms
 */
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    // Force cleanup of empty rooms
    await ChatRoom.deleteMany({
      $and: [
        { name: { $ne: 'Main Chat' } },
        { $or: [
          { participants: { $size: 0 } },
          { participants: { $exists: false } },
          { participants: null },
          { participants: [] }
        ]}
      ]
    });

    // Get all accessible rooms
    const chatRooms = await ChatRoom.find({
      $or: [
        { name: 'Main Chat' }, // Always include main chat
        { 
          $and: [
            { isPrivate: false },
            { participants: { $exists: true, $ne: [] } } // Only include public rooms with participants
          ]
        },
        { 
          $and: [
            { isPrivate: true },
            { participants: req.user._id } // Include private rooms where user is a participant
          ]
        }
      ]
    })
    .populate('createdBy', 'username avatar')
    .populate('participants', 'username avatar')
    .sort({ createdAt: -1 }); // Sort by newest first
    
    res.json(chatRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

/**
 * Get a specific chat room
 * GET /api/chat-rooms/:id
 */
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id)
      .populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar');

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if user has access to private chat room
    if (chatRoom.isPrivate && !chatRoom.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(chatRoom);
  } catch (error) {
    console.error('Error fetching chat room:', error);
    res.status(500).json({ error: 'Failed to fetch chat room' });
  }
});

// Join a chat room
router.post('/:id/join', ensureAuthenticated, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    if (chatRoom.participants.includes(req.user._id)) {
      return res.status(400).json({ error: 'Already a participant' });
    }

    chatRoom.participants.push(req.user._id);
    await chatRoom.save();

    res.json(chatRoom);
  } catch (error) {
    console.error('Error joining chat room:', error);
    res.status(500).json({ error: 'Failed to join chat room' });
  }
});

// Leave a chat room
router.post('/:id/leave', ensureAuthenticated, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Remove user from participants
    chatRoom.participants = chatRoom.participants.filter(
      participant => !participant.equals(req.user._id)
    );

    // If no participants left and not created by current user, delete the room
    if (chatRoom.participants.length === 0 && !chatRoom.createdBy.equals(req.user._id)) {
      await chatRoom.remove();
      return res.json({ message: 'Chat room deleted' });
    }

    await chatRoom.save();
    res.json(chatRoom);
  } catch (error) {
    console.error('Error leaving chat room:', error);
    res.status(500).json({ error: 'Failed to leave chat room' });
  }
});

/**
 * Get user's chat room
 * GET /api/chat-rooms/my-room
 */
router.get('/my-room', ensureAuthenticated, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findOne({
      createdBy: req.user._id,
      isPrivate: false
    }).populate('createdBy', 'username avatar')
      .populate('participants', 'username avatar');

    res.json({ room: chatRoom });
  } catch (error) {
    console.error('Error fetching user chat room:', error);
    res.status(500).json({ error: 'Failed to fetch user chat room' });
  }
});

module.exports = router; 