import {
  MapPin,
  Phone,
  Edit,
  ExternalLink,
  ArrowUpRight,
  Building2,
  Trash2,
} from "lucide-react";

export const SchoolCard = ({
  school,
  onEdit,
  onSwitch,
  onExpand,
  onDelete, // <-- Prop receive karein
  isExpanded,
}: any) => (
  <div
    className={`group bg-white rounded-[2rem] border-2 transition-all duration-300 ${isExpanded ? "border-indigo-500 shadow-xl" : "border-slate-100"}`}
  >
    <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-5">
        <div
          className={`p-1 rounded-2xl border-2 ${school.isActive ? "border-emerald-400" : "border-slate-200"}`}
        >
          <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center">
            {school.logo ? (
              <img src={school.logo} className="object-cover w-full h-full" />
            ) : (
              <Building2 className="text-slate-300" />
            )}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-xl text-slate-800">{school.name}</h3>
          <div className="flex gap-3 text-slate-400 text-xs mt-1">
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {school.address}
            </span>
            <span className="flex items-center gap-1">
              <Phone size={12} /> {school.phone}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={() => onSwitch(school._id)}
          className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all"
        >
          <ExternalLink size={16} /> Login to Dashboard
        </button>
        <button
          onClick={() => onEdit(school)}
          className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50"
        >
          <Edit size={18} />
        </button>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (
              confirm(
                "Are you sure? This will delete the school and all its data!",
              )
            ) {
              onDelete(school._id); // Dashboard se aaya hua handleSchoolDelete call hoga
            }
          }}
          className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
        >
          <Trash2 size={18} />
        </button>

        <button
          onClick={() => onExpand(school._id)}
          className={`p-2.5 rounded-xl transition-all ${isExpanded ? "bg-indigo-600 text-white rotate-180" : "bg-slate-50 text-slate-400"}`}
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
    </div>
  </div>
);
