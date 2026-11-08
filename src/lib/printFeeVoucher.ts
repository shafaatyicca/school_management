"use client";

import { notify } from "@/lib/notify";

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmt = (d: any) => {
  const x = new Date(d);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(x.getDate()).padStart(2, "0")}-${m[x.getMonth()]}-${x.getFullYear()}`;
};
const money = (n: number) => Number(n || 0).toLocaleString("en-US");

// One voucher (existing format)
function voucherHtml(d: any, copyLabel: string) {
  const st = d.student;
  const classText = st.className ? `${st.className}${st.section ? ` (${st.section})` : ""}` : "";
  const bank = d.settings.bank || {};

  return `
  <div class="voucher">
    ${copyLabel ? `<div class="copy">${esc(copyLabel)}</div>` : ""}
    <div class="head">
      <div class="logo">${d.school.logo ? `<img src="${esc(d.school.logo)}" />` : ""}</div>
      <div class="school">
        <div class="name">${esc(d.school.name)}</div>
        <div class="addr">${esc(d.school.address)}</div>
        ${d.school.phone ? `<div class="addr">Ph: ${esc(d.school.phone)}</div>` : ""}
      </div>
    </div>

    <table class="info">
      <colgroup>
        <col style="width:17%" /><col style="width:38%" />
        <col style="width:18%" /><col style="width:27%" />
      </colgroup>
      <tr>
        <td class="l">Issued:</td><td class="v">${fmt(d.issueDate)}</td>
        <td class="l">Family_ID:</td><td class="v">${esc(st.familyId)}</td>
      </tr>
      <tr>
        <td class="l">Student:</td><td class="v">${esc(st.name)} (${esc(st.grNumber)})</td>
        <td class="l">Class:</td><td class="v">${esc(classText)}</td>
      </tr>
      <tr>
        <td class="l">Parent:</td><td class="v">${esc(st.parentName)}</td>
        <td class="l">V_ID:</td><td class="v small">${esc(d.voucherId)}</td>
      </tr>
    </table>

    <div class="items">
      ${d.items
        .map(
          (i: any) =>
            `<div class="row"><span>${esc(i.title)}</span><span class="box">${money(i.amount)}</span></div>`,
        )
        .join("")}
    </div>

    <div class="totals">
      <div class="row"><span>Payable Within the Due Date:</span><span class="box">${money(d.withinDue)}</span></div>
      <div class="row"><span>Payable After the Due Date:</span><span class="box">${money(d.afterDue)}</span></div>
    </div>

    <div class="due">DUE DATE : ${fmt(d.dueDate)}</div>

    <div class="bank">
      ${bank.name ? `<div class="bname">${esc(bank.name)}</div>` : ""}
      ${
        bank.accountTitle || bank.accountNumber
          ? `<div>[Title: <b>${esc(bank.accountTitle)}</b> ] [ A/C: <b>${esc(bank.accountNumber)}</b> ]</div>`
          : ""
      }
      ${d.settings.note ? `<div><b><i>Note:</i></b> <b>${esc(d.settings.note)}</b></div>` : ""}
      <div><b>This Fee Challan is valid till <i>${fmt(d.validTill)}</i>.</b></div>
    </div>
  </div>`;
}

/**
 * Page layout:
 * - 1 copy  → 3 different students per page (landscape)
 * - 2 copies → 1 student per page (School + Student copy)
 * - 3 copies → 1 student per page (Bank + School + Student copy, landscape)
 */
function buildDocument(vouchers: any[]) {
  const copies = [1, 2, 3].includes(vouchers[0]?.settings?.copies)
    ? vouchers[0].settings.copies
    : 1;

  let pages: string[] = [];
  let threeAcross = false;

  if (copies === 1) {
    if (vouchers.length === 1) {
      pages = [voucherHtml(vouchers[0], "")];
    } else {
      threeAcross = true;
      for (let i = 0; i < vouchers.length; i += 3) {
        pages.push(vouchers.slice(i, i + 3).map((v) => voucherHtml(v, "")).join(""));
      }
    }
  } else {
    const labels =
      copies === 3 ? ["BANK COPY", "SCHOOL COPY", "STUDENT COPY"] : ["SCHOOL COPY", "STUDENT COPY"];
    if (copies === 3) threeAcross = true;
    pages = vouchers.map((v) => labels.map((l) => voucherHtml(v, l)).join(""));
  }

  const landscape = threeAcross;
  const title =
    vouchers.length === 1
      ? `Fee Voucher - ${esc(vouchers[0].student.name)}`
      : `Fee Vouchers (${vouchers.length})`;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { display: flex; gap: 6mm; justify-content: ${threeAcross ? "flex-start" : "center"}; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .voucher { flex: 1; max-width: ${copies === 1 && !threeAcross ? "100mm" : "95mm"}; border: 1px solid #999; display: flex; flex-direction: column; min-height: 185mm; position: relative; }
  .three .voucher { flex: 0 0 calc((100% - 12mm) / 3); max-width: none; }
  .copy { position: absolute; top: -1px; right: -1px; background: #111; color: #fff; font-size: 8px; font-weight: 700; padding: 2px 6px; letter-spacing: .5px; }
  .head { background: #1ba6d8; display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 2px solid #555; }
  .logo { width: 52px; height: 52px; border-radius: 50%; background: #fff; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .school { flex: 1; text-align: center; }
  .school .name { font-size: 14px; font-weight: 700; color: #000; }
  .school .addr { font-size: 9px; color: #111; margin-top: 2px; }
  .info { width: calc(100% - 8px); margin: 6px 4px; border: 1.5px solid #111; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
  .info td { padding: 4px 5px; vertical-align: top; word-wrap: break-word; }
  .info .l { color: #222; white-space: nowrap; }
  .info .v { font-weight: 700; }
  .info .small { font-size: 8px; }
  .items { flex: 1; padding: 8px 6px; border-top: 1px solid #ddd; font-size: 10px; }
  .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; }
  .box { border: 1px solid #333; min-width: 80px; text-align: center; font-weight: 700; padding: 3px 6px; }
  .totals { border-top: 2px solid #111; margin: 0 6px; padding-top: 8px; font-size: 10px; }
  .due { border-top: 1px solid #999; border-bottom: 1px solid #999; text-align: center; font-weight: 700; font-size: 11px; padding: 12px 0; margin-top: 6px; }
  .bank { text-align: center; font-size: 9px; padding: 8px 6px; line-height: 1.5; }
  .bank .bname { font-size: 13px; font-weight: 700; }
</style></head>
<body>
  ${pages.map((p) => `<div class="page${threeAcross ? " three" : ""}">${p}</div>`).join("")}
  <script>
    window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 400); };
  </script>
</body></html>`;
}

