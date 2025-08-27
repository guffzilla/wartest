/**
 * TOWN HALL MODAL MANAGER
 * Provides unified, full-screen modals for all town hall sections
 * with navigation arrows and consistent styling
 */

class TownHallModalManager {
  constructor() {
    this.currentSectionIndex = 0;
    this.sections = [];
    this.currentModalId = null;
    this.isInitialized = false;
    this.isModalOperationInProgress = false; // Flag to prevent race conditions
    
    // Define the order of town hall sections (visual layout order - left to right, top to bottom)
    this.sectionOrder = [
      { id: 'about-me', title: 'About Me', icon: 'fa-user', position: 1 },
      { id: 'hero-tier', title: 'Hero Tier', icon: 'fa-crown', position: 2 },
      { id: 'content-creator', title: 'Content Creator', icon: 'fa-video', position: 3 },
      { id: 'player-names', title: 'Barracks', icon: 'fa-fort-awesome', position: 4 },
      { id: 'clan-management', title: 'Clan Encampment', icon: 'fa-campground', position: 5 },
      { id: 'campaign', title: 'War Table', icon: 'fa-flag', position: 6 },
      { id: 'achievements', title: 'Achievements', icon: 'fa-trophy', position: 7 },
      { id: 'cartography', title: 'Cartography', icon: 'fa-map', position: 8 }
    ];
    
    this.init();
  }

