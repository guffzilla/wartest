const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireAdminOrModerator } = require('../middleware/auth');
const auth = authenticate; // Alias for consistency
const squarePaymentService = require('../services/squarePaymentService');
const coinbaseService = require('../services/coinbaseService');
const UserMembership = require('../models/UserMembership');
const currencyService = require('../services/currencyService');
const Donation = require('../models/Donation');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Use consolidated authentication middleware for membership routes
router.use(authenticate);

/**
 * GET /api/membership/tiers
 * Get available membership tiers and pricing with real-time conversion
 */
router.get('/tiers', async (req, res) => {
  try {
    // Enhanced currency detection with user preferences
    let currency = currencyService.detectUserCurrency(req);
    
    // Check for explicit user preference in headers (from frontend)
    const preferredCurrency = req.headers['x-preferred-currency'];
    if (preferredCurrency && currencyService.isValidCurrency(preferredCurrency)) {
      currency = preferredCurrency.toUpperCase();
      console.log(`🎯 Using explicit user preference: ${currency}`);
    }
    
    console.log(`🌍 Final detected currency for tiers: ${currency} (headers: ${req.headers['accept-language']})`);
    
    // Build tier structure using the model's built-in conversion
    const tiers = {};
    for (let tier = 1; tier <= 5; tier++) {
      const tierData = UserMembership.getTierBenefits(tier, currency);
      console.log(`📋 Tier ${tier} data:`, tierData); // Debug log
      
      tiers[tier] = {
        name: tierData.name,
        description: tierData.description,
        images: tierData.images,
        providers: {
          square: {
            price: tierData.monthlyPrice / 100, // Convert cents to dollars
            currency: currency,
            cadPrice: UserMembership.getTierBenefits(tier, 'CAD').monthlyPrice / 100 // CAD for Square
          },
          coinbase: {
            monthlyPrice: Math.round(tierData.monthlyPrice / 100) // Convert to dollars, round for coinbase
          }
        }
      };
    }
    
    res.json({
      success: true,
      tiers,
      supportedProviders: ['square', 'coinbase'],
      environment: 'sandbox',
      currency: currency,
      currencySymbol: currencyService.getCurrencySymbol(currency),
      detectionMethod: preferredCurrency ? 'user_preference' : 'auto_detected'
    });
  } catch (error) {
    console.error('Error getting membership tiers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get membership tiers' 
    });
  }
});

/**
 * GET /api/membership/status
 * Get user's current membership status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const membership = await UserMembership.getOrCreateForUser(req.user.id);
    
    // Format response for unified MembershipManager
    const isActive = membership.isSubscriptionActive();
    const tier = membership.tier || 0;
    const tierName = membership.tierName || (tier > 0 ? `Hero Tier ${tier}` : 'No Hero Status');
    const unlockedImages = membership.getAccessibleImages() || [];
    
    console.log('🛡️ Membership status response:', {
      isActive,
      tier,
      tierName,
      unlockedImages,
      membershipTier: membership.tier,
      membershipIsActive: membership.isActive,
      subscriptionActive: membership.isSubscriptionActive()
    });
    
    res.json({
      success: true,
      membership: {
        isActive,
        tier,
        tierName,
        unlockedImages,
        subscriptionType: membership.subscriptionType,
        subscriptionStatus: membership.subscriptionStatus,
        paymentProvider: membership.paymentProvider,
        nextBillingDate: membership.nextBillingDate,
        lastPaymentDate: membership.lastPaymentDate,
        gracePeriodEndDate: membership.gracePeriodEndDate
      }
    });
  } catch (error) {
    console.error('Error getting membership status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get membership status' 
    });
  }
});

/**
 * POST /api/membership/create-payment
 * Create payment order (Square or Coinbase) with subscription billing
 */
