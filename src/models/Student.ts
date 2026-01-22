import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IStudent extends Document {
  grNumber: number;
  fullName: string;
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
  status: "active" | "inactive";
  inactiveDate?: Date;
  inactiveReason?: string;
  detailedNote?: string;
}

const StudentSchema = new Schema<IStudent>(
  {
    grNumber: { type: Number, unique: true },
    fullName: { type: String, required: true },
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
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    inactiveDate: { type: Date },
    inactiveReason: { type: String },
    detailedNote: { type: String },
  },
  { timestamps: true },
);

StudentSchema.pre<IStudent>("save", async function (this: IStudent) {
  if (this.isNew) {
    const StudentModel =
      mongoose.models.Student ||
      mongoose.model<IStudent>("Student", StudentSchema);
    const lastStudent = await StudentModel.findOne(
      {},
      { grNumber: 1 },
      { sort: { grNumber: -1 } },
    ).lean();
    this.grNumber =
      lastStudent && lastStudent.grNumber ? lastStudent.grNumber + 1 : 1;
  }
});

const Student = models.Student || model<IStudent>("Student", StudentSchema);
export default Student;
