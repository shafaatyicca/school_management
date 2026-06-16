import mongoose from "mongoose";

const FeeDiscountSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    feeCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeCategory",
      required: true,
    },
    baseFee: { type: Number, required: true },
    discountValue: {
      type: Number,
      default: 0,
    },
    customNetFee: {
      type: Number,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

FeeDiscountSchema.index({ studentId: 1, feeCategoryId: 1 }, { unique: true });

export const FeeDiscount =
  mongoose.models.FeeDiscount ||
  mongoose.model("FeeDiscount", FeeDiscountSchema);
