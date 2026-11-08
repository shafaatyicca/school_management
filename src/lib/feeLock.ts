import { FeeDiscount } from "@/models/FeeDiscount";
import { FeeCategoryModel } from "@/models/FeeCategory";
import Student from "@/models/Student";
import "@/models/Class"; // populate ke liye model register

function adjustToBase(record: any, newBase: number) {
  const oldNet = record.customNetFee ?? record.baseFee ?? newBase;
  const net = Math.min(oldNet, newBase);
  return {
    baseFee: newBase,
    customNetFee: net,
    discountType: "fixed",
    discountValue: newBase - net,
  };
}

export async function ensureTuitionLock(studentId: string) {
  const student: any = await (Student as any).findById(studentId)
    .select("schoolId classId")
    .populate("classId", "classFee")
    .lean();
  if (!student) return null;

  const category: any = await (FeeCategoryModel as any).findOne({
    schoolId: student.schoolId,
    feeSource: "class_fee",
  } as any).lean();
  if (!category) return null; // school ne abhi class fee category set nahi ki

  const fee = student.classId?.classFee || 0;

  // $setOnInsert: sirf naya record banate waqt values lagengi
  const record: any = await (FeeDiscount as any).findOneAndUpdate(
    { studentId: student._id, feeCategoryId: category._id } as any,
    {
      $setOnInsert: {
        studentId: student._id,
        schoolId: student.schoolId,
        feeCategoryId: category._id,
        baseFee: fee,
        customNetFee: fee,
        discountType: "fixed",
        discountValue: 0,
        remarks: "Auto fee lock",
      },
    },
    { upsert: true, new: true, lean: true },
  );
  if (!record || fee <= 0) return record;

  // ── Purana kharab record (baseFee 0)
  if (!record.baseFee || record.baseFee <= 0) {
    const net =
      record.customNetFee && record.customNetFee > 0 && record.customNetFee <= fee
        ? record.customNetFee
        : fee;
    return (FeeDiscount as any).findOneAndUpdate(
      { _id: record._id } as any,
      {
        $set: {
          baseFee: fee,
          customNetFee: net,
          discountType: "fixed",
          discountValue: fee - net,
          schoolId: student.schoolId,
        },
      },
      { new: true, lean: true },
    );
  }

  // ── Class fee badal chuki hai → base update, net wahi
  if (record.baseFee !== fee) {
    return (FeeDiscount as any).findOneAndUpdate(
      { _id: record._id } as any,
      { $set: adjustToBase(record, fee) },
      { new: true, lean: true },
    );
  }

  return record;
}

export async function syncTuitionWithClassFee(
  classId: string,
  oldFee: number,
  newFee: number,
) {
  if (!newFee || newFee <= 0 || oldFee === newFee) return;

  const students: any[] = await Student.find({ classId } as any)
    .select("_id schoolId")
    .lean();
  if (students.length === 0) return;

  // Har school ki class_fee category
  const schoolIds = [...new Set(students.map((s) => String(s.schoolId)))];
  const categories: any[] = await (FeeCategoryModel as any).find({
    schoolId: { $in: schoolIds },
    feeSource: "class_fee",
  } as any)
    .select("_id schoolId")
    .lean();
  if (categories.length === 0) return;

  const categoryBySchool = new Map(
    categories.map((c) => [String(c.schoolId), c._id]),
  );

  // Maujooda records
  const records: any[] = await (FeeDiscount as any).find({
    studentId: { $in: students.map((s) => s._id) },
    feeCategoryId: { $in: categories.map((c) => c._id) },
  } as any).lean();
  const recordByStudent = new Map(records.map((r) => [String(r.studentId), r]));

  const ops: any[] = [];
  for (const s of students) {
    const categoryId = categoryBySchool.get(String(s.schoolId));
    if (!categoryId) continue;

    const record = recordByStudent.get(String(s._id));

    if (record) {
      // Record hai → base nayi fee, net wahi
      ops.push({
        updateOne: {
          filter: { _id: record._id },
          update: { $set: adjustToBase(record, newFee) },
        },
      });
    } else {
      // Record nahi → purani fee par lock
      const net = Math.min(oldFee > 0 ? oldFee : newFee, newFee);
      ops.push({
        updateOne: {
          filter: { studentId: s._id, feeCategoryId: categoryId },
          update: {
            $setOnInsert: {
              studentId: s._id,
              schoolId: s.schoolId,
              feeCategoryId: categoryId,
              baseFee: newFee,
              customNetFee: net,
              discountType: "fixed",
              discountValue: newFee - net,
              remarks: "Auto fee lock",
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (ops.length) await (FeeDiscount as any).bulkWrite(ops);
}