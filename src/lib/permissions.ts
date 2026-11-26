export const ACTIONS = ["view", "create", "edit", "delete", "export"] as const;
export type Action = (typeof ACTIONS)[number];

// ─────────────────────────────────────────────────────────────
// Pages (rows in User Access → "Pages" tab)
// To add a new module later (Accounts, Exams, Attendance …):
//   1. add a group below (if needed)  2. add its rows to MODULES
// The User Access page builds itself from these lists.
// ─────────────────────────────────────────────────────────────

export const MODULE_GROUPS = [
  { key: "students", label: "Students" },
  { key: "people", label: "Parents & Staff" },
  { key: "fees", label: "Fee Management" },
  { key: "system", label: "System" },
] as const;
export type ModuleGroup = (typeof MODULE_GROUPS)[number]["key"];

// One row per page / job. Only the listed actions get a checkbox.
// (Dashboard has no row: it opens for everyone, its widgets have their own ticks.)
export const MODULES = [
  { key: "classes", label: "Classes", group: "students", actions: ["view", "edit", "export"] },
  { key: "classSummary", label: "Class Summary", group: "students", actions: ["view", "export"] },
  { key: "students", label: "Add Student (Students)", group: "students", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "studentInfo", label: "Student Information", group: "students", actions: ["view", "export"] },
  { key: "bulkInfo", label: "Students Bulk Info Change", group: "students", actions: ["view", "edit"] },
  { key: "bioData", label: "Bulk Student Bio Data", group: "students", actions: ["view", "export"] },
  { key: "admissionForm", label: "Print Admission Form", group: "students", actions: ["view", "export"] },
  { key: "parents", label: "Parents", group: "people", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "employees", label: "Employees", group: "people", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "feeCategories", label: "Fee Categories", group: "fees", actions: ["view", "export"] },
  { key: "fees", label: "Student Fee Ledger", group: "fees", actions: ["view", "export"] },
  { key: "invoices", label: "Student Invoices", group: "fees", actions: ["create", "edit", "delete"] },
  { key: "discounts", label: "Fee Discounts", group: "fees", actions: ["view", "create", "edit", "delete"] },
  { key: "takePayment", label: "Take Payment", group: "fees", actions: ["create"] },
  { key: "reversePayment", label: "Reverse Payment", group: "fees", actions: ["delete"] },
  { key: "vouchers", label: "Fee Voucher Printing", group: "fees", actions: ["view", "export"] },
  { key: "settings", label: "Settings", group: "system", actions: ["view", "edit"] },
] as const;
export type ModuleKey = (typeof MODULES)[number]["key"];

export const WIDGET_GROUPS = [
  { key: "school", label: "School" },
  { key: "fees", label: "Fees" },
] as const;
export type WidgetGroup = (typeof WIDGET_GROUPS)[number]["key"];

export const WIDGETS = [
  { key: "schoolTotals", label: "School Totals", group: "school", description: "Students, parents and staff counts" },
  { key: "birthdays", label: "Birthdays", group: "school", description: "Upcoming student and staff birthdays" },
  { key: "admissions", label: "Admissions & Withdrawals", group: "school", description: "New and left students this month" },
  { key: "feeToday", label: "Fee Collection", group: "fees", description: "Today's and this month's collection" },
  { key: "recentPayments", label: "Recent Payments", group: "fees", description: "Latest payments received" },
] as const;
export type WidgetKey = (typeof WIDGETS)[number]["key"];

// No more one-tick "special" permissions (kept empty so old imports still work)
export const SPECIAL: readonly { key: string; label: string }[] = [];
export type SpecialKey = string;

export type Permissions = {
  modules: Partial<Record<ModuleKey, Partial<Record<Action, boolean>>>>;
  widgets?: Partial<Record<WidgetKey, boolean>>;
  special: Partial<Record<string, boolean>>;
};

export const EMPTY_PERMISSIONS: Permissions = { modules: {}, widgets: {}, special: {} };

// Only the Super Admin is outside the tick system
export const FULL_ACCESS_ROLES = ["super_admin"];

// Every row + action + widget ticked (School Admin default)
export function fullPermissions(): Permissions {
  return {
    modules: Object.fromEntries(
      MODULES.map((m) => [m.key, Object.fromEntries(m.actions.map((a) => [a, true]))]),
    ) as Permissions["modules"],
    widgets: Object.fromEntries(WIDGETS.map((w) => [w.key, true])) as Permissions["widgets"],
    special: {},
  };
}

