const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Tournament Schema
 *
 * Represents a tournament with brackets, participants, and matches
 */
const TournamentSchema = new Schema({
  // Tournament name
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Tournament description
  description: {
    type: String,
    default: '',
    trim: true
  },

  // Tournament organizer
  organizer: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: String
  },

  // Tournament status
  status: {
    type: String,
    enum: ['draft', 'registration', 'in_progress', 'completed', 'cancelled'],
    default: 'draft'
  },

  // Tournament type (single elimination, double elimination, etc.)
  type: {
    type: String,
    enum: ['single_elimination', 'double_elimination', 'round_robin'],
    default: 'single_elimination'
  },

  // Game type (wc1, wc2, wc3)
  gameType: {
    type: String,
    enum: ['wc1', 'wc2', 'wc3'],
    default: 'wc2',
    index: true
  },

  // Tournament dates
  startDate: {
    type: Date
  },

  endDate: {
    type: Date
  },

  // Maximum number of participants
  maxParticipants: {
    type: Number,
    default: 8
  },

  // Participants
  participants: [{
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player'
    },
    playerName: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    seed: Number,
    status: {
      type: String,
      enum: ['registered', 'checked_in', 'no_show', 'eliminated', 'winner'],
      default: 'registered'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Brackets
  brackets: [{
    round: {
      type: Number,
      required: true
    },
    matches: [{
      matchId: {
        type: String,
        required: true
      },
      player1: {
        playerId: Schema.Types.ObjectId,
        playerName: String,
        seed: Number
      },
      player2: {
        playerId: Schema.Types.ObjectId,
        playerName: String,
        seed: Number
      },
      winner: {
        playerId: Schema.Types.ObjectId,
        playerName: String
      },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'bye'],
        default: 'pending'
      },
      matchReference: {
        type: Schema.Types.ObjectId,
        ref: 'Match'
      },
      scheduledTime: Date
    }]
  }],

  // Tournament settings
  settings: {
    // Whether to automatically create matches
    autoCreateMatches: {
      type: Boolean,
      default: true
    },

    // Whether to automatically advance winners
    autoAdvanceWinners: {
      type: Boolean,
      default: true
    },

    // Whether to use seeding
    useSeeding: {
      type: Boolean,
      default: true
    },

    // Match settings
    matchSettings: {
      matchType: {
        type: String,
        enum: ['1v1', '2v2', '3v3', '4v4', 'ffa'],
        default: '1v1'
      },

      bestOf: {
        type: Number,
        default: 1
      }
    }
  },

  // Creation and update timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for faster lookups
TournamentSchema.index({ status: 1 });
TournamentSchema.index({ 'organizer.userId': 1 });
TournamentSchema.index({ startDate: 1 });
TournamentSchema.index({ 'participants.playerId': 1 });
TournamentSchema.index({ 'participants.userId': 1 });

/**
 * Generate tournament brackets
 * @returns {Array} - Generated brackets
 */
TournamentSchema.methods.generateBrackets = function() {
  const participants = [...this.participants];
  const brackets = [];

  // Sort participants by seed if using seeding
  if (this.settings?.useSeeding) {
    participants.sort((a, b) => a.seed - b.seed);
  } else {
    // Shuffle participants
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }
  }

  // Generate brackets based on tournament type
  if (this.type === 'single_elimination') {
    return this.generateSingleEliminationBrackets(participants);
  } else if (this.type === 'double_elimination') {
    return this.generateDoubleEliminationBrackets(participants);
  } else if (this.type === 'round_robin') {
    return this.generateRoundRobinBrackets(participants);
  }

  return brackets;
};

/**
 * Generate single elimination brackets
 * @param {Array} participants - Array of participants
 * @returns {Array} - Generated brackets
 */
TournamentSchema.methods.generateSingleEliminationBrackets = function(participants) {
  const brackets = [];
  const numParticipants = participants.length;

  // Calculate number of rounds needed
  const numRounds = Math.ceil(Math.log2(numParticipants));

  // Calculate number of matches in first round
  const numFirstRoundMatches = Math.pow(2, numRounds - 1);

  // Calculate number of byes needed
  const numByes = numFirstRoundMatches - numParticipants;

  // Create first round
  const firstRound = {
    round: 1,
    matches: []
  };

  // Create matches for first round
  for (let i = 0; i < numFirstRoundMatches; i++) {
    // Determine if this match has a bye
    const hasBye = i >= numParticipants;

    // Create match
    const match = {
      matchId: `R1-M${i+1}`,
      player1: i < numParticipants ? {
        playerId: participants[i].playerId,
        playerName: participants[i].playerName,
        seed: participants[i].seed
      } : null,
      player2: null,
      status: hasBye ? 'bye' : 'pending'
    };

    // If there's a bye, player1 automatically advances
    if (hasBye && match.player1) {
      match.winner = {
        playerId: match.player1.playerId,
        playerName: match.player1.playerName
      };
    }

    firstRound.matches.push(match);
  }

  // Add first round to brackets
  brackets.push(firstRound);

  // Create subsequent rounds
  for (let round = 2; round <= numRounds; round++) {
    const numMatches = Math.pow(2, numRounds - round);

    const roundBracket = {
      round: round,
      matches: []
    };

    // Create matches for this round
    for (let i = 0; i < numMatches; i++) {
      const match = {
        matchId: `R${round}-M${i+1}`,
        player1: null,
        player2: null,
        status: 'pending'
      };

      roundBracket.matches.push(match);
    }

    // Add round to brackets
    brackets.push(roundBracket);
  }

  return brackets;
};

