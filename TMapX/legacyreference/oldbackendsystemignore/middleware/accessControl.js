// accessControl.js - gate features by user ban/permissions

exports.requireFeature = (featureKey) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    // Global bans
    const ban = req.user.banInfo || {};
    if (ban.isBanned) {
      const now = new Date();
      if (ban.type === 'permanent' || (ban.type === 'temporary' && (!ban.bannedUntil || now < ban.bannedUntil))) {
        // Scope-aware: if the feature is within banned scope, block
        const scope = ban.scope || {};
        const blocked = (featureKey === 'chat' && scope.chat) ||
                        (featureKey === 'reportMatches' && scope.reportMatches) ||
                        (featureKey === 'postContent' && scope.postContent);
        if (blocked) {
          return res.status(403).json({ error: 'Access restricted', reason: ban.reason || 'Banned' });
        }
      }
    }

    // Fine-grained permissions fallback
    const perms = req.user.permissions || {};
    if (featureKey === 'reportMatches' && perms.canReportMatches === false) {
      return res.status(403).json({ error: 'Reporting disabled' });
    }
    if (featureKey === 'chat' && perms.canUseChat === false) {
      return res.status(403).json({ error: 'Chat disabled' });
    }
    if (featureKey === 'postContent' && perms.canUploadMaps === false) {
      return res.status(403).json({ error: 'Posting disabled' });
    }

    next();
  };
};


