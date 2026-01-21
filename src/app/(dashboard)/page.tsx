import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, GraduationCap, LayoutDashboard } from "lucide-react";
import PageHeader from "@/components/PageHeader"; // ✅ PageHeader Import

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* ✅ Page header added.
       */}
      <PageHeader
        title="Admin Dashboard"
        icon={<LayoutDashboard className="w-3.5 h-3.5" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Students Card */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Students</p>
              <h2 className="text-3xl font-bold mt-1">120</h2>
            </div>
            <Users className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        {/* Classes Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Classes</p>
              <h2 className="text-3xl font-bold mt-1">10</h2>
            </div>
            <BookOpen className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        {/* Teachers Card */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Teachers</p>
              <h2 className="text-3xl font-bold mt-1">15</h2>
            </div>
            <GraduationCap className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
