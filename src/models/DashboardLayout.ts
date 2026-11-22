import mongoose, { Schema } from "mongoose";

// One saved dashboard arrangement per user per school
const ItemSchema = new Schema(
  {
    id: { type: String, required: true },
    size: { type: Number, default: 1 },
  },
  { _id: false },
);


const DashboardLayoutSchema = new Schema(
  {
    userId: { type: String, required: true },
    schoolId: { type: String, required: true },
    items: { type: [ItemSchema], default: [] },
  },
  { timestamps: true },
);

DashboardLayoutSchema.index({ userId: 1, schoolId: 1 }, { unique: true });

export const DashboardLayoutModel =
  mongoose.models.DashboardLayout || mongoose.model("DashboardLayout", DashboardLayoutSchema);