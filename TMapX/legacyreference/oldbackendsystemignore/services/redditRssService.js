const axios = require('axios');
const xml2js = require('xml2js');

class RedditRssService {
  constructor() {
    this.subreddits = {
      wc1: ['warcraft'],
      wc2: ['warcraft2'],
      wc3: ['warcraft3', 'wc3'],
      clan: ['warcraft', 'warcraft3', 'wc3', 'gaming'] // Clan feeds include general gaming and Warcraft content
    };
    
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    
    console.log('🔥 RedditRssService initialized');
  }

  /**
   * Get Reddit feeds for a specific game type
   */
  async getRedditFeeds(gameType = 'wc2') {
    const cacheKey = `reddit_${gameType}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`📋 Returning cached Reddit feeds for ${gameType}`);
      return cached.data;
    }

    try {
      console.log(`🔍 Fetching fresh Reddit feeds for ${gameType}...`);
      
      const subreddits = this.subreddits[gameType] || this.subreddits.wc2;
      const feedPromises = subreddits.map(subreddit => this.fetchSubredditFeed(subreddit));
      
      const feedResults = await Promise.allSettled(feedPromises);
      
      // Combine and sort all posts by date
      const allPosts = [];
      feedResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allPosts.push(...result.value.map(post => ({
            ...post,
            subreddit: subreddits[index]
          })));
        } else {
          console.warn(`⚠️ Failed to fetch r/${subreddits[index]}:`, result.reason);
        }
      });

      // Sort by date (newest first) and limit to 15 posts
      const sortedPosts = allPosts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 15);

      const result = {
        gameType,
        posts: sortedPosts,
        lastUpdated: new Date().toISOString(),
        totalPosts: sortedPosts.length
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`✅ Fetched ${sortedPosts.length} Reddit posts for ${gameType}`);
      return result;

    } catch (error) {
      console.error(`❌ Error fetching Reddit feeds for ${gameType}:`, error);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log(`🔄 Returning expired cache for ${gameType} due to error`);
        return cached.data;
      }
      
      // Return empty result if no cache available
      return {
        gameType,
        posts: [],
        lastUpdated: new Date().toISOString(),
        totalPosts: 0,
        error: 'Failed to fetch Reddit feeds'
      };
    }
  }

  /**
   * Fetch RSS feed for a specific subreddit
   */
  async fetchSubredditFeed(subreddit) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}.rss`;
      console.log(`📡 Fetching RSS for r/${subreddit}...`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'WarcraftArena/1.0 (Community Forum Bot)'
        }
      });

      const parser = new xml2js.Parser({
        explicitArray: false,
        trim: true,
        normalize: true
      });

      const result = await parser.parseStringPromise(response.data);
      
      if (!result.feed || !result.feed.entry) {
        console.warn(`⚠️ No entries found in r/${subreddit} RSS feed`);
        return [];
      }

      // Ensure entries is always an array
      const entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
      
      const posts = entries.map(entry => this.parseRedditEntry(entry, subreddit));
      
      console.log(`✅ Parsed ${posts.length} posts from r/${subreddit}`);
      return posts;

    } catch (error) {
      console.error(`❌ Error fetching r/${subreddit}:`, error.message);
      return [];
    }
  }

  /**
   * Parse a Reddit RSS entry into our format
   */
  parseRedditEntry(entry, subreddit) {
    try {
      // Extract data from Reddit Atom format
      const title = entry.title || 'Untitled';
      
      // Handle Reddit's Atom link format: {$: {href: "url"}}
      let link = '#';
      if (entry.link) {
        if (typeof entry.link === 'string') {
          link = entry.link;
        } else if (entry.link.$ && entry.link.$.href) {
          link = entry.link.$.href;
        } else if (entry.link.href) {
          link = entry.link.href;
        }
      }
      
      // Extract author name from Reddit format
      const author = entry.author?.name || entry.author || 'Unknown';
      const date = entry.updated || entry.published || new Date().toISOString();
      
      // Handle Reddit's content structure - it can be a string or object
      let content = '';
      if (entry.content) {
        if (typeof entry.content === 'string') {
          content = entry.content;
        } else if (entry.content._ || entry.content._text) {
          content = entry.content._ || entry.content._text;
        } else if (entry.content['#text']) {
          content = entry.content['#text'];
        }
      }
      
      // Fallback to summary if no content
      if (!content && entry.summary) {
        if (typeof entry.summary === 'string') {
          content = entry.summary;
        } else if (entry.summary._ || entry.summary._text) {
          content = entry.summary._ || entry.summary._text;
        }
      }
      
      // Extract Reddit-specific info from link
      const redditMatch = link.match(/\/r\/(\w+)\/comments\/(\w+)\//);
      const postId = redditMatch ? redditMatch[2] : null;
      
      // Clean up the content (remove HTML tags)
      const cleanContent = this.cleanContent(content);
      
      // Generate preview text
      const preview = this.generatePreview(title, cleanContent);
      
      return {
        id: postId || `reddit_${Date.now()}_${Math.random()}`,
        title: this.cleanTitle(title),
        link,
        author,
        date: new Date(date).toISOString(),
        content: cleanContent,
        preview,
        subreddit,
        platform: 'reddit',
        score: this.extractScore(content),
        comments: this.extractCommentCount(content)
      };

    } catch (error) {
      console.error('❌ Error parsing Reddit entry:', error);
      return {
        id: `error_${Date.now()}`,
        title: 'Error parsing post',
        link: '#',
        author: 'Unknown',
        date: new Date().toISOString(),
        content: '',
        preview: 'Error loading this post',
        subreddit,
        platform: 'reddit',
        score: 0,
        comments: 0
      };
    }
  }

  /**
   * Clean up Reddit post title
   */
  cleanTitle(title) {
    return title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Clean up content HTML
   */
  cleanContent(content) {
    if (!content) return '';
    
    // Ensure content is a string
    let contentStr = '';
    if (typeof content === 'string') {
      contentStr = content;
    } else if (typeof content === 'object' && content !== null) {
      // Try to extract string from object
      contentStr = content._ || content._text || content['#text'] || JSON.stringify(content);
    } else {
      contentStr = String(content);
    }
    
    return contentStr
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n') // Remove extra line breaks
      .trim();
  }

  /**
   * Generate preview text
   */
  generatePreview(title, content) {
    const text = content || title;
    if (text.length <= 150) return text;
    
    return text.substring(0, 147) + '...';
  }

  /**
   * Extract score from content (Reddit sometimes includes this)
   */
  extractScore(content) {
    if (!content) return 0;
    
    const contentStr = typeof content === 'string' ? content : String(content);
    const scoreMatch = contentStr.match(/(\d+)\s+points?/i);
    return scoreMatch ? parseInt(scoreMatch[1]) : 0;
  }

  /**
   * Extract comment count from content
   */
  extractCommentCount(content) {
    if (!content) return 0;
    
    const contentStr = typeof content === 'string' ? content : String(content);
    const commentMatch = contentStr.match(/(\d+)\s+comments?/i);
    return commentMatch ? parseInt(commentMatch[1]) : 0;
  }

  /**
   * Get aggregated Reddit stats
   */
  async getRedditStats() {
    try {
      const [wc1Data, wc2Data, wc3Data, clanData] = await Promise.all([
        this.getRedditFeeds('wc1'),
        this.getRedditFeeds('wc2'),
        this.getRedditFeeds('wc3'),
        this.getRedditFeeds('clan')
      ]);

      const totalPosts = wc1Data.totalPosts + wc2Data.totalPosts + wc3Data.totalPosts + clanData.totalPosts;
      const latestPost = [wc1Data, wc2Data, wc3Data, clanData]
        .flatMap(data => data.posts)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      return {
        totalPosts,
        latestPostTime: latestPost?.date || null,
        gameBreakdown: {
          wc1: wc1Data.totalPosts,
          wc2: wc2Data.totalPosts,
          wc3: wc3Data.totalPosts,
          clan: clanData.totalPosts
        },
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting Reddit stats:', error);
      return {
        totalPosts: 0,
        latestPostTime: null,
        gameBreakdown: { wc1: 0, wc2: 0, wc3: 0, clan: 0 },
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Reddit RSS cache cleared');
  }
}

module.exports = { RedditRssService }; 