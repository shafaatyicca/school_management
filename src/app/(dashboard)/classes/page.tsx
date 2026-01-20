// "use client";

// import { useState } from "react";
// import ClassModal from "@/components/class-modal";
// import ClassList from "@/components/class-list";

// type ClassType = {
//   _id: string;
//   name: string;
//   sections: string[];
// };

// export default function ClassesPage() {
//   const [refresh, setRefresh] = useState(0);

//   // ✅ Edit modal state
//   const [open, setOpen] = useState(false);
//   const [editClass, setEditClass] = useState<ClassType | undefined>();

//   return (
//     <div className="">
//       <div className="flex justify-between items-center mb-2">
//         <h1 className="text-1xl font-bold">Classes</h1>

//         {/* Add button */}
//         <button
//           className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
//           onClick={() => {
//             setEditClass(undefined);
//             setOpen(true);
//           }}
//         >
//           + Add Class
//         </button>
//       </div>

//       {/* Pass modal states to ClassList */}
//       <ClassList
//         refresh={refresh}
//         setOpen={setOpen}
//         setEditClass={setEditClass}
//       />

//       {/* Modal (Add + Edit) */}
//       <ClassModal
//         open={open}
//         setOpen={setOpen}
//         cls={editClass}
//         onSuccess={() => setRefresh((p) => p + 1)}
//       />
//     </div>
//   );
// }

"use client";

import ClassManager from "@/components/ClassManager";

export default function ClassesPage() {
  return (
    <div>
      <ClassManager />
    </div>
  );
}
