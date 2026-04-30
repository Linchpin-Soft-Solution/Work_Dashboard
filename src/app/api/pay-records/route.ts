import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const monthParam = url.searchParams.get("month"); // e.g., "2026-04"

  const isAdmin = session.user.role === "ADMIN";

  const where: any = {};

  if (!isAdmin) {
    where.userId = session.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  if (monthParam) {
    const date = startOfMonth(new Date(`${monthParam}-01T00:00:00.000Z`));
    where.month = date;
  }

  const payRecords = await prisma.payRecord.findMany({
    where,
    include: {
      User: {
        select: { id: true, name: true, designation: true },
      },
      PayAdjustment: true,
    },
    orderBy: [
      { month: "desc" }
    ],
  });

  return NextResponse.json({ payRecords });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, month, workingDays } = body;

    if (!userId || !month || !workingDays) {
      return NextResponse.json({ error: "userId, month, and workingDays are required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const startDate = startOfMonth(new Date(`${month}-01T00:00:00.000Z`));
    const endDate = endOfMonth(startDate);

    // Fetch attendance for the month
    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["PRESENT", "LATE", "ABSENT"]
        }
      }
    });

    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let sumMultiplier = 0;

    for (const a of attendances) {
      if (a.status === "PRESENT") presentDays++;
      else if (a.status === "LATE") lateDays++;
      else if (a.status === "ABSENT") absentDays++;
      
      sumMultiplier += a.payMultiplier;
    }

    const baseSalary = targetUser.baseMonthlySalary || 0;
    const dailyRate = workingDays > 0 ? baseSalary / workingDays : 0;
    const calculatedPay = dailyRate * sumMultiplier;

    // See if record already exists
    const existing = await prisma.payRecord.findUnique({
      where: {
        userId_month: {
          userId,
          month: startDate,
        }
      },
      include: {
        PayAdjustment: true
      }
    });

    let payRecord;
    let finalPay = calculatedPay;

    if (existing) {
      // Recalculate finalPay with existing adjustments
      const adjustmentTotal = existing.PayAdjustment.reduce((acc, adj) => acc + (adj.type === "DEDUCTION" ? -adj.amount : adj.amount), 0);
      finalPay += adjustmentTotal;

      payRecord = await prisma.payRecord.update({
        where: { id: existing.id },
        data: {
          baseSalary,
          workingDays,
          presentDays,
          lateDays,
          absentDays,
          calculatedPay,
          finalPay,
        },
        include: {
          User: { select: { id: true, name: true, designation: true } },
          PayAdjustment: true
        }
      });
    } else {
      payRecord = await prisma.payRecord.create({
        data: {
          userId,
          month: startDate,
          baseSalary,
          workingDays,
          presentDays,
          lateDays,
          absentDays,
          calculatedPay,
          finalPay,
        },
        include: {
          User: { select: { id: true, name: true, designation: true } },
          PayAdjustment: true
        }
      });
    }

    return NextResponse.json({ payRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate pay record" }, { status: 500 });
  }
}
