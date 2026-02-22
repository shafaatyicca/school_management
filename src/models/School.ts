import mongoose, { Schema, Document } from "mongoose";

export interface ISchool extends Document {
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
}

const SchoolSchema = new Schema<ISchool>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export const SchoolModel =
  mongoose.models.School || mongoose.model<ISchool>("School", SchoolSchema);
