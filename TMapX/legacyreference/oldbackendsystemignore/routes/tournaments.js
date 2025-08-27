const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Player = require('../models/Player');
// Use centralized authentication middleware
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/tournaments - Get all tournaments
router.get('/', async (req, res) => {
  try {
    // Get query parameters
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Get tournaments
    const tournaments = await Tournament.find(query)
      .sort({ startDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const totalCount = await Tournament.countDocuments(query);

    res.json({
      tournaments,
      pagination: {
        total: totalCount,
        page,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Error getting tournaments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tournaments/:id - Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId).lean();

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (err) {
    console.error('Error getting tournament:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tournaments - Create a new tournament
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, type, gameType, maxParticipants, startDate, endDate, settings } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Tournament name is required' });
    }

    // Create tournament
    const tournament = new Tournament({
      name,
      description: description || '',
      organizer: {
        userId: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar
      },
      type: type || 'single_elimination',
      gameType: gameType || 'war2',
      maxParticipants: maxParticipants || 8,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      settings: settings || {}
    });

    await tournament.save();

    res.status(201).json(tournament);
  } catch (err) {
    console.error('Error creating tournament:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tournaments/:id - Update tournament
router.put('/:id', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { name, description, type, maxParticipants, startDate, endDate, status, settings } = req.body;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if user is organizer or admin
    if (tournament.organizer.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this tournament' });
    }

    // Update fields
    if (name) tournament.name = name;
    if (description !== undefined) tournament.description = description;
    if (type) tournament.type = type;
    if (maxParticipants) tournament.maxParticipants = maxParticipants;
    if (startDate) tournament.startDate = new Date(startDate);
    if (endDate) tournament.endDate = new Date(endDate);
    if (status) tournament.status = status;
    if (settings) tournament.settings = { ...tournament.settings, ...settings };

    tournament.updatedAt = new Date();

    await tournament.save();

    res.json(tournament);
  } catch (err) {
    console.error('Error updating tournament:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tournaments/user/:userId - Get tournaments for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find tournaments where user is organizer or participant
    const tournaments = await Tournament.find({
      $or: [
        { 'organizer.userId': userId },
        { 'participants.userId': userId }
      ]
    })
    .sort({ startDate: 1 })
    .lean();

    res.json(tournaments);
  } catch (err) {
    console.error('Error getting user tournaments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tournaments/:id - Delete tournament
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if user is organizer or admin
    if (tournament.organizer.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this tournament' });
    }

    await Tournament.findByIdAndDelete(tournamentId);

    res.json({ message: 'Tournament deleted successfully' });
  } catch (err) {
    console.error('Error deleting tournament:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tournaments/:id/register - Register for a tournament
router.post('/:id/register', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { playerId, playerName } = req.body;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if tournament is open for registration
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Tournament is not open for registration' });
    }

    // Check if tournament is full
    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    // Check if user is already registered
    const isUserRegistered = tournament.participants.some(p =>
      p.userId && p.userId.toString() === req.user._id.toString()
    );

    if (isUserRegistered) {
      return res.status(400).json({ error: 'You are already registered for this tournament' });
    }

    // Validate player selection
    let selectedPlayer;
    if (playerId && playerName) {
      // Check if the specified player exists and belongs to the user
      selectedPlayer = await Player.findOne({ 
        _id: playerId,
        user: req.user._id,
        gameType: tournament.gameType 
      });

      if (!selectedPlayer) {
        return res.status(400).json({ 
          error: 'INVALID_PLAYER',
          message: 'Selected player not found or does not belong to you'
        });
      }

      // Verify the player name matches
      if (selectedPlayer.name !== playerName) {
        return res.status(400).json({ 
          error: 'PLAYER_NAME_MISMATCH',
          message: 'Player name does not match the selected player'
        });
      }
    } else {
      // Fallback: Check if user has any player for the tournament's game type
      const userPlayers = await Player.find({ 
        user: req.user._id,
        gameType: tournament.gameType 
      });

      if (userPlayers.length === 0) {
        return res.status(400).json({ 
          error: 'NO_PLAYER_FOR_GAME_TYPE',
          gameType: tournament.gameType,
          message: `You need a ${tournament.gameType === 'war1' ? 'WC1' : tournament.gameType === 'war2' ? 'WC2' : 'WC3'} player to register for this tournament`
        });
      }

      // Use the first available player for this game type
      selectedPlayer = userPlayers[0];
    }

    // Check if user already has a player registered in this tournament (one player per user restriction)
    const userPlayerNames = await Player.find({ 
      user: req.user._id,
      gameType: tournament.gameType 
    }).then(players => players.map(p => p.name));

    const existingPlayerInTournament = tournament.participants.some(p => 
      userPlayerNames.includes(p.playerName)
    );

    if (existingPlayerInTournament) {
      return res.status(400).json({ 
        error: 'PLAYER_ALREADY_REGISTERED',
        message: 'You already have a player registered in this tournament'
      });
    }

    // Add user to participants
    tournament.participants.push({
      userId: req.user._id,
      username: req.user.username,
      playerName: selectedPlayer.name,
      seed: tournament.participants.length + 1,
      status: 'registered',
      registeredAt: new Date()
    });

    await tournament.save();

    res.json({
      message: 'Successfully registered for tournament',
      tournament
    });
  } catch (err) {
    console.error('Error registering for tournament:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tournaments/:id/unregister - Unregister from a tournament
router.post('/:id/unregister', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if tournament is open for registration
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Cannot unregister from tournament that is not in registration phase' });
    }

    // Find user's participation
    const participantIndex = tournament.participants.findIndex(p =>
      p.userId && p.userId.toString() === req.user._id.toString()
    );

    if (participantIndex === -1) {
      return res.status(400).json({ error: 'You are not registered for this tournament' });
    }

    // Remove user from participants
    tournament.participants.splice(participantIndex, 1);

    // Reorder seeds for remaining participants
    tournament.participants.forEach((participant, index) => {
      participant.seed = index + 1;
    });

    await tournament.save();

    res.json({
      message: 'Successfully unregistered from tournament',
      tournament
    });
  } catch (err) {
    console.error('Error unregistering from tournament:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tournaments/:id/publish - Publish a tournament (change status from draft to registration)
router.post('/:id/publish', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if user is organizer or admin
    if (tournament.organizer.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to publish this tournament' });
    }

    // Check if tournament is in draft status
    if (tournament.status !== 'draft') {
      return res.status(400).json({ error: 'Tournament is not in draft status' });
    }

    // Change status to registration
    tournament.status = 'registration';
    tournament.updatedAt = new Date();

    await tournament.save();

    res.json({
      message: 'Tournament published successfully',
      tournament
    });
  } catch (err) {
    console.error('Error publishing tournament:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tournaments/:id/participants/:userId - Remove participant from tournament
router.delete('/:id/participants/:userId', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const userId = req.params.userId;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if user is organizer or admin
    if (tournament.organizer.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to manage this tournament' });
    }

    // Check if tournament is in progress or completed
    if (tournament.status === 'in_progress' || tournament.status === 'completed') {
      return res.status(400).json({ error: 'Cannot remove participants from active or completed tournaments' });
    }

    // Find and remove participant
    const participantIndex = tournament.participants.findIndex(p => 
      p.userId && p.userId.toString() === userId
    );

    if (participantIndex === -1) {
      return res.status(404).json({ error: 'Participant not found in tournament' });
    }

    // Remove participant
    tournament.participants.splice(participantIndex, 1);

    // Update seeds for remaining participants
    tournament.participants.forEach((participant, index) => {
      participant.seed = index + 1;
    });

    tournament.updatedAt = new Date();

    await tournament.save();

    res.json({
      message: 'Participant removed successfully',
      tournament
    });
  } catch (err) {
    console.error('Error removing participant:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Join a tournament
 * POST /api/tournaments/:id/join
 */
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if tournament is in registration phase
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Tournament is not accepting participants' });
    }

    // Check if user is already a participant
    const isAlreadyParticipant = tournament.participants.some(p =>
      p.userId && p.userId.toString() === req.user._id.toString()
    );

    if (isAlreadyParticipant) {
      return res.status(400).json({ error: 'You are already a participant in this tournament' });
    }

    // Check if tournament is full
    if (tournament.maxParticipants && tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    // Get user's player or create a default one
    let player;
    try {
      player = await Player.findOne({ userId: req.user._id });
    } catch (err) {
      console.error('Error finding player:', err);
    }

    // Add user to participants
    tournament.participants.push({
      playerId: player ? player._id : null,
      playerName: player ? player.name : req.user.username,
      userId: req.user._id,
      username: req.user.username,
      seed: tournament.participants.length + 1,
      status: 'registered',
      registeredAt: new Date()
    });

    await tournament.save();

    res.json({ message: 'Successfully joined tournament', tournament });
  } catch (error) {
    console.error('Error joining tournament:', error);
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

/**
 * Leave a tournament
 * POST /api/tournaments/:id/leave
 */
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if tournament is in registration phase
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Cannot leave tournament after registration has closed' });
    }

    // Check if user is a participant
    const participantIndex = tournament.participants.findIndex(p =>
      p.userId && p.userId.toString() === req.user._id.toString()
    );

    if (participantIndex === -1) {
      return res.status(400).json({ error: 'You are not a participant in this tournament' });
    }

    // Remove user from participants
    tournament.participants.splice(participantIndex, 1);

    // Update seeds for remaining participants
    tournament.participants.forEach((p, index) => {
      p.seed = index + 1;
    });

    await tournament.save();

    res.json({ message: 'Successfully left tournament', tournament });
  } catch (error) {
    console.error('Error leaving tournament:', error);
    res.status(500).json({ error: 'Failed to leave tournament' });
  }
});

/**
 * Generate brackets for a tournament
 * POST /api/tournaments/:id/brackets
 */
router.post('/:id/brackets', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if user is organizer or admin
    if (tournament.organizer.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to generate brackets for this tournament' });
    }

    // Check if tournament has enough participants
    if (tournament.participants.length < 2) {
      return res.status(400).json({ error: 'Tournament needs at least 2 participants to generate brackets' });
    }

    // Generate brackets
    const brackets = tournament.generateBrackets();

    // Update tournament with generated brackets
    tournament.brackets = brackets;
    tournament.updatedAt = new Date();

    await tournament.save();

    res.json({
      message: 'Brackets generated successfully',
      tournament
    });
  } catch (err) {
    console.error('Error generating brackets:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Start a tournament
 * POST /api/tournaments/:id/start
 */
router.post('/:id/start', authenticate, async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if user is organizer or admin
    if (tournament.organizer.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to start this tournament' });
    }

    // Check if tournament is in registration status
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Tournament must be in registration status to start' });
    }

    // Check if tournament has enough participants
    if (tournament.participants.length < 2) {
      return res.status(400).json({ error: 'Tournament needs at least 2 participants to start' });
    }

    // Check if brackets have been generated
    if (!tournament.brackets || tournament.brackets.length === 0) {
      // Generate brackets if not already generated
      tournament.brackets = tournament.generateBrackets();
    }

    // Update tournament status
    tournament.status = 'in_progress';
    tournament.updatedAt = new Date();

    await tournament.save();

    res.json({
      message: 'Tournament started successfully',
      tournament
    });
  } catch (err) {
    console.error('Error starting tournament:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Leave a tournament
 * POST /api/tournaments/:id/leave
 */
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if tournament is in registration phase
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Cannot leave tournament after registration has closed' });
    }

    // Check if user is a participant
    const participantIndex = tournament.participants.findIndex(p =>
      p.userId && p.userId.toString() === req.user._id.toString()
    );

    if (participantIndex === -1) {
      return res.status(400).json({ error: 'You are not a participant in this tournament' });
    }

    // Remove user from participants
    tournament.participants.splice(participantIndex, 1);

    // Update seeds for remaining participants
    tournament.participants.forEach((p, index) => {
      p.seed = index + 1;
    });

    await tournament.save();

    res.json({ message: 'Successfully left tournament', tournament });
  } catch (error) {
    console.error('Error leaving tournament:', error);
    res.status(500).json({ error: 'Failed to leave tournament' });
  }
});

/**
 * Report match result
 * POST /api/tournaments/:id/matches/:matchId/result
 */
router.post('/:id/matches/:matchId/result', authenticate, async (req, res) => {
  try {
    const { id: tournamentId, matchId } = req.params;
    const { winnerId, score } = req.body;

    if (!winnerId) {
      return res.status(400).json({ error: 'Winner ID is required' });
    }

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Find the match in the brackets
    let matchFound = false;
    let match = null;
    let roundIndex = -1;
    let matchIndex = -1;

    for (let i = 0; i < tournament.brackets.length; i++) {
      const bracket = tournament.brackets[i];
      for (let j = 0; j < bracket.matches.length; j++) {
        if (bracket.matches[j].matchId === matchId) {
          match = bracket.matches[j];
          roundIndex = i;
          matchIndex = j;
          matchFound = true;
          break;
        }
      }
      if (matchFound) break;
    }

    if (!matchFound || !match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if match is already completed
    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match is already completed' });
    }

    // Check if both players are assigned to the match
    if (!match.player1 || !match.player2) {
      return res.status(400).json({ error: 'Match does not have both players assigned' });
    }

    // Check if winner is one of the players
    if (match.player1.playerId.toString() !== winnerId.toString() &&
        match.player2.playerId.toString() !== winnerId.toString()) {
      return res.status(400).json({ error: 'Winner must be one of the players in the match' });
    }

    // Get winner details
    const winner = match.player1.playerId.toString() === winnerId.toString() ? match.player1 : match.player2;

    // Update match with result
    match.winner = {
      playerId: winner.playerId,
      playerName: winner.playerName
    };
    match.score = score || '';
    match.status = 'completed';
    match.completedAt = new Date();

    // If tournament is set to auto-advance winners, update next round
    if (tournament.settings?.autoAdvanceWinners && tournament.type === 'single_elimination') {
      // Calculate next round match index
      const nextRoundIndex = roundIndex + 1;
      const nextMatchIndex = Math.floor(matchIndex / 2);

      // Check if next round exists
      if (nextRoundIndex < tournament.brackets.length) {
        const nextRound = tournament.brackets[nextRoundIndex];

        // Check if next match exists
        if (nextMatchIndex < nextRound.matches.length) {
          const nextMatch = nextRound.matches[nextMatchIndex];

          // Determine if winner goes to player1 or player2 slot
          const isPlayer1 = matchIndex % 2 === 0;

          // Update next match with winner
          if (isPlayer1) {
            nextMatch.player1 = {
              playerId: winner.playerId,
              playerName: winner.playerName,
              seed: winner.seed
            };
          } else {
            nextMatch.player2 = {
              playerId: winner.playerId,
              playerName: winner.playerName,
              seed: winner.seed
            };
          }

          // If both players are assigned, update match status
          if (nextMatch.player1 && nextMatch.player2) {
            nextMatch.status = 'pending';
          }
        }
      }
    }

    // Save tournament
    tournament.updatedAt = new Date();
    await tournament.save();

    // Check if tournament is completed (all matches have a result)
    let isCompleted = true;
    for (const bracket of tournament.brackets) {
      for (const m of bracket.matches) {
        if (m.status !== 'completed' && m.status !== 'bye') {
          isCompleted = false;
          break;
        }
      }
      if (!isCompleted) break;
    }

    // If all matches are completed, update tournament status
    if (isCompleted) {
      tournament.status = 'completed';
      await tournament.save();
    }

    res.json({
      message: 'Match result reported successfully',
      match,
      tournament
    });
  } catch (err) {
    console.error('Error reporting match result:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get tournament matches
 * GET /api/tournaments/:id/matches
 */
router.get('/:id/matches', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Get tournament
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Extract matches from brackets
    const matches = [];

    tournament.brackets.forEach(bracket => {
      bracket.matches.forEach(match => {
        matches.push({
          ...match.toObject(),
          round: bracket.round,
          bracketType: bracket.bracketType || 'main'
        });
      });
    });

    res.json(matches);
  } catch (err) {
    console.error('Error getting tournament matches:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
