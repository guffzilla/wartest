/**
 * Dark Portal - Community Hub JavaScript
 */
import logger from '/js/utils/logger.js';

class DarkPortalManager {
  constructor() {
    this.currentGameType = 'wc12';
    this.linksByCategory = {};
    this.categories = [
      { id: 'reddit', title: 'Reddit', icon: 'fab fa-reddit' },
      { id: 'battlenet', title: 'Battle.net Groups', icon: 'fas fa-users' },
      { id: 'maps-mods', title: 'Maps and Mods', icon: 'fas fa-map' },
      { id: 'community-sites', title: 'Community Sites', icon: 'fas fa-globe' }
    ];
  }

  async init() {

    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadLinks();
    
    // Load navigation
    await this.loadNavigation();
  }

  setupEventListeners() {
    // Game tab switching
    document.querySelectorAll('.game-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const gameType = e.currentTarget.dataset.game;
        this.switchGameType(gameType);
      });
    });
  }

  async switchGameType(gameType) {
    
    
    // Update active tab
    document.querySelectorAll('.game-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-game="${gameType}"]`).classList.add('active');
    
    this.currentGameType = gameType;
    await this.loadLinks();
  }

  async loadLinks() {
    
    
    try {
      const response = await fetch(`/api/dark-portal/all-links?gameType=${this.currentGameType}`);
      const data = await response.json();
      
      if (data.success) {
        this.linksByCategory = data.linksByCategory;
        this.renderSections();
      } else {
        logger.error('Failed to load links:', data.error);
        this.showError('Failed to load community links');
      }
    } catch (error) {
      logger.error('Error loading links:', error);
      this.showError('Failed to load community links');
    }
  }

  renderSections() {
    const container = document.getElementById('community-sections');
    container.innerHTML = '';

    this.categories.forEach(category => {
      const links = this.linksByCategory[category.id] || [];
      const section = this.createSection(category, links);
      container.appendChild(section);
    });
  }

  createSection(category, links) {
    const section = document.createElement('div');
    section.className = 'community-section';

    // Create dynamic title based on current game type
    const gamePrefix = this.getGamePrefix();
    const dynamicTitle = `${gamePrefix} ${category.title}`;

    section.innerHTML = `
      <div class="section-header">
        <i class="${category.icon} section-icon"></i>
        <h3 class="section-title">${dynamicTitle}</h3>
      </div>
      <div class="links-list">
        ${links.length > 0 ? links.map(link => this.createLinkElement(link)).join('') : '<div class="no-links">No links available for this category</div>'}
      </div>
    `;
    return section;
  }

  getGamePrefix() {
    switch (this.currentGameType) {
      case 'wc12':
        return 'WC1/2';
      case 'wc3':
        return 'WC3';
      default:
        return 'WC1/2';
    }
  }

  createLinkElement(link) {
    const hasImage = link.image && link.image.trim() !== '';
    const iconElement = hasImage 
      ? `<img src="${link.image}" alt="${this.escapeHtml(link.title)}" class="link-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />`
      : `<i class="${this.getLinkIcon(link.category)} link-icon"></i>`;
    
    const fallbackIcon = hasImage 
      ? `<i class="${this.getLinkIcon(link.category)} link-icon" style="display: none;"></i>`
      : '';

    return `
      <a href="${link.url}" 
         target="_blank" 
         rel="noopener noreferrer" 
         class="community-link"
         onclick="trackLinkClick('${link._id}')">
        ${iconElement}
        ${fallbackIcon}
        <div class="link-content">
          <div class="link-title">${this.escapeHtml(link.title)}</div>
          ${link.description ? `<div class="link-description">${this.escapeHtml(link.description)}</div>` : ''}
        </div>
        <i class="fas fa-external-link-alt external-icon"></i>
      </a>
    `;
  }

  getLinkIcon(category) {
    const icons = {
      'reddit': 'fab fa-reddit',
      'discord': 'fab fa-discord',
      'battlenet': 'fas fa-gamepad',
      'maps-mods': 'fas fa-download',
      'community-sites': 'fas fa-link'
    };
    return icons[category] || 'fas fa-link';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    const container = document.getElementById('community-sections');
    container.innerHTML = `
      <div class="loading">
        <i class="fas fa-exclamation-triangle" style="color: #ff6b6b; margin-right: 0.5rem;"></i>
        ${message}
      </div>
    `;
  }

  async loadNavigation() {
    try {
      

      // Load unified navigation
      if (typeof window.loadNavigation === 'function') {
        await window.loadNavigation();
      } else if (typeof window.loadNavbar === 'function') {
        await window.loadNavbar();
      } else {
        // Fallback to manual loading
        const navbarResponse = await fetch('/components/navbar.html');
        if (navbarResponse.ok) {
          const navbarHtml = await navbarResponse.text();
          document.getElementById('navbar-container').innerHTML = navbarHtml;
          
          const script = document.createElement('script');
          script.src = '/js/unified-navigation.js';
          script.onload = function() {
            if (window.initUnifiedNavigation) {
              window.initUnifiedNavigation();
            }
          };
          document.head.appendChild(script);
        }
      }

      // Update navbar profile
      setTimeout(async () => {
        if (window.updateNavbarProfileUnified) {
  
          await window.updateNavbarProfileUnified();
        } else if (window.updateNavbarProfile) {
          
          await window.updateNavbarProfile();
        }
      }, 500);

    } catch (error) {
      logger.warn('Could not load navigation:', error);
    }
  }
}

