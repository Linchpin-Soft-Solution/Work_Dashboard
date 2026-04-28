import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/logs/daily?date=YYYY-MM-DD&userId=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const targetUserId = url.searchParams.get("userId") || session.user.id;

  if (targetUserId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!dateParam) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const parsedDate = new Date(dateParam);

  const log = await prisma.dailyLog.findUnique({
    where: {
      userId_date: {
        userId: targetUserId,
        date: parsedDate,
      },
    },
  });

  return NextResponse.json({ log });
}

// POST /api/logs/daily
// Body: { date, content, userId?, reason? }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, content, userId, reason } = body;

  const targetUserId = userId || session.user.id;
  const isAdminSubmit = targetUserId !== session.user.id;

  if (isAdminSubmit && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!date || !content) {
    return NextResponse.json({ error: "date and content are required." }, { status: 400 });
  }

  if (isAdminSubmit && !reason) {
    return NextResponse.json({ error: "reason is required when submitting on behalf of an employee." }, { status: 400 });
  }

  const parsedDate = new Date(date);

  // 1. Upsert Daily Log
  const log = await prisma.dailyLog.upsert({
    where: {
      userId_date: {
        userId: targetUserId,
        date: parsedDate,
      },
    },
    update: {
      content,
      submittedByAdminId: isAdminSubmit ? session.user.id : null,
      overrideReason: isAdminSubmit ? reason : null,
    },
    create: {
      userId: targetUserId,
      date: parsedDate,
      content,
      submittedByAdminId: isAdminSubmit ? session.user.id : null,
      overrideReason: isAdminSubmit ? reason : null,
    },
  });

  // 2. Mark attendance as dailyLogSubmitted = true
  await prisma.attendance.upsert({
    where: {
      userId_date: {
        userId: targetUserId,
        date: parsedDate,
      },
    },
    update: {
      dailyLogSubmitted: true,
    },
    create: {
      userId: targetUserId,
      date: parsedDate,
      dailyLogSubmitted: true,
    },
  });

  // 3. Audit log if Admin
  if (isAdminSubmit) {
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        actionType: "DAILY_LOG_OVERRIDE",
        affectedUserId: targetUserId,
        details: `Submitted/edited log for ${date}. Content length: ${content.length}`,
        reason: reason as string,
      },
    });
  }

  return NextResponse.json({ log });
}