router.post('/create-payment', authenticate, async (req, res) => {
  try {
    console.log('🎯 Create payment request received:', {
      body: req.body,
      userId: req.user?.id,
      username: req.user?.username,
      headers: {
        'accept-language': req.headers['accept-language'],
        'x-preferred-currency': req.headers['x-preferred-currency']
      }
    });

    const { tier, provider, changeType = 'new', frontendCurrency, frontendPrice } = req.body;
    
    if (!tier || tier < 1 || tier > 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier specified'
      });
    }

    if (!['square', 'coinbase'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment provider. Supported: square, coinbase'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }

    // Detect user's currency using enhanced detection
    const currency = currencyService.detectUserCurrency(req);
    console.log(`🌍 Detected currency for payment: ${currency}`);

    // Validate frontend/backend currency consistency
    if (frontendCurrency && frontendCurrency !== currency) {
      console.warn(`⚠️ Currency mismatch detected: Frontend=${frontendCurrency}, Backend=${currency}`);
      console.log(`🔄 Using backend detected currency: ${currency}`);
    }

    const currentMembership = await UserMembership.getOrCreateForUser(req.user.id);
    let paymentAmount;
    let paymentType;

    console.log(`🔍 Backend upgrade check: changeType=${changeType}, currentTier=${currentMembership.tier}, targetTier=${tier}, currency=${currency}`);

    let paymentAmountCAD; // Amount to charge in CAD for Square
    let displayAmount;    // Amount to display to user in their currency

    if (changeType === 'upgrade' && currentMembership.tier > 0) {
      // Calculate prorated upgrade amount in CAD
      const proration = currentMembership.calculateProratedUpgrade(tier, 'CAD');
      paymentAmountCAD = proration.amount;
      paymentType = 'prorated_upgrade';

      // Convert to user's currency for display
      displayAmount = await currencyService.convertPrice(paymentAmountCAD, currency);

      console.log(`💰 Upgrade pricing: cadAmount=${paymentAmountCAD} CAD, displayAmount=${displayAmount} ${currency}`);

      if (paymentAmountCAD <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot upgrade to a lower or equal tier'
        });
      }
    } else {
      // New subscription - get CAD pricing for Square, display pricing for user
      const cadTierBenefits = UserMembership.getTierBenefits(tier, 'CAD');
      paymentAmountCAD = cadTierBenefits.monthlyPrice;
      displayAmount = await currencyService.convertPrice(paymentAmountCAD, currency);
      paymentType = 'subscription';

      console.log(`💰 New subscription pricing: cadAmount=${paymentAmountCAD} CAD, displayAmount=${displayAmount} ${currency}`);
    }

    // Validate pricing accuracy if frontend provided price
    if (frontendPrice) {
      const priceDifference = Math.abs(displayAmount - frontendPrice);
      const tolerance = 0.05; // 5 cent tolerance for rounding
      
      if (priceDifference > tolerance) {
        console.warn(`💰 Price validation warning: Frontend=${frontendPrice}, Backend=${displayAmount}, Difference=${priceDifference}`);
        console.log(`🔄 Using backend calculated price: ${displayAmount} ${currency}`);
      } else {
        console.log(`✅ Price validation passed: Frontend and backend prices match within tolerance`);
      }
    }
    
    let result;
    
    if (provider === 'square') {
      // Create Square order with CAD amount, pass display currency for metadata
      result = await squarePaymentService.createOrder(req.user.id, tier, paymentAmountCAD, currency, displayAmount);
    } else if (provider === 'coinbase') {
      result = await coinbaseService.createCharge(req.user.id, tier, displayAmount);
    }
    
    // Calculate the amount the user will actually be charged by Square (always CAD)
    const cadDisplayAmount = paymentAmountCAD / 100; // Convert cents to CAD dollars
    const currencySymbol = currencyService.getCurrencySymbol(currency);
    const cadSymbol = currencyService.getCurrencySymbol('CAD');

    res.json({
      success: true,
      provider,
      subscriptionType: 'monthly',
      orderId: result.id,
      // User's display currency and amount
      totalAmount: displayAmount / 100, // Convert cents to dollars
      currency: currency,
      currencySymbol: currencySymbol,
      // Square's actual charge currency and amount
      actualChargeAmount: cadDisplayAmount,
      actualChargeCurrency: 'CAD',
      actualChargeCurrencySymbol: cadSymbol,
      // Payment metadata
      paymentType,
      changeType,
      currentTier: currentMembership.tier,
      newTier: tier,
      pricingValidation: {
        frontendCurrency: frontendCurrency || 'not_provided',
        backendCurrency: currency,
        match: !frontendCurrency || frontendCurrency === currency
      },
      result
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment'
    });
  }
});

