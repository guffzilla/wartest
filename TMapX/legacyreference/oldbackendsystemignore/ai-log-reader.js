const fs = require('fs');
const path = require('path');

// AI Assistant Log File
const aiLogFile = path.join(__dirname, 'logs', 'ai-assistant-logs.jsonl');

function readAILogs(options = {}) {
  const { limit = 50, level, source, since, sinceMinutes = 5 } = options;
  
  if (!fs.existsSync(aiLogFile)) {
    console.log('No AI logs file found');
    return [];
  }

  try {
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
    } else if (sinceMinutes) {
      const sinceDate = new Date(Date.now() - sinceMinutes * 60 * 1000);
      logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
    }

    // Apply limit and reverse to get most recent first
    logs = logs.slice(-parseInt(limit)).reverse();

    return logs;
  } catch (error) {
    console.error('Error reading AI logs:', error);
    return [];
  }
}

function analyzeLogs(logs) {
  const analysis = {
    total: logs.length,
    byLevel: {},
    bySource: {},
    byUser: {},
    errors: [],
    warnings: [],
    recentActivity: []
  };

  logs.forEach(log => {
    // Count by level
    analysis.byLevel[log.level] = (analysis.byLevel[log.level] || 0) + 1;
    
    // Count by source
    analysis.bySource[log.source] = (analysis.bySource[log.source] || 0) + 1;
    
    // Count by user
    if (log.user && log.user.username) {
      analysis.byUser[log.user.username] = (analysis.byUser[log.user.username] || 0) + 1;
    }
    
    // Collect errors and warnings
    if (log.level === 'error') {
      analysis.errors.push(log);
    } else if (log.level === 'warn') {
      analysis.warnings.push(log);
    }
    
    // Recent activity (last 10 logs)
    if (analysis.recentActivity.length < 10) {
      analysis.recentActivity.push(log);
    }
  });

  return analysis;
}

function printLogAnalysis(analysis) {
  console.log('\n🤖 AI Assistant Log Analysis');
  console.log('=' .repeat(50));
  
  console.log(`📊 Total logs: ${analysis.total}`);
  
  if (Object.keys(analysis.byLevel).length > 0) {
    console.log('\n📈 By Level:');
    Object.entries(analysis.byLevel).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`);
    });
  }
  
  if (Object.keys(analysis.bySource).length > 0) {
    console.log('\n🔍 By Source:');
    Object.entries(analysis.bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });
  }
  
  if (Object.keys(analysis.byUser).length > 0) {
    console.log('\n👤 By User:');
    Object.entries(analysis.byUser).forEach(([user, count]) => {
      console.log(`  ${user}: ${count}`);
    });
  }
  
  if (analysis.errors.length > 0) {
    console.log('\n❌ Recent Errors:');
    analysis.errors.slice(-5).forEach(error => {
      console.log(`  [${error.timestamp}] ${error.message}`);
      if (error.user) console.log(`    User: ${error.user.username}`);
      if (error.page) console.log(`    Page: ${error.page}`);
    });
  }
  
  if (analysis.warnings.length > 0) {
    console.log('\n⚠️ Recent Warnings:');
    analysis.warnings.slice(-5).forEach(warning => {
      console.log(`  [${warning.timestamp}] ${warning.message}`);
      if (warning.user) console.log(`    User: ${warning.user.username}`);
      if (warning.page) console.log(`    Page: ${warning.page}`);
    });
  }
  
  if (analysis.recentActivity.length > 0) {
    console.log('\n🕒 Recent Activity:');
    analysis.recentActivity.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      console.log(`  [${time}] [${log.level.toUpperCase()}] ${log.message.substring(0, 100)}${log.message.length > 100 ? '...' : ''}`);
    });
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'recent':
      const minutes = parseInt(args[1]) || 5;
      const logs = readAILogs({ sinceMinutes: minutes });
      const analysis = analyzeLogs(logs);
      printLogAnalysis(analysis);
      break;
      
    case 'errors':
      const errorLogs = readAILogs({ level: 'error', limit: 20 });
      console.log('\n❌ Recent Errors:');
      errorLogs.forEach(error => {
        console.log(`[${error.timestamp}] ${error.message}`);
        if (error.user) console.log(`  User: ${error.user.username}`);
        if (error.page) console.log(`  Page: ${error.page}`);
        console.log('');
      });
      break;
      
    case 'user':
      const username = args[1];
      if (!username) {
        console.log('Usage: node ai-log-reader.js user <username>');
        return;
      }
      const userLogs = readAILogs({ limit: 100 });
      const userActivity = userLogs.filter(log => log.user && log.user.username === username);
      console.log(`\n👤 Activity for user: ${username}`);
      userActivity.forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        console.log(`[${time}] [${log.level.toUpperCase()}] ${log.message}`);
      });
      break;
      
    default:
      console.log('AI Assistant Log Reader');
      console.log('Usage:');
      console.log('  node ai-log-reader.js recent [minutes]  - Show recent activity (default: 5 minutes)');
      console.log('  node ai-log-reader.js errors            - Show recent errors');
      console.log('  node ai-log-reader.js user <username>   - Show activity for specific user');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { readAILogs, analyzeLogs, printLogAnalysis };
