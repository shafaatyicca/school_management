import mongoose, { Schema, Document } from "mongoose";

export interface ISchoolInvoice extends Document {
  invoiceNumber: string; // e.g., INV-001
  schoolId: mongoose.Types.ObjectId;
  planAmount: number;
  totalFeedingAmount: number; // Aap jo total enter karenge
  feedingSplit: {
    month1: number; // System /2 karega
    month2: number; // System /2 karega
  };
  discount: number;
  finalAmount: number; // (Plan + Feeding) - Discount
  amountPaid: number; // Kitna pay ho chuka hai (Partial payment ke liye)
  remainingAmount: number; // Kitna baki hai
  billingMonth: string;
  dueDate: Date;
  status: "pending" | "partially_paid" | "paid" | "cancelled";
  paidAt?: Date; // Last payment date
  paymentHistory: {
    amount: number;
    date: Date;
    note?: string;
  }[];
  createdAt: Date;
}

const SchoolInvoiceSchema = new Schema<ISchoolInvoice>({
  // Auto-increment ke liye hum string use karenge jo API generate karegi
  invoiceNumber: { type: String, required: true, unique: true },
  schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
  planAmount: { type: Number, required: true },
  totalFeedingAmount: { type: Number, default: 0 },
  feedingSplit: {
    month1: { type: Number, default: 0 },
    month2: { type: Number, default: 0 },
  },
  discount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  billingMonth: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "partially_paid", "paid", "cancelled"],
  },
  paidAt: { type: Date },
  // Har baar jab partial payment ho, uska record yahan save hoga
  paymentHistory: [
    {
      amount: Number,
      date: { type: Date, default: Date.now },
      note: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export const SchoolInvoiceModel =
  mongoose.models.SchoolInvoice ||
  mongoose.model<ISchoolInvoice>("SchoolInvoice", SchoolInvoiceSchema);
