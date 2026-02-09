import { Schema, model, models } from "mongoose";

export interface ITodo {
  title: string;
  description?: string;
  assignedTo: string[]; // Number ki jagah String array karein kyunki hum _id use kar rahe hain
  status: "pending" | "completed";
  deadline?: Date;
}

const TodoSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: [{ type: String, required: true }], // Yahan Employee ki _id (string) store hogi
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export default models.Todo || model<ITodo>("Todo", TodoSchema);