// Print an already-built list of vouchers (Fee Voucher page)
export function printVouchers(vouchers: any[]) {
  if (!vouchers?.length) {
    notify.error("No vouchers to print");
    return;
  }
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    notify.error("Popup blocked — please allow popups for this site");
    return;
  }
  win.document.open();
  win.document.write(buildDocument(vouchers));
  win.document.close();
}

// Fetch + print a single student's voucher (ledger button)
export async function printFeeVoucher(studentId: string, schoolId: string) {
  // Open the window first to avoid the popup blocker
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    notify.error("Popup blocked — please allow popups for this site");
    return;
  }
  win.document.write("<p style='font-family:Arial;padding:20px'>Loading voucher...</p>");

  try {
    const res = await fetch(
      `/api/Fee_Management/fee-voucher?studentId=${studentId}&schoolId=${schoolId}`,
    );
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || "Failed to load voucher");

    win.document.open();
    win.document.write(buildDocument([d]));
    win.document.close();
  } catch (e: any) {
    win.close();
    notify.error(e.message || "Something went wrong");
  }
}

// ─────────────────────────────────────────────────────────────
// Admission Form & Student Bio Data — Style 1 (Classic) & Style 2 (Modern)
// Blank form: no values. Bio Data: values filled from the student record.
// ─────────────────────────────────────────────────────────────
export type AdmissionFormData = {
  school: { name?: string; address?: string; logo?: string; phone?: string };
  undertaking: string;
  style?: "style1" | "style2";
  title?: string; // default "ADMISSION FORM"
  values?: Record<string, string>; // filled values (Bio Data)
};

