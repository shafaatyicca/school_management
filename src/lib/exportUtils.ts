import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────────────────────────────────────────────────
// Optional report header (school + record info)
// ─────────────────────────────────────────────────────────────
export type ExportHeader = {
  school?: { name?: string; address?: string; logo?: string };
  info?: { label: string; value: any }[]; // e.g. Name, Father Name, Class
};

// Values like "2026-11-07" or "2026-11-07T10:23:45.123Z"
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

// Formats any date field / date value as DD/MM/YYYY (removes time + extra text)
const formatIfDate = (id: string, val: any) => {
  if (val === null || val === undefined || val === "" || val === "---") return val;
  if (typeof val === "number") return val; // GR#, amounts etc. stay as numbers

  const key = (id || "").toLowerCase();
  const isDateColumn =
    key.includes("date") ||
    key === "dob" ||
    /(created|updated|paid|issued|joined)at$/.test(key);
  const isDateValue =
    val instanceof Date || (typeof val === "string" && ISO_DATE.test(val));

  if (!isDateColumn && !isDateValue) return val;

  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-GB");
};

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Logo URL → base64 (for PDF). Returns null if it can't be loaded.
const loadImageDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// Excel / PDF export
// ─────────────────────────────────────────────────────────────
export const handleExportRows = async (
  table: any,
  type: "excel" | "pdf",
  customTitle?: string,
  header?: ExportHeader,
) => {
  const title = customTitle || table.options.meta?.title || "Data Report";
  const fileName = `${title.replace(/\s+/g, "_")}_${new Date().toLocaleDateString()}`;
  const rows = table.getPrePaginationRowModel().rows;
  const info = (header?.info || []).filter((i) => i.value !== undefined && i.value !== "");

  const visibleColumns = table
    .getVisibleLeafColumns()
    .filter(
      (col: any) =>
        !["mrt-row-actions", "mrt-row-select", "S#", "image"].includes(col.id),
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
        if (Array.isArray(val)) rowData.push(...val.map((v) => formatIfDate("", v)));
        else rowData.push(formatIfDate("", val));
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

        // --- DATE FORMATTING (createdAt, paidDate, dob, ISO values...) ---
        val = formatIfDate(id, val);
        if (Array.isArray(val)) val = val.join(", ");

        rowData.push(val ?? "---");
      }
    });
    return rowData;
  });

  // ── EXCEL ──
  if (type === "excel") {
    const colCount = Math.max(headers.length, 3);
    const top: any[][] = [];
    const merges: any[] = [];
    const centered: { r: number; bold?: boolean; size?: number }[] = [];
    let r = 0;

    const fullRow = (text: string, bold = false, size = 11) => {
      top.push([text]);
      merges.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
      centered.push({ r, bold, size });
      r++;
    };

    // School (centered across the table width)
    if (header?.school?.name) fullRow(header.school.name, true, 14);
    if (header?.school?.address) fullRow(header.school.address);
    if (header?.school?.name) {
      top.push([]);
      r++;
    }

    // Title
    fullRow(title, true, 12);

    // Info on one line, spread in equal parts
    if (info.length) {
      const row: any[] = new Array(colCount).fill("");
      info.forEach((i, idx) => {
        const start = Math.floor((idx * colCount) / info.length);
        const end = Math.floor(((idx + 1) * colCount) / info.length) - 1;
        row[start] = `${i.label}: ${i.value ?? "---"}`;
        if (end > start) merges.push({ s: { r, c: start }, e: { r, c: end } });
      });
      top.push(row);
      centered.push({ r, bold: true });
      r++;
    }
    top.push([]);

    const ws = XLSX.utils.aoa_to_sheet([...top, headers, ...data]);
    ws["!merges"] = merges;
    ws["!cols"] = headers.map(() => ({ wch: 16 }));

    // Center the header rows
    centered.forEach(({ r: rowIdx, bold, size }) => {
      for (let c = 0; c < colCount; c++) {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (!ws[addr]) continue;
        (ws[addr] as any).s = {
          alignment: { horizontal: "center", vertical: "center" },
          font: { bold: !!bold, sz: size || 11 },
        };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    return;
  }

  // ── PDF ──
  const orientation = headers.length > 7 ? "l" : "p";
  const doc = new jsPDF(orientation, "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  const addressIndex = headers.findIndex(
    (h) => h.toLowerCase().includes("address") || h.toLowerCase() === "location",
  );

  // --- EXACT MATCH ONLY (Fixes Name/Address centering) ---
  const dynamicColumnStyles: any = {};
  headers.forEach((h, index) => {
    const headerText = h.toUpperCase().trim();
    if (["S#", "S.NO", "GR#", "E-ID", "P-ID", "ID", "EID", "PID"].includes(headerText)) {
      dynamicColumnStyles[index] = { halign: "center", cellWidth: "wrap" };
    }
  });

  // --- School header: logo on the left, name + address centered ---
  let y = 15;
  if (header?.school?.name) {
    const logo = header.school.logo ? await loadImageDataUrl(header.school.logo) : null;
    const logoSize = 12;

    // Logo on the left
    if (logo) {
      try {
        const format = logo.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(logo, format, 10, 7, logoSize, logoSize);
      } catch {
        // Unsupported image format → skip logo
      }
    }

    // Name + address centered on the page
    const textCenter = pageWidth / 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(header.school.name, textCenter, 13, { align: "center" });
    if (header.school.address) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(header.school.address, textCenter, 19, { align: "center" });
    }
    doc.setDrawColor(200);
    doc.line(10, 26, pageWidth - 10, 26);
    y = 34;
  }

  // --- Title (centered) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(header?.school?.name ? 12 : 14);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 8;

  // --- Info on one line, each item centered in its own column ---
  if (info.length) {
    const colW = (pageWidth - 20) / info.length;
    doc.setFontSize(10);
    info.forEach((i, idx) => {
      const label = `${i.label}: `;
      const value = String(i.value ?? "---");
      doc.setFont("helvetica", "bold");
      const labelW = doc.getTextWidth(label);
      doc.setFont("helvetica", "normal");
      const valueW = doc.getTextWidth(value);

      const center = 10 + colW * (idx + 0.5);
      const startX = center - (labelW + valueW) / 2;

      doc.setFont("helvetica", "bold");
      doc.text(label, startX, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, startX + labelW, y);
    });
    y += 7;
  }

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: y,
    headStyles: { fontStyle: "bold" },
    tableWidth: "auto",
    styles: {
      fontSize: headers.length > 7 ? 9 : 10,
      cellPadding: 1,
      overflow: "linebreak",
      halign: "left",
      valign: "middle",
    },
    columnStyles: {
      ...(addressIndex !== -1 && { [addressIndex]: { cellWidth: 80 } }),
      0: { cellWidth: headers[0] === "S#" ? 10 : "auto" },
      ...dynamicColumnStyles,
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      const headerText = headers[data.column.index]?.toUpperCase().trim() || "";
      const isID = ["S#", "S.NO", "GR#", "E-ID", "P-ID", "ID"].includes(headerText);
      data.cell.styles.halign = isID ? "center" : "left";
      if (data.column.index === addressIndex) data.cell.styles.cellWidth = 50;
      data.cell.styles.valign = "middle";
    },
  });
  doc.save(`${fileName}.pdf`);
};

