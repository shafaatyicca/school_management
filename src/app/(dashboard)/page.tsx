"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated") {
      if (session?.user?.role === "super_admin") {
        router.push("/superadmin");
      } else if (session?.user?.schoolId) {
        router.push(`/${session.user.schoolId}`);
      } else {
        console.error("No schoolId found for this admin!");
      }
    }
  }, [status, session, router]);

  // FIXED: Matching the Dashboard Loader style for seamless transition
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-slate-500 text-sm font-medium italic">
        Verifying your dashboard access...
      </p>
    </div>
  );
}
