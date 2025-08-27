const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Poll Schema
 * 
 * Represents a poll with options and votes
 */
const PollSchema = new Schema({
  // Poll identifier
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Poll question
  question: {
    type: String,
    required: true,
    trim: true
  },
  
  // Poll options
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
  
  // Voters - track who has voted on this poll
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
  
  // Whether the poll is active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Creation date
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Last updated date
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static method to get a poll by identifier
PollSchema.statics.getPollByIdentifier = function(identifier) {
  return this.findOne({ identifier });
};

// Static method to vote on a poll (allows vote changing)
PollSchema.statics.vote = async function(identifier, option, userId) {
  // Find the poll
  const poll = await this.findOne({ identifier, isActive: true });
  
  if (!poll) {
    throw new Error('Poll not found or inactive');
  }

  // Check if user has already voted
  const existingVoteIndex = poll.voters.findIndex(voter => voter.userId.toString() === userId.toString());
  const existingVote = existingVoteIndex !== -1 ? poll.voters[existingVoteIndex] : null;
  
  // Find the new option
  const optionIndex = poll.options.findIndex(opt => opt.value === option);
  
  if (optionIndex === -1) {
    throw new Error('Invalid option');
  }
  
  if (existingVote) {
    // User is changing their vote
    const oldOptionIndex = poll.options.findIndex(opt => opt.value === existingVote.option);
    
    // Decrement the old option vote count
    if (oldOptionIndex !== -1) {
      poll.options[oldOptionIndex].votes = Math.max(0, poll.options[oldOptionIndex].votes - 1);
    }
    
    // Update the voter record
    poll.voters[existingVoteIndex].option = option;
    poll.voters[existingVoteIndex].votedAt = new Date();
  } else {
    // New vote - add voter
    poll.voters.push({
      userId,
      option,
      votedAt: new Date()
    });
  }
  
  // Increment the new option vote count
  poll.options[optionIndex].votes += 1;
  poll.updatedAt = new Date();
  
  // Save and return the updated poll
  await poll.save();
  return poll;
};

module.exports = mongoose.model('Poll', PollSchema);
