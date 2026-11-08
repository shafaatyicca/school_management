"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { notify } from "@/lib/notify";
import { AlertCircle, User } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DiscountAddModal from "@/components/DiscountAddModal";
import InvoiceGenerateModal from "@/components/InvoiceGenerateModal";
import ViewSingleDiscountModal from "@/components/ViewSingleDiscountModal";
import StudentInvoiceTable from "@/components/StudentInvoiceTable";
import TakePaymentModal from "@/components/TakePaymentModal";
import InvoiceDetailModal from "@/components/InvoiceDetailModal";
import StudentSearchBox from "@/components/StudentSearchBox";
import RecentPaymentsModal from "@/components/RecentPaymentsModal";

export default function StudentFeeLedgerPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editDiscount, setEditDiscount] = useState<any>(null);
  const [isViewDiscountOpen, setIsViewDiscountOpen] = useState(false);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [detailInvoice, setDetailInvoice] = useState<any>(null);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const hostname = window.location.hostname;
    const isSubdomain =
      hostname.includes(".lvh.me") || hostname.includes(".localhost");
    if (isSubdomain) {
      const slug = hostname.split(".")[0];
      fetch(`/api/superadmin/schools?slug=${slug}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?._id) setViewSchoolId(data._id);
        });
    }
  }, [isSuperAdmin]);

  useEffect(() => {
  if (!effectiveSchoolId) return;
  fetch(`/api/superadmin/schools?id=${effectiveSchoolId}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d && setSchoolInfo(d))
    .catch(() => {});
}, [effectiveSchoolId]);

  // Student load karo — query = naam, GR# ya student ki _id (dropdown se)
  const loadStudent = async (query: string) => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/Fee_Management/student-fee-ledger?studentId=${encodeURIComponent(query)}&schoolId=${effectiveSchoolId}`,
      );
      const data = await response.json();
      const match = Array.isArray(data) ? data[0] : null;
      if (match && match.studentId) {
        const student = match.studentId._doc || match.studentId;
        setStudentInfo({
          ...match.studentId,
          _id: student._id,
          imageUrl: match.studentId.image,
          className: match.studentId.classId?.name || "N/A",
          classFee: match.studentId.classId?.classFee || 0,
          parentName: match.studentId.parentId?.fullName || "N/A",
          parentPhone: match.studentId.parentId?.phone || "---",
          netPayable: match.netPayable || 0,
        });
        setDiscounts(match.studentId.discounts || []);
        notify.success("Student Fee Ledger loaded");
        if (match.studentId?._id) {
          fetch(`/api/Fee_Management/discounts?studentId=${match.studentId._id}`)
            .then((r) => r.json())
            .then((data) => setDiscounts(Array.isArray(data) ? data : []));
        }
      } else {
        setStudentInfo(null);
        notify.error("No student found");
      }
    } catch (error) {
      notify.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };
  const fetchDiscounts = (studentId: string) => {
    if (!studentId) return;
    fetch(`/api/Fee_Management/discounts?studentId=${studentId}`)
      .then((r) => r.json())
      .then((data) => setDiscounts(Array.isArray(data) ? data : []));
  };
  return (
    <div className="space-y-6">
      {/* Header Row */}
      <PageHeader
        title="Student Fee Ledger"
        rightContent={
          <StudentSearchBox
            schoolId={effectiveSchoolId}
            loading={loading}
            onSelect={(s) => loadStudent(s._id)}
            onSearch={(q) => loadStudent(q)}
          />
        }
      />

      {/* Content Area */}
      {studentInfo ? (
        <div className="rounded-md mt-2 bg-card shadow-sm">
          <div className="flex flex-col lg:flex-row w-full items-start gap-4">
            {/* Info Table */}
            <div className="flex items-center gap-4 w-full">
              <div className="w-full overflow-hidden rounded border border-slate-200">
                {/* Header Row */}
                <div className="flex items-center justify-between border-b bg-slate-50 dark:bg-slate-800 p-1">
                  <div className="text-md text-red-500">Student Info :</div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setIsInvoiceModalOpen(true)}
                      className="rounded bg-green-600 px-3 py-1 text-xs text-white cursor-pointer hover:bg-green-700"
                    >
                      Generate Invoice
                    </button>

                    <button className="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-indigo-800">
                      Final Reminder Letter
                    </button>

                    <button
                      onClick={() => setIsRecentOpen(true)}
                      className="rounded bg-sky-500 px-3 py-1 text-xs text-white cursor-pointer hover:bg-sky-600"
                    >
                      Recent Payments
                    </button>
                  </div>
                </div>

                {/* Body Contnt */}
                <div className="flex items-center p-0">
                  {/* Image */}
                  <div className="p-2.5">
                    <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-sky-500 shadow-lg">
                      {studentInfo.imageUrl ? (
                        <img
                          src={studentInfo.imageUrl}
                          alt="Student"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-700">
                          <User className="h-12 w-12 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="w-full min-w-0 overflow-hidden rounded border border-slate-200 dark:border-slate-700">
                    <table className="w-full table-fixed border-collapse text-xs">
                      <tbody>
                        <tr className="border-b bg-slate-50 dark:bg-slate-800">
                          <td className="p-1">GR Number</td>
                          <td className="p-1">{studentInfo.grNumber}</td>

                          <td className="p-1">Admission Date</td>
                          <td className="p-1">
                            {studentInfo.enrollmentDate
                              ? new Date(
                                  studentInfo.enrollmentDate,
                                ).toLocaleDateString()
                              : "---"}
                          </td>
                        </tr>

                        <tr className="border-b">
                          <td className="p-1">Name</td>
                          <td className="p-1 text-sky-600">
                            {studentInfo.fullName}
                          </td>

                          <td className="p-1">Class</td>
                          <td className="p-1">
                            {studentInfo.className} ({studentInfo.section})
                          </td>
                        </tr>

                        <tr className="border-b bg-slate-50 dark:bg-slate-800">
                          <td className="p-1">Parent Name</td>
                          <td className="p-1 text-sky-600">
                            {studentInfo.parentName || "---"}
                          </td>

                          <td className="p-1">Parent Phone</td>
                          <td className="p-1">
                            {studentInfo.parentPhone || "---"}
                          </td>
                        </tr>

                        <tr className="border-b">
                          <td className="p-1">Mother Name</td>
                          <td className="p-1">
                            {studentInfo.motherName || "---"}
                          </td>

                          <td className="p-1">Mother Phone</td>
                          <td className="p-1">
                            {studentInfo.motherPhone || "---"}
                          </td>
                        </tr>

                        <tr className="bg-slate-50 dark:bg-slate-800">
                          <td className="p-1">Guardian Name</td>
                          <td className="p-1">
                            {studentInfo.guardianName || "---"}
                          </td>

                          <td className="p-1">Guardian Phone</td>
                          <td className="p-1">
                            {studentInfo.guardianPhone || "---"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 w-80 overflow-hidden rounded border border-slate-200 ">
                <div className="flex items-center justify-between border-b bg-slate-50 dark:bg-slate-800 p-1">
                  <h4 className=" text-red-500">Discounts</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="rounded bg-green-600 px-2 py-1 text-xs text-white cursor-pointer"
                    >
                      Add
                    </button>

                    <button className="rounded bg-blue-600/20 dark:text-white px-2 py-1 text-xs text-black cursor-pointer" 
                      onClick={() => setIsViewDiscountOpen(true)}>
                      View Discounts
                    </button>
                  </div>
                </div>

                <table className="w-full text-xs">
                  <tbody>
                    {discounts.map((item: any) => (
                      <tr key={item._id} className="border-t">
                        <td className="p-1 flex items-center  gap-1">
                          <span>{item.feeCategoryId?.name}</span>
                        </td>
                        <td className="p-1 text-center text-blue-600">
                          {item.baseFee ?? 0}
                        </td>
                        <td className="p-1 text-center text-pink-600">
                          {(item.baseFee ?? 0) - (item.customNetFee ?? 0)}
                        </td>
                        <td className="p-1 text-center text-green-600">
                          {item.customNetFee ?? 0}
                        </td>
                      </tr>
                    ))}

                    {/* Empty Rows Logic - yahan length 4 ya 5 set kar dein jo aapko chahiye */}
                    {Array.from({
                      length: Math.max(0, 4 - discounts.length),
                    }).map((_, index) => (
                      <tr key={`empty-${index}`} className="border-t">
                        <td className="p-1">-</td>
                        <td className="p-1 text-center text-blue-600">-</td>
                        <td className="p-1 text-center text-pink-600">-</td>
                        <td className="p-1 text-center text-green-600">-</td>
                      </tr>
                    ))}

                    {/* TOTAL Row */}
                    <tr className="border-t bg-slate-50 dark:bg-slate-800 text-xs">
                      <td className="p-1 font-bold">Total</td>

                      {/* Base Fee Total */}
                      <td className="p-1 text-center text-blue-600">
                        {discounts.reduce((sum, d) => sum + (d.baseFee ?? 0), 0)}
                      </td>

                      {/* Discount Total */}
                      <td className="p-1 text-center text-pink-600 font-bold">
                        {discounts.reduce(
                          (sum, d) =>
                            sum + ((d.baseFee ?? 0) - (d.customNetFee ?? 0)),
                          0,
                        )}
                      </td>

                      {/* Net Total */}
                      <td className="p-1 text-center text-green-600 font-bold">
                        {discounts.reduce(
                          (sum, d) => sum + (d.customNetFee ?? 0),
                          0,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 flex-col mt-6 p-5 items-center justify-center rounded-xl border-2 border-dashed text-violet-700 border-amber-500">
          <AlertCircle className="mb-2 h-10 w-10" />
          <p>Please search for a student to view their ledger.</p>
        </div>
      )}

      {isModalOpen && (
        <DiscountAddModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditDiscount(null);
          }}
          editDiscount={editDiscount}
          studentId={studentInfo?._id}
          studentName={studentInfo?.fullName}
          className={`${studentInfo?.classId?.name || ""} (${studentInfo?.section || ""})`}
          schoolId={effectiveSchoolId}
          classFee={studentInfo?.classFee || 0}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditDiscount(null);
            fetchDiscounts(studentInfo?._id);
          }}
        />
      )}

      {/* Create Invoice */}
      {isInvoiceModalOpen && (
        <InvoiceGenerateModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          studentId={studentInfo?._id}
          studentName={studentInfo?.fullName}
          className={studentInfo?.className || ""}
          section={studentInfo?.section || ""}
          schoolId={effectiveSchoolId}
          classFee={studentInfo?.classFee || 0}
          onSuccess={() => {
            setIsInvoiceModalOpen(false);
            setInvoiceRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {/* Edit Invoice (sirf is invoice ka discount) — same modal */}
      {editInvoice && (
        <InvoiceGenerateModal
          isOpen={!!editInvoice}
          onClose={() => setEditInvoice(null)}
          editInvoice={editInvoice}
          studentId={studentInfo?._id}
          studentName={studentInfo?.fullName}
          className={studentInfo?.className || ""}
          section={studentInfo?.section || ""}
          schoolId={effectiveSchoolId}
          classFee={studentInfo?.classFee || 0}
          onSuccess={() => {
            setEditInvoice(null);
            setInvoiceRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {isViewDiscountOpen && (
        <ViewSingleDiscountModal
          isOpen={isViewDiscountOpen}
          onClose={() => setIsViewDiscountOpen(false)}
          studentId={studentInfo?._id}
          studentName={studentInfo?.fullName}
          className={studentInfo?.className || ""}
          section={studentInfo?.section || ""}
          schoolId={effectiveSchoolId}
          discounts={discounts}
          classFee={studentInfo?.classFee || 0}
          onEdit={(discount) => {
            setEditDiscount(discount);
            setIsModalOpen(true);
          }}
          onRefresh={() => fetchDiscounts(studentInfo?._id)}
        />
      )}

      {studentInfo && (
        <StudentInvoiceTable
          key={invoiceRefreshKey}
          studentId={studentInfo?._id}
          schoolId={effectiveSchoolId || ""}
          onPayClick={(inv) => setPayInvoice(inv)}
          onDetailClick={(inv) => setDetailInvoice(inv)}
          onEditClick={(inv) => setEditInvoice(inv)}
          exportHeader={{
            school: {
              name: schoolInfo?.name,
              address: schoolInfo?.address,
              logo: schoolInfo?.logo,
            },
            info: [
              { label: "Name", value: `${studentInfo?.fullName} (GR# ${studentInfo?.grNumber})` },
              { label: "Father Name", value: studentInfo?.parentName },
              {
                label: "Class",
                value: studentInfo?.section
                  ? `${studentInfo?.className} (${studentInfo?.section})`
                  : studentInfo?.className,
              },
            ],
          }}
        />
      )}

      {payInvoice && (
        <TakePaymentModal
          isOpen={!!payInvoice}
          onClose={() => setPayInvoice(null)}
          invoice={payInvoice}
          onSuccess={() => {
            setPayInvoice(null);
            setInvoiceRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {detailInvoice && (
        <InvoiceDetailModal
          isOpen={!!detailInvoice}
          onClose={() => setDetailInvoice(null)}
          invoice={detailInvoice}
          studentInfo={studentInfo}
        />
      )}

      {isRecentOpen && (
        <RecentPaymentsModal
          isOpen={isRecentOpen}
          onClose={() => setIsRecentOpen(false)}
          studentId={studentInfo?._id}
          studentName={studentInfo?.fullName}
          className={studentInfo?.className || ""}
          section={studentInfo?.section || ""}
          schoolId={effectiveSchoolId || ""}
          onChanged={() => setInvoiceRefreshKey((prev) => prev + 1)}
        />
      )}

    </div>
  );
}