// ══════════════════════════════════════════════════════════════
// STYLE 1 — Classic (grey section bars + boxes)
// ══════════════════════════════════════════════════════════════

// Label + box (empty or filled)
const afPair = (label: string, value = "") =>
  `<td class="l">${label}:</td><td><div class="box">${esc(value)}</div></td>`;

// Label + full-width box (spans the rest of a 4-column row)
const afFull = (label: string, value = "") =>
  `<td class="l">${label}:</td><td colspan="3"><div class="box">${esc(value)}</div></td>`;

// Section with a grey header bar
const afSection = (title: string, body: string, centerTitle = false) => `
  <div class="section">
    <div class="section-h${centerTitle ? " center" : ""}">${title}</div>
    <div class="section-b">${body}</div>
  </div>`;

// Fixed label widths (padding included) → labels never touch the boxes
const cols = (...w: (number | null)[]) =>
  `<colgroup>${w.map((x) => (x ? `<col style="width:${x}px" />` : "<col />")).join("")}</colgroup>`;

function styleOneBody(d: AdmissionFormData) {
  const s = d.school || {};
  const v = d.values || {};
  const title = d.title || "ADMISSION FORM";

  const photo = v.photo
    ? `<div class="photo has-img"><img src="${esc(v.photo)}" /></div>`
    : `<div class="photo">Paste<br/>Photo Here</div>`;

  const studentData = `
    <div class="student-top">
      ${photo}
      <table class="f">
        ${cols(110, null, 104, null)}
        <tr>${afFull("Student's Name", v.studentName)}</tr>
        <tr>${afFull("B-Form Number", v.bForm)}</tr>
        <tr>${afPair("Date of Birth", v.dob)}${afPair("Place of Birth", v.placeOfBirth)}</tr>
        <tr>${afFull("Previous School", v.previousSchool)}</tr>
      </table>
    </div>
    <table class="f">
      ${cols(84, null, 118, null, 80, null)}
      <tr>${afPair("Gender", v.gender)}${afPair("Caste", v.caste)}${afPair("Religion", v.religion)}</tr>
      <tr>${afPair("Nationality", v.nationality)}${afPair("Admission Class", v.admissionClass)}${afPair("Section", v.section)}</tr>
    </table>`;

  const fatherData = `
    <table class="f">
      ${cols(106, null, 100, null)}
      <tr>${afPair("Father's Name", v.fatherName)}${afPair("CNIC", v.cnic)}</tr>
      <tr>${afPair("Phone", v.fatherPhone)}${afPair("Occupation", v.occupation)}</tr>
      <tr>${afFull("Full Address", v.address)}</tr>
    </table>`;

  const motherData = `
    <table class="f">
      ${cols(106, null, 96, null, 70, null)}
      <tr>${afPair("Mother's Name", v.motherName)}${afPair("Profession", v.motherProfession)}${afPair("Phone", v.motherPhone)}</tr>
    </table>`;

  const guardianData = `
    <table class="f">
      ${cols(106, null, 96, null, 70, null)}
      <tr>${afPair("Guardian Name", v.guardianName)}${afPair("Relation", v.guardianRelation)}${afPair("Phone", v.guardianPhone)}</tr>
    </table>`;

  const undertaking = `
    <p class="undertaking">${esc(d.undertaking)}</p>
    <div class="sig">Parent's Signature</div>`;

  // One table → all boxes aligned; signature row has space above to sign
  const officeUse = `
    <table class="f">
      ${cols(116, null, 104, null, 124, null)}
      <tr>${afPair("Admission Date", v.admissionDate)}${afPair("GR Number", v.grNumber)}${afPair("Class &amp; Section", v.classSection)}</tr>
      <tr class="sigrow">
        ${afPair("Registration Fee", v.registrationFee)}${afPair("Monthly Fee", v.monthlyFee)}
        <td colspan="2" class="sigcell"><div class="sig">Principal's Signature</div></td>
      </tr>
    </table>`;

  return `
  <div class="form">
    <div class="head">
      ${s.logo ? `<img src="${esc(s.logo)}" />` : ""}
      <div class="sname">${esc(s.name)}</div>
      ${s.address ? `<div class="saddr">${esc(s.address)}</div>` : ""}
      ${s.phone ? `<div class="saddr">${esc(s.phone)}</div>` : ""}
      <div class="title">${esc(title)}</div>
    </div>

    ${afSection("Student's Data", studentData)}
    ${afSection("Father's Data", fatherData)}
    ${afSection("Mother's Data", motherData)}
    ${afSection("Guardian's Data (If Any)", guardianData)}
    ${afSection("UNDERTAKING", undertaking, true)}
    ${afSection("FOR OFFICE USE ONLY", officeUse)}
  </div>`;
}

