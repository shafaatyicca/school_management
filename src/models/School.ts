import mongoose, { Schema, Document } from "mongoose";

export interface ISchool extends Document {
  name: string;
  address: string;
  phone: string;
  logo: string;
  status: "active" | "inactive"; // Yehi field lock/unlock control karegi
  createdAt: Date;

  // Essential Subscription Fields
  planId: mongoose.Types.ObjectId;
  customPrice: number;
  expiryDate: Date; // Is date ke guzarte hi status auto-inactive ho jayega
}

const SchoolSchema = new Schema<ISchool>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  logo: { type: String, default: "" },
  status: {
    type: String,
    default: "active",
    enum: ["active", "inactive"],
  },
  createdAt: { type: Date, default: Date.now },

  // Sirf zaroori fields rakhi hain
  planId: {
    type: Schema.Types.ObjectId,
    ref: "Plan",
    required: true,
  },
  customPrice: {
    type: Number,
    default: 0,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
});

export const SchoolModel =
  mongoose.models.School || mongoose.model<ISchool>("School", SchoolSchema);
