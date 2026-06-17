import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCrm, isCrmManager } from "@/lib/crm-auth";
import { LeadSource, Prisma } from "@/generated/prisma";

// GET /api/crm/prospects — list (reps see own, managers see all)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCrm(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const stageId = url.searchParams.get("stageId");
  const repId = url.searchParams.get("repId");
  const source = url.searchParams.get("source") as LeadSource | null;
  const industry = url.searchParams.get("industry");
  const search = url.searchParams.get("search");
  const followUp = url.searchParams.get("followUp"); // overdue | today | upcoming

  const manager = isCrmManager(session.user.role);
  const where: Prisma.ProspectWhereInput = {};

  if (!manager) {
    where.assignedRepId = session.user.id;
  } else if (repId) {
    where.assignedRepId = repId;
  }

  if (stageId) where.stageId = stageId;
  if (source) where.source = source;
  if (industry) where.industry = industry;

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  if (followUp) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (followUp === "overdue") where.nextFollowUpAt = { lt: startOfToday };
    else if (followUp === "today") where.nextFollowUpAt = { gte: startOfToday, lte: endOfToday };
    else if (followUp === "upcoming") where.nextFollowUpAt = { gt: endOfToday };
  }

  const prospects = await prisma.prospect.findMany({
    where,
    include: {
      Stage: { select: { id: true, name: true, sortOrder: true, isWon: true, isLost: true } },
      Rep: { select: { id: true, name: true } },
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ prospects });
}

// POST /api/crm/prospects — create (phone dedupe)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCrm(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      companyName,
      contactName,
      phone,
      email,
      city,
      industry,
      source,
      dealValue,
      stageId,
      assignedRepId,
    } = body;

    if (!companyName || !contactName || !phone) {
      return NextResponse.json(
        { error: "companyName, contactName and phone are required" },
        { status: 400 },
      );
    }

    // Reps can only assign prospects to themselves; managers choose the rep.
    const manager = isCrmManager(session.user.role);
    const finalRepId = manager ? assignedRepId || session.user.id : session.user.id;

    // Resolve the starting stage (default = lowest sortOrder active stage).
    let finalStageId = stageId;
    if (!finalStageId) {
      const firstStage = await prisma.pipelineStage.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      if (!firstStage) {
        return NextResponse.json({ error: "No pipeline stages configured" }, { status: 400 });
      }
      finalStageId = firstStage.id;
    }

    // Phone dedupe — flag rather than silently duplicate.
    const existing = await prisma.prospect.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { error: "A prospect with this phone number already exists", prospectId: existing.id },
        { status: 409 },
      );
    }

    const prospect = await prisma.prospect.create({
      data: {
        companyName,
        contactName,
        phone,
        email: email || null,
        city: city || null,
        industry: industry || null,
        source: source || "OTHER",
        dealValue: dealValue != null && dealValue !== "" ? Number(dealValue) : null,
        stageId: finalStageId,
        assignedRepId: finalRepId,
        Activities: {
          create: {
            userId: session.user.id,
            type: "ASSIGNMENT",
            detail: `Prospect created and assigned`,
          },
        },
      },
      include: {
        Stage: { select: { id: true, name: true, sortOrder: true, isWon: true, isLost: true } },
        Rep: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ prospect });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create prospect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
