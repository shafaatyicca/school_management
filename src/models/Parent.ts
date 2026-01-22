import { Schema, model, models, Document } from "mongoose";

export interface IParent extends Document {
  p_id: number;
  fullName: string;
  cnic: string;
  phone: string;
  address: string;
  occupation?: string;
  gender: "Male" | "Female" | "Other";
  email: string;
  password?: string;
}

const parentSchema = new Schema<IParent>(
  {
    p_id: { type: Number, unique: true },
    fullName: { type: String, required: true },
    cnic: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    occupation: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    email: { type: String, unique: true },
    password: { type: String },
  },
  { timestamps: true },
);

// Pre-save hook for p_id, email, and password
parentSchema.pre<IParent>("save", async function () {
  if (this.isNew) {
    const ParentModel = models.Parent || model<IParent>("Parent", parentSchema);

    // 1. Calculate p_id (Auto-increment)
    const lastParent = await ParentModel.findOne(
      {},
      { p_id: 1 },
      { sort: { p_id: -1 } },
    ).lean();

    const nextPId = lastParent && lastParent.p_id ? lastParent.p_id + 1 : 1;
    this.p_id = nextPId;
    this.email = `${nextPId}p@themuslimcollegaiteschool.com`.toLowerCase();
    if (!this.password) {
      this.password = `prnt${nextPId}123`;
    }
  }
});

export const ParentModel =
  models.Parent || model<IParent>("Parent", parentSchema);
export default ParentModel;