const STYLE_ONE_CSS = `
  /* Full A4 page height (297mm - 2 × 9mm margin ≈ 276mm usable) */
  .form { width: 100%; max-width: 192mm; min-height: 276mm; margin: 0 auto;
          display: flex; flex-direction: column; justify-content: space-between; gap: 8px;
          page-break-inside: avoid; break-inside: avoid; }

  /* Header: logo left, school info centered */
  .head { position: relative; text-align: center; min-height: 74px; }
  .head img { position: absolute; left: 2px; top: 0; width: 70px; height: 70px; object-fit: contain; }
  .sname { font-size: 21px; font-weight: 600; }
  .saddr { font-size: 11px; color: #555; margin-top: 2px; }
  .title { font-size: 13px; font-weight: 700; font-style: italic; margin-top: 8px; letter-spacing: .3px; }

  /* Sections */
  .section { border: 1px solid #555; }
  .section-h { background: #555; color: #fff; font-size: 11px; font-weight: 700; padding: 5px 8px; }
  .section-h.center { text-align: center; letter-spacing: .5px; }
  .section-b { padding: 8px 12px 10px; }

  /* Field rows */
  table.f { width: 100%; border-collapse: separate; border-spacing: 0 8px; font-size: 11px; table-layout: fixed; }
  table.f td { vertical-align: middle; }
  table.f td.l { font-weight: 700; white-space: nowrap; padding-right: 10px; }
  table.f td + td.l { padding-left: 14px; }
  .box { border: 1px solid #555; height: 27px; padding: 0 7px; line-height: 25px; font-size: 11.5px;
         white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Student photo */
  .student-top { display: flex; gap: 14px; align-items: flex-start; }
  .student-top table.f { flex: 1; }
  .photo { width: 112px; height: 136px; flex-shrink: 0; border: 1px solid #999; background: #e6e6e6;
           display: flex; align-items: center; justify-content: center; text-align: center;
           font-size: 10px; color: #777; box-shadow: 0 2px 4px rgba(0,0,0,.15); margin-top: 8px; overflow: hidden; }
  .photo.has-img { background: #fff; }
  .photo img { width: 100%; height: 100%; object-fit: cover; }

  /* Undertaking + signatures (room above the line to sign) */
  .undertaking { font-size: 11px; font-weight: 700; line-height: 1.6; margin: 2px 0 44px; }
  .sig { border-top: 1px solid #333; width: 190px; text-align: center; font-weight: 700; font-size: 11px;
         padding-top: 4px; margin-left: auto; margin-right: 10px; }

  /* Office use: signature row — boxes and line aligned at the bottom, space above to sign */
  tr.sigrow td { vertical-align: bottom; }
  .sigcell { height: 64px; padding-left: 14px; }
`;

