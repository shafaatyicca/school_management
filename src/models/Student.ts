import mongoose, { Schema, model, models } from "mongoose";

export interface IStudent {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  classId: mongoose.Types.ObjectId | string;
  section: string;
  rollNumber: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  enrollmentDate: Date;
  status: "active" | "inactive";
  bloodGroup?: string;
  previousSchool?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class is required"],
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
    },
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    guardianName: {
      type: String,
      required: [true, "Guardian name is required"],
      trim: true,
    },
    guardianPhone: {
      type: String,
      required: [true, "Guardian phone is required"],
      trim: true,
    },
    guardianRelation: {
      type: String,
      required: [true, "Guardian relation is required"],
      trim: true,
    },
    enrollmentDate: {
      type: Date,
      required: [true, "Enrollment date is required"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    previousSchool: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Student = models.Student || model<IStudent>("Student", StudentSchema);

export default Student;
