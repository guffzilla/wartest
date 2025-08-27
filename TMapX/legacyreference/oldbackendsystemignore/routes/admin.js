const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createUserWithDefaults } = require('../utils/oauthHelper');
const Match = require('../models/Match');
const War2Map = require('../models/War2Map');
const Dispute = require('../models/Dispute');
const { authenticate, requireAdmin, requireAdminOrModerator } = require('../middleware/auth');
const { adminAudit } = require('../middleware/adminAudit');
const multer = require('multer');
const path = require('path');
const dbBackup = require('../utils/dbBackup');
const Player = require('../models/Player');
const jwt = require('jsonwebtoken');
const AdminAuditLog = require('../models/AdminAuditLog');

// Use consolidated authentication middleware for admin routes
router.use(authenticate);
router.use(requireAdmin);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'mapFile') {
      // Allow map files
      const allowedTypes = ['.pud', '.w3x', '.w3m'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid map file type'));
      }
    } else if (file.fieldname === 'thumbnail') {
      // Allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image file type'));
      }
    } else {
      cb(null, true);
    }
  }
});

/**
 * GET /api/admin/audit-logs
 * List admin audit logs with filters and pagination
 */
router.get('/audit-logs', requireAdminOrModerator, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      actorUsername,
      action,
      targetType,
      status,
      from,
      to
    } = req.query;

    const filter = {};
    if (actorUsername) filter.actorUsername = new RegExp(actorUsername, 'i');
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) filter.createdAt.$gte = d;
      }
      if (to) {
        const d2 = new Date(to);
        if (!isNaN(d2.getTime())) filter.createdAt.$lte = d2;
      }
    }

    const pageNum = Math.max(1, parseInt(page));
    const lim = Math.min(200, Math.max(1, parseInt(limit)));

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim)
        .lean(),
      AdminAuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: pageNum,
        limit: lim,
        total,
        pages: Math.ceil(total / lim)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// === DASHBOARD ENDPOINTS ===

/**
 * Health check for admin API
 * GET /api/admin/health
 */
router.get('/health', requireAdmin, (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Admin API is working',
    user: {
      username: req.user.username,
      role: req.user.role
    }
  });
});

/**
 * Public health check (no auth required)
 * GET /api/admin/public-health
 */
