const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Track download events
router.post('/track', (req, res) => {
  try {
    const { platform, timestamp, userAgent } = req.body;
    
    // Log download for analytics
    console.log('Download tracked:', {
      platform,
      timestamp,
      userAgent: userAgent ? userAgent.substring(0, 100) : 'Unknown',
      ip: req.ip,
      sessionId: req.sessionID
    });
    
    // Here you could save to database for analytics
    // Example:
    // const Download = require('../models/Download');
    // await Download.create({
    //   platform,
    //   timestamp: new Date(timestamp),
    //   userAgent,
    //   ipAddress: req.ip,
    //   sessionId: req.sessionID
    // });
    
    res.json({ success: true, message: 'Download tracked' });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ success: false, error: 'Failed to track download' });
  }
});

// Get download statistics (optional - for admin dashboard)
router.get('/stats', (req, res) => {
  // This would require authentication/admin check in a real app
  try {
    // Return mock data for now - replace with real database queries
    const stats = {
      totalDownloads: 0,
      platformBreakdown: {
        Windows: 0,
        macOS: 0,
        Linux: 0
      },
      recentDownloads: []
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting download stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// Serve download files with proper headers
router.get('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const downloadsPath = path.join(__dirname, '../../frontend/downloads');
    const filePath = path.join(downloadsPath, filename);
    
    // Security check - make sure file is in downloads directory
    const normalizedPath = path.normalize(filePath);
    const normalizedDownloadsPath = path.normalize(downloadsPath);
    
    if (!normalizedPath.startsWith(normalizedDownloadsPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
    
    console.log(`File download started: ${filename} (${stats.size} bytes)`);
    
  } catch (error) {
    console.error('Error serving download file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

module.exports = router; 