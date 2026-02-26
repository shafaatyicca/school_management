import mongoose, { Schema, Document } from "mongoose";

export interface ISchool extends Document {
  name: string;
  address: string;
  phone: string;
  logo: string;
  isActive: boolean;
  createdAt: Date;
}

const SchoolSchema = new Schema<ISchool>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  logo: { type: String, default: "" }, // Base64 string yahan save hogi
});

export const SchoolModel =
  mongoose.models.School || mongoose.model<ISchool>("School", SchoolSchema);