// Templates created automatically for every school (only the first time)
export const DEFAULT_ROLES: { key: string; name: string; permissions: Permissions }[] = [
  {
    key: "school_admin",
    name: "School Admin",
    permissions: fullPermissions(),
  },
  {
    key: "accountant",
    name: "Accountant",
    permissions: {
      modules: {
        classes: { view: true },
        classSummary: { view: true, export: true },
        students: { view: true, export: true },
        studentInfo: { view: true, export: true },
        bioData: { view: true, export: true },
        parents: { view: true },
        feeCategories: { view: true },
        fees: { view: true, export: true },
        invoices: { create: true, edit: true, delete: true },
        discounts: { view: true, create: true, edit: true, delete: true },
        takePayment: { create: true },
        reversePayment: { delete: true },
        vouchers: { view: true, export: true },
        settings: { view: true },
      },
      widgets: { schoolTotals: true, feeToday: true, recentPayments: true },
      special: {},
    },
  },
  {
    key: "cashier",
    name: "Cashier",
    permissions: {
      modules: {
        students: { view: true },
        studentInfo: { view: true },
        parents: { view: true },
        fees: { view: true, export: true },
        discounts: { view: true },
        takePayment: { create: true },
        vouchers: { view: true, export: true },
      },
      widgets: { feeToday: true, recentPayments: true },
      special: {},
    },
  },
  {
    key: "helpdesk",
    name: "Helpdesk",
    permissions: {
      modules: {
        classes: { view: true },
        students: { view: true, create: true, edit: true, export: true },
        studentInfo: { view: true, export: true },
        bioData: { view: true, export: true },
        admissionForm: { view: true, export: true },
        parents: { view: true, create: true, edit: true },
        fees: { view: true },
        vouchers: { view: true, export: true },
      },
      widgets: { schoolTotals: true, birthdays: true, admissions: true },
      special: {},
    },
  },
];

// Does this permission set allow the page action?
export function can(
  perms: Permissions | null | undefined,
  module: ModuleKey,
  action: Action = "view",
): boolean {
  return !!perms?.modules?.[module]?.[action];
}

// Is this dashboard widget switched on?
export function canWidget(perms: Permissions | null | undefined, key: WidgetKey): boolean {
  return !!perms?.widgets?.[key];
}

// Kept for old imports — there are no special permissions any more
export function canSpecial(_perms: Permissions | null | undefined, _key: SpecialKey): boolean {
  return false;
}

// Keeps only real rows / actions / widgets (ignores anything else sent)
export function sanitizePermissions(input: any): Permissions {
  const out: Permissions = { modules: {}, widgets: {}, special: {} };

  for (const m of MODULES) {
    const src = input?.modules?.[m.key] || {};
    const row: Record<string, boolean> = {};
    for (const a of m.actions) if (src[a] === true) row[a] = true;
    if (Object.keys(row).length) (out.modules as any)[m.key] = row;
  }

  for (const w of WIDGETS) {
    if (input?.widgets?.[w.key] === true) (out.widgets as any)[w.key] = true;
  }

  return out;
}

/**
 * Clean permissions for reading.
 * Roles / users saved before widgets existed have no "widgets" at all →
 * they get the widgets of their default role template (School Admin: all).
 * Once the Super Admin saves them in User Access, their own ticks are used.
 */
export function normalizePermissions(input: any, roleKey?: string | null): Permissions {
  const clean = sanitizePermissions(input);
  if (!input || input.widgets === undefined || input.widgets === null) {
    const template = DEFAULT_ROLES.find((r) => r.key === roleKey);
    clean.widgets = { ...(template?.permissions.widgets || {}) };
  }
  return clean;
}

const ACTION_NAMES: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export / Print",
};

// Readable list of what changed between two permission sets (for activity logs)
export function describePermissionChanges(before: any, after: any) {
  const yes = (v: any) => (v ? "Yes" : "No");
  const out: { field: string; from: string; to: string }[] = [];

  for (const m of MODULES) {
    for (const a of m.actions) {
      const b = !!before?.modules?.[m.key]?.[a];
      const c = !!after?.modules?.[m.key]?.[a];
      if (b !== c) out.push({ field: `${m.label} · ${ACTION_NAMES[a]}`, from: yes(b), to: yes(c) });
    }
  }

  for (const w of WIDGETS) {
    const b = !!before?.widgets?.[w.key];
    const c = !!after?.widgets?.[w.key];
    if (b !== c) out.push({ field: `Dashboard widget · ${w.label}`, from: yes(b), to: yes(c) });
  }

  return out;
}