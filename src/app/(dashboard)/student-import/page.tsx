"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx-js-style";
import {
  FileUp,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Undo2,
  ShieldAlert,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { notify } from "@/lib/notify";

// ─────────────────────────────────────────────────────────────
// Template columns (header text must match the uploaded sheet)
// ─────────────────────────────────────────────────────────────
type Col = { key: string; header: string; required?: boolean; text?: boolean };

const COLUMNS: Col[] = [
  { key: "grNumber", header: "GR Number" },
  { key: "studentName", header: "Student Name", required: true },
  { key: "gender", header: "Gender", required: true },
  { key: "dateOfBirth", header: "Date of Birth", text: true },
  { key: "placeOfBirth", header: "Place of Birth" },
  { key: "bFormNumber", header: "B-Form Number", text: true },
  { key: "caste", header: "Caste" },
  { key: "religion", header: "Religion" },
  { key: "nationality", header: "Nationality" },
  { key: "className", header: "Class", required: true },
  { key: "section", header: "Section", required: true },
  { key: "admissionDate", header: "Admission Date", text: true },
  { key: "status", header: "Status" },
  { key: "inactiveDate", header: "Inactive Date", text: true },
  { key: "inactiveReason", header: "Inactive Reason" },
  { key: "previousSchool", header: "Previous School" },
  { key: "fatherName", header: "Father Name", required: true },
  { key: "fatherCnic", header: "Father CNIC", text: true },
  { key: "fatherPhone", header: "Father Phone", required: true, text: true },
  { key: "fatherOccupation", header: "Father Occupation" },
  { key: "address", header: "Address" },
  { key: "motherName", header: "Mother Name" },
  { key: "motherProfession", header: "Mother Profession" },
  { key: "motherPhone", header: "Mother Phone", text: true },
  { key: "guardianName", header: "Guardian Name" },
  { key: "guardianRelation", header: "Guardian Relation" },
  { key: "guardianPhone", header: "Guardian Phone", text: true },
  { key: "monthlyFee", header: "Monthly Fee" },
  { key: "arrears", header: "Previous Arrears" },
  { key: "remarks", header: "Remarks" },
];

const DATE_KEYS = new Set(["dateOfBirth", "admissionDate", "inactiveDate"]);
const CHUNK_SIZE = 40;
const TEMPLATE_ROWS = 500;

const normHeader = (s: any) => String(s ?? "").replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const pad = (n: number) => String(n).padStart(2, "0");

// Excel cell → plain text (date serials become YYYY-MM-DD)
function cellToText(key: string, v: any) {
  if (v === null || v === undefined) return "";
  if (DATE_KEYS.has(key) && typeof v === "number") {
    const d = (XLSX as any).SSF.parse_date_code(v);
    if (d) return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  return String(v).trim();
}

type Result = {
  row: number;
  status: "ok" | "warning" | "error";
  errors: string[];
  warnings: string[];
  preview: any;
};

export default function StudentImportPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [school, setSchool] = useState<any>(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "ok" | "warning" | "error">("all");
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ imported: number; failed: { row: number; message: string }[] } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [undoTarget, setUndoTarget] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // School from subdomain (super admin only)
  useEffect(() => {
    if (!isSuperAdmin) return;
    const host = window.location.hostname;
    if (host.includes(".lvh.me") || host.includes(".localhost")) {
      fetch(`/api/superadmin/schools?slug=${host.split(".")[0]}`)
        .then((r) => r.json())
        .then((d) => d?._id && setSchoolId(d._id));
    }
  }, [isSuperAdmin]);

  const loadHistory = useCallback(() => {
    if (!schoolId) return;
    fetch(`/api/superadmin/student-import?schoolId=${schoolId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/superadmin/schools?id=${schoolId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSchool)
      .catch(() => {});
    loadHistory();
  }, [schoolId, loadHistory]);

  // ── Counts
  const counts = useMemo(
    () => ({
      all: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      warning: results.filter((r) => r.status === "warning").length,
      error: results.filter((r) => r.status === "error").length,
    }),
    [results],
  );
  const validCount = counts.ok + counts.warning;
  const shown = filter === "all" ? results : results.filter((r) => r.status === filter);

    // ── Template download (Students sheet only)
  const downloadTemplate = () => {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F3D68" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
    };

    // Header row; text columns pre-formatted as Text (keeps leading 0 in phones)
    const ws = XLSX.utils.aoa_to_sheet([COLUMNS.map((c) => (c.required ? `${c.header} *` : c.header))]);
    COLUMNS.forEach((c, ci) => {
      (ws[XLSX.utils.encode_cell({ r: 0, c: ci })] as any).s = headerStyle;
      if (!c.text) return;
      for (let r = 1; r <= TEMPLATE_ROWS; r++) {
        ws[XLSX.utils.encode_cell({ r, c: ci })] = { t: "s", v: "", z: "@", s: { numFmt: "@" } } as any;
      }
    });
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: TEMPLATE_ROWS, c: COLUMNS.length - 1 } });
    ws["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(14, c.header.length + 4) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Student_Import_${(school?.name || "School").replace(/\s+/g, "_")}.xlsx`);
  };

  // ── Upload → parse → validate (nothing saved)
  const handleFile = async (file: File) => {
    setSummary(null);
    setResults([]);
    setGlobalErrors([]);
    setFilter("all");
    setFileName(file.name);

    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets["Students"] || wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true }) as any[][];
      if (raw.length < 2) throw new Error("The sheet has no student rows");

      // Map header text → column key
      const headerKeys = raw[0].map((h) => COLUMNS.find((c) => normHeader(c.header) === normHeader(h))?.key || null);
      const missing = COLUMNS.filter((c) => c.required && !headerKeys.includes(c.key)).map((c) => c.header);
      if (missing.length) throw new Error(`Missing column(s): ${missing.join(", ")} — please use the template`);

      const parsed = raw
        .slice(1)
        .map((arr, i) => {
          const obj: any = { __row: i + 2 };
          headerKeys.forEach((k, ci) => {
            if (k) obj[k] = cellToText(k, arr[ci]);
          });
          return obj;
        })
        .filter((o) => COLUMNS.some((c) => String(o[c.key] ?? "").trim() !== ""));

      if (parsed.length === 0) throw new Error("The sheet has no student rows");
      setRows(parsed);

      setValidating(true);
      const res = await fetch("/api/superadmin/student-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", schoolId, rows: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Validation failed");
      setResults(data.results);
      setGlobalErrors(data.globalErrors || []);
    } catch (e: any) {
      setRows([]);
      notify.error(e.message || "Could not read the file");
    } finally {
      setValidating(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Import valid rows in chunks
  const runImport = async () => {
    const validRows = rows.filter((r) => {
      const res = results.find((x) => x.row === r.__row);
      return res && res.status !== "error";
    });
    if (validRows.length === 0) return;

    setImporting(true);
    setProgress({ done: 0, total: validRows.length });
    let batchId: string | null = null;
    let imported = 0;
    const failed: { row: number; message: string }[] = [];

    try {
      for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        const res = await fetch("/api/superadmin/student-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "import",
            schoolId,
            rows: chunk,
            onlyValid: true,
            batchId,
            fileName,
            totalRows: rows.length,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Import failed");
        batchId = data.batchId;
        imported += data.imported;
        failed.push(...(data.failed || []));
        setProgress({ done: Math.min(i + chunk.length, validRows.length), total: validRows.length });
      }
      notify.success(`${imported} student(s) imported`);
    } catch (e: any) {
      notify.error(e.message || "Import stopped");
    } finally {
      setSummary({ imported, failed });
      setImporting(false);
      setRows([]);
      setResults([]);
      loadHistory();
    }
  };

  // ── Rows with errors → Excel (fix and re-upload)
  const downloadErrorRows = () => {
    const errorRows = results.filter((r) => r.status === "error");
    const data = errorRows.map((r) => {
      const src = rows.find((x) => x.__row === r.row) || {};
      return [...COLUMNS.map((c) => src[c.key] ?? ""), r.errors.join("; ")];
    });
    const ws = XLSX.utils.aoa_to_sheet([[...COLUMNS.map((c) => c.header), "Errors"], ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Import_Errors_${fileName.replace(/\.[^.]+$/, "")}.xlsx`);
  };

  // ── Undo
  const handleUndo = async () => {
    if (!undoTarget) return;
    try {
      const res = await fetch("/api/superadmin/student-import", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, batchId: undoTarget._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      notify.success(`Undone — ${data.students} student(s) and ${data.parents} parent(s) removed`);
      loadHistory();
    } catch (e: any) {
      notify.error(e.message || "Undo failed");
    } finally {
      setUndoTarget(null);
    }
  };

  // ── Guards
  if (sessionStatus === "loading") return null;
  if (!isSuperAdmin) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-rose-500">
        <ShieldAlert className="h-8 w-8" />
        Only Super Admin can access this page.
      </div>
    );
  }

  const card = { borderColor: "var(--border)", backgroundColor: "var(--card)" };
  const muted = { color: "var(--muted-foreground)" };

  return (
    <div className="space-y-3">
      <PageHeader title="Import Students" icon={<FileUp className="w-4 h-4" />} />

      {/* Step 1 + 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border p-4" style={card}>
          <p className="text-sm font-bold text-foreground">1. Download Template</p>
                    <p className="text-xs mt-1" style={muted}>
            Excel file with the Students sheet{school?.name ? ` — ${school.name}` : ""}.
          </p>
          <Button
            onClick={downloadTemplate}
            disabled={!schoolId}
            variant="outline"
            className="mt-3 h-9 text-xs font-semibold text-emerald-600 border-emerald-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Download Template
          </Button>
        </div>

        <div className="rounded-xl border p-4" style={card}>
          <p className="text-sm font-bold text-foreground">2. Upload Filled Sheet</p>
          <p className="text-xs mt-1" style={muted}>
            Every row is checked first. Nothing is saved until you click Import.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={!schoolId || validating || importing}
            className="mt-3 h-9 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
          >
            {validating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1" />
            )}
            {validating ? "Checking..." : "Upload Excel"}
          </Button>
          {fileName && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs" style={muted}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> {fileName}
            </span>
          )}
        </div>
      </div>

      {/* Global errors */}
      {globalErrors.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {globalErrors.map((g) => (
            <p key={g} className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 shrink-0" /> {g}
            </p>
          ))}
        </div>
      )}

      {/* Step 3: preview */}
      {results.length > 0 && (
        <div className="rounded-xl border" style={card}>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-bold text-foreground mr-2">3. Review</p>
            {([
              ["all", "All", counts.all, ""],
              ["ok", "Ready", counts.ok, "text-emerald-600"],
              ["warning", "Warnings", counts.warning, "text-amber-600"],
              ["error", "Errors", counts.error, "text-rose-600"],
            ] as const).map(([k, label, n, color]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-lg border px-3 h-8 text-xs font-semibold cursor-pointer ${color} ${
                  filter === k ? "ring-2 ring-sky-500/50" : ""
                }`}
                style={{ borderColor: "var(--border)" }}
              >
                {label} ({n})
              </button>
            ))}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {counts.error > 0 && (
                <Button
                  onClick={downloadErrorRows}
                  variant="outline"
                  className="h-8 text-xs font-semibold text-rose-600 border-rose-200 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Error rows
                </Button>
              )}
              <Button
                onClick={runImport}
                disabled={importing || validCount === 0 || globalErrors.length > 0}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                {importing ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                )}
                {importing
                  ? `Importing ${progress.done}/${progress.total}...`
                  : counts.error
                    ? `Import valid rows only (${validCount})`
                    : `Import ${validCount} student(s)`}
              </Button>
            </div>
          </div>

          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0" style={{ backgroundColor: "var(--muted)" }}>
                <tr>
                  {["Row", "GR", "Student", "Class", "Father (CNIC)", "Monthly Fee", "Arrears", "Result"].map((h) => (
                    <th key={h} className="p-2 text-left font-bold" style={muted}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.row} className="border-t align-top" style={{ borderColor: "var(--border)" }}>
                    <td className="p-2 font-mono">{r.row}</td>
                    <td className="p-2 font-mono">{r.preview.grNumber || "auto"}</td>
                    <td className="p-2 font-medium text-foreground">{r.preview.studentName || "—"}</td>
                    <td className="p-2">{r.preview.className || "—"}</td>
                    <td className="p-2">
                      {r.preview.fatherName || "—"}
                      <span className="block font-mono text-[10px]" style={muted}>
                        {r.preview.fatherCnic}
                        {r.preview.linkedParent ? " · existing parent" : ""}
                      </span>
                    </td>
                    <td className="p-2 text-right">{Number(r.preview.monthlyFee || 0).toLocaleString()}</td>
                    <td className="p-2 text-right">{Number(r.preview.arrears || 0).toLocaleString()}</td>
                    <td className="p-2">
                      {r.status === "ok" && (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                      {r.errors.map((m) => (
                        <span key={m} className="flex items-start gap-1 text-rose-600">
                          <XCircle className="w-3.5 h-3.5 mt-px shrink-0" /> {m}
                        </span>
                      ))}
                      {r.warnings.map((m) => (
                        <span key={m} className="flex items-start gap-1 text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> {m}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import summary */}
      {summary && (
        <div className="rounded-xl border p-4 text-xs space-y-1" style={card}>
          <p className="text-sm font-bold text-emerald-600">{summary.imported} student(s) imported</p>
          {summary.failed.length > 0 && (
            <>
              <p className="font-semibold text-rose-600">{summary.failed.length} row(s) not imported:</p>
              {summary.failed.map((f) => (
                <p key={f.row} className="text-rose-600">
                  Row {f.row}: {f.message}
                </p>
              ))}
            </>
          )}
        </div>
      )}

      {/* History + Undo */}
      <div className="rounded-xl border" style={card}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-bold text-foreground">Import History</p>
          <p className="text-xs mt-0.5" style={muted}>
            Undo removes the students, their fees and invoices, and the parents created by that import.
            Not possible once any payment has been recorded.
          </p>
        </div>
        {history.length === 0 ? (
          <p className="p-4 text-xs" style={muted}>
            No imports yet.
          </p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead style={{ backgroundColor: "var(--muted)" }}>
              <tr>
                {["Date", "File", "Rows", "Students", "Parents", "Failed", "Status", ""].map((h) => (
                  <th key={h} className="p-2 text-left font-bold" style={muted}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h._id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-2">{new Date(h.createdAt).toLocaleString("en-GB")}</td>
                  <td className="p-2">{h.fileName || "—"}</td>
                  <td className="p-2">{h.totalRows}</td>
                  <td className="p-2">{h.students}</td>
                  <td className="p-2">{h.parents}</td>
                  <td className="p-2">{h.failed}</td>
                  <td className="p-2">
                    {h.status === "undone" ? (
                      <span className="text-rose-600">Undone</span>
                    ) : (
                      <span className="text-emerald-600">Completed</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {h.status !== "undone" && (
                      <Button
                        onClick={() => setUndoTarget(h)}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] font-semibold text-rose-600 border-rose-200 cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5 mr-1" /> Undo
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!undoTarget}
        onOpenChange={(open) => !open && setUndoTarget(null)}
        onConfirm={handleUndo}
        itemName={
          undoTarget
            ? `the import "${undoTarget.fileName}" (${undoTarget.students} students)`
            : ""
        }
      />
    </div>
  );
}