import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const role = session.user.role as "ADMIN" | "EMPLOYEE" | "INTERN";
  const userId = session.user.id;
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  let adminStats;
  let employeeStats;

  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: {
      startTime: { gte: today },
      ...(role !== "ADMIN" ? { OR: [{ userId }, { isCompanyWide: true }] } : {})
    },
    orderBy: { startTime: 'asc' },
    take: 5
  });

  const activeTargets = await prisma.target.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
      ...(role !== "ADMIN" ? { assignedToId: userId } : {})
    },
    orderBy: { dueDate: 'asc' },
    take: 5,
    include: {
      User_Target_assignedToIdToUser: {
        select: { name: true }
      }
    }
  });

  if (role === "ADMIN") {
    const [totalUsers, todaysAttendance, openTargets, openInvoices] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { date: { gte: start, lte: end } },
        _count: true
      }),
      prisma.target.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } } }),
      prisma.invoice.count({ where: { status: { in: ['DRAFT', 'SENT'] } } })
    ]);

    const presentToday = todaysAttendance.find(a => a.status === 'PRESENT')?._count || 0;
    const lateToday = todaysAttendance.find(a => a.status === 'LATE')?._count || 0;
    const absentToday = todaysAttendance.find(a => a.status === 'ABSENT')?._count || 0;

    adminStats = {
      totalUsers,
      presentToday,
      lateToday,
      absentToday,
      openTargets,
      openInvoices
    };
  } else {
    const [attendance, openTargetsCount, dailyLog] = await Promise.all([
      prisma.attendance.findFirst({
        where: { userId, date: { gte: start, lte: end } }
      }),
      prisma.target.count({
        where: { assignedToId: userId, status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } }
      }),
      prisma.dailyLog.findFirst({
        where: { userId, date: { gte: start, lte: end } }
      })
    ]);

    employeeStats = {
      attendanceToday: attendance?.status || null,
      openTargets: openTargetsCount,
      logSubmittedToday: !!dailyLog || (attendance?.dailyLogSubmitted ?? false)
    };
  }

  const stats = {
    role,
    userName: session.user.name || "User",
    adminStats,
    employeeStats,
    upcomingEvents,
    activeTargets
  };

  return (
    <div className="flex-1 w-full mx-auto">
      <DashboardClient stats={stats as any} />
    </div>
  );
}