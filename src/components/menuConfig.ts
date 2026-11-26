import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  UserPlus,
  Contact,
  BookUser,
  FileText,
  FileUp,
  BriefcaseBusiness,
  UsersRound,
  Users,
  WalletCards,
  ReceiptText,
  Ticket,
  Settings,
  History,
  ShieldCheck,
  BookPlus,
  ClipboardList,
  UserCog,
  type LucideIcon,
} from "lucide-react";


export type MenuItem = {
  name: string;
  icon: LucideIcon;
  href?: string;
  module?: string; // permission module (User Access) — page shows only with "View"
  keywords?: string[]; // extra words for the global search
  superAdminOnly?: boolean; // hidden for normal users
  adminOnly?: boolean; // only School Admin + Super Admin
  searchOnly?: boolean; // shown in search, not in the sidebar
  isDropdown?: boolean;
  subItems?: MenuItem[];
};


// Permission check passed in from usePermissions().can
export type CanFn = (module: string, action: string) => boolean;

// ONE list for the Sidebar and the global search
export const MENU: MenuItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, keywords: ["home", "stats", "tasks"] },
    { name: "Activity Logs", href: "/activity-logs", icon: History, keywords: ["logs", "history", "audit", "who changed", "login history", "my activity"] },
  { name: "User Access", href: "/user-access", icon: ShieldCheck, keywords: ["roles", "permissions", "access", "staff login"], superAdminOnly: true },
    {
    name: "Class Management",
    icon: BookOpen,
    isDropdown: true,
    subItems: [
      { name: "Add Classes", href: "/classes", icon: BookPlus, module: "classes", keywords: ["class", "section", "class fee", "order"] },
      { name: "Classes Summary", href: "/class-summary", icon: ClipboardList, module: "classSummary", keywords: ["strength", "boys", "girls", "gender", "students count", "section wise"] },
    ],
  },
  {
    name: "Students Management",
    icon: GraduationCap,
    isDropdown: true,
    subItems: [
      { name: "Add Student", href: "/students", icon: UserPlus, module: "students", keywords: ["students", "new student", "admission", "list"] },
      { name: "Student Information", href: "/student-information", icon: Contact, module: "studentInfo", keywords: ["active", "inactive", "class list", "report"] },
      { name: "Student Bulk Info Change", href: "/student-bulk-info", icon: UserCog, module: "bulkInfo", keywords: ["bulk", "change", "date of birth", "dob", "admission date", "section change", "class change", "promote"] },
      { name: "Print Student Bio Data", href: "/student-bio-data", icon: BookUser, module: "bioData", keywords: ["bio", "print", "profile print"] },
      { name: "Print Admission Form", href: "/admission-form", icon: FileText, module: "admissionForm", keywords: ["blank form", "form", "admission"] },
      { name: "Import Students", href: "/student-import", icon: FileUp, keywords: ["excel", "upload", "bulk"], superAdminOnly: true },
    ],
  },
  {
    name: "Parent Management",
    icon: Users,
    isDropdown: true,
    subItems: [
      { name: "Parent Information", href: "/parents", icon: UsersRound, module: "parents", keywords: ["parents", "father", "guardian", "family", "cnic", "orphan"] },
    ],
  },
  { name: "Employees", href: "/employees", icon: BriefcaseBusiness, module: "employees", keywords: ["staff", "teachers", "salary"] },
  {
    name: "Fee Management",
    icon: WalletCards,
    isDropdown: true,
    subItems: [
      { name: "Fee Categories", href: "/fee-categories", icon: WalletCards, module: "feeCategories", keywords: ["fee type", "tuition", "category"] },
      { name: "Student Fee Ledger", href: "/student-fee-ledger", icon: ReceiptText, module: "fees", keywords: ["fees", "dues", "payment", "invoice", "ledger", "receipt"] },
      { name: "Fee Voucher Printing", href: "/fee-voucher", icon: Ticket, module: "vouchers", keywords: ["voucher", "challan", "bill", "print"] },
    ],
  },

  { name: "Settings", href: "/settings", icon: Settings, module: "settings", keywords: ["late fee", "bank", "undertaking", "voucher settings"], searchOnly: true },
];

// Role rules + User Access ticks ("View")
const allowed = (item: MenuItem, isSuperAdmin: boolean, isAdmin: boolean, can?: CanFn) =>
  (!item.superAdminOnly || isSuperAdmin) &&
  (!item.adminOnly || isAdmin) &&
  (isSuperAdmin || !item.module || !can || can(item.module, "view"));

// Sidebar: hides search-only, role-only and not-permitted items.
// A dropdown with no allowed pages is hidden completely.
export function getSidebarMenu(
  isSuperAdmin: boolean,
  isAdmin = isSuperAdmin,
  can?: CanFn,
): MenuItem[] {
  return MENU.filter((i) => !i.searchOnly && allowed(i, isSuperAdmin, isAdmin, can))
    .map((i) =>
      i.subItems
        ? {
            ...i,
            subItems: i.subItems.filter(
              (s) => !s.searchOnly && allowed(s, isSuperAdmin, isAdmin, can),
            ),
          }
        : i,
    )
    .filter((i) => !i.isDropdown || (i.subItems && i.subItems.length > 0));
}

// Global search: every allowed page as a flat list
export type SearchPage = { name: string; href: string; icon: LucideIcon; group: string; keywords: string[] };

export function getSearchPages(
  isSuperAdmin: boolean,
  isAdmin = isSuperAdmin,
  can?: CanFn,
): SearchPage[] {
  const pages: SearchPage[] = [];
  for (const item of MENU) {
    if (!allowed(item, isSuperAdmin, isAdmin, can)) continue;
    if (item.subItems) {
      for (const sub of item.subItems) {
        if (sub.href && allowed(sub, isSuperAdmin, isAdmin, can))
          pages.push({ name: sub.name, href: sub.href, icon: sub.icon, group: item.name, keywords: sub.keywords || [] });
      }
    } else if (item.href) {
      pages.push({ name: item.name, href: item.href, icon: item.icon, group: "", keywords: item.keywords || [] });
    }
  }
  return pages;
}