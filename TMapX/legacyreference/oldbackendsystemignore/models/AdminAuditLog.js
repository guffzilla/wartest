const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdminAuditLogSchema = new Schema({
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorUsername: { type: String, required: true },
  actorRole: { type: String, enum: ['user', 'moderator', 'admin'], required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
  method: { type: String },
  route: { type: String },
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
  ip: { type: String },
  userAgent: { type: String },
  details: { type: Schema.Types.Mixed },
}, { timestamps: true });

AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', AdminAuditLogSchema);


