const UserMembership = require('../models/UserMembership');
const cron = require('node-cron');

class SubscriptionScheduler {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the subscription scheduler
   * Runs every hour to check for renewals and pending changes
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Subscription scheduler is already running');
      return;
    }

    console.log('🕐 Starting subscription scheduler...');
    this.isRunning = true;

    // Run every hour
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.processScheduledTasks();
    }, {
      scheduled: true
    });

    // Also run immediately on startup
    setTimeout(() => {
      this.processScheduledTasks();
    }, 5000); // 5 second delay to allow server to fully start

    console.log('✅ Subscription scheduler started');
  }

  /**
   * Stop the subscription scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🛑 Subscription scheduler stopped');
  }

  /**
   * Process all scheduled subscription tasks
   */
  async processScheduledTasks() {
    try {
      console.log('🔄 Processing scheduled subscription tasks...');
      
      const results = await Promise.all([
        this.processPendingChanges(),
        this.processSubscriptionRenewals(),
        this.cleanupExpiredSubscriptions()
      ]);

      const [pendingChanges, renewals, cleanups] = results;
      
      if (pendingChanges > 0 || renewals > 0 || cleanups > 0) {
        console.log(`✅ Processed: ${pendingChanges} pending changes, ${renewals} renewals, ${cleanups} cleanups`);
      }
    } catch (error) {
      console.error('❌ Error processing scheduled tasks:', error);
    }
  }

  /**
   * Process pending tier changes and cancellations
   */
  async processPendingChanges() {
    try {
      const now = new Date();
      
      // Find memberships with pending changes that should be processed
      const memberships = await UserMembership.find({
        'pendingTierChange.effectiveDate': { $lte: now },
        'pendingTierChange.newTier': { $exists: true }
      });

      let processedCount = 0;

      for (const membership of memberships) {
        try {
          const processed = await membership.processPendingChange();
          if (processed) {
            processedCount++;
            console.log(`🔄 Processed pending change for user ${membership.user}: ${membership.tier === 0 ? 'cancelled' : `downgraded to tier ${membership.tier}`}`);
          }
        } catch (error) {
          console.error(`❌ Error processing pending change for user ${membership.user}:`, error);
        }
      }

      return processedCount;
    } catch (error) {
      console.error('❌ Error processing pending changes:', error);
      return 0;
    }
  }

  /**
   * Process subscription renewals
   * Note: This flags subscriptions for renewal - actual payment processing
   * would be handled by payment provider webhooks or a separate billing service
   */
  async processSubscriptionRenewals() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // Find active subscriptions that need renewal within the next 24 hours
      const memberships = await UserMembership.find({
        subscriptionStatus: 'active',
        nextBillingDate: { $lte: tomorrow, $gte: now },
        tier: { $gt: 0 }
      });

      let renewalCount = 0;

      for (const membership of memberships) {
        try {
          // Flag for renewal (actual payment would be processed by payment provider)
          await membership.renewSubscription();
          renewalCount++;
          console.log(`🔄 Flagged renewal for user ${membership.user}, tier ${membership.tier}`);
          
          // In a real implementation, you would trigger payment processing here
          // For now, we'll assume payments succeed automatically
          await this.markRenewalSuccessful(membership);
        } catch (error) {
          console.error(`❌ Error processing renewal for user ${membership.user}:`, error);
        }
      }

      return renewalCount;
    } catch (error) {
      console.error('❌ Error processing renewals:', error);
      return 0;
    }
  }

  /**
   * Mark a renewal as successful (simulating successful payment)
   * In production, this would be called by payment webhooks
   */
  async markRenewalSuccessful(membership) {
    try {
      // Update the last payment history entry to success
      if (membership.paymentHistory.length > 0) {
        const lastPayment = membership.paymentHistory[membership.paymentHistory.length - 1];
        lastPayment.status = 'success';
        await membership.save();
      }
    } catch (error) {
      console.error('❌ Error marking renewal successful:', error);
    }
  }

  /**
   * Clean up expired subscriptions and handle failed payments
   */
  async cleanupExpiredSubscriptions() {
    try {
      const now = new Date();
      let cleanupCount = 0;

      // Find subscriptions that are expired but still marked as active
      const expiredMemberships = await UserMembership.find({
        subscriptionStatus: 'active',
        currentPeriodEnd: { $lt: now },
        tier: { $gt: 0 }
      });

      for (const membership of expiredMemberships) {
        try {
          // Check if there are any pending changes that should have been processed
          if (membership.pendingTierChange && membership.pendingTierChange.effectiveDate <= now) {
            await membership.processPendingChange();
          } else {
            // No pending change, so subscription has lapsed
            membership.subscriptionStatus = 'expired';
            membership.isActive = false;
            membership.tier = 0;
            membership.tierName = 'None';
            membership.unlockedImages = [];
            membership.subscriptionEndDate = now;

            await membership.save();
          }
          
          cleanupCount++;
          console.log(`🧹 Cleaned up expired subscription for user ${membership.user}`);
        } catch (error) {
          console.error(`❌ Error cleaning up subscription for user ${membership.user}:`, error);
        }
      }

      return cleanupCount;
    } catch (error) {
      console.error('❌ Error cleaning up expired subscriptions:', error);
      return 0;
    }
  }

  /**
   * Get subscription scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDate() : null
    };
  }

  /**
   * Manually trigger processing (for testing/admin use)
   */
  async manualProcess() {
    console.log('🔧 Manual subscription processing triggered');
    return await this.processScheduledTasks();
  }
}

// Create singleton instance
const subscriptionScheduler = new SubscriptionScheduler();

module.exports = subscriptionScheduler; 