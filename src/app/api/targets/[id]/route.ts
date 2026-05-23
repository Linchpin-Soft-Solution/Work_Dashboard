import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TargetStatus } from "@/generated/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/targets/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: targetId } = await params;

  try {
    const existingTarget = await prisma.target.findUnique({
      where: { id: targetId },
    });

    if (!existingTarget) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isAssignee = existingTarget.assignedToId === session.user.id;
    const isCreator = existingTarget.assignedById === session.user.id;

    if (!isAdmin && !isAssignee && !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (isAdmin || isCreator) {
      // Admins and Creators can update most fields
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.timeframe !== undefined) updateData.timeframe = body.timeframe;
      if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      if (body.status !== undefined) updateData.status = body.status;
      
      // Only admins can change who the target is assigned to
      if (isAdmin && body.assignedToId !== undefined) {
        updateData.assignedToId = body.assignedToId;
      }
    } else {
      // Employees who are NOT creators (i.e., only assignees) can ONLY update status
      if (body.status !== undefined) {
        // Can only transition to valid states
        const allowedStatuses: TargetStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];
        if (allowedStatuses.includes(body.status as TargetStatus)) {
          updateData.status = body.status;
        } else {
           return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
        }
      }

      if (Object.keys(updateData).length === 0 && Object.keys(body).length > 0) {
          return NextResponse.json({ error: "Employees can only update target status" }, { status: 403 });
      }
    }

    const updatedTarget = await prisma.target.update({
      where: { id: targetId },
      data: updateData,
      include: {
        User_Target_assignedToIdToUser: {
          select: { id: true, name: true, designation: true },
        },
        User_Target_assignedByIdToUser: {
          select: { id: true, name: true },
        },
      }
    });

    // If Admin force-updated the status, we should log it
    if (isAdmin && !isAssignee && body.status !== undefined && body.status !== existingTarget.status) {
      await prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          actionType: "TARGET_STATUS_OVERRIDE",
          affectedUserId: existingTarget.assignedToId,
          details: `Force updated target '${existingTarget.title}' status to ${body.status}`,
          reason: body.reason || "Status updated by admin", // Expecting an optional reason if admin changes status
        },
      });
    }

    return NextResponse.json({ target: updatedTarget });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update target" }, { status: 500 });
  }
}

// DELETE /api/targets/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: targetId } = await params;

  try {
    const existingTarget = await prisma.target.findUnique({
      where: { id: targetId },
    });

    if (!existingTarget) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isCreator = existingTarget.assignedById === session.user.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete this target" }, { status: 403 });
    }

    await prisma.target.delete({
      where: { id: targetId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete target" }, { status: 500 });
  }
}
