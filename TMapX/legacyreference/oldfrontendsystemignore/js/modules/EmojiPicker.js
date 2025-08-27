/**
 * EmojiPicker Module
 * Handles emoji selection, purchasing, and insertion into chat
 */
export class EmojiPicker {
  constructor(chatManager) {
    this.chatManager = chatManager;
    // Initialize API client if not provided
    if (chatManager.api) {
      this.api = chatManager.api;
    } else {
      // Create a simple API client for emoji requests
      this.api = {
        get: async (endpoint) => {
          const response = await fetch(endpoint, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(window.getAuthHeaders ? window.getAuthHeaders() : {})
            }
          });
          return response;}
      };
    }
    this.ownedEmojis = [];
    this.allEmojis = {};
    this.isOpen = false;
    this.currentMode = 'picker'; // 'picker' or 'shop'
    this.userArenaGold = 0;
    this.savedCursorPosition = 0;
    this.chatInputElement = null;
  }

  /**
   * Initialize the emoji picker
   */
  async init() {
    console.log('🎭 Initializing emoji picker...');
    await this.loadOwnedEmojis();
    this.setupEventListeners();
  }

  /**
   * Load user's owned emojis
   */
  async loadOwnedEmojis() {
    try {
      const response = await this.api.get('/api/emojis/owned');
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          this.ownedEmojis = data.data || [];
          console.log(`✅ Loaded ${this.ownedEmojis.length} owned emojis`);
        } else {
          console.warn('⚠️ Failed to load owned emojis:', data.message);
        }
      } else {
        console.error('❌ Error loading owned emojis:', response?.status);
      }
    } catch (error) {
      console.error('❌ Error loading owned emojis:', error);
    }
  }

  /**
   * Load all emojis with shop data
   */
  async loadShopData() {
    try {
      const response = await this.api.get('/api/emojis/shop');
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          this.allEmojis = data.data.tiers || {};
          this.userArenaGold = data.data.userArenaGold || 0;
          console.log(`🛍️ Loaded shop data with ${this.userArenaGold} arena gold`);
          return data.data;} else {
          console.warn('⚠️ Failed to load shop data:', data.message);
        }
      } else {
        console.error('❌ Error loading shop data:', response?.status);
      }
    } catch (error) {
      console.error('❌ Error loading shop data:', error);
    }
    return null;}

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for emoji button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="emoji"]') || e.target.closest('[data-action="emoji"]')) {
        e.preventDefault();
        e.stopPropagation();
        this.togglePicker();
        return;}
      
      // Close picker when clicking outside
      if (this.isOpen && !e.target.closest('.emoji-picker-container')) {
        this.closePicker();
      }
    });
  }

  /**
   * Toggle emoji picker visibility
   */
  async togglePicker() {
    if (this.isOpen) {
      this.closePicker();
    } else {
      await this.openPicker();
    }
  }

  /**
   * Open emoji picker
   */
  async openPicker() {
    this.isOpen = true;
    this.currentMode = 'picker';
    
    // Store current cursor position and chat input reference
    this.chatInputElement = document.querySelector('#message-input') || document.querySelector('.chat-input');
    if (this.chatInputElement && document.activeElement === this.chatInputElement) {
      this.savedCursorPosition = this.chatInputElement.selectionStart;
      console.log('💾 Saved cursor position:', this.savedCursorPosition);
    } else {
      // If chat input is not focused, default to end of text
      this.savedCursorPosition = this.chatInputElement ? this.chatInputElement.value.length : 0;
    }
    
    // Remove existing picker
    this.removeExistingPicker();
    
    // Create picker container
    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'emoji-picker-container';
    pickerContainer.innerHTML = this.createPickerHTML();
    
    // Find the emoji button and position picker
    const emojiButton = document.querySelector('[data-action="emoji"]') || document.querySelector('#add-emoji-btn');
    if (emojiButton) {
      const rect = emojiButton.getBoundingClientRect();
      pickerContainer.style.position = 'fixed';
      // Position above the button for forum context
      pickerContainer.style.top = `${rect.top - 520}px`; // 520px is approximate picker height
      pickerContainer.style.left = `${rect.left}px`;
      pickerContainer.style.zIndex = '10000';
      
      // Ensure picker doesn't go off-screen
      if (rect.top - 520 < 0) {
        pickerContainer.style.top = '20px';
      }
      if (rect.left + 380 > window.innerWidth) {
        pickerContainer.style.left = `${window.innerWidth - 400}px`;
      }
    } else {
      console.warn('Could not find emoji button for positioning');
      // Fallback positioning
      pickerContainer.style.position = 'fixed';
      pickerContainer.style.top = '50%';
      pickerContainer.style.left = '50%';
      pickerContainer.style.transform = 'translate(-50%, -50%)';
      pickerContainer.style.zIndex = '10000';
    }
    
    document.body.appendChild(pickerContainer);
    
    // Setup picker event handlers
    this.setupPickerEvents(pickerContainer);
    
    // Add click outside handler to close picker
    const handleClickOutside = (e) => {
      if (!pickerContainer.contains(e.target) && !e.target.closest('#add-emoji-btn')) {
        this.closePicker();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    
    // Add small delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    console.log('🎭 Emoji picker opened');
  }

  /**
   * Close emoji picker
   */
  closePicker() {
    this.removeExistingPicker();
    this.isOpen = false;
    console.log('🎭 Emoji picker closed');
  }

  /**
   * Remove existing picker from DOM
   */
  removeExistingPicker() {
    const existing = document.querySelector('.emoji-picker-container');
    if (existing) {
      existing.remove();
    }
  }

  /**
   * Create picker HTML
   */
  createPickerHTML() {
    return `
      <div class="emoji-picker">
        <div class="emoji-picker-header">
          <div class="emoji-picker-tabs">
            <button class="emoji-tab active" data-tab="picker">
              <i class="fas fa-smile"></i> My Emojis
            </button>
            <button class="emoji-tab" data-tab="shop">
              <i class="fas fa-shopping-cart"></i> Shop
            </button>
          </div>
          <div class="arena-gold-display">
            <i class="fas fa-coins"></i>
            <span class="arena-gold-amount">${this.userArenaGold || 0}</span>
          </div>
        </div>
        
        <div class="emoji-picker-content">
          <div class="emoji-tab-content active" data-content="picker">
            ${this.createOwnedEmojisHTML()}
          </div>
          <div class="emoji-tab-content" data-content="shop">
            <div class="shop-loading">
              <i class="fas fa-spinner fa-spin"></i> Loading shop...
            </div>
          </div>
        </div>
      </div>
    `;}

  /**
   * Create owned emojis HTML
   */
  createOwnedEmojisHTML() {
    if (this.ownedEmojis.length === 0) {
      return `
        <div class="emoji-empty-state">
          <i class="fas fa-sad-tear"></i>
          <p>No emojis owned yet!</p>
          <p>Visit the shop to purchase some emojis.</p>
        </div>
      `;}

    return `
      <div class="emoji-grid">
        ${this.ownedEmojis.map(emoji => `
          <div class="emoji-item owned" data-emoji-id="${emoji.id}" title="${emoji.name}">
            <span class="emoji-symbol">${emoji.emoji}</span>
          </div>
        `).join('')}
      </div>
    `;}

  /**
   * Create shop HTML
   */
  async createShopHTML() {
    // Use already loaded shop data if available
    if (!this.allEmojis || Object.keys(this.allEmojis).length === 0) {
      const shopData = await this.loadShopData();
      if (!shopData) {
        return `
          <div class="shop-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Failed to load the emoji shop</p>
            <p>Please try again later.</p>
          </div>
        `;}
    }

    // Debug logging
    console.log('🛍️ Creating shop HTML with data:', this.allEmojis);
    console.log('🛍️ Available tiers:', Object.keys(this.allEmojis));
    Object.keys(this.allEmojis).forEach(tierKey => {
      const tier = this.allEmojis[tierKey];
      console.log(`🛍️ ${tierKey}: ${tier ? tier.emojis.length : 'undefined'} emojis`);
    });

    const tierOrder = ['free', 'bronze', 'gold', 'amber', 'sapphire', 'champion'];
    const tierColors = {
      free: '#28a745',
      bronze: '#cd7f32',
      gold: '#ffd700',
      amber: '#ffbf00',
      sapphire: '#0f52ba',
      champion: '#ff6b35'
    };

    return `
      <div class="emoji-shop">
        ${tierOrder.map(tierKey => {
          const tier = this.allEmojis[tierKey];console.log(`🛍️ Processing tier ${tierKey}:`, tier ? `${tier.emojis.length} emojis` : 'not found');
          
          if (!tier || tier.emojis.length === 0) {
            console.log(`⚠️ Skipping ${tierKey} tier: ${!tier ? 'tier not found' : 'no emojis'}`);
            return '';}
          
          return `
            <div class="emoji-tier" data-tier="${tierKey}">
              <div class="tier-header" style="border-left: 4px solid ${tierColors[tierKey]}">
                <h3 class="tier-name">${tier.name}</h3>
                <p class="tier-description">${tier.description}</p>
              </div>
              <div class="emoji-grid shop-grid">
                ${tier.emojis.map(emoji => `
                  <div class="emoji-item shop-item ${emoji.owned ? 'owned' : ''} ${!emoji.canAfford && !emoji.owned ? 'unaffordable' : ''}" 
                       data-emoji-id="${emoji.id}"
                       title="${emoji.name} - ${emoji.price === 0 ? 'Free' : emoji.price + ' gold'}">
                    <span class="emoji-symbol">${emoji.emoji}</span>
                    <div class="emoji-info">
                      <div class="emoji-name">${emoji.name}</div>
                      <div class="emoji-price">
                        ${emoji.owned ? 
                          '<span class="owned-badge">OWNED</span>' : 
                          emoji.price === 0 ? 
                            '<span class="free-badge">FREE</span>' :
                            `<span class="price-badge">${emoji.price} <i class="fas fa-coins"></i></span>`
                        }
                      </div>
                    </div>
                    ${!emoji.owned ? `
                      <div class="emoji-actions">
                        <button class="btn-buy-emoji ${!emoji.canAfford ? 'disabled' : ''}" 
                                data-emoji-id="${emoji.id}" 
                                ${!emoji.canAfford ? 'disabled' : ''}>
                          ${emoji.price === 0 ? 'Claim' : 'Buy'}
                        </button>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `;}).join('')}
      </div>
    `;
  }

  /**
   * Setup picker event handlers
   */
  setupPickerEvents(container) {
    // Tab switching and all other actions
    container.addEventListener('click', async (e) => {
      console.log('🎭 Click event in emoji picker:', e.target);
      
      // Tab switching
      if (e.target.matches('.emoji-tab') || e.target.closest('.emoji-tab')) {
        const tabButton = e.target.closest('.emoji-tab') || e.target;
        const tab = tabButton.dataset.tab;
        console.log('🎭 Switching to tab:', tab);
        await this.switchTab(tab, container);
        return;}
      
      // Emoji selection (owned emojis)
      if (e.target.closest('.emoji-item.owned') && !e.target.closest('.btn-buy-emoji')) {
        const emojiItem = e.target.closest('.emoji-item');
        const emojiId = emojiItem.dataset.emojiId;
        console.log('🎭 Selecting emoji:', emojiId);
        this.insertEmoji(emojiId);
        return;}
      
      // Buy emoji button
      if (e.target.matches('.btn-buy-emoji') || e.target.closest('.btn-buy-emoji')) {
        e.stopPropagation();
        const button = e.target.closest('.btn-buy-emoji') || e.target;
        const emojiId = button.dataset.emojiId;
        console.log('🎭 Purchasing emoji:', emojiId);
        await this.purchaseEmoji(emojiId, button);
        return;}
    });
  }

  /**
   * Switch between picker and shop tabs
   */
  async switchTab(tab, container) {
    console.log(`🎭 Switching to tab: ${tab}`);
    
    // Update tab buttons
    container.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
    container.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Update tab content
    container.querySelectorAll('.emoji-tab-content').forEach(c => c.classList.remove('active'));
    const content = container.querySelector(`[data-content="${tab}"]`);
    content.classList.add('active');
    
    // Load data and refresh content based on tab
    if (tab === 'shop') {
      console.log('🛍️ Loading shop data...');
      await this.loadShopData();
      const shopHTML = await this.createShopHTML();
      content.innerHTML = shopHTML;
    } else if (tab === 'picker') {
      console.log('😊 Loading owned emojis...');
      await this.loadOwnedEmojis();
      content.innerHTML = this.createOwnedEmojisHTML();
    }
    
    this.currentMode = tab;
    console.log(`✅ Switched to ${tab} tab`);
  }

  /**
   * Refresh the "My Emojis" picker tab content
   */
  refreshPickerTab() {
    const pickerContent = document.querySelector('[data-content="picker"]');
    if (pickerContent) {
      pickerContent.innerHTML = this.createOwnedEmojisHTML();
      console.log('🔄 Refreshed "My Emojis" tab with updated owned emojis');
    }
  }

  /**
   * Update arena gold displays across the UI
   */
  updateArenaGoldDisplays() {
    // Update emoji picker arena gold display
    const arenaGoldElement = document.querySelector('.arena-gold-amount');
    if (arenaGoldElement) {
      arenaGoldElement.textContent = this.userArenaGold;
    }
    
    // Update profile page arena gold display
    const profileArenaElement = document.getElementById('arena-gold');
    if (profileArenaElement) {
      profileArenaElement.textContent = this.userArenaGold.toLocaleString();
    }
    
    // Update dashboard arena gold display (if exists)
    const dashboardArenaElement = document.querySelector('#arena-gold');
    if (dashboardArenaElement && dashboardArenaElement !== profileArenaElement) {
      dashboardArenaElement.textContent = this.userArenaGold.toLocaleString();
    }
    
    // Update any other arena gold displays
    const allArenaElements = document.querySelectorAll('[data-arena-gold]');
    allArenaElements.forEach(element => {
      element.textContent = this.userArenaGold.toLocaleString();
    });
    
    console.log(`💰 Updated arena gold displays to: ${this.userArenaGold}`);
  }

  /**
   * Insert emoji into chat
   */
  insertEmoji(emojiId) {
    const emoji = this.ownedEmojis.find(e => e.id === emojiId);
    if (emoji) {
      // Use stored chat input reference
      if (this.chatInputElement) {
        const currentValue = this.chatInputElement.value;
        const cursorPos = this.savedCursorPosition;
        const beforeText = currentValue.substring(0, cursorPos);
        const afterText = currentValue.substring(cursorPos);
        
        this.chatInputElement.value = beforeText + emoji.emoji + afterText;
        this.chatInputElement.focus();
        
        // Set cursor position after emoji
        const newPos = cursorPos + emoji.emoji.length;
        this.chatInputElement.setSelectionRange(newPos, newPos);
        
        console.log(`😊 Inserted emoji: ${emoji.emoji} (${emoji.name}) at position ${cursorPos}`);
      }
    }
    
    this.closePicker();
  }

  /**
   * Purchase emoji
   */
  async purchaseEmoji(emojiId, button) {
    try {
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      button.disabled = true;
      
      const response = await this.api.post('/api/emojis/purchase', { emojiId });
      
      if (response.success) {
        // Update user's arena gold
        this.userArenaGold = response.data.remainingArenaGold;
        
        // Update all arena gold displays across the UI
        this.updateArenaGoldDisplays();
        
        // Reload owned emojis
        await this.loadOwnedEmojis();
        
        // Refresh the "My Emojis" tab content
        this.refreshPickerTab();
        
        // Show success message
        this.chatManager.showNotification(response.message, 'success');
        
        // Update the shop item to show as owned
        const shopItem = button.closest('.emoji-item');
        shopItem.classList.add('owned');
        shopItem.querySelector('.emoji-actions').innerHTML = '<span class="owned-badge">OWNED</span>';
        
        console.log(`✅ Purchased emoji: ${emojiId}`);
      } else {
        this.chatManager.showNotification(response.message, 'error');
      }
    } catch (error) {
      console.error('❌ Error purchasing emoji:', error);
      this.chatManager.showNotification('Failed to purchase emoji', 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}

export default EmojiPicker; 