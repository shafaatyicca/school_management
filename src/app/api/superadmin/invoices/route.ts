import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolInvoiceModel } from "@/models/SchoolInvoice";
import { SchoolModel } from "@/models/School";
import { GlobalCounterModel } from "@/models/GlobalCounter";

// 1. GET ALL INVOICES
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    let query = schoolId ? { schoolId } : {};

    const invoices = await SchoolInvoiceModel.find(query)
      .populate("schoolId", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREATE INVOICE (Single OR Bulk)
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { type, billingMonth, dueDate } = body;

    // --- BULK GENERATE LOGIC ---
    if (type === "bulk") {
      const schools = await SchoolModel.find({ status: "active" }).populate(
        "planId",
      );
      let count = 0;

      for (const school of schools) {
        const existing = await SchoolInvoiceModel.findOne({
          schoolId: school._id,
          billingMonth,
        });
        if (existing) continue;

        const planFee =
          Number(school.customPrice) ||
          Number((school.planId as any)?.price) ||
          0;

        // PICHLA FEEDING ARREARS: Sirf wo amount uthayega jo pichli invoice k feedingSplit.month2 mein tha
        const lastInv = await SchoolInvoiceModel.findOne({
          schoolId: school._id,
        }).sort({ createdAt: -1 });
        const feedingArrears = Number(lastInv?.feedingSplit?.month2) || 0;

        const totalAmount = planFee + feedingArrears;

        const counter = await GlobalCounterModel.findOneAndUpdate(
          { id: "school_invoice" },
          { $inc: { seq: 1 } },
          { new: true, upsert: true },
        );
        const invoiceNumber = `INV-${counter.seq.toString().padStart(3, "0")}`;

        await SchoolInvoiceModel.create({
          invoiceNumber,
          schoolId: school._id,
          planAmount: planFee,
          feedingSplit: { month1: feedingArrears, month2: 0 }, // Pichla month2 ab month1 ban gaya
          finalAmount: totalAmount,
          amountPaid: 0,
          remainingAmount: totalAmount,
          billingMonth,
          dueDate: new Date(dueDate),
          status: "pending",
        });

        await SchoolModel.findByIdAndUpdate(school._id, {
          expiryDate: new Date(dueDate),
        });
        count++;
      }
      return NextResponse.json({
        success: true,
        message: `${count} Invoices Created!`,
      });
    }

    // --- SINGLE GENERATE LOGIC ---
    const { schoolId, planAmount, feedingSplit, discount } = body;
    const counter = await GlobalCounterModel.findOneAndUpdate(
      { id: "school_invoice" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const invoiceNumber = `INV-${counter.seq.toString().padStart(3, "0")}`;

    const finalAmount =
      Number(planAmount || 0) +
      Number(feedingSplit?.month1 || 0) -
      Number(discount || 0);

    const newInvoice = await SchoolInvoiceModel.create({
      invoiceNumber,
      schoolId,
      planAmount: Number(planAmount),
      feedingSplit, // { month1: X, month2: Y }
      discount: Number(discount || 0),
      finalAmount,
      amountPaid: 0,
      remainingAmount: finalAmount,
      billingMonth,
      dueDate: new Date(dueDate),
      status: "pending",
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. UPDATE / PAY / EDIT
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { invoiceId, action, amountToPay, updatedData, paymentDate } = body;

    const invoice = await SchoolInvoiceModel.findById(invoiceId);
    if (!invoice)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "pay") {
      const payAmount = Number(amountToPay || 0);
      const newPaid = Number(invoice.amountPaid || 0) + payAmount;
      const newRemaining = Math.max(0, Number(invoice.finalAmount) - newPaid);

      const updated = await SchoolInvoiceModel.findByIdAndUpdate(
        invoiceId,
        {
          amountPaid: newPaid,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? "paid" : "pending",
          paidAt:
            newRemaining <= 0 ? paymentDate || new Date() : invoice.paidAt,
          $push: {
            paymentHistory: {
              amount: payAmount,
              date: paymentDate || new Date(),
            },
          },
        },
        { new: true },
      );
      return NextResponse.json(updated);
    }

    if (action === "edit") {
      const finalAmount =
        Number(updatedData.planAmount || 0) +
        Number(updatedData.feedingSplit?.month1 || 0) -
        Number(updatedData.discount || 0);

      const edited = await SchoolInvoiceModel.findByIdAndUpdate(
        invoiceId,
        {
          ...updatedData,
          finalAmount,
          remainingAmount: Math.max(
            0,
            finalAmount - Number(invoice.amountPaid || 0),
          ),
          status:
            finalAmount - Number(invoice.amountPaid || 0) <= 0
              ? "paid"
              : "pending",
        },
        { new: true },
      );
      return NextResponse.json(edited);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE (Single & Bulk)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");

    if (ids) {
      // Bulk Delete
      await SchoolInvoiceModel.deleteMany({ _id: { $in: ids.split(",") } });
      return NextResponse.json({ message: "Selected invoices deleted" });
    }

    if (id) {
      // Single Delete
      await SchoolInvoiceModel.findByIdAndDelete(id);
      return NextResponse.json({ message: "Invoice deleted" });
    }

    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