// ══════════════════════════════════════════════════════════════
// STYLE 2 — Modern (numbered sections + writing lines)
// ══════════════════════════════════════════════════════════════

// Label on top + writing line (empty or filled)
const f2 = (label: string, span: number, value = "") =>
  `<div class="fld span-${span}"><label>${label}</label><div class="line">${esc(value)}</div></div>`;

// Gender with checkboxes (ticked when filled)
const f2Gender = (span: number, gender = "") => {
  const g = gender.toLowerCase();
  return `
  <div class="fld span-${span}">
    <label>Gender</label>
    <div class="opts">
      <span class="cb">${g === "male" ? "✓" : ""}</span>Male
      <span class="cb gap">${g === "female" ? "✓" : ""}</span>Female
    </div>
  </div>`;
};

// Numbered section
const s2Section = (num: number, title: string, body: string) => `
  <div class="s2-sec">
    <div class="s2-sec-h"><span class="num">${num}</span>${title}<span class="rule"></span></div>
    <div class="grid">${body}</div>
  </div>`;

function styleTwoBody(d: AdmissionFormData) {
  const s = d.school || {};
  const v = d.values || {};
  const title = d.title || "ADMISSION FORM";

  const photo = v.photo
    ? `<div class="s2-photo has-img"><img src="${esc(v.photo)}" /></div>`
    : `<div class="s2-photo">Affix Recent<br/>Passport Size<br/>Photograph</div>`;

  return `
  <div class="s2">
    <div class="s2-head">
      ${s.logo ? `<img class="s2-logo" src="${esc(s.logo)}" />` : `<div class="s2-logo"></div>`}
      <div class="s2-school">
        <div class="n">${esc(s.name)}</div>
        ${s.address ? `<div class="a">${esc(s.address)}</div>` : ""}
        ${s.phone ? `<div class="a">Ph: ${esc(s.phone)}</div>` : ""}
      </div>
      ${photo}
    </div>

    <div class="s2-bar">
      <span class="t">${esc(title)}</span>
      <span class="m">Form No.<span></span> Date<span></span></span>
    </div>

    ${s2Section(1, "Student Information", `
      ${f2("Student's Full Name", 8, v.studentName)}${f2("B-Form Number", 4, v.bForm)}
      ${f2("Date of Birth", 4, v.dob)}${f2("Place of Birth", 4, v.placeOfBirth)}${f2Gender(4, v.gender)}
      ${f2("Religion", 3, v.religion)}${f2("Caste", 3, v.caste)}${f2("Nationality", 3, v.nationality)}${f2("Section", 3, v.section)}
      ${f2("Admission Class", 4, v.admissionClass)}${f2("Previous School", 8, v.previousSchool)}
    `)}

    ${s2Section(2, "Father Information", `
      ${f2("Father's Name", 6, v.fatherName)}${f2("CNIC", 6, v.cnic)}
      ${f2("Phone", 4, v.fatherPhone)}${f2("Occupation", 8, v.occupation)}
      ${f2("Full Address", 12, v.address)}
    `)}

    ${s2Section(3, "Mother Information", `
      ${f2("Mother's Name", 5, v.motherName)}${f2("Profession", 4, v.motherProfession)}${f2("Phone", 3, v.motherPhone)}
    `)}

    ${s2Section(4, "Guardian Information (If Any)", `
      ${f2("Guardian Name", 5, v.guardianName)}${f2("Relation", 3, v.guardianRelation)}${f2("Phone", 4, v.guardianPhone)}
    `)}

    <div class="s2-sec">
      <div class="s2-sec-h"><span class="num">5</span>Undertaking<span class="rule"></span></div>
      <p class="s2-under">${esc(d.undertaking)}</p>
      <div class="s2-signs">
        <div class="s2-sign">Date</div>
        <div class="s2-sign">Parent / Guardian Signature</div>
      </div>
    </div>

    <div class="s2-office">
      <div class="h">For Office Use Only</div>
      <div class="grid">
        ${f2("Admission Date", 4, v.admissionDate)}${f2("GR Number", 4, v.grNumber)}${f2("Class &amp; Section", 4, v.classSection)}
        ${f2("Registration Fee", 4, v.registrationFee)}${f2("Monthly Fee", 4, v.monthlyFee)}${f2("Principal's Signature", 4)}
      </div>
    </div>
  </div>`;
}

