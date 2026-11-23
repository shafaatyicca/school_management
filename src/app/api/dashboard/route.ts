import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getAccess, schoolIdFor, type Access } from "@/lib/access";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import Employee from "@/models/Employee";
import Todo from "@/models/Todo";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { ActivityLogModel } from "@/models/ActivityLog";
import { UserModel } from "@/models/User";
import { RoleModel } from "@/models/Role";
import { SchoolModel } from "@/models/School";
import { DashboardLayoutModel } from "@/models/DashboardLayout";

// ─────────────────────────────────────────────────────────────
// Time helpers — every "today / this month" is Pakistan time
// ─────────────────────────────────────────────────────────────

const TZ = "Asia/Karachi";
const PK_OFFSET_MS = 5 * 60 * 60 * 1000; // PKT = UTC+5 (no daylight saving)

// Today's date in Pakistan (year, month 0-11, day)
function pkToday() {
  const p = new Date(Date.now() + PK_OFFSET_MS);
  return { y: p.getUTCFullYear(), m: p.getUTCMonth(), d: p.getUTCDate() };
}

// The real instant of 12:00 AM in Pakistan for a date (handles day/month overflow)
const pkMidnight = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m, d) - PK_OFFSET_MS);

const isOid = (v: any) => !!v && mongoose.Types.ObjectId.isValid(String(v));
const M = (model: any) => model as any; // avoids Mongoose union-type errors

type Ranges = {
  todayStart: Date;
  tomorrowStart: Date;
  monthStart: Date;
  nextMonthStart: Date;
  weekStart: Date; // 7 days incl. today
};

// Adds className from the "classes" collection
const withClassName = [
  { $lookup: { from: "classes", localField: "classId", foreignField: "_id", as: "cls" } },
  { $addFields: { className: { $ifNull: [{ $arrayElemAt: ["$cls.name", 0] }, ""] } } },
  { $project: { cls: 0 } },
];

// ─────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────

// Welcome card (always)
async function getMe(access: Access, schoolId: string) {
  const user: any = await M(UserModel)
    .findById(access.userId)
    .select("roleId role lastLoginAt")
    .lean();

  let roleName = access.isSuperAdmin ? "Super Admin" : "";
  if (!roleName) {
    const role: any =
      (user?.roleId &&
        (await M(RoleModel).findOne({ _id: user.roleId, schoolId }).select("name").lean())) ||
      (await M(RoleModel).findOne({ schoolId, key: user?.role }).select("name").lean());
    roleName = role?.name || user?.role || "";
  }

  return {
    name: access.userName,
    role: access.role,
    roleName,
    lastLoginAt: user?.lastLoginAt || null,
  };
}
// Widget: School Totals (active students and staff split by gender)
async function getSchoolTotals(schoolId: string) {
  const MALE = { $regex: /^(male|m|boy)$/i };
  const FEMALE = { $regex: /^(female|f|girl)$/i };
  const activeStudent = { schoolId, status: { $ne: "inactive" } };
  const activeStaff = { schoolId, status: { $ne: "inactive" } };

  const [studentsActive, boys, girls, parents, teachers, otherStaff, staffMale, staffFemale] =
    await Promise.all([
      M(Student).countDocuments(activeStudent),
      M(Student).countDocuments({ ...activeStudent, gender: MALE }),
      M(Student).countDocuments({ ...activeStudent, gender: FEMALE }),
      M(ParentModel).countDocuments({ schoolId }),
      M(Employee).countDocuments({ ...activeStaff, staffCategory: "teacher" }),
      M(Employee).countDocuments({ ...activeStaff, staffCategory: { $ne: "teacher" } }),
      M(Employee).countDocuments({ ...activeStaff, gender: MALE }),
      M(Employee).countDocuments({ ...activeStaff, gender: FEMALE }),
    ]);

  return { studentsActive, boys, girls, parents, teachers, otherStaff, staffMale, staffFemale };
}

