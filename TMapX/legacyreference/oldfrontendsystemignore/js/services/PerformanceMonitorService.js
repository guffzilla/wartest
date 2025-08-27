/**
 * PHASE 3 OPTIMIZATION: Performance Monitoring & Metrics
 * 
 * Features:
 * - API call performance tracking (response times, success rates)
 * - User experience metrics (perceived performance improvements)
 * - Resource usage optimization (memory and network usage)
 * - Real-time performance dashboard
 * - Performance alerts and recommendations
 */

class PerformanceMonitorService {
  constructor() {
    this.metrics = {
      api: {
        calls: 0,
        totalTime: 0,
        averageTime: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        responseTimes: [],
        endpoints: new Map()
      },
      userExperience: {
        pageLoadTime: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        gameTypeSwitchTime: 0,
        searchResponseTime: 0,
        interactions: []
      },
      resources: {
        memoryUsage: 0,
        networkRequests: 0,
        cacheHitRate: 0,
        bandwidthUsage: 0,
        domNodes: 0
      },
      performance: {
        fps: 0,
        frameTime: 0,
        jank: 0,
        smoothness: 0
      }
    };
    
    this.config = {
      enabled: true,
      samplingRate: 0.1, // Sample 10% of operations
      maxDataPoints: 1000,
      alertThresholds: {
        apiResponseTime: 2000, // 2 seconds
        pageLoadTime: 3000,    // 3 seconds
        memoryUsage: 50,       // 50MB
        errorRate: 0.05        // 5%
      },
      enableRealTime: true,
      enableAlerts: true,
      enableReporting: true
    };
    
    this.alerts = [];
    this.observers = new Map();
    this.performanceObserver = null;
    
    this.customMetrics = new Map();
    this.apiRequestMap = new Map();
    this.initializeMonitoring();
  }
  
  /**
   * Initialize performance monitoring
   */
  initializeMonitoring() {
    console.log('📊 Initializing Performance Monitor Service...');
    
    // Set up performance observers
    this.setupPerformanceObservers();
    
    // Set up API monitoring
    this.setupAPIMonitoring();
    
    // Set up user interaction monitoring
    this.setupInteractionMonitoring();
    
    // Set up periodic metrics collection
    this.startPeriodicCollection();
    
    // Set up real-time monitoring if enabled
    if (this.config.enableRealTime) {
      this.startRealTimeMonitoring();
    }
    
    console.log('✅ Performance Monitor Service initialized');
  }

  /**
   * Register a custom metric definition
   */
  registerCustomMetric(name, definition) {
    try {
      if (!name) return;const safeDefinition = {
        description: definition?.description || '',
        unit: definition?.unit || '',
        category: definition?.category || 'custom',
        value: definition?.value || 0,
        samples: [],
        lastUpdated: Date.now()
      };
      this.customMetrics.set(name, safeDefinition);
      return true;} catch (e) {
      console.warn('⚠️ Failed to register custom metric', name, e);
      return false;}
  }

  /**
   * Update a custom metric value (optionally recording a sample)
   */
  updateCustomMetric(name, value, recordSample = false) {
    if (!this.customMetrics.has(name)) return false;const metric = this.customMetrics.get(name);
    metric.value = value;
    metric.lastUpdated = Date.now();
    if (recordSample) {
      metric.samples.push({ value, ts: Date.now() });
      if (metric.samples.length > (this.config.maxDataPoints || 1000)) {
        metric.samples.shift();
      }
    }
    return true;}

  /**
   * Get core metrics snapshot
   */
  getMetrics() {
    return {
      api: {
        calls: this.metrics.api.calls,
        averageResponseTime: this.metrics.api.averageTime,
        successCount: this.metrics.api.successCount,
        errorCount: this.metrics.api.errorCount,
        successRate: this.metrics.api.successRate
      },
      userExperience: this.metrics.userExperience,
      resources: this.metrics.resources,
      performance: this.metrics.performance,
      custom: Object.fromEntries(
        Array.from(this.customMetrics.entries()).map(([k, v]) => [k, {
          description: v.description,
          unit: v.unit,
          category: v.category,
          value: v.value,
          lastUpdated: v.lastUpdated
        }])
      )
    };}

  /**
   * Get alerts list
   */
  getAlerts() {
    return [...this.alerts];}

  /**
   * Get custom metrics definitions
   */
  getCustomMetrics() {
    return Object.fromEntries(this.customMetrics);}

  /**
   * Track request lifecycle (explicit hooks used by services)
   */
  trackAPIRequestStart(requestId, endpoint, params) {
    try {
      if (!requestId) return;this.apiRequestMap.set(requestId, { start: performance.now(), endpoint, params });
    } catch (_) {}
  }

