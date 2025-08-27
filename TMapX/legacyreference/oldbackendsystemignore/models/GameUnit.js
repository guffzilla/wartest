const mongoose = require('mongoose');

const gameUnitSchema = new mongoose.Schema({
  game: {
    type: String,
    required: true,
    enum: ['wc1', 'wc2', 'wc3'],
    index: true
  },
  race: {
    type: String,
    required: true,
    enum: ['human', 'orc', 'undead', 'nightelf', 'neutral'],
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['unit', 'building', 'hero', 'item'],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  stats: {
    hp: Number,
    mana: Number,
    attack: String, // e.g., "6-6", "8-12"
    armor: Number,
    range: Number,
    sight: Number,
    speed: Number
  },
  costs: {
    gold: Number,
    wood: Number,
    food: Number,
    oil: Number
  },
  requirements: {
    buildings: [String],
    upgrades: [String],
    level: Number
  },
  abilities: [{
    name: String,
    description: String,
    manaCost: Number,
    cooldown: Number,
    range: Number
  }],
  upgrades: [{
    name: String,
    description: String,
    cost: {
      gold: Number,
      wood: Number
    },
    effect: String
  }],
  production: {
    time: Number, // seconds
    building: String
  },
  source: {
    type: String,
    default: 'wowpedia'
  },
  category: {
    type: String,
    enum: ['creep', 'mercenary', 'hero', 'building', 'consumable', 'permanent', 'artifact'],
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
gameUnitSchema.index({ game: 1, race: 1, type: 1 });

module.exports = mongoose.model('GameUnit', gameUnitSchema); 