// Main.js - Simplified initialization
// console.log('🔍 Main.js script loaded - BEFORE IMPORTS'); // Reduced logging
// console.log('🔍 Current URL:', window.location.href); // Reduced logging
// console.log('🔍 Document ready state:', document.readyState); // Reduced logging

// Import centralized logger utility
import logger from '/js/utils/logger.js';

// console.log('🔍 Logger import completed'); // Reduced logging

// Import unified moth system manager for all pages
import '/js/utils/mothSystemManager.js';

// console.log('🔍 All imports completed'); // Reduced logging

// Module loading utility
async function loadModule(modulePath) {
  // Since modules are now loaded via HTML script tags, this is a no-op
  return Promise.resolve();
}

// Fallback module loading
async function loadFallbackModule(modulePath) {
  // Since modules are now loaded via HTML script tags, this is a no-op
  return Promise.resolve();
}

// JWT token extraction and user data refresh
function extractJWTFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const authToken = urlParams.get('authToken') || urlParams.get('token');
  
  if (authToken) {
    localStorage.setItem('authToken', authToken);
    document.cookie = `authToken=${authToken}; path=/; max-age=86400; SameSite=Strict`;
    
    // Clean up URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete('authToken');
    newUrl.searchParams.delete('token');
    window.history.replaceState({}, '', newUrl);
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
  // console.log('🔍 DOMContentLoaded event fired in main.js'); // Reduced logging
  try {
    // Extract JWT token if present
    extractJWTFromURL();
    
    // Load navbar
    // console.log('🔍 About to load navbar...'); // Reduced logging
    await loadNavbar();
    // console.log('🔍 Navbar loading completed'); // Reduced logging
    
    // Dispatch app ready event
    window.dispatchEvent(new CustomEvent('appReady'));
    // console.log('🔍 App ready event dispatched'); // Reduced logging
  } catch (error) {
    console.error('❌ Error during application initialization:', error);
    logger.error('Error during application initialization', error);
  }
});

// Global authenticated fetch utility is now provided by AuthenticationService
// This function is maintained for backward compatibility but delegates to the service
async function authenticatedFetch(url, options = {}) {
  if (window.authenticatedFetch) {
    return window.authenticatedFetch(url, options);
  }
  
  // Fallback if service not loaded
  console.warn('AuthenticationService not loaded, using fallback fetch');
  return fetch(url, options);
}

