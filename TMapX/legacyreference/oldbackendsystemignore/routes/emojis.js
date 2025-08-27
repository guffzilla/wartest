const express = require('express');
const router = express.Router();
const Emoji = require('../models/Emoji');
const User = require('../models/User');

// Auth middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required' });
};

// GET /api/emojis - Get all available emojis with user ownership status
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🎭 GET /api/emojis called for user:', req.user.username);
    
    // Get all emojis
    const emojis = await Emoji.find({ isActive: true }).sort({ tier: 1, price: 1 });
    
    // Get user's owned emojis
    const user = await User.findById(req.user.id).select('ownedEmojis arenaGold');
    const ownedEmojiIds = user.ownedEmojis || [];
    
    // Add ownership status to each emoji
    const emojisWithOwnership = emojis.map(emoji => ({
      id: emoji.id,
      emoji: emoji.emoji,
      name: emoji.name,
      category: emoji.category,
      tier: emoji.tier,
      price: emoji.price,
      description: emoji.description,
      owned: ownedEmojiIds.includes(emoji.id)
    }));
    
    // Group by tier
    const groupedEmojis = {
      free: emojisWithOwnership.filter(e => e.tier === 'free'),
      bronze: emojisWithOwnership.filter(e => e.tier === 'bronze'),
      gold: emojisWithOwnership.filter(e => e.tier === 'gold'),
      amber: emojisWithOwnership.filter(e => e.tier === 'amber'),
      sapphire: emojisWithOwnership.filter(e => e.tier === 'sapphire'),
      champion: emojisWithOwnership.filter(e => e.tier === 'champion')
    };
    
    res.json({
      success: true,
      data: {
        emojis: groupedEmojis,
        userArenaGold: user.arenaGold,
        totalOwned: ownedEmojiIds.length,
        totalAvailable: emojis.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching emojis:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch emojis' });
  }
});

// GET /api/emojis/owned - Get user's owned emojis only
router.get('/owned', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🎭 GET /api/emojis/owned called for user:', req.user.username);
    
    const user = await User.findById(req.user.id).select('ownedEmojis');
    const ownedEmojiIds = user.ownedEmojis || [];
    
    // Get the actual emoji data for owned emojis
    const ownedEmojis = await Emoji.find({ 
      id: { $in: ownedEmojiIds },
      isActive: true 
    }).sort({ tier: 1, price: 1 });
    
    res.json({
      success: true,
      data: ownedEmojis.map(emoji => ({
        id: emoji.id,
        emoji: emoji.emoji,
        name: emoji.name,
        category: emoji.category,
        tier: emoji.tier
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching owned emojis:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch owned emojis' });
  }
});

// POST /api/emojis/purchase - Purchase an emoji
router.post('/purchase', ensureAuthenticated, async (req, res) => {
  try {
    const { emojiId } = req.body;
    
    if (!emojiId) {
      return res.status(400).json({ success: false, message: 'Emoji ID is required' });
    }
    
    console.log(`💰 User ${req.user.username} attempting to purchase emoji: ${emojiId}`);
    
    // Get emoji data
    const emoji = await Emoji.findOne({ id: emojiId, isActive: true });
    if (!emoji) {
      return res.status(404).json({ success: false, message: 'Emoji not found' });
    }
    
    // Get user data
    const user = await User.findById(req.user.id).select('ownedEmojis arenaGold');
    
    // Check if user already owns this emoji
    if (user.ownedEmojis.includes(emojiId)) {
      return res.status(400).json({ success: false, message: 'You already own this emoji' });
    }
    
    // Check if user has enough arena gold
    if (user.arenaGold < emoji.price) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient arena gold. You need ${emoji.price} gold but only have ${user.arenaGold} gold.` 
      });
    }
    
    // Perform the purchase
    user.arenaGold -= emoji.price;
    user.ownedEmojis.push(emojiId);
    await user.save();
    
    console.log(`✅ Purchase successful! ${req.user.username} bought ${emoji.name} for ${emoji.price} gold`);
    
    res.json({
      success: true,
      message: `Successfully purchased ${emoji.name}!`,
      data: {
        emoji: {
          id: emoji.id,
          emoji: emoji.emoji,
          name: emoji.name,
          tier: emoji.tier,
          price: emoji.price
        },
        remainingArenaGold: user.arenaGold,
        totalOwnedEmojis: user.ownedEmojis.length
      }
    });
  } catch (error) {
    console.error('❌ Error purchasing emoji:', error);
    res.status(500).json({ success: false, message: 'Failed to purchase emoji' });
  }
});

// GET /api/emojis/shop - Get emojis formatted for shop display
router.get('/shop', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🛍️ GET /api/emojis/shop called for user:', req.user.username);
    
    // Get all emojis and user data
    const [emojis, user] = await Promise.all([
      Emoji.find({ isActive: { $ne: false } }).sort({ tier: 1, price: 1 }),
      User.findById(req.user.id).select('ownedEmojis arenaGold')
    ]);
    
    console.log(`🛍️ Found ${emojis.length} total emojis for shop`);
    const tierCounts = {};
    emojis.forEach(e => {
      tierCounts[e.tier] = (tierCounts[e.tier] || 0) + 1;
    });
    console.log('🛍️ Emoji counts by tier:', tierCounts);
    
    const ownedEmojiIds = user.ownedEmojis || [];
    
    // Format for shop display
    const shopData = {
      userArenaGold: user.arenaGold,
      tiers: {
        free: {
          name: 'Free Tier',
          description: 'Free starter emojis for everyone',
          emojis: emojis.filter(e => e.tier === 'free').map(formatEmojiForShop)
        },
        bronze: {
          name: 'Bronze Tier',
          description: 'Essential emojis for new players',
          emojis: emojis.filter(e => e.tier === 'bronze').map(formatEmojiForShop)
        },
        gold: {
          name: 'Gold Tier',
          description: 'Quality emojis for skilled players',
          emojis: emojis.filter(e => e.tier === 'gold').map(formatEmojiForShop)
        },
        amber: {
          name: 'Amber Tier',
          description: 'Special emojis for advanced players',
          emojis: emojis.filter(e => e.tier === 'amber').map(formatEmojiForShop)
        },
        sapphire: {
          name: 'Sapphire Tier',
          description: 'Rare emojis for elite players',
          emojis: emojis.filter(e => e.tier === 'sapphire').map(formatEmojiForShop)
        },
        champion: {
          name: 'Champion Tier',
          description: 'Ultimate emojis for true champions',
          emojis: emojis.filter(e => e.tier === 'champion').map(formatEmojiForShop)
        }
      }
    };
    
    function formatEmojiForShop(emoji) {
      return {
        id: emoji.id,
        emoji: emoji.emoji,
        name: emoji.name,
        price: emoji.price,
        description: emoji.description,
        owned: ownedEmojiIds.includes(emoji.id),
        canAfford: user.arenaGold >= emoji.price
      };
    }
    
    res.json({ success: true, data: shopData });
  } catch (error) {
    console.error('❌ Error fetching shop data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shop data' });
  }
});

module.exports = router; 