/**
 * POST /api/membership/process-payment
 * Process Square payment completion with subscription billing
 */
router.post('/process-payment', authenticate, async (req, res) => {
  try {
    const { orderId, sourceId, verificationToken, tier: tierStr, changeType = 'new', paymentMethod = 'card' } = req.body;
    
    if (!orderId || !sourceId || !tierStr) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information (orderId, sourceId, tier)'
      });
    }

    // Ensure tier is a number
    const tier = parseInt(tierStr, 10);
    if (isNaN(tier) || tier < 1 || tier > 4) {
      return res.status(400).json({
        success: false,
        message: `Invalid tier: ${tierStr}. Must be a number between 1 and 4.`
      });
    }

    // Process Square payment first
    const paymentResult = await squarePaymentService.processPayment(
      orderId, 
      sourceId, 
      verificationToken, 
      req.user.id, 
      tier
    );
    
    // Update membership based on change type
    const membership = await UserMembership.getOrCreateForUser(req.user.id);
    
    console.log(`🔍 Payment processing - membership state before upgrade:`, {
      userId: req.user.id,
      currentTier: membership.tier,
      targetTier: tier,
      changeType,
      tierComparison: `${tier} > ${membership.tier}? ${tier > membership.tier}`
    });
    
    const paymentData = {
      provider: 'square',
      transactionId: paymentResult.id,
      orderId: orderId
    };
    
    let resultMessage;
    
    if (changeType === 'upgrade' && membership.tier > 0) {
      // Double-check the tier validation before calling upgradeSubscription
      if (tier <= membership.tier) {
        console.error(`❌ Tier validation failed: trying to upgrade from ${membership.tier} to ${tier}`);
        throw new Error(`Invalid upgrade: cannot upgrade from tier ${membership.tier} to tier ${tier}`);
      }
      
      // Immediate upgrade with prorated charge
      await membership.upgradeSubscription(tier, paymentData);
      resultMessage = `Upgraded to ${membership.tierName}! You now have access to all ${membership.unlockedImages.length} premium profile images.`;
    } else {
      // New subscription
      await membership.startSubscription(tier, paymentData);
      const methodText = paymentMethod === 'card' ? 'card' : paymentMethod;
      resultMessage = `Welcome to ${membership.tierName}! Your 30-day subscription is now active. Payment processed via ${methodText}.`;
    }
    
    res.json({
      success: true,
      paymentId: paymentResult.id,
      orderId: orderId,
      provider: 'square',
      membership: {
        tier: membership.tier,
        tierName: membership.tierName,
        unlockedImages: membership.unlockedImages,
        currentPeriodEnd: membership.currentPeriodEnd,
        nextBillingDate: membership.nextBillingDate
      },
      message: resultMessage
    });
  } catch (error) {
    console.error('Error processing Square payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment processing failed'
    });
  }
});

/**
 * POST /api/membership/webhook/square
 * Handle Square webhooks
 */
router.post('/webhook/square', async (req, res) => {
  try {
    const event = req.body;
    
    // In production, verify webhook signature here
    await squarePaymentService.handleWebhook(event);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling Square webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Square webhook processing failed' 
    });
  }
});

/**
 * GET /api/membership/admin/:userId
 * Admin: fetch a user's membership record (creates default if missing)
 */
