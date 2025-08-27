const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Forum Topic Schema
 * Represents a topic in the forum
 */
const ForumTopicSchema = new Schema({
  // Topic title
  title: {
    type: String,
    required: true,
    trim: true
  },



  // Game type (wc1, wc2, wc3) - NEW FIELD
  gameType: {
    type: String,
    enum: ['wc1', 'wc2', 'wc3'],
    default: 'wc2',
    required: true
  },

  // Clan-specific forum (optional)
  clan: {
    type: Schema.Types.ObjectId,
    ref: 'Clan'
  },

  // User who created this topic
  author: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: String,
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    }
  },

  // Topic content (first post)
  content: {
    type: String,
    required: true
  },

  // Is this topic pinned to the top?
  isPinned: {
    type: Boolean,
    default: false
  },

  // Is this topic locked (no new replies)?
  isLocked: {
    type: Boolean,
    default: false
  },

  // Number of views
  viewCount: {
    type: Number,
    default: 0
  },

  // Number of replies
  replyCount: {
    type: Number,
    default: 0
  },

  // Last reply information
  lastReply: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    date: Date
  },

  // Like/dislike tracking
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Attached poll (optional)
  poll: {
    question: {
      type: String,
      trim: true
    },
    options: [{
      value: {
        type: String,
        required: true
      },
      votes: {
        type: Number,
        default: 0
      }
    }],
    voters: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      option: {
        type: String,
        required: true
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }],
    expiresAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },

  // Creation date
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Instance method to vote on the topic's poll
ForumTopicSchema.methods.voteOnPoll = async function(userId, option) {
  if (!this.poll || !this.poll.question || !this.poll.isActive) {
    throw new Error('No active poll found on this topic');
  }

  // Check if poll has expired
  if (this.poll.expiresAt && new Date() > this.poll.expiresAt) {
    throw new Error('Poll has expired');
  }

  // Find the new option
  const newOptionIndex = this.poll.options.findIndex(opt => opt.value === option);
  if (newOptionIndex === -1) {
    throw new Error('Invalid poll option');
  }

  // Check if user has already voted
  const existingVoteIndex = this.poll.voters.findIndex(voter => 
    voter.userId.toString() === userId.toString()
  );
  
  if (existingVoteIndex !== -1) {
    // User is changing their vote
    const existingVote = this.poll.voters[existingVoteIndex];
    
    // If voting for the same option, no change needed
    if (existingVote.option === option) {
      return this;
    }
    
    // Find and decrement the old option's vote count
    const oldOptionIndex = this.poll.options.findIndex(opt => opt.value === existingVote.option);
    if (oldOptionIndex !== -1) {
      this.poll.options[oldOptionIndex].votes = Math.max(0, this.poll.options[oldOptionIndex].votes - 1);
    }
    
    // Update the existing vote record
    this.poll.voters[existingVoteIndex].option = option;
    this.poll.voters[existingVoteIndex].votedAt = new Date();
  } else {
    // New vote
    this.poll.voters.push({
      userId,
      option,
      votedAt: new Date()
    });
  }

  // Increment vote count for the new option
  this.poll.options[newOptionIndex].votes += 1;

  await this.save();
  return this;
};

// Create indexes for faster lookups
ForumTopicSchema.index({ gameType: 1 });
ForumTopicSchema.index({ isPinned: -1, createdAt: -1 });
ForumTopicSchema.index({ 'author.userId': 1 });

module.exports = mongoose.model('ForumTopic', ForumTopicSchema);
