// Import centralized logger utility
import logger from '/js/utils/logger.js';



async function fetchStreams() {
  try {
    
    const response = await fetch('/api/streams', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const streams = await response.json();
    
    
    const streamsContainer = document.getElementById('streams-container');
    if (!streamsContainer) {
      logger.error('Streams container not found');
      return;}
    
    // Clear existing streams
    streamsContainer.innerHTML = '';
    
    if (!streams || streams.length === 0) {
      streamsContainer.innerHTML = '<p class="no-streams">No live streams at the moment</p>';
      return;}
    
    // Create and append stream cards
    streams.forEach(stream => {
      const card = createStreamCard(stream);
      streamsContainer.appendChild(card);
    });
  } catch (error) {
    logger.error('Error fetching streams', error);
    const streamsContainer = document.getElementById('streams-container');
    if (streamsContainer) {
      streamsContainer.innerHTML = '<p class="error">Failed to load streams. Please try again later.</p>';
    }
  }
}

function createStreamCard(stream) {
  const card = document.createElement('div');
  card.className = 'stream-card';
  
  const platform = stream.platform.toLowerCase();
  const username = stream.username;
  const title = stream.title || 'Untitled Stream';
  const thumbnail = stream.thumbnail || '';
  
  card.innerHTML = `
    <div class="stream-thumbnail">
      ${thumbnail ? `<img src="${thumbnail}" alt="${title}" onerror="this.parentElement.innerHTML='<i class=\'fas fa-play-circle\'></i>'">` : 
        `<i class="fas fa-play-circle"></i>`}
      <div class="stream-status live">
        <span class="live-indicator"></span>
        Live
      </div>
    </div>
    <div class="stream-info">
      <div class="stream-title">${title}</div>
      <div class="stream-creator">
        <i class="fab fa-${platform}"></i>
        <span>${username}</span>
      </div>
      <a href="${stream.url}" target="_blank" class="watch-button">
        <i class="fas fa-external-link-alt"></i> Watch on ${platform}
      </a>
    </div>
  `;
  
  return card;}

// Initialize streams
document.addEventListener('DOMContentLoaded', () => {
  fetchStreams();
  
  
  
  // Refresh streams every 5 minutes
  setInterval(fetchStreams, 5 * 60 * 1000);
}); 