router.get('/admin/:userId', requireAdminOrModerator, async (req, res) => {
  try {
    const { userId } = req.params;
    const membership = await UserMembership.getOrCreateForUser(userId);
    res.json({
      success: true,
      membership: {
        user: membership.user,
        tier: membership.tier,
        tierName: membership.tierName,
        subscriptionType: membership.subscriptionType,
        subscriptionStatus: membership.subscriptionStatus,
        isActive: membership.isActive,
        nextBillingDate: membership.nextBillingDate,
        lastPaymentDate: membership.lastPaymentDate,
        currentPeriodStart: membership.currentPeriodStart,
        currentPeriodEnd: membership.currentPeriodEnd,
        pendingTierChange: membership.pendingTierChange || null
      }
    });
  } catch (error) {
    console.error('Error fetching membership (admin):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch membership' });
  }
});

/**
 * PUT /api/membership/admin/:userId
 * Admin: update a user's membership (manual override, no billing)
 */
router.put('/admin/:userId', requireAdminOrModerator, async (req, res) => {
  try {
    const { userId } = req.params;
    const { tier, subscriptionStatus, isActive, nextBillingDate } = req.body;

    // Moderators cannot modify admins or other moderators
    if (req.user && req.user.role === 'moderator') {
      const targetUser = await User.findById(userId).select('role');
      if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'moderator')) {
        return res.status(403).json({ success: false, message: 'Moderators cannot modify admin/moderator memberships' });
      }
    }

    const membership = await UserMembership.getOrCreateForUser(userId);

    const updates = {};
    if (tier !== undefined) {
      const newTier = parseInt(tier, 10);
      if (Number.isNaN(newTier) || newTier < 0 || newTier > 5) {
        return res.status(400).json({ success: false, message: 'Invalid tier (0-5)' });
      }
      const benefits = UserMembership.getTierBenefits(newTier);
      membership.tier = newTier;
      membership.tierName = benefits.name;
      membership.unlockedImages = benefits.images;
      updates.tier = newTier;
    }

    if (subscriptionStatus) {
      const allowed = ['active', 'cancelled', 'expired', 'pending', 'failed'];
      if (!allowed.includes(subscriptionStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid subscriptionStatus' });
      }
      membership.subscriptionStatus = subscriptionStatus;
      updates.subscriptionStatus = subscriptionStatus;
    }

    if (isActive !== undefined) {
      membership.isActive = Boolean(isActive);
      updates.isActive = membership.isActive;
    }

    if (nextBillingDate) {
      const d = new Date(nextBillingDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid nextBillingDate' });
      }
      membership.nextBillingDate = d;
      updates.nextBillingDate = d;
    }

    await membership.save();
    res.json({ success: true, message: 'Membership updated', updates, membership });
  } catch (error) {
    console.error('Error updating membership (admin):', error);
    res.status(500).json({ success: false, message: 'Failed to update membership' });
  }
});

/**
 * POST /api/membership/admin/cancel/:userId
 * Admin: cancel a subscription (keeps access until period end)
 */
router.post('/admin/cancel/:userId', requireAdminOrModerator, async (req, res) => {
  try {
    const { userId } = req.params;
    // Moderators cannot modify admins or other moderators
    if (req.user && req.user.role === 'moderator') {
      const targetUser = await User.findById(userId).select('role');
      if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'moderator')) {
        return res.status(403).json({ success: false, message: 'Moderators cannot modify admin/moderator memberships' });
      }
    }
    const membership = await UserMembership.getOrCreateForUser(userId);
    await membership.cancelSubscription('Admin cancellation');
    res.json({ success: true, message: 'Subscription cancelled', membership: {
      tier: membership.tier,
      tierName: membership.tierName,
      subscriptionStatus: membership.subscriptionStatus,
      willCancelAt: membership.willCancelAt
    }});
  } catch (error) {
    console.error('Error cancelling membership (admin):', error);
    res.status(500).json({ success: false, message: 'Failed to cancel membership' });
  }
});

