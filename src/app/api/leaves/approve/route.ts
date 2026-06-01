import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/leaves/approve
// Body: { leaveId, status: "APPROVED" | "REJECTED", managerNote? }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leaveId, status, managerNote } = body;

    if (!leaveId || !status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "leaveId and a valid status (APPROVED/REJECTED) are required" },
        { status: 400 }
      );
    }

    // Find the leave request
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: { User: true },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { error: "This leave request has already been processed" },
        { status: 400 }
      );
    }

    // Update leave request status in DB
    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status,
        managerNote,
        approvedById: status === "APPROVED" ? session.user.id : null,
      },
    });

    // If APPROVED, sync dates with Attendance record
    if (status === "APPROVED") {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const datesToSync: Date[] = [];
      const current = new Date(start);

      while (current <= end) {
        datesToSync.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      // Determine multiplier: Casual, Sick, and Paid leave are 1.0 (fully paid), Unpaid & Uninformed are 0.0
      const payMultiplier = ["CASUAL", "SICK", "PAID"].includes(leave.type) ? 1.0 : 0.0;

      for (const d of datesToSync) {
        // Skip weekends
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const dateOnlyStr = d.toISOString().slice(0, 10);
        const searchDate = new Date(`${dateOnlyStr}T00:00:00.000Z`);

        await prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: leave.userId,
              date: searchDate,
            },
          },
          update: {
            status: "LEAVE",
            payMultiplier,
            overrideReason: `Approved ${leave.type} Leave: ${leave.reason}` + (managerNote ? ` (Manager note: ${managerNote})` : ""),
            overriddenByAdminId: session.user.id,
          },
          create: {
            userId: leave.userId,
            date: searchDate,
            status: "LEAVE",
            payMultiplier,
            overrideReason: `Approved ${leave.type} Leave: ${leave.reason}` + (managerNote ? ` (Manager note: ${managerNote})` : ""),
            overriddenByAdminId: session.user.id,
          },
        });
      }

      // Create Audit Log for Approval
      await prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          actionType: "LEAVE_APPROVE",
          affectedUserId: leave.userId,
          details: `Approved ${leave.type} leave for ${leave.User.name} from ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}.`,
          reason: managerNote || "No manager note provided.",
        },
      });
    } else {
      // Create Audit Log for Rejection
      await prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          actionType: "LEAVE_REJECT",
          affectedUserId: leave.userId,
          details: `Rejected ${leave.type} leave for ${leave.User.name} from ${leave.startDate.toISOString().slice(0, 10)} to ${leave.endDate.toISOString().slice(0, 10)}.`,
          reason: managerNote || "No rejection reason provided.",
        },
      });
    }

    return NextResponse.json({ leave: updatedLeave });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process leave request" },
      { status: 500 }
    );
  }
}
