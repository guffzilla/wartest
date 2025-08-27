const express = require('express');
const router = express.Router();
const GameUnit = require('../models/GameUnit');

// Get all units for a specific game and race
router.get('/:game/:race', async (req, res) => {
  try {
    const { game, race } = req.params;
    const { type = 'unit' } = req.query;

    const units = await GameUnit.find({
      game: game.toLowerCase(),
      race: race.toLowerCase(),
      type: type.toLowerCase()
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: units,
      count: units.length
    });
  } catch (error) {
    console.error('Error fetching game units:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game units'
    });
  }
});

// Get all units for a specific game
router.get('/:game', async (req, res) => {
  try {
    const { game } = req.params;
    const { type } = req.query;

    const query = { game: game.toLowerCase() };
    if (type) {
      query.type = type.toLowerCase();
    }

    const units = await GameUnit.find(query).sort({ race: 1, name: 1 });

    // Group by race
    const groupedUnits = units.reduce((acc, unit) => {
      if (!acc[unit.race]) {
        acc[unit.race] = [];
      }
      acc[unit.race].push(unit);
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedUnits,
      count: units.length
    });
  } catch (error) {
    console.error('Error fetching game units:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game units'
    });
  }
});

// Get all available games and races
router.get('/', async (req, res) => {
  try {
    const games = await GameUnit.distinct('game');
    const races = await GameUnit.distinct('race');
    const types = await GameUnit.distinct('type');

    res.json({
      success: true,
      data: {
        games,
        races,
        types
      }
    });
  } catch (error) {
    console.error('Error fetching game unit metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game unit metadata'
    });
  }
});

module.exports = router; 