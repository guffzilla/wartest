const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Database backup utility
 */
class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../../dbbackups');
    this.dbName = 'newsite';
    this.mongoUri = 'mongodb://localhost:27017';
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Generate backup filename with timestamp
   */
  generateBackupFilename() {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .split('T')
      .join('_')
      .split('.')[0];
    return `backup_${this.dbName}_${timestamp}`;
  }

  /**
   * Create database backup using mongodump
   */
  async createBackup() {
    return new Promise((resolve, reject) => {
      try {
        this.ensureBackupDir();
        
        const backupName = this.generateBackupFilename();
        const backupPath = path.join(this.backupDir, backupName);
        
        // mongodump command
        const command = `mongodump --uri="${this.mongoUri}/${this.dbName}" --out="${backupPath}"`;
        
        console.log('🔄 Starting database backup...');
        console.log('Backup command:', command);
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Backup failed:', error);
            reject({
              success: false,
              error: error.message,
              details: stderr
            });
            return;
          }
          
          const backupInfo = {
            success: true,
            backupName,
            backupPath,
            timestamp: new Date().toISOString(),
            size: this.getDirectorySize(backupPath)
          };
          
          console.log('✅ Database backup completed successfully!');
          console.log('Backup location:', backupPath);
          
          resolve(backupInfo);
        });
        
      } catch (error) {
        console.error('❌ Backup initialization failed:', error);
        reject({
          success: false,
          error: error.message
        });
      }
    });
  }

  /**
   * Get directory size recursively
   */
  getDirectorySize(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        return 0;
      }
      
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating directory size:', error);
      return 0;
    }
  }

  /**
   * Format file size in human readable format
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * List all backup files
   */
  async listBackups() {
    try {
      this.ensureBackupDir();
      
      const files = fs.readdirSync(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && file.startsWith('backup_')) {
          backups.push({
            name: file,
            path: filePath,
            created: stats.birthtime,
            modified: stats.mtime,
            size: this.formatSize(this.getDirectorySize(filePath))
          });
        }
      }
      
      // Sort by creation date, newest first
      return backups.sort((a, b) => new Date(b.created) - new Date(a.created));
      
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupName) {
    return new Promise((resolve, reject) => {
      try {
        const backupPath = path.join(this.backupDir, backupName);
        
        if (!fs.existsSync(backupPath)) {
          reject({ success: false, error: 'Backup not found' });
          return;
        }
        
        // Remove directory recursively
        fs.rmSync(backupPath, { recursive: true, force: true });
        
        console.log('🗑️ Backup deleted:', backupName);
        resolve({ success: true, message: 'Backup deleted successfully' });
        
      } catch (error) {
        console.error('Error deleting backup:', error);
        reject({ success: false, error: error.message });
      }
    });
  }
}

module.exports = new DatabaseBackup(); 