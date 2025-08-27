const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const session = require('express-session');
require('dotenv').config();
const passport = require('./config/passport');
const MongoStore = require('connect-mongo');
const http = require('http');
const { initChatServer } = require('./socket/chatServer');
const cors = require('cors');
const CronJob = require('cron').CronJob;
const { checkAllLiveStatus } = require('./services/streamChecker');
const cron = require('node-cron');
const profileImageService = require('./services/profileImageService');
const subscriptionScheduler = require('./services/subscriptionScheduler');

// Log environment variables (just for visibility) - DISABLED for performance
// console.log('Environment Variables:', {
//   GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'PRESENT' : 'MISSING',
//   GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'PRESENT' : 'MISSING',
//   GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'MISSING',
//   MONGODB_URI: process.env.MONGODB_URI || 'MISSING',
//   TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ? 'PRESENT' : 'MISSING',
//   TWITCH_ACCESS_TOKEN: process.env.TWITCH_ACCESS_TOKEN ? 'PRESENT' : 'MISSING',
//   YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ? 'PRESENT' : 'MISSING'
// });

const app = express();

// Enhanced console log system with deduplication and filtering
const __clientLogBuffer = [];
const __maxClientLogs = 500;
const __logCounter = new Map(); // Track duplicate messages

// Backend log capture system - will be initialized after socket.io setup
let originalConsoleLog, originalConsoleWarn, originalConsoleError;
let sendToClientLog;

function createLogKey(level, page, msgs, user) {
  const username = user?.username || 'backend';
  const messageText = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
  return `${level}:${page}:${username}:${messageText}`;
}

function addToLogBuffer(logEntry) {
  const key = createLogKey(logEntry.level, logEntry.page, logEntry.msgs, logEntry.user);
  
  // Check if this is a duplicate
  if (__logCounter.has(key)) {
    const existing = __logCounter.get(key);
    existing.count++;
    existing.lastSeen = new Date().toISOString();
    return existing;
  }
  
  // Add new log entry
  const newEntry = {
    ...logEntry,
    count: 1,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    id: Date.now() + Math.random() // Unique ID for tracking
  };
  
  __logCounter.set(key, newEntry);
  __clientLogBuffer.push(newEntry);
  
  // Maintain buffer size
  if (__clientLogBuffer.length > __maxClientLogs) {
    const removed = __clientLogBuffer.shift();
    const removedKey = createLogKey(removed.level, removed.page, removed.msgs, removed.user);
    __logCounter.delete(removedKey);
  }
  
  return newEntry;
}

function initializeBackendLogCapture() {
  originalConsoleLog = console.log;
  originalConsoleWarn = console.warn;
  originalConsoleError = console.error;

  sendToClientLog = function(level, ...args) {
    try {
      // Get socket.io instance from the app
      const io = app.get('io');
      if (io) {
        const logEntry = {
          level,
          page: 'backend',
          ts: new Date().toISOString(),
          msgs: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)),
          user: null
        };
        
        const processedEntry = addToLogBuffer(logEntry);
        
        // Broadcast to admin users (those in admin room)
        io.to('admin').emit('client-log', processedEntry);
      }
    } catch (e) {
      // Fallback to original console if socket not available
    }
  };

  // Override console methods to capture backend logs - DISABLED for performance
  // console.log = function(...args) {
  //   originalConsoleLog.apply(console, args);
  //   sendToClientLog('log', ...args);
  // };

  // console.warn = function(...args) {
  //   originalConsoleWarn.apply(console, args);
  //   sendToClientLog('warn', ...args);
  // };

  // console.error = function(...args) {
  //   originalConsoleError.apply(console, args);
  //   sendToClientLog('error', ...args);
  // };
}

// Enhanced logging system for AI assistant access

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// AI Assistant Log File
const aiLogFile = path.join(logsDir, 'ai-assistant-logs.jsonl');

// Function to write structured logs for AI assistant
function writeAILog(level, source, message, data = null, user = null) {
  try {
    // Use process.stdout.write to avoid recursion with console.log
    process.stdout.write(`🤖 writeAILog: ${level} | ${source} | ${message.substring(0, 50)}...\n`);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level, // 'log', 'warn', 'error', 'info'
      source: source, // 'frontend', 'backend', 'system'
      message: message,
      data: data,
      user: user ? {
        id: user.id || user._id,
        username: user.username
      } : null,
      page: data?.page || null,
      session: data?.session || null
    };

    // Write to JSONL file (one JSON object per line)
    fs.appendFileSync(aiLogFile, JSON.stringify(logEntry) + '\n');
    process.stdout.write(`✅ Log written to AI file: ${aiLogFile}\n`);
    
    // Keep file size manageable (max 10MB)
    const stats = fs.statSync(aiLogFile);
    if (stats.size > 10 * 1024 * 1024) { // 10MB
      // Read all lines and keep only the last 1000
      const lines = fs.readFileSync(aiLogFile, 'utf8').split('\n').filter(line => line.trim());
      const recentLines = lines.slice(-1000);
      fs.writeFileSync(aiLogFile, recentLines.join('\n') + '\n');
      process.stdout.write(`📦 AI log file trimmed to last 1000 lines\n`);
    }
  } catch (error) {
    process.stderr.write(`❌ Error in writeAILog: ${error}\n`);
  }
}

