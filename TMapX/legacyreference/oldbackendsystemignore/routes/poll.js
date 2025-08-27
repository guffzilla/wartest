const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const { authenticate, requireAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication Middleware for poll routes
router.use(async (req, res, next) => {
  // Skip if already authenticated via session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check for JWT token in multiple places: Authorization header, cookie, or query param
  let authToken = req.cookies?.authToken || 
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.query.authToken;
                  
  if (authToken) {
    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded.type === 'web') {
        // Get fresh user data from database
        const user = await User.findById(decoded.userId).select('-password');
        if (user) {
          // Set user on request object (similar to passport)
          req.user = user;
          console.log(`🔐 Poll route JWT authenticated user: ${user.username}`);
        }
      }
    } catch (error) {
      console.log(`🔐 Poll route JWT auth failed: ${error.message}`);
      // Clear invalid cookie
      res.clearCookie('authToken');
    }
  }
  
  next();
});

// POST /api/poll - Create a new poll (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { question, options } = req.body;
    
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options are required' });
    }
    
    const formattedOptions = options.map(opt => ({ value: opt, votes: 0 }));
    const poll = new Poll({
      question,
      options: formattedOptions,
      voters: []
    });
    
    await poll.save();
    res.status(201).json(poll);
  } catch (err) {
    console.error('Error creating poll:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/poll/:identifier - Get poll data
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const poll = await Poll.getPollByIdentifier(identifier);
    
    if (!poll) {
      // Create the divorce poll if it doesn't exist
      if (identifier === 'divorce') {
        const newPoll = new Poll({
          identifier: 'divorce',
          question: 'Is my wife going to divorce me?',
          options: [
            { value: 'yes', votes: 0 },
            { value: 'no', votes: 0 }
          ]
        });
        await newPoll.save();
        return res.json(newPoll);
      }
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Add hasVoted property if user is authenticated
    const response = { ...poll.toObject() };
    if (req.user) {
      response.hasVoted = poll.voters.some(voter => voter.userId.toString() === req.user._id.toString());
    }
    
    res.json(response);
  } catch (err) {
    console.error('Error getting poll:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/poll/vote - Vote on a poll (requires authentication)
const handleVote = async (req, res) => {
  try {
    const { poll: identifier, vote: option } = req.body;
    if (!identifier || !option) {
      return res.status(400).json({ error: 'Poll identifier and vote option are required' });
    }
    // Vote on the poll (creating it first if it's the divorce poll)
    let poll = await Poll.getPollByIdentifier(identifier);
    if (!poll && identifier === 'divorce') {
      poll = new Poll({
        identifier: 'divorce',
        question: 'Is my wife going to divorce me?',
        options: [
          { value: 'yes', votes: 0 },
          { value: 'no', votes: 0 }
        ]
      });
      await poll.save();
    } else if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    // Vote on the poll with user ID (supports vote changing)
    poll = await Poll.vote(identifier, option, req.user._id);
    
    // Check if this was a vote change or new vote
    const wasChange = poll.voters.filter(voter => voter.userId.toString() === req.user._id.toString()).length === 1;
    const message = wasChange ? 'Vote changed successfully' : 'Vote recorded successfully';
    
    res.json({
      message: message,
      poll: {
        ...poll.toObject(),
        hasVoted: true
      }
    });
  } catch (err) {
    console.error('Error voting on poll:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

router.post('/vote', authenticate, handleVote);

module.exports = router;
