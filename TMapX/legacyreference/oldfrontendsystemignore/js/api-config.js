// API Configuration
// This file defines the base URL for all API calls
// Since we're serving everything from port 3000, use relative URLs
const API_BASE_URL = '';

const API_CONFIG = {
  baseURL: API_BASE_URL,
  
  // Helper function to build full API URLs
  getApiUrl: function(endpoint) {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseURL}/${cleanEndpoint}`;}
};

// Export for use in other modules
window.API_CONFIG = API_CONFIG; 