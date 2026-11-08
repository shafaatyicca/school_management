"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  Receipt,
  Percent,
  Landmark,
  Save,
  RotateCcw,
  CircleDot,
  ShieldCheck,
  ShieldOff,
  ScrollText,
} from "lucide-react";
import {
  TextField,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { DEFAULT_UNDERTAKING } from "@/lib/voucherDates";

const MAX_ITEMS = 15; // Keeps the voucher within a single printed page
const ACCENT = "#0284c7";
const ACCENT_HOVER = "#0369a1";

const EMPTY = {
  phone: "",
  voucher: { prefix: "", copies: 1, dueDay: 10, validityDays: 0, note: "", maxItems: 10 },
  lateFee: {
    mode: "fixed",
    value: 0,
    autoApply: false,
    categoryId: "",
    startMonth: null as number | null,
    startYear: null as number | null,
  },
  bank: { name: "", accountTitle: "", accountNumber: "" },
  admission: { undertaking: DEFAULT_UNDERTAKING, formStyle: "style1" },
};

// To add a new settings section in the future, add a tab here
const TABS = [
  {
    key: "voucher",
    label: "Fee Voucher",
    description: "Layout, due date & validity",
    icon: Receipt,
    color: "text-sky-500",
  },
  {
    key: "lateFee",
    label: "Late Fee",
    description: "Fines after the due date",
    icon: Percent,
    color: "text-amber-500",
  },
  {
    key: "bank",
    label: "Bank Details",
    description: "Payment account on voucher",
    icon: Landmark,
    color: "text-emerald-500",
  },
    {
    key: "admission",
    label: "Admission Form",
    description: "Undertaking text on the form",
    icon: ScrollText,
    color: "text-violet-500",
  },
];

const TAB_HEADINGS: Record<string, { title: string; subtitle: string }> = {
  voucher: {
    title: "Fee Voucher",
    subtitle: "Control how fee vouchers are generated and printed for your school.",
  },
  lateFee: {
    title: "Late Fee",
    subtitle: "Define the fine charged when fees are paid after the due date.",
  },
  bank: {
    title: "Bank Details",
    subtitle: "These details are printed at the bottom of every fee voucher.",
  },
    admission: {
    title: "Admission Form",
    subtitle: "This text is printed in the Undertaking section of the blank Admission Form.",
  },
};


const toggleSx = {
  "& .MuiToggleButton-root": {
    textTransform: "none",
    fontSize: "12px",
    py: 0.6,
    px: 2,
    color: "var(--muted-foreground)",
    borderColor: "var(--border)",
    "&.Mui-selected": {
      backgroundColor: "rgba(2,132,199,0.12)",
      color: ACCENT,
      borderColor: ACCENT,
      fontWeight: 700,
    },
  },
};

// Compact month/year picker popup (same style as Bulk Generate)
const monthPickerPopperSx = {
  "& .MuiPaper-root, & .MuiPickersLayout-root, & .MuiPickersLayout-contentWrapper": {
    width: "236px",
    minWidth: "unset",
  },
  "& .MuiDateCalendar-root": { width: "236px", height: "auto", minHeight: "unset" },
  "& .MuiPickersCalendarHeader-root": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: "12px",
    paddingRight: "8px",
    marginTop: "8px",
    marginBottom: "4px",
    minHeight: "36px",
  },
  "& .MuiPickersCalendarHeader-labelContainer": {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 0,
    maxHeight: "none",
    overflow: "visible",
    cursor: "pointer",
  },
  "& .MuiPickersFadeTransitionGroup-root": { overflow: "visible" },
  "& .MuiPickersCalendarHeader-label": {
    whiteSpace: "nowrap",
    fontSize: "13px",
    fontWeight: 600,
    marginRight: 0,
  },
  "& .MuiPickersCalendarHeader-switchViewButton": { marginLeft: "auto", padding: "4px" },
  "& .MuiMonthCalendar-root": {
    width: "236px",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "4px",
    padding: "8px",
  },
  "& .MuiPickersMonth-root": { flexBasis: "unset" },
  "& .MuiPickersMonth-monthButton, & .MuiMonthCalendar-button": {
    fontSize: "12px",
    height: "28px",
    width: "100%",
    margin: 0,
    borderRadius: "6px",
    fontWeight: 500,
  },
  "& .MuiPickersMonth-monthButton.Mui-selected, & .MuiMonthCalendar-button.Mui-selected": {
    backgroundColor: ACCENT,
    color: "#ffffff",
    "&:hover": { backgroundColor: ACCENT_HOVER },
  },
  "& .MuiYearCalendar-root": { width: "236px" },
  "& .MuiPickersYear-yearButton, & .MuiYearCalendar-button": {
    fontSize: "12px",
    height: "28px",
    margin: 0,
    borderRadius: "6px",
  },
  "& .MuiPickersYear-yearButton.Mui-selected, & .MuiYearCalendar-button.Mui-selected": {
    backgroundColor: ACCENT,
    color: "#ffffff",
  },
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span
    className="text-[11px] font-semibold uppercase tracking-wider"
    style={{ color: "var(--muted-foreground)" }}
  >
    {children}
  </span>
);

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <span
        className="text-[11px] font-bold uppercase tracking-wider"
        style={{ color: "var(--muted-foreground)" }}
      >
        {title}
      </span>
      <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
  </div>
);

