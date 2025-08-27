/**
 * PROFILE SECTION MANAGER
 * Handles drag & drop, modal click handling, and section positioning
 * Manages the interactive profile grid layout and user interactions
 */

// Use console.log instead of logger for this file since it's not a module
const profileLogger = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info
};

class ProfileSectionManager {
  constructor() {
    this.container = null;
    this.draggedElement = null;
    this.numColumns = 4; // Set number of columns for grid
    this.init();
  }

  init() {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    this.container = document.getElementById('profile-grid-container');
    if (!this.container) {
      profileLogger.warn('Profile grid container not found');
      return;}

    // Initialize grid system
    this.initializeGridPositions();
    this.setupSectionClickHandling();
    this.setupLayoutControls();
    this.setupDragAndDrop();

    // Profile section manager initialized
  }

  /**
   * Initialize grid positions for all sections
   */
  initializeGridPositions() {
    const sections = this.container.querySelectorAll('.draggable-section');
    
    // Initializing grid positions for sections
    
    // Use compactGrid for initial positioning to ensure optimal layout
    this.compactGrid();
  }

  /**
   * Setup section click handling with drag state awareness
   * Distinguishes between drag operations and intentional modal opening clicks
   */
  setupSectionClickHandling() {
    let isDragOperationInProgress = false;
    
    // Track drag state to distinguish between drag operations and modal clicks
    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.drag-handle')) {
        isDragOperationInProgress = true;
      }
    });
    
    this.container.addEventListener('mouseup', (e) => {
      // Reset drag state after a brief delay to ensure click events are processed correctly
      setTimeout(() => { 
        isDragOperationInProgress = false; 
      }, 0);
    });
    
    // Handle section clicks with drag state awareness
    this.container.addEventListener('click', (e) => {
      const clickedSection = e.target.closest('.draggable-section.section-modal-trigger');
      if (clickedSection) {
        // Only open modal if this is NOT a drag operation and NOT clicking on controls
        const isClickingOnControls = e.target.closest('.section-controls');
        const isClickingOnDragHandle = e.target.closest('.drag-handle');
        const shouldOpenModal = !isDragOperationInProgress && !isClickingOnControls && !isClickingOnDragHandle;
        
        if (shouldOpenModal) {
          // Section modal trigger clicked (non-drag)
          e.preventDefault();
          
          // Use TownHallModalManager if available, otherwise fall back to global function
          if (window.townHallModalManager && typeof window.townHallModalManager.openSectionModal === 'function') {
            window.townHallModalManager.openSectionModal(clickedSection);
          } else if (typeof window.openSectionModal === 'function') {
            window.openSectionModal(clickedSection);
          } else {
            profileLogger.error('No modal manager available for section', clickedSection.dataset.section);
          }
        } else {
          // Section click ignored (drag or controls)
        }
      }
    });
  }

  /**
   * Setup layout control buttons
   */
  setupLayoutControls() {
    // Find or create layout controls container
    let controlsContainer = document.querySelector('.profile-layout-controls');
    
    if (!controlsContainer) {
      controlsContainer = document.createElement('div');
      controlsContainer.className = 'profile-layout-controls';
      controlsContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        gap: 0.5rem;
        z-index: 1000;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      `;
      
      // Add hover effect
      controlsContainer.addEventListener('mouseenter', () => {
        controlsContainer.style.opacity = '1';
      });
      controlsContainer.addEventListener('mouseleave', () => {
        controlsContainer.style.opacity = '0.7';
      });
      
      document.body.appendChild(controlsContainer);
    }

    // Compact button
    const compactBtn = document.createElement('button');
    compactBtn.className = 'layout-control-btn compact-btn';
    compactBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>';
    compactBtn.title = 'Compact Layout - Fill Empty Spaces';
    compactBtn.style.cssText = `
      background: rgba(212, 175, 55, 0.9);
      border: none;
      color: #1a1a1a;
      padding: 0.75rem;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
    `;
    
    compactBtn.addEventListener('mouseenter', () => {
      compactBtn.style.transform = 'scale(1.1)';
      compactBtn.style.background = 'rgba(212, 175, 55, 1)';
    });
    
    compactBtn.addEventListener('mouseleave', () => {
      compactBtn.style.transform = 'scale(1)';
      compactBtn.style.background = 'rgba(212, 175, 55, 0.9)';
    });

    compactBtn.addEventListener('click', () => {
      this.compactGrid();
      
      // Visual feedback
      compactBtn.style.transform = 'scale(0.9)';
      setTimeout(() => {
        compactBtn.style.transform = 'scale(1)';
      }, 150);
    });

    controlsContainer.appendChild(compactBtn);
  }

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    const sections = this.container.querySelectorAll('.draggable-section');
    sections.forEach(section => {
      section.draggable = true;
      
      section.addEventListener('dragstart', (e) => {
        this.draggedElement = section;
        section.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', section.outerHTML);
        // Drag started for section
      });

      section.addEventListener('dragend', (e) => {
        section.classList.remove('dragging');
        // Remove any drag target highlights
        this.container.querySelectorAll('.drag-target').forEach(el => {
          el.classList.remove('drag-target');
        });
        this.draggedElement = null;
        // Drag ended for section
      });

      // Handle dragging over other sections for visual feedback
      section.addEventListener('dragenter', (e) => {
        if (this.draggedElement && section !== this.draggedElement) {
          section.classList.add('drag-target');
        }
      });

      section.addEventListener('dragleave', (e) => {
        // Only remove highlight if we're actually leaving the section
        if (!section.contains(e.relatedTarget)) {
          section.classList.remove('drag-target');
        }
      });

      section.addEventListener('dragover', (e) => {
        if (this.draggedElement && section !== this.draggedElement) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      });

      section.addEventListener('drop', (e) => {
        e.preventDefault();
        if (this.draggedElement && section !== this.draggedElement) {
          section.classList.remove('drag-target');
          this.swapSections(this.draggedElement, section);
          // Swapped sections
        }
      });
    });

    // Handle drops on empty areas of the container
    this.container.addEventListener('dragover', (e) => {
      // Only allow drop if we're not over a section
      if (!e.target.closest('.draggable-section') && this.draggedElement) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });

    this.container.addEventListener('drop', (e) => {
      // Only handle drops on empty areas
      if (!e.target.closest('.draggable-section') && this.draggedElement) {
        e.preventDefault();
        
        // Calculate drop position based on mouse coordinates
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Find the best position to drop the section
        const targetPosition = this.calculateDropPosition(x, y);
        
        if (targetPosition) {
          // Set the target position temporarily
          this.draggedElement.dataset.position = (targetPosition.row * this.numColumns) + targetPosition.col + 1;
          
          // Compact the grid to ensure optimal layout
          this.compactGrid();
        } else {
          // Compact current layout
          this.compactGrid();
        }
      }
    });
  }

  /**
   * Move section to specific grid position
   */
  moveToGridPosition(section, row, col) {
    // Moving section to grid position
    
    // Set CSS Grid positions - all sections are normal width
    section.style.gridRow = row + 1;
    section.style.gridColumn = col + 1;
    
    // Update position data
    const newPosition = (row * this.numColumns) + col + 1;
    section.dataset.position = newPosition;
    
    // Update position indicator
    const indicator = section.querySelector('.grid-position-indicator');
    if (indicator) {
      const statusText = `Section ${section.dataset.section} at position ${section.dataset.position}`;
      indicator.textContent = statusText;
    }
    
    // Section moved to position
  }

  /**
   * Swap positions of two sections
   */
  swapSections(section1, section2) {
    // Swapping sections
    
    // Simply swap the position data attributes
    const pos1 = parseInt(section1.dataset.position) || 1;
    const pos2 = parseInt(section2.dataset.position) || 1;
    
    section1.dataset.position = pos2;
    section2.dataset.position = pos1;
    
    // Position data swapped
    
    // Compact the grid to ensure optimal layout
    this.compactGrid();
  }

  /**
   * Update position indicator text
   */
  updatePositionIndicator(section) {
    const indicator = section.querySelector('.grid-position-indicator');
    if (indicator) {
      const statusText = `Section ${section.dataset.section} at position ${section.dataset.position}`;
      indicator.textContent = statusText;
    }
  }

  /**
   * Calculate drop position based on mouse coordinates
   */
  calculateDropPosition(x, y) {
    const containerRect = this.container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const estimatedSectionHeight = 200;
    const colWidth = containerWidth / this.numColumns;
    const col = Math.min(this.numColumns - 1, Math.floor(x / colWidth));
    const row = Math.floor(y / estimatedSectionHeight);
    return { row: Math.max(0, row), col };}

  /**
   * Reorganize the entire grid to ensure proper layout
   * This ensures all sections are properly positioned in a 2-column grid
   */
  reorganizeGrid() {
    // Reorganizing and compacting grid layout
    this.compactGrid();
  }

    /**
   * Simple reflow - just use the existing compact grid method
   */
  reflowSections() {
    // Using simple compact grid
    
    // Clear any custom grid positioning
    const sections = this.container.querySelectorAll('.draggable-section');
    sections.forEach(section => {
      section.style.gridRow = '';
      section.style.gridColumn = '';
    });
    
    // Reset container grid
    this.container.style.gridTemplateRows = '';
    
    // Use the existing compact grid method
    this.compactGrid();
  }

  /**
   * Compact grid by filling all empty spaces from top to bottom
   * This creates a "tetris-like" effect where sections automatically fill gaps
   */
  compactGrid() {
    // Compacting grid - filling empty spaces
    
    const sections = Array.from(this.container.querySelectorAll('.draggable-section'));
    
    if (sections.length === 0) {
      return;}
    
    // Sort by current position to maintain relative order
    sections.sort((a, b) => {
      const posA = parseInt(a.dataset.position) || 0;
      const posB = parseInt(b.dataset.position) || 0;
      return posA - posB;});
    
    let currentRow = 0;
    let currentCol = 0;
    
    sections.forEach((section, index) => {
      // Place section in next available position
      section.style.gridRow = currentRow + 1;
      section.style.gridColumn = currentCol + 1;
      
      // Update position data
      const newPosition = (currentRow * this.numColumns) + currentCol + 1;
      section.dataset.position = newPosition;
      
      // Compacted section to position
      
      // Move to next position in 2-column grid
      currentCol++;
      if (currentCol >= this.numColumns) {
        currentRow++;
        currentCol = 0;
      }
      
      // Update position indicator
      this.updatePositionIndicator(section);
    });
    
    // Grid compacted - sections optimally positioned
    
    // Emit event to notify other systems that section positioning is complete
    document.dispatchEvent(new CustomEvent('profileSectionManagerPositioned', {
      detail: { sectionsCount: sections.length }
    }));
  }

  /**
   * Find next available grid position
   */
  findNextAvailablePosition(allSections, avoidRow = -1) {
    const occupiedPositions = new Set();
    
    // Finding available position
    
    // Map all currently occupied positions
    allSections.forEach(section => {
      const row = parseInt(section.style.gridRow) || 1;
      const col = parseInt(section.style.gridColumn) || 1;
      
      const rowIndex = row - 1; // Convert to 0-indexed
      const colIndex = col - 1; // Convert to 0-indexed
      
      occupiedPositions.add(`${rowIndex}-${colIndex}`);
      // Position occupied by section
    });
    
    // Find first available position
    for (let row = 0; row < 20; row++) { // Check up to 20 rows
      if (row === avoidRow) {
        continue; // Skip the row we're trying to avoid
      }
      
      // Check if positions in this row are available
      for (let col = 0; col < this.numColumns; col++) {
        if (!occupiedPositions.has(`${row}-${col}`)) {
          return { row, col };}
      }
    }
    
    // Fallback: find the first completely empty row after all used rows
    const maxRow = Math.max(0, ...Array.from(occupiedPositions).map(pos => parseInt(pos.split('-')[0])));
    const fallbackRow = maxRow + 1;
    // Using fallback position
    return { row: fallbackRow, col: 0 };}
}

// Global instance
window.ProfileSectionManager = ProfileSectionManager;

// Auto-initialize
const profileSectionManager = new ProfileSectionManager();

// Export the instance globally so other modules can access it
window.profileSectionManager = profileSectionManager;

// Export functions for backward compatibility
window.initDraggableGrid = () => profileSectionManager.initialize();

// Profile Section Manager loaded successfully