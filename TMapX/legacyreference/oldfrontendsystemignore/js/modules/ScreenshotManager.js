/**
 * ScreenshotManager.js - Optimized screenshot handling
 */

export class ScreenshotManager {
  constructor() {
    this.screenshots = [];
    this.pageSize = 20;
    this.currentPage = 1;
    this.totalPages = 1;
    this.loading = false;
    this.observer = null;
    this.container = null;
    this.cache = new Map();
    
    // Debounce scroll handler
    this.handleScroll = this._debounce(this._handleScroll.bind(this), 100);
  }

  async init() {
    this.container = document.querySelector('.screenshot-grid');
    if (!this.container) return;this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.loading) {
            this.loadNextPage();
          }
        });
      },
      { threshold: 0.1 }
    );

    // Add sentinel element for infinite scroll
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    this.container.appendChild(sentinel);
    this.observer.observe(sentinel);

    // Initial load
    await this.loadPage(1);
  }

  async loadPage(page) {
    if (this.loading) return;this.loading = true;

    try {
      // Check cache first
      if (this.cache.has(page)) {
        this.screenshots = this.cache.get(page);
        this.renderScreenshots();
        return;}

      const response = await fetch(`/api/screenshot-history?page=${page}&limit=${this.pageSize}`);
      if (!response.ok) throw new Error('Failed to load screenshots');

      const data = await response.json();
      this.screenshots = data.screenshots;
      this.totalPages = data.totalPages;
      this.currentPage = page;

      // Cache the results
      this.cache.set(page, this.screenshots);

      // Clear old cache entries
      if (this.cache.size > 5) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }

      this.renderScreenshots();
    } catch (error) {
      console.error('Failed to load screenshots:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadNextPage() {
    if (this.currentPage < this.totalPages) {
      await this.loadPage(this.currentPage + 1);
    }
  }

  renderScreenshots() {
    if (!this.container) return;const html = this.screenshots.map(screenshot => `
      <div class="screenshot-card" data-id="${screenshot.id}">
        <div class="screenshot-preview">
          <img 
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
            data-src="${screenshot.thumbnailUrl}"
            alt="Screenshot ${screenshot.id}"
            loading="lazy"
          />
        </div>
        <div class="screenshot-info">
          <span class="game-type">${screenshot.gameType}</span>
          <span class="timestamp">${this._formatTimestamp(screenshot.timestamp)}</span>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = html;

    // Setup lazy loading for images
    this._setupLazyLoading();
  }

  _setupLazyLoading() {
    const images = this.container.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            imageObserver.unobserve(img);
          }
        });
      },
      { threshold: 0.1 }
    );

    images.forEach(img => imageObserver.observe(img));
  }

  _formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();}

  _debounce(func, wait) {
    let timeout;
    return ;}

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.cache.clear();
    window.removeEventListener('scroll', this.handleScroll);
  }
} 