const AdminAuditLog = require('../models/AdminAuditLog');

// Middleware factory to create audit entries after handler runs
// usage: app.post('/route', ensureAdmin, adminAudit('ACTION','TARGET'), handler)
exports.adminAudit = (action, targetType, makeDetails = null) => {
  return async (req, res, next) => {
    // Wrap res.json to capture status and payload
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      try {
        const actor = req.user || {};
        const details = typeof makeDetails === 'function' ? makeDetails(req, body) : undefined;
        await AdminAuditLog.create({
          actorUserId: actor._id,
          actorUsername: actor.username,
          actorRole: actor.role,
          action,
          targetType,
          targetId: (req.params && (req.params.id || req.params.userId)) || '-',
          method: req.method,
          route: req.originalUrl,
          status: (body && (body.success === false || body.error)) ? 'failure' : 'success',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          details
        });
      } catch (e) {
        // Do not block response
        console.warn('Admin audit write failed:', e.message);
      }
      return originalJson(body);
    };
    next();
  };
};


