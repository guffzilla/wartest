const express = require('express');
const router = express.Router();
const DarkPortalLink = require('../models/DarkPortalLink');
const { authenticate, requireAdmin, requireAdminOrModerator } = require('../middleware/auth');
const { adminAudit } = require('../middleware/adminAudit');

/**
 * GET /api/dark-portal/links
 * Get approved links by category and game type
 */
router.get('/links', async (req, res) => {
  try {
    const { category, gameType } = req.query;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    
    const links = await DarkPortalLink.getApprovedLinks(category, gameType);
    res.json({ success: true, links });
  } catch (error) {
    console.error('Error fetching dark portal links:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dark-portal/all-links
 * Get all approved links grouped by category for a specific game type
 */
router.get('/all-links', async (req, res) => {
  try {
    const { gameType = 'wc12' } = req.query;
    
    const categories = ['reddit', 'discord', 'battlenet', 'maps-mods', 'community-sites'];
    const linksByCategory = {};
    
    for (const category of categories) {
      linksByCategory[category] = await DarkPortalLink.getApprovedLinks(category, gameType);
    }
    
    res.json({ success: true, linksByCategory });
  } catch (error) {
    console.error('Error fetching all dark portal links:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dark-portal/submit
 * Submit a new link for approval
 */
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { title, url, description, category, gameType } = req.body;
    
    // Validate required fields
    if (!title || !url || !category || !gameType) {
      return res.status(400).json({ error: 'Title, URL, category, and game type are required' });
    }
    
    // Validate URL format
    if (!/^https?:\/\/.+/.test(url)) {
      return res.status(400).json({ error: 'URL must be a valid HTTP/HTTPS URL' });
    }
    
    // Check if URL already exists
    const existingLink = await DarkPortalLink.findOne({ url: url.trim() });
    if (existingLink) {
      return res.status(400).json({ error: 'This URL has already been submitted' });
    }
    
    // Create new link submission
    const newLink = new DarkPortalLink({
      title: title.trim(),
      url: url.trim(),
      description: description?.trim() || '',
      category,
      gameType,
      submittedBy: req.user.id,
      status: 'pending'
    });
    
    await newLink.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Link submitted successfully and is pending approval',
      link: newLink
    });
  } catch (error) {
    console.error('Error submitting dark portal link:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dark-portal/click/:id
 * Track link clicks
 */
router.post('/click/:id', async (req, res) => {
  try {
    const link = await DarkPortalLink.findById(req.params.id);
    if (!link || link.status !== 'approved') {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    await link.incrementClickCount();
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking link click:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dark-portal/admin/pending
 * Get pending submissions for admin review
 */
router.get('/admin/pending', requireAdminOrModerator, adminAudit('dark_portal_pending','dark_portal'), async (req, res) => {
  try {
    const pendingLinks = await DarkPortalLink.getPendingSubmissions();
    res.json({ success: true, links: pendingLinks });
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/dark-portal/admin/review/:id
 * Approve or deny a link submission
 */
router.post('/admin/review/:id', requireAdminOrModerator, adminAudit('dark_portal_review','dark_portal',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const { action, reviewNotes, displayOrder, featured } = req.body;
    
    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or deny' });
    }
    
    const link = await DarkPortalLink.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    link.status = action === 'approve' ? 'approved' : 'denied';
    link.reviewedBy = req.user.id;
    link.reviewedAt = new Date();
    link.reviewNotes = reviewNotes || '';
    
    if (action === 'approve') {
      link.displayOrder = displayOrder || 0;
      link.featured = featured || false;
    }
    
    await link.save();
    
    // If denied, we could optionally delete it instead of keeping it
    if (action === 'deny') {
      await DarkPortalLink.findByIdAndDelete(req.params.id);
    }
    
    res.json({ 
      success: true, 
      message: `Link ${action}d successfully`,
      link: action === 'approve' ? link : null
    });
  } catch (error) {
    console.error('Error reviewing link:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
  * GET /api/dark-portal/admin/link/:id
  * Get a single link by id (admin)
 */
router.get('/admin/link/:id', requireAdmin, async (req, res) => {
  try {
    const link = await DarkPortalLink.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, error: 'Link not found' });
    }
    res.json({ success: true, link });
  } catch (error) {
    console.error('Error fetching dark portal link:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
  * POST /api/dark-portal/admin/add
  * Admin directly add a link (bypasses approval process)
  */
router.post('/admin/add', requireAdminOrModerator, adminAudit('dark_portal_add','dark_portal',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const { title, url, description, image, category, gameType, displayOrder, featured } = req.body;
    
    // Validate required fields
    if (!title || !url || !category || !gameType) {
      return res.status(400).json({ error: 'Title, URL, category, and game type are required' });
    }
    
    // Validate URL format
    if (!/^https?:\/\/.+/.test(url)) {
      return res.status(400).json({ error: 'URL must be a valid HTTP/HTTPS URL' });
    }
    
    // Check if URL already exists
    const existingLink = await DarkPortalLink.findOne({ url: url.trim() });
    if (existingLink) {
      return res.status(400).json({ error: 'This URL already exists' });
    }
    
    // Create new approved link
    const newLink = new DarkPortalLink({
      title: title.trim(),
      url: url.trim(),
      description: description?.trim() || '',
      image: (image || '').trim(),
      category,
      gameType,
      submittedBy: req.user.id,
      status: 'approved',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      displayOrder: displayOrder || 0,
      featured: featured || false
    });
    
    await newLink.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Link added successfully',
      link: newLink
    });
  } catch (error) {
    console.error('Error adding dark portal link:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
  * PUT /api/dark-portal/admin/update/:id
 * Update an existing link
 */
router.put('/admin/update/:id', requireAdminOrModerator, adminAudit('dark_portal_update','dark_portal',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const { title, url, description, image, category, gameType, displayOrder, featured } = req.body;
    
    const link = await DarkPortalLink.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    // Update fields if provided
    if (title) link.title = title.trim();
    if (url) link.url = url.trim();
    if (description !== undefined) link.description = description.trim();
    if (image !== undefined) link.image = image.trim();
    if (category) link.category = category;
    if (gameType) link.gameType = gameType;
    if (displayOrder !== undefined) link.displayOrder = displayOrder;
    if (featured !== undefined) link.featured = featured;
    
    await link.save();
    
    res.json({ 
      success: true, 
      message: 'Link updated successfully',
      link
    });
  } catch (error) {
    console.error('Error updating dark portal link:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/dark-portal/admin/delete/:id
 * Delete a link
 */
router.delete('/admin/delete/:id', requireAdminOrModerator, adminAudit('dark_portal_delete','dark_portal',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const link = await DarkPortalLink.findByIdAndDelete(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dark portal link:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
