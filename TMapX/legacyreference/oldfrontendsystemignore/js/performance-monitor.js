// Performance Monitoring System
// Tracks Core Web Vitals and custom performance metrics

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = {};
    this.isSupported = 'PerformanceObserver' in window;
    this.init();
  }

  // Initialize performance monitoring
  init() {
    if (!this.isSupported) {
      console.log('⚠️ PerformanceObserver not supported');
      return;}

    console.log('📊 Initializing Performance Monitor...');
    
    // Track Core Web Vitals
    this.trackLCP();
    this.trackFID();
    this.trackCLS();
    this.trackFCP();
    this.trackTTFB();
    
    // Track custom metrics
    this.trackCustomMetrics();
    
    // Track resource loading
    this.trackResourceTiming();
    
    // Track navigation timing
    this.trackNavigationTiming();
    
    console.log('✅ Performance Monitor initialized');
  }

  // Track Largest Contentful Paint (LCP)
  trackLCP() {
    if (!this.isSupported) return;const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.metrics.lcp = {
        value: lastEntry.startTime,
        timestamp: Date.now(),
        element: lastEntry.element?.tagName || 'unknown'
      };
      
      console.log('📊 LCP:', this.metrics.lcp);
      this.reportMetric('LCP', this.metrics.lcp);
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.lcp = observer;
  }

  // Track First Input Delay (FID)
  trackFID() {
    if (!this.isSupported) return;const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        this.metrics.fid = {
          value: entry.processingStart - entry.startTime,
          timestamp: Date.now(),
          eventType: entry.name
        };
        
        console.log('📊 FID:', this.metrics.fid);
        this.reportMetric('FID', this.metrics.fid);
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.fid = observer;
  }

  // Track Cumulative Layout Shift (CLS)
  trackCLS() {
    if (!this.isSupported) return;let clsValue = 0;
    let clsEntries = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });
      
      this.metrics.cls = {
        value: clsValue,
        timestamp: Date.now(),
        entries: clsEntries.length
      };
      
      console.log('📊 CLS:', this.metrics.cls);
      this.reportMetric('CLS', this.metrics.cls);
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.cls = observer;
  }

  // Track First Contentful Paint (FCP)
  trackFCP() {
    if (!this.isSupported) return;const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0];
      
      this.metrics.fcp = {
        value: firstEntry.startTime,
        timestamp: Date.now()
      };
      
      console.log('📊 FCP:', this.metrics.fcp);
      this.reportMetric('FCP', this.metrics.fcp);
    });

    observer.observe({ entryTypes: ['first-contentful-paint'] });
    this.observers.fcp = observer;
  }

  // Track Time to First Byte (TTFB)
  trackTTFB() {
    if (!this.isSupported) return;const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          this.metrics.ttfb = {
            value: entry.responseStart - entry.requestStart,
            timestamp: Date.now()
          };
          
          console.log('📊 TTFB:', this.metrics.ttfb);
          this.reportMetric('TTFB', this.metrics.ttfb);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
    this.observers.ttfb = observer;
  }

  // Track custom metrics
  trackCustomMetrics() {
    // Track time to navbar interactive
    this.trackNavbarInteractive();
    
    // Track time to content loaded
    this.trackContentLoaded();
    
    // Track time to full page ready
    this.trackPageReady();
  }

  // Track time to navbar interactive
  trackNavbarInteractive() {
    const startTime = performance.now();
    
    const checkNavbar = () => {
      const navbar = document.querySelector('.navbar-modern');
      if (navbar && navbar.querySelector('.nav-item')) {
        const timeToNavbar = performance.now() - startTime;
        
        this.metrics.navbarInteractive = {
          value: timeToNavbar,
          timestamp: Date.now()
        };
        
        console.log('📊 Navbar Interactive:', this.metrics.navbarInteractive);
        this.reportMetric('NavbarInteractive', this.metrics.navbarInteractive);
      } else {
        requestAnimationFrame(checkNavbar);
      }
    };
    
    checkNavbar();
  }

  // Track time to content loaded
  trackContentLoaded() {
    const startTime = performance.now();
    
    const checkContent = () => {
      const content = document.querySelector('.main-content');
      if (content && content.children.length > 0) {
        const timeToContent = performance.now() - startTime;
        
        this.metrics.contentLoaded = {
          value: timeToContent,
          timestamp: Date.now()
        };
        
        console.log('📊 Content Loaded:', this.metrics.contentLoaded);
        this.reportMetric('ContentLoaded', this.metrics.contentLoaded);
      } else {
        requestAnimationFrame(checkContent);
      }
    };
    
    checkContent();
  }

  // Track time to full page ready
  trackPageReady() {
    const startTime = performance.now();
    
    window.addEventListener('load', () => {
      const timeToReady = performance.now() - startTime;
      
      this.metrics.pageReady = {
        value: timeToReady,
        timestamp: Date.now()
      };
      
      console.log('📊 Page Ready:', this.metrics.pageReady);
      this.reportMetric('PageReady', this.metrics.pageReady);
    });
  }

  // Track resource timing
  trackResourceTiming() {
    if (!this.isSupported) return;const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.initiatorType === 'link' || entry.initiatorType === 'script') {
          const resourceMetric = {
            name: entry.name,
            type: entry.initiatorType,
            duration: entry.duration,
            size: entry.transferSize,
            timestamp: Date.now()
          };
          
          console.log('📊 Resource:', resourceMetric);
          this.reportMetric('Resource', resourceMetric);
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.resource = observer;
  }

  // Track navigation timing
  trackNavigationTiming() {
    if (!this.isSupported) return;const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          this.metrics.navigation = {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            domInteractive: entry.domInteractive,
            timestamp: Date.now()
          };
          
          console.log('📊 Navigation:', this.metrics.navigation);
          this.reportMetric('Navigation', this.metrics.navigation);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
    this.observers.navigation = observer;
  }

  // Report metric to analytics
  reportMetric(name, metric) {
    // Send to analytics service
    if (window.gtag) {
      gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: metric.value,
        metric_timestamp: metric.timestamp
      });
    }
    
    // Store locally
    this.storeMetric(name, metric);
    
    // Dispatch custom event
    const event = new CustomEvent('performanceMetric', {
      detail: { name, metric }
    });
    window.dispatchEvent(event);
  }

  // Store metric locally
  storeMetric(name, metric) {
    const stored = JSON.parse(localStorage.getItem('performance_metrics') || '{}');
    stored[name] = metric;
    localStorage.setItem('performance_metrics', JSON.stringify(stored));
  }

  // Get stored metrics
  getStoredMetrics() {
    return JSON.parse(localStorage.getItem('performance_metrics') || '{}');}

  // Get current metrics
  getCurrentMetrics() {
    return this.metrics;}

  // Get performance summary
  getPerformanceSummary() {
    const summary = {
      lcp: this.metrics.lcp?.value || 0,
      fid: this.metrics.fid?.value || 0,
      cls: this.metrics.cls?.value || 0,
      fcp: this.metrics.fcp?.value || 0,
      ttfb: this.metrics.ttfb?.value || 0,
      navbarInteractive: this.metrics.navbarInteractive?.value || 0,
      contentLoaded: this.metrics.contentLoaded?.value || 0,
      pageReady: this.metrics.pageReady?.value || 0
    };

    // Calculate performance score
    summary.score = this.calculatePerformanceScore(summary);
    
    return summary;}

  // Calculate performance score (0-100)
  calculatePerformanceScore(metrics) {
    let score = 100;
    
    // LCP scoring (0-2500ms is good)
    if (metrics.lcp > 2500) score -= 20;
    else if (metrics.lcp > 4000) score -= 40;
    
    // FID scoring (0-100ms is good)
    if (metrics.fid > 100) score -= 20;
    else if (metrics.fid > 300) score -= 40;
    
    // CLS scoring (0-0.1 is good)
    if (metrics.cls > 0.1) score -= 20;
    else if (metrics.cls > 0.25) score -= 40;
    
    // FCP scoring (0-1800ms is good)
    if (metrics.fcp > 1800) score -= 10;
    else if (metrics.fcp > 3000) score -= 20;
    
    // TTFB scoring (0-800ms is good)
    if (metrics.ttfb > 800) score -= 10;
    else if (metrics.ttfb > 1800) score -= 20;
    
    return Math.max(0, score);}

  // Disconnect all observers
  disconnect() {
    Object.values(this.observers).forEach(observer => {
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    });
  }

  // Export metrics for debugging
  exportMetrics() {
    const data = {
      current: this.metrics,
      stored: this.getStoredMetrics(),
      summary: this.getPerformanceSummary(),
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Performance Metrics Export:', data);
    return data;}
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}
