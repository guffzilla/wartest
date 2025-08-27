const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserMembershipSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Current active tier (1-5)
  tier: {
    type: Number,
    enum: [0, 1, 2, 3, 4, 5], // 0 = no membership, 1-5 = tiers
    default: 0
  },
  
  // Subscription details
  subscriptionType: {
    type: String,
    enum: ['monthly', 'one_time'],
    default: 'monthly'
  },
  
  // Payment provider
  paymentProvider: {
    type: String,
    enum: ['paypal', 'coinbase', 'square'],
    required: function() { return this.tier > 0; }
  },
  
  // Provider-specific IDs
  paypalSubscriptionId: String,
  paypalPaymentId: String,
  coinbaseChargeId: String,
  coinbasePaymentId: String,
  squarePaymentId: String,
  squareOrderId: String,
  
  // Subscription status
  subscriptionStatus: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending', 'failed'],
    default: 'pending'
  },
  
  // Payment amount (monthly fee in cents)
  monthlyAmount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Tier details
  tierName: {
    type: String,
    enum: ['None', 'Forest Guardian', 'Mountain Warrior', 'Arcane Master', 'Dragon Lord', 'Holy Paladin'],
    default: 'None'
  },
  
  // Unlocked profile images
  unlockedImages: [{
    type: String,
    enum: ['elf.png', 'dwarf.png', 'mage.png', 'dragon.png', 'paladin.png']
  }],
  
  // Subscription dates
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  nextBillingDate: Date,
  lastPaymentDate: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  
  // Pending tier changes (for downgrades)
  pendingTierChange: {
    newTier: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5]
    },
    effectiveDate: Date,
    reason: {
      type: String,
      enum: ['downgrade', 'cancellation']
    },
    scheduledBy: Date
  },
  
  // Cancellation info
  cancelledAt: Date,
  cancellationReason: String,
  willCancelAt: Date, // When subscription will actually end (after current period)
  
  // Grace period for failed payments
  gracePeriodEndDate: Date,
  
  // Beta access (removed - now production ready)
  betaAccess: {
    type: Boolean,
    default: false // Production mode - users need to pay for access
  },
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Payment history
  paymentHistory: [{
    date: { type: Date, default: Date.now },
    amount: Number,
    provider: String,
    transactionId: String,
    status: { type: String, enum: ['success', 'failed', 'pending', 'refunded'] },
    type: { type: String, enum: ['subscription', 'upgrade', 'downgrade', 'one_time', 'prorated_upgrade'] },
    fromTier: Number,
    toTier: Number,
    periodStart: Date,
    periodEnd: Date,
    prorationDetails: {
      daysRemaining: Number,
      proratedAmount: Number,
      fullAmount: Number
    }
  }],
  
  // Additional data
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for fast lookups
UserMembershipSchema.index({ user: 1 });
UserMembershipSchema.index({ tier: 1 });
UserMembershipSchema.index({ isActive: 1 });

// Virtual for tier benefits and pricing
UserMembershipSchema.virtual('tierBenefits').get(function() {
  return this.constructor.getTierBenefits(this.tier);
});

// Method to check if subscription is currently active
UserMembershipSchema.methods.isSubscriptionActive = function() {
  const now = new Date();
  
  // For existing users: if they have a tier and isActive is true, consider them active
  // This handles the transition from beta to production
  if (this.tier > 0 && this.isActive) {
    return true;
  }
  
  // Check if subscription is active and not expired
  if (this.subscriptionStatus === 'active' && this.isActive) {
    // If there's a current period end, check if we're still in it
    if (this.currentPeriodEnd && now <= this.currentPeriodEnd) {
      return true;
    }
    // If no period end set, check subscription end date
    if (!this.subscriptionEndDate || this.subscriptionEndDate > now) {
      return true;
    }
  }
  
  // Check if cancelled but still in grace period
  if (this.subscriptionStatus === 'cancelled' && this.willCancelAt && now < this.willCancelAt) {
    return true;
  }
  
  return false;
};

// Method to check if user has access to specific image
UserMembershipSchema.methods.hasImageAccess = function(imageName) {
  // Check if subscription is active and tier includes this image
  if (!this.isSubscriptionActive()) {
    return false;
  }
  
  return this.unlockedImages.includes(imageName);
};

// Method to get all accessible images
UserMembershipSchema.methods.getAccessibleImages = function() {
  if (!this.isSubscriptionActive()) {
    return [];
  }
  
  return this.unlockedImages;
};