// Widget: Birthdays (today + next 6 days, active only)
async function getBirthdays(schoolId: string, today: { y: number; m: number; d: number }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const t = new Date(Date.UTC(today.y, today.m, today.d + i));
    return { month: t.getUTCMonth() + 1, day: t.getUTCDate(), daysLeft: i };
  });
  const dayMatch = { $or: days.map((x) => ({ bm: x.month, bd: x.day })) };
  const daysLeftOf = (bm: number, bd: number) =>
    days.find((x) => x.month === bm && x.day === bd)?.daysLeft ?? 0;

  const birthParts = {
    bm: { $month: { date: "$dateOfBirth", timezone: TZ } },
    bd: { $dayOfMonth: { date: "$dateOfBirth", timezone: TZ } },
  };

  const [students, staff] = await Promise.all([
    M(Student).aggregate([
      { $match: { schoolId, status: { $ne: "inactive" }, dateOfBirth: { $ne: null } } },
      { $project: { fullName: 1, grNumber: 1, section: 1, classId: 1, image: 1, gender: 1, dateOfBirth: 1, ...birthParts } },
      { $match: dayMatch },
      { $limit: 50 },
      ...withClassName,
    ]),
    M(Employee).aggregate([
      { $match: { schoolId, status: { $ne: "inactive" }, dateOfBirth: { $ne: null } } },
      { $project: { fullName: 1, emp_id: 1, designation: 1, image: 1, gender: 1, dateOfBirth: 1, ...birthParts } },
      { $match: dayMatch },
      { $limit: 50 },
    ]),
  ]);

  const shape = (list: any[]) =>
    list
      .map(({ bm, bd, ...rest }) => ({ ...rest, daysLeft: daysLeftOf(bm, bd) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

  return { students: shape(students), staff: shape(staff) };
}

// Widget: Admissions & Withdrawals (this month)
async function getAdmissions(schoolId: string, r: Ranges) {
  const range = { $gte: r.monthStart, $lt: r.nextMonthStart };
  const [newCount, leftCount, newest, left] = await Promise.all([
    M(Student).countDocuments({ schoolId, enrollmentDate: range }),
    M(Student).countDocuments({ schoolId, status: "inactive", inactiveDate: range }),
    M(Student).aggregate([
      { $match: { schoolId, enrollmentDate: range } },
      { $sort: { enrollmentDate: -1 } },
      { $limit: 5 },
      ...withClassName,
      { $project: { fullName: 1, grNumber: 1, section: 1, className: 1, enrollmentDate: 1 } },
    ]),
    M(Student).aggregate([
      { $match: { schoolId, status: "inactive", inactiveDate: range } },
      { $sort: { inactiveDate: -1 } },
      { $limit: 5 },
      ...withClassName,
      { $project: { fullName: 1, grNumber: 1, section: 1, className: 1, inactiveDate: 1, inactiveReason: 1 } },
    ]),
  ]);
  return { newCount, leftCount, newest, left };
}

// Widgets: Fee Collection + Recent Payments, and "my collection today"
async function getFees(
  schoolId: string,
  userId: string,
  r: Ranges,
  opt: { today: boolean; recent: boolean; mine: boolean },
) {
  const isToday = { "p.paidDate": { $gte: r.todayStart, $lt: r.tomorrowStart } };
  const facet: Record<string, any[]> = {};

  if (opt.today) {
    facet.month = [{ $group: { _id: "$p.method", amount: { $sum: "$p.amount" }, count: { $sum: 1 } } }];
    facet.today = [
      { $match: isToday },
      { $group: { _id: "$p.method", amount: { $sum: "$p.amount" }, count: { $sum: 1 } } },
    ];
  }
  if (opt.recent) {
    facet.recent = [
      { $match: isToday },
      { $sort: { "p._id": -1 } }, // newest entry first
      { $limit: 15 },
      {
        $project: {
          _id: "$p._id",
          paymentNo: "$p.paymentNo",
          amount: "$p.amount",
          method: "$p.method",
          paidDate: "$p.paidDate",
          receivedBy: "$p.receivedBy",
          studentId: 1,
          title: 1,
        },
      },
    ];
  }
  if (opt.mine && isOid(userId)) {
    facet.mine = [
      { $match: { ...isToday, "p.receivedBy": new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, amount: { $sum: "$p.amount" }, count: { $sum: 1 } } },
    ];
  }
  if (Object.keys(facet).length === 0) return null;

  // Invoices keep schoolId as ObjectId (other models use a string)
  const schoolOid = new mongoose.Types.ObjectId(schoolId);
  const monthRange = { $gte: r.monthStart, $lt: r.nextMonthStart };

  const [res]: any[] = await M(StudentFeeInvoice).aggregate([
    { $match: { schoolId: schoolOid, "paymentHistory.paidDate": monthRange } },
    { $project: { studentId: 1, title: 1, paymentHistory: 1 } },
    { $unwind: "$paymentHistory" },
    { $project: { studentId: 1, title: 1, p: "$paymentHistory" } },
    { $match: { "p.paidDate": monthRange } },
    { $facet: facet },
  ]);

  const out: any = {};

   if (opt.today) {
    // Totals + Cash / Bank / Online for one period
    const sumUp = (rows: any[]) => {
      const byMethod: Record<string, number> = { cash: 0, bank: 0, online: 0 };
      let amount = 0;
      let count = 0;
      for (const row of rows || []) {
        const key = row._id || "cash";
        byMethod[key] = (byMethod[key] || 0) + row.amount;
        amount += row.amount;
        count += row.count;
      }
      return { amount, count, byMethod };
    };

    const t = sumUp(res?.today);
    const mo = sumUp(res?.month);

    out.feeToday = {
      todayAmount: t.amount,
      todayCount: t.count,
      monthAmount: mo.amount,
      monthCount: mo.count,
      byMethod: t.byMethod, // today
      monthByMethod: mo.byMethod, // this month
    };
  }

  if (opt.recent) {
    const list: any[] = res?.recent || [];
    const studentIds = [...new Set(list.map((p) => String(p.studentId)))].filter(isOid);
    const userIds = [...new Set(list.map((p) => String(p.receivedBy || "")))].filter(isOid);

    const [students, users]: any[][] = await Promise.all([
      studentIds.length
        ? M(Student).find({ _id: { $in: studentIds }, schoolId }).select("fullName grNumber").lean()
        : [],
      userIds.length ? M(UserModel).find({ _id: { $in: userIds } }).select("name").lean() : [],
    ]);
    const sMap = new Map(students.map((s: any) => [String(s._id), s]));
    const uMap = new Map(users.map((u: any) => [String(u._id), u.name]));

    out.recentPayments = {
      payments: list.map((p) => {
        const s: any = sMap.get(String(p.studentId));
        return {
          _id: String(p._id),
          paymentNo: p.paymentNo || "",
          amount: p.amount || 0,
          method: p.method || "cash",
          paidDate: p.paidDate,
          enteredAt: mongoose.Types.ObjectId.isValid(String(p._id))
            ? new mongoose.Types.ObjectId(String(p._id)).getTimestamp()
            : p.paidDate,
          invoiceTitle: p.title || "",
          studentId: String(p.studentId),
          studentName: s?.fullName || "Unknown",
          grNumber: s?.grNumber ?? "",
          receivedBy: uMap.get(String(p.receivedBy)) || "",
        };
      }),
    };
  }

  if (facet.mine) {
    out.myCollection = {
      amount: res?.mine?.[0]?.amount || 0,
      count: res?.mine?.[0]?.count || 0,
    };
  }

  return out;
}
// Login Activity (this week, Monday → Sunday) — School Admin / Super Admin only
// Per day totals + per user: logins on each day, failed attempts, last login
async function getLoginActivity(access: Access, schoolId: string, r: Ranges, today: { y: number; m: number; d: number }) {
  const base: any = { schoolId };
  if (!access.isSuperAdmin) base.userRole = { $ne: "super_admin" }; // Super Admin stays hidden

  const userFilter: any = { schoolId, isActive: { $ne: false } };
  if (!access.isSuperAdmin) userFilter.role = { $ne: "super_admin" };

  // This week's Monday (Pakistan date)
  const weekday = new Date(Date.UTC(today.y, today.m, today.d)).getUTCDay(); // 0 = Sunday
  const sinceMonday = (weekday + 6) % 7; // Monday → 0, Sunday → 6
  const mondayStart = pkMidnight(today.y, today.m, today.d - sinceMonday);

  const [perUserDay, failedToday, loginUsers] = await Promise.all([
    M(ActivityLogModel).aggregate([
      {
        $match: {
          ...base,
          action: { $in: ["login", "login_failed"] },
          createdAt: { $gte: mondayStart },
        },
      },
      {
        $group: {
          _id: {
            u: "$userId",
            a: "$action",
            d: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          },
          count: { $sum: 1 },
          userName: { $last: "$userName" },
          userRole: { $last: "$userRole" },
          last: { $max: "$createdAt" },
        },
      },
    ]),
    M(ActivityLogModel).countDocuments({
      ...base,
      action: "login_failed",
      createdAt: { $gte: r.todayStart },
    }),
    // Users who can log in (to find who didn't log in this week)
    M(UserModel).countDocuments(userFilter),
  ]);

  // Monday → Sunday of this week
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(today.y, today.m, today.d - sinceMonday + i)).toISOString().slice(0, 10),
  );
  const todayKey = new Date(Date.UTC(today.y, today.m, today.d)).toISOString().slice(0, 10);
  const dayIndex = new Map(dayKeys.map((k, i) => [k, i]));

  const dayTotals = dayKeys.map(() => 0);
  const byUser = new Map<string, any>();

  for (const row of perUserDay as any[]) {
    const uid = String(row._id.u || "");
    if (!uid) continue;
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        userId: uid,
        userName: row.userName || "Unknown",
        userRole: row.userRole || "",
        total: 0,
        failed: 0,
        lastLogin: null as Date | null,
        days: dayKeys.map(() => 0),
      });
    }
    const u = byUser.get(uid);
    const i = dayIndex.get(row._id.d);

    if (row._id.a === "login") {
      u.total += row.count;
      if (i !== undefined) {
        u.days[i] += row.count;
        dayTotals[i] += row.count;
      }
      if (!u.lastLogin || row.last > u.lastLogin) {
        u.lastLogin = row.last;
        u.userName = row.userName || u.userName;
        u.userRole = row.userRole || u.userRole;
      }
    } else {
      u.failed += row.count;
    }
  }

  // Most logins first
  const users = [...byUser.values()].sort(
    (a, b) => b.total - a.total || new Date(b.lastLogin || 0).getTime() - new Date(a.lastLogin || 0).getTime(),
  );
  const activeUsers = users.filter((u) => u.total > 0).length;

  return {
    days: dayKeys.map((date, i) => ({ date, count: dayTotals[i], future: date > todayKey })),
    users,
    totalLogins: dayTotals.reduce((s, n) => s + n, 0),
    activeUsers,
    inactiveUsers: Math.max(0, Number(loginUsers) - activeUsers),
    failedToday,
  };
}

