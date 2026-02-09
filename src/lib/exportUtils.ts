import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const handleExportRows = (
  table: any,
  type: "excel" | "pdf",
  customTitle?: string,
) => {
  const title = customTitle || table.options.meta?.title || "Data Report";
  const fileName = `${title.replace(/\s+/g, "_")}_${new Date().toLocaleDateString()}`;
  const rows = table.getPrePaginationRowModel().rows;

  const visibleColumns = table
    .getVisibleLeafColumns()
    .filter(
      (col: any) =>
        !["mrt-row-actions", "mrt-row-select", "S#"].includes(col.id),
    );

  // --- 1. HEADERS LOGIC ---
  const headers: string[] = [];
  const isSNoVisible = table.getState().columnVisibility["S#"] !== false;
  if (isSNoVisible) headers.push("S#");

  visibleColumns.forEach((col: any) => {
    const meta = col.columnDef.meta;
    if (meta?.exportHeaders) {
      headers.push(...meta.exportHeaders);
    } else {
      headers.push(col.columnDef.header);
    }
  });

  // --- 2. DATA LOGIC ---
  const data = rows.map((row: any, index: number) => {
    const original = row.original;
    const rowData: any[] = [];

    if (isSNoVisible) rowData.push(index + 1);

    visibleColumns.forEach((col: any) => {
      const id = col.id || col.accessorKey;
      const meta = col.columnDef.meta;

      if (meta?.getExportValue) {
        const val = meta.getExportValue(original, row);
        if (Array.isArray(val)) rowData.push(...val);
        else rowData.push(val);
      } else {
        let val = row.getValue(id);

        if (id?.includes("address")) val = val || original.address || "---";

        const capitalizeFields = ["status", "gender", "staffCategory", "role"];
        if (capitalizeFields.includes(id) && typeof val === "string") {
          val = val.charAt(0).toUpperCase() + val.slice(1);
        }
        if (id === "status" && typeof val === "string") {
          val = val.charAt(0).toUpperCase() + val.slice(1);
        }
        if (id === "salary") {
          val = val ? `PKR ${val.toLocaleString()}` : "0";
        }

        // --- IMPROVED DATE FORMATTING ---
        const isDateField =
          id?.toLowerCase().includes("date") || id?.toLowerCase() === "dob";
        if (isDateField && val) {
          const dateObj = new Date(val);
          if (!isNaN(dateObj.getTime())) {
            val = dateObj.toLocaleDateString("en-GB"); // Format: DD/MM/YYYY
          }
        }

        rowData.push(val ?? "---");
      }
    });
    return rowData;
  });

  if (type === "excel") {
    const ws = XLSX.utils.aoa_to_sheet([[title], [], headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } else {
    const orientation = headers.length > 7 ? "l" : "p";
    const doc = new jsPDF(orientation, "mm", "a4");
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 25,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255] },
    });
    doc.save(`${fileName}.pdf`);
  }
};

export const handlePrintTable = (table: any, title: string) => {
  const rows = table.getPrePaginationRowModel().rows;
  const visibleColumns = table
    .getVisibleLeafColumns()
    .filter(
      (col: any) =>
        !["mrt-row-actions", "mrt-row-select", "S#"].includes(col.id),
    );

  const headerHtml = [];
  const isSNoVisible = table.getState().columnVisibility["S#"] !== false;
  if (isSNoVisible) headerHtml.push("<th>S#</th>");

  visibleColumns.forEach((col: any) => {
    const meta = col.columnDef.meta;
    if (meta?.exportHeaders) {
      meta.exportHeaders.forEach((h: string) =>
        headerHtml.push(`<th>${h}</th>`),
      );
    } else {
      headerHtml.push(`<th>${col.columnDef.header}</th>`);
    }
  });

  const dataRows = rows
    .map((row: any, index: number) => {
      const original = row.original;
      let cellsHtml = "";
      if (isSNoVisible) cellsHtml += `<td>${index + 1}</td>`;

      visibleColumns.forEach((col: any) => {
        const meta = col.columnDef.meta;
        const id = col.id || col.accessorKey;

        if (meta?.getExportValue) {
          const val = meta.getExportValue(original, row);
          if (Array.isArray(val))
            val.forEach((v) => (cellsHtml += `<td>${v || "---"}</td>`));
          else cellsHtml += `<td>${val || "---"}</td>`;
        } else {
          let val = row.getValue(id) ?? "---";
          // --- CAPITALIZATION LOGIC FOR PRINT ---
          const capitalizeFields = [
            "status",
            "gender",
            "staffCategory",
            "role",
          ];
          if (capitalizeFields.includes(id) && typeof val === "string") {
            val = val.charAt(0).toUpperCase() + val.slice(1);
          }
          if (id?.includes("address")) {
            val = `<div style="max-width:220px; word-wrap:break-word;">${val}</div>`;
          }
          if (id === "status" && typeof val === "string") {
            val = val.charAt(0).toUpperCase() + val.slice(1);
          }
          const isDateField =
            id?.toLowerCase().includes("date") || id?.toLowerCase() === "dob";
          if (isDateField && val && val !== "---") {
            const dateObj = new Date(val);
            if (!isNaN(dateObj.getTime())) {
              val = dateObj.toLocaleDateString("en-GB");
            }
          }
          cellsHtml += `<td>${val}</td>`;
        }
      });
      return `<tr>${cellsHtml}</tr>`;
    })
    .join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; font-size: 10px; padding: 20px; color: #333; }
          h2 { text-align: center; text-transform: uppercase; color: #2c3e50; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #999; padding: 6px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <table>
        <thead>
        <tr>${headerHtml.join("")}</tr>
        </thead>
        <tbody>${dataRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
};
