import { Schema, model, models } from "mongoose";

export interface IClass {
  name: string;
  sections: string[];
}

const classSchema = new Schema<IClass>(
  {
    name: { type: String, required: true },
    sections: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const ClassModel = models.Class || model<IClass>("Class", classSchema);
