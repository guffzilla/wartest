const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { ensureAuthenticated } = require('../middleware/auth');

/**
 * @route   GET /api/reports/user
 * @desc    Get current user's reports
 * @access  Private
 */
router.get('/user', ensureAuthenticated, async (req, res) => {
  try {
    const reports = await Report.find({ submittedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`📋 Found ${reports.length} reports for user ${req.user.username}`);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 