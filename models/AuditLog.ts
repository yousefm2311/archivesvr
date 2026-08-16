import { Schema, model, models } from "mongoose";

const AuditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      default: "server",
      index: true,
    },
    message: {
      type: String,
    },
    reason: {
      type: String,
    },
    user: {
      empId: String,
      name: String,
      role: String,
      branch: String,
      jobCode: String,
    },
    clientCode: {
      type: String,
      index: true,
    },
    docId: {
      type: String,
    },
    details: Schema.Types.Mixed,
    meta: {
      method: String,
      path: String,
      ip: String,
      userAgent: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { collection: "auditLogs" }
);

AuditLogSchema.index({ "user.empId": 1, createdAt: -1 });
AuditLogSchema.index({ clientCode: 1, createdAt: -1 });

export const AuditLogModel =
  models.AuditLog || model("AuditLog", AuditLogSchema);
