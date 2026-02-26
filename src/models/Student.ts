import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IStudent extends Document {
  schoolId: string;
  grNumber: number;
  fullName: string;
  image?: string;
  email: string;
  password?: string;
  gender: string;
  cast?: string;
  religion: string;
  nationality: string;
  placeOfBirth?: string;
  dateOfBirth: Date;
  bFormNumber?: string;
  classId: mongoose.Types.ObjectId;
  section: string;
  enrollmentDate: Date;
  previousSchool?: string;
  parentId?: mongoose.Types.ObjectId;
  motherName?: string;
  motherProfession?: string;
  motherPhone?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  status: "active" | "inactive";
  inactiveDate?: Date;
  inactiveReason?: string;
  detailedNote?: string;
}

const StudentSchema = new Schema<IStudent>(
  {
    schoolId: {
      type: String,
      required: [true, "School ID is required"],
      index: true,
    },
    grNumber: { type: Number },
    fullName: { type: String, required: true },
    image: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    gender: { type: String, required: true },
    cast: { type: String },
    religion: { type: String, default: "Islam" },
    nationality: { type: String, default: "Pakistani" },
    placeOfBirth: { type: String },
    dateOfBirth: { type: Date, required: true },
    bFormNumber: { type: String },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    section: { type: String, required: true },
    enrollmentDate: { type: Date, default: Date.now },
    previousSchool: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: "Parent" },
    motherName: { type: String },
    motherProfession: { type: String },
    motherPhone: { type: String },
    guardianName: { type: String },
    guardianPhone: { type: String },
    guardianRelation: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    inactiveDate: { type: Date },
    inactiveReason: { type: String },
    detailedNote: { type: String },
  },
  { timestamps: true },
);
StudentSchema.index({ schoolId: 1, grNumber: 1 }, { unique: true });

StudentSchema.pre<IStudent>("save", async function () {
  const doc = this;
  if (doc.isNew) {
    try {
      const StudentModel =
        mongoose.models.Student ||
        mongoose.model<IStudent>("Student", StudentSchema);

      // 1. Calculate GR Number (Per School)
      const lastStudent = await StudentModel.findOne({ schoolId: doc.schoolId })
        .sort({ grNumber: -1 })
        .select("grNumber")
        .lean();

      const nextGrNumber =
        lastStudent && (lastStudent as any).grNumber
          ? (lastStudent as any).grNumber + 1
          : 1;
      doc.grNumber = nextGrNumber;

      // 2. Prefix Logic (Aggressive Short)
      const shortPrefix = String(doc.schoolId)
        .replace(/[^a-zA-Z]/g, "")
        .toLowerCase()
        .substring(0, 3);

      // 3. Email & Password (mcs1st@myschoolapp.com)
      doc.email =
        `${shortPrefix}${nextGrNumber}st@myschoolapp.com`.toLowerCase();

      if (!doc.password) {
        doc.password = `${shortPrefix}${nextGrNumber}123`;
      }
    } catch (error: any) {
      throw error;
    }
  }
});

const Student = models.Student || model<IStudent>("Student", StudentSchema);
export default Student;