// ApiClient fallback
async function apiClientFallback(endpoint, options = {}) {
  try {
    const response = await authenticatedFetch(`/api${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    // ApiClient not available, falling back to direct fetch
    throw error;
  }
}

// Enhanced API client with timeout
async function apiClientWithTimeout(endpoint, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await authenticatedFetch(`/api${endpoint}`, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      // ApiClient request timed out
    }
    
    throw error;
  }
}

// Load avatar utilities (simplified)
async function loadAvatarUtilities() {
  // Avatar utilities are now loaded via HTML script tags
  return Promise.resolve();
}

// Component loading system
const componentCache = new Map();

async function loadComponent(componentName) {
  // Check cache first
  if (componentCache.has(componentName)) {
    return componentCache.get(componentName);
  }
  
  try {
    const response = await fetch(`/components/${componentName}.html`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    componentCache.set(componentName, html);
    
    return html;
  } catch (error) {
    logger.error(`Error loading component ${componentName}`, error);
    throw error;
  }
}

// Navbar loading system (simplified)
async function loadNavbarScript() {
  // Navbar script is now loaded via HTML script tags
  return Promise.resolve();
}

// Main navbar loading function
async function loadNavbar() {
  console.log('🔍 loadNavbar() called');
  try {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) {
      logger.warn('Navbar container not found');
      return;
    }
    
    console.log('🔍 Loading navbar component...');
    const navbarHtml = await loadComponent('navbar');
    console.log('🔍 Navbar HTML loaded, injecting into container...');
    console.log('🔍 Navbar HTML length:', navbarHtml.length);
    navbarContainer.innerHTML = navbarHtml;
    
    // Move any stylesheet links from injected HTML into <head>
    const styleLinks = navbarContainer.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]');
    console.log('🔍 Found', styleLinks.length, 'link(style) tags in navbar HTML');
    for (const link of styleLinks) {
      try {
        const href = link.getAttribute('href');
        if (!href) continue;
        const isPreloadStyle = link.rel === 'preload' && link.getAttribute('as') === 'style';
        // Deduplicate by href
        const alreadyInHead = !!document.head.querySelector(`link[href="${href}"]`);
        if (!alreadyInHead) {
          const newLink = document.createElement('link');
          for (const { name, value } of Array.from(link.attributes)) {
            newLink.setAttribute(name, value);
          }
          // If it's a preload style, ensure we flip to stylesheet on load
          if (isPreloadStyle) {
            newLink.onload = function onPreloadLoad() {
              this.onload = null;
              this.rel = 'stylesheet';
            };
          }
          document.head.appendChild(newLink);
          console.log('🧷 Moved stylesheet to head:', href);
        }
        // Remove original link from container
        link.remove();
      } catch (e) {
        logger.warn('Failed moving navbar stylesheet link', e);
      }
    }

    // Execute any script tags that were injected
    const scripts = navbarContainer.querySelectorAll('script');
    console.log('🔍 Found', scripts.length, 'script tags in navbar HTML');
    
    for (const script of scripts) {
              // Replace navbar-modern.js with debug version to force fresh load
        let scriptSrc = script.src;
        console.log('🔍 Original script src:', scriptSrc);
        if (scriptSrc && scriptSrc.includes('navbar-modern.js')) {
          scriptSrc = scriptSrc.replace('navbar-modern.js', 'navbar-modern-debug.js');
          console.log('🔍 Replaced navbar script with debug version:', scriptSrc);
        }
        console.log('🔍 Processing script:', scriptSrc || 'inline script');
      
      if (script.src) {
        // External script - create new script element
        const newScript = document.createElement('script');
        newScript.type = script.type || 'text/javascript';
        // Use the modified scriptSrc (with debug version if applicable)
        newScript.src = scriptSrc;
        
        console.log('🔍 Creating new script element:', newScript.src, 'type:', newScript.type);
        
        // For module scripts, we need to handle them specially
        if (script.type === 'module') {
          // Remove the old script tag and append the new one to head
          script.remove();
          document.head.appendChild(newScript);
          console.log('🔍 Module script appended to head:', newScript.src);
        } else {
          // For non-module scripts, append to head
          document.head.appendChild(newScript);
          console.log('🔍 Regular script appended to head:', newScript.src);
        }
      } else if (script.textContent) {
        // Inline script - execute directly
        try {
          eval(script.textContent);
          console.log('🔍 Inline script executed successfully');
        } catch (error) {
          logger.error('Error executing inline script in navbar', error);
        }
      }
    }

    // Fallback: explicitly import navbar module if not initialized
    try {
      if (!window.navbar || !window.navbar.initialized) {
        console.log('🔍 Fallback: importing /js/navbar-modern-debug.js');
        // Force complete cache clear by using renamed file
        await import('/js/navbar-modern-debug.js');
        if (window.navbar && !window.navbar.initialized) {
          console.log('🔍 Fallback: initializing navbar after import');
          window.navbar.init();
        }
      }
    } catch (e) {
      logger.error('Navbar fallback import failed', e);
    }
  } catch (error) {
    logger.error('Failed to load navbar HTML', error);
  }
}

// Music system loading (simplified)
async function loadMusicScript() {
  // Music script is now loaded via HTML script tags
  return Promise.resolve();
}

// PlayerDetails script loading (simplified)
async function loadPlayerDetailsScript() {
  // PlayerDetails script is now loaded via HTML script tags
  return Promise.resolve();
}

// Initialize application - now handled by coordinator
// The coordinator will handle all initialization phases including navbar loading

// Export utilities for global use
window.authenticatedFetch = authenticatedFetch;
window.apiClientFallback = apiClientFallback;
window.apiClientWithTimeout = apiClientWithTimeout;
window.loadComponent = loadComponent;
window.loadNavbar = loadNavbar;

// Lightweight hot-reload poller (dev only) - RE-ENABLED for debugging second load
if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
  let lastReloadToken = null;
  async function pollDevReload() {
    try {
      let res = await fetch('/dev-reload.json', { cache: 'no-store' });
      if (!res.ok) {
        // try fallback if the server mounts frontend under a different root
        res = await fetch('/frontend/dev-reload.json', { cache: 'no-store' });
      }
      if (res.ok) {
        const data = await res.json();
        if (data && data.token && data.token !== lastReloadToken) {
          lastReloadToken = data.token;
          console.info('🔁 Hot reload token detected. Reloading page...');
          location.reload();
          return;
        }
      }
    } catch (e) {
      // ignore polling errors in dev
    } finally {
      setTimeout(pollDevReload, 1500);
    }
  }
  // start polling after DOM is ready
  document.addEventListener('DOMContentLoaded', () => setTimeout(pollDevReload, 1500));
}

// Manual hot-reload only - page will refresh when you run: node scripts/dev-manager.js reload
if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
  console.log('🔧 Dev mode: Hot-reload re-enabled for debugging second load behavior.');
}