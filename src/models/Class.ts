import { Schema, model, models } from "mongoose";

// 1. Interface update ki gayi hai 'order' field ke sath
export interface IClass {
  name: string;
  sections: string[];
  order: number; // Classes ki sequence handle karne ke liye
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
    // 2. Nayi field 'order' jo custom sorting ke liye use hogi
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Model export
export const ClassModel = models.Class || model<IClass>("Class", classSchema);
