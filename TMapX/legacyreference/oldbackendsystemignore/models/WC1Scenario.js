const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * WC1Scenario Schema
 *
 * Represents a Warcraft 1 scenario/level for rating and commenting.
 * These are the classic campaign scenarios displayed as images.
 */
const WC1ScenarioSchema = new Schema({
  // Scenario name (e.g., "Forest 1", "Swamp 3", "Dungeon 7")
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },

  // Category (forest, swamp, dungeon)
  category: {
    type: String,
    required: true,
    enum: ['forest', 'swamp', 'dungeon'],
    index: true
  },

  // Image path for the scenario
  imagePath: {
    type: String,
    required: true
  },

  // Description (optional)
  description: {
    type: String,
    default: ''
  },

  // Display order for consistent sorting
  displayOrder: {
    type: Number,
    required: true,
    index: true
  },

  // Rating system
  ratings: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],

  // Calculated rating statistics
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  ratingCount: {
    type: Number,
    default: 0,
    min: 0
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for category and display order
WC1ScenarioSchema.index({ category: 1, displayOrder: 1 });

// Index for rating sorting
WC1ScenarioSchema.index({ averageRating: -1, ratingCount: -1 });

/**
 * Add a rating to this scenario
 * @param {Object} ratingData - Object containing userId, rating, and comment
 * @returns {Promise<WC1Scenario>} Updated scenario
 */
WC1ScenarioSchema.methods.addRating = async function(ratingData) {
  const { userId, rating, comment = '' } = ratingData;
  
  // Remove existing rating from this user if it exists
  this.ratings = this.ratings.filter(r => !r.userId.equals(userId));
  
  // Add new rating
  this.ratings.push({
    userId,
    rating,
    comment,
    date: new Date()
  });
  
  // Recalculate average rating and count
  this.ratingCount = this.ratings.length;
  this.averageRating = this.ratings.length > 0 
    ? this.ratings.reduce((sum, r) => sum + r.rating, 0) / this.ratings.length 
    : 0;
  
  return await this.save();
};

/**
 * Remove a rating from this scenario
 * @param {ObjectId} userId - ID of the user whose rating to remove
 * @returns {Promise<WC1Scenario>} Updated scenario
 */
WC1ScenarioSchema.methods.removeRating = async function(userId) {
  // Remove the rating
  this.ratings = this.ratings.filter(r => !r.userId.equals(userId));
  
  // Recalculate average rating and count
  this.ratingCount = this.ratings.length;
  this.averageRating = this.ratings.length > 0 
    ? this.ratings.reduce((sum, r) => sum + r.rating, 0) / this.ratings.length 
    : 0;
  
  return await this.save();
};

/**
 * Get rating by user
 * @param {ObjectId} userId - ID of the user
 * @returns {Object|null} User's rating or null if not found
 */
WC1ScenarioSchema.methods.getRatingByUser = function(userId) {
  return this.ratings.find(r => r.userId.equals(userId)) || null;
};

module.exports = mongoose.model('WC1Scenario', WC1ScenarioSchema); 