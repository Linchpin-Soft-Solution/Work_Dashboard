import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCrm, isCrmManager } from "@/lib/crm-auth";
import { CallOutcome, Prisma } from "@/generated/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_OUTCOMES: CallOutcome[] = [
  "CONNECTED_INTERESTED",
  "CONNECTED_CALLBACK",
  "CONNECTED_NOT_INTERESTED",
  "NO_ANSWER",
  "UNREACHABLE",
  "WRONG_NUMBER",
];

// POST /api/crm/prospects/[id]/calls — log a call (one-flow: outcome, follow-up, stage)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCrm(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: { Stage: true },
    });
    if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    if (!isCrmManager(session.user.role) && prospect.assignedRepId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { outcome, durationSeconds, remark, nextFollowUpAt, stageId } = body;

    if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
      return NextResponse.json({ error: "A valid call outcome is required" }, { status: 400 });
    }

    // Create the call.
    await prisma.call.create({
      data: {
        prospectId: id,
        userId: session.user.id,
        outcome,
        durationSeconds:
          durationSeconds != null && durationSeconds !== "" ? Number(durationSeconds) : null,
        remark: remark || null,
      },
    });

    // Build the prospect update from the same flow.
    const data: Prisma.ProspectUpdateInput = { lastCallOutcome: outcome };
    if (outcome === "WRONG_NUMBER") data.isInvalid = true;
    if (nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
    }

    let movedStageName: string | null = null;
    if (stageId && stageId !== prospect.stageId) {
      const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
      if (stage) {
        data.Stage = { connect: { id: stage.id } };
        movedStageName = stage.name;
      }
    }

    // Timeline activities.
    const activities: Prisma.CrmActivityCreateWithoutProspectInput[] = [
      {
        User: { connect: { id: session.user.id } },
        type: "CALL",
        detail: `Logged call — ${outcome.replaceAll("_", " ").toLowerCase()}`,
      },
    ];
    if (movedStageName) {
      activities.push({
        User: { connect: { id: session.user.id } },
        type: "STAGE_CHANGE",
        detail: `Moved from ${prospect.Stage.name} to ${movedStageName}`,
      });
    }
    if (nextFollowUpAt) {
      activities.push({
        User: { connect: { id: session.user.id } },
        type: "FOLLOW_UP_SET",
        detail: `Follow-up set for ${new Date(nextFollowUpAt).toISOString().slice(0, 10)}`,
      });
    }
    data.Activities = { create: activities };

    const updated = await prisma.prospect.update({
      where: { id },
      data,
      include: {
        Stage: { select: { id: true, name: true, sortOrder: true, isWon: true, isLost: true } },
        Rep: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ prospect: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to log call";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
