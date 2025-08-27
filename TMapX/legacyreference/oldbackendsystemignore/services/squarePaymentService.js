const axios = require('axios');
const UserMembership = require('../models/UserMembership');
const User = require('../models/User');

class SquarePaymentService {
  constructor() {
    // Square sandbox credentials
    this.accessToken = process.env.SQUARE_ACCESS_TOKEN || 'EAAAl4WnJ0fNO-tP8vOxJzKhZrD1saLGCPeHHIi8bhxHOa4BjqM8rK3Xh1Zmz07E';
    this.applicationId = process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-9JEx9IQ7SzKcTwx3nZPEyA';
    this.environment = 'sandbox'; // or 'production'
    this.baseUrl = this.environment === 'sandbox' 
      ? 'https://connect.squareupsandbox.com/v2' 
      : 'https://connect.squareup.com/v2';
    
    // We'll get the location ID dynamically
    this.locationId = null;
  }

  /**
   * Get the first available location for this application
   */
  async getLocationId() {
    if (this.locationId) {
      return this.locationId;
    }

    try {
      console.log('🟦 Getting Square locations...');
      const response = await axios.get(`${this.baseUrl}/locations`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        }
      });

      if (response.data && response.data.locations && response.data.locations.length > 0) {
        this.locationId = response.data.locations[0].id;
        console.log('✅ Using location ID:', this.locationId);
        return this.locationId;
      } else {
        throw new Error('No locations found for this Square account');
      }
    } catch (error) {
      console.error('❌ Error getting Square locations:', error.response?.data || error.message);
      // Fallback to 'main' for sandbox
      this.locationId = 'main';
      console.log('🔄 Falling back to location ID: main');
      return this.locationId;
    }
  }

  /**
   * Get tier pricing and details - always in CAD for Square processing
   */
  getTierDetails() {
    const UserMembership = require('../models/UserMembership');
    
    // Always use CAD pricing for Square (our account currency)
    const tiers = {};
    for (let tier = 1; tier <= 4; tier++) {
      const tierBenefits = UserMembership.getTierBenefits(tier, 'CAD');
      tiers[tier] = {
        name: tierBenefits.name,
        price: tierBenefits.monthlyPrice * 100, // Convert to cents for Square
        images: tierBenefits.images,
        description: this.getTierDescription(tier),
        currency: 'CAD'
      };
    }
    
    return tiers;
  }
  
  getTierDescription(tier) {
    const descriptions = {
      1: 'Unlock the graceful Elf profile image',
      2: 'Unlock Elf and sturdy Dwarf profile images', 
      3: 'Unlock Elf, Dwarf, and mystical Mage profile images',
      4: 'Unlock all profile images including the legendary Dragon'
    };
    return descriptions[tier] || 'Premium membership tier';
  }

  /**
   * Create a Square order for membership purchase (always in CAD)
   */
  async createOrder(userId, tier, customAmountCAD = null, displayCurrency = 'CAD', displayAmount = null) {
    try {
      const cadTierDetails = this.getTierDetails()[tier];
      
      if (!cadTierDetails) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Use custom CAD amount (for prorated upgrades) or default tier price
      let orderAmountCents;
      let isUpgrade = false;
      
      if (customAmountCAD !== null) {
        // Custom amount is already in CAD, convert to cents
        orderAmountCents = Math.round(customAmountCAD * 100);
        isUpgrade = true;
      } else {
        // Regular purchase - use CAD pricing in cents
        orderAmountCents = cadTierDetails.price;
      }

      console.log(`💰 Creating Square order: tier=${tier}, displayCurrency=${displayCurrency}, orderAmountCents=${orderAmountCents} CAD, isUpgrade=${isUpgrade}`);

      // Calculate display amounts for user clarity
      const cadDisplayAmount = orderAmountCents / 100;
      const userDisplayAmount = displayAmount ? (displayAmount / 100) : cadDisplayAmount;

      console.log(`💰 Pricing transparency: User sees ${userDisplayAmount} ${displayCurrency}, Square charges C$${cadDisplayAmount} CAD`);

      // Get the location ID
      const locationId = await this.getLocationId();

      const orderRequest = {
        order: {
          location_id: locationId,
          line_items: [{
            name: `${cadTierDetails.name} Membership${isUpgrade ? ' (Upgrade)' : ''}`,
            quantity: '1',
            note: `Warcraft Arena ${cadTierDetails.name} membership for ${user.username}${isUpgrade ? ' - Prorated upgrade' : ''}`,
            base_price_money: {
              amount: orderAmountCents,
              currency: 'CAD' // Always CAD for Square
            },
            metadata: {
              tier: tier.toString(),
              userId: userId,
              images: JSON.stringify(cadTierDetails.images),
              displayCurrency: displayCurrency,
              displayAmount: userDisplayAmount.toString(),
              cadAmount: cadDisplayAmount.toString()
            }
          }],
          metadata: {
            userId: userId,
            tier: tier.toString(),
            membershipType: 'hero_membership',
            pricingTransparency: `User_${userDisplayAmount}_${displayCurrency}_Square_${cadDisplayAmount}_CAD`
          }
        },
        idempotency_key: `ord_${Date.now()}_${userId.slice(-8)}`
      };

      console.log('Creating Square order:', JSON.stringify(orderRequest, null, 2));

      const response = await axios.post(`${this.baseUrl}/orders`, orderRequest, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        }
      });
      
      if (response.data && response.data.order) {
        console.log('Square order created successfully:', response.data.order.id);
        return response.data.order;
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('❌ Error creating Square order:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // More specific error message
      let errorMessage = 'Failed to create Square order';
      if (error.response?.data?.errors?.length > 0) {
        errorMessage = error.response.data.errors.map(e => e.detail || e.message).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Process payment for membership
   */
  async processPayment(orderId, sourceId, verificationToken, userId, tier) {
    try {
      // First, retrieve the order to get the total amount
      const orderResponse = await axios.get(`${this.baseUrl}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        }
      });

      if (!orderResponse.data || !orderResponse.data.order) {
        throw new Error('Order not found');
      }

      const order = orderResponse.data.order;
      const totalMoney = order.total_money;

      // Get the location ID
      const locationId = await this.getLocationId();

      const paymentRequest = {
        source_id: sourceId,
        idempotency_key: `pay_${Date.now()}_${userId.slice(-8)}`, // Shortened to under 45 chars
        amount_money: totalMoney,
        order_id: orderId,
        autocomplete: true,
        location_id: locationId,
        note: `WA Hero Membership T${tier}`, // Shortened to under 45 chars
        buyer_email_address: await this.getUserEmail(userId)
      };

      // Add verification token if provided
      if (verificationToken) {
        paymentRequest.verification_token = verificationToken;
      }

      console.log('Processing Square payment:', JSON.stringify(paymentRequest, null, 2));

      const response = await axios.post(`${this.baseUrl}/payments`, paymentRequest, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        }
      });
      
      if (response.data && response.data.payment) {
        const payment = response.data.payment;
        console.log('Payment processed successfully:', payment.id);
        
        // NOTE: Don't update membership here - let the membership route handle it
        // This prevents race conditions with upgrade validations
        // await this.updateUserMembership(userId, tier, payment.id, orderId, totalMoney.amount);
        
        return payment;
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('❌ Error processing Square payment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      
      // More specific error message
      let errorMessage = 'Failed to process Square payment';
      if (error.response?.data?.errors?.length > 0) {
        errorMessage = error.response.data.errors.map(e => e.detail || e.message).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Update user membership after successful payment
   */
  async updateUserMembership(userId, tier, paymentId, orderId, amount) {
    try {
      const tierDetails = this.getTierDetails()[tier];
      
      let membership = await UserMembership.findOne({ user: userId });
      
      if (!membership) {
        membership = new UserMembership({
          user: userId,
          tier: 0,
          tierName: 'None',
          unlockedImages: [],
          betaAccess: true
        });
      }

      // Update membership details
      membership.tier = tier;
      membership.tierName = tierDetails.name;
      membership.unlockedImages = tierDetails.images;
      membership.paymentProvider = 'square'; // Required field
      membership.subscriptionType = 'one_time'; // This is a one-time purchase
      membership.squarePaymentId = paymentId;
      membership.squareOrderId = orderId;
      membership.amount = amount;
      membership.paymentStatus = 'completed';
      membership.purchaseDate = new Date();
      membership.isActive = true;

      await membership.save();
      
      console.log(`Updated membership for user ${userId} to tier ${tier}`);
      return membership;
    } catch (error) {
      console.error('Error updating user membership:', error);
      throw error;
    }
  }

  /**
   * Get user email for payment
   */
  async getUserEmail(userId) {
    try {
      const user = await User.findById(userId);
      return user?.email || `user${userId}@warcraftarena.com`;
    } catch (error) {
      console.warn('Could not get user email:', error);
      return `user${userId}@warcraftarena.com`;
    }
  }

  /**
   * Verify webhook signature (for production)
   */
  verifyWebhookSignature(signature, body, webhookSignatureKey) {
    // Implementation for webhook verification
    // This would be used in production to verify Square webhooks
    return true; // Simplified for now
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event) {
    try {
      console.log('Received Square webhook:', event.type);
      
      switch (event.type) {
        case 'payment.updated':
          await this.handlePaymentUpdated(event.data);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event.data);
          break;
        default:
          console.log('Unhandled webhook event type:', event.type);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handle payment updated webhook
   */
  async handlePaymentUpdated(paymentData) {
    try {
      const payment = paymentData.object.payment;
      const orderId = payment.orderId;
      
      // Find membership by Square order ID
      const membership = await UserMembership.findOne({ squareOrderId: orderId });
      if (membership) {
        membership.paymentStatus = payment.status === 'COMPLETED' ? 'completed' : 'pending';
        await membership.save();
        console.log(`Updated membership payment status for order ${orderId}`);
      }
    } catch (error) {
      console.error('Error handling payment updated webhook:', error);
    }
  }

  /**
   * Handle payment failed webhook
   */
  async handlePaymentFailed(paymentData) {
    try {
      const payment = paymentData.object.payment;
      const orderId = payment.orderId;
      
      // Find membership by Square order ID
      const membership = await UserMembership.findOne({ squareOrderId: orderId });
      if (membership) {
        membership.paymentStatus = 'failed';
        membership.isActive = false;
        await membership.save();
        console.log(`Marked membership as failed for order ${orderId}`);
      }
    } catch (error) {
      console.error('Error handling payment failed webhook:', error);
    }
  }
}

module.exports = new SquarePaymentService(); 