const STYLE_TWO_CSS = `
  /* Full A4 page height (297mm - 2 × 9mm margin ≈ 276mm usable) */
  .s2 { width: 100%; max-width: 192mm; min-height: 276mm; margin: 0 auto; color: #1a1a1a;
        display: flex; flex-direction: column; justify-content: space-between; gap: 10px;
        page-break-inside: avoid; break-inside: avoid; }

  /* Header: logo | school | photo */
  .s2-head { display: flex; align-items: center; gap: 14px; }
  .s2-logo { width: 74px; height: 74px; object-fit: contain; flex-shrink: 0; }
  .s2-school { flex: 1; text-align: center; }
  .s2-school .n { font-size: 22px; font-weight: 700; color: #0f3d68; }
  .s2-school .a { font-size: 11px; color: #555; margin-top: 2px; }
  .s2-photo { width: 96px; height: 116px; flex-shrink: 0; border: 1.5px dashed #8a99ad; border-radius: 4px;
              display: flex; align-items: center; justify-content: center; text-align: center;
              font-size: 9.5px; color: #8a99ad; line-height: 1.4; overflow: hidden; }
  .s2-photo.has-img { border: 1px solid #8a99ad; }
  .s2-photo img { width: 100%; height: 100%; object-fit: cover; }

  /* Title bar */
  .s2-bar { background: #0f3d68; color: #fff; border-radius: 4px;
            display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; }
  .s2-bar .t { font-size: 14.5px; font-weight: 700; letter-spacing: 2.5px; }
  .s2-bar .m { font-size: 10.5px; }
  .s2-bar .m span { display: inline-block; width: 82px; border-bottom: 1px solid #fff; margin: 0 12px 0 5px; }

  /* Sections */
  .s2-sec-h { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 700;
              color: #0f3d68; text-transform: uppercase; letter-spacing: .6px; }
  .s2-sec-h .num { width: 19px; height: 19px; border-radius: 50%; background: #0f3d68; color: #fff;
                   font-size: 10px; display: inline-flex; align-items: center; justify-content: center; }
  .s2-sec-h .rule { flex: 1; height: 1px; background: #c7d2df; }

  /* 12-column field grid */
  .grid { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 14px; row-gap: 13px; margin-top: 8px; }
  .span-3 { grid-column: span 3; } .span-4 { grid-column: span 4; } .span-5 { grid-column: span 5; }
  .span-6 { grid-column: span 6; } .span-8 { grid-column: span 8; } .span-12 { grid-column: span 12; }
  .fld label { display: block; font-size: 9px; font-weight: 700; color: #5b6676;
               text-transform: uppercase; letter-spacing: .4px; }
  .fld .line { border-bottom: 1px solid #333; height: 28px; padding: 9px 2px 0; font-size: 11.5px;
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .opts { height: 28px; display: flex; align-items: flex-end; gap: 4px; font-size: 11px; padding-bottom: 3px; }
  .cb { width: 13px; height: 13px; border: 1px solid #333; display: inline-flex; align-items: center;
        justify-content: center; font-size: 11px; font-weight: 700; line-height: 1; }
  .cb.gap { margin-left: 14px; }

  /* Undertaking (room above the lines to sign) */
  .s2-under { font-size: 11px; line-height: 1.65; margin: 8px 0 0; }
  .s2-signs { display: flex; justify-content: space-between; margin-top: 48px; }
  .s2-sign { width: 210px; border-top: 1px solid #333; text-align: center; font-size: 10.5px;
             font-weight: 700; padding-top: 4px; }

  /* Office use (taller lines for signature) */
  .s2-office { border: 1px dashed #94a3b8; background: #f4f7fb; border-radius: 6px; padding: 10px 12px 14px; }
  .s2-office .h { font-size: 11px; font-weight: 700; color: #0f3d68; text-transform: uppercase; letter-spacing: .6px; }
  .s2-office .fld .line { height: 34px; padding-top: 14px; }
`;

