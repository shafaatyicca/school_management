import mongoose, { Schema, model, models } from "mongoose";

export interface IEmployee {
  _id?: string;
  emp_id: string; // New Field
  fullName: string;
  email: string;
  password?: string; // New Field
  role: string; // New Field
  phone: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  nicNumber: string;
  staffCategory: "teacher" | "other";
  qualification: string;
  designation: string;
  experience: number;
  subject?: string;
  address: string;
  salary: number;
  joiningDate: Date;
  status: "active" | "inactive";
  inactiveDate?: Date;
  inactiveReason?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    // Auto-generated ID
    emp_id: {
      type: String,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      default: "employee",
    },
    phone: { type: String, required: [true, "Phone is required"], trim: true },
    dateOfBirth: { type: Date, required: [true, "Date of birth is required"] },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    nicNumber: {
      type: String,
      required: [true, "NIC number is required"],
      trim: true,
    },
    staffCategory: {
      type: String,
      enum: ["teacher", "other"],
      required: [true, "Staff category is required"],
    },
    qualification: {
      type: String,
      required: [true, "Qualification is required"],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, "Experience is required"],
      min: 0,
    },
    subject: { type: String, trim: true },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    salary: { type: Number, required: [true, "Salary is required"], min: 0 },
    joiningDate: { type: Date, required: [true, "Joining date is required"] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    inactiveDate: { type: Date },
    inactiveReason: { type: String, trim: true },
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
  { timestamps: true },
);

EmployeeSchema.pre("save", async function () {
  if (this.isNew) {
    try {
      // 1. Total employees count lein taake next ID mil sakay
      const count = await mongoose.models.Employee.countDocuments();
      const nextIdNumber = count + 1;

      // 2. Set simple emp_id (e.g., 1, 2, 3)
      this.emp_id = nextIdNumber.toString();

      // 3. Set email (e.g., 1staff@ccw.com)
      if (!this.email) {
        this.email = `${this.emp_id}staff@ccw.com`;
      }

      // 4. Set password (e.g., staff11122)
      // Note: Aapne kaha staff ID + 1122 (staf11122 if ID is 1)
      if (!this.password) {
        this.password = `staff${this.emp_id}012`;
      }

      // 5. Default Role check
      if (!this.role) {
        this.role = "employee";
      }
    } catch (error: any) {
      throw new Error(
        "Error generating Employee credentials: " + error.message,
      );
    }
  }
});
const Employee =
  models.Employee || model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
