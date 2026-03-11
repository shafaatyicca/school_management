import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolInvoiceModel } from "@/models/SchoolInvoice";

export async function GET() {
  try {
    await connectDB();
    const currentYear = new Date().getFullYear();

    const stats = await SchoolInvoiceModel.aggregate([
      {
        $facet: {
          // 1. BILLING DATA: Billing Month ke text se mahina nikalna (Expected)
          billingData: [
            {
              $match: {
                status: { $ne: "cancelled" },
              },
            },
            {
              $project: {
                finalAmount: 1,
                bMonth: { $toLower: "$billingMonth" }, // "january 2026"
              },
            },
            {
              $project: {
                finalAmount: 1,
                monthIndex: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /jan/ },
                        },
                        then: 1,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /feb/ },
                        },
                        then: 2,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /mar/ },
                        },
                        then: 3,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /apr/ },
                        },
                        then: 4,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /may/ },
                        },
                        then: 5,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /jun/ },
                        },
                        then: 6,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /jul/ },
                        },
                        then: 7,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /aug/ },
                        },
                        then: 8,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /sep/ },
                        },
                        then: 9,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /oct/ },
                        },
                        then: 10,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /nov/ },
                        },
                        then: 11,
                      },
                      {
                        case: {
                          $regexMatch: { input: "$bMonth", regex: /dec/ },
                        },
                        then: 12,
                      },
                    ],
                    default: { $month: "$createdAt" },
                  },
                },
              },
            },
            {
              $group: {
                _id: "$monthIndex",
                totalBilled: { $sum: "$finalAmount" },
              },
            },
          ],
          // 2. INCOME DATA: Payment History se paison ka hisab (Actual)
          incomeData: [
            { $unwind: "$paymentHistory" },
            {
              $match: {
                "paymentHistory.date": {
                  $gte: new Date(`${currentYear}-01-01`),
                  $lte: new Date(`${currentYear}-12-31`),
                },
              },
            },
            {
              $group: {
                _id: { $month: "$paymentHistory.date" },
                totalCollected: { $sum: "$paymentHistory.amount" },
              },
            },
          ],
        },
      },
    ]);

    // 12 Months structure
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(0, i).toLocaleString("en-US", { month: "short" }),
      income: 0,
      expected: 0,
      pending: 0,
    }));

    const result = stats[0];

    // Billed Mapping
    result.billingData.forEach((item: any) => {
      if (item._id >= 1 && item._id <= 12) {
        monthlyData[item._id - 1].expected = item.totalBilled;
      }
    });

    // Income Mapping
    result.incomeData.forEach((item: any) => {
      if (item._id >= 1 && item._id <= 12) {
        monthlyData[item._id - 1].income = item.totalCollected;
      }
    });

    // --- PENDING CALCULATION (Running Balance) ---
    let totalBilledSoFar = 0;
    let totalCollectedSoFar = 0;

    monthlyData.forEach((month) => {
      totalBilledSoFar += month.expected;
      totalCollectedSoFar += month.income;
      // Balance calculate karein ke ab tak kitna pending hai
      month.pending = Math.max(0, totalBilledSoFar - totalCollectedSoFar);
    });

    return NextResponse.json(monthlyData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
