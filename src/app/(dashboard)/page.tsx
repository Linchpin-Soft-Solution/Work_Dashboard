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
  let upcomingEvents;
  let activeTargets;

  if (role === "ADMIN") {
    const [events, targets, totalUsers, todaysAttendance, openTargets, openInvoices, pendingLeaves] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          startTime: { gte: today },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          isCompanyWide: true,
        },
        orderBy: { startTime: 'asc' },
        take: 5
      }),
      prisma.target.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          User_Target_assignedToIdToUser: {
            select: { name: true }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { date: { gte: start, lte: end } },
        _count: true
      }),
      prisma.target.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } } }),
      prisma.invoice.count({ where: { status: { in: ['DRAFT', 'SENT'] } } }),
      prisma.leave.findMany({
        where: { status: "PENDING" },
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          reason: true,
          User: {
            select: { name: true }
          }
        },
        orderBy: { startDate: 'asc' },
        take: 5
      })
    ]);

    upcomingEvents = events;
    activeTargets = targets;

    const presentToday = todaysAttendance.find(a => a.status === 'PRESENT')?._count || 0;
    const lateToday = todaysAttendance.find(a => a.status === 'LATE')?._count || 0;
    const absentToday = todaysAttendance.find(a => a.status === 'ABSENT')?._count || 0;

    adminStats = {
      totalUsers,
      presentToday,
      lateToday,
      absentToday,
      openTargets,
      openInvoices,
      pendingLeaves
    };
  } else {
    const [events, targets, attendance, openTargetsCount, dailyLog, myRecentLeaves] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          startTime: { gte: today },
          OR: [{ userId }, { isCompanyWide: true }]
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          isCompanyWide: true,
        },
        orderBy: { startTime: 'asc' },
        take: 5
      }),
      prisma.target.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
          assignedToId: userId
        },
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.attendance.findFirst({
        where: { userId, date: { gte: start, lte: end } },
        select: { status: true, dailyLogSubmitted: true }
      }),
      prisma.target.count({
        where: { assignedToId: userId, status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } }
      }),
      prisma.dailyLog.findFirst({
        where: { userId, date: { gte: start, lte: end } },
        select: { id: true }
      }),
      prisma.leave.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          status: true
        },
        orderBy: { startDate: 'desc' },
        take: 5
      })
    ]);

    upcomingEvents = events;
    activeTargets = targets;

    employeeStats = {
      attendanceToday: attendance?.status || null,
      openTargets: openTargetsCount,
      logSubmittedToday: !!dailyLog || (attendance?.dailyLogSubmitted ?? false),
      myRecentLeaves
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