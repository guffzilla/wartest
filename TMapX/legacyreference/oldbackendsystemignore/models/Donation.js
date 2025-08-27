const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Donation Schema
 * 
 * Represents a donation made to the site
 */
const DonationSchema = new Schema({
  // Amount donated
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Currency (USD, EUR, etc.)
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  
  // Source of donation (PayPal, Patreon, etc.)
  source: {
    type: String,
    required: true,
    enum: ['paypal', 'patreon', 'coinbase', 'other'],
    default: 'other'
  },
  
  // User who made the donation (if logged in)
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Donor name (if provided)
  donorName: {
    type: String,
    default: 'Anonymous'
  },
  
  // Donor email (if provided)
  donorEmail: {
    type: String,
    default: null
  },
  
  // Transaction ID from payment processor
  transactionId: {
    type: String,
    default: null
  },
  
  // Message from donor
  message: {
    type: String,
    default: ''
  },
  
  // Whether to display the donation publicly
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Month and year of the donation (for monthly goals)
  monthYear: {
    type: String,
    default: function() {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

// Static method to get total donations for a specific month
DonationSchema.statics.getMonthlyTotal = async function(year, month) {
  // Format month to ensure it's two digits
  const formattedMonth = String(month).padStart(2, '0');
  const monthYear = `${year}-${formattedMonth}`;
  
  const result = await this.aggregate([
    { $match: { monthYear } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get current month's total
DonationSchema.statics.getCurrentMonthTotal = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  
  return this.getMonthlyTotal(year, month);
};

// Static method to get recent donations
DonationSchema.statics.getRecentDonations = async function(limit = 10) {
  return this.find({ isPublic: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('amount currency donorName message createdAt');
};

module.exports = mongoose.model('Donation', DonationSchema);
