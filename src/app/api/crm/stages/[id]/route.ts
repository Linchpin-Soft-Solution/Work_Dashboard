import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCrmManager } from "@/lib/crm-auth";
import { Prisma } from "@/generated/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/crm/stages/[id] — rename / reorder / toggle flags (manager only)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCrmManager(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data: Prisma.PipelineStageUpdateInput = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    if (body.isWon !== undefined) data.isWon = Boolean(body.isWon);
    if (body.isLost !== undefined) data.isLost = Boolean(body.isLost);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const stage = await prisma.pipelineStage.update({ where: { id }, data });
    return NextResponse.json({ stage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update stage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/crm/stages/[id] — soft-delete (set inactive) if prospects reference it
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCrmManager(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const count = await prisma.prospect.count({ where: { stageId: id } });
    if (count > 0) {
      // Cannot hard-delete a stage in use — deactivate instead.
      const stage = await prisma.pipelineStage.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ stage, deactivated: true });
    }

    await prisma.pipelineStage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete stage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