  trackAPIRequestSuccess(requestId, endpoint, duration, _data) {
    try {
      // Prefer measured duration if available
      let measured = duration;
      const rec = this.apiRequestMap.get(requestId);
      if (rec && typeof rec.start === 'number') {
        measured = performance.now() - rec.start;
      }
      this.trackAPICall(endpoint || rec?.endpoint || 'unknown', measured || 0, true, 200);
    } catch (_) {}
    finally {
      this.apiRequestMap.delete(requestId);
    }
  }

  trackAPIRequestError(requestId, endpoint, duration, error) {
    try {
      let measured = duration;
      const rec = this.apiRequestMap.get(requestId);
      if (rec && typeof rec.start === 'number') {
        measured = performance.now() - rec.start;
      }
      const status = (error && typeof error.status === 'number') ? error.status : 0;
      this.trackAPICall(endpoint || rec?.endpoint || 'unknown', measured || 0, false, status, error?.message || String(error));
    } catch (_) {}
    finally {
      this.apiRequestMap.delete(requestId);
    }
  }
  
  /**
   * Set up performance observers for web vitals
   */
  setupPerformanceObservers() {
    try {
      // First Contentful Paint
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.userExperience.firstContentfulPaint = entry.startTime;
              console.log(`🎨 First Contentful Paint: ${entry.startTime}ms`);
            }
          }
        });
        
        this.performanceObserver.observe({ entryTypes: ['paint'] });
      }
      
      // Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.metrics.userExperience.largestContentfulPaint = entry.startTime;
            console.log(`📏 Largest Contentful Paint: ${entry.startTime}ms`);
          }
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      }
      
      // Layout Shift
      if ('PerformanceObserver' in window) {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.metrics.userExperience.cumulativeLayoutShift += entry.value;
            console.log(`📐 Layout Shift: ${entry.value}`);
          }
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      }
      
    } catch (error) {
      console.warn('⚠️ Performance observers not supported:', error);
    }
  }
  
  /**
   * Set up API call monitoring
   */
  setupAPIMonitoring() {
    // Override fetch to monitor API calls
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = function(...args) {
      const startTime = performance.now();
      const url = args[0];
      
      return originalFetch.apply(this, args).then(response => {
        const endTime = performance.now();const duration = endTime - startTime;
        
        self.trackAPICall(url, duration, response.ok, response.status);
        
        return response;}).catch(error => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        self.trackAPICall(url, duration, false, 0, error.message);
        
        throw error;
      });
    };
    
    console.log('🔍 API monitoring enabled');
  }
  
  /**
   * Set up user interaction monitoring
   */
  setupInteractionMonitoring() {
    // Monitor game type switches
    this.observeEvent('gameTypeSwitch', (data) => {
      this.metrics.userExperience.gameTypeSwitchTime = data.duration || 0;
      this.trackInteraction('gameTypeSwitch', data);
    });
    
    // Monitor search interactions
    this.observeEvent('search', (data) => {
      this.metrics.userExperience.searchResponseTime = data.duration || 0;
      this.trackInteraction('search', data);
    });
    
    // Monitor page interactions
    this.observeEvent('pageInteraction', (data) => {
      this.trackInteraction('pageInteraction', data);
    });
    
    console.log('👆 Interaction monitoring enabled');
  }
  
  /**
   * Track API call performance
   */
  trackAPICall(url, duration, success, status, error = null) {
    if (!this.config.enabled) return;if (Math.random() > this.config.samplingRate) return;const endpoint = this.extractEndpoint(url);
    const apiData = {
      url,
      endpoint,
      duration,
      success,
      status,
      error,
      timestamp: Date.now()
    };
    
    // Update global metrics
    this.metrics.api.calls++;
    this.metrics.api.totalTime += duration;
    this.metrics.api.averageTime = this.metrics.api.totalTime / this.metrics.api.calls;
    
    if (success) {
      this.metrics.api.successCount++;
    } else {
      this.metrics.api.errorCount++;
    }
    
    this.metrics.api.successRate = this.metrics.api.successCount / this.metrics.api.calls;
    
    // Store response time
    this.metrics.api.responseTimes.push(duration);
    if (this.metrics.api.responseTimes.length > this.config.maxDataPoints) {
      this.metrics.api.responseTimes.shift();
    }
    
    // Update endpoint-specific metrics
    if (!this.metrics.api.endpoints.has(endpoint)) {
      this.metrics.api.endpoints.set(endpoint, {
        calls: 0,
        totalTime: 0,
        averageTime: 0,
        successCount: 0,
        errorCount: 0
      });
    }
    
    const endpointMetrics = this.metrics.api.endpoints.get(endpoint);
    endpointMetrics.calls++;
    endpointMetrics.totalTime += duration;
    endpointMetrics.averageTime = endpointMetrics.totalTime / endpointMetrics.calls;
    
    if (success) {
      endpointMetrics.successCount++;
    } else {
      endpointMetrics.errorCount++;
    }
    
    // Check for performance alerts
    this.checkPerformanceAlerts('api', apiData);
    
    console.log(`📡 API Call: ${endpoint} - ${duration.toFixed(2)}ms - ${success ? '✅' : '❌'}`);
  }
  
  /**
   * Track user interactions
   */
  trackInteraction(type, data) {
    if (!this.config.enabled) return;const interaction = {
      type,
      data,
      timestamp: Date.now(),
      performance: {
        memory: this.getMemoryUsage(),
        domNodes: this.getDOMNodeCount()
      }
    };
    
    this.metrics.userExperience.interactions.push(interaction);
    
    // Keep only recent interactions
    if (this.metrics.userExperience.interactions.length > this.config.maxDataPoints) {
      this.metrics.userExperience.interactions.shift();
    }
    
    console.log(`👆 Interaction tracked: ${type}`);
  }
  
  /**
   * Start periodic metrics collection
   */
  startPeriodicCollection() {
    setInterval(() => {
      this.collectMetrics();
    }, 5000); // Every 5 seconds
    
    console.log('⏰ Periodic metrics collection started');
  }
  
  /**
   * Collect current metrics
   */
  collectMetrics() {
    // Memory usage
    this.metrics.resources.memoryUsage = this.getMemoryUsage();
    
    // DOM node count
    this.metrics.resources.domNodes = this.getDOMNodeCount();
    
    // Cache hit rate (if AdvancedCacheService is available and supports stats)
    try {
      if (
        window.AdvancedCacheService &&
        typeof window.AdvancedCacheService.getCacheStats === 'function'
      ) {
        const cacheStats = window.AdvancedCacheService.getCacheStats();
        this.metrics.resources.cacheHitRate = parseFloat(cacheStats.hitRate) || 0;
      }
    } catch (_) {
      // ignore if not available
    }
    
    // Performance metrics
    this.metrics.performance.fps = this.calculateFPS();
    this.metrics.performance.frameTime = this.calculateFrameTime();
    
    // Check for resource alerts
    this.checkPerformanceAlerts('resources', this.metrics.resources);
    
    console.log('📊 Metrics collected');
  }
  
  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    if (!this.config.enableRealTime) return;let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        this.metrics.performance.fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
    
    console.log('🎬 Real-time monitoring started');
  }
  
  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(category, data) {
    if (!this.config.enableAlerts) return;const alerts = [];
    
    switch (category) {
      case 'api':
        if (data.duration > this.config.alertThresholds.apiResponseTime) {
          alerts.push({
            level: 'warning',
            category: 'api',
            message: `Slow API response: ${data.endpoint} took ${data.duration.toFixed(2)}ms`,
            data: data
          });
        }
        
        // Only alert after a minimum number of calls to avoid noisy early warnings
        if (
          this.metrics.api.calls >= 10 &&
          this.metrics.api.successRate < (1 - this.config.alertThresholds.errorRate)
        ) {
          alerts.push({
            level: 'error',
            category: 'api',
            message: `High API error rate: ${(this.metrics.api.successRate * 100).toFixed(1)}%`,
            data: { successRate: this.metrics.api.successRate }
          });
        }
        break;
        
      case 'resources':
        if (this.metrics.resources.memoryUsage > this.config.alertThresholds.memoryUsage) {
          alerts.push({
            level: 'warning',
            category: 'resources',
            message: `High memory usage: ${this.metrics.resources.memoryUsage.toFixed(2)}MB`,
            data: { memoryUsage: this.metrics.resources.memoryUsage }
          });
        }
        break;
    }
    
    // Add new alerts
    this.alerts.push(...alerts);
    
    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Log alerts
    alerts.forEach(alert => {
      console.warn(`🚨 ${alert.level.toUpperCase()}: ${alert.message}`);
    });
  }
  
  /**
   * Get memory usage (if available)
   */
  getMemoryUsage() {
    if ('memory' in performance) {
      return (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);}
    return 0;}
  
  /**
   * Get DOM node count
   */
  getDOMNodeCount() {
    return document.querySelectorAll('*').length;}
  
  /**
   * Calculate FPS
   */
  calculateFPS() {
    return this.metrics.performance.fps;}
  
  /**
   * Calculate frame time
   */
  calculateFrameTime() {
    if (this.metrics.performance.fps > 0) {
      return (1000 / this.metrics.performance.fps).toFixed(2);}
    return 0;}
  
  /**
   * Extract endpoint from URL
   */
  extractEndpoint(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;} catch {
      return url;}
  }
  
  /**
   * Observe custom events
   */
  observeEvent(eventName, callback) {
    if (!this.observers.has(eventName)) {
      this.observers.set(eventName, []);
    }
    
    this.observers.get(eventName).push(callback);
    
    // Listen for the event
    document.addEventListener(eventName, (event) => {
      this.observers.get(eventName).forEach(cb => cb(event.detail));
    });
  }
  
  /**
   * Emit custom event
   */
  emitEvent(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data });
    document.dispatchEvent(event);
  }
  
  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    return {
      summary: {
        overallScore: this.calculateOverallScore(),
        recommendations: this.generateRecommendations(),
        status: this.getPerformanceStatus()
      },
      metrics: this.metrics,
      alerts: this.alerts,
      timestamp: Date.now()
    };}
  
  /**
   * Calculate overall performance score
   */
  calculateOverallScore() {
    let score = 100;
    
    // API performance (40% weight)
    const apiScore = Math.max(0, 100 - (this.metrics.api.averageTime / 100));
    score -= (100 - apiScore) * 0.4;
    
    // User experience (30% weight)
    const uxScore = Math.max(0, 100 - (this.metrics.userExperience.pageLoadTime / 50));
    score -= (100 - uxScore) * 0.3;
    
    // Resource usage (20% weight)
    const resourceScore = Math.max(0, 100 - (this.metrics.resources.memoryUsage / 2));
    score -= (100 - resourceScore) * 0.2;
    
    // Cache efficiency (10% weight)
    score -= (100 - this.metrics.resources.cacheHitRate) * 0.1;
    
    return Math.max(0, Math.round(score));}
  
  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.api.averageTime > 1000) {
      recommendations.push('Consider implementing API response caching');
    }
    
    if (this.metrics.resources.memoryUsage > 30) {
      recommendations.push('Monitor memory usage and consider cleanup strategies');
    }
    
    if (this.metrics.resources.cacheHitRate < 70) {
      recommendations.push('Optimize cache strategies for better hit rates');
    }
    
    if (this.metrics.userExperience.pageLoadTime > 2000) {
      recommendations.push('Implement lazy loading and code splitting');
    }
    
    return recommendations;}
  
  /**
   * Get performance status
   */
  getPerformanceStatus() {
    const score = this.calculateOverallScore();
    
    if (score >= 90) return 'excellent';if (score >= 75) return 'good';if (score >= 60) return 'fair';return 'poor';}
  
  /**
   * Export metrics for external analysis
   */
  exportMetrics() {
    return JSON.stringify(this.getPerformanceReport(), null, 2);}
  
  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      api: {
        calls: 0,
        totalTime: 0,
        averageTime: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        responseTimes: [],
        endpoints: new Map()
      },
      userExperience: {
        pageLoadTime: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        gameTypeSwitchTime: 0,
        searchResponseTime: 0,
        interactions: []
      },
      resources: {
        memoryUsage: 0,
        networkRequests: 0,
        cacheHitRate: 0,
        bandwidthUsage: 0,
        domNodes: 0
      },
      performance: {
        fps: 0,
        frameTime: 0,
        jank: 0,
        smoothness: 0
      }
    };
    
    this.alerts = [];
    
    console.log('🔄 Performance metrics reset');
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Performance monitor configuration updated:', this.config);
  }
  
  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      metrics: {
        apiCalls: this.metrics.api.calls,
        averageResponseTime: this.metrics.api.averageTime.toFixed(2),
        successRate: (this.metrics.api.successRate * 100).toFixed(1) + '%',
        memoryUsage: this.metrics.resources.memoryUsage + 'MB',
        overallScore: this.calculateOverallScore()
      },
      alerts: this.alerts.length,
      config: this.config
    };}
}

// Static singleton helpers and proxy API to support both instance and static usage
PerformanceMonitorService.ensure = function ensure() {
  if (typeof window !== 'undefined') {
    if (!window.__perfMonitorInstance) {
      try {
        window.__perfMonitorInstance = new PerformanceMonitorService();
      } catch (e) {
        console.warn('⚠️ Failed to create PerformanceMonitorService instance', e);
      }
    }
    return window.__perfMonitorInstance;}
  if (!global.__perfMonitorInstance) {
    global.__perfMonitorInstance = new PerformanceMonitorService();
  }
  return global.__perfMonitorInstance;};

['trackAPIRequestStart','trackAPIRequestSuccess','trackAPIRequestError','registerCustomMetric','updateCustomMetric','getMetrics','getAlerts','getCustomMetrics']
  .forEach((method) => {
    if (!PerformanceMonitorService[method]) {
      PerformanceMonitorService[method] = function(...args) {
        const inst = PerformanceMonitorService.ensure();
        if (inst && typeof inst[method] === 'function') {
          return inst[method](...args);}
        return undefined;};
    }
  });

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitorService;
} else {
  window.PerformanceMonitorService = PerformanceMonitorService;
}
