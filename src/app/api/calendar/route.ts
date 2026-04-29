import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendar?userId=...&start=...&end=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  const isAdmin = session.user.role === "ADMIN";
  const currentUserId = session.user.id;

  // Build date filter
  const dateFilter: any = {};
  if (start) dateFilter.gte = new Date(start);
  if (end) dateFilter.lte = new Date(end);

  // Company-wide events visible to everyone
  const companyWideFilter: any = { isCompanyWide: true };
  if (start || end) companyWideFilter.startTime = dateFilter;

  const companyEvents = await prisma.calendarEvent.findMany({
    where: companyWideFilter,
    include: { User: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });

  // User-specific events
  let userEvents: any[] = [];

  if (isAdmin && targetUserId && targetUserId !== currentUserId) {
    // Admin viewing another employee's calendar — only non-private events
    const where: any = {
      userId: targetUserId,
      isPrivate: false,
      isCompanyWide: false,
    };
    if (start || end) where.startTime = dateFilter;

    userEvents = await prisma.calendarEvent.findMany({
      where,
      include: { User: { select: { id: true, name: true } } },
      orderBy: { startTime: "asc" },
    });
  } else {
    // User viewing their own calendar — all events
    const viewUserId = isAdmin && targetUserId ? targetUserId : currentUserId;
    const where: any = {
      userId: viewUserId,
      isCompanyWide: false,
    };
    if (start || end) where.startTime = dateFilter;

    userEvents = await prisma.calendarEvent.findMany({
      where,
      include: { User: { select: { id: true, name: true } } },
      orderBy: { startTime: "asc" },
    });
  }

  // Merge & deduplicate (company events may already include user's company events)
  const allMap = new Map<string, any>();
  for (const e of companyEvents) allMap.set(e.id, e);
  for (const e of userEvents) allMap.set(e.id, e);

  const events = Array.from(allMap.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return NextResponse.json({ events });
}

// POST /api/calendar
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, description, startTime, endTime, isPrivate, isCompanyWide } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";

    // Only admins can create company-wide events
    if (isCompanyWide && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can create company-wide events" },
        { status: 403 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: session.user.id,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isPrivate: isCompanyWide ? false : (isPrivate ?? true),
        isCompanyWide: isCompanyWide ?? false,
      },
      include: { User: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ event });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    );
  }
}
