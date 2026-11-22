"use client";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { notify } from "@/lib/notify";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: any;
  onDeleted: () => void;
}

type Kind = "excel" | "backup";

// School delete: inactive only → download Excel / backup → type the slug → delete
export default function SchoolDeleteDialog({ open, onOpenChange, school, onDeleted }: Props) {
  const [counts, setCounts] = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Record<Kind, boolean>>({ excel: false, backup: false });
  const [downloading, setDownloading] = useState<Kind | null>(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Fresh start every time it opens
  useEffect(() => {
    if (!open || !school?._id) return;
    setTyped("");
    setDone({ excel: false, backup: false });
    setCounts([]);
    setLoading(true);
    fetch(`/api/superadmin/schools?id=${school._id}&data=summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCounts(d?.counts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, school?._id]);

  const isActive = school?.status === "active";
  const downloaded = done.excel || done.backup;
  const canDelete = !isActive && downloaded && typed.trim() === school?.slug && !deleting;

  const download = async (kind: Kind) => {
    setDownloading(kind);
    try {
      const res = await fetch(`/api/superadmin/schools?id=${school._id}&data=${kind}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${school.slug || "school"}-${kind === "excel" ? "data.xlsx" : "backup.json"}`;
      a.click();
      URL.revokeObjectURL(url);
      setDone((d) => ({ ...d, [kind]: true }));
    } catch {
      notify.error("Failed!", "Could not download the file");
    } finally {
      setDownloading(null);
    }
  };

  const deleteSchool = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/superadmin/schools?id=${school._id}&confirm=${encodeURIComponent(typed.trim())}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => null);
      if (res.ok) {
        notify.success("Deleted!", `${school.name} and all its data have been deleted`);
        onOpenChange(false);
        onDeleted();
      } else {
        notify.error("Failed!", data?.error || "Could not delete school");
      }
    } catch {
      notify.error("Error!", "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const dlBtn = (kind: Kind, label: string, Icon: any) => (
    <button
      type="button"
      onClick={() => download(kind)}
      disabled={!!downloading}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        done[kind]
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      {downloading === kind ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done[kind] ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      {label}
    </button>
  );

  return (
    <AlertDialog open={open} onOpenChange={(v) => !deleting && onOpenChange(v)}>
      <AlertDialogContent className="rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-500 dark:bg-slate-900 z-[9999]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Delete {school?.name}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            This permanently deletes the school and <b>all</b> of its data. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          {/* Active schools can't be deleted */}
          {isActive && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              This school is active. Make it inactive first (Active / Inactive button on the card), then delete.
            </div>
          )}

          {/* What will be deleted */}
          <div className="rounded-md border border-slate-200 dark:border-slate-700 p-2">
            <p className="mb-1 text-[11px] font-bold uppercase text-slate-500">Will be deleted</p>
            {loading ? (
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Counting…
              </p>
            ) : counts.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                {counts.map((c) => (
                  <div key={c.label} className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{c.label}</span>
                    <span className="font-bold text-rose-600">{c.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No data — only the school record.</p>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              Kept: Super Admin invoices (subscription billing) and plans.
            </p>
          </div>

          {/* Step 1: download (at least one) */}
          <div>
            <p className="mb-1 text-xs text-slate-600 dark:text-slate-300">
              1. Download the school&apos;s data (required)
            </p>
            <div className="flex gap-2">
              {dlBtn("excel", "Excel (handover)", FileSpreadsheet)}
              {dlBtn("backup", "Full Backup (JSON)", Download)}
            </div>
          </div>

          {/* Step 2: type the slug */}
          <div>
            <p className="mb-1 text-xs text-slate-600 dark:text-slate-300">
              2. Type <b className="font-mono text-rose-600">{school?.slug}</b> to confirm
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={isActive || !downloaded}
              placeholder={school?.slug}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs outline-none focus:border-rose-400 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            disabled={deleting}
            className="cursor-pointer font-semibold border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            Cancel
          </AlertDialogCancel>
          <button
            type="button"
            onClick={deleteSchool}
            disabled={!canDelete}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? "Deleting..." : "Delete Permanently"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}