router.get('/public-health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Admin API routes are accessible',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get dashboard statistics
 * GET /api/admin/dashboard-stats
 */
router.get('/dashboard-stats', requireAdmin, async (req, res) => {
  try {
    console.log('📊 Loading admin dashboard stats...');
    console.log('🔍 Request user:', req.user ? { username: req.user.username, role: req.user.role } : 'no user');
    console.log('🔍 Request headers:', req.headers);
    
    // Get current date for time-based calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // User statistics
    const totalUsers = await User.countDocuments();
    console.log(`🔍 ACTUAL USER COUNT: ${totalUsers}`);

    const usersThisMonth = await User.countDocuments({
      $or: [
        { createdAt: { $gte: startOfMonth } },
        { registeredAt: { $gte: startOfMonth } }
      ]
    });
    console.log(`🔍 Users this month: ${usersThisMonth}`);
    const usersLastMonth = await User.countDocuments({
      $or: [
        { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
        { registeredAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }
      ]
    });
    const newUsersToday = await User.countDocuments({
      $or: [
        { createdAt: { $gte: startOfToday } },
        { registeredAt: { $gte: startOfToday } }
      ]
    });
    
    const userGrowth = usersLastMonth > 0 ? 
      Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100) : 
      100;
    
    // Match statistics
    const totalMatches = await Match.countDocuments();
    const matchesThisMonth = await Match.countDocuments({ 
      createdAt: { $gte: startOfMonth } 
    });
    const matchesLastMonth = await Match.countDocuments({ 
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } 
    });
    const pendingMatches = await Match.countDocuments({ 
      status: 'pending' 
    });
    
    const matchGrowth = matchesLastMonth > 0 ? 
      Math.round(((matchesThisMonth - matchesLastMonth) / matchesLastMonth) * 100) : 
      100;
    
    // Tournament statistics (using mock data since tournaments might not be implemented)
    const activeTournaments = 3;
    const totalTournaments = 15;
    
    // Clan statistics (using mock data since clans might not be implemented)
    const totalClans = 8;
    const totalClanMembers = 156;
    
    // Dispute statistics (using mock data since disputes might not be implemented)
    const pendingDisputes = 2;
    
    // Report statistics (using mock data since reports might not be implemented)
    const pendingReports = 5;
    
    // Recent activity - get recent matches and user registrations
    const recentMatches = await Match.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(2)
      .select('username createdAt registeredAt')
      .lean();
    
    const recentActivity = [
      ...recentMatches.map(match => ({
        type: 'match_created',
        description: `New ${match.gameType || 'Unknown'} match created`,
        timestamp: match.createdAt,
        details: `Map: ${match.map?.name || 'Unknown'}`
      })),
      ...recentUsers.map(user => ({
        type: 'user_registered',
        description: `New user registered: ${user.username}`,
        timestamp: user.createdAt || user.registeredAt,
        details: null
      }))
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
    
    // System status (mock data for now)
    const systemStatus = {
      database: {
        status: 'healthy',
        responseTime: Math.floor(Math.random() * 50) + 10
      },
      storage: {
        status: 'healthy',
        usage: Math.floor(Math.random() * 30) + 45
      },
      api: {
        status: 'healthy',
        uptime: 99.8
      }
    };
    
    const stats = {
      users: {
        total: totalUsers,
        change: userGrowth,
        newToday: newUsersToday
      },
      matches: {
        total: totalMatches,
        change: matchGrowth,
        pending: pendingMatches
      },
      tournaments: {
        active: activeTournaments,
        total: totalTournaments
      },
      clans: {
        total: totalClans,
        members: totalClanMembers
      },
      disputes: {
        pending: pendingDisputes
      },
      reports: {
        pending: pendingReports
      },
      recentActivity: recentActivity,
      system: systemStatus
    };
    
    console.log('✅ Dashboard stats loaded successfully');
    res.json(stats);
    
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
});

// === USER MANAGEMENT ENDPOINTS ===

/**
 * Get all users with filtering and pagination
 * GET /api/admin/users
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    console.log('👥 Loading admin users list...');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    
    if (req.query.role && req.query.role !== 'all') {
      filter.role = req.query.role;
    }
    
    if (req.query.status && req.query.status !== 'all') {
      filter.accountStatus = req.query.status;
    }
    
    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { displayName: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get users with pagination
    const users = await User.find(filter)
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);
    
    // Get player counts for each user
    const usersWithPlayerCounts = await Promise.all(
      users.map(async (user) => {
        const playerCount = await Player.countDocuments({ user: user._id });
        return {
          ...user,
          playerCount,
          lastActive: user.lastActive || user.createdAt,
          registeredAt: user.registeredAt || user.createdAt
        };
      })
    );
    
    console.log(`✅ Loaded ${users.length} users (page ${page}/${totalPages})`);
    
    res.json({
      users: usersWithPlayerCounts,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error loading admin users:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

/**
 * Get user details
 * GET /api/admin/users/:id/details
 */
router.get('/users/:id/details', requireAdminOrModerator, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user statistics
    const matchesPlayed = await Match.countDocuments({
      'players.name': user.username
    });

    const wins = await Match.countDocuments({
      winner: user.username
    });

    const winRate = matchesPlayed > 0 ? ((wins / matchesPlayed) * 100).toFixed(1) : 0;

    res.json({
      ...user.toObject(),
      stats: {
        matchesPlayed,
        wins,
        winRate,
        currentRank: 'Unranked' // Implement based on your ranking system
      }
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

/**
 * Create new user
 * POST /api/admin/users
 */
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = createUserWithDefaults({
      username,
      email,
      password, // Should be hashed in the User model
      role: role || 'user',
      status: 'active',
      isUsernameDefined: true // Admin-created users have usernames defined
    });

    await user.save();
    
    // Auto-create WC1 player for admin-created user
    await createWC1PlayerForUser(user._id, username);
    
    res.status(201).json({ message: 'User created successfully', user: user.toObject() });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Update user
 * PUT /api/admin/users/:id
 */
router.put('/users/:id', requireAdmin, adminAudit('update_user','user',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const { username, email, role, accountStatus, permissions, arenaGold, honor } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Track changes for moderation history
    const changes = [];
    const oldRole = user.role;
    const oldStatus = user.accountStatus;

    if (username && username !== user.username) {
      const oldUsername = user.username;
      user.username = username;
      changes.push(`Username changed to ${username}`);
      
      // Sync WC1 player name if username changed
      if (oldUsername) {
        await syncWC1PlayerNameAndMatches(user._id, username);
      }
    }

    if (email && email !== user.email) {
      user.email = email;
      changes.push(`Email changed to ${email}`);
    }

    if (role && role !== user.role) {
      user.role = role;
      changes.push(`Role changed from ${oldRole} to ${role}`);
    }
    // Update currencies if provided
    const sanitizeNumber = (v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = Number(v);
      if (Number.isNaN(n)) return undefined;
      return Math.max(0, Math.floor(n));
    };
    const newGold = sanitizeNumber(arenaGold);
    if (newGold !== undefined && newGold !== user.arenaGold) {
      const oldGold = user.arenaGold || 0;
      user.arenaGold = newGold;
      changes.push(`ArenaGold changed ${oldGold} → ${newGold}`);
    }
    const newHonor = sanitizeNumber(honor);
    if (newHonor !== undefined && newHonor !== user.honor) {
      const oldHonor = user.honor || 0;
      user.honor = newHonor;
      changes.push(`Honor changed ${oldHonor} → ${newHonor}`);
    }

    if (accountStatus && accountStatus !== user.accountStatus) {
      user.accountStatus = accountStatus;
      changes.push(`Account status changed from ${oldStatus} to ${accountStatus}`);
    }

    // Update permissions if provided
    if (permissions) {
      if (!user.permissions) user.permissions = {};
      Object.assign(user.permissions, permissions);
      changes.push('Permissions updated');
    }

    // Add moderation history entry if there were changes
    if (changes.length > 0) {
      if (!user.moderationHistory) user.moderationHistory = [];
      user.moderationHistory.push({
        action: 'user_updated',
        reason: changes.join(', '),
        moderatorId: req.user._id,
        moderatorUsername: req.user.username,
        createdAt: new Date()
      });
    }

    await user.save();
    res.json({ message: 'User updated successfully', user: user.toObject() });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Update user permissions
 * PUT /api/admin/users/:id/permissions
 */
router.put('/users/:id/permissions', requireAdmin, adminAudit('update_user_permissions','user',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const { permissions } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize permissions if they don't exist
    if (!user.permissions) {
      user.permissions = {
        canReportMatches: true,
        canCreateTournaments: false,
        canUploadMaps: true,
        canUseChat: true,
        canCreateClans: true
      };
    }

    // Update specific permissions
    Object.assign(user.permissions, permissions);

    // Add moderation history entry
    if (!user.moderationHistory) user.moderationHistory = [];
    user.moderationHistory.push({
      action: 'permission_updated',
      reason: `Permissions updated: ${Object.keys(permissions).join(', ')}`,
      moderatorId: req.user._id,
      moderatorUsername: req.user.username,
      createdAt: new Date()
    });

    await user.save();
    res.json({
      message: 'User permissions updated successfully',
      permissions: user.permissions
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
});

/**
 * Ban user
 * PUT /api/admin/users/:id/ban
 */
router.put('/users/:id/ban', requireAdminOrModerator, adminAudit('ban_user','user',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const { reason, type = 'temporary', durationHours, until, scope = {} } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Moderators cannot modify admins or moderators
    if (req.user.role === 'moderator' && (user.role === 'admin' || user.role === 'moderator')) {
      return res.status(403).json({ error: 'Moderators cannot ban admins or moderators' });
    }

    // Update account status
    user.accountStatus = 'banned';

    // Initialize ban info if it doesn't exist
    if (!user.banInfo) user.banInfo = {};

    user.banInfo.isBanned = true;
    user.banInfo.type = type === 'permanent' ? 'permanent' : 'temporary';
    user.banInfo.bannedAt = new Date();
    user.banInfo.reason = reason || 'No reason provided';
    // Calculate bannedUntil
    if (user.banInfo.type === 'permanent') {
      user.banInfo.bannedUntil = null;
    } else {
      if (until) {
        const d = new Date(until);
        user.banInfo.bannedUntil = isNaN(d.getTime()) ? new Date(Date.now() + 24*60*60*1000) : d;
      } else if (durationHours && Number(durationHours) > 0) {
        user.banInfo.bannedUntil = new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000);
      } else {
        user.banInfo.bannedUntil = new Date(Date.now() + 24*60*60*1000); // default 24h
      }
    }
    // Scope defaults to all
    user.banInfo.scope = {
      chat: scope.chat !== false,
      reportMatches: scope.reportMatches !== false,
      postContent: scope.postContent !== false
    };

    // Add moderation history entry
    if (!user.moderationHistory) user.moderationHistory = [];
    user.moderationHistory.push({
      action: 'ban',
      reason: reason || 'No reason provided',
      moderatorId: req.user._id,
      moderatorUsername: req.user.username,
      duration: durationHours || null,
      expiresAt: user.banInfo.bannedUntil,
      createdAt: new Date()
    });

    await user.save();
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

/**
 * Unban user
 * PUT /api/admin/users/:id/unban
 */
router.put('/users/:id/unban', requireAdminOrModerator, adminAudit('unban_user','user',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (req.user.role === 'moderator' && (user.role === 'admin' || user.role === 'moderator')) {
      return res.status(403).json({ error: 'Moderators cannot unban admins or moderators' });
    }

    // Update account status
    user.accountStatus = 'active';

    // Update ban info
    if (user.banInfo) {
      user.banInfo.isBanned = false;
      user.banInfo.bannedUntil = null;
    }

    // Add moderation history entry
    if (!user.moderationHistory) user.moderationHistory = [];
    user.moderationHistory.push({
      action: 'unban',
      reason: 'Ban lifted by administrator',
      moderatorId: req.user._id,
      moderatorUsername: req.user.username,
      createdAt: new Date()
    });

    await user.save();
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

/**
 * Suspend user
 * PUT /api/admin/users/:id/suspend
 */
router.put('/users/:id/suspend', requireAdminOrModerator, adminAudit('suspend_user','user',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.status = 'suspended';
    await user.save();

    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

/**
 * Delete user account and all related data (admin version)
 * DELETE /api/admin/users/:id/delete-account
 */
router.delete('/users/:id/delete-account', requireAdmin, adminAudit('delete_account','user',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const userId = req.params.id;
    const UserDeletionService = require('../services/userDeletionService');

    // Get user info before deletion for logging
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🗑️ Admin ${req.user.username} deleting user account: ${user.username} (${userId})`);

    // Use the same deletion service as self-deletion
    const result = await UserDeletionService.deleteUserAndCleanup(userId);

    console.log(`✅ Admin user deletion completed successfully: ${user.username}`);

    res.json({
      success: true,
      message: `User account "${user.username}" deleted successfully`,
      cleanup: result
    });

  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: 'Failed to delete user account' });
  }
});

/**
 * Delete user (simple version - kept for compatibility)
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', requireAdmin, adminAudit('delete_user','user',(req,body)=>({request:req.body,response:body})), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.remove();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * Bulk user operations
 */
router.post('/users/bulk-suspend', requireAdminOrModerator, async (req, res) => {
  try {
    const { userIds } = req.body;
    await User.updateMany(
      { _id: { $in: userIds } },
      { status: 'suspended' }
    );
    res.json({ message: `${userIds.length} users suspended successfully` });
  } catch (error) {
    console.error('Error bulk suspending users:', error);
    res.status(500).json({ error: 'Failed to suspend users' });
  }
});

router.post('/users/bulk-ban', requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    await User.updateMany(
      { _id: { $in: userIds } },
      { status: 'banned' }
    );
    res.json({ message: `${userIds.length} users banned successfully` });
  } catch (error) {
    console.error('Error bulk banning users:', error);
    res.status(500).json({ error: 'Failed to ban users' });
  }
});

router.post('/users/bulk-activate', requireAdminOrModerator, async (req, res) => {
  try {
    const { userIds } = req.body;
    await User.updateMany(
      { _id: { $in: userIds } },
      { status: 'active' }
    );
    res.json({ message: `${userIds.length} users activated successfully` });
  } catch (error) {
    console.error('Error bulk activating users:', error);
    res.status(500).json({ error: 'Failed to activate users' });
  }
});

// === MATCH MANAGEMENT ENDPOINTS ===

/**
 * Get matches with pagination and filtering
 * GET /api/admin/matches
 */
router.get('/matches', requireAdmin, async (req, res) => {
  try {
    console.log('🎮 Loading admin matches list...');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    if (req.query.gameType && req.query.gameType !== 'all') {
      filter.gameType = req.query.gameType;
    }
    
    if (req.query.search) {
      // Search in map name or other searchable fields
      filter.$or = [
        { mapName: { $regex: req.query.search, $options: 'i' } },
        { gameType: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get matches with pagination - simplified without problematic populates
    const matches = await Match.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const totalMatches = await Match.countDocuments(filter);
    const totalPages = Math.ceil(totalMatches / limit);
    
    // Format matches for admin display
    const formattedMatches = matches.map(match => ({
      ...match,
      playerNames: match.players ? match.players.map(p => p.name || 'Unknown').join(', ') : 'Unknown',
      winnerName: match.winner || 'TBD',
      screenshotCount: match.screenshots ? match.screenshots.length : 0,
      duration: match.endTime && match.startTime ? 
        Math.round((new Date(match.endTime) - new Date(match.startTime)) / 60000) : null
    }));
    
    console.log(`✅ Loaded ${matches.length} matches (page ${page}/${totalPages})`);
    
    res.json({
      matches: formattedMatches,
      pagination: {
        currentPage: page,
        totalPages,
        totalMatches,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error loading admin matches:', error);
    res.status(500).json({ error: 'Failed to load matches' });
  }
});

/**
 * Verify match
 * PUT /api/admin/matches/:id/verify
 */
router.put('/matches/:id/verify', requireAdminOrModerator, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    match.verification = {
      status: 'verified',
      verifiedBy: req.user._id,
      verifiedAt: new Date()
    };

    await match.save();
    res.json({ message: 'Match verified successfully' });
  } catch (error) {
    console.error('Error verifying match:', error);
    res.status(500).json({ error: 'Failed to verify match' });
  }
});

/**
 * Reject match
 * PUT /api/admin/matches/:id/reject
 */
router.put('/matches/:id/reject', requireAdminOrModerator, async (req, res) => {
  try {
    const { reason } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    match.verification = {
      status: 'rejected',
      rejectedBy: req.user._id,
      rejectedAt: new Date(),
      reason
    };

    await match.save();
    res.json({ message: 'Match rejected successfully' });
  } catch (error) {
    console.error('Error rejecting match:', error);
    res.status(500).json({ error: 'Failed to reject match' });
  }
});

/**
 * Delete match
 * DELETE /api/admin/matches/:id
 */
router.delete('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    await match.remove();
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

/**
 * Get match screenshots
 * GET /api/admin/matches/:id/screenshots
 */
router.get('/matches/:id/screenshots', requireAdminOrModerator, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ screenshots: match.screenshots || [] });
  } catch (error) {
    console.error('Error getting match screenshots:', error);
    res.status(500).json({ error: 'Failed to get screenshots' });
  }
});

/**
 * Bulk match operations
 */
router.post('/matches/bulk-verify', requireAdminOrModerator, async (req, res) => {
  try {
    const { matchIds } = req.body;
    await Match.updateMany(
      { _id: { $in: matchIds } },
      { 
        'verification.status': 'verified',
        'verification.verifiedBy': req.user._id,
        'verification.verifiedAt': new Date()
      }
    );
    res.json({ message: `${matchIds.length} matches verified successfully` });
  } catch (error) {
    console.error('Error bulk verifying matches:', error);
    res.status(500).json({ error: 'Failed to verify matches' });
  }
});

router.post('/matches/bulk-reject', requireAdminOrModerator, async (req, res) => {
  try {
    const { matchIds, reason } = req.body;
    await Match.updateMany(
      { _id: { $in: matchIds } },
      { 
        'verification.status': 'rejected',
        'verification.rejectedBy': req.user._id,
        'verification.rejectedAt': new Date(),
        'verification.reason': reason
      }
    );
    res.json({ message: `${matchIds.length} matches rejected successfully` });
  } catch (error) {
    console.error('Error bulk rejecting matches:', error);
    res.status(500).json({ error: 'Failed to reject matches' });
  }
});

router.post('/matches/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { matchIds } = req.body;
    await Match.deleteMany({ _id: { $in: matchIds } });
    res.json({ message: `${matchIds.length} matches deleted successfully` });
  } catch (error) {
    console.error('Error bulk deleting matches:', error);
    res.status(500).json({ error: 'Failed to delete matches' });
  }
});

// === DISPUTE MANAGEMENT ENDPOINTS ===

/**
 * Get all disputes
 * GET /api/admin/disputes
 */
router.get('/disputes', requireAdminOrModerator, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    if (req.query.type && req.query.type !== 'all') {
      filter.disputeType = req.query.type;
    }
    if (req.query.priority && req.query.priority !== 'all') {
      filter.priority = req.query.priority;
    }

    const disputes = await Dispute.find(filter)
      .populate('reportedBy', 'username')
      .populate('match', 'matchType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Dispute.countDocuments(filter);

    res.json({
      disputes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting disputes:', error);
    res.status(500).json({ error: 'Failed to get disputes' });
  }
});

/**
 * Get dispute details
 * GET /api/admin/disputes/:id
 */
router.get('/disputes/:id', requireAdminOrModerator, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('reportedBy', 'username')
      .populate('match');

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json(dispute);
  } catch (error) {
    console.error('Error getting dispute:', error);
    res.status(500).json({ error: 'Failed to get dispute' });
  }
});

/**
 * Resolve dispute
 * PUT /api/admin/disputes/:id/resolve
 */
router.put('/disputes/:id/resolve', requireAdminOrModerator, async (req, res) => {
  try {
    const { resolution } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();

    await dispute.save();
    res.json({ message: 'Dispute resolved successfully' });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

/**
 * Reject dispute
 * PUT /api/admin/disputes/:id/reject
 */
router.put('/disputes/:id/reject', requireAdminOrModerator, async (req, res) => {
  try {
    const { reason } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    dispute.status = 'rejected';
    dispute.rejectionReason = reason;
    dispute.rejectedBy = req.user._id;
    dispute.rejectedAt = new Date();

    await dispute.save();
    res.json({ message: 'Dispute rejected successfully' });
  } catch (error) {
    console.error('Error rejecting dispute:', error);
    res.status(500).json({ error: 'Failed to reject dispute' });
  }
});

// === MAP MANAGEMENT ENDPOINTS ===

/**
 * Get maps with pagination and filtering
 * GET /api/admin/maps
 */
router.get('/maps', requireAdmin, async (req, res) => {
  try {
    console.log('🗺️ Loading admin maps list...');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    
    if (req.query.gameType && req.query.gameType !== 'all') {
      filter.gameType = req.query.gameType;
    }
    
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { originalName: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get maps with pagination
    const maps = await Map.find(filter)
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const totalMaps = await Map.countDocuments(filter);
    const totalPages = Math.ceil(totalMaps / limit);
    
    // Get usage statistics for each map
    const mapsWithStats = await Promise.all(
      maps.map(async (map) => {
        const matchCount = await Match.countDocuments({ 'map.name': map.name });
        return {
          ...map,
          matchCount,
          uploaderName: map.uploadedBy?.username || 'System',
          fileSize: map.fileSize || 0,
          downloadCount: map.downloadCount || 0
        };
      })
    );
    
    console.log(`✅ Loaded ${maps.length} maps (page ${page}/${totalPages})`);
    
    res.json({
      maps: mapsWithStats,
      pagination: {
        currentPage: page,
        totalPages,
        totalMaps,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error loading admin maps:', error);
    res.status(500).json({ error: 'Failed to load maps' });
  }
});

/**
 * Upload new map
 * POST /api/admin/maps
 */
router.post('/maps', requireAdminOrModerator, upload.fields([
  { name: 'mapFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, type, size, gameType } = req.body;
    
    const mapData = {
      name,
      type,
      size,
      gameType,
      status: 'pending',
      uploadedBy: req.user._id
    };

    if (req.files.mapFile) {
      mapData.filePath = req.files.mapFile[0].path;
    }

    if (req.files.thumbnail) {
      mapData.thumbnailPath = req.files.thumbnail[0].path;
    }

    const map = new War2Map(mapData);
    await map.save();

    res.status(201).json({ message: 'Map uploaded successfully', map });
  } catch (error) {
    console.error('Error uploading map:', error);
    res.status(500).json({ error: 'Failed to upload map' });
  }
});

/**
 * Get map details
 * GET /api/admin/maps/:id/details
 */
router.get('/maps/:id/details', requireAdminOrModerator, async (req, res) => {
  try {
    const map = await War2Map.findById(req.params.id)
      .populate('uploadedBy', 'username');

    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    res.json(map);
  } catch (error) {
    console.error('Error getting map details:', error);
    res.status(500).json({ error: 'Failed to get map details' });
  }
});

/**
 * Update map
 * PUT /api/admin/maps/:id
 */
router.put('/maps/:id', requireAdminOrModerator, async (req, res) => {
  try {
    const { name, type, status } = req.body;
    const map = await War2Map.findById(req.params.id);
    
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    if (name) map.name = name;
    if (type) map.type = type;
    if (status) map.status = status;

    await map.save();
    res.json({ message: 'Map updated successfully', map });
  } catch (error) {
    console.error('Error updating map:', error);
    res.status(500).json({ error: 'Failed to update map' });
  }
});

/**
 * Toggle map status
 * PUT /api/admin/maps/:id/toggle-status
 */
router.put('/maps/:id/toggle-status', requireAdminOrModerator, async (req, res) => {
  try {
    const map = await War2Map.findById(req.params.id);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    map.status = map.status === 'active' ? 'disabled' : 'active';
    await map.save();

    res.json({ message: 'Map status updated successfully', status: map.status });
  } catch (error) {
    console.error('Error toggling map status:', error);
    res.status(500).json({ error: 'Failed to update map status' });
  }
});

/**
 * Delete map
 * DELETE /api/admin/maps/:id
 */
router.delete('/maps/:id', requireAdmin, async (req, res) => {
  try {
    const map = await War2Map.findById(req.params.id);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    await map.remove();
    res.json({ message: 'Map deleted successfully' });
  } catch (error) {
    console.error('Error deleting map:', error);
    res.status(500).json({ error: 'Failed to delete map' });
  }
});

/**
 * Bulk map operations
 */
router.post('/maps/bulk-activate', requireAdminOrModerator, async (req, res) => {
  try {
    const { mapIds } = req.body;
    await War2Map.updateMany(
      { _id: { $in: mapIds } },
      { status: 'active' }
    );
    res.json({ message: `${mapIds.length} maps activated successfully` });
  } catch (error) {
    console.error('Error bulk activating maps:', error);
    res.status(500).json({ error: 'Failed to activate maps' });
  }
});

router.post('/maps/bulk-disable', requireAdminOrModerator, async (req, res) => {
  try {
    const { mapIds } = req.body;
    await War2Map.updateMany(
      { _id: { $in: mapIds } },
      { status: 'disabled' }
    );
    res.json({ message: `${mapIds.length} maps disabled successfully` });
  } catch (error) {
    console.error('Error bulk disabling maps:', error);
    res.status(500).json({ error: 'Failed to disable maps' });
  }
});

router.post('/maps/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { mapIds } = req.body;
    await War2Map.deleteMany({ _id: { $in: mapIds } });
    res.json({ message: `${mapIds.length} maps deleted successfully` });
  } catch (error) {
    console.error('Error bulk deleting maps:', error);
    res.status(500).json({ error: 'Failed to delete maps' });
  }
});

// === SYSTEM SETTINGS ENDPOINTS ===

/**
 * Get system settings
 * GET /api/admin/settings
 */
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    // Return default settings - implement based on your settings storage
    const settings = {
      general: {
        siteName: 'Warcraft Arena',
        siteDescription: 'Premier Warcraft gaming platform',
        maintenanceMode: false,
        registrationEnabled: true
      },
      matches: {
        autoVerify: false,
        editWindow: 24,
        requiredScreenshots: 1,
        maxFileSize: 10
      },
      tournaments: {
        maxPerUser: 3,
        creationCost: 100,
        autoStart: true
      },
      clans: {
        creationCost: 500,
        maxMembers: 50,
        maxTagLength: 5
      },
      achievements: {
        notifications: true,
        retroactive: false,
        baseExperience: 100
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * Update system settings
 * PUT /api/admin/settings
 */
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    // Implement settings update based on your storage method
    // This could be database, config file, or environment variables
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * Reset settings to defaults
 * POST /api/admin/settings/reset
 */
router.post('/settings/reset', requireAdmin, async (req, res) => {
  try {
    // Implement settings reset logic
    
    res.json({ message: 'Settings reset to defaults successfully' });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

// === UTILITY ENDPOINTS ===

/**
 * Flag screenshot
 * POST /api/admin/screenshots/flag
 */
router.post('/screenshots/flag', requireAdminOrModerator, async (req, res) => {
  try {
    const { url } = req.body;
    
    // Implement screenshot flagging logic
    // This could involve adding to a flagged screenshots collection
    
    res.json({ message: 'Screenshot flagged successfully' });
  } catch (error) {
    console.error('Error flagging screenshot:', error);
    res.status(500).json({ error: 'Failed to flag screenshot' });
  }
});

/**
 * Export system report
 * GET /api/admin/export/system-report
 */
router.get('/export/system-report', requireAdmin, async (req, res) => {
  try {
    // Generate comprehensive system report
    const report = {
      generatedAt: new Date(),
      users: await User.countDocuments(),
      matches: await Match.countDocuments(),
      disputes: await Dispute.countDocuments(),
      maps: await War2Map.countDocuments()
    };

    res.json(report);
  } catch (error) {
    console.error('Error generating system report:', error);
    res.status(500).json({ error: 'Failed to generate system report' });
  }
});

// === TOURNAMENT MANAGEMENT ENDPOINTS ===

/**
 * Get all tournaments
 * GET /api/admin/tournaments
 */
router.get('/tournaments', requireAdminOrModerator, async (req, res) => {
  try {
    // Placeholder - implement based on your tournament model
    const tournaments = [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Summer Championship',
        organizer: { username: 'admin' },
        type: 'single_elimination',
        participants: [],
        maxParticipants: 16,
        prizePool: 500,
        status: 'upcoming',
        startDate: new Date()
      }
    ];

    res.json(tournaments);
  } catch (error) {
    console.error('Error getting tournaments:', error);
    res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

// === CLAN MANAGEMENT ENDPOINTS ===

/**
 * Get all clans
 * GET /api/admin/clans
 */
router.get('/clans', requireAdminOrModerator, async (req, res) => {
  try {
    // Placeholder - implement based on your clan model
    const clans = [
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Elite Warriors',
        tag: 'EW',
        leader: { username: 'clanleader' },
        members: [],
        maxMembers: 50,
        status: 'active',
        rating: 1500,
        createdAt: new Date()
      }
    ];

    res.json(clans);
  } catch (error) {
    console.error('Error getting clans:', error);
    res.status(500).json({ error: 'Failed to get clans' });
  }
});

// === ACHIEVEMENT MANAGEMENT ENDPOINTS ===

/**
 * Get all achievements
 * GET /api/admin/achievements
 */
router.get('/achievements', requireAdminOrModerator, async (req, res) => {
  try {
    // Placeholder - implement based on your achievement model
    const achievements = [
      {
        _id: '507f1f77bcf86cd799439013',
        name: 'First Victory',
        description: 'Win your first match',
        category: 'matches',
        difficulty: 'easy',
        points: 10,
        unlockedBy: [],
        createdAt: new Date()
      }
    ];

    res.json(achievements);
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// === CONTENT MANAGEMENT ENDPOINTS ===

/**
 * Get all content
 * GET /api/admin/content
 */
router.get('/content', requireAdminOrModerator, async (req, res) => {
  try {
    // Placeholder - implement based on your content model
    const content = [
      {
        _id: '507f1f77bcf86cd799439014',
        title: 'Welcome to Warcraft Arena',
        excerpt: 'Getting started guide for new players',
        type: 'guide',
        author: { username: 'admin' },
        status: 'published',
        views: 1250,
        createdAt: new Date()
      }
    ];

    res.json(content);
  } catch (error) {
    console.error('Error getting content:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// === ANALYTICS ENDPOINTS ===

/**
 * Get analytics data
 * GET /api/admin/analytics
 */
router.get('/analytics', requireAdminOrModerator, async (req, res) => {
  try {
    // Generate analytics data
    const analytics = {
      userGrowth: {
        current: await User.countDocuments(),
        change: 15.2
      },
      matchActivity: {
        current: await Match.countDocuments(),
        change: 8.7
      },
      revenue: {
        current: 2450,
        change: 12.3
      },
      engagement: {
        current: 78.5,
        change: 5.1
      },
      recentReports: [
        {
          _id: '507f1f77bcf86cd799439015',
          name: 'Monthly User Report',
          createdAt: new Date()
        }
      ]
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// === MODERATION ENDPOINTS ===

/**
 * Get moderation data
 * GET /api/admin/moderation
 */
router.get('/moderation', requireAdminOrModerator, async (req, res) => {
  try {
    // Generate moderation data
    const moderation = {
      pendingReports: 5,
      flaggedContent: 3,
      appeals: 2,
      bannedUsers: 12,
      rules: [
        {
          _id: '507f1f77bcf86cd799439016',
          name: 'No Spam',
          description: 'Prevent spam messages in chat',
          active: true
        }
      ],
      recentActivity: [
        {
          type: 'user_banned',
          description: 'User banned for inappropriate behavior',
          moderator: 'admin',
          timestamp: new Date()
        }
      ]
    };

    res.json(moderation);
  } catch (error) {
    console.error('Error getting moderation data:', error);
    res.status(500).json({ error: 'Failed to get moderation data' });
  }
});

// Database backup endpoints
router.post('/backup/create', requireAdmin, async (req, res) => {
  try {
    console.log('🔄 Admin requested database backup');
    
    const result = await dbBackup.createBackup();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Database backup created successfully',
        backup: {
          name: result.backupName,
          timestamp: result.timestamp,
          size: dbBackup.formatSize(result.size),
          path: result.backupPath
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Backup failed',
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating backup',
      details: error.message
    });
  }
});

router.get('/backup/list', requireAdmin, async (req, res) => {
  try {
    const backups = await dbBackup.listBackups();
    
    res.json({
      success: true,
      backups: backups,
      count: backups.length
    });
    
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      error: 'Error listing backups',
      details: error.message
    });
  }
});

router.delete('/backup/:backupName', requireAdmin, async (req, res) => {
  try {
    const { backupName } = req.params;
    
    const result = await dbBackup.deleteBackup(backupName);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting backup',
      details: error.message
    });
  }
});

// User impersonation endpoints
router.post('/impersonate/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🎭 Admin ${req.user.username} impersonating user ${userId}`);
    
    // Get the target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Store original admin info in session
    if (!req.session.originalAdmin) {
      req.session.originalAdmin = {
        userId: req.user._id,
        username: req.user.username
      };
    }
    
    // Set impersonated user as current user
    req.session.impersonatedUser = {
      userId: targetUser._id,
      username: targetUser.username
    };
    
    // Update session auth
    req.session.isAuthenticated = true;
    req.session.userId = targetUser._id.toString();
    
    res.json({
      success: true,
      message: `Now impersonating ${targetUser.username}`,
      impersonatedUser: {
        id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email
      },
      originalAdmin: req.session.originalAdmin
    });
    
  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

router.post('/stop-impersonation', requireAdmin, async (req, res) => {
  try {
    if (!req.session.originalAdmin) {
      return res.status(400).json({ error: 'Not currently impersonating' });
    }
    
    console.log(`🎭 Stopping impersonation, returning to admin ${req.session.originalAdmin.username}`);
    
    // Restore original admin session
    req.session.isAuthenticated = true;
    req.session.userId = req.session.originalAdmin.userId.toString();
    
    // Clear impersonation data
    delete req.session.impersonatedUser;
    delete req.session.originalAdmin;
    
    res.json({
      success: true,
      message: 'Stopped impersonation, returned to admin account'
    });
    
  } catch (error) {
    console.error('Error stopping impersonation:', error);
    res.status(500).json({ error: 'Failed to stop impersonation' });
  }
});

router.get('/impersonation-status', requireAdmin, (req, res) => {
  res.json({
    isImpersonating: !!req.session.impersonatedUser,
    impersonatedUser: req.session.impersonatedUser || null,
    originalAdmin: req.session.originalAdmin || null
  });
});

// Get list of users for impersonation
router.get('/users-for-impersonation', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, {
      username: 1,
      email: 1,
      createdAt: 1,
      lastActive: 1
    }).sort({ username: 1 });
    
    res.json({ users });
    
  } catch (error) {
    console.error('Error fetching users for impersonation:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Auto-create WC1 player for user
 */
async function createWC1PlayerForUser(userId, username) {
  try {
    // Check if WC1 player already exists
    const existingPlayer = await Player.findOne({
      user: userId,
      gameType: 'wc1'
    });

    if (existingPlayer) {
      console.log(`✅ WC1 player already exists for user ${username}`);
      return existingPlayer;
    }

    // Create new WC1 player
    const wc1Player = new Player({
      name: username,
      user: userId,
      gameType: 'wc1',
      mmr: 1200, // Default MMR for WC1
      wins: 0,
      losses: 0,
      isActive: true,
      autoCreated: true,
      createdAt: new Date()
    });

    await wc1Player.save();
    console.log(`✅ Auto-created WC1 player for admin-created user ${username}`);
    return wc1Player;
  } catch (error) {
    console.error(`❌ Error creating WC1 player for user ${username}:`, error);
    // Don't throw error - user creation should succeed even if player creation fails
  }
}

/**
 * Sync WC1 player name and update all related match records
 */
async function syncWC1PlayerNameAndMatches(userId, newUsername) {
  try {
    // Find user's WC1 player
    const player = await Player.findOne({ 
      user: userId, 
      gameType: 'wc1' 
    });
    
    if (!player) {
      console.log(`ℹ️ No WC1 player found for user ${newUsername} - creating one`);
      
      // Create new WC1 player if it doesn't exist
      const wc1Player = new Player({
        name: newUsername,
        user: userId,
        gameType: 'wc1',
        mmr: 1200, // Default MMR for WC1
        wins: 0,
        losses: 0,
        isActive: true,
        autoCreated: true,
        createdAt: new Date()
      });

      await wc1Player.save();
      console.log(`✅ Auto-created WC1 player for user ${newUsername}`);
      return;
    }
    
    // Check if name already matches
    if (player.name === newUsername) {
      console.log(`✅ WC1 player name already matches username: ${newUsername}`);
      return;
    }
    
    const oldName = player.name;
    
    // Update player name
    player.name = newUsername;
    await player.save();
    
    // Update all match records that reference this player
    const matchUpdateResult = await Match.updateMany(
      {
        'players.playerId': player._id,
        gameType: 'wc1'
      },
      {
        $set: {
          'players.$.name': newUsername
        }
      }
    );
    
    console.log(`✅ Synced WC1 player name: "${oldName}" → "${newUsername}"`);
    console.log(`✅ Updated ${matchUpdateResult.modifiedCount} match records`);
    
  } catch (error) {
    console.error(`❌ Error syncing WC1 player name for user ${newUsername}:`, error);
    // Don't throw error - username change should succeed even if sync fails
  }
}

module.exports = router; 
