const paypal = require('@paypal/checkout-server-sdk');
const UserMembership = require('../models/UserMembership');
const User = require('../models/User');

class PayPalService {
  constructor() {
    // Check if PayPal credentials are configured
    this.isConfigured = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
    
    if (this.isConfigured) {
      // Use PayPal sandbox for development
      this.environment = new paypal.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      );
      this.client = new paypal.core.PayPalHttpClient(this.environment);
      console.log('✅ PayPal service configured with provided credentials');
    } else {
      console.warn('⚠️ PayPal credentials not configured - using development mode');
      this.environment = null;
      this.client = null;
    }
  }

  /**
   * Get tier pricing for PayPal
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
   * Create PayPal subscription plan
   */
  async createSubscriptionPlan(tier) {
    if (!this.isConfigured) {
      throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.');
    }

    try {
      const pricing = this.getTierPricing()[tier];
      if (!pricing) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      const request = new paypal.subscriptions.SubscriptionPlansCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        product_id: `warcraft-arena-tier-${tier}`,
        name: `${pricing.name} Monthly Subscription`,
        description: `Monthly subscription for Warcraft Arena ${pricing.name} membership`,
        status: 'ACTIVE',
        billing_cycles: [{
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // Infinite
          pricing_scheme: {
            fixed_price: {
              value: pricing.monthlyPrice.toString(),
              currency_code: 'USD'
            }
          }
        }],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: '0',
            currency_code: 'USD'
          },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3
        }
      });

      const response = await this.client.execute(request);
      console.log('PayPal subscription plan created:', response.result.id);
      return response.result;
    } catch (error) {
      console.error('Error creating PayPal subscription plan:', error);
      throw error;
    }
  }

  /**
   * Create PayPal subscription
   */
  async createSubscription(userId, tier, planId) {
    if (!this.isConfigured) {
      throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.');
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const request = new paypal.subscriptions.SubscriptionsCreateRequest();
      request.requestBody({
        plan_id: planId,
        start_time: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
        subscriber: {
          name: {
            given_name: user.username,
            surname: user.username
          },
          email_address: user.email || `${user.username}@warcraftarena.com`
        },
        application_context: {
          brand_name: 'Warcraft Arena',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership/success`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership/cancel`
        }
      });

      const response = await this.client.execute(request);
      console.log('PayPal subscription created:', response.result.id);
      return response.result;
    } catch (error) {
      console.error('Error creating PayPal subscription:', error);
      throw error;
    }
  }

  /**
   * Create one-time payment order
   */
  async createOneTimePayment(userId, tier) {
    try {
      const pricing = this.getTierPricing()[tier];
      if (!pricing) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: `tier_${tier}_${userId}`,
          description: `${pricing.name} Membership - One-time Purchase`,
          amount: {
            currency_code: 'USD',
            value: pricing.oneTimePrice.toString()
          },
          custom_id: `${userId}_${tier}_onetime`
        }],
        application_context: {
          brand_name: 'Warcraft Arena',
          locale: 'en-US',
          landing_page: 'BILLING',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership/success`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership/cancel`
        }
      });

      const response = await this.client.execute(request);
      console.log('PayPal one-time payment created:', response.result.id);
      return response.result;
    } catch (error) {
      console.error('Error creating PayPal one-time payment:', error);
      throw error;
    }
  }

  /**
   * Capture payment order
   */
  async capturePayment(orderId) {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});
      
      const response = await this.client.execute(request);
      console.log('PayPal payment captured:', response.result.id);
      return response.result;
    } catch (error) {
      console.error('Error capturing PayPal payment:', error);
      throw error;
    }
  }

  /**
   * Handle subscription webhook
   */
  async handleSubscriptionWebhook(event) {
    try {
      console.log('PayPal subscription webhook:', event.event_type);
      
      switch (event.event_type) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handleSubscriptionActivated(event.resource);
          break;
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handleSubscriptionCancelled(event.resource);
          break;
        case 'BILLING.SUBSCRIPTION.EXPIRED':
          await this.handleSubscriptionExpired(event.resource);
          break;
        case 'PAYMENT.SALE.COMPLETED':
          await this.handlePaymentCompleted(event.resource);
          break;
        default:
          console.log('Unhandled PayPal webhook event:', event.event_type);
      }
    } catch (error) {
      console.error('Error handling PayPal webhook:', error);
      throw error;
    }
  }

  /**
   * Handle subscription activated
   */
  async handleSubscriptionActivated(subscription) {
    try {
      const membership = await UserMembership.findOne({ 
        paypalSubscriptionId: subscription.id 
      });
      
      if (membership) {
        membership.subscriptionStatus = 'active';
        membership.subscriptionStartDate = new Date();
        membership.nextBillingDate = new Date(subscription.billing_info.next_billing_time);
        await membership.save();
        console.log(`PayPal subscription activated for user: ${membership.user}`);
      }
    } catch (error) {
      console.error('Error handling subscription activated:', error);
    }
  }

  /**
   * Handle subscription cancelled
   */
  async handleSubscriptionCancelled(subscription) {
    try {
      const membership = await UserMembership.findOne({ 
        paypalSubscriptionId: subscription.id 
      });
      
      if (membership) {
        await membership.cancelSubscription('PayPal subscription cancelled');
        console.log(`PayPal subscription cancelled for user: ${membership.user}`);
      }
    } catch (error) {
      console.error('Error handling subscription cancelled:', error);
    }
  }

  /**
   * Handle subscription expired
   */
  async handleSubscriptionExpired(subscription) {
    try {
      const membership = await UserMembership.findOne({ 
        paypalSubscriptionId: subscription.id 
      });
      
      if (membership) {
        membership.subscriptionStatus = 'expired';
        membership.isActive = false;
        await membership.save();
        console.log(`PayPal subscription expired for user: ${membership.user}`);
      }
    } catch (error) {
      console.error('Error handling subscription expired:', error);
    }
  }

  /**
   * Handle payment completed
   */
  async handlePaymentCompleted(payment) {
    try {
      // Handle both subscription and one-time payments
      const customId = payment.custom || payment.invoice_id;
      if (customId) {
        const [userId, tier, type] = customId.split('_');
        
        const membership = await UserMembership.findOne({ user: userId });
        if (membership) {
          membership.paymentHistory.push({
            date: new Date(),
            amount: parseFloat(payment.amount.total) * 100, // Convert to cents
            provider: 'paypal',
            transactionId: payment.id,
            status: 'success',
            type: type === 'onetime' ? 'one_time' : 'subscription'
          });
          
          membership.lastPaymentDate = new Date();
          await membership.save();
          console.log(`PayPal payment completed for user: ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error handling payment completed:', error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, reason = 'User requested cancellation') {
    try {
      const request = new paypal.subscriptions.SubscriptionsCancelRequest(subscriptionId);
      request.requestBody({
        reason: reason
      });
      
      const response = await this.client.execute(request);
      console.log('PayPal subscription cancelled:', subscriptionId);
      return response.result;
    } catch (error) {
      console.error('Error cancelling PayPal subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(subscriptionId) {
    try {
      const request = new paypal.subscriptions.SubscriptionsGetRequest(subscriptionId);
      const response = await this.client.execute(request);
      return response.result;
    } catch (error) {
      console.error('Error getting PayPal subscription details:', error);
      throw error;
    }
  }
}

module.exports = new PayPalService(); 