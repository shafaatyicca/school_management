import { Schema, model, models, Document } from "mongoose";

export interface IParent extends Document {
  schoolId: string;
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
    schoolId: { type: String, required: true, index: true },
    p_id: { type: Number },
    fullName: { type: String, required: true },
    cnic: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    occupation: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    email: { type: String, unique: true },
    password: { type: String },
  },
  { timestamps: true },
);

// Compound Indexes: Aik school ke andar p_id aur cnic repeat nahi honge
parentSchema.index({ schoolId: 1, p_id: 1 }, { unique: true });
parentSchema.index({ schoolId: 1, cnic: 1 }, { unique: true });

// PRE-SAVE HOOK (Logic for Unique ID, Email, and Password)
parentSchema.pre<IParent>("save", async function () {
  const doc = this;

  if (doc.isNew) {
    try {
      // 1. Model Reference
      const Parent = models.Parent || model<IParent>("Parent", parentSchema);

      // 2. ID Generation (Per School)
      const lastParent = await Parent.findOne({ schoolId: doc.schoolId })
        .sort({ p_id: -1 })
        .select("p_id")
        .lean();

      const nextId =
        lastParent && (lastParent as any).p_id
          ? (lastParent as any).p_id + 1
          : 1;
      doc.p_id = nextId;
      // 3. Email Generation
      const rawId = String(doc.schoolId);
      const cleanId = rawId.replace(/[^a-zA-Z]/g, "").toLowerCase();
      const shortPrefix = cleanId.substring(0, 3); // Sirf pehle 3 harf (e.g., 'mcs')

      doc.email = `${shortPrefix}${nextId}p@myschoolapp.com`.toLowerCase();

      if (!doc.password) {
        doc.password = `${shortPrefix}${nextId}123`;
      }
    } catch (error: any) {
      console.error("Hook Error:", error);
      throw error;
    }
  }
});

export const ParentModel =
  models.Parent || model<IParent>("Parent", parentSchema);
export default ParentModel;