export default function SettingsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const schoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;

  const [tab, setTab] = useState("voucher");
  const [form, setForm] = useState<any>(EMPTY);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Last saved snapshot — used for "Unsaved changes" and "Discard"
  const savedRef = useRef<string>(JSON.stringify(EMPTY));

  // Super admin: resolve school from subdomain
  useEffect(() => {
    if (!isSuperAdmin) return;
    const host = window.location.hostname;
    if (host.includes(".lvh.me") || host.includes(".localhost")) {
      fetch(`/api/superadmin/schools?slug=${host.split(".")[0]}`)
        .then((r) => r.json())
        .then((d) => d?._id && setViewSchoolId(d._id));
    }
  }, [isSuperAdmin]);

  // Normalize API response into form shape
  const toForm = (s: any) => ({
    ...EMPTY,
    ...s,
    voucher: { ...EMPTY.voucher, ...(s?.voucher || {}) },
    lateFee: {
      ...EMPTY.lateFee,
      ...(s?.lateFee || {}),
      categoryId: s?.lateFee?.categoryId ? String(s.lateFee.categoryId) : "",
    },
    bank: { ...EMPTY.bank, ...(s?.bank || {}) },
    admission: {
      undertaking: s?.admission?.undertaking || DEFAULT_UNDERTAKING,
      formStyle: s?.admission?.formStyle === "style2" ? "style2" : "style1",
    },
  });

  // Load settings + fee categories
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/settings?schoolId=${schoolId}`).then((r) => r.json()),
      fetch(`/api/Fee_Management/fee-categories?schoolId=${schoolId}`).then((r) => r.json()),
    ])
      .then(([s, cats]) => {
        const next = toForm(s);
        setForm(next);
        savedRef.current = JSON.stringify(next);
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => notify.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [schoolId]);

  const set = (group: string, key: string, value: any) =>
    setForm((f: any) => ({ ...f, [group]: { ...f[group], [key]: value } }));

  const isDirty = useMemo(
    () => JSON.stringify(form) !== savedRef.current,
    [form],
  );

  const handleDiscard = () => setForm(JSON.parse(savedRef.current));

  const handleSave = async () => {
    if (form.lateFee.autoApply && !form.lateFee.categoryId) {
      notify.error("Please select a fine category to apply late fees");
      setTab("lateFee");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, schoolId }),
      });
      const data = await res.json();
      if (res.ok) {
        const next = toForm(data);
        setForm(next);
        savedRef.current = JSON.stringify(next);
        notify.success("Settings saved successfully");
      } else {
        notify.error(data.message || "Failed to save settings");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // Fine category cannot be a class-fee (tuition) category
  const fineCategories = categories.filter((c) => c.feeSource !== "class_fee");
  const heading = TAB_HEADINGS[tab];

  const startValue =
    form.lateFee.startYear && form.lateFee.startMonth
      ? dayjs(
          `${form.lateFee.startYear}-${String(form.lateFee.startMonth).padStart(2, "0")}-01`,
        )
      : null;

  return (
    <div className="space-y-4">
      <PageHeader title="School Settings" icon={<Settings className="w-4 h-4" />} />

      <div className="max-w-5xl grid grid-cols-1 md:grid-cols-[230px_1fr] gap-4 items-start">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <nav
          className="rounded-xl border p-2 flex md:flex-col gap-1 overflow-x-auto md:sticky md:top-24"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          <p
            className="hidden md:block px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            Configuration
          </p>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`group relative flex items-start gap-2.5 rounded-lg px-3 py-2 text-left whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "bg-sky-50 dark:bg-sky-500/10"
                    : "hover:bg-[color:var(--muted)]"
                }`}
              >
                {/* Active indicator */}
                <span
                  className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-sky-500 transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                    active
                      ? "border-sky-200 bg-white dark:border-sky-500/30 dark:bg-sky-500/10"
                      : ""
                  }`}
                  style={active ? undefined : { borderColor: "var(--border)" }}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-sky-600 dark:text-sky-300" : t.color}`} />
                </span>
                <span className="flex flex-col">
                  <span
                    className={`text-xs font-semibold ${
                      active ? "text-sky-700 dark:text-sky-300" : "text-foreground"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span
                    className="hidden md:block text-[10px] mt-0.5"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {t.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* ── Content ─────────────────────────────────────── */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-bold text-foreground">{heading.title}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {heading.subtitle}
            </p>
          </div>

          {/* Body */}
          <div className={`p-5 space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
            {/* ── Fee Voucher ── */}
            {tab === "voucher" && (
              <>
                <Group title="Identity">
                  <TextField
                    label="Voucher Short Code"
                    size="small"
                    value={form.voucher.prefix}
                    onChange={(e) => set("voucher", "prefix", e.target.value.toUpperCase())}
                    helperText={`Voucher ID preview: ${form.voucher.prefix || "V"}-924-112026`}
                  />
                  <TextField
                    label="Contact Phone"
                    size="small"
                    value={form.phone}
                    onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))}
                    helperText="Printed under the school address"
                  />
                </Group>

                <Group title="Schedule">
                  <TextField
                    label="Due Day of Month"
                    type="number"
                    size="small"
                    value={form.voucher.dueDay}
                    onChange={(e) => set("voucher", "dueDay", Number(e.target.value))}
                    inputProps={{ min: 1, max: 28 }}
                    helperText="Between 1 and 28"
                  />
                  <TextField
                    label="Extra Validity Days"
                    type="number"
                    size="small"
                    value={form.voucher.validityDays}
                    onChange={(e) => set("voucher", "validityDays", Number(e.target.value))}
                    inputProps={{ min: 0 }}
                    helperText="0 = valid until the end of the due month"
                  />
                </Group>

                <Group title="Layout">
                  <TextField
                    label="Max Line Items"
                    type="number"
                    size="small"
                    value={form.voucher.maxItems}
                    onChange={(e) =>
                      set(
                        "voucher",
                        "maxItems",
                        Math.min(MAX_ITEMS, Math.max(1, Number(e.target.value) || 1)),
                      )
                    }
                    inputProps={{ min: 1, max: MAX_ITEMS }}
                    helperText={`1–${MAX_ITEMS}. Remaining dues are merged into the last line`}
                  />
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Select Fee Voucher Format</FieldLabel>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={form.voucher.copies}
                      onChange={(_, v) => v && set("voucher", "copies", v)}
                      sx={toggleSx}
                    >
                      <ToggleButton value={1}>Single Copy</ToggleButton>
                      <ToggleButton value={2}>Double Copy</ToggleButton>
                      <ToggleButton value={3}>Triple Copy</ToggleButton>
                    </ToggleButtonGroup>
                  </div>
                  <TextField
                    label="Footer Note"
                    size="small"
                    multiline
                    rows={2}
                    value={form.voucher.note}
                    onChange={(e) => set("voucher", "note", e.target.value)}
                    helperText="Shown above the validity line on the voucher"
                    className="sm:col-span-2"
                  />
                </Group>
              </>
            )}

            {/* ── Late Fee ── */}
            {tab === "lateFee" && (
              <>
                <Group title="Amount">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Fine Type</FieldLabel>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={form.lateFee.mode}
                      onChange={(_, v) => v && set("lateFee", "mode", v)}
                      sx={toggleSx}
                    >
                      <ToggleButton value="fixed">Fixed Amount</ToggleButton>
                      <ToggleButton value="percentage">Percentage</ToggleButton>
                    </ToggleButtonGroup>
                  </div>
                  <TextField
                    label={form.lateFee.mode === "percentage" ? "Fine (%)" : "Fine (Rs.)"}
                    type="number"
                    size="small"
                    value={form.lateFee.value}
                    onChange={(e) => set("lateFee", "value", Number(e.target.value))}
                    inputProps={{ min: 0 }}
                    helperText={
                      form.lateFee.mode === "percentage"
                        ? "Percentage of the outstanding amount"
                        : "Added once per month after the due date"
                    }
                  />
                </Group>

                <Group title="Automation">
                  {/* Auto-apply card */}
                  <label
                    className={`sm:col-span-2 flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      form.lateFee.autoApply
                        ? "border-sky-300 bg-sky-50/60 dark:border-sky-500/40 dark:bg-sky-500/5"
                        : ""
                    }`}
                    style={form.lateFee.autoApply ? undefined : { borderColor: "var(--border)" }}
                  >
                    <Checkbox
                      size="small"
                      checked={form.lateFee.autoApply}
                      onChange={(e) => set("lateFee", "autoApply", e.target.checked)}
                      sx={{ p: 0, mt: "2px", "&.Mui-checked": { color: ACCENT } }}
                    />
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          Apply late fee automatically
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            form.lateFee.autoApply
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {form.lateFee.autoApply ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <ShieldOff className="w-3 h-3" />
                          )}
                          {form.lateFee.autoApply ? "Active" : "Display only"}
                        </span>
                      </span>
                      <span
                        className="block text-[11px] mt-1 leading-relaxed"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        When off, the late fee is only shown on the voucher as
                        &quot;Payable After the Due Date&quot;. When on, a fine invoice is
                        created automatically for unpaid invoices once the due date has passed.
                      </span>
                    </span>
                  </label>

                  <TextField
                    select
                    label="Fine Category"
                    size="small"
                    value={form.lateFee.categoryId}
                    onChange={(e) => set("lateFee", "categoryId", e.target.value)}
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                    disabled={!form.lateFee.autoApply}
                    helperText="Create it first on the Fee Category page"
                  >
                    <option value="">Select category</option>
                    {fineCategories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </TextField>

                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Apply From"
                      views={["year", "month"]}
                      openTo="month"
                      format="MMMM YYYY"
                      disabled={!form.lateFee.autoApply}
                      value={startValue}
                      onChange={(d) =>
                        setForm((f: any) => ({
                          ...f,
                          lateFee: {
                            ...f.lateFee,
                            startMonth: d ? d.month() + 1 : null,
                            startYear: d ? d.year() : null,
                          },
                        }))
                      }
                      slotProps={{
                        textField: {
                          size: "small",
                          fullWidth: true,
                          helperText: "Fines apply from this month onwards only",
                        },
                        openPickerButton: {
                          size: "small",
                          sx: { padding: "2px", "& svg": { fontSize: "16px" } },
                        },
                        popper: { sx: monthPickerPopperSx },
                      }}
                    />
                  </LocalizationProvider>
                </Group>
              </>
            )}

            {/* ── Bank Details ── */}
            {tab === "bank" && (
              <Group title="Account">
                <TextField
                  label="Bank Name"
                  size="small"
                  value={form.bank.name}
                  onChange={(e) => set("bank", "name", e.target.value)}
                  placeholder="e.g. Allied Bank Limited"
                />
                <TextField
                  label="Account Title"
                  size="small"
                  value={form.bank.accountTitle}
                  onChange={(e) => set("bank", "accountTitle", e.target.value)}
                />
                <TextField
                  label="Account Number"
                  size="small"
                  value={form.bank.accountNumber}
                  onChange={(e) => set("bank", "accountNumber", e.target.value)}
                  className="sm:col-span-2"
                />
              </Group>
            )}

            {/* ── Admission Form ── */}
              {tab === "admission" && ( <>
                <Group title="Form Style">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <FieldLabel>Admission Form Format</FieldLabel>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={form.admission.formStyle}
                      onChange={(_, v) => v && set("admission", "formStyle", v)}
                      sx={toggleSx}
                    >
                      <ToggleButton value="style1">Form Style Classic</ToggleButton>
                      <ToggleButton value="style2">Form Style Modern</ToggleButton>
                    </ToggleButtonGroup>
                  </div>
                </Group>
                <Group title="Undertaking">
                  <TextField
                    label="Undertaking Text"
                    size="small"
                    multiline
                    rows={5}
                    value={form.admission.undertaking}
                    onChange={(e) => set("admission", "undertaking", e.target.value)}
                    helperText="Parents sign under this text on the Admission Form"
                    className="sm:col-span-2"
                  />
                  <div className="sm:col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => set("admission", "undertaking", DEFAULT_UNDERTAKING)}
                      disabled={form.admission.undertaking === DEFAULT_UNDERTAKING}
                      className="h-8 text-xs font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Reset to default
                    </Button>
                  </div>
                </Group>
                </>
              )}
          </div>

          {/* Footer — saves all tabs together */}
          <div
            className="flex items-center justify-between gap-3 px-5 py-3 border-t"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              {isDirty ? (
                <>
                  <CircleDot className="w-3 h-3 text-amber-500" />
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Unsaved changes
                  </span>
                </>
              ) : (
                <span style={{ color: "var(--muted-foreground)" }}>
                  All changes saved
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleDiscard}
                disabled={!isDirty || saving}
                className="h-8 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Discard
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !schoolId || !isDirty}
                className="h-8 bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 text-white text-xs font-semibold px-4 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}