// Enhanced console log capture for AI assistant
function initializeAILogCapture() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };

  console.log = function(...args) {
    originalConsole.log.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    // Prevent recursion by checking if this is already a writeAILog call
    if (!message.includes('writeAILog')) {
      writeAILog('log', 'backend', message, { args });
    }
  };

  console.warn = function(...args) {
    originalConsole.warn.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    // Prevent recursion by checking if this is already a writeAILog call
    if (!message.includes('writeAILog')) {
      writeAILog('warn', 'backend', message, { args });
    }
  };

  console.error = function(...args) {
    originalConsole.error.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    // Prevent recursion by checking if this is already a writeAILog call
    if (!message.includes('writeAILog')) {
      writeAILog('error', 'backend', message, { args });
    }
  };

  console.info = function(...args) {
    originalConsole.info.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    // Prevent recursion by checking if this is already a writeAILog call
    if (!message.includes('writeAILog')) {
      writeAILog('info', 'backend', message, { args });
    }
  };

  console.log('🤖 AI Assistant logging system initialized');
}

// Admin middleware
const { requireAdminOrModerator } = require('./middleware/auth');

// Debug middleware to log all requests - DISABLED for performance
// Uncomment the lines below if you need to debug request issues
/*
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
*/

// Dev no-cache headers for hot reload - only for static assets and specific HTML files
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    // Only apply cache busting to static assets and specific HTML files
    // Skip API routes, authentication, and user-specific pages that need session persistence
    const isStaticAsset = req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i);
    const isDevelopmentHtmlPage = req.path === '/' || req.path === '/admin.html' || req.path === '/views/hero.html';
    const isApiRoute = req.path.startsWith('/api/') || req.path.startsWith('/auth/') || req.path === '/client-log';
    const isUserPage = req.path === '/myprofile' || req.path === '/views/townhall.html' || req.path.startsWith('/player');
    
    // Apply cache busting only to static assets and development pages, NOT user pages
    if ((isStaticAsset || isDevelopmentHtmlPage) && !isApiRoute && !isUserPage) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
    }
    next();
  });
}

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost',
  'http://127.0.0.1'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches any allowed origin
    const isAllowed = allowedOrigins.some(allowed => {
      // Allow partial matches (e.g., http://localhost matches http://localhost:3000)
      return origin.startsWith(allowed);
    });

    if (!isAllowed) {
      console.warn('CORS blocked request from origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Enhanced client log endpoint with deduplication - will be moved after session middleware

// Enhanced client logs API with filtering and sorting
app.get('/api/dev/client-logs', requireAdminOrModerator, (req, res) => {
  try {
    const { 
      level, 
      username, 
      page, 
      search, 
      sortBy = 'lastSeen', 
      sortOrder = 'desc',
      limit = 200 
    } = req.query;

    let filteredLogs = [...__clientLogBuffer];

    // Filter by log level
    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    // Filter by username
    if (username) {
      filteredLogs = filteredLogs.filter(log => {
        const logUsername = log.user?.username || 'backend';
        return logUsername.toLowerCase().includes(username.toLowerCase());
      });
    }

    // Filter by page
    if (page) {
      filteredLogs = filteredLogs.filter(log => 
        log.page && log.page.toLowerCase().includes(page.toLowerCase())
      );
    }

    // Search in messages
    if (search) {
      filteredLogs = filteredLogs.filter(log => {
        const messageText = Array.isArray(log.msgs) ? log.msgs.join(' ') : String(log.msgs);
        return messageText.toLowerCase().includes(search.toLowerCase());
      });
    }

    // Sort logs
    filteredLogs.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'username':
          aValue = (a.user?.username || 'backend').toLowerCase();
          bValue = (b.user?.username || 'backend').toLowerCase();
          break;
        case 'level':
          aValue = a.level;
          bValue = b.level;
          break;
        case 'page':
          aValue = a.page || '';
          bValue = b.page || '';
          break;
        case 'count':
          aValue = a.count || 1;
          bValue = b.count || 1;
          break;
        case 'firstSeen':
          aValue = new Date(a.firstSeen || a.ts);
          bValue = new Date(b.firstSeen || b.ts);
          break;
        case 'lastSeen':
        default:
          aValue = new Date(a.lastSeen || a.ts);
          bValue = new Date(b.lastSeen || b.ts);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply limit
    const limitedLogs = filteredLogs.slice(0, parseInt(limit));

    // Get statistics
    const stats = {
      total: __clientLogBuffer.length,
      filtered: filteredLogs.length,
      returned: limitedLogs.length,
      byLevel: {
        log: filteredLogs.filter(l => l.level === 'log').length,
        warn: filteredLogs.filter(l => l.level === 'warn').length,
        error: filteredLogs.filter(l => l.level === 'error').length
      },
      byUser: {}
    };

    // Count by user
    filteredLogs.forEach(log => {
      const username = log.user?.username || 'backend';
      stats.byUser[username] = (stats.byUser[username] || 0) + 1;
    });

    res.json({ 
      count: __clientLogBuffer.length, 
      logs: limitedLogs,
      stats,
      filters: { level, username, page, search, sortBy, sortOrder, limit }
    });
  } catch (error) {
    console.error('Error in client logs API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download raw log file (ndjson)
app.get('/api/dev/client-logs/download', requireAdminOrModerator, (req, res) => {
  const filePath = path.join(__dirname, 'logs', 'client-logs.ndjson');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No log file yet' });
  }
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Content-Disposition', 'attachment; filename="client-logs.ndjson"');
  fs.createReadStream(filePath).pipe(res);
});

// Admin page to view client logs - now handled by admin.html
// app.get('/admin/client-logs', requireAdminOrModerator, (req, res) => {
//   res.sendFile(path.join(frontendPath, 'views/dev-console.html'));
// });

// Content Security Policy - TEMPORARILY DISABLED for Square payment testing
// TODO: Re-enable with proper Square domains after payment testing is complete
/*
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sandbox.web.squarecdn.com https://web.squarecdn.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://pay.google.com https://js-sandbox.squarecdn.com https://js.afterpay.com; " +
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://sandbox.web.squarecdn.com https://web.squarecdn.com; " +
    "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net; " +
    "img-src 'self' data: blob: https: http:; " +
    "connect-src 'self' " +
      "https://*.googleapis.com " +
      "https://*.google.com " +
      "https://connect.squareupsandbox.com " +
      "https://connect.squareup.com " +
      "https://pci-connect.squareupsandbox.com " +
      "https://pci-connect.squareup.com " +
      "https://pay.google.com " +
      "https://google.com/pay " +
      "https://*.afterpay.com " +
      "https://*.clearpay.co.uk " +
      "https://o160250.ingest.sentry.io " +
      "https://*.ingest.sentry.io " +
      "wss: ws:; " +
    "frame-src 'self' https://sandbox.web.squarecdn.com https://web.squarecdn.com; " +
    "worker-src 'self' blob:; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );
  next();
});
*/

// Handle preflight requests
app.options('*', cors());

// ✅ MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite';
console.log('🔍 Attempting to connect to MongoDB with URI:', mongoURI);

// Configure Mongoose settings
mongoose.set('strictQuery', false); // Suppress deprecation warning
mongoose.set('bufferCommands', false); // Disable mongoose buffering

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds for server selection
  socketTimeoutMS: 45000, // 45 seconds for socket operations  
  connectTimeoutMS: 30000, // 30 seconds for initial connection
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  retryWrites: true, // Enable retryable writes
  heartbeatFrequencyMS: 10000 // Send a ping to check server every 10 seconds
})
  .then(async () => {
    console.log(`✅ Connected to MongoDB at: ${mongoURI}`);
    
    // List all collections to verify database structure
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('📋 Available collections:', collections.map(c => c.name));
      
      // Create sample data if database is empty
      await createSampleDataIfNeeded();
      
      // REMOVED: Startup profile image refresh to avoid quota exhaustion
      // Profile images will only be refreshed via the 30-minute cron job
      console.log('📸 Profile images will be refreshed every 30 minutes via cron job');
      
      // Start subscription scheduler
      console.log('🕐 Starting subscription billing scheduler...');
      subscriptionScheduler.start();
      
    } catch (err) {
      console.error('Error listing collections:', err);
    }
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.log('\n🔧 To fix this issue:');
    console.log('1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
    console.log('2. Or create a .env file with MONGODB_URI pointing to MongoDB Atlas');
    console.log('3. Or use Docker: docker run -d -p 27017:27017 mongo');
  });

// Function to create sample data if database is empty
async function createSampleDataIfNeeded() {
  try {
    const User = require('./models/User');
    const { createUserWithDefaults } = require('./utils/oauthHelper');
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('📝 Creating sample admin user...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = createUserWithDefaults({
        username: 'admin',
        email: 'admin@warcraftarena.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        isUsernameDefined: true // Admin user has username defined
      });
      
      await adminUser.save();
      console.log('✅ Sample admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}

// Middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup - Simplified and optimized
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/newsite',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: '/'
  }
}));

// Trust first proxy
if (isProduction) {
  app.set('trust proxy', 1);
}

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());



