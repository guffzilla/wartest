const express = require('express');
const router = express.Router();
const ForumTopic = require('../models/ForumTopic');
const ForumPost = require('../models/ForumPost');
const FlaggedForumContent = require('../models/FlaggedForumContent');
const User = require('../models/User');

// Use centralized authentication middleware
const { authenticate, requireAdmin, requireAdminOrModerator } = require('../middleware/auth');

// Middleware to check if user is the content owner or has moderator/admin privileges
function isOwnerOrModeratorOrAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // If user is admin or moderator, allow access
  if (req.user.role === 'admin' || req.user.role === 'moderator') {
    return next();
  }

  // Check if user is the content owner
  const { contentType, contentId } = req.params;

  if (!contentType || !contentId) {
    return res.status(400).json({ error: 'Content type and ID are required' });
  }

  // Check ownership based on content type
  if (contentType === 'topic') {
    ForumTopic.findById(contentId)
      .then(topic => {
        if (!topic) {
          return res.status(404).json({ error: 'Topic not found' });
        }

        if (topic.author.userId.toString() === req.user._id.toString()) {
          return next();
        }

        res.status(403).json({ error: 'Not authorized' });
      })
      .catch(err => {
        console.error('Error checking topic ownership:', err);
        res.status(500).json({ error: 'Server error' });
      });
  } else if (contentType === 'post') {
    ForumPost.findById(contentId)
      .then(post => {
        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }

        if (post.author.userId.toString() === req.user._id.toString()) {
          return next();
        }

        res.status(403).json({ error: 'Not authorized' });
      })
      .catch(err => {
        console.error('Error checking post ownership:', err);
        res.status(500).json({ error: 'Server error' });
      });
  } else {
    res.status(400).json({ error: 'Invalid content type' });
  }
}



