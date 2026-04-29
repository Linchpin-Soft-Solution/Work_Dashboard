import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TargetPriority, TargetTimeframe, TargetStatus } from "@/generated/prisma";

// GET /api/targets
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const assignedToId = url.searchParams.get("assignedToId");
  const status = url.searchParams.get("status") as TargetStatus | null;
  const priority = url.searchParams.get("priority") as TargetPriority | null;
  const timeframe = url.searchParams.get("timeframe") as TargetTimeframe | null;

  const isAdmin = session.user.role === "ADMIN";

  // Build the where clause
  const where: any = {};

  if (!isAdmin) {
    // Employees can only see their own targets
    where.assignedToId = session.user.id;
  } else if (assignedToId) {
    // Admins can filter by assignedToId
    where.assignedToId = assignedToId;
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (timeframe) where.timeframe = timeframe;

  const targets = await prisma.target.findMany({
    where,
    include: {
      User_Target_assignedToIdToUser: {
        select: { id: true, name: true, designation: true },
      },
      User_Target_assignedByIdToUser: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "desc" }
    ],
  });

  return NextResponse.json({ targets });
}

// POST /api/targets
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: Only admins can assign targets" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { assignedToId, title, description, priority, timeframe, dueDate } = body;

    if (!assignedToId || !title) {
      return NextResponse.json({ error: "assignedToId and title are required" }, { status: 400 });
    }

    const target = await prisma.target.create({
      data: {
        assignedById: session.user.id,
        assignedToId,
        title,
        description: description || null,
        priority: priority || "MEDIUM",
        timeframe: timeframe || "DAILY",
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "PENDING",
      },
      include: {
        User_Target_assignedToIdToUser: {
          select: { id: true, name: true, designation: true },
        },
        User_Target_assignedByIdToUser: {
          select: { id: true, name: true },
        },
      }
    });

    return NextResponse.json({ target });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create target" }, { status: 500 });
  }
}
