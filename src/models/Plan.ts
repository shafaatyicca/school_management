import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    interval: { type: String, default: "month" },
    features: [{ type: String }],
    schoolLimit: { type: Number, default: 0 },
    status: { type: String, default: "active" },
  },
  { timestamps: true },
);

export default mongoose.models.Plan || mongoose.model("Plan", PlanSchema);
