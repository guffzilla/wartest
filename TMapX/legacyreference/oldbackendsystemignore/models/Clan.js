const mongoose = require('mongoose');

const clanMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  role: {
    type: String,
    enum: ['leader', 'admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const clanApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNote: {
    type: String,
    maxlength: 500
  }
});

const clanInviteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  respondedAt: {
    type: Date
  }
});

const clanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  tag: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 6,
    match: /^[A-Z0-9]+$/
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  gameType: {
    type: String,
    required: false,
    enum: ['wc1', 'wc2', 'wc3', 'wc12', 'multi'],
    default: 'multi'
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [clanMemberSchema],
  applications: [clanApplicationSchema],
  invites: [clanInviteSchema],
  recruitmentType: {
    type: String,
    enum: ['open', 'application', 'invite'],
    default: 'application'
  },
  maxMembers: {
    type: Number,
    default: 50,
    min: 5,
    max: 100
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    type: Number,
    default: 1500
  },
  wins: {
    type: Number,
    default: 0,
    min: 0
  },
  losses: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'disbanded'],
    default: 'active'
  },
  settings: {
    allowApplications: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: true
    },
    publicChat: {
      type: Boolean,
      default: false
    },
    showInDirectory: {
      type: Boolean,
      default: true
    }
  },
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  disbandedAt: {
    type: Date
  },
  disbandedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
clanSchema.index({ name: 1 });
clanSchema.index({ tag: 1 });
clanSchema.index({ gameType: 1 });
clanSchema.index({ status: 1 });
clanSchema.index({ 'members.user': 1 });
clanSchema.index({ 'members.player': 1 });
clanSchema.index({ leader: 1 });
clanSchema.index({ createdAt: -1 });

// Ensure unique clan tag per game type
clanSchema.index({ tag: 1, gameType: 1 }, { unique: true });

// Virtual for member count
clanSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual for pending applications count
clanSchema.virtual('pendingApplicationsCount').get(function() {
  return this.applications ? this.applications.filter(app => app.status === 'pending').length : 0;
});

// Virtual for win rate
clanSchema.virtual('winRate').get(function() {
  const totalGames = this.wins + this.losses;
  return totalGames > 0 ? Math.round((this.wins / totalGames) * 100) : 0;
});

// Methods
clanSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

clanSchema.methods.isLeader = function(userId) {
  return this.leader.toString() === userId.toString();
};

clanSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  return member && (member.role === 'admin' || member.role === 'leader');
};

clanSchema.methods.canManageMembers = function(userId) {
  return this.isLeader(userId) || this.isAdmin(userId);
};

clanSchema.methods.addMember = function(userId, playerId, role = 'member', invitedBy = null) {
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this clan');
  }
  
  if (this.members.length >= this.maxMembers) {
    throw new Error('Clan is at maximum capacity');
  }

  this.members.push({
    user: userId,
    player: playerId,
    role: role,
    invitedBy: invitedBy
  });
};

clanSchema.methods.removeMember = function(userId) {
  if (this.isLeader(userId)) {
    throw new Error('Cannot remove clan leader');
  }
  
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
};

clanSchema.methods.promoteToAdmin = function(userId, promotedBy) {
  if (!this.canManageMembers(promotedBy)) {
    throw new Error('Insufficient permissions to promote members');
  }
  
  const member = this.members.find(member => member.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User is not a member of this clan');
  }
  
  member.role = 'admin';
};

clanSchema.methods.demoteFromAdmin = function(userId, demotedBy) {
  if (!this.isLeader(demotedBy)) {
    throw new Error('Only clan leader can demote admins');
  }
  
  const member = this.members.find(member => member.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User is not a member of this clan');
  }
  
  if (member.role === 'leader') {
    throw new Error('Cannot demote clan leader');
  }
  
  member.role = 'member';
};

clanSchema.methods.transferLeadership = function(newLeaderId, currentLeaderId) {
  if (!this.isLeader(currentLeaderId)) {
    throw new Error('Only current leader can transfer leadership');
  }
  
  const newLeader = this.members.find(member => member.user.toString() === newLeaderId.toString());
  if (!newLeader) {
    throw new Error('New leader must be a clan member');
  }
  
  // Update roles
  const currentLeader = this.members.find(member => member.user.toString() === currentLeaderId.toString());
  if (currentLeader) {
    currentLeader.role = 'admin';
  }
  newLeader.role = 'leader';
  
  // Update clan leader
  this.leader = newLeaderId;
};

// Static methods
clanSchema.statics.findByTag = function(tag, gameType) {
  return this.findOne({ tag: tag.toUpperCase(), gameType, status: 'active' });
};

clanSchema.statics.findByUser = function(userId, gameType = null) {
  const query = { 'members.user': userId, status: 'active' };
  if (gameType) {
    query.gameType = gameType;
  }
  return this.find(query);
};

clanSchema.statics.searchClans = function(searchTerm, gameType, page = 1, limit = 12) {
  const query = { status: 'active', 'settings.showInDirectory': true };
  
  if (gameType && gameType !== 'all') {
    query.gameType = gameType;
  }
  
  if (searchTerm) {
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { tag: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ];
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .populate('leader', 'username displayName')
    .sort({ memberCount: -1, rating: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Pre-save middleware
clanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ensure leader is in members array with correct role
  if (this.leader && this.members) {
    const leaderMember = this.members.find(member => member.user.toString() === this.leader.toString());
    if (leaderMember) {
      leaderMember.role = 'leader';
    }
  }
  
  next();
});

// Pre-remove middleware
clanSchema.pre('remove', async function(next) {
  try {
    // Remove associated chat room
    if (this.chatRoom) {
      await mongoose.model('ChatRoom').findByIdAndDelete(this.chatRoom);
    }
    
    // Send notifications to members
    const Notification = mongoose.model('Notification');
    for (const member of this.members) {
      await Notification.create({
        user: member.user,
        type: 'clan_disbanded',
        title: 'Clan Disbanded',
        message: `The clan "${this.name}" has been disbanded.`,
        data: {
          clanId: this._id,
          clanName: this.name,
          clanTag: this.tag
        }
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Clan', clanSchema); 