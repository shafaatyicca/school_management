import mongoose, { Schema, model, models } from "mongoose";

const SchoolSettingSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true, // har school ki ek hi settings
    },

    // Voucher par phone (naam/logo/address School model se aate hain)
    phone: { type: String, default: "", trim: true },

    voucher: {
      prefix: { type: String, default: "", trim: true, uppercase: true }, // TMCS
      copies: { type: Number, enum: [1, 2, 3], default: 1 },
      dueDay: { type: Number, min: 1, max: 28, default: 10 }, // har mahine ki tareekh
      validityDays: { type: Number, min: 0, default: 0 }, // month end ke baad extra din
      note: { type: String, default: "" },
      maxItems: { type: Number, min: 1, max: 15, default: 10 }, // voucher par kitni lines
    },

    // NOTE: "type" mongoose ka reserved word hai, is liye "mode"
    lateFee: {
      mode: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
      value: { type: Number, min: 0, default: 0 },
      autoApply: { type: Boolean, default: false }, // tick → asal fine invoice banega
      categoryId: { type: Schema.Types.ObjectId, ref: "FeeCategory", default: null },
      // Fine sirf is mahine/saal aur us ke baad ki invoices par
      startMonth: { type: Number, min: 1, max: 12, default: null },
      startYear: { type: Number, default: null },
    },

    bank: {
      name: { type: String, default: "", trim: true },
      accountTitle: { type: String, default: "", trim: true },
      accountNumber: { type: String, default: "", trim: true },
    },
    
    admission: {
      undertaking: { type: String, default: "" },
      formStyle: { type: String, enum: ["style1", "style2"], default: "style1" },
    },
  },
  { timestamps: true },
);

// Development mein purana cached model hatao, taake naye fields foran lagen
if (process.env.NODE_ENV !== "production" && models.SchoolSetting) {
  mongoose.deleteModel("SchoolSetting");
}

export const SchoolSettingModel =
  models.SchoolSetting || model("SchoolSetting", SchoolSettingSchema);