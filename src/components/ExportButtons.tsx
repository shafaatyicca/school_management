"use client";

import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/components/PermissionsProvider";
import { handleExportRows, handlePrintTable, type ExportHeader } from "@/lib/exportUtils";
import type { ModuleKey } from "@/lib/permissions";

// Excel / PDF / Print — shown only with the page's "Export / Print" permission
export default function ExportButtons({
  table,
  module,
  title,
  header,
}: {
  table: any;
  module: ModuleKey;
  title: string; // report title, e.g. "Employees List"
  header?: ExportHeader; // school / record info on top of the report
}) {
  const { can } = usePermissions();
  if (!can(module, "export")) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => handleExportRows(table, "excel", title, header)}
        variant="outline"
        size="sm"
        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 cursor-pointer"
      >
        <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
      </Button>

      <Button
        onClick={() => handleExportRows(table, "pdf", title, header)}
        variant="outline"
        size="sm"
        className="text-rose-600 border-rose-200 hover:bg-rose-50 h-8 cursor-pointer"
      >
        <FileText className="h-4 w-4 mr-1" /> PDF
      </Button>

      <Button
        onClick={() => handlePrintTable(table, title, header)}
        variant="outline"
        size="sm"
        className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 h-8 cursor-pointer dark:text-slate-200"
      >
        <Printer className="h-4 w-4 mr-1" /> Print
      </Button>
    </div>
  );
}