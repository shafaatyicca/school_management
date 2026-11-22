import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  // super_admin / school_admin = full access in their scope
  // accountant / cashier / helpdesk = default roles; staff = custom role (uses roleId)
  role: "super_admin" | "school_admin" | "accountant" | "cashier" | "helpdesk" | "staff";
  roleId?: mongoose.Types.ObjectId | null;
  useCustomPermissions?: boolean; // Option B: this user's own permissions
  customPermissions?: any;
  isActive?: boolean; // login on / off
  lastLoginAt?: Date | null;
  managedBy?: "super_admin" | "school"; // who can see / edit this login
  employeeId?: mongoose.Types.ObjectId | null;
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
      enum: ["super_admin", "school_admin", "accountant", "cashier", "helpdesk", "staff"],
      default: "school_admin",
    },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", default: null },
    useCustomPermissions: { type: Boolean, default: false },
    customPermissions: { type: Schema.Types.Mixed, default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    managedBy: {
      type: String,
      enum: ["super_admin", "school"],
      default: "super_admin",
    },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
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