  /**
   * Initialize the town hall modal manager
   */
  init() {
    if (this.isInitialized) return;if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
        this.setupLayoutChangeDetection(); // Enable dynamic layout detection
        // Wait for profile section manager to finish initializing
        this.waitForProfileSectionManager();
        this.isInitialized = true;
        // TownHallModalManager initialized after DOMContentLoaded
      });
    } else {
      this.setupEventListeners();
      this.setupLayoutChangeDetection(); // Enable dynamic layout detection
      // Wait for profile section manager to finish initializing
      this.waitForProfileSectionManager();
      this.isInitialized = true;
              // TownHallModalManager initialized immediately
    }
  }

  /**
   * Wait for profile section manager to finish initializing
   */
  waitForProfileSectionManager() {
    const checkProfileSectionManager = () => {
      // Check if profile section manager is available and has finished initializing
      if (window.profileSectionManager && window.profileSectionManager.container) {
        // Wait longer for the section positioning to complete
        setTimeout(() => {
          this.verifySectionsWithRetry();
        }, 1000); // Increased delay to ensure section positioning is complete
        
        return;}
      
      // Check if sections are already available
      const sections = document.querySelectorAll('.section-modal-trigger');
      if (sections.length >= 8) {
        setTimeout(() => {
          this.verifySectionsWithRetry();
        }, 500); // Increased delay
        return;}
      
      // Keep checking
      setTimeout(checkProfileSectionManager, 200);
    };
    
    checkProfileSectionManager();
    
    // Also listen for any custom events that might indicate manager completion
    document.addEventListener('profileSectionManagerReady', () => {
      setTimeout(() => {
        this.verifySectionsWithRetry();
      }, 100);
    });
    
    // Listen for when profile section manager has finished positioning sections
    document.addEventListener('profileSectionManagerPositioned', (event) => {
      setTimeout(() => {
        this.verifySectionsWithRetry();
      }, 100);
    });
    
    // Also create buttons when profile section manager is ready
    document.addEventListener('profileSectionManagerReady', () => {
      setTimeout(() => {
        this.createModalOpenButtons();
      }, 500);
    });
    
    // Listen for when all sections are positioned
    const checkSectionsPositioned = () => {
      const sections = document.querySelectorAll('.section-modal-trigger[data-position]');
      if (sections.length >= 8) {
        this.verifySectionsWithRetry();
      } else {
        setTimeout(checkSectionsPositioned, 100);
      }
    };
    
    // Start checking for positioned sections
    setTimeout(checkSectionsPositioned, 1000); // Increased delay
    
    // Fallback: Create buttons after a longer delay to ensure everything is loaded
    setTimeout(() => {
      this.createModalOpenButtons();
    }, 3000);
  }

  /**
   * Verify sections with retry mechanism
   */
  verifySectionsWithRetry(maxRetries = 5, delay = 1000) {
    const attemptVerification = (attempt) => {
      this.verifySections();
      
      // Check if we found all sections
      const foundSections = this.sectionOrder.filter(section => 
        document.querySelector(`[data-section="${section.id}"]`)
      ).length;
      
      if (foundSections === this.sectionOrder.length) {
        this.displayFinalSectionStatus();
        return;}
      
      if (attempt < maxRetries) {
        setTimeout(() => attemptVerification(attempt + 1), delay);
      } else {
        console.error(`❌ Failed to find all sections after ${maxRetries} attempts. Only found ${foundSections}/${this.sectionOrder.length}`);
        this.debugMissingSections();
        this.displayFinalSectionStatus();
      }
    };
    
    attemptVerification(1);
  }
  
  /**
   * Display final section status for debugging
   */
  displayFinalSectionStatus() {
    // Final section status display (development only)
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
      const totalFound = this.sectionOrder.filter(section => 
        document.querySelector(`[data-section="${section.id}"]`)
      ).length;
      
      if (totalFound !== this.sectionOrder.length) {
        console.warn(`⚠️ Only ${totalFound}/${this.sectionOrder.length} sections found`);
      }
    }
  }

  /**
   * Verify all sections exist on the page
   */
  verifySections() {
    // First, let's see what sections are actually on the page
    const allSectionsOnPage = document.querySelectorAll('[data-section]');
    
    let foundSections = 0;
    const foundSectionIds = [];
    const missingSectionIds = [];
    
    this.sectionOrder.forEach((section, index) => {
      const element = document.querySelector(`[data-section="${section.id}"]`);
      if (element) {
        foundSections++;
        foundSectionIds.push(section.id);
      } else {
        missingSectionIds.push(section.id);
      }
    });
    
    if (foundSections !== this.sectionOrder.length) {
      console.error(`❌ Missing ${this.sectionOrder.length - foundSections} sections!`);
    }
    
    // Also verify the visual layout order
    this.verifyVisualLayoutOrder();
    
    // Create modal open buttons for all sections
    this.createModalOpenButtons();
  }

  /**
   * Verify the visual layout order matches our expected order
   */
  verifyVisualLayoutOrder() {
    // Get all sections with their positions
    const sections = document.querySelectorAll('.section-modal-trigger[data-position]');
    const visualOrder = Array.from(sections)
      .map(section => ({
        id: section.dataset.section,
        position: parseInt(section.dataset.position),
        title: section.querySelector('.section-title span')?.textContent || 'Unknown'
      }))
      .sort((a, b) => a.position - b.position);
    
    // Check if our order matches the visual order
    const ourOrder = this.sectionOrder.map(s => s.id);
    const visualOrderIds = visualOrder.map(s => s.id);
    
    if (JSON.stringify(ourOrder) !== JSON.stringify(visualOrderIds)) {
      // Update our order to match the visual layout
      this.updateSectionOrderToMatchVisual(visualOrder);
    }
  }

  /**
   * Create modal open buttons for all profile sections
   */
  createModalOpenButtons() {
    console.log('🔘 Creating modal open buttons for profile sections...');
    console.log('🔍 Section order:', this.sectionOrder.map(s => s.id));
    
    let buttonsCreated = 0;
    
    this.sectionOrder.forEach(section => {
      console.log(`🔍 Looking for section: ${section.id}`);
      const sectionElement = document.querySelector(`[data-section="${section.id}"]`);
      if (sectionElement) {
        console.log(`✅ Found section element for ${section.id}`);
        const sectionControls = sectionElement.querySelector('.section-controls');
        if (sectionControls) {
          console.log(`✅ Found section controls for ${section.id}`);
          // Check if button already exists to avoid duplicates
          if (!sectionControls.querySelector('.modal-open-btn')) {
            const modalOpenBtn = document.createElement('button');
            modalOpenBtn.className = 'modal-open-btn';
            modalOpenBtn.innerHTML = `<i class="fas fa-external-link-alt"></i>`;
            modalOpenBtn.title = `Open ${section.title}`;
            
            // Add click event to open the modal
            modalOpenBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.openSectionModal(sectionElement);
            });
            
            sectionControls.appendChild(modalOpenBtn);
            buttonsCreated++;
            console.log(`✅ Created modal open button for ${section.title}`);
          } else {
            console.log(`ℹ️ Modal open button already exists for ${section.title}`);
          }
        } else {
          console.warn(`⚠️ No .section-controls found for ${section.id}`);
          console.log(`🔍 Section element HTML:`, sectionElement.outerHTML.substring(0, 200));
        }
      } else {
        console.warn(`⚠️ Section element not found for ${section.id}`);
      }
    });
    
    console.log(`✅ Modal open buttons creation complete. Created: ${buttonsCreated}, Total sections: ${this.sectionOrder.length}`);
  }

  /**
   * Update section order to match the actual visual layout on the page
   */
  updateSectionOrderToMatchVisual(visualOrder) {
    console.log('🔄 Updating section order to match visual layout...');
    
    // Create new section order based on visual layout - REORDER THE ARRAY ITSELF
    this.sectionOrder = visualOrder.map(visualSection => {
      const originalSection = this.sectionOrder.find(s => s.id === visualSection.id);
      return {
        ...originalSection,
        position: visualSection.position
      };});
    
    console.log('✅ Updated section order:', this.sectionOrder.map(s => `${s.position}: ${s.title}`));
    console.log('🔄 Array order now matches visual layout order!');
    
    // Display the visual grid layout
    this.displayVisualGridLayout();
  }

  /**
   * Display the visual grid layout structure
   */
  displayVisualGridLayout() {
    console.log('🎯 Visual Grid Layout Structure:');
    console.log('┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐');
    console.log('│ Position 1      │ Position 2      │ Position 3      │ Position 4      │');
    console.log('│ About Me        │ Hero Tier       │ Content Creator │ Player Names    │');
    console.log('├─────────────────┼─────────────────┼─────────────────┼─────────────────┤');
    console.log('│ Position 5      │ Position 6      │ Position 7      │ Position 8      │');
    console.log('│ Clan Management │ Campaign        │ Achievements    │ Cartography     │');
    console.log('└─────────────────┴─────────────────┴─────────────────┴─────────────────┘');
    
    // Show the actual order we're using for navigation
    console.log('🔄 Navigation Order (Left to Right, Top to Bottom):');
    this.sectionOrder.forEach((section, index) => {
      console.log(`${index + 1}. ${section.title} (${section.id})`);
    });
  }

  /**
   * Setup event listeners for section modal triggers
   */
  setupEventListeners() {
    console.log('🎧 Setting up TownHallModalManager event listeners...');
    
    // REMOVED: Direct click listener for section modal triggers
    // This was causing conflicts with draggable grid's drag state tracking
    // Section clicks are now handled by draggable grid with proper drag state checking

    // Setup unified modal close listeners for arrow cleanup
    this.setupUnifiedModalCloseListeners();

    // Listen for keyboard navigation
    document.addEventListener('keydown', (e) => {
      try {
        if (this.currentModalId && this.isModalOpen()) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.navigateToPreviousSection();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.navigateToNextSection();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            // Let ModalManager handle closing on ESC to avoid double-close and state flags
            if (window.ModalManager && typeof window.ModalManager.closeTopModal === 'function') {
              window.ModalManager.closeTopModal();
            } else {
              this.closeCurrentModal();
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in keyboard navigation handler:', error);
      }
    });
    
    // REMOVED: beforeunload event listener that was causing arrows to disappear
    // This was triggering cleanup when the page was being unloaded, but it was
    // interfering with normal modal operation. Arrows should only be cleaned up
    // when the modal is actually closed, not on page unload.
    
    // REMOVED: visibility change event listener that was causing arrows to disappear
    // Arrows are now tied directly to modal visibility
    
    // TownHallModalManager event listeners setup complete
  }

  /**
   * Open a section modal
   */
  openSectionModal(sectionElement) {
    // Prevent multiple simultaneous modal operations
    if (this.isModalOperationInProgress) {
      return;}
    
    if (!sectionElement) {
      return;}
    
    const sectionId = sectionElement.dataset.section;
    const sectionIndex = this.sectionOrder.findIndex(s => s.id === sectionId);
    
    if (sectionIndex === -1) {
      console.error('❌ Unknown section:', sectionId);
      return;}
    
    this.currentSectionIndex = sectionIndex;
    this.createUnifiedModal(sectionElement, sectionId);
  }

  /**
   * Create the unified town hall modal
   */
  createUnifiedModal(sectionElement, sectionId) {
    // Set flag to prevent race conditions
    this.isModalOperationInProgress = true;
    
    const section = this.sectionOrder[this.currentSectionIndex];
    
    const content = sectionElement.querySelector('.section-content');
    
    if (!content) {
      console.error('❌ No section content found');
      return;}

    // Close any existing modal only if it's actually in the DOM
    if (this.currentModalId && document.getElementById(this.currentModalId)) {
      this.closeCurrentModal();
    } else if (this.currentModalId) {
      // Clear stale references without triggering cleanup
      this.currentModalId = null;
      this.leftArrow = null;
      this.rightArrow = null;
      this.navStatusElement = null;
    }

    // Generate unique modal ID
    this.currentModalId = `townhall-modal-${sectionId}-${Date.now()}`;

    // Create modal content with unified styling
    const modalContent = this.createUnifiedModalContent(section, content);
    
    // Use ModalManager to create the modal
    if (window.ModalManager && typeof window.ModalManager.createModal === 'function') {
      window.ModalManager.createModal({
        id: this.currentModalId,
        title: section.title,
        icon: section.icon,
        content: () => modalContent,
        styles: {
          container: 'townhall-unified-modal',
          header: 'townhall-unified-header',
          title: 'townhall-unified-title',
          content: 'townhall-unified-content'
        },
        // Do not allow backdrop clicks to close; only Close button or ESC
        backdropClose: false,
        onOpen: (modal) => {
          this.setupModalNavigation(modal, sectionId);
          this.initializeSectionContent(modal, sectionId);
          
          // Clear the operation flag once modal is fully open
          this.isModalOperationInProgress = false;
        },
        onClose: () => {
          // REMOVED: Setting currentModalId to null here
          // This was causing currentModalId to be null when closeCurrentModal() runs
          // currentModalId should only be set to null in closeCurrentModal() after cleanup
        }
      });
    } else {
      console.error('❌ ModalManager not available');
      // Clear the operation flag on error
      this.isModalOperationInProgress = false;
    }
  }

  /**
   * Create unified modal content with navigation arrows
   */
  createUnifiedModalContent(section, originalContent) {
    console.log('🏗️ Creating unified modal content...');
    
    const container = document.createElement('div');
    container.className = 'townhall-modal-container';
    
    // Clone the original content
    const clonedContent = originalContent.cloneNode(true);
    
    // Create navigation arrows
    console.log('⬅️ Creating left navigation arrow...');
    const leftArrow = this.createNavigationArrow('left', 'Previous Section');
    console.log('➡️ Creating right navigation arrow...');
    const rightArrow = this.createNavigationArrow('right', 'Next Section');
    
    // Add navigation arrows to container
    container.appendChild(clonedContent);
    
    // Store arrow references for later positioning
    this.leftArrow = leftArrow;
    this.rightArrow = rightArrow;
    
    // IMMEDIATELY append arrows to body to ensure they're visible
    console.log('⬅️ Immediately appending left arrow to body...');
    document.body.appendChild(leftArrow);
    
    console.log('➡️ Immediately appending right arrow to body...');
    document.body.appendChild(rightArrow);
    
    // Force visibility with inline styles
    leftArrow.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 0px !important;
      transform: translateY(-50%) !important;
      width: 80px !important;
      height: 160px !important;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.9) 0%, rgba(212, 175, 55, 0.6) 100%) !important;
      border: 3px solid rgba(212, 175, 55, 1) !important;
      border-radius: 40px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      backdrop-filter: blur(15px) !important;
      box-shadow: 0 8px 32px rgba(212, 175, 55, 0.6) !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    `;
    
    rightArrow.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      right: 0px !important;
      transform: translateY(-50%) !important;
      width: 80px !important;
      height: 160px !important;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.9) 0%, rgba(212, 175, 55, 0.6) 100%) !important;
      border: 3px solid rgba(212, 175, 55, 1) !important;
      border-radius: 40px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      backdrop-filter: blur(15px) !important;
      box-shadow: 0 8px 32px rgba(212, 175, 55, 0.6) !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    `;
    
    console.log('✅ Unified modal content created with arrows:', {
      leftArrow: !!this.leftArrow,
      rightArrow: !!this.rightArrow,
      containerClass: container.className
    });
    
    // Debug: Check if arrows are properly stored and in DOM
    console.log('🔍 Arrow storage and DOM check:');
    console.log('  - this.leftArrow:', !!this.leftArrow);
    console.log('  - this.rightArrow:', !!this.rightArrow);
    console.log('  - leftArrow in DOM:', document.body.contains(leftArrow));
    console.log('  - rightArrow in DOM:', document.body.contains(rightArrow));
    console.log('  - Total arrows in DOM:', document.querySelectorAll('.townhall-nav-arrow').length);
    
    return container;}

  /**
   * Create emergency arrows when normal arrows fail to appear
   */
  createEmergencyArrows() {
    console.log('🚨 Creating emergency navigation arrows...');
    
    // Remove any existing arrows
    const existingArrows = document.querySelectorAll('.townhall-nav-arrow');
    existingArrows.forEach(arrow => arrow.remove());
    
    // Create emergency left arrow
    const leftArrow = document.createElement('div');
    leftArrow.className = 'townhall-nav-arrow townhall-nav-arrow-left emergency-arrow';
    leftArrow.innerHTML = `
      <i class="fas fa-chevron-left" style="font-size: 2rem; margin-bottom: 0.5rem; color: #d4af37;"></i>
      <div style="color: #d4af37; font-size: 0.75rem; font-weight: 600; text-align: center;">PREV</div>
    `;
    leftArrow.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 0px !important;
      transform: translateY(-50%) !important;
      width: 80px !important;
      height: 160px !important;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.9) 0%, rgba(212, 175, 55, 0.6) 100%) !important;
      border: 3px solid #d4af37 !important;
      border-radius: 40px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      color: #d4af37 !important;
      font-weight: bold !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    `;
    
    // Create emergency right arrow
    const rightArrow = document.createElement('div');
    rightArrow.className = 'townhall-nav-arrow townhall-nav-arrow-right emergency-arrow';
    rightArrow.innerHTML = `
      <i class="fas fa-chevron-right" style="font-size: 2rem; margin-bottom: 0.5rem; color: #d4af37;"></i>
      <div style="color: #d4af37; font-size: 0.75rem; font-weight: 600; text-align: center;">NEXT</div>
    `;
    rightArrow.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      right: 0px !important;
      transform: translateY(-50%) !important;
      width: 80px !important;
      height: 160px !important;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.9) 0%, rgba(212, 175, 55, 0.6) 100%) !important;
      border: 3px solid #d4af37 !important;
      border-radius: 40px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      color: #d4af37 !important;
      font-weight: bold !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    `;
    
    // Add click handlers
    leftArrow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('⬅️ Emergency left arrow clicked');
      this.navigateToPreviousSection();
    });
    
    rightArrow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('➡️ Emergency right arrow clicked');
      this.navigateToNextSection();
    });
    
    // Append to body
    document.body.appendChild(leftArrow);
    document.body.appendChild(rightArrow);
    
    // Store references
    this.leftArrow = leftArrow;
    this.rightArrow = rightArrow;
    
    console.log('✅ Emergency arrows created and appended to body');
    console.log('🔍 Emergency arrows in DOM:', document.querySelectorAll('.emergency-arrow').length);
    
    return { leftArrow, rightArrow };}

  /**
   * Test function to manually create and display navigation arrows
   */
  testNavigationArrows() {
    console.log('🧪 Testing navigation arrows...');
    
    // Remove any existing test arrows
    const existingTestArrows = document.querySelectorAll('.test-nav-arrow');
    existingTestArrows.forEach(arrow => arrow.remove());
    
    // Create test arrows
    const leftArrow = document.createElement('div');
    leftArrow.className = 'townhall-nav-arrow townhall-nav-arrow-left test-nav-arrow';
    leftArrow.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 5px !important;
      transform: translateY(-50%) !important;
      width: 80px !important;
      height: 160px !important;
      background: linear-gradient(135deg, rgba(255, 0, 0, 0.8) 0%, rgba(255, 0, 0, 0.4) 100%) !important;
      border: 3px solid red !important;
      border-radius: 40px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      color: white !important;
      font-weight: bold !important;
    `;
    leftArrow.innerHTML = '<i class="fas fa-chevron-left" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><div>LEFT TEST</div>';
    
    const rightArrow = document.createElement('div');
    rightArrow.className = 'townhall-nav-arrow townhall-nav-arrow-right test-nav-arrow';
    rightArrow.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      right: 5px !important;
      transform: translateY(-50%) !important;
      width: 80px !important;
      height: 160px !important;
      background: linear-gradient(135deg, rgba(0, 255, 0, 0.8) 0%, rgba(0, 255, 0, 0.4) 100%) !important;
      border: 3px solid green !important;
      border-radius: 40px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      color: white !important;
      font-weight: bold !important;
    `;
    rightArrow.innerHTML = '<i class="fas fa-chevron-right" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><div>RIGHT TEST</div>';
    
    // Add click handlers
    leftArrow.addEventListener('click', () => {
      console.log('🧪 Left test arrow clicked');
      alert('Left test arrow clicked!');
    });
    
    rightArrow.addEventListener('click', () => {
      console.log('🧪 Right test arrow clicked');
      alert('Right test arrow clicked!');
    });
    
    // Append to body
    document.body.appendChild(leftArrow);
    document.body.appendChild(rightArrow);
    
    console.log('✅ Test arrows created and appended to body');
    console.log('🔍 Test arrows in DOM:', document.querySelectorAll('.test-nav-arrow').length);
    
    return { leftArrow, rightArrow };}

  /**
   * Create navigation arrow element
   */
  createNavigationArrow(direction, title) {
    console.log(`🎯 Creating ${direction} navigation arrow...`);
    
    const arrow = document.createElement('div');
    arrow.className = `townhall-nav-arrow townhall-nav-arrow-${direction}`;
    arrow.setAttribute('title', title);
    
    // Add explicit styles to ensure visibility with higher z-index and better positioning
    arrow.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      ${direction === 'left' ? 'left: 0px' : 'right: 0px'} !important;
      transform: translateY(-50%) !important;
      width: 80px !important;
      height: 160px !important;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.8) 0%, rgba(212, 175, 55, 0.4) 100%) !important;
      border: 3px solid rgba(212, 175, 55, 0.8) !important;
      border-radius: 40px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      backdrop-filter: blur(15px) !important;
      box-shadow: 0 8px 32px rgba(212, 175, 55, 0.4) !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    `;
    
    const icon = document.createElement('i');
    icon.className = `fas fa-chevron-${direction === 'left' ? 'left' : 'right'}`;
    icon.style.cssText = `
      color: #d4af37 !important;
      font-size: 2rem !important;
      text-shadow: 0 0 15px rgba(212, 175, 55, 0.7) !important;
      margin-bottom: 0.5rem !important;
    `;
    
    // Create section label
    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'section-label';
    sectionLabel.style.cssText = `
      color: #d4af37 !important;
      font-size: 0.75rem !important;
      font-weight: 600 !important;
      text-align: center !important;
      text-shadow: 0 0 10px rgba(212, 175, 55, 0.8) !important;
      max-width: 60px !important;
      line-height: 1.2 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    `;
    
    // Add icon and label to arrow
    arrow.appendChild(icon);
    arrow.appendChild(sectionLabel);
    
    // Add click handler
    arrow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`${direction} arrow clicked`);
      if (direction === 'left') {
        this.navigateToPreviousSection();
      } else {
        this.navigateToNextSection();
      }
    });
    
    console.log(`✅ ${direction} arrow created with classes: ${arrow.className}`);
    console.log(`🔍 ${direction} arrow styles:`, arrow.style.cssText);
    return arrow;}

  /**
   * Setup modal navigation functionality
   */
  setupModalNavigation(modal, sectionId) {
    console.log('🎯 [TRACE] setupModalNavigation() called');
    console.log('📅 [TRACE] Timestamp:', new Date().toISOString());
    console.log('🔍 [TRACE] Modal element:', modal);
    console.log('🔍 [TRACE] Section ID:', sectionId);
    console.log('🆔 [TRACE] Current modal ID:', this.currentModalId);
    
    // Check if arrows already exist and are in DOM
    const existingArrows = document.querySelectorAll('.townhall-nav-arrow');
    console.log(`🔍 [TRACE] Found ${existingArrows.length} existing arrows in DOM`);
    
    if (existingArrows.length === 0) {
      console.log('🔄 [TRACE] No existing arrows found, creating fresh navigation arrows...');
      console.log('🏗️ [TRACE] Calling createNavigationArrow("left")');
      this.leftArrow = this.createNavigationArrow('left', 'Previous Section');
      console.log('✅ [TRACE] createNavigationArrow("left") completed');
      console.log('🏗️ [TRACE] Calling createNavigationArrow("right")');
      this.rightArrow = this.createNavigationArrow('right', 'Next Section');
      console.log('✅ [TRACE] createNavigationArrow("right") completed');
      
      // Append navigation arrows to body for proper positioning
      if (this.leftArrow) {
        console.log('⬅️ [TRACE] Appending left arrow to body...');
        document.body.appendChild(this.leftArrow);
        
        // Force visibility with inline styles and higher z-index
        this.leftArrow.style.cssText = `
          position: fixed !important;
          top: 50% !important;
          left: 0px !important;
          transform: translateY(-50%) !important;
          width: 80px !important;
          height: 160px !important;
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.9) 0%, rgba(212, 175, 55, 0.6) 100%) !important;
          border: 3px solid rgba(212, 175, 55, 1) !important;
          border-radius: 40px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          z-index: 999999 !important;
          backdrop-filter: blur(15px) !important;
          box-shadow: 0 8px 32px rgba(212, 175, 55, 0.6) !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        `;
        
        console.log('✅ [TRACE] Left arrow appended and styled');
        console.log('🔍 [TRACE] Left arrow in DOM:', document.body.contains(this.leftArrow));
      } else {
        console.error('❌ [TRACE] Left arrow not available');
      }
      
      if (this.rightArrow) {
        console.log('➡️ [TRACE] Appending right arrow to body...');
        document.body.appendChild(this.rightArrow);
        
        // Force visibility with inline styles and higher z-index
        this.rightArrow.style.cssText = `
          position: fixed !important;
          top: 50% !important;
          right: 0px !important;
          transform: translateY(-50%) !important;
          width: 80px !important;
          height: 160px !important;
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.9) 0%, rgba(212, 175, 55, 0.6) 100%) !important;
          border: 3px solid rgba(212, 175, 55, 1) !important;
          border-radius: 40px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          z-index: 999999 !important;
          backdrop-filter: blur(15px) !important;
          box-shadow: 0 8px 32px rgba(212, 175, 55, 0.6) !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        `;
        
        console.log('✅ [TRACE] Right arrow appended and styled');
        console.log('🔍 [TRACE] Right arrow in DOM:', document.body.contains(this.rightArrow));
      } else {
        console.error('❌ [TRACE] Right arrow not available');
      }
    } else {
      console.log('✅ [TRACE] Using existing arrows in DOM');
      // Use existing arrows
      this.leftArrow = document.querySelector('.townhall-nav-arrow-left');
      this.rightArrow = document.querySelector('.townhall-nav-arrow-right');
      
      console.log('🔍 [TRACE] Left arrow found:', !!this.leftArrow);
      console.log('🔍 [TRACE] Right arrow found:', !!this.rightArrow);
      
      // Ensure they're visible
      if (this.leftArrow) {
        console.log('🔄 [TRACE] Forcing left arrow visibility');
        this.leftArrow.style.opacity = '1';
        this.leftArrow.style.visibility = 'visible';
        this.leftArrow.style.pointerEvents = 'auto';
      }
      if (this.rightArrow) {
        console.log('🔄 [TRACE] Forcing right arrow visibility');
        this.rightArrow.style.opacity = '1';
        this.rightArrow.style.visibility = 'visible';
        this.rightArrow.style.pointerEvents = 'auto';
      }
    }
    
    // Add navigation status display
    console.log('🏗️ [TRACE] Calling addNavigationStatus()');
    this.addNavigationStatus(modal);
    console.log('✅ [TRACE] addNavigationStatus() completed');
    
    // Update arrow states
    console.log('🔄 [TRACE] Calling updateNavigationArrows()');
                      this.updateNavigationArrows();
                  console.log('✅ [TRACE] updateNavigationArrows() completed');
                  
                  console.log('✅ [TRACE] Modal navigation setup complete');
    
    // Debug: Check if arrows are in DOM after a short delay
    setTimeout(() => {
      console.log('🔍 [TRACE] Delayed arrow check (100ms)...');
      const arrowsInDOM = document.querySelectorAll('.townhall-nav-arrow');
      console.log('🔍 [TRACE] Arrows in DOM after setup:', arrowsInDOM.length);
      
      if (arrowsInDOM.length === 0) {
        console.log('⚠️ [TRACE] No arrows found in DOM after delay, creating emergency arrows');
        this.createEmergencyArrows();
      } else {
        console.log('✅ [TRACE] Arrows confirmed in DOM after delay');
        arrowsInDOM.forEach((arrow, index) => {
          console.log(`🔍 [TRACE] Arrow ${index + 1}:`, {
            classes: arrow.className,
            display: arrow.style.display,
            visibility: arrow.style.visibility,
            opacity: arrow.style.opacity,
            zIndex: arrow.style.zIndex,
            position: arrow.style.position,
            left: arrow.style.left,
            right: arrow.style.right,
            top: arrow.style.top,
            transform: arrow.style.transform
          });
        });
      }
    }, 100);
    
    // Additional check after longer delay
    setTimeout(() => {
      console.log('🔍 [TRACE] Extended arrow check (500ms)...');
      const arrowsInDOM = document.querySelectorAll('.townhall-nav-arrow');
      console.log('🔍 [TRACE] Arrows in DOM after extended delay:', arrowsInDOM.length);
      
      if (arrowsInDOM.length === 0) {
        console.log('⚠️ [TRACE] No arrows found in DOM after extended delay');
      } else {
        console.log('✅ [TRACE] Arrows still in DOM after extended delay');
      }
    }, 500);
  }

  /**
   * Ensure navigation arrows remain visible
   */
  ensureArrowsVisible() {
    console.log('👁️ Ensuring arrows remain visible...');
    
    const arrows = document.querySelectorAll('.townhall-nav-arrow');
    console.log(`🔍 Found ${arrows.length} arrows to ensure visibility`);
    
    arrows.forEach((arrow, index) => {
      const computedStyle = window.getComputedStyle(arrow);
      console.log(`  Arrow ${index + 1} visibility check:`, {
        opacity: computedStyle.opacity,
        visibility: computedStyle.visibility,
        display: computedStyle.display,
        zIndex: computedStyle.zIndex
      });
      
      // ALWAYS force visibility - no conditions
      console.log(`  🔧 FORCING visibility for arrow ${index + 1}`);
      arrow.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        ${arrow.classList.contains('townhall-nav-arrow-left') ? 'left: 0px !important;' : 'right: 0px !important;'}
        transform: translateY(-50%) !important;
        width: 80px !important;
        height: 160px !important;
        background: linear-gradient(135deg, rgba(212, 175, 55, 0.8) 0%, rgba(212, 175, 55, 0.4) 100%) !important;
        border: 3px solid rgba(212, 175, 55, 0.8) !important;
        border-radius: 40px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        z-index: 999999 !important;
        backdrop-filter: blur(15px) !important;
        box-shadow: rgba(212, 175, 55, 0.4) 0px 8px 32px !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      `;
    });
    
    // If no arrows found, create emergency arrows
    if (arrows.length === 0) {
      console.log('🚨 No arrows found, creating emergency arrows...');
      this.createEmergencyArrows();
    }
  }



  /**
   * Add navigation status display to modal
   */
  addNavigationStatus(modal) {
    // Remove existing status if any
    const existingStatus = document.querySelector('.townhall-nav-status');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'townhall-nav-status';
    
    const navInfo = document.createElement('div');
    navInfo.className = 'nav-info';
    navInfo.innerHTML = `<i class="fas fa-compass"></i> <span>Navigation Active</span>`;
    
    const navKeys = document.createElement('div');
    navKeys.className = 'nav-keys';
    navKeys.innerHTML = `
      <span>Use:</span>
      <kbd>←</kbd> <span>Previous</span>
      <kbd>→</kbd> <span>Next</span>
      <kbd>ESC</kbd> <span>Close</span>
    `;
    
    statusDiv.appendChild(navInfo);
    statusDiv.appendChild(navKeys);
    
    document.body.appendChild(statusDiv);
    
    // Store reference for removal
    this.navStatusElement = statusDiv;
  }

  /**
   * Navigate to the previous section
   */
  navigateToPreviousSection() {
    // Wrap-around: if at first, go to last
    if (this.sectionOrder.length === 0) return;if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
    } else {
      this.currentSectionIndex = this.sectionOrder.length - 1;
    }
    this.navigateToSection(this.currentSectionIndex);
  }

  /**
   * Navigate to the next section
   */
  navigateToNextSection() {
    // Wrap-around: if at last, go to first
    if (this.sectionOrder.length === 0) return;if (this.currentSectionIndex < this.sectionOrder.length - 1) {
      this.currentSectionIndex++;
    } else {
      this.currentSectionIndex = 0;
    }
    this.navigateToSection(this.currentSectionIndex);
  }

  /**
   * Navigate to a specific section by index
   */
  navigateToSection(sectionIndex) {
    const section = this.sectionOrder[sectionIndex];
    if (!section) return;const sectionElement = document.querySelector(`[data-section="${section.id}"]`);
    if (!sectionElement) {
      console.error('❌ Section element not found:', section.id);
      return;}
    
    // Update the modal content
    this.updateModalContent(section, sectionElement);
    
    // Update navigation arrows
    this.updateNavigationArrows();
    
    // Update modal title
    this.updateModalTitle(section);
  }

  /**
   * Update modal content for navigation
   */
  updateModalContent(section, sectionElement) {
    const modal = document.getElementById(this.currentModalId);
    if (!modal) return;const content = sectionElement.querySelector('.section-content');
    if (!content) return;const modalContent = modal.querySelector('.townhall-modal-container');
    if (!modalContent) return;const contentArea = modalContent.querySelector('.section-content');
    if (contentArea) {
      const clonedContent = content.cloneNode(true);
      // Ensure cloned content fills and scrolls correctly
      try {
        clonedContent.style.height = '100%';
        clonedContent.style.minHeight = '0';
        clonedContent.style.overflowY = 'auto';
        clonedContent.style.overflowX = 'hidden';
        clonedContent.style.paddingBottom = '5rem';
      } catch (_) {}
      contentArea.replaceWith(clonedContent);
    }
    
    // Re-initialize section content
    this.initializeSectionContent(modal, section.id);
  }

  /**
   * Update modal title
   */
  updateModalTitle(section) {
    const modal = document.getElementById(this.currentModalId);
    if (!modal) return;const titleElement = modal.querySelector('.modal-title, .universal-modal-title, .townhall-unified-title, h1, h2');
    if (titleElement) {
      titleElement.innerHTML = `<i class="fas ${section.icon}"></i>${section.title}`;
    }
    
    // Update section counter in header - try multiple possible header selectors
    const header = modal.querySelector('.modal-header, .universal-modal-header, .townhall-unified-header');
    if (header) {
      const sectionNumber = this.currentSectionIndex + 1;
      const totalSections = this.sectionOrder.length;
      header.setAttribute('data-section-counter', `${sectionNumber} of ${totalSections}`);
    }
    
    console.log(`📝 Updated modal title to: ${section.title} (${this.currentSectionIndex + 1}/${this.sectionOrder.length})`);
  }

  /**
   * Update navigation arrow states
   */
  updateNavigationArrows() {
    const currentSection = this.sectionOrder[this.currentSectionIndex];
    if (!currentSection) return;console.log(`🔄 Updating navigation arrows - Current: ${currentSection.title} (Index ${this.currentSectionIndex})`);
    
    if (this.leftArrow) {
      const leftLabel = this.leftArrow.querySelector('.section-label');
      const prevIndex = (this.currentSectionIndex - 1 + this.sectionOrder.length) % this.sectionOrder.length;
      const previousSection = this.sectionOrder[prevIndex];
      leftLabel.textContent = previousSection.title;
      this.leftArrow.classList.remove('disabled');
      this.leftArrow.style.opacity = '1';
      this.leftArrow.style.visibility = 'visible';
      this.leftArrow.style.pointerEvents = 'auto';
      console.log(`⬅️ Left arrow: ${previousSection.title}`);
    }
    
    if (this.rightArrow) {
      const rightLabel = this.rightArrow.querySelector('.section-label');
      const nextIndex = (this.currentSectionIndex + 1) % this.sectionOrder.length;
      const nextSection = this.sectionOrder[nextIndex];
      rightLabel.textContent = nextSection.title;
      this.rightArrow.classList.remove('disabled');
      this.rightArrow.style.opacity = '1';
      this.rightArrow.style.visibility = 'visible';
      this.rightArrow.style.pointerEvents = 'auto';
      console.log(`➡️ Right arrow: ${nextSection.title}`);
    }
    
    console.log(`🔄 Navigation arrows updated - Current section: ${currentSection.title} (Index ${this.currentSectionIndex})`);
  }

  /**
   * Initialize section content in the modal
   */
  initializeSectionContent(modal, sectionId) {
    // This function should handle any section-specific initialization
    // that was previously done in the old modal system
    
    console.log(`🏛️ Initializing section content for: ${sectionId}`);
    
    // Add any section-specific logic here
    // For example, re-initializing maps for cartography section
    if (sectionId === 'cartography') {
      this.initializeCartographySection(modal);
    } else if (sectionId === 'player-names') {
      this.initializeBarracksSection(modal);
    } else if (sectionId === 'clan-management') {
      this.initializeClanSection(modal);
      // If clan manager is available, re-render into the modal container for correct scoping
      try {
        const modalClanContainer = modal.querySelector('#clan-container');
        if (modalClanContainer && window.clanManager && typeof window.clanManager.renderClanSection === 'function') {
          // Load latest clan and render into modal-specific container
          window.clanManager.renderClanSection(window.clanManager.currentClan, modalClanContainer);
        }
      } catch (_) {}
    } else if (sectionId === 'campaign') {
      this.initializeCampaignSection(modal);
    } else if (sectionId === 'content-creator') {
      this.initializeContentCreatorSection(modal);
    } else if (sectionId === 'hero-tier') {
      this.initializeHeroTierSection(modal);
    } else if (sectionId === 'achievements') {
      this.initializeAchievementsSection(modal);
    } else if (sectionId === 'about-me') {
      this.initializeAboutMeSection(modal);
    }
  }

  /**
   * Initialize cartography section specifically
   */
  initializeCartographySection(modal) {
    console.log('🗺️ Initializing cartography section in modal');
    console.log('🗺️ Modal element:', modal);
    console.log('🗺️ Modal classes:', modal.className);
    console.log('🗺️ Modal HTML structure:', modal.outerHTML.substring(0, 500) + '...');
    
    // Debug: Check what containers exist in the modal
    const userMapsContainer = modal.querySelector('#user-maps-container');
    const userMapsCount = modal.querySelector('#user-maps-count');
    console.log('🗺️ Found in modal - user-maps-container:', !!userMapsContainer);
    console.log('🗺️ Found in modal - user-maps-count:', !!userMapsCount);
    
    if (userMapsContainer) {
      console.log('🗺️ user-maps-container classes:', userMapsContainer.className);
      console.log('🗺️ user-maps-container parent classes:', userMapsContainer.parentElement?.className);
    }
    
    // Wait a bit for the modal to be fully rendered
    setTimeout(async () => {
      try {
        // First, ensure CartographyManager is available
        if (!window.cartographyManager && window.CartographyManager) {
          console.log('🗺️ Creating new CartographyManager instance...');
          window.cartographyManager = new window.CartographyManager();
        }
        
        if (window.cartographyManager) {
          console.log('🗺️ CartographyManager available, initializing for modal...');
          
          // Reset containers and initialize for the modal
          window.cartographyManager.resetContainers();
          await window.cartographyManager.initializeForModal();
          
          console.log('✅ CartographyManager initialized successfully for modal');
        } else {
          console.warn('⚠️ CartographyManager not available');
        }
        
        // Also try to trigger any existing map loading logic
        const mapContainer = modal.querySelector('#maps-container, .maps-container, .cartography-content, #user-maps-container');
        if (mapContainer) {
          console.log('🗺️ Found map container, triggering load...');
          // Trigger a custom event to notify map systems
          mapContainer.dispatchEvent(new CustomEvent('mapsModalOpened'));
        }
        
        // Check if MapDetails is available for additional functionality
        if (window.mapDetails && typeof window.mapDetails.initializeMaps === 'function') {
          console.log('🗺️ Initializing maps via MapDetails...');
          window.mapDetails.initializeMaps();
        } else if (window.initializeMaps && typeof window.initializeMaps === 'function') {
          console.log('🗺️ Initializing maps via global initializeMaps...');
          window.initializeMaps();
        }
        
      } catch (error) {
        console.error('❌ Error initializing cartography section:', error);
      }
    }, 200); // Increased delay to ensure modal is fully rendered
  }

  /**
   * Initialize barracks section specifically
   */
  initializeBarracksSection(modal) {
    console.log('🏰 Initializing barracks section in modal');
    // Add barracks-specific initialization logic here
  }

  /**
   * Initialize clan section specifically
   */
  initializeClanSection(modal) {
    console.log('🏕️ Initializing clan section in modal');
    try {
      // Remove navigation status to prevent bottom overlay from covering content
      try {
        document.querySelectorAll('.townhall-nav-status').forEach(el => el.remove());
      } catch (_) {}

      const container = modal.querySelector('#clan-container');
      if (!container) {
        console.warn('⚠️ Clan container not found inside modal');
        return;}

      // Wire up simplified action buttons inside cloned modal content
      const createBtn = container.querySelector('.create-clan-btn');
      const browseBtn = container.querySelector('.browse-clans-btn');
      const stoneBtn = container.querySelector('.stone-tablet-btn');

      if (createBtn) {
        createBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Close the Town Hall modal so the legacy modal is visible
          try { this.closeCurrentModal(); } catch (_) {}
          if (window.clanManager && typeof window.clanManager.showCreateClanModal === 'function') {
            window.clanManager.showCreateClanModal();
          } else if (window.showCreateClanModal) {
            window.showCreateClanModal();
          } else {
            console.error('❌ Create Clan function not available');
          }
        });
      }

      if (browseBtn) {
        browseBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Close the Town Hall modal so the legacy modal is visible
          try { this.closeCurrentModal(); } catch (_) {}
          // Use the correct method name
          if (window.clanManager && typeof window.clanManager.showFindClansModal === 'function') {
            await window.clanManager.showFindClansModal();
          } else if (window.showFindClansModal) {
            await window.showFindClansModal();
          } else if (window.clanManager && typeof window.clanManager.showBrowseClansModal === 'function') {
            // Fallback in case an alternative exists
            await window.clanManager.showBrowseClansModal();
          } else {
            console.error('❌ Find/Browse Clans function not available');
          }
        });
      }

      if (stoneBtn) {
        stoneBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Close the Town Hall modal before navigating
          try { this.closeCurrentModal(); } catch (_) {}
          window.location.href = '/views/stone-tablet.html?game=clan';
        });
      }

      console.log('✅ Clan section action buttons wired in modal');
    } catch (error) {
      console.error('❌ Error initializing clan section in modal:', error);
    }
  }

  /**
   * Initialize campaign section specifically
   */
  async initializeCampaignSection(modal) {
    console.log('⚔️ Initializing campaign section in modal');
    
    try {
      // Load campaign data from the same API as wartales.html
      const [campaignsResponse, progressResponse, statsResponse] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/campaigns/user/progress'),
        fetch('/api/campaigns/user/stats')
      ]);

      console.log('⚔️ Campaign data responses:', {
        campaigns: campaignsResponse.status,
        progress: progressResponse.status,
        stats: statsResponse.status
      });

      let campaigns = [];
      let userProgress = [];
      let userStats = {};

      if (campaignsResponse.ok) {
        campaigns = await campaignsResponse.json();
        console.log('⚔️ Loaded campaigns:', campaigns);
      }

      if (progressResponse.ok) {
        userProgress = await progressResponse.json();
        console.log('⚔️ Loaded user progress:', userProgress);
      }

      if (statsResponse.ok) {
        userStats = await statsResponse.json();
        console.log('⚔️ Loaded user stats:', userStats);
      }

      // Update the campaign stats in the townhall
      this.updateCampaignStats(userStats);
      
      // Initialize the canvas book with campaign data
      this.initializeCanvasBook(campaigns, userProgress);

    } catch (error) {
      console.error('❌ Error loading campaign data for townhall:', error);
    }
  }

  /**
   * Update campaign statistics in the townhall
   */
  updateCampaignStats(userStats) {
    const missionsCompleted = document.getElementById('missions-completed');
    const campaignsCompleted = document.getElementById('campaigns-completed');
    
    if (missionsCompleted) {
      missionsCompleted.textContent = userStats.totalMissionsCompleted || 0;
    }
    
    if (campaignsCompleted) {
      campaignsCompleted.textContent = userStats.completedCampaigns || 0;
    }
  }

  /**
   * Initialize the canvas book with campaign data
   */
  initializeCanvasBook(campaigns, userProgress) {
    const canvas = document.getElementById('war-tales-canvas');
    if (!canvas) {
      console.warn('⚠️ War tales canvas not found');
      return;
    }

    // Initialize canvas book engine with campaign data
    if (window.CanvasBookEngine) {
      const bookEngine = new window.CanvasBookEngine(canvas, {
        width: 400,
        height: 500,
        pageCount: this.calculatePageCount(campaigns),
        campaignData: campaigns,
        userProgress: userProgress
      });
      
      // Store reference for later use
      this.campaignBookEngine = bookEngine;
      
      console.log('⚔️ Canvas book engine initialized with campaign data');
    } else {
      console.warn('⚠️ CanvasBookEngine not available');
    }
  }

  /**
   * Calculate total pages needed for all campaigns
   */
  calculatePageCount(campaigns) {
    if (!campaigns || campaigns.length === 0) return 1;
    
    let totalPages = 1; // Title page
    
    campaigns.forEach(gameGroup => {
      gameGroup.campaigns.forEach(campaign => {
        // One page per campaign
        totalPages += 1;
        // One page per mission
        totalPages += campaign.missions ? campaign.missions.length : 0;
      });
    });
    
    return totalPages;
  }

  /**
   * Initialize content creator section specifically
   */
  initializeContentCreatorSection(modal) {
    console.log('🎬 Initializing content creator section in modal');
    // Add content creator-specific initialization logic here
  }

  /**
   * Initialize hero tier section specifically
   */
  initializeHeroTierSection(modal) {
    console.log('👑 Initializing hero tier section in modal');
    // Add hero tier-specific initialization logic here
  }

  /**
   * Initialize achievements section specifically
   */
  initializeAchievementsSection(modal) {
    console.log('🏆 Initializing achievements section in modal');
    // Add achievements-specific initialization logic here
  }

  /**
   * Initialize about me section specifically
   */
  initializeAboutMeSection(modal) {
    console.log('👤 Initializing about me section in modal');
    // Add about me-specific initialization logic here
  }

  /**
   * Check if a modal is currently open
   * @returns {boolean} True if a modal is open, false otherwise
   */
  isModalOpen() {
    // Use unified modal state detection for consistency
    return this.isAnyModalOpen();}

  /**
   * Close the current modal
   */
  closeCurrentModal() {
    console.log('🔒 [UNIFIED] closeCurrentModal() called');
    console.log('🆔 [UNIFIED] Current modal ID:', this.currentModalId);
    
    // Set flag to prevent race conditions
    this.isModalOperationInProgress = true;
    
    // Store modal ID for cleanup after modal closes
    const modalIdToClose = this.currentModalId;
    
    if (!modalIdToClose) {
      console.log('⚠️ [UNIFIED] No modal to close');
      return;}
    
    console.log('🔄 [UNIFIED] Closing modal:', modalIdToClose);
    
    // Close the modal using ModalManager
    if (window.ModalManager && window.ModalManager.closeModal) {
      window.ModalManager.closeModal(modalIdToClose);
      // Unified modal close handler will handle cleanup automatically
    } else {
      console.error('❌ [UNIFIED] ModalManager not available for closing modal');
      return;}
    
    console.log('✅ [UNIFIED] Modal close initiated');
  }

  /**
   * Perform comprehensive navigation cleanup
   */
  performNavigationCleanup() {
    console.log('🧹 [TRACE] performNavigationCleanup() called');
    console.log('📅 [TRACE] Timestamp:', new Date().toISOString());
    console.log('🆔 [TRACE] Current modal ID:', this.currentModalId);
    
    // Remove all navigation arrows from the entire page (including emergency arrows)
    const allArrows = document.querySelectorAll('.townhall-nav-arrow, .emergency-arrow');
    console.log(`🧹 [TRACE] Found ${allArrows.length} navigation arrows to remove...`);
    allArrows.forEach((arrow, index) => {
      console.log(`  - [TRACE] Removing arrow ${index + 1}:`, {
        classes: arrow.className,
        text: arrow.querySelector('.section-label')?.textContent || arrow.textContent || 'No label',
        parent: arrow.parentElement?.tagName || 'No parent'
      });
      arrow.remove();
    });
    
    // Remove all navigation status elements
    const allStatus = document.querySelectorAll('.townhall-nav-status');
    console.log(`🧹 [TRACE] Found ${allStatus.length} navigation status elements to remove...`);
    allStatus.forEach((status, index) => {
      console.log(`  - [TRACE] Removing status ${index + 1}:`, status.className);
      status.remove();
    });
    
    // Remove all navigation-related elements with any class containing 'nav'
    const allNavElements = document.querySelectorAll('[class*="nav"]');
    console.log(`🧹 [TRACE] Found ${allNavElements.length} elements with 'nav' in class name...`);
    allNavElements.forEach((element, index) => {
      if (element.classList.contains('townhall-nav-arrow') || 
          element.classList.contains('townhall-nav-status') ||
          element.classList.contains('emergency-arrow')) {
        console.log(`  - [TRACE] Removing nav element ${index + 1}:`, element.className);
        element.remove();
      }
    });
    
    console.log('✅ [TRACE] Navigation cleanup completed');
  }

  /**
   * Get section information by ID
   */
  getSectionInfo(sectionId) {
    return this.sectionOrder.find(s => s.id === sectionId);}

  /**
   * Get all sections
   */
  getAllSections() {
    return this.sectionOrder;}

  /**
   * Refresh the section order when layout changes (called after drag & drop)
   */
  refreshSectionOrder() {
    console.log('🔄 Refreshing section order due to layout change...');
    this.verifyVisualLayoutOrder();
  }

  /**
   * Force refresh all sections
   */
  forceRefreshSections() {
    console.log('🔄 Force refreshing all sections...');
    
    // Re-verify all sections exist
    this.verifySections();
    
    // Ensure we have all 8 sections
    if (this.sectionOrder.length !== 8) {
      console.warn('⚠️ Section order length is not 8, resetting to default...');
      this.sectionOrder = [
        { id: 'about-me', title: 'About Me', icon: 'fa-user', position: 1 },
        { id: 'hero-tier', title: 'Hero Tier', icon: 'fa-crown', position: 2 },
        { id: 'content-creator', title: 'Content Creator', icon: 'fa-video', position: 3 },
        { id: 'player-names', title: 'Barracks', icon: 'fa-fort-awesome', position: 4 },
        { id: 'clan-management', title: 'Clan Encampment', icon: 'fa-campground', position: 5 },
        { id: 'campaign', title: 'War Table', icon: 'fa-flag', position: 6 },
        { id: 'achievements', title: 'Achievements', icon: 'fa-trophy', position: 7 },
        { id: 'cartography', title: 'Cartography', icon: 'fa-map', position: 8 }
      ];
    }
    
    // Force a comprehensive section scan
    this.comprehensiveSectionScan();
    
    console.log('✅ Force refresh complete. Sections available:', this.sectionOrder.length);
    this.displayVisualGridLayout();
  }
  
  /**
   * Comprehensive section scan to find all available sections
   */
  comprehensiveSectionScan() {
    console.log('🔍 Running comprehensive section scan...');
    
    // Try multiple selectors to find sections
    const selectors = [
      '[data-section]',
      '.section-modal-trigger',
      '.profile-section[data-section]',
      '.draggable-section[data-section]',
      '.section[data-section]'
    ];
    
    const allFoundSections = new Set();
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`🔍 Selector "${selector}": ${elements.length} elements found`);
      
      elements.forEach(element => {
        const sectionId = element.dataset.section;
        if (sectionId) {
          allFoundSections.add(sectionId);
          console.log(`  📍 Found section: ${sectionId} with classes: ${element.className}`);
        }
      });
    });
    
    console.log('📋 All found section IDs:', Array.from(allFoundSections));
    
    // Check which of our expected sections are missing
    const missingSections = this.sectionOrder.filter(section => 
      !allFoundSections.has(section.id)
    );
    
    if (missingSections.length > 0) {
      console.warn('⚠️ Missing sections:', missingSections.map(s => s.title));
      
      // Try to find sections with alternative IDs
      missingSections.forEach(section => {
        const alternativeSelectors = [
          `#${section.id}`,
          `#section-${section.id}`,
          `.${section.id}`,
          `[id*="${section.id}"]`,
          `[class*="${section.id}"]`
        ];
        
        alternativeSelectors.forEach(altSelector => {
          const element = document.querySelector(altSelector);
          if (element) {
            console.log(`🔍 Found section "${section.title}" with alternative selector: ${altSelector}`);
            console.log(`  📍 Element:`, element);
            console.log(`  📍 Classes:`, element.className);
          }
        });
      });
    }
    
    // Update our section order to only include found sections
    const foundSectionOrder = this.sectionOrder.filter(section => 
      allFoundSections.has(section.id)
    );
    
    if (foundSectionOrder.length !== this.sectionOrder.length) {
      console.warn(`⚠️ Updating section order: ${foundSectionOrder.length}/${this.sectionOrder.length} sections found`);
      this.sectionOrder = foundSectionOrder;
    }
    
    return foundSectionOrder.length;}

  /**
   * Comprehensive debug method to identify missing sections
   */
  debugMissingSections() {
    console.log('🐛 DEBUGGING MISSING SECTIONS...');
    console.log('🔍 Current section order:', this.sectionOrder);
    
    // Check all possible selectors
    const selectors = [
      '[data-section]',
      '.section-modal-trigger',
      '.profile-section[data-section]',
      '.draggable-section[data-section]'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`🔍 Selector "${selector}": ${elements.length} elements found`);
      
      elements.forEach((el, index) => {
        const sectionId = el.dataset.section;
        const classes = el.className;
        const visible = el.offsetParent !== null;
        const display = window.getComputedStyle(el).display;
        const visibility = window.getComputedStyle(el).visibility;
        const opacity = window.getComputedStyle(el).opacity;
        
        console.log(`  ${index + 1}. data-section="${sectionId}" - Classes: ${classes}`);
        console.log(`     📍 Visible: ${visible}, Display: ${display}, Visibility: ${visibility}, Opacity: ${opacity}`);
      });
    });
    
    // Check specific sections
    this.sectionOrder.forEach(section => {
      const element = document.querySelector(`[data-section="${section.id}"]`);
      if (element) {
        console.log(`✅ ${section.title} (${section.id}): FOUND`);
      } else {
        console.log(`❌ ${section.title} (${section.id}): MISSING`);
        
        // Try alternative selectors
        const altSelectors = [
          `#section-${section.id}`,
          `.section-modal-trigger[data-section="${section.id}"]`,
          `.profile-section[data-section="${section.id}"]`,
          `.draggable-section[data-section="${section.id}"]`
        ];
        
        altSelectors.forEach(altSelector => {
          const altElement = document.querySelector(altSelector);
          if (altElement) {
            console.log(`  🔍 Found with alternative selector: ${altSelector}`);
          }
        });
      }
    });
  }

  /**
   * Manually trigger section verification (useful for debugging)
   */
  manualVerifySections() {
    console.log('🔧 Manual section verification triggered...');
    this.verifySectionsWithRetry(3, 500); // Quick retry with shorter delays
  }

  /**
   * Manually trigger profile section manager completion (useful for debugging)
   */
  manualTriggerProfileSectionManagerCompletion() {
    console.log('🔧 Manually triggering profile section manager completion...');
    document.dispatchEvent(new CustomEvent('profileSectionManagerReady'));
  }

  /**
   * Setup drag and drop change detection
   */
  setupLayoutChangeDetection() {
    // Listen for layout changes (when sections are dragged and dropped)
    const observer = new MutationObserver((mutations) => {
      let layoutChanged = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-position') {
          layoutChanged = true;
        }
        if (mutation.type === 'childList') {
          // Check if sections were moved around
          const movedSections = mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
          if (movedSections) {
            layoutChanged = true;
          }
        }
      });
      
      if (layoutChanged) {
        console.log('🎯 Layout change detected, refreshing section order...');
        // Debounce the refresh to avoid multiple calls
        clearTimeout(this.layoutChangeTimeout);
        this.layoutChangeTimeout = setTimeout(() => {
          this.refreshSectionOrder();
        }, 100);
      }
    });
    
    // Observe the profile grid container for changes
    const profileGrid = document.getElementById('profile-grid-container');
    if (profileGrid) {
      observer.observe(profileGrid, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['data-position']
      });
      console.log('👁️ Layout change detection enabled');
    }
    
    // Setup page unload cleanup
    this.setupPageUnloadCleanup();
  }
  
  /**
   * Setup cleanup on page unload to prevent navigation elements from persisting
   */
  setupPageUnloadCleanup() {
    console.log('🏗️ [TRACE] setupPageUnloadCleanup() called');
    
    // REMOVED: beforeunload event listener that was causing arrows to disappear
    // This was triggering cleanup when the page was being unloaded, but it was
    // interfering with normal modal operation. Arrows should only be cleaned up
    // when the modal is actually closed, not on page unload.
    
    console.log('✅ [TRACE] Page unload cleanup setup complete (beforeunload removed)');
  }
  
  /**
   * Clean up all navigation elements
   */
  cleanupAllNavigationElements() {
    console.log('🧹 [UNIFIED] cleanupAllNavigationElements() called');
    
    // Use the unified modal state detection
    if (this.isAnyModalOpen()) {
      console.log('⚠️ [UNIFIED] Modal is open, skipping cleanup to preserve arrows');
      return;}
    
    console.log('✅ [UNIFIED] No modal open, proceeding with cleanup');
    // Use the unified cleanup method
    this.cleanupAllNavigationArrows();
  }

  /**
   * Debug navigation issue comprehensively
   */
  debugNavigationIssue() {
    console.log('🔍 COMPREHENSIVE NAVIGATION DEBUG');
    console.log('==================================');
    
    // 1. Current state
    console.log('📊 CURRENT STATE:');
    console.log(`   Current section index: ${this.currentSectionIndex}`);
    console.log(`   Current modal ID: ${this.currentModalId}`);
    console.log(`   Modal open: ${this.isModalOpen()}`);
    console.log(`   Total sections: ${this.sectionOrder.length}`);
    
    // 2. Section order for navigation
    console.log('📋 SECTION ORDER FOR NAVIGATION:');
    this.sectionOrder.forEach((section, index) => {
      const marker = index === this.currentSectionIndex ? '🎯' : '  ';
      console.log(`${marker} ${index + 1}. ${section.title} (${section.id}) - Position: ${section.position}`);
    });
    
    // 3. Visual layout on page
    console.log('🎨 VISUAL LAYOUT ON PAGE:');
    const visualSections = document.querySelectorAll('.section-modal-trigger[data-position]');
    const visualOrder = Array.from(visualSections)
      .map(section => ({
        id: section.dataset.section,
        position: parseInt(section.dataset.position),
        title: section.querySelector('.section-title span')?.textContent || 'Unknown'
      }))
      .sort((a, b) => a.position - b.position);
    
    visualOrder.forEach((section, index) => {
      console.log(`   ${index + 1}. ${section.title} (${section.id}) - Position: ${section.position}`);
    });
    
    // 4. Check for mismatches
    console.log('🔍 CHECKING FOR MISMATCHES:');
    const navigationIds = this.sectionOrder.map(s => s.id);
    const visualIds = visualOrder.map(s => s.id);
    
    if (JSON.stringify(navigationIds) === JSON.stringify(visualIds)) {
      console.log('✅ Navigation order matches visual layout perfectly!');
    } else {
      console.log('❌ MISMATCH DETECTED!');
      console.log('   Navigation order:', navigationIds);
      console.log('   Visual order:', visualIds);
    }
    
    // 5. Navigation prediction
    console.log('🎯 NAVIGATION PREDICTION:');
    if (this.currentSectionIndex > 0) {
      const prevSection = this.sectionOrder[this.currentSectionIndex - 1];
      console.log(`   Previous (←): ${prevSection.title} (${prevSection.id})`);
    } else {
      console.log('   Previous (←): FIRST (disabled)');
    }
    
    if (this.currentSectionIndex < this.sectionOrder.length - 1) {
      const nextSection = this.sectionOrder[this.currentSectionIndex + 1];
      console.log(`   Next (→): ${nextSection.title} (${nextSection.id})`);
    } else {
      console.log('   Next (→): LAST (disabled)');
    }
    
    // 6. Check for stale references
    console.log('🔍 CHECKING FOR STALE REFERENCES:');
    console.log(`   Left arrow exists: ${!!this.leftArrow}`);
    console.log(`   Right arrow exists: ${!!this.rightArrow}`);
    console.log(`   Nav status exists: ${!!this.navStatusElement}`);
    
    if (this.leftArrow) {
      const leftLabel = this.leftArrow.querySelector('.section-label');
      console.log(`   Left arrow label: "${leftLabel?.textContent}"`);
    }
    
    if (this.rightArrow) {
      const rightLabel = this.rightArrow.querySelector('.section-label');
      console.log(`   Right arrow label: "${rightLabel?.textContent}"`);
    }
    
    // 7. Check for duplicates
    console.log('🔍 CHECKING FOR DUPLICATES:');
    const allArrows = document.querySelectorAll('.townhall-nav-arrow');
    const allStatus = document.querySelectorAll('.townhall-nav-status');
    console.log(`   Total arrows in DOM: ${allArrows.length}`);
    console.log(`   Total status elements in DOM: ${allStatus.length}`);
    
    if (allArrows.length > 2) {
      console.log('❌ DUPLICATE ARROWS DETECTED!');
      allArrows.forEach((arrow, index) => {
        console.log(`   Arrow ${index + 1}: ${arrow.className} - ${arrow.querySelector('.section-label')?.textContent}`);
      });
    }
    
    console.log('==================================');
  }

  /**
   * Force refresh section order
   */
  forceRefreshSectionOrder() {
    console.log('🔄 FORCING SECTION ORDER REFRESH');
    
    // Clear current state
    this.currentSectionIndex = 0;
    this.currentModalId = null;
    
    // Re-read visual layout
    this.comprehensiveSectionScan();
    
    // Force verification
    this.verifySectionsWithRetry();
    
    console.log('✅ Section order refresh complete');
  }

  /**
   * Test navigation sequence
   */
  testNavigationSequence() {
    console.log('🧪 TESTING NAVIGATION SEQUENCE');
    
    // Run comprehensive debug first
    this.debugNavigationIssue();
    
    // Attempt to fix any mismatches
    const visualSections = document.querySelectorAll('.section-modal-trigger[data-position]');
    const visualOrder = Array.from(visualSections)
      .map(section => ({
        id: section.dataset.section,
        position: parseInt(section.dataset.position),
        title: section.querySelector('.section-title span')?.textContent || 'Unknown'
      }))
      .sort((a, b) => a.position - b.position);
    
    this.updateSectionOrderToMatchVisual(visualOrder);
    
    // Show expected sequence
    console.log('📋 EXPECTED NAVIGATION SEQUENCE:');
    this.sectionOrder.forEach((section, index) => {
      console.log(`${index + 1}. ${section.title} (${section.id})`);
    });
    
    // Provide testing instructions
    console.log('🧪 TESTING INSTRUCTIONS:');
    console.log('1. Open any Town Hall section modal');
    console.log('2. Click the right arrow (→) to navigate to next section');
    console.log('3. Verify the sequence follows the order above');
    console.log('4. Use left arrow (←) to go back');
    console.log('5. Use keyboard arrows (← →) to test keyboard navigation');
    console.log('6. Press ESC to close modal');
  }

  /**
   * Get navigation help
   */
  getNavigationHelp() {
    console.log('🆘 NAVIGATION TROUBLESHOOTING HELP');
    console.log('==================================');
    console.log('If navigation is not working correctly:');
    console.log('');
    console.log('1. Clear browser cache and refresh the page');
    console.log('2. Run: window.townHallModalManager.debugNavigationIssue()');
    console.log('3. Run: window.townHallModalManager.forceRefreshSectionOrder()');
    console.log('4. Run: window.townHallModalManager.testNavigationSequence()');
    console.log('5. Check console for any error messages');
    console.log('');
    console.log('Expected behavior:');
    console.log('- All 8 sections should cycle in visual order (left-to-right, top-to-bottom)');
    console.log('- Arrows should be at the very edge of the screen');
    console.log('- Navigation should work with both mouse clicks and keyboard arrows');
    console.log('- ESC key should close the modal');
    console.log('');
    console.log('If issues persist, please provide the console output from debugNavigationIssue()');
  }

  /**
   * CENTRALIZED MODAL STATE DETECTION
   * Single source of truth for whether any modal is open anywhere in the app
   */
  isAnyModalOpen() {
    try {
      if (window.ModalManager && typeof window.ModalManager.getOpenModalCount === 'function') {
        return window.ModalManager.getOpenModalCount() > 0;}
    } catch (_) {}
    return document.querySelectorAll('.universal-modal, .modal.show, .townhall-unified-modal.show').length > 0;}

  /**
   * UNIFIED ARROW CLEANUP - Idempotent and robust
   * Completely removes arrows from DOM, not just hides them
   */
  cleanupAllNavigationArrows() {
    console.log('🧹 [UNIFIED] Cleaning up all navigation arrows...');
    
    // Remove all navigation arrows from DOM entirely
    const allArrows = document.querySelectorAll('.townhall-nav-arrow, .emergency-arrow');
    console.log(`🧹 [UNIFIED] Found ${allArrows.length} arrows to remove`);
    
    allArrows.forEach((arrow, index) => {
      console.log(`  - [UNIFIED] Removing arrow ${index + 1}:`, arrow.className);
      arrow.remove();
    });
    
    // Remove all navigation status elements
    const allStatus = document.querySelectorAll('.townhall-nav-status');
    console.log(`🧹 [UNIFIED] Found ${allStatus.length} status elements to remove`);
    
    allStatus.forEach((status, index) => {
      console.log(`  - [UNIFIED] Removing status ${index + 1}:`, status.className);
      status.remove();
    });
    
    // Reset internal references
    this.leftArrow = null;
    this.rightArrow = null;
    this.navStatusElement = null;
    
    console.log('✅ [UNIFIED] All navigation arrows cleaned up');

    // Ensure chat floating window stays above after modal close
    try {
      if (window.chatManager && window.chatManager.floatingWindow) {
        window.chatManager.floatingWindow.style.zIndex = '1000002';
      }
    } catch (e) {}
  }

  /**
   * UNIFIED MODAL CLOSE HANDLER
   * Centralized handler for all modal closing scenarios
   */
  handleModalClose() {
    console.log('🎯 [UNIFIED] Modal close detected, checking state...');
    
    // Wait for modal animation to complete before cleanup
    setTimeout(() => {
      if (!this.isAnyModalOpen()) {
        console.log('✅ [UNIFIED] No modals open, cleaning up arrows');
        this.cleanupAllNavigationArrows();
        this.currentModalId = null;
        this.isModalOperationInProgress = false;
      } else {
        console.log('⚠️ [UNIFIED] Modal still open, preserving arrows');
      }
    }, 300); // Match modal animation time
  }

  /**
   * SETUP UNIFIED MODAL CLOSE LISTENERS
   * Hook into all modal closing events
   */
  setupUnifiedModalCloseListeners() {
    console.log('🎧 [UNIFIED] Setting up modal close listeners...');
    
    // Listen for ModalManager close events
    if (window.ModalManager) {
      // Hook into ModalManager's close method
      const originalCloseModal = window.ModalManager.closeModal;
      if (originalCloseModal) {
        window.ModalManager.closeModal = (modalId) => {
          console.log('🎯 [UNIFIED] ModalManager.closeModal called:', modalId);
          originalCloseModal.call(window.ModalManager, modalId);
          this.handleModalClose();
        };
      }
    }
    
    // Listen for modal close button clicks
    document.addEventListener('click', (event) => {
      if (event.target.matches('.close-modal, .modal-close, .universal-close-btn, [data-dismiss="modal"]')) {
        console.log('🎯 [UNIFIED] Modal close button clicked');
        this.handleModalClose();
      }
    });
    
    // Listen for Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isAnyModalOpen()) {
        console.log('🎯 [UNIFIED] Escape key pressed while modal open');
        this.handleModalClose();
      }
    });
    
    // Listen for modal backdrop clicks - do not close Town Hall modal on backdrop
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('universal-modal') || event.target.classList.contains('modal') || event.target.classList.contains('townhall-unified-modal')) {
        // Prevent closing from backdrop for Town Hall modals; ModalManager will check per-modal option
        console.log('🎯 [UNIFIED] Modal backdrop clicked');
        // No-op here; close behavior is controlled by ModalManager backdropClose option
      }
    });
    
    // Listen for transitionend events on modals
    document.addEventListener('transitionend', (event) => {
      if (event.target.classList.contains('modal') || event.target.classList.contains('townhall-unified-modal')) {
        console.log('🎯 [UNIFIED] Modal transition ended');
        if (!this.isAnyModalOpen()) {
          console.log('✅ [UNIFIED] Modal transition complete, no modals open');
          this.cleanupAllNavigationArrows();
        }
      }
    });
    
    console.log('✅ [UNIFIED] Modal close listeners setup complete');
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TownHallModalManager;
}

