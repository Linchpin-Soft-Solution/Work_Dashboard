import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateSummary } from "@/lib/openrouter";

// GET /api/logs/summary?type=weekly|monthly&date=YYYY-MM-DD&userId=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const dateParam = url.searchParams.get("date");
  const targetUserId = url.searchParams.get("userId") || session.user.id;

  if (targetUserId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!dateParam || !type) {
    return NextResponse.json({ error: "type and date are required" }, { status: 400 });
  }

  const startDate = new Date(dateParam);
  let endDate = new Date(startDate);
  if (type === "weekly") {
    endDate.setDate(startDate.getDate() + 7);
  } else if (type === "monthly") {
    endDate.setMonth(startDate.getMonth() + 1);
  }

  let summary: any = null;
  if (type === "weekly") {
    summary = await prisma.weeklyLog.findUnique({
      where: { userId_weekStart: { userId: targetUserId, weekStart: startDate } },
    });
  } else if (type === "monthly") {
    summary = await prisma.monthlyLog.findUnique({
      where: { userId_month: { userId: targetUserId, month: startDate } },
    });
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const logs = await prisma.dailyLog.findMany({
    where: {
      userId: targetUserId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  const liveRawSummary = logs.length > 0
    ? logs.map((l) => `${l.date.toISOString().slice(0, 10)}:\n${l.content}`).join("\n\n")
    : null;

  return NextResponse.json({
    summary: {
      rawSummary: liveRawSummary || summary?.rawSummary || null,
      aiSummary: summary?.aiSummary || null,
    }
  });
}

// POST /api/logs/summary/generate
// Body: { type: 'weekly'|'monthly', date: 'YYYY-MM-DD', userId? }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, date, userId } = body;

  const targetUserId = userId || session.user.id;

  if (targetUserId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!date || !type) {
    return NextResponse.json({ error: "type and date are required" }, { status: 400 });
  }

  const startDate = new Date(date);
  let endDate = new Date(startDate);

  if (type === "weekly") {
    endDate.setDate(startDate.getDate() + 7);
  } else if (type === "monthly") {
    endDate.setMonth(startDate.getMonth() + 1);
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Fetch all daily logs in the range
  const logs = await prisma.dailyLog.findMany({
    where: {
      userId: targetUserId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  if (logs.length === 0) {
    return NextResponse.json({ error: "No daily logs found for this period." }, { status: 400 });
  }

  // Compile raw summary
  const rawSummary = logs
    .map((l) => `${l.date.toISOString().slice(0, 10)}:\n${l.content}`)
    .join("\n\n");

  let aiSummary = "";
  try {
    aiSummary = await generateSummary(rawSummary);
  } catch (error: any) {
    console.error("Summary Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate AI summary." }, { status: 500 });
  }

  // Upsert the record
  if (type === "weekly") {
    const summary = await prisma.weeklyLog.upsert({
      where: { userId_weekStart: { userId: targetUserId, weekStart: startDate } },
      update: { rawSummary, aiSummary },
      create: { userId: targetUserId, weekStart: startDate, rawSummary, aiSummary },
    });
    return NextResponse.json({ summary });
  } else {
    const summary = await prisma.monthlyLog.upsert({
      where: { userId_month: { userId: targetUserId, month: startDate } },
      update: { rawSummary, aiSummary },
      create: { userId: targetUserId, month: startDate, rawSummary, aiSummary },
    });
    return NextResponse.json({ summary });
  }
}
