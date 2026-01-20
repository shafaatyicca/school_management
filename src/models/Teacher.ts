import mongoose, { Schema, model, models } from "mongoose";

export interface ITeacher {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  qualification: string;
  experience: number; // years
  subject: string;
  address: string;
  salary: number;
  joiningDate: Date;
  status: "active" | "inactive";
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const TeacherSchema = new Schema<ITeacher>(
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
    qualification: {
      type: String,
      required: [true, "Qualification is required"],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, "Experience is required"],
      min: 0,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    salary: {
      type: Number,
      required: [true, "Salary is required"],
      min: 0,
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    emergencyContact: {
      name: {
        type: String,
        required: [true, "Emergency contact name is required"],
      },
      phone: {
        type: String,
        required: [true, "Emergency contact phone is required"],
      },
      relation: {
        type: String,
        required: [true, "Emergency contact relation is required"],
      },
    },
  },
  {
    timestamps: true,
  },
);

const Teacher = models.Teacher || model<ITeacher>("Teacher", TeacherSchema);

export default Teacher;
