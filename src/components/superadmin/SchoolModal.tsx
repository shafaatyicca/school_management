import { X, Building2, Phone, MapPin, ImageIcon, Plus } from "lucide-react";

export const SchoolModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isEditing,
}: any) => {
  if (!isOpen) return null;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 pb-0 flex justify-between items-start">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {isEditing ? "Update School" : "Register School"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-slate-50 text-slate-400 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-6">
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 group-hover:border-indigo-400 group-hover:text-indigo-500 transition-all overflow-hidden">
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={24} />
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
              <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-lg">
                <Plus size={12} />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModalInput
              label="School Name"
              icon={<Building2 size={16} />}
              value={formData.name}
              onChange={(v) => setFormData({ ...formData, name: v })}
            />
            <ModalInput
              label="Phone"
              icon={<Phone size={16} />}
              value={formData.phone}
              onChange={(v) => setFormData({ ...formData, phone: v })}
            />
            <div className="md:col-span-2">
              <ModalInput
                label="Address"
                icon={<MapPin size={16} />}
                value={formData.address}
                onChange={(v) => setFormData({ ...formData, address: v })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-sm font-bold text-slate-700">
              Operational Status
            </span>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  status: formData.status === "active" ? "inactive" : "active",
                })
              }
              className={`w-12 h-6 rounded-full transition-all relative ${
                formData.status === "active" ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  formData.status === "active" ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
            {isEditing ? "Save Changes" : "Create Institution"}
          </button>
        </form>
      </div>
    </div>
  );
};

const ModalInput = ({ label, icon, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
        {icon}
      </div>
      <input
        required
        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-none text-sm transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);
