import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/attendance/override — Admin only
// Body: { userId, date, status, payMultiplier, checkInTime?, checkOutTime?, dailyLogSubmitted?, reason }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    userId,
    date,
    status,
    payMultiplier,
    checkInTime,
    checkOutTime,
    dailyLogSubmitted,
    reason,
  } = body;

  if (!userId || !date || !reason) {
    return NextResponse.json(
      { error: "userId, date, and reason are required." },
      { status: 400 }
    );
  }

  const parsedDate = new Date(date);

  // Auto-derive multiplier from status if not explicitly provided
  const STATUS_MULTIPLIER: Record<string, number> = {
    PRESENT: 1.0,
    LATE: 0.5,
    ABSENT: 0.0,
    HOLIDAY: 1.0,
  };
  const resolvedMultiplier =
    payMultiplier !== undefined
      ? parseFloat(payMultiplier)
      : status !== undefined
      ? STATUS_MULTIPLIER[status] ?? 0.0
      : undefined;

  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId, date: parsedDate } },
    update: {
      ...(status !== undefined && { status }),
      ...(resolvedMultiplier !== undefined && { payMultiplier: resolvedMultiplier }),
      ...(checkInTime !== undefined && { checkInTime: new Date(checkInTime) }),
      ...(checkOutTime !== undefined && { checkOutTime: new Date(checkOutTime) }),
      ...(dailyLogSubmitted !== undefined && { dailyLogSubmitted }),
      overrideReason: reason,
      overriddenByAdminId: session.user.id,
    },
    create: {
      userId,
      date: parsedDate,
      status: status ?? "ABSENT",
      payMultiplier: resolvedMultiplier ?? 0.0,
      ...(checkInTime !== undefined && { checkInTime: new Date(checkInTime) }),
      ...(checkOutTime !== undefined && { checkOutTime: new Date(checkOutTime) }),
      dailyLogSubmitted: dailyLogSubmitted ?? false,
      overrideReason: reason,
      overriddenByAdminId: session.user.id,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      actionType: "ATTENDANCE_OVERRIDE",
      affectedUserId: userId,
      details: `Status: ${status ?? "unchanged"}, PayMultiplier: ${payMultiplier ?? "unchanged"}`,
      reason,
    },
  });

  return NextResponse.json({ record });
}

// POST /api/attendance/override — mark date as holiday
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { date } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required." }, { status: 400 });
  }

  const parsedDate = new Date(date);

  // Upsert all users' attendance for that date as HOLIDAY
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const ops = users.map((u) =>
    prisma.attendance.upsert({
      where: { userId_date: { userId: u.id, date: parsedDate } },
      update: { status: "HOLIDAY", payMultiplier: 1.0 },
      create: {
        userId: u.id,
        date: parsedDate,
        status: "HOLIDAY",
        payMultiplier: 1.0,
      },
    })
  );

  await prisma.$transaction(ops);

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      actionType: "HOLIDAY_MARKED",
      details: `Marked ${parsedDate.toISOString().slice(0, 10)} as company holiday`,
      reason: "Company holiday",
    },
  });

  return NextResponse.json({ success: true });
}
