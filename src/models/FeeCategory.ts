import mongoose, { Schema, model, models, Document } from "mongoose";

// TypeScript Interface declaration
export interface IFeeCategory extends Document {
  name: string;
  isMonthly: boolean;
  maxBaseFee: number;
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

export const FeeCategoryModel =
  models.FeeCategory || model<IFeeCategory>("FeeCategory", FeeCategorySchema);
