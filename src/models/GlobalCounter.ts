import mongoose, { Schema } from "mongoose";

const GlobalCounterSchema = new Schema({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const GlobalCounterModel =
  mongoose.models.GlobalCounter ||
  mongoose.model("GlobalCounter", GlobalCounterSchema);