// Global functions
async function trackLinkClick(linkId) {
  try {
    await fetch(`/api/dark-portal/click/${linkId}`, { method: 'POST' });
  } catch (error) {
    logger.warn('Failed to track link click:', error);
  }
}

function showSubmitModal() {
  // Create modal for link submission
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
  `;

  // Build modal HTML
  let modalHtml = `
    <div class="submit-modal" style="
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h3 style="color: #fff; margin: 0; font-size: 1.5rem;">Submit Community Link</h3>
        <button onclick="this.closest('.modal-overlay').remove()" style="
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>
      
      <form id="submit-link-form">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Title *</label>
          <input type="text" name="title" required style="
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 1rem;
          " placeholder="Enter link title">
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">URL *</label>
          <input type="text" name="url" required style="
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 1rem;
          " placeholder="https://example.com">
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Category *</label>
          <select name="category" required style="
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 1rem;
          ">
            <option value="">Select category</option>
            <option value="reddit">Reddit</option>
            <option value="discord">Discord</option>
            <option value="battlenet">Battle.net Groups</option>
            <option value="maps-mods">Maps and Mods</option>
            <option value="community-sites">Community Sites</option>
          </select>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Game Type *</label>
          <select name="gameType" required style="
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 1rem;
          ">
            <option value="">Select game type</option>
                            <option value="wc12">WC1/2</option>
                <option value="wc3">WC3</option>
          </select>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; color: #fff; margin-bottom: 0.5rem; font-weight: 600;">Description</label>
          <textarea name="description" rows="3" style="
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 1rem;
            resize: vertical;
          " placeholder="Optional description of the link"></textarea>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button type="button" onclick="this.closest('.modal-overlay').remove()" style="
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
          ">Cancel</button>
          <button type="submit" style="
            background: linear-gradient(135deg, var(--primary-gold), #E5C158);
            border: none;
            color: #000;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 1rem;
          ">Submit Link</button>
        </div>
      </form>
    </div>
  `;
  // Set modal innerHTML before appending and before attaching event listeners
  modal.innerHTML = modalHtml;
  document.body.appendChild(modal);
  // Now attach event listeners
  document.getElementById('submit-link-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    // Always get the value directly from the input field (handles autocomplete)
    let url = form.querySelector('input[name="url"]').value.trim();
    if (/^www\./i.test(url)) {
      url = 'https://' + url;
    }
    if (!/^https?:\/\/.+/.test(url)) {
      showToast('Please enter a valid URL starting with http:// or https://', 'error');
      return;
    }
    const formData = new FormData(form);
    formData.set('url', url); // Always set explicitly
    await submitLink(formData);
    modal.remove();
  });
}

async function submitLink(formData) {
  try {
    let endpoint = '/api/dark-portal/submit';
    let isAdmin = false;
    if (window.currentUser && window.currentUser.role === 'admin') {
      endpoint = '/api/dark-portal/admin/add';
      isAdmin = true;
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        title: formData.get('title'),
        url: formData.get('url'),
        description: formData.get('description'),
        category: formData.get('category'),
        gameType: formData.get('gameType')
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }
    
    if (response.ok && data.success) {
      if (isAdmin) {
        showToast('Link added and approved immediately (admin).', 'success');
      } else {
        showToast('Link submitted successfully! It will be reviewed by our team.', 'success');
      }
      // Refresh links immediately after successful submission
      if (window.darkPortal && typeof window.darkPortal.loadLinks === 'function') {
        window.darkPortal.loadLinks();
      }
    } else {
      // Show backend error message if available, otherwise generic
      showToast((data && (data.error || data.message)) || `Failed to submit link (${response.status})`, 'error');
    }
  } catch (error) {
    logger.error('Error submitting link:', error);
    showToast('Failed to submit link. Please try again.', 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 6px;
    z-index: 10001;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const darkPortal = new DarkPortalManager();
  await darkPortal.init();
  
  // Make it globally available
  window.darkPortal = darkPortal;
});
