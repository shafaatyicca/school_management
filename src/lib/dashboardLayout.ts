// Every block that can appear on the dashboard (order = default order)
export const DASHBOARD_BLOCKS = [
  { id: "welcome", label: "Welcome", size: 3 },
  { id: "schoolTotals", label: "School Totals", size: 3 },
  { id: "feeToday", label: "Fee Collection", size: 1 },
  { id: "recentPayments", label: "Today's Payments", size: 2 },
  { id: "birthdays", label: "Birthdays", size: 1 },
  { id: "admissions", label: "Admissions", size: 1 },
  { id: "loginActivity", label: "Login Activity", size: 1 },
  { id: "myActivity", label: "My Activity", size: 1 },
  { id: "tasks", label: "Tasks", size: 2 },
] as const;

export type BlockSize = 1 | 2 | 3; // 1/3, 2/3, full width (large screens)
export type LayoutItem = { id: string; size: BlockSize };

export const BLOCK_IDS: string[] = DASHBOARD_BLOCKS.map((b) => b.id);

export const blockLabel = (id: string) =>
  DASHBOARD_BLOCKS.find((b) => b.id === id)?.label || id;

export const clampSize = (n: any): BlockSize => {
  const v = Number(n);
  return v === 1 || v === 2 || v === 3 ? v : 1;
};

// Default order + sizes, only for the blocks this user has
export function defaultLayout(available: string[]): LayoutItem[] {
  return DASHBOARD_BLOCKS.filter((b) => available.includes(b.id)).map((b) => ({
    id: b.id,
    size: b.size as BlockSize,
  }));
}

// Saved order first, then any new blocks (in default order) at the end
export function mergeLayout(saved: any, available: string[]): LayoutItem[] {
  if (!Array.isArray(saved) || saved.length === 0) return defaultLayout(available);

  const out: LayoutItem[] = [];
  const seen = new Set<string>();
  for (const it of saved) {
    const id = String(it?.id || "");
    if (available.includes(id) && !seen.has(id)) {
      out.push({ id, size: clampSize(it.size) });
      seen.add(id);
    }
  }
  for (const b of DASHBOARD_BLOCKS) {
    if (available.includes(b.id) && !seen.has(b.id)) {
      out.push({ id: b.id, size: b.size as BlockSize });
    }
  }
  return out;
}

// Server side: keep only real blocks and valid sizes
export function sanitizeLayout(input: any): LayoutItem[] {
  if (!Array.isArray(input)) return [];
  const out: LayoutItem[] = [];
  const seen = new Set<string>();
  for (const it of input.slice(0, 50)) {
    const id = String(it?.id || "");
    if (BLOCK_IDS.includes(id) && !seen.has(id)) {
      out.push({ id, size: clampSize(it?.size) });
      seen.add(id);
    }
  }
  return out;
}