// ══════════════════════════════════════════════════════════════
// Build + Print
// ══════════════════════════════════════════════════════════════

// One document with one or many forms (one A4 page each)
function admissionDocument(forms: AdmissionFormData[], autoPrint: boolean, docTitle: string) {
  const isStyleTwo = forms[0]?.style === "style2";
  const pages = forms
    .map((f) => `<div class="page">${isStyleTwo ? styleTwoBody(f) : styleOneBody(f)}</div>`)
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>${esc(docTitle)}</title>
<style>
  @page { size: A4 portrait; margin: 9mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  ${isStyleTwo ? STYLE_TWO_CSS : STYLE_ONE_CSS}
</style></head>
<body>
  ${pages}
  ${
    autoPrint
      ? `<script>window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 500); };</script>`
      : ""
  }
</body></html>`;
}

/** Blank Admission Form HTML (preview + print) */
export function buildAdmissionFormHtml(d: AdmissionFormData, autoPrint = false) {
  const name = d.school?.name;
  return admissionDocument([d], autoPrint, `Admission Form${name ? ` - ${name}` : ""}`);
}

/** Print the blank Admission Form */
export function printAdmissionForm(d: AdmissionFormData) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    notify.error("Popup blocked — please allow popups for this site");
    return;
  }
  win.document.open();
  win.document.write(buildAdmissionFormHtml(d, true));
  win.document.close();
}

// ── Student Bio Data ──

const bioDate = (d: any) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

// Student record → form values (Registration Fee & Monthly Fee left blank)
export function toBioValues(st: any): Record<string, string> {
  const p = st.parentId || {};
  const className = st.classId?.name || "";
  return {
    photo: st.image || "",
    studentName: st.fullName || "",
    bForm: st.bFormNumber || "",
    dob: bioDate(st.dateOfBirth),
    placeOfBirth: st.placeOfBirth || "",
    previousSchool: st.previousSchool || "",
    gender: st.gender || "",
    caste: st.cast || "",
    religion: st.religion || "",
    nationality: st.nationality || "",
    admissionClass: className,
    section: st.section || "",
    fatherName: p.fullName || "",
    cnic: p.cnic || "",
    fatherPhone: p.phone || "",
    occupation: p.occupation || "",
    address: p.address || "",
    motherName: st.motherName || "",
    motherProfession: st.motherProfession || "",
    motherPhone: st.motherPhone || "",
    guardianName: st.guardianName || "",
    guardianRelation: st.guardianRelation || "",
    guardianPhone: st.guardianPhone || "",
    admissionDate: bioDate(st.enrollmentDate),
    grNumber: st.grNumber != null ? String(st.grNumber) : "",
    classSection: className ? `${className}${st.section ? ` (${st.section})` : ""}` : "",
    registrationFee: "",
    monthlyFee: "",
  };
}

/** Print Bio Data for many students (one A4 page each, sorted by GR #) */
export function printBioData(
  students: any[],
  opts: { school: AdmissionFormData["school"]; undertaking: string; style: "style1" | "style2" },
) {
  if (!students.length) {
    notify.error("No students to print");
    return;
  }
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    notify.error("Popup blocked — please allow popups for this site");
    return;
  }

  const sorted = [...students].sort(
    (a, b) => (Number(a.grNumber) || 0) - (Number(b.grNumber) || 0),
  );
  const forms: AdmissionFormData[] = sorted.map((st) => ({
    school: opts.school,
    undertaking: opts.undertaking,
    style: opts.style,
    title: "STUDENT BIO DATA",
    values: toBioValues(st),
  }));

  win.document.open();
  win.document.write(
    admissionDocument(forms, true, `Student Bio Data (${forms.length})`),
  );
  win.document.close();
}