// Serve static files BEFORE authentication middleware
// Use path.join to handle both local and Docker environments
let frontendPath, uploadsPath;

// Check if we're in Docker (by checking if /app/frontend exists)
if (fs.existsSync('/app/frontend')) {
  // Docker environment
  frontendPath = '/app/frontend';
  uploadsPath = '/app/uploads';
} else {
  // Local development - uploads is in parent directory, not in backend
  frontendPath = path.join(__dirname, '../frontend');
  uploadsPath = path.join(__dirname, '../uploads');
}

console.log('Static file paths:', { frontendPath, uploadsPath });

app.use(express.static(frontendPath));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));

// Serve uploads with cache control for thumbnails
app.use('/uploads', (req, res, next) => {
  // Set no-cache headers for thumbnail images to prevent caching issues
  if (req.path.includes('thumbnails/') && req.path.endsWith('.png')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
}, express.static(uploadsPath));

app.use('/downloads', express.static(path.join(frontendPath, 'downloads')));
app.use('/views', express.static(path.join(frontendPath, 'views')));
app.use('/components', express.static(path.join(frontendPath, 'components')));
app.use('/js', express.static(path.join(frontendPath, 'js')));
app.use('/css', express.static(path.join(frontendPath, 'css')));
app.use('/frontend', express.static(frontendPath));

// Middleware
const { ensureSessionConsistency, requireUsername } = require('./middleware/auth');

// Apply session consistency middleware to ALL routes (after static files)
app.use(ensureSessionConsistency);

// Enhanced client log endpoint for AI assistant
app.post('/client-log', express.json({ limit: '100kb' }), (req, res) => {
  try {
    const { level, page, ts, msgs } = req.body;
    const stamp = ts || new Date().toISOString();

    // Limit message size to prevent massive log files
    const limitedMsgs = msgs.map(msg => {
      if (typeof msg === 'string') {
        return msg.length > 1000 ? msg.substring(0, 1000) + '...' : msg;
      }
      try {
        const stringified = JSON.stringify(msg);
        return stringified.length > 1000 ? stringified.substring(0, 1000) + '...' : stringified;
      } catch (e) {
        return String(msg).length > 1000 ? String(msg).substring(0, 1000) + '...' : String(msg);
      }
    });

    // Create log entry - now req.user should be available from session
    const logEntry = {
      level,
      page: page || null,
      ts: stamp,
      msgs: limitedMsgs,
      user: req.user ? { id: req.user._id, username: req.user.username } : null
    };

    // Write to AI assistant log file
    writeAILog(level, 'frontend', limitedMsgs.join(' '), {
      page: page,
      messages: limitedMsgs,
      timestamp: stamp
    }, req.user);

    // Add to buffer for real-time display
    const processedEntry = addToLogBuffer(logEntry);

    // Send to admin clients via Socket.io
    const io = app.get('io');
    if (io) {
      io.to('admin').emit('client-log', processedEntry);
    }

    // Persist to file (ndjson) with size limit
    try {
      const logFilePath = path.join(logsDir, 'client-logs.ndjson');
      
      const record = {
        ...logEntry,
        count: processedEntry.count,
        firstSeen: processedEntry.firstSeen,
        lastSeen: processedEntry.lastSeen
      };
      
      fs.appendFileSync(logFilePath, JSON.stringify(record) + '\n');
      
      // Keep file size manageable (max 10MB, keep last 1000 lines)
      const stats = fs.statSync(logFilePath);
      if (stats.size > 10 * 1024 * 1024) { // 10MB
        const lines = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(line => line.trim());
        const recentLines = lines.slice(-1000);
        fs.writeFileSync(logFilePath, recentLines.join('\n') + '\n');
      }
    } catch (e) {
      // non-fatal
    }

    res.json({ success: true, processed: processedEntry });
  } catch (error) {
    console.error('Error processing client log:', error);
    res.status(500).json({ error: 'Failed to process log' });
  }
});

// API endpoint for AI assistant to read logs
app.get('/api/ai/logs', (req, res) => {
  try {
    const { limit = 100, level, source, since } = req.query;
    
    if (!fs.existsSync(aiLogFile)) {
      return res.json({ logs: [], count: 0 });
    }

    const lines = fs.readFileSync(aiLogFile, 'utf8').split('\n').filter(line => line.trim());
    let logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    // Apply filters
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    if (source) {
      logs = logs.filter(log => log.source === source);
    }
    if (since) {
      const sinceDate = new Date(since);
      logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
    }

    // Apply limit and reverse to get most recent first
    logs = logs.slice(-parseInt(limit)).reverse();

    res.json({
      logs,
      count: logs.length,
      total: lines.length,
      filters: { level, source, since, limit }
    });
  } catch (error) {
    console.error('Error reading AI logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Initialize AI logging system
initializeAILogCapture();

// Routes
console.log('Loading routes...');
// Load centralized routes
const routes = require('./routes/index');

console.log('Registering routes...');
app.use('/', routes);
console.log('Routes registered');

// Add centralized error handling middleware
const { errorHandler } = require('./middleware/error-handler');
app.use(errorHandler);

// Create HTTP server
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Set up socket.io
const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Accept', 'Origin'],
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Initialize backend log capture now that socket.io is available - DISABLED for performance
// initializeBackendLogCapture();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  // Join user's room for private notifications
  socket.on('joinUserRoom', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their notification room`);
  });

  // Leave user's room
  socket.on('leaveUserRoom', (userId) => {
    socket.leave(userId);
    console.log(`User ${userId} left their notification room`);
  });

  // Join admin room for backend logs
  socket.on('joinAdminRoom', () => {
    socket.join('admin');
    console.log('Admin client joined admin room for backend logs');
    // Send buffered logs to the newly joined admin client
    socket.emit('client-log-history', __clientLogBuffer);
  });

  // Leave admin room
  socket.on('leaveAdminRoom', () => {
    socket.leave('admin');
    console.log('Admin client left admin room');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialize chat server
initChatServer(io);

// Apply username check middleware to protected routes
app.use('/forum', requireUsername);
app.use('/ladder', requireUsername);

app.get('/forum', (req, res) => {
  res.sendFile(path.join(frontendPath, 'views/forum.html'));
});

// Chat page
app.get('/chat', (req, res) => {
  res.sendFile(path.join(frontendPath, 'views/chat.html'));
});

app.get('/ladder', (req, res) => {
  res.sendFile(path.join(frontendPath, 'views/arena.html'));
});

// Profile page
app.get('/myprofile', (req, res) => {
  res.sendFile(path.join(frontendPath, 'views/townhall.html'));
});

// Player profile page
app.get('/player', (req, res) => {
  res.sendFile(path.join(frontendPath, 'views/player-profile.html'));
});



// Content page (formerly live streams)
app.get('/views/content.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'views/content.html'));
});

// Redirect old live routes to content
app.get('/live', (req, res) => {
  res.redirect('/views/content.html');
});

app.get('/views/live.html', (req, res) => {
  res.redirect('/views/content.html');
});

// Add channel page
app.get('/add-channel', (req, res) => {
  res.sendFile(path.join(frontendPath, 'views/add-channel.html'));
});



// Admin panel page
app.get('/admin.html', async (req, res) => {
  console.log('Admin panel access attempt:', {
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    hasUser: !!req.user,
    user: req.user ? { id: req.user._id, username: req.user.username, role: req.user.role } : null,
    session: req.session ? { isAuthenticated: req.session.isAuthenticated, userId: req.session.userId } : null
  });
  
  // Check for JWT authentication if session auth fails
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log('Session authentication failed, checking JWT...');
    
    // Check for JWT token in multiple places
    let authToken = req.cookies?.authToken || 
                    req.headers.authorization?.replace('Bearer ', '') ||
                    req.query.authToken;
    
    if (authToken) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key');
        console.log('🔓 JWT Decoded for admin access:', {
          userId: decoded.userId,
          username: decoded.username,
          type: decoded.type
        });
        
        if (decoded.type === 'web') {
          // Get fresh user data from database
          const User = require('./models/User');
          const user = await User.findById(decoded.userId).select('-password');
          if (user) {
            req.user = user;
            console.log(`🔐 JWT authenticated user for admin: ${user.username} (${user.role})`);
          } else {
            console.log('❌ JWT user not found in database for admin access');
          }
        }
      } catch (error) {
        console.log(`🔐 JWT auth failed for admin access: ${error.message}`);
        res.clearCookie('authToken');
      }
    }
  }
  
  // Check if user is authenticated (session OR JWT)
  if (!req.user) {
    console.log('User not authenticated (session or JWT), redirecting to login');
    return res.redirect('/views/login.html');
  }
  
  // Check if user has admin or moderator role
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    console.log('User does not have admin/moderator role, access denied');
    return res.status(403).send(`
      <html>
        <head>
          <title>Access Denied</title>
          <link rel="stylesheet" href="/css/warcraft-app-modern.css">
        </head>
        <body>
          <div style="text-align: center; padding: 2rem; max-width: 600px; margin: 2rem auto;">
            <h1>Access Denied</h1>
            <p>You don't have permission to access the admin panel.</p>
            <p>Current role: ${req.user.role}</p>
            <a href="/" class="btn btn-primary">Return to Home</a>
          </div>
        </body>
      </html>
    `);
  }
  
  console.log(`Admin panel access granted to ${req.user.username} (${req.user.role})`);
  const adminPath = path.join(frontendPath, 'admin.html');
  res.sendFile(adminPath, (err) => {
    if (err) {
      console.error('Error sending admin.html:', err);
      res.status(500).send('Error loading admin panel');
    }
  });
});

// Temporary admin test route (remove in production)
app.get('/admin-test', (req, res) => {
  const adminPath = path.join(frontendPath, 'admin.html');
  console.log('Admin test path:', adminPath);
  res.sendFile(adminPath, (err) => {
    if (err) {
      console.error('Error sending admin.html:', err);
      res.status(500).send('Error loading admin panel');
    }
  });
});

// Setup username route
app.get('/setup-username', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect('/views/login.html');
  }
  res.sendFile(path.join(frontendPath, 'views/setup-username.html'));
});

// Alias for setup-username (for backward compatibility)
app.get('/choose-username', (req, res) => {
  res.redirect('/setup-username');
});

// Strategic thumbnail generation API endpoint
app.get('/api/get-strategic-thumbnails', async (req, res) => {
  try {
    const mapNames = req.query.maps ? req.query.maps.split(',').map(name => name.trim()) : null;
    
    console.log(`🎯 Strategic thumbnails data API called`);
    if (mapNames) {
      console.log(`🎯 Specific maps requested: ${mapNames.join(', ')}`);
    }
    
    const fs = require('fs').promises;
    const path = require('path');
    
    // Check for existing strategic thumbnails
    const strategicDir = path.join(__dirname, '../uploads/thumbnails/strategic');
    
    try {
      await fs.access(strategicDir);
    } catch (error) {
      return res.status(404).json({ 
        success: false, 
        error: 'Strategic thumbnails directory not found',
        results: [] 
      });
    }
    
    const files = await fs.readdir(strategicDir);
    let strategicFiles = files.filter(f => f.toLowerCase().endsWith('_strategic.png'));
    
    if (strategicFiles.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No strategic thumbnails found',
        results: [] 
      });
    }
    
    // Filter by requested map names if provided
    if (mapNames && mapNames.length > 0) {
      strategicFiles = strategicFiles.filter(filename => {
        return mapNames.some(requestedName => {
          // Normalize both the filename and requested name for comparison
          const normalizeForComparison = (str) => {
            return str
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
              .trim();
          };
          
          // Get the base name from strategic filename (remove _strategic.png)
          const baseFileName = filename.replace('_strategic.png', '');
          
          const normalizedFilename = normalizeForComparison(baseFileName);
          const normalizedRequest = normalizeForComparison(requestedName);
          
          // Try exact match first
          if (normalizedFilename === normalizedRequest) {
            console.log(`✅ Exact match: "${filename}" matches "${requestedName}"`);
            return true;
          }
          
          // Try contains matching (both directions)
          if (normalizedFilename.includes(normalizedRequest) || normalizedRequest.includes(normalizedFilename)) {
            console.log(`✅ Contains match: "${filename}" matches "${requestedName}"`);
            return true;
          }
          
          // Try word-by-word matching for complex names
          const filenameWords = baseFileName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
          const requestWords = requestedName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
          
          // Check if most significant words match
          const matchingWords = requestWords.filter(word => 
            filenameWords.some(fileWord => fileWord.includes(word) || word.includes(fileWord))
          );
          
          if (matchingWords.length >= Math.min(2, requestWords.length)) {
            console.log(`✅ Word match: "${filename}" matches "${requestedName}" (${matchingWords.length}/${requestWords.length} words)`);
            return true;
          }
          
          return false;
        });
      });
      console.log(`🎯 Filtered to ${strategicFiles.length} strategic thumbnails matching requested names`);
    }
    
    const results = [];
    
    // Import the PudThumbnailGenerator to get real strategic analysis
    const PudThumbnailGenerator = require('./utils/pudThumbnailGenerator');
    const generator = new PudThumbnailGenerator();
    
    // Get real strategic data for each file
    for (const filename of strategicFiles) {
      const baseName = filename.replace('_strategic.png', '');
      const thumbnailPath = `/uploads/thumbnails/strategic/${filename}`;
      
      try {
        // Find the corresponding PUD file with improved matching
        const mapsDir = path.join(__dirname, '../uploads/maps');
        const pudFiles = await fs.readdir(mapsDir);
        
        // Enhanced PUD file matching logic
        const matchingPudFile = pudFiles.find(f => {
          if (!f.toLowerCase().endsWith('.pud')) return false;
          
          const pudBaseName = path.basename(f, '.pud');
          
          // Normalize function for better matching
          const normalize = (str) => {
            return str
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
              .trim();
          };
          
          // Try multiple matching strategies in order of preference
          const strategies = [
            // Strategy 1: Direct exact match
            () => pudBaseName.toLowerCase() === baseName.toLowerCase(),
            
            // Strategy 2: Replace underscores with spaces in baseName, match to pudBaseName
            () => pudBaseName.toLowerCase() === baseName.toLowerCase().replace(/_/g, ' '),
            
            // Strategy 3: Replace spaces with underscores in pudBaseName, match to baseName  
            () => pudBaseName.toLowerCase().replace(/ /g, '_') === baseName.toLowerCase(),
            
            // Strategy 4: Normalized comparison (remove all punctuation/spaces)
            () => normalize(pudBaseName) === normalize(baseName),
            
            // Strategy 5: Contains matching with normalization
            () => {
              const normalizedPud = normalize(pudBaseName);
              const normalizedBase = normalize(baseName);
              return normalizedPud.includes(normalizedBase) || normalizedBase.includes(normalizedPud);
            },
            
            // Strategy 6: Word-by-word matching (all significant words must be present)
            () => {
              const pudWords = pudBaseName.toLowerCase().split(/[\s_-]+/).filter(w => w.length > 2);
              const baseWords = baseName.toLowerCase().replace(/_/g, ' ').split(/[\s_-]+/).filter(w => w.length > 2);
              
              // All base words must be found in pud words
              return baseWords.length > 0 && baseWords.every(word => 
                pudWords.some(pudWord => pudWord.includes(word) || word.includes(pudWord))
              );
            }
          ];
          
          // Test each strategy and log which one works
          for (let i = 0; i < strategies.length; i++) {
            if (strategies[i]()) {
              console.log(`✅ Strategy ${i + 1} matched "${baseName}" to "${pudBaseName}"`);
              return true;
            }
          }
          
          return false;
        });
        
        if (matchingPudFile) {
          const pudPath = path.join(mapsDir, matchingPudFile);
          
          console.log(`🎯 Found matching PUD file: ${matchingPudFile}`);
          console.log(`🔍 Analyzing: ${pudPath}`);
          
          // Re-analyze the map to get fresh strategic data (without generating thumbnail)
          const strategicData = await generator.analyzeMapForStrategicData(pudPath);
          
          console.log(`✅ Strategic analysis complete. Data keys:`, Object.keys(strategicData));
          console.log(`📊 Sample data: mapSize=${strategicData.mapSize?.string || strategicData.mapSize}, totalTiles=${strategicData.totalTiles}, goldmines=${strategicData.goldmineCount}`);
          
          results.push({
            filename: baseName + '.pud',
            thumbnailPath,
            strategicData: strategicData,
            success: true
          });
        } else {
          console.log(`❌ No matching PUD file found for: ${baseName}`);
          console.log(`📁 Available PUD files:`, pudFiles);
          
          // Fallback to basic data if PUD file not found
          results.push({
            filename: baseName + '.pud',
            thumbnailPath,
            strategicData: {
              mapSize: 'Unknown',
              totalTiles: 0,
              terrainDistribution: { water: 0, grass: 0, trees: 0, dirt: 0, shore: 0, rock: 0 },
              waterPercentage: 0,
              landPercentage: 100,
              mapType: 'Unknown',
              goldmines: [],
              goldmineCount: 0,
              startingPositions: [],
              playerCount: 0,
              balanceRating: 'Unknown',
              rushDistance: 'Unknown',
              navyRequired: false,
              recommendedStrategy: ['Analysis not available'],
              analysisMessages: ['Strategic analysis could not be loaded - PUD file not found'],
              startingPositionAnalysis: []
            },
            success: true
          });
        }
      } catch (error) {
        console.error(`❌ Error analyzing ${baseName}:`, error.message);
        console.error(`📍 Error stack:`, error.stack);
        
        // Include the file even if analysis fails
        results.push({
          filename: baseName + '.pud',
          thumbnailPath,
          strategicData: {
            mapSize: 'Unknown',
            totalTiles: 0,
            terrainDistribution: { water: 0, grass: 0, trees: 0, dirt: 0, shore: 0, rock: 0 },
            waterPercentage: 0,
            landPercentage: 100,
            mapType: 'Error',
            goldmines: [],
            goldmineCount: 0,
            startingPositions: [],
            playerCount: 0,
            balanceRating: 'Error',
            rushDistance: 'Unknown',
            navyRequired: false,
            recommendedStrategy: ['Analysis failed'],
            analysisMessages: [`Analysis error: ${error.message}`],
            startingPositionAnalysis: []
          },
          success: true
        });
      }
    }
    
    console.log(`✅ Found ${results.length} existing strategic thumbnails`);
    
    res.json({
      success: true,
      totalMaps: results.length,
      successful: results.length,
      failed: 0,
      results: results
    });
    
  } catch (error) {
    console.error('Error in strategic thumbnails data API:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      results: [] 
    });
  }
});

// Strategic thumbnail generation API endpoint
app.get('/api/generate-strategic-thumbnails', async (req, res) => {
  try {
    // Get limit parameter from query string (default to all maps if not specified)
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const mapNames = req.query.maps ? req.query.maps.split(',').map(name => name.trim()) : null;
    
    console.log(`🎯 Strategic thumbnails API called with limit: ${limit || 'unlimited'}`);
    if (mapNames) {
      console.log(`🎯 Specific maps requested: ${mapNames.join(', ')}`);
    }
    
    const PudThumbnailGenerator = require('./utils/pudThumbnailGenerator');
    const fs = require('fs').promises;
    const path = require('path');
    
    const generator = new PudThumbnailGenerator();
    
    // Find all PUD files in uploads/maps
    const mapsDir = path.join(__dirname, '../uploads/maps');
    const files = await fs.readdir(mapsDir);
    let pudFiles = files.filter(f => f.toLowerCase().endsWith('.pud'));
    
    if (pudFiles.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No PUD files found in uploads/maps directory',
        results: [] 
      });
    }

    // Filter by specific map names if provided
    if (mapNames && mapNames.length > 0) {
      const filteredFiles = [];
      for (const requestedName of mapNames) {
        // Find the FIRST matching file for each requested name to avoid duplicates
        const matchingFile = pudFiles.find(filename => {
          const baseName = path.basename(filename, '.pud').toLowerCase();
          return baseName.includes(requestedName.toLowerCase()) || 
                 requestedName.toLowerCase().includes(baseName);
        });
        if (matchingFile && !filteredFiles.includes(matchingFile)) {
          filteredFiles.push(matchingFile);
        }
      }
      pudFiles = filteredFiles;
      console.log(`🎯 Filtered to ${pudFiles.length} maps matching requested names (no duplicates)`);
      
      if (pudFiles.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: `No maps found matching: ${mapNames.join(', ')}`,
          results: [] 
        });
      }
    }

    // Apply limit if specified
    if (limit && limit > 0) {
      pudFiles = pudFiles.slice(0, limit);
      console.log(`📊 Limited to first ${pudFiles.length} maps`);
    }

    console.log(`Found ${pudFiles.length} maps to analyze`);

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '../uploads/thumbnails/strategic');
    await fs.mkdir(outputDir, { recursive: true });

    const results = [];

    // Process each map
    for (let i = 0; i < pudFiles.length; i++) {
      const filename = pudFiles[i];
      const pudPath = path.join(mapsDir, filename);
      const baseName = path.basename(filename, '.pud');
      const outputPath = path.join(outputDir, `${baseName}_strategic.png`);
      
      console.log(`📊 [${i + 1}/${pudFiles.length}] Processing: ${filename}`);
      
      try {
        // Generate thumbnail with strategic analysis
        const strategicData = await generator.generateThumbnail(pudPath, outputPath);
        
        // Convert paths to web-accessible URLs
        const thumbnailPath = outputPath.replace(path.join(__dirname, '..'), '').replace(/\\/g, '/');
        
        results.push({
          filename,
          thumbnailPath,
          strategicData: strategicData,
          success: true
        });

        console.log(`✅ Successfully processed ${filename}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${filename}: ${error.message}`);
        results.push({
          filename,
          error: error.message,
          success: false
        });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n✅ Successfully processed: ${successful} maps`);
    console.log(`❌ Failed: ${failed} maps`);
    
    res.json({
      success: true,
      totalMaps: pudFiles.length,
      successful,
      failed,
      results: results.filter(r => r.success)
    });
    
  } catch (error) {
    console.error('Error in strategic thumbnails API:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      results: [] 
    });
  }
});

// Delete strategic thumbnail API endpoint
app.delete('/api/delete-strategic-thumbnail', async (req, res) => {
  try {
    const mapName = req.query.map;
    
    if (!mapName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Map name is required as query parameter' 
      });
    }
    
    console.log(`🗑️ Delete strategic thumbnail request for: ${mapName}`);
    
    const fs = require('fs').promises;
    const path = require('path');
    
    // Find the strategic thumbnail file
    const strategicDir = path.join(__dirname, '../uploads/thumbnails/strategic');
    const expectedFileName = `${mapName}_strategic.png`;
    const filePath = path.join(strategicDir, expectedFileName);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Delete the file
      await fs.unlink(filePath);
      
      console.log(`✅ Successfully deleted: ${expectedFileName}`);
      
      res.json({
        success: true,
        message: `Strategic thumbnail deleted for ${mapName}`,
        deletedFile: expectedFileName
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - that's okay for a delete operation
        console.log(`ℹ️ File not found (already deleted): ${expectedFileName}`);
        res.json({
          success: true,
          message: `Strategic thumbnail not found (may already be deleted): ${mapName}`,
          deletedFile: expectedFileName
        });
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Error in delete strategic thumbnail API:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Catch root route - redirect to hero page
app.get('/', (req, res) => {
  console.log('🛡️ Root route accessed - redirecting to hero page');
  res.redirect('/views/hero.html');
});

// 404 handler for API routes and auth routes
app.use('/api/*', (req, res) => {
  console.warn(`404 - API Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found', message: 'The requested API resource could not be found' });
});

app.use('/auth/*', (req, res) => {
  console.warn(`404 - Auth Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found', message: 'The requested auth resource could not be found' });
});

// SPA support (fallback to index.html for non-static files)
app.get('*', (req, res) => {
  // Let static files be handled by express.static middleware
  // Only fallback to index.html for routes that don't have file extensions
  if (req.path.includes('.')) {
    // This is likely a static file request that wasn't found
    console.warn(`404 - Static file not found: ${req.method} ${req.url}`);
    return res.status(404).json({ error: 'Not Found', message: 'The requested resource could not be found' });
  }
  
  // This is a SPA route, redirect to hero page
  console.log('🛡️ SPA route accessed - redirecting to hero page');
  res.redirect('/views/hero.html');
});

// NOTE: PORT defined earlier near server creation; avoid redeclaration here

// Track if stream check is currently running to prevent overlaps
let streamCheckRunning = false;
let playCountUpdateRunning = false;

// Configurable cron schedules via environment variables
// Smart scheduling: Check more frequently during prime streaming hours (12PM-12AM PST)
// Less frequently during off-hours (12AM-12PM PST)
const STREAM_CHECK_SCHEDULE = process.env.STREAM_CHECK_SCHEDULE || '*/10 * * * *'; // Every 10 minutes (more responsive)
const PLAY_COUNT_UPDATE_SCHEDULE = process.env.PLAY_COUNT_UPDATE_SCHEDULE || '0 */6 * * *'; // Every 6 hours

console.log('⏰ Cron job schedules:');
console.log(`  Stream check: ${STREAM_CHECK_SCHEDULE}`);
console.log(`  Play count update: ${PLAY_COUNT_UPDATE_SCHEDULE}`);
console.log('  Profile image refresh: */30 * * * *'); // Every 30 minutes

// Set up cron job to check live status every 10 minutes
const streamCheckJob = new CronJob(STREAM_CHECK_SCHEDULE, async () => {
  if (streamCheckRunning) {
    console.log('⏭️ Skipping stream check - previous check still running');
    return;
  }
  
  streamCheckRunning = true;
  console.log('🔄 Running scheduled stream check...');
  
  try {
    // Wait for MongoDB to be ready
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ MongoDB not ready for stream check, skipping this cycle');
      return;
    }
    
    await checkAllLiveStatus();
    console.log('✅ Scheduled stream check completed');
  } catch (error) {
    console.error('❌ Error in scheduled stream check:', error.message);
  } finally {
    streamCheckRunning = false;
  }
}, null, false, 'UTC'); // Start stopped

// Set up cron job to update play counts
const playCountUpdateJob = new CronJob(PLAY_COUNT_UPDATE_SCHEDULE, async () => {
  if (playCountUpdateRunning) {
    console.log('⏭️ Skipping play count update - previous update still running');
    return;
  }
  
  playCountUpdateRunning = true;
  const startTime = new Date();
  console.log(`📊 Running scheduled play count update at ${startTime.toISOString()}...`);
  
  try {
    // Wait for MongoDB to be ready
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ MongoDB not ready for play count update, skipping this cycle');
      return;
    }
    
    // Note: Play count updates are now handled by the War2 maps system
    console.log('📊 Play count updates are handled by the War2 maps system');
    const endTime = new Date();
    const duration = endTime - startTime;
    console.log(`✅ Play count update check completed in ${duration}ms`);
  } catch (error) {
    console.error('❌ Error in scheduled play count update:', error.message);
    console.error(error.stack);
  } finally {
    playCountUpdateRunning = false;
    const endTime = new Date();
    console.log(`📊 Play count update cycle finished at ${endTime.toISOString()}`);
  }
}, null, false, 'UTC'); // Start stopped

// Remove duplicate stream checking - this is handled by the main checkAllLiveStatus function above

// Profile image refresh job - every 30 minutes (ONLY source of profile updates)
cron.schedule('*/30 * * * *', async () => {
  console.log('🔄 Running scheduled profile image refresh...');
  try {
    const User = require('./models/User');
    // Find users with social links but potentially outdated profile images
    // Rotate through users to ensure all get updated over time
    const totalUsers = await User.countDocuments({
      $or: [
        { 'socialLinks.youtube': { $exists: true, $ne: '' } },
        { 'socialLinks.twitch': { $exists: true, $ne: '' } }
      ]
    });
    
    // Process 3-5 users every 30 minutes to stay within quota
    const batchSize = 3;
    const randomOffset = Math.floor(Math.random() * Math.max(1, totalUsers - batchSize));
    
    const usersWithSocialLinks = await User.find({
      $or: [
        { 'socialLinks.youtube': { $exists: true, $ne: '' } },
        { 'socialLinks.twitch': { $exists: true, $ne: '' } }
      ]
    }).skip(randomOffset).limit(batchSize);

    console.log(`📦 Processing ${usersWithSocialLinks.length} of ${totalUsers} users with social links`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithSocialLinks) {
      try {
        const updates = await profileImageService.updateUserProfileImages(user);
        if (Object.keys(updates).length > 0) {
          await User.findByIdAndUpdate(user._id, updates);
          console.log(`✅ Updated profile images for ${user.username}`);
          updatedCount++;
        }
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      } catch (error) {
        console.error(`❌ Error updating profile images for ${user.username}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Profile image refresh completed: ${updatedCount} updated, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error in scheduled profile image refresh:', error);
  }
});

// Helper function to extract username from social media URLs
function extractUsernameFromUrl(url, platform) {
  if (!url) return null;
  
  if (platform === 'twitch') {
    // Extract from URLs like https://twitch.tv/username
    const match = url.match(/twitch\.tv\/([^/?#]+)/);
    return match ? match[1] : null;
  } else if (platform === 'youtube') {
    // Extract from URLs like https://youtube.com/@username
    if (url.includes('@')) {
      const atMatch = url.match(/@([^/?#]+)/);
      return atMatch ? atMatch[1] : null;
    }
    // Handle other YouTube URL formats
    const pathMatch = url.match(/\/(channel|c|user)\/([^/?#]+)/);
    return pathMatch ? pathMatch[2] : null;
  }
  
  return null;
}

// Start the cron jobs only after MongoDB connection is established
mongoose.connection.once('connected', () => {
  console.log('📡 Starting stream check scheduler (every 10 minutes)');
  streamCheckJob.start();
  
  console.log('📊 Starting play count update scheduler (every 6 hours)');
  playCountUpdateJob.start();
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Socket.IO chat server initialized`);
  console.log(`⏰ Stream check scheduled (every 10 minutes)`);
  console.log(`📊 Play count updates scheduled (every 6 hours)`);
});

module.exports = app;