// Method to upgrade/downgrade subscription
UserMembershipSchema.methods.changeTier = async function(newTier, paymentProvider, paymentData) {
  const tierBenefits = this.constructor.getTierBenefits(newTier);
  const oldTier = this.tier;
  
  this.tier = newTier;
  this.tierName = tierBenefits.name;
  this.unlockedImages = tierBenefits.images;
  this.paymentProvider = paymentProvider;
  this.lastPaymentDate = new Date();
  
  // Add to payment history
  this.paymentHistory.push({
    date: new Date(),
    amount: this.monthlyAmount,
    provider: paymentProvider,
    transactionId: paymentData.transactionId,
    status: 'success',
    type: newTier > oldTier ? 'upgrade' : (newTier < oldTier ? 'downgrade' : 'subscription')
  });
  
  // Update subscription dates
  if (this.subscriptionType === 'monthly') {
    this.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  }
  
  await this.save();
  return this;
};

// Method to calculate prorated amount for upgrades
UserMembershipSchema.methods.calculateProratedUpgrade = function(newTier, currency = 'CAD') {
  // Ensure both values are numbers for comparison
  const targetTier = parseInt(newTier, 10);
  const currentTier = parseInt(this.tier, 10);
  
  const now = new Date();
  const currentTierBenefits = this.constructor.getTierBenefits(currentTier, currency);
  const newTierBenefits = this.constructor.getTierBenefits(targetTier, currency);
  
  console.log(`🔍 Proration calculation (${currency}):`, {
    currentTier,
    targetTier,
    currentPrice: currentTierBenefits.monthlyPrice,
    newPrice: newTierBenefits.monthlyPrice,
    currency: currency,
    periodEnd: this.currentPeriodEnd,
    nextBillingDate: this.nextBillingDate
  });
  
  if (targetTier <= currentTier) {
    return { amount: 0, daysRemaining: 0, currency }; // No charge for downgrades
  }
  
  // Calculate days remaining in current period
  const periodEnd = this.currentPeriodEnd || this.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.max(0, Math.ceil((periodEnd - now) / (24 * 60 * 60 * 1000)));
  
  // Calculate prorated difference
  const priceDifference = newTierBenefits.monthlyPrice - currentTierBenefits.monthlyPrice;
  const proratedAmount = Math.round((priceDifference * daysRemaining) / 30);
  
  console.log(`💰 Proration result (${currency}):`, {
    daysRemaining,
    priceDifference,
    proratedAmount,
    currency,
    calculation: `${priceDifference} * ${daysRemaining} / 30 = ${proratedAmount}`
  });
  
  return {
    amount: proratedAmount,
    daysRemaining,
    priceDifference,
    currentPrice: currentTierBenefits.monthlyPrice,
    newPrice: newTierBenefits.monthlyPrice,
    currency: currency
  };
};

// Method to start a new 30-day subscription
UserMembershipSchema.methods.startSubscription = async function(tier, paymentData) {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const tierBenefits = this.constructor.getTierBenefits(tier);
  
  this.tier = tier;
  this.tierName = tierBenefits.name;
  this.unlockedImages = tierBenefits.images;
  this.subscriptionType = 'monthly';
  this.subscriptionStatus = 'active';
  this.subscriptionStartDate = now;
  this.currentPeriodStart = now;
  this.currentPeriodEnd = periodEnd;
  this.nextBillingDate = periodEnd;
  this.lastPaymentDate = now;
  this.monthlyAmount = tierBenefits.monthlyPrice;
  this.isActive = true;
  
  // Clear any pending changes
  this.pendingTierChange = undefined;
  this.cancelledAt = undefined;
  this.willCancelAt = undefined;
  
  // Add to payment history
  this.paymentHistory.push({
    date: now,
    amount: tierBenefits.monthlyPrice,
    provider: paymentData.provider,
    transactionId: paymentData.transactionId,
    status: 'success',
    type: 'subscription',
    toTier: tier,
    periodStart: now,
    periodEnd: periodEnd
  });
  
  await this.save();
  return this;
};