// Always: this user's own activity (logins included)
async function getMyActivity(access: Access, schoolId: string, r: Ranges) {
  const q: any = { userId: access.userId };
  // Super Admin's own logs may have no school
  q.schoolId = access.isSuperAdmin ? { $in: [schoolId, null] } : schoolId;

  const [recent, today] = await Promise.all([
    M(ActivityLogModel)
      .find(q)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("action module entityLabel summary createdAt")
      .lean(),
    M(ActivityLogModel).aggregate([
      { $match: { ...q, createdAt: { $gte: r.todayStart } } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    recent,
    today: Object.fromEntries(today.map((t: any) => [t._id, t.count])),
  };
}

// Tasks
//   Admins: all tasks + employees + login users (for the task form)
//   Others: only tasks assigned to them (null when none → no widget)
async function getTasks(schoolId: string, access: Access, isAdmin: boolean) {
  if (!isAdmin) {
    const todos = await M(Todo)
      .find({ schoolId, assignedUsers: String(access.userId) })
      .sort({ createdAt: -1 })
      .lean();
    return todos.length ? { todos, employees: [], users: [] } : null;
  }

  const [todos, employees, users, roles] = await Promise.all([
    M(Todo).find({ schoolId }).sort({ createdAt: -1 }).lean(),
    M(Employee).find({ schoolId }).select("emp_id fullName designation status").sort({ emp_id: 1 }).lean(),
    M(UserModel)
      .find({ schoolId, role: { $ne: "super_admin" } })
      .select("name role roleId isActive")
      .sort({ name: 1 })
      .lean(),
    M(RoleModel).find({ schoolId }).select("name key").lean(),
  ]);

  // Role name of each login user ("Accountant", custom role names…)
  const roleById = new Map(roles.map((r: any) => [String(r._id), r.name]));
  const roleByKey = new Map(roles.map((r: any) => [r.key, r.name]));

  return {
    todos,
    employees,
    users: users.map((u: any) => ({
      _id: String(u._id),
      name: u.name,
      roleName:
        roleById.get(String(u.roleId)) || roleByKey.get(u.role) || String(u.role || "").replace(/_/g, " "),
      isActive: u.isActive !== false,
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard  (Super Admin: ?schoolId=…)
// ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    let requested = new URL(req.url).searchParams.get("schoolId");
    if (access.isSuperAdmin && !requested) {
      const host = (req.headers.get("host") || "").split(":")[0];
      const parts = host.split(".");
      if (parts.length > 2) {
        const school: any = await M(SchoolModel).findOne({ slug: parts[0] }).select("_id").lean();
        if (school?._id) requested = String(school._id);
      }
    }

    const schoolId = schoolIdFor(access, requested);
    if (!schoolId || !isOid(schoolId)) {
      return NextResponse.json({ message: "School not found" }, { status: 400 });
    }

    const today = pkToday();
    const r: Ranges = {
      todayStart: pkMidnight(today.y, today.m, today.d),
      tomorrowStart: pkMidnight(today.y, today.m, today.d + 1),
      monthStart: pkMidnight(today.y, today.m, 1),
      nextMonthStart: pkMidnight(today.y, today.m + 1, 1),
      weekStart: pkMidnight(today.y, today.m, today.d - 6),
    };

    const w = access.canWidget; // Super Admin → always true
    const isAdmin = access.isSuperAdmin || access.isSchoolAdmin;

    const [me, school, schoolTotals, birthdays, admissions, fees, loginActivity, myActivity, tasks, savedLayout] =
      await Promise.all([
        getMe(access, schoolId),
        M(SchoolModel).findById(schoolId).select("name status").lean(),
        w("schoolTotals") ? getSchoolTotals(schoolId) : null,
        w("birthdays") ? getBirthdays(schoolId, today) : null,
        w("admissions") ? getAdmissions(schoolId, r) : null,
        getFees(schoolId, access.userId, r, {
          today: w("feeToday"),
          recent: w("recentPayments"),
          mine: access.can("takePayment", "create"),
        }),
        isAdmin ? getLoginActivity(access, schoolId, r, today) : null, // admins only, no tick
        isAdmin ? null : getMyActivity(access, schoolId, r),
        getTasks(schoolId, access, isAdmin), // staff: only their own tasks
        M(DashboardLayoutModel).findOne({ userId: access.userId, schoolId }).select("items").lean(),
      ]);

    // Only the widgets this user is allowed to see
    const widgets: Record<string, any> = {};
    if (schoolTotals) widgets.schoolTotals = schoolTotals;
    if (birthdays) widgets.birthdays = birthdays;
    if (admissions) widgets.admissions = admissions;
    if (fees?.feeToday) widgets.feeToday = fees.feeToday;
    if (fees?.recentPayments) widgets.recentPayments = fees.recentPayments;
    if (loginActivity) widgets.loginActivity = loginActivity;

    return NextResponse.json({
      me,
      school: { name: (school as any)?.name || "", status: (school as any)?.status || "active" },
      isSuperAdmin: access.isSuperAdmin,
      isAdmin,
      widgets,
      myActivity: { ...myActivity, myCollection: fees?.myCollection ?? null },
      tasks,
      layout: (savedLayout as any)?.items || null,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error?.message);
    return NextResponse.json({ message: "Failed to load dashboard" }, { status: 500 });
  }
}