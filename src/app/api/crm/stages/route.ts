import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCrm, isCrmManager } from "@/lib/crm-auth";

// GET /api/crm/stages — list active stages in order
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCrm(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stages = await prisma.pipelineStage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ stages });
}

// POST /api/crm/stages — create a stage (manager only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCrmManager(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Stage name is required" }, { status: 400 });

    const last = await prisma.pipelineStage.findFirst({ orderBy: { sortOrder: "desc" } });
    const sortOrder = last ? last.sortOrder + 1 : 0;

    const stage = await prisma.pipelineStage.create({
      data: {
        name,
        sortOrder,
        isWon: Boolean(body.isWon),
        isLost: Boolean(body.isLost),
      },
    });
    return NextResponse.json({ stage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create stage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
