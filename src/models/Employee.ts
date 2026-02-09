import mongoose, { Schema, model, models } from "mongoose";

export interface IEmployee {
  [x: string]: any;
  _id?: number;
  emp_id: number; // New Field
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
      type: Number,
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

EmployeeSchema.pre<IEmployee>("save", async function () {
  if (this.isNew) {
    try {
      const EmployeeModel =
        mongoose.models.Employee ||
        mongoose.model<IEmployee>("Employee", EmployeeSchema);

      // 1. Sab se bari ID dhoondne ka sahi tareeqa
      const lastEmployee = await EmployeeModel.findOne(
        {} as any,
        { emp_id: 1 },
        { sort: { emp_id: -1 } }, // Hamesha sab se bara number pehle uthayega
      ).lean();

      // Agar record hai to +1, warna 1 se shuru
      const nextIdNumber =
        lastEmployee && lastEmployee.emp_id
          ? Number(lastEmployee.emp_id) + 1
          : 1;

      // 2. Set emp_id (Number format mein)
      this.emp_id = nextIdNumber;

      // 3. Aapka Original Email Format (e.g., 1staff@ccw.com)
      if (!this.email) {
        this.email = `${nextIdNumber}staff@ccw.com`.toLowerCase();
      }

      // 4. Aapka Original Password Format (e.g., staff1012)
      if (!this.password) {
        this.password = `staff${nextIdNumber}012`;
      }

      // 5. Default Role
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
