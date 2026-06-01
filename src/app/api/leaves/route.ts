import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// GET /api/leaves
// Employees: Fetch their own leave requests
// Admins: Fetch all leave requests (with optional filters)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const isAdmin = session.user.role === "ADMIN";

  // Admins can search by specific employee or return all
  const targetUserId = isAdmin && searchParams.get("userId")
    ? searchParams.get("userId")!
    : !isAdmin
    ? session.user.id
    : undefined;

  const statusFilter = searchParams.get("status"); // e.g. "PENDING", "APPROVED", "REJECTED"
  const typeFilter = searchParams.get("type"); // e.g. "CASUAL", "SICK", "UNINFORMED", etc.

  const where: any = {};
  if (targetUserId) {
    where.userId = targetUserId;
  }
  if (statusFilter) {
    where.status = statusFilter;
  }
  if (typeFilter) {
    where.type = typeFilter;
  }

  try {
    const leaves = await prisma.leave.findMany({
      where,
      include: {
        User: {
          select: { id: true, name: true, designation: true, role: true },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ leaves });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}

// POST /api/leaves
// Employees: Apply for a leave
// Admins: Create a leave on behalf of an employee (can be pre-approved or retroactive)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { startDate, endDate, type, reason, userId, autoApprove } = body;

    if (!startDate || !endDate || !type || !reason) {
      return NextResponse.json(
        { error: "startDate, endDate, type, and reason are required" },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    
    // Determine target employee ID
    const targetUserId = isAdmin && userId ? userId : session.user.id;

    // Check if target user exists
    const userExists = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Convert dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json({ error: "Start date cannot be after end date" }, { status: 400 });
    }

    // Decide initial status:
    // If admin is logging it and requested autoApprove (or if it's UNINFORMED which is immediately active), mark APPROVED.
    // Otherwise, PENDING.
    const shouldApprove = isAdmin && (autoApprove || type === "UNINFORMED");
    const status = shouldApprove ? "APPROVED" : "PENDING";

    // Create the leave record
    const leave = await prisma.leave.create({
      data: {
        userId: targetUserId,
        startDate: start,
        endDate: end,
        type,
        reason,
        status,
        approvedById: shouldApprove ? session.user.id : null,
      },
      include: {
        User: {
          select: { id: true, name: true, designation: true },
        },
      },
    });

    // If shouldApprove, sync with attendance immediately
    if (shouldApprove) {
      const datesToSync: Date[] = [];
      const current = new Date(start);
      while (current <= end) {
        datesToSync.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      // Determine multiplier based on leave type
      const payMultiplier = ["CASUAL", "SICK", "PAID"].includes(type) ? 1.0 : 0.0;

      // Sync each date to attendance record
      for (const d of datesToSync) {
        // Skip weekends (Saturday: 6, Sunday: 0) to avoid messing up attendance multipliers on offdays
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        // Strip time part for consistent Date search
        const dateOnlyStr = d.toISOString().slice(0, 10);
        const searchDate = new Date(`${dateOnlyStr}T00:00:00.000Z`);

        await prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: targetUserId,
              date: searchDate,
            },
          },
          update: {
            status: "LEAVE",
            payMultiplier,
            overrideReason: `Retroactive Approved ${type} Leave: ${reason}`,
            overriddenByAdminId: session.user.id,
          },
          create: {
            userId: targetUserId,
            date: searchDate,
            status: "LEAVE",
            payMultiplier,
            overrideReason: `Retroactive Approved ${type} Leave: ${reason}`,
            overriddenByAdminId: session.user.id,
          },
        });
      }

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          actionType: "LEAVE_RETROACTIVE_CREATE",
          affectedUserId: targetUserId,
          details: `Created retroactively approved ${type} leave from ${startDate} to ${endDate}.`,
          reason: `Retroactive logging: ${reason}`,
        },
      });
    }

    return NextResponse.json({ leave });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create leave request" },
      { status: 500 }
    );
  }
}
