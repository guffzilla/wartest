// ===== ATLAS PAGE SPECIFIC FUNCTIONALITY =====
import logger from '/js/utils/logger.js';

// Initialize ModalManager globally - use existing instance if available
document.addEventListener('DOMContentLoaded', () => {
  if (window.ModalManager && typeof window.ModalManager.createModal === 'function') {
    logger.info('ModalManager already available');
  } else {
    logger.warn('ModalManager not yet available, will wait for it');
  }
});

// Initialize maps system when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  
  
  // Wait for modules to be fully loaded before initializing
  
  
  // Retry logic for module loading
  let retryCount = 0;
  const maxRetries = 10;
  
  const waitForModules = async () => {
    if (typeof initializeMapsSystem === 'function') {
  
      try {
        await initializeMapsSystem();
      } catch (error) {
        logger.error('Failed to initialize maps system', error);
      }
    } else if (retryCount < maxRetries) {
      retryCount++;

      setTimeout(waitForModules, 200);
    } else {
      logger.error('Failed to load modules after maximum retries');
    }
  };
  
  waitForModules();
  
  // main.js will handle navbar loading automatically
  
  
  
  
  // Setup compression handlers
  
  
  // Add change listener to map file input
  const mapFileInput = document.getElementById('map-file');
  if (mapFileInput) {

    mapFileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (!file) {
  
        // Hide map name display and disable button
        const mapNameDisplay = document.getElementById('map-name-display');
        const submitBtn = document.getElementById('upload-map-submit-btn');
        
        if (mapNameDisplay) mapNameDisplay.style.display = 'none';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Select a PUD file first</span>';
        }
        return;}
      

      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.pud')) {
        alert('Only .pud files are allowed for maps');
        event.target.value = '';
        return;}
      

      
      // Show map name
      const mapNameDisplay = document.getElementById('map-name-display');
      const mapNameText = document.getElementById('map-name-text');
      if (mapNameDisplay && mapNameText) {
        const mapName = file.name.replace(/\.pud$/i, '');
        mapNameText.textContent = mapName;
        mapNameDisplay.style.display = 'block';
  
      }

      // Enable upload button
      const submitBtn = document.getElementById('upload-map-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> <span>Upload Map</span>';
  
      }
    });
    
    
  } else {
    logger.error('Map file input not found!');
  }
});

async function loadComponents() {
  try {
    // Load unified navigation (already handled above)


    // Load footer
    const footerResponse = await fetch('/components/footer.html');
    const footerHTML = await footerResponse.text();
    document.getElementById('footer-container').innerHTML = footerHTML;

    
  } catch (error) {
    logger.error('Error loading components:', error);
  } finally {
    // Hide loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }
}

// Enhanced button interactions
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('epic-btn') || e.target.closest('.epic-btn')) {
    const btn = e.target.classList.contains('epic-btn') ? e.target : e.target.closest('.epic-btn');
    
    // Create ripple effect
    const ripple = document.createElement('span');
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(255, 255, 255, 0.5)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 0.6s linear';
    ripple.style.left = e.offsetX + 'px';
    ripple.style.top = e.offsetY + 'px';
    ripple.style.width = ripple.style.height = '20px';
    ripple.style.marginLeft = ripple.style.marginTop = '-10px';
    
    btn.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
});

// Add ripple animation keyframes and enhanced search bar styling
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  /* Enhanced search bar styling */
  .section-title-with-search {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex: 1;
  }
  
  .maps-search-inline {
    flex: 1;
    max-width: 400px;
  }
  
  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .search-input-container input {
    flex: 1;
    padding: 0.75rem 3rem 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 12px;
    color: white;
    font-size: 0.95rem;
    transition: all 0.3s ease;
  }
  
  .search-input-container input:focus {
    outline: none;
    border-color: #ffd700;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
  }
  
  .search-btn-modern {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    border: none;
    border-radius: 8px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    color: #1a1a1a;
    font-size: 1rem;
  }
  
  .search-btn-modern:hover {
    background: linear-gradient(135deg, #ffed4e, #ffd700);
    transform: translateY(-50%) scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  }
  
  .maps-tabs-section {
    margin: 1rem 0;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .pagination-container {
    display: flex;
    justify-content: center;
    margin: 2rem 0;
    padding: 1rem;
  }
`;
document.head.appendChild(style);
