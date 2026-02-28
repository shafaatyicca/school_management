import {
  MapPin,
  Phone,
  Edit,
  ExternalLink,
  ChevronDown,
  Building2,
  Trash2,
} from "lucide-react";

export const SchoolCard = ({
  school,
  onEdit,
  onSwitch,
  onExpand,
  onDelete,
  onStatusChange, // Naya prop refresh ke liye
  isExpanded,
}: any) => {
  // Status badalne ka function (Sirf dot click par chalay ga)
  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Card ko expand hone se rokne ke liye
    const newStatus = school.status === "active" ? "inactive" : "active";

    try {
      const res = await fetch("/api/superadmin/schools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: school._id, status: newStatus }),
      });

      if (res.ok && onStatusChange) {
        onStatusChange(); // Dashboard ko refresh karne ka ishara
      }
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  return (
    <div
      className={`group relative bg-white dark:bg-card rounded-2xl border transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 ${
        isExpanded
          ? "border-indigo-500 ring-1 ring-indigo-500"
          : "border-slate-200 dark:border-border"
      }`}
    >
      <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left Section: Logo & Basic Info */}
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative">
            {/* Status Indicator Dot (Clickable) */}
            <div
              className="cursor-pointer group/status"
              onClick={handleToggleStatus}
              title="Click to toggle status"
            >
              <div className="w-14 h-14 bg-slate-50 dark:bg-accent rounded-xl overflow-hidden border border-slate-100 dark:border-border flex items-center justify-center shadow-inner">
                {school.logo ? (
                  <img
                    src={school.logo}
                    className="object-cover w-full h-full"
                    alt="logo"
                  />
                ) : (
                  <Building2 className="text-slate-300" size={24} />
                )}
              </div>

              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-card shadow-sm transition-transform group-hover/status:scale-110 ${
                  school.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                } animate-pulse`}
              />
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-800 dark:text-foreground truncate uppercase tracking-tight">
                {school.name}
              </h3>
              <span
                className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                  school.status === "active"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400"
                }`}
              >
                {school.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-slate-500 dark:text-muted-foreground">
              <span className="flex items-center gap-1.5 text-[11px]">
                <MapPin size={13} className="text-indigo-500" />{" "}
                {school.address}
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <Phone size={13} className="text-indigo-500" /> {school.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-50 dark:border-border">
          <button
            onClick={() => onSwitch(school._id)}
            className="flex-1 lg:flex-none bg-slate-900 dark:bg-indigo-600 text-white px-2 py-1.5 rounded-md text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <ExternalLink size={14} /> Dashboard
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(school)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
              title="Edit School"
            >
              <Edit size={18} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (
                  confirm(
                    "Are you sure? This will delete the school and all its data!",
                  )
                ) {
                  onDelete(school._id);
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Delete School"
            >
              <Trash2 size={18} />
            </button>

            <div className="w-[1px] h-6 bg-slate-200 dark:bg-border mx-1" />

            <button
              onClick={() => onExpand(school._id)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                isExpanded
                  ? "bg-indigo-100 text-indigo-600 rotate-180"
                  : "text-slate-400 hover:bg-slate-100 dark:hover:bg-accent"
              }`}
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
