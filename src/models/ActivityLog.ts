import mongoose, { Schema } from "mongoose";

export const LOG_RETENTION_MONTHS = 6;
// One row per important action. Rows delete themselves at `expireAt` (TTL index).
const ChangeSchema = new Schema(
  { field: String, from: Schema.Types.Mixed, to: Schema.Types.Mixed },
  { _id: false },
);

const ActivityLogSchema = new Schema(
  {
    schoolId: { type: String, default: null }, // null = platform action (super admin)
    userId: { type: String, default: null },
    userName: { type: String, default: "" },
    userRole: { type: String, default: "" },
    action: {
      type: String,
      enum: [
        "login",
        "login_failed",
        "create",
        "update",
        "delete",
        "view",
        "export",
        "print",
        "payment",
        "reverse",
      ],
      required: true,
    },
    
    module: { type: String, required: true }, // "students", "fees", "auth", …
    entityId: { type: String, default: null },
    entityLabel: { type: String, default: "" }, // "Ali Khan (GR 1045)"
    summary: { type: String, default: "" }, // human sentence
    changes: { type: [ChangeSchema], default: [] }, // only changed fields
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    expireAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Fast filters on the logs page
ActivityLogSchema.index({ schoolId: 1, createdAt: -1 });
ActivityLogSchema.index({ schoolId: 1, userId: 1, createdAt: -1 });
ActivityLogSchema.index({ schoolId: 1, module: 1, createdAt: -1 });
// Auto-delete when expireAt is reached
ActivityLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const ActivityLogModel =
  mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema);