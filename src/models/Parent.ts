import { Schema, model, models } from "mongoose";

export interface IParent {
  _id?: string;
  fullName: string;
  cnic: string;
  phone: string;
  address: string;
  occupation?: string;
  gender: "Male" | "Female" | "Other";
}

const parentSchema = new Schema<IParent>(
  {
    fullName: { type: String, required: true },
    cnic: { type: String, required: true, unique: true }, // Unique CNIC
    phone: { type: String, required: true },
    address: { type: String, required: true },
    occupation: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  },
  { timestamps: true },
);

export const ParentModel =
  models.Parent || model<IParent>("Parent", parentSchema);
