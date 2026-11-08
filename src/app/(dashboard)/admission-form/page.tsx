"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FileText, Printer, Settings2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { DEFAULT_UNDERTAKING } from "@/lib/voucherDates";
import {
  buildAdmissionFormHtml,
  printAdmissionForm,
  type AdmissionFormData,
} from "@/lib/printFeeVoucher";

export default function AdmissionFormPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const schoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;

  const [school, setSchool] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Super admin: resolve school from subdomain
  useEffect(() => {
    if (!isSuperAdmin) return;
    const host = window.location.hostname;
    if (host.includes(".lvh.me") || host.includes(".localhost")) {
      fetch(`/api/superadmin/schools?slug=${host.split(".")[0]}`)
        .then((r) => r.json())
        .then((d) => d?._id && setViewSchoolId(d._id));
    }
  }, [isSuperAdmin]);

  // School info (name, address, logo, phone) + settings (undertaking)
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/superadmin/schools?id=${schoolId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/settings?schoolId=${schoolId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sch, set]) => {
        setSchool(sch);
        setSettings(set);
      })
      .catch(() => notify.error("Failed to load school details"))
      .finally(() => setLoading(false));
  }, [schoolId]);

  const formData: AdmissionFormData = useMemo(
    () => ({
      school: {
        name: school?.name,
        address: school?.address,
        logo: school?.logo,
        phone: school?.phone,
      },
      undertaking: settings?.admission?.undertaking || DEFAULT_UNDERTAKING,
      style: settings?.admission?.formStyle === "style2" ? "style2" : "style1",
    }),
    [school, settings],
  );

  const previewHtml = useMemo(() => buildAdmissionFormHtml(formData), [formData]);

  return (
    <div className="space-y-3">
      <PageHeader title="Admission Form" icon={<FileText className="w-4 h-4" />} />

      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
      >
        <div>
          <p className="text-sm font-bold text-foreground">Blank Admission Form</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Print and hand it to parents. The undertaking text is managed in Settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 h-9 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10"
            style={{ borderColor: "var(--border)" }}
          >
            <Settings2 className="w-3.5 h-3.5" /> Edit Undertaking
          </Link>
          <Button
            onClick={() => printAdmissionForm(formData)}
            disabled={loading}
            className="h-9 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print Admission Form
          </Button>
        </div>
      </div>

      {/* Live preview (exactly what will be printed) */}
      <div
        className="rounded-xl border p-4 flex justify-center"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
      >
        {loading ? (
          <p className="py-20 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Loading form...
          </p>
        ) : (
          <iframe
            title="Admission Form Preview"
            srcDoc={previewHtml}
            className="w-full max-w-[820px] rounded-md bg-white shadow-lg"
            style={{ height: 1120, border: "1px solid var(--border)" }}
          />
        )}
      </div>
    </div>
  );
}