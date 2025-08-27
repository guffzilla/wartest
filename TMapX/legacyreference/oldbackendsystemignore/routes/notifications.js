const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

/**
 * Get all notifications for the current user
 */
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

/**
 * Get unread notification count
 */
router.get('/unread/count', ensureAuthenticated, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

/**
 * Get notification count (alternative endpoint for frontend compatibility)
 */
router.get('/count', ensureAuthenticated, async (req, res) => {
  console.log('🔔 Notification count endpoint hit!');
  console.log('🔔 User:', req.user ? { id: req.user.id, username: req.user.username } : 'No user');
  console.log('🔔 Request URL:', req.originalUrl);
  console.log('🔔 Request method:', req.method);
  
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });
    
    console.log('🔔 Found notification count:', count);
    res.json({ count });
  } catch (error) {
    console.error('🔔 Error fetching notification count:', error);
    res.status(500).json({ message: 'Error fetching notification count' });
  }
});

/**
 * Create a new notification
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🔔 Creating notification:', req.body);
    console.log('🔔 User creating notification:', req.user ? { id: req.user.id, username: req.user.username } : 'No user');
    
    const { type, content, link, data, recipientId } = req.body;
    
    // Validate required fields
    if (!type || !content || !recipientId) {
      console.log('🔔 Missing required fields:', { type, content, recipientId });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create notification
    const notificationData = {
      userId: recipientId,
      type,
      content,
      link,
      data,
      isRead: false
    };
    
    console.log('🔔 Creating notification with data:', notificationData);
    
    const notification = new Notification(notificationData);
    
    console.log('🔔 Saving notification...');
    await notification.save();
    console.log('🔔 Notification saved successfully:', notification._id);
    
    // Emit real-time notification if socket is available
    if (req.app.get('io')) {
      const io = req.app.get('io');
      console.log('🔔 Emitting real-time notification to user:', recipientId);
      io.to(recipientId).emit('newNotification', notification);
    }
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('🔔 Error creating notification:', error);
    console.error('🔔 Error stack:', error.stack);
    console.error('🔔 Request body was:', req.body);
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
});

/**
 * Mark a notification as read
 */
router.put('/:id/read', ensureAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Emit real-time update if socket is available
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(req.user.id).emit('notificationRead', notification._id);
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

/**
 * Mark all notifications as read
 */
router.put('/read-all', ensureAuthenticated, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );
    
    // Emit real-time update if socket is available
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(req.user.id).emit('allNotificationsRead');
    }
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

/**
 * Delete a notification
 */
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Emit real-time update if socket is available
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(req.user.id).emit('notificationDeleted', notification._id);
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

module.exports = router; 