/**
 * POST /api/membership/webhook/coinbase
 * Handle Coinbase webhooks
 */
router.post('/webhook/coinbase', async (req, res) => {
  try {
    const event = req.body;
    const signature = req.headers['x-cc-webhook-signature'];
    
    // Verify webhook signature in production
    // const isValid = coinbaseService.verifyWebhookSignature(req.rawBody, signature);
    // if (!isValid) {
    //   return res.status(401).json({ success: false, message: 'Invalid signature' });
    // }
    
    await coinbaseService.handleWebhook(event);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling Coinbase webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Coinbase webhook processing failed' 
    });
  }
});

/**
 * GET /api/membership/history
 * Get user's membership purchase history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const membership = await UserMembership.findOne({ user: req.user.id });
    
    if (!membership) {
      return res.json({
        success: true,
        history: []
      });
    }

    res.json({
      success: true,
      history: membership.paymentHistory || []
    });
  } catch (error) {
    console.error('Error getting membership history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get membership history'
    });
  }
});

/**
 * POST /api/membership/cancel
 * Cancel subscription (keeps access until period end)
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { reason = 'User requested cancellation' } = req.body;
    
    const membership = await UserMembership.findOne({ user: req.user.id });
    if (!membership || membership.tier === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active membership found'
      });
    }

    if (membership.subscriptionStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled'
      });
    }

    // Cancel subscription but keep access until period end
    await membership.cancelSubscription(reason);
    
    res.json({
      success: true,
      message: `Subscription cancelled. You will retain ${membership.tierName} access until ${membership.willCancelAt.toLocaleDateString()}.`,
      retainAccessUntil: membership.willCancelAt,
      currentTier: membership.tier,
      tierName: membership.tierName
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});

/**
 * POST /api/membership/schedule-downgrade
 * Schedule a downgrade to take effect at period end
 */
router.post('/schedule-downgrade', authenticate, async (req, res) => {
  try {
    const { newTier } = req.body;
    
    if (!newTier || newTier < 0 || newTier > 4) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier specified'
      });
    }

    const membership = await UserMembership.findOne({ user: req.user.id });
    if (!membership || membership.tier === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active membership found'
      });
    }

    if (newTier >= membership.tier) {
      return res.status(400).json({
        success: false,
        message: 'Cannot downgrade to a higher or equal tier. Use upgrade instead.'
      });
    }

    // Schedule the downgrade
    await membership.scheduleDowngrade(newTier);
    
    const newTierName = UserMembership.getTierBenefits(newTier).name;
    
    res.json({
      success: true,
      message: `Downgrade scheduled. You will switch to ${newTierName} on ${membership.pendingTierChange.effectiveDate.toLocaleDateString()}.`,
      currentTier: membership.tier,
      currentTierName: membership.tierName,
      pendingTier: newTier,
      pendingTierName: newTierName,
      effectiveDate: membership.pendingTierChange.effectiveDate
    });
  } catch (error) {
    console.error('Error scheduling downgrade:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule downgrade'
    });
  }
});

/**
 * POST /api/membership/calculate-upgrade
 * Calculate prorated cost for an upgrade
 */
router.post('/calculate-upgrade', authenticate, async (req, res) => {
  try {
    const { newTier } = req.body;
    
    if (!newTier || newTier < 1 || newTier > 4) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier specified'
      });
    }

    // Detect user's currency
    const currency = currencyService.detectUserCurrency(req);
    console.log(`🌍 Detected currency for upgrade calculation: ${currency}`);

    const membership = await UserMembership.findOne({ user: req.user.id });
    if (!membership) {
      return res.status(400).json({
        success: false,
        message: 'No membership found'
      });
    }

    if (newTier <= membership.tier) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upgrade to a lower or equal tier'
      });
    }

    const proration = membership.calculateProratedUpgrade(newTier, currency);
    const newTierBenefits = UserMembership.getTierBenefits(newTier, currency);
    
    res.json({
      success: true,
      currentTier: membership.tier,
      currentTierName: membership.tierName,
      newTier: newTier,
      newTierName: newTierBenefits.name,
      proratedAmount: proration.amount,
      daysRemaining: proration.daysRemaining,
      priceDifference: proration.priceDifference,
      currentPrice: proration.currentPrice,
      newPrice: proration.newPrice,
      currentPeriodEnd: membership.currentPeriodEnd,
      currency: currency,
      currencySymbol: currencyService.getCurrencySymbol(currency)
    });
  } catch (error) {
    console.error('Error calculating upgrade cost:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate upgrade cost'
    });
  }
});

