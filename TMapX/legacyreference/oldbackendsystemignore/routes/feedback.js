const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/feedback/submit
 * @desc    Submit feedback or bug report
 * @access  Public (but can be authenticated)
 */
router.post('/submit', async (req, res) => {
  try {
    const { type, subject, description, category, contact, browserInfo } = req.body;
    
    // Validate required fields
    if (!type || !subject || !description) {
      return res.status(400).json({ 
        message: 'Type, subject, and description are required' 
      });
    }

    // Validate type
    if (!['bug', 'feedback', 'suggestion', 'complaint', 'other'].includes(type)) {
      return res.status(400).json({ 
        message: 'Invalid feedback type' 
      });
    }

    // Validate category if provided
    if (category && !['ui', 'gameplay', 'performance', 'account', 'ladder', 'chat', 'maps', 'tournaments', 'other'].includes(category)) {
      return res.status(400).json({ 
        message: 'Invalid category' 
      });
    }

    // Create feedback object
    const feedbackData = {
      type,
      subject: subject.trim(),
      description: description.trim(),
      category: category || 'other',
      submittedBy: req.user ? req.user.id : null
    };

    // Add contact information if provided
    if (contact) {
      feedbackData.contact = {
        email: contact.email ? contact.email.trim() : '',
        discord: contact.discord ? contact.discord.trim() : '',
        preferredMethod: contact.preferredMethod || 'none'
      };
    }

    // Add browser information if provided
    if (browserInfo) {
      feedbackData.browserInfo = {
        userAgent: browserInfo.userAgent || '',
        platform: browserInfo.platform || '',
        url: browserInfo.url || ''
      };
    }

    // Create and save feedback
    const feedback = new Feedback(feedbackData);
    await feedback.save();

    console.log(`📝 New ${type} submitted: ${subject} by ${req.user ? req.user.username : 'anonymous'}`);
    
    // Return success response
    res.status(201).json({
      message: 'Thank you for your feedback! We\'ll review it shortly.',
      feedbackId: feedback._id
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      message: 'Server error. Please try again later.' 
    });
  }
});

/**
 * @route   GET /api/feedback/user
 * @desc    Get current user's feedback submissions
 * @access  Private
 */
router.get('/user', ensureAuthenticated, async (req, res) => {
  try {
    const feedback = await Feedback.getUserFeedback(req.user.id, 50);
    
    console.log(`📋 Found ${feedback.length} feedback submissions for user ${req.user.username}`);
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/feedback/all
 * @desc    Get all feedback (admin only)
 * @access  Private (Admin)
 */
router.get('/all', isAdmin, async (req, res) => {
  try {

    const { type, status, category, limit = 50 } = req.query;
    
    // Build query
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;

    const feedback = await Feedback.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('submittedBy', 'username displayName avatar')
      .populate('adminResponse.respondedBy', 'username displayName avatar');

    console.log(`📋 Admin ${req.user.username} fetched ${feedback.length} feedback items`);
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching all feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/feedback/:id/respond
 * @desc    Admin respond to feedback
 * @access  Private (Admin)
 */
router.put('/:id/respond', isAdmin, async (req, res) => {
  try {

    const { message, status } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Response message is required' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Add admin response
    await feedback.addAdminResponse(message, req.user.id);
    
    // Update status if provided
    if (status && ['open', 'in-progress', 'resolved', 'closed', 'duplicate'].includes(status)) {
      feedback.status = status;
      await feedback.save();
    }

    console.log(`💬 Admin ${req.user.username} responded to feedback ${feedback._id}`);
    res.json({ message: 'Response added successfully' });

  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/feedback/:id/status
 * @desc    Update feedback status (admin only)
 * @access  Private (Admin)
 */
router.put('/:id/status', isAdmin, async (req, res) => {
  try {

    const { status, priority, adminNotes } = req.body;
    
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Update fields
    if (status && ['open', 'in-progress', 'resolved', 'closed', 'duplicate'].includes(status)) {
      feedback.status = status;
    }
    
    if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
      feedback.priority = priority;
    }
    
    if (adminNotes !== undefined) {
      feedback.adminNotes = adminNotes;
    }

    await feedback.save();

    console.log(`🔄 Admin ${req.user.username} updated feedback ${feedback._id} status`);
    res.json({ message: 'Feedback updated successfully' });

  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/feedback/stats
 * @desc    Get feedback statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', isAdmin, async (req, res) => {
  try {

    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          bugs: { $sum: { $cond: [{ $eq: ['$type', 'bug'] }, 1, 0] } },
          feedback: { $sum: { $cond: [{ $eq: ['$type', 'feedback'] }, 1, 0] } },
          suggestions: { $sum: { $cond: [{ $eq: ['$type', 'suggestion'] }, 1, 0] } },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          highPriority: { $sum: { $cond: [{ $in: ['$priority', ['high', 'critical']] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0, bugs: 0, feedback: 0, suggestions: 0, 
      open: 0, resolved: 0, highPriority: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 