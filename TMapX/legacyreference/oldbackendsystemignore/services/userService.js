/**
 * Centralized User Service
 * Optimizes user-related database operations and reduces query redundancy
 */
const User = require('../models/User');
const mongoose = require('mongoose');

// In-memory cache for frequently accessed user data
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class UserService {
  /**
   * Get user by ID with optimized caching
   */
  static async getUserById(userId, options = {}) {
    const cacheKey = `user_${userId}_${JSON.stringify(options)}`;
    const now = Date.now();
    
    // Check cache first
    const cached = userCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    
    // Build query
    let query = User.findById(userId);
    
    // Apply field selection
    if (options.select) {
      query = query.select(options.select);
    } else {
      query = query.select('-password'); // Default exclusion
    }
    
    // Apply lean option
    if (options.lean !== false) {
      query = query.lean();
    }
    
    // Execute query
    const user = await query;
    
    // Cache result
    if (user) {
      userCache.set(cacheKey, {
        data: user,
        timestamp: now
      });
    }
    
    return user;
  }
  
  /**
   * Get current user from request with caching
   */
  static async getCurrentUser(req, options = {}) {
    if (!req.user?._id) {
      return null;
    }
    
    return this.getUserById(req.user._id, options);
  }
  
  /**
   * Update user with cache invalidation
   */
  static async updateUser(userId, updateData) {
    const user = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');
    
    // Invalidate cache
    this.clearUserCache(userId);
    
    return user;
  }
  
  /**
   * Clear user cache
   */
  static clearUserCache(userId) {
    for (const [key] of userCache) {
      if (key.includes(`user_${userId}`)) {
        userCache.delete(key);
      }
    }
  }
  
  /**
   * Get user profile data (optimized)
   */
  static async getUserProfile(userId) {
    return this.getUserById(userId, {
      select: '-password -email -role -isUsernameDefined -suggestedUsername',
      lean: true
    });
  }
  
  /**
   * Get user for authentication
   */
  static async getUserForAuth(userId) {
    return this.getUserById(userId, {
      select: '-password',
      lean: false // Need full document for auth
    });
  }
  
  /**
   * Search users with pagination
   */
  static async searchUsers(searchTerm, options = {}) {
    const { page = 1, limit = 20, sort = { username: 1 } } = options;
    
    const query = {
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { displayName: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get users by role
   */
  static async getUsersByRole(role, options = {}) {
    const { limit = 100, sort = { username: 1 } } = options;
    
    return User.find({ role })
      .select('-password')
      .sort(sort)
      .limit(limit)
      .lean();
  }
  
  /**
   * Bulk update users
   */
  static async bulkUpdateUsers(userIds, updateData) {
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateData
    );
    
    // Clear cache for all affected users
    userIds.forEach(userId => this.clearUserCache(userId));
    
    return result;
  }
  
  /**
   * Get user statistics
   */
  static async getUserStats() {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          },
          adminUsers: {
            $sum: {
              $cond: [{ $eq: ['$role', 'admin'] }, 1, 0]
            }
          },
          moderatorUsers: {
            $sum: {
              $cond: [{ $eq: ['$role', 'moderator'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      adminUsers: 0,
      moderatorUsers: 0
    };
  }
}

module.exports = UserService;
