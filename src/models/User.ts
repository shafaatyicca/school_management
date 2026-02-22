import mongoose, { Schema, Document } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  role: {
    type: String,
    enum: ["super_admin", "school_admin", "teacher", "parent"],
    default: "school_admin",
  },
  // Ye field batayegi ke ye user kis school ka hai
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: "School",
    default: null, // Super Admin ke liye null hoga
  },
});

export const UserModel =
  mongoose.models.User || mongoose.model("User", UserSchema);
