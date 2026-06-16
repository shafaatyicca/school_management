import { Schema, model, models } from "mongoose";

export interface IClass {
  schoolId: string;
  name: string;
  sections: string[];
  order: number;
  classFee: number;
}

const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: true,
    },
    sections: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    classFee: { type: Number, default: 0 },
    schoolId: {
      type: String,
      required: [true, "School ID is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const ClassModel = models.Class || model<IClass>("Class", classSchema);
