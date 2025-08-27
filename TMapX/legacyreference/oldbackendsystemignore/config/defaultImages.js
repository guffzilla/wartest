/**
 * Default fallback images configuration
 */

/**
 * Get default banner fallback image
 * @param {string} platform - The platform (youtube, twitch, etc.)
 * @returns {string} - The fallback banner image path
 */
function getBannerFallback(platform = 'default') {
  const banners = {
    youtube: '/assets/img/bgs/portal.png',
    twitch: '/assets/img/bgs/featured.png',
    default: '/assets/img/bgs/portal.png'
  };
  
  return banners[platform] || banners.default;
}

/**
 * Get default avatar fallback image
 * @param {string} platform - The platform (youtube, twitch, etc.)
 * @returns {string} - The fallback avatar image path
 */
function getAvatarFallback(platform = 'default') {
  const avatars = {
    youtube: '/assets/img/ranks/emblem.png',
    twitch: '/assets/img/ranks/emblem.png',
    default: '/assets/img/ranks/emblem.png'
  };
  
  return avatars[platform] || avatars.default;
}

module.exports = {
  getBannerFallback,
  getAvatarFallback
}; 