const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');

/**
 * Enhanced proxy route for external images with improved caching and error handling
 */
router.get('/image', async (req, res) => {
  try {
    const { url, size } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate that the URL is from trusted sources
    const allowedDomains = [
      'yt3.ggpht.com',
      'yt3.googleusercontent.com',
      'static-cdn.jtvnw.net',
      'i.ytimg.com',
      'ytimg.googleusercontent.com',
      'lh3.googleusercontent.com',  // Google profile images
      'lh4.googleusercontent.com',  // Google profile images
      'lh5.googleusercontent.com',  // Google profile images
      'lh6.googleusercontent.com',  // Google profile images
      'avatars.githubusercontent.com', // GitHub avatars
      'cdn.discordapp.com'         // Discord avatars
    ];

    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    if (!allowedDomains.includes(urlObj.hostname)) {
      console.warn('Blocked request to untrusted domain:', urlObj.hostname);
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    // Add size parameter for supported services
    let finalUrl = url;
    if (size && urlObj.hostname.includes('googleusercontent.com')) {
      // For Google services, add size parameter
      finalUrl = url.split('=')[0] + `=s${size.split('x')[0]}-c`;
    }

    // Fetch the image with retry logic
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await axios.get(finalUrl, {
          responseType: 'stream',
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache'
          },
          maxRedirects: 5
        });
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        console.warn(`Image fetch attempt ${attempts} failed, retrying...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    // Validate response
    if (!response || response.status !== 200) {
      throw new Error(`Invalid response status: ${response?.status}`);
    }

    // Set enhanced headers for better caching
    const cacheMaxAge = urlObj.hostname.includes('googleusercontent.com') ? 86400 : 3600; // 24h for Google, 1h for others

    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Accept-Encoding',
      'X-Proxy-Cache': 'MISS'
    });

    // Add content length if available
    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }

    // Pipe the image stream to the response
    response.data.pipe(res);

  } catch (error) {
    console.error('Error proxying image:', {
      url: req.query.url,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // Return appropriate default image based on size
    const size = req.query.size || '150x150';
    const isLarge = parseInt(size.split('x')[0]) > 100;
    const defaultImageName = isLarge ? 'emblem.png' : 'emblem.png';
    const defaultImagePath = path.join(__dirname, '../../frontend/assets/img/ranks', defaultImageName);

    res.set({
      'Cache-Control': 'public, max-age=300', // Cache errors for 5 minutes
      'X-Proxy-Cache': 'ERROR'
    });

    res.sendFile(defaultImagePath, (err) => {
      if (err) {
        console.error('Error sending default image:', err);
        res.status(500).json({ error: 'Error loading image' });
      }
    });
  }
});

module.exports = router; 