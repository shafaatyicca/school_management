import mongoose, { Schema, Document } from "mongoose";
import "./Plan";

export interface ISchool extends Document {
  name: string;
  address: string;
  phone: string;
  logo: string;
  slug: string;
  status: "active" | "inactive";
  planId: mongoose.Types.ObjectId;
  customPrice: number;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
  joiningDate?: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    logo: { type: String, default: "" },
    joiningDate: { type: Date },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
    },
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
  },
  { timestamps: true },
);

export const SchoolModel =
  mongoose.models.School || mongoose.model<ISchool>("School", SchoolSchema);
