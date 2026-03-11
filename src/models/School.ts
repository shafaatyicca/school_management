import mongoose, { Schema, Document } from "mongoose";
import "./Plan";

export interface ISchool extends Document {
  name: string;
  address: string;
  phone: string;
  logo: string;
  status: "active" | "inactive";
  createdAt: Date;

  planId: mongoose.Types.ObjectId;
  customPrice: number;
  expiryDate: Date;
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
