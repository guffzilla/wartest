/**
 * Avatar Utilities
 * Centralized avatar management for consistent display across the application
 */

class AvatarUtils {
  
  /**
   * Refresh user avatar from server and update all instances
   */
  static async refreshUserAvatar() {
    try {
      console.log('🔄 Refreshing user avatar from server...');
      
      // Force refresh from server
      const response = await fetch('/api/me/refresh-avatar', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh avatar');
      }
      
      const result = await response.json();
      console.log('✅ Avatar refreshed:', result.avatar);
      
      // Update all avatar instances in the UI
      this.updateAllAvatarInstances(result.avatar);
      
      // Update global user object
      if (window.currentUser) {
        window.currentUser.avatar = result.avatar;
      }
      
      // Force navbar refresh to show new avatar immediately
      await this.forceNavbarRefresh(result.avatar);
      
      return result.avatar;} catch (error) {
      console.error('❌ Failed to refresh avatar:', error);
      throw error;
    }
  }
  
  /**
   * Update all avatar instances in the current page with enhanced loading
   * @deprecated Use updateNavbarWithUser() for navbar updates instead
   */
  static updateAllAvatarInstances(avatarUrl) {
    console.log('⚠️ AvatarUtils.updateAllAvatarInstances() is deprecated - use updateNavbarWithUser() for navbar updates');
    
    // Only update non-navbar avatars to avoid conflicts
    const fallbackUrl = avatarUrl || '/assets/img/ranks/emblem.png';
    
    // Update profile page avatar (non-navbar)
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) {
      profileAvatar.innerHTML = `
        <img src="${fallbackUrl}"
             alt="User Avatar"
             style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"
             onerror="this.src='/assets/img/ranks/emblem.png'"
             loading="lazy">
      `;
      console.log('✅ Updated profile page avatar');
    }

    // Update any other avatar instances (chat, comments, etc.)
    const otherAvatars = document.querySelectorAll('[data-user-avatar]');
    otherAvatars.forEach(img => {
      this.setImageWithFallback(img, fallbackUrl);
    });

        if (otherAvatars.length > 0) {
      console.log(`✅ Updated ${otherAvatars.length} additional avatar instances`);
    }
  }

  /**
   * Preload image to check if it's valid
   */
  static preloadImage(url) {
    return new Promise((resolve) => {
      if (!url || url.includes('/assets/img/ranks/emblem.png')) {
        resolve(true);return;}

      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;

      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000);
    });
  }

  /**
   * Set image with enhanced fallback handling
   */
  static setImageWithFallback(imgElement, url) {
    if (!imgElement || imgElement.tagName !== 'IMG') return;imgElement.src = url;
    imgElement.loading = 'lazy';

    // Enhanced error handling
    imgElement.onerror = () => {
      if (imgElement.src !== '/assets/img/ranks/emblem.png') {
        console.warn('Image failed to load, using fallback:', imgElement.src);
        imgElement.src = '/assets/img/ranks/emblem.png';
      }
    };
  }

  /**
   * Get optimized image URL for different sizes
   */
  static getOptimizedImageUrl(url, size = '150x150') {
    if (!url || url.startsWith('/assets/') || url.startsWith('/uploads/')) {
      return url;}

    // Use proxy for external images with size optimization
    if (url.startsWith('http')) {
      return `/proxy/image?url=${encodeURIComponent(url)}&size=${size}`;}

    return url;}

  /**
   * Load image with retry mechanism
   */
  static async loadImageWithRetry(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isValid = await this.preloadImage(url);
        if (isValid) return url;throw new Error('Image failed to load');
      } catch (error) {
        console.warn(`Image load attempt ${attempt} failed for:`, url);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    console.error('All image load attempts failed for:', url);
    return '/assets/img/ranks/emblem.png';}
  
  /**
   * Get the current user's avatar URL
   */
  static getCurrentUserAvatar() {
    if (window.currentUser && window.currentUser.avatar) {
      return window.currentUser.avatar;}
    return '/assets/img/ranks/emblem.png';}
  
  /**
   * Handle avatar display with proper fallbacks
   */
  static getAvatarWithFallback(userAvatar, fallback = '/assets/img/ranks/emblem.png') {
    if (!userAvatar || userAvatar === 'null' || userAvatar === 'undefined') {
      return fallback;}
    return userAvatar;}
  
  /**
   * Force navbar refresh with new avatar
   */
  static async forceNavbarRefresh(avatarUrl) {
    try {
      console.log('🔄 Forcing navbar refresh with new avatar:', avatarUrl);
      
      // Update current user data
      if (window.currentUser) {
        window.currentUser.avatar = avatarUrl;
      }
      
      // Use the unified updateNavbarWithUser function
      if (window.updateNavbarWithUser && typeof window.updateNavbarWithUser === 'function') {
        const updatedUser = { ...window.currentUser, avatar: avatarUrl };
        window.updateNavbarWithUser(updatedUser);
        console.log('✅ Navbar refreshed with new avatar');
      }
      
    } catch (error) {
      console.error('❌ Error forcing navbar refresh:', error);
    }
  }
  
  /**
   * Create an avatar img element with proper error handling
   */
  static createAvatarElement(avatarUrl, altText = 'User Avatar', className = '') {
    const img = document.createElement('img');
    img.src = this.getAvatarWithFallback(avatarUrl);
    img.alt = altText;
    img.className = className;
    img.onerror = function() {
      this.onerror = null;
      this.src = '/assets/img/ranks/emblem.png';
    };
    return img;}
}

// Export for use in other modules
// AvatarUtils is available globally as window.AvatarUtils
window.AvatarUtils = AvatarUtils; 