// Create global instance
window.townHallModalManager = new TownHallModalManager();

// Add global debug functions
window.debugNavigationIssue = function() {
  if (window.townHallModalManager) {
    window.townHallModalManager.debugNavigationIssue();
  } else {
    console.error('❌ TownHallModalManager not available');
  }
};

window.forceRefreshSectionOrder = function() {
  if (window.townHallModalManager) {
    window.townHallModalManager.forceRefreshSectionOrder();
  } else {
    console.error('❌ TownHallModalManager not available');
  }
};

window.testNavigationSequence = function() {
  if (window.townHallModalManager) {
    window.townHallModalManager.testNavigationSequence();
  } else {
    console.error('❌ TownHallModalManager not available');
  }
};

window.getNavigationHelp = function() {
  if (window.townHallModalManager) {
    window.townHallModalManager.getNavigationHelp();
  } else {
    console.error('❌ TownHallModalManager not available');
  }
};

// Add test function to manually create arrows
window.testNavigationArrows = function() {
  console.log('🧪 Testing navigation arrows manually...');
  
  if (window.townHallModalManager) {
    return window.townHallModalManager.testNavigationArrows();} else {
    console.error('❌ TownHallModalManager not available');
    return null;}
};

// Add emergency arrow creation function
window.createEmergencyArrows = function() {
  console.log('🚨 Creating emergency arrows manually...');
  
  if (window.townHallModalManager) {
    return window.townHallModalManager.createEmergencyArrows();} else {
    console.error('❌ TownHallModalManager not available');
    return null;}
};

