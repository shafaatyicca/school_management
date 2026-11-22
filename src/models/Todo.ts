import { Schema, model, models } from "mongoose";

export interface ITodo {
  title: string;
  description?: string;
  assignedTo: string[]; // Employee _ids
  assignedUsers: string[]; // Login user _ids (Accountant, Cashier, Helpdesk, custom roles…)
  status: "pending" | "completed";
  priority: "normal" | "high" | "urgent";
  deadline?: Date;
  schoolId: string;
}

const TodoSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: [{ type: String }], // Employee _id (string)
    assignedUsers: { type: [String], default: [] }, // Login user _id (string)
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    
    priority: {
      type: String,
      enum: ["normal", "high", "urgent"],
      default: "normal",
    },
    schoolId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Fast "my tasks" lookup for staff
TodoSchema.index({ schoolId: 1, assignedUsers: 1 });

export default models.Todo || model<ITodo>("Todo", TodoSchema);