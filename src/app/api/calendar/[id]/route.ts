import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/calendar/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  try {
    const existing = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = existing.userId === session.user.id;

    // Employees can only edit their own events
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admins cannot edit private events of other users
    if (isAdmin && !isOwner && existing.isPrivate) {
      return NextResponse.json(
        { error: "Cannot edit another user's private event" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime);
    if (body.endTime !== undefined) updateData.endTime = new Date(body.endTime);
    if (body.isPrivate !== undefined) updateData.isPrivate = body.isPrivate;

    // Only admins can toggle company-wide
    if (isAdmin && body.isCompanyWide !== undefined) {
      updateData.isCompanyWide = body.isCompanyWide;
      if (body.isCompanyWide) updateData.isPrivate = false;
    }

    const updated = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      include: { User: { select: { id: true, name: true } } },
    });

    // Audit log if admin edits another user's event
    if (isAdmin && !isOwner) {
      await prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          actionType: "CALENDAR_EVENT_EDITED",
          affectedUserId: existing.userId,
          details: `Edited calendar event '${existing.title}'`,
          reason: body.reason || "Edited by admin",
        },
      });
    }

    return NextResponse.json({ event: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  try {
    const existing = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = existing.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admins cannot delete private events of other users
    if (isAdmin && !isOwner && existing.isPrivate) {
      return NextResponse.json(
        { error: "Cannot delete another user's private event" },
        { status: 403 }
      );
    }

    await prisma.calendarEvent.delete({ where: { id: eventId } });

    // Audit log if admin deletes another user's event
    if (isAdmin && !isOwner) {
      await prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          actionType: "CALENDAR_EVENT_DELETED",
          affectedUserId: existing.userId,
          details: `Deleted calendar event '${existing.title}'`,
          reason: "Deleted by admin",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete event" },
      { status: 500 }
    );
  }
}