// Add function to check arrow visibility
window.checkArrowVisibility = function() {
  console.log('🔍 Checking arrow visibility...');
  
  const arrows = document.querySelectorAll('.townhall-nav-arrow');
  console.log(`Found ${arrows.length} arrows in DOM`);
  
  arrows.forEach((arrow, index) => {
    const computedStyle = window.getComputedStyle(arrow);
    const rect = arrow.getBoundingClientRect();
    
    console.log(`Arrow ${index + 1} (${arrow.className}):`, {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position,
      left: computedStyle.left,
      right: computedStyle.right,
      top: computedStyle.top,
      transform: computedStyle.transform,
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0
    });
  });
  
  return arrows.length;};

// Add function to force cleanup all navigation elements
window.forceCleanupNavigation = function() {
  console.log('🧹 [UNIFIED] Force cleaning up all navigation elements...');
  
  if (window.townHallModalManager) {
    window.townHallModalManager.cleanupAllNavigationArrows();
  } else {
    console.error('❌ [UNIFIED] TownHallModalManager not available');
    
    // Fallback cleanup if manager is not available
    const allArrows = document.querySelectorAll('.townhall-nav-arrow, .emergency-arrow');
    const allStatus = document.querySelectorAll('.townhall-nav-status');
    
    console.log(`🧹 [UNIFIED] Found ${allArrows.length} arrows and ${allStatus.length} status elements to remove...`);
    
    allArrows.forEach(arrow => arrow.remove());
    allStatus.forEach(status => status.remove());
    
    console.log('✅ [UNIFIED] Fallback cleanup complete');
  }
};