// Method to upgrade subscription immediately (with prorated charge)
UserMembershipSchema.methods.upgradeSubscription = async function(newTier, paymentData) {
  // Ensure both values are numbers for comparison
  const targetTier = parseInt(newTier, 10);
  const currentTier = parseInt(this.tier, 10);
  
  console.log(`🔍 upgradeSubscription called: newTier=${targetTier} (${typeof targetTier}), currentTier=${currentTier} (${typeof currentTier})`);
  
  if (targetTier <= currentTier) {
    console.error(`❌ Upgrade validation failed in model: targetTier=${targetTier}, currentTier=${currentTier}`);
    throw new Error('Cannot upgrade to a lower or equal tier');
  }
  
  // Use the numeric tier value for the rest of the method
  newTier = targetTier;
  
  const proration = this.calculateProratedUpgrade(newTier);
  const now = new Date();
  const tierBenefits = this.constructor.getTierBenefits(newTier);
  
  // Update tier immediately
  const oldTier = this.tier;
  this.tier = newTier;
  this.tierName = tierBenefits.name;
  this.unlockedImages = tierBenefits.images;
  this.monthlyAmount = tierBenefits.monthlyPrice;
  this.lastPaymentDate = now;
  
  // Add to payment history
  this.paymentHistory.push({
    date: now,
    amount: proration.amount,
    provider: paymentData.provider,
    transactionId: paymentData.transactionId,
    status: 'success',
    type: 'prorated_upgrade',
    fromTier: oldTier,
    toTier: newTier,
    periodStart: this.currentPeriodStart,
    periodEnd: this.currentPeriodEnd,
    prorationDetails: proration
  });
  
  await this.save();
  return this;
};

// Method to schedule a downgrade (takes effect at period end)
UserMembershipSchema.methods.scheduleDowngrade = async function(newTier, reason = 'User requested downgrade') {
  if (newTier >= this.tier) {
    throw new Error('Cannot downgrade to a higher or equal tier');
  }
  
  const periodEnd = this.currentPeriodEnd || this.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  this.pendingTierChange = {
    newTier: newTier,
    effectiveDate: periodEnd,
    reason: 'downgrade',
    scheduledBy: new Date()
  };
  
  await this.save();
  return this;
};

// Method to cancel subscription (keeps access until period end)
UserMembershipSchema.methods.cancelSubscription = async function(reason = 'User requested') {
  const now = new Date();
  const periodEnd = this.currentPeriodEnd || this.nextBillingDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  this.subscriptionStatus = 'cancelled';
  this.cancelledAt = now;
  this.cancellationReason = reason;
  this.willCancelAt = periodEnd;
  
  // Schedule downgrade to tier 0 at period end
  this.pendingTierChange = {
    newTier: 0,
    effectiveDate: periodEnd,
    reason: 'cancellation',
    scheduledBy: now
  };
  
  await this.save();
  return this;
};

// Method to process pending tier changes (called by scheduler)
UserMembershipSchema.methods.processPendingChange = async function() {
  if (!this.pendingTierChange || !this.pendingTierChange.effectiveDate) {
    return false;
  }
  
  const now = new Date();
  if (now < this.pendingTierChange.effectiveDate) {
    return false; // Not time yet
  }
  
  const oldTier = this.tier;
  const newTier = this.pendingTierChange.newTier;
  const tierBenefits = this.constructor.getTierBenefits(newTier);
  
  // Apply the tier change
  this.tier = newTier;
  this.tierName = tierBenefits.name;
  this.unlockedImages = tierBenefits.images;
  this.monthlyAmount = tierBenefits.monthlyPrice;
  
  if (newTier === 0) {
    // Complete cancellation
    this.subscriptionStatus = 'expired';
    this.isActive = false;
    this.subscriptionEndDate = now;
  } else {
    // Start new billing period for downgraded tier
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    this.currentPeriodStart = now;
    this.currentPeriodEnd = periodEnd;
    this.nextBillingDate = periodEnd;
    this.subscriptionStatus = 'active';
  }
  
  // Add to payment history
  this.paymentHistory.push({
    date: now,
    amount: 0, // No charge for downgrades/cancellations
    status: 'success',
    type: this.pendingTierChange.reason === 'cancellation' ? 'cancellation' : 'downgrade',
    fromTier: oldTier,
    toTier: newTier,
    periodStart: this.currentPeriodStart,
    periodEnd: this.currentPeriodEnd
  });
  
  // Clear pending change
  this.pendingTierChange = undefined;
  
  await this.save();
  return true;
};

// Method to renew subscription (called by scheduler)
UserMembershipSchema.methods.renewSubscription = async function() {
  if (this.subscriptionStatus !== 'active') {
    return false;
  }
  
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Update billing period
  this.currentPeriodStart = now;
  this.currentPeriodEnd = periodEnd;
  this.nextBillingDate = periodEnd;
  this.lastPaymentDate = now;
  
  // Add to payment history (actual payment processing would be handled separately)
  this.paymentHistory.push({
    date: now,
    amount: this.monthlyAmount,
    status: 'pending', // Will be updated when payment processes
    type: 'subscription',
    toTier: this.tier,
    periodStart: now,
    periodEnd: periodEnd
  });
  
  await this.save();
  return true;
};