/**
 * POST /api/membership/change-tier
 * Upgrade or downgrade membership tier
 */
router.post('/change-tier', authenticate, async (req, res) => {
  try {
    const { newTier, provider, subscriptionType = 'monthly' } = req.body;
    
    if (!newTier || newTier < 1 || newTier > 4) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier specified'
      });
    }

    const membership = await UserMembership.findOne({ user: req.user.id });
    if (!membership) {
      return res.status(400).json({
        success: false,
        message: 'No membership found. Please create a new subscription.'
      });
    }

    if (membership.tier === newTier) {
      return res.status(400).json({
        success: false,
        message: 'You are already on this tier'
      });
    }

    // For tier changes, user needs to create a new payment
    // This will be handled by the create-payment endpoint
    res.json({
      success: true,
      message: 'Please create a new payment for the tier change',
      currentTier: membership.tier,
      newTier: newTier,
      action: newTier > membership.tier ? 'upgrade' : 'downgrade'
    });
  } catch (error) {
    console.error('Error changing tier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change tier'
    });
  }
});

/**
 * POST /api/membership/check-image-access
 * Check if user has access to specific profile image
 */
router.post('/check-image-access', authenticate, async (req, res) => {
  try {
    const { imageName } = req.body;
    
    if (!imageName) {
      return res.status(400).json({
        success: false,
        message: 'Image name is required'
      });
    }

    const membership = await UserMembership.getOrCreateForUser(req.user.id);
    const hasAccess = membership.hasImageAccess(imageName);
    
    res.json({
      success: true,
      hasAccess,
      tier: membership.tier,
      betaAccess: membership.betaAccess
    });
  } catch (error) {
    console.error('Error checking image access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check image access'
    });
  }
});

/**
 * POST /api/membership/initialize-current-user
 * Initialize membership record for current user (for testing)
 */
router.post('/initialize-current-user', authenticate, async (req, res) => {
  try {
    // Check if membership already exists
    const existingMembership = await UserMembership.findOne({ user: req.user.id });

    if (!existingMembership) {
      // Create default membership record
      const membership = new UserMembership({
        user: req.user.id,
        tier: 0,
        tierName: 'None',
        unlockedImages: [],
        subscriptionType: 'monthly',
        subscriptionStatus: 'pending',
        betaAccess: true,
        isActive: true
      });

      await membership.save();
      console.log(`✅ Initialized membership for user: ${req.user.username}`);

      res.json({
        success: true,
        message: 'Membership record initialized successfully',
        membership: {
          tier: membership.tier,
          tierName: membership.tierName,
          isActive: membership.isActive,
          betaAccess: membership.betaAccess
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Membership record already exists',
        membership: {
          tier: existingMembership.tier,
          tierName: existingMembership.tierName,
          isActive: existingMembership.isActive,
          betaAccess: existingMembership.betaAccess
        }
      });
    }
  } catch (error) {
    console.error('Error initializing current user membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize membership record'
    });
  }
});

/**
 * POST /api/membership/admin/initialize-old-users
 * Initialize membership records for users created before the membership system
 */