// Add function to ensure arrows are visible
window.ensureArrowsVisible = function() {
  console.log('👁️ Ensuring arrows are visible...');
  
  if (window.townHallModalManager) {
    window.townHallModalManager.ensureArrowsVisible();
  } else {
    console.error('❌ TownHallModalManager not available');
    
    // Fallback visibility check
    const arrows = document.querySelectorAll('.townhall-nav-arrow');
    console.log(`🔍 Found ${arrows.length} arrows to ensure visibility`);
    
    arrows.forEach((arrow, index) => {
      arrow.style.opacity = '1';
      arrow.style.visibility = 'visible';
      arrow.style.pointerEvents = 'auto';
      arrow.style.zIndex = '999999';
      console.log(`  ✅ Arrow ${index + 1} visibility forced`);
    });
  }
};



// Global helper for debugging
window.traceModalExecution = () => {
  console.log('🔍 [GLOBAL TRACE] Modal execution state:');
  console.log('📅 [GLOBAL TRACE] Timestamp:', new Date().toISOString());
  console.log('🆔 [GLOBAL TRACE] Current modal ID:', this.currentModalId);
  console.log('🔢 [GLOBAL TRACE] Current section index:', this.currentSectionIndex);
  console.log('⬅️ [GLOBAL TRACE] Left arrow exists:', !!this.leftArrow);
  console.log('➡️ [GLOBAL TRACE] Right arrow exists:', !!this.rightArrow);
  console.log('🔍 [GLOBAL TRACE] Arrows in DOM:', document.querySelectorAll('.townhall-nav-arrow').length);
  console.log('🔍 [GLOBAL TRACE] Emergency arrows in DOM:', document.querySelectorAll('.emergency-arrow').length);
};

