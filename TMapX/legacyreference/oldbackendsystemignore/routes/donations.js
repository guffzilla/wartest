const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/donations/monthly-goal
 * @desc    Get the current month's donation goal and progress
 * @access  Public
 */
router.get('/monthly-goal', async (req, res) => {
  try {
    // Get current month's total
    const currentTotal = await Donation.getCurrentMonthTotal();

    // Set the monthly goal (hardcoded for now, could be made configurable)
    const monthlyGoal = 1000;

    // Calculate percentage
    const percentage = Math.min(Math.round((currentTotal / monthlyGoal) * 100), 100);

    res.json({
      goal: monthlyGoal,
      current: currentTotal,
      percentage,
      currency: 'USD'
    });
  } catch (error) {
    console.error('Error getting monthly goal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/donations/recent
 * @desc    Get recent public donations
 * @access  Public
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const donations = await Donation.getRecentDonations(limit);

    res.json(donations);
  } catch (error) {
    console.error('Error getting recent donations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/donations
 * @desc    Record a new donation (for testing purposes)
 * @access  Admin only
 */
router.post('/', async (req, res) => {
  try {
    const {
      amount,
      currency = 'USD',
      source = 'other',
      donorName = 'Anonymous',
      donorEmail,
      message = '',
      isPublic = true
    } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const donation = new Donation({
      amount: parseFloat(amount),
      currency,
      source,
      userId: req.user ? req.user.id : null,
      donorName,
      donorEmail,
      message,
      isPublic
    });

    await donation.save();

    res.status(201).json(donation);
  } catch (error) {
    console.error('Error recording donation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/donations/stats
 * @desc    Get donation statistics
 * @access  Admin only
 */
router.get('/stats', isAdmin, async (req, res) => {
  try {
    // Get total all-time donations
    const totalResult = await Donation.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalDonations = totalResult.length > 0 ? totalResult[0].total : 0;

    // Get total donors count
    const donorsCount = await Donation.distinct('userId').length;

    // Get monthly totals for the past year
    const date = new Date();
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth() + 1;

    const monthlyTotals = [];
    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i;
      let year = currentYear;

      if (month <= 0) {
        month += 12;
        year -= 1;
      }

      const total = await Donation.getMonthlyTotal(year, month);
      monthlyTotals.push({
        year,
        month,
        total
      });
    }

    res.json({
      totalDonations,
      donorsCount,
      monthlyTotals: monthlyTotals.reverse() // Show oldest to newest
    });
  } catch (error) {
    console.error('Error getting donation stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
