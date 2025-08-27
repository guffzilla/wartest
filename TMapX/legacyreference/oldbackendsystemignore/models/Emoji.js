const mongoose = require('mongoose');

const EmojiSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  emoji: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['basic', 'expressions', 'animals', 'food', 'activities', 'objects', 'symbols', 'flags', 'premium', 'legendary', 'champion']
  },
  tier: {
    type: String,
    required: true,
    enum: ['free', 'bronze', 'gold', 'amber', 'sapphire', 'champion']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

EmojiSchema.index({ tier: 1, price: 1 });
EmojiSchema.index({ category: 1 });

module.exports = mongoose.model('Emoji', EmojiSchema); 