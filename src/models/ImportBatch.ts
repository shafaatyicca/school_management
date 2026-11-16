import mongoose, { Schema, model, models } from "mongoose";

// One record per bulk import — used for history and Undo
const ImportBatchSchema = new Schema(
  {
    schoolId: { type: String, required: true, index: true },
    fileName: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    totalRows: { type: Number, default: 0 },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    parentIds: [{ type: Schema.Types.ObjectId, ref: "Parent" }], // only parents created by this import
    failed: [{ row: Number, message: String }],
    status: { type: String, enum: ["completed", "undone"], default: "completed" },
    undoneAt: { type: Date },
  },
  { timestamps: true },
);

export const ImportBatch =
  models.ImportBatch || model("ImportBatch", ImportBatchSchema);