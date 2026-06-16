import mongoose, { Schema, model, models, Document } from "mongoose";

const PaymentRecordSchema = new Schema({
  amount: { type: Number, required: true },
  paidDate: { type: Date, default: Date.now },
  method: { type: String, enum: ["cash", "bank", "online"], default: "cash" },
  note: { type: String, default: "" },
  receivedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
});

export interface IStudentFeeInvoice extends Document {
  studentId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  feeCategoryId: mongoose.Types.ObjectId;
  categoryName: string;
  month: number;
  year: number;
  title: string;
  baseFee: number;
  discount: number;
  netPayable: number;
  paidAmount: number;
  remainingAmount: number;
  status: "pending" | "paid" | "partial";
  paymentHistory: any[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentFeeInvoiceSchema = new Schema<IStudentFeeInvoice>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    schoolId:  { type: Schema.Types.ObjectId, ref: "School",  required: true },
    feeCategoryId: { type: Schema.Types.ObjectId, ref: "FeeCategory", required: true },
    categoryName: { type: String, required: true },
    month:     { type: Number, required: true, min: 1, max: 12 },
    year:      { type: Number, required: true },
    title:     { type: String, default: "" },
    baseFee:    { type: Number, default: 0 },
    discount:   { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },
    paidAmount:      { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "partial"],
      default: "pending",
    },

    paymentHistory: [PaymentRecordSchema],
  },
  { timestamps: true },
);

export const StudentFeeInvoice =
  models.StudentFeeInvoice ||
  model<IStudentFeeInvoice>("StudentFeeInvoice", StudentFeeInvoiceSchema);