/**
 * Generate double elimination brackets
 * @param {Array} participants - Array of participants
 * @returns {Array} - Generated brackets
 */
TournamentSchema.methods.generateDoubleEliminationBrackets = function(participants) {
  // Start with single elimination brackets for winners bracket
  const winnersBrackets = this.generateSingleEliminationBrackets(participants);

  // Mark all brackets as winners bracket
  winnersBrackets.forEach(bracket => {
    bracket.bracketType = 'winners';
  });

  // Create losers brackets
  const losersBrackets = [];

  // Number of rounds in winners bracket
  const numWinnersRounds = winnersBrackets.length;

  // Create losers brackets (2 * numWinnersRounds - 1 rounds in losers bracket)
  for (let round = 1; round <= 2 * numWinnersRounds - 1; round++) {
    const numMatches = Math.ceil(participants.length / Math.pow(2, Math.ceil(round / 2)));

    const roundBracket = {
      round: round,
      bracketType: 'losers',
      matches: []
    };

    // Create matches for this round
    for (let i = 0; i < numMatches; i++) {
      const match = {
        matchId: `L${round}-M${i+1}`,
        player1: null,
        player2: null,
        status: 'pending'
      };

      roundBracket.matches.push(match);
    }

    // Add round to brackets
    losersBrackets.push(roundBracket);
  }

  // Create final bracket (winners bracket winner vs losers bracket winner)
  const finalBracket = {
    round: numWinnersRounds + 1,
    bracketType: 'final',
    matches: [{
      matchId: `F-M1`,
      player1: null, // Winners bracket winner
      player2: null, // Losers bracket winner
      status: 'pending'
    }]
  };

  // Combine all brackets
  return [...winnersBrackets, ...losersBrackets, finalBracket];
};

/**
 * Generate round robin brackets
 * @param {Array} participants - Array of participants
 * @returns {Array} - Generated brackets
 */
TournamentSchema.methods.generateRoundRobinBrackets = function(participants) {
  const brackets = [];
  const numParticipants = participants.length;

  // If odd number of participants, add a bye
  const effectiveParticipants = numParticipants % 2 === 0 ?
    numParticipants : numParticipants + 1;

  // Number of rounds is n-1 for even number of participants, n for odd
  const numRounds = numParticipants % 2 === 0 ?
    numParticipants - 1 : numParticipants;

  // Create a copy of participants array for manipulation
  const participantsCopy = [...participants];

  // If odd number, add a "bye" participant
  if (numParticipants % 2 !== 0) {
    participantsCopy.push({
      playerName: 'BYE',
      seed: numParticipants + 1
    });
  }

  // Generate rounds
  for (let round = 1; round <= numRounds; round++) {
    const roundBracket = {
      round: round,
      matches: []
    };

    // Generate matches for this round
    for (let i = 0; i < effectiveParticipants / 2; i++) {
      const player1 = participantsCopy[i];
      const player2 = participantsCopy[effectiveParticipants - 1 - i];

      // Skip if either player is a bye
      if (player1.playerName === 'BYE' || player2.playerName === 'BYE') {
        continue;
      }

      const match = {
        matchId: `R${round}-M${i+1}`,
        player1: {
          playerId: player1.playerId,
          playerName: player1.playerName,
          seed: player1.seed
        },
        player2: {
          playerId: player2.playerId,
          playerName: player2.playerName,
          seed: player2.seed
        },
        status: 'pending'
      };

      roundBracket.matches.push(match);
    }

    // Add round to brackets
    brackets.push(roundBracket);

    // Rotate participants for next round (keep first participant fixed)
    const firstParticipant = participantsCopy[0];
    const lastParticipant = participantsCopy.pop();
    participantsCopy.splice(1, 0, lastParticipant);
  }

  return brackets;
};

// Export model
module.exports = mongoose.model('Tournament', TournamentSchema);
