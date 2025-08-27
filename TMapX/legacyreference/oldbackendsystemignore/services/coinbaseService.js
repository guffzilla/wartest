const axios = require('axios');
const crypto = require('crypto');
const UserMembership = require('../models/UserMembership');
const User = require('../models/User');

class CoinbaseService {
  constructor() {
    this.apiKey = process.env.COINBASE_API_KEY || 'your-coinbase-api-key';
    this.webhookSecret = process.env.COINBASE_WEBHOOK_SECRET || 'your-webhook-secret';
    this.baseURL = 'https://api.commerce.coinbase.com';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22'
      }
    });
  }

  /**
   * Get tier pricing for Coinbase (same as PayPal but in crypto-friendly format)
   */
  getTierPricing() {
    return {
      1: { monthlyPrice: 5.00, name: 'Forest Guardian' },
      2: { monthlyPrice: 10.00, name: 'Mountain Warrior' },
      3: { monthlyPrice: 20.00, name: 'Arcane Master' },
      4: { monthlyPrice: 40.00, name: 'Dragon Lord' }
    };
  }

  /**
   * Create Coinbase charge for one-time payment
   */
  async createCharge(userId, tier, subscriptionType = 'one_time') {
    try {
      const pricing = this.getTierPricing()[tier];
      if (!pricing) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const amount = subscriptionType === 'monthly' ? pricing.monthlyPrice : pricing.oneTimePrice;
      const description = subscriptionType === 'monthly' 
        ? `${pricing.name} Monthly Subscription (First Month)`
        : `${pricing.name} Membership - Lifetime Access`;

      const chargeData = {
        name: `Warcraft Arena - ${pricing.name}`,
        description: description,
        pricing_type: 'fixed_price',
        local_price: {
          amount: amount.toString(),
          currency: 'USD'
        },
        metadata: {
          user_id: userId,
          tier: tier.toString(),
          subscription_type: subscriptionType,
          username: user.username
        },
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership/success`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership/cancel`
      };

      console.log('Creating Coinbase charge:', chargeData);

      const response = await this.axiosInstance.post('/charges', chargeData);
      
      if (response.data && response.data.data) {
        console.log('Coinbase charge created:', response.data.data.id);
        return response.data.data;
      } else {
        throw new Error('Failed to create Coinbase charge');
      }
    } catch (error) {
      console.error('Error creating Coinbase charge:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get charge details
   */
  async getCharge(chargeId) {
    try {
      const response = await this.axiosInstance.get(`/charges/${chargeId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting Coinbase charge:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(rawBody, signature) {
    try {
      const computedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody, 'utf8')
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying Coinbase webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle Coinbase webhook
   */
  async handleWebhook(event) {
    try {
      console.log('Coinbase webhook event:', event.type);
      
      switch (event.type) {
        case 'charge:confirmed':
          await this.handleChargeConfirmed(event.data);
          break;
        case 'charge:failed':
          await this.handleChargeFailed(event.data);
          break;
        case 'charge:delayed':
          await this.handleChargeDelayed(event.data);
          break;
        case 'charge:pending':
          await this.handleChargePending(event.data);
          break;
        case 'charge:resolved':
          await this.handleChargeResolved(event.data);
          break;
        default:
          console.log('Unhandled Coinbase webhook event:', event.type);
      }
    } catch (error) {
      console.error('Error handling Coinbase webhook:', error);
      throw error;
    }
  }

  /**
   * Handle charge confirmed (payment successful)
   */
  async handleChargeConfirmed(charge) {
    try {
      const metadata = charge.metadata;
      const userId = metadata.user_id;
      const tier = parseInt(metadata.tier);
      const subscriptionType = metadata.subscription_type;

      console.log(`Coinbase charge confirmed for user ${userId}, tier ${tier}`);

      let membership = await UserMembership.findOne({ user: userId });
      
      if (!membership) {
        membership = new UserMembership({
          user: userId,
          tier: 0,
          tierName: 'None',
          unlockedImages: [],
          subscriptionType: subscriptionType,
          subscriptionStatus: 'pending',
          betaAccess: true
        });
      }

      // Update membership
      const tierBenefits = UserMembership.getTierBenefits(tier);
      membership.tier = tier;
      membership.tierName = tierBenefits.name;
      membership.unlockedImages = tierBenefits.images;
      membership.paymentProvider = 'coinbase';
      membership.coinbaseChargeId = charge.id;
      membership.subscriptionType = subscriptionType;
      membership.subscriptionStatus = 'active';
      membership.lastPaymentDate = new Date();
      membership.isActive = true;

      // Set subscription dates
      if (subscriptionType === 'monthly') {
        membership.subscriptionStartDate = new Date();
        membership.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      } else {
        // One-time payment - set very far future date
        membership.subscriptionEndDate = new Date('2099-12-31');
      }

      // Add to payment history
      const totalAmount = charge.pricing.local.amount;
      membership.paymentHistory.push({
        date: new Date(),
        amount: parseFloat(totalAmount) * 100, // Convert to cents
        provider: 'coinbase',
        transactionId: charge.id,
        status: 'success',
        type: subscriptionType === 'one_time' ? 'one_time' : 'subscription'
      });

      await membership.save();
      console.log(`Coinbase payment processed successfully for user ${userId}`);
    } catch (error) {
      console.error('Error handling Coinbase charge confirmed:', error);
    }
  }

  /**
   * Handle charge failed
   */
  async handleChargeFailed(charge) {
    try {
      const metadata = charge.metadata;
      const userId = metadata.user_id;

      const membership = await UserMembership.findOne({ user: userId });
      if (membership && membership.coinbaseChargeId === charge.id) {
        membership.paymentHistory.push({
          date: new Date(),
          amount: parseFloat(charge.pricing.local.amount) * 100,
          provider: 'coinbase',
          transactionId: charge.id,
          status: 'failed',
          type: metadata.subscription_type === 'one_time' ? 'one_time' : 'subscription'
        });
        await membership.save();
        console.log(`Coinbase charge failed for user ${userId}`);
      }
    } catch (error) {
      console.error('Error handling Coinbase charge failed:', error);
    }
  }

  /**
   * Handle charge delayed (underpaid)
   */
  async handleChargeDelayed(charge) {
    try {
      const metadata = charge.metadata;
      const userId = metadata.user_id;

      console.log(`Coinbase charge delayed (underpaid) for user ${userId}`);
      // Could implement logic to request additional payment or partial refund
    } catch (error) {
      console.error('Error handling Coinbase charge delayed:', error);
    }
  }

  /**
   * Handle charge pending
   */
  async handleChargePending(charge) {
    try {
      const metadata = charge.metadata;
      const userId = metadata.user_id;

      const membership = await UserMembership.findOne({ user: userId });
      if (membership) {
        membership.paymentHistory.push({
          date: new Date(),
          amount: parseFloat(charge.pricing.local.amount) * 100,
          provider: 'coinbase',
          transactionId: charge.id,
          status: 'pending',
          type: metadata.subscription_type === 'one_time' ? 'one_time' : 'subscription'
        });
        await membership.save();
        console.log(`Coinbase charge pending for user ${userId}`);
      }
    } catch (error) {
      console.error('Error handling Coinbase charge pending:', error);
    }
  }

  /**
   * Handle charge resolved (overpaid, resolved with refund)
   */
  async handleChargeResolved(charge) {
    try {
      const metadata = charge.metadata;
      const userId = metadata.user_id;

      console.log(`Coinbase charge resolved (overpaid) for user ${userId}`);
      // Payment was successful but overpaid, handle similar to confirmed
      await this.handleChargeConfirmed(charge);
    } catch (error) {
      console.error('Error handling Coinbase charge resolved:', error);
    }
  }

  /**
   * Create recurring payment setup (for future subscription support)
   * Note: Coinbase Commerce doesn't natively support subscriptions,
   * but you could implement this by creating charges monthly
   */
  async setupRecurringPayment(userId, tier) {
    try {
      // For now, just create a one-time charge for the first month
      // In production, you'd need to implement a scheduler to create
      // new charges each month for crypto subscriptions
      
      const charge = await this.createCharge(userId, tier, 'monthly');
      
      // Store subscription info for future billing
      const membership = await UserMembership.findOne({ user: userId });
      if (membership) {
        membership.subscriptionType = 'monthly';
        membership.paymentProvider = 'coinbase';
        membership.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await membership.save();
      }
      
      return charge;
    } catch (error) {
      console.error('Error setting up Coinbase recurring payment:', error);
      throw error;
    }
  }

  /**
   * Process next billing cycle (to be called by scheduler)
   */
  async processNextBilling(membershipId) {
    try {
      const membership = await UserMembership.findById(membershipId);
      if (!membership || membership.subscriptionStatus !== 'active') {
        return;
      }

      if (membership.nextBillingDate <= new Date()) {
        const charge = await this.createCharge(
          membership.user, 
          membership.tier, 
          'monthly'
        );
        
        console.log(`Created next billing charge for user ${membership.user}: ${charge.id}`);
        return charge;
      }
    } catch (error) {
      console.error('Error processing Coinbase next billing:', error);
      throw error;
    }
  }
}

module.exports = new CoinbaseService(); 