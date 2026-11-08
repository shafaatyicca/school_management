import { GlobalCounterModel } from "@/models/GlobalCounter";

/**
 * Agla number deta hai (1, 2, 3...).
 *
 * id = "<key>_<schoolId>" → har school ka apna alag counter.
 * Is se aap ke purane GlobalCounter records (doosri ids) par koi asar nahi hota.
 *
 * $inc atomic hai — do log ek saath payment lein tab bhi number repeat nahi hoga.
 */
export async function nextSequence(schoolId: any, key: string) {
  const counter: any = await GlobalCounterModel.findOneAndUpdate(
    { id: `${key}_${String(schoolId)}` } as any,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return counter.seq as number;
}

// 1 → "PID-0001"
export const formatReceiptNo = (n: number) =>
  `PID-${String(n).padStart(4, "0")}`;