// Add a global function to test arrow visibility
window.testArrowVisibility = function() {
  console.log('🧪 Testing arrow visibility...');
  
  if (window.townHallModalManager) {
    console.log('✅ TownHallModalManager found, checking arrow state...');
    window.townHallModalManager.ensureArrowsVisible();
    
    const arrows = document.querySelectorAll('.townhall-nav-arrow');
    console.log(`🔍 Found ${arrows.length} arrows in DOM`);
    
    arrows.forEach((arrow, index) => {
      const computedStyle = window.getComputedStyle(arrow);
      console.log(`Arrow ${index + 1}:`, {
        opacity: computedStyle.opacity,
        visibility: computedStyle.visibility,
        display: computedStyle.display,
        zIndex: computedStyle.zIndex,
        classes: arrow.className
      });
    });
  } else {
    console.error('❌ TownHallModalManager not found');
  }
};

console.log('✅ TownHallModalManager initialized and ready');
console.log('🔧 [DEBUG] Global functions available:');
console.log('   - window.traceModalExecution() - Trace current state');
console.log('   - window.forceCleanupNavigation() - Force cleanup');
console.log('   - window.ensureArrowsVisible() - Force arrow visibility');
console.log('   - window.testUnifiedModalState() - Test unified modal state detection');

// Add function to test unified modal state detection
window.testUnifiedModalState = function() {
  console.log('🧪 [UNIFIED] Testing modal state detection...');
  
  if (window.townHallModalManager) {
    const isAnyOpen = window.townHallModalManager.isAnyModalOpen();
    const modalCount = document.querySelectorAll('.modal.show, .townhall-unified-modal.show').length;
    
    console.log('📊 [UNIFIED] Modal State:');
    console.log(`   - isAnyModalOpen(): ${isAnyOpen}`);
    console.log(`   - Modal count in DOM: ${modalCount}`);
    console.log(`   - Current modal ID: ${window.townHallModalManager.currentModalId}`);
    
    if (isAnyOpen) {
      console.log('✅ [UNIFIED] Modal is open - arrows should be visible');
    } else {
      console.log('✅ [UNIFIED] No modal open - arrows should be hidden');
      window.townHallModalManager.cleanupAllNavigationArrows();
    }
  } else {
    console.error('❌ [UNIFIED] TownHallModalManager not found');
  }
};