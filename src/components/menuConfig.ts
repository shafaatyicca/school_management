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
  WalletCards,
  ReceiptText,
  Ticket,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type MenuItem = {
  name: string;
  icon: LucideIcon;
  href?: string;
  keywords?: string[]; // extra words for the global search
  superAdminOnly?: boolean; // hidden for normal users
  searchOnly?: boolean; // shown in search, not in the sidebar
  isDropdown?: boolean;
  subItems?: MenuItem[];
};

// ONE list for the Sidebar and the global search
export const MENU: MenuItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, keywords: ["home", "stats", "tasks"] },
  { name: "Classes", href: "/classes", icon: BookOpen, keywords: ["class", "section", "class fee", "order"] },
  {
    name: "Students Management",
    icon: GraduationCap,
    isDropdown: true,
    subItems: [
      { name: "Add Student", href: "/students", icon: UserPlus, keywords: ["students", "new student", "admission", "list"] },
      { name: "Student Information", href: "/student-information", icon: Contact, keywords: ["active", "inactive", "class list", "report"] },
      { name: "Student Bio Data", href: "/student-bio-data", icon: BookUser, keywords: ["bio", "print", "profile print"] },
      { name: "Admission Form", href: "/admission-form", icon: FileText, keywords: ["blank form", "form", "admission"] },
      { name: "Import Students", href: "/student-import", icon: FileUp, keywords: ["excel", "upload", "bulk"], superAdminOnly: true },
    ],
  },
  { name: "Employees", href: "/employees", icon: BriefcaseBusiness, keywords: ["staff", "teachers", "salary"] },
  { name: "Parents", href: "/parents", icon: UsersRound, keywords: ["father", "guardian", "family"] },
  {
    name: "Fee Management",
    icon: WalletCards,
    isDropdown: true,
    subItems: [
      { name: "Fee Categories", href: "/fee-categories", icon: WalletCards, keywords: ["fee type", "tuition", "category"] },
      { name: "Student Fee Ledger", href: "/student-fee-ledger", icon: ReceiptText, keywords: ["fees", "dues", "payment", "invoice", "ledger", "receipt"] },
      { name: "Fee Voucher Printing", href: "/fee-voucher", icon: Ticket, keywords: ["voucher", "challan", "bill", "print"] },
    ],
  },
  { name: "Settings", href: "/settings", icon: Settings, keywords: ["late fee", "bank", "undertaking", "voucher settings"], searchOnly: true },
];

const allowed = (item: MenuItem, isSuperAdmin: boolean) => !item.superAdminOnly || isSuperAdmin;

// Sidebar: hides search-only and super-admin-only items
export function getSidebarMenu(isSuperAdmin: boolean): MenuItem[] {
  return MENU.filter((i) => !i.searchOnly && allowed(i, isSuperAdmin)).map((i) =>
    i.subItems
      ? { ...i, subItems: i.subItems.filter((s) => !s.searchOnly && allowed(s, isSuperAdmin)) }
      : i,
  );
}

// Global search: every page as a flat list
export type SearchPage = { name: string; href: string; icon: LucideIcon; group: string; keywords: string[] };

export function getSearchPages(isSuperAdmin: boolean): SearchPage[] {
  const pages: SearchPage[] = [];
  for (const item of MENU) {
    if (!allowed(item, isSuperAdmin)) continue;
    if (item.subItems) {
      for (const sub of item.subItems) {
        if (sub.href && allowed(sub, isSuperAdmin))
          pages.push({ name: sub.name, href: sub.href, icon: sub.icon, group: item.name, keywords: sub.keywords || [] });
      }
    } else if (item.href) {
      pages.push({ name: item.name, href: item.href, icon: item.icon, group: "", keywords: item.keywords || [] });
    }
  }
  return pages;
}