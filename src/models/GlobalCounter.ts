import mongoose, { Schema } from "mongoose";

const GlobalCounterSchema = new Schema({
  // 'id' field batayegi ke ye kiska counter hai (e.g., "school_invoice", "student_reg", etc.)
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const GlobalCounterModel =
  mongoose.models.GlobalCounter ||
  mongoose.model("GlobalCounter", GlobalCounterSchema);