// ─────────────────────────────────────────────────────────────
// Print
// ─────────────────────────────────────────────────────────────
export const handlePrintTable = (table: any, title: string, header?: ExportHeader) => {
  const rows = table.getPrePaginationRowModel().rows;
  const info = (header?.info || []).filter((i) => i.value !== undefined && i.value !== "");
  const visibleColumns = table
    .getVisibleLeafColumns()
    .filter(
      (col: any) =>
        !["mrt-row-actions", "mrt-row-select", "S#", "image"].includes(col.id),
    );

  const headerHtml: string[] = [];
  const isSNoVisible = table.getState().columnVisibility["S#"] !== false;

  // 1. S# Header (Always Center)
  if (isSNoVisible) headerHtml.push('<th style="text-align:center;">S#</th>');

  visibleColumns.forEach((col: any) => {
    const meta = col.columnDef.meta;

    if (meta?.exportHeaders) {
      meta.exportHeaders.forEach((h: string) => {
        const upperH = h.toUpperCase().trim();
        const isID = ["S.NO", "GR#", "E-ID", "P-ID"].includes(upperH);
        const style = isID
          ? 'style="text-align:center; width:1%; white-space:nowrap;"'
          : 'style="text-align:left;"';
        headerHtml.push(`<th ${style}>${h}</th>`);
      });
    } else {
      const headerName = col.columnDef.header || "";
      const upperH = headerName.toUpperCase().trim();
      const isID = ["S.NO", "GR#", "E-ID", "P-ID"].includes(upperH);
      const style = isID ? 'style="text-align:center;"' : 'style="text-align:left;"';
      headerHtml.push(`<th ${style}>${headerName}</th>`);
    }
  });

  const dataRows = rows
    .map((row: any, index: number) => {
      const original = row.original;
      let cellsHtml = "";

      // 2. S# Data (Always Center)
      if (isSNoVisible) cellsHtml += `<td style="text-align:center;">${index + 1}</td>`;

      visibleColumns.forEach((col: any) => {
        const meta = col.columnDef.meta;
        const id = col.id || col.accessorKey;

        if (meta?.getExportValue) {
          const vals = meta.getExportValue(original, row);
          const exportHeaders = meta.exportHeaders || [];

          const valArray = (Array.isArray(vals) ? vals : [vals]).map((v) =>
            formatIfDate("", v),
          );

          valArray.forEach((v, i) => {
            const hName = (exportHeaders[i] || "").toUpperCase().trim();
            const isID = ["S.NO", "GR#", "E-ID", "P-ID"].includes(hName);
            const style = isID ? 'style="text-align:center;"' : 'style="text-align:left;"';
            const displayValue = typeof v === "string" ? v.replace(/\n/g, "<br/>") : v;
            cellsHtml += `<td ${style}>${displayValue || "---"}</td>`;
          });
        } else {
          const headerName = (
            typeof col.columnDef.header === "string" ? col.columnDef.header : col.id || ""
          )
            .toUpperCase()
            .trim();
          const isID = ["S.NO", "GR#", "E-ID", "P-ID"].includes(headerName);
          const cellStyle = isID ? 'style="text-align:center;"' : 'style="text-align:left;"';

          let val = row.getValue(id) ?? "---";

          const capitalizeFields = ["status", "gender", "staffCategory", "role"];
          if (capitalizeFields.includes(id) && typeof val === "string") {
            val = val.charAt(0).toUpperCase() + val.slice(1);
          }
          if (id?.includes("address")) {
            val = `<div style="max-width:220px; word-wrap:break-word;">${val}</div>`;
          }
          if (id === "status" && typeof val === "string") {
            val = val.charAt(0).toUpperCase() + val.slice(1);
          }
          if (id === "salary") {
            val = val ? `PKR ${val.toLocaleString()}` : "0";
          }
          val = formatIfDate(id, val);
          if (Array.isArray(val)) val = val.join(", ");

          const finalVal = typeof val === "string" ? val.replace(/\n/g, "<br/>") : val;
          cellsHtml += `<td ${cellStyle}>${finalVal}</td>`;
        }
      });
      return `<tr>${cellsHtml}</tr>`;
    })
    .join("");

  // School header: logo on the left, name + address centered
  const schoolHtml = header?.school?.name
    ? `<div class="school">
         ${header.school.logo ? `<img src="${esc(header.school.logo)}" />` : ""}
         <div class="stext">
           <div class="sname">${esc(header.school.name)}</div>
           ${header.school.address ? `<div class="saddr">${esc(header.school.address)}</div>` : ""}
         </div>
       </div>`
    : "";

  // Info on one line (Name · Father Name · Class)
  const infoHtml = info.length
    ? `<div class="info">${info
        .map((i) => `<span><b>${esc(i.label)}:</b> ${esc(i.value ?? "---")}</span>`)
        .join("")}</div>`
    : "";

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; font-size: 10px; padding: 20px; color: #333; }
          .school { position: relative; display: flex; justify-content: center; align-items: center; min-height: 60px; padding-bottom: 12px; border-bottom: 1px solid #ccc; }
          .school img { position: absolute; left: 0; top: 0; width: 60px; height: 60px; object-fit: contain; }
          .stext { text-align: center; }
          .sname { font-size: 20px; font-weight: bold; color: #111; }
          .saddr { font-size: 11px; color: #555; margin-top: 3px; }
          h2 { text-align: center; text-transform: uppercase; color: #2c3e50; margin: 14px 0 8px; }
          .info { display: flex; justify-content: space-around; font-size: 12px; margin-bottom: 10px; }
          .info span { text-align: center; }
          table.data { width: 100%; border-collapse: collapse; margin-top: 10px; }
          table.data th, table.data td { border: 1px solid #999; padding: 6px; vertical-align: middle; }
          table.data th { background-color: #f2f2f2; font-weight: bold; }
          table.data tr:nth-child(even) { background-color: #fafafa; }
        </style>
      </head>
      <body>
        ${schoolHtml}
        <h2>${title}</h2>
        ${infoHtml}
        <table class="data">
          <thead><tr>${headerHtml.join("")}</tr></thead>
          <tbody>${dataRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();

  // Wait for the logo to load before printing
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    printWindow.print();
    printWindow.close();
  };
  printWindow.onload = doPrint;
  setTimeout(doPrint, 1500); // fallback if onload doesn't fire
};