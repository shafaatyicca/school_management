import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "school_admin" | "accountant" | "cashier" | "helpdesk";
  schoolId?: mongoose.Types.ObjectId;
  image?: string;
  phone?: string;
  securityQuestion?: {
    question: string;
    answer: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["school_admin", "accountant", "cashier", "helpdesk"],
      default: "school_admin",
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      default: null,
    },
    image: { type: String, default: "" },
    phone: { type: String, trim: true },
    securityQuestion: {
      question: { type: String },
      answer: { type: String },
    },
  },
  { timestamps: true },
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