// GET /api/forum/topics - Get all topics (with optional gameType filter)
router.get('/topics', async (req, res) => {
  try {
    const { gameType, limit = 20, offset = 0 } = req.query;
    
    // Build query filter
    const filter = {};
    if (gameType && ['wc1', 'wc2', 'wc3'].includes(gameType)) {
      filter.gameType = gameType;
    }
    
    const topics = await ForumTopic.find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Format topics to ensure frontend compatibility
    const formattedTopics = topics.map(topic => {
      let pollData = null;
      if (topic.poll && topic.poll.question) {
        pollData = {
          ...topic.poll,
          hasVoted: false,
          userVote: null
        };
        
        // Check if authenticated user has voted
        if (req.user && topic.poll.voters) {
          const userVoteRecord = topic.poll.voters.find(voter => 
            voter.userId.toString() === req.user._id.toString()
          );
          if (userVoteRecord) {
            pollData.hasVoted = true;
            pollData.userVote = userVoteRecord.option;
          }
        }
      }
      
      return {
        ...topic,
        reactions: topic.reactions || { like: 0, celebrate: 0 },
        userReaction: topic.userReaction || null,
        commentsCount: topic.replyCount || 0,
        replyCount: topic.replyCount || 0,
        viewCount: topic.viewCount || 0,
        isPinned: topic.isPinned || false,
        isLocked: topic.isLocked || false,
        poll: pollData
      };
    });

    res.json(formattedTopics);
  } catch (err) {
    console.error('Error getting forum topics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});





// GET /api/forum/topic/:id - Get a topic and its posts
router.get('/topic/:id', async (req, res) => {
  try {
    const topicId = req.params.id;

    // Get topic
    const topic = await ForumTopic.findById(topicId).lean();

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get posts in this topic
    const posts = await ForumPost.find({ topic: topicId })
      .sort({ createdAt: 1 })
      .lean();

    // Increment view count
    await ForumTopic.findByIdAndUpdate(topicId, { $inc: { viewCount: 1 } });

    res.json({
      topic,
      posts
    });
  } catch (err) {
    console.error('Error getting topic details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const { requireFeature } = require('../middleware/accessControl');

// POST /api/forum/topic - Create a new topic
router.post('/topic', authenticate, requireFeature('postContent'), async (req, res) => {
  try {
    console.log('🔍 POST /topic - Request details:', {
      body: req.body,
      user: req.user ? { id: req.user._id, username: req.user.username, role: req.user.role } : 'No user',
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false
    });

    const { title, content, gameType } = req.body;

    if (!title || !content) {
      console.log('❌ Missing title or content:', { title: !!title, content: !!content });
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Validate gameType
    const validGameType = gameType && ['wc1', 'wc2', 'wc3'].includes(gameType) ? gameType : 'wc2';
    console.log('🎮 Game type validation:', { requested: gameType, validated: validGameType });

    console.log('🚀 Creating topic with data:', {
      title,
      gameType: validGameType,
      authorId: req.user._id,
      authorUsername: req.user.username,
      userRole: req.user.role
    });

    // Map user roles for forum compatibility
    // Database uses 'user' but forum schema expects 'member', 'moderator', 'admin'
    const forumRole = req.user.role === 'user' ? 'member' : req.user.role || 'member';
    console.log('🔄 Role mapping:', { originalRole: req.user.role, forumRole });

    // Handle poll data if provided
    let pollData = null;
    if (req.body.poll && req.body.poll.question && req.body.poll.options) {
      const { question, options, expiresIn } = req.body.poll;
      
      if (options.length < 2) {
        return res.status(400).json({ error: 'Poll must have at least 2 options' });
      }
      
      pollData = {
        question: question.trim(),
        options: options.map(opt => ({ value: opt.trim(), votes: 0 })),
        voters: [],
        isActive: true
      };
      
      // Set expiration date if provided (in hours)
      if (expiresIn && expiresIn > 0) {
        pollData.expiresAt = new Date(Date.now() + (expiresIn * 60 * 60 * 1000));
      }
    }

    // Create topic
    const topicData = {
      title,
      content,
      gameType: validGameType,
      author: {
        userId: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
        role: forumRole
      }
    };
    
    // Add poll if provided
    if (pollData) {
      topicData.poll = pollData;
    }
    
    const topic = new ForumTopic(topicData);

    await topic.save();
    console.log('✅ Topic saved successfully:', topic._id);

    console.log('✅ Topic creation completed successfully');
    
    // Format the topic response to match frontend expectations
    const formattedTopic = {
      _id: topic._id,
      title: topic.title,
      content: topic.content,
      gameType: topic.gameType,
      author: topic.author,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      isPinned: topic.isPinned || false,
      isLocked: topic.isLocked || false,
      replyCount: topic.replyCount || 0,
      viewCount: topic.viewCount || 0,
      reactions: { like: 0, celebrate: 0 }, // Initialize reactions for new posts
      userReaction: null, // User hasn't reacted yet
      commentsCount: 0, // New post has no comments yet
      poll: topic.poll ? {
        ...topic.poll.toObject(),
        hasVoted: false, // Creator hasn't voted yet
        userVote: null
      } : null
    };
    
    res.status(201).json(formattedTopic);
  } catch (err) {
    console.error('❌ Error creating topic - Full details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/topic/:id/vote - Vote on a topic's poll
router.post('/topic/:id/vote', authenticate, async (req, res) => {
  try {
    const { id: topicId } = req.params;
    const { option } = req.body;
    
    if (!option) {
      return res.status(400).json({ error: 'Vote option is required' });
    }
    
    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Use the instance method to vote
    await topic.voteOnPoll(req.user._id, option);
    
    // Return the updated poll data
    const pollWithUserVote = {
      ...topic.poll.toObject(),
      hasVoted: true,
      userVote: option
    };
    
    res.json({
      message: 'Vote recorded successfully',
      poll: pollWithUserVote
    });
  } catch (err) {
    console.error('Error voting on poll:', err);
    if (err.message.includes('already voted') || err.message.includes('expired') || err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/forum/topic/:id/poll - Get poll data for a topic
router.get('/topic/:id/poll', async (req, res) => {
  try {
    const { id: topicId } = req.params;
    
    const topic = await ForumTopic.findById(topicId).select('poll');
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    if (!topic.poll || !topic.poll.question) {
      return res.status(404).json({ error: 'No poll found for this topic' });
    }
    
    // Check if user has voted (if authenticated)
    let hasVoted = false;
    let userVote = null;
    if (req.user) {
      const userVoteRecord = topic.poll.voters.find(voter => 
        voter.userId.toString() === req.user._id.toString()
      );
      if (userVoteRecord) {
        hasVoted = true;
        userVote = userVoteRecord.option;
      }
    }
    
    const pollData = {
      ...topic.poll.toObject(),
      hasVoted,
      userVote
    };
    
    res.json(pollData);
  } catch (err) {
    console.error('Error getting poll data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/forum/post - Create a new post (reply)
router.post('/post', authenticate, requireFeature('postContent'), async (req, res) => {
  try {
    const { topicId, content } = req.body;

    if (!topicId || !content) {
      return res.status(400).json({ error: 'Topic ID and content are required' });
    }

    // Check if topic exists and is not locked
    const topic = await ForumTopic.findById(topicId);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (topic.isLocked) {
      return res.status(403).json({ error: 'Topic is locked' });
    }

    // Map user roles for forum compatibility
    const forumRole = req.user.role === 'user' ? 'member' : req.user.role || 'member';

    // Create post
    const post = new ForumPost({
      topic: topicId,
      author: {
        userId: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
        role: forumRole
      },
      content
    });

    await post.save();

    // Update topic stats
    await ForumTopic.findByIdAndUpdate(topicId, {
      $inc: { replyCount: 1 },
      lastReply: {
        userId: req.user._id,
        username: req.user.username,
        date: new Date()
      }
    });



    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/topic/:id/sticky - Toggle sticky status for a topic
router.post('/topic/:id/sticky', requireAdminOrModerator, async (req, res) => {
  try {
    const topicId = req.params.id;

    // Get topic
    const topic = await ForumTopic.findById(topicId);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Toggle sticky status
    topic.isPinned = !topic.isPinned;
    await topic.save();

    res.json({
      message: `Topic ${topic.isPinned ? 'pinned' : 'unpinned'} successfully`,
      topic
    });
  } catch (err) {
    console.error('Error toggling topic sticky status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/topic/:id/lock - Toggle lock status for a topic
router.post('/topic/:id/lock', requireAdminOrModerator, async (req, res) => {
  try {
    const topicId = req.params.id;

    // Get topic
    const topic = await ForumTopic.findById(topicId);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Toggle lock status
    topic.isLocked = !topic.isLocked;
    await topic.save();

    res.json({
      message: `Topic ${topic.isLocked ? 'locked' : 'unlocked'} successfully`,
      topic
    });
  } catch (err) {
    console.error('Error toggling topic lock status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/forum/topic/:id - Delete a specific topic (author or admin only)
router.delete('/topic/:id', authenticate, async (req, res) => {
  try {
    const topicId = req.params.id;
    
    console.log('🗑️ DELETE topic request:', {
      topicId,
      user: req.user ? { id: req.user._id, username: req.user.username, role: req.user.role } : 'No user'
    });

    // Get topic
    const topic = await ForumTopic.findById(topicId);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Check if user is the author or has admin privileges
    const isOwner = topic.author.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';
    
    console.log('🔐 Ownership check:', {
      topicAuthor: topic.author.userId.toString(),
      currentUser: req.user._id.toString(),
      isOwner,
      isAdmin,
      userRole: req.user.role
    });

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete all posts in the topic first
    const deletedPosts = await ForumPost.deleteMany({ topic: topicId });
    console.log(`🗑️ Deleted ${deletedPosts.deletedCount} replies in topic`);

    // Delete the topic
    await ForumTopic.findByIdAndDelete(topicId);
    console.log('✅ Topic deleted successfully');

    res.json({ message: 'Topic deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting topic:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/forum/:contentType/:contentId - Delete a topic or post
router.delete('/:contentType/:contentId', isOwnerOrModeratorOrAdmin, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;

    if (contentType === 'topic') {
      // Get topic
      const topic = await ForumTopic.findById(contentId);

      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      // Delete all posts in the topic
      await ForumPost.deleteMany({ topic: contentId });

      // Delete the topic
      await ForumTopic.findByIdAndDelete(contentId);

      res.json({ message: 'Topic deleted successfully' });
    } else if (contentType === 'post') {
      // Get post
      const post = await ForumPost.findById(contentId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Get topic
      const topic = await ForumTopic.findById(post.topic);

      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      // Delete the post
      await ForumPost.findByIdAndDelete(contentId);

      res.json({ message: 'Post deleted successfully' });
    } else {
      res.status(400).json({ error: 'Invalid content type' });
    }
  } catch (err) {
    console.error('Error deleting content:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/flag - Flag forum content as inappropriate
router.post('/flag', authenticate, async (req, res) => {
  try {
    const { contentType, contentId, reason } = req.body;

    if (!contentType || !contentId || !reason) {
      return res.status(400).json({ error: 'Content type, ID, and reason are required' });
    }

    // Check if content exists
    let content;
    let topicId;

    let contentPreview;

    if (contentType === 'topic') {
      content = await ForumTopic.findById(contentId);

      if (!content) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      topicId = content._id;
      contentPreview = content.title;
    } else if (contentType === 'post') {
      content = await ForumPost.findById(contentId);

      if (!content) {
        return res.status(404).json({ error: 'Post not found' });
      }

      topicId = content.topic;
      contentPreview = content.content.substring(0, 100) + (content.content.length > 100 ? '...' : '');
    } else {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Check if content is already flagged
    const existingFlag = await FlaggedForumContent.findOne({
      contentType,
      contentId,
      status: 'pending'
    });

    if (existingFlag) {
      return res.status(400).json({ error: 'Content is already flagged' });
    }

    // Create flagged content
    const flaggedContent = new FlaggedForumContent({
      contentType,
      contentId,
      topicId,
      contentPreview,
      flaggedBy: {
        userId: req.user._id,
        username: req.user.username
      },
      reason
    });

    await flaggedContent.save();

    res.status(201).json({
      message: 'Content flagged successfully',
      flaggedContent
    });
  } catch (err) {
    console.error('Error flagging content:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/forum/admin/flagged - Get all flagged content (admin/moderator only)
router.get('/admin/flagged', requireAdminOrModerator, async (req, res) => {
  try {
    const flaggedContent = await FlaggedForumContent.find()
      .sort({ createdAt: -1 })
      .populate('flaggedBy.userId', 'username displayName avatar')
      .populate('reviewedBy', 'username displayName avatar')
      .populate('topicId', 'title')

      .lean();

    res.json(flaggedContent);
  } catch (err) {
    console.error('Error getting flagged content:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/admin/review-flagged - Review flagged content (admin/moderator only)
router.post('/admin/review-flagged', requireAdminOrModerator, async (req, res) => {
  try {
    const { flaggedContentId, status, reviewNotes } = req.body;

    if (!flaggedContentId || !status) {
      return res.status(400).json({ error: 'Flagged content ID and status are required' });
    }

    // Find the flagged content
    const flaggedContent = await FlaggedForumContent.findById(flaggedContentId);

    if (!flaggedContent) {
      return res.status(404).json({ error: 'Flagged content not found' });
    }

    // Update flagged content
    flaggedContent.status = status;
    flaggedContent.reviewedBy = req.user._id;
    flaggedContent.reviewedAt = new Date();
    flaggedContent.reviewNotes = reviewNotes || '';

    await flaggedContent.save();

    // If approved, delete the content
    if (status === 'approved') {
      if (flaggedContent.contentType === 'topic') {
        // Delete all posts in the topic
        await ForumPost.deleteMany({ topic: flaggedContent.contentId });

        // Get topic
        const topic = await ForumTopic.findById(flaggedContent.contentId);



        // Delete the topic
        await ForumTopic.findByIdAndDelete(flaggedContent.contentId);
      } else if (flaggedContent.contentType === 'post') {
        // Get post
        const post = await ForumPost.findById(flaggedContent.contentId);

        if (post) {
          // Update topic stats
          await ForumTopic.findByIdAndUpdate(post.topic, {
            $inc: { replyCount: -1 }
          });



          // Delete the post
          await ForumPost.findByIdAndDelete(flaggedContent.contentId);
        }
      }
    }

    res.json({
      message: 'Flagged content reviewed successfully',
      flaggedContent
    });
  } catch (err) {
    console.error('Error reviewing flagged content:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/forum/user/:userId/activity - Get forum activity for a user
router.get('/user/:userId/activity', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Log session debug info
    console.log('Forum Activity Debug:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated && req.isAuthenticated(),
      userParam: userId,
      user: req.user ? { id: req.user._id, username: req.user.username } : null
    });

    // Check if userId is valid
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.warn('Invalid user ID provided for forum activity:', userId);
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'The user ID is undefined or invalid. Please login again.'
      });
    }

    // Validate that the userId is a valid ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('Invalid ObjectId format for user ID:', userId);
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'The user ID provided is not in a valid format. Please login again.'
      });
    }

    // Get topics created by the user
    const topics = await ForumTopic.find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get posts created by the user
    const posts = await ForumPost.find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('topic', 'title')
      .lean();

    res.json({
      topics,
      posts
    });
  } catch (err) {
    console.error('Error getting user forum activity:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/forum/my-activity - Get forum activity for the current logged-in user
router.get('/my-activity', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('My Forum Activity Debug:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated && req.isAuthenticated(),
      user: req.user ? { id: req.user._id, username: req.user.username } : null
    });

    // Get topics created by the user
    const topics = await ForumTopic.find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get posts created by the user
    const posts = await ForumPost.find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('topic', 'title')
      .lean();

    // Format the response to match what the frontend expects
    res.json({
      topics,
      posts
    });
  } catch (err) {
    console.error('Error getting current user forum activity:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/post/:postId/like - Like a post
router.post('/post/:postId/like', authenticate, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;

    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Remove from dislikes if present
    post.dislikes = post.dislikes.filter(id => id.toString() !== userId.toString());

    // Toggle like
    const likeIndex = post.likes.findIndex(id => id.toString() === userId.toString());
    if (likeIndex === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json(post);
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/post/:postId/dislike - Dislike a post
router.post('/post/:postId/dislike', authenticate, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;

    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Remove from likes if present
    post.likes = post.likes.filter(id => id.toString() !== userId.toString());

    // Toggle dislike
    const dislikeIndex = post.dislikes.findIndex(id => id.toString() === userId.toString());
    if (dislikeIndex === -1) {
      post.dislikes.push(userId);
    } else {
      post.dislikes.splice(dislikeIndex, 1);
    }

    await post.save();
    res.json(post);
  } catch (err) {
    console.error('Error disliking post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/forum/topic/:id - Edit a topic
router.put('/topic/:id', isOwnerOrModeratorOrAdmin, async (req, res) => {
  try {
    const topicId = req.params.id;
    const { title, content } = req.body;

    if (!title && !content) {
      return res.status(400).json({ error: 'Title or content is required' });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;

    const topic = await ForumTopic.findByIdAndUpdate(
      topicId,
      updateData,
      { new: true }
    );

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json(topic);
  } catch (err) {
    console.error('Error editing topic:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/forum/post/:id - Edit a post
router.put('/post/:id', isOwnerOrModeratorOrAdmin, async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = await ForumPost.findByIdAndUpdate(
      postId,
      {
        content,
        isEdited: true,
        editedAt: new Date()
      },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error('Error editing post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/topic/:topicId/sticky - Toggle sticky status (admin/moderator only)
router.post('/topic/:topicId/sticky', requireAdminOrModerator, async (req, res) => {
  try {
    const topic = await ForumTopic.findById(req.params.topicId);
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    topic.isPinned = !topic.isPinned;
    await topic.save();

    res.json({ 
      success: true, 
      isPinned: topic.isPinned,
      message: `Topic has been ${topic.isPinned ? 'pinned' : 'unpinned'}`
    });
  } catch (error) {
    console.error('Error toggling sticky status:', error);
    res.status(500).json({ error: 'Failed to toggle sticky status' });
  }
});

// POST /api/forum/topic/:topicId/like - Like a topic
router.post('/topic/:topicId/like', authenticate, async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const userId = req.user._id;

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Remove from dislikes if present
    topic.dislikes = topic.dislikes.filter(id => id.toString() !== userId.toString());

    // Toggle like
    const likeIndex = topic.likes.findIndex(id => id.toString() === userId.toString());
    if (likeIndex === -1) {
      topic.likes.push(userId);
    } else {
      topic.likes.splice(likeIndex, 1);
    }

    await topic.save();
    res.json(topic);
  } catch (err) {
    console.error('Error liking topic:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/topic/:topicId/dislike - Dislike a topic
router.post('/topic/:topicId/dislike', authenticate, async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const userId = req.user._id;

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Remove from likes if present
    topic.likes = topic.likes.filter(id => id.toString() !== userId.toString());

    // Toggle dislike
    const dislikeIndex = topic.dislikes.findIndex(id => id.toString() === userId.toString());
    if (dislikeIndex === -1) {
      topic.dislikes.push(userId);
    } else {
      topic.dislikes.splice(dislikeIndex, 1);
    }

    await topic.save();
    res.json(topic);
  } catch (err) {
    console.error('Error disliking topic:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/forum/stats - Get forum statistics by game type
router.get('/stats', async (req, res) => {
  try {
    const { gameType } = req.query;
    
    // Build query filter
    const filter = {};
    if (gameType && ['wc1', 'wc2', 'wc3'].includes(gameType)) {
      filter.gameType = gameType;
    }
    
    // Get topic count for the game type
    const activePosts = await ForumTopic.countDocuments(filter);
    
    // Get online users (from OnlineUser model)
    const OnlineUser = require('../models/OnlineUser');
    const onlineUsers = await OnlineUser.countDocuments({});
    
    res.json({
      activePosts,
      onlineUsers
    });
  } catch (err) {
    console.error('Error getting forum stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/online-users - Get count of online users
router.get('/online-users', async (req, res) => {
  try {
    const OnlineUser = require('../models/OnlineUser');
    const count = await OnlineUser.countDocuments({});
    
    res.json({ count });
  } catch (err) {
    console.error('Error getting online users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== CLAN STONE TABLET ROUTES =====

// GET /api/forum/clan/:clanId/topics - Get clan-specific topics
router.get('/clan/:clanId/topics', authenticate, async (req, res) => {
  try {
    const { clanId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Verify user is a member of this clan
    const Clan = require('../models/Clan');
    const clan = await Clan.findById(clanId);
    
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    if (!clan.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Access denied to clan stone tablet' });
    }
    
    // Get clan-specific topics
    const topics = await ForumTopic.find({ clan: clanId })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Format topics for frontend compatibility
    const formattedTopics = topics.map(topic => {
      let pollData = null;
      if (topic.poll && topic.poll.question) {
        pollData = {
          ...topic.poll,
          hasVoted: false,
          userVote: null
        };
        
        // Check if authenticated user has voted
        if (req.user && topic.poll.voters) {
          const userVoteRecord = topic.poll.voters.find(voter => 
            voter.userId.toString() === req.user._id.toString()
          );
          if (userVoteRecord) {
            pollData.hasVoted = true;
            pollData.userVote = userVoteRecord.option;
          }
        }
      }
      
      return {
        ...topic,
        reactions: topic.reactions || { like: 0, celebrate: 0 },
        userReaction: topic.userReaction || null,
        commentsCount: topic.replyCount || 0,
        replyCount: topic.replyCount || 0,
        viewCount: topic.viewCount || 0,
        isPinned: topic.isPinned || false,
        isLocked: topic.isLocked || false,
        poll: pollData
      };
    });

    res.json(formattedTopics);
  } catch (err) {
    console.error('Error getting clan topics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/forum/clan/:clanId/topic - Create a new clan topic
router.post('/clan/:clanId/topic', authenticate, async (req, res) => {
  try {
    const { clanId } = req.params;
    const { title, content, gameType } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Verify user is a member of this clan
    const Clan = require('../models/Clan');
    const clan = await Clan.findById(clanId);
    
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    if (!clan.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Access denied to clan stone tablet' });
    }

    // Validate gameType
    const validGameType = gameType && ['wc1', 'wc2', 'wc3'].includes(gameType) ? gameType : 'wc2';

    // Map user roles for forum compatibility
    const forumRole = req.user.role === 'user' ? 'member' : req.user.role || 'member';

    // Handle poll data if provided
    let pollData = null;
    if (req.body.poll && req.body.poll.question && req.body.poll.options) {
      const { question, options, expiresIn } = req.body.poll;
      
      if (options.length < 2) {
        return res.status(400).json({ error: 'Poll must have at least 2 options' });
      }
      
      pollData = {
        question: question.trim(),
        options: options.map(opt => ({ value: opt.trim(), votes: 0 })),
        voters: [],
        isActive: true
      };
      
      // Set expiration date if provided (in hours)
      if (expiresIn && expiresIn > 0) {
        pollData.expiresAt = new Date(Date.now() + (expiresIn * 60 * 60 * 1000));
      }
    }

    // Create clan topic
    const topicData = {
      title,
      content,
      gameType: validGameType,
      clan: clanId,
      author: {
        userId: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
        role: forumRole
      }
    };
    
    // Add poll if provided
    if (pollData) {
      topicData.poll = pollData;
    }
    
    const topic = new ForumTopic(topicData);
    await topic.save();

    // Populate author info for response
    await topic.populate('author.userId', 'username displayName avatar');

    res.status(201).json(topic);
  } catch (err) {
    console.error('Error creating clan topic:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/forum/clan/:clanId/stats - Get clan stone tablet statistics
router.get('/clan/:clanId/stats', authenticate, async (req, res) => {
  try {
    const { clanId } = req.params;
    
    // Verify user is a member of this clan
    const Clan = require('../models/Clan');
    const clan = await Clan.findById(clanId);
    
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    if (!clan.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Access denied to clan stone tablet' });
    }
    
    // Get clan-specific stats
    const activePosts = await ForumTopic.countDocuments({ clan: clanId });
    const totalReplies = await ForumPost.countDocuments({ 
      topic: { $in: await ForumTopic.find({ clan: clanId }).select('_id') }
    });
    
    res.json({
      activePosts,
      totalReplies,
      clanName: clan.name,
      clanTag: clan.tag
    });
  } catch (err) {
    console.error('Error getting clan stone tablet stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
