const express = require('express');
const router = express.Router();
const Clan = require('../models/Clan');
const Player = require('../models/Player');
const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

/**
 * Get all clans (public directory)
 * GET /api/clans
 */
router.get('/', async (req, res) => {
  try {
    const { search = '', gameType = 'all', page = 1, limit = 12 } = req.query;
    
    const clans = await Clan.searchClans(search, gameType, parseInt(page), parseInt(limit));
    const totalClans = await Clan.countDocuments({
      status: 'active',
      'settings.showInDirectory': true,
      ...(gameType !== 'all' && { gameType }),
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { tag: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      })
    });
    
    const totalPages = Math.ceil(totalClans / parseInt(limit));
    
    res.json({
      clans,
      pagination: {
        page: parseInt(page),
        pages: totalPages,
        total: totalClans,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching clans:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user's clans
 * GET /api/clans/user
 */
router.get('/user', ensureAuthenticated, async (req, res) => {
  try {
    const { gameType } = req.query;
    
    const clans = await Clan.findByUser(req.user.id, gameType)
      .populate('leader', 'username displayName')
      .populate('members.user', 'username displayName')
      .populate('members.player', 'name mmr');
    
    res.json(clans);
  } catch (error) {
    console.error('Error fetching user clans:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get specific clan details
 * GET /api/clans/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id)
      .populate('leader', 'username displayName avatar')
      .populate('members.user', 'username displayName avatar')
      .populate('members.player', 'name mmr rank');
    
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check if user can view this clan
    if (clan.status !== 'active' && (!req.user || !clan.isMember(req.user.id))) {
      return res.status(403).json({ error: 'Clan not accessible' });
    }
    
    res.json(clan);
  } catch (error) {
    console.error('Error fetching clan:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Create a new clan
 * POST /api/clans
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { name, tag, description, gameType, recruitmentType, playerId } = req.body;
    
    // Validate required fields
    if (!name || !tag || !playerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate player ownership
    const player = await Player.findOne({ _id: playerId, user: req.user.id });
    if (!player) {
      return res.status(400).json({ error: 'Player not found or not owned by user' });
    }
    
    // Check if user is already in a clan (one clan per user)
    const existingClan = await Clan.findOne({
      'members.user': req.user.id,
      status: 'active'
    });
    
    if (existingClan) {
      return res.status(400).json({ error: 'You are already in a clan. You must leave your current clan before creating a new one.' });
    }
    
    // Check if clan tag is already taken (global unique tags)
    const existingTag = await Clan.findOne({ 
      tag: tag.trim().toUpperCase(), 
      status: 'active' 
    });
    if (existingTag) {
      return res.status(400).json({ error: 'Clan tag already exists' });
    }
    
    // Create chat room for clan
    const chatRoom = new ChatRoom({
      name: `${name} Clan Chat`,
      isPrivate: true,
      createdBy: req.user.id
    });
    await chatRoom.save();
    
    // Create clan
    const clan = new Clan({
      name: name.trim(),
      tag: tag.trim().toUpperCase(),
      description: description?.trim() || '',
      gameType: gameType || 'multi',
      leader: req.user.id,
      recruitmentType: recruitmentType || 'application',
      chatRoom: chatRoom._id
    });
    
    // Add creator as leader member
    clan.addMember(req.user.id, playerId, 'leader');
    
    await clan.save();
    
    // Populate the response
    await clan.populate('leader', 'username displayName');
    await clan.populate('members.user', 'username displayName');
    await clan.populate('members.player', 'name mmr');
    
    // Award "Clan Founder" achievement
    try {
      const AchievementService = require('../services/achievementService');
      await AchievementService.awardAchievement(req.user.id, 'clan_founder');
      console.log(`🏆 Awarded "Clan Founder" achievement to user ${req.user.username}`);
    } catch (achievementError) {
      console.error('❌ Failed to award Clan Founder achievement:', achievementError);
      // Don't fail the entire request if achievement fails
    }
    
    res.status(201).json(clan);
  } catch (error) {
    console.error('Error creating clan:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Clan tag already exists for this game type' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Apply to join a clan
 * POST /api/clans/:id/apply
 */
router.post('/:id/apply', ensureAuthenticated, async (req, res) => {
  try {
    const { playerId, message } = req.body;
    
    if (!playerId || !message) {
      return res.status(400).json({ error: 'Player ID and message are required' });
    }
    
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Validate player ownership
    const player = await Player.findOne({ _id: playerId, user: req.user.id });
    if (!player) {
      return res.status(400).json({ error: 'Player not found or not owned by user' });
    }
    
    // Check if user is already a member
    if (clan.isMember(req.user.id)) {
      return res.status(400).json({ error: 'You are already a member of this clan' });
    }
    
    // Check if user already has a pending application
    const existingApplication = clan.applications.find(
      app => app.user.toString() === req.user.id && app.status === 'pending'
    );
    
    if (existingApplication) {
      return res.status(400).json({ error: 'You already have a pending application' });
    }
    
    // Check if clan allows applications
    if (clan.recruitmentType === 'invite') {
      return res.status(400).json({ error: 'This clan is invite-only' });
    }
    
    // Add application
    clan.applications.push({
      user: req.user.id,
      player: playerId,
      message: message.trim()
    });
    
    await clan.save();
    
    // Notify clan admins
    const adminMembers = clan.members.filter(member => 
      member.role === 'leader' || member.role === 'admin'
    );
    
    for (const admin of adminMembers) {
      await Notification.create({
        user: admin.user,
        type: 'clan_application',
        title: 'New Clan Application',
        message: `${req.user.username} has applied to join ${clan.name}`,
        data: {
          clanId: clan._id,
          clanName: clan.name,
          applicantId: req.user.id,
          applicantName: req.user.username,
          playerId: playerId
        }
      });
    }
    
    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Error applying to clan:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Invite player to clan
 * POST /api/clans/:id/invite
 */
router.post('/:id/invite', ensureAuthenticated, async (req, res) => {
  try {
    const { playerId, message } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }
    
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check permissions
    if (!clan.canManageMembers(req.user.id)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Get player and their user
    const player = await Player.findById(playerId).populate('user');
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if user is already a member
    if (clan.isMember(player.user._id)) {
      return res.status(400).json({ error: 'Player is already a member of this clan' });
    }
    
    // Check if there's already a pending invite
    const existingInvite = clan.invites.find(
      invite => invite.user.toString() === player.user._id.toString() && 
                invite.status === 'pending'
    );
    
    if (existingInvite) {
      return res.status(400).json({ error: 'Player already has a pending invite' });
    }
    
    // Add invite
    clan.invites.push({
      user: player.user._id,
      player: playerId,
      invitedBy: req.user.id,
      message: message?.trim() || ''
    });
    
    await clan.save();
    
    // Notify the invited user
    await Notification.create({
      user: player.user._id,
      type: 'clan_invite',
      title: 'Clan Invitation',
      message: `You have been invited to join ${clan.name}`,
      data: {
        clanId: clan._id,
        clanName: clan.name,
        clanTag: clan.tag,
        invitedBy: req.user.username,
        playerId: playerId
      }
    });
    
    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error inviting to clan:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Respond to clan invite
 * POST /api/clans/:id/invite/respond
 */
router.post('/:id/invite/respond', ensureAuthenticated, async (req, res) => {
  try {
    const { response } = req.body; // 'accept' or 'decline'
    
    if (!['accept', 'decline'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response' });
    }
    
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Find the invite
    const invite = clan.invites.find(
      inv => inv.user.toString() === req.user.id && inv.status === 'pending'
    );
    
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found or already responded' });
    }
    
    // Update invite status
    invite.status = response === 'accept' ? 'accepted' : 'declined';
    invite.respondedAt = new Date();
    
    if (response === 'accept') {
      // Add user to clan
      try {
        clan.addMember(req.user.id, invite.player, 'member', invite.invitedBy);
        
        // Award "Brotherhood" achievement for joining first clan
        try {
          const AchievementService = require('../services/achievementService');
          await AchievementService.awardAchievement(req.user.id, 'brotherhood');
          console.log(`🏆 Awarded "Brotherhood" achievement to user ${req.user.username} for joining clan ${clan.name}`);
        } catch (achievementError) {
          console.error('❌ Failed to award Brotherhood achievement:', achievementError);
          // Don't fail the entire request if achievement fails
        }
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }
    
    await clan.save();
    
    // Notify clan admins
    const adminMembers = clan.members.filter(member => 
      member.role === 'leader' || member.role === 'admin'
    );
    
    for (const admin of adminMembers) {
      await Notification.create({
        user: admin.user,
        type: 'clan_invite_response',
        title: `Clan Invite ${response === 'accept' ? 'Accepted' : 'Declined'}`,
        message: `${req.user.username} has ${response}ed the invitation to join ${clan.name}`,
        data: {
          clanId: clan._id,
          clanName: clan.name,
          responderId: req.user.id,
          responderName: req.user.username,
          response
        }
      });
    }
    
    res.json({ message: `Invite ${response}ed successfully` });
  } catch (error) {
    console.error('Error responding to clan invite:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Review clan application
 * POST /api/clans/:id/applications/:applicationId/review
 */
router.post('/:id/applications/:applicationId/review', ensureAuthenticated, async (req, res) => {
  try {
    const { decision, note } = req.body; // 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }
    
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check permissions
    if (!clan.canManageMembers(req.user.id)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Find the application
    const application = clan.applications.id(req.params.applicationId);
    if (!application || application.status !== 'pending') {
      return res.status(404).json({ error: 'Application not found or already reviewed' });
    }
    
    // Update application
    application.status = decision === 'approve' ? 'approved' : 'rejected';
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    application.reviewNote = note?.trim() || '';
    
    if (decision === 'approve') {
      // Add user to clan
      try {
        clan.addMember(application.user, application.player, 'member');
        
        // Award "Brotherhood" achievement for joining first clan
        try {
          const AchievementService = require('../services/achievementService');
          await AchievementService.awardAchievement(application.user, 'brotherhood');
          console.log(`🏆 Awarded "Brotherhood" achievement to user for joining clan ${clan.name}`);
        } catch (achievementError) {
          console.error('❌ Failed to award Brotherhood achievement:', achievementError);
          // Don't fail the entire request if achievement fails
        }
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }
    
    await clan.save();
    
    // Notify the applicant
    await Notification.create({
      user: application.user,
      type: 'clan_application_response',
      title: `Clan Application ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your application to join ${clan.name} has been ${decision}ed`,
      data: {
        clanId: clan._id,
        clanName: clan.name,
        decision,
        note: application.reviewNote
      }
    });
    
    res.json({ message: `Application ${decision}ed successfully` });
  } catch (error) {
    console.error('Error reviewing application:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get clan members
 * GET /api/clans/:id/members
 */
router.get('/:id/members', async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id)
      .populate('members.user', 'username displayName avatar')
      .populate('members.player', 'name mmr rank gameType stats');
    
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check if user can view members
    if (clan.status !== 'active' && (!req.user || !clan.isMember(req.user.id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(clan.members);
  } catch (error) {
    console.error('Error fetching clan members:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Remove member from clan
 * DELETE /api/clans/:id/members/:userId
 */
router.delete('/:id/members/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    const targetUserId = req.params.userId;
    
    // Check permissions
    if (!clan.canManageMembers(req.user.id) && targetUserId !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Prevent removing leader
    if (clan.isLeader(targetUserId)) {
      return res.status(400).json({ error: 'Cannot remove clan leader' });
    }
    
    // Remove member
    try {
      clan.removeMember(targetUserId);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    
    await clan.save();
    
    // Notify the removed member
    await Notification.create({
      user: targetUserId,
      type: 'clan_removed',
      title: 'Removed from Clan',
      message: `You have been removed from ${clan.name}`,
      data: {
        clanId: clan._id,
        clanName: clan.name,
        removedBy: req.user.username
      }
    });
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing clan member:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Promote member to admin
 * POST /api/clans/:id/members/:userId/promote
 */
router.post('/:id/members/:userId/promote', ensureAuthenticated, async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    const targetUserId = req.params.userId;
    
    try {
      clan.promoteToAdmin(targetUserId, req.user.id);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    
    await clan.save();
    
    // Notify the promoted member
    await Notification.create({
      user: targetUserId,
      type: 'clan_promoted',
      title: 'Promoted to Admin',
      message: `You have been promoted to admin in ${clan.name}`,
      data: {
        clanId: clan._id,
        clanName: clan.name,
        promotedBy: req.user.username
      }
    });
    
    res.json({ message: 'Member promoted successfully' });
  } catch (error) {
    console.error('Error promoting clan member:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Demote admin to member
 * POST /api/clans/:id/members/:userId/demote
 */
router.post('/:id/members/:userId/demote', ensureAuthenticated, async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    const targetUserId = req.params.userId;
    
    try {
      clan.demoteFromAdmin(targetUserId, req.user.id);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    
    await clan.save();
    
    // Notify the demoted member
    await Notification.create({
      user: targetUserId,
      type: 'clan_demoted',
      title: 'Demoted from Admin',
      message: `You have been demoted from admin in ${clan.name}`,
      data: {
        clanId: clan._id,
        clanName: clan.name,
        demotedBy: req.user.username
      }
    });
    
    res.json({ message: 'Member demoted successfully' });
  } catch (error) {
    console.error('Error demoting clan member:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Transfer clan leadership
 * POST /api/clans/:id/transfer-leadership
 */
router.post('/:id/transfer-leadership', ensureAuthenticated, async (req, res) => {
  try {
    const { newLeaderId } = req.body;
    
    if (!newLeaderId) {
      return res.status(400).json({ error: 'New leader ID is required' });
    }
    
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    try {
      clan.transferLeadership(newLeaderId, req.user.id);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    
    await clan.save();
    
    // Notify the new leader
    await Notification.create({
      user: newLeaderId,
      type: 'clan_leadership_transferred',
      title: 'Clan Leadership Transferred',
      message: `You are now the leader of ${clan.name}`,
      data: {
        clanId: clan._id,
        clanName: clan.name,
        transferredBy: req.user.username
      }
    });
    
    res.json({ message: 'Leadership transferred successfully' });
  } catch (error) {
    console.error('Error transferring leadership:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Leave clan
 * POST /api/clans/:id/leave
 */
router.post('/:id/leave', ensureAuthenticated, async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check if user is a member
    if (!clan.isMember(req.user.id)) {
      return res.status(400).json({ error: 'You are not a member of this clan' });
    }
    
    // Prevent leader from leaving (must transfer leadership first)
    if (clan.isLeader(req.user.id)) {
      return res.status(400).json({ error: 'Clan leader must transfer leadership before leaving' });
    }
    
    // Remove member
    clan.removeMember(req.user.id);
    await clan.save();
    
    res.json({ message: 'Successfully left clan' });
  } catch (error) {
    console.error('Error leaving clan:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get clan chat messages
 * GET /api/clans/:id/chat
 */
router.get('/:id/chat', ensureAuthenticated, async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check if user is a member
    if (!clan.isMember(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const messages = await ChatMessage.find({ 
      'room.roomId': clan._id,
      type: 'room'
    })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching clan chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Send clan chat message
 * POST /api/clans/:id/chat
 */
router.post('/:id/chat', ensureAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check if user is a member
    if (!clan.isMember(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const message = new ChatMessage({
      text: content.trim(),
      sender: {
        userId: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar
      },
      type: 'room',
      room: {
        roomId: clan._id,
        name: clan.name
      }
    });
    
    await message.save();
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending clan chat message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get clan applications (admin only)
 * GET /api/clans/:id/applications
 */
router.get('/:id/applications', ensureAuthenticated, async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id)
      .populate('applications.user', 'username displayName avatar')
      .populate('applications.player', 'name mmr rank');
    
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check permissions
    if (!clan.canManageMembers(req.user.id)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const pendingApplications = clan.applications.filter(app => app.status === 'pending');
    
    res.json(pendingApplications);
  } catch (error) {
    console.error('Error fetching clan applications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update clan settings
 * PUT /api/clans/:id
 */
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check permissions (only leader can update clan settings)
    if (!clan.isLeader(req.user.id)) {
      return res.status(403).json({ error: 'Only clan leader can update settings' });
    }
    
    const { name, description, recruitmentType, maxMembers, settings } = req.body;
    
    // Update allowed fields
    if (name) clan.name = name.trim();
    if (description !== undefined) clan.description = description.trim();
    if (recruitmentType) clan.recruitmentType = recruitmentType;
    if (maxMembers) clan.maxMembers = Math.min(Math.max(maxMembers, 5), 100);
    if (settings) {
      clan.settings = { ...clan.settings, ...settings };
    }
    
    await clan.save();
    
    res.json(clan);
  } catch (error) {
    console.error('Error updating clan:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Disband clan (leader only)
 * DELETE /api/clans/:id
 */
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const clan = await Clan.findById(req.params.id);
    if (!clan || clan.status !== 'active') {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    // Check permissions (only leader can disband)
    if (!clan.isLeader(req.user.id)) {
      return res.status(403).json({ error: 'Only clan leader can disband the clan' });
    }
    
    // Mark as disbanded instead of deleting
    clan.status = 'disbanded';
    clan.disbandedAt = new Date();
    clan.disbandedBy = req.user.id;
    
    await clan.save();
    
    res.json({ message: 'Clan disbanded successfully' });
  } catch (error) {
    console.error('Error disbanding clan:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 