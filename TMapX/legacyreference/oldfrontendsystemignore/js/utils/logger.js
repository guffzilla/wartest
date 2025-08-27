/**
 * Centralized Logging Utility
 * 
 * This utility provides structured logging across the entire application,
 * replacing console statements with consistent, configurable logging.
 * 
 * Features:
 * - Configurable log levels
 * - Structured message formatting
 * - Performance monitoring
 * - Error tracking
 * - Development vs production modes
 */

class Logger {
  constructor(options = {}) {
    this.options = {
      level: options.level || 'info',
      enableConsole: options.enableConsole !== false,
      enableRemote: options.enableRemote || false,
      remoteEndpoint: options.remoteEndpoint || '/api/logs',
      maxLogs: options.maxLogs || 1000,
      ...options
    };

    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };

    this.logs = [];
    this.performanceMarks = new Map();
    
    // Initialize based on environment
    this.initialize();
  }

  /**
   * Initialize logger based on environment
   */
  initialize() {
    // Set log level based on environment
    if (typeof window !== 'undefined') {
      // Browser environment
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.options.level = 'debug';
      } else if (window.location.hostname.includes('dev') || window.location.hostname.includes('staging')) {
        this.options.level = 'info';
      } else {
        this.options.level = 'warn'; // Production
      }
    }

    // Override with localStorage if available
    if (typeof localStorage !== 'undefined') {
      const storedLevel = localStorage.getItem('logLevel');
      if (storedLevel && this.logLevels.hasOwnProperty(storedLevel)) {
        this.options.level = storedLevel;
      }
    }

    // Log initialization
    this.info('Logger initialized', { level: this.options.level, environment: this.getEnvironment() });
  }

  /**
   * Get current environment
   */
  getEnvironment() {
    if (typeof window === 'undefined') return 'node';if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return 'development';if (window.location.hostname.includes('dev') || window.location.hostname.includes('staging')) return 'staging';return 'production';}

  /**
   * Check if log level should be displayed
   */
  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.options.level];}

  /**
   * Format log message
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelEmoji = this.getLevelEmoji(level);
    const formattedMessage = `${levelEmoji} ${message}`;
    
    return {
      timestamp,
      level,
      message: formattedMessage,
      data,
      environment: this.getEnvironment(),
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    };}

  /**
   * Get emoji for log level
   */
  getLevelEmoji(level) {
    const emojis = {
      error: '❌',
      warn: '⚠️',
      info: '💬',
      debug: '🔍',
      trace: '🔬'
    };
    return emojis[level] || '📝';}

  /**
   * Store log entry
   */
  storeLog(logEntry) {
    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.options.maxLogs) {
      this.logs = this.logs.slice(-this.options.maxLogs);
    }

    // Send to remote endpoint if enabled
    if (this.options.enableRemote && this.options.remoteEndpoint) {
      this.sendToRemote(logEntry);
    }
  }

  /**
   * Send log to remote endpoint
   */
  async sendToRemote(logEntry) {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch(this.options.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(logEntry)
        });
      }
    } catch (error) {
      // Silently fail for remote logging to avoid breaking the app
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  /**
   * Log error messages
   */
  error(message, data = null) {
    if (!this.shouldLog('error')) return;const logEntry = this.formatMessage('error', message, data);
    this.storeLog(logEntry);
    
    if (this.options.enableConsole) {
      console.error(logEntry.message, data || '');
    }
  }

  /**
   * Log warning messages
   */
  warn(message, data = null) {
    if (!this.shouldLog('warn')) return;const logEntry = this.formatMessage('warn', message, data);
    this.storeLog(logEntry);
    
    if (this.options.enableConsole) {
      console.warn(logEntry.message, data || '');
    }
  }

  /**
   * Log info messages
   */
  info(message, data = null) {
    if (!this.shouldLog('info')) return;const logEntry = this.formatMessage('info', message, data);
    this.storeLog(logEntry);
    
    if (this.options.enableConsole) {
      console.log(logEntry.message, data || '');
    }
  }

  /**
   * Log debug messages
   */
  debug(message, data = null) {
    if (!this.shouldLog('debug')) return;const logEntry = this.formatMessage('debug', message, data);
    this.storeLog(logEntry);
    
    if (this.options.enableConsole) {
      console.log(logEntry.message, data || '');
    }
  }

  /**
   * Log trace messages (most verbose)
   */
  trace(message, data = null) {
    if (!this.shouldLog('trace')) return;const logEntry = this.formatMessage('trace', message, data);
    this.storeLog(logEntry);
    
    if (this.options.enableConsole) {
      console.log(logEntry.message, data || '');
    }
  }

  /**
   * Log success messages (alias for info with success emoji)
   */
  success(message, data = null) {
    if (!this.shouldLog('info')) return;const logEntry = this.formatMessage('info', `✅ ${message}`, data);
    this.storeLog(logEntry);
    
    if (this.options.enableConsole) {
      console.log(logEntry.message, data || '');
    }
  }

  /**
   * Performance monitoring
   */
  time(label) {
    if (!this.shouldLog('debug')) return;this.performanceMarks.set(label, performance.now());
    if (this.options.enableConsole) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (!this.shouldLog('debug')) return;const startTime = this.performanceMarks.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.performanceMarks.delete(label);
      
      this.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`);
      
      if (this.options.enableConsole) {
        console.timeEnd(label);
      }
    }
  }

  /**
   * Group related logs
   */
  group(label) {
    if (this.options.enableConsole) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.options.enableConsole) {
      console.groupEnd();
    }
  }

  /**
   * Get all stored logs
   */
  getLogs(level = null, limit = null) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;}

  /**
   * Clear stored logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);}

  /**
   * Set log level
   */
  setLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.options.level = level;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('logLevel', level);
      }
      this.info('Log level changed', { newLevel: level });
    } else {
      this.warn('Invalid log level', { level, validLevels: Object.keys(this.logLevels) });
    }
  }

  /**
   * Get current log level
   */
  getLevel() {
    return this.options.level;}

  /**
   * Enable/disable console logging
   */
  setConsoleEnabled(enabled) {
    this.options.enableConsole = enabled;
    this.info('Console logging toggled', { enabled });
  }

  /**
   * Enable/disable remote logging
   */
  setRemoteEnabled(enabled) {
    this.options.enableRemote = enabled;
    this.info('Remote logging toggled', { enabled });
  }
}

// Create global logger instance
const globalLogger = new Logger();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
  module.exports.globalLogger = globalLogger;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.logger = globalLogger;
  
  // Also expose as a global function for backward compatibility
  window.log = {
    error: (...args) => globalLogger.error(...args),
    warn: (...args) => globalLogger.warn(...args),
    info: (...args) => globalLogger.info(...args),
    debug: (...args) => globalLogger.debug(...args),
    trace: (...args) => globalLogger.trace(...args),
    success: (...args) => globalLogger.success(...args),
    time: (...args) => globalLogger.time(...args),
    timeEnd: (...args) => globalLogger.timeEnd(...args),
    group: (...args) => globalLogger.group(...args),
    groupEnd: (...args) => globalLogger.groupEnd(...args)
  };
}

export { Logger, globalLogger };
export default globalLogger;