// Static method to get tier benefits (base USD pricing)
UserMembershipSchema.statics.getTierBenefits = function(tier, currency = 'CAD') {
  // Base pricing in CAD cents (changed from USD to match Square account)
  const baseBenefits = {
    0: { 
      images: [], 
      name: 'None', 
      description: 'No membership benefits',
      monthlyPrice: 0, 
      oneTimePrice: 0 
    },
    1: { 
      images: ['elf.png'], 
      name: 'Forest Guardian', 
      description: 'Unlock the mystical Elf avatar and support the realm',
      monthlyPrice: 675, // C$6.75/month
      oneTimePrice: 2025 // C$20.25 one-time
    },
    2: { 
      images: ['elf.png', 'dwarf.png'], 
      name: 'Mountain Warrior', 
      description: 'Access to Elf and Dwarf avatars with warrior spirit',
      monthlyPrice: 1350, // C$13.50/month  
      oneTimePrice: 4050 // C$40.50 one-time
    },
    3: { 
      images: ['elf.png', 'dwarf.png', 'mage.png'], 
      name: 'Arcane Master', 
      description: 'Command three mystical avatars: Elf, Dwarf, and Mage',
      monthlyPrice: 2700, // C$27.00/month
      oneTimePrice: 8100 // C$81.00 one-time
    },
    4: { 
      images: ['elf.png', 'dwarf.png', 'mage.png', 'dragon.png'], 
      name: 'Dragon Lord', 
      description: 'Master all four legendary avatars and rule the realm',
      monthlyPrice: 5400, // C$54.00/month
      oneTimePrice: 16200 // C$162.00 one-time
    },
    5: { 
      images: ['paladin.png'], 
      name: 'Holy Paladin', 
      description: 'Unlock the righteous Paladin avatar with any one-time donation',
      monthlyPrice: 0, // Not a monthly subscription
      oneTimePrice: 0 // Any amount donation unlocks this
    }
  };
  
  const tierData = baseBenefits[tier] || baseBenefits[0];
  
  // If CAD (base currency) or invalid currency, return base pricing
  if (currency === 'CAD' || !currency) {
    return { ...tierData, currency: 'CAD' };
  }
  
  // Convert to requested currency from CAD base
  const convertedData = { ...tierData };
  const conversionRate = this.getCurrencyConversionRate(currency);
  
  convertedData.monthlyPrice = Math.round(tierData.monthlyPrice * conversionRate);
  convertedData.oneTimePrice = Math.round(tierData.oneTimePrice * conversionRate);
  convertedData.currency = currency;
  
  return convertedData;
};

// Static method to get currency conversion rates from CAD
UserMembershipSchema.statics.getCurrencyConversionRate = function(currency) {
  // Static conversion rates from CAD base (1 CAD = X other currency)
  const rates = {
    'CAD': 1.0,   // Base currency
    'USD': 0.74,  // 1 CAD = 0.74 USD
    'EUR': 0.68,  // 1 CAD = 0.68 EUR
    'GBP': 0.58,  // 1 CAD = 0.58 GBP
    'AUD': 1.07,  // 1 CAD = 1.07 AUD
    'JPY': 108,   // 1 CAD = 108 JPY
  };
  
  return rates[currency] || 1.0;
};

// Static method to detect user currency based on location
UserMembershipSchema.statics.detectUserCurrency = function(countryCode, ipAddress = null) {
  // Currency mapping by country code
  const currencyMap = {
    'US': 'USD',
    'CA': 'CAD', 
    'GB': 'GBP',
    'AU': 'AUD',
    'JP': 'JPY',
    'DE': 'EUR',
    'FR': 'EUR',
    'IT': 'EUR',
    'ES': 'EUR',
    'NL': 'EUR',
    'BE': 'EUR',
    'AT': 'EUR',
    'PT': 'EUR',
    'IE': 'EUR',
    'FI': 'EUR',
    'GR': 'EUR',
    'LU': 'EUR',
    'MT': 'EUR',
    'CY': 'EUR',
    'SK': 'EUR',
    'SI': 'EUR',
    'EE': 'EUR',
    'LV': 'EUR',
    'LT': 'EUR'
  };
  
  return currencyMap[countryCode] || 'USD';
};

// Static method to get or create membership for user
UserMembershipSchema.statics.getOrCreateForUser = async function(userId) {
  let membership = await this.findOne({ user: userId });
  
  if (!membership) {
    membership = new this({
      user: userId,
      tier: 0,
      tierName: 'None',
      unlockedImages: [],
      subscriptionType: 'monthly',
      subscriptionStatus: 'pending',
      betaAccess: true // Default beta access
    });
    await membership.save();
  }
  
  return membership;
};

module.exports = mongoose.model('UserMembership', UserMembershipSchema); 