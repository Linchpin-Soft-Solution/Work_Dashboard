import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCrm, isCrmManager } from "@/lib/crm-auth";
import { Prisma } from "@/generated/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/crm/prospects/[id] — detail incl. timeline
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCrm(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      Stage: true,
      Rep: { select: { id: true, name: true } },
      Calls: {
        include: { User: { select: { id: true, name: true } } },
        orderBy: { calledAt: "desc" },
      },
      Remarks: {
        include: { User: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      Activities: {
        include: { User: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

  // Reps may only view their own prospects.
  if (!isCrmManager(session.user.role) && prospect.assignedRepId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ prospect });
}

// PATCH /api/crm/prospects/[id] — edit fields and/or move stage
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCrm(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.prospect.findUnique({
      where: { id },
      include: { Stage: true },
    });
    if (!existing) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    const manager = isCrmManager(session.user.role);
    if (!manager && existing.assignedRepId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data: Prisma.ProspectUpdateInput = {};

    const editable = [
      "companyName",
      "contactName",
      "email",
      "city",
      "industry",
      "source",
      "lostReason",
    ] as const;
    for (const f of editable) {
      if (body[f] !== undefined) (data as Record<string, unknown>)[f] = body[f];
    }
    if (body.dealValue !== undefined) {
      data.dealValue = body.dealValue === null || body.dealValue === "" ? null : Number(body.dealValue);
    }
    if (body.isInvalid !== undefined) data.isInvalid = Boolean(body.isInvalid);
    if (body.nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    }

    // Only managers can reassign a prospect to another rep.
    if (manager && body.assignedRepId !== undefined && body.assignedRepId !== existing.assignedRepId) {
      data.Rep = { connect: { id: body.assignedRepId } };
    }

    // Stage move — record an activity for the timeline.
    let movedStage: { id: string; name: string } | null = null;
    if (body.stageId !== undefined && body.stageId !== existing.stageId) {
      const stage = await prisma.pipelineStage.findUnique({ where: { id: body.stageId } });
      if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 400 });
      data.Stage = { connect: { id: stage.id } };
      movedStage = { id: stage.id, name: stage.name };
    }

    const activityCreates: Prisma.CrmActivityCreateWithoutProspectInput[] = [];
    if (movedStage) {
      activityCreates.push({
        User: { connect: { id: session.user.id } },
        type: "STAGE_CHANGE",
        detail: `Moved from ${existing.Stage.name} to ${movedStage.name}`,
      });
    }
    if (body.assignedRepId !== undefined && body.assignedRepId !== existing.assignedRepId && manager) {
      activityCreates.push({
        User: { connect: { id: session.user.id } },
        type: "ASSIGNMENT",
        detail: `Reassigned prospect`,
      });
    }
    if (
      body.nextFollowUpAt !== undefined &&
      body.nextFollowUpAt &&
      new Date(body.nextFollowUpAt).getTime() !== existing.nextFollowUpAt?.getTime()
    ) {
      activityCreates.push({
        User: { connect: { id: session.user.id } },
        type: "FOLLOW_UP_SET",
        detail: `Follow-up set for ${new Date(body.nextFollowUpAt).toISOString().slice(0, 10)}`,
      });
    }
    if (activityCreates.length > 0) {
      data.Activities = { create: activityCreates };
    }

    const prospect = await prisma.prospect.update({
      where: { id },
      data,
      include: {
        Stage: { select: { id: true, name: true, sortOrder: true, isWon: true, isLost: true } },
        Rep: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ prospect });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update prospect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/crm/prospects/[id] — manager only
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCrmManager(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.prospect.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete prospect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
