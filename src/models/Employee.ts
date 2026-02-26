import mongoose, { Schema, model, models } from "mongoose";

export interface IEmployee {
  [x: string]: any;
  _id?: number;
  emp_id: number; // New Field
  fullName: string;
  image: string;
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
  schoolId: string;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    schoolId: {
      type: String,
      required: [true, "School ID is required"],
      index: true,
    },
    emp_id: {
      type: Number,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    image: {
      type: String,
      default: "",
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
EmployeeSchema.index({ schoolId: 1, emp_id: 1 }, { unique: true });

EmployeeSchema.pre<IEmployee>("save", async function () {
  const doc = this;
  if (doc.isNew) {
    try {
      const EmployeeModel =
        mongoose.models.Employee ||
        mongoose.model<IEmployee>("Employee", EmployeeSchema);

      // 1. Calculate emp_id per school
      const lastEmp = await EmployeeModel.findOne({
        schoolId: doc.schoolId,
      } as any)
        .sort({ emp_id: -1 })
        .select("emp_id")
        .lean();

      const nextId =
        lastEmp && (lastEmp as any).emp_id
          ? Number((lastEmp as any).emp_id) + 1
          : 1;
      doc.emp_id = nextId;

      // 2. Short Prefix Logic (e.g., "mcs")
      const prefix = String(doc.schoolId)
        .replace(/[^a-zA-Z]/g, "")
        .toLowerCase()
        .substring(0, 3);

      // 3. Email & Password Generation
      // Format: mcs1emp@myschoolapp.com
      doc.email = `${prefix}${nextId}emp@schoolapp.com`.toLowerCase();

      if (!doc.password) {
        doc.password = `${prefix}${nextId}123`;
      }

      if (!doc.role) doc.role = "employee";
    } catch (error: any) {
      throw error;
    }
  }
});
const Employee =
  models.Employee || model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
