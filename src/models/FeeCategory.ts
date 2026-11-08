import mongoose, { Schema, model, models, Document } from "mongoose";

// Fee amount kahan se aayega
export type FeeSource = "fixed" | "class_fee";

// TypeScript Interface declaration
export interface IFeeCategory extends Document {
  name: string;
  isMonthly: boolean;
  maxBaseFee: number;
  feeSource: FeeSource;
  schoolId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeeCategorySchema = new Schema<IFeeCategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    isMonthly: {
      type: Boolean,
      default: false,
    },
    maxBaseFee: {
      type: Number,
      default: 0,
      min: [0, "Base fee cannot be negative"],
    },
    feeSource: {
      type: String,
      enum: {
        values: ["fixed", "class_fee"],
        message: "feeSource must be 'fixed' or 'class_fee'",
      },
      default: "fixed",
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
    },
  },
  {
    timestamps: true,
  },
);

// Multi-tenant architecture ki performance ke liye compound index
FeeCategorySchema.index({ schoolId: 1, name: 1 });

// Har school mein sirf EK category class fee se linked ho sakti hai
FeeCategorySchema.index(
  { schoolId: 1 },
  {
    unique: true,
    partialFilterExpression: { feeSource: "class_fee" },
    name: "unique_class_fee_category_per_school",
  },
);

export const FeeCategoryModel =
  models.FeeCategory || model<IFeeCategory>("FeeCategory", FeeCategorySchema);