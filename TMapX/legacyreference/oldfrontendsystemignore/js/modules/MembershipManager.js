/**
 * MembershipManager - Unified membership system handler
 * Handles both purchase flows (index.html) and management flows (townhall.html)
 * Manages subscriptions, avatar restrictions, and tier display across all pages
 */
class MembershipManager {
  constructor() {
    this.tiers = null;
    this.userMembership = null;
    this.isLoading = false;
    this.currentPage = this.detectCurrentPage();
    // Remove hardcoded tiers - will use API data
    this.membershipTiers = {};
  }

  /**
   * Detect which page we're on for context-aware functionality
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('townhall.html')) return 'profile';if (path.includes('hero.html')) return 'hero';if (path.includes('index.html') || path === '/' || path === '/views/') return 'index';return 'other';}

  /**
   * Initialize the membership system
   */
  async init() {
    console.log('🛡️ Initializing unified MembershipManager...', `Page: ${this.currentPage}`);
    
    if (this.isLoading) return;this.isLoading = true;

    try {
      // Load tiers and user membership status
      await Promise.all([
        this.loadTiers(),
        this.loadUserMembership()
      ]);

      // Set up event handlers
      this.setupEventHandlers();

      // Initialize based on current page context
      if (this.currentPage === 'hero') {
        this.renderMembershipTiers();
        this.renderCurrencySelector();

        // Backup call to ensure currency selector renders
        setTimeout(() => {
          this.renderCurrencySelector();
        }, 100);
      } else if (this.currentPage === 'index') {
        // Only render membership tiers on index page, no currency selector
        this.renderMembershipTiers();
      } else if (this.currentPage === 'profile') {
        this.updateHeroTierDisplay();
        this.setupAvatarRestrictions();
      }
      
      console.log('✅ Unified MembershipManager initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing MembershipManager:', error);
      this.showError('Failed to load membership information');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Set up event handlers for all pages
   */
  setupEventHandlers() {
    console.log('🎯 Setting up unified event handlers...');
    
    // Hero action button click (profile page)
    document.addEventListener('click', (e) => {
      if (e.target.closest('#hero-action-btn')) {
        console.log('🎯 Hero action button clicked!');
        e.preventDefault();
        this.handleHeroActionClick();
      }
    });
    
    console.log('✅ Event handlers setup complete');
  }

  /**
   * Handle hero action button clicks (profile page)
   */
  handleHeroActionClick() {
    console.log('🎯 Handling hero action click...');
    console.log('🔍 Current membership:', this.userMembership);
    
    if (this.userMembership?.isActive) {
      console.log('✅ User is active hero - showing manage membership modal');
      this.showManageMembershipModal();
    } else {
      console.log('❌ User is not active hero - redirecting to membership page');
      this.navigateToUpgrade();
    }
  }

  /**
   * Update the hero tier display section (profile page)
   */
  updateHeroTierDisplay() {
    const heroStatusCard = document.getElementById('hero-status-card');
    const heroTierName = document.getElementById('hero-tier-name');
    const heroTierDescription = document.getElementById('hero-tier-description');
    const heroTierLevel = document.getElementById('hero-tier-level');
    const heroActionBtn = document.getElementById('hero-action-btn');
    const heroActionText = document.getElementById('hero-action-text');
    const heroActionSubtitle = document.getElementById('hero-action-subtitle');
    const unlockedImagesGrid = document.getElementById('unlocked-images-grid');

    if (!heroStatusCard) {
      console.log('🚫 Hero tier elements not found on this page');
      return;}

    const membership = this.userMembership;

    if (membership && membership.isActive && membership.tier > 0) {
      // User is a hero
      const tierData = this.tiers?.[membership.tier];
      
      heroStatusCard.classList.remove('no-hero');
      heroTierName.textContent = membership.tierName || tierData?.name || `Hero Tier ${membership.tier}`;
      heroTierDescription.textContent = membership.tier === 4 
        ? 'You have unlocked all premium profile images!' 
        : `You have access to ${membership.unlockedImages?.length || 0} premium profile images`;
      heroTierLevel.textContent = membership.tier;

      // Update action button for existing heroes
      heroActionBtn.className = 'epic-btn hero-action-btn change-plan';
      heroActionBtn.innerHTML = '<i class="fas fa-cog"></i><span id="hero-action-text">Manage Membership</span>';
      heroActionSubtitle.textContent = membership.tier === 4 
        ? 'You have the highest tier! Click to manage your membership.'
        : 'Click to upgrade your tier or manage your membership.';

    } else {
      // User is not a hero
      heroStatusCard.classList.add('no-hero');
      heroTierName.textContent = 'Not a Hero';
      heroTierDescription.textContent = 'Become a hero to unlock exclusive profile images and support the arena!';
      heroTierLevel.textContent = '0';

      // Update action button for non-heroes
      heroActionBtn.className = 'epic-btn hero-action-btn';
      heroActionBtn.innerHTML = '<i class="fas fa-crown"></i><span id="hero-action-text">Be a Hero</span>';
      heroActionSubtitle.textContent = 'Unlock exclusive profile images and support the arena!';
    }

    // Update unlocked images display
    this.updateUnlockedImagesDisplay(unlockedImagesGrid, membership);
    
    // Update avatar lock overlays when membership changes
    this.updateAvatarLockOverlays();
  }

  /**
   * Update the unlocked images display (profile page)
   */
  updateUnlockedImagesDisplay(container, membership) {
    if (!container) return;const allImages = ['elf.png', 'dwarf.png', 'mage.png', 'dragon.png', 'paladin.png'];
    const unlockedImages = membership?.unlockedImages || [];

    container.innerHTML = '';

    allImages.forEach((imageName) => {
      const isUnlocked = unlockedImages.includes(imageName);
      const imageItem = document.createElement('div');
      imageItem.className = `unlocked-image-item ${isUnlocked ? '' : 'locked'}`;
      
      const imagePath = `/assets/img/profiles/${imageName}`;
      const displayName = imageName.replace('.png', '').charAt(0).toUpperCase() + imageName.replace('.png', '').slice(1);
      
      imageItem.innerHTML = `
        <img src="${imagePath}" alt="${displayName}" class="unlocked-image">
        <span class="unlocked-image-name">${displayName}</span>
        ${isUnlocked ? 
          '<i class="fas fa-check-circle unlocked-icon"></i>' : 
          '<i class="fas fa-lock locked-icon"></i>'
        }
      `;
      
      // Add click handler to navigate to become a hero section
      imageItem.style.cursor = 'pointer';
      imageItem.addEventListener('click', () => {
        if (this.currentPage === 'profile') {
          // Navigate to index page and scroll to membership section
          window.location.href = '/views/index.html#membership-container';
        } else {
          // Already on index page, just scroll
          const membershipContainer = document.getElementById('membership-container');
          if (membershipContainer) {
            membershipContainer.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
      
      container.appendChild(imageItem);
    });
  }

  /**
   * Set up avatar restrictions (profile page)
   */
  setupAvatarRestrictions() {
    console.log('🔒 Setting up avatar restrictions...');
    
    // Update avatar lock overlays based on membership
    this.updateAvatarLockOverlays();
    
    // Add click handlers to restricted avatar options (use capture phase to run first)
    document.addEventListener('click', (e) => {
      const avatarOption = e.target.closest('.avatar-option[data-tier]');
      if (avatarOption) {
        const requiredTier = parseInt(avatarOption.dataset.tier);
        const imageName = avatarOption.dataset.image;
        
        if (!this.isImageUnlocked(imageName)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.showUpgradePrompt(requiredTier, imageName);
          return false;}
      }
    }, true); // Use capture phase to run before other handlers
  }

  /**
   * Update avatar lock overlays based on user's membership status
   */
  updateAvatarLockOverlays() {
    console.log('🔒 Updating avatar lock overlays...');
    
    const avatarOptions = document.querySelectorAll('.avatar-option[data-tier]');
    
    avatarOptions.forEach(option => {
      const requiredTier = parseInt(option.dataset.tier);
      const imageName = option.dataset.image;
      const lockOverlay = option.querySelector('.avatar-lock-overlay');
      
      if (lockOverlay) {
        const isUnlocked = this.isImageUnlocked(imageName);
        
        if (isUnlocked) {
          // Image is unlocked
          option.classList.remove('locked');
          lockOverlay.style.display = 'none';
          console.log(`✅ ${imageName} is unlocked`);
        } else {
          // Image is locked
          option.classList.add('locked');
          lockOverlay.style.display = 'flex';
          console.log(`🔒 ${imageName} is locked (requires tier ${requiredTier})`);
        }
      }
    });
  }

  /**
   * Check if a specific image is unlocked
   */
  isImageUnlocked(imageName) {
    const unlockedImages = this.userMembership?.unlockedImages || [];
    const isUnlocked = unlockedImages.includes(imageName);
    console.log(`🔍 Checking ${imageName}: unlocked=${isUnlocked}, userMembership:`, this.userMembership);
    return isUnlocked;}

  /**
   * Show upgrade prompt for locked images
   */
  showUpgradePrompt(requiredTier, imageName = null) {
    const tierNames = {
      1: 'Forest Guardian',
      2: 'Mountain Warrior', 
      3: 'Arcane Master',
      4: 'Dragon Lord',
      5: 'Holy Paladin'
    };

    // Get the avatar image path
    const avatarPath = imageName ? `/assets/img/profiles/${imageName}` : '/assets/img/ranks/emblem.png';
    const avatarName = imageName ? imageName.replace('.png', '').charAt(0).toUpperCase() + imageName.replace('.png', '').slice(1) : 'Premium Avatar';

    const modal = document.createElement('div');
    modal.className = 'upgrade-prompt-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(3px);
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid rgba(255, 215, 0, 0.3);
        border-radius: 15px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      ">
        <div style="margin-bottom: 1.5rem;">
          <img src="${avatarPath}" alt="${avatarName}" style="
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 3px solid #ffd700;
            margin-bottom: 1rem;
            object-fit: cover;
          " onerror="this.src='/assets/img/ranks/emblem.png'">
          <h3 style="color: #ffd700; margin-bottom: 1rem;">${avatarName} - Premium Content</h3>
        </div>
        <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 1.5rem;">
          ${requiredTier === 5 ? 
            'This avatar requires <strong>any one-time donation</strong> to unlock!' : 
            `This avatar requires <strong>${tierNames[requiredTier]}</strong> (Tier ${requiredTier}) or higher.`
          }
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button onclick="this.closest('.upgrade-prompt-modal').remove()" style="
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 0.75rem 1.5rem;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
          " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
            Cancel
          </button>
          <button onclick="${requiredTier === 5 ? 'window.membershipManager.showDonationModal()' : 'window.membershipManager.navigateToUpgrade()'}" style="
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #1a1a1a;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(255, 215, 0, 0.4)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
            ${requiredTier === 5 ? 'Make Donation' : 'Be a Hero'}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Navigate to upgrade options
   */
  navigateToUpgrade() {
    // Navigate to the "Be a Hero" page
    window.location.href = '/views/hero.html';
  }

  /**
   * Show donation modal for Paladin tier
   */
  showDonationModal() {
    console.log('💖 Showing donation modal for Paladin tier...');
    
    const modal = document.createElement('div');
    modal.className = 'donation-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid rgba(255, 215, 0, 0.3);
        border-radius: 20px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        text-align: center;
        position: relative;
      ">
        <button onclick="this.closest('.donation-modal').remove()" style="
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.5rem;
          cursor: pointer;
          transition: color 0.3s;
        " onmouseover="this.style.color='#ffd700'" onmouseout="this.style.color='rgba(255, 255, 255, 0.7)'">
          <i class="fas fa-times"></i>
        </button>

        <div style="margin-bottom: 1.5rem;">
          <img src="/assets/img/profiles/paladin.png" alt="Paladin" style="
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 3px solid #ffd700;
            margin-bottom: 1rem;
          ">
          <h3 style="color: #ffd700; font-family: 'Cinzel', serif; margin: 0 0 0.5rem 0; font-size: 1.8rem;">
            🛡️ Unlock Holy Paladin
          </h3>
          <p style="color: rgba(255, 255, 255, 0.8); margin: 0; line-height: 1.6;">
            Support the realm with any donation amount and unlock the righteous Paladin avatar!
          </p>
        </div>

        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap;">
          <a href="https://www.paypal.com/paypalme/wolfandman" target="_blank" style="
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 1.5rem;
            background: linear-gradient(45deg, #0070ba, #003087);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s;
            border: 2px solid transparent;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0, 112, 186, 0.4)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
            <i class="fab fa-paypal" style="font-size: 1.2rem;"></i>
            <span>PayPal Donation</span>
          </a>
          
          <a href="https://commerce.coinbase.com/checkout/fce0e325-d5b9-4b8c-a270-5508bdde7eeb" target="_blank" style="
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 1.5rem;
            background: linear-gradient(45deg, #1652f0, #0052ff);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s;
            border: 2px solid transparent;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(22, 82, 240, 0.4)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
            <i class="fab fa-bitcoin" style="font-size: 1.2rem;"></i>
            <span>Crypto Donation</span>
          </a>
        </div>

        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 215, 0, 0.2);">
          <button onclick="window.membershipManager.checkDonationPaladin()" style="
            background: linear-gradient(45deg, #28a745, #20c997);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin: 0 auto 1rem auto;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(40, 167, 69, 0.4)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
            <i class="fas fa-check-circle"></i>
            <span>I've Made a Donation - Check Now!</span>
          </button>
          <p style="color: rgba(255, 255, 255, 0.6); margin: 0; font-size: 0.9rem;">
            <i class="fas fa-info-circle"></i> 
            Click the button above after making your donation to automatically unlock your Paladin avatar!
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Check if user has made donations and unlock Paladin tier
   */
  async checkDonationPaladin() {
    console.log('🛡️ Checking donations for Paladin unlock...');
    
    try {
      const response = await fetch('/api/membership/check-donation-paladin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('🛡️ Donation check response:', data);

      if (data.success) {
        if (data.paladinUnlocked) {
          // Successfully unlocked Paladin
          this.showToast(`🛡️ Congratulations! Paladin avatar unlocked! Thank you for your ${data.donationCount} donation(s)!`, 'success');
          
          // Close the donation modal
          const modal = document.querySelector('.donation-modal');
          if (modal) modal.remove();

          // Refresh membership status to update UI
          await this.refreshMembershipStatus();
          
          // Re-render membership tiers to show updated status
          if (this.currentPage === 'index') {
            this.renderMembershipTiers();
          } else if (this.currentPage === 'profile') {
            this.updateHeroTierDisplay();
            this.updateAvatarLockOverlays();
          }
        } else if (data.alreadyUnlocked) {
          this.showToast('🛡️ You already have the Paladin avatar unlocked!', 'info');
        }
      } else {
        if (data.donationCount === 0) {
          this.showToast('💰 No donations found. Please make a donation first using the links above!', 'warning');
        } else {
          this.showToast(`❌ Failed to unlock Paladin: ${data.message}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error checking donation paladin unlock:', error);
      this.showToast('❌ Failed to check donation status. Please try again.', 'error');
    }
  }

  /**
   * Show membership management modal for existing heroes
   */
  showManageMembershipModal() {
    console.log('🎯 Showing manage membership modal...');
    try {
      const membership = this.userMembership;
      if (!membership) {
        console.error('❌ No membership data available');
        return;}
      
      console.log('🔍 Membership data:', membership);
      const currentTier = membership.tier;
      const canUpgrade = currentTier < 4;
      console.log('📊 Current tier:', currentTier, 'Can upgrade:', canUpgrade);

    const modal = document.createElement('div');
    modal.className = 'modal membership-modal show active';
    modal.id = 'membership-management-modal';
    modal.setAttribute('data-visible', 'true');
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      backdrop-filter: blur(3px) !important;
      visibility: visible !important;
      opacity: 1 !important;
      overflow: auto !important;
    `;
    
    modal.innerHTML = `
      <div class="modal-content" style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid rgba(255, 215, 0, 0.3);
        border-radius: 20px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        position: relative;
      ">
        <div class="modal-header" style="
          padding: 2rem;
          border-bottom: 1px solid rgba(255, 215, 0, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2 style="
            margin: 0;
            color: #ffd700;
            font-family: 'Cinzel', serif;
            font-size: 1.8rem;
          ">
            <i class="fas fa-cog"></i> Manage ${membership.tierName}
          </h2>
          <span class="close" style="
            color: rgba(255, 255, 255, 0.7);
            font-size: 2rem;
            cursor: pointer;
            line-height: 1;
            font-weight: bold;
          ">&times;</span>
        </div>
        <div class="modal-body" style="padding: 2rem;">
          <div style="background: rgba(40, 167, 69, 0.1); border: 1px solid rgba(40, 167, 69, 0.3); border-radius: 15px; padding: 1.5rem; margin-bottom: 2rem; text-align: center;">
            <h3 style="color: #28a745; margin: 0 0 1rem 0; font-size: 1.3rem;">
              <i class="fas fa-crown"></i> Current: ${membership.tierName}
            </h3>
            <p style="margin: 0; color: rgba(255, 255, 255, 0.8);">
              You have ${membership.unlockedImages?.length || 0} unlocked profile images
            </p>
          </div>
          
          ${canUpgrade ? `
            <div style="margin-bottom: 2rem;">
              <h4 style="color: #ffd700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-arrow-up"></i> Upgrade Your Tier
              </h4>
              <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 1rem;">
                Unlock more premium profile images by upgrading to a higher tier.
              </p>
                             <button class="upgrade-button" style="
                 background: linear-gradient(45deg, #ffd700, #ffed4e);
                color: #000;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
              ">
                <i class="fas fa-crown"></i>
                View Upgrade Options
              </button>
            </div>
          ` : `
            <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 15px; padding: 1.5rem; margin-bottom: 2rem; text-align: center;">
              <h4 style="color: #ffd700; margin: 0 0 0.5rem 0;">
                <i class="fas fa-dragon"></i> Dragon Lord - Maximum Tier!
              </h4>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.8);">
                You have unlocked all available premium content. Thank you for your support!
              </p>
            </div>
            
            <div style="margin-bottom: 2rem;">
              <h4 style="color: #17a2b8; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-cog"></i> Subscription Management
              </h4>
              <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 1rem;">
                Your monthly Dragon Lord subscription ($54 CAD/month) gives you access to all premium profile images.
              </p>
                             <button class="manage-payment-button" style="
                 background: rgba(23, 162, 184, 0.2);
                border: 1px solid rgba(23, 162, 184, 0.5);
                color: #17a2b8;
                padding: 0.75rem 1.5rem;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
              ">
                <i class="fas fa-credit-card"></i>
                Manage Payment & Upgrades
              </button>
            </div>
          `}
          
          <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 2rem; text-align: center;">
            <h4 style="color: #dc3545; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <i class="fas fa-times-circle"></i> Cancel Membership
            </h4>
            <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 1.5rem; font-size: 0.9rem;">
              Canceling will stop your monthly subscription. You will retain access to premium images until the end of your current billing period.
            </p>
                           <button class="cancel-membership-button" style="
              background: rgba(220, 53, 69, 0.2);
              border: 1px solid rgba(220, 53, 69, 0.5);
              color: #dc3545;
              padding: 0.75rem 2rem;
              border-radius: 25px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 0.5rem;
              margin: 0 auto;
            ">
              <i class="fas fa-times-circle"></i>
              Cancel Monthly Subscription
            </button>
          </div>
        </div>
      </div>
    `;

    console.log('✅ Modal HTML created, appending to body...');
    
    // Add modal-open class to body to prevent scroll
    document.body.classList.add('modal-open');
    
    document.body.appendChild(modal);
    console.log('✅ Modal appended to DOM successfully');
    
    // Debug: Check if modal is actually in DOM and visible
    const modalInDom = document.querySelector('.modal');
    console.log('🔍 Modal element in DOM:', modalInDom ? 'YES' : 'NO');
    if (modalInDom) {
      console.log('🔍 Modal computed styles:', {
        display: window.getComputedStyle(modalInDom).display,
        visibility: window.getComputedStyle(modalInDom).visibility,
        opacity: window.getComputedStyle(modalInDom).opacity,
        zIndex: window.getComputedStyle(modalInDom).zIndex,
        position: window.getComputedStyle(modalInDom).position
      });
      console.log('🔍 Modal getBoundingClientRect:', modalInDom.getBoundingClientRect());
    }

    // Setup button event listeners
    const upgradeButton = modal.querySelector('.upgrade-button');
    if (upgradeButton) {
      upgradeButton.addEventListener('click', () => {
        this.navigateToUpgrade();
        document.body.classList.remove('modal-open');
        modal.remove();
      });
    }
    
    const managePaymentButton = modal.querySelector('.manage-payment-button');
    if (managePaymentButton) {
      managePaymentButton.addEventListener('click', () => {
        this.navigateToUpgrade();
        document.body.classList.remove('modal-open');
        modal.remove();
      });
    }
    
    const cancelButton = modal.querySelector('.cancel-membership-button');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.cancelMembership(cancelButton);
      });
    }

    // Force modal visibility with timeout to override any conflicting styles
    setTimeout(() => {
      if (modal && modal.parentNode) {
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '999999';
        console.log('🔧 Force-applied modal visibility styles');
      }
    }, 100);

    // Close modal when clicking X or outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('close')) {
        document.body.classList.remove('modal-open');
        modal.remove();
      }
    });
    
    console.log('✅ Manage membership modal displayed successfully');
    } catch (error) {
      console.error('❌ Error creating manage membership modal:', error);
      this.showError('Failed to open membership management. Please refresh and try again.');
    }
  }

  /**
   * Cancel membership with confirmation
   */
  async cancelMembership(buttonElement) {
    const confirmed = confirm(
      `Are you sure you want to cancel your ${this.userMembership.tierName} subscription?\n\n` +
      'You will lose access to premium profile images at the end of your current billing period.\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) {
      return;}

    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Canceling...';
    buttonElement.disabled = true;

    try {
      const response = await fetch('/api/membership/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          reason: 'User requested cancellation from profile page'
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccessMessage('Membership canceled successfully. You will retain access until the end of your billing period.');
        
        // Close modal and refresh membership status
        document.body.classList.remove('modal-open');
        buttonElement.closest('.modal').remove();
        await this.refreshMembershipStatus();
      } else {
        throw new Error(data.message || 'Failed to cancel membership');
      }
    } catch (error) {
      console.error('Error canceling membership:', error);
      this.showErrorMessage(error.message || 'Failed to cancel membership');
      
      // Restore button
      buttonElement.innerHTML = originalText;
      buttonElement.disabled = false;
    }
  }

  /**
   * Refresh membership status
   */
  async refreshMembershipStatus() {
    try {
      await this.loadUserMembership();
      
      if (this.currentPage === 'index') {
        this.renderMembershipTiers();
      } else if (this.currentPage === 'profile') {
        this.updateHeroTierDisplay();
      }
    } catch (error) {
      console.error('Error refreshing membership status:', error);
    }
  }

  /**
   * Load available membership tiers
   */
  async loadTiers() {
    try {
      // Get browser's language with Canadian fallback
      const userLanguage = navigator.language || navigator.userLanguage || 'en-CA';
      const acceptLanguage = `${userLanguage},en;q=0.9`;
      
      // Check for currency preference in URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const urlCurrency = urlParams.get('currency');
      const storedCurrency = localStorage.getItem('preferred_currency');
      
      const headers = {
        'Accept-Language': acceptLanguage
      };
      
      // Add currency preference if available
      if (urlCurrency) {
        headers['X-Preferred-Currency'] = urlCurrency;
      } else if (storedCurrency) {
        headers['X-Preferred-Currency'] = storedCurrency;
      }
      
      console.log(`🚀 UPDATED MembershipManager v20241221-3 - Loading tiers with locale: ${acceptLanguage}`);
      console.log(`🔍 Browser language detected: ${userLanguage}`);
      console.log(`💰 Currency preference: ${urlCurrency || storedCurrency || 'auto-detect'}`);
      
      const response = await fetch('/api/membership/tiers', {
        credentials: 'include',
        headers: headers
      });
      const data = await response.json();
      
      if (data.success) {
        this.tiers = data.tiers;
        this.tierData = {
          currency: data.currency,
          currencySymbol: data.currencySymbol,
          environment: data.environment
        };
        console.log('📋 UPDATED - Loaded membership tiers:', this.tiers);
        console.log('🌍 UPDATED - Currency info:', this.tierData);
        console.log('💰 UPDATED - Sample tier 1 price:', data.tiers['1']?.providers?.square?.price);
        
        // Render currency selector only on hero page
        if (this.currentPage === 'hero') {
          this.renderCurrencySelector();
        }
      } else {
        throw new Error(data.message || 'Failed to load tiers');
      }
    } catch (error) {
      console.error('Error loading membership tiers:', error);
      throw error;
    }
  }

  /**
   * Render currency selector (positioned next to "Become a Hero" heading)
   */
  renderCurrencySelector() {
    console.log('🔍 Attempting to render currency selector...');

    // Find the "Become a Hero" section heading - try multiple selectors
    let heroSection = document.querySelector('h1.page-title');

    // If no page-title found, try finding by text content including emoji
    if (!heroSection || !heroSection.textContent.includes('Become a Hero')) {
      const allHeaders = document.querySelectorAll('h1, h2, h3');
      heroSection = Array.from(allHeaders).find(h => h.textContent.includes('Become a Hero'));
    }

    // If still not found, try looking for the page-header container
    if (!heroSection) {
      const pageHeader = document.querySelector('.page-header');
      if (pageHeader) {
        heroSection = pageHeader.querySelector('h1, h2, h3');
      }
    }

    if (!heroSection) {
      console.warn('❌ Could not find "Become a Hero" heading for currency selector');
      return;}

    console.log('✅ Found hero section:', heroSection.textContent);

    // Check if selector already exists and remove it
    const existingSelector = document.querySelector('.currency-selector');
    if (existingSelector) {
      console.log('🧹 Removing existing currency selector');
      existingSelector.remove();
    }

    // Create compact currency selector
    const selector = document.createElement('div');
    selector.className = 'currency-selector';
    selector.style.cssText = `
      display: inline-flex;
      align-items: center;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      margin: 0;
      position: relative;
      z-index: 9999;
      font-size: 0.85rem;
      backdrop-filter: blur(5px);
      min-width: 120px;
      flex-shrink: 0;
    `;

    const supportedCurrencies = [
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
      { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
      { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
      { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' }
    ];

    const currentCurrency = this.tierData?.currency || 'CAD';
    const currentCurrencyData = supportedCurrencies.find(c => c.code === currentCurrency);

    selector.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: #ffd700;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">
        <span>${currentCurrencyData?.flag || '🌍'}</span>
        <span>${currentCurrency}</span>
        <i class="fas fa-chevron-down" style="font-size: 0.7rem;"></i>
      </div>
      <div style="display: none; position: absolute; top: 100%; right: 0; background: rgba(0, 0, 0, 0.95); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; min-width: 200px; margin-top: 0.5rem; z-index: 10000;">
        ${supportedCurrencies.map(currency => `
          <div onclick="window.membershipManager.changeCurrency('${currency.code}')" style="
            padding: 0.75rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: ${currency.code === currentCurrency ? '#ffd700' : 'rgba(255, 255, 255, 0.8)'};
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 0.9rem;
          " onmouseover="this.style.background='rgba(255, 215, 0, 0.1)'" onmouseout="this.style.background='transparent'">
            <span>${currency.flag}</span>
            <span style="font-weight: ${currency.code === currentCurrency ? 'bold' : 'normal'}">${currency.code}</span>
            <span style="color: rgba(255, 255, 255, 0.6); font-size: 0.8rem;">${currency.name}</span>
            ${currency.code === currentCurrency ? '<i class="fas fa-check" style="margin-left: auto; color: #ffd700;"></i>' : ''}
          </div>
        `).join('')}
        <div style="padding: 0.5rem 1rem; border-top: 1px solid rgba(255, 215, 0, 0.2); font-size: 0.8rem; color: rgba(255, 255, 255, 0.6);">
          <i class="fas fa-info-circle"></i> Prices shown in your preferred currency
        </div>
      </div>
    `;

    // Find the membership tiers container to place the selector right above the cards
    let membershipTiers = document.querySelector('#membership-tiers');
    if (!membershipTiers) {
      membershipTiers = document.querySelector('.membership-tiers');
    }

    if (!membershipTiers) {
      console.warn('❌ Could not find membership tiers container for currency selector');
      return;}

    // Create a compact wrapper for subtitle and currency selector
    const headerExtension = document.createElement('div');
    headerExtension.className = 'hero-header-extension';
    headerExtension.style.cssText = `
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin: 0 0 1rem 0;
      padding: 0.75rem 1rem;
      background: rgba(15, 23, 42, 0.3);
      border: 1px solid rgba(255, 215, 0, 0.2);
      border-radius: 6px;
      backdrop-filter: blur(5px);
      width: 100%;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    `;

    // Create compact subtitle element
    const subtitle = document.createElement('div');
    subtitle.className = 'hero-subtitle';
    subtitle.style.cssText = `
      font-size: 0.9rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
      text-align: center;
      line-height: 1.3;
      margin: 0;
      white-space: nowrap;
      flex-shrink: 0;
    `;
    subtitle.textContent = 'Support the community and unlock exclusive features';

    // Create currency selector wrapper
    const selectorWrapper = document.createElement('div');
    selectorWrapper.className = 'currency-selector-wrapper';
    selectorWrapper.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    selectorWrapper.appendChild(selector);

    // Add both to the header extension
    headerExtension.appendChild(subtitle);
    headerExtension.appendChild(selectorWrapper);

    // Remove any existing header extensions to prevent duplicates
    const existingExtensions = document.querySelectorAll('.hero-header-extension');
    existingExtensions.forEach(ext => ext.remove());

    // Insert right before the membership tiers within the same container
    console.log('✅ Adding currency selector directly above membership tier cards');
    membershipTiers.parentElement.insertBefore(headerExtension, membershipTiers);
    console.log('💰 Currency selector positioned directly above membership tier cards');

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!selector.contains(e.target)) {
        const dropdown = selector.querySelector('div[style*="position: absolute"]');
        if (dropdown) dropdown.style.display = 'none';
      }
    });
  }

  /**
   * Change currency (like Amazon's currency selector)
   */
  async changeCurrency(newCurrency) {
    try {
      console.log(`💰 User selected currency: ${newCurrency}`);
      
      // Store preference in localStorage
      localStorage.setItem('preferred_currency', newCurrency);
      
      // Update URL parameter
      const url = new URL(window.location);
      url.searchParams.set('currency', newCurrency);
      window.history.replaceState({}, '', url);
      
      // Show loading state
      this.showToast(`Switching to ${newCurrency}...`, 'info');
      
      // Reload pricing data
      await this.loadTiers();
      
      // Re-render tiers with new pricing
      this.renderMembershipTiers();
      
      // Show success message
      const currencyNames = {
        'CAD': 'Canadian Dollars',
        'USD': 'US Dollars', 
        'EUR': 'Euros',
        'GBP': 'British Pounds',
        'JPY': 'Japanese Yen'
      };
      
      this.showToast(`✅ Prices updated to ${currencyNames[newCurrency]}`, 'success');
      
    } catch (error) {
      console.error('Error changing currency:', error);
      this.showToast('Failed to update currency. Please try again.', 'error');
    }
  }

  /**
   * Load user's current membership status
   */
  async loadUserMembership() {
    try {
      // Check if user is logged in
      const userInfo = await this.getCurrentUser();
      if (!userInfo.isAuthenticated) {
        console.log('👤 User not authenticated, showing guest view');
        return;}

      console.log('🔄 Loading membership data from API...');
      const response = await fetch('/api/membership/status', {
        credentials: 'include'
      });
      const data = await response.json();
      
      console.log('📦 Membership API response:', data);
      
      if (data.success) {
        this.userMembership = data.membership;
        console.log('👑 User membership status loaded successfully:', this.userMembership);
        
      } else {
        console.warn('Failed to load user membership:', data.message);
        this.userMembership = null;
      }
    } catch (error) {
      console.error('Error loading user membership:', error);
      this.userMembership = null;
      // Don't throw - this is optional for guest users
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    try {
      const response = await fetch('/api/me', {
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // User is not authenticated
        return { isAuthenticated: false };}
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return { ...data, isAuthenticated: true };} catch (error) {
      console.log('User authentication check failed:', error.message);
      return { isAuthenticated: false };}
  }

  /**
   * Render membership tiers
   */
  renderMembershipTiers() {
    const container = document.getElementById('membership-tiers');
    if (!container || !this.tiers) {
      console.warn('Cannot render tiers - missing container or tiers data');
      return;}

    console.log('🎨 Rendering membership tiers with user data:', this.userMembership);

    const tiersHtml = Object.entries(this.tiers).map(([tierNum, tier]) => {
      const currentUserTier = this.userMembership?.isActive ? this.userMembership.tier : 0;
      const tierNumber = parseInt(tierNum);
      const isCurrentTier = this.userMembership?.isActive && currentUserTier === tierNumber;
      const isLowerTier = this.userMembership?.isActive && currentUserTier > tierNumber;
      const isFeatured = tierNum == '3'; // Arcane Master is featured
      
      console.log(`🔍 Tier ${tierNum} check:`, {
        tierNumber,
        currentUserTier,
        isCurrentTier,
        isLowerTier,
        userIsActive: this.userMembership?.isActive
      });
      
      let buttonText, buttonClass, buttonDisabled, buttonAction;
      
      if (isCurrentTier) {
        buttonText = `<i class="fas fa-check-circle"></i> Current Tier`;
        buttonClass = 'tier-btn current';
        buttonDisabled = 'disabled';
        buttonAction = '';
      } else if (isLowerTier) {
        buttonText = `<i class="fas fa-check"></i> Unlocked`;
        buttonClass = 'tier-btn unlocked';
        buttonDisabled = 'disabled';
        buttonAction = '';
      } else if (tierNumber === 5) {
        // Special case for Paladin tier - one-time donation
        buttonText = `<i class="fas fa-heart"></i> Unlock with Any Donation`;
        buttonClass = 'tier-btn donation';
        buttonDisabled = '';
        buttonAction = `onclick="window.membershipManager.showDonationModal()"`;
      } else {
        // Check if this is an upgrade (user has active membership with lower tier)
        const isUpgrade = this.userMembership?.isActive && currentUserTier > 0 && currentUserTier < tierNumber;

        if (isUpgrade) {
          // Show upgrade pricing - calculate difference
          const currentTierData = this.tiers[currentUserTier];
          const priceDifference = tier.providers.square.price - currentTierData.providers.square.price;
          const currencySymbol = this.tierData?.currencySymbol || 'C$';
          const currency = this.tierData?.currency || 'CAD';
          buttonText = `<i class="fas fa-arrow-up"></i> Upgrade for ~${currencySymbol}${priceDifference.toFixed(2)} ${currency}`;
          buttonClass = 'tier-btn upgrade';
        } else {
          // Show full price for new subscriptions
          const currencySymbol = this.tierData?.currencySymbol || 'C$';
          const currency = this.tierData?.currency || 'CAD';
          buttonText = `<i class="fas fa-credit-card"></i> ${currencySymbol}${tier.providers.square.price} ${currency}/month`;
          buttonClass = 'tier-btn monthly';
        }

        buttonDisabled = '';
        buttonAction = `onclick="window.membershipManager.subscribeTier(${tierNum}, 'square', 'monthly', this)"`;
      }
      
      return `
        <div class="membership-tier ${isFeatured ? 'featured' : ''} ${isCurrentTier ? 'current-tier' : ''} ${isLowerTier ? 'unlocked-tier' : ''}">
          ${isCurrentTier ? '<div class="current-tier-badge">Current Tier</div>' : ''}
          ${isLowerTier ? '<div class="unlocked-tier-badge">Unlocked</div>' : ''}
          
          <div class="tier-name">${tier.name}</div>
          
          <div class="tier-price">
            ${tierNumber === 5 ? 
              '<span style="color: #ffd700;font-size: 1.5rem;">One-time donation</span>' : 
              `<span class="currency">${this.tierData?.currencySymbol || 'C$'}</span>${tier.providers.square.price}<span style="font-size: 1rem; color: rgba(255,255,255,0.7);">/${this.tierData?.currency || 'CAD'} monthly</span>`
            }
          </div>
          
          <div class="tier-description">
            ${tier.description || this.getTierDescription(tierNum)}
          </div>
          
          <div class="tier-images">
            ${this.renderTierImages(tier.images || this.getTierImages(tierNum))}
          </div>
          
          <div class="tier-buttons">
            <button class="${buttonClass}" ${buttonDisabled} ${buttonAction}>
              ${buttonText}
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = tiersHtml;

    // Show user membership status if logged in
    this.renderMembershipStatus();
  }

  /**
   * Get description for tier (fallback if API data not available)
   */
  getTierDescription(tierNum) {
    // Use API data if available
    if (this.tiers && this.tiers[tierNum]) {
      return this.tiers[tierNum].description;}
    
    // Fallback descriptions
    const descriptions = {
      '1': 'Unlock the graceful Elf profile image',
      '2': 'Unlock Elf and sturdy Dwarf profile images', 
      '3': 'Unlock Elf, Dwarf, and mystical Mage profile images',
      '4': 'Unlock all profile images including the legendary Dragon',
      '5': 'Unlock the righteous Paladin avatar with any one-time donation'
    };
    return descriptions[tierNum] || 'Unknown tier';}

  /**
   * Get images for tier (fallback if API data not available)
   */
  getTierImages(tierNum) {
    // Use API data if available
    if (this.tiers && this.tiers[tierNum]) {
      return this.tiers[tierNum].images || [];}
    
    // Fallback images
    const tierImages = {
      '1': ['elf.png'],
      '2': ['elf.png', 'dwarf.png'],
      '3': ['elf.png', 'dwarf.png', 'mage.png'],
      '4': ['elf.png', 'dwarf.png', 'mage.png', 'dragon.png'],
      '5': ['paladin.png']
    };
    return tierImages[tierNum] || [];}

  /**
   * Render tier images
   */
  renderTierImages(images) {
    const imageNames = {
      'elf.png': 'Elf',
      'dwarf.png': 'Dwarf', 
      'mage.png': 'Mage',
      'dragon.png': 'Dragon',
      'paladin.png': 'Paladin'
    };

    return images.map(img => 
      `<img src="/assets/img/profiles/${img}" alt="${imageNames[img]}" class="tier-image" title="${imageNames[img]}">`
    ).join('');}

  /**
   * Render membership status for logged in users
   */
  renderMembershipStatus() {
    console.log('🎨 renderMembershipStatus called');
    const container = document.getElementById('membership-container');
    if (!container) {
      console.warn('🚫 Membership container not found');
      return;}

    console.log('📊 Current membership data:', this.userMembership);

    // Remove any existing status display
    const existingStatus = container.querySelector('.membership-status');
    if (existingStatus) {
      console.log('🧹 Removing existing membership status display');
      existingStatus.remove();
    }

    if (this.userMembership && this.userMembership.isActive && this.userMembership.tier > 0) {
      console.log('✅ User qualifies for membership status display - rendering...');
      const statusHtml = `
        <div class="membership-status" style="
          background: rgba(0, 255, 0, 0.1);
          border: 2px solid rgba(0, 255, 0, 0.3);
          border-radius: 15px;
          padding: 2rem;
          margin-bottom: 2rem;
          text-align: center;
          backdrop-filter: blur(10px);
        ">
          <h3 style="color: #00ff00; margin-bottom: 1rem; font-family: 'Cinzel', serif; font-size: 1.8rem;">
            <i class="fas fa-crown"></i> ${this.userMembership.tierName} Active!
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 10px;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Current Tier</p>
              <p style="margin: 0; color: #ffd700; font-weight: bold; font-size: 1.1rem;">${this.userMembership.tierName}</p>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 10px;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Status</p>
              <p style="margin: 0; color: #00ff00; font-weight: bold; font-size: 1.1rem;">${this.userMembership.subscriptionStatus || 'Active'}</p>
            </div>
            ${this.userMembership.nextBillingDate ? `
            <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 10px;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Next Billing</p>
              <p style="margin: 0; color: #ffd700; font-weight: bold; font-size: 1.1rem;">${new Date(this.userMembership.nextBillingDate).toLocaleDateString()}</p>
            </div>
            ` : ''}
            <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 10px;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Unlocked Images</p>
              <p style="margin: 0; color: #ffd700; font-weight: bold; font-size: 1.1rem;">${this.userMembership.unlockedImages?.length || 0}</p>
            </div>
          </div>
          
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem;">
            ${this.userMembership.tier < 4 ? `
            <button class="epic-btn" onclick="window.location.hash = 'membership-tiers'; document.getElementById('membership-tiers').scrollIntoView({behavior: 'smooth'});" style="background: rgba(255, 193, 7, 0.2); border-color: rgba(255, 193, 7, 0.5);">
              <i class="fas fa-arrow-up"></i>
              Upgrade Tier
            </button>
            ` : `
            <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 10px; padding: 1rem; margin-bottom: 1rem;">
              <p style="margin: 0; color: #ffd700; font-weight: bold;">
                <i class="fas fa-dragon"></i> Maximum Tier Achieved!
              </p>
              <p style="margin: 0.5rem 0 0 0; color: rgba(255, 255, 255, 0.8); font-size: 0.9rem;">
                You have unlocked all available premium content. Thank you for your support!
              </p>
            </div>
            `}
            
            <button class="epic-btn" onclick="window.membershipManager.manageSubscription()" style="background: rgba(23, 162, 184, 0.2); border-color: rgba(23, 162, 184, 0.5);">
              <i class="fas fa-cog"></i>
              Manage Subscription
            </button>
            
            ${this.userMembership.subscriptionStatus !== 'cancelled' ? `
            <button class="tier-btn" onclick="window.membershipManager.cancelSubscription()" style="background: rgba(255, 0, 0, 0.2); border-color: rgba(255, 0, 0, 0.5); color: #ff6b6b;">
              <i class="fas fa-times"></i> Cancel Subscription
            </button>
            ` : `
            <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 10px; padding: 1rem; text-align: center;">
              <p style="margin: 0; color: #ffd700; font-weight: bold;">
                <i class="fas fa-info-circle"></i> Subscription Cancelled
              </p>
              <p style="margin: 0.5rem 0 0 0; color: rgba(255, 255, 255, 0.8); font-size: 0.9rem;">
                You will retain access until your current period ends.
              </p>
            </div>
            `}
          </div>
        </div>
      `;
      
             // Insert status at the beginning of the membership container
       const membershipInfo = container.querySelector('.membership-info');
       if (membershipInfo) {
         console.log('📍 Inserting status before membership-info');
         membershipInfo.insertAdjacentHTML('beforebegin', statusHtml);
       } else {
         console.log('📍 Inserting status at beginning of container (fallback)');
         // Fallback: insert at beginning of container
         container.insertAdjacentHTML('afterbegin', statusHtml);
       }
       console.log('✅ Membership status display rendered successfully');
     } else {
       console.log('❌ User does not qualify for membership status display');
       console.log('   - Has membership data:', !!this.userMembership);
       console.log('   - Is active:', this.userMembership?.isActive);
       console.log('   - Tier:', this.userMembership?.tier);
     }
   }

  /**
   * Subscribe to a tier
   */
  async subscribeTier(tier, provider = 'square', subscriptionType = 'monthly', buttonElement = null) {
    console.log(`🛡️ Purchasing tier ${tier} with ${provider} (${subscriptionType})`);

    // Check if user is logged in
    const userInfo = await this.getCurrentUser();
    if (!userInfo.isAuthenticated) {
      alert('Please log in to purchase a membership tier');
      return;}

    // Show loading state - improved button detection
    let button = buttonElement;
    
    // Try to get button from the event if not provided
    if (!button && typeof window !== 'undefined' && window.event && window.event.target) {
      button = window.event.target;
      // If it's an icon inside a button, get the button
      if (button.tagName === 'I' && button.parentElement.tagName === 'BUTTON') {
        button = button.parentElement;
      }
    }
    
    let originalText = '';
    if (button) {
      originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      button.disabled = true;
    }

    // Helper function to restore button state
    const restoreButton = () => {
      if (button && originalText) {
        button.innerHTML = originalText;
        button.disabled = false;
      }
    };

    try {

      // Always reload membership data to ensure it's current
      console.log('🔄 Reloading user membership data to ensure current state...');
      await this.loadUserMembership();

      // Determine if this is an upgrade
      const currentTier = this.userMembership?.tier || 0;
      const isUpgrade = currentTier > 0 && tier > currentTier;
      const changeType = isUpgrade ? 'upgrade' : 'new';

      console.log(`💰 Payment type: ${changeType} (current: ${currentTier}, new: ${tier})`);
      console.log(`🔍 User membership data:`, this.userMembership);
      console.log(`🔍 Upgrade detection: currentTier=${currentTier}, targetTier=${tier}, isUpgrade=${isUpgrade}`);

      // Prepare currency headers to maintain consistency
      const currencyHeaders = {
        'Content-Type': 'application/json'
      };

      // Add currency preference headers if available
      if (this.tierData?.currency) {
        currencyHeaders['X-Preferred-Currency'] = this.tierData.currency;
        console.log(`🌍 Sending preferred currency header: ${this.tierData.currency}`);
      }

      // Get browser's language header for consistency
      const userLanguage = navigator.language || navigator.userLanguage || 'en-CA';
      const acceptLanguage = `${userLanguage},en;q=0.9`;
      currencyHeaders['Accept-Language'] = acceptLanguage;

      // Show pricing confirmation before payment
      const currentTierData = this.tiers[tier];
      const displayPrice = currentTierData.providers.square.price;
      const displayCurrency = this.tierData?.currency || 'CAD';
      const displaySymbol = this.tierData?.currencySymbol || 'C$';

      if (isUpgrade) {
        const currentTierData = this.tiers[currentTier];
        const priceDifference = displayPrice - currentTierData.providers.square.price;
        console.log(`💰 Upgrade confirmation: ~${displaySymbol}${priceDifference.toFixed(2)} ${displayCurrency} (difference from current tier)`);
      } else {
        console.log(`💰 Purchase confirmation: ${displaySymbol}${displayPrice} ${displayCurrency}/month`);
      }

      // Create payment with consistent currency headers
      const response = await fetch('/api/membership/create-payment', {
        method: 'POST',
        headers: currencyHeaders,
        credentials: 'include',
        body: JSON.stringify({
          tier,
          provider,
          subscriptionType,
          changeType,
          // Include frontend currency data for validation
          frontendCurrency: displayCurrency,
          frontendPrice: displayPrice
        })
      });

      const data = await response.json();

      if (data.success) {
        // Validate that backend pricing matches frontend display
        const backendAmount = data.totalAmount;
        const currencyMatch = data.currency === displayCurrency;
        
        console.log(`💰 Pricing validation:`, {
          frontend: `${displaySymbol}${displayPrice} ${displayCurrency}`,
          backend: `${data.currency} ${backendAmount}`,
          match: currencyMatch,
          paymentType: data.paymentType,
          actualSquareCharge: `${data.actualChargeCurrencySymbol}${data.actualChargeAmount} ${data.actualChargeCurrency}`
        });

        if (!currencyMatch) {
          console.warn(`⚠️ Currency mismatch: Frontend shows ${displayCurrency}, backend processed ${data.currency}`);
        }

        if (provider === 'square') {
          // Add payment metadata to the order object for payment processing
          data.result.changeType = data.changeType;
          data.result.totalAmount = data.totalAmount;
          data.result.paymentType = data.paymentType;
          data.result.currentTier = data.currentTier;
          data.result.newTier = data.newTier;
          data.result.displayCurrency = data.currency;
          data.result.displayPrice = backendAmount;
          data.result.actualChargeAmount = data.actualChargeAmount;
          data.result.actualChargeCurrency = data.actualChargeCurrency;
          data.result.actualChargeCurrencySymbol = data.actualChargeCurrencySymbol;

          console.log(`💰 Payment order enhanced:`, {
            changeType: data.result.changeType,
            totalAmount: data.result.totalAmount,
            paymentType: data.result.paymentType,
            currentTier: data.result.currentTier,
            newTier: data.result.newTier,
            displayCurrency: data.result.displayCurrency,
            displayPrice: data.result.displayPrice,
            squareCharges: `${data.result.actualChargeCurrencySymbol}${data.result.actualChargeAmount} ${data.result.actualChargeCurrency}`
          });

          // Handle Square payment with Web Payments SDK
          const paymentResult = await this.handleSquarePayment(data.result, tier, restoreButton);
          
          // If payment was cancelled (returns false), don't restore button in finally as it's already restored
          if (paymentResult === false) {
            return;}
        } else if (provider === 'coinbase') {
          // Redirect to Coinbase payment page
          if (data.result.hosted_url) {
            console.log('🔗 Redirecting to Coinbase payment:', data.result.hosted_url);
            window.open(data.result.hosted_url, '_blank');
            this.showSuccess(`Payment created successfully! Complete your payment in the new tab.`);
          } else {
            throw new Error('No payment URL received from Coinbase');
          }
        } else {
          throw new Error('Unsupported payment provider');
        }
      } else {
        throw new Error(data.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error subscribing to tier:', error);
      this.showError(error.message || 'Failed to create subscription');
      // Restore button on error
      restoreButton();
    } finally {
      // Note: Button restoration is now handled by restoreButton() function
      // Either in the payment cancellation handler or error handler above
    }
  }

  /**
   * Cancel/reset membership
   */
  async cancelSubscription() {
    // Check if already cancelled
    if (this.userMembership && this.userMembership.subscriptionStatus === 'cancelled') {
      this.showEnhancedCancellationModal('Your subscription is already cancelled. You will retain access until the end of your current period.');
      return;}

    // Show nice confirmation modal instead of alert
    const confirmed = await this.showCancellationConfirmationModal();
    if (!confirmed) {
      return;}

    try {
      const response = await fetch('/api/membership/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          reason: 'User requested cancellation via blacksmith page'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Show enhanced modal for cancellation
        this.showEnhancedCancellationModal(data.message);
        // Reload membership status
        await this.loadUserMembership();
        this.renderMembershipTiers();
      } else {
        throw new Error(data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      this.showError(error.message || 'Failed to cancel subscription');
    }
  }

  /**
   * Show subscription management options
   */
  manageSubscription() {
    const membership = this.userMembership;
    if (!membership) {
      this.showError('No membership data available');
      return;}

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid rgba(255, 215, 0, 0.3);
        border-radius: 20px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      ">
        <div style="
          padding: 2rem;
          border-bottom: 1px solid rgba(255, 215, 0, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2 style="
            margin: 0;
            color: #ffd700;
            font-family: 'Cinzel', serif;
            font-size: 1.8rem;
          ">
            <i class="fas fa-cog"></i> Manage ${membership.tierName}
          </h2>
          <button onclick="this.closest('.modal').remove()" style="
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
          ">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div style="padding: 2rem;">
          <div style="
            background: rgba(40, 167, 69, 0.1);
            border: 1px solid rgba(40, 167, 69, 0.3);
            border-radius: 15px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            text-align: center;
          ">
            <h3 style="color: #28a745; margin: 0 0 1rem 0; font-size: 1.3rem;">
              <i class="fas fa-crown"></i> ${membership.tierName} - Active
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
              <div>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Status</p>
                <p style="margin: 0; color: #00ff00; font-weight: bold;">${membership.subscriptionStatus || 'Active'}</p>
              </div>
              <div>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Unlocked Images</p>
                <p style="margin: 0; color: #ffd700; font-weight: bold;">${membership.unlockedImages?.length || 0}/4</p>
              </div>
              ${membership.nextBillingDate ? `
              <div>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Next Billing</p>
                <p style="margin: 0; color: #ffd700; font-weight: bold;">${new Date(membership.nextBillingDate).toLocaleDateString()}</p>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${membership.tier < 4 ? `
          <div style="margin-bottom: 2rem;">
            <h4 style="color: #ffd700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-arrow-up"></i> Upgrade Your Tier
            </h4>
            <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 1rem;">
              Unlock more premium profile images by upgrading to a higher tier.
            </p>
            <button onclick="this.closest('.modal').remove(); window.location.hash = 'membership-tiers'; document.getElementById('membership-tiers').scrollIntoView({behavior: 'smooth'});" style="
              background: linear-gradient(45deg, #ffd700, #ffed4e);
              color: #000;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 25px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            ">
              <i class="fas fa-crown"></i>
              View Upgrade Options
            </button>
          </div>
          ` : `
          <div style="
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 15px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            text-align: center;
          ">
            <h4 style="color: #ffd700; margin: 0 0 0.5rem 0;">
              <i class="fas fa-dragon"></i> Maximum Tier Achieved!
            </h4>
            <p style="margin: 0; color: rgba(255, 255, 255, 0.8);">
              You have unlocked all available premium content. Thank you for your support!
            </p>
          </div>
          `}
          
          <div style="margin-bottom: 2rem;">
            <h4 style="color: #17a2b8; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-credit-card"></i> Payment Management
            </h4>
            <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 1rem;">
              Your monthly ${membership.tierName} subscription is processed securely through ${membership.paymentProvider || 'Square'}.
            </p>
            <button onclick="alert('Payment method updates will be available in a future update. For now, please contact support if you need to update your payment method.');" style="
              background: rgba(23, 162, 184, 0.2);
              border: 1px solid rgba(23, 162, 184, 0.5);
              color: #17a2b8;
              padding: 0.75rem 1.5rem;
              border-radius: 25px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            ">
              <i class="fas fa-credit-card"></i>
              Update Payment Method
            </button>
          </div>
          
          ${membership.subscriptionStatus !== 'cancelled' ? `
          <div style="
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 2rem;
            text-align: center;
          ">
            <h4 style="color: #dc3545; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <i class="fas fa-times-circle"></i> Cancel Subscription
            </h4>
            <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 1.5rem; font-size: 0.9rem;">
              Canceling will stop your monthly subscription. You will retain access to premium images until the end of your current billing period.
            </p>
            <button onclick="this.closest('.modal').remove(); membershipManager.cancelSubscription();" style="
              background: rgba(220, 53, 69, 0.2);
              border: 1px solid rgba(220, 53, 69, 0.5);
              color: #dc3545;
              padding: 0.75rem 2rem;
              border-radius: 25px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 0.5rem;
              margin: 0 auto;
            ">
              <i class="fas fa-times-circle"></i>
              Cancel Monthly Subscription
            </button>
          </div>
          ` : `
          <div style="
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 2rem;
            text-align: center;
          ">
            <h4 style="color: #ffd700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <i class="fas fa-info-circle"></i> Subscription Cancelled
            </h4>
            <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 1.5rem; font-size: 0.9rem;">
              Your subscription has been cancelled. You will retain access to premium features until the end of your current billing period.
            </p>
            <div style="
              background: rgba(255, 193, 7, 0.1);
              border: 1px solid rgba(255, 193, 7, 0.3);
              border-radius: 10px;
              padding: 1rem;
              margin: 0 auto;
              max-width: 300px;
            ">
              <p style="margin: 0; color: #ffd700; font-weight: bold; font-size: 0.9rem;">
                Access expires: ${membership.currentPeriodEnd ? new Date(membership.currentPeriodEnd).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Handle payment success callback
   */
  async handlePaymentSuccess(paymentId, provider, isUpgrade = false) {
    console.log('🎉 Payment success callback:', { paymentId, provider, isUpgrade });
    
    try {
      // Reload membership status
      await this.loadUserMembership();
      this.renderMembershipTiers();
      
      // Show success message with tier information
      const tierName = this.userMembership?.tierName || 'Hero';
      const tierNumber = this.userMembership?.tier || 0;
      const unlockedImages = this.userMembership?.unlockedImages?.length || 0;
      
      if (isUpgrade) {
        this.showSuccess(
          `🚀 Membership Upgraded! 🚀\n\n` +
          `Your Hero Tier ${tierNumber} membership upgrade is complete!\n` +
          `You now have access to ${unlockedImages} premium profile image${unlockedImages !== 1 ? 's' : ''}.\n\n` +
          `Visit your profile page to change your avatar and manage your membership.\n\n` +
          `The page will refresh automatically when you close this confirmation.`,
          true, // Enhanced version
          'upgrade' // Modal type
        );
      } else {
        this.showSuccess(
          `🎉 Welcome to ${tierName}! 🎉\n\n` +
          `Your Hero Tier ${tierNumber} membership is now active!\n` +
          `You have unlocked ${unlockedImages} premium profile image${unlockedImages !== 1 ? 's' : ''}.\n\n` +
          `Visit your profile page to change your avatar and manage your membership.\n\n` +
          `The page will refresh automatically when you close this confirmation.`,
          true, // Enhanced version
          'activation' // Modal type
        );
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
      const fallbackMessage = isUpgrade ? 
        'Membership upgraded successfully! Please refresh the page to see your new status.' :
        'Membership activated successfully! Please refresh the page to see your new status.';
      this.showSuccess(fallbackMessage);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message, enhanced = false, modalType = 'activation') {
    console.log('✅ Success:', message);
    
    if (enhanced) {
      // Enhanced success modal for major events like subscription activation/upgrade
      this.showEnhancedSuccessModal(message, modalType);
    } else {
      // Regular toast notification
      this.showToast(message, 'success');
    }
  }

  /**
   * Show enhanced success modal for important events (persistent until manually closed)
   */
  showEnhancedSuccessModal(message, modalType = 'activation') {
    const modal = document.createElement('div');
    modal.className = 'membership-success-modal';
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      backdrop-filter: blur(5px) !important;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 3px solid #ffd700;
        border-radius: 20px;
        padding: 3rem;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        animation: celebrationBounce 0.6s ease;
        position: relative;
      ">
        <div style="
          font-size: 4rem;
          margin-bottom: 1rem;
          color: #ffd700;
          animation: celebrationGlow 2s ease infinite;
        ">
          👑
        </div>
        <h2 style="
          color: #ffd700;
          font-family: 'Cinzel', serif;
          font-size: 2.2rem;
          margin-bottom: 1.5rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        ">
          ${modalType === 'upgrade' ? 'Membership Upgraded!' : 'Membership Activated!'}
        </h2>
        <p style="
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
          white-space: pre-line;
        ">${message}</p>
        <div style="margin-bottom: 1rem;">
          <p style="
            color: rgba(255, 215, 0, 0.8);
            font-size: 0.9rem;
            font-style: italic;
          ">This confirmation will stay open until you close it manually</p>
        </div>
        <button class="close-modal" style="
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          color: #000;
          border: none;
          padding: 1rem 2rem;
          border-radius: 25px;
          font-weight: 600;
          font-size: 1.1rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        ">
          <i class="fas fa-check"></i>
          Awesome!
        </button>
      </div>
    `;

    // Add celebration animations if not already present
    if (!document.getElementById('celebration-styles')) {
      const style = document.createElement('style');
      style.id = 'celebration-styles';
      style.textContent = `
        @keyframes celebrationBounce {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.05) rotate(2deg); }
          70% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes celebrationGlow {
          0%, 100% { text-shadow: 0 0 20px #ffd700, 0 0 40px #ffd700; }
          50% { text-shadow: 0 0 30px #ffd700, 0 0 60px #ffd700, 0 0 80px #ffd700; }
        }
      `;
      document.head.appendChild(style);
    }

    // Add close event listeners
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('close-modal')) {
        modal.remove();
        // Reload page when user manually closes the success modal
        window.location.reload();
      }
    });

    document.body.appendChild(modal);
    
    // Prevent accidental closure and ensure visibility
    setTimeout(() => {
      if (modal && modal.parentNode) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
      }
    }, 100);
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      color: white;
      font-weight: 600;
      z-index: 10001;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      animation: slideInRight 0.3s ease;
      ${type === 'success' ? 
        'background: rgba(40, 167, 69, 0.9); border: 1px solid rgba(40, 167, 69, 0.3);' : 
        'background: rgba(220, 53, 69, 0.9); border: 1px solid rgba(220, 53, 69, 0.3);'}
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
      </div>
    `;

    // Add animation styles if not already present
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 4000);
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('❌ Error:', message);
    this.showToast(message, 'error');
  }

  /**
   * Show success message (alias for consistency)
   */
  showSuccessMessage(message) {
    this.showToast(message, 'success');
  }

  /**
   * Show error message (alias for consistency)
   */
  showErrorMessage(message) {
    this.showToast(message, 'error');
  }

  /**
   * Handle Square payment with Web Payments SDK
   */
  async handleSquarePayment(order, tier, restoreButton = null) {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (!this.isSecureContext()) {
        const errorMessage = this.getSecureContextErrorMessage();
        console.error('❌ Square payment requires secure context:', errorMessage);
        
        // Show setup instructions for development
        if (window.location.hostname === '127.0.0.1') {
          this.showDevelopmentSetupInstructions();
        } else {
          this.showError(errorMessage);
        }
        
        if (restoreButton) restoreButton();
        return false;}

      // Check if Square Web Payments SDK is loaded
      if (typeof Square === 'undefined') {
        // Load Square Web Payments SDK dynamically
        await this.loadSquareSDK();
      }

      const applicationId = 'sandbox-sq0idb-9JEx9IQ7SzKcTwx3nZPEyA'; // Your sandbox app ID
      const locationId = order.location_id; // Use the location ID from the order

      // Initialize Square payments
      const payments = Square.payments(applicationId, locationId);
      
      // Create payment form and return the result (true for success/completion, false for cancellation)
      return await this.showSquarePaymentForm(payments, order, tier, restoreButton);} catch (error) {
      console.error('Error handling Square payment:', error);
      
      // Check if it's a secure context error
      if (error.message && error.message.includes('secure context')) {
        const errorMessage = this.getSecureContextErrorMessage();
        this.showError(errorMessage);
      } else {
        this.showError('Failed to initialize Square payment');
      }
      
      // Restore button on error
      if (restoreButton) restoreButton();
      return false;}
  }

  /**
   * Check if we're in a secure context for Square payments
   */
  isSecureContext() {
    // Check if we're in a secure context (HTTPS or localhost)
    if (window.isSecureContext) {
      return window.isSecureContext;}
    
    // Fallback check for older browsers
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // HTTPS is always secure
    if (protocol === 'https:') {
      return true;}
    
    // Localhost is considered secure for development
    if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return true;}
    
    return false;}

  /**
   * Get appropriate error message for secure context issues
   */
  getSecureContextErrorMessage() {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    if (protocol === 'http:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'Square payments require HTTPS. Please use the secure version of this site.';} else if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return 'Square payments require a secure connection. For development, try using "localhost" instead of "127.0.0.1" or set up HTTPS locally.';} else {
      return 'Square payments require a secure context. Please ensure you\'re using HTTPS.';}
  }

  /**
   * Show development setup instructions for HTTPS
   */
  showDevelopmentSetupInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 10px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    content.innerHTML = `
      <h2 style="color: #333; margin-bottom: 1rem;">🔒 Square Payments Setup</h2>
      <p style="color: #666; margin-bottom: 1rem;">
        Square's Web Payments SDK requires a secure context (HTTPS). Here are your options:
      </p>
      
      <div style="background: #f8f9fa; border-left: 4px solid #007cba; padding: 1rem; margin: 1rem 0;">
        <h3 style="color: #007cba; margin-top: 0;">Option 1: Use localhost (Recommended)</h3>
        <p style="margin-bottom: 0.5rem;">Instead of <code>http://127.0.0.1:3000</code>, use:</p>
        <code style="background: #e9ecef; padding: 0.25rem 0.5rem; border-radius: 3px;">http://localhost:3000</code>
      </div>
      
      <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 1rem; margin: 1rem 0;">
        <h3 style="color: #28a745; margin-top: 0;">Option 2: Set up HTTPS locally</h3>
        <p style="margin-bottom: 0.5rem;">Add to your backend <code>package.json</code>:</p>
        <pre style="background: #e9ecef; padding: 0.5rem; border-radius: 3px; overflow-x: auto;">
"scripts": {
  "start-https": "node -e \"require('https').createServer({key: require('fs').readFileSync('localhost-key.pem'), cert: require('fs').readFileSync('localhost.pem')}, require('./index.js')).listen(3000)\""
}</pre>
        <p style="margin-top: 0.5rem; margin-bottom: 0;">Then run: <code>npm run start-https</code></p>
      </div>
      

      
      <button id="close-setup-modal" style="margin-top: 1rem; padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">Got it!</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close modal
    modal.querySelector('#close-setup-modal').onclick = () => {
      modal.remove();
    };

    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
  }

  /**
   * Load Square Web Payments SDK
   */
  async loadSquareSDK() {
    return new Promise((resolve, reject) => {
      if (typeof Square !== 'undefined') {
        resolve();return;}

      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.onload = () => {
        console.log('✅ Square SDK loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Square SDK:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Show Square payment form
   */
  async showSquarePaymentForm(payments, order, tier, restoreButton = null) {
    try {
      // Show payment modal first, then attach card
      const modalResult = await this.showPaymentModal(order, async () => {
        console.log('🔧 Initializing Square card form...');
        
        // Initialize digital wallets first
        await this.initializeDigitalWallets(payments, order, tier);
        
        // Create and attach card payment method after modal is shown
        const card = await payments.card({
          style: {
            '.input-container': {
              borderColor: '#cccccc',
              borderRadius: '5px'
            },
            '.input-container.is-focus': {
              borderColor: '#007cba'
            },
            '.input-container.is-error': {
              borderColor: '#ff1600'
            }
          }
        });
        await card.attach('#square-card-container');
        
        console.log('✅ Square card attached successfully');
        
        // Return the payment handler function
        return async () => {
          console.log('💳 Starting payment tokenization...');const tokenResult = await card.tokenize();
          
          if (tokenResult.status === 'OK') {
            console.log('✅ Card tokenization successful');
            
            // Process payment with backend
            const response = await fetch('/api/membership/process-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                orderId: order.id,
                sourceId: tokenResult.token,
                verificationToken: tokenResult.details?.verification_token,
                tier: tier,
                changeType: order.changeType || 'new'
              })
            });

            const data = await response.json();
            
            if (data.success) {
              // Call the enhanced success handler with upgrade information
              const isUpgrade = order.changeType === 'upgrade';
              await this.handlePaymentSuccess(data.paymentId, 'square', isUpgrade);
              // Note: handlePaymentSuccess already reloads membership status and renders tiers
            } else {
              throw new Error(data.message || 'Payment failed');
            }
          } else {
            console.error('❌ Card tokenization failed:', tokenResult.errors);
            throw new Error(`Card tokenization failed: ${tokenResult.errors?.[0]?.detail || 'Unknown error'}`);
          }
        };
      }, restoreButton);
      
      // Return the modal result (true for payment success, false for cancellation)
      return modalResult;} catch (error) {
      console.error('Error showing Square payment form:', error);
      this.showError('Failed to initialize payment form');
      // Restore button on error
      if (restoreButton) restoreButton();
      return false;}
  }

  /**
   * Show payment modal (basic implementation)
   */
  async showPaymentModal(order, handlePaymentSetup, restoreButton = null) {
    console.log('🏪 Order object received:', order);
    return new Promise(async (resolve, reject) => {
      // Create a simple modal for payment
      const modal = document.createElement('div');modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 10px;
        max-width: 400px;
        width: 90%;
      `;

      // Use the correct amount from backend response (includes prorated pricing)
      let cadAmount = 0;
      let userCurrency = this.tierData?.currency || 'CAD';
      let userSymbol = this.tierData?.currencySymbol || 'C$';
      let estimatedUserAmount = 0;

      // Get the CAD amount (what Square actually charges)
      if (order.actualChargeAmount) {
        cadAmount = order.actualChargeAmount;
      } else if (order.totalMoney && order.totalMoney.amount) {
        cadAmount = order.totalMoney.amount / 100;
      } else if (order.total_money && order.total_money.amount) {
        cadAmount = order.total_money.amount / 100;
      } else if (order.lineItems && order.lineItems.length > 0) {
        cadAmount = order.lineItems.reduce((total, item) => {
          const itemAmount = item.basePriceMoney?.amount || item.base_price_money?.amount || 0;
          const quantity = parseInt(item.quantity) || 1;
          return total + (itemAmount * quantity);}, 0) / 100;
      } else if (order.line_items && order.line_items.length > 0) {
        cadAmount = order.line_items.reduce((total, item) => {
          const itemAmount = item.base_price_money?.amount || 0;
          const quantity = parseInt(item.quantity) || 1;
          return total + (itemAmount * quantity);}, 0) / 100;
      }

      // Get estimated amount in user's currency (for reference only)
      if (order.totalAmount) {
        estimatedUserAmount = order.totalAmount;
      } else {
        estimatedUserAmount = cadAmount; // Fallback to CAD
      }

      console.log(`💰 Payment Modal - Simplified Display:`, {
        selectedCurrency: userCurrency,
        cadChargeAmount: `C$${cadAmount}`,
        estimatedUserAmount: `${userSymbol}${estimatedUserAmount}`,
        showEstimate: userCurrency !== 'CAD'
      });

      // Add upgrade context to the modal title
      const isUpgrade = order.paymentType === 'prorated_upgrade';
      const modalTitle = isUpgrade ? 'Complete Your Upgrade' : 'Complete Your Purchase';

      // Show estimated conversion ONLY for non-CAD currencies
      const showEstimation = userCurrency !== 'CAD';

      content.innerHTML = `
        <h3>${modalTitle}</h3>
        
        <div style="background: rgba(40, 167, 69, 0.1); border: 1px solid rgba(40, 167, 69, 0.3); border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-credit-card" style="color: #28a745;"></i>
            <strong style="color: #28a745;">Square Will Charge: C$${cadAmount.toFixed(2)} CAD</strong>
          </div>
          ${isUpgrade ? `<div style="color: #666; font-size: 0.9rem;">Prorated upgrade pricing</div>` : ''}
        </div>

        ${showEstimation ? `
        <div style="background: rgba(0, 123, 186, 0.1); border: 1px solid rgba(0, 123, 186, 0.3); border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-calculator" style="color: #007cba;"></i>
            <strong style="color: #007cba;">Estimated in ${userCurrency}: ${userSymbol}${estimatedUserAmount.toFixed(2)}</strong>
          </div>
          <div style="font-size: 0.85rem; color: #666;">
            This is an estimate for reference. Your bank will handle the actual conversion from CAD.
          </div>
        </div>
        ` : ''}

        ${isUpgrade ? `
        <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-arrow-up" style="color: #ffd700;"></i>
            <strong style="color: #ffd700;">Upgrade Pricing</strong>
          </div>
          <div style="color: #666; font-size: 0.9rem;">
            You're only paying the difference for the remaining days in your current billing period.
          </div>
        </div>
        ` : ''}
        
        <div style="background: rgba(108, 117, 125, 0.1); border: 1px solid rgba(108, 117, 125, 0.3); border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-shield-alt" style="color: #6c757d;"></i>
            <strong style="color: #333;">Secure Payment Processing</strong>
          </div>
          <div style="color: #666; font-size: 0.9rem; line-height: 1.3;">
            • All payments processed securely through Square in CAD<br>
            • International cards accepted with automatic conversion<br>
            • Supported: Visa, Mastercard, Amex, Apple Pay, Google Pay
          </div>
        </div>
        
        <!-- Digital Wallet Buttons -->
        <div style="display: flex; gap: 1rem; margin: 1rem 0; justify-content: center; flex-wrap: wrap;">
          <div id="apple-pay-button" style="display: none; width: 150px; height: 40px; cursor: pointer; border-radius: 4px;"></div>
          <div id="google-pay-button" style="display: none; width: 150px; height: 40px; cursor: pointer; border-radius: 4px;"></div>
          <div id="afterpay-button" style="display: none; width: 150px; height: 40px; cursor: pointer; border-radius: 4px;"></div>
        </div>
        
        <div style="text-align: center; margin: 1rem 0; color: #666; font-size: 0.9rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
            <hr style="flex: 1; border: none; border-top: 1px solid #ddd;">
            <span>or pay with card</span>
            <hr style="flex: 1; border: none; border-top: 1px solid #ddd;">
          </div>
        </div>
        
        <div id="square-card-container" style="margin: 1rem 0; min-height: 100px;"></div>
        <button id="pay-button" style="margin-top: 1rem; padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;" disabled>Initializing...</button>
        <button id="cancel-button" style="margin-top: 1rem; margin-left: 10px; padding: 10px 20px; background: #ccc; color: black; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
      `;

      // Handle clicking outside the modal to close it
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
          // Restore the original button state when cancelled
          if (restoreButton) {
            restoreButton();
          }
          resolve(false); // Payment was cancelled
        }
      };

      modal.appendChild(content);
      document.body.appendChild(modal);

      try {
        // Initialize payment after modal is in DOM
        const paymentHandler = await handlePaymentSetup();
        
        // Enable pay button
        const payButton = document.getElementById('pay-button');
        payButton.disabled = false;
        payButton.textContent = 'Pay Now';

        // Handle pay button
        payButton.onclick = async () => {
          try {
            payButton.disabled = true;
            payButton.textContent = 'Processing...';
            await paymentHandler(); // Call the function
            modal.remove();
            resolve(true); // Payment completed successfully
          } catch (error) {
            console.error('Payment error:', error);
            this.showError(error.message);
            payButton.disabled = false;
            payButton.textContent = 'Pay Now';
          }
        };

        // Handle cancel button
        document.getElementById('cancel-button').onclick = () => {
          modal.remove();
          // Restore the original button state when cancelled
          if (restoreButton) {
            restoreButton();
          }
          resolve(false); // Payment was cancelled
        };

      } catch (error) {
        console.error('Error setting up payment:', error);
        this.showError('Failed to initialize payment form');
        modal.remove();
        // Restore button on error
        if (restoreButton) {
          restoreButton();
        }
        reject(error);
      }
    });
  }

  /**
   * Show cancellation confirmation modal
   */
  showCancellationConfirmationModal() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');modal.className = 'cancellation-confirmation-modal';
      modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.9) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 999999 !important;
        backdrop-filter: blur(5px) !important;
      `;

      modal.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border: 3px solid #dc3545;
          border-radius: 20px;
          padding: 3rem;
          max-width: 500px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
          animation: confirmationBounce 0.6s ease;
          position: relative;
        ">
          <div style="
            font-size: 4rem;
            margin-bottom: 1rem;
            color: #dc3545;
            animation: warningGlow 2s ease infinite;
          ">
            ⚠️
          </div>
          <h2 style="
            color: #dc3545;
            font-family: 'Cinzel', serif;
            font-size: 2.2rem;
            margin-bottom: 1.5rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
          ">
            Cancel Subscription?
          </h2>
          <p style="
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          ">
            Are you sure you want to cancel your monthly subscription?<br><br>
            <strong>You will lose access to premium profile images at the end of your current billing period.</strong>
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button class="confirm-cancel" style="
              background: linear-gradient(45deg, #dc3545, #c82333);
              color: #fff;
              border: none;
              padding: 1rem 2rem;
              border-radius: 25px;
              font-weight: 600;
              font-size: 1.1rem;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
            ">
              <i class="fas fa-times-circle"></i>
              Yes, Cancel Subscription
            </button>
            <button class="keep-subscription" style="
              background: linear-gradient(45deg, #28a745, #20c997);
              color: #fff;
              border: none;
              padding: 1rem 2rem;
              border-radius: 25px;
              font-weight: 600;
              font-size: 1.1rem;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
            ">
              <i class="fas fa-crown"></i>
              Keep My Subscription
            </button>
          </div>
        </div>
      `;

      // Add confirmation animations if not already present
      if (!document.getElementById('confirmation-styles')) {
        const style = document.createElement('style');
        style.id = 'confirmation-styles';
        style.textContent = `
          @keyframes confirmationBounce {
            0% { transform: scale(0.3) rotate(-5deg); opacity: 0; }
            50% { transform: scale(1.05) rotate(1deg); }
            70% { transform: scale(0.95) rotate(-0.5deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes warningGlow {
            0%, 100% { text-shadow: 0 0 20px #dc3545, 0 0 40px #dc3545; }
            50% { text-shadow: 0 0 30px #dc3545, 0 0 60px #dc3545, 0 0 80px #dc3545; }
          }
        `;
        document.head.appendChild(style);
      }

      // Add event listeners
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('confirm-cancel')) {
          modal.remove();
          resolve(true); // User confirmed cancellation
        } else if (e.target.classList.contains('keep-subscription') || e.target === modal) {
          modal.remove();
          resolve(false); // User cancelled or clicked outside
        }
      });

      document.body.appendChild(modal);
    });
  }

  /**
   * Show enhanced cancellation modal for important events (persistent until manually closed)
   */
  showEnhancedCancellationModal(message) {
    const modal = document.createElement('div');
    modal.className = 'membership-cancellation-modal';
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      backdrop-filter: blur(5px) !important;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 3px solid #ffd700;
        border-radius: 20px;
        padding: 3rem;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        animation: cancellationBounce 0.6s ease;
        position: relative;
      ">
        <div style="
          font-size: 4rem;
          margin-bottom: 1rem;
          color: #ffd700;
          animation: cancellationGlow 2s ease infinite;
        ">
          👑
        </div>
        <h2 style="
          color: #ffd700;
          font-family: 'Cinzel', serif;
          font-size: 2.2rem;
          margin-bottom: 1.5rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        ">
          Subscription Cancelled
        </h2>
        <p style="
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
          white-space: pre-line;
        ">${message}</p>
        <div style="margin-bottom: 1rem;">
          <p style="
            color: rgba(255, 215, 0, 0.8);
            font-size: 0.9rem;
            font-style: italic;
          ">This confirmation will stay open until you close it manually</p>
        </div>
        <button class="close-modal" style="
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          color: #000;
          border: none;
          padding: 1rem 2rem;
          border-radius: 25px;
          font-weight: 600;
          font-size: 1.1rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-right: 1rem;
        ">
          <i class="fas fa-check"></i>
          Okay
        </button>
        <button class="close-modal" style="
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 1rem 1.5rem;
          border-radius: 25px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        ">
          <i class="fas fa-times"></i>
          Close
        </button>
      </div>
    `;

    // Add cancellation animations if not already present
    if (!document.getElementById('cancellation-styles')) {
      const style = document.createElement('style');
      style.id = 'cancellation-styles';
      style.textContent = `
        @keyframes cancellationBounce {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.05) rotate(2deg); }
          70% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes cancellationGlow {
          0%, 100% { text-shadow: 0 0 20px #ffd700, 0 0 40px #ffd700; }
          50% { text-shadow: 0 0 30px #ffd700, 0 0 60px #ffd700, 0 0 80px #ffd700; }
        }
      `;
      document.head.appendChild(style);
    }

    // Add close event listeners
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('close-modal')) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
    
    // Prevent accidental closure and ensure visibility
    setTimeout(() => {
      if (modal && modal.parentNode) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
      }
    }, 100);
  }

  /**
   * Initialize digital wallet payment methods
   */
  async initializeDigitalWallets(payments, order, tier) {
    try {
      console.log('🏦 Initializing digital wallets...');
      
      // Calculate amount from order
      let amount = '0.00';
      if (order.totalMoney && order.totalMoney.amount) {
        amount = (order.totalMoney.amount / 100).toFixed(2);
      } else if (order.total_money && order.total_money.amount) {
        amount = (order.total_money.amount / 100).toFixed(2);
      }
      
      // Create payment request for digital wallets
      const paymentRequest = payments.paymentRequest({
        countryCode: 'CA',
        currencyCode: 'CAD',
        total: {
          amount: amount,
          label: 'Warcraft Arena Membership'
        }
      });
      
      // Initialize Apple Pay
      try {
        const applePay = await payments.applePay(paymentRequest);
        const applePayButton = document.getElementById('apple-pay-button');
        if (applePayButton) {
          // Attach Apple Pay to the button element
          await applePay.attach('#apple-pay-button');
          applePayButton.style.display = 'flex';
          applePayButton.addEventListener('click', async () => {
            await this.processDigitalWalletPayment(applePay, order, tier, 'Apple Pay');
          });
          console.log('✅ Apple Pay initialized and attached');
        }
      } catch (error) {
        console.log('ℹ️ Apple Pay not available:', error.message);
      }
      
      // Initialize Google Pay
      try {
        const googlePay = await payments.googlePay(paymentRequest);
        const googlePayButton = document.getElementById('google-pay-button');
        if (googlePayButton) {
          // Attach Google Pay to the button element
          await googlePay.attach('#google-pay-button');
          googlePayButton.style.display = 'flex';
          googlePayButton.addEventListener('click', async () => {
            await this.processDigitalWalletPayment(googlePay, order, tier, 'Google Pay');
          });
          console.log('✅ Google Pay initialized and attached');
        }
      } catch (error) {
        console.log('ℹ️ Google Pay not available:', error.message);
      }
      
      // Initialize Afterpay
      try {
        const afterpay = await payments.afterpayClearpay(paymentRequest);
        const afterpayButton = document.getElementById('afterpay-button');
        if (afterpayButton) {
          // Attach Afterpay to the button element
          await afterpay.attach('#afterpay-button');
          afterpayButton.style.display = 'flex';
          afterpayButton.addEventListener('click', async () => {
            await this.processDigitalWalletPayment(afterpay, order, tier, 'Afterpay');
          });
          console.log('✅ Afterpay initialized and attached');
        }
      } catch (error) {
        console.log('ℹ️ Afterpay not available:', error.message);
      }
      
    } catch (error) {
      console.error('Error initializing digital wallets:', error);
      // Don't throw - card payments should still work
    }
  }

  /**
   * Process digital wallet payment
   */
  async processDigitalWalletPayment(paymentMethod, order, tier, methodName) {
    try {
      console.log(`💳 Processing ${methodName} payment...`);
      
      // Check if payment method is properly attached
      if (!paymentMethod) {
        throw new Error(`${methodName} is not properly initialized`);
      }
      
      const tokenResult = await paymentMethod.tokenize();
      
      if (tokenResult.status === 'OK') {
        console.log(`✅ ${methodName} tokenization successful`);
        
        // Process payment with backend
        const response = await fetch('/api/membership/process-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            orderId: order.id,
            sourceId: tokenResult.token,
            verificationToken: tokenResult.details?.verification_token,
            tier: tier,
            paymentMethod: methodName.toLowerCase().replace(' ', '_'),
            changeType: order.changeType || 'new'
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Close modal and show success
          const modal = document.querySelector('.modal, [style*="position: fixed"]');
          if (modal) modal.remove();
          
          const isUpgrade = order.changeType === 'upgrade';
          await this.handlePaymentSuccess(data.paymentId, 'square', isUpgrade);
        } else {
          throw new Error(data.message || 'Payment failed');
        }
      } else {
        console.error(`❌ ${methodName} tokenization failed:`, tokenResult.errors);
        const errorMessage = tokenResult.errors?.[0]?.detail || tokenResult.errors?.[0]?.message || 'Unknown error';
        throw new Error(`${methodName} payment failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error(`Error processing ${methodName} payment:`, error);
      
      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('not been attached')) {
        userMessage = `${methodName} is not available right now. Please try using a card instead.`;
      } else if (error.message.includes('User canceled') || error.message.includes('cancelled')) {
        userMessage = `${methodName} payment was cancelled.`;
      } else if (error.message.includes('not supported')) {
        userMessage = `${methodName} is not supported on this device. Please try using a card instead.`;
      }
      
      this.showError(userMessage);
    }
  }
}

// Create global instance
window.membershipManager = new MembershipManager(); 