router.post('/admin/initialize-old-users', async (req, res) => {
  try {
    // This should be protected by admin middleware in production
    const User = require('../models/User');

    // Find all users without membership records
    const usersWithoutMembership = await User.find({}).lean();
    let initializedCount = 0;
    let skippedCount = 0;

    for (const user of usersWithoutMembership) {
      try {
        // Check if membership already exists
        const existingMembership = await UserMembership.findOne({ user: user._id });

        if (!existingMembership) {
          // Create default membership record
          const membership = new UserMembership({
            user: user._id,
            tier: 0,
            tierName: 'None',
            unlockedImages: [],
            subscriptionType: 'monthly',
            subscriptionStatus: 'pending',
            betaAccess: true,
            isActive: true
          });

          await membership.save();
          initializedCount++;
          console.log(`✅ Initialized membership for user: ${user.username || user._id}`);
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to initialize membership for user ${user._id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Initialized ${initializedCount} users, skipped ${skippedCount} existing records`,
      initializedCount,
      skippedCount,
      totalUsers: usersWithoutMembership.length
    });
  } catch (error) {
    console.error('Error initializing old users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize old users'
    });
  }
});

/**
 * POST /api/membership/check-donation-paladin
 * Check if user has made any donations and unlock Paladin tier if they have
 */
router.post('/check-donation-paladin', authenticate, async (req, res) => {
  try {
    console.log(`🛡️ Checking donations for Paladin unlock for user: ${req.user.username}`);
    
    // Check if user has made any donations
    const userDonations = await Donation.find({ userId: req.user.id });
    console.log(`💰 Found ${userDonations.length} donations for user ${req.user.username}`);
    
    if (userDonations.length === 0) {
      return res.json({
        success: false,
        message: 'No donations found. Make a donation to unlock the Paladin avatar!',
        hasDonations: false,
        donationCount: 0
      });
    }

    // Get or create membership record
    const membership = await UserMembership.getOrCreateForUser(req.user.id);
    
    // Check if user already has Paladin tier
    if (membership.tier === 5) {
      return res.json({
        success: true,
        message: 'You already have the Paladin tier unlocked!',
        hasDonations: true,
        donationCount: userDonations.length,
        alreadyUnlocked: true
      });
    }

    // Check if user already has the paladin image unlocked (edge case)
    if (membership.unlockedImages && membership.unlockedImages.includes('paladin.png')) {
      return res.json({
        success: true,
        message: 'You already have the Paladin avatar unlocked!',
        hasDonations: true,
        donationCount: userDonations.length,
        alreadyUnlocked: true
      });
    }

    // Unlock Paladin tier - add to existing tier, don't replace
    console.log(`🛡️ Unlocking Paladin tier for user ${req.user.username}`);
    
    // Add paladin.png to unlocked images if not already there
    if (!membership.unlockedImages.includes('paladin.png')) {
      membership.unlockedImages.push('paladin.png');
    }

    // If user has no tier, set to tier 5, otherwise keep their current tier
    if (membership.tier === 0) {
      membership.tier = 5;
      membership.tierName = 'Holy Paladin';
      membership.subscriptionType = 'one_time';
      membership.subscriptionStatus = 'active';
      membership.isActive = true;
    }

    // Add to payment history for tracking
    membership.paymentHistory.push({
      date: new Date(),
      amount: 0, // Free unlock via donation
      provider: 'donation_unlock',
      transactionId: `paladin_unlock_${Date.now()}`,
      status: 'success',
      type: 'one_time',
      toTier: membership.tier,
      periodStart: new Date(),
      periodEnd: new Date('2099-12-31') // Never expires
    });

    await membership.save();
    console.log(`✅ Paladin tier unlocked for user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Congratulations! Your Paladin avatar has been unlocked thanks to your donation support!',
      hasDonations: true,
      donationCount: userDonations.length,
      paladinUnlocked: true,
      totalDonated: userDonations.reduce((sum, d) => sum + d.amount, 0),
      membership: {
        tier: membership.tier,
        tierName: membership.tierName,
        unlockedImages: membership.unlockedImages
      }
    });
  } catch (error) {
    console.error('Error checking donation paladin unlock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check donation status'
    });